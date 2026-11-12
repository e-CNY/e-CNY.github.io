(function () {
  'use strict';

  /* ============================================================
   * 常量
   * ============================================================ */
  var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  var CANVAS_W = 1600;
  var CANVAS_H = 800;
  var MAX_HISTORY = 30;

  /* ============================================================
   * DOM
   * ============================================================ */
  var container = document.getElementById('canvas-container');
  var stack = document.getElementById('canvas-stack');
  var bgCanvas = document.getElementById('bg-canvas');
  var bgCtx = bgCanvas.getContext('2d');
  var sigCanvas = document.getElementById('signature-canvas');
  var sigCtx = sigCanvas.getContext('2d', { willReadFrequently: true });

  var customColorInput = document.getElementById('custom-color');
  var colorBtns = document.querySelectorAll('.color-btn');
  var brushSizeInput = document.getElementById('brush-size');
  var brushSizeVal = document.getElementById('brush-size-val');
  var pressureEnabled = document.getElementById('pressure-enabled');
  var bgModeSelect = document.getElementById('bg-mode');
  var autoCropCheckbox = document.getElementById('auto-crop');
  var exportFormatSelect = document.getElementById('export-format');

  var btnUndo = document.getElementById('btn-undo');
  var btnRedo = document.getElementById('btn-redo');
  var btnClear = document.getElementById('btn-clear');
  var btnDownload = document.getElementById('btn-download');

  var btnUpload = document.getElementById('btn-upload');
  var imageInput = document.getElementById('image-input');
  var imagePanel = document.getElementById('image-panel');
  var imageZoomInput = document.getElementById('image-zoom');
  var imageZoomVal = document.getElementById('image-zoom-val');
  var btnMoveImage = document.getElementById('btn-move-image');
  var btnFitImage = document.getElementById('btn-fit-image');
  var btnFillImage = document.getElementById('btn-fill-image');
  var btnResetImage = document.getElementById('btn-reset-image');
  var btnRemoveImage = document.getElementById('btn-remove-image');

  /* ============================================================
   * 签名引擎状态（原生 Canvas）
   * ============================================================ */
  var currentColor = '#000000';
  var currentBaseSize = 4;
  var usePressure = true;

  var isDrawing = false;
  var currentStroke = [];        // 当前笔画：{x, y, w}，w 为该点计算后的线宽
  var lastPoint = null;
  var lastTime = 0;

  var strokes = [];              // 所有已完成的笔画（每个笔画是 {x,y,w} 数组）
  var redoStack = [];            // 重做栈（存 strokes 快照）

  /* ============================================================
   * 底图状态
   * ============================================================ */
  var imageState = {
    img: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    mime: 'image/png'
  };
  var isMovingImage = false;
  var isDraggingImage = false;
  var dragStart = null;

  /* ============================================================
   * 1. 画布初始化
   * ============================================================ */
  function setupCanvasSize() {
    bgCanvas.width = CANVAS_W;
    bgCanvas.height = CANVAS_H;
    sigCanvas.width = CANVAS_W;
    sigCanvas.height = CANVAS_H;
  }

  /* ============================================================
   * 2. 背景
   * ============================================================ */
  function applyBackground() {
    if (imageState.img) {
      sigCanvas.style.background = 'transparent';
      sigCanvas.style.backgroundImage = 'none';
      return;
    }
    var mode = bgModeSelect.value;
    if (mode === 'white') {
      sigCanvas.style.background = '#ffffff';
      sigCanvas.style.backgroundImage = 'none';
    } else if (mode === 'transparent') {
      sigCanvas.style.background = 'transparent';
      sigCanvas.style.backgroundImage = 'none';
    } else {
      sigCanvas.style.background = '#ffffff';
      sigCanvas.style.backgroundImage = 'radial-gradient(#ccc 1px, transparent 1px)';
      sigCanvas.style.backgroundSize = '20px 20px';
    }
  }
  bgModeSelect.addEventListener('change', applyBackground);

  /* ============================================================
   * 3. 底图绘制
   * ============================================================ */
  function drawBgImage() {
    bgCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    var img = imageState.img;
    if (!img) return;

    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    var base = Math.min(CANVAS_W / iw, CANVAS_H / ih);
    var s = base * imageState.scale;
    var dw = iw * s;
    var dh = ih * s;
    var dx = (CANVAS_W - dw) / 2 + imageState.offsetX;
    var dy = (CANVAS_H - dh) / 2 + imageState.offsetY;

    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = 'high';
    bgCtx.drawImage(img, dx, dy, dw, dh);
  }

  /* ============================================================
   * 4. 图片上传 / 缩放 / 拖动 / 移除
   * ============================================================ */
  btnUpload.addEventListener('click', function () { imageInput.click(); });

  imageInput.addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;

    if (!/^image\//.test(file.type)) { alert('请选择图片文件'); return; }
    if (file.size > MAX_FILE_SIZE) {
      alert('图片不能超过 10MB\n当前约 ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
        if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') mime = 'image/png';

        imageState.img = img;
        imageState.scale = 1;
        imageState.offsetX = 0;
        imageState.offsetY = 0;
        imageState.mime = mime;

        imageZoomInput.value = 1;
        imageZoomVal.textContent = '100%';
        imagePanel.hidden = false;
        container.classList.add('has-image');
        autoCropCheckbox.disabled = true;

        drawBgImage();
        applyBackground();
      };
      img.onerror = function () { alert('图片加载失败'); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { alert('文件读取失败'); };
    reader.readAsDataURL(file);
  });

  function setZoom(value) {
    imageState.scale = Math.min(3, Math.max(0.2, value));
    imageZoomInput.value = imageState.scale;
    imageZoomVal.textContent = Math.round(imageState.scale * 100) + '%';
    drawBgImage();
  }
  imageZoomInput.addEventListener('input', function () { setZoom(parseFloat(this.value)); });

  container.addEventListener('wheel', function (e) {
    if (!imageState.img) return;
    e.preventDefault();
    setZoom(imageState.scale + (e.deltaY > 0 ? -0.08 : 0.08));
  }, { passive: false });

  function setMovingMode(on) {
    isMovingImage = on;
    btnMoveImage.classList.toggle('active', on);
    btnMoveImage.textContent = on ? '✅ 拖动中（点击退出）' : '✋ 拖动图片';
    stack.classList.toggle('move-mode', on);
    container.classList.toggle('move-mode', on);
    if (!on) isDraggingImage = false;
  }
  btnMoveImage.addEventListener('click', function () {
    if (!imageState.img) return;
    setMovingMode(!isMovingImage);
  });

  btnFitImage.addEventListener('click', function () {
    if (!imageState.img) return;
    imageState.scale = 1; imageState.offsetX = 0; imageState.offsetY = 0;
    imageZoomInput.value = 1; imageZoomVal.textContent = '100%';
    drawBgImage();
  });

  btnFillImage.addEventListener('click', function () {
    if (!imageState.img) return;
    var iw = imageState.img.naturalWidth, ih = imageState.img.naturalHeight;
    var cover = Math.max(CANVAS_W / iw, CANVAS_H / ih) / Math.min(CANVAS_W / iw, CANVAS_H / ih);
    imageState.scale = cover;
    imageState.offsetX = 0; imageState.offsetY = 0;
    imageZoomInput.value = cover; imageZoomVal.textContent = Math.round(cover * 100) + '%';
    drawBgImage();
  });

  btnResetImage.addEventListener('click', function () {
    if (!imageState.img) return;
    imageState.scale = 1; imageState.offsetX = 0; imageState.offsetY = 0;
    imageZoomInput.value = 1; imageZoomVal.textContent = '100%';
    drawBgImage();
  });

  btnRemoveImage.addEventListener('click', function () {
    if (!imageState.img) return;
    if (!confirm('确定移除底图吗？已写的签名会保留。')) return;
    setMovingMode(false);
    imageState.img = null;
    imageState.mime = 'image/png';
    imageState.scale = 1; imageState.offsetX = 0; imageState.offsetY = 0;
    imagePanel.hidden = true;
    container.classList.remove('has-image');
    autoCropCheckbox.disabled = false;
    bgCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    applyBackground();
  });

  // 拖动底图
  container.addEventListener('pointerdown', function (e) {
    if (!isMovingImage || !imageState.img) return;
    e.preventDefault();
    isDraggingImage = true;
    dragStart = { x: e.clientX, y: e.clientY, ox: imageState.offsetX, oy: imageState.offsetY };
    try { container.setPointerCapture(e.pointerId); } catch (err) {}
  });

  container.addEventListener('pointermove', function (e) {
    if (!isDraggingImage) return;
    e.preventDefault();
    var rect = sigCanvas.getBoundingClientRect();
    var k = CANVAS_W / rect.width;
    imageState.offsetX = dragStart.ox + (e.clientX - dragStart.x) * k;
    imageState.offsetY = dragStart.oy + (e.clientY - dragStart.y) * k;
    drawBgImage();
  });

  function endImageDrag(e) {
    if (!isDraggingImage) return;
    isDraggingImage = false;
    try { container.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  container.addEventListener('pointerup', endImageDrag);
  container.addEventListener('pointercancel', endImageDrag);

  /* ============================================================
   * 5. 签名引擎：速度/压感线宽 + 二次贝塞尔平滑
   * ============================================================ */
  function getPos(e) {
    var rect = sigCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_H / rect.height)
    };
  }

  // 根据速度 + 压力计算线宽
  function calcWidth(prev, curr, dt, pressure) {
    var base = currentBaseSize;
    if (!usePressure) return base;

    var dx = curr.x - prev.x;
    var dy = curr.y - prev.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = dt > 0 ? dist / dt : 0; // px/ms

    // 速度越快线宽越细：speed 0 -> 1.6x, speed 2+ -> 0.4x
    var speedFactor = Math.max(0.4, Math.min(1.6, 1.6 - speed * 0.6));

    // 真实压感（如果设备支持）
    var pressureFactor = 1;
    if (typeof pressure === 'number' && pressure > 0) {
      pressureFactor = 0.5 + pressure * 0.8; // 0.5x ~ 1.3x
    }

    return Math.max(0.5, base * speedFactor * pressureFactor);
  }

  function redrawAll() {
    sigCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    for (var s = 0; s < strokes.length; s++) {
      drawStroke(strokes[s]);
    }
  }

  function drawStroke(stroke) {
    if (!stroke.length) return;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = currentColor;

    if (stroke.length === 1) {
      var p = stroke[0];
      sigCtx.beginPath();
      sigCtx.arc(p.x, p.y, p.w / 2, 0, Math.PI * 2);
      sigCtx.fillStyle = currentColor;
      sigCtx.fill();
      return;
    }

    // 二次贝塞尔平滑：以中点作为锚点
    for (var i = 1; i < stroke.length - 1; i++) {
      var p0 = stroke[i - 1];
      var p1 = stroke[i];
      var p2 = stroke[i + 1];

      var mid1x = (p0.x + p1.x) / 2;
      var mid1y = (p0.y + p1.y) / 2;
      var mid2x = (p1.x + p2.x) / 2;
      var mid2y = (p1.y + p2.y) / 2;

      sigCtx.beginPath();
      sigCtx.moveTo(mid1x, mid1y);
      sigCtx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
      // 使用该段平均线宽（也可以逐点设置，这里用中点线宽更稳定）
      sigCtx.lineWidth = (p1.w + p2.w) / 2;
      sigCtx.stroke();
    }
  }

  function startDrawing(e) {
    isDrawing = true;
    var pos = getPos(e);
    var pressure = (typeof e.pressure === 'number' && e.pressure > 0) ? e.pressure : 0.5;

    currentStroke = [{
      x: pos.x,
      y: pos.y,
      w: currentBaseSize * (usePressure ? (0.5 + pressure * 0.8) : 1)
    }];
    lastPoint = pos;
    lastTime = performance.now();

    // 绘制起始点
    sigCtx.beginPath();
    sigCtx.arc(pos.x, pos.y, currentStroke[0].w / 2, 0, Math.PI * 2);
    sigCtx.fillStyle = currentColor;
    sigCtx.fill();
  }

  function moveDrawing(e) {
    if (!isDrawing) return;

    var pos = getPos(e);
    var now = performance.now();
    var dt = Math.max(1, now - lastTime);
    var pressure = (typeof e.pressure === 'number' && e.pressure > 0) ? e.pressure : 0.5;

    var w = calcWidth(lastPoint, pos, dt, pressure);

    currentStroke.push({ x: pos.x, y: pos.y, w: w });

    // 实时绘制新的一段
    var len = currentStroke.length;
    if (len >= 3) {
      var p0 = currentStroke[len - 3];
      var p1 = currentStroke[len - 2];
      var p2 = currentStroke[len - 1];

      var mid1x = (p0.x + p1.x) / 2;
      var mid1y = (p0.y + p1.y) / 2;
      var mid2x = (p1.x + p2.x) / 2;
      var mid2y = (p1.y + p2.y) / 2;

      sigCtx.beginPath();
      sigCtx.moveTo(mid1x, mid1y);
      sigCtx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
      sigCtx.lineWidth = (p1.w + p2.w) / 2;
      sigCtx.stroke();
    }

    lastPoint = pos;
    lastTime = now;
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke.length > 0) {
      // 收尾：画最后一段
      var len = currentStroke.length;
      if (len >= 2) {
        var p1 = currentStroke[len - 2];
        var p2 = currentStroke[len - 1];
        sigCtx.beginPath();
        sigCtx.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        sigCtx.lineTo(p2.x, p2.y);
        sigCtx.lineWidth = p2.w;
        sigCtx.stroke();
      }

      strokes.push(currentStroke.slice());
      redoStack = [];
      updateButtons();
    }
    currentStroke = [];
    lastPoint = null;
  }

  sigCanvas.addEventListener('pointerdown', function (e) {
    if (isMovingImage) return;
    e.preventDefault();
    try { sigCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    startDrawing(e);
  });
  sigCanvas.addEventListener('pointermove', function (e) {
    if (isMovingImage) return;
    if (isDrawing) { e.preventDefault(); moveDrawing(e); }
  });
  sigCanvas.addEventListener('pointerup', function (e) {
    if (isMovingImage) return;
    e.preventDefault();
    stopDrawing();
  });
  sigCanvas.addEventListener('pointercancel', function (e) {
    if (isMovingImage) return;
    e.preventDefault();
    stopDrawing();
  });

  /* ============================================================
   * 6. 画笔设置
   * ============================================================ */
  colorBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      colorBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentColor = this.dataset.color;
      customColorInput.value = currentColor;
    });
  });

  customColorInput.addEventListener('input', function () {
    currentColor = this.value;
    colorBtns.forEach(function (b) { b.classList.remove('active'); });
  });

  brushSizeInput.addEventListener('input', function () {
    currentBaseSize = parseFloat(this.value);
    brushSizeVal.textContent = currentBaseSize;
  });

  pressureEnabled.addEventListener('change', function () {
    usePressure = this.checked;
  });

  /* ============================================================
   * 7. 撤销 / 重做 / 清空
   * ============================================================ */
  function updateButtons() {
    btnUndo.disabled = strokes.length === 0;
    btnRedo.disabled = redoStack.length === 0;
  }

  btnUndo.addEventListener('click', function () {
    if (!strokes.length) return;
    redoStack.push(strokes.pop());
    redrawAll();
    updateButtons();
  });

  btnRedo.addEventListener('click', function () {
    if (!redoStack.length) return;
    strokes.push(redoStack.pop());
    redrawAll();
    updateButtons();
  });

  btnClear.addEventListener('click', function () {
    if (!strokes.length) return;
    if (!confirm('确定清空签名吗？')) return;
    redoStack.push(strokes.slice());
    strokes = [];
    redrawAll();
    updateButtons();
  });

  /* ============================================================
   * 8. 导出
   * ============================================================ */
  function triggerDownload(url, ext) {
    var a = document.createElement('a');
    a.href = url;
    a.download = 'signature_' + Date.now() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function exportSignatureOnly() {
    var target = sigCanvas;

    if (autoCropCheckbox.checked && strokes.length > 0) {
      var imgData = sigCtx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      var w = imgData.width, h = imgData.height, pixels = imgData.data;
      var top = h, bottom = -1, left = w, right = -1, found = false;

      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (pixels[(y * w + x) * 4 + 3] > 0) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
            found = true;
          }
        }
      }

      if (!found) { alert('画板是空的，请先签名！'); return; }

      var pad = 12;
      top = Math.max(0, top - pad);
      left = Math.max(0, left - pad);
      bottom = Math.min(h - 1, bottom + pad);
      right = Math.min(w - 1, right + pad);

      var cw = right - left + 1, ch = bottom - top + 1;
      var temp = document.createElement('canvas');
      temp.width = cw; temp.height = ch;
      temp.getContext('2d').drawImage(sigCanvas, left, top, cw, ch, 0, 0, cw, ch);
      target = temp;
    }

    var fmt = exportFormatSelect.value;
    if (fmt === 'auto') fmt = 'png';
    var mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
    var mime = mimeMap[fmt] || 'image/png';

    if (mime === 'image/jpeg') {
      var out = document.createElement('canvas');
      out.width = target.width; out.height = target.height;
      var octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(target, 0, 0);
      target = out;
    }

    var url = target.toDataURL(mime, 0.95);
    if (url.indexOf('data:' + mime) !== 0) {
      mime = 'image/png';
      url = target.toDataURL('image/png', 1.0);
    }
    triggerDownload(url, mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]);
  }

  function exportWithImage() {
    var out = document.createElement('canvas');
    out.width = CANVAS_W; out.height = CANVAS_H;
    var octx = out.getContext('2d');

    var fmt = exportFormatSelect.value;
    var mime = fmt === 'auto' ? imageState.mime : (fmt === 'jpeg' ? 'image/jpeg' : 'image/' + fmt);

    if (mime === 'image/jpeg') {
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
    }

    octx.drawImage(bgCanvas, 0, 0);
    octx.drawImage(sigCanvas, 0, 0);

    var url = out.toDataURL(mime, 0.95);
    if (url.indexOf('data:' + mime) !== 0) {
      mime = 'image/png';
      url = out.toDataURL('image/png', 1.0);
    }
    triggerDownload(url, mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]);
  }

  btnDownload.addEventListener('click', function () {
    if (imageState.img) exportWithImage();
    else exportSignatureOnly();
  });

  /* ============================================================
   * 9. 快捷键
   * ============================================================ */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) btnRedo.click();
      else btnUndo.click();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (strokes.length) {
        e.preventDefault();
        btnClear.click();
      }
    }
  });

  /* ============================================================
   * 10. 初始化
   * ============================================================ */
  setupCanvasSize();
  applyBackground();
  updateButtons();

})();