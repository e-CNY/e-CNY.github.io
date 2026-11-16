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

  // ================= DOM 元素 =================
  var textarea = document.getElementById('mm-code');
  var previewContainer = document.getElementById('mm-preview');
  var previewWrap = document.getElementById('preview-wrap');
  var errorOverlay = document.getElementById('mm-error');
  var errorMsg = errorOverlay.querySelector('.err-msg');
  var sampleSelect = document.getElementById('mm-sample');
  var themeSelect = document.getElementById('mm-theme');
  var autoRenderCheckbox = document.getElementById('mm-auto-render');

  var zoom = 1;
  var panX = 0;
  var panY = 0;
  var isDragging = false;
  var startX = 0;
  var startY = 0;
  var renderTimer = null;
  var currentTheme = '';

  // ================= 示例代码库 =================
  var samples = {
    flow: `graph TD
    A[开始] --> B{是否登录?}
    B -- 是 --> C[进入主页]
    B -- 否 --> D[跳转登录页]
    C --> E([结束])
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5
    classDef green fill:#9f6,stroke:#333,stroke-width:2px;
    class C green;`,
    sequence: `sequenceDiagram
    participant U as 用户
    participant S as 服务器
    U->>S: 发送请求
    activate S
    S-->>U: 返回数据
    deactivate S`,
    mindmap: `mindmap
  root((前端知识))
    基础
      HTML
      CSS
      JavaScript
    框架
      React
      Vue
    工程化
      Webpack
      Vite`,
    gantt: `gantt
    title 项目开发进度
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析       :a1, 2023-10-01, 5d
    UI设计        :after a1, 7d
    section 开发阶段
    前端开发       :2023-10-10, 15d
    后端开发       :2023-10-12, 20d
    section 测试上线
    测试与修复     :2023-11-01, 10d
    上线部署       :2023-11-12, 3d`,
    state: `stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付: 用户付款
    待支付 --> 已取消: 用户取消
    已支付 --> 已发货: 商家发货
    已发货 --> 已收货: 用户确认
    已收货 --> [*]`,
    class: `classDiagram
    class Animal {
      +String name
      +int age
      +makeSound()
    }
    class Dog {
      +String breed
      +bark()
    }
    class Cat {
      +scratch()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
    }
    ORDER {
        int orderNumber
    }`,
    pie: `pie title 浏览器市场份额
    "Chrome" : 65
    "Safari" : 18
    "Edge" : 10
    "Firefox" : 5
    "Others" : 2`
  };

  // ================= 初始化 Mermaid =================
  function initMermaid(theme) {
    if (currentTheme === theme) return; // 避免重复初始化
    currentTheme = theme;
    
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose',
      fontFamily: '"LXGW WenKai", "PingFang SC", sans-serif'
    });
  }

  // ================= 渲染引擎 =================
  function render() {
    var code = textarea.value.trim();
    if (!code) {
      previewContainer.innerHTML = '';
      errorOverlay.style.display = 'none';
      return;
    }

    // 重置缩放与平移
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();

    var theme = themeSelect.value;
    
    try {
      initMermaid(theme);
      
      // 每次渲染生成唯一 ID
      var uniqueId = 'mermaid-svg-' + Date.now();
      
      // 使用兼容性最好的 Promise 方式调用 render
      var renderPromise = mermaid.render(uniqueId, code);
      
      if (renderPromise && typeof renderPromise.then === 'function') {
        // Mermaid 10+ 版本
        renderPromise.then(function(result) {
          var svgCode = result.svg || result;
          injectSvg(svgCode);
        }).catch(function(err) {
          showError(err.message || err.str || String(err));
        });
      } else {
        // Mermaid 9 及以前版本可能会在返回时直接执行，或者这里是被当做回调处理
        // 如果 renderPromise 是 string，就直接用
        if (typeof renderPromise === 'string') {
          injectSvg(renderPromise);
        }
      }
      
    } catch (e) {
      console.error('Mermaid Render Error:', e);
      showError(e.message || e.str || String(e));
    }
  }

  function injectSvg(svgCode) {
    previewContainer.innerHTML = svgCode;
    
    var svg = previewContainer.querySelector('svg');
    if (svg) {
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.maxWidth = '100%';
      svg.style.maxHeight = '100%';
    }

    errorOverlay.style.display = 'none';
    saveToLocal();
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorOverlay.style.display = 'flex';
    previewContainer.innerHTML = ''; // 清空坏掉的图
  }

  // ================= 缩放与平移逻辑 =================
  function applyTransform() {
    previewContainer.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
  }

  function updateZoom(newZoom) {
    zoom = Math.max(0.1, Math.min(newZoom, 10));
    applyTransform();
  }

  document.getElementById('btn-zoom-in').addEventListener('click', function() {
    updateZoom(zoom + 0.2);
  });

  document.getElementById('btn-zoom-out').addEventListener('click', function() {
    updateZoom(zoom - 0.2);
  });

  document.getElementById('btn-zoom-reset').addEventListener('click', function() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  });

  previewWrap.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.1 : 0.1;
    updateZoom(zoom + delta);
  }, { passive: false });

  previewWrap.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    previewWrap.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  });

  window.addEventListener('mouseup', function() {
    isDragging = false;
    previewWrap.style.cursor = 'default';
  });

  document.getElementById('btn-fullscreen').addEventListener('click', function() {
    if (!document.fullscreenElement) {
      if (previewWrap.requestFullscreen) {
        previewWrap.requestFullscreen();
      } else if (previewWrap.webkitRequestFullscreen) {
        previewWrap.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  });

  // ================= 导入与导出 =================
  
  document.getElementById('btn-download-svg').addEventListener('click', function() {
    var svg = previewContainer.querySelector('svg');
    if (!svg) return showToast('请先生成图表', true);

    var svgData = new XMLSerializer().serializeToString(svg);
    if (!svgData.match(/xmlns="http:\/\/www.w3.org\/2000\/svg"/)) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'diagram_' + Date.now() + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('SVG 矢量图已下载');
  });

  document.getElementById('btn-download-png').addEventListener('click', function() {
    var svg = previewContainer.querySelector('svg');
    if (!svg) return showToast('请先生成图表', true);

    var svgData = new XMLSerializer().serializeToString(svg);
    if (!svgData.match(/xmlns="http:\/\/www.w3.org\/2000\/svg"/)) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(svgBlob);
    
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      var pngUrl = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'diagram_' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      showToast('PNG 图片已下载');
    };
    img.onerror = function() {
      showToast('PNG 导出失败', true);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  document.getElementById('btn-download-mmd').addEventListener('click', function() {
    var code = textarea.value.trim();
    if (!code) return showToast('代码为空', true);
    
    var blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'diagram_code_' + Date.now() + '.mmd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('源码已下载');
  });

  // ================= 编辑器交互与本地存储 =================
  
  function saveToLocal() {
    try {
      localStorage.setItem('mermaid_code', textarea.value);
      localStorage.setItem('mermaid_theme', themeSelect.value);
    } catch(e) {}
  }

  function loadFromLocal() {
    try {
      var savedCode = localStorage.getItem('mermaid_code');
      var savedTheme = localStorage.getItem('mermaid_theme');
      if (savedCode) textarea.value = savedCode;
      else textarea.value = samples.flow;
      
      if (savedTheme) themeSelect.value = savedTheme;
    } catch(e) {
      textarea.value = samples.flow;
    }
  }

  textarea.addEventListener('input', function() {
    if (!autoRenderCheckbox.checked) return;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 500);
  });

  sampleSelect.addEventListener('change', function () {
    textarea.value = samples[this.value];
    render();
  });

  themeSelect.addEventListener('change', render);
  document.getElementById('btn-render').addEventListener('click', render);

  document.getElementById('btn-clear-code').addEventListener('click', function() {
    if (confirm('确定要清空当前代码吗？')) {
      textarea.value = '';
      render();
    }
  });

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById('btn-download-svg').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      render();
    }
  });

  // ================= 初始化 =================
  loadFromLocal();
  
  // 等待 DOM 加载完毕再渲染，避免 SVG 计算出错
  window.addEventListener('load', function() {
    render();
  });

})();