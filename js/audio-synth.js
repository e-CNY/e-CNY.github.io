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

  // ================= 状态与初始化 =================
  var synth = null;
  var activeNotes = new Set();
  var sustainedNotes = new Set();
  var isSustainOn = false;
  var currentBaseOctave = 3;
  var startOctave = 3;
  var endOctave = 6;

  var instrumentSelect = document.getElementById('as-instrument');
  var waveformSelect = document.getElementById('as-waveform');
  var masterVol = document.getElementById('as-master-vol');
  var attackSlider = document.getElementById('as-attack');
  var decaySlider = document.getElementById('as-decay');
  var keyboard = document.getElementById('as-keyboard');
  var btnSustain = document.getElementById('btn-sustain');
  var btnOctUp = document.getElementById('btn-oct-up');
  var btnOctDown = document.getElementById('btn-oct-down');
  var displayOctave = document.getElementById('display-octave');

  var checkReverb = document.getElementById('as-reverb');
  var checkDelay = document.getElementById('as-delay');
  
  var btnRecord = document.getElementById('btn-record');
  var recordTimer = document.getElementById('record-timer');
  var isRecording = false;
  var recStartTime = 0;
  var recTimerInterval = null;
  var loadingOverlay = document.getElementById('loading-overlay');

  // 节拍器
  var btnMetronome = document.getElementById('btn-metronome');
  var metroBpm = document.getElementById('metro-bpm');
  var metroSound = document.getElementById('metro-sound');
  var metroVolInput = document.getElementById('metro-vol');
  var isMetronomeOn = false;

  // ================= 音频路由构建 (核心) =================
  // 1. 总输出与限幅器 (防止爆音)
  var limiter = new Tone.Limiter(-1);
  var masterGain = new Tone.Gain(parseFloat(masterVol.value)).connect(limiter);
  limiter.toDestination();

  // 2. 录音分流
  var recorder = new Tone.Recorder();
  var synthRec = new Tone.Gain().connect(recorder);

  // 3. 效果器
  var reverb = new Tone.Reverb(2).connect(masterGain);
  var delay = new Tone.FeedbackDelay("8n", 0.5).connect(masterGain);

  // 4. 节拍器专用通道 (不连接 recorder)
  var metroVol = new Tone.Volume(-6).connect(masterGain);
  var metronome = null;

  // 主音量控制
  masterVol.addEventListener('input', function() {
    masterGain.gain.rampTo(parseFloat(this.value), 0.1);
  });

  // ================= 合成器引擎 =================
  var notesBase = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function initSynth() {
    if (synth) {
      synth.dispose();
      stopAllNotes();
    }
    
    var inst = instrumentSelect.value;
    var attack = parseFloat(attackSlider.value);
    var decay = parseFloat(decaySlider.value);

    var env = { attack: attack, decay: decay, sustain: 0.5, release: 1 };
    var envPiano = { attack: attack * 0.2, decay: decay * 2, sustain: 0.1, release: 1.5 };

    switch (inst) {
      case 'piano': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: envPiano }); break;
      case 'epiano': synth = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2, modulationIndex: 5, envelope: { attack: 0.01, decay: 1.2, sustain: 0.2, release: 1.2 } }); break;
      case 'guitar': synth = new Tone.PolySynth(Tone.AMSynth, { harmonicity: 3.5, oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 } }); break;
      case 'strings': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: Math.max(0.3, attack), decay: 0.2, sustain: 0.8, release: 2 } }); break;
      case 'lead': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, envelope: env }); break;
      case 'pad': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 20 }, envelope: { attack: 1, decay: 0.5, sustain: 0.8, release: 2 } }); break;
      case 'bass': synth = new Tone.PolySynth(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass', rolloff: -24 }, envelope: env }); break;
      case 'organ': synth = new Tone.PolySynth(Tone.AMSynth, { harmonicity: 3, oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.1, sustain: 1.0, release: 0.1 } }); break;
      case 'musicbox': synth = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 5, modulationIndex: 10, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.8 } }); break;
      case 'ukulele': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.05, release: 0.5 } }); break;
      case 'marimba': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 } }); break;
      case 'custom': synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: waveformSelect.value }, envelope: env }); break;
    }

    synth.maxPolyphony = 24; // 增加复音数防止丢音
    updateRouting();
  }

  function updateRouting() {
    synth.disconnect();
    
    // 干声
    synth.connect(masterGain);
    synth.connect(synthRec);
    
    // 效果器
    if (checkReverb.checked) { synth.connect(reverb); reverb.connect(synthRec); }
    if (checkDelay.checked) { synth.connect(delay); delay.connect(synthRec); }
  }

  // ================= 节拍器 =================
  function initMetronome() {
    if (metronome) metronome.dispose();
    var sound = metroSound.value;
    var synthType = 'sine';
    var env = { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 };
    if (sound === 'wood') { synthType = 'triangle'; env.decay = 0.05; }
    if (sound === 'click') { synthType = 'square'; env.decay = 0.02; }

    metronome = new Tone.MembraneSynth({
      pitchDecay: 0.008, octaves: 2, oscillator: { type: synthType }, envelope: env
    }).connect(metroVol);

    Tone.Transport.bpm.value = parseInt(metroBpm.value, 10);
    Tone.Transport.cancel();
    Tone.Transport.scheduleRepeat(function(time) {
      if (isMetronomeOn) {
        metronome.triggerAttackRelease("C2", "16n", time);
      }
    }, "4n");
  }

  btnMetronome.addEventListener('click', async function() {
    await Tone.start();
    isMetronomeOn = !isMetronomeOn;
    if (isMetronomeOn) {
      Tone.Transport.start();
      this.textContent = '⏹️ 停止';
      this.classList.add('active');
    } else {
      Tone.Transport.stop();
      this.textContent = '▶️ 启动';
      this.classList.remove('active');
    }
  });

  metroBpm.addEventListener('input', function() { Tone.Transport.bpm.value = parseInt(this.value, 10); });
  metroSound.addEventListener('change', initMetronome);
  metroVolInput.addEventListener('input', function() {
    var vol = parseFloat(this.value);
    metroVol.volume.rampTo(vol === 0 ? -Infinity : (20 * Math.log10(vol)), 0.1);
  });

  // ================= 完美键盘渲染引擎 =================
  function renderKeyboard() {
    keyboard.innerHTML = '';
    
    // 计算白键总数 (每八度 7 个白键)
    var numOctaves = endOctave - startOctave;
    var whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    var blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];
    
    // 黑键在白键数组中的相对索引 (用于计算绝对定位的 left)
    // 比如 C# 在 C(0) 和 D(1) 之间，位置为 (0 + 1) 个白键宽度的位置
    var blackOffsets = {
      'C#': 1, 'D#': 2, 'F#': 4, 'G#': 5, 'A#': 6
    };

    var totalWhiteKeys = (numOctaves * 7) + 1; // 最后一个八度的 C
    var whiteKeyWidthPercent = 100 / totalWhiteKeys;

    // 1. 生成白键
    for (var oct = startOctave; oct <= endOctave; oct++) {
      for (var i = 0; i < whiteNotes.length; i++) {
        if (oct === endOctave && i > 0) break; // 最高八度只到 C
        var noteName = whiteNotes[i] + oct;
        var key = document.createElement('div');
        key.className = 'as-key white';
        key.dataset.note = noteName;
        key.textContent = noteName;
        keyboard.appendChild(key);
      }
    }

    // 2. 生成黑键 (使用绝对定位)
    var whiteKeyIndex = 0;
    for (var oct = startOctave; oct <= endOctave; oct++) {
      for (var i = 0; i < whiteNotes.length; i++) {
        if (oct === endOctave && i > 0) break;
        
        var whiteNote = whiteNotes[i];
        var blackNote = whiteNote + '#'; // 比如 C#
        
        // 如果当前白键后面跟着黑键（E 和 B 后面没有黑键）
        if (blackNotes.indexOf(blackNote) !== -1) {
          var noteName = blackNote + oct;
          var key = document.createElement('div');
          key.className = 'as-key black';
          key.dataset.note = noteName;
          key.textContent = noteName;
          
          // 计算绝对定位
          // 黑键中心对准两个白键的交界处
          var leftPercent = ((whiteKeyIndex + 1) * whiteKeyWidthPercent) - (whiteKeyWidthPercent * 0.3); // 30%宽度
          
          key.style.left = leftPercent + '%';
          key.style.width = (whiteKeyWidthPercent * 0.6) + '%'; // 黑键宽度为白键的 60%
          
          keyboard.appendChild(key);
        }
        whiteKeyIndex++;
      }
    }
  }

  // ================= 发声交互逻辑 =================
  function playNote(note, el) {
    if (activeNotes.has(note)) return;
    activeNotes.add(note);
    Tone.start();
    
    // 如果有延音踏板，从延音池中移除
    if (sustainedNotes.has(note)) {
      sustainedNotes.delete(note);
    }
    
    synth.triggerAttack(note);
    if (el) el.classList.add('active');
  }

  function stopNote(note, el) {
    if (!activeNotes.has(note)) return;
    activeNotes.delete(note);
    
    if (isSustainOn) {
      // 如果延音开启，放入延音池，不立刻停止
      sustainedNotes.add(note);
    } else {
      synth.triggerRelease(note);
    }
    if (el) el.classList.remove('active');
  }

  function stopAllNotes() {
    activeNotes.forEach(function(note) { synth.triggerRelease(note); });
    sustainedNotes.forEach(function(note) { synth.triggerRelease(note); });
    activeNotes.clear();
    sustainedNotes.clear();
    var activeEls = keyboard.querySelectorAll('.as-key.active');
    activeEls.forEach(function(el) { el.classList.remove('active'); });
  }

  // 事件代理
  keyboard.addEventListener('mousedown', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); playNote(key.dataset.note, key); }
  });
  keyboard.addEventListener('mouseup', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); stopNote(key.dataset.note, key); }
  });
  
  window.addEventListener('mouseup', function() { 
    // 松手时如果没有开启延音，则全部停止
    if (!isSustainOn) stopAllNotes(); 
  });

  keyboard.addEventListener('touchstart', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); playNote(key.dataset.note, key); }
  }, { passive: false });
  
  keyboard.addEventListener('touchend', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); stopNote(key.dataset.note, key); }
  });
  
  // 移动端滑音
  keyboard.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var touch = e.touches[0];
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    var key = el ? el.closest('.as-key') : null;
    
    // 停止当前未触摸的
    activeNotes.forEach(function(note) {
      if (!key || key.dataset.note !== note) {
        stopNote(note, keyboard.querySelector('.as-key[data-note="' + note + '"]'));
      }
    });
    
    if (key) playNote(key.dataset.note, key);
  }, { passive: false });

  // 电脑键盘映射 (A-L, W-P)
  // 将键盘按键映射到当前八度的音符
  var keyMap = { 'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13, 'l': 14, 'p': 15, ';': 16, "'": 17 };
  
  document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    var keyChar = e.key.toLowerCase();
    var offset = keyMap[keyChar];
    
    if (offset !== undefined) {
      // 基准是当前选中的起始八度
      var note = notesBase[offset % 12] + (currentBaseOctave + Math.floor(offset / 12));
      playNote(note, keyboard.querySelector('.as-key[data-note="' + note + '"]'));
    } else if (e.code === 'Space') {
      e.preventDefault();
      toggleSustain();
    } else if (e.code === 'KeyZ') {
      shiftOctave(-1);
    } else if (e.code === 'KeyX') {
      shiftOctave(1);
    }
  });
  
  document.addEventListener('keyup', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    var offset = keyMap[e.key.toLowerCase()];
    if (offset !== undefined) {
      var note = notesBase[offset % 12] + (currentBaseOctave + Math.floor(offset / 12));
      stopNote(note, keyboard.querySelector('.as-key[data-note="' + note + '"]'));
    }
  });

  // ================= 控件交互 =================
  function shiftOctave(dir) {
    var newBase = currentBaseOctave + dir;
    if (newBase < 1 || newBase > 6) return showToast('已达到音域极限', true);
    
    currentBaseOctave = newBase;
    startOctave = newBase;
    endOctave = newBase + 3;
    
    displayOctave.textContent = 'C' + startOctave + ' - C' + endOctave;
    renderKeyboard();
  }

  btnOctDown.addEventListener('click', function() { shiftOctave(-1); });
  btnOctUp.addEventListener('click', function() { shiftOctave(1); });

  function toggleSustain() {
    isSustainOn = !isSustainOn;
    btnSustain.classList.toggle('active', isSustainOn);
    
    if (!isSustainOn) {
      // 关闭延音时，释放所有延音池中的音
      sustainedNotes.forEach(function(note) { synth.triggerRelease(note); });
      sustainedNotes.clear();
    }
    showToast(isSustainOn ? '延音踏板: 开启' : '延音踏板: 关闭');
  }

  btnSustain.addEventListener('click', toggleSustain);

  instrumentSelect.addEventListener('change', function() {
    waveformSelect.style.display = this.value === 'custom' ? 'block' : 'none';
    initSynth();
  });
  [waveformSelect, attackSlider, decaySlider].forEach(function(el) {
    el.addEventListener('input', initSynth);
  });
  checkReverb.addEventListener('change', updateRouting);
  checkDelay.addEventListener('change', updateRouting);

  // ================= WAV 录制 =================
  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function audioBufferToWav(buffer) {
    var numOfChan = buffer.numberOfChannels, length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length), view = new DataView(bufferArr),
        channels = [], i, sample, offset = 0, pos = 0;

    view.setUint32(0, 0x46464952, true); view.setUint32(4, length - 8, true);
    view.setUint32(8, 0x45564157, true); view.setUint32(12, 0x20746d66, true); 
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); 
    view.setUint16(22, numOfChan, true); view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
    view.setUint16(32, numOfChan * 2, true); view.setUint16(34, 16, true);
    view.setUint32(36, 0x61746164, true); view.setUint32(40, length - 44, true);
    pos = 44;

    for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([bufferArr], { type: "audio/wav" });
  }

  async function downloadAsWav(webmBlob) {
    try {
      var arrayBuffer = await webmBlob.arrayBuffer();
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      var wavBlob = audioBufferToWav(audioBuffer);
      
      var url = URL.createObjectURL(wavBlob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'synth_recording_' + Date.now() + '.wav';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
      showToast('WAV 录制完成');
    } catch (e) {
      console.error('WAV 转换失败', e);
      showToast('转码失败，将下载原始 WebM 格式', true);
      var url = URL.createObjectURL(webmBlob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'synth_recording_' + Date.now() + '.webm';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    }
  }

  btnRecord.addEventListener('click', async function() {
    if (!isRecording) {
      await Tone.start();
      await recorder.start();
      isRecording = true;
      btnRecord.textContent = '⏹️ 停止并下载';
      btnRecord.classList.add('recording');
      
      recordTimer.style.display = 'inline-block';
      recStartTime = Date.now();
      recTimerInterval = setInterval(function() {
        recordTimer.textContent = formatTime((Date.now() - recStartTime) / 1000);
      }, 1000);
    } else {
      btnRecord.textContent = '⏳ 正在转码...';
      btnRecord.classList.remove('recording');
      btnRecord.disabled = true;
      clearInterval(recTimerInterval);
      recordTimer.style.display = 'none';
      
      loadingOverlay.style.display = 'flex';
      
      var recording = await recorder.stop();
      isRecording = false;
      
      // 延迟一点显示 Loading，确保 UI 线程刷新
      setTimeout(async function() {
        await downloadAsWav(recording);
        loadingOverlay.style.display = 'none';
        btnRecord.textContent = '🔴 开始录音 (WAV)';
        btnRecord.disabled = false;
      }, 100);
    }
  });

  // ================= 初始化 =================
  initSynth();
  initMetronome();
  renderKeyboard();
  
  // 窗口改变时重绘键盘
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderKeyboard, 200);
  });

})();