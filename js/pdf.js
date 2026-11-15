(function () {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isWarn) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isWarn) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2000);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function downloadBlob(data, filename, mimeType) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
  }

  // 检查基础库
  if (!window.PDFLib || !window.pdfjsLib || !window.JSZip) {
    alert('严重错误：基础库未加载！请检查 pdf-lib、pdfjs、jszip 库是否在 js/libs 目录。');
    return;
  }

  // 配置 pdf.js 的 worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = '../../js/libs/pdf.worker.min.js';

  // ================== 状态变量 ==================
  var files = [];          
  var currentAction = 'merge'; 

  // ================== DOM 元素 ==================
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

  // ================== 1. 文件上传与列表管理 ==================
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
      if (isImgMode) return f.type.match('image/jpeg') || f.type.match('image/png');
      return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    });

    if (validFiles.length === 0) {
      return showToast(isImgMode ? '请选择 JPG 或 PNG 图片。' : '请选择 PDF 文件。', true);
    }

    var loadedCount = 0;
    validFiles.forEach(function (f) {
      if (f.size > 50 * 1024 * 1024) {
        showToast('文件 "' + f.name + '" 超过 50MB，已跳过。', true);
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
        loadedCount++;
        
        if (loadedCount === validFiles.length) {
          renderFileList();
          if (files.length > 0) updatePreview();
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
      
      var nameSpan = document.createElement('span');
      nameSpan.className = 'fname';
      nameSpan.textContent = item.name;
      nameSpan.title = item.name;
      
      var sizeSpan = document.createElement('span');
      sizeSpan.className = 'fsize';
      sizeSpan.textContent = formatSize(item.size);
      
      var ops = document.createElement('div');
      ops.className = 'fops';
      
      if (index > 0) {
        var upBtn = document.createElement('button');
        upBtn.className = 'up'; upBtn.textContent = '↑'; upBtn.title = '上移';
        upBtn.onclick = function() { swap(index, index - 1); };
        ops.appendChild(upBtn);
      }
      if (index < files.length - 1) {
        var downBtn = document.createElement('button');
        downBtn.className = 'down'; downBtn.textContent = '↓'; downBtn.title = '下移';
        downBtn.onclick = function() { swap(index, index + 1); };
        ops.appendChild(downBtn);
      }
      
      var delBtn = document.createElement('button');
      delBtn.className = 'del'; delBtn.textContent = '✕'; delBtn.title = '移除';
      delBtn.onclick = function() {
        files.splice(index, 1);
        renderFileList();
        if (files.length > 0) updatePreview();
        else {
          previewEl.innerHTML = '<p class="pdf-placeholder">请上传文件后查看预览</p>';
          executeBtn.disabled = true;
        }
      };
      ops.appendChild(delBtn);

      div.appendChild(nameSpan);
      div.appendChild(sizeSpan);
      div.appendChild(ops);
      fileListEl.appendChild(div);
    });
    
    executeBtn.disabled = files.length === 0 || !currentAction;
  }

  function swap(i, j) {
    var temp = files[i];
    files[i] = files[j];
    files[j] = temp;
    renderFileList();
    updatePreview();
  }

  // ================== 2. 预览逻辑 ==================
  function updatePreview() {
    if (files.length === 0) return;
    
    if (currentAction === 'img-to-pdf') {
      var url = URL.createObjectURL(files[0].file);
      previewEl.innerHTML = '<p class="pdf-placeholder" style="color:#7ba05b;">图片已就绪，点击下方按钮生成 PDF</p>';
      var img = document.createElement('img');
      img.className = 'img-thumbnail';
      img.src = url;
      img.onload = function() { previewEl.appendChild(img); };
    } else {
      previewEl.innerHTML = '<p class="pdf-placeholder">正在读取 PDF 预览…</p>';
      renderPdfThumb(files[0].arrayBuffer.slice(0));
    }
  }

  function renderPdfThumb(arrayBuffer) {
    pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function(pdf) {
      pdf.getPage(1).then(function(page) {
        var viewport = page.getViewport({ scale: 1.5 });
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        var renderContext = { canvasContext: ctx, viewport: viewport };
        page.render(renderContext).promise.then(function() {
          previewEl.innerHTML = '';
          
          var info = document.createElement('p');
          info.className = 'pdf-placeholder';
          info.style.color = '#7ba05b';
          info.style.fontWeight = 'bold';
          info.textContent = '✅ 共 ' + pdf.numPages + ' 页 (当前预览第 1 页)';
          
          previewEl.appendChild(info);
          previewEl.appendChild(canvas);
          canvas.className = 'pdf-thumbnail';
        });
      });
    }).catch(function(err) {
      previewEl.innerHTML = '<p class="pdf-placeholder" style="color:#a8452a;">预览失败：' + err.message + '</p>';
    });
  }

  // ================== 3. 操作切换与参数面板 ==================
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
          previewEl.innerHTML = '<p class="pdf-placeholder">切换了文件类型，请重新上传</p>';
          executeBtn.disabled = true;
        }
      }
      
      currentAction = newAction;
      
      if (isImgMode) {
        dropText.textContent = '点击 / 拖拽图片文件';
        dropHint.textContent = '支持 JPG / PNG，自动按顺序生成';
        fileInput.accept = 'image/jpeg, image/png';
      } else {
        dropText.textContent = '点击 / 拖拽 PDF 文件';
        dropHint.textContent = '支持多选，单个最大 50MB';
        fileInput.accept = '.pdf,application/pdf';
      }

      renderParams();
      if (files.length > 0) updatePreview();
    });
  });

  function renderParams() {
    paramsEl.innerHTML = '';
    paramsEl.classList.add('active');

    if (currentAction === 'merge') {
      paramsEl.innerHTML = '<p style="margin:0;color:#6b5d47;font-size:.85rem;">将按列表顺序合并所有 PDF。</p>';
    }
    else if (currentAction === 'split') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>拆分模式</label>' +
          '<select id="pdf-split-mode">' +
            '<option value="extract">提取指定页 (生成 1 个 PDF)</option>' +
            '<option value="unzip">按页拆分 (生成 ZIP 压缩包)</option>' +
          '</select></div>' +
        '<div class="pdf-param-row" id="pdf-range-row"><label>页码</label>' +
          '<input type="text" id="pdf-range" placeholder="如 1-3,5" value="1"></div>';
      
      document.getElementById('pdf-split-mode').addEventListener('change', function() {
        document.getElementById('pdf-range-row').style.display = (this.value === 'extract') ? 'flex' : 'none';
      });
    }
    else if (currentAction === 'rotate') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>角度</label>' +
          '<select id="pdf-rotate-angle"><option value="90">顺时针 90°</option><option value="180">180°</option><option value="270">逆时针 90°</option></select></div>' +
        '<div class="pdf-param-row"><label>页码</label><input type="text" id="pdf-rotate-range" placeholder="留空 = 所有页"></div>';
    }
    else if (currentAction === 'delete') {
      paramsEl.innerHTML = '<div class="pdf-param-row"><label>删除页码</label><input type="text" id="pdf-delete-range" placeholder="如 2,4-6"></div>';
    }
    else if (currentAction === 'page-number') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>位置</label>' +
          '<select id="pdf-num-pos"><option value="bottom-center">底部居中</option><option value="bottom-right">右下角</option><option value="bottom-left">左下角</option></select></div>' +
        '<div class="pdf-param-row"><label>起始号</label><input type="number" id="pdf-num-start" value="1" min="1"></div>' +
        '<div class="pdf-param-row"><label>字号</label><input type="number" id="pdf-num-size" value="12" min="6" max="48"></div>';
    }
    else if (currentAction === 'watermark') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>文字</label><input type="text" id="pdf-wm-text" value="仅供内部使用"></div>' +
        '<div class="pdf-param-row"><label>排版</label>' +
          '<select id="pdf-wm-pos">' +
            '<option value="tile" selected>平铺全屏</option>' +
            '<option value="center">正中心</option>' +
            '<option value="top-left">左上角</option>' +
            '<option value="bottom-right">右下角</option>' +
          '</select></div>' +
        '<div class="pdf-param-row"><label>透明度</label><input type="range" id="pdf-wm-opacity" min="10" max="100" value="20"><span id="pdf-wm-opacity-val">20%</span></div>' +
        '<div class="pdf-param-row"><label>字号</label><input type="number" id="pdf-wm-size" value="60" min="20" max="200"></div>' +
        '<div class="pdf-param-row"><label>角度</label><input type="number" id="pdf-wm-rotate" value="45" min="0" max="90"></div>' +
        '<div class="pdf-param-row"><label>颜色</label><input type="color" id="pdf-wm-color" value="#999999"></div>';
      
      document.getElementById('pdf-wm-opacity').addEventListener('input', function () {
        document.getElementById('pdf-wm-opacity-val').textContent = this.value + '%';
      });
    }
    else if (currentAction === 'pdf-to-img') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>输出格式</label>' +
          '<select id="pdf-img-format"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div>' +
        '<div class="pdf-param-row"><label>清晰度倍数</label>' +
          '<select id="pdf-img-scale"><option value="1">1x (标准)</option><option value="2" selected>2x (高清)</option><option value="3">3x (超清)</option></select></div>' +
        '<p style="margin:0;color:#6b5d47;font-size:.8rem;">多页 PDF 将自动打包为 ZIP 下载。</p>';
    }
    else if (currentAction === 'img-to-pdf') {
      paramsEl.innerHTML = 
        '<div class="pdf-param-row"><label>页面大小</label>' +
          '<select id="pdf-page-size">' +
            '<option value="original">按图片原始尺寸</option>' +
            '<option value="a4" selected>统一为 A4 (适应页面)</option>' +
          '</select></div>';
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
    // 去重排序
    return pages.filter(function(item, pos) { return pages.indexOf(item) === pos; }).sort(function(a,b){return a-b;});
  }

  // ================== 4. 执行核心操作 ==================
  executeBtn.addEventListener('click', async function () {
    if (files.length === 0 || !currentAction) return;
    executeBtn.disabled = true;
    statusEl.textContent = '⏳ 正在处理中，请稍候…';
    statusEl.classList.remove('warn');

    try {
      if (currentAction === 'merge') await doMerge();
      else if (currentAction === 'split') await doSplit();
      else if (currentAction === 'rotate') await doRotate();
      else if (currentAction === 'delete') await doDelete();
      else if (currentAction === 'page-number') await doPageNumber();
      else if (currentAction === 'watermark') await doWatermark();
      else if (currentAction === 'pdf-to-img') await doPdfToImg();
      else if (currentAction === 'img-to-pdf') await doImagesToPdf();
      
      statusEl.textContent = '✅ 处理完成，已触发下载。';
      showToast('处理完成！');
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ 失败：' + (err.message || '未知错误');
      statusEl.classList.add('warn');
      showToast('处理失败，请查看提示', true);
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
    downloadBlob(bytes, 'merged_' + Date.now() + '.pdf', 'application/pdf');
  }

  async function doSplit() {
    var mode = document.getElementById('pdf-split-mode').value;
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var totalPages = src.getPageCount();

    if (mode === 'extract') {
      var rangeStr = document.getElementById('pdf-range').value;
      var indices = parseRange(rangeStr, totalPages);
      if (indices.length === 0) throw new Error('页码无效或为空。');
      
      var newDoc = await PDFLib.PDFDocument.create();
      var pages = await newDoc.copyPages(src, indices);
      pages.forEach(function (p) { newDoc.addPage(p); });
      var bytes = await newDoc.save();
      downloadBlob(bytes, 'extracted_' + Date.now() + '.pdf', 'application/pdf');
    } else {
      // 拆分为多个文件，打包 ZIP
      var zip = new JSZip();
      for (var i = 0; i < totalPages; i++) {
        var newDoc = await PDFLib.PDFDocument.create();
        var pages = await newDoc.copyPages(src, [i]);
        newDoc.addPage(pages[0]);
        var bytes = await newDoc.save();
        zip.file('page_' + (i+1) + '.pdf', bytes);
      }
      var content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, 'split_pages_' + Date.now() + '.zip', 'application/zip');
    }
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
    downloadBlob(bytes, 'rotated_' + Date.now() + '.pdf', 'application/pdf');
  }

  async function doDelete() {
    var src = await PDFLib.PDFDocument.load(files[0].arrayBuffer.slice(0));
    var toDelete = parseRange(document.getElementById('pdf-delete-range').value, src.getPageCount());
    if (toDelete.length === 0) throw new Error('请指定要删除的页码。');
    if (toDelete.length >= src.getPageCount()) throw new Error('不能删除所有页面。');
    
    // 从后往前删
    toDelete.sort(function (a, b) { return b - a; }).forEach(function (i) { src.removePage(i); });
    var bytes = await src.save();
    downloadBlob(bytes, 'deleted_' + Date.now() + '.pdf', 'application/pdf');
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
    downloadBlob(bytes, 'numbered_' + Date.now() + '.pdf', 'application/pdf');
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
    
    var rgb = {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255
    };
    
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
    downloadBlob(bytes, 'watermarked_' + Date.now() + '.pdf', 'application/pdf');
  }

  async function doPdfToImg() {
    var format = document.getElementById('pdf-img-format').value;
    var scale = parseFloat(document.getElementById('pdf-img-scale').value);
    var ext = format === 'image/jpeg' ? 'jpg' : 'png';
    
    var srcBuf = files[0].arrayBuffer.slice(0);
    var pdf = await pdfjsLib.getDocument({ data: srcBuf }).promise;
    var zip = new JSZip();
    
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var viewport = page.getViewport({ scale: scale * 1.5 }); // 基础清晰度补偿
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      
      var blob = await new Promise(function(res) { canvas.toBlob(res, format, 0.92); });
      zip.file('page_' + i + '.' + ext, blob);
    }
    
    if (pdf.numPages === 1) {
      // 只有一页直接下载图片
      var singleBlob = await zip.file('page_1.' + ext).async('blob');
      downloadBlob(singleBlob, 'pdf_image.' + ext, format);
    } else {
      var content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, 'pdf_images_' + Date.now() + '.zip', 'application/zip');
    }
  }

  async function doImagesToPdf() {
    var pageSize = document.getElementById('pdf-page-size').value;
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
      
      if (pageSize === 'a4') {
        var a4Width = 595.28, a4Height = 841.89;
        var page = pdfDoc.addPage([a4Width, a4Height]);
        
        // 计算适应缩放
        var imgW = img.width, imgH = img.height;
        var scale = Math.min(a4Width / imgW, a4Height / imgH);
        var drawW = imgW * scale, drawH = imgH * scale;
        var x = (a4Width - drawW) / 2;
        var y = (a4Height - drawH) / 2;
        
        page.drawImage(img, { x: x, y: y, width: drawW, height: drawH });
      } else {
        var page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
    }
    
    var bytes = await pdfDoc.save();
    downloadBlob(bytes, 'images_combined_' + Date.now() + '.pdf', 'application/pdf');
  }

})();