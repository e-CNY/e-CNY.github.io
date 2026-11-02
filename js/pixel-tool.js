(function () {
  var canvas = document.getElementById('px-canvas');
  var ctx = canvas.getContext('2d');
  var gridSizeSelect = document.getElementById('px-grid-size');
  var colorPicker = document.getElementById('px-color');
  var btnEraser = document.getElementById('btn-eraser');
  var btnClear = document.getElementById('btn-clear');
  var btnExport = document.getElementById('btn-export');

  var gridSize = 32;
  var cellSize = 16;
  var isDrawing = false;
  var isErasing = false;
  var gridData = [];

  function initGrid() {
    gridSize = parseInt(gridSizeSelect.value, 10);
    var wrap = document.querySelector('.px-canvas-wrap');
    
    // 为了保证 128x128 的格子能点中，给一个最小尺寸保护
    var maxSize = Math.min(wrap.parentElement.clientWidth - 40, wrap.parentElement.clientHeight - 40);
    cellSize = Math.max(2, Math.floor(maxSize / gridSize)); 
    
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    
    gridData = new Array(gridSize * gridSize).fill(null);
    drawGrid();
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 填充颜色块
    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var color = gridData[r * gridSize + c];
        if (color) {
          ctx.fillStyle = color;
          // +1 是为了填补网格线的缝隙
          ctx.fillRect(c * cellSize, r * cellSize, cellSize + 0.5, cellSize + 0.5); 
        }
      }
    }

    // 画网格线 (如果格子太小，就不画线了，或者用极淡的线)
    if (cellSize >= 4) {
      ctx.strokeStyle = cellSize > 8 ? '#e5d9bd' : '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i <= gridSize; i++) {
        ctx.moveTo(i * cellSize + 0.5, 0);
        ctx.lineTo(i * cellSize + 0.5, canvas.height);
        ctx.moveTo(0, i * cellSize + 0.5);
        ctx.lineTo(canvas.width, i * cellSize + 0.5);
      }
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
      
      if (gridData[idx] !== color) {
        gridData[idx] = color;
        drawGrid();
      }
    }
  }

  // 鼠标事件
  canvas.addEventListener('mousedown', function (e) {
    isDrawing = true;
    handleDraw(e);
  });
  window.addEventListener('mousemove', handleDraw);
  window.addEventListener('mouseup', function () { isDrawing = false; });

  // 触摸事件
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

  btnExport.addEventListener('click', function () {
    var exportCanvas = document.createElement('canvas');
    var exportScale = Math.floor(512 / gridSize); // 保证输出至少 512px 大小
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

  initGrid();
  window.addEventListener('resize', initGrid);
})();