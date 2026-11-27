(function () {
  'use strict';

  // ================= 依赖 =================
  var HAS_KONVA = typeof Konva !== 'undefined';
  var HAS_ROUGH = typeof rough !== 'undefined';
  if (!HAS_KONVA) console.warn('Konva 未加载，贴纸/文字功能不可用');
  if (!HAS_ROUGH) console.warn('Rough 未加载，手绘风功能不可用');

  // ================= 元素 =================
  var wrapper = document.getElementById('canvas-wrapper');
  var canvasBg = document.getElementById('canvas-bg');
  var ctxBg = canvasBg.getContext('2d');
  var canvasBase = document.getElementById('canvas-base');
  var ctxBase = canvasBase.getContext('2d', { willReadFrequently: true });
  var canvasTop = document.getElementById('canvas-top');
  var ctxTop = canvasTop.getContext('2d');

  var dpr = window.devicePixelRatio || 1;
  var bgImageObj = null;

  // Rough 实例
  var roughBase = HAS_ROUGH ? rough.canvas(canvasBase) : null;
  var roughTop = HAS_ROUGH ? rough.canvas(canvasTop) : null;

  // Konva 实例
  var konvaStage = null, konvaLayer = null, konvaTransformerLayer = null, konvaTransformer = null;

  // ================= 状态 =================
  var isDrawing = false;
  var currentTool = 'pen';
  var currentColor = '#3d3226';
  var currentSize = 5;
  var currentOpacity = 1.0;
  var isFillShape = false;
  var roughness = 1.8;
  var roughSeed = 42;

  var startX = 0, startY = 0, lastX = 0, lastY = 0, lastTime = 0, hue = 0;

  var historyStack = [], historyIndex = -1, MAX_HISTORY = 30, saveTimeout = null;

  // ================= 尺寸 =================
  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    var tempImage = canvasBase.width > 0 ? canvasBase.toDataURL() : null;

    [canvasBg, canvasBase, canvasTop].forEach(function (cvs) {
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
    });
    ctxBg.scale(dpr, dpr); ctxBase.scale(dpr, dpr); ctxTop.scale(dpr, dpr);

    if (bgImageObj) drawBgImage(bgImageObj);
    else { ctxBg.fillStyle = '#ffffff'; ctxBg.fillRect(0, 0, rect.width, rect.height); }

    if (konvaStage) { konvaStage.width(rect.width); konvaStage.height(rect.height); }

    if (tempImage) {
      var img = new Image();
      img.onload = function () {
        ctxBase.drawImage(img, 0, 0, rect.width, rect.height);
        pushHistory();
      };
      img.src = tempImage;
    } else {
      pushHistory();
    }
  }
  window.addEventListener('resize', resizeCanvas);

  setTimeout(function () {
    resizeCanvas();
    initKonva();
    loadAutoSave();
  }, 50);

  // ================= Konva 初始化 =================
  function initKonva() {
    if (!HAS_KONVA) return;
    var container = document.getElementById('konva-container');
    if (!container) return;
    var rect = wrapper.getBoundingClientRect();

    konvaStage = new Konva.Stage({
      container: 'konva-container',
      width: rect.width,
      height: rect.height
    });
    konvaLayer = new Konva.Layer();
    konvaTransformerLayer = new Konva.Layer();
    konvaTransformer = new Konva.Transformer({
      rotateEnabled: true,
      borderStroke: '#8a5a2b',
      anchorStroke: '#8a5a2b',
      anchorFill: '#fff',
      anchorSize: 9
    });
    konvaTransformerLayer.add(konvaTransformer);
    konvaStage.add(konvaLayer);
    konvaStage.add(konvaTransformerLayer);

    konvaStage.on('click tap', function (e) {
      if (e.target === konvaStage) {
        konvaTransformer.nodes([]);
        konvaTransformerLayer.draw();
        if (currentTool === 'text') {
          var pos = konvaStage.getPointerPosition();
          var text = prompt('输入文字:', '');
          if (text && text.trim()) addKonvaText(text.trim(), pos.x, pos.y);
        } else if (currentTool === 'sticker') {
          document.getElementById('sticker-input').click();
        }
      } else {
        konvaTransformer.nodes([e.target]);
        konvaTransformerLayer.draw();
      }
    });
  }

  function addKonvaText(text, x, y) {
    var node = new Konva.Text({
      x: x, y: y, text: text,
      fontSize: Math.max(16, currentSize * 4),
      fontFamily: 'Arial, sans-serif',
      fill: currentColor,
      draggable: true
    });
    konvaLayer.add(node);
    konvaLayer.draw();
    konvaTransformer.nodes([node]);
    konvaTransformerLayer.draw();
  }

  function addSticker(dataUrl) {
    var img = new Image();
    img.onload = function () {
      var rect = wrapper.getBoundingClientRect();
      var maxDim = Math.min(rect.width, rect.height) * 0.4;
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var w = img.width * scale, h = img.height * scale;
      var node = new Konva.Image({
        image: img,
        x: (rect.width - w) / 2,
        y: (rect.height - h) / 2,
        width: w, height: h,
        draggable: true
      });
      konvaLayer.add(node);
      konvaLayer.draw();
      konvaTransformer.nodes([node]);
      konvaTransformerLayer.draw();
    };
    img.src = dataUrl;
  }

  function mergeKonvaIntoBase() {
    if (!HAS_KONVA || !konvaLayer || konvaLayer.getChildren().length === 0) {
      alert('没有可合并的贴纸或文字');
      return;
    }
    konvaTransformer.nodes([]);
    konvaTransformerLayer.draw();
    var dataUrl = konvaStage.toDataURL({ pixelRatio: dpr });
    var img = new Image();
    img.onload = function () {
      ctxBase.globalCompositeOperation = 'source-over';
      ctxBase.globalAlpha = 1;
      ctxBase.drawImage(img, 0, 0, wrapper.clientWidth, wrapper.clientHeight);
      konvaLayer.destroyChildren();
      konvaLayer.draw();
      pushHistory();
      autoSave();
    };
    img.src = dataUrl;
  }

  function clearKonva() {
    if (!HAS_KONVA) return;
    if (!konvaLayer || konvaLayer.getChildren().length === 0) return;
    if (!confirm('清除所有未合并的贴纸/文字？')) return;
    konvaTransformer.nodes([]);
    konvaTransformerLayer.draw();
    konvaLayer.destroyChildren();
    konvaLayer.draw();
  }

  function setKonvaActive(active) {
    var c = document.getElementById('konva-container');
    if (!c) return;
    c.style.pointerEvents = active ? 'auto' : 'none';
  }

  // ================= UI 绑定 =================
  var toolBtns = document.querySelectorAll('.tool-btn');
  var colorBtns = document.querySelectorAll('.color-btn:not(.custom-color)');
  var customColor = document.getElementById('custom-color');
  var brushSize = document.getElementById('brush-size');
  var sizeVal = document.getElementById('size-val');
  var brushOpacity = document.getElementById('brush-opacity');
  var opacityVal = document.getElementById('opacity-val');
  var shapeFill = document.getElementById('shape-fill');
  var cursorEl = document.getElementById('custom-cursor');
  var exportFormat = document.getElementById('export-format');
  var roughnessInput = document.getElementById('roughness');
  var roughnessVal = document.getElementById('roughness-val');
  var stickerInput = document.getElementById('sticker-input');

  toolBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toolBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      if (currentTool === 'text' || currentTool === 'sticker') {
        setKonvaActive(true);
        cursorEl.style.display = 'none';
      } else {
        setKonvaActive(false);
      }
    });
  });

  colorBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      colorBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });

  customColor.addEventListener('input', function () {
    colorBtns.forEach(function (b) { b.classList.remove('active'); });
    currentColor = this.value;
  });

  brushSize.addEventListener('input', function () {
    currentSize = parseInt(this.value, 10);
    sizeVal.textContent = currentSize + 'px';
  });

  brushOpacity.addEventListener('input', function () {
    currentOpacity = parseInt(this.value, 10) / 100;
    opacityVal.textContent = this.value + '%';
  });

  shapeFill.addEventListener('change', function () { isFillShape = this.checked; });

  if (roughnessInput) {
    roughnessInput.addEventListener('input', function () {
      roughness = parseFloat(this.value);
      roughnessVal.textContent = this.value;
    });
  }

  stickerInput.addEventListener('change', function (e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    if (!file.type.startsWith('image/')) return alert('请选择图片文件');
    var reader = new FileReader();
    reader.onload = function (ev) { addSticker(ev.target.result); };
    reader.readAsDataURL(file);
    this.value = '';
  });

  document.getElementById('btn-merge-stickers').addEventListener('click', mergeKonvaIntoBase);
  document.getElementById('btn-clear-stickers').addEventListener('click', clearKonva);

  // ================= 光标 =================
  function updateCursor(e) {
    if (currentTool === 'text' || currentTool === 'sticker') return;
    var size = currentSize;
    cursorEl.style.display = 'block';
    cursorEl.style.width = size + 'px';
    cursorEl.style.height = size + 'px';
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top = e.clientY + 'px';
  }
  canvasTop.addEventListener('mousemove', updateCursor);
  canvasTop.addEventListener('mouseenter', function () { if (currentTool !== 'text' && currentTool !== 'sticker') cursorEl.style.display = 'block'; });
  canvasTop.addEventListener('mouseleave', function () { cursorEl.style.display = 'none'; });
  canvasTop.addEventListener('mousedown', function () { cursorEl.style.transform = 'translate(-50%, -50%) scale(0.9)'; });
  window.addEventListener('mouseup', function () { cursorEl.style.transform = 'translate(-50%, -50%) scale(1)'; });

  // ================= 绘制核心 =================
  function isShapeTool(t) { return t === 'line' || t === 'rect' || t === 'circle'; }
  function isRoughTool(t) { return typeof t === 'string' && t.indexOf('rough-') === 0; }

  function getPos(e) {
    var rect = canvasTop.getBoundingClientRect();
    var x, y;
    if (e.touches && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    return { x: x, y: y };
  }

  function startDraw(e) {
    if (e.button === 2) return;
    if (currentTool === 'text' || currentTool === 'sticker') return;
    isDrawing = true;
    var pos = getPos(e);
    startX = pos.x; startY = pos.y; lastX = pos.x; lastY = pos.y;
    lastTime = Date.now();
    hue = Math.random() * 360;
    roughSeed = Math.floor(Math.random() * 10000);

    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.globalAlpha = currentOpacity;
    ctxBase.shadowBlur = 0;
    ctxBase.lineCap = 'round';
    ctxBase.lineJoin = 'round';
    ctxBase.strokeStyle = currentColor;
    ctxBase.fillStyle = currentColor;
    ctxBase.lineWidth = currentSize;
    ctxBase.beginPath();
    ctxBase.moveTo(lastX, lastY);

    if (isShapeTool(currentTool) || isRoughTool(currentTool)) {
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.globalCompositeOperation = 'source-over';
      ctxTop.globalAlpha = currentOpacity;
      ctxTop.strokeStyle = currentColor;
      ctxTop.fillStyle = currentColor;
      ctxTop.lineWidth = currentSize;
      ctxTop.lineCap = 'round';
      ctxTop.lineJoin = 'round';
    }
  }

  function buildRoughOpts() {
    var opts = {
      stroke: currentColor,
      strokeWidth: currentSize,
      roughness: roughness,
      bowing: roughness,
      seed: roughSeed
    };
    if (isFillShape && currentTool !== 'rough-line') {
      opts.fill = currentColor;
      opts.fillStyle = 'hachure';
      opts.fillWeight = Math.max(0.5, currentSize / 2);
      opts.hachureGap = Math.max(3, currentSize * 1.5);
    }
    return opts;
  }

  function renderRough(rc, x1, y1, x2, y2) {
    var w = x2 - x1, h = y2 - y1;
    var opts = buildRoughOpts();
    if (currentTool === 'rough-rect') {
      rc.rectangle(x1, y1, w, h, opts);
    } else if (currentTool === 'rough-circle') {
      var r = Math.sqrt(w * w + h * h);
      rc.circle(x1, y1, r * 2, opts);
    } else if (currentTool === 'rough-ellipse') {
      rc.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(w), Math.abs(h), opts);
    } else if (currentTool === 'rough-line') {
      rc.line(x1, y1, x2, y2, opts);
    }
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var pos = getPos(e);
    var x = pos.x, y = pos.y;
    var now = Date.now();
    var dt = now - lastTime;
    if (dt === 0) dt = 1;

    if (isRoughTool(currentTool)) {
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
      if (!HAS_ROUGH) return;
      renderRough(roughTop, startX, startY, x, y);
      lastX = x; lastY = y;
      return;
    }

    if (isShapeTool(currentTool)) {
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.beginPath();
      if (currentTool === 'line') {
        ctxTop.moveTo(startX, startY); ctxTop.lineTo(x, y);
      } else if (currentTool === 'rect') {
        ctxTop.rect(startX, startY, x - startX, y - startY);
      } else if (currentTool === 'circle') {
        var radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctxTop.arc(startX, startY, radius, 0, 2 * Math.PI);
      }
      if (isFillShape && currentTool !== 'line') ctxTop.fill();
      ctxTop.stroke();
      return;
    }

    var dist = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));

    if (currentTool === 'pen') {
      var midX = (lastX + x) / 2, midY = (lastY + y) / 2;
      ctxBase.quadraticCurveTo(lastX, lastY, midX, midY);
      ctxBase.stroke();
      ctxBase.beginPath();
      ctxBase.moveTo(midX, midY);
    } else if (currentTool === 'marker') {
      ctxBase.lineTo(x, y); ctxBase.stroke();
    } else if (currentTool === 'highlighter') {
      ctxBase.globalCompositeOperation = 'multiply';
      ctxBase.lineWidth = currentSize * 2;
      ctxBase.strokeStyle = currentColor;
      ctxBase.globalAlpha = currentOpacity * 0.3;
      ctxBase.lineTo(x, y); ctxBase.stroke();
    } else if (currentTool === 'eraser') {
      ctxBase.globalCompositeOperation = 'destination-out';
      ctxBase.lineWidth = currentSize * 2;
      ctxBase.strokeStyle = 'rgba(0,0,0,1)';
      ctxBase.lineTo(x, y); ctxBase.stroke();
    } else if (currentTool === 'pencil') {
      ctxBase.globalAlpha = currentOpacity * 0.6;
      ctxBase.lineWidth = currentSize * 0.8;
      for (var i = 0; i < 3; i++) {
        var jx = x + (Math.random() - 0.5) * 2;
        var jy = y + (Math.random() - 0.5) * 2;
        ctxBase.lineTo(jx, jy); ctxBase.stroke();
      }
      ctxBase.globalAlpha = currentOpacity;
    } else if (currentTool === 'ink') {
      var speed = dist / dt;
      var targetWidth = Math.max(1, currentSize * 2 - speed * 1.5);
      ctxBase.lineWidth = ctxBase.lineWidth * 0.7 + targetWidth * 0.3;
      ctxBase.lineTo(x, y); ctxBase.stroke();
    } else if (currentTool === 'spray') {
      var radius = currentSize * 2;
      ctxBase.fillStyle = currentColor;
      for (var i2 = 0; i2 < 15; i2++) {
        var angle = Math.random() * Math.PI * 2;
        var r = Math.random() * radius;
        var sx = x + Math.cos(angle) * r;
        var sy = y + Math.sin(angle) * r;
        ctxBase.fillRect(sx, sy, 1.5, 1.5);
      }
    } else if (currentTool === 'rainbow') {
      hue = (hue + 2) % 360;
      ctxBase.strokeStyle = 'hsl(' + hue + ', 100%, 50%)';
      ctxBase.lineTo(x, y); ctxBase.stroke();
    } else if (currentTool === 'neon') {
      ctxBase.shadowBlur = 15;
      ctxBase.shadowColor = currentColor;
      ctxBase.lineTo(x, y); ctxBase.stroke();
    } else if (currentTool === 'bubbles') {
      var rad = Math.random() * currentSize + 2;
      ctxBase.beginPath();
      ctxBase.arc(x, y, rad, 0, Math.PI * 2);
      ctxBase.stroke();
    } else if (currentTool === 'crayon') {
      ctxBase.globalAlpha = currentOpacity * 0.4;
      ctxBase.lineWidth = currentSize * 0.8;
      for (var i3 = 0; i3 < 5; i3++) {
        var jx2 = x + (Math.random() - 0.5) * 4;
        var jy2 = y + (Math.random() - 0.5) * 4;
        ctxBase.lineTo(jx2, jy2); ctxBase.stroke();
      }
      ctxBase.globalAlpha = currentOpacity;
    }

    lastX = x; lastY = y; lastTime = now;
  }

  function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;

    if (isRoughTool(currentTool)) {
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
      if (HAS_ROUGH) {
        ctxBase.globalCompositeOperation = 'source-over';
        ctxBase.globalAlpha = currentOpacity;
        renderRough(roughBase, startX, startY, lastX, lastY);
      }
      ctxBase.globalAlpha = 1;
      ctxBase.globalCompositeOperation = 'source-over';
      pushHistory();
      autoSave();
      return;
    }

    if (isShapeTool(currentTool)) {
      ctxBase.globalCompositeOperation = 'source-over';
      ctxBase.globalAlpha = 1;
      ctxBase.drawImage(canvasTop, 0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
    } else if (currentTool === 'pen') {
      ctxBase.lineTo(lastX, lastY);
      ctxBase.stroke();
      ctxBase.closePath();
    } else {
      ctxBase.closePath();
    }

    ctxBase.globalAlpha = 1;
    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.shadowBlur = 0;

    pushHistory();
    autoSave();
  }

  canvasTop.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', endDraw);
  canvasTop.addEventListener('touchstart', startDraw, { passive: false });
  canvasTop.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', endDraw);
  canvasTop.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ================= 历史/清空/导出 =================
  function pushHistory() {
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    var imageData = ctxBase.getImageData(0, 0, canvasBase.width, canvasBase.height);
    historyStack.push(imageData);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    historyIndex = historyStack.length - 1;
  }

  document.getElementById('btn-undo').addEventListener('click', function () {
    if (historyIndex > 0) {
      historyIndex--;
      ctxBase.putImageData(historyStack[historyIndex], 0, 0);
      autoSave();
    } else if (historyIndex === 0) {
      historyIndex = -1;
      clearCanvas(false);
      autoSave();
    }
  });

  document.getElementById('btn-redo').addEventListener('click', function () {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      ctxBase.putImageData(historyStack[historyIndex], 0, 0);
      autoSave();
    }
  });

  function clearCanvas(push) {
    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.globalAlpha = 1;
    ctxBase.clearRect(0, 0, canvasBase.width, canvasBase.height);
    ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
    if (push) pushHistory();
  }

  document.getElementById('btn-clear').addEventListener('click', function () {
    if (confirm('确定要清空当前所有笔迹吗？(底图不受影响)')) {
      clearCanvas(true);
      autoSave();
    }
  });

  document.getElementById('btn-save').addEventListener('click', function () {
    var format = exportFormat.value;
    var quality = 0.95;
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvasBg.width;
    tmpCanvas.height = canvasBg.height;
    var tCtx = tmpCanvas.getContext('2d');

    if (format === 'image/jpeg' && !bgImageObj) {
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    }

    tCtx.drawImage(canvasBg, 0, 0);
    tCtx.drawImage(canvasBase, 0, 0);
    tCtx.drawImage(canvasTop, 0, 0);

    if (HAS_KONVA && konvaLayer && konvaLayer.getChildren().length > 0) {
      konvaTransformer.nodes([]);
      konvaTransformerLayer.draw();
      var konvaData = konvaStage.toDataURL({ pixelRatio: dpr });
      var kImg = new Image();
      kImg.onload = function () {
        tCtx.drawImage(kImg, 0, 0, tmpCanvas.width, tmpCanvas.height);
        triggerSave(tmpCanvas, format, quality);
      };
      kImg.src = konvaData;
    } else {
      triggerSave(tmpCanvas, format, quality);
    }
  });

  function triggerSave(canvas, format, quality) {
    var ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
    var link = document.createElement('a');
    link.download = 'drawing_' + Date.now() + '.' + ext;
    link.href = canvas.toDataURL(format, quality);
    link.click();
  }

  // ================= 快捷键 =================
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && konvaTransformer && konvaTransformer.nodes().length > 0) {
      e.preventDefault();
      konvaTransformer.nodes().forEach(function (n) { n.destroy(); });
      konvaTransformer.nodes([]);
      konvaLayer.draw();
      konvaTransformerLayer.draw();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) document.getElementById('btn-redo').click();
        else document.getElementById('btn-undo').click();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        document.getElementById('btn-redo').click();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        document.getElementById('btn-save').click();
      }
    } else {
      if (e.key === '[') { brushSize.value = Math.max(1, currentSize - 2); brushSize.dispatchEvent(new Event('input')); }
      else if (e.key === ']') { brushSize.value = Math.min(80, currentSize + 2); brushSize.dispatchEvent(new Event('input')); }
    }
  });

  // ================= 底图 & 自动保存 =================
  var btnUploadBg = document.getElementById('btn-upload-bg');
  var btnRemoveBg = document.getElementById('btn-remove-bg');

  btnUploadBg.addEventListener('change', function (e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    if (!file.type.startsWith('image/')) return alert('请选择图片文件');
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        bgImageObj = img;
        drawBgImage(img);
        try { localStorage.setItem('drawboard_bg', ev.target.result); }
        catch (err) { console.warn('底图太大，无法本地保存'); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  btnRemoveBg.addEventListener('click', function () {
    bgImageObj = null;
    ctxBg.clearRect(0, 0, canvasBg.width, canvasBg.height);
    var rect = wrapper.getBoundingClientRect();
    ctxBg.fillStyle = '#ffffff';
    ctxBg.fillRect(0, 0, rect.width, rect.height);
    localStorage.removeItem('drawboard_bg');
  });

  function drawBgImage(img) {
    var rect = wrapper.getBoundingClientRect();
    ctxBg.clearRect(0, 0, canvasBg.width, canvasBg.height);
    var imgRatio = img.width / img.height;
    var boxRatio = rect.width / rect.height;
    var drawW, drawH, offsetX, offsetY;
    if (imgRatio > boxRatio) {
      drawW = rect.width;
      drawH = drawW / imgRatio;
      offsetX = 0;
      offsetY = (rect.height - drawH) / 2;
    } else {
      drawH = rect.height;
      drawW = drawH * imgRatio;
      offsetY = 0;
      offsetX = (rect.width - drawW) / 2;
    }
    ctxBg.drawImage(img, offsetX, offsetY, drawW, drawH);
  }

  function autoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function () {
      try {
        var dataUrl = canvasBase.toDataURL('image/png');
        localStorage.setItem('drawboard_autosave', dataUrl);
      } catch (e) { console.warn('自动保存失败 (空间可能已满)'); }
    }, 1000);
  }

  function loadAutoSave() {
    var bgBase64 = localStorage.getItem('drawboard_bg');
    if (bgBase64) {
      var bgImg = new Image();
      bgImg.onload = function () { bgImageObj = bgImg; drawBgImage(bgImg); };
      bgImg.src = bgBase64;
    }
    var base64 = localStorage.getItem('drawboard_autosave');
    if (base64) {
      var img = new Image();
      img.onload = function () {
        var rect = wrapper.getBoundingClientRect();
        ctxBase.drawImage(img, 0, 0, rect.width, rect.height);
        pushHistory();
      };
      img.src = base64;
    }
  }
})();