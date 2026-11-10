/* js/percentage.js */
(function () {
  'use strict';

  /* ============ DOM ============ */
  var modeTabs       = document.getElementById('modeTabs');
  var forms          = Array.prototype.slice.call(document.querySelectorAll('.mode-form'));

  // 模式 1
  var ofPercentEl    = document.getElementById('ofPercent');
  var ofValueEl      = document.getElementById('ofValue');
  var ofAnswerEl     = document.getElementById('ofAnswer');

  // 模式 2
  var isValueEl      = document.getElementById('isValue');
  var isTotalEl      = document.getElementById('isTotal');
  var isAnswerEl     = document.getElementById('isAnswer');

  // 模式 3
  var changeDirSeg   = document.getElementById('changeDirSeg');
  var chgBaseEl      = document.getElementById('chgBase');
  var chgPercentEl   = document.getElementById('chgPercent');
  var chgAnswerEl    = document.getElementById('chgAnswer');
  var chgDirText     = document.getElementById('chgDirText');
  var chgFormula     = document.getElementById('chgFormula');

  // 模式 4
  var diffFromEl     = document.getElementById('diffFrom');
  var diffToEl       = document.getElementById('diffTo');
  var diffAnswerEl   = document.getElementById('diffAnswer');

  // 模式 5
  var discModeSeg    = document.getElementById('discModeSeg');
  var discPriceEl    = document.getElementById('discPrice');
  var discValueEl    = document.getElementById('discValue');
  var discUnitEl     = document.getElementById('discUnit');
  var discResult     = document.getElementById('discResult');
  var discFinalEl    = document.getElementById('discFinal');
  var discSaveEl     = document.getElementById('discSave');
  var discPercentEl  = document.getElementById('discPercent');

  // 模式 6
  var tipBillEl      = document.getElementById('tipBill');
  var tipPercentEl   = document.getElementById('tipPercent');
  var tipPeopleEl    = document.getElementById('tipPeople');
  var tipResult      = document.getElementById('tipResult');
  var tipAmountEl    = document.getElementById('tipAmount');
  var tipTotalEl     = document.getElementById('tipTotal');
  var tipPerPersonEl = document.getElementById('tipPerPerson');

  /* ============ 状态 ============ */
  var state = {
    mode: 'of',
    changeDir: 'add',   // add | sub
    discMode: 'zhe'     // zhe | percent
  };

  /* ============ 数字工具 ============ */
  function num(el) {
    var v = parseFloat(el.value);
    return isNaN(v) ? null : v;
  }

  function isEmpty(el) {
    return el.value.trim() === '';
  }

  function formatNumber(n, maxDigits) {
    if (!isFinite(n)) return '—';
    if (n === 0) return '0';

    // 保留最多 4 位小数，去掉末尾 0
    var abs = Math.abs(n);
    var digits = maxDigits != null ? maxDigits : 4;
    if (abs < 1) digits = 6; // 小数时多保留几位
    var rounded = Number(n.toFixed(digits));

    // 千分位
    var parts = String(rounded).split('.');
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

  /* ============ 模式 1：Y 的 X% 是多少 ============ */
  function calcOf() {
    var p = num(ofPercentEl);
    var v = num(ofValueEl);
    if (p === null || v === null) {
      setAnswer(ofAnswerEl, null);
      return;
    }
    var result = v * p / 100;
    setAnswer(ofAnswerEl, result);
  }

  /* ============ 模式 2：X 是 Y 的百分之几 ============ */
  function calcIs() {
    var x = num(isValueEl);
    var y = num(isTotalEl);
    if (x === null || y === null || y === 0) {
      setAnswer(isAnswerEl, null);
      return;
    }
    var result = x / y * 100;
    setAnswer(isAnswerEl, result, { suffix: '' });
  }

  /* ============ 模式 3：X 增加/减少 Y% 后 ============ */
  function calcChange() {
    var x = num(chgBaseEl);
    var y = num(chgPercentEl);
    if (x === null || y === null) {
      setAnswer(chgAnswerEl, null);
      return;
    }
    var result = state.changeDir === 'add'
      ? x * (1 + y / 100)
      : x * (1 - y / 100);
    setAnswer(chgAnswerEl, result);
  }

  /* ============ 模式 4：X 到 Y 变化率 ============ */
  function calcDiff() {
    var x = num(diffFromEl);
    var y = num(diffToEl);
    if (x === null || y === null || x === 0) {
      setAnswer(diffAnswerEl, null);
      return;
    }
    var pct = (y - x) / x * 100;
    var prefix = pct > 0 ? '+' : '';
    setAnswer(diffAnswerEl, pct, { prefix: prefix, suffix: '', allowNegative: true });
    // 负数时也标红
    if (pct < 0) diffAnswerEl.classList.add('negative');
  }

  /* ============ 模式 5：折扣 ============ */
  function calcDiscount() {
    var price = num(discPriceEl);
    var value = num(discValueEl);
    if (price === null || value === null || price < 0 || value < 0) {
      discResult.hidden = true;
      return;
    }

    var discountRate;
    if (state.discMode === 'zhe') {
      // 8 折 = 80%，即 0.8
      if (value > 10) {
        // 允许 "8.5 折"，但超过 10 视为异常
        discResult.hidden = true;
        return;
      }
      discountRate = value / 10;
    } else {
      // 百分比：80 表示 80%
      if (value > 100) {
        discResult.hidden = true;
        return;
      }
      discountRate = value / 100;
    }

    var finalPrice = price * discountRate;
    var saved = price - finalPrice;
    var percentOff = (1 - discountRate) * 100;

    discResult.hidden = false;
    discFinalEl.textContent = '¥ ' + formatMoney(finalPrice);
    discSaveEl.textContent = '¥ ' + formatMoney(saved);
    discSaveEl.classList.add('save');
    discPercentEl.textContent = formatNumber(percentOff, 1) + '% OFF';

    if (state.discMode === 'zhe') {
      discPercentEl.textContent = (value) + ' 折 · ' + formatNumber(percentOff, 1) + '% OFF';
    }
  }

  /* ============ 模式 6：小费 ============ */
  function calcTip() {
    var bill = num(tipBillEl);
    var pct = num(tipPercentEl);
    var people = parseFloat(tipPeopleEl.value);

    if (bill === null || pct === null) {
      tipResult.hidden = true;
      return;
    }
    if (isNaN(people) || people < 1) people = 1;

    var tip = bill * pct / 100;
    var total = bill + tip;
    var perPerson = total / people;

    tipResult.hidden = false;
    tipAmountEl.textContent = '¥ ' + formatMoney(tip);
    tipTotalEl.textContent = '¥ ' + formatMoney(total);
    tipPerPersonEl.textContent = '¥ ' + formatMoney(perPerson);
  }

  /* ============ 分发计算 ============ */
  function recalc() {
    if (state.mode === 'of') calcOf();
    else if (state.mode === 'is') calcIs();
    else if (state.mode === 'change') calcChange();
    else if (state.mode === 'diff') calcDiff();
    else if (state.mode === 'discount') calcDiscount();
    else if (state.mode === 'tip') calcTip();
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
  });

  /* ============ 增减方向切换 ============ */
  changeDirSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(changeDirSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.changeDir = btn.dataset.value;
    chgDirText.textContent = state.changeDir === 'add' ? '增加' : '减少';
    chgFormula.textContent = state.changeDir === 'add'
      ? '公式：结果 = 原值 × (1 + Y ÷ 100)'
      : '公式：结果 = 原值 × (1 − Y ÷ 100)';
    recalc();
  });

  /* ============ 折扣模式切换 ============ */
  discModeSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(discModeSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.discMode = btn.dataset.value;
    if (state.discMode === 'zhe') {
      discUnitEl.textContent = '折';
      discValueEl.placeholder = '8';
    } else {
      discUnitEl.textContent = '%';
      discValueEl.placeholder = '80';
    }
    recalc();
  });

  /* ============ 折扣快捷 Chip ============ */
  document.querySelectorAll('[data-disc]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var v = parseFloat(chip.dataset.disc);
      state.discMode = 'zhe';
      Array.prototype.forEach.call(discModeSeg.children, function (b) {
        b.classList.toggle('active', b.dataset.value === 'zhe');
      });
      discUnitEl.textContent = '折';
      discValueEl.value = v;
      recalc();
    });
  });

  /* ============ 小费快捷 Chip ============ */
  document.querySelectorAll('[data-tip]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      tipPercentEl.value = parseFloat(chip.dataset.tip);
      recalc();
    });
  });

  /* ============ 输入事件监听 ============ */
  var allInputs = [
    ofPercentEl, ofValueEl,
    isValueEl, isTotalEl,
    chgBaseEl, chgPercentEl,
    diffFromEl, diffToEl,
    discPriceEl, discValueEl,
    tipBillEl, tipPercentEl, tipPeopleEl
  ];

  allInputs.forEach(function (el) {
    el.addEventListener('input', recalc);
    el.addEventListener('keydown', function (e) {
      // 按回车跳到下一个输入框
      if (e.key === 'Enter') {
        e.preventDefault();
        var idx = allInputs.indexOf(el);
        for (var i = 1; i <= allInputs.length; i++) {
          var next = allInputs[(idx + i) % allInputs.length];
          if (next.offsetParent !== null) {
            next.focus();
            next.select();
            break;
          }
        }
      }
    });
  });

  /* ============ 初始化 ============ */
  function init() {
    // 默认演示数据
    ofPercentEl.value = '15';
    ofValueEl.value = '200';

    isValueEl.value = '30';
    isTotalEl.value = '200';

    chgBaseEl.value = '200';
    chgPercentEl.value = '15';

    diffFromEl.value = '200';
    diffToEl.value = '230';

    discPriceEl.value = '200';
    discValueEl.value = '8';

    tipBillEl.value = '200';
    tipPercentEl.value = '15';
    tipPeopleEl.value = '1';

    setMode('of');
  }

  init();
})();