/* js/world-clock.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.worldclock.v1';

  /* ============ 城市数据 ============ */
  var CITIES = [
    // 亚洲
    { name: '北京', country: '中国', tz: 'Asia/Shanghai' },
    { name: '上海', country: '中国', tz: 'Asia/Shanghai' },
    { name: '香港', country: '中国', tz: 'Asia/Hong_Kong' },
    { name: '台北', country: '中国', tz: 'Asia/Taipei' },
    { name: '东京', country: '日本', tz: 'Asia/Tokyo' },
    { name: '首尔', country: '韩国', tz: 'Asia/Seoul' },
    { name: '新加坡', country: '新加坡', tz: 'Asia/Singapore' },
    { name: '曼谷', country: '泰国', tz: 'Asia/Bangkok' },
    { name: '吉隆坡', country: '马来西亚', tz: 'Asia/Kuala_Lumpur' },
    { name: '雅加达', country: '印度尼西亚', tz: 'Asia/Jakarta' },
    { name: '马尼拉', country: '菲律宾', tz: 'Asia/Manila' },
    { name: '河内', country: '越南', tz: 'Asia/Ho_Chi_Minh' },
    { name: '新德里', country: '印度', tz: 'Asia/Kolkata' },
    { name: '孟买', country: '印度', tz: 'Asia/Kolkata' },
    { name: '迪拜', country: '阿联酋', tz: 'Asia/Dubai' },
    { name: '利雅得', country: '沙特阿拉伯', tz: 'Asia/Riyadh' },
    { name: '特拉维夫', country: '以色列', tz: 'Asia/Jerusalem' },
    { name: '伊斯坦布尔', country: '土耳其', tz: 'Europe/Istanbul' },
    // 欧洲
    { name: '伦敦', country: '英国', tz: 'Europe/London' },
    { name: '巴黎', country: '法国', tz: 'Europe/Paris' },
    { name: '柏林', country: '德国', tz: 'Europe/Berlin' },
    { name: '罗马', country: '意大利', tz: 'Europe/Rome' },
    { name: '马德里', country: '西班牙', tz: 'Europe/Madrid' },
    { name: '阿姆斯特丹', country: '荷兰', tz: 'Europe/Amsterdam' },
    { name: '布鲁塞尔', country: '比利时', tz: 'Europe/Brussels' },
    { name: '苏黎世', country: '瑞士', tz: 'Europe/Zurich' },
    { name: '维也纳', country: '奥地利', tz: 'Europe/Vienna' },
    { name: '斯德哥尔摩', country: '瑞典', tz: 'Europe/Stockholm' },
    { name: '奥斯陆', country: '挪威', tz: 'Europe/Oslo' },
    { name: '哥本哈根', country: '丹麦', tz: 'Europe/Copenhagen' },
    { name: '赫尔辛基', country: '芬兰', tz: 'Europe/Helsinki' },
    { name: '莫斯科', country: '俄罗斯', tz: 'Europe/Moscow' },
    { name: '基辅', country: '乌克兰', tz: 'Europe/Kiev' },
    { name: '雅典', country: '希腊', tz: 'Europe/Athens' },
    { name: '里斯本', country: '葡萄牙', tz: 'Europe/Lisbon' },
    // 美洲
    { name: '纽约', country: '美国', tz: 'America/New_York' },
    { name: '华盛顿', country: '美国', tz: 'America/New_York' },
    { name: '波士顿', country: '美国', tz: 'America/New_York' },
    { name: '芝加哥', country: '美国', tz: 'America/Chicago' },
    { name: '达拉斯', country: '美国', tz: 'America/Chicago' },
    { name: '丹佛', country: '美国', tz: 'America/Denver' },
    { name: '凤凰城', country: '美国', tz: 'America/Phoenix' },
    { name: '洛杉矶', country: '美国', tz: 'America/Los_Angeles' },
    { name: '旧金山', country: '美国', tz: 'America/Los_Angeles' },
    { name: '西雅图', country: '美国', tz: 'America/Los_Angeles' },
    { name: '多伦多', country: '加拿大', tz: 'America/Toronto' },
    { name: '温哥华', country: '加拿大', tz: 'America/Vancouver' },
    { name: '墨西哥城', country: '墨西哥', tz: 'America/Mexico_City' },
    { name: '圣保罗', country: '巴西', tz: 'America/Sao_Paulo' },
    { name: '布宜诺斯艾利斯', country: '阿根廷', tz: 'America/Argentina/Buenos_Aires' },
    { name: '圣地亚哥', country: '智利', tz: 'America/Santiago' },
    // 大洋洲
    { name: '悉尼', country: '澳大利亚', tz: 'Australia/Sydney' },
    { name: '墨尔本', country: '澳大利亚', tz: 'Australia/Melbourne' },
    { name: '布里斯班', country: '澳大利亚', tz: 'Australia/Brisbane' },
    { name: '珀斯', country: '澳大利亚', tz: 'Australia/Perth' },
    { name: '奥克兰', country: '新西兰', tz: 'Pacific/Auckland' },
    // 非洲
    { name: '开罗', country: '埃及', tz: 'Africa/Cairo' },
    { name: '约翰内斯堡', country: '南非', tz: 'Africa/Johannesburg' },
    { name: '内罗毕', country: '肯尼亚', tz: 'Africa/Nairobi' },
    { name: '拉各斯', country: '尼日利亚', tz: 'Africa/Lagos' },
    // UTC
    { name: 'UTC', country: '协调世界时', tz: 'UTC' }
  ];

  /* ============ 状态 ============ */
  var state = {
    mode: 'clock', // clock | convert | planner
    clockCities: [],       // [{tz, name, country}]
    plannerCities: [],     // [{tz, name, country}]
    duration: 60,
    workStart: '09:00',
    workEnd: '17:00',
    plannerDate: '',
    selectedModalTarget: null // 'clock' | 'planner'
  };

  var clockTimer = null;

  /* ============ DOM ============ */
  var modeSeg        = document.getElementById('modeSeg');
  var clockPanel     = document.getElementById('clockPanel');
  var convertPanel   = document.getElementById('convertPanel');
  var plannerPanel   = document.getElementById('plannerPanel');
  var clockGrid      = document.getElementById('clockGrid');
  var addCityBtn     = document.getElementById('addCityBtn');
  var fromCitySel    = document.getElementById('fromCity');
  var toCitySel      = document.getElementById('toCity');
  var convertDateEl  = document.getElementById('convertDate');
  var convertTimeEl  = document.getElementById('convertTime');
  var convertBtn     = document.getElementById('convertBtn');
  var convertNowBtn  = document.getElementById('convertNowBtn');
  var convertResult  = document.getElementById('convertResult');
  var plannerCities  = document.getElementById('plannerCities');
  var plannerAddBtn  = document.getElementById('plannerAddBtn');
  var workStartEl    = document.getElementById('workStart');
  var workEndEl      = document.getElementById('workEnd');
  var plannerDateEl  = document.getElementById('plannerDate');
  var durationSeg    = document.getElementById('durationSeg');
  var plannerCalcBtn = document.getElementById('plannerCalcBtn');
  var plannerResult  = document.getElementById('plannerResult');
  var plannerChart   = document.getElementById('plannerChart');
  var plannerOverlaps= document.getElementById('plannerOverlaps');
  var cityModal      = document.getElementById('cityModal');
  var cityModalClose = document.getElementById('cityModalClose');
  var citySearch     = document.getElementById('citySearch');
  var cityList       = document.getElementById('cityList');

  /* ============ 工具函数 ============ */
  function getCityByTz(tz) {
    for (var i = 0; i < CITIES.length; i++) {
      if (CITIES[i].tz === tz) return CITIES[i];
    }
    return { name: tz, country: '', tz: tz };
  }

  function getTzOffsetMinutes(tz, date) {
    // 返回指定时区在指定时刻的 UTC 偏移（分钟）
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
    var dtf = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return dtf.format(d);
  }

  function formatTimeInTz(tz, date) {
    var d = date || new Date();
    var dtf = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return dtf.format(d);
  }

  function formatTimeHM(tz, date) {
    var d = date || new Date();
    var dtf = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    return dtf.format(d);
  }

  function getHourInTz(tz, date) {
    var d = date || new Date();
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit'
    });
    return parseInt(dtf.format(d), 10);
  }

  function isNightHour(h) {
    return h < 6 || h >= 20;
  }

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
    // 'HH:MM' -> 分钟数
    if (!str) return 0;
    var p = str.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || '0', 10);
  }

  function minutesToHM(mins) {
    var h = Math.floor(mins / 60) % 24;
    var m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  /* ============ 持久化 ============ */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        clockCities: state.clockCities,
        plannerCities: state.plannerCities,
        duration: state.duration,
        workStart: state.workStart,
        workEnd: state.workEnd
      }));
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data) {
        if (Array.isArray(data.clockCities) && data.clockCities.length) {
          state.clockCities = data.clockCities;
        }
        if (Array.isArray(data.plannerCities) && data.plannerCities.length) {
          state.plannerCities = data.plannerCities;
        }
        if (data.duration) state.duration = data.duration;
        if (data.workStart) state.workStart = data.workStart;
        if (data.workEnd) state.workEnd = data.workEnd;
      }
    } catch (e) { /* ignore */ }
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
    if (mode === 'convert') {
      renderCitySelects();
    }
    if (mode === 'planner') {
      renderPlannerCities();
    }
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

  function renderClockGrid() {
    var now = new Date();
    var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    var localOffset = getTzOffsetMinutes(localTz, now);

    clockGrid.innerHTML = '';

    if (state.clockCities.length === 0) {
      clockGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#a0947c;padding:40px 12px;">还没有添加城市，点击下方按钮开始</p>';
      return;
    }

    state.clockCities.forEach(function (city, idx) {
      var offset = getTzOffsetMinutes(city.tz, now);
      var hour = getHourInTz(city.tz, now);
      var night = isNightHour(hour);
      var dst = isDST(city.tz, now);
      var diffMin = offset - localOffset;
      var diffStr;
      if (diffMin === 0) {
        diffStr = '与本地相同';
      } else {
        var sign = diffMin > 0 ? '+' : '-';
        var abs = Math.abs(diffMin);
        var dh = Math.floor(abs / 60);
        var dm = abs % 60;
        diffStr = sign + dh + (dm ? '.' + Math.round(dm / 60 * 10) / 10 : '') + ' 小时';
      }

      var card = document.createElement('div');
      card.className = 'clock-card ' + (night ? 'is-night' : 'is-day');
      card.dataset.idx = idx;

      var badgeHtml = '';
      if (dst) badgeHtml = '<span class="clock-badge">夏令时</span>';

      card.innerHTML =
        '<button class="clock-remove" data-idx="' + idx + '" title="移除">×</button>' +
        '<div class="clock-city">' + escapeHtml(city.name) +
          '<span class="clock-country">' + escapeHtml(city.country || '') + '</span></div>' +
        '<div class="clock-time" data-tz="' + city.tz + '">' + formatTimeInTz(city.tz, now) + '</div>' +
        '<div class="clock-date">' + formatDateInTz(city.tz, now) + '</div>' +
        '<div class="clock-offset">' + formatOffset(offset) + ' ' + badgeHtml + '</div>' +
        '<div class="clock-diff">' + diffStr + '</div>';

      clockGrid.appendChild(card);
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
        el.textContent = formatTimeInTz(el.dataset.tz, now);
      });
      // 每分钟全面刷新一次日期/日夜状态
      var sec = now.getSeconds();
      if (sec === 0) renderClockGrid();
    }, 1000);
  }

  function stopClockTimer() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

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
      ? state.clockCities
      : state.plannerCities;

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
      div.addEventListener('click', function () {
        addCityToTarget(c);
      });
      cityList.appendChild(div);
    });
  }

  function addCityToTarget(c) {
    var list = state.selectedModalTarget === 'clock'
      ? state.clockCities
      : state.plannerCities;

    // 避免重复
    var exists = list.some(function (x) {
      return x.tz === c.tz && x.name === c.name;
    });
    if (exists) {
      cityModal.hidden = true;
      return;
    }

    list.push({ tz: c.tz, name: c.name, country: c.country });
    save();
    cityModal.hidden = true;

    if (state.selectedModalTarget === 'clock') {
      renderClockGrid();
    } else {
      renderPlannerCities();
    }
  }

  citySearch.addEventListener('input', function () {
    renderCityList(citySearch.value);
  });

  cityModalClose.addEventListener('click', function () {
    cityModal.hidden = true;
  });
  cityModal.addEventListener('click', function (e) {
    if (e.target === cityModal) cityModal.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !cityModal.hidden) cityModal.hidden = true;
  });

  addCityBtn.addEventListener('click', function () {
    openCityModal('clock');
  });

  /* ============ 时区转换 ============ */
  function renderCitySelects() {
    var options = CITIES.map(function (c) {
      return '<option value="' + c.tz + '">' + escapeHtml(c.name) + ' · ' + escapeHtml(c.country || '') + '</option>';
    }).join('');

    var prevFrom = fromCitySel.value;
    var prevTo = toCitySel.value;
    fromCitySel.innerHTML = options;
    toCitySel.innerHTML = options;

    // 默认
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
    if (!dateStr) {
      alert('请选择日期');
      return;
    }
    if (!timeStr) timeStr = '12:00';

    var d = parseDateInput(dateStr);
    var tp = timeStr.split(':');
    d.setHours(parseInt(tp[0], 10), parseInt(tp[1], 10), 0, 0);

    var fromOffset = getTzOffsetMinutes(fromTz, d);
    var toOffset = getTzOffsetMinutes(toTz, d);

    // 构建源时区的"本地时间"对应的 UTC
    var utcMs = d.getTime() - fromOffset * 60000;
    var targetDate = new Date(utcMs + toOffset * 60000);

    // 用 Intl 格式化目标时区
    var targetTime = formatTimeHM(toTz, new Date(utcMs));
    var targetFullDate = formatDateInTz(toTz, new Date(utcMs));

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

    var fromTime = formatTimeHM(fromTz, d);
    var fromFullDate = formatDateInTz(fromTz, d);

    convertResult.hidden = false;
    convertResult.innerHTML =
      '<div class="convert-result-main">' +
        '<div class="convert-city-block">' +
          '<div class="convert-city-name">' + escapeHtml(fromName) + '</div>' +
          '<div class="convert-city-time">' + fromTime + '</div>' +
          '<div class="convert-city-date">' + fromFullDate + '</div>' +
          '<div class="convert-city-offset">' + formatOffset(fromOffset) + '</div>' +
        '</div>' +
        '<div class="convert-arrow">→</div>' +
        '<div class="convert-city-block">' +
          '<div class="convert-city-name">' + escapeHtml(toName) + '</div>' +
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
    convertTimeEl.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    doConvert();
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
      removeBtn.className = 'planner-city-remove';
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () {
        state.plannerCities.splice(idx, 1);
        save();
        renderPlannerCities();
        plannerResult.hidden = true;
      });

      row.appendChild(sel);
      row.appendChild(removeBtn);
      plannerCities.appendChild(row);
    });
  }

  plannerAddBtn.addEventListener('click', function () {
    openCityModal('planner');
  });

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

  function calcPlanner() {
    if (state.plannerCities.length < 2) {
      alert('至少需要 2 个参会城市');
      return;
    }

    var dateStr = plannerDateEl.value;
    if (!dateStr) {
      alert('请选择会议日期');
      return;
    }

    var date = parseDateInput(dateStr);
    var workStartMin = formatHM(state.workStart);
    var workEndMin = formatHM(state.workEnd);
    if (workEndMin <= workStartMin) workEndMin = workStartMin + 8 * 60; // 兜底

    var duration = state.duration;

    // 以 UTC 为基准，枚举 24 小时中每 30 分钟一个 slot
    // 先确定所有城市的 UTC 偏移
    var cities = state.plannerCities.map(function (c) {
      return {
        tz: c.tz,
        name: c.name,
        offset: getTzOffsetMinutes(c.tz, date)
      };
    });

    // 枚举 UTC 时间点：date 当天 00:00 UTC 开始，到 24h
    // 但为了覆盖所有可能的工作时段，我们枚举 48 个 slot（每 30 分钟）
    // 并计算每个城市本地时间
    var slots = [];
    var baseUTC = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    // baseUTC 的 getTime() 会被解释为本地时间，但我们需要 UTC 意义上的 00:00
    // 用 Date.UTC 更稳妥
    var baseUTCMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

    for (var i = 0; i < 48; i++) {
      var utcMs = baseUTCMs + i * 30 * 60000;
      var utcDate = new Date(utcMs);

      var cityTimes = cities.map(function (c) {
        var localMs = utcMs + c.offset * 60000;
        var localDate = new Date(localMs);
        var localHour = localDate.getUTCHours();
        var localMin = localDate.getUTCMinutes();
        var localTotalMin = localHour * 60 + localMin;
        var inWork = localTotalMin >= workStartMin && localTotalMin < workEndMin;
        return {
          name: c.name,
          tz: c.tz,
          time: minutesToHM(localTotalMin),
          inWork: inWork,
          hour: localHour
        };
      });

      var allInWork = cityTimes.every(function (t) { return t.inWork; });
      var anyInWork = cityTimes.some(function (t) { return t.inWork; });
      var offCount = cityTimes.filter(function (t) { return !t.inWork; }).length;

      slots.push({
        utcMs: utcMs,
        cityTimes: cityTimes,
        allInWork: allInWork,
        anyInWork: anyInWork,
        offCount: offCount
      });
    }

    // 连续 slot 合并成窗口
    var windows = [];
    var current = null;
    slots.forEach(function (slot) {
      if (slot.anyInWork) {
        if (!current) {
          current = { startIdx: slots.indexOf(slot), endIdx: slots.indexOf(slot), slots: [slot] };
        } else {
          current.endIdx = slots.indexOf(slot);
          current.slots.push(slot);
        }
      } else {
        if (current) {
          windows.push(current);
          current = null;
        }
      }
    });
    if (current) windows.push(current);

    // 过滤掉时长不足的窗口
    var validWindows = windows.filter(function (w) {
      return (w.endIdx - w.startIdx + 1) * 30 >= duration;
    });

    // 排序：allInWork 优先，offCount 少优先
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

    renderPlannerResult(validWindows, cities, workStartMin, workEndMin, duration);
  }

  plannerCalcBtn.addEventListener('click', calcPlanner);

  /* ============ 会议规划器渲染 ============ */
  function renderPlannerResult(windows, cities, workStartMin, workEndMin, duration) {
    plannerResult.hidden = false;

    if (windows.length === 0) {
      plannerOverlaps.innerHTML =
        '<p style="text-align:center;color:#a0947c;padding:20px;font-size:.86rem;">' +
        '😕 没有找到满足时长要求的共同工作时段。' +
        '<br>建议缩短会议时长、调整工作时段，或减少参会城市。</p>';
      // 仍然画图
      drawPlannerChart(null, cities, workStartMin, workEndMin);
      return;
    }

    // 画图
    drawPlannerChart(windows, cities, workStartMin, workEndMin);

    // 渲染重叠卡片
    var html = '';
    var maxShow = Math.min(windows.length, 8);
    for (var i = 0; i < maxShow; i++) {
      var w = windows[i];
      var isBest = i === 0;
      var startSlot = w.slots[0];
      var endSlot = w.slots[w.slots.length - 1];

      // 用第一个城市的本地时间显示窗口范围
      // 更准确：用每个城市分别显示
      var cityLines = w.slots[0].cityTimes.map(function (ct) {
        // 找该城市在窗口内的起止时间
        var first = w.slots[0].cityTimes.find(function (x) { return x.name === ct.name; });
        var last = w.slots[w.slots.length - 1].cityTimes.find(function (x) { return x.name === ct.name; });
        var startTime = first ? first.time : '--:--';
        var endTime = last ? last.time : '--:--';
        var off = w.slots.some(function (s) {
          var t = s.cityTimes.find(function (x) { return x.name === ct.name; });
          return t && !t.inWork;
        });
        return '<span class="' + (off ? 'off-hours' : '') + '">' +
          escapeHtml(ct.name) + ' ' + startTime + '–' + endTime +
          (off ? ' ⚠️' : '') + '</span>';
      }).join('');

      var allInWork = w.slots.every(function (s) { return s.allInWork; });
      var label = allInWork ? '全员工作时段' : '部分人非工作时段';

      html += '<div class="planner-overlap-item' + (isBest ? ' best' : '') + '">' +
        '<div class="overlap-time">' + label + '</div>' +
        '<div class="overlap-cities">' + cityLines + '</div>' +
        '</div>';
    }

    plannerOverlaps.innerHTML = html;
  }

  function drawPlannerChart(windows, cities, workStartMin, workEndMin) {
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
    var cellW = chartW / 48; // 48 个半小时 slot

    // 时间轴标签
    ctx.fillStyle = '#a0947c';
    ctx.font = '10px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var t = 0; t < 24; t += 3) {
      var x = padding.left + t * 2 * cellW;
      ctx.fillText(String(t).padStart(2, '0') + ':00', x, 8);
    }

    // 每行城市
    cities.forEach(function (city, row) {
      var y = padding.top + row * 44;

      // 城市名
      ctx.fillStyle = '#3d3226';
      ctx.font = '12px "LXGW WenKai", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(city.name, padding.left - 10, y + 16);

      // 48 个格子
      for (var i = 0; i < 48; i++) {
        var utcMs = Date.UTC(
          parseDateInput(plannerDateEl.value).getFullYear(),
          parseDateInput(plannerDateEl.value).getMonth(),
          parseDateInput(plannerDateEl.value).getDate(),
          0, 0, 0
        ) + i * 30 * 60000;

        var localMs = utcMs + city.offset * 60000;
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

      // 当前小时高亮线
      var now = new Date();
      var nowUtcMs = now.getTime();
      var baseUtcMs = Date.UTC(
        parseDateInput(plannerDateEl.value).getFullYear(),
        parseDateInput(plannerDateEl.value).getMonth(),
        parseDateInput(plannerDateEl.value).getDate(),
        0, 0, 0
      );
      var slotIdx = Math.floor((nowUtcMs - baseUtcMs) / (30 * 60000));
      if (slotIdx >= 0 && slotIdx < 48) {
        var nowX = padding.left + slotIdx * cellW;
        ctx.strokeStyle = '#8a5a2b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nowX, y);
        ctx.lineTo(nowX, y + 34);
        ctx.stroke();
      }
    });

    // 窗口高亮
    if (windows && windows.length > 0) {
      windows.forEach(function (win) {
        var startX = padding.left + win.startIdx * cellW;
        var endX = padding.left + (win.endIdx + 1) * cellW;
        ctx.fillStyle = 'rgba(138, 90, 43, 0.08)';
        ctx.fillRect(startX, padding.top - 4, endX - startX, cities.length * 44 + 8);
      });
    }

    // 分隔线
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

  /* ============ 初始化 ============ */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function init() {
    load();

    if (!state.clockCities || state.clockCities.length === 0) {
      state.clockCities = defaultClockCities();
    }
    if (!state.plannerCities || state.plannerCities.length === 0) {
      state.plannerCities = defaultPlannerCities();
    }

    // 默认日期
    var today = new Date();
    convertDateEl.value = formatDateInput(today);
    convertTimeEl.value = String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
    plannerDateEl.value = formatDateInput(today);

    // 默认工作时段
    workStartEl.value = state.workStart;
    workEndEl.value = state.workEnd;

    // 默认时长高亮
    Array.prototype.forEach.call(durationSeg.children, function (b) {
      b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.duration);
    });

    setMode('clock');
  }

  init();
})();