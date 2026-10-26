(function () {
  if (!window.PDFLib) {
    alert('严重错误：PDF-lib 库未加载！请检查 js/libs/pdf-lib.min.js 文件名是否正确。');
    return;
  }

  var files = [];          
  var currentAction = null; 

  var dropZone = document.getElementById('pdf-drop-zone');
  var fileInput = document.getElementById('pdf-input');
  var dropText = document.getElementById('pdf-drop-text');
  var dropHint = document.getElementById('pdf-drop-hint');
  var fileListEl = document.getElementById('pdf-file-list');
  var paramsEl = document.getElementById('pdf-params');
  var previewEl = document.getElementById('pdf-preview');
  var executeBtn = document.getElementById('pdf-execute');
  var statusEl = document.getElementById('pdf-status');
  var actionBtns = document.querySelectorAll('.pdf-action-btn');

  // ================= 文件上传 =================
  dropZone.addEventListener('click', function () { fileInput.click(); });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (e) { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.prototype.slice.call(e.dataTransfer.files));
    }
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFiles(Array.prototype.slice.call(fileInput.files));
    }
    fileInput.value = '';
  });

  function handleFiles(newFiles) {
    var isImgMode = (currentAction === 'img-to-pdf');
    
    var validFiles = newFiles.filter(function (f) {
      if (isImgMode) {
        return f.type.match('image/jpeg') || f.type.match('image/png');
      } else {
        return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      }
    });

    if (validFiles.length === 0) {
      return alert(isImgMode ? '请选择 JPG 或 PNG 图片。' : '请选择 PDF 文件。');
    }

    validFiles.forEach(function (f) {
      if (f.size > 50 * 1024 * 1024) {
        alert('文件 "' + f.name + '" 超过 50MB，已跳过。');
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        files.push({
          file: f,
          arrayBuffer: e.target.result,
          name: f.name,
          size: f.size
        });
        renderFileList();
        
        if (!isImgMode && files.length === 1) {
          showPdfInfo(files[0].arrayBuffer);
        } else if (isImgMode && files.length === 1) {
          var url = URL.createObjectURL(f);
          var img = new Image();
          img.src = url;
          img.onload = function() {
            previewEl.innerHTML = '';
            previewEl.appendChild(img);
            var info = document.createElement('p');
            info.className = 'pdf-placeholder';
            info.textContent = '图片尺寸: ' + img.width + ' x ' + img.height;
            previewEl.appendChild(info);
            URL.revokeObjectURL(url);
          };
        }
      };
      reader.readAsArrayBuffer(f); 
    });
  }

  function renderFileList() {
    fileListEl.innerHTML = '';
    files.forEach(function (item, index) {
      var div = document.createElement('div');
      div.className = 'pdf-file-item';
      div.innerHTML =
        '<span>' + escapeHtml(item.name) + ' <span class="size">(' + formatSize(item.size) + ')</span></span>' +
        '<button data-index="' + index + '" class="pdf-remove-file">✕</button>';
      fileListEl.appendChild(div);
    });
    fileListEl.querySelectorAll('.pdf-remove-file').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.dataset.index, 10);
        files.splice(idx, 1);
        renderFileList();
        if (files.length > 0) {
          if (currentAction !== 'img-to-pdf') showPdfInfo(files[0].arrayBuffer);
        } else {
          previewEl.innerHTML = '<p class="pdf-placeholder">上传文件并选择操作后，这里会显示文件信息</p>';
          executeBtn.disabled = true;
        }
      });
    });
    executeBtn.disabled = files.length === 0 || !currentAction;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ================= 纯文本预览 (不依赖 pdf.js) =================
  function showPdfInfo(arrayBuffer) {
    previewEl.innerHTML = '<p class="pdf-placeholder">正在读取文件信息…</p>';
    // 使用 pdf-lib 解析页数，因为不需要渲染画面，速度极快
    PDFLib.PDFDocument.load(arrayBuffer.slice(0)).then(function(pdf) {
      previewEl.innerHTML = '<p class="pdf-placeholder" style="color:#7ba05b;font-weight:bold;">✅ 文件已成功加载，共 ' + pdf.getPageCount() + ' 页</p>';
    }).catch(function(err) {
      previewEl.innerHTML = '<p class="pdf-placeholder" style="color:#a8452a;">读取文件信息失败：' + err.message + '</p>';
    });
  }

  // ================= 操作选择与参数面板 =================
  actionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      actionBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      
      var newAction = btn.dataset.action;
      var isImgMode = (newAction === 'img-to-pdf');
      var wasImgMode = (currentAction === 'img-to-pdf');
      
      if (currentAction !== newAction && files.length > 0) {
        if (isImgMode !== wasImgMode) {
          files = [];
          renderFileList();
          previewEl.innerHTML = '<p class="pdf-placeholder">请上传新类型的文件</p>';
          executeBtn.disabled = true;
        }
      }
      
      currentAction = newAction;

      if (isImgMode) {
        dropText.textContent = '📁 点击选择或拖拽 JPG / PNG 图片到这里';
        dropHint.textContent = '支持多选，将按上传顺序生成 PDF';
        fileInput.accept = 'image/jpeg, image/png';
      } else {
        dropText.textContent = '📁 点击选择或拖拽 PDF 文件到这里';
        dropHint.textContent = '支持多选，单个文件最大 50MB';
        fileInput.accept = '.pdf,application/pdf';
      }

      renderParams();
    });
  });

  function renderParams() {
    paramsEl.innerHTML = '';
    paramsEl.classList.add('active');

    if (currentAction === 'merge') {
      paramsEl.innerHTML = '<p class="pdf-placeholder" style="margin:0;color:#6b5d47;font-size:.85rem;">将按上传顺序合并所有 PDF 文件。</p>';
    }
    else if (currentAction === 'split') {
      paramsEl.innerHTML = '<div class="pdf-param-row"><label>页码范围</label><input type="text" id="pdf-range" placeholder="如 1-3,5,7-9" value="1"></div>';
    }
    else if (currentAction === 'rotate') {
      paramsEl.innerHTML = '<div class="pdf-param-row"><label>旋转角度</label><select id="pdf-rotate-angle"><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></div><div class="pdf-param-row"><label>页码范围</label><input type="text" id="pdf-rotate-range" placeholder="留空 = 所有页" value=""></div>';
    }
    else if (currentAction === 'page-number') {
      paramsEl.innerHTML = '<div class="pdf-param-row"><label>位置</label><select id="pdf-num-pos"><option value="bottom-center">底部居中</option><option value="bottom-right">右下角</option><option value="bottom-left">左下角</option></select></div><div class="pdf-param-row"><label>起始页码</label><input type="number" id="pdf-num-start" value="1" min="1"></div><div class="pdf-param-row"><label>字号</label><input type="number" id="pdf-num-size" value="12" min="6" max="48"></div>';
    }
    else if (currentAction === 'delete') {
      paramsEl.innerHTML = '<div class="pdf-param-row"><label>删除页码</label><input type="text" id="pdf-delete-range" placeholder="如 2,4-6" value=""></div>';
    }
    else if (currentAction === 'watermark') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>水印文字</label><input type="text" id="pdf-wm-text" value="CONFIDENTIAL"></div>' +
        '<div class="pdf-param-row">' +
          '<label>位置</label>' +
          '<select id="pdf-wm-pos">' +
            '<option value="tile" selected>全屏平铺</option>' +
            '<option value="center">正中心</option>' +
            '<option value="top-left">左上角</option>' +
            '<option value="top-right">右上角</option>' +
            '<option value="bottom-left">左下角</option>' +
            '<option value="bottom-right">右下角</option>' +
          '</select>' +
        '</div>' +
        '<div class="pdf-param-row"><label>不透明度</label><input type="range" id="pdf-wm-opacity" min="10" max="100" value="30"><span id="pdf-wm-opacity-val">30%</span></div>' +
        '<div class="pdf-param-row"><label>字号</label><input type="number" id="pdf-wm-size" value="60" min="20" max="200"></div>' +
        '<div class="pdf-param-row"><label>旋转角度</label><input type="number" id="pdf-wm-rotate" value="45" min="0" max="90"></div>' +
        '<div class="pdf-param-row"><label>颜色</label><input type="color" id="pdf-wm-color" value="#999999"></div>';
      
      document.getElementById('pdf-wm-opacity').addEventListener('input', function () {
        document.getElementById('pdf-wm-opacity-val').textContent = this.value + '%';
      });
    }
    else if (currentAction === 'img-to-pdf') {
      paramsEl.innerHTML = '<p class="pdf-placeholder" style="margin:0;color:#6b5d47;font-size:.85rem;">图片将按上传顺序，每张图生成一页匹配尺寸的 PDF。</p>';
    }
  }

  function parseRange(str, maxPage) {
    var pages = [];
    if (!str || !str.trim()) {
      for (var i = 0; i < maxPage; i++) pages.push(i);
      return pages;
    }
    str.split(',').forEach(function (part) {
      part = part.trim();
      if (part.indexOf('-') !== -1) {
        var bounds = part.split('-');
        var start = parseInt(bounds[0], 10) || 1;
        var end = parseInt(bounds[1], 10) || maxPage;
        for (var j = start; j <= end && j <= maxPage; j++) pages.push(j - 1);
      } else {
        var num = parseInt(part, 10);
        if (num >= 1 && num <= maxPage) pages.push(num - 1);
      }
    });
    return pages;
  }

  // ================= 执行核心操作 =================
  executeBtn.addEventListener('click', async function () {
    if (files.length === 0 || !currentAction) return;
    executeBtn.disabled = true;
    statusEl.textContent = '⏳ 正在处理…';
    statusEl.classList.remove('warn');

    try {
      if (currentAction === 'merge') await doMerge();
      else if (currentAction === 'split') await doSplit();
      else if (currentAction === 'rotate') await doRotate();
      else if (currentAction === 'delete') await doDelete();
      else if (currentAction === 'page-number') await doPageNumber();
      else if (currentAction === 'watermark') await doWatermark();
      else if (currentAction === 'img-to-pdf') await doImagesToPdf();
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ 处理失败：' + (err.message || '未知错误');
      statusEl.classList.add('warn');
    } finally {
      executeBtn.disabled = false;
    }
  });

  async function doMerge() {
    var merged = await PDFLib.PDFDocument.create();
    for (var i = 0; i < files.length; i++) {
      var src = await PDFLib.PDFDocument.load(files[i].arrayBuffer.slice(0));
      var pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach(function (p) { merged.addPage(p); });
    }
    var bytes = await merged.save();
    downloadBlob(bytes, 'merged.pdf', 'application/pdf');
    statusEl.textContent = '✅ 合并完成，已下载。';
  }

  async function doSplit() {
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var indices = parseRange(document.getElementById('pdf-range').value, src.getPageCount());
    if (indices.length === 0) throw new Error('页码范围为空或无效。');
    var newDoc = await PDFLib.PDFDocument.create();
    var pages = await newDoc.copyPages(src, indices);
    pages.forEach(function (p) { newDoc.addPage(p); });
    var bytes = await newDoc.save();
    downloadBlob(bytes, 'extracted.pdf', 'application/pdf');
    statusEl.textContent = '✅ 拆分完成，已下载。';
  }

  async function doRotate() {
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var angle = parseInt(document.getElementById('pdf-rotate-angle').value, 10);
    var indices = parseRange(document.getElementById('pdf-rotate-range').value, src.getPageCount());
    var pages = src.getPages();
    indices.forEach(function (i) {
      if (pages[i]) {
        var current = pages[i].getRotation().angle;
        pages[i].setRotation(PDFLib.degrees((current + angle) % 360));
      }
    });
    var bytes = await src.save();
    downloadBlob(bytes, 'rotated.pdf', 'application/pdf');
    statusEl.textContent = '✅ 旋转完成，已下载。';
  }

  async function doDelete() {
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var toDelete = parseRange(document.getElementById('pdf-delete-range').value, src.getPageCount());
    if (toDelete.length === 0) throw new Error('请指定要删除的页码。');
    if (toDelete.length >= src.getPageCount()) throw new Error('不能删除所有页面。');
    toDelete.sort(function (a, b) { return b - a; }).forEach(function (i) { src.removePage(i); });
    var bytes = await src.save();
    downloadBlob(bytes, 'deleted.pdf', 'application/pdf');
    statusEl.textContent = '✅ 删除完成，已下载。';
  }

  async function doPageNumber() {
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var pos = document.getElementById('pdf-num-pos').value;
    var start = parseInt(document.getElementById('pdf-num-start').value, 10) || 1;
    var size = parseInt(document.getElementById('pdf-num-size').value, 10) || 12;
    var font = await src.embedFont(PDFLib.StandardFonts.Helvetica);
    var pages = src.getPages();

    pages.forEach(function (page, i) {
      var text = String(start + i);
      var width = font.widthOfTextAtSize(text, size);
      var pw = page.getWidth(), ph = page.getHeight(), margin = 20;
      var x, y;
      if (pos === 'bottom-center') { x = (pw - width) / 2; y = margin; }
      else if (pos === 'bottom-right') { x = pw - width - margin; y = margin; }
      else { x = margin; y = margin; }
      page.drawText(text, { x: x, y: y, size: size, font: font, color: PDFLib.rgb(0.4, 0.4, 0.4) });
    });

    var bytes = await src.save();
    downloadBlob(bytes, 'numbered.pdf', 'application/pdf');
    statusEl.textContent = '✅ 页码添加完成，已下载。';
  }

  async function doWatermark() {
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var text = document.getElementById('pdf-wm-text').value.trim();
    if (!text) throw new Error('水印文字不能为空。');

    var pos = document.getElementById('pdf-wm-pos').value;
    var opacity = parseInt(document.getElementById('pdf-wm-opacity').value, 10) / 100;
    var fontSize = parseInt(document.getElementById('pdf-wm-size').value, 10) || 60;
    var rotateDeg = parseInt(document.getElementById('pdf-wm-rotate').value, 10) || 45;
    var hex = document.getElementById('pdf-wm-color').value;
    var rgb = hexToRgb(hex);
    
    var font = await src.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var pages = src.getPages();

    pages.forEach(function (page) {
      var pw = page.getWidth(), ph = page.getHeight();
      var textWidth = font.widthOfTextAtSize(text, fontSize);
      var textHeight = font.heightAtSize(fontSize);
      
      if (pos === 'tile') {
        var stepX = textWidth + 100, stepY = textHeight + 100;
        for (var x = 20; x < pw; x += stepX) {
          for (var y = 20; y < ph; y += stepY) {
            page.drawText(text, { x: x, y: y, size: fontSize, font: font, color: PDFLib.rgb(rgb.r, rgb.g, rgb.b), opacity: opacity, rotate: PDFLib.degrees(rotateDeg) });
          }
        }
      } else {
        var margin = 30;
        var x = 0, y = 0;

        if (pos === 'center') {
          x = (pw - textWidth) / 2;
          y = (ph - textHeight) / 2;
        } else {
          if (pos.indexOf('left') !== -1) x = margin;
          else if (pos.indexOf('right') !== -1) x = pw - textWidth - margin;
          
          if (pos.indexOf('top') !== -1) y = ph - textHeight - margin;
          else if (pos.indexOf('bottom') !== -1) y = margin;
        }

        page.drawText(text, { x: x, y: y, size: fontSize, font: font, color: PDFLib.rgb(rgb.r, rgb.g, rgb.b), opacity: opacity, rotate: PDFLib.degrees(rotateDeg) });
      }
    });

    var bytes = await src.save();
    downloadBlob(bytes, 'watermarked.pdf', 'application/pdf');
    statusEl.textContent = '✅ 水印添加完成，已下载。';
  }

  async function doImagesToPdf() {
    var pdfDoc = await PDFLib.PDFDocument.create();
    for (var i = 0; i < files.length; i++) {
      var item = files[i];
      var arrBuf = item.arrayBuffer.slice(0);
      
      var img;
      if (item.file.type === 'image/png') {
        img = await pdfDoc.embedPng(arrBuf);
      } else {
        img = await pdfDoc.embedJpg(arrBuf);
      }
      
      var page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    var bytes = await pdfDoc.save();
    downloadBlob(bytes, 'images_combined.pdf', 'application/pdf');
    statusEl.textContent = '✅ 图片已合并为 PDF，已下载。';
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r: r, g: g, b: b };
  }

  function downloadBlob(data, filename, mimeType) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '') + '_' + Date.now() + (filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '');
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();