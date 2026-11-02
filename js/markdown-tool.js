(function () {
  var input = document.getElementById('md-input');
  var preview = document.getElementById('md-preview');

  // 默认示例
  var defaultText = `# 欢迎使用 Markdown 编辑器

这是一款**纯前端**的 Markdown 渲染工具，支持 GFM 语法与公式。

## 1. GFM 任务列表

- [x] 支持表格
- [x] 支持任务列表
- [ ] 支持导出 Word/PDF

## 2. 表格演示

| 功能 | 状态 | 备注 |
| :--- | :---: | :--- |
| 公式 | ✅ | $E=mc^2$ |
| 导出 | ✅ | 支持多格式 |

## 3. 代码块

\`\`\`javascript
console.log("Hello Markdown!");
\`\`\`

> 这是一段引用文本。
`;
  input.value = defaultText;

  // 处理 KaTeX 公式
  function renderMath(text) {
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, function (match, formula) {
      try { return katex.renderToString(formula, { displayMode: true, throwOnError: false }); } catch (e) { return match; }
    });
    text = text.replace(/\$([^\$]+?)\$/g, function (match, formula) {
      try { return katex.renderToString(formula, { displayMode: false, throwOnError: false }); } catch (e) { return match; }
    });
    return text;
  }

  function updatePreview() {
    var text = input.value;
    
    // 防止 Markdown 吃掉公式里的下划线，先提取出来
    var mathBlocks = [];
    text = text.replace(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, function(match) {
      mathBlocks.push(match);
      return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    });

    marked.setOptions({ gfm: true, breaks: true });
    var html = marked.parse(text);

    // 还原公式
    html = html.replace(/%%MATH_BLOCK_(\d+)%%/g, function(match, index) {
      var formula = mathBlocks[index];
      if (formula.startsWith('$$')) {
        return katex.renderToString(formula.slice(2, -2), { displayMode: true, throwOnError: false });
      } else {
        return katex.renderToString(formula.slice(1, -1), { displayMode: false, throwOnError: false });
      }
    });

    preview.innerHTML = html;
  }

  var timer = null;
  input.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(updatePreview, 200);
  });

  document.getElementById('btn-clear').addEventListener('click', function() {
    input.value = '';
    updatePreview();
  });

  document.getElementById('btn-extract-toc').addEventListener('click', function() {
    var toc = [];
    var lines = input.value.split('\n');
    lines.forEach(function(line) {
      if (/^#{1,6}\s/.test(line)) toc.push(line);
    });
    if (toc.length === 0) return alert('没有找到任何标题');
    alert('目录结构：\n\n' + toc.join('\n'));
  });

  // ================= 导出功能 =================

  // 1. 导出 Markdown (.md)
  document.getElementById('btn-export-md').addEventListener('click', function() {
    var blob = new Blob([input.value], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, 'document_' + Date.now() + '.md');
  });

  // 2. 导出 HTML (.html)
  document.getElementById('btn-export-html').addEventListener('click', function() {
    var htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Markdown Export</title>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
          code { font-family: monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
        </style>
      </head>
      <body>${preview.innerHTML}</body>
      </html>
    `;
    var blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, 'document_' + Date.now() + '.html');
  });

  // 3. 导出 Word (.doc)
  document.getElementById('btn-export-word').addEventListener('click', function() {
    var header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Export HTML To Doc</title>
    <style>
      body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.5; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #000; padding: 5px; }
      pre { background: #f4f4f4; padding: 10px; }
    </style>
    </head><body>`;
    var footer = "</body></html>";
    var sourceHTML = header + preview.innerHTML + footer;
    
    var blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    downloadBlob(blob, 'document_' + Date.now() + '.doc');
  });

  // 4. 导出 PDF (.pdf) - 修复空白问题
  document.getElementById('btn-export-pdf').addEventListener('click', function() {
    var btn = this;
    btn.textContent = '⏳ 生成 PDF 中...';
    btn.disabled = true;

    // 创建一个全屏可见的遮罩层
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'flex-start';
    overlay.style.overflowY = 'auto';
    overlay.style.padding = '20px';

    // 克隆内容
    var clone = document.createElement('div');
    clone.className = 'markdown-body';
    clone.innerHTML = preview.innerHTML;
    // 设置 A4 纸张对应的宽度和边距，防止截图拉伸变形
    clone.style.width = '794px'; 
    clone.style.padding = '50px';
    clone.style.background = '#fff';
    clone.style.boxSizing = 'border-box';
    clone.style.borderRadius = '8px';
    clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    
    // 把基础字体样式复制过去
    clone.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    clone.style.lineHeight = '1.6';
    clone.style.color = '#3d3226';

    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    // 延迟一下，确保浏览器渲染完字体和公式
    setTimeout(function() {
      var opt = {
        margin:       0,
        filename:     'document_' + Date.now() + '.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(clone).save().then(function() {
        document.body.removeChild(overlay);
        btn.textContent = '导出 PDF';
        btn.disabled = false;
      }).catch(function(err) {
        console.error(err);
        alert('PDF 生成失败');
        document.body.removeChild(overlay);
        btn.textContent = '导出 PDF';
        btn.disabled = false;
      });
    }, 300);
  });

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 初始化
  updatePreview();
})();