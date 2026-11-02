(function () {
  // 1. Tab 切换
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

  // 2. 复制按钮通用逻辑
  document.querySelectorAll('.dv-copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = this.dataset.target;
      var text = document.getElementById(targetId).value || document.getElementById(targetId).innerText;
      navigator.clipboard.writeText(text).then(function() {
        var original = btn.textContent;
        btn.textContent = '✅';
        setTimeout(function() { btn.textContent = original; }, 1500);
      });
    });
  });

  // ================= 功能一：Gitignore =================
  var templates = {
    node: "node_modules/\nnpm-debug.log\nyarn-debug.log\nyarn-error.log\ndist/\nbuild/\n.env\n.env.local\n.DS_Store",
    python: "__pycache__/\n*.py[cod]\n*$py.class\nvenv/\n.env/\n.pytest_cache/\nbuild/\ndist/\n*.egg-info/",
    java: "target/\n*.class\n*.jar\n*.war\n.settings/\n.classpath\n.project\n*.iml",
    go: "*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\ngo.sum\nvendor/\n.idea/",
    rust: "target/\n**/*.rs.bk\nCargo.lock",
    cpp: "*.o\n*.obj\n*.exe\n*.dll\n*.so\n*.a\n*.lib\nbuild/\ncmake-build-debug/",
    swift: "build/\nDerivedData/\n*.xcuserstate\n*.pbxuser\n*.mode1v3\n*.mode2v3\n*.perspectivev3\nxcuserdata/",
    os: ".DS_Store\n.AppleDouble\n.LSOverride\nThumbs.db\nehthumbs.db\nDesktop.ini",
    ide: ".vscode/\n.idea/\n*.sublime-project\n*.sublime-workspace"
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

  // ================= 功能二：JSON 转实体类 =================
  document.getElementById('btn-entity').addEventListener('click', function () {
    var jsonStr = document.getElementById('entity-input').value.trim();
    var lang = document.getElementById('entity-lang').value;
    var outEl = document.getElementById('entity-output');
    if (!jsonStr) return;

    try {
      var obj = JSON.parse(jsonStr);
      if (typeof obj !== 'object' || Array.isArray(obj)) {
        // 如果是数组，取第一个元素作为模板
        if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
          obj = obj[0];
        } else {
          return outEl.value = '请提供 JSON 对象或包含对象的数组';
        }
      }

      var result = '';
      var className = 'RootObject';

      function getType(val) {
        if (typeof val === 'string') return 'string';
        if (typeof val === 'number') return 'number';
        if (typeof val === 'boolean') return 'boolean';
        if (Array.isArray(val)) return 'any[]';
        return 'any';
      }

      if (lang === 'typescript') {
        result += 'export interface ' + className + ' {\n';
        for (var key in obj) {
          result += '  ' + key + ': ' + getType(obj[key]) + ';\n';
        }
        result += '}\n';
      } 
      else if (lang === 'java') {
        result += 'public class ' + className + ' {\n';
        for (var key in obj) {
          var type = getType(obj[key]);
          if (type === 'number') type = 'Double';
          if (type === 'string') type = 'String';
          if (type === 'boolean') type = 'Boolean';
          result += '    private ' + type + ' ' + key + ';\n';
        }
        result += '\n    // Getters and Setters...\n}\n';
      } 
      else if (lang === 'go') {
        result += 'type ' + className + ' struct {\n';
        for (var key in obj) {
          var type = getType(obj[key]);
          if (type === 'number') type = 'float64';
          if (type === 'string') type = 'string';
          if (type === 'boolean') type = 'bool';
          var capKey = key.charAt(0).toUpperCase() + key.slice(1);
          result += '    ' + capKey + ' ' + type + ' `json:"' + key + '"`\n';
        }
        result += '}\n';
      } 
      else if (lang === 'python') {
        result += 'class ' + className + ':\n';
        result += '    def __init__(self):\n';
        for (var key in obj) {
          result += '        self.' + key + ' = None\n';
        }
        result += '\n    @classmethod\n    def from_dict(cls, data):\n';
        result += '        instance = cls()\n';
        for (var key in obj) {
          result += '        instance.' + key + ' = data.get("' + key + '")\n';
        }
        result += '        return instance\n';
      }

      outEl.value = result;
    } catch (e) {
      outEl.value = 'JSON 解析失败: ' + e.message;
    }
  });

  // ================= 功能三：时间代码生成 =================
  var timeCodes = {
    js: `// JavaScript / TypeScript\nconst now = new Date();\nconsole.log(now.toISOString());\nconsole.log(now.toLocaleString());\nconsole.log(now.getTime()); // 时间戳(毫秒)`,
    python: `# Python\nimport time\nfrom datetime import datetime\n\nprint(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))\nprint(int(time.time())) # 时间戳(秒)`,
    java: `// Java\nimport java.time.LocalDateTime;\nimport java.time.format.DateTimeFormatter;\n\nLocalDateTime now = LocalDateTime.now();\nDateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");\nSystem.out.println(now.format(formatter));\nSystem.out.println(System.currentTimeMillis()); // 时间戳(毫秒)`,
    go: `// Go\npackage main\n\nimport (\n    "fmt"\n    "time"\n)\n\nfunc main() {\n    now := time.Now()\n    fmt.Println(now.Format("2006-01-02 15:04:05"))\n    fmt.Println(now.Unix()) // 时间戳(秒)\n    fmt.Println(now.UnixNano() / 1e6) // 时间戳(毫秒)\n}`,
    php: `<?php\n// PHP\necho date("Y-m-d H:i:s");\necho time(); // 时间戳(秒)\necho round(microtime(true) * 1000); // 时间戳(毫秒)\n?>`,
    sql: `-- SQL (MySQL)\nSELECT NOW();\nSELECT CURRENT_TIMESTAMP;\nSELECT UNIX_TIMESTAMP(); -- 时间戳(秒)`
  };

  var timeLang = document.getElementById('time-lang');
  var timeOutput = document.getElementById('time-output');

  function updateTimeCode() {
    timeOutput.value = timeCodes[timeLang.value];
  }
  timeLang.addEventListener('change', updateTimeCode);
  updateTimeCode(); // 初始化

  // ================= 功能四：Nginx 高亮 =================
  document.getElementById('btn-nginx').addEventListener('click', function () {
    var code = document.getElementById('nginx-input').value;
    var out = document.getElementById('nginx-output');
    if (!code) return;

    // 简单缩进格式化
    var formatted = code
      .replace(/\s*\{\s*/g, ' {\n  ')
      .replace(/\s*\}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*\n/g, '\n');

    // 简单正则高亮
    var html = formatted
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(#.*)/g, '<span class="hl-comm">$1</span>')
      .replace(/^(\s*)([a-zA-Z0-9_]+)/gm, '$1<span class="hl-key">$2</span>')
      .replace(/\s([^\s;{]+);/g, ' <span class="hl-val">$1</span>;');

    out.innerHTML = html;
  });

})();