(function () {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); }
      catch(e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  // ================== DOM 元素 ==================
  var input = document.getElementById('sv-input');
  var preview = document.getElementById('sv-preview');
  var previewWrap = document.getElementById('sv-preview-wrap');
  var errorMsg = document.getElementById('sv-error');
  
  var btnFormat = document.getElementById('btn-format');
  var btnMinify = document.getElementById('btn-minify');
  var btnOptimize = document.getElementById('btn-optimize');
  var btnDataUri = document.getElementById('btn-datauri');
  var btnCopy = document.getElementById('btn-copy');
  var btnClear = document.getElementById('btn-clear');
  
  var btnExtractColor = document.getElementById('btn-extract-color');
  var paletteContainer = document.getElementById('sv-palette-container');
  var paletteDiv = document.getElementById('sv-palette');
  
  var bgModeSelect = document.getElementById('sv-bg-mode');
  var exportScaleSelect = document.getElementById('sv-export-scale');
  var exportBgSelect = document.getElementById('sv-export-bg');
  
  var btnDownloadSvg = document.getElementById('btn-download-svg');
  var btnDownloadPng = document.getElementById('btn-download-png');

  // 默认示例 SVG
  var defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <style>
    .bg { fill: #7ba05b; stroke: #8a5a2b; stroke-width: 4; }
    .check { stroke: #ffffff; stroke-width: 6; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  </style>
  <circle cx="50" cy="50" r="40" class="bg" />
  <path d="M 30 50 L 45 65 L 70 35" class="check" />
</svg>`;
  input.value = defaultSvg;

  var currentSvgBlobUrl = null;
  var debounceTimer = null;

  // ================== 1. 实时预览逻辑 ==================
  function renderPreview() {
    var code = input.value.trim();
    if (!code) {
      preview.innerHTML = '<span style="color:#8a7a5f;">暂无预览</span>';
      errorMsg.style.display = 'none';
      return;
    }

    if (currentSvgBlobUrl) {
      URL.revokeObjectURL(currentSvgBlobUrl);
    }

    var blob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
    currentSvgBlobUrl = URL.createObjectURL(blob);

    var img = new Image();
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    
    img.onload = function () {
      preview.innerHTML = '';
      preview.appendChild(img);
      errorMsg.style.display = 'none';
    };
    img.onerror = function () {
      errorMsg.style.display = 'block';
    };
    img.src = currentSvgBlobUrl;
  }

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderPreview, 300);
  });

  // ================== 2. 格式与压缩 ==================
  btnFormat.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;
    
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(code, 'image/svg+xml');
      
      if (doc.querySelector('parsererror')) {
        showToast('SVG 语法错误，无法格式化');
        return;
      }

      // 利用 beautify-css 美化内部样式
      if (window.css_beautify) {
        var styles = doc.querySelectorAll('style');
        for (var i = 0; i < styles.length; i++) {
          var cssText = styles[i].textContent;
          styles[i].textContent = '\n' + window.css_beautify(cssText, { indent_size: 2 }) + '\n';
        }
      }

      var serializer = new XMLSerializer();
      var formatted = serializer.serializeToString(doc);
      
      // 简易 XML 缩进
      var reg = /(>)(<)(\/*)/g;
      formatted = formatted.replace(reg, '$1\r\n$2$3');
      
      var pad = 0;
      var lines = formatted.split('\r\n');
      var result = lines.map(function (node) {
        var indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
        } else if (node.match(/^<\/\w/)) {
          if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
          indent = 1;
        } else {
          indent = 0;
        }
        
        var padding = '';
        for (var i = 0; i < pad; i++) padding += '  ';
        pad += indent;
        return padding + node;
      }).join('\n');

      input.value = result;
      renderPreview();
      showToast('格式化完成');
    } catch (e) {
      showToast('格式化失败');
    }
  });

  btnMinify.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;
    
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(code, 'image/svg+xml');
      if (doc.querySelector('parsererror')) {
        showToast('SVG 语法错误，无法压缩');
        return;
      }

      var comments = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
      var arr = [];
      while (comments.nextNode()) { arr.push(comments.currentNode); }
      arr.forEach(function (c) { c.parentNode.removeChild(c); });

      // 压缩内部 CSS
      var styles = doc.querySelectorAll('style');
      for (var i = 0; i < styles.length; i++) {
        var cssText = styles[i].textContent;
        cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '') // 去注释
                         .replace(/\s+/g, ' ')             // 合并空白
                         .replace(/\s*([\{\}:;,])\s*/g, '$1'); // 去标点两侧空白
        styles[i].textContent = cssText;
      }

      var serializer = new XMLSerializer();
      var minified = serializer.serializeToString(doc);
      minified = minified.replace(/>\s+</g, '><').trim();

      input.value = minified;
      renderPreview();
      showToast('压缩完成');
    } catch (e) {
      showToast('压缩失败');
    }
  });

  // ================== 3. Snap.svg 优化清理 ==================
  btnOptimize.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;

    if (typeof Snap === 'undefined') {
      showToast('Snap.svg 未加载，无法进行优化');
      return;
    }

    try {
      var snapSvg = Snap.parse(code);
      
      // 1. 移除无用标签
      snapSvg.selectAll('metadata, title, desc, sodipodi\\:namedview').forEach(function (el) {
        el.remove();
      });

      // 2. 移除无用属性
      snapSvg.selectAll('*').forEach(function (el) {
        var node = el.node;
        var attrs = node.attributes;
        for (var i = attrs.length - 1; i >= 0; i--) {
          var name = attrs[i].name;
          if (name.startsWith('data-') || 
              name.startsWith('inkscape:') || 
              name.startsWith('sodipodi:') || 
              name === 'xmlns:inkscape' || 
              name === 'xmlns:sodipodi') {
            node.removeAttribute(name);
          }
        }
      });

      // 3. 尝试恢复被某些解析器丢掉的 xmlns
      if (!snapSvg.attr('xmlns')) {
        snapSvg.attr('xmlns', 'http://www.w3.org/2000/svg');
      }

      input.value = snapSvg.toString();
      renderPreview();
      showToast('SVG 清理优化完成');
    } catch (e) {
      console.error(e);
      showToast('优化失败：XML 格式不合法');
    }
  });

  // ================== 4. 颜色提取 ==================
  btnExtractColor.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;

    var colors = {};
    
    // 1. 正则提取基础属性
    var fillRegex = /fill\s*[:=]\s*["']?([^"';}\s]+)/gi;
    var strokeRegex = /stroke\s*[:=]\s*["']?([^"';}\s]+)/gi;
    
    var match;
    while ((match = fillRegex.exec(code)) !== null) {
      var c = match[1];
      if (c !== 'none' && c !== 'transparent' && !c.startsWith('url(')) colors[c] = true;
    }
    while ((match = strokeRegex.exec(code)) !== null) {
      var c = match[1];
      if (c !== 'none' && c !== 'transparent' && !c.startsWith('url(')) colors[c] = true;
    }

    // 2. 如果 Snap 可用，遍历 DOM 确保准确性
    if (typeof Snap !== 'undefined') {
      try {
        var s = Snap.parse(code);
        s.selectAll('*').forEach(function (el) {
          var fill = el.attr('fill');
          if (fill && fill !== 'none' && !fill.startsWith('url(')) colors[fill] = true;
          var stroke = el.attr('stroke');
          if (stroke && stroke !== 'none' && !stroke.startsWith('url(')) colors[stroke] = true;
        });
      } catch(e) { /* 忽略解析错误 */ }
    }

    var colorList = Object.keys(colors);
    if (colorList.length === 0) {
      showToast('未找到任何颜色');
      paletteContainer.style.display = 'none';
      return;
    }

    paletteDiv.innerHTML = '';
    colorList.forEach(function (color) {
      var swatch = document.createElement('div');
      swatch.className = 'sv-color-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = color + ' (点击复制)';
      swatch.addEventListener('click', function () {
        copyText(color).then(function () {
          showToast('已复制: ' + color);
        });
      });
      paletteDiv.appendChild(swatch);
    });

    paletteContainer.style.display = 'flex';
    showToast('提取了 ' + colorList.length + ' 种颜色');
  });

  // ================== 5. 其他功能 ==================
  btnDataUri.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;
    try {
      var b64 = btoa(unescape(encodeURIComponent(code)));
      var dataUri = 'data:image/svg+xml;base64,' + b64;
      copyText(dataUri).then(function () {
        showToast('Data URI 已复制到剪贴板');
      }).catch(function () {
        showToast('复制失败');
      });
    } catch (e) {
      showToast('转换失败');
    }
  });

  btnCopy.addEventListener('click', function () {
    if (!input.value) return;
    copyText(input.value).then(function () {
      showToast('代码已复制');
    }).catch(function () {
      showToast('复制失败');
    });
  });

  btnClear.addEventListener('click', function () {
    input.value = '';
    renderPreview();
    paletteContainer.style.display = 'none';
  });

  bgModeSelect.addEventListener('change', function () {
    previewWrap.className = 'sv-preview-wrap';
    if (this.value === 'white') previewWrap.classList.add('bg-white');
    else if (this.value === 'black') previewWrap.classList.add('bg-black');
    else previewWrap.classList.add('bg-transparent');
  });

  // ================== 6. 导入与导出 ==================
  input.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.style.borderColor = '#8a5a2b';
  });
  input.addEventListener('dragleave', function (e) {
    e.preventDefault();
    this.style.borderColor = '#d5c7a8';
  });
  input.addEventListener('drop', function (e) {
    e.preventDefault();
    this.style.borderColor = '#d5c7a8';
    if (e.dataTransfer.files.length > 0) {
      var file = e.dataTransfer.files[0];
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          input.value = ev.target.result;
          renderPreview();
          showToast('导入成功');
        };
        reader.readAsText(file);
      } else {
        showToast('请拖入 .svg 文件');
      }
    }
  });

  btnDownloadSvg.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;
    var blob = new Blob([code], {type: 'image/svg+xml'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vector_' + Date.now() + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('SVG 已下载');
  });

  btnDownloadPng.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;

    var parser = new DOMParser();
    var doc = parser.parseFromString(code, 'image/svg+xml');
    var svgEl = doc.querySelector('svg');
    if (!svgEl) {
      showToast('未找到 SVG 根节点');
      return;
    }

    var width = parseFloat(svgEl.getAttribute('width'));
    var height = parseFloat(svgEl.getAttribute('height'));
    
    if (!width || !height) {
      var viewBox = svgEl.getAttribute('viewBox');
      if (viewBox) {
        var parts = viewBox.split(/\s+/);
        if (parts.length === 4) {
          width = parseFloat(parts[2]);
          height = parseFloat(parts[3]);
        }
      }
    }
    
    if (!width || !height || isNaN(width) || isNaN(height)) {
      width = 800; height = 800;
    }

    var scale = parseInt(exportScaleSelect.value, 10) || 2;
    var bgColor = exportBgSelect.value;

    var canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    var ctx = canvas.getContext('2d');

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    var blob = new Blob([code], {type: 'image/svg+xml;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var img = new Image();

    img.onload = function () {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      
      canvas.toBlob(function (pngBlob) {
        if (!pngBlob) return showToast('PNG 生成失败');
        var pngUrl = URL.createObjectURL(pngBlob);
        var a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'vector_' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(pngUrl); }, 1500);
        showToast('PNG 已导出');
      }, 'image/png');
    };
    img.onerror = function () {
      showToast('SVG 渲染失败，可能包含外部资源');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  renderPreview();
})();