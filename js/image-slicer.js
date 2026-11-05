(function () {
  // 统一获取格式和背景填充配置
  function getExportFormat(fileType) {
    var type = fileType || '';
    if (type === 'image/jpeg' || type === 'image/jpg') {
      return { mime: 'image/jpeg', ext: 'jpg', fillWhite: true };
    }
    if (type === 'image/webp') {
      return { mime: 'image/webp', ext: 'webp', fillWhite: false };
    }
    // 默认回退到 png，支持透明通道
    return { mime: 'image/png', ext: 'png', fillWhite: false };
  }

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

  // ================= 1. 网格切图 =================
  var sliceInput = document.getElementById('slice-input');
  var sliceDrop = document.getElementById('slice-drop');
  var slicePreview = document.getElementById('slice-preview');
  var btnSlice = document.getElementById('btn-slice');
  var sliceGrid = document.getElementById('slice-grid');
  var sliceImg = null;
  var sliceFileType = '';

  sliceDrop.addEventListener('click', function () { sliceInput.click(); });
  sliceInput.addEventListener('change', function () {
    if (this.files.length > 0) loadSliceImage(this.files[0]);
    this.value = '';
  });

  function loadSliceImage(file) {
    sliceFileType = file.type;
    var reader = new FileReader();
    reader.onload = function(e) {
      sliceImg = new Image();
      sliceImg.onload = function() {
        renderSlicePreview();
      };
      sliceImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  sliceGrid.addEventListener('change', renderSlicePreview);

  function renderSlicePreview() {
    if (!sliceImg) return;
    slicePreview.innerHTML = '';
    
    var layout = sliceGrid.value.split('x');
    var cols = parseInt(layout[0], 10);
    var rows = parseInt(layout[1], 10);
    
    slicePreview.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    
    var w = sliceImg.width / cols;
    var h = sliceImg.height / rows;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var format = getExportFormat(sliceFileType);
    
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
        var img = document.createElement('img');
        img.src = canvas.toDataURL(format.mime, 0.95);
        slicePreview.appendChild(img);
      }
    }
    btnSlice.disabled = false;
  }

  btnSlice.addEventListener('click', async function () {
    if (!sliceImg) return;
    btnSlice.textContent = '⏳ 正在打包...';
    btnSlice.disabled = true;

    var layout = sliceGrid.value.split('x');
    var cols = parseInt(layout[0], 10);
    var rows = parseInt(layout[1], 10);
    
    var w = sliceImg.width / cols;
    var h = sliceImg.height / rows;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var zip = new JSZip();
    var promises = [];
    var format = getExportFormat(sliceFileType);

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
        
        var promise = new Promise(function(resolve) {
          canvas.toBlob(function(blob) {
            resolve({ name: 'slice_' + (r+1) + '_' + (c+1) + '.' + format.ext, blob: blob });
          }, format.mime, 0.95);
        });
        promises.push(promise);
      }
    }

    var results = await Promise.all(promises);
    results.forEach(function (item) {
      zip.file(item.name, item.blob);
    });

    zip.generateAsync({ type: 'blob' }).then(function (content) {
      downloadBlob(content, 'sliced_images.zip');
      btnSlice.textContent = '✂️ 开始切图并打包下载';
      btnSlice.disabled = false;
    });
  });

  // ================= 2. 长图拼接 =================
  var longInput = document.getElementById('long-input');
  var longDrop = document.getElementById('long-drop');
  var longList = document.getElementById('long-list');
  var btnLong = document.getElementById('btn-long');
  var btnLongClear = document.getElementById('btn-long-clear');
  var longCanvas = document.getElementById('long-canvas');
  var longDirection = document.getElementById('long-direction');
  var longImages = [];

  longDrop.addEventListener('click', function () { longInput.click(); });
  longInput.addEventListener('change', function () {
    if (this.files.length > 0) handleLongFiles(Array.prototype.slice.call(this.files));
    this.value = '';
  });

  function handleLongFiles(files) {
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          longImages.push({ img: img, fileType: file.type });
          renderLongList();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderLongList() {
    longList.innerHTML = '';
    longImages.forEach(function(item, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>图片 ' + (i+1) + ' (' + item.img.width + 'x' + item.img.height + ')</span>';
      longList.appendChild(li);
    });
    btnLong.disabled = longImages.length === 0;
  }

  btnLongClear.addEventListener('click', function () {
    longImages = [];
    renderLongList();
    longCanvas.style.display = 'none';
  });

  btnLong.addEventListener('click', function () {
    if (longImages.length === 0) return;
    longCanvas.style.display = 'block';
    var isVertical = longDirection.value === 'vertical';
    var ctx = longCanvas.getContext('2d');

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

    var format = getExportFormat(longImages[0].fileType);

    if (isVertical) {
      longCanvas.width = maxW; longCanvas.height = totalH;
      if (format.fillWhite) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, maxW, totalH); }
      var currentY = 0;
      longImages.forEach(function(item) {
        ctx.drawImage(item.img, 0, currentY, item.img.width, item.img.height);
        currentY += item.img.height;
      });
    } else {
      longCanvas.width = totalW; longCanvas.height = maxH;
      if (format.fillWhite) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, totalW, maxH); }
      var currentX = 0;
      longImages.forEach(function(item) {
        ctx.drawImage(item.img, currentX, 0, item.img.width, item.img.height);
        currentX += item.img.width;
      });
    }

    longCanvas.toBlob(function(blob) {
      downloadBlob(blob, 'combined_long_image.' + format.ext);
    }, format.mime, 0.95);
  });

  // ================= 3. 网格拼图 =================
  var gridInput = document.getElementById('grid-input');
  var gridDrop = document.getElementById('grid-drop');
  var gridList = document.getElementById('grid-list');
  var btnGrid = document.getElementById('btn-grid');
  var gridLayout = document.getElementById('grid-layout');
  var gridGapInput = document.getElementById('grid-gap');
  var gridImages = [];

  gridDrop.addEventListener('click', function () { gridInput.click(); });
  gridInput.addEventListener('change', function () {
    if (this.files.length > 0) handleGridFiles(Array.prototype.slice.call(this.files));
    this.value = '';
  });

  function handleGridFiles(files) {
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          gridImages.push({ img: img, fileType: file.type });
          renderGridList();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderGridList() {
    gridList.innerHTML = '';
    gridImages.forEach(function(item, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>图片 ' + (i+1) + ' (' + item.img.width + 'x' + item.img.height + ')</span>';
      gridList.appendChild(li);
    });
    btnGrid.disabled = gridImages.length === 0;
  }

  btnGrid.addEventListener('click', function () {
    if (gridImages.length === 0) return;
    var layout = gridLayout.value.split('x');
    var rows = parseInt(layout[0], 10);
    var cols = parseInt(layout[1], 10);
    var gap = parseInt(gridGapInput.value, 10) || 0;

    var cellSize = 500;
    var totalW = cols * cellSize + (cols - 1) * gap;
    var totalH = rows * cellSize + (rows - 1) * gap;

    var canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    var ctx = canvas.getContext('2d');

    var format = getExportFormat(gridImages[0].fileType);
    if (format.fillWhite) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalW, totalH);
    }

    for (var i = 0; i < Math.min(gridImages.length, cols * rows); i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      var x = c * (cellSize + gap);
      var y = r * (cellSize + gap);

      var img = gridImages[i].img;
      var scale = Math.max(cellSize / img.width, cellSize / img.height);
      var w = img.width * scale;
      var h = img.height * scale;
      var dx = x + (cellSize - w) / 2;
      var dy = y + (cellSize - h) / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellSize, cellSize);
      ctx.clip();
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
    }

    canvas.toBlob(function(blob) {
      downloadBlob(blob, 'grid_image.' + format.ext);
    }, format.mime, 0.95);
  });

  // ================= 通用工具 =================
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();