(function() {
  'use strict';

  // ================== DOM 引用 ==================
  var dropZone       = document.getElementById('drop-zone');
  var fileInput      = document.getElementById('file-input');
  var imgInfoEl      = document.getElementById('img-info');
  var emptyHint      = document.getElementById('empty-hint');
  var canvas         = document.getElementById('meme-canvas');
  var ctx            = canvas.getContext('2d');
  var settings       = document.getElementById('settings');

  var imgFilterEl    = document.getElementById('img-filter');
  var btnRotL        = document.getElementById('btn-rotate-left');
  var btnRotR        = document.getElementById('btn-rotate-right');
  var btnFlipH       = document.getElementById('btn-flip-h');
  var btnFlipV       = document.getElementById('btn-flip-v');

  var textTopEl      = document.getElementById('text-top');
  var textMiddleEl   = document.getElementById('text-middle');
  var textBottomEl   = document.getElementById('text-bottom');

  var fontFamilyEl   = document.getElementById('font-family');
  var fontInput      = document.getElementById('font-input');
  var fontNameEl     = document.getElementById('font-name');
  var fontSizeEl     = document.getElementById('font-size');
  var fontSizeVal    = document.getElementById('font-size-val');
  var textAlignEl    = document.getElementById('text-align');
  var textColorEl    = document.getElementById('text-color');
  var strokeColorEl  = document.getElementById('stroke-color');
  var strokeWidthEl  = document.getElementById('stroke-width');
  var strokeVal      = document.getElementById('stroke-val');
  var lineHeightEl   = document.getElementById('line-height');
  var lineHeightVal  = document.getElementById('line-height-val');
  var offsetYEl      = document.getElementById('offset-y');
  var offsetYVal     = document.getElementById('offset-y-val');
  var allCapsEl      = document.getElementById('all-caps');
  var useBgEl        = document.getElementById('use-bg');
  var bgColorEl      = document.getElementById('bg-color');
  var useShadowEl    = document.getElementById('use-shadow');
  var shadowColorEl  = document.getElementById('shadow-color');

  var exportFormatEl = document.getElementById('export-format');
  var qualityEl      = document.getElementById('export-quality');
  var qualityVal     = document.getElementById('quality-val');
  var btnDownload    = document.getElementById('btn-download');

  var toastEl        = document.getElementById('toast');

  // ================== 状态变量 ==================
  var originalImg    = null;    // 原始图片对象
  var rotation       = 0;       // 0, 90, 180, 270
  var flipH          = false;
  var flipV          = false;
  var customFontName = 'Impact, "Arial Black", sans-serif'; // 默认字体
  var fontToken      = 0;
  var toastTimer     = null;

  // ================== 通用：Toast ==================
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

  // ================== 1. 图片上传 ==================
  dropZone.addEventListener('click', function() { fileInput.click(); });
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
    dropZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragover',  function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  // 全局拖拽
  window.addEventListener('dragover', function(e) { e.preventDefault(); });
  window.addEventListener('drop', function(e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var f = e.dataTransfer.files[0];
      if (f.type && f.type.indexOf('image/') === 0) handleFile(f);
    }
  });

  // 粘贴图片
  document.addEventListener('paste', function(e) {
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
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        originalImg = img;
        rotation = 0;
        flipH = false;
        flipV = false;

        emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        settings.classList.add('active');
        btnDownload.disabled = false;

        imgInfoEl.style.display = 'block';
        imgInfoEl.textContent = '📐 ' + img.naturalWidth + ' × ' + img.naturalHeight + ' px | 📦 ' + formatSize(file.size);

        updateCanvasSize();
        draw();
        showToast('图片加载成功');
      };
      img.onerror = function() { showToast('无法读取该图片'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  // ================== 2. 图片操作与滤镜 ==================
  btnRotL.addEventListener('click', function() {
    if (!originalImg) return;
    rotation = (rotation - 90 + 360) % 360;
    updateCanvasSize();
    draw();
  });
  btnRotR.addEventListener('click', function() {
    if (!originalImg) return;
    rotation = (rotation + 90) % 360;
    updateCanvasSize();
    draw();
  });
  btnFlipH.addEventListener('click', function() {
    if (!originalImg) return;
    flipH = !flipH;
    draw();
  });
  btnFlipV.addEventListener('click', function() {
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
  var inputEls = [
    imgFilterEl, textTopEl, textMiddleEl, textBottomEl, fontFamilyEl, 
    fontSizeEl, textAlignEl, textColorEl, strokeColorEl, strokeWidthEl,
    lineHeightEl, offsetYEl, allCapsEl, useBgEl, bgColorEl, useShadowEl, shadowColorEl
  ];

  inputEls.forEach(function(el) {
    el.addEventListener('input', function() {
      if (el === fontSizeEl) fontSizeVal.textContent = el.value;
      if (el === strokeWidthEl) strokeVal.textContent = el.value;
      if (el === lineHeightEl) lineHeightVal.textContent = (el.value / 100).toFixed(1);
      if (el === offsetYEl) offsetYVal.textContent = el.value;
      if (el === fontFamilyEl) {
        customFontName = el.value; // 如果选了预设，覆盖自定义字体名
        fontNameEl.textContent = '';
      }
      draw();
    });
  });

  // 导出设置
  qualityEl.addEventListener('input', function() {
    qualityVal.textContent = this.value;
  });

  // 字体上传
  fontInput.addEventListener('change', function() {
    var file = fontInput.files && fontInput.files[0];
    if (!file) return;
    var token = ++fontToken;
    fontNameEl.textContent = '加载中…';
    var reader = new FileReader();
    reader.onload = function(e) {
      var uniqueName = 'MemeFont_' + token;
      try {
        var fontFace = new FontFace(uniqueName, e.target.result);
        fontFace.load().then(function(loadedFace) {
          document.fonts.add(loadedFace);
          if (token === fontToken) {
            customFontName = '"' + uniqueName + '", sans-serif';
            fontNameEl.textContent = '✅ ' + file.name;
            draw();
            showToast('字体加载成功');
          }
        }).catch(function() {
          if (token === fontToken) {
            showToast('字体解析失败');
            fontNameEl.textContent = '';
            fontInput.value = '';
          }
        });
      } catch (err) {
        showToast('字体解析异常');
        fontNameEl.textContent = '';
        fontInput.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // ================== 4. 核心绘制 ==================
  function draw() {
    if (!originalImg) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 4.1 绘制图片 ---
    var tmp = document.createElement('canvas');
    tmp.width = originalImg.naturalWidth;
    tmp.height = originalImg.naturalHeight;
    var tctx = tmp.getContext('2d');
    
    // 应用滤镜
    var filter = imgFilterEl.value;
    if (filter === 'url(#pixelate)') {
      // 简易像素化实现
      var pSize = Math.max(2, Math.floor(originalImg.naturalWidth / 100));
      var tinyW = Math.ceil(originalImg.naturalWidth / pSize);
      var tinyH = Math.ceil(originalImg.naturalHeight / pSize);
      var tinyCanvas = document.createElement('canvas');
      tinyCanvas.width = tinyW;
      tinyCanvas.height = tinyH;
      var tinyCtx = tinyCanvas.getContext('2d');
      tinyCtx.drawImage(originalImg, 0, 0, tinyW, tinyH);
      
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(tinyCanvas, 0, 0, originalImg.naturalWidth, originalImg.naturalHeight);
    } else {
      tctx.filter = filter;
      tctx.drawImage(originalImg, 0, 0);
    }

    // 应用旋转和翻转
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(tmp, -tmp.width / 2, -tmp.height / 2);
    ctx.restore();

    // --- 4.2 绘制文字 ---
    drawText();
  }

  function drawText() {
    var topStr = textTopEl.value.trim();
    var midStr = textMiddleEl.value.trim();
    var botStr = textBottomEl.value.trim();
    if (!topStr && !midStr && !botStr) return;

    // 全大写转换
    if (allCapsEl.checked) {
      topStr = topStr.toUpperCase();
      midStr = midStr.toUpperCase();
      botStr = botStr.toUpperCase();
    }

    // 字体基准大小
    var scale = parseInt(fontSizeEl.value, 10) / 100;
    var baseFontSize = canvas.width * scale * 0.15; 
    baseFontSize = Math.max(16, baseFontSize);

    ctx.font = 'bold ' + baseFontSize + 'px ' + customFontName;
    ctx.fillStyle = textColorEl.value;
    ctx.textBaseline = 'top';

    // 对齐方式
    var align = textAlignEl.value;
    ctx.textAlign = align;
    var paddingX = Math.max(15, canvas.width * 0.03);
    var xPos = align === 'left' ? paddingX : (align === 'right' ? canvas.width - paddingX : canvas.width / 2);

    // 描边
    var strokeW = parseInt(strokeWidthEl.value, 10);
    if (strokeW > 0) {
      ctx.strokeStyle = strokeColorEl.value;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
    }

    // 行高与偏移
    var lhMultiplier = parseInt(lineHeightEl.value, 10) / 100;
    var lineHeight = baseFontSize * lhMultiplier;
    var globalOffsetY = parseInt(offsetYEl.value, 10);
    var marginTop = Math.max(10, canvas.height * 0.02) + globalOffsetY;
    var marginBottom = canvas.height - Math.max(10, canvas.height * 0.02) + globalOffsetY;

    // 渲染函数
    function renderBlock(str, startY, isBottom) {
      var lines = wrapText(str, canvas.width - paddingX * 2);
      var totalHeight = lines.length * lineHeight;
      var currentY = isBottom ? (startY - totalHeight) : startY;

      // 背景色块
      if (useBgEl.checked) {
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
        
        // 半透明背景 (可以解析 #RRGGBB 为 rgba)
        ctx.fillStyle = bgColorEl.value;
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

      // 阴影
      if (useShadowEl.checked) {
        ctx.shadowColor = shadowColorEl.value;
        ctx.shadowBlur = baseFontSize * 0.15;
        ctx.shadowOffsetX = baseFontSize * 0.05;
        ctx.shadowOffsetY = baseFontSize * 0.05;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // 绘制文字
      for (var i = 0; i < lines.length; i++) {
        var y = currentY + i * lineHeight;
        if (strokeW > 0) ctx.strokeText(lines[i], xPos, y);
        ctx.fillText(lines[i], xPos, y);
      }
      
      // 重置阴影，避免影响其他部分
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
  }

  // 文本自动换行
  function wrapText(text, maxWidth) {
    var paragraphs = text.split('\n');
    var result = [];

    for (var p = 0; p < paragraphs.length; p++) {
      var para = paragraphs[p];
      if (!para.trim()) {
        result.push('');
        continue;
      }
      
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
        for (var i = 0; i < words.length; i++) {
          var testLine = currentLine + words[i] + ' ';
          if (ctx.measureText(testLine).width > maxWidth && i > 0) {
            result.push(currentLine.trim());
            currentLine = words[i] + ' ';
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine.trim() !== '') result.push(currentLine.trim());
      }
    }
    return result;
  }

  // ================== 5. 导出下载 ==================
  btnDownload.addEventListener('click', function() {
    if (!originalImg) return;
    var format = exportFormatEl.value;
    var quality = parseInt(qualityEl.value, 10) / 100;

    var sourceCanvas = canvas;
    if (format === 'image/jpeg') {
      // JPG 不支持透明，铺白底
      var tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      var tctx = tmp.getContext('2d');
      tctx.fillStyle = '#ffffff';
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(canvas, 0, 0);
      sourceCanvas = tmp;
    }

    sourceCanvas.toBlob(function(blob) {
      if (!blob) { showToast('导出失败'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/webp' ? 'webp' : 'png');
      a.download = 'meme_' + Date.now() + '.' + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
      showToast('已导出 ' + ext.toUpperCase());
    }, format, quality);
  });

})();