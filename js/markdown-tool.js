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

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // ================= DOM 元素 =================
  var input = document.getElementById('md-input');
  var preview = document.getElementById('md-preview');
  var container = document.getElementById('md-container');
  var btnToggleView = document.getElementById('btn-toggle-view');
  var autoSaveStatus = document.getElementById('auto-save-status');

  var STORAGE_KEY = 'markdown_editor_data_v1';

  // ================= 默认示例 =================
  var defaultText = `# 欢迎使用 Markdown 编辑器

这是一款**纯前端**的 Markdown 渲染工具，支持 GFM 语法与数学公式。

## 1. 支持的功能

- [x] 表格
- [x] 任务列表 (Task Lists)
- [x] 代码高亮
- [x] 数学公式 (KaTeX)
- [x] 直接粘贴图片

## 2. 表格与公式

| 功能 | 状态 | 备注 |
| :--- | :---: | :--- |
| 公式 | ✅ | $E=mc^2$ |
| 导出 | ✅ | 支持 PDF/Word/HTML |

## 3. 代码块演示

\`\`\`javascript
console.log("Hello Markdown!");
\`\`\`

> 这是一段引用文本，用来测试排版。
`;

  // ================= 初始化与自动保存 =================
  function loadData() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) input.value = saved;
      else input.value = defaultText;
    } catch (e) {
      input.value = defaultText;
    }
    updatePreview();
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, input.value);
      autoSaveStatus.classList.add('show');
      setTimeout(function() { autoSaveStatus.classList.remove('show'); }, 2000);
    } catch (e) {}
  }

  // ================= 核心渲染逻辑 =================
  var renderTimer = null;
  
  function updatePreview() {
    var text = input.value;
    
    // 1. 提取公式防止被 Markdown 解析器破坏格式
    var mathBlocks = [];
    text = text.replace(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g, function(match) {
      mathBlocks.push(match);
      return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    });

    // 2. 解析 Markdown
    marked.setOptions({ gfm: true, breaks: true });
    var html = marked.parse(text);

    // 3. 还原公式为 KaTeX
    html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, function(match, index) {
      var formula = mathBlocks[index];
      if (typeof katex !== 'undefined') {
        try {
          if (formula.startsWith('$$')) {
            return katex.renderToString(formula.slice(2, -2), { displayMode: true, throwOnError: false });
          } else {
            return katex.renderToString(formula.slice(1, -1), { displayMode: false, throwOnError: false });
          }
        } catch(e) {
          return formula;
        }
      }
      return formula;
    });

    // 4. 渲染到预览区
    preview.innerHTML = html;

    // 5. 为所有标题生成 ID 方便目录跳转
    var headers = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(function(h, i) {
      if (!h.id) h.id = 'heading-' + i;
    });
  }

  input.addEventListener('input', function() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function() {
      updatePreview();
      saveData();
    }, 300);
  });

  // ================= 富文本快捷插入工具 =================
  function insertText(prefix, suffix, defaultText) {
    var start = input.selectionStart;
    var end = input.selectionEnd;
    var selected = input.value.substring(start, end) || defaultText;
    
    var newText = prefix + selected + suffix;
    input.value = input.value.substring(0, start) + newText + input.value.substring(end);
    
    input.focus();
    input.selectionStart = start + prefix.length;
    input.selectionEnd = start + prefix.length + selected.length;
    
    updatePreview();
  }

  function insertLineBlock(text) {
    var start = input.selectionStart;
    // 找到当前行的开头
    var lastNewline = input.value.lastIndexOf('\n', start - 1);
    var insertPos = lastNewline === -1 ? 0 : lastNewline + 1;
    
    input.value = input.value.substring(0, insertPos) + text + input.value.substring(insertPos);
    input.focus();
    input.selectionStart = input.selectionEnd = insertPos + text.length;
    
    updatePreview();
  }

  document.querySelectorAll('.md-icon-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = this.dataset.action;
      if (action === 'bold') insertText('**', '**', '加粗文本');
      else if (action === 'italic') insertText('*', '*', '斜体文本');
      else if (action === 'heading') insertLineBlock('## ');
      else if (action === 'quote') insertLineBlock('> ');
      else if (action === 'code') insertText('\n```javascript\n', '\n```\n', 'console.log("Hello");');
      else if (action === 'link') insertText('[', '](https://)', '链接文字');
      else if (action === 'table') {
        insertLineBlock('\n| 标题1 | 标题2 |\n| --- | --- |\n| 内容1 | 内容2 |\n');
      }
    });
  });

  // ================= 粘贴图片支持 =================
  input.addEventListener('paste', function(e) {
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        var blob = items[i].getAsFile();
        var reader = new FileReader();
        reader.onload = function(event) {
          var dataUrl = event.target.result;
          insertText('\n![image](', dataUrl + ')\n', '');
          showToast('图片粘贴成功');
        };
        reader.readAsDataURL(blob);
        e.preventDefault();
        break;
      }
    }
  });

  // ================= 目录生成 =================
  document.getElementById('btn-insert-toc').addEventListener('click', function() {
    var lines = input.value.split('\n');
    var toc = [];
    var headerCount = 0;
    
    lines.forEach(function(line) {
      if (/^#{1,4}\s/.test(line)) {
        var level = line.match(/^#+/)[0].length;
        var text = line.replace(/^#+\s+/, '');
        var indent = '  '.repeat(level - 1);
        var id = 'heading-' + headerCount;
        toc.push(indent + '- [' + text + '](#' + id + ')');
        headerCount++;
      }
    });
    
    if (toc.length === 0) return showToast('没有找到任何标题', true);
    
    insertLineBlock('\n## 目录\n\n' + toc.join('\n') + '\n\n');
    showToast('目录已插入');
  });

  // ================= 清空与视图切换 =================
  document.getElementById('btn-clear').addEventListener('click', function() {
    if (confirm('确定要清空当前内容吗？')) {
      input.value = '';
      updatePreview();
      saveData();
      showToast('已清空');
    }
  });

  btnToggleView.addEventListener('click', function() {
    container.classList.toggle('full-preview');
    if (container.classList.contains('full-preview')) {
      this.textContent = '📝 返回编辑';
    } else {
      this.textContent = '🖥️ 全屏预览';
    }
  });

  // ================= 导出功能 =================
  
  // 1. 导出 Markdown
  document.getElementById('btn-export-md').addEventListener('click', function() {
    var blob = new Blob([input.value], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, 'document_' + Date.now() + '.md');
  });

  // 2. 导出 HTML
  document.getElementById('btn-export-html').addEventListener('click', function() {
    var htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Markdown Export</title>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.7; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #3d3226; }
          pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; }
          code { font-family: monospace; background: #f5ecd5; padding: 2px 4px; border-radius: 4px; color: #a8452a; }
          pre code { background: none; color: inherit; padding: 0; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; }
          th { background: #fdf8ec; }
          blockquote { border-left: 4px solid #8a5a2b; margin: 0 0 16px; padding-left: 16px; color: #6b5d47; background: #f9f3e3; padding: 10px; }
          img { max-width: 100%; border-radius: 8px; }
        </style>
      </head>
      <body>${preview.innerHTML}</body>
      </html>
    `;
    var blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, 'document_' + Date.now() + '.html');
  });

  // 3. 导出 Word
  document.getElementById('btn-export-word').addEventListener('click', function() {
    var header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Export Word</title>
    <style>
      body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.5; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #000; padding: 5px; }
      pre { background: #f4f4f4; padding: 10px; font-family: monospace; }
    </style>
    </head><body>`;
    var footer = "</body></html>";
    var sourceHTML = header + preview.innerHTML + footer;
    
    var blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    downloadBlob(blob, 'document_' + Date.now() + '.doc');
  });

  // 4. 导出 PDF
  document.getElementById('btn-export-pdf').addEventListener('click', function() {
    if (typeof html2pdf === 'undefined') {
      return showToast('PDF 库未加载，请检查 js/libs/html2pdf.bundle.min.js', true);
    }
    
    var btn = this;
    var originalText = btn.textContent;
    btn.textContent = '⏳ 正在生成...';
    btn.disabled = true;

    // 创建一个屏外的容器渲染内容，防止截断和滚动条影响
    var tempDiv = document.createElement('div');
    tempDiv.className = 'markdown-body';
    tempDiv.innerHTML = preview.innerHTML;
    
    // 设置 A4 纸张规格的宽度及样式
    tempDiv.style.width = '794px'; // A4 宽度像素
    tempDiv.style.padding = '40px';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.style.background = '#fff';
    tempDiv.style.color = '#3d3226';
    tempDiv.style.fontFamily = 'system-ui, sans-serif';
    tempDiv.style.fontSize = '14px';
    tempDiv.style.lineHeight = '1.6';
    
    // 放到屏幕外
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    // 给一点时间让图片加载、KaTeX 渲染完毕
    setTimeout(function() {
      var opt = {
        margin:       [10, 0, 10, 0], // 上下边距 10mm
        filename:     'document_' + Date.now() + '.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(tempDiv).save().then(function() {
        document.body.removeChild(tempDiv);
        btn.textContent = originalText;
        btn.disabled = false;
        showToast('PDF 导出成功');
      }).catch(function(err) {
        console.error(err);
        document.body.removeChild(tempDiv);
        btn.textContent = originalText;
        btn.disabled = false;
        showToast('PDF 生成失败，请重试', true);
      });
    }, 300);
  });

  // ================= 初始化 =================
  loadData();

})();