(function () {
  var langSelect = document.getElementById('cf-language');
  var indentSelect = document.getElementById('cf-indent');
  var inputEl = document.getElementById('cf-input');
  var outputEl = document.getElementById('cf-output');
  var statusEl = document.getElementById('cf-status');

  var btnFormat = document.getElementById('btn-format');
  var btnMinify = document.getElementById('btn-minify');
  var btnCopy = document.getElementById('btn-copy');
  var btnClear = document.getElementById('btn-clear');

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
    if (!code) return;

    var lang = langSelect.value;
    var indent = getTabWidth();
    setStatus('正在格式化...', false);

    try {
      var result = '';

      if (lang === 'sql') {
        var sqlFmt = window.sqlFormatter || (window.sqlFormatter && window.sqlFormatter.default);
        if (!sqlFmt || typeof sqlFmt.format !== 'function') {
          throw new Error('SQL Formatter 脚本未正确加载，请检查网络');
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
      setStatus('✅ 格式化成功', false);
    } catch (e) {
      console.error(e);
      outputEl.value = '格式化失败:\n' + e.message;
      setStatus('❌ 格式化失败', true);
    }
  });

  // ================= 2. 极限压缩 =================
  btnMinify.addEventListener('click', function () {
    var code = inputEl.value.trim();
    if (!code) return;

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
        result = code.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line !== ''; }).join('\n');
        setStatus('⚠️ JS/TS 已去除空行，极限混淆需后端工具', true);
      }
      else if (lang === 'yaml' || lang === 'markdown' || lang === 'graphql') {
        return setStatus('⚠️ 该语言不支持极限压缩，建议使用格式化', true);
      }
      else {
        return setStatus('⚠️ 不支持该语言的压缩', true);
      }

      outputEl.value = result;
      if (lang !== 'javascript' && lang !== 'typescript') {
        setStatus('✅ 压缩成功', false);
      }
    } catch (e) {
      console.error(e);
      outputEl.value = '压缩失败:\n' + e.message;
      setStatus('❌ 压缩失败', true);
    }
  });

  // ================= 3. 复制 & 清空 =================
  btnCopy.addEventListener('click', function () {
    if (!outputEl.value) return;
    navigator.clipboard.writeText(outputEl.value).then(function() {
      var original = btnCopy.textContent;
      btnCopy.textContent = '✅ 已复制';
      btnCopy.style.color = '#7ba05b';
      setTimeout(function() { btnCopy.textContent = original; btnCopy.style.color = ''; }, 1500);
    });
  });

  btnClear.addEventListener('click', function () {
    inputEl.value = ''; outputEl.value = ''; statusEl.textContent = '';
  });

  // ================= 4. 示例数据注入 =================
  langSelect.addEventListener('change', function() {
    var lang = this.value;
    if (lang === 'json') {
      inputEl.value = '{"name":"test","age":18,"hobbies":["code","music"]}';
    } else if (lang === 'javascript') {
      inputEl.value = 'function test(){console.log("hello");return true}';
    } else if (lang === 'typescript') {
      inputEl.value = 'interface User{name:string;age:number}const u:User={name:"a",age:1};';
    } else if (lang === 'html') {
      inputEl.value = '<div><p>hello</p><button>click</button></div>';
    } else if (lang === 'css') {
      inputEl.value = '.box{display:flex;justify-content:center;align-items:center;padding:10px;}';
    } else if (lang === 'scss') {
      inputEl.value = '$primary: #333;\n.box{color:$primary;.nested{font-weight:bold;}}';
    } else if (lang === 'yaml') {
      inputEl.value = 'version: "3.8"\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n      - "80:80"\n    volumes:\n      - ./html:/usr/share/nginx/html';
    } else if (lang === 'markdown') {
      inputEl.value = '# 标题\n\n这是一段**加粗**文本，包含[链接](https://example.com)。\n- 列表 1\n- 列表 2\n\n```javascript\nconsole.log("Hello");\n```';
    } else if (lang === 'sql') {
      inputEl.value = 'select * from users where age > 18 order by id desc limit 10;';
    } else if (lang === 'vue') {
      inputEl.value = '<template><div>{{ msg }}</div></template><script>export default{data(){return{msg:"Hello"}}}</script>';
    } else if (lang === 'graphql') {
      inputEl.value = 'query{user(id:1){name,email,posts{title}}}';
    } else {
      inputEl.value = '';
    }
  });
  langSelect.dispatchEvent(new Event('change'));

})();