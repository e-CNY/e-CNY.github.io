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

  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

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
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      
      var text = targetEl.value !== undefined ? targetEl.value : targetEl.innerText;
      if (!text) return showToast('没有可复制的内容');
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          showToast('✅ 已复制到剪贴板');
        }).catch(function() { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
      
      function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        showToast('✅ 已复制到剪贴板');
      }
    });
  });

  // ================= 功能一：Gitignore =================
  var gitTemplates = {
    node: "node_modules/\nnpm-debug.log\nyarn-debug.log\nyarn-error.log\ndist/\nbuild/\n.env\n.env.local\n.DS_Store",
    python: "__pycache__/\n*.py[cod]\n*$py.class\nvenv/\n.env/\n.pytest_cache/\nbuild/\ndist/\n*.egg-info/",
    java: "target/\n*.class\n*.jar\n*.war\n.settings/\n.classpath\n.project\n*.iml",
    go: "*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\ngo.sum\nvendor/\n.idea/",
    rust: "target/\n**/*.rs.bk\nCargo.lock",
    cpp: "*.o\n*.obj\n*.exe\n*.dll\n*.so\n*.a\n*.lib\nbuild/\ncmake-build-debug/",
    swift: "build/\nDerivedData/\n*.xcuserstate\n*.pbxuser\n*.mode1v3\n*.mode2v3\n*.perspectivev3\nxcuserdata/",
    csharp: "bin/\nobj/\n*.user\n*.suo\n*.userprefs\n*.cache",
    unity: "[Ll]ibrary/\n[Tt]emp/\n[Oo]bj/\n[Bb]uild/\n[Bb]uilds/\n[Ll]ogs/\n[Uu]ser[Ss]ettings/\n*.csproj\n*.unityproj\n*.sln\n*.suo\n*.user\n*.userprefs\n*.pidb\n*.booproj\n*.svd",
    os: ".DS_Store\n.AppleDouble\n.LSOverride\nThumbs.db\nehthumbs.db\nDesktop.ini",
    ide: ".vscode/\n.idea/\n*.sublime-project\n*.sublime-workspace"
  };

  var gitOutput = document.getElementById('git-output');

  function generateGitignore() {
    var checkboxes = document.querySelectorAll('.dv-check input:checked');
    var result = [];
    checkboxes.forEach(function (cb) {
      var type = cb.value;
      if (gitTemplates[type]) {
        result.push("# --- " + type.toUpperCase() + " ---");
        result.push(gitTemplates[type]);
        result.push("");
      }
    });
    gitOutput.value = result.join('\n').trim();
  }

  document.querySelectorAll('.dv-check input').forEach(function(cb) {
    cb.addEventListener('change', generateGitignore);
  });
  generateGitignore(); // 初始化

  document.getElementById('btn-git-download').addEventListener('click', function() {
    if (!gitOutput.value) return showToast('请先勾选配置');
    downloadFile(gitOutput.value, '.gitignore', 'text/plain');
    showToast('.gitignore 文件已下载');
  });

  // ================= 功能二：JSON 转实体类 =================
  document.getElementById('btn-entity-sample').addEventListener('click', function() {
    var sample = {
      id: 1024,
      name: "张三",
      isActive: true,
      tags: ["admin", "editor"],
      profile: {
        age: 30,
        email: "zhangsan@example.com",
        address: {
          city: "Beijing",
          zip: "100000"
        }
      },
      orders: [
        { orderId: "A001", amount: 99.5, status: "paid" },
        { orderId: "A002", amount: 150, status: "pending" }
      ]
    };
    document.getElementById('entity-input').value = JSON.stringify(sample, null, 2);
    document.getElementById('btn-entity').click();
  });

  document.getElementById('btn-entity').addEventListener('click', function () {
    var jsonStr = document.getElementById('entity-input').value.trim();
    var lang = document.getElementById('entity-lang').value;
    var rootNameInput = document.getElementById('entity-class-name').value.trim();
    var rootName = rootNameInput || 'RootObject';
    var outEl = document.getElementById('entity-output');
    
    if (!jsonStr) return showToast('请先输入 JSON');

    try {
      var obj = JSON.parse(jsonStr);
      if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object') {
          obj = obj[0]; // 提取数组第一个元素作为模板
        } else {
          throw new Error('输入必须是 JSON 对象或包含对象的数组');
        }
      }
      if (typeof obj !== 'object' || obj === null) throw new Error('输入必须是一个 JSON 对象');

      var classes = [];
      var definedClasses = {};

      function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      }

      function getTypeName(val, key) {
        if (val === null) return 'any';
        if (typeof val === 'string') return 'string';
        if (typeof val === 'number') return 'number';
        if (typeof val === 'boolean') return 'boolean';
        
        if (Array.isArray(val)) {
          if (val.length === 0) return 'any[]';
          var itemType = getTypeName(val[0], key + 'Item');
          return itemType + '[]';
        }
        
        if (typeof val === 'object') {
          var subName = capitalize(key || 'NestedObject');
          generateClass(val, subName);
          return subName;
        }
        return 'any';
      }

      function generateClass(data, className) {
        if (definedClasses[className]) return;
        definedClasses[className] = true;

        var lines = [];
        var fields = [];

        for (var key in data) {
          var type = getTypeName(data[key], key);
          fields.push({ name: key, type: type });
        }

        if (lang === 'typescript') {
          lines.push('export interface ' + className + ' {');
          fields.forEach(function(f) {
            lines.push('  ' + f.name + ': ' + f.type + ';');
          });
          lines.push('}');
        } 
        else if (lang === 'java') {
          lines.push('public class ' + className + ' {');
          fields.forEach(function(f) {
            var jType = f.type;
            if (jType === 'number') jType = 'Double';
            if (jType === 'string') jType = 'String';
            if (jType === 'boolean') jType = 'Boolean';
            lines.push('    private ' + jType + ' ' + f.name + ';');
          });
          lines.push('\n    // Getters and Setters...\n}');
        } 
        else if (lang === 'go') {
          lines.push('type ' + className + ' struct {');
          fields.forEach(function(f) {
            var gType = f.type;
            if (gType === 'number') gType = 'float64';
            if (gType === 'string') gType = 'string';
            if (gType === 'boolean') gType = 'bool';
            if (gType.endsWith('[]')) gType = '[]' + gType.replace('[]', '');
            lines.push('    ' + capitalize(f.name) + ' ' + gType + ' `json:"' + f.name + '"`');
          });
          lines.push('}');
        } 
        else if (lang === 'python') {
          lines.push('class ' + className + ':');
          lines.push('    def __init__(self):');
          if (fields.length === 0) lines.push('        pass');
          fields.forEach(function(f) {
            lines.push('        self.' + f.name + ' = None');
          });
        }
        else if (lang === 'csharp') {
          lines.push('public class ' + className + '\n{');
          fields.forEach(function(f) {
            var cType = f.type;
            if (cType === 'number') cType = 'double';
            if (cType === 'string') cType = 'string';
            if (cType === 'boolean') cType = 'bool';
            lines.push('    public ' + cType + ' ' + capitalize(f.name) + ' { get; set; }');
          });
          lines.push('}');
        }
        else if (lang === 'dart') {
          lines.push('class ' + className + ' {');
          fields.forEach(function(f) {
            var dType = f.type;
            if (dType === 'number') dType = 'double';
            if (dType === 'string') dType = 'String';
            if (dType === 'boolean') dType = 'bool';
            lines.push('  final ' + dType + ' ' + f.name + ';');
          });
          lines.push('\n  ' + className + '({');
          fields.forEach(function(f) { lines.push('    this.' + f.name + ','); });
          lines.push('  });');
          lines.push('}');
        }

        classes.push(lines.join('\n'));
      }

      // 开始递归生成
      generateClass(obj, rootName);

      // 倒序输出，让根类在最上面（取决于递归生成的顺序）
      outEl.value = classes.reverse().join('\n\n');
      showToast('实体类生成成功');
    } catch (e) {
      outEl.value = '❌ 解析或生成失败: ' + e.message;
      showToast('生成失败，请检查 JSON 格式');
    }
  });

  // ================= 功能三：Cron 表达式 =================
  var cronMins = document.getElementById('cron-min');
  var cronHours = document.getElementById('cron-hour');
  var cronDays = document.getElementById('cron-day');
  var cronMonths = document.getElementById('cron-month');
  var cronWeeks = document.getElementById('cron-week');
  var cronResult = document.getElementById('cron-result');
  var cronDesc = document.getElementById('cron-desc');

  function updateCron() {
    var min = cronMins.value.trim() || '*';
    var hour = cronHours.value.trim() || '*';
    var day = cronDays.value.trim() || '*';
    var month = cronMonths.value.trim() || '*';
    var week = cronWeeks.value.trim() || '*';

    var expr = [min, hour, day, month, week].join(' ');
    cronResult.value = expr;

    // 简单的中文描述生成
    var desc = '执行时间: ';
    if (min === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
      desc = '每分钟执行一次';
    } else {
      if (min !== '*') desc += min + ' 分 ';
      if (hour !== '*') desc += hour + ' 时 ';
      if (day !== '*') desc += day + ' 日 ';
      if (month !== '*') desc += month + ' 月 ';
      if (week !== '*') desc += '星期 ' + week;
    }
    cronDesc.textContent = desc;
  }

  [cronMins, cronHours, cronDays, cronMonths, cronWeeks].forEach(function(el) {
    el.addEventListener('input', updateCron);
  });

  document.querySelectorAll('.cron-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cron = this.dataset.cron.split(' ');
      cronMins.value = cron[0];
      cronHours.value = cron[1];
      cronDays.value = cron[2];
      cronMonths.value = cron[3];
      cronWeeks.value = cron[4];
      updateCron();
    });
  });

  // ================= 功能四：时间代码 =================
  var timeCodes = {
    js: `// JavaScript / TypeScript\nconst now = new Date();\nconsole.log(now.toISOString());\nconsole.log(now.toLocaleString());\nconsole.log(now.getTime()); // 时间戳(毫秒)`,
    python: `# Python\nimport time\nfrom datetime import datetime, timezone\n\nprint(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))\nprint(datetime.now(timezone.utc).isoformat())\nprint(int(time.time())) # 时间戳(秒)`,
    java: `// Java\nimport java.time.LocalDateTime;\nimport java.time.ZonedDateTime;\nimport java.time.format.DateTimeFormatter;\n\nLocalDateTime now = LocalDateTime.now();\nDateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");\nSystem.out.println(now.format(formatter));\nSystem.out.println(ZonedDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));\nSystem.out.println(System.currentTimeMillis()); // 时间戳(毫秒)`,
    go: `// Go\npackage main\n\nimport (\n    "fmt"\n    "time"\n)\n\nfunc main() {\n    now := time.Now()\n    fmt.Println(now.Format("2006-01-02 15:04:05"))\n    fmt.Println(now.Format(time.RFC3339))\n    fmt.Println(now.Unix()) // 时间戳(秒)\n    fmt.Println(now.UnixNano() / 1e6) // 时间戳(毫秒)\n}`,
    php: `<?php\n// PHP\necho date("Y-m-d H:i:s");\necho date("c"); // ISO 8601\necho time(); // 时间戳(秒)\necho round(microtime(true) * 1000); // 时间戳(毫秒)\n?>`,
    csharp: `// C#\nDateTime now = DateTime.Now;\nConsole.WriteLine(now.ToString("yyyy-MM-dd HH:mm:ss"));\nConsole.WriteLine(now.ToString("o")); // ISO 8601\nConsole.WriteLine(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()); // 时间戳(毫秒)`,
    rust: `// Rust\nuse chrono::Local;\n\nfn main() {\n    let now = Local::now();\n    println!("{}", now.format("%Y-%m-%d %H:%M:%S"));\n    println!("{}", now.to_rfc3339());\n    println!("{}", now.timestamp()); // 时间戳(秒)\n    println!("{}", now.timestamp_millis()); // 时间戳(毫秒)\n}`,
    swift: `// Swift\nlet now = Date()\nlet formatter = DateFormatter()\nformatter.dateFormat = "yyyy-MM-dd HH:mm:ss"\nprint(formatter.string(from: now))\nprint(ISO8601DateFormatter().string(from: now))\nprint(Int(now.timeIntervalSince1970)) // 时间戳(秒)\nprint(Int(now.timeIntervalSince1970 * 1000)) // 时间戳(毫秒)`,
    sql: `-- SQL (MySQL)\nSELECT NOW();\nSELECT CURRENT_TIMESTAMP;\nSELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s');\nSELECT UNIX_TIMESTAMP(); -- 时间戳(秒)\nSELECT UNIX_TIMESTAMP(NOW()) * 1000; -- 时间戳(毫秒)`
  };

  var timeLang = document.getElementById('time-lang');
  var timeOutput = document.getElementById('time-output');

  function updateTimeCode() {
    timeOutput.value = timeCodes[timeLang.value];
  }
  timeLang.addEventListener('change', updateTimeCode);
  updateTimeCode();

  // ================= 功能五：Nginx 高亮 =================
  document.getElementById('btn-nginx').addEventListener('click', function () {
    var code = document.getElementById('nginx-input').value.trim();
    var out = document.getElementById('nginx-output');
    var outText = document.getElementById('nginx-output-text');
    if (!code) return showToast('请输入 Nginx 代码');

    // 1. 简易格式化（基于括号层级）
    var lines = code.replace(/\{/g, ' {\n').replace(/\}/g, '\n}\n').replace(/;/g, ';\n').split('\n');
    var indent = 0;
    var formattedLines = [];

    lines.forEach(function(line) {
      line = line.trim();
      if (!line) return;
      
      if (line.startsWith('}')) {
        indent = Math.max(0, indent - 1);
      }
      
      var spaces = '  '.repeat(indent);
      formattedLines.push(spaces + line);
      
      if (line.endsWith('{')) {
        indent++;
      }
    });

    var formatted = formattedLines.join('\n');
    outText.value = formatted; // 存入隐藏 textarea 供复制

    // 2. 高亮
    var html = formatted
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(#.*)/g, '<span class="hl-comm">$1</span>')
      .replace(/^(\s*)([a-zA-Z0-9_]+)/gm, '$1<span class="hl-key">$2</span>')
      .replace(/\s([^\s;{]+);/g, ' <span class="hl-val">$1</span>;');

    out.innerHTML = html;
    showToast('格式化并高亮完成');
  });

})();