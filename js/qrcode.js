(function () {
  // ================= 通用 Tab 切换 =================
  var tabBtns = document.querySelectorAll('.qr-tabs button');
  var panels = document.querySelectorAll('.qr-panel');
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ================= 生成二维码逻辑 =================
  var textInput = document.getElementById('qr-text');
  var styleSelect = document.getElementById('qr-style');
  var eccSelect = document.getElementById('qr-ecc');
  var fgColor = document.getElementById('qr-color-fg');
  var bgColor = document.getElementById('qr-color-bg');
  var canvas = document.getElementById('qr-canvas');
  var ctx = canvas.getContext('2d');
  var downloadBtn = document.getElementById('qr-download');

  function drawQR() {
    var text = textInput.value.trim();
    if (!text) {
      ctx.fillStyle = '#fdf8ec';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8a7a5f';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请输入内容', canvas.width / 2, canvas.height / 2);
      return;
    }

    var typeNumber = 0;
    var ecc = eccSelect.value;
    var qr = qrcode(typeNumber, ecc);
    qr.addData(text);
    qr.make();

    var count = qr.getModuleCount();
    var cellSize = 400 / (count + 4);
    var margin = cellSize * 2;
    
    ctx.fillStyle = bgColor.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = fgColor.value;
    var style = styleSelect.value;

    function drawFinderPattern(row, col) {
      var x = margin + col * cellSize;
      var y = margin + row * cellSize;
      var size = cellSize * 7;

      ctx.fillStyle = fgColor.value;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = bgColor.value;
      ctx.fillRect(x + cellSize, y + cellSize, size - cellSize * 2, size - cellSize * 2);
      ctx.fillStyle = fgColor.value;
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, size - cellSize * 4, size - cellSize * 4);
    }

    function inFinderPattern(row, col) {
      return (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);
    }

    for (var row = 0; row < count; row++) {
      for (var col = 0; col < count; col++) {
        if (qr.isDark(row, col) && !inFinderPattern(row, col)) {
          var x = margin + col * cellSize;
          var y = margin + row * cellSize;
          
          if (style === 'dot') {
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.9, 0, Math.PI * 2);
            ctx.fill();
          } else if (style === 'rounded') {
            ctx.beginPath();
            ctx.roundRect(x + cellSize * 0.1, y + cellSize * 0.1, cellSize * 0.8, cellSize * 0.8, cellSize * 0.2);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
    }

    drawFinderPattern(0, 0);
    drawFinderPattern(0, count - 7);
    drawFinderPattern(count - 7, 0);
  }

  [textInput, styleSelect, eccSelect, fgColor, bgColor].forEach(function(el) {
    el.addEventListener('input', drawQR);
  });

  downloadBtn.addEventListener('click', function () {
    if (!textInput.value.trim()) return alert('请输入内容');
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'qrcode_' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });


  // ================= 识别二维码逻辑 (纯 JS ZXing) =================
  var dropZone = document.getElementById('scan-drop-zone');
  var scanInput = document.getElementById('scan-input');
  var scanStatusText = document.getElementById('scan-status-text');
  var resultArea = document.getElementById('scan-result-area');
  var resultText = document.getElementById('scan-result-text');
  var resultLink = document.getElementById('scan-result-link');
  var copyBtn = document.getElementById('scan-copy');

  var codeReader = new ZXing.BrowserQRCodeReader();

  dropZone.addEventListener('click', function () { scanInput.click(); });
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function(e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleScanFile(e.dataTransfer.files[0]);
    }
  });
  scanInput.addEventListener('change', function () {
    if (scanInput.files && scanInput.files[0]) handleScanFile(scanInput.files[0]);
  });

  function handleScanFile(file) {
    if (!file.type.match('image.*')) return alert('请选择图片文件。');
    
    scanStatusText.textContent = '⏳ 正在识别...';
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        // ZXing 的 BrowserQRCodeReader 可以直接解码 Image 元素
        codeReader.decodeFromImage(img)
          .then(function (result) {
            scanStatusText.textContent = '📁 点击选择或拖拽二维码图片到这里';
            if (result && result.text) {
              showResult(result.text);
            } else {
              alert('未能识别出二维码。请确保二维码完整且无严重遮挡/模糊。');
              resultArea.hidden = true;
            }
          })
          .catch(function (err) {
            console.error(err);
            scanStatusText.textContent = '📁 点击选择或拖拽二维码图片到这里';
            alert('未能识别出二维码。请确保二维码完整且无严重遮挡/模糊。');
            resultArea.hidden = true;
          });
      };
      img.onerror = function() { alert('无法读取图片，文件可能损坏。'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function showResult(data) {
    resultArea.hidden = false;
    resultText.value = data;
    if (data.match(/^https?:\/\//i)) {
      resultLink.href = data;
      resultLink.hidden = false;
    } else {
      resultLink.hidden = true;
    }
  }

  copyBtn.addEventListener('click', function () {
    resultText.select();
    document.execCommand('copy');
    var originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ 已复制';
    setTimeout(function () { copyBtn.textContent = originalText; }, 2000);
  });

  drawQR();
})();