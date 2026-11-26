// 文件: js/image-slicer.js
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
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
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

  function getWatermarkText() {
    var el = document.getElementById('global-watermark');
    return el ? el.value.trim() : '';
  }

  function applyWatermark(canvas, text) {
    if (!text) return canvas;
    var ctx = canvas.getContext('2d');
    var fontSize = Math.round(Math.min(canvas.width, canvas.height) * 0.03);
    fontSize = Math.max(14, Math.min(fontSize, 120));
    var padding = Math.round(fontSize * 0.7);
    ctx.save();
    ctx.font = '600 ' + fontSize + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.15));
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(text, canvas.width - padding, canvas.height - padding);
    ctx.restore();
    return canvas;
  }

  function drawRoundRect(ctx, x, y, w, h, r) {
    if (r <= 0) { ctx.rect(x, y, w, h); return; }
    var maxR = Math.min(w, h) / 2;
    if (r > maxR) r = maxR;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  var MAX_DIM = 16384;
  var MAX_PIXELS = 100 * 1024 * 1024;
  function checkCanvasSize(w, h) {
    return w <= MAX_DIM && h <= MAX_DIM && w * h <= MAX_PIXELS;
  }

  // ================== pica 缩放封装 ==================
  var picaInstance = null;
  function getPica() {
    if (picaInstance) return picaInstance;
    if (typeof window.pica === 'function') {
      try { picaInstance = window.pica(); } catch (e) { return null; }
    }
    return picaInstance || null;
  }

  function fallbackResize(source, dest) {
    var ctx = dest.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, dest.width, dest.height);
    return dest;
  }

  // 支持 <img> 或 <canvas> 源，统一返回 Promise<canvas>
  function resizeToCanvas(source, targetW, targetH, sharpen) {
    targetW = Math.max(1, Math.round(targetW));
    targetH = Math.max(1, Math.round(targetH));

    var srcW = source.naturalWidth || source.width;
    var srcH = source.naturalHeight || source.height;

    if (srcW === targetW && srcH === targetH) {
      if (source.tagName === 'CANVAS') return Promise.resolve(source);
      var c = document.createElement('canvas');
      c.width = srcW; c.height = srcH;
      c.getContext('2d').drawImage(source, 0, 0);
      return Promise.resolve(c);
    }

    var dest = document.createElement('canvas');
    dest.width = targetW;
    dest.height = targetH;

    var p = getPica();
    var isDownscale = targetW < srcW || targetH < srcH;

    if (p && srcW > 0 && srcH > 0) {
      try {
        return p.resize(source, dest, {
          unsharpAmount: (sharpen && isDownscale) ? 80 : 0,
          unsharpRadius: 0.6,
          unsharpThreshold: 2
        }).then(function () {
          return dest;
        }, function (err) {
          console.warn('[pica] resize failed:', err);
          return fallbackResize(source, dest);
        });
      } catch (e) {
        console.warn('[pica] resize threw:', e);
      }
    }
    return Promise.resolve(fallbackResize(source, dest));
  }

  // ================== 全局 UI ==================
  document.getElementById('global-quality').addEventListener('input', function () {
    document.getElementById('global-quality-val').textContent = this.value + '%';
  });

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
      readFileAsImage(files[0], function (img, file) { setSliceImage(img, file); });
    } else if (activeTab === 'panel-long') {
      files.forEach(function (f) { readFileAsImage(f, function (img, file) { addLongImage(img, file); }); });
    } else if (activeTab === 'panel-grid') {
      files.forEach(function (f) { readFileAsImage(f, function (img, file) { addGridImage(img, file); }); });
    }
  });


  // ================= 模块 1：网格切图 =================
  var sliceInput = document.getElementById('slice-input');
  var sliceDrop = document.getElementById('slice-drop');
  var slicePreview = document.getElementById('slice-preview');
  var btnSlice = document.getElementById('btn-slice');
  var sliceRows = document.getElementById('slice-rows');
  var sliceCols = document.getElementById('slice-cols');
  var sliceScale = document.getElementById('slice-scale');
  var sliceMaxDim = document.getElementById('slice-max-dim');
  var sliceImg = null;
  var sliceFile = null;

  setupDropZone(sliceDrop, sliceInput, function (files) {
    readFileAsImage(files[0], function (img, file) { setSliceImage(img, file); });
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

    var boundsX = [];
    var boundsY = [];
    for (var i = 0; i <= cols; i++) boundsX.push(Math.round(i * sliceImg.width / cols));
    for (var j = 0; j <= rows; j++) boundsY.push(Math.round(j * sliceImg.height / rows));

    var previewMaxSize = 200;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var format = getExportFormat();

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var sx = boundsX[c];
        var sy = boundsY[r];
        var sw = boundsX[c + 1] - sx;
        var sh = boundsY[r + 1] - sy;
        if (sw <= 0 || sh <= 0) continue;

        var scale = Math.min(1, previewMaxSize / Math.max(sw, sh));
        var pw = Math.max(1, Math.round(sw * scale));
        var ph = Math.max(1, Math.round(sh * scale));

        canvas.width = pw;
        canvas.height = ph;
        ctx.clearRect(0, 0, pw, ph);
        if (format.fillWhite) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pw, ph);
        }
        ctx.drawImage(sliceImg, sx, sy, sw, sh, 0, 0, pw, ph);

        var imgDom = document.createElement('img');
        imgDom.src = canvas.toDataURL('image/jpeg', 0.5);
        slicePreview.appendChild(imgDom);
      }
    }
  }

  btnSlice.addEventListener('click', async function () {
    if (!sliceImg) return;
    btnSlice.textContent = '⏳ 正在处理...';
    btnSlice.disabled = true;

    try {
      var rows = Math.max(1, Math.min(20, parseInt(sliceRows.value, 10) || 1));
      var cols = Math.max(1, Math.min(20, parseInt(sliceCols.value, 10) || 1));
      var scalePct = (parseFloat(sliceScale.value) || 100) / 100;
      var maxDim = parseInt(sliceMaxDim.value, 10) || 0;
      var format = getExportFormat();
      var watermark = getWatermarkText();
      var prefix = sliceFile ? sliceFile.name.replace(/\.[^/.]+$/, "") : 'slice';

      var boundsX = [];
      var boundsY = [];
      for (var i = 0; i <= cols; i++) boundsX.push(Math.round(i * sliceImg.width / cols));
      for (var j = 0; j <= rows; j++) boundsY.push(Math.round(j * sliceImg.height / rows));

      var promises = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          (function (row, col) {
            var sx = boundsX[col];
            var sy = boundsY[row];
            var sw = boundsX[col + 1] - sx;
            var sh = boundsY[row + 1] - sy;

            promises.push((async function () {
              if (sw <= 0 || sh <= 0) return null;

              // 目标尺寸
              var tw = Math.max(1, Math.round(sw * scalePct));
              var th = Math.max(1, Math.round(sh * scalePct));
              if (maxDim > 0) {
                var maxCur = Math.max(tw, th);
                if (maxCur > maxDim) {
                  var f = maxDim / maxCur;
                  tw = Math.max(1, Math.round(tw * f));
                  th = Math.max(1, Math.round(th * f));
                }
              }

              // 切图源
              var srcCanvas = document.createElement('canvas');
              srcCanvas.width = sw;
              srcCanvas.height = sh;
              var sctx = srcCanvas.getContext('2d');
              if (format.fillWhite) {
                sctx.fillStyle = '#ffffff';
                sctx.fillRect(0, 0, sw, sh);
              }
              sctx.drawImage(sliceImg, sx, sy, sw, sh, 0, 0, sw, sh);

              // 缩放
              var outCanvas = srcCanvas;
              if (tw !== sw || th !== sh) {
                outCanvas = await resizeToCanvas(srcCanvas, tw, th, true);
              }

              // 水印
              if (watermark) outCanvas = applyWatermark(outCanvas, watermark);

              var blob = await new Promise(function (resolve) {
                outCanvas.toBlob(resolve, format.mime, format.quality);
              });

              return {
                name: prefix + '_' + (row + 1) + '_' + (col + 1) + '.' + format.ext,
                blob: blob
              };
            })());
          })(r, c);
        }
      }

      var results = (await Promise.all(promises)).filter(Boolean);
      var zip = new JSZip();
      results.forEach(function (item) {
        if (item.blob) zip.file(item.name, item.blob);
      });

      var content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, prefix + '_sliced.zip');
      showToast('切图打包完成');
    } catch (err) {
      console.error(err);
      showToast('切图失败: ' + (err.message || err));
    } finally {
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
  var longUnify = document.getElementById('long-unify');
  var longTarget = document.getElementById('long-target');
  var longRadius = document.getElementById('long-radius');
  var longScale = document.getElementById('long-scale');

  var longImages = [];

  setupDropZone(longDrop, longInput, function (files) {
    files.forEach(function (f) { readFileAsImage(f, function (img, file) { addLongImage(img, file); }); });
  });

  function addLongImage(img, file) {
    longImages.push({ img: img, file: file });
    renderLongList();
    updateLongPreview();
  }

  function renderLongList() {
    longList.innerHTML = '';
    longImages.forEach(function (item, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>图片 ' + (i + 1) + ' (' + item.img.width + '×' + item.img.height + ')</span>' +
        '<div class="ops">' +
        '<button class="op-btn up" data-i="' + i + '">↑</button>' +
        '<button class="op-btn down" data-i="' + i + '">↓</button>' +
        '<button class="op-btn del" data-i="' + i + '">×</button>' +
        '</div>';
      longList.appendChild(li);
    });
    btnLong.disabled = longImages.length === 0;

    longList.querySelectorAll('.op-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(this.dataset.i, 10);
        if (this.classList.contains('up') && i > 0) {
          var temp = longImages[i];
          longImages[i] = longImages[i - 1];
          longImages[i - 1] = temp;
        } else if (this.classList.contains('down') && i < longImages.length - 1) {
          var temp = longImages[i];
          longImages[i] = longImages[i + 1];
          longImages[i + 1] = temp;
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

  [longDirection, longAlign, longGap, longBg, longUnify, longTarget, longRadius, longScale].forEach(function (el) {
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
    var radius = parseInt(longRadius.value, 10) || 0;
    var scalePct = (parseFloat(longScale.value) || 100) / 100;
    var unify = longUnify.checked;
    var targetVal = parseInt(longTarget.value, 10) || 0;

    var autoUnify = 0;
    if (isVertical) {
      autoUnify = Math.max.apply(null, longImages.map(function (x) { return x.img.width; }));
    } else {
      autoUnify = Math.max.apply(null, longImages.map(function (x) { return x.img.height; }));
    }
    var unifyVal = targetVal > 0 ? targetVal : autoUnify;

    var processed = [];
    var totalW = 0, totalH = 0, maxItemW = 0, maxItemH = 0;

    longImages.forEach(function (item) {
      var tw = item.img.width, th = item.img.height;
      if (isVertical && unify) {
        tw = unifyVal;
        th = Math.round(item.img.height * (unifyVal / item.img.width));
      } else if (!isVertical && unify) {
        th = unifyVal;
        tw = Math.round(item.img.width * (unifyVal / item.img.height));
      }
      tw = Math.max(1, Math.round(tw * scalePct));
      th = Math.max(1, Math.round(th * scalePct));
      processed.push({ img: item.img, w: tw, h: th });
      if (isVertical) {
        totalH += th;
        if (tw > maxItemW) maxItemW = tw;
      } else {
        totalW += tw;
        if (th > maxItemH) maxItemH = th;
      }
    });
    if (isVertical) totalH += (processed.length - 1) * gap;
    else totalW += (processed.length - 1) * gap;

    var finalW = isVertical ? maxItemW : totalW;
    var finalH = isVertical ? totalH : maxItemH;

    var maxPreview = 800;
    var scale = Math.min(1, maxPreview / Math.max(finalW, finalH));
    var previewW = Math.max(1, Math.round(finalW * scale));
    var previewH = Math.max(1, Math.round(finalH * scale));

    longCanvas.width = previewW;
    longCanvas.height = previewH;
    var ctx = longCanvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, previewW, previewH);

    var currentPos = 0;
    processed.forEach(function (p) {
      var pw = p.w * scale;
      var ph = p.h * scale;
      var x = 0, y = 0;
      if (isVertical) {
        if (align === 'center') x = (previewW - pw) / 2;
        else if (align === 'right') x = previewW - pw;
        y = currentPos;
        currentPos += ph + gap * scale;
      } else {
        if (align === 'center') y = (previewH - ph) / 2;
        else if (align === 'right') y = previewH - ph;
        x = currentPos;
        currentPos += pw + gap * scale;
      }

      if (radius > 0) {
        ctx.save();
        drawRoundRect(ctx, x, y, pw, ph, radius * scale);
        ctx.clip();
        ctx.drawImage(p.img, x, y, pw, ph);
        ctx.restore();
      } else {
        ctx.drawImage(p.img, x, y, pw, ph);
      }
    });
  }

  btnLong.addEventListener('click', async function () {
    if (longImages.length === 0) return;
    btnLong.textContent = '⏳ 正在拼接...';
    btnLong.disabled = true;

    try {
      var isVertical = longDirection.value === 'vertical';
      var gap = parseInt(longGap.value, 10) || 0;
      var align = longAlign.value;
      var bgColor = longBg.value;
      var radius = parseInt(longRadius.value, 10) || 0;
      var format = getExportFormat();
      var watermark = getWatermarkText();
      var scalePct = (parseFloat(longScale.value) || 100) / 100;
      var unify = longUnify.checked;
      var targetVal = parseInt(longTarget.value, 10) || 0;

      var autoUnify = 0;
      if (isVertical) {
        autoUnify = Math.max.apply(null, longImages.map(function (x) { return x.img.width; }));
      } else {
        autoUnify = Math.max.apply(null, longImages.map(function (x) { return x.img.height; }));
      }
      var unifyVal = targetVal > 0 ? targetVal : autoUnify;

      // 处理每张图片
      var processed = [];
      for (var i = 0; i < longImages.length; i++) {
        var img = longImages[i].img;
        var tw = img.width, th = img.height;
        if (isVertical && unify) {
          tw = unifyVal;
          th = Math.round(img.height * (unifyVal / img.width));
        } else if (!isVertical && unify) {
          th = unifyVal;
          tw = Math.round(img.width * (unifyVal / img.height));
        }
        tw = Math.max(1, Math.round(tw * scalePct));
        th = Math.max(1, Math.round(th * scalePct));

        var source;
        if (tw !== img.width || th !== img.height) {
          source = await resizeToCanvas(img, tw, th, true);
        } else {
          source = img;
        }
        processed.push({ source: source, width: tw, height: th });
      }

      // 计算最终尺寸
      var totalW = 0, totalH = 0, maxW = 0, maxH = 0;
      processed.forEach(function (p) {
        if (isVertical) {
          totalH += p.height;
          if (p.width > maxW) maxW = p.width;
        } else {
          totalW += p.width;
          if (p.height > maxH) maxH = p.height;
        }
      });
      if (isVertical) totalH += (processed.length - 1) * gap;
      else totalW += (processed.length - 1) * gap;

      var finalW = isVertical ? maxW : totalW;
      var finalH = isVertical ? totalH : maxH;

      if (!checkCanvasSize(finalW, finalH)) {
        showToast('输出尺寸过大，请减小倍率或开启统一尺寸');
        btnLong.textContent = '▶️ 开始拼接并下载';
        btnLong.disabled = false;
        return;
      }

      var canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, finalW, finalH);

      var currentPos = 0;
      processed.forEach(function (p) {
        var x = 0, y = 0;
        if (isVertical) {
          if (align === 'center') x = Math.round((finalW - p.width) / 2);
          else if (align === 'right') x = finalW - p.width;
          y = currentPos;
          currentPos += p.height + gap;
        } else {
          if (align === 'center') y = Math.round((finalH - p.height) / 2);
          else if (align === 'right') y = finalH - p.height;
          x = currentPos;
          currentPos += p.width + gap;
        }

        if (radius > 0) {
          ctx.save();
          drawRoundRect(ctx, x, y, p.width, p.height, radius);
          ctx.clip();
          ctx.drawImage(p.source, x, y, p.width, p.height);
          ctx.restore();
        } else {
          ctx.drawImage(p.source, x, y, p.width, p.height);
        }
      });

      applyWatermark(canvas, watermark);

      canvas.toBlob(function (blob) {
        downloadBlob(blob, 'combined_' + Date.now() + '.' + format.ext);
        showToast('拼接完成');
        btnLong.textContent = '▶️ 开始拼接并下载';
        btnLong.disabled = false;
      }, format.mime, format.quality);

    } catch (err) {
      console.error(err);
      showToast('拼接失败: ' + (err.message || err));
      btnLong.textContent = '▶️ 开始拼接并下载';
      btnLong.disabled = false;
    }
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
  var gridCellMode = document.getElementById('grid-cell-mode');
  var gridCellSize = document.getElementById('grid-cell-size');
  var gridScale = document.getElementById('grid-scale');

  var gridImages = [];

  setupDropZone(gridDrop, gridInput, function (files) {
    files.forEach(function (f) { readFileAsImage(f, function (img, file) { addGridImage(img, file); }); });
  });

  function addGridImage(img, file) {
    gridImages.push({ img: img, file: file });
    renderGridList();
    updateGridPreview();
  }

  function renderGridList() {
    gridList.innerHTML = '';
    gridImages.forEach(function (item, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>图片 ' + (i + 1) + ' (' + item.img.width + '×' + item.img.height + ')</span>' +
        '<div class="ops">' +
        '<button class="op-btn up" data-i="' + i + '">↑</button>' +
        '<button class="op-btn down" data-i="' + i + '">↓</button>' +
        '<button class="op-btn del" data-i="' + i + '">×</button>' +
        '</div>';
      gridList.appendChild(li);
    });
    btnGrid.disabled = gridImages.length === 0;

    gridList.querySelectorAll('.op-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(this.dataset.i, 10);
        if (this.classList.contains('up') && i > 0) {
          var temp = gridImages[i];
          gridImages[i] = gridImages[i - 1];
          gridImages[i - 1] = temp;
        } else if (this.classList.contains('down') && i < gridImages.length - 1) {
          var temp = gridImages[i];
          gridImages[i] = gridImages[i + 1];
          gridImages[i + 1] = temp;
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

  function updateGridCellSizeVisibility() {
    if (gridCellMode.value === 'fixed') {
      gridCellSize.style.display = '';
    } else {
      gridCellSize.style.display = 'none';
    }
  }

  gridCellMode.addEventListener('change', function () {
    updateGridCellSizeVisibility();
    updateGridPreview();
  });

  [gridCols, gridGap, gridRadius, gridBg, gridCellSize, gridScale].forEach(function (el) {
    el.addEventListener('input', updateGridPreview);
    el.addEventListener('change', updateGridPreview);
  });

  updateGridCellSizeVisibility();

  function calcCellSize() {
    var cellSize;
    if (gridCellMode.value === 'fixed') {
      cellSize = parseInt(gridCellSize.value, 10) || 400;
    } else {
      cellSize = 0;
      gridImages.forEach(function (item) {
        var m = Math.max(item.img.width, item.img.height);
        if (m > cellSize) cellSize = m;
      });
      if (cellSize === 0) cellSize = 400;
    }
    var scalePct = (parseFloat(gridScale.value) || 100) / 100;
    return Math.max(1, Math.round(cellSize * scalePct));
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
    var scalePct = (parseFloat(gridScale.value) || 100) / 100;
    var cellSize = calcCellSize();
    var outGap = Math.max(0, Math.round(gap * scalePct));
    var outRadius = Math.max(0, Math.round(radius * scalePct));

    var totalW = cols * cellSize + (cols - 1) * outGap;
    var totalH = rows * cellSize + (rows - 1) * outGap;

    var maxPreview = 800;
    var s = Math.min(1, maxPreview / Math.max(totalW, totalH));
    var previewW = Math.max(1, Math.round(totalW * s));
    var previewH = Math.max(1, Math.round(totalH * s));

    gridCanvas.width = previewW;
    gridCanvas.height = previewH;
    var ctx = gridCanvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, previewW, previewH);

    var pCell = cellSize * s;
    var pGap = outGap * s;
    var pRadius = outRadius * s;

    for (var i = 0; i < gridImages.length; i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      var x = c * (pCell + pGap);
      var y = r * (pCell + pGap);

      var img = gridImages[i].img;
      var imgScale = Math.max(pCell / img.width, pCell / img.height);
      var w = img.width * imgScale;
      var h = img.height * imgScale;
      var dx = x + (pCell - w) / 2;
      var dy = y + (pCell - h) / 2;

      ctx.save();
      drawRoundRect(ctx, x, y, pCell, pCell, pRadius);
      ctx.clip();
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
    }
  }

  btnGrid.addEventListener('click', async function () {
    if (gridImages.length === 0) return;
    btnGrid.textContent = '⏳ 正在拼图...';
    btnGrid.disabled = true;

    try {
      var cols = parseInt(gridCols.value, 10) || 1;
      if (cols < 1) cols = 1;
      var rows = Math.ceil(gridImages.length / cols);
      var gap = parseInt(gridGap.value, 10) || 0;
      var radius = parseInt(gridRadius.value, 10) || 0;
      var bgColor = gridBg.value;
      var format = getExportFormat();
      var watermark = getWatermarkText();
      var scalePct = (parseFloat(gridScale.value) || 100) / 100;

      var cellSize = calcCellSize();
      var outGap = Math.max(0, Math.round(gap * scalePct));
      var outRadius = Math.max(0, Math.round(radius * scalePct));

      var totalW = cols * cellSize + (cols - 1) * outGap;
      var totalH = rows * cellSize + (rows - 1) * outGap;

      if (!checkCanvasSize(totalW, totalH)) {
        showToast('输出尺寸过大，请减小格子尺寸或倍率');
        btnGrid.textContent = '▶️ 开始拼图并下载';
        btnGrid.disabled = false;
        return;
      }

      // 逐张准备图片（大图先用 pica 预缩小）
      var sources = [];
      for (var i = 0; i < gridImages.length; i++) {
        var img = gridImages[i].img;
        var source = img;
        var maxSide = Math.max(img.width, img.height);
        var preTarget = cellSize * 2;
        if (maxSide > preTarget * 2) {
          var ratio = preTarget / maxSide;
          var nw = Math.max(1, Math.round(img.width * ratio));
          var nh = Math.max(1, Math.round(img.height * ratio));
          try {
            source = await resizeToCanvas(img, nw, nh, true);
          } catch (e) {
            source = img;
          }
        }
        sources.push(source);
      }

      var canvas = document.createElement('canvas');
      canvas.width = totalW;
      canvas.height = totalH;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, totalW, totalH);

      for (var i = 0; i < sources.length; i++) {
        var r = Math.floor(i / cols);
        var c = i % cols;
        var x = c * (cellSize + outGap);
        var y = r * (cellSize + outGap);

        var src = sources[i];
        var srcW = src.naturalWidth || src.width;
        var srcH = src.naturalHeight || src.height;

        // cover 居中裁剪
        var coverScale = Math.max(cellSize / srcW, cellSize / srcH);
        var cropW = cellSize / coverScale;
        var cropH = cellSize / coverScale;
        var cropX = (srcW - cropW) / 2;
        var cropY = (srcH - cropH) / 2;

        ctx.save();
        drawRoundRect(ctx, x, y, cellSize, cellSize, outRadius);
        ctx.clip();
        ctx.drawImage(src, cropX, cropY, cropW, cropH, x, y, cellSize, cellSize);
        ctx.restore();
      }

      applyWatermark(canvas, watermark);

      canvas.toBlob(function (blob) {
        downloadBlob(blob, 'collage_' + Date.now() + '.' + format.ext);
        showToast('拼图完成');
        btnGrid.textContent = '▶️ 开始拼图并下载';
        btnGrid.disabled = false;
      }, format.mime, format.quality);

    } catch (err) {
      console.error(err);
      showToast('拼图失败: ' + (err.message || err));
      btnGrid.textContent = '▶️ 开始拼图并下载';
      btnGrid.disabled = false;
    }
  });

})();