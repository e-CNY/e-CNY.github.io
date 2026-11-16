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

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ================= DOM 元素 =================
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var video = document.getElementById('video-player');
  var emptyHint = document.getElementById('empty-hint');
  var settings = document.getElementById('settings');
  
  var videoInfo = document.getElementById('video-info');
  var infoRes = document.getElementById('info-res');
  var infoDuration = document.getElementById('info-duration');
  var infoSize = document.getElementById('info-size');

  var currentTimeEl = document.getElementById('current-time');
  var durationEl = document.getElementById('duration');
  var startTimeEl = document.getElementById('start-time');
  var endTimeEl = document.getElementById('end-time');
  var btnSetStart = document.getElementById('btn-set-start');
  var btnSetEnd = document.getElementById('btn-set-end');

  var extractMode = document.getElementById('extract-mode');
  var groupFps = document.getElementById('group-fps');
  var groupInterval = document.getElementById('group-interval');
  var fpsSelect = document.getElementById('fps-select');
  var intervalSelect = document.getElementById('interval-select');

  var speedSelect = document.getElementById('speed-select');
  var effectSelect = document.getElementById('effect-select');
  var widthSelect = document.getElementById('width-select');
  var formatSelect = document.getElementById('format-select');
  var qualitySelect = document.getElementById('quality-select');
  var bgColorInput = document.getElementById('bg-color');
  var qualityGroup = document.getElementById('quality-group');
  
  var btnGenerate = document.getElementById('btn-generate');
  var progressContainer = document.getElementById('progress-container');
  var progressBar = document.getElementById('progress-bar');
  var progressText = document.getElementById('progress-text');

  var resultContainer = document.getElementById('result-container');
  var previewBox = document.getElementById('preview-box');
  var resultThumb = document.getElementById('result-thumb');
  var resultCount = document.getElementById('result-count');
  var btnDownload = document.getElementById('btn-download');

  var confirmModal = document.getElementById('confirm-modal');
  var confirmMsg = document.getElementById('confirm-msg');
  var confirmYes = document.getElementById('confirm-yes');

  // ================= 状态变量 =================
  var currentFileBlob = null;
  var currentFileName = 'output';
  var isGenerating = false;

  // ================= 交互切换逻辑 =================
  extractMode.addEventListener('change', function() {
    if (this.value === 'fps') {
      groupFps.style.display = 'flex';
      groupInterval.style.display = 'none';
    } else {
      groupFps.style.display = 'none';
      groupInterval.style.display = 'flex';
    }
  });

  formatSelect.addEventListener('change', function() {
    if (this.value === 'png') {
      qualityGroup.style.opacity = '0.5';
      qualitySelect.disabled = true;
    } else {
      qualityGroup.style.opacity = '1';
      qualitySelect.disabled = false;
    }
  });

  video.addEventListener('timeupdate', function() {
    currentTimeEl.textContent = formatTime(video.currentTime);
  });
  
  btnSetStart.addEventListener('click', function() { startTimeEl.value = video.currentTime.toFixed(1); });
  btnSetEnd.addEventListener('click', function() { endTimeEl.value = video.currentTime.toFixed(1); });

  // ================= 文件上传 =================
  dropZone.addEventListener('click', function() { fileInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
    dropZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('video/')) return showToast('请选择视频文件！', true);
    
    var url = URL.createObjectURL(file);
    video.src = url;
    video.style.display = 'block';
    emptyHint.style.display = 'none';
    settings.style.display = 'flex';
    resultContainer.style.display = 'none';
    videoInfo.style.display = 'flex';

    infoSize.textContent = formatBytes(file.size);

    video.onloadedmetadata = function() {
      var duration = video.duration;
      durationEl.textContent = formatTime(duration);
      infoRes.textContent = video.videoWidth + ' x ' + video.videoHeight;
      infoDuration.textContent = formatTime(duration);
      
      startTimeEl.max = duration;
      endTimeEl.max = duration;
      startTimeEl.value = 0;
      endTimeEl.value = Math.min(3, duration);
      video.currentTime = 0;
      showToast('视频加载成功');
    };
  }

  // ================= 核心：精准截取与生成 =================
  function seekVideoWithTimeout(time) {
    return new Promise(function(resolve) {
      if (Math.abs(video.currentTime - time) < 0.05) { 
        setTimeout(resolve, 20); 
        return; 
      }
      video.currentTime = time;
      var check = 0;
      var timer = setInterval(function() {
        if (Math.abs(video.currentTime - time) < 0.05) {
          clearInterval(timer); 
          setTimeout(resolve, 30); // 确保画面渲染完毕
        } else if (++check > 40) { // 最多等 2 秒
          clearInterval(timer); 
          resolve();
        }
      }, 50);
    });
  }

  window.closeConfirm = function() {
    confirmModal.style.display = 'none';
  };

  btnGenerate.addEventListener('click', async function() {
    if (!video.src) return showToast('请先上传视频', true);
    if (isGenerating) return;

    var start = parseFloat(startTimeEl.value);
    var end = parseFloat(endTimeEl.value);
    
    if (start >= end) return showToast('结束时间必须大于起始时间！', true);
    if (end - start > 60) return showToast('截取片段不能超过 60 秒，以防内存溢出。', true);

    var mode = extractMode.value;
    var fps = parseInt(fpsSelect.value, 10);
    var interval = parseFloat(intervalSelect.value) || 1;
    var speed = parseFloat(speedSelect.value);
    var duration = (end - start) / speed;
    
    var totalFrames = 0;
    if (mode === 'fps') {
      totalFrames = Math.floor(duration * fps);
    } else {
      totalFrames = Math.floor(duration / interval) + 1;
    }
    
    if (totalFrames <= 0) return showToast('根据当前设置，将生成 0 张图片', true);

    // 内存警告确认
    if (totalFrames > 300) {
      confirmMsg.innerHTML = '预计将生成 <b>' + totalFrames + '</b> 张图片。<br>这可能会消耗大量内存和处理时间（数分钟甚至更久）。<br><br>是否继续？';
      confirmModal.style.display = 'flex';
      
      // 处理确认逻辑
      confirmYes.onclick = function() {
        closeConfirm();
        executeGeneration(start, end, speed, fps, interval, totalFrames, mode);
      };
      return;
    }

    executeGeneration(start, end, speed, fps, interval, totalFrames, mode);
  });

  async function executeGeneration(start, end, speed, fps, interval, totalFrames, mode) {
    isGenerating = true;
    btnGenerate.disabled = true;
    resultContainer.style.display = 'none';
    progressContainer.style.display = 'flex';
    progressBar.style.width = '0%';
    progressBar.style.background = '#7ba05b';
    progressText.style.color = '#6b5d47';
    progressText.textContent = '准备中...';

    var format = formatSelect.value;
    var effect = effectSelect.value;
    var quality = parseFloat(qualitySelect.value);
    var bgColor = bgColorInput.value;
    
    var targetWidth = widthSelect.value;
    if (targetWidth !== 'original') targetWidth = parseInt(targetWidth, 10);
    else targetWidth = video.videoWidth;
    var targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);

    var canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });

    try {
      if (typeof JSZip === 'undefined') throw new Error('JSZip 库未加载');

      var zip = new JSZip();
      var folder = zip.folder("frames");
      var mimeType = 'image/' + format;
      var ext = format === 'jpeg' ? 'jpg' : format;

      for (var i = 0; i < totalFrames; i++) {
        var currentVideoTime;
        if (mode === 'fps') {
          currentVideoTime = start + (i / fps) * speed;
        } else {
          currentVideoTime = start + i * interval * speed;
        }

        if (currentVideoTime > end) break; // 保险防溢出

        await seekVideoWithTimeout(currentVideoTime);

        // 绘制背景
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // 绘制视频画面
        ctx.save();
        if (effect === 'flip-h') { ctx.translate(targetWidth, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        ctx.restore();

        // 像素级滤镜
        if (effect === 'gray' || effect === 'invert') {
          var imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          var d = imgData.data;
          for (var k = 0; k < d.length; k += 4) {
            if (effect === 'gray') {
              var gray = d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
              d[k] = gray; d[k + 1] = gray; d[k + 2] = gray;
            } else {
              d[k] = 255 - d[k];
              d[k + 1] = 255 - d[k + 1];
              d[k + 2] = 255 - d[k + 2];
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
        
        var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, mimeType, quality); });
        var fileName = 'frame_' + String(i).padStart(4, '0') + '.' + ext;
        folder.file(fileName, blob);

        // 更新进度
        var percent = Math.floor(((i + 1) / totalFrames) * 80);
        progressBar.style.width = percent + '%';
        progressText.textContent = '截取 ' + percent + '%';
        
        // 更新预览图 (仅在生成第一张时)
        if (i === 0) {
          var thumbUrl = URL.createObjectURL(blob);
          resultThumb.src = thumbUrl;
          resultThumb.style.display = 'inline-block';
        }

        // 让出主线程防止 UI 卡死
        await new Promise(function(r) { setTimeout(r, 10); });
      }

      progressText.textContent = '打包中...';
      currentFileBlob = await zip.generateAsync({ type: 'blob' }, function(metadata) {
        var percent = 80 + Math.floor(metadata.percent * 0.2);
        progressBar.style.width = percent + '%';
        progressText.textContent = '打包 ' + percent + '%';
      });
      
      currentFileName = 'video_frames_' + Date.now() + '.zip';
      resultCount.textContent = '(共 ' + totalFrames + ' 张图)';
      
      progressBar.style.width = '100%';
      progressText.textContent = '完成';
      
      setTimeout(function() {
        progressContainer.style.display = 'none';
        resultContainer.style.display = 'flex';
        btnGenerate.disabled = false;
        isGenerating = false;
        showToast('序列帧提取成功！');
      }, 300);

    } catch (err) {
      console.error('生成异常:', err);
      progressBar.style.background = '#c62828';
      progressText.style.color = '#c62828';
      progressText.textContent = '失败';
      showToast('生成失败: ' + err.message, true);
      
      setTimeout(function() {
        progressContainer.style.display = 'none';
        btnGenerate.disabled = false;
        isGenerating = false;
      }, 3000);
    }
  }

  // ================= 下载 =================
  btnDownload.addEventListener('click', function() {
    if (!currentFileBlob) return;
    var url = URL.createObjectURL(currentFileBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('下载已开始');
  });

})();