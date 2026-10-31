(function () {
  var dropZone = document.getElementById('ft-drop-zone');
  var fileInput = document.getElementById('ft-input');
  var infoBox = document.getElementById('ft-info');
  var nameEl = document.getElementById('ft-name');
  var sizeEl = document.getElementById('ft-size');
  var preview = document.getElementById('ft-preview');
  var sizeSlider = document.getElementById('ft-font-size');
  var sizeVal = document.getElementById('ft-size-val');

  var currentFontName = '';

  // 大小滑块
  sizeSlider.addEventListener('input', function () {
    preview.style.fontSize = this.value + 'px';
    sizeVal.textContent = this.value + 'px';
  });

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

    infoBox.style.display = 'block';
    nameEl.textContent = file.name;
    sizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        // 生成唯一的字体名称，防止缓存冲突
        currentFontName = 'CustomFont_' + Date.now();
        var fontFace = new FontFace(currentFontName, e.target.result);
        
        fontFace.load().then(function (loadedFace) {
          document.fonts.add(loadedFace);
          // 应用到预览区
          preview.style.fontFamily = '"' + currentFontName + '", system-ui, sans-serif';
        }).catch(function (err) {
          alert('字体加载失败，请确保文件有效！');
          console.error(err);
        });
      } catch (err) {
        alert('解析字体文件时出错！');
      }
    };
    reader.readAsArrayBuffer(file);
  }
})();