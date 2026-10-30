(function () {
  // ================== 0. Tab 切换逻辑 ==================
  var tabs = document.querySelectorAll('.ic-tab');
  var panels = document.querySelectorAll('.ic-panel');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.style.background = '#fdf8ec'; t.style.color = '#6b5d47'; });
      panels.forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
      tab.style.background = '#8a5a2b'; tab.style.color = '#fff';
      var target = document.getElementById(tab.dataset.target);
      target.style.display = (tab.dataset.target === 'panel-convert') ? 'grid' : 'block';
      target.classList.add('active');
    });
  });

  // ================== 1. 格式转换与压缩 ==================
  var dropZone = document.getElementById('ic-drop-zone');
  var fileInput = document.getElementById('ic-input');
  var fileListEl = document.getElementById('ic-file-list');
  var clearBtn = document.getElementById('ic-btn-clear');
  var formatSelect = document.getElementById('ic-format');
  var qualityInput = document.getElementById('ic-quality');
  var qualityVal = document.getElementById('ic-quality-val');
  var resizeModeSelect = document.getElementById('ic-resize-mode');
  var percentRow = document.getElementById('ic-resize-percent-row');
  var pixelsRow = document.getElementById('ic-resize-pixels-row');
  var scaleInput = document.getElementById('ic-scale');
  var scaleVal = document.getElementById('ic-scale-val');
  var maxWidthInput = document.getElementById('ic-max-width');
  var maxHeightInput = document.getElementById('ic-max-height');
  var processBtn = document.getElementById('ic-btn-process');
  var resultArea = document.getElementById('ic-result-area');

  var files = [];

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
  qualityInput.addEventListener('input', function () { qualityVal.textContent = this.value + '%'; });
  scaleInput.addEventListener('input', function () { scaleVal.textContent = this.value + '%'; });
  clearBtn.addEventListener('click', function() {
    files = []; renderFileList();
    resultArea.innerHTML = '<p class="ic-placeholder">上传图片并设置参数后点击开始转换</p>';
  });

  function handleFiles(newFiles) {
    var validFiles = newFiles.filter(function (f) {
      return f.type.match('image.*') || /\.(heic|heif|tiff|tif)$/i.test(f.name);
    });
    if (validFiles.length === 0) return alert('请选择图片文件。');
    
    validFiles.forEach(function (f) {
      if (f.size > 50 * 1024 * 1024) { alert('文件 "' + f.name + '" 超过 50MB，已跳过。'); return; }
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

  processBtn.addEventListener('click', async function () {
    if (files.length === 0) return;
    processBtn.disabled = true; processBtn.textContent = '⏳ 处理中…';
    resultArea.innerHTML = '<p class="ic-placeholder">正在努力转换，请稍候…</p>';

    var targetFormat = formatSelect.value;
    var quality = parseInt(qualityInput.value, 10) / 100;
    var resizeMode = resizeModeSelect.value;
    var scale = parseInt(scaleInput.value, 10) / 100;
    var maxW = parseInt(maxWidthInput.value, 10) || 0;
    var maxH = parseInt(maxHeightInput.value, 10) || 0;

    resultArea.innerHTML = '';
    var grid = document.createElement('div'); grid.className = 'ic-result-grid'; resultArea.appendChild(grid);

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      try {
        var resultBlob = await convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH);
        if (resultBlob) {
          var url = URL.createObjectURL(resultBlob);
          var ext = targetFormat.split('/')[1];
          if (ext === 'jpeg') ext = 'jpg';
          var outName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
          
          var diffPercent = ((resultBlob.size - file.size) / file.size * 100).toFixed(1);
          var diffClass = resultBlob.size > file.size ? 'up' : '';
          var diffText = resultBlob.size > file.size ? '+' + diffPercent + '%' : diffPercent + '%';

          var card = document.createElement('div');
          card.className = 'ic-card';
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
    processBtn.disabled = false; processBtn.textContent = '▶️ 开始转换';
  });

  async function convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH) {
    var imgSource = file;
    
    if (/\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic') {
      try {
        var heicBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 });
        imgSource = new Blob([heicBlob], { type: 'image/jpeg' });
      } catch (e) { throw new Error('HEIC 解析失败'); }
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
          canvas.width = ifds[0].width; canvas.height = ifds[0].height;
          var ctx = canvas.getContext('2d');
          var imgData = ctx.createImageData(canvas.width, canvas.height);
          imgData.data.set(rgba); ctx.putImageData(imgData, 0, 0);
          processCanvas(canvas, targetFormat, quality, resizeMode, scale, maxW, maxH, resolve);
        };
        reader.readAsArrayBuffer(file);
      });
    }

    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(imgSource);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var w = img.width, h = img.height;
        if (resizeMode === 'percent') { w = Math.round(w * scale); h = Math.round(h * scale); }
        else if (resizeMode === 'pixels') {
          if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
          if (maxH > 0 && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        }
        canvas.width = w; canvas.height = h;
        if (targetFormat === 'image/jpeg' || targetFormat === 'image/avif') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        processCanvas(canvas, targetFormat, quality, null, null, null, null, resolve);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('无法解析该图片格式')); };
      img.src = URL.createObjectURL(imgSource);
    });
  }

  async function processCanvas(canvas, targetFormat, quality, resizeMode, scale, maxW, maxH, resolve) {
    if (resizeMode) {
      var w = canvas.width, h = canvas.height;
      if (resizeMode === 'percent') { w = Math.round(w * scale); h = Math.round(h * scale); }
      else if (resizeMode === 'pixels') {
        if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (maxH > 0 && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
      }
      var tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = w; tmpCanvas.height = h;
      var tmpCtx = tmpCanvas.getContext('2d');
      if (targetFormat === 'image/jpeg' || targetFormat === 'image/avif') { tmpCtx.fillStyle = '#ffffff'; tmpCtx.fillRect(0, 0, w, h); }
      tmpCtx.drawImage(canvas, 0, 0, w, h);
      canvas = tmpCanvas;
    }

    if (targetFormat === 'image/png' && window.UPNG) {
      try {
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var buffer = imgData.data.buffer;
        var colorCount = Math.max(26, Math.floor(256 * quality));
        var nativeBlob = await new Promise(function(res) { canvas.toBlob(res, 'image/png'); });
        var quantizedBuffer = UPNG.encode([buffer.slice(0)], canvas.width, canvas.height, colorCount);
        var quantizedBlob = new Blob([quantizedBuffer], { type: 'image/png' });
        resolve(quantizedBlob.size < nativeBlob.size ? quantizedBlob : nativeBlob);
        return;
      } catch (e) {}
    }

    canvas.toBlob(function (blob) {
      if (blob) resolve(blob);
      else canvas.toBlob(function (fallback) { resolve(fallback); }, 'image/webp', quality);
    }, targetFormat, quality);
  }


  // ================== 2. EXIF 查看与清除逻辑 ==================
  var exifDrop = document.getElementById('exif-drop-zone');
  var exifInput = document.getElementById('exif-input');
  var exifTable = document.getElementById('exif-table');
  var exifPreview = document.getElementById('exif-preview');
  var btnCleanExif = document.getElementById('btn-clean-exif');
  
  var currentExifImg = null;
  var currentExifExportMime = 'image/jpeg'; 
  var currentExifExportExt = 'jpg';

  exifDrop.addEventListener('click', function() { exifInput.click(); });
  
  exifInput.addEventListener('change', async function() {
    var file = exifInput.files[0];
    if (!file) return;
    
    var ext = file.name.split('.').pop().toLowerCase();
    var mime = file.type;
    
    if (mime === 'image/png' || ext === 'png') {
      currentExifExportMime = 'image/png';
      currentExifExportExt = 'png';
    } else if (mime === 'image/webp' || ext === 'webp') {
      currentExifExportMime = 'image/webp';
      currentExifExportExt = 'webp';
    } else {
      currentExifExportMime = 'image/jpeg';
      currentExifExportExt = 'jpg';
    }
    
    btnCleanExif.textContent = '🧹 一键清除并下载 (' + currentExifExportExt.toUpperCase() + ')';

    // 1. 预览图片
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      currentExifImg = img;
      exifPreview.innerHTML = '';
      img.style.maxHeight = '200px';
      img.style.borderRadius = '8px';
      exifPreview.appendChild(img);
      btnCleanExif.disabled = false;
    };
    img.src = url;

    // 2. 使用 exifr 解析信息
    exifTable.style.display = 'table';
    var tbody = exifTable.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#8a7a5f;">正在解析元数据...</td></tr>';
    
    try {
      var output = await exifr.parse(file, true); 
      tbody.innerHTML = '';
      
      if (!output || Object.keys(output).length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#8a7a5f;">未找到元数据信息 (此格式可能不包含 EXIF)</td></tr>';
      } else {
        for (var key in output) {
          var val = output[key];
          if (val instanceof Date) val = val.toLocaleString();
          if (typeof val === 'object') val = JSON.stringify(val);
          
          var tr = document.createElement('tr');
          tr.innerHTML = '<th>' + key + '</th><td>' + String(val) + '</td>';
          tbody.appendChild(tr);
        }
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#a8452a;">解析失败: ' + err.message + '</td></tr>';
    }
    exifInput.value = '';
  });

  // 核心：清除 EXIF 并下载（剔除 JPG 附加的浏览器色彩信息）
  btnCleanExif.addEventListener('click', function() {
    if (!currentExifImg) return;
    var originalText = btnCleanExif.textContent;
    btnCleanExif.disabled = true;
    btnCleanExif.textContent = '⏳ 正在清理...';

    var canvas = document.createElement('canvas');
    canvas.width = currentExifImg.naturalWidth || currentExifImg.width;
    canvas.height = currentExifImg.naturalHeight || currentExifImg.height;
    var ctx = canvas.getContext('2d');
    
    if (currentExifExportMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.drawImage(currentExifImg, 0, 0);

    canvas.toBlob(async function(blob) {
      var finalBlob = blob;
      
      // 针对 JPG 进行二次纯净化处理
      if (currentExifExportMime === 'image/jpeg') {
        try {
          var buffer = await blob.arrayBuffer();
          finalBlob = stripJpegMetadata(buffer);
        } catch(e) {
          console.warn('JPG 深度清洗失败，使用普通版本', e);
        }
      }

      var url = URL.createObjectURL(finalBlob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'clean_' + Date.now() + '.' + currentExifExportExt;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      btnCleanExif.disabled = false;
      btnCleanExif.textContent = originalText;
    }, currentExifExportMime, 0.92);
  });

  // 剔除 JPG 二进制中的 APP 头信息（去色彩配置、去JFIF等）
  function stripJpegMetadata(arrayBuffer) {
    var data = new Uint8Array(arrayBuffer);
    if (data[0] !== 0xFF || data[1] !== 0xD8) return new Blob([data], { type: 'image/jpeg' }); // 不是标准 JPG

    var chunks = [data.subarray(0, 2)]; // 保留 FFD8 头
    var offset = 2;

    while (offset < data.length) {
      // 遇到不是 0xFF 标记的说明到实际图像数据了（SOS块）或者到了文件尾
      if (data[offset] !== 0xFF) {
        chunks.push(data.subarray(offset));
        break;
      }

      var marker = data[offset + 1];
      // FFD9 (EOI) 文件尾，保留并退出
      if (marker === 0xD9) {
        chunks.push(data.subarray(offset, offset + 2));
        break;
      }

      // 获取该块的长度
      var length = (data[offset + 2] << 8) + data[offset + 3];
      
      // 如果是 APP0-APP15 (0xE0 - 0xEF)，直接跳过（这就是浏览器加进去的配置和 EXIF）
      // 如果是 COM (0xFE，注释)，也跳过
      var isAppMarker = (marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE;
      
      if (!isAppMarker) {
        chunks.push(data.subarray(offset, offset + 2 + length));
      }
      
      offset += 2 + length;
    }

    return new Blob(chunks, { type: 'image/jpeg' });
  }


  // ================== 3. ASCII 逻辑 ==================
  var asciiDrop = document.getElementById('ascii-drop-zone');
  var asciiInput = document.getElementById('ascii-input');
  var asciiWidthInput = document.getElementById('ascii-width');
  var asciiWidthVal = document.getElementById('ascii-width-val');
  var asciiCharsetSelect = document.getElementById('ascii-charset');
  var asciiBtn = document.getElementById('ascii-btn-process');
  var asciiOutput = document.getElementById('ascii-output');
  var currentAsciiImg = null;

  asciiWidthInput.addEventListener('input', function() { asciiWidthVal.textContent = this.value; });
  asciiDrop.addEventListener('click', function() { asciiInput.click(); });
  asciiInput.addEventListener('change', function() {
    var file = asciiInput.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() { currentAsciiImg = img; URL.revokeObjectURL(url); asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，点击“生成字符画”</p>'; };
    img.src = url;
  });

  asciiBtn.addEventListener('click', function() {
    if (!currentAsciiImg) return alert('请先上传图片');
    var w = parseInt(asciiWidthInput.value, 10);
    var h = Math.round(w * (currentAsciiImg.height / currentAsciiImg.width) * 0.5);
    
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(currentAsciiImg, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h).data;

    var charsets = {
      '01': '01',
      'standard': '@%#*+=-:. ',
      'detailed': '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. '
    };
    var chars = charsets[asciiCharsetSelect.value];
    var asciiStr = '';

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var offset = (y * w + x) * 4;
        var r = data[offset], g = data[offset + 1], b = data[offset + 2];
        var gray = 0.299 * r + 0.587 * g + 0.114 * b;
        var charIndex = Math.floor((gray / 255) * (chars.length - 1));
        asciiStr += chars[chars.length - 1 - charIndex];
      }
      asciiStr += '\n';
    }
    asciiOutput.innerHTML = '<pre>' + escapeHtml(asciiStr) + '</pre>';
  });

})();