(function () {
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
  var ctx = canvas.getContext('2d');
  var placeholder = document.getElementById('wm-placeholder');
  var downloadBtn = document.getElementById('wm-download');

  var img = null;
  var currentPosition = 'bottom-right';
  var customFontName = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  var fontLoadToken = 0;

  posButtons.forEach(function (btn) {
    if (btn.dataset.pos === currentPosition) btn.classList.add('active');
  });

  // ========== 1. 图片上传 ==========
  dropZone.addEventListener('click', function () { imageInput.click(); });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    var dt = e.dataTransfer;
    if (dt.files && dt.files.length > 0) handleImageFile(dt.files[0]);
  });
  imageInput.addEventListener('change', function () {
    if (imageInput.files && imageInput.files[0]) handleImageFile(imageInput.files[0]);
  });

  function handleImageFile(file) {
    // 放宽文件类型限制，只要有可能是图片就行
    if (file.type && !file.type.match('image.*') && !file.name.match(/\.(jpe?g|png|gif|webp|bmp|svg|avif|heic|heif|tiff)$/i)) {
      return alert('请选择图片文件。');
    }
    if (file.size > 20 * 1024 * 1024) {
      return alert('图片大小超过 20MB，请压缩后再试。');
    }

    var url = URL.createObjectURL(file);
    var tempImg = new Image();
    
    tempImg.onload = function () {
      img = tempImg;
      URL.revokeObjectURL(url);
      placeholder.style.display = 'none';
      canvas.style.display = 'block';
      downloadBtn.disabled = false;
      
      // 兼容 SVG 等可能没有 naturalWidth 的格式
      var w = img.naturalWidth || 800;
      var h = img.naturalHeight || 600;
      
      canvas.width = w;
      canvas.height = h;
      draw();
    };
    
    tempImg.onerror = function () {
      alert('无法读取该图片。可能是格式不受您的浏览器支持（如 Windows 下的 HEIC），请尝试转换为 JPG 或 PNG。');
      URL.revokeObjectURL(url);
      imageInput.value = '';
    };
    tempImg.src = url;
  }

  // ========== 2. 字体上传 ==========
  fontInput.addEventListener('change', function () {
    var file = fontInput.files && fontInput.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('字体文件超过 10MB，可能导致加载卡顿，请换更小的字体。');
      fontInput.value = '';
      return;
    }

    var token = ++fontLoadToken;
    fontNameEl.textContent = '正在加载字体…';

    var reader = new FileReader();
    reader.onload = function (e) {
      var arrayBuffer = e.target.result;
      var uniqueFontName = 'CustomWMFont_' + token;
      var fontFace = new FontFace(uniqueFontName, arrayBuffer);
      
      fontFace.load().then(function (loadedFace) {
        document.fonts.add(loadedFace);
        if (token === fontLoadToken) {
          customFontName = '"' + uniqueFontName + '", sans-serif';
          fontNameEl.textContent = '✅ ' + file.name;
          draw();
        }
      }).catch(function (err) {
        if (token === fontLoadToken) {
          alert('字体解析失败，请确认是有效的 TTF/OTF/WOFF 文件。');
          fontNameEl.textContent = '';
          fontInput.value = '';
        }
        console.error('Font loading error:', err);
      });
    };
    reader.readAsArrayBuffer(file);
  });

  // ========== 3. 参数调节 ==========
  [textInput, colorInput, sizeInput, opacityInput].forEach(function(el) {
    el.addEventListener('input', draw);
  });

  posButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      posButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentPosition = btn.dataset.pos;
      draw();
    });
  });

  // ========== 4. 绘制核心逻辑 ==========
  function draw() {
    if (!img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 显式指定宽高兼容 SVG

    var text = textInput.value.trim();
    if (!text) return;

    var color = colorInput.value;
    var fontSize = parseInt(sizeInput.value, 10);
    var opacity = parseInt(opacityInput.value, 10) / 100;

    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.font = 'bold ' + fontSize + 'px ' + customFontName;
    ctx.textBaseline = 'middle';

    var padding = Math.max(10, canvas.width * 0.03); 
    var metrics = ctx.measureText(text);
    var textWidth = metrics.width;

    if (currentPosition === 'tile') {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-30 * Math.PI / 180);
      
      var stepX = textWidth + fontSize * 2;
      var stepY = fontSize * 3;
      var maxDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2;
      
      ctx.textAlign = 'center';
      for (var x = -maxDist; x < maxDist; x += stepX) {
        for (var y = -maxDist; y < maxDist; y += stepY) {
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();
    } else {
      var x, y;
      
      if (currentPosition.indexOf('left') !== -1) {
        x = padding;
        ctx.textAlign = 'left';
      } else if (currentPosition.indexOf('right') !== -1) {
        x = canvas.width - padding;
        ctx.textAlign = 'right';
      } else {
        x = canvas.width / 2;
        ctx.textAlign = 'center';
      }

      if (currentPosition.indexOf('top') !== -1) {
        y = padding + fontSize / 2;
      } else if (currentPosition.indexOf('bottom') !== -1) {
        y = canvas.height - padding - fontSize / 2;
      } else {
        y = canvas.height / 2;
      }

      ctx.fillText(text, x, y);
    }
    ctx.globalAlpha = 1.0;
  }

  // ========== 5. 下载 ==========
  downloadBtn.addEventListener('click', function () {
    if (!img) return;
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'watermarked_' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  });

})();