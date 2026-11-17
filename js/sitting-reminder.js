/* js/sitting-reminder.js */
(function () {
  'use strict';

  /* ================= 通用工具 ================= */
  function $(id) { return document.getElementById(id); }

  var toastTimer = null;
  function showToast(msg) {
    var el = $('tt-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtMS(ms) {
    ms = Math.max(0, ms);
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return pad2(m) + ':' + pad2(s);
  }

  function fmtSW(ms) {
    ms = Math.max(0, ms);
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    var cs = Math.floor((ms % 1000) / 10);
    return pad2(m) + ':' + pad2(s) + '.' + pad2(cs);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /* ================= 主题 ================= */
  var themeKey = 'tt_theme_v1';
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
    if (document.querySelector('.tt-panel[data-panel="stats"]') || document.querySelector('#panel-stats.active')) {
      renderStats();
    }
  });

  /* ================= 标题闪烁 ================= */
  var originalTitle = document.title;
  var flashTimer = null;
  var flashState = false;
  function startFlashTitle(msg) {
    if (!document.hidden) return;
    stopFlashTitle();
    flashTimer = setInterval(function () {
      document.title = flashState ? originalTitle : '🔔 ' + msg;
      flashState = !flashState;
    }, 800);
  }
  function stopFlashTitle() {
    if (flashTimer) clearInterval(flashTimer);
    flashTimer = null;
    document.title = originalTitle;
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) stopFlashTitle();
  });

  /* ================= 桌面通知 ================= */
  function updateNotifyBtn() {
    var btn = $('btn-notify');
    if (!btn) return;
    if (!('Notification' in window)) {
      btn.style.opacity = '.4';
      btn.title = '浏览器不支持桌面通知';
      return;
    }
    if (Notification.permission === 'granted') {
      btn.classList.add('active');
      btn.title = '桌面通知已开启';
    } else if (Notification.permission === 'denied') {
      btn.style.opacity = '.4';
      btn.title = '桌面通知已被拒绝，请在浏览器设置中开启';
    } else {
      btn.title = '点击开启桌面通知';
    }
  }

  $('btn-notify').addEventListener('click', function () {
    if (!('Notification' in window)) {
      showToast('浏览器不支持桌面通知');
      return;
    }
    if (Notification.permission === 'granted') {
      showToast('✅ 通知已开启');
      return;
    }
    if (Notification.permission === 'denied') {
      showToast('通知已被拒绝，请在浏览器设置中手动开启');
      return;
    }
    Notification.requestPermission().then(function (result) {
      updateNotifyBtn();
      if (result === 'granted') showToast('✅ 通知已开启');
      else showToast('通知权限未授予');
    });
  });

  function sendNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden) return;
    try {
      var n = new Notification(title, {
        body: body,
        silent: true,
        tag: 'tt-alarm'
      });
      setTimeout(function () { n.close(); }, 6000);
    } catch (e) {}
  }
  updateNotifyBtn();

  /* ================= Wake Lock ================= */
  var wakeLock = null;
  function updateWakeBtn() {
    var btn = $('btn-wake');
    if (!btn) return;
    if (wakeLock) {
      btn.classList.add('active');
      btn.title = '屏幕常亮已开启（点击关闭）';
    } else {
      btn.classList.remove('active');
      btn.title = '点击开启屏幕常亮';
    }
  }
  $('btn-wake').addEventListener('click', async function () {
    if (wakeLock) {
      try { await wakeLock.release(); } catch (e) {}
      wakeLock = null;
      updateWakeBtn();
      showToast('屏幕常亮已关闭');
      return;
    }
    if (!('wakeLock' in navigator)) {
      showToast('浏览器不支持屏幕常亮');
      return;
    }
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', function () {
        wakeLock = null;
        updateWakeBtn();
      });
      updateWakeBtn();
      showToast('✅ 屏幕常亮已开启');
    } catch (e) {
      showToast('无法开启屏幕常亮：' + e.message);
    }
  });
  document.addEventListener('visibilitychange', async function () {
    if (document.visibilityState === 'visible' && !wakeLock && 'wakeLock' in navigator) {
      // 页面从后台恢复，如果用户之前开了常亮但被浏览器释放，这里不自动重开
    }
  });

  /* ================= 声音系统 ================= */
  var audioCtx = null;
  var volume = 0.88;
  var soundType = 'chime';
  var customAudioUrl = null;
  var customAudioEl = null;

  var volumeInput = $('sr-volume');
  var volumeVal = $('sr-volume-val');
  var fileInput = $('sr-audio-file');
  var audioNameEl = $('sr-audio-name');
  var clearBtn = $('sr-audio-clear');
  var customRadioLabel = $('sr-custom-radio-label');

  function getAudioCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function playDefaultChime() {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var peak = Math.max(0.0001, volume * 0.4);
    var now = ctx.currentTime;
    [0, 0.3].forEach(function (offset) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain); gain.connect(ctx.destination);
      var t = now + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t); osc.stop(t + 0.22);
    });
  }

  function playBell() {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var peak = Math.max(0.0001, volume * 0.32);
    var now = ctx.currentTime;
    var freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach(function (f, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(gain); gain.connect(ctx.destination);
      var t = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak / (i + 1), t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.start(t); osc.stop(t + 0.95);
    });
  }

  function playClickSound() {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var peak = Math.max(0.0001, volume * 0.6);
    var now = ctx.currentTime;
    // 用噪音模拟敲击
    var bufferSize = ctx.sampleRate * 0.15;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(now);
    // 加一个敲击底音
    var osc = ctx.createOscillator();
    var g2 = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    g2.gain.setValueAtTime(peak * 0.5, now);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g2); g2.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.13);
  }

  function playElectronic() {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var peak = Math.max(0.0001, volume * 0.35);
    var now = ctx.currentTime;
    var notes = [440, 587.33, 880, 1318.51];
    notes.forEach(function (f, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      osc.connect(gain); gain.connect(ctx.destination);
      var t = now + i * 0.08;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  }

  function playAlarm() {
    if (soundType === 'custom' && customAudioEl) {
      try {
        customAudioEl.currentTime = 0;
        customAudioEl.volume = volume;
        var p = customAudioEl.play();
        if (p && p.catch) p.catch(function () { playDefaultChime(); });
        return;
      } catch (e) {}
    }
    if (soundType === 'bell') return playBell();
    if (soundType === 'click') return playClickSound();
    if (soundType === 'electronic') return playElectronic();
    playDefaultChime();
  }

  // 音量
  volumeInput.addEventListener('input', function () {
    volume = parseInt(volumeInput.value, 10) / 100;
    volumeVal.textContent = volumeInput.value + '%';
    if (customAudioEl) customAudioEl.volume = volume;
  });

  // 声音类型
  document.querySelectorAll('input[name="sr-sound"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      soundType = radio.value;
      if (soundType === 'custom' && !customAudioEl) {
        showToast('请先上传自定义铃声');
      }
    });
  });

  // 自定义音频
  function clearCustomAudio() {
    if (customAudioUrl) { URL.revokeObjectURL(customAudioUrl); customAudioUrl = null; }
    customAudioEl = null;
    fileInput.value = '';
    audioNameEl.textContent = '';
    clearBtn.hidden = true;
    customRadioLabel.hidden = true;
    if (soundType === 'custom') {
      soundType = 'chime';
      var r = document.querySelector('input[name="sr-sound"][value="chime"]');
      if (r) r.checked = true;
    }
  }

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('文件超过 5MB，请选择更小的音频');
      fileInput.value = '';
      return;
    }
    if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
    customAudioUrl = URL.createObjectURL(file);
    customAudioEl = new Audio(customAudioUrl);
    customAudioEl.volume = volume;

    customAudioEl.addEventListener('loadedmetadata', function () {
      if (customAudioEl.duration > 30) {
        showToast('音频超过 30 秒，请选择更短的铃声');
        clearCustomAudio();
        return;
      }
      audioNameEl.textContent = file.name;
      clearBtn.hidden = false;
      customRadioLabel.hidden = false;
      document.querySelector('input[name="sr-sound"][value="custom"]').checked = true;
      soundType = 'custom';
      showToast('✅ 已加载自定义铃声');
    }, { once: true });

    customAudioEl.addEventListener('error', function () {
      showToast('无法播放该音频，请换一个格式');
      clearCustomAudio();
    }, { once: true });
  });

  clearBtn.addEventListener('click', function () {
    clearCustomAudio();
    showToast('已清除自定义铃声');
  });

  $('btn-test-sound').addEventListener('click', function () {
    playAlarm();
  });

  /* ================= 统计 ================= */
  var STATS_KEY = 'tt_stats_v1';
  var stats = { days: {} };

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.days) stats = parsed;
      }
    } catch (e) {}
  }
  function saveStats() {
    try {
      var keys = Object.keys(stats.days).sort();
      if (keys.length > 60) {
        keys.slice(0, keys.length - 60).forEach(function (k) { delete stats.days[k]; });
      }
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }
  function getDayStats(dateStr) {
    if (!stats.days[dateStr]) {
      stats.days[dateStr] = {
        sit: { rounds: 0, sitSeconds: 0, moveSeconds: 0, standSeconds: 0 },
        pomodoro: { workCount: 0, workSeconds: 0, breakCount: 0, breakSeconds: 0 }
      };
    }
    return stats.days[dateStr];
  }
  loadStats();

  /* ================= Tabs ================= */
  var tabs = document.querySelectorAll('.tt-tab');
  var panels = document.querySelectorAll('.tt-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var target = $(tab.dataset.target);
      if (target) target.classList.add('active');
      if (tab.dataset.target === 'panel-stats') {
        renderStats();
      }
    });
  });

  /* ================= 键盘快捷键 ================= */
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === ' ' || e.code === 'Space') {
      var activeTab = document.querySelector('.tt-tab.active');
      if (!activeTab) return;
      var target = activeTab.dataset.target;
      if (target === 'panel-sit') {
        var startBtn = $('btn-start');
        var pauseBtn = $('btn-pause');
        if (!startBtn.disabled) { e.preventDefault(); startBtn.click(); }
        else if (!pauseBtn.disabled) { e.preventDefault(); pauseBtn.click(); }
      } else if (target === 'panel-stopwatch') {
        var swS = $('sw-start');
        if (swS) { e.preventDefault(); swS.click(); }
      } else if (target === 'panel-countdown') {
        var cdS = $('cd-start');
        if (cdS && !cdS.disabled) { e.preventDefault(); cdS.click(); }
        else {
          var cdP = $('cd-pause');
          if (cdP && !cdP.disabled) { e.preventDefault(); cdP.click(); }
        }
      } else if (target === 'panel-pomodoro') {
        var pmS = $('pm-start');
        if (pmS) { e.preventDefault(); pmS.click(); }
      }
    } else if (e.key === 'r' || e.key === 'R') {
      var activeTab2 = document.querySelector('.tt-tab.active');
      if (!activeTab2) return;
      var tgt = activeTab2.dataset.target;
      if (tgt === 'panel-stopwatch') { e.preventDefault(); $('sw-reset').click(); }
      else if (tgt === 'panel-countdown') { e.preventDefault(); $('cd-reset').click(); }
      else if (tgt === 'panel-pomodoro') { e.preventDefault(); $('pm-reset').click(); }
      else if (tgt === 'panel-sit') { e.preventDefault(); $('btn-stop').click(); }
    }
  });

  /* ================= 1. 久坐 ================= */
  var PHASES = [
    { key: 'sit', label: '坐下', emoji: '🪑' },
    { key: 'move', label: '活动', emoji: '🚶' },
    { key: 'stand', label: '站立', emoji: '🧍' }
  ];
  var DUR_KEY = 'sitting-reminder-durations-v1';
  var DEFAULTS = { sit: 40, move: 3, stand: 20 };
  var R = 45;
  var C = 2 * Math.PI * R;

  var durations = Object.assign({}, DEFAULTS);
  var srIndex = 0;
  var srState = 'idle';
  var srRemaining = 0;
  var srEndTime = 0;
  var srTimer = null;
  var srCompletedRounds = 0;
  var srActivePhaseStart = 0;

  var cards = document.querySelectorAll('.sr-card');
  var srInputs = document.querySelectorAll('.sr-label input');
  var srStatus = $('sr-status');
  var btnStart = $('btn-start');
  var btnPause = $('btn-pause');
  var btnStop = $('btn-stop');

  // 从存储加载时长
  try {
    var saved = JSON.parse(localStorage.getItem(DUR_KEY) || '{}');
    PHASES.forEach(function (p) {
      if (typeof saved[p.key] === 'number') {
        durations[p.key] = saved[p.key];
        var input = Array.from(srInputs).find(function (i) { return i.dataset.phase === p.key; });
        if (input) input.value = saved[p.key];
      }
    });
  } catch (e) {}

  document.querySelectorAll('.sr-ring-progress').forEach(function (el) {
    el.style.strokeDasharray = String(C);
    el.style.strokeDashoffset = '0';
  });

  function srFmt(ms) {
    var total = Math.ceil(ms / 1000);
    var m = Math.floor(total / 60); var s = total % 60;
    return pad2(m) + ':' + pad2(s);
  }

  function srReadInputs() {
    srInputs.forEach(function (input) {
      durations[input.dataset.phase] = Math.max(0, parseInt(input.value, 10) || 0);
    });
    try { localStorage.setItem(DUR_KEY, JSON.stringify(durations)); } catch (e) {}
  }

  function srFirstNonZero() {
    for (var i = 0; i < PHASES.length; i++) if (durations[PHASES[i].key] > 0) return i;
    return -1;
  }
  function srNextNonZero(from) {
    for (var i = 1; i <= PHASES.length; i++) {
      var idx = (from + i) % PHASES.length;
      if (durations[PHASES[idx].key] > 0) return idx;
    }
    return -1;
  }

  function srUpdateRing(idx, rem, dur) {
    var card = cards[idx];
    var circle = card.querySelector('.sr-ring-progress');
    var timeEl = card.querySelector('.sr-time');
    var total = dur * 60000;
    var progress = total > 0 ? Math.max(0, Math.min(1, rem / total)) : 0;
    circle.style.strokeDashoffset = String(C * (1 - progress));
    timeEl.textContent = dur > 0 ? srFmt(rem) : '跳过';
  }

  function srRenderToday() {
    var today = getDayStats(todayStr());
    $('sr-today-rounds').textContent = today.sit.rounds;
    $('sr-today-sit').textContent = Math.floor(today.sit.sitSeconds / 60);
    $('sr-today-stand').textContent = Math.floor(today.sit.standSeconds / 60);
    $('sr-today-move').textContent = Math.floor(today.sit.moveSeconds / 60);
  }

  function srRender() {
    PHASES.forEach(function (p, i) {
      var isCurrent = srState !== 'idle' && i === srIndex;
      srUpdateRing(i, isCurrent ? srRemaining : durations[p.key] * 60000, durations[p.key]);
      cards[i].classList.toggle('active', isCurrent);
      cards[i].classList.toggle('dimmed', srState !== 'idle' && !isCurrent);
    });
    if (srState === 'idle') {
      srStatus.textContent = '';
    } else {
      var next = srNextNonZero(srIndex);
      var nextStr = next !== -1 ? ' · 下一阶段：' + PHASES[next].label : '';
      srStatus.textContent = PHASES[srIndex].emoji + ' ' + PHASES[srIndex].label +
        ' · ' + (srState === 'paused' ? '已暂停' : '进行中') +
        ' · 剩余 ' + srFmt(srRemaining) + nextStr;
    }
    btnStart.disabled = srState === 'running';
    btnPause.disabled = srState !== 'running';
    btnStop.disabled = srState === 'idle';
    srInputs.forEach(function (i) { i.disabled = srState !== 'idle'; });
  }

  function srAccumulatePhase(phaseKey) {
    // 累加当前阶段完成的时间到统计
    var today = getDayStats(todayStr());
    var dur = durations[phaseKey];
    if (dur > 0) {
      if (phaseKey === 'sit') today.sit.sitSeconds += dur * 60;
      else if (phaseKey === 'move') today.sit.moveSeconds += dur * 60;
      else if (phaseKey === 'stand') today.sit.standSeconds += dur * 60;
    }
  }

  function srTick() {
    if (srState !== 'running') return;
    srRemaining = Math.max(0, srEndTime - Date.now());
    if (srRemaining <= 0) { srOnDone(); return; }
    srUpdateRing(srIndex, srRemaining, durations[PHASES[srIndex].key]);
    var next = srNextNonZero(srIndex);
    var nextStr = next !== -1 ? ' · 下一阶段：' + PHASES[next].label : '';
    srStatus.textContent = PHASES[srIndex].emoji + ' ' + PHASES[srIndex].label +
      ' · 进行中 · 剩余 ' + srFmt(srRemaining) + nextStr;
  }

  function srOnDone() {
    playAlarm();
    // 累加当前完成阶段到统计
    var finishedPhaseKey = PHASES[srIndex].key;
    srAccumulatePhase(finishedPhaseKey);

    // 如果完成的是 stand，说明完成了一整轮
    if (finishedPhaseKey === 'stand') {
      var today = getDayStats(todayStr());
      today.sit.rounds++;
      saveStats();
      srRenderToday();
    }

    sendNotification('久坐提醒', PHASES[srIndex].label + '阶段结束，切换到下一阶段');
    startFlashTitle(PHASES[srIndex].label + '结束');

    var next = srNextNonZero(srIndex);
    if (next === -1) { srStop(); srStatus.textContent = '所有阶段都已结束'; return; }
    srIndex = next;
    srRemaining = durations[PHASES[srIndex].key] * 60000;
    srEndTime = Date.now() + srRemaining;
    srRender(); srTick();
  }

  btnStart.addEventListener('click', function () {
    srReadInputs();
    if (srFirstNonZero() === -1) { srStatus.textContent = '未设置任何时间。'; return; }
    var ctx = getAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume();
    if (srState === 'idle') {
      srIndex = srFirstNonZero();
      srRemaining = durations[PHASES[srIndex].key] * 60000;
      srCompletedRounds = 0;
    }
    srEndTime = Date.now() + srRemaining;
    srState = 'running';
    if (srTimer) clearInterval(srTimer);
    srTimer = setInterval(srTick, 100);
    srRender(); srTick();
  });

  btnPause.addEventListener('click', function () {
    if (srState !== 'running') return;
    srRemaining = Math.max(0, srEndTime - Date.now());
    srState = 'paused';
    if (srTimer) clearInterval(srTimer);
    srRender();
  });

  function srStop() {
    srState = 'idle';
    if (srTimer) clearInterval(srTimer);
    srTimer = null;
    srReadInputs();
    srIndex = srFirstNonZero();
    if (srIndex === -1) srIndex = 0;
    srRemaining = durations[PHASES[srIndex].key] * 60000;
    srRender();
  }
  btnStop.addEventListener('click', srStop);

  srInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      if (srState === 'idle') { srReadInputs(); srRender(); }
    });
  });

  srRender();
  srRenderToday();

  /* ================= 2. 秒表 ================= */
  var swDisplay = $('sw-display');
  var swStart = $('sw-start');
  var swLap = $('sw-lap');
  var swReset = $('sw-reset');
  var swExport = $('sw-export');
  var swLapsList = $('sw-laps');

  var swTime = 0;
  var swRunning = false;
  var swTimer = null;
  var swLastLap = 0;
  var swLaps = [];

  function swUpdate() {
    swDisplay.textContent = fmtSW(swTime);
  }

  function swRenderLaps() {
    if (swLaps.length === 0) {
      swLapsList.innerHTML = '';
      return;
    }
    var total = swLaps.reduce(function (a, l) { return a + l.diff; }, 0);
    var avg = total / swLaps.length;
    var html = '';
    swLaps.forEach(function (l, i) {
      var cls = '';
      if (swLaps.length >= 2) {
        if (l.diff < avg * 0.8) cls = 'fast';
        else if (l.diff > avg * 1.2) cls = 'slow';
      }
      html += '<li class="' + cls + '">' +
        '<span>计次 ' + (i + 1) + '</span>' +
        '<span>+' + fmtSW(l.diff) + '</span>' +
        '<span>' + fmtSW(l.total) + '</span>' +
        '</li>';
    });
    swLapsList.innerHTML = html;
  }

  swStart.addEventListener('click', function () {
    if (swRunning) {
      swRunning = false;
      clearInterval(swTimer);
      swTimer = null;
      swStart.textContent = '继续';
      swLap.disabled = true;
    } else {
      swRunning = true;
      var startTime = Date.now() - swTime;
      swTimer = setInterval(function () {
        swTime = Date.now() - startTime;
        swUpdate();
      }, 30);
      swStart.textContent = '暂停';
      swLap.disabled = false;
      swReset.disabled = false;
      swExport.disabled = swLaps.length === 0;
    }
  });

  swLap.addEventListener('click', function () {
    var lapTime = swTime - swLastLap;
    swLastLap = swTime;
    swLaps.push({ diff: lapTime, total: swTime });
    swRenderLaps();
    swExport.disabled = false;
  });

  swReset.addEventListener('click', function () {
    swRunning = false;
    clearInterval(swTimer);
    swTimer = null;
    swTime = 0;
    swLastLap = 0;
    swLaps = [];
    swUpdate();
    swRenderLaps();
    swStart.textContent = '开始';
    swLap.disabled = true;
    swReset.disabled = true;
    swExport.disabled = true;
  });

  swExport.addEventListener('click', function () {
    if (swLaps.length === 0) { showToast('没有可导出的记录'); return; }
    var lines = ['计次,累计时间,单圈时间'];
    swLaps.forEach(function (l, i) {
      lines.push((i + 1) + ',' + fmtSW(l.total) + ',' + fmtSW(l.diff));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'stopwatch-' + todayStr() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📤 已导出 CSV');
  });

  swUpdate();

  /* ================= 3. 倒计时 ================= */
  var cdDisplay = $('cd-display');
  var cdMin = $('cd-min');
  var cdSec = $('cd-sec');
  var cdStart = $('cd-start');
  var cdPause = $('cd-pause');
  var cdReset = $('cd-reset');
  var cdProgress = document.querySelector('.cd-progress');

  var cdTime = 0;
  var cdTotal = 0;
  var cdEndTime = 0;
  var cdTimer = null;
  var cdRunning = false;

  cdProgress.style.strokeDasharray = String(C);
  cdProgress.style.strokeDashoffset = String(C);

  function cdUpdate() {
    var total = Math.ceil(cdTime / 1000);
    var m = Math.floor(total / 60); var s = total % 60;
    cdDisplay.textContent = pad2(m) + ':' + pad2(s);
    if (cdTotal > 0) {
      var progress = Math.max(0, Math.min(1, cdTime / cdTotal));
      cdProgress.style.strokeDashoffset = String(C * (1 - progress));
    } else {
      cdProgress.style.strokeDashoffset = String(C);
    }
  }

  function cdStopTimer() {
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    cdRunning = false;
  }

  function cdStartFrom(ms) {
    cdTime = ms;
    cdTotal = ms;
    cdEndTime = Date.now() + ms;
    cdRunning = true;
    cdStart.disabled = true;
    cdPause.disabled = false;
    if (cdTimer) clearInterval(cdTimer);
    cdTimer = setInterval(function () {
      cdTime = Math.max(0, cdEndTime - Date.now());
      cdUpdate();
      if (cdTime === 0) {
        cdStopTimer();
        cdStart.disabled = false;
        cdPause.disabled = true;
        playAlarm();
        sendNotification('倒计时结束', '设定的计时已完成');
        startFlashTitle('倒计时结束');
        showToast('⏰ 倒计时结束！');
      }
    }, 100);
    cdUpdate();
  }

  cdStart.addEventListener('click', function () {
    var ctx = getAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume();
    if (cdRunning) return;
    if (cdTime <= 0) {
      var m = parseInt(cdMin.value, 10) || 0;
      var s = parseInt(cdSec.value, 10) || 0;
      if (m === 0 && s === 0) { showToast('请设置倒计时时间'); return; }
      cdStartFrom((m * 60 + s) * 1000);
    } else {
      cdStartFrom(cdTime);
    }
  });

  cdPause.addEventListener('click', function () {
    if (!cdRunning) return;
    cdTime = Math.max(0, cdEndTime - Date.now());
    cdStopTimer();
    cdStart.disabled = false;
    cdPause.disabled = true;
  });

  cdReset.addEventListener('click', function () {
    cdStopTimer();
    cdTime = 0;
    cdTotal = 0;
    cdStart.disabled = false;
    cdPause.disabled = true;
    cdUpdate();
  });

  // 快捷预设
  document.querySelectorAll('.cd-presets button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var secs = parseInt(btn.dataset.preset, 10);
      if (cdRunning) {
        cdStopTimer();
      }
      cdMin.value = Math.floor(secs / 60);
      cdSec.value = secs % 60;
      cdTime = 0;
      cdTotal = 0;
      cdUpdate();
      // 立即开始
      var ctx = getAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume();
      cdStartFrom(secs * 1000);
    });
  });

  cdUpdate();

  /* ================= 4. 番茄钟 ================= */
  var pmDisplay = $('pm-display');
  var pmStatus = $('pm-status');
  var pmStart = $('pm-start');
  var pmSkip = $('pm-skip');
  var pmReset = $('pm-reset');
  var pmProgress = document.querySelector('.pm-progress');

  var pmWorkMin = $('pm-work-min');
  var pmShortMin = $('pm-short-min');
  var pmLongMin = $('pm-long-min');
  var pmLongInterval = $('pm-long-interval');

  var PM_STATE_KEY = 'tt_pomodoro_state_v1';
  var pm = {
    mode: 'work',        // work | short-break | long-break
    remaining: 0,
    total: 0,
    endTime: 0,
    running: false,
    timer: null,
    cycleCount: 0        // 当前长休息周期内完成的 work 数
  };

  pmProgress.style.strokeDasharray = String(C);
  pmProgress.style.strokeDashoffset = String(C);

  function pmGetConfig() {
    return {
      work: Math.max(1, Math.min(120, parseInt(pmWorkMin.value, 10) || 25)) * 60 * 1000,
      short: Math.max(1, Math.min(60, parseInt(pmShortMin.value, 10) || 5)) * 60 * 1000,
      long: Math.max(1, Math.min(120, parseInt(pmLongMin.value, 10) || 15)) * 60 * 1000,
      interval: Math.max(2, Math.min(12, parseInt(pmLongInterval.value, 10) || 4))
    };
  }

  function pmUpdate() {
    var total = Math.ceil(pm.remaining / 1000);
    var m = Math.floor(total / 60); var s = total % 60;
    pmDisplay.textContent = pad2(m) + ':' + pad2(s);

    if (pm.total > 0) {
      var progress = Math.max(0, Math.min(1, pm.remaining / pm.total));
      pmProgress.style.strokeDashoffset = String(C * (1 - progress));
    } else {
      pmProgress.style.strokeDashoffset = String(C);
    }

    var label;
    if (pm.mode === 'work') label = '专注时间';
    else if (pm.mode === 'short-break') label = '短休息';
    else label = '长休息';
    pmStatus.textContent = label;

    // 更新标题
    if (pm.running || pm.remaining > 0) {
      document.title = label + ' ' + pad2(m) + ':' + pad2(s) + ' · ' + originalTitle;
    } else {
      document.title = originalTitle;
    }
  }

  function pmStopTimer() {
    if (pm.timer) { clearInterval(pm.timer); pm.timer = null; }
    pm.running = false;
  }

  function pmStartTimer() {
    pm.endTime = Date.now() + pm.remaining;
    pm.running = true;
    pmStart.textContent = '暂停';
    pmSkip.disabled = false;
    if (pm.timer) clearInterval(pm.timer);
    pm.timer = setInterval(function () {
      pm.remaining = Math.max(0, pm.endTime - Date.now());
      pmUpdate();
      if (pm.remaining === 0) {
        pmStopTimer();
        pmOnPhaseComplete();
      }
    }, 100);
    pmUpdate();
  }

  function pmOnPhaseComplete() {
    playAlarm();
    sendNotification('番茄钟', (pm.mode === 'work' ? '专注结束，休息一下' : '休息结束，继续工作'));
    startFlashTitle(pm.mode === 'work' ? '专注结束' : '休息结束');

    var today = getDayStats(todayStr());
    var cfg = pmGetConfig();

    if (pm.mode === 'work') {
      today.pomodoro.workCount++;
      today.pomodoro.workSeconds += Math.round(cfg.work / 1000);
      saveStats();
      pmRenderToday();
      pm.cycleCount++;
      if (pm.cycleCount >= cfg.interval) {
        pm.mode = 'long-break';
        pm.total = cfg.long;
        pm.remaining = cfg.long;
      } else {
        pm.mode = 'short-break';
        pm.total = cfg.short;
        pm.remaining = cfg.short;
      }
      showToast('🎉 专注完成！' + (pm.mode === 'long-break' ? '进入长休息' : '休息 ' + Math.round(cfg.short / 60000) + ' 分钟'));
    } else {
      today.pomodoro.breakCount++;
      today.pomodoro.breakSeconds += Math.round(pm.total / 1000);
      saveStats();
      if (pm.mode === 'long-break') pm.cycleCount = 0;
      pm.mode = 'work';
      pm.total = cfg.work;
      pm.remaining = cfg.work;
      showToast('☕ 休息结束，开始专注');
    }

    pmUpdate();
    // 自动开始下一阶段
    pmStartTimer();
  }

  function pmRenderToday() {
    var today = getDayStats(todayStr());
    $('pm-today-count').textContent = today.pomodoro.workCount;
    $('pm-today-min').textContent = Math.floor(today.pomodoro.workSeconds / 60);
  }

  pmStart.addEventListener('click', function () {
    var ctx = getAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume();
    if (pm.running) {
      pm.remaining = Math.max(0, pm.endTime - Date.now());
      pmStopTimer();
      pmStart.textContent = '继续';
      pmSkip.disabled = true;
      return;
    }
    if (pm.remaining <= 0) {
      var cfg = pmGetConfig();
      pm.mode = 'work';
      pm.total = cfg.work;
      pm.remaining = cfg.work;
    }
    pmStartTimer();
  });

  pmSkip.addEventListener('click', function () {
    if (!pm.running && pm.remaining === 0) return;
    pmStopTimer();
    pm.remaining = 0;
    pmOnPhaseComplete();
  });

  pmReset.addEventListener('click', function () {
    pmStopTimer();
    var cfg = pmGetConfig();
    pm.mode = 'work';
    pm.total = cfg.work;
    pm.remaining = cfg.work;
    pm.cycleCount = 0;
    pmStart.textContent = '开始专注';
    pmSkip.disabled = true;
    pmUpdate();
    document.title = originalTitle;
  });

  // 配置变更
  [pmWorkMin, pmShortMin, pmLongMin, pmLongInterval].forEach(function (el) {
    el.addEventListener('change', function () {
      if (!pm.running && pm.mode === 'work') {
        var cfg = pmGetConfig();
        pm.total = cfg.work;
        pm.remaining = cfg.work;
        pmUpdate();
      }
    });
  });

  // 初始化
  (function () {
    var cfg = pmGetConfig();
    pm.total = cfg.work;
    pm.remaining = cfg.work;
    pmUpdate();
    pmRenderToday();
  })();

  /* ================= 5. 统计 ================= */
  function renderStats() {
    var today = getDayStats(todayStr());
    var summary = $('stat-summary');

    var tiles = [
      { label: '今日久坐轮次', value: today.sit.rounds, unit: '轮' },
      { label: '今日坐/站/动', value: Math.floor(today.sit.sitSeconds / 60) + '/' + Math.floor(today.sit.standSeconds / 60) + '/' + Math.floor(today.sit.moveSeconds / 60), unit: '分' },
      { label: '今日番茄数', value: today.pomodoro.workCount, unit: '个' },
      { label: '今日专注', value: Math.floor(today.pomodoro.workSeconds / 60), unit: '分' },
      { label: '今日休息', value: Math.floor(today.pomodoro.breakSeconds / 60), unit: '分' }
    ];

    summary.innerHTML = tiles.map(function (t) {
      return '<div class="stat-tile">' +
        '<div class="stat-tile-label">' + t.label + '</div>' +
        '<div class="stat-tile-value">' + t.value + '<small>' + (t.unit || '') + '</small></div>' +
        '</div>';
    }).join('');

    drawWeekChart();
  }

  function drawWeekChart() {
    var canvas = $('stat-chart');
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 600;
    var H = canvas.clientHeight || 220;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 取最近 7 天数据
    var days = [];
    var now = new Date();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var ds = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      var s = stats.days[ds] || { pomodoro: { workCount: 0 } };
      days.push({
        date: ds,
        label: (d.getMonth() + 1) + '/' + d.getDate(),
        count: s.pomodoro.workCount || 0
      });
    }

    var maxVal = Math.max(5, days.reduce(function (m, d) { return Math.max(m, d.count); }, 0));
    var padding = { top: 20, right: 16, bottom: 32, left: 40 };
    var chartW = W - padding.left - padding.right;
    var chartH = H - padding.top - padding.bottom;
    var barW = chartW / days.length * 0.6;
    var gap = chartW / days.length;

    // 网格线
    var isDark = document.body.classList.contains('theme-dark');
    var gridColor = isDark ? '#3d362c' : '#ddcfb3';
    var textColor = isDark ? '#8a7a5f' : '#a0947c';
    var barColor = isDark ? '#d4a05f' : '#8a5a2b';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var g = 0; g <= 4; g++) {
      var y = padding.top + (chartH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      var val = Math.round(maxVal * (1 - g / 4));
      ctx.fillStyle = textColor;
      ctx.fillText(String(val), padding.left - 6, y);
    }

    // 柱子
    days.forEach(function (d, i) {
      var x = padding.left + gap * i + (gap - barW) / 2;
      var h = maxVal > 0 ? (d.count / maxVal) * chartH : 0;
      var y = padding.top + chartH - h;
      ctx.fillStyle = barColor;
      ctx.globalAlpha = d.count > 0 ? 0.85 : 0.2;
      ctx.beginPath();
      var r = 4;
      if (h > r * 2) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      } else {
        ctx.rect(x, y, barW, h);
      }
      ctx.fill();
      ctx.globalAlpha = 1;

      // 数值
      if (d.count > 0) {
        ctx.fillStyle = barColor;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(d.count), x + barW / 2, y - 3);
      }

      // 日期
      ctx.fillStyle = textColor;
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(d.label, x + barW / 2, padding.top + chartH + 8);
    });

    // 今天高亮
    var lastIdx = days.length - 1;
    var lx = padding.left + gap * lastIdx + (gap - barW) / 2;
    var lh = maxVal > 0 ? (days[lastIdx].count / maxVal) * chartH : 0;
    var ly = padding.top + chartH - lh;
    ctx.strokeStyle = isDark ? '#e0b04a' : '#a8452a';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    if (lh > 2) {
      ctx.strokeRect(lx - 1, ly - 1, barW + 2, lh + 2);
    }
    ctx.setLineDash([]);
  }

  $('stat-export').addEventListener('click', function () {
    var keys = Object.keys(stats.days).sort();
    if (keys.length === 0) { showToast('没有统计数据'); return; }
    var lines = ['日期,久坐轮次,坐(分),站(分),动(分),番茄数,专注(分),休息(分)'];
    keys.forEach(function (k) {
      var s = stats.days[k];
      lines.push([
        k,
        s.sit.rounds || 0,
        Math.floor((s.sit.sitSeconds || 0) / 60),
        Math.floor((s.sit.standSeconds || 0) / 60),
        Math.floor((s.sit.moveSeconds || 0) / 60),
        s.pomodoro.workCount || 0,
        Math.floor((s.pomodoro.workSeconds || 0) / 60),
        Math.floor((s.pomodoro.breakSeconds || 0) / 60)
      ].join(','));
    });
    var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'stats-' + todayStr() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📤 已导出 CSV');
  });

  $('stat-clear').addEventListener('click', function () {
    if (!confirm('清空所有历史统计？此操作不可撤销')) return;
    stats = { days: {} };
    saveStats();
    renderStats();
    srRenderToday();
    pmRenderToday();
    showToast('🗑 统计已清空');
  });

  /* ================= 6. 窗口尺寸变化重绘图表 ================= */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!document.querySelector('#panel-stats.active')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawWeekChart, 200);
  });

})();