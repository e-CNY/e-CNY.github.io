(function () {
  var edHtml = document.getElementById('ed-html');
  var edCss = document.getElementById('ed-css');
  var edJs = document.getElementById('ed-js');
  var preview = document.getElementById('preview-frame');

  // 初始示例
  edHtml.value = `<div class="box">\n  <h1>Hello 工具站!</h1>\n  <button id="btn">点我</button>\n</div>`;
  edCss.value = `.box {\n  text-align: center;\n  margin-top: 50px;\n  font-family: sans-serif;\n}\nbutton {\n  padding: 10px 20px;\n  background: #7ba05b;\n  color: white;\n  border: none;\n  border-radius: 5px;\n  cursor: pointer;\n}`;
  edJs.value = `document.getElementById('btn').addEventListener('click', function() {\n  alert('你点击了按钮！');\n});`;

  function runCode() {
    var html = edHtml.value;
    var css = edCss.value;
    var js = edJs.value;

    // 组合成完整的 HTML 文档，注入 iframe
    var doc = `
      <!DOCTYPE html>
      <html>
      <head><style>${css}</style></head>
      <body>
        ${html}
        <script>${js}<\/script>
      </body>
      </html>
    `;
    preview.srcdoc = doc;
  }

  document.getElementById('btn-run').addEventListener('click', runCode);
  document.getElementById('btn-clear').addEventListener('click', function () {
    preview.srcdoc = '';
  });

  // 初始化运行
  setTimeout(runCode, 100);
})();