(function () {
  'use strict';

  /* ============================================================
   * 常量
   * ============================================================ */
  var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  var CANVAS_W = 1600;
  var CANVAS_H = 800;
  var MAX_HISTORY = 30;
  var DRAFT_KEY = 'es_draft_v2';

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

  var engineModeSelect = document.getElementById('engine-mode');
  var brushTypeSelect = document.getElementById('brush-type');
  var opacityInput = document.getElementById('stroke-opacity');
  var opacityVal = document.getElementById('stroke-opacity-val');
  var exportScaleSelect = document.getElementById('export-scale');
  var exportQualityInput = document.getElementById('export-quality');
  var btnRotateCcw = document.getElementById('btn-rotate-ccw');
  var btnRotateCw = document.getElementById('btn-rotate-cw');
  var btnFlipH = document.getElementById('btn-flip-h');
  var btnFlipV = document.getElementById('btn-flip-v');
  var btnSaveDraft = document.getElementById('btn-save-draft');
  var btnLoadDraft = document.getElementById('btn-load-draft');
  var btnFullscreen = document.getElementById('btn-fullscreen');
  var btnCenterSign = document.getElementById('btn-center-sign');
  var btnExportSvg = document.getElementById('btn-export-svg');
  var orientationSelect = document.getElementById('board-orientation');

  /* ============================================================
   * 签名引擎状态（原生 Canvas）
   * ============================================================ */
  var currentColor = '#000000';
  var currentBaseSize = 4;
  var usePressure = true;
  var currentOpacity = 1;
  var brushType = 'pen'; // pen | marker | eraser

  var isDrawing = false;
  var currentStroke = [];        // 当前笔画：{x, y, w}
  var lastPoint = null;
  var lastTime = 0;

  var strokes = [];              // 原生引擎：{type,color,size,opacity,points:[{x,y,w}]}
  var redoStack = [];

  /* ============================================================
   * 底图状态
   * ============================================================ */
  var imageState = {
    img: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,   // 0/90/180/270
    flipH: false,
    flipV: false,
    mime: 'image/png'
  };
  var isMovingImage = false;
  var isDraggingImage = false;
  var dragStart = null;

  /* ============================================================
   * 画板方向
   * ============================================================ */
  var boardW = CANVAS_W;
  var boardH = CANVAS_H;

  /* ============================================================
   * 库可用性
   * ============================================================ */
  var hasFileSaver = typeof window.saveAs === 'function';
  var hasSigPad = typeof window.SignaturePad === 'function';
  var signaturePad = null;
  var engineMode = 'native';     // native | signaturepad

  /* ============================================================
   * 1. 画布初始化
   * ============================================================ */
  function setupCanvasSize(w, h) {
    boardW = w || CANVAS_W;
    boardH = h || CANVAS_H;
    bgCanvas.width = boardW;
    bgCanvas.height = boardH;
    sigCanvas.width = boardW;
    sigCanvas.height = boardH;
    if (signaturePad) signaturePad.clear();
    drawBgImage();
    redrawAll();
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
   * 3. 底图绘制（含旋转 / 翻转）
   * ============================================================ */
  function drawBgImage() {
    bgCtx.clearRect(0, 0, boardW, boardH);
    var img = imageState.img;
    if (!img) return;

    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    var base = Math.min(boardW / iw, boardH / ih);
    var s = base * imageState.scale;
    var dw = iw * s;
    var dh = ih * s;
    var dx = (boardW - dw) / 2 + imageState.offsetX;
    var dy = (boardH - dh) / 2 + imageState.offsetY;

    bgCtx.save();
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = 'high';

    var cx = dx + dw / 2;
    var cy = dy + dh / 2;
    bgCtx.translate(cx, cy);
    bgCtx.rotate(imageState.rotation * Math.PI / 180);
    bgCtx.scale(imageState.flipH ? -1 : 1, imageState.flipV ? -1 : 1);

    if (imageState.rotation === 90 || imageState.rotation === 270) {
      bgCtx.drawImage(img, -dh / 2, -dw / 2, dh, dw);
    } else {
      bgCtx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }
    bgCtx.restore();
  }

  /* ============================================================
   * 4. 图片上传 / 缩放 / 拖动 / 移除
   * ============================================================ */
  btnUpload.addEventListener('click', function () { imageInput.click(); });

  function loadImageFile(file) {
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
        imageState.rotation = 0;
        imageState.flipH = false;
        imageState.flipV = false;
        imageState.mime = mime;

        imageZoomInput.value = 1;
        imageZoomVal.textContent = '100%';
        imagePanel.hidden = false;
        container.classList.add('has-image');
        if (autoCropCheckbox) autoCropCheckbox.disabled = true;

        drawBgImage();
        applyBackground();
      };
      img.onerror = function () { alert('图片加载失败'); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { alert('文件读取失败'); };
    reader.readAsDataURL(file);
  }

  imageInput.addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    loadImageFile(file);
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    container.addEventListener(evt, function (e) {
      e.preventDefault();
      container.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    container.addEventListener(evt, function (e) {
      e.preventDefault();
      container.classList.remove('drag-over');
    });
  });
  container.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadImageFile(f);
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
    var cover = Math.max(boardW / iw, boardH / ih) / Math.min(boardW / iw, boardH / ih);
    imageState.scale = cover;
    imageState.offsetX = 0; imageState.offsetY = 0;
    imageZoomInput.value = cover; imageZoomVal.textContent = Math.round(cover * 100) + '%';
    drawBgImage();
  });

  btnResetImage.addEventListener('click', function () {
    if (!imageState.img) return;
    imageState.scale = 1; imageState.offsetX = 0; imageState.offsetY = 0;
    imageState.rotation = 0; imageState.flipH = false; imageState.flipV = false;
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
    imageState.rotation = 0; imageState.flipH = false; imageState.flipV = false;
    imagePanel.hidden = true;
    container.classList.remove('has-image');
    if (autoCropCheckbox) autoCropCheckbox.disabled = false;
    bgCtx.clearRect(0, 0, boardW, boardH);
    applyBackground();
  });

  function rotateImage(deg) {
    if (!imageState.img) return;
    imageState.rotation = (imageState.rotation + deg + 360) % 360;
    drawBgImage();
  }
  if (btnRotateCcw) btnRotateCcw.addEventListener('click', function () { rotateImage(-90); });
  if (btnRotateCw) btnRotateCw.addEventListener('click', function () { rotateImage(90); });
  if (btnFlipH) btnFlipH.addEventListener('click', function () {
    if (!imageState.img) return;
    imageState.flipH = !imageState.flipH; drawBgImage();
  });
  if (btnFlipV) btnFlipV.addEventListener('click', function () {
    if (!imageState.img) return;
    imageState.flipV = !imageState.flipV; drawBgImage();
  });

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
    var k = boardW / rect.width;
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
   * 5. 签名引擎 A：原生 Canvas（速度/压感线宽 + 二次贝塞尔平滑）
   * ============================================================ */
  function getPos(e) {
    var rect = sigCanvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (boardW / rect.width),
      y: (e.clientY - rect.top) * (boardH / rect.height)
    };
  }

  function calcWidth(prev, curr, dt, pressure) {
    var base = currentBaseSize;
    if (!usePressure) return base;
    var dx = curr.x - prev.x;
    var dy = curr.y - prev.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = dt > 0 ? dist / dt : 0;
    var speedFactor = Math.max(0.4, Math.min(1.6, 1.6 - speed * 0.6));
    var pressureFactor = 1;
    if (typeof pressure === 'number' && pressure > 0) {
      pressureFactor = 0.5 + pressure * 0.8;
    }
    return Math.max(0.5, base * speedFactor * pressureFactor);
  }

  function applyStrokeStyle(color, opacity, w) {
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = colorWithAlpha(color, opacity);
    sigCtx.fillStyle = colorWithAlpha(color, opacity);
    sigCtx.lineWidth = w;
    if (brushType === 'eraser') {
      sigCtx.globalCompositeOperation = 'destination-out';
    } else if (brushType === 'marker') {
      sigCtx.globalCompositeOperation = 'source-over';
      sigCtx.globalAlpha = Math.min(opacity, 0.4);
    } else {
      sigCtx.globalCompositeOperation = 'source-over';
      sigCtx.globalAlpha = 1;
    }
  }

  function resetComposite() {
    sigCtx.globalCompositeOperation = 'source-over';
    sigCtx.globalAlpha = 1;
  }

  function colorWithAlpha(color, opacity) {
    if (brushType === 'eraser') return 'rgba(0,0,0,1)';
    if (color === 'transparent') return 'rgba(0,0,0,0)';
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      var r = parseInt(color.slice(1, 3), 16);
      var g = parseInt(color.slice(3, 5), 16);
      var b = parseInt(color.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    }
    return color;
  }

  function redrawAll() {
    sigCtx.clearRect(0, 0, boardW, boardH);
    for (var s = 0; s < strokes.length; s++) {
      drawStroke(strokes[s]);
    }
    resetComposite();
    updateButtons();
  }

  function drawStroke(stroke) {
    if (!stroke.points || !stroke.points.length) return;
    applyStrokeStyle(stroke.color, stroke.opacity, stroke.size);
    var pts = stroke.points;

    if (pts.length === 1) {
      var p = pts[0];
      sigCtx.beginPath();
      sigCtx.arc(p.x, p.y, (p.w || stroke.size) / 2, 0, Math.PI * 2);
      sigCtx.fill();
      resetComposite();
      return;
    }
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var mid1x = (p0.x + p1.x) / 2, mid1y = (p0.y + p1.y) / 2;
      var mid2x = (p1.x + p2.x) / 2, mid2y = (p1.y + p2.y) / 2;
      sigCtx.beginPath();
      sigCtx.moveTo(mid1x, mid1y);
      sigCtx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
      sigCtx.lineWidth = ((p1.w || stroke.size) + (p2.w || stroke.size)) / 2;
      sigCtx.stroke();
    }
    var len = pts.length;
    var lp1 = pts[len - 2], lp2 = pts[len - 1];
    sigCtx.beginPath();
    sigCtx.moveTo((lp1.x + lp2.x) / 2, (lp1.y + lp2.y) / 2);
    sigCtx.lineTo(lp2.x, lp2.y);
    sigCtx.lineWidth = (lp2.w || stroke.size);
    sigCtx.stroke();
    resetComposite();
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
    applyStrokeStyle(currentColor, currentOpacity, currentBaseSize);
    sigCtx.beginPath();
    sigCtx.arc(pos.x, pos.y, currentStroke[0].w / 2, 0, Math.PI * 2);
    sigCtx.fill();
    resetComposite();
  }

  function moveDrawing(e) {
    if (!isDrawing) return;
    var pos = getPos(e);
    var now = performance.now();
    var dt = Math.max(1, now - lastTime);
    var pressure = (typeof e.pressure === 'number' && e.pressure > 0) ? e.pressure : 0.5;
    var w = calcWidth(lastPoint, pos, dt, pressure);
    currentStroke.push({ x: pos.x, y: pos.y, w: w });
    var len = currentStroke.length;
    if (len >= 3) {
      var p0 = currentStroke[len - 3], p1 = currentStroke[len - 2], p2 = currentStroke[len - 1];
      var mid1x = (p0.x + p1.x) / 2, mid1y = (p0.y + p1.y) / 2;
      var mid2x = (p1.x + p2.x) / 2, mid2y = (p1.y + p2.y) / 2;
      applyStrokeStyle(currentColor, currentOpacity, currentBaseSize);
      sigCtx.beginPath();
      sigCtx.moveTo(mid1x, mid1y);
      sigCtx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
      sigCtx.lineWidth = ((p1.w) + (p2.w)) / 2;
      sigCtx.stroke();
      resetComposite();
    }
    lastPoint = pos;
    lastTime = now;
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentStroke.length > 0) {
      strokes.push({
        type: brushType === 'eraser' ? 'eraser' : (brushType === 'marker' ? 'marker' : 'pen'),
        color: currentColor,
        size: currentBaseSize,
        opacity: currentOpacity,
        points: currentStroke.slice()
      });
      if (strokes.length > MAX_HISTORY) strokes.shift();
      redoStack = [];
      updateButtons();
    }
    currentStroke = [];
    lastPoint = null;
  }

  /* ============================================================
   * 5b. 签名引擎 B：signature_pad（贝塞尔速度笔锋）
   * ============================================================ */
  function initSignaturePad() {
    if (!hasSigPad) return;
    if (signaturePad) signaturePad.off();
    signaturePad = new window.SignaturePad(sigCanvas, {
      minWidth: Math.max(0.5, currentBaseSize * 0.25),
      maxWidth: Math.max(2.5, currentBaseSize * 1.3),
      throttle: 16,
      minDistance: 3,
      penColor: colorWithAlpha(currentColor, currentOpacity),
      velocityFilterWeight: 0.7
    });
    signaturePad.on();
    signaturePad.addEventListener('endStroke', function () {
      redoStack = [];
      updateButtons();
    });
  }

  function syncSigPadOptions() {
    if (!signaturePad) return;
    try {
      signaturePad.minWidth = Math.max(0.5, currentBaseSize * 0.25);
      signaturePad.maxWidth = Math.max(2.5, currentBaseSize * 1.3);
      signaturePad.penColor = colorWithAlpha(currentColor, currentOpacity);
    } catch (err) {}
  }

  function setEngineMode(mode) {
    engineMode = mode;
    if (mode === 'signaturepad' && hasSigPad) {
      if (!signaturePad) initSignaturePad();
      signaturePad.on();
      syncSigPadOptions();
    } else {
      if (signaturePad) signaturePad.off();
    }
    redrawAll();
  }

  /* ============================================================
   * 指针事件分发
   * ============================================================ */
  sigCanvas.addEventListener('pointerdown', function (e) {
    if (isMovingImage) return;
    e.preventDefault();
    try { sigCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (engineMode === 'signaturepad' && hasSigPad) return;
    startDrawing(e);
  });
  sigCanvas.addEventListener('pointermove', function (e) {
    if (isMovingImage) return;
    if (engineMode === 'signaturepad' && hasSigPad) return;
    if (isDrawing) { e.preventDefault(); moveDrawing(e); }
  });
  sigCanvas.addEventListener('pointerup', function (e) {
    if (isMovingImage) return;
    if (engineMode === 'signaturepad' && hasSigPad) return;
    e.preventDefault();
    stopDrawing();
  });
  sigCanvas.addEventListener('pointercancel', function (e) {
    if (isMovingImage) return;
    if (engineMode === 'signaturepad' && hasSigPad) return;
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
      syncSigPadOptions();
    });
  });

  customColorInput.addEventListener('input', function () {
    currentColor = this.value;
    colorBtns.forEach(function (b) { b.classList.remove('active'); });
    syncSigPadOptions();
  });

  brushSizeInput.addEventListener('input', function () {
    currentBaseSize = parseFloat(this.value);
    brushSizeVal.textContent = currentBaseSize;
    syncSigPadOptions();
  });

  pressureEnabled.addEventListener('change', function () {
    usePressure = this.checked;
  });

  if (brushTypeSelect) brushTypeSelect.addEventListener('change', function () {
    brushType = this.value;
    syncSigPadOptions();
  });
  if (opacityInput) opacityInput.addEventListener('input', function () {
    currentOpacity = parseFloat(this.value);
    if (opacityVal) opacityVal.textContent = Math.round(currentOpacity * 100) + '%';
    syncSigPadOptions();
  });
  if (engineModeSelect) engineModeSelect.addEventListener('change', function () {
    setEngineMode(this.value);
  });
  if (exportQualityInput) {
    var qualityVal = document.getElementById('export-quality-val');
    exportQualityInput.addEventListener('input', function () {
      if (qualityVal) qualityVal.textContent = Math.round(parseFloat(this.value) * 100) + '%';
    });
  }

  /* ============================================================
   * 6b. 画板方向 / 全屏 / 居中
   * ============================================================ */
  if (orientationSelect) orientationSelect.addEventListener('change', function () {
    var v = this.value;
    if (v === 'portrait') setupCanvasSize(800, 1200);
    else if (v === 'square') setupCanvasSize(1000, 1000);
    else setupCanvasSize(1600, 800);
  });

  if (btnFullscreen) btnFullscreen.addEventListener('click', function () {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  });

  if (btnCenterSign) btnCenterSign.addEventListener('click', function () {
    if (engineMode === 'signaturepad' && hasSigPad && signaturePad) {
      var data = signaturePad.toData();
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      data.forEach(function (g) {
        (g.points || []).forEach(function (p) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        });
      });
      if (minX === Infinity) return;
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      var dx = boardW / 2 - cx, dy = boardH / 2 - cy;
      var out = sigCtx.getImageData(0, 0, boardW, boardH);
      sigCtx.clearRect(0, 0, boardW, boardH);
      sigCtx.putImageData(out, dx, dy);
      var moved = data.map(function (g) {
        return Object.assign({}, g, {
          points: g.points.map(function (p) {
            return Object.assign({}, p, { x: p.x + dx, y: p.y + dy });
          })
        });
      });
      signaturePad.clear();
      signaturePad.fromData(moved);
      return;
    }
    if (!strokes.length) return;
    var nminX = Infinity, nminY = Infinity, nmaxX = -Infinity, nmaxY = -Infinity;
    strokes.forEach(function (st) {
      (st.points || []).forEach(function (p) {
        nminX = Math.min(nminX, p.x); nmaxX = Math.max(nmaxX, p.x);
        nminY = Math.min(nminY, p.y); nmaxY = Math.max(nmaxY, p.y);
      });
    });
    if (nminX === Infinity) return;
    var dcx = boardW / 2 - (nminX + nmaxX) / 2;
    var dcy = boardH / 2 - (nminY + nmaxY) / 2;
    strokes.forEach(function (st) {
      (st.points || []).forEach(function (p) { p.x += dcx; p.y += dcy; });
    });
    redrawAll();
  });

  /* ============================================================
   * 6c. 草稿保存 / 恢复（localStorage）
   * ============================================================ */
  if (btnSaveDraft) btnSaveDraft.addEventListener('click', function () {
    try {
      var payload = {
        engine: engineMode,
        strokes: strokes,
        image: imageState.img ? imageState.img.src : null,
        imageState: imageState.img ? {
          scale: imageState.scale, offsetX: imageState.offsetX,
          offsetY: imageState.offsetY, rotation: imageState.rotation,
          flipH: imageState.flipH, flipV: imageState.flipV, mime: imageState.mime
        } : null,
        padData: (engineMode === 'signaturepad' && signaturePad) ? signaturePad.toData() : null
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      alert('草稿已保存到本地 ✅');
    } catch (err) {
      alert('保存失败（可能超出本地存储容量）');
    }
  });

  function applyDraft(d) {
    if (d.image) {
      var img = new Image();
      img.onload = function () {
        imageState.img = img;
        var st = d.imageState || {};
        imageState.scale = st.scale || 1;
        imageState.offsetX = st.offsetX || 0;
        imageState.offsetY = st.offsetY || 0;
        imageState.rotation = st.rotation || 0;
        imageState.flipH = !!st.flipH;
        imageState.flipV = !!st.flipV;
        imageState.mime = st.mime || 'image/png';
        if (imageZoomInput) imageZoomInput.value = imageState.scale;
        if (imageZoomVal) imageZoomVal.textContent = Math.round(imageState.scale * 100) + '%';
        imagePanel.hidden = false;
        container.classList.add('has-image');
        if (autoCropCheckbox) autoCropCheckbox.disabled = true;
        drawBgImage();
        applyBackground();
        restoreStrokes(d);
      };
      img.src = d.image;
    } else {
      imageState.img = null;
      imagePanel.hidden = true;
      container.classList.remove('has-image');
      if (autoCropCheckbox) autoCropCheckbox.disabled = false;
      bgCtx.clearRect(0, 0, boardW, boardH);
      applyBackground();
      restoreStrokes(d);
    }
  }

  function restoreStrokes(d) {
    strokes = (d.strokes || []).slice();
    redoStack = [];
    if (d.engine && engineModeSelect) {
      engineModeSelect.value = d.engine;
      setEngineMode(d.engine);
    }
    if (d.engine === 'signaturepad' && d.padData && signaturePad) {
      try { signaturePad.fromData(d.padData); } catch (err) {}
    } else {
      redrawAll();
    }
  }

  if (btnLoadDraft) btnLoadDraft.addEventListener('click', function () {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { alert('暂无草稿'); return; }
      applyDraft(JSON.parse(raw));
    } catch (err) {
      alert('草稿读取失败');
    }
  });

  /* ============================================================
   * 7. 撤销 / 重做 / 清空
   * ============================================================ */
  function updateButtons() {
    if (btnUndo) btnUndo.disabled = strokes.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
  }

  if (btnUndo) btnUndo.addEventListener('click', function () {
    if (!strokes.length) return;
    redoStack.push({ strokes: strokes.splice(strokes.length - 1, 1)[0] });
    redrawAll();
    if (engineMode === 'signaturepad' && hasSigPad) rebuildPadFromStrokes();
  });

  if (btnRedo) btnRedo.addEventListener('click', function () {
    var item = redoStack.pop();
    if (!item || !item.strokes) { redoStack.push(item); return; }
    strokes.push(item.strokes);
    redrawAll();
    if (engineMode === 'signaturepad' && hasSigPad) rebuildPadFromStrokes();
  });

  // 原生引擎笔画转存为 signature_pad 数据（用于撤销后同步）
  function rebuildPadFromStrokes() {
    if (!signaturePad) return;
    signaturePad.clear();
    var groups = strokes.map(function (st) {
      return {
        penColor: st.color,
        dotSize: st.size,
        minWidth: Math.max(0.5, st.size * 0.25),
        maxWidth: Math.max(2.5, st.size * 1.3),
        velocityFilterWeight: 0.7,
        compositeOperation: 'source-over',
        points: (st.points || []).map(function (p, i) {
          return { x: p.x, y: p.y, pressure: 0.5, time: Date.now() + i };
        })
      };
    });
    try { signaturePad.fromData(groups); } catch (err) {}
  }

  if (btnClear) btnClear.addEventListener('click', function () {
    if (!strokes.length) return;
    if (!confirm('确定清空签名吗？底图会保留。')) return;
    redoStack.push({ strokes: strokes.slice() });
    strokes = [];
    if (signaturePad) signaturePad.clear();
    redrawAll();
  });

  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); btnUndo.click();
    } else if (ctrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); btnRedo.click();
    } else if (ctrl && e.key.toLowerCase() === 's') {
      e.preventDefault(); if (btnSaveDraft) btnSaveDraft.click();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (btnClear && strokes.length) { e.preventDefault(); btnClear.click(); }
    }
  });

  /* ============================================================
   * 8. 导出
   * ============================================================ */
  function getExportMime() {
    var v = exportFormatSelect ? exportFormatSelect.value : 'auto';
    if (v === 'png') return 'image/png';
    if (v === 'jpeg') return 'image/jpeg';
    if (v === 'webp') return 'image/webp';
    return imageState.mime || 'image/png';
  }

  function cropBounds() {
    var w = sigCanvas.width, h = sigCanvas.height;
    var data = sigCtx.getImageData(0, 0, w, h).data;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    var pad = 8;
    return {
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      w: Math.min(w, maxX + pad) - Math.max(0, minX - pad),
      h: Math.min(h, maxY + pad) - Math.max(0, minY - pad)
    };
  }

  function exportCanvas() {
    var doCrop = autoCropCheckbox && autoCropCheckbox.checked && !imageState.img;
    var b = doCrop ? cropBounds() : null;
    if (b && (b.w <= 0 || b.h <= 0)) b = null;
    var scale = exportScaleSelect ? parseFloat(exportScaleSelect.value) : 1;
    if (!scale || scale <= 0) scale = 1;

    var src = sigCanvas;
    if (b) {
      var tmp = document.createElement('canvas');
      tmp.width = b.w; tmp.height = b.h;
      tmp.getContext('2d').drawImage(sigCanvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      src = tmp;
    }
    if (scale !== 1) {
      var out = document.createElement('canvas');
      out.width = Math.round(src.width * scale);
      out.height = Math.round(src.height * scale);
      var octx = out.getContext('2d');
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(src, 0, 0, out.width, out.height);
      src = out;
    }

    var mime = getExportMime();
    if (mime === 'image/jpeg') {
      var flat = document.createElement('canvas');
      flat.width = src.width; flat.height = src.height;
      var fctx = flat.getContext('2d');
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, flat.width, flat.height);
      fctx.drawImage(src, 0, 0);
      src = flat;
    }
    return { canvas: src, mime: mime };
  }

  function saveBlob(blob, filename) {
    if (hasFileSaver) { window.saveAs(blob, filename); return; }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 40000);
  }

  if (btnDownload) btnDownload.addEventListener('click', function () {
    if (!strokes.length && !(signaturePad && !signaturePad.isEmpty())) {
      alert('请先签名'); return;
    }
    var quality = exportQualityInput ? parseFloat(exportQualityInput.value) : 0.95;
    var r = exportCanvas();
    var ext = r.mime === 'image/jpeg' ? 'jpg' : (r.mime === 'image/webp' ? 'webp' : 'png');
    r.canvas.toBlob(function (blob) {
      if (!blob) { alert('导出失败'); return; }
      saveBlob(blob, 'signature-' + Date.now() + '.' + ext);
    }, r.mime, quality);
  });

  if (btnExportSvg) btnExportSvg.addEventListener('click', function () {
    if (engineMode === 'signaturepad' && hasSigPad && signaturePad) {
      if (signaturePad.isEmpty()) { alert('请先签名'); return; }
      var svg = signaturePad.toSVG({ includeBackgroundColor: false });
      saveBlob(new Blob([svg], { type: 'image/svg+xml' }), 'signature-' + Date.now() + '.svg');
      return;
    }
    if (!strokes.length) { alert('请先签名'); return; }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(function (st) {
      (st.points || []).forEach(function (p) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
    });
    if (minX === Infinity) { alert('请先签名'); return; }
    var pad = 8;
    var vbX = minX - pad, vbY = minY - pad;
    var vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
    var parts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH +
        '" width="' + vbW + '" height="' + vbH + '">'
    ];
    strokes.forEach(function (st) {
      var pts = st.points || [];
      if (!pts.length) return;
      var color = st.color === 'transparent' ? 'none' : st.color;
      var op = st.opacity == null ? 1 : st.opacity;
      if (pts.length === 1) {
        parts.push('<circle cx="' + pts[0].x + '" cy="' + pts[0].y + '" r="' + (st.size / 2) +
          '" fill="' + color + '" fill-opacity="' + op + '"/>');
        return;
      }
      var d = 'M ' + pts[0].x + ' ' + pts[0].y;
      for (var i = 1; i < pts.length - 1; i++) {
        var mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
        d += ' Q ' + pts[i].x + ' ' + pts[i].y + ' ' + mid.x + ' ' + mid.y;
      }
      var last = pts[pts.length - 1];
      d += ' L ' + last.x + ' ' + last.y;
      parts.push('<path d="' + d + '" fill="none" stroke="' + color + '" stroke-opacity="' + op +
        '" stroke-width="' + st.size + '" stroke-linecap="round" stroke-linejoin="round"/>');
    });
    parts.push('</svg>');
    saveBlob(new Blob([parts.join('')], { type: 'image/svg+xml' }), 'signature-' + Date.now() + '.svg');
  });

  /* ============================================================
   * 9. 启动
   * ============================================================ */
  setupCanvasSize(CANVAS_W, CANVAS_H);
  applyBackground();
  updateButtons();
  if (!hasSigPad && engineModeSelect) {
    engineModeSelect.disabled = true;
    engineModeSelect.title = '未加载 signature_pad 库，仅可用原生引擎';
  }
})();
