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
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
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
  var btnCopy = document.getElementById('btn-copy');
  var btnClear = document.getElementById('btn-clear');
  
  var bgModeSelect = document.getElementById('sv-bg-mode');
  var exportScaleSelect = document.getElementById('sv-export-scale');
  var exportBgSelect = document.getElementById('sv-export-bg');
  
  var btnDownloadSvg = document.getElementById('btn-download-svg');
  var btnDownloadPng = document.getElementById('btn-download-png');

  // 默认示例 SVG
  var defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <circle cx="50" cy="50" r="40" stroke="#8a5a2b" stroke-width="4" fill="#7ba05b" />
  <path d="M 30 50 L 45 65 L 70 35" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
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

    // 清理上一次的 ObjectURL
    if (currentSvgBlobUrl) {
      URL.revokeObjectURL(currentSvgBlobUrl);
    }

    // 使用 Blob URL 渲染到 img 标签中（安全且不会污染页面样式）
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

  // 防抖渲染
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderPreview, 300);
  });

  // ================== 2. 格式与压缩 ==================
  btnFormat.addEventListener('click', function () {
    var code = input.value.trim();
    if (!code) return;
    
    try {
      // 采用原生 DOMParser 进行健壮的格式化
      var parser = new DOMParser();
      var doc = parser.parseFromString(code, 'image/svg+xml');
      
      // 检查解析错误
      if (doc.querySelector('parsererror')) {
        showToast('SVG 语法错误，无法格式化');
        return;
      }

      var serializer = new XMLSerializer();
      var formatted = serializer.serializeToString(doc);
      
      // 简单的自动缩进
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

      // 移除注释
      var comments = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
      var arr = [];
      while (comments.nextNode()) { arr.push(comments.currentNode); }
      arr.forEach(function (c) { c.parentNode.removeChild(c); });

      var serializer = new XMLSerializer();
      var minified = serializer.serializeToString(doc);

      // 简单的空格清理（仅在标签之间）
      minified = minified.replace(/>\s+</g, '><').trim();

      input.value = minified;
      renderPreview();
      showToast('压缩完成');
    } catch (e) {
      showToast('压缩失败');
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
  });

  // ================== 3. 预览背景切换 ==================
  bgModeSelect.addEventListener('change', function () {
    previewWrap.className = 'sv-preview-wrap';
    if (this.value === 'white') previewWrap.classList.add('bg-white');
    else if (this.value === 'black') previewWrap.classList.add('bg-black');
    else previewWrap.classList.add('bg-transparent');
  });

  // ================== 4. 导入功能（拖拽与粘贴） ==================
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

  // ================== 5. 下载功能 ==================
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

    // 1. 解析 SVG 尺寸
    var parser = new DOMParser();
    var doc = parser.parseFromString(code, 'image/svg+xml');
    var svgEl = doc.querySelector('svg');
    if (!svgEl) {
      showToast('未找到 SVG 根节点');
      return;
    }

    var width = parseFloat(svgEl.getAttribute('width'));
    var height = parseFloat(svgEl.getAttribute('height'));
    
    // 如果没有明确宽高，尝试提取 viewBox
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
    
    // 兜底默认尺寸
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
      showToast('SVG 渲染失败，可能包含不支持的资源');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  // 初始化渲染
  renderPreview();
})();