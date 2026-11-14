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

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  function readFileAsImage(file, callback) {
    if (!file.type || (file.type.indexOf('image/') !== 0 && !/\.(heic|heif|tiff|tif)$/i.test(file.name))) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() { 
      URL.revokeObjectURL(url); 
      callback(img); 
    };
    img.src = url;
  }

  // ================== Tab 切换 ==================
  var tabs = document.querySelectorAll('.ic-tab');
  var panels = document.querySelectorAll('.ic-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
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
  var percentRow = document.getElementById('resize-percent-row');
  var pixelsRow = document.getElementById('resize-pixels-row');
  var scaleInput = document.getElementById('ic-scale');
  var scaleVal = document.getElementById('ic-scale-val');
  var maxWidthInput = document.getElementById('ic-max-width');
  var maxHeightInput = document.getElementById('ic-max-height');
  var processBtn = document.getElementById('ic-btn-process');
  var zipBtn = document.getElementById('ic-btn-zip');
  var resultArea = document.getElementById('ic-result-area');

  var files = [];
  var lastResults = []; // 用于 ZIP 打包

  // 事件绑定
  dropZone.addEventListener('click', function () { fileInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (evt) {
    dropZone.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragover',  function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFiles(Array.prototype.slice.call(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFiles(Array.prototype.slice.call(fileInput.files));
    fileInput.value = '';
  });

  // 粘贴
  document.addEventListener('paste', function (e) {
    if (!document.getElementById('panel-convert').classList.contains('active')) return;
    if (!e.clipboardData || !e.clipboardData.items) return;
    var imgFiles = [];
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        var f = item.getAsFile();
        if (f) imgFiles.push(f);
      }
    }
    if (imgFiles.length > 0) { e.preventDefault(); handleFiles(imgFiles); }
  });

  resizeModeSelect.addEventListener('change', function () {
    percentRow.style.display = this.value === 'percent' ? 'block' : 'none';
    pixelsRow.style.display = this.value === 'pixels' ? 'block' : 'none';
  });
  qualityInput.addEventListener('input', function () { qualityVal.textContent = this.value + '%'; });
  scaleInput.addEventListener('input', function () { scaleVal.textContent = this.value + '%'; });
  
  clearBtn.addEventListener('click', function () {
    files = []; lastResults = []; renderFileList();
    resultArea.innerHTML = '<p class="ic-placeholder">上传图片并设置参数后点击开始转换</p>';
    zipBtn.disabled = true;
  });

  function handleFiles(newFiles) {
    var valid = newFiles.filter(function (f) {
      return f.type.match('image.*') || /\.(heic|heif|tiff|tif)$/i.test(f.name);
    });
    if (valid.length === 0) return showToast('请选择有效的图片文件');
    
    valid.forEach(function (f) {
      if (f.size > 50 * 1024 * 1024) { showToast('文件 "' + f.name + '" 超过 50MB，已跳过'); return; }
      files.push(f);
    });
    renderFileList();
  }

  function renderFileList() {
    fileListEl.innerHTML = '';
    files.forEach(function (f, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="name" title="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</span>' +
                     '<span class="size">' + formatSize(f.size) + '</span>' +
                     '<button class="del" data-i="' + i + '">×</button>';
      fileListEl.appendChild(li);
    });
    fileListEl.querySelectorAll('.del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        files.splice(parseInt(this.dataset.i, 10), 1);
        renderFileList();
      });
    });
    processBtn.disabled = files.length === 0;
    zipBtn.disabled = lastResults.length === 0;
    clearBtn.style.display = files.length > 0 ? 'block' : 'none';
  }

  processBtn.addEventListener('click', async function () {
    if (files.length === 0) return;
    processBtn.disabled = true; processBtn.textContent = '⏳ 处理中…';
    zipBtn.disabled = true;
    resultArea.innerHTML = '<p class="ic-placeholder">正在努力转换，请稍候…</p>';
    lastResults = [];

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
        var res = await convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH);
        if (res && res.blob) {
          var url = URL.createObjectURL(res.blob);
          var diffPercent = ((res.blob.size - file.size) / file.size * 100).toFixed(1);
          var diffClass = res.blob.size > file.size ? 'up' : '';
          var diffText = (res.blob.size > file.size ? '+' : '') + diffPercent + '%';
          
          lastResults.push({ name: res.outName, blob: res.blob });

          var card = document.createElement('div');
          card.className = 'ic-card';
          card.innerHTML = 
            '<img class="ic-card-img" src="' + url + '" alt="预览">' +
            '<div class="ic-card-info">' +
              '<div class="name" title="' + escapeHtml(res.outName) + '">' + escapeHtml(res.outName) + '</div>' +
              '<div>' + formatSize(file.size) + ' → <span class="size-diff ' + diffClass + '">' + formatSize(res.blob.size) + ' (' + diffText + ')</span></div>' +
              '<a href="' + url + '" download="' + escapeHtml(res.outName) + '">⬇️ 下载</a>' +
            '</div>';
          grid.appendChild(card);
        }
      } catch (err) {
        console.error(err);
        var errCard = document.createElement('div');
        errCard.className = 'ic-card';
        errCard.innerHTML = '<div class="ic-card-info" style="color:#a8452a;"><b>' + escapeHtml(file.name) + '</b><br>转换失败: ' + (err.message || '未知错误') + '</div>';
        grid.appendChild(errCard);
      }
    }
    
    processBtn.disabled = false; processBtn.textContent = '▶️ 开始转换';
    zipBtn.disabled = lastResults.length === 0;
    if (lastResults.length > 0) showToast('转换完成');
  });

  async function convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH) {
    var imgSource = file;
    var ext = 'png';
    var mime = targetFormat;

    // 按原图格式
    if (targetFormat === 'original') {
      if (file.type === 'image/png' || /\.png$/i.test(file.name)) { mime = 'image/png'; ext = 'png'; }
      else if (file.type === 'image/webp' || /\.webp$/i.test(file.name)) { mime = 'image/webp'; ext = 'webp'; }
      else if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) { mime = 'image/png'; ext = 'png'; } // GIF 转 PNG 保留第一帧
      else { mime = 'image/jpeg'; ext = 'jpg'; }
    } else {
      ext = mime.split('/')[1]; if (ext === 'jpeg') ext = 'jpg';
    }
    
    var outName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;

    // 预解析 HEIC 和 TIFF
    if (/\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic') {
      try {
        var heicBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 });
        if (Array.isArray(heicBlob)) heicBlob = heicBlob[0];
        imgSource = new Blob([heicBlob], { type: 'image/jpeg' });
      } catch (e) { throw new Error('HEIC 解析失败'); }
    } else if (/\.(tiff|tif)$/i.test(file.name) || file.type === 'image/tiff') {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
          try {
            var buffer = e.target.result;
            var ifds = UTIF.decode(buffer);
            UTIF.decodeImage(buffer, ifds[0]);
            var rgba = UTIF.toRGBA8(ifds[0]);
            var cvs = document.createElement('canvas');
            cvs.width = ifds[0].width; cvs.height = ifds[0].height;
            var c = cvs.getContext('2d');
            var imgData = c.createImageData(cvs.width, cvs.height);
            imgData.data.set(rgba); c.putImageData(imgData, 0, 0);
            processCanvas(cvs, mime, quality, resizeMode, scale, maxW, maxH, outName, resolve, reject);
          } catch(err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
      });
    }

    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(imgSource);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var cvs = document.createElement('canvas');
        var c = cvs.getContext('2d');
        var w = img.width, h = img.height;
        
        if (resizeMode === 'percent') { w = Math.round(w * scale); h = Math.round(h * scale); }
        else if (resizeMode === 'pixels') {
          if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
          if (maxH > 0 && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        }
        
        cvs.width = w; cvs.height = h;
        if (mime === 'image/jpeg') { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); }
        c.drawImage(img, 0, 0, w, h);
        processCanvas(cvs, mime, quality, null, null, null, null, outName, resolve, reject);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('无法解析图片格式')); };
      img.src = URL.createObjectURL(imgSource);
    });
  }

  async function processCanvas(cvs, mime, quality, resizeMode, scale, maxW, maxH, outName, resolve, reject) {
    if (resizeMode) {
      var w = cvs.width, h = cvs.height;
      if (resizeMode === 'percent') { w = Math.round(w * scale); h = Math.round(h * scale); }
      else if (resizeMode === 'pixels') {
        if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (maxH > 0 && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
      }
      var tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      var tCtx = tmp.getContext('2d');
      if (mime === 'image/jpeg') { tCtx.fillStyle = '#ffffff'; tCtx.fillRect(0, 0, w, h); }
      tCtx.drawImage(cvs, 0, 0, w, h);
      cvs = tmp;
    }

    // 使用 UPNG 进行 PNG 极限压缩
    if (mime === 'image/png' && window.UPNG) {
      try {
        var ctx = cvs.getContext('2d');
        var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        var buffer = imgData.data.buffer;
        var colorCount = Math.max(26, Math.floor(256 * quality));
        var nativeBlob = await new Promise(function(res) { cvs.toBlob(res, 'image/png'); });
        var quantizedBuffer = UPNG.encode([buffer.slice(0)], cvs.width, cvs.height, colorCount);
        var quantizedBlob = new Blob([quantizedBuffer], { type: 'image/png' });
        resolve({ blob: quantizedBlob.size < nativeBlob.size ? quantizedBlob : nativeBlob, outName: outName });
        return;
      } catch (e) { /* 失败则回退到原生 toBlob */ }
    }

    cvs.toBlob(function (blob) {
      if (blob) resolve({ blob: blob, outName: outName });
      else cvs.toBlob(function (fallback) { resolve({ blob: fallback, outName: outName }); }, 'image/webp', quality);
    }, mime, quality);
  }

  // ZIP 打包下载
  zipBtn.addEventListener('click', function() {
    if (lastResults.length === 0 || !window.JSZip) return;
    zipBtn.disabled = true; zipBtn.textContent = '⏳ 打包中...';
    var zip = new JSZip();
    lastResults.forEach(function(item) { zip.file(item.name, item.blob); });
    zip.generateAsync({ type: 'blob' }).then(function(content) {
      downloadBlob(content, 'converted_images.zip');
      zipBtn.disabled = false; zipBtn.textContent = '📦 打包下载 ZIP';
      showToast('打包完成');
    });
  });


  // ================== 2. EXIF 查看与清除 ==================
  var exifDrop = document.getElementById('exif-drop-zone');
  var exifInput = document.getElementById('exif-input');
  var exifContent = document.getElementById('exif-content');
  var exifTable = document.getElementById('exif-table');
  var exifPreview = document.getElementById('exif-preview');
  var btnCleanExif = document.getElementById('btn-clean-exif');
  
  var currentExifImg = null;
  var currentExifExportMime = 'image/jpeg'; 
  var currentExifExportExt = 'jpg';

  exifDrop.addEventListener('click', function() { exifInput.click(); });
  
  exifDrop.addEventListener('dragenter', function () { exifDrop.classList.add('dragover'); });
  exifDrop.addEventListener('dragover',  function () { exifDrop.classList.add('dragover'); });
  exifDrop.addEventListener('dragleave', function () { exifDrop.classList.remove('dragover'); });
  exifDrop.addEventListener('drop', function (e) {
    exifDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) processExifFile(e.dataTransfer.files[0]);
  });
  exifInput.addEventListener('change', function() {
    if (exifInput.files.length > 0) processExifFile(exifInput.files[0]);
    exifInput.value = '';
  });

  document.addEventListener('paste', function (e) {
    if (!document.getElementById('panel-exif').classList.contains('active')) return;
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        var f = item.getAsFile();
        if (f) { e.preventDefault(); processExifFile(f); }
        return;
      }
    }
  });

  async function processExifFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    var mime = file.type;
    
    if (mime === 'image/png' || ext === 'png') { currentExifExportMime = 'image/png'; currentExifExportExt = 'png'; }
    else if (mime === 'image/webp' || ext === 'webp') { currentExifExportMime = 'image/webp'; currentExifExportExt = 'webp'; }
    else { currentExifExportMime = 'image/jpeg'; currentExifExportExt = 'jpg'; }
    
    btnCleanExif.textContent = '🧹 一键清理并下载 (' + currentExifExportExt.toUpperCase() + ')';
    exifContent.style.display = 'block';

    // 1. 预览
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

    // 2. 解析 EXIF
    var tbody = exifTable.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#8a7a5f;">正在解析元数据...</td></tr>';
    
    try {
      var output = await exifr.parse(file, true); 
      tbody.innerHTML = '';
      
      if (!output || Object.keys(output).length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#8a7a5f;">未找到元数据信息 (此格式可能不包含 EXIF)</td></tr>';
      } else {
        // 简单分类排序显示
        var keys = Object.keys(output);
        keys.sort(function(a, b) { return a.localeCompare(b); });
        
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var val = output[key];
          if (val instanceof Date) val = val.toLocaleString();
          if (val instanceof Uint8Array) val = '[' + val.length + ' bytes 数据]';
          else if (typeof val === 'object') val = JSON.stringify(val);
          
          var tr = document.createElement('tr');
          tr.innerHTML = '<th>' + escapeHtml(key) + '</th><td>' + escapeHtml(String(val)) + '</td>';
          tbody.appendChild(tr);
        }
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#a8452a;">解析失败: ' + escapeHtml(err.message) + '</td></tr>';
    }
  }

  // 清除 EXIF
  btnCleanExif.addEventListener('click', function() {
    if (!currentExifImg) return;
    var originalText = btnCleanExif.textContent;
    btnCleanExif.disabled = true; btnCleanExif.textContent = '⏳ 正在清理...';

    var cvs = document.createElement('canvas');
    cvs.width = currentExifImg.naturalWidth || currentExifImg.width;
    cvs.height = currentExifImg.naturalHeight || currentExifImg.height;
    var ctx = cvs.getContext('2d');
    
    if (currentExifExportMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
    ctx.drawImage(currentExifImg, 0, 0);

    cvs.toBlob(async function(blob) {
      var finalBlob = blob;
      
      // 针对 JPG 进行二次深度清洗（剔除 APP1-APP15 块，保留 JFIF）
      if (currentExifExportMime === 'image/jpeg') {
        try {
          var buffer = await blob.arrayBuffer();
          finalBlob = stripJpegMetadata(buffer);
        } catch(e) { console.warn('JPG 深度清洗失败', e); }
      }

      downloadBlob(finalBlob, 'clean_' + Date.now() + '.' + currentExifExportExt);
      btnCleanExif.disabled = false; btnCleanExif.textContent = originalText;
      showToast('清理完成');
    }, currentExifExportMime, 0.92);
  });

  // 剔除非必要 JPG 头
  function stripJpegMetadata(arrayBuffer) {
    var data = new Uint8Array(arrayBuffer);
    if (data[0] !== 0xFF || data[1] !== 0xD8) return new Blob([data], { type: 'image/jpeg' });

    var chunks = [data.subarray(0, 2)]; // SOI
    var offset = 2;

    while (offset < data.length) {
      if (data[offset] !== 0xFF) {
        chunks.push(data.subarray(offset));
        break;
      }

      var marker = data[offset + 1];
      if (marker === 0xD9) { // EOI
        chunks.push(data.subarray(offset, offset + 2));
        break;
      }

      var length = (data[offset + 2] << 8) + data[offset + 3];
      
      // APP0 (0xE0) 是 JFIF，留着！其余 APP1-APP15 (0xE1-0xEF) 和 COM (0xFE) 剔除
      var isAppMetadata = (marker >= 0xE1 && marker <= 0xEF) || marker === 0xFE;
      
      if (!isAppMetadata) {
        chunks.push(data.subarray(offset, offset + 2 + length));
      }
      
      offset += 2 + length;
    }

    return new Blob(chunks, { type: 'image/jpeg' });
  }


  // ================== 3. ASCII 转换 ==================
  var asciiDrop = document.getElementById('ascii-drop-zone');
  var asciiInput = document.getElementById('ascii-input');
  var asciiWidthInput = document.getElementById('ascii-width');
  var asciiWidthVal = document.getElementById('ascii-width-val');
  var asciiCharsetSelect = document.getElementById('ascii-charset');
  var asciiCustomRow = document.getElementById('ascii-custom-row');
  var asciiCustomChars = document.getElementById('ascii-custom-chars');
  var asciiBright = document.getElementById('ascii-bright');
  var asciiBrightVal = document.getElementById('ascii-bright-val');
  var asciiContrast = document.getElementById('ascii-contrast');
  var asciiContrastVal = document.getElementById('ascii-contrast-val');
  var asciiInvert = document.getElementById('ascii-invert');
  var asciiColor = document.getElementById('ascii-color');
  
  var asciiBtn = document.getElementById('ascii-btn-process');
  var asciiCopyBtn = document.getElementById('ascii-btn-copy');
  var asciiDlBtn = document.getElementById('ascii-btn-download');
  var asciiOutput = document.getElementById('ascii-output');
  
  var currentAsciiImg = null;
  var lastAsciiText = '';

  asciiWidthInput.addEventListener('input', function() { asciiWidthVal.textContent = this.value; });
  asciiBright.addEventListener('input', function() { asciiBrightVal.textContent = this.value; });
  asciiContrast.addEventListener('input', function() { asciiContrastVal.textContent = this.value; });
  asciiCharsetSelect.addEventListener('change', function() {
    asciiCustomRow.style.display = this.value === 'custom' ? 'block' : 'none';
  });

  asciiDrop.addEventListener('click', function() { asciiInput.click(); });
  asciiInput.addEventListener('change', function() {
    var file = asciiInput.files[0];
    if (!file) return;
    readFileAsImage(file, function(img) {
      currentAsciiImg = img;
      asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，请点击“生成”</p>';
    });
    asciiInput.value = '';
  });

  asciiDrop.addEventListener('dragenter', function () { asciiDrop.classList.add('dragover'); });
  asciiDrop.addEventListener('dragover',  function () { asciiDrop.classList.add('dragover'); });
  asciiDrop.addEventListener('dragleave', function () { asciiDrop.classList.remove('dragover'); });
  asciiDrop.addEventListener('drop', function (e) {
    asciiDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      readFileAsImage(e.dataTransfer.files[0], function(img) {
        currentAsciiImg = img;
        asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，请点击“生成”</p>';
      });
    }
  });

  document.addEventListener('paste', function (e) {
    if (!document.getElementById('panel-ascii').classList.contains('active')) return;
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        var f = item.getAsFile();
        if (f) {
          e.preventDefault();
          readFileAsImage(f, function(img) {
            currentAsciiImg = img;
            asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，请点击“生成”</p>';
          });
        }
        return;
      }
    }
  });

  asciiBtn.addEventListener('click', function() {
    if (!currentAsciiImg) return showToast('请先上传图片');
    
    var w = parseInt(asciiWidthInput.value, 10);
    var h = Math.round(w * (currentAsciiImg.height / currentAsciiImg.width) * 0.5); // 0.5 修正字符高宽比
    
    var cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    var ctx = cvs.getContext('2d');
    ctx.drawImage(currentAsciiImg, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h).data;

    var charsetVal = asciiCharsetSelect.value;
    var chars = '';
    if (charsetVal === '01') chars = '01';
    else if (charsetVal === 'standard') chars = '@%#*+=-:. ';
    else if (charsetVal === 'detailed') chars = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ';
    else chars = asciiCustomChars.value || '@%#*+=-:. ';
    
    if (chars.length < 2) chars = '@.';

    var bOffset = parseInt(asciiBright.value, 10);
    var cFactor = (259 * (parseInt(asciiContrast.value, 10) + 255)) / (255 * (259 - parseInt(asciiContrast.value, 10)));
    var isInvert = asciiInvert.checked;
    var isColor = asciiColor.checked;
    
    var htmlStr = '<pre>';
    lastAsciiText = '';

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var offset = (y * w + x) * 4;
        var r = data[offset], g = data[offset + 1], b = data[offset + 2];
        
        // 调整亮度对比度
        r = Math.max(0, Math.min(255, r + bOffset));
        g = Math.max(0, Math.min(255, g + bOffset));
        b = Math.max(0, Math.min(255, b + bOffset));
        r = Math.max(0, Math.min(255, cFactor * (r - 128) + 128));
        g = Math.max(0, Math.min(255, cFactor * (g - 128) + 128));
        b = Math.max(0, Math.min(255, cFactor * (b - 128) + 128));

        var gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        var charIndex = Math.floor((gray / 255) * (chars.length - 1));
        if (isInvert) charIndex = (chars.length - 1) - charIndex;
        
        var char = chars[charIndex];
        if (char === ' ') char = '&nbsp;';
        else if (char === '<') char = '&lt;';
        else if (char === '>') char = '&gt;';
        else if (char === '&') char = '&amp;';

        lastAsciiText += chars[charIndex];

        if (isColor) {
          htmlStr += '<span style="color:rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+');">' + char + '</span>';
        } else {
          htmlStr += char;
        }
      }
      htmlStr += '<br>';
      lastAsciiText += '\n';
    }
    htmlStr += '</pre>';
    
    asciiOutput.innerHTML = htmlStr;
    asciiCopyBtn.disabled = false;
    asciiDlBtn.disabled = false;
  });

  asciiCopyBtn.addEventListener('click', function() {
    if (!lastAsciiText) return;
    navigator.clipboard.writeText(lastAsciiText).then(function() {
      showToast('已复制到剪贴板');
    }).catch(function() {
      showToast('复制失败');
    });
  });

  asciiDlBtn.addEventListener('click', function() {
    if (!lastAsciiText) return;
    var blob = new Blob([lastAsciiText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'ascii_art_' + Date.now() + '.txt');
    showToast('已下载');
  });

})();