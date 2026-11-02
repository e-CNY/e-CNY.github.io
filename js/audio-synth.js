(function () {
  var synth = null;
  
  // ================= 路由重构（核心） =================
  var reverb = new Tone.Reverb(2);
  var delay = new Tone.FeedbackDelay("8n", 0.5);
  var recorder = new Tone.Recorder();
  
  // 合成器分流：一路去喇叭，一路去录音
  var synthOut = new Tone.Gain().toDestination();
  var synthRec = new Tone.Gain().connect(recorder);
  
  // 节拍器节点：只去喇叭，不进录音
  var metroVol = new Tone.Volume(-6).toDestination();
  var metronome = null;

  var startOctave = 3;
  var endOctave = 6;
  var notesBase = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  var instrumentSelect = document.getElementById('as-instrument');
  var waveform = document.getElementById('as-waveform');
  var attackSlider = document.getElementById('as-attack');
  var decaySlider = document.getElementById('as-decay');
  var keyboard = document.getElementById('as-keyboard');
  
  var checkReverb = document.getElementById('as-reverb');
  var checkDelay = document.getElementById('as-delay');
  var checkShowNotes = document.getElementById('as-show-notes');
  var btnRecord = document.getElementById('btn-record');
  var isRecording = false;

  // 节拍器 UI
  var btnMetronome = document.getElementById('btn-metronome');
  var metroBpm = document.getElementById('metro-bpm');
  var metroSound = document.getElementById('metro-sound');
  var metroVolInput = document.getElementById('metro-vol');
  var isMetronomeOn = false;

  var activeNotes = new Set();

  // ================= 合成器初始化 =================
  function initSynth() {
    if (synth) {
      synth.dispose();
      activeNotes.clear();
    }
    
    var inst = instrumentSelect.value;
    var attack = parseFloat(attackSlider.value);
    var decay = parseFloat(decaySlider.value);

    switch (inst) {
      case 'piano':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: attack * 0.2, decay: decay * 2, sustain: 0.1, release: 1.5 } });
        break;
      case 'epiano':
        synth = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 2, modulationIndex: 5, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 1.2, sustain: 0.2, release: 1.2 } });
        break;
      case 'guitar':
        synth = new Tone.PolySynth(Tone.AMSynth, { harmonicity: 3.5, oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 0.8 } });
        break;
      case 'strings':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: Math.max(0.3, attack), decay: 0.2, sustain: 0.8, release: 2 } });
        break;
      case 'lead':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 } });
        break;
      case 'pad':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 20 }, envelope: { attack: 1, decay: 0.5, sustain: 0.8, release: 2 } });
        break;
      case 'bass':
        synth = new Tone.PolySynth(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 2, type: 'lowpass', rolloff: -24 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 } });
        break;
      case 'organ':
        synth = new Tone.PolySynth(Tone.AMSynth, { harmonicity: 3, oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.1, sustain: 1.0, release: 0.1 } });
        break;
      case 'musicbox':
        synth = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 5, modulationIndex: 10, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.8 } });
        break;
      case 'ukulele':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.05, release: 0.5 } });
        break;
      case 'marimba':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 } });
        break;
      case 'custom':
        synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: waveform.value }, envelope: { attack: attack, decay: decay, sustain: 0.5, release: 1 } });
        break;
    }

    synth.maxPolyphony = 15;
    updateRouting();
  }

  // 动态路由
  function updateRouting() {
    synth.disconnect();
    
    // 干声分流
    synth.connect(synthOut);
    synth.connect(synthRec);
    
    // 效果器分流
    if (checkReverb.checked) {
      synth.connect(reverb);
      reverb.connect(synthOut);
      reverb.connect(synthRec);
    }
    if (checkDelay.checked) {
      synth.connect(delay);
      delay.connect(synthOut);
      delay.connect(synthRec);
    }
  }

  // ================= 节拍器逻辑 =================
  function initMetronome() {
    if (metronome) metronome.dispose();
    
    var sound = metroSound.value;
    var synthType = 'sine';
    var env = { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 };
    
    if (sound === 'wood') { synthType = 'triangle'; env.decay = 0.05; }
    if (sound === 'click') { synthType = 'square'; env.decay = 0.02; }

    // 节拍器只连接 metroVol (不进录音)
    metronome = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      oscillator: { type: synthType },
      envelope: env
    }).connect(metroVol);

    Tone.Transport.bpm.value = parseInt(metroBpm.value, 10);
    
    // 每拍触发
    Tone.Transport.scheduleRepeat(function(time) {
      if (isMetronomeOn) {
        metronome.triggerAttackRelease("C2", "16n", time);
      }
    }, "4n");
  }

  btnMetronome.addEventListener('click', function() {
    Tone.start();
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

  metroBpm.addEventListener('input', function() {
    Tone.Transport.bpm.value = parseInt(this.value, 10);
  });

  metroSound.addEventListener('change', initMetronome);

  metroVolInput.addEventListener('input', function() {
    // 将 0-1 映射到 -Infinity 到 0 dB
    var vol = parseFloat(this.value);
    metroVol.volume.value = vol === 0 ? -Infinity : (20 * Math.log10(vol));
  });

  // ================= 键盘渲染与交互 =================
  function renderKeyboard() {
    keyboard.innerHTML = '';
    var showNotes = checkShowNotes.checked;
    
    for (var oct = startOctave; oct <= endOctave; oct++) {
      for (var i = 0; i < notesBase.length; i++) {
        if (oct === endOctave && i > 0) break; 
        var noteName = notesBase[i] + oct;
        var key = document.createElement('div');
        var isBlack = noteName.includes('#');
        key.className = 'as-key' + (isBlack ? ' black' : '');
        key.dataset.note = noteName;
        if (showNotes) key.textContent = noteName;
        keyboard.appendChild(key);
      }
    }
  }

  function playNote(note, el) {
    if (activeNotes.has(note)) return;
    activeNotes.add(note);
    Tone.start();
    synth.triggerAttack(note);
    if (el) el.classList.add('active');
  }

  function stopNote(note, el) {
    if (!activeNotes.has(note)) return;
    activeNotes.delete(note);
    synth.triggerRelease(note);
    if (el) el.classList.remove('active');
  }

  function stopAllNotes() {
    activeNotes.forEach(function(note) { synth.triggerRelease(note); });
    activeNotes.clear();
    var activeEls = keyboard.querySelectorAll('.as-key.active');
    activeEls.forEach(function(el) { el.classList.remove('active'); });
  }

  keyboard.addEventListener('mousedown', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); playNote(key.dataset.note, key); }
  });
  keyboard.addEventListener('mouseup', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); stopNote(key.dataset.note, key); }
  });
  window.addEventListener('mouseup', function() { if (activeNotes.size > 0) stopAllNotes(); });
  window.addEventListener('touchend', function() { if (activeNotes.size > 0) stopAllNotes(); });

  keyboard.addEventListener('touchstart', function (e) {
    var key = e.target.closest('.as-key');
    if (key) { e.preventDefault(); playNote(key.dataset.note, key); }
  }, { passive: false });
  
  keyboard.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var touch = e.touches[0];
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    var key = el ? el.closest('.as-key') : null;
    if (key) playNote(key.dataset.note, key);
    else stopAllNotes();
  }, { passive: false });

  var keyMap = { 'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13, 'l': 14, 'p': 15, ';': 16, "'": 17 };
  document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    var offset = keyMap[e.key.toLowerCase()];
    if (offset !== undefined) {
      var note = notesBase[offset % 12] + (4 + Math.floor(offset / 12));
      playNote(note, keyboard.querySelector('.as-key[data-note="' + note + '"]'));
    }
  });
  document.addEventListener('keyup', function(e) {
    var offset = keyMap[e.key.toLowerCase()];
    if (offset !== undefined) {
      var note = notesBase[offset % 12] + (4 + Math.floor(offset / 12));
      stopNote(note, keyboard.querySelector('.as-key[data-note="' + note + '"]'));
    }
  });

  instrumentSelect.addEventListener('change', function() {
    waveform.style.display = this.value === 'custom' ? 'block' : 'none';
    initSynth();
  });
  [waveform, attackSlider, decaySlider].forEach(function(el) {
    el.addEventListener('input', initSynth);
  });
  checkReverb.addEventListener('change', updateRouting);
  checkDelay.addEventListener('change', updateRouting);
  checkShowNotes.addEventListener('change', renderKeyboard);

  // ================= WAV 录制 =================
  function audioBufferToWav(buffer) {
    var numOfChan = buffer.numberOfChannels, length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length), view = new DataView(bufferArr),
        channels = [], i, sample, offset = 0, pos = 0;

    view.setUint32(0, 0x46464952, true); 
    view.setUint32(4, length - 8, true);
    view.setUint32(8, 0x45564157, true); 
    view.setUint32(12, 0x20746d66, true); 
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x61746164, true); 
    view.setUint32(40, length - 44, true);
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
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('WAV 转换失败', e);
      var url = URL.createObjectURL(webmBlob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'synth_recording_' + Date.now() + '.webm';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  btnRecord.addEventListener('click', async function() {
    if (!isRecording) {
      await recorder.start();
      isRecording = true;
      btnRecord.textContent = '⏹️ 停止并下载 (WAV)';
      btnRecord.classList.add('recording');
    } else {
      btnRecord.textContent = '⏳ 正在生成 WAV...';
      btnRecord.classList.remove('recording');
      btnRecord.disabled = true;

      var recording = await recorder.stop();
      isRecording = false;
      
      await downloadAsWav(recording);
      
      btnRecord.textContent = '🔴 开始录音 (WAV)';
      btnRecord.disabled = false;
    }
  });

  // 初始化
  initSynth();
  initMetronome();
  renderKeyboard();
})();