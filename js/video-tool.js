(function () {
  var dropZone = document.getElementById('vt-drop-zone');
  var fileInput = document.getElementById('vt-input');
  var workspace = document.getElementById('vt-workspace');
  var video = document.getElementById('vt-video');
  var timeline = document.getElementById('vt-timeline');
  var canvas = document.getElementById('vt-canvas');
  var ctx = canvas.getContext('2d');
  var previewArea = document.querySelector('.vt-preview-area');

  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() {
    if (this.files.length > 0) loadVideo(this.files[0]);
    this.value = '';
  });

  function loadVideo(file) {
    var url = URL.createObjectURL(file);
    video.src = url;
    
    dropZone.style.display = 'none';
    workspace.style.display = 'flex';
    
    video.addEventListener('loadedmetadata', function() {
      document.getElementById('vt-res').textContent = video.videoWidth + ' x ' + video.videoHeight;
      document.getElementById('vt-duration').textContent = video.duration.toFixed(2) + ' s';
      
      timeline.max = video.duration;
      timeline.value = 0;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }, { once: true });
  }

  timeline.addEventListener('input', function() {
    video.currentTime = this.value;
  });

  video.addEventListener('timeupdate', function() {
    if (!video.paused) {
      timeline.value = video.currentTime;
    }
  });

  document.getElementById('vt-capture').addEventListener('click', function() {
    if (!video.videoWidth) return;
    
    // 绘制当前帧到 Canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 显示预览并转为可下载的图片
    canvas.style.display = 'block';
    previewArea.classList.add('active');
    
    canvas.toBlob(function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'snapshot_' + video.currentTime.toFixed(3) + 's.png';
      a.textContent = '⬇️ 点击下载此截图';
      
      // 替换之前的链接
      var oldLink = previewArea.querySelector('a');
      if (oldLink) oldLink.remove();
      
      a.className = 'vt-btn primary';
      a.style.display = 'inline-block';
      a.style.marginTop = '12px';
      a.style.textDecoration = 'none';
      
      previewArea.appendChild(a);
    }, 'image/png');
  });
})();