(function() {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var emptyHint = document.getElementById('empty-hint');
  var canvas = document.getElementById('main-canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var settings = document.getElementById('settings');
  
  var btnModeAuto = document.getElementById('btn-mode-auto');
  var btnModePicker = document.getElementById('btn-mode-picker');
  var autoPanel = document.getElementById('auto-panel');
  var pickerPanel = document.getElementById('picker-panel');
  
  var paletteList = document.getElementById('palette-list');
  
  var pickedSwatch = document.getElementById('picked-swatch');
  var valHex = document.getElementById('val-hex');
  var valRgb = document.getElementById('val-rgb');
  var valHsl = document.getElementById('val-hsl');
  
  var magnifier = document.getElementById('magnifier');
  var magCtx = magnifier.getContext('2d');
  
  var uiPreviewPanel = document.getElementById('ui-preview-panel');
  var uiCardBg = document.getElementById('ui-card-bg');
  var uiCardTitle = document.getElementById('ui-card-title');
  var uiCardDesc = document.getElementById('ui-card-desc');
  var uiBtnPrimary = document.getElementById('ui-btn-primary');
  var uiBtnOutline = document.getElementById('ui-btn-outline');

  var img = null;
  var currentMode = 'auto'; // auto | picker

  // ================= 1. 图片上传 =================
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
      img = new Image();
      img.onload = function() {
        emptyHint.style.display = 'none';
        canvas.style.display = 'block';
        settings.classList.add('active');
        uiPreviewPanel.style.display = 'block';
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // 自动提取主色
        extractColors();
        
        // 重置模式
        switchMode('auto');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  // ================= 2. 模式切换 =================
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

  // ================= 3. 中位切分算法提取主色 (Median Cut) =================
  function extractColors() {
    if (!img) return;
    
    // 缩小图片以加快计算速度
    var tempCanvas = document.createElement('canvas');
    var tw = 100, th = 100 * (img.height / img.width);
    tempCanvas.width = tw;
    tempCanvas.height = th;
    var tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(img, 0, 0, tw, th);
    
    var data = tCtx.getImageData(0, 0, tw, th).data;
    var pixels = [];
    
    for (var i = 0; i < data.length; i += 4) {
      // 忽略透明像素和极浅/极深的像素（可选）
      if (data[i+3] > 128) {
        pixels.push([data[i], data[i+1], data[i+2]]);
      }
    }

    // 中位切分
    var palette = medianCut(pixels, 8);
    
    // 渲染结果
    paletteList.innerHTML = '';
    palette.forEach(function(color) {
      var hex = rgbToHex(color[0], color[1], color[2]);
      var item = document.createElement('div');
      item.className = 'palette-item';
      
      item.innerHTML = 
        '<div class="palette-swatch" style="background:' + hex + '"></div>' +
        '<div class="palette-info">' +
          '<span class="palette-code">' + hex + '</span>' +
          '<button class="palette-copy" data-hex="' + hex + '">复制</button>' +
        '</div>';
      
      // 点击整行复制
      item.addEventListener('click', function() {
        copyText(hex, item);
      });
      
      paletteList.appendChild(item);
    });

    // 更新 UI 预览
    applyUIPreview(palette);
  }

  // 中位切分核心算法
  function medianCut(pixels, depth) {
    if (depth === 0 || pixels.length === 0) {
      if (pixels.length === 0) return [];
      var r = 0, g = 0, b = 0;
      pixels.forEach(function(p) { r += p[0]; g += p[1]; b += p[2]; });
      return [[Math.round(r/pixels.length), Math.round(g/pixels.length), Math.round(b/pixels.length)]];
    }

    // 找到 RGB 范围最大的通道
    var minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    pixels.forEach(function(p) {
      if (p[0] < minR) minR = p[0]; if (p[0] > maxR) maxR = p[0];
      if (p[1] < minG) minG = p[1]; if (p[1] > maxG) maxG = p[1];
      if (p[2] < minB) minB = p[2]; if (p[2] > maxB) maxB = p[2];
    });

    var rRange = maxR - minR, gRange = maxG - minG, bRange = maxB - minB;
    var sortKey = 0;
    if (gRange >= rRange && gRange >= bRange) sortKey = 1;
    else if (bRange >= rRange && bRange >= gRange) sortKey = 2;

    pixels.sort(function(a, b) { return a[sortKey] - b[sortKey]; });

    var mid = Math.floor(pixels.length / 2);
    var left = pixels.slice(0, mid);
    var right = pixels.slice(mid);

    return medianCut(left, depth - 1).concat(medianCut(right, depth - 1));
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function(x) { return x.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }

  // 应用 UI 预览
  function applyUIPreview(palette) {
    if (palette.length < 3) return;
    
    // 简单策略：取最亮的做背景，最暗的做文字，中间的做按钮
    var sorted = palette.slice().sort(function(a, b) {
      return (b[0]+b[1]+b[2]) - (a[0]+a[1]+a[2]);
    });
    
    var bg = 'rgb(' + sorted[0].join(',') + ')';
    var text = 'rgb(' + sorted[sorted.length - 1].join(',') + ')';
    var primary = 'rgb(' + sorted[1].join(',') + ')';
    
    // 计算对比度调整（简单处理）
    uiCardBg.style.background = bg;
    uiCardBg.style.color = text;
    uiCardTitle.style.color = text;
    uiCardDesc.style.color = text;
    
    uiBtnPrimary.style.background = text;
    uiBtnPrimary.style.color = bg;
    
    uiBtnOutline.style.borderColor = text;
    uiBtnOutline.style.color = text;
  }

  // ================= 4. 吸管拾色与放大镜 =================
  canvas.addEventListener('mousemove', function(e) {
    if (currentMode !== 'picker' || !img) return;
    
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    
    // 鼠标在 canvas 逻辑坐标系中的位置
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      magnifier.style.display = 'none';
      return;
    }
    
    // 显示放大镜
    magnifier.style.display = 'block';
    
    // 放大镜 UI 定位（相对父容器）
    var containerRect = document.getElementById('canvas-container').getBoundingClientRect();
    var magX = e.clientX - containerRect.left + 20;
    var magY = e.clientY - containerRect.top + 20;
    
    // 防止放大镜超出边界
    if (magX + 120 > containerRect.width) magX = e.clientX - containerRect.left - 140;
    if (magY + 120 > containerRect.height) magY = e.clientY - containerRect.top - 140;
    
    magnifier.style.left = magX + 'px';
    magnifier.style.top = magY + 'px';
    
    // 绘制放大镜内容
    magCtx.clearRect(0, 0, 120, 120);
    // 画一个十字准心
    magCtx.drawImage(canvas, x - 5, y - 5, 10, 10, 0, 0, 120, 120);
    
    // 获取当前像素颜色
    var p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    updatePickedColor(p[0], p[1], p[2]);
  });

  canvas.addEventListener('mouseleave', function() {
    magnifier.style.display = 'none';
  });

  canvas.addEventListener('click', function(e) {
    if (currentMode !== 'picker') return;
    copyText(valHex.textContent, null);
  });

  function updatePickedColor(r, g, b) {
    var hex = rgbToHex(r, g, b);
    pickedSwatch.style.background = hex;
    
    valHex.textContent = hex;
    valRgb.textContent = r + ', ' + g + ', ' + b;
    
    // RGB 转 HSL
    var rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    var max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
      }
      h /= 6;
    }
    
    valHsl.textContent = Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%';
  }

  // ================= 5. 复制功能 =================
  document.querySelectorAll('.copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = this.dataset.copy;
      var text = document.getElementById(targetId).textContent;
      copyText(text, this);
    });
  });

  function copyText(text, el) {
    navigator.clipboard.writeText(text).then(function() {
      if (el && el.classList.contains('palette-item')) {
        var copyBtn = el.querySelector('.palette-copy');
        var original = copyBtn.textContent;
        copyBtn.textContent = '✅ 已复制';
        setTimeout(function() { copyBtn.textContent = original; }, 1500);
      } else if (el) {
        var original = el.textContent;
        el.textContent = '✅ 已复制';
        setTimeout(function() { el.textContent = original; }, 1500);
      }
    });
  }

})();