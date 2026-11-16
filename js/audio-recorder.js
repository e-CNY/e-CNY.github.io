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

  function formatTime(secs) {
    if (isNaN(secs) || secs < 0) secs = 0;
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    var ms = Math.floor((secs % 1) * 10);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + ms;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // ================= DOM 元素 =================
  var btnRecord = document.getElementById('btn-record');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');
  var btnDownload = document.getElementById('btn-download');
  var btnResetTrim = document.getElementById('btn-reset-trim');
  var timerEl = document.getElementById('ar-timer');
  var recDot = document.getElementById('rec-dot');
  var canvas = document.getElementById('ar-canvas');
  var ctx = canvas.getContext('2d');
  var visualModeSelect = document.getElementById('ar-visual-mode');
  var deviceSelect = document.getElementById('ar-device-select');
  var deviceGroup = document.getElementById('device-group');
  var qualitySelect = document.getElementById('ar-quality-select');
  
  var editorPanel = document.getElementById('ar-editor-panel');
  var audioPlayer = document.getElementById('ar-audio-player');
  var trimStart = document.getElementById('trim-start');
  var trimEnd = document.getElementById('trim-end');
  var labelStart = document.getElementById('label-start');
  var labelEnd = document.getElementById('label-end');
  var trimDuration = document.getElementById('trim-duration');
  var volGain = document.getElementById('vol-gain');
  var labelGain = document.getElementById('label-gain');
  var exportFilename = document.getElementById('export-filename');
  var exportFormat = document.getElementById('export-format');
  var loadingOverlay = document.getElementById('loading-overlay');

  // ================= 状态变量 =================
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
  
  // 播放与波形绘制状态
  var waveAnimationId = null;
  var isPlayingAudio = false;

  // ================= 初始化麦克风设备 =================
  async function getDevices() {
    try {
      // 先请求权限，否则无法获取到设备标签
      var initialStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initialStream.getTracks().forEach(function(t) { t.stop(); });

      var devices = await navigator.mediaDevices.enumerateDevices();
      var audioInputs = devices.filter(function(device) { return device.kind === 'audioinput'; });
      
      if (audioInputs.length > 1) {
        deviceGroup.style.display = 'flex';
        deviceSelect.innerHTML = '';
        audioInputs.forEach(function(device, index) {
          var option = document.createElement('option');
          option.value = device.deviceId;
          option.text = device.label || '麦克风 ' + (index + 1);
          deviceSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.warn('无法枚举音频设备（可能未授权）', err);
    }
  }
  getDevices();

  // ================= 动态波形/频谱 (录音时) =================
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
      canvas.height = (canvas.offsetHeight - 20) * dpr; // 留出底部时间轴
      ctx.scale(dpr, dpr);
      
      var cw = canvas.width / dpr;
      var ch = canvas.height / dpr;
      
      ctx.fillStyle = '#fdf8ec';
      ctx.fillRect(0, 0, cw, ch);
      
      if (mode === 'wave') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e74c3c';
        ctx.beginPath();
        var sliceWidth = cw / bufferLength;
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {
          var v = dataArray[i] / 128.0;
          var y = v * ch / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(dataArray);
        var barWidth = (cw / bufferLength) * 2.5;
        var barHeight;
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 255 * ch;
          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(x, ch - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    }
    draw();
  }

  // ================= 静态波形绘制 (录音结束后) =================
  function drawStaticWaveform() {
    if (!originalAudioBuffer) return;
    
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = (canvas.offsetHeight - 20) * dpr;
    ctx.scale(dpr, dpr);
    
    var cw = canvas.width / dpr;
    var ch = canvas.height / dpr;
    
    ctx.fillStyle = '#fdf8ec';
    ctx.fillRect(0, 0, cw, ch);
    
    // 绘制网格
    ctx.strokeStyle = '#e5d9bd';
    ctx.lineWidth = 1;
    for (var i = 1; i < 5; i++) {
      var x = (cw / 5) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }

    var data = originalAudioBuffer.getChannelData(0);
    var step = Math.ceil(data.length / cw);
    var amp = ch / 2;
    
    var startSec = parseFloat(trimStart.value);
    var endSec = parseFloat(trimEnd.value);
    var duration = originalAudioBuffer.duration;
    
    // 绘制波形
    for (var i = 0; i < cw; i++) {
      var min = 1.0;
      var max = -1.0;
      for (var j = 0; j < step; j++) {
        var idx = (i * step) + j;
        if (idx >= data.length) break;
        var datum = data[idx];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      var h = (max - min) * amp;
      var y = (1 + min) * amp;
      
      // 判断是否在选区内
      var currSec = (i / cw) * duration;
      if (currSec >= startSec && currSec <= endSec) {
        ctx.fillStyle = '#8a5a2b'; // 选区内深色
      } else {
        ctx.fillStyle = '#ddcfb3'; // 选区外浅色
      }
      
      ctx.fillRect(i, y, 1, Math.max(1, h));
    }
    
    // 绘制选区遮罩 (未选中区域变暗)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    var startX = (startSec / duration) * cw;
    var endX = (endSec / duration) * cw;
    if (startX > 0) ctx.fillRect(0, 0, startX, ch);
    if (endX < cw) ctx.fillRect(endX, 0, cw - endX, ch);
    
    // 绘制时间标尺
    var ruler = document.getElementById('time-ruler');
    ruler.innerHTML = '';
    for (var i = 0; i <= 4; i++) {
      var span = document.createElement('span');
      span.textContent = ((duration / 4) * i).toFixed(1) + 's';
      ruler.appendChild(span);
    }
  }

  // 播放进度线动画
  function drawPlayhead() {
    if (!isPlayingAudio || !originalAudioBuffer) return;
    waveAnimationId = requestAnimationFrame(drawPlayhead);
    
    drawStaticWaveform(); // 重绘背景
    
    var cw = canvas.offsetWidth;
    var ch = canvas.offsetHeight - 20;
    var progress = audioPlayer.currentTime / originalAudioBuffer.duration;
    var x = progress * cw;
    
    ctx.beginPath();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }

  // 点击波形跳转播放
  canvas.addEventListener('click', function(e) {
    if (!originalAudioBuffer) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var ratio = x / rect.width;
    var duration = originalAudioBuffer.duration;
    
    audioPlayer.currentTime = ratio * duration;
    if (!isPlayingAudio) {
      audioPlayer.play();
    }
  });

  // ================= 录音控制 =================
  btnRecord.addEventListener('click', async function () {
    try {
      var constraints = { audio: true };
      if (deviceSelect.value) {
        constraints.audio = { deviceId: { exact: deviceSelect.value } };
      }
      
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      var source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      
      var bitrate = parseInt(qualitySelect.value, 10);
      var options = { mimeType: 'audio/webm', audioBitsPerSecond: bitrate };
      
      // 兼容 Safari 等不支持码率的浏览器
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = {};
      }

      mediaRecorder = new MediaRecorder(mediaStream, options);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstop = async function () {
        currentBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        audioPlayer.src = URL.createObjectURL(currentBlob);
        
        // 解析为 AudioBuffer
        var arrayBuffer = await currentBlob.arrayBuffer();
        var tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        originalAudioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        tempCtx.close();
        
        // 设置裁剪滑块
        var duration = originalAudioBuffer.duration;
        trimStart.max = duration;
        trimEnd.max = duration;
        trimStart.value = 0;
        trimEnd.value = duration;
        
        updateTrimLabels();
        drawStaticWaveform();
        editorPanel.style.display = 'flex';
        
        // 滚动到编辑面板
        editorPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      
      mediaRecorder.start();
      
      isRecording = true;
      isPaused = false;
      btnRecord.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
      editorPanel.style.display = 'none';
      recDot.classList.add('active');
      
      startTime = Date.now() - pausedTime;
      timerEl.textContent = formatTime(pausedTime / 1000);
      
      timerInterval = setInterval(function () {
        timerEl.textContent = formatTime((Date.now() - startTime) / 1000);
      }, 100);
      
      drawVisualizer();
      
    } catch (err) {
      console.error(err);
      showToast('无法访问麦克风，请检查权限设置', true);
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
      recDot.classList.remove('active');
    } else {
      mediaRecorder.resume();
      startTime = Date.now() - pausedTime;
      timerInterval = setInterval(function () {
        timerEl.textContent = formatTime((Date.now() - startTime) / 1000);
      }, 100);
      isPaused = false;
      btnPause.innerHTML = '<span class="ar-icon">⏸️</span> 暂停';
      recDot.classList.add('active');
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
    recDot.classList.remove('active');
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) mediaStream.getTracks().forEach(function (track) { track.stop(); });
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    
    btnRecord.disabled = false;
    btnPause.disabled = true;
    btnPause.innerHTML = '<span class="ar-icon">⏸️</span> 暂停';
    btnStop.disabled = true;
    timerEl.textContent = '00:00.0';
    
    showToast('录音已保存');
  });

  // ================= 编辑交互逻辑 =================
  function updateTrimLabels() {
    var s = parseFloat(trimStart.value);
    var e = parseFloat(trimEnd.value);
    labelStart.textContent = formatTime(s);
    labelEnd.textContent = formatTime(e);
    trimDuration.textContent = (e - s).toFixed(1) + 's';
    
    if (originalAudioBuffer) {
      drawStaticWaveform(); // 重绘选区
    }
  }
  
  trimStart.addEventListener('input', function() {
    if (parseFloat(this.value) >= parseFloat(trimEnd.value)) {
      this.value = Math.max(0, parseFloat(trimEnd.value) - 0.1);
    }
    updateTrimLabels();
  });
  
  trimEnd.addEventListener('input', function() {
    if (parseFloat(this.value) <= parseFloat(trimStart.value)) {
      this.value = Math.min(originalAudioBuffer.duration, parseFloat(trimStart.value) + 0.1);
    }
    updateTrimLabels();
  });

  btnResetTrim.addEventListener('click', function() {
    if (!originalAudioBuffer) return;
    trimStart.value = 0;
    trimEnd.value = originalAudioBuffer.duration;
    updateTrimLabels();
  });

  volGain.addEventListener('input', function() {
    labelGain.textContent = parseFloat(this.value).toFixed(1) + 'x';
  });

  // 音频播放事件
  audioPlayer.addEventListener('play', function() {
    isPlayingAudio = true;
    drawPlayhead();
  });
  audioPlayer.addEventListener('pause', function() {
    isPlayingAudio = false;
    cancelAnimationFrame(waveAnimationId);
    drawStaticWaveform();
  });
  audioPlayer.addEventListener('ended', function() {
    isPlayingAudio = false;
    cancelAnimationFrame(waveAnimationId);
    drawStaticWaveform();
  });
  // 播放时自动跟随裁剪范围
  audioPlayer.addEventListener('timeupdate', function() {
    if (isPlayingAudio) {
      if (audioPlayer.currentTime >= parseFloat(trimEnd.value) || audioPlayer.currentTime < parseFloat(trimStart.value)) {
        audioPlayer.currentTime = parseFloat(trimStart.value);
      }
    }
  });

  // ================= 下载与导出 =================
  btnDownload.addEventListener('click', async function () {
    if (!originalAudioBuffer) return;
    
    var format = exportFormat.value;
    var filename = exportFilename.value.trim() || '录音_' + Date.now();
    
    if (format === 'webm' && currentBlob) {
      downloadBlob(currentBlob, filename + '.webm');
      showToast('原始文件已开始下载');
      return;
    }

    // 导出 WAV
    loadingOverlay.style.display = 'flex';
    btnDownload.disabled = true;

    // 使用 setTimeout 让 UI 线程喘口气，渲染 Loading 动画
    setTimeout(function() {
      try {
        var startSec = parseFloat(trimStart.value);
        var endSec = parseFloat(trimEnd.value);
        var gain = parseFloat(volGain.value);
        
        var startSample = Math.floor(startSec * originalAudioBuffer.sampleRate);
        var endSample = Math.floor(endSec * originalAudioBuffer.sampleRate);
        var numSamples = endSample - startSample;
        
        var numChannels = originalAudioBuffer.numberOfChannels;
        var channels = [];
        
        for (var c = 0; c < numChannels; c++) {
          var origData = originalAudioBuffer.getChannelData(c);
          var newData = new Float32Array(numSamples);
          for (var i = 0; i < numSamples; i++) {
            var sample = origData[startSample + i] * gain;
            newData[i] = Math.max(-1, Math.min(1, sample)); // 防爆音限幅
          }
          channels.push(newData);
        }
        
        var wavBlob = buildWav(channels, originalAudioBuffer.sampleRate);
        downloadBlob(wavBlob, filename + '.wav');
        showToast('WAV 文件已开始下载');
      } catch (e) {
        console.error(e);
        showToast('音频处理失败：' + e.message, true);
      } finally {
        loadingOverlay.style.display = 'none';
        btnDownload.disabled = false;
      }
    }, 100);
  });

  // ================= WAV 编码器 =================
  function buildWav(channels, sampleRate) {
    var numChannels = channels.length;
    var numSamples = channels[0].length;
    var length = numSamples * numChannels * 2 + 44;
    var buffer = new ArrayBuffer(length);
    var view = new DataView(buffer);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, length - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length - 44, true);
    
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

  // ================= 快捷键 =================
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      if (originalAudioBuffer) {
        if (audioPlayer.paused) audioPlayer.play();
        else audioPlayer.pause();
      }
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      if (btnRecord.disabled) return;
      btnRecord.click();
    }
  });

  // 窗口大小改变时重绘波形
  window.addEventListener('resize', function() {
    if (originalAudioBuffer) drawStaticWaveform();
  });

})();