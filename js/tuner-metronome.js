(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  // 初始化 Tone.js 上下文状态
  var toneStarted = false;
  async function ensureToneStarted() {
    if (!toneStarted) {
      await Tone.start();
      toneStarted = true;
    }
  }

  // ================= Tab 切换逻辑 =================
  var tabs = document.querySelectorAll('.tm-tab');
  var panels = document.querySelectorAll('.tm-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
      
      // 切换时自动关闭正在运行的音频
      if (tab.dataset.target === 'panel-metronome') {
        stopTuner();
      } else {
        stopMetronome();
      }
    });
  });

  // ================= 1. 乐器调音器 =================
  var instrumentSelect = document.getElementById('tn-instrument');
  var a4Input = document.getElementById('tn-a4');
  var btnStartTuner = document.getElementById('btn-start-tuner');
  var targetStringEl = document.getElementById('tn-target-string');
  var freqEl = document.getElementById('tn-freq');
  var targetNoteEl = document.getElementById('tn-target-note');
  var centsEl = document.getElementById('tn-cents');
  var centsBar = document.getElementById('tn-cents-bar');
  var needle = document.getElementById('tn-needle');
  var statusEl = document.getElementById('tn-status');
  var refButtonsContainer = document.getElementById('tn-ref-buttons');
  var btnStopRef = document.getElementById('btn-stop-ref');

  // 乐器频率字典 (基于标准 A4=440Hz)
  var instruments = {
    guitar: [ {n: 'E2', f: 82.41}, {n: 'A2', f: 110.00}, {n: 'D3', f: 146.83}, {n: 'G3', f: 196.00}, {n: 'B3', f: 246.94}, {n: 'E4', f: 329.63} ],
    ukulele: [ {n: 'G4', f: 392.00}, {n: 'C4', f: 261.63}, {n: 'E4', f: 329.63}, {n: 'A4', f: 440.00} ],
    bass: [ {n: 'E1', f: 41.20}, {n: 'A1', f: 55.00}, {n: 'D2', f: 73.42}, {n: 'G2', f: 98.00} ],
    violin: [ {n: 'G3', f: 196.00}, {n: 'D4', f: 293.66}, {n: 'A4', f: 440.00}, {n: 'E5', f: 659.25} ],
    cello: [ {n: 'C2', f: 65.41}, {n: 'G2', f: 98.00}, {n: 'D3', f: 146.83}, {n: 'A3', f: 220.00} ],
    mandolin: [ {n: 'G3', f: 196.00}, {n: 'D4', f: 293.66}, {n: 'A4', f: 440.00}, {n: 'E5', f: 659.25} ],
    banjo: [ {n: 'G4', f: 392.00}, {n: 'D3', f: 146.83}, {n: 'G3', f: 196.00}, {n: 'B3', f: 246.94}, {n: 'D4', f: 293.66} ]
  };

  var audioCtx = null;
  var analyser = null;
  var microphone = null;
  var isTuning = false;
  var buffer = new Float32Array(2048);
  var reqId = null;
  
  // 平滑指针的变量
  var currentAngle = 0;
  var targetAngle = 0;
  var lastFreq = 0;

  // 参考音合成器
  var refSynth = null;
  var isPlayingRef = false;
  var activeRefBtn = null;

  // 计算校准后的基准频率
  function getCalibratedFreq(freqAt440) {
    var a4 = parseFloat(a4Input.value) || 440;
    var ratio = a4 / 440;
    return freqAt440 * ratio;
  }

  // 渲染参考音按钮
  function renderReferenceNotes() {
    refButtonsContainer.innerHTML = '';
    var inst = instruments[instrumentSelect.value];
    
    inst.forEach(function(item) {
      var calFreq = getCalibratedFreq(item.f);
      var btn = document.createElement('button');
      btn.className = 'tn-ref-btn';
      btn.textContent = item.n;
      btn.dataset.freq = calFreq;
      
      btn.addEventListener('click', function() {
        if (isPlayingRef && activeRefBtn === btn) {
          stopReferenceTone();
        } else {
          playReferenceTone(calFreq, btn, item.n);
        }
      });
      refButtonsContainer.appendChild(btn);
    });
  }

  async function playReferenceTone(freq, btn, noteName) {
    await ensureToneStarted();
    if (!refSynth) {
      refSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.5 }
      }).toDestination();
    }
    refSynth.volume.value = -10;
    
    // 停止之前的
    stopReferenceTone();
    
    refSynth.triggerAttack(freq);
    isPlayingRef = true;
    activeRefBtn = btn;
    btn.classList.add('active');
    btnStopRef.style.display = 'inline-block';
    
    targetStringEl.textContent = '参考音: ' + noteName;
    targetNoteEl.textContent = freq.toFixed(2) + ' Hz';
    centsEl.textContent = '校准中...';
  }

  function stopReferenceTone() {
    if (refSynth && isPlayingRef) {
      refSynth.triggerRelease();
      isPlayingRef = false;
      if (activeRefBtn) activeRefBtn.classList.remove('active');
      activeRefBtn = null;
      btnStopRef.style.display = 'none';
      if (!isTuning) targetStringEl.textContent = '参考音已停止';
    }
  }

  btnStopRef.addEventListener('click', stopReferenceTone);
  a4Input.addEventListener('input', renderReferenceNotes);
  instrumentSelect.addEventListener('change', function() {
    stopReferenceTone();
    renderReferenceNotes();
  });
  renderReferenceNotes(); // 初始化

  // 核心：麦克风拾音与音高检测
  btnStartTuner.addEventListener('click', async function () {
    if (isTuning) {
      stopTuner();
      return;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphone = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      microphone.connect(analyser);
      
      isTuning = true;
      btnStartTuner.textContent = '🛑 关闭麦克风';
      btnStartTuner.style.background = '#a8452a';
      btnStartTuner.style.borderColor = '#a8452a';
      showToast('麦克风已开启，请拨动琴弦');
      updateTuner();
    } catch (err) {
      showToast('无法访问麦克风，请检查权限。', true);
    }
  });

  function stopTuner() {
    isTuning = false;
    if (reqId) cancelAnimationFrame(reqId);
    if (microphone) microphone.disconnect();
    if (audioCtx) audioCtx.close();
    btnStartTuner.textContent = '🎤 开启麦克风';
    btnStartTuner.style.background = '#2563eb';
    btnStartTuner.style.borderColor = '#2563eb';
    needle.style.transform = 'translateX(-50%) rotate(0deg)';
    needle.style.background = '#a8452a';
    centsBar.style.width = '0%';
    centsBar.style.left = '50%';
    centsBar.style.background = '#7ba05b';
    freqEl.textContent = '0.00 Hz';
    centsEl.textContent = '0 音分';
    centsEl.style.color = '#8a7a5f';
    statusEl.textContent = '已停止';
    targetStringEl.textContent = '请开启麦克风或点击参考音';
  }

  // 优化的自相关算法
  function autoCorrelate(buf, sampleRate) {
    var SIZE = buf.length;
    var rms = 0;
    for (var i = 0; i < SIZE; i++) { var val = buf[i]; rms += val * val; }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // 声音太小

    var r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (var i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (var i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    var c = new Array(buf.length).fill(0);
    for (var i = 0; i < buf.length; i++)
      for (var j = 0; j < buf.length - i; j++) c[i] = c[i] + buf[j] * buf[j + i];

    var d = 0; while (c[d] > c[d + 1]) d++;
    var maxval = -1, maxpos = -1;
    for (var i = d; i < buf.length; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
    var T0 = maxpos;

    var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    var a = (x1 + x3 - 2 * x2) / 2;
    var b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    var freq = sampleRate / T0;
    
    // 限制在乐器有效范围内，过滤高频泛音
    if (freq < 40 || freq > 1200) return -1;
    
    return freq;
  }

  function updateTuner() {
    if (!isTuning) return;
    analyser.getFloatTimeDomainData(buffer);
    var freq = autoCorrelate(buffer, audioCtx.sampleRate);

    if (freq > 0) {
      // 使用低通滤波平滑频率
      lastFreq = lastFreq === 0 ? freq : lastFreq * 0.8 + freq * 0.2;
      freqEl.textContent = lastFreq.toFixed(2) + ' Hz';

      var inst = instruments[instrumentSelect.value];
      var minDiff = Infinity;
      var closestNote = '';
      var targetFreq = 0;

      inst.forEach(function(item) {
        var calFreq = getCalibratedFreq(item.f);
        var diff = Math.abs(lastFreq - calFreq);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = item.n;
          targetFreq = calFreq;
        }
      });

      targetStringEl.textContent = closestNote;
      targetNoteEl.textContent = targetFreq.toFixed(2) + ' Hz';

      // 计算音分 (Cents)
      var cents = Math.round(1200 * Math.log2(lastFreq / targetFreq));
      if (cents > 50) cents = 50;
      if (cents < -50) cents = -50;

      // 更新指针目标角度 (最大60度)
      targetAngle = (cents / 50) * 60;
      
      // 平滑指针动画 (Lerp)
      currentAngle += (targetAngle - currentAngle) * 0.2;
      needle.style.transform = 'translateX(-50%) rotate(' + currentAngle + 'deg)';

      // 更新音分条
      centsEl.textContent = (cents > 0 ? '+' : '') + cents + ' 音分';
      var barWidth = Math.abs(cents) * 2; // 最多 100%
      centsBar.style.width = barWidth + '%';
      centsBar.style.left = (50 + (cents > 0 ? barWidth/2 : -barWidth/2)) + '%';

      // 状态颜色反馈
      if (Math.abs(cents) <= 3) {
        needle.style.background = '#7ba05b';
        centsBar.style.background = '#7ba05b';
        centsEl.style.color = '#7ba05b';
        statusEl.textContent = '✅ 音准完美';
        statusEl.style.color = '#7ba05b';
      } else if (cents > 3) {
        needle.style.background = '#e67e22';
        centsBar.style.background = '#e67e22';
        centsEl.style.color = '#e67e22';
        statusEl.textContent = '⬆️ 偏高';
        statusEl.style.color = '#e67e22';
      } else {
        needle.style.background = '#2563eb';
        centsBar.style.background = '#2563eb';
        centsEl.style.color = '#2563eb';
        statusEl.textContent = '⬇️ 偏低';
        statusEl.style.color = '#2563eb';
      }
    } else {
      // 没声音时平滑归零
      targetAngle = 0;
      currentAngle += (0 - currentAngle) * 0.1;
      needle.style.transform = 'translateX(-50%) rotate(' + currentAngle + 'deg)';
      
      if (lastFreq !== 0) {
        lastFreq = 0;
        freqEl.textContent = '0.00 Hz';
        centsEl.textContent = '0 音分';
        centsBar.style.width = '0%';
        centsBar.style.left = '50%';
        statusEl.textContent = '等待弹奏...';
        statusEl.style.color = '#8a7a5f';
      }
    }

    reqId = requestAnimationFrame(updateTuner);
  }

  // ================= 2. 节拍器 =================
  var bpmInput = document.getElementById('mt-bpm');
  var bpmSlider = document.getElementById('mt-bpm-slider');
  var timeSigSelect = document.getElementById('mt-time-sig');
  var soundSelect = document.getElementById('mt-sound');
  var volSlider = document.getElementById('mt-vol');
  var btnToggle = document.getElementById('btn-toggle-metronome');
  var btnTapTempo = document.getElementById('btn-tap-tempo');
  var visualizer = document.getElementById('mt-visualizer');

  var metronomeSynth = null;
  var metroVolume = new Tone.Volume(-6).toDestination();
  var isMetroOn = false;
  var currentBeat = 0;
  var beatsPerBar = 4;

  // Tap Tempo 逻辑
  var tapTimes = [];
  
  btnTapTempo.addEventListener('click', function() {
    var now = performance.now();
    
    // 超过 2 秒重置
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) {
      tapTimes = [];
    }
    
    tapTimes.push(now);
    
    // 保留最近 5 次敲击
    if (tapTimes.length > 5) {
      tapTimes.shift();
    }
    
    if (tapTimes.length > 1) {
      var intervals = [];
      for (var i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
      }
      
      var avgInterval = intervals.reduce(function(a, b) { return a + b; }, 0) / intervals.length;
      var bpm = Math.round(60000 / avgInterval);
      
      if (bpm >= 40 && bpm <= 240) {
        bpmInput.value = bpm;
        bpmSlider.value = bpm;
        Tone.Transport.bpm.value = bpm;
      }
    }
  });

  function initMetronomeEngine() {
    if (metronomeSynth) metronomeSynth.dispose();
    var type = soundSelect.value;
    
    if (type === 'kick') {
      metronomeSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 4, oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
      }).connect(metroVolume);
    } else if (type === 'snare') {
      metronomeSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
      }).connect(metroVolume);
    } else if (type === 'wood') {
      metronomeSynth = new Tone.MembraneSynth({
        pitchDecay: 0.008, octaves: 2, oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }
      }).connect(metroVolume);
    } else {
      metronomeSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).connect(metroVolume);
    }
  }

  function updateVisualizer() {
    visualizer.innerHTML = '';
    var sig = timeSigSelect.value;
    if (sig === '3_8') beatsPerBar = 3;
    else if (sig === '6_8') beatsPerBar = 6;
    else beatsPerBar = parseInt(sig, 10);

    for (var i = 0; i < beatsPerBar; i++) {
      var dot = document.createElement('div');
      dot.className = 'mt-dot';
      if (i === 0) dot.classList.add('accent');
      visualizer.appendChild(dot);
    }
  }

  bpmSlider.addEventListener('input', function() {
    bpmInput.value = this.value;
    Tone.Transport.bpm.value = parseInt(this.value, 10);
  });
  bpmInput.addEventListener('input', function() {
    bpmSlider.value = this.value;
    Tone.Transport.bpm.value = parseInt(this.value, 10);
  });

  volSlider.addEventListener('input', function() {
    var vol = parseFloat(this.value);
    metroVolume.volume.value = vol === 0 ? -Infinity : (20 * Math.log10(vol));
  });

  timeSigSelect.addEventListener('change', updateVisualizer);
  soundSelect.addEventListener('change', initMetronomeEngine);

  btnToggle.addEventListener('click', async function() {
    if (!isMetroOn) {
      await ensureToneStarted();
      Tone.Transport.bpm.value = parseInt(bpmInput.value, 10);
      initMetronomeEngine();
      updateVisualizer();
      currentBeat = 0;

      // 移除之前的节拍事件，防止重复叠加
      Tone.Transport.cancel();
      
      Tone.Transport.scheduleRepeat(function(time) {
        var isAccent = currentBeat === 0;
        var type = soundSelect.value;
        
        if (type === 'kick') {
          metronomeSynth.triggerAttackRelease(isAccent ? "C2" : "G1", "16n", time);
        } else if (type === 'snare') {
          metronomeSynth.triggerAttackRelease("16n", time);
        } else if (type === 'wood') {
          metronomeSynth.triggerAttackRelease(isAccent ? "C4" : "G3", "16n", time);
        } else {
          metronomeSynth.triggerAttackRelease(isAccent ? "A5" : "E5", "16n", time);
        }
        
        Tone.Draw.schedule(function() {
          var dots = visualizer.querySelectorAll('.mt-dot');
          dots.forEach(function(d) { d.classList.remove('active'); });
          if (dots[currentBeat]) dots[currentBeat].classList.add('active');
        }, time);

        currentBeat = (currentBeat + 1) % beatsPerBar;
      }, "4n");

      Tone.Transport.start();
      isMetroOn = true;
      btnToggle.textContent = '⏹️ 停止';
      btnToggle.style.background = '#a8452a';
      btnToggle.style.borderColor = '#a8452a';
    } else {
      stopMetronome();
    }
  });

  function stopMetronome() {
    if (isMetroOn) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      isMetroOn = false;
      btnToggle.textContent = '▶️ 启动';
      btnToggle.style.background = '#2563eb';
      btnToggle.style.borderColor = '#2563eb';
      var dots = visualizer.querySelectorAll('.mt-dot');
      dots.forEach(function(d) { d.classList.remove('active'); });
    }
  }

  // 初始化节拍器视觉效果
  updateVisualizer();
  
  // 快捷键 (空格控制节拍器)
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      // 确保只在节拍器标签页响应
      if (document.getElementById('panel-metronome').classList.contains('active')) {
        btnToggle.click();
      }
    }
  });

})();