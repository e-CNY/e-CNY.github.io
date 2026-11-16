/* js/typing-test.js */
(function () {
  'use strict';

  /* ================= DOM ================= */
  var textDisplay = document.getElementById('tt-text-display');
  var inputEl     = document.getElementById('tt-input');
  var overlay     = document.getElementById('tt-overlay');
  var startBtn    = document.getElementById('tt-start-btn');
  var restartBtn  = document.getElementById('tt-restart');
  var langSelect  = document.getElementById('tt-lang');
  var sourceSelect= document.getElementById('tt-source');
  var diffSelect  = document.getElementById('tt-difficulty');
  var limitSelect = document.getElementById('tt-limit');
  var modeBtns    = document.querySelectorAll('.tt-mode-btn');

  var wpmEl   = document.getElementById('tt-wpm');
  var cpmEl   = document.getElementById('tt-cpm');
  var accEl   = document.getElementById('tt-acc');
  var timeEl  = document.getElementById('tt-time');
  var comboEl = document.getElementById('tt-combo');

  var countdownEl = document.getElementById('tt-countdown');
  var chartCanvas = document.getElementById('tt-chart');

  var keyboardEl  = document.getElementById('tt-keyboard');

  var resultPanel = document.getElementById('tt-result');
  var resWpm = document.getElementById('res-wpm');
  var resCpm = document.getElementById('res-cpm');
  var resAcc = document.getElementById('res-acc');
  var resCombo = document.getElementById('res-combo');
  var resBest = document.getElementById('res-best');
  var resNewRecord = document.getElementById('res-new-record');
  var againBtn = document.getElementById('tt-again-btn');

  var errorCharsWrap = document.getElementById('tt-error-chars');
  var errorCharsList = document.getElementById('tt-error-chars-list');

  var customWrap = document.getElementById('tt-custom-wrap');
  var customText = document.getElementById('tt-custom-text');
  var customApply = document.getElementById('tt-custom-apply');
  var customClear = document.getElementById('tt-custom-clear');

  var btnTheme = document.getElementById('btn-theme');
  var btnSound = document.getElementById('btn-sound');
  var btnCountdown = document.getElementById('btn-countdown');
  var btnKeyboard = document.getElementById('btn-keyboard');
  var btnHistory = document.getElementById('btn-history');

  var shareModal = document.getElementById('tt-share-modal');
  var shareClose = document.getElementById('tt-share-close');
  var shareCanvas = document.getElementById('tt-share-canvas');
  var shareStyleBtn = document.getElementById('tt-share-style');
  var shareDownload = document.getElementById('tt-share-download');
  var shareBtn = document.getElementById('tt-share-btn');
  var exportBtn = document.getElementById('tt-export-btn');
  var historyBtnRes = document.getElementById('tt-history-btn');

  var histBackdrop = document.getElementById('tt-history-backdrop');
  var histDrawer   = document.getElementById('tt-history-drawer');
  var histClose    = document.getElementById('tt-history-close');
  var histClear    = document.getElementById('tt-history-clear');
  var histList     = document.getElementById('tt-history-list');
  var histChart    = document.getElementById('tt-history-chart');

  var confettiCanvas = document.getElementById('tt-confetti');
  var toastEl = document.getElementById('tt-toast');

  /* ================= 状态 ================= */
  var state = {
    lang: 'en',
    mode: 'time',
    source: 'common',
    difficulty: 'normal',
    limit: 60,
    sound: false,
    countdown: true,
    keyboard: true,
    theme: 'light',
    customText: ''
  };

  var currentText = '';
  var timer = null;
  var timeLeft = 0;
  var elapsed = 0;
  var totalTyped = 0;
  var correctTyped = 0;
  var isStarted = false;
  var isComposing = false;

  var combo = 0;
  var maxCombo = 0;
  var errorChars = {}; // char -> count
  var wpmHistory = []; // 每秒 WPM 记录
  var lastWpmSampleTime = 0;
  var wpmSampleInterval = 1000;

  var audioCtx = null;
  var toastTimer = null;

  var HISTORY_KEY = 'typing_test_history_v1';
  var BEST_KEY_PREFIX = 'typing_best_';
  var SETTINGS_KEY = 'typing_test_settings_v1';

  /* ================= 词库 ================= */
  var WORDS = {
    easy: 'cat dog sun run top low big bag red bed tip tap key map job fit hot win yes ask old new use out day way she how now its own off put saw say sea set see two who why run let her his had him his let'.split(/\s+/),
    normal: 'the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through years much where your well down should because each just those people how too little good very world still own men long here between both life being under never same another while last might us old came right used three states himself few house during without again place around however home small found thought went part once general high upon school every did got united left number course war until always away something fact water though less public put almost hand enough far took head yet government system better set told nothing night end called eyes face'.split(/\s+/),
    hard: 'extraordinary entrepreneurship simultaneously acknowledgment pharmaceutical unprecedented bureaucracy conscientious magnificent phenomenon infrastructure philosophical contradiction aesthetic accommodation supposedly conscientious extraordinary entrepreneurship simultaneously acknowledgment pharmaceutical'.split(/\s+/)
  };

  var TEXTS_EN = {
    classic: [
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.",
      "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune, Or to take arms against a sea of troubles And by opposing end them.",
      "All happy families are alike; each unhappy family is unhappy in its own way. Everything was in confusion in the Oblonskys' house. The wife had discovered that the husband was carrying on an intrigue with a French girl.",
      "Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world."
    ],
    news: [
      "Global markets rallied today as investors welcomed the latest economic data, which showed a stronger than expected recovery in manufacturing output. Technology stocks led the gains, with major indexes climbing over two percent by the close of trading.",
      "Scientists have discovered a new species of deep sea fish in the Pacific Ocean, more than three thousand meters below the surface. The creature, which glows in the dark, uses bioluminescence to attract prey and communicate with others of its kind.",
      "The city council approved a new plan to expand public transportation, including two additional subway lines and a network of dedicated bicycle lanes. Construction is expected to begin next year and will take approximately four years to complete."
    ],
    code: [
      "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }",
      "const users = data.filter(u => u.age >= 18).map(u => ({ name: u.name, email: u.email }));",
      "async function fetchData(url) { const res = await fetch(url); if (!res.ok) throw new Error('Failed'); return res.json(); }",
      "class Circle { constructor(radius) { this.radius = radius; } get area() { return Math.PI * this.radius * this.radius; } }"
    ]
  };

  var TEXTS_ZH = {
    classic: [
      "我们总在最不懂爱情的年代，遇见最美好的爱情。那些年错过的大雨，那些年错过的爱情，好想拥抱你，拥抱错过的勇气。",
      "人生天地之间，若白驹过隙，忽然而已。与其在忙碌中匆匆度过，不如偶尔停下脚步，看看路边的风景，听听风的声音。",
      "在最深的绝望里，遇见最美丽的惊喜。生命如此短暂，我们没有时间去争吵、道歉、伤心、斤斤计较。我们只有时间去爱，一切稍纵即逝。"
    ],
    news: [
      "据最新统计数据显示，我国数字经济规模已突破五十万亿元，占国内生产总值的比重持续提升。数字技术与实体经济深度融合，为高质量发展注入了强劲动力。",
      "近日召开的国际会议围绕全球气候变化展开讨论，各方代表一致认为需要加强合作，共同应对环境挑战。多国承诺将在未来十年内大幅减少碳排放。",
      "科研团队成功研制出新型高效太阳能电池，光电转换效率刷新世界纪录。该项技术有望在未来几年内实现产业化，为清洁能源发展提供新的解决方案。"
    ],
    code: [
      "编程是一门艺术，它需要我们用严谨的逻辑去思考问题，用创新的思维去解决问题。优秀的代码不仅要能运行，还要易于阅读和维护。",
      "算法是程序的灵魂，数据结构是程序的骨架。掌握它们，就掌握了解题的关键。持续学习，持续实践，才能在这个快速变化的时代保持竞争力。"
    ]
  };

  var NUMBERS_SYMBOLS = '0123456789 01 10 100 1000 42 99 256 512 1024 2024 !@#$% ^&*() -_=+ [] {} <> /\\| ~` ,. ?!;:';

  /* ================= 初始化设置 ================= */
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.lang) state.lang = s.lang;
      if (s.source) state.source = s.source;
      if (s.difficulty) state.difficulty = s.difficulty;
      if (typeof s.sound === 'boolean') state.sound = s.sound;
      if (typeof s.countdown === 'boolean') state.countdown = s.countdown;
      if (typeof s.keyboard === 'boolean') state.keyboard = s.keyboard;
      if (s.theme) state.theme = s.theme;
      if (s.customText) state.customText = s.customText;
    } catch (e) { /* ignore */ }
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        lang: state.lang,
        source: state.source,
        difficulty: state.difficulty,
        sound: state.sound,
        countdown: state.countdown,
        keyboard: state.keyboard,
        theme: state.theme,
        customText: state.customText
      }));
    } catch (e) { /* ignore */ }
  }

  function applySettingsToUI() {
    langSelect.value = state.lang;
    sourceSelect.value = state.source;
    diffSelect.value = state.difficulty;
    btnSound.classList.toggle('active', state.sound);
    btnCountdown.classList.toggle('active', state.countdown);
    btnKeyboard.classList.toggle('active', state.keyboard);
    btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    keyboardEl.classList.toggle('hidden', !state.keyboard);
    customWrap.hidden = state.source !== 'custom';
    if (state.customText) customText.value = state.customText;
  }

  /* ================= 音效 ================= */
  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* ignore */ }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTick() {
    if (!state.sound) return;
    var ac = ensureAudio();
    if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1200;
      var t = ac.currentTime;
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) { /* ignore */ }
  }

  function playError() {
    if (!state.sound) return;
    var ac = ensureAudio();
    if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 220;
      var t = ac.currentTime;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch (e) { /* ignore */ }
  }

  function playComplete() {
    if (!state.sound) return;
    var ac = ensureAudio();
    if (!ac) return;
    try {
      var notes = [523, 659, 784, 1046];
      notes.forEach(function (f, i) {
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        var t = ac.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    } catch (e) { /* ignore */ }
  }

  /* ================= Toast ================= */
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  /* ================= 虚拟键盘 ================= */
  var KB_ROWS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m']
  ];

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    KB_ROWS.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'tt-kbd-row';
      row.forEach(function (k) {
        var key = document.createElement('div');
        key.className = 'tt-kbd-key';
        key.dataset.key = k;
        key.textContent = k;
        rowEl.appendChild(key);
      });
      keyboardEl.appendChild(rowEl);
    });
    var spaceRow = document.createElement('div');
    spaceRow.className = 'tt-kbd-row';
    var spaceKey = document.createElement('div');
    spaceKey.className = 'tt-kbd-key space';
    spaceKey.dataset.key = ' ';
    spaceKey.textContent = 'Space';
    spaceRow.appendChild(spaceKey);
    keyboardEl.appendChild(spaceRow);
  }

  function updateKeyboard() {
    if (!state.keyboard || !keyboardEl.querySelector('.tt-kbd-key')) return;
    var keys = keyboardEl.querySelectorAll('.tt-kbd-key');
    keys.forEach(function (k) { k.classList.remove('next', 'active'); });

    if (!isStarted || !currentText) return;
    var idx = inputEl.value.length;
    if (idx >= currentText.length) return;
    var nextChar = currentText[idx];
    if (!nextChar) return;
    var lower = nextChar.toLowerCase();
    if (lower === ' ') {
      var space = keyboardEl.querySelector('.tt-kbd-key[data-key=" "]');
      if (space) space.classList.add('next');
    } else if (/[a-z]/.test(lower)) {
      var kb = keyboardEl.querySelector('.tt-kbd-key[data-key="' + lower + '"]');
      if (kb) kb.classList.add('next');
    } else {
      // 中文或其他字符：不显示提示
    }
  }

  function flashKey(ch) {
    if (!state.keyboard) return;
    var lower = String(ch).toLowerCase();
    if (lower === ' ') {
      var space = keyboardEl.querySelector('.tt-kbd-key[data-key=" "]');
      if (space) {
        space.classList.add('active');
        setTimeout(function () { space.classList.remove('active'); }, 100);
      }
    } else if (/[a-z]/.test(lower)) {
      var kb = keyboardEl.querySelector('.tt-kbd-key[data-key="' + lower + '"]');
      if (kb) {
        kb.classList.add('active');
        setTimeout(function () { kb.classList.remove('active'); }, 100);
      }
    }
  }

  /* ================= 文本生成 ================= */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function generateText() {
    if (state.source === 'custom') {
      var t = (state.customText || '').trim();
      if (t.length >= 20) return t;
    }

    if (state.lang === 'zh') {
      if (state.source === 'numbers') {
        return NUMBERS_SYMBOLS;
      }
      var texts = state.source === 'news' ? TEXTS_ZH.news
                : state.source === 'code' ? TEXTS_ZH.code
                : TEXTS_ZH.classic;
      var base = pick(texts) || TEXTS_ZH.classic[0];
      if (state.mode === 'time') return base + base;
      return base.substring(0, Math.max(20, state.limit * 2));
    }

    // 英文
    if (state.source === 'numbers') {
      return NUMBERS_SYMBOLS + ' ' + NUMBERS_SYMBOLS;
    }
    if (state.source === 'classic' || state.source === 'news' || state.source === 'code') {
      var pool = TEXTS_EN[state.source];
      var s = pick(pool);
      if (state.mode === 'time') return s + ' ' + s;
      return s.substring(0, state.limit * 6);
    }
    // 常用词模式
    var words = WORDS[state.difficulty] || WORDS.normal;
    var targetCount = state.mode === 'time' ? 200 : Math.max(30, state.limit);
    var arr = [];
    for (var i = 0; i < targetCount; i++) arr.push(pick(words));
    return arr.join(' ');
  }

  /* ================= 渲染文本 ================= */
  function renderText(text) {
    textDisplay.innerHTML = '';
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'tt-char';
      span.textContent = text[i];
      textDisplay.appendChild(span);
    }
    updateCurrentChar(0);
  }

  function updateCurrentChar(index) {
    var chars = textDisplay.querySelectorAll('.tt-char');
    chars.forEach(function (c) { c.classList.remove('current'); });
    if (index < chars.length) {
      chars[index].classList.add('current');
    }
    updateKeyboard();
  }

  /* ================= 重置 ================= */
  function resetTest() {
    isStarted = false;
    clearInterval(timer);
    inputEl.value = '';
    inputEl.readOnly = false;
    totalTyped = 0;
    correctTyped = 0;
    combo = 0;
    maxCombo = 0;
    elapsed = 0;
    errorChars = {};
    wpmHistory = [];
    lastWpmSampleTime = 0;

    wpmEl.textContent = '0';
    cpmEl.textContent = '0';
    accEl.textContent = '100%';
    comboEl.textContent = '0';
    timeEl.textContent = state.limit;

    overlay.style.display = 'flex';
    resultPanel.style.display = 'none';
    countdownEl.hidden = true;
    errorCharsWrap.hidden = true;

    currentText = generateText();
    renderText(currentText);

    var chars = textDisplay.querySelectorAll('.tt-char');
    chars.forEach(function (c) {
      c.classList.remove('correct', 'incorrect', 'correct-space');
    });
    updateCurrentChar(0);
    drawWpmChart();
  }

  /* ================= 开始 ================= */
  function startTest() {
    if (isStarted) return;
    if (state.countdown) {
      startCountdown(function () { reallyStart(); });
    } else {
      reallyStart();
    }
  }

  function startCountdown(cb) {
    overlay.style.display = 'none';
    countdownEl.hidden = false;
    var n = 3;
    countdownEl.textContent = n;
    var iv = setInterval(function () {
      n--;
      if (n > 0) {
        countdownEl.textContent = n;
        countdownEl.style.animation = 'none';
        void countdownEl.offsetWidth;
        countdownEl.style.animation = '';
      } else if (n === 0) {
        countdownEl.textContent = 'GO!';
        countdownEl.style.animation = 'none';
        void countdownEl.offsetWidth;
        countdownEl.style.animation = '';
      } else {
        clearInterval(iv);
        countdownEl.hidden = true;
        cb();
      }
    }, 700);
  }

  function reallyStart() {
    isStarted = true;
    overlay.style.display = 'none';
    inputEl.focus();

    elapsed = 0;
    lastWpmSampleTime = 0;

    if (state.mode === 'time') {
      timeLeft = state.limit;
      timeEl.textContent = timeLeft;
      timer = setInterval(function () {
        timeLeft--;
        elapsed++;
        timeEl.textContent = Math.max(0, timeLeft);
        recordWpmSample();
        updateStats();
        if (timeLeft <= 0) finishTest();
      }, 1000);
    } else {
      timeEl.textContent = '0';
      timer = setInterval(function () {
        elapsed++;
        timeEl.textContent = elapsed;
        recordWpmSample();
        updateStats();
      }, 1000);
    }
  }

  /* ================= 结束 ================= */
  function finishTest() {
    isStarted = false;
    clearInterval(timer);
    inputEl.readOnly = true;

    var elapsedMin = Math.max(elapsed / 60, 1 / 60);
    var cpm = Math.round(correctTyped / elapsedMin);
    var wpm = state.lang === 'en' ? Math.round(cpm / 5) : cpm;
    var acc = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
    if (acc < 0) acc = 0;

    resWpm.textContent = wpm;
    resCpm.textContent = cpm;
    resAcc.textContent = acc + '%';
    resCombo.textContent = maxCombo;

    var bestKey = BEST_KEY_PREFIX + state.lang + '_' + state.mode;
    var best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    var isNewRecord = false;
    if (wpm > best) {
      best = wpm;
      localStorage.setItem(bestKey, best);
      isNewRecord = true;
    }
    resBest.textContent = best;
    resNewRecord.hidden = !isNewRecord;

    // 错误字符统计
    renderErrorChars();

    // 历史记录
    addHistoryRecord({
      ts: Date.now(),
      lang: state.lang,
      mode: state.mode,
      source: state.source,
      difficulty: state.difficulty,
      limit: state.limit,
      wpm: wpm,
      cpm: cpm,
      acc: acc,
      combo: maxCombo
    });

    resultPanel.style.display = 'block';
    playComplete();

    if (isNewRecord) {
      fireConfetti();
      setTimeout(function () {
        showToast('🏆 新纪录！WPM ' + wpm);
      }, 200);
    }

    setTimeout(function () {
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }

  /* ================= 实时统计 ================= */
  function updateStats() {
    if (!isStarted && elapsed === 0) return;
    var elapsedMin = elapsed / 60;
    if (elapsedMin > 0.005) {
      var cpm = Math.round(correctTyped / elapsedMin);
      var wpm = state.lang === 'en' ? Math.round(cpm / 5) : cpm;
      var acc = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
      if (acc < 0) acc = 0;
      wpmEl.textContent = wpm;
      cpmEl.textContent = cpm;
      accEl.textContent = acc + '%';
    }
    comboEl.textContent = combo;
  }

  /* ================= WPM 曲线 ================= */
  function recordWpmSample() {
    if (elapsed <= 0) return;
    var elapsedMin = elapsed / 60;
    var cpm = Math.round(correctTyped / elapsedMin);
    var wpm = state.lang === 'en' ? Math.round(cpm / 5) : cpm;
    wpmHistory.push(Math.max(0, wpm));
    drawWpmChart();
  }

  function drawWpmChart() {
    var ctx = chartCanvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = chartCanvas.clientWidth || 800;
    var H = chartCanvas.clientHeight || 70;
    chartCanvas.width = W * dpr;
    chartCanvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 背景网格
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--tt-border') || '#ddcfb3';
    ctx.lineWidth = 1;
    for (var i = 1; i < 4; i++) {
      var y = (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.globalAlpha = 0.3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (wpmHistory.length < 1) {
      // 空状态提示
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--tt-text-faint') || '#a0947c';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WPM 曲线（开始后实时绘制）', W / 2, H / 2);
      return;
    }

    var padLeft = 8, padRight = 8, padTop = 8, padBottom = 8;
    var chartW = W - padLeft - padRight;
    var chartH = H - padTop - padBottom;

    var maxWpm = 0;
    for (var j = 0; j < wpmHistory.length; j++) {
      if (wpmHistory[j] > maxWpm) maxWpm = wpmHistory[j];
    }
    maxWpm = Math.max(40, maxWpm * 1.15);

    function xPos(idx) {
      if (wpmHistory.length === 1) return padLeft + chartW / 2;
      return padLeft + (idx / (wpmHistory.length - 1)) * chartW;
    }
    function yPos(v) {
      return padTop + chartH - (v / maxWpm) * chartH;
    }

    // 填充区域
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(wpmHistory[0]));
    for (var k = 1; k < wpmHistory.length; k++) {
      ctx.lineTo(xPos(k), yPos(wpmHistory[k]));
    }
    ctx.lineTo(xPos(wpmHistory.length - 1), padTop + chartH);
    ctx.lineTo(xPos(0), padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(138, 90, 43, 0.15)';
    ctx.fill();

    // 折线
    ctx.beginPath();
    for (var m = 0; m < wpmHistory.length; m++) {
      var px = xPos(m), py = yPos(wpmHistory[m]);
      if (m === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--tt-accent') || '#8a5a2b';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 末点
    var lastIdx = wpmHistory.length - 1;
    ctx.beginPath();
    ctx.arc(xPos(lastIdx), yPos(wpmHistory[lastIdx]), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--tt-accent') || '#8a5a2b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ================= 错误字符 ================= */
  function renderErrorChars() {
    var entries = [];
    for (var k in errorChars) entries.push({ ch: k, n: errorChars[k] });
    if (entries.length === 0) {
      errorCharsWrap.hidden = true;
      return;
    }
    entries.sort(function (a, b) { return b.n - a.n; });
    var max = Math.min(entries.length, 12);
    errorCharsList.innerHTML = '';
    for (var i = 0; i < max; i++) {
      var e = entries[i];
      var elc = document.createElement('div');
      elc.className = 'tt-error-char';
      elc.innerHTML = escHtml(e.ch === ' ' ? '␣' : e.ch) + '<span>×' + e.n + '</span>';
      errorCharsList.appendChild(elc);
    }
    errorCharsWrap.hidden = false;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ================= 输入处理 ================= */
  inputEl.addEventListener('compositionstart', function () { isComposing = true; });
  inputEl.addEventListener('compositionend', function () {
    isComposing = false;
    handleInput();
  });
  inputEl.addEventListener('input', function () {
    if (!isComposing) handleInput();
  });

  function handleInput() {
    if (!isStarted) return;
    inputEl.value = inputEl.value.replace(/[\r\n]/g, '');
    var text = inputEl.value;
    var chars = textDisplay.querySelectorAll('.tt-char');

    totalTyped = text.length;
    correctTyped = 0;

    // 比较新旧前缀，找出新增的字符
    var prevLen = (handleInput._prevLen || 0);
    var newTyped = text.substring(prevLen);

    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.remove('correct', 'incorrect', 'correct-space');

      if (i < text.length) {
        if (text[i] === currentText[i]) {
          chars[i].classList.add('correct');
          correctTyped++;
        } else {
          chars[i].classList.add('incorrect');
        }
      }
    }

    if (text.length > currentText.length) {
      correctTyped -= (text.length - currentText.length);
    }
    if (correctTyped < 0) correctTyped = 0;

    // 连击与错误
    if (text.length > prevLen) {
      for (var j = 0; j < newTyped.length; j++) {
        var pos = prevLen + j;
        if (pos >= currentText.length) break;
        var typedChar = text[pos];
        var expectedChar = currentText[pos];
        if (typedChar === expectedChar) {
          combo++;
          if (combo > maxCombo) maxCombo = combo;
          playTick();
          flashKey(expectedChar);
        } else {
          combo = 0;
          var key = expectedChar === ' ' ? '␣' : expectedChar;
          errorChars[key] = (errorChars[key] || 0) + 1;
          playError();
        }
      }
    } else if (text.length < prevLen) {
      combo = 0;
    }
    handleInput._prevLen = text.length;

    updateCurrentChar(text.length);
    updateStats();

    if (state.mode === 'words' && text.length >= currentText.length) {
      finishTest();
    }
  }

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
    }
  });

  /* ================= 结果操作 ================= */
  startBtn.addEventListener('click', startTest);
  restartBtn.addEventListener('click', resetTest);
  againBtn.addEventListener('click', resetTest);

  /* ================= 参数变更 ================= */
  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      state.mode = this.dataset.mode;
      updateLimitOptions();
      resetTest();
    });
  });

  langSelect.addEventListener('change', function () {
    state.lang = this.value;
    saveSettings();
    resetTest();
  });
  sourceSelect.addEventListener('change', function () {
    state.source = this.value;
    customWrap.hidden = state.source !== 'custom';
    saveSettings();
    resetTest();
  });
  diffSelect.addEventListener('change', function () {
    state.difficulty = this.value;
    saveSettings();
    resetTest();
  });
  limitSelect.addEventListener('change', function () {
    state.limit = parseInt(this.value, 10);
    resetTest();
  });

  function updateLimitOptions() {
    limitSelect.innerHTML = '';
    if (state.mode === 'time') {
      limitSelect.innerHTML =
        '<option value="15">15秒</option>' +
        '<option value="30">30秒</option>' +
        '<option value="60" selected>60秒</option>' +
        '<option value="120">120秒</option>';
      state.limit = 60;
    } else {
      limitSelect.innerHTML =
        '<option value="10">10词</option>' +
        '<option value="25">25词</option>' +
        '<option value="50" selected>50词</option>' +
        '<option value="100">100词</option>';
      state.limit = 50;
    }
  }

  /* ================= 自定义文本 ================= */
  customApply.addEventListener('click', function () {
    var t = customText.value.trim();
    if (t.length < 20) {
      showToast('自定义文本至少 20 个字符');
      return;
    }
    state.customText = t;
    state.source = 'custom';
    sourceSelect.value = 'custom';
    saveSettings();
    resetTest();
    showToast('✅ 已应用自定义文本');
  });
  customClear.addEventListener('click', function () {
    customText.value = '';
    state.customText = '';
    saveSettings();
    showToast('🧹 已清除自定义文本');
  });

  /* ================= 顶栏按钮 ================= */
  btnTheme.addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    saveSettings();
    drawWpmChart();
  });

  btnSound.addEventListener('click', function () {
    state.sound = !state.sound;
    btnSound.classList.toggle('active', state.sound);
    btnSound.textContent = state.sound ? '🔊' : '🔇';
    saveSettings();
    if (state.sound) ensureAudio();
    showToast(state.sound ? '🔊 音效已开启' : '🔇 音效已关闭');
  });

  btnCountdown.addEventListener('click', function () {
    state.countdown = !state.countdown;
    btnCountdown.classList.toggle('active', state.countdown);
    saveSettings();
    showToast(state.countdown ? '⏱ 倒计时已开启' : '⏱ 倒计时已关闭');
  });

  btnKeyboard.addEventListener('click', function () {
    state.keyboard = !state.keyboard;
    btnKeyboard.classList.toggle('active', state.keyboard);
    keyboardEl.classList.toggle('hidden', !state.keyboard);
    saveSettings();
    updateKeyboard();
  });

  /* ================= 分享图片 ================= */
  var SHARE_STYLES = [
    { bg1: '#fdf6e3', bg2: '#f2e6cc', accent: '#8a5a2b', text: '#3d3226', sub: '#7a6a52' },
    { bg1: '#eaf4e2', bg2: '#d3e6c6', accent: '#3f7a45', text: '#2f4030', sub: '#5c7355' },
    { bg1: '#fdeef1', bg2: '#f7d8e0', accent: '#c15a7c', text: '#4a2b33', sub: '#8a5a67' },
    { bg1: '#232838', bg2: '#0e1118', accent: '#e0b04a', text: '#f0e6d2', sub: '#a9b2c3' }
  ];
  var shareStyleIdx = 0;
  var lastResult = null;

  function drawShareCard() {
    if (!lastResult) return;
    var ctx = shareCanvas.getContext('2d');
    var W = shareCanvas.width, H = shareCanvas.height;
    var s = SHARE_STYLES[shareStyleIdx % SHARE_STYLES.length];

    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, s.bg1);
    g.addColorStop(1, s.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 纹理点
    ctx.save();
    for (var i = 0; i < 800; i++) {
      ctx.globalAlpha = Math.random() * 0.05;
      ctx.fillStyle = s.accent;
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
    ctx.restore();

    // 边框
    ctx.strokeStyle = s.accent;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    ctx.strokeRect(52, 52, W - 104, H - 104);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(74, 74, W - 148, H - 148);
    ctx.globalAlpha = 1;

    // 标题
    ctx.font = '500 34px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
    ctx.fillStyle = s.sub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('· TYPING TEST ·', W / 2, 150);

    // 大数字 WPM
    ctx.font = '900 260px "JetBrains Mono", "LXGW WenKai", monospace';
    ctx.fillStyle = s.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lastResult.wpm), W / 2, 400);

    ctx.font = '500 46px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
    ctx.fillStyle = s.text;
    ctx.fillText('WPM', W / 2, 570);

    // 分隔线
    ctx.strokeStyle = s.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 240, 640);
    ctx.lineTo(W / 2 + 240, 640);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 三个小数据
    var cols = [
      { label: '字符/分', value: String(lastResult.cpm) },
      { label: '正确率', value: lastResult.acc + '%' },
      { label: '最长连击', value: String(lastResult.combo) }
    ];
    cols.forEach(function (c, idx) {
      var cx = W / 2 + (idx - 1) * 260;
      ctx.font = '600 52px "JetBrains Mono", "LXGW WenKai", monospace';
      ctx.fillStyle = s.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.value, cx, 740);

      ctx.font = '400 28px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillStyle = s.sub;
      ctx.fillText(c.label, cx, 790);
    });

    // 底部标签
    ctx.font = '400 26px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
    ctx.fillStyle = s.sub;
    ctx.globalAlpha = 0.8;
    var modeLabel = state.mode === 'time' ? state.limit + '秒' : state.limit + '词';
    var diffLabel = { easy: '初级', normal: '中级', hard: '高级' }[state.difficulty] || '';
    var langLabel = state.lang === 'en' ? 'English' : '中文';
    ctx.fillText(langLabel + ' · ' + modeLabel + ' · ' + diffLabel, W / 2, 900);
    ctx.fillText('TOOLS · 打字速度测试', W / 2, H - 130);
    ctx.globalAlpha = 1;
  }

  shareBtn.addEventListener('click', function () {
    if (!lastResult) { showToast('没有成绩可分享'); return; }
    shareModal.hidden = false;
    document.body.style.overflow = 'hidden';
    drawShareCard();
  });
  shareClose.addEventListener('click', function () {
    shareModal.hidden = true;
    document.body.style.overflow = '';
  });
  shareModal.addEventListener('click', function (e) {
    if (e.target === shareModal) {
      shareModal.hidden = true;
      document.body.style.overflow = '';
    }
  });
  shareStyleBtn.addEventListener('click', function () {
    shareStyleIdx = (shareStyleIdx + 1) % SHARE_STYLES.length;
    drawShareCard();
  });
  shareDownload.addEventListener('click', function () {
    if (!lastResult) return;
    shareCanvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'typing-' + lastResult.wpm + 'wpm.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 800);
      showToast('⬇️ 图片已下载');
    }, 'image/png');
  });

  /* ================= CSV 导出 ================= */
  exportBtn.addEventListener('click', function () {
    if (!lastResult) { showToast('没有成绩可导出'); return; }
    var lines = [];
    lines.push('字段,数值');
    lines.push('WPM,' + lastResult.wpm);
    lines.push('字符/分,' + lastResult.cpm);
    lines.push('正确率,' + lastResult.acc + '%');
    lines.push('最长连击,' + lastResult.combo);
    lines.push('语言,' + (state.lang === 'en' ? 'English' : '中文'));
    lines.push('模式,' + (state.mode === 'time' ? '限时' : '限字'));
    lines.push('限制,' + state.limit);
    lines.push('文本类型,' + state.source);
    lines.push('难度,' + state.difficulty);
    lines.push('时间,' + new Date().toISOString());
    var csv = lines.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var d = new Date();
    var ts = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'typing-' + ts + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📤 已导出 CSV');
  });

  /* ================= 历史记录 ================= */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function addHistoryRecord(rec) {
    try {
      var arr = loadHistory();
      arr.unshift(rec);
      if (arr.length > 30) arr.length = 30;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      lastResult = rec;
    } catch (e) { /* ignore */ }
  }

  function renderHistory() {
    var arr = loadHistory();
    if (arr.length === 0) {
      histList.innerHTML = '<p class="tt-history-empty">暂无记录</p>';
    } else {
      histList.innerHTML = arr.map(function (r) {
        var d = new Date(r.ts);
        var time = String(d.getMonth() + 1).padStart(2, '0') + '/' +
                   String(d.getDate()).padStart(2, '0') + ' ' +
                   String(d.getHours()).padStart(2, '0') + ':' +
                   String(d.getMinutes()).padStart(2, '0');
        var modeLabel = r.mode === 'time' ? r.limit + '秒' : r.limit + '词';
        var langLabel = r.lang === 'en' ? 'EN' : '中';
        return '<div class="tt-history-item">' +
          '<div class="tt-history-meta">' +
            '<span>' + langLabel + ' · ' + modeLabel + ' · ' + r.source + '</span>' +
            '<span>' + time + '</span>' +
          '</div>' +
          '<div class="tt-history-item-row">' +
            '<span class="tt-history-wpm">' + r.wpm + ' WPM</span>' +
            '<div class="tt-history-stats">' +
              '<span>' + r.cpm + ' CPM</span>' +
              '<span>' + r.acc + '%</span>' +
              '<span>🔥' + r.combo + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    drawHistoryChart(arr);
  }

  function drawHistoryChart(arr) {
    var ctx = histChart.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = histChart.clientWidth || 320;
    var H = histChart.clientHeight || 100;
    histChart.width = W * dpr;
    histChart.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (arr.length === 0) {
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--tt-text-faint') || '#a0947c';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('暂无数据', W / 2, H / 2);
      return;
    }

    // 取最近 15 条，反转时间顺序
    var recent = arr.slice(0, 15).reverse();
    var pad = 10;
    var chartW = W - pad * 2;
    var chartH = H - pad * 2;

    var maxVal = 0;
    recent.forEach(function (r) { if (r.wpm > maxVal) maxVal = r.wpm; });
    maxVal = Math.max(20, maxVal * 1.2);

    function xPos(i) {
      if (recent.length === 1) return W / 2;
      return pad + (i / (recent.length - 1)) * chartW;
    }
    function yPos(v) {
      return pad + chartH - (v / maxVal) * chartH;
    }

    // 面积
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(recent[0].wpm));
    for (var i = 1; i < recent.length; i++) {
      ctx.lineTo(xPos(i), yPos(recent[i].wpm));
    }
    ctx.lineTo(xPos(recent.length - 1), pad + chartH);
    ctx.lineTo(xPos(0), pad + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(127, 174, 106, 0.2)';
    ctx.fill();

    // 折线
    ctx.beginPath();
    for (var j = 0; j < recent.length; j++) {
      var px = xPos(j), py = yPos(recent[j].wpm);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#7fae6a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 数据点
    recent.forEach(function (r, k) {
      ctx.beginPath();
      ctx.arc(xPos(k), yPos(r.wpm), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7fae6a';
      ctx.fill();
    });

    // 最大值标注
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--tt-text-faint') || '#a0947c';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('max ' + Math.round(maxVal) + ' WPM', pad, 2);
  }

  function openHistory() {
    histBackdrop.hidden = false;
    histDrawer.classList.add('open');
    renderHistory();
  }
  function closeHistory() {
    histBackdrop.hidden = true;
    histDrawer.classList.remove('open');
  }
  btnHistory.addEventListener('click', openHistory);
  historyBtnRes.addEventListener('click', openHistory);
  histClose.addEventListener('click', closeHistory);
  histBackdrop.addEventListener('click', closeHistory);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && histDrawer.classList.contains('open')) closeHistory();
  });
  histClear.addEventListener('click', function () {
    if (!confirm('清空全部历史记录？')) return;
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) { /* ignore */ }
    renderHistory();
    showToast('🗑 历史记录已清空');
  });

  /* ================= 彩带 ================= */
  var confettiPieces = [];
  var confettiRaf = null;
  function fireConfetti() {
    var cvs = confettiCanvas;
    var dpr = window.devicePixelRatio || 1;
    cvs.width = window.innerWidth * dpr;
    cvs.height = window.innerHeight * dpr;
    var ctx = cvs.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cvs.classList.add('show');

    confettiPieces = [];
    var colors = ['#e0b04a', '#d9794a', '#7fae6a', '#4f95c2', '#8e63c0', '#c95572'];
    for (var i = 0; i < 180; i++) {
      confettiPieces.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: 2 + Math.random() * 4,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }

    var startTime = Date.now();
    function tick() {
      var now = Date.now();
      var elapsed = now - startTime;
      if (elapsed > 3500) {
        cvs.classList.remove('show');
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        return;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var gravity = 0.15;
      var alive = false;

      confettiPieces.forEach(function (p) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.rot += p.vrot;

        if (p.y > window.innerHeight + 50) return;
        alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3500);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (alive) confettiRaf = requestAnimationFrame(tick);
      else cvs.classList.remove('show');
    }
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    tick();
  }

  /* ================= 初始化 ================= */
  function init() {
    loadSettings();
    applySettingsToUI();
    buildKeyboard();
    btnSound.textContent = state.sound ? '🔊' : '🔇';
    updateLimitOptions();
    resetTest();
    // 监听窗口尺寸变化重绘
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        drawWpmChart();
        if (histDrawer.classList.contains('open')) renderHistory();
      }, 200);
    });
  }

  init();
})();