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
  var langSelect = document.getElementById('cf-language');
  var indentSelect = document.getElementById('cf-indent');
  var inputEl = document.getElementById('cf-input');
  var outputEl = document.getElementById('cf-output');
  var statusEl = document.getElementById('cf-status');
  var fileInput = document.getElementById('cf-file');
  var inputBox = inputEl.parentElement.parentElement; // .cf-col

  var btnFormat = document.getElementById('btn-format');
  var btnMinify = document.getElementById('btn-minify');
  var btnCopy = document.getElementById('btn-copy');
  var btnDownload = document.getElementById('btn-download');
  var btnClear = document.getElementById('btn-clear');

  // 行号元素
  var lineNumsIn = document.getElementById('line-nums-in');
  var lineNumsOut = document.getElementById('line-nums-out');

  // ================= 状态与初始化 =================
  function getTabWidth() {
    var val = indentSelect.value;
    if (val === 'tab') return '\t';
    return parseInt(val, 10) || 2;
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = isError ? 'error' : 'success';
    if (msg) {
      setTimeout(function() { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 3000);
    }
  }

  // 文件扩展名映射
  var extMap = {
    'javascript': 'js',
    'typescript': 'ts',
    'html': 'html',
    'vue': 'vue',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'markdown': 'md',
    'sql': 'sql',
    'graphql': 'graphql'
  };

  function getParserAndPlugins(lang) {
    var parser = lang;
    var plugins = [];

    if (lang === 'javascript') {
      parser = 'babel'; plugins = [prettierPlugins.babel, prettierPlugins.estree];
    } else if (lang === 'typescript') {
      parser = 'typescript'; plugins = [prettierPlugins.typescript, prettierPlugins.estree];
    } else if (lang === 'json') {
      parser = 'json'; plugins = [prettierPlugins.babel, prettierPlugins.estree];
    } else if (lang === 'html' || lang === 'vue') {
      parser = lang; plugins = [prettierPlugins.html];
    } else if (lang === 'css' || lang === 'scss') {
      parser = lang; plugins = [prettierPlugins.postcss];
    } else if (lang === 'yaml') {
      parser = 'yaml'; plugins = [prettierPlugins.yaml];
    } else if (lang === 'markdown') {
      parser = 'markdown'; plugins = [prettierPlugins.markdown];
    } else if (lang === 'graphql') {
      parser = 'graphql'; plugins = [prettierPlugins.graphql];
    }
    return { parser: parser, plugins: plugins };
  }

  // ================= 1. 格式化 =================
  btnFormat.addEventListener('click', async function () {
    var code = inputEl.value.trim();
    if (!code) return showToast('请输入需要格式化的代码');

    var lang = langSelect.value;
    var indent = getTabWidth();
    setStatus('正在格式化...', false);

    try {
      var result = '';

      if (lang === 'sql') {
        var sqlFmt = window.sqlFormatter || (window.sqlFormatter && window.sqlFormatter.default);
        if (!sqlFmt || typeof sqlFmt.format !== 'function') {
          throw new Error('SQL Formatter 脚本未正确加载');
        }
        result = sqlFmt.format(code, {
          tabWidth: indent === '\t' ? 4 : indent,
          keywordCase: 'upper'
        });
      } else {
        if (typeof prettier === 'undefined') throw new Error('Prettier 未加载');
        var config = getParserAndPlugins(lang);

        result = await prettier.format(code, {
          parser: config.parser,
          plugins: config.plugins,
          tabWidth: indent === '\t' ? 4 : indent,
          useTabs: indent === '\t'
        });
      }

      outputEl.value = result;
      updateLineNums();
      setStatus('✅ 格式化成功', false);
      showToast('格式化成功');
    } catch (e) {
      console.error(e);
      outputEl.value = '格式化失败:\n' + e.message;
      updateLineNums();
      setStatus('❌ 格式化失败', true);
      showToast('格式化失败，请检查代码语法');
    }
  });

  // ================= 2. 极限压缩 =================
  btnMinify.addEventListener('click', function () {
    var code = inputEl.value.trim();
    if (!code) return showToast('请输入需要压缩的代码');

    var lang = langSelect.value;
    setStatus('正在压缩...', false);

    try {
      var result = '';

      if (lang === 'json') {
        var obj = JSON.parse(code);
        result = JSON.stringify(obj);
      } 
      else if (lang === 'sql') {
        var sqlFmt = window.sqlFormatter || (window.sqlFormatter && window.sqlFormatter.default);
        if (!sqlFmt) throw new Error('SQL Formatter 未加载');
        result = sqlFmt.format(code, { tabWidth: 0 }).replace(/\n\s*/g, ' ');
      } 
      else if (lang === 'css' || lang === 'scss') {
        result = code.replace(/\/\*[\s\S]*?\*\//g, '')
                     .replace(/\s+/g, ' ')
                     .replace(/\s*([{};:,>+])\s*/g, '$1')
                     .trim();
      } 
      else if (lang === 'html' || lang === 'vue') {
        result = code.replace(/<!--[\s\S]*?-->/g, '')
                     .replace(/>\s+</g, '><')
                     .replace(/\s{2,}/g, ' ')
                     .trim();
      }
      else if (lang === 'javascript' || lang === 'typescript') {
        // 简单安全压缩（仅去空行和首尾空格，不破坏语义）
        result = code.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line !== ''; }).join('\n');
        setStatus('⚠️ JS/TS 已去除空行', true);
        showToast('JS/TS 已去除空行，极致混淆请用专用工具');
      }
      else if (lang === 'yaml' || lang === 'markdown' || lang === 'graphql') {
        return showToast('该语言不支持极限压缩，建议使用格式化');
      }
      else {
        return showToast('不支持该语言的压缩');
      }

      outputEl.value = result;
      updateLineNums();
      if (lang !== 'javascript' && lang !== 'typescript') {
        setStatus('✅ 压缩成功', false);
        showToast('压缩成功');
      }
    } catch (e) {
      console.error(e);
      outputEl.value = '压缩失败:\n' + e.message;
      updateLineNums();
      setStatus('❌ 压缩失败', true);
      showToast('压缩失败: ' + e.message);
    }
  });

  // ================= 3. 复制、下载、清空 =================
  btnCopy.addEventListener('click', function () {
    if (!outputEl.value) return showToast('没有可复制的内容');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outputEl.value).then(function() {
        showToast('✅ 已复制到剪贴板');
      }).catch(function() {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      outputEl.select(); document.execCommand('copy'); showToast('✅ 已复制');
    }
  });

  btnDownload.addEventListener('click', function () {
    if (!outputEl.value) return showToast('没有可下载的内容');
    var lang = langSelect.value;
    var ext = extMap[lang] || 'txt';
    var filename = 'formatted_code_' + Date.now() + '.' + ext;

    var blob = new Blob([outputEl.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('文件已下载');
  });

  btnClear.addEventListener('click', function () {
    inputEl.value = ''; 
    outputEl.value = ''; 
    statusEl.textContent = '';
    updateLineNums();
    showToast('已清空');
  });

  // ================= 4. 行号更新与 Tab 支持 =================
  function updateLineNums() {
    function calcLineNums(text) {
      var count = text.split('\n').length;
      var arr = [];
      for (var i = 1; i <= count; i++) arr.push(i);
      return arr.join('\n');
    }
    lineNumsIn.textContent = calcLineNums(inputEl.value || '');
    lineNumsOut.textContent = calcLineNums(outputEl.value || '');
  }

  inputEl.addEventListener('input', updateLineNums);
  outputEl.addEventListener('scroll', function() {
    lineNumsOut.scrollTop = outputEl.scrollTop;
  });
  inputEl.addEventListener('scroll', function() {
    lineNumsIn.scrollTop = inputEl.scrollTop;
  });

  // 按 Tab 键插入缩进
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      var indentStr = indentSelect.value === 'tab' ? '\t' : ' '.repeat(parseInt(indentSelect.value, 10));
      
      this.value = this.value.substring(0, start) + indentStr + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + indentStr.length;
      updateLineNums();
    }
    // Ctrl + Enter 快速格式化
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      btnFormat.click();
    }
  });

  // ================= 5. 文件导入与拖拽 =================
  document.querySelector('.cf-upload-btn').addEventListener('click', function() {
    fileInput.click();
  });

  fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) readFile(file);
    this.value = '';
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    inputBox.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  inputBox.addEventListener('dragover', function() { inputBox.classList.add('dragover'); });
  inputBox.addEventListener('dragleave', function() { inputBox.classList.remove('dragover'); });
  inputBox.addEventListener('drop', function(e) {
    inputBox.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0]);
    }
  });

  function readFile(file) {
    if (file.size > 5 * 1024 * 1024) return showToast('文件过大，请限制在 5MB 以内');
    var reader = new FileReader();
    reader.onload = function(evt) {
      inputEl.value = evt.target.result;
      updateLineNums();
      showToast('文件导入成功: ' + file.name);
      
      // 尝试自动推断语言
      var name = file.name.toLowerCase();
      if (name.endsWith('.json')) langSelect.value = 'json';
      else if (name.endsWith('.js')) langSelect.value = 'javascript';
      else if (name.endsWith('.ts')) langSelect.value = 'typescript';
      else if (name.endsWith('.html')) langSelect.value = 'html';
      else if (name.endsWith('.vue')) langSelect.value = 'vue';
      else if (name.endsWith('.css')) langSelect.value = 'css';
      else if (name.endsWith('.scss')) langSelect.value = 'scss';
      else if (name.endsWith('.yaml') || name.endsWith('.yml')) langSelect.value = 'yaml';
      else if (name.endsWith('.md')) langSelect.value = 'markdown';
      else if (name.endsWith('.sql')) langSelect.value = 'sql';
      else if (name.endsWith('.graphql') || name.endsWith('.gql')) langSelect.value = 'graphql';
    };
    reader.readAsText(file);
  }

  // ================= 6. 示例数据与语言联动 =================
  langSelect.addEventListener('change', function() {
    var lang = this.value;
    // 如果用户之前没有输入内容，或者输入框只有示例代码，切换语言自动更新示例
    if (!inputEl.value.trim() || inputEl.dataset.isSample === 'true') {
      var samples = {
        json: '{"name":"test","age":18,"hobbies":["code","music"]}',
        javascript: 'function test(){console.log("hello");return true}',
        typescript: 'interface User{name:string;age:number}const u:User={name:"a",age:1};',
        html: '<div><p>hello</p><button>click</button></div>',
        css: '.box{display:flex;justify-content:center;align-items:center;padding:10px;}',
        scss: '$primary: #333;\n.box{color:$primary;.nested{font-weight:bold;}}',
        yaml: 'version: "3.8"\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n      - "80:80"',
        markdown: '# 标题\n\n这是一段**加粗**文本。\n- 列表 1\n- 列表 2',
        sql: 'select * from users where age > 18 order by id desc limit 10;',
        vue: '<template><div>{{ msg }}</div></template><script>export default{data(){return{msg:"Hello"}}}</script>',
        graphql: 'query{user(id:1){name,email,posts{title}}}'
      };
      inputEl.value = samples[lang] || '';
      inputEl.dataset.isSample = 'true';
      updateLineNums();
    } else {
      inputEl.dataset.isSample = 'false';
    }
  });

  // 触发一次初始载入
  langSelect.dispatchEvent(new Event('change'));

})();