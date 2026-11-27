(function () {
  'use strict';

  // ================== 依赖检测 ==================
  var pica = window.pica ? window.pica() : null;
  if (!window.saveAs) console.warn('FileSaver 未加载');

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

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); }
      catch(e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  function downloadBlob(blob, filename) {
    if (window.saveAs) {
      window.saveAs(blob, filename);
    } else {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
  }

  // ================== 尺寸定义 ==================
  var SIZES = [
    { name: 'favicon-16x16.png', width: 16 },
    { name: 'favicon-32x32.png', width: 32 },
    { name: 'favicon-48x48.png', width: 48 },
    { name: 'favicon-64x64.png', width: 64 },
    { name: 'apple-touch-icon.png', width: 180 },
    { name: 'android-chrome-192x192.png', width: 192 },
    { name: 'android-chrome-512x512.png', width: 512 }
  ];
  var PREVIEW_SIZES = [16, 32, 48, 64, 128];

  // ================== DOM 元素 ==================
  var tabs = document.querySelectorAll('.fg-tabs button');
  var imagePanel = document.getElementById('imagePanel');
  var textPanel = document.getElementById('textPanel');
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var previewGrid = document.getElementById('previewGrid');
  var emptyHint = document.getElementById('emptyHint');

  // 图片控件
  var imgFitMode = document.getElementById('imgFitMode');
  var imgFilter = document.getElementById('imgFilter');
  var imgBgColor = document.getElementById('imgBgColor');
  var imgBgColorVal = document.getElementById('imgBgColorVal');
  var imgBgTransparent = document.getElementById('imgBgTransparent');
  var imgRadius = document.getElementById('imgRadius');
  var imgRadiusVal = document.getElementById('imgRadiusVal');

  // 文字控件
  var textInput = document.getElementById('textInput');
  var fontFamily = document.getElementById('fontFamily');
  var fontInput = document.getElementById('fontInput');
  var fontName = document.getElementById('fontName');
  var bgColor = document.getElementById('bgColor');
  var fgColor = document.getElementById('fgColor');
  var textEffect = document.getElementById('textEffect');
  var fontWeight = document.getElementById('fontWeight');
  var radiusEl = document.getElementById('radius');
  var radiusVal = document.getElementById('radiusVal');

  // 操作与代码
  var downloadZipBtn = document.getElementById('downloadZip');
  var downloadSizesBtn = document.getElementById('downloadSizes');
  var statusEl = document.getElementById('status');
  var codeSection = document.getElementById('codeSection');
  var htmlCodeEl = document.getElementById('htmlCode');
  var copyCodeBtn = document.getElementById('copyCode');

  // ================== 状态变量 ==================
  var currentMode = 'image';
  var sourceImage = null;       
  var currentCanvases = {};     // { 16: canvas, 32: canvas, ... }
  var customFontName = '';      
  var icoBlobCache = null;      // 缓存生成的 ICO 文件 Blob
  var isRendering = false;

  // ================== 1. Tab 切换 ==================
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentMode = tab.dataset.mode;
      
      imagePanel.hidden = currentMode !== 'image';
      textPanel.hidden = currentMode !== 'text';
      
      updateUI();
    });
  });

  // ================== 2. 图片上传 ==================
  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleImageFile(fileInput.files[0]);
    fileInput.value = '';
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (evt) {
    dropZone.addEventListener(evt, function (e) { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener('dragover', function () { dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
  });

  window.addEventListener('paste', function(e) {
    if (currentMode !== 'image') return;
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        var file = item.getAsFile();
        if (file) { e.preventDefault(); handleImageFile(file); }
        return;
      }
    }
  });

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      return showToast('请选择图片文件');
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        sourceImage = img;
        showToast('图片已加载');
        updateUI();
      };
      img.onerror = function () { showToast('图片解析失败'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ================== 3. 文字与字体上传 ==================
  fontInput.addEventListener('change', function () {
    var file = fontInput.files[0];
    if (!file) return;
    
    fontName.textContent = '加载中...';
    var reader = new FileReader();
    reader.onload = function (e) {
      var uniqueName = 'FgFont_' + Date.now();
      try {
        var fontFace = new FontFace(uniqueName, e.target.result);
        fontFace.load().then(function (loadedFace) {
          document.fonts.add(loadedFace);
          customFontName = '"' + uniqueName + '", sans-serif';
          fontName.textContent = '✅ ' + file.name;
          showToast('字体加载成功');
          if (currentMode === 'text') updateUI();
        }).catch(function () {
          showToast('字体解析失败');
          fontName.textContent = '';
        });
      } catch (err) {
        showToast('浏览器不支持该字体');
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // ================== 4. 实时预览与渲染逻辑 (Pica) ==================
  var debounceTimer;
  function updateUI() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      if (!isRendering) renderAll();
    }, 100);
  }

  async function renderAll() {
    isRendering = true;
    previewGrid.innerHTML = '<div style="padding:20px;color:#8a5a2b;font-weight:bold;">⏳ 正在高质量渲染中...</div>';
    currentCanvases = {};
    icoBlobCache = null; 
    
    var hasData = (currentMode === 'image') ? !!sourceImage : true;
    downloadZipBtn.disabled = !hasData;
    downloadSizesBtn.disabled = !hasData;

    if (!hasData) {
      emptyHint.style.display = 'block';
      codeSection.hidden = true;
      isRendering = false;
      return;
    }
    
    emptyHint.style.display = 'none';
    codeSection.hidden = false;

    // 1. 生成基础的高清主画布 (使用最大的 512)
    var highResCanvas = generateHighResCanvas(512);

    // 2. 使用 Pica 批量缩小到目标尺寸
    var renderPromises = PREVIEW_SIZES.map(async function (size) {
      var canvas = await resizeWithPica(highResCanvas, size);
      currentCanvases[size] = canvas;
      return { canvas: canvas, size: size };
    });

    try {
      var results = await Promise.all(renderPromises);
      
      previewGrid.innerHTML = '';
      // 渲染预览区
      results.forEach(function (res) {
        previewGrid.appendChild(makePreviewItem(res.canvas, res.size, false));
      });

      // ICO 预览
      if (currentCanvases[48]) {
        previewGrid.appendChild(makePreviewItem(currentCanvases[48], 'ICO 格式', true));
      }

      // 异步生成所有完整尺寸用于下载
      var allSizesPromises = SIZES.map(async function (s) {
        if (!currentCanvases[s.width]) {
          currentCanvases[s.width] = await resizeWithPica(highResCanvas, s.width);
        }
      });
      await Promise.all(allSizesPromises);

      renderCode();
    } catch (err) {
      console.error(err);
      previewGrid.innerHTML = '<div style="padding:20px;color:#a8452a;">渲染失败，请检查控制台</div>';
    } finally {
      isRendering = false;
    }
  }

  // 统一绘制大图 (512x512)
  function generateHighResCanvas(size) {
    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    
    if (currentMode === 'image' && sourceImage) {
      if (!imgBgTransparent.checked) {
        ctx.fillStyle = imgBgColor.value;
        ctx.fillRect(0, 0, size, size);
      }
      
      // 应用滤镜
      var filterVal = imgFilter.value;
      if (filterVal !== 'none') {
        ctx.filter = filterVal;
      }
      
      var fit = imgFitMode.value;
      var sw = sourceImage.width, sh = sourceImage.height;
      var scale, dw = size, dh = size, dx = 0, dy = 0;
      
      if (fit === 'cover') {
        scale = Math.max(size / sw, size / sh);
        dw = sw * scale; dh = sh * scale;
        dx = (size - dw) / 2; dy = (size - dh) / 2;
      } else if (fit === 'contain') {
        scale = Math.min(size / sw, size / sh);
        dw = sw * scale; dh = sh * scale;
        dx = (size - dw) / 2; dy = (size - dh) / 2;
      } else {
        dw = size; dh = size;
      }

      var radiusPercent = parseInt(imgRadius.value, 10) / 100;
      var r = size * radiusPercent;
      
      ctx.save();
      if (r > 0) {
        drawRoundedRect(ctx, 0, 0, size, size, r);
        ctx.clip();
      }
      ctx.drawImage(sourceImage, dx, dy, dw, dh);
      ctx.restore();
      
    } else if (currentMode === 'text') {
      var text = (textInput.value || 'A').slice(0, 2);
      var bg = bgColor.value;
      var fg = fgColor.value;
      var ff = customFontName || fontFamily.value;
      var fw = fontWeight.value;
      var radiusPercent = parseInt(radiusEl.value, 10) / 100;
      var r = size * radiusPercent;

      ctx.fillStyle = bg;
      if (r > 0) {
        drawRoundedRect(ctx, 0, 0, size, size, r);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, size, size);
      }

      var fontSize = size * (text.length === 1 ? 0.6 : 0.45);
      ctx.font = fw + ' ' + fontSize + 'px ' + ff;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      var effect = textEffect.value;
      
      if (effect === 'shadow' || effect === 'both') {
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = size * 0.08;
        ctx.shadowOffsetX = size * 0.02;
        ctx.shadowOffsetY = size * 0.04;
      }
      
      if (effect === 'stroke' || effect === 'both') {
        ctx.strokeStyle = bg;
        ctx.lineWidth = size * 0.06;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, size / 2, size / 2 + fontSize * 0.05);
      }
      
      ctx.fillStyle = fg;
      ctx.fillText(text, size / 2, size / 2 + fontSize * 0.05);
    }
    
    return canvas;
  }

  // 使用 Pica 高质量缩放
  function resizeWithPica(sourceCanvas, targetSize) {
    return new Promise(function(resolve) {
      var targetCanvas = document.createElement('canvas');
      targetCanvas.width = targetSize;
      targetCanvas.height = targetSize;

      if (!pica) {
        // 降级方案
        var ctx = targetCanvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);
        return resolve(targetCanvas);
      }

      pica.resize(sourceCanvas, targetCanvas, {
        unsharpAmount: 80,
        unsharpRadius: 0.6,
        unsharpThreshold: 2
      }).then(function() {
        resolve(targetCanvas);
      }).catch(function() {
        // 降级方案
        var ctx = targetCanvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);
        resolve(targetCanvas);
      });
    });
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    if (r <= 0) r = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function makePreviewItem(canvas, sizeLabel, isIco) {
    var wrap = document.createElement('div');
    wrap.className = 'preview-item' + (isIco ? ' ico-item' : '');
    wrap.title = isIco ? '点击下载 favicon.ico (内含多尺寸)' : '点击下载 ' + sizeLabel + 'x' + sizeLabel;
    
    var displayCanvas = document.createElement('canvas');
    var maxDisplay = 128;
    
    if (canvas.width <= maxDisplay) {
      displayCanvas.width = canvas.width;
      displayCanvas.height = canvas.height;
    } else {
      displayCanvas.width = maxDisplay;
      displayCanvas.height = maxDisplay;
    }
    
    var dCtx = displayCanvas.getContext('2d');
    dCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    dCtx.drawImage(canvas, 0, 0, displayCanvas.width, displayCanvas.height);

    wrap.appendChild(displayCanvas);
    
    var lb = document.createElement('span');
    lb.className = 'label';
    lb.textContent = sizeLabel;
    wrap.appendChild(lb);

    wrap.addEventListener('click', function() {
      if (isIco) {
        downloadIco();
      } else {
        canvas.toBlob(function(blob) {
          downloadBlob(blob, 'favicon-' + sizeLabel + 'x' + sizeLabel + '.png');
          showToast('已下载 ' + sizeLabel + 'x' + sizeLabel);
        }, 'image/png');
      }
    });

    return wrap;
  }

  // ================== 5. 核心：生成 ICO 格式 ==================
  function generateIcoBlob(canvases) {
    var icoSizes = [16, 32, 48, 64];
    var pngBuffers = [];
    
    var promises = icoSizes.map(function(size) {
      return new Promise(function(resolve) {
        var canvas = canvases[size];
        if (!canvas) return resolve(null);
        canvas.toBlob(function(blob) {
          var reader = new FileReader();
          reader.onload = function(e) {
            resolve({ size: size, buffer: e.target.result });
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      });
    });

    return Promise.all(promises).then(function(results) {
      var validImages = results.filter(function(r) { return r !== null; });
      if (validImages.length === 0) return null;

      var totalSize = 6;
      validImages.forEach(function(img) { totalSize += 16 + img.buffer.byteLength; });

      var icoBuffer = new ArrayBuffer(totalSize);
      var icoView = new DataView(icoBuffer);
      var icoBytes = new Uint8Array(icoBuffer);

      icoView.setUint16(0, 0, true);
      icoView.setUint16(2, 1, true);
      icoView.setUint16(4, validImages.length, true);

      var offset = 6;
      var imageOffset = 6 + validImages.length * 16;

      validImages.forEach(function(img) {
        icoView.setUint8(offset, img.size === 256 ? 0 : img.size);
        icoView.setUint8(offset + 1, img.size === 256 ? 0 : img.size);
        icoView.setUint8(offset + 2, 0);
        icoView.setUint8(offset + 3, 0);
        icoView.setUint16(offset + 4, 1, true);
        icoView.setUint16(offset + 6, 32, true);
        icoView.setUint32(offset + 8, img.buffer.byteLength, true);
        icoView.setUint32(offset + 12, imageOffset, true);

        icoBytes.set(new Uint8Array(img.buffer), imageOffset);

        offset += 16;
        imageOffset += img.buffer.byteLength;
      });

      return new Blob([icoBuffer], { type: 'image/x-icon' });
    });
  }

  function downloadIco() {
    if (icoBlobCache) {
      downloadBlob(icoBlobCache, 'favicon.ico');
      showToast('favicon.ico 已下载');
      copyIcoBase64(icoBlobCache);
      return;
    }
    
    showToast('正在生成 ICO...');
    generateIcoBlob(currentCanvases).then(function(blob) {
      if (!blob) return showToast('生成 ICO 失败');
      icoBlobCache = blob;
      downloadBlob(blob, 'favicon.ico');
      showToast('favicon.ico 已下载');
      copyIcoBase64(blob);
    });
  }

  function copyIcoBase64(blob) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var b64 = e.target.result;
      copyText(b64).then(function() {
        showToast('ICO 下载成功，Base64 已复制到剪贴板');
      }).catch(function(){
        showToast('ICO 下载成功 (Base64 复制失败)');
      });
    };
    reader.readAsDataURL(blob);
  }

  // ================== 6. 代码与清单 ==================
  function renderCode() {
    var lines = [
      '<link rel="icon" href="/favicon.ico" sizes="any">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/site.webmanifest">'
    ];
    htmlCodeEl.textContent = lines.join('\n');
  }

  copyCodeBtn.addEventListener('click', function () {
    copyText(htmlCodeEl.textContent).then(function () {
      showToast('代码已复制');
    }).catch(function() {
      showToast('复制失败');
    });
  });

  // ================== 7. 下载打包 (ZIP) ==================
  downloadZipBtn.addEventListener('click', function () {
    if (typeof JSZip === 'undefined') return showToast('JSZip 库未加载');
    if (!hasData()) return;

    statusEl.textContent = '正在打包...';
    var zip = new JSZip();
    var folder = zip.folder('favicon');

    var tasks = [];

    SIZES.forEach(function (s) {
      var canvas = currentCanvases[s.width];
      if (!canvas) return;
      var dataUrl = canvas.toDataURL('image/png');
      folder.file(s.name, dataUrl.split(',')[1], { base64: true });
    });

    var webpCanvas = currentCanvases[128] || currentCanvases[48];
    if (webpCanvas) {
      tasks.push(new Promise(function(resolve) {
        webpCanvas.toBlob(function(blob) {
          if (blob) folder.file('favicon.webp', blob);
          resolve();
        }, 'image/webp');
      }));
    }

    tasks.push(new Promise(function(resolve) {
      generateIcoBlob(currentCanvases).then(function(blob) {
        if (blob) folder.file('favicon.ico', blob);
        resolve();
      });
    }));

    var manifest = {
      "name": "My App",
      "short_name": "App",
      "icons": [
        { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
      ],
      "theme_color": currentMode === 'text' ? bgColor.value : imgBgColor.value,
      "background_color": "#ffffff",
      "display": "standalone"
    };
    folder.file('site.webmanifest', JSON.stringify(manifest, null, 2));

    var testHtml = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Favicon 测试</title>\n';
    testHtml += '<link rel="icon" href="favicon.ico" sizes="any">\n';
    testHtml += '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">\n';
    testHtml += '<style>body{font-family:sans-serif;padding:40px;text-align:center;background:#f9f3e3;color:#3d3226;}</style>\n';
    testHtml += '</head>\n<body>\n<h1>🎉 Favicon 生成成功！</h1>\n';
    testHtml += '<p>包含标准 ICO、PNG 和 WebP 格式。</p>\n';
    testHtml += '<img src="android-chrome-192x192.png" style="border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">\n';
    testHtml += '</body>\n</html>';
    folder.file('index.html', testHtml);

    Promise.all(tasks).then(function() {
      zip.generateAsync({ type: 'blob' }).then(function (blob) {
        downloadBlob(blob, 'favicon-package.zip');
        statusEl.textContent = '✅ 打包完成';
        showToast('ZIP 已下载');
        setTimeout(function() { statusEl.textContent = ''; }, 3000);
      });
    });
  });

  downloadSizesBtn.addEventListener('click', function () {
    if (!hasData()) return;
    showToast('开始逐个下载...');
    SIZES.forEach(function (s, index) {
      setTimeout(function() {
        var canvas = currentCanvases[s.width];
        if (canvas) {
          canvas.toBlob(function(blob) {
            downloadBlob(blob, s.name);
          }, 'image/png');
        }
      }, index * 300);
    });
  });

  function hasData() {
    return currentMode === 'image' ? !!sourceImage : true;
  }

  // ================== 8. 事件绑定 ==================
  [imgFitMode, imgFilter, imgBgColor, imgBgTransparent, imgRadius].forEach(function(el) {
    el.addEventListener('input', function() {
      if (el === imgBgColor) imgBgColorVal.textContent = el.value.toUpperCase();
      if (el === imgRadius) imgRadiusVal.textContent = el.value;
      if (currentMode === 'image') updateUI();
    });
  });

  [textInput, fontFamily, bgColor, fgColor, textEffect, fontWeight, radiusEl].forEach(function(el) {
    el.addEventListener('input', function() {
      if (el === radiusEl) radiusVal.textContent = el.value;
      if (currentMode === 'text') updateUI();
    });
  });

  // 初始化
  updateUI();
})();