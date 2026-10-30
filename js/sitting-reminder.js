(function () {
  // ================= Tab 切换 =================
  var tabs = document.querySelectorAll('.tt-tab');
  var panels = document.querySelectorAll('.tt-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. 久坐循环 (原逻辑) =================
  var PHASES = [
    { key: 'sit',   label: '坐下', emoji: '🪑' },
    { key: 'move',  label: '活动', emoji: '🚶' },
    { key: 'stand', label: '站立', emoji: '🧍' }
  ];
  var DEFAULTS = { sit: 40, move: 3, stand: 20 };
  var R = 45;
  var C = 2 * Math.PI * R;
  var STORAGE_KEY = 'sitting-reminder-durations';
  
  var durations = Object.assign({}, DEFAULTS);
  var srIndex = 0;
  var srState = 'idle';
  var srRemaining = 0;
  var srEndTime = 0;
  var srTimer = null;
  var srAudioCtx = null;
  var srFlashTimer = null;
  var srLastHiddenTitle = '';

  var cards = document.querySelectorAll('.sr-card');
  var inputs = document.querySelectorAll('.sr-label input');
  var srStatus = document.getElementById('sr-status');
  var btnStart = document.getElementById('btn-start');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    PHASES.forEach(function (p) {
      if (typeof saved[p.key] === 'number') {
        durations[p.key] = saved[p.key];
        var input = Array.from(inputs).find(function (i) { return i.dataset.phase === p.key; });
        if (input) input.value = saved[p.key];
      }
    });
  } catch (e) {}

  document.querySelectorAll('.sr-ring-progress').forEach(function (el) {
    el.style.strokeDasharray = String(C);
    el.style.strokeDashoffset = '0';
  });

  function srGetAudioCtx() {
    if (!srAudioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) srAudioCtx = new AC(); }
    return srAudioCtx;
  }

  function srPlayChime() {
    var ctx = srGetAudioCtx(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var now = ctx.currentTime;
    [0, 0.3].forEach(function (offset) {
      var osc = ctx.createOscillator(); var gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 880;
      osc.connect(gain); gain.connect(ctx.destination);
      var t = now + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t); osc.stop(t + 0.22);
    });
  }

  function srFmt(ms) {
    var total = Math.ceil(ms / 1000);
    var m = Math.floor(total / 60); var s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function srReadInputs() {
    inputs.forEach(function (input) {
      durations[input.dataset.phase] = Math.max(0, parseInt(input.value, 10) || 0);
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(durations)); } catch (e) {}
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
      srStatus.textContent = PHASES[srIndex].emoji + ' ' + PHASES[srIndex].label + ' · ' + (srState === 'paused' ? '已暂停' : '进行中') + ' · 剩余 ' + srFmt(srRemaining);
    }
    btnStart.disabled = srState === 'running';
    btnPause.disabled = srState !== 'running';
    btnStop.disabled = srState === 'idle';
    inputs.forEach(function (i) { i.disabled = srState !== 'idle'; });
  }

  function srTick() {
    if (srState !== 'running') return;
    srRemaining = Math.max(0, srEndTime - Date.now());
    if (srRemaining <= 0) { srOnDone(); return; }
    srUpdateRing(srIndex, srRemaining, durations[PHASES[srIndex].key]);
    srStatus.textContent = PHASES[srIndex].emoji + ' ' + PHASES[srIndex].label + ' · 进行中 · 剩余 ' + srFmt(srRemaining);
  }

  function srOnDone() {
    srPlayChime();
    var next = srNextNonZero(srIndex);
    if (next === -1) { srStop(); srStatus.textContent = '所有阶段都已结束'; return; }
    srIndex = next;
    srRemaining = durations[PHASES[srIndex].key] * 60000;
    srEndTime = Date.now() + srRemaining;
    srRender(); srTick();
  }

  window.srStart = function() {
    srReadInputs();
    if (srFirstNonZero() === -1) { srStatus.textContent = '未设置任何时间。'; return; }
    var ctx = srGetAudioCtx(); if (ctx && ctx.state === 'suspended') ctx.resume();
    if (srState === 'idle') { srIndex = srFirstNonZero(); srRemaining = durations[PHASES[srIndex].key] * 60000; }
    srEndTime = Date.now() + srRemaining; srState = 'running';
    if (srTimer) clearInterval(srTimer);
    srTimer = setInterval(srTick, 100);
    srRender(); srTick();
  };

  btnStart.addEventListener('click', srStart);

  btnPause.addEventListener('click', function () {
    if (srState !== 'running') return;
    srRemaining = Math.max(0, srEndTime - Date.now()); srState = 'paused';
    if (srTimer) clearInterval(srTimer);
    srRender();
  });

  function srStop() {
    srState = 'idle'; if (srTimer) clearInterval(srTimer);
    srReadInputs(); srIndex = srFirstNonZero(); if (srIndex === -1) srIndex = 0;
    srRemaining = durations[PHASES[srIndex].key] * 60000; srRender();
  }
  btnStop.addEventListener('click', srStop);

  inputs.forEach(function (input) {
    input.addEventListener('input', function () { if (srState === 'idle') { srReadInputs(); srRender(); } });
  });
  srRender();


  // ================= 2. 秒表 =================
  var swDisplay = document.getElementById('sw-display');
  var swStart = document.getElementById('sw-start');
  var swLap = document.getElementById('sw-lap');
  var swReset = document.getElementById('sw-reset');
  var swLapsList = document.getElementById('sw-laps');
  
  var swTime = 0;
  var swRunning = false;
  var swTimer = null;
  var swLastLap = 0;

  function swUpdate() {
    var ms = swTime % 1000;
    var s = Math.floor(swTime / 1000) % 60;
    var m = Math.floor(swTime / 60000);
    swDisplay.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(Math.floor(ms/10)).padStart(2, '0');
  }

  swStart.addEventListener('click', function () {
    if (swRunning) {
      swRunning = false; clearInterval(swTimer);
      swStart.textContent = '继续'; swStart.classList.remove('danger');
      swLap.disabled = true;
    } else {
      swRunning = true;
      var startTime = Date.now() - swTime;
      swTimer = setInterval(function () {
        swTime = Date.now() - startTime; swUpdate();
      }, 30);
      swStart.textContent = '暂停'; swStart.classList.add('danger');
      swLap.disabled = false; swReset.disabled = false;
    }
  });

  swLap.addEventListener('click', function () {
    var lapTime = swTime - swLastLap;
    swLastLap = swTime;
    var li = document.createElement('li');
    var ms = lapTime % 1000;
    var s = Math.floor(lapTime / 1000) % 60;
    var m = Math.floor(lapTime / 60000);
    var timeStr = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(Math.floor(ms/10)).padStart(2, '0');
    li.innerHTML = '<span>计次 ' + (swLapsList.children.length + 1) + '</span><span>+' + timeStr + '</span>';
    swLapsList.insertBefore(li, swLapsList.firstChild);
  });

  swReset.addEventListener('click', function () {
    swRunning = false; clearInterval(swTimer);
    swTime = 0; swLastLap = 0; swUpdate();
    swStart.textContent = '开始'; swStart.classList.remove('danger');
    swLap.disabled = true; swReset.disabled = true;
    swLapsList.innerHTML = '';
  });


  // ================= 3. 倒计时 =================
  var cdDisplay = document.getElementById('cd-display');
  var cdMin = document.getElementById('cd-min');
  var cdSec = document.getElementById('cd-sec');
  var cdStart = document.getElementById('cd-start');
  var cdPause = document.getElementById('cd-pause');
  var cdReset = document.getElementById('cd-reset');

  var cdTime = 0;
  var cdEndTime = 0;
  var cdTimer = null;
  var cdRunning = false;

  function cdUpdate() {
    var total = Math.ceil(cdTime / 1000);
    var m = Math.floor(total / 60); var s = total % 60;
    cdDisplay.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  cdStart.addEventListener('click', function () {
    if (!cdRunning) {
      if (cdTime <= 0) {
        var m = parseInt(cdMin.value, 10) || 0;
        var s = parseInt(cdSec.value, 10) || 0;
        if (m === 0 && s === 0) return alert('请设置倒计时时间');
        cdTime = (m * 60 + s) * 1000;
      }
      cdRunning = true;
      cdEndTime = Date.now() + cdTime;
      cdStart.disabled = true; cdPause.disabled = false;
      
      cdTimer = setInterval(function() {
        cdTime = Math.max(0, cdEndTime - Date.now());
        cdUpdate();
        if (cdTime === 0) {
          clearInterval(cdTimer); cdRunning = false;
          cdStart.disabled = false; cdPause.disabled = true;
          srPlayChime(); alert('倒计时结束！');
        }
      }, 100);
    }
  });

  cdPause.addEventListener('click', function () {
    cdRunning = false; clearInterval(cdTimer);
    cdStart.disabled = false; cdPause.disabled = true;
  });

  cdReset.addEventListener('click', function () {
    cdRunning = false; clearInterval(cdTimer); cdTime = 0;
    cdStart.disabled = false; cdPause.disabled = true;
    cdUpdate();
  });


  // ================= 4. 番茄钟 =================
  var pmDisplay = document.getElementById('pm-display');
  var pmStatus = document.getElementById('pm-status');
  var pmStart = document.getElementById('pm-start');
  var pmReset = document.getElementById('pm-reset');

  var pmTime = 25 * 60 * 1000;
  var pmTimer = null;
  var pmRunning = false;
  var pmMode = 'work';
  var pmEndTime = 0;

  function pmUpdate() {
    var total = Math.ceil(pmTime / 1000);
    var m = Math.floor(total / 60); var s = total % 60;
    pmDisplay.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  pmStart.addEventListener('click', function () {
    if (pmRunning) {
      pmRunning = false; clearInterval(pmTimer);
      pmStart.textContent = '继续';
    } else {
      pmRunning = true;
      pmEndTime = Date.now() + pmTime;
      pmStart.textContent = '暂停';
      
      pmTimer = setInterval(function() {
        pmTime = Math.max(0, pmEndTime - Date.now());
        pmUpdate();
        if (pmTime === 0) {
          clearInterval(pmTimer); pmRunning = false;
          pmStart.textContent = '开始';
          srPlayChime(); alert('时间到！');
          pmMode = pmMode === 'work' ? 'break' : 'work';
          pmTime = (pmMode === 'work' ? 25 : 5) * 60 * 1000;
          pmStatus.textContent = pmMode === 'work' ? '专注时间' : '休息时间';
          pmUpdate();
        }
      }, 100);
    }
  });

  pmReset.addEventListener('click', function () {
    pmRunning = false; clearInterval(pmTimer);
    pmTime = 25 * 60 * 1000; pmMode = 'work';
    pmStatus.textContent = '专注时间'; pmStart.textContent = '开始专注';
    pmUpdate();
  });

  pmUpdate();
})();