(function () {
  'use strict';

  var wrapper = document.getElementById('canvas-wrapper');
  var canvasBg = document.getElementById('canvas-bg');
  var ctxBg = canvasBg.getContext('2d');
  var canvasBase = document.getElementById('canvas-base');
  var ctxBase = canvasBase.getContext('2d', { willReadFrequently: true });
  var canvasTop = document.getElementById('canvas-top');
  var ctxTop = canvasTop.getContext('2d');

  var dpr = window.devicePixelRatio || 1;
  var bgImageObj = null; // 存储底图对象

  // ================= 1. 画板尺寸与初始化 =================
  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    var tempImage = canvasBase.width > 0 ? canvasBase.toDataURL() : null;

    // 设置物理像素
    [canvasBg, canvasBase, canvasTop].forEach(function(cvs) {
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
    });

    // 重置缩放上下文
    ctxBg.scale(dpr, dpr);
    ctxBase.scale(dpr, dpr);
    ctxTop.scale(dpr, dpr);

    // 背景层绘制
    if (bgImageObj) {
      drawBgImage(bgImageObj);
    } else {
      ctxBg.fillStyle = '#ffffff';
      ctxBg.fillRect(0, 0, rect.width, rect.height);
    }

    // 恢复笔迹层数据
    if (tempImage) {
      var img = new Image();
      img.onload = function () { ctxBase.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = tempImage;
    }

    pushHistory();
  }

  window.addEventListener('resize', resizeCanvas);
  
  // 延迟初始化，等待 DOM 渲染完成
  setTimeout(function() {
    resizeCanvas();
    loadAutoSave();
  }, 50);

  // ================= 2. 状态变量 =================
  var isDrawing = false;
  var currentTool = 'pen'; 
  var currentColor = '#3d3226';
  var currentSize = 5;
  var currentOpacity = 1.0;
  var isFillShape = false;

  var startX = 0, startY = 0;
  var lastX = 0, lastY = 0;
  var lastTime = 0; 
  var hue = 0; // 彩虹笔色相

  var historyStack = [];
  var historyIndex = -1;
  var MAX_HISTORY = 30;
  var saveTimeout = null;

  // ================= 3. UI 元素绑定 =================
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

  // 笔刷切换
  toolBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toolBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  // 颜色切换
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

  // 粗细与不透明度
  brushSize.addEventListener('input', function () {
    currentSize = parseInt(this.value, 10);
    sizeVal.textContent = currentSize + 'px';
  });

  brushOpacity.addEventListener('input', function () {
    currentOpacity = parseInt(this.value, 10) / 100;
    opacityVal.textContent = this.value + '%';
  });

  // 形状填充
  shapeFill.addEventListener('change', function() {
    isFillShape = this.checked;
  });

  // ================= 4. 光标跟随逻辑 =================
  function updateCursor(e) {
    var size = currentSize;
    cursorEl.style.display = 'block';
    cursorEl.style.width = size + 'px';
    cursorEl.style.height = size + 'px';
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top = e.clientY + 'px';
  }

  canvasTop.addEventListener('mousemove', updateCursor);
  canvasTop.addEventListener('mouseenter', function() { cursorEl.style.display = 'block'; });
  canvasTop.addEventListener('mouseleave', function() { cursorEl.style.display = 'none'; });
  canvasTop.addEventListener('mousedown', function() { cursorEl.style.transform = 'translate(-50%, -50%) scale(0.9)'; });
  window.addEventListener('mouseup', function() { cursorEl.style.transform = 'translate(-50%, -50%) scale(1)'; });

  // ================= 5. 核心绘制逻辑 =================
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
    isDrawing = true;
    var pos = getPos(e);
    startX = pos.x; startY = pos.y; lastX = pos.x; lastY = pos.y;
    lastTime = Date.now(); 
    hue = Math.random() * 360;

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

    if (['line', 'rect', 'circle'].includes(currentTool)) {
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.globalCompositeOperation = 'source-over';
      ctxTop.globalAlpha = currentOpacity;
      ctxTop.strokeStyle = currentColor;
      ctxTop.fillStyle = currentColor;
      ctxTop.lineWidth = currentSize;
      ctxTop.lineCap = 'round';
      ctxTop.lineJoin = 'round';
      ctxTop.beginPath();
    }
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var pos = getPos(e);
    var x = pos.x, y = pos.y;
    var now = Date.now();
    var dt = now - lastTime;
    if(dt === 0) dt = 1;

    // 形状类工具
    if (['line', 'rect', 'circle'].includes(currentTool)) {
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

    // 连续笔迹类工具
    var dist = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
    
    if (currentTool === 'pen') {
      // 贝塞尔平滑
      var midX = (lastX + x) / 2;
      var midY = (lastY + y) / 2;
      ctxBase.quadraticCurveTo(lastX, lastY, midX, midY);
      ctxBase.stroke();
      ctxBase.beginPath();
      ctxBase.moveTo(midX, midY);
    } 
    else if (currentTool === 'marker') {
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    } 
    else if (currentTool === 'highlighter') {
      ctxBase.globalCompositeOperation = 'multiply';
      ctxBase.lineWidth = currentSize * 2;
      ctxBase.strokeStyle = currentColor;
      ctxBase.globalAlpha = currentOpacity * 0.3; // 荧光笔更透
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    }
    else if (currentTool === 'eraser') {
      ctxBase.globalCompositeOperation = 'destination-out';
      ctxBase.lineWidth = currentSize * 2;
      ctxBase.strokeStyle = 'rgba(0,0,0,1)';
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    }
    else if (currentTool === 'pencil') {
      ctxBase.globalAlpha = currentOpacity * 0.6;
      ctxBase.lineWidth = currentSize * 0.8;
      for(var i=0; i<3; i++) {
        var jx = x + (Math.random() - 0.5) * 2;
        var jy = y + (Math.random() - 0.5) * 2;
        ctxBase.lineTo(jx, jy);
        ctxBase.stroke();
      }
      ctxBase.globalAlpha = currentOpacity;
    }
    else if (currentTool === 'ink') {
      var speed = dist / dt;
      var targetWidth = Math.max(1, currentSize * 2 - speed * 1.5);
      ctxBase.lineWidth = ctxBase.lineWidth * 0.7 + targetWidth * 0.3;
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    }
    else if (currentTool === 'spray') {
      var radius = currentSize * 2;
      ctxBase.fillStyle = currentColor;
      for (var i = 0; i < 15; i++) {
        var angle = Math.random() * Math.PI * 2;
        var r = Math.random() * radius;
        var sx = x + Math.cos(angle) * r;
        var sy = y + Math.sin(angle) * r;
        ctxBase.fillRect(sx, sy, 1.5, 1.5);
      }
    }
    else if (currentTool === 'rainbow') {
      hue = (hue + 2) % 360;
      ctxBase.strokeStyle = 'hsl(' + hue + ', 100%, 50%)';
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    }
    else if (currentTool === 'neon') {
      ctxBase.shadowBlur = 15;
      ctxBase.shadowColor = currentColor;
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    }
    else if (currentTool === 'bubbles') {
      var rad = Math.random() * currentSize + 2;
      ctxBase.beginPath();
      ctxBase.arc(x, y, rad, 0, Math.PI * 2);
      ctxBase.stroke();
    }
    else if (currentTool === 'crayon') {
      ctxBase.globalAlpha = currentOpacity * 0.4;
      ctxBase.lineWidth = currentSize * 0.8;
      for(var i=0; i<5; i++) {
        var jx = x + (Math.random() - 0.5) * 4;
        var jy = y + (Math.random() - 0.5) * 4;
        ctxBase.lineTo(jx, jy);
        ctxBase.stroke();
      }
      ctxBase.globalAlpha = currentOpacity;
    }

    lastX = x; lastY = y; lastTime = now;
  }

  function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (['line', 'rect', 'circle'].includes(currentTool)) {
      ctxBase.globalCompositeOperation = 'source-over';
      ctxBase.globalAlpha = 1;
      ctxBase.drawImage(canvasTop, 0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
    } else if (currentTool === 'pen') {
      // 收尾补充最后一笔
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

  // 事件监听
  canvasTop.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', draw); 
  window.addEventListener('mouseup', endDraw);

  canvasTop.addEventListener('touchstart', startDraw, { passive: false });
  canvasTop.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', endDraw);

  canvasTop.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // ================= 6. 撤销/重做/清空/保存 =================
  function pushHistory() {
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    var imageData = ctxBase.getImageData(0, 0, canvasBase.width, canvasBase.height);
    historyStack.push(imageData);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    else historyIndex++;
    if (historyIndex >= MAX_HISTORY) historyIndex = MAX_HISTORY - 1;
  }

  document.getElementById('btn-undo').addEventListener('click', function () {
    if (historyIndex > 0) {
      historyIndex--;
      ctxBase.putImageData(historyStack[historyIndex], 0, 0);
      autoSave();
    } else if (historyIndex === 0) {
      historyIndex = -1; clearCanvas(false);
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
    var rect = wrapper.getBoundingClientRect();
    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.globalAlpha = 1;
    ctxBase.clearRect(0, 0, canvasBase.width, canvasBase.height);
    ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
    if (push) pushHistory();
  }

  document.getElementById('btn-clear').addEventListener('click', function() {
    if (confirm('确定要清空当前所有笔迹吗？(底图不受影响)')) {
      clearCanvas(true);
      autoSave();
    }
  });

  document.getElementById('btn-save').addEventListener('click', function() {
    var format = exportFormat.value;
    var quality = 0.95;
    
    // 创建临时画布，用于合并三层
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvasBg.width;
    tmpCanvas.height = canvasBg.height;
    var tCtx = tmpCanvas.getContext('2d');

    // 如果导出为 JPG，且没有底图，铺白底
    if (format === 'image/jpeg' && !bgImageObj) {
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    }

    // 依次绘制各层
    tCtx.drawImage(canvasBg, 0, 0);
    tCtx.drawImage(canvasBase, 0, 0);
    tCtx.drawImage(canvasTop, 0, 0);

    var ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
    var link = document.createElement('a');
    link.download = 'drawing_' + Date.now() + '.' + ext;
    link.href = tmpCanvas.toDataURL(format, quality);
    link.click();
  });

  // 快捷键
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) document.getElementById('btn-redo').click();
        else document.getElementById('btn-undo').click();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        document.getElementById('btn-redo').click();
      }
    } else {
      if (e.key === '[') { brushSize.value = Math.max(1, currentSize - 2); brushSize.dispatchEvent(new Event('input')); }
      else if (e.key === ']') { brushSize.value = Math.min(80, currentSize + 2); brushSize.dispatchEvent(new Event('input')); }
    }
  });


  // ================= 7. 底图与自动保存 =================
  var btnUploadBg = document.getElementById('btn-upload-bg');
  var btnRemoveBg = document.getElementById('btn-remove-bg');

  btnUploadBg.addEventListener('change', function(e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    if (!file.type.startsWith('image/')) return alert('请选择图片文件');
    
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        bgImageObj = img;
        drawBgImage(img);
        try {
          localStorage.setItem('drawboard_bg', ev.target.result);
        } catch(err) { console.warn('底图太大，无法本地保存'); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  btnRemoveBg.addEventListener('click', function() {
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
    // 按比例适应并居中
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

  // 自动保存逻辑
  function autoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function() {
      try {
        var dataUrl = canvasBase.toDataURL('image/png');
        localStorage.setItem('drawboard_autosave', dataUrl);
      } catch(e) {
        console.warn('自动保存失败 (空间可能已满)');
      }
    }, 1000);
  }

  function loadAutoSave() {
    // 加载底图
    var bgBase64 = localStorage.getItem('drawboard_bg');
    if (bgBase64) {
      var bgImg = new Image();
      bgImg.onload = function() {
        bgImageObj = bgImg;
        drawBgImage(bgImg);
      };
      bgImg.src = bgBase64;
    }

    // 加载笔迹
    var base64 = localStorage.getItem('drawboard_autosave');
    if (base64) {
      var img = new Image();
      img.onload = function() {
        var rect = wrapper.getBoundingClientRect();
        ctxBase.drawImage(img, 0, 0, rect.width, rect.height);
        pushHistory();
      };
      img.src = base64;
    }
  }

})();