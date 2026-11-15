(function () {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  // ================== DOM 元素 ==================
  var dropZone = document.getElementById('ft-drop-zone');
  var fileInput = document.getElementById('ft-input');
  var editorPanel = document.getElementById('ft-editor');
  var infoPanel = document.getElementById('ft-info');
  
  var previewTextEl = document.getElementById('ft-preview');
  var customTextEl = document.getElementById('ft-custom-text');
  var specimenEl = document.getElementById('ft-specimen-preview');
  var glyphsGridEl = document.getElementById('ft-glyphs-grid');

  var sizeInput = document.getElementById('ft-size');
  var lhInput = document.getElementById('ft-line-height');
  var lsInput = document.getElementById('ft-letter-spacing');
  var colorInput = document.getElementById('ft-color');
  var bgInput = document.getElementById('ft-bg');
  
  var strokeEnable = document.getElementById('ft-stroke-enable');
  var strokeSettings = document.getElementById('ft-stroke-settings');
  var strokeWidth = document.getElementById('ft-stroke-width');
  var strokeColor = document.getElementById('ft-stroke-color');
  
  var btnReset = document.getElementById('btn-reset-style');
  var btnCopyCss = document.getElementById('btn-copy-css');
  var btnExportPng = document.getElementById('btn-export-png');
  
  var alignBtns = document.querySelectorAll('.ft-align-btn');
  var tabBtns = document.querySelectorAll('.ft-tab');
  var tabContents = document.querySelectorAll('.ft-tab-content');

  // ================== 状态变量 ==================
  var currentFontName = '';
  var currentFontRaw = null;
  var currentAlign = 'left';
  var currentTab = 'tab-text';

  // ================== 1. 字体上传与解析 ==================
  dropZone.addEventListener('click', function () { fileInput.click(); });
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener('dragover', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  function handleFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
      return showToast('请上传 TTF / OTF / WOFF / WOFF2 格式的字体文件');
    }

    // 显示 Loading
    dropZone.innerHTML = '<span>⏳ 正在解析字体...</span>';
    var originalHtml = '<span>📁 点击或拖拽</span><span class="ft-hint">支持 .ttf / .otf / .woff / .woff2</span>';

    var reader = new FileReader();
    reader.onload = function (e) {
      var buffer = e.target.result;
      currentFontRaw = buffer;
      
      // 1. 用于预览的 FontFace (CSS渲染)
      currentFontName = 'CustomFont_' + Date.now();
      try {
        var fontFace = new FontFace(currentFontName, buffer);
        fontFace.load().then(function (loadedFace) {
          document.fonts.add(loadedFace);
          
          editorPanel.style.display = 'block';
          btnCopyCss.disabled = false;
          btnExportPng.disabled = false;
          
          applyStyles();
          parseFontData(buffer, file.size); // 启动底层解析
          
          dropZone.innerHTML = '✅ ' + file.name + '<span class="ft-hint">重新上传请点击</span>';
          showToast('字体加载成功');
        }).catch(function (err) {
          console.error(err);
          showToast('浏览器无法解析该字体');
          dropZone.innerHTML = originalHtml;
        });
      } catch (err) {
        showToast('字体解析异常');
        dropZone.innerHTML = originalHtml;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ================== 2. 解析底层信息与字符集 ==================
  function parseFontData(buffer, fileSize) {
    try {
      var font = opentype.parse(buffer);
      infoPanel.style.display = 'block';
      
      var family = font.names.fontFamily ? font.names.fontFamily.en : '未知';
      var version = font.names.version ? font.names.version.en : '未知';
      var copyright = font.names.copyright ? font.names.copyright.en : '无版权信息';
      var glyphs = font.glyphs.length;

      document.getElementById('info-family').textContent = family;
      document.getElementById('info-version').textContent = version;
      document.getElementById('info-copyright').textContent = copyright;
      document.getElementById('info-glyphs').textContent = glyphs + ' 个字符 (' + (fileSize/1024).toFixed(1) + ' KB)';

      renderGlyphs(font);
    } catch (err) {
      console.warn('Opentype.js 解析元数据失败，可能是 WOFF2 格式', err);
      infoPanel.style.display = 'block';
      document.getElementById('info-family').textContent = '解析受限';
      document.getElementById('info-version').textContent = '-';
      document.getElementById('info-glyphs').textContent = '-';
      document.getElementById('info-copyright').textContent = '当前格式不支持底层解析，但预览功能正常。';
      glyphsGridEl.innerHTML = '<p style="text-align:center; color:#8a7a5f; padding: 20px;">当前字体格式（可能是 WOFF2）暂不支持提取字符集。</p>';
    }
  }

  function renderGlyphs(font) {
    glyphsGridEl.innerHTML = '';
    var maxShow = 300; // 防止大字体卡死
    var count = 0;
    
    for (var i = 0; i < font.glyphs.length && count < maxShow; i++) {
      var glyph = font.glyphs.get(i);
      var unicode = glyph.unicode;
      
      if (unicode) {
        var char = String.fromCodePoint(unicode);
        var div = document.createElement('div');
        div.className = 'ft-glyph-item';
        div.textContent = char;
        div.title = 'U+' + unicode.toString(16).toUpperCase();
        // 动态应用字体
        div.style.fontFamily = '"' + currentFontName + '", sans-serif';
        glyphsGridEl.appendChild(div);
        count++;
      }
    }
    
    if (count >= maxShow) {
      var tip = document.createElement('div');
      tip.style.gridColumn = '1 / -1';
      tip.style.textAlign = 'center';
      tip.style.color = '#8a7a5f';
      tip.style.padding = '10px';
      tip.style.fontSize = '0.8rem';
      tip.textContent = '（仅展示前 ' + maxShow + ' 个字符）';
      glyphsGridEl.appendChild(tip);
    }
  }

  // ================== 3. 样式应用逻辑 ==================
  var debounceTimer;
  
  function applyStyles() {
    if (!currentFontName) return;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      var size = sizeInput.value;
      var lh = lhInput.value;
      var ls = lsInput.value;
      var color = colorInput.value;
      var bg = bgInput.value;
      
      var fontStr = '"' + currentFontName + '", sans-serif';

      // 1. 更新文本段落模式
      previewTextEl.style.fontFamily = fontStr;
      previewTextEl.style.fontSize = size + 'px';
      previewTextEl.style.lineHeight = lh;
      previewTextEl.style.letterSpacing = ls + 'px';
      previewTextEl.style.color = color;
      previewTextEl.style.textAlign = currentAlign;
      previewTextEl.parentElement.style.background = bg;
      previewTextEl.textContent = customTextEl.value || '请输入文字...';

      // 描边与特效
      if (strokeEnable.checked) {
        previewTextEl.style.webkitTextStroke = strokeWidth.value + 'px ' + strokeColor.value;
      } else {
        previewTextEl.style.webkitTextStroke = 'unset';
      }

      // 2. 更新规范表模式
      specimenEl.style.fontFamily = fontStr;
      specimenEl.style.color = color;
      specimenEl.style.textAlign = currentAlign;
      specimenEl.parentElement.style.background = bg;
      
      var allSpecimenText = specimenEl.querySelectorAll('h1, h2, h3, h4, p');
      allSpecimenText.forEach(function(el) {
        if (strokeEnable.checked) {
          el.style.webkitTextStroke = (strokeWidth.value / 3) + 'px ' + strokeColor.value;
        } else {
          el.style.webkitTextStroke = 'unset';
        }
      });

      // 3. 更新字符集网格字体
      if (glyphsGridEl) {
        glyphsGridEl.style.fontFamily = fontStr;
        glyphsGridEl.style.color = color;
        glyphsGridEl.parentElement.style.background = bg;
      }

      // 更新数值显示
      document.getElementById('val-size').textContent = size + 'px';
      document.getElementById('val-lh').textContent = lh;
      document.getElementById('val-ls').textContent = ls + 'px';
      document.getElementById('val-stroke-w').textContent = strokeWidth.value + 'px';

    }, 16); // 16ms 防抖，即 1帧
  }

  // ================== 4. 事件绑定 ==================
  [sizeInput, lhInput, lsInput, colorInput, bgInput, customTextEl].forEach(function(el) {
    el.addEventListener('input', applyStyles);
  });
  
  strokeEnable.addEventListener('change', function() {
    strokeSettings.style.display = this.checked ? 'block' : 'none';
    applyStyles();
  });
  strokeWidth.addEventListener('input', applyStyles);
  strokeColor.addEventListener('input', applyStyles);

  // 对齐切换
  alignBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      alignBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentAlign = this.dataset.align;
      applyStyles();
    });
  });

  // Tab 切换
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      tabContents.forEach(function(c) { c.style.display = 'none'; });
      
      this.classList.add('active');
      currentTab = this.dataset.tab;
      document.getElementById(currentTab).style.display = 'flex';
      applyStyles();
    });
  });

  // 重置样式
  btnReset.addEventListener('click', function () {
    sizeInput.value = 32;
    lhInput.value = 1.5;
    lsInput.value = 0;
    colorInput.value = '#3d3226';
    bgInput.value = '#ffffff';
    strokeEnable.checked = false;
    strokeSettings.style.display = 'none';
    currentAlign = 'left';
    alignBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.align === 'left'); });
    applyStyles();
    showToast('样式已重置');
  });

  // ================== 5. 导出功能 ==================
  btnCopyCss.addEventListener('click', function () {
    var css = '.custom-font {\n';
    css += '  font-family: "' + currentFontName + '", sans-serif;\n';
    css += '  font-size: ' + sizeInput.value + 'px;\n';
    css += '  line-height: ' + lhInput.value + ';\n';
    css += '  letter-spacing: ' + lsInput.value + 'px;\n';
    css += '  color: ' + colorInput.value + ';\n';
    css += '  text-align: ' + currentAlign + ';\n';
    if (strokeEnable.checked) {
      css += '  -webkit-text-stroke: ' + strokeWidth.value + 'px ' + strokeColor.value + ';\n';
    }
    css += '}';

    navigator.clipboard.writeText(css).then(function() {
      showToast('CSS 已复制到剪贴板');
    }).catch(function() {
      showToast('复制失败');
    });
  });

  btnExportPng.addEventListener('click', function () {
    if (!currentFontName) return;

    var text = customTextEl.value;
    var size = parseInt(sizeInput.value, 10);
    var lh = parseFloat(lhInput.value);
    var ls = parseFloat(lsInput.value);
    var color = colorInput.value;
    var bg = bgInput.value;
    var align = currentAlign;

    // 使用 Canvas 精确绘制
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    // 设置画布内边距
    var padding = 40;
    var lineHeightPx = size * lh;
    
    // 按行分割
    var lines = text.split('\n');
    
    // 计算画布宽度（取最宽一行）
    ctx.font = size + 'px "' + currentFontName + '", sans-serif';
    var maxLineWidth = 0;
    lines.forEach(function(line) {
      var w = ctx.measureText(line).width + (line.length * ls);
      if (w > maxLineWidth) maxLineWidth = w;
    });

    var canvasWidth = Math.ceil(maxLineWidth + padding * 2);
    var canvasHeight = Math.ceil(lines.length * lineHeightPx + padding * 2);

    // 限制最大尺寸防止崩溃
    if (canvasWidth > 4000) canvasWidth = 4000;
    if (canvasHeight > 4000) canvasHeight = 4000;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 背景
    if (bg !== 'transparent') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 字体配置
    ctx.font = size + 'px "' + currentFontName + '", sans-serif';
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    if (strokeEnable.checked) {
      ctx.strokeStyle = strokeColor.value;
      ctx.lineWidth = parseFloat(strokeWidth.value);
      ctx.lineJoin = 'round';
    }

    // 逐行绘制
    var y = padding;
    lines.forEach(function(line) {
      // 计算起始 X 坐标（处理对齐）
      var lineW = ctx.measureText(line).width + (line.length * ls);
      var startX = padding;
      if (align === 'center') startX = (canvas.width - lineW) / 2;
      else if (align === 'right') startX = canvas.width - padding - lineW;

      // 逐字绘制以支持字间距
      var currentX = startX;
      for (var i = 0; i < line.length; i++) {
        var char = line[i];
        if (strokeEnable.checked) ctx.strokeText(char, currentX, y);
        ctx.fillText(char, currentX, y);
        currentX += ctx.measureText(char).width + ls;
      }
      y += lineHeightPx;
    });

    // 导出
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'font_preview_' + Date.now() + '.png';
    a.click();
    showToast('PNG 已导出');
  });

})();