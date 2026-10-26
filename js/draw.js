(function () {
  // ================= 初始化 Canvas 与高清屏适配 =================
  var wrapper = document.getElementById('canvas-wrapper');
  var canvasBase = document.getElementById('canvas-base');
  var ctxBase = canvasBase.getContext('2d', { willReadFrequently: true });
  var canvasTop = document.getElementById('canvas-top');
  var ctxTop = canvasTop.getContext('2d');

  var dpr = window.devicePixelRatio || 1;

  // 初始化画布大小
  function resizeCanvas() {
    var rect = wrapper.getBoundingClientRect();
    // 阻止清空重绘
    var tempImage = canvasBase.width > 0 ? canvasBase.toDataURL() : null;

    canvasBase.width = rect.width * dpr;
    canvasBase.height = rect.height * dpr;
    canvasTop.width = rect.width * dpr;
    canvasTop.height = rect.height * dpr;

    ctxBase.scale(dpr, dpr);
    ctxTop.scale(dpr, dpr);

    // 恢复画板内容
    if (tempImage) {
      var img = new Image();
      img.onload = function () {
        ctxBase.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = tempImage;
    }
    
    // 填充默认白底
    ctxBase.fillStyle = '#ffffff';
    ctxBase.fillRect(0, 0, rect.width, rect.height);
    
    pushHistory(); // 初始化历史
  }

  window.addEventListener('resize', resizeCanvas);
  // 等 DOM 渲染完毕后初始化
  setTimeout(resizeCanvas, 50);

  // ================= 状态管理 =================
  var isDrawing = false;
  var currentTool = 'pen'; 
  var currentColor = '#3d3226';
  var currentSize = 5;

  var startX = 0, startY = 0;
  var lastX = 0, lastY = 0;

  // 历史记录栈
  var historyStack = [];
  var historyIndex = -1;
  var MAX_HISTORY = 30;

  // ================= 工具与颜色选择 =================
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

  // ================= 绘图逻辑 =================
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
    e.preventDefault();
    if (e.button === 2) return; // 忽略右键
    isDrawing = true;
    var pos = getPos(e);
    startX = pos.x;
    startY = pos.y;
    lastX = pos.x;
    lastY = pos.y;

    if (currentTool === 'pen' || currentTool === 'marker' || currentTool === 'eraser') {
      ctxBase.beginPath();
      ctxBase.moveTo(lastX, lastY);
      ctxBase.lineCap = 'round';
      ctxBase.lineJoin = 'round';
      
      if (currentTool === 'eraser') {
        ctxBase.globalCompositeOperation = 'destination-out';
        ctxBase.lineWidth = currentSize * 2; // 橡皮擦稍微大一点
        ctxBase.strokeStyle = 'rgba(0,0,0,1)';
      } else if (currentTool === 'marker') {
        ctxBase.globalCompositeOperation = 'source-over';
        ctxBase.lineWidth = currentSize * 3; // 马克笔粗一点
        ctxBase.strokeStyle = currentColor;
        ctxBase.globalAlpha = 0.3; // 马克笔半透明
      } else {
        ctxBase.globalCompositeOperation = 'source-over';
        ctxBase.lineWidth = currentSize;
        ctxBase.strokeStyle = currentColor;
        ctxBase.globalAlpha = 1;
      }
    }
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var pos = getPos(e);

    if (currentTool === 'pen' || currentTool === 'marker' || currentTool === 'eraser') {
      // 平滑插值绘制（为了不卡顿，用最简单的 lineTo 效果其实已经不错）
      ctxBase.lineTo(pos.x, pos.y);
      ctxBase.stroke();
      lastX = pos.x;
      lastY = pos.y;
    } else {
      // 形状预览绘制在 Top 画布上
      ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
      ctxTop.globalCompositeOperation = 'source-over';
      ctxTop.lineWidth = currentSize;
      ctxTop.strokeStyle = currentColor;
      ctxTop.lineCap = 'round';
      ctxTop.lineJoin = 'round';
      ctxTop.beginPath();

      if (currentTool === 'line') {
        ctxTop.moveTo(startX, startY);
        ctxTop.lineTo(pos.x, pos.y);
        ctxTop.stroke();
      } else if (currentTool === 'rect') {
        ctxTop.rect(startX, startY, pos.x - startX, pos.y - startY);
        ctxTop.stroke();
      } else if (currentTool === 'circle') {
        var radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
        ctxTop.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctxTop.stroke();
      }
    }
  }

  function endDraw(e) {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (currentTool === 'pen' || currentTool === 'marker' || currentTool === 'eraser') {
      ctxBase.closePath();
      ctxBase.globalAlpha = 1; // 重置透明度
    } else {
      // 将 Top 画布上的形状合并到底层
      ctxBase.drawImage(canvasTop, 0, 0, wrapper.clientWidth, wrapper.clientHeight);
      ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
    }
    
    pushHistory();
  }

  canvasTop.addEventListener('mousedown', startDraw);
  window.addEventListener('mousemove', draw); // 挂载在 window 上防止鼠标移出画板断开
  window.addEventListener('mouseup', endDraw);

  canvasTop.addEventListener('touchstart', startDraw, { passive: false });
  canvasTop.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', endDraw);

  // 禁止右键菜单
  canvasTop.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // ================= 历史记录与撤销重做 =================
  function pushHistory() {
    // 如果当前不是最新的一步，截断后面的历史
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    
    var rect = wrapper.getBoundingClientRect();
    var imageData = ctxBase.getImageData(0, 0, canvasBase.width, canvasBase.height);
    historyStack.push(imageData);
    
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    } else {
      historyIndex++;
    }
    // 限制撤销索引
    if (historyIndex >= MAX_HISTORY) historyIndex = MAX_HISTORY - 1;
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      ctxBase.putImageData(historyStack[historyIndex], 0, 0);
    } else if (historyIndex === 0) {
      // 回到第一步（白板）
      historyIndex = -1;
      clearCanvas(false);
    }
  }

  function redo() {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      ctxBase.putImageData(historyStack[historyIndex], 0, 0);
    }
  }

  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);

  // ================= 清空与保存 =================
  function clearCanvas(push = true) {
    var rect = wrapper.getBoundingClientRect();
    ctxBase.clearRect(0, 0, canvasBase.width, canvasBase.height);
    ctxBase.fillStyle = '#ffffff';
    ctxBase.fillRect(0, 0, rect.width, rect.height);
    ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
    if (push) pushHistory();
  }

  document.getElementById('btn-clear').addEventListener('click', function() {
    if (confirm('确定要清空画板吗？此操作不可恢复。')) {
      clearCanvas();
    }
  });

  document.getElementById('btn-save').addEventListener('click', function() {
    // 必须用 base 的 toDataURL，因为 top 只有临时数据
    var link = document.createElement('a');
    link.download = 'drawing_' + Date.now() + '.png';
    link.href = canvasBase.toDataURL('image/png');
    link.click();
  });

  // ================= 快捷键 =================
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redo(); // Ctrl+Shift+Z 重做
        else undo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redo();
      }
    } else {
      // [ 和 ] 调整笔刷大小
      if (e.key === '[') {
        brushSize.value = Math.max(1, currentSize - 2);
        brushSize.dispatchEvent(new Event('input'));
      } else if (e.key === ']') {
        brushSize.value = Math.min(50, currentSize + 2);
        brushSize.dispatchEvent(new Event('input'));
      }
    }
  });

})();