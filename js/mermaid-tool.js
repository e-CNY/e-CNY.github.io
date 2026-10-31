(function () {
  // 初始化 Mermaid
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
  });

  var textarea = document.getElementById('mm-code');
  var preview = document.getElementById('mm-preview');
  var sampleSelect = document.getElementById('mm-sample');

  var samples = {
    flow: `graph TD
    A[开始] --> B{是否登录?}
    B -- 是 --> C[进入主页]
    B -- 否 --> D[跳转登录页]
    C --> E[浏览商品]
    E --> F[加入购物车]
    F --> G[结算付款]
    G --> H([结束])`,
    sequence: `sequenceDiagram
    participant U as 用户
    participant S as 服务器
    participant DB as 数据库
    U->>S: 发送登录请求 (账号/密码)
    activate S
    S->>DB: 查询用户信息
    activate DB
    DB-->>S: 返回密码哈希
    deactivate DB
    S-->>U: 返回登录成功 Token
    deactivate S`,
    mindmap: `mindmap
  root((工具站))
    前端
      HTML/CSS
      JavaScript
      React/Vue
    后端
      Node.js
      Python
      Java
    数据库
      MySQL
      MongoDB
      Redis`
  };

  function render() {
    var code = textarea.value;
    preview.removeAttribute('data-processed');
    preview.innerHTML = code;
    
    try {
      mermaid.init(undefined, preview);
    } catch (e) {
      preview.innerHTML = '<div style="color:#a8452a; font-size:.9rem;">语法错误，无法渲染图表。<br><br>' + e.message + '</div>';
    }
  }

  sampleSelect.addEventListener('change', function () {
    textarea.value = samples[this.value];
    render();
  });

  document.getElementById('btn-render').addEventListener('click', render);

  // 初始化
  textarea.value = samples.flow;
  render();
})();