(function () {
  var wrapper = document.getElementById('canvas-wrapper');
  var canvasBase = document.getElementById('canvas-base');
  var ctxBase = canvasBase.getContext('2d', { willReadFrequently: true });
  var canvasTop = document.getElementById('canvas-top');
  var ctxTop = canvasTop.getContext('2d');

  var dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    var tempImage = canvasBase.width > 0 ? canvasBase.toDataURL() : null;

    canvasBase.width = rect.width * dpr;
    canvasBase.height = rect.height * dpr;
    canvasTop.width = rect.width * dpr;
    canvasTop.height = rect.height * dpr;

    ctxBase.scale(dpr, dpr);
    ctxTop.scale(dpr, dpr);

    if (tempImage) {
      var img = new Image();
      img.onload = function () { ctxBase.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = tempImage;
    } else {
      ctxBase.fillStyle = '#ffffff';
      ctxBase.fillRect(0, 0, rect.width, rect.height);
    }
    pushHistory();
  }
  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 50);

  var isDrawing = false;
  var currentTool = 'pen'; 
  var currentColor = '#3d3226';
  var currentSize = 5;

  var startX = 0, startY = 0;
  var lastX = 0, lastY = 0;
  var lastTime = 0; 
  var hue = 0; // 彩虹笔色相

  var historyStack = [];
  var historyIndex = -1;
  var MAX_HISTORY = 30;

  // ================= UI 事件 =================
  var toolBtns = document.querySelectorAll('.tool-btn');
  var colorBtns = document.querySelectorAll('.color-btn:not(.custom-color)');
  var customColor = document.getElementById('custom-color');
  var brushSize = document.getElementById('brush-size');
  var sizeVal = document.getElementById('size-val');

  toolBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toolBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
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

  // ================= 核心绘制逻辑 =================
  function startDraw(e) {
    if (e.button === 2) return;
    isDrawing = true;
    var pos = getPos(e);
    startX = pos.x; startY = pos.y; lastX = pos.x; lastY = pos.y;
    lastTime = Date.now(); 
    hue = Math.random() * 360;

    // 每次落笔重置底层画笔状态
    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.globalAlpha = 1;
    ctxBase.shadowBlur = 0;
    ctxBase.lineCap = 'round';
    ctxBase.lineJoin = 'round';
    ctxBase.strokeStyle = currentColor;
    ctxBase.lineWidth = currentSize;
    ctxBase.beginPath();
    ctxBase.moveTo(lastX, lastY);

    // 只有普通形状在顶层预览
    if (['line', 'rect', 'circle'].includes(currentTool)) {
      ctxTop.clearRect(0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.globalCompositeOperation = 'source-over';
      ctxTop.strokeStyle = currentColor;
      ctxTop.lineWidth = currentSize;
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

    // 1. 形状类工具（画在 top 层）
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
      ctxTop.stroke();
      return;
    }

    // 2. 连续笔迹类工具（画在 base 层）
    var dist = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
    
    if (currentTool === 'pen' || currentTool === 'marker') {
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
      if (currentTool === 'marker') {
         // 马克笔效果由初始化控制，这里只需保持
      }
    } 
    else if (currentTool === 'highlighter') {
      ctxBase.globalCompositeOperation = 'multiply';
      ctxBase.lineWidth = currentSize * 2;
      ctxBase.strokeStyle = currentColor;
      ctxBase.globalAlpha = 0.2;
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
      ctxBase.globalAlpha = 0.6;
      ctxBase.lineWidth = currentSize * 0.8;
      // 铅笔的颗粒抖动感
      for(var i=0; i<3; i++) {
        var jx = x + (Math.random() - 0.5) * 2;
        var jy = y + (Math.random() - 0.5) * 2;
        ctxBase.lineTo(jx, jy);
        ctxBase.stroke();
      }
      ctxBase.globalAlpha = 1;
    }
    else if (currentTool === 'ink') {
      // 速度越快线条越细
      var speed = dist / dt;
      var targetWidth = Math.max(1, currentSize * 2 - speed * 1.5);
      // 平滑过渡
      ctxBase.lineWidth = ctxBase.lineWidth * 0.7 + targetWidth * 0.3;
      ctxBase.lineTo(x, y);
      ctxBase.stroke();
    }
    else if (currentTool === 'spray') {
      // 在当前位置周围随机喷点
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
      // 随机大小的空心圆
      var rad = Math.random() * currentSize + 2;
      ctxBase.beginPath();
      ctxBase.arc(x, y, rad, 0, Math.PI * 2);
      ctxBase.stroke();
    }
    else if (currentTool === 'crayon') {
      ctxBase.globalAlpha = 0.4;
      ctxBase.lineWidth = currentSize * 0.8;
      // 粗糙感：多次画线，随机偏移
      for(var i=0; i<5; i++) {
        var jx = x + (Math.random() - 0.5) * 4;
        var jy = y + (Math.random() - 0.5) * 4;
        ctxBase.lineTo(jx, jy);
        ctxBase.stroke();
      }
      ctxBase.globalAlpha = 1;
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
    } else {
      ctxBase.closePath();
    }
    
    // 每次画完后恢复所有属性
    ctxBase.globalAlpha = 1;
    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.shadowBlur = 0;

    pushHistory();
  }

  canvasTop.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', draw); 
  window.addEventListener('mouseup', endDraw);

  canvasTop.addEventListener('touchstart', startDraw, { passive: false });
  canvasTop.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', endDraw);

  canvasTop.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // ================= 撤销/重做/清空/保存 =================
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
    } else if (historyIndex === 0) {
      historyIndex = -1; clearCanvas(false);
    }
  });

  document.getElementById('btn-redo').addEventListener('click', function () {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      ctxBase.putImageData(historyStack[historyIndex], 0, 0);
    }
  });

  function clearCanvas(push) {
    var rect = wrapper.getBoundingClientRect();
    ctxBase.globalCompositeOperation = 'source-over';
    ctxBase.globalAlpha = 1;
    ctxBase.clearRect(0, 0, canvasBase.width, canvasBase.height);
    ctxBase.fillStyle = '#ffffff';
    ctxBase.fillRect(0, 0, rect.width, rect.height);
    ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
    if (push) pushHistory();
  }

  document.getElementById('btn-clear').addEventListener('click', function() {
    if (confirm('确定要清空画板吗？')) clearCanvas(true);
  });

  document.getElementById('btn-save').addEventListener('click', function() {
    var link = document.createElement('a');
    link.download = 'drawing_' + Date.now() + '.png';
    link.href = canvasBase.toDataURL('image/png');
    link.click();
  });

  document.addEventListener('keydown', function(e) {
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
      else if (e.key === ']') { brushSize.value = Math.min(50, currentSize + 2); brushSize.dispatchEvent(new Event('input')); }
    }
  });
})();