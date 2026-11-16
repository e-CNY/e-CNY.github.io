/* js/investment.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.investment.v2';

  /* ============ DOM ============ */
  var initialEl       = document.getElementById('initialPrincipal');
  var regularEl       = document.getElementById('regularInvest');
  var annualEl        = document.getElementById('annualReturn');
  var yearsEl         = document.getElementById('years');
  var yearsRange      = document.getElementById('yearsRange');
  var inflationEl     = document.getElementById('inflationRate');
  var feeRateEl       = document.getElementById('feeRate');
  var investGrowthEl  = document.getElementById('investGrowth');
  var targetAmountEl  = document.getElementById('targetAmount');
  var scenarioToggle  = document.getElementById('scenarioToggle');
  var scenarioDeltaEl = document.getElementById('scenarioDelta');
  var scenarioDeltaWrap = document.getElementById('scenarioDeltaWrap');
  var investUnitEl    = document.getElementById('investUnit');
  var freqSeg         = document.getElementById('freqSeg');
  var presetRow       = document.querySelector('.preset-row');
  var calcBtn         = document.getElementById('calcBtn');
  var resetBtn        = document.getElementById('resetBtn');
  var resultSection   = document.getElementById('resultSection');
  var summaryGrid     = document.getElementById('summaryGrid');
  var growthChart     = document.getElementById('growthChart');
  var chartTooltip    = document.getElementById('chartTooltip');
  var scheduleBody    = document.getElementById('scheduleBody');
  var exportBtn       = document.getElementById('exportBtn');
  var scaleBtn        = document.getElementById('scaleBtn');

  /* ============ 状态 ============ */
  var state = {
    freq: 'monthly',        // monthly | yearly | once
    chartScale: 'linear',   // linear | log
    showScenario: false,
    hoverIdx: null,
    result: null,
    _chartLayout: null
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

  function formatAxis(v) {
    if (v >= 1e8) return (v / 1e8).toFixed(1) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(0) + '万';
    if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
    return Math.round(v).toString();
  }

  function extend(base, extra) {
    var o = {}, k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) o[k] = base[k];
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return o;
  }

  /* ============ 模拟核心：按月迭代 ============ */
  /**
   * @param o { P0, monthlyInvest, annualRate, years, investGrowth, feeRate, inflation }
   * 说明：
   *  - 月有效收益率 r = (1 + annualRate)^(1/12) - 1
   *  - 月管理费率 f = (1 + feeRate)^(1/12) - 1，每月从资产中扣除
   *  - 第 t 年的每月投入 = monthlyInvest * (1 + investGrowth)^(t-1)
   */
  function simulate(o) {
    var r = Math.pow(1 + o.annualRate / 100, 1 / 12) - 1;
    var f = Math.pow(1 + o.feeRate / 100, 1 / 12) - 1;
    var netR = r - f;
    var g = o.investGrowth / 100;
    var infl = o.inflation / 100;

    var rows = [];
    var asset = o.P0;
    var cumInvested = o.P0;
    var cumFee = 0;

    rows.push({
      year: 0,
      yearInvest: 0,
      yearFee: 0,
      cumInvested: o.P0,
      cumFee: 0,
      yearGain: 0,
      cumGain: 0,
      totalAsset: o.P0,
      realAsset: o.P0
    });

    for (var t = 1; t <= o.years; t++) {
      var monthly = o.monthlyInvest * Math.pow(1 + g, t - 1);
      var yearStart = asset;
      var yearInvest = 0;
      var yearFee = 0;

      for (var m = 1; m <= 12; m++) {
        var feeAmt = asset * f;
        yearFee += feeAmt;
        asset = asset * (1 + netR) + monthly;
        yearInvest += monthly;
      }

      cumInvested += yearInvest;
      cumFee += yearFee;

      var yearGain = asset - yearStart - yearInvest;
      var cumGain = asset - cumInvested;
      var realAsset = asset / Math.pow(1 + infl, t);

      rows.push({
        year: t,
        yearInvest: yearInvest,
        yearFee: yearFee,
        cumInvested: cumInvested,
        cumFee: cumFee,
        yearGain: yearGain,
        cumGain: cumGain,
        totalAsset: asset,
        realAsset: realAsset
      });
    }
    return rows;
  }

  /* ============ IRR：二分法 ============ */
  function calcIRR(P0, yearInvests, FV) {
    var years = yearInvests.length;
    if (years === 0) return NaN;

    function npv(rate) {
      var v = -P0;
      for (var t = 1; t <= years; t++) {
        v -= yearInvests[t - 1] / Math.pow(1 + rate, t);
      }
      v += FV / Math.pow(1 + rate, years);
      return v;
    }

    var lo = -0.99, hi = 10;
    var fLo = npv(lo), fHi = npv(hi);
    if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return NaN;

    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      var fMid = npv(mid);
      if (Math.abs(fMid) < 0.01) return mid;
      if (fLo * fMid < 0) { hi = mid; fHi = fMid; }
      else { lo = mid; fLo = fMid; }
    }
    return (lo + hi) / 2;
  }

  /* ============ 目标反推 ============ */
  function findTargetYear(rows, target) {
    if (target <= 0) return null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].totalAsset >= target) return rows[i].year;
    }
    return null;
  }

  /* ============ 主计算 ============ */
  function calculate() {
    var P0 = clamp(num(initialEl, 0), 0, 1e10);
    var regular = clamp(num(regularEl, 0), 0, 1e9);
    var annualRate = clamp(num(annualEl, 0), 0, 50);
    var years = Math.round(clamp(num(yearsEl, 1), 1, 60));
    var inflation = clamp(num(inflationEl, 0), 0, 20);
    var feeRate = clamp(num(feeRateEl, 0), 0, 10);
    var investGrowth = clamp(num(investGrowthEl, 0), -20, 30);
    var targetAmount = clamp(num(targetAmountEl, 0), 0, 1e12);
    var scenarioDelta = clamp(num(scenarioDeltaEl, 3), 0, 20);

    yearsEl.value = years;
    yearsRange.value = years;

    var monthlyInvest;
    if (state.freq === 'once') monthlyInvest = 0;
    else if (state.freq === 'yearly') monthlyInvest = regular / 12;
    else monthlyInvest = regular;

    var baseOpts = {
      P0: P0,
      monthlyInvest: monthlyInvest,
      annualRate: annualRate,
      years: years,
      investGrowth: investGrowth,
      feeRate: feeRate,
      inflation: inflation
    };

    var rows = simulate(baseOpts);
    var lastRow = rows[rows.length - 1];
    var FV = lastRow.totalAsset;
    var realFV = lastRow.realAsset;
    var totalInvested = lastRow.cumInvested;
    var totalFee = lastRow.cumFee;
    var totalGain = FV - totalInvested;
    var totalReturnRate = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    var yearInvests = rows.slice(1).map(function (row) { return row.yearInvest; });
    var irr = (P0 > 0 || monthlyInvest > 0) ? calcIRR(P0, yearInvests, FV) : NaN;

    var targetYear = targetAmount > 0 ? findTargetYear(rows, targetAmount) : null;

    var pessRows = null, optRows = null;
    if (state.showScenario) {
      pessRows = simulate(extend(baseOpts, { annualRate: Math.max(0, annualRate - scenarioDelta) }));
      optRows = simulate(extend(baseOpts, { annualRate: annualRate + scenarioDelta }));
    }

    state.result = {
      P0: P0,
      monthlyInvest: monthlyInvest,
      annualRate: annualRate,
      years: years,
      inflation: inflation,
      feeRate: feeRate,
      investGrowth: investGrowth,
      FV: FV,
      realFV: realFV,
      totalInvested: totalInvested,
      totalFee: totalFee,
      totalGain: totalGain,
      totalReturnRate: totalReturnRate,
      irr: irr,
      target: targetAmount,
      targetYear: targetYear,
      rows: rows,
      pessRows: pessRows,
      optRows: optRows
    };

    render();
    save();
    updateURL();
  }

  /* ============ 渲染入口 ============ */
  function render() {
    var r = state.result;
    if (!r) return;
    renderSummary(r);
    drawChart();
    renderSchedule(r);
    resultSection.hidden = false;
  }

  /* ============ 摘要卡片 ============ */
  function renderSummary(r) {
    var irrStr = isFinite(r.irr) ? fmtPercent(r.irr * 100) : '—';
    var cards = [];

    cards.push(
      '<div class="summary-card primary">' +
        '<span class="summary-label">最终资产</span>' +
        '<span class="summary-value">' + fmtMoney(r.FV) + '<span class="unit">元</span></span>' +
        '<span class="summary-sub">' + r.years + ' 年后 · 名义值</span>' +
      '</div>'
    );

    var realLossRate = r.FV > 0 ? (1 - r.realFV / r.FV) * 100 : 0;
    cards.push(
      '<div class="summary-card">' +
        '<span class="summary-label">通胀调整后</span>' +
        '<span class="summary-value">' + fmtMoney(r.realFV) + '<span class="unit">元</span></span>' +
        '<span class="summary-sub">' +
          (realLossRate > 0
            ? '购买力损耗 ' + fmtPercent(realLossRate)
            : '按 ' + r.inflation + '% 通胀估算') +
        '</span>' +
      '</div>'
    );

    cards.push(
      '<div class="summary-card">' +
        '<span class="summary-label">总投入本金</span>' +
        '<span class="summary-value">' + fmtMoney(r.totalInvested) + '<span class="unit">元</span></span>' +
        '<span class="summary-sub">初始 ' + fmtMoney(r.P0) + ' + 定投累计 ' + fmtMoney(r.totalInvested - r.P0) + '</span>' +
      '</div>'
    );

    cards.push(
      '<div class="summary-card">' +
        '<span class="summary-label">总收益</span>' +
        '<span class="summary-value">' + fmtMoney(r.totalGain) + '<span class="unit">元</span></span>' +
        '<span class="summary-sub">' + (r.totalGain >= 0 ? '📈' : '📉') + ' 收益率 ' + fmtPercent(r.totalReturnRate) + '</span>' +
      '</div>'
    );

    cards.push(
      '<div class="summary-card">' +
        '<span class="summary-label">年化收益率（IRR）</span>' +
        '<span class="summary-value">' + irrStr + '</span>' +
        '<span class="summary-sub">考虑资金进出时机的真实年化</span>' +
      '</div>'
    );

    cards.push(
      '<div class="summary-card">' +
        '<span class="summary-label">资产翻倍倍数</span>' +
        '<span class="summary-value">' +
          (r.totalInvested > 0 ? (r.FV / r.totalInvested).toFixed(2) : '—') +
          '<span class="unit">×</span>' +
        '</span>' +
        '<span class="summary-sub">最终资产 ÷ 总投入</span>' +
      '</div>'
    );

    if (r.feeRate > 0) {
      cards.push(
        '<div class="summary-card">' +
          '<span class="summary-label">累计管理费</span>' +
          '<span class="summary-value">' + fmtMoney(r.totalFee) + '<span class="unit">元</span></span>' +
          '<span class="summary-sub">按 ' + r.feeRate + '% / 年 扣除</span>' +
        '</div>'
      );
    }

    if (r.target > 0) {
      if (r.targetYear === 0) {
        cards.push(
          '<div class="summary-card highlight">' +
            '<span class="summary-label">🎯 目标达成</span>' +
            '<span class="summary-value">已达成</span>' +
            '<span class="summary-sub">初始本金即满足 ' + fmtMoney(r.target) + ' 元</span>' +
          '</div>'
        );
      } else if (r.targetYear != null) {
        cards.push(
          '<div class="summary-card highlight">' +
            '<span class="summary-label">🎯 目标达成</span>' +
            '<span class="summary-value">第 ' + r.targetYear + '<span class="unit">年</span></span>' +
            '<span class="summary-sub">目标 ' + fmtMoney(r.target) + ' 元</span>' +
          '</div>'
        );
      } else {
        cards.push(
          '<div class="summary-card warn">' +
            '<span class="summary-label">🎯 目标未达成</span>' +
            '<span class="summary-value">—</span>' +
            '<span class="summary-sub">' + r.years + ' 年内未达 ' + fmtMoney(r.target) + ' 元</span>' +
          '</div>'
        );
      }
    }

    summaryGrid.innerHTML = cards.join('');
  }

  /* ============ 图表绘制 ============ */
  function drawChart() {
    var r = state.result;
    if (!r) return;

    var wrap = growthChart.parentElement;
    var rect = wrap.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    if (w <= 0 || h <= 0) return;

    var dpr = window.devicePixelRatio || 1;
    growthChart.width = Math.round(w * dpr);
    growthChart.height = Math.round(h * dpr);
    var ctx = growthChart.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var padding = { top: 16, right: 20, bottom: 32, left: 70 };
    var chartW = w - padding.left - padding.right;
    var chartH = h - padding.top - padding.bottom;
    var rows = r.rows;
    if (rows.length < 2) return;

    var series = [
      { key: 'principal', values: rows.map(function (x) { return x.cumInvested; }), color: '#a0947c', width: 2,   dash: null },
      { key: 'asset',     values: rows.map(function (x) { return x.totalAsset; }), color: '#8a5a2b', width: 2.5, dash: null, fill: true },
      { key: 'real',      values: rows.map(function (x) { return x.realAsset;  }), color: '#6ba8d4', width: 2,   dash: [5, 4] }
    ];
    if (state.showScenario && r.pessRows && r.optRows) {
      series.push({ key: 'pessimistic', values: r.pessRows.map(function (x) { return x.totalAsset; }), color: '#c0392b', width: 1.5, dash: [3, 3] });
      series.push({ key: 'optimistic',  values: r.optRows.map(function (x)  { return x.totalAsset; }), color: '#1f8a3a', width: 1.5, dash: [3, 3] });
    }

    var maxY = 0;
    series.forEach(function (s) {
      s.values.forEach(function (v) { if (v > maxY) maxY = v; });
    });
    maxY *= 1.08;
    if (maxY <= 0) maxY = 1;

    var isLog = state.chartScale === 'log';
    var logMax = Math.log10(Math.max(maxY, 10));

    function xPos(idx) {
      return padding.left + (idx / (rows.length - 1)) * chartW;
    }
    function yPos(val) {
      if (isLog) {
        var lv = Math.log10(Math.max(val, 1));
        return padding.top + chartH - (lv / logMax) * chartH;
      }
      return padding.top + chartH - (val / maxY) * chartH;
    }

    // 网格 + Y 轴
    ctx.strokeStyle = '#ecdfc4';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gVal = isLog ? Math.pow(10, (logMax / 4) * g) : maxY * (g / 4);
      var gy = yPos(gVal);
      ctx.beginPath();
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(w - padding.right, gy);
      ctx.stroke();

      ctx.fillStyle = '#a0947c';
      ctx.font = '10px "LXGW WenKai", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatAxis(gVal), padding.left - 8, gy);
    }

    // X 轴标签
    ctx.fillStyle = '#a0947c';
    ctx.font = '10px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var xLabels = Math.min(6, rows.length);
    for (var i = 0; i < xLabels; i++) {
      var idx = xLabels === 1 ? 0 : Math.round((i / (xLabels - 1)) * (rows.length - 1));
      ctx.fillText(rows[idx].year + '年', xPos(idx), h - padding.bottom + 8);
    }

    // 总资产填充
    var assetValues = series[1].values;
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(assetValues[0]));
    for (var a = 1; a < assetValues.length; a++) {
      ctx.lineTo(xPos(a), yPos(assetValues[a]));
    }
    ctx.lineTo(xPos(assetValues.length - 1), padding.top + chartH);
    ctx.lineTo(xPos(0), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(138, 90, 43, 0.08)';
    ctx.fill();

    // 各条曲线
    series.forEach(function (s) {
      ctx.beginPath();
      for (var j = 0; j < s.values.length; j++) {
        var px = xPos(j), py = yPos(s.values[j]);
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.setLineDash(s.dash || []);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 终点圆点
    var lastIdx = rows.length - 1;
    ctx.beginPath();
    ctx.arc(xPos(lastIdx), yPos(rows[lastIdx].totalAsset), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#8a5a2b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // hover 竖线 + 高亮点
    if (state.hoverIdx != null && state.hoverIdx >= 0 && state.hoverIdx < rows.length) {
      var hi = state.hoverIdx;
      var hx = xPos(hi);
      ctx.beginPath();
      ctx.moveTo(hx, padding.top);
      ctx.lineTo(hx, padding.top + chartH);
      ctx.strokeStyle = 'rgba(138, 90, 43, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      series.forEach(function (s) {
        ctx.beginPath();
        ctx.arc(hx, yPos(s.values[hi]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    state._chartLayout = {
      padding: padding,
      chartW: chartW,
      chartH: chartH
    };
  }

  /* ============ 明细表 ============ */
  function renderSchedule(r) {
    var rows = r.rows;
    var html = '';
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      html += '<tr>';
      html += '<td>第 ' + row.year + ' 年</td>';
      html += '<td>' + fmtMoney2(row.yearInvest) + '</td>';
      html += '<td>' + fmtMoney2(row.cumInvested) + '</td>';
      html += '<td class="gain">' + (row.yearGain >= 0 ? '+' : '') + fmtMoney2(row.yearGain) + '</td>';
      html += '<td class="gain">' + (row.cumGain >= 0 ? '+' : '') + fmtMoney2(row.cumGain) + '</td>';
      html += '<td class="fee">' + (row.yearFee > 0 ? '-' + fmtMoney2(row.yearFee) : '—') + '</td>';
      html += '<td class="asset">' + fmtMoney2(row.totalAsset) + '</td>';
      html += '<td class="real">' + fmtMoney2(row.realAsset) + '</td>';
      html += '</tr>';
    }
    scheduleBody.innerHTML = html;
  }

  /* ============ Tooltip ============ */
  function ttRow(dotClass, label, value) {
    return '<div class="tt-row">' +
      '<span class="tt-label"><i class="tt-dot ' + dotClass + '"></i>' + label + '</span>' +
      '<span>' + value + '</span>' +
      '</div>';
  }

  function showTooltip(clientX, clientY) {
    var r = state.result;
    if (!r || state.hoverIdx == null) return;
    var idx = state.hoverIdx;
    var row = r.rows[idx];

    var html = '<div class="tt-year">第 ' + row.year + ' 年</div>';
    html += ttRow('principal', '累计本金', fmtMoney(row.cumInvested));
    html += ttRow('asset', '年末总资产', fmtMoney(row.totalAsset));
    html += ttRow('real', '通胀调整后', fmtMoney(row.realAsset));
    if (state.showScenario && r.pessRows && r.optRows) {
      html += ttRow('pessimistic', '悲观', fmtMoney(r.pessRows[idx].totalAsset));
      html += ttRow('optimistic', '乐观', fmtMoney(r.optRows[idx].totalAsset));
    }
    chartTooltip.innerHTML = html;
    chartTooltip.hidden = false;

    var wrapRect = growthChart.parentElement.getBoundingClientRect();
    var ttRect = chartTooltip.getBoundingClientRect();
    var x = clientX - wrapRect.left;
    var y = clientY - wrapRect.top;

    var left = x + 14;
    var top = y - ttRect.height / 2;
    if (left + ttRect.width > wrapRect.width - 8) left = x - ttRect.width - 14;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    if (top + ttRect.height > wrapRect.height - 8) top = wrapRect.height - ttRect.height - 8;

    chartTooltip.style.left = left + 'px';
    chartTooltip.style.top = top + 'px';
  }

  /* ============ CSV 导出 ============ */
  function exportCSV() {
    if (!state.result) return;
    var r = state.result;

    var lines = [];
    lines.push('年份,本年投入(元),累计本金(元),本年收益(元),累计收益(元),本年管理费(元),年末总资产(元),通胀调整后(元)');

    lines.push([
      0, '0.00',
      r.rows[0].cumInvested.toFixed(2),
      '0.00', '0.00', '0.00',
      r.rows[0].totalAsset.toFixed(2),
      r.rows[0].realAsset.toFixed(2)
    ].join(','));

    for (var i = 1; i < r.rows.length; i++) {
      var row = r.rows[i];
      lines.push([
        row.year,
        row.yearInvest.toFixed(2),
        row.cumInvested.toFixed(2),
        row.yearGain.toFixed(2),
        row.cumGain.toFixed(2),
        row.yearFee.toFixed(2),
        row.totalAsset.toFixed(2),
        row.realAsset.toFixed(2)
      ].join(','));
    }

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
    lines.push('年管理费率,' + r.feeRate + '%');
    lines.push('累计管理费(元),' + r.totalFee.toFixed(2));
    lines.push('定投年增长率,' + r.investGrowth + '%');
    if (r.target > 0) {
      lines.push('目标金额(元),' + r.target.toFixed(2));
      lines.push('目标达成年份,' + (r.targetYear == null ? '未达成' : '第 ' + r.targetYear + ' 年'));
    }

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

  /* ============ UI 同步 ============ */
  function applyFreqUI() {
    Array.prototype.forEach.call(freqSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.freq);
    });
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
  }

  function applyScenarioUI() {
    scenarioToggle.checked = state.showScenario;
    scenarioDeltaWrap.hidden = !state.showScenario;
    Array.prototype.forEach.call(document.querySelectorAll('.scenario-legend'), function (el) {
      el.hidden = !state.showScenario;
    });
  }

  function applyScaleUI() {
    scaleBtn.textContent = state.chartScale === 'linear' ? '切换对数坐标' : '切换线性坐标';
  }

  /* ============ 事件绑定 ============ */
  freqSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    state.freq = btn.dataset.value;
    applyFreqUI();
    calculate();
  });

  if (presetRow) {
    presetRow.addEventListener('click', function (e) {
      var btn = e.target.closest('.preset-btn');
      if (!btn) return;
      var p = btn.dataset.preset;
      if (p === 'conservative') annualEl.value = '4';
      else if (p === 'balanced') annualEl.value = '7';
      else if (p === 'aggressive') annualEl.value = '10';
      calculate();
    });
  }

  yearsEl.addEventListener('input', function () {
    var v = Math.round(clamp(parseInt(yearsEl.value, 10), 1, 60));
    if (!isNaN(v)) yearsRange.value = v;
  });

  var sliderTimer = null;
  yearsRange.addEventListener('input', function () {
    yearsEl.value = yearsRange.value;
    clearTimeout(sliderTimer);
    sliderTimer = setTimeout(calculate, 180);
  });

  scenarioToggle.addEventListener('change', function () {
    state.showScenario = scenarioToggle.checked;
    applyScenarioUI();
    calculate();
  });

  scenarioDeltaEl.addEventListener('input', function () {
    if (state.showScenario) calculate();
  });

  scaleBtn.addEventListener('click', function () {
    state.chartScale = state.chartScale === 'linear' ? 'log' : 'linear';
    applyScaleUI();
    if (state.result) drawChart();
    save();
  });

  calcBtn.addEventListener('click', calculate);
  exportBtn.addEventListener('click', exportCSV);

  resetBtn.addEventListener('click', function () {
    if (!confirm('重置所有输入？')) return;
    initialEl.value = '10000';
    regularEl.value = '2000';
    annualEl.value = '7';
    yearsEl.value = '20';
    yearsRange.value = '20';
    inflationEl.value = '3';
    feeRateEl.value = '0';
    investGrowthEl.value = '0';
    targetAmountEl.value = '0';
    scenarioDeltaEl.value = '3';
    scenarioToggle.checked = false;

    state.freq = 'monthly';
    state.showScenario = false;
    state.chartScale = 'linear';
    state.hoverIdx = null;
    state.result = null;

    applyFreqUI();
    applyScenarioUI();
    applyScaleUI();

    resultSection.hidden = true;
    chartTooltip.hidden = true;
    clearURL();
    save();
  });

  [initialEl, regularEl, annualEl, yearsEl, inflationEl,
   feeRateEl, investGrowthEl, targetAmountEl, scenarioDeltaEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
      }
    });
  });

  /* 图表 hover */
  growthChart.addEventListener('mousemove', function (e) {
    if (!state.result || !state._chartLayout) return;
    var rect = growthChart.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var layout = state._chartLayout;
    var ratio = (x - layout.padding.left) / layout.chartW;
    ratio = Math.max(0, Math.min(1, ratio));
    var idx = Math.round(ratio * (state.result.rows.length - 1));
    var changed = state.hoverIdx !== idx;
    state.hoverIdx = idx;
    if (changed) drawChart();
    showTooltip(e.clientX, e.clientY);
  });

  growthChart.addEventListener('mouseleave', function () {
    if (state.hoverIdx == null) return;
    state.hoverIdx = null;
    chartTooltip.hidden = true;
    drawChart();
  });

  /* 窗口尺寸变化重绘 */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!state.result) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { drawChart(); }, 200);
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
        fee: feeRateEl.value,
        growth: investGrowthEl.value,
        target: targetAmountEl.value,
        delta: scenarioDeltaEl.value,
        scen: state.showScenario ? 1 : 0,
        freq: state.freq,
        scale: state.chartScale
      }));
    } catch (e) { /* ignore */ }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (data.initial != null) initialEl.value = data.initial;
      if (data.regular != null) regularEl.value = data.regular;
      if (data.annual != null) annualEl.value = data.annual;
      if (data.years != null) { yearsEl.value = data.years; yearsRange.value = data.years; }
      if (data.inflation != null) inflationEl.value = data.inflation;
      if (data.fee != null) feeRateEl.value = data.fee;
      if (data.growth != null) investGrowthEl.value = data.growth;
      if (data.target != null) targetAmountEl.value = data.target;
      if (data.delta != null) scenarioDeltaEl.value = data.delta;
      if (data.scen) state.showScenario = true;
      if (data.freq && ['monthly', 'yearly', 'once'].indexOf(data.freq) >= 0) state.freq = data.freq;
      if (data.scale === 'log') state.chartScale = 'log';
    } catch (e) { /* ignore */ }
  }

  /* ============ URL 分享 ============ */
  function updateURL() {
    try {
      var sp = new URLSearchParams();
      sp.set('p0', initialEl.value);
      sp.set('reg', regularEl.value);
      sp.set('rate', annualEl.value);
      sp.set('yrs', yearsEl.value);
      sp.set('inf', inflationEl.value);
      if (feeRateEl.value && feeRateEl.value !== '0') sp.set('fee', feeRateEl.value);
      if (investGrowthEl.value && investGrowthEl.value !== '0') sp.set('grow', investGrowthEl.value);
      if (targetAmountEl.value && targetAmountEl.value !== '0') sp.set('tgt', targetAmountEl.value);
      if (state.showScenario) {
        sp.set('scen', '1');
        sp.set('delta', scenarioDeltaEl.value);
      }
      if (state.freq !== 'monthly') sp.set('freq', state.freq);
      var qs = sp.toString();
      var url = location.pathname + (qs ? '?' + qs : '') + location.hash;
      history.replaceState(null, '', url);
    } catch (e) { /* ignore */ }
  }

  function clearURL() {
    try {
      history.replaceState(null, '', location.pathname + location.hash);
    } catch (e) { /* ignore */ }
  }

  function loadFromURL() {
    try {
      var sp = new URLSearchParams(location.search);
      if (!sp.has('p0') && !sp.has('rate')) return false;
      if (sp.has('p0')) initialEl.value = sp.get('p0');
      if (sp.has('reg')) regularEl.value = sp.get('reg');
      if (sp.has('rate')) annualEl.value = sp.get('rate');
      if (sp.has('yrs')) { yearsEl.value = sp.get('yrs'); yearsRange.value = sp.get('yrs'); }
      if (sp.has('inf')) inflationEl.value = sp.get('inf');
      if (sp.has('fee')) feeRateEl.value = sp.get('fee');
      if (sp.has('grow')) investGrowthEl.value = sp.get('grow');
      if (sp.has('tgt')) targetAmountEl.value = sp.get('tgt');
      if (sp.has('delta')) scenarioDeltaEl.value = sp.get('delta');
      if (sp.get('scen') === '1') state.showScenario = true;
      var f = sp.get('freq');
      if (f && ['monthly', 'yearly', 'once'].indexOf(f) >= 0) state.freq = f;
      return true;
    } catch (e) { return false; }
  }

  /* ============ 初始化 ============ */
  var fromURL = loadFromURL();
  if (!fromURL) loadFromStorage();
  applyFreqUI();
  applyScenarioUI();
  applyScaleUI();
  calculate();
})();