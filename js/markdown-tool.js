(function () {
  var input = document.getElementById('md-input');
  var preview = document.getElementById('md-preview');

  // 默认示例
  var defaultText = `# 欢迎使用 Markdown 编辑器

这是一款**纯前端**的 Markdown 渲染工具，支持实时预览。

## 支持的特性

- 支持 GFM 语法（表格、任务列表等）
- 支持 \`代码高亮\`
- 支持数学公式：$E = mc^2$
- 块级公式：
$$\\int_{a}^{b} x^2 dx$$

## 示例代码

\`\`\`javascript
console.log("Hello World");
\`\`\`

> 这是一段引用文本。
`;
  input.value = defaultText;

  // 处理 KaTeX 公式
  function renderMath(text) {
    // 替换块级公式 $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, function (match, formula) {
      try {
        return katex.renderToString(formula, { displayMode: true, throwOnError: false });
      } catch (e) { return match; }
    });
    // 替换行内公式 $...$
    text = text.replace(/\$([^\$]+?)\$/g, function (match, formula) {
      try {
        return katex.renderToString(formula, { displayMode: false, throwOnError: false });
      } catch (e) { return match; }
    });
    return text;
  }

  function updatePreview() {
    var text = input.value;
    // 防止 Markdown 解析器错误吃掉公式里的下划线等符号，先提取出来用占位符替换
    var mathBlocks = [];
    text = text.replace(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, function(match) {
      mathBlocks.push(match);
      return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    });

    // Markdown 渲染
    var html = marked.parse(text);

    // 还原公式并渲染
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

  // 防抖处理
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
      if (/^#{1,6}\s/.test(line)) {
        toc.push(line);
      }
    });
    if (toc.length === 0) return alert('没有找到任何标题');
    alert('目录结构：\n\n' + toc.join('\n'));
  });

  // 初始化
  updatePreview();
})();