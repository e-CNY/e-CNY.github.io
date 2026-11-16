/* js/calc-toolbox.js */
(function () {
  'use strict';

  /* ================= 工具函数 ================= */
  function $(id) { return document.getElementById(id); }
  function num(el) {
    var v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }
  function fmt(n, digits) {
    if (!isFinite(n)) return '—';
    if (digits === undefined) digits = 2;
    var p = Math.pow(10, digits);
    var r = Math.round(n * p) / p;
    return r.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = $('ct-toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  /* ================= 复制 ================= */
  function copyText(text) {
    if (!text) { showToast('没有可复制内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制到剪贴板');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
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
      showToast('✅ 已复制到剪贴板');
    } catch (e) { showToast('❌ 复制失败'); }
  }

  /* ================= 安全求值 ================= */
  function safeEval(expr) {
    var replaced = String(expr)
      .replace(/π/g, 'Math.PI')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\bsqrt\b/gi, 'Math.sqrt')
      .replace(/\babs\b/gi, 'Math.abs')
      .replace(/\bsin\b/gi, 'Math.sin')
      .replace(/\bcos\b/gi, 'Math.cos')
      .replace(/\btan\b/gi, 'Math.tan')
      .replace(/\blog\b/gi, 'Math.log10')
      .replace(/\bln\b/gi, 'Math.log')
      .replace(/\bexp\b/gi, 'Math.exp')
      .replace(/\bfloor\b/gi, 'Math.floor')
      .replace(/\bceil\b/gi, 'Math.ceil')
      .replace(/\bround\b/gi, 'Math.round')
      .replace(/\bpow\b/gi, 'Math.pow')
      .replace(/\^/g, '**');

    var stripped = replaced.replace(/Math\.\w+/g, '').replace(/\bPI\b|\bE\b/g, '');
    if (!/^[\d\s+\-*/().,]*$/.test(stripped)) {
      throw new Error('表达式包含非法字符');
    }
    // eslint-disable-next-line no-new-func
    var fn = Function('"use strict";return (' + replaced + ')');
    return fn();
  }

  /* ================= 各工具处理器 ================= */

  /* 1. 科学计算器 */
  function calcExpr() {
    var expr = $('calc-expr').value.trim();
    var resEl = $('calc-res');
    if (!expr) { resEl.textContent = '= 0'; return; }
    try {
      var v = safeEval(expr);
      if (typeof v !== 'number' || !isFinite(v)) {
        resEl.textContent = '= ' + String(v);
      } else {
        resEl.textContent = '= ' + fmt(v, 6);
      }
    } catch (e) {
      resEl.textContent = '❌ ' + e.message;
    }
  }

  /* 2. 统计 */
  function calcStat() {
    var str = $('stat-input').value;
    var arr = str.split(/[\s,，]+/).filter(Boolean).map(Number);
    var resEl = $('stat-res');
    if (arr.length === 0 || arr.some(isNaN)) {
      resEl.innerHTML = '<span style="color:#a8452a;">请输入有效数字</span>';
      return;
    }

    var n = arr.length;
    var sum = arr.reduce(function (a, b) { return a + b; }, 0);
    var mean = sum / n;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
    var min = sorted[0], max = sorted[n - 1];
    var range = max - min;

    var variance = n > 1
      ? arr.reduce(function (a, x) { return a + (x - mean) * (x - mean); }, 0) / (n - 1)
      : 0;
    var stddev = Math.sqrt(variance);

    var freq = {};
    arr.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; });
    var maxFreq = 0;
    for (var k in freq) if (freq[k] > maxFreq) maxFreq = freq[k];
    var modes = [];
    if (maxFreq > 1) {
      for (var k2 in freq) if (freq[k2] === maxFreq) modes.push(k2);
    }
    var modeStr = modes.length ? modes.join(', ') : '无';

    function med(list) {
      var m = list.length;
      if (m === 0) return 0;
      var mid = Math.floor(m / 2);
      return m % 2 === 0 ? (list[mid - 1] + list[mid]) / 2 : list[mid];
    }
    var midIdx = Math.floor(n / 2);
    var lowerHalf = n % 2 === 0 ? sorted.slice(0, midIdx) : sorted.slice(0, midIdx);
    var upperHalf = n % 2 === 0 ? sorted.slice(midIdx) : sorted.slice(midIdx + 1);
    var q1 = med(lowerHalf), q3 = med(upperHalf);

    resEl.innerHTML =
      '数量: <b>' + n + '</b> · 总和: <b>' + fmt(sum, 4) + '</b><br>' +
      '均值: <b>' + fmt(mean, 4) + '</b> · 中位数: <b>' + fmt(median, 4) + '</b><br>' +
      '众数: <b>' + escHtml(modeStr) + '</b><br>' +
      '最小: ' + fmt(min, 4) + ' · 最大: ' + fmt(max, 4) + ' · 极差: ' + fmt(range, 4) + '<br>' +
      '样本标准差: <b>' + fmt(stddev, 4) + '</b> · 方差: ' + fmt(variance, 4) + '<br>' +
      'Q1: ' + fmt(q1, 4) + ' · Q3: ' + fmt(q3, 4) + ' · IQR: ' + fmt(q3 - q1, 4);
  }

  /* 3. 进制转换 */
  function calcBase() {
    var raw = $('base-input').value.trim();
    var src = parseInt($('base-src').value, 10);
    var resEl = $('base-res');
    if (!raw) { resEl.innerHTML = '请输入数字'; return; }
    var dec = parseInt(raw, src);
    if (isNaN(dec) || dec < 0) {
      resEl.innerHTML = '<span style="color:#a8452a;">无效输入（当前仅支持非负整数）</span>';
      return;
    }
    resEl.innerHTML =
      '十进制: <b>' + dec + '</b><br>' +
      '二进制: <code>' + dec.toString(2) + '</code><br>' +
      '八进制: <code>' + dec.toString(8) + '</code><br>' +
      '十六进制: <code>' + dec.toString(16).toUpperCase() + '</code>';
  }

  /* 4. GCD/LCM */
  function calcGcd() {
    var a = Math.abs(parseInt($('gcd-a').value, 10));
    var b = Math.abs(parseInt($('gcd-b').value, 10));
    var resEl = $('gcd-res');
    if (!a || !b) { resEl.innerHTML = '请输入两个正整数'; return; }
    if (!isFinite(a) || !isFinite(b)) { resEl.innerHTML = '请输入有效整数'; return; }

    function gcd(x, y) { while (y) { var t = y; y = x % y; x = t; } return x; }
    var g = gcd(a, b);
    var l = a / g * b;
    resEl.innerHTML =
      '最大公约数 GCD(A, B): <b>' + g + '</b><br>' +
      '最小公倍数 LCM(A, B): <b>' + l + '</b>';
  }

  /* 5. 质因数分解 */
  function calcPrime() {
    var n = parseInt($('prime-input').value, 10);
    var resEl = $('prime-res');
    if (!n || n < 2 || n > 1e6) {
      resEl.innerHTML = '请输入 2 到 1,000,000 之间的整数';
      return;
    }
    var orig = n;
    var factors = [];
    var divisor = 2;
    while (n > 1 && divisor * divisor <= n) {
      while (n % divisor === 0) {
        factors.push(divisor);
        n /= divisor;
      }
      divisor++;
    }
    if (n > 1) factors.push(n);

    var grouped = {};
    factors.forEach(function (f) { grouped[f] = (grouped[f] || 0) + 1; });
    var expr = Object.keys(grouped).sort(function (a, b) { return +a - +b; })
      .map(function (f) {
        return +f + (grouped[f] > 1 ? '^' + grouped[f] : '');
      }).join(' × ');

    var isPrime = factors.length === 1 && factors[0] === orig;
    var divisors = [];
    if (orig <= 100000) {
      for (var i = 1; i * i <= orig; i++) {
        if (orig % i === 0) {
          divisors.push(i);
          if (i !== orig / i) divisors.push(orig / i);
        }
      }
      divisors.sort(function (a, b) { return a - b; });
    }

    resEl.innerHTML =
      '<b>' + orig + '</b> = ' + escHtml(expr) + '<br>' +
      (isPrime ? '✅ 这是一个<b>质数</b>' : '共 ' + factors.length + ' 个质因数') +
      (divisors.length ? '<br>所有约数（' + divisors.length + ' 个）: ' +
        '<span style="font-size:.82rem;">' + divisors.join(', ') + '</span>' : '');
  }

  /* 6. 房贷 */
  var loanMode = 'benxi';
  function calcLoan() {
    var amount = num($('loan-amount')) * 10000;
    var rate = num($('loan-rate')) / 100 / 12;
    var months = parseInt($('loan-years').value, 10) * 12;
    var resEl = $('loan-res');

    if (!amount || !months) { resEl.innerHTML = '参数不能为空'; return; }
    if (rate < 0) { resEl.innerHTML = '年利率不能为负'; return; }

    if (loanMode === 'benxi') {
      // 等额本息
      var monthly;
      if (rate === 0) {
        monthly = amount / months;
      } else {
        var factor = Math.pow(1 + rate, months);
        monthly = amount * rate * factor / (factor - 1);
      }
      var total = monthly * months;
      var interest = total - amount;
      resEl.innerHTML =
        '每月月供: <b>' + fmt(monthly, 2) + '</b> 元<br>' +
        '总还款: ' + fmt(total, 2) + ' 元<br>' +
        '总利息: <b style="color:#a8452a;">' + fmt(interest, 2) + '</b> 元<br>' +
        '还款月数: ' + months + ' 期';
    } else {
      // 等额本金
      var principalPart = amount / months;
      var firstInterest = amount * rate;
      var firstPayment = principalPart + firstInterest;
      var lastPayment = principalPart + principalPart * rate;
      // 总利息 = P * r * (n + 1) / 2
      var totalInterest = rate > 0 ? amount * rate * (months + 1) / 2 : 0;
      var totalPay = amount + totalInterest;
      resEl.innerHTML =
        '首月还款: <b>' + fmt(firstPayment, 2) + '</b> 元<br>' +
        '末月还款: <b>' + fmt(lastPayment, 2) + '</b> 元<br>' +
        '每月递减: ' + fmt(principalPart * rate, 2) + ' 元<br>' +
        '总还款: ' + fmt(totalPay, 2) + ' 元<br>' +
        '总利息: <b style="color:#a8452a;">' + fmt(totalInterest, 2) + '</b> 元';
    }
  }

  /* 7. 存款复利 */
  function calcCI() {
    var P = num($('ci-p'));
    var r = num($('ci-r')) / 100;
    var t = num($('ci-t'));
    var m = parseInt($('ci-freq').value, 10) || 1;
    var resEl = $('ci-res');
    if (!P || !t || r < 0) { resEl.innerHTML = '参数不能为空'; return; }

    var A = P * Math.pow(1 + r / m, m * t);
    var interest = A - P;
    var ear = Math.pow(1 + r / m, m) - 1;

    resEl.innerHTML =
      '最终本息合计: <b>' + fmt(A, 2) + '</b> 元<br>' +
      '获得利息: <b style="color:#a8452a;">' + fmt(interest, 2) + '</b> 元<br>' +
      '实际年化收益率 (EAR): <b>' + fmt(ear * 100, 3) + '%</b>';
  }

  /* 8. 基金定投 */
  var dcaMode = 'end';
  function calcDCA() {
    var Pmt = num($('dca-m'));
    var r = num($('dca-r')) / 100 / 12;
    var n = num($('dca-y')) * 12;
    var resEl = $('dca-res');
    if (!Pmt || !n) { resEl.innerHTML = '参数不能为空'; return; }

    var FV;
    if (r === 0) {
      FV = Pmt * n;
    } else {
      var factor = Math.pow(1 + r, n) - 1;
      FV = Pmt * factor / r;
      if (dcaMode === 'begin') FV *= (1 + r);
    }
    var principal = Pmt * n;
    var interest = FV - principal;
    var yearR = (Math.pow(FV / principal, 1 / (n / 12)) - 1) * 100;

    resEl.innerHTML =
      '累计投入本金: <b>' + fmt(principal, 2) + '</b> 元<br>' +
      '预计期末总资产: <b>' + fmt(FV, 2) + '</b> 元<br>' +
      '预计总收益: <b style="color:#7ba05b;">' + fmt(interest, 2) + '</b> 元<br>' +
      '投入回报倍数: <b>' + fmt(FV / principal, 2) + '×</b>' +
      (dcaMode === 'begin' ? '<br><span style="color:#a8452a;font-size:.82rem;">（期初投入 = 月初扣款）</span>' : '');
  }

  /* 9. 股票补仓 */
  function calcStock() {
    var q1 = num($('st-qty1'));
    var c1 = num($('st-cost1'));
    var q2 = num($('st-qty2'));
    var c2 = num($('st-cost2'));
    var resEl = $('st-res');
    if (q1 + q2 === 0) { resEl.innerHTML = '总股数不能为 0'; return; }

    var totalCost = q1 * c1 + q2 * c2;
    var totalQty = q1 + q2;
    var newCost = totalCost / totalQty;

    resEl.innerHTML =
      '总投入成本: <b>' + fmt(totalCost, 2) + '</b> 元<br>' +
      '总持仓数量: ' + fmt(totalQty, 0) + ' 股<br>' +
      '补仓后摊薄成本价: <b style="color:#a8452a;">' + fmt(newCost, 3) + '</b> 元 / 股';
  }

  /* 10. ROI */
  function calcROI() {
    var cost = num($('roi-cost'));
    var val = num($('roi-value'));
    var resEl = $('roi-res');
    if (!cost) { resEl.innerHTML = '初始投入不能为 0'; return; }

    var profit = val - cost;
    var roi = (profit / cost) * 100;
    var color = roi >= 0 ? '#7ba05b' : '#a8452a';
    resEl.innerHTML =
      '净利润: <b style="color:' + color + ';">' + fmt(profit, 2) + '</b> 元<br>' +
      '投资回报率 (ROI): <b style="color:' + color + ';">' + fmt(roi, 2) + '%</b>';
  }

  /* 11. CAGR */
  function calcCAGR() {
    var start = num($('cagr-start'));
    var end = num($('cagr-end'));
    var years = num($('cagr-years'));
    var resEl = $('cagr-res');
    if (!start || years <= 0) { resEl.innerHTML = '起始值需 > 0，年数需 > 0'; return; }
    if (end <= 0) { resEl.innerHTML = '终止值需 > 0'; return; }

    var cagr = Math.pow(end / start, 1 / years) - 1;
    var totalGrowth = (end / start - 1) * 100;
    var mult = end / start;

    resEl.innerHTML =
      'CAGR (年复合增长率): <b style="color:#a8452a;">' + fmt(cagr * 100, 2) + '%</b><br>' +
      '总增长率: ' + fmt(totalGrowth, 2) + '%<br>' +
      '最终倍数: <b>' + fmt(mult, 3) + '×</b>';
  }

  /* 12. 个税 */
  function calcTax() {
    var salary = num($('tax-salary'));
    var deduct = num($('tax-deduct'));
    var resEl = $('tax-res');
    if (!salary) { resEl.innerHTML = '请输入月薪'; return; }
    if (deduct < 0) deduct = 0;

    var taxable = salary - deduct - 5000;
    if (taxable <= 0) {
      resEl.innerHTML =
        '免税额度内<br>' +
        '实际到手工资: <b style="color:#7ba05b;">' + fmt(salary - deduct, 2) + '</b> 元';
      return;
    }

    var tax;
    if (taxable <= 3000) tax = taxable * 0.03;
    else if (taxable <= 12000) tax = taxable * 0.10 - 210;
    else if (taxable <= 25000) tax = taxable * 0.20 - 1410;
    else if (taxable <= 35000) tax = taxable * 0.25 - 2660;
    else if (taxable <= 55000) tax = taxable * 0.30 - 4410;
    else if (taxable <= 80000) tax = taxable * 0.35 - 7160;
    else tax = taxable * 0.45 - 15160;

    var net = salary - deduct - tax;
    var effectiveRate = tax / salary * 100;

    resEl.innerHTML =
      '应纳税所得额: ' + fmt(taxable, 2) + ' 元<br>' +
      '应缴个税: <b style="color:#a8452a;">' + fmt(tax, 2) + '</b> 元<br>' +
      '实际到手工资: <b style="color:#7ba05b;">' + fmt(net, 2) + '</b> 元<br>' +
      '实际税率: ' + fmt(effectiveRate, 2) + '%';
  }

  /* 13. 折扣/满减 */
  var discountMode = 'zhe';
  function calcDiscount() {
    var price = num($('ds-price'));
    var resEl = $('ds-res');
    if (!price || price < 0) { resEl.innerHTML = '请输入有效原价'; return; }

    var finalPrice, save, pct;

    if (discountMode === 'zhe') {
      var rate = num($('ds-rate'));
      if (!rate || rate <= 0 || rate > 10) {
        resEl.innerHTML = '折扣需在 0-10 之间（8.5 表示 8.5 折）';
        return;
      }
      finalPrice = price * (rate / 10);
      save = price - finalPrice;
      pct = (1 - rate / 10) * 100;

      resEl.innerHTML =
        '折后价格: <b>' + fmt(finalPrice, 2) + '</b> 元<br>' +
        '为您节省: <b style="color:#7ba05b;">' + fmt(save, 2) + '</b> 元<br>' +
        '相当于: <b>' + fmt(pct, 1) + '% OFF</b>';
    } else {
      var threshold = num($('ds-threshold'));
      var cut = num($('ds-cut'));
      if (!threshold || !cut || threshold <= 0) {
        resEl.innerHTML = '请输入有效的满减门槛与减免金额';
        return;
      }
      if (price >= threshold) {
        finalPrice = Math.max(0, price - cut);
        save = price - finalPrice;
      } else {
        finalPrice = price;
        save = 0;
      }
      resEl.innerHTML =
        '原价: ' + fmt(price, 2) + ' 元<br>' +
        '活动: 满 ' + fmt(threshold, 2) + ' 减 ' + fmt(cut, 2) + ' 元' +
        (save > 0 ? '<br>✅ 满足满减条件' : '<br>⚠️ 未满足满减门槛') +
        '<br>' +
        '实付金额: <b style="color:#a8452a;">' + fmt(finalPrice, 2) + '</b> 元<br>' +
        '为您节省: <b style="color:#7ba05b;">' + fmt(save, 2) + '</b> 元';
    }
  }

  /* 14. 日期天数差 */
  function calcDate() {
    var fromStr = $('date-from').value;
    var toStr = $('date-to').value;
    var resEl = $('date-res');
    if (!fromStr || !toStr) { resEl.innerHTML = '请选择两个日期'; return; }

    var d1 = new Date(fromStr + 'T00:00:00');
    var d2 = new Date(toStr + 'T00:00:00');
    if (isNaN(d1) || isNaN(d2)) { resEl.innerHTML = '日期格式错误'; return; }

    var ms = d2 - d1;
    var days = Math.round(ms / 86400000);
    var absDays = Math.abs(days);
    var weeks = absDays / 7;
    var months = absDays / 30.44;
    var years = absDays / 365.25;

    // 工作日
    var start = new Date(Math.min(d1, d2));
    var end = new Date(Math.max(d1, d2));
    var workdays = 0;
    var cur = new Date(start);
    while (cur <= end) {
      var dow = cur.getDay();
      if (dow !== 0 && dow !== 6) workdays++;
      cur.setDate(cur.getDate() + 1);
    }
    var weekends = absDays + 1 - workdays;

    var direction = days >= 0 ? '之后' : '之前';
    resEl.innerHTML =
      (days >= 0 ? '结束日期比开始日期晚 ' : '结束日期比开始日期早 ') +
      '<b style="color:#a8452a;">' + absDays + '</b> 天<br>' +
      '约 ' + fmt(weeks, 1) + ' 周 · ' + fmt(months, 1) + ' 个月 · ' + fmt(years, 2) + ' 年<br>' +
      '期间工作日: <b>' + workdays + '</b> 天 · 周末: ' + weekends + ' 天';
  }

  /* 15. 分页偏移 */
  function calcPage() {
    var cur = parseInt($('pg-current').value, 10);
    var size = parseInt($('pg-size').value, 10);
    var resEl = $('pg-res');
    if (!cur || cur < 1 || !size || size < 1) {
      resEl.innerHTML = '页码和每页条数必须 > 0';
      return;
    }
    var offset = (cur - 1) * size;
    resEl.innerHTML =
      'OFFSET: <b>' + offset + '</b> · LIMIT: <b>' + size + '</b><br>' +
      'SQL 示例: <code>SELECT * FROM table LIMIT ' + size + ' OFFSET ' + offset + ';</code>';
  }

  /* ================= 绑定事件 ================= */
  function bind(id, fn) {
    var el = $(id);
    if (el) el.addEventListener('click', fn);
  }

  bind('btn-calc', calcExpr);
  bind('btn-stat', calcStat);
  bind('btn-base', calcBase);
  bind('btn-gcd', calcGcd);
  bind('btn-prime', calcPrime);
  bind('btn-loan', calcLoan);
  bind('btn-ci', calcCI);
  bind('btn-dca', calcDCA);
  bind('btn-stock', calcStock);
  bind('btn-roi', calcROI);
  bind('btn-cagr', calcCAGR);
  bind('btn-tax', calcTax);
  bind('btn-discount', calcDiscount);
  bind('btn-date', calcDate);
  bind('btn-pg', calcPage);

  /* 回车快捷键：输入框内按回车触发对应按钮 */
  var ENTER_MAP = {
    'calc-expr': 'btn-calc',
    'base-input': 'btn-base',
    'gcd-a': 'btn-gcd',
    'gcd-b': 'btn-gcd',
    'prime-input': 'btn-prime',
    'loan-amount': 'btn-loan',
    'loan-rate': 'btn-loan',
    'loan-years': 'btn-loan',
    'ci-p': 'btn-ci',
    'ci-r': 'btn-ci',
    'ci-t': 'btn-ci',
    'dca-m': 'btn-dca',
    'dca-r': 'btn-dca',
    'dca-y': 'btn-dca',
    'st-qty1': 'btn-stock',
    'st-cost1': 'btn-stock',
    'st-qty2': 'btn-stock',
    'st-cost2': 'btn-stock',
    'roi-cost': 'btn-roi',
    'roi-value': 'btn-roi',
    'cagr-start': 'btn-cagr',
    'cagr-end': 'btn-cagr',
    'cagr-years': 'btn-cagr',
    'tax-salary': 'btn-tax',
    'tax-deduct': 'btn-tax',
    'ds-price': 'btn-discount',
    'ds-rate': 'btn-discount',
    'ds-threshold': 'btn-discount',
    'ds-cut': 'btn-discount',
    'pg-current': 'btn-pg',
    'pg-size': 'btn-pg'
  };
  Object.keys(ENTER_MAP).forEach(function (inputId) {
    var el = $(inputId);
    if (!el) return;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var btn = $(ENTER_MAP[inputId]);
        if (btn) btn.click();
      }
    });
  });

  /* 模式切换 */
  function bindModeSwitch(segId, callback) {
    var seg = $(segId);
    if (!seg) return;
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('.ct-mode-btn');
      if (!btn) return;
      Array.prototype.forEach.call(seg.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      callback(btn.dataset.mode);
    });
  }

  bindModeSwitch('loan-mode', function (mode) {
    loanMode = mode;
    calcLoan();
  });
  bindModeSwitch('dca-mode', function (mode) {
    dcaMode = mode;
    calcDCA();
  });
  bindModeSwitch('discount-mode', function (mode) {
    discountMode = mode;
    var zheRow = $('ds-row-zhe');
    var mjRow = $('ds-row-manjian');
    var mjRow2 = $('ds-row-manjian2');
    if (mode === 'zhe') {
      zheRow.hidden = false;
      mjRow.hidden = true;
      mjRow2.hidden = true;
    } else {
      zheRow.hidden = true;
      mjRow.hidden = false;
      mjRow2.hidden = false;
    }
    calcDiscount();
  });

  /* ================= 复制按钮 ================= */
  document.querySelectorAll('.ct-copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.ct-card');
      if (!card) return;
      var box = card.querySelector('.ct-result, .ct-result-box');
      if (!box) { showToast('没有可复制的内容'); return; }
      var text = box.innerText.replace(/^=\s*/, '').trim();
      if (!text) { showToast('暂无结果'); return; }
      copyText(text);
    });
  });

  /* ================= 主题 ================= */
  var themeKey = 'ct_theme';
  var currentTheme = 'light';
  function applyTheme() {
    document.body.classList.toggle('theme-dark', currentTheme === 'dark');
    var btn = $('btn-theme');
    if (btn) btn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }
  try { currentTheme = localStorage.getItem(themeKey) || 'light'; } catch (e) {}
  applyTheme();
  var themeBtn = $('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(themeKey, currentTheme); } catch (e) {}
      applyTheme();
    });
  }

  /* ================= 分类标签 ================= */
  var currentCat = 'all';
  var currentSearch = '';

  function filterCards() {
    var cards = document.querySelectorAll('.ct-card');
    var visible = 0;
    cards.forEach(function (card) {
      var catMatch = currentCat === 'all' || card.dataset.cat === currentCat;
      var searchTarget = (card.textContent + ' ' + (card.dataset.search || '')).toLowerCase();
      var searchMatch = !currentSearch || searchTarget.indexOf(currentSearch) >= 0;
      var show = catMatch && searchMatch;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    var empty = $('ct-empty');
    if (empty) empty.hidden = visible > 0;
  }

  var tabs = $('ct-tabs');
  if (tabs) {
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.ct-tab');
      if (!btn) return;
      Array.prototype.forEach.call(tabs.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      currentCat = btn.dataset.cat || 'all';
      filterCards();
    });
  }

  var searchInput = $('ct-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentSearch = searchInput.value.trim().toLowerCase();
      filterCards();
    });
  }

  /* ================= 日期输入默认值 ================= */
  function initDates() {
    var today = new Date();
    var fmtDate = function (d) {
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    };
    var from = $('date-from');
    var to = $('date-to');
    if (from && !from.value) from.value = fmtDate(today);
    if (to && !to.value) {
      var next = new Date(today.getTime() + 30 * 86400000);
      to.value = fmtDate(next);
    }
  }

  /* ================= 初始化 ================= */
  initDates();
  filterCards();
})();