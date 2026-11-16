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

  // ================= DOM 元素 =================
  var dropZone = document.getElementById('lt-drop-zone');
  var fileInput = document.getElementById('lt-input');
  var infoBox = document.getElementById('lt-info');
  var previewWrap = document.getElementById('lt-preview');
  var controlsArea = document.getElementById('lt-controls');
  
  var progressSlider = document.getElementById('lt-progress');
  var currentFrameText = document.getElementById('lt-current-frame');
  var totalFrameText = document.getElementById('lt-total-frame');
  var btnPlay = document.getElementById('btn-play');

  // ================= 状态变量 =================
  var anim = null;
  var animData = null;
  var animTotalFrames = 0;
  var isDraggingProgress = false;

  // ================= 文件读取与拖拽 =================
  dropZone.addEventListener('click', function () { fileInput.click(); });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    dropZone.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragover',  function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) handleFile(this.files[0]);
    this.value = '';
  });

  function handleFile(file) {
    if (!file.name.endsWith('.json')) {
      return showToast('请上传 .json 格式的 Lottie 文件', true);
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        animData = JSON.parse(e.target.result);
        if (!animData.w || !animData.h) throw new Error('非标准 Lottie 文件');
        loadAnimation(animData);
      } catch (err) {
        showToast('JSON 解析失败，请确保是有效的 Lottie 文件', true);
      }
    };
    reader.readAsText(file);
  }

  // ================= 核心加载与渲染 =================
  function loadAnimation(data) {
    infoBox.style.display = 'block';
    document.getElementById('lt-w').textContent = data.w;
    document.getElementById('lt-h').textContent = data.h;
    document.getElementById('lt-fr').textContent = data.fr;
    
    animTotalFrames = data.op;
    var duration = (data.op / data.fr).toFixed(2);
    document.getElementById('lt-total').textContent = animTotalFrames;
    document.getElementById('lt-duration').textContent = duration + 's';

    previewWrap.innerHTML = '';
    var animContainer = document.createElement('div');
    animContainer.style.width = '100%';
    animContainer.style.height = '100%';
    animContainer.style.display = 'flex';
    animContainer.style.alignItems = 'center';
    animContainer.style.justifyContent = 'center';
    previewWrap.appendChild(animContainer);

    if (anim) anim.destroy();

    var renderer = document.getElementById('lt-engine').value;
    var loop = document.getElementById('lt-loop').checked;

    anim = lottie.loadAnimation({
      container: animContainer,
      renderer: renderer,
      loop: loop,
      autoplay: true,
      animationData: data
    });

    controlsArea.style.display = 'flex';
    progressSlider.max = animTotalFrames;
    totalFrameText.textContent = animTotalFrames;
    btnPlay.textContent = '⏸️';

    // 根据背景设置
    var bgVal = document.getElementById('lt-bg').value;
    if (bgVal === 'transparent') {
      previewWrap.classList.add('transparent-bg');
      previewWrap.style.backgroundColor = '';
    } else {
      previewWrap.classList.remove('transparent-bg');
      previewWrap.style.backgroundColor = bgVal;
    }

    // 监听帧更新
    anim.addEventListener('enterFrame', function () {
      if (!isDraggingProgress) {
        var curr = Math.round(anim.currentFrame);
        progressSlider.value = curr;
        currentFrameText.textContent = curr;
      }
    });

    // 动画结束事件 (如果非循环)
    anim.addEventListener('complete', function() {
      btnPlay.textContent = '▶️';
    });

    showToast('动画加载成功');
  }

  // ================= 播放控制 =================
  btnPlay.addEventListener('click', function () {
    if (!anim) return;
    if (anim.isPaused) {
      anim.play();
      btnPlay.textContent = '⏸️';
    } else {
      anim.pause();
      btnPlay.textContent = '▶️';
    }
  });

  document.getElementById('btn-replay').addEventListener('click', function () {
    if (!anim) return;
    anim.goToAndPlay(0, true);
    btnPlay.textContent = '⏸️';
  });

  document.getElementById('btn-prev').addEventListener('click', function () {
    if (!anim) return;
    anim.pause();
    btnPlay.textContent = '▶️';
    var newFrame = Math.max(0, anim.currentFrame - 1);
    anim.goToAndStop(newFrame, true);
    progressSlider.value = newFrame;
    currentFrameText.textContent = Math.round(newFrame);
  });

  document.getElementById('btn-next').addEventListener('click', function () {
    if (!anim) return;
    anim.pause();
    btnPlay.textContent = '▶️';
    var newFrame = Math.min(animTotalFrames, anim.currentFrame + 1);
    anim.goToAndStop(newFrame, true);
    progressSlider.value = newFrame;
    currentFrameText.textContent = Math.round(newFrame);
  });

  // 进度条拖拽
  progressSlider.addEventListener('mousedown', function () { isDraggingProgress = true; });
  progressSlider.addEventListener('touchstart', function () { isDraggingProgress = true; });
  
  progressSlider.addEventListener('input', function () {
    if (anim) {
      if (!anim.isPaused) {
        anim.pause();
        btnPlay.textContent = '▶️';
      }
      var target = parseFloat(this.value);
      anim.goToAndStop(target, true);
      currentFrameText.textContent = Math.round(target);
    }
  });

  function endDrag() {
    isDraggingProgress = false;
  }
  progressSlider.addEventListener('mouseup', endDrag);
  progressSlider.addEventListener('touchend', endDrag);
  window.addEventListener('mouseup', endDrag);

  // ================= 选项切换 =================
  document.getElementById('lt-speed').addEventListener('change', function () {
    if (anim) anim.setSpeed(parseFloat(this.value));
  });

  document.getElementById('lt-loop').addEventListener('change', function () {
    if (anim) anim.loop = this.checked;
  });

  document.getElementById('lt-engine').addEventListener('change', function () {
    if (animData) loadAnimation(animData);
  });

  document.getElementById('lt-bg').addEventListener('change', function () {
    if (this.value === 'transparent') {
      previewWrap.classList.add('transparent-bg');
      previewWrap.style.backgroundColor = '';
    } else {
      previewWrap.classList.remove('transparent-bg');
      previewWrap.style.backgroundColor = this.value;
    }
  });

  // ================= 高清帧导出 =================
  document.getElementById('btn-export-frame').addEventListener('click', function () {
    if (!anim) return showToast('请先上传动画', true);
    
    // 暂停动画以获得稳定画面
    anim.pause();
    btnPlay.textContent = '▶️';

    var scale = parseInt(document.getElementById('lt-scale').value, 10) || 2;
    var svg = previewWrap.querySelector('svg');
    var canvasEl = previewWrap.querySelector('canvas');
    var bgColor = document.getElementById('lt-bg').value;

    if (!svg && !canvasEl) return showToast('当前帧无可导出的画面', true);

    showToast('正在生成高清图片...');

    setTimeout(function() {
      try {
        var outCanvas = document.createElement('canvas');
        var outCtx = outCanvas.getContext('2d');
        
        var w = animData.w;
        var h = animData.h;

        outCanvas.width = w * scale;
        outCanvas.height = h * scale;

        // 绘制背景
        if (bgColor !== 'transparent') {
          outCtx.fillStyle = bgColor;
          outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
        }

        if (canvasEl) {
          // 直接提取 Canvas 数据
          outCtx.drawImage(canvasEl, 0, 0, outCanvas.width, outCanvas.height);
          triggerDownload(outCanvas);
        } else if (svg) {
          // 提取 SVG 并转换为图片
          var svgData = new XMLSerializer().serializeToString(svg);
          // 保证命名空间
          if (svgData.indexOf('xmlns=') === -1) {
            svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          
          var img = new Image();
          // 使用安全的 Base64 编码，避免中文报错
          var svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
          
          img.onload = function () {
            outCtx.drawImage(img, 0, 0, outCanvas.width, outCanvas.height);
            triggerDownload(outCanvas);
          };
          img.onerror = function() {
            showToast('当前帧包含跨域资源，无法导出，请尝试切换为 Canvas 引擎', true);
          };
          img.src = svgUrl;
        }
      } catch (err) {
        console.error(err);
        showToast('导出失败: ' + err.message, true);
      }
    }, 100);
  });

  function triggerDownload(canvas) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'lottie_frame_' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('图片已下载');
  }

  // ================= 快捷键 =================
  document.addEventListener('keydown', function(e) {
    if (!anim) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      btnPlay.click();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      document.getElementById('btn-prev').click();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      document.getElementById('btn-next').click();
    }
  });

})();