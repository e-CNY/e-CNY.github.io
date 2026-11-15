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

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ================= DOM 元素 =================
  var tmplInput = document.getElementById('tm-template');
  var dataInput = document.getElementById('tm-data');
  var output = document.getElementById('tm-output');
  var codeOutput = document.getElementById('tm-code-output');
  var tabBtns = document.querySelectorAll('.tm-tab');
  
  var currentView = 'preview';

  // ================= 微型 Mustache 模板引擎 (AST 实现) =================
  // 支持 {{var}}, {{{var}}}, {{#if}}, {{#unless}}, {{#each}}, {{else}}
  
  function compile(template, data) {
    var tokens = tokenize(template);
    var ast = buildAST(tokens);
    return renderAST(ast, data, {}, {});
  }

  function tokenize(str) {
    var tokens = [];
    var regex = /(\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\})/g;
    var parts = str.split(regex);
    
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      
      if (part.startsWith('{{{')) {
        tokens.push({ type: 'raw', value: part.slice(3, -3).trim() });
      } else if (part.startsWith('{{')) {
        var tag = part.slice(2, -2).trim();
        if (tag.startsWith('#each')) {
          tokens.push({ type: 'open', block: 'each', value: tag.replace('#each', '').trim() });
        } else if (tag.startsWith('#if')) {
          tokens.push({ type: 'open', block: 'if', value: tag.replace('#if', '').trim() });
        } else if (tag.startsWith('#unless')) {
          tokens.push({ type: 'open', block: 'unless', value: tag.replace('#unless', '').trim() });
        } else if (tag === 'else') {
          tokens.push({ type: 'else' });
        } else if (tag.startsWith('/')) {
          tokens.push({ type: 'close', block: tag.slice(1) });
        } else {
          tokens.push({ type: 'var', value: tag });
        }
      } else {
        tokens.push({ type: 'text', value: part });
      }
    }
    return tokens;
  }

  function buildAST(tokens) {
    var root = { type: 'root', children: [] };
    var stack = [root];

    tokens.forEach(function(tk) {
      var current = stack[stack.length - 1];
      if (tk.type === 'open') {
        var node = { type: 'block', block: tk.block, value: tk.value, children: [], elseChildren: [], inElse: false };
        current.children.push(node);
        stack.push(node);
      } else if (tk.type === 'else') {
        if (current.type === 'block') current.inElse = true;
      } else if (tk.type === 'close') {
        stack.pop();
      } else {
        if (current.type === 'block' && current.inElse) {
          current.elseChildren.push(tk);
        } else {
          current.children.push(tk);
        }
      }
    });
    return root;
  }

  function getVal(obj, path, data, context) {
    if (path === 'this') return obj;
    if (path === '@index') return context._index;
    if (path === '@first') return context._first;
    if (path === '@last') return context._last;
    
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    if (cur === undefined && obj !== data) {
      // 回退到根数据
      cur = data;
      for (var j = 0; j < parts.length; j++) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[parts[j]];
      }
    }
    return cur;
  }

  function renderAST(ast, context, data, loopCtx) {
    var html = '';
    
    ast.children.forEach(function(node) {
      if (node.type === 'text') {
        html += node.value;
      } 
      else if (node.type === 'var') {
        var val = getVal(context, node.value, data, loopCtx);
        html += (val === undefined || val === null) ? '' : escapeHtml(val);
      }
      else if (node.type === 'raw') {
        var val = getVal(context, node.value, data, loopCtx);
        html += (val === undefined || val === null) ? '' : val;
      }
      else if (node.type === 'block') {
        var val = getVal(context, node.value, data, loopCtx);
        
        if (node.block === 'if') {
          if (val) {
            html += renderAST({ children: node.children }, context, data, loopCtx);
          } else {
            html += renderAST({ children: node.elseChildren }, context, data, loopCtx);
          }
        }
        else if (node.block === 'unless') {
          if (!val) {
            html += renderAST({ children: node.children }, context, data, loopCtx);
          } else {
            html += renderAST({ children: node.elseChildren }, context, data, loopCtx);
          }
        }
        else if (node.block === 'each') {
          if (Array.isArray(val) && val.length > 0) {
            val.forEach(function(item, index) {
              var newLoopCtx = { 
                _index: index, 
                _first: index === 0, 
                _last: index === val.length - 1 
              };
              html += renderAST({ children: node.children }, item, data, newLoopCtx);
            });
          } else {
            html += renderAST({ children: node.elseChildren }, context, data, loopCtx);
          }
        }
      }
    });
    return html;
  }

  // ================= 主流程 =================
  function doRender() {
    var tmpl = tmplInput.value;
    var dataStr = dataInput.value.trim();
    if (!tmpl) return;

    if (!dataStr) {
      dataStr = '{}';
    }

    try {
      var data = {};
      // 尝试解析 JSON
      if (dataStr.startsWith('{') || dataStr.startsWith('[')) {
        data = JSON.parse(dataStr);
      } else {
        // 尝试解析 YAML
        if (window.jsyaml) {
          data = jsyaml.load(dataStr);
        } else {
          throw new Error('无法解析数据，且未加载 YAML 库');
        }
      }

      var html = compile(tmpl, data);
      
      // 更新视图
      output.innerHTML = html;
      codeOutput.value = html;
      
      if (currentView === 'code') {
        output.style.display = 'none';
        codeOutput.style.display = 'block';
      } else {
        output.style.display = 'block';
        codeOutput.style.display = 'none';
      }

    } catch (e) {
      output.innerHTML = '<div style="color:#a8452a; padding:20px; background:#fee2e2; border-radius:8px;">❌ 解析或渲染失败: ' + e.message + '</div>';
      codeOutput.value = '// 解析失败: ' + e.message;
    }
  }

  // 防抖渲染
  var debounceTimer;
  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doRender, 300);
  }

  tmplInput.addEventListener('input', handleInput);
  dataInput.addEventListener('input', handleInput);

  // 绑定 Tab 切换
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentView = this.dataset.view;
      
      if (currentView === 'code') {
        output.style.display = 'none';
        codeOutput.style.display = 'block';
      } else {
        output.style.display = 'block';
        codeOutput.style.display = 'none';
      }
    });
  });

  // ================= 文件导入导出 =================
  var tmplFile = document.getElementById('tmpl-file');
  var dataFile = document.getElementById('data-file');

  tmplFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      tmplInput.value = evt.target.result;
      doRender();
      showToast('模板导入成功');
    };
    reader.readAsText(file);
    this.value = '';
  });

  dataFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      dataInput.value = evt.target.result;
      doRender();
      showToast('数据导入成功');
    };
    reader.readAsText(file);
    this.value = '';
  });

  window.copyResult = function() {
    var text = codeOutput.value;
    if (!text) return showToast('没有可复制的内容');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 渲染源码已复制');
      }).catch(function () {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      codeOutput.select(); document.execCommand('copy'); showToast('✅ 已复制');
    }
  };

  window.downloadHtml = function() {
    var text = codeOutput.value;
    if (!text) return showToast('没有可下载的内容');
    var blob = new Blob([text], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'rendered_' + Date.now() + '.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('HTML 已下载');
  };

  window.renderTemplate = function() {
    doRender();
    showToast('渲染完成');
  };

  // ================= 示例库 =================
  window.loadExample = function(type) {
    if (type === 'user') {
      tmplInput.value = `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 400px;">
  <h2 style="margin-top:0; color:#333;">👤 {{name}}</h2>
  <p style="color:#666;">📧 {{email}}</p>
  
  {{#if isAdmin}}
    <div style="background: #fee2e2; color: #991b1b; padding: 8px; border-radius: 4px; display: inline-block;">管理员权限</div>
  {{else}}
    <div style="background: #dcfce7; color: #166534; padding: 8px; border-radius: 4px; display: inline-block;">普通用户</div>
  {{/if}}

  <h3 style="color:#333; border-bottom:1px solid #eee; padding-bottom:5px;">技能标签</h3>
  <ul style="padding-left:20px; color:#444;">
    {{#each skills}}
      <li>{{this}}</li>
    {{/each}}
  </ul>
</div>`;
      
      dataInput.value = JSON.stringify({
        name: "张三",
        email: "zhangsan@example.com",
        isAdmin: false,
        skills: ["HTML", "CSS", "JavaScript", "Vue", "Node.js"]
      }, null, 2);
    }
    else if (type === 'product') {
      tmplInput.value = `<h2>🛒 商品列表</h2>
<table>
  <thead>
    <tr>
      <th>序号</th>
      <th>商品名称</th>
      <th>价格</th>
      <th>状态</th>
    </tr>
  </thead>
  <tbody>
    {{#each products}}
      <tr>
        <td>{{@index}}</td>
        <td>{{name}}</td>
        <td>¥{{price}}</td>
        <td>
          {{#if stock}}
            <span style="color:green;">有货</span>
          {{else}}
            <span style="color:red;">缺货</span>
          {{/if}}
        </td>
      </tr>
    {{else}}
      <tr><td colspan="4" style="text-align:center;">暂无商品数据</td></tr>
    {{/each}}
  </tbody>
</table>`;

      dataInput.value = JSON.stringify({
        products: [
          { name: "机械键盘", price: 499, stock: true },
          { name: "人体工学鼠标", price: 299, stock: false },
          { name: "4K 显示器", price: 1999, stock: true }
        ]
      }, null, 2);
    }
    else if (type === 'nested') {
      tmplInput.value = `<h2>🗂️ 复杂嵌套演示 (循环套条件套循环)</h2>
{{#each departments}}
  <div style="border: 1px solid #ccc; margin-bottom: 15px; padding: 15px; border-radius: 8px; background: #fafafa;">
    <h3 style="margin-top:0;">部门：{{deptName}}</h3>
    {{#if employees}}
      <ul style="margin:0; padding-left:20px;">
        {{#each employees}}
          <li style="margin-bottom:8px;">
            <strong>{{name}}</strong> 
            {{#unless @first}}(组员){{/unless}}
            {{#if @last}}(最后一位){{/if}}
            
            {{#if skills}}
              <br><small style="color:#666;">技能：{{#each skills}}{{this}} / {{/each}}</small>
            {{/if}}
          </li>
        {{/each}}
      </ul>
    {{else}}
      <p style="color:#888;">该部门暂无员工</p>
    {{/if}}
  </div>
{{/each}}`;

      dataInput.value = JSON.stringify({
        departments: [
          {
            deptName: "技术部",
            employees: [
              { name: "张三", skills: ["前端", "Vue", "React"] },
              { name: "李四", skills: ["后端", "Java", "MySQL"] },
              { name: "王五", skills: [] }
            ]
          },
          {
            deptName: "人事部",
            employees: [
              { name: "赵六", skills: ["招聘", "培训"] }
            ]
          },
          {
            deptName: "财务部",
            employees: []
          }
        ]
      }, null, 2);
    }
    
    doRender();
    showToast('示例已加载');
  };

  // ================= 初始化 =================
  loadExample('user');

})();