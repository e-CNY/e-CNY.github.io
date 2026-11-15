(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  // ================= DOM 元素 =================
  var fontSelect = document.getElementById('cg-font-family');
  var fontInput = document.getElementById('cg-font-input');
  var fontNameLabel = document.getElementById('cg-font-name');
  var textInput = document.getElementById('cg-text');
  var wordCount = document.getElementById('cg-word-count');
  
  var gridStyleSelect = document.getElementById('cg-grid-style');
  var modeSelect = document.getElementById('cg-mode');
  var layoutSelect = document.getElementById('cg-layout');
  var bgColorInput = document.getElementById('cg-bg-color');
  var gridColorInput = document.getElementById('cg-grid-color');
  
  var exportFormat = document.getElementById('cg-export-format');
  var btnPreview = document.getElementById('btn-preview');
  var btnDownload = document.getElementById('btn-download');
  
  var canvas = document.getElementById('cg-canvas');
  var ctx = canvas.getContext('2d');
  
  var paginationBox = document.getElementById('cg-pagination');
  var btnPrevPage = document.getElementById('btn-prev-page');
  var btnNextPage = document.getElementById('btn-next-page');
  var pageInfo = document.getElementById('cg-page-info');

  // ================= 状态变量 =================
  var customFontName = '';
  var currentFontFamily = fontSelect.value;
  var charsPerPage = 100;
  var cols = 10;
  var rows = 10;
  var pagesData = [];
  var currentPageIndex = 0;

  // ================= 1. 字体加载逻辑 =================
  fontSelect.addEventListener('change', function() {
    currentFontFamily = this.value;
    // 如果选择了内置字体，清空自定义字体的显示
    if (customFontName) {
      fontNameLabel.textContent = '已回退至内置字体';
      customFontName = '';
    }
    if (pagesData.length > 0) drawPage(currentPageIndex);
  });

  fontInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      var fontBuffer = e.target.result;
      var uniqueName = 'CustomFont_' + Date.now();
      
      try {
        var fontFace = new FontFace(uniqueName, fontBuffer);
        fontFace.load().then(function (loadedFace) {
          document.fonts.add(loadedFace);
          customFontName = '"' + uniqueName + '"';
          fontNameLabel.textContent = '✅ ' + file.name;
          showToast('自定义字体加载成功');
          if (pagesData.length > 0) drawPage(currentPageIndex);
        }).catch(function (err) {
          showToast('字体解析失败，请确认格式正确');
          fontNameLabel.textContent = '解析失败';
        });
      } catch (err) {
        showToast('浏览器不支持该字体格式');
      }
    };
    reader.readAsArrayBuffer(file);
  });

  // ================= 2. 字数统计 =================
  textInput.addEventListener('input', function () {
    var len = this.value.replace(/\s/g, '').length; 
    wordCount.textContent = len + '/2000字';
    if (len > 2000) {
      wordCount.style.color = 'red';
    } else {
      wordCount.style.color = '#8a5a2b';
    }
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

  function drawGrid(startX, startY, size, style, color) {
    if (style === 'none') return;
    
    ctx.strokeStyle = color; 
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, size, size);

    if (style === 'tian' || style === 'mi') {
      ctx.beginPath();
      // 横线
      ctx.moveTo(startX + size / 2, startY);
      ctx.lineTo(startX + size / 2, startY + size);
      // 竖线
      ctx.moveTo(startX, startY + size / 2);
      ctx.lineTo(startX + size, startY + size / 2);
      ctx.stroke();
    }
    if (style === 'mi') {
      ctx.beginPath();
      // 对角线
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + size, startY + size);
      ctx.moveTo(startX + size, startY);
      ctx.lineTo(startX, startY + size);
      ctx.stroke();
    }
  }

  function drawPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= pagesData.length) return;
    currentPageIndex = pageIndex;
    
    var pageChars = pagesData[pageIndex];
    var padding = 50;
    var cellSize = 100;
    var gap = 10;
    
    canvas.width = padding * 2 + cols * cellSize + (cols - 1) * gap;
    canvas.height = padding * 2 + rows * cellSize + (rows - 1) * gap;

    // 绘制背景
    var bgColor = bgColorInput.value;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var style = gridStyleSelect.value;
    var mode = modeSelect.value;
    var gColor = gridColorInput.value;

    // 优先使用自定义字体，否则使用内置选择
    var activeFont = customFontName ? (customFontName + ', ' + fontSelect.value) : fontSelect.value;

    for (var i = 0; i < charsPerPage; i++) {
      var r = Math.floor(i / cols);
      var c = i % cols;
      var x = padding + c * (cellSize + gap);
      var y = padding + r * (cellSize + gap);

      // 画格子
      drawGrid(x, y, cellSize, style, gColor);

      var char = pageChars[i];
      if (char && mode !== 'blank') {
        ctx.font = (cellSize * 0.75) + 'px ' + activeFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (mode === 'trace') {
          // 浅灰描红
          ctx.fillStyle = '#d1d5db';
          ctx.fillText(char, x + cellSize / 2, y + cellSize / 2 + cellSize * 0.05);
        } else if (mode === 'copy') {
          // 临摹模式：奇数项是原字(浅灰)，偶数项是空格
          // 这里的逻辑在 splitIntoPages 已经处理好了，如果是字符则画浅灰
          ctx.fillStyle = '#d1d5db';
          ctx.fillText(char, x + cellSize / 2, y + cellSize / 2 + cellSize * 0.05);
        } else if (mode === 'dashed') {
          // 虚线轮廓
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.strokeText(char, x + cellSize / 2, y + cellSize / 2 + cellSize * 0.05);
          ctx.setLineDash([]);
        }
      }
    }
    
    // 更新分页 UI
    pageInfo.textContent = `第 ${pageIndex + 1} 页 / 共 ${pagesData.length} 页`;
    btnPrevPage.disabled = (pageIndex === 0);
    btnNextPage.disabled = (pageIndex === pagesData.length - 1);
  }

  // ================= 4. 事件绑定 =================
  btnPreview.addEventListener('click', function () {
    var text = textInput.value.trim();
    if (!text) return showToast('请输入要练习的文字');

    getLayoutConfig();
    splitIntoPages(text);

    if (pagesData.length === 0) return;

    showToast('正在生成预览...');
    document.fonts.ready.then(function() {
      drawPage(0);
      paginationBox.style.display = 'flex';
      btnDownload.disabled = false;
      showToast('预览生成成功');
    });
  });

  btnPrevPage.addEventListener('click', function() {
    if (currentPageIndex > 0) drawPage(currentPageIndex - 1);
  });

  btnNextPage.addEventListener('click', function() {
    if (currentPageIndex < pagesData.length - 1) drawPage(currentPageIndex + 1);
  });

  // 更改配置自动重绘
  [gridStyleSelect, modeSelect, bgColorInput, gridColorInput].forEach(function(el) {
    el.addEventListener('input', function() {
      if (pagesData.length > 0) drawPage(currentPageIndex);
    });
  });

  // ================= 5. 多格式导出逻辑 =================
  btnDownload.addEventListener('click', async function () {
    if (pagesData.length === 0) return;

    var format = exportFormat.value;
    var originalText = btnDownload.textContent;
    btnDownload.textContent = '⏳ 正在生成文件...';
    btnDownload.disabled = true;

    try {
      await document.fonts.ready;

      if (format === 'pdf') {
        var jsPDF = window.jspdf.jsPDF;
        var pdf = new jsPDF('p', 'mm', 'a4');
        var a4W = 210, a4H = 297;
        var margin = 10;

        for (var i = 0; i < pagesData.length; i++) {
          if (i > 0) pdf.addPage();
          
          // 为了导出不改变当前用户的预览，我们用离屏 Canvas 或者直接绘制再恢复
          // 这里直接 drawPage(i) 会改变当前显示画面，最后再恢复即可
          drawPage(i);
          var imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          var canvasRatio = canvas.width / canvas.height;
          var finalW = a4W - margin * 2;
          var finalH = finalW / canvasRatio;
          
          if (finalH > a4H - margin * 2) { 
            finalH = a4H - margin * 2; 
            finalW = finalH * canvasRatio; 
          }

          var xOffset = margin + ((a4W - margin * 2) - finalW) / 2;
          var yOffset = margin + ((a4H - margin * 2) - finalH) / 2;
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalW, finalH);
        }
        pdf.save('书法字帖_' + Date.now() + '.pdf');

      } else if (format === 'png' || format === 'jpg') {
        if (typeof JSZip === 'undefined') throw new Error('JSZip 库未加载');
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
        setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
      }
      
      showToast('文件生成成功，已开始下载');
    } catch (e) {
      console.error(e);
      showToast('生成失败: ' + e.message);
    } finally {
      // 恢复显示第一页或当前页
      drawPage(currentPageIndex);
      btnDownload.textContent = originalText;
      btnDownload.disabled = false;
    }
  });

  // ================= 6. 初始化默认值 =================
  textInput.value = "永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭，修禊事也。群贤毕至，少长咸集。此地有崇山峻岭，茂林修竹，又有清流激湍，映带左右，引以为流觞曲水，列坐其次。虽无丝竹管弦之盛，一觞一咏，亦足以畅叙幽情。";
  textInput.dispatchEvent(new Event('input'));

})();