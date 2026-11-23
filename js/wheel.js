/* js/wheel.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var THEME_KEY = 'wheel_theme_v1';
  var SETTINGS_KEY = 'wheel_settings_v1';
  var HISTORY_KEY = 'wheel_history_v1';
  var MAX_HISTORY = 100;

  var DEFAULT_TEXT = [
    '🎁 一等奖',
    '🎈 二等奖',
    '🍬 三等奖',
    '😀 谢谢参与',
    '🎉 再来一次',
    '⭐ 幸运奖',
    '🎊 神秘奖'
  ].join('\n');

  var SPEED_MAP = {
    fast: { duration: 2500, spins: [4, 6] },
    normal: { duration: 4200, spins: [5, 7] },
    slow: { duration: 6000, spins: [6, 8] }
  };

  /* ================= DOM ================= */
  function $(id) { return document.getElementById(id); }

  var els = {};
  function cacheEls() {
    els.entries = $('entries');
    els.countEl = $('count');
    els.warnEl = $('warn');
    els.canvas = $('wheel');
    els.ctx = els.canvas.getContext('2d');
    els.spinBtn = $('spinBtn');
    els.resultEl = $('result');
    els.resultText = els.resultEl.querySelector('.result-text');
    els.historyList = $('historyList');
    els.historyEmpty = $('historyEmpty');
    els.historyCount = $('historyCount');
    els.removeWinnerEl = $('removeWinner');
    els.soundToggleEl = $('soundToggle');
    els.showModalToggle = $('showModalToggle');
    els.clearHistoryBtn = $('clearHistory');
    els.exportHistoryBtn = $('exportHistory');
    els.shuffleBtn = $('shuffleBtn');
    els.dedupeBtn = $('dedupeBtn');
    els.resetBtn = $('resetBtn');
    els.clearAllBtn = $('clearAllBtn');
    els.pointer = $('pointer');
    els.btnTheme = $('btn-theme');
    els.btnSettings = $('btn-settings');

    els.drawer = $('settingsDrawer');
    els.drawerBackdrop = $('drawerBackdrop');
    els.btnSettingsClose = $('btn-settings-close');
    els.segSpeed = $('seg-speed');
    els.segSound = $('seg-sound');
    els.segMulti = $('seg-multi');
    els.optHideLabels = $('opt-hide-labels');
    els.optConfetti = $('opt-confetti');

    els.winnerModal = $('winnerModal');
    els.winnerIcon = $('winnerIcon');
    els.winnerTitle = $('winnerTitle');
    els.winnerListEl = $('winnerList');
    els.btnWinnerCopy = $('btn-winner-copy');
    els.btnWinnerClose = $('btn-winner-close');

    els.confettiCanvas = $('confettiCanvas');
    els.toast = $('wheelToast');

    els.quickPickBtns = document.querySelectorAll('.quick-pick-btn');
  }

  /* ================= 状态 ================= */
  var state = {
    items: [],
    rotation: 0,          // 归一化到 [0, 2π)
    spinning: false,
    cssSize: 400,
    theme: 'light',
    settings: {
      speed: 'normal',
      soundType: 'tick',
      multiCount: 1,
      hideLabels: false,
      confetti: true
    },
    history: []
  };

  var lastTickIdx = -1;
  var lastTickTime = 0;
  var audioCtx = null;
  var toastTimer = null;
  var confettiRaf = null;

  /* ================= 工具 ================= */
  function normalizeAngle(a) {
    var TWO_PI = Math.PI * 2;
    return ((a % TWO_PI) + TWO_PI) % TWO_PI;
  }

  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 1800);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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

  /* ================= 尺寸 ================= */
  function resizeCanvas() {
    var rect = els.canvas.getBoundingClientRect();
    var w = Math.max(160, Math.round(rect.width || 400));
    var dpr = window.devicePixelRatio || 1;
    els.canvas.width = Math.round(w * dpr);
    els.canvas.height = Math.round(w * dpr);
    els.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.cssSize = w;
    draw();
  }

  /* ================= 名单 ================= */
  function syncItems() {
    var raw = els.entries.value;
    var arr = [];
    raw.split(/\r?\n/).forEach(function (line) {
      var s = line.trim();
      if (s) arr.push(s);
    });
    if (arr.length > 200) {
      arr = arr.slice(0, 200);
      els.warnEl.textContent = '⚠️ 最多支持 200 个选项，超出部分已忽略';
      els.warnEl.hidden = false;
    } else {
      els.warnEl.hidden = true;
    }
    state.items = arr;
    els.countEl.textContent = arr.length + ' 项';
    if (!state.spinning) draw();
  }

  /* ================= 颜色 ================= */
  function colorFor(i, n) {
    // 黄金角分布色相，避免相邻太接近
    var hue = (i * 137.508) % 360;
    var sat = 60 + (i % 3) * 8;
    var lig = 48 + (i % 2) * 6;
    return 'hsl(' + hue.toFixed(1) + ',' + sat + '%,' + lig + '%)';
  }

  /* ================= 绘制 ================= */
  function draw() {
    var size = state.cssSize;
    var cx = size / 2;
    var cy = size / 2;
    var r = size / 2 - 6;
    var n = state.items.length;
    var ctx = els.ctx;

    ctx.clearRect(0, 0, size, size);

    // 外圈底色
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    var isDark = state.theme === 'dark';
    ctx.fillStyle = isDark ? '#3a2f1e' : '#e2d3b4';
    ctx.fill();

    if (n === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(10, r - 4), 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#221c15' : '#f9f3e3';
      ctx.fill();
      ctx.fillStyle = isDark ? '#8a7a5f' : '#8a7a5f';
      ctx.font = '600 15px "LXGW WenKai", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请先在左侧输入选项', cx, cy);
      return;
    }

    var seg = Math.PI * 2 / n;

    // 扇形
    for (var i = 0; i < n; i++) {
      var a0 = state.rotation + i * seg;
      var a1 = a0 + seg;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = colorFor(i, n);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, .45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 文字
    if (!state.settings.hideLabels) {
      var fs = Math.max(9, Math.min(20, 280 / n)) * Math.max(0.75, Math.min(1.35, r / 190));
      fs = Math.min(fs, r * 0.16);
      ctx.font = '600 ' + fs.toFixed(1) + 'px "LXGW WenKai", system-ui, sans-serif';
      ctx.textBaseline = 'middle';

      var maxW = Math.max(r * 0.34, r - fs * 1.9);

      for (var j = 0; j < n; j++) {
        var mid = state.rotation + (j + 0.5) * seg;
        var label = state.items[j];

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);

        if (ctx.measureText(label).width > maxW) {
          var s = label;
          while (s.length > 1 && ctx.measureText(s + '…').width > maxW) {
            s = s.slice(0, -1);
          }
          label = s + '…';
        }

        var norm = normalizeAngle(mid);
        var flip = norm > Math.PI / 2 && norm < Math.PI * 1.5;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, .25)';
        ctx.shadowBlur = 2;
        if (flip) {
          ctx.rotate(Math.PI);
          ctx.textAlign = 'left';
          ctx.fillText(label, -(r - fs * 0.9), 0);
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(label, r - fs * 0.9, 0);
        }
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // 中心圆
    var cr = Math.max(16, r * 0.11);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#2a2418' : '#fdf8ec';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#4a4030' : '#d8c8a6';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isDark ? '#d4a05f' : '#8a5a2b';
    ctx.font = '700 ' + Math.max(11, cr * 0.8).toFixed(0) + 'px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO', cx, cy);
  }

  /* ================= 指针当前扇区 ================= */
  function indexAtPointer() {
    var n = state.items.length;
    if (!n) return -1;
    var seg = Math.PI * 2 / n;
    // 指针在 -π/2（正上方），归一化到 [0, 2π)
    // 扇形 i 的角度范围是 [rotation + i*seg, rotation + (i+1)*seg]
    // 求使 -π/2 落在其中的 i
    var pointerNorm = normalizeAngle(-Math.PI / 2 - state.rotation);
    var idx = Math.floor(pointerNorm / seg) % n;
    if (idx < 0) idx += n;
    return idx;
  }

  /* ================= 音效 ================= */
  function playSound() {
    if (!els.soundToggleEl.checked) return;
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var now = audioCtx.currentTime;
      var type = state.settings.soundType;

      if (type === 'tick') {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.04, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.06);
      } else if (type === 'beep') {
        var osc2 = audioCtx.createOscillator();
        var gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now);
        gain2.gain.setValueAtTime(0.0001, now);
        gain2.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc2.connect(gain2); gain2.connect(audioCtx.destination);
        osc2.start(now); osc2.stop(now + 0.1);
      } else if (type === 'chime') {
        // 三音阶 C5-E5-G5
        var freqs = [523.25, 659.25, 783.99];
        freqs.forEach(function (f, i) {
          var o = audioCtx.createOscillator();
          var g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          var t = now + i * 0.03;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.04, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(t); o.stop(t + 0.13);
        });
      }
    } catch (e) { /* 忽略 */ }
  }

  /* ================= 旋转锁定 ================= */
  function lockUI(locked) {
    var elsList = [
      els.spinBtn, els.shuffleBtn, els.dedupeBtn,
      els.resetBtn, els.clearAllBtn, els.removeWinnerEl
    ];
    elsList.forEach(function (b) { b.disabled = locked; });
    els.quickPickBtns.forEach(function (b) { b.disabled = locked; });
    if (locked) {
      els.entries.classList.add('readonly');
      els.entries.readOnly = true;
      els.pointer.classList.add('spinning');
    } else {
      els.entries.classList.remove('readonly');
      els.entries.readOnly = false;
      els.pointer.classList.remove('spinning');
    }
  }

  /* ================= 单人旋转（Promise） ================= */
  function spinOne(idx) {
    return new Promise(function (resolve) {
      var n = state.items.length;
      var seg = Math.PI * 2 / n;
      var pointer = -Math.PI / 2;

      // 落点微随机，不能跨过扇形边界
      var offset = (Math.random() - 0.5) * seg * 0.5;

      // 目标：让第 idx 个扇形的中心对准指针
      var targetNorm = normalizeAngle(pointer - (idx + 0.5) * seg + offset);
      var currentNorm = normalizeAngle(state.rotation);

      var delta = targetNorm - currentNorm;
      if (delta < 0) delta += Math.PI * 2;

      var cfg = SPEED_MAP[state.settings.speed] || SPEED_MAP.normal;
      var spins = cfg.spins[0] + Math.floor(Math.random() * (cfg.spins[1] - cfg.spins[0] + 1));
      var total = delta + spins * Math.PI * 2;
      var duration = cfg.duration;
      var start = state.rotation;
      var t0 = performance.now();

      lastTickIdx = -1;
      lastTickTime = 0;

      function frame(now) {
        var t = Math.min(1, (now - t0) / duration);
        var e = 1 - Math.pow(1 - t, 4); // easeOutQuart
        state.rotation = start + total * e;
        draw();

        var cur = indexAtPointer();
        if (cur !== lastTickIdx && now - lastTickTime > 45 && t < 0.985) {
          lastTickIdx = cur;
          lastTickTime = now;
          playSound();
        }

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          state.rotation = normalizeAngle(state.rotation);
          draw();
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  /* ================= 主抽奖流程 ================= */
  async function spin() {
    if (state.spinning) return;
    var n = state.items.length;
    if (n < 2) {
      showToast('⚠️ 至少需要 2 个选项');
      return;
    }

    state.spinning = true;
    lockUI(true);

    var multiCount = Math.min(state.settings.multiCount, n);
    var removeWinner = els.removeWinnerEl.checked;
    var winners = [];

    try {
      for (var round = 0; round < multiCount; round++) {
        var pool = state.items;
        if (pool.length === 0) break;

        var idx = Math.floor(Math.random() * pool.length);
        var winner = pool[idx];

        // 显示"抽奖中"
        els.resultEl.classList.remove('has-winner', 'pop');
        if (multiCount > 1) {
          els.resultText.textContent = '抽取中… (' + (round + 1) + '/' + multiCount + ')';
        } else {
          els.resultText.textContent = '抽奖中…';
        }

        await spinOne(idx);

        winners.push(winner);
        addHistory(winner);

        // 移除中奖者
        if (removeWinner) {
          var realIdx = state.items.indexOf(winner);
          if (realIdx >= 0) {
            state.items.splice(realIdx, 1);
            els.entries.value = state.items.join('\n');
            els.countEl.textContent = state.items.length + ' 项';
          }
        }

        // 显示本轮中奖
        els.resultText.textContent = multiCount > 1
          ? '第 ' + (round + 1) + ' 位：' + winner
          : winner;
      }

      // 最终显示
      if (winners.length > 0) {
        els.resultEl.classList.add('has-winner');
        els.resultEl.classList.remove('pop');
        void els.resultEl.offsetWidth;
        els.resultEl.classList.add('pop');
        els.pointer.classList.add('win');
        setTimeout(function () { els.pointer.classList.remove('win'); }, 800);

        if (multiCount === 1) {
          els.resultText.textContent = '🏆 ' + winners[0];
        } else {
          els.resultText.textContent = '🏆 抽中 ' + winners.length + ' 位';
        }

        if (state.settings.confetti) {
          fireConfetti();
        }

        if (els.showModalToggle.checked) {
          showWinnerModal(winners);
        }
      }
    } catch (e) {
      console.error('[spin error]', e);
      showToast('❌ 抽奖出错：' + (e.message || e));
    } finally {
      state.spinning = false;
      lockUI(false);
      draw();
    }
  }

  /* ================= 中奖弹窗 ================= */
  function showWinnerModal(winners) {
    if (winners.length === 0) return;
    els.winnerIcon.textContent = winners.length === 1 ? '🎉' : '🏆';
    els.winnerTitle.textContent = winners.length === 1
      ? '恭喜中奖'
      : '恭喜以下 ' + winners.length + ' 位';

    var html = '';
    winners.forEach(function (w, i) {
      html += '<div class="winner-list-item">' +
        '<span class="winner-name">' + escapeHtml(w) + '</span>' +
        '<span class="winner-idx">#' + (i + 1) + '</span>' +
        '</div>';
    });
    els.winnerListEl.innerHTML = html;
    els.winnerModal.hidden = false;
  }

  function closeWinnerModal() {
    els.winnerModal.hidden = true;
  }

  /* ================= 历史 ================= */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      state.history = raw ? JSON.parse(raw) : [];
    } catch (e) { state.history = []; }
    if (!Array.isArray(state.history)) state.history = [];
    renderHistory();
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }

  function addHistory(name) {
    state.history.unshift({
      name: name,
      ts: Date.now()
    });
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    if (state.history.length === 0) {
      els.historyEmpty.style.display = '';
      els.historyList.innerHTML = '';
      els.historyCount.textContent = '';
      return;
    }
    els.historyEmpty.style.display = 'none';
    els.historyCount.textContent = '· 共 ' + state.history.length + ' 条';

    var html = '';
    state.history.forEach(function (h, i) {
      var d = new Date(h.ts);
      var time = (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0');
      html += '<li data-idx="' + i + '">' +
        '<span class="h-name">' + escapeHtml(h.name) + '</span>' +
        '<span class="h-time">' + time + '</span>' +
        '</li>';
    });
    els.historyList.innerHTML = html;
  }

  function exportHistory() {
    if (state.history.length === 0) {
      showToast('没有历史可导出');
      return;
    }
    var lines = ['# 抽奖历史记录', '# 导出时间: ' + new Date().toLocaleString('zh-CN'), ''];
    state.history.slice().reverse().forEach(function (h, i) {
      var d = new Date(h.ts);
      lines.push((i + 1) + '. [' + d.toLocaleString('zh-CN') + '] ' + h.name);
    });
    var text = lines.join('\n');
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var ts = new Date();
    var tsStr = ts.getFullYear() + String(ts.getMonth() + 1).padStart(2, '0') +
      String(ts.getDate()).padStart(2, '0') + '-' +
      String(ts.getHours()).padStart(2, '0') + String(ts.getMinutes()).padStart(2, '0');
    a.href = url;
    a.download = 'wheel-history-' + tsStr + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📥 已导出');
  }

  /* ================= 彩带 ================= */
  var confettiPieces = [];
  function fireConfetti() {
    var canvas = els.confettiCanvas;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.classList.add('active');

    var colors = ['#e0b04a', '#d9794a', '#7fae6a', '#4f95c2', '#8e63c0', '#c95572', '#d4a020'];
    confettiPieces = [];
    for (var i = 0; i < 150; i++) {
      confettiPieces.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 250,
        y: window.innerHeight / 2 - 50 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 12,
        vy: -4 - Math.random() * 6,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        life: 1
      });
    }

    var startTime = Date.now();
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    function tick() {
      var elapsed = Date.now() - startTime;
      if (elapsed > 2800) {
        canvas.classList.remove('active');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var gravity = 0.28;
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
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 2800);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive) confettiRaf = requestAnimationFrame(tick);
      else canvas.classList.remove('active');
    }
    tick();
  }

  /* ================= 主题 ================= */
  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') state.theme = t;
    } catch (e) {}
    applyTheme();
  }
  function applyTheme() {
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    els.btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    if (!state.spinning) draw();
  }

  /* ================= 设置 ================= */
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          Object.keys(state.settings).forEach(function (k) {
            if (s[k] !== undefined) state.settings[k] = s[k];
          });
        }
      }
    } catch (e) {}
    applySettingsUI();
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (e) {}
  }

  function applySettingsUI() {
    // 速度
    Array.prototype.forEach.call(els.segSpeed.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.settings.speed);
    });
    // 音效
    Array.prototype.forEach.call(els.segSound.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.settings.soundType);
    });
    // 人数
    Array.prototype.forEach.call(els.segMulti.children, function (b) {
      b.classList.toggle('active', parseInt(b.dataset.value, 10) === state.settings.multiCount);
    });
    // 隐藏文字
    els.optHideLabels.checked = state.settings.hideLabels;
    // 彩带
    els.optConfetti.checked = state.settings.confetti;
  }

  /* ================= 抽屉 ================= */
  function openDrawer() {
    els.drawerBackdrop.hidden = false;
    els.drawer.classList.add('open');
  }
  function closeDrawer() {
    els.drawerBackdrop.hidden = true;
    els.drawer.classList.remove('open');
  }

  /* ================= 快速抽取 ================= */
  function quickPick(count) {
    if (state.spinning) return;
    state.settings.multiCount = Math.min(count, state.items.length);
    // 临时改人数并触发抽奖
    var originalMulti = state.settings.multiCount;
    // 直接调用抽奖（用临时人数）
    var multi = Math.min(count, state.items.length);
    if (multi < 2) { showToast('⚠️ 至少需要 2 个选项'); return; }
    if (count > state.items.length) {
      showToast('选项不足，将抽取 ' + state.items.length + ' 位');
    }
    // 手动实现一次抽多人，不改设置
    runQuickMulti(multi);
  }

  async function runQuickMulti(count) {
    // 暂存 multiCount，抽完恢复
    var savedMulti = state.settings.multiCount;
    state.settings.multiCount = count;
    try {
      await spin();
    } finally {
      state.settings.multiCount = savedMulti;
    }
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // 名单输入
    els.entries.addEventListener('input', syncItems);

    // 抽奖
    els.spinBtn.addEventListener('click', spin);
    els.canvas.addEventListener('click', function () {
      if (!state.spinning) spin();
    });

    // 快捷按钮
    els.shuffleBtn.addEventListener('click', function () {
      if (state.spinning) return;
      for (var i = state.items.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = state.items[i];
        state.items[i] = state.items[j];
        state.items[j] = t;
      }
      els.entries.value = state.items.join('\n');
      syncItems();
    });

    els.dedupeBtn.addEventListener('click', function () {
      if (state.spinning) return;
      var seen = {};
      var arr = [];
      state.items.forEach(function (it) {
        if (!seen[it]) {
          seen[it] = true;
          arr.push(it);
        }
      });
      if (arr.length === state.items.length) {
        showToast('没有重复项');
        return;
      }
      state.items = arr;
      els.entries.value = arr.join('\n');
      syncItems();
      showToast('🧹 已去除 ' + (Object.keys(seen).length - arr.length + (state.items.length - arr.length)) + ' 个重复');
    });

    els.resetBtn.addEventListener('click', function () {
      if (state.spinning) return;
      els.entries.value = DEFAULT_TEXT;
      syncItems();
      showToast('已恢复默认名单');
    });

    els.clearAllBtn.addEventListener('click', function () {
      if (state.spinning) return;
      if (!confirm('清空名单？')) return;
      els.entries.value = '';
      syncItems();
    });

    // 历史
    els.clearHistoryBtn.addEventListener('click', function () {
      if (state.history.length === 0) return;
      if (!confirm('清空历史记录？')) return;
      state.history = [];
      saveHistory();
      renderHistory();
      showToast('已清空历史');
    });

    els.exportHistoryBtn.addEventListener('click', exportHistory);

    els.historyList.addEventListener('click', function (e) {
      var li = e.target.closest('li');
      if (!li) return;
      var idx = parseInt(li.dataset.idx, 10);
      if (!isNaN(idx) && state.history[idx]) {
        copyText(state.history[idx].name);
      }
    });

    // 主题
    els.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
      applyTheme();
    });

    // 抽屉
    els.btnSettings.addEventListener('click', openDrawer);
    els.btnSettingsClose.addEventListener('click', closeDrawer);
    els.drawerBackdrop.addEventListener('click', closeDrawer);

    // 设置 - 速度
    els.segSpeed.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      Array.prototype.forEach.call(els.segSpeed.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.settings.speed = btn.dataset.value;
      saveSettings();
    });

    // 设置 - 音效
    els.segSound.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      Array.prototype.forEach.call(els.segSound.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.settings.soundType = btn.dataset.value;
      saveSettings();
      // 试听
      playSound();
    });

    // 设置 - 人数
    els.segMulti.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      Array.prototype.forEach.call(els.segMulti.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.settings.multiCount = parseInt(btn.dataset.value, 10);
      saveSettings();
    });

    // 设置 - 隐藏文字
    els.optHideLabels.addEventListener('change', function () {
      state.settings.hideLabels = this.checked;
      saveSettings();
      if (!state.spinning) draw();
    });

    // 设置 - 彩带
    els.optConfetti.addEventListener('change', function () {
      state.settings.confetti = this.checked;
      saveSettings();
    });

    // 中奖弹窗
    els.btnWinnerClose.addEventListener('click', closeWinnerModal);
    els.winnerModal.addEventListener('click', function (e) {
      if (e.target === els.winnerModal) closeWinnerModal();
    });
    els.btnWinnerCopy.addEventListener('click', function () {
      var items = els.winnerListEl.querySelectorAll('.winner-name');
      var names = [];
      items.forEach(function (el) { names.push(el.textContent); });
      copyText(names.join('\n'));
    });

    // 快速抽取
    els.quickPickBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        quickPick(parseInt(btn.dataset.count, 10));
      });
    });

    // 快捷键
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!els.winnerModal.hidden) closeWinnerModal();
        else if (els.drawer.classList.contains('open')) closeDrawer();
      }
      // 空格抽奖（不在输入框时）
      if (e.code === 'Space' && !state.spinning &&
          document.activeElement !== els.entries &&
          els.winnerModal.hidden) {
        e.preventDefault();
        spin();
      }
    });

    // 窗口大小
    if (window.ResizeObserver) {
      new ResizeObserver(resizeCanvas).observe(els.canvas);
    } else {
      window.addEventListener('resize', resizeCanvas);
    }
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheEls();
    loadTheme();
    loadSettings();
    loadHistory();
    bindEvents();

    els.entries.value = DEFAULT_TEXT;
    syncItems();
    resizeCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();