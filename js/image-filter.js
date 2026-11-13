(function () {
  'use strict';

  /* ============================================================
   * 常量
   * ============================================================ */
  var MAX_DIMENSION = 2400; // 最长边限制，防止大图处理卡顿

  /* ============================================================
   * DOM
   * ============================================================ */
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var emptyHint = document.getElementById('empty-hint');
  var canvas = document.getElementById('main-canvas');
  var ctx = canvas.getContext('2d');
  var settings = document.getElementById('settings');
  var presetsGrid = document.getElementById('presets-grid');
  var imageInfo = document.getElementById('image-info');

  var btnReset = document.getElementById('btn-reset');
  var btnUndo = document.getElementById('btn-undo');
  var btnRedo = document.getElementById('btn-redo');
  var btnCompare = document.getElementById('btn-compare');
  var btnDownload = document.getElementById('btn-download');
  var exportFormatEl = document.getElementById('export-format');
  var exportNameEl = document.getElementById('export-name');

  var qualityEl = document.getElementById('p-quality');
  var qualityVal = document.getElementById('val-quality');

  /* ============================================================
   * 参数定义
   * ============================================================ */
  var DEFAULT_PARAMS = {
    // 光影
    brightness: 100, contrast: 100, exposure: 0, highlights: 0, shadows: 0,
    whites: 0, blacks: 0, clarity: 0, vibrance: 0,
    // 色彩
    saturate: 100, temp: 0, tint: 0, hue: 0, gray: 0, sepia: 0, invert: 0,
    redShift: 0, greenShift: 0, blueShift: 0,
    // 特效
    blur: 0, sharpen: 0, vignette: 0, noise: 0, posterize: 0, pixelate: 0,
    emboss: 0, edge: 0, chromatic: 0, bloom: 0, scanline: 0,
    // 几何
    rotate: 0, flipH: false, flipV: false
  };

  var PERCENT_KEYS = ['brightness','contrast','saturate','gray','sepia','invert',
    'vignette','noise','clarity','sharpen','emboss','edge','bloom','scanline'];

  /* ============================================================
   * 预设滤镜（完整参数快照）
   * ============================================================ */
  function makePreset(overrides) {
    return Object.assign({}, DEFAULT_PARAMS, overrides);
  }

  var PRESETS = {
    none:       { name: '原图',   params: makePreset({}) },
    cyberpunk:  { name: '赛博朋克', params: makePreset({ saturate: 180, contrast: 130, temp: -30, tint: 40, hue: 20, bloom: 30 }) },
    cinematic:  { name: '电影感', params: makePreset({ contrast: 115, saturate: 90, temp: 10, shadows: 20, highlights: -15, vignette: 20, bloom: 15 }) },
    japanese:   { name: '日系',   params: makePreset({ brightness: 110, contrast: 90, saturate: 85, temp: 15, shadows: 15, bloom: 10 }) },
    hongkong:   { name: '港风',   params: makePreset({ contrast: 125, sepia: 20, temp: 20, vibrance: 20, vignette: 25 }) },
    blackgold:  { name: '黑金',   params: makePreset({ gray: 100, contrast: 130, vignette: 30, bloom: 20 }) },
    morandi:    { name: '莫兰迪', params: makePreset({ saturate: 60, contrast: 85, brightness: 105, shadows: 10 }) },
    vintage:    { name: '复古',   params: makePreset({ sepia: 50, contrast: 110, saturate: 80, vignette: 35, noise: 25 }) },
    blackwhite: { name: '黑白',   params: makePreset({ gray: 100, contrast: 130, clarity: 20 }) },
    warm:       { name: '暖夏',   params: makePreset({ temp: 40, brightness: 105, saturate: 110 }) },
    cool:       { name: '冷冬',   params: makePreset({ temp: -40, saturate: 95 }) },
    dramatic:   { name: '高对比', params: makePreset({ contrast: 180, clarity: 40, vignette: 20 }) },
    faded:      { name: '褪色',   params: makePreset({ contrast: 75, saturate: 70, brightness: 110, shadows: 30, blacks: -20 }) },
    polaroid:   { name: '拍立得', params: makePreset({ contrast: 90, saturate: 80, brightness: 105, temp: 10, vignette: 20 }) },
    lomo:       { name: 'LOMO',   params: makePreset({ contrast: 140, saturate: 130, vignette: 50, clarity: 20 }) },
    sunset:     { name: '落日',   params: makePreset({ temp: 50, tint: 20, saturate: 120, brightness: 105, bloom: 20 }) },
    forest:     { name: '森林',   params: makePreset({ temp: -10, tint: -20, saturate: 110, hue: 10, shadows: 15 }) },
    ocean:      { name: '海洋',   params: makePreset({ temp: -30, saturate: 110, brightness: 105, hue: -5 }) },
    neon:       { name: '霓虹',   params: makePreset({ saturate: 200, contrast: 140, hue: 30, bloom: 40, chromatic: 3 }) },
    dreamy:     { name: '梦幻',   params: makePreset({ brightness: 115, contrast: 85, saturate: 90, bloom: 50, vignette: 15 }) },
    noir:       { name: '暗黑',   params: makePreset({ gray: 100, contrast: 150, vignette: 40, noise: 20 }) },
    pastel:     { name: '柔和',   params: makePreset({ saturate: 70, brightness: 115, contrast: 85, temp: 10, bloom: 15 }) },
    ir:         { name: '红外',   params: makePreset({ hue: 180, saturate: 150, contrast: 110 }) },
    sketch:     { name: '素描',   params: makePreset({ gray: 100, edge: 100, contrast: 150, brightness: 110 }) },
    thermal:    { name: '热成像', params: makePreset({ hue: 200, saturate: 200, contrast: 140, redShift: 50, blueShift: -50 }) },
    golden:     { name: '金秋',   params: makePreset({ temp: 50, saturate: 130, contrast: 110, bloom: 20, vignette: 15 }) },
    mint:       { name: '薄荷',   params: makePreset({ temp: -15, tint: -20, saturate: 90, brightness: 110 }) },
    sunsetglow: { name: '晚霞',   params: makePreset({ temp: 60, tint: 30, bloom: 40, brightness: 105 }) }
  };

  /* ============================================================
   * 状态
   * ============================================================ */
  var sourceImg = null;
  var params = Object.assign({}, DEFAULT_PARAMS);
  var currentPreset = 'none';

  // 画布
  var baseCanvas = document.createElement('canvas');   // 几何变换后的原图
  var baseCtx = baseCanvas.getContext('2d');
  var workCanvas = document.createElement('canvas');   // 工作画布
  var workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  var tmpCanvas = document.createElement('canvas');    // 临时画布
  var tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
  var blurCanvas = document.createElement('canvas');   // 模糊专用
  var blurCtx = blurCanvas.getContext('2d');

  // 噪点纹理
  var noiseCanvas = null;

  // 历史
  var history = [];
  var historyIndex = -1;
  var historyTimer = null;

  // 渲染节流
  var renderPending = false;

  /* ============================================================
   * 1. 噪点纹理
   * ============================================================ */
  function initNoise() {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 128;
    noiseCanvas.height = 128;
    var nCtx = noiseCanvas.getContext('2d');
    var nData = nCtx.createImageData(128, 128);
    for (var i = 0; i < nData.data.length; i += 4) {
      var val = Math.random() * 255;
      nData.data[i] = val;
      nData.data[i + 1] = val;
      nData.data[i + 2] = val;
      nData.data[i + 3] = 255;
    }
    nCtx.putImageData(nData, 0, 0);
  }

  /* ============================================================
   * 2. 图片上传
   * ============================================================ */
  dropZone.addEventListener('click', function () { fileInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) return alert('请选择图片文件！');

    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        sourceImg = img;
        emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        settings.classList.add('active');

        // 重置参数与历史
        params = Object.assign({}, DEFAULT_PARAMS);
        currentPreset = 'none';
        syncUI();
        updateRotateButtons();
        history = [];
        historyIndex = -1;
        pushHistory();

        // 信息
        imageInfo.textContent = img.width + ' × ' + img.height + ' px';

        render();
      };
      img.onerror = function () { alert('图片加载失败，请更换文件'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  /* ============================================================
   * 3. 渲染管线
   * ============================================================ */
  function scheduleRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(function () {
      renderPending = false;
      render();
    });
  }

  function render() {
    if (!sourceImg) return;

    // ---- 1. 几何变换 → baseCanvas ----
    var iw = sourceImg.naturalWidth || sourceImg.width;
    var ih = sourceImg.naturalHeight || sourceImg.height;
    var scale = Math.min(1, MAX_DIMENSION / Math.max(iw, ih));
    var w = Math.round(iw * scale);
    var h = Math.round(ih * scale);

    var rot = params.rotate;
    var outW = (rot === 90 || rot === 270) ? h : w;
    var outH = (rot === 90 || rot === 270) ? w : h;

    if (baseCanvas.width !== outW || baseCanvas.height !== outH) {
      baseCanvas.width = outW;
      baseCanvas.height = outH;
    }
    baseCtx.save();
    baseCtx.clearRect(0, 0, outW, outH);
    baseCtx.translate(outW / 2, outH / 2);
    baseCtx.rotate(rot * Math.PI / 180);
    baseCtx.scale(params.flipH ? -1 : 1, params.flipV ? -1 : 1);
    baseCtx.drawImage(sourceImg, -w / 2, -h / 2, w, h);
    baseCtx.restore();

    // ---- 2. CSS Filter → workCanvas ----
    if (workCanvas.width !== outW || workCanvas.height !== outH) {
      workCanvas.width = outW;
      workCanvas.height = outH;
    }
    workCtx.save();
    workCtx.clearRect(0, 0, outW, outH);

    var filterStr = 'brightness(' + params.brightness + '%) ' +
                    'contrast(' + params.contrast + '%) ' +
                    'saturate(' + params.saturate + '%) ' +
                    'hue-rotate(' + params.hue + 'deg) ' +
                    'grayscale(' + params.gray + '%) ' +
                    'sepia(' + params.sepia + '%) ' +
                    'invert(' + params.invert + '%) ';
    if (params.blur > 0) filterStr += 'blur(' + params.blur + 'px) ';
    workCtx.filter = filterStr;
    workCtx.drawImage(baseCanvas, 0, 0);
    workCtx.filter = 'none';
    workCtx.restore();

    // ---- 3. 像素级调整（曲线/通道/自然饱和度/色调分离） ----
    applyPixelAdjustments();

    // ---- 4. 卷积（锐化/清晰度/浮雕/边缘检测） ----
    applyConvolution();

    // ---- 5. 像素化 ----
    if (params.pixelate >= 2) applyPixelate();

    // ---- 6. 色差 ----
    if (params.chromatic > 0) applyChromatic();

    // ---- 7. 光晕 ----
    if (params.bloom > 0) applyBloom();

    // ---- 8. 叠加层（暗角/噪点/扫描线） ----
    applyOverlays();

    // ---- 9. 输出到显示画布 ----
    if (canvas.width !== outW || canvas.height !== outH) {
      canvas.width = outW;
      canvas.height = outH;
    }
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(workCanvas, 0, 0);
  }

  /* ============================================================
   * 3.1 像素级调整
   * ============================================================ */
  function applyPixelAdjustments() {
    var need = params.exposure !== 0 || params.highlights !== 0 || params.shadows !== 0 ||
               params.whites !== 0 || params.blacks !== 0 || params.vibrance !== 0 ||
               params.temp !== 0 || params.tint !== 0 ||
               params.redShift !== 0 || params.greenShift !== 0 || params.blueShift !== 0 ||
               params.posterize > 1;
    if (!need) return;

    var w = workCanvas.width, h = workCanvas.height;
    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;

    // 预计算 256 级色调曲线
    var curve = new Uint8ClampedArray(256);
    for (var i = 0; i < 256; i++) {
      var v = i;

      if (params.exposure !== 0) {
        v = v * Math.pow(2, params.exposure / 100);
      }
      if (params.shadows !== 0) {
        var t = 1 - v / 255;
        v += params.shadows / 100 * t * t * 80;
      }
      if (params.highlights !== 0) {
        var t2 = v / 255;
        v += params.highlights / 100 * t2 * t2 * 80;
      }
      if (params.whites !== 0) {
        var t3 = v / 255;
        v += params.whites / 100 * t3 * t3 * t3 * 90;
      }
      if (params.blacks !== 0) {
        var t4 = 1 - v / 255;
        v += params.blacks / 100 * t4 * t4 * t4 * 90;
      }
      curve[i] = Math.max(0, Math.min(255, v));
    }

    var postStep = params.posterize > 1 ? 255 / (params.posterize - 1) : 0;
    var usePost = params.posterize > 1;

    var tempR = params.temp / 100 * 40;
    var tempB = -tempR;
    var tintR = params.tint / 100 * 30;
    var tintG = -tintR;
    var tintB = tintR;
    var rShift = params.redShift * 1.5;
    var gShift = params.greenShift * 1.5;
    var bShift = params.blueShift * 1.5;
    var vib = params.vibrance / 100;

    for (var j = 0; j < data.length; j += 4) {
      var r = curve[data[j]];
      var g = curve[data[j + 1]];
      var b = curve[data[j + 2]];

      // 通道偏移
      if (rShift) r += rShift;
      if (gShift) g += gShift;
      if (bShift) b += bShift;

      // 色温 / 色调
      if (params.temp !== 0) { r += tempR; b += tempB; }
      if (params.tint !== 0) { r += tintR; g += tintG; b += tintB; }

      // 自然饱和度
      if (vib !== 0) {
        var mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
        var mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
        var avg = (r + g + b) / 3;
        var sat = mx > 0 ? (mx - mn) / mx : 0;
        var factor = 1 + vib * (1 - sat);
        r = avg + (r - avg) * factor;
        g = avg + (g - avg) * factor;
        b = avg + (b - avg) * factor;
      }

      // 色调分离
      if (usePost) {
        r = Math.round(r / postStep) * postStep;
        g = Math.round(g / postStep) * postStep;
        b = Math.round(b / postStep) * postStep;
      }

      data[j]     = r < 0 ? 0 : (r > 255 ? 255 : r);
      data[j + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      data[j + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* ============================================================
   * 3.2 卷积：锐化 / 清晰度 / 浮雕 / 边缘检测
   * ============================================================ */
  function applyConvolution() {
    var doSharpen = params.sharpen > 0;
    var doClarity = params.clarity > 0;
    var doEmboss = params.emboss > 0;
    var doEdge = params.edge > 0;
    if (!doSharpen && !doClarity && !doEmboss && !doEdge) return;

    var w = workCanvas.width, h = workCanvas.height;

    // 边缘检测（替换原图）
    if (doEdge) {
      applyEdge();
      return; // 边缘模式优先，忽略其他卷积
    }

    // 清晰度（Unsharp Mask）
    if (doClarity) {
      var radius = Math.max(4, Math.min(w, h) / 200);
      blurCanvas.width = w;
      blurCanvas.height = h;
      blurCtx.clearRect(0, 0, w, h);
      blurCtx.filter = 'blur(' + radius + 'px)';
      blurCtx.drawImage(workCanvas, 0, 0);
      blurCtx.filter = 'none';

      var orig = workCtx.getImageData(0, 0, w, h);
      var blurred = blurCtx.getImageData(0, 0, w, h);
      var strength = params.clarity / 100 * 1.2;
      var oD = orig.data, bD = blurred.data;
      for (var i = 0; i < oD.length; i += 4) {
        oD[i]     = oD[i]     + (oD[i]     - bD[i])     * strength;
        oD[i + 1] = oD[i + 1] + (oD[i + 1] - bD[i + 1]) * strength;
        oD[i + 2] = oD[i + 2] + (oD[i + 2] - bD[i + 2]) * strength;
      }
      workCtx.putImageData(orig, 0, 0);
    }

    // 锐化（3x3 拉普拉斯）
    if (doSharpen) {
      var sImg = workCtx.getImageData(0, 0, w, h);
      var sD = sImg.data;
      var sCopy = new Uint8ClampedArray(sD);
      var amt = params.sharpen / 100 * 0.6;

      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          var idx = (y * w + x) * 4;
          for (var c = 0; c < 3; c++) {
            var center = sCopy[idx + c];
            var neighbors = sCopy[idx - 4 + c] + sCopy[idx + 4 + c] +
                            sCopy[idx - w * 4 + c] + sCopy[idx + w * 4 + c];
            var val = center + amt * (center * 4 - neighbors) / 4;
            sD[idx + c] = val < 0 ? 0 : (val > 255 ? 255 : val);
          }
        }
      }
      workCtx.putImageData(sImg, 0, 0);
    }

    // 浮雕（叠加模式）
    if (doEmboss) {
      var eImg = workCtx.getImageData(0, 0, w, h);
      var eD = eImg.data;
      var eCopy = new Uint8ClampedArray(eD);
      var kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
      var eAmt = params.emboss / 100;

      for (var y2 = 1; y2 < h - 1; y2++) {
        for (var x2 = 1; x2 < w - 1; x2++) {
          var outIdx = (y2 * w + x2) * 4;
          var r = 0, g = 0, b = 0;
          for (var ky = -1; ky <= 1; ky++) {
            for (var kx = -1; kx <= 1; kx++) {
              var sIdx = ((y2 + ky) * w + (x2 + kx)) * 4;
              var kVal = kernel[(ky + 1) * 3 + (kx + 1)];
              r += eCopy[sIdx] * kVal;
              g += eCopy[sIdx + 1] * kVal;
              b += eCopy[sIdx + 2] * kVal;
            }
          }
          eD[outIdx]     = eD[outIdx]     * (1 - eAmt) + (r + 128) * eAmt;
          eD[outIdx + 1] = eD[outIdx + 1] * (1 - eAmt) + (g + 128) * eAmt;
          eD[outIdx + 2] = eD[outIdx + 2] * (1 - eAmt) + (b + 128) * eAmt;
        }
      }
      workCtx.putImageData(eImg, 0, 0);
    }
  }

  function applyEdge() {
    var w = workCanvas.width, h = workCanvas.height;
    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var src = new Uint8ClampedArray(data);
    var gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    var gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    var strength = params.edge / 100;

    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var gx = 0, gy = 0;
        for (var ky = -1; ky <= 1; ky++) {
          for (var kx = -1; kx <= 1; kx++) {
            var sIdx = ((y + ky) * w + (x + kx)) * 4;
            var lum = src[sIdx] * 0.299 + src[sIdx + 1] * 0.587 + src[sIdx + 2] * 0.114;
            var kIdx = (ky + 1) * 3 + (kx + 1);
            gx += lum * gxK[kIdx];
            gy += lum * gyK[kIdx];
          }
        }
        var mag = Math.sqrt(gx * gx + gy * gy) * strength;
        mag = mag > 255 ? 255 : mag;
        var oIdx = (y * w + x) * 4;
        data[oIdx] = mag;
        data[oIdx + 1] = mag;
        data[oIdx + 2] = mag;
        data[oIdx + 3] = 255;
      }
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* ============================================================
   * 3.3 像素化
   * ============================================================ */
  function applyPixelate() {
    var w = workCanvas.width, h = workCanvas.height;
    var size = Math.round(params.pixelate);
    if (size < 2) return;

    var sw = Math.max(1, Math.ceil(w / size));
    var sh = Math.max(1, Math.ceil(h / size));

    tmpCanvas.width = sw;
    tmpCanvas.height = sh;
    tmpCtx.imageSmoothingEnabled = false;
    tmpCtx.drawImage(workCanvas, 0, 0, sw, sh);

    workCtx.imageSmoothingEnabled = false;
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(tmpCanvas, 0, 0, w, h);
    workCtx.imageSmoothingEnabled = true;
  }

  /* ============================================================
   * 3.4 色差
   * ============================================================ */
  function applyChromatic() {
    var w = workCanvas.width, h = workCanvas.height;
    var offset = Math.round(params.chromatic);
    if (offset < 1) return;

    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var src = new Uint8ClampedArray(data);

    for (var y = 0; y < h; y++) {
      var rowStart = y * w * 4;
      for (var x = 0; x < w; x++) {
        var idx = rowStart + x * 4;
        var rX = x - offset < 0 ? 0 : (x - offset >= w ? w - 1 : x - offset);
        var bX = x + offset < 0 ? 0 : (x + offset >= w ? w - 1 : x + offset);
        data[idx]     = src[rowStart + rX * 4];
        data[idx + 2] = src[rowStart + bX * 4 + 2];
      }
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* ============================================================
   * 3.5 光晕
   * ============================================================ */
  function applyBloom() {
    var w = workCanvas.width, h = workCanvas.height;

    // 提取亮部
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    tmpCtx.clearRect(0, 0, w, h);
    tmpCtx.drawImage(workCanvas, 0, 0);

    var tmpData = tmpCtx.getImageData(0, 0, w, h);
    var d = tmpData.data;
    var threshold = 200;
    for (var i = 0; i < d.length; i += 4) {
      var lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      if (lum < threshold) {
        d[i] = 0; d[i + 1] = 0; d[i + 2] = 0;
      } else {
        var f = (lum - threshold) / (255 - threshold);
        d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
      }
    }
    tmpCtx.putImageData(tmpData, 0, 0);

    // 模糊
    blurCanvas.width = w;
    blurCanvas.height = h;
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.filter = 'blur(15px)';
    blurCtx.drawImage(tmpCanvas, 0, 0);
    blurCtx.filter = 'none';

    // 叠加
    workCtx.globalCompositeOperation = 'screen';
    workCtx.globalAlpha = params.bloom / 100;
    workCtx.drawImage(blurCanvas, 0, 0);
    workCtx.globalAlpha = 1;
    workCtx.globalCompositeOperation = 'source-over';
  }

  /* ============================================================
   * 3.6 叠加层
   * ============================================================ */
  function applyOverlays() {
    var w = workCanvas.width, h = workCanvas.height;

    // 暗角
    if (params.vignette > 0) {
      var g = workCtx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.3,
        w / 2, h / 2, Math.max(w, h) * 0.7
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (params.vignette / 100) + ')');
      workCtx.fillStyle = g;
      workCtx.fillRect(0, 0, w, h);
    }

    // 噪点
    if (params.noise > 0 && noiseCanvas) {
      workCtx.globalAlpha = params.noise / 100 * 0.6;
      workCtx.globalCompositeOperation = 'overlay';
      var pattern = workCtx.createPattern(noiseCanvas, 'repeat');
      workCtx.fillStyle = pattern;
      workCtx.fillRect(0, 0, w, h);
      workCtx.globalAlpha = 1;
      workCtx.globalCompositeOperation = 'source-over';
    }

    // 扫描线
    if (params.scanline > 0) {
      var alpha = params.scanline / 100 * 0.35;
      workCtx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
      for (var y = 0; y < h; y += 3) {
        workCtx.fillRect(0, y, w, 1);
      }
    }
  }

  /* ============================================================
   * 4. UI 绑定
   * ============================================================ */
  function updateLabel(key) {
    var el = document.getElementById('val-' + key);
    if (!el) return;
    var val = params[key];
    if (key === 'posterize') {
      el.textContent = val <= 1 ? '关闭' : val + ' 级';
      return;
    }
    if (key === 'pixelate') {
      el.textContent = val < 2 ? '关闭' : val + ' px';
      return;
    }
    var suffix = '';
    if (key === 'hue') suffix = '°';
    else if (key === 'blur') suffix = 'px';
    else if (key === 'chromatic') suffix = 'px';
    else if (PERCENT_KEYS.indexOf(key) !== -1) suffix = '%';
    el.textContent = val + suffix;
  }

  function bindSliders() {
    Object.keys(DEFAULT_PARAMS).forEach(function (key) {
      var el = document.getElementById('p-' + key);
      if (!el) return;

      if (el.type === 'range') {
        el.addEventListener('input', function () {
          params[key] = parseFloat(this.value);
          updateLabel(key);
          scheduleRender();
          scheduleHistory();
        });
      } else if (el.type === 'checkbox') {
        el.addEventListener('change', function () {
          params[key] = this.checked;
          scheduleRender();
          commitHistory();
        });
      }
    });

    // 质量滑块（不参与渲染，只更新显示）
    qualityEl.addEventListener('input', function () {
      qualityVal.textContent = this.value + '%';
    });

    // 旋转按钮
    document.querySelectorAll('.geo-btn[data-rotate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        params.rotate = parseInt(this.dataset.rotate, 10);
        updateRotateButtons();
        scheduleRender();
        commitHistory();
      });
    });
  }

  function updateRotateButtons() {
    document.querySelectorAll('.geo-btn[data-rotate]').forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.rotate, 10) === params.rotate);
    });
  }

  function syncUI() {
    Object.keys(params).forEach(function (key) {
      var el = document.getElementById('p-' + key);
      if (!el) return;
      if (el.type === 'range') el.value = params[key];
      else if (el.type === 'checkbox') el.checked = params[key];
      updateLabel(key);
    });
    updatePresetButtons();
    updateRotateButtons();
  }

  function updatePresetButtons() {
    document.querySelectorAll('.preset-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.preset === currentPreset);
    });
  }

  /* ============================================================
   * 5. 预设
   * ============================================================ */
  function buildPresets() {
    Object.keys(PRESETS).forEach(function (key) {
      var btn = document.createElement('button');
      btn.className = 'preset-btn' + (key === 'none' ? ' active' : '');
      btn.dataset.preset = key;
      btn.textContent = PRESETS[key].name;
      btn.title = PRESETS[key].name;
      btn.addEventListener('click', function () { applyPreset(key); });
      presetsGrid.appendChild(btn);
    });
  }

  function applyPreset(key) {
    if (!PRESETS[key]) return;
    currentPreset = key;
    params = Object.assign({}, PRESETS[key].params);
    syncUI();
    scheduleRender();
    commitHistory();
  }

  /* ============================================================
   * 6. 历史记录
   * ============================================================ */
  function pushHistory() {
    var snapshot = JSON.stringify(params);
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(snapshot);
    if (history.length > 60) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function scheduleHistory() {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(pushHistory, 400);
  }

  function commitHistory() {
    clearTimeout(historyTimer);
    pushHistory();
  }

  function updateHistoryButtons() {
    btnUndo.disabled = historyIndex <= 0;
    btnRedo.disabled = historyIndex >= history.length - 1;
  }

  btnUndo.addEventListener('click', function () {
    if (historyIndex <= 0) return;
    historyIndex--;
    params = JSON.parse(history[historyIndex]);
    syncUI();
    scheduleRender();
    updateHistoryButtons();
  });

  btnRedo.addEventListener('click', function () {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    params = JSON.parse(history[historyIndex]);
    syncUI();
    scheduleRender();
    updateHistoryButtons();
  });

  /* ============================================================
   * 7. 重置 / 对比
   * ============================================================ */
  btnReset.addEventListener('click', function () {
    params = Object.assign({}, DEFAULT_PARAMS);
    currentPreset = 'none';
    syncUI();
    scheduleRender();
    commitHistory();
  });

  // 按住对比原图
  function showOriginal() {
    if (!sourceImg) return;
    if (canvas.width !== baseCanvas.width || canvas.height !== baseCanvas.height) {
      canvas.width = baseCanvas.width;
      canvas.height = baseCanvas.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
  }
  btnCompare.addEventListener('pointerdown', showOriginal);
  btnCompare.addEventListener('pointerup', scheduleRender);
  btnCompare.addEventListener('pointerleave', scheduleRender);
  btnCompare.addEventListener('pointercancel', scheduleRender);

  /* ============================================================
   * 8. 快捷键
   * ============================================================ */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) btnRedo.click();
      else btnUndo.click();
    }
  });

  /* ============================================================
   * 9. 导出
   * ============================================================ */
  btnDownload.addEventListener('click', function () {
    if (!sourceImg) return;

    var format = exportFormatEl.value;
    var mime = 'image/' + format;
    var ext = format === 'jpeg' ? 'jpg' : format;
    var quality = parseInt(qualityEl.value, 10) / 100;
    var name = (exportNameEl.value || 'filtered').trim().replace(/[\\/:*?"<>|]/g, '_');
    if (!name) name = 'filtered';

    var target = workCanvas;

    // JPEG 必须白底
    if (format === 'jpeg') {
      var tmp = document.createElement('canvas');
      tmp.width = target.width;
      tmp.height = target.height;
      var tCtx = tmp.getContext('2d');
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, tmp.width, tmp.height);
      tCtx.drawImage(target, 0, 0);
      target = tmp;
    }

    var url = target.toDataURL(mime, quality);
    // 浏览器不支持该格式时降级 PNG
    if (url.indexOf('data:' + mime) !== 0) {
      mime = 'image/png';
      ext = 'png';
      url = target.toDataURL('image/png');
    }

    var a = document.createElement('a');
    a.href = url;
    a.download = name + '_' + Date.now() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  /* ============================================================
   * 10. 初始化
   * ============================================================ */
  initNoise();
  buildPresets();
  bindSliders();
  updateLabel('quality');

  // 初始参数显示（未上传图片时也同步一次）
  Object.keys(DEFAULT_PARAMS).forEach(updateLabel);

})();