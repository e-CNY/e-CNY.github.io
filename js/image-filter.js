(function() {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var emptyHint = document.getElementById('empty-hint');
  var canvas = document.getElementById('main-canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var settings = document.getElementById('settings');

  // 预设按钮
  var presetBtns = document.querySelectorAll('.preset-btn');
  
  // 获取所有调节滑块的配置
  var sliders = {
    brightness: { el: document.getElementById('filter-brightness'), val: document.getElementById('val-brightness'), suffix: '%', def: 100 },
    contrast:   { el: document.getElementById('filter-contrast'), val: document.getElementById('val-contrast'), suffix: '%', def: 100 },
    exposure:   { el: document.getElementById('filter-exposure'), val: document.getElementById('val-exposure'), suffix: '', def: 0 },
    saturate:   { el: document.getElementById('filter-saturate'), val: document.getElementById('val-saturate'), suffix: '%', def: 100 },
    temp:       { el: document.getElementById('filter-temp'), val: document.getElementById('val-temp'), suffix: '', def: 0 },
    tint:       { el: document.getElementById('filter-tint'), val: document.getElementById('val-tint'), suffix: '', def: 0 },
    hue:        { el: document.getElementById('filter-hue'), val: document.getElementById('val-hue'), suffix: '°', def: 0 },
    gray:       { el: document.getElementById('filter-gray'), val: document.getElementById('val-gray'), suffix: '%', def: 0 },
    sepia:      { el: document.getElementById('filter-sepia'), val: document.getElementById('val-sepia'), suffix: '%', def: 0 },
    invert:     { el: document.getElementById('filter-invert'), val: document.getElementById('val-invert'), suffix: '%', def: 0 },
    blur:       { el: document.getElementById('filter-blur'), val: document.getElementById('val-blur'), suffix: 'px', def: 0 },
    vignette:   { el: document.getElementById('filter-vignette'), val: document.getElementById('val-vignette'), suffix: '%', def: 0 },
    noise:      { el: document.getElementById('filter-noise'), val: document.getElementById('val-noise'), suffix: '%', def: 0 }
  };

  var btnReset = document.getElementById('btn-reset');
  var exportFormatEl = document.getElementById('export-format');
  var btnDownload = document.getElementById('btn-download');

  var img = null;
  var currentPreset = 'none';
  var noiseCanvas = null; // 预生成的噪点图

  // 生成一个 100x100 的随机噪点画布（用于后续平铺）
  function initNoiseCanvas() {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 100;
    noiseCanvas.height = 100;
    var nCtx = noiseCanvas.getContext('2d');
    var nData = nCtx.createImageData(100, 100);
    for (var i = 0; i < nData.data.length; i += 4) {
      var val = Math.random() * 255;
      nData.data[i] = val;
      nData.data[i+1] = val;
      nData.data[i+2] = val;
      nData.data[i+3] = 255;
    }
    nCtx.putImageData(nData, 0, 0);
  }
  initNoiseCanvas();

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
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        resetAll();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  // ================= 2. 核心渲染 =================
  function render() {
    if (!img) return;

    // 1. 读取所有参数并更新 UI 显示
    var p = {};
    Object.keys(sliders).forEach(function(key) {
      p[key] = parseFloat(sliders[key].el.value);
      sliders[key].val.textContent = p[key] + sliders[key].suffix;
    });

    // 2. 计算曝光对亮度和对比度的隐式修正
    var brightnessVal = p.brightness + (p.exposure * 0.5);
    var contrastVal = p.contrast + (p.exposure * 0.2);
    brightnessVal = Math.max(0, Math.min(300, brightnessVal));
    contrastVal = Math.max(0, Math.min(300, contrastVal));

    // 3. 拼接 CSS 滤镜字符串
    var filterStr = 'brightness(' + brightnessVal + '%) ' +
                    'contrast(' + contrastVal + '%) ' +
                    'saturate(' + p.saturate + '%) ' +
                    'hue-rotate(' + p.hue + 'deg) ' +
                    'grayscale(' + p.gray + '%) ' +
                    'sepia(' + p.sepia + '%) ' +
                    'invert(' + p.invert + '%) ' +
                    'blur(' + p.blur + 'px) ';

    // 4. 叠加预设滤镜的额外 CSS
    if (currentPreset === 'cyberpunk') filterStr += 'contrast(130%) saturate(150%) ';
    else if (currentPreset === 'cinematic') filterStr += 'brightness(90%) contrast(120%) sepia(10%) ';
    else if (currentPreset === 'japanese') filterStr += 'brightness(110%) contrast(90%) saturate(80%) ';
    else if (currentPreset === 'hongkong') filterStr += 'contrast(130%) sepia(30%) ';
    else if (currentPreset === 'blackgold') filterStr += 'grayscale(100%) contrast(120%) ';
    else if (currentPreset === 'morandi') filterStr += 'saturate(60%) contrast(90%) ';
    else if (currentPreset === 'dramatic') filterStr += 'contrast(180%) brightness(90%) ';

    // 5. 绘制基础图像
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = filterStr;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none'; // 重置

    // 6. 叠加色温层 (Temperature)
    if (p.temp !== 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = p.temp > 0 
        ? 'rgba(255, 120, 0, ' + (p.temp / 150) + ')' // 暖色
        : 'rgba(0, 150, 255, ' + (-p.temp / 150) + ')'; // 冷色
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 7. 叠加色调层 (Tint)
    if (p.tint !== 0) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = p.tint > 0 
        ? 'rgba(255, 0, 255, ' + (p.tint / 150) + ')' // 洋红
        : 'rgba(0, 255, 0, ' + (-p.tint / 150) + ')'; // 绿
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }

    // 8. 叠加暗角 (Vignette)
    if (p.vignette > 0) {
      var gradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height)*0.3,
        canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)*0.7
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,' + (p.vignette / 100) + ')');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 9. 叠加噪点 (Noise)
    if (p.noise > 0) {
      ctx.globalAlpha = p.noise / 100;
      ctx.globalCompositeOperation = 'overlay';
      var pattern = ctx.createPattern(noiseCanvas, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ================= 3. 事件监听 =================
  
  // 预设点击
  presetBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      presetBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentPreset = this.dataset.preset;
      
      // 根据不同的预设，自动调整滑块的默认值，但保留用户微调
      if (currentPreset === 'blackgold') {
        sliders.gray.el.value = 100;
      } else if (currentPreset === 'vintage') {
        sliders.sepia.el.value = 50;
        sliders.vignette.el.value = 30;
        sliders.noise.el.value = 20;
      } else if (currentPreset === 'warm') {
        sliders.temp.el.value = 40;
      } else if (currentPreset === 'cool') {
        sliders.temp.el.value = -40;
      } else if (currentPreset === 'blackwhite') {
        sliders.gray.el.value = 100;
        sliders.contrast.el.value = 120;
      } else {
        // 还原除预设外的参数
        sliders.gray.el.value = 0;
        sliders.sepia.el.value = 0;
        sliders.temp.el.value = 0;
        sliders.vignette.el.value = 0;
        sliders.noise.el.value = 0;
      }
      
      render();
    });
  });

  // 滑块拖动
  Object.keys(sliders).forEach(function(key) {
    sliders[key].el.addEventListener('input', render);
  });

  // 重置
  function resetAll() {
    Object.keys(sliders).forEach(function(key) {
      sliders[key].el.value = sliders[key].def;
    });
    
    presetBtns.forEach(function(b) { b.classList.remove('active'); });
    presetBtns[0].classList.add('active');
    currentPreset = 'none';
    
    render();
  }

  btnReset.addEventListener('click', resetAll);

  // ================= 4. 导出下载 =================
  btnDownload.addEventListener('click', function() {
    if (!img) return;

    var format = exportFormatEl.value;
    var mimeType = 'image/' + format;
    var ext = format === 'jpeg' ? 'jpg' : format;

    if (format === 'jpeg') {
      var tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      var tCtx = tempCanvas.getContext('2d');
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.drawImage(canvas, 0, 0);
      
      var url = tempCanvas.toDataURL(mimeType, 0.95);
      downloadUrl(url, 'filtered_' + Date.now() + '.' + ext);
    } else {
      var url = canvas.toDataURL(mimeType, 0.95);
      downloadUrl(url, 'filtered_' + Date.now() + '.' + ext);
    }
  });

  function downloadUrl(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

})();