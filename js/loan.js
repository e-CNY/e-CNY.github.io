/* js/loan.js */
(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function confirmAction(title, msg, onOk) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    var modal = document.getElementById('confirmModal');
    modal.hidden = false;

    var btnOk = document.getElementById('confirmOk');
    var btnCancel = document.getElementById('confirmCancel');

    function cleanup() {
      modal.hidden = true;
      btnOk.removeEventListener('click', okHandler);
      btnCancel.removeEventListener('click', cleanup);
    }

    function okHandler() {
      cleanup();
      if (onOk) onOk();
    }

    btnOk.addEventListener('click', okHandler);
    btnCancel.addEventListener('click', cleanup);
  }

  var STORAGE_KEY = 'tool.loan.v2';
  var PAGE_SIZE = 12;

  /* ============ DOM ============ */
  var loanTypeSeg      = document.getElementById('loanTypeSeg');
  var repayMethodSeg   = document.getElementById('repayMethodSeg');
  var prepayModeSeg    = document.getElementById('prepayModeSeg');
  var singleFields     = document.getElementById('singleLoanFields');
  var combinedFields   = document.getElementById('combinedFields');
  var prepayDetails    = document.getElementById('prepayDetails');
  var loanAmountEl     = document.getElementById('loanAmount');
  var annualRateEl     = document.getElementById('annualRate');
  var loanTermEl       = document.getElementById('loanTerm');
  var commercialAmountEl = document.getElementById('commercialAmount');
  var commercialRateEl = document.getElementById('commercialRate');
  var fundAmountEl     = document.getElementById('fundAmount');
  var fundRateEl       = document.getElementById('fundRate');
  var prepayMonthEl    = document.getElementById('prepayMonth');
  var prepayAmountEl   = document.getElementById('prepayAmount');
  var calcBtn          = document.getElementById('calcBtn');
  var resetBtn         = document.getElementById('resetBtn');
  var resultSection    = document.getElementById('resultSection');
  var summaryGrid      = document.getElementById('summaryGrid');
  var chartCanvas      = document.getElementById('loanChart');
  var chartWrap        = document.getElementById('chartWrap');
  var chartTooltip     = document.getElementById('chartTooltip');
  var scheduleHead     = document.getElementById('scheduleHead');
  var scheduleBody     = document.getElementById('scheduleBody');
  var scheduleViewSeg  = document.getElementById('scheduleViewSeg');
  var exportCSVBtn     = document.getElementById('exportCSVBtn');
  var paginationEl     = document.getElementById('schedulePagination');
  var prevPageBtn      = document.getElementById('prevPageBtn');
  var nextPageBtn      = document.getElementById('nextPageBtn');
  var pageInfoEl       = document.getElementById('pageInfo');

  /* ============ 状态 ============ */
  var state = {
    loanType: 'commercial',
    repayMethod: 'equal_payment',
    prepayMode: 'reduce_term',
    scheduleView: 'monthly',
    schedulePage: 1,
    result: null,
    chartPoints: [] // 用于存放图表坐标，方便交互
  };

  function clamp(v, min, max) {
    if (isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }
  function num(el, fallback) {
    var v = parseFloat(el.value);
    return isNaN(v) ? fallback : v;
  }
  function fmtMoney(n) {
    if (!isFinite(n)) return '0';
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmtMoney2(n) {
    if (!isFinite(n)) return '0.00';
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ============ 核心算法 ============ */
  function calcEqualPayment(principal, annualRate, months) {
    var r = annualRate / 100 / 12;
    if (r === 0) {
      var m = principal / months;
      return buildScheduleFlat(principal, m, 0, months);
    }
    var payment = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    return buildScheduleEqualPayment(principal, r, months, payment);
  }

  function buildScheduleEqualPayment(principal, r, months, payment) {
    var rows = [];
    var balance = principal;
    var totalInterest = 0;
    for (var i = 1; i <= months; i++) {
      var interest = balance * r;
      var principalPart = payment - interest;
      if (i === months) {
        principalPart = balance;
        payment = principalPart + interest;
      }
      balance = Math.max(0, balance - principalPart);
      totalInterest += interest;
      rows.push({
        month: i, payment: payment, principal: principalPart, interest: interest, balance: balance
      });
    }
    return { rows: rows, totalPayment: principal + totalInterest, totalInterest: totalInterest, firstPayment: rows[0].payment };
  }

  function buildScheduleFlat(principal, monthlyPayment, interestRate, months) {
    var rows = [];
    var balance = principal;
    for (var i = 1; i <= months; i++) {
      var principalPart = i === months ? balance : monthlyPayment;
      balance = Math.max(0, balance - principalPart);
      rows.push({
        month: i, payment: principalPart, principal: principalPart, interest: 0, balance: balance
      });
    }
    return { rows: rows, totalPayment: principal, totalInterest: 0, firstPayment: monthlyPayment };
  }

  function calcEqualPrincipal(principal, annualRate, months) {
    var r = annualRate / 100 / 12;
    var monthlyPrincipal = principal / months;
    var rows = [];
    var balance = principal;
    var totalInterest = 0;
    for (var i = 1; i <= months; i++) {
      var interest = balance * r;
      var payment = monthlyPrincipal + interest;
      balance = Math.max(0, balance - monthlyPrincipal);
      totalInterest += interest;
      rows.push({
        month: i, payment: payment, principal: monthlyPrincipal, interest: interest, balance: balance
      });
    }
    return {
      rows: rows, totalPayment: principal + totalInterest, totalInterest: totalInterest,
      firstPayment: rows[0].payment, lastPayment: rows[months - 1].payment
    };
  }

  function applyPrepayment(result, prepayMonth, prepayAmount, mode, annualRate, totalMonths) {
    if (!prepayMonth || !prepayAmount || prepayAmount <= 0) return result;
    var rows = result.rows;
    if (prepayMonth > rows.length) return result;

    var r = annualRate / 100 / 12;
    var prepayIdx = prepayMonth - 1;
    var rowAtPrepay = rows[prepayIdx];
    var balanceAfter = rowAtPrepay.balance;

    if (prepayAmount >= balanceAfter) {
      var newRows = rows.slice(0, prepayIdx + 1);
      newRows[prepayIdx] = Object.assign({}, newRows[prepayIdx], {
        payment: newRows[prepayIdx].payment + balanceAfter,
        principal: newRows[prepayIdx].principal + balanceAfter,
        balance: 0
      });
      return rebuildResult(newRows, result);
    }

    var remainingBalance = balanceAfter - prepayAmount;

    if (mode === 'reduce_term') {
      var currentPayment = result.firstPayment;
      var newRows = rows.slice(0, prepayIdx + 1);
      newRows[prepayIdx] = Object.assign({}, newRows[prepayIdx], {
        payment: newRows[prepayIdx].payment + prepayAmount,
        principal: newRows[prepayIdx].principal + prepayAmount,
        balance: remainingBalance
      });
      var bal = remainingBalance;
      var m = prepayMonth;
      while (bal > 0.01 && m < totalMonths * 2) {
        m++;
        var interest = bal * r;
        var principalPart = currentPayment - interest;
        if (principalPart <= 0 || principalPart > bal) principalPart = bal;
        bal = Math.max(0, bal - principalPart);
        newRows.push({
          month: m, payment: principalPart + interest, principal: principalPart, interest: interest, balance: bal
        });
      }
      return rebuildResult(newRows, result);
    } else {
      var remainingMonths = totalMonths - prepayMonth;
      if (remainingMonths <= 0) {
        var newRows2 = rows.slice(0, prepayIdx + 1);
        newRows2[prepayIdx] = Object.assign({}, newRows2[prepayIdx], {
          payment: newRows2[prepayIdx].payment + remainingBalance,
          principal: newRows2[prepayIdx].principal + remainingBalance,
          balance: 0
        });
        return rebuildResult(newRows2, result);
      }
      var newPayment = r === 0 ? remainingBalance / remainingMonths : remainingBalance * r * Math.pow(1 + r, remainingMonths) / (Math.pow(1 + r, remainingMonths) - 1);

      var newRows3 = rows.slice(0, prepayIdx + 1);
      newRows3[prepayIdx] = Object.assign({}, newRows3[prepayIdx], {
        payment: newRows3[prepayIdx].payment + prepayAmount,
        principal: newRows3[prepayIdx].principal + prepayAmount,
        balance: remainingBalance
      });
      var bal3 = remainingBalance;
      for (var k = 1; k <= remainingMonths; k++) {
        var interest3 = bal3 * r;
        var principalPart3 = newPayment - interest3;
        if (k === remainingMonths) {
          principalPart3 = bal3;
          newPayment = principalPart3 + interest3;
        }
        bal3 = Math.max(0, bal3 - principalPart3);
        newRows3.push({
          month: prepayMonth + k, payment: newPayment, principal: principalPart3, interest: interest3, balance: bal3
        });
      }
      return rebuildResult(newRows3, result);
    }
  }

  function rebuildResult(rows, original) {
    var totalInterest = 0, totalPayment = 0;
    rows.forEach(function (r) {
      totalInterest += r.interest;
      totalPayment += r.payment;
    });
    return {
      rows: rows, totalPayment: totalPayment, totalInterest: totalInterest,
      firstPayment: rows[0] ? rows[0].payment : 0,
      lastPayment: rows[rows.length - 1] ? rows[rows.length - 1].payment : 0
    };
  }

  function calcSingleLoan(principal, rate, months, method, prepayMonth, prepayAmount, prepayMode) {
    var result = method === 'equal_payment' ? calcEqualPayment(principal, rate, months) : calcEqualPrincipal(principal, rate, months);
    if (prepayMonth && prepayAmount > 0) {
      result = applyPrepayment(result, prepayMonth, prepayAmount, prepayMode, rate, months);
    }
    return result;
  }

  function calcCombined(commercialAmount, commercialRate, fundAmount, fundRate, months, method, prepayMonth, prepayAmount, prepayMode) {
    // 组合贷款提前还款金额按商贷和公积金贷款余额的比例分配
    var cPrepay = prepayAmount || 0;
    var fPrepay = 0;

    if (prepayAmount > 0 && (commercialAmount > 0 || fundAmount > 0)) {
      var cResBase = method === 'equal_payment' ? calcEqualPayment(commercialAmount, commercialRate, months) : calcEqualPrincipal(commercialAmount, commercialRate, months);
      var fResBase = method === 'equal_payment' ? calcEqualPayment(fundAmount, fundRate, months) : calcEqualPrincipal(fundAmount, fundRate, months);
      
      var cP = prepayMonth - 1;
      var cBal = cResBase.rows[cP] ? cResBase.rows[cP].balance : 0;
      var fBal = fResBase.rows[cP] ? fResBase.rows[cP].balance : 0;
      var totalBal = cBal + fBal;

      if (totalBal > 0) {
        cPrepay = prepayAmount * (cBal / totalBal);
        fPrepay = prepayAmount * (fBal / totalBal);
      }
    }

    var cResult = calcSingleLoan(commercialAmount, commercialRate, months, method, prepayMonth, cPrepay, prepayMode);
    var fResult = calcSingleLoan(fundAmount, fundRate, months, method, prepayMonth, fPrepay, prepayMode);

    var rows = [];
    var maxLen = Math.max(cResult.rows.length, fResult.rows.length);
    for (var i = 0; i < maxLen; i++) {
      var cr = cResult.rows[i] || { payment: 0, principal: 0, interest: 0, balance: 0 };
      var fr = fResult.rows[i] || { payment: 0, principal: 0, interest: 0, balance: 0 };
      rows.push({
        month: i + 1,
        payment: cr.payment + fr.payment,
        principal: cr.principal + fr.principal,
        interest: cr.interest + fr.interest,
        balance: cr.balance + fr.balance
      });
    }
    return rebuildResult(rows, null);
  }

  /* ============ 计算与渲染 ============ */
  function calculate() {
    var result;
    var prepayMonth = parseFloat(prepayMonthEl.value);
    var prepayAmount = parseFloat(prepayAmountEl.value);

    if (state.loanType === 'combined') {
      var cAmount = clamp(num(commercialAmountEl, 700000), 1000, 1e8);
      var cRate = clamp(num(commercialRateEl, 3.5), 0.01, 30);
      var fAmount = clamp(num(fundAmountEl, 300000), 1000, 1e8);
      var fRate = clamp(num(fundRateEl, 2.85), 0.01, 30);
      var term = clamp(num(loanTermEl, 30), 1, 40);
      var months = term * 12;

      result = calcCombined(cAmount, cRate, fAmount, fRate, months, state.repayMethod, prepayMonth, prepayAmount, state.prepayMode);
    } else {
      var amount = clamp(num(loanAmountEl, 1000000), 1000, 1e8);
      var rate = clamp(num(annualRateEl, 3.5), 0.01, 30);
      var term2 = clamp(num(loanTermEl, 30), 1, 40);
      var months2 = term2 * 12;

      result = calcSingleLoan(amount, rate, months2, state.repayMethod, prepayMonth, prepayAmount, state.prepayMode);
    }

    state.result = result;
    state.schedulePage = 1;
    render();
    saveState();
  }

  function render() {
    var r = state.result;
    if (!r) return;

    var totalMonths = r.rows.length;
    var years = Math.floor(totalMonths / 12);
    var remainMonths = totalMonths % 12;
    var termStr = years + ' 年' + (remainMonths > 0 ? ' ' + remainMonths + ' 个月' : '');
    var isEqualPrincipal = state.repayMethod === 'equal_principal';

    summaryGrid.innerHTML = [
      '<div class="summary-card primary">',
        '<span class="summary-label">' + (isEqualPrincipal ? '首月月供' : '每月月供') + '</span>',
        '<span class="summary-value">' + fmtMoney(r.firstPayment) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">' + (isEqualPrincipal ? '逐月递减' : '固定不变') + '</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">总还款额</span>',
        '<span class="summary-value">' + fmtMoney(r.totalPayment) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">本金 + 利息</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">总利息</span>',
        '<span class="summary-value">' + fmtMoney(r.totalInterest) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">利息占比 ' + (r.totalInterest / r.totalPayment * 100).toFixed(1) + '%</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">实际还款期数</span>',
        '<span class="summary-value">' + totalMonths + '<span class="unit">期</span></span>',
        '<span class="summary-sub">' + termStr + '</span>',
      '</div>'
    ].join('');

    drawChart(r);
    renderSchedule();
    resultSection.hidden = false;
  }

  /* ============ 图表交互 ============ */
  function drawChart(result) {
    var dpr = window.devicePixelRatio || 1;
    var rect = chartWrap.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    if (w <= 0 || h <= 0) return;

    chartCanvas.width = Math.round(w * dpr);
    chartCanvas.height = Math.round(h * dpr);
    var ctx = chartCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var padding = { top: 20, right: 20, bottom: 36, left: 60 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;

    var rows = result.rows;
    if (rows.length === 0) return;

    var step = Math.max(1, Math.ceil(rows.length / 120));
    var points = [];
    for (var i = 0; i < rows.length; i += step) {
      points.push(rows[i]);
    }
    if (points[points.length - 1] !== rows[rows.length - 1]) points.push(rows[rows.length - 1]);

    var maxBalance = 0, maxPayment = 0;
    points.forEach(function (p) {
      if (p.balance > maxBalance) maxBalance = p.balance;
      if (p.payment > maxPayment) maxPayment = p.payment;
    });
    var maxY = Math.max(maxBalance, maxPayment) * 1.05 || 1;

    var xPos = function (idx) { return padding.left + (idx / (points.length - 1 || 1)) * chartW; };
    var yPos = function (val) { return padding.top + chartH - (val / maxY) * chartH; };

    // 保存坐标用于交互
    state.chartPoints = points.map(function(p, idx) {
      return { x: xPos(idx), y: yPos(p.balance), data: p };
    });

    // 网格与轴
    ctx.strokeStyle = '#ecdfc4'; ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var y = padding.top + (chartH / 4) * g;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      ctx.fillStyle = '#a0947c'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var val = maxY * (1 - g / 4);
      ctx.fillText(val >= 1e4 ? (val / 1e4).toFixed(0) + '万' : Math.round(val), padding.left - 8, y);
    }

    ctx.fillStyle = '#a0947c'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var labelStep = Math.max(1, Math.floor(points.length / 6));
    for (var l = 0; l < points.length; l += labelStep) {
      ctx.fillText(points[l].month + '月', xPos(l), h - padding.bottom + 8);
    }

    // 余额面积
    ctx.beginPath(); ctx.moveTo(xPos(0), yPos(points[0].balance));
    for (var a = 1; a < points.length; a++) ctx.lineTo(xPos(a), yPos(points[a].balance));
    ctx.lineTo(xPos(points.length - 1), yPos(0)); ctx.lineTo(xPos(0), yPos(0));
    ctx.closePath(); ctx.fillStyle = 'rgba(160, 148, 124, 0.1)'; ctx.fill();

    // 余额线
    ctx.beginPath(); ctx.moveTo(xPos(0), yPos(points[0].balance));
    for (var b = 1; b < points.length; b++) ctx.lineTo(xPos(b), yPos(points[b].balance));
    ctx.strokeStyle = '#a0947c'; ctx.lineWidth = 2; ctx.stroke();

    // 月供线
    ctx.beginPath(); ctx.moveTo(xPos(0), yPos(points[0].payment));
    for (var c = 1; c < points.length; c++) ctx.lineTo(xPos(c), yPos(points[c].payment));
    ctx.strokeStyle = '#e88585'; ctx.lineWidth = 2; ctx.stroke();

    // 累计本金线
    ctx.beginPath(); var cumPrincipal = points[0].principal; ctx.moveTo(xPos(0), yPos(cumPrincipal));
    for (var d = 1; d < points.length; d++) {
      cumPrincipal += points[d].principal;
      ctx.lineTo(xPos(d), yPos(cumPrincipal));
    }
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.stroke();
  }

  // 鼠标交互
  chartWrap.addEventListener('mousemove', function(e) {
    if (!state.chartPoints || state.chartPoints.length === 0) return;
    var rect = chartCanvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    
    var closest = null;
    var minDist = Infinity;
    for (var i = 0; i < state.chartPoints.length; i++) {
      var dist = Math.abs(state.chartPoints[i].x - mouseX);
      if (dist < minDist) { minDist = dist; closest = state.chartPoints[i]; }
    }

    if (closest && minDist < 40) {
      var p = closest.data;
      chartTooltip.style.display = 'block';
      chartTooltip.innerHTML = 
        '<b>第 ' + p.month + ' 期</b><br>' +
        '月供: ' + fmtMoney2(p.payment) + ' 元<br>' +
        '本金: ' + fmtMoney2(p.principal) + ' 元<br>' +
        '利息: ' + fmtMoney2(p.interest) + ' 元<br>' +
        '余额: ' + fmtMoney(p.balance) + ' 元';
      
      var tooltipW = chartTooltip.offsetWidth;
      var left = closest.x - tooltipW / 2;
      if (left < 0) left = 0;
      if (left + tooltipW > chartWrap.clientWidth) left = chartWrap.clientWidth - tooltipW;
      
      chartTooltip.style.left = left + 'px';
      chartTooltip.style.top = (closest.y - chartTooltip.offsetHeight - 10) + 'px';
    } else {
      chartTooltip.style.display = 'none';
    }
  });
  
  chartWrap.addEventListener('mouseleave', function() {
    chartTooltip.style.display = 'none';
  });

  /* ============ 计划表与导出 ============ */
  function getScheduleRows() {
    var r = state.result;
    if (!r) return [];
    if (state.scheduleView === 'monthly') return r.rows;

    var yearly = [];
    r.rows.forEach(function (row) {
      var y = Math.ceil(row.month / 12);
      if (!yearly[y - 1]) yearly[y - 1] = { year: y, payment: 0, principal: 0, interest: 0, balance: 0 };
      yearly[y - 1].payment += row.payment;
      yearly[y - 1].principal += row.principal;
      yearly[y - 1].interest += row.interest;
      yearly[y - 1].balance = row.balance;
    });
    return yearly;
  }

  function renderSchedule() {
    var allRows = getScheduleRows();
    var isMonthly = state.scheduleView === 'monthly';

    scheduleHead.innerHTML = isMonthly
      ? '<tr><th>期数</th><th>月供 (元)</th><th>本金 (元)</th><th>利息 (元)</th><th>剩余本金 (元)</th></tr>'
      : '<tr><th>年份</th><th>年还款 (元)</th><th>年还本金 (元)</th><th>年还利息 (元)</th><th>年末余额 (元)</th></tr>';

    var totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
    if (state.schedulePage > totalPages) state.schedulePage = totalPages;
    var start = (state.schedulePage - 1) * PAGE_SIZE;
    var pageRows = allRows.slice(start, start + PAGE_SIZE);

    var html = '';
    pageRows.forEach(function (row) {
      var label = isMonthly ? row.month : row.year;
      html += '<tr><td>' + label + '</td><td>' + fmtMoney2(row.payment) + '</td><td>' + fmtMoney2(row.principal) + '</td><td>' + fmtMoney2(row.interest) + '</td><td>' + fmtMoney2(row.balance) + '</td></tr>';
    });
    scheduleBody.innerHTML = html;

    if (totalPages > 1) {
      paginationEl.hidden = false;
      pageInfoEl.textContent = state.schedulePage + ' / ' + totalPages;
      prevPageBtn.disabled = state.schedulePage <= 1;
      nextPageBtn.disabled = state.schedulePage >= totalPages;
    } else {
      paginationEl.hidden = true;
    }
  }

  function exportCSV() {
    if (!state.result) return;
    var isMonthly = state.scheduleView === 'monthly';
    var rows = isMonthly ? state.result.rows : getScheduleRows();
    var lines = [isMonthly ? '期数,月供(元),本金(元),利息(元),剩余本金(元)' : '年份,年还款(元),年还本金(元),年还利息(元),年末余额(元)'];
    rows.forEach(function (r) {
      var label = isMonthly ? r.month : r.year;
      lines.push([label, r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2)].join(','));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'loan_schedule_' + Date.now() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('计划表已导出');
  }

  /* ============ 状态保存 ============ */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        loanType: state.loanType, repayMethod: state.repayMethod,
        loanAmount: loanAmountEl.value, annualRate: annualRateEl.value, loanTerm: loanTermEl.value,
        commercialAmount: commercialAmountEl.value, commercialRate: commercialRateEl.value,
        fundAmount: fundAmountEl.value, fundRate: fundRateEl.value
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (data.loanType) {
        state.loanType = data.loanType;
        Array.prototype.forEach.call(loanTypeSeg.children, function (b) { b.classList.toggle('active', b.dataset.value === data.loanType); });
        var isCombined = data.loanType === 'combined';
        singleFields.hidden = isCombined; combinedFields.hidden = !isCombined;
      }
      if (data.repayMethod) {
        state.repayMethod = data.repayMethod;
        Array.prototype.forEach.call(repayMethodSeg.children, function (b) { b.classList.toggle('active', b.dataset.value === data.repayMethod); });
      }
      if (data.loanAmount != null) loanAmountEl.value = data.loanAmount;
      if (data.annualRate != null) annualRateEl.value = data.annualRate;
      if (data.loanTerm != null) loanTermEl.value = data.loanTerm;
      if (data.commercialAmount != null) commercialAmountEl.value = data.commercialAmount;
      if (data.commercialRate != null) commercialRateEl.value = data.commercialRate;
      if (data.fundAmount != null) fundAmountEl.value = data.fundAmount;
      if (data.fundRate != null) fundRateEl.value = data.fundRate;
    } catch (e) {}
  }

  /* ============ 事件绑定 ============ */
  loanTypeSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(loanTypeSeg.children, function (b) { b.classList.toggle('active', b === btn); });
    state.loanType = btn.dataset.value;
    var isCombined = state.loanType === 'combined';
    singleFields.hidden = isCombined; combinedFields.hidden = !isCombined;
  });

  repayMethodSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(repayMethodSeg.children, function (b) { b.classList.toggle('active', b === btn); });
    state.repayMethod = btn.dataset.value;
  });

  prepayModeSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(prepayModeSeg.children, function (b) { b.classList.toggle('active', b === btn); });
    state.prepayMode = btn.dataset.value;
  });

  scheduleViewSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(scheduleViewSeg.children, function (b) { b.classList.toggle('active', b === btn); });
    state.scheduleView = btn.dataset.value;
    state.schedulePage = 1;
    renderSchedule();
  });

  calcBtn.addEventListener('click', calculate);
  resetBtn.addEventListener('click', function () {
    confirmAction('恢复默认', '确定要将所有输入恢复为默认值吗？', function() {
      loanAmountEl.value = '1000000'; annualRateEl.value = '3.5'; loanTermEl.value = '30';
      commercialAmountEl.value = '700000'; commercialRateEl.value = '3.5';
      fundAmountEl.value = '300000'; fundRateEl.value = '2.85';
      prepayMonthEl.value = ''; prepayAmountEl.value = '';
      resultSection.hidden = true; state.result = null;
      showToast('已恢复默认设置');
    });
  });

  exportCSVBtn.addEventListener('click', exportCSV);

  prevPageBtn.addEventListener('click', function () {
    if (state.schedulePage > 1) { state.schedulePage--; renderSchedule(); }
  });
  nextPageBtn.addEventListener('click', function () {
    var totalPages = Math.ceil(getScheduleRows().length / PAGE_SIZE);
    if (state.schedulePage < totalPages) { state.schedulePage++; renderSchedule(); }
  });

  [loanAmountEl, annualRateEl, loanTermEl, commercialAmountEl, commercialRateEl, fundAmountEl, fundRateEl, prepayMonthEl, prepayAmountEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); calculate(); }
    });
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!state.result) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { drawChart(state.result); }, 200);
  });

  /* ============ 初始化 ============ */
  loadState();
  calculate(); // 自动执行一次计算
})();