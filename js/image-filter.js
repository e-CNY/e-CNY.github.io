(function () {
  'use strict';

  /* ============================================================
   * 常量
   * ============================================================ */
  var MAX_DIMENSION = 2400; // 预览最长边限制，防止大图处理卡顿

  /* ============================================================
   * DOM
   * ============================================================ */
  function $(id) { return document.getElementById(id); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  var dropZone = $('drop-zone');
  var fileInput = $('file-input');
  var emptyHint = $('empty-hint');
  var canvas = $('main-canvas');
  var canvasContainer = $('canvas-container') || (canvas && canvas.parentElement) || null;
  var ctx = canvas.getContext('2d');
  var settings = $('settings');
  var presetsGrid = $('presets-grid');
  var imageInfo = $('image-info');
  var toastEl = $('toast');

  var btnReset = $('btn-reset');
  var btnUndo = $('btn-undo');
  var btnRedo = $('btn-redo');
  var btnCompare = $('btn-compare');
  var btnDownload = $('btn-download');
  var exportFormatEl = $('export-format');
  var exportNameEl = $('export-name');
  var exportScaleEl = $('export-scale');

  var EXPORT_QUALITY = 0.92;

  /* ============================================================
   * pica（高清缩放，可选）— window.pica
   * ============================================================ */
  var picaInst = (typeof window.pica === 'function') ? window.pica() : null;

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
    // 新增：光影/色彩
    gamma: 0, fade: 0, hslLight: 0, duotone: 0, threshold: 0, opacity: 100,
    // 新增：特效
    glitch: 0, halftone: 0, tiltshift: 0, vignetteBlur: 0, rainbow: 0, shadowFx: 0,
    // 几何
    rotate: 0, flipH: false, flipV: false
  };

  var PERCENT_KEYS = ['brightness','contrast','saturate','gray','sepia','invert',
    'vignette','noise','clarity','sharpen','emboss','edge','bloom','scanline',
    'fade','duotone','halftone','rainbow','shadowFx','vignetteBlur'];

  var SPECIAL_LABEL = {
    posterize: function (v) { return v <= 1 ? '关闭' : v + ' 级'; },
    pixelate: function (v) { return v < 2 ? '关闭' : v + ' px'; },
    blur: function (v) { return v + ' px'; },
    chromatic: function (v) { return v + ' px'; },
    glitch: function (v) { return v + ' px'; },
    tiltshift: function (v) { return v + ' px'; },
    hue: function (v) { return v + ' °'; },
    gamma: function (v) { return (v >= 0 ? '+' : '') + (v / 100).toFixed(2); }
  };

  /* ============================================================
   * 预设滤镜（完整参数快照）
   * ============================================================ */
  function makePreset(overrides) {
    return Object.assign({}, DEFAULT_PARAMS, overrides || {});
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
    ocean:      { name: '海洋',   params: makePreset({ temp: -30, saturate: 110, brightness: 105, hue: 354 }) },
    neon:       { name: '霓虹',   params: makePreset({ saturate: 200, contrast: 140, hue: 30, bloom: 40, chromatic: 3 }) },
    dreamy:     { name: '梦幻',   params: makePreset({ brightness: 115, contrast: 85, saturate: 90, bloom: 50, vignette: 15 }) },
    noir:       { name: '暗黑',   params: makePreset({ gray: 100, contrast: 150, vignette: 40, noise: 20 }) },
    pastel:     { name: '柔和',   params: makePreset({ saturate: 70, brightness: 115, contrast: 85, temp: 10, bloom: 15 }) },
    ir:         { name: '红外',   params: makePreset({ hue: 180, saturate: 150, contrast: 110 }) },
    sketch:     { name: '素描',   params: makePreset({ gray: 100, edge: 100, contrast: 150, brightness: 110 }) },
    thermal:    { name: '热成像', params: makePreset({ hue: 200, saturate: 200, contrast: 140, redShift: 50, blueShift: -50 }) },
    golden:     { name: '金秋',   params: makePreset({ temp: 50, saturate: 130, contrast: 110, bloom: 20, vignette: 15 }) },
    mint:       { name: '薄荷',   params: makePreset({ temp: -15, tint: -20, saturate: 90, brightness: 110 }) },
    sunsetglow: { name: '晚霞',   params: makePreset({ temp: 60, tint: 30, bloom: 40, brightness: 105 }) },
    // —— 新增预设 ——
    film:       { name: '胶片',   params: makePreset({ fade: 30, noise: 20, sepia: 12, contrast: 108, vignette: 18 }) },
    comic:      { name: '漫画',   params: makePreset({ posterize: 6, edge: 45, saturate: 150, contrast: 130 }) },
    popart:     { name: '波普',   params: makePreset({ posterize: 4, saturate: 190, contrast: 145, hue: 20 }) },
    pixel:      { name: '像素风', params: makePreset({ pixelate: 14, posterize: 12, saturate: 120 }) },
    y2k:        { name: '千禧',   params: makePreset({ saturate: 160, hue: 300, bloom: 35, contrast: 115, rainbow: 20 }) },
    lofi:       { name: '低保真', params: makePreset({ saturate: 80, noise: 30, blur: 0.6, contrast: 95, fade: 15 }) },
    ink:        { name: '水墨',   params: makePreset({ gray: 100, duotone: 40, contrast: 140, clarity: 25 }) },
    sunsetBeach:{ name: '落日海滩', params: makePreset({ temp: 55, tint: 25, saturate: 125, bloom: 25, vignette: 12, fade: 10 }) },
    mist:       { name: '晨雾',   params: makePreset({ brightness: 112, contrast: 88, fade: 25, temp: -8, bloom: 18 }) },
    retroGame:  { name: '复古游戏', params: makePreset({ pixelate: 20, posterize: 8, chromatic: 3, scanline: 40, saturate: 140 }) },
    glitchArt:  { name: '故障艺术', params: makePreset({ glitch: 12, chromatic: 8, hue: 30, saturate: 150, contrast: 120 }) },
    newspaper:  { name: '报纸',   params: makePreset({ gray: 100, threshold: 60, halftone: 40, contrast: 120 }) },
    dreamland:  { name: '梦境',   params: makePreset({ brightness: 110, saturate: 120, hue: 200, bloom: 45, rainbow: 30, vignette: 15 }) },
    tintShadow: { name: '阴影色调', params: makePreset({ shadowFx: 60, fade: 10, contrast: 112, vignette: 15 }) },
    bokeh:      { name: '背景虚化', params: makePreset({ vignetteBlur: 60, bloom: 12, contrast: 105 }) },
    tilt:       { name: '移轴',   params: makePreset({ tiltshift: 6, saturate: 115, contrast: 110, bloom: 10 }) }
  };

  var CUSTOM_PRESET_COUNT = 0;

  /* ============================================================
   * 状态
   * ============================================================ */
  var sourceImg = null;
  var fileName = 'image';
  var origSize = { w: 0, h: 0 };
  var params = Object.assign({}, DEFAULT_PARAMS);
  var currentPreset = 'none';
  var cropMode = false;
  var cropRect = null;     // {x,y,w,h} 原图像素
  var cropDrag = null;
  var compareMode = false;
  var compareTimer = null;

  // 画布
  var baseCanvas = document.createElement('canvas');   // 几何变换并裁切后的原图
  var baseCtx = baseCanvas.getContext('2d');
  var workCanvas = document.createElement('canvas');   // 工作画布
  var workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  var tmpCanvas = document.createElement('canvas');    // 临时画布
  var tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
  var blurCanvas = document.createElement('canvas');   // 模糊专用
  var blurCtx = blurCanvas.getContext('2d');
  var fullCanvas = document.createElement('canvas');   // 全分辨率输出
  var fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });

  // 噪点纹理
  var noiseCanvas = null;

  // 历史
  var history = [];
  var historyIndex = -1;
  var historyTimer = null;

  // 渲染
  var renderPending = false;
  var renderSeq = 0;
  var pipelineBusy = false;
  var pipelineQueued = false;

  /* ============================================================
   * 工具
   * ============================================================ */
  function toast(msg) {
    if (!toastEl) { if (window.console) console.log(msg); return; }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function safeName(s) {
    s = String(s || 'filtered').replace(/[\\/:*?"<>|]/g, '_').trim();
    return s || 'filtered';
  }

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

  /* 半调网点纹理 */
  var halftonePattern = null;
  function getHalftone() {
    if (halftonePattern) return halftonePattern;
    var c = document.createElement('canvas');
    c.width = 6; c.height = 6;
    var cc = c.getContext('2d');
    cc.fillStyle = '#fff';
    cc.fillRect(0, 0, 6, 6);
    cc.fillStyle = '#000';
    cc.beginPath();
    cc.arc(3, 3, 2, 0, Math.PI * 2);
    cc.fill();
    halftonePattern = c;
    return c;
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
  // 整页粘贴图片
  document.addEventListener('paste', function (e) {
    if (!e.clipboardData) return;
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var it = e.clipboardData.items[i];
      if (it.type && it.type.indexOf('image/') === 0) {
        var f = it.getAsFile();
        if (f) handleFile(f);
        break;
      }
    }
  });

  function handleFile(file) {
    if (!file.type || file.type.indexOf('image/') !== 0) { toast('请选择图片文件'); return; }
    fileName = (file.name || 'image').replace(/\.[^.]+$/, '');
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        sourceImg = img;
        origSize = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
        emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        settings.classList.add('active');

        params = Object.assign({}, DEFAULT_PARAMS);
        currentPreset = 'none';
        cropRect = null;
        exitCropMode(true);
        syncUI();
        updateRotateButtons();
        history = [];
        historyIndex = -1;
        pushHistory();
        updateInfo();
        render();
        toast('已载入 ' + origSize.w + '×' + origSize.h + ' 图片');
      };
      img.onerror = function () { toast('图片加载失败，请更换文件'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  function updateInfo() {
    if (!sourceImg) return;
    var b = (baseCanvas.width + ' × ' + baseCanvas.height);
    imageInfo.textContent = cropRect ? ('裁切 ' + Math.round(cropRect.w) + '×' + Math.round(cropRect.h) + ' / 原 ' + origSize.w + '×' + origSize.h)
                                     : (b + ' px / 原 ' + origSize.w + '×' + origSize.h);
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

  function ensureSize(c, w, h) {
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; return true; }
    return false;
  }

  function render() {
    if (!sourceImg) return;
    renderSeq++;

    var iw = sourceImg.naturalWidth || sourceImg.width;
    var ih = sourceImg.naturalHeight || sourceImg.height;
    var rot = params.rotate;
    var base = getBaseGeometry(iw, ih, rot);
    ensureSize(baseCanvas, base.w, base.h);
    drawSourceToBase(base);

    var scale = Math.min(1, MAX_DIMENSION / Math.max(base.w, base.h));
    var outW = Math.max(1, Math.round(base.w * scale));
    var outH = Math.max(1, Math.round(base.h * scale));
    ensureSize(workCanvas, outW, outH);

    var mySeq = renderSeq;
    if (pipelineBusy) { pipelineQueued = true; return; }
    pipelineBusy = true;
    runPipeline(scale, function () {
      pipelineBusy = false;
      if (mySeq !== renderSeq) {           // 期间参数又变了，再跑一次
        pipelineQueued = true;
      }
      if (pipelineQueued) {
        pipelineQueued = false;
        render();
        return;
      }
      if (!compareMode) paintToScreen();
      if (document.getElementById('histogram').classList.contains('active')) drawHistogram();
    });
  }

  /* 裁切 + 旋转 + 翻转后的尺寸 */
  function getBaseGeometry(iw, ih, rot) {
    if (cropRect) {
      var w = Math.max(1, Math.round(cropRect.w));
      var h = Math.max(1, Math.round(cropRect.h));
      return { w: (rot === 90 || rot === 270) ? h : w, h: (rot === 90 || rot === 270) ? w : h, crop: true };
    }
    var scale = Math.min(1, MAX_DIMENSION / Math.max(iw, ih));
    var sw = Math.max(1, Math.round(iw * scale));
    var sh = Math.max(1, Math.round(ih * scale));
    return { w: (rot === 90 || rot === 270) ? sh : sw, h: (rot === 90 || rot === 270) ? sw : sh, crop: false, scale: scale, sw: sw, sh: sh };
  }

  function drawSourceToBase(base) {
    baseCtx.save();
    baseCtx.clearRect(0, 0, base.w, base.h);
    baseCtx.translate(base.w / 2, base.h / 2);
    baseCtx.rotate(params.rotate * Math.PI / 180);
    baseCtx.scale(params.flipH ? -1 : 1, params.flipV ? -1 : 1);
    if (base.crop) {
      var cx = cropRect.x + cropRect.w / 2;
      var cy = cropRect.y + cropRect.h / 2;
      baseCtx.drawImage(sourceImg, cx, cy, cropRect.w, cropRect.h, -cropRect.w / 2, -cropRect.h / 2, cropRect.w, cropRect.h);
    } else {
      baseCtx.drawImage(sourceImg, -base.sw / 2, -base.sh / 2, base.sw, base.sh);
    }
    baseCtx.restore();
  }

  /* 异步管线：每步用 requestAnimationFrame 让出主线程（浏览器无 setImmediate） */
  function runPipeline(scale, done) {
    var p = params;
    workCtx.save();
    workCtx.clearRect(0, 0, workCanvas.width, workCanvas.height);

    var filterStr = 'brightness(' + p.brightness + '%) ' +
                    'contrast(' + p.contrast + '%) ' +
                    'saturate(' + p.saturate + '%) ' +
                    'hue-rotate(' + p.hue + 'deg) ' +
                    'grayscale(' + p.gray + '%) ' +
                    'sepia(' + p.sepia + '%) ' +
                    'invert(' + p.invert + '%) ';
    if (p.blur > 0) filterStr += 'blur(' + p.blur + 'px) ';
    workCtx.filter = filterStr;
    workCtx.drawImage(baseCanvas, 0, 0);
    workCtx.filter = 'none';
    workCtx.restore();

    var needPixel = p.exposure !== 0 || p.highlights !== 0 || p.shadows !== 0 ||
      p.whites !== 0 || p.blacks !== 0 || p.vibrance !== 0 || p.gamma !== 0 ||
      p.fade !== 0 || p.hslLight !== 0 || p.duotone !== 0 || p.threshold !== 0 ||
      p.opacity !== 100 ||
      p.temp !== 0 || p.tint !== 0 ||
      p.redShift !== 0 || p.greenShift !== 0 || p.blueShift !== 0 ||
      p.posterize > 1 || p.shadowFx !== 0;

    step(function () { if (needPixel) applyPixelAdjustments(); })
      .then(function () { if (p.clarity > 0) applyClarity(); })
      .then(function () { if (p.sharpen > 0) applySharpen(); })
      .then(function () { if (p.emboss > 0) applyEmboss(); })
      .then(function () { if (p.edge > 0) applyEdge(); })
      .then(function () { if (p.tiltshift > 0) applyTiltShift(); })
      .then(function () { if (p.glitch > 0) applyGlitch(); })
      .then(function () { if (p.halftone > 0) applyHalftone(); })
      .then(function () { if (p.pixelate >= 2) applyPixelate(); })
      .then(function () { if (p.chromatic > 0) applyChromatic(); })
      .then(function () { if (p.bloom > 0) applyBloom(); })
      .then(function () { applyOverlays(); })
      .then(done);
  }

  function step(fn) {
    return new Promise(function (resolve) {
      var done = false;
      function run() {
        if (done) return;
        done = true;
        try { fn(); } catch (err) { if (window.console) console.error(err); }
        resolve();
      }
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(run);
      } else {
        setTimeout(run, 0);
      }
    });
  }

  function paintToScreen() {
    if (!workCanvas.width || !workCanvas.height) return;
    var sizeChanged = (canvas.width !== workCanvas.width || canvas.height !== workCanvas.height);
    if (sizeChanged) {
      canvas.width = workCanvas.width;
      canvas.height = workCanvas.height;
    }
    canvas.style.display = 'block';
    if (emptyHint) emptyHint.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(workCanvas, 0, 0);
    if (sizeChanged || !canvas.style.width) refreshZoom();
  }

  /* ============================================================
   * 3.1 像素级调整
   * ============================================================ */
  function applyPixelAdjustments() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var p = params;

    // 预计算 256 级色调曲线（曝光 / 高光 / 阴影 / 白阶 / 黑阶 / 灰度系数）
    var needCurve = p.exposure !== 0 || p.highlights !== 0 || p.shadows !== 0 ||
                    p.whites !== 0 || p.blacks !== 0 || p.gamma !== 0;
    var curve = null;
    if (needCurve) {
      curve = new Uint8ClampedArray(256);
      var gammaExp = p.gamma / 100;
      for (var i = 0; i < 256; i++) {
        var v = i;
        if (p.exposure !== 0) v = v * Math.pow(2, p.exposure / 100);
        if (p.shadows !== 0) { var t = 1 - v / 255; v += p.shadows / 100 * t * t * 80; }
        if (p.highlights !== 0) { var t2 = v / 255; v += p.highlights / 100 * t2 * t2 * 80; }
        if (p.whites !== 0) { var t3 = v / 255; v += p.whites / 100 * t3 * t3 * t3 * 90; }
        if (p.blacks !== 0) { var t4 = 1 - v / 255; v += p.blacks / 100 * t4 * t4 * t4 * 90; }
        if (gammaExp !== 0) {
          var gamma = gammaExp > 0 ? (1 - gammaExp * 0.5) : (1 - gammaExp * 0.5);
          gamma = Math.max(0.2, Math.min(2.2, gamma));
          v = Math.pow(v / 255, gamma) * 255;
        }
        curve[i] = clamp(v, 0, 255);
      }
    }

    var postStep = p.posterize > 1 ? 255 / (p.posterize - 1) : 0;
    var usePost = p.posterize > 1;

    var tempR = p.temp / 100 * 40, tempB = -tempR;
    var tintR = p.tint / 100 * 30, tintG = -tintR, tintB = tintR;
    var rShift = p.redShift * 1.5, gShift = p.greenShift * 1.5, bShift = p.blueShift * 1.5;
    var vib = p.vibrance / 100;
    var light = p.hslLight / 100;
    var op = p.opacity / 100;
    var doDuo = p.duotone > 0;
    var duoAmt = p.duotone / 100;
    var doShadow = p.shadowFx !== 0;
    var shAmt = p.shadowFx / 100;
    var doThreshold = p.threshold > 0;
    var thr = p.threshold / 100 * 255;
    var doFade = p.fade > 0 && !doThreshold;
    var fadeAmt = p.fade / 100;

    for (var j = 0; j < data.length; j += 4) {
      var r = curve ? curve[data[j]] : data[j];
      var g = curve ? curve[data[j + 1]] : data[j + 1];
      var b = curve ? curve[data[j + 2]] : data[j + 2];

      if (rShift) r += rShift;
      if (gShift) g += gShift;
      if (bShift) b += bShift;
      if (p.temp !== 0) { r += tempR; b += tempB; }
      if (p.tint !== 0) { r += tintR; g += tintG; b += tintB; }

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

      if (light !== 0) {
        r += light * 90; g += light * 90; b += light * 90;
      }

      if (doShadow) {
        var lumS = r * 0.299 + g * 0.587 + b * 0.114;
        if (shAmt > 0) {
          var tw = clamp(1 - lumS / 90, 0, 1) * shAmt * 0.6;
          r = r * (1 - tw) + 30 * tw; g = g * (1 - tw) + 10 * tw; b = b * (1 - tw) + 90 * tw;
        } else {
          var a2 = clamp((lumS - 165) / 90, 0, 1) * (-shAmt) * 0.6;
          r = r * (1 - a2) + 255 * a2; g = g * (1 - a2) + 225 * a2; b = b * (1 - a2) + 120 * a2;
        }
      }

      if (doDuo) {
        var lumD = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        var sr = 26 + lumD * (240 - 26), sg = 26 + lumD * (235 - 26), sb = 60 + lumD * (200 - 60);
        r = r * (1 - duoAmt) + sr * duoAmt;
        g = g * (1 - duoAmt) + sg * duoAmt;
        b = b * (1 - duoAmt) + sb * duoAmt;
      }

      if (doThreshold) {
        var lumT = r * 0.299 + g * 0.587 + b * 0.114;
        var v2 = lumT >= thr ? 255 : 0;
        r = v2; g = v2; b = v2;
      } else if (doFade) {
        r = r * (1 - fadeAmt) + 255 * fadeAmt;
        g = g * (1 - fadeAmt) + 255 * fadeAmt;
        b = b * (1 - fadeAmt) + 255 * fadeAmt;
      }

      if (usePost) {
        r = Math.round(r / postStep) * postStep;
        g = Math.round(g / postStep) * postStep;
        b = Math.round(b / postStep) * postStep;
      }

      if (op < 1) {
        r = r * op; g = g * op; b = b * op;
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
  function applyClarity() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var radius = Math.max(4, Math.min(w, h) / 200);
    ensureSize(blurCanvas, w, h);
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

  function applySharpen() {
    var w = workCanvas.width, h = workCanvas.height;
    if (w < 3 || h < 3) return;
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

  function applyEmboss() {
    var w = workCanvas.width, h = workCanvas.height;
    if (w < 3 || h < 3) return;
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

  function applyEdge() {
    var w = workCanvas.width, h = workCanvas.height;
    if (w < 3 || h < 3) return;
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

  /* 移轴：上下渐强模糊 */
  function applyTiltShift() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var amount = params.tiltshift;
    ensureSize(blurCanvas, w, h);
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.filter = 'blur(' + Math.max(1, amount) + 'px)';
    blurCtx.drawImage(workCanvas, 0, 0);
    blurCtx.filter = 'none';

    var imgData = workCtx.getImageData(0, 0, w, h);
    var d = imgData.data;
    var bImg = blurCtx.getImageData(0, 0, w, h);
    var bd = bImg.data;
    var band = Math.max(1, h * 0.18);
    for (var y = 0; y < h; y++) {
      var dist = 0;
      if (y < band) dist = (band - y) / band;
      else if (y > h - band) dist = (y - (h - band)) / band;
      if (dist <= 0) continue;
      var a = clamp(dist, 0, 1) * clamp(amount / 8, 0, 1);
      var row = y * w * 4;
      for (var x = 0; x < w; x++) {
        var i = row + x * 4;
        d[i]     = d[i]     * (1 - a) + bd[i]     * a;
        d[i + 1] = d[i + 1] * (1 - a) + bd[i + 1] * a;
        d[i + 2] = d[i + 2] * (1 - a) + bd[i + 2] * a;
      }
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* 故障艺术：横向条带位移 */
  function applyGlitch() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var maxOff = Math.round(params.glitch);
    if (maxOff < 1) return;
    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var src = new Uint8ClampedArray(data);
    var y = 0;
    while (y < h) {
      var bh = 2 + Math.floor(Math.random() * 18);
      if (Math.random() < 0.55) {
        var off = Math.floor((Math.random() * 2 - 1) * maxOff);
        for (var yy = y; yy < Math.min(h, y + bh); yy++) {
          for (var x = 0; x < w; x++) {
            var sx = clamp(x - off, 0, w - 1);
            var di = (yy * w + x) * 4, si = (yy * w + sx) * 4;
            data[di] = src[si]; data[di + 1] = src[si + 1]; data[di + 2] = src[si + 2];
          }
        }
      }
      y += bh;
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* 半调网点 */
  function applyHalftone() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var amt = clamp(params.halftone / 100, 0, 1);
    tmpCanvas.width = w; tmpCanvas.height = h;
    tmpCtx.clearRect(0, 0, w, h);
    tmpCtx.globalAlpha = amt;
    tmpCtx.fillStyle = tmpCtx.createPattern(getHalftone(), 'repeat');
    tmpCtx.fillRect(0, 0, w, h);
    tmpCtx.globalAlpha = 1;
    workCtx.globalCompositeOperation = 'multiply';
    workCtx.drawImage(tmpCanvas, 0, 0);
    workCtx.globalCompositeOperation = 'source-over';
  }

  /* ============================================================
   * 3.3 像素化
   * ============================================================ */
  function applyPixelate() {
    var w = workCanvas.width, h = workCanvas.height;
    var size = Math.round(params.pixelate);
    if (size < 2 || !w || !h) return;

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
    if (offset < 1 || !w || !h) return;

    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var src = new Uint8ClampedArray(data);

    for (var y = 0; y < h; y++) {
      var rowStart = y * w * 4;
      for (var x = 0; x < w; x++) {
        var idx = rowStart + x * 4;
        var rX = clamp(x - offset, 0, w - 1);
        var bX = clamp(x + offset, 0, w - 1);
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
    if (!w || !h) return;

    ensureSize(tmpCanvas, w, h);
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

    ensureSize(blurCanvas, w, h);
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.filter = 'blur(15px)';
    blurCtx.drawImage(tmpCanvas, 0, 0);
    blurCtx.filter = 'none';

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
    if (!w || !h) return;
    var p = params;

    // 暗角
    if (p.vignette > 0) {
      var g = workCtx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.3,
        w / 2, h / 2, Math.max(w, h) * 0.7
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (p.vignette / 100) + ')');
      workCtx.fillStyle = g;
      workCtx.fillRect(0, 0, w, h);
    }

    // 边缘虚化（径向模糊，配合暗角遮罩）
    if (p.vignetteBlur > 0) {
      var br = Math.max(2, Math.min(w, h) * 0.02 * (p.vignetteBlur / 20));
      ensureSize(blurCanvas, w, h);
      blurCtx.clearRect(0, 0, w, h);
      blurCtx.filter = 'blur(' + br + 'px)';
      blurCtx.drawImage(workCanvas, 0, 0);
      blurCtx.filter = 'none';

      var mask = document.createElement('canvas');
      mask.width = w; mask.height = h;
      var mCtx = mask.getContext('2d');
      var mg = mCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      mg.addColorStop(0, 'rgba(0,0,0,0)');
      mg.addColorStop(1, 'rgba(0,0,0,' + clamp(p.vignetteBlur / 100, 0, 1) + ')');
      mCtx.fillStyle = mg;
      mCtx.fillRect(0, 0, w, h);
      mCtx.globalCompositeOperation = 'source-in';
      mCtx.drawImage(blurCanvas, 0, 0);

      workCtx.drawImage(mask, 0, 0);
    }

    // 彩虹漏光
    if (p.rainbow > 0) {
      workCtx.globalAlpha = clamp(p.rainbow / 100, 0, 1) * 0.5;
      var rg = workCtx.createLinearGradient(0, 0, w, h);
      rg.addColorStop(0.00, 'rgba(255,0,0,0.8)');
      rg.addColorStop(0.20, 'rgba(255,150,0,0.8)');
      rg.addColorStop(0.40, 'rgba(255,255,0,0.8)');
      rg.addColorStop(0.60, 'rgba(0,255,120,0.8)');
      rg.addColorStop(0.80, 'rgba(0,120,255,0.8)');
      rg.addColorStop(1.00, 'rgba(150,0,255,0.8)');
      workCtx.fillStyle = rg;
      workCtx.fillRect(0, 0, w, h);
      workCtx.globalAlpha = 1;
    }

    // 噪点
    if (p.noise > 0 && noiseCanvas) {
      workCtx.globalAlpha = p.noise / 100 * 0.6;
      workCtx.globalCompositeOperation = 'overlay';
      workCtx.fillStyle = workCtx.createPattern(noiseCanvas, 'repeat');
      workCtx.fillRect(0, 0, w, h);
      workCtx.globalAlpha = 1;
      workCtx.globalCompositeOperation = 'source-over';
    }

    // 扫描线
    if (p.scanline > 0) {
      var alpha = p.scanline / 100 * 0.35;
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
    if (SPECIAL_LABEL[key]) { el.textContent = SPECIAL_LABEL[key](val); return; }
    var suffix = '';
    if (PERCENT_KEYS.indexOf(key) !== -1) suffix = '%';
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

    on($('export-scale'), 'change', function () { updateExportInfo(); });

    // 旋转按钮
    document.querySelectorAll('.geo-btn[data-rotate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        params.rotate = parseInt(this.dataset.rotate, 10);
        updateRotateButtons();
        exitCropMode(true);
        scheduleRender();
        commitHistory();
      });
    });

    // 重置参数
    on(btnReset, 'click', function () {
      params = Object.assign({}, DEFAULT_PARAMS);
      currentPreset = 'none';
      syncUI();
      scheduleRender();
      commitHistory();
      toast('已重置所有参数');
    });

    // 随机参数
    on($('btn-random'), 'click', function () {
      var keys = ['brightness','contrast','saturate','hue','temp','tint','vibrance','sharpen','vignette','bloom','noise','clarity','fade','gray','sepia','invert'];
      keys.forEach(function (k) {
        var el = document.getElementById('p-' + k);
        if (!el) return;
        var mn = parseFloat(el.min), mx = parseFloat(el.max);
        params[k] = Math.round(mn + Math.random() * (mx - mn));
      });
      currentPreset = 'none';
      syncUI();
      scheduleRender();
      commitHistory();
      toast('已随机生成一组参数');
    });

    // 前后对比
    on($('btn-compare-toggle'), 'click', toggleCompare);
    on(btnCompare, 'pointerdown', function () { if (!compareMode) { compareMode = true; showOriginal(); } });
    on(btnCompare, 'pointerup', endHoldCompare);
    on(btnCompare, 'pointerleave', endHoldCompare);
    on(btnCompare, 'pointercancel', endHoldCompare);

    // 缩放
    on($('btn-zoom-in'), 'click', function () { setZoom(viewScale * 1.2); });
    on($('btn-zoom-out'), 'click', function () { setZoom(viewScale / 1.2); });
    on($('btn-zoom-fit'), 'click', function () { setZoom(1, true); });

    // 裁切
    on($('btn-crop'), 'click', enterCropMode);
    on($('btn-crop-apply'), 'click', applyCrop);
    on($('btn-crop-cancel'), 'click', function () { exitCropMode(true); toast('已取消裁切'); });
    on($('btn-crop-reset'), 'click', function () { cropRect = null; exitCropMode(true); updateInfo(); toast('已恢复完整图片'); });

    // 直方图
    on($('btn-histogram'), 'click', function () {
      var el = $('histogram');
      var show = !el.classList.contains('active');
      el.classList.toggle('active', show);
      this.classList.toggle('active', show);
      if (show) drawHistogram();
    });

    // 预设管理
    on($('btn-save-preset'), 'click', saveCustomPreset);
    on($('btn-export-preset'), 'click', exportPresetFile);
    on($('btn-import-preset'), 'click', function () { $('preset-file').click(); });
    on($('preset-file'), 'change', function () {
      if (this.files && this.files[0]) importPresetFile(this.files[0]);
      this.value = '';
    });
    on($('btn-clear-presets'), 'click', clearCustomPresets);
  }

  function endHoldCompare() {
    if (compareMode && !holdCompareLock) return;
    compareMode = false;
    scheduleRender();
  }
  var holdCompareLock = false;

  function toggleCompare() {
    if (!sourceImg) return;
    compareMode = !compareMode;
    if (compareMode) showOriginal(); else scheduleRender();
    $('btn-compare-toggle').classList.toggle('active', compareMode);
    $('btn-compare-toggle').textContent = compareMode ? '⏱️ 对比中…' : '🔄 前后对比';
  }

  function showOriginal() {
    if (!sourceImg) return;
    var w = baseCanvas.width, h = baseCanvas.height;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      applyZoomStyle();
    }
    canvas.style.display = 'block';
    if (emptyHint) emptyHint.style.display = 'none';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseCanvas, 0, 0);
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
    presetsGrid.textContent = '';
    Object.keys(PRESETS).forEach(function (key) {
      presetsGrid.appendChild(makePresetButton(key, PRESETS[key].name));
    });
    loadCustomPresets().forEach(function (cp) {
      presetsGrid.appendChild(makePresetButton(cp.key, cp.name));
    });
    updatePresetButtons();
  }

  function makePresetButton(key, name) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn' + (key === 'none' ? ' active' : '');
    btn.dataset.preset = key;
    btn.textContent = name;
    btn.title = name;
    btn.addEventListener('click', function () { applyPreset(key); });
    return btn;
  }

  function applyPreset(key) {
    var src = PRESETS[key] || getCustomPreset(key);
    if (!src) return;
    currentPreset = key;
    params = Object.assign({}, src.params);
    syncUI();
    scheduleRender();
    commitHistory();
  }

  var CUSTOM_KEY = 'image-filter:custom-presets';
  function loadCustomPresets() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch (e) { return []; }
  }
  function getCustomPreset(key) {
    var list = loadCustomPresets();
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  function saveCustomPreset() {
    var name = (prompt('给当前参数起个名字：', '我的预设 ' + (++CUSTOM_PRESET_COUNT)) || '').trim();
    if (!name) { CUSTOM_PRESET_COUNT--; return; }
    var list = loadCustomPresets();
    var key = 'custom-' + Date.now();
    list.push({ key: key, name: name, params: Object.assign({}, params) });
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
      presetsGrid.appendChild(makePresetButton(key, name));
      applyPreset(key);
      toast('预设已保存：' + name);
    } catch (e) { toast('保存失败（本地存储不可用）'); }
  }
  function exportPresetFile() {
    var data = JSON.stringify({ name: 'preset', params: params }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    downloadBlob(blob, safeName(exportNameEl.value) + '_preset.json');
    toast('预设已导出');
  }
  function importPresetFile(file) {
    var r = new FileReader();
    r.onload = function (e) {
      try {
        var obj = JSON.parse(e.target.result);
        if (!obj.params) throw new Error('格式不对');
        var list = loadCustomPresets();
        var key = 'custom-' + Date.now();
        list.push({ key: key, name: (obj.name || '导入预设'), params: Object.assign({}, DEFAULT_PARAMS, obj.params) });
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
        buildPresets();
        applyPreset(key);
        toast('预设已导入');
      } catch (err) { toast('预设文件解析失败'); }
    };
    r.readAsText(file);
  }
  function clearCustomPresets() {
    try { localStorage.removeItem(CUSTOM_KEY); } catch (e) {}
    buildPresets();
    toast('自定义预设已清空');
  }

  /* ============================================================
   * 6. 历史记录
   * ============================================================ */
  function pushHistory() {
    var snapshot = JSON.stringify({ params: params, crop: cropRect });
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

  function restoreSnapshot(idx) {
    if (!sourceImg) return;
    try {
      var snap = JSON.parse(history[idx]);
      params = Object.assign({}, DEFAULT_PARAMS, snap.params || {});
      cropRect = snap.crop || null;
    } catch (e) { return; }
    currentPreset = 'none';
    syncUI();
    scheduleRender();
    updateHistoryButtons();
    updateInfo();
  }

  btnUndo.addEventListener('click', function () {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreSnapshot(historyIndex);
  });

  btnRedo.addEventListener('click', function () {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreSnapshot(historyIndex);
  });

  /* ============================================================
   * 7. 裁切
   * ============================================================ */
  function getNaturalBaseSize() {
    var iw = sourceImg.naturalWidth || sourceImg.width;
    var ih = sourceImg.naturalHeight || sourceImg.height;
    var rot = params.rotate;
    return { w: (rot === 90 || rot === 270) ? ih : iw, h: (rot === 90 || rot === 270) ? iw : ih };
  }

  function enterCropMode() {
    if (!sourceImg) { toast('请先上传图片'); return; }
    var nb = getNaturalBaseSize();
    var startW = cropRect ? cropRect.w : nb.w * 0.8;
    var startH = cropRect ? cropRect.h : nb.h * 0.8;
    if (!cropRect) {
      cropRect = { x: (nb.w - startW) / 2, y: (nb.h - startH) / 2, w: startW, h: startH };
    }
    cropMode = true;
    $('crop-bar').style.display = 'flex';
    $('btn-crop').classList.add('active');
    canvas.classList.add('crop-mode');
    updateCropOverlay();
    scheduleRender();
    toast('拖动调整裁切框，再点「应用裁切」');
  }

  function exitCropMode(keepRect) {
    cropMode = false;
    var bar = $('crop-bar');
    if (bar) bar.style.display = 'none';
    $('btn-crop').classList.remove('active');
    canvas.classList.remove('crop-mode');
    if (!keepRect) cropRect = null;
    updateCropOverlay();
    scheduleRender();
  }

  function applyCrop() {
    if (!cropRect) return;
    if (cropRect.w < 5 || cropRect.h < 5) { toast('裁切区域太小'); return; }
    cropMode = false;
    $('crop-bar').style.display = 'none';
    $('btn-crop').classList.remove('active');
    canvas.classList.remove('crop-mode');
    updateCropOverlay();
    commitHistory();
    updateInfo();
    scheduleRender();
    toast('已应用裁切 ' + Math.round(cropRect.w) + '×' + Math.round(cropRect.h));
  }

  function updateCropOverlay() {
    var host = $('canvas-container');
    var overlay = $('crop-overlay');
    var box = $('crop-box');
    if (!host || !overlay || !box) return;
    if (!cropMode || !cropRect) { overlay.style.display = 'none'; return; }
    overlay.style.display = 'block';
    var cr = canvas.getBoundingClientRect();
    var hr = host.getBoundingClientRect();
    var scale = (canvas.width && cr.width) ? (cr.width / canvas.width) : 1;
    var dispW = cropRect.w * scale, dispH = cropRect.h * scale;
    var base = getNaturalBaseSize();
    var offX = ((base.w - cropRect.w) * scale) * ((canvas.width ? (cr.width / canvas.width) : 1) / Math.max(1e-6, scale)) ;
    var shownW = canvas.width * scale;
    var shownH = canvas.height * scale;
    var left = cr.left - hr.left + host.scrollLeft + (cropRect.x / (base.w || 1)) * shownW;
    var top = cr.top - hr.top + host.scrollTop + (cropRect.y / (base.h || 1)) * shownH;
    box.style.width = Math.max(4, dispW) + 'px';
    box.style.height = Math.max(4, dispH) + 'px';
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    var g = $('crop-size-label');
    if (g) g.textContent = Math.round(cropRect.w) + ' × ' + Math.round(cropRect.h) + ' px';
  }

  /* 裁切框交互 */
  (function bindCropDrag() {
    var overlay = $('crop-overlay');
    if (!overlay) return;
    function pt(e) {
      var t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return { x: t.clientX, y: t.clientY };
    }
    overlay.addEventListener('pointerdown', function (e) {
      if (!cropMode || !cropRect) return;
      e.preventDefault();
      var p = pt(e);
      var box = $('crop-box').getBoundingClientRect();
      var edge = 12;
      var mode = 'move';
      if (p.x < box.left + edge) mode = 'w';
      else if (p.x > box.right - edge) mode = 'e';
      if (p.y < box.top + edge) mode = (mode === 'move' ? 'n' : mode + 'n');
      else if (p.y > box.bottom - edge) mode = (mode === 'move' ? 's' : mode + 's');
      var cr = canvas.getBoundingClientRect();
      var scaleX = (cr.width / canvas.width) || 1;
      var scaleY = (cr.height / canvas.height) || 1;
      cropDrag = { mode: mode, start: p, rect: Object.assign({}, cropRect), sx: scaleX, sy: scaleY };
      try { overlay.setPointerCapture(e.pointerId); } catch (err) {}
    });
    overlay.addEventListener('pointermove', function (e) {
      if (!cropDrag) return;
      e.preventDefault();
      var p = pt(e);
      var dx = (p.x - cropDrag.start.x) / cropDrag.sx;
      var dy = (p.y - cropDrag.start.y) / cropDrag.sy;
      var r = cropDrag.rect;
      var nb = getNaturalBaseSize();
      var m = cropDrag.mode;
      var nr = Object.assign({}, r);
      if (m === 'move') { nr.x = r.x + dx; nr.y = r.y + dy; }
      else {
        if (m.indexOf('w') >= 0) { nr.x = r.x + dx; nr.w = r.w - dx; }
        if (m.indexOf('e') >= 0) { nr.w = r.w + dx; }
        if (m.indexOf('n') >= 0) { nr.y = r.y + dy; nr.h = r.h - dy; }
        if (m.indexOf('s') >= 0) { nr.h = r.h + dy; }
      }
      if (nr.w < 10 || nr.h < 10) return;
      nr.x = clamp(nr.x, 0, Math.max(0, nb.w - 5));
      nr.y = clamp(nr.y, 0, Math.max(0, nb.h - 5));
      nr.w = Math.min(nr.w, nb.w - nr.x);
      nr.h = Math.min(nr.h, nb.h - nr.y);
      cropRect = nr;
      updateCropOverlay();
    });
    function end() { cropDrag = null; }
    overlay.addEventListener('pointerup', end);
    overlay.addEventListener('pointercancel', end);
    overlay.addEventListener('pointerleave', function () { if (cropDrag) cropDrag = null; });
  })();

  window.addEventListener('resize', function () { if (cropMode) updateCropOverlay(); });
  on($('canvas-container'), 'scroll', function () { if (cropMode) updateCropOverlay(); });

  /* ============================================================
   * 8. 视图缩放
   * ============================================================ */
  var viewScale = 1, fitMode = true, manualScale = 1, fitScale = 1;
  function setZoom(v, fit) {
    if (!sourceImg) return;
    if (fit || !isFinite(v)) {
      fitMode = true;
      manualScale = 1;
    } else {
      manualScale = clamp(v, 0.05, 6);
      fitMode = false;
    }
    applyZoomStyle();
    if (cropMode) updateCropOverlay();
  }

  /* 自适应比例：只缩小不放大；画布未就绪时保守取 1，等渲染完成后刷新 */
  function computeFitScale() {
    var availW = (canvasContainer.clientWidth || 0) - 24;
    var availH = (canvasContainer.clientHeight || 0) - 24;
    if (!canvas.width || !canvas.height || availW <= 0 || availH <= 0) return 1;
    return clamp(Math.min(availW / canvas.width, availH / canvas.height), 0.05, 1);
  }

  /* 把缩放真正写到画布样式上：高度始终 auto，避免比例失真导致看不到图 */
  function applyZoomStyle() {
    if (!canvas.width || !canvas.height) return;
    if (fitMode) {
      fitScale = computeFitScale();
      viewScale = fitScale;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.width = 'auto';
      canvas.style.height = 'auto';
    } else {
      viewScale = manualScale;
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';
      canvas.style.width = (canvas.width * viewScale) + 'px';
      canvas.style.height = 'auto';
    }
    var lab = $('zoom-label');
    if (lab) lab.textContent = Math.round(viewScale * 100) + '%';
    if (cropMode) updateCropOverlay();
  }

  /* 画布尺寸变化或容器尺寸变化后，重新套用当前缩放模式 */
  function refreshZoom() {
    if (!sourceImg) return;
    if (fitMode) { fitScale = computeFitScale(); applyZoomStyle(); }
    else applyZoomStyle();
  }

  /* ============================================================
   * 3.1 像素级调整
   * ============================================================ */
  function applyPixelAdjustments() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var p = params;

    // 预计算 256 级色调曲线（曝光 / 高光 / 阴影 / 白阶 / 黑阶 / 灰度系数）
    var needCurve = p.exposure !== 0 || p.highlights !== 0 || p.shadows !== 0 ||
                    p.whites !== 0 || p.blacks !== 0 || p.gamma !== 0;
    var curve = null;
    if (needCurve) {
      curve = new Uint8ClampedArray(256);
      var gammaExp = p.gamma / 100;
      for (var i = 0; i < 256; i++) {
        var v = i;
        if (p.exposure !== 0) v = v * Math.pow(2, p.exposure / 100);
        if (p.shadows !== 0) { var t = 1 - v / 255; v += p.shadows / 100 * t * t * 80; }
        if (p.highlights !== 0) { var t2 = v / 255; v += p.highlights / 100 * t2 * t2 * 80; }
        if (p.whites !== 0) { var t3 = v / 255; v += p.whites / 100 * t3 * t3 * t3 * 90; }
        if (p.blacks !== 0) { var t4 = 1 - v / 255; v += p.blacks / 100 * t4 * t4 * t4 * 90; }
        if (gammaExp !== 0) {
          var gamma = gammaExp > 0 ? (1 - gammaExp * 0.5) : (1 - gammaExp * 0.5);
          gamma = Math.max(0.2, Math.min(2.2, gamma));
          v = Math.pow(v / 255, gamma) * 255;
        }
        curve[i] = clamp(v, 0, 255);
      }
    }

    var postStep = p.posterize > 1 ? 255 / (p.posterize - 1) : 0;
    var usePost = p.posterize > 1;

    var tempR = p.temp / 100 * 40, tempB = -tempR;
    var tintR = p.tint / 100 * 30, tintG = -tintR, tintB = tintR;
    var rShift = p.redShift * 1.5, gShift = p.greenShift * 1.5, bShift = p.blueShift * 1.5;
    var vib = p.vibrance / 100;
    var light = p.hslLight / 100;
    var op = p.opacity / 100;
    var doDuo = p.duotone > 0;
    var duoAmt = p.duotone / 100;
    var doShadow = p.shadowFx !== 0;
    var shAmt = p.shadowFx / 100;
    var doThreshold = p.threshold > 0;
    var thr = p.threshold / 100 * 255;
    var doFade = p.fade > 0 && !doThreshold;
    var fadeAmt = p.fade / 100;

    for (var j = 0; j < data.length; j += 4) {
      var r = curve ? curve[data[j]] : data[j];
      var g = curve ? curve[data[j + 1]] : data[j + 1];
      var b = curve ? curve[data[j + 2]] : data[j + 2];

      if (rShift) r += rShift;
      if (gShift) g += gShift;
      if (bShift) b += bShift;
      if (p.temp !== 0) { r += tempR; b += tempB; }
      if (p.tint !== 0) { r += tintR; g += tintG; b += tintB; }

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

      if (light !== 0) {
        r += light * 90; g += light * 90; b += light * 90;
      }

      if (doShadow) {
        var lumS = r * 0.299 + g * 0.587 + b * 0.114;
        if (shAmt > 0) {
          var tw = clamp(1 - lumS / 90, 0, 1) * shAmt * 0.6;
          r = r * (1 - tw) + 30 * tw; g = g * (1 - tw) + 10 * tw; b = b * (1 - tw) + 90 * tw;
        } else {
          var a2 = clamp((lumS - 165) / 90, 0, 1) * (-shAmt) * 0.6;
          r = r * (1 - a2) + 255 * a2; g = g * (1 - a2) + 225 * a2; b = b * (1 - a2) + 120 * a2;
        }
      }

      if (doDuo) {
        var lumD = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        var sr = 26 + lumD * (240 - 26), sg = 26 + lumD * (235 - 26), sb = 60 + lumD * (200 - 60);
        r = r * (1 - duoAmt) + sr * duoAmt;
        g = g * (1 - duoAmt) + sg * duoAmt;
        b = b * (1 - duoAmt) + sb * duoAmt;
      }

      if (doThreshold) {
        var lumT = r * 0.299 + g * 0.587 + b * 0.114;
        var v2 = lumT >= thr ? 255 : 0;
        r = v2; g = v2; b = v2;
      } else if (doFade) {
        r = r * (1 - fadeAmt) + 255 * fadeAmt;
        g = g * (1 - fadeAmt) + 255 * fadeAmt;
        b = b * (1 - fadeAmt) + 255 * fadeAmt;
      }

      if (usePost) {
        r = Math.round(r / postStep) * postStep;
        g = Math.round(g / postStep) * postStep;
        b = Math.round(b / postStep) * postStep;
      }

      if (op < 1) {
        r = r * op; g = g * op; b = b * op;
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
  function applyClarity() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var radius = Math.max(4, Math.min(w, h) / 200);
    ensureSize(blurCanvas, w, h);
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

  function applySharpen() {
    var w = workCanvas.width, h = workCanvas.height;
    if (w < 3 || h < 3) return;
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

  function applyEmboss() {
    var w = workCanvas.width, h = workCanvas.height;
    if (w < 3 || h < 3) return;
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

  function applyEdge() {
    var w = workCanvas.width, h = workCanvas.height;
    if (w < 3 || h < 3) return;
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

  /* 移轴：上下渐强模糊 */
  function applyTiltShift() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var amount = params.tiltshift;
    ensureSize(blurCanvas, w, h);
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.filter = 'blur(' + Math.max(1, amount) + 'px)';
    blurCtx.drawImage(workCanvas, 0, 0);
    blurCtx.filter = 'none';

    var imgData = workCtx.getImageData(0, 0, w, h);
    var d = imgData.data;
    var bImg = blurCtx.getImageData(0, 0, w, h);
    var bd = bImg.data;
    var band = Math.max(1, h * 0.18);
    for (var y = 0; y < h; y++) {
      var dist = 0;
      if (y < band) dist = (band - y) / band;
      else if (y > h - band) dist = (y - (h - band)) / band;
      if (dist <= 0) continue;
      var a = clamp(dist, 0, 1) * clamp(amount / 8, 0, 1);
      var row = y * w * 4;
      for (var x = 0; x < w; x++) {
        var i = row + x * 4;
        d[i]     = d[i]     * (1 - a) + bd[i]     * a;
        d[i + 1] = d[i + 1] * (1 - a) + bd[i + 1] * a;
        d[i + 2] = d[i + 2] * (1 - a) + bd[i + 2] * a;
      }
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* 故障艺术：横向条带位移 */
  function applyGlitch() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var maxOff = Math.round(params.glitch);
    if (maxOff < 1) return;
    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var src = new Uint8ClampedArray(data);
    var y = 0;
    while (y < h) {
      var bh = 2 + Math.floor(Math.random() * 18);
      if (Math.random() < 0.55) {
        var off = Math.floor((Math.random() * 2 - 1) * maxOff);
        for (var yy = y; yy < Math.min(h, y + bh); yy++) {
          for (var x = 0; x < w; x++) {
            var sx = clamp(x - off, 0, w - 1);
            var di = (yy * w + x) * 4, si = (yy * w + sx) * 4;
            data[di] = src[si]; data[di + 1] = src[si + 1]; data[di + 2] = src[si + 2];
          }
        }
      }
      y += bh;
    }
    workCtx.putImageData(imgData, 0, 0);
  }

  /* 半调网点 */
  function applyHalftone() {
    var w = workCanvas.width, h = workCanvas.height;
    if (!w || !h) return;
    var amt = clamp(params.halftone / 100, 0, 1);
    tmpCanvas.width = w; tmpCanvas.height = h;
    tmpCtx.clearRect(0, 0, w, h);
    tmpCtx.globalAlpha = amt;
    tmpCtx.fillStyle = tmpCtx.createPattern(getHalftone(), 'repeat');
    tmpCtx.fillRect(0, 0, w, h);
    tmpCtx.globalAlpha = 1;
    workCtx.globalCompositeOperation = 'multiply';
    workCtx.drawImage(tmpCanvas, 0, 0);
    workCtx.globalCompositeOperation = 'source-over';
  }

  /* ============================================================
   * 3.3 像素化
   * ============================================================ */
  function applyPixelate() {
    var w = workCanvas.width, h = workCanvas.height;
    var size = Math.round(params.pixelate);
    if (size < 2 || !w || !h) return;

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
    if (offset < 1 || !w || !h) return;

    var imgData = workCtx.getImageData(0, 0, w, h);
    var data = imgData.data;
    var src = new Uint8ClampedArray(data);

    for (var y = 0; y < h; y++) {
      var rowStart = y * w * 4;
      for (var x = 0; x < w; x++) {
        var idx = rowStart + x * 4;
        var rX = clamp(x - offset, 0, w - 1);
        var bX = clamp(x + offset, 0, w - 1);
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
    if (!w || !h) return;

    ensureSize(tmpCanvas, w, h);
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

    ensureSize(blurCanvas, w, h);
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.filter = 'blur(15px)';
    blurCtx.drawImage(tmpCanvas, 0, 0);
    blurCtx.filter = 'none';

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
    if (!w || !h) return;
    var p = params;

    // 暗角
    if (p.vignette > 0) {
      var g = workCtx.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.3,
        w / 2, h / 2, Math.max(w, h) * 0.7
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (p.vignette / 100) + ')');
      workCtx.fillStyle = g;
      workCtx.fillRect(0, 0, w, h);
    }

    // 边缘虚化（径向模糊，配合暗角遮罩）
    if (p.vignetteBlur > 0) {
      var br = Math.max(2, Math.min(w, h) * 0.02 * (p.vignetteBlur / 20));
      ensureSize(blurCanvas, w, h);
      blurCtx.clearRect(0, 0, w, h);
      blurCtx.filter = 'blur(' + br + 'px)';
      blurCtx.drawImage(workCanvas, 0, 0);
      blurCtx.filter = 'none';

      var mask = document.createElement('canvas');
      mask.width = w; mask.height = h;
      var mCtx = mask.getContext('2d');
      var mg = mCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      mg.addColorStop(0, 'rgba(0,0,0,0)');
      mg.addColorStop(1, 'rgba(0,0,0,' + clamp(p.vignetteBlur / 100, 0, 1) + ')');
      mCtx.fillStyle = mg;
      mCtx.fillRect(0, 0, w, h);
      mCtx.globalCompositeOperation = 'source-in';
      mCtx.drawImage(blurCanvas, 0, 0);

      workCtx.drawImage(mask, 0, 0);
    }

    // 彩虹漏光
    if (p.rainbow > 0) {
      workCtx.globalAlpha = clamp(p.rainbow / 100, 0, 1) * 0.5;
      var rg = workCtx.createLinearGradient(0, 0, w, h);
      rg.addColorStop(0.00, 'rgba(255,0,0,0.8)');
      rg.addColorStop(0.20, 'rgba(255,150,0,0.8)');
      rg.addColorStop(0.40, 'rgba(255,255,0,0.8)');
      rg.addColorStop(0.60, 'rgba(0,255,120,0.8)');
      rg.addColorStop(0.80, 'rgba(0,120,255,0.8)');
      rg.addColorStop(1.00, 'rgba(150,0,255,0.8)');
      workCtx.fillStyle = rg;
      workCtx.fillRect(0, 0, w, h);
      workCtx.globalAlpha = 1;
    }

    // 噪点
    if (p.noise > 0 && noiseCanvas) {
      workCtx.globalAlpha = p.noise / 100 * 0.6;
      workCtx.globalCompositeOperation = 'overlay';
      workCtx.fillStyle = workCtx.createPattern(noiseCanvas, 'repeat');
      workCtx.fillRect(0, 0, w, h);
      workCtx.globalAlpha = 1;
      workCtx.globalCompositeOperation = 'source-over';
    }

    // 扫描线
    if (p.scanline > 0) {
      var alpha = p.scanline / 100 * 0.35;
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
    if (SPECIAL_LABEL[key]) { el.textContent = SPECIAL_LABEL[key](val); return; }
    var suffix = '';
    if (PERCENT_KEYS.indexOf(key) !== -1) suffix = '%';
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

    on($('export-scale'), 'change', function () { updateExportInfo(); });

    // 旋转按钮
    document.querySelectorAll('.geo-btn[data-rotate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        params.rotate = parseInt(this.dataset.rotate, 10);
        updateRotateButtons();
        exitCropMode(true);
        scheduleRender();
        commitHistory();
      });
    });

    // 重置参数
    on(btnReset, 'click', function () {
      params = Object.assign({}, DEFAULT_PARAMS);
      currentPreset = 'none';
      syncUI();
      scheduleRender();
      commitHistory();
      toast('已重置所有参数');
    });

    // 随机参数
    on($('btn-random'), 'click', function () {
      var keys = ['brightness','contrast','saturate','hue','temp','tint','vibrance','sharpen','vignette','bloom','noise','clarity','fade','gray','sepia','invert'];
      keys.forEach(function (k) {
        var el = document.getElementById('p-' + k);
        if (!el) return;
        var mn = parseFloat(el.min), mx = parseFloat(el.max);
        params[k] = Math.round(mn + Math.random() * (mx - mn));
      });
      currentPreset = 'none';
      syncUI();
      scheduleRender();
      commitHistory();
      toast('已随机生成一组参数');
    });

    // 前后对比
    on($('btn-compare-toggle'), 'click', toggleCompare);
    on(btnCompare, 'pointerdown', function () { if (!compareMode) { compareMode = true; showOriginal(); } });
    on(btnCompare, 'pointerup', endHoldCompare);
    on(btnCompare, 'pointerleave', endHoldCompare);
    on(btnCompare, 'pointercancel', endHoldCompare);

    // 缩放
    on($('btn-zoom-in'), 'click', function () { setZoom(viewScale * 1.2); });
    on($('btn-zoom-out'), 'click', function () { setZoom(viewScale / 1.2); });
    on($('btn-zoom-fit'), 'click', function () { setZoom(1, true); });

    // 裁切
    on($('btn-crop'), 'click', enterCropMode);
    on($('btn-crop-apply'), 'click', applyCrop);
    on($('btn-crop-cancel'), 'click', function () { exitCropMode(true); toast('已取消裁切'); });
    on($('btn-crop-reset'), 'click', function () { cropRect = null; exitCropMode(true); updateInfo(); toast('已恢复完整图片'); });

    // 直方图
    on($('btn-histogram'), 'click', function () {
      var el = $('histogram');
      var show = !el.classList.contains('active');
      el.classList.toggle('active', show);
      this.classList.toggle('active', show);
      if (show) drawHistogram();
    });

    // 预设管理
    on($('btn-save-preset'), 'click', saveCustomPreset);
    on($('btn-export-preset'), 'click', exportPresetFile);
    on($('btn-import-preset'), 'click', function () { $('preset-file').click(); });
    on($('preset-file'), 'change', function () {
      if (this.files && this.files[0]) importPresetFile(this.files[0]);
      this.value = '';
    });
    on($('btn-clear-presets'), 'click', clearCustomPresets);
  }

  function endHoldCompare() {
    if (compareMode && !holdCompareLock) return;
    compareMode = false;
    scheduleRender();
  }
  var holdCompareLock = false;

  function toggleCompare() {
    if (!sourceImg) return;
    compareMode = !compareMode;
    if (compareMode) showOriginal(); else scheduleRender();
    $('btn-compare-toggle').classList.toggle('active', compareMode);
    $('btn-compare-toggle').textContent = compareMode ? '⏱️ 对比中…' : '🔄 前后对比';
  }

  function showOriginal() {
    if (!sourceImg) return;
    var w = baseCanvas.width, h = baseCanvas.height;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      applyZoomStyle();
    }
    canvas.style.display = 'block';
    if (emptyHint) emptyHint.style.display = 'none';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseCanvas, 0, 0);
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
    presetsGrid.textContent = '';
    Object.keys(PRESETS).forEach(function (key) {
      presetsGrid.appendChild(makePresetButton(key, PRESETS[key].name));
    });
    loadCustomPresets().forEach(function (cp) {
      presetsGrid.appendChild(makePresetButton(cp.key, cp.name));
    });
    updatePresetButtons();
  }

  function makePresetButton(key, name) {
    var btn = document.createElement('button');
    btn.className = 'preset-btn' + (key === 'none' ? ' active' : '');
    btn.dataset.preset = key;
    btn.textContent = name;
    btn.title = name;
    btn.addEventListener('click', function () { applyPreset(key); });
    return btn;
  }

  function applyPreset(key) {
    var src = PRESETS[key] || getCustomPreset(key);
    if (!src) return;
    currentPreset = key;
    params = Object.assign({}, src.params);
    syncUI();
    scheduleRender();
    commitHistory();
  }

  var CUSTOM_KEY = 'image-filter:custom-presets';
  function loadCustomPresets() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch (e) { return []; }
  }
  function getCustomPreset(key) {
    var list = loadCustomPresets();
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  function saveCustomPreset() {
    var name = (prompt('给当前参数起个名字：', '我的预设 ' + (++CUSTOM_PRESET_COUNT)) || '').trim();
    if (!name) { CUSTOM_PRESET_COUNT--; return; }
    var list = loadCustomPresets();
    var key = 'custom-' + Date.now();
    list.push({ key: key, name: name, params: Object.assign({}, params) });
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
      presetsGrid.appendChild(makePresetButton(key, name));
      applyPreset(key);
      toast('预设已保存：' + name);
    } catch (e) { toast('保存失败（本地存储不可用）'); }
  }
  function exportPresetFile() {
    var data = JSON.stringify({ name: 'preset', params: params }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    downloadBlob(blob, safeName(exportNameEl.value) + '_preset.json');
    toast('预设已导出');
  }
  function importPresetFile(file) {
    var r = new FileReader();
    r.onload = function (e) {
      try {
        var obj = JSON.parse(e.target.result);
        if (!obj.params) throw new Error('格式不对');
        var list = loadCustomPresets();
        var key = 'custom-' + Date.now();
        list.push({ key: key, name: (obj.name || '导入预设'), params: Object.assign({}, DEFAULT_PARAMS, obj.params) });
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
        buildPresets();
        applyPreset(key);
        toast('预设已导入');
      } catch (err) { toast('预设文件解析失败'); }
    };
    r.readAsText(file);
  }
  function clearCustomPresets() {
    try { localStorage.removeItem(CUSTOM_KEY); } catch (e) {}
    buildPresets();
    toast('自定义预设已清空');
  }

  /* ============================================================
   * 6. 历史记录
   * ============================================================ */
  function pushHistory() {
    var snapshot = JSON.stringify({ params: params, crop: cropRect });
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

  function restoreSnapshot(idx) {
    if (!sourceImg) return;
    try {
      var snap = JSON.parse(history[idx]);
      params = Object.assign({}, DEFAULT_PARAMS, snap.params || {});
      cropRect = snap.crop || null;
    } catch (e) { return; }
    currentPreset = 'none';
    syncUI();
    scheduleRender();
    updateHistoryButtons();
    updateInfo();
  }

  btnUndo.addEventListener('click', function () {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreSnapshot(historyIndex);
  });

  btnRedo.addEventListener('click', function () {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreSnapshot(historyIndex);
  });

  /* ============================================================
   * 7. 裁切
   * ============================================================ */
  function getNaturalBaseSize() {
    var iw = sourceImg.naturalWidth || sourceImg.width;
    var ih = sourceImg.naturalHeight || sourceImg.height;
    var rot = params.rotate;
    return { w: (rot === 90 || rot === 270) ? ih : iw, h: (rot === 90 || rot === 270) ? iw : ih };
  }

  function enterCropMode() {
    if (!sourceImg) { toast('请先上传图片'); return; }
    var nb = getNaturalBaseSize();
    var startW = cropRect ? cropRect.w : nb.w * 0.8;
    var startH = cropRect ? cropRect.h : nb.h * 0.8;
    if (!cropRect) {
      cropRect = { x: (nb.w - startW) / 2, y: (nb.h - startH) / 2, w: startW, h: startH };
    }
    cropMode = true;
    $('crop-bar').style.display = 'flex';
    $('btn-crop').classList.add('active');
    canvas.classList.add('crop-mode');
    updateCropOverlay();
    scheduleRender();
    toast('拖动调整裁切框，再点「应用裁切」');
  }

  function exitCropMode(keepRect) {
    cropMode = false;
    var bar = $('crop-bar');
    if (bar) bar.style.display = 'none';
    $('btn-crop').classList.remove('active');
    canvas.classList.remove('crop-mode');
    if (!keepRect) cropRect = null;
    updateCropOverlay();
    scheduleRender();
  }

  function applyCrop() {
    if (!cropRect) return;
    if (cropRect.w < 5 || cropRect.h < 5) { toast('裁切区域太小'); return; }
    cropMode = false;
    $('crop-bar').style.display = 'none';
    $('btn-crop').classList.remove('active');
    canvas.classList.remove('crop-mode');
    updateCropOverlay();
    commitHistory();
    updateInfo();
    scheduleRender();
    toast('已应用裁切 ' + Math.round(cropRect.w) + '×' + Math.round(cropRect.h));
  }

  function updateCropOverlay() {
    var host = $('canvas-container');
    var overlay = $('crop-overlay');
    var box = $('crop-box');
    if (!host || !overlay || !box) return;
    if (!cropMode || !cropRect) { overlay.style.display = 'none'; return; }
    overlay.style.display = 'block';
    var cr = canvas.getBoundingClientRect();
    var hr = host.getBoundingClientRect();
    var scale = (canvas.width && cr.width) ? (cr.width / canvas.width) : 1;
    var dispW = cropRect.w * scale, dispH = cropRect.h * scale;
    var base = getNaturalBaseSize();
    var offX = ((base.w - cropRect.w) * scale) * ((canvas.width ? (cr.width / canvas.width) : 1) / Math.max(1e-6, scale)) ;
    var shownW = canvas.width * scale;
    var shownH = canvas.height * scale;
    var left = cr.left - hr.left + host.scrollLeft + (cropRect.x / (base.w || 1)) * shownW;
    var top = cr.top - hr.top + host.scrollTop + (cropRect.y / (base.h || 1)) * shownH;
    box.style.width = Math.max(4, dispW) + 'px';
    box.style.height = Math.max(4, dispH) + 'px';
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    var g = $('crop-size-label');
    if (g) g.textContent = Math.round(cropRect.w) + ' × ' + Math.round(cropRect.h) + ' px';
  }

  /* 裁切框交互 */
  (function bindCropDrag() {
    var overlay = $('crop-overlay');
    if (!overlay) return;
    function pt(e) {
      var t = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return { x: t.clientX, y: t.clientY };
    }
    overlay.addEventListener('pointerdown', function (e) {
      if (!cropMode || !cropRect) return;
      e.preventDefault();
      var p = pt(e);
      var box = $('crop-box').getBoundingClientRect();
      var edge = 12;
      var mode = 'move';
      if (p.x < box.left + edge) mode = 'w';
      else if (p.x > box.right - edge) mode = 'e';
      if (p.y < box.top + edge) mode = (mode === 'move' ? 'n' : mode + 'n');
      else if (p.y > box.bottom - edge) mode = (mode === 'move' ? 's' : mode + 's');
      var cr = canvas.getBoundingClientRect();
      var scaleX = (cr.width / canvas.width) || 1;
      var scaleY = (cr.height / canvas.height) || 1;
      cropDrag = { mode: mode, start: p, rect: Object.assign({}, cropRect), sx: scaleX, sy: scaleY };
      try { overlay.setPointerCapture(e.pointerId); } catch (err) {}
    });
    overlay.addEventListener('pointermove', function (e) {
      if (!cropDrag) return;
      e.preventDefault();
      var p = pt(e);
      var dx = (p.x - cropDrag.start.x) / cropDrag.sx;
      var dy = (p.y - cropDrag.start.y) / cropDrag.sy;
      var r = cropDrag.rect;
      var nb = getNaturalBaseSize();
      var m = cropDrag.mode;
      var nr = Object.assign({}, r);
      if (m === 'move') { nr.x = r.x + dx; nr.y = r.y + dy; }
      else {
        if (m.indexOf('w') >= 0) { nr.x = r.x + dx; nr.w = r.w - dx; }
        if (m.indexOf('e') >= 0) { nr.w = r.w + dx; }
        if (m.indexOf('n') >= 0) { nr.y = r.y + dy; nr.h = r.h - dy; }
        if (m.indexOf('s') >= 0) { nr.h = r.h + dy; }
      }
      if (nr.w < 10 || nr.h < 10) return;
      nr.x = clamp(nr.x, 0, Math.max(0, nb.w - 5));
      nr.y = clamp(nr.y, 0, Math.max(0, nb.h - 5));
      nr.w = Math.min(nr.w, nb.w - nr.x);
      nr.h = Math.min(nr.h, nb.h - nr.y);
      cropRect = nr;
      updateCropOverlay();
    });
    function end() { cropDrag = null; }
    overlay.addEventListener('pointerup', end);
    overlay.addEventListener('pointercancel', end);
    overlay.addEventListener('pointerleave', function () { if (cropDrag) cropDrag = null; });
  })();

  window.addEventListener('resize', function () { if (cropMode) updateCropOverlay(); });
  on($('canvas-container'), 'scroll', function () { if (cropMode) updateCropOverlay(); });

  /* ============================================================
   * 8. 视图缩放
   * ============================================================ */
  var viewScale = 1, fitMode = true, manualScale = 1, fitScale = 1;
  function setZoom(v, fit) {
    if (!sourceImg) return;
    var availW = (canvasContainer.clientWidth || 0) - 24;
    var availH = (canvasContainer.clientHeight || 0) - 24;
    if (fit || !isFinite(v)) {
      var nat = (canvas.width && canvas.height) ? 1 : 1;
      viewScale = Math.min(1, availW / Math.max(1, canvas.width) / nat, availH / Math.max(1, canvas.height) / nat);
      viewScale = clamp(viewScale, 0.05, 6);
      fitMode = true;
      manualScale = 1;
    } else {
      viewScale = clamp(v, 0.05, 6);
      fitMode = false;
      manualScale = viewScale;
    }
    applyZoomStyle();
    if (cropMode) updateCropOverlay();
  }

  /* 把缩放真正写到画布样式上：宽度按视口自适应时高度为 auto，避免比例失真 */
  function applyZoomStyle() {
    if (!canvas.width || !canvas.height) return;
    if (fitMode) { canvas.style.width = ''; canvas.style.height = ''; canvas.style.maxWidth = '100%'; canvas.style.maxHeight = '100%'; }
    else { canvas.style.maxWidth = 'none'; canvas.style.maxHeight = 'none'; canvas.style.width = (canvas.width * viewScale) + 'px'; canvas.style.height = 'auto'; }
    var lab = $('zoom-label');
    if (lab) lab.textContent = Math.round(viewScale * 100) + '%';
  }

  /* 画布尺寸变化或容器尺寸变化后，重新套用当前缩放模式 */
  function refreshZoom() {
    if (!sourceImg) return;
    if (fitMode) setZoom(1, true);
    else applyZoomStyle();
  }

  if (window.ResizeObserver && canvasContainer) {
    var rz = new ResizeObserver(function () { if (fitMode) refreshZoom(); });
    rz.observe(canvasContainer);
  }
  window.addEventListener('resize', function () { if (fitMode) refreshZoom(); });

  /* ============================================================
   * 9. 直方图
   * ============================================================ */
  function drawHistogram() {
    var cv = $('hist-canvas');
    if (!cv || !workCanvas.width) return;
    var w = cv.clientWidth || 260, h = cv.clientHeight || 90;
    cv.width = w; cv.height = h;
    var c = cv.getContext('2d');
    var d = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height).data;
    var histR = new Array(256).fill(0), histG = new Array(256).fill(0), histB = new Array(256).fill(0);
    var step = Math.max(1, Math.floor(d.length / 4 / 60000));
    var count = 0;
    for (var i = 0; i < d.length; i += 4 * step) {
      histR[d[i]]++; histG[d[i + 1]]++; histB[d[i + 2]]++; count++;
    }
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(0, 0, w, h);
    var max = 1;
    for (var k = 0; k < 256; k++) max = Math.max(max, histR[k], histG[k], histB[k]);
    function draw(chan, color) {
      c.fillStyle = color;
      for (var x = 0; x < 256; x++) {
        var v = chan[x] / max * h;
        c.fillRect(x / 256 * w, h - v, Math.max(1, w / 256), v);
      }
    }
    c.globalAlpha = 0.7;
    draw(histB, '#3a6ea5');
    draw(histG, '#3a8a52');
    draw(histR, '#a53a3a');
    c.globalAlpha = 1;
  }

  /* ============================================================
   * 10. 导出
   * ============================================================ */
  function updateExportInfo() {
    var el = $('export-info');
    if (!el || !sourceImg) return;
    var s = parseFloat(exportScaleEl ? exportScaleEl.value : '1');
    var nb = cropRect ? { w: Math.round(cropRect.w), h: Math.round(cropRect.h) } : getNaturalBaseSize();
    var rot = params.rotate;
    var w = (rot === 90 || rot === 270) ? nb.h : nb.w;
    var h = (rot === 90 || rot === 270) ? nb.w : nb.h;
    var fmt = exportFormatEl.value;
    var est = w * h * (fmt === 'png' ? 1 : 0.25) / 1024 / 1024;
    el.textContent = w + ' × ' + h + ' px · 约 ' + (est < 1 ? Math.round(est * 1024) + ' KB' : est.toFixed(1) + ' MB');
  }

  function buildFullResolution() {
    var iw = sourceImg.naturalWidth || sourceImg.width;
    var ih = sourceImg.naturalHeight || sourceImg.height;
    var rot = params.rotate;
    var nb = getBaseGeometry(iw, ih, rot);
    ensureSize(fullCanvas, nb.w, nb.h);
    drawSourceToBase.call(null, nb);
    // drawSourceToBase 用的是 baseCanvas 的上下文，这里单独画到全分辨率画布
    fullCtx.save();
    fullCtx.clearRect(0, 0, nb.w, nb.h);
    fullCtx.translate(nb.w / 2, nb.h / 2);
    fullCtx.rotate(rot * Math.PI / 180);
    fullCtx.scale(params.flipH ? -1 : 1, params.flipV ? -1 : 1);
    if (nb.crop) {
      var cx = cropRect.x + cropRect.w / 2, cy = cropRect.y + cropRect.h / 2;
      fullCtx.drawImage(sourceImg, cx, cy, cropRect.w, cropRect.h, -cropRect.w / 2, -cropRect.h / 2, cropRect.w, cropRect.h);
    } else {
      fullCtx.drawImage(sourceImg, -iw / 2, -ih / 2, iw, ih);
    }
    fullCtx.restore();
    return fullCanvas;
  }

  function applyPipelineTo(src, format) {
    var p = params;
    var w = src.width, h = src.height;
    var c1 = document.createElement('canvas');
    c1.width = w; c1.height = h;
    var ctx1 = c1.getContext('2d', { willReadFrequently: true });
    var filterStr = 'brightness(' + p.brightness + '%) contrast(' + p.contrast + '%) ' +
      'saturate(' + p.saturate + '%) hue-rotate(' + p.hue + 'deg) grayscale(' + p.gray + '%) ' +
      'sepia(' + p.sepia + '%) invert(' + p.invert + '%)';
    if (p.blur > 0) filterStr += ' blur(' + (p.blur * (w / Math.max(1, workCanvas.width || w))) + 'px)';
    ctx1.filter = filterStr;
    ctx1.drawImage(src, 0, 0);
    ctx1.filter = 'none';

    var imgData = ctx1.getImageData(0, 0, w, h);
    var data = imgData.data;
    var need = p.exposure !== 0 || p.highlights !== 0 || p.shadows !== 0 || p.whites !== 0 || p.blacks !== 0 ||
      p.vibrance !== 0 || p.gamma !== 0 || p.fade !== 0 || p.hslLight !== 0 || p.duotone !== 0 ||
      p.threshold !== 0 || p.opacity !== 100 || p.temp !== 0 || p.tint !== 0 || p.shadowFx !== 0 ||
      p.redShift !== 0 || p.greenShift !== 0 || p.blueShift !== 0 || p.posterize > 1;
    if (need) {
      var curve = null;
      if (p.exposure !== 0 || p.highlights !== 0 || p.shadows !== 0 || p.whites !== 0 || p.blacks !== 0 || p.gamma !== 0) {
        curve = new Uint8ClampedArray(256);
        for (var i = 0; i < 256; i++) {
          var v = i;
          if (p.exposure !== 0) v = v * Math.pow(2, p.exposure / 100);
          if (p.shadows !== 0) { var t = 1 - v / 255; v += p.shadows / 100 * t * t * 80; }
          if (p.highlights !== 0) { var t2 = v / 255; v += p.highlights / 100 * t2 * t2 * 80; }
          if (p.whites !== 0) { var t3 = v / 255; v += p.whites / 100 * t3 * t3 * t3 * 90; }
          if (p.blacks !== 0) { var t4 = 1 - v / 255; v += p.blacks / 100 * t4 * t4 * t4 * 90; }
          if (p.gamma !== 0) { var gm = clamp(1 - (p.gamma / 100) * 0.5, 0.2, 2.2); v = Math.pow(v / 255, gm) * 255; }
          curve[i] = clamp(v, 0, 255);
        }
      }
      var postStep = p.posterize > 1 ? 255 / (p.posterize - 1) : 0;
      var tempR = p.temp / 100 * 40, tempB = -tempR;
      var tintR = p.tint / 100 * 30, tintG = -tintR, tintB = tintR;
      var vib = p.vibrance / 100, light = p.hslLight / 100, op = p.opacity / 100;
      var duoAmt = p.duotone / 100, shAmt = p.shadowFx / 100, fadeAmt = p.fade / 100;
      var thr = p.threshold / 100 * 255;
      for (var j = 0; j < data.length; j += 4) {
        var r = curve ? curve[data[j]] : data[j];
        var g = curve ? curve[data[j + 1]] : data[j + 1];
        var b = curve ? curve[data[j + 2]] : data[j + 2];
        if (p.redShift) r += p.redShift * 1.5;
        if (p.greenShift) g += p.greenShift * 1.5;
        if (p.blueShift) b += p.blueShift * 1.5;
        if (p.temp !== 0) { r += tempR; b += tempB; }
        if (p.tint !== 0) { r += tintR; g += tintG; b += tintB; }
        if (vib !== 0) {
          var mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
          var mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
          var avg = (r + g + b) / 3;
          var sat2 = mx > 0 ? (mx - mn) / mx : 0;
          var f2 = 1 + vib * (1 - sat2);
          r = avg + (r - avg) * f2; g = avg + (g - avg) * f2; b = avg + (b - avg) * f2;
        }
        if (light !== 0) { r += light * 90; g += light * 90; b += light * 90; }
        if (p.shadowFx !== 0) {
          var lumS = r * 0.299 + g * 0.587 + b * 0.114;
          if (shAmt > 0) {
            var tw = clamp(1 - lumS / 90, 0, 1) * shAmt * 0.6;
            r = r * (1 - tw) + 30 * tw; g = g * (1 - tw) + 10 * tw; b = b * (1 - tw) + 90 * tw;
          } else {
            var a2 = clamp((lumS - 165) / 90, 0, 1) * (-shAmt) * 0.6;
            r = r * (1 - a2) + 255 * a2; g = g * (1 - a2) + 225 * a2; b = b * (1 - a2) + 120 * a2;
          }
        }
        if (p.duotone > 0) {
          var lumD = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          var sr = 26 + lumD * 214, sg = 26 + lumD * 209, sb = 60 + lumD * 140;
          r = r * (1 - duoAmt) + sr * duoAmt; g = g * (1 - duoAmt) + sg * duoAmt; b = b * (1 - duoAmt) + sb * duoAmt;
        }
        if (p.threshold > 0) {
          var v3 = (r * 0.299 + g * 0.587 + b * 0.114) >= thr ? 255 : 0;
          r = v3; g = v3; b = v3;
        } else if (p.fade > 0) {
          r = r * (1 - fadeAmt) + 255 * fadeAmt; g = g * (1 - fadeAmt) + 255 * fadeAmt; b = b * (1 - fadeAmt) + 255 * fadeAmt;
        }
        if (p.posterize > 1) {
          r = Math.round(r / postStep) * postStep; g = Math.round(g / postStep) * postStep; b = Math.round(b / postStep) * postStep;
        }
        if (op < 1) { r *= op; g *= op; b *= op; }
        data[j] = clamp(r, 0, 255); data[j + 1] = clamp(g, 0, 255); data[j + 2] = clamp(b, 0, 255);
      }
      ctx1.putImageData(imgData, 0, 0);
    }

    if (p.clarity > 0) {
      var radius = Math.max(4, Math.min(w, h) / 200);
      var bc = document.createElement('canvas'); bc.width = w; bc.height = h;
      var bctx = bc.getContext('2d');
      bctx.filter = 'blur(' + radius + 'px)'; bctx.drawImage(c1, 0, 0); bctx.filter = 'none';
      var o = ctx1.getImageData(0, 0, w, h), bd = bctx.getImageData(0, 0, w, h).data;
      var st = p.clarity / 100 * 1.2;
      for (var q = 0; q < o.data.length; q += 4) {
        o.data[q] += (o.data[q] - bd[q]) * st;
        o.data[q + 1] += (o.data[q + 1] - bd[q + 1]) * st;
        o.data[q + 2] += (o.data[q + 2] - bd[q + 2]) * st;
      }
      ctx1.putImageData(o, 0, 0);
    }
    if (p.sharpen > 0 && w > 2 && h > 2) {
      var si = ctx1.getImageData(0, 0, w, h), sd = si.data, sc = new Uint8ClampedArray(sd), amt = p.sharpen / 100 * 0.6;
      for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
        var idx = (y * w + x) * 4;
        for (var cc = 0; cc < 3; cc++) {
          var ctr = sc[idx + cc];
          var nbv = sc[idx - 4 + cc] + sc[idx + 4 + cc] + sc[idx - w * 4 + cc] + sc[idx + w * 4 + cc];
          sd[idx + cc] = clamp(ctr + amt * (ctr * 4 - nbv) / 4, 0, 255);
        }
      }
      ctx1.putImageData(si, 0, 0);
    }
    if (p.emboss > 0 && w > 2 && h > 2) {
      var ei = ctx1.getImageData(0, 0, w, h), ed = ei.data, ec = new Uint8ClampedArray(ed), ek = [-2,-1,0,-1,1,1,0,1,2], ea = p.emboss / 100;
      for (var y2 = 1; y2 < h - 1; y2++) for (var x2 = 1; x2 < w - 1; x2++) {
        var oi2 = (y2 * w + x2) * 4, rr = 0, gg = 0, bb = 0;
        for (var ky = -1; ky <= 1; ky++) for (var kx = -1; kx <= 1; kx++) {
          var sidx = ((y2 + ky) * w + (x2 + kx)) * 4, kv2 = ek[(ky + 1) * 3 + (kx + 1)];
          rr += ec[sidx] * kv2; gg += ec[sidx + 1] * kv2; bb += ec[sidx + 2] * kv2;
        }
        ed[oi2] = ed[oi2] * (1 - ea) + (rr + 128) * ea;
        ed[oi2 + 1] = ed[oi2 + 1] * (1 - ea) + (gg + 128) * ea;
        ed[oi2 + 2] = ed[oi2 + 2] * (1 - ea) + (bb + 128) * ea;
      }
      ctx1.putImageData(ei, 0, 0);
    }
    if (p.edge > 0 && w > 2 && h > 2) {
      var gi2 = ctx1.getImageData(0, 0, w, h), gdata = gi2.data, gsrc = new Uint8ClampedArray(gdata);
      var gxK = [-1,0,1,-2,0,2,-1,0,1], gyK = [-1,-2,-1,0,0,0,1,2,1], es = p.edge / 100;
      for (var y3 = 1; y3 < h - 1; y3++) for (var x3 = 1; x3 < w - 1; x3++) {
        var gx = 0, gy = 0;
        for (var ky2 = -1; ky2 <= 1; ky2++) for (var kx2 = -1; kx2 <= 1; kx2++) {
          var si3 = ((y3 + ky2) * w + (x3 + kx2)) * 4;
          var lum3 = gsrc[si3] * 0.299 + gsrc[si3 + 1] * 0.587 + gsrc[si3 + 2] * 0.114;
          var ki2 = (ky2 + 1) * 3 + (kx2 + 1);
          gx += lum3 * gxK[ki2]; gy += lum3 * gyK[ki2];
        }
        var mag2 = clamp(Math.sqrt(gx * gx + gy * gy) * es, 0, 255);
        var oi3 = (y3 * w + x3) * 4;
        gdata[oi3] = mag2; gdata[oi3 + 1] = mag2; gdata[oi3 + 2] = mag2; gdata[oi3 + 3] = 255;
      }
      ctx1.putImageData(gi2, 0, 0);
    }
    if (p.pixelate >= 2) {
      var size = Math.round(p.pixelate);
      var sw2 = Math.max(1, Math.ceil(w / size)), sh2 = Math.max(1, Math.ceil(h / size));
      var tc = document.createElement('canvas'); tc.width = sw2; tc.height = sh2;
      var tctx = tc.getContext('2d');
      tctx.imageSmoothingEnabled = false; tctx.drawImage(c1, 0, 0, sw2, sh2);
      ctx1.imageSmoothingEnabled = false; ctx1.clearRect(0, 0, w, h); ctx1.drawImage(tc, 0, 0, w, h);
      ctx1.imageSmoothingEnabled = true;
    }
    if (p.chromatic > 0) {
      var off = Math.round(p.chromatic);
      var ci = ctx1.getImageData(0, 0, w, h), cd = ci.data, csrc = new Uint8ClampedArray(cd);
      for (var y4 = 0; y4 < h; y4++) for (var x4 = 0; x4 < w; x4++) {
        var i4 = (y4 * w + x4) * 4;
        cd[i4] = csrc[y4 * w * 4 + clamp(x4 - off, 0, w - 1) * 4];
        cd[i4 + 2] = csrc[y4 * w * 4 + clamp(x4 + off, 0, w - 1) * 4 + 2];
      }
      ctx1.putImageData(ci, 0, 0);
    }
    if (p.bloom > 0) {
      var bs = document.createElement('canvas'); bs.width = w; bs.height = h;
      var bsx = bs.getContext('2d');
      bsx.drawImage(c1, 0, 0);
      var bsd = bsx.getImageData(0, 0, w, h), bdd = bsd.data;
      for (var bi = 0; bi < bdd.length; bi += 4) {
        var lumB = bdd[bi] * 0.299 + bdd[bi + 1] * 0.587 + bdd[bi + 2] * 0.114;
        if (lumB < 200) { bdd[bi] = 0; bdd[bi + 1] = 0; bdd[bi + 2] = 0; }
        else { var bf = (lumB - 200) / 55; bdd[bi] *= bf; bdd[bi + 1] *= bf; bdd[bi + 2] *= bf; }
      }
      bsx.putImageData(bsd, 0, 0);
      var bf2 = document.createElement('canvas'); bf2.width = w; bf2.height = h;
      var bfx = bf2.getContext('2d');
      bfx.filter = 'blur(15px)'; bfx.drawImage(bs, 0, 0); bfx.filter = 'none';
      ctx1.globalCompositeOperation = 'screen';
      ctx1.globalAlpha = p.bloom / 100;
      ctx1.drawImage(bf2, 0, 0);
      ctx1.globalAlpha = 1;
      ctx1.globalCompositeOperation = 'source-over';
    }
    if (p.tiltshift > 0 && h > 2) {
      var tb = document.createElement('canvas'); tb.width = w; tb.height = h;
      var tbx = tb.getContext('2d');
      tbx.filter = 'blur(' + Math.max(1, p.tiltshift) + 'px)'; tbx.drawImage(c1, 0, 0); tbx.filter = 'none';
      var tImg = ctx1.getImageData(0, 0, w, h), td = tImg.data, tbd = tbx.getImageData(0, 0, w, h).data;
      var band2 = Math.max(1, h * 0.18);
      for (var ty = 0; ty < h; ty++) {
        var dist2 = 0;
        if (ty < band2) dist2 = (band2 - ty) / band2;
        else if (ty > h - band2) dist2 = (ty - (h - band2)) / band2;
        if (dist2 <= 0) continue;
        var ta = clamp(dist2, 0, 1) * clamp(p.tiltshift / 8, 0, 1);
        for (var tx = 0; tx < w; tx++) {
          var ti = (ty * w + tx) * 4;
          td[ti] = td[ti] * (1 - ta) + tbd[ti] * ta;
          td[ti + 1] = td[ti + 1] * (1 - ta) + tbd[ti + 1] * ta;
          td[ti + 2] = td[ti + 2] * (1 - ta) + tbd[ti + 2] * ta;
        }
      }
      ctx1.putImageData(tImg, 0, 0);
    }
    if (p.glitch > 0) {
      var gi3 = ctx1.getImageData(0, 0, w, h), ggd = gi3.data, ggsrc = new Uint8ClampedArray(ggd);
      var yy = 0;
      while (yy < h) {
        var bh2 = 2 + Math.floor(Math.random() * 18);
        if (Math.random() < 0.55) {
          var off2 = Math.floor((Math.random() * 2 - 1) * Math.round(p.glitch));
          for (var yy2 = yy; yy2 < Math.min(h, yy + bh2); yy2++) {
            for (var xx = 0; xx < w; xx++) {
              var sxx = clamp(xx - off2, 0, w - 1);
              var di2 = (yy2 * w + xx) * 4, si2 = (yy2 * w + sxx) * 4;
              ggd[di2] = ggsrc[si2]; ggd[di2 + 1] = ggsrc[si2 + 1]; ggd[di2 + 2] = ggsrc[si2 + 2];
            }
          }
        }
        yy += bh2;
      }
      ctx1.putImageData(gi3, 0, 0);
    }
    if (p.halftone > 0) {
      var ht = document.createElement('canvas'); ht.width = w; ht.height = h;
      var htx = ht.getContext('2d');
      htx.globalAlpha = clamp(p.halftone / 100, 0, 1);
      htx.fillStyle = htx.createPattern(getHalftone(), 'repeat');
      htx.fillRect(0, 0, w, h);
      ctx1.globalCompositeOperation = 'multiply';
      ctx1.drawImage(ht, 0, 0);
      ctx1.globalCompositeOperation = 'source-over';
    }
    if (p.scanline > 0) {
      ctx1.fillStyle = 'rgba(0,0,0,' + (p.scanline / 100 * 0.35) + ')';
      for (var sy = 0; sy < h; sy += 3) ctx1.fillRect(0, sy, w, 1);
    }
    if (p.vignette > 0) {
      var vg = ctx1.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,' + (p.vignette / 100) + ')');
      ctx1.fillStyle = vg;
      ctx1.fillRect(0, 0, w, h);
    }
    if (p.vignetteBlur > 0) {
      var vb2 = document.createElement('canvas'); vb2.width = w; vb2.height = h;
      var vbx = vb2.getContext('2d');
      vbx.filter = 'blur(' + Math.max(2, Math.min(w, h) * 0.02 * (p.vignetteBlur / 20)) + 'px)';
      vbx.drawImage(c1, 0, 0); vbx.filter = 'none';
      var mk = document.createElement('canvas'); mk.width = w; mk.height = h;
      var mkx = mk.getContext('2d');
      var mkg = mkx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      mkg.addColorStop(0, 'rgba(0,0,0,0)');
      mkg.addColorStop(1, 'rgba(0,0,0,' + clamp(p.vignetteBlur / 100, 0, 1) + ')');
      mkx.fillStyle = mkg; mkx.fillRect(0, 0, w, h);
      mkx.globalCompositeOperation = 'source-in';
      mkx.drawImage(vb2, 0, 0);
      ctx1.drawImage(mk, 0, 0);
    }
    if (p.rainbow > 0) {
      ctx1.globalAlpha = clamp(p.rainbow / 100, 0, 1) * 0.5;
      var rbg = ctx1.createLinearGradient(0, 0, w, h);
      rbg.addColorStop(0, 'rgba(255,0,0,0.8)');
      rbg.addColorStop(0.2, 'rgba(255,150,0,0.8)');
      rbg.addColorStop(0.4, 'rgba(255,255,0,0.8)');
      rbg.addColorStop(0.6, 'rgba(0,255,120,0.8)');
      rbg.addColorStop(0.8, 'rgba(0,120,255,0.8)');
      rbg.addColorStop(1, 'rgba(150,0,255,0.8)');
      ctx1.fillStyle = rbg;
      ctx1.fillRect(0, 0, w, h);
      ctx1.globalAlpha = 1;
    }
    if (p.noise > 0 && noiseCanvas) {
      ctx1.globalAlpha = p.noise / 100 * 0.6;
      ctx1.globalCompositeOperation = 'overlay';
      ctx1.fillStyle = ctx1.createPattern(noiseCanvas, 'repeat');
      ctx1.fillRect(0, 0, w, h);
      ctx1.globalAlpha = 1;
      ctx1.globalCompositeOperation = 'source-over';
    }
    if (p.opacity < 100 && false) { /* 已在像素阶段处理 */ }

    if (format === 'jpeg') {
      var out = document.createElement('canvas');
      out.width = w; out.height = h;
      var ox = out.getContext('2d');
      ox.fillStyle = '#ffffff';
      ox.fillRect(0, 0, w, h);
      ox.drawImage(c1, 0, 0);
      return out;
    }
    return c1;
  }

  /* 导出兜底：saveAs 不可用或失败时用 a[download] + dataURL */
  function fallbackDownload(out, mime, filename, finish) {
    var url = out.toDataURL(mime, 0.92);
    if (mime !== 'image/png' && url.indexOf('data:' + mime) !== 0) {
      mime = 'image/png';
      filename = filename.replace(/\.[^.]+$/, '.png');
      url = out.toDataURL('image/png');
    }
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (finish) finish();
    toast('已导出 ' + out.width + '×' + out.height + ' 图片');
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var ok = false;
    if (typeof window.saveAs === 'function') {
      try { window.saveAs(blob, filename); ok = true; } catch (e) { ok = false; }
    }
    if (!ok) {
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
  }

  /* 高清缩放：pica 可用时用 pica，否则 canvas 平滑缩放 */
  function resizeHi(src, w, h, usePica) {
    if (usePica && picaInst) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      return picaInst.resize(src, c, { quality: 3, alpha: true, unsharpAmount: 80, unsharpRadius: 0.6, unsharpThreshold: 2 })
        .then(function () { return c; })
        .catch(function () { return fallbackResize(src, w, h); });
    }
    return Promise.resolve(fallbackResize(src, w, h));
  }

  function fallbackResize(src, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    try { cx.imageSmoothingQuality = 'high'; } catch (e) {}
    cx.drawImage(src, 0, 0, w, h);
    return c;
  }

  function getExportCanvas() {
    var scale = parseFloat(exportScaleEl ? exportScaleEl.value : '1') || 1;
    var base = buildFullResolution();
    var w = Math.max(1, Math.round(base.width * scale));
    var h = Math.max(1, Math.round(base.height * scale));
    return resizeHi(base, w, h, scale !== 1 || true).then(function (scaled) {
      var format = exportFormatEl.value;
      return applyPipelineTo(scaled, format);
    });
  }

  btnDownload.addEventListener('click', function () {
    if (!sourceImg) { toast('请先上传图片'); return; }
    var format = exportFormatEl.value;
    var mime = 'image/' + format;
    var ext = format === 'jpeg' ? 'jpg' : format;
    var quality = EXPORT_QUALITY;
    var name = safeName(exportNameEl.value) + '_' + Date.now();
    btnDownload.disabled = true;
    btnDownload.textContent = '⏳ 处理中…';
    function finish() { btnDownload.disabled = false; btnDownload.textContent = '⬇️ 下载'; }
    getExportCanvas().then(function (out) {
      var filename = name + '.' + ext;
      if (typeof window.saveAs === 'function' && out.toBlob) {
        return new Promise(function (resolve) {
          out.toBlob(function (blob) {
            if (blob) { try { window.saveAs(blob, filename); resolve(true); return; } catch (e) {} }
            resolve(false);
          }, mime, quality);
        }).then(function (done) {
          if (done) { finish(); toast('已导出 ' + out.width + '×' + out.height + ' 图片'); return; }
          return fallbackDownload(out, mime, filename, finish);
        });
      }
      return fallbackDownload(out, mime, filename, finish);
    }).then(function () {
      btnDownload.textContent = '⬇️ 下载';
      toast('已导出 ' + out.width + '×' + out.height + ' 图片');
    })['catch'](function (err) {
      if (window.console) console.error(err);
      btnDownload.disabled = false;
      btnDownload.textContent = '⬇️ 下载';
      toast('导出失败');
    });
  });

  on($('btn-copy'), 'click', function () {
    if (!sourceImg) { toast('请先上传图片'); return; }
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') { toast('当前浏览器不支持复制图片'); return; }
    exportFormatEl.value = 'png';
    getExportCanvas().then(function (out) {
      return new Promise(function (resolve, reject) {
        out.toBlob(function (b) { b ? resolve(b) : reject(); }, 'image/png');
      });
    }).then(function (blob) {
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }).then(function () { toast('已复制到剪贴板'); })['catch'](function () { toast('复制失败'); });
  });

  /* ============================================================
   * 11. 快捷键
   * ============================================================ */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) btnRedo.click();
      else btnUndo.click();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      btnRedo.click();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      btnDownload.click();
      return;
    }
    if (!sourceImg) return;
    if (e.key === 'h' || e.key === 'H') $('btn-compare-toggle').click();
    else if (e.key === '0') setZoom(1, true);
    else if (e.key === '=' || e.key === '+') setZoom(viewScale * 1.2);
    else if (e.key === '-' || e.key === '_') setZoom(viewScale / 1.2);
    else if (e.key === 'c' || e.key === 'C') {
      if (cropMode) applyCrop(); else enterCropMode();
    } else if (e.key === 'Escape' && cropMode) exitCropMode(true);
  });

  /* ============================================================
   * 12. 初始化
   * ============================================================ */
  initNoise();
  buildPresets();
  bindSliders();
  updateExportInfo();
  if (!picaInst) {
    toast('未检测到 pica，导出缩放将使用浏览器内置插值');
  }

  // 初始参数显示（未上传图片时也同步一次）
  Object.keys(DEFAULT_PARAMS).forEach(updateLabel);

})();
