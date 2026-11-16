(function() {
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

  function formatTime(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return [h, m, s].map(function(v) { return String(v).padStart(2, '0'); }).join(':');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ================= DOM 元素 =================
  var btnStart = document.getElementById('btn-start');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');
  var btnRestart = document.getElementById('btn-restart');
  var btnDownload = document.getElementById('btn-download');
  var previewVideo = document.getElementById('preview-video');
  var emptyHint = document.getElementById('empty-hint');
  var downloadBar = document.getElementById('download-bar');
  var fileSizeEl = document.getElementById('file-size');
  var fileFormatEl = document.getElementById('file-format');
  var timerEl = document.getElementById('timer');
  var recordIndicator = document.getElementById('record-indicator');
  
  var optMic = document.getElementById('opt-mic');
  var optSystemAudio = document.getElementById('opt-system-audio');
  var optCountdown = document.getElementById('opt-countdown');
  var optQuality = document.getElementById('opt-quality');
  
  var countdownOverlay = document.getElementById('countdown-overlay');
  var countdownNumber = document.getElementById('countdown-number');

  // ================= 状态变量 =================
  var mediaRecorder = null;
  var recordedChunks = [];
  var outputMime = 'video/webm';
  var timerInterval = null;
  var secondsElapsed = 0;
  var videoBlob = null;
  var isPaused = false;
  var currentDisplayStream = null;
  var audioContext = null;

  // ================= 核心逻辑 =================
  
  // 开始计时器
  function startTimer() {
    stopTimer();
    timerInterval = setInterval(function() {
      if (!isPaused) {
        secondsElapsed++;
        timerEl.textContent = formatTime(secondsElapsed);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
  }

  // 开始录制主流程
  async function startRecording() {
    try {
      // 1. 获取屏幕流
      var displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: optSystemAudio.checked
      });
      currentDisplayStream = displayStream;

      var videoTracks = displayStream.getVideoTracks();
      var audioTracks = [];

      // 2. 音轨处理 (合并系统声音和麦克风)
      var needsAudioContext = false;
      
      if (optSystemAudio.checked && displayStream.getAudioTracks().length > 0) {
        needsAudioContext = true;
      }
      
      var micStream = null;
      if (optMic.checked) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          needsAudioContext = true;
        } catch (micErr) {
          console.warn('麦克风获取失败', micErr);
          showToast('无法获取麦克风权限，将仅录制画面或系统声', true);
        }
      }

      // 3. 利用 AudioContext 混流
      if (needsAudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var dest = audioContext.createMediaStreamDestination();
        var hasAudio = false;

        if (displayStream.getAudioTracks().length > 0) {
          var sysSource = audioContext.createMediaStreamSource(new MediaStream(displayStream.getAudioTracks()));
          sysSource.connect(dest);
          hasAudio = true;
        }
        
        if (micStream && micStream.getAudioTracks().length > 0) {
          var micSource = audioContext.createMediaStreamSource(new MediaStream(micStream.getAudioTracks()));
          micSource.connect(dest);
          hasAudio = true;
        }

        if (hasAudio) {
          dest.stream.getAudioTracks().forEach(function(track) {
            audioTracks.push(track);
          });
        }
      }

      var combinedStream = new MediaStream(videoTracks.concat(audioTracks));

      // 4. 初始化 MediaRecorder (优先尝试 MP4)
      var mimeTypes = [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      outputMime = 'video/webm';
      for (var i = 0; i < mimeTypes.length; i++) {
        if (MediaRecorder.isTypeSupported(mimeTypes[i])) {
          outputMime = mimeTypes[i];
          break;
        }
      }

      recordedChunks = [];
      var bitrate = parseInt(optQuality.value, 10) || 5000000;
      
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: outputMime,
        videoBitsPerSecond: bitrate
      });

      mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = function() {
        var finalMime = outputMime.indexOf('mp4') !== -1 ? 'video/mp4' : 'video/webm';
        videoBlob = new Blob(recordedChunks, { type: finalMime });
        var url = URL.createObjectURL(videoBlob);
        
        previewVideo.src = url;
        previewVideo.hidden = false;
        previewVideo.muted = false; // 允许回放声音
        emptyHint.hidden = true;
        
        // 更新下载栏
        downloadBar.hidden = false;
        fileSizeEl.textContent = '大小: ' + formatBytes(videoBlob.size);
        fileFormatEl.textContent = '格式: ' + (finalMime === 'video/mp4' ? 'MP4 (原生)' : 'WebM');
        btnRestart.style.display = 'inline-block';
        
        // 清理流
        if (combinedStream) combinedStream.getTracks().forEach(function(t) { t.stop(); });
        if (displayStream) displayStream.getTracks().forEach(function(t) { t.stop(); });
        if (micStream) micStream.getTracks().forEach(function(t) { t.stop(); });
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
      };

      // 监听浏览器自带的“停止共享”按钮
      videoTracks[0].onended = function() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        resetUI();
      };

      // 5. 开始录制
      mediaRecorder.start(1000);
      resetUI(true);
      
      secondsElapsed = 0;
      timerEl.textContent = formatTime(0);
      startTimer();
      showToast('录制已开始');

    } catch (err) {
      console.error('录屏失败:', err);
      resetUI();
      if (err.name === 'NotAllowedError') {
        showToast('您取消了授权或拒绝了录屏', true);
      } else {
        showToast('无法启动录屏: ' + err.message, true);
      }
    }
  }

  // 倒计时逻辑
  function startWithCountdown() {
    if (!optCountdown.checked) {
      startRecording();
      return;
    }
    
    countdownOverlay.style.display = 'flex';
    var count = 3;
    countdownNumber.textContent = count;
    
    var timer = setInterval(function() {
      count--;
      if (count > 0) {
        countdownNumber.textContent = count;
      } else {
        clearInterval(timer);
        countdownOverlay.style.display = 'none';
        startRecording();
      }
    }, 1000);
  }

  // ================= 事件绑定 =================
  
  btnStart.addEventListener('click', function() {
    btnStart.disabled = true;
    startWithCountdown();
  });

  btnPause.addEventListener('click', function() {
    if (!mediaRecorder) return;
    
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      isPaused = true;
      btnPause.innerHTML = '▶️ 继续';
      recordIndicator.classList.remove('active');
      recordIndicator.style.opacity = '0.5';
      showToast('录制已暂停');
    } else if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      isPaused = false;
      btnPause.innerHTML = '⏸️ 暂停';
      recordIndicator.classList.add('active');
      recordIndicator.style.opacity = '1';
      showToast('录制已继续');
    }
  });

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    resetUI();
  }

  btnStop.addEventListener('click', stopRecording);

  // 重录
  btnRestart.addEventListener('click', function() {
    videoBlob = null;
    previewVideo.src = '';
    previewVideo.hidden = true;
    emptyHint.hidden = false;
    downloadBar.hidden = true;
    btnRestart.style.display = 'none';
    timerEl.textContent = '00:00:00';
    
    btnStart.disabled = false;
    showToast('已重置，请重新录制');
  });

  // 重置 UI 状态
  function resetUI(isRecording) {
    stopTimer();
    if (isRecording) {
      btnStart.disabled = true;
      btnStart.style.display = 'none';
      btnPause.disabled = false;
      btnStop.disabled = false;
      btnPause.innerHTML = '⏸️ 暂停';
      optMic.disabled = true;
      optSystemAudio.disabled = true;
      optCountdown.disabled = true;
      optQuality.disabled = true;
      
      previewVideo.hidden = true;
      emptyHint.hidden = false;
      emptyHint.innerHTML = '<div style="font-size:3rem; margin-bottom:12px;">🔴</div>正在录制中... 请勿关闭此页面';
      downloadBar.hidden = true;
      
      recordIndicator.classList.add('active');
      isPaused = false;
    } else {
      btnStart.disabled = false;
      btnStart.style.display = 'inline-block';
      btnPause.disabled = true;
      btnStop.disabled = true;
      optMic.disabled = false;
      optSystemAudio.disabled = false;
      optCountdown.disabled = false;
      optQuality.disabled = false;
      
      recordIndicator.classList.remove('active');
      recordIndicator.style.opacity = '0';
    }
  }

  // 下载视频
  btnDownload.addEventListener('click', function() {
    if (!videoBlob) return;
    
    var ext = videoBlob.type.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
    var url = URL.createObjectURL(videoBlob);
    var a = document.createElement('a');
    var now = new Date();
    var dateStr = now.getFullYear() + 
                  String(now.getMonth() + 1).padStart(2, '0') + 
                  String(now.getDate()).padStart(2, '0') + '_' +
                  String(now.getHours()).padStart(2, '0') + 
                  String(now.getMinutes()).padStart(2, '0') + 
                  String(now.getSeconds()).padStart(2, '0');
                  
    a.href = url;
    a.download = '屏幕录制_' + dateStr + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('视频已开始下载');
  });

  // ================= 快捷键 =================
  document.addEventListener('keydown', function(e) {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
    // 避免在输入框中使用快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      btnPause.click();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      btnStop.click();
    }
  });

  // 初始化
  resetUI();

})();