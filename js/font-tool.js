(function () {
  var dropZone = document.getElementById('ft-drop-zone');
  var fileInput = document.getElementById('ft-input');
  var editorPanel = document.getElementById('ft-editor');
  var infoPanel = document.getElementById('ft-info');
  var preview = document.getElementById('ft-preview');
  var customText = document.getElementById('ft-custom-text');

  // 滑块与颜色
  var sizeInput = document.getElementById('ft-size');
  var lhInput = document.getElementById('ft-line-height');
  var lsInput = document.getElementById('ft-letter-spacing');
  var colorInput = document.getElementById('ft-color');
  var bgInput = document.getElementById('ft-bg');
  var btnReset = document.getElementById('btn-reset-style');

  var currentFontName = '';

  // ================= 1. 上传与解析 =================
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
      return alert('请上传 TTF / OTF / WOFF 格式的字体文件');
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var buffer = e.target.result;
      
      // 1. 用于预览的 FontFace
      currentFontName = 'CustomFont_' + Date.now();
      try {
        var fontFace = new FontFace(currentFontName, buffer);
        fontFace.load().then(function (loadedFace) {
          document.fonts.add(loadedFace);
          applyStyles();
        }).catch(function (err) {
          console.error(err);
          alert('浏览器无法解析该字体进行预览');
        });
      } catch (err) {}

      // 2. 用于读取底层信息的 Opentype.js
      try {
        var font = opentype.parse(buffer);
        showFontInfo(font, file.size);
      } catch (err) {
        console.warn('Opentype.js 解析元数据失败', err);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ================= 2. 展示底层信息 =================
  function showFontInfo(font, fileSize) {
    infoPanel.style.display = 'block';
    
    var family = font.names.fontFamily ? font.names.fontFamily.en : '未知';
    var version = font.names.version ? font.names.version.en : '未知';
    var copyright = font.names.copyright ? font.names.copyright.en : '无版权信息';
    var glyphs = font.glyphs.length;

    document.getElementById('info-family').textContent = family;
    document.getElementById('info-version').textContent = version;
    document.getElementById('info-copyright').textContent = copyright;
    document.getElementById('info-glyphs').textContent = glyphs + ' 个字符 (' + (fileSize/1024).toFixed(1) + ' KB)';
  }

  // ================= 3. 排版编辑控制 =================
  editorPanel.style.display = 'block';
  
  function applyStyles() {
    if (!currentFontName) return;
    
    preview.style.fontFamily = '"' + currentFontName + '", sans-serif';
    preview.style.fontSize = sizeInput.value + 'px';
    preview.style.lineHeight = lhInput.value;
    preview.style.letterSpacing = lsInput.value + 'px';
    preview.style.color = colorInput.value;
    
    // 背景色应用在包裹层，防止文字和背景色混在一起
    preview.parentElement.style.background = bgInput.value;

    // 更新文本
    preview.textContent = customText.value || '请输入文字...';

    // 更新数值显示
    document.getElementById('val-size').textContent = sizeInput.value + 'px';
    document.getElementById('val-lh').textContent = lhInput.value;
    document.getElementById('val-ls').textContent = lsInput.value + 'px';
  }

  // 绑定事件
  [sizeInput, lhInput, lsInput, colorInput, bgInput, customText].forEach(function(el) {
    el.addEventListener('input', applyStyles);
  });

  // 重置样式
  btnReset.addEventListener('click', function () {
    sizeInput.value = 32;
    lhInput.value = 1.5;
    lsInput.value = 0;
    colorInput.value = '#3d3226';
    bgInput.value = '#ffffff';
    applyStyles();
  });

})();