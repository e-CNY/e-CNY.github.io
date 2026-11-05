(function () {
  var btnRecord = document.getElementById('btn-record');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');
  var btnDownload = document.getElementById('btn-download');
  var btnCopy = document.getElementById('btn-copy');
  var btnClear = document.getElementById('btn-clear');
  var timerEl = document.getElementById('ar-timer');
  var statusEl = document.getElementById('ar-status');
  var textarea = document.getElementById('ar-text');
  var canvas = document.getElementById('ar-canvas');
  var ctx = canvas.getContext('2d');
  var langSelect = document.getElementById('ar-lang');
  var visualModeSelect = document.getElementById('ar-visual-mode');
  var resultArea = document.getElementById('ar-result-area');
  var audioPlayer = document.getElementById('ar-audio-player');
  var exportFormatSelect = document.getElementById('ar-export-format');

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
  
  var recognition = null;
  var finalTranscript = '';
  var currentBlob = null; // 保存原始录音 Blob

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = function (event) {
      var interimTranscript = '';
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      textarea.value = finalTranscript + interimTranscript;
      textarea.scrollTop = textarea.scrollHeight;
    };

    recognition.onerror = function (event) {
      console.warn('语音识别错误:', event.error);
      if (event.error === 'not-allowed') {
        statusEl.textContent = '麦克风权限被拒绝';
      }
    };
  }

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // ================= 波形与频谱绘制 =================
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

  // ================= 录音控制 =================
  btnRecord.addEventListener('click', async function () {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      var source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      
      // 使用 WebM 作为中间格式录制（兼容性最好）
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
      audioChunks = [];
      
      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstop = function () {
        currentBlob = new Blob(audioChunks, { type: 'audio/webm' });
        var url = URL.createObjectURL(currentBlob);
        audioPlayer.src = url;
        resultArea.style.display = 'flex';
      };
      
      mediaRecorder.start();
      
      if (recognition) {
        finalTranscript = textarea.value ? textarea.value + '\n' : '';
        recognition.lang = langSelect.value;
        recognition.start();
      }
      
      isRecording = true;
      isPaused = false;
      btnRecord.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
      langSelect.disabled = true;
      resultArea.style.display = 'none';
      
      startTime = Date.now() - pausedTime;
      timerEl.textContent = formatTime(pausedTime);
      statusEl.textContent = '正在录音...';
      statusEl.className = 'ar-status recording';
      
      timerInterval = setInterval(function () {
        timerEl.textContent = formatTime(Date.now() - startTime);
      }, 1000);
      
      drawVisualizer();
      
    } catch (err) {
      alert('无法访问麦克风，请确保授予了权限。\n' + err.message);
    }
  });

  btnPause.addEventListener('click', function () {
    if (!isRecording) return;
    
    if (!isPaused) {
      // 暂停
      mediaRecorder.pause();
      if (recognition) recognition.stop();
      clearInterval(timerInterval);
      cancelAnimationFrame(reqId);
      pausedTime = Date.now() - startTime;
      isPaused = true;
      btnPause.innerHTML = '<span class="ar-icon">▶️</span> 继续';
      statusEl.textContent = '已暂停';
      statusEl.className = 'ar-status paused';
    } else {
      // 继续
      mediaRecorder.resume();
      if (recognition) recognition.start();
      startTime = Date.now() - pausedTime;
      timerInterval = setInterval(function () {
        timerEl.textContent = formatTime(Date.now() - startTime);
      }, 1000);
      isPaused = false;
      btnPause.innerHTML = '<span class="ar-icon">⏸️</span> 暂停';
      statusEl.textContent = '正在录音...';
      statusEl.className = 'ar-status recording';
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
    if (recognition) recognition.stop();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    
    btnRecord.disabled = false;
    btnPause.disabled = true;
    btnPause.innerHTML = '<span class="ar-icon">⏸️</span> 暂停';
    btnStop.disabled = true;
    langSelect.disabled = false;
    statusEl.textContent = '录音已结束';
    statusEl.className = 'ar-status';
  });

  // ================= 下载逻辑 =================
  btnDownload.addEventListener('click', async function () {
    if (!currentBlob) return;
    
    var format = exportFormatSelect.value;
    btnDownload.textContent = '⏳ 转换中...';
    btnDownload.disabled = true;
    
    try {
      if (format === 'webm') {
        // WebM 直接下载原始数据
        downloadBlob(currentBlob, 'recording.webm');
      } else if (format === 'ogg') {
        // 尝试原生录制 OGG（Chrome 不支持，会报错，这里给个提示）
        // 为了兼容，我们不动态转 OGG（需要复杂编码库），这里仅作尝试
        try {
          var oggBlob = new Blob(audioChunks, { type: 'audio/ogg' });
          downloadBlob(oggBlob, 'recording.ogg');
        } catch(e) {
          alert('当前浏览器不支持直接导出 OGG，建议使用 WAV 或 WebM');
        }
      } else {
        // WAV 转换
        var arrayBuffer = await currentBlob.arrayBuffer();
        var tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        var audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        var wavBlob = audioBufferToWav(audioBuffer);
        downloadBlob(wavBlob, 'recording.wav');
        tempCtx.close();
      }
    } catch (e) {
      console.error(e);
      alert('转换失败，请尝试下载 WebM 格式');
    } finally {
      btnDownload.textContent = '⬇️ 下载录音';
      btnDownload.disabled = false;
    }
  });

  btnClear.addEventListener('click', function () {
    textarea.value = '';
    finalTranscript = '';
  });

  btnCopy.addEventListener('click', function () {
    if (!textarea.value) return;
    navigator.clipboard.writeText(textarea.value).then(function () {
      var original = btnCopy.textContent;
      btnCopy.textContent = '✅ 已复制';
      btnCopy.style.color = '#7ba05b';
      setTimeout(function () {
        btnCopy.textContent = original;
        btnCopy.style.color = '';
      }, 1500);
    });
  });

  // ================= 工具函数：音频转 WAV =================
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

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + (filename.indexOf('.') === -1 ? '.wav' : '');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();