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
  var languageSelect = document.getElementById('cs-language');
  var windowStyleSelect = document.getElementById('cs-window-style');
  var codeBgSelect = document.getElementById('cs-code-bg');
  var showShadow = document.getElementById('cs-show-shadow');
  var showLines = document.getElementById('cs-show-lines');
  var colorBtns = document.querySelectorAll('.cs-color-btn');
  
  var fontSizeSlider = document.getElementById('cs-font-size');
  var fontSizeVal = document.getElementById('val-font-size');
  var paddingSlider = document.getElementById('cs-padding');
  var paddingVal = document.getElementById('val-padding');
  
  var input = document.getElementById('cs-input');
  var editorWrap = document.getElementById('cs-editor-wrap');
  var previewArea = document.getElementById('cs-preview-area');
  var captureTarget = document.getElementById('capture-target');
  var codePreview = document.getElementById('code-preview');
  var langLabel = document.getElementById('lang-label');
  var lineNumbers = document.getElementById('line-numbers');
  var codeContainer = document.getElementById('code-container');
  
  var btnGenerate = document.getElementById('btn-generate');
  var btnDownload = document.getElementById('btn-download');
  var btnBack = document.getElementById('btn-back');
  var btnClearCode = document.getElementById('btn-clear-code');
  var exportScaleSelect = document.getElementById('cs-export-scale');
  var loadingOverlay = document.getElementById('loading-overlay');

  var headerMac = document.getElementById('header-mac');
  var headerWin = document.getElementById('header-win');

  var currentBg = 'linear-gradient(135deg, #7ba05b, #4a90e2)';

  // 默认示例代码
  input.value = `// 点击左侧生成精美截图\nfunction greet(name) {\n  const message = \`Hello, \${name}!\`;\n  console.log(message);\n  return true;\n}\n\ngreet('Geek');`;

  // 文件扩展名映射
  var extMap = {
    'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css',
    'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
    'go': 'go', 'rs': 'rust', 'php': 'php', 'rb': 'ruby', 'swift': 'swift',
    'sql': 'sql', 'sh': 'bash', 'json': 'json', 'yaml': 'yaml', 'md': 'markdown'
  };

  // ================= 交互绑定 =================
  
  // 切换背景
  colorBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      colorBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentBg = this.dataset.bg;
    });
  });

  // 切换窗口头部样式
  function updateHeaderStyle() {
    var style = windowStyleSelect.value;
    headerMac.style.display = style === 'mac' ? 'flex' : 'none';
    headerWin.style.display = style === 'win' ? 'flex' : 'none';
  }
  windowStyleSelect.addEventListener('change', updateHeaderStyle);

  // 字号与内边距
  fontSizeSlider.addEventListener('input', function() {
    fontSizeVal.textContent = this.value;
    applyTypography();
  });
  
  paddingSlider.addEventListener('input', function() {
    paddingVal.textContent = this.value;
    applyTypography();
  });

  function applyTypography() {
    var fs = fontSizeSlider.value + 'px';
    var pad = paddingSlider.value + 'px';
    
    codePreview.style.fontSize = fs;
    codeContainer.querySelector('pre').style.padding = pad;
    
    lineNumbers.style.fontSize = fs;
    lineNumbers.style.padding = pad + ' 12px ' + pad + ' ' + pad;
  }

  // 清空代码
  btnClearCode.addEventListener('click', function() {
    if (confirm('确定要清空当前代码吗？')) {
      input.value = '';
      input.focus();
    }
  });

  // Tab 缩进支持
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
    }
  });

  // ================= 拖拽上传逻辑 =================
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    editorWrap.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  editorWrap.addEventListener('dragover', function() { editorWrap.classList.add('dragover'); });
  editorWrap.addEventListener('dragleave', function() { editorWrap.classList.remove('dragover'); });
  
  editorWrap.addEventListener('drop', function(e) {
    editorWrap.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var file = e.dataTransfer.files[0];
      var ext = file.name.split('.').pop().toLowerCase();
      
      var reader = new FileReader();
      reader.onload = function(evt) {
        input.value = evt.target.result;
        if (extMap[ext]) {
          languageSelect.value = extMap[ext];
        }
        showToast('文件导入成功: ' + file.name);
      };
      reader.readAsText(file);
    }
  });

  // ================= 生成预览核心逻辑 =================
  function generatePreview() {
    var code = input.value.trim();
    if (!code) return showToast('请输入代码', true);

    var lang = languageSelect.value;
    
    // 1. 高亮代码
    codePreview.className = 'hljs language-' + lang;
    codePreview.textContent = code;
    try {
      hljs.highlightElement(codePreview);
    } catch(e) { console.warn('Highlight error:', e); }

    langLabel.textContent = lang;

    // 2. 应用背景色与主题
    var bgColor = codeBgSelect.value;
    captureTarget.style.background = bgColor;
    
    if (bgColor === '#f8f9fa') {
      codeContainer.classList.add('light-theme');
      // 浅色模式下头部稍微变暗一点
      captureTarget.querySelector('.window-header').style.background = '#e9ecef';
    } else {
      codeContainer.classList.remove('light-theme');
      captureTarget.querySelector('.window-header').style.background = bgColor === '#1e1e1e' ? '#141414' : '#21252b';
    }

    // 3. 行号渲染
    if (showLines.checked) {
      lineNumbers.style.display = 'block';
      var linesCount = code.split('\n').length;
      var linesArr = [];
      for (var i = 1; i <= linesCount; i++) linesArr.push(i);
      lineNumbers.textContent = linesArr.join('\n');
    } else {
      lineNumbers.style.display = 'none';
    }

    // 4. 阴影与窗口样式
    updateHeaderStyle();
    captureTarget.style.boxShadow = showShadow.checked ? '0 20px 40px rgba(0,0,0,0.2)' : 'none';
    
    // 5. 排版与视图切换
    applyTypography();
    editorWrap.style.display = 'none';
    previewArea.style.display = 'flex';
    previewArea.style.background = currentBg;
  }

  btnGenerate.addEventListener('click', generatePreview);

  // 返回编辑
  btnBack.addEventListener('click', function() {
    previewArea.style.display = 'none';
    editorWrap.style.display = 'flex';
  });

  // ================= 下载图片 =================
  btnDownload.addEventListener('click', function() {
    var scale = parseInt(exportScaleSelect.value, 10) || 2;
    loadingOverlay.style.display = 'flex';
    btnDownload.disabled = true;

    // 延迟 100ms 确保 Loading 动画渲染出来
    setTimeout(function() {
      html2canvas(captureTarget, {
        scale: scale,
        backgroundColor: null,
        useCORS: true
      }).then(function(canvas) {
        var a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'code_screenshot_' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        loadingOverlay.style.display = 'none';
        btnDownload.disabled = false;
        showToast('图片已开始下载');
      }).catch(function(err) {
        console.error('Screenshot failed:', err);
        showToast('生成失败: ' + err.message, true);
        loadingOverlay.style.display = 'none';
        btnDownload.disabled = false;
      });
    }, 100);
  });

})();