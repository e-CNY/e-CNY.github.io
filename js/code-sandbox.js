(function () {
  var edHtml = document.getElementById('ed-html');
  var edCss = document.getElementById('ed-css');
  var edJs = document.getElementById('ed-js');
  var preview = document.getElementById('preview-frame');

  var STORAGE_KEY = 'code_sandbox_data';

  // 1. 初始化代码 (优先读取本地缓存)
  var defaultHtml = `<div class="box">\n  <h1>Hello 工具站!</h1>\n  <button id="btn">点我</button>\n</div>`;
  var defaultCss = `.box {\n  text-align: center;\n  margin-top: 50px;\n  font-family: sans-serif;\n}\nbutton {\n  padding: 10px 20px;\n  background: #7ba05b;\n  color: white;\n  border: none;\n  border-radius: 5px;\n  cursor: pointer;\n}`;
  var defaultJs = `document.getElementById('btn').addEventListener('click', function() {\n  alert('你点击了按钮！');\n});`;

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

  // 2. 自动保存与运行
  function saveToLocal() {
    var data = {
      html: edHtml.value,
      css: edCss.value,
      js: edJs.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function runCode() {
    var html = edHtml.value;
    var css = edCss.value;
    var js = edJs.value;

    var doc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${css}</style>
      </head>
      <body>
        ${html}
        <script>
          try {
            ${js}
          } catch(err) {
            document.body.innerHTML += '<div style="color:red; background:#fee; padding:10px; margin-top:10px; border:1px solid red;">JS 运行错误: ' + err.message + '</div>';
          }
        <\/script>
      </body>
      </html>
    `;
    preview.srcdoc = doc;
    saveToLocal();
  }

  // 监听输入自动保存 (防抖)
  var saveTimer = null;
  function handleInput() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToLocal, 500);
  }

  [edHtml, edCss, edJs].forEach(function(el) {
    el.addEventListener('input', handleInput);
  });

  document.getElementById('btn-run').addEventListener('click', runCode);
  document.getElementById('btn-refresh-preview').addEventListener('click', runCode);

  // 3. 清空功能
  document.getElementById('btn-clear').addEventListener('click', function () {
    if (confirm('确定要清空所有 HTML、CSS 和 JS 代码吗？此操作不可撤销。')) {
      edHtml.value = '';
      edCss.value = '';
      edJs.value = '';
      preview.srcdoc = '';
      saveToLocal();
    }
  });

  // 4. 复制功能
  document.querySelectorAll('.cs-copy-btn').forEach(function (btn) {
    if(btn.id === 'btn-refresh-preview') return;
    btn.addEventListener('click', function () {
      var targetId = this.dataset.target;
      var text = document.getElementById(targetId).value;
      navigator.clipboard.writeText(text).then(function() {
        var originalText = btn.textContent;
        btn.textContent = '✅ 已复制';
        setTimeout(function() { btn.textContent = originalText; }, 1500);
      });
    });
  });

  // 5. 导出功能
  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 导出单文件 HTML
  document.getElementById('btn-download-merge').addEventListener('click', function () {
    var fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Sandbox Export</title>\n<style>\n${edCss.value}\n</style>\n</head>\n<body>\n${edHtml.value}\n<script>\n${edJs.value}\n<\/script>\n</body>\n</html>`;
    downloadFile(fullHtml, 'sandbox_merge.html', 'text/html');
  });

  // 导出 3 个独立文件
  document.getElementById('btn-download-three').addEventListener('click', function () {
    downloadFile(edHtml.value, 'index.html', 'text/html');
    
    // 延迟下载，防止浏览器拦截多次下载请求
    setTimeout(function () {
      downloadFile(edCss.value, 'style.css', 'text/css');
    }, 300);
    
    setTimeout(function () {
      downloadFile(edJs.value, 'script.js', 'text/javascript');
    }, 600);
  });

  // 快捷键支持 (Ctrl + S 运行)
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      runCode();
    }
  });

  // 初始化运行
  runCode();
})();