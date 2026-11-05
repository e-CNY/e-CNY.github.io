(function() {
  var btnStart = document.getElementById('btn-start');
  var btnPause = document.getElementById('btn-pause');
  var btnStop = document.getElementById('btn-stop');
  var btnDownload = document.getElementById('btn-download');
  var previewVideo = document.getElementById('preview-video');
  var emptyHint = document.getElementById('empty-hint');
  var downloadBar = document.getElementById('download-bar');
  var fileSizeEl = document.getElementById('file-size');
  var timerEl = document.getElementById('timer');
  
  var optMic = document.getElementById('opt-mic');
  var optSystemAudio = document.getElementById('opt-system-audio');

  var mediaRecorder = null;
  var recordedChunks = [];
  var outputMime = 'video/webm';
  var timerInterval = null;
  var secondsElapsed = 0;
  var videoBlob = null;

  function formatTime(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return [h, m, s].map(function(v) { return String(v).padStart(2, '0'); }).join(':');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function startTimer() {
    secondsElapsed = 0;
    timerEl.textContent = formatTime(0);
    timerInterval = setInterval(function() {
      secondsElapsed++;
      timerEl.textContent = formatTime(secondsElapsed);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // 开始录制
  btnStart.addEventListener('click', async function() {
    try {
      // 1. 获取屏幕流
      var displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: optSystemAudio.checked
      });

      var combinedTracks = [];
      
      // 提取视频轨道
      displayStream.getVideoTracks().forEach(function(track) {
        combinedTracks.push(track);
      });

      // 提取系统音频轨道（如果勾选且浏览器支持）
      if (optSystemAudio.checked) {
        displayStream.getAudioTracks().forEach(function(track) {
          combinedTracks.push(track);
        });
      }

      // 2. 获取麦克风流（如果勾选）
      if (optMic.checked) {
        try {
          var micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach(function(track) {
            combinedTracks.push(track);
          });
        } catch (micErr) {
          console.warn('获取麦克风失败，将不录制麦克风音频。', micErr);
          alert('无法获取麦克风权限，将仅录制画面。');
        }
      }

      var combinedStream = new MediaStream(combinedTracks);

      // 3. 初始化 MediaRecorder (优先尝试原生 MP4)
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
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: outputMime,
        videoBitsPerSecond: 6000000
      });

      mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = function() {
        var finalMime = outputMime.indexOf('mp4') !== -1 ? 'video/mp4' : 'video/webm';
        videoBlob = new Blob(recordedChunks, { type: finalMime });
        var url = URL.createObjectURL(videoBlob);
        
        previewVideo.src = url;
        previewVideo.hidden = false;
        emptyHint.hidden = true;
        
        downloadBar.hidden = false;
        fileSizeEl.textContent = '文件大小: ' + formatBytes(videoBlob.size);
        
        // 释放流
        combinedStream.getTracks().forEach(function(track) { track.stop(); });
        displayStream.getTracks().forEach(function(track) { track.stop(); });
      };

      // 监听用户点击浏览器自带的“停止共享”按钮
      displayStream.getVideoTracks()[0].onended = function() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        resetUI();
      };

      // 开始录制
      mediaRecorder.start(1000);
      
      // 更新 UI
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnStop.disabled = false;
      optMic.disabled = true;
      optSystemAudio.disabled = true;
      
      previewVideo.hidden = true;
      emptyHint.hidden = false;
      emptyHint.textContent = '正在录制中... 点击“停止”结束录制。';
      downloadBar.hidden = true;

      startTimer();

    } catch (err) {
      console.error('录屏失败:', err);
      alert('无法启动录屏，可能您取消了授权或浏览器不支持。');
    }
  });

  // 暂停/继续
  btnPause.addEventListener('click', function() {
    if (!mediaRecorder) return;
    
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      btnPause.textContent = '▶️ 继续';
      stopTimer();
    } else if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      btnPause.textContent = '⏸️ 暂停';
      startTimer();
    }
  });

  // 停止
  btnStop.addEventListener('click', function() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    resetUI();
  });

  // 重置 UI
  function resetUI() {
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnStop.disabled = true;
    btnPause.textContent = '⏸️ 暂停';
    optMic.disabled = false;
    optSystemAudio.disabled = false;
    stopTimer();
  }

  // 下载
  btnDownload.addEventListener('click', function() {
    if (!videoBlob) return;
    
    var ext = videoBlob.type.indexOf('mp4') !== -1 ? 'mp4' : 'webm';
    var url = URL.createObjectURL(videoBlob);
    var a = document.createElement('a');
    var dateStr = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    a.href = url;
    a.download = '屏幕录制_' + dateStr + '.' + ext;
    a.click();
    
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1000);
  });
})();