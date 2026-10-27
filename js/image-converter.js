(function () {
  var files = [];
  
  var dropZone = document.getElementById('ic-drop-zone');
  var fileInput = document.getElementById('ic-input');
  var fileListEl = document.getElementById('ic-file-list');
  var clearBtn = document.getElementById('ic-btn-clear');
  
  var formatSelect = document.getElementById('ic-format');
  var qualityInput = document.getElementById('ic-quality');
  var qualityVal = document.getElementById('ic-quality-val');
  var resizeModeSelect = document.getElementById('ic-resize-mode');
  var percentRow = document.getElementById('resize-percent-row');
  var pixelsRow = document.getElementById('resize-pixels-row');
  var scaleInput = document.getElementById('ic-scale');
  var scaleVal = document.getElementById('ic-scale-val');
  var maxWidthInput = document.getElementById('ic-max-width');
  var maxHeightInput = document.getElementById('ic-max-height');
  var processBtn = document.getElementById('ic-btn-process');
  var resultArea = document.getElementById('ic-result-area');

  // ================= 事件绑定 =================
  dropZone.addEventListener('click', function () { fileInput.click(); });
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFiles(Array.prototype.slice.call(e.dataTransfer.files));
  });
  
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFiles(Array.prototype.slice.call(fileInput.files));
    fileInput.value = '';
  });

  resizeModeSelect.addEventListener('change', function () {
    percentRow.style.display = this.value === 'percent' ? 'block' : 'none';
    pixelsRow.style.display = this.value === 'pixels' ? 'block' : 'none';
  });
  
  qualityInput.addEventListener('input', function () {
    qualityVal.textContent = this.value + '%';
  });
  
  scaleInput.addEventListener('input', function () {
    scaleVal.textContent = this.value + '%';
  });

  clearBtn.addEventListener('click', function() {
    files = [];
    renderFileList();
    resultArea.innerHTML = '<p class="ic-placeholder">上传图片并设置参数后点击开始转换</p>';
  });

  // ================= 文件处理 =================
  function handleFiles(newFiles) {
    var validFiles = newFiles.filter(function (f) {
      var isImg = f.type.match('image.*');
      var isHeic = /\.(heic|heif)$/i.test(f.name);
      var isTiff = /\.(tiff|tif)$/i.test(f.name);
      return isImg || isHeic || isTiff;
    });
    
    if (validFiles.length === 0) return alert('请选择图片文件。');
    
    validFiles.forEach(function (f) {
      if (f.size > 50 * 1024 * 1024) {
        alert('文件 "' + f.name + '" 超过 50MB，已跳过。');
        return;
      }
      files.push(f);
    });
    renderFileList();
  }

  function renderFileList() {
    fileListEl.innerHTML = '';
    files.forEach(function (f) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + escapeHtml(f.name) + '</span><span class="size">' + formatSize(f.size) + '</span>';
      fileListEl.appendChild(li);
    });
    processBtn.disabled = files.length === 0;
    clearBtn.style.display = files.length > 0 ? 'block' : 'none';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ================= 核心转换逻辑 =================
  processBtn.addEventListener('click', async function () {
    if (files.length === 0) return;
    processBtn.disabled = true;
    processBtn.textContent = '⏳ 处理中…';
    resultArea.innerHTML = '<p class="ic-placeholder">正在努力转换，请稍候…</p>';

    var targetFormat = formatSelect.value;
    var quality = parseInt(qualityInput.value, 10) / 100;
    var resizeMode = resizeModeSelect.value;
    var scale = parseInt(scaleInput.value, 10) / 100;
    var maxW = parseInt(maxWidthInput.value, 10) || 0;
    var maxH = parseInt(maxHeightInput.value, 10) || 0;

    if (targetFormat === 'image/avif') {
      var testCanvas = document.createElement('canvas');
      testCanvas.toBlob(function(blob) {
        if (!blob) alert('当前浏览器不支持导出 AVIF 格式，建议使用新版 Chrome 或 Edge。将回退为 WebP。');
      }, 'image/avif');
    }

    resultArea.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'ic-result-grid';
    resultArea.appendChild(grid);

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      try {
        var resultBlob = await convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH);
        
        if (resultBlob) {
          var url = URL.createObjectURL(resultBlob);
          var ext = targetFormat.split('/')[1];
          if (ext === 'jpeg') ext = 'jpg';
          var outName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;

          var card = document.createElement('div');
          card.className = 'ic-card';
          
          var diffPercent = ((resultBlob.size - file.size) / file.size * 100).toFixed(1);
          var diffClass = resultBlob.size > file.size ? 'up' : '';
          var diffText = resultBlob.size > file.size ? '+' + diffPercent + '%' : diffPercent + '%';

          card.innerHTML = 
            '<img class="ic-card-img" src="' + url + '" alt="预览">' +
            '<div class="ic-card-info">' +
              '<div class="name" title="' + escapeHtml(outName) + '">' + escapeHtml(outName) + '</div>' +
              '<div>' + formatSize(file.size) + ' → <span class="size-diff ' + diffClass + '">' + formatSize(resultBlob.size) + ' (' + diffText + ')</span></div>' +
              '<a href="' + url + '" download="' + escapeHtml(outName) + '">⬇️ 下载</a>' +
            '</div>';
          grid.appendChild(card);
        }
      } catch (err) {
        console.error(err);
        var errCard = document.createElement('div');
        errCard.className = 'ic-card';
        errCard.innerHTML = '<div class="ic-card-info" style="color:#a8452a;"><b>' + escapeHtml(file.name) + '</b><br>转换失败: ' + err.message + '</div>';
        grid.appendChild(errCard);
      }
    }

    processBtn.disabled = false;
    processBtn.textContent = '▶️ 开始转换';
  });

  async function convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH) {
    var imgSource = file;
    
    if (/\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic') {
      try {
        var heicBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 });
        imgSource = new Blob([heicBlob], { type: 'image/jpeg' });
      } catch (e) {
        throw new Error('HEIC 解析失败，文件可能已损坏');
      }
    }
    else if (/\.(tiff|tif)$/i.test(file.name) || file.type === 'image/tiff') {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var buffer = e.target.result;
          var ifds = UTIF.decode(buffer);
          UTIF.decodeImage(buffer, ifds[0]);
          var rgba = UTIF.toRGBA8(ifds[0]);
          
          var canvas = document.createElement('canvas');
          canvas.width = ifds[0].width;
          canvas.height = ifds[0].height;
          var ctx = canvas.getContext('2d');
          var imgData = ctx.createImageData(canvas.width, canvas.height);
          imgData.data.set(rgba);
          ctx.putImageData(imgData, 0, 0);
          
          processCanvas(canvas, targetFormat, quality, resizeMode, scale, maxW, maxH, resolve);
        };
        reader.onerror = function() { reject(new Error('读取文件失败')); };
        reader.readAsArrayBuffer(file);
      });
    }

    if (file.type === 'image/svg+xml' && targetFormat === 'image/svg+xml') {
      var text = await file.text();
      var compressed = text.replace(/<!--[\s\S]*?-->/g, '')
                           .replace(/>\s+</g, '><')
                           .replace(/\s{2,}/g, ' ')
                           .trim();
      return new Blob([compressed], { type: 'image/svg+xml' });
    }

    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(imgSource);
      var img = new Image();
      
      img.onload = function () {
        URL.revokeObjectURL(url);
        
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var w = img.width, h = img.height;

        if (resizeMode === 'percent') {
          w = Math.round(w * scale); h = Math.round(h * scale);
        } else if (resizeMode === 'pixels') {
          if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
          if (maxH > 0 && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        }

        canvas.width = w;
        canvas.height = h;

        if (targetFormat === 'image/jpeg' || targetFormat === 'image/avif') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(img, 0, 0, w, h);
        processCanvas(canvas, targetFormat, quality, null, null, null, null, resolve);
      };
      
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('浏览器无法解析该图片格式'));
      };
      
      img.src = URL.createObjectURL(imgSource);
    });
  }

  // 【修复核心】：加上 async 关键字，允许内部使用 await
  async function processCanvas(canvas, targetFormat, quality, resizeMode, scale, maxW, maxH, resolve) {
    // 1. 调整尺寸
    if (resizeMode) {
      var w = canvas.width, h = canvas.height;
      if (resizeMode === 'percent') {
        w = Math.round(w * scale); h = Math.round(h * scale);
      } else if (resizeMode === 'pixels') {
        if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (maxH > 0 && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
      }
      var tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = w; tmpCanvas.height = h;
      var tmpCtx = tmpCanvas.getContext('2d');
      if (targetFormat === 'image/jpeg' || targetFormat === 'image/avif') {
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0, 0, w, h);
      }
      tmpCtx.drawImage(canvas, 0, 0, w, h);
      canvas = tmpCanvas;
    }

    // 2. PNG 特殊处理：同时计算原生无损和 UPNG 有损，取最小值
    if (targetFormat === 'image/png' && window.UPNG) {
      try {
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var buffer = imgData.data.buffer;

        var colorCount = Math.max(26, Math.floor(256 * quality));

        // A. 原生导出（无损）
        var nativeBlob = await new Promise(function(res) { canvas.toBlob(res, 'image/png'); });

        // B. UPNG 有损量化
        var quantizedBuffer = UPNG.encode([buffer.slice(0)], canvas.width, canvas.height, colorCount);
        var quantizedBlob = new Blob([quantizedBuffer], { type: 'image/png' });

        // C. 选出体积更小的
        resolve(quantizedBlob.size < nativeBlob.size ? quantizedBlob : nativeBlob);
        return;
      } catch (e) {
        console.warn('UPNG 量化失败，回退到原生 Canvas', e);
      }
    }

    // 3. 常规格式导出
    canvas.toBlob(function (blob) {
      if (blob) {
        resolve(blob);
      } else {
        canvas.toBlob(function (fallbackBlob) {
          resolve(fallbackBlob);
        }, 'image/webp', quality);
      }
    }, targetFormat, quality);
  }

  function downloadBlob(data, filename) {
    var blob = data instanceof Blob ? data : new Blob([data]);
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