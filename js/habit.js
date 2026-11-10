/* js/habit.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.habit.v1';

  /* ============ 常量 ============ */
  var EMOJIS = [
    '🌅', '🏃', '📚', '💧', '🧘', '💪', '🚭', '📝', '🎵', '🌙',
    '💰', '🥗', '🦷', '🚶', '📖', '🎨', '🎯', '📵', '🧹', '☀️',
    '🧠', '🌱', '🎸', '🍎', '😊', '🙏', '💊', '🚴', '🏊', '⛹️'
  ];

  var COLORS = [
    '#8a5a2b', // 棕
    '#2a6ba8', // 蓝
    '#1f6a29', // 绿
    '#a32222', // 红
    '#8b1a9b', // 紫
    '#a05b00', // 橙
    '#166a5a', // 青
    '#6b5d47', // 灰棕
    '#b8860b', // 暗金
    '#c0392b'  // 深红
  ];

  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  /* ============ DOM ============ */
  var overviewGrid  = document.getElementById('overviewGrid');
  var habitList     = document.getElementById('habitList');
  var emptyTip      = document.getElementById('emptyTip');
  var addHabitBtn   = document.getElementById('addHabitBtn');
  var importBtn     = document.getElementById('importBtn');
  var exportBtn     = document.getElementById('exportBtn');
  var importFile    = document.getElementById('importFile');

  var habitModal    = document.getElementById('habitModal');
  var modalClose    = document.getElementById('modalClose');
  var modalTitle    = document.getElementById('modalTitle');
  var habitNameEl   = document.getElementById('habitName');
  var emojiGrid     = document.getElementById('emojiGrid');
  var colorRow      = document.getElementById('colorRow');
  var saveBtn       = document.getElementById('saveBtn');
  var cancelBtn     = document.getElementById('cancelBtn');

  /* ============ 状态 ============ */
  var state = {
    habits: [],
    editingId: null,
    form: {
      emoji: EMOJIS[0],
      color: COLORS[0]
    }
  };

  var uidCounter = 0;

  /* ============ 工具 ============ */
  function genId() {
    return 'h' + Date.now().toString(36) + '_' + (uidCounter++).toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDate(str) {
    var p = str.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function todayStr() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatDate(d);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* 浅色混合 */
  function lighten(hex, ratio) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    r = Math.round(r + (255 - r) * ratio);
    g = Math.round(g + (255 - g) * ratio);
    b = Math.round(b + (255 - b) * ratio);
    return '#' + pad2(r.toString(16)) + pad2(g.toString(16)) + pad2(b.toString(16));
  }

  /* ============ 状态计算 ============ */
  function calcStreak(habit) {
    if (!habit.checkins || habit.checkins.length === 0) return 0;
    var checkinSet = {};
    habit.checkins.forEach(function (d) { checkinSet[d] = true; });

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var cursor = new Date(today);

    // 如果今天没打卡，从昨天开始算（今天还没过完，不算断）
    if (!checkinSet[formatDate(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
      // 如果昨天也没打卡，streak = 0
      if (!checkinSet[formatDate(cursor)]) return 0;
    }

    var streak = 0;
    while (checkinSet[formatDate(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function calcLongestStreak(habit) {
    if (!habit.checkins || habit.checkins.length === 0) return 0;
    var sorted = habit.checkins.slice().sort();
    var maxStreak = 1;
    var currStreak = 1;
    for (var i = 1; i < sorted.length; i++) {
      var prev = parseDate(sorted[i - 1]);
      var curr = parseDate(sorted[i]);
      var diff = Math.round((curr - prev) / 86400000);
      if (diff === 1) {
        currStreak++;
        if (currStreak > maxStreak) maxStreak = currStreak;
      } else if (diff > 1) {
        currStreak = 1;
      }
    }
    return maxStreak;
  }

  function calcMonthRate(habit) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var days = Math.round((today - startOfMonth) / 86400000) + 1;
    var checkinSet = {};
    (habit.checkins || []).forEach(function (d) { checkinSet[d] = true; });

    var checked = 0;
    for (var i = 0; i < days; i++) {
      var d = new Date(startOfMonth);
      d.setDate(startOfMonth.getDate() + i);
      if (checkinSet[formatDate(d)]) checked++;
    }
    return days > 0 ? (checked / days) * 100 : 0;
  }

  /* ============ 打卡 ============ */
  function toggleCheckin(habitId, dateStr) {
    var habit = state.habits.find(function (h) { return h.id === habitId; });
    if (!habit) return;

    var todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    var target = parseDate(dateStr);
    if (target > todayZero) return; // 未来不能打卡

    if (!habit.checkins) habit.checkins = [];
    var idx = habit.checkins.indexOf(dateStr);
    if (idx >= 0) {
      habit.checkins.splice(idx, 1);
    } else {
      habit.checkins.push(dateStr);
    }
    save();
    render();
  }

  /* ============ 概览 ============ */
  function renderOverview() {
    var total = state.habits.length;
    var today = todayStr();
    var todayChecked = 0;
    var maxStreak = 0;
    var totalCheckins = 0;

    state.habits.forEach(function (h) {
      if (h.checkins && h.checkins.indexOf(today) >= 0) todayChecked++;
      var s = calcStreak(h);
      if (s > maxStreak) maxStreak = s;
      totalCheckins += (h.checkins || []).length;
    });

    overviewGrid.innerHTML = [
      '<div class="overview-card primary">',
        '<span class="overview-label">今日完成</span>',
        '<span class="overview-value">' + todayChecked + '<span class="unit">/ ' + total + '</span></span>',
      '</div>',
      '<div class="overview-card">',
        '<span class="overview-label">当前最长连续</span>',
        '<span class="overview-value">' + maxStreak + '<span class="unit">天</span></span>',
      '</div>',
      '<div class="overview-card">',
        '<span class="overview-label">习惯总数</span>',
        '<span class="overview-value">' + total + '<span class="unit">个</span></span>',
      '</div>',
      '<div class="overview-card">',
        '<span class="overview-label">累计打卡</span>',
        '<span class="overview-value">' + totalCheckins + '<span class="unit">次</span></span>',
      '</div>'
    ].join('');
  }

  /* ============ 渲染周迷你视图 ============ */
  function renderWeekMini(habit) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var checkinSet = {};
    (habit.checkins || []).forEach(function (d) { checkinSet[d] = true; });

    var html = '<div class="week-mini">';
    html += '<span class="week-mini-label">最近 7 天</span>';
    html += '<div class="week-mini-days">';

    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var ds = formatDate(d);
      var checked = checkinSet[ds];
      var isToday = i === 0;
      var cls = 'mini-day';
      if (checked) cls += ' checked';
      if (isToday) cls += ' today';
      var style = checked ? 'background:' + habit.color + ';' : '';
      html += '<div class="' + cls + '" style="' + style + '" data-habit="' + habit.id + '" data-date="' + ds + '" title="' + ds + (isToday ? ' 今天' : '') + '">' +
        WEEKDAYS[d.getDay()] + '</div>';
    }

    html += '</div></div>';
    return html;
  }

  /* ============ 渲染热力图 ============ */
  function renderHeatmap(habit) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayDay = today.getDay();
    var todayMon = (todayDay + 6) % 7;

    var thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - todayMon);

    var startMonday = new Date(thisMonday);
    startMonday.setDate(thisMonday.getDate() - 52 * 7);

    var checkinSet = {};
    (habit.checkins || []).forEach(function (d) { checkinSet[d] = true; });

    var checkedColor = habit.color;
    var emptyColor = '#ecdfc4';
    var todayDS = formatDate(today);

    // 计算月份标签位置
    var monthLabels = [];
    var lastMonth = -1;
    var cellsHTML = '';

    for (var w = 0; w < 53; w++) {
      for (var d = 0; d < 7; d++) {
        var date = new Date(startMonday);
        date.setDate(startMonday.getDate() + w * 7 + d);
        var ds = formatDate(date);
        var isFuture = date > today;
        var isToday = ds === todayDS;
        var checked = checkinSet[ds];

        var bgColor = checked ? checkedColor : emptyColor;
        var cls = 'heatmap-cell';
        if (isFuture) cls += ' future';
        if (isToday) cls += ' today';

        cellsHTML += '<div class="' + cls + '" style="background:' + bgColor + '" ' +
          'data-habit="' + habit.id + '" data-date="' + ds + '" ' +
          'title="' + ds + (checked ? ' ✓ 已打卡' : ' · 未打卡') + '"></div>';

        // 记录每月第一天
        if (d === 0) {
          var m = date.getMonth();
          if (m !== lastMonth) {
            lastMonth = m;
            monthLabels.push({ week: w, month: m + 1 });
          }
        }
      }
    }

    // 月份标签
    var monthHTML = '<div class="heatmap-months">';
    monthLabels.forEach(function (ml) {
      // 每列约 11px + gap 3px = 14px
      var left = ml.week * 14;
      monthHTML += '<span class="heatmap-month-label" style="left:' + left + 'px">' + ml.month + '月</span>';
    });
    monthHTML += '</div>';

    // 行标签（周一、周三、周五）
    var rowLabels = '<div class="heatmap-row-labels">';
    ['一', '', '三', '', '五', '', '日'].forEach(function (l) {
      rowLabels += '<div class="heatmap-row-label">' + l + '</div>';
    });
    rowLabels += '</div>';

    return '<div class="heatmap-wrap">' +
      '<div class="heatmap-container">' +
        monthHTML +
        rowLabels +
        '<div class="heatmap">' + cellsHTML + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ============ 渲染习惯卡片 ============ */
  function renderHabitCard(habit) {
    var streak = calcStreak(habit);
    var longest = calcLongestStreak(habit);
    var monthRate = calcMonthRate(habit);
    var totalCheckins = (habit.checkins || []).length;
    var todayChecked = (habit.checkins || []).indexOf(todayStr()) >= 0;
    var emojiBg = lighten(habit.color, 0.82);

    var html = '<div class="habit-card" data-id="' + habit.id + '">';

    // 头部
    html += '<div class="habit-head">';
    html += '<div class="habit-emoji" style="background:' + emojiBg + ';">' + escapeHtml(habit.emoji) + '</div>';
    html += '<div class="habit-info">';
    html += '<div class="habit-name">' + escapeHtml(habit.name) + '</div>';
    html += '<div class="habit-meta">已创建 ' + daysSinceCreated(habit) + ' 天 · 累计打卡 ' + totalCheckins + ' 次</div>';
    html += '</div>';
    html += '<div class="habit-actions">';
    html += '<button class="icon-btn" data-act="edit" data-id="' + habit.id + '" title="编辑">✏️</button>';
    html += '<button class="icon-btn danger" data-act="del" data-id="' + habit.id + '" title="删除">🗑️</button>';
    html += '</div>';
    html += '</div>';

    // 统计
    html += '<div class="habit-stats">';
    html += '<div class="hstat"><div class="hstat-label">🔥 当前连续</div><div class="hstat-value">' + streak + ' 天</div></div>';
    html += '<div class="hstat"><div class="hstat-label">🏆 最长连续</div><div class="hstat-value">' + longest + ' 天</div></div>';
    html += '<div class="hstat"><div class="hstat-label">📊 本月完成率</div><div class="hstat-value">' + monthRate.toFixed(0) + '%</div></div>';
    html += '<div class="hstat"><div class="hstat-label">🎯 累计打卡</div><div class="hstat-value">' + totalCheckins + ' 次</div></div>';
    html += '</div>';

    // 今日打卡按钮
    html += '<button class="checkin-btn' + (todayChecked ? ' done' : '') + '" data-act="toggle-today" data-id="' + habit.id + '" type="button">';
    if (todayChecked) {
      html += '<span class="check-icon">✅</span> 今日已完成 · 再点取消';
    } else {
      html += '<span class="check-icon">☑️</span> 点击打卡（今日）';
    }
    html += '</button>';

    // 最近 7 天
    html += renderWeekMini(habit);

    // 热力图
    html += renderHeatmap(habit);

    html += '</div>';
    return html;
  }

  function daysSinceCreated(habit) {
    if (!habit.createdAt) return 1;
    var now = Date.now();
    var days = Math.floor((now - habit.createdAt) / 86400000) + 1;
    return Math.max(1, days);
  }

  /* ============ 渲染列表 ============ */
  function render() {
    renderOverview();

    if (state.habits.length === 0) {
      emptyTip.hidden = false;
      habitList.innerHTML = '';
      return;
    }

    emptyTip.hidden = true;
    habitList.innerHTML = state.habits.map(renderHabitCard).join('');
  }

  /* ============ 持久化 ============ */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits: state.habits }));
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.habits)) {
        state.habits = data.habits.filter(function (h) {
          return h && h.id && h.name;
        }).map(function (h) {
          return {
            id: String(h.id),
            name: String(h.name),
            emoji: String(h.emoji || '🌱'),
            color: String(h.color || '#8a5a2b'),
            checkins: Array.isArray(h.checkins) ? h.checkins.filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }) : [],
            createdAt: Number(h.createdAt) || Date.now()
          };
        });
      }
    } catch (e) { /* ignore */ }
  }

  /* ============ 删除 / 编辑 ============ */
  function deleteHabit(id) {
    var h = state.habits.find(function (x) { return x.id === id; });
    if (!h) return;
    if (!confirm('删除习惯「' + h.name + '」？所有打卡记录都会丢失。')) return;
    state.habits = state.habits.filter(function (x) { return x.id !== id; });
    save();
    render();
  }

  /* ============ 添加 / 编辑 Modal ============ */
  function openHabitModal(habit) {
    if (habit) {
      state.editingId = habit.id;
      modalTitle.textContent = '编辑习惯';
      habitNameEl.value = habit.name;
      state.form.emoji = habit.emoji;
      state.form.color = habit.color;
    } else {
      state.editingId = null;
      modalTitle.textContent = '添加习惯';
      habitNameEl.value = '';
      state.form.emoji = EMOJIS[0];
      state.form.color = COLORS[0];
    }
    renderEmojiGrid();
    renderColorRow();
    habitModal.hidden = false;
    setTimeout(function () { habitNameEl.focus(); }, 100);
  }

  function closeHabitModal() {
    habitModal.hidden = true;
    state.editingId = null;
  }

  function renderEmojiGrid() {
    emojiGrid.innerHTML = '';
    EMOJIS.forEach(function (e) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-btn' + (e === state.form.emoji ? ' active' : '');
      btn.textContent = e;
      btn.addEventListener('click', function () {
        state.form.emoji = e;
        renderEmojiGrid();
      });
      emojiGrid.appendChild(btn);
    });
  }

  function renderColorRow() {
    colorRow.innerHTML = '';
    COLORS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-btn' + (c === state.form.color ? ' active' : '');
      btn.style.background = c;
      btn.addEventListener('click', function () {
        state.form.color = c;
        renderColorRow();
      });
      colorRow.appendChild(btn);
    });
  }

  function saveHabit() {
    var name = habitNameEl.value.trim();
    if (!name) {
      alert('请填写习惯名称');
      habitNameEl.focus();
      return;
    }

    if (state.editingId) {
      var h = state.habits.find(function (x) { return x.id === state.editingId; });
      if (h) {
        h.name = name;
        h.emoji = state.form.emoji;
        h.color = state.form.color;
      }
    } else {
      state.habits.push({
        id: genId(),
        name: name,
        emoji: state.form.emoji,
        color: state.form.color,
        checkins: [],
        createdAt: Date.now()
      });
    }

    save();
    closeHabitModal();
    render();
  }

  /* ============ 事件绑定 ============ */
  addHabitBtn.addEventListener('click', function () { openHabitModal(null); });
  saveBtn.addEventListener('click', saveHabit);
  cancelBtn.addEventListener('click', closeHabitModal);
  modalClose.addEventListener('click', closeHabitModal);
  habitModal.addEventListener('click', function (e) {
    if (e.target === habitModal) closeHabitModal();
  });

  habitNameEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveHabit();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !habitModal.hidden) closeHabitModal();
  });

  /* 列表事件委托 */
  habitList.addEventListener('click', function (e) {
    var cell = e.target.closest('[data-date]');
    if (cell) {
      var habitId = cell.dataset.habit;
      var dateStr = cell.dataset.date;
      toggleCheckin(habitId, dateStr);
      return;
    }

    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.dataset.act;
    var id = btn.dataset.id;

    if (act === 'del') {
      deleteHabit(id);
    } else if (act === 'edit') {
      var h = state.habits.find(function (x) { return x.id === id; });
      if (h) openHabitModal(h);
    } else if (act === 'toggle-today') {
      toggleCheckin(id, todayStr());
    }
  });

  /* ============ 导入 / 导出 ============ */
  function exportJSON() {
    if (state.habits.length === 0) {
      alert('没有习惯可以导出');
      return;
    }
    var data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      habits: state.habits
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var d = new Date();
    var ts = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'habits-' + ts + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function importJSON() {
    importFile.click();
  }

  importFile.addEventListener('change', function () {
    var f = importFile.files && importFile.files[0];
    if (!f) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.habits)) {
          alert('文件格式不正确');
          return;
        }

        var imported = data.habits.filter(function (h) {
          return h && h.name;
        }).map(function (h) {
          return {
            id: genId(),
            name: String(h.name),
            emoji: String(h.emoji || '🌱'),
            color: String(h.color || '#8a5a2b'),
            checkins: Array.isArray(h.checkins) ? h.checkins.filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }) : [],
            createdAt: Number(h.createdAt) || Date.now()
          };
        });

        if (imported.length === 0) {
          alert('未找到有效习惯');
          return;
        }

        var merge = false;
        if (state.habits.length > 0) {
          merge = confirm('当前已有 ' + state.habits.length + ' 个习惯。\n\n点击「确定」合并导入 ' + imported.length + ' 个习惯；\n点击「取消」替换当前所有习惯。');
        }

        if (merge) {
          state.habits = state.habits.concat(imported);
        } else {
          state.habits = imported;
        }

        save();
        render();
        alert('✅ 成功导入 ' + imported.length + ' 个习惯');
      } catch (err) {
        alert('读取失败：' + (err && err.message ? err.message : err));
      } finally {
        importFile.value = '';
      }
    };
    reader.onerror = function () {
      alert('读取文件失败');
      importFile.value = '';
    };
    reader.readAsText(f);
  });

  exportBtn.addEventListener('click', exportJSON);
  importBtn.addEventListener('click', importJSON);

  /* ============ 初始化 ============ */
  load();

  // 如果没有任何习惯，自动添加 3 个示例
  if (state.habits.length === 0) {
    state.habits = [
      { id: genId(), name: '早起', emoji: '🌅', color: '#a05b00', checkins: [], createdAt: Date.now() },
      { id: genId(), name: '阅读 30 分钟', emoji: '📚', color: '#2a6ba8', checkins: [], createdAt: Date.now() },
      { id: genId(), name: '运动', emoji: '🏃', color: '#1f6a29', checkins: [], createdAt: Date.now() }
    ];
    save();
  }

  render();
})();