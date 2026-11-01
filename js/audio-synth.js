(function () {
  var synth = null;
  var waveform = document.getElementById('as-waveform');
  var attackSlider = document.getElementById('as-attack');
  var decaySlider = document.getElementById('as-decay');
  var keyboard = document.getElementById('as-keyboard');

  // 音符与频率对应表
  var notes = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];
  
  // 初始化合成器
  function initSynth() {
    if (synth) synth.dispose();
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.set({
      oscillator: { type: waveform.value },
      envelope: {
        attack: parseFloat(attackSlider.value),
        decay: parseFloat(decaySlider.value),
        sustain: 0.5,
        release: 1
      }
    });
  }

  // 生成键盘
  function renderKeyboard() {
    keyboard.innerHTML = '';
    notes.forEach(function (note) {
      var key = document.createElement('div');
      var isBlack = note.includes('#');
      key.className = 'as-key' + (isBlack ? ' black' : '');
      key.textContent = note;
      
      // 鼠标/触摸按下
      var startNote = function (e) {
        e.preventDefault();
        key.classList.add('active');
        Tone.start(); // 确保 AudioContext 启动
        synth.triggerAttack(note);
      };
      
      // 鼠标/触摸抬起
      var endNote = function (e) {
        e.preventDefault();
        key.classList.remove('active');
        synth.triggerRelease(note);
      };

      key.addEventListener('mousedown', startNote);
      key.addEventListener('mouseup', endNote);
      key.addEventListener('mouseleave', endNote);
      key.addEventListener('touchstart', startNote, { passive: false });
      key.addEventListener('touchend', endNote, { passive: false });

      keyboard.appendChild(key);
    });
  }

  // 监听配置更改
  waveform.addEventListener('change', initSynth);
  attackSlider.addEventListener('input', initSynth);
  decaySlider.addEventListener('input', initSynth);

  // 物理键盘映射 (可选，很酷)
  var keyMap = { 'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4', 'k': 'C5' };
  document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    var note = keyMap[e.key.toLowerCase()];
    if (note) {
      Tone.start();
      synth.triggerAttack(note);
      var el = Array.from(keyboard.children).find(function(k) { return k.textContent === note; });
      if (el) el.classList.add('active');
    }
  });
  document.addEventListener('keyup', function(e) {
    var note = keyMap[e.key.toLowerCase()];
    if (note) {
      synth.triggerRelease(note);
      var el = Array.from(keyboard.children).find(function(k) { return k.textContent === note; });
      if (el) el.classList.remove('active');
    }
  });

  // 初始化
  initSynth();
  renderKeyboard();
})();