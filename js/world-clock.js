/* js/world-clock.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.worldclock.v2';
  var HISTORY_KEY = 'tool.worldclock.history.v1';
  var MAX_HISTORY = 30;

  /* ============ 城市数据 ============ */
  var CITIES = [
    // 亚洲
    { name: '北京', country: '中国', tz: 'Asia/Shanghai' },
    { name: '上海', country: '中国', tz: 'Asia/Shanghai' },
    { name: '香港', country: '中国', tz: 'Asia/Hong_Kong' },
    { name: '台北', country: '中国', tz: 'Asia/Taipei' },
    { name: '东京', country: '日本', tz: 'Asia/Tokyo' },
    { name: '大阪', country: '日本', tz: 'Asia/Tokyo' },
    { name: '首尔', country: '韩国', tz: 'Asia/Seoul' },
    { name: '新加坡', country: '新加坡', tz: 'Asia/Singapore' },
    { name: '曼谷', country: '泰国', tz: 'Asia/Bangkok' },
    { name: '吉隆坡', country: '马来西亚', tz: 'Asia/Kuala_Lumpur' },
    { name: '雅加达', country: '印度尼西亚', tz: 'Asia/Jakarta' },
    { name: '马尼拉', country: '菲律宾', tz: 'Asia/Manila' },
    { name: '河内', country: '越南', tz: 'Asia/Ho_Chi_Minh' },
    { name: '胡志明市', country: '越南', tz: 'Asia/Ho_Chi_Minh' },
    { name: '新德里', country: '印度', tz: 'Asia/Kolkata' },
    { name: '孟买', country: '印度', tz: 'Asia/Kolkata' },
    { name: '卡拉奇', country: '巴基斯坦', tz: 'Asia/Karachi' },
    { name: '达卡', country: '孟加拉国', tz: 'Asia/Dhaka' },
    { name: '迪拜', country: '阿联酋', tz: 'Asia/Dubai' },
    { name: '阿布扎比', country: '阿联酋', tz: 'Asia/Dubai' },
    { name: '利雅得', country: '沙特阿拉伯', tz: 'Asia/Riyadh' },
    { name: '德黑兰', country: '伊朗', tz: 'Asia/Tehran' },
    { name: '特拉维夫', country: '以色列', tz: 'Asia/Jerusalem' },
    { name: '伊斯坦布尔', country: '土耳其', tz: 'Europe/Istanbul' },
    // 欧洲
    { name: '伦敦', country: '英国', tz: 'Europe/London' },
    { name: '巴黎', country: '法国', tz: 'Europe/Paris' },
    { name: '柏林', country: '德国', tz: 'Europe/Berlin' },
    { name: '法兰克福', country: '德国', tz: 'Europe/Berlin' },
    { name: '慕尼黑', country: '德国', tz: 'Europe/Berlin' },
    { name: '罗马', country: '意大利', tz: 'Europe/Rome' },
    { name: '米兰', country: '意大利', tz: 'Europe/Rome' },
    { name: '马德里', country: '西班牙', tz: 'Europe/Madrid' },
    { name: '巴塞罗那', country: '西班牙', tz: 'Europe/Madrid' },
    { name: '阿姆斯特丹', country: '荷兰', tz: 'Europe/Amsterdam' },
    { name: '布鲁塞尔', country: '比利时', tz: 'Europe/Brussels' },
    { name: '苏黎世', country: '瑞士', tz: 'Europe/Zurich' },
    { name: '日内瓦', country: '瑞士', tz: 'Europe/Zurich' },
    { name: '维也纳', country: '奥地利', tz: 'Europe/Vienna' },
    { name: '斯德哥尔摩', country: '瑞典', tz: 'Europe/Stockholm' },
    { name: '奥斯陆', country: '挪威', tz: 'Europe/Oslo' },
    { name: '哥本哈根', country: '丹麦', tz: 'Europe/Copenhagen' },
    { name: '赫尔辛基', country: '芬兰', tz: 'Europe/Helsinki' },
    { name: '莫斯科', country: '俄罗斯', tz: 'Europe/Moscow' },
    { name: '圣彼得堡', country: '俄罗斯', tz: 'Europe/Moscow' },
    { name: '基辅', country: '乌克兰', tz: 'Europe/Kiev' },
    { name: '华沙', country: '波兰', tz: 'Europe/Warsaw' },
    { name: '布拉格', country: '捷克', tz: 'Europe/Prague' },
    { name: '雅典', country: '希腊', tz: 'Europe/Athens' },
    { name: '里斯本', country: '葡萄牙', tz: 'Europe/Lisbon' },
    { name: '都柏林', country: '爱尔兰', tz: 'Europe/Dublin' },
    // 美洲
    { name: '纽约', country: '美国', tz: 'America/New_York' },
    { name: '华盛顿', country: '美国', tz: 'America/New_York' },
    { name: '波士顿', country: '美国', tz: 'America/New_York' },
    { name: '迈阿密', country: '美国', tz: 'America/New_York' },
    { name: '芝加哥', country: '美国', tz: 'America/Chicago' },
    { name: '达拉斯', country: '美国', tz: 'America/Chicago' },
    { name: '休斯顿', country: '美国', tz: 'America/Chicago' },
    { name: '丹佛', country: '美国', tz: 'America/Denver' },
    { name: '凤凰城', country: '美国', tz: 'America/Phoenix' },
    { name: '洛杉矶', country: '美国', tz: 'America/Los_Angeles' },
    { name: '旧金山', country: '美国', tz: 'America/Los_Angeles' },
    { name: '西雅图', country: '美国', tz: 'America/Los_Angeles' },
    { name: '拉斯维加斯', country: '美国', tz: 'America/Los_Angeles' },
    { name: '多伦多', country: '加拿大', tz: 'America/Toronto' },
    { name: '蒙特利尔', country: '加拿大', tz: 'America/Toronto' },
    { name: '温哥华', country: '加拿大', tz: 'America/Vancouver' },
    { name: '墨西哥城', country: '墨西哥', tz: 'America/Mexico_City' },
    { name: '圣保罗', country: '巴西', tz: 'America/Sao_Paulo' },
    { name: '里约热内卢', country: '巴西', tz: 'America/Sao_Paulo' },
    { name: '布宜诺斯艾利斯', country: '阿根廷', tz: 'America/Argentina/Buenos_Aires' },
    { name: '圣地亚哥', country: '智利', tz: 'America/Santiago' },
    { name: '利马', country: '秘鲁', tz: 'America/Lima' },
    // 大洋洲
    { name: '悉尼', country: '澳大利亚', tz: 'Australia/Sydney' },
    { name: '墨尔本', country: '澳大利亚', tz: 'Australia/Melbourne' },
    { name: '布里斯班', country: '澳大利亚', tz: 'Australia/Brisbane' },
    { name: '珀斯', country: '澳大利亚', tz: 'Australia/Perth' },
    { name: '阿德莱德', country: '澳大利亚', tz: 'Australia/Adelaide' },
    { name: '奥克兰', country: '新西兰', tz: 'Pacific/Auckland' },
    { name: '惠灵顿', country: '新西兰', tz: 'Pacific/Auckland' },
    { name: '斐济', country: '斐济', tz: 'Pacific/Fiji' },
    // 非洲
    { name: '开罗', country: '埃及', tz: 'Africa/Cairo' },
    { name: '约翰内斯堡', country: '南非', tz: 'Africa/Johannesburg' },
    { name: '开普敦', country: '南非', tz: 'Africa/Johannesburg' },
    { name: '内罗毕', country: '肯尼亚', tz: 'Africa/Nairobi' },
    { name: '拉各斯', country: '尼日利亚', tz: 'Africa/Lagos' },
    { name: '卡萨布兰卡', country: '摩洛哥', tz: 'Africa/Casablanca' },
    // UTC
    { name: 'UTC', country: '协调世界时', tz: 'UTC' }
  ];

  /* ============ 状态 ============ */
  var state = {
    mode: 'clock',
    clockCities: [],
    plannerCities: [],
    duration: 60,
    timeGranularity: 30,
    workStart: '09:00',
    workEnd: '17:00',
    hour12: false,
    showSeconds: false,
    compact: false,
    selectedModalTarget: null,
    plannerSlots: null,
    plannerWindows: null,
    lastConvertData: null,
    lastPlannerData: null
  };

  var history = [];
  var clockTimer = null;
  var toastTimer = null;
  var dragSrcIdx = null;
  var isDragging = false;

  /* ============ DOM 主框架 ============ */
  var hour12Toggle    = document.getElementById('hour12Toggle');
  var secondsToggle   = document.getElementById('secondsToggle');
  var compactToggle   = document.getElementById('compactToggle');
  var copyAllBtn      = document.getElementById('copyAllBtn');
  var historyBtn      = document.getElementById('historyBtn');
  var shareBtn        = document.getElementById('shareBtn');
  var historyCountEl  = document.getElementById('historyCount');
  var historyDrawer   = document.getElementById('historyDrawer');
  var historyBackdrop = document.getElementById('historyBackdrop');
  var historyListEl   = document.getElementById('historyList');
  var historyCloseEl  = document.getElementById('historyClose');
  var historyClearEl  = document.getElementById('historyClear');
  var toastEl         = document.getElementById('toast');

  var modeSeg         = document.getElementById('modeSeg');
  var clockPanel      = document.getElementById('clockPanel');
  var convertPanel    = document.getElementById('convertPanel');
  var plannerPanel    = document.getElementById('plannerPanel');
  var clockGrid       = document.getElementById('clockGrid');
  var addCityBtn      = document.getElementById('addCityBtn');

  var fromCitySel     = document.getElementById('fromCity');
  var toCitySel       = document.getElementById('toCity');
  var convertDateEl   = document.getElementById('convertDate');
  var convertTimeEl   = document.getElementById('convertTime');
  var convertBtn      = document.getElementById('convertBtn');
  var convertNowBtn   = document.getElementById('convertNowBtn');
  var convertResult   = document.getElementById('convertResult');
  var convertResultActions = document.getElementById('convertResultActions');
  var convertCopyBtn  = document.getElementById('convertCopyBtn');
  var convertSaveBtn  = document.getElementById('convertSaveBtn');
  var quickTimeBar    = document.querySelector('.quick-time-bar');

  var plannerCities   = document.getElementById('plannerCities');
  var plannerAddBtn   = document.getElementById('plannerAddBtn');
  var workStartEl     = document.getElementById('workStart');
  var workEndEl       = document.getElementById('workEnd');
  var plannerDateEl   = document.getElementById('plannerDate');
  var durationSeg     = document.getElementById('durationSeg');
  var granularitySeg  = document.getElementById('granularitySeg');
  var plannerCalcBtn  = document.getElementById('plannerCalcBtn');
  var plannerResult   = document.getElementById('plannerResult');
  var plannerChart    = document.getElementById('plannerChart');
  var plannerOverlaps = document.getElementById('plannerOverlaps');
  var plannerExportICS = document.getElementById('plannerExportICS');
  var plannerCopyBtn  = document.getElementById('plannerCopyBtn');
  var plannerSaveBtn  = document.getElementById('plannerSaveBtn');

  var cityModal       = document.getElementById('cityModal');
  var cityModalClose  = document.getElementById('cityModalClose');
  var citySearch      = document.getElementById('citySearch');
  var cityList        = document.getElementById('cityList');

  /* ============ 工具函数 ============ */
  function getCityByTz(tz) {
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].tz === tz) return CITIES[i];
    }
    return { name: tz, country: '', tz: tz };
  }

  function getTzOffsetMinutes(tz, date) {
    var d = date || new Date();
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = dtf.formatToParts(d);
    var p = {};
    parts.forEach(function (part) { p[part.type] = part.value; });
    var asUTC = Date.UTC(
      parseInt(p.year, 10),
      parseInt(p.month, 10) - 1,
      parseInt(p.day, 10),
      parseInt(p.hour, 10),
      parseInt(p.minute, 10),
      parseInt(p.second, 10)
    );
    return Math.round((asUTC - d.getTime()) / 60000);
  }

  function formatOffset(minutes) {
    var sign = minutes >= 0 ? '+' : '-';
    var abs = Math.abs(minutes);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return 'UTC' + sign + h + (m ? ':' + String(m).padStart(2, '0') : '');
  }

  function isDST(tz, date) {
    var d = date || new Date();
    var jan = getTzOffsetMinutes(tz, new Date(d.getFullYear(), 0, 1));
    var jul = getTzOffsetMinutes(tz, new Date(d.getFullYear(), 6, 1));
    var current = getTzOffsetMinutes(tz, d);
    var standard = Math.min(jan, jul);
    return current > standard;
  }

  function formatDateInTz(tz, date) {
    var d = date || new Date();
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  }

  function formatTimeInTz(tz, date, opts) {
    opts = opts || {};
    var d = date || new Date();
    var options = {
      timeZone: tz,
      hour12: !!opts.hour12,
      hour: opts.hour12 ? 'numeric' : '2-digit',
      minute: '2-digit'
    };
    if (opts.seconds) options.second = '2-digit';
    return new Intl.DateTimeFormat('zh-CN', options).format(d);
  }

  function formatTimeHM(tz, date) {
    return formatTimeInTz(tz, date, { hour12: false });
  }

  function getHourInTz(tz, date) {
    var d = date || new Date();
    return parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false, hour: '2-digit'
    }).format(d), 10);
  }

  function isNightHour(h) { return h < 6 || h >= 20; }

  function formatDateInput(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function parseDateInput(str) {
    if (!str) return new Date();
    var parts = str.split('-');
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  }

  function formatHM(str) {
    if (!str) return 0;
    var p = str.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || '0', 10);
  }

  function minutesToHM(mins) {
    var h = Math.floor(mins / 60) % 24;
    var m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ============ Toast ============ */
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
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
    } catch (e) { showToast('❌ 复制失败'); }
  }

  function copyText(text) {
    if (!text) { showToast('没有可复制内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制：' + truncate(text, 30));
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function truncate(s, n) {
    s = String(s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* ============ 持久化 ============ */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        clockCities: state.clockCities,
        plannerCities: state.plannerCities,
        duration: state.duration,
        timeGranularity: state.timeGranularity,
        workStart: state.workStart,
        workEnd: state.workEnd,
        hour12: state.hour12,
        showSeconds: state.showSeconds,
        compact: state.compact
      }));
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (Array.isArray(data.clockCities) && data.clockCities.length) state.clockCities = data.clockCities;
      if (Array.isArray(data.plannerCities) && data.plannerCities.length) state.plannerCities = data.plannerCities;
      if (data.duration) state.duration = data.duration;
      if (data.timeGranularity) state.timeGranularity = data.timeGranularity;
      if (data.workStart) state.workStart = data.workStart;
      if (data.workEnd) state.workEnd = data.workEnd;
      if (typeof data.hour12 === 'boolean') state.hour12 = data.hour12;
      if (typeof data.showSeconds === 'boolean') state.showSeconds = data.showSeconds;
      if (typeof data.compact === 'boolean') state.compact = data.compact;
    } catch (e) { /* ignore */ }
  }

  /* ============ 工具栏状态同步 ============ */
  function syncToolbar() {
    hour12Toggle.textContent = state.hour12 ? '🕐 12h' : '🕐 24h';
    hour12Toggle.classList.toggle('active', state.hour12);
    secondsToggle.textContent = state.showSeconds ? '⏱ 隐藏秒' : '⏱ 显示秒';
    secondsToggle.classList.toggle('active', state.showSeconds);
    compactToggle.textContent = state.compact ? '📐 紧凑' : '📐 舒适';
    compactToggle.classList.toggle('active', state.compact);
  }

  /* ============ 模式切换 ============ */
  function setMode(mode) {
    state.mode = mode;
    Array.prototype.forEach.call(modeSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === mode);
    });
    clockPanel.hidden = mode !== 'clock';
    convertPanel.hidden = mode !== 'convert';
    plannerPanel.hidden = mode !== 'planner';

    if (mode === 'clock') {
      startClockTimer();
      renderClockGrid();
    } else {
      stopClockTimer();
    }
    if (mode === 'convert') renderCitySelects();
    if (mode === 'planner') renderPlannerCities();
  }

  modeSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    setMode(btn.dataset.value);
  });

  /* ============ 世界时钟 ============ */
  function defaultClockCities() {
    return [
      { tz: 'Asia/Shanghai', name: '北京', country: '中国' },
      { tz: 'Asia/Tokyo', name: '东京', country: '日本' },
      { tz: 'Europe/London', name: '伦敦', country: '英国' },
      { tz: 'America/New_York', name: '纽约', country: '美国' },
      { tz: 'America/Los_Angeles', name: '洛杉矶', country: '美国' },
      { tz: 'Australia/Sydney', name: '悉尼', country: '澳大利亚' }
    ];
  }

  function diffLocalStr(tz, now) {
    var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    var localOffset = getTzOffsetMinutes(localTz, now);
    var offset = getTzOffsetMinutes(tz, now);
    var diffMin = offset - localOffset;
    if (diffMin === 0) return '与本地相同';
    var sign = diffMin > 0 ? '+' : '-';
    var abs = Math.abs(diffMin);
    var dh = Math.floor(abs / 60);
    var dm = abs % 60;
    return sign + dh + (dm ? '.' + Math.round(dm / 60 * 10) / 10 : '') + ' 小时';
  }

  function renderClockGrid() {
    var now = new Date();
    clockGrid.innerHTML = '';

    if (state.clockCities.length === 0) {
      clockGrid.innerHTML = '<p class="clock-empty">还没有添加城市，点击下方按钮开始</p>';
      return;
    }

    state.clockCities.forEach(function (city, idx) {
      var offset = getTzOffsetMinutes(city.tz, now);
      var hour = getHourInTz(city.tz, now);
      var night = isNightHour(hour);
      var dst = isDST(city.tz, now);

      var card = document.createElement('div');
      card.className = 'clock-card ' + (night ? 'is-night' : 'is-day') +
                       (state.compact ? ' compact' : '');
      card.dataset.idx = idx;
      card.draggable = true;

      var badgeHtml = dst ? '<span class="clock-badge">夏令时</span>' : '';

      card.innerHTML =
        '<button class="clock-remove" data-idx="' + idx + '" title="移除">×</button>' +
        '<div class="clock-city">' + escapeHtml(city.name) +
          '<span class="clock-country">' + escapeHtml(city.country || '') + '</span></div>' +
        '<div class="clock-time" data-tz="' + city.tz + '">' +
          formatTimeInTz(city.tz, now, { hour12: state.hour12, seconds: state.showSeconds }) +
        '</div>' +
        '<div class="clock-date">' + formatDateInTz(city.tz, now) + '</div>' +
        '<div class="clock-offset">' + formatOffset(offset) + ' ' + badgeHtml + '</div>' +
        '<div class="clock-diff">' + diffLocalStr(city.tz, now) + '</div>';

      clockGrid.appendChild(card);
    });

    bindClockDrag();
    bindClockTimeCopy();
  }

  function bindClockDrag() {
    var cards = clockGrid.querySelectorAll('.clock-card');
    cards.forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        isDragging = true;
        dragSrcIdx = parseInt(card.dataset.idx, 10);
        card.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(dragSrcIdx));
        }
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        cards.forEach(function (c) { c.classList.remove('drag-over'); });
        dragSrcIdx = null;
        setTimeout(function () { isDragging = false; }, 100);
      });
      card.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (dragSrcIdx === null) return;
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', function () {
        card.classList.remove('drag-over');
      });
      card.addEventListener('drop', function (e) {
        e.preventDefault();
        card.classList.remove('drag-over');
        var toIdx = parseInt(card.dataset.idx, 10);
        if (dragSrcIdx === null || dragSrcIdx === toIdx) return;
        var moved = state.clockCities.splice(dragSrcIdx, 1)[0];
        state.clockCities.splice(toIdx, 0, moved);
        save();
        renderClockGrid();
      });
    });
  }

  function bindClockTimeCopy() {
    clockGrid.querySelectorAll('.clock-time').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (isDragging) return;
        var tz = el.dataset.tz;
        var city = getCityByTz(tz);
        var txt = city.name + ' ' + formatTimeInTz(tz, new Date(), {
          hour12: state.hour12, seconds: true
        }) + ' (' + formatDateInTz(tz, new Date()) + ')';
        copyText(txt);
      });
    });
  }

  clockGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('.clock-remove');
    if (!btn) return;
    var idx = parseInt(btn.dataset.idx, 10);
    state.clockCities.splice(idx, 1);
    save();
    renderClockGrid();
  });

  function startClockTimer() {
    stopClockTimer();
    clockTimer = setInterval(function () {
      var now = new Date();
      Array.prototype.forEach.call(clockGrid.querySelectorAll('[data-tz]'), function (el) {
        el.textContent = formatTimeInTz(el.dataset.tz, now, {
          hour12: state.hour12, seconds: state.showSeconds
        });
      });
      if (now.getSeconds() === 0) renderClockGrid();
    }, 1000);
  }

  function stopClockTimer() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  /* ============ 工具栏操作 ============ */
  hour12Toggle.addEventListener('click', function () {
    state.hour12 = !state.hour12;
    syncToolbar();
    save();
    if (state.mode === 'clock') renderClockGrid();
    if (state.mode === 'convert' && state.lastConvertData) doConvert();
  });

  secondsToggle.addEventListener('click', function () {
    state.showSeconds = !state.showSeconds;
    syncToolbar();
    save();
    if (state.mode === 'clock') renderClockGrid();
  });

  compactToggle.addEventListener('click', function () {
    state.compact = !state.compact;
    syncToolbar();
    save();
    if (state.mode === 'clock') renderClockGrid();
  });

  copyAllBtn.addEventListener('click', function () {
    if (state.clockCities.length === 0) { showToast('没有可复制的城市'); return; }
    var now = new Date();
    var lines = ['🌍 世界时钟 · ' + formatDateInput(now) + ' ' +
      formatTimeInTz(Intl.DateTimeFormat().resolvedOptions().timeZone, now, { hour12: false, seconds: true })];
    state.clockCities.forEach(function (c) {
      lines.push(c.name + ' (' + (c.country || c.tz) + '): ' +
        formatTimeInTz(c.tz, now, { hour12: false, seconds: true }) +
        ' ' + formatOffset(getTzOffsetMinutes(c.tz, now)));
    });
    copyText(lines.join('\n'));
  });

  /* ============ 城市选择弹窗 ============ */
  function openCityModal(target) {
    state.selectedModalTarget = target;
    cityModal.hidden = false;
    citySearch.value = '';
    renderCityList('');
    setTimeout(function () { citySearch.focus(); }, 100);
  }

  function renderCityList(query) {
    var q = (query || '').toLowerCase().trim();
    var list = CITIES.filter(function (c) {
      if (!q) return true;
      return c.name.toLowerCase().indexOf(q) >= 0 ||
             (c.country || '').toLowerCase().indexOf(q) >= 0 ||
             c.tz.toLowerCase().indexOf(q) >= 0;
    });

    cityList.innerHTML = '';
    if (list.length === 0) {
      cityList.innerHTML = '<p class="city-empty">没有找到匹配的城市</p>';
      return;
    }

    var currentList = state.selectedModalTarget === 'clock'
      ? state.clockCities : state.plannerCities;

    list.forEach(function (c) {
      var selected = currentList.some(function (x) {
        return x.tz === c.tz && x.name === c.name;
      });
      var div = document.createElement('div');
      div.className = 'city-option' + (selected ? ' selected' : '');
      div.innerHTML =
        '<div>' +
          '<div class="city-option-name">' + escapeHtml(c.name) + '</div>' +
          '<div style="font-size:.72rem;color:#a0947c;">' + escapeHtml(c.country || '') + '</div>' +
        '</div>' +
        '<div class="city-option-meta">' + escapeHtml(c.tz) + '</div>';
      div.addEventListener('click', function () { addCityToTarget(c); });
      cityList.appendChild(div);
    });
  }

  function addCityToTarget(c) {
    var list = state.selectedModalTarget === 'clock' ? state.clockCities : state.plannerCities;
    var exists = list.some(function (x) { return x.tz === c.tz && x.name === c.name; });
    if (exists) { showToast('该城市已在列表中'); cityModal.hidden = true; return; }

    list.push({ tz: c.tz, name: c.name, country: c.country });
    save();
    cityModal.hidden = true;

    if (state.selectedModalTarget === 'clock') {
      renderClockGrid();
      showToast('已添加 ' + c.name);
    } else {
      renderPlannerCities();
      showToast('已添加 ' + c.name);
    }
  }

  citySearch.addEventListener('input', function () {
    renderCityList(citySearch.value);
  });

  cityModalClose.addEventListener('click', function () { cityModal.hidden = true; });
  cityModal.addEventListener('click', function (e) {
    if (e.target === cityModal) cityModal.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !cityModal.hidden) cityModal.hidden = true;
  });
  addCityBtn.addEventListener('click', function () { openCityModal('clock'); });

  /* ============ 时区转换 ============ */
  function renderCitySelects() {
    var options = CITIES.map(function (c) {
      return '<option value="' + c.tz + '">' + escapeHtml(c.name) + ' · ' + escapeHtml(c.country || '') + '</option>';
    }).join('');

    var prevFrom = fromCitySel.value;
    var prevTo = toCitySel.value;
    fromCitySel.innerHTML = options;
    toCitySel.innerHTML = options;

    if (prevFrom) fromCitySel.value = prevFrom;
    else fromCitySel.value = 'Asia/Shanghai';
    if (prevTo) toCitySel.value = prevTo;
    else toCitySel.value = 'America/New_York';
  }

  function doConvert() {
    var fromTz = fromCitySel.value;
    var toTz = toCitySel.value;
    if (!fromTz || !toTz) return;

    var dateStr = convertDateEl.value;
    var timeStr = convertTimeEl.value;
    if (!dateStr) { showToast('请选择日期'); return; }
    if (!timeStr) timeStr = '12:00';

    var d = parseDateInput(dateStr);
    var tp = timeStr.split(':');
    var wallH = parseInt(tp[0], 10);
    var wallM = parseInt(tp[1], 10);

    // 构造"源时区 挂钟时间"对应的 UTC 毫秒
    var wallUtcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), wallH, wallM, 0, 0);
    var fromOffset = getTzOffsetMinutes(fromTz, new Date(wallUtcMs));
    var realUtcMs = wallUtcMs - fromOffset * 60000;
    // 夏令时边界复核
    var fromOffset2 = getTzOffsetMinutes(fromTz, new Date(realUtcMs));
    if (fromOffset2 !== fromOffset) {
      realUtcMs = wallUtcMs - fromOffset2 * 60000;
      fromOffset = fromOffset2;
    }

    var utcDate = new Date(realUtcMs);
    var toOffset = getTzOffsetMinutes(toTz, utcDate);

    var targetTime = formatTimeHM(toTz, utcDate);
    var targetFullDate = formatDateInTz(toTz, utcDate);
    var fromName = getCityByTz(fromTz).name;
    var toName = getCityByTz(toTz).name;

    var diffMin = toOffset - fromOffset;
    var diffStr;
    if (diffMin === 0) {
      diffStr = '两地时差：0 小时（同一时区）';
    } else {
      var sign = diffMin > 0 ? '快' : '慢';
      var abs = Math.abs(diffMin);
      var dh = Math.floor(abs / 60);
      var dm = abs % 60;
      diffStr = toName + ' 比 ' + fromName + ' ' + sign + ' ' +
        dh + ' 小时' + (dm ? ' ' + dm + ' 分钟' : '');
    }

    var fromTime = minutesToHM(wallH * 60 + wallM);
    var fromFullDate = formatDateInTz(fromTz, new Date(realUtcMs));
    var fromDst = isDST(fromTz, new Date(realUtcMs));
    var toDst = isDST(toTz, utcDate);

    state.lastConvertData = {
      fromTz: fromTz, toTz: toTz, date: dateStr, time: timeStr,
      summary: fromName + ' ' + fromTime + ' → ' + toName + ' ' + targetTime
    };

    convertResult.hidden = false;
    convertResultActions.hidden = false;
    convertResult.innerHTML =
      '<div class="convert-result-main">' +
        '<div class="convert-city-block">' +
          '<div class="convert-city-name">' + escapeHtml(fromName) +
            (fromDst ? ' <span class="clock-badge">夏令时</span>' : '') + '</div>' +
          '<div class="convert-city-time">' + fromTime + '</div>' +
          '<div class="convert-city-date">' + fromFullDate + '</div>' +
          '<div class="convert-city-offset">' + formatOffset(fromOffset) + '</div>' +
        '</div>' +
        '<div class="convert-arrow">→</div>' +
        '<div class="convert-city-block">' +
          '<div class="convert-city-name">' + escapeHtml(toName) +
            (toDst ? ' <span class="clock-badge">夏令时</span>' : '') + '</div>' +
          '<div class="convert-city-time">' + targetTime + '</div>' +
          '<div class="convert-city-date">' + targetFullDate + '</div>' +
          '<div class="convert-city-offset">' + formatOffset(toOffset) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="convert-diff">' + escapeHtml(diffStr) + '</div>';
  }

  convertBtn.addEventListener('click', doConvert);

  convertNowBtn.addEventListener('click', function () {
    var now = new Date();
    convertDateEl.value = formatDateInput(now);
    convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' +
                          String(now.getMinutes()).padStart(2, '0');
    doConvert();
  });

  if (quickTimeBar) {
    quickTimeBar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-qtime]');
      if (!btn) return;
      var q = btn.dataset.qtime;
      var now = new Date();
      if (q === 'now') {
        convertDateEl.value = formatDateInput(now);
        convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' +
                              String(now.getMinutes()).padStart(2, '0');
      } else if (q === '+1h') {
        now.setHours(now.getHours() + 1);
        convertDateEl.value = formatDateInput(now);
        convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' +
                              String(now.getMinutes()).padStart(2, '0');
      } else if (q === '+4h') {
        now.setHours(now.getHours() + 4);
        convertDateEl.value = formatDateInput(now);
        convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' +
                              String(now.getMinutes()).padStart(2, '0');
      } else if (q === 'tomorrow') {
        now.setDate(now.getDate() + 1);
        convertDateEl.value = formatDateInput(now);
        convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' +
                              String(now.getMinutes()).padStart(2, '0');
      } else if (q === 'next-week') {
        now.setDate(now.getDate() + 7);
        convertDateEl.value = formatDateInput(now);
        convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' +
                              String(now.getMinutes()).padStart(2, '0');
      }
      doConvert();
    });
  }

  convertCopyBtn.addEventListener('click', function () {
    if (!state.lastConvertData) { showToast('请先转换'); return; }
    var d = state.lastConvertData;
    var fromName = getCityByTz(d.fromTz).name;
    var toName = getCityByTz(d.toTz).name;
    var txt = fromName + ' ' + d.date + ' ' + d.time + ' → ' + toName + '\n' +
      convertResult.querySelectorAll('.convert-city-time')[1].textContent + ' ' +
      convertResult.querySelectorAll('.convert-city-date')[1].textContent + '\n' +
      convertResult.querySelector('.convert-diff').textContent;
    copyText(txt);
  });

  convertSaveBtn.addEventListener('click', function () {
    if (!state.lastConvertData) { showToast('请先转换'); return; }
    addToHistory({
      type: 'convert',
      summary: state.lastConvertData.summary,
      data: state.lastConvertData
    });
    showToast('💾 已存入历史');
  });

  /* ============ 会议规划器 ============ */
  function defaultPlannerCities() {
    return [
      { tz: 'Asia/Shanghai', name: '北京', country: '中国' },
      { tz: 'Europe/London', name: '伦敦', country: '英国' },
      { tz: 'America/New_York', name: '纽约', country: '美国' }
    ];
  }

  function renderPlannerCities() {
    plannerCities.innerHTML = '';
    if (state.plannerCities.length === 0) {
      plannerCities.innerHTML = '<p style="text-align:center;color:#a0947c;padding:16px 0;font-size:.84rem;">还没有添加参会城市</p>';
      return;
    }

    state.plannerCities.forEach(function (city, idx) {
      var row = document.createElement('div');
      row.className = 'planner-city-row';

      var upBtn = document.createElement('button');
      upBtn.className = 'planner-city-btn';
      upBtn.type = 'button';
      upBtn.textContent = '↑';
      upBtn.title = '上移';
      upBtn.disabled = idx === 0;
      upBtn.style.opacity = idx === 0 ? '.3' : '';
      upBtn.addEventListener('click', function () {
        if (idx === 0) return;
        var t = state.plannerCities[idx - 1];
        state.plannerCities[idx - 1] = state.plannerCities[idx];
        state.plannerCities[idx] = t;
        save();
        renderPlannerCities();
      });

      var downBtn = document.createElement('button');
      downBtn.className = 'planner-city-btn';
      downBtn.type = 'button';
      downBtn.textContent = '↓';
      downBtn.title = '下移';
      downBtn.disabled = idx === state.plannerCities.length - 1;
      downBtn.style.opacity = downBtn.disabled ? '.3' : '';
      downBtn.addEventListener('click', function () {
        if (idx === state.plannerCities.length - 1) return;
        var t = state.plannerCities[idx + 1];
        state.plannerCities[idx + 1] = state.plannerCities[idx];
        state.plannerCities[idx] = t;
        save();
        renderPlannerCities();
      });

      var sel = document.createElement('select');
      CITIES.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.tz;
        opt.textContent = c.name + ' · ' + c.country;
        if (c.tz === city.tz) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () {
        var newTz = sel.value;
        var newCity = getCityByTz(newTz);
        state.plannerCities[idx] = { tz: newTz, name: newCity.name, country: newCity.country };
        save();
      });

      var removeBtn = document.createElement('button');
      removeBtn.className = 'planner-city-btn remove';
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.title = '移除';
      removeBtn.addEventListener('click', function () {
        state.plannerCities.splice(idx, 1);
        save();
        renderPlannerCities();
        plannerResult.hidden = true;
      });

      row.appendChild(upBtn);
      row.appendChild(downBtn);
      row.appendChild(sel);
      row.appendChild(removeBtn);
      plannerCities.appendChild(row);
    });
  }

  plannerAddBtn.addEventListener('click', function () { openCityModal('planner'); });

  workStartEl.addEventListener('change', function () {
    state.workStart = workStartEl.value;
    save();
  });
  workEndEl.addEventListener('change', function () {
    state.workEnd = workEndEl.value;
    save();
  });

  durationSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(durationSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.duration = parseInt(btn.dataset.value, 10);
    save();
  });

  granularitySeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(granularitySeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.timeGranularity = parseInt(btn.dataset.value, 10);
    save();
  });

  plannerCalcBtn.addEventListener('click', calcPlanner);

  function calcPlanner() {
    if (state.plannerCities.length < 2) {
      showToast('至少需要 2 个参会城市');
      return;
    }
    var dateStr = plannerDateEl.value;
    if (!dateStr) { showToast('请选择会议日期'); return; }

    var date = parseDateInput(dateStr);
    var workStartMin = formatHM(state.workStart);
    var workEndMin = formatHM(state.workEnd);
    if (workEndMin <= workStartMin) workEndMin = workStartMin + 8 * 60;

    var duration = state.duration;
    var slotMin = state.timeGranularity;
    var slotsPerDay = (24 * 60) / slotMin;
    var slotsPerHour = 60 / slotMin;

    var baseUTCMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

    var citiesInfo = state.plannerCities.map(function (c) {
      return { tz: c.tz, name: c.name };
    });

    var slots = [];
    for (var i = 0; i < slotsPerDay; i++) {
      var utcMs = baseUTCMs + i * slotMin * 60000;
      var utcDate = new Date(utcMs);

      var cityTimes = citiesInfo.map(function (c) {
        var offset = getTzOffsetMinutes(c.tz, utcDate);
        var localMs = utcMs + offset * 60000;
        var localDate = new Date(localMs);
        var localTotalMin = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
        var inWork = localTotalMin >= workStartMin && localTotalMin < workEndMin;
        return {
          name: c.name,
          tz: c.tz,
          time: minutesToHM(localTotalMin),
          inWork: inWork,
          hour: localDate.getUTCHours()
        };
      });

      var allInWork = cityTimes.every(function (t) { return t.inWork; });
      var anyInWork = cityTimes.some(function (t) { return t.inWork; });
      var offCount = cityTimes.filter(function (t) { return !t.inWork; }).length;

      slots.push({
        idx: i,
        utcMs: utcMs,
        cityTimes: cityTimes,
        allInWork: allInWork,
        anyInWork: anyInWork,
        offCount: offCount
      });
    }

    var windows = [];
    var current = null;
    slots.forEach(function (slot) {
      if (slot.anyInWork) {
        if (!current) {
          current = { startIdx: slot.idx, endIdx: slot.idx, slots: [slot] };
        } else {
          current.endIdx = slot.idx;
          current.slots.push(slot);
        }
      } else if (current) {
        windows.push(current); current = null;
      }
    });
    if (current) windows.push(current);

    var validWindows = windows.filter(function (w) {
      return (w.endIdx - w.startIdx + 1) * slotMin >= duration;
    });

    validWindows.sort(function (a, b) {
      var aAll = a.slots.every(function (s) { return s.allInWork; });
      var bAll = b.slots.every(function (s) { return s.allInWork; });
      if (aAll && !bAll) return -1;
      if (!aAll && bAll) return 1;
      var aOff = Math.min.apply(null, a.slots.map(function (s) { return s.offCount; }));
      var bOff = Math.min.apply(null, b.slots.map(function (s) { return s.offCount; }));
      if (aOff !== bOff) return aOff - bOff;
      return b.slots.length - a.slots.length;
    });

    state.plannerSlots = slots;
    state.plannerWindows = validWindows;
    state.lastPlannerData = {
      cities: citiesInfo.map(function (c) { return { tz: c.tz, name: c.name }; }),
      date: dateStr,
      workStart: state.workStart,
      workEnd: state.workEnd,
      duration: duration,
      granularity: slotMin,
      bestWindow: validWindows[0] || null,
      summary: validWindows.length === 0
        ? '未找到共同工作时段'
        : '最佳时段 · ' + citiesInfo.map(function (c, idx) {
            var first = validWindows[0].slots[0].cityTimes[idx];
            return c.name + ' ' + first.time;
          }).join(' / ')
    };

    renderPlannerResult(validWindows, citiesInfo, workStartMin, workEndMin, duration, slotMin, slotsPerDay);
  }

  /* ============ 规划器渲染 ============ */
  function renderPlannerResult(windows, cities, workStartMin, workEndMin, duration, slotMin, slotsPerDay) {
    plannerResult.hidden = false;

    if (windows.length === 0) {
      plannerOverlaps.innerHTML =
        '<p style="text-align:center;color:#a0947c;padding:20px;font-size:.86rem;">' +
        '😕 没有找到满足时长要求的共同工作时段。<br>' +
        '建议缩短会议时长、调整工作时段，或减少参会城市。</p>';
      drawPlannerChart(null, cities, workStartMin, workEndMin, slotMin, slotsPerDay);
      return;
    }

    drawPlannerChart(windows, cities, workStartMin, workEndMin, slotMin, slotsPerDay);

    var html = '';
    var maxShow = Math.min(windows.length, 10);
    for (var i = 0; i < maxShow; i++) {
      var w = windows[i];
      var isBest = i === 0;
      var allInWork = w.slots.every(function (s) { return s.allInWork; });

      var cityLines = cities.map(function (c, ci) {
        var first = w.slots[0].cityTimes[ci];
        var last = w.slots[w.slots.length - 1].cityTimes[ci];
        var off = w.slots.some(function (s) { return !s.cityTimes[ci].inWork; });
        return '<span class="' + (off ? 'off-hours' : '') + '">' +
          escapeHtml(c.name) + ' ' + first.time + '–' + last.time +
          (off ? ' ⚠️' : '') + '</span>';
      }).join('');

      var label = allInWork ? '全员工作时段' : '部分人非工作时段';

      html += '<div class="planner-overlap-item' + (isBest ? ' best' : '') +
        '" data-win-idx="' + i + '">' +
        '<div class="overlap-time">' + label + '</div>' +
        '<div class="overlap-cities">' + cityLines + '</div>' +
        '</div>';
    }

    plannerOverlaps.innerHTML = html;
  }

  plannerOverlaps.addEventListener('click', function (e) {
    var item = e.target.closest('[data-win-idx]');
    if (!item) return;
    var idx = parseInt(item.dataset.winIdx, 10);
    var w = state.plannerWindows[idx];
    if (!w) return;
    var lines = [plannerDateEl.value + ' 会议时段：'];
    w.slots[0].cityTimes.forEach(function (ct, i) {
      var first = w.slots[0].cityTimes[i].time;
      var last = w.slots[w.slots.length - 1].cityTimes[i].time;
      lines.push(ct.name + ' ' + first + '–' + last);
    });
    copyText(lines.join('\n'));
  });

  function drawPlannerChart(windows, cities, workStartMin, workEndMin, slotMin, slotsPerDay) {
    var dpr = window.devicePixelRatio || 1;
    var wrap = plannerChart.parentElement;
    var w = Math.max(700, wrap.clientWidth);
    var h = 60 + cities.length * 44 + 30;

    plannerChart.width = Math.round(w * dpr);
    plannerChart.height = Math.round(h * dpr);
    plannerChart.style.width = w + 'px';
    plannerChart.style.height = h + 'px';

    var ctx = plannerChart.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var padding = { top: 40, left: 120, right: 20, bottom: 30 };
    var chartW = w - padding.left - padding.right;
    var cellW = chartW / slotsPerDay;

    // 时间轴
    ctx.fillStyle = '#a0947c';
    ctx.font = '10px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var stepHours = slotMin === 15 ? 3 : slotMin === 60 ? 3 : 3;
    for (var t = 0; t < 24; t += stepHours) {
      var x = padding.left + t * (60 / slotMin) * cellW;
      ctx.fillText(String(t).padStart(2, '0') + ':00', x, 8);
    }

    var date = parseDateInput(plannerDateEl.value);
    var baseUTCMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

    cities.forEach(function (city, row) {
      var y = padding.top + row * 44;

      ctx.fillStyle = '#3d3226';
      ctx.font = '12px "LXGW WenKai", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(city.name, padding.left - 10, y + 16);

      for (var i = 0; i < slotsPerDay; i++) {
        var utcMs = baseUTCMs + i * slotMin * 60000;
        var offset = getTzOffsetMinutes(city.tz, new Date(utcMs));
        var localMs = utcMs + offset * 60000;
        var localDate = new Date(localMs);
        var localMin = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
        var inWork = localMin >= workStartMin && localMin < workEndMin;

        var x = padding.left + i * cellW;
        var color;
        if (inWork) color = '#8fd49c';
        else if (localDate.getUTCHours() < 6 || localDate.getUTCHours() >= 22) color = '#d5cfe4';
        else color = '#f0e6d2';

        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 4, cellW - 2, 26);
      }

      var now = new Date();
      var slotIdx = Math.floor((now.getTime() - baseUTCMs) / (slotMin * 60000));
      if (slotIdx >= 0 && slotIdx < slotsPerDay) {
        var nowX = padding.left + slotIdx * cellW;
        ctx.strokeStyle = '#8a5a2b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nowX, y);
        ctx.lineTo(nowX, y + 34);
        ctx.stroke();
      }
    });

    if (windows && windows.length > 0) {
      windows.forEach(function (win) {
        var startX = padding.left + win.startIdx * cellW;
        var endX = padding.left + (win.endIdx + 1) * cellW;
        ctx.fillStyle = 'rgba(138, 90, 43, 0.08)';
        ctx.fillRect(startX, padding.top - 4, endX - startX, cities.length * 44 + 8);
      });
    }

    ctx.strokeStyle = '#ecdfc4';
    ctx.lineWidth = 1;
    for (var r = 0; r <= cities.length; r++) {
      var yy = padding.top + r * 44;
      ctx.beginPath();
      ctx.moveTo(padding.left, yy);
      ctx.lineTo(w - padding.right, yy);
      ctx.stroke();
    }
  }

  /* ============ 规划器操作按钮 ============ */
  plannerCopyBtn.addEventListener('click', function () {
    if (!state.lastPlannerData) { showToast('请先计算'); return; }
    var d = state.lastPlannerData;
    if (!d.bestWindow) { showToast('没有最佳时段'); return; }
    var lines = [d.date + ' 会议时段：'];
    var ci = 0;
    d.cities.forEach(function (c, i) {
      var first = d.bestWindow.slots[0].cityTimes[i].time;
      var last = d.bestWindow.slots[d.bestWindow.slots.length - 1].cityTimes[i].time;
      lines.push(c.name + ' ' + first + '–' + last);
    });
    copyText(lines.join('\n'));
  });

  plannerSaveBtn.addEventListener('click', function () {
    if (!state.lastPlannerData) { showToast('请先计算'); return; }
    addToHistory({
      type: 'planner',
      summary: state.lastPlannerData.summary,
      data: state.lastPlannerData
    });
    showToast('💾 已存入历史');
  });

  plannerExportICS.addEventListener('click', function () {
    if (!state.lastPlannerData || !state.lastPlannerData.bestWindow) {
      showToast('没有可导出的时段'); return;
    }
    var w = state.lastPlannerData.bestWindow;
    var slotMin = state.lastPlannerData.granularity;
    var duration = state.lastPlannerData.duration;
    var startUtcMs = w.slots[0].utcMs;
    var endUtcMs = startUtcMs + duration * 60000;

    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//World Clock Tool//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@world-clock-tool',
      'DTSTAMP:' + fmtICS(new Date()),
      'DTSTART:' + fmtICS(new Date(startUtcMs)),
      'DTEND:' + fmtICS(new Date(endUtcMs)),
      'SUMMARY:Online Meeting',
      'DESCRIPTION:Participants: ' + state.lastPlannerData.cities.map(function (c) { return c.name; }).join(', '),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'meeting-' + state.lastPlannerData.date + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    showToast('📅 已导出 ICS');
  });

  function fmtICS(d) {
    var y = d.getUTCFullYear();
    var mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    var da = String(d.getUTCDate()).padStart(2, '0');
    var h = String(d.getUTCHours()).padStart(2, '0');
    var mi = String(d.getUTCMinutes()).padStart(2, '0');
    var s = String(d.getUTCSeconds()).padStart(2, '0');
    return y + mo + da + 'T' + h + mi + s + 'Z';
  }

  /* ============ 历史记录 ============ */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) history = arr;
    } catch (e) { history = []; }
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { /* ignore */ }
  }

  function addToHistory(rec) {
    rec.ts = Date.now();
    history.unshift(rec);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyListEl.innerHTML = '<p class="history-empty">暂无记录</p>';
    } else {
      var typeLabels = { convert: '🔄 时区转换', planner: '📅 会议规划' };
      historyListEl.innerHTML = history.map(function (item, idx) {
        var d = new Date(item.ts);
        var time = String(d.getHours()).padStart(2, '0') + ':' +
                   String(d.getMinutes()).padStart(2, '0');
        return '<div class="history-item" data-idx="' + idx + '">' +
          '<div class="history-meta">' +
            '<span class="history-type">' + (typeLabels[item.type] || item.type) + '</span>' +
            '<span>' + time + '</span>' +
          '</div>' +
          '<div class="history-summary">' + escapeHtml(item.summary) + '</div>' +
          '<button class="history-del" data-del="' + idx + '" title="删除">✕</button>' +
        '</div>';
      }).join('');
    }
    historyCountEl.textContent = '(' + history.length + ')';
  }

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
    if (e.key === 'Escape' && historyDrawer.classList.contains('open')) closeHistory();
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
      if (!isNaN(di)) { history.splice(di, 1); saveHistory(); renderHistory(); }
      e.stopPropagation();
      return;
    }
    var item = e.target.closest('.history-item');
    if (!item) return;
    var idx = parseInt(item.dataset.idx, 10);
    var rec = history[idx];
    if (!rec) return;

    if (rec.type === 'convert') {
      fromCitySel.value = rec.data.fromTz;
      toCitySel.value = rec.data.toTz;
      convertDateEl.value = rec.data.date;
      convertTimeEl.value = rec.data.time;
      setMode('convert');
      doConvert();
    } else if (rec.type === 'planner') {
      state.plannerCities = rec.data.cities.slice();
      plannerDateEl.value = rec.data.date;
      state.workStart = rec.data.workStart;
      state.workEnd = rec.data.workEnd;
      state.duration = rec.data.duration;
      state.timeGranularity = rec.data.granularity || 30;
      workStartEl.value = state.workStart;
      workEndEl.value = state.workEnd;
      Array.prototype.forEach.call(durationSeg.children, function (b) {
        b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.duration);
      });
      Array.prototype.forEach.call(granularitySeg.children, function (b) {
        b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.timeGranularity);
      });
      save();
      setMode('planner');
      renderPlannerCities();
      calcPlanner();
    }
    closeHistory();
    showToast('↩️ 已恢复记录');
  });

  /* ============ 分享 ============ */
  shareBtn.addEventListener('click', function () {
    var sp = new URLSearchParams();
    sp.set('mode', state.mode);
    sp.set('h12', state.hour12 ? '1' : '0');
    sp.set('sec', state.showSeconds ? '1' : '0');
    if (state.mode === 'clock') {
      sp.set('cities', state.clockCities.map(function (c) { return c.tz; }).join(','));
    } else if (state.mode === 'convert') {
      sp.set('from', fromCitySel.value);
      sp.set('to', toCitySel.value);
      sp.set('date', convertDateEl.value);
      sp.set('time', convertTimeEl.value);
    } else if (state.mode === 'planner') {
      sp.set('pcities', state.plannerCities.map(function (c) { return c.tz; }).join(','));
      sp.set('ws', state.workStart);
      sp.set('we', state.workEnd);
      sp.set('pd', plannerDateEl.value);
      sp.set('dur', state.duration);
      sp.set('gran', state.timeGranularity);
    }
    var url = location.origin + location.pathname + '#' + sp.toString();
    copyText(url);
  });

  function loadFromURL() {
    try {
      var hash = location.hash.replace(/^#/, '');
      if (!hash) return false;
      var sp = new URLSearchParams(hash);
      if (sp.get('h12') === '1') state.hour12 = true;
      if (sp.get('sec') === '1') state.showSeconds = true;
      var mode = sp.get('mode');
      if (mode === 'clock' || mode === 'convert' || mode === 'planner') state.mode = mode;
      if (state.mode === 'clock' && sp.get('cities')) {
        var arr = sp.get('cities').split(',').filter(Boolean);
        if (arr.length) {
          state.clockCities = arr.map(function (tz) {
            var c = getCityByTz(tz);
            return { tz: c.tz, name: c.name, country: c.country };
          });
        }
      }
      if (state.mode === 'planner' && sp.get('pcities')) {
        var parr = sp.get('pcities').split(',').filter(Boolean);
        if (parr.length) {
          state.plannerCities = parr.map(function (tz) {
            var c = getCityByTz(tz);
            return { tz: c.tz, name: c.name, country: c.country };
          });
        }
        if (sp.get('ws')) state.workStart = sp.get('ws');
        if (sp.get('we')) state.workEnd = sp.get('we');
        if (sp.get('dur')) state.duration = parseInt(sp.get('dur'), 10) || 60;
        if (sp.get('gran')) state.timeGranularity = parseInt(sp.get('gran'), 10) || 30;
      }
      return true;
    } catch (e) { return false; }
  }

  /* ============ 初始化 ============ */
  function init() {
    var fromURL = loadFromURL();
    load();
    loadHistory();

    if (!state.clockCities || state.clockCities.length === 0) {
      state.clockCities = defaultClockCities();
    }
    if (!state.plannerCities || state.plannerCities.length === 0) {
      state.plannerCities = defaultPlannerCities();
    }

    var today = new Date();
    convertDateEl.value = formatDateInput(today);
    convertTimeEl.value = String(today.getHours()).padStart(2, '0') + ':' +
                          String(today.getMinutes()).padStart(2, '0');
    plannerDateEl.value = formatDateInput(today);

    workStartEl.value = state.workStart;
    workEndEl.value = state.workEnd;

    Array.prototype.forEach.call(durationSeg.children, function (b) {
      b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.duration);
    });
    Array.prototype.forEach.call(granularitySeg.children, function (b) {
      b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.timeGranularity);
    });

    syncToolbar();
    renderHistory();
    setMode(state.mode || 'clock');
  }

  init();
})();