(function () {
  'use strict';

  // ================= 通用：Toast =================
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
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // ================= Tab 切换逻辑 =================
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabContents.forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      var target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      // 切换 Tab 后重绘，防止隐藏时未能反映最新设置
      if (btn.dataset.tab === 'tab-watermark' && window.__wmRedraw) window.__wmRedraw();
      if (btn.dataset.tab === 'tab-print' && window.__psRedraw) window.__psRedraw();
    });
  });

  // ================= 模块 1：加水印与换底色 =================
  (function initWatermark() {
    var dropZone       = document.getElementById('wm-drop-zone');
    var imageInput     = document.getElementById('wm-image-input');
    var imgInfoEl      = document.getElementById('wm-img-info');
    var fontInput      = document.getElementById('wm-font-input');
    var fontNameEl     = document.getElementById('wm-font-name');
    var textInput      = document.getElementById('wm-text');
    var colorInput     = document.getElementById('wm-color');
    var sizeInput      = document.getElementById('wm-size');
    var sizeValEl      = document.getElementById('wm-size-val');
    var opacityInput   = document.getElementById('wm-opacity');
    var opacityValEl   = document.getElementById('wm-opacity-val');
    var rotateInput    = document.getElementById('wm-rotate');
    var rotateValEl    = document.getElementById('wm-rotate-val');
    var paddingInput   = document.getElementById('wm-padding');
    var paddingValEl   = document.getElementById('wm-padding-val');
    var strokeCheckbox = document.getElementById('wm-enable-stroke');
    var strokeColorInp = document.getElementById('wm-stroke-color');

    var posButtons     = Array.prototype.slice.call(document.querySelectorAll('.wm-positions button'));
    var canvas         = document.getElementById('wm-canvas');
    var ctx            = canvas.getContext('2d', { willReadFrequently: true });
    var placeholder    = document.getElementById('wm-placeholder');
    var downloadBtn    = document.getElementById('wm-download');

    var enableBgEl     = document.getElementById('wm-enable-bg');
    var bgSettingsEl   = document.getElementById('wm-bg-settings');
    var originPreviewEl= document.getElementById('wm-origin-color-preview');
    var originColorInp = document.getElementById('wm-origin-color');
    var targetColorInp = document.getElementById('wm-target-color');
    var eyedropperBtn  = document.getElementById('wm-eyedropper');
    var bgColorBtns    = document.querySelectorAll('.wm-bg-color-btn');
    var toleranceInput = document.getElementById('wm-tolerance');
    var toleranceValEl = document.getElementById('wm-tolerance-val');
    var featherInput   = document.getElementById('wm-feather');
    var featherValEl   = document.getElementById('wm-feather-val');

    var exportFormatSel= document.getElementById('wm-export-format');
    var qualityInput   = document.getElementById('wm-quality');
    var qualityValEl   = document.getElementById('wm-quality-val');
    var resetBtn       = document.getElementById('wm-reset');

    var img = null;
    var originalImageData = null;
    var currentPosition   = 'bottom-right';
    var customFontName    = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    var fontLoadToken     = 0;

    var currentOriginColor = { r: 67, g: 142, b: 219 };
    var currentTargetColor = { r: 255, g: 255, b: 255 };
    var isEyedropperActive = false;

    var MAX_SIZE = 3000;

    posButtons.forEach(function (btn) {
      if (btn.dataset.pos === currentPosition) btn.classList.add('active');
    });

    // ---------- 图片上传 ----------
    dropZone.addEventListener('click', function () { imageInput.click(); });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragover',  function () { dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function (e) {
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
    });
    imageInput.addEventListener('change', function () {
      if (imageInput.files && imageInput.files[0]) handleImageFile(imageInput.files[0]);
    });

    // 全局拖拽（防止浏览器默认行为）
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        var f = e.dataTransfer.files[0];
        if (f.type && f.type.indexOf('image/') === 0) handleImageFile(f);
      }
    });

    // 粘贴图片
    document.addEventListener('paste', function (e) {
      if (!e.clipboardData || !e.clipboardData.items) return;
      var tab1 = document.getElementById('tab-watermark');
      if (!tab1 || !tab1.classList.contains('active')) return;
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        var item = e.clipboardData.items[i];
        if (item.type && item.type.indexOf('image') !== -1) {
          var file = item.getAsFile();
          if (file) { e.preventDefault(); handleImageFile(file); }
          return;
        }
      }
    });

    function handleImageFile(file) {
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { showToast('图片超过 20MB，请压缩后再试'); return; }
      var url = URL.createObjectURL(file);
      var tempImg = new Image();
      tempImg.onload = function () {
        img = tempImg;
        URL.revokeObjectURL(url);
        placeholder.style.display = 'none';
        canvas.style.display = 'block';
        downloadBtn.disabled = false;

        var w = img.naturalWidth || 800;
        var h = img.naturalHeight || 600;
        var scaled = false;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          var scale = MAX_SIZE / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          scaled = true;
        }
        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        originalImageData = ctx.getImageData(0, 0, w, h);

        var sx = Math.min(w - 1, Math.floor(w * 0.05));
        var sy = Math.min(h - 1, Math.floor(h * 0.05));
        var idx = (sy * w + sx) * 4;
        if (originalImageData.data[idx] !== undefined) {
          setOriginColor(originalImageData.data[idx], originalImageData.data[idx + 1], originalImageData.data[idx + 2]);
        }

        imgInfoEl.style.display = 'block';
        imgInfoEl.textContent =
          '📐 ' + (img.naturalWidth) + ' × ' + (img.naturalHeight) + ' px' +
          '  |  📦 ' + formatSize(file.size) +
          (scaled ? '  |  ⚠️ 已缩放至 ' + w + '×' + h : '');

        redraw();
        showToast('图片加载成功');
      };
      tempImg.onerror = function () {
        alert('无法读取该图片');
        URL.revokeObjectURL(url);
      };
      tempImg.src = url;
    }

    // ---------- 字体上传 ----------
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
            document.fonts.add(loadedFace);
            if (token === fontLoadToken) {
              customFontName = '"' + uniqueFontName + '", sans-serif';
              fontNameEl.textContent = '✅ ' + file.name;
              redraw();
            }
          }).catch(function () {
            if (token === fontLoadToken) {
              alert('字体解析失败');
              fontNameEl.textContent = '';
              fontInput.value = '';
            }
          });
        } catch (err) {
          alert('字体解析失败：' + err.message);
          fontNameEl.textContent = '';
          fontInput.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    });

    // ---------- 参数事件绑定 ----------
    [textInput, colorInput, strokeColorInp].forEach(function (el) {
      el.addEventListener('input', redraw);
    });
    strokeCheckbox.addEventListener('change', redraw);

    sizeInput.addEventListener('input', function () {
      sizeValEl.textContent = this.value;
      redraw();
    });
    opacityInput.addEventListener('input', function () {
      opacityValEl.textContent = this.value;
      redraw();
    });
    rotateInput.addEventListener('input', function () {
      rotateValEl.textContent = this.value;
      redraw();
    });
    paddingInput.addEventListener('input', function () {
      paddingValEl.textContent = this.value;
      redraw();
    });

    posButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        posButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPosition = btn.dataset.pos;
        redraw();
      });
    });

    enableBgEl.addEventListener('change', function () {
      bgSettingsEl.style.display = this.checked ? 'block' : 'none';
      redraw();
    });

    toleranceInput.addEventListener('input', function () {
      toleranceValEl.textContent = this.value;
      redraw();
    });
    featherInput.addEventListener('input', function () {
      featherValEl.textContent = this.value;
      redraw();
    });

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

    targetColorInp.addEventListener('input', function () {
      currentTargetColor = hexToRgb(this.value);
      bgColorBtns.forEach(function (b) { b.classList.remove('active'); });
      redraw();
    });

    originColorInp.addEventListener('input', function () {
      setOriginColor.apply(null, hexToRgbArr(this.value));
      redraw();
    });

    // ---------- 吸管 ----------
    eyedropperBtn.addEventListener('click', function () {
      isEyedropperActive = !isEyedropperActive;
      this.classList.toggle('active', isEyedropperActive);
      canvas.style.cursor = isEyedropperActive ? 'crosshair' : 'default';
    });

    canvas.addEventListener('click', function (e) {
      if (!isEyedropperActive || !originalImageData) return;
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
      var y = Math.floor((e.clientY - rect.top)  * (canvas.height / rect.height));
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

    // ---------- 导出设置 ----------
    qualityInput.addEventListener('input', function () {
      qualityValEl.textContent = this.value;
    });

    // ---------- 重置 ----------
    resetBtn.addEventListener('click', function () {
      textInput.value = '仅供办理业务使用，他用无效';
      colorInput.value = '#8a5a2b';
      sizeInput.value = '40'; sizeValEl.textContent = '40';
      opacityInput.value = '40'; opacityValEl.textContent = '40';
      rotateInput.value = '0'; rotateValEl.textContent = '0';
      paddingInput.value = '30'; paddingValEl.textContent = '30';
      strokeCheckbox.checked = false;
      strokeColorInp.value = '#ffffff';
      enableBgEl.checked = false;
      bgSettingsEl.style.display = 'none';
      toleranceInput.value = '60'; toleranceValEl.textContent = '60';
      featherInput.value = '20'; featherValEl.textContent = '20';
      targetColorInp.value = '#ffffff';
      currentTargetColor = { r: 255, g: 255, b: 255 };
      bgColorBtns.forEach(function (b) { b.classList.remove('active'); });
      if (bgColorBtns[0]) bgColorBtns[0].classList.add('active');
      currentPosition = 'bottom-right';
      posButtons.forEach(function (b) {
        b.classList.toggle('active', b.dataset.pos === 'bottom-right');
      });
      exportFormatSel.value = 'image/png';
      qualityInput.value = '92'; qualityValEl.textContent = '92';
      customFontName = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      fontNameEl.textContent = '';
      redraw();
      showToast('已重置所有设置');
    });

    // ---------- 工具函数 ----------
    function hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    function hexToRgbArr(hex) {
      var c = hexToRgb(hex);
      return [c.r, c.g, c.b];
    }
    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(function (v) {
        return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
      }).join('').toUpperCase();
    }

    function setOriginColor(r, g, b) {
      currentOriginColor = { r: r, g: g, b: b };
      originPreviewEl.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
      originColorInp.value = rgbToHex(r, g, b);
    }

    // ---------- 核心绘制 ----------
    function redraw() {
      if (!img || !originalImageData) return;
      var w = canvas.width, h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (enableBgEl.checked) {
        var newData = applyBackgroundReplace();
        ctx.putImageData(newData, 0, 0);
      } else {
        ctx.drawImage(img, 0, 0, w, h);
      }

      drawWatermark(w, h);
    }
    window.__wmRedraw = redraw;

    function drawWatermark(w, h) {
      var text = textInput.value.trim();
      if (!text) return;

      var fontSize  = parseInt(sizeInput.value, 10) || 40;
      var opacity   = (parseInt(opacityInput.value, 10) || 40) / 100;
      var rotateRad = (parseInt(rotateInput.value, 10) || 0) * Math.PI / 180;
      var padding   = parseInt(paddingInput.value, 10) || 0;
      var useStroke = strokeCheckbox.checked;
      var strokeW   = Math.max(1, Math.round(fontSize / 12));

      ctx.font = 'bold ' + fontSize + 'px ' + customFontName;
      ctx.fillStyle = colorInput.value;
      ctx.strokeStyle = strokeColorInp.value;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = opacity;
      if (useStroke) ctx.lineWidth = strokeW;

      var textWidth = ctx.measureText(text).width;

      if (currentPosition === 'tile') {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-30 * Math.PI / 180 + rotateRad);
        var stepX = textWidth + fontSize * 1.5;
        var stepY = fontSize * 2.5;
        var diag = Math.sqrt(w * w + h * h) / 2;
        for (var tx = -diag; tx < diag; tx += stepX) {
          for (var ty = -diag; ty < diag; ty += stepY) {
            if (useStroke) ctx.strokeText(text, tx, ty);
            ctx.fillText(text, tx, ty);
          }
        }
        ctx.restore();
      } else {
        var cx, cy;
        if (currentPosition.indexOf('left') !== -1) {
          cx = padding + textWidth / 2;
        } else if (currentPosition.indexOf('right') !== -1) {
          cx = w - padding - textWidth / 2;
        } else {
          cx = w / 2;
        }
        if (currentPosition.indexOf('top') !== -1) {
          cy = padding + fontSize / 2;
        } else if (currentPosition.indexOf('bottom') !== -1) {
          cy = h - padding - fontSize / 2;
        } else {
          cy = h / 2;
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotateRad);
        if (useStroke) ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;
    }

    function applyBackgroundReplace() {
      var w = originalImageData.width;
      var h = originalImageData.height;
      var data = originalImageData.data;
      var newImageData = new ImageData(new Uint8ClampedArray(data), w, h);
      var nd = newImageData.data;

      var tolerance = (parseInt(toleranceInput.value, 10) / 100) * 255;
      var feather   = (parseInt(featherInput.value, 10) / 100) * 255;

      var or = currentOriginColor.r, og = currentOriginColor.g, ob = currentOriginColor.b;
      var tr = currentTargetColor.r, tg = currentTargetColor.g, tb = currentTargetColor.b;

      var tSq = tolerance * tolerance;
      var fSq = (tolerance + feather) * (tolerance + feather);
      var useFeather = feather > 0;

      for (var i = 0; i < nd.length; i += 4) {
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var dr = r - or, dg = g - og, db = b - ob;
        var distSq = dr * dr + dg * dg + db * db;

        if (distSq < tSq) {
          nd[i]     = tr;
          nd[i + 1] = tg;
          nd[i + 2] = tb;
        } else if (useFeather && distSq < fSq) {
          var dist = Math.sqrt(distSq);
          var ratio = (dist - tolerance) / (feather || 1);
          if (ratio < 0) ratio = 0;
          if (ratio > 1) ratio = 1;
          nd[i]     = r * ratio + tr * (1 - ratio);
          nd[i + 1] = g * ratio + tg * (1 - ratio);
          nd[i + 2] = b * ratio + tb * (1 - ratio);
        }
      }
      return newImageData;
    }

    // ---------- 下载 ----------
    downloadBtn.addEventListener('click', function () {
      if (!img) return;
      var format = exportFormatSel.value;
      var quality = (parseInt(qualityInput.value, 10) || 92) / 100;

      var sourceCanvas = canvas;
      if (format === 'image/jpeg') {
        var tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        var tctx = tmp.getContext('2d');
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, tmp.width, tmp.height);
        tctx.drawImage(canvas, 0, 0);
        sourceCanvas = tmp;
      }

      sourceCanvas.toBlob(function (blob) {
        if (!blob) { showToast('导出失败'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
        a.download = 'watermarked_' + Date.now() + '.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        showToast('已导出 ' + ext.toUpperCase());
      }, format, quality);
    });
  })();

  // ================= 模块 2：证件照排版打印 =================
  (function initPhotoSheet() {
    var dropZone         = document.getElementById('ps-drop-zone');
    var fileInput        = document.getElementById('ps-image-input');
    var settings         = document.getElementById('ps-settings');
    var paperSizeSelect  = document.getElementById('ps-paper-size');
    var paperCustomRow   = document.getElementById('ps-paper-custom');
    var paperWInput      = document.getElementById('ps-paper-w');
    var paperHInput      = document.getElementById('ps-paper-h');
    var photoSizeSelect  = document.getElementById('ps-photo-size');
    var photoCustomRow   = document.getElementById('ps-photo-custom');
    var photoWInput      = document.getElementById('ps-photo-w');
    var photoHInput      = document.getElementById('ps-photo-h');
    var marginInput      = document.getElementById('ps-margin');
    var marginValEl      = document.getElementById('ps-margin-val');
    var gapInput         = document.getElementById('ps-gap');
    var gapValEl         = document.getElementById('ps-gap-val');
    var dpiSelect        = document.getElementById('ps-dpi');
    var bgColorInput     = document.getElementById('ps-bg-color');
    var cutLinesCheckbox = document.getElementById('ps-cut-lines');
    var infoBox          = document.getElementById('ps-info');
    var exportFormatSel  = document.getElementById('ps-export-format');
    var btnDownload      = document.getElementById('ps-download');

    var canvas           = document.getElementById('ps-canvas');
    var ctx              = canvas.getContext('2d');
    var emptyHint        = document.getElementById('ps-placeholder');

    var originalImage    = null;

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
      'visa_jp': { w: 35, h: 45 }
    };

    dropZone.addEventListener('click', function () { fileInput.click(); });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragover',  function () { dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function (e) {
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    document.addEventListener('paste', function (e) {
      if (!e.clipboardData || !e.clipboardData.items) return;
      var tab2 = document.getElementById('tab-print');
      if (!tab2 || !tab2.classList.contains('active')) return;
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
      if (!file.type || file.type.indexOf('image/') !== 0) { alert('请选择图片文件！'); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          originalImage = img;
          emptyHint.style.display = 'none';
          canvas.style.display = 'block';
          settings.style.display = 'block';
          redraw();
          showToast('照片加载成功');
        };
        img.onerror = function () { alert('无法读取该图片'); };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    }

    function getPaperSize() {
      if (paperSizeSelect.value === 'custom') {
        return {
          w: parseFloat(paperWInput.value) || 152,
          h: parseFloat(paperHInput.value) || 102
        };
      }
      return PAPER_SIZES[paperSizeSelect.value] || PAPER_SIZES['6inch'];
    }
    function getPhotoSize() {
      if (photoSizeSelect.value === 'custom') {
        return {
          w: parseFloat(photoWInput.value) || 25,
          h: parseFloat(photoHInput.value) || 35
        };
      }
      return PHOTO_SIZES[photoSizeSelect.value] || PHOTO_SIZES['1inch'];
    }

    paperSizeSelect.addEventListener('change', function () {
      paperCustomRow.style.display = this.value === 'custom' ? 'flex' : 'none';
      redraw();
    });
    photoSizeSelect.addEventListener('change', function () {
      photoCustomRow.style.display = this.value === 'custom' ? 'flex' : 'none';
      redraw();
    });
    [paperWInput, paperHInput, photoWInput, photoHInput].forEach(function (el) {
      el.addEventListener('input', redraw);
    });

    marginInput.addEventListener('input', function () {
      marginValEl.textContent = this.value;
      redraw();
    });
    gapInput.addEventListener('input', function () {
      gapValEl.textContent = this.value;
      redraw();
    });
    [dpiSelect, bgColorInput, cutLinesCheckbox].forEach(function (el) {
      el.addEventListener('change', redraw);
      el.addEventListener('input', redraw);
    });

    function redraw() {
      if (!originalImage) return;

      var paper = getPaperSize();
      var photo = getPhotoSize();
      var DPI = parseInt(dpiSelect.value, 10) || 300;
      var marginMm = parseFloat(marginInput.value) || 0;
      var gapMm    = parseFloat(gapInput.value)    || 0;
      var bgColor  = bgColorInput.value;

      var canvasW = Math.round(paper.w / 25.4 * DPI);
      var canvasH = Math.round(paper.h / 25.4 * DPI);
      canvas.width  = canvasW;
      canvas.height = canvasH;

      var photoW = Math.max(1, Math.round(photo.w / 25.4 * DPI));
      var photoH = Math.max(1, Math.round(photo.h / 25.4 * DPI));
      var marginPx = Math.round(marginMm / 25.4 * DPI);
      var gapPx    = Math.round(gapMm / 25.4 * DPI);

      var availW = canvasW - marginPx * 2;
      var availH = canvasH - marginPx * 2;

      var cols = Math.floor((availW + gapPx) / (photoW + gapPx));
      var rows = Math.floor((availH + gapPx) / (photoH + gapPx));
      if (cols < 1) cols = 1;
      if (rows < 1) rows = 1;

      var totalW = cols * photoW + (cols - 1) * gapPx;
      var totalH = rows * photoH + (rows - 1) * gapPx;
      var startX = Math.max(0, (canvasW - totalW) / 2);
      var startY = Math.max(0, (canvasH - totalH) / 2);

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);

      var cutLines = cutLinesCheckbox.checked;

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = startX + c * (photoW + gapPx);
          var y = startY + r * (photoH + gapPx);

          drawImageCover(ctx, originalImage, x, y, photoW, photoH);

          if (cutLines) {
            ctx.strokeStyle = 'rgba(150, 150, 150, 0.75)';
            ctx.lineWidth = Math.max(1, Math.round(DPI / 300));
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x + 0.5, y + 0.5, photoW - 1, photoH - 1);
            ctx.setLineDash([]);
          }
        }
      }

      var totalCount = cols * rows;
      var fitsOne = (totalW <= canvasW) && (totalH <= canvasH);
      infoBox.textContent = fitsOne
        ? '📊 可排 ' + totalCount + ' 张（' + cols + ' 列 × ' + rows + ' 行）'
        : '⚠️ 相纸太小，无法完整容纳照片，请调整参数';
    }
    window.__psRedraw = redraw;

    function drawImageCover(ctx, img, x, y, w, h) {
      var imgRatio = img.width / img.height;
      var targetRatio = w / h;
      var sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }

    btnDownload.addEventListener('click', function () {
      if (!originalImage) return;
      var format = exportFormatSel.value;
      canvas.toBlob(function (blob) {
        if (!blob) { showToast('导出失败'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var ext = format === 'image/jpeg' ? 'jpg' : 'png';
        a.download = '证件照排版_' + Date.now() + '.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        showToast('已导出 ' + ext.toUpperCase());
      }, format, 0.95);
    });
  })();

})();