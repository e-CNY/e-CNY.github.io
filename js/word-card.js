(function () {
  'use strict';

  /* ================= 词库定义 ================= */
  var EN_DECKS = [
    { id: 'junior', name: '初中', color: '#e0b04a' },
    { id: 'senior', name: '高中', color: '#d9794a' },
    { id: 'cet4',   name: '四级', color: '#7fae6a' },
    { id: 'cet6',   name: '六级', color: '#4f95c2' },
    { id: 'kaoyan', name: '考研', color: '#8e63c0' },
    { id: 'toefl',  name: '托福', color: '#c95572' },
    { id: 'sat',    name: 'SAT', color: '#5b8797' }
  ];
  var JA_DECKS = [
    { id: 'n5', name: 'N5', color: '#e0b04a' },
    { id: 'n4', name: 'N4', color: '#7fae6a' },
    { id: 'n3', name: 'N3', color: '#4f95c2' },
    { id: 'n2', name: 'N2', color: '#8e63c0' },
    { id: 'n1', name: 'N1', color: '#c95572' }
  ];
  var KO_DECKS = [
    { id: 'topik1', name: '1级', color: '#9cb3c9' },
    { id: 'topik2', name: '2级', color: '#7fa99b' },
    { id: 'topik3', name: '3级', color: '#6a9078' },
    { id: 'topik4', name: '4级', color: '#d99f59' },
    { id: 'topik5', name: '5级', color: '#c77b5a' },
    { id: 'topik6', name: '6级', color: '#b55d5d' }
  ];

  var ALL_DECKS = EN_DECKS.concat(JA_DECKS, KO_DECKS);
  var DECK_MAP = {};
  ALL_DECKS.forEach(function (d) { DECK_MAP[d.id] = d; });

  var EN_DECK_IDS = EN_DECKS.map(function (d) { return d.id; });
  var JA_DECK_IDS = JA_DECKS.map(function (d) { return d.id; });
  var KO_DECK_IDS = KO_DECKS.map(function (d) { return d.id; });

  var FILE_HINTS = [
    { re: /初中|junior|chuzhong/i, id: 'junior' },
    { re: /高中|senior|gaozhong/i, id: 'senior' },
    { re: /四级|cet[\s_\-]?4|band\s*4/i, id: 'cet4' },
    { re: /六级|cet[\s_\-]?6|band\s*6/i, id: 'cet6' },
    { re: /考研|kaoyan/i, id: 'kaoyan' },
    { re: /托福|toefl/i, id: 'toefl' },
    { re: /(^|\W)sat(\W|$)|sat[\s_\-]/i, id: 'sat' }
  ];

  var LS_KEY = 'wordcard.state.v8';
  var SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

  /* ================= 成就定义 ================= */
  var ACHIEVEMENTS = [
    { id: 'first',    icon: '🌱', name: '初出茅庐', desc: '学习第一个单词',
      check: function (s) { return totalStudied() >= 1; } },
    { id: 'day10',    icon: '📖', name: '小试牛刀', desc: '单日学习 10 个单词',
      check: function (s) { return (s.dailyStats.studied || 0) >= 10; } },
    { id: 'day50',    icon: '⚡', name: '一日千里', desc: '单日学习 50 个单词',
      check: function (s) { return (s.dailyStats.studied || 0) >= 50; } },
    { id: 'streak3',  icon: '🔥', name: '三天打鱼', desc: '连续学习 3 天',
      check: function (s) { return (s.dailyStats.streak || 0) >= 3; } },
    { id: 'streak7',  icon: '🔥', name: '一周不辍', desc: '连续学习 7 天',
      check: function (s) { return (s.dailyStats.streak || 0) >= 7; } },
    { id: 'streak30', icon: '💎', name: '习惯养成', desc: '连续学习 30 天',
      check: function (s) { return (s.dailyStats.streak || 0) >= 30; } },
    { id: 'master100',icon: '🏅', name: '初入佳境', desc: '掌握 100 个单词',
      check: function (s) { return countByLang(s.mastered) >= 100; } },
    { id: 'master500',icon: '🏆', name: '学富五车', desc: '掌握 500 个单词',
      check: function (s) { return countByLang(s.mastered) >= 500; } },
    { id: 'fav10',    icon: '⭐', name: '精准收藏', desc: '收藏 10 个单词',
      check: function (s) { return countByLang(s.fav) >= 10; } }
  ];

  /* ================= 状态 ================= */
  var state = {
    lang: 'en', loaded: {}, activeDecks: {},
    fav: {}, mastered: {}, unmastered: {},
    srs: {},
    shuffle: true, favOnly: false, unmasteredOnly: false, reviewOnly: false,
    mode: 'learn', hideDef: false,
    soundOn: true, volume: 0.5,
    jaLoaded: false, koLoaded: false,
    theme: 'light',
    dailyGoal: 20,
    dailyStats: {
      date: '', studied: 0, minutes: 0, streak: 0,
      words: {}
    },
    studyHistory: {},
    achievements: {},
    sessionStartMs: 0,
    lastActiveMs: 0
  };

  var allViewWords = []; var idx = 0; var bgStyle = 0;
  var currentOptions = []; var selectedOption = null; var tempReveal = false;
  var el = {};

  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    el.langSwitch = $('lang-switch'); el.decks = $('decks');
    el.btnLoad = $('btn-load'); el.fileInput = $('file-input');
    el.btnOrder = $('btn-order'); el.btnHideDef = $('btn-hide-def');
    el.btnFavOnly = $('btn-favonly'); el.btnUnmasteredOnly = $('btn-unmastered');
    el.btnReview = $('btn-review');
    el.btnReset = $('btn-reset'); el.btnExport = $('btn-export');
    el.btnRandom = $('btn-random');
    el.btnTheme = $('btn-theme'); el.btnList = $('btn-list');
    el.btnAchv = $('btn-achv');
    el.modeLearnBtn = $('mode-learn'); el.modeTestBtn = $('mode-test'); el.modeSpellBtn = $('mode-spell');
    el.card = $('card');
    el.deckTag = $('deck-tag'); el.statusTag = $('status-tag');
    el.wordEl = $('word'); el.imgCanvas = $('word-img-canvas');
    el.learnDefEl = $('learn-def'); el.testOptionsEl = $('test-options');
    el.testFeedbackEl = $('test-feedback');
    el.spellWrap = $('spell-wrap'); el.spellInput = $('spell-input');
    el.spellHint = $('spell-hint'); el.spellFeedback = $('spell-feedback');
    el.spellSubmit = $('spell-submit'); el.spellReveal = $('spell-reveal');
    el.controls = $('controls');
    el.btnPrev = $('btn-prev'); el.btnNext = $('btn-next');
    el.btnMasteredMark = $('btn-mastered-mark'); el.btnUnmasteredMark = $('btn-unmastered-mark');
    el.btnFavMark = $('btn-fav-mark'); el.statIdx = $('stat-idx');
    el.statMastered = $('stat-mastered'); el.statUnmastered = $('stat-unmastered');
    el.statFav = $('stat-fav'); el.btnSound = $('btn-sound');
    el.volumeSlider = $('volume-slider'); el.btnShare = $('btn-share');
    el.emptyEl = $('empty'); el.modal = $('modal');
    el.canvasEl = $('card-canvas'); el.btnClose = $('btn-close');
    el.btnChangeBg = $('btn-change-bg'); el.btnDownload = $('btn-download');
    el.dailyGoalCount = $('daily-goal-count');
    el.dailyProgress = $('daily-progress');
    el.dailyStreak = $('daily-streak');
    el.dailyStudied = $('daily-studied');
    el.dailyDue = $('daily-due');
    el.btnSetGoal = $('btn-set-goal');
    el.btnOpenAchv = $('btn-open-achv');
    el.listModal = $('list-modal'); el.listClose = $('list-close');
    el.listSearch = $('list-search'); el.listFilter = $('list-filter');
    el.listGrid = $('list-grid'); el.listCount = $('list-count');
    el.achvModal = $('achv-modal'); el.achvClose = $('achv-close');
    el.achvSummary = $('achv-summary');
    el.heatmapCanvas = $('heatmap-canvas');
    el.achvGrid = $('achv-grid');
    el.toast = $('toast');
  }

  /* ================= 音效 ================= */
  var audioCtx = null;
  function playSound(isCorrect) {
    if (!state.soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      var now = audioCtx.currentTime, vol = state.volume;
      if (isCorrect) {
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, now); osc.frequency.setValueAtTime(1046.5, now + 0.1);
        gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(vol, now + 0.05); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      } else {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(250, now); osc.frequency.setValueAtTime(180, now + 0.15);
        gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(vol, now + 0.05); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
      }
    } catch (e) { /* ignore */ }
  }

  /* ================= Toast ================= */
  var toastTimer = null;
  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 1600);
  }

  /* ================= 日期工具 ================= */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ================= 状态存取 ================= */
  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        lang: state.lang,
        active: Object.keys(state.activeDecks).filter(function (k) { return state.activeDecks[k]; }),
        shuffle: state.shuffle, favOnly: state.favOnly, unmasteredOnly: state.unmasteredOnly,
        reviewOnly: state.reviewOnly,
        mode: state.mode, hideDef: state.hideDef,
        soundOn: state.soundOn, volume: state.volume,
        fav: state.fav, mastered: state.mastered, unmastered: state.unmastered,
        srs: state.srs,
        theme: state.theme,
        dailyGoal: state.dailyGoal,
        dailyStats: state.dailyStats,
        studyHistory: state.studyHistory,
        achievements: state.achievements
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.lang === 'en' || s.lang === 'ja' || s.lang === 'ko') state.lang = s.lang;
      if (Array.isArray(s.active)) {
        state.activeDecks = {};
        s.active.forEach(function (id) { state.activeDecks[id] = true; });
      }
      if (typeof s.shuffle === 'boolean') state.shuffle = s.shuffle;
      if (typeof s.favOnly === 'boolean') state.favOnly = s.favOnly;
      if (typeof s.unmasteredOnly === 'boolean') state.unmasteredOnly = s.unmasteredOnly;
      if (typeof s.reviewOnly === 'boolean') state.reviewOnly = s.reviewOnly;
      if (s.mode) state.mode = s.mode;
      if (typeof s.hideDef === 'boolean') state.hideDef = s.hideDef;
      if (typeof s.soundOn === 'boolean') state.soundOn = s.soundOn;
      if (typeof s.volume === 'number') state.volume = s.volume;
      if (s.fav) state.fav = s.fav;
      if (s.mastered) state.mastered = s.mastered;
      if (s.unmastered) state.unmastered = s.unmastered;
      if (s.srs) state.srs = s.srs;
      if (s.theme === 'dark' || s.theme === 'light') state.theme = s.theme;
      if (typeof s.dailyGoal === 'number') state.dailyGoal = s.dailyGoal;
      if (s.dailyStats) state.dailyStats = s.dailyStats;
      if (s.studyHistory) state.studyHistory = s.studyHistory;
      if (s.achievements) state.achievements = s.achievements;
    } catch (e) { /* ignore */ }
  }

  function wkey(word, lang) { return (lang || state.lang) + '|' + String(word).toLowerCase(); }
  function currentDecks() { return state.lang === 'ja' ? JA_DECKS : (state.lang === 'ko' ? KO_DECKS : EN_DECKS); }
  function currentDeckIds() { return state.lang === 'ja' ? JA_DECK_IDS : (state.lang === 'ko' ? KO_DECK_IDS : EN_DECK_IDS); }
  function activeDecksHas(id) { return !!state.activeDecks[id]; }
  function activeDecksAdd(id) { state.activeDecks[id] = true; }
  function activeDecksDelete(id) { delete state.activeDecks[id]; }
  function activeDecksSize() { return Object.keys(state.activeDecks).filter(function (k) { return state.activeDecks[k]; }).length; }
  function countByLang(bucket) {
    var prefix = state.lang + '|'; var n = 0;
    for (var k in bucket) { if (k.indexOf(prefix) === 0) n++; }
    return n;
  }
  function totalStudied() {
    var n = 0;
    for (var k in state.studyHistory) {
      n += (state.studyHistory[k].studied || 0);
    }
    return n;
  }

  /* ================= SRS ================= */
  function srsGet(word, lang) {
    var k = wkey(word, lang);
    return state.srs[k] || { level: 0, due: 0 };
  }
  function srsUpdate(word, lang, correct) {
    var k = wkey(word, lang);
    var cur = state.srs[k] || { level: 0, due: 0 };
    var level;
    if (correct) level = Math.min(5, cur.level + 1);
    else level = Math.max(0, cur.level - 1);
    var intervalDays = SRS_INTERVALS[level];
    var dueMs = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
    if (!correct) dueMs = Date.now() + 10 * 60 * 1000;
    state.srs[k] = { level: level, due: dueMs };
  }
  function srsDueCount() {
    var now = Date.now(), n = 0;
    var prefix = state.lang + '|';
    for (var k in state.srs) {
      if (k.indexOf(prefix) !== 0) continue;
      if (state.srs[k].due <= now && state.srs[k].level < 5) n++;
    }
    return n;
  }
  function isSrsDue(word, lang) {
    var cur = srsGet(word, lang);
    return cur.level < 5 && cur.due <= Date.now();
  }

  /* ================= 每日统计 ================= */
  function ensureDaily() {
    var today = todayStr();
    if (state.dailyStats.date !== today) {
      if (state.dailyStats.date === yesterdayStr()) {
        state.dailyStats.streak = (state.dailyStats.streak || 0) + 1;
      } else if (state.dailyStats.date) {
        state.dailyStats.streak = 1;
      } else {
        state.dailyStats.streak = 1;
      }
      state.dailyStats.date = today;
      state.dailyStats.studied = 0;
      state.dailyStats.minutes = 0;
      state.dailyStats.words = {};
    }
  }

  function recordStudy(word, lang) {
    ensureDaily();
    var k = wkey(word, lang);
    if (!state.dailyStats.words[k]) {
      state.dailyStats.words[k] = true;
      state.dailyStats.studied++;
      var today = todayStr();
      if (!state.studyHistory[today]) state.studyHistory[today] = { studied: 0, minutes: 0 };
      state.studyHistory[today].studied = state.dailyStats.studied;
      state.studyHistory[today].minutes = state.dailyStats.minutes || 0;
      // 保留最近 365 天
      var keys = Object.keys(state.studyHistory);
      if (keys.length > 365) {
        keys.sort();
        var drop = keys.length - 365;
        for (var i = 0; i < drop; i++) delete state.studyHistory[keys[i]];
      }
    }
    saveState();
    renderDaily();
    checkAchievements();
  }

  function renderDaily() {
    ensureDaily();
    var studied = state.dailyStats.studied || 0;
    var goal = state.dailyGoal || 20;
    if (el.dailyGoalCount) el.dailyGoalCount.textContent = studied + ' / ' + goal;
    if (el.dailyProgress) {
      var pct = Math.min(100, (studied / goal) * 100);
      el.dailyProgress.style.width = pct + '%';
    }
    if (el.dailyStreak) el.dailyStreak.textContent = state.dailyStats.streak || 0;
    if (el.dailyStudied) el.dailyStudied.textContent = state.dailyStats.minutes || 0;
    if (el.dailyDue) el.dailyDue.textContent = srsDueCount();
  }

  /* 每分钟累计学习时长 */
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    var now = Date.now();
    if (state.lastActiveMs && now - state.lastActiveMs < 5 * 60 * 1000) {
      ensureDaily();
      state.dailyStats.minutes = (state.dailyStats.minutes || 0) + 1;
      var today = todayStr();
      if (!state.studyHistory[today]) state.studyHistory[today] = { studied: 0, minutes: 0 };
      state.studyHistory[today].minutes = state.dailyStats.minutes;
      state.studyHistory[today].studied = state.dailyStats.studied || 0;
      saveState();
      renderDaily();
    }
  }, 60 * 1000);

  function markActive() {
    state.lastActiveMs = Date.now();
  }

  /* ================= 成就检查 ================= */
  function checkAchievements() {
    var changed = false;
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (state.achievements[a.id]) continue;
      var unlocked = false;
      try { unlocked = a.check(state); } catch (e) {}
      if (unlocked) {
        state.achievements[a.id] = Date.now();
        changed = true;
        showToast('🏆 解锁成就：' + a.name + ' ' + a.icon);
      }
    }
    if (changed) saveState();
  }

  function renderAchievements() {
    var container = el.achvSummary;
    if (container) {
      var totalDay = totalStudied();
      var totalMin = 0;
      for (var k in state.studyHistory) totalMin += (state.studyHistory[k].minutes || 0);
      var achvCount = 0;
      for (var aid in state.achievements) achvCount++;

      container.innerHTML =
        '<div class="wc-achv-tile primary">' +
          '<div class="wc-achv-tile-label">🏆 已解锁成就</div>' +
          '<div class="wc-achv-tile-value">' + achvCount + ' / ' + ACHIEVEMENTS.length + '</div>' +
        '</div>' +
        '<div class="wc-achv-tile">' +
          '<div class="wc-achv-tile-label">📚 累计学习</div>' +
          '<div class="wc-achv-tile-value">' + totalDay + '</div>' +
        '</div>' +
        '<div class="wc-achv-tile">' +
          '<div class="wc-achv-tile-label">⏱ 累计时长</div>' +
          '<div class="wc-achv-tile-value">' + totalMin + '分</div>' +
        '</div>' +
        '<div class="wc-achv-tile">' +
          '<div class="wc-achv-tile-label">🔥 连续天数</div>' +
          '<div class="wc-achv-tile-value">' + (state.dailyStats.streak || 0) + '天</div>' +
        '</div>' +
        '<div class="wc-achv-tile">' +
          '<div class="wc-achv-tile-label">✅ 掌握</div>' +
          '<div class="wc-achv-tile-value">' + countByLang(state.mastered) + '</div>' +
        '</div>';
    }

    if (el.achvGrid) {
      el.achvGrid.innerHTML = '';
      ACHIEVEMENTS.forEach(function (a) {
        var unlocked = !!state.achievements[a.id];
        var div = document.createElement('div');
        div.className = 'wc-achv-badge' + (unlocked ? ' unlocked' : '');
        div.innerHTML =
          '<div class="wc-achv-badge-icon">' + (unlocked ? a.icon : '🔒') + '</div>' +
          '<div class="wc-achv-badge-body">' +
            '<div class="wc-achv-badge-name">' + a.name + '</div>' +
            '<div class="wc-achv-badge-desc">' + a.desc + '</div>' +
          '</div>';
        el.achvGrid.appendChild(div);
      });
    }

    drawHeatmap();
  }

  /* ================= 热力图绘制 ================= */
  function drawHeatmap() {
    if (!el.heatmapCanvas) return;
    var canvas = el.heatmapCanvas;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    var isDark = state.theme === 'dark';
    var weeks = 20;
    var days = weeks * 7;
    var cellSize = 26;
    var gap = 4;
    var leftPad = 36;
    var topPad = 30;
    var chartW = weeks * (cellSize + gap) - gap;
    var chartH = 7 * (cellSize + gap) - gap;

    // 网格从 startX, startY 开始
    var startX = leftPad;
    var startY = topPad;

    // 计算最后一天：今天所在周六
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var endDate = new Date(today);
    var dayOfWeek = endDate.getDay(); // 0=Sun
    var offsetToSat = 6 - dayOfWeek; // 补到周六
    endDate.setDate(endDate.getDate() + offsetToSat);

    // 星期标签
    ctx.fillStyle = isDark ? '#a0947c' : '#a0947c';
    ctx.font = '11px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    for (var d = 0; d < 7; d++) {
      // 只显示 周一/三/五
      if (d === 0 || d === 2 || d === 4) {
        ctx.fillText(dayLabels[d], startX - 6, startY + d * (cellSize + gap) + cellSize / 2);
      }
    }

    // 月份标签：遍历每列，若该列第一个落在新的月份则标注
    var lastMonth = -1;
    for (var col = 0; col < weeks; col++) {
      var colDate = new Date(endDate);
      colDate.setDate(colDate.getDate() - (weeks - 1 - col) * 7);
      var m = colDate.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        ctx.fillStyle = isDark ? '#a0947c' : '#a0947c';
        ctx.font = '11px "LXGW WenKai", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText((m + 1) + '月', startX + col * (cellSize + gap), startY - 6);
      }
    }

    // 绘制格子
    for (var i = 0; i < days; i++) {
      var col2 = Math.floor(i / 7);
      var row = i % 7;
      var date = new Date(endDate);
      date.setDate(date.getDate() - (days - 1 - i));
      var dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      var rec = state.studyHistory[dateStr];
      var count = rec ? (rec.studied || 0) : 0;

      var isFuture = date.getTime() > today.getTime();
      var color;
      if (isFuture) {
        color = isDark ? '#1f1a12' : '#fafafa';
      } else if (count === 0) {
        color = isDark ? '#2a2418' : '#ebedf0';
      } else if (count < 6) {
        color = '#c8e6c9';
      } else if (count < 16) {
        color = '#81c784';
      } else if (count < 31) {
        color = '#4caf50';
      } else {
        color = '#2e7d32';
      }

      var x = startX + col2 * (cellSize + gap);
      var y = startY + row * (cellSize + gap);

      ctx.fillStyle = color;
      ctx.beginPath();
      // 用圆角矩形近似
      var r = 4;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + cellSize - r, y);
      ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + r);
      ctx.lineTo(x + cellSize, y + cellSize - r);
      ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
      ctx.lineTo(x + r, y + cellSize);
      ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // 今天描边
      if (dateStr === todayStr()) {
        ctx.strokeStyle = isDark ? '#d4a05f' : '#8a5a2b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 无数据时不画数字，有数据时若格子够大则画
      if (count > 0 && cellSize >= 18) {
        ctx.fillStyle = count >= 16 ? '#ffffff' : '#1f6a29';
        ctx.font = 'bold 10px "LXGW WenKai", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 99 ? '99+' : String(count), x + cellSize / 2, y + cellSize / 2);
      }
    }
  }

  /* ================= 视图渲染 ================= */
  function shuffleArr(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function buildView() {
    var map = {}, order = [], lang = state.lang, ids = currentDeckIds();
    for (var di = 0; di < ids.length; di++) {
      var id = ids[di];
      if (!activeDecksHas(id)) continue;
      var list = state.loaded[id];
      if (!list) continue;
      for (var wi = 0; wi < list.length; wi++) {
        var w = list[wi], k = w.word.toLowerCase();
        if (map[k]) continue;
        map[k] = { word: w.word, def: w.def, deck: id, lang: lang };
        order.push(map[k]);
      }
    }
    var arr = order;
    if (state.favOnly) arr = arr.filter(function (w) { return state.fav[wkey(w.word, w.lang)]; });
    if (state.unmasteredOnly) arr = arr.filter(function (w) { return !state.mastered[wkey(w.word, w.lang)]; });
    if (state.reviewOnly) arr = arr.filter(function (w) { return isSrsDue(w.word, w.lang); });
    if (state.shuffle) shuffleArr(arr);
    else arr.sort(function (a, b) { return a.word.toLowerCase().localeCompare(b.word.toLowerCase()); });

    allViewWords = arr; idx = 0; tempReveal = false;
    prepareOptions(); render();
    renderDaily();
  }

  function prepareOptions() {
    if (state.mode !== 'test' || allViewWords.length === 0) {
      currentOptions = []; selectedOption = null; return;
    }
    var current = allViewWords[idx], correctDef = current.def;
    var pool = allViewWords.filter(function (w) { return w.word !== current.word && w.def !== correctDef; });
    var wrongDefs = [], seen = {};
    var shuffled = shuffleArr(pool.slice());
    for (var i = 0; i < shuffled.length && wrongDefs.length < 3; i++) {
      var d = shuffled[i].def;
      if (d !== correctDef && !seen[d]) { seen[d] = true; wrongDefs.push(d); }
    }
    currentOptions = [correctDef].concat(wrongDefs);
    shuffleArr(currentOptions); selectedOption = null;
  }

  function selectOption(opt) {
    if (selectedOption) return;
    selectedOption = opt;
    var w = allViewWords[idx], isCorrect = (opt === w.def);
    playSound(isCorrect);
    if (isCorrect) {
      markStudyProgress(w, true);
    } else {
      markStudyProgress(w, false);
      var k = wkey(w.word, w.lang);
      state.unmastered[k] = true; delete state.mastered[k];
    }
    saveState();
    render();
    renderDaily();
  }

  function renderDecks() {
    el.decks.innerHTML = '';
    currentDecks().forEach(function (d) {
      var loaded = Array.isArray(state.loaded[d.id]);
      var on = activeDecksHas(d.id);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wc-deck' + (loaded ? ' is-loaded' : ' is-missing') + (on && loaded ? ' is-on' : '');
      btn.style.setProperty('--c', d.color);
      var count = loaded ? state.loaded[d.id].length : 0;
      btn.innerHTML = d.name + (loaded ? ' <small>' + count + '</small>' : '');
      if (loaded) {
        btn.addEventListener('click', function () {
          if (activeDecksHas(d.id)) activeDecksDelete(d.id); else activeDecksAdd(d.id);
          if (activeDecksSize() === 0) activeDecksAdd(d.id);
          buildView(); renderDecks(); saveState();
        });
      }
      el.decks.appendChild(btn);
    });
  }

  function drawWordImage(word) {
    var ctx = el.imgCanvas.getContext('2d');
    var W = el.imgCanvas.width, H = el.imgCanvas.height;
    ctx.clearRect(0, 0, W, H);
    var lower = String(word).toLowerCase();
    var hash = 0;
    for (var i = 0; i < lower.length; i++) hash = lower.charCodeAt(i) + ((hash << 5) - hash);
    hash = Math.abs(hash);
    var h1 = hash % 360, h2 = (h1 + 45) % 360, cx = W / 2, cy = H / 2, radius = 70;
    var grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, 'hsl(' + h1 + ', 70%, 80%)'); grd.addColorStop(1, 'hsl(' + h2 + ', 70%, 60%)');
    ctx.fillStyle = grd; ctx.beginPath();
    if (hash % 2 === 0) ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    else {
      var r = 20, w2 = radius * 1.6, h = radius * 1.6, x = cx - w2 / 2, y = cy - h / 2;
      ctx.moveTo(x + r, y); ctx.lineTo(x + w2 - r, y); ctx.quadraticCurveTo(x + w2, y, x + w2, y + r);
      ctx.lineTo(x + w2, y + h - r); ctx.quadraticCurveTo(x + w2, y + h, x + w2 - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    ctx.fill();
    var letter = String(word).charAt(0).toUpperCase();
    ctx.font = 'bold 80px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    ctx.fillText(letter, cx, cy + 4); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  function render() {
    var has = allViewWords.length > 0;
    el.emptyEl.hidden = has;
    el.card.style.display = has ? '' : 'none';
    el.controls.style.display = has ? '' : 'none';

    el.btnOrder.classList.toggle('is-active', state.shuffle);
    el.btnFavOnly.classList.toggle('is-active', state.favOnly);
    el.btnUnmasteredOnly.classList.toggle('is-active', state.unmasteredOnly);
    el.btnReview.classList.toggle('is-active', state.reviewOnly);
    el.btnHideDef.classList.toggle('is-active', state.hideDef);
    el.btnHideDef.disabled = (state.mode !== 'learn');

    el.modeLearnBtn.classList.toggle('active', state.mode === 'learn');
    el.modeTestBtn.classList.toggle('active', state.mode === 'test');
    el.modeSpellBtn.classList.toggle('active', state.mode === 'spell');

    el.btnSound.textContent = state.soundOn ? '🔊' : '🔇';
    el.volumeSlider.value = state.volume;

    var langBtns = el.langSwitch.querySelectorAll('button');
    for (var li = 0; li < langBtns.length; li++) langBtns[li].classList.toggle('active', langBtns[li].dataset.lang === state.lang);

    el.statMastered.textContent = countByLang(state.mastered);
    el.statUnmastered.textContent = countByLang(state.unmastered);
    el.statFav.textContent = countByLang(state.fav);

    if (!has) { el.statIdx.textContent = '0 / 0'; return; }

    var w = allViewWords[idx], k = wkey(w.word, w.lang);
    el.wordEl.textContent = w.word;
    var deckInfo = DECK_MAP[w.deck];
    el.deckTag.textContent = deckInfo ? deckInfo.name : w.deck;
    if (deckInfo) el.deckTag.style.background = deckInfo.color;

    var isFav = !!state.fav[k];
    el.btnFavMark.textContent = isFav ? '⭐ 收藏' : '☆ 收藏';
    el.btnFavMark.classList.toggle('is-fav', isFav);

    if (state.mastered[k]) {
      el.statusTag.hidden = false; el.statusTag.textContent = '✅ 已掌握'; el.statusTag.className = 'wc-status-tag is-mastered';
    } else if (state.unmastered[k]) {
      el.statusTag.hidden = false; el.statusTag.textContent = '❌ 未掌握'; el.statusTag.className = 'wc-status-tag is-unmastered';
    } else {
      el.statusTag.hidden = true;
    }

    drawWordImage(w.word);

    if (state.mode === 'learn') {
      el.learnDefEl.hidden = false;
      el.testOptionsEl.hidden = true;
      el.testFeedbackEl.hidden = true;
      el.spellWrap.hidden = true;
      if (state.hideDef && !tempReveal) {
        el.learnDefEl.textContent = '👁 点击查看释义';
        el.learnDefEl.classList.add('is-hidden-def');
      } else {
        el.learnDefEl.textContent = w.def;
        el.learnDefEl.classList.remove('is-hidden-def');
      }
    } else if (state.mode === 'test') {
      el.learnDefEl.hidden = true;
      el.testOptionsEl.hidden = false;
      el.testFeedbackEl.hidden = false;
      el.spellWrap.hidden = true;
      el.testOptionsEl.innerHTML = '';
      currentOptions.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'wc-test-option';
        btn.textContent = opt;
        if (selectedOption) {
          btn.classList.add('disabled');
          if (opt === w.def) btn.classList.add('correct');
          else if (opt === selectedOption && opt !== w.def) btn.classList.add('wrong');
        } else {
          btn.addEventListener('click', function () { selectOption(opt); });
        }
        el.testOptionsEl.appendChild(btn);
      });
      if (selectedOption) {
        if (selectedOption === w.def) {
          el.testFeedbackEl.textContent = '🎉 回答正确！';
          el.testFeedbackEl.className = 'wc-test-feedback success';
        } else {
          el.testFeedbackEl.textContent = '😢 回答错误，已自动标记为"不会"。';
          el.testFeedbackEl.className = 'wc-test-feedback error';
        }
      } else {
        el.testFeedbackEl.textContent = '请点击选择正确的释义';
        el.testFeedbackEl.className = 'wc-test-feedback';
      }
    } else if (state.mode === 'spell') {
      el.learnDefEl.hidden = true;
      el.testOptionsEl.hidden = true;
      el.testFeedbackEl.hidden = true;
      el.spellWrap.hidden = false;
      el.spellHint.textContent = '请根据释义拼写单词：' + w.def;
      el.spellFeedback.textContent = '';
      el.spellFeedback.className = 'wc-spell-feedback';
      el.spellInput.value = '';
      el.spellInput.className = 'wc-spell-input';
      setTimeout(function () { if (state.mode === 'spell') el.spellInput.focus(); }, 60);
    }

    el.statIdx.textContent = (idx + 1) + ' / ' + allViewWords.length;
  }

  /* ================= 操作 ================= */
  function markStudyProgress(w, correct) {
    srsUpdate(w.word, w.lang, correct);
    recordStudy(w.word, w.lang);
    markActive();
  }

  function goNext() {
    if (!allViewWords.length) return;
    idx = (idx + 1) % allViewWords.length;
    tempReveal = false; prepareOptions(); render(); markActive();
  }
  function goPrev() {
    if (!allViewWords.length) return;
    idx = (idx - 1 + allViewWords.length) % allViewWords.length;
    tempReveal = false; prepareOptions(); render(); markActive();
  }
  function goRandom() {
    if (!allViewWords.length) return;
    var n = allViewWords.length;
    if (n <= 1) return;
    var next;
    do { next = Math.floor(Math.random() * n); } while (next === idx && n > 1);
    idx = next; tempReveal = false; prepareOptions(); render(); markActive();
    showToast('🎲 已随机跳转到第 ' + (idx + 1) + ' 个');
  }
  function markMastery(isMastered) {
    if (!allViewWords.length) return;
    var w = allViewWords[idx], k = wkey(w.word, w.lang);
    if (isMastered) { state.mastered[k] = true; delete state.unmastered[k]; }
    else { state.unmastered[k] = true; delete state.mastered[k]; }
    markStudyProgress(w, isMastered);
    saveState(); goNext();
  }
  function toggleFav() {
    if (!allViewWords.length) return;
    var w = allViewWords[idx], k = wkey(w.word, w.lang);
    if (state.fav[k]) {
      delete state.fav[k]; saveState();
      if (state.favOnly) { buildView(); renderDecks(); return; }
      render();
    } else {
      state.fav[k] = true; saveState(); render();
    }
  }

  function submitSpell() {
    if (!allViewWords.length || state.mode !== 'spell') return;
    var w = allViewWords[idx];
    var guess = (el.spellInput.value || '').trim().toLowerCase();
    if (!guess) return;
    var answer = w.word.toLowerCase();
    var isCorrect = guess === answer;

    if (isCorrect) {
      playSound(true);
      el.spellInput.classList.add('correct');
      el.spellFeedback.textContent = '🎉 拼写正确！';
      el.spellFeedback.className = 'wc-spell-feedback success';
      state.mastered[wkey(w.word, w.lang)] = true;
      delete state.unmastered[wkey(w.word, w.lang)];
      markStudyProgress(w, true);
    } else {
      playSound(false);
      el.spellInput.classList.add('wrong');
      el.spellFeedback.textContent = '😢 正确答案：' + w.word;
      el.spellFeedback.className = 'wc-spell-feedback error';
      state.unmastered[wkey(w.word, w.lang)] = true;
      delete state.mastered[wkey(w.word, w.lang)];
      markStudyProgress(w, false);
    }
    saveState();
    renderDaily();
    setTimeout(function () { if (state.mode === 'spell') goNext(); }, 1200);
  }

  function revealSpell() {
    if (!allViewWords.length || state.mode !== 'spell') return;
    var w = allViewWords[idx];
    el.spellInput.value = w.word;
    el.spellInput.classList.add('wrong');
    el.spellFeedback.textContent = '💡 正确答案已填入，下一个继续加油';
    el.spellFeedback.className = 'wc-spell-feedback';
  }

  function bindEvents() {
    el.btnPrev.addEventListener('click', goPrev);
    el.btnNext.addEventListener('click', goNext);
    el.btnMasteredMark.addEventListener('click', function () { markMastery(true); });
    el.btnUnmasteredMark.addEventListener('click', function () { markMastery(false); });
    el.btnFavMark.addEventListener('click', toggleFav);

    el.learnDefEl.addEventListener('click', function () {
      if (state.mode !== 'learn' || !state.hideDef || tempReveal || !allViewWords.length) return;
      tempReveal = true; render();
    });

    el.modeLearnBtn.addEventListener('click', function () {
      if (state.mode === 'learn') return;
      state.mode = 'learn'; tempReveal = false; saveState(); prepareOptions(); render();
    });
    el.modeTestBtn.addEventListener('click', function () {
      if (state.mode === 'test') return;
      state.mode = 'test'; tempReveal = false; saveState(); prepareOptions(); render();
    });
    el.modeSpellBtn.addEventListener('click', function () {
      if (state.mode === 'spell') return;
      state.mode = 'spell'; tempReveal = false; saveState(); render();
    });

    el.spellSubmit.addEventListener('click', submitSpell);
    el.spellReveal.addEventListener('click', revealSpell);
    el.spellInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submitSpell(); }
    });

    el.btnOrder.addEventListener('click', function () {
      state.shuffle = !state.shuffle; saveState(); buildView();
    });
    el.btnHideDef.addEventListener('click', function () {
      if (state.mode !== 'learn') return;
      state.hideDef = !state.hideDef; tempReveal = false; saveState(); render();
    });
    el.btnFavOnly.addEventListener('click', function () {
      state.favOnly = !state.favOnly; saveState(); buildView();
    });
    el.btnUnmasteredOnly.addEventListener('click', function () {
      state.unmasteredOnly = !state.unmasteredOnly; saveState(); buildView();
    });
    el.btnReview.addEventListener('click', function () {
      state.reviewOnly = !state.reviewOnly;
      if (state.reviewOnly) {
        state.favOnly = false; state.unmasteredOnly = false;
      }
      saveState(); buildView();
      if (state.reviewOnly) {
        showToast('📅 仅显示今日到期待复习：' + allViewWords.length + ' 个');
      }
    });

    el.btnReset.addEventListener('click', function () {
      if (!confirm('确定清空当前语言的全部掌握状态、收藏、SRS 进度和学习记录吗？')) return;
      var prefix = state.lang + '|';
      ['fav', 'mastered', 'unmastered', 'srs'].forEach(function (b) {
        for (var k in state[b]) { if (k.indexOf(prefix) === 0) delete state[b][k]; }
      });
      if (state.dailyStats) state.dailyStats.words = {};
      saveState(); buildView();
      showToast('♻️ 已重置');
    });

    el.btnRandom.addEventListener('click', goRandom);

    el.btnSound.addEventListener('click', function () {
      state.soundOn = !state.soundOn; saveState(); render();
    });
    el.volumeSlider.addEventListener('input', function (e) {
      state.volume = parseFloat(e.target.value); saveState();
    });

    el.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme();
      saveState();
      if (!el.achvModal.hidden) renderAchievements();
    });

    el.btnAchv.addEventListener('click', openAchvModal);
    el.btnOpenAchv.addEventListener('click', openAchvModal);
    el.achvClose.addEventListener('click', closeAchvModal);
    el.achvModal.addEventListener('click', function (e) {
      if (e.target === el.achvModal) closeAchvModal();
    });

    el.btnList.addEventListener('click', openListModal);
    el.listClose.addEventListener('click', closeListModal);
    el.listModal.addEventListener('click', function (e) {
      if (e.target === el.listModal) closeListModal();
    });
    el.listSearch.addEventListener('input', renderListModal);
    el.listFilter.addEventListener('change', renderListModal);
    el.listGrid.addEventListener('click', function (e) {
      var item = e.target.closest('.wc-list-item');
      if (!item) return;
      var wk = item.dataset.wk;
      for (var i = 0; i < allViewWords.length; i++) {
        if (wkey(allViewWords[i].word, allViewWords[i].lang) === wk) {
          idx = i; closeListModal(); tempReveal = false; prepareOptions(); render();
          return;
        }
      }
      var parts = wk.split('|');
      var targetWord = parts[1], targetLang = parts[0];
      if (targetLang !== state.lang) switchToLang(targetLang);
      for (var di = 0; di < currentDeckIds().length; di++) {
        var did = currentDeckIds()[di];
        if (state.loaded[did]) {
          for (var wi = 0; wi < state.loaded[did].length; wi++) {
            if (state.loaded[did][wi].word.toLowerCase() === targetWord) {
              activeDecksAdd(did);
            }
          }
        }
      }
      state.favOnly = false; state.unmasteredOnly = false; state.reviewOnly = false;
      saveState(); renderDecks(); buildView();
      for (var j = 0; j < allViewWords.length; j++) {
        if (wkey(allViewWords[j].word, allViewWords[j].lang) === wk) {
          idx = j; closeListModal(); tempReveal = false; prepareOptions(); render();
          return;
        }
      }
      closeListModal();
    });

    el.btnSetGoal.addEventListener('click', function () {
      var v = prompt('每日目标学习单词数（1-500）：', String(state.dailyGoal || 20));
      if (v === null) return;
      var n = parseInt(v, 10);
      if (isNaN(n) || n < 1 || n > 500) { showToast('请输入 1-500 之间的整数'); return; }
      state.dailyGoal = n;
      saveState(); renderDaily();
      showToast('🎯 目标已设为每日 ' + n + ' 个');
    });

    el.btnExport.addEventListener('click', exportFavorites);

    el.btnLoad.addEventListener('click', function () { el.fileInput.click(); });
    el.fileInput.addEventListener('change', handleFiles);

    el.langSwitch.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-lang]') : null;
      if (!btn || btn.disabled) return;
      switchToLang(btn.dataset.lang);
    });

    document.addEventListener('keydown', function (e) {
      if (el.modal && !el.modal.hidden) { if (e.key === 'Escape') closeModal(); return; }
      if (el.listModal && !el.listModal.hidden) { if (e.key === 'Escape') closeListModal(); return; }
      if (el.achvModal && !el.achvModal.hidden) { if (e.key === 'Escape') closeAchvModal(); return; }
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (!allViewWords.length) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === '1' || e.key === 'x') { e.preventDefault(); markMastery(false); }
      else if (e.key === '2' || e.key === 'c') { e.preventDefault(); markMastery(true); }
      else if (e.key === 'f') { e.preventDefault(); toggleFav(); }
      else if (e.key === 'r') { e.preventDefault(); goRandom(); }
      else if (e.key === 'h' && state.mode === 'learn') { e.preventDefault(); el.btnHideDef.click(); }
    });

    el.btnShare.addEventListener('click', openModal);
    el.btnClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', function (e) { if (e.target === el.modal) closeModal(); });
    el.btnChangeBg.addEventListener('click', function () { bgStyle = (bgStyle + 1) % BG_STYLES.length; drawShareCard(); });
    el.btnDownload.addEventListener('click', function () {
      if (!allViewWords.length) return;
      var word = allViewWords[idx].word.replace(/[^\w\-]+/g, '_');
      el.canvasEl.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = word + '_wordcard.png';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 800);
      }, 'image/png');
    });
  }

  /* ================= 主题 ================= */
  function applyTheme() {
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    el.btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  /* ================= 成就 & 热力图 Modal ================= */
  function openAchvModal() {
    el.achvModal.hidden = false;
    document.body.style.overflow = 'hidden';
    renderAchievements();
  }
  function closeAchvModal() {
    el.achvModal.hidden = true;
    document.body.style.overflow = '';
  }

  /* ================= 文件导入 ================= */
  function handleFiles(e) {
    var files = e.target.files;
    if (!files || !files.length) return;
    var remaining = files.length;
    var added = 0;

    for (var i = 0; i < files.length; i++) {
      (function (file) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var text = ev.target.result;
            var deckId = detectDeckId(file.name);
            if (!deckId) {
              showToast('⚠️ 无法识别词库类型：' + file.name);
            } else {
              var words = parseWordFile(text);
              if (words.length === 0) {
                showToast('⚠️ ' + file.name + ' 内容为空');
              } else {
                state.loaded[deckId] = words;
                activeDecksAdd(deckId);
                added++;
              }
            }
          } catch (ex) {
            showToast('❌ 解析 ' + file.name + ' 失败');
          }
          remaining--;
          if (remaining === 0) {
            if (added > 0) {
              saveState(); renderDecks(); buildView();
              showToast('📥 已导入 ' + added + ' 个文件');
            }
            e.target.value = '';
          }
        };
        reader.onerror = function () {
          remaining--;
          if (remaining === 0) e.target.value = '';
        };
        reader.readAsText(file);
      })(files[i]);
    }
  }

  function detectDeckId(name) {
    for (var i = 0; i < FILE_HINTS.length; i++) {
      if (FILE_HINTS[i].re.test(name)) return FILE_HINTS[i].id;
    }
    return null;
  }

  function parseWordFile(text) {
    var lines = String(text).split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var parts = line.split(/[\t,，]\s*/);
      if (parts.length >= 2) {
        var word = parts[0].trim();
        var def = parts.slice(1).join(' ').trim();
        if (def.indexOf('/') > -1 && parts.length >= 3) {
          def = parts[parts.length - 1].trim();
        }
        if (word) out.push({ word: word, def: def || '(无释义)' });
      } else {
        var m = line.match(/^([a-zA-Z\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF'\-\.\s]+?)\s+(.+)$/);
        if (m) out.push({ word: m[1].trim(), def: m[2].trim() });
      }
    }
    return out;
  }

  /* ================= 导出收藏 ================= */
  function exportFavorites() {
    var arr = [];
    var prefix = state.lang + '|';
    for (var k in state.fav) {
      if (k.indexOf(prefix) !== 0) continue;
      var word = k.split('|')[1];
      var def = '';
      var ids = currentDeckIds();
      for (var di = 0; di < ids.length; di++) {
        var list = state.loaded[ids[di]];
        if (!list) continue;
        for (var wi = 0; wi < list.length; wi++) {
          if (list[wi].word.toLowerCase() === word) { def = list[wi].def; break; }
        }
        if (def) break;
      }
      arr.push(word + '\t' + def);
    }
    if (arr.length === 0) { showToast('没有收藏的单词'); return; }
    var blob = new Blob(['\uFEFF' + arr.join('\n')], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'favorites-' + state.lang + '-' + todayStr() + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📤 已导出 ' + arr.length + ' 个收藏');
  }

  /* ================= 单词列表 ================= */
  function openListModal() {
    el.listModal.hidden = false;
    document.body.style.overflow = 'hidden';
    renderListModal();
  }
  function closeListModal() {
    el.listModal.hidden = true;
    document.body.style.overflow = '';
  }
  function renderListModal() {
    var q = (el.listSearch.value || '').trim().toLowerCase();
    var filter = el.listFilter.value || 'all';
    var map = {}, arr = [];
    var ids = currentDeckIds();
    for (var di = 0; di < ids.length; di++) {
      var id = ids[di];
      if (!activeDecksHas(id)) continue;
      var list = state.loaded[id];
      if (!list) continue;
      for (var wi = 0; wi < list.length; wi++) {
        var w = list[wi], lk = w.word.toLowerCase();
        if (map[lk]) continue;
        map[lk] = true;
        arr.push({ word: w.word, def: w.def, deck: id, lang: state.lang });
      }
    }

    if (q) {
      arr = arr.filter(function (w) {
        return w.word.toLowerCase().indexOf(q) >= 0 || (w.def || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    if (filter === 'fav') {
      arr = arr.filter(function (w) { return state.fav[wkey(w.word, w.lang)]; });
    } else if (filter === 'mastered') {
      arr = arr.filter(function (w) { return state.mastered[wkey(w.word, w.lang)]; });
    } else if (filter === 'unmastered') {
      arr = arr.filter(function (w) { return state.unmastered[wkey(w.word, w.lang)]; });
    } else if (filter === 'new') {
      arr = arr.filter(function (w) {
        var wk = wkey(w.word, w.lang);
        return !state.mastered[wk] && !state.unmastered[wk] && !state.srs[wk];
      });
    }

    if (el.listCount) el.listCount.textContent = '共 ' + arr.length + ' 个单词';

    el.listGrid.innerHTML = '';
    if (arr.length === 0) {
      el.listGrid.innerHTML = '<div class="wc-list-empty">没有匹配的单词</div>';
      return;
    }
    var max = 300;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < Math.min(arr.length, max); i++) {
      var w = arr[i];
      var wk = wkey(w.word, w.lang);
      var badges = '';
      if (state.fav[wk]) badges += '<span class="wc-list-badge fav">⭐</span>';
      if (state.mastered[wk]) badges += '<span class="wc-list-badge mastered">✅</span>';
      else if (state.unmastered[wk]) badges += '<span class="wc-list-badge unmastered">❌</span>';

      var item = document.createElement('div');
      item.className = 'wc-list-item';
      item.dataset.wk = wk;
      item.innerHTML =
        '<div class="wc-list-word">' + escHtml(w.word) + '</div>' +
        '<div class="wc-list-def">' + escHtml(w.def) + '</div>' +
        '<div class="wc-list-badges">' + badges + '</div>';
      frag.appendChild(item);
    }
    el.listGrid.appendChild(frag);
    if (arr.length > max) {
      var tip = document.createElement('div');
      tip.className = 'wc-list-empty';
      tip.textContent = '仅显示前 ' + max + ' 个（共 ' + arr.length + ' 个），请用搜索缩小范围';
      el.listGrid.appendChild(tip);
    }
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ================= 语言切换 ================= */
  function switchToLang(newLang) {
    if (state.lang === newLang) return;
    if (newLang === 'ja' && !state.jaLoaded) {
      loadJaDecks().then(function (ok) {
        if (ok) {
          state.lang = 'ja'; saveState();
          renderDecks(); buildView(); renderDaily();
        }
      });
      return;
    }
    if (newLang === 'ko' && !state.koLoaded) {
      loadKoDecks().then(function (ok) {
        if (ok) {
          state.lang = 'ko'; saveState();
          renderDecks(); buildView(); renderDaily();
        }
      });
      return;
    }
    state.lang = newLang;
    saveState(); renderDecks(); buildView(); renderDaily();
  }

  function loadJaDecks() {
    var btns = el.langSwitch.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    el.decks.innerHTML = '<div class="wc-loading">加载日文词库与英汉词典中…</div>';
    return loadJaBank().then(function (vocab) {
      if (!vocab) {
        alert('❌ 未找到 word-card-bank1.js');
        el.decks.innerHTML = '';
        for (var b = 0; b < btns.length; b++) btns[b].disabled = false;
        return false;
      }
      return loadEcdict().then(function (ecdict) {
        if (!ecdict) alert('⚠️ 警告：未加载到英汉词典 ecdict-cn.js！日文释义将保留英文原文。');
        var levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
        for (var li = 0; li < levels.length; li++) {
          var lv = levels[li], list = vocab[lv];
          if (!Array.isArray(list)) continue;
          var id = lv.toLowerCase(), words = [];
          for (var wi = 0; wi < list.length; wi++) {
            var item = list[wi], ens = Array.isArray(item.meanings) ? item.meanings : [item.meanings], zhs = [];
            for (var ei = 0; ei < ens.length; ei++) {
              var en = ens[ei]; if (!en) continue;
              var zh = translateEnToZh(en, ecdict) || en;
              if (zh && zhs.indexOf(zh) === -1) zhs.push(zh);
            }
            words.push({ word: item.word, def: zhs.join('；') || '(无释义)' });
          }
          state.loaded[id] = words;
        }
        state.jaLoaded = true;
        JA_DECKS.forEach(function (d) { if (state.loaded[d.id]) activeDecksAdd(d.id); });
        for (var b2 = 0; b2 < btns.length; b2++) btns[b2].disabled = false;
        return true;
      });
    }).catch(function (e) {
      console.error(e); alert('加载失败: ' + e.message);
      el.decks.innerHTML = '';
      for (var b3 = 0; b3 < btns.length; b3++) btns[b3].disabled = false;
      return false;
    });
  }

  function loadKoDecks() {
    var btns = el.langSwitch.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    el.decks.innerHTML = '<div class="wc-loading">加载韩文词库与英汉词典中…</div>';
    return loadKoBank().then(function (vocab) {
      if (!vocab) {
        alert('❌ 未找到 word-card-bank2.js');
        el.decks.innerHTML = '';
        for (var b = 0; b < btns.length; b++) btns[b].disabled = false;
        return false;
      }
      return loadEcdict().then(function (ecdict) {
        if (!ecdict) alert('⚠️ 警告：未加载到英汉词典 ecdict-cn.js！韩文释义将保留英文原文。');
        for (var lvl = 1; lvl <= 6; lvl++) {
          var id = 'topik' + lvl, list = vocab[id];
          if (!Array.isArray(list)) continue;
          var words = [];
          for (var wi = 0; wi < list.length; wi++) {
            var item = list[wi]; if (!item.word) continue;
            var enDef = item.def || '';
            var zh = translateEnToZh(enDef, ecdict) || enDef;
            words.push({ word: item.word, def: zh || '(无释义)' });
          }
          state.loaded[id] = words;
        }
        state.koLoaded = true;
        KO_DECKS.forEach(function (d) { if (state.loaded[d.id]) activeDecksAdd(d.id); });
        for (var b2 = 0; b2 < btns.length; b2++) btns[b2].disabled = false;
        return true;
      });
    }).catch(function (e) {
      console.error(e); alert('加载失败: ' + e.message);
      el.decks.innerHTML = '';
      for (var b3 = 0; b3 < btns.length; b3++) btns[b3].disabled = false;
      return false;
    });
  }

  /* ================= 词典加载 ================= */
  var ECDICT_SOURCES = ['../../js/ecdict-cn.js'];
  var ECDICT_GLOBALS = [
    'ECDICT_CN', 'ECDICT', 'ECDICT_DATA', 'DICT_CN', 'DICT_DATA',
    'ecdictCN', 'ecdict', 'dictCN', 'dictData', 'dictionary', 'DICT'
  ];
  function findDictInWindow() {
    for (var i = 0; i < ECDICT_GLOBALS.length; i++) {
      var v = window[ECDICT_GLOBALS[i]];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (v.__esModule && v.default && typeof v.default === 'object') v = v.default;
        if (v['good'] && typeof v['good'] === 'string' && /[\u4e00-\u9fa5]/.test(v['good'])) return v;
        var n = 0;
        for (var k in v) {
          if (Object.prototype.hasOwnProperty.call(v, k)) {
            n++;
            if (n > 100) return v;
          }
        }
      }
    }
    for (var key in window) {
      try {
        var obj = window[key];
        if (obj && typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
          if (obj['good'] && typeof obj['good'] === 'string' && /[\u4e00-\u9fa5]/.test(obj['good'])) {
            return obj;
          }
        }
      } catch (e) { /* ignore */ }
    }
    return null;
  }
  var ecdictPromise = null;
  function loadEcdict() {
    if (ecdictPromise) return ecdictPromise;
    ecdictPromise = new Promise(function (resolve) {
      var existing = findDictInWindow();
      if (existing) { resolve(existing); return; }
      var i = 0;
      function next() {
        if (i >= ECDICT_SOURCES.length) { resolve(null); return; }
        var src = ECDICT_SOURCES[i++];
        var s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = function () {
          var d = findDictInWindow();
          if (d) resolve(d); else next();
        };
        s.onerror = next;
        document.head.appendChild(s);
      }
      next();
    });
    return ecdictPromise;
  }

  var JA_BANK_SOURCES = ['../../js/word-card-bank1.js'];
  var KO_BANK_SOURCES = ['../../js/word-card-bank2.js'];
  function loadJaBank() {
    return new Promise(function (resolve) {
      if (typeof OPENJLPT_VOCAB !== 'undefined') return resolve(OPENJLPT_VOCAB);
      if (window.OPENJLPT_VOCAB) return resolve(window.OPENJLPT_VOCAB);
      var i = 0;
      function next() {
        if (i >= JA_BANK_SOURCES.length) return resolve(null);
        var s = document.createElement('script');
        s.src = JA_BANK_SOURCES[i++];
        s.onload = function () {
          try { if (typeof OPENJLPT_VOCAB !== 'undefined') return resolve(OPENJLPT_VOCAB); } catch (e) {}
          if (window.OPENJLPT_VOCAB) return resolve(window.OPENJLPT_VOCAB);
          next();
        };
        s.onerror = next;
        document.head.appendChild(s);
      }
      next();
    });
  }
  function loadKoBank() {
    return new Promise(function (resolve) {
      if (typeof TOPIK_VOCAB !== 'undefined') return resolve(TOPIK_VOCAB);
      if (window.TOPIK_VOCAB) return resolve(window.TOPIK_VOCAB);
      var i = 0;
      function next() {
        if (i >= KO_BANK_SOURCES.length) return resolve(null);
        var s = document.createElement('script');
        s.src = KO_BANK_SOURCES[i++];
        s.onload = function () {
          try { if (typeof TOPIK_VOCAB !== 'undefined') return resolve(TOPIK_VOCAB); } catch (e) {}
          if (window.TOPIK_VOCAB) return resolve(window.TOPIK_VOCAB);
          next();
        };
        s.onerror = next;
        document.head.appendChild(s);
      }
      next();
    });
  }

  /* ================= 英文翻译逻辑 ================= */
  var STOP_WORDS = {
    a: 1, an: 1, the: 1, to: 1, of: 1, 'in': 1, on: 1, at: 1, be: 1,
    is: 1, are: 1, was: 1, were: 1, 'do': 1, does: 1, did: 1, and: 1,
    or: 1, 'for': 1, 'with': 1, by: 1, from: 1, up: 1, about: 1,
    as: 1, so: 1, that: 1, this: 1, these: 1, those: 1
  };
  function extractFirstMeaning(def) {
    if (!def) return '';
    var firstLine = String(def).split(/\r?\n/)[0].trim();
    firstLine = firstLine.replace(/^[a-zA-Z]{1,10}\.\s*/, '');
    var first = firstLine.split(/[,，;；]/)[0].trim();
    return first || firstLine;
  }
  function guessBases(w) {
    var cands = [];
    if (/ies$/.test(w)) cands.push(w.slice(0, -3) + 'y');
    if (/ied$/.test(w)) cands.push(w.slice(0, -3) + 'y');
    if (/es$/.test(w)) cands.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) cands.push(w.slice(0, -1));
    if (/ed$/.test(w)) { cands.push(w.slice(0, -2)); cands.push(w.slice(0, -1)); }
    if (/ing$/.test(w)) { cands.push(w.slice(0, -3)); cands.push(w.slice(0, -3) + 'e'); }
    var out = [];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c.length > 1 && c !== w && out.indexOf(c) === -1) out.push(c);
    }
    return out;
  }
  function translateEnToZh(english, ecdict) {
    if (!ecdict || !english) return null;
    var text = String(english).trim();
    if (!text) return null;
    var lower = text.toLowerCase();
    var candidates = [text, lower];
    var stripped = text.replace(/^(to\s+|a\s+|an\s+|the\s+|be\s+|do\s+|does\s+|did\s+)/i, '').trim();
    if (stripped) candidates.push(stripped, stripped.toLowerCase());
    for (var i = 0; i < candidates.length; i++) {
      if (ecdict[candidates[i]]) {
        var zh = extractFirstMeaning(ecdict[candidates[i]]);
        if (zh) return zh;
      }
    }
    var words = lower.split(/\s+/).filter(function (w) { return w && !STOP_WORDS[w]; });
    var parts = [];
    for (var j = 0; j < words.length; j++) {
      var w = words[j], found = null;
      if (ecdict[w]) found = ecdict[w];
      else {
        var bases = guessBases(w);
        for (var k = 0; k < bases.length; k++) {
          if (ecdict[bases[k]]) { found = ecdict[bases[k]]; break; }
        }
      }
      if (found) {
        var zh2 = extractFirstMeaning(found);
        if (zh2 && parts.indexOf(zh2) === -1) parts.push(zh2);
      }
    }
    if (parts.length) return parts.join('；');
    return null;
  }

  /* ================= 生成卡片图 ================= */
  var BG_STYLES = [
    { name: '宣纸', from: '#fdf6e3', to: '#efe0c5', line: '#c9a86a', ink: '#3d3226', sub: '#7a6a52', accent: '#8a5a2b', mark: '“' },
    { name: '青竹', from: '#eaf4e2', to: '#d3e6c6', line: '#7ea86a', ink: '#2f4030', sub: '#5c7355', accent: '#3f7a45', mark: '「' },
    { name: '夜墨', from: '#232838', to: '#0e1118', line: '#4a5568', ink: '#f0e6d2', sub: '#a9b2c3', accent: '#e0b04a', mark: '『' },
    { name: '樱花', from: '#fdeef1', to: '#f7d8e0', line: '#d18ba1', ink: '#4a2b33', sub: '#8a5a67', accent: '#c15a7c', mark: '“' },
    { name: '墨玉', from: '#e4ecf1', to: '#c9d7e0', line: '#7c98a8', ink: '#26343c', sub: '#546872', accent: '#35657a', mark: '「' }
  ];
  function wrapText(ctx, text, maxWidth) {
    var tokens = String(text).match(/[\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]|[A-Za-z0-9'\-\.]+|\s+|[^\s]/g) || [];
    var lines = [], cur = '';
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i], test = cur + tk;
      if (ctx.measureText(test).width > maxWidth && cur.trim()) {
        lines.push(cur.replace(/\s+$/, '')); cur = tk.replace(/^\s+/, '');
      } else cur = test;
    }
    if (cur.trim()) lines.push(cur.replace(/\s+$/, ''));
    return lines;
  }
  function drawShareCard() {
    var w = allViewWords[idx]; if (!w) return;
    var ctx = el.canvasEl.getContext('2d'), W = el.canvasEl.width, H = el.canvasEl.height, s = BG_STYLES[bgStyle % BG_STYLES.length];
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    return fontsReady.then(function () {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, s.from); g.addColorStop(1, s.to);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      for (var i = 0; i < 1200; i++) {
        ctx.globalAlpha = Math.random() * 0.045; ctx.fillStyle = s.line;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
      ctx.restore();
      ctx.strokeStyle = s.line; ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
      ctx.strokeRect(52, 52, W - 104, H - 104);
      ctx.globalAlpha = 0.28; ctx.lineWidth = 1.5;
      ctx.strokeRect(74, 74, W - 148, H - 148); ctx.globalAlpha = 1;

      var deckInfo = DECK_MAP[w.deck], deckName = deckInfo ? deckInfo.name : w.deck;
      ctx.font = '500 34px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillStyle = s.sub; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('· ' + deckName + ' 词库 ·', 130, 168);

      ctx.font = '700 200px Georgia, "Times New Roman", serif';
      ctx.fillStyle = s.line; ctx.globalAlpha = 0.13;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(s.mark, 108, 420); ctx.globalAlpha = 1;

      var wordSize = 118, wordMaxW = W - 220;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      while (wordSize > 46) {
        ctx.font = '700 ' + wordSize + 'px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
        if (ctx.measureText(w.word).width <= wordMaxW) break;
        wordSize -= 4;
      }
      ctx.font = '700 ' + wordSize + 'px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillStyle = s.ink; ctx.fillText(w.word, W / 2, 550);

      var wordW = Math.min(ctx.measureText(w.word).width + 130, W - 220);
      ctx.strokeStyle = s.accent; ctx.globalAlpha = 0.75; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W / 2 - wordW / 2, 636); ctx.lineTo(W / 2 + wordW / 2, 636); ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = '500 44px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      var lines = wrapText(ctx, w.def, W - 260);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = s.ink;
      var lineH = 44 * 1.72, y2 = 690, maxLines = 8, shown = lines.slice(0, maxLines);
      for (var k = 0; k < shown.length; k++) {
        var t = shown[k];
        if (k === maxLines - 1 && lines.length > maxLines) t = t.replace(/.{0,2}$/, '…');
        ctx.fillText(t, 130, y2); y2 += lineH;
      }

      ctx.font = '400 28px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillStyle = s.sub; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = 0.85;
      ctx.fillText('TOOLS · 单词卡片闪记', W / 2, H - 108); ctx.globalAlpha = 1;
    });
  }
  function openModal() {
    if (!allViewWords.length) return;
    el.modal.hidden = false; document.body.style.overflow = 'hidden';
    drawShareCard();
  }
  function closeModal() {
    el.modal.hidden = true; document.body.style.overflow = '';
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheDom(); loadState();
    if (window.WORD_DECKS) {
      EN_DECK_IDS.forEach(function (id) {
        if (Array.isArray(window.WORD_DECKS[id])) state.loaded[id] = window.WORD_DECKS[id];
      });
    }
    if (activeDecksSize() === 0) {
      var ids = currentDeckIds();
      ids.forEach(function (id) { if (state.loaded[id]) activeDecksAdd(id); });
    }
    applyTheme();
    bindEvents();
    renderDecks();
    buildView();
    renderDaily();
    ensureDaily();
    checkAchievements();
    state.sessionStartMs = Date.now();
    state.lastActiveMs = Date.now();
    saveState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();