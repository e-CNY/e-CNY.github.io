(function() {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var emptyHint = document.getElementById('empty-hint');
  var canvas = document.getElementById('meme-canvas');
  var ctx = canvas.getContext('2d');
  var settings = document.getElementById('settings');

  var imgFilterEl = document.getElementById('img-filter');
  var textTopEl = document.getElementById('text-top');
  var textMiddleEl = document.getElementById('text-middle');
  var textBottomEl = document.getElementById('text-bottom');
  var fontFamilyEl = document.getElementById('font-family');
  var fontSizeEl = document.getElementById('font-size');
  var fontSizeVal = document.getElementById('font-size-val');
  var textColorEl = document.getElementById('text-color');
  var strokeColorEl = document.getElementById('stroke-color');
  var strokeWidthEl = document.getElementById('stroke-width');
  var strokeVal = document.getElementById('stroke-val');
  var btnDownload = document.getElementById('btn-download');

  var img = null;

  // 1. 上传图片
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
        // 关键修复：通过添加 class 来展示面板，确保样式正确
        settings.classList.add('active');
        
        // 设置画布真实尺寸为原图大小
        canvas.width = img.width;
        canvas.height = img.height;
        
        draw();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  // 2. 监听参数变化
  [imgFilterEl, textTopEl, textMiddleEl, textBottomEl, fontFamilyEl, fontSizeEl, textColorEl, strokeColorEl, strokeWidthEl].forEach(function(el) {
    el.addEventListener('input', function() {
      if (el === fontSizeEl) fontSizeVal.textContent = el.value;
      if (el === strokeWidthEl) strokeVal.textContent = el.value;
      draw();
    });
  });

  // 3. 核心绘制逻辑
  function draw() {
    if (!img) return;

    // 清空画布并应用滤镜绘制原图
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = imgFilterEl.value; 
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none'; 

    // 计算字体大小基准
    var scale = parseInt(fontSizeEl.value, 10) / 100;
    var baseFontSize = canvas.width * scale * 0.2; 
    baseFontSize = Math.max(20, baseFontSize);

    ctx.font = 'bold ' + baseFontSize + 'px ' + fontFamilyEl.value;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColorEl.value;
    
    var strokeW = parseInt(strokeWidthEl.value, 10);
    if (strokeW > 0) {
      ctx.strokeStyle = strokeColorEl.value;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
    }

    var lineHeight = baseFontSize * 1.2;

    // 绘制顶部文字
    if (textTopEl.value.trim()) {
      drawMultilineText(textTopEl.value, canvas.width / 2, 20, lineHeight, strokeW > 0);
    }

    // 绘制底部文字
    if (textBottomEl.value.trim()) {
      var linesBottom = wrapText(textBottomEl.value, canvas.width - 40);
      var startYBottom = canvas.height - 20 - (linesBottom.length * lineHeight);
      
      for (var i = 0; i < linesBottom.length; i++) {
        var y = startYBottom + i * lineHeight;
        drawTextLine(linesBottom[i], canvas.width / 2, y, strokeW > 0);
      }
    }

    // 绘制中间文字
    if (textMiddleEl.value.trim()) {
      var linesMiddle = wrapText(textMiddleEl.value, canvas.width - 40);
      var totalHeight = linesMiddle.length * lineHeight;
      var startYMiddle = (canvas.height - totalHeight) / 2;
      
      for (var i = 0; i < linesMiddle.length; i++) {
        var y = startYMiddle + i * lineHeight;
        drawTextLine(linesMiddle[i], canvas.width / 2, y, strokeW > 0);
      }
    }
  }

  function drawTextLine(text, x, y, hasStroke) {
    if (hasStroke) ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }

  function drawMultilineText(text, x, startY, lineHeight, hasStroke) {
    var lines = wrapText(text, canvas.width - 40);
    for (var i = 0; i < lines.length; i++) {
      var y = startY + i * lineHeight;
      drawTextLine(lines[i], x, y, hasStroke);
    }
  }

  // 文本自动换行
  function wrapText(text, maxWidth) {
    var words = text.split(' ');
    var lines = [];
    var currentLine = '';

    var hasChinese = /[\u4e00-\u9fa5]/.test(text);

    if (hasChinese) {
      for (var i = 0; i < text.length; i++) {
        var char = text[i];
        if (char === '\n') {
          lines.push(currentLine);
          currentLine = '';
          continue;
        }
        var testLine = currentLine + char;
        var metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine !== '') lines.push(currentLine);
    } else {
      for (var i = 0; i < words.length; i++) {
        var testLine = currentLine + words[i] + ' ';
        var metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          lines.push(currentLine.trim());
          currentLine = words[i] + ' ';
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine.trim());
    }
    return lines;
  }

  // 4. 导出下载
  btnDownload.addEventListener('click', function() {
    if (!img) return;
    
    var link = document.createElement('a');
    link.download = 'meme_' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  });

})();