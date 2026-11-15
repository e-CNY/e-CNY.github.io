(function () {
  'use strict';

  // ================== 1. 通用工具 ==================
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
    return {
      width: wrap.clientWidth - 32,
      height: wrap.clientHeight - 32
    };
  }

  var size = getCanvasSize();
  var canvas = new fabric.Canvas('c', {
    width: size.width,
    height: size.height,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true
  });

  // ================== 2. 状态与历史记录 ==================
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
    canvas.loadFromJSON(json, function() {
      canvas.renderAll();
      isHistoryProcessing = false;
      updateUndoRedoBtns();
      
      // 重新找回网格对象，确保它在底层
      var grid = canvas.getObjects().find(function(o) { return o.isBackgroundGrid; });
      if (grid) {
        canvas.sendToBack(grid);
        gridRect = grid; // 恢复对网格对象的引用
      }
    });
  }

  saveHistory();

  canvas.on('object:modified', saveHistory);
  canvas.on('object:added', function(e) {
    if (e.target && !e.target.isBackgroundGrid) saveHistory();
  });
  canvas.on('object:removed', function(e) {
    if (e.target && !e.target.isBackgroundGrid) saveHistory();
  });

  document.getElementById('btn-undo').addEventListener('click', function() {
    if (historyIndex > 0) {
      historyIndex--;
      loadHistory(historyStack[historyIndex]);
    }
  });

  document.getElementById('btn-redo').addEventListener('click', function() {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      loadHistory(historyStack[historyIndex]);
    }
  });

  // ================== 3. 绘图工具 ==================
  var btnPen = document.getElementById('btn-pen');
  canvas.freeDrawingBrush.color = '#3d3226';
  canvas.freeDrawingBrush.width = 3;

  function clearToolActive() {
    document.querySelectorAll('.vb-toolbar .vb-btn').forEach(function(b) {
      if (b.id !== 'btn-export' && b.id !== 'btn-fullscreen' && b.id !== 'btn-grid') b.classList.remove('active');
    });
    canvas.isDrawingMode = false;
  }

  btnPen.addEventListener('click', function () {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    this.classList.toggle('active', canvas.isDrawingMode);
    if (canvas.isDrawingMode) canvas.discardActiveObject();
  });

  canvas.on('path:created', function() {
    saveHistory();
  });

  document.getElementById('btn-rect').addEventListener('click', function () {
    clearToolActive();
    var rect = new fabric.Rect({ left: 100, top: 100, fill: '#7ba05b', width: 120, height: 80, rx: 8, ry: 8 });
    canvas.add(rect); canvas.setActiveObject(rect);
  });

  document.getElementById('btn-circle').addEventListener('click', function () {
    clearToolActive();
    var circle = new fabric.Circle({ left: 150, top: 150, fill: '#4a90e2', radius: 60 });
    canvas.add(circle); canvas.setActiveObject(circle);
  });

  document.getElementById('btn-triangle').addEventListener('click', function () {
    clearToolActive();
    var tri = new fabric.Triangle({ left: 200, top: 200, fill: '#c99a4b', width: 100, height: 100 });
    canvas.add(tri); canvas.setActiveObject(tri);
  });

  document.getElementById('btn-line').addEventListener('click', function () {
    clearToolActive();
    var line = new fabric.Line([50, 50, 250, 250], { stroke: '#a8452a', strokeWidth: 4 });
    canvas.add(line); canvas.setActiveObject(line);
  });

  document.getElementById('btn-text').addEventListener('click', function () {
    clearToolActive();
    var text = new fabric.IText('双击编辑文字', { left: 250, top: 250, fontFamily: 'sans-serif', fontSize: 28, fill: '#3d3226' });
    canvas.add(text); canvas.setActiveObject(text);
  });

  // ================== 4. 属性面板逻辑 ==================
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
    if (typeStr === 'i-text') typeStr = '文字';
    else if (typeStr === 'rect') typeStr = '矩形';
    else if (typeStr === 'circle') typeStr = '圆形';
    else if (typeStr === 'triangle') typeStr = '三角形';
    else if (typeStr === 'line') typeStr = '直线';
    else if (typeStr === 'image') typeStr = '图片';
    else if (typeStr === 'path') typeStr = '涂鸦';
    propTitle.textContent = '属性：' + typeStr;

    if (activeObj.fill && typeof activeObj.fill === 'string' && activeObj.fill.startsWith('#')) {
      propFill.value = activeObj.fill;
    }
    
    if (activeObj.stroke) {
      propStroke.value = activeObj.stroke;
      propStrokeWidth.value = activeObj.strokeWidth || 0;
    } else {
      propStrokeWidth.value = 0;
    }

    var opacity = activeObj.opacity !== undefined ? activeObj.opacity : 1;
    propOpacity.value = Math.round(opacity * 100);
    propOpacityVal.textContent = propOpacity.value + '%';

    if (activeObj.type === 'rect') {
      propRadiusGroup.style.display = 'block';
      propRadius.value = activeObj.rx || 0;
    } else {
      propRadiusGroup.style.display = 'none';
    }

    if (activeObj.type === 'i-text' || activeObj.type === 'text') {
      propTextGroup.style.display = 'block';
      propFontSize.value = activeObj.fontSize || 24;
    } else {
      propTextGroup.style.display = 'none';
    }
  }

  canvas.on('selection:created', updateSidebar);
  canvas.on('selection:updated', updateSidebar);
  canvas.on('selection:cleared', function() {
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

  propFill.addEventListener('input', function() {
    applyProp(function(obj) {
      if (obj.type === 'path' || obj.type === 'line') obj.stroke = this.value;
      else obj.set('fill', this.value);
    }.bind(this));
  });

  propFillNone.addEventListener('click', function() {
    applyProp(function(obj) { obj.set('fill', 'transparent'); });
  });

  propStroke.addEventListener('input', function() {
    applyProp(function(obj) { obj.set('stroke', this.value); });
  }.bind(this));

  propStrokeWidth.addEventListener('input', function() {
    var val = parseInt(this.value, 10) || 0;
    applyProp(function(obj) { obj.set('strokeWidth', val); });
  });

  propOpacity.addEventListener('input', function() {
    var val = parseInt(this.value, 10) / 100;
    propOpacityVal.textContent = this.value + '%';
    applyProp(function(obj) { obj.set('opacity', val); });
  });

  propRadius.addEventListener('input', function() {
    var val = parseInt(this.value, 10);
    applyProp(function(obj) { 
      obj.set('rx', val); 
      obj.set('ry', val); 
    });
  });

  propFontSize.addEventListener('input', function() {
    var val = parseInt(this.value, 10);
    applyProp(function(obj) { obj.set('fontSize', val); });
  });

  document.getElementById('btn-layer-up').addEventListener('click', function() {
    var obj = canvas.getActiveObject();
    if (obj) { canvas.bringForward(obj); saveHistory(); }
  });
  document.getElementById('btn-layer-down').addEventListener('click', function() {
    var obj = canvas.getActiveObject();
    if (obj) { canvas.sendBackwards(obj); saveHistory(); }
  });
  document.getElementById('btn-layer-top').addEventListener('click', function() {
    var obj = canvas.getActiveObject();
    if (obj) { canvas.bringToFront(obj); saveHistory(); }
  });
  document.getElementById('btn-layer-bottom').addEventListener('click', function() {
    var obj = canvas.getActiveObject();
    if (obj) { 
      canvas.sendToBack(obj); 
      var grid = canvas.getObjects().find(function(o) { return o.isBackgroundGrid; });
      if (grid) canvas.sendToBack(grid);
      saveHistory(); 
    }
  });

  // ================== 5. 拖拽与粘贴上传 ==================
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

  wrap.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); });
  wrap.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageAdd(e.dataTransfer.files[0]);
    }
  });

  window.addEventListener('paste', function(e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.clipboardData && e.clipboardData.items) {
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        var item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          var blob = item.getAsFile();
          handleImageAdd(blob);
          return;
        }
      }
    }
  });

  // ================== 6. 无限网格背景 ==================
  var isGridVisible = false;
  var gridRect = null;
  var gridSize = 20;
  
  function createGrid() {
    // 原生离屏 Canvas 绘制一个小网格单元
    var offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = gridSize;
    offscreenCanvas.height = gridSize;
    var ctx = offscreenCanvas.getContext('2d');
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gridSize, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, gridSize);
    ctx.stroke();

    // 将 Canvas 作为 Fabric Pattern 的 source
    var gridPattern = new fabric.Pattern({ source: offscreenCanvas, repeat: 'repeat' });
    
    // 创建一个足够大的矩形来铺满平移和缩放的范围
    gridRect = new fabric.Rect({
      left: -10000,
      top: -10000,
      width: 20000,
      height: 20000,
      fill: gridPattern,
      selectable: false,
      evented: false,
      isBackgroundGrid: true,
      excludeFromExport: true // 默认导出时隐藏
    });
    
    canvas.add(gridRect);
    canvas.sendToBack(gridRect);
    canvas.renderAll();
  }

  document.getElementById('btn-grid').addEventListener('click', function() {
    isGridVisible = !isGridVisible;
    this.classList.toggle('active', isGridVisible);

    if (isGridVisible) {
      if (!gridRect) {
        createGrid();
      } else {
        canvas.add(gridRect);
        canvas.sendToBack(gridRect);
        canvas.renderAll();
      }
    } else {
      if (gridRect) {
        canvas.remove(gridRect);
        canvas.renderAll();
      }
    }
  });

  // ================== 7. 全屏与缩放平移 ==================
  document.getElementById('btn-fullscreen').addEventListener('click', function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function(err) {
        alert('无法进入全屏: ' + err.message);
      });
    } else {
      document.exitFullscreen();
    }
  });

  canvas.on('mouse:wheel', function(opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  var isDragging = false;
  var lastPosX, lastPosY;
  var isSpacePressed = false;
  var wasDrawingMode = false; // 记录按下空格前的涂鸦状态

  window.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
      // 防止焦点在按钮或输入框上时触发空格默认行为（点击/滚动）
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
      if (!isSpacePressed) {
        isSpacePressed = true;
        canvas.defaultCursor = 'grab';
        // 如果当前是涂鸦模式，临时关闭
        if (canvas.isDrawingMode) {
          canvas.isDrawingMode = false;
          wasDrawingMode = true;
        }
      }
    }
  });

  window.addEventListener('keyup', function(e) {
    if (e.code === 'Space') {
      isSpacePressed = false;
      canvas.defaultCursor = 'default';
      // 恢复涂鸦模式
      if (wasDrawingMode) {
        canvas.isDrawingMode = true;
        wasDrawingMode = false;
      }
    }
  });

  canvas.on('mouse:down', function(opt) {
    if (isSpacePressed || opt.e.altKey) {
      isDragging = true;
      canvas.selection = false;
      canvas.defaultCursor = 'grabbing';
      var e = opt.e;
      lastPosX = e.clientX;
      lastPosY = e.clientY;
      opt.e.preventDefault();
      opt.e.stopPropagation();
    }
  });

  canvas.on('mouse:move', function(opt) {
    if (isDragging) {
      var e = opt.e;
      var vpt = canvas.viewportTransform;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      canvas.requestRenderAll();
      lastPosX = e.clientX;
      lastPosY = e.clientY;
      opt.e.preventDefault();
      opt.e.stopPropagation();
    }
  });

  canvas.on('mouse:up', function() {
    if (isDragging) {
      isDragging = false;
      canvas.selection = true;
      canvas.defaultCursor = isSpacePressed ? 'grab' : 'default';
    }
  });

  // ================== 8. 删除与导出 ==================
  document.getElementById('btn-delete').addEventListener('click', function () {
    var activeObjs = canvas.getActiveObjects();
    if (activeObjs.length) {
      canvas.discardActiveObject();
      activeObjs.forEach(function (obj) { 
        if (!obj.isBackgroundGrid) canvas.remove(obj); 
      });
      saveHistory();
    }
  });

  var clipboard = null;
  window.addEventListener('keydown', function (e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      document.getElementById('btn-delete').click();
    }
    
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') {
        var activeObj = canvas.getActiveObject();
        if (activeObj && !activeObj.isBackgroundGrid) {
          activeObj.clone(function(cloned) { clipboard = cloned; });
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (clipboard) {
          clipboard.clone(function(clonedObj) {
            canvas.discardActiveObject();
            clonedObj.set({
              left: clonedObj.left + 20,
              top: clonedObj.top + 20,
              evented: true,
            });
            if (clonedObj.type === 'activeSelection') {
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

  // 导出弹窗逻辑
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
    var ext = format === 'image/jpeg' ? 'jpg' : 'png';
    
    exportModal.style.display = 'none';
    
    if (gridRect) {
      gridRect.excludeFromExport = !includeGrid;
    }
    
    // 显式指定导出区域为当前画布视口大小，避免被无限大的网格撑爆
    var dataURL = canvas.toDataURL({ 
      format: format, 
      multiplier: multiplier, 
      quality: 0.95,
      left: 0,
      top: 0,
      width: canvas.width,
      height: canvas.height
    });
    
    if (gridRect) {
      gridRect.excludeFromExport = true; // 恢复默认隐藏状态
    }

    var a = document.createElement('a');
    a.href = dataURL;
    a.download = 'vector_board_' + Date.now() + '.' + ext;
    a.click();
    showToast('画布已导出');
  });

  // ================== 9. 窗口自适应 ==================
  window.addEventListener('resize', function () {
    var newSize = getCanvasSize();
    canvas.setWidth(newSize.width);
    canvas.setHeight(newSize.height);
    canvas.calcOffset();
  });

})();