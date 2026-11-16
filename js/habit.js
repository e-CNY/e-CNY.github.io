/* js/habit.js */
(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function confirmAction(title, msg, onOk) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    var modal = document.getElementById('confirmModal');
    modal.hidden = false;

    var btnOk = document.getElementById('confirmOk');
    var btnCancel = document.getElementById('confirmCancel');

    function cleanup() {
      modal.hidden = true;
      btnOk.removeEventListener('click', okHandler);
      btnCancel.removeEventListener('click', cleanup);
    }

    function okHandler() {
      cleanup();
      if (onOk) onOk();
    }

    btnOk.addEventListener('click', okHandler);
    btnCancel.addEventListener('click', cleanup);
  }

  var STORAGE_KEY = 'tool.habit.v2'; // 升级版本号防止老数据冲突

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
  var exportJsonBtn = document.getElementById('exportJsonBtn');
  var exportMdBtn   = document.getElementById('exportMdBtn');
  var importBtn     = document.getElementById('importBtn');
  var importFile    = document.getElementById('importFile');

  var habitModal    = document.getElementById('habitModal');
  var modalClose    = document.getElementById('modalClose');
  var modalTitle    = document.getElementById('modalTitle');
  var habitNameEl   = document.getElementById('habitName');
  var emojiGrid     = document.getElementById('emojiGrid');
  var colorRow      = document.getElementById('colorRow');
  var customEmojiInput = document.getElementById('customEmojiInput');
  var customColorInput = document.getElementById('customColorInput');
  var saveBtn       = document.getElementById('saveBtn');
  var cancelBtn     = document.getElementById('cancelBtn');
  var tooltipEl     = document.getElementById('heatmap-tooltip');

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
  function formatDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseDate(str) { var p = str.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayStr() { var d = new Date(); d.setHours(0, 0, 0, 0); return formatDate(d); }
  function yesterdayStr() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 1); return formatDate(d); }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cursor = new Date(today);
    if (!checkinSet[formatDate(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
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
    var maxStreak = 1, currStreak = 1;
    for (var i = 1; i < sorted.length; i++) {
      var diff = Math.round((parseDate(sorted[i]) - parseDate(sorted[i - 1])) / 86400000);
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
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var days = Math.round((today - startOfMonth) / 86400000) + 1;
    var checkinSet = {};
    (habit.checkins || []).forEach(function (d) { checkinSet[d] = true; });
    var checked = 0;
    for (var i = 0; i < days; i++) {
      var d = new Date(startOfMonth); d.setDate(startOfMonth.getDate() + i);
      if (checkinSet[formatDate(d)]) checked++;
    }
    return days > 0 ? (checked / days) * 100 : 0;
  }

  /* ============ 打卡操作 ============ */
  function toggleCheckin(habitId, dateStr) {
    var habit = state.habits.find(function (h) { return h.id === habitId; });
    if (!habit) return;

    var todayZero = new Date(); todayZero.setHours(0, 0, 0, 0);
    var target = parseDate(dateStr);
    if (target > todayZero) return showToast('不能为未来时间打卡', true);

    if (!habit.checkins) habit.checkins = [];
    var idx = habit.checkins.indexOf(dateStr);
    var isChecked = idx >= 0;
    
    if (isChecked) {
      habit.checkins.splice(idx, 1);
      showToast(dateStr === todayStr() ? '已取消今日打卡' : '已取消 ' + dateStr + ' 的打卡');
    } else {
      habit.checkins.push(dateStr);
      showToast(dateStr === todayStr() ? '✅ 今日打卡成功！' : '✅ 已补卡 ' + dateStr);
    }
    save();
    render();
  }

  /* ============ 渲染概览 ============ */
  function renderOverview() {
    var total = state.habits.length;
    var today = todayStr();
    var todayChecked = 0, maxStreak = 0, totalCheckins = 0;

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

  /* ============ 渲染周视图 ============ */
  function renderWeekMini(habit) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var checkinSet = {};
    (habit.checkins || []).forEach(function (d) { checkinSet[d] = true; });

    var html = '<div class="week-mini">';
    html += '<span class="week-mini-label">最近 7 天</span><div class="week-mini-days">';

    for (var i = 6; i >= 0; i--) {
      var d = new Date(today); d.setDate(today.getDate() - i);
      var ds = formatDate(d);
      var checked = checkinSet[ds];
      var isToday = i === 0;
      var cls = 'mini-day' + (checked ? ' checked' : '') + (isToday ? ' today' : '');
      var style = checked ? 'background:' + habit.color + ';' : '';
      html += '<div class="' + cls + '" style="' + style + '" data-habit="' + habit.id + '" data-date="' + ds + '">' + WEEKDAYS[d.getDay()] + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  /* ============ 渲染热力图 ============ */
  function renderHeatmap(habit) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
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
        var cls = 'heatmap-cell' + (isFuture ? ' future' : '') + (isToday ? ' today' : '');
        
        cellsHTML += '<div class="' + cls + '" style="background:' + bgColor + '" data-habit="' + habit.id + '" data-date="' + ds + '" data-checked="' + (checked ? '1' : '0') + '"></div>';

        if (d === 0) {
          var m = date.getMonth();
          // 只有相差一个月才推入标签
          if (m !== lastMonth) {
            // 防止相邻两个月挨太近（比如只有3周）
            if (monthLabels.length === 0 || (w - monthLabels[monthLabels.length - 1].week) > 2) {
              lastMonth = m;
              monthLabels.push({ week: w, month: m + 1 });
            }
          }
        }
      }
    }

    var monthHTML = '<div class="heatmap-months">';
    monthLabels.forEach(function (ml) {
      var left = ml.week * 14;
      monthHTML += '<span class="heatmap-month-label" style="left:' + left + 'px">' + ml.month + '月</span>';
    });
    monthHTML += '</div>';

    var rowLabels = '<div class="heatmap-row-labels">';
    ['一', '', '三', '', '五', '', '日'].forEach(function (l) {
      rowLabels += '<div class="heatmap-row-label">' + l + '</div>';
    });
    rowLabels += '</div>';

    return '<div class="heatmap-wrap">' +
      '<div class="heatmap-container">' + monthHTML + rowLabels +
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
    var yesterdayChecked = (habit.checkins || []).indexOf(yesterdayStr()) >= 0;
    var emojiBg = lighten(habit.color, 0.82);

    var html = '<div class="habit-card" data-id="' + habit.id + '">';

    // 头部
    html += '<div class="habit-head">';
    html += '<div class="habit-emoji" style="background:' + emojiBg + ';">' + escapeHtml(habit.emoji) + '</div>';
    html += '<div class="habit-info">';
    html += '<div class="habit-name">' + escapeHtml(habit.name) + '</div>';
    html += '<div class="habit-meta">已创建 ' + Math.max(1, Math.floor((Date.now() - habit.createdAt) / 86400000) + 1) + ' 天 · 累计 ' + totalCheckins + ' 次</div>';
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

    // 打卡按钮
    html += '<div class="checkin-row">';
    html += '<button class="checkin-btn' + (todayChecked ? ' done' : '') + '" data-act="toggle-today" data-id="' + habit.id + '" type="button">';
    html += todayChecked ? '<span class="check-icon">✅</span> 今日已完成' : '<span class="check-icon">☑️</span> 点击打卡（今日）';
    html += '</button>';
    if (!yesterdayChecked) {
      html += '<button class="checkin-btn mini" data-act="toggle-yesterday" data-id="' + habit.id + '" type="button">⏪ 补卡昨日</button>';
    }
    html += '</div>';

    // 最近 7 天
    html += renderWeekMini(habit);
    // 热力图
    html += renderHeatmap(habit);

    html += '</div>';
    return html;
  }

  /* ============ 渲染主逻辑 ============ */
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

  /* ============ 数据存取 ============ */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits: state.habits }));
    } catch (e) { showToast('本地存储空间已满，可能无法保存', true); }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.habits)) {
        state.habits = data.habits.filter(function (h) { return h && h.id && h.name; }).map(function (h) {
          return {
            id: String(h.id), name: String(h.name), emoji: String(h.emoji || '🌱'),
            color: String(h.color || '#8a5a2b'),
            checkins: Array.isArray(h.checkins) ? h.checkins.filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }) : [],
            createdAt: Number(h.createdAt) || Date.now()
          };
        });
      }
    } catch (e) {}
  }

  /* ============ Modal 交互 ============ */
  function openHabitModal(habit) {
    if (habit) {
      state.editingId = habit.id;
      modalTitle.textContent = '编辑习惯';
      habitNameEl.value = habit.name;
      state.form.emoji = habit.emoji;
      state.form.color = habit.color;
      customEmojiInput.value = '';
      customColorInput.value = habit.color;
    } else {
      state.editingId = null;
      modalTitle.textContent = '添加习惯';
      habitNameEl.value = '';
      state.form.emoji = EMOJIS[0];
      state.form.color = COLORS[0];
      customEmojiInput.value = '';
      customColorInput.value = COLORS[0];
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
        customEmojiInput.value = '';
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
        customColorInput.value = c;
        renderColorRow();
      });
      colorRow.appendChild(btn);
    });
  }

  // 监听自定义 Emoji 输入
  customEmojiInput.addEventListener('input', function() {
    var val = this.value.trim();
    if (val) {
      state.form.emoji = val;
      // 取消预设的高亮
      document.querySelectorAll('.emoji-btn').forEach(function(b) { b.classList.remove('active'); });
    }
  });

  // 监听自定义颜色输入
  customColorInput.addEventListener('input', function() {
    state.form.color = this.value;
    document.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('active'); });
  });

  function saveHabit() {
    var name = habitNameEl.value.trim();
    if (!name) return showToast('请填写习惯名称', true);
    
    // 如果在自定义输入框里填了 Emoji，优先使用
    if (customEmojiInput.value.trim()) {
      state.form.emoji = customEmojiInput.value.trim();
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
        id: genId(), name: name, emoji: state.form.emoji,
        color: state.form.color, checkins: [], createdAt: Date.now()
      });
    }

    save();
    closeHabitModal();
    render();
    showToast('保存成功');
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
    if (e.key === 'Enter') { e.preventDefault(); saveHabit(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !habitModal.hidden) closeHabitModal();
  });

  // 列表交互代理
  habitList.addEventListener('click', function (e) {
    var cell = e.target.closest('[data-date]');
    if (cell) {
      toggleCheckin(cell.dataset.habit, cell.dataset.date);
      return;
    }

    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.dataset.act;
    var id = btn.dataset.id;

    if (act === 'del') {
      var h = state.habits.find(function (x) { return x.id === id; });
      confirmAction('删除确认', '删除习惯「' + h.name + '」？所有打卡记录都会丢失。', function() {
        state.habits = state.habits.filter(function (x) { return x.id !== id; });
        save(); render(); showToast('已删除');
      });
    } else if (act === 'edit') {
      var h = state.habits.find(function (x) { return x.id === id; });
      if (h) openHabitModal(h);
    } else if (act === 'toggle-today') {
      toggleCheckin(id, todayStr());
    } else if (act === 'toggle-yesterday') {
      toggleCheckin(id, yesterdayStr());
    }
  });

  // 悬浮 Tooltip
  habitList.addEventListener('mouseover', function(e) {
    var cell = e.target.closest('.heatmap-cell');
    if (cell) {
      var ds = cell.dataset.date;
      var checked = cell.dataset.checked === '1';
      tooltipEl.textContent = ds + (checked ? ' ✓ 已打卡' : ' · 未打卡');
      tooltipEl.style.display = 'block';
      
      var rect = cell.getBoundingClientRect();
      tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
      tooltipEl.style.top = rect.top + 'px';
    }
  });
  habitList.addEventListener('mouseout', function(e) {
    if (e.target.closest('.heatmap-cell')) {
      tooltipEl.style.display = 'none';
    }
  });

  /* ============ 导入导出 ============ */
  function downloadBlob(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  exportJsonBtn.addEventListener('click', function() {
    if (state.habits.length === 0) return showToast('没有数据可导出', true);
    var data = { version: 2, exportedAt: new Date().toISOString(), habits: state.habits };
    downloadBlob(JSON.stringify(data, null, 2), 'habits_' + todayStr() + '.json', 'application/json');
    showToast('JSON 备份已下载');
  });

  exportMdBtn.addEventListener('click', function() {
    if (state.habits.length === 0) return showToast('没有数据可导出', true);
    var md = '# 习惯打卡记录 (' + todayStr() + ')\n\n';
    md += '| 习惯名称 | 当前连续 | 最长连续 | 累计打卡 |\n';
    md += '| --- | --- | --- | --- |\n';
    state.habits.forEach(function(h) {
      md += '| ' + h.emoji + ' ' + h.name + ' | ' + calcStreak(h) + ' 天 | ' + calcLongestStreak(h) + ' 天 | ' + (h.checkins||[]).length + ' 次 |\n';
    });
    downloadBlob(md, 'habits_' + todayStr() + '.md', 'text/markdown;charset=utf-8');
    showToast('Markdown 文件已下载');
  });

  importBtn.addEventListener('click', function () { importFile.click(); });

  importFile.addEventListener('change', function () {
    var f = importFile.files && importFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.habits)) return showToast('文件格式不正确', true);

        var imported = data.habits.filter(function (h) { return h && h.name; }).map(function (h) {
          return {
            id: genId(), name: String(h.name), emoji: String(h.emoji || '🌱'),
            color: String(h.color || '#8a5a2b'),
            checkins: Array.isArray(h.checkins) ? h.checkins.filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); }) : [],
            createdAt: Number(h.createdAt) || Date.now()
          };
        });

        if (imported.length === 0) return showToast('未找到有效习惯', true);

        if (state.habits.length > 0) {
          confirmAction('导入确认', '当前已有 ' + state.habits.length + ' 个习惯。点击确定将追加导入 ' + imported.length + ' 个。', function() {
            state.habits = state.habits.concat(imported);
            save(); render(); showToast('成功追加 ' + imported.length + ' 个习惯');
          });
        } else {
          state.habits = imported;
          save(); render(); showToast('成功导入 ' + imported.length + ' 个习惯');
        }
      } catch (err) {
        showToast('读取失败：文件格式错误', true);
      } finally {
        importFile.value = '';
      }
    };
    reader.readAsText(f);
  });

  /* ============ 初始化 ============ */
  load();
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