/* js/cron-tool.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var HISTORY_KEY = 'cron_tool_history_v1';
  var THEME_KEY = 'cron_tool_theme_v1';
  var MAX_HISTORY = 20;

  var FIELDS_5 = ['分', '时', '日', '月', '周'];
  var FIELDS_6 = ['秒', '分', '时', '日', '月', '周'];

  var RANGES = {
    second: [0, 59],
    minute: [0, 59],
    hour: [0, 23],
    day: [1, 31],
    month: [1, 12],
    dow: [0, 7]
  };

  var MONTH_NAMES = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  var DOW_NAMES = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
  };
  var DOW_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var MONTH_CN = ['', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月',
    '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

  var MACROS = {
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
    '@monthly': '0 0 1 * *',
    '@weekly': '0 0 * * 0',
    '@daily': '0 0 * * *',
    '@midnight': '0 0 * * *',
    '@hourly': '0 * * * *'
  };

  /* ================= DOM ================= */
  function $(id) { return document.getElementById(id); }

  var crInput = $('cr-input');
  var btnParse = $('btn-cron');
  var fieldsSelect = $('cr-fields');
  var tzSelect = $('cr-timezone');
  var countSelect = $('cr-count');
  var fieldGrid = $('cr-fields-grid');
  var descZh = $('cr-desc-zh');
  var descEn = $('cr-desc-en');
  var timeList = $('cr-list');
  var countLabel = $('cr-count-label');
  var btnExport = $('btn-export');
  var timelineCanvas = $('cr-timeline');
  var matchTimeEl = $('cr-match-time');
  var btnMatchNow = $('btn-match-now');
  var btnMatch = $('btn-match');
  var matchResult = $('cr-match-result');

  var themeBtn = $('btn-theme');
  var historyBtn = $('btn-history');
  var historyCount = $('cr-history-count');
  var historyDrawer = $('cr-history-drawer');
  var historyBackdrop = $('cr-history-backdrop');
  var historyClose = $('cr-history-close');
  var historyList = $('cr-history-list');
  var historyClear = $('cr-history-clear');
  var toastEl = $('cr-toast');

  /* ================= 通用 ================= */
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function copyText(text) {
    if (!text) return;
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

  /* ================= 主题 ================= */
  var theme = 'light';
  try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
  function applyTheme() {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  applyTheme();
  themeBtn.addEventListener('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    applyTheme();
    if (lastValid) drawTimeline();
  });

  /* ================= 时区工具 ================= */
  function getSelectedTz() {
    var v = tzSelect.value;
    return v === 'local' ? null : v;
  }

  function formatDateInTz(date, tz) {
    if (!tz) {
      return date.getFullYear() + '/' + pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) +
        ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds()) +
        ' ' + DOW_CN[date.getDay()];
    }
    try {
      var parts = new Intl.DateTimeFormat('zh-CN', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
        weekday: 'short'
      }).formatToParts(date);
      var p = {};
      parts.forEach(function (x) { p[x.type] = x.value; });
      return p.year + '/' + p.month + '/' + p.day + ' ' +
        p.hour + ':' + p.minute + ':' + p.second + ' ' + (p.weekday || '');
    } catch (e) {
      return date.toISOString();
    }
  }

  function relativeTime(date) {
    var diff = date.getTime() - Date.now();
    if (diff < 0) return '已过期';
    var sec = Math.floor(diff / 1000);
    if (sec < 60) return sec + ' 秒后';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + ' 分钟后';
    var hour = Math.floor(min / 60);
    if (hour < 24) {
      var remMin = min % 60;
      return hour + ' 小时' + (remMin ? ' ' + remMin + ' 分' : '') + '后';
    }
    var day = Math.floor(hour / 24);
    return day + ' 天后';
  }

  /* ================= 字段解析 ================= */
  /**
   * 解析单个字段
   * @param raw 原始字符串
   * @param min 最小值
   * @param max 最大值
   * @param nameMap 名称映射（可选）
   * @return { set: Set, ok: bool, error: string, expanded: string }
   */
  function parseField(raw, min, max, nameMap) {
    raw = String(raw || '').trim();
    if (!raw) return { ok: false, error: '空字段', set: new Set(), expanded: '' };

    var set = new Set();

    function parseVal(token) {
      token = token.trim();
      var lower = token.toLowerCase();
      if (nameMap && nameMap[lower] !== undefined) return nameMap[lower];
      var n = parseInt(token, 10);
      return isNaN(n) ? null : n;
    }

    var parts = raw.split(',');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;

      // */step 或 range/step
      var slashIdx = part.indexOf('/');
      var step = 1;
      var range = part;
      if (slashIdx >= 0) {
        step = parseInt(part.slice(slashIdx + 1), 10);
        if (isNaN(step) || step < 1) {
          return { ok: false, error: '步长无效', set: set, expanded: '' };
        }
        range = part.slice(0, slashIdx);
      }

      var lo = min, hi = max;
      if (range === '*' || range === '?') {
        // 全范围
      } else if (range.indexOf('-') >= 0) {
        var dIdx = range.indexOf('-');
        var a = parseVal(range.slice(0, dIdx));
        var b = parseVal(range.slice(dIdx + 1));
        if (a === null || b === null) {
          return { ok: false, error: '范围无效', set: set, expanded: '' };
        }
        lo = a; hi = b;
      } else {
        // 单值
        var v = parseVal(range);
        if (v === null) {
          return { ok: false, error: '含非法字符', set: set, expanded: '' };
        }
        if (slashIdx >= 0) {
          // "5/10" 表示从 5 开始，每 10
          lo = v; hi = max;
        } else {
          if (v < min || v > max) {
            return { ok: false, error: '超出范围 ' + min + '-' + max, set: set, expanded: '' };
          }
          set.add(v);
          continue;
        }
      }

      if (lo > hi) {
        return { ok: false, error: '范围起点大于终点', set: set, expanded: '' };
      }
      for (var n2 = lo; n2 <= hi; n2 += step) {
        if (n2 >= min && n2 <= max) set.add(n2);
      }
    }

    // 展开显示
    var arr = Array.from(set).sort(function (a, b) { return a - b; });
    var expanded = arr.join(',');
    if (expanded.length > 30) expanded = expanded.slice(0, 28) + '…';

    return { ok: true, error: '', set: set, expanded: expanded, arr: arr };
  }

  /* ================= 反转 cron（快捷宏） ================= */
  function normalizeCron(raw) {
    var trimmed = String(raw || '').trim();
    var lower = trimmed.toLowerCase();
    if (MACROS[lower]) return { cron: MACROS[lower], isMacro: true, original: trimmed };
    return { cron: trimmed, isMacro: false, original: trimmed };
  }

  /* ================= 人类描述（中文） ================= */
  function describeCronZh(parsed, isSix) {
    // parsed: { second, minute, hour, day, month, dow }
    var sec = parsed.second, min = parsed.minute, hour = parsed.hour,
        day = parsed.day, month = parsed.month, dow = parsed.dow;

    var secFull = sec ? sec.set.size === 60 : true;
    var minFull = min.set.size === 60;
    var hourFull = hour.set.size === 24;
    var dayFull = day.set.size === 31;
    var monthFull = month.set.size === 12;
    // dow 7 和 0 都是周日
    var dowSet = new Set();
    if (dow) dow.set.forEach(function (v) { dowSet.add(v === 7 ? 0 : v); });
    var dowFull = dowSet.size === 7;

    var parts = [];

    // 秒级
    if (isSix && sec) {
      if (sec.set.size === 1 && sec.set.has(0) && minFull && hourFull) {
        // "每分钟" 的 6 段特例
      } else if (sec.set.size === 1 && !minFull && hourFull) {
        // 忽略
      } else if (!secFull) {
        if (sec.set.size === 1) {
          // 稍后详述
        } else {
          parts.push('秒：' + formatSet(sec.arr, '秒', 60));
        }
      }
    }

    // 分钟
    if (minFull && hourFull) {
      if (isSix && sec && !secFull) {
        // 已在秒中描述
      } else if (!isSix || (sec && sec.set.size === 1 && sec.set.has(0))) {
        parts.push('每分钟');
      }
    } else if (min.set.size === 1 && hourFull) {
      var mv = min.arr[0];
      parts.push(mv === 0 ? '每小时整点' : '每小时第 ' + mv + ' 分钟');
    } else if (!minFull) {
      if (min.set.size === 1 && !hourFull) {
        // 稍后组合
      } else {
        parts.push('分钟：' + formatSet(min.arr, '分', 60));
      }
    }

    // 小时
    if (!hourFull) {
      if (hour.set.size === 1 && min.set.size === 1) {
        // 组合成 "HH:MM"
        parts.push(pad2(hour.arr[0]) + ':' + pad2(min.arr[0]));
      } else if (hour.set.size === 1) {
        parts.push(pad2(hour.arr[0]) + ' 点');
      } else if (hour.set.size === 24 / 2 || hour.set.size <= 12) {
        parts.push('小时：' + formatSet(hour.arr, '时', 24));
      } else {
        parts.push('小时：' + formatSet(hour.arr, '时', 24));
      }
    }

    // 日
    if (!dayFull) {
      parts.push(formatDay(day.arr));
    }

    // 月
    if (!monthFull) {
      parts.push('月份：' + formatSet(month.arr.map(function (v) { return MONTH_CN[v] || v; }), '月', 12));
    }

    // 周
    if (!dowFull) {
      var names = Array.from(dowSet).sort().map(function (v) { return DOW_CN[v] || v; });
      // 检测连续段
      var groups = groupConsecutive(Array.from(dowSet).sort());
      var label = groups.map(function (g) {
        if (g.length >= 3) {
          return DOW_CN[g[0]] + ' 到 ' + DOW_CN[g[g.length - 1]];
        }
        return g.map(function (v) { return DOW_CN[v]; }).join('、');
      }).join('，');
      parts.push(label);
    }

    // 兜底
    if (parts.length === 0) {
      if (!isSix) return '<b>每分钟</b>执行一次';
      return '<b>每秒</b>执行一次';
    }

    // 前部拼接
    var text = parts.join(' · ');
    return '<b>' + esc(text) + '</b> 执行';
  }

  function groupConsecutive(arr) {
    if (!arr.length) return [];
    var groups = [[arr[0]]];
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] === arr[i - 1] + 1) {
        groups[groups.length - 1].push(arr[i]);
      } else {
        groups.push([arr[i]]);
      }
    }
    return groups;
  }

  function formatSet(arr, unit, max) {
    if (arr.length === max) return '全部' + unit;
    if (arr.length > 10) {
      // 检测等间隔
      var step = arr[1] - arr[0];
      var isStep = true;
      for (var i = 2; i < arr.length; i++) {
        if (arr[i] - arr[i - 1] !== step) { isStep = false; break; }
      }
      if (isStep && step > 0) {
        return '每 ' + step + ' ' + unit + '（' + arr[0] + '-' + arr[arr.length - 1] + '）';
      }
      return arr.slice(0, 10).join(',') + '…';
    }
    // 检测连续段
    var groups = groupConsecutive(arr);
    return groups.map(function (g) {
      if (g.length === 1) return String(g[0]);
      if (g.length === 2) return g[0] + ',' + g[1];
      return g[0] + '-' + g[g.length - 1];
    }).join(',');
  }

  function formatDay(arr) {
    if (arr.length === 31) return '每天';
    var groups = groupConsecutive(arr);
    return '每月 ' + groups.map(function (g) {
      if (g.length === 1) return g[0] + ' 号';
      if (g.length === 2) return g[0] + ',' + g[1] + ' 号';
      return g[0] + '-' + g[g.length - 1] + ' 号';
    }).join('，');
  }

  /* ================= 人类描述（英文） ================= */
  function describeCronEn(parsed, isSix) {
    var sec = parsed.second, min = parsed.minute, hour = parsed.hour,
        day = parsed.day, month = parsed.month, dow = parsed.dow;

    var parts = [];

    var minFull = min.set.size === 60;
    var hourFull = hour.set.size === 24;
    var dayFull = day.set.size === 31;
    var monthFull = month.set.size === 12;
    var dowSet = new Set();
    if (dow) dow.set.forEach(function (v) { dowSet.add(v === 7 ? 0 : v); });
    var dowFull = dowSet.size === 7;
    var secFull = sec ? sec.set.size === 60 : true;

    // 秒
    if (isSix && sec && !secFull) {
      if (sec.set.size === 1 && sec.set.has(0)) {
        // skip
      } else {
        parts.push('at second ' + formatSetEn(sec.arr, 'second'));
      }
    }

    // 分钟 + 小时
    if (minFull && hourFull) {
      if (isSix && sec && !secFull) {
        // skip
      } else if (!isSix || (sec && sec.set.size === 1 && sec.set.has(0))) {
        parts.push('every minute');
      }
    } else if (min.set.size === 1 && hourFull) {
      var mv = min.arr[0];
      parts.push(mv === 0 ? 'every hour at minute 0' : 'every hour at minute ' + mv);
    } else if (min.set.size === 1 && hour.set.size === 1) {
      parts.push('at ' + pad2(hour.arr[0]) + ':' + pad2(min.arr[0]));
    } else if (!minFull && !hourFull) {
      parts.push('at minute ' + formatSetEn(min.arr, 'minute') + ' of hour ' + formatSetEn(hour.arr, 'hour'));
    } else if (!minFull) {
      parts.push('at minute ' + formatSetEn(min.arr, 'minute'));
    } else {
      parts.push('at hour ' + formatSetEn(hour.arr, 'hour'));
    }

    // 日
    if (!dayFull) {
      parts.push('on day ' + formatSetEn(day.arr, 'day') + ' of month');
    }

    // 月
    if (!monthFull) {
      parts.push('in month ' + formatSetEn(month.arr, 'month'));
    }

    // 周
    if (!dowFull) {
      var names = Array.from(dowSet).sort().map(function (v) {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][v];
      });
      parts.push('on ' + names.join(', '));
    }

    if (parts.length === 0) {
      return isSix ? 'Every second' : 'Every minute';
    }

    var text = parts.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatSetEn(arr, unit) {
    var maxMap = { second: 60, minute: 60, hour: 24, day: 31, month: 12 };
    var max = maxMap[unit] || 60;
    if (arr.length === max) return 'every ' + unit;
    if (arr.length > 6) {
      var step = arr[1] - arr[0];
      var isStep = true;
      for (var i = 2; i < arr.length; i++) {
        if (arr[i] - arr[i - 1] !== step) { isStep = false; break; }
      }
      if (isStep && step > 0) return 'every ' + step + ' ' + unit + 's';
      return arr.slice(0, 6).join(', ') + '…';
    }
    return arr.join(', ');
  }

  /* ================= 主解析 ================= */
  var lastValid = null;

  function parseCron() {
    var raw = crInput.value.trim();
    crInput.classList.remove('error');

    // 快捷宏
    var norm = normalizeCron(raw);
    var expr = norm.cron;

    // 拆分字段
    var parts = expr.split(/\s+/).filter(Boolean);
    var fieldCount = parseInt(fieldsSelect.value, 10);
    if (fieldsSelect.value === 'auto') {
      if (parts.length === 6) fieldCount = 6;
      else if (parts.length === 5) fieldCount = 5;
      else fieldCount = parts.length;
    }

    if (fieldCount !== 5 && fieldCount !== 6) {
      renderError('字段数量不合法：' + parts.length + ' 个（仅支持 5 或 6 字段）');
      crInput.classList.add('error');
      return;
    }
    if (parts.length !== fieldCount) {
      renderError('字段数量与所选不符：期望 ' + fieldCount + '，实际 ' + parts.length);
      crInput.classList.add('error');
      return;
    }

    // 逐字段解析
    var isSix = fieldCount === 6;
    var labels = isSix ? FIELDS_6 : FIELDS_5;
    var keys = isSix
      ? ['second', 'minute', 'hour', 'day', 'month', 'dow']
      : ['minute', 'hour', 'day', 'month', 'dow'];

    var parsed = {};
    var hasError = false;
    var html = '';

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var rawVal = parts[i];
      var range = RANGES[key];
      var nameMap = key === 'month' ? MONTH_NAMES
                   : key === 'dow' ? DOW_NAMES
                   : null;

      var res = parseField(rawVal, range[0], range[1], nameMap);
      parsed[key] = res;
      if (!res.ok) hasError = true;

      html += '<div class="cr-field' + (res.ok ? '' : ' invalid') + '">' +
        '<div class="cr-field-label">' + labels[i] + '</div>' +
        '<div class="cr-field-value">' + esc(rawVal) + '</div>' +
        '<div class="cr-field-expanded">' + (res.ok ? esc(res.expanded || '—') : '') + '</div>' +
        (res.ok ? '' : '<div class="cr-field-error">' + esc(res.error) + '</div>') +
        '</div>';
    }

    fieldGrid.className = 'cr-field-grid fields-' + fieldCount;
    fieldGrid.innerHTML = html;

    if (hasError) {
      descZh.innerHTML = '<span style="color:var(--cr-danger)">⚠️ 有字段解析失败，请检查上方标红项</span>';
      descZh.classList.add('error');
      descEn.textContent = '';
      timeList.innerHTML = '<li class="empty">请先修复字段错误</li>';
      lastValid = null;
      return;
    }
    descZh.classList.remove('error');

    // 中文描述
    try {
      descZh.innerHTML = describeCronZh(parsed, isSix);
    } catch (e) {
      descZh.textContent = '描述生成失败';
    }

    // 英文描述
    try {
      descEn.textContent = describeCronEn(parsed, isSix);
    } catch (e) {
      descEn.textContent = '';
    }

    // 用 Croner 计算未来时间
    var CronClass = window.Cron || window.croner;
    if (typeof CronClass === 'undefined') {
      timeList.innerHTML = '<li class="empty" style="color:var(--cr-danger)">❌ Croner 库未加载（检查 js/libs/croner.min.js）</li>';
      return;
    }

    var tz = getSelectedTz();
    var cronOpts = {};
    if (tz) cronOpts.timezone = tz;

    var cron;
    try {
      cron = new CronClass(expr, cronOpts);
    } catch (e) {
      renderError('Croner 拒绝解析：' + e.message);
      return;
    }

    var count = parseInt(countSelect.value, 10) || 10;
    countLabel.textContent = '(' + count + ')';

    var nexts = [];
    var current = new Date();
    try {
      for (var k = 0; k < count; k++) {
        var next = cron.nextRun(current);
        if (!next) break;
        nexts.push(next);
        current = new Date(next.getTime() + 1000); // 避免重复
      }
    } catch (e) {
      renderError('计算未来时间失败：' + e.message);
      return;
    }

    if (nexts.length === 0) {
      timeList.innerHTML = '<li class="empty">该表达式在未来 5 年内不会触发</li>';
    } else {
      var listHtml = '';
      nexts.forEach(function (d) {
        var abs = formatDateInTz(d, tz);
        listHtml += '<li>' +
          '<span class="cr-time-abs">' + esc(abs) + '</span>' +
          '<span class="cr-time-rel">' + esc(relativeTime(d)) + '</span>' +
          '</li>';
      });
      timeList.innerHTML = listHtml;
    }

    // 缓存有效解析结果
    lastValid = {
      parsed: parsed,
      expr: expr,
      isSix: isSix,
      tz: tz,
      nexts: nexts
    };

    // 画时间轴
    drawTimeline();

    // 保存历史
    if (norm.original && norm.original !== '') {
      addToHistory(norm.original);
    }
  }

  function renderError(msg) {
    fieldGrid.innerHTML = '';
    fieldGrid.className = 'cr-field-grid fields-5';
    descZh.innerHTML = '<span style="color:var(--cr-danger)">❌ ' + esc(msg) + '</span>';
    descZh.classList.add('error');
    descEn.textContent = '';
    timeList.innerHTML = '<li class="empty">请检查表达式</li>';
    lastValid = null;
    if (timelineCanvas) {
      var ctx = timelineCanvas.getContext('2d');
      ctx.clearRect(0, 0, timelineCanvas.width, timelineCanvas.height);
    }
  }

  /* ================= 24h 时间轴 ================= */
  function drawTimeline() {
    if (!timelineCanvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = timelineCanvas.clientWidth || 800;
    var H = 90;
    timelineCanvas.width = W * dpr;
    timelineCanvas.height = H * dpr;
    var ctx = timelineCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var isDark = document.body.classList.contains('theme-dark');
    var gridColor = isDark ? '#3d362c' : '#ddcfb3';
    var textColor = isDark ? '#8a7a5f' : '#a0947c';
    var eventColor = isDark ? '#d4a05f' : '#8a5a2b';

    var pad = { top: 24, bottom: 24, left: 40, right: 20 };
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;
    var yMid = pad.top + chartH / 2;

    // 时间轴主线
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, yMid);
    ctx.lineTo(W - pad.right, yMid);
    ctx.stroke();

    // 时间刻度
    var now = new Date();
    var nowHour = now.getHours();
    var nowMin = now.getMinutes();
    for (var h = 0; h <= 24; h += 3) {
      var x = pad.left + (h / 24) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, yMid - 6);
      ctx.lineTo(x, yMid + 6);
      ctx.strokeStyle = gridColor;
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(pad2(h % 24) + ':00', x, yMid + 12);
    }

    // 现在标记
    var nowX = pad.left + ((nowHour * 60 + nowMin) / (24 * 60)) * chartW;
    ctx.strokeStyle = eventColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nowX, pad.top - 4);
    ctx.lineTo(nowX, yMid + 8);
    ctx.stroke();
    ctx.fillStyle = eventColor;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('NOW', nowX, pad.top - 6);

    // 未来 24 小时的事件
    if (lastValid && lastValid.nexts) {
      var startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      var events = lastValid.nexts.filter(function (d) {
        return d >= startTime && d < endTime;
      });

      // 如果事件太多则聚合
      var drawEvents = events;
      var aggregated = false;
      if (events.length > 200) {
        // 按分钟聚合
        var minuteBuckets = {};
        events.forEach(function (d) {
          var key = d.getHours() * 60 + d.getMinutes();
          minuteBuckets[key] = (minuteBuckets[key] || 0) + 1;
        });
        drawEvents = Object.keys(minuteBuckets).map(function (k) {
          var mins = parseInt(k, 10);
          var d = new Date(startTime.getTime() + mins * 60000);
          return { date: d, count: minuteBuckets[k] };
        });
        aggregated = true;
      }

      drawEvents.forEach(function (e) {
        var d = e.date || e;
        var mins = d.getHours() * 60 + d.getMinutes();
        var x = pad.left + (mins / (24 * 60)) * chartW;
        var dotR = aggregated ? Math.min(8, 2 + Math.log2((e.count || 1) + 1)) : 3;
        ctx.beginPath();
        ctx.arc(x, yMid, dotR, 0, Math.PI * 2);
        ctx.fillStyle = eventColor;
        ctx.fill();
        // 向上的竖线
        ctx.strokeStyle = eventColor;
        ctx.lineWidth = aggregated ? 2 : 1.2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(x, yMid - dotR - 2);
        ctx.lineTo(x, pad.top + 4);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // 提示文字
      ctx.fillStyle = textColor;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      var totalCount = events.length;
      ctx.fillText(
        '未来 24 小时触发 ' + totalCount + ' 次' +
        (aggregated ? '（按分钟聚合）' : ''),
        pad.left, pad.top - 4
      );
    }
  }

  /* ================= 反向匹配测试 ================= */
  function testMatch() {
    if (!lastValid) {
      matchResult.innerHTML = '<span style="color:var(--cr-danger)">请先解析一个有效表达式</span>';
      return;
    }
    var raw = matchTimeEl.value;
    if (!raw) {
      matchResult.innerHTML = '<span style="color:var(--cr-danger)">请选择时间</span>';
      return;
    }

    var target = new Date(raw);
    if (isNaN(target.getTime())) {
      matchResult.innerHTML = '<span style="color:var(--cr-danger)">时间格式无效</span>';
      return;
    }

    var CronClass = window.Cron || window.croner;
    if (!CronClass) {
      matchResult.innerHTML = '<span style="color:var(--cr-danger)">Croner 未加载</span>';
      return;
    }

    var tz = lastValid.tz;
    var opts = {};
    if (tz) opts.timezone = tz;

    var cron;
    try { cron = new CronClass(lastValid.expr, opts); }
    catch (e) {
      matchResult.innerHTML = '<span style="color:var(--cr-danger)">Cron 构造失败：' + esc(e.message) + '</span>';
      return;
    }

    // Croner 的 nextRun / previousRuns 可用于判断
    var isMatch = false;
    try {
      // 用一个"目标前一秒"的 Date 调用 nextRun 看结果是否为 target
      var before = new Date(target.getTime() - 1000);
      var nr = cron.nextRun(before);
      if (nr && Math.abs(nr.getTime() - target.getTime()) < 1000) isMatch = true;
    } catch (e) {}

    var html = '';
    if (isMatch) {
      html += '<span class="cr-match-badge yes">✓ 匹配</span>';
      html += '该时间符合表达式 <code>' + esc(lastValid.expr) + '</code>';
    } else {
      html += '<span class="cr-match-badge no">✗ 不匹配</span>';
      html += '该时间不符合表达式 <code>' + esc(lastValid.expr) + '</code>';
      // 前后最近的匹配
      try {
        var next = cron.nextRun(target);
        // previousRuns 在新版 croner 里叫 previousRuns，老版可能没有
        var prev = null;
        if (typeof cron.previousRuns === 'function') {
          var prevArr = cron.previousRuns(1, target);
          if (prevArr && prevArr.length) prev = prevArr[0];
        }
        html += '<div style="margin-top:8px;color:var(--cr-text-muted);font-size:.82rem;">';
        if (prev) {
          html += '⬅ 上次匹配：' + esc(formatDateInTz(prev, tz)) + '<br>';
        }
        if (next) {
          html += '➡ 下次匹配：' + esc(formatDateInTz(next, tz));
        }
        html += '</div>';
      } catch (e) {}
    }
    matchResult.innerHTML = html;
  }

  /* ================= 导出 CSV ================= */
  function exportCSV() {
    if (!lastValid || !lastValid.nexts || lastValid.nexts.length === 0) {
      showToast('没有可导出的时间');
      return;
    }
    var lines = ['序号,时间,相对时间,时区'];
    lastValid.nexts.forEach(function (d, i) {
      lines.push([
        (i + 1),
        '"' + formatDateInTz(d, lastValid.tz) + '"',
        '"' + relativeTime(d) + '"',
        lastValid.tz || 'local'
      ].join(','));
    });
    var csv = lines.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var d = new Date();
    var ts = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cron-times-' + ts + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📤 已导出 CSV');
  }

  /* ================= 历史记录 ================= */
  var history = [];
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (raw) history = JSON.parse(raw) || [];
    } catch (e) { history = []; }
    if (!Array.isArray(history)) history = [];
  }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
  }
  function addToHistory(expr) {
    if (!expr) return;
    var idx = history.findIndex(function (h) { return h.expr === expr; });
    if (idx >= 0) history.splice(idx, 1);
    history.unshift({ expr: expr, ts: Date.now() });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();
    renderHistoryCount();
  }
  function renderHistoryCount() {
    historyCount.textContent = history.length;
  }
  function renderHistoryList() {
    if (history.length === 0) {
      historyList.innerHTML = '<p class="cr-history-empty">暂无记录</p>';
      return;
    }
    var html = '';
    history.forEach(function (h, idx) {
      var d = new Date(h.ts);
      var meta = d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) +
        ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      html += '<div class="cr-history-item" data-idx="' + idx + '">' +
        '<div>' + esc(h.expr) + '</div>' +
        '<div class="cr-history-item-meta">' + meta + '</div>' +
        '<button class="cr-history-del" data-del="' + idx + '" title="删除">✕</button>' +
        '</div>';
    });
    historyList.innerHTML = html;
  }
  function openHistory() {
    renderHistoryList();
    historyBackdrop.hidden = false;
    historyDrawer.classList.add('open');
  }
  function closeHistory() {
    historyBackdrop.hidden = true;
    historyDrawer.classList.remove('open');
  }

  historyBtn.addEventListener('click', openHistory);
  historyClose.addEventListener('click', closeHistory);
  historyBackdrop.addEventListener('click', closeHistory);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && historyDrawer.classList.contains('open')) closeHistory();
  });

  historyClear.addEventListener('click', function () {
    if (!confirm('清空所有历史记录？')) return;
    history = [];
    saveHistory();
    renderHistoryCount();
    renderHistoryList();
    showToast('🗑 已清空历史');
  });

  historyList.addEventListener('click', function (e) {
    var del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      var di = parseInt(del.dataset.del, 10);
      if (!isNaN(di)) {
        history.splice(di, 1);
        saveHistory();
        renderHistoryCount();
        renderHistoryList();
      }
      return;
    }
    var item = e.target.closest('.cr-history-item');
    if (!item) return;
    var idx = parseInt(item.dataset.idx, 10);
    if (isNaN(idx) || !history[idx]) return;
    crInput.value = history[idx].expr;
    closeHistory();
    parseCron();
  });

  /* ================= 事件绑定 ================= */
  btnParse.addEventListener('click', parseCron);
  crInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      parseCron();
    }
  });
  fieldsSelect.addEventListener('change', parseCron);
  tzSelect.addEventListener('change', parseCron);
  countSelect.addEventListener('change', parseCron);
  btnExport.addEventListener('click', exportCSV);

  document.querySelectorAll('.cr-tag').forEach(function (tag) {
    tag.addEventListener('click', function () {
      crInput.value = tag.dataset.cron;
      parseCron();
    });
  });

  // 双击输入框选中全部
  crInput.addEventListener('dblclick', function () {
    crInput.select();
  });

  // 复制表达式
  descZh.addEventListener('dblclick', function () {
    copyText(crInput.value);
  });

  // 反向匹配
  btnMatch.addEventListener('click', testMatch);
  btnMatchNow.addEventListener('click', function () {
    var now = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    matchTimeEl.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
      'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  });
  matchTimeEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); testMatch(); }
  });

  // 窗口大小变化重绘时间轴
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (lastValid) drawTimeline();
    }, 200);
  });

  /* ================= 初始化 ================= */
  loadHistory();
  renderHistoryCount();

  // 填入当前时间
  (function () {
    var now = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    matchTimeEl.value = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
      'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  })();

  // 首次解析
  setTimeout(parseCron, 60);

})();