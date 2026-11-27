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

  // ================== DOM ==================
  var canvas = document.getElementById('px-canvas');
  var ctx = canvas.getContext('2d');
  var gridSizeSelect = document.getElementById('px-grid-size');
  var showGridCheckbox = document.getElementById('px-show-grid');
  var showCheckerCheckbox = document.getElementById('px-show-checker');
  var brushSizeSelect = document.getElementById('px-brush-size');
  var colorPicker = document.getElementById('px-color');
  var colorValText = document.getElementById('px-color-val');
  var mirrorModeSelect = document.getElementById('px-mirror-mode');
  var shapeFillCheckbox = document.getElementById('px-shape-fill');

  var toolBtns = document.querySelectorAll('.px-tool-btn');
  var colorSwatches = document.querySelectorAll('.px-color-swatch');
  var btnUndo = document.getElementById('btn-undo');
  var btnRedo = document.getElementById('btn-redo');
  var btnClear = document.getElementById('btn-clear');
  var importImgInput = document.getElementById('px-import-img');
  var saveJsonBtn = document.getElementById('btn-save-json');
  var loadJsonInput = document.getElementById('px-load-json');

  var exportScaleSelect = document.getElementById('px-export-scale');
  var exportFormatSelect = document.getElementById('px-export-format');
  var btnExport = document.getElementById('btn-export');

  // ================== 状态 ==================
  var gridSize = 32;
  var cellSize = 16;
  var isDrawing = false;
  var currentTool = 'pen';
  var currentColor = '#7ba05b';
  var currentBrushSize = 1;
  var showGrid = true;
  var showChecker = false;
  var mirrorMode = 'none';
  var fillShapeMode = false;

  var gridData = [];
  var undoStack = [];
  var redoStack = [];
  var MAX_HISTORY = 50;

  var isRightClick = false;
  var lastPaintedCell = null; // Shift+点按画笔的画线起点
  var dragStart = null;       // 形状工具起点
  var lastMouseGridPos = null;
  var autoSaveTimer = null;

  // ================== Konva 状态 ==================
  var konvaStage = null, konvaLayer = null;
  var hoverRect = null, coordText = null, coordBg = null, coordGroup = null;
  var symVGuide = null, symHGuide = null;
  var previewShape = null;

  // ================== 初始化画板 ==================
  function initGrid() {
    gridSize = parseInt(gridSizeSelect.value, 10);

    var wrapParent = document.querySelector('.px-main');
    var maxSize = Math.min(wrapParent.clientWidth - 40, wrapParent.clientHeight - 40, 800);
    if (maxSize < 200) maxSize = 500;

    cellSize = Math.max(2, Math.floor(maxSize / gridSize));

    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    canvas.style.width = '100%';
    canvas.style.maxWidth = canvas.width + 'px';
    canvas.style.height = 'auto';

    gridData = new Array(gridSize * gridSize).fill(null);
    undoStack = [];
    redoStack = [];
    lastPaintedCell = null;
    clearPreview();
    hideHover();
    updateUndoRedoBtns();
    drawGrid();

    requestAnimationFrame(initKonvaLayer);
  }

  // ================== 渲染网格 ==================
  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 透明棋盘
    if (showChecker) {
      for (var r0 = 0; r0 < gridSize; r0++) {
        for (var c0 = 0; c0 < gridSize; c0++) {
          var alt = (r0 + c0) % 2;
          ctx.fillStyle = alt ? '#f0f0f0' : '#ffffff';
          ctx.fillRect(c0 * cellSize, r0 * cellSize, cellSize, cellSize);
        }
      }
    }

    // 颜色块
    for (var r = 0; r < gridSize; r++) {
      for (var c = 0; c < gridSize; c++) {
        var color = gridData[r * gridSize + c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    // 网格线
    if (showGrid && cellSize >= 4) {
      ctx.strokeStyle = cellSize > 8 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)';
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

  // ================== 历史 ==================
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

  btnUndo.addEventListener('click', function () {
    if (undoStack.length > 0) {
      redoStack.push(gridData.slice());
      gridData = undoStack.pop();
      drawGrid();
      updateUndoRedoBtns();
      autoSave();
    }
  });

  btnRedo.addEventListener('click', function () {
    if (redoStack.length > 0) {
      undoStack.push(gridData.slice());
      gridData = redoStack.pop();
      drawGrid();
      updateUndoRedoBtns();
      autoSave();
    }
  });

  // ================== 坐标/命中 ==================
  function getGridPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;

    var clientX = e.touches ? (e.touches[0] && e.touches[0].clientX) : e.clientX;
    var clientY = e.touches ? (e.touches[0] && e.touches[0].clientY) : e.clientY;
    if (clientX == null) return null;

    var x = (clientX - rect.left) * scaleX;
    var y = (clientY - rect.top) * scaleY;

    var c = Math.floor(x / cellSize);
    var r = Math.floor(y / cellSize);

    if (c >= 0 && c < gridSize && r >= 0 && r < gridSize) {
      return { r: r, c: c, idx: r * gridSize + c };
    }
    return null;
  }

  // ================== 绘制逻辑 ==================
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

  function paintCellWithMirror(r, c, color) {
    paintCell(r, c, color);
    var doX = mirrorMode === 'x' || mirrorMode === 'xy';
    var doY = mirrorMode === 'y' || mirrorMode === 'xy';
    if (doX) paintCell(r, gridSize - 1 - c, color);
    if (doY) paintCell(gridSize - 1 - r, c, color);
    if (mirrorMode === 'xy') paintCell(gridSize - 1 - r, gridSize - 1 - c, color);
  }

  function paintAt(r, c, color) {
    paintCellWithMirror(r, c, color);
  }

  function floodFill(r, c, targetColor, replaceColor) {
    if (targetColor === replaceColor) return;
    var stack = [{ r: r, c: c }];
    while (stack.length > 0) {
      var pos = stack.pop();
      var idx = pos.r * gridSize + pos.c;
      if (gridData[idx] === targetColor) {
        gridData[idx] = replaceColor;
        if (pos.r > 0) stack.push({ r: pos.r - 1, c: pos.c });
        if (pos.r < gridSize - 1) stack.push({ r: pos.r + 1, c: pos.c });
        if (pos.c > 0) stack.push({ r: pos.r, c: pos.c - 1 });
        if (pos.c < gridSize - 1) stack.push({ r: pos.r, c: pos.c + 1 });
      }
    }
  }

  function applyFillMirror(pos, targetColor, replaceColor) {
    if (mirrorMode === 'x' || mirrorMode === 'xy') {
      var mC = gridSize - 1 - pos.c;
      var mIdx = pos.r * gridSize + mC;
      if (gridData[mIdx] === targetColor) floodFill(pos.r, mC, targetColor, replaceColor);
    }
    if (mirrorMode === 'y' || mirrorMode === 'xy') {
      var mR = gridSize - 1 - pos.r;
      var mIdx2 = mR * gridSize + pos.c;
      if (gridData[mIdx2] === targetColor) floodFill(mR, pos.c, targetColor, replaceColor);
    }
    if (mirrorMode === 'xy') {
      var mR2 = gridSize - 1 - pos.r;
      var mC2 = gridSize - 1 - pos.c;
      var mIdx3 = mR2 * gridSize + mC2;
      if (gridData[mIdx3] === targetColor) floodFill(mR2, mC2, targetColor, replaceColor);
    }
  }

  // Bresenham 画线
  function bresenham(r0, c0, r1, c1, cb) {
    var dx = Math.abs(c1 - c0);
    var dy = Math.abs(r1 - r0);
    var sx = c0 < c1 ? 1 : -1;
    var sy = r0 < r1 ? 1 : -1;
    var err = dx - dy;
    while (true) {
      cb(r0, c0);
      if (r0 === r1 && c0 === c1) break;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; c0 += sx; }
      if (e2 < dx) { err += dx; r0 += sy; }
    }
  }

  // ================== 事件 ==================
  function startDraw(e) {
    isRightClick = (e.button === 2);
    var pos = getGridPos(e);
    if (!pos) return;

    // 吸管
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

    // 油漆桶
    if (currentTool === 'fill') {
      var targetColor = gridData[pos.idx];
      var replaceColor = isRightClick ? null : currentColor;
      if (targetColor === replaceColor) return;
      pushHistory();
      floodFill(pos.r, pos.c, targetColor, replaceColor);
      applyFillMirror(pos, targetColor, replaceColor);
      drawGrid();
      autoSave();
      return;
    }

    // 形状工具
    if (currentTool === 'line' || currentTool === 'rect' || currentTool === 'ellipse') {
      dragStart = pos;
      lastMouseGridPos = pos;
      isDrawing = true;
      updatePreviewShape(pos);
      return;
    }

    // Shift + 画笔 / 橡皮：画直线
    if (e.shiftKey && lastPaintedCell && (currentTool === 'pen' || currentTool === 'eraser')) {
      pushHistory();
      var color2 = (currentTool === 'eraser' || isRightClick) ? null : currentColor;
      bresenham(lastPaintedCell.r, lastPaintedCell.c, pos.r, pos.c, function (r, c) {
        paintAt(r, c, color2);
      });
      drawGrid();
      lastPaintedCell = pos;
      autoSave();
      return;
    }

    // 画笔 / 橡皮
    pushHistory();
    isDrawing = true;
    var paintColor = (currentTool === 'eraser' || isRightClick) ? null : currentColor;
    paintAt(pos.r, pos.c, paintColor);
    lastPaintedCell = pos;
    drawGrid();
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var pos = getGridPos(e);
    if (!pos) return;

    // 形状预览
    if (dragStart) {
      lastMouseGridPos = pos;
      updatePreviewShape(pos);
      return;
    }

    // 连续绘制
    if (currentTool === 'pen' || currentTool === 'eraser') {
      var color = isRightClick ? null : (currentTool === 'eraser' ? null : currentColor);
      paintAt(pos.r, pos.c, color);
      lastPaintedCell = pos;
      drawGrid();
    }
  }

  function endDraw() {
    if (!isDrawing) return;

    if (dragStart && lastMouseGridPos) {
      pushHistory();
      rasterizeShape(dragStart, lastMouseGridPos);
      drawGrid();
      clearPreview();
      autoSave();
    }

    dragStart = null;
    isDrawing = false;
  }

  // 拖拽形状 → 栅格化
  function rasterizeShape(start, end) {
    var color = currentColor;

    if (currentTool === 'line') {
      bresenham(start.r, start.c, end.r, end.c, function (r, c) {
        paintAt(r, c, color);
      });
    } else if (currentTool === 'rect') {
      var minR = Math.min(start.r, end.r), maxR = Math.max(start.r, end.r);
      var minC = Math.min(start.c, end.c), maxC = Math.max(start.c, end.c);
      for (var r = minR; r <= maxR; r++) {
        for (var c = minC; c <= maxC; c++) {
          var onEdge = (r === minR || r === maxR || c === minC || c === maxC);
          if (fillShapeMode || onEdge) paintAt(r, c, color);
        }
      }
    } else if (currentTool === 'ellipse') {
      var minRe = Math.min(start.r, end.r), maxRe = Math.max(start.r, end.r);
      var minCe = Math.min(start.c, end.c), maxCe = Math.max(start.c, end.c);
      var cx = (minCe + maxCe) / 2;
      var cy = (minRe + maxRe) / 2;
      var rx = (maxCe - minCe + 1) / 2;
      var ry = (maxRe - minRe + 1) / 2;

      var inside = {};
      for (var rr = minRe; rr <= maxRe; rr++) {
        for (var cc = minCe; cc <= maxCe; cc++) {
          var nx = (cc - cx) / rx;
          var ny = (rr - cy) / ry;
          if (nx * nx + ny * ny <= 1.0) {
            inside[rr * gridSize + cc] = true;
          }
        }
      }

      for (var rr2 = minRe; rr2 <= maxRe; rr2++) {
        for (var cc2 = minCe; cc2 <= maxCe; cc2++) {
          var idx = rr2 * gridSize + cc2;
          if (!inside[idx]) continue;
          if (fillShapeMode) {
            paintAt(rr2, cc2, color);
          } else {
            var isBoundary =
              !inside[(rr2 - 1) * gridSize + cc2] ||
              !inside[(rr2 + 1) * gridSize + cc2] ||
              !inside[rr2 * gridSize + (cc2 - 1)] ||
              !inside[rr2 * gridSize + (cc2 + 1)];
            if (isBoundary) paintAt(rr2, cc2, color);
          }
        }
      }
    }
  }

  // ================== 鼠标 / 触摸 ==================
  canvas.addEventListener('mousedown', function (e) {
    startDraw(e);
  });
  window.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', endDraw);

  canvas.addEventListener('touchstart', function (e) {
    startDraw(e);
  }, { passive: false });
  window.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', endDraw);

  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // 悬停更新 Konva
  canvas.addEventListener('mousemove', function (e) {
    updateKonvaHover(e);
  });
  canvas.addEventListener('mouseleave', hideHover);

  // ================== Konva 浮层 ==================
  function initKonvaLayer() {
    if (typeof Konva === 'undefined') return;
    var container = document.getElementById('px-konva-container');
    if (!container) return;

    var rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(initKonvaLayer, 100);
      return;
    }

    if (!konvaStage) {
      konvaStage = new Konva.Stage({
        container: 'px-konva-container',
        width: rect.width,
        height: rect.height
      });
      konvaLayer = new Konva.Layer({ listening: false });
      konvaStage.add(konvaLayer);

      // 对称参考线
      symVGuide = new Konva.Line({
        points: [0, 0, 0, 0],
        stroke: '#4a90e2', strokeWidth: 1.5, dash: [6, 4],
        listening: false, visible: false
      });
      symHGuide = new Konva.Line({
        points: [0, 0, 0, 0],
        stroke: '#4a90e2', strokeWidth: 1.5, dash: [6, 4],
        listening: false, visible: false
      });
      konvaLayer.add(symVGuide);
      konvaLayer.add(symHGuide);

      // 悬停格高亮
      hoverRect = new Konva.Rect({
        fill: 'rgba(138, 90, 43, 0.22)',
        stroke: '#8a5a2b', strokeWidth: 1.5,
        visible: false, listening: false
      });
      konvaLayer.add(hoverRect);

      // 坐标标签
      coordBg = new Konva.Rect({
        fill: 'rgba(61,50,38,0.9)',
        cornerRadius: 4,
        listening: false, visible: false
      });
      coordText = new Konva.Text({
        text: '', fontSize: 11, fontFamily: 'monospace',
        fill: '#fff', padding: 5, listening: false
      });
      coordGroup = new Konva.Group({ listening: false, visible: false });
      coordGroup.add(coordBg);
      coordGroup.add(coordText);
      konvaLayer.add(coordGroup);
    } else {
      konvaStage.width(rect.width);
      konvaStage.height(rect.height);
    }

    updateGuides();
    konvaLayer.batchDraw();
  }

  function updateGuides() {
    if (!konvaStage || !symVGuide) return;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;

    symVGuide.visible(mirrorMode === 'x' || mirrorMode === 'xy');
    symHGuide.visible(mirrorMode === 'y' || mirrorMode === 'xy');

    symVGuide.points([w / 2, 0, w / 2, h]);
    symHGuide.points([0, h / 2, w, h / 2]);
    konvaLayer.batchDraw();
  }

  function updateKonvaHover(e) {
    if (!konvaStage || !hoverRect) return;
    var pos = getGridPos(e);
    if (!pos) { hideHover(); return; }

    var rect = canvas.getBoundingClientRect();
    var cssCell = rect.width / gridSize;

    hoverRect.x(pos.c * cssCell);
    hoverRect.y(pos.r * cssCell);
    hoverRect.width(cssCell);
    hoverRect.height(cssCell);
    hoverRect.visible(true);

    coordText.text('R' + pos.r + ', C' + pos.c);
    var tw = coordText.width();
    var th = coordText.height();
    coordBg.width(tw);
    coordBg.height(th);

    var clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var clientY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    var mouseX = clientX - rect.left;
    var mouseY = clientY - rect.top;

    var x = mouseX + 16;
    var y = mouseY - th - 8;
    if (x + tw > rect.width) x = mouseX - tw - 16;
    if (y < 0) y = mouseY + 16;

    coordGroup.position({ x: x, y: y });
    coordGroup.visible(true);

    konvaLayer.batchDraw();
  }

  function hideHover() {
    if (!konvaStage || !hoverRect) return;
    hoverRect.visible(false);
    coordGroup.visible(false);
    konvaLayer.batchDraw();
  }

  // 形状预览
  function hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return 'rgba(0,0,0,' + alpha + ')';
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function updatePreviewShape(currentPos) {
    if (!konvaStage || !dragStart) return;
    var rect = canvas.getBoundingClientRect();
    var cssCell = rect.width / gridSize;

    if (previewShape) { previewShape.destroy(); previewShape = null; }

    var r1 = dragStart.r, c1 = dragStart.c;
    var r2 = currentPos.r, c2 = currentPos.c;
    var minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    var minC = Math.min(c1, c2), maxC = Math.max(c1, c2);

    var fillC = fillShapeMode ? hexToRgba(currentColor, 0.35) : 'transparent';
    var strokeW = Math.max(2, Math.min(cssCell * 0.3, 4));

    if (currentTool === 'rect') {
      previewShape = new Konva.Rect({
        x: minC * cssCell, y: minR * cssCell,
        width: (maxC - minC + 1) * cssCell,
        height: (maxR - minR + 1) * cssCell,
        stroke: currentColor, strokeWidth: strokeW,
        fill: fillC, listening: false, dash: [5, 3]
      });
    } else if (currentTool === 'line') {
      previewShape = new Konva.Line({
        points: [
          (c1 + 0.5) * cssCell, (r1 + 0.5) * cssCell,
          (c2 + 0.5) * cssCell, (r2 + 0.5) * cssCell
        ],
        stroke: currentColor, strokeWidth: strokeW,
        lineCap: 'round', listening: false, dash: [5, 3]
      });
    } else if (currentTool === 'ellipse') {
      previewShape = new Konva.Ellipse({
        x: (minC + maxC + 1) / 2 * cssCell,
        y: (minR + maxR + 1) / 2 * cssCell,
        radiusX: (maxC - minC + 1) / 2 * cssCell,
        radiusY: (maxR - minR + 1) / 2 * cssCell,
        stroke: currentColor, strokeWidth: strokeW,
        fill: fillC, listening: false, dash: [5, 3]
      });
    }

    if (previewShape) konvaLayer.add(previewShape);
    konvaLayer.batchDraw();
  }

  function clearPreview() {
    if (previewShape) {
      previewShape.destroy();
      previewShape = null;
      if (konvaLayer) konvaLayer.batchDraw();
    }
  }

  // ================== 图转像素 ==================
  importImgInput.addEventListener('change', function (e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    if (!file.type.startsWith('image/')) return showToast('请选择图片文件');

    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        pushHistory();
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = gridSize;
        tmpCanvas.height = gridSize;
        var tmpCtx = tmpCanvas.getContext('2d');

        var imgRatio = img.width / img.height;
        var sX, sY, sW, sH;
        if (imgRatio > 1) {
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

        for (var i = 0; i < gridSize * gridSize; i++) {
          var offset = i * 4;
          var r = imgData[offset];
          var g = imgData[offset + 1];
          var b = imgData[offset + 2];
          var a = imgData[offset + 3];
          gridData[i] = (a < 128) ? null : rgbToHex(r, g, b);
        }
        drawGrid();
        autoSave();
        showToast('图片转换成功');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (x) {
      return ('0' + x.toString(16)).slice(-2);
    }).join('');
  }

  // ================== 导出图片 ==================
  btnExport.addEventListener('click', function () {
    var scale = parseInt(exportScaleSelect.value, 10) || 8;
    var format = exportFormatSelect.value;

    var exportCanvas = document.createElement('canvas');
    exportCanvas.width = gridSize * scale;
    exportCanvas.height = gridSize * scale;
    var eCtx = exportCanvas.getContext('2d');

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

  // ================== JSON 工程保存/载入 ==================
  saveJsonBtn.addEventListener('click', function () {
    var data = {
      version: 1,
      gridSize: gridSize,
      data: gridData
    };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pixelart_' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
    showToast('工程已保存');
  });

  loadJsonInput.addEventListener('change', function (e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data.gridSize || !data.data) throw new Error('缺少必要字段');
        if (data.data.length !== data.gridSize * data.gridSize) throw new Error('数据长度不匹配');

        gridSizeSelect.value = data.gridSize;
        initGrid();
        gridData = data.data.slice();
        drawGrid();
        pushHistory();
        autoSave();
        showToast('工程已载入');
      } catch (err) {
        showToast('载入失败: ' + err.message);
      }
    };
    reader.readAsText(file);
    this.value = '';
  });

  // ================== 控件事件 ==================
  gridSizeSelect.addEventListener('change', function () {
    if (gridData.some(function (c) { return c !== null; })) {
      if (!confirm('更改画布尺寸将清空当前画作，确定继续吗？')) {
        gridSizeSelect.value = gridSize;
        return;
      }
    }
    initGrid();
  });

  showGridCheckbox.addEventListener('change', function () {
    showGrid = this.checked;
    drawGrid();
  });

  showCheckerCheckbox.addEventListener('change', function () {
    showChecker = this.checked;
    drawGrid();
  });

  brushSizeSelect.addEventListener('change', function () {
    currentBrushSize = parseInt(this.value, 10);
  });

  mirrorModeSelect.addEventListener('change', function () {
    mirrorMode = this.value;
    updateGuides();
  });

  shapeFillCheckbox.addEventListener('change', function () {
    fillShapeMode = this.checked;
  });

  // 工具切换
  toolBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toolBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentTool = this.dataset.tool;
      lastPaintedCell = null;
      clearPreview();
      dragStart = null;
    });
  });

  // 颜色
  function updateSwatchActive(color) {
    colorSwatches.forEach(function (swatch) {
      if (swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

  colorPicker.addEventListener('input', function () {
    currentColor = this.value;
    colorValText.textContent = currentColor;
    updateSwatchActive(currentColor);
    if (currentTool === 'eraser') {
      toolBtns.forEach(function (b) { b.classList.remove('active'); });
      document.querySelector('[data-tool="pen"]').classList.add('active');
      currentTool = 'pen';
    }
  });

  colorSwatches.forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      currentColor = this.dataset.color;
      colorPicker.value = currentColor;
      colorValText.textContent = currentColor;
      updateSwatchActive(currentColor);
      if (currentTool === 'eraser') {
        toolBtns.forEach(function (b) { b.classList.remove('active'); });
        document.querySelector('[data-tool="pen"]').classList.add('active');
        currentTool = 'pen';
      }
    });
  });

  btnClear.addEventListener('click', function () {
    if (confirm('确定要清空画板吗？')) {
      pushHistory();
      gridData.fill(null);
      drawGrid();
      autoSave();
    }
  });

  // ================== 快捷键 ==================
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) btnRedo.click(); else btnUndo.click();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        btnRedo.click();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        btnExport.click();
      }
    }
  });

  // ================== 自动保存 ==================
  function autoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(function () {
      try {
        localStorage.setItem('pixel_autosave', JSON.stringify({
          gridSize: gridSize,
          data: gridData
        }));
      } catch (err) { /* 忽略 */ }
    }, 1000);
  }

  function loadAutoSave() {
    try {
      var s = localStorage.getItem('pixel_autosave');
      if (!s) return false;
      var d = JSON.parse(s);
      if (d.gridSize && Array.isArray(d.data) && d.data.length === d.gridSize * d.gridSize) {
        gridSizeSelect.value = d.gridSize;
        initGrid();
        gridData = d.data;
        drawGrid();
        pushHistory();
        return true;
      }
    } catch (err) { /* 忽略 */ }
    return false;
  }

  // ================== 启动 ==================
  if (!loadAutoSave()) {
    initGrid();
  }

  window.addEventListener('resize', function () {
    var wrapParent = document.querySelector('.px-main');
    var maxSize = Math.min(wrapParent.clientWidth - 40, wrapParent.clientHeight - 40, 800);
    if (maxSize < 200) maxSize = 500;
    var newCellSize = Math.max(2, Math.floor(maxSize / gridSize));

    if (newCellSize !== cellSize) {
      cellSize = newCellSize;
      canvas.width = gridSize * cellSize;
      canvas.height = gridSize * cellSize;
      drawGrid();
      requestAnimationFrame(initKonvaLayer);
    } else {
      requestAnimationFrame(initKonvaLayer);
    }
  });

})();