(function () {
  var dropZone = document.getElementById('au-drop-zone');
  var fileInput = document.getElementById('au-input');
  var workspace = document.getElementById('au-workspace');
  var canvas = document.getElementById('au-canvas');
  var ctx = canvas.getContext('2d');
  
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var audioBuffer = null;
  var audioEl = new Audio();
  var sourceNode = null;
  var isPlaying = false;
  var startTime = 0;
  var pausedAt = 0;
  var reqId = null;

  var btnPlay = document.getElementById('au-play');
  var btnPause = document.getElementById('au-pause');
  var volSlider = document.getElementById('au-volume');
  var timeDisplay = document.getElementById('au-time');

  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) loadFile(this.files[0]);
    this.value = '';
  });

  function loadFile(file) {
    dropZone.style.display = 'none';
    workspace.style.display = 'block';
    timeDisplay.textContent = '解析中...';

    var reader = new FileReader();
    reader.onload = function(e) {
      audioCtx.decodeAudioData(e.target.result, function(buffer) {
        audioBuffer = buffer;
        drawWaveform(buffer);
        
        // 设置最大时间
        document.getElementById('au-end').value = buffer.duration.toFixed(1);
        document.getElementById('au-end').max = buffer.duration.toFixed(1);
        document.getElementById('au-start').max = buffer.duration.toFixed(1);
        
        updateTimeDisplay(0, buffer.duration);
        timeDisplay.textContent = '00:00 / ' + formatTime(buffer.duration);
      }, function(err) {
        alert('音频解析失败，格式可能不受支持。');
        dropZone.style.display = 'flex';
        workspace.style.display = 'none';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  function drawWaveform(buffer) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    var data = buffer.getChannelData(0);
    var step = Math.ceil(data.length / canvas.width);
    var amp = canvas.height / 2;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#7ba05b';

    for (var i = 0; i < canvas.width; i++) {
      var min = 1.0, max = -1.0;
      for (var j = 0; j < step; j++) {
        var datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      var x = i;
      var y1 = (1 + min) * amp;
      var y2 = (1 + max) * amp;
      ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }

  // 播放逻辑
  btnPlay.addEventListener('click', function() {
    if (!audioBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (!isPlaying) {
      sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);
      
      sourceNode.onended = function() {
        isPlaying = false;
        btnPlay.disabled = false;
        btnPause.disabled = true;
        cancelAnimationFrame(reqId);
        pausedAt = 0;
      };

      sourceNode.start(0, pausedAt);
      startTime = audioCtx.currentTime - pausedAt;
      isPlaying = true;
      btnPlay.disabled = true;
      btnPause.disabled = false;
      
      updatePlayback();
    }
  });

  btnPause.addEventListener('click', function() {
    if (isPlaying) {
      sourceNode.stop();
      pausedAt = audioCtx.currentTime - startTime;
      isPlaying = false;
      btnPlay.disabled = false;
      btnPause.disabled = true;
      cancelAnimationFrame(reqId);
    }
  });

  function updatePlayback() {
    if (!isPlaying) return;
    var curr = audioCtx.currentTime - startTime;
    if (curr >= audioBuffer.duration) curr = audioBuffer.duration;
    timeDisplay.textContent = formatTime(curr) + ' / ' + formatTime(audioBuffer.duration);
    reqId = requestAnimationFrame(updatePlayback);
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function updateTimeDisplay(curr, total) {}

  volSlider.addEventListener('input', function() {
    document.getElementById('au-vol-val').textContent = Math.round(this.value * 100) + '%';
  });

  // ================= 导出 WAV (裁剪) =================
  function bufferToWav(buffer, startSec, endSec) {
    var sampleRate = buffer.sampleRate;
    var startSample = Math.floor(startSec * sampleRate);
    var endSample = Math.floor(endSec * sampleRate);
    var length = endSample - startSample;

    // WAV 头部
    var bufferArr = new ArrayBuffer(44 + length * 2);
    var view = new DataView(bufferArr);

    function writeString(view, offset, string) {
      for (var i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * 2, true);

    // 写入音频数据
    var channelData = buffer.getChannelData(0);
    var vol = parseFloat(volSlider.value);
    var offset = 44;
    for (var i = startSample; i < endSample; i++) {
      var sample = Math.max(-1, Math.min(1, channelData[i])) * vol;
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  document.getElementById('au-export').addEventListener('click', function() {
    if (!audioBuffer) return;
    var startSec = parseFloat(document.getElementById('au-start').value);
    var endSec = parseFloat(document.getElementById('au-end').value);

    if (startSec < 0 || endSec > audioBuffer.duration || startSec >= endSec) {
      return alert('请输入有效的起点和终点时间');
    }

    try {
      var wavBlob = bufferToWav(audioBuffer, startSec, endSec);
      var url = URL.createObjectURL(wavBlob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'cropped_' + Date.now() + '.wav';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败: ' + e.message);
    }
  });
})();