(function() {
  // ================= Tab 切换 =================
  var tabs = document.querySelectorAll('.ht-tab');
  var panels = document.querySelectorAll('.ht-panel');
  
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      panels.forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      document.getElementById(this.dataset.target).classList.add('active');
    });
  });

  // ================= 1. 键盘测试 =================
  var lastKeyEl = document.getElementById('last-key');
  var keyCountEl = document.getElementById('key-count');
  var keyEls = document.querySelectorAll('.key');
  var testedKeys = new Set();

  function updateKey(e, isDown) {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code)) {
      e.preventDefault();
    }
    var code = e.code;
    if (!code) return;

    if (isDown) {
      lastKeyEl.textContent = e.key === ' ' ? 'Space' : e.key;
      if (!testedKeys.has(code)) {
        testedKeys.add(code);
        keyCountEl.textContent = testedKeys.size;
      }
    }
    var keyEl = document.querySelector('.key[data-code="' + code + '"]');
    if (keyEl) {
      if (isDown) keyEl.classList.add('active');
      else keyEl.classList.remove('active');
    }
  }
  window.addEventListener('keydown', function(e) { updateKey(e, true); });
  window.addEventListener('keyup', function(e) { updateKey(e, false); });

  document.getElementById('btn-reset-keyboard').addEventListener('click', function() {
    testedKeys.clear();
    keyCountEl.textContent = '0';
    lastKeyEl.textContent = '无';
    keyEls.forEach(function(k) { k.classList.remove('active'); });
  });

  // ================= 2. 鼠标测试 =================
  var mousePanel = document.getElementById('panel-mouse');
  var mouseLeftBtn = document.getElementById('mouse-left');
  var mouseRightBtn = document.getElementById('mouse-right');
  var mouseWheel = document.getElementById('mouse-wheel');
  var mouseLeftCount = document.getElementById('mouse-left-count');
  var mouseRightCount = document.getElementById('mouse-right-count');
  var mouseWheelCount = document.getElementById('mouse-wheel-count');
  var leftClicks = 0, rightClicks = 0, wheelScrolls = 0;

  mousePanel.addEventListener('mousedown', function(e) {
    if (e.button === 0) {
      mouseLeftBtn.classList.add('active');
      leftClicks++; mouseLeftCount.textContent = leftClicks;
    } else if (e.button === 2) {
      mouseRightBtn.classList.add('active');
      rightClicks++; mouseRightCount.textContent = rightClicks;
    }
    if (e.button === 2) e.preventDefault();
  });
  mousePanel.addEventListener('mouseup', function(e) {
    if (e.button === 0) mouseLeftBtn.classList.remove('active');
    if (e.button === 2) mouseRightBtn.classList.remove('active');
  });
  mousePanel.addEventListener('wheel', function(e) {
    wheelScrolls++; mouseWheelCount.textContent = wheelScrolls;
    mouseWheel.classList.add('active');
    clearTimeout(window.wheelTimer);
    window.wheelTimer = setTimeout(function() { mouseWheel.classList.remove('active'); }, 200);
    e.preventDefault();
  }, { passive: false });
  mousePanel.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  var dcArea = document.getElementById('doubleclick-area');
  var clickCountEl = document.getElementById('click-count');
  var clickStatusEl = document.getElementById('click-status');
  var clickHistoryEl = document.getElementById('click-history');
  var dcClicks = 0, lastClickTime = 0, dcTimer = null;

  dcArea.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    var now = Date.now();
    dcClicks++;
    clickCountEl.textContent = dcClicks;

    if (lastClickTime === 0) {
      clickStatusEl.textContent = '第一次点击';
      clickStatusEl.style.color = '#8a7a5f';
    } else {
      var diff = now - lastClickTime;
      clickHistoryEl.innerHTML = '距离上次点击: ' + diff + ' ms';
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
    dcTimer = setTimeout(function() {
      clickStatusEl.textContent = '等待点击...';
      clickStatusEl.style.color = '#7ba05b';
      lastClickTime = 0;
      clickHistoryEl.innerHTML = '';
    }, 1000);
  });

  document.getElementById('btn-reset-mouse').addEventListener('click', function() {
    leftClicks = 0; rightClicks = 0; wheelScrolls = 0; dcClicks = 0;
    mouseLeftCount.textContent = '0'; mouseRightCount.textContent = '0'; mouseWheelCount.textContent = '0';
    clickCountEl.textContent = '0'; clickStatusEl.textContent = '等待点击...';
    clickHistoryEl.innerHTML = ''; lastClickTime = 0;
  });

  // ================= 3. 屏幕坏点测试 =================
  var fullscreenOverlay = document.getElementById('fullscreen-overlay');
  var colorBlocks = document.querySelectorAll('.color-block');

  colorBlocks.forEach(function(block) {
    block.addEventListener('click', function() {
      var color = this.dataset.color;
      fullscreenOverlay.style.background = color;
      fullscreenOverlay.style.display = 'block';
      
      // 请求全屏
      if (fullscreenOverlay.requestFullscreen) {
        fullscreenOverlay.requestFullscreen();
      } else if (fullscreenOverlay.webkitRequestFullscreen) {
        fullscreenOverlay.webkitRequestFullscreen();
      }
    });
  });

  function exitFullscreen() {
    fullscreenOverlay.style.display = 'none';
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  fullscreenOverlay.addEventListener('click', exitFullscreen);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && fullscreenOverlay.style.display === 'block') {
      exitFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) fullscreenOverlay.style.display = 'none';
  });

  // ================= 4. 音视频设备测试 =================
  
  // --- 麦克风 ---
  var btnMicTest = document.getElementById('btn-mic-test');
  var micVolumeBar = document.getElementById('mic-volume-bar');
  var micVolumeText = document.getElementById('mic-volume-text');
  var micStream = null;
  var micAudioCtx = null;
  var micAnalyser = null;
  var micReqId = null;
  var isMicTesting = false;

  btnMicTest.addEventListener('click', async function() {
    if (isMicTesting) {
      // 停止
      isMicTesting = false;
      cancelAnimationFrame(micReqId);
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      if (micAudioCtx && micAudioCtx.state !== 'closed') micAudioCtx.close();
      micVolumeBar.style.width = '0%';
      micVolumeText.textContent = '0%';
      btnMicTest.textContent = '开始收音';
      btnMicTest.classList.remove('danger');
      return;
    }

    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      micAnalyser = micAudioCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      var source = micAudioCtx.createMediaStreamSource(micStream);
      source.connect(micAnalyser);

      isMicTesting = true;
      btnMicTest.textContent = '⏹ 停止测试';
      
      var dataArray = new Uint8Array(micAnalyser.frequencyBinCount);

      function updateMicVolume() {
        if (!isMicTesting) return;
        micReqId = requestAnimationFrame(updateMicVolume);
        micAnalyser.getByteFrequencyData(dataArray);
        
        var sum = 0;
        for (var i = 0; i < dataArray.length; i++) sum += dataArray[i];
        var average = sum / dataArray.length;
        var percent = Math.min(100, Math.floor((average / 255) * 200)); // 放大一点灵敏度
        
        micVolumeBar.style.width = percent + '%';
        micVolumeText.textContent = percent + '%';
        
        if (percent > 80) micVolumeBar.style.background = '#e74c3c';
        else micVolumeBar.style.background = '#7ba05b';
      }
      updateMicVolume();

    } catch (err) {
      alert('无法访问麦克风: ' + err.message);
    }
  });

  // --- 扬声器 ---
  var audioCtx = null;
  var oscillator = null;
  var panner = null;
  var gainNode = null;

  function playTone(panValue) {
    if (audioCtx) audioCtx.close();
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    oscillator = audioCtx.createOscillator();
    panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // A4 音
    gainNode.gain.value = 0.1; // 音量不要太大
    
    if (panner) {
      panner.pan.value = panValue; // -1 左，0 中，1 右
      oscillator.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(audioCtx.destination);
    } else {
      // 兼容不支持 StereoPanner 的旧浏览器
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    }
    
    oscillator.start();
  }

  function stopTone() {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close();
    }
  }

  document.getElementById('btn-audio-left').addEventListener('click', function() { playTone(-1); });
  document.getElementById('btn-audio-both').addEventListener('click', function() { playTone(0); });
  document.getElementById('btn-audio-right').addEventListener('click', function() { playTone(1); });
  document.getElementById('btn-audio-stop').addEventListener('click', stopTone);

  // --- 摄像头 ---
  var btnCameraTest = document.getElementById('btn-camera-test');
  var cameraVideo = document.getElementById('camera-video');
  var camStream = null;
  var isCamTesting = false;

  btnCameraTest.addEventListener('click', async function() {
    if (isCamTesting) {
      camStream.getTracks().forEach(t => t.stop());
      cameraVideo.srcObject = null;
      cameraVideo.style.display = 'none';
      btnCameraTest.textContent = '开启摄像头';
      btnCameraTest.classList.remove('danger');
      isCamTesting = false;
      return;
    }

    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraVideo.srcObject = camStream;
      cameraVideo.style.display = 'block';
      btnCameraTest.textContent = '⏹ 关闭摄像头';
      isCamTesting = true;
    } catch (err) {
      alert('无法访问摄像头: ' + err.message);
    }
  });

  // 为危险操作按钮添加红色样式
  var style = document.createElement('style');
  style.innerHTML = '.primary-btn.danger { background: #e74c3c; } .primary-btn.danger:hover { background: #c0392b; }';
  document.head.appendChild(style);

})();