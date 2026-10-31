(function () {
  var dropZone = document.getElementById('lt-drop-zone');
  var fileInput = document.getElementById('lt-input');
  var infoBox = document.getElementById('lt-info');
  var wEl = document.getElementById('lt-w');
  var hEl = document.getElementById('lt-h');
  var frEl = document.getElementById('lt-fr');
  var durEl = document.getElementById('lt-duration');
  var preview = document.getElementById('lt-preview');

  var anim = null;

  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) handleFile(this.files[0]);
    this.value = '';
  });

  function handleFile(file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return alert('请上传有效的 Lottie JSON 文件');
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var jsonData = JSON.parse(e.target.result);
        
        if (!jsonData.w || !jsonData.h) {
          throw new Error('解析成功，但可能不是标准的 Lottie 文件');
        }

        infoBox.style.display = 'block';
        wEl.textContent = jsonData.w;
        hEl.textContent = jsonData.h;
        frEl.textContent = jsonData.fr;
        var duration = jsonData.op / jsonData.fr; // 总帧数 / 帧率
        durEl.textContent = duration.toFixed(2);

        preview.innerHTML = ''; // 清空占位
        var animContainer = document.createElement('div');
        animContainer.style.width = '100%';
        animContainer.style.height = '100%';
        animContainer.style.maxWidth = jsonData.w + 'px';
        preview.appendChild(animContainer);

        if (anim) anim.destroy();

        anim = lottie.loadAnimation({
          container: animContainer,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: jsonData
        });

      } catch (err) {
        alert('JSON 解析失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // 支持拖拽
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener('dragover', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
})();