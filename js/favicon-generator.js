(function () {
  // ============ 尺寸定义 ============
  var SIZES = [
    { name: 'favicon-16x16.png', width: 16, height: 16, type: 'png' },
    { name: 'favicon-32x32.png', width: 32, height: 32, type: 'png' },
    { name: 'favicon-48x48.png', width: 48, height: 48, type: 'png' },
    { name: 'favicon-64x64.png', width: 64, height: 64, type: 'png' },
    { name: 'apple-touch-icon.png', width: 180, height: 180, type: 'png' },
    { name: 'android-chrome-192x192.png', width: 192, height: 192, type: 'png' },
    { name: 'android-chrome-512x512.png', width: 512, height: 512, type: 'png' }
  ];

  var PREVIEW_SIZES = [
    { width: 16, height: 16 },
    { width: 32, height: 32 },
    { width: 48, height: 48 },
    { width: 64, height: 64 },
    { width: 128, height: 128 }
  ];

  // ============ DOM ============
  var tabs = document.querySelectorAll('.fg-tabs button');
  var imagePanel = document.getElementById('imagePanel');
  var textPanel = document.getElementById('textPanel');
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var imagePreviewGrid = document.getElementById('imagePreviewGrid');
  var textPreviewGrid = document.getElementById('textPreviewGrid');
  var textInput = document.getElementById('textInput');
  var bgColor = document.getElementById('bgColor');
  var fgColor = document.getElementById('fgColor');
  var fontFamily = document.getElementById('fontFamily');
  var radiusEl = document.getElementById('radius');
  var radiusVal = document.getElementById('radiusVal');
  var boldEl = document.getElementById('bold');
  var downloadZipBtn = document.getElementById('downloadZip');
  var downloadSizesBtn = document.getElementById('downloadSizes');
  var statusEl = document.getElementById('status');
  var codeSection = document.getElementById('codeSection');
  var htmlCodeEl = document.getElementById('htmlCode');
  var copyCodeBtn = document.getElementById('copyCode');
  var sizesSection = document.getElementById('sizesSection');
  var sizeList = document.getElementById('sizeList');

  // ============ 状态 ============
  var currentMode = 'image';
  var sourceImage = null;      // HTMLImageElement（图片模式）
  var currentCanvases = {};    // 尺寸 -> canvas（用于下载）

  // ============ Tabs ============
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

  // ============ 图片上传 ============
  dropZone.addEventListener('click', function () { fileInput.click(); });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadImageFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) {
      loadImageFile(fileInput.files[0]);
    }
  });

  function loadImageFile(file) {
    if (!file.type.startsWith('image/')) {
      setStatus('请选择图片文件。');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        sourceImage = img;
        renderImagePreviews();
        updateUI();
      };
      img.onerror = function () { setStatus('图片加载失败。'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ============ 渲染图片预览 ============
  function renderImagePreviews() {
    imagePreviewGrid.innerHTML = '';
    if (!sourceImage) return;
    PREVIEW_SIZES.forEach(function (sz) {
      var c = drawImageToCanvas(sourceImage, sz.width, sz.height);
      currentCanvases[sz.width + 'x' + sz.height] = c;
      imagePreviewGrid.appendChild(makePreviewItem(c, sz.width + '×' + sz.height));
    });
    // 额外生成完整尺寸的 canvas 供下载
    SIZES.forEach(function (s) {
      if (!currentCanvases[s.width + 'x' + s.height]) {
        currentCanvases[s.width + 'x' + s.height] = drawImageToCanvas(sourceImage, s.width, s.height);
      }
    });
  }

  function drawImageToCanvas(img, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // 保持比例，居中裁剪为正方形
    var side = Math.min(img.width, img.height);
    var sx = (img.width - side) / 2;
    var sy = (img.height - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, w, h);
    return c;
  }

  // ============ 渲染文字预览 ============
  function renderTextPreviews() {
    textPreviewGrid.innerHTML = '';
    var text = (textInput.value || 'A').slice(0, 2);
    var bg = bgColor.value;
    var fgc = fgColor.value;
    var ff = fontFamily.value;
    var radius = parseInt(radiusEl.value, 10) || 0;
    var bold = boldEl.checked ? 'bold ' : '';

    PREVIEW_SIZES.forEach(function (sz) {
      var c = drawTextToCanvas(text, sz.width, sz.height, bg, fgc, ff, radius, bold);
      currentCanvases[sz.width + 'x' + sz.height] = c;
      textPreviewGrid.appendChild(makePreviewItem(c, sz.width + '×' + sz.height));
    });

    SIZES.forEach(function (s) {
      if (!currentCanvases[s.width + 'x' + s.height]) {
        currentCanvases[s.width + 'x' + s.height] = drawTextToCanvas(
          text, s.width, s.height, bg, fgc, ff, radius, bold
        );
      }
    });
  }

  function drawTextToCanvas(text, w, h, bg, fg, ff, radiusPercent, bold) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // 圆角矩形背景
    var r = (Math.min(w, h) * radiusPercent) / 100;
    ctx.fillStyle = bg;
    roundedRect(ctx, 0, 0, w, h, r);
    ctx.fill();

    // 文字
    var fontSize = Math.min(w, h) * (text.length === 1 ? 0.55 : 0.4);
    ctx.font = bold + fontSize + 'px ' + ff;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + fontSize * 0.04);
    return c;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function makePreviewItem(canvas, label) {
    var wrap = document.createElement('div');
    wrap.className = 'preview-item';
    var display = canvas;
    // 预览时如果太大就缩放到适合显示
    if (canvas.width > 128) {
      var tmp = document.createElement('canvas');
      tmp.width = 128;
      tmp.height = Math.round(128 * canvas.height / canvas.width);
      tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height);
      display = tmp;
    }
    display.style.display = 'block';
    wrap.appendChild(display);
    var lb = document.createElement('span');
    lb.className = 'label';
    lb.textContent = label;
    wrap.appendChild(lb);
    return wrap;
  }

  // ============ 统一刷新 ============
  function updateUI() {
    var hasData = currentMode === 'image' ? !!sourceImage : true;
    downloadZipBtn.disabled = !hasData;
    downloadSizesBtn.disabled = !hasData;

    if (currentMode === 'text') {
      renderTextPreviews();
    } else if (sourceImage) {
      renderImagePreviews();
    }

    if (hasData) {
      renderCode();
      renderSizeList();
      codeSection.hidden = false;
      sizesSection.hidden = false;
    } else {
      codeSection.hidden = true;
      sizesSection.hidden = true;
    }
  }

  // ============ HTML 代码 ============
  function renderCode() {
    var lines = [];
    lines.push('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">');
    lines.push('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">');
    lines.push('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
    lines.push('<link rel="manifest" href="/site.webmanifest">');
    htmlCodeEl.textContent = lines.join('\n');
  }

  copyCodeBtn.addEventListener('click', function () {
    var text = htmlCodeEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus('代码已复制'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatus('代码已复制');
    }
  });

  // ============ 尺寸列表 ============
  function renderSizeList() {
    sizeList.innerHTML = '';
    SIZES.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s.name + '（' + s.width + '×' + s.height + '）';
      sizeList.appendChild(li);
    });
    var li = document.createElement('li');
    li.textContent = 'site.webmanifest（PWA 图标清单，随 ZIP 一起生成）';
    sizeList.appendChild(li);
  }

  // ============ 下载 ZIP ============
  downloadZipBtn.addEventListener('click', function () {
    if (typeof JSZip === 'undefined') {
      setStatus('JSZip 库未加载，请检查 js/libs/jszip/jszip.min.js');
      return;
    }
    if (!hasGeneratedData()) {
      setStatus('请先生成图标。');
      return;
    }

    setStatus('正在打包…');
    var zip = new JSZip();
    var folder = zip.folder('favicon');

    SIZES.forEach(function (s) {
      var canvas = currentCanvases[s.width + 'x' + s.height];
      if (!canvas) return;
      var dataUrl = canvas.toDataURL('image/png');
      var base64 = dataUrl.split(',')[1];
      folder.file(s.name, base64, { base64: true });
    });

    // PWA manifest
    var manifest = {
      "name": "My App",
      "short_name": "App",
      "icons": [
        { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
      ],
      "theme_color": "#ffffff",
      "background_color": "#ffffff",
      "display": "standalone"
    };
    folder.file('site.webmanifest', JSON.stringify(manifest, null, 2));

    // 说明文件
    folder.file('README.txt',
      'Favicon 包由工具站 Favicon 生成器生成。\n' +
      '将本文件夹内的文件上传到网站根目录，并在 HTML <head> 中加入引用代码。'
    );

    zip.generateAsync({ type: 'blob' }).then(function (blob) {
      downloadBlob(blob, 'favicon-package.zip');
      setStatus('ZIP 已下载');
    }).catch(function (e) {
      setStatus('打包失败：' + e.message);
    });
  });

  // ============ 单独下载尺寸 ============
  downloadSizesBtn.addEventListener('click', function () {
    if (!hasGeneratedData()) {
      setStatus('请先生成图标。');
      return;
    }
    SIZES.forEach(function (s) {
      var canvas = currentCanvases[s.width + 'x' + s.height];
      if (!canvas) return;
      canvas.toBlob(function (blob) {
        downloadBlob(blob, s.name);
      }, 'image/png');
    });
    setStatus('已开始逐个下载');
  });

  function hasGeneratedData() {
    if (currentMode === 'image') return !!sourceImage;
    return true;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ============ 文字控件实时刷新 ============
  ['input', 'change'].forEach(function (evt) {
    textInput.addEventListener(evt, function () {
      if (currentMode === 'text') updateUI();
    });
    bgColor.addEventListener(evt, function () {
      if (currentMode === 'text') updateUI();
    });
    fgColor.addEventListener(evt, function () {
      if (currentMode === 'text') updateUI();
    });
    fontFamily.addEventListener(evt, function () {
      if (currentMode === 'text') updateUI();
    });
    boldEl.addEventListener(evt, function () {
      if (currentMode === 'text') updateUI();
    });
  });

  radiusEl.addEventListener('input', function () {
    radiusVal.textContent = radiusEl.value + '%';
    if (currentMode === 'text') updateUI();
  });

  // ============ 工具函数 ============
  function setStatus(s) {
    statusEl.textContent = s || '';
  }

  // ============ 初始化 ============
  updateUI();
})();