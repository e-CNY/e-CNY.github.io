(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function downloadBlob(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // ================= DOM 元素 =================
  var dropZone = document.getElementById('da-drop-zone');
  var fileInput = document.getElementById('da-input');
  var actions = document.getElementById('da-actions');
  var preview = document.getElementById('da-preview');
  var sourceView = document.getElementById('da-source');
  var status = document.getElementById('da-status');
  var loadingOverlay = document.getElementById('loading-overlay');
  var btnViewMode = document.getElementById('btn-view-mode');
  
  var btnCopyHtml = document.getElementById('btn-copy-html');
  var btnCopyRich = document.getElementById('btn-copy-rich');
  var btnCopyMd = document.getElementById('btn-copy-md');
  var btnDownloadHtml = document.getElementById('btn-download-html');
  var btnDownloadMd = document.getElementById('btn-download-md');

  // ================= 状态变量 =================
  var currentHtml = '';
  var currentMarkdown = '';
  var isSourceMode = false;
  var fileName = 'document';

  // ================= 拖拽与上传逻辑 =================
  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) handleFile(this.files[0]);
    this.value = '';
  });

  // 全页拖拽
  window.addEventListener('dragover', function(e) { e.preventDefault(); });
  window.addEventListener('drop', function(e) { e.preventDefault(); });

  dropZone.addEventListener('dragover', function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  
  // 监听整个右侧区域的拖拽
  document.body.addEventListener('dragover', function() { dropZone.classList.add('dragover'); });
  document.body.addEventListener('dragleave', function(e) {
    if (e.clientX === 0 && e.clientY === 0) dropZone.classList.remove('dragover');
  });
  document.body.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  // ================= 解析与渲染 =================
  function handleFile(file) {
    if (!file.name.endsWith('.docx')) {
      return showToast('请上传 .docx 格式的 Word 文件', true);
    }
    
    fileName = file.name.replace('.docx', '');
    status.textContent = '正在解析文档: ' + file.name;
    loadingOverlay.style.display = 'flex';
    
    // 暂存当前 HTML 用于对比
    currentHtml = '';
    currentMarkdown = '';
    preview.innerHTML = '';
    sourceView.value = '';
    actions.style.display = 'none';
    btnViewMode.style.display = 'none';
    isSourceMode = false;
    btnViewMode.textContent = '👁️ 源码模式';
    sourceView.style.display = 'none';
    preview.style.display = 'block';

    var reader = new FileReader();
    reader.onload = function (e) {
      var arrayBuffer = e.target.result;
      
      // 调用 Mammoth 解析
      mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, {
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        }),
        // 增加标题级别的解析
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh"
        ]
      }).then(function (result) {
        currentHtml = result.value;
        preview.innerHTML = currentHtml;
        
        // 尝试转换为 Markdown
        if (typeof TurndownService !== 'undefined') {
          try {
            var turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
            currentMarkdown = turndownService.turndown(currentHtml);
            btnCopyMd.disabled = false;
            btnDownloadMd.disabled = false;
          } catch(e) {
            console.warn('Markdown 转换失败', e);
            btnCopyMd.disabled = true;
            btnDownloadMd.disabled = true;
          }
        } else {
          btnCopyMd.disabled = true;
          btnDownloadMd.disabled = true;
        }

        status.textContent = '✅ 解析成功: ' + file.name;
        actions.style.display = 'block';
        btnViewMode.style.display = 'block';
        btnDownloadHtml.disabled = false;
        btnDownloadMd.disabled = false;
        loadingOverlay.style.display = 'none';
        showToast('文档解析成功');
      }).catch(function (err) {
        console.error(err);
        status.textContent = '❌ 解析失败';
        showToast('解析失败: ' + err.message, true);
        loadingOverlay.style.display = 'none';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // ================= 视图切换 =================
  btnViewMode.addEventListener('click', function() {
    isSourceMode = !isSourceMode;
    if (isSourceMode) {
      this.textContent = '👁️ 预览模式';
      sourceView.value = currentHtml;
      sourceView.style.display = 'block';
      preview.style.display = 'none';
    } else {
      this.textContent = '👁️ 源码模式';
      sourceView.style.display = 'none';
      preview.style.display = 'block';
    }
  });

  // ================= 复制与下载 =================
  btnCopyHtml.addEventListener('click', function () {
    if (!currentHtml) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentHtml).then(function() {
        showToast('HTML 代码已复制到剪贴板');
      }).catch(function() {
        fallbackCopy(currentHtml);
      });
    } else {
      fallbackCopy(currentHtml);
    }
  });

  btnCopyMd.addEventListener('click', function () {
    if (!currentMarkdown) return showToast('Markdown 转换未完成', true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentMarkdown).then(function() {
        showToast('Markdown 代码已复制');
      }).catch(function() {
        fallbackCopy(currentMarkdown);
      });
    } else {
      fallbackCopy(currentMarkdown);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('代码已复制');
  }

  btnCopyRich.addEventListener('click', function () {
    if (!currentHtml) return;
    
    // 使用剪贴板 API 复制富文本 (现代浏览器支持)
    if (navigator.clipboard && window.ClipboardItem) {
      var blob = new Blob([currentHtml], { type: 'text/html' });
      var item = new ClipboardItem({ 'text/html': blob });
      navigator.clipboard.write([item]).then(function() {
        showToast('✅ 富文本已复制，可直接粘贴到 Word');
      }).catch(function(err) {
        console.warn('ClipboardItem 失败，回退到 execCommand', err);
        legacyCopyRichText();
      });
    } else {
      legacyCopyRichText();
    }
    
    function legacyCopyRichText() {
      var div = document.createElement('div');
      div.innerHTML = currentHtml;
      div.style.position = 'fixed';
      div.style.left = '-9999px';
      div.style.top = '0';
      document.body.appendChild(div);
      
      var range = document.createRange();
      range.selectNodeContents(div);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      
      try {
        document.execCommand('copy');
        showToast('✅ 富文本已复制，可直接粘贴到 Word');
      } catch (e) {
        showToast('复制失败，请尝试使用 HTML 导出', true);
      }
      document.body.removeChild(div);
    }
  });

  btnDownloadHtml.addEventListener('click', function () {
    if (!currentHtml) return;
    
    // 组装完整的 HTML 导出文件
    var fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
    h1, h2, h3 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 24px; }
    p { margin-bottom: 16px; }
    img { max-width: 100%; height: auto; border-radius: 6px; margin: 12px 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px 12px; }
    th { background: #f8f9fa; }
    blockquote { border-left: 4px solid #ccc; margin: 16px 0; padding: 8px 16px; background: #f9f9f9; color: #666; }
  </style>
</head>
<body>
${currentHtml}
</body>
</html>`;
    
    downloadBlob(fullHtml, fileName + '.html', 'text/html;charset=utf-8');
    showToast('HTML 文件已下载');
  });

  btnDownloadMd.addEventListener('click', function () {
    if (!currentMarkdown) return showToast('Markdown 转换未完成', true);
    downloadBlob(currentMarkdown, fileName + '.md', 'text/markdown;charset=utf-8');
    showToast('Markdown 文件已下载');
  });

})();