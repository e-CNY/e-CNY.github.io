/* js/percentage.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.percentage.v2';
  var HISTORY_KEY = 'tool.percentage.history.v2';
  var MAX_HISTORY = 30;

  /* ============ DOM：主框架 ============ */
  var modeTabs        = document.getElementById('modeTabs');
  var forms           = Array.prototype.slice.call(document.querySelectorAll('.mode-form'));

  var exampleBtn      = document.getElementById('exampleBtn');
  var clearBtn        = document.getElementById('clearBtn');
  var copyBtn         = document.getElementById('copyBtn');
  var saveBtn         = document.getElementById('saveBtn');
  var historyBtn      = document.getElementById('historyBtn');
  var formatBtn       = document.getElementById('formatBtn');
  var historyCountEl  = document.getElementById('historyCount');

  var historyDrawer   = document.getElementById('historyDrawer');
  var historyBackdrop = document.getElementById('historyBackdrop');
  var historyListEl   = document.getElementById('historyList');
  var historyCloseEl  = document.getElementById('historyClose');
  var historyClearEl  = document.getElementById('historyClear');

  var toastEl         = document.getElementById('toast');

  /* ============ DOM：模式 1~6 ============ */
  var ofPercentEl    = document.getElementById('ofPercent');
  var ofValueEl      = document.getElementById('ofValue');
  var ofAnswerEl     = document.getElementById('ofAnswer');

  var isValueEl      = document.getElementById('isValue');
  var isTotalEl      = document.getElementById('isTotal');
  var isAnswerEl     = document.getElementById('isAnswer');

  var changeDirSeg   = document.getElementById('changeDirSeg');
  var chgBaseEl      = document.getElementById('chgBase');
  var chgPercentEl   = document.getElementById('chgPercent');
  var chgAnswerEl    = document.getElementById('chgAnswer');
  var chgDirText     = document.getElementById('chgDirText');
  var chgFormula     = document.getElementById('chgFormula');

  var diffFromEl     = document.getElementById('diffFrom');
  var diffToEl       = document.getElementById('diffTo');
  var diffAnswerEl   = document.getElementById('diffAnswer');

  var discModeSeg    = document.getElementById('discModeSeg');
  var discPriceEl    = document.getElementById('discPrice');
  var discValueEl    = document.getElementById('discValue');
  var discUnitEl     = document.getElementById('discUnit');
  var discResult     = document.getElementById('discResult');
  var discFinalEl    = document.getElementById('discFinal');
  var discSaveEl     = document.getElementById('discSave');
  var discPercentEl  = document.getElementById('discPercent');

  var tipBillEl      = document.getElementById('tipBill');
  var tipPercentEl   = document.getElementById('tipPercent');
  var tipPeopleEl    = document.getElementById('tipPeople');
  var tipResult      = document.getElementById('tipResult');
  var tipAmountEl    = document.getElementById('tipAmount');
  var tipTotalEl     = document.getElementById('tipTotal');
  var tipPerPersonEl = document.getElementById('tipPerPerson');

  /* ============ DOM：模式 7~12 ============ */
  var orgModeSeg     = document.getElementById('orgModeSeg');
  var orgPriceEl     = document.getElementById('orgPrice');
  var orgDiscountEl  = document.getElementById('orgDiscount');
  var orgUnitEl      = document.getElementById('orgUnit');
  var orgAnswerEl    = document.getElementById('orgAnswer');
  var orgResult      = document.getElementById('orgResult');
  var orgFinalEl     = document.getElementById('orgFinal');
  var orgSaveEl      = document.getElementById('orgSave');
  var orgPctEl       = document.getElementById('orgPct');

  var cagrStartEl    = document.getElementById('cagrStart');
  var cagrEndEl      = document.getElementById('cagrEnd');
  var cagrYearsEl    = document.getElementById('cagrYears');
  var cagrAnswerEl   = document.getElementById('cagrAnswer');
  var cagrResult     = document.getElementById('cagrResult');
  var cagrTotalEl    = document.getElementById('cagrTotal');
  var cagrMulEl      = document.getElementById('cagrMul');

  var ptDirSeg       = document.getElementById('ptDirSeg');
  var ptBaseEl       = document.getElementById('ptBase');
  var ptDeltaEl      = document.getElementById('ptDelta');
  var ptDirText      = document.getElementById('ptDirText');
  var ptAnswerEl     = document.getElementById('ptAnswer');
  var ptResult       = document.getElementById('ptResult');
  var ptRelEl        = document.getElementById('ptRel');

  var ratioAEl       = document.getElementById('ratioA');
  var ratioBEl       = document.getElementById('ratioB');
  var ratioCEl       = document.getElementById('ratioC');
  var ratioAnswerEl  = document.getElementById('ratioAnswer');
  var ratioResult    = document.getElementById('ratioResult');
  var ratioValABEl   = document.getElementById('ratioValAB');
  var ratioValCDEl   = document.getElementById('ratioValCD');

  var errActualEl    = document.getElementById('errActual');
  var errExpectedEl  = document.getElementById('errExpected');
  var errAnswerEl    = document.getElementById('errAnswer');
  var errResult      = document.getElementById('errResult');
  var errAbsEl       = document.getElementById('errAbs');
  var errAbsPctEl    = document.getElementById('errAbsPct');

  var splitTotalEl   = document.getElementById('splitTotal');
  var splitAEl       = document.getElementById('splitA');
  var splitBEl       = document.getElementById('splitB');
  var splitResult    = document.getElementById('splitResult');
  var splitAPartEl   = document.getElementById('splitAPart');
  var splitAPctEl    = document.getElementById('splitAPct');
  var splitBPartEl   = document.getElementById('splitBPart');
  var splitBPctEl    = document.getElementById('splitBPct');

  /* ============ 状态 ============ */
  var state = {
    mode: 'of',
    changeDir: 'add',
    discMode: 'zhe',
    orgMode: 'zhe',
    ptDir: 'add',
    format: 'thousands'   // thousands | raw
  };

  var MODE_LABELS = {
    of: 'Y 的 X%',
    is: 'X 是 Y 的百分比',
    change: '增减百分比',
    diff: '变化率',
    discount: '折扣',
    tip: '小费',
    original: '反推原价',
    cagr: 'CAGR 复合增长率',
    points: '百分点加减',
    ratio: '比例换算',
    error: '误差百分比',
    split: '按比例分账'
  };

  var EXAMPLES = {
    of:        { ofPercent: '15', ofValue: '200' },
    is:        { isValue: '30', isTotal: '200' },
    change:    { chgBase: '200', chgPercent: '15' },
    diff:      { diffFrom: '200', diffTo: '230' },
    discount:  { discPrice: '200', discValue: '8' },
    tip:       { tipBill: '200', tipPercent: '15', tipPeople: '1' },
    original:  { orgPrice: '160', orgDiscount: '8' },
    cagr:      { cagrStart: '100', cagrEnd: '200', cagrYears: '5' },
    points:    { ptBase: '20', ptDelta: '5' },
    ratio:     { ratioA: '3', ratioB: '4', ratioC: '6' },
    error:     { errActual: '105', errExpected: '100' },
    split:     { splitTotal: '1000', splitA: '3', splitB: '2' }
  };

  var history = [];

  /* ============ 数字工具 ============ */
  function num(el) {
    if (!el) return null;
    var v = parseFloat(el.value);
    return isNaN(v) ? null : v;
  }

  function formatNumber(n, maxDigits) {
    if (!isFinite(n)) return '—';
    if (n === 0) return '0';

    var abs = Math.abs(n);
    var digits = maxDigits != null ? maxDigits : 4;
    if (abs < 1 && abs > 0) digits = 6;

    var rounded = Number(n.toFixed(digits));
    var s = String(rounded);

    if (state.format === 'raw') return s;
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function formatMoney(n) {
    if (!isFinite(n)) return '—';
    return formatNumber(n, 2);
  }

  function setAnswer(el, value, opts) {
    opts = opts || {};
    if (value === null || value === undefined || !isFinite(value)) {
      el.textContent = '—';
      el.classList.add('empty');
      el.classList.remove('negative');
      return;
    }
    el.classList.remove('empty');
    el.textContent = (opts.prefix || '') + formatNumber(value, opts.digits) + (opts.suffix || '');
    if (value < 0 && !opts.allowNegative) {
      el.classList.add('negative');
    } else {
      el.classList.remove('negative');
    }
  }

  /* ============ 各模式计算 ============ */
  function calcOf() {
    var p = num(ofPercentEl);
    var v = num(ofValueEl);
    if (p === null || v === null) { setAnswer(ofAnswerEl, null); return; }
    setAnswer(ofAnswerEl, v * p / 100);
  }

  function calcIs() {
    var x = num(isValueEl);
    var y = num(isTotalEl);
    if (x === null || y === null || y === 0) { setAnswer(isAnswerEl, null); return; }
    setAnswer(isAnswerEl, x / y * 100);
  }

  function calcChange() {
    var x = num(chgBaseEl);
    var y = num(chgPercentEl);
    if (x === null || y === null) { setAnswer(chgAnswerEl, null); return; }
    var r = state.changeDir === 'add' ? x * (1 + y / 100) : x * (1 - y / 100);
    setAnswer(chgAnswerEl, r);
  }

  function calcDiff() {
    var x = num(diffFromEl);
    var y = num(diffToEl);
    if (x === null || y === null || x === 0) { setAnswer(diffAnswerEl, null); return; }
    var pct = (y - x) / x * 100;
    setAnswer(diffAnswerEl, pct, {
      prefix: pct > 0 ? '+' : '',
      suffix: '',
      allowNegative: true
    });
    if (pct < 0) diffAnswerEl.classList.add('negative');
  }

  function calcDiscount() {
    var price = num(discPriceEl);
    var value = num(discValueEl);
    if (price === null || value === null || price < 0 || value <= 0) {
      discResult.hidden = true;
      return;
    }
    var rate;
    if (state.discMode === 'zhe') {
      if (value > 10) { discResult.hidden = true; return; }
      rate = value / 10;
    } else {
      if (value > 100) { discResult.hidden = true; return; }
      rate = value / 100;
    }
    var finalPrice = price * rate;
    var saved = price - finalPrice;
    var pctOff = (1 - rate) * 100;

    discResult.hidden = false;
    discFinalEl.textContent = '¥ ' + formatMoney(finalPrice);
    discSaveEl.textContent = '¥ ' + formatMoney(saved);
    discSaveEl.classList.add('save');
    discPercentEl.textContent = (state.discMode === 'zhe' ? value + ' 折 · ' : '') +
      formatNumber(pctOff, 1) + '% OFF';
  }

  function calcTip() {
    var bill = num(tipBillEl);
    var pct = num(tipPercentEl);
    var people = parseFloat(tipPeopleEl.value);
    if (bill === null || pct === null) { tipResult.hidden = true; return; }
    if (isNaN(people) || people < 1) people = 1;

    var tip = bill * pct / 100;
    var total = bill + tip;
    var per = total / people;

    tipResult.hidden = false;
    tipAmountEl.textContent = '¥ ' + formatMoney(tip);
    tipTotalEl.textContent = '¥ ' + formatMoney(total);
    tipPerPersonEl.textContent = '¥ ' + formatMoney(per);
  }

  function calcOriginal() {
    var price = num(orgPriceEl);
    var value = num(orgDiscountEl);
    if (price === null || value === null || price < 0 || value <= 0) {
      setAnswer(orgAnswerEl, null);
      orgResult.hidden = true;
      return;
    }
    var rate;
    if (state.orgMode === 'zhe') {
      if (value > 10) { setAnswer(orgAnswerEl, null); orgResult.hidden = true; return; }
      rate = value / 10;
    } else {
      if (value > 100) { setAnswer(orgAnswerEl, null); orgResult.hidden = true; return; }
      rate = value / 100;
    }
    if (rate === 0) { setAnswer(orgAnswerEl, null); orgResult.hidden = true; return; }

    var original = price / rate;
    var saved = original - price;
    var pctOff = (1 - rate) * 100;

    setAnswer(orgAnswerEl, original);
    orgResult.hidden = false;
    orgFinalEl.textContent = '¥ ' + formatMoney(original);
    orgSaveEl.textContent = '¥ ' + formatMoney(saved);
    orgPctEl.textContent = (state.orgMode === 'zhe' ? value + ' 折 · ' : '') +
      formatNumber(pctOff, 1) + '% OFF';
  }

  function calcCAGR() {
    var start = num(cagrStartEl);
    var end = num(cagrEndEl);
    var yrs = num(cagrYearsEl);
    if (start === null || end === null || yrs === null ||
        start <= 0 || end < 0 || yrs <= 0) {
      setAnswer(cagrAnswerEl, null);
      cagrResult.hidden = true;
      return;
    }
    var cagr = Math.pow(end / start, 1 / yrs) - 1;
    var totalPct = (end / start - 1) * 100;
    var mult = end / start;

    setAnswer(cagrAnswerEl, cagr * 100, { suffix: '', allowNegative: true });
    cagrResult.hidden = false;
    cagrTotalEl.textContent = (totalPct >= 0 ? '+' : '') + formatNumber(totalPct, 2) + '%';
    cagrMulEl.textContent = formatNumber(mult, 4) + '×';
  }

  function calcPoints() {
    var base = num(ptBaseEl);
    var delta = num(ptDeltaEl);
    if (base === null || delta === null) {
      setAnswer(ptAnswerEl, null);
      ptResult.hidden = true;
      return;
    }
    var result = state.ptDir === 'add' ? base + delta : base - delta;
    setAnswer(ptAnswerEl, result, { suffix: '', allowNegative: true });
    ptResult.hidden = false;
    var rel = base !== 0 ? (result - base) / Math.abs(base) * 100 : 0;
    ptRelEl.textContent = (rel >= 0 ? '+' : '') + formatNumber(rel, 2) + '%';
  }

  function calcRatio() {
    var a = num(ratioAEl);
    var b = num(ratioBEl);
    var c = num(ratioCEl);
    if (a === null || b === null || c === null || a === 0) {
      setAnswer(ratioAnswerEl, null);
      ratioResult.hidden = true;
      return;
    }
    var d = b * c / a;
    setAnswer(ratioAnswerEl, d, { allowNegative: true });
    ratioResult.hidden = false;
    ratioValABEl.textContent = formatNumber(a) + ' : ' + formatNumber(b);
    ratioValCDEl.textContent = formatNumber(c) + ' : ' + formatNumber(d);
  }

  function calcError() {
    var actual = num(errActualEl);
    var expected = num(errExpectedEl);
    if (actual === null || expected === null || expected === 0) {
      setAnswer(errAnswerEl, null);
      errResult.hidden = true;
      return;
    }
    var pct = (actual - expected) / expected * 100;
    var absErr = actual - expected;
    var absPct = Math.abs(pct);

    setAnswer(errAnswerEl, pct, {
      prefix: pct > 0 ? '+' : '',
      suffix: '',
      allowNegative: true
    });
    if (pct < 0) errAnswerEl.classList.add('negative');

    errResult.hidden = false;
    errAbsEl.textContent = (absErr >= 0 ? '+' : '') + formatNumber(absErr, 4);
    errAbsPctEl.textContent = formatNumber(absPct, 2) + '%';
  }

  function calcSplit() {
    var total = num(splitTotalEl);
    var a = num(splitAEl);
    var b = num(splitBEl);
    if (total === null || a === null || b === null || a < 0 || b < 0 || (a + b) === 0) {
      splitResult.hidden = true;
      return;
    }
    var sum = a + b;
    var partA = total * a / sum;
    var partB = total * b / sum;
    var pctA = a / sum * 100;
    var pctB = b / sum * 100;

    splitResult.hidden = false;
    splitAPartEl.textContent = '¥ ' + formatMoney(partA);
    splitAPctEl.textContent = formatNumber(pctA, 2) + '%';
    splitBPartEl.textContent = '¥ ' + formatMoney(partB);
    splitBPctEl.textContent = formatNumber(pctB, 2) + '%';
  }

  function recalc() {
    switch (state.mode) {
      case 'of':       calcOf(); break;
      case 'is':       calcIs(); break;
      case 'change':   calcChange(); break;
      case 'diff':     calcDiff(); break;
      case 'discount': calcDiscount(); break;
      case 'tip':      calcTip(); break;
      case 'original': calcOriginal(); break;
      case 'cagr':     calcCAGR(); break;
      case 'points':   calcPoints(); break;
      case 'ratio':    calcRatio(); break;
      case 'error':    calcError(); break;
      case 'split':    calcSplit(); break;
    }
  }

  /* ============ 结果文本 / 摘要 ============ */
  function getResultText(mode) {
    switch (mode) {
      case 'of':       return ofAnswerEl.textContent;
      case 'is':       return isAnswerEl.textContent + '%';
      case 'change':   return chgAnswerEl.textContent;
      case 'diff':     return diffAnswerEl.textContent + '%';
      case 'discount': return '折后 ' + discFinalEl.textContent + '，节省 ' + discSaveEl.textContent;
      case 'tip':      return '小费 ' + tipAmountEl.textContent + '，每人 ' + tipPerPersonEl.textContent;
      case 'original': return '原价 ' + orgFinalEl.textContent;
      case 'cagr':     return 'CAGR ' + cagrAnswerEl.textContent + '%';
      case 'points':   return '结果 ' + ptAnswerEl.textContent + '%';
      case 'ratio':    return '? = ' + ratioAnswerEl.textContent;
      case 'error':    return '误差 ' + errAnswerEl.textContent + '%';
      case 'split':    return '第一份 ' + splitAPartEl.textContent + '，第二份 ' + splitBPartEl.textContent;
      default:         return '';
    }
  }

  function hasResult() {
    var txt = getResultText(state.mode);
    return txt && txt.indexOf('—') < 0;
  }

  /* ============ 模式切换 ============ */
  function setMode(mode) {
    state.mode = mode;
    Array.prototype.forEach.call(modeTabs.children, function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    forms.forEach(function (f) {
      f.hidden = f.dataset.mode !== mode;
    });
    recalc();
  }

  modeTabs.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    setMode(btn.dataset.mode);
    saveInputsSoon();
  });

  /* ============ Seg 通用处理 ============ */
  function setSegValue(segEl, value) {
    if (!segEl) return;
    Array.prototype.forEach.call(segEl.children, function (b) {
      b.classList.toggle('active', b.dataset.value === value);
    });
    segEl.dataset.value = value;
  }

  function handleSeg(segEl, onChange) {
    if (!segEl) return;
    segEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-value]');
      if (!btn) return;
      setSegValue(segEl, btn.dataset.value);
      if (onChange) onChange(btn.dataset.value);
      recalc();
      saveInputsSoon();
    });
  }

  handleSeg(changeDirSeg, function (v) {
    state.changeDir = v;
    chgDirText.textContent = v === 'add' ? '增加' : '减少';
    chgFormula.textContent = v === 'add'
      ? '公式：结果 = 原值 × (1 + Y ÷ 100)'
      : '公式：结果 = 原值 × (1 − Y ÷ 100)';
  });

  handleSeg(discModeSeg, function (v) {
    state.discMode = v;
    if (v === 'zhe') {
      discUnitEl.textContent = '折';
      discValueEl.placeholder = '8';
    } else {
      discUnitEl.textContent = '%';
      discValueEl.placeholder = '80';
    }
  });

  handleSeg(orgModeSeg, function (v) {
    state.orgMode = v;
    if (v === 'zhe') {
      orgUnitEl.textContent = '折';
      orgDiscountEl.placeholder = '8';
    } else {
      orgUnitEl.textContent = '%';
      orgDiscountEl.placeholder = '80';
    }
  });

  handleSeg(ptDirSeg, function (v) {
    state.ptDir = v;
    ptDirText.textContent = v === 'add' ? '加' : '减';
  });

  /* ============ 折扣 / 小费快捷 Chip ============ */
  document.querySelectorAll('[data-disc]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var v = parseFloat(chip.dataset.disc);
      setSegValue(discModeSeg, 'zhe');
      state.discMode = 'zhe';
      discUnitEl.textContent = '折';
      discValueEl.value = v;
      recalc();
      saveInputsSoon();
    });
  });

  document.querySelectorAll('[data-tip]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      tipPercentEl.value = parseFloat(chip.dataset.tip);
      recalc();
      saveInputsSoon();
    });
  });

  /* ============ 输入事件 / 键盘操作 ============ */
  function handleKeydown(e) {
    var el = e.currentTarget;
    if (e.key === 'Enter') {
      e.preventDefault();
      var form = el.closest('.mode-form');
      if (!form) return;
      var inputs = Array.prototype.slice.call(form.querySelectorAll('input'));
      var idx = inputs.indexOf(el);
      var next = inputs[(idx + 1) % inputs.length];
      if (next) { next.focus(); next.select(); }
    } else if (e.key === 'Escape') {
      el.value = '';
      recalc();
      saveInputsSoon();
    }
  }

  document.querySelectorAll('.mode-form input[type="number"]').forEach(function (el) {
    el.addEventListener('input', function () {
      recalc();
      saveInputsSoon();
    });
    el.addEventListener('keydown', handleKeydown);
  });

  /* ============ 点击结果复制 ============ */
  document.querySelectorAll('.inline-answer').forEach(function (el) {
    el.addEventListener('click', function () {
      var txt = el.textContent.trim();
      if (!txt || txt === '—') return;
      copyToClipboard(txt);
    });
  });

  /* ============ Toast ============ */
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 1600);
  }

  /* ============ 复制 ============ */
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ 已复制：' + truncate(text, 30));
    } catch (e) {
      showToast('❌ 复制失败');
    }
  }

  function copyToClipboard(text) {
    if (!text) { showToast('没有可复制的结果'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制：' + truncate(text, 30));
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* ============ 工具栏动作 ============ */
  exampleBtn.addEventListener('click', function () {
    var ex = EXAMPLES[state.mode];
    if (!ex) return;
    fillInputs(ex);
    recalc();
    saveInputsSoon();
    showToast('💡 已填入示例');
  });

  clearBtn.addEventListener('click', function () {
    var form = document.querySelector('.mode-form[data-mode="' + state.mode + '"]');
    if (!form) return;
    form.querySelectorAll('input').forEach(function (inp) { inp.value = ''; });
    recalc();
    saveInputsSoon();
    showToast('🧹 已清空');
  });

  copyBtn.addEventListener('click', function () {
    if (!hasResult()) { showToast('当前没有有效结果'); return; }
    copyToClipboard(getResultText(state.mode));
  });

  formatBtn.addEventListener('click', function () {
    state.format = state.format === 'thousands' ? 'raw' : 'thousands';
    updateFormatBtn();
    recalc();
    saveInputsSoon();
  });

  function updateFormatBtn() {
    formatBtn.textContent = state.format === 'thousands' ? '🔢 千分位' : '🔢 原始数字';
  }

  /* ============ 历史记录 ============ */
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) history = arr;
    } catch (e) { history = []; }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) { /* ignore */ }
  }

  function renderHistory() {
    if (history.length === 0) {
      historyListEl.innerHTML = '<p class="history-empty">暂无记录</p>';
    } else {
      historyListEl.innerHTML = history.map(function (item, idx) {
        var d = new Date(item.ts);
        var time = String(d.getHours()).padStart(2, '0') + ':' +
                   String(d.getMinutes()).padStart(2, '0');
        return '<div class="history-item" data-idx="' + idx + '">' +
          '<div class="history-meta">' +
            '<span class="history-mode">' + escHtml(MODE_LABELS[item.mode] || item.mode) + '</span>' +
            '<span class="history-time">' + time + '</span>' +
          '</div>' +
          '<div class="history-result">' + escHtml(item.summary) + '</div>' +
          '<button class="history-del" data-del="' + idx + '" type="button" title="删除">✕</button>' +
        '</div>';
      }).join('');
    }
    historyCountEl.textContent = '(' + history.length + ')';
  }

  saveBtn.addEventListener('click', function () {
    if (!hasResult()) { showToast('当前没有有效结果'); return; }
    var rec = {
      ts: Date.now(),
      mode: state.mode,
      summary: MODE_LABELS[state.mode] + ' · ' + getResultText(state.mode),
      data: captureModeData(state.mode),
      _state: {
        changeDir: state.changeDir,
        discMode: state.discMode,
        orgMode: state.orgMode,
        ptDir: state.ptDir
      }
    };
    history.unshift(rec);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();
    renderHistory();
    showToast('💾 已存入历史');
  });

  historyBtn.addEventListener('click', function () {
    historyBackdrop.hidden = false;
    historyDrawer.classList.add('open');
    renderHistory();
  });

  function closeHistory() {
    historyBackdrop.hidden = true;
    historyDrawer.classList.remove('open');
  }
  historyCloseEl.addEventListener('click', closeHistory);
  historyBackdrop.addEventListener('click', closeHistory);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && historyDrawer.classList.contains('open')) {
      closeHistory();
    }
  });

  historyClearEl.addEventListener('click', function () {
    if (!confirm('清空全部历史记录？')) return;
    history = [];
    saveHistory();
    renderHistory();
    showToast('🗑 历史已清空');
  });

  historyListEl.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      var di = parseInt(delBtn.dataset.del, 10);
      if (!isNaN(di)) {
        history.splice(di, 1);
        saveHistory();
        renderHistory();
      }
      e.stopPropagation();
      return;
    }
    var item = e.target.closest('.history-item');
    if (!item) return;
    var idx = parseInt(item.dataset.idx, 10);
    var rec = history[idx];
    if (!rec) return;
    restoreModeData(rec.mode, rec.data);
    if (rec._state) {
      state.changeDir = rec._state.changeDir || 'add';
      state.discMode = rec._state.discMode || 'zhe';
      state.orgMode = rec._state.orgMode || 'zhe';
      state.ptDir = rec._state.ptDir || 'add';
      syncSegFromState();
    }
    setMode(rec.mode);
    closeHistory();
    showToast('↩️ 已恢复记录');
  });

  /* ============ Seg / State 同步 ============ */
  function syncSegFromState() {
    setSegValue(changeDirSeg, state.changeDir);
    setSegValue(discModeSeg, state.discMode);
    setSegValue(orgModeSeg, state.orgMode);
    setSegValue(ptDirSeg, state.ptDir);

    chgDirText.textContent = state.changeDir === 'add' ? '增加' : '减少';
    chgFormula.textContent = state.changeDir === 'add'
      ? '公式：结果 = 原值 × (1 + Y ÷ 100)'
      : '公式：结果 = 原值 × (1 − Y ÷ 100)';

    discUnitEl.textContent = state.discMode === 'zhe' ? '折' : '%';
    discValueEl.placeholder = state.discMode === 'zhe' ? '8' : '80';

    orgUnitEl.textContent = state.orgMode === 'zhe' ? '折' : '%';
    orgDiscountEl.placeholder = state.orgMode === 'zhe' ? '8' : '80';

    ptDirText.textContent = state.ptDir === 'add' ? '加' : '减';
  }

  /* ============ 持久化 ============ */
  var saveTimer = null;
  function saveInputsSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveInputs, 300);
  }

  function captureModeData(mode) {
    var form = document.querySelector('.mode-form[data-mode="' + mode + '"]');
    if (!form) return { inputs: {}, segs: {} };
    var inputs = {}, segs = {};
    form.querySelectorAll('input').forEach(function (inp) {
      if (inp.id) inputs[inp.id] = inp.value;
    });
    form.querySelectorAll('.seg').forEach(function (seg) {
      if (seg.id) segs[seg.id] = seg.dataset.value;
    });
    return { inputs: inputs, segs: segs };
  }

  function restoreModeData(mode, data) {
    if (!data) return;
    if (data.inputs) fillInputs(data.inputs);
    if (data.segs) {
      for (var id in data.segs) {
        var seg = document.getElementById(id);
        if (seg) setSegValue(seg, data.segs[id]);
      }
    }
  }

  function saveInputs() {
    try {
      var out = {};
      forms.forEach(function (form) {
        out[form.dataset.mode] = captureModeData(form.dataset.mode);
      });
      out._state = {
        mode: state.mode,
        changeDir: state.changeDir,
        discMode: state.discMode,
        orgMode: state.orgMode,
        ptDir: state.ptDir,
        format: state.format
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch (e) { /* ignore */ }
  }

  function loadInputs() {
    var anyLoaded = false;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        forms.forEach(function (form) {
          var mode = form.dataset.mode;
          if (data[mode]) { restoreModeData(mode, data[mode]); anyLoaded = true; }
        });
        if (data._state) {
          if (data._state.mode &&
              Array.prototype.some.call(modeTabs.children, function (b) { return b.dataset.mode === data._state.mode; })) {
            state.mode = data._state.mode;
          }
          if (data._state.changeDir) state.changeDir = data._state.changeDir;
          if (data._state.discMode) state.discMode = data._state.discMode;
          if (data._state.orgMode) state.orgMode = data._state.orgMode;
          if (data._state.ptDir) state.ptDir = data._state.ptDir;
          if (data._state.format) state.format = data._state.format;
        }
      }
    } catch (e) { /* ignore */ }

    if (!anyLoaded) {
      // 首次使用：载入示例数据
      for (var mode in EXAMPLES) {
        fillInputs(EXAMPLES[mode]);
      }
    }
  }

  function fillInputs(map) {
    for (var id in map) {
      var el = document.getElementById(id);
      if (el) el.value = map[id];
    }
  }

  /* ============ 初始化 ============ */
  loadHistory();
  loadInputs();
  syncSegFromState();
  updateFormatBtn();
  renderHistory();

  // 应用模式
  Array.prototype.forEach.call(modeTabs.children, function (b) {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
  forms.forEach(function (f) {
    f.hidden = f.dataset.mode !== state.mode;
  });

  recalc();
})();