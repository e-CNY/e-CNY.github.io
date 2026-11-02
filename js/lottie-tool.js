(function () {
  var dropZone = document.getElementById('lt-drop-zone');
  var fileInput = document.getElementById('lt-input');
  var infoBox = document.getElementById('lt-info');
  var preview = document.getElementById('lt-preview');
  var anim = null;
  
  var progressSlider = document.getElementById('lt-progress');
  var currentFrameText = document.getElementById('lt-current-frame');
  var totalFrameText = document.getElementById('lt-total-frame');
  var controlsArea = document.getElementById('lt-controls');
  var btnPlay = document.getElementById('btn-play');

  var animTotalFrames = 0;

  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) handleFile(this.files[0]);
    this.value = '';
  });

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var jsonData = JSON.parse(e.target.result);
        if (!jsonData.w || !jsonData.h) throw new Error('非标准 Lottie 文件');

        infoBox.style.display = 'block';
        document.getElementById('lt-w').textContent = jsonData.w;
        document.getElementById('lt-h').textContent = jsonData.h;
        document.getElementById('lt-fr').textContent = jsonData.fr;
        
        animTotalFrames = jsonData.op;
        var duration = (jsonData.op / jsonData.fr).toFixed(2);
        document.getElementById('lt-duration').textContent = duration;

        preview.innerHTML = '';
        var animContainer = document.createElement('div');
        animContainer.style.width = '100%';
        animContainer.style.height = '100%';
        animContainer.style.maxWidth = jsonData.w + 'px';
        preview.appendChild(animContainer);

        if (anim) anim.destroy();

        anim = lottie.loadAnimation({
          container: animContainer,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: jsonData
        });

        controlsArea.style.display = 'flex';
        progressSlider.max = animTotalFrames;
        totalFrameText.textContent = animTotalFrames;
        btnPlay.textContent = '暂停';

        // 动画帧更新时同步进度条
        anim.addEventListener('enterFrame', function () {
          if (!progressSlider.dataset.dragging) {
            progressSlider.value = anim.currentFrame;
            currentFrameText.textContent = Math.round(anim.currentFrame);
          }
        });

      } catch (err) {
        alert('JSON 解析失败，请确保是有效的 Lottie 文件。\n' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // 播放控制
  btnPlay.addEventListener('click', function () {
    if (!anim) return;
    if (anim.isPaused) {
      anim.play();
      btnPlay.textContent = '暂停';
    } else {
      anim.pause();
      btnPlay.textContent = '播放';
    }
  });

  document.getElementById('btn-replay').addEventListener('click', function () {
    if (!anim) return;
    anim.goToAndPlay(0, true);
    btnPlay.textContent = '暂停';
  });

  // 速度控制
  document.getElementById('lt-speed').addEventListener('change', function () {
    if (anim) anim.setSpeed(parseFloat(this.value));
  });

  // 背景切换
  document.getElementById('lt-bg').addEventListener('change', function () {
    preview.style.backgroundColor = this.value;
    if (this.value === 'transparent') {
      preview.classList.add('transparent-bg');
    } else {
      preview.classList.remove('transparent-bg');
    }
  });

  // 进度条拖动
  progressSlider.addEventListener('mousedown', function () { this.dataset.dragging = 'true'; });
  progressSlider.addEventListener('touchstart', function () { this.dataset.dragging = 'true'; });
  
  progressSlider.addEventListener('input', function () {
    if (anim) {
      anim.goToAndStop(parseFloat(this.value), true);
      currentFrameText.textContent = Math.round(this.value);
      btnPlay.textContent = '播放';
    }
  });

  progressSlider.addEventListener('mouseup', function () { delete this.dataset.dragging; });
  progressSlider.addEventListener('touchend', function () { delete this.dataset.dragging; });

  // 导出当前帧为 PNG
  document.getElementById('btn-export-frame').addEventListener('click', function () {
    if (!anim) return alert('请先上传动画');
    var svg = preview.querySelector('svg');
    if (!svg) return alert('当前帧无可导出的画面');

    var svgData = new XMLSerializer().serializeToString(svg);
    var canvas = document.createElement('canvas');
    canvas.width = svg.clientWidth || 500;
    canvas.height = svg.clientHeight || 500;
    var ctx = canvas.getContext('2d');
    
    var img = document.createElement('img');
    img.onload = function () {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'lottie_frame_' + Date.now() + '.png';
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });
})();