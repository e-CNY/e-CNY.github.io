(function() {
  var canvas = document.getElementById('signature-canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var container = document.getElementById('canvas-container');

  var customColorInput = document.getElementById('custom-color');
  var colorBtns = document.querySelectorAll('.color-btn');
  var brushSizeInput = document.getElementById('brush-size');
  var brushSizeVal = document.getElementById('brush-size-val');
  var bgModeSelect = document.getElementById('bg-mode');
  var autoCropCheckbox = document.getElementById('auto-crop');

  var btnUndo = document.getElementById('btn-undo');
  var btnClear = document.getElementById('btn-clear');
  var btnDownload = document.getElementById('btn-download');

  var isDrawing = false;
  var currentColor = '#000000';
  var currentSize = 3;
  
  var points = []; // 当前笔画经过的点
  var history = []; // 保存历史图像数据（用于撤销）

  // 初始化画布尺寸
  function resizeCanvas() {
    var rect = container.getBoundingClientRect();
    // 这里为了清晰度，将实际分辨率放大 2 倍
    canvas.width = (rect.width - 20) * 2;
    canvas.height = (rect.height - 20) * 2;
    canvas.style.width = (rect.width - 20) + 'px';
    canvas.style.height = (rect.height - 20) + 'px';
    
    // 因为 canvas 尺寸重置了，需要重新应用背景
    applyBackground();
  }

  // 监听窗口大小变化
  window.addEventListener('resize', resizeCanvas);

  // ================= 1. 背景处理 =================
  function applyBackground() {
    // 清除并应用底色（在 canvas 内绘制的底色会影响导出，但我们导出时是不需要底色的）
    // 所以真正的底色用 CSS 展示，Canvas 本身始终是透明的！
    canvas.style.background = bgModeSelect.value === 'transparent' ? 'transparent' : '#ffffff';
    
    if (bgModeSelect.value === 'grid') {
      // 用 CSS 画点阵
      canvas.style.backgroundImage = 'radial-gradient(#ccc 1px, transparent 1px)';
      canvas.style.backgroundSize = '20px 20px';
    } else {
      canvas.style.backgroundImage = 'none';
    }
  }
  bgModeSelect.addEventListener('change', applyBackground);

  // ================= 2. 绘图引擎 (二次贝塞尔曲线平滑) =================
  function startDrawing(e) {
    isDrawing = true;
    points = [];
    saveHistory();

    var pos = getPos(e);
    points.push(pos);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    // 设置画笔属性
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize * 2; // 因为 canvas 放大了2倍
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 单点也画个圆
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function draw(e) {
    if (!isDrawing) return;

    var pos = getPos(e);
    points.push(pos);

    // 使用二次贝塞尔曲线，让笔迹平滑
    if (points.length >= 3) {
      var p0 = points[points.length - 3];
      var p1 = points[points.length - 2];
      var p2 = points[points.length - 1];

      // 取中点作为终点
      var midX = (p1.x + p2.x) / 2;
      var midY = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      ctx.stroke();
    }
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    
    // 兜底：画出最后一个点
    if (points.length > 0) {
      var last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
    points = [];
    updateUndoBtn();
  }

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    // 计算实际在 Canvas 像素坐标系中的位置
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    
    // 获取指针位置 (兼容鼠标和触摸)
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  // 绑定事件 (使用 pointer 事件完美兼容鼠标与触屏)
  canvas.addEventListener('pointerdown', function(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    startDrawing(e);
  });
  canvas.addEventListener('pointermove', function(e) {
    if (isDrawing) {
      e.preventDefault();
      draw(e);
    }
  });
  canvas.addEventListener('pointerup', function(e) {
    e.preventDefault();
    stopDrawing();
  });
  canvas.addEventListener('pointercancel', function(e) {
    e.preventDefault();
    stopDrawing();
  });

  // ================= 3. 画笔设置 =================
  colorBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      colorBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentColor = this.dataset.color;
      customColorInput.value = currentColor;
    });
  });

  customColorInput.addEventListener('input', function() {
    currentColor = this.value;
    colorBtns.forEach(function(b) { b.classList.remove('active'); });
  });

  brushSizeInput.addEventListener('input', function() {
    currentSize = parseFloat(this.value);
    brushSizeVal.textContent = currentSize;
  });

  // ================= 4. 撤销与清空 =================
  function saveHistory() {
    if (history.length > 20) history.shift(); // 限制历史记录数量，防内存溢出
    history.push(canvas.toDataURL());
  }

  function updateUndoBtn() {
    btnUndo.disabled = history.length === 0;
  }

  btnUndo.addEventListener('click', function() {
    if (history.length === 0) return;
    var dataUrl = history.pop();
    var img = new Image();
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      updateUndoBtn();
    };
    img.src = dataUrl;
  });

  btnClear.addEventListener('click', function() {
    if (confirm('确定要清空画板吗？')) {
      saveHistory();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updateUndoBtn();
    }
  });

  // ================= 5. 智能裁切与导出 =================
  btnDownload.addEventListener('click', function() {
    var doCrop = autoCropCheckbox.checked;
    
    if (!doCrop) {
      exportCanvas(canvas);
      return;
    }

    // 获取像素数据寻找有笔迹的边界
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var w = imgData.width;
    var h = imgData.height;
    var pixels = imgData.data;
    
    var top = h, bottom = 0, left = w, right = 0;
    var found = false;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var alpha = pixels[(y * w + x) * 4 + 3]; // 获取 Alpha 通道
        if (alpha > 0) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
          found = true;
        }
      }
    }

    if (!found) {
      alert('画板是空的，请先签上您的大名！');
      return;
    }

    // 加上一点边距 (10像素)
    var padding = 10;
    top = Math.max(0, top - padding);
    left = Math.max(0, left - padding);
    bottom = Math.min(h - 1, bottom + padding);
    right = Math.min(w - 1, right + padding);

    var cropW = right - left + 1;
    var cropH = bottom - top + 1;

    // 创建一个新的临时 Canvas 用于裁剪
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    var tCtx = tempCanvas.getContext('2d');
    
    // 将原图特定区域绘制到新画布
    tCtx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);
    
    exportCanvas(tempCanvas);
  });

  function exportCanvas(targetCanvas) {
    var url = targetCanvas.toDataURL('image/png', 1.0);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'signature_' + Date.now() + '.png';
    a.click();
  }

  // 初始化
  resizeCanvas();
  setTimeout(resizeCanvas, 100); // 等待 DOM 渲染完毕再计算一次尺寸
  updateUndoBtn();

})();