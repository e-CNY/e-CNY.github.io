(function () {
  'use strict';

  /* ============================================================
   * 照片处理与排版 · 增强版
   * 纯原生 Canvas + FileSaver，无 WASM / mjs / onnx
   * 模块：0 通用 1 水印&换底色 2 抠图 3 裁剪 4 拼版 5 压缩 6 批量
   * ============================================================ */

  // ================= 通用：Toast =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, duration) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, duration || 1800);
  }

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function hexToRgb(hex) {
    hex = String(hex || '').replace('#', '').trim();
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.slice(0, 2), 16) || 0,
      g: parseInt(hex.slice(2, 4), 16) || 0,
      b: parseInt(hex.slice(4, 6), 16) || 0
    };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    }).join('').toUpperCase();
  }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var SYSTEM_FONT = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

  function saveBlob(blob, filename) {
    try {
      if (typeof window.saveAs === 'function') { window.saveAs(blob, filename); return; }
    } catch (e) { /* 回退到 a[download] */ }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

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

  /* ============================================================
   * 统一编码：遵循最初版本的压缩算法
   *   PNG  : 无损 canvas.toBlob('image/png')，质量滑块不影响体积
   *   JPG  : canvas.toBlob('image/jpeg', q)
   *   WebP : canvas.toBlob('image/webp', q)，不支持时自动回退 JPG
   * 只在「质量低于 100」时才重新编码：原图重编码后体积常常变大
   * （内容复杂的图重编码后比原文件大），100 时直接返回原始文件。
   * ============================================================ */
  var IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp' };
  var _webpSupport = null;
  function webpSupported() {
    if (_webpSupport !== null) return _webpSupport;
    try {
      var c = document.createElement('canvas'); c.width = 1; c.height = 1;
      var d = c.toDataURL('image/webp');
      _webpSupport = d.indexOf('data:image/webp') === 0;
    } catch (e) { _webpSupport = false; }
    return _webpSupport;
  }
  function normalizeType(type) {
    var t = IMAGE_TYPES[type] ? type : 'image/jpeg';
    if (t === 'image/webp' && !webpSupported()) t = 'image/jpeg';
    return t;
  }
  function canvasEncode(cv, type, quality) {
    var t = normalizeType(type);
    var q = Math.max(0.01, Math.min(1, (quality == null ? 92 : quality) / (quality <= 1 ? 1 : 100)));
    if (t === 'image/png' && q < 1) return encodePngQuantized(cv, q);
    return canvasToBlob(cv, t, q);
  }

  /* ============================================================
   * PNG 压缩：降低色彩数（quantize），而不是无损存储
   *   质量 q(0~1) → 调色板颜色数 256 → 16（质量越低颜色越少、体积越小）
   *   算法：中位数切割(median cut) 生成调色板 + Floyd–Steinberg 抖动
   *   全透明像素单独保留 1 个透明索引，保证水印/LOGO 的透明底不丢
   * ============================================================ */
  function quantizeColorsForQuality(q) {
    var n = Math.max(8, Math.round(16 + (256 - 16) * Math.max(0, Math.min(1, q))));   // q=1(100%)→256色, q→0(1%)→16色
    return Math.max(8, Math.min(256, n));
  }
  function encodePngQuantized(cv, q) {
    var w = cv.width, h = cv.height;
    if (!w || !h) return canvasToBlob(cv, 'image/png');
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var src;
    try { src = ctx.getImageData(0, 0, w, h); }
    catch (e) { return canvasToBlob(cv, 'image/png'); }
    var data = src.data;
    var maxColors = quantizeColorsForQuality(q);

    // 1) 收集不透明像素，按 (通道极差最大的通道) 排序后中位数切割
    var pixels = [];
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    var palette = [];
    if (pixels.length) {
      var boxes = [makeBox(pixels)];
      while (boxes.length < maxColors) {
        // 取出“包含像素最多且还能再分”的盒子
        var idx = -1, best = -1;
        for (var b = 0; b < boxes.length; b++) {
          if (boxes[b].len < 2) continue;
          if (boxes[b].len > best) { best = boxes[b].len; idx = b; }
        }
        if (idx < 0) break;
        var box = boxes[idx];
        var ch = boxRangeMax(box);
        if (ch < 0) break;                       // 所有像素同色，无法再分
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
    // 透明色占最后一个索引
    var hasAlpha = false;
    for (var a = 3; a < data.length; a += 4) if (data[a] < 128) { hasAlpha = true; break; }
    var out = ctx.createImageData(w, h);
    var od = out.data;
    var useDither = q < 0.95;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var p = (y * w + x) * 4;
        if (data[p + 3] < 128) { od[p] = od[p + 1] = od[p + 2] = od[p + 3] = 0; continue; }
        var er = data[p], eg = data[p + 1], eb = data[p + 2];
        var pi = nearestPalette(er, eg, eb, palette);
        od[p] = palette[pi][0]; od[p + 1] = palette[pi][1]; od[p + 2] = palette[pi][2]; od[p + 3] = 255;
        if (!useDither) continue;
        var dr = er - palette[pi][0], dg = eg - palette[pi][1], db = eb - palette[pi][2];
        // Floyd–Steinberg 误差扩散
        diffuse(x + 1, y, dr * 7 / 16, dg * 7 / 16, db * 7 / 16);
        diffuse(x - 1, y + 1, dr * 3 / 16, dg * 3 / 16, db * 3 / 16);
        diffuse(x, y + 1, dr * 5 / 16, dg * 5 / 16, db * 5 / 16);
        diffuse(x + 1, y + 1, dr * 1 / 16, dg * 1 / 16, db * 1 / 16);
      }
    }
    function diffuse(xx, yy, dr, dg, db) {
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) return;
      var q2 = (yy * w + xx) * 4;
      if (data[q2 + 3] < 128) return;
      data[q2] = Math.max(0, Math.min(255, data[q2] + dr));
      data[q2 + 1] = Math.max(0, Math.min(255, data[q2 + 1] + dg));
      data[q2 + 2] = Math.max(0, Math.min(255, data[q2 + 2] + db));
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

    // 2) 先试 canvas 原生 PNG；尺寸不大（颜色数受控）时再试按调色板写 PNG
    var nativePng = canvasToBlob(cv, 'image/png');
    var best = null;
    try {
      var png = encodePalettePng(out, w, h, palette, hasAlpha);
      if (png) best = png;
    } catch (e) { /* 忽略，回退原生 PNG */ }
    return nativePng.then(function (nb) {
      if (best && best.size && (!nb || best.size < nb.size)) return best;
      return nb;
    });
  }

  /* 按调色板把像素写成索引色 PNG（色深 ≤8bit，颜色越少体积越小） */
  function encodePalettePng(imgData, w, h, palette, hasAlpha) {
      var bytesRef = null;
    var crcTbl = crcTbl || (function () {
      var t = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      return t;
    })();
    function crc32(buf) {
      var c = 0xFFFFFFFF;
      for (var i = 0; i < buf.length; i++) c = crcTbl[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
      return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function chunk(type, data) {
      var len = data.length;
      var out = new Uint8Array(len + 12);
      out[0] = len >>> 24; out[1] = (len >>> 16) & 255; out[2] = (len >>> 8) & 255; out[3] = len & 255;
      for (var i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
      out.set(data, 8);
      var crc = crc32(out.subarray(4, 8 + len));
      out[8 + len] = crc >>> 24; out[9 + len] = (crc >>> 16) & 255; out[10 + len] = (crc >>> 8) & 255; out[11 + len] = crc & 255;
      return out;
    }
    var nColors = palette.length + (hasAlpha ? 1 : 0);
    if (nColors > 256) return null;
    var bitDepth = nColors <= 2 ? 1 : nColors <= 4 ? 2 : nColors <= 16 ? 4 : 8;
    var transIdx = palette.length;                 // 透明像素的调色板索引
    // 像素 → 索引
    var d = imgData.data;
    var raw = new Uint8Array(h * (1 + w));         // 每行 filter=0 + 索引
    for (var y = 0; y < h; y++) {
      raw[y * (1 + w)] = 0;
      for (var x = 0; x < w; x++) {
        var p = (y * w + x) * 4;
        var idx;
        if (d[p + 3] < 128) idx = transIdx;
        else idx = nearestPaletteIdx(d[p], d[p + 1], d[p + 2]);
        raw[y * (1 + w) + 1 + x] = idx;
      }
    }
    function nearestPaletteIdx(r, g, b) {
      var bi = 0, bd = Infinity;
      for (var i = 0; i < palette.length; i++) {
        var dr = palette[i][0] - r, dg = palette[i][1] - g, db = palette[i][2] - b;
        var dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; bi = i; }
      }
      return bi;
    }
    // 可选：zlib 压缩（浏览器有 CompressionStream 就用，否则存未压缩，体积仍随颜色数下降）
    var parts = [];
    parts.push(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    var ihdr = new Uint8Array(13);
    ihdr[0] = w >>> 24; ihdr[1] = (w >>> 16) & 255; ihdr[2] = (w >>> 8) & 255; ihdr[3] = w & 255;
    ihdr[4] = h >>> 24; ihdr[5] = (h >>> 16) & 255; ihdr[6] = (h >>> 8) & 255; ihdr[7] = h & 255;
    ihdr[8] = bitDepth; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    parts.push(chunk('IHDR', ihdr));
    // PLTE 对齐到 2^bitDepth 项
    var palCount = Math.max(2, Math.min(256, 1 << bitDepth));
    var plte = new Uint8Array(palCount * 3);
    for (var i = 0; i < palCount; i++) {
      var c = i < palette.length ? palette[i] : [0, 0, 0];
      plte[i * 3] = c[0]; plte[i * 3 + 1] = c[1]; plte[i * 3 + 2] = c[2];
    }
    parts.push(chunk('PLTE', plte));
    if (hasAlpha) {
      var trns = new Uint8Array(palCount);
      for (var t = 0; t < palCount; t++) trns[t] = (t === transIdx) ? 0 : 255;
      parts.push(chunk('tRNS', trns));
    }
    parts.push(chunk('IDAT', zlibDeflate(raw)));
    parts.push(chunk('IEND', new Uint8Array(0)));
    var total = 0;
    parts.forEach(function (p) { total += p.length; });
    var out = new Uint8Array(total), off = 0;
    parts.forEach(function (p) { out.set(p, off); off += p.length; });
    return new Blob([out], { type: 'image/png' });

    function zlibDeflate(bytes) {
      // 用 deflate 存储型块（BTYPE=00）：合法 PNG，颜色数降低后体积仍随之下降
      return storedDeflate(bytes);
    }
    function storedDeflate(bytes) {
      // 无压缩 deflate（块类型 00），合法且可被所有解码器读取
      var out = new Uint8Array(2 + 5 * Math.ceil(bytes.length / 65535) + bytes.length + 4);
      var o = 0;
      out[o++] = 0x78; out[o++] = 0x01;                 // CMF/FLG：deflate，校验
      var off = 0;
      while (off < bytes.length) {
        var n = Math.min(65535, bytes.length - off);
        var last = (off + n >= bytes.length) ? 1 : 0;
        out[o++] = last;                                // BFINAL + BTYPE=00
        out[o++] = n & 255; out[o++] = (n >>> 8) & 255;
        out[o++] = (~n) & 255; out[o++] = ((~n) >>> 8) & 255;
        out.set(bytes.subarray(off, off + n), o); o += n;
        off += n;
      }
      var adler = adler32(bytes);
      out[o++] = (adler >>> 24) & 255; out[o++] = (adler >>> 16) & 255;
      out[o++] = (adler >>> 8) & 255; out[o++] = adler & 255;
      return out.subarray(0, o);
    }
    function adler32(bytes) {
      var a = 1, b = 0;
      for (var i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
      }
      return ((b << 16) | a) >>> 0;
    }
  }
  /** 把滑块数值（30~100）绑定到标签与导出，修好“拖动数值不变”的问题 */
  function bindQualitySlider(input, label, onChange) {
    if (!input) return;
    var sync = function () {
      var v = input.value;
      if (label) label.textContent = v;
      if (onChange) onChange(v);
    };
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    sync();
  }
  function exportCanvas(cv, type, quality) { return canvasEncode(cv, type, quality); }

  /* 点击上传（沿用最初版本写法）：
     上传区点击 → 直接 input.click()，由 input 的 change 事件接收文件。
     不做任何委托/拦截，保证双击本地打开时一定能弹出选择文件框。 */
  function openFilePicker(input, accept) {
    if (!input) return;
    try { if (accept) input.accept = accept; } catch (e) {}
    input.click();
  }
  /* 把上传区里的 <input type=file> 直接挂到上传区点击上（老代码写法） */
  function bindUploadZone(zone, input, onFiles) {
    if (!zone || !input) return;
    zone.addEventListener('click', function (e) {
      // 点上传区里的按钮/输入框本身时，交给原生行为，避免重复弹窗
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
      input.value = '';   // 允许重复选择同一个文件
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function (e) { reject(e); };
      im.src = src;
    });
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function (e) { resolve(e.target.result); };
      r.onerror = function (e) { reject(e); };
      r.readAsDataURL(file);
    });
  }

  function getImageSize(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        URL.revokeObjectURL(url);
        resolve({ w: w, h: h });
      };
      im.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      im.src = url;
    });
  }

  // 多文件选择弹窗（每个输入框只允许选一次同一个文件）
  function pickFiles(input) {
    return new Promise(function (resolve) {
      var done = false;
      function onChange() {
        if (done) return;
        done = true;
        var files = Array.prototype.slice.call(input.files || []);
        input.value = '';
        resolve(files);
      }
      input.addEventListener('change', onChange, { once: true });
      input.click();
      setTimeout(function () {
        // 用户取消选择时不会触发 change，1 分钟后兜底释放
        if (!done) { done = true; resolve([]); }
      }, 3600000);
    });
  }

  // 文件输入统一入口：点击按钮 → 取对应 input → 派发
  var pendingInput = null;
  document.addEventListener('pick-files', function (e) {
    var input = el(e.detail.inputId);
    if (input) pickFiles(input).then(function (files) {
      if (files.length) e.detail.onFiles(files);
    });
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-pick]') : null;
    if (!btn) return;
    var input = el(btn.dataset.pick);
    if (!input) return;
    e.preventDefault();
    pendingInput = input;
    var fd = btn.dataset.pickFilter || 'any';
    input.accept = fd === 'image' ? 'image/*,.heic,.heif'
      : fd === 'font' ? '.ttf,.otf,.woff,.woff2'
      : fd === 'file' ? '*' : '';
    input.webkitdirectory = btn.dataset.pickDir ? true : false;
    openFilePicker(input, input.accept);
    return;
    pickFiles(input).then(function (files) {
      if (!files.length) return;
      var handler = btn.dataset.pickHandler;
      if (handler && typeof window['__pick_' + handler] === 'function') {
        window['__pick_' + handler](files, btn);
      }
    });
  });

  function bindDrop(zone, cb) {
    if (!zone) return;
    zone.addEventListener('click', function (e) {
      if (e.target.closest('input, button, a')) return;
      cb({ type: 'picker' });
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
      if (files.length) cb(files);
    });
  }

  // ================= Tab 切换逻辑 =================
  (function initTabs() {
    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        tabContents.forEach(function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
        var target = el(btn.dataset.tab);
        if (target) target.classList.add('active');
        var t = btn.dataset.tab; /* 五个模块 */
        if (t === 'tab-watermark' && window.__wmRedraw) window.__wmRedraw();
        if (t === 'tab-print' && window.__psRedraw) window.__psRedraw();
        if (t === 'tab-cutout' && window.__ctRedraw) window.__ctRedraw();
        if (t === 'tab-crop' && window.__crRedraw) window.__crRedraw();
        if (t === 'tab-compress' && window.__cpRefresh) window.__cpRefresh();
        if (t === 'tab-batch' && window.__btRefresh) window.__btRefresh();
      });
    });
  })();

  /* ============================================================
   * 模块 1：加水印与换底色
   * ============================================================ */
  (function initWatermark() {
    var dropZone       = el('wm-drop-zone');
    var imageInput     = el('wm-image-input');
    var imgInfoEl      = el('wm-img-info');
    var fontInput      = el('wm-font-input');
    var fontNameEl     = el('wm-font-name');
    var textInput      = el('wm-text');
    var colorInput     = el('wm-color');
    var sizeInput      = el('wm-size');
    var sizeValEl      = el('wm-size-val');
    var opacityInput   = el('wm-opacity');
    var opacityValEl   = el('wm-opacity-val');
    var rotateInput    = el('wm-rotate');
    var rotateValEl    = el('wm-rotate-val');
    var paddingInput   = el('wm-padding');
    var paddingValEl   = el('wm-padding-val');
    var strokeCheckbox = el('wm-enable-stroke');
    var strokeColorInp = el('wm-stroke-color');
    var shadowCheckbox = el('wm-enable-shadow');
    var boldCheckbox   = el('wm-bold');
    var italicCheckbox = el('wm-italic');
    var lineInput      = el('wm-line');
    var lineValEl      = el('wm-line-val');
    var tileGapInput   = el('wm-tile-gap');
    var tileGapValEl   = el('wm-tile-gap-val');
    var tileAngleInput = el('wm-tile-angle');
    var tileAngleValEl = el('wm-tile-angle-val');
    var logoFileInput  = el('wm-logo-input');
    var logoClearBtn   = el('wm-logo-clear');
    var logoScaleInput = el('wm-logo-scale');
    var logoScaleValEl = el('wm-logo-scale-val');
    var logoOpacityInp = el('wm-logo-opacity');
    var logoOpacityVal = el('wm-logo-opacity-val');

    var posButtons     = Array.prototype.slice.call(document.querySelectorAll('.wm-positions button'));
    var canvas         = el('wm-canvas');
    var ctx            = canvas.getContext('2d', { willReadFrequently: true });
    var placeholder    = el('wm-placeholder');
    var downloadBtn    = el('wm-download');
    var btnDownloadAll = el('wm-download-all');
    var btnAddQueue    = el('wm-add-queue');
    var btnClearQueue  = el('wm-clear-queue');
    var queueListEl    = el('wm-queue-list');
    var btnFit         = el('wm-fit-screen');
    var btnOrig        = el('wm-orig-size');

    var enableBgEl     = el('wm-enable-bg');
    var bgSettingsEl   = el('wm-bg-settings');
    var originPreviewEl= el('wm-origin-color-preview');
    var originColorInp = el('wm-origin-color');
    var targetColorInp = el('wm-target-color');
    var eyedropperBtn  = el('wm-eyedropper');
    var bgColorBtns    = document.querySelectorAll('.wm-bg-color-btn');
    var toleranceInput = el('wm-tolerance');
    var toleranceValEl = el('wm-tolerance-val');
    var featherInput   = el('wm-feather');
    var featherValEl   = el('wm-feather-val');
    var bgModeSel      = el('wm-bg-mode');
    var btnKeepSkin    = el('wm-keep-skin');
    var btnAutoBg      = el('wm-auto-bg');

    var adjBriInput    = el('wm-adj-brightness');
    var adjBriVal      = el('wm-adj-brightness-val');
    var adjConInput    = el('wm-adj-contrast');
    var adjConVal      = el('wm-adj-contrast-val');
    var adjSatInput    = el('wm-adj-saturation');
    var adjSatVal      = el('wm-adj-saturation-val');
    var adjWarmInput   = el('wm-adj-warm');
    var adjWarmVal     = el('wm-adj-warm-val');
    var adjNoiseInput  = el('wm-adj-noise');
    var adjNoiseVal    = el('wm-adj-noise-val');
    var btnAdjReset    = el('wm-adj-reset');

    var tools          = Array.prototype.slice.call(document.querySelectorAll('#tab-watermark [data-wm-tool]'));
    var importSub      = el('wm-sub-import');
    var importAllBtn   = el('wm-import-all');

    var exportFormatSel= el('wm-export-format');
    var qualityInput   = el('wm-quality');
    var qualityValEl   = el('wm-quality-val');
    var namePrefixInp  = el('wm-name-prefix');
    var resetBtn       = el('wm-reset');

    var img = null;
    var originalImageData = null;   // 调整前原始像素
    var baseImageData     = null;   // 换底色后的底图（水印绘制基底）
    var currentPosition   = 'bottom-right';
    var customFontName    = SYSTEM_FONT;
    var fontLoadToken     = 0;

    var logoImg = null;
    var logoNaturalW = 0, logoNaturalH = 0;

    var currentOriginColor = { r: 67, g: 142, b: 219 };
    var currentTargetColor = { r: 255, g: 255, b: 255 };
    var isEyedropperActive = false;

    var queue = [];     // {file, name, img, imageData}
    var queueSeq = 0;

    var MAX_SIZE = 3000;

    function updateMeta(data) {
      if (!data || !imgInfoEl) return;
      imgInfoEl.style.display = 'block';
      imgInfoEl.textContent =
        '📐 ' + data.natW + ' × ' + data.natH + ' px' +
        (data.size != null ? '  |  📦 ' + formatSize(data.size) : '') +
        (data.scaled ? '  |  ⚠️ 已缩放至 ' + data.w + '×' + data.h : '') +
        (data.extra ? '  |  ' + data.extra : '');
    }

    function defaultMeta() {
      if (!img) return null;
      return { natW: img.naturalWidth || img.width, natH: img.naturalHeight || img.height,
               w: canvas.width, h: canvas.height, size: null, scaled: false, extra: null };
    }

    // ---------- 图片载入 ----------
    function acceptImageFile(file, silent) {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { showToast('图片超过 20MB，请压缩后再试'); return; }
      var url = URL.createObjectURL(file);
      loadImage(url).then(function (tempImg) {
        URL.revokeObjectURL(url);
        img = tempImg;
        placeholder.style.display = 'none';
        canvas.style.display = 'block';
        if (downloadBtn) downloadBtn.disabled = false;

        var w = img.naturalWidth || img.width || 800;
        var h = img.naturalHeight || img.height || 600;
        var scaled = false;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          var scale = MAX_SIZE / Math.max(w, h);
          w = Math.round(w * scale); h = Math.round(h * scale); scaled = true;
        }
        canvas.width = w; canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        originalImageData = ctx.getImageData(0, 0, w, h);
        baseImageData = null;

        var sx = Math.min(w - 1, Math.floor(w * 0.05));
        var sy = Math.min(h - 1, Math.floor(h * 0.05));
        var idx = (sy * w + sx) * 4;
        if (originalImageData.data[idx] !== undefined) {
          setOriginColor(originalImageData.data[idx], originalImageData.data[idx + 1], originalImageData.data[idx + 2]);
        }
        updateMeta({ natW: img.naturalWidth || w, natH: img.naturalHeight || h, w: w, h: h, size: file.size, scaled: scaled });
        redraw();
        if (!silent) showToast('图片加载成功');
      })['catch'](function () {
        URL.revokeObjectURL(url);
        alert('无法读取该图片');
      });
    }

    if (dropZone) {
      bindUploadZone(dropZone, imageInput, function (files) {
        var f = files[0];
        if (f && f.type && f.type.indexOf('image/') !== 0) { showToast('请放入图片文件'); return; }
        acceptImageFile(f);
      });
    }
    if (imageInput) {
      imageInput.addEventListener('change', function () {
        if (imageInput.files && imageInput.files[0]) acceptImageFile(imageInput.files[0]);
        imageInput.value = '';
      });
    }

    // 全局拖拽
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        var f = e.dataTransfer.files[0];
        if (f.type && f.type.indexOf('image/') === 0 && el('tab-watermark').classList.contains('active')) acceptImageFile(f);
      }
    });

    // 粘贴（支持当前 tab 或任意 tab 粘贴都进水印区）
    document.addEventListener('paste', function (e) {
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        var item = e.clipboardData.items[i];
        if (item.type && item.type.indexOf('image') !== -1) {
          var file = item.getAsFile();
          if (file) { e.preventDefault(); acceptImageFile(file); }
          return;
        }
      }
    });

    // ---------- 字体上传 ----------
    if (fontInput) {
      fontInput.addEventListener('change', function () {
        var file = fontInput.files && fontInput.files[0];
        if (!file) return;
        var token = ++fontLoadToken;
        fontNameEl.textContent = '正在加载…';
        var reader = new FileReader();
        reader.onload = function (e) {
          var uniqueFontName = 'CustomWMFont_' + token;
          try {
            var fontFace = new FontFace(uniqueFontName, e.target.result);
            fontFace.load().then(function (loadedFace) {
              if (document.fonts && document.fonts.add) document.fonts.add(loadedFace);
              if (token === fontLoadToken) {
                customFontName = '"' + uniqueFontName + '", sans-serif';
                fontNameEl.textContent = '✅ ' + file.name;
                redraw();
              }
            })['catch'](function () {
              if (token === fontLoadToken) { alert('字体解析失败'); fontNameEl.textContent = ''; fontInput.value = ''; }
            });
          } catch (err) {
            alert('字体解析失败：' + err.message);
            fontNameEl.textContent = ''; fontInput.value = '';
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }

    // ---------- LOGO ----------
    if (logoFileInput) {
      logoFileInput.addEventListener('change', function () {
        var file = logoFileInput.files && logoFileInput.files[0];
        if (!file) return;
        var url = URL.createObjectURL(file);
        loadImage(url).then(function (im) {
          URL.revokeObjectURL(url);
          logoImg = im;
          logoNaturalW = im.naturalWidth || im.width;
          logoNaturalH = im.naturalHeight || im.height;
          if (logoClearBtn) logoClearBtn.style.display = 'inline-block';
          showToast('LOGO 已添加');
          redraw();
        })['catch'](function () { URL.revokeObjectURL(url); showToast('LOGO 读取失败'); });
        logoFileInput.value = '';
      });
    }
    if (logoClearBtn) {
      logoClearBtn.style.display = 'none';
      logoClearBtn.addEventListener('click', function () {
        logoImg = null; logoNaturalW = 0; logoNaturalH = 0;
        logoFileInput.value = '';
        logoClearBtn.style.display = 'none';
        redraw();
      });
    }

    // ---------- 工具抽屉 ----------
    tools.forEach(function (t) {
      t.addEventListener('click', function () {
        var box = el(t.dataset.wmTool);
        if (!box) return;
        var open = box.style.display === 'block';
        box.style.display = open ? 'none' : 'block';
        t.classList.toggle('open', !open);
        if (!open) redraw();
      });
    });
    if (importAllBtn) {
      importAllBtn.addEventListener('click', function () {
        var files = [];
        if (importSub && importSub.files && importSub.files.length) files = Array.prototype.slice.call(importSub.files);
        if (!files.length) { importSub.click(); return; }
        var loaded = 0;
        files.forEach(function (f) {
          acceptImageFile(f, true);
          addToQueue(f, true);
          loaded++;
        });
        if (loaded) showToast('已导入 ' + loaded + ' 张图片');
      });
    }
    if (importSub) {
      importSub.addEventListener('change', function () {
        if (!importSub.files || !importSub.files.length) return;
        var n = importSub.files.length;
        acceptImageFile(importSub.files[0], true);
        for (var i = 1; i < n; i++) addToQueue(importSub.files[i], true);
        showToast('已导入 ' + n + ' 张图片');
        importSub.value = '';
      });
    }

    // ---------- 参数事件 ----------
    [textInput, colorInput, strokeColorInp].forEach(function (e) { if (e) e.addEventListener('input', redraw); });
    if (strokeCheckbox) strokeCheckbox.addEventListener('change', redraw);
    if (shadowCheckbox) shadowCheckbox.addEventListener('change', redraw);
    if (boldCheckbox) boldCheckbox.addEventListener('change', redraw);
    if (italicCheckbox) italicCheckbox.addEventListener('change', redraw);

    function bindRange(input, valEl, after) {
      if (!input) return;
      input.addEventListener('input', function () {
        if (valEl) valEl.textContent = this.value;
        if (after) after();
        else redraw();
      });
    }
    bindRange(sizeInput, sizeValEl);
    bindRange(opacityInput, opacityValEl);
    bindRange(rotateInput, rotateValEl);
    bindRange(paddingInput, paddingValEl);
    bindRange(lineInput, lineValEl);
    bindRange(tileGapInput, tileGapValEl);
    bindRange(tileAngleInput, tileAngleValEl);
    bindRange(logoScaleInput, logoScaleValEl);
    bindRange(logoOpacityInp, logoOpacityVal);
    bindRange(toleranceInput, toleranceValEl);
    bindRange(featherInput, featherValEl);
    bindRange(adjBriInput, adjBriVal, applyAdjustments);
    bindRange(adjConInput, adjConVal, applyAdjustments);
    bindRange(adjSatInput, adjSatVal, applyAdjustments);
    bindRange(adjWarmInput, adjWarmVal, applyAdjustments);
    bindRange(adjNoiseInput, adjNoiseVal, applyAdjustments);

    posButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        posButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPosition = btn.dataset.pos;
        redraw();
      });
    });

    if (enableBgEl) {
      enableBgEl.addEventListener('change', function () {
        bgSettingsEl.style.display = this.checked ? 'block' : 'none';
        redraw();
      });
    }
    if (bgModeSel) bgModeSel.addEventListener('change', redraw);
    if (btnKeepSkin) btnKeepSkin.addEventListener('click', function () {
      if (!originalImageData) { showToast('请先上传图片'); return; }
      protectSkin();
      showToast('已保护肤色区域，可再调容差');
    });

    if (btnAutoBg) {
      btnAutoBg.addEventListener('click', function () {
        if (!originalImageData) { showToast('请先上传图片'); return; }
        var c = detectBorderColor(originalImageData);
        setOriginColor(c.r, c.g, c.b);
        originColorInp.value = rgbToHex(c.r, c.g, c.b);
        enableBgEl.checked = true;
        bgSettingsEl.style.display = 'block';
        redraw();
        showToast('已自动吸取四角背景色：' + rgbToHex(c.r, c.g, c.b));
      });
    }

    bgColorBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        bgColorBtns.forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        var hex = this.dataset.color;
        targetColorInp.value = hex;
        currentTargetColor = hexToRgb(hex);
        redraw();
      });
    });
    if (targetColorInp) {
      targetColorInp.addEventListener('input', function () {
        currentTargetColor = hexToRgb(this.value);
        bgColorBtns.forEach(function (b) { b.classList.remove('active'); });
        redraw();
      });
    }
    if (originColorInp) {
      originColorInp.addEventListener('input', function () {
        setOriginColor.apply(null, [hexToRgb(this.value).r, hexToRgb(this.value).g, hexToRgb(this.value).b]);
        redraw();
      });
    }

    // 吸管
    if (eyedropperBtn) {
      eyedropperBtn.addEventListener('click', function () {
        isEyedropperActive = !isEyedropperActive;
        this.classList.toggle('active', isEyedropperActive);
        canvas.style.cursor = isEyedropperActive ? 'crosshair' : 'default';
      });
    }
    canvas.addEventListener('click', function (e) {
      if (!isEyedropperActive || !originalImageData) return;
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
      var y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
      var idx = (y * canvas.width + x) * 4;
      var data = originalImageData.data;
      if (data[idx] !== undefined) {
        setOriginColor(data[idx], data[idx + 1], data[idx + 2]);
        originColorInp.value = rgbToHex(data[idx], data[idx + 1], data[idx + 2]);
      }
      isEyedropperActive = false;
      eyedropperBtn.classList.remove('active');
      canvas.style.cursor = 'default';
      redraw();
    });

    // 调整
    function applyAdjustments() {
      if (!img) return;
      var w = canvas.width, h = canvas.height;
      var src = baseImageData || originalImageData;
      if (!src) return;
      var out = ctx.createImageData(w, h);
      var d = src.data, o = out.data;
      var bri = parseFloat(adjBriInput.value) || 0;
      var con = parseFloat(adjConInput.value) || 0;
      var sat = parseFloat(adjSatInput.value) || 0;
      var warm = parseFloat(adjWarmInput.value) || 0;
      var noise = parseFloat(adjNoiseInput.value) || 0;

      // 亮度：-100..100 → 乘数
      var bm = 1 + bri / 100;
      // 对比度：(-100..100) → 斜率
      var cm = (259 * (con + 255)) / (255 * (259 - con));
      var sm = 1 + sat / 100;

      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        r = (r - 128) * cm + 128;
        g = (g - 128) * cm + 128;
        b = (b - 128) * cm + 128;
        r *= bm; g *= bm; b *= bm;
        if (warm !== 0) {
          r += warm * 0.6; g += warm * 0.15; b -= warm * 0.6;
        }
        if (sat !== 0) {
          var gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * sm;
          g = gray + (g - gray) * sm;
          b = gray + (b - gray) * sm;
        }
        if (noise > 0) {
          var n = (Math.random() - 0.5) * noise * 2.2;
          r += n; g += n; b += n;
        }
        o[i]     = r;
        o[i + 1] = g;
        o[i + 2] = b;
        o[i + 3] = d[i + 3];
      }
      ctx.putImageData(out, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height);
    }

    if (btnAdjReset) {
      btnAdjReset.addEventListener('click', function () {
        [adjBriInput, adjConInput, adjSatInput, adjWarmInput, adjNoiseInput].forEach(function (inp) {
          if (inp) inp.value = 0;
        });
        [adjBriVal, adjConVal, adjSatVal, adjWarmVal, adjNoiseVal].forEach(function (v) {
          if (v) v.textContent = '0';
        });
        redraw();
      });
    }

    bindQualitySlider(qualityInput, qualityValEl);

    // ---------- 重置 ----------
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        textInput.value = '仅供办理业务使用，他用无效';
        colorInput.value = '#8a5a2b';
        sizeInput.value = '40'; sizeValEl.textContent = '40';
        opacityInput.value = '40'; opacityValEl.textContent = '40';
        rotateInput.value = '0'; rotateValEl.textContent = '0';
        paddingInput.value = '30'; paddingValEl.textContent = '30';
        if (lineInput) { lineInput.value = '1'; lineValEl.textContent = '1'; }
        if (tileGapInput) { tileGapInput.value = '40'; tileGapValEl.textContent = '40'; }
        if (tileAngleInput) { tileAngleInput.value = '30'; tileAngleValEl.textContent = '30'; }
        if (logoScaleInput) { logoScaleInput.value = '20'; logoScaleValEl.textContent = '20'; }
        if (logoOpacityInp) { logoOpacityInp.value = '80'; logoOpacityVal.textContent = '80'; }
        strokeCheckbox.checked = false;
        strokeColorInp.value = '#ffffff';
        if (shadowCheckbox) shadowCheckbox.checked = false;
        if (boldCheckbox) boldCheckbox.checked = false;
        if (italicCheckbox) italicCheckbox.checked = false;
        enableBgEl.checked = false;
        bgSettingsEl.style.display = 'none';
        toleranceInput.value = '60'; toleranceValEl.textContent = '60';
        featherInput.value = '20'; featherValEl.textContent = '20';
        if (bgModeSel) bgModeSel.value = 'global';
        targetColorInp.value = '#ffffff';
        currentTargetColor = { r: 255, g: 255, b: 255 };
        bgColorBtns.forEach(function (b) { b.classList.remove('active'); });
        if (bgColorBtns[0]) bgColorBtns[0].classList.add('active');
        if (btnAdjReset) btnAdjReset.click();
        currentPosition = 'bottom-right';
        posButtons.forEach(function (b) { b.classList.toggle('active', b.dataset.pos === 'bottom-right'); });
        exportFormatSel.value = 'image/png';
        qualityInput.value = '92'; qualityValEl.textContent = '92';
        if (namePrefixInp) namePrefixInp.value = 'watermarked_';
        customFontName = SYSTEM_FONT;
        fontNameEl.textContent = '';
        if (logoClearBtn) logoClearBtn.click();
        redraw();
        showToast('已重置所有设置');
      });
    }

    // ---------- 工具函数 ----------
    function setOriginColor(r, g, b) {
      currentOriginColor = { r: r, g: g, b: b };
      originPreviewEl.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
      originColorInp.value = rgbToHex(r, g, b);
    }

    function detectBorderColor(imageData) {
      var w = imageData.width, h = imageData.height, d = imageData.data;
      var step = Math.max(1, Math.floor(Math.min(w, h) / 40));
      var rs = 0, gs = 0, bs = 0, n = 0;
      function sample(x0, y0, x1, y1) {
        for (var y = y0; y <= y1; y += step) {
          for (var x = x0; x <= x1; x += step) {
            var i = (y * w + x) * 4;
            rs += d[i]; gs += d[i + 1]; bs += d[i + 2]; n++;
          }
        }
      }
      sample(0, 0, Math.min(w - 1, 8), Math.min(h - 1, 8));
      sample(Math.max(0, w - 9), 0, w - 1, Math.min(h - 1, 8));
      sample(0, Math.max(0, h - 9), Math.min(w - 1, 8), h - 1);
      sample(Math.max(0, w - 9), Math.max(0, h - 9), w - 1, h - 1);
      if (!n) return { r: 255, g: 255, b: 255 };
      return { r: Math.round(rs / n), g: Math.round(gs / n), b: Math.round(bs / n) };
    }

    function protectSkin() {
      // 把肤色像素在原图中微调，使其远离“蓝/白背景”判定
      var d = originalImageData.data;
      var changed = 0;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        if (r > 95 && g > 40 && b > 20 && r - g > 15 && r - g < 220 && r > g && r > b && (r - g) > (b - g) * 0.5) {
          d[i] = r; d[i + 1] = Math.max(0, g - 8); d[i + 2] = Math.max(0, b - 18);
          changed++;
        }
      }
      if (changed > 0) baseImageData = null;
    }

    function buildBaseLayer() {
      var src = originalImageData;
      if (!src) return null;
      if (!enableBgEl || !enableBgEl.checked) return src;
      var w = src.width, h = src.height;
      var data = src.data;
      var out = new ImageData(new Uint8ClampedArray(data), w, h);
      var nd = out.data;

      var tolerance = (parseInt(toleranceInput.value, 10) / 100) * 255;
      var feather   = (parseInt(featherInput.value, 10) / 100) * 255;
      var or0 = currentOriginColor.r, og0 = currentOriginColor.g, ob0 = currentOriginColor.b;
      var tr = currentTargetColor.r, tg = currentTargetColor.g, tb = currentTargetColor.b;
      var tSq = tolerance * tolerance;
      var fSq = (tolerance + feather) * (tolerance + feather);
      var useFeather = feather > 0;
      var mode = (bgModeSel && bgModeSel.value) || 'global';

      function isSkin(r, g, b) {
        return (r > 95 && g > 40 && b > 20 && r - g > 15 && r - g < 220 && r > g && r > b);
      }

      if (mode === 'flood') {
        // 从四角漫水填充，只替换连通背景，衣服不会被误伤
        var visited = new Uint8Array(w * h);
        var stack = [];
        function push(x, y) { if (x >= 0 && y >= 0 && x < w && y < h && !visited[y * w + x]) { visited[y * w + x] = 1; stack.push(y * w + x); } }
        push(0, 0); push(w - 1, 0); push(0, h - 1); push(w - 1, h - 1);
        for (var xb = 0; xb < w; xb += 4) { push(xb, 0); push(xb, h - 1); }
        for (var yb = 0; yb < h; yb += 4) { push(0, yb); push(w - 1, yb); }
        var or1 = or0 | 0, og1 = og0 | 0, ob1 = ob0 | 0;
        var tol = Math.max(8, Math.round(tolerance));
        while (stack.length) {
          var p = stack.pop();
          var px = p % w, py = (p - px) / w;
          var pi = p * 4;
          var dr = data[pi] - or1, dg = data[pi + 1] - og1, db = data[pi + 2] - ob1;
          if (dr * dr + dg * dg + db * db > tol * tol) continue;
          nd[pi] = tr; nd[pi + 1] = tg; nd[pi + 2] = tb;
          stack.push(p - 1, p + 1, p - w, p + w);
          var nx = px - 1, nx2 = px + 1, ny1 = py - 1, ny2 = py + 1;
          if (nx >= 0) push(nx, py);
          if (nx2 < w) push(nx2, py);
          if (ny1 >= 0) push(px, ny1);
          if (ny2 < h) push(px, ny2);
        }
        // 羽化：对替换区域边缘做一次轻度平滑
        if (useFeather) smoothEdges(nd, w, h, Math.round(feather / 40) + 1);
      } else {
        for (var i = 0; i < nd.length; i += 4) {
          var r = data[i], g = data[i + 1], b = data[i + 2];
          if (mode === 'keep-skin' && isSkin(r, g, b)) continue;
          var ddr = r - or0, ddg = g - og0, ddb = b - ob0;
          var distSq = ddr * ddr + ddg * ddg + ddb * ddb;
          if (distSq < tSq) {
            nd[i] = tr; nd[i + 1] = tg; nd[i + 2] = tb;
          } else if (useFeather && distSq < fSq) {
            var dist = Math.sqrt(distSq);
            var ratio = (dist - tolerance) / (feather || 1);
            if (ratio < 0) ratio = 0;
            if (ratio > 1) ratio = 1;
            nd[i] = r * ratio + tr * (1 - ratio);
            nd[i + 1] = g * ratio + tg * (1 - ratio);
            nd[i + 2] = b * ratio + tb * (1 - ratio);
          }
        }
      }
      return out;
    }

    function smoothEdges(data, w, h, radius) {
      var tmp = new Uint8ClampedArray(data);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var i = (y * w + x) * 4;
          var rs = 0, gs = 0, bs = 0, n = 0;
          for (var yy = y - radius; yy <= y + radius; yy++) {
            for (var xx = x - radius; xx <= x + radius; xx++) {
              if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
              var j = (yy * w + xx) * 4;
              rs += tmp[j]; gs += tmp[j + 1]; bs += tmp[j + 2]; n++;
            }
          }
          if (n > 1) { data[i] = rs / n; data[i + 1] = gs / n; data[i + 2] = bs / n; }
        }
      }
    }

    function drawWatermark(c, w, h) {
      if (!img) return;
      var text = textInput.value;
      var hasText = text && text.length > 0;
      var size = parseInt(sizeInput.value, 10) || 40;
      var opacity = (parseInt(opacityInput.value, 10) || 40) / 100;
      var rotateRad = (parseInt(rotateInput.value, 10) || 0) * Math.PI / 180;
      var padding = parseInt(paddingInput.value, 10) || 0;

      // ---- LOGO ----
      if (logoImg) {
        var ls = (parseFloat(logoScaleInput.value) || 20) / 100;
        var lo = (parseFloat(logoOpacityInp.value) || 80) / 100;
        var lw = Math.max(8, Math.round(w * ls));
        var lh = Math.max(8, Math.round(lw * logoNaturalH / (logoNaturalW || 1)));
        var lx, ly;
        if (currentPosition.indexOf('left') !== -1) lx = padding;
        else if (currentPosition.indexOf('right') !== -1) lx = w - padding - lw;
        else lx = (w - lw) / 2;
        if (currentPosition.indexOf('top') !== -1) ly = padding;
        else if (currentPosition.indexOf('bottom') !== -1) ly = h - padding - lh;
        else ly = (h - lh) / 2;
        c.save();
        c.globalAlpha = opacity * lo * 2.5 > 1 ? 1 : opacity * lo * 2.5;
        c.translate(lx + lw / 2, ly + lh / 2);
        c.rotate(rotateRad);
        c.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh);
        c.restore();
      }

      if (!hasText) return;

      var lines = text.split(/\r?\n/);
      var lineGap = parseInt(lineInput ? lineInput.value : 1, 10) || 1;
      var lineHeight = size * lineGap;
      var fontSize = size;
      var fontFamily = customFontName;
      var styleStr = (italicCheckbox && italicCheckbox.checked ? 'italic ' : '') +
                     (boldCheckbox && boldCheckbox.checked ? 'bold ' : '');
      c.font = styleStr + fontSize + 'px ' + fontFamily;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.globalAlpha = opacity;

      var useStroke = strokeCheckbox && strokeCheckbox.checked;
      var strokeW = Math.max(1, Math.round(fontSize / 22));
      var useShadow = shadowCheckbox && shadowCheckbox.checked;

      function paintLine(txt, tx, ty) {
        if (useShadow) {
          c.save();
          c.shadowColor = 'rgba(0,0,0,0.45)';
          c.shadowBlur = Math.max(2, fontSize * 0.18);
          c.shadowOffsetX = Math.max(1, fontSize * 0.06);
          c.shadowOffsetY = Math.max(1, fontSize * 0.06);
          if (useStroke) c.strokeText(txt, tx, ty);
          c.fillText(txt, tx, ty);
          c.restore();
        }
        if (useStroke) {
          c.lineWidth = strokeW;
          c.strokeStyle = strokeColorInp.value;
          c.lineJoin = 'round';
          c.strokeText(txt, tx, ty);
        }
        c.fillStyle = colorInput.value;
        c.fillText(txt, tx, ty);
      }

      if (currentPosition === 'tile') {
        c.save();
        c.translate(w / 2, h / 2);
        c.rotate((-(parseInt(tileAngleInput ? tileAngleInput.value : 30, 10) || 0)) * Math.PI / 180 + rotateRad);
        var maxTextW = 0;
        lines.forEach(function (ln) { maxTextW = Math.max(maxTextW, c.measureText(ln).width); });
        var gapX = parseInt(tileGapInput ? tileGapInput.value : 40, 10) || 0;
        var stepX = maxTextW + fontSize * 0.6 + gapX;
        var stepY = lineHeight * lines.length + gapX;
        var diag = Math.sqrt(w * w + h * h) / 2;
        for (var tx = -diag; tx < diag; tx += stepX) {
          for (var ty = -diag; ty < diag; ty += stepY) {
            for (var li = 0; li < lines.length; li++) {
              paintLine(lines[li], tx, ty + li * lineHeight - (lines.length - 1) * lineHeight / 2);
            }
          }
        }
        c.restore();
      } else {
        var cx, cy;
        if (currentPosition.indexOf('left') !== -1) {
          var mwL = 0; lines.forEach(function (ln) { mwL = Math.max(mwL, c.measureText(ln).width); });
          cx = padding + mwL / 2;
        } else if (currentPosition.indexOf('right') !== -1) {
          var mwR = 0; lines.forEach(function (ln) { mwR = Math.max(mwR, c.measureText(ln).width); });
          cx = w - padding - mwR / 2;
        } else {
          cx = w / 2;
        }
        if (currentPosition.indexOf('top') !== -1) {
          cy = padding + lineHeight / 2;
        } else if (currentPosition.indexOf('bottom') !== -1) {
          cy = h - padding - lineHeight / 2;
        } else {
          cy = h / 2;
        }
        c.save();
        c.translate(cx, cy);
        c.rotate(rotateRad);
        for (var i2 = 0; i2 < lines.length; i2++) {
          paintLine(lines[i2], 0, i2 * lineHeight - (lines.length - 1) * lineHeight / 2);
        }
        c.restore();
      }
      c.globalAlpha = 1.0;
    }

    function redraw() {
      if (!img || !originalImageData) return;
      baseImageData = buildBaseLayer();
      var src = baseImageData || originalImageData;
      ctx.putImageData(src, 0, 0);
      drawWatermark(ctx, canvas.width, canvas.height);
      var meta = defaultMeta();
      if (enableBgEl && enableBgEl.checked && (bgModeSel && bgModeSel.value === 'flood')) {
        meta.extra = '换底色：连通区域模式';
      }
      updateMeta(meta);
    }
    window.__wmRedraw = redraw;

    // ---------- 画布缩放 ----------
    if (btnFit) btnFit.addEventListener('click', function () {
      canvas.style.width = ''; canvas.style.height = '';
      canvas.style.maxWidth = '100%'; canvas.style.maxHeight = '65vh';
    });
    if (btnOrig) btnOrig.addEventListener('click', function () {
      canvas.style.maxWidth = 'none'; canvas.style.maxHeight = 'none';
      canvas.style.width = canvas.width + 'px';
    });

    // ---------- 导出 ----------
    function currentFormat() { return exportFormatSel.value; }
    function currentQuality() { return (parseInt(qualityInput.value, 10) || 92) / 100; }
    function extOf(fmt) { return fmt === 'image/jpeg' ? 'jpg' : (fmt === 'image/webp' ? 'webp' : 'png'); }
    function outputCanvas() {
      var fmt = currentFormat();
      if (fmt === 'image/jpeg') {
        var tmp = document.createElement('canvas');
        tmp.width = canvas.width; tmp.height = canvas.height;
        var tctx = tmp.getContext('2d');
        tctx.fillStyle = '#' + (targetColorInp ? targetColorInp.value.replace('#', '') : 'ffffff');
        tctx.fillRect(0, 0, tmp.width, tmp.height);
        tctx.drawImage(canvas, 0, 0);
        return tmp;
      }
      return canvas;
    }
    function fileNameOf(base) {
      var prefix = (namePrefixInp && namePrefixInp.value) ? namePrefixInp.value : 'watermarked_';
      return prefix + (base || ('img_' + Date.now())) + '.' + extOf(currentFormat());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!img) return;
        var blob = exportCanvas(outputCanvas(), currentFormat(), parseInt(qualityInput ? qualityInput.value : 92, 10));
        blob.then(function (b) {
          if (!b) { showToast('导出失败'); return; }
          saveBlob(b, fileNameOf('img_' + Date.now()));
          showToast('已导出 ' + extOf(currentFormat()).toUpperCase());
        });
      });
    }

    // 单张加入批量队列
    function addToQueue(file, silent) {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { if (!silent) showToast('图片超过 20MB，已跳过'); return; }
      getImageSize(file).then(function (size) {
        var id = ++queueSeq;
        queue.push({ id: id, file: file, name: file.name || ('图片' + id), size: size, dataUrl: null });
        renderQueue();
        if (!silent) showToast('已加入队列（' + queue.length + '）');
      });
    }
    function renderQueue() {
      if (!queueListEl) return;
      if (!queue.length) { queueListEl.innerHTML = '<span class="wm-hint">队列为空，可在上方选择多张图片</span>'; return; }
      queueListEl.innerHTML = queue.map(function (it) {
        return '<span class="wm-chip" data-id="' + it.id + '" title="' + esc(it.name) + '">' +
          '🖼️ ' + esc(it.name.length > 12 ? it.name.slice(0, 12) + '…' : it.name) +
          '<i data-del="' + it.id + '">×</i></span>';
      }).join('');
    }
    if (btnAddQueue) btnAddQueue.addEventListener('click', function () { openFilePicker(imageInput, 'image/*,.heic,.heif'); });
    if (btnClearQueue) btnClearQueue.addEventListener('click', function () { queue = []; renderQueue(); showToast('队列已清空'); });
    if (queueListEl) {
      queueListEl.addEventListener('click', function (e) {
        var del = e.target.dataset ? e.target.dataset.del : null;
        if (del) {
          queue = queue.filter(function (it) { return String(it.id) !== String(del); });
          renderQueue();
          return;
        }
        var chip = e.target.closest ? e.target.closest('.wm-chip') : null;
        if (chip && chip.dataset.id) {
          var item = queue.filter(function (it) { return String(it.id) === chip.dataset.id; })[0];
          if (item) acceptImageFile(item.file);
        }
      });
    }
    renderQueue();

    // 批量导出：对队列中每张图应用同样参数
    if (btnDownloadAll) {
      btnDownloadAll.addEventListener('click', function () {
        var list = queue.slice();
        if (!list.length && img) {
          showToast('队列为空，已导出当前图片');
          if (downloadBtn) downloadBtn.click();
          return;
        }
        if (!list.length) { showToast('请先选择多张图片'); return; }
        var fmt = currentFormat(), q = currentQuality();
        var idx = 0, okCount = 0;
        showToast('开始批量导出 ' + list.length + ' 张…', 2400);
        function next() {
          if (idx >= list.length) {
            showToast('批量导出完成，成功 ' + okCount + ' 张');
            return;
          }
          var item = list[idx++];
          readFileAsDataURL(item.file).then(loadImage).then(function (im) {
            var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
            var scale = 1;
            if (w > MAX_SIZE || h > MAX_SIZE) { scale = MAX_SIZE / Math.max(w, h); w = Math.round(w * scale); h = Math.round(h * scale); }
            var tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            var tc = tmp.getContext('2d', { willReadFrequently: true });
            tc.drawImage(im, 0, 0, w, h);
            var savedImg = img, savedData = originalImageData, savedBase = baseImageData;
            var savedLogo = logoImg;
            img = im;
            originalImageData = tc.getImageData(0, 0, w, h);
            canvas.width = w; canvas.height = h;
            baseImageData = buildBaseLayer();
            ctx.putImageData(baseImageData || originalImageData, 0, 0);
            drawWatermark(tc, w, h);
            img = savedImg; originalImageData = savedData; baseImageData = savedBase; logoImg = savedLogo;
            var out = tmp;
            if (fmt === 'image/jpeg') {
              var jc = document.createElement('canvas');
              jc.width = w; jc.height = h;
              var jctx = jc.getContext('2d');
              jctx.fillStyle = targetColorInp.value;
              jctx.fillRect(0, 0, w, h);
              jctx.drawImage(tmp, 0, 0);
              out = jc;
            }
            return exportCanvas(out, fmt, q).then(function (b) {
              if (b) { saveBlob(b, fileNameOf((item.name || 'img').replace(/\.[^.]+$/, ''))); okCount++; }
              setTimeout(next, 120);
            });
          })['catch'](function () { setTimeout(next, 0); });
        }
        next();
      });
    }
  })();

  /* ============================================================
   * 模块 2：智能抠图（背景移除）
   * ============================================================ */
  (function initCutout() {
    var dropZone  = el('ct-drop-zone');
    var fileInput = el('ct-image-input');
    var canvas    = el('ct-canvas');
    var placeholder = el('ct-placeholder');
    var btnDownload = el('ct-download');
    var btnDownloadBg = el('ct-download-bg');
    var btnAuto = el('ct-auto');
    var originInp = el('ct-origin-color');
    var toleranceInp = el('ct-tolerance');
    var toleranceVal = el('ct-tolerance-val');
    var featherInp = el('ct-feather');
    var featherVal = el('ct-feather-val');
    var erodeInp = el('ct-erode');
    var erodeVal = el('ct-erode-val');
    var bgSel = el('ct-bg-mode');
    var bgColorInp = el('ct-bg-color');
    if (!canvas) return;

    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = null;
    var srcData = null;
    var mask = null;   // Uint8Array 0..255
    var MAX = 2600;

    function loadFile(file) {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { showToast('图片超过 20MB'); return; }
      var url = URL.createObjectURL(file);
      loadImage(url).then(function (im) {
        URL.revokeObjectURL(url);
        img = im;
        var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        var scaled = false;
        if (w > MAX || h > MAX) { var s = MAX / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); scaled = true; }
        canvas.width = w; canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(im, 0, 0, w, h);
        srcData = ctx.getImageData(0, 0, w, h);
        mask = new Uint8Array(w * h);
        placeholder.style.display = 'none';
        canvas.style.display = 'block';
        btnDownload.disabled = false;
        if (btnDownloadBg) btnDownloadBg.disabled = false;
        var info = el('ct-img-info');
        if (info) {
          info.style.display = 'block';
          info.textContent = '📐 ' + (im.naturalWidth || w) + ' × ' + (im.naturalHeight || h) + ' px | 📦 ' + formatSize(file.size) + (scaled ? ' | 已缩放至 ' + w + '×' + h : '');
        }
        autoMask();
        showToast('图片已载入，已自动生成抠图');
      })['catch'](function () { URL.revokeObjectURL(url); showToast('图片读取失败'); });
    }

    bindUploadZone(dropZone, fileInput, function (files) { loadFile(files[0]); });
    if (fileInput) fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
      fileInput.value = '';
    });

    function autoMask() {
      if (!srcData) return;
      var w = srcData.width, h = srcData.height, d = srcData.data;
      var c = originInp && originInp.value ? hexToRgb(originInp.value) : { r: 255, g: 255, b: 255 };
      if (!originInp || !originInp.value) {
        var corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(function (p) {
          var i = (p[1] * w + p[0]) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]];
        });
        var acc = [0, 0, 0], cnt = 0;
        corners.forEach(function (v) { if (v[3] > 0) { acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2]; cnt++; } });
        var avg = cnt ? [Math.round(acc[0] / cnt), Math.round(acc[1] / cnt), Math.round(acc[2] / cnt)] : [255, 255, 255];
        c = { r: avg[0], g: avg[1], b: avg[2] };
        if (originInp) originInp.value = rgbToHex(avg[0], avg[1], avg[2]);
      }
      var tol = (parseInt(toleranceInp.value, 10) / 100) * 255;
      var tolSq = tol * tol;
      var visited = new Uint8Array(w * h);
      var stack = [];
      function push(p) { if (!visited[p]) { visited[p] = 1; stack.push(p); } }
      for (var x = 0; x < w; x += 3) { push(x); push((h - 1) * w + x); }
      for (var y = 0; y < h; y += 3) { push(y * w); push(y * w + w - 1); }
      while (stack.length) {
        var p = stack.pop();
        var px = p % w, py = (p - px) / w;
        var i = p * 4;
        var dr = d[i] - c.r, dg = d[i + 1] - c.g, db = d[i + 2] - c.b;
        if (dr * dr + dg * dg + db * db > tolSq) continue;
        mask[p] = 255;
        if (px > 0) push(p - 1);
        if (px < w - 1) push(p + 1);
        if (py > 0) push(p - w);
        if (py < h - 1) push(p + w);
      }
      // 反转：抠出主体
      for (var k = 0; k < mask.length; k++) mask[k] = mask[k] ? 0 : 255;
      postProcess();
      redraw();
    }

    function postProcess() {
      var erode = parseInt(erodeInp ? erodeInp.value : 0, 10) || 0;
      var w = srcData.width, h = srcData.height;
      if (erode > 0) {
        var tmp = new Uint8Array(mask);
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var p = y * w + x;
            if (tmp[p] !== 255) continue;
            for (var dy = -erode; dy <= erode; dy++) {
              for (var dx = -erode; dx <= erode; dx++) {
                var nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) { mask[p] = 0; break; }
                if (tmp[ny * w + nx] !== 255) { mask[p] = 0; }
              }
            }
          }
        }
      }
      var feather = parseInt(featherInp ? featherInp.value : 0, 10) || 0;
      if (feather > 0) {
        var src = new Uint8Array(mask);
        var rad = Math.max(1, Math.round(feather / 12));
        for (var y2 = 0; y2 < h; y2++) {
          for (var x2 = 0; x2 < w; x2++) {
            var sum = 0, n = 0;
            for (var yy = y2 - rad; yy <= y2 + rad; yy++) {
              for (var xx = x2 - rad; xx <= x2 + rad; xx++) {
                if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                sum += src[yy * w + xx]; n++;
              }
            }
            mask[y2 * w + x2] = n ? Math.round(sum / n) : src[y2 * w + x2];
          }
        }
      }
    }

    function redraw() {
      if (!srcData) return;
      var w = srcData.width, h = srcData.height;
      var mode = bgSel ? bgSel.value : 'checker';
      if (mode === 'color') {
        ctx.fillStyle = bgColorInp ? bgColorInp.value : '#ffffff';
        ctx.fillRect(0, 0, w, h);
      } else if (mode === 'white') {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      } else if (mode === 'black') {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);
      } else if (mode === 'original') {
        ctx.putImageData(srcData, 0, 0);
      } else {
        drawChecker(ctx, w, h, Math.max(8, Math.round(w / 40)));
      }
      var out = ctx.createImageData(w, h);
      var sd = srcData.data, od = out.data;
      for (var i = 0; i < sd.length; i += 4) {
        var p = i / 4;
        var a = mask[p];
        od[i] = sd[i]; od[i + 1] = sd[i + 1]; od[i + 2] = sd[i + 2];
        od[i + 3] = a;
      }
      // 用临时画布合成，保留背景
      var tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      tmp.getContext('2d').putImageData(out, 0, 0);
      ctx.drawImage(tmp, 0, 0);
    }
    window.__ctRedraw = redraw;

    function drawChecker(c, w, h, size) {
      for (var y = 0; y < h; y += size) {
        for (var x = 0; x < w; x += size) {
          c.fillStyle = ((x / size) + (y / size)) % 2 === 0 ? '#ffffff' : '#d9d9d9';
          c.fillRect(x, y, size, size);
        }
      }
    }

    function exportCanvas(withBg) {
      var w = canvas.width, h = canvas.height;
      var out = document.createElement('canvas');
      out.width = w; out.height = h;
      var oc = out.getContext('2d');
      if (withBg) {
        oc.fillStyle = (bgSel && bgSel.value === 'color' && bgColorInp) ? bgColorInp.value : '#ffffff';
        oc.fillRect(0, 0, w, h);
        oc.drawImage(canvas, 0, 0);
      } else {
        var tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        tmp.getContext('2d').drawImage(canvas, 0, 0);
        var d = tmp.getContext('2d').getImageData(0, 0, w, h);
        oc.putImageData(d, 0, 0);
      }
      return out;
    }

    if (btnAuto) btnAuto.addEventListener('click', function () {
      if (!srcData) { showToast('请先上传图片'); return; }
      autoMask(); showToast('已重新自动抠图');
    });
    [toleranceInp, featherInp, erodeInp].forEach(function (inp) {
      if (!inp) return;
      inp.addEventListener('input', function () {
        if (toleranceVal && inp === toleranceInp) toleranceVal.textContent = this.value;
        if (featherVal && inp === featherInp) featherVal.textContent = this.value;
        if (erodeVal && inp === erodeInp) erodeVal.textContent = this.value;
        if (!srcData) return;
        autoMask();
      });
    });
    if (bgSel) bgSel.addEventListener('change', redraw);
    if (bgColorInp) bgColorInp.addEventListener('input', function () { if (bgSel) bgSel.value = 'color'; redraw(); });

    if (btnDownload) btnDownload.addEventListener('click', function () {
      if (!srcData) return;
      exportCanvas(exportCanvas(false), 'image/png', 100).then(function (b) {
        if (!b) { showToast('导出失败'); return; }
        saveBlob(b, 'cutout_' + Date.now() + '.png');
        showToast('已导出透明 PNG');
      });
    });
    if (btnDownloadBg) btnDownloadBg.addEventListener('click', function () {
      if (!srcData) return;
      var fmtSel = el('ct-export-format');
      var fmt = fmtSel ? fmtSel.value : 'image/png';
      exportCanvas(exportCanvas(true), fmt, 92).then(function (b) {
        if (!b) { showToast('导出失败'); return; }
        saveBlob(b, 'cutout_bg_' + Date.now() + '.' + (fmt === 'image/jpeg' ? 'jpg' : 'png'));
        showToast('已导出带背景图片');
      });
    });
  })();

  /* ============================================================
   * 模块 3：裁剪与旋转
   * ============================================================ */
  (function initCrop() {
    var dropZone = el('cr-drop-zone');
    var fileInput = el('cr-image-input');
    var canvas = el('cr-canvas');
    var placeholder = el('cr-placeholder');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var wrap = el('cr-canvas-wrap');

    var ratioSel = el('cr-ratio');
    var rwInp = el('cr-ratio-w');
    var rhInp = el('cr-ratio-h');
    var rotInput = el('cr-rotate');
    var rotVal = el('cr-rotate-val');
    var zoomInput = el('cr-zoom');
    var zoomVal = el('cr-zoom-val');
    var btnRotateL = el('cr-rot-left');
    var btnRotateR = el('cr-rot-right');
    var btnFlipH = el('cr-flip-h');
    var btnFlipV = el('cr-flip-v');
    var btnReset = el('cr-reset');
    var btnCrop = el('cr-crop');
    var maskModeSel = el('cr-mask-mode');
    var maskAlphaInp = el('cr-mask-alpha');
    var btnCropAll = el('cr-crop-all');
    var infoEl = el('cr-info');
    var outSel = el('cr-output-size');

    var img = null;
    var scale = 1, rot = 0, flipX = 1, flipY = 1;
    var rect = { x: 0, y: 0, w: 0, h: 0 };
    var dragging = false, resizing = false, startPt = null, startRect = null;
    var MAX = 4000;

    function fitRect() {
      var r = ratio();
      var cw = canvas.width, ch = canvas.height;
      if (!r) { rect = { x: cw * 0.1, y: ch * 0.1, w: cw * 0.8, h: ch * 0.8 }; return; }
      var targetRatio = r.w / r.h;
      var w = cw * 0.8, h = w / targetRatio;
      if (h > ch * 0.8) { h = ch * 0.8; w = h * targetRatio; }
      rect = { x: (cw - w) / 2, y: (ch - h) / 2, w: w, h: h };
    }
    function ratio() {
      var v = ratioSel ? ratioSel.value : 'free';
      if (v === 'free') return null;
      if (v === 'custom') {
        var w = parseFloat(rwInp && rwInp.value) || 1;
        var h = parseFloat(rhInp && rhInp.value) || 1;
        return { w: w, h: h };
      }
      var map = { '1:1': [1, 1], '4:3': [4, 3], '3:4': [3, 4], '16:9': [16, 9], '9:16': [9, 16], '3:2': [3, 2], '2:3': [2, 3], '5:7': [5, 7], '7:5': [7, 5] };
      var m = map[v];
      return m ? { w: m[0], h: m[1] } : null;
    }

    function loadFile(file) {
      if (!file) return;
      var url = URL.createObjectURL(file);
      loadImage(url).then(function (im) {
        URL.revokeObjectURL(url);
        img = im;
        scale = 1; rot = 0; flipX = 1; flipY = 1;
        if (rotInput) rotInput.value = 0;
        if (zoomInput) zoomInput.value = 100;
        var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        var s = 1;
        if (w > MAX || h > MAX) s = MAX / Math.max(w, h);
        canvas.width = Math.round(w * s); canvas.height = Math.round(h * s);
        placeholder.style.display = 'none';
        canvas.style.display = 'block';
        if (btnCrop) btnCrop.disabled = false;
        fitRect();
        redraw();
        showToast('图片已载入');
      })['catch'](function () { URL.revokeObjectURL(url); showToast('图片读取失败'); });
    }

    bindUploadZone(dropZone, fileInput, function (files) { loadFile(files[0]); });
    if (fileInput) fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
      fileInput.value = '';
    });

    function redraw() {
      if (!img) return;
      var cw = canvas.width, ch = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#f3f3f3';
      ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate(rot * Math.PI / 180);
      ctx.scale(scale * flipX, scale * flipY);
      var w = img.width, h = img.height;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // 暗化遮罩 / 框外背景：只作用于裁剪框【外】，框内始终保留原图
      var maskMode = (maskModeSel && maskModeSel.value) ? maskModeSel.value : 'dark';
      // 用 evenodd 裁出"框外"区域，对其填充或清空，框内原图不受影响
      function outsideRegion(fn) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.rect(rect.x, rect.y, rect.w, rect.h);
        ctx.clip('evenodd');
        fn();
        ctx.restore();
      }
      if (maskMode === 'none') {
        // 不遮罩：裁剪框外保留原图
      } else if (maskMode === 'transparent') {
        // 框外清成透明，框内保留原图，再在框外画棋盘格
        outsideRegion(function () { ctx.clearRect(0, 0, cw, ch); });
        drawChecker(cw, ch, rect);
      } else if (maskMode === 'white' || maskMode === 'black') {
        outsideRegion(function () {
          ctx.fillStyle = (maskMode === 'white') ? '#ffffff' : '#000000';
          ctx.fillRect(0, 0, cw, ch);
        });
      } else {
        outsideRegion(function () {
          ctx.fillStyle = 'rgba(0,0,0,' + ((parseInt(maskAlphaInp ? maskAlphaInp.value : 45, 10) || 45) / 100) + ')';
          ctx.fillRect(0, 0, cw, ch);
        });
      }
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
      // 三分线
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      for (var i = 1; i <= 2; i++) {
        var gx = rect.x + rect.w * i / 3, gy = rect.y + rect.h * i / 3;
        ctx.beginPath(); ctx.moveTo(gx, rect.y); ctx.lineTo(gx, rect.y + rect.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rect.x, gy); ctx.lineTo(rect.x + rect.w, gy); ctx.stroke();
      }
      ctx.restore();
      // 手柄
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(rect.x + rect.w - 6, rect.y + rect.h - 6, 12, 12);
      if (infoEl) {
        infoEl.textContent = '裁剪框 ' + Math.round(rect.w) + ' × ' + Math.round(rect.h) + ' px' +
          '（输出约 ' + Math.round(rect.w / Math.max(scale, 0.01)) + ' × ' + Math.round(rect.h / Math.max(scale, 0.01)) + ' px）';
      }
    }
    function drawChecker(cw, ch, r) {
      var size = 12;
      ctx.save();
      for (var y = 0; y < ch; y += size) {
        for (var x = 0; x < cw; x += size) {
          var inside = r && x >= r.x && y >= r.y && x + size <= r.x + r.w && y + size <= r.y + r.h;
          if (inside) continue;
          ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#ffffff' : '#d9d9d9';
          ctx.fillRect(x, y, size, size);
        }
      }
      ctx.restore();
    }
    if (maskModeSel) maskModeSel.addEventListener('change', redraw);
    bindQualitySlider(maskAlphaInp, el('cr-mask-alpha-val'), redraw);
    window.__crRedraw = redraw;

    function toCanvasPoint(e) {
      var b = canvas.getBoundingClientRect();
      var t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return {
        x: (t.clientX - b.left) * (canvas.width / b.width),
        y: (t.clientY - b.top) * (canvas.height / b.height)
      };
    }
    function hitHandle(p) {
      return Math.abs(p.x - (rect.x + rect.w)) < 14 && Math.abs(p.y - (rect.y + rect.h)) < 14;
    }
    function onDown(e) {
      if (!img) return;
      var p = toCanvasPoint(e);
      dragging = true;
      resizing = hitHandle(p);
      startPt = p;
      startRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging || !startPt) return;
      var p = toCanvasPoint(e);
      var dx = p.x - startPt.x, dy = p.y - startPt.y;
      if (resizing) {
        var r = ratio();
        var nw = Math.max(20, startRect.w + dx);
        var nh = r ? nw * (r.h / r.w) : Math.max(20, startRect.h + dy);
        if (rect.x + nw > canvas.width) nw = canvas.width - rect.x;
        if (rect.y + nh > canvas.height) nh = r ? (canvas.height - rect.y) * (r.w / r.h) : canvas.height - rect.y;
        rect.w = nw; rect.h = nh;
      } else {
        rect.x = Math.max(0, Math.min(canvas.width - rect.w, startRect.x + dx));
        rect.y = Math.max(0, Math.min(canvas.height - rect.h, startRect.y + dy));
      }
      redraw();
      e.preventDefault();
    }
    function onUp() { dragging = false; resizing = false; startPt = null; }
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    if (ratioSel) ratioSel.addEventListener('change', function () {
      if (rwInp && rhInp) {
        var show = this.value === 'custom';
        rwInp.style.display = show ? 'inline-block' : 'none';
        rhInp.style.display = show ? 'inline-block' : 'none';
      }
      fitRect(); redraw();
    });
    [rwInp, rhInp].forEach(function (i) { if (i) i.addEventListener('input', function () { fitRect(); redraw(); }); });
    bindQualitySlider(el('cr-quality'), el('cr-quality-val'));
    if (rotInput) rotInput.addEventListener('input', function () { rot = parseFloat(this.value) || 0; if (rotVal) rotVal.textContent = this.value; redraw(); });
    if (zoomInput) zoomInput.addEventListener('input', function () {
      scale = (parseFloat(this.value) || 100) / 100;
      if (zoomVal) zoomVal.textContent = this.value + '%';
      redraw();
    });
    if (btnRotateL) btnRotateL.addEventListener('click', function () { rot = (rot - 90) % 360; if (rotInput) rotInput.value = rot; redraw(); });
    if (btnRotateR) btnRotateR.addEventListener('click', function () { rot = (rot + 90) % 360; if (rotInput) rotInput.value = rot; redraw(); });
    if (btnFlipH) btnFlipH.addEventListener('click', function () { flipX *= -1; redraw(); });
    if (btnFlipV) btnFlipV.addEventListener('click', function () { flipY *= -1; redraw(); });
    if (btnReset) btnReset.addEventListener('click', function () {
      if (!img) return;
      scale = 1; rot = 0; flipX = 1; flipY = 1;
      if (rotInput) rotInput.value = 0;
      if (zoomInput) { zoomInput.value = 100; zoomVal.textContent = '100%'; }
      fitRect(); redraw();
    });
    if (btnCrop) btnCrop.addEventListener('click', function () {
      if (!img) return;
      var out = croppedCanvas();
      if (!out) return;
      var fmtSel = el('cr-format');
      var fmt = fmtSel ? fmtSel.value : 'image/jpeg';
      var quality = parseInt((el('cr-quality') || {}).value, 10) || 92;
      exportCanvas(out, fmt, quality).then(function (b) {
        if (!b) { showToast('导出失败'); return; }
        saveBlob(b, 'cropped_' + Date.now() + '.' + (fmt === 'image/png' ? 'png' : (fmt === 'image/webp' ? 'webp' : 'jpg')));
        showToast('已导出裁剪结果');
      });
    });
    function croppedCanvas() {
      if (!img) return null;
      var ratioScale = 1;
      var v = outSel ? outSel.value : 'keep';
      var out = document.createElement('canvas');
      var targetW = Math.max(1, Math.round(rect.w / Math.max(scale, 0.01)));
      var targetH = Math.max(1, Math.round(rect.h / Math.max(scale, 0.01)));
      if (v !== 'keep') {
        var p = v.split('x');
        if (p.length === 2) {
          var mw = parseInt(p[0], 10) || targetW;
          var mh = parseInt(p[1], 10) || targetH;
          if (mw / mh > targetW / targetH) { targetH = mh; targetW = Math.round(mh * (targetW / targetH)); }
          else { targetW = mw; targetH = Math.round(mw * (targetH / targetW)); }
        }
      }
      out.width = targetW; out.height = targetH;
      var oc = out.getContext('2d');
      oc.setTransform(1, 0, 0, 1, 0, 0);
      oc.translate(targetW / 2, targetH / 2);
      oc.rotate(rot * Math.PI / 180);
      oc.scale(scale * flipX, scale * flipY);
      // 裁剪框中心相对画布中心的偏移
      var ccx = rect.x + rect.w / 2 - canvas.width / 2;
      var ccy = rect.y + rect.h / 2 - canvas.height / 2;
      oc.translate(-ccx, -ccy);
      var w = img.width, h = img.height;
      oc.drawImage(img, -w / 2, -h / 2, w, h);
      return out;
    }
  })();

  /* ============================================================
   * 模块 4：证件照排版打印（增强）
   * ============================================================ */
  (function initPhotoSheet() {
    var dropZone         = el('ps-drop-zone');
    var fileInput        = el('ps-image-input');
    var settings         = el('ps-settings');
    var paperSizeSelect  = el('ps-paper-size');
    var paperCustomRow   = el('ps-paper-custom');
    var paperWInput      = el('ps-paper-w');
    var paperHInput      = el('ps-paper-h');
    var photoSizeSelect  = el('ps-photo-size');
    var photoCustomRow   = el('ps-photo-custom');
    var photoWInput      = el('ps-photo-w');
    var photoHInput      = el('ps-photo-h');
    var marginInput      = el('ps-margin');
    var marginValEl      = el('ps-margin-val');
    var gapInput         = el('ps-gap');
    var gapValEl         = el('ps-gap-val');
    var dpiSelect        = el('ps-dpi');
    var bgColorInput     = el('ps-bg-color');
    var cutLinesCheckbox = el('ps-cut-lines');
    var infoBox          = el('ps-info');
    var exportFormatSel  = el('ps-export-format');
    var btnDownload      = el('ps-download');
    var btnDownloadPdf   = el('ps-download-pdf');
    var btnPrint         = el('ps-print');
    var canvas           = el('ps-canvas');

    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var emptyHint = el('ps-placeholder');
    var originalImage = null;

    var PAPER_SIZES = {
      '6inch':  { w: 152.4, h: 101.6 },
      '5inch':  { w: 127,   h: 88.9  },
      '7inch':  { w: 177.8, h: 127   },
      'a4':     { w: 297,   h: 210   },
      'a5':     { w: 210,   h: 148   }
    };
    var PHOTO_SIZES = {
      '1inch':   { w: 25, h: 35 },
      '2inch':   { w: 35, h: 53 },
      'small1':  { w: 22, h: 32 },
      'small2':  { w: 35, h: 45 },
      'big1':    { w: 33, h: 48 },
      'big2':    { w: 35, h: 49 },
      'visa_us': { w: 51, h: 51 },
      'visa_jp': { w: 35, h: 45 },
      'idcard':  { w: 26, h: 32 },
      'drive':   { w: 22, h: 32 },
      'passport':{ w: 33, h: 48 },
      'exam':    { w: 35, h: 45 }
    };

    bindUploadZone(dropZone, fileInput, function (files) { handleFile(files[0]); });
    if (fileInput) fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
      fileInput.value = '';
    });

    function handleFile(file) {
      if (!file) return;
      if (file.type && file.type.indexOf('image/') !== 0) { showToast('请选择图片文件'); return; }
      readFileAsDataURL(file).then(loadImage).then(function (im) {
        originalImage = im;
        emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        settings.style.display = 'block';
        redraw();
        showToast('照片加载成功');
      })['catch'](function () { showToast('无法读取该图片'); });
    }

    function getPaperSize() {
      if (paperSizeSelect.value === 'custom') {
        return { w: parseFloat(paperWInput.value) || 152, h: parseFloat(paperHInput.value) || 102 };
      }
      var p = PAPER_SIZES[paperSizeSelect.value] || PAPER_SIZES['6inch'];
      var landscape = el('ps-paper-landscape');
      if (landscape && landscape.checked) return { w: p.h, h: p.w };
      return { w: p.w, h: p.h };
    }
    function getPhotoSize() {
      if (photoSizeSelect.value === 'custom') {
        return { w: parseFloat(photoWInput.value) || 25, h: parseFloat(photoHInput.value) || 35 };
      }
      var p = PHOTO_SIZES[photoSizeSelect.value] || PHOTO_SIZES['1inch'];
      var rot = el('ps-photo-rotate');
      if (rot && rot.checked) return { w: p.h, h: p.w };
      return { w: p.w, h: p.h };
    }

    if (paperSizeSelect) paperSizeSelect.addEventListener('change', function () {
      paperCustomRow.style.display = this.value === 'custom' ? 'flex' : 'none'; redraw();
    });
    if (photoSizeSelect) photoSizeSelect.addEventListener('change', function () {
      photoCustomRow.style.display = this.value === 'custom' ? 'flex' : 'none'; redraw();
    });
    [paperWInput, paperHInput, photoWInput, photoHInput].forEach(function (elx) {
      if (elx) elx.addEventListener('input', redraw);
    });
    if (marginInput) marginInput.addEventListener('input', function () { marginValEl.textContent = this.value; redraw(); });
    if (gapInput) gapInput.addEventListener('input', function () { gapValEl.textContent = this.value; redraw(); });
    [dpiSelect, bgColorInput].forEach(function (elx) {
      if (elx) { elx.addEventListener('change', redraw); elx.addEventListener('input', redraw); }
    });
    if (cutLinesCheckbox) cutLinesCheckbox.addEventListener('change', redraw);
    var extraToggles = ['ps-paper-landscape', 'ps-photo-rotate', 'ps-show-header', 'ps-show-cutmark', 'ps-show-margin'];
    extraToggles.forEach(function (id) {
      var e = el(id);
      if (e) e.addEventListener('change', redraw);
    });

    function drawImageCover(c, im, x, y, w, h) {
      var imgRatio = im.width / im.height;
      var targetRatio = w / h;
      var sx = 0, sy = 0, sw = im.width, sh = im.height;
      if (imgRatio > targetRatio) {
        sw = im.height * targetRatio; sx = (im.width - sw) / 2;
      } else {
        sh = im.width / targetRatio; sy = (im.height - sh) / 2;
      }
      c.drawImage(im, sx, sy, sw, sh, x, y, w, h);
    }

    function layout() {
      var paper = getPaperSize();
      var photo = getPhotoSize();
      var DPI = parseInt(dpiSelect.value, 10) || 300;
      var marginMm = parseFloat(marginInput.value) || 0;
      var gapMm = parseFloat(gapInput.value) || 0;
      var canvasW = Math.round(paper.w / 25.4 * DPI);
      var canvasH = Math.round(paper.h / 25.4 * DPI);
      var photoW = Math.max(1, Math.round(photo.w / 25.4 * DPI));
      var photoH = Math.max(1, Math.round(photo.h / 25.4 * DPI));
      var marginPx = Math.round(marginMm / 25.4 * DPI);
      var gapPx = Math.round(gapMm / 25.4 * DPI);
      var availW = canvasW - marginPx * 2, availH = canvasH - marginPx * 2;
      var cols = Math.floor((availW + gapPx) / (photoW + gapPx));
      var rows = Math.floor((availH + gapPx) / (photoH + gapPx));
      if (cols < 1) cols = 1;
      if (rows < 1) rows = 1;
      var totalW = cols * photoW + (cols - 1) * gapPx;
      var totalH = rows * photoH + (rows - 1) * gapPx;
      var startX = Math.max(0, Math.round((canvasW - totalW) / 2));
      var startY = Math.max(0, Math.round((canvasH - totalH) / 2));
      return { canvasW: canvasW, canvasH: canvasH, photoW: photoW, photoH: photoH,
               marginPx: marginPx, gapPx: gapPx, cols: cols, rows: rows, startX: startX, startY: startY };
    }

    function redraw() {
      if (!originalImage) return;
      var L = layout();
      var DPI = parseInt(dpiSelect.value, 10) || 300;
      var bgColor = bgColorInput.value;
      canvas.width = L.canvasW; canvas.height = L.canvasH;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, L.canvasW, L.canvasH);

      var showMargin = el('ps-show-margin');
      if (showMargin && showMargin.checked) {
        ctx.strokeStyle = 'rgba(120,120,120,0.6)';
        ctx.lineWidth = Math.max(1, Math.round(DPI / 600));
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(L.marginPx + 0.5, L.marginPx + 0.5,
          L.canvasW - L.marginPx * 2 - 1, L.canvasH - L.marginPx * 2 - 1);
        ctx.setLineDash([]);
      }

      var cutLines = cutLinesCheckbox && cutLinesCheckbox.checked;
      for (var r = 0; r < L.rows; r++) {
        for (var c = 0; c < L.cols; c++) {
          var x = L.startX + c * (L.photoW + L.gapPx);
          var y = L.startY + r * (L.photoH + L.gapPx);
          drawImageCover(ctx, originalImage, x, y, L.photoW, L.photoH);
          if (cutLines) {
            ctx.strokeStyle = 'rgba(150,150,150,0.75)';
            ctx.lineWidth = Math.max(1, Math.round(DPI / 300));
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x + 0.5, y + 0.5, L.photoW - 1, L.photoH - 1);
            ctx.setLineDash([]);
          }
        }
      }

      var showHeader = el('ps-show-header');
      if (showHeader && showHeader.checked) {
        var fs = Math.max(10, Math.round(DPI / 10));
        ctx.fillStyle = '#333';
        ctx.font = fs + 'px ' + SYSTEM_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var photo = getPhotoSize();
        ctx.fillText(photoSizeSelect.options[photoSizeSelect.selectedIndex].text.split(' ')[0] +
          '  ' + photo.w + '×' + photo.h + 'mm  · ' + L.cols + '×' + L.rows + ' 张 · ' + DPI + 'DPI',
          L.canvasW / 2, Math.max(L.marginPx / 2, fs));
      }

      var showCutmark = el('ps-show-cutmark');
      if (showCutmark && showCutmark.checked) {
        var len = Math.max(6, Math.round(DPI / 25)), lw = Math.max(1, Math.round(DPI / 400));
        ctx.strokeStyle = '#444'; ctx.lineWidth = lw; ctx.setLineDash([]);
        var px = L.startX, py = L.startY;
        var pw = L.cols * L.photoW + (L.cols - 1) * L.gapPx;
        var ph = L.rows * L.photoH + (L.rows - 1) * L.gapPx;
        var marks = [
          [px, py, -1, -1], [px + pw, py, 1, -1], [px, py + ph, -1, 1], [px + pw, py + ph, 1, 1]
        ];
        marks.forEach(function (m) {
          ctx.beginPath();
          ctx.moveTo(m[0] + m[2] * len, m[1]); ctx.lineTo(m[0], m[1]); ctx.lineTo(m[0], m[1] + m[3] * len);
          ctx.stroke();
        });
      }

      var totalCount = L.cols * L.rows;
      var fitsOne = (L.cols * L.photoW + (L.cols - 1) * L.gapPx <= L.canvasW) &&
                    (L.rows * L.photoH + (L.rows - 1) * L.gapPx <= L.canvasH);
      var mmPerPx = 25.4 / DPI;
      if (infoBox) {
        infoBox.textContent = fitsOne
          ? '📊 可排 ' + totalCount + ' 张（' + L.cols + ' 列 × ' + L.rows + ' 行） | 画布 ' +
            L.canvasW + '×' + L.canvasH + ' px | 单张 ' + L.photoW + '×' + L.photoH + ' px'
          : '⚠️ 相纸太小，无法完整容纳照片，请调整参数';
      }
    }
    window.__psRedraw = redraw;

    function exportBlob(type, quality) {
      return exportCanvas(canvas, type, quality == null ? 92 : quality);
    }

    if (btnDownload) btnDownload.addEventListener('click', function () {
      if (!originalImage) return;
      var format = exportFormatSel.value;
      exportBlob(format, 0.95).then(function (blob) {
        if (!blob) { showToast('导出失败'); return; }
        saveBlob(blob, '证件照排版_' + Date.now() + '.' + (format === 'image/jpeg' ? 'jpg' : 'png'));
        showToast('已导出排版图');
      });
    });

    if (btnDownloadPdf) btnDownloadPdf.addEventListener('click', function () {
      if (!originalImage) return;
      if (!window.jspdf || !window.jspdf.jsPDF) { showToast('PDF 库未加载，请导出 JPG 后自行打印', 2600); return; }
      try {
        var L = layout();
        var paper = getPaperSize();
        var orient = paper.w >= paper.h ? 'landscape' : 'portrait';
        var doc = new window.jspdf.jsPDF({ orientation: orient, unit: 'mm', format: [paper.w, paper.h] });
        var data = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(data, 'JPEG', 0, 0, paper.w, paper.h);
        doc.save('证件照排版_' + Date.now() + '.pdf');
        showToast('已导出 PDF');
      } catch (e) { showToast('PDF 导出失败：' + e.message); }
    });

    if (btnPrint) btnPrint.addEventListener('click', function () {
      if (!originalImage) return;
      var w = window.open('', '_blank');
      if (!w) { showToast('请允许弹出窗口以打印'); return; }
      w.document.open();
      w.document.write('<html><head><meta charset="utf-8"><title>证件照排版打印</title></head><body style="margin:0">' +
        '<img src="' + canvas.toDataURL('image/jpeg', 0.95) + '" style="width:100%;height:auto;display:block">' +
        '</body></html>');
      w.document.close();
      setTimeout(function () { w.focus(); w.print(); }, 400);
    });
  })();

  /* ============================================================
   * 模块 5：图片压缩 / 格式转换 / 尺寸调整
   * ============================================================ */
  (function initCompress() {
    var dropZone = el('cp-drop-zone');
    var fileInput = el('cp-image-input');
    var listEl = el('cp-list');
    var btnRun = el('cp-run');
    var btnRunAll = el('cp-run-all');
    var fmtSel = el('cp-format');
    var qualityInp = el('cp-quality');
    var qualityVal = el('cp-quality-val');
    var maxWInp = el('cp-max-w');
    var maxHInp = el('cp-max-h');
    var targetKbInp = el('cp-target-kb');
    if (!listEl) return;

    var items = [];

    bindQualitySlider(qualityInp, qualityVal);

    function addFiles(files) {
      Array.prototype.slice.call(files).forEach(function (f) {
        if (f.type && f.type.indexOf('image/') !== 0) return;
        if (f.size > 30 * 1024 * 1024) { showToast(f.name + ' 超过 30MB，已跳过'); return; }
        items.push({ file: f, name: f.name || ('图片' + (items.length + 1)), fmt: fmtSel ? fmtSel.value : 'image/jpeg', q: qualityInp ? qualityInp.value : '92', status: '待处理', out: null, outSize: 0, ratio: 0 });
      });
      render();
    }
    function render() {
      if (!items.length) { listEl.innerHTML = '<span class="wm-hint">暂无文件，点击或拖拽添加图片</span>'; return; }
      listEl.innerHTML = items.map(function (it, i) {
        var pct = it.ratio ? Math.round((1 - it.ratio) * 100) : 0;
        return '<div class="cp-row" data-i="' + i + '">' +
          '<span class="cp-name" title="' + esc(it.name) + '">🖼️ ' + esc(it.name.length > 16 ? it.name.slice(0, 16) + '…' : it.name) + '</span>' +
          '<span class="cp-size">' + formatSize(it.file.size) + '</span>' +
          '<span class="cp-status ' + (it.out ? 'ok' : '') + '">' + esc(it.status) + (it.outSize ? ' → ' + formatSize(it.outSize) + (pct > 0 ? '（- ' + pct + '%）' : '') : '') + '</span>' +
          '<button class="wm-btn-small" data-act="one" data-i="' + i + '">压缩</button>' +
          '<button class="wm-btn-small" data-act="dl" data-i="' + i + '">下载</button>' +
          '<button class="wm-btn-small" data-act="del" data-i="' + i + '">删除</button>' +
          '</div>';
      }).join('');
    }
    bindUploadZone(dropZone, fileInput, function (files) { addFiles(files); });
    if (fileInput) fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length) addFiles(fileInput.files);
      fileInput.value = '';
    });

    function compressOne(it) {
      var fmt = normalizeType(it.fmt || (fmtSel ? fmtSel.value : 'image/jpeg'));
      var q = parseInt(it.q || (qualityInp ? qualityInp.value : 92), 10) || 92;   // 30~100
      var maxW = parseInt(maxWInp && maxWInp.value, 10) || 0;
      var maxH = parseInt(maxHInp && maxHInp.value, 10) || 0;
      var targetKb = parseFloat(targetKbInp && targetKbInp.value) || 0;
      it.status = '处理中…'; render();
      return readFileAsDataURL(it.file).then(loadImage).then(function (im) {
        var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        var resized = false;
        if (maxW || maxH) {
          var s = 1;
          if (maxW && w > maxW) s = Math.min(s, maxW / w);
          if (maxH && h > maxH) s = Math.min(s, maxH / h);
          w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
          resized = true;
        }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        var c = cv.getContext('2d');
        if (fmt === 'image/jpeg') { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); }
        c.drawImage(im, 0, 0, w, h);

        var origSize = it.file.size || 0;
        var isPng = fmt === 'image/png';
        var best = null, bestQ = q, note = '';

        if (isPng) {
          // PNG：按质量降低色彩数压缩（中位数切割调色板 + 抖动），质量越低体积越小
          if (q >= 100 && !resized) {
            best = it.file.slice ? it.file.slice(0, it.file.size, fmt) : it.file;
            bestQ = 100;
            it.status = '完成（原样保留）';
            note = '质量 100% 且未调整尺寸，已保留原文件';
          } else {
            best = canvasEncode(cv, fmt, q);
            bestQ = q;
            it.status = '完成（PNG ' + quantizeColorsForQuality(q / 100) + '色）';
            if (best && origSize && best.size >= origSize) {
              if (q < 92) {
                var pq = canvasEncode(cv, fmt, 92);
                if (pq && pq.size < best.size) { best = pq; bestQ = 92; }
              }
              if (best.size >= origSize && isSameType(it.file, fmt)) {
                // 原文件也是 PNG：输出无损 PNG 作对照，仍取更小者，保证降色一定生效
                var lp = canvasEncode(cv, fmt, 100);
                if (lp && lp.size < best.size) { best = lp; bestQ = 100; }
              }
              if (best.size >= origSize) {
                best = it.file.slice ? it.file.slice(0, it.file.size, fmt) : it.file;
                it.status = '完成（保留原图更小）';
                note = '该图颜色少或已压过，降色后未变小，已保留原文件';
              }
            }
          }
        } else if (targetKb > 0) {
          // 指定目标体积：在 [15, q] 区间二分，质量不超过滑块设定的上限
          var lo = 15, hi = q, used = null;
          for (var k = 0; k < 6; k++) {
            var mid = Math.round((lo + hi) / 2);
            var b = yieldToCanvas(cv, fmt, mid);
            if (!b) break;
            used = b; bestQ = mid;
            if (b.size <= targetKb * 1024 || hi - lo <= 2) break;
            if (b.size > targetKb * 1024) hi = mid - 1; else lo = mid + 1;
          }
          best = used;
          it.status = best && best.size <= targetKb * 1024 ? '完成（q=' + bestQ + '，达标）' : '完成（q=' + bestQ + '，未达标）';
        } else if (q >= 100 && !resized) {
          // 质量为 100 且尺寸未变：直接返回原文件，避免重新编码反而变大
          best = it.file.slice ? it.file.slice(0, it.file.size, fmt) : it.file;
          bestQ = 100;
          it.status = '完成（原样保留）';
          note = '质量 100% 且未调整尺寸，已保留原文件';
        } else {
          // 与最初版本一致的算法：按滑块质量直接编码一次
          best = yieldToCanvas(cv, fmt, q);
          it.status = '完成（q=' + q + '）';
          // 若重新编码后反而比原图大，则沿用体积更小的那一份
          if (best && origSize && best.size > origSize && isSameType(it.file, fmt)) {
            if (q < 92) {
              // 质量调低还变大属于异常，退回更高一档再试一次
              var up = yieldToCanvas(cv, fmt, 92);
              if (up && up.size < best.size) { best = up; bestQ = 92; }
            }
            if (best.size > origSize) {
              best = it.file.slice ? it.file.slice(0, it.file.size, fmt) : it.file;
              it.status = '完成（保留原图更小）';
              note = '重新编码后体积增大，已自动改用原文件';
            }
          }
        }
        it.out = best;
        it.outSize = best ? best.size : 0;
        it.ratio = origSize ? it.outSize / origSize : 0;
        it.note = note;
        render();
        if (note) showToast(note);
      })['catch'](function () { it.status = '失败'; render(); });

      function isSameType(f, type) {
        var t = (f && f.type) || '';
        return t === type || (type === 'image/jpeg' && (t === 'image/jpg' || /\.jpe?g$/i.test(f.name || '')));
      }
      function yieldToCanvas(cv, type, quality) {
        // 同步编码，便于目标体积二分；type 已归一化，不走跨域/回退分支
        try {
          var dataURL = cv.toDataURL(type, (quality || 92) / 100);
          var arr = dataURL.split(',');
          var mime = arr[0].match(/:(.*?);/)[1];
          var bin = atob(arr[1]);
          var u8 = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          return new Blob([u8], { type: mime });
        } catch (e) { return null; }
      }
    }

    listEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!b) return;
      var i = parseInt(b.dataset.i, 10);
      var it = items[i];
      if (!it) return;
      if (b.dataset.act === 'one') compressOne(it);
      else if (b.dataset.act === 'del') { items.splice(i, 1); render(); }
      else if (b.dataset.act === 'dl' && it.out) {
        var ext = it.out.type === 'image/png' ? 'png' : (it.out.type === 'image/webp' ? 'webp' : 'jpg');
        saveBlob(it.out, (it.name || 'img').replace(/\.[^.]+$/, '') + '_min.' + ext);
      }
    });
    if (btnRun) btnRun.addEventListener('click', function () {
      var pending = items.filter(function (it) { return !it.out; });
      if (!pending.length) { showToast('没有待处理图片'); return; }
      var idx = 0;
      function next() {
        if (idx >= pending.length) { showToast('全部处理完成'); return; }
        compressOne(pending[idx++])['then'](next)['catch'](next);
      }
      next();
    });
    if (btnRunAll) btnRunAll.addEventListener('click', function () {
      if (!items.length) { showToast('请先添加图片'); return; }
      items.forEach(compressOne);
      showToast('开始批量压缩…');
    });
    window.__cpRefresh = render;
  })();
  if (typeof window.__loadFileURL === "function") window.__loadFileURL = readAsURL;
  if (typeof window.__readFileAsURL === "function") window.__readFileAsURL = readAsURL;
})();
