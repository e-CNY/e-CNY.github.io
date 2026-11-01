(function () {
  var languageSelect = document.getElementById('cs-language');
  var colorBtns = document.querySelectorAll('.cs-color-btn');
  var showDots = document.getElementById('cs-show-dots');
  var showShadow = document.getElementById('cs-show-shadow');
  var input = document.getElementById('cs-input');
  var previewArea = document.getElementById('cs-preview-area');
  var captureTarget = document.getElementById('capture-target');
  var codePreview = document.getElementById('code-preview');
  var langLabel = document.getElementById('lang-label');
  var btnGenerate = document.getElementById('btn-generate');
  var btnDownload = document.getElementById('btn-download');
  var macHeader = document.getElementById('mac-header');
  var csEditorWrap = document.querySelector('.cs-editor-wrap');

  var currentBg = 'linear-gradient(135deg, #7ba05b, #4a90e2)';

  // 默认示例代码
  input.value = `// 点击左侧生成精美截图\nfunction greet(name) {\n  const message = \`Hello, \${name}!\`;\n  console.log(message);\n  return true;\n}\n\ngreet('Geek');`;

  // 切换背景
  colorBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      colorBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentBg = this.dataset.bg;
    });
  });

  // 生成预览
  btnGenerate.addEventListener('click', function() {
    var code = input.value.trim();
    if (!code) return alert('请输入代码');

    // 应用高亮
    var lang = languageSelect.value;
    codePreview.className = 'hljs language-' + lang;
    codePreview.textContent = code;
    hljs.highlightElement(codePreview);

    langLabel.textContent = lang;

    // 应用配置
    captureTarget.style.background = '#282c34';
    macHeader.style.display = showDots.checked ? 'flex' : 'none';
    captureTarget.style.boxShadow = showShadow.checked ? '0 20px 40px rgba(0,0,0,0.2)' : 'none';

    // 切换视图
    csEditorWrap.style.display = 'none';
    previewArea.style.display = 'flex';
    previewArea.style.background = currentBg;
  });

  // 点击预览区返回编辑
  previewArea.addEventListener('click', function(e) {
    if (e.target === previewArea) {
      previewArea.style.display = 'none';
      csEditorWrap.style.display = 'flex';
    }
  });

  // 下载图片
  btnDownload.addEventListener('click', function() {
    btnDownload.textContent = '⏳ 渲染中...';
    
    // 提高像素比，保证下载的是高清图
    html2canvas(previewArea, {
      scale: 2, 
      backgroundColor: null // 保留背景渐变
    }).then(function(canvas) {
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'code_screenshot_' + Date.now() + '.png';
      a.click();
      btnDownload.textContent = '⬇️ 下载高清图片';
    }).catch(function(err) {
      alert('生成失败: ' + err);
      btnDownload.textContent = '⬇️ 下载高清图片';
    });
  });

})();