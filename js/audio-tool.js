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

  // ================= DOM 元素 =================
  var dropZone = document.getElementById('au-drop-zone');
  var fileInput = document.getElementById('au-input');
  var workspace = document.getElementById('au-workspace');
  var canvas = document.getElementById('au-canvas');
  var ctx = canvas.getContext('2d');
  var playhead = document.getElementById('au-playhead');
  
  var filenameEl = document.getElementById('au-filename');
  var timeDisplay = document.getElementById('au-time');
  var volSlider = document.getElementById('au-volume');
  var volVal = document.getElementById('au-vol-val');
  
  var btnPlay = document.getElementById('au-play');
  var btnPause = document.getElementById('au-pause');
  var btnReverse = document.getElementById('au-reverse');
  var btnRestore = document.getElementById('au-restore');
  
  var startInput = document.getElementById('au-start');
  var endInput = document.getElementById('au-end');
  var btnResetTrim = document.getElementById('btn-reset-trim');
  var btnExport = document.getElementById('au-export');
  var loadingOverlay = document.getElementById('loading-overlay');

  // ================= 音频上下文与状态 =================
  var audioCtx = null;
  var audioBuffer = null;     // 当前用于播放的 Buffer (可能是倒放的)
  var originalBuffer = null;  // 最初解码的原始 Buffer
  var sourceNode = null;
  var gainNode = null;
  
  var isPlaying = false;
  var startTime = 0;
  var pausedAt = 0;
  var reqId = null;

  // 初始化 AudioContext (延迟到用户交互时，防止浏览器报错)
  function initAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      updateVolume();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ================= 文件加载与拖拽 =================
  dropZone.addEventListener('click', function() { fileInput.click(); });
  
  window.addEventListener('dragover', function(e) { e.preventDefault(); });
  window.addEventListener('drop', function(e) { e.preventDefault(); });

  dropZone.addEventListener('dragover', function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  
  dropZone.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });
  
  // 全页拖拽
  document.body.addEventListener('dragover', function() { dropZone.classList.add('dragover'); });
  document.body.addEventListener('dragleave', function(e) {
    if (e.clientX === 0 && e.clientY === 0) dropZone.classList.remove('dragover');
  });
  document.body.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });

  // 粘贴上传
  window.addEventListener('paste', function(e) {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      var file = e.clipboardData.files[0];
      if (file.type.indexOf('audio') === 0) {
        e.preventDefault();
        handleAudioFile(file);
      }
    }
  });

  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) handleAudioFile(this.files[0]);
    this.value = '';
  });

  function handleAudioFile(file) {
    if (file.type.indexOf('audio') === -1 && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.m4a') && !file.name.endsWith('.ogg') && !file.name.endsWith('.flac')) {
      return showToast('请选择有效的音频文件', true);
    }

    dropZone.style.display = 'none';
    workspace.style.display = 'flex';
    filenameEl.textContent = file.name;
    timeDisplay.textContent = '解析中...';
    loadingOverlay.style.display = 'flex';

    initAudioCtx();
    var reader = new FileReader();
    
    reader.onload = function(e) {
      audioCtx.decodeAudioData(e.target.result, function(buffer) {
        audioBuffer = buffer;
        originalBuffer = buffer;
        
        // 重置状态
        isPlaying = false;
        pausedAt = 0;
        btnPlay.disabled = false;
        btnPause.disabled = true;
        btnRestore.style.display = 'none';
        
        // 设置选区
        startInput.max = buffer.duration.toFixed(2);
        endInput.max = buffer.duration.toFixed(2);
        startInput.value = 0;
        endInput.value = buffer.duration.toFixed(2);
        
        timeDisplay.textContent = '00:00.0 / ' + formatTime(buffer.duration);
        playhead.style.left = '0%';
        
        drawWaveform(buffer);
        loadingOverlay.style.display = 'none';
        showToast('音频解析成功');
      }, function(err) {
        loadingOverlay.style.display = 'none';
        showToast('音频解析失败，请检查文件格式', true);
        dropZone.style.display = 'flex';
        workspace.style.display = 'none';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // ================= 波形绘制与选区 =================
  function drawWaveform(buffer) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    var cw = canvas.width / dpr;
    var ch = canvas.height / dpr;

    var data = buffer.getChannelData(0);
    var step = Math.ceil(data.length / cw);
    var amp = ch / 2;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cw, ch);

    // 获取选区高亮
    var startSec = parseFloat(startInput.value) || 0;
    var endSec = parseFloat(endInput.value) || buffer.duration;
    
    if (startSec < endSec) {
      var startX = (startSec / buffer.duration) * cw;
      var endX = (endSec / buffer.duration) * cw;
      ctx.fillStyle = 'rgba(123, 160, 91, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, ch);
    }

    // 绘制波形 (如果倒放，绘制实际的 audioBuffer)
    ctx.fillStyle = '#8a5a2b'; // 棕褐色波形
    var plotData = buffer.getChannelData(0);
    var plotStep = Math.ceil(plotData.length / cw);

    for (var i = 0; i < cw; i++) {
      var min = 1.0, max = -1.0;
      for (var j = 0; j < plotStep; j++) {
        var idx = (i * plotStep) + j;
        if (idx >= plotData.length) break;
        var datum = plotData[idx];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      var y1 = (1 + min) * amp;
      var y2 = (1 + max) * amp;
      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }
  }

  function updateHighlight() {
    if (!audioBuffer) return;
    var s = parseFloat(startInput.value) || 0;
    var e = parseFloat(endInput.value) || audioBuffer.duration;
    if (s < 0) s = 0;
    if (e > audioBuffer.duration) e = audioBuffer.duration;
    if (s >= e) {
      s = Math.max(0, e - 0.1);
      startInput.value = s.toFixed(2);
    }
    drawWaveform(audioBuffer);
  }

  startInput.addEventListener('input', function() {
    var s = parseFloat(this.value);
    if (s >= parseFloat(endInput.value)) {
      endInput.value = (s + 0.1).toFixed(2);
    }
    updateHighlight();
  });

  endInput.addEventListener('input', function() {
    var e = parseFloat(this.value);
    if (e <= parseFloat(startInput.value)) {
      startInput.value = Math.max(0, e - 0.1).toFixed(2);
    }
    updateHighlight();
  });

  btnResetTrim.addEventListener('click', function() {
    if (!audioBuffer) return;
    startInput.value = 0;
    endInput.value = audioBuffer.duration.toFixed(2);
    updateHighlight();
    showToast('已重置选区');
  });

  // 点击波形跳转
  document.getElementById('wave-wrap').addEventListener('click', function(e) {
    if (!audioBuffer) return;
    var rect = this.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var percent = Math.max(0, Math.min(1, x / rect.width));
    pausedAt = percent * audioBuffer.duration;
    
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    } else {
      timeDisplay.textContent = formatTime(pausedAt) + ' / ' + formatTime(audioBuffer.duration);
      playhead.style.left = (percent * 100) + '%';
    }
  });

  // ================= 音量控制 =================
  function updateVolume() {
    if (gainNode) {
      gainNode.gain.value = parseFloat(volSlider.value);
    }
    volVal.textContent = Math.round(parseFloat(volSlider.value) * 100) + '%';
  }
  volSlider.addEventListener('input', updateVolume);

  // ================= 播放控制 =================
  function startPlayback() {
    if (!audioBuffer) return;
    initAudioCtx();
    
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(gainNode);
    
    sourceNode.onended = function() {
      if (isPlaying) { // 自然播放结束
        stopPlayback();
        pausedAt = 0;
        playhead.style.left = '0%';
        timeDisplay.textContent = '00:00.0 / ' + formatTime(audioBuffer.duration);
      }
    };
    
    sourceNode.start(0, pausedAt);
    startTime = audioCtx.currentTime - pausedAt;
    isPlaying = true;
    
    btnPlay.disabled = true;
    btnPause.disabled = false;
    
    updatePlayback();
  }

  function stopPlayback() {
    if (sourceNode && isPlaying) {
      sourceNode.stop();
      sourceNode.disconnect();
      isPlaying = false;
      btnPlay.disabled = false;
      btnPause.disabled = true;
      if (reqId) cancelAnimationFrame(reqId);
    }
  }

  btnPlay.addEventListener('click', function() {
    if (pausedAt >= audioBuffer.duration) pausedAt = 0;
    startPlayback();
  });

  btnPause.addEventListener('click', function() {
    if (isPlaying) {
      pausedAt = audioCtx.currentTime - startTime;
      stopPlayback();
    }
  });

  function updatePlayback() {
    if (!isPlaying) return;
    
    var curr = audioCtx.currentTime - startTime;
    if (curr >= audioBuffer.duration) curr = audioBuffer.duration;
    
    // 更新时间文本
    timeDisplay.textContent = formatTime(curr) + ' / ' + formatTime(audioBuffer.duration);
    
    // 更新播放头位置
    var percent = curr / audioBuffer.duration;
    playhead.style.left = (percent * 100) + '%';
    
    reqId = requestAnimationFrame(updatePlayback);
  }

  // 快捷键播放/暂停
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space' && audioBuffer) {
      e.preventDefault();
      if (isPlaying) btnPause.click();
      else btnPlay.click();
    }
  });

  // ================= 倒放与恢复 =================
  btnReverse.addEventListener('click', function() {
    if (!audioBuffer) return;
    stopPlayback();
    
    // 执行倒放 (生成新 Buffer)
    var reversed = audioCtx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
    for (var i = 0; i < audioBuffer.numberOfChannels; i++) {
      var channelData = audioBuffer.getChannelData(i);
      reversed.copyToChannel(channelData.slice().reverse(), i);
    }
    
    audioBuffer = reversed;
    pausedAt = 0;
    playhead.style.left = '0%';
    timeDisplay.textContent = '00:00.0 / ' + formatTime(audioBuffer.duration);
    
    drawWaveform(audioBuffer);
    btnRestore.style.display = 'inline-flex'; // 显示恢复按钮
    btnReverse.disabled = true;
    showToast('已切换为倒放音频');
  });

  btnRestore.addEventListener('click', function() {
    if (!originalBuffer) return;
    stopPlayback();
    
    audioBuffer = originalBuffer;
    pausedAt = 0;
    playhead.style.left = '0%';
    timeDisplay.textContent = '00:00.0 / ' + formatTime(audioBuffer.duration);
    
    drawWaveform(audioBuffer);
    btnRestore.style.display = 'none';
    btnReverse.disabled = false;
    showToast('已恢复原始音频');
  });

  // ================= 导出 WAV =================
  btnExport.addEventListener('click', function() {
    if (!audioBuffer) return;
    
    var startSec = parseFloat(startInput.value);
    var endSec = parseFloat(endInput.value);
    var isMono = document.getElementById('au-channel').value === 'mono';
    var vol = parseFloat(volSlider.value); // 导出时应用音量

    if (isNaN(startSec) || isNaN(endSec) || startSec >= endSec) {
      return showToast('请输入有效的起点和终点时间', true);
    }

    loadingOverlay.style.display = 'flex';
    btnExport.disabled = true;

    // 让出主线程渲染 Loading
    setTimeout(function() {
      try {
        var sampleRate = audioBuffer.sampleRate;
        var startSample = Math.floor(startSec * sampleRate);
        var endSample = Math.floor(endSec * sampleRate);
        var length = endSample - startSample;
        
        var numChannels = isMono ? 1 : audioBuffer.numberOfChannels;
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
        
        if (isMono) {
          var ch0 = audioBuffer.getChannelData(0);
          var ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
          for (var i = startSample; i < endSample; i++) {
            var s = ((ch0[i] + ch1[i]) / 2) * vol;
            s = Math.max(-1, Math.min(1, s)); // 限幅
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
          }
        } else {
          var chData = [];
          for (var c = 0; c < audioBuffer.numberOfChannels; c++) chData.push(audioBuffer.getChannelData(c));
          for (var i = startSample; i < endSample; i++) {
            for (var c = 0; c < numChannels; c++) {
              var s = chData[c][i] * vol;
              s = Math.max(-1, Math.min(1, s));
              view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
              offset += 2;
            }
          }
        }
        
        var wavBlob = new Blob([view], { type: 'audio/wav' });
        var url = URL.createObjectURL(wavBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cropped_' + Date.now() + '.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
        
        showToast('WAV 文件已导出');
      } catch (e) {
        console.error(e);
        showToast('导出失败: ' + e.message, true);
      } finally {
        loadingOverlay.style.display = 'none';
        btnExport.disabled = false;
      }
    }, 100);
  });

  // 窗口改变重绘波形
  window.addEventListener('resize', function() {
    if (audioBuffer) drawWaveform(audioBuffer);
  });

})();