(function () {
  // ================= Tab 切换 =================
  var navBtns = document.querySelectorAll('.jt-nav-btn');
  var panels = document.querySelectorAll('.jt-panel');

  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      navBtns.forEach(function (b) { b.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });

  // ================= 0. 全局工具函数 =================
  function getEl(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ================= 1. JSON 格式化与校验 =================
  window.jsonFormat = function (space) {
    var input = getEl('json-input').value.trim();
    var errorMsg = getEl('json-error-msg');
    errorMsg.textContent = '';
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      getEl('json-output').value = JSON.stringify(obj, null, space);
    } catch (e) {
      errorMsg.textContent = '❌ 错误: ' + e.message;
    }
  };

  window.jsonMinify = function () {
    var input = getEl('json-input').value.trim();
    var errorMsg = getEl('json-error-msg');
    errorMsg.textContent = '';
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      getEl('json-output').value = JSON.stringify(obj);
    } catch (e) {
      errorMsg.textContent = '❌ 错误: ' + e.message;
    }
  };

  window.jsonEscape = function () {
    var input = getEl('json-input').value;
    getEl('json-output').value = JSON.stringify(input);
  };

  window.jsonUnescape = function () {
    var input = getEl('json-input').value;
    try {
      var obj = JSON.parse(input);
      if (typeof obj === 'string') getEl('json-output').value = obj;
      else getEl('json-output').value = JSON.stringify(obj, null, 2);
    } catch (e) {
      getEl('json-error-msg').textContent = '❌ 去转义失败，不是有效的 JSON 字符串';
    }
  };

  // ================= 2. YAML <-> JSON =================
  window.yamlToJson = function () {
    var input = getEl('yaml-input').value.trim();
    if (!input) return;
    try {
      var obj = jsyaml.load(input);
      getEl('yaml-output').value = JSON.stringify(obj, null, 2);
    } catch (e) {
      getEl('yaml-output').value = '❌ YAML 解析错误: ' + e.message;
    }
  };

  window.jsonToYaml = function () {
    var input = getEl('yaml-input').value.trim();
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      getEl('yaml-output').value = jsyaml.dump(obj);
    } catch (e) {
      getEl('yaml-output').value = '❌ JSON 解析错误: ' + e.message;
    }
  };

  // ================= 3. XML <-> JSON =================
  window.xmlToJson = function () {
    var input = getEl('xml-input').value.trim();
    if (!input) return;
    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(input, 'text/xml');
      var obj = xmlToJsonNode(xmlDoc.documentElement);
      getEl('xml-output').value = JSON.stringify(obj, null, 2);
    } catch (e) {
      getEl('xml-output').value = '❌ XML 解析错误: ' + e.message;
    }
  };

  function xmlToJsonNode(node) {
    if (node.nodeType === 3) return node.nodeValue.trim();
    var obj = {};
    if (node.attributes && node.attributes.length > 0) {
      obj['@attributes'] = {};
      for (var i = 0; i < node.attributes.length; i++) {
        var attr = node.attributes[i];
        obj['@attributes'][attr.nodeName] = attr.nodeValue;
      }
    }
    if (node.hasChildNodes()) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3 && child.nodeValue.trim() === '') continue;
        var nodeName = child.nodeName;
        var childObj = xmlToJsonNode(child);
        if (nodeName === '#text') nodeName = '#text';
        if (obj[nodeName] !== undefined) {
          if (!Array.isArray(obj[nodeName])) obj[nodeName] = [obj[nodeName]];
          obj[nodeName].push(childObj);
        } else {
          obj[nodeName] = childObj;
        }
      }
    }
    return Object.keys(obj).length === 0 ? '' : obj;
  }

  window.jsonToXml = function () {
    var input = getEl('xml-input').value.trim();
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      var xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + jsonToXmlNode('root', obj);
      getEl('xml-output').value = xmlStr;
    } catch (e) {
      getEl('xml-output').value = '❌ JSON 解析错误: ' + e.message;
    }
  };

  function jsonToXmlNode(tag, data) {
    var xml = '';
    if (Array.isArray(data)) {
      data.forEach(function (item) { xml += jsonToXmlNode(tag, item); });
    } else if (typeof data === 'object' && data !== null) {
      xml += '<' + tag + '>';
      for (var key in data) {
        if (key === '@attributes') {
          for (var attr in data[key]) {
            xml = xml.replace('<' + tag, '<' + tag + ' ' + attr + '="' + data[key][attr] + '"');
          }
        } else {
          xml += jsonToXmlNode(key, data[key]);
        }
      }
      xml += '</' + tag + '>';
    } else {
      xml += '<' + tag + '>' + String(data) + '</' + tag + '>';
    }
    return xml;
  }

  // ================= 4. TOML <-> JSON (内置纯原生) =================
  function nativeTomlParse(str) {
    var result = {};
    var current = result;
    var lines = str.split(/\r?\n/);
    var i = 0;
    
    while (i < lines.length) {
      var line = lines[i].trim();
      i++;
      
      if (!line || line.startsWith('#')) continue;
      
      if (line.startsWith('[') && line.endsWith(']')) {
        var tableName = line.slice(1, -1).trim();
        if (tableName.startsWith('[') && tableName.endsWith(']')) {
          tableName = tableName.slice(1, -1).trim();
        }
        var parts = tableName.split('.').map(function(p) { return p.trim().replace(/^["']|["']$/g, ''); });
        current = result;
        for (var p of parts) {
          if (!current[p]) current[p] = {};
          current = current[p];
        }
        continue;
      }
      
      var eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      
      var key = line.slice(0, eqIdx).trim().replace(/^["']|["']$/g, '');
      var valStr = line.slice(eqIdx + 1).trim();
      
      if (valStr.startsWith('[') && !valStr.endsWith(']')) {
        while (i < lines.length) {
          var nextLine = lines[i].trim();
          valStr += ' ' + nextLine;
          i++;
          if (nextLine.endsWith(']')) break;
        }
      }
      
      var hashIdx = valStr.indexOf('#');
      if (hashIdx !== -1 && !valStr.includes('"') && !valStr.includes("'")) {
        valStr = valStr.slice(0, hashIdx).trim();
      }
      
      current[key] = parseTomlValue(valStr);
    }
    return result;
  }

  function parseTomlValue(valStr) {
    if (valStr.startsWith('"') && valStr.endsWith('"')) {
      return valStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    }
    if (valStr.startsWith("'") && valStr.endsWith("'")) {
      return valStr.slice(1, -1);
    }
    if (valStr === 'true') return true;
    if (valStr === 'false') return false;
    
    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      var arrStr = valStr.slice(1, -1).trim();
      if (!arrStr) return [];
      return arrStr.split(',').map(function(v) { return parseTomlValue(v.trim()); });
    }
    
    var num = Number(valStr);
    if (!isNaN(num) && valStr !== '') return num;
    
    if (/^\d{4}-\d{2}-\d{2}/.test(valStr)) {
      return new Date(valStr);
    }
    return valStr;
  }

  function nativeTomlStringify(obj, prefix) {
    prefix = prefix || '';
    var lines = [];
    var tables = [];
    
    for (var key in obj) {
      var val = obj[key];
      if (val === null || val === undefined) continue;
      
      if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        tables.push({ key: key, val: val });
      } else {
        lines.push(key + ' = ' + stringifyTomlValue(val));
      }
    }
    
    var resultStr = lines.join('\n');
    
    for (var t of tables) {
      var tableName = prefix ? prefix + '.' + t.key : t.key;
      if (resultStr.length > 0 && !resultStr.endsWith('\n')) {
        resultStr += '\n';
      }
      resultStr += '\n[' + tableName + ']\n';
      var subStr = nativeTomlStringify(t.val, tableName);
      resultStr += subStr;
    }
    
    return resultStr;
  }

  function stringifyTomlValue(val) {
    if (typeof val === 'string') {
      return '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (Array.isArray(val)) {
      return '[' + val.map(stringifyTomlValue).join(', ') + ']';
    }
    return String(val);
  }

  window.tomlToJson = function () {
    var input = getEl('toml-input').value.trim();
    if (!input) return;
    try {
      var obj = nativeTomlParse(input);
      getEl('toml-output').value = JSON.stringify(obj, null, 2);
    } catch (e) {
      getEl('toml-output').value = '❌ TOML 解析错误: ' + e.message;
    }
  };

  window.jsonToToml = function () {
    var activeTab = document.querySelector('.jt-panel.active').id;
    var isJsonPanel = activeTab === 'panel-json';
    
    var input = isJsonPanel ? getEl('json-input').value.trim() : getEl('toml-input').value.trim();
    if (!input) return;
    
    try {
      var obj = JSON.parse(input);
      var outStr = nativeTomlStringify(obj);
      if (isJsonPanel) {
        getEl('json-output').value = outStr;
      } else {
        getEl('toml-output').value = outStr;
      }
    } catch (e) {
      var err = '❌ JSON 解析错误: ' + e.message;
      if (isJsonPanel) {
        getEl('json-output').value = err;
      } else {
        getEl('toml-output').value = err;
      }
    }
  };

  // ================= 5. BSON / Base64 =================
  window.jsonToBase64 = function () {
    var input = getEl('bson-input').value.trim();
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      var str = JSON.stringify(obj);
      var b64 = btoa(unescape(encodeURIComponent(str)));
      getEl('bson-output').value = b64;
    } catch (e) {
      getEl('bson-output').value = '❌ JSON 解析错误: ' + e.message;
    }
  };

  window.base64ToJson = function () {
    var input = getEl('bson-input').value.trim();
    if (!input) return;
    try {
      var str = decodeURIComponent(escape(atob(input)));
      var obj = JSON.parse(str);
      getEl('bson-output').value = JSON.stringify(obj, null, 2);
    } catch (e) {
      getEl('bson-output').value = '❌ Base64 解析错误: ' + e.message;
    }
  };

  // ================= 6. JSONPath =================
  window.runJsonPath = function () {
    var jsonStr = getEl('jsonpath-input').value.trim();
    var path = getEl('jsonpath-query').value.trim();
    if (!jsonStr || !path) return;
    try {
      var obj = JSON.parse(jsonStr);
      var result = jsonpath.query(obj, path);
      getEl('jsonpath-output').value = JSON.stringify(result, null, 2);
    } catch (e) {
      getEl('jsonpath-output').value = '❌ 执行错误: ' + e.message;
    }
  };

  // ================= 7. JMESPath =================
  window.runJmesPath = function () {
    var jsonStr = getEl('jmespath-input').value.trim();
    var path = getEl('jmespath-query').value.trim();
    if (!jsonStr || !path) return;
    try {
      var obj = JSON.parse(jsonStr);
      var result = jmespath.search(obj, path);
      getEl('jmespath-output').value = JSON.stringify(result, null, 2);
    } catch (e) {
      getEl('jmespath-output').value = '❌ 执行错误: ' + e.message;
    }
  };

  // ================= 8. JSON Pointer =================
  window.runJsonPointer = function () {
    var jsonStr = getEl('pointer-input').value.trim();
    var pointer = getEl('pointer-query').value.trim();
    if (!jsonStr || !pointer) return;
    try {
      var obj = JSON.parse(jsonStr);
      if (pointer === '') {
        getEl('pointer-output').value = JSON.stringify(obj, null, 2);
        return;
      }
      var parts = pointer.split('/').slice(1);
      var current = obj;
      for (var i = 0; i < parts.length; i++) {
        var part = decodeURIComponent(parts[i].replace(/~1/g, '/').replace(/~0/g, '~'));
        current = current[part];
        if (current === undefined) throw new Error('路径不存在: ' + part);
      }
      getEl('pointer-output').value = JSON.stringify(current, null, 2);
    } catch (e) {
      getEl('pointer-output').value = '❌ 定位失败: ' + e.message;
    }
  };

  // ================= 9. JSON Schema =================
  window.validateSchema = function () {
    var jsonStr = getEl('schema-json').value.trim();
    var schemaStr = getEl('schema-input').value.trim();
    var outEl = getEl('schema-output');
    if (!jsonStr || !schemaStr) return;
    
    outEl.innerHTML = '正在校验...';
    try {
      var data = JSON.parse(jsonStr);
      var schema = JSON.parse(schemaStr);
      var ajv = new Ajv();
      var validate = ajv.compile(schema);
      var valid = validate(data);
      
      if (valid) {
        outEl.innerHTML = '<span style="color:#7ba05b; font-weight:bold;">✅ 校验通过：数据符合 Schema 规范。</span>';
      } else {
        outEl.innerHTML = '<span style="color:#a8452a; font-weight:bold;">❌ 校验失败：</span><br>' + 
          validate.errors.map(function(err) { 
            return '- 路径 <b>' + err.instancePath + '</b>: ' + err.message; 
          }).join('<br>');
      }
    } catch (e) {
      outEl.innerHTML = '<span style="color:#a8452a;">❌ 处理失败: ' + e.message + '</span>';
    }
  };

  // ================= 10. JSON 结构 Diff =================
  window.runJsonDiff = function () {
    var aStr = getEl('diff-input-a').value.trim();
    var bStr = getEl('diff-input-b').value.trim();
    var outEl = getEl('diff-output');
    if (!aStr || !bStr) return;
    try {
      var objA = JSON.parse(aStr);
      var objB = JSON.parse(bStr);
      outEl.innerHTML = '';
      
      function renderDiff(a, b, path) {
        if (a === b) return '';
        if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
          if (a === undefined) return '<div>➕ <b>' + path + '</b>: <span class="diff-add">' + JSON.stringify(b) + '</span></div>';
          if (b === undefined) return '<div>➖ <b>' + path + '</b>: <span class="diff-remove">' + JSON.stringify(a) + '</span></div>';
          return '<div>🔄 <b>' + path + '</b>: <span class="diff-remove">' + JSON.stringify(a) + '</span> → <span class="diff-add">' + JSON.stringify(b) + '</span></div>';
        }
        if (Array.isArray(a) && Array.isArray(b)) {
          var res = '';
          var maxLen = Math.max(a.length, b.length);
          for (var i = 0; i < maxLen; i++) res += renderDiff(a[i], b[i], path + '[' + i + ']');
          return res;
        }
        var html = '';
        var keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        keys.forEach(function (k) {
          html += renderDiff(a[k], b[k], path ? path + '.' + k : k);
        });
        return html;
      }

      var diffHtml = renderDiff(objA, objB, '');
      outEl.innerHTML = diffHtml || '<span style="color:#7ba05b;">✅ 两个 JSON 完全一致。</span>';
    } catch (e) {
      outEl.innerHTML = '<span style="color:#a8452a;">❌ 解析错误: ' + e.message + '</span>';
    }
  };

  // ================= 11. 文本 Diff (支持行号) =================
  function initLineNumbers(textareaId, linesId) {
    var ta = document.getElementById(textareaId);
    var linesEl = document.getElementById(linesId);
    if(!ta || !linesEl) return; // 关键防错
    
    function update() {
      var linesCount = ta.value.split('\n').length;
      var arr = [];
      for(var i = 1; i <= linesCount; i++) arr.push(i);
      linesEl.innerHTML = arr.join('<br>');
      linesEl.scrollTop = ta.scrollTop;
    }
    ta.addEventListener('input', update);
    ta.addEventListener('scroll', function() { linesEl.scrollTop = ta.scrollTop; });
    update();
  }
  // 延迟一点点初始化，确保 DOM 已渲染
  setTimeout(function(){
    initLineNumbers('text-diff-old', 'lines-old');
    initLineNumbers('text-diff-new', 'lines-new');
  }, 100);

  window.runTextDiff = function () {
    var oldText = getEl('text-diff-old').value;
    var newText = getEl('text-diff-new').value;
    var outEl = getEl('text-diff-output');
    
    if (!oldText && !newText) return;

    if (!window.Diff && !window.jsdiff) {
      outEl.innerHTML = '<span style="color:#a8452a; padding: 12px; display: block;">❌ Diff 库未加载，请检查网络或 js/libs/diff.min.js</span>';
      return;
    }
    var diffLib = window.Diff || window.jsdiff;

    var ignoreCase = getEl('text-diff-ignore-case').checked;
    var ignoreSpace = getEl('text-diff-ignore-space').checked;

    // 末尾强制加 \n 解决 jsdiff 最后一行忽略失效的问题
    var o = oldText.endsWith('\n') ? oldText : oldText + '\n';
    var n = newText.endsWith('\n') ? newText : newText + '\n';

    var diffLines = diffLib.diffLines(o, n, {
      ignoreCase: ignoreCase,
      ignoreWhitespace: ignoreSpace
    });

    var html = '';
    var oldLineNum = 1;
    var newLineNum = 1;

    diffLines.forEach(function (part) {
      var lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      var typeClass = part.added ? 'diff-line-add' : (part.removed ? 'diff-line-remove' : 'diff-line-neutral');
      var prefix = part.added ? '+' : (part.removed ? '-' : ' ');
      
      lines.forEach(function (line) {
        var oldNumStr = '';
        var newNumStr = '';
        
        if (part.added) {
            newNumStr = newLineNum++;
        } else if (part.removed) {
            oldNumStr = oldLineNum++;
        } else {
            oldNumStr = oldLineNum++;
            newNumStr = newLineNum++;
        }

        html += '<div class="diff-line ' + typeClass + '">' +
          '<div class="diff-line-num">' + oldNumStr + '</div>' +
          '<div class="diff-line-num">' + newNumStr + '</div>' +
          '<div class="diff-line-prefix">' + prefix + '</div>' +
          '<div class="diff-line-content">' + escapeHtml(line) + '</div>' +
          '</div>';
      });
    });

    outEl.innerHTML = html || '<p style="color:#7ba05b; padding: 12px; margin: 0;">✅ 两边文本完全一致。</p>';
  };

  window.clearTextDiff = function () {
    getEl('text-diff-old').value = '';
    getEl('text-diff-new').value = '';
    getEl('text-diff-output').innerHTML = '';
    getEl('lines-old').innerHTML = '1';
    getEl('lines-new').innerHTML = '1';
  };

  // ================= 12. JSON 树形视图 =================
  window.renderTree = function () {
    var input = getEl('tree-input').value.trim();
    var outEl = getEl('tree-output');
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      outEl.innerHTML = buildTree(obj, null);
    } catch (e) {
      outEl.innerHTML = '<span style="color:#a8452a;">❌ JSON 解析错误: ' + e.message + '</span>';
    }
  };

  function buildTree(data, key) {
    var keyStr = key !== null ? '<span class="key">' + key + '</span>: ' : '';
    if (data === null) return '<div>' + keyStr + '<span class="null">null</span></div>';
    if (typeof data !== 'object') {
      var cls = typeof data === 'string' ? 'string' : (typeof data === 'number' ? 'number' : 'boolean');
      var val = typeof data === 'string' ? '"' + data + '"' : data;
      return '<div>' + keyStr + '<span class="' + cls + '">' + val + '</span></div>';
    }
    if (Array.isArray(data)) {
      var html = '<details><summary>' + keyStr + 'Array(' + data.length + ')</summary><ul>';
      data.forEach(function (item, i) { html += '<li>' + buildTree(item, i) + '</li>'; });
      return html + '</ul></details>';
    }
    var keys = Object.keys(data);
    var html = '<details><summary>' + keyStr + 'Object</summary><ul>';
    keys.forEach(function (k) { html += '<li>' + buildTree(data[k], k) + '</li>'; });
    return html + '</ul></details>';
  }

  // ================= 13. JSON 生成表单 =================
  window.generateForm = function () {
    var input = getEl('form-json').value.trim();
    var outEl = getEl('form-container');
    if (!input) return;
    try {
      var obj = JSON.parse(input);
      outEl.innerHTML = '';
      generateFormFields(obj, '', outEl);
    } catch (e) {
      outEl.innerHTML = '<span style="color:#a8452a;">❌ JSON 解析错误: ' + e.message + '</span>';
    }
  };

  function generateFormFields(data, path, container) {
    if (typeof data !== 'object' || data === null) {
      var div = document.createElement('div');
      div.className = 'form-group';
      var label = document.createElement('label');
      label.textContent = path || 'Value';
      var input;
      if (typeof data === 'boolean') {
        input = document.createElement('select');
        input.innerHTML = '<option value="true"' + (data ? ' selected' : '') + '>true</option><option value="false"' + (!data ? ' selected' : '') + '>false</option>';
      } else if (typeof data === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.value = data;
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = data;
      }
      input.dataset.path = path;
      div.appendChild(label);
      div.appendChild(input);
      container.appendChild(div);
      return;
    }
    if (Array.isArray(data)) {
      data.forEach(function (item, i) {
        generateFormFields(item, path + '[' + i + ']', container);
      });
      return;
    }
    for (var key in data) {
      generateFormFields(data[key], path ? path + '.' + key : key, container);
    }
  }

  window.formToJson = function () {
    var outEl = getEl('form-json');
    var container = getEl('form-container');
    var inputs = container.querySelectorAll('input, select');
    if (inputs.length === 0) return;

    var result = {};
    inputs.forEach(function (input) {
      var path = input.dataset.path;
      var val = input.value;
      if (input.type === 'number') val = Number(val);
      if (input.tagName === 'SELECT') val = val === 'true';
      
      var keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      var current = result;
      for (var i = 0; i < keys.length - 1; i++) {
        var k = keys[i];
        if (!current[k]) {
          current[k] = isNaN(keys[i + 1]) ? {} : [];
        }
        current = current[k];
      }
      current[keys[keys.length - 1]] = val;
    });

    outEl.value = JSON.stringify(result, null, 2);
  };

})();