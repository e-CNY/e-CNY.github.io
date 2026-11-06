(function() {
  var btnPlay = document.getElementById('wn-play');
  var timerSelect = document.getElementById('wn-timer');
  var countdownEl = document.getElementById('wn-countdown');

  // 配置所有音效的 UI 元素
  var soundKeys = ['rain', 'thunder', 'waves', 'fire', 'birds', 'crickets', 'wind', 'coffee', 'train', 'airplane', 'white', 'pink', 'brown', 'blue'];
  var sounds = {};
  
  soundKeys.forEach(function(key) {
    sounds[key] = {
      volEl: document.getElementById('vol-' + key),
      textEl: document.getElementById('vol-text-' + key)
    };
  });

  var audioCtx = null;
  var isPlaying = false;
  var nodes = {};
  var timerInterval = null;
  var timeLeft = 0;

  // ================= 基础噪音生成器 =================
  function createWhiteNoiseBuffer(ctx, duration) {
    var bufferSize = ctx.sampleRate * duration;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function createPinkNoiseBuffer(ctx, duration) {
    var bufferSize = ctx.sampleRate * duration;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    var b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  function createBrownNoiseBuffer(ctx, duration) {
    var bufferSize = ctx.sampleRate * duration;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    var lastOut = 0.0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    return buffer;
  }

  // 蓝噪音 (白噪音的高通/差分)
  function createBlueNoiseBuffer(ctx, duration) {
    var bufferSize = ctx.sampleRate * duration;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    var lastWhite = 0.0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      data[i] = white - lastWhite;
      lastWhite = white;
    }
    return buffer;
  }

  // ================= 核心音频初始化 =================
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    var masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);
    nodes.master = masterGain;

    // 1. 雨声 (白噪 + 低通 + 随机滴答声)
    var rainSrc = audioCtx.createBufferSource(); rainSrc.buffer = createWhiteNoiseBuffer(audioCtx, 2); rainSrc.loop = true;
    var rainFilter = audioCtx.createBiquadFilter(); rainFilter.type = 'lowpass'; rainFilter.frequency.value = 1200;
    var rainGain = audioCtx.createGain(); rainGain.gain.value = 0;
    rainSrc.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(masterGain);
    nodes.rain = { src: rainSrc, gain: rainGain };

    // 2. 海浪 (褐噪 + 低通 + LFO 调制)
    var wavesSrc = audioCtx.createBufferSource(); wavesSrc.buffer = createBrownNoiseBuffer(audioCtx, 2); wavesSrc.loop = true;
    var wavesFilter = audioCtx.createBiquadFilter(); wavesFilter.type = 'lowpass'; wavesFilter.frequency.value = 800;
    var wavesGain = audioCtx.createGain(); wavesGain.gain.value = 0;
    var lfo = audioCtx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.1;
    var lfoGain = audioCtx.createGain(); lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain); lfoGain.connect(wavesGain.gain);
    wavesSrc.connect(wavesFilter); wavesFilter.connect(wavesGain); wavesGain.connect(masterGain);
    nodes.waves = { src: wavesSrc, gain: wavesGain, lfo: lfo };

    // 3. 篝火 (褐噪 + 带通 + 随机爆裂)
    var fireSrc = audioCtx.createBufferSource(); fireSrc.buffer = createBrownNoiseBuffer(audioCtx, 2); fireSrc.loop = true;
    var fireFilter = audioCtx.createBiquadFilter(); fireFilter.type = 'bandpass'; fireFilter.frequency.value = 400; fireFilter.Q.value = 2;
    var fireGain = audioCtx.createGain(); fireGain.gain.value = 0;
    fireSrc.connect(fireFilter); fireFilter.connect(fireGain); fireGain.connect(masterGain);
    nodes.fire = { src: fireSrc, gain: fireGain };

    // 4. 白噪音
    var whiteSrc = audioCtx.createBufferSource(); whiteSrc.buffer = createWhiteNoiseBuffer(audioCtx, 2); whiteSrc.loop = true;
    var whiteGain = audioCtx.createGain(); whiteGain.gain.value = 0;
    whiteSrc.connect(whiteGain); whiteGain.connect(masterGain);
    nodes.white = { src: whiteSrc, gain: whiteGain };

    // 5. 粉红噪音
    var pinkSrc = audioCtx.createBufferSource(); pinkSrc.buffer = createPinkNoiseBuffer(audioCtx, 2); pinkSrc.loop = true;
    var pinkGain = audioCtx.createGain(); pinkGain.gain.value = 0;
    pinkSrc.connect(pinkGain); pinkGain.connect(masterGain);
    nodes.pink = { src: pinkSrc, gain: pinkGain };

    // 6. 褐噪音
    var brownSrc = audioCtx.createBufferSource(); brownSrc.buffer = createBrownNoiseBuffer(audioCtx, 2); brownSrc.loop = true;
    var brownGain = audioCtx.createGain(); brownGain.gain.value = 0;
    brownSrc.connect(brownGain); brownGain.connect(masterGain);
    nodes.brown = { src: brownSrc, gain: brownGain };

    // 7. 蓝噪音
    var blueSrc = audioCtx.createBufferSource(); blueSrc.buffer = createBlueNoiseBuffer(audioCtx, 2); blueSrc.loop = true;
    var blueGain = audioCtx.createGain(); blueGain.gain.value = 0;
    blueSrc.connect(blueGain); blueGain.connect(masterGain);
    nodes.blue = { src: blueSrc, gain: blueGain };

    // 8. 咖啡厅 (褐噪 + 低通 + 极高通模拟人声嗡嗡)
    var coffeeSrc = audioCtx.createBufferSource(); coffeeSrc.buffer = createBrownNoiseBuffer(audioCtx, 2); coffeeSrc.loop = true;
    var coffeeFilter = audioCtx.createBiquadFilter(); coffeeFilter.type = 'lowpass'; coffeeFilter.frequency.value = 1000;
    var coffeeGain = audioCtx.createGain(); coffeeGain.gain.value = 0;
    coffeeSrc.connect(coffeeFilter); coffeeFilter.connect(coffeeGain); coffeeGain.connect(masterGain);
    nodes.coffee = { src: coffeeSrc, gain: coffeeGain };

    // 9. 火车 (褐噪 + 低频轰鸣 + 节奏感)
    var trainSrc = audioCtx.createBufferSource(); trainSrc.buffer = createBrownNoiseBuffer(audioCtx, 2); trainSrc.loop = true;
    var trainFilter = audioCtx.createBiquadFilter(); trainFilter.type = 'lowpass'; trainFilter.frequency.value = 200;
    var trainGain = audioCtx.createGain(); trainGain.gain.value = 0;
    var trainOsc = audioCtx.createOscillator(); trainOsc.type = 'sine'; trainOsc.frequency.value = 40; // 引擎声
    var trainOscGain = audioCtx.createGain(); trainOscGain.gain.value = 0.5;
    trainOsc.connect(trainOscGain); trainOscGain.connect(trainGain);
    trainSrc.connect(trainFilter); trainFilter.connect(trainGain); trainGain.connect(masterGain);
    nodes.train = { src: trainSrc, gain: trainGain, osc: trainOsc };

    // 10. 飞机机舱 (白噪 + 极低频涡轮)
    var airplaneSrc = audioCtx.createBufferSource(); airplaneSrc.buffer = createWhiteNoiseBuffer(audioCtx, 2); airplaneSrc.loop = true;
    var airplaneFilter = audioCtx.createBiquadFilter(); airplaneFilter.type = 'lowpass'; airplaneFilter.frequency.value = 600;
    var airplaneGain = audioCtx.createGain(); airplaneGain.gain.value = 0;
    var airplaneOsc = audioCtx.createOscillator(); airplaneOsc.type = 'sine'; airplaneOsc.frequency.value = 80;
    var airplaneOscGain = audioCtx.createGain(); airplaneOscGain.gain.value = 0.3;
    airplaneOsc.connect(airplaneOscGain); airplaneOscGain.connect(airplaneGain);
    airplaneSrc.connect(airplaneFilter); airplaneFilter.connect(airplaneGain); airplaneGain.connect(masterGain);
    nodes.airplane = { src: airplaneSrc, gain: airplaneGain, osc: airplaneOsc };

    // 11. 风声 (粉噪 + 带通扫频)
    var windSrc = audioCtx.createBufferSource(); windSrc.buffer = createPinkNoiseBuffer(audioCtx, 2); windSrc.loop = true;
    var windFilter = audioCtx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 1;
    var windGain = audioCtx.createGain(); windGain.gain.value = 0;
    var windLfo = audioCtx.createOscillator(); windLfo.type = 'sine'; windLfo.frequency.value = 0.05;
    var windLfoGain = audioCtx.createGain(); windLfoGain.gain.value = 300;
    windLfo.connect(windLfoGain); windLfoGain.connect(windFilter.frequency);
    windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(masterGain);
    nodes.wind = { src: windSrc, gain: windGain, lfo: windLfo };

    // 启动长期 Loop 的节点
    rainSrc.start(); wavesSrc.start(); lfo.start(); fireSrc.start();
    whiteSrc.start(); pinkSrc.start(); brownSrc.start(); blueSrc.start();
    coffeeSrc.start(); trainSrc.start(); trainOsc.start();
    airplaneSrc.start(); airplaneOsc.start(); windSrc.start(); windLfo.start();

    // 预留随机触发节点容器
    nodes.thunder = { gain: audioCtx.createGain(), timer: null };
    nodes.thunder.gain.gain.value = 0;
    nodes.thunder.gain.connect(masterGain);

    nodes.birds = { gain: audioCtx.createGain(), timer: null };
    nodes.birds.gain.gain.value = 0;
    nodes.birds.gain.connect(masterGain);

    nodes.crickets = { gain: audioCtx.createGain(), timer: null };
    nodes.crickets.gain.gain.value = 0;
    nodes.crickets.gain.connect(masterGain);

    updateAllVolumes();
    startDynamicTriggers();
  }

  // ================= 动态音效生成 (雷、鸟、虫) =================
  
  function triggerThunder() {
    if (!isPlaying || sounds.thunder.volEl.value == 0) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 3);
    osc.connect(gain); gain.connect(nodes.thunder.gain);
    osc.start(now); osc.stop(now + 3);
  }

  function triggerBird() {
    if (!isPlaying || sounds.birds.volEl.value == 0) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    var startFreq = 2000 + Math.random() * 2000;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq + 500, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(startFreq - 500, now + 0.2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.connect(gain); gain.connect(nodes.birds.gain);
    osc.start(now); osc.stop(now + 0.3);
  }

  function triggerCricket() {
    if (!isPlaying || sounds.crickets.volEl.value == 0) return;
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 4000; // 高频虫鸣
    
    // 虫鸣是连续的“唧唧”声，用快速断续的包络模拟
    gain.gain.setValueAtTime(0, now);
    for (var i = 0; i < 4; i++) {
      gain.gain.linearRampToValueAtTime(0.2, now + i*0.1 + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + i*0.1 + 0.08);
    }
    
    osc.connect(gain); gain.connect(nodes.crickets.gain);
    osc.start(now); osc.stop(now + 0.5);
  }

  function startDynamicTriggers() {
    setInterval(function() { if (isPlaying && Math.random() < 0.15) triggerThunder(); }, 10000);
    setInterval(function() { if (isPlaying && Math.random() < 0.4) triggerBird(); }, 2000);
    setInterval(function() { if (isPlaying && Math.random() < 0.6) triggerCricket(); }, 1500);
    
    // 篝火爆裂声 (用瞬间增大增益模拟)
    setInterval(function() {
      if (isPlaying && sounds.fire.volEl.value > 0) {
        var now = audioCtx.currentTime;
        var burstGain = audioCtx.createGain();
        var burstSrc = audioCtx.createBufferSource();
        burstSrc.buffer = createWhiteNoiseBuffer(audioCtx, 0.05);
        burstGain.gain.setValueAtTime(0.5, now);
        burstGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        burstSrc.connect(burstGain);
        burstGain.connect(nodes.fire.gain);
        burstSrc.start(now);
      }
    }, 500);
  }

  // ================= 音量控制与 UI 交互 =================
  function updateAllVolumes() {
    if (!audioCtx) return;
    
    soundKeys.forEach(function(key) {
      var val = parseInt(sounds[key].volEl.value, 10);
      sounds[key].textEl.textContent = val + '%';
      var targetGain = val / 100;
      
      if (nodes[key] && nodes[key].gain) {
        if (isPlaying) {
          nodes[key].gain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
        } else {
          nodes[key].gain.gain.value = targetGain;
        }
      }
    });
  }

  soundKeys.forEach(function(key) {
    sounds[key].volEl.addEventListener('input', updateAllVolumes);
  });

  // 播放/暂停控制
  btnPlay.addEventListener('click', function() {
    if (isPlaying) {
      isPlaying = false;
      btnPlay.textContent = '▶️ 开始混音播放';
      btnPlay.classList.remove('playing');
      if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
      clearInterval(timerInterval);
      countdownEl.textContent = '';
      timerSelect.value = '0';
    } else {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      isPlaying = true;
      btnPlay.textContent = '⏸️ 暂停播放';
      btnPlay.classList.add('playing');
      updateAllVolumes();
      startTimer();
    }
  });

  // 定时器
  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = parseInt(timerSelect.value, 10) * 60;
    if (timeLeft === 0) { countdownEl.textContent = ''; return; }

    function updateTimer() {
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isPlaying = false;
        btnPlay.textContent = '▶️ 开始混音播放';
        btnPlay.classList.remove('playing');
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
        countdownEl.textContent = '已停止';
        return;
      }
      var m = Math.floor(timeLeft / 60);
      var s = timeLeft % 60;
      countdownEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      timeLeft--;
    }
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  timerSelect.addEventListener('change', function() {
    if (isPlaying) startTimer();
  });

})();