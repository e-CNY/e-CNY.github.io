(function () {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  // ================== DOM 元素 ==================
  var canvas = document.getElementById('px-canvas');
  var ctx = canvas.getContext('2d');
  var gridSizeSelect = document.getElementById('px-grid-size');
  var showGridCheckbox = document.getElementById('px-show-grid');
  var brushSizeSelect = document.getElementById('px-brush-size');
  var colorPicker = document.getElementById('px-color');
  var colorValText = document.getElementById('px-color-val');
  
  var toolBtns = document.querySelectorAll('.px-tool-btn');
  var colorSwatches = document.querySelectorAll('.px-color-swatch');
  var btnUndo = document.getElementById('btn-undo');
  var btnRedo = document.getElementById('btn-redo');
  var btnClear = document.getElementById('btn-clear');
  var importImgInput = document.getElementById('px-import-img');
  
  var exportScaleSelect = document.getElementById('px-export-scale');
  var exportFormatSelect = document.getElementById('px-export-format');
  var btnExport = document.getElementById('btn-export');

  // ================== 状态变量 ==================
  var gridSize = 32;
  var cellSize = 16;
  var isDrawing = false;
  var currentTool = 'pen'; // pen | eraser | fill | picker
  var currentColor = '#7ba05b';
  var currentBrushSize = 1;
  var showGrid = true;
  
  var gridData = [];       // 一维数组存储颜色，null 代表透明
  var undoStack = [];
  var redoStack = [];
  var MAX_HISTORY = 50;

  // 用于右键快捷擦除
  var isRightClick = false;

  // ================== 初始化画板 ==================
  function initGrid() {
    gridSize = parseInt(gridSizeSelect.value, 10);
    
    // 动态计算画板显示大小
    var wrapParent = document.querySelector('.px-main');
    var maxSize = Math.min(wrapParent.clientWidth - 40, wrapParent.clientHeight - 40, 800);
    if (maxSize < 200) maxSize = 500; // 移动端保底
    
    cellSize = Math.max(2, Math.floor(maxSize / gridSize));
    
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    
    // 保持宽高比自适应
    canvas.style.width = '100%';
    canvas.style.maxWidth = canvas.width + 'px';
    canvas.style.height = 'auto';
    
    gridData = new Array(gridSize * gridSize).fill(null);
    undoStack = [];
    redoStack = [];
    updateUndoRedoBtns();
    drawGrid();
  }

  // ================== 渲染网格 ==================
  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. 填充颜色块
    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var color = gridData[r * gridSize + c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize); 
        }
      }
    }

    // 2. 绘制网格线
    if (showGrid && cellSize >= 4) {
      ctx.strokeStyle = cellSize > 8 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i <= gridSize; i++) {
        // 加 0.5 解决线条模糊问题
        ctx.moveTo(i * cellSize + 0.5, 0);
        ctx.lineTo(i * cellSize + 0.5, canvas.height);
        ctx.moveTo(0, i * cellSize + 0.5);
        ctx.lineTo(canvas.width, i * cellSize + 0.5);
      }
      ctx.stroke();
    }
  }

  // ================== 历史记录 ==================
  function pushHistory() {
    undoStack.push(gridData.slice());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateUndoRedoBtns();
  }

  function updateUndoRedoBtns() {
    btnUndo.disabled = undoStack.length === 0;
    btnRedo.disabled = redoStack.length === 0;
  }

  btnUndo.addEventListener('click', function() {
    if (undoStack.length > 0) {
      redoStack.push(gridData.slice());
      gridData = undoStack.pop();
      drawGrid();
      updateUndoRedoBtns();
    }
  });

  btnRedo.addEventListener('click', function() {
    if (redoStack.length > 0) {
      undoStack.push(gridData.slice());
      gridData = redoStack.pop();
      drawGrid();
      updateUndoRedoBtns();
    }
  });

  // ================== 绘制与交互逻辑 ==================
  function getGridPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    
    // 兼容触摸和鼠标事件
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;

    var x = (clientX - rect.left) * scaleX;
    var y = (clientY - rect.top) * scaleY;
    
    var c = Math.floor(x / cellSize);
    var r = Math.floor(y / cellSize);
    
    if (c >= 0 && c < gridSize && r >= 0 && r < gridSize) {
      return { r: r, c: c, idx: r * gridSize + c };
    }
    return null;
  }

  function paintCell(r, c, color) {
    var half = Math.floor(currentBrushSize / 2);
    var startR = r - half;
    var startC = c - half;
    
    for (var i = 0; i < currentBrushSize; i++) {
      for (var j = 0; j < currentBrushSize; j++) {
        var nr = startR + i;
        var nc = startC + j;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          gridData[nr * gridSize + nc] = color;
        }
      }
    }
  }

  function floodFill(r, c, targetColor, replaceColor) {
    if (targetColor === replaceColor) return;
    var stack = [{r: r, c: c}];
    while (stack.length > 0) {
      var pos = stack.pop();
      var idx = pos.r * gridSize + pos.c;
      if (gridData[idx] === targetColor) {
        gridData[idx] = replaceColor;
        if (pos.r > 0) stack.push({r: pos.r - 1, c: pos.c});
        if (pos.r < gridSize - 1) stack.push({r: pos.r + 1, c: pos.c});
        if (pos.c > 0) stack.push({r: pos.r, c: pos.c - 1});
        if (pos.c < gridSize - 1) stack.push({r: pos.r, c: pos.c + 1});
      }
    }
  }

  function handleAction(e) {
    var pos = getGridPos(e);
    if (!pos) return;

    if (currentTool === 'picker') {
      var color = gridData[pos.idx];
      if (color) {
        currentColor = color;
        colorPicker.value = color;
        colorValText.textContent = color;
        updateSwatchActive(color);
      }
      return;
    }

    if (currentTool === 'fill') {
      pushHistory();
      var targetColor = gridData[pos.idx];
      var replaceColor = currentColor;
      if (!isRightClick) {
        floodFill(pos.r, pos.c, targetColor, replaceColor);
      } else {
        floodFill(pos.r, pos.c, targetColor, null);
      }
      drawGrid();
      return;
    }

    // 画笔 / 橡皮
    var colorToPaint = null;
    if (currentTool === 'pen' && !isRightClick) {
      colorToPaint = currentColor;
    } else if (currentTool === 'eraser' || isRightClick) {
      colorToPaint = null; // 透明
    }

    paintCell(pos.r, pos.c, colorToPaint);
    drawGrid();
  }

  function startDraw(e) {
    // 记录历史
    pushHistory();
    isDrawing = true;
    handleAction(e);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    handleAction(e);
  }

  function endDraw() {
    if (isDrawing) {
      isDrawing = false;
    }
  }

  // 鼠标事件
  canvas.addEventListener('mousedown', function(e) {
    isRightClick = (e.button === 2);
    startDraw(e);
  });
  window.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', endDraw);

  // 触摸事件
  canvas.addEventListener('touchstart', function(e) {
    startDraw(e);
  }, { passive: false });
  window.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', endDraw);

  // 阻止右键菜单
  canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });


  // ================== 图转像素画 ==================
  importImgInput.addEventListener('change', function(e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    if (!file.type.startsWith('image/')) return showToast('请选择图片文件');
    
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        pushHistory();
        // 创建临时画布，缩放到网格大小
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = gridSize;
        tmpCanvas.height = gridSize;
        var tmpCtx = tmpCanvas.getContext('2d');
        
        // 计算居中裁剪 (类似 object-fit: cover)
        var imgRatio = img.width / img.height;
        var boxRatio = 1; // 正方形
        var sX, sY, sW, sH;
        if (imgRatio > boxRatio) {
          sH = img.height;
          sW = img.height;
          sX = (img.width - sW) / 2;
          sY = 0;
        } else {
          sW = img.width;
          sH = img.width;
          sX = 0;
          sY = (img.height - sH) / 2;
        }

        tmpCtx.drawImage(img, sX, sY, sW, sH, 0, 0, gridSize, gridSize);
        var imgData = tmpCtx.getImageData(0, 0, gridSize, gridSize).data;
        
        // 提取像素颜色
        for (var i = 0; i < gridSize * gridSize; i++) {
          var offset = i * 4;
          var r = imgData[offset];
          var g = imgData[offset + 1];
          var b = imgData[offset + 2];
          var a = imgData[offset + 3];
          
          if (a < 128) {
            gridData[i] = null; // 半透明以下忽略
          } else {
            gridData[i] = rgbToHex(r, g, b);
          }
        }
        drawGrid();
        showToast('图片转换成功');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function(x) {
      return ('0' + x.toString(16)).slice(-2);
    }).join('');
  }

  // ================== 导出功能 ==================
  btnExport.addEventListener('click', function() {
    var scale = parseInt(exportScaleSelect.value, 10) || 8;
    var format = exportFormatSelect.value;
    
    var exportCanvas = document.createElement('canvas');
    exportCanvas.width = gridSize * scale;
    exportCanvas.height = gridSize * scale;
    var eCtx = exportCanvas.getContext('2d');
    
    // JPG 不支持透明，铺白底
    if (format === 'image/jpeg') {
      eCtx.fillStyle = '#ffffff';
      eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var color = gridData[r * gridSize + c];
        if (color) {
          eCtx.fillStyle = color;
          eCtx.fillRect(c * scale, r * scale, scale, scale);
        }
      }
    }

    var ext = format === 'image/jpeg' ? 'jpg' : 'png';
    var link = document.createElement('a');
    link.download = 'pixel_art_' + Date.now() + '.' + ext;
    link.href = exportCanvas.toDataURL(format, 1.0);
    link.click();
    showToast('导出成功');
  });

  // ================== 控件事件 ==================
  gridSizeSelect.addEventListener('change', function() {
    if (gridData.some(function(c) { return c !== null; })) {
      if (!confirm('更改画布尺寸将清空当前画作，确定继续吗？')) {
        // 恢复原选项 (简单处理，刷新当前网格尺寸)
        gridSizeSelect.value = gridSize;
        return;
      }
    }
    initGrid();
  });

  showGridCheckbox.addEventListener('change', function() {
    showGrid = this.checked;
    drawGrid();
  });

  brushSizeSelect.addEventListener('change', function() {
    currentBrushSize = parseInt(this.value, 10);
  });

  // 工具切换
  toolBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      toolBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentTool = this.dataset.tool;
    });
  });

  // 颜色切换
  function updateSwatchActive(color) {
    colorSwatches.forEach(function(swatch) {
      if (swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

  colorPicker.addEventListener('input', function() {
    currentColor = this.value;
    colorValText.textContent = currentColor;
    updateSwatchActive(currentColor);
    // 如果当前是橡皮擦，自动切回画笔
    if (currentTool === 'eraser') {
      toolBtns.forEach(function(b) { b.classList.remove('active'); });
      document.querySelector('[data-tool="pen"]').classList.add('active');
      currentTool = 'pen';
    }
  });

  colorSwatches.forEach(function(swatch) {
    swatch.addEventListener('click', function() {
      currentColor = this.dataset.color;
      colorPicker.value = currentColor;
      colorValText.textContent = currentColor;
      updateSwatchActive(currentColor);
      if (currentTool === 'eraser') {
        toolBtns.forEach(function(b) { b.classList.remove('active'); });
        document.querySelector('[data-tool="pen"]').classList.add('active');
        currentTool = 'pen';
      }
    });
  });

  btnClear.addEventListener('click', function() {
    if (confirm('确定要清空画板吗？')) {
      pushHistory();
      gridData.fill(null);
      drawGrid();
    }
  });

  // 快捷键
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) btnRedo.click();
        else btnUndo.click();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        btnRedo.click();
      }
    }
  });

  // 初始化
  initGrid();
  window.addEventListener('resize', function() {
    // 窗口改变时，重绘大小而不丢失数据
    var wrapParent = document.querySelector('.px-main');
    var maxSize = Math.min(wrapParent.clientWidth - 40, wrapParent.clientHeight - 40, 800);
    if (maxSize < 200) maxSize = 500;
    var newCellSize = Math.max(2, Math.floor(maxSize / gridSize));
    
    if (newCellSize !== cellSize) {
      cellSize = newCellSize;
      canvas.width = gridSize * cellSize;
      canvas.height = gridSize * cellSize;
      drawGrid();
    }
  });
})();