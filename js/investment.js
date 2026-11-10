/* js/investment.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.investment.v1';

  /* ============ DOM ============ */
  var initialEl     = document.getElementById('initialPrincipal');
  var regularEl     = document.getElementById('regularInvest');
  var annualEl      = document.getElementById('annualReturn');
  var yearsEl       = document.getElementById('years');
  var inflationEl   = document.getElementById('inflationRate');
  var investUnitEl  = document.getElementById('investUnit');
  var freqSeg       = document.getElementById('freqSeg');
  var calcBtn       = document.getElementById('calcBtn');
  var resetBtn      = document.getElementById('resetBtn');
  var resultSection = document.getElementById('resultSection');
  var summaryGrid   = document.getElementById('summaryGrid');
  var growthChart   = document.getElementById('growthChart');
  var scheduleBody  = document.getElementById('scheduleBody');
  var exportBtn     = document.getElementById('exportBtn');

  /* ============ 状态 ============ */
  var state = {
    freq: 'monthly',  // monthly | yearly | once
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
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtMoney2(n) {
    if (!isFinite(n)) return '0.00';
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtPercent(n) {
    if (!isFinite(n)) return '—';
    return n.toFixed(2) + '%';
  }

  /* ============ 计算核心 ============ */
  /**
   * 月复利 + 月定投
   * @param P0 初始本金
   * @param m 月投入
   * @param annualRate 年化收益率（百分比）
   * @param years 年数
   */
  function calcFutureValue(P0, m, annualRate, years) {
    var r = annualRate / 100 / 12;
    var n = Math.round(years * 12);
    if (r === 0) {
      return P0 + m * n;
    }
    var factor = Math.pow(1 + r, n);
    return P0 * factor + m * (factor - 1) / r;
  }

  /**
   * 计算 IRR（内部收益率）
   * 现金流：t=0 投入 -P0，t=1..years 每年末投入 -(12m)（定投看作年末一笔），t=years 收回 +FV
   * 二分法求解
   */
  function calcIRR(P0, m, years, FV) {
    var annualInvest = m * 12;
    function npv(rate) {
      var v = -P0;
      for (var t = 1; t <= years; t++) {
        v -= annualInvest / Math.pow(1 + rate, t);
      }
      v += FV / Math.pow(1 + rate, years);
      return v;
    }

    // 边界判断
    var lo = -0.99;
    var hi = 10;
    var fLo = npv(lo);
    var fHi = npv(hi);
    if (fLo * fHi > 0) {
      // 无解或超出范围，返回 NaN
      return NaN;
    }

    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      var fMid = npv(mid);
      if (Math.abs(fMid) < 0.01) return mid;
      if (fLo * fMid < 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return (lo + hi) / 2;
  }

  /* ============ 主计算 ============ */
  function calculate() {
    var P0 = clamp(num(initialEl, 0), 0, 1e10);
    var regular = clamp(num(regularEl, 0), 0, 1e9);
    var annualRate = clamp(num(annualEl, 0), 0, 50);
    var years = Math.round(clamp(num(yearsEl, 1), 1, 60));
    var inflation = clamp(num(inflationEl, 0), 0, 20);

    // 根据投入频率换算月投入
    var monthlyInvest;
    if (state.freq === 'once') {
      monthlyInvest = 0;
    } else if (state.freq === 'yearly') {
      monthlyInvest = regular / 12;
    } else {
      monthlyInvest = regular;
    }

    // 计算结果
    var FV = calcFutureValue(P0, monthlyInvest, annualRate, years);
    var totalInvested = P0 + monthlyInvest * 12 * years;
    var totalGain = FV - totalInvested;
    var totalReturnRate = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // 通胀调整
    var realFV = FV / Math.pow(1 + inflation / 100, years);

    // IRR
    var irr = NaN;
    if (monthlyInvest > 0 || P0 > 0) {
      irr = calcIRR(P0, monthlyInvest, years, FV);
    }

    // 逐年明细
    var rows = [];
    rows.push({
      year: 0,
      yearInvest: 0,
      cumulativeInvested: P0,
      yearGain: 0,
      cumulativeGain: 0,
      totalAsset: P0,
      realAsset: P0
    });

    for (var t = 1; t <= years; t++) {
      var yearInvest = monthlyInvest * 12;
      var cumInvested = P0 + yearInvest * t;
      var assetAtT = calcFutureValue(P0, monthlyInvest, annualRate, t);
      var prevAsset = rows[rows.length - 1].totalAsset;
      var yearGain = assetAtT - prevAsset - yearInvest;
      var cumGain = assetAtT - cumInvested;
      var realAtT = assetAtT / Math.pow(1 + inflation / 100, t);

      rows.push({
        year: t,
        yearInvest: yearInvest,
        cumulativeInvested: cumInvested,
        yearGain: yearGain,
        cumulativeGain: cumGain,
        totalAsset: assetAtT,
        realAsset: realAtT
      });
    }

    state.result = {
      P0: P0,
      monthlyInvest: monthlyInvest,
      annualRate: annualRate,
      years: years,
      inflation: inflation,
      FV: FV,
      realFV: realFV,
      totalInvested: totalInvested,
      totalGain: totalGain,
      totalReturnRate: totalReturnRate,
      irr: irr,
      rows: rows
    };

    render();
  }

  /* ============ 渲染 ============ */
  function render() {
    var r = state.result;
    if (!r) return;

    // 摘要卡片
    var irrStr = isFinite(r.irr) ? fmtPercent(r.irr * 100) : '—';
    var realLossStr = r.FV > 0 ? fmtPercent((1 - r.realFV / r.FV) * 100) + ' 购买力损耗' : '';

    summaryGrid.innerHTML = [
      '<div class="summary-card primary">',
        '<span class="summary-label">最终资产</span>',
        '<span class="summary-value">' + fmtMoney(r.FV) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">' + r.years + ' 年后 · 名义值</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">通胀调整后</span>',
        '<span class="summary-value">' + fmtMoney(r.realFV) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">' + (realLossStr || '按 ' + r.inflation + '% 通胀估算') + '</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">总投入本金</span>',
        '<span class="summary-value">' + fmtMoney(r.totalInvested) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">初始 ' + fmtMoney(r.P0) + ' + 定投累计 ' + fmtMoney(r.totalInvested - r.P0) + '</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">总收益</span>',
        '<span class="summary-value">' + fmtMoney(r.totalGain) + '<span class="unit">元</span></span>',
        '<span class="summary-sub">' + (r.totalGain > 0 ? '📈' : '📉') + ' 收益率 ' + fmtPercent(r.totalReturnRate) + '</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">年化收益率（IRR）</span>',
        '<span class="summary-value">' + irrStr + '</span>',
        '<span class="summary-sub">考虑资金进出时机的真实年化</span>',
      '</div>',
      '<div class="summary-card">',
        '<span class="summary-label">资产翻倍倍数</span>',
        '<span class="summary-value">' + (r.totalInvested > 0 ? (r.FV / r.totalInvested).toFixed(2) : '—') + '<span class="unit">×</span></span>',
        '<span class="summary-sub">最终资产 ÷ 总投入</span>',
      '</div>'
    ].join('');

    // 图表
    drawChart(r);

    // 明细表
    renderSchedule(r);

    resultSection.hidden = false;
  }

  /* ============ 图表 ============ */
  function drawChart(r) {
    var dpr = window.devicePixelRatio || 1;
    var rect = growthChart.parentElement.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    if (w <= 0 || h <= 0) return;

    growthChart.width = Math.round(w * dpr);
    growthChart.height = Math.round(h * dpr);
    var ctx = growthChart.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var padding = { top: 16, right: 20, bottom: 32, left: 70 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;

    var rows = r.rows;
    if (rows.length === 0) return;

    // 最大 Y
    var maxY = 0;
    rows.forEach(function (row) {
      if (row.totalAsset > maxY) maxY = row.totalAsset;
      if (row.realAsset > maxY) maxY = row.realAsset;
      if (row.cumulativeInvested > maxY) maxY = row.cumulativeInvested;
    });
    maxY *= 1.08;
    if (maxY === 0) maxY = 1;

    function xPos(idx) {
      return padding.left + (idx / (rows.length - 1 || 1)) * chartW;
    }
    function yPos(val) {
      return padding.top + chartH - (val / maxY) * chartH;
    }

    // 网格线 + Y 轴标签
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
    var xLabels = Math.min(6, rows.length);
    for (var i = 0; i < xLabels; i++) {
      var idx = Math.round((i / (xLabels - 1)) * (rows.length - 1));
      ctx.fillText(rows[idx].year + '年', xPos(idx), h - padding.bottom + 8);
    }

    // 填充总资产区域
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(rows[0].totalAsset));
    for (var a = 1; a < rows.length; a++) {
      ctx.lineTo(xPos(a), yPos(rows[a].totalAsset));
    }
    ctx.lineTo(xPos(rows.length - 1), yPos(0));
    ctx.lineTo(xPos(0), yPos(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(138, 90, 43, 0.08)';
    ctx.fill();

    // 本金累积线（浅棕）
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(rows[0].cumulativeInvested));
    for (var b = 1; b < rows.length; b++) {
      ctx.lineTo(xPos(b), yPos(rows[b].cumulativeInvested));
    }
    ctx.strokeStyle = '#a0947c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 通胀调整线（蓝）
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(rows[0].realAsset));
    for (var c = 1; c < rows.length; c++) {
      ctx.lineTo(xPos(c), yPos(rows[c].realAsset));
    }
    ctx.strokeStyle = '#6ba8d4';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 总资产线（深棕，最显眼）
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(rows[0].totalAsset));
    for (var d = 1; d < rows.length; d++) {
      ctx.lineTo(xPos(d), yPos(rows[d].totalAsset));
    }
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 最后一个点
    var lastRow = rows[rows.length - 1];
    ctx.beginPath();
    ctx.arc(xPos(rows.length - 1), yPos(lastRow.totalAsset), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#8a5a2b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function formatAxis(v) {
    if (v >= 1e8) return (v / 1e8).toFixed(1) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(0) + '万';
    return Math.round(v).toString();
  }

  /* ============ 明细表 ============ */
  function renderSchedule(r) {
    var rows = r.rows;
    var html = '';

    // 从第 1 年开始显示（跳过第 0 年）
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      html += '<tr>';
      html += '<td>第 ' + row.year + ' 年</td>';
      html += '<td>' + fmtMoney2(row.yearInvest) + '</td>';
      html += '<td>' + fmtMoney2(row.cumulativeInvested) + '</td>';
      html += '<td class="gain">' + (row.yearGain >= 0 ? '+' : '') + fmtMoney2(row.yearGain) + '</td>';
      html += '<td class="gain">' + (row.cumulativeGain >= 0 ? '+' : '') + fmtMoney2(row.cumulativeGain) + '</td>';
      html += '<td class="asset">' + fmtMoney2(row.totalAsset) + '</td>';
      html += '<td class="real">' + fmtMoney2(row.realAsset) + '</td>';
      html += '</tr>';
    }

    scheduleBody.innerHTML = html;
  }

  /* ============ CSV 导出 ============ */
  function exportCSV() {
    if (!state.result) return;
    var r = state.result;

    var lines = [];
    lines.push('年份,本年投入(元),累计本金(元),本年收益(元),累计收益(元),年末总资产(元),通胀调整后(元)');

    // 包含第 0 行
    lines.push([
      0,
      '0.00',
      r.rows[0].cumulativeInvested.toFixed(2),
      '0.00',
      '0.00',
      r.rows[0].totalAsset.toFixed(2),
      r.rows[0].realAsset.toFixed(2)
    ].join(','));

    for (var i = 1; i < r.rows.length; i++) {
      var row = r.rows[i];
      lines.push([
        row.year,
        row.yearInvest.toFixed(2),
        row.cumulativeInvested.toFixed(2),
        row.yearGain.toFixed(2),
        row.cumulativeGain.toFixed(2),
        row.totalAsset.toFixed(2),
        row.realAsset.toFixed(2)
      ].join(','));
    }

    // 汇总行
    lines.push('');
    lines.push('汇总');
    lines.push('初始本金(元),' + r.P0.toFixed(2));
    lines.push('总投入本金(元),' + r.totalInvested.toFixed(2));
    lines.push('最终资产(元),' + r.FV.toFixed(2));
    lines.push('通胀调整后(元),' + r.realFV.toFixed(2));
    lines.push('总收益(元),' + r.totalGain.toFixed(2));
    lines.push('总收益率,' + r.totalReturnRate.toFixed(2) + '%');
    lines.push('年化收益率 IRR,' + (isFinite(r.irr) ? (r.irr * 100).toFixed(2) + '%' : '—'));
    lines.push('年化收益率(输入),' + r.annualRate + '%');
    lines.push('投资年限(年),' + r.years);
    lines.push('年均通胀率,' + r.inflation + '%');

    var csv = lines.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

    var d = new Date();
    var ts = d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'investment-' + ts + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ============ 事件绑定 ============ */
  freqSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(freqSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.freq = btn.dataset.value;

    if (state.freq === 'monthly') {
      investUnitEl.textContent = '月';
      regularEl.disabled = false;
    } else if (state.freq === 'yearly') {
      investUnitEl.textContent = '年';
      regularEl.disabled = false;
    } else {
      investUnitEl.textContent = '—';
      regularEl.disabled = true;
    }
  });

  calcBtn.addEventListener('click', calculate);
  exportBtn.addEventListener('click', exportCSV);

  resetBtn.addEventListener('click', function () {
    if (!confirm('重置所有输入？')) return;
    initialEl.value = '10000';
    regularEl.value = '2000';
    annualEl.value = '7';
    yearsEl.value = '20';
    inflationEl.value = '3';

    state.freq = 'monthly';
    Array.prototype.forEach.call(freqSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === 'monthly');
    });
    investUnitEl.textContent = '月';
    regularEl.disabled = false;

    resultSection.hidden = true;
    state.result = null;
    save();
  });

  /* Enter 快捷计算 */
  [initialEl, regularEl, annualEl, yearsEl, inflationEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
      }
    });
  });

  /* 窗口 resize 重绘图表 */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!state.result) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      drawChart(state.result);
    }, 200);
  });

  /* ============ 持久化 ============ */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        initial: initialEl.value,
        regular: regularEl.value,
        annual: annualEl.value,
        years: yearsEl.value,
        inflation: inflationEl.value,
        freq: state.freq
      }));
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (data.initial != null) initialEl.value = data.initial;
      if (data.regular != null) regularEl.value = data.regular;
      if (data.annual != null) annualEl.value = data.annual;
      if (data.years != null) yearsEl.value = data.years;
      if (data.inflation != null) inflationEl.value = data.inflation;
      if (data.freq && ['monthly', 'yearly', 'once'].indexOf(data.freq) >= 0) {
        state.freq = data.freq;
        Array.prototype.forEach.call(freqSeg.children, function (b) {
          b.classList.toggle('active', b.dataset.value === data.freq);
        });
        if (data.freq === 'monthly') {
          investUnitEl.textContent = '月';
          regularEl.disabled = false;
        } else if (data.freq === 'yearly') {
          investUnitEl.textContent = '年';
          regularEl.disabled = false;
        } else {
          investUnitEl.textContent = '—';
          regularEl.disabled = true;
        }
      }
    } catch (e) { /* ignore */ }
  }

  /* 保存包装 */
  var origCalc = calculate;
  calculate = function () {
    origCalc();
    save();
  };
  calcBtn.removeEventListener('click', origCalc);
  calcBtn.addEventListener('click', calculate);

  /* ============ 初始化 ============ */
  load();
  calculate();
})();