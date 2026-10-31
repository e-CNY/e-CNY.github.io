(function () {
  var canvas = document.getElementById('px-canvas');
  var ctx = canvas.getContext('2d');
  var gridSizeSelect = document.getElementById('px-grid-size');
  var colorPicker = document.getElementById('px-color');
  var btnEraser = document.getElementById('btn-eraser');
  var btnClear = document.getElementById('btn-clear');
  var btnExport = document.getElementById('btn-export');

  var gridSize = 32;
  var cellSize = 16; // 显示大小，导出时会缩放
  var isDrawing = false;
  var isErasing = false;
  var gridData = []; // 存储每个格子的颜色

  function initGrid() {
    gridSize = parseInt(gridSizeSelect.value, 10);
    // 动态计算缩放，让画板适应容器
    var wrap = document.querySelector('.px-canvas-wrap');
    var maxSize = Math.min(wrap.parentElement.clientWidth - 40, wrap.parentElement.clientHeight - 40);
    cellSize = Math.floor(maxSize / gridSize);
    
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    
    // 初始化数据
    gridData = [];
    for (var i = 0; i < gridSize * gridSize; i++) {
      gridData.push(null);
    }
    drawGrid();
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 画背景格子
    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var color = gridData[r * gridSize + c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    // 画网格线
    ctx.strokeStyle = '#e5d9bd';
    ctx.lineWidth = 1;
    for (var i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize + 0.5, 0);
      ctx.lineTo(i * cellSize + 0.5, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize + 0.5);
      ctx.lineTo(canvas.width, i * cellSize + 0.5);
      ctx.stroke();
    }
  }

  function handleDraw(e) {
    if (!isDrawing) return;
    
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    
    var c = Math.floor(x / cellSize);
    var r = Math.floor(y / cellSize);

    if (c >= 0 && c < gridSize && r >= 0 && r < gridSize) {
      var idx = r * gridSize + c;
      var color = isErasing ? null : colorPicker.value;
      
      // 如果颜色改变，则重绘
      if (gridData[idx] !== color) {
        gridData[idx] = color;
        drawGrid();
      }
    }
  }

  canvas.addEventListener('mousedown', function (e) {
    isDrawing = true;
    handleDraw(e);
  });
  window.addEventListener('mousemove', handleDraw);
  window.addEventListener('mouseup', function () { isDrawing = false; });

  // 触摸支持
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    isDrawing = true;
    handleDraw(e.touches[0]);
  }, { passive: false });
  window.addEventListener('touchmove', function (e) {
    if (isDrawing) {
      e.preventDefault();
      handleDraw(e.touches[0]);
    }
  }, { passive: false });
  window.addEventListener('touchend', function () { isDrawing = false; });

  // UI 交互
  gridSizeSelect.addEventListener('change', initGrid);

  btnEraser.addEventListener('click', function () {
    isErasing = !isErasing;
    this.classList.toggle('active', isErasing);
  });

  colorPicker.addEventListener('input', function () {
    isErasing = false;
    btnEraser.classList.remove('active');
  });

  btnClear.addEventListener('click', function () {
    if (confirm('确定要清空画板吗？')) {
      gridData.fill(null);
      drawGrid();
    }
  });

  // 导出高清无网格图片
  btnExport.addEventListener('click', function () {
    var exportCanvas = document.createElement('canvas');
    var exportScale = 20; // 导出时每个格子放大到 20x20 像素
    exportCanvas.width = gridSize * exportScale;
    exportCanvas.height = gridSize * exportScale;
    var eCtx = exportCanvas.getContext('2d');

    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var color = gridData[r * gridSize + c];
        if (color) {
          eCtx.fillStyle = color;
          eCtx.fillRect(c * exportScale, r * exportScale, exportScale, exportScale);
        }
      }
    }

    var a = document.createElement('a');
    a.href = exportCanvas.toDataURL('image/png');
    a.download = 'pixel_art_' + Date.now() + '.png';
    a.click();
  });

  // 初始化
  initGrid();
  window.addEventListener('resize', initGrid); // 自适应窗口
})();