// 文件: js/image-toolbox.js
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

  // FileSaver 优先，回退到原生
  function saveBlob(blob, filename) {
    if (typeof window.saveAs === 'function') {
      try { window.saveAs(blob, filename); return; } catch (e) { console.warn('saveAs 失败', e); }
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.indexOf('image/') === 0) return true;
    return /\.(heic|heif|tiff|tif|jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name || '');
  }

  function readFileAsImage(file, callback) {
    if (!isImageFile(file)) return false;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); callback(img); };
    img.onerror = function () { URL.revokeObjectURL(url); showToast('无法解析图片'); };
    img.src = url;
    return true;
  }

  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ================== pica 封装 ==================
  var picaInstance = null;
  function getPica() {
    if (picaInstance) return picaInstance;
    if (typeof window.pica === 'function') {
      try { picaInstance = window.pica(); } catch (e) { return null; }
    }
    return picaInstance || null;
  }

  function loadImageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('无法解析图片')); };
      img.src = url;
    });
  }

  function decodeTiff(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var buffer = e.target.result;
          var ifds = UTIF.decode(buffer);
          UTIF.decodeImage(buffer, ifds[0]);
          var rgba = UTIF.toRGBA8(ifds[0]);
          var cvs = document.createElement('canvas');
          cvs.width = ifds[0].width;
          cvs.height = ifds[0].height;
          var c = cvs.getContext('2d');
          var imgData = c.createImageData(cvs.width, cvs.height);
          imgData.data.set(rgba);
          c.putImageData(imgData, 0, 0);
          resolve(cvs);
        } catch (err) { reject(err); }
      };
      reader.onerror = function () { reject(new Error('TIFF 读取失败')); };
      reader.readAsArrayBuffer(file);
    });
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
  var sharpenCheckbox = document.getElementById('ic-sharpen');
  var processBtn = document.getElementById('ic-btn-process');
  var zipBtn = document.getElementById('ic-btn-zip');
  var resultArea = document.getElementById('ic-result-area');

  var files = [];
  var lastResults = [];
  var resultUrls = [];

  dropZone.addEventListener('click', function () { fileInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (evt) {
    dropZone.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragover', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFiles(Array.prototype.slice.call(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFiles(Array.prototype.slice.call(fileInput.files));
    fileInput.value = '';
  });

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
    files = [];
    lastResults = [];
    resultUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    resultUrls = [];
    renderFileList();
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
    fileListEl.querySelectorAll('.del').forEach(function (btn) {
      btn.addEventListener('click', function () {
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
    processBtn.disabled = true;
    zipBtn.disabled = true;

    resultUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    resultUrls = [];
    lastResults = [];
    resultArea.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'ic-result-grid';
    resultArea.appendChild(grid);

    var targetFormat = formatSelect.value;
    var quality = parseInt(qualityInput.value, 10) / 100;
    var resizeMode = resizeModeSelect.value;
    var scale = parseInt(scaleInput.value, 10) / 100;
    var maxW = parseInt(maxWidthInput.value, 10) || 0;
    var maxH = parseInt(maxHeightInput.value, 10) || 0;
    var sharpen = sharpenCheckbox ? sharpenCheckbox.checked : false;

    for (var i = 0; i < files.length; i++) {
      processBtn.textContent = '⏳ 处理中 ' + (i + 1) + '/' + files.length;
      var file = files[i];
      try {
        var res = await convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH, sharpen);
        if (res && res.blob) {
          var url = URL.createObjectURL(res.blob);
          resultUrls.push(url);
          var diffPercent = ((res.blob.size - file.size) / file.size * 100).toFixed(1);
          var isBigger = res.blob.size > file.size;
          var diffClass = isBigger ? 'up' : '';
          var diffText = (isBigger ? '+' : '') + diffPercent + '%';
          
          var warnText = '';
          if (isBigger && res.blob !== file && res.colorInfo === '原生 PNG') {
            warnText = ' <span style="color:#d32f2f;">(无损重编码通常较大，建议选 JPG 或 WebP)</span>';
          } else if (res.colorInfo === '保留原文件') {
            warnText = ' <span style="color:#d32f2f;">(该图已极小，无法更小，已保留原图)</span>';
          }

          lastResults.push({ name: res.outName, blob: res.blob });

          var dimInfo = '';
          if (res.dstW && res.dstH && (res.dstW !== res.srcW || res.dstH !== res.srcH)) {
            dimInfo = '<div class="dim-info">' + res.srcW + '×' + res.srcH + ' → <b>' + res.dstW + '×' + res.dstH + '</b></div>';
          } else {
            dimInfo = '<div class="dim-info">' + res.srcW + '×' + res.srcH + ' (原尺寸)</div>';
          }

          var extraInfo = '';
          if (res.colorInfo) {
            extraInfo = '<div class="dim-info" style="color:' + (res.colorInfo === '原生 PNG' || res.colorInfo === '保留原文件' ? '#8a7a5f' : '#4b7d3b') + ';">' + res.colorInfo + '</div>';
          }

          var card = document.createElement('div');
          card.className = 'ic-card';
          card.innerHTML =
            '<img class="ic-card-img" src="' + url + '" alt="预览">' +
            '<div class="ic-card-info">' +
              '<div class="name" title="' + escapeHtml(res.outName) + '">' + escapeHtml(res.outName) + '</div>' +
              dimInfo +
              extraInfo +
              '<div>' + formatSize(file.size) + ' → <span class="size-diff ' + diffClass + '">' + formatSize(res.blob.size) + ' (' + diffText + ')</span>' + warnText + '</div>' +
              '<a href="' + url + '" download="' + escapeHtml(res.outName) + '">⬇️ 下载</a>' +
            '</div>';
          grid.appendChild(card);
        }
      } catch (err) {
        console.error(err);
        var errCard = document.createElement('div');
        errCard.className = 'ic-card';
        errCard.innerHTML = '<div class="ic-card-info" style="color:#a8452a;"><b>' + escapeHtml(file.name) + '</b><br>转换失败: ' + escapeHtml(err.message || '未知错误') + '</div>';
        grid.appendChild(errCard);
      }
    }

    processBtn.disabled = false;
    processBtn.textContent = '▶️ 开始转换';
    zipBtn.disabled = lastResults.length === 0;
    if (lastResults.length > 0) showToast('转换完成（共 ' + lastResults.length + ' 张）');
  });

  async function convertImage(file, targetFormat, quality, resizeMode, scale, maxW, maxH, sharpen) {
    // 1. 确定格式
    var ext, mime;
    if (targetFormat === 'original') {
      if (file.type === 'image/png' || /\.png$/i.test(file.name)) { mime = 'image/png'; ext = 'png'; }
      else if (file.type === 'image/webp' || /\.webp$/i.test(file.name)) { mime = 'image/webp'; ext = 'webp'; }
      else if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) { mime = 'image/png'; ext = 'png'; }
      else { mime = 'image/jpeg'; ext = 'jpg'; }
    } else {
      mime = targetFormat;
      ext = mime.split('/')[1];
      if (ext === 'jpeg') ext = 'jpg';
    }
    var outName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;

    // 2. 解码源图
    var source;
    var isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic';
    var isTiff = /\.(tiff|tif)$/i.test(file.name) || file.type === 'image/tiff';

    if (isHeic) {
      if (typeof heic2any !== 'function') throw new Error('缺少 heic2any 库');
      try {
        var heicBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 });
        if (Array.isArray(heicBlob)) heicBlob = heicBlob[0];
        source = await loadImageFromBlob(new Blob([heicBlob], { type: 'image/jpeg' }));
      } catch (e) { throw new Error('HEIC 解析失败'); }
    } else if (isTiff) {
      if (typeof UTIF === 'undefined') throw new Error('缺少 UTIF 库');
      source = await decodeTiff(file);
    } else {
      source = await loadImageFromBlob(file);
    }

    var srcW = source.naturalWidth || source.width;
    var srcH = source.naturalHeight || source.height;
    if (!srcW || !srcH) throw new Error('无效图片尺寸');

    // 3. 计算目标尺寸
    var tw = srcW, th = srcH;
    if (resizeMode === 'percent') {
      tw = Math.round(srcW * scale);
      th = Math.round(srcH * scale);
    } else if (resizeMode === 'pixels') {
      if (maxW > 0 && tw > maxW) { th = Math.round(th * (maxW / tw)); tw = maxW; }
      if (maxH > 0 && th > maxH) { tw = Math.round(tw * (maxH / th)); th = maxH; }
    }
    tw = Math.max(1, tw);
    th = Math.max(1, th);

    // 判断是否完全一致
    var isSameFormat = (file.type === mime) || 
        (mime === 'image/jpeg' && /\.(jpe?g)$/i.test(file.name)) ||
        (mime === 'image/png' && /\.png$/i.test(file.name)) ||
        (mime === 'image/webp' && /\.webp$/i.test(file.name)) ||
        (mime === 'image/avif' && /\.avif$/i.test(file.name)) ||
        (mime === 'image/gif' && /\.gif$/i.test(file.name));

    // 只有当 无缩放、无格式转换、无锐化 且 质量=100% 时，才直接返回原图。
    if (isSameFormat && tw === srcW && th === srcH && !sharpen && resizeMode === 'none' && quality >= 0.99) {
      return {
        blob: file,
        outName: outName,
        srcW: srcW, srcH: srcH, dstW: tw, dstH: th,
        colorInfo: '保留原文件 (质量 100%)'
      };
    }

    // 4. 渲染
    var cvs = document.createElement('canvas');
    cvs.width = tw;
    cvs.height = th;
    var ctx = cvs.getContext('2d');
    var fillWhite = mime === 'image/jpeg';

    var needsResize = (tw !== srcW || th !== srcH);
    var isDownscale = (tw < srcW || th < srcH);
    var pica = needsResize ? getPica() : null;

    if (pica) {
      var picaSource = source;
      if (fillWhite) {
        var preCvs = document.createElement('canvas');
        preCvs.width = srcW;
        preCvs.height = srcH;
        var pctx = preCvs.getContext('2d');
        pctx.fillStyle = '#fff';
        pctx.fillRect(0, 0, srcW, srcH);
        pctx.drawImage(source, 0, 0);
        picaSource = preCvs;
      }
      try {
        await pica.resize(picaSource, cvs, {
          unsharpAmount: (sharpen && isDownscale) ? 80 : 0,
          unsharpRadius: 0.6,
          unsharpThreshold: 2
        });
      } catch (e) {
        console.warn('[pica] resize 失败，使用 canvas 回退', e);
        if (fillWhite) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tw, th); }
        ctx.drawImage(source, 0, 0, tw, th);
      }
    } else {
      if (fillWhite) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tw, th); }
      ctx.drawImage(source, 0, 0, tw, th);
    }

    // 5. 编码
    var encoded = await encodeCanvas(cvs, mime, quality, outName);
    
    // 终极兜底：如果同格式、同尺寸，但输出比原图大，强制退回原文件！
    if (isSameFormat && tw === srcW && th === srcH && encoded.blob && encoded.blob.size >= file.size) {
        return {
            blob: file,
            outName: outName,
            srcW: srcW, srcH: srcH, dstW: tw, dstH: th,
            colorInfo: '保留原文件'
        };
    }

    encoded.srcW = srcW;
    encoded.srcH = srcH;
    encoded.dstW = tw;
    encoded.dstH = th;
    return encoded;
  }

  // 编码并压缩
  async function encodeCanvas(cvs, mime, quality, outName) {
    if (mime === 'image/png') {
      var nativeBlob = await canvasToBlob(cvs, 'image/png');
      if (!nativeBlob) nativeBlob = new Blob([], { type: mime });
      
      // 质量 100% 且像素不大，直接输出无损
      if (quality >= 0.99) {
        return { blob: nativeBlob, outName: outName, colorInfo: '无损 PNG' };
      }

      // 像素过大时（>1200万），跳过量化防卡顿
      if (cvs.width * cvs.height > 12000000) {
        return { blob: nativeBlob, outName: outName, colorInfo: '原生 PNG（过大跳过量化）' };
      }

      try {
        var quantizedBlob = await encodePngQuantized(cvs, quality);
        if (quantizedBlob) {
          var colorCount = quantizeColorsForQuality(quality);
          return {
            blob: quantizedBlob,
            outName: outName,
            colorInfo: '调色板 ' + colorCount + ' 色'
          };
        }
      } catch (e) {
        console.warn('[PNG 量化] 失败', e);
      }
      return { blob: nativeBlob, outName: outName, colorInfo: '原生 PNG' };
    }

    return new Promise(function (resolve) {
      cvs.toBlob(function (blob) {
        if (blob) {
          resolve({ blob: blob, outName: outName });
        } else {
          cvs.toBlob(function (fb) {
            resolve({ blob: fb, outName: outName });
          }, 'image/webp', quality);
        }
      }, mime, quality);
    });
  }

  // ================= 纯 JS PNG 降色核心算法（完全依赖原生 toBlob） =================

  function canvasToBlob(cv, type, quality) {
    return new Promise(function (resolve) {
      if (cv.toBlob) {
        cv.toBlob(function (b) { resolve(b); }, type, quality);
      } else {
        try {
          var dataURL = cv.toDataURL(type, quality);
          var arr = dataURL.split(',');
          var mime = arr[0].match(/:(.*?);/)[1];
          var bin = atob(arr[1]);
          var u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          resolve(new Blob([u8], { type: mime }));
        } catch (e) { resolve(null); }
      }
    });
  }

  function quantizeColorsForQuality(q) {
    // 调整公式：避免极低质量导致画面严重崩坏，100% -> 256色, 80% -> 200色, 50% -> 128色
    var n = Math.max(16, Math.round(256 * Math.pow(q, 1.5)));
    return Math.min(256, n);
  }

  async function encodePngQuantized(cv, q) {
    var w = cv.width, h = cv.height;
    if (!w || !h) return canvasToBlob(cv, 'image/png');
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var src;
    try { src = ctx.getImageData(0, 0, w, h); }
    catch (e) { return canvasToBlob(cv, 'image/png'); }
    var data = src.data;
    var maxColors = quantizeColorsForQuality(q);

    // 1) 中位数切割生成调色板
    var pixels = [];
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    var palette = [];
    if (pixels.length) {
      var boxes = [makeBox(pixels)];
      while (boxes.length < maxColors) {
        var idx = -1, best = -1;
        for (var b = 0; b < boxes.length; b++) {
          if (boxes[b].len < 2) continue;
          if (boxes[b].len > best) { best = boxes[b].len; idx = b; }
        }
        if (idx < 0) break;
        var box = boxes[idx];
        var ch = boxRangeMax(box);
        if (ch < 0) break;
        box.pix.sort(function (p1, p2) { return p1[ch] - p2[ch]; });
        var mid = box.len >> 1;
        boxes.splice(idx, 1, makeBox(box.pix.slice(0, mid)), makeBox(box.pix.slice(mid)));
      }
      for (var k = 0; k < boxes.length; k++) {
        var s = [0, 0, 0];
        for (var j = 0; j < boxes[k].len; j++) {
          s[0] += boxes[k].pix[j][0]; s[1] += boxes[k].pix[j][1]; s[2] += boxes[k].pix[j][2];
        }
        palette.push([
          Math.round(s[0] / boxes[k].len),
          Math.round(s[1] / boxes[k].len),
          Math.round(s[2] / boxes[k].len)
        ]);
      }
    }

    // 2) 将原像素映射到调色板（保留原有的 Alpha 通道，防止边缘生硬变黑/变白）
    var out = ctx.createImageData(w, h);
    var od = out.data;
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        od[i + 3] = 0;
        continue;
      }
      var er = data[i], eg = data[i + 1], eb = data[i + 2];
      var pi = nearestPalette(er, eg, eb, palette);
      od[i] = palette[pi][0]; od[i + 1] = palette[pi][1]; od[i + 2] = palette[pi][2];
      od[i + 3] = data[i + 3]; // 完美保留抗锯齿透明度！
    }

    function makeBox(arr) { return { pix: arr, len: arr.length }; }
    function boxRangeMax(box) {
      var mn = [255, 255, 255], mx = [0, 0, 0], bestCh = -1, bestSpan = -1;
      for (var i = 0; i < box.len; i++) {
        for (var c = 0; c < 3; c++) {
          var v = box.pix[i][c];
          if (v < mn[c]) mn[c] = v;
          if (v > mx[c]) mx[c] = v;
        }
      }
      for (var c2 = 0; c2 < 3; c2++) {
        var span = mx[c2] - mn[c2];
        if (span > bestSpan) { bestSpan = span; bestCh = c2; }
      }
      return bestSpan > 0 ? bestCh : -1;
    }
    function nearestPalette(r, g, b, pal) {
      var bi = 0, bd = Infinity;
      for (var i = 0; i < pal.length; i++) {
        var dr = pal[i][0] - r, dg = pal[i][1] - g, db = pal[i][2] - b;
        var d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; bi = i; }
      }
      return bi;
    }

    // 3) 将量化后的数据画到临时画布，直接交给浏览器原生无损压缩
    var qcvs = document.createElement('canvas');
    qcvs.width = w;
    qcvs.height = h;
    qcvs.getContext('2d').putImageData(out, 0, 0);
    return canvasToBlob(qcvs, 'image/png');
  }

  // ================= 其他模块保持不变 =================

  // ZIP 打包下载
  zipBtn.addEventListener('click', function () {
    if (lastResults.length === 0 || !window.JSZip) return;
    zipBtn.disabled = true;
    zipBtn.textContent = '⏳ 打包中...';
    var zip = new JSZip();
    lastResults.forEach(function (item) { zip.file(item.name, item.blob); });
    zip.generateAsync({ type: 'blob' }).then(function (content) {
      saveBlob(content, 'converted_images_' + Date.now() + '.zip');
      zipBtn.disabled = false;
      zipBtn.textContent = '📦 打包下载 ZIP';
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
  var btnCopyExif = document.getElementById('btn-copy-exif');

  var currentExifImg = null;
  var currentExifExportMime = 'image/jpeg';
  var currentExifExportExt = 'jpg';
  var currentExifPreviewUrl = null;
  var currentExifRaw = null;

  exifDrop.addEventListener('click', function () { exifInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (evt) {
    exifDrop.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  exifDrop.addEventListener('dragenter', function () { exifDrop.classList.add('dragover'); });
  exifDrop.addEventListener('dragover', function () { exifDrop.classList.add('dragover'); });
  exifDrop.addEventListener('dragleave', function () { exifDrop.classList.remove('dragover'); });
  exifDrop.addEventListener('drop', function (e) {
    exifDrop.classList.remove('dragover');
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    var file = e.dataTransfer.files[0];
    if (!isImageFile(file)) { showToast('请拖入图片文件'); return; }
    processExifFile(file);
  });

  exifInput.addEventListener('change', function () {
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

  function flattenExif(obj, prefix) {
    prefix = prefix || '';
    var flat = {};
    if (!obj || typeof obj !== 'object') return flat;
    Object.keys(obj).forEach(function (k) {
      var val = obj[k];
      if (val && typeof val === 'object' && !(val instanceof Date) && !(val instanceof Uint8Array) && !Array.isArray(val)) {
        var nested = flattenExif(val, prefix + k + '.');
        Object.keys(nested).forEach(function (nk) { flat[nk] = nested[nk]; });
      } else {
        flat[prefix + k] = val;
      }
    });
    return flat;
  }

  function formatExifValue(val) {
    if (val instanceof Date) return val.toLocaleString();
    if (val instanceof Uint8Array) return '[' + val.length + ' bytes 数据]';
    if (typeof val === 'object' && val !== null) {
      try { return JSON.stringify(val); } catch (e) { return String(val); }
    }
    return String(val);
  }

  async function processExifFile(file) {
    if (!isImageFile(file)) { showToast('请选择图片文件'); return; }

    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var mime = file.type;

    if (mime === 'image/png' || ext === 'png') { currentExifExportMime = 'image/png'; currentExifExportExt = 'png'; }
    else if (mime === 'image/webp' || ext === 'webp') { currentExifExportMime = 'image/webp'; currentExifExportExt = 'webp'; }
    else { currentExifExportMime = 'image/jpeg'; currentExifExportExt = 'jpg'; }

    btnCleanExif.textContent = '🧹 一键清理并下载 (' + currentExifExportExt.toUpperCase() + ')';
    exifContent.style.display = 'block';

    if (currentExifPreviewUrl) URL.revokeObjectURL(currentExifPreviewUrl);
    currentExifPreviewUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      currentExifImg = img;
      exifPreview.innerHTML = '';
      img.style.maxHeight = '200px';
      img.style.borderRadius = '8px';
      exifPreview.appendChild(img);
      btnCleanExif.disabled = false;
    };
    img.onerror = function () {
      currentExifImg = null;
      exifPreview.innerHTML = '<p class="ic-hint" style="color:#a8452a;">此格式无法预览（如 HEIC/TIFF），但 EXIF 仍可读取</p>';
      btnCleanExif.disabled = true;
    };
    img.src = currentExifPreviewUrl;

    var tbody = exifTable.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#8a7a5f;">正在解析元数据...</td></tr>';

    try {
      if (typeof exifr === 'undefined') throw new Error('缺少 exifr 库');
      var output = await exifr.parse(file, true);
      currentExifRaw = output;

      if (!output || Object.keys(output).length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#8a7a5f;">未找到元数据信息 (此格式可能不包含 EXIF)</td></tr>';
        if (btnCopyExif) btnCopyExif.disabled = true;
        return;
      }

      var flat = flattenExif(output);
      var used = {};

      var categories = {
        '📷 相机参数': ['Make', 'Model', 'LensModel', 'LensMake', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'Flash', 'MeteringMode', 'ExposureProgram', 'ExposureCompensation', 'WhiteBalance', 'ApertureValue', 'ShutterSpeedValue', 'BrightnessValue', 'ExposureMode', 'FocalLengthIn35mmFormat', 'SceneCaptureType'],
        '📅 时间信息': ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTimeDigitized', 'OffsetTime', 'SubSecTime', 'GPSDateStamp'],
        '📍 位置信息': ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSLatitudeRef', 'GPSLongitudeRef', 'GPSAltitudeRef', 'GPSSpeed', 'GPSTrack', 'GPSImgDirection', 'GPSProcessingMethod', 'GPSVersionID'],
        '🖼️ 图像属性': ['ImageWidth', 'ImageHeight', 'Orientation', 'ColorSpace', 'XResolution', 'YResolution', 'ResolutionUnit', 'Software', 'BitsPerSample', 'SamplesPerPixel', 'Compression', 'PhotometricInterpretation', 'ExifImageWidth', 'ExifImageHeight', 'YCbCrPositioning', 'Thumbnail', 'thumbnail']
      };

      tbody.innerHTML = '';

      Object.keys(categories).forEach(function (catName) {
        var keysInCat = categories[catName];
        var found = [];
        Object.keys(flat).forEach(function (k) {
          var leaf = k.split('.').pop();
          if (keysInCat.indexOf(leaf) !== -1 && !used[k]) found.push(k);
        });
        if (found.length === 0) return;
        var hr = document.createElement('tr');
        hr.innerHTML = '<th colspan="2" class="exif-category">' + catName + '</th>';
        tbody.appendChild(hr);
        found.forEach(function (k) {
          used[k] = true;
          var tr = document.createElement('tr');
          tr.innerHTML = '<th>' + escapeHtml(k) + '</th><td>' + escapeHtml(formatExifValue(flat[k])) + '</td>';
          tbody.appendChild(tr);
        });
      });

      var others = Object.keys(flat).filter(function (k) { return !used[k]; });
      if (others.length > 0) {
        var hr2 = document.createElement('tr');
        hr2.innerHTML = '<th colspan="2" class="exif-category">ℹ️ 其他</th>';
        tbody.appendChild(hr2);
        others.forEach(function (k) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<th>' + escapeHtml(k) + '</th><td>' + escapeHtml(formatExifValue(flat[k])) + '</td>';
          tbody.appendChild(tr);
        });
      }

      if (btnCopyExif) btnCopyExif.disabled = false;
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#a8452a;">解析失败: ' + escapeHtml(err.message) + '</td></tr>';
    }
  }

  if (btnCopyExif) {
    btnCopyExif.addEventListener('click', function () {
      if (!currentExifRaw) return;
      var text = JSON.stringify(currentExifRaw, function (k, v) {
        if (v instanceof Date) return v.toISOString();
        if (v instanceof Uint8Array) return '[' + v.length + ' bytes]';
        return v;
      }, 2);
      navigator.clipboard.writeText(text).then(function () {
        showToast('EXIF 已复制到剪贴板');
      }).catch(function () {
        showToast('复制失败');
      });
    });
  }

  btnCleanExif.addEventListener('click', function () {
    if (!currentExifImg) return;
    var originalText = btnCleanExif.textContent;
    btnCleanExif.disabled = true;
    btnCleanExif.textContent = '⏳ 正在清理...';

    var cvs = document.createElement('canvas');
    cvs.width = currentExifImg.naturalWidth || currentExifImg.width;
    cvs.height = currentExifImg.naturalHeight || currentExifImg.height;
    var ctx = cvs.getContext('2d');

    if (currentExifExportMime === 'image/jpeg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
    ctx.drawImage(currentExifImg, 0, 0);

    cvs.toBlob(async function (blob) {
      var finalBlob = blob;
      if (currentExifExportMime === 'image/jpeg') {
        try {
          var buffer = await blob.arrayBuffer();
          finalBlob = stripJpegMetadata(buffer);
        } catch (e) { console.warn('JPG 深度清洗失败', e); }
      }
      saveBlob(finalBlob, 'clean_' + Date.now() + '.' + currentExifExportExt);
      btnCleanExif.disabled = false;
      btnCleanExif.textContent = originalText;
      showToast('清理完成');
    }, currentExifExportMime, 0.92);
  });

  function stripJpegMetadata(arrayBuffer) {
    var data = new Uint8Array(arrayBuffer);
    if (data[0] !== 0xFF || data[1] !== 0xD8) return new Blob([data], { type: 'image/jpeg' });

    var chunks = [data.subarray(0, 2)];
    var offset = 2;

    while (offset < data.length) {
      if (data[offset] !== 0xFF) {
        chunks.push(data.subarray(offset));
        break;
      }
      var marker = data[offset + 1];
      if (marker === 0xD9) {
        chunks.push(data.subarray(offset, offset + 2));
        break;
      }
      var length = (data[offset + 2] << 8) + data[offset + 3];
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
  var asciiHtmlBtn = document.getElementById('ascii-btn-html');
  var asciiOutput = document.getElementById('ascii-output');

  var currentAsciiImg = null;
  var lastAsciiText = '';
  var lastAsciiHtml = '';

  asciiWidthInput.addEventListener('input', function () { asciiWidthVal.textContent = this.value; });
  asciiBright.addEventListener('input', function () { asciiBrightVal.textContent = this.value; });
  asciiContrast.addEventListener('input', function () { asciiContrastVal.textContent = this.value; });
  asciiCharsetSelect.addEventListener('change', function () {
    asciiCustomRow.style.display = this.value === 'custom' ? 'block' : 'none';
  });

  asciiDrop.addEventListener('click', function () { asciiInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (evt) {
    asciiDrop.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  asciiDrop.addEventListener('dragenter', function () { asciiDrop.classList.add('dragover'); });
  asciiDrop.addEventListener('dragover', function () { asciiDrop.classList.add('dragover'); });
  asciiDrop.addEventListener('dragleave', function () { asciiDrop.classList.remove('dragover'); });
  asciiDrop.addEventListener('drop', function (e) {
    asciiDrop.classList.remove('dragover');
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    var file = e.dataTransfer.files[0];
    if (!isImageFile(file)) { showToast('请拖入图片文件'); return; }
    readFileAsImage(file, function (img) {
      currentAsciiImg = img;
      asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，请点击"生成"</p>';
    });
  });

  asciiInput.addEventListener('change', function () {
    var file = asciiInput.files[0];
    if (!file) return;
    readFileAsImage(file, function (img) {
      currentAsciiImg = img;
      asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，请点击"生成"</p>';
    });
    asciiInput.value = '';
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
          readFileAsImage(f, function (img) {
            currentAsciiImg = img;
            asciiOutput.innerHTML = '<p style="color:#7ba05b; padding:20px;">图片已加载，请点击"生成"</p>';
          });
        }
        return;
      }
    }
  });

  asciiBtn.addEventListener('click', async function () {
    if (!currentAsciiImg) return showToast('请先上传图片');

    var w = parseInt(asciiWidthInput.value, 10);
    var srcW = currentAsciiImg.naturalWidth || currentAsciiImg.width;
    var srcH = currentAsciiImg.naturalHeight || currentAsciiImg.height;
    var h = Math.round(w * (srcH / srcW) * 0.5);

    var cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    var ctx = cvs.getContext('2d');

    var usePica = getPica() && w < srcW / 2;
    if (usePica) {
      try {
        await getPica().resize(currentAsciiImg, cvs, { unsharpAmount: 0 });
      } catch (e) {
        ctx.drawImage(currentAsciiImg, 0, 0, w, h);
      }
    } else {
      ctx.drawImage(currentAsciiImg, 0, 0, w, h);
    }

    var data = ctx.getImageData(0, 0, w, h).data;

    var charsetVal = asciiCharsetSelect.value;
    var chars = '';
    if (charsetVal === '01') chars = '01';
    else if (charsetVal === 'standard') chars = '@%#*+=-:. ';
    else if (charsetVal === 'detailed') chars = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ';
    else if (charsetVal === 'blocks') chars = '█▓▒░ ';
    else if (charsetVal === 'blocks2') chars = ' .:-=+*#%@';
    else chars = asciiCustomChars.value || '@%#*+=-:. ';

    if (chars.length < 2) chars = '@.';

    var bOffset = parseInt(asciiBright.value, 10);
    var cVal = parseInt(asciiContrast.value, 10);
    var cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
    var isInvert = asciiInvert.checked;
    var isColor = asciiColor.checked;

    var htmlStr = '<pre>';
    lastAsciiText = '';
    lastAsciiHtml = '';

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var offset = (y * w + x) * 4;
        var r = data[offset], g = data[offset + 1], b = data[offset + 2];

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
        var charHtml = char;
        if (char === ' ') charHtml = '&nbsp;';
        else if (char === '<') charHtml = '&lt;';
        else if (char === '>') charHtml = '&gt;';
        else if (char === '&') charHtml = '&amp;';

        lastAsciiText += char;

        if (isColor) {
          htmlStr += '<span style="color:rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ');">' + charHtml + '</span>';
          lastAsciiHtml += '<span style="color:rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ');">' + charHtml + '</span>';
        } else {
          htmlStr += charHtml;
          lastAsciiHtml += charHtml;
        }
      }
      htmlStr += '<br>';
      lastAsciiText += '\n';
      lastAsciiHtml += '<br>';
    }
    htmlStr += '</pre>';

    asciiOutput.innerHTML = htmlStr;
    asciiCopyBtn.disabled = false;
    asciiDlBtn.disabled = false;
    if (asciiHtmlBtn) asciiHtmlBtn.disabled = false;
  });

  asciiCopyBtn.addEventListener('click', function () {
    if (!lastAsciiText) return;
    navigator.clipboard.writeText(lastAsciiText).then(function () {
      showToast('已复制到剪贴板');
    }).catch(function () {
      showToast('复制失败');
    });
  });

  asciiDlBtn.addEventListener('click', function () {
    if (!lastAsciiText) return;
    var blob = new Blob([lastAsciiText], { type: 'text/plain;charset=utf-8' });
    saveBlob(blob, 'ascii_art_' + Date.now() + '.txt');
    showToast('已下载');
  });

  if (asciiHtmlBtn) {
    asciiHtmlBtn.addEventListener('click', function () {
      if (!lastAsciiHtml) return;
      var htmlDoc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>ASCII Art</title></head>' +
        '<body style="background:#fff;color:#000;margin:0;padding:20px;">' +
        '<pre style="font-family:monospace;font-size:6px;line-height:0.9;letter-spacing:0.5px;font-weight:bold;margin:0;">' +
        lastAsciiHtml + '</pre></body></html>';
      var blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
      saveBlob(blob, 'ascii_art_' + Date.now() + '.html');
      showToast('已下载 HTML');
    });
  }

})();