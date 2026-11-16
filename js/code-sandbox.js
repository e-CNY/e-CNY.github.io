(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  // ================= DOM 元素 =================
  var edHtml = document.getElementById('ed-html');
  var edCss = document.getElementById('ed-css');
  var edJs = document.getElementById('ed-js');
  var previewFrame = document.getElementById('preview-frame');
  var consoleOutput = document.getElementById('console-output');
  
  var numsHtml = document.getElementById('nums-html');
  var numsCss = document.getElementById('nums-css');
  var numsJs = document.getElementById('nums-js');

  var STORAGE_KEY = 'code_sandbox_data_v2';

  // ================= 1. 初始化代码 =================
  var defaultHtml = `<div class="box">\n  <h1>Hello 工具站!</h1>\n  <button id="btn">点我输出 Console</button>\n</div>`;
  var defaultCss = `.box {\n  text-align: center;\n  margin-top: 50px;\n  font-family: sans-serif;\n}\nbutton {\n  padding: 10px 20px;\n  background: #7ba05b;\n  color: white;\n  border: none;\n  border-radius: 5px;\n  cursor: pointer;\n}\nbutton:hover { background: #6b8c4e; }`;
  var defaultJs = `document.getElementById('btn').addEventListener('click', function() {\n  console.log('按钮被点击了! 当前时间:', new Date().toLocaleTimeString());\n  console.warn('这是一个警告提示');\n  console.error('这是一个错误提示 (仅演示)');\n});`;

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.html !== undefined) {
      edHtml.value = saved.html;
      edCss.value = saved.css;
      edJs.value = saved.js;
    } else {
      throw new Error("无缓存");
    }
  } catch (e) {
    edHtml.value = defaultHtml;
    edCss.value = defaultCss;
    edJs.value = defaultJs;
  }

  // ================= 2. 行号与 Tab 缩进支持 =================
  function updateLineNums(textarea, numsEl) {
    var count = textarea.value.split('\n').length;
    var arr = [];
    for (var i = 1; i <= count; i++) arr.push(i);
    numsEl.textContent = arr.join('\n');
    numsEl.scrollTop = textarea.scrollTop;
  }

  [ {ta: edHtml, num: numsHtml}, {ta: edCss, num: numsCss}, {ta: edJs, num: numsJs} ].forEach(function(item) {
    item.ta.addEventListener('input', function() { updateLineNums(this, item.num); });
    item.ta.addEventListener('scroll', function() { item.num.scrollTop = this.scrollTop; });
    
    // 支持 Tab 键
    item.ta.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        updateLineNums(this, item.num);
      }
    });
  });

  // ================= 3. 控制台拦截与渲染 =================
  function appendConsole(type, ...args) {
    var div = document.createElement('div');
    div.className = 'console-line console-' + type;
    
    // 将对象转换为字符串
    var msg = args.map(function(arg) {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch(e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    
    var prefix = type === 'error' ? '❌ ' : (type === 'warn' ? '⚠️ ' : '> ');
    div.textContent = prefix + msg;
    consoleOutput.appendChild(div);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  // 监听来自 iframe 的 console 消息
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'console') {
      appendConsole(e.data.level, e.data.message);
    }
  });

  document.getElementById('btn-clear-console').addEventListener('click', function() {
    consoleOutput.innerHTML = '';
  });

  // ================= 4. 运行与自动保存 =================
  function runCode() {
    var html = edHtml.value;
    var css = edCss.value;
    var js = edJs.value;

    // 清理控制台
    consoleOutput.innerHTML = '';
    
    // 安全转义 </script>
    var safeJs = js.replace(/<\/script>/gi, '<\\/script>');

    // 构建注入脚本，用于拦截 console 和 error
    var interceptScript = `
      <script>
        (function() {
          var _log = console.log;
          var _warn = console.warn;
          var _error = console.error;
          
          function send(type, args) {
            var msgs = Array.prototype.slice.call(args).map(function(a) {
              if (typeof a === 'object') {
                try { return JSON.stringify(a); } catch(e) { return String(a); }
              }
              return String(a);
            }).join(' ');
            window.parent.postMessage({ type: 'console', level: type, message: msgs }, '*');
          }

          console.log = function() { send('log', arguments); _log.apply(console, arguments); };
          console.warn = function() { send('warn', arguments); _warn.apply(console, arguments); };
          console.error = function() { send('error', arguments); _error.apply(console, arguments); };
          
          window.onerror = function(msg, url, line, col, error) {
            send('error', [msg + ' (行 ' + line + ')']);
            return false;
          };
        })();
      <\/script>
    `;

    var doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  ${html}
  ${interceptScript}
  <script>
    try {
      ${safeJs}
    } catch(err) {
      console.error(err.message);
    }
  <\/script>
</body>
</html>`;

    previewFrame.srcdoc = doc;
    saveToLocal();
  }

  function saveToLocal() {
    var data = { html: edHtml.value, css: edCss.value, js: edJs.value };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  // 防抖自动保存
  var saveTimer = null;
  function handleInput() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToLocal, 500);
  }
  [edHtml, edCss, edJs].forEach(function(el) { el.addEventListener('input', handleInput); });

  // ================= 5. 工具栏交互 =================
  document.getElementById('btn-run').addEventListener('click', function() {
    runCode();
    showToast('代码已运行');
  });

  document.getElementById('btn-refresh-preview').addEventListener('click', function() {
    runCode();
    showToast('预览已刷新');
  });

  document.getElementById('btn-clear').addEventListener('click', function () {
    if (confirm('确定要清空所有 HTML、CSS 和 JS 代码吗？此操作不可撤销。')) {
      edHtml.value = '';
      edCss.value = '';
      edJs.value = '';
      previewFrame.srcdoc = '';
      consoleOutput.innerHTML = '';
      updateLineNums(edHtml, numsHtml);
      updateLineNums(edCss, numsCss);
      updateLineNums(edJs, numsJs);
      saveToLocal();
      showToast('已清空全部内容');
    }
  });

  // 复制
  document.querySelectorAll('.cs-copy-btn[data-target]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = document.getElementById(this.dataset.target).value;
      if (!text) return showToast('内容为空');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { showToast('✅ 已复制到剪贴板'); });
      } else {
        document.getElementById(this.dataset.target).select();
        document.execCommand('copy');
        showToast('✅ 已复制到剪贴板');
      }
    });
  });

  // ================= 6. 导出功能 =================
  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // 导出单文件 HTML
  document.getElementById('btn-download-merge').addEventListener('click', function () {
    var safeJs = edJs.value.replace(/<\/script>/gi, '<\\/script>');
    var fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Sandbox Export</title>\n<style>\n${edCss.value}\n</style>\n</head>\n<body>\n${edHtml.value}\n<script>\n${safeJs}\n<\/script>\n</body>\n</html>`;
    downloadFile(fullHtml, 'sandbox_merged_' + Date.now() + '.html', 'text/html');
    showToast('单文件 HTML 已下载');
  });

  // 导出 ZIP 压缩包
  document.getElementById('btn-download-zip').addEventListener('click', function () {
    if (typeof JSZip === 'undefined') return showToast('JSZip 库未加载');
    
    var zip = new JSZip();
    zip.file('index.html', edHtml.value);
    zip.file('style.css', edCss.value);
    zip.file('script.js', edJs.value);
    
    // 生成一个包含引用的 index.html 更好，但为了尊重用户输入，这里直接存三个原文件
    var readme = "由工具站在线代码沙盒生成。\n包含 index.html, style.css, script.js 三个文件。";
    zip.file('README.txt', readme);

    zip.generateAsync({ type: 'blob' }).then(function (content) {
      downloadFile(content, 'sandbox_export_' + Date.now() + '.zip', 'application/zip');
      showToast('ZIP 打包已下载');
    });
  });

  // ================= 7. 快捷键与初始化 =================
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
      e.preventDefault();
      runCode();
      showToast('代码已运行');
    }
  });

  // 初始化运行
  updateLineNums(edHtml, numsHtml);
  updateLineNums(edCss, numsCss);
  updateLineNums(edJs, numsJs);
  runCode();

})();