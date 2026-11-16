/* js/time-date-tool.js */
(function () {
  'use strict';

  /* ================= 工具 ================= */
  function $(id) { return document.getElementById(id); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = $('td-toast');
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

  function formatDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function formatDateTime(d) {
    return formatDate(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function weekCn(d) {
    return '日一二三四五六'.charAt(d.getDay());
  }

  /* ================= Tabs ================= */
  var tabs = document.querySelectorAll('.td-tab');
  var panels = document.querySelectorAll('.td-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var target = $(tab.dataset.target);
      if (target) target.classList.add('active');
      if (tab.dataset.target === 'panel-timezone') updateTimezones();
    });
  });

  /* ================= 主题 ================= */
  var themeKey = 'td_theme_v1';
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

  /* ================= 复制绑定 ================= */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var target = $(btn.dataset.copy);
    if (!target) return;
    var text = target.textContent || target.value || '';
    text = text.trim();
    if (!text) return;
    copyText(text);
  });

  /* ================= 1. 时间戳 ================= */
  var tsSecEl = $('ts-now-sec');
  var tsMsEl = $('ts-now-ms');

  function updateNowTimestamp() {
    var now = Date.now();
    tsSecEl.textContent = Math.floor(now / 1000);
    tsMsEl.textContent = now;
  }
  updateNowTimestamp();
  setInterval(updateNowTimestamp, 1000);

  function describeRelative(targetMs) {
    var diff = targetMs - Date.now();
    var abs = Math.abs(diff);
    var suffix = diff >= 0 ? '后' : '前';
    var units = [
      { v: 365 * 86400000, n: '年' },
      { v: 30 * 86400000, n: '个月' },
      { v: 7 * 86400000, n: '周' },
      { v: 86400000, n: '天' },
      { v: 3600000, n: '小时' },
      { v: 60000, n: '分钟' },
      { v: 1000, n: '秒' }
    ];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i].v) {
        var n = Math.floor(abs / units[i].v);
        return n + ' ' + units[i].n + suffix;
      }
    }
    return diff >= 0 ? '刚刚' : '刚刚';
  }

  function renderTsResults(d) {
    var resultsEl = $('ts-results');
    var ts = d.getTime();
    var utcStr = d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) +
      'T' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds()) + 'Z';
    var iso = d.toISOString();
    var rfc = d.toUTCString();
    var local = formatDateTime(d) + ' (星期' + weekCn(d) + ')';

    var rows = [
      { label: '本地时间', value: local, highlight: true },
      { label: 'UTC 时间', value: utcStr },
      { label: 'ISO 8601', value: iso },
      { label: 'RFC 2822', value: rfc },
      { label: 'Unix 秒', value: Math.floor(ts / 1000) },
      { label: 'Unix 毫秒', value: ts },
      { label: '相对时间', value: describeRelative(ts) }
    ];

    var html = '';
    rows.forEach(function (r) {
      var hid = 'ts-r-' + r.label.replace(/[\s.]/g, '');
      html += '<div class="td-result-row">' +
        '<span class="td-result-label">' + esc(r.label) + '</span>' +
        '<span class="td-result-value' + (r.highlight ? ' highlight' : '') + '" id="' + hid + '">' + esc(r.value) + '</span>' +
        '<button class="td-mini-btn" data-copy="' + hid + '" title="复制">📋</button>' +
        '</div>';
    });
    resultsEl.innerHTML = html;
  }

  function convertTs() {
    var input = $('ts-input').value.trim();
    if (!input) {
      showToast('请输入时间戳或日期');
      return;
    }
    var d = null;

    // 纯数字：时间戳
    if (/^\d+$/.test(input)) {
      var n = parseInt(input, 10);
      if (input.length === 10) d = new Date(n * 1000);
      else if (input.length === 13) d = new Date(n);
      else if (input.length > 13) d = new Date(Math.floor(n / Math.pow(10, input.length - 13)));
      else d = new Date(n * 1000);
    } else {
      // 尝试 Date 解析
      d = new Date(input);
    }

    if (!d || isNaN(d.getTime())) {
      showToast('无法解析，请检查输入格式');
      $('ts-results').innerHTML = '';
      return;
    }
    renderTsResults(d);
  }

  $('btn-convert-ts').addEventListener('click', convertTs);
  $('ts-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); convertTs(); }
  });

  /* ================= 2. 日期计算 ================= */
  $('calc-date').value = formatDate(new Date());

  function addToDate(d, dir, num, unit) {
    var n = dir * num;
    var r = new Date(d.getTime());
    switch (unit) {
      case 'd': r.setDate(r.getDate() + n); break;
      case 'w': r.setDate(r.getDate() + n * 7); break;
      case 'M': r.setMonth(r.getMonth() + n); break;
      case 'y': r.setFullYear(r.getFullYear() + n); break;
      case 'h': r.setHours(r.getHours() + n); break;
      case 'm': r.setMinutes(r.getMinutes() + n); break;
      case 's': r.setSeconds(r.getSeconds() + n); break;
    }
    return r;
  }

  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d - start) / 86400000) + 1;
  }

  function isoWeek(d) {
    var target = new Date(d.valueOf());
    var dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    var firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  $('btn-calc-date').addEventListener('click', function () {
    var baseStr = $('calc-date').value;
    var dir = parseInt($('calc-dir').value, 10);
    var num = parseInt($('calc-num').value, 10);
    var unit = $('calc-unit').value;
    var outEl = $('calc-out');

    if (!baseStr || isNaN(num)) {
      outEl.textContent = '请输入有效的日期和数量';
      return;
    }
    var base = new Date(baseStr + 'T00:00:00');
    if (isNaN(base.getTime())) {
      outEl.textContent = '日期格式无效';
      return;
    }
    var res = addToDate(base, dir, num, unit);
    var unitLabel = { d: '天', w: '周', M: '月', y: '年', h: '小时', m: '分钟', s: '秒' }[unit];
    outEl.textContent = formatDateTime(res) + ' (星期' + weekCn(res) + ') · 一年中第 ' + dayOfYear(res) + ' 天 · 第 ' + isoWeek(res) + ' 周';
  });

  // 日期差值
  $('diff-from').value = formatDate(new Date());
  var nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  $('diff-to').value = formatDate(nextMonth);

  $('btn-diff').addEventListener('click', function () {
    var fromStr = $('diff-from').value;
    var toStr = $('diff-to').value;
    var outEl = $('diff-out');
    if (!fromStr || !toStr) {
      outEl.textContent = '请选择两个日期';
      return;
    }
    var d1 = new Date(fromStr + 'T00:00:00');
    var d2 = new Date(toStr + 'T00:00:00');
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      outEl.textContent = '日期格式无效';
      return;
    }
    var sign = d2 >= d1 ? 1 : -1;
    var start = sign === 1 ? d1 : d2;
    var end = sign === 1 ? d2 : d1;

    // 精确的年月日
    var y = end.getFullYear() - start.getFullYear();
    var m = end.getMonth() - start.getMonth();
    var dd = end.getDate() - start.getDate();
    if (dd < 0) {
      m--;
      var lastMonthDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
      dd += lastMonthDay;
    }
    if (m < 0) { y--; m += 12; }

    var totalDays = Math.round((end - start) / 86400000);
    var workdays = 0;
    var cur = new Date(start);
    while (cur <= end) {
      var w = cur.getDay();
      if (w !== 0 && w !== 6) workdays++;
      cur.setDate(cur.getDate() + 1);
    }
    var weekends = totalDays + 1 - workdays;
    var hours = totalDays * 24;
    var minutes = hours * 60;

    var dirLabel = sign === 1 ? '' : '（结束早于开始，以下为绝对值）';
    outEl.innerHTML =
      dirLabel +
      '精确间隔: <b>' + y + '</b> 年 <b>' + m + '</b> 月 <b>' + dd + '</b> 天<br>' +
      '总天数: <b>' + totalDays + '</b> 天（' + (totalDays * 24) + ' 小时 / ' + minutes + ' 分钟）<br>' +
      '工作日: ' + workdays + ' 天 · 周末: ' + weekends + ' 天';
  });

  /* ================= 3. 多时区 ================= */
  var DEFAULT_ZONES = [
    { name: '北京', tz: 'Asia/Shanghai' },
    { name: '香港', tz: 'Asia/Hong_Kong' },
    { name: '东京', tz: 'Asia/Tokyo' },
    { name: '首尔', tz: 'Asia/Seoul' },
    { name: '新加坡', tz: 'Asia/Singapore' },
    { name: '迪拜', tz: 'Asia/Dubai' },
    { name: '伦敦', tz: 'Europe/London' },
    { name: '巴黎', tz: 'Europe/Paris' },
    { name: '柏林', tz: 'Europe/Berlin' },
    { name: '莫斯科', tz: 'Europe/Moscow' },
    { name: '纽约', tz: 'America/New_York' },
    { name: '芝加哥', tz: 'America/Chicago' },
    { name: '洛杉矶', tz: 'America/Los_Angeles' },
    { name: '圣保罗', tz: 'America/Sao_Paulo' },
    { name: '悉尼', tz: 'Australia/Sydney' },
    { name: '奥克兰', tz: 'Pacific/Auckland' }
  ];
  var ZONES_PRESET = [
    { name: '台北', tz: 'Asia/Taipei' },
    { name: '曼谷', tz: 'Asia/Bangkok' },
    { name: '孟买', tz: 'Asia/Kolkata' },
    { name: '伊斯坦布尔', tz: 'Europe/Istanbul' },
    { name: '罗马', tz: 'Europe/Rome' },
    { name: '马德里', tz: 'Europe/Madrid' },
    { name: '阿姆斯特丹', tz: 'Europe/Amsterdam' },
    { name: '苏黎世', tz: 'Europe/Zurich' },
    { name: '多伦多', tz: 'America/Toronto' },
    { name: '温哥华', tz: 'America/Vancouver' },
    { name: '墨西哥城', tz: 'America/Mexico_City' },
    { name: '布宜诺斯艾利斯', tz: 'America/Argentina/Buenos_Aires' },
    { name: '墨尔本', tz: 'Australia/Melbourne' },
    { name: '珀斯', tz: 'Australia/Perth' },
    { name: '开罗', tz: 'Africa/Cairo' },
    { name: '约翰内斯堡', tz: 'Africa/Johannesburg' }
  ];

  var zonesKey = 'td_zones_v1';
  var customZones = [];
  try {
    var zraw = localStorage.getItem(zonesKey);
    if (zraw) {
      var parsed = JSON.parse(zraw);
      if (Array.isArray(parsed)) customZones = parsed;
    }
  } catch (e) {}
  if (!Array.isArray(customZones) || customZones.length === 0) {
    customZones = DEFAULT_ZONES.slice();
  }

  function saveZones() {
    try { localStorage.setItem(zonesKey, JSON.stringify(customZones)); } catch (e) {}
  }

  function getNowLocalInput() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) +
      'T' + pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
  }

  var tzBaseEl = $('tz-base');
  if (tzBaseEl && !tzBaseEl.value) tzBaseEl.value = getNowLocalInput();
  tzBaseEl.addEventListener('input', updateTimezones);

  $('btn-tz-now').addEventListener('click', function () {
    tzBaseEl.value = getNowLocalInput();
    updateTimezones();
  });

  $('btn-tz-add').addEventListener('click', function () {
    var avail = ZONES_PRESET.filter(function (z) {
      return !customZones.some(function (c) { return c.tz === z.tz && c.name === z.name; });
    });
    if (avail.length === 0) {
      showToast('所有预设城市都已添加');
      return;
    }
    var names = avail.map(function (z, i) { return (i + 1) + '. ' + z.name; }).join('\n');
    var v = prompt('选择要添加的城市编号：\n' + names, '1');
    if (!v) return;
    var idx = parseInt(v, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= avail.length) { showToast('无效选择'); return; }
    customZones.push(avail[idx]);
    saveZones();
    updateTimezones();
    showToast('已添加：' + avail[idx].name);
  });

  function updateTimezones() {
    var baseVal = tzBaseEl.value;
    var d = baseVal ? new Date(baseVal) : new Date();
    if (isNaN(d.getTime())) return;
    var grid = $('tz-grid');
    grid.innerHTML = '';

    // 本地时区
    var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    var localStr = d.toLocaleString('en-US', { timeZone: localTz, hour12: false });

    customZones.forEach(function (z, idx) {
      var str;
      try {
        str = d.toLocaleString('zh-CN', {
          timeZone: z.tz,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        });
      } catch (e) {
        str = '—';
      }

      // 判断昼夜
      var hour = 12;
      try {
        var h = d.toLocaleString('en-US', { timeZone: z.tz, hour: '2-digit', hour12: false });
        hour = parseInt(h, 10);
      } catch (e) {}
      var isNight = hour < 6 || hour >= 20;
      var icon = isNight ? '🌙' : '☀️';

      // 相对本地时差
      var diffStr = '';
      try {
        var zParts = new Date(str.replace(/[^\d: -]/g, '').trim());
        var offA = d.getTimezoneOffset();
        var offB = -d.toLocaleString('en-US', { timeZone: z.tz, timeZoneName: 'shortOffset' })
          .match(/GMT([+-]?\d+)/)?.[1] * 60 || 0;
      } catch (e) {}

      var card = document.createElement('div');
      card.className = 'tz-card' + (isNight ? ' is-night' : '');
      card.innerHTML =
        '<button class="tz-card-remove" data-idx="' + idx + '" title="移除">×</button>' +
        '<div class="tz-card-header">' +
          '<span class="tz-card-name">' + esc(z.name) + '</span>' +
          '<span class="tz-card-icon">' + icon + '</span>' +
        '</div>' +
        '<div class="tz-card-time">' + esc(str.split(' ')[1] || str) + '</div>' +
        '<div class="tz-card-date">' + esc(str.split(' ')[0] || '') + '</div>';
      grid.appendChild(card);
    });

    grid.querySelectorAll('.tz-card-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = parseInt(btn.dataset.idx, 10);
        if (isNaN(i)) return;
        customZones.splice(i, 1);
        saveZones();
        updateTimezones();
      });
    });
  }

  /* ================= 4. 农历 ================= */
  $('lunar-date').value = formatDate(new Date());

  function getZodiac(month, day) {
    var d = month * 100 + day;
    if (d >= 321 && d <= 419) return '白羊座';
    if (d >= 420 && d <= 520) return '金牛座';
    if (d >= 521 && d <= 621) return '双子座';
    if (d >= 622 && d <= 722) return '巨蟹座';
    if (d >= 723 && d <= 822) return '狮子座';
    if (d >= 823 && d <= 922) return '处女座';
    if (d >= 923 && d <= 1023) return '天秤座';
    if (d >= 1024 && d <= 1122) return '天蝎座';
    if (d >= 1123 && d <= 1221) return '射手座';
    if (d >= 1222 || d <= 119) return '摩羯座';
    if (d >= 120 && d <= 218) return '水瓶座';
    return '双鱼座';
  }

  function getSeason(month) {
    if (month >= 3 && month <= 5) return '🌸 春季';
    if (month >= 6 && month <= 8) return '☀️ 夏季';
    if (month >= 9 && month <= 11) return '🍂 秋季';
    return '❄️ 冬季';
  }

  function calcLunar() {
    var val = $('lunar-date').value;
    var outEl = $('lunar-out');
    if (!val) return;

    var parts = val.split('-');
    var y = parseInt(parts[0], 10);
    var mo = parseInt(parts[1], 10);
    var dy = parseInt(parts[2], 10);

    if (typeof solarlunar === 'undefined') {
      outEl.innerHTML = '<div style="color:#a8452a;padding:16px;grid-column:1/-1;text-align:center;">❌ 农历库 solarlunar.min.js 未加载，请检查 js/libs/ 目录</div>';
      return;
    }
    if (y < 1900 || y > 2100) {
      outEl.innerHTML = '<div style="color:#a8452a;padding:16px;grid-column:1/-1;text-align:center;">⚠️ 农历与节气仅支持 1900 - 2100 年</div>';
      return;
    }

    try {
      var res = solarlunar.solar2lunar(y, mo, dy);
      var weekCn2 = '日一二三四五六'.charAt(new Date(y, mo - 1, dy).getDay());
      var zodiac = getZodiac(mo, dy);
      var season = getSeason(mo);

      var items = [
        { label: '农历日期', value: res.monthCn + res.dayCn },
        { label: '干支纪年', value: res.gzYear + ' ' + res.gzMonth + ' ' + res.gzDay },
        { label: '生肖属相', value: res.animal + ' ' + res.gzYear },
        { label: '节气', value: res.term || '无' },
        { label: '星期', value: '星期' + weekCn2 },
        { label: '星座', value: zodiac },
        { label: '季节', value: season },
        { label: '公历', value: y + '-' + pad2(mo) + '-' + pad2(dy) }
      ];

      outEl.innerHTML = items.map(function (item) {
        return '<div class="lunar-item">' +
          '<span class="label">' + esc(item.label) + '</span>' +
          '<span class="value">' + esc(item.value) + '</span>' +
          '</div>';
      }).join('');
    } catch (e) {
      outEl.innerHTML = '<div style="color:#a8452a;padding:16px;grid-column:1/-1;text-align:center;">❌ 该日期数据异常，请尝试其他日期</div>';
    }
  }
  $('btn-lunar').addEventListener('click', calcLunar);
  $('lunar-date').addEventListener('change', calcLunar);
  setTimeout(calcLunar, 100);

  /* ================= 5. 年龄 ================= */
  $('age-birth').value = '1995-01-01';

  function calcAge() {
    var birthStr = $('age-birth').value;
    var outEl = $('age-out');
    if (!birthStr) { outEl.textContent = '请选择出生日期'; return; }

    var birth = new Date(birthStr + 'T00:00:00');
    if (isNaN(birth.getTime())) { outEl.textContent = '日期无效'; return; }
    var now = new Date();
    now.setHours(0, 0, 0, 0);

    if (birth > now) { outEl.textContent = '出生日期不能晚于今天'; return; }

    var y = now.getFullYear() - birth.getFullYear();
    var m = now.getMonth() - birth.getMonth();
    var d = now.getDate() - birth.getDate();
    if (d < 0) {
      m--;
      var lastMonthDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      d += lastMonthDay;
    }
    if (m < 0) { y--; m += 12; }

    var totalDays = Math.round((now - birth) / 86400000);
    var totalWeeks = Math.floor(totalDays / 7);
    var totalHours = totalDays * 24;

    // 下次生日
    var nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
    var daysUntilBirthday = Math.round((nextBirthday - now) / 86400000);

    var zodiac = getZodiac(birth.getMonth() + 1, birth.getDate());
    var weekCn = '日一二三四五六'.charAt(birth.getDay());

    var html =
      '<div style="font-size:1.05rem;margin-bottom:10px;">你今年 <b style="font-size:1.4rem;">' + y + '</b> 岁 <b>' + m + '</b> 个月 <b>' + d + '</b> 天</div>' +
      '<div style="font-size:.86rem;color:#6b5d47;line-height:1.9;">' +
      '📅 出生: ' + birthStr + '（星期' + weekCn + '）<br>' +
      '♈ 星座: <b>' + zodiac + '</b><br>' +
      '🎂 下次生日: <b>' + formatDate(nextBirthday) + '</b>' +
        (daysUntilBirthday === 0 ? ' · <span style="color:#a8452a;font-weight:bold;">🎉 今天就是你的生日！</span>' :
         ' · 还有 <b>' + daysUntilBirthday + '</b> 天') + '<br>' +
      '⏱ 生命时长: <b>' + totalDays.toLocaleString() + '</b> 天（' + totalWeeks.toLocaleString() + ' 周 / ' + totalHours.toLocaleString() + ' 小时）' +
      '</div>';
    outEl.innerHTML = html;
  }
  $('btn-age').addEventListener('click', calcAge);
  $('age-birth').addEventListener('change', calcAge);

  /* ================= 6. 计时器 ================= */
  // 倒计时
  var cdTimer = null;
  var cdTotalMs = 0;
  var cdRemainMs = 0;

  function getCdSettingMs() {
    var h = parseInt($('cd-h').value, 10) || 0;
    var m = parseInt($('cd-m').value, 10) || 0;
    var s = parseInt($('cd-s').value, 10) || 0;
    h = Math.max(0, Math.min(99, h));
    m = Math.max(0, Math.min(59, m));
    s = Math.max(0, Math.min(59, s));
    return (h * 3600 + m * 60 + s) * 1000;
  }

  function fmtCd(ms) {
    if (ms < 0) ms = 0;
    var total = Math.ceil(ms / 1000);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s);
  }

  function renderCd() {
    var display = $('cd-display');
    display.textContent = fmtCd(cdRemainMs);
    display.classList.toggle('done', cdRemainMs <= 0 && cdTotalMs > 0);
  }

  function stopCdTimer() {
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
  }

  $('btn-cd-start').addEventListener('click', function () {
    if (cdTimer) {
      // 暂停
      stopCdTimer();
      $('btn-cd-start').textContent = '继续';
      return;
    }
    if (cdRemainMs <= 0) {
      cdTotalMs = getCdSettingMs();
      if (cdTotalMs <= 0) { showToast('请设置倒计时时长'); return; }
      cdRemainMs = cdTotalMs;
    }
    var startAt = Date.now();
    var startRemain = cdRemainMs;
    $('btn-cd-start').textContent = '暂停';
    cdTimer = setInterval(function () {
      var elapsed = Date.now() - startAt;
      cdRemainMs = Math.max(0, startRemain - elapsed);
      renderCd();
      if (cdRemainMs <= 0) {
        stopCdTimer();
        $('btn-cd-start').textContent = '开始';
        // 提示音
        try {
          var ac = new (window.AudioContext || window.webkitAudioContext)();
          [880, 1100, 1320].forEach(function (f, i) {
            var o = ac.createOscillator();
            var g = ac.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            var t = ac.currentTime + i * 0.2;
            g.gain.setValueAtTime(0.15, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            o.connect(g); g.connect(ac.destination);
            o.start(t); o.stop(t + 0.42);
          });
        } catch (e) {}
        showToast('⏰ 倒计时结束！');
      }
    }, 100);
  });

  $('btn-cd-reset').addEventListener('click', function () {
    stopCdTimer();
    cdTotalMs = getCdSettingMs();
    cdRemainMs = cdTotalMs;
    $('btn-cd-start').textContent = '开始';
    renderCd();
  });

  ['cd-h', 'cd-m', 'cd-s'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if (!cdTimer) {
        cdTotalMs = getCdSettingMs();
        cdRemainMs = cdTotalMs;
        renderCd();
      }
    });
  });
  // 初始化显示
  (function () {
    cdTotalMs = getCdSettingMs();
    cdRemainMs = cdTotalMs;
    renderCd();
  })();

  // 秒表
  var swTimer = null;
  var swStartAt = 0;
  var swElapsed = 0;
  var swLaps = [];

  function fmtSw(ms) {
    var totalSec = ms / 1000;
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    var cs = Math.floor((ms % 1000) / 10);
    return pad2(m) + ':' + (s < 10 ? '0' : '') + s.toFixed(2).replace(/^0/, '') + '';
  }

  function fmtSw2(ms) {
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    var cs = Math.floor((ms % 1000) / 10);
    return pad2(m) + ':' + pad2(s) + '.' + pad2(cs);
  }

  function renderSw() {
    var ms = swElapsed;
    if (swTimer) ms = swElapsed + (Date.now() - swStartAt);
    $('sw-display').textContent = fmtSw2(ms);
  }

  $('btn-sw-start').addEventListener('click', function () {
    if (swTimer) {
      // 暂停
      swElapsed += Date.now() - swStartAt;
      clearInterval(swTimer);
      swTimer = null;
      $('btn-sw-start').textContent = '继续';
      renderSw();
    } else {
      swStartAt = Date.now();
      swTimer = setInterval(renderSw, 16);
      $('btn-sw-start').textContent = '暂停';
    }
  });

  $('btn-sw-record').addEventListener('click', function () {
    if (!swTimer && swElapsed === 0) { showToast('秒表未运行'); return; }
    var ms = swElapsed;
    if (swTimer) ms += Date.now() - swStartAt;
    swLaps.push(ms);
    renderSwLaps();
  });

  $('btn-sw-reset').addEventListener('click', function () {
    if (swTimer) { clearInterval(swTimer); swTimer = null; }
    swElapsed = 0;
    swStartAt = 0;
    swLaps = [];
    $('btn-sw-start').textContent = '开始';
    renderSw();
    renderSwLaps();
  });

  function renderSwLaps() {
    var el = $('sw-laps');
    if (swLaps.length === 0) { el.innerHTML = ''; return; }
    var html = '';
    var prev = 0;
    swLaps.forEach(function (ms, i) {
      var diff = ms - prev;
      prev = ms;
      html += '<div class="td-lap-item">' +
        '<span class="td-lap-idx">第 ' + (i + 1) + ' 圈</span>' +
        '<span class="td-lap-diff">+' + fmtSw2(diff) + '</span>' +
        '<span class="td-lap-time">' + fmtSw2(ms) + '</span>' +
        '</div>';
    });
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }
  renderSw();

  /* ================= 7. Cron ================= */
  var MONTH_NAMES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  var DOW_NAMES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

  function parseCronField(field, min, max, nameMap) {
    var set = new Set();
    if (!field || field === '*' || field === '?') {
      for (var i = min; i <= max; i++) set.add(i);
      return set;
    }
    field.split(',').forEach(function (part) {
      part = part.trim();
      var step = 1;
      var slashIdx = part.indexOf('/');
      if (slashIdx >= 0) {
        step = parseInt(part.substring(slashIdx + 1), 10) || 1;
        part = part.substring(0, slashIdx);
      }

      function parseVal(token) {
        token = token.trim().toUpperCase();
        if (nameMap && nameMap[token] !== undefined) return nameMap[token];
        var n = parseInt(token, 10);
        return isNaN(n) ? null : n;
      }

      if (part === '*' || part === '?') {
        for (var v = min; v <= max; v += step) set.add(v);
      } else if (part.indexOf('-') >= 0) {
        var idx = part.indexOf('-');
        var a = parseVal(part.substring(0, idx));
        var b = parseVal(part.substring(idx + 1));
        if (a !== null && b !== null) {
          for (var v2 = a; v2 <= b; v2 += step) set.add(v2);
        }
      } else {
        var single = parseVal(part);
        if (single !== null) {
          if (step > 1) {
            for (var v3 = single; v3 <= max; v3 += step) set.add(v3);
          } else {
            set.add(single);
          }
        }
      }
    });
    return set;
  }

  function setToStr(set, isDow) {
    if (set.size === 0) return '无';
    var arr = Array.from(set).sort(function (a, b) { return a - b; });
    if (arr.length === (isDow ? 7 : (arr[arr.length - 1] - arr[0] + 1))) {
      // 看起来是完整范围
      if (isDow && arr.length === 7) return '每天';
    }
    // 检测连续段
    var ranges = [];
    var start = arr[0], prev = arr[0];
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] === prev + 1) { prev = arr[i]; continue; }
      ranges.push(start === prev ? '' + start : start + '-' + prev);
      start = prev = arr[i];
    }
    ranges.push(start === prev ? '' + start : start + '-' + prev);
    return ranges.join(', ');
  }

  function nextCronRuns(cron, count) {
    var results = [];
    var now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + 1);

    var maxDays = 366 * 5;
    var startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    for (var dayOffset = 0; dayOffset < maxDays && results.length < count; dayOffset++) {
      var d = new Date(startDate);
      d.setDate(d.getDate() + dayOffset);
      if (!cron.months.has(d.getMonth() + 1)) continue;

      var domMatch = cron.days.has(d.getDate());
      var dowMatch = cron.weekdays.has(d.getDay());
      var domAny = cron.days.size === 31;
      var dowAny = cron.weekdays.size === 7;
      var dayOK;
      if (domAny && dowAny) dayOK = true;
      else if (domAny) dayOK = dowMatch;
      else if (dowAny) dayOK = domMatch;
      else dayOK = domMatch || dowMatch;
      if (!dayOK) continue;

      var hoursArr = Array.from(cron.hours).sort(function (a, b) { return a - b; });
      var minsArr = Array.from(cron.minutes).sort(function (a, b) { return a - b; });

      for (var hi = 0; hi < hoursArr.length; hi++) {
        for (var mi = 0; mi < minsArr.length; mi++) {
          var t = new Date(d);
          t.setHours(hoursArr[hi], minsArr[mi], 0, 0);
          if (t <= now) continue;
          results.push(t);
          if (results.length >= count) return results;
        }
      }
    }
    return results;
  }

  function cronDesc(minutes, hours, days, months, weekdays) {
    var mAny = minutes.size === 60;
    var hAny = hours.size === 24;
    var dAny = days.size === 31;
    var moAny = months.size === 12;
    var wAny = weekdays.size === 7;

    var parts = [];

    if (mAny && hAny) parts.push('每分钟');
    else if (!mAny && hAny && minutes.size === 1) {
      var mv = Array.from(minutes)[0];
      parts.push(mv === 0 ? '每小时整点' : '每小时第 ' + mv + ' 分');
    } else if (minutes.size === 1 && hours.size === 1) {
      var m1 = Array.from(minutes)[0];
      var h1 = Array.from(hours)[0];
      parts.push(pad2(h1) + ':' + pad2(m1));
    } else if (minutes.size === 1) {
      parts.push(setToStr(hours) + ' 点的 ' + Array.from(minutes)[0] + ' 分');
    } else {
      parts.push('分：' + setToStr(minutes) + ' · 时：' + setToStr(hours));
    }

    if (!dAny) parts.push('每月 ' + setToStr(days) + ' 号');
    else if (moAny && wAny) parts.push('每天');
    if (!moAny) parts.push('月份：' + setToStr(months));
    if (!wAny) {
      var wNames = [];
      weekdays.forEach(function (w) { wNames.push(['周日','周一','周二','周三','周四','周五','周六'][w]); });
      parts.push(wNames.sort().join('、'));
    }

    return parts.join(' · ');
  }

  $('btn-cron').addEventListener('click', function () {
    var raw = $('cron-input').value.trim();
    var outEl = $('cron-out');
    if (!raw) { outEl.textContent = '请输入 cron 表达式'; return; }

    var fields = raw.split(/\s+/);
    if (fields.length !== 5) {
      outEl.innerHTML = '<span style="color:#a8452a;">❌ 需要 5 个字段（分 时 日 月 周），当前 ' + fields.length + ' 个</span>';
      return;
    }

    try {
      var minutes = parseCronField(fields[0], 0, 59);
      var hours = parseCronField(fields[1], 0, 23);
      var days = parseCronField(fields[2], 1, 31);
      var months = parseCronField(fields[3], 1, 12, MONTH_NAMES);
      var wdaysRaw = parseCronField(fields[4], 0, 6, DOW_NAMES);
      // 处理 7 = 周日
      var weekdays = new Set();
      wdaysRaw.forEach(function (v) { weekdays.add(v === 7 ? 0 : v); });

      if (minutes.size === 0 || hours.size === 0 || days.size === 0 || months.size === 0 || weekdays.size === 0) {
        outEl.innerHTML = '<span style="color:#a8452a;">❌ 字段为空，请检查表达式</span>';
        return;
      }

      var cron = { minutes: minutes, hours: hours, days: days, months: months, weekdays: weekdays };
      var desc = cronDesc(minutes, hours, days, months, weekdays);

      var fieldLabels = ['分', '时', '日', '月', '周'];
      var fieldValues = [
        setToStr(minutes),
        setToStr(hours),
        setToStr(days),
        setToStr(months),
        setToStr(weekdays)
      ];
      var fieldHtml = '';
      for (var i = 0; i < 5; i++) {
        fieldHtml += '<div class="td-cron-field">' +
          '<div class="td-cron-field-label">' + fieldLabels[i] + '</div>' +
          '<div class="td-cron-field-value">' + esc(fieldValues[i]) + '</div>' +
          '</div>';
      }

      var nexts = nextCronRuns(cron, 5);
      var nextHtml = '';
      if (nexts.length === 0) {
        nextHtml = '<div style="color:#a8452a;font-size:.84rem;">未来 5 年内未找到匹配时间（可能无效）</div>';
      } else {
        nexts.forEach(function (t) {
          nextHtml += '<div class="td-cron-next-item">' +
            formatDateTime(t) + ' (星期' + weekCn(t) + ')' +
            '</div>';
        });
      }

      outEl.innerHTML =
        '<div class="td-cron-field-grid">' + fieldHtml + '</div>' +
        '<div class="td-cron-desc">📝 ' + esc(desc) + '</div>' +
        '<div class="td-cron-next">⏭ 下次 ' + nexts.length + ' 次运行：</div>' +
        '<div class="td-cron-next-list">' + nextHtml + '</div>';
    } catch (e) {
      outEl.innerHTML = '<span style="color:#a8452a;">❌ 解析失败：' + esc(e.message) + '</span>';
    }
  });
  $('cron-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $('btn-cron').click(); }
  });

  /* ================= 初始化 ================= */
  setTimeout(updateTimezones, 50);

})();