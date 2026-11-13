(function() {
  'use strict';

  // ===================== DOM 引用 =====================
  var dropZone        = document.getElementById('drop-zone');
  var fileInput       = document.getElementById('file-input');
  var imgInfo         = document.getElementById('img-info');
  var emptyHint       = document.getElementById('empty-hint');
  var canvas          = document.getElementById('main-canvas');
  var ctx             = canvas.getContext('2d', { willReadFrequently: true });
  var settings        = document.getElementById('settings');

  var btnModeAuto     = document.getElementById('btn-mode-auto');
  var btnModePicker   = document.getElementById('btn-mode-picker');
  var autoPanel       = document.getElementById('auto-panel');
  var pickerPanel     = document.getElementById('picker-panel');

  var colorCountInput = document.getElementById('color-count');
  var colorCountVal   = document.getElementById('color-count-val');
  var sortModeSelect  = document.getElementById('sort-mode');
  var copyFormatSelect= document.getElementById('copy-format');
  var btnReextract    = document.getElementById('btn-reextract');
  var paletteList     = document.getElementById('palette-list');

  var pickedSwatch    = document.getElementById('picked-swatch');
  var valHex          = document.getElementById('val-hex');
  var valRgb          = document.getElementById('val-rgb');
  var valHsl          = document.getElementById('val-hsl');
  var valHsv          = document.getElementById('val-hsv');
  var valCmyk         = document.getElementById('val-cmyk');

  var magZoomSelect   = document.getElementById('mag-zoom');
  var magnifier       = document.getElementById('magnifier');
  var magCtx          = magnifier.getContext('2d');

  var uiPreviewPanel  = document.getElementById('ui-preview-panel');
  var uiCardBg        = document.getElementById('ui-card-bg');
  var uiCardTitle     = document.getElementById('ui-card-title');
  var uiCardDesc      = document.getElementById('ui-card-desc');
  var uiBtnPrimary    = document.getElementById('ui-btn-primary');
  var uiBtnOutline    = document.getElementById('ui-btn-outline');

  var historySection  = document.getElementById('history-section');
  var historyList     = document.getElementById('history-list');

  var toastEl         = document.getElementById('toast');

  // ===================== 状态 =====================
  var img             = null;
  var currentMode     = 'auto';       // auto | picker
  var currentPalette  = [];           // [{ rgb:[r,g,b], count:n }]
  var totalPixels     = 0;
  var historyColors   = [];           // [{ hex, rgb }]
  var lastPicked      = null;         // [r,g,b]
  var magZoom         = parseInt(magZoomSelect.value, 10) || 12;
  var toastTimer      = null;

  // ===================== 1. 图片上传 =====================
  dropZone.addEventListener('click', function() { fileInput.click(); });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    dropZone.addEventListener(evt, function(e) {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });
  dropZone.addEventListener('dragenter', function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragover',  function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  // 全局拖拽：防止浏览器直接打开文件
  window.addEventListener('dragover', function(e) { e.preventDefault(); });
  window.addEventListener('drop', function(e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var f = e.dataTransfer.files[0];
      if (f.type.indexOf('image/') === 0) handleFile(f);
    }
  });

  // 粘贴图片
  document.addEventListener('paste', function(e) {
    if (!e.clipboardData || !e.clipboardData.items) return;
    var items = e.clipboardData.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') !== -1) {
        var file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
        }
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
      img = new Image();
      img.onload = function() {
        if (!img.naturalWidth || !img.naturalHeight) {
          showToast('无法读取图片尺寸');
          return;
        }

        emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        settings.classList.add('active');
        uiPreviewPanel.style.display = 'block';

        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        imgInfo.style.display = 'block';
        imgInfo.textContent = '📐 ' + img.naturalWidth + ' × ' + img.naturalHeight
          + ' px  |  📦 ' + formatSize(file.size);

        lastPicked = null;
        extractColors();
        switchMode('auto');
        showToast('图片加载成功');
      };
      img.onerror = function() { showToast('图片加载失败'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // ===================== 2. 模式切换 =====================
  btnModeAuto.addEventListener('click', function() { switchMode('auto'); });
  btnModePicker.addEventListener('click', function() { switchMode('picker'); });

  function switchMode(mode) {
    currentMode = mode;
    if (mode === 'auto') {
      btnModeAuto.classList.add('active');
      btnModePicker.classList.remove('active');
      autoPanel.style.display = 'flex';
      pickerPanel.style.display = 'none';
      magnifier.style.display = 'none';
    } else {
      btnModePicker.classList.add('active');
      btnModeAuto.classList.remove('active');
      autoPanel.style.display = 'none';
      pickerPanel.style.display = 'flex';
    }
  }

  // ===================== 3. 中位切分算法提取主色 =====================
  function extractColors() {
    if (!img) return;

    var targetCount = parseInt(colorCountInput.value, 10) || 8;

    // 缩小到最大边 200px 以加快计算速度（同时保留足够的色彩信息）
    var maxDim = 200;
    var scale  = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    var tw = Math.max(2, Math.round(img.naturalWidth  * scale));
    var th = Math.max(2, Math.round(img.naturalHeight * scale));

    var tempCanvas = document.createElement('canvas');
    tempCanvas.width  = tw;
    tempCanvas.height = th;
    var tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(img, 0, 0, tw, th);

    var data = tCtx.getImageData(0, 0, tw, th).data;
    var pixels = [];
    for (var i = 0; i < data.length; i += 4) {
      // 忽略半透明以下像素
      if (data[i + 3] > 128) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }

    totalPixels = pixels.length;

    if (pixels.length === 0) {
      paletteList.innerHTML = '<div class="empty-state">未找到有效像素（可能图片全部透明）</div>';
      currentPalette = [];
      return;
    }

    var palette = medianCut(pixels, targetCount);
    palette = sortPalette(palette, sortModeSelect.value);

    currentPalette = palette;
    renderPalette(palette, totalPixels);
    applyUIPreview(palette);
  }

  // 中位切分核心算法（按像素量 + 色域体积加权切分）
  function medianCut(pixels, targetCount) {
    if (pixels.length === 0) return [];

    var boxes = [ makeBox(pixels) ];
    var maxIter = 200;
    var guard = 0;

    while (boxes.length < targetCount && guard++ < maxIter) {
      // 找到最值得切分的盒子
      var bestIdx   = -1;
      var bestScore = -1;
      for (var i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (b.pixels.length < 2) continue;
        var score = (b.rRange + b.gRange + b.bRange) * Math.log(b.pixels.length + 1);
        if (score > bestScore) {
          bestScore = score;
          bestIdx   = i;
        }
      }
      if (bestIdx < 0) break;

      var box    = boxes[bestIdx];
      var splited = splitBox(box);
      boxes.splice(bestIdx, 1, splited[0], splited[1]);
    }

    // 计算每个盒子的平均色
    var palette = [];
    for (var k = 0; k < boxes.length; k++) {
      var px = boxes[k].pixels;
      var n  = px.length;
      if (n === 0) continue;
      var r = 0, g = 0, b = 0;
      for (var j = 0; j < n; j++) {
        r += px[j][0];
        g += px[j][1];
        b += px[j][2];
      }
      palette.push({
        rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)],
        count: n
      });
    }

    // 默认按占比降序
    palette.sort(function(a, b) { return b.count - a.count; });
    return palette;
  }

  function makeBox(pixels) {
    var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (var i = 0; i < pixels.length; i++) {
      var p = pixels[i];
      if (p[0] < minR) minR = p[0]; if (p[0] > maxR) maxR = p[0];
      if (p[1] < minG) minG = p[1]; if (p[1] > maxG) maxG = p[1];
      if (p[2] < minB) minB = p[2]; if (p[2] > maxB) maxB = p[2];
    }
    return {
      pixels: pixels,
      rRange: maxR - minR,
      gRange: maxG - minG,
      bRange: maxB - minB
    };
  }

  function splitBox(box) {
    if (box.pixels.length < 2) {
      return [box, { pixels: [], rRange: 0, gRange: 0, bRange: 0 }];
    }
    var ranges = [box.rRange, box.gRange, box.bRange];
    var maxRange = Math.max(ranges[0], ranges[1], ranges[2]);
    var channel = ranges.indexOf(maxRange);

    box.pixels.sort(function(a, b) { return a[channel] - b[channel]; });

    var mid = Math.floor(box.pixels.length / 2);
    if (mid === 0) mid = 1;

    return [
      makeBox(box.pixels.slice(0, mid)),
      makeBox(box.pixels.slice(mid))
    ];
  }

  // 排序
  function sortPalette(palette, mode) {
    var arr = palette.slice();
    if (mode === 'luminance') {
      arr.sort(function(a, b) { return luminance(b.rgb) - luminance(a.rgb); });
    } else if (mode === 'hue') {
      arr.sort(function(a, b) { return hueOf(a.rgb) - hueOf(b.rgb); });
    } else if (mode === 'saturation') {
      arr.sort(function(a, b) { return saturationOf(b.rgb) - saturationOf(a.rgb); });
    }
    return arr;
  }

  // ===================== 4. 颜色转换工具函数 =====================
  function toHex(rgb) {
    return '#' + rgb.map(function(x) {
      return ('0' + Math.max(0, Math.min(255, Math.round(x))).toString(16)).slice(-2).toUpperCase();
    }).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      if (max === r)      h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    var s = max === 0 ? 0 : d / max;
    return [Math.round(h), Math.round(s * 100), Math.round(max * 100)];
  }

  function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var k = 1 - Math.max(r, g, b);
    if (k === 1) return [0, 0, 0, 100];
    var c = (1 - r - k) / (1 - k);
    var m = (1 - g - k) / (1 - k);
    var y = (1 - b - k) / (1 - k);
    return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
  }

  function luminance(rgb) {
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }

  function hueOf(rgb) {
    return rgbToHsl(rgb[0], rgb[1], rgb[2])[0];
  }

  function saturationOf(rgb) {
    var h = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    return h[1];
  }

  function rgbToCss(rgb) {
    return 'rgb(' + rgb.join(', ') + ')';
  }

  function formatColor(rgb, format) {
    if (format === 'rgb') return 'rgb(' + rgb.join(', ') + ')';
    if (format === 'hsl') {
      var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      return 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)';
    }
    return toHex(rgb);
  }

  function getContrastColor(rgb) {
    return luminance(rgb) > 140 ? '#111827' : '#ffffff';
  }

  // ===================== 5. 渲染调色板 =====================
  function renderPalette(palette, total) {
    paletteList.innerHTML = '';
    if (!palette || palette.length === 0) {
      paletteList.innerHTML = '<div class="empty-state">无有效颜色</div>';
      return;
    }

    var format = copyFormatSelect.value;

    palette.forEach(function(item) {
      var rgb  = item.rgb;
      var hex  = toHex(rgb);
      var pct  = total > 0 ? (item.count / total * 100) : 0;
      var pctStr = pct >= 10 ? pct.toFixed(1) : pct.toFixed(2);
      var displayText = formatColor(rgb, format);
      var copyValue   = displayText;

      var div = document.createElement('div');
      div.className = 'palette-item';
      div.title = 'HEX: ' + hex + '\nRGB: ' + rgb.join(', ');
      div.innerHTML =
        '<div class="palette-swatch" style="background:' + hex + '"></div>' +
        '<div class="palette-info">' +
          '<span class="palette-code">' + displayText + '</span>' +
          '<span class="palette-pct">' + pctStr + '%</span>' +
          '<button class="palette-copy">复制</button>' +
        '</div>';

      div.addEventListener('click', function(e) {
        var btn = e.target.closest ? e.target.closest('.palette-copy') : null;
        copyWithFeedback(copyValue, btn);
      });

      paletteList.appendChild(div);
    });
  }

  // ===================== 6. UI 预览 =====================
  function applyUIPreview(palette) {
    if (!palette || palette.length < 2) return;

    var sorted = palette.slice().sort(function(a, b) {
      return luminance(b.rgb) - luminance(a.rgb);
    });

    var lightest = sorted[0];
    var darkest  = sorted[sorted.length - 1];

    // 强调色：饱和度最高的颜色
    var bySat = palette.slice().sort(function(a, b) {
      return saturationOf(b.rgb) - saturationOf(a.rgb);
    });
    var accent = bySat[0];

    // 如果强调色与背景亮度太接近，使用中间色
    if (Math.abs(luminance(accent.rgb) - luminance(lightest.rgb)) < 30) {
      accent = sorted[Math.floor(sorted.length / 2)];
    }

    var bg     = rgbToCss(lightest.rgb);
    var text   = rgbToCss(darkest.rgb);
    var accentCss = rgbToCss(accent.rgb);

    uiCardBg.style.background   = bg;
    uiCardBg.style.color        = text;
    uiCardTitle.style.color     = text;
    uiCardDesc.style.color      = text;

    uiBtnPrimary.style.background = accentCss;
    uiBtnPrimary.style.color      = getContrastColor(accent.rgb);

    uiBtnOutline.style.borderColor = accentCss;
    uiBtnOutline.style.color       = accentCss;
    uiBtnOutline.style.background  = 'transparent';
  }

  // ===================== 7. 吸管拾色与放大镜 =====================
  canvas.addEventListener('mousemove', onCanvasMove);
  canvas.addEventListener('mouseleave', onCanvasLeave);
  canvas.addEventListener('click', onCanvasClick);

  function onCanvasMove(e) {
    if (currentMode !== 'picker' || !img) return;

    var rect   = canvas.getBoundingClientRect();
    var scaleX = canvas.width  / rect.width;
    var scaleY = canvas.height / rect.height;

    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top)  * scaleY;

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      magnifier.style.display = 'none';
      return;
    }

    magnifier.style.display = 'block';

    var containerRect = document.getElementById('canvas-container').getBoundingClientRect();
    var magSize = 124; // 120 + 边框
    var magX = e.clientX - containerRect.left + 20;
    var magY = e.clientY - containerRect.top  + 20;
    if (magX + magSize > containerRect.width)  magX = e.clientX - containerRect.left - magSize - 20;
    if (magY + magSize > containerRect.height) magY = e.clientY - containerRect.top  - magSize - 20;
    magnifier.style.left = Math.max(0, magX) + 'px';
    magnifier.style.top  = Math.max(0, magY) + 'px';

    // 绘制放大镜内容
    var sampleSize = 120 / magZoom;
    magCtx.imageSmoothingEnabled = false;
    magCtx.clearRect(0, 0, 120, 120);
    magCtx.drawImage(
      canvas,
      x - sampleSize / 2, y - sampleSize / 2, sampleSize, sampleSize,
      0, 0, 120, 120
    );

    // 十字准心
    magCtx.strokeStyle = 'rgba(255,255,255,0.9)';
    magCtx.lineWidth = 1;
    magCtx.beginPath();
    magCtx.moveTo(60, 54); magCtx.lineTo(60, 66);
    magCtx.moveTo(54, 60); magCtx.lineTo(66, 60);
    magCtx.stroke();

    magCtx.strokeStyle = 'rgba(0,0,0,0.6)';
    magCtx.beginPath();
    magCtx.moveTo(60, 56); magCtx.lineTo(60, 64);
    magCtx.moveTo(56, 60); magCtx.lineTo(64, 60);
    magCtx.stroke();

    // 读取像素颜色
    var px = Math.floor(x);
    var py = Math.floor(y);
    var p  = ctx.getImageData(px, py, 1, 1).data;
    updatePickedColor(p[0], p[1], p[2]);
  }

  function onCanvasLeave() {
    magnifier.style.display = 'none';
  }

  function onCanvasClick(e) {
    if (currentMode !== 'picker' || !lastPicked) return;
    var hex = toHex(lastPicked);
    copyWithFeedback(hex, null);
    addToHistory(hex, lastPicked);
  }

  function updatePickedColor(r, g, b) {
    lastPicked = [r, g, b];
    var hex = toHex([r, g, b]);
    pickedSwatch.style.background = hex;

    valHex.textContent  = hex;
    valRgb.textContent  = r + ', ' + g + ', ' + b;

    var hsl = rgbToHsl(r, g, b);
    valHsl.textContent = hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%';

    var hsv = rgbToHsv(r, g, b);
    valHsv.textContent = hsv[0] + ', ' + hsv[1] + '%, ' + hsv[2] + '%';

    var cmyk = rgbToCmyk(r, g, b);
    valCmyk.textContent = cmyk.join(', ');
  }

  // ===================== 8. 历史记录 =====================
  function addToHistory(hex, rgb) {
    // 去重，移到最前
    for (var i = 0; i < historyColors.length; i++) {
      if (historyColors[i].hex === hex) {
        historyColors.splice(i, 1);
        break;
      }
    }
    historyColors.unshift({ hex: hex, rgb: rgb.slice() });
    if (historyColors.length > 12) historyColors.length = 12;
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = '';
    historyColors.forEach(function(h) {
      var d = document.createElement('div');
      d.className = 'history-item';
      d.style.background = h.hex;
      d.title = h.hex;
      d.addEventListener('click', function() {
        copyWithFeedback(h.hex, null);
      });
      historyList.appendChild(d);
    });
    historySection.style.display = historyColors.length > 0 ? 'block' : 'none';
  }

  // ===================== 9. 复制 & 导出 =====================
  // 绑定右侧拾取面板的复制按钮
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function(btn) {
    btn.addEventListener('click', function() {
      var targetId = this.dataset.copy;
      var target = document.getElementById(targetId);
      if (target) copyWithFeedback(target.textContent, this);
    });
  });

  function copyWithFeedback(text, el) {
    copyText(text).then(function() {
      if (el && el.textContent !== undefined) {
        var original = el.textContent;
        el.textContent = '✅ 已复制';
        setTimeout(function() { el.textContent = original; }, 1200);
      } else {
        showToast('已复制 ' + text);
      }
    }).catch(function() {
      showToast('复制失败，请手动选择复制');
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // 降级
    return new Promise(function(resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        var ok = document.execCommand('copy');
        ok ? resolve() : reject(new Error('execCommand failed'));
      } catch (err) {
        reject(err);
      }
      document.body.removeChild(ta);
    });
  }

  // 导出按钮
  Array.prototype.forEach.call(document.querySelectorAll('[data-export]'), function(btn) {
    btn.addEventListener('click', function() {
      exportPalette(this.dataset.export);
    });
  });

  function exportPalette(type) {
    if (!currentPalette || currentPalette.length === 0) {
      showToast('请先提取颜色');
      return;
    }

    var palette = currentPalette;
    var content = '';
    var filename = 'palette';
    var mime = 'text/plain';

    if (type === 'css') {
      content = ':root {\n';
      palette.forEach(function(item, i) {
        content += '  --color-' + (i + 1) + ': ' + toHex(item.rgb) + ';\n';
      });
      content += '}\n';
      filename = 'palette.css';
    } else if (type === 'scss') {
      palette.forEach(function(item, i) {
        content += '$color-' + (i + 1) + ': ' + toHex(item.rgb) + ';\n';
      });
      filename = 'palette.scss';
    } else if (type === 'json') {
      var arr = palette.map(function(item, i) {
        var pct = totalPixels > 0 ? (item.count / totalPixels * 100) : 0;
        return {
          name: 'color-' + (i + 1),
          hex: toHex(item.rgb),
          rgb: { r: item.rgb[0], g: item.rgb[1], b: item.rgb[2] },
          hsl: (function() {
            var h = rgbToHsl(item.rgb[0], item.rgb[1], item.rgb[2]);
            return { h: h[0], s: h[1], l: h[2] };
          })(),
          percent: +pct.toFixed(2)
        };
      });
      content = JSON.stringify({ colors: arr }, null, 2);
      filename = 'palette.json';
      mime = 'application/json';
    } else if (type === 'tailwind') {
      content = 'module.exports = {\n  theme: {\n    extend: {\n      colors: {\n';
      palette.forEach(function(item, i) {
        content += "        'brand-" + (i + 1) + "': '" + toHex(item.rgb) + "',\n";
      });
      content = content.replace(/,\n$/, '\n');
      content += '      }\n    }\n  }\n};\n';
      filename = 'tailwind.config.js';
      mime = 'application/javascript';
    } else {
      // txt
      content = palette.map(function(item) {
        return toHex(item.rgb);
      }).join('\n');
      filename = 'palette.txt';
    }

    downloadText(content, filename, mime);
    showToast('已导出 ' + filename);
  }

  function downloadText(content, filename, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // ===================== 10. Toast =====================
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toastEl.classList.remove('show');
    }, 1500);
  }

  // ===================== 11. 控件事件绑定 =====================
  colorCountInput.addEventListener('input', function() {
    colorCountVal.textContent = colorCountInput.value;
  });
  colorCountInput.addEventListener('change', function() {
    if (img) extractColors();
  });

  sortModeSelect.addEventListener('change', function() {
    if (img) extractColors();
  });

  copyFormatSelect.addEventListener('change', function() {
    if (currentPalette.length) renderPalette(currentPalette, totalPixels);
  });

  btnReextract.addEventListener('click', function() {
    if (img) {
      extractColors();
      showToast('已重新提取配色');
    }
  });

  magZoomSelect.addEventListener('change', function() {
    magZoom = parseInt(this.value, 10) || 12;
  });

})();