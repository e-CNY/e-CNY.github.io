(function () {
  // ====== 终极工具矩阵 ======
  var tools = [
    // 1. 生活与时间
    { name: '时间与计时工具', emoji: '⏱️', desc: '久坐 / 秒表 / 倒计时 / 番茄钟', href: 'tools/sitting-reminder/index.html', category: '生活' },
    { name: '时间日期工具箱', emoji: '🕒', desc: '时间戳 / 时区 / 日期加减 / 农历', href: 'tools/time-date-tool/index.html', category: '生活' },
    { name: 'Cron 表达式解析', emoji: '⏰', desc: '实时预测未来执行时间', href: 'tools/cron-tool/index.html', category: '生活' },
    { name: '随机数据工具箱', emoji: '🎲', desc: 'Mock 数据 / 抽奖 / 多面骰子', href: 'tools/mock-tool/index.html', category: '生活' },

    // 2. 图像与设计
    { name: '图片全家桶', emoji: '🖼️', desc: '转换 / 压缩 / EXIF / ASCII', href: 'tools/image-toolbox/index.html', category: '图像' },
    { name: '图片加水印', emoji: '💧', desc: '自定义字体与九宫格水印', href: 'tools/watermark/index.html', category: '图像' },
    { name: '码工具', emoji: '📱', desc: '二维码/条形码 生成与识别', href: 'tools/code-tool/index.html', category: '图像' },
    { name: '在线画板', emoji: '🎨', desc: '14种笔刷 / 形状 / 撤销重做', href: 'tools/draw/index.html', category: '图像' },
    { name: '像素画 & 点阵', emoji: '🖌️', desc: '网格画板，导出高清像素图', href: 'tools/pixel-tool/index.html', category: '图像' },
    { name: '颜色处理工具箱', emoji: '🎨', desc: '转换 / WCAG对比度 / 色盲模拟', href: 'tools/color-tool/index.html', category: '图像' },
    { name: 'CSS 生成器', emoji: '🎛️', desc: '可视化调节阴影、渐变', href: 'tools/css-tool/index.html', category: '图像' },
    { name: 'SVG 工具箱', emoji: '🖼️', desc: '格式化 / 压缩 / 转 PNG', href: 'tools/svg-tool/index.html', category: '图像' },
    { name: '字体预览工具', emoji: '🔤', desc: '上传 TTF 预览与元信息', href: 'tools/font-tool/index.html', category: '图像' },
    { name: '页面标尺与网格', emoji: '📏', desc: '辅助网格 / 吸管取色', href: 'tools/ruler-tool/index.html', category: '图像' },

    // 3. 文档与文本
    { name: 'PDF 工具', emoji: '📄', desc: '合并 / 拆分 / 水印 / 转图', href: 'tools/pdf/index.html', category: '文档' },
    { name: '结构化数据工具', emoji: '📦', desc: 'JSON/YAML/XML/TOML 转换与对比', href: 'tools/json-toolbox/index.html', category: '文档' },
    { name: '表格处理工具', emoji: '📊', desc: 'CSV 与 Excel 互转、预览', href: 'tools/table-tool/index.html', category: '文档' },
    { name: '文本处理工具箱', emoji: '📝', desc: '去重 / 排序 / 大小写 / 行号', href: 'tools/text-toolbox/index.html', category: '文档' },
    { name: 'Markdown 编辑器', emoji: '📝', desc: '实时预览 / 公式支持 / 提取目录', href: 'tools/markdown-tool/index.html', category: '文档' },
    { name: '字幕编辑器', emoji: '💬', desc: 'SRT/VTT 解析与时间轴平移', href: 'tools/subtitle-tool/index.html', category: '文档' },
    { name: '模板渲染测试', emoji: '📝', desc: 'Mustache 语法实时渲染', href: 'tools/template-tool/index.html', category: '文档' },

    // 4. 开发与调试
    { name: '加解密与编解码', emoji: '🔐', desc: 'Hash/AES/RSA/JWT/Base全家桶', href: 'tools/crypto-tool/index.html', category: '开发' },
    { name: '正则与选择器', emoji: '🔍', desc: '正则高亮 / CSS/XPath / 提取链接', href: 'tools/regex-tool/index.html', category: '开发' },
    { name: '网络与底层工具', emoji: '🌐', desc: 'CIDR子网 / UA检测 / HTTP状态码', href: 'tools/net-tool/index.html', category: '开发' },
    { name: '压缩与解压', emoji: '📦', desc: 'ZIP 打包解包 / Gzip 文本', href: 'tools/zip-tool/index.html', category: '开发' },
    { name: '开发辅助工具箱', emoji: '🛠️', desc: '.gitignore 生成 / Nginx 高亮', href: 'tools/dev-tool/index.html', category: '开发' },
    { name: '前端测速模拟器', emoji: '⏱️', desc: '网络环境瀑布流加载模拟', href: 'tools/speed-sim-tool/index.html', category: '开发' },
    { name: '浏览器存储查看', emoji: '🗄️', desc: 'LocalStorage/SessionStorage', href: 'tools/storage-tool/index.html', category: '开发' },
    { name: 'Sitemap & Robots', emoji: '🤖', desc: '解析规则与提取链接', href: 'tools/robots-tool/index.html', category: '开发' },
    { name: 'RSS & OPML 工具', emoji: '📡', desc: 'RSS 转 JSON / 订阅源提取', href: 'tools/rss-tool/index.html', category: '开发' },

    // 5. 计算与转换
    { name: '计算器工具箱', emoji: '🧮', desc: '科学 / 统计 / 房贷 / 理财', href: 'tools/calc-toolbox/index.html', category: '计算' },
    { name: '单位与进制转换', emoji: '🛠️', desc: '大数进制 / 长度重量 / 大写金额', href: 'tools/unit-tool/index.html', category: '计算' },
    { name: '生成器工具箱', emoji: '🆔', desc: 'UUID / NanoID / 密码强度', href: 'tools/generator-tool/index.html', category: '计算' },

    // 6. 多媒体与可视化
    { name: '架构图 & 脑图', emoji: '🧠', desc: 'Mermaid 流程图 / 时序图', href: 'tools/mermaid-tool/index.html', category: '多媒体' },
    { name: '图表生成预览', emoji: '📊', desc: 'Chart.js 折线 / 柱状 / 饼图', href: 'tools/chart-tool/index.html', category: '多媒体' },
    { name: 'Lottie 动画预览', emoji: '🎞️', desc: '渲染 Lottie JSON 动画', href: 'tools/lottie-tool/index.html', category: '多媒体' },
    { name: '音频工具', emoji: '🎵', desc: '波形预览 / 音量调节 / 裁剪', href: 'tools/audio-tool/index.html', category: '多媒体' },
    { name: '视频截图工具', emoji: '🎬', desc: '读取信息 / Canvas 截帧', href: 'tools/video-tool/index.html', category: '多媒体' },

    // 7. 安全与查询
    { name: '本地加密记事本', emoji: '🔒', desc: 'AES 加密，密码不泄露', href: 'tools/notepad-tool/index.html', category: '安全' },
    { name: '图标与 Emoji', emoji: '🔣', desc: '一键检索复制符号', href: 'tools/icon-tool/index.html', category: '安全' },
    { name: '端口与编码字典', emoji: '📚', desc: '常用端口 / 国家码 / 区号', href: 'tools/dict-tool/index.html', category: '安全' }
  ];

  // 动态计算当前页面的基础路径，彻底解决 GitHub Pages 相对路径丢失问题
  var basePath = window.location.pathname;
  if (basePath.endsWith('.html')) {
    basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
  } else if (!basePath.endsWith('/')) {
    basePath += '/';
  }
  if (window.location.protocol === 'file:') basePath = '';

  var search = document.getElementById('search');
  var tabsEl = document.getElementById('tabs');
  var gridEl = document.getElementById('grid');
  var emptyEl = document.getElementById('empty');
  var activeCat = 'all';

  // 渲染分类标签
  var cats = ['all'];
  tools.forEach(function (t) {
    if (cats.indexOf(t.category) === -1) cats.push(t.category);
  });
  cats.forEach(function (c) {
    var b = document.createElement('button');
    b.textContent = c === 'all' ? '全部工具' : c;
    b.dataset.cat = c;
    if (c === 'all') b.classList.add('active');
    tabsEl.appendChild(b);
  });

  // 渲染卡片
  tools.forEach(function (t) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = basePath + t.href;
    a.dataset.cat = t.category;
    a.dataset.name = String(t.name).toLowerCase();
    a.innerHTML =
      '<span class="emoji"></span>' +
      '<span class="name"></span>' +
      '<span class="desc"></span>';
    a.querySelector('.emoji').textContent = t.emoji;
    a.querySelector('.name').textContent = t.name;
    a.querySelector('.desc').textContent = t.desc;
    gridEl.appendChild(a);
  });

  var cards = Array.prototype.slice.call(gridEl.children);
  var tabButtons = Array.prototype.slice.call(tabsEl.children);

  function apply() {
    var raw = search.value.trim();
    var q = raw.toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matchCat = activeCat === 'all' || card.dataset.cat === activeCat;
      var matchName = !q || card.dataset.name.indexOf(q) !== -1;
      var show = matchCat && matchName;

      if (show) {
        card.hidden = false;
        card.style.display = 'flex'; 
        visible++;
      } else {
        card.hidden = true;
        card.style.display = 'none';
      }
    });

    if (visible === 0) {
      emptyEl.textContent = q ? '没有找到名称包含「' + raw + '」的工具' : '当前分类下没有工具';
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
    }
  }

  var composing = false;
  search.addEventListener('compositionstart', function () { composing = true; });
  search.addEventListener('compositionend', function () {
    composing = false;
    apply();
  });
  search.addEventListener('input', function () {
    if (!composing) apply();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      apply();
    }
  });

  tabButtons.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabButtons.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      activeCat = tab.dataset.cat;
      apply();
    });
  });

  apply();
})();