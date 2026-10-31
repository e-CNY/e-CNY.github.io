(function () {
  var input = document.getElementById('sv-input');
  var preview = document.getElementById('sv-preview');

  // 默认示例 SVG
  var defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <circle cx="50" cy="50" r="40" stroke="#8a5a2b" stroke-width="4" fill="#7ba05b" />
  <path d="M 30 50 L 45 65 L 70 35" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  input.value = defaultSvg;

  function render() {
    var code = input.value.trim();
    if (!code) {
      preview.innerHTML = '<span style="color:#8a7a5f;">暂无预览</span>';
      return;
    }
    // 直接注入 HTML (简单渲染)
    preview.innerHTML = code;
    
    // 确保 svg 元素自适应大小
    var svg = preview.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.maxWidth = '300px';
      svg.style.maxHeight = '300px';
    }
  }

  input.addEventListener('input', render);

  // 1. 格式化 (简单的标签换行和缩进)
  document.getElementById('btn-format').addEventListener('click', function () {
    var code = input.value;
    try {
      // 移除标签间的多余空格
      code = code.replace(/>\s+</g, '><');
      // 给闭合标签换行，给开始标签换行
      code = code.replace(/></g, '>\n<');
      
      // 简单缩进
      var lines = code.split('\n');
      var indent = 0;
      var result = [];
      lines.forEach(function(line) {
        line = line.trim();
        if (line.startsWith('</')) {
          indent = Math.max(0, indent - 1);
        }
        result.push('  '.repeat(indent) + line);
        // 如果是开始标签且没有自闭合
        if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.startsWith('<?') && !line.includes('</')) {
          indent++;
        }
      });
      input.value = result.join('\n');
      render();
    } catch (e) {
      alert('格式化失败');
    }
  });

  // 2. 压缩
  document.getElementById('btn-minify').addEventListener('click', function () {
    var code = input.value;
    // 移除注释
    code = code.replace(/<!--[\s\S]*?-->/g, '');
    // 移除多余换行和空格
    code = code.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
    input.value = code;
    render();
  });

  // 3. 下载 SVG
  document.getElementById('btn-download-svg').addEventListener('click', function () {
    if (!input.value) return;
    var blob = new Blob([input.value], {type: 'image/svg+xml'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'image_' + Date.now() + '.svg';
    a.click();
    URL.revokeObjectURL(url);
  });

  // 4. 下载 PNG
  document.getElementById('btn-download-png').addEventListener('click', function () {
    var code = input.value;
    if (!code) return;

    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      
      // 解析 SVG 尺寸
      var parser = new DOMParser();
      var doc = parser.parseFromString(code, 'image/svg+xml');
      var svgEl = doc.querySelector('svg');
      
      var width = parseInt(svgEl.getAttribute('width')) || 500;
      var height = parseInt(svgEl.getAttribute('height')) || 500;
      
      // 2倍清晰度
      canvas.width = width * 2;
      canvas.height = height * 2;

      var svgBlob = new Blob([code], {type: 'image/svg+xml;charset=utf-8'});
      var url = URL.createObjectURL(svgBlob);
      
      var img = new Image();
      img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        
        canvas.toBlob(function(blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'image_' + Date.now() + '.png';
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      };
      img.onerror = function() {
        alert('SVG 渲染为图片失败，可能包含不支持的脚本或外链资源。');
        URL.revokeObjectURL(url);
      };
      img.src = url;
      
    } catch (e) {
      alert('转换失败: ' + e.message);
    }
  });

  // 初始化
  render();
})();