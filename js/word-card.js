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

  var DATA_FILES = [
    ['junior', '../../data/1 初中-乱序.txt'],
    ['senior', '../../data/2 高中-乱序.txt'],
    ['cet4',   '../../data/3 四级-乱序.txt'],
    ['cet6',   '../../data/4 六级-乱序.txt'],
    ['kaoyan', '../../data/5 考研-乱序.txt'],
    ['toefl',  '../../data/6 托福-乱序.txt'],
    ['sat',    '../../data/7 SAT-乱序.txt']
  ];

  var FILE_HINTS = [
    { re: /初中|junior|chuzhong/i, id: 'junior' },
    { re: /高中|senior|gaozhong/i, id: 'senior' },
    { re: /四级|cet[\s_\-]?4|band\s*4/i, id: 'cet4' },
    { re: /六级|cet[\s_\-]?6|band\s*6/i, id: 'cet6' },
    { re: /考研|kaoyan/i, id: 'kaoyan' },
    { re: /托福|toefl/i, id: 'toefl' },
    { re: /(^|\W)sat(\W|$)|sat[\s_\-]|SAT/i, id: 'sat' }
  ];

  var JA_FILE_HINTS = [
    { re: /(^|\W)n[\s_\-]?1(\W|$)|N1|jlpt[\s_\-]?1/i, id: 'n1' },
    { re: /(^|\W)n[\s_\-]?2(\W|$)|N2|jlpt[\s_\-]?2/i, id: 'n2' },
    { re: /(^|\W)n[\s_\-]?3(\W|$)|N3|jlpt[\s_\-]?3/i, id: 'n3' },
    { re: /(^|\W)n[\s_\-]?4(\W|$)|N4|jlpt[\s_\-]?4/i, id: 'n4' },
    { re: /(^|\W)n[\s_\-]?5(\W|$)|N5|jlpt[\s_\-]?5/i, id: 'n5' }
  ];

  var DB_NAME = 'tool-word-card';
  var DB_VER = 1;
  var DB_STORE = 'decks';
  var LS_KEY = 'wordcard.state.v6';

  /* ================= ECDICT 加载器 ================= */
  // 【修复重点】：把 '../../js/ecdict-cn.js' 放在第一位。
  var ECDICT_SOURCES = [
    '../../js/ecdict-cn.js',
    '../../js/libs/ecdict-cn/ecdict-cn.js',
    '../../js/libs/ecdict-cn/dict.js',
    '../../js/libs/ecdict-cn/data.js',
    '../../js/libs/ecdict-cn/index.js'
  ];
  var ECDICT_GLOBALS = [
    'ECDICT_CN', 'ECDICT', 'ECDICT_DATA', 'DICT_CN', 'DICT_DATA',
    'ecdictCN', 'ecdict', 'dictCN', 'dictData', 'dictionary', 'DICT'
  ];

  function findDictInWindow() {
    // 1. 找已知的全局变量
    for (var i = 0; i < ECDICT_GLOBALS.length; i++) {
      var v = window[ECDICT_GLOBALS[i]];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (v.__esModule && v.default && typeof v.default === 'object') v = v.default;
        // 特征判断：必须包含 "good" 且其值含有中文
        if (v['good'] && typeof v['good'] === 'string' && /[\u4e00-\u9fa5]/.test(v['good'])) {
          return v;
        }
        // 兼容判断：如果有超过 100 个键值对，大概率就是词典
        var n = 0;
        for (var k in v) {
          if (Object.prototype.hasOwnProperty.call(v, k)) {
            n++;
            if (n > 100) return v;
          }
        }
      }
    }
    // 2. 暴力嗅探：遍历 window 下所有对象，找到像字典的
    for (var key in window) {
      try {
        var obj = window[key];
        if (obj && typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
          if (obj['good'] && typeof obj['good'] === 'string' && /[\u4e00-\u9fa5]/.test(obj['good'])) {
            console.log('🔍 [word-card] 成功嗅探到词典对象，全局变量名:', key);
            return obj;
          }
        }
      } catch (e) { /* 忽略跨域对象报错 */ }
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
        if (i >= ECDICT_SOURCES.length) {
          console.warn('❌ [word-card] 所有路径的 ecdict-cn.js 均加载失败');
          resolve(null); return;
        }
        var src = ECDICT_SOURCES[i++];
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = function () {
          var d = findDictInWindow();
          if (d) {
            console.log('✅ [word-card] 成功加载词典:', src);
            resolve(d);
          } else {
            next();
          }
        };
        s.onerror = function () { next(); };
        document.head.appendChild(s);
      }
      next();
    });
    return ecdictPromise;
  }

  /* ================= 日韩词库加载器 ================= */
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

    // 1. 整句/整词匹配
    for (var i = 0; i < candidates.length; i++) {
      if (ecdict[candidates[i]]) {
        var zh = extractFirstMeaning(ecdict[candidates[i]]);
        if (zh) return zh;
      }
    }

    // 2. 分词匹配
    var words = lower.split(/\s+/).filter(function (w) { return w && !STOP_WORDS[w]; });
    var parts = [];
    for (var j = 0; j < words.length; j++) {
      var w = words[j];
      var found = null;
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

  /* ================= 状态与界面 ================= */
  var state = {
    lang: 'en', loaded: {}, activeDecks: {}, fav: {}, mastered: {}, unmastered: {},
    shuffle: true, favOnly: false, unmasteredOnly: false, mode: 'learn', hideDef: false,
    soundOn: true, volume: 0.5, jaLoaded: false, koLoaded: false
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
    el.btnReset = $('btn-reset'); el.modeLearnBtn = $('mode-learn');
    el.modeTestBtn = $('mode-test'); el.card = $('card');
    el.deckTag = $('deck-tag'); el.statusTag = $('status-tag');
    el.wordEl = $('word'); el.imgCanvas = $('word-img-canvas');
    el.learnDefEl = $('learn-def'); el.testOptionsEl = $('test-options');
    el.testFeedbackEl = $('test-feedback'); el.controls = $('controls');
    el.btnPrev = $('btn-prev'); el.btnNext = $('btn-next');
    el.btnMasteredMark = $('btn-mastered-mark'); el.btnUnmasteredMark = $('btn-unmastered-mark');
    el.btnFavMark = $('btn-fav-mark'); el.statIdx = $('stat-idx');
    el.statMastered = $('stat-mastered'); el.statUnmastered = $('stat-unmastered');
    el.statFav = $('stat-fav'); el.btnSound = $('btn-sound');
    el.volumeSlider = $('volume-slider'); el.btnShare = $('btn-share');
    el.emptyEl = $('empty'); el.modal = $('modal');
    el.canvasEl = $('card-canvas'); el.btnClose = $('btn-close');
    el.btnChangeBg = $('btn-change-bg'); el.btnDownload = $('btn-download');
  }

  /* ================= 音效控制 ================= */
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
      var now = audioCtx.currentTime;
      var vol = state.volume;
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

  /* ================= 状态存取 ================= */
  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        lang: state.lang, active: Object.keys(state.activeDecks).filter(function(k){return state.activeDecks[k];}),
        shuffle: state.shuffle, favOnly: state.favOnly, unmasteredOnly: state.unmasteredOnly,
        mode: state.mode, hideDef: state.hideDef, soundOn: state.soundOn, volume: state.volume,
        fav: state.fav, mastered: state.mastered, unmastered: state.unmastered
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
      if (s.mode) state.mode = s.mode;
      if (typeof s.hideDef === 'boolean') state.hideDef = s.hideDef;
      if (typeof s.soundOn === 'boolean') state.soundOn = s.soundOn;
      if (typeof s.volume === 'number') state.volume = s.volume;
      if (s.fav) state.fav = s.fav;
      if (s.mastered) state.mastered = s.mastered;
      if (s.unmastered) state.unmastered = s.unmastered;
    } catch (e) { /* ignore */ }
  }

  function wkey(word, lang) { return (lang || state.lang) + '|' + String(word).toLowerCase(); }
  function currentDecks() { return state.lang === 'ja' ? JA_DECKS : (state.lang === 'ko' ? KO_DECKS : EN_DECKS); }
  function currentDeckIds() { return state.lang === 'ja' ? JA_DECK_IDS : (state.lang === 'ko' ? KO_DECK_IDS : EN_DECK_IDS); }
  function activeDecksHas(id) { return !!state.activeDecks[id]; }
  function activeDecksAdd(id) { state.activeDecks[id] = true; }
  function activeDecksDelete(id) { delete state.activeDecks[id]; }
  function activeDecksSize() { return Object.keys(state.activeDecks).filter(function(k){return state.activeDecks[k];}).length; }
  function countByLang(bucket) {
    var prefix = state.lang + '|'; var n = 0;
    for (var k in bucket) { if (k.indexOf(prefix) === 0) n++; }
    return n;
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
    if (state.shuffle) shuffleArr(arr);
    else arr.sort(function (a, b) { return a.word.toLowerCase().localeCompare(b.word.toLowerCase()); });

    allViewWords = arr; idx = 0; tempReveal = false;
    prepareOptions(); render();
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
    if (!isCorrect) {
      var k = wkey(w.word, w.lang); state.unmastered[k] = true; delete state.mastered[k]; saveState();
    }
    render();
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
    el.emptyEl.hidden = has; el.card.style.display = has ? '' : 'none'; el.controls.style.display = has ? '' : 'none';
    el.btnOrder.classList.toggle('is-active', state.shuffle); el.btnFavOnly.classList.toggle('is-active', state.favOnly);
    el.btnUnmasteredOnly.classList.toggle('is-active', state.unmasteredOnly);
    el.btnHideDef.classList.toggle('is-active', state.hideDef); el.btnHideDef.disabled = (state.mode !== 'learn');
    el.modeLearnBtn.classList.toggle('active', state.mode === 'learn'); el.modeTestBtn.classList.toggle('active', state.mode === 'test');
    el.btnSound.textContent = state.soundOn ? '🔊' : '🔇'; el.volumeSlider.value = state.volume;
    var langBtns = el.langSwitch.querySelectorAll('button');
    for (var li = 0; li < langBtns.length; li++) langBtns[li].classList.toggle('active', langBtns[li].dataset.lang === state.lang);
    el.statMastered.textContent = countByLang(state.mastered); el.statUnmastered.textContent = countByLang(state.unmastered); el.statFav.textContent = countByLang(state.fav);
    if (!has) { el.statIdx.textContent = '0 / 0'; return; }

    var w = allViewWords[idx], k = wkey(w.word, w.lang);
    el.wordEl.textContent = w.word;
    var deckInfo = DECK_MAP[w.deck];
    el.deckTag.textContent = deckInfo ? deckInfo.name : w.deck;
    if (deckInfo) el.deckTag.style.background = deckInfo.color;

    var isFav = !!state.fav[k];
    el.btnFavMark.textContent = isFav ? '⭐ 收藏' : '☆ 收藏'; el.btnFavMark.classList.toggle('is-fav', isFav);
    if (state.mastered[k]) { el.statusTag.hidden = false; el.statusTag.textContent = '✅ 已掌握'; el.statusTag.className = 'wc-status-tag is-mastered'; }
    else if (state.unmastered[k]) { el.statusTag.hidden = false; el.statusTag.textContent = '❌ 未掌握'; el.statusTag.className = 'wc-status-tag is-unmastered'; }
    else { el.statusTag.hidden = true; }

    drawWordImage(w.word);

    if (state.mode === 'learn') {
      el.learnDefEl.hidden = false; el.testOptionsEl.hidden = true; el.testFeedbackEl.hidden = true;
      if (state.hideDef && !tempReveal) { el.learnDefEl.textContent = '👁 点击查看释义'; el.learnDefEl.classList.add('is-hidden-def'); }
      else { el.learnDefEl.textContent = w.def; el.learnDefEl.classList.remove('is-hidden-def'); }
    } else {
      el.learnDefEl.hidden = true; el.testOptionsEl.hidden = false; el.testFeedbackEl.hidden = false;
      el.testOptionsEl.innerHTML = '';
      currentOptions.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'wc-test-option'; btn.textContent = opt;
        if (selectedOption) {
          btn.classList.add('disabled');
          if (opt === w.def) btn.classList.add('correct');
          else if (opt === selectedOption && opt !== w.def) btn.classList.add('wrong');
        } else btn.addEventListener('click', function () { selectOption(opt); });
        el.testOptionsEl.appendChild(btn);
      });
      if (selectedOption) {
        if (selectedOption === w.def) { el.testFeedbackEl.textContent = '🎉 回答正确！'; el.testFeedbackEl.className = 'wc-test-feedback success'; }
        else { el.testFeedbackEl.textContent = '😢 回答错误，已自动标记为"不会"。'; el.testFeedbackEl.className = 'wc-test-feedback error'; }
      } else { el.testFeedbackEl.textContent = '请点击选择正确的释义'; el.testFeedbackEl.className = 'wc-test-feedback'; }
    }
    el.statIdx.textContent = (idx + 1) + ' / ' + allViewWords.length;
  }

  /* ================= 操作与交互 ================= */
  function goNext() { if (!allViewWords.length) return; idx = (idx + 1) % allViewWords.length; tempReveal = false; prepareOptions(); render(); }
  function goPrev() { if (!allViewWords.length) return; idx = (idx - 1 + allViewWords.length) % allViewWords.length; tempReveal = false; prepareOptions(); render(); }
  function markMastery(isMastered) {
    if (!allViewWords.length) return;
    var w = allViewWords[idx], k = wkey(w.word, w.lang);
    if (isMastered) { state.mastered[k] = true; delete state.unmastered[k]; }
    else { state.unmastered[k] = true; delete state.mastered[k]; }
    saveState(); goNext();
  }
  function toggleFav() {
    if (!allViewWords.length) return;
    var w = allViewWords[idx], k = wkey(w.word, w.lang);
    if (state.fav[k]) {
      delete state.fav[k]; saveState();
      if (state.favOnly) { buildView(); renderDecks(); return; }
      render();
    } else { state.fav[k] = true; saveState(); render(); }
  }

  function bindEvents() {
    el.btnPrev.addEventListener('click', goPrev); el.btnNext.addEventListener('click', goNext);
    el.btnMasteredMark.addEventListener('click', function () { markMastery(true); });
    el.btnUnmasteredMark.addEventListener('click', function () { markMastery(false); });
    el.btnFavMark.addEventListener('click', toggleFav);
    el.learnDefEl.addEventListener('click', function () {
      if (state.mode !== 'learn' || !state.hideDef || tempReveal || !allViewWords.length) return;
      tempReveal = true; render();
    });
    el.modeLearnBtn.addEventListener('click', function () { if (state.mode === 'learn') return; state.mode = 'learn'; tempReveal = false; saveState(); prepareOptions(); render(); });
    el.modeTestBtn.addEventListener('click', function () { if (state.mode === 'test') return; state.mode = 'test'; tempReveal = false; saveState(); prepareOptions(); render(); });
    el.btnOrder.addEventListener('click', function () { state.shuffle = !state.shuffle; saveState(); buildView(); });
    el.btnHideDef.addEventListener('click', function () { if (state.mode !== 'learn') return; state.hideDef = !state.hideDef; tempReveal = false; saveState(); render(); });
    el.btnFavOnly.addEventListener('click', function () { state.favOnly = !state.favOnly; saveState(); buildView(); });
    el.btnUnmasteredOnly.addEventListener('click', function () { state.unmasteredOnly = !state.unmasteredOnly; saveState(); buildView(); });
    el.btnReset.addEventListener('click', function () {
      if (!confirm('确定清空当前语言的全部掌握状态、收藏和已学进度吗？')) return;
      var prefix = state.lang + '|';
      ['fav', 'mastered', 'unmastered'].forEach(function (b) {
        for (var k in state[b]) { if (k.indexOf(prefix) === 0) delete state[b][k]; }
      });
      saveState(); buildView();
    });
    el.btnSound.addEventListener('click', function () { state.soundOn = !state.soundOn; saveState(); render(); });
    el.volumeSlider.addEventListener('input', function (e) { state.volume = parseFloat(e.target.value); saveState(); });
    el.langSwitch.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-lang]') : null;
      if (!btn || btn.disabled) return;
      switchToLang(btn.dataset.lang);
    });
    
    document.addEventListener('keydown', function (e) {
      if (el.modal && !el.modal.hidden) { if (e.key === 'Escape') closeModal(); return; }
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (!allViewWords.length) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === '1' || e.key === 'x') { e.preventDefault(); markMastery(false); }
      else if (e.key === '2' || e.key === 'c') { e.preventDefault(); markMastery(true); }
      else if (e.key === 'f') { e.preventDefault(); toggleFav(); }
      else if (e.key === 'h' && state.mode === 'learn') { e.preventDefault(); el.btnHideDef.click(); }
    });

    el.btnShare.addEventListener('click', openModal); el.btnClose.addEventListener('click', closeModal);
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

  /* ================= 语言切换与词库加载 ================= */
  function switchToLang(newLang) {
    if (state.lang === newLang) return;
    if (newLang === 'ja' && !state.jaLoaded) { loadJaDecks().then(function (ok) { if (ok) { state.lang = 'ja'; saveState(); renderDecks(); buildView(); render(); } }); return; }
    if (newLang === 'ko' && !state.koLoaded) { loadKoDecks().then(function (ok) { if (ok) { state.lang = 'ko'; saveState(); renderDecks(); buildView(); render(); } }); return; }
    state.lang = newLang; saveState(); renderDecks(); buildView(); render();
  }

  function loadJaDecks() {
    var btns = el.langSwitch.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    el.decks.innerHTML = '<div class="wc-loading">加载日文词库与英汉词典中…</div>';

    return loadJaBank().then(function (vocab) {
      if (!vocab) {
        alert('❌ 未找到 word-card-bank1.js');
        el.decks.innerHTML = ''; for (var b = 0; b < btns.length; b++) btns[b].disabled = false; return false;
      }
      return loadEcdict().then(function (ecdict) {
        if (!ecdict) alert('⚠️ 警告：未加载到英汉词典 ecdict-cn.js！日文释义将保留英文原文。\n请检查文件是否在 js/ 目录下。');
        
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
      console.error(e); alert('加载失败: ' + e.message); el.decks.innerHTML = '';
      for (var b3 = 0; b3 < btns.length; b3++) btns[b3].disabled = false; return false;
    });
  }

  function loadKoDecks() {
    var btns = el.langSwitch.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
    el.decks.innerHTML = '<div class="wc-loading">加载韩文词库与英汉词典中…</div>';

    return loadKoBank().then(function (vocab) {
      if (!vocab) {
        alert('❌ 未找到 word-card-bank2.js'); el.decks.innerHTML = '';
        for (var b = 0; b < btns.length; b++) btns[b].disabled = false; return false;
      }
      return loadEcdict().then(function (ecdict) {
        if (!ecdict) alert('⚠️ 警告：未加载到英汉词典 ecdict-cn.js！韩文释义将保留英文原文。\n请检查文件是否在 js/ 目录下。');

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
      console.error(e); alert('加载失败: ' + e.message); el.decks.innerHTML = '';
      for (var b3 = 0; b3 < btns.length; b3++) btns[b3].disabled = false; return false;
    });
  }

  /* ================= 卡片分享图片 ================= */
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
      if (ctx.measureText(test).width > maxWidth && cur.trim()) { lines.push(cur.replace(/\s+$/, '')); cur = tk.replace(/^\s+/, ''); }
      else cur = test;
    }
    if (cur.trim()) lines.push(cur.replace(/\s+$/, ''));
    return lines;
  }
  function drawShareCard() {
    var w = allViewWords[idx]; if (!w) return;
    var ctx = el.canvasEl.getContext('2d'), W = el.canvasEl.width, H = el.canvasEl.height, s = BG_STYLES[bgStyle % BG_STYLES.length];
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    return fontsReady.then(function () {
      var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, s.from); g.addColorStop(1, s.to); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); for (var i = 0; i < 1200; i++) { ctx.globalAlpha = Math.random() * 0.045; ctx.fillStyle = s.line; ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1); } ctx.restore();
      ctx.strokeStyle = s.line; ctx.globalAlpha = 0.55; ctx.lineWidth = 3; ctx.strokeRect(52, 52, W - 104, H - 104);
      ctx.globalAlpha = 0.28; ctx.lineWidth = 1.5; ctx.strokeRect(74, 74, W - 148, H - 148); ctx.globalAlpha = 1;

      var deckInfo = DECK_MAP[w.deck], deckName = deckInfo ? deckInfo.name : w.deck;
      ctx.font = '500 34px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif'; ctx.fillStyle = s.sub;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('· ' + deckName + ' 词库 ·', 130, 168);

      ctx.font = '700 200px Georgia, "Times New Roman", serif'; ctx.fillStyle = s.line;
      ctx.globalAlpha = 0.13; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s.mark, 108, 420); ctx.globalAlpha = 1;

      var wordSize = 118, wordMaxW = W - 220; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      while (wordSize > 46) {
        ctx.font = '700 ' + wordSize + 'px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
        if (ctx.measureText(w.word).width <= wordMaxW) break; wordSize -= 4;
      }
      ctx.font = '700 ' + wordSize + 'px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      ctx.fillStyle = s.ink; ctx.fillText(w.word, W / 2, 550);

      var wordW = Math.min(ctx.measureText(w.word).width + 130, W - 220);
      ctx.strokeStyle = s.accent; ctx.globalAlpha = 0.75; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W / 2 - wordW / 2, 636); ctx.lineTo(W / 2 + wordW / 2, 636); ctx.stroke(); ctx.globalAlpha = 1;

      ctx.font = '500 44px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif';
      var lines = wrapText(ctx, w.def, W - 260); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = s.ink;
      var lineH = 44 * 1.72, y2 = 690, maxLines = 8, shown = lines.slice(0, maxLines);
      for (var k = 0; k < shown.length; k++) {
        var t = shown[k]; if (k === maxLines - 1 && lines.length > maxLines) t = t.replace(/.{0,2}$/, '…');
        ctx.fillText(t, 130, y2); y2 += lineH;
      }

      ctx.font = '400 28px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", serif'; ctx.fillStyle = s.sub;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = 0.85;
      ctx.fillText('TOOLS · 单词卡片闪记', W / 2, H - 108); ctx.globalAlpha = 1;
    });
  }
  function openModal() { if (!allViewWords.length) return; el.modal.hidden = false; document.body.style.overflow = 'hidden'; drawShareCard(); }
  function closeModal() { el.modal.hidden = true; document.body.style.overflow = ''; }

  /* ================= 初始化 ================= */
  function init() {
    cacheDom(); loadState();
    if (window.WORD_DECKS) {
      EN_DECK_IDS.forEach(function (id) { if (Array.isArray(window.WORD_DECKS[id])) state.loaded[id] = window.WORD_DECKS[id]; });
    }
    if (activeDecksSize() === 0) {
      var ids = currentDeckIds(); ids.forEach(function (id) { if (state.loaded[id]) activeDecksAdd(id); });
    }
    bindEvents(); renderDecks(); buildView();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();