/* js/unit-tool.js */
(function () {
  'use strict';

  /* ================= 工具 ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = $('un-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (!text) { showToast('没有可复制的内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制');
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
      showToast('✅ 已复制');
    } catch (e) { showToast('❌ 复制失败'); }
  }

  // 格式化数字：能大幅缩小时用科学计数法，否则去掉多余零并加千分位
  function fmt(n) {
    if (!isFinite(n)) return '—';
    if (n === 0) return '0';
    var abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-6) {
      return n.toExponential(4);
    }
    var s = parseFloat(n.toPrecision(10)).toString();
    var parts = s.split('.');
    if (parts[0] && parts[0] !== '-' && parts[0] !== '') {
      var neg = parts[0].charAt(0) === '-';
      var numStr = neg ? parts[0].slice(1) : parts[0];
      numStr = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      parts[0] = (neg ? '-' : '') + numStr;
    }
    return parts.join('.');
  }

  /* ================= 主题 ================= */
  var themeKey = 'un_theme_v1';
  var theme = 'light';
  try { theme = localStorage.getItem(themeKey) || 'light'; } catch (e) {}
  function applyTheme() {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    $('btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  applyTheme();
  $('btn-theme').addEventListener('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(themeKey, theme); } catch (e) {}
    applyTheme();
  });

  /* ================= 复制按钮（全局） ================= */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var target = $(btn.dataset.copy);
    if (!target) return;
    var text = (target.value !== undefined && target.value !== null) ? target.value : (target.textContent || '');
    text = text.trim();
    if (!text) { showToast('没有可复制的内容'); return; }
    copyText(text);
  });

  /* ================= 1. 进制转换 ================= */
  var baseInputs = {
    10: $('base-10'),
    16: $('base-16'),
    2: $('base-2'),
    8: $('base-8')
  };
  var baseCustomN = $('base-custom-n');
  var baseCustom = $('base-custom');
  var baseError = $('base-error');

  function parseBase(value, base) {
    value = String(value || '').trim();
    if (!value) return { ok: true, value: 0n };

    // 去掉前缀
    if (base === 16 && /^0x/i.test(value)) value = value.slice(2);
    if (base === 2 && /^0b/i.test(value)) value = value.slice(2);
    if (base === 8 && /^0o/i.test(value)) value = value.slice(2);

    var neg = value.startsWith('-');
    if (neg) value = value.slice(1);
    value = value.replace(/\s+/g, '').toUpperCase();
    if (!value) return { ok: true, value: 0n };

    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var valid = chars.slice(0, base);
    var result = 0n;
    var bigBase = BigInt(base);
    for (var i = 0; i < value.length; i++) {
      var idx = valid.indexOf(value[i]);
      if (idx === -1) return { ok: false, badChar: value[i] };
      result = result * bigBase + BigInt(idx);
    }
    return { ok: true, value: neg ? -result : result };
  }

  function toBaseStr(bigNum, base) {
    if (bigNum === 0n) return '0';
    var neg = bigNum < 0n;
    var n = neg ? -bigNum : bigNum;
    var bigBase = BigInt(base);
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var out = '';
    while (n > 0n) {
      var r = Number(n % bigBase);
      out = chars[r] + out;
      n = n / bigBase;
    }
    return (neg ? '-' : '') + out;
  }

  function updateBases(sourceKey) {
    baseError.hidden = true;

    var raw = '';
    var fromBase = 10;
    if (sourceKey === 'custom') {
      raw = baseCustom.value;
      fromBase = Math.max(2, Math.min(36, parseInt(baseCustomN.value, 10) || 36));
    } else {
      raw = baseInputs[sourceKey].value;
      fromBase = parseInt(sourceKey, 10);
    }

    if (!raw.trim()) {
      Object.keys(baseInputs).forEach(function (k) {
        if (k !== String(sourceKey)) baseInputs[k].value = '';
      });
      if (sourceKey !== 'custom') baseCustom.value = '';
      return;
    }

    var parsed = parseBase(raw, fromBase);
    if (!parsed.ok) {
      baseError.hidden = false;
      baseError.textContent = '❌ 字符 "' + parsed.badChar + '" 不是 ' + fromBase + ' 进制的有效数字';
      return;
    }

    var num = parsed.value;
    Object.keys(baseInputs).forEach(function (k) {
      if (k === String(sourceKey)) return;
      baseInputs[k].value = toBaseStr(num, parseInt(k, 10));
    });

    var cn = Math.max(2, Math.min(36, parseInt(baseCustomN.value, 10) || 36));
    if (sourceKey !== 'custom') {
      baseCustom.value = toBaseStr(num, cn);
    }
  }

  Object.keys(baseInputs).forEach(function (k) {
    baseInputs[k].addEventListener('input', function () { updateBases(k); });
  });
  baseCustom.addEventListener('input', function () { updateBases('custom'); });
  baseCustomN.addEventListener('input', function () {
    // 自定义进制改变时，用当前 custom 值重新解析
    updateBases('custom');
  });

  // 初始化
  baseInputs['10'].value = '255';
  updateBases('10');

  /* ================= 2. 单位换算 ================= */
  var UNITS = {
    length: {
      name: '📏 长度',
      items: {
        nm: { f: 1e-9, label: '纳米 (nm)' },
        μm: { f: 1e-6, label: '微米 (μm)' },
        mm: { f: 1e-3, label: '毫米 (mm)' },
        cm: { f: 1e-2, label: '厘米 (cm)' },
        m: { f: 1, label: '米 (m)' },
        km: { f: 1000, label: '千米 (km)' },
        in: { f: 0.0254, label: '英寸 (in)' },
        ft: { f: 0.3048, label: '英尺 (ft)' },
        yd: { f: 0.9144, label: '码 (yd)' },
        mi: { f: 1609.344, label: '英里 (mi)' },
        nmi: { f: 1852, label: '海里 (nmi)' }
      }
    },
    weight: {
      name: '⚖️ 重量',
      items: {
        mg: { f: 1e-6, label: '毫克 (mg)' },
        g: { f: 1e-3, label: '克 (g)' },
        kg: { f: 1, label: '千克 (kg)' },
        t: { f: 1000, label: '吨 (t)' },
        oz: { f: 0.0283495, label: '盎司 (oz)' },
        lb: { f: 0.453592, label: '磅 (lb)' }
      }
    },
    storage: {
      name: '💾 存储',
      items: {
        B: { f: 1, label: '字节 (B)' },
        KB: { f: 1024, label: '千字节 (KB)' },
        MB: { f: 1048576, label: '兆字节 (MB)' },
        GB: { f: 1073741824, label: '吉字节 (GB)' },
        TB: { f: 1099511627776, label: '太字节 (TB)' },
        PB: { f: 1125899906842624, label: '拍字节 (PB)' }
      }
    },
    temperature: {
      name: '🌡️ 温度',
      special: 'temperature',
      items: {
        C: { label: '摄氏度 (℃)' },
        F: { label: '华氏度 (℉)' },
        K: { label: '开尔文 (K)' }
      }
    },
    speed: {
      name: '🚀 速度',
      items: {
        'm/s': { f: 1, label: '米/秒 (m/s)' },
        'km/h': { f: 0.277778, label: '千米/时 (km/h)' },
        mph: { f: 0.44704, label: '英里/时 (mph)' },
        kn: { f: 0.514444, label: '节 (kn)' }
      }
    },
    area: {
      name: '📐 面积',
      items: {
        'mm²': { f: 1e-6, label: '平方毫米 (mm²)' },
        'cm²': { f: 1e-4, label: '平方厘米 (cm²)' },
        'm²': { f: 1, label: '平方米 (m²)' },
        'km²': { f: 1e6, label: '平方千米 (km²)' },
        '公顷': { f: 10000, label: '公顷 (ha)' },
        '亩': { f: 666.667, label: '亩' },
        'ft²': { f: 0.092903, label: '平方英尺 (ft²)' },
        'acre': { f: 4046.86, label: '英亩 (ac)' }
      }
    },
    volume: {
      name: '🧪 体积',
      items: {
        mL: { f: 1e-6, label: '毫升 (mL)' },
        L: { f: 1e-3, label: '升 (L)' },
        'm³': { f: 1, label: '立方米 (m³)' },
        'cm³': { f: 1e-6, label: '立方厘米 (cm³)' },
        gal: { f: 0.00378541, label: '美制加仑 (gal)' },
        qt: { f: 0.000946353, label: '美制夸脱 (qt)' },
        pt: { f: 0.000473176, label: '美制品脱 (pt)' },
        cup: { f: 0.000236588, label: '美制杯 (cup)' },
        floz: { f: 2.95735e-5, label: '美制液盎司 (fl oz)' }
      }
    },
    time: {
      name: '⏱️ 时间',
      items: {
        ms: { f: 1e-3, label: '毫秒 (ms)' },
        s: { f: 1, label: '秒 (s)' },
        min: { f: 60, label: '分钟 (min)' },
        h: { f: 3600, label: '小时 (h)' },
        d: { f: 86400, label: '天 (d)' },
        w: { f: 604800, label: '周 (w)' },
        mon: { f: 2592000, label: '月 (30 天)' },
        yr: { f: 31536000, label: '年 (365 天)' }
      }
    },
    energy: {
      name: '⚡ 能量',
      items: {
        J: { f: 1, label: '焦耳 (J)' },
        kJ: { f: 1000, label: '千焦 (kJ)' },
        cal: { f: 4.184, label: '卡 (cal)' },
        kcal: { f: 4184, label: '千卡 (kcal)' },
        kWh: { f: 3600000, label: '千瓦时 (kWh)' },
        eV: { f: 1.602177e-19, label: '电子伏 (eV)' },
        BTU: { f: 1055.06, label: '英热单位 (BTU)' }
      }
    },
    pressure: {
      name: '💨 压力',
      items: {
        Pa: { f: 1, label: '帕斯卡 (Pa)' },
        kPa: { f: 1000, label: '千帕 (kPa)' },
        MPa: { f: 1e6, label: '兆帕 (MPa)' },
        bar: { f: 100000, label: '巴 (bar)' },
        psi: { f: 6894.76, label: '磅力/平方英寸 (psi)' },
        atm: { f: 101325, label: '标准大气压 (atm)' },
        mmHg: { f: 133.322, label: '毫米汞柱 (mmHg)' }
      }
    },
    angle: {
      name: '📐 角度',
      items: {
        deg: { f: 1, label: '度 (°)' },
        rad: { f: 180 / Math.PI, label: '弧度 (rad)' },
        grad: { f: 0.9, label: '百分度 (grad)' },
        turn: { f: 360, label: '圈 (turn)' }
      }
    },
    dev: {
      name: '💻 CSS 单位',
      special: 'dev',
      items: {
        px: { label: '像素 (px)' },
        pt: { label: '点 (pt)' },
        pc: { label: '派卡 (pc)' },
        in: { label: '英寸 (in)' },
        cm: { label: '厘米 (cm)' },
        mm: { label: '毫米 (mm)' },
        rem: { label: 'rem' },
        em: { label: 'em' }
      }
    }
  };

  var unitTypeEl = $('unit-type');
  var unitFromEl = $('unit-from');
  var unitInputEl = $('unit-input');
  var unitTableBody = document.querySelector('#unit-table tbody');
  var devRootRow = $('dev-root-row');
  var devRootSize = $('dev-root-size');
  var currentUnitFrom = 'm';

  // 填充类型下拉
  Object.keys(UNITS).forEach(function (k) {
    var opt = document.createElement('option');
    opt.value = k;
    opt.textContent = UNITS[k].name;
    unitTypeEl.appendChild(opt);
  });
  // 默认长度
  unitTypeEl.value = 'length';

  function buildFromOptions(type) {
    var data = UNITS[type];
    var keys = Object.keys(data.items);
    unitFromEl.innerHTML = '';
    keys.forEach(function (k) {
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = data.items[k].label;
      unitFromEl.appendChild(opt);
    });
    // 优先保持上次
    if (keys.indexOf(currentUnitFrom) >= 0) {
      unitFromEl.value = currentUnitFrom;
    } else {
      // 取中间位置作为默认
      var midIdx = Math.min(2, keys.length - 1);
      unitFromEl.value = keys[midIdx];
      currentUnitFrom = keys[midIdx];
    }
    devRootRow.hidden = data.special !== 'dev';
  }

  function getDevFactors() {
    var root = Math.max(1, parseFloat(devRootSize.value) || 16);
    return {
      px: 1,
      pt: 96 / 72,
      pc: 16,
      in: 96,
      cm: 96 / 2.54,
      mm: 96 / 25.4,
      rem: root,
      em: root
    };
  }

  function convertToBase(type, unit, value) {
    var data = UNITS[type];
    if (data.special === 'temperature') {
      // 转为摄氏度
      if (unit === 'F') return (value - 32) * 5 / 9;
      if (unit === 'K') return value - 273.15;
      return value;
    }
    if (data.special === 'dev') {
      var factors = getDevFactors();
      return value * factors[unit];
    }
    return value * data.items[unit].f;
  }

  function convertFromBase(type, unit, baseVal) {
    var data = UNITS[type];
    if (data.special === 'temperature') {
      if (unit === 'F') return baseVal * 9 / 5 + 32;
      if (unit === 'K') return baseVal + 273.15;
      return baseVal;
    }
    if (data.special === 'dev') {
      var factors = getDevFactors();
      return baseVal / factors[unit];
    }
    return baseVal / data.items[unit].f;
  }

  function renderUnitTable() {
    var type = unitTypeEl.value;
    var data = UNITS[type];
    var fromUnit = unitFromEl.value;
    currentUnitFrom = fromUnit;
    var inputVal = parseFloat(unitInputEl.value);
    if (isNaN(inputVal)) inputVal = 0;

    var baseVal = convertToBase(type, fromUnit, inputVal);
    var keys = Object.keys(data.items);

    unitTableBody.innerHTML = '';
    keys.forEach(function (k) {
      var val = convertFromBase(type, k, baseVal);
      var tr = document.createElement('tr');
      if (k === fromUnit) tr.className = 'active';
      tr.innerHTML =
        '<td>' + esc(data.items[k].label) + '</td>' +
        '<td>' + esc(fmt(val)) + '</td>' +
        '<td><button class="un-copy-icon" data-copy-val="' + esc(fmt(val)) + '" type="button" title="复制">📋</button></td>';
      tr.addEventListener('click', function (e) {
        // 点击复制按钮时不切换
        if (e.target.closest('.un-copy-icon')) return;
        currentUnitFrom = k;
        buildFromOptions(type);
        renderUnitTable();
      });
      unitTableBody.appendChild(tr);
    });

    unitTableBody.querySelectorAll('[data-copy-val]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        copyText(btn.dataset.copyVal);
      });
    });
  }

  unitTypeEl.addEventListener('change', function () {
    buildFromOptions(unitTypeEl.value);
    renderUnitTable();
  });
  unitFromEl.addEventListener('change', function () {
    currentUnitFrom = unitFromEl.value;
    renderUnitTable();
  });
  unitInputEl.addEventListener('input', renderUnitTable);
  devRootSize.addEventListener('input', renderUnitTable);

  // 初始化单位
  buildFromOptions('length');
  renderUnitTable();

  /* ================= 3. 中文数字 ================= */
  var CN_DIGITS_LOWER = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var CN_DIGITS_UPPER = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  var CN_UNITS_LOWER = ['', '十', '百', '千'];
  var CN_UNITS_UPPER = ['', '拾', '佰', '仟'];

  function numberToChinese(num, format) {
    if (format === 'money') {
      return moneyToChinese(num);
    }

    var isUpper = format === 'upper';
    var digits = isUpper ? CN_DIGITS_UPPER : CN_DIGITS_LOWER;
    var units = isUpper ? CN_UNITS_UPPER : CN_UNITS_LOWER;

    if (num === 0) return digits[0];
    if (num < 0) return '负' + numberToChinese(-num, format);

    var result = '';

    if (num >= 1e8) {
      var yi = Math.floor(num / 1e8);
      result += numberToChinese(yi, format) + '亿';
      num = num % 1e8;
      if (num > 0 && num < 1e7) result += digits[0];
    }
    if (num >= 1e4) {
      var wan = Math.floor(num / 1e4);
      result += numberToChinese(wan, format) + '万';
      num = num % 1e4;
      if (num > 0 && num < 1000) result += digits[0];
    }
    if (num >= 1000) {
      result += digits[Math.floor(num / 1000)] + units[3];
      num = num % 1000;
      if (num > 0 && num < 100) result += digits[0];
    }
    if (num >= 100) {
      result += digits[Math.floor(num / 100)] + units[2];
      num = num % 100;
      if (num > 0 && num < 10) result += digits[0];
    }
    if (num >= 10) {
      result += digits[Math.floor(num / 10)] + units[1];
      num = num % 10;
    }
    if (num > 0) {
      result += digits[num];
    }

    // 一十二 -> 十二
    if (!isUpper) {
      result = result.replace(/^一十/, '十');
    }
    return result;
  }

  function moneyToChinese(num) {
    if (num === 0) return '零元整';
    if (num < 0) return '负' + moneyToChinese(-num);

    var digits = CN_DIGITS_UPPER;
    var totalFen = Math.round(num * 100);
    var yuan = Math.floor(totalFen / 100);
    var fen = totalFen % 100;
    var jiao = Math.floor(fen / 10);
    var f2 = fen % 10;

    var result = '';
    if (yuan > 0) {
      result = numberToChinese(yuan, 'upper') + '元';
    }

    if (jiao > 0) {
      result += digits[jiao] + '角';
      if (f2 > 0) result += digits[f2] + '分';
    } else if (f2 > 0) {
      if (yuan > 0) result += '零';
      result += digits[f2] + '分';
    } else if (yuan > 0) {
      result += '整';
    } else {
      result = '零元整';
    }
    return result;
  }

  function parseGroup(s) {
    var digitMap = {
      '零': 0, '〇': 0, '一': 1, '壹': 1, '二': 2, '两': 2, '贰': 2,
      '三': 3, '叁': 3, '四': 4, '肆': 4, '五': 5, '伍': 5,
      '六': 6, '陆': 6, '七': 7, '柒': 7, '八': 8, '捌': 8,
      '九': 9, '玖': 9
    };
    var smallUnits = { '十': 10, '拾': 10, '百': 100, '佰': 100, '千': 1000, '仟': 1000 };

    var total = 0;
    var num = 0;
    var hasDigit = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (digitMap[c] !== undefined) {
        num = digitMap[c];
        hasDigit = true;
      } else if (smallUnits[c] !== undefined) {
        if (num === 0 && !hasDigit) num = 1;
        total += num * smallUnits[c];
        num = 0;
        hasDigit = false;
      }
    }
    total += num;
    return total;
  }

  function chineseToNumber(cn) {
    cn = String(cn).trim();
    if (!cn) return null;

    // 小数部分
    var intPart = cn;
    var decPart = '';
    var dotIdx = cn.indexOf('点');
    if (dotIdx >= 0) {
      intPart = cn.substring(0, dotIdx);
      decPart = cn.substring(dotIdx + 1);
    }

    var digitMap = {
      '零': 0, '〇': 0, '一': 1, '壹': 1, '二': 2, '两': 2, '贰': 2,
      '三': 3, '叁': 3, '四': 4, '肆': 4, '五': 5, '伍': 5,
      '六': 6, '陆': 6, '七': 7, '柒': 7, '八': 8, '捌': 8,
      '九': 9, '玖': 9
    };

    var result = 0;
    var remaining = intPart;

    // 处理亿（可能有多个）
    var idx = remaining.indexOf('亿');
    while (idx >= 0) {
      var pre = remaining.substring(0, idx);
      result = (result + parseGroup(pre)) * 1e8;
      remaining = remaining.substring(idx + 1);
      idx = remaining.indexOf('亿');
    }

    // 处理万
    idx = remaining.indexOf('万');
    while (idx >= 0) {
      var preW = remaining.substring(0, idx);
      result += parseGroup(preW) * 1e4;
      remaining = remaining.substring(idx + 1);
      idx = remaining.indexOf('万');
    }

    result += parseGroup(remaining);

    // 小数
    if (decPart) {
      var dec = 0;
      var mul = 0.1;
      for (var i = 0; i < decPart.length; i++) {
        var c = decPart[i];
        if (digitMap[c] !== undefined) {
          dec += digitMap[c] * mul;
          mul /= 10;
        }
      }
      result += dec;
    }

    return result;
  }

  // 中文数字 Tab 切换
  document.querySelectorAll('.un-cn-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.un-cn-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.un-cn-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var panel = document.querySelector('.un-cn-panel[data-panel="' + tab.dataset.tab + '"]');
      if (panel) panel.classList.add('active');
    });
  });

  // 数字 → 中文
  function updateCnNum() {
    var num = parseFloat($('cn-num-input').value);
    var format = (document.querySelector('input[name="cn-format"]:checked') || {}).value || 'lower';
    var out = $('cn-num-result');
    if (isNaN(num)) { out.textContent = ''; return; }
    try {
      out.textContent = numberToChinese(num, format);
    } catch (e) {
      out.textContent = '转换失败';
    }
  }
  $('cn-num-input').addEventListener('input', updateCnNum);
  document.querySelectorAll('input[name="cn-format"]').forEach(function (r) {
    r.addEventListener('change', updateCnNum);
  });
  updateCnNum();

  // 中文 → 数字
  function updateCnStr() {
    var str = $('cn-str-input').value;
    var out = $('cn-str-result');
    if (!str.trim()) { out.textContent = ''; return; }
    try {
      var num = chineseToNumber(str);
      if (num === null || isNaN(num)) {
        out.textContent = '❌ 无法解析';
      } else {
        out.textContent = fmt(num);
      }
    } catch (e) {
      out.textContent = '❌ 解析失败';
    }
  }
  $('cn-str-input').addEventListener('input', updateCnStr);
  updateCnStr();

  /* ================= 4. 罗马数字 ================= */
  var romanNumEl = $('roman-num');
  var romanStrEl = $('roman-str');
  var romanDetail = $('roman-detail');

  var ROMAN_MAP = [
    { sym: 'M', val: 1000 },
    { sym: 'CM', val: 900 },
    { sym: 'D', val: 500 },
    { sym: 'CD', val: 400 },
    { sym: 'C', val: 100 },
    { sym: 'XC', val: 90 },
    { sym: 'L', val: 50 },
    { sym: 'XL', val: 40 },
    { sym: 'X', val: 10 },
    { sym: 'IX', val: 9 },
    { sym: 'V', val: 5 },
    { sym: 'IV', val: 4 },
    { sym: 'I', val: 1 }
  ];

  function toRoman(num) {
    if (num <= 0 || num >= 4000) return '';
    var result = '';
    for (var i = 0; i < ROMAN_MAP.length; i++) {
      while (num >= ROMAN_MAP[i].val) {
        result += ROMAN_MAP[i].sym;
        num -= ROMAN_MAP[i].val;
      }
    }
    return result;
  }

  function fromRoman(str) {
    str = String(str).trim().toUpperCase();
    if (!str) return 0;
    if (!/^[IVXLCDM]+$/.test(str)) return null;

    var valMap = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    var result = 0;
    for (var i = 0; i < str.length; i++) {
      var cur = valMap[str[i]];
      var next = i + 1 < str.length ? valMap[str[i + 1]] : 0;
      if (cur < next) result -= cur;
      else result += cur;
    }
    return result;
  }

  function updateRomanFromNum() {
    var num = parseInt(romanNumEl.value, 10);
    if (isNaN(num)) {
      romanStrEl.value = '';
      romanDetail.innerHTML = '';
      return;
    }
    if (num < 1 || num > 3999) {
      romanStrEl.value = '';
      romanDetail.innerHTML = '<span style="color:var(--un-strong);">❌ 罗马数字仅支持 1-3999</span>';
      return;
    }
    var r = toRoman(num);
    romanStrEl.value = r;
    romanDetail.innerHTML = '解析：' + num + ' = <b>' + r + '</b>';
  }

  function updateRomanFromStr() {
    var str = romanStrEl.value;
    var num = fromRoman(str);
    if (num === null) {
      romanDetail.innerHTML = '<span style="color:var(--un-strong);">❌ 包含非法罗马数字字符（只允许 I V X L C D M）</span>';
      return;
    }
    if (num === 0) {
      romanDetail.innerHTML = '';
      romanNumEl.value = '';
      return;
    }
    if (num > 3999) {
      romanDetail.innerHTML = '<span style="color:var(--un-strong);">⚠️ 结果 ' + num + ' 超出 1-3999 范围</span>';
      return;
    }
    romanNumEl.value = num;
    // 详细分解
    var parts = [];
    var remaining = num;
    for (var i = 0; i < ROMAN_MAP.length; i++) {
      var count = 0;
      while (remaining >= ROMAN_MAP[i].val) {
        remaining -= ROMAN_MAP[i].val;
        count++;
      }
      if (count > 0) {
        parts.push(ROMAN_MAP[i].sym + '×' + count + '=' + (ROMAN_MAP[i].val * count));
      }
    }
    romanDetail.innerHTML = '解析：<b>' + str.toUpperCase() + '</b> = ' + num +
      '<br><span style="font-size:.8rem;color:var(--un-text-muted);">' + parts.join(' + ') + '</span>';
  }

  romanNumEl.addEventListener('input', updateRomanFromNum);
  romanStrEl.addEventListener('input', updateRomanFromStr);
  $('roman-swap').addEventListener('click', function () {
    // 交换逻辑：把当前 num 对应的罗马数字作为新输入源
    var num = parseInt(romanNumEl.value, 10);
    if (!isNaN(num) && num >= 1 && num <= 3999) {
      romanStrEl.focus();
      romanStrEl.select();
    } else if (romanStrEl.value) {
      romanNumEl.focus();
      romanNumEl.select();
    }
    showToast('请输入后自动双向转换');
  });
  updateRomanFromNum();

  /* ================= 5. 字符编码 ================= */
  var charInputEl = $('char-input');
  var charListEl = $('char-list');

  function showCharInfo(input) {
    input = String(input || '').trim();
    charListEl.innerHTML = '';
    if (!input) return;

    var codePoint = null;
    var char = null;

    // 尝试解析为码点
    if (/^U\+[0-9a-fA-F]{1,6}$/.test(input)) {
      codePoint = parseInt(input.slice(2), 16);
    } else if (/^0x[0-9a-fA-F]{1,6}$/i.test(input)) {
      codePoint = parseInt(input.slice(2), 16);
    } else if (/^\d+$/.test(input) && input.length >= 2) {
      codePoint = parseInt(input, 10);
    } else if (/^[0-9a-fA-F]{4,6}$/.test(input) && /[a-fA-F]/.test(input)) {
      // 可能是十六进制
      codePoint = parseInt(input, 16);
    } else {
      // 当作字符
      char = input;
      codePoint = char.codePointAt(0);
    }

    if (codePoint !== null && (codePoint === undefined || isNaN(codePoint) || codePoint < 0 || codePoint > 0x10FFFF)) {
      charListEl.innerHTML = '<div class="un-char-row"><span class="un-char-value">❌ 码点超出有效范围 (0 - 0x10FFFF)</span></div>';
      return;
    }

    if (!char && codePoint !== null) {
      try {
        char = String.fromCodePoint(codePoint);
      } catch (e) {
        charListEl.innerHTML = '<div class="un-char-row"><span class="un-char-value">❌ 无法转换</span></div>';
        return;
      }
    }

    // UTF-8 字节
    var utf8Bytes = [];
    try {
      var encoder = new TextEncoder();
      var bytes = encoder.encode(char);
      for (var i = 0; i < bytes.length; i++) {
        utf8Bytes.push(bytes[i].toString(16).toUpperCase().padStart(2, '0'));
      }
    } catch (e) {}

    // URL 编码
    var urlEncoded = '';
    try {
      urlEncoded = encodeURIComponent(char);
    } catch (e) {
      urlEncoded = '—';
    }

    var rows = [
      { label: '字符', value: char, highlight: true },
      { label: 'Unicode', value: 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0') },
      { label: '十进制', value: String(codePoint) },
      { label: '十六进制', value: '0x' + codePoint.toString(16).toUpperCase() },
      { label: '八进制', value: '0o' + codePoint.toString(8) },
      { label: '二进制', value: '0b' + codePoint.toString(2) },
      { label: 'UTF-8', value: utf8Bytes.length ? utf8Bytes.join(' ') + '（' + utf8Bytes.length + ' 字节）' : '—' },
      { label: 'HTML', value: '&#' + codePoint + ';' },
      { label: 'URL', value: urlEncoded }
    ];

    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'un-char-row';
      row.innerHTML =
        '<span class="un-char-label">' + esc(r.label) + '</span>' +
        '<span class="un-char-value' + (r.highlight ? ' highlight' : '') + '" data-val="' + esc(r.value) + '">' + esc(r.value) + '</span>' +
        '<button class="un-copy-icon" data-copy-val="' + esc(r.value) + '" type="button" title="复制">📋</button>';
      charListEl.appendChild(row);
    });

    charListEl.querySelectorAll('[data-copy-val]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(btn.dataset.copyVal);
      });
    });
  }

  charInputEl.addEventListener('input', function () {
    showCharInfo(charInputEl.value);
  });
  showCharInfo('A');

  /* ================= 6. 颜色格式 ================= */
  var colorInputEl = $('color-input');
  var colorSwatchEl = $('color-swatch');
  var colorHexBigEl = $('color-hex-big');
  var colorListEl = $('color-list');

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s /= 100;
    l /= 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function parseColor(input) {
    input = String(input || '').trim();
    if (!input) return null;

    // HEX
    var m = input.match(/^#?([0-9a-fA-F]{3})$/);
    if (m) {
      var h = m[1];
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
    }
    m = input.match(/^#?([0-9a-fA-F]{6})$/);
    if (m) {
      var h6 = m[1];
      return { r: parseInt(h6.slice(0, 2), 16), g: parseInt(h6.slice(2, 4), 16), b: parseInt(h6.slice(4, 6), 16) };
    }

    // RGB
    m = input.match(/^rgba?\s*\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*[\d.]+)?\s*\)$/i);
    if (m) {
      return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255) };
    }

    // 逗号分隔的 RGB
    m = input.match(/^(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})$/);
    if (m) {
      return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255) };
    }

    // HSL
    m = input.match(/^hsla?\s*\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%(?:\s*[,/]\s*[\d.]+)?\s*\)$/i);
    if (m) {
      return hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    }

    return null;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      return v.toString(16).toUpperCase().padStart(2, '0');
    }).join('');
  }

  function updateColor() {
    var input = colorInputEl.value;
    var rgb = parseColor(input);
    colorListEl.innerHTML = '';

    if (!rgb) {
      colorSwatchEl.style.background = 'transparent';
      colorHexBigEl.textContent = '—';
      colorListEl.innerHTML = '<div class="un-color-row"><span class="un-color-value" style="color:var(--un-strong);">❌ 无法识别的颜色格式</span></div>';
      return;
    }

    var r = rgb.r, g = rgb.g, b = rgb.b;
    var hex = rgbToHex(r, g, b);
    var hsl = rgbToHsl(r, g, b);

    colorSwatchEl.style.background = hex;
    colorHexBigEl.textContent = hex;

    var rows = [
      { label: 'HEX', value: hex },
      { label: 'RGB', value: 'rgb(' + r + ', ' + g + ', ' + b + ')' },
      { label: 'RGBA', value: 'rgba(' + r + ', ' + g + ', ' + b + ', 1)' },
      { label: 'HSL', value: 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)' },
      { label: 'CSS 名', value: '—' }
    ];

    rows.forEach(function (row) {
      var el = document.createElement('div');
      el.className = 'un-color-row';
      el.innerHTML =
        '<span class="un-color-label">' + esc(row.label) + '</span>' +
        '<span class="un-color-value">' + esc(row.value) + '</span>' +
        '<button class="un-copy-icon" data-copy-val="' + esc(row.value) + '" type="button" title="复制">📋</button>';
      colorListEl.appendChild(el);
    });

    colorListEl.querySelectorAll('[data-copy-val]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(btn.dataset.copyVal);
      });
    });
  }

  colorInputEl.addEventListener('input', updateColor);
  updateColor();

})();