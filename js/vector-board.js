(function () {
  'use strict';

  // ================== 依赖检测 ==================
  var HAS_PAPER = typeof paper !== 'undefined';
  var HAS_SNAP = typeof Snap !== 'undefined';
  var HAS_INTERACT = typeof interact !== 'undefined';
  var DPR = window.devicePixelRatio || 1;

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

  var wrap = document.getElementById('canvas-wrap');
  function getCanvasSize() {
    return { width: wrap.clientWidth - 32, height: wrap.clientHeight - 32 };
  }

  var size = getCanvasSize();
  var canvas = new fabric.Canvas('c', {
    width: size.width,
    height: size.height,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true
  });

  // ================== 历史记录 ==================
  var historyStack = [];
  var historyIndex = -1;
  var isHistoryProcessing = false;
  var MAX_HISTORY = 30;

  function saveHistory() {
    if (isHistoryProcessing) return;
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    var json = JSON.stringify(canvas.toJSON(['id', 'customType', 'isBackgroundGrid', 'excludeFromExport']));
    historyStack.push(json);
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    } else {
      historyIndex++;
    }
    updateUndoRedoBtns();
  }

  function updateUndoRedoBtns() {
    document.getElementById('btn-undo').disabled = historyIndex <= 0;
    document.getElementById('btn-redo').disabled = historyIndex >= historyStack.length - 1;
  }

  function loadHistory(json) {
    isHistoryProcessing = true;
    canvas.loadFromJSON(json, function () {
      canvas.renderAll();
      isHistoryProcessing = false;
      updateUndoRedoBtns();
      var grid = canvas.getObjects().find(function (o) { return o.isBackgroundGrid; });
      if (grid) {
        canvas.sendToBack(grid);
        gridRect = grid;
      }
    });
  }

  saveHistory();

  canvas.on('object:modified', saveHistory);
  canvas.on('object:added', function (e) {
    if (e.target && !e.target.isBackgroundGrid) saveHistory();
  });
  canvas.on('object:removed', function (e) {
    if (e.target && !e.target.isBackgroundGrid) saveHistory();
  });

  document.getElementById('btn-undo').addEventListener('click', function () {
    if (historyIndex > 0) { historyIndex--; loadHistory(historyStack[historyIndex]); }
  });
  document.getElementById('btn-redo').addEventListener('click', function () {
    if (historyIndex < historyStack.length - 1) { historyIndex++; loadHistory(historyStack[historyIndex]); }
  });

  // ================== 绘图工具 ==================
  var btnPen = document.getElementById('btn-pen');
  canvas.freeDrawingBrush.color = '#3d3226';
  canvas.freeDrawingBrush.width = 3;

  function clearToolActive() {
    document.querySelectorAll('.vb-toolbar .vb-btn').forEach(function (b) {
      if (b.id !== 'btn-export' && b.id !== 'btn-fullscreen' && b.id !== 'btn-grid' &&
          b.id !== 'btn-pen-bezier') b.classList.remove('active');
    });
    canvas.isDrawingMode = false;
  }

  btnPen.addEventListener('click', function () {
    // 若钢笔贝塞尔工具激活，先关闭
    if (penToolActive) deactivatePenTool();
    canvas.isDrawingMode = !canvas.isDrawingMode;
    this.classList.toggle('active', canvas.isDrawingMode);
    if (canvas.isDrawingMode) canvas.discardActiveObject();
  });

  canvas.on('path:created', function () { saveHistory(); });

  function addCenteredShape(createFn) {
    clearToolActive();
    if (penToolActive) deactivatePenTool();
    var obj = createFn();
    canvas.add(obj);
    canvas.setActiveObject(obj);
  }

  document.getElementById('btn-rect').addEventListener('click', function () {
    addCenteredShape(function () {
      return new fabric.Rect({ left: 100, top: 100, fill: '#7ba05b', width: 120, height: 80, rx: 8, ry: 8 });
    });
  });
  document.getElementById('btn-circle').addEventListener('click', function () {
    addCenteredShape(function () {
      return new fabric.Circle({ left: 150, top: 150, fill: '#4a90e2', radius: 60 });
    });
  });
  document.getElementById('btn-triangle').addEventListener('click', function () {
    addCenteredShape(function () {
      return new fabric.Triangle({ left: 200, top: 200, fill: '#c99a4b', width: 100, height: 100 });
    });
  });
  document.getElementById('btn-line').addEventListener('click', function () {
    addCenteredShape(function () {
      return new fabric.Line([50, 50, 250, 250], { stroke: '#a8452a', strokeWidth: 4 });
    });
  });
  document.getElementById('btn-text').addEventListener('click', function () {
    addCenteredShape(function () {
      return new fabric.IText('双击编辑文字', {
        left: 250, top: 250, fontFamily: 'sans-serif', fontSize: 28, fill: '#3d3226'
      });
    });
  });

  // ================== 属性面板 ==================
  var sidebarEmpty = document.getElementById('sidebar-empty');
  var sidebarContent = document.getElementById('sidebar-content');
  var propTitle = document.getElementById('prop-title');
  var propFill = document.getElementById('prop-fill');
  var propFillNone = document.getElementById('prop-fill-none');
  var propStroke = document.getElementById('prop-stroke');
  var propStrokeWidth = document.getElementById('prop-stroke-width');
  var propOpacity = document.getElementById('prop-opacity');
  var propOpacityVal = document.getElementById('prop-opacity-val');
  var propRadiusGroup = document.getElementById('prop-radius-group');
  var propRadius = document.getElementById('prop-radius');
  var propTextGroup = document.getElementById('prop-text-group');
  var propFontSize = document.getElementById('prop-font-size');

  function updateSidebar() {
    var activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.isBackgroundGrid) {
      sidebarEmpty.style.display = 'block';
      sidebarContent.style.display = 'none';
      return;
    }
    sidebarEmpty.style.display = 'none';
    sidebarContent.style.display = 'block';

    var typeStr = activeObj.type;
    var typeNames = {
      'i-text': '文字', 'text': '文字', 'textbox': '文字',
      'rect': '矩形', 'circle': '圆形', 'triangle': '三角形',
      'line': '直线', 'image': '图片', 'path': '涂鸦/路径', 'group': '组合'
    };
    propTitle.textContent = '属性：' + (typeNames[typeStr] || typeStr);

    if (activeObj.fill && typeof activeObj.fill === 'string' && activeObj.fill.startsWith('#')) {
      propFill.value = activeObj.fill;
    }
    if (activeObj.stroke && typeof activeObj.stroke === 'string' && activeObj.stroke.startsWith('#')) {
      propStroke.value = activeObj.stroke;
    }
    propStrokeWidth.value = activeObj.strokeWidth || 0;

    var opacity = activeObj.opacity !== undefined ? activeObj.opacity : 1;
    propOpacity.value = Math.round(opacity * 100);
    propOpacityVal.textContent = propOpacity.value + '%';

    propRadiusGroup.style.display = (activeObj.type === 'rect') ? 'block' : 'none';
    if (activeObj.type === 'rect') propRadius.value = activeObj.rx || 0;

    propTextGroup.style.display = (activeObj.type === 'i-text' || activeObj.type === 'text' || activeObj.type === 'textbox') ? 'block' : 'none';
    if (activeObj.fontSize) propFontSize.value = activeObj.fontSize;
  }

  canvas.on('selection:created', updateSidebar);
  canvas.on('selection:updated', updateSidebar);
  canvas.on('selection:cleared', function () {
    sidebarEmpty.style.display = 'block';
    sidebarContent.style.display = 'none';
  });

  function applyProp(callback) {
    var activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.isBackgroundGrid) return;
    callback(activeObj);
    canvas.requestRenderAll();
    saveHistory();
  }

  propFill.addEventListener('input', function () {
    var v = this.value;
    applyProp(function (obj) {
      if (obj.type === 'path' || obj.type === 'line') obj.set('stroke', v);
      else obj.set('fill', v);
    });
  });
  propFillNone.addEventListener('click', function () {
    applyProp(function (obj) { obj.set('fill', 'transparent'); });
  });
  propStroke.addEventListener('input', function () {
    var v = this.value;
    applyProp(function (obj) { obj.set('stroke', v); });
  });
  propStrokeWidth.addEventListener('input', function () {
    var v = parseInt(this.value, 10) || 0;
    applyProp(function (obj) { obj.set('strokeWidth', v); });
  });
  propOpacity.addEventListener('input', function () {
    var v = parseInt(this.value, 10) / 100;
    propOpacityVal.textContent = this.value + '%';
    applyProp(function (obj) { obj.set('opacity', v); });
  });
  propRadius.addEventListener('input', function () {
    var v = parseInt(this.value, 10);
    applyProp(function (obj) { obj.set({ rx: v, ry: v }); });
  });
  propFontSize.addEventListener('input', function () {
    var v = parseInt(this.value, 10);
    applyProp(function (obj) { obj.set('fontSize', v); });
  });

  document.getElementById('btn-layer-up').addEventListener('click', function () {
    var obj = canvas.getActiveObject(); if (obj) { canvas.bringForward(obj); saveHistory(); }
  });
  document.getElementById('btn-layer-down').addEventListener('click', function () {
    var obj = canvas.getActiveObject(); if (obj) { canvas.sendBackwards(obj); saveHistory(); }
  });
  document.getElementById('btn-layer-top').addEventListener('click', function () {
    var obj = canvas.getActiveObject(); if (obj) { canvas.bringToFront(obj); saveHistory(); }
  });
  document.getElementById('btn-layer-bottom').addEventListener('click', function () {
    var obj = canvas.getActiveObject();
    if (obj) {
      canvas.sendToBack(obj);
      var grid = canvas.getObjects().find(function (o) { return o.isBackgroundGrid; });
      if (grid) canvas.sendToBack(grid);
      saveHistory();
    }
  });

  // ================== 图片上传 ==================
  function handleImageAdd(file) {
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function (f) {
      fabric.Image.fromURL(f.target.result, function (img) {
        img.scaleToWidth(300);
        img.set({ left: 100, top: 100 });
        canvas.add(img);
        canvas.setActiveObject(img);
        showToast('图片添加成功');
      });
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('image-input').addEventListener('change', function (e) {
    if (e.target.files.length > 0) handleImageAdd(e.target.files[0]);
    this.value = '';
  });
  wrap.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
  wrap.addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files.length > 0) handleImageAdd(e.dataTransfer.files[0]);
  });
  window.addEventListener('paste', function (e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.clipboardData && e.clipboardData.items) {
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        var item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          handleImageAdd(item.getAsFile());
          return;
        }
      }
    }
  });

  // ================== 网格背景 ==================
  var isGridVisible = false;
  var gridRect = null;
  var gridSize = 20;

  function createGrid() {
    var oc = document.createElement('canvas');
    oc.width = gridSize; oc.height = gridSize;
    var ctx = oc.getContext('2d');
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gridSize, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, gridSize);
    ctx.stroke();
    var pattern = new fabric.Pattern({ source: oc, repeat: 'repeat' });
    gridRect = new fabric.Rect({
      left: -10000, top: -10000, width: 20000, height: 20000,
      fill: pattern, selectable: false, evented: false,
      isBackgroundGrid: true, excludeFromExport: true
    });
    canvas.add(gridRect);
    canvas.sendToBack(gridRect);
    canvas.renderAll();
  }

  document.getElementById('btn-grid').addEventListener('click', function () {
    isGridVisible = !isGridVisible;
    this.classList.toggle('active', isGridVisible);
    if (isGridVisible) {
      if (!gridRect) createGrid();
      else { canvas.add(gridRect); canvas.sendToBack(gridRect); canvas.renderAll(); }
    } else if (gridRect) {
      canvas.remove(gridRect); canvas.renderAll();
    }
  });

  // ================== 全屏 & 视图 ==================
  document.getElementById('btn-fullscreen').addEventListener('click', function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function (err) {
        alert('无法进入全屏: ' + err.message);
      });
    } else {
      document.exitFullscreen();
    }
  });

  canvas.on('mouse:wheel', function (opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= Math.pow(0.999, delta);
    if (zoom > 20) zoom = 20;
    if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
    updateZoomLabel();
  });

  var isDragging = false, lastPosX, lastPosY;
  var isSpacePressed = false, wasDrawingMode = false;

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!isSpacePressed) {
        isSpacePressed = true;
        canvas.defaultCursor = 'grab';
        if (canvas.isDrawingMode) { canvas.isDrawingMode = false; wasDrawingMode = true; }
      }
    }
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space') {
      isSpacePressed = false;
      canvas.defaultCursor = 'default';
      if (wasDrawingMode) { canvas.isDrawingMode = true; wasDrawingMode = false; }
    }
  });

  canvas.on('mouse:down', function (opt) {
    if (isSpacePressed || opt.e.altKey) {
      isDragging = true;
      canvas.selection = false;
      canvas.defaultCursor = 'grabbing';
      lastPosX = opt.e.clientX;
      lastPosY = opt.e.clientY;
      opt.e.preventDefault();
      opt.e.stopPropagation();
    }
  });
  canvas.on('mouse:move', function (opt) {
    if (isDragging) {
      var vpt = canvas.viewportTransform;
      vpt[4] += opt.e.clientX - lastPosX;
      vpt[5] += opt.e.clientY - lastPosY;
      canvas.requestRenderAll();
      lastPosX = opt.e.clientX;
      lastPosY = opt.e.clientY;
      opt.e.preventDefault();
      opt.e.stopPropagation();
    }
  });
  canvas.on('mouse:up', function () {
    if (isDragging) {
      isDragging = false;
      canvas.selection = true;
      canvas.defaultCursor = isSpacePressed ? 'grab' : 'default';
    }
  });

  // ================== 删除 / 复制粘贴 / 快捷键 ==================
  document.getElementById('btn-delete').addEventListener('click', function () {
    var activeObjs = canvas.getActiveObjects();
    if (activeObjs.length) {
      canvas.discardActiveObject();
      activeObjs.forEach(function (obj) { if (!obj.isBackgroundGrid) canvas.remove(obj); });
      saveHistory();
    }
  });

  var clipboard = null;
  window.addEventListener('keydown', function (e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 钢笔编辑时避免误删
      if (penToolActive && currentPenPath) return;
      document.getElementById('btn-delete').click();
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') {
        var activeObj = canvas.getActiveObject();
        if (activeObj && !activeObj.isBackgroundGrid) {
          activeObj.clone(function (cloned) { clipboard = cloned; });
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (clipboard) {
          clipboard.clone(function (clonedObj) {
            canvas.discardActiveObject();
            clonedObj.set({ left: clonedObj.left + 20, top: clonedObj.top + 20, evented: true });
            if (clonedObj.type === 'activeSelection') {
              clonedObj.canvas = canvas;
              clonedObj.forEachObject(function (obj) { canvas.add(obj); });
              clonedObj.setCoords();
            } else {
              canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            saveHistory();
          });
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) document.getElementById('btn-redo').click();
        else document.getElementById('btn-undo').click();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        document.getElementById('btn-redo').click();
      }
    }
  });

  // ================== 导出弹窗（PNG/JPG/SVG） ==================
  var exportModal = document.getElementById('export-modal');
  document.getElementById('btn-export').addEventListener('click', function () {
    exportModal.style.display = 'flex';
  });
  document.getElementById('btn-cancel-export').addEventListener('click', function () {
    exportModal.style.display = 'none';
  });

  document.getElementById('btn-confirm-export').addEventListener('click', function () {
    var format = document.getElementById('export-format').value;
    var multiplier = parseInt(document.getElementById('export-scale').value, 10) || 2;
    var includeGrid = document.getElementById('export-include-grid').checked;
    var includeBg = document.getElementById('export-include-bg') ?
      document.getElementById('export-include-bg').checked : true;

    exportModal.style.display = 'none';

    if (format === 'image/svg+xml') {
      exportSVG(includeGrid, includeBg);
      return;
    }

    if (gridRect) gridRect.excludeFromExport = !includeGrid;
    var oldBg = canvas.backgroundColor;
    if (!includeBg) canvas.backgroundColor = 'rgba(0,0,0,0)';

    var dataURL = canvas.toDataURL({
      format: format, multiplier: multiplier, quality: 0.95,
      left: 0, top: 0, width: canvas.width, height: canvas.height
    });

    if (gridRect) gridRect.excludeFromExport = true;
    canvas.backgroundColor = oldBg;

    var ext = format === 'image/jpeg' ? 'jpg' : 'png';
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = 'vector_board_' + Date.now() + '.' + ext;
    a.click();
    showToast('画布已导出');
  });

  // ================== SVG 导出（使用 Snap.svg 后处理） ==================
  function exportSVG(includeGrid, includeBg) {
    if (!HAS_SNAP) {
      showToast('Snap.svg 未加载，无法导出 SVG');
      return;
    }
    var objects = canvas.getObjects();
    var parts = [];
    objects.forEach(function (obj) {
      if (!obj.visible) return;
      if (obj.isBackgroundGrid && !includeGrid) return;
      try {
        parts.push(obj.toSVG());
      } catch (e) { /* 忽略 */ }
    });

    var w = canvas.getWidth(), h = canvas.getHeight();
    var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
      + ' width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
    if (includeBg) svgStr += '<rect width="100%" height="100%" fill="#ffffff"/>';
    svgStr += parts.join('');
    svgStr += '</svg>';

    try {
      var snapSvg = Snap.parse(svgStr);
      // 确保 xmlns
      if (!snapSvg.attr('xmlns')) snapSvg.attr('xmlns', 'http://www.w3.org/2000/svg');
      var finalSvg = '<?xml version="1.0" encoding="UTF-8"?>' + snapSvg.toString();
      var blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'vector_board_' + Date.now() + '.svg';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast('SVG 已导出');
    } catch (e) {
      showToast('SVG 导出失败: ' + e.message);
    }
  }

  // ================== SVG 导入（Snap.svg 校验） ==================
  var svgInput = document.getElementById('svg-input');
  if (svgInput) {
    svgInput.addEventListener('change', function (e) {
      if (!e.target.files.length) return;
      var file = e.target.files[0];
      if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
        showToast('请选择 SVG 文件');
        this.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var svgStr = ev.target.result;
        if (HAS_SNAP) {
          try {
            var parsed = Snap.parse(svgStr);
            if (!parsed) throw new Error('解析失败');
          } catch (err) {
            showToast('SVG 文件无效');
            return;
          }
        }
        fabric.loadSVGFromString(svgStr, function (objects, opts) {
          if (!objects || objects.length === 0) {
            showToast('SVG 中没有可导入元素');
            return;
          }
          var group = fabric.util.groupSVGElements(objects, opts);
          var maxDim = Math.min(canvas.getWidth(), canvas.getHeight()) * 0.6;
          var bbox = group.getBoundingRect();
          if (bbox.width > maxDim || bbox.height > maxDim) {
            var s = Math.min(maxDim / bbox.width, maxDim / bbox.height);
            group.set({ scaleX: s, scaleY: s });
          }
          group.set({ left: 100, top: 100 });
          group.setCoords();
          canvas.add(group);
          canvas.setActiveObject(group);
          saveHistory();
          showToast('SVG 导入成功');
        });
      };
      reader.readAsText(file);
      this.value = '';
    });
  }

  // ================== Paper.js 贝塞尔钢笔工具 ==================
  var penCanvas = null;
  var penPaper = null;
  var penTool = null;
  var currentPenPath = null;
  var penToolActive = false;
  var savedViewportOnPen = null;
  var penStrokeColor = '#3d3226';
  var penStrokeWidth = 3;

  function initPenScope() {
    if (!HAS_PAPER) return;
    penCanvas = document.getElementById('pen-canvas');
    if (!penCanvas || penPaper) return;

    penPaper = new paper.PaperScope();
    penPaper.setup(penCanvas);
  }

  function positionPenCanvas() {
    if (!penCanvas) return;
    var rect = canvas.upperCanvasEl.getBoundingClientRect();
    penCanvas.style.left = rect.left + 'px';
    penCanvas.style.top = rect.top + 'px';
    penCanvas.style.width = rect.width + 'px';
    penCanvas.style.height = rect.height + 'px';
    penCanvas.width = Math.round(rect.width * DPR);
    penCanvas.height = Math.round(rect.height * DPR);
    // 使用 CSS 像素作为 paper 坐标
    if (penPaper) {
      penPaper.view.viewSize = new paper.Size(rect.width, rect.height);
      penPaper.view.setScaling(DPR, DPR);
    }
  }

  function initPenTool() {
    if (!penPaper) return;
    penTool = new penPaper.Tool();
    penTool.onMouseDown = onPenMouseDown;
    penTool.onMouseDrag = onPenMouseDrag;
  }

  function onPenMouseDown(event) {
    var pt = event.point;
    if (!currentPenPath) {
      currentPenPath = new penPaper.Path({
        segments: [pt],
        strokeColor: penStrokeColor,
        strokeWidth: penStrokeWidth,
        fillColor: null
      });
    } else {
      // 靠近起点 → 闭合
      var first = currentPenPath.segments[0].point;
      if (currentPenPath.segments.length > 2 && pt.getDistance(first) < 12) {
        currentPenPath.closed = true;
        finishPenPath();
        return;
      }
      currentPenPath.add(pt);
    }
    penPaper.view.draw();
  }

  function onPenMouseDrag(event) {
    if (!currentPenPath) return;
    var seg = currentPenPath.lastSegment;
    if (!seg) return;
    var d = event.point.subtract(seg.point);
    seg.handleOut = d;
    seg.handleIn = d.multiply(-1);
    penPaper.view.draw();
  }

  function finishPenPath() {
    if (!currentPenPath || currentPenPath.segments.length < 2) {
      if (currentPenPath) currentPenPath.remove();
      currentPenPath = null;
      if (penPaper) penPaper.view.draw();
      return;
    }

    var svgStr;
    try {
      svgStr = currentPenPath.exportSVG({ asString: true, precision: 2 });
    } catch (e) {
      svgStr = '<svg xmlns="http://www.w3.org/2000/svg"><path d="' + currentPenPath.pathData + '" fill="none" stroke="' + penStrokeColor + '" stroke-width="' + penStrokeWidth + '"/></svg>';
    }

    var strokeC = penStrokeColor, strokeW = penStrokeWidth;
    fabric.loadSVGFromString(svgStr, function (objects, opts) {
      if (!objects || objects.length === 0) return;
      objects.forEach(function (obj) {
        if (obj.type === 'path') {
          obj.set({
            fill: 'transparent',
            stroke: strokeC,
            strokeWidth: strokeW,
            strokeLineCap: 'round',
            strokeLineJoin: 'round'
          });
        }
        canvas.add(obj);
      });
      if (objects.length === 1) canvas.setActiveObject(objects[0]);
      canvas.requestRenderAll();
      saveHistory();
    });

    currentPenPath.remove();
    currentPenPath = null;
    if (penPaper) penPaper.view.draw();
  }

  function activatePenTool() {
    if (!HAS_PAPER) { showToast('Paper.js 未加载'); return; }
    if (!penPaper) initPenScope();
    if (!penPaper) return;

    if (canvas.isDrawingMode) {
      canvas.isDrawingMode = false;
      btnPen.classList.remove('active');
    }

    // 保存并重置视图，让坐标 1:1 对应
    savedViewportOnPen = canvas.viewportTransform.slice();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
    updateZoomLabel();

    penCanvas.style.display = 'block';
    penCanvas.style.pointerEvents = 'auto';

    positionPenCanvas();
    initPenTool();
    penTool.activate();

    penToolActive = true;
    document.getElementById('btn-pen-bezier').classList.add('active');
    showToast('钢笔模式：单击落点，拖拽调曲线，Enter 结束，Esc 取消');
  }

  function deactivatePenTool() {
    if (!penToolActive) return;

    if (currentPenPath) { currentPenPath.remove(); currentPenPath = null; }
    if (penPaper) penPaper.view.draw();

    if (penCanvas) {
      penCanvas.style.display = 'none';
      penCanvas.style.pointerEvents = 'none';
    }

    if (penTool) { penTool.remove(); penTool = null; }

    penToolActive = false;
    document.getElementById('btn-pen-bezier').classList.remove('active');

    if (savedViewportOnPen) {
      canvas.setViewportTransform(savedViewportOnPen);
      savedViewportOnPen = null;
      updateZoomLabel();
    }
  }

  document.getElementById('btn-pen-bezier').addEventListener('click', function () {
    if (penToolActive) deactivatePenTool();
    else { clearToolActive(); activatePenTool(); }
  });

  // 钢笔键盘：Enter 结束，Esc 取消，Backspace 删点
  window.addEventListener('keydown', function (e) {
    if (!penToolActive) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      finishPenPath();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (currentPenPath) { currentPenPath.remove(); currentPenPath = null; }
      if (penPaper) penPaper.view.draw();
    } else if (e.key === 'Backspace') {
      if (currentPenPath && currentPenPath.segments.length > 1) {
        e.preventDefault();
        currentPenPath.removeSegment(currentPenPath.segments.length - 1);
        penPaper.view.draw();
      }
    }
  });

  // ================== Paper.js 布尔运算 ==================
  var boolPaper = null;

  function getBoolPaper() {
    if (!HAS_PAPER) return null;
    if (!boolPaper) {
      boolPaper = new paper.PaperScope();
      var oc = document.createElement('canvas');
      oc.width = 100; oc.height = 100;
      boolPaper.setup(oc);
    }
    return boolPaper;
  }

  function isFabricPathable(obj) {
    return obj.type === 'path' || obj.type === 'rect' || obj.type === 'circle' ||
           obj.type === 'triangle' || obj.type === 'ellipse' || obj.type === 'polygon';
  }

  function doBooleanOp(op) {
    if (!HAS_PAPER) { showToast('Paper.js 未加载'); return; }
    var active = canvas.getActiveObjects().filter(isFabricPathable);
    if (active.length < 2) { showToast('请选中至少两个路径/图形'); return; }

    var bp = getBoolPaper();
    bp.activate();
    bp.project.clear();

    var paperPaths = [];
    active.forEach(function (shape) {
      try {
        var svgStr = shape.toSVG();
        var item = bp.project.importSVG(svgStr);
        if (!item) return;
        var collect = [];
        function pushIt(n) {
          if (!n) return;
          if (n.className === 'Path' || n.className === 'CompoundPath') collect.push(n);
          else if (n.children) n.children.forEach(pushIt);
        }
        pushIt(item);
        // 仅保留 path 类
        collect.forEach(function (c) {
          if (c.className === 'Path' || c.className === 'CompoundPath') paperPaths.push(c);
        });
      } catch (e) { console.warn('import SVG failed', e); }
    });

    if (paperPaths.length < 2) { showToast('无法解析图形'); return; }

    var result = paperPaths[0];
    try {
      for (var i = 1; i < paperPaths.length; i++) {
        if (op === 'unite') result = result.unite(paperPaths[i]);
        else if (op === 'subtract') result = result.subtract(paperPaths[i]);
        else if (op === 'intersect') result = result.intersect(paperPaths[i]);
        else if (op === 'exclude') result = result.exclude(paperPaths[i]);
      }
    } catch (err) {
      console.error(err);
      showToast('布尔运算失败');
      return;
    }

    var resultSvg;
    try {
      resultSvg = result.exportSVG({ asString: true, precision: 2 });
    } catch (e) {
      showToast('导出结果失败');
      return;
    }

    // 保存位置信息以对齐
    var firstShape = active[0];
    var refCenter = firstShape.getCenterPoint();

    fabric.loadSVGFromString(resultSvg, function (objects, opts) {
      if (!objects || objects.length === 0) { showToast('结果为空'); return; }
      var group = fabric.util.groupSVGElements(objects, opts);
      // 居中到第一个形状的位置
      var gc = group.getCenterPoint();
      group.set({
        left: group.left + (refCenter.x - gc.x),
        top: group.top + (refCenter.y - gc.y)
      });
      group.setCoords();

      active.forEach(function (s) { canvas.remove(s); });
      canvas.add(group);
      canvas.setActiveObject(group);
      saveHistory();
      showToast('布尔运算完成');
    });
  }

  document.querySelectorAll('[data-bool]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      doBooleanOp(this.dataset.bool);
    });
  });

  // ================== Paper.js 路径简化 ==================
  function simplifySelectedPath() {
    if (!HAS_PAPER) { showToast('Paper.js 未加载'); return; }
    var path = canvas.getActiveObject();
    if (!path || path.type !== 'path') { showToast('请选中一条路径'); return; }

    var bp = getBoolPaper();
    bp.activate();
    bp.project.clear();

    try {
      var svgStr = path.toSVG();
      var item = bp.project.importSVG(svgStr);
      var target = null;
      (function find(n) {
        if (!n) return;
        if (!target && n.className === 'Path') target = n;
        else if (n.children) n.children.forEach(find);
      })(item);

      if (!target) { showToast('无法解析路径'); return; }

      target.simplify(2);
      target.smooth({ type: 'catmull-rom', factor: 0.5 });

      var newSvg = target.exportSVG({ asString: true, precision: 2 });

      fabric.loadSVGFromString(newSvg, function (objects, opts) {
        if (!objects || objects.length === 0) return;
        var newPath = objects[0];
        // 保留原样式
        newPath.set({
          stroke: path.stroke,
          strokeWidth: path.strokeWidth,
          fill: path.fill,
          opacity: path.opacity
        });
        // 对齐到原位置
        var oldC = path.getCenterPoint();
        var newC = newPath.getCenterPoint();
        newPath.set({
          left: newPath.left + (oldC.x - newC.x),
          top: newPath.top + (oldC.y - newC.y)
        });
        newPath.setCoords();

        canvas.remove(path);
        canvas.add(newPath);
        canvas.setActiveObject(newPath);
        saveHistory();
        showToast('路径已平滑');
      });
    } catch (err) {
      console.error(err);
      showToast('平滑失败');
    }
  }

  document.getElementById('btn-smooth-path').addEventListener('click', simplifySelectedPath);

  // ================== interact.js：可拖拽浮动视图工具栏 ==================
  function updateZoomLabel() {
    var label = document.getElementById('float-zoom-label');
    if (!label) return;
    label.textContent = Math.round(canvas.getZoom() * 100) + '%';
  }

  function setupFloatToolbar() {
    if (!HAS_INTERACT) return;
    var toolbar = document.getElementById('float-tools');
    if (!toolbar) return;

    interact(toolbar).draggable({
      inertia: false,
      modifiers: [
        interact.modifiers.restrictRect({ restriction: 'parent', endOnly: false })
      ],
      listeners: {
        move: function (event) {
          var target = event.target;
          var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
          target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        }
      }
    });
  }
  setTimeout(setupFloatToolbar, 100);

  // 浮动工具栏按钮
  (function () {
    var zin = document.getElementById('float-zoom-in');
    var zout = document.getElementById('float-zoom-out');
    var reset = document.getElementById('float-reset');
    var fit = document.getElementById('float-fit');
    if (zin) zin.addEventListener('click', function () {
      var z = Math.min(20, canvas.getZoom() * 1.2);
      canvas.setZoom(z); updateZoomLabel();
    });
    if (zout) zout.addEventListener('click', function () {
      var z = Math.max(0.1, canvas.getZoom() / 1.2);
      canvas.setZoom(z); updateZoomLabel();
    });
    if (reset) reset.addEventListener('click', function () {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      updateZoomLabel();
    });
    if (fit) fit.addEventListener('click', function () {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      var objs = canvas.getObjects().filter(function (o) { return !o.isBackgroundGrid; });
      if (objs.length === 0) { updateZoomLabel(); return; }
      var bbox = null;
      objs.forEach(function (o) {
        var b = o.getBoundingRect(true);
        if (!bbox) bbox = { l: b.left, t: b.top, r: b.left + b.width, b: b.top + b.height };
        else {
          bbox.l = Math.min(bbox.l, b.left);
          bbox.t = Math.min(bbox.t, b.top);
          bbox.r = Math.max(bbox.r, b.left + b.width);
          bbox.b = Math.max(bbox.b, b.top + b.height);
        }
      });
      var w = bbox.r - bbox.l, h = bbox.b - bbox.t;
      if (w === 0 || h === 0) { updateZoomLabel(); return; }
      var scale = Math.min(canvas.getWidth() / w, canvas.getHeight() / h) * 0.9;
      scale = Math.max(0.1, Math.min(20, scale));
      var cx = (bbox.l + bbox.r) / 2, cy = (bbox.t + bbox.b) / 2;
      var tx = canvas.getWidth() / 2 - cx * scale;
      var ty = canvas.getHeight() / 2 - cy * scale;
      canvas.setViewportTransform([scale, 0, 0, scale, tx, ty]);
      updateZoomLabel();
    });
  })();

  // 钢笔颜色/宽度跟随当前颜色选择（若存在）
  var penColorInput = document.getElementById('pen-color');
  var penWidthInput = document.getElementById('pen-width');
  if (penColorInput) penColorInput.addEventListener('input', function () { penStrokeColor = this.value; });
  if (penWidthInput) penWidthInput.addEventListener('input', function () {
    penStrokeWidth = parseInt(this.value, 10) || 3;
  });

  // ================== 窗口自适应 ==================
  window.addEventListener('resize', function () {
    var newSize = getCanvasSize();
    canvas.setWidth(newSize.width);
    canvas.setHeight(newSize.height);
    canvas.calcOffset();
    if (penToolActive) positionPenCanvas();
  });

})();