(function () {
  var btnRecord = document.getElementById('btn-record');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');
  var btnDownload = document.getElementById('btn-download');
  var timerEl = document.getElementById('ar-timer');
  var canvas = document.getElementById('ar-canvas');
  var ctx = canvas.getContext('2d');
  var visualModeSelect = document.getElementById('ar-visual-mode');
  
  var editorPanel = document.getElementById('ar-editor-panel');
  var audioPlayer = document.getElementById('ar-audio-player');
  var trimStart = document.getElementById('trim-start');
  var trimEnd = document.getElementById('trim-end');
  var labelStart = document.getElementById('label-start');
  var labelEnd = document.getElementById('label-end');
  var volGain = document.getElementById('vol-gain');
  var labelGain = document.getElementById('label-gain');
  var exportFilename = document.getElementById('export-filename');
  var exportFormat = document.getElementById('export-format');

  var mediaStream = null;
  var audioCtx = null;
  var analyser = null;
  var mediaRecorder = null;
  var audioChunks = [];
  
  var startTime = 0;
  var pausedTime = 0;
  var timerInterval = null;
  var reqId = null;
  var isRecording = false;
  var isPaused = false;
  
  var currentBlob = null;
  var originalAudioBuffer = null;

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // ================= 动态波形/频谱绘制 (录音时) =================
  function drawVisualizer() {
    if (!analyser || !isRecording || isPaused) return;
    
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    var mode = visualModeSelect.value;
    
    function draw() {
      if (!isRecording || isPaused) return;
      reqId = requestAnimationFrame(draw);
      
      var dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (mode === 'wave') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e74c3c';
        ctx.beginPath();
        var sliceWidth = canvas.width * 1.0 / bufferLength;
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {
          var v = dataArray[i] / 128.0;
          var y = v * canvas.height / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(dataArray);
        var barWidth = (canvas.width / bufferLength) * 2.5;
        var barHeight;
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 255 * canvas.height;
          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    }
    draw();
  }

  // ================= 静态波形绘制 (录音结束后) =================
  function drawStaticWaveform(audioBuffer) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = '#fdf8ec'; // 浅色背景
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    var data = audioBuffer.getChannelData(0);
    var step = Math.ceil(data.length / canvas.width);
    var amp = canvas.height / 2;
    
    ctx.fillStyle = '#8a5a2b'; // 棕色波形
    
    for (var i = 0; i < canvas.width; i++) {
      var min = 1.0;
      var max = -1.0;
      for (var j = 0; j < step; j++) {
        var datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      var h = (max - min) * amp;
      var y = (1 + min) * amp;
      ctx.fillRect(i, y, 1, Math.max(1, h));
    }
  }

  // ================= 录音控制 =================
  btnRecord.addEventListener('click', async function () {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      var source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
      audioChunks = [];
      
      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstop = async function () {
        currentBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioPlayer.src = URL.createObjectURL(currentBlob);
        
        // 解析为 AudioBuffer，用于裁剪和静态波形
        var arrayBuffer = await currentBlob.arrayBuffer();
        var tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        originalAudioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        tempCtx.close();
        
        // 设置裁剪滑块的最大时间
        trimStart.max = originalAudioBuffer.duration;
        trimEnd.max = originalAudioBuffer.duration;
        trimStart.value = 0;
        trimEnd.value = originalAudioBuffer.duration;
        
        labelStart.textContent = formatTime(0);
        labelEnd.textContent = formatTime(originalAudioBuffer.duration);
        
        drawStaticWaveform(originalAudioBuffer);
        editorPanel.style.display = 'block';
      };
      
      mediaRecorder.start();
      
      isRecording = true;
      isPaused = false;
      btnRecord.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
      editorPanel.style.display = 'none';
      
      startTime = Date.now() - pausedTime;
      timerEl.textContent = formatTime(pausedTime / 1000);
      
      timerInterval = setInterval(function () {
        timerEl.textContent = formatTime((Date.now() - startTime) / 1000);
      }, 1000);
      
      drawVisualizer();
      
    } catch (err) {
      alert('无法访问麦克风，请确保授予了权限。\n' + err.message);
    }
  });

  btnPause.addEventListener('click', function () {
    if (!isRecording) return;
    
    if (!isPaused) {
      mediaRecorder.pause();
      clearInterval(timerInterval);
      cancelAnimationFrame(reqId);
      pausedTime = Date.now() - startTime;
      isPaused = true;
      btnPause.innerHTML = '<span class="ar-icon">▶️</span> 继续';
    } else {
      mediaRecorder.resume();
      startTime = Date.now() - pausedTime;
      timerInterval = setInterval(function () {
        timerEl.textContent = formatTime((Date.now() - startTime) / 1000);
      }, 1000);
      isPaused = false;
      btnPause.innerHTML = '<span class="ar-icon">⏸️</span> 暂停';
      drawVisualizer();
    }
  });

  btnStop.addEventListener('click', function () {
    if (!isRecording) return;
    
    isRecording = false;
    isPaused = false;
    pausedTime = 0;
    clearInterval(timerInterval);
    cancelAnimationFrame(reqId);
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(function (track) { track.stop(); });
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    
    btnRecord.disabled = false;
    btnPause.disabled = true;
    btnPause.innerHTML = '<span class="ar-icon">⏸️</span> 暂停';
    btnStop.disabled = true;
    timerEl.textContent = '00:00';
  });

  // ================= 编辑与导出逻辑 =================
  
  // 监听滑块更新标签
  trimStart.addEventListener('input', function() {
    labelStart.textContent = formatTime(parseFloat(this.value));
    if (parseFloat(this.value) >= parseFloat(trimEnd.value)) {
      trimEnd.value = this.value;
      labelEnd.textContent = formatTime(parseFloat(this.value));
    }
  });
  
  trimEnd.addEventListener('input', function() {
    labelEnd.textContent = formatTime(parseFloat(this.value));
    if (parseFloat(this.value) <= parseFloat(trimStart.value)) {
      trimStart.value = this.value;
      labelStart.textContent = formatTime(parseFloat(this.value));
    }
  });

  volGain.addEventListener('input', function() {
    labelGain.textContent = parseFloat(this.value).toFixed(1) + 'x';
  });

  btnDownload.addEventListener('click', async function () {
    if (!originalAudioBuffer) return;
    
    var format = exportFormat.value;
    var filename = exportFilename.value.trim() || '我的录音';
    
    if (format === 'webm') {
      // 直接下载原始的 webm
      downloadBlob(currentBlob, filename + '.webm');
      return;
    }

    // WAV 裁剪与增益处理
    btnDownload.textContent = '⏳ 处理中...';
    btnDownload.disabled = true;

    try {
      var startSec = parseFloat(trimStart.value);
      var endSec = parseFloat(trimEnd.value);
      var gain = parseFloat(volGain.value);
      
      // 1. 计算新的采样长度
      var startSample = Math.floor(startSec * originalAudioBuffer.sampleRate);
      var endSample = Math.floor(endSec * originalAudioBuffer.sampleRate);
      var numSamples = endSample - startSample;
      
      var numChannels = originalAudioBuffer.numberOfChannels;
      
      // 2. 提取并应用增益
      var channels = [];
      for (var c = 0; c < numChannels; c++) {
        var origData = originalAudioBuffer.getChannelData(c);
        var newData = new Float32Array(numSamples);
        for (var i = 0; i < numSamples; i++) {
          // 乘以增益，并限制在 [-1, 1] 防爆音
          var sample = origData[startSample + i] * gain;
          newData[i] = Math.max(-1, Math.min(1, sample));
        }
        channels.push(newData);
      }
      
      // 3. 封装为 WAV Blob
      var wavBlob = buildWav(channels, originalAudioBuffer.sampleRate);
      downloadBlob(wavBlob, filename + '.wav');
      
    } catch (e) {
      console.error(e);
      alert('音频处理失败：' + e.message);
    } finally {
      btnDownload.textContent = '⬇️ 生成并下载';
      btnDownload.disabled = false;
    }
  });

  // ================= 工具函数 =================
  
  // 构建 WAV 文件
  function buildWav(channels, sampleRate) {
    var numChannels = channels.length;
    var numSamples = channels[0].length;
    var length = numSamples * numChannels * 2 + 44;
    var buffer = new ArrayBuffer(length);
    var view = new DataView(buffer);
    
    // WAV 头
    writeString(view, 0, 'RIFF');
    view.setUint32(4, length - 8, true);
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
    view.setUint32(40, length - 44, true);
    
    // PCM 数据交织
    var offset = 44;
    for (var i = 0; i < numSamples; i++) {
      for (var c = 0; c < numChannels; c++) {
        var sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();