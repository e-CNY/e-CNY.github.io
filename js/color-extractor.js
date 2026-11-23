(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var $ = function (id) { return document.getElementById(id); };

    var dropZone = $('drop-zone');
    var fileInput = $('file-input');
    var imgInfo = $('img-info');
    var fileChips = $('file-chips');
    var settingsPanel = $('settings');
    var btnModeAuto = $('btn-mode-auto');
    var btnModePicker = $('btn-mode-picker');
    var btnModeScheme = $('btn-mode-scheme');
    var autoPanel = $('auto-panel');
    var pickerPanel = $('picker-panel');
    var schemePanel = $('scheme-panel');
    var colorCount = $('color-count');
    var colorCountVal = $('color-count-val');
    var sortMode = $('sort-mode');
    var copyFormat = $('copy-format');
    var btnReextract = $('btn-reextract');
    var paletteList = $('palette-list');
    var canvasContainer = $('canvas-container');
    var emptyHint = $('empty-hint');
    var mainCanvas = $('main-canvas');
    var ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    var magnifier = $('magnifier');
    var magCtx = magnifier.getContext('2d');
    var magZoom = $('mag-zoom');
    var pickedSwatch = $('picked-swatch');
    var valHex = $('val-hex');
    var valRgb = $('val-rgb');
    var valHsl = $('val-hsl');
    var valHsv = $('val-hsv');
    var valCmyk = $('val-cmyk');
    var contrastBox = $('contrast-box');
    var contrastText = $('contrast-text');
    var historySection = $('history-section');
    var historyList = $('history-list');
    var adjustPanel = $('adjust-panel');
    var uiPreviewPanel = $('ui-preview-panel');
    var uiCardBg = $('ui-card-bg');
    var uiCardTitle = $('ui-card-title');
    var uiCardDesc = $('ui-card-desc');
    var uiBtnPrimary = $('ui-btn-primary');
    var uiBtnOutline = $('ui-btn-outline');
    var uiChips = $('ui-chips');
    var ratioPanel = $('ratio-panel');
    var ratioBar = $('ratio-bar');
    var a11yPanel = $('a11y-panel');
    var a11yTable = $('a11y-table');
    var schemeList = $('scheme-list');

    var MAX_SIDE = 200;
    var HISTORY_LIMIT = 12;

    var currentImage = null;   // 原始 Image
    var currentSrc = '';       // 原始 dataURL（用于滤镜重置）
    var fileName = '';
    var currentPalette = [];   // {r,g,b,hex,ratio}
    var currentPicked = null;  // {r,g,b}
    var mode = 'auto';
    var toastTimer = null;
    var fileList = [];         // {name, src}
    var activeIndex = -1;
    var schemeColors = [];
    var filteredCanvas = null; // 应用滤镜/缩放后的画布（取色与保存用）

    var adjustIds = ['brightness', 'contrast', 'saturate', 'hue', 'grayscale', 'invert', 'blur', 'scale'];
    var adjustDefaults = { brightness: 100, contrast: 100, saturate: 100, hue: 0, grayscale: 0, invert: 0, blur: 0, scale: 100 };

    /* 上传点击绑定统一由 bindUploadZone 处理，避免重复触发 input.click() 导致 File chooser 警告 */

    /* ================= 颜色转换 ================= */
    function toHex(r, g, b) {
      var p = function (v) { var s = Math.round(v).toString(16); return s.length === 1 ? '0' + s : s; };
      return ('#' + p(r) + p(g) + p(b)).toUpperCase();
    }
    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }
    function rgbToHsv(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      var h = 0, s = max === 0 ? 0 : d / max, v = max;
      if (max !== min) {
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
    }
    function rgbToCmyk(r, g, b) {
      var c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255;
      var k = Math.min(c, m, y);
      if (k === 1) return [0, 0, 0, 100];
      return [Math.round((c - k) / (1 - k) * 100), Math.round((m - k) / (1 - k) * 100), Math.round((y - k) / (1 - k) * 100), Math.round(k * 100)];
    }
    function hslToRgb(h, s, l) {
      h /= 360; s /= 100; l /= 100;
      var r, g, b;
      if (s === 0) { r = g = b = l; }
      else {
        var hue2rgb = function (p, q, t) {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    function luminance(r, g, b) {
      var a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function contrastRatio(c1, c2) {
      var l1 = luminance(c1.r, c1.g, c1.b), l2 = luminance(c2.r, c2.g, c2.b);
      var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05);
    }
    function getContrastColor(r, g, b) {
      return luminance(r, g, b) > 0.45 ? '#3D3226' : '#FFFFFF';
    }
    function hueOf(r, g, b) { var h = rgbToHsl(r, g, b)[0]; return h < 0 ? h + 360 : h; }
    function saturationOf(r, g, b) { return rgbToHsl(r, g, b)[1]; }
    function formatColor(rgb, fmt) {
      if (fmt === 'rgb') return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
      if (fmt === 'hsl') {
        var h = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return 'hsl(' + h[0] + ', ' + h[1] + '%, ' + h[2] + '%)';
      }
      return toHex(rgb.r, rgb.g, rgb.b);
    }

    /* ================= 提示 ================= */
    function showToast(msg) {
      var t = $('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1500);
    }

    function copyText(text) {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { showToast('已复制：' + text); }, function () { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
    }
    function fallbackCopy(text) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制：' + text);
      } catch (e) {
        showToast('复制失败，请手动复制');
      }
    }

    /* ================= 上传 ================= */
    function bindUploadZone(zone, input) {
      if (!zone || !input || input.__ceClickBound) return;
      input.__ceClickBound = true;
      zone.addEventListener('click', function (e) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'A' || t.tagName === 'BUTTON' || t.tagName === 'SELECT' ||
          (t.dataset && (t.dataset.copy || t.dataset.export || t.dataset.schemeExport)))) return;
        input.value = '';
        input.click();
      });
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) loadFiles(e.dataTransfer.files);
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length) loadFiles(fileInput.files);
      });
    }
    document.addEventListener('paste', function (e) {
      if (!e.clipboardData || !e.clipboardData.items) return;
      var files = [];
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        var it = e.clipboardData.items[i];
        if (it.kind === 'file' && it.type.indexOf('image/') === 0) {
          var f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) loadFiles(files);
    });

    function loadFiles(fileListLike) {
      var total = fileListLike.length;
      var loaded = 0;
      var fresh = [];
      Array.prototype.forEach.call(fileListLike, function (f) {
        if (f.type && f.type.indexOf('image/') !== 0) { loaded++; if (loaded === total) afterLoad(fresh); return; }
        var fr = new FileReader();
        fr.onload = function () { fresh.push({ name: f.name || 'pasted.png', src: fr.result }); loaded++; if (loaded === total) afterLoad(fresh); };
        fr.onerror = function () { loaded++; if (loaded === total) afterLoad(fresh); };
        fr.readAsDataURL(f);
      });
    }
    function afterLoad(fresh) {
      if (!fresh.length) { showToast('未读取到有效图片'); return; }
      fileList = fileList.concat(fresh);
      renderChips();
      loadImageEntry(fileList.length - fresh.length);
    }
    function renderChips() {
      if (!fileChips) return;
      if (!fileList.length) { fileChips.style.display = 'none'; fileChips.innerHTML = ''; return; }
      fileChips.style.display = 'flex';
      fileChips.innerHTML = '';
      fileList.forEach(function (it, i) {
        var el = document.createElement('span');
        el.className = 'file-chip' + (i === activeIndex ? ' active' : '');
        el.title = it.name;
        var n = document.createElement('span');
        n.className = 'chip-name';
        n.textContent = (i + 1) + '. ' + it.name;
        var x = document.createElement('span');
        x.className = 'chip-close';
        x.textContent = '×';
        x.title = '移除';
        x.addEventListener('click', function (e) { e.stopPropagation(); removeEntry(i); });
        el.appendChild(n);
        el.appendChild(x);
        el.addEventListener('click', function () { loadImageEntry(i); });
        fileChips.appendChild(el);
      });
    }
    function removeEntry(i) {
      fileList.splice(i, 1);
      if (i === activeIndex) activeIndex = fileList.length ? Math.max(0, i - 1) : -1;
      else if (i < activeIndex) activeIndex--;
      renderChips();
      if (activeIndex >= 0) loadImageEntry(activeIndex, true);
      else clearAll();
    }
    function clearAll() {
      currentImage = null; currentSrc = ''; fileName = '';
      ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      mainCanvas.style.display = 'none';
      if (emptyHint) emptyHint.style.display = 'block';
      if (adjustPanel) adjustPanel.style.display = 'none';
      if (uiPreviewPanel) uiPreviewPanel.style.display = 'none';
      if (ratioPanel) ratioPanel.style.display = 'none';
      if (a11yPanel) a11yPanel.style.display = 'none';
      if (imgInfo) { imgInfo.style.display = 'none'; imgInfo.textContent = ''; }
      if (settingsPanel) settingsPanel.classList.remove('active');
      hideMagnifier();
    }

    function loadImageEntry(index, keepAdjust) {
      var it = fileList[index];
      if (!it) return;
      activeIndex = index;
      fileName = it.name.replace(/\.[^.]+$/, '') || 'palette';
      var img = new Image();
      img.onload = function () {
        currentImage = img;
        currentSrc = it.src;
        currentPicked = null;
        if (!keepAdjust) (Object.keys(adjustDefaults)).forEach(function (k) { var el = $(adjId(k)); if (el) el.value = adjustDefaults[k]; });
        mainCanvas.style.display = 'block';
        if (emptyHint) emptyHint.style.display = 'none';
        if (imgInfo) {
          imgInfo.style.display = 'block';
          imgInfo.textContent = it.name + ' · ' + img.naturalWidth + '×' + img.naturalHeight + ' · ' + (it.src.length * 0.75 / 1024).toFixed(1) + ' KB (估)';
        }
        if (settingsPanel) settingsPanel.classList.add('active');
        if (adjustPanel) adjustPanel.style.display = 'block';
        if (uiPreviewPanel) uiPreviewPanel.style.display = 'block';
        renderChips();
        applyAdjust();
        extractPalette();
        if (mode === 'scheme') generateScheme();
      };
      img.src = it.src;
    }
    function adjId(k) { return 'adj-' + k; }
    function readAdjust() {
      var v = {};
      adjustIds.forEach(function (k) {
        var el = $(adjId(k));
        var lab = $(adjId(k) + '-val');
        if (el) {
          v[k] = parseFloat(el.value);
          if (lab) lab.textContent = el.value;
        }
      });
      return v;
    }
    function applyAdjust() {
      if (!currentImage) return;
      var v = readAdjust();
      var iw = currentImage.naturalWidth || currentImage.width;
      var ih = currentImage.naturalHeight || currentImage.height;
      var scale = Math.max(0.1, Math.min(1, v.scale / 100));
      var w = Math.max(1, Math.round(iw * scale));
      var h = Math.max(1, Math.round(ih * scale));
      mainCanvas.width = w;
      mainCanvas.height = h;
      ctx.filter = [
        'brightness(' + v.brightness + '%)',
        'contrast(' + v.contrast + '%)',
        'saturate(' + v.saturate + '%)',
        'hue-rotate(' + v.hue + 'deg)',
        'grayscale(' + v.grayscale + '%)',
        'invert(' + v.invert + '%)',
        'blur(' + v.blur + 'px)'
      ].join(' ');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(currentImage, 0, 0, w, h);
      ctx.filter = 'none';
      filteredCanvas = document.createElement('canvas');
      filteredCanvas.width = w;
      filteredCanvas.height = h;
      filteredCanvas.getContext('2d').drawImage(mainCanvas, 0, 0);
      if (ratioBar) ratioBar.dataset.stale = '1';
    }
    adjustIds.forEach(function (k) {
      var el = $(adjId(k));
      if (el) el.addEventListener('input', function () { applyAdjust(); });
    });
    var btnAdjReset = $('btn-adj-reset');
    if (btnAdjReset) btnAdjReset.addEventListener('click', function () {
      adjustIds.forEach(function (k) { var el = $(adjId(k)); if (el) el.value = adjustDefaults[k]; });
      applyAdjust();
      extractPalette();
      showToast('已重置微调');
    });
    var btnAdjReextract = $('btn-adj-reextract');
    if (btnAdjReextract) btnAdjReextract.addEventListener('click', function () { extractPalette(); });

    /* ================= 中位切分（原算法保留） ================= */
    function medianCut(imgData, maxColors) {
      var pixels = [];
      var data = imgData.data;
      for (var i = 0; i < data.length; i += 4) {
        if (data[i + 3] <= 128) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      if (pixels.length === 0) return [];

      var boxes = [pixels];
      while (boxes.length < maxColors) {
        var target = null, maxRange = -1, targetIdx = -1;
        for (var b = 0; b < boxes.length; b++) {
          var box = boxes[b];
          if (box.length < 2) continue;
          var mins = [255, 255, 255], maxs = [0, 0, 0];
          for (var p = 0; p < box.length; p++) {
            for (var c = 0; c < 3; c++) {
              if (box[p][c] < mins[c]) mins[c] = box[p][c];
              if (box[p][c] > maxs[c]) maxs[c] = box[p][c];
            }
          }
          var rangeCh = 0, rangeVal = -1;
          for (var c2 = 0; c2 < 3; c2++) {
            var r = maxs[c2] - mins[c2];
            if (r > rangeVal) { rangeVal = r; rangeCh = c2; }
          }
          if (rangeVal > maxRange) { maxRange = rangeVal; target = box; targetIdx = rangeCh; }
        }
        if (!target || maxRange <= 0) break;
        target.sort(function (x, y) { return x[targetIdx] - y[targetIdx]; });
        var mid = Math.floor(target.length / 2);
        boxes.splice(boxes.indexOf(target), 1, target.slice(0, mid), target.slice(mid));
      }

      var result = [];
      for (var k = 0; k < boxes.length; k++) {
        var box2 = boxes[k];
        if (!box2.length) continue;
        var sum = [0, 0, 0];
        for (var q = 0; q < box2.length; q++) {
          sum[0] += box2[q][0]; sum[1] += box2[q][1]; sum[2] += box2[q][2];
        }
        result.push({
          r: Math.round(sum[0] / box2.length),
          g: Math.round(sum[1] / box2.length),
          b: Math.round(sum[2] / box2.length),
          count: box2.length
        });
      }
      return result;
    }

    function colorKey(c) { return c.r + ',' + c.g + ',' + c.b; }

    function matchCount(colors, target) {
      var key = colorKey(target);
      for (var i = 0; i < colors.length; i++) {
        if (colorKey(colors[i]) === key) return colors[i].count || 0;
      }
      var br = 255 * 255 * 3, bi = 0;
      for (var j = 0; j < colors.length; j++) {
        var d = (colors[j].r - target.r) * (colors[j].r - target.r) +
                (colors[j].g - target.g) * (colors[j].g - target.g) +
                (colors[j].b - target.b) * (colors[j].b - target.b);
        if (d < br) { br = d; bi = j; }
      }
      return (colors[bi] && colors[bi].count) || 0;
    }

    /* ================= ColorThief 取色 ================= */
    function getThief() {
      try {
        if (typeof ColorThief === 'function') return new ColorThief();
        if (window.ColorThief && typeof window.ColorThief.getColor === 'function') return window.ColorThief;
      } catch (e) {}
      return null;
    }
    function thiefReady() {
      var t = getThief();
      return !!(t && typeof t.getPalette === 'function');
    }
    function sampleSizeFor(q) {
      if (!q || q <= 0) return 0;
      return Math.max(16, Math.round(16 * Math.sqrt(q)));
    }
    function thiefSource(size) {
      if (filteredCanvas && currentImage) {
        var iw = filteredCanvas.width, ih = filteredCanvas.height;
        if (!size || (iw <= size && ih <= size)) return patchNatural(filteredCanvas);
        var s = Math.min(1, size / Math.max(iw, ih));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(iw * s));
        c.height = Math.max(1, Math.round(ih * s));
        c.getContext('2d').drawImage(filteredCanvas, 0, 0, c.width, c.height);
        return patchNatural(c);
      }
      if (!currentImage) return null;
      var nw = currentImage.naturalWidth || currentImage.width;
      var nh = currentImage.naturalHeight || currentImage.height;
      if (!size || (nw <= size && nh <= size)) return currentImage;
      var sc = Math.min(1, size / Math.max(nw, nh));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(nw * sc));
      cv.height = Math.max(1, Math.round(nh * sc));
      cv.getContext('2d').drawImage(currentImage, 0, 0, cv.width, cv.height);
      return patchNatural(cv);
    }
    /* ColorThief 2.x 的 BrowserImage 读取 t.naturalWidth/t.naturalHeight，
       canvas 元素没有这两个属性会得到 undefined→0，导致采样为空、取色失败。
       这里给 canvas 补上 naturalWidth/naturalHeight，Image 元素则原样返回。 */
    function patchNatural(src) {
      if (!src) return src;
      if (typeof src.naturalWidth === 'undefined') src.naturalWidth = src.width;
      if (typeof src.naturalHeight === 'undefined') src.naturalHeight = src.height;
      return src;
    }
    function getThiefPalette(n, quality) {
      var t = getThief();
      if (!t) return null;
      var src = thiefSource(0);
      if (!src) return null;
      var pal = t.getPalette(src, n, quality || 10);
      if (pal && pal.length && pal[0] && typeof pal[0].r === 'undefined') {
        pal = pal.map(function (p) { return { r: p[0], g: p[1], b: p[2] }; });
      }
      return pal && pal.length ? pal : null;
    }

    /* ================= 调色板提取 ================= */
    function sortPalette(arr, mode) {
      var a = arr.slice();
      if (mode === 'luminance') a.sort(function (x, y) { return luminance(y.r, y.g, y.b) - luminance(x.r, x.g, x.b); });
      else if (mode === 'hue') a.sort(function (x, y) { return hueOf(x.r, x.g, x.b) - hueOf(y.r, y.g, y.b); });
      else if (mode === 'saturation') a.sort(function (x, y) { return saturationOf(y.r, y.g, y.b) - saturationOf(x.r, x.g, x.b); });
      return a;
    }

    function applyFilter(raw, filterMode) {
      if (!filterMode || filterMode === 'none') return raw.slice();
      return raw.filter(function (c) {
        var mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
        var sat = mx === 0 ? 0 : (mx - mn) / mx;
        if (filterMode === 'nobw') return !(mx > 240 && mn > 240) && !(mx < 20);
        if (filterMode === 'vivid') return sat > 0.25 && mx > 40;
        return true;
      });
    }

    function extractPalette() {
      if (!currentImage && !filteredCanvas) return;
      var n = parseInt(colorCount.value, 10) || 8;
      var engine = $('engine-mode') ? $('engine-mode').value : 'colorthief';
      var quality = parseInt(($('quality-level') || {}).value, 10);
      if (isNaN(quality)) quality = 10;
      var filterMode = ($('filter-mode') || {}).value || 'none';

      var raw = [], allRaw = [];
      var cv = document.createElement('canvas');
      try {
        var src = filteredCanvas || currentImage;
        var iw = src.width || src.naturalWidth;
        var ih = src.height || src.naturalHeight;
        var size = sampleSizeFor(quality);
        var s = size ? Math.min(1, size / Math.max(iw, ih)) : 1;
        cv.width = Math.max(1, Math.round(iw * s));
        cv.height = Math.max(1, Math.round(ih * s));
        cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
        var imgData = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);

        if (engine === 'median') {
          allRaw = medianCut(imgData, Math.max(n, 8));
          raw = applyFilter(allRaw, filterMode);
          if (filterMode !== 'none' && allRaw.length > n) raw = allRaw.slice(0, n);
        } else {
          var pal = getThiefPalette(Math.max(n, 6), quality);
          if (!pal || !pal.length) {
            // ColorThief 不可用或采样为空时，回退到内置中位切分，避免直接取色失败
            allRaw = medianCut(imgData, Math.max(n, 8));
            raw = applyFilter(allRaw, filterMode);
            if (filterMode !== 'none' && allRaw.length > n) raw = allRaw.slice(0, n);
          } else {
            allRaw = pal.map(function (c) { return { r: c.r, g: c.g, b: c.b, count: 0 }; });
            raw = applyFilter(allRaw, filterMode);
            if (!raw.length) raw = allRaw.slice();
          }
        }
        if (!raw.length) raw = allRaw.slice();

        var total = 0;
        var d2 = imgData.data;
        var dc = [];
        for (var i = 0; i < d2.length; i += 4) {
          if (d2[i + 3] <= 128) continue;
          total++;
          dc.push([d2[i], d2[i + 1], d2[i + 2]]);
        }
        raw.forEach(function (c) {
          var cnt = 0;
          for (var i = 0; i < dc.length; i++) {
            var d = (dc[i][0] - c.r) * (dc[i][0] - c.r) + (dc[i][1] - c.g) * (dc[i][1] - c.g) + (dc[i][2] - c.b) * (dc[i][2] - c.b);
            if (d <= 900) cnt++;
          }
          c.ratio = total ? cnt / total : 0;
        });
        var sumRatio = raw.reduce(function (a, c) { return a + (c.ratio || 0); }, 0);
        raw.forEach(function (c) { if (sumRatio > 0) c.ratio = c.ratio / sumRatio; else c.ratio = 1 / raw.length; });
      } catch (err) {
        raw = [{ r: 128, g: 128, b: 128, ratio: 1 }];
        showToast('图片取色失败，请换一张图片试试');
      }

      raw = sortPalette(raw.slice(0, n), sortMode.value);
      currentPalette = raw.map(function (c) { return { r: c.r, g: c.g, b: c.b, hex: toHex(c.r, c.g, c.b), ratio: c.ratio || 0 }; });
      if (ratioBar) delete ratioBar.dataset.stale;
      renderPalette();
      renderRatio();
      renderA11y();
    }

    /* ================= 色板渲染 ================= */
    function renderPalette() {
      if (!currentPalette.length) {
        paletteList.innerHTML = '<div class="empty-state">暂无配色数据</div>';
        return;
      }
      var fmt = copyFormat.value;
      paletteList.innerHTML = '';
      currentPalette.forEach(function (c, idx) {
        var item = document.createElement('div');
        item.className = 'palette-item';
        item.title = '点击复制 ' + formatColor(c, fmt);

        var sw = document.createElement('div');
        sw.className = 'palette-swatch';
        sw.style.background = c.hex;

        var info = document.createElement('div');
        info.className = 'palette-info';
        info.style.color = getContrastColor(c.r, c.g, c.b);

        var code = document.createElement('span');
        code.className = 'palette-code';
        code.textContent = formatColor(c, fmt);

        var pct = document.createElement('span');
        pct.className = 'palette-pct';
        pct.textContent = Math.round((c.ratio || 0) * 100) + '%';

        var btn = document.createElement('button');
        btn.className = 'palette-copy';
        btn.textContent = '复制';
        btn.style.color = getContrastColor(c.r, c.g, c.b);
        btn.addEventListener('click', function (e) { e.stopPropagation(); copyText(formatColor(c, fmt)); });

        info.appendChild(code);
        info.appendChild(pct);
        info.appendChild(btn);
        item.appendChild(sw);
        item.appendChild(info);
        item.addEventListener('click', function () { copyText(formatColor(c, fmt)); });
        paletteList.appendChild(item);
      });
      applyUIPreview();
    }

    function applyUIPreview() {
      if (!currentPalette.length || !uiCardBg) return;
      var bg = currentPalette[0];
      var fg = currentPalette[currentPalette.length - 1];
      var primary = currentPalette[1] || bg;
      var outline = currentPalette[2] || fg;
      uiCardBg.style.background = bg.hex;
      uiCardBg.style.color = fg.hex;
      uiCardTitle.style.color = bg.hex;
      uiCardDesc.style.color = fg.hex;
      uiCardTitle.textContent = 'Card Title · ' + bg.hex;
      uiBtnPrimary.style.background = primary.hex;
      uiBtnPrimary.style.color = getContrastColor(primary.r, primary.g, primary.b);
      uiBtnOutline.style.color = outline.hex;
      uiBtnOutline.style.borderColor = outline.hex;
      uiBtnOutline.style.background = 'transparent';
      if (uiChips) {
        uiChips.innerHTML = '';
        currentPalette.forEach(function (c) {
          var chip = document.createElement('span');
          chip.className = 'ui-chip';
          chip.style.background = c.hex;
          chip.style.color = getContrastColor(c.r, c.g, c.b);
          var t = document.createElement('span');
          t.className = 'ui-chip-text';
          t.textContent = c.hex;
          chip.appendChild(t);
          chip.title = '点击复制 ' + c.hex;
          chip.addEventListener('click', function () { copyText(c.hex); });
          uiChips.appendChild(chip);
        });
      }
    }

    /* 占比条 */
    function renderRatio() {
      if (!ratioBar) return;
      if (!currentPalette.length) { ratioPanel.style.display = 'none'; return; }
      ratioPanel.style.display = 'block';
      ratioBar.innerHTML = '';
      currentPalette.forEach(function (c) {
        var seg = document.createElement('div');
        seg.className = 'ratio-seg';
        seg.style.background = c.hex;
        seg.style.width = Math.max((c.ratio || 0) * 100, 1) + '%';
        seg.title = c.hex + ' ' + Math.round((c.ratio || 0) * 100) + '%';
        seg.addEventListener('click', function () { copyText(c.hex); });
        ratioBar.appendChild(seg);
      });
    }

    /* 两两对比度 */
    function renderA11y() {
      if (!a11yTable) return;
      var list = schemeColors.length ? schemeColors : currentPalette;
      if (!list.length) { a11yPanel.style.display = 'none'; return; }
      a11yPanel.style.display = 'block';
      a11yTable.innerHTML = '';
      var n = Math.min(list.length, 6);
      for (var i = 0; i < n; i++) {
        for (var j = i + 1; j < n; j++) {
          var a = list[i], b = list[j];
          var r = contrastRatio(a, b);
          var tag, cls;
          if (r >= 7) { tag = 'AAA'; cls = 'aaa'; }
          else if (r >= 4.5) { tag = 'AA'; cls = 'aa'; }
          else if (r >= 3) { tag = 'AA 大字'; cls = 'aa-large'; }
          else { tag = '不达标'; cls = 'fail'; }
          var row = document.createElement('div');
          row.className = 'a11y-row';
          row.innerHTML =
            '<span class="a11y-pair"><i class="a11y-dot" style="background:' + a.hex + '"></i>' + a.hex +
            '<i class="a11y-dot" style="background:' + b.hex + '"></i>' + b.hex + '</span>' +
            '<span class="a11y-ratio">' + r.toFixed(2) + ':1</span>' +
            '<span class="a11y-tag ' + cls + '">' + tag + '</span>';
          a11yTable.appendChild(row);
        }
      }
    }

    /* ================= 配色方案 ================= */
    function buildScheme(base, type) {
      var hsl = rgbToHsl(base.r, base.g, base.b);
      var h = hsl[0], s = hsl[1], l = hsl[2];
      var out = [];
      function push(rgb) { out.push({ r: rgb[0], g: rgb[1], b: rgb[2], hex: toHex(rgb[0], rgb[1], rgb[2]), ratio: 0 }); }
      push([base.r, base.g, base.b]);
      var mod = function (d) { var v = (h + d) % 360; if (v < 0) v += 360; return v; };
      if (type === 'analogous') {
        [30, -30, 60, -60].forEach(function (d) { push(hslToRgb(mod(d), s, l)); });
      } else if (type === 'complementary') {
        push(hslToRgb(mod(180), s, l));
        push(hslToRgb(mod(180), Math.max(20, s - 30), Math.min(90, l + 15)));
        push(hslToRgb(h, Math.max(20, s - 30), Math.min(90, l + 15)));
        push(hslToRgb(mod(180), s, Math.max(15, l - 20)));
      } else if (type === 'split') {
        [150, 210].forEach(function (d) { push(hslToRgb(mod(d), s, l)); });
        push(hslToRgb(mod(150), s, Math.max(15, l - 20)));
        push(hslToRgb(h, s, Math.max(15, l - 20)));
      } else if (type === 'triadic') {
        [120, 240].forEach(function (d) { push(hslToRgb(mod(d), s, l)); });
        push(hslToRgb(mod(120), s, Math.max(15, l - 20)));
        push(hslToRgb(mod(240), s, Math.min(90, l + 20)));
      } else if (type === 'tetradic') {
        [60, 180, 240].forEach(function (d) { push(hslToRgb(mod(d), s, l)); });
        push(hslToRgb(mod(60), s, Math.max(15, l - 20)));
      } else if (type === 'monochrome') {
        [20, 40, -20, -40].forEach(function (d) { push(hslToRgb(h, s, Math.max(5, Math.min(95, l + d)))); });
      } else if (type === 'shades') {
        [90, 70, 50, 30, 15].forEach(function (lv) { push(hslToRgb(h, s, lv)); });
      }
      return out.slice(0, 6);
    }
    function generateScheme() {
      if (!currentPalette.length && !currentPicked) { showToast('请先上传图片'); return; }
      var baseSel = $('scheme-base');
      var src = $('scheme-base').value;
      var base = null;
      if (src === 'picked' && currentPicked) base = currentPicked;
      else if (src === 'vivid') {
        base = currentPalette.slice().sort(function (a, b) { return saturationOf(b.r, b.g, b.b) - saturationOf(a.r, a.g, a.b); })[0];
      }
      if (!base) base = currentPalette[0];
      schemeColors = buildScheme(base, $('scheme-type').value);
      renderSchemeList();
      renderA11y();
    }
    function renderSchemeList() {
      if (!schemeColors.length) { schemeList.innerHTML = '<div class="empty-state">点击上方按钮生成配色方案</div>'; return; }
      var fmt = copyFormat.value;
      schemeList.innerHTML = '';
      schemeColors.forEach(function (c) {
        var item = document.createElement('div');
        item.className = 'palette-item';
        var sw = document.createElement('div');
        sw.className = 'palette-swatch';
        sw.style.background = c.hex;
        var info = document.createElement('div');
        info.className = 'palette-info';
        info.style.color = getContrastColor(c.r, c.g, c.b);
        var code = document.createElement('span');
        code.className = 'palette-code';
        code.textContent = formatColor(c, fmt);
        var btn = document.createElement('button');
        btn.className = 'palette-copy';
        btn.textContent = '复制';
        btn.addEventListener('click', function (e) { e.stopPropagation(); copyText(formatColor(c, fmt)); });
        info.appendChild(code);
        info.appendChild(btn);
        item.appendChild(sw);
        item.appendChild(info);
        item.addEventListener('click', function () { copyText(formatColor(c, fmt)); });
        schemeList.appendChild(item);
      });
    }
    var btnGenScheme = $('btn-gen-scheme');
    if (btnGenScheme) btnGenScheme.addEventListener('click', generateScheme);

    /* ================= 导出 ================= */
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function downloadBlob(content, filename, mime) {
      var blob = new Blob([content], { type: mime });
      if (typeof saveAs === 'function') { saveAs(blob, filename); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function buildExport(type, list) {
      if (type === 'css') {
        return ':root {\n' + list.map(function (c, i) { return '  --color-' + (i + 1) + ': ' + c.hex + ';'; }).join('\n') + '\n}\n';
      }
      if (type === 'scss') {
        return list.map(function (c, i) { return '$color-' + (i + 1) + ': ' + c.hex + ';'; }).join('\n') + '\n';
      }
      if (type === 'json') {
        return JSON.stringify({ name: fileName, colors: list.map(function (c) { return { hex: c.hex, rgb: { r: c.r, g: c.g, b: c.b }, ratio: c.ratio || 0 }; }) }, null, 2);
      }
      if (type === 'tailwind') {
        return 'module.exports = {\n  theme: {\n    extend: {\n      colors: {\n' +
          list.map(function (c, i) { return "        brand" + (i + 1) + ": '" + c.hex + "'"; }).join(',\n') + '\n      }\n    }\n  }\n}\n';
      }
      if (type === 'ase') {
        // Adobe Swatch Exchange（二进制，分组色板）
        var enc = function (s) {
          var out = [], str = String(s);
          for (var i = 0; i < str.length; i++) {
            var cc = str.charCodeAt(i);
            out.push((cc >> 8) & 255, cc & 255);
          }
          return out;
        };
        var bytes = [0x41, 0x53, 0x45, 0x46, 0x00, 0x01, 0x00, 0x00]; // ASEF 1.0
        var body = [];
        body.push(0xC0, 0x01); // 组开始
        var name = 'Palette';
        body.push((name.length + 1 >> 8) & 255, (name.length + 1) & 255);
        body = body.concat(enc(name), [0x00]);
        body.push((list.length >> 8) & 255, list.length & 255);
        list.forEach(function (c, i) {
          body.push(0x00, 0x01); // 颜色块
          var n = 'Color ' + (i + 1);
          body.push((n.length + 1 >> 8) & 255, (n.length + 1) & 255);
          body = body.concat(enc(n), [0x00]);
          body = body.concat(enc('RGB'), [0x00]);
          body.push(((c.r / 255) >> 8) & 255, (c.r / 255) & 255);
          body.push(((c.g / 255) >> 8) & 255, (c.g / 255) & 255);
          body.push(((c.b / 255) >> 8) & 255, (c.b / 255) & 255);
          body.push(0x00, 0x02); // 全局
        });
        body.push(0xC0, 0x02); // 组结束
        var len = body.length;
        bytes.push((len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255);
        var arr = new Uint8Array(bytes.concat(body));
        return new Blob([arr], { type: 'application/octet-stream' });
      }
      if (type === 'png' || type === 'svg') {
        var cellW = 120, cellH = 160, pad = 16;
        var W = list.length * cellW + (list.length + 1) * pad;
        var H = cellH + pad * 2;
        if (type === 'svg') {
          var rects = list.map(function (c, i) {
            var x = pad + i * (cellW + pad);
            return '<rect x="' + x + '" y="' + pad + '" width="' + cellW + '" height="' + (cellH - 30) + '" rx="8" fill="' + c.hex + '"/>' +
              '<text x="' + (x + cellW / 2) + '" y="' + (pad + cellH - 10) + '" text-anchor="middle" font-family="monospace" font-size="12">' + c.hex + '</text>';
          }).join('');
          return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">\n' + rects + '\n</svg>\n';
        }
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var c2 = cv.getContext('2d');
        c2.fillStyle = '#ffffff';
        c2.fillRect(0, 0, W, H);
        list.forEach(function (c, i) {
          var x = pad + i * (cellW + pad);
          c2.fillStyle = c.hex;
          c2.fillRect(x, pad, cellW, cellH - 30);
          c2.fillStyle = getContrastColor(c.r, c.g, c.b);
          c2.font = '12px monospace';
          c2.textAlign = 'center';
          c2.fillText(c.hex, x + cellW / 2, pad + cellH - 10);
        });
        return cv;
      }
      // txt
      return list.map(function (c, i) { return 'Color ' + (i + 1) + ': ' + c.hex + '  rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')  ' + Math.round((c.ratio || 0) * 100) + '%'; }).join('\n') + '\n';
    }
    function exportPalette(type, list, baseName) {
      if (!list || !list.length) { showToast('暂无可导出的配色'); return; }
      try {
        if (type === 'ase') {
          downloadBlob(buildExport('ase', list), (baseName || 'palette') + '.ase', 'application/octet-stream');
        } else if (type === 'png') {
          var cv = buildExport('png', list);
          cv.toBlob(function (b) {
            if (b && typeof saveAs === 'function') saveAs(b, (baseName || 'palette') + '.png');
            else if (b) { var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = (baseName || 'palette') + '.png'; a.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); }
          }, 'image/png');
        } else {
          var ext = { css: 'css', scss: 'scss', json: 'json', tailwind: 'js', txt: 'txt', svg: 'svg' }[type] || 'txt';
          var mime = { css: 'text/css', scss: 'text/x-scss', json: 'application/json', svg: 'image/svg+xml' }[type] || 'text/plain';
          downloadBlob(buildExport(type, list), (baseName || 'palette') + '.' + ext, mime + ';charset=utf-8');
        }
        showToast('已导出 ' + type.toUpperCase());
      } catch (e) {
        showToast('导出失败');
      }
    }
    document.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.dataset.export;
        if (t === 'copyall') {
          copyText(currentPalette.map(function (c) { return c.hex; }).join(', '));
          return;
        }
        exportPalette(t, currentPalette, fileName);
      });
    });
    document.querySelectorAll('[data-scheme-export]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.dataset.schemeExport;
        if (t === 'copyall') {
          if (!schemeColors.length) { showToast('请先生成配色方案'); return; }
          copyText(schemeColors.map(function (c) { return c.hex; }).join(', '));
          return;
        }
        if (!schemeColors.length) { showToast('请先生成配色方案'); return; }
        exportPalette(t, schemeColors, fileName + '-scheme');
      });
    });

    var btnSaveImage = $('btn-save-image');
    if (btnSaveImage) btnSaveImage.addEventListener('click', function () {
      if (!mainCanvas.width) { showToast('请先上传图片'); return; }
      mainCanvas.toBlob(function (b) {
        if (!b) { showToast('保存失败'); return; }
        if (typeof saveAs === 'function') saveAs(b, fileName + '-edited.png');
        else {
          var u = URL.createObjectURL(b);
          var a = document.createElement('a');
          a.href = u; a.download = fileName + '-edited.png';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        }
        showToast('已保存处理后图片');
      }, 'image/png');
    });

    /* ================= 吸管 & 放大镜 ================= */
    function updatePicked(rgb) {
      currentPicked = rgb;
      var hex = toHex(rgb.r, rgb.g, rgb.b);
      pickedSwatch.style.background = hex;
      valHex.textContent = hex;
      valRgb.textContent = rgb.r + ', ' + rgb.g + ', ' + rgb.b;
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      valHsl.textContent = hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%';
      var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      valHsv.textContent = hsv[0] + ', ' + hsv[1] + '%, ' + hsv[2] + '%';
      var cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
      valCmyk.textContent = cmyk[0] + ', ' + cmyk[1] + ', ' + cmyk[2] + ', ' + cmyk[3];
      if (contrastBox) {
        contrastBox.style.display = 'block';
        var ratio = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
        contrastRatioEl.textContent = ratio.toFixed(2) + ':1';
        var tag = ratio >= 7 ? 'AAA（白底文字）' : ratio >= 4.5 ? 'AA（白底文字）' : ratio >= 3 ? '仅大字可用（白底）' : '与白底对比不足';
        contrastText.textContent = tag + '；黑底 ' + contrastRatio(rgb, { r: 0, g: 0, b: 0 }).toFixed(2) + ':1';
      }
      if (mode === 'scheme' && $('scheme-base').value === 'picked') generateScheme();
    }
    var contrastRatioEl = $('contrast-ratio');

    function drawMagnifier(cx, cy) {
      if (!currentImage) return;
      var zoom = parseInt(magZoom.value, 10) || 12;
      var srcSize = 11;
      var sx = Math.floor(cx - srcSize / 2);
      var sy = Math.floor(cy - srcSize / 2);
      var maxC = filteredCanvas || mainCanvas;
      sx = Math.max(0, Math.min(maxC.width - srcSize, sx));
      sy = Math.max(0, Math.min(maxC.height - srcSize, sy));
      magCtx.imageSmoothingEnabled = false;
      magCtx.clearRect(0, 0, magnifier.width, magnifier.height);
      magCtx.drawImage(maxC, sx, sy, srcSize, srcSize, 0, 0, magnifier.width, magnifier.height);
      magCtx.strokeStyle = 'rgba(0,0,0,0.25)';
      magCtx.lineWidth = 1;
      for (var i = 1; i < srcSize; i++) {
        var p = i * magnifier.width / srcSize;
        magCtx.beginPath(); magCtx.moveTo(p, 0); magCtx.lineTo(p, magnifier.height); magCtx.stroke();
        magCtx.beginPath(); magCtx.moveTo(0, p); magCtx.lineTo(magnifier.width, p); magCtx.stroke();
      }
      magCtx.fillStyle = '#fff';
      magCtx.fillRect((srcSize - 1) / 2 * magnifier.width / srcSize - 3, (srcSize - 1) / 2 * magnifier.height / srcSize - 3, 6, 6);
      magCtx.strokeStyle = '#000';
      magCtx.strokeRect((srcSize - 1) / 2 * magnifier.width / srcSize - 3, (srcSize - 1) / 2 * magnifier.height / srcSize - 3, 6, 6);
    }
    function showMagnifierAt(clientX, clientY) {
      magnifier.style.display = 'block';
      var rect = canvasContainer.getBoundingClientRect();
      var mSize = magnifier.width;
      var x = clientX - rect.left - mSize / 2;
      var y = clientY - rect.top - mSize - 12;
      if (y < 0) y = clientY - rect.top + 16;
      x = Math.max(0, Math.min(rect.width - mSize, x));
      magnifier.style.left = x + 'px';
      magnifier.style.top = y + 'px';
    }
    function hideMagnifier() { magnifier.style.display = 'none'; }

    function averageAround(cx, cy, radius) {
      var maxC = filteredCanvas || mainCanvas;
      var r = Math.max(1, radius | 0);
      var x0 = Math.max(0, cx - r), y0 = Math.max(0, cy - r);
      var x1 = Math.min(maxC.width - 1, cx + r), y1 = Math.min(maxC.height - 1, cy + r);
      var d = ctx.getImageData(x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1)).data;
      var R = 0, G = 0, B = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        R += d[i]; G += d[i + 1]; B += d[i + 2]; n++;
      }
      return n ? { r: Math.round(R / n), g: Math.round(G / n), b: Math.round(B / n) } : null;
    }

    function canvasCoords(e) {
      var rect = mainCanvas.getBoundingClientRect();
      var sx = mainCanvas.width / rect.width;
      var sy = mainCanvas.height / rect.height;
      var x = (e.clientX - rect.left) * sx;
      var y = (e.clientY - rect.top) * sy;
      return { x: x, y: y };
    }

    mainCanvas.addEventListener('mousemove', function (e) {
      if (!currentImage) return;
      var p = canvasCoords(e);
      var radius = parseInt(($('pick-radius') || {}).value, 10) || 1;
      var rgb = averageAround(Math.round(p.x), Math.round(p.y), radius);
      if (!rgb) return;
      updatePicked(rgb);
      drawMagnifier(p.x, p.y);
      showMagnifierAt(e.clientX, e.clientY);
    });
    mainCanvas.addEventListener('mouseleave', function () { hideMagnifier(); });
    mainCanvas.addEventListener('click', function (e) {
      if (!currentImage) return;
      var p = canvasCoords(e);
      var radius = parseInt(($('pick-radius') || {}).value, 10) || 1;
      var rgb = averageAround(Math.round(p.x), Math.round(p.y), radius);
      if (!rgb) return;
      updatePicked(rgb);
      copyText(toHex(rgb.r, rgb.g, rgb.b));
      addHistory(toHex(rgb.r, rgb.g, rgb.b), rgb);
    });
    ['mag-zoom', 'pick-radius'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () {
        var lab = $(id + '-val');
        if (lab) lab.textContent = el.value;
      });
    });

    /* 历史记录 */
    var history = [];
    function addHistory(hex, rgb) {
      history = history.filter(function (h) { return h.hex !== hex; });
      history.unshift({ hex: hex, rgb: rgb });
      if (history.length > HISTORY_LIMIT) history = history.slice(0, HISTORY_LIMIT);
      renderHistory();
    }
    function renderHistory() {
      if (!history.length) { historySection.style.display = 'none'; return; }
      historySection.style.display = 'block';
      historyList.innerHTML = '';
      history.forEach(function (h) {
        var d = document.createElement('div');
        d.className = 'history-item';
        d.style.background = h.hex;
        d.title = h.hex + '（点击复制）';
        d.addEventListener('click', function () { copyText(h.hex); });
        historyList.appendChild(d);
      });
    }

    /* ================= 事件绑定 ================= */
    function switchMode(m) {
      mode = m;
      btnModeAuto.classList.toggle('active', m === 'auto');
      btnModePicker.classList.toggle('active', m === 'picker');
      btnModeScheme.classList.toggle('active', m === 'scheme');
      autoPanel.style.display = m === 'auto' ? 'flex' : 'none';
      pickerPanel.style.display = m === 'picker' ? 'flex' : 'none';
      schemePanel.style.display = m === 'scheme' ? 'flex' : 'none';
      if (m === 'scheme' && currentImage && !schemeColors.length) generateScheme();
    }
    btnModeAuto.addEventListener('click', function () { switchMode('auto'); });
    btnModePicker.addEventListener('click', function () { switchMode('picker'); });
    if (btnModeScheme) btnModeScheme.addEventListener('click', function () { switchMode('scheme'); });

    if (colorCount) colorCount.addEventListener('input', function () { colorCountVal.textContent = colorCount.value; });
    ['engine-mode', 'quality-level', 'filter-mode', 'sort-mode', 'copy-format'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', function () {
        if (id === 'copy-format') renderPalette();
        else extractPalette();
      });
    });
    btnReextract.addEventListener('click', extractPalette);

    document.querySelectorAll('.copy-btn[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var target = $(btn.dataset.copy);
        if (target) copyText(target.textContent);
      });
    });

    bindUploadZone(dropZone, fileInput);
  }
})();
