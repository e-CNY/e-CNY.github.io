(function () {
  var tmplInput = document.getElementById('tm-template');
  var dataInput = document.getElementById('tm-data');
  var output = document.getElementById('tm-output');

  // 默认示例
  tmplInput.value = `<h2>你好，{{name}}！</h2>
<p>你的邮箱是：{{email}}</p>

<h3>技能列表：</h3>
<ul>
  {{#each skills}}
    <li>{{this}} - 熟练度：{{level}}</li>
  {{/each}}
</ul>`;

  dataInput.value = JSON.stringify({
    name: "张三",
    email: "zhangsan@example.com",
    skills: [
      { this: "JavaScript", level: "高级" },
      { this: "CSS", level: "中级" },
      { this: "Python", level: "初级" }
    ]
  }, null, 2);

  // 极简模板引擎实现
  function renderTemplate(template, data) {
    // 1. 处理 {{#each array}} ... {{/each}}
    template = template.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, function (match, key, content) {
      var arr = getVal(data, key);
      if (!Array.isArray(arr)) return '';
      
      return arr.map(function (item) {
        var tempContent = content;
        // 处理 {{this}}
        tempContent = tempContent.replace(/\{\{this\}\}/g, item);
        // 处理 {{this.xxx}} 或 {{xxx}}
        tempContent = tempContent.replace(/\{\{this\.([\w]+)\}\}/g, function(m, prop) {
          return typeof item === 'object' ? (item[prop] !== undefined ? item[prop] : '') : '';
        });
        // 处理 {{xxx}} (直接把 item 的属性当作当前上下文)
        tempContent = tempContent.replace(/\{\{([\w]+)\}\}/g, function(m, prop) {
          if (prop === 'this') return item;
          return typeof item === 'object' ? (item[prop] !== undefined ? item[prop] : m) : m;
        });
        return tempContent;
      }).join('');
    });

    // 2. 处理普通的 {{key}}
    template = template.replace(/\{\{([\w.]+)\}\}/g, function (match, key) {
      var val = getVal(data, key);
      return val !== undefined ? val : match;
    });

    return template;
  }

  // 辅助函数：获取对象的嵌套属性，如 a.b.c
  function getVal(obj, path) {
    return path.split('.').reduce(function (acc, part) {
      return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
  }

  function updatePreview() {
    var tmpl = tmplInput.value;
    var dataStr = dataInput.value;
    if (!tmpl || !dataStr) return;

    try {
      var data = JSON.parse(dataStr);
      var html = renderTemplate(tmpl, data);
      output.innerHTML = html;
    } catch (e) {
      output.innerHTML = '<span style="color:#a8452a;">JSON 解析错误: ' + e.message + '</span>';
    }
  }

  // 防抖处理
  var timer = null;
  function handleInput() {
    clearTimeout(timer);
    timer = setTimeout(updatePreview, 300);
  }

  tmplInput.addEventListener('input', handleInput);
  dataInput.addEventListener('input', handleInput);

  updatePreview();
})();