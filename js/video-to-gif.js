(function() {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var video = document.getElementById('video-player');
  var emptyHint = document.getElementById('empty-hint');
  var settings = document.getElementById('settings');

  var currentTimeEl = document.getElementById('current-time');
  var durationEl = document.getElementById('duration');
  var startTimeEl = document.getElementById('start-time');
  var endTimeEl = document.getElementById('end-time');
  var btnSetStart = document.getElementById('btn-set-start');
  var btnSetEnd = document.getElementById('btn-set-end');

  var speedSelect = document.getElementById('speed-select');
  var effectSelect = document.getElementById('effect-select');
  var widthSelect = document.getElementById('width-select');
  var formatSelect = document.getElementById('format-select');
  var fpsSelect = document.getElementById('fps-select');
  var qualitySelect = document.getElementById('quality-select');
  var bgColorInput = document.getElementById('bg-color');
  
  var qualityGroup = document.getElementById('quality-group');
  
  var btnGenerate = document.getElementById('btn-generate');
  var progressContainer = document.getElementById('progress-container');
  var progressBar = document.getElementById('progress-bar');
  var progressText = document.getElementById('progress-text');

  var resultContainer = document.getElementById('result-container');
  var previewBox = document.getElementById('preview-box');
  var btnDownload = document.getElementById('btn-download');

  var currentFileBlob = null;
  var currentFileName = 'output';

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // 1. 上传视频
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
    if (!file.type.startsWith('video/')) return alert('请选择视频文件！');
    var url = URL.createObjectURL(file);
    video.src = url;
    video.style.display = 'block';
    emptyHint.style.display = 'none';
    settings.style.display = 'block';
    resultContainer.style.display = 'none';

    video.onloadedmetadata = function() {
      durationEl.textContent = formatTime(video.duration);
      startTimeEl.max = video.duration;
      endTimeEl.max = video.duration;
      startTimeEl.value = 0;
      endTimeEl.value = Math.min(3, video.duration);
      video.currentTime = 0;
    };
  }

  // 2. 格式切换 (PNG 不支持质量设置)
  formatSelect.addEventListener('change', function() {
    if (this.value === 'png') {
      qualityGroup.style.opacity = '0.5';
      qualitySelect.disabled = true;
    } else {
      qualityGroup.style.opacity = '1';
      qualitySelect.disabled = false;
    }
  });

  // 3. 时间轴
  video.addEventListener('timeupdate', function() {
    currentTimeEl.textContent = formatTime(video.currentTime);
  });
  btnSetStart.addEventListener('click', function() { startTimeEl.value = video.currentTime.toFixed(1); });
  btnSetEnd.addEventListener('click', function() { endTimeEl.value = video.currentTime.toFixed(1); });

  // 强制超时的 seek 机制
  function seekVideoWithTimeout(time) {
    return new Promise(function(resolve) {
      if (Math.abs(video.currentTime - time) < 0.1) { setTimeout(resolve, 20); return; }
      video.currentTime = time;
      var check = 0;
      var timer = setInterval(function() {
        if (Math.abs(video.currentTime - time) < 0.2) {
          clearInterval(timer); setTimeout(resolve, 20);
        } else if (++check > 30) { // 最多等 1.5 秒
          clearInterval(timer); resolve();
        }
      }, 50);
    });
  }

  // 4. 核心生成逻辑
  btnGenerate.addEventListener('click', async function() {
    if (!video.src) return;
    var start = parseFloat(startTimeEl.value);
    var end = parseFloat(endTimeEl.value);
    
    if (start >= end) return alert('结束时间必须大于起始时间！');
    if (end - start > 30) return alert('截取的片段不能超过 30 秒（防溢出）。');

    var fps = parseInt(fpsSelect.value, 10);
    var duration = (end - start) / parseFloat(speedSelect.value);
    var estimatedFrames = Math.floor(duration * fps);

    // 高帧率警告提示
    if (fps >= 60 && estimatedFrames > 300) {
      var confirmHighFps = confirm('⚠️ 提示：您选择了 ' + fps + ' 帧的高帧率，预计将生成 ' + estimatedFrames + ' 张图片。\n\n这可能需要消耗大量内存和处理时间（数分钟甚至更久）。\n如果原视频不是高帧率视频，建议选择 24-30 帧以减少重复帧。\n\n是否继续？');
      if (!confirmHighFps) return;
    }

    btnGenerate.disabled = true;
    resultContainer.style.display = 'none';
    progressContainer.style.display = 'flex';
    progressBar.style.width = '0%';
    progressBar.style.background = '#7ba05b';
    progressText.style.color = '#6b5d47';
    progressText.textContent = '初始化...';

    var format = formatSelect.value;
    var speed = parseFloat(speedSelect.value);
    var effect = effectSelect.value;
    var quality = parseFloat(qualitySelect.value);
    var bgColor = bgColorInput.value;
    
    var targetWidth = widthSelect.value;
    if (targetWidth !== 'original') targetWidth = parseInt(targetWidth, 10);
    else targetWidth = video.videoWidth;
    var targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);

    var totalFrames = Math.floor(duration * fps);

    var canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });

    try {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip 库未加载，请检查 js/libs/jszip.min.js');
      }

      var zip = new JSZip();
      var folder = zip.folder("frames");
      var mimeType = 'image/' + format;
      var ext = format === 'jpeg' ? 'jpg' : format;

      progressText.textContent = '截取中...';
      for (var i = 0; i < totalFrames; i++) {
        await seekVideoWithTimeout(start + (i / fps) * speed);

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        ctx.save();
        if (effect === 'flip-h') { ctx.translate(targetWidth, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        ctx.restore();

        if (effect === 'gray') {
          var imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          for (var k = 0; k < imgData.data.length; k += 4) {
            var gray = imgData.data[k] * 0.3 + imgData.data[k + 1] * 0.59 + imgData.data[k + 2] * 0.11;
            imgData.data[k] = gray; imgData.data[k + 1] = gray; imgData.data[k + 2] = gray;
          }
          ctx.putImageData(imgData, 0, 0);
        } else if (effect === 'invert') {
          var imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          for (var k = 0; k < imgData.data.length; k += 4) {
            imgData.data[k] = 255 - imgData.data[k];
            imgData.data[k + 1] = 255 - imgData.data[k + 1];
            imgData.data[k + 2] = 255 - imgData.data[k + 2];
          }
          ctx.putImageData(imgData, 0, 0);
        }
        
        var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, mimeType, quality); });
        folder.file('frame_' + String(i).padStart(4, '0') + '.' + ext, blob);

        var percent = Math.floor(((i + 1) / totalFrames) * 80);
        progressBar.style.width = percent + '%';
        progressText.textContent = '截取 ' + percent + '%';
        
        await new Promise(function(r) { setTimeout(r, 10); });
      }

      progressText.textContent = '打包中...';
      currentFileBlob = await zip.generateAsync({ type: 'blob' }, function(metadata) {
        var percent = 80 + Math.floor(metadata.percent * 0.2);
        progressBar.style.width = percent + '%';
        progressText.textContent = '打包 ' + percent + '%';
      });
      
      currentFileName = 'frames_' + Date.now() + '.zip';
      previewBox.innerHTML = '📦 ZIP 序列帧已生成<br><small style="font-weight:normal;color:#8a7a5f;display:block;margin-top:8px;">共 ' + totalFrames + ' 张图片，请点击右上角下载查看</small>';
      
      progressBar.style.width = '100%';
      progressText.textContent = '完成';
      setTimeout(function() {
        progressContainer.style.display = 'none';
        resultContainer.style.display = 'flex';
        btnGenerate.disabled = false;
      }, 300);

    } catch (err) {
      console.error('生成异常:', err);
      progressBar.style.background = '#c62828';
      progressText.style.color = '#c62828';
      progressText.textContent = '失败: ' + err.message;
      setTimeout(function() {
        progressContainer.style.display = 'none';
        btnGenerate.disabled = false;
      }, 5000);
    }
  });

  // 5. 下载
  btnDownload.addEventListener('click', function() {
    if (!currentFileBlob) return;
    var url = URL.createObjectURL(currentFileBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(url);
  });

})();