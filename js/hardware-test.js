(function () {
  'use strict';

  // ============================================================
  // 0. 通用
  // ============================================================
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function fmt(ms) { return ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(2) + ' s'; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function nowStr() {
    var d = new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '.' + ('00' + d.getMilliseconds()).slice(-3);
  }

  // ============================================================
  // 1. Tab 切换
  // ============================================================
  var tabs = $all('.ht-tab');
  var panels = $all('.ht-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      this.classList.add('active');
      var tgt = document.getElementById(this.dataset.target);
      if (tgt) tgt.classList.add('active');
    });
  });

  // ============================================================
  // 2. 键盘测试
  // ============================================================
  var keyEls = $all('.key');
  var KEY_TOTAL = keyEls.length;
  var testedKeys = new Set();
  var lastDownTime = 0;
  var keyLog = [];
  var blockedCodes = ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                      'Backspace', 'F1', 'F3', 'F5', 'F6', 'F11', 'F12'];

  var lastKeyEl   = $('#last-key');
  var infoCodeEl  = $('#info-code');
  var infoKeyEl   = $('#info-key');
  var infoKeycodeEl = $('#info-keycode');
  var infoIntervalEl = $('#info-interval');
  var keyCountEl  = $('#key-count');
  var keyTotalEl  = $('#key-total');
  var progressEl  = $('#ht-progress-bar');
  var keyLogEl    = $('#key-log');
  var lockCapsEl  = $('#lock-caps');
  var lockNumEl   = $('#lock-num');
  var lockScrollEl= $('#lock-scroll');

  if (keyTotalEl) keyTotalEl.textContent = KEY_TOTAL;

  function updateLockIndicators(e) {
    // getModifierState 在部分浏览器可用
    try {
      if (lockCapsEl)  lockCapsEl.classList.toggle('on',  !!e.getModifierState && e.getModifierState('CapsLock'));
      if (lockNumEl)   lockNumEl.classList.toggle('on',   !!e.getModifierState && e.getModifierState('NumLock'));
      if (lockScrollEl)lockScrollEl.classList.toggle('on',!!e.getModifierState && e.getModifierState('ScrollLock'));
    } catch (err) { /* ignore */ }
  }

  function pushKeyLog(evt) {
    keyLog.push(evt);
    if (keyLog.length > 12) keyLog.shift();
    keyLogEl.innerHTML = keyLog.map(function (l) {
      return '<div><span class="' + (l.type === 'down' ? 'ev-down' : 'ev-up') + '">' +
             (l.type === 'down' ? '↓' : '↑') + '</span> ' +
             '[' + l.time + '] ' +
             'key="' + l.key + '" code="' + l.code + '" keyCode=' + l.keyCode + '</div>';
    }).join('');
  }

  function handleKeyDown(e) {
    if (blockedCodes.indexOf(e.code) !== -1) e.preventDefault();

    var code = e.code || ('Key' + e.key);
    var now = Date.now();
    var interval = lastDownTime ? (now - lastDownTime) : 0;
    lastDownTime = now;

    var keyName = e.key === ' ' ? 'Space' : e.key;

    lastKeyEl.textContent = keyName;
    infoCodeEl.textContent = e.code || '—';
    infoKeyEl.textContent = keyName;
    infoKeycodeEl.textContent = (e.keyCode || e.which || '—');
    infoIntervalEl.textContent = interval ? interval + ' ms' : '—';

    updateLockIndicators(e);

    if (!testedKeys.has(code)) {
      testedKeys.add(code);
      keyCountEl.textContent = testedKeys.size;
      progressEl.style.width = (testedKeys.size / KEY_TOTAL * 100) + '%';
    }

    var keyEl = document.querySelector('.key[data-code="' + code + '"]');
    if (keyEl) keyEl.classList.add('active');

    pushKeyLog({ type: 'down', time: nowStr(), key: keyName, code: e.code || '—', keyCode: e.keyCode || e.which || '—' });
  }

  function handleKeyUp(e) {
    var code = e.code || ('Key' + e.key);
    var keyEl = document.querySelector('.key[data-code="' + code + '"]');
    if (keyEl) keyEl.classList.remove('active');

    var keyName = e.key === ' ' ? 'Space' : e.key;
    pushKeyLog({ type: 'up', time: nowStr(), key: keyName, code: e.code || '—', keyCode: e.keyCode || e.which || '—' });

    updateLockIndicators(e);
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  document.getElementById('btn-reset-keyboard').addEventListener('click', function () {
    testedKeys.clear();
    keyLog = [];
    lastDownTime = 0;
    keyCountEl.textContent = '0';
    progressEl.style.width = '0%';
    lastKeyEl.textContent = '无';
    infoCodeEl.textContent = '—';
    infoKeyEl.textContent = '—';
    infoKeycodeEl.textContent = '—';
    infoIntervalEl.textContent = '—';
    keyLogEl.innerHTML = '（无）';
    keyEls.forEach(function (k) { k.classList.remove('active'); });
    [lockCapsEl, lockNumEl, lockScrollEl].forEach(function (el) { el && el.classList.remove('on'); });
  });

  // ============================================================
  // 3. 鼠标测试
  // ============================================================
  var mousePanel       = document.getElementById('panel-mouse');
  var mouseLeftBtnEl   = document.getElementById('mouse-left');
  var mouseRightBtnEl  = document.getElementById('mouse-right');
  var mouseMiddleBtnEl = document.getElementById('mouse-middle');
  var mouseWheelEl     = document.getElementById('mouse-wheel');
  var mouseLeftCountEl = document.getElementById('mouse-left-count');
  var mouseRightCountEl= document.getElementById('mouse-right-count');
  var mouseMiddleCountEl = document.getElementById('mouse-middle-count');
  var mouseWheelCountEl= document.getElementById('mouse-wheel-count');
  var mousePosEl       = document.getElementById('mouse-pos');
  var mouseMovedEl     = document.getElementById('mouse-moved');

  var leftClicks = 0, rightClicks = 0, middleClicks = 0;
  var wheelUp = 0, wheelDown = 0;
  var movedDistance = 0;
  var lastMouseX = null, lastMouseY = null;
  var wheelTimer = null;

  function resetMouseVisual() {
    mouseLeftBtnEl.classList.remove('active');
    mouseRightBtnEl.classList.remove('active');
    mouseMiddleBtnEl && mouseMiddleBtnEl.classList.remove('active');
    mouseWheelEl.classList.remove('active');
  }

  mousePanel.addEventListener('mousedown', function (e) {
    if (e.button === 0) { mouseLeftBtnEl.classList.add('active'); leftClicks++; mouseLeftCountEl.textContent = leftClicks; }
    else if (e.button === 1) { mouseMiddleBtnEl && mouseMiddleBtnEl.classList.add('active'); middleClicks++; mouseMiddleCountEl.textContent = middleClicks; e.preventDefault(); }
    else if (e.button === 2) { mouseRightBtnEl.classList.add('active'); rightClicks++; mouseRightCountEl.textContent = rightClicks; e.preventDefault(); }
  });
  mousePanel.addEventListener('mouseup', function (e) {
    if (e.button === 0) mouseLeftBtnEl.classList.remove('active');
    else if (e.button === 1) mouseMiddleBtnEl && mouseMiddleBtnEl.classList.remove('active');
    else if (e.button === 2) mouseRightBtnEl.classList.remove('active');
  });
  mousePanel.addEventListener('mouseleave', resetMouseVisual);

  mousePanel.addEventListener('wheel', function (e) {
    if (e.deltaY < 0) wheelUp++; else if (e.deltaY > 0) wheelDown++;
    mouseWheelCountEl.textContent = wheelUp + ' / ' + wheelDown;
    mouseWheelEl.classList.add('active');
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { mouseWheelEl.classList.remove('active'); }, 220);
    e.preventDefault();
  }, { passive: false });

  mousePanel.addEventListener('mousemove', function (e) {
    var r = mousePanel.getBoundingClientRect();
    var x = Math.round(e.clientX - r.left);
    var y = Math.round(e.clientY - r.top);
    mousePosEl.textContent = x + ', ' + y;

    if (lastMouseX !== null) {
      var dx = x - lastMouseX;
      var dy = y - lastMouseY;
      var d = Math.sqrt(dx * dx + dy * dy);
      // 忽略跳变（例如从容器外移入）
      if (d < 200) {
        movedDistance += d;
        mouseMovedEl.textContent = Math.round(movedDistance) + ' px';
      }
    }
    lastMouseX = x;
    lastMouseY = y;
  });

  mousePanel.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // --- 双击测试 ---
  var dcArea         = document.getElementById('doubleclick-area');
  var clickCountEl   = document.getElementById('click-count');
  var clickStatusEl  = document.getElementById('click-status');
  var clickHistoryEl = document.getElementById('click-history');
  var dcMinEl        = document.getElementById('dc-min');
  var dcAvgEl        = document.getElementById('dc-avg');
  var dcStdEl        = document.getElementById('dc-std');

  var dcClicks = 0;
  var lastClickTime = 0;
  var dcIntervals = [];
  var dcTimer = null;

  function computeDcStats() {
    if (dcIntervals.length === 0) {
      dcMinEl.textContent = '—';
      dcAvgEl.textContent = '—';
      dcStdEl.textContent = '—';
      return;
    }
    var min = Math.min.apply(null, dcIntervals);
    var sum = dcIntervals.reduce(function (a, b) { return a + b; }, 0);
    var avg = sum / dcIntervals.length;
    var variance = dcIntervals.reduce(function (a, b) { return a + (b - avg) * (b - avg); }, 0) / dcIntervals.length;
    var std = Math.sqrt(variance);
    dcMinEl.textContent = Math.round(min) + ' ms';
    dcAvgEl.textContent = Math.round(avg) + ' ms';
    dcStdEl.textContent = Math.round(std) + ' ms';
  }

  dcArea.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var now = Date.now();
    dcClicks++;
    clickCountEl.textContent = dcClicks;

    if (lastClickTime === 0) {
      clickStatusEl.textContent = '第一次点击';
      clickStatusEl.style.color = '#8a7a5f';
    } else {
      var diff = now - lastClickTime;
      dcIntervals.push(diff);
      if (dcIntervals.length > 50) dcIntervals.shift();
      computeDcStats();
      clickHistoryEl.textContent = '间隔 ' + diff + ' ms (共记录 ' + dcIntervals.length + ' 次)';

      if (diff < 80) {
        clickStatusEl.textContent = '⚠️ 极快双击 (或连击)';
        clickStatusEl.style.color = '#e74c3c';
      } else if (diff <= 300) {
        clickStatusEl.textContent = '✅ 正常双击';
        clickStatusEl.style.color = '#7ba05b';
      } else {
        clickStatusEl.textContent = '两次独立单击';
        clickStatusEl.style.color = '#8a7a5f';
      }
    }
    lastClickTime = now;
    clearTimeout(dcTimer);
    dcTimer = setTimeout(function () {
      clickStatusEl.textContent = '等待点击…';
      clickStatusEl.style.color = '#7ba05b';
      lastClickTime = 0;
      clickHistoryEl.textContent = '';
    }, 1500);
  });

  document.getElementById('btn-reset-mouse').addEventListener('click', function () {
    leftClicks = rightClicks = middleClicks = 0;
    wheelUp = wheelDown = 0;
    movedDistance = 0;
    dcClicks = 0;
    dcIntervals = [];
    lastClickTime = 0;
    lastMouseX = lastMouseY = null;

    mouseLeftCountEl.textContent = '0';
    mouseRightCountEl.textContent = '0';
    mouseMiddleCountEl.textContent = '0';
    mouseWheelCountEl.textContent = '0 / 0';
    mousePosEl.textContent = '—';
    mouseMovedEl.textContent = '0 px';
    clickCountEl.textContent = '0';
    clickStatusEl.textContent = '等待点击…';
    clickStatusEl.style.color = '#7ba05b';
    clickHistoryEl.textContent = '';
    computeDcStats();
    resetMouseVisual();
  });

  // ============================================================
  // 4. 屏幕坏点测试
  // ============================================================
  var fullscreenOverlay = document.getElementById('fullscreen-overlay');
  var colorBlocks       = $all('.color-block');
  var autoplayChk       = document.getElementById('opt-autoplay');

  var fsColors = colorBlocks.map(function (el) {
    return { key: el.dataset.color, name: el.dataset.name || el.textContent.trim() };
  });
  var fsIndex = 0;
  var fsTimer = null;
  var isOverlayOpen = false;

  function applyColorToOverlay(key) {
    // 清除特殊类
    fullscreenOverlay.classList.remove('checker', 'grid', 'grayscale', 'rainbow');
    var motion = fullscreenOverlay.querySelector('.fs-motion-box');
    if (motion) motion.remove();

    if (key === '__checker__') {
      fullscreenOverlay.style.background = '';
      fullscreenOverlay.classList.add('checker');
    } else if (key === '__grid__') {
      fullscreenOverlay.style.background = '';
      fullscreenOverlay.classList.add('grid');
    } else if (key === '__grayscale__') {
      fullscreenOverlay.style.background = '';
      fullscreenOverlay.classList.add('grayscale');
    } else if (key === '__rainbow__') {
      fullscreenOverlay.style.background = '';
      fullscreenOverlay.classList.add('rainbow');
    } else if (key === '__motion__') {
      fullscreenOverlay.style.background = '#333';
      var box = document.createElement('div');
      box.className = 'fs-motion-box';
      fullscreenOverlay.appendChild(box);
    } else {
      fullscreenOverlay.style.background = key;
    }

    // 提示条
    var hint = fullscreenOverlay.querySelector('.fs-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'fs-hint';
      fullscreenOverlay.appendChild(hint);
    }
    hint.textContent = '点击 / 空格：下一色 · Esc：退出';
  }

  function openOverlay(index) {
    fsIndex = index;
    var item = fsColors[fsIndex];
    applyColorToOverlay(item.key);
    fullscreenOverlay.style.display = 'block';
    isOverlayOpen = true;

    if (fullscreenOverlay.requestFullscreen) {
      fullscreenOverlay.requestFullscreen().catch(function () {});
    } else if (fullscreenOverlay.webkitRequestFullscreen) {
      fullscreenOverlay.webkitRequestFullscreen();
    }

    if (autoplayChk && autoplayChk.checked) startAutoplay();
  }

  function closeOverlay() {
    stopAutoplay();
    fullscreenOverlay.style.display = 'none';
    isOverlayOpen = false;
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  }

  function nextColor() {
    fsIndex = (fsIndex + 1) % fsColors.length;
    applyColorToOverlay(fsColors[fsIndex].key);
  }

  function startAutoplay() {
    stopAutoplay();
    fsTimer = setInterval(nextColor, 3000);
  }
  function stopAutoplay() {
    if (fsTimer) { clearInterval(fsTimer); fsTimer = null; }
  }

  colorBlocks.forEach(function (block, i) {
    block.addEventListener('click', function () { openOverlay(i); });
  });

  fullscreenOverlay.addEventListener('click', function (e) {
    // 避免点到 hint 也触发
    nextColor();
  });

  document.addEventListener('keydown', function (e) {
    if (!isOverlayOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); }
    else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextColor();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      fsIndex = (fsIndex - 1 + fsColors.length) % fsColors.length;
      applyColorToOverlay(fsColors[fsIndex].key);
    }
  });

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && isOverlayOpen) closeOverlay();
  });

  if (autoplayChk) {
    autoplayChk.addEventListener('change', function () {
      if (isOverlayOpen) {
        if (this.checked) startAutoplay();
        else stopAutoplay();
      }
    });
  }

  // ============================================================
  // 5. 麦克风
  // ============================================================
  var btnMicTest     = document.getElementById('btn-mic-test');
  var micVolumeBar   = document.getElementById('mic-volume-bar');
  var micVolumeText  = document.getElementById('mic-volume-text');
  var micPeakText    = document.getElementById('mic-volume-peak');
  var micVisCanvas   = document.getElementById('mic-visualizer');
  var micCtx2d       = micVisCanvas ? micVisCanvas.getContext('2d') : null;

  var micStream = null;
  var micAudioCtx = null;
  var micAnalyser = null;
  var micReqId = null;
  var isMicTesting = false;
  var micPeak = 0;

  function drawMicVisualizer(dataArray) {
    if (!micCtx2d) return;
    var W = micVisCanvas.width, H = micVisCanvas.height;
    micCtx2d.clearRect(0, 0, W, H);
    // 背景
    micCtx2d.fillStyle = '#fdf8ec';
    micCtx2d.fillRect(0, 0, W, H);

    var bars = 64;
    var step = Math.floor(dataArray.length / bars);
    var barW = W / bars;
    for (var i = 0; i < bars; i++) {
      var v = 0;
      for (var j = 0; j < step; j++) v += dataArray[i * step + j] || 0;
      v = v / step;
      var h = (v / 255) * H;
      var x = i * barW;
      var y = H - h;
      var grad = micCtx2d.createLinearGradient(0, y, 0, H);
      grad.addColorStop(0, '#8a5a2b');
      grad.addColorStop(1, '#7ba05b');
      micCtx2d.fillStyle = grad;
      micCtx2d.fillRect(x + 1, y, barW - 2, h);
    }
  }

  function stopMic() {
    isMicTesting = false;
    if (micReqId) { cancelAnimationFrame(micReqId); micReqId = null; }
    if (micStream) { micStream.getTracks().forEach(function (t) { t.stop(); }); micStream = null; }
    if (micAudioCtx && micAudioCtx.state !== 'closed') {
      micAudioCtx.close().catch(function () {});
      micAudioCtx = null;
    }
    micVolumeBar.style.width = '0%';
    micVolumeText.textContent = '0%';
    micPeakText.textContent = '0%';
    micPeak = 0;
    if (micCtx2d) micCtx2d.clearRect(0, 0, micVisCanvas.width, micVisCanvas.height);
    btnMicTest.textContent = '开始收音';
    btnMicTest.classList.remove('danger');
  }

  btnMicTest.addEventListener('click', function () {
    if (isMicTesting) { stopMic(); return; }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('当前浏览器不支持 getUserMedia。请使用本地服务器 (http://localhost) 或 https 访问。');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        micStream = stream;
        micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        micAnalyser = micAudioCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        micAnalyser.smoothingTimeConstant = 0.6;
        var source = micAudioCtx.createMediaStreamSource(micStream);
        source.connect(micAnalyser);

        isMicTesting = true;
        micPeak = 0;
        btnMicTest.textContent = '⏹ 停止测试';
        btnMicTest.classList.add('danger');

        var dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        var timeArray = new Uint8Array(micAnalyser.fftSize);

        function loop() {
          if (!isMicTesting) return;
          micReqId = requestAnimationFrame(loop);

          micAnalyser.getByteFrequencyData(dataArray);
          micAnalyser.getByteTimeDomainData(timeArray);

          // 音量（时域 RMS）
          var sum = 0;
          for (var i = 0; i < timeArray.length; i++) {
            var v = (timeArray[i] - 128) / 128;
            sum += v * v;
          }
          var rms = Math.sqrt(sum / timeArray.length);
          var percent = Math.min(100, Math.floor(rms * 400));

          micVolumeBar.style.width = percent + '%';
          micVolumeText.textContent = percent + '%';

          if (percent > micPeak) {
            micPeak = percent;
            micPeakText.textContent = micPeak + '%';
          }

          micVolumeBar.style.background = percent > 80 ? '#e74c3c' : (percent > 50 ? '#f59e0b' : '#7ba05b');

          drawMicVisualizer(dataArray);
        }
        loop();
      })
      .catch(function (err) {
        alert('无法访问麦克风：' + err.message +
          '\n请确认：\n1. 已授权麦克风权限；\n2. 通过 https 或 http://localhost 访问。');
      });
  });

  // ============================================================
  // 6. 扬声器
  // ============================================================
  var audioCtx = null;
  var oscillator = null;
  var gainNode = null;
  var pannerNode = null;
  var sweepTimer = null;

  var audioFreqEl   = document.getElementById('audio-freq');
  var audioFreqVal  = document.getElementById('audio-freq-val');
  var audioVolEl    = document.getElementById('audio-volume');
  var audioVolVal   = document.getElementById('audio-volume-val');
  var audioWaveEl   = document.getElementById('audio-wave');
  var btnAudioStop  = document.getElementById('btn-audio-stop');
  var btnAudioSweep = document.getElementById('btn-audio-sweep');

  function getFreq() { return parseFloat(audioFreqEl.value) || 440; }
  function getVolume() { return (parseFloat(audioVolEl.value) || 20) / 100; }
  function getWave() { return audioWaveEl.value || 'sine'; }

  function stopTone() {
    if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
    if (oscillator) {
      try { oscillator.stop(); } catch (e) {}
      try { oscillator.disconnect(); } catch (e) {}
      oscillator = null;
    }
    if (pannerNode) { try { pannerNode.disconnect(); } catch (e) {} pannerNode = null; }
    if (gainNode) { try { gainNode.disconnect(); } catch (e) {} gainNode = null; }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(function () {});
      audioCtx = null;
    }
    btnAudioSweep.textContent = '🌊 扫频 100→2000 Hz';
  }

  function playTone(panValue) {
    stopTone();

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = getWave();
    oscillator.frequency.value = getFreq();
    gainNode.gain.value = getVolume();

    if (audioCtx.createStereoPanner) {
      pannerNode = audioCtx.createStereoPanner();
      pannerNode.pan.value = panValue;
      oscillator.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(audioCtx.destination);
    } else {
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    }

    oscillator.start();
  }

  document.getElementById('btn-audio-left').addEventListener('click', function () { playTone(-1); });
  document.getElementById('btn-audio-both').addEventListener('click', function () { playTone(0); });
  document.getElementById('btn-audio-right').addEventListener('click', function () { playTone(1); });
  btnAudioStop.addEventListener('click', stopTone);

  btnAudioSweep.addEventListener('click', function () {
    if (sweepTimer) { stopTone(); return; }
    playTone(0);
    btnAudioSweep.textContent = '⏹ 停止扫频';

    var f0 = 100, f1 = 2000, duration = 8000, start = Date.now();

    sweepTimer = setInterval(function () {
      if (!oscillator || !audioCtx) { stopTone(); return; }
      var t = Math.min(1, (Date.now() - start) / duration);
      // 对数扫频
      var f = f0 * Math.pow(f1 / f0, t);
      oscillator.frequency.setValueAtTime(f, audioCtx.currentTime);
      audioFreqEl.value = Math.round(f);
      audioFreqVal.textContent = Math.round(f) + ' Hz';
      if (t >= 1) {
        stopTone();
        audioFreqEl.value = 440;
        audioFreqVal.textContent = '440 Hz';
      }
    }, 40);
  });

  // 实时更新参数
  audioFreqEl.addEventListener('input', function () {
    audioFreqVal.textContent = this.value + ' Hz';
    if (oscillator && !sweepTimer) oscillator.frequency.setValueAtTime(parseFloat(this.value), audioCtx.currentTime);
  });
  audioVolEl.addEventListener('input', function () {
    audioVolVal.textContent = this.value + '%';
    if (gainNode) gainNode.gain.setValueAtTime(parseFloat(this.value) / 100, audioCtx.currentTime);
  });
  audioWaveEl.addEventListener('change', function () {
    if (oscillator) oscillator.type = this.value;
  });

  // 初始显示
  audioFreqVal.textContent = audioFreqEl.value + ' Hz';
  audioVolVal.textContent = audioVolEl.value + '%';

  // ============================================================
  // 7. 摄像头
  // ============================================================
  var btnCameraTest   = document.getElementById('btn-camera-test');
  var cameraVideo     = document.getElementById('camera-video');
  var cameraResolution= document.getElementById('camera-resolution');
  var cameraMirror    = document.getElementById('camera-mirror');
  var btnCameraSnap   = document.getElementById('btn-camera-snap');
  var cameraMeta      = document.getElementById('camera-meta');

  var camStream = null;
  var isCamTesting = false;

  function stopCamera() {
    if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
    cameraVideo.srcObject = null;
    cameraVideo.style.display = 'none';
    cameraVideo.classList.remove('mirror');
    btnCameraTest.textContent = '开启摄像头';
    btnCameraTest.classList.remove('danger');
    btnCameraSnap.disabled = true;
    cameraMeta.textContent = '未开启';
    isCamTesting = false;
  }

  btnCameraTest.addEventListener('click', function () {
    if (isCamTesting) { stopCamera(); return; }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('当前浏览器不支持 getUserMedia。请通过 https 或 http://localhost 访问。');
      return;
    }

    var constraints = { video: true };
    var res = cameraResolution.value;
    if (res) {
      var parts = res.split('x');
      constraints.video = { width: { ideal: parseInt(parts[0], 10) }, height: { ideal: parseInt(parts[1], 10) } };
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        camStream = stream;
        cameraVideo.srcObject = camStream;
        cameraVideo.style.display = 'block';
        if (cameraMirror.checked) cameraVideo.classList.add('mirror');
        btnCameraTest.textContent = '⏹ 关闭摄像头';
        btnCameraTest.classList.add('danger');
        btnCameraSnap.disabled = false;
        isCamTesting = true;

        cameraVideo.onloadedmetadata = function () {
          cameraMeta.textContent = cameraVideo.videoWidth + '×' + cameraVideo.videoHeight;
        };
      })
      .catch(function (err) {
        alert('无法访问摄像头：' + err.message +
          '\n请确认：\n1. 已授权摄像头权限；\n2. 通过 https 或 http://localhost 访问。');
      });
  });

  cameraMirror.addEventListener('change', function () {
    cameraVideo.classList.toggle('mirror', this.checked);
  });

  cameraResolution.addEventListener('change', function () {
    if (isCamTesting) { stopCamera(); btnCameraTest.click(); }
  });

  btnCameraSnap.addEventListener('click', function () {
    if (!isCamTesting) return;
    var w = cameraVideo.videoWidth, h = cameraVideo.videoHeight;
    if (!w || !h) return;
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (cameraMirror.checked) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(cameraVideo, 0, 0, w, h);

    canvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'camera-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    }, 'image/png');
  });

  // 页面卸载清理
  window.addEventListener('beforeunload', function () {
    stopTone();
    stopMic();
    stopCamera();
    stopAutoplay();
  });

})();