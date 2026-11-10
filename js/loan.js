/* js/loan.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.loan.v1';
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
    loanType: 'commercial',   // commercial | fund | combined
    repayMethod: 'equal_payment', // equal_payment | equal_principal
    prepayMode: 'reduce_term',
    scheduleView: 'monthly',
    schedulePage: 1,
    result: null
  };

  /* ============ 工具 ============ */
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
    var s = Math.round(n).toString();
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtMoney2(n) {
    if (!isFinite(n)) return '0.00';
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtPercent(n) {
    return (Math.round(n * 100) / 100).toFixed(2) + '%';
  }

  /* ============ 核心计算：等额本息 ============ */
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
      if (principalPart < 0) principalPart = 0;
      if (i === months) {
        principalPart = balance;
        payment = principalPart + interest;
      }
      balance = Math.max(0, balance - principalPart);
      totalInterest += interest;
      rows.push({
        month: i,
        payment: payment,
        principal: principalPart,
        interest: interest,
        balance: balance
      });
    }
    return { rows: rows, totalPayment: principal + totalInterest, totalInterest: totalInterest, firstPayment: rows[0].payment };
  }

  function buildScheduleFlat(principal, monthlyPayment, interestRate, months) {
    // 零利率
    var rows = [];
    var balance = principal;
    for (var i = 1; i <= months; i++) {
      var principalPart = i === months ? balance : monthlyPayment;
      balance = Math.max(0, balance - principalPart);
      rows.push({
        month: i,
        payment: principalPart,
        principal: principalPart,
        interest: 0,
        balance: balance
      });
    }
    return { rows: rows, totalPayment: principal, totalInterest: 0, firstPayment: monthlyPayment };
  }

  /* ============ 核心计算：等额本金 ============ */
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
        month: i,
        payment: payment,
        principal: monthlyPrincipal,
        interest: interest,
        balance: balance
      });
    }
    return {
      rows: rows,
      totalPayment: principal + totalInterest,
      totalInterest: totalInterest,
      firstPayment: rows[0].payment,
      lastPayment: rows[months - 1].payment
    };
  }

  /* ============ 提前还款 ============ */
  function applyPrepayment(result, prepayMonth, prepayAmount, mode, annualRate, totalMonths) {
    if (!prepayMonth || !prepayAmount || prepayAmount <= 0) return result;
    var rows = result.rows;
    if (prepayMonth > rows.length) return result;

    var r = annualRate / 100 / 12;
    var prepayIdx = prepayMonth - 1; // 0-based
    var rowAtPrepay = rows[prepayIdx];
    var balanceAfter = rowAtPrepay.balance;

    if (prepayAmount >= balanceAfter) {
      // 一次性还清
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
      // 月供不变，缩短期限
      var currentPayment = result.firstPayment;
      var newRows = rows.slice(0, prepayIdx + 1);
      // 修改提前还款当月
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
        if (principalPart <= 0) principalPart = bal; // 安全兜底
        if (principalPart > bal) principalPart = bal;
        bal = Math.max(0, bal - principalPart);
        newRows.push({
          month: m,
          payment: principalPart + interest,
          principal: principalPart,
          interest: interest,
          balance: bal
        });
      }
      return rebuildResult(newRows, result);
    } else {
      // 期限不变，减少月供
      var remainingMonths = totalMonths - prepayMonth;
      if (remainingMonths <= 0) {
        // 直接还清
        var newRows2 = rows.slice(0, prepayIdx + 1);
        newRows2[prepayIdx] = Object.assign({}, newRows2[prepayIdx], {
          payment: newRows2[prepayIdx].payment + remainingBalance,
          principal: newRows2[prepayIdx].principal + remainingBalance,
          balance: 0
        });
        return rebuildResult(newRows2, result);
      }
      var newPayment;
      if (r === 0) {
        newPayment = remainingBalance / remainingMonths;
      } else {
        newPayment = remainingBalance * r * Math.pow(1 + r, remainingMonths) / (Math.pow(1 + r, remainingMonths) - 1);
      }

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
          month: prepayMonth + k,
          payment: newPayment,
          principal: principalPart3,
          interest: interest3,
          balance: bal3
        });
      }
      return rebuildResult(newRows3, result);
    }
  }

  function rebuildResult(rows, original) {
    var totalInterest = 0;
    var totalPayment = 0;
    rows.forEach(function (r) {
      totalInterest += r.interest;
      totalPayment += r.payment;
    });
    return {
      rows: rows,
      totalPayment: totalPayment,
      totalInterest: totalInterest,
      firstPayment: rows[0] ? rows[0].payment : 0,
      lastPayment: rows[rows.length - 1] ? rows[rows.length - 1].payment : 0
    };
  }

  /* ============ 组合贷款合并 ============ */
  function calcCombined(commercialAmount, commercialRate, fundAmount, fundRate, months, method) {
    var cResult = method === 'equal_payment'
      ? calcEqualPayment(commercialAmount, commercialRate, months)
      : calcEqualPrincipal(commercialAmount, commercialRate, months);
    var fResult = method === 'equal_payment'
      ? calcEqualPayment(fundAmount, fundRate, months)
      : calcEqualPrincipal(fundAmount, fundRate, months);

    // 合并 rows
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

  /* ============ 主计算 ============ */
  function calculate() {
    var result;

    if (state.loanType === 'combined') {
      var cAmount = clamp(num(commercialAmountEl, 700000), 1000, 1e8);
      var cRate = clamp(num(commercialRateEl, 3.5), 0.01, 30);
      var fAmount = clamp(num(fundAmountEl, 300000), 1000, 1e8);
      var fRate = clamp(num(fundRateEl, 2.85), 0.01, 30);
      var term = clamp(num(loanTermEl, 30), 1, 40);
      var months = term * 12;

      result = calcCombined(cAmount, cRate, fAmount, fRate, months, state.repayMethod);
    } else {
      var amount = clamp(num(loanAmountEl, 1000000), 1000, 1e8);
      var rate = clamp(num(annualRateEl, 3.5), 0.01, 30);
      var term2 = clamp(num(loanTermEl, 30), 1, 40);
      var months2 = term2 * 12;

      result = state.repayMethod === 'equal_payment'
        ? calcEqualPayment(amount, rate, months2)
        : calcEqualPrincipal(amount, rate, months2);
    }

    // 提前还款
    var prepayMonth = parseFloat(prepayMonthEl.value);
    var prepayAmount = parseFloat(prepayAmountEl.value);
    if (!isNaN(prepayMonth) && !isNaN(prepayAmount) && prepayAmount > 0) {
      var rate = state.loanType === 'combined'
        ? Math.max(num(commercialRateEl, 3.5), num(fundRateEl, 2.85))
        : num(annualRateEl, 3.5);
      var term = clamp(num(loanTermEl, 30), 1, 40);
      result = applyPrepayment(result, Math.floor(prepayMonth), prepayAmount, state.prepayMode, rate, term * 12);
    }

    state.result = result;
    state.schedulePage = 1;
    render();
  }

  /* ============ 渲染 ============ */
  function render() {
    var r = state.result;
    if (!r) return;

    // 摘要
    var totalMonths = r.rows.length;
    var years = Math.floor(totalMonths / 12);
    var remainMonths = totalMonths % 12;
    var termStr = years + ' 年' + (remainMonths > 0 ? ' ' + remainMonths + ' 个月' : '');

    var isEqualPrincipal = state.repayMethod === 'equal_principal';
    var monthlyLabel = isEqualPrincipal ? '首月月供' : '每月月供';
    var monthlyValue = isEqualPrincipal ? r.firstPayment : r.firstPayment;

    summaryGrid.innerHTML = [
      '<div class="summary-card primary">',
        '<span class="summary-label">' + monthlyLabel + '</span>',
        '<span class="summary-value">' + fmtMoney(monthlyValue) + '<span class="unit">元</span></span>',
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
        '<span class="summary-sub">利息占比 ' + fmtPercent(r.totalInterest / r.totalPayment) + '</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">实际还款期数</span>',
        '<span class="summary-value">' + totalMonths + '<span class="unit">期</span></span>',
        '<span class="summary-sub">' + termStr + '</span>',
      '</div>'
    ].join('');

    // 图表
    drawChart(r);

    // 还款计划表
    renderSchedule();

    resultSection.hidden = false;
  }

  /* ============ 图表 ============ */
  function drawChart(result) {
    var dpr = window.devicePixelRatio || 1;
    var rect = chartCanvas.parentElement.getBoundingClientRect();
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

    // 按年采样，最多 120 个点
    var step = Math.max(1, Math.ceil(rows.length / 120));
    var points = [];
    for (var i = 0; i < rows.length; i += step) {
      points.push(rows[i]);
    }
    if (points[points.length - 1] !== rows[rows.length - 1]) {
      points.push(rows[rows.length - 1]);
    }

    var maxBalance = 0;
    var maxPayment = 0;
    points.forEach(function (p) {
      if (p.balance > maxBalance) maxBalance = p.balance;
      if (p.payment > maxPayment) maxPayment = p.payment;
    });
    var maxY = Math.max(maxBalance, maxPayment) * 1.05;
    if (maxY === 0) maxY = 1;

    function xPos(idx) {
      return padding.left + (idx / (points.length - 1 || 1)) * chartW;
    }
    function yPos(val) {
      return padding.top + chartH - (val / maxY) * chartH;
    }

    // 网格线
    ctx.strokeStyle = '#ecdfc4';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var y = padding.top + (chartH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#a0947c';
      ctx.font = '10px "LXGW WenKai", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      var val = maxY * (1 - g / 4);
      ctx.fillText(formatAxis(val), padding.left - 8, y);
    }

    // X 轴标签
    ctx.fillStyle = '#a0947c';
    ctx.font = '10px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var labelStep = Math.max(1, Math.floor(points.length / 6));
    for (var l = 0; l < points.length; l += labelStep) {
      var x = xPos(l);
      ctx.fillText(points[l].month + '月', x, h - padding.bottom + 8);
    }

    // 剩余余额面积
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(points[0].balance));
    for (var a = 1; a < points.length; a++) {
      ctx.lineTo(xPos(a), yPos(points[a].balance));
    }
    ctx.lineTo(xPos(points.length - 1), yPos(0));
    ctx.lineTo(xPos(0), yPos(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(160, 148, 124, 0.1)';
    ctx.fill();

    // 余额线
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(points[0].balance));
    for (var b = 1; b < points.length; b++) {
      ctx.lineTo(xPos(b), yPos(points[b].balance));
    }
    ctx.strokeStyle = '#a0947c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 月供线
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(points[0].payment));
    for (var c = 1; c < points.length; c++) {
      ctx.lineTo(xPos(c), yPos(points[c].payment));
    }
    ctx.strokeStyle = '#e88585';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 本金线（累计已还本金）
    ctx.beginPath();
    var cumPrincipal = points[0].principal;
    ctx.moveTo(xPos(0), yPos(cumPrincipal));
    for (var d = 1; d < points.length; d++) {
      cumPrincipal += points[d].principal;
      ctx.lineTo(xPos(d), yPos(cumPrincipal));
    }
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function formatAxis(v) {
    if (v >= 1e8) return (v / 1e8).toFixed(1) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(0) + '万';
    return Math.round(v).toString();
  }

  /* ============ 还款计划表 ============ */
  function getScheduleRows() {
    var r = state.result;
    if (!r) return [];

    if (state.scheduleView === 'monthly') {
      return r.rows;
    }

    // 按年聚合
    var yearly = [];
    r.rows.forEach(function (row) {
      var y = Math.ceil(row.month / 12);
      if (!yearly[y - 1]) {
        yearly[y - 1] = { year: y, payment: 0, principal: 0, interest: 0, balance: 0 };
      }
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

    // 表头
    scheduleHead.innerHTML = isMonthly
      ? '<tr><th>期数</th><th>月供 (元)</th><th>本金 (元)</th><th>利息 (元)</th><th>剩余本金 (元)</th></tr>'
      : '<tr><th>年份</th><th>年还款 (元)</th><th>年还本金 (元)</th><th>年还利息 (元)</th><th>年末余额 (元)</th></tr>';

    // 分页
    var totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
    if (state.schedulePage > totalPages) state.schedulePage = totalPages;
    var start = (state.schedulePage - 1) * PAGE_SIZE;
    var pageRows = allRows.slice(start, start + PAGE_SIZE);

    var html = '';
    pageRows.forEach(function (row) {
      var label = isMonthly ? row.month : row.year;
      html += '<tr>';
      html += '<td>' + label + '</td>';
      html += '<td>' + fmtMoney2(row.payment) + '</td>';
      html += '<td>' + fmtMoney2(row.principal) + '</td>';
      html += '<td>' + fmtMoney2(row.interest) + '</td>';
      html += '<td>' + fmtMoney2(row.balance) + '</td>';
      html += '</tr>';
    });
    scheduleBody.innerHTML = html;

    // 分页控件
    if (totalPages > 1) {
      paginationEl.hidden = false;
      pageInfoEl.textContent = state.schedulePage + ' / ' + totalPages;
      prevPageBtn.disabled = state.schedulePage <= 1;
      nextPageBtn.disabled = state.schedulePage >= totalPages;
    } else {
      paginationEl.hidden = true;
    }
  }

  /* ============ CSV 导出 ============ */
  function exportCSV() {
    if (!state.result) return;
    var isMonthly = state.scheduleView === 'monthly';
    var rows = isMonthly ? state.result.rows : getScheduleRows();

    var lines = [];
    if (isMonthly) {
      lines.push('期数,月供(元),本金(元),利息(元),剩余本金(元)');
    } else {
      lines.push('年份,年还款(元),年还本金(元),年还利息(元),年末余额(元)');
    }
    rows.forEach(function (r) {
      var label = isMonthly ? r.month : r.year;
      lines.push([
        label,
        r.payment.toFixed(2),
        r.principal.toFixed(2),
        r.interest.toFixed(2),
        r.balance.toFixed(2)
      ].join(','));
    });

    var csv = lines.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var d = new Date();
    var ts = d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'loan-schedule-' + ts + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ============ 事件 ============ */
  loanTypeSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(loanTypeSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.loanType = btn.dataset.value;
    var isCombined = state.loanType === 'combined';
    singleFields.hidden = isCombined;
    combinedFields.hidden = !isCombined;
  });

  repayMethodSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(repayMethodSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.repayMethod = btn.dataset.value;
  });

  prepayModeSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(prepayModeSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.prepayMode = btn.dataset.value;
  });

  scheduleViewSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(scheduleViewSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.scheduleView = btn.dataset.value;
    state.schedulePage = 1;
    renderSchedule();
  });

  calcBtn.addEventListener('click', calculate);

  resetBtn.addEventListener('click', function () {
    resultSection.hidden = true;
    state.result = null;
    if (!confirm('重置所有输入？')) return;
    loanAmountEl.value = '1000000';
    annualRateEl.value = '3.5';
    loanTermEl.value = '30';
    commercialAmountEl.value = '700000';
    commercialRateEl.value = '3.5';
    fundAmountEl.value = '300000';
    fundRateEl.value = '2.85';
    prepayMonthEl.value = '';
    prepayAmountEl.value = '';
    state.loanType = 'commercial';
    state.repayMethod = 'equal_payment';
    state.prepayMode = 'reduce_term';
    state.scheduleView = 'monthly';
    state.schedulePage = 1;

    Array.prototype.forEach.call(loanTypeSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === 'commercial');
    });
    Array.prototype.forEach.call(repayMethodSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === 'equal_payment');
    });
    Array.prototype.forEach.call(prepayModeSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === 'reduce_term');
    });
    Array.prototype.forEach.call(scheduleViewSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === 'monthly');
    });
    singleFields.hidden = false;
    combinedFields.hidden = true;
  });

  exportCSVBtn.addEventListener('click', exportCSV);

  prevPageBtn.addEventListener('click', function () {
    if (state.schedulePage > 1) {
      state.schedulePage--;
      renderSchedule();
    }
  });
  nextPageBtn.addEventListener('click', function () {
    var allRows = getScheduleRows();
    var totalPages = Math.ceil(allRows.length / PAGE_SIZE);
    if (state.schedulePage < totalPages) {
      state.schedulePage++;
      renderSchedule();
    }
  });

  /* 窗口尺寸变化重绘图表 */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!state.result) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      drawChart(state.result);
    }, 200);
  });

  /* Enter 快捷计算 */
  [loanAmountEl, annualRateEl, loanTermEl, commercialAmountEl, commercialRateEl, fundAmountEl, fundRateEl, prepayMonthEl, prepayAmountEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
      }
    });
  });

  /* ============ 初始化 ============ */
  function init() {
    // 默认不自动计算，避免页面加载时无意义渲染
    // 但载入上次参数
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data) {
          if (data.loanType) {
            state.loanType = data.loanType;
            Array.prototype.forEach.call(loanTypeSeg.children, function (b) {
              b.classList.toggle('active', b.dataset.value === data.loanType);
            });
            var isCombined = data.loanType === 'combined';
            singleFields.hidden = isCombined;
            combinedFields.hidden = !isCombined;
          }
          if (data.repayMethod) {
            state.repayMethod = data.repayMethod;
            Array.prototype.forEach.call(repayMethodSeg.children, function (b) {
              b.classList.toggle('active', b.dataset.value === data.repayMethod);
            });
          }
          if (data.loanAmount != null) loanAmountEl.value = data.loanAmount;
          if (data.annualRate != null) annualRateEl.value = data.annualRate;
          if (data.loanTerm != null) loanTermEl.value = data.loanTerm;
          if (data.commercialAmount != null) commercialAmountEl.value = data.commercialAmount;
          if (data.commercialRate != null) commercialRateEl.value = data.commercialRate;
          if (data.fundAmount != null) fundAmountEl.value = data.fundAmount;
          if (data.fundRate != null) fundRateEl.value = data.fundRate;
        }
      }
    } catch (e) { /* ignore */ }
  }

  /* 保存参数到 localStorage（每次计算时） */
  var origCalculate = calculate;
  calculate = function () {
    origCalculate();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        loanType: state.loanType,
        repayMethod: state.repayMethod,
        loanAmount: loanAmountEl.value,
        annualRate: annualRateEl.value,
        loanTerm: loanTermEl.value,
        commercialAmount: commercialAmountEl.value,
        commercialRate: commercialRateEl.value,
        fundAmount: fundAmountEl.value,
        fundRate: fundRateEl.value
      }));
    } catch (e) { /* ignore */ }
  };
  calcBtn.removeEventListener('click', origCalculate);
  calcBtn.addEventListener('click', calculate);

  init();
})();