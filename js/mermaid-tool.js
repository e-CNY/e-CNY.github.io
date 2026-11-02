(function () {
  var textarea = document.getElementById('mm-code');
  var preview = document.getElementById('mm-preview');
  var sampleSelect = document.getElementById('mm-sample');
  var themeSelect = document.getElementById('mm-theme');

  var samples = {
    flow: `graph TD
    A[开始] --> B{是否登录?}
    B -- 是 --> C[进入主页]
    B -- 否 --> D[跳转登录页]
    C --> E([结束])
    
    %% 自定义节点颜色和形状
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5
    classDef green fill:#9f6,stroke:#333,stroke-width:2px;
    class C green;`,
    sequence: `sequenceDiagram
    participant U as 用户
    participant S as 服务器
    U->>S: 发送请求
    activate S
    S-->>U: 返回数据
    deactivate S`,
    mindmap: `mindmap
  root((前端知识))
    基础
      HTML
      CSS
      JavaScript
    框架
      React
      Vue
    工程化
      Webpack
      Vite`,
    gantt: `gantt
    title 项目开发进度
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析       :a1, 2023-10-01, 5d
    UI设计        :after a1, 7d
    section 开发阶段
    前端开发       :2023-10-10, 15d
    后端开发       :2023-10-12, 20d
    section 测试上线
    测试与修复     :2023-11-01, 10d
    上线部署       :2023-11-12, 3d`,
    state: `stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付: 用户付款
    待支付 --> 已取消: 用户取消
    已支付 --> 已发货: 商家发货
    已发货 --> 已收货: 用户确认
    已收货 --> [*]`,
    class: `classDiagram
    class Animal {
      +String name
      +int age
      +makeSound()
    }
    class Dog {
      +String breed
      +bark()
    }
    class Cat {
      +scratch()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
    er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string custNumber
    }
    ORDER {
        int orderNumber
    }`
  };

  function render() {
    var code = textarea.value;
    var theme = themeSelect.value;
    
    // 重新初始化主题
    mermaid.initialize({
      startOnLoad: false,
      theme: theme,
      securityLevel: 'loose'
    });

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

  themeSelect.addEventListener('change', render);
  document.getElementById('btn-render').addEventListener('click', render);

  // 初始化
  textarea.value = samples.flow;
  render();
})();