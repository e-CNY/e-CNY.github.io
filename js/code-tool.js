(function () {
  // Tab 切换
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

  // ================= 1. 二维码生成 =================
  var qrText = document.getElementById('qr-text');
  var qrStyle = document.getElementById('qr-style');
  var qrEcc = document.getElementById('qr-ecc');
  var qrFg = document.getElementById('qr-color-fg');
  var qrBg = document.getElementById('qr-color-bg');
  var qrCanvas = document.getElementById('qr-canvas');
  var qrCtx = qrCanvas.getContext('2d');

  function drawQR() {
    var text = qrText.value.trim();
    if (!text) { qrCtx.clearRect(0, 0, 400, 400); return; }
    var qr = qrcode(0, qrEcc.value);
    qr.addData(text); qr.make();

    var count = qr.getModuleCount();
    var cellSize = 400 / (count + 4);
    var margin = cellSize * 2;
    qrCtx.fillStyle = qrBg.value; qrCtx.fillRect(0, 0, 400, 400);
    qrCtx.fillStyle = qrFg.value;
    var style = qrStyle.value;

    function inFinder(r, c) { return (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7); }
    function drawFinder(r, c) {
      var x = margin + c * cellSize, y = margin + r * cellSize, size = cellSize * 7;
      qrCtx.fillStyle = qrFg.value; qrCtx.fillRect(x, y, size, size);
      qrCtx.fillStyle = qrBg.value; qrCtx.fillRect(x + cellSize, y + cellSize, size - cellSize * 2, size - cellSize * 2);
      qrCtx.fillStyle = qrFg.value; qrCtx.fillRect(x + cellSize * 2, y + cellSize * 2, size - cellSize * 4, size - cellSize * 4);
    }

    for (var row = 0; row < count; row++) {
      for (var col = 0; col < count; col++) {
        if (qr.isDark(row, col) && !inFinder(row, col)) {
          var x = margin + col * cellSize, y = margin + row * cellSize;
          if (style === 'dot') { qrCtx.beginPath(); qrCtx.arc(x + cellSize/2, y + cellSize/2, cellSize/2*0.9, 0, Math.PI*2); qrCtx.fill(); }
          else if (style === 'rounded') { qrCtx.beginPath(); qrCtx.roundRect(x+cellSize*0.1, y+cellSize*0.1, cellSize*0.8, cellSize*0.8, cellSize*0.2); qrCtx.fill(); }
          else { qrCtx.fillRect(x, y, cellSize, cellSize); }
        }
      }
    }
    drawFinder(0, 0); drawFinder(0, count - 7); drawFinder(count - 7, 0);
  }

  [qrText, qrStyle, qrEcc, qrFg, qrBg].forEach(function(el) { el.addEventListener('input', drawQR); });
  document.getElementById('qr-download').addEventListener('click', function () {
    if (!qrText.value.trim()) return;
    var a = document.createElement('a'); a.href = qrCanvas.toDataURL('image/png');
    a.download = 'qrcode_' + Date.now() + '.png'; a.click();
  });

  // ================= 2. 二维码识别 (ZXing) =================
  var dropZone = document.getElementById('scan-drop-zone');
  var scanInput = document.getElementById('scan-input');
  var scanStatus = document.getElementById('scan-status-text');
  var resultArea = document.getElementById('scan-result-area');
  var resultText = document.getElementById('scan-result-text');
  var resultLink = document.getElementById('scan-result-link');
  var copyBtn = document.getElementById('scan-copy');
  var isEngineLoaded = false;

  dropZone.addEventListener('click', function () { scanInput.click(); });
  scanInput.addEventListener('change', function () {
    if (scanInput.files && scanInput.files[0]) handleScan(scanInput.files[0]);
    scanInput.value = '';
  });

  function handleScan(file) {
    if (!window.ZXingWASM) return alert('引擎未加载');
    if (!isEngineLoaded) {
      var isFile = location.protocol === 'file:';
      window.ZXingWASM.prepareZXingModule({
        overrides: { locateFile: function(path) {
          if (path.endsWith('.wasm')) return isFile ? 'https://cdn.jsdelivr.net/npm/zxing-wasm@2.1.0/dist/reader/zxing_reader.wasm' : '../../js/libs/zxing_reader.wasm';
          return path;
        }}
      });
      isEngineLoaded = true;
    }
    scanStatus.textContent = '⏳ 正在识别...';
    ZXingWASM.readBarcodesFromImageFile(file, { tryHarder: true, formats: ['QRCode'] }).then(function(res) {
      scanStatus.textContent = '📁 点击选择或拖拽二维码图片到这里';
      if (res && res.length > 0) {
        resultArea.hidden = false; resultText.value = res[0].text;
        if (res[0].text.match(/^https?:\/\//i)) { resultLink.href = res[0].text; resultLink.hidden = false; }
        else resultLink.hidden = true;
      } else {
        alert('未能识别出二维码'); resultArea.hidden = true;
      }
    });
  }
  copyBtn.addEventListener('click', function () {
    resultText.select(); document.execCommand('copy');
    var txt = copyBtn.textContent; copyBtn.textContent = '✅ 已复制';
    setTimeout(function() { copyBtn.textContent = txt; }, 2000);
  });

  // ================= 3. 条形码生成 (JsBarcode) =================
  var barText = document.getElementById('bar-text');
  var barFormat = document.getElementById('bar-format');
  var barColor = document.getElementById('bar-color');
  var barcodeSvg = document.getElementById('barcode-svg');
  var barcodeDownload = document.getElementById('barcode-download');

  function drawBarcode() {
    var text = barText.value.trim();
    if (!text) { barcodeSvg.innerHTML = ''; return; }
    try {
      JsBarcode(barcodeSvg, text, {
        format: barFormat.value,
        lineColor: barColor.value,
        width: 2, height: 100, displayValue: true
      });
      barcodeDownload.disabled = false;
    } catch (e) {
      barcodeSvg.innerHTML = ''; // 输入不符合格式要求时清空
      barcodeDownload.disabled = true;
    }
  }

  [barText, barFormat, barColor].forEach(function(el) { el.addEventListener('input', drawBarcode); });

  barcodeDownload.addEventListener('click', function () {
    var svgData = new XMLSerializer().serializeToString(barcodeSvg);
    var canvas = document.createElement('canvas');
    var svgSize = barcodeSvg.getBoundingClientRect();
    canvas.width = svgSize.width; canvas.height = svgSize.height;
    var img = document.createElement('img');
    img.onload = function () {
      canvas.getContext('2d').drawImage(img, 0, 0);
      var a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = 'barcode_' + Date.now() + '.png'; a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });

  drawQR();
  drawBarcode();
})();