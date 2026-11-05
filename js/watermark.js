(function () {
  // ================= Tab 切换逻辑 =================
  var tabBtns = document.querySelectorAll('.tab-btn');
  var tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      tabContents.forEach(function(c) { c.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // ================= 模块 1：加水印与换底色 =================
  (function initWatermark() {
    var dropZone = document.getElementById('wm-drop-zone');
    var imageInput = document.getElementById('wm-image-input');
    var fontInput = document.getElementById('wm-font-input');
    var fontNameEl = document.getElementById('wm-font-name');
    var textInput = document.getElementById('wm-text');
    var colorInput = document.getElementById('wm-color');
    var sizeInput = document.getElementById('wm-size');
    var opacityInput = document.getElementById('wm-opacity');
    var posButtons = Array.prototype.slice.call(document.querySelectorAll('.wm-positions button'));
    var canvas = document.getElementById('wm-canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var placeholder = document.getElementById('wm-placeholder');
    var downloadBtn = document.getElementById('wm-download');

    var enableBgEl = document.getElementById('wm-enable-bg');
    var bgSettingsEl = document.getElementById('wm-bg-settings');
    var originPreviewEl = document.getElementById('wm-origin-color-preview');
    var eyedropperBtn = document.getElementById('wm-eyedropper');
    var bgColorBtns = document.querySelectorAll('.wm-bg-color-btn');
    var toleranceInput = document.getElementById('wm-tolerance');

    var img = null;
    var originalImageData = null;
    var currentPosition = 'bottom-right';
    var customFontName = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    var fontLoadToken = 0;

    var currentOriginColor = { r: 67, g: 142, b: 219 };
    var currentTargetColor = { r: 255, g: 255, b: 255 };
    var isEyedropperActive = false;

    posButtons.forEach(function (btn) {
      if (btn.dataset.pos === currentPosition) btn.classList.add('active');
    });

    dropZone.addEventListener('click', function () { imageInput.click(); });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      dropZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function (e) {
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
    });
    imageInput.addEventListener('change', function () {
      if (imageInput.files && imageInput.files[0]) handleImageFile(imageInput.files[0]);
    });

    function handleImageFile(file) {
      if (file.size > 20 * 1024 * 1024) return alert('图片大小超过 20MB，请压缩后再试。');
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
        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        originalImageData = ctx.getImageData(0, 0, w, h);

        var idx = (10 * w + 10) * 4;
        if (originalImageData.data[idx] !== undefined) {
          setOriginColor(originalImageData.data[idx], originalImageData.data[idx+1], originalImageData.data[idx+2]);
        }
        draw();
      };
      tempImg.onerror = function () { alert('无法读取该图片'); URL.revokeObjectURL(url); };
      tempImg.src = url;
    }

    fontInput.addEventListener('change', function () {
      var file = fontInput.files && fontInput.files[0];
      if (!file) return;
      var token = ++fontLoadToken;
      fontNameEl.textContent = '正在加载…';
      var reader = new FileReader();
      reader.onload = function (e) {
        var uniqueFontName = 'CustomWMFont_' + token;
        var fontFace = new FontFace(uniqueFontName, e.target.result);
        fontFace.load().then(function (loadedFace) {
          document.fonts.add(loadedFace);
          if (token === fontLoadToken) {
            customFontName = '"' + uniqueFontName + '", sans-serif';
            fontNameEl.textContent = '✅ ' + file.name;
            draw();
          }
        }).catch(function () {
          if (token === fontLoadToken) {
            alert('字体解析失败');
            fontNameEl.textContent = '';
            fontInput.value = '';
          }
        });
      };
      reader.readAsArrayBuffer(file);
    });

    [textInput, colorInput, sizeInput, opacityInput].forEach(function(el) { el.addEventListener('input', draw); });

    posButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        posButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPosition = btn.dataset.pos;
        draw();
      });
    });

    enableBgEl.addEventListener('change', function() {
      bgSettingsEl.style.display = this.checked ? 'block' : 'none';
      draw();
    });
    toleranceInput.addEventListener('input', draw);

    bgColorBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        bgColorBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        var hex = this.dataset.color;
        currentTargetColor = {
          r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16)
        };
        draw();
      });
    });

    eyedropperBtn.addEventListener('click', function() {
      isEyedropperActive = !isEyedropperActive;
      this.classList.toggle('active', isEyedropperActive);
      canvas.style.cursor = isEyedropperActive ? 'crosshair' : 'default';
    });

    canvas.addEventListener('click', function(e) {
      if (!isEyedropperActive || !originalImageData) return;
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
      var y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
      var idx = (y * canvas.width + x) * 4;
      var data = originalImageData.data;
      if (data[idx] !== undefined) setOriginColor(data[idx], data[idx+1], data[idx+2]);
      isEyedropperActive = false;
      eyedropperBtn.classList.remove('active');
      canvas.style.cursor = 'default';
      draw();
    });

    function setOriginColor(r, g, b) {
      currentOriginColor = { r: r, g: g, b: b };
      originPreviewEl.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function draw() {
      if (!img || !originalImageData) return;
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (enableBgEl.checked) {
        var newData = applyBackgroundReplace();
        ctx.putImageData(newData, 0, 0);
      } else {
        ctx.drawImage(img, 0, 0, w, h);
      }

      var text = textInput.value.trim();
      if (!text) return;

      var color = colorInput.value;
      var fontSize = parseInt(sizeInput.value, 10);
      var opacity = parseInt(opacityInput.value, 10) / 100;

      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.font = 'bold ' + fontSize + 'px ' + customFontName;
      ctx.textBaseline = 'middle';

      var padding = Math.max(10, w * 0.03); 
      var textWidth = ctx.measureText(text).width;

      if (currentPosition === 'tile') {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-30 * Math.PI / 180);
        var stepX = textWidth + fontSize * 2;
        var stepY = fontSize * 3;
        var maxDist = Math.sqrt(w * w + h * h) / 2;
        ctx.textAlign = 'center';
        for (var x = -maxDist; x < maxDist; x += stepX) {
          for (var y = -maxDist; y < maxDist; y += stepY) {
            ctx.fillText(text, x, y);
          }
        }
        ctx.restore();
      } else {
        var x, y;
        if (currentPosition.indexOf('left') !== -1) { x = padding; ctx.textAlign = 'left'; }
        else if (currentPosition.indexOf('right') !== -1) { x = w - padding; ctx.textAlign = 'right'; }
        else { x = w / 2; ctx.textAlign = 'center'; }

        if (currentPosition.indexOf('top') !== -1) { y = padding + fontSize / 2; }
        else if (currentPosition.indexOf('bottom') !== -1) { y = h - padding - fontSize / 2; }
        else { y = h / 2; }
        ctx.fillText(text, x, y);
      }
      ctx.globalAlpha = 1.0;
    }

    function applyBackgroundReplace() {
      var w = originalImageData.width, h = originalImageData.height;
      var data = originalImageData.data;
      var newImageData = new ImageData(new Uint8ClampedArray(data), w, h);
      var newData = newImageData.data;
      var threshold = (parseInt(toleranceInput.value, 10) / 100) * 255; 
      
      var or = currentOriginColor.r, og = currentOriginColor.g, ob = currentOriginColor.b;
      var tr = currentTargetColor.r, tg = currentTargetColor.g, tb = currentTargetColor.b;

      for (var i = 0; i < newData.length; i += 4) {
        var r = data[i], g = data[i + 1], b = data[i + 2];
        var dist = Math.sqrt(Math.pow(r - or, 2) + Math.pow(g - og, 2) + Math.pow(b - ob, 2));
        
        if (dist < threshold) {
          newData[i] = tr; newData[i + 1] = tg; newData[i + 2] = tb;
        } else if (dist < threshold + 30) {
          var ratio = (dist - threshold) / 30;
          newData[i] = r * ratio + tr * (1 - ratio);
          newData[i + 1] = g * ratio + tg * (1 - ratio);
          newData[i + 2] = b * ratio + tb * (1 - ratio);
        }
      }
      return newImageData;
    }

    downloadBtn.addEventListener('click', function () {
      if (!img) return;
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'watermarked_' + Date.now() + '.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
    });
  })();

  // ================= 模块 2：证件照排版打印 =================
  (function initPhotoSheet() {
    var dropZone = document.getElementById('ps-drop-zone');
    var fileInput = document.getElementById('ps-image-input');
    var settings = document.getElementById('ps-settings');
    var paperSizeSelect = document.getElementById('ps-paper-size');
    var photoSizeSelect = document.getElementById('ps-photo-size');
    var cutLinesCheckbox = document.getElementById('ps-cut-lines');
    var btnDownload = document.getElementById('ps-download');
    
    var canvas = document.getElementById('ps-canvas');
    var ctx = canvas.getContext('2d');
    var emptyHint = document.getElementById('ps-placeholder');

    var originalImage = null;
    var DPI = 300;

    var PAPER_SIZES = {
      '6inch': { w: 6, h: 4 },
      '5inch': { w: 5, h: 3.5 }
    };
    var PHOTO_SIZES = {
      '1inch': { w: 25, h: 35 },
      '2inch': { w: 35, h: 53 },
      'small1': { w: 22, h: 32 },
      'small2': { w: 35, h: 45 }
    };

    dropZone.addEventListener('click', function() { fileInput.click(); });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
      dropZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
    });
    dropZone.addEventListener('dragenter', function() { dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function() {
      if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
      if (!file.type.startsWith('image/')) return alert('请选择图片文件！');
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          originalImage = img;
          emptyHint.style.display = 'none';
          canvas.style.display = 'block';
          settings.style.display = 'block';
          draw();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    }

    [paperSizeSelect, photoSizeSelect, cutLinesCheckbox].forEach(function(el) {
      el.addEventListener('change', draw);
    });

    function draw() {
      if (!originalImage) return;

      var paper = PAPER_SIZES[paperSizeSelect.value];
      var canvasW = Math.round(paper.w * DPI);
      var canvasH = Math.round(paper.h * DPI);
      
      canvas.width = canvasW;
      canvas.height = canvasH;

      var photo = PHOTO_SIZES[photoSizeSelect.value];
      var photoW = Math.round((photo.w / 25.4) * DPI);
      var photoH = Math.round((photo.h / 25.4) * DPI);

      var margin = Math.round((3 / 25.4) * DPI);
      var availableW = canvasW - margin * 2;
      var availableH = canvasH - margin * 2;

      var cols = Math.floor(availableW / photoW);
      var rows = Math.floor(availableH / photoH);

      if (cols < 1 || rows < 1) {
        alert('当前相纸尺寸无法排下所选证件照尺寸！');
        return;
      }

      var totalW = cols * photoW;
      var totalH = rows * photoH;
      
      var startX = (canvasW - totalW) / 2;
      var startY = (canvasH - totalH) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = startX + c * photoW;
          var y = startY + r * photoH;
          
          drawImageCover(ctx, originalImage, x, y, photoW, photoH);

          if (cutLinesCheckbox.checked) {
            ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, photoW, photoH);
            ctx.setLineDash([]);
          }
        }
      }
    }

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

    btnDownload.addEventListener('click', function() {
      if (!originalImage) return;
      var dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = '证件照排版_' + Date.now() + '.jpg';
      a.click();
    });
  })();

})();