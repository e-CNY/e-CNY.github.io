(function () {
  var tabs = document.querySelectorAll('.dv-tab');
  var panels = document.querySelectorAll('.dv-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. Gitignore 生成 =================
  var templates = {
    node: "node_modules/\nnpm-debug.log\nyarn-debug.log\nyarn-error.log\ndist/\nbuild/\n.env",
    python: "__pycache__/\n*.py[cod]\n*$py.class\nvenv/\n.env/\n.pytest_cache/",
    java: "target/\n*.class\n*.jar\n*.war\n.settings/\n.classpath\n.project",
    mac: ".DS_Store\n.AppleDouble\n.LSOverride",
    win: "Thumbs.db\nehthumbs.db\nDesktop.ini",
    ide: ".vscode/\n.idea/\n*.iml\n*.suo\n*.ntvs*\n*.njsproj\n*.sln\n*.sw?"
  };

  document.getElementById('btn-git').addEventListener('click', function () {
    var checkboxes = document.querySelectorAll('.dv-check input:checked');
    var result = [];
    
    checkboxes.forEach(function (cb) {
      var type = cb.value;
      if (templates[type]) {
        result.push("# --- " + type.toUpperCase() + " ---");
        result.push(templates[type]);
        result.push("");
      }
    });

    document.getElementById('git-output').value = result.join('\n');
  });

  // ================= 2. Nginx 高亮与格式化 =================
  document.getElementById('btn-nginx').addEventListener('click', function () {
    var code = document.getElementById('nginx-input').value;
    var out = document.getElementById('nginx-output');
    if (!code) return;

    // 1. 简单的缩进格式化 (在 { } ; 前后处理)
    var formatted = code
      .replace(/\s*\{\s*/g, ' {\n  ')
      .replace(/\s*\}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*\n/g, '\n'); // 移除多余空行

    // 2. 简单的正则高亮
    var html = formatted
      // 转义 HTML
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // 注释
      .replace(/(#.*)/g, '<span class="hl-comm">$1</span>')
      // 键值对 (简单处理)
      .replace(/^(\s*)([a-zA-Z0-9_]+)/gm, '$1<span class="hl-key">$2</span>')
      // 值
      .replace(/\s([^\s;{]+);/g, ' <span class="hl-val">$1</span>;');

    out.innerHTML = html;
  });
})();