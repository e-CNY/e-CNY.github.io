(function () {
  var dropZone = document.getElementById('au-drop-zone');
  var fileInput = document.getElementById('au-input');
  var workspace = document.getElementById('au-workspace');
  var canvas = document.getElementById('au-canvas');
  var ctx = canvas.getContext('2d');
  
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var audioBuffer = null;
  var originalBuffer = null; // 用于倒放恢复
  var sourceNode = null;
  var isPlaying = false;
  var startTime = 0;
  var pausedAt = 0;
  var reqId = null;

  var btnPlay = document.getElementById('au-play');
  var btnPause = document.getElementById('au-pause');
  var btnReverse = document.getElementById('au-reverse');
  var volSlider = document.getElementById('au-volume');
  var timeDisplay = document.getElementById('au-time');
  var startInput = document.getElementById('au-start');
  var endInput = document.getElementById('au-end');

  // 1. 加载与绘制
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
        originalBuffer = buffer;
        drawWaveform(buffer);
        
        startInput.max = buffer.duration.toFixed(1);
        startInput.value = 0;
        endInput.max = buffer.duration.toFixed(1);
        endInput.value = buffer.duration.toFixed(1);
        
        timeDisplay.textContent = '00:00 / ' + formatTime(buffer.duration);
        drawWaveform(buffer);
      }, function(err) {
        alert('音频解析失败，可能浏览器不支持该格式。');
        dropZone.style.display = 'flex';
        workspace.style.display = 'none';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  function drawWaveform(buffer, highlightStart, highlightEnd) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    var data = buffer.getChannelData(0);
    var step = Math.ceil(data.length / canvas.width);
    var amp = canvas.height / 2;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制选区高亮
    if (highlightStart !== undefined && highlightEnd !== undefined) {
      var startX = (highlightStart / buffer.duration) * canvas.width;
      var endX = (highlightEnd / buffer.duration) * canvas.width;
      ctx.fillStyle = 'rgba(123, 160, 91, 0.2)';
      ctx.fillRect(startX, 0, endX - startX, canvas.height);
    }

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

  // 监听裁剪输入，刷新高亮
  function updateHighlight() {
    if (!audioBuffer) return;
    var s = parseFloat(startInput.value) || 0;
    var e = parseFloat(endInput.value) || audioBuffer.duration;
    drawWaveform(audioBuffer, s, e);
  }
  startInput.addEventListener('input', updateHighlight);
  endInput.addEventListener('input', updateHighlight);

  // 2. 播放控制
  btnPlay.addEventListener('click', function() {
    if (!audioBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (!isPlaying) {
      sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);
      sourceNode.onended = function() {
        if (isPlaying) { // 自然播放结束
          isPlaying = false;
          btnPlay.disabled = false;
          btnPause.disabled = true;
          cancelAnimationFrame(reqId);
          pausedAt = 0;
        }
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
      isPlaying = false; // 阻止 onended 触发重置
      sourceNode.stop();
      pausedAt = audioCtx.currentTime - startTime;
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

  // 点击波形图跳转
  document.getElementById('wave-wrap').addEventListener('click', function(e) {
    if (!audioBuffer) return;
    var rect = this.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var percent = x / rect.width;
    pausedAt = percent * audioBuffer.duration;
    
    // 如果正在播放，重新开始
    if (isPlaying) {
      sourceNode.stop();
      isPlaying = false;
      btnPlay.click();
    } else {
      timeDisplay.textContent = formatTime(pausedAt) + ' / ' + formatTime(audioBuffer.duration);
    }
  });

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  volSlider.addEventListener('input', function() {
    document.getElementById('au-vol-val').textContent = Math.round(this.value * 100) + '%';
  });

  // 倒放功能
  btnReverse.addEventListener('click', function() {
    if (!audioBuffer) return;
    var reversed = audioCtx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
    for (var i = 0; i < audioBuffer.numberOfChannels; i++) {
      var channelData = audioBuffer.getChannelData(i);
      reversed.copyToChannel(channelData.slice().reverse(), i);
    }
    audioBuffer = reversed;
    drawWaveform(reversed);
    btnPause.click(); // 停止播放
    pausedAt = 0;
  });

  // 3. 导出 WAV
  function bufferToWav(buffer, startSec, endSec, isMono) {
    var sampleRate = buffer.sampleRate;
    var startSample = Math.floor(startSec * sampleRate);
    var endSample = Math.floor(endSec * sampleRate);
    var length = endSample - startSample;
    
    var numChannels = isMono ? 1 : buffer.numberOfChannels;
    var bufferArr = new ArrayBuffer(44 + length * numChannels * 2);
    var view = new DataView(bufferArr);

    function writeString(view, offset, string) {
      for (var i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    var offset = 44;
    var vol = parseFloat(volSlider.value);
    
    if (isMono) {
      var ch0 = buffer.getChannelData(0);
      var ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
      for (var i = startSample; i < endSample; i++) {
        var s = ((ch0[i] + ch1[i]) / 2) * vol;
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    } else {
      var chData = [];
      for (var c = 0; c < buffer.numberOfChannels; c++) chData.push(buffer.getChannelData(c));
      for (var i = startSample; i < endSample; i++) {
        for (var c = 0; c < numChannels; c++) {
          var s = chData[c][i] * vol;
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
        }
      }
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  document.getElementById('au-export').addEventListener('click', function() {
    if (!audioBuffer) return;
    var startSec = parseFloat(startInput.value);
    var endSec = parseFloat(endInput.value);
    var isMono = document.getElementById('au-channel').value === 'mono';

    if (startSec < 0 || endSec > audioBuffer.duration || startSec >= endSec) {
      return alert('请输入有效的起点和终点时间');
    }

    try {
      var wavBlob = bufferToWav(audioBuffer, startSec, endSec, isMono);
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