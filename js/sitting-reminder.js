(function () {
  var PHASES = [
    { key: 'sit',   label: '坐下', emoji: '🪑' },
    { key: 'move',  label: '活动', emoji: '🚶' },
    { key: 'stand', label: '站立', emoji: '🧍' }
  ];
  var DEFAULTS = { sit: 40, move: 3, stand: 20 };
  var R = 45;
  var C = 2 * Math.PI * R;
  var STORAGE_KEY = 'sitting-reminder-durations';
  var BASE_TITLE = document.title;

  var durations = Object.assign({}, DEFAULTS);
  var currentIndex = 0;
  var state = 'idle'; // idle | running | paused
  var remainingMs = 0;
  var endTime = 0;
  var timer = null;
  var audioCtx = null;
  var flashTimer = null;
  var flashStopTimer = null;
  var lastHiddenTitle = '';
  var volume = 0.7;
  var customAudioUrl = null;
  var customAudioEl = null;

  var cards = Array.prototype.slice.call(document.querySelectorAll('.sr-card'));
  var inputs = Array.prototype.slice.call(document.querySelectorAll('.sr-label input'));
  var statusEl = document.getElementById('sr-status');
  var btnStart = document.getElementById('btn-start');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    PHASES.forEach(function (p) {
      if (typeof saved[p.key] === 'number' && saved[p.key] >= 0) {
        durations[p.key] = saved[p.key];
        var input = inputs.find(function (i) { return i.dataset.phase === p.key; });
        if (input) input.value = String(saved[p.key]);
      }
    });
  } catch (e) { /* 忽略损坏数据 */ }

  document.querySelectorAll('.sr-ring-progress').forEach(function (el) {
    el.style.strokeDasharray = String(C);
    el.style.strokeDashoffset = '0';
  });

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
    var peak = Math.max(0.0001, volume * 0.4); // volume=0.7 时峰值 0.28，与旧版一致
    var now = ctx.currentTime;
    [0, 0.3].forEach(function (offset) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var t = now + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  function playChime() {
    if (customAudioEl) {
      try {
        customAudioEl.currentTime = 0;
        customAudioEl.volume = volume;
        var p = customAudioEl.play();
        if (p && p.catch) {
          p.catch(function () { playDefaultChime(); });
        }
        return;
      } catch (e) {
        // 播放失败时回退到默认蜂鸣
      }
    }
    playDefaultChime();
  }

  function fmt(ms) {
    var total = Math.ceil(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function readInputs() {
    inputs.forEach(function (input) {
      var key = input.dataset.phase;
      var v = Math.max(0, Math.min(999, parseInt(input.value, 10) || 0));
      durations[key] = v;
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(durations)); } catch (e) {}
  }

  function firstNonZero() {
    for (var i = 0; i < PHASES.length; i++) {
      if (durations[PHASES[i].key] > 0) return i;
    }
    return -1;
  }

  function nextNonZero(from) {
    for (var i = 1; i <= PHASES.length; i++) {
      var idx = (from + i) % PHASES.length;
      if (durations[PHASES[idx].key] > 0) return idx;
    }
    return -1;
  }

  function stopFlash() {
    if (flashTimer !== null) { clearInterval(flashTimer); flashTimer = null; }
    if (flashStopTimer !== null) { clearTimeout(flashStopTimer); flashStopTimer = null; }
  }

  function restoreTitle() {
    if (document.hidden && state === 'running') {
      var p = PHASES[currentIndex];
      var t = p.emoji + ' ' + p.label + ' ' + fmt(remainingMs);
      if (t !== lastHiddenTitle) {
        lastHiddenTitle = t;
        document.title = t;
      }
    } else {
      document.title = BASE_TITLE;
    }
  }

  function flashTitle(message) {
    stopFlash();
    var on = false;
    flashTimer = window.setInterval(function () {
      document.title = on ? message : BASE_TITLE;
      on = !on;
    }, 600);
    flashStopTimer = window.setTimeout(function () {
      stopFlash();
      lastHiddenTitle = '';
      restoreTitle();
    }, 12000);
  }

  function updateRing(index, remaining, duration) {
    var card = cards[index];
    var circle = card.querySelector('.sr-ring-progress');
    var timeEl = card.querySelector('.sr-time');
    var totalMs = duration * 60000;
    var progress = totalMs > 0 ? Math.max(0, Math.min(1, remaining / totalMs)) : 0;
    circle.style.strokeDashoffset = String(C * (1 - progress));
    timeEl.textContent = duration > 0 ? fmt(remaining) : '跳过';
  }

  function render() {
    PHASES.forEach(function (p, i) {
      var dur = durations[p.key];
      var isCurrent = state !== 'idle' && i === currentIndex;
      updateRing(i, isCurrent ? remainingMs : dur * 60000, dur);
      cards[i].classList.toggle('active', isCurrent);
      cards[i].classList.toggle('dimmed', state !== 'idle' && !isCurrent);
    });

    if (state === 'idle') {
      statusEl.textContent = '';
      statusEl.classList.remove('warn');
    } else {
      var p = PHASES[currentIndex];
      var label = state === 'paused' ? '已暂停' : '进行中';
      statusEl.textContent = p.emoji + ' ' + p.label + ' · ' + label + ' · 剩余 ' + fmt(remainingMs);
      statusEl.classList.remove('warn');
    }

    btnStart.disabled = state === 'running';
    btnPause.disabled = state !== 'running';
    btnStop.disabled = state === 'idle';
    inputs.forEach(function (i) { i.disabled = state !== 'idle'; });
  }

  function tick() {
    if (state !== 'running') return;
    remainingMs = Math.max(0, endTime - Date.now());

    if (remainingMs <= 0) {
      onPhaseDone();
      return;
    }

    updateRing(currentIndex, remainingMs, durations[PHASES[currentIndex].key]);

    if (!document.hidden) {
      var p = PHASES[currentIndex];
      statusEl.textContent = p.emoji + ' ' + p.label + ' · 进行中 · 剩余 ' + fmt(remainingMs);
    } else if (flashTimer === null) {
      restoreTitle();
    }
  }

  function onPhaseDone() {
    playChime();

    var next = nextNonZero(currentIndex);
    if (next === -1) {
      stopAll();
      statusEl.textContent = '所有阶段都已结束';
      statusEl.classList.add('warn');
      flashTitle('✅ 全部完成');
      return;
    }

    currentIndex = next;
    remainingMs = durations[PHASES[currentIndex].key] * 60000;
    endTime = Date.now() + remainingMs;
    var p = PHASES[currentIndex];

    flashTitle('🔔 该' + p.label + '了');
    render();
    tick();
  }

  function start() {
    readInputs();
    if (firstNonZero() === -1) {
      statusEl.textContent = '未设置任何时间，请至少给一个阶段设置大于 0 的分钟数。';
      statusEl.classList.add('warn');
      return;
    }

    var ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();

    if (state === 'idle') {
      currentIndex = firstNonZero();
      remainingMs = durations[PHASES[currentIndex].key] * 60000;
    }
    endTime = Date.now() + remainingMs;
    state = 'running';
    stopFlash();
    document.title = BASE_TITLE;
    lastHiddenTitle = '';
    if (timer !== null) clearInterval(timer);
    timer = window.setInterval(tick, 100);
    render();
    tick();
  }

  function pause() {
    if (state !== 'running') return;
    remainingMs = Math.max(0, endTime - Date.now());
    state = 'paused';
    if (timer !== null) { clearInterval(timer); timer = null; }
    stopFlash();
    document.title = BASE_TITLE;
    render();
  }

  function stopAll() {
    state = 'idle';
    if (timer !== null) { clearInterval(timer); timer = null; }
    stopFlash();
    document.title = BASE_TITLE;
    lastHiddenTitle = '';
    readInputs();
    currentIndex = firstNonZero();
    if (currentIndex === -1) currentIndex = 0;
    remainingMs = durations[PHASES[currentIndex].key] * 60000;
    render();
  }

  btnStart.addEventListener('click', start);
  btnPause.addEventListener('click', pause);
  btnStop.addEventListener('click', stopAll);

  inputs.forEach(function (input) {
    input.addEventListener('input', function () {
      if (state !== 'idle') return;
      readInputs();
      render();
    });
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      stopFlash();
      lastHiddenTitle = '';
      document.title = BASE_TITLE;
      if (state === 'running') tick();
    } else if (state === 'running' && flashTimer === null) {
      restoreTitle();
    }
  });

  // ---------- 闹铃设置 ----------
  var volumeInput = document.getElementById('sr-volume');
  var volumeVal = document.getElementById('sr-volume-val');
  var fileInput = document.getElementById('sr-audio-file');
  var audioNameEl = document.getElementById('sr-audio-name');
  var clearBtn = document.getElementById('sr-audio-clear');

  volumeInput.addEventListener('input', function () {
    volume = parseInt(volumeInput.value, 10) / 100;
    volumeVal.textContent = volumeInput.value + '%';
    if (customAudioEl) customAudioEl.volume = volume;
  });

  function clearCustomAudio(showMsg) {
    if (customAudioUrl) {
      URL.revokeObjectURL(customAudioUrl);
      customAudioUrl = null;
    }
    customAudioEl = null;
    fileInput.value = '';
    audioNameEl.textContent = '';
    clearBtn.hidden = true;
    if (showMsg) {
      statusEl.textContent = '已恢复默认铃声。';
      statusEl.classList.remove('warn');
    }
  }

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      statusEl.textContent = '文件超过 5MB，请选择更小的音频。';
      statusEl.classList.add('warn');
      fileInput.value = '';
      return;
    }

    if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
    customAudioUrl = URL.createObjectURL(file);
    customAudioEl = new Audio(customAudioUrl);
    customAudioEl.volume = volume;

    customAudioEl.addEventListener('loadedmetadata', function () {
      if (customAudioEl.duration > 30) {
        statusEl.textContent = '音频超过 30 秒，请选择更短的铃声。';
        statusEl.classList.add('warn');
        clearCustomAudio(false);
        return;
      }
      audioNameEl.textContent = file.name;
      clearBtn.hidden = false;
      statusEl.textContent = '自定义铃声已就绪，下次阶段切换时会播放。';
      statusEl.classList.remove('warn');
    }, { once: true });

    customAudioEl.addEventListener('error', function () {
      statusEl.textContent = '无法播放该音频，请换一个浏览器支持的格式（如 mp3 / wav / ogg）。';
      statusEl.classList.add('warn');
      clearCustomAudio(false);
    }, { once: true });
  });

  clearBtn.addEventListener('click', function () {
    clearCustomAudio(true);
  });

  render();
})();