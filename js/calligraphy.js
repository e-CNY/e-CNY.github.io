(function () {
  var fontInput = document.getElementById('cg-font-input');
  var fontNameLabel = document.getElementById('cg-font-name');
  var textInput = document.getElementById('cg-text');
  var wordCount = document.getElementById('cg-word-count');
  var gridStyleSelect = document.getElementById('cg-grid-style');
  var modeSelect = document.getElementById('cg-mode');
  var layoutSelect = document.getElementById('cg-layout');
  var exportFormat = document.getElementById('cg-export-format');
  var btnPreview = document.getElementById('btn-preview');
  var btnDownload = document.getElementById('btn-download');
  var canvas = document.getElementById('cg-canvas');
  var ctx = canvas.getContext('2d');
  var pageInfo = document.getElementById('cg-page-info');

  var currentFontName = '"LXGW WenKai", "Microsoft YaHei", sans-serif';
  var charsPerPage = 100;
  var cols = 10;
  var rows = 10;
  var pagesData = []; 

  // ================= 1. 字体加载逻辑 =================
  fontInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      var fontBuffer = e.target.result;
      var uniqueName = 'CustomFont_' + Date.now();
      
      var fontFace = new FontFace(uniqueName, fontBuffer);
      fontFace.load().then(function (loadedFace) {
        document.fonts.add(loadedFace);
        currentFontName = '"' + uniqueName + '", "Microsoft YaHei", sans-serif';
        fontNameLabel.textContent = '✅ ' + file.name;
        btnDownload.disabled = true; 
      }).catch(function (err) {
        alert('字体解析失败，请确认格式正确');
        fontNameLabel.textContent = '解析失败';
      });
    };
    reader.readAsArrayBuffer(file);
  });

  // ================= 2. 字数统计 =================
  textInput.addEventListener('input', function () {
    var len = this.value.replace(/\s/g, '').length; 
    wordCount.textContent = len + '/2000字';
    if (len > 2000) wordCount.style.color = 'red';
    else wordCount.style.color = '#8a5a2b';
    btnDownload.disabled = true;
  });

  // ================= 3. 预览与分页核心逻辑 =================
  function getLayoutConfig() {
    var val = layoutSelect.value.split('x');
    cols = parseInt(val[0], 10);
    rows = parseInt(val[1], 10);
    charsPerPage = cols * rows;
  }

  function splitIntoPages(text) {
    var rawChars = text.replace(/[\r\n]/g, '').split('');
    var processedChars = [];
    var mode = modeSelect.value;

    // 【核心修复】如果是临摹模式，自动在每个字后面插入一个空格
    if (mode === 'copy') {
      rawChars.forEach(function(char) {
        processedChars.push(char);
        processedChars.push(''); // 留空供练习
      });
    } else {
      processedChars = rawChars;
    }

    pagesData = [];
    for (var i = 0; i < processedChars.length; i += charsPerPage) {
      pagesData.push(processedChars.slice(i, i + charsPerPage));
    }
  }

  function drawGrid(startX, startY, size, style) {
    ctx.strokeStyle = '#e2e8f0'; 
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, size, size);

    if (style === 'tian' || style === 'mi') {
      ctx.beginPath();
      ctx.moveTo(startX + size / 2, startY);
      ctx.lineTo(startX + size / 2, startY + size);
      ctx.moveTo(startX, startY + size / 2);
      ctx.lineTo(startX + size, startY + size / 2);
      ctx.stroke();
    }
    if (style === 'mi') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + size, startY + size);
      ctx.moveTo(startX + size, startY);
      ctx.lineTo(startX, startY + size);
      ctx.stroke();
    }
  }

  function drawPage(pageIndex) {
    var pageChars = pagesData[pageIndex];
    var padding = 50;
    var cellSize = 100;
    var gap = 10;
    
    canvas.width = padding * 2 + cols * cellSize + (cols - 1) * gap;
    canvas.height = padding * 2 + rows * cellSize + (rows - 1) * gap;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var style = gridStyleSelect.value;
    var mode = modeSelect.value;

    for (var i = 0; i < charsPerPage; i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      var x = padding + c * (cellSize + gap);
      var y = padding + r * (cellSize + gap);

      drawGrid(x, y, cellSize, style);

      var char = pageChars[i];
      if (char && mode !== 'blank') {
        // 描红：全是浅灰；临摹模式下的文字（刚刚扩展的奇数项）也是浅灰
        ctx.fillStyle = mode === 'trace' ? '#d1d5db' : (mode === 'copy' ? '#d1d5db' : '#000000');
        ctx.font = (cellSize * 0.75) + 'px ' + currentFontName;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, x + cellSize / 2, y + cellSize / 2 + cellSize * 0.05);
      }
    }
    
    pageInfo.textContent = `正在预览：第 ${pageIndex + 1} 页 / 共 ${pagesData.length} 页`;
  }

  btnPreview.addEventListener('click', function () {
    var text = textInput.value.trim();
    if (!text) return alert('请输入要练习的文字');

    getLayoutConfig();
    splitIntoPages(text);

    if (pagesData.length === 0) return;

    document.fonts.ready.then(function() {
      drawPage(0);
      btnDownload.disabled = false;
    });
  });

  // ================= 4. 多格式导出逻辑 =================
  btnDownload.addEventListener('click', async function () {
    if (pagesData.length === 0) return;

    var format = exportFormat.value;
    btnDownload.textContent = '⏳ 正在生成文件...';
    btnDownload.disabled = true;

    try {
      await document.fonts.ready;

      if (format === 'pdf') {
        var jsPDF = window.jspdf.jsPDF;
        var pdf = new jsPDF('p', 'mm', 'a4');
        var a4W = 190, a4H = 277;

        for (var i = 0; i < pagesData.length; i++) {
          if (i > 0) pdf.addPage();
          drawPage(i);
          var imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          var canvasRatio = canvas.width / canvas.height;
          var finalW = a4W;
          var finalH = a4W / canvasRatio;
          if (finalH > a4H) { finalH = a4H; finalW = a4H * canvasRatio; }

          var xOffset = 10 + (a4W - finalW) / 2;
          var yOffset = 10 + (a4H - finalH) / 2;
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalW, finalH);
        }
        pdf.save('calligraphy_pages_' + Date.now() + '.pdf');

      } else if (format === 'png' || format === 'jpg') {
        var zip = new JSZip();
        var ext = format === 'png' ? 'png' : 'jpg';
        var mime = format === 'png' ? 'image/png' : 'image/jpeg';

        for (var i = 0; i < pagesData.length; i++) {
          drawPage(i);
          var dataUrl = canvas.toDataURL(mime, 0.95);
          var base64Data = dataUrl.split(',')[1];
          zip.file('calligraphy_page_' + (i + 1) + '.' + ext, base64Data, { base64: true });
        }

        var content = await zip.generateAsync({ type: 'blob' });
        var url = URL.createObjectURL(content);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'calligraphy_images_' + Date.now() + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
    } catch (e) {
      console.error(e);
      alert('生成失败: ' + e.message);
    } finally {
      drawPage(0);
      btnDownload.textContent = '⬇️ 开始下载';
      btnDownload.disabled = false;
    }
  });

})();