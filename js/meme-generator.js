/* ============================================================
 * Meme 梗图生成器  meme-generator.js
 * 纯原生 JS（Canvas 2D），无 mjs / wasm / onnx
 * 可选依赖：js/libs/FileSaver.min.js（存在时用 saveAs 保存，否则用 <a download> 兜底）
 * ============================================================ */
(function () {
  'use strict';

  // ================== DOM 引用 ==================
  function el(id) { return document.getElementById(id); }

  var dropZone       = el('drop-zone');
  var fileInput      = el('file-input');
  var imgInfoEl      = el('img-info');
  var emptyHint      = el('empty-hint');
  var canvas         = el('meme-canvas');
  var ctx            = canvas ? canvas.getContext('2d') : null;
  var settings       = el('settings');

  var imgFilterEl    = el('img-filter');
  var btnRotL        = el('btn-rotate-left');
  var btnRotR        = el('btn-rotate-right');
  var btnFlipH       = el('btn-flip-h');
  var btnFlipV       = el('btn-flip-v');

  var textTopEl      = el('text-top');
  var textMiddleEl   = el('text-middle');
  var textBottomEl   = el('text-bottom');

  var fontFamilyEl   = el('font-family');
  var fontInput      = el('font-input');
  var fontNameEl     = el('font-name');
  var fontSizeEl     = el('font-size');
  var fontSizeVal    = el('font-size-val');
  var textAlignEl    = el('text-align');
  var textColorEl    = el('text-color');
  var strokeColorEl  = el('stroke-color');
  var strokeWidthEl  = el('stroke-width');
  var strokeVal      = el('stroke-val');
  var lineHeightEl   = el('line-height');
  var lineHeightVal  = el('line-height-val');
  var offsetYEl      = el('offset-y');
  var offsetYVal     = el('offset-y-val');
  var allCapsEl      = el('all-caps');
  var useBgEl        = el('use-bg');
  var bgColorEl      = el('bg-color');
  var useShadowEl    = el('use-shadow');
  var shadowColorEl  = el('shadow-color');

  var exportFormatEl = el('export-format');
  var qualityEl      = el('export-quality');
  var qualityVal     = el('quality-val');
  var btnDownload    = el('btn-download');

  var toastEl        = el('toast');

  if (!canvas || !ctx) return;

  // ================== 状态变量 ==================
  var originalImg    = null;    // 原始图片对象
  var rotation       = 0;       // 0, 90, 180, 270
  var flipH          = false;
  var flipV          = false;
  var customFontName = 'Impact, "Arial Black", sans-serif';
  var fontToken      = 0;
  var toastTimer     = null;
  var currentFileSize = 0;
  var drawTimer      = null;
  var pixelateScale  = 1;       // 导出分辨率倍率
  var extraTexts     = [];      // 额外文字块
  var extraId        = 0;
  var stickers       = [];      // 贴纸
  var stickerId      = 0;
  var dragItem       = null;    // 正在拖拽的额外文字/贴纸
  var selItem        = null;    // 当前选中项
  var lastBlobUrl    = null;

  var PIXELATE_FLAG  = 'url(#pixelate)';

  // ================== 通用：Toast ==================
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // 保存：优先 FileSaver，失败/缺失时用 <a download>
  function saveBlob(blob, filename) {
    var done = false;
    try {
      if (typeof window.saveAs === 'function') {
        window.saveAs(blob, filename);
        done = true;
      }
    } catch (e) { done = false; }
    if (done) return;
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  // ================== 压缩算法（PNG / JPG / WebP 统一） ==================
  // 质量 1~100：
  //  - JPG / WebP：按质量编码；
  //  - PNG：质量 <100 时按质量降低颜色数（中位切分调色板 + Floyd–Steinberg 抖动），
  //    质量 1≈16 色，质量 100=256 色（无损）；降色后不更小则回退无损 PNG；
  //  - 结果比原图大时保留原文件。
  function encodeCanvas(sourceCanvas, format, quality01) {
    var q = Math.max(0.01, Math.min(1, quality01));
    var fmt = (format === 'image/jpeg' || format === 'image/webp') ? format : 'image/png';
    var origBytes = 0;
    try { origBytes = currentFileSize || 0; } catch (e) {}

    if (fmt === 'image/png') {
      return new Promise(function (resolve) {
        // 无损 PNG
        sourceCanvas.toBlob(function (blob) {
          if (!blob) { resolve(null); return; }
          if (q >= 1 || quality01 >= 100) {
            resolve(keepSmaller(blob, null));
            return;
          }
          // 降色压缩
          try {
            var maxColors = Math.round(16 + 240 * q); // 质量1≈16色，质量99≈253色
            var out = quantizeCanvas(sourceCanvas, maxColors);
            if (!out) { resolve(keepSmaller(blob, null)); return; }
            out.toBlob(function (qblob) {
              resolve(keepSmaller(blob, qblob));
            }, 'image/png');
          } catch (err) {
            resolve(keepSmaller(blob, null));
          }
        }, 'image/png');
      });
    }

    return new Promise(function (resolve) {
      sourceCanvas.toBlob(function (blob) {
        if (!blob) { resolve(null); return; }
        if (fmt === 'image/webp' && !blob.type && blob.size === 0) { resolve(null); return; }
        resolve(keepSmaller(blob, null));
      }, fmt, q);
    });

    function keepSmaller(originalBlob, candidateBlob) {
      if (!candidateBlob) return { blob: originalBlob, note: '原图体积更小' };
      if (!origBytes || candidateBlob.size <= originalBlob.size) {
        return { blob: candidateBlob, note: '' };
      }
      if (originalBlob.size <= candidateBlob.size) {
        return { blob: originalBlob, note: '压缩后更大，已保留原文件' };
      }
      return { blob: candidateBlob, note: '' };
    }
  }

  // PNG 降色：中位切分生成调色板 + Floyd–Steinberg 抖动；透明像素保留
  function quantizeCanvas(sourceCanvas, maxColors) {
    var w = sourceCanvas.width, h = sourceCanvas.height;
    if (!w || !h) return null;
    var sctx = sourceCanvas.getContext('2d');
    var data = sctx.getImageData(0, 0, w, h);
    var px = data.data;
    var palette = [];
    buildPalette(px, 0, maxColors, palette);
    if (!palette.length) return null;
    palette = palette.slice(0, maxColors);

    var out = document.createElement('canvas');
    out.width = w; out.height = h;
    var octx = out.getContext('2d');
    var outData = octx.createImageData(w, h);
    var opx = outData.data;

    // 索引图 + 抖动
    var idx = new Int32Array(w * h);
    for (var i = 0; i < w * h; i++) {
      var p = i * 4;
      if (px[p + 3] < 8) { idx[i] = -1; continue; }
      idx[i] = nearest(px[p], px[p + 1], px[p + 2]);
    }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var k = y * w + x;
        var q4 = k * 4;
        if (idx[k] < 0) { opx[q4] = opx[q4 + 1] = opx[q4 + 2] = opx[q4 + 3] = 0; continue; }
        var c = palette[idx[k]];
        opx[q4] = c[0]; opx[q4 + 1] = c[1]; opx[q4 + 2] = c[2]; opx[q4 + 3] = 255;
        var er = px[q4] - c[0], eg = px[q4 + 1] - c[1], eb = px[q4 + 2] - c[2];
        spread(x + 1, y, 7 / 16, er, eg, eb);
        spread(x - 1, y + 1, 3 / 16, er, eg, eb);
        spread(x, y + 1, 5 / 16, er, eg, eb);
        spread(x + 1, y + 1, 1 / 16, er, eg, eb);
      }
    }
    octx.putImageData(outData, 0, 0);
    return out;

    function spread(xx, yy, f, er, eg, eb) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) return;
      var kk = yy * w + xx;
      if (idx[kk] < 0) return;
      var pp = kk * 4;
      px[pp]     = Math.max(0, Math.min(255, px[pp]     + er * f));
      px[pp + 1] = Math.max(0, Math.min(255, px[pp + 1] + eg * f));
      px[pp + 2] = Math.max(0, Math.min(255, px[pp + 2] + eb * f));
    }
    function nearest(r, g, b) {
      var best = 0, bd = 1e18;
      for (var i = 0; i < palette.length; i++) {
        var c = palette[i];
        var d = (c[0] - r) * (c[0] - r) + (c[1] - g) * (c[1] - g) + (c[2] - b) * (c[2] - b);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function buildPalette(arr, depth, max, out) {
      var n = arr.length / 4;
      if (n === 0 || out.length >= max) return;
      var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0, cnt = 0;
      for (var i = 0; i < n; i++) {
        var p = i * 4;
        if (arr[p + 3] < 8) continue;
        cnt++;
        if (arr[p] < minR) minR = arr[p];
        if (arr[p] > maxR) maxR = arr[p];
        if (arr[p + 1] < minG) minG = arr[p + 1];
        if (arr[p + 1] > maxG) maxG = arr[p + 1];
        if (arr[p + 2] < minB) minB = arr[p + 2];
        if (arr[p + 2] > maxB) maxB = arr[p + 2];
      }
      if (!cnt) return;
      var rSpan = maxR - minR, gSpan = maxG - minG, bSpan = maxB - minB;
      var sumR = 0, sumG = 0, sumB = 0;
      for (var j = 0; j < n; j++) {
        var q2 = j * 4;
        if (arr[q2 + 3] < 8) continue;
        sumR += arr[q2]; sumG += arr[q2 + 1]; sumB += arr[q2 + 2];
      }
      var mean = [Math.round(sumR / cnt), Math.round(sumG / cnt), Math.round(sumB / cnt)];
      if (depth >= 7 || out.length + 1 >= max || (rSpan <= 8 && gSpan <= 8 && bSpan <= 8)) {
        out.push(mean);
        return;
      }
      var ch = (rSpan >= gSpan && rSpan >= bSpan) ? 0 : (gSpan >= bSpan ? 1 : 2);
      var lo = [], hi = [];
      for (var k = 0; k < n; k++) {
        var pk = k * 4;
        if (arr[pk + 3] < 8) continue;
        if (arr[pk + ch] <= mean[ch]) { lo.push(arr[pk], arr[pk + 1], arr[pk + 2], arr[pk + 3]); }
        else { hi.push(arr[pk], arr[pk + 1], arr[pk + 2], arr[pk + 3]); }
      }
      if (!lo.length || !hi.length) { out.push(mean); return; }
      buildPalette(lo, depth + 1, max, out);
      buildPalette(hi, depth + 1, max, out);
    }
  }

  // ================== 1. 图片上传 ==================
  function bindUploadZone(zone, input, onFiles) {
    if (!zone || !input) return;
    zone.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('input, button, a, label')) return;
      input.click();
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (n) {
      zone.addEventListener(n, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    zone.addEventListener('dragenter', function () { zone.classList.add('dragover'); });
    zone.addEventListener('dragover', function () { zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function (e) {
      zone.classList.remove('dragover');
      var dt = e.dataTransfer;
      if (!dt) return;
      var files = [];
      if (dt.files && dt.files.length) files = Array.prototype.slice.call(dt.files);
      else if (dt.items && dt.items.length) {
        for (var i = 0; i < dt.items.length; i++) {
          if (dt.items[i].kind === 'file') { var f = dt.items[i].getAsFile(); if (f) files.push(f); }
        }
      }
      if (files.length && onFiles) onFiles(files);
    });
    input.addEventListener('change', function () {
      if (input.files && input.files.length && onFiles) onFiles(Array.prototype.slice.call(input.files));
      input.value = '';
    });
  }

  bindUploadZone(dropZone, fileInput, function (files) {
    var f = files[0];
    if (f && f.type && f.type.indexOf('image/') !== 0) { showToast('请选择图片文件！'); return; }
    handleFile(f);
  });

  // 全局拖拽
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var f = e.dataTransfer.files[0];
      if (f.type && f.type.indexOf('image/') === 0) handleFile(f);
    }
  });

  // 粘贴图片
  document.addEventListener('paste', function (e) {
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type && item.type.indexOf('image') !== -1) {
        var file = item.getAsFile();
        if (file) { e.preventDefault(); handleFile(file); }
        return;
      }
    }
  });

  function handleFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) {
      showToast('请选择图片文件！');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        originalImg = img;
        rotation = 0;
        flipH = false;
        flipV = false;
        currentFileSize = file.size || 0;
        pixelateScale = 1;

        if (emptyHint) emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        if (settings) settings.classList.add('active');
        if (btnDownload) btnDownload.disabled = false;
        ['btn-export-all','btn-copy','btn-preview'].forEach(function(id){var b=el(id); if(b) b.disabled=false;});

        if (imgInfoEl) {
          imgInfoEl.style.display = 'block';
          imgInfoEl.textContent = '📐 ' + img.naturalWidth + ' × ' + img.naturalHeight +
            ' px | 📦 ' + formatSize(file.size) + ' | 📄 ' + (file.name || 'pasted.png');
        }
        updateCanvasSize();
        draw();
        showToast('图片加载成功');
      };
      img.onerror = function () { showToast('无法读取该图片'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    if (fileInput) fileInput.value = '';
  }

  // ================== 2. 图片操作与滤镜 ==================
  btnRotL.addEventListener('click', function () {
    if (!originalImg) return;
    rotation = (rotation - 90 + 360) % 360;
    updateCanvasSize();
    draw();
  });
  btnRotR.addEventListener('click', function () {
    if (!originalImg) return;
    rotation = (rotation + 90) % 360;
    updateCanvasSize();
    draw();
  });
  btnFlipH.addEventListener('click', function () {
    if (!originalImg) return;
    flipH = !flipH;
    draw();
  });
  btnFlipV.addEventListener('click', function () {
    if (!originalImg) return;
    flipV = !flipV;
    draw();
  });

  function updateCanvasSize() {
    if (!originalImg) return;
    if (rotation === 90 || rotation === 270) {
      canvas.width = originalImg.naturalHeight;
      canvas.height = originalImg.naturalWidth;
    } else {
      canvas.width = originalImg.naturalWidth;
      canvas.height = originalImg.naturalHeight;
    }
  }

  // ================== 3. 文字样式参数监听 ==================
  var inputIds = [
    'img-filter', 'text-top', 'text-middle', 'text-bottom', 'font-family',
    'font-size', 'text-align', 'text-color', 'stroke-color', 'stroke-width',
    'line-height', 'offset-y', 'all-caps', 'use-bg', 'bg-color', 'use-shadow', 'shadow-color',
    'font-scale', 'text-rotate'
  ];

  inputIds.forEach(function (id) {
    var node = el(id);
    if (!node) return;
    node.addEventListener('input', function () { onControlChange(node); });
    node.addEventListener('change', function () { onControlChange(node); });
  });

  function onControlChange(node) {
    var id = node.id;
    if (id === 'font-size' && fontSizeVal) fontSizeVal.textContent = node.value;
    if (id === 'stroke-width' && strokeVal) strokeVal.textContent = node.value;
    if (id === 'line-height' && lineHeightVal) lineHeightVal.textContent = (parseInt(node.value, 10) / 100).toFixed(1);
    if (id === 'offset-y' && offsetYVal) offsetYVal.textContent = node.value;
    if (id === 'font-scale') {
      var fs = el('font-scale-val');
      if (fs) fs.textContent = node.value + '%';
      pixelateScale = parseInt(node.value, 10) / 100;
    }
    if (id === 'text-rotate') {
      var tr = el('text-rotate-val');
      if (tr) tr.textContent = node.value + '°';
    }
    if (id === 'font-family') {
      customFontName = node.value;
      if (fontNameEl) fontNameEl.textContent = '';
    }
    if (id === 'img-filter' && node.value === PIXELATE_FLAG) {
      showToast('像素化已开启（导出时生效更清晰）');
    }
    scheduleDraw();
  }

  // 导出质量
  if (qualityEl) {
    qualityEl.addEventListener('input', function () {
      if (qualityVal) qualityVal.textContent = qualityEl.value;
    });
    qualityEl.addEventListener('change', function () {
      if (qualityVal) qualityVal.textContent = qualityEl.value;
    });
  }
  if (exportFormatEl) {
    exportFormatEl.addEventListener('change', function () {
      var v = exportFormatEl.value;
      var qrow = el('quality-row');
      if (qrow) qrow.style.display = (v === 'image/png') ? '' : '';
      if (qualityVal) qualityVal.textContent = qualityEl ? qualityEl.value : '92';
    });
  }

  // 字体上传
  if (fontInput) {
    fontInput.addEventListener('change', function () {
      var file = fontInput.files && fontInput.files[0];
      if (!file) return;
      var token = ++fontToken;
      if (fontNameEl) fontNameEl.textContent = '加载中…';
      var reader = new FileReader();
      reader.onload = function (e) {
        var uniqueName = 'MemeFont_' + token;
        try {
          var fontFace = new FontFace(uniqueName, e.target.result);
          fontFace.load().then(function (loadedFace) {
            document.fonts.add(loadedFace);
            if (token === fontToken) {
              customFontName = '"' + uniqueName + '", sans-serif';
              if (fontNameEl) fontNameEl.textContent = '✅ ' + file.name;
              scheduleDraw();
              showToast('字体加载成功');
            }
          }).catch(function () {
            if (token === fontToken) {
              showToast('字体解析失败');
              if (fontNameEl) fontNameEl.textContent = '';
              fontInput.value = '';
            }
          });
        } catch (err) {
          showToast('字体解析异常');
          if (fontNameEl) fontNameEl.textContent = '';
          fontInput.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // ================== 额外文字块 ==================
  var btnAddText = el('btn-add-text');
  if (btnAddText) {
    btnAddText.addEventListener('click', function () {
      if (!originalImg) { showToast('请先上传底图'); return; }
      extraId++;
      var item = {
        id: extraId,
        type: 'text',
        text: '双击编辑文字',
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: Math.max(18, Math.round(canvas.width * 0.045)),
        color: (textColorEl ? textColorEl.value : '#ffffff'),
        stroke: (strokeColorEl ? strokeColorEl.value : '#000000'),
        strokeW: 4,
        align: 'center',
        bold: true,
        rotate: 0
      };
      extraTexts.push(item);
      selItem = item;
      renderExtraList();
      scheduleDraw();
      showToast('已添加文字块，可在画布上拖动');
    });
  }

  function renderExtraList() {
    var box = el('extra-list');
    if (!box) return;
    box.innerHTML = '';
    var all = extraTexts.concat(stickers);
    if (!all.length) {
      box.innerHTML = '<span class="extra-empty">暂无额外元素</span>';
      return;
    }
    all.forEach(function (it) {
      var chip = document.createElement('span');
      chip.className = 'extra-chip' + (selItem && selItem.id === it.id ? ' active' : '');
      chip.textContent = (it.type === 'text' ? '📝 ' : '⭐ ') + (it.type === 'text' ? it.text.slice(0, 8) : '贴纸');
      chip.addEventListener('click', function () {
        selItem = it;
        renderExtraList();
        scheduleDraw();
      });
      var del = document.createElement('b');
      del.textContent = '×';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        removeItem(it.id);
      });
      chip.appendChild(del);
      box.appendChild(chip);
    });
  }

  function removeItem(id) {
    extraTexts = extraTexts.filter(function (x) { return x.id !== id; });
    stickers = stickers.filter(function (x) { return x.id !== id; });
    if (selItem && selItem.id === id) selItem = null;
    renderExtraList();
    scheduleDraw();
  }

  // ================== 贴纸 ==================
  var STICKERS = [
    { key: 'star',  draw: function (c, x, y, r) { starPath(c, x, y, r, r * 0.45, 5); c.fill(); } },
    { key: 'heart', draw: function (c, x, y, r) { heartPath(c, x, y, r); c.fill(); } },
    { key: 'arrow', draw: function (c, x, y, r) { arrowPath(c, x, y, r); c.fill(); } },
    { key: 'fire',  draw: function (c, x, y, r) { starPath(c, x, y, r, r * 0.4, 6); c.fill(); } },
    { key: 'box',   draw: function (c, x, y, r) { c.fillRect(x - r, y - r * 0.7, r * 2, r * 1.4); } },
    { key: 'circle',draw: function (c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); } }
  ];
  var stickerColorEl = el('sticker-color');

  function starPath(c, cx, cy, R, r, n) {
    c.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var rad = i % 2 === 0 ? R : r;
      var a = -Math.PI / 2 + i * Math.PI / n;
      var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }
  function heartPath(c, cx, cy, r) {
    c.beginPath();
    c.moveTo(cx, cy + r * 0.35);
    c.bezierCurveTo(cx - r * 1.2, cy - r * 0.4, cx - r * 0.4, cy - r * 1.1, cx, cy - r * 0.45);
    c.bezierCurveTo(cx + r * 0.4, cy - r * 1.1, cx + r * 1.2, cy - r * 0.4, cx, cy + r * 0.35);
    c.closePath();
  }
  function arrowPath(c, cx, cy, r) {
    c.beginPath();
    c.moveTo(cx - r, cy - r * 0.25);
    c.lineTo(cx + r * 0.4, cy - r * 0.25);
    c.lineTo(cx + r * 0.4, cy - r * 0.6);
    c.lineTo(cx + r, cy);
    c.lineTo(cx + r * 0.4, cy + r * 0.6);
    c.lineTo(cx + r * 0.4, cy + r * 0.25);
    c.lineTo(cx - r, cy + r * 0.25);
    c.closePath();
  }

  STICKERS.forEach(function (s) {
    var btn = el('sticker-' + s.key);
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!originalImg) { showToast('请先上传底图'); return; }
      stickerId++;
      var item = {
        id: stickerId,
        type: 'sticker',
        key: s.key,
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: Math.max(20, Math.round(canvas.width * 0.08)),
        color: (stickerColorEl ? stickerColorEl.value : '#ffd400'),
        rotate: 0
      };
      stickers.push(item);
      selItem = item;
      renderExtraList();
      scheduleDraw();
      showToast('已添加贴纸，可拖动到合适位置');
    });
  });

  // ================== 画布拖拽 ==================
  function canvasPoint(e) {
    var rect = canvas.getBoundingClientRect();
    var cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    var cy = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
    return {
      x: (cx - rect.left) * (canvas.width / rect.width),
      y: (cy - rect.top) * (canvas.height / rect.height)
    };
  }
  function hitTest(p) {
    var all = stickers.concat(extraTexts);
    for (var i = all.length - 1; i >= 0; i--) {
      var it = all[i];
      var dx = p.x - it.x, dy = p.y - it.y;
      if (Math.sqrt(dx * dx + dy * dy) <= it.size * 1.6) return it;
    }
    return null;
  }
  canvas.addEventListener('mousedown', function (e) {
    var p = canvasPoint(e);
    dragItem = hitTest(p);
    if (dragItem) {
      selItem = dragItem;
      dragItem._dx = p.x - dragItem.x;
      dragItem._dy = p.y - dragItem.y;
      renderExtraList();
      scheduleDraw();
    }
  });
  canvas.addEventListener('mousemove', function (e) {
    if (!dragItem) return;
    var p = canvasPoint(e);
    dragItem.x = Math.max(0, Math.min(canvas.width, p.x - dragItem._dx));
    dragItem.y = Math.max(0, Math.min(canvas.height, p.y - dragItem._dy));
    scheduleDraw();
  });
  window.addEventListener('mouseup', function () { dragItem = null; });
  canvas.addEventListener('touchstart', function (e) {
    var p = canvasPoint(e);
    dragItem = hitTest(p);
    if (dragItem) { dragItem._dx = p.x - dragItem.x; dragItem._dy = p.y - dragItem.y; e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    if (!dragItem) return;
    var p = canvasPoint(e);
    dragItem.x = Math.max(0, Math.min(canvas.width, p.x - dragItem._dx));
    dragItem.y = Math.max(0, Math.min(canvas.height, p.y - dragItem._dy));
    e.preventDefault();
    scheduleDraw();
  }, { passive: false });
  canvas.addEventListener('touchend', function () { dragItem = null; });
  // 双击编辑额外文字
  canvas.addEventListener('dblclick', function (e) {
    var p = canvasPoint(e);
    var hit = hitTest(p);
    if (!hit || hit.type !== 'text') return;
    var v = window.prompt('编辑文字', hit.text);
    if (v !== null) { hit.text = v; renderExtraList(); scheduleDraw(); }
  });
  // Delete 删除选中
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (selItem) { removeItem(selItem.id); showToast('已删除选中元素'); }
    }
  });

  // ================== 模板 ==================
  var TEMPLATES = [
    {
      name: '经典三段式', filter: 'none', fontSize: 40, align: 'center',
      top: '顶部文字', middle: '', bottom: '底部文字',
      color: '#ffffff', stroke: '#000000', strokeW: 6, caps: true, bg: false, shadow: true
    },
    {
      name: '黑白经典', filter: 'grayscale(100%)', fontSize: 42, align: 'center',
      top: '当 你 看 到 这 张 图', middle: '', bottom: '：）',
      color: '#ffffff', stroke: '#000000', strokeW: 6, caps: true, bg: false, shadow: true
    },
    {
      name: '震惊体', filter: 'contrast(150%) saturate(200%)', fontSize: 55, align: 'center',
      top: '震 惊 ！', middle: '居然可以这样', bottom: '速看！马上删！',
      color: '#ffff00', stroke: '#000000', strokeW: 8, caps: true, bg: false, shadow: true
    },
    {
      name: '怀旧复古', filter: 'sepia(80%) contrast(120%)', fontSize: 36, align: 'center',
      top: '那一年，我们还很年轻', middle: '', bottom: '—— 岁月如歌 ——',
      color: '#fff4d6', stroke: '#4a3410', strokeW: 4, caps: false, bg: false, shadow: true
    },
    {
      name: '反色世界', filter: 'invert(100%)', fontSize: 45, align: 'center',
      top: '反转世界', middle: '一切都是反的', bottom: '包括你自己',
      color: '#000000', stroke: '#ffffff', strokeW: 5, caps: false, bg: false, shadow: false
    },
    {
      name: '像素回忆', filter: PIXELATE_FLAG, fontSize: 38, align: 'left',
      top: '8-BIT MEMORY', middle: '', bottom: 'INSERT COIN',
      color: '#ffffff', stroke: '#000000', strokeW: 4, caps: true, bg: true, shadow: false
    }
  ];

  function setSelectValue(id, val) {
    var s = el(id);
    if (!s) return;
    for (var i = 0; i < s.options.length; i++) {
      if (s.options[i].value === val) { s.selectedIndex = i; break; }
    }
    s.dispatchEvent(new Event('input'));
    s.dispatchEvent(new Event('change'));
  }
  function setCheckbox(id, checked) {
    var c = el(id);
    if (!c) return;
    c.checked = !!checked;
    c.dispatchEvent(new Event('change'));
  }

  var tplSelect = el('template-select');
  if (tplSelect) {
    TEMPLATES.forEach(function (t, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = t.name;
      tplSelect.appendChild(o);
    });
    tplSelect.addEventListener('change', function () {
      var t = TEMPLATES.filter(function(x){return x.name===tplSelect.value;})[0] || TEMPLATES[parseInt(tplSelect.value, 10)];
      if (!t) return;
      if (!originalImg) { showToast('请先上传底图，再套用模板'); return; }
      setSelectValue('img-filter', t.filter);
      setSelectValue('font-size', String(t.fontSize));
      setSelectValue('text-align', t.align);
      if (textTopEl) textTopEl.value = t.top;
      if (textMiddleEl) textMiddleEl.value = t.middle;
      if (textBottomEl) textBottomEl.value = t.bottom;
      if (textColorEl) textColorEl.value = t.color;
      if (strokeColorEl) strokeColorEl.value = t.stroke;
      setSelectValue('stroke-width', String(t.strokeW));
      setCheckbox('all-caps', t.caps);
      setCheckbox('use-bg', t.bg);
      setCheckbox('use-shadow', t.shadow);
      scheduleDraw();
      showToast('已套用模板：' + t.name);
    });
  }

  // ================== 4. 核心绘制 ==================
  function scheduleDraw() {
    clearTimeout(drawTimer);
    drawTimer = setTimeout(function () { draw(); }, 30);
  }

  function draw() {
    if (!originalImg) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 4.1 绘制图片（含滤镜 + 旋转翻转） ---
    var tmp = document.createElement('canvas');
    tmp.width = originalImg.naturalWidth;
    tmp.height = originalImg.naturalHeight;
    var tctx = tmp.getContext('2d');

    var filter = imgFilterEl ? imgFilterEl.value : 'none';
    if (filter === PIXELATE_FLAG) {
      var pSize = Math.max(2, Math.floor(originalImg.naturalWidth / 100));
      var tinyW = Math.max(1, Math.ceil(originalImg.naturalWidth / pSize));
      var tinyH = Math.max(1, Math.ceil(originalImg.naturalHeight / pSize));
      var tinyCanvas = document.createElement('canvas');
      tinyCanvas.width = tinyW;
      tinyCanvas.height = tinyH;
      var tinyCtx = tinyCanvas.getContext('2d');
      tinyCtx.imageSmoothingEnabled = false;
      tinyCtx.drawImage(originalImg, 0, 0, tinyW, tinyH);
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(tinyCanvas, 0, 0, originalImg.naturalWidth, originalImg.naturalHeight);
    } else {
      tctx.filter = filter;
      tctx.drawImage(originalImg, 0, 0);
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(tmp, -tmp.width / 2, -tmp.height / 2);
    ctx.restore();

    // --- 4.2 绘制文字 ---
    drawText();

    // --- 4.3 绘制贴纸与额外文字 ---
    stickers.forEach(function (it) { drawSticker(it); });
    extraTexts.forEach(function (it) { drawExtraText(it); });
  }

  function drawSticker(it) {
    var s = null;
    for (var i = 0; i < STICKERS.length; i++) if (STICKERS[i].key === it.key) s = STICKERS[i];
    if (!s) return;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate((it.rotate || 0) * Math.PI / 180);
    ctx.fillStyle = it.color;
    ctx.globalAlpha = 0.92;
    s.draw(ctx, 0, 0, it.size);
    if (selItem && selItem.id === it.id) {
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, it.size * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawExtraText(it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate((it.rotate || 0) * Math.PI / 180);
    ctx.font = (it.bold ? 'bold ' : '') + it.size + 'px ' + customFontName;
    ctx.textAlign = it.align;
    ctx.textBaseline = 'middle';
    if (it.strokeW > 0) {
      ctx.strokeStyle = it.stroke;
      ctx.lineWidth = it.strokeW;
      ctx.lineJoin = 'round';
      ctx.strokeText(it.text, 0, 0);
    }
    ctx.fillStyle = it.color;
    ctx.fillText(it.text, 0, 0);
    if (selItem && selItem.id === it.id) {
      var w = ctx.measureText(it.text).width;
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-w / 2 - 6, -it.size * 0.8, w + 12, it.size * 1.6);
    }
    ctx.restore();
  }

  function drawText() {
    var topStr = textTopEl ? textTopEl.value.trim() : '';
    var midStr = textMiddleEl ? textMiddleEl.value.trim() : '';
    var botStr = textBottomEl ? textBottomEl.value.trim() : '';
    if (!topStr && !midStr && !botStr) return;

    if (allCapsEl && allCapsEl.checked) {
      topStr = topStr.toUpperCase();
      midStr = midStr.toUpperCase();
      botStr = botStr.toUpperCase();
    }

    var scale = parseInt(fontSizeEl.value, 10) / 100;
    var baseFontSize = canvas.width * scale * 0.15;
    baseFontSize = Math.max(16, baseFontSize);

    var rotEl = el('text-rotate');
    var textRot = rotEl ? (parseInt(rotEl.value, 10) || 0) : 0;

    ctx.save();
    // 文字整体旋转（绕画布中心）
    if (textRot !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(textRot * Math.PI / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    ctx.font = 'bold ' + baseFontSize + 'px ' + customFontName;
    ctx.fillStyle = textColorEl ? textColorEl.value : '#ffffff';
    ctx.textBaseline = 'top';

    var align = textAlignEl ? textAlignEl.value : 'center';
    ctx.textAlign = align;
    var paddingX = Math.max(15, canvas.width * 0.03);
    var xPos = align === 'left' ? paddingX : (align === 'right' ? canvas.width - paddingX : canvas.width / 2);

    var strokeW = strokeWidthEl ? (parseInt(strokeWidthEl.value, 10) || 0) : 0;
    if (strokeW > 0 && strokeColorEl) {
      ctx.strokeStyle = strokeColorEl.value;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
    }

    var lhMultiplier = lineHeightEl ? (parseInt(lineHeightEl.value, 10) / 100) : 1.2;
    var lineHeight = baseFontSize * lhMultiplier;
    var globalOffsetY = offsetYEl ? (parseInt(offsetYEl.value, 10) || 0) : 0;
    var marginTop = Math.max(10, canvas.height * 0.02) + globalOffsetY;
    var marginBottom = canvas.height - Math.max(10, canvas.height * 0.02) + globalOffsetY;

    function renderBlock(str, startY, isBottom) {
      var lines = wrapText(str, canvas.width - paddingX * 2);
      var totalHeight = lines.length * lineHeight;
      var currentY = isBottom ? (startY - totalHeight) : startY;

      if (useBgEl && useBgEl.checked) {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        var maxW = 0;
        for (var i = 0; i < lines.length; i++) {
          var w = ctx.measureText(lines[i]).width;
          if (w > maxW) maxW = w;
        }
        var padX = baseFontSize * 0.3;
        var padY = baseFontSize * 0.1;
        var bgX = xPos - (align === 'center' ? maxW / 2 : (align === 'right' ? maxW : 0)) - padX;
        var bgW = maxW + padX * 2;
        var bgY = currentY - padY;
        var bgH = totalHeight + padY * 2;

        ctx.fillStyle = bgColorEl ? bgColorEl.value : '#000000';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bgX, bgY, bgW, bgH, baseFontSize * 0.15);
        } else {
          ctx.rect(bgX, bgY, bgW, bgH);
        }
        ctx.fill();
        ctx.restore();
      }

      if (useShadowEl && useShadowEl.checked) {
        ctx.shadowColor = shadowColorEl ? shadowColorEl.value : '#000000';
        ctx.shadowBlur = baseFontSize * 0.15;
        ctx.shadowOffsetX = baseFontSize * 0.05;
        ctx.shadowOffsetY = baseFontSize * 0.05;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      for (var i = 0; i < lines.length; i++) {
        var y = currentY + i * lineHeight;
        if (strokeW > 0) ctx.strokeText(lines[i], xPos, y);
        ctx.fillText(lines[i], xPos, y);
      }
      ctx.shadowColor = 'transparent';
    }

    if (topStr) renderBlock(topStr, marginTop, false);
    if (botStr) renderBlock(botStr, marginBottom, true);
    if (midStr) {
      var linesMid = wrapText(midStr, canvas.width - paddingX * 2);
      var totalHeightMid = linesMid.length * lineHeight;
      var startYMid = (canvas.height - totalHeightMid) / 2 + globalOffsetY;
      renderBlock(midStr, startYMid, false);
    }
    ctx.restore();
  }

  function wrapText(text, maxWidth) {
    var paragraphs = String(text).split('\n');
    var result = [];
    for (var p = 0; p < paragraphs.length; p++) {
      var para = paragraphs[p];
      if (!para.trim()) { result.push(''); continue; }
      var words = para.split(' ');
      var currentLine = '';
      var hasChinese = /[\u4e00-\u9fa5]/.test(para);
      if (hasChinese) {
        for (var i = 0; i < para.length; i++) {
          var char = para[i];
          var testLine = currentLine + char;
          if (ctx.measureText(testLine).width > maxWidth && currentLine !== '') {
            result.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine !== '') result.push(currentLine);
      } else {
        for (var j = 0; j < words.length; j++) {
          var testLine2 = currentLine + words[j] + ' ';
          if (ctx.measureText(testLine2).width > maxWidth && j > 0) {
            result.push(currentLine.trim());
            currentLine = words[j] + ' ';
          } else {
            currentLine = testLine2;
          }
        }
        if (currentLine.trim() !== '') result.push(currentLine.trim());
      }
    }
    return result;
  }

  // ================== 5. 导出与批量 ==================
  function buildExportCanvas(scale) {
    var s = scale || 1;
    if (s === 1) return canvas;
    var out = document.createElement('canvas');
    out.width = Math.round(canvas.width * s);
    out.height = Math.round(canvas.height * s);
    var octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(canvas, 0, 0, out.width, out.height);
    return out;
  }

  function doExport(format, quality01, scale, filenamePrefix) {
    if (!originalImg) return Promise.resolve(null);
    var sourceCanvas = buildExportCanvas(scale);
    var fmt = format;
    if (fmt === 'image/jpeg') {
      var tmp = document.createElement('canvas');
      tmp.width = sourceCanvas.width;
      tmp.height = sourceCanvas.height;
      var tctx = tmp.getContext('2d');
      tctx.fillStyle = '#ffffff';
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(sourceCanvas, 0, 0);
      sourceCanvas = tmp;
    }
    var ext = fmt === 'image/jpeg' ? 'jpg' : (fmt === 'image/webp' ? 'webp' : 'png');
    var prefix = filenamePrefix || 'meme';
    return encodeCanvas(sourceCanvas, fmt, quality01).then(function (res) {
      if (!res || !res.blob) { showToast('导出失败'); return null; }
      var name = prefix + '_' + Date.now() + '.' + ext;
      saveBlob(res.blob, name);
      if (res.note) showToast(res.note);
      else showToast('已导出 ' + ext.toUpperCase() + (scale > 1 ? '（' + scale + 'x）' : ''));
      return { blob: res.blob, ext: ext };
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', function () {
      if (!originalImg) return;
      var format = exportFormatEl ? exportFormatEl.value : 'image/png';
      var q = qualityEl ? (parseInt(qualityEl.value, 10) / 100) : 0.92;
      var scaleSel = el('export-scale');
      var scale = scaleSel ? (parseInt(scaleSel.value, 10) / 100 || 1) : 1;
      var prefixSel = el('name-prefix');
      var prefix = (prefixSel && prefixSel.value.trim()) ? prefixSel.value.trim() : 'meme';
      var last = doExport(format, q, scale, prefix);
      if (last) {
        last.then(function (r) {
          if (r && lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
          if (r) { lastBlobUrl = URL.createObjectURL(r.blob); var pv = el('btn-preview'); if (pv) pv.disabled = false; }
        });
      }
    });
  }

  // 导出全部格式
  var btnExportAll = el('btn-export-all');
  if (btnExportAll) {
    btnExportAll.addEventListener('click', function () {
      if (!originalImg) { showToast('请先上传底图'); return; }
      var q = qualityEl ? (parseInt(qualityEl.value, 10) / 100) : 0.92;
      var scaleSel = el('export-scale');
      var scale = scaleSel ? (parseInt(scaleSel.value, 10) / 100 || 1) : 1;
      var prefixSel = el('name-prefix');
      var prefix = (prefixSel && prefixSel.value.trim()) ? prefixSel.value.trim() : 'meme';
      var formats = ['image/png', 'image/jpeg'];
      if (el('export-format') && el('export-format').value === 'image/webp') formats.push('image/webp');
      formats.reduce(function (chain, fmt, i) {
        return chain.then(function () {
          return new Promise(function (resolve) {
            setTimeout(function () {
              doExport(fmt, q, scale, prefix).then(function () { resolve(); });
            }, i * 250);
          });
        });
      }, Promise.resolve()).then(function () { showToast('全部格式已导出'); });
    });
  }

  // 复制 PNG 到剪贴板
  var btnCopy = el('btn-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      if (!originalImg) { showToast('请先上传底图'); return; }
      var sourceCanvas = buildExportCanvas(1);
      if (!navigator.clipboard || !window.ClipboardItem || !sourceCanvas.toBlob) {
        showToast('当前浏览器不支持复制图片');
        return;
      }
      sourceCanvas.toBlob(function (blob) {
        if (!blob) { showToast('复制失败'); return; }
        try {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () {
            showToast('已复制到剪贴板');
          }, function () { showToast('复制被浏览器拒绝'); });
        } catch (e) { showToast('复制失败'); }
      }, 'image/png');
    });
  }

  // 新标签预览
  var btnPreview = el('btn-preview');
  if (btnPreview) {
    btnPreview.addEventListener('click', function () {
      if (!originalImg) { showToast('请先上传底图'); return; }
      var sourceCanvas = buildExportCanvas(1);
      var u = sourceCanvas.toDataURL('image/png');
      var w = window.open('');
      if (!w) { showToast('预览被拦截，请允许弹窗'); return; }
      w.document.write('<title>梗图预览</title><img src="' + u + '" style="max-width:100%">');
      w.document.close();
    });
  }

  // 批量套用当前文字到多张图
  var batchInput = el('batch-input');
  var batchZone = el('batch-zone');
  var batchQueue = [];
  bindUploadZone(batchZone, batchInput, function (files) {
    var imgs = (files || []).filter(function (f) { return f && f.type && f.type.indexOf('image/') === 0; });
    if (!imgs.length) { showToast('请选择图片文件'); return; }
    batchQueue = batchQueue.concat(imgs);
    renderBatch();
    showToast('已加入 ' + imgs.length + ' 张，点击「批量导出」');
  });
  function renderBatch() {
    var list = el('batch-list');
    if (!list) return;
    list.innerHTML = '';
    batchQueue.forEach(function (f, i) {
      var chip = document.createElement('span');
      chip.className = 'extra-chip';
      chip.textContent = '🖼 ' + (f.name || ('图' + (i + 1)));
      var del = document.createElement('b');
      del.textContent = '×';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        batchQueue.splice(i, 1);
        renderBatch();
      });
      chip.appendChild(del);
      list.appendChild(chip);
    });
    var info = el('batch-count');
    if (info) info.textContent = batchQueue.length ? ('共 ' + batchQueue.length + ' 张') : '';
  }
  var btnBatch = el('btn-batch-export');
  if (btnBatch) {
    btnBatch.addEventListener('click', function () {
      if (!batchQueue.length) { showToast('请先添加批量图片'); return; }
      var format = exportFormatEl ? exportFormatEl.value : 'image/png';
      var q = qualityEl ? (parseInt(qualityEl.value, 10) / 100) : 0.92;
      var scaleSel = el('export-scale');
      var scale = scaleSel ? (parseInt(scaleSel.value, 10) / 100 || 1) : 1;
      var prefixSel = el('name-prefix');
      var prefix = (prefixSel && prefixSel.value.trim()) ? prefixSel.value.trim() : 'meme';
      var idx = 0;
      function next() {
        if (idx >= batchQueue.length) { showToast('批量导出完成'); return; }
        var file = batchQueue[idx++];
        var reader = new FileReader();
        reader.onload = function (ev) {
          var im = new Image();
          im.onload = function () {
            originalImg = im;
            currentFileSize = file.size || 0;
            rotation = 0; flipH = false; flipV = false;
            updateCanvasSize();
            draw();
            var base = (file.name || ('meme' + idx)).replace(/\.[^.]+$/, '');
            doExport(format, q, scale, prefix + '_' + base).then(function () {
              setTimeout(next, 200);
            });
          };
          im.onerror = function () { setTimeout(next, 0); };
          im.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
      next();
    });
  }

  // ================== 初始化 ==================
  renderExtraList();
  if (qualityVal && qualityEl) qualityVal.textContent = qualityEl.value;
})();
