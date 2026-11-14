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

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  function getExportFormat() {
    var format = document.getElementById('global-format').value;
    var quality = parseInt(document.getElementById('global-quality').value, 10) / 100;
    var ext = 'png';
    var fillWhite = false;
    if (format === 'image/jpeg') { ext = 'jpg'; fillWhite = true; }
    if (format === 'image/webp') { ext = 'webp'; }
    return { mime: format, ext: ext, fillWhite: fillWhite, quality: quality };
  }

  // 监听全局设置
  document.getElementById('global-quality').addEventListener('input', function() {
    document.getElementById('global-quality-val').textContent = this.value + '%';
  });

  // Tabs 切换
  var tabs = document.querySelectorAll('.is-tab');
  var panels = document.querySelectorAll('.is-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // 全局拖拽与粘贴配置
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  function setupDropZone(zoneEl, inputEl, callback) {
    zoneEl.addEventListener('click', function () { inputEl.click(); });
    inputEl.addEventListener('change', function () {
      if (this.files.length > 0) callback(Array.prototype.slice.call(this.files));
      this.value = '';
    });
    zoneEl.addEventListener('dragenter', function () { zoneEl.classList.add('dragover'); });
    zoneEl.addEventListener('dragover', function () { zoneEl.classList.add('dragover'); });
    zoneEl.addEventListener('dragleave', function () { zoneEl.classList.remove('dragover'); });
    zoneEl.addEventListener('drop', function (e) {
      zoneEl.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        callback(Array.prototype.slice.call(e.dataTransfer.files));
      }
    });
  }

  function readFileAsImage(file, callback) {
    if (!file.type || file.type.indexOf('image/') !== 0) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () { callback(img, file); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 粘贴图片逻辑分发
  document.addEventListener('paste', function (e) {
    if (!e.clipboardData || !e.clipboardData.items) return;
    var activeTab = document.querySelector('.is-tab.active').dataset.target;
    var files = [];
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        var file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length === 0) return;
    e.preventDefault();

    if (activeTab === 'panel-slice') {
      readFileAsImage(files[0], function(img, file) { setSliceImage(img, file); });
    } else if (activeTab === 'panel-long') {
      files.forEach(function(f) { readFileAsImage(f, function(img, file) { addLongImage(img, file); }); });
    } else if (activeTab === 'panel-grid') {
      files.forEach(function(f) { readFileAsImage(f, function(img, file) { addGridImage(img, file); }); });
    }
  });


  // ================= 模块 1：网格切图 =================
  var sliceInput = document.getElementById('slice-input');
  var sliceDrop = document.getElementById('slice-drop');
  var slicePreview = document.getElementById('slice-preview');
  var btnSlice = document.getElementById('btn-slice');
  var sliceRows = document.getElementById('slice-rows');
  var sliceCols = document.getElementById('slice-cols');
  var sliceImg = null;
  var sliceFile = null;

  setupDropZone(sliceDrop, sliceInput, function(files) {
    readFileAsImage(files[0], function(img, file) { setSliceImage(img, file); });
  });

  function setSliceImage(img, file) {
    sliceImg = img;
    sliceFile = file;
    btnSlice.disabled = false;
    renderSlicePreview();
    showToast('图片加载成功');
  }

  sliceRows.addEventListener('input', renderSlicePreview);
  sliceCols.addEventListener('input', renderSlicePreview);

  function renderSlicePreview() {
    if (!sliceImg) return;
    slicePreview.innerHTML = '';
    
    var rows = parseInt(sliceRows.value, 10) || 1;
    var cols = parseInt(sliceCols.value, 10) || 1;
    if (rows < 1) rows = 1;
    if (cols < 1) cols = 1;
    if (rows > 20) rows = 20;
    if (cols > 20) cols = 20;
    
    slicePreview.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    
    var w = sliceImg.width / cols;
    var h = sliceImg.height / rows;
    
    // 预览使用较小的 canvas 防止卡顿
    var previewMaxSize = 200;
    var scale = Math.min(1, previewMaxSize / Math.max(w, h));
    var pw = w * scale;
    var ph = h * scale;

    var canvas = document.createElement('canvas');
    canvas.width = pw;
    canvas.height = ph;
    var ctx = canvas.getContext('2d');
    var format = getExportFormat();
    
    for(var r=0; r<rows; r++){
      for(var c=0; c<cols; c++){
        ctx.clearRect(0,0,pw,ph);
        if (format.fillWhite) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pw, ph);
        }
        ctx.drawImage(sliceImg, c*w, r*h, w, h, 0, 0, pw, ph);
        var imgDom = document.createElement('img');
        imgDom.src = canvas.toDataURL('image/jpeg', 0.5); // 预览用低清 JPG 足够
        slicePreview.appendChild(imgDom);
      }
    }
  }

  btnSlice.addEventListener('click', async function () {
    if (!sliceImg) return;
    btnSlice.textContent = '⏳ 正在打包...';
    btnSlice.disabled = true;

    var rows = parseInt(sliceRows.value, 10) || 1;
    var cols = parseInt(sliceCols.value, 10) || 1;
    var w = sliceImg.width / cols;
    var h = sliceImg.height / rows;
    
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var zip = new JSZip();
    var promises = [];
    var format = getExportFormat();
    var prefix = sliceFile ? sliceFile.name.replace(/\.[^/.]+$/, "") : 'slice';

    for(var r=0; r<rows; r++){
      for(var c=0; c<cols; c++){
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0,0,w,h);
        if (format.fillWhite) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(sliceImg, c*w, r*h, w, h, 0, 0, w, h);
        
        // 使用立即执行函数保存 r, c 的值
        (function(row, col) {
          var promise = new Promise(function(resolve) {
            canvas.toBlob(function(blob) {
              resolve({ name: prefix + '_' + (row+1) + '_' + (col+1) + '.' + format.ext, blob: blob });
            }, format.mime, format.quality);
          });
          promises.push(promise);
        })(r, c);
      }
    }

    try {
      var results = await Promise.all(promises);
      results.forEach(function (item) {
        zip.file(item.name, item.blob);
      });

      zip.generateAsync({ type: 'blob' }).then(function (content) {
        downloadBlob(content, prefix + '_sliced.zip');
        showToast('切图打包完成');
        btnSlice.textContent = '✂️ 开始切图并打包下载';
        btnSlice.disabled = false;
      });
    } catch (err) {
      showToast('切图失败');
      btnSlice.textContent = '✂️ 开始切图并打包下载';
      btnSlice.disabled = false;
    }
  });


  // ================= 模块 2：长图拼接 =================
  var longInput = document.getElementById('long-input');
  var longDrop = document.getElementById('long-drop');
  var longList = document.getElementById('long-list');
  var btnLong = document.getElementById('btn-long');
  var btnLongClear = document.getElementById('btn-long-clear');
  var longCanvas = document.getElementById('long-canvas');
  var longEmpty = document.getElementById('long-empty');
  var longDirection = document.getElementById('long-direction');
  var longAlign = document.getElementById('long-align');
  var longGap = document.getElementById('long-gap');
  var longBg = document.getElementById('long-bg');
  
  var longImages = [];

  setupDropZone(longDrop, longInput, function(files) {
    files.forEach(function(f) { readFileAsImage(f, function(img, file) { addLongImage(img, file); }); });
  });

  function addLongImage(img, file) {
    longImages.push({ img: img, file: file });
    renderLongList();
    updateLongPreview();
  }

  function renderLongList() {
    longList.innerHTML = '';
    longImages.forEach(function(item, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>图片 ' + (i+1) + ' (' + item.img.width + '×' + item.img.height + ')</span>' +
        '<div class="ops">' +
          '<button class="op-btn up" data-i="' + i + '">↑</button>' +
          '<button class="op-btn down" data-i="' + i + '">↓</button>' +
          '<button class="op-btn del" data-i="' + i + '">×</button>' +
        '</div>';
      longList.appendChild(li);
    });
    btnLong.disabled = longImages.length === 0;
    
    // 绑定列表操作事件
    longList.querySelectorAll('.op-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var i = parseInt(this.dataset.i, 10);
        if (this.classList.contains('up') && i > 0) {
          var temp = longImages[i];
          longImages[i] = longImages[i-1];
          longImages[i-1] = temp;
        } else if (this.classList.contains('down') && i < longImages.length - 1) {
          var temp = longImages[i];
          longImages[i] = longImages[i+1];
          longImages[i+1] = temp;
        } else if (this.classList.contains('del')) {
          longImages.splice(i, 1);
        }
        renderLongList();
        updateLongPreview();
      });
    });
  }

  btnLongClear.addEventListener('click', function () {
    longImages = [];
    renderLongList();
    updateLongPreview();
  });

  [longDirection, longAlign, longGap, longBg].forEach(function(el) {
    el.addEventListener('input', updateLongPreview);
    el.addEventListener('change', updateLongPreview);
  });

  function updateLongPreview() {
    if (longImages.length === 0) {
      longCanvas.style.display = 'none';
      longEmpty.style.display = 'block';
      return;
    }
    longCanvas.style.display = 'block';
    longEmpty.style.display = 'none';

    var isVertical = longDirection.value === 'vertical';
    var gap = parseInt(longGap.value, 10) || 0;
    var align = longAlign.value;
    var bgColor = longBg.value;

    // 计算原始总大小
    var totalW = 0, totalH = 0, maxW = 0, maxH = 0;
    longImages.forEach(function(item) {
      if (isVertical) {
        totalH += item.img.height;
        if (item.img.width > maxW) maxW = item.img.width;
      } else {
        totalW += item.img.width;
        if (item.img.height > maxH) maxH = item.img.height;
      }
    });
    if (isVertical) totalH += (longImages.length - 1) * gap;
    else totalW += (longImages.length - 1) * gap;

    var finalW = isVertical ? maxW : totalW;
    var finalH = isVertical ? totalH : maxH;

    // 限制预览 Canvas 尺寸
    var maxPreview = 800;
    var scale = Math.min(1, maxPreview / Math.max(finalW, finalH));
    var previewW = Math.round(finalW * scale);
    var previewH = Math.round(finalH * scale);

    longCanvas.width = previewW;
    longCanvas.height = previewH;
    var ctx = longCanvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, previewW, previewH);

    var currentPos = 0;
    longImages.forEach(function(item) {
      var iw = item.img.width * scale;
      var ih = item.img.height * scale;
      
      var x = 0, y = 0;
      if (isVertical) {
        if (align === 'center') x = (previewW - iw) / 2;
        else if (align === 'right') x = previewW - iw;
        y = currentPos;
        currentPos += ih + (gap * scale);
      } else {
        if (align === 'center') y = (previewH - ih) / 2;
        else if (align === 'right') y = previewH - ih; // 底部对齐
        x = currentPos;
        currentPos += iw + (gap * scale);
      }
      
      ctx.drawImage(item.img, x, y, iw, ih);
    });
  }

  btnLong.addEventListener('click', function () {
    if (longImages.length === 0) return;
    showToast('正在拼接原图...');
    
    var isVertical = longDirection.value === 'vertical';
    var gap = parseInt(longGap.value, 10) || 0;
    var align = longAlign.value;
    var bgColor = longBg.value;
    var format = getExportFormat();

    // 使用原图尺寸绘制
    var totalW = 0, totalH = 0, maxW = 0, maxH = 0;
    longImages.forEach(function(item) {
      if (isVertical) {
        totalH += item.img.height;
        if (item.img.width > maxW) maxW = item.img.width;
      } else {
        totalW += item.img.width;
        if (item.img.height > maxH) maxH = item.img.height;
      }
    });
    if (isVertical) totalH += (longImages.length - 1) * gap;
    else totalW += (longImages.length - 1) * gap;

    var canvas = document.createElement('canvas');
    canvas.width = isVertical ? maxW : totalW;
    canvas.height = isVertical ? totalH : maxH;
    var ctx = canvas.getContext('2d');

    if (format.fillWhite || bgColor !== '#ffffff' || bgColor !== '#000000') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (format.fillWhite) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    var currentPos = 0;
    longImages.forEach(function(item) {
      var x = 0, y = 0;
      if (isVertical) {
        if (align === 'center') x = (canvas.width - item.img.width) / 2;
        else if (align === 'right') x = canvas.width - item.img.width;
        y = currentPos;
        currentPos += item.img.height + gap;
      } else {
        if (align === 'center') y = (canvas.height - item.img.height) / 2;
        else if (align === 'right') y = canvas.height - item.img.height;
        x = currentPos;
        currentPos += item.img.width + gap;
      }
      ctx.drawImage(item.img, x, y);
    });

    canvas.toBlob(function(blob) {
      downloadBlob(blob, 'combined_' + Date.now() + '.' + format.ext);
      showToast('拼接完成');
    }, format.mime, format.quality);
  });


  // ================= 模块 3：网格拼图 =================
  var gridInput = document.getElementById('grid-input');
  var gridDrop = document.getElementById('grid-drop');
  var gridList = document.getElementById('grid-list');
  var btnGrid = document.getElementById('btn-grid');
  var btnGridClear = document.getElementById('btn-grid-clear');
  var gridCanvas = document.getElementById('grid-canvas');
  var gridEmpty = document.getElementById('grid-empty');
  var gridCols = document.getElementById('grid-cols');
  var gridGap = document.getElementById('grid-gap');
  var gridRadius = document.getElementById('grid-radius');
  var gridBg = document.getElementById('grid-bg');
  
  var gridImages = [];

  setupDropZone(gridDrop, gridInput, function(files) {
    files.forEach(function(f) { readFileAsImage(f, function(img, file) { addGridImage(img, file); }); });
  });

  function addGridImage(img, file) {
    gridImages.push({ img: img, file: file });
    renderGridList();
    updateGridPreview();
  }

  function renderGridList() {
    gridList.innerHTML = '';
    gridImages.forEach(function(item, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>图片 ' + (i+1) + ' (' + item.img.width + '×' + item.img.height + ')</span>' +
        '<div class="ops">' +
          '<button class="op-btn up" data-i="' + i + '">↑</button>' +
          '<button class="op-btn down" data-i="' + i + '">↓</button>' +
          '<button class="op-btn del" data-i="' + i + '">×</button>' +
        '</div>';
      gridList.appendChild(li);
    });
    btnGrid.disabled = gridImages.length === 0;

    // 绑定列表操作事件
    gridList.querySelectorAll('.op-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var i = parseInt(this.dataset.i, 10);
        if (this.classList.contains('up') && i > 0) {
          var temp = gridImages[i];
          gridImages[i] = gridImages[i-1];
          gridImages[i-1] = temp;
        } else if (this.classList.contains('down') && i < gridImages.length - 1) {
          var temp = gridImages[i];
          gridImages[i] = gridImages[i+1];
          gridImages[i+1] = temp;
        } else if (this.classList.contains('del')) {
          gridImages.splice(i, 1);
        }
        renderGridList();
        updateGridPreview();
      });
    });
  }

  btnGridClear.addEventListener('click', function () {
    gridImages = [];
    renderGridList();
    updateGridPreview();
  });

  [gridCols, gridGap, gridRadius, gridBg].forEach(function(el) {
    el.addEventListener('input', updateGridPreview);
    el.addEventListener('change', updateGridPreview);
  });

  function drawRoundRect(ctx, x, y, w, h, r) {
    if (r <= 0) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function updateGridPreview() {
    if (gridImages.length === 0) {
      gridCanvas.style.display = 'none';
      gridEmpty.style.display = 'block';
      return;
    }
    gridCanvas.style.display = 'block';
    gridEmpty.style.display = 'none';

    var cols = parseInt(gridCols.value, 10) || 1;
    if (cols < 1) cols = 1;
    var rows = Math.ceil(gridImages.length / cols);
    var gap = parseInt(gridGap.value, 10) || 0;
    var radius = parseInt(gridRadius.value, 10) || 0;
    var bgColor = gridBg.value;

    // 计算固定格子大小：取所有图片中最大的宽/高作为格子基准
    var maxDim = 0;
    gridImages.forEach(function(item) {
      var m = Math.max(item.img.width, item.img.height);
      if (m > maxDim) maxDim = m;
    });
    // 如果只有一张图，格子就用它本身大小
    if (gridImages.length === 1) maxDim = Math.max(gridImages[0].img.width, gridImages[0].img.height);
    
    // 限制预览的总大小
    var totalW = cols * maxDim + (cols - 1) * gap;
    var totalH = rows * maxDim + (rows - 1) * gap;
    
    var maxPreview = 800;
    var scale = Math.min(1, maxPreview / Math.max(totalW, totalH));
    
    var previewW = Math.round(totalW * scale);
    var previewH = Math.round(totalH * scale);
    
    gridCanvas.width = previewW;
    gridCanvas.height = previewH;
    var ctx = gridCanvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, previewW, previewH);

    var cellSize = maxDim * scale;
    var gapS = gap * scale;
    var radiusS = radius * scale;

    for (var i = 0; i < gridImages.length; i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      var x = c * (cellSize + gapS);
      var y = r * (cellSize + gapS);

      var img = gridImages[i].img;
      // 铺满（类似 object-fit: cover）
      var imgScale = Math.max(cellSize / img.width, cellSize / img.height);
      var w = img.width * imgScale;
      var h = img.height * imgScale;
      var dx = x + (cellSize - w) / 2;
      var dy = y + (cellSize - h) / 2;
      
      ctx.save();
      drawRoundRect(ctx, x, y, cellSize, cellSize, radiusS);
      ctx.clip();
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
    }
  }

  btnGrid.addEventListener('click', function () {
    if (gridImages.length === 0) return;
    showToast('正在拼图...');

    var cols = parseInt(gridCols.value, 10) || 1;
    if (cols < 1) cols = 1;
    var rows = Math.ceil(gridImages.length / cols);
    var gap = parseInt(gridGap.value, 10) || 0;
    var radius = parseInt(gridRadius.value, 10) || 0;
    var bgColor = gridBg.value;
    var format = getExportFormat();

    // 原图尺寸计算
    var maxDim = 0;
    gridImages.forEach(function(item) {
      var m = Math.max(item.img.width, item.img.height);
      if (m > maxDim) maxDim = m;
    });
    if (gridImages.length === 1) maxDim = Math.max(gridImages[0].img.width, gridImages[0].img.height);

    var totalW = cols * maxDim + (cols - 1) * gap;
    var totalH = rows * maxDim + (rows - 1) * gap;

    var canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    var cellSize = maxDim;
    
    for (var i = 0; i < gridImages.length; i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      var x = c * (cellSize + gap);
      var y = r * (cellSize + gap);

      var img = gridImages[i].img;
      var imgScale = Math.max(cellSize / img.width, cellSize / img.height);
      var w = img.width * imgScale;
      var h = img.height * imgScale;
      var dx = x + (cellSize - w) / 2;
      var dy = y + (cellSize - h) / 2;
      
      ctx.save();
      drawRoundRect(ctx, x, y, cellSize, cellSize, radius);
      ctx.clip();
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
    }

    canvas.toBlob(function(blob) {
      downloadBlob(blob, 'collage_' + Date.now() + '.' + format.ext);
      showToast('拼图完成');
    }, format.mime, format.quality);
  });

})();