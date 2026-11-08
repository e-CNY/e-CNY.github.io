(function () {
  // ====== 国内高频工具矩阵（方案 A：全部 2 字分类，按人气顺排） ======
  var tools = [
    // === 1. 图像 (人气最高) ===
    { name: '高清电子签名生成器', emoji: '✒️', desc: '丝滑手写 / 自动裁切留白 / 导出透明PNG', href: 'tools/e-signature/index.html', category: '图像' },
    { name: '图片调色与滤镜', emoji: '🌅', desc: '极速调整亮度/对比度/饱和度，支持一键复古滤镜', href: 'tools/image-filter/index.html', category: '图像' },
    { name: '图片取色器与配色', emoji: '🖍️', desc: '提取图片主色调 / 放大镜吸管 / UI 实战预览', href: 'tools/color-extractor/index.html', category: '图像' },
    { name: '图片加水印', emoji: '💧', desc: '自定义字体与九宫格水印', href: 'tools/watermark/index.html', category: '图像' },
    { name: '证件照处理与排版', emoji: '📸', desc: '换底色 / 加水印 / 拼版打印，全能本地处理', href: 'tools/watermark/index.html', category: '图像' },
    { name: 'Meme 梗图生成器', emoji: '😂', desc: '一键生成经典黑边文字梗图，支持自动换行', href: 'tools/meme-generator/index.html', category: '图像' },
    { name: '图片切图与拼接', emoji: '🧩', desc: '九宫格切图 / 长图拼接 / 网格拼图', href: 'tools/image-slicer/index.html', category: '图像' },
    { name: '图片全家桶', emoji: '🖼️', desc: '格式转换 / 压缩 / EXIF / ASCII', href: 'tools/image-toolbox/index.html', category: '图像' },
    { name: '图片 Base64 互转', emoji: '🖇️', desc: '极速将图片转换为 Base64 代码及反向还原', href: 'tools/base64-image/index.html', category: '图像' },
    { name: '在线画板', emoji: '🎨', desc: '14种笔刷 / 形状 / 撤销重做', href: 'tools/draw/index.html', category: '图像' },
    { name: '像素画 & 点阵', emoji: '🖌️', desc: '网格画板，导出高清像素图', href: 'tools/pixel-tool/index.html', category: '图像' },
    { name: '高级矢量白板', emoji: '📐', desc: '拖拽形状与文字，导出高清图', href: 'tools/vector-board/index.html', category: '图像' },
    { name: 'SVG 工具箱', emoji: '🔷', desc: '格式化 / 压缩 / 转 PNG', href: 'tools/svg-tool/index.html', category: '图像' },
    { name: '字体预览工具', emoji: '🔤', desc: '上传 TTF 预览与元信息', href: 'tools/font-tool/index.html', category: '图像' },
    { name: '页面标尺与网格', emoji: '📏', desc: '辅助网格 / 吸管取色', href: 'tools/ruler-tool/index.html', category: '图像' },

    // === 2. 文档 ===
    { name: 'Markdown 简历生成器', emoji: '📋', desc: '一键随机生成 / 导出高清PDF/HTML', href: 'tools/resume-maker/index.html', category: '文档' },
    { name: '简繁体转换', emoji: '🔄', desc: '中文简繁体互相转换 / 词组精准转换', href: 'tools/zh-convert/index.html', category: '文档' },
    { name: '英汉词典', emoji: '📖', desc: '离线词库 / 前缀模糊搜索 / 生词本 / 发音', href: 'tools/dictionary/index.html', category: '文档' },
    { name: '拼音转换器', emoji: '🗣️', desc: '汉字转拼音 / 首字母缩写 / 带声调', href: 'tools/pinyin/index.html', category: '文档' },
    { name: 'PDF 工具', emoji: '📄', desc: '合并 / 拆分 / 水印 / 转图', href: 'tools/pdf/index.html', category: '文档' },
    { name: '结构化数据工具', emoji: '📦', desc: 'JSON/YAML/XML/TOML 转换/查询与 TS 生成', href: 'tools/json-toolbox/index.html', category: '文档' },
    { name: '文本处理工具箱', emoji: '🔠', desc: '去重 / 排序 / 大小写 / 行号', href: 'tools/text-toolbox/index.html', category: '文档' },
    { name: '字幕编辑器', emoji: '💬', desc: 'SRT/VTT 解析与时间轴平移', href: 'tools/subtitle-tool/index.html', category: '文档' },
    { name: '模板渲染测试', emoji: '🧾', desc: 'Mustache 语法实时渲染', href: 'tools/template-tool/index.html', category: '文档' },
    { name: '书法字帖生成器', emoji: '📝', desc: '上传本地字体，导出打印级 PDF 字帖', href: 'tools/calligraphy/index.html', category: '文档' },

    // === 3. 开发 ===
    { name: '加解密与编解码', emoji: '🔐', desc: 'Hash/AES/RSA/JWT/Base全家桶', href: 'tools/crypto-tool/index.html', category: '开发' },
    { name: '正则与选择器', emoji: '🔍', desc: '正则高亮 / CSS/XPath / 提取链接', href: 'tools/regex-tool/index.html', category: '开发' },
    { name: '多语言代码格式化', emoji: '🪄', desc: 'JS/TS/HTML/CSS/JSON/SQL 美化与压缩', href: 'tools/code-formatter/index.html', category: '开发' },
    { name: '在线代码沙盒', emoji: '💻', desc: 'HTML/CSS/JS 实时预览', href: 'tools/code-sandbox/index.html', category: '开发' },
    { name: '开发辅助工具箱', emoji: '🛠️', desc: '.gitignore 生成 / 代码实体类生成', href: 'tools/dev-tool/index.html', category: '开发' },
    { name: '网络与底层工具', emoji: '🌐', desc: 'CIDR子网 / UA检测 / HTTP状态码', href: 'tools/net-tool/index.html', category: '开发' },
    { name: '压缩与解压', emoji: '🗜️', desc: 'ZIP 打包解包 / Gzip 文本', href: 'tools/zip-tool/index.html', category: '开发' },
    { name: '前端测速模拟器', emoji: '🚀', desc: '网络环境瀑布流加载模拟', href: 'tools/speed-sim-tool/index.html', category: '开发' },
    { name: '浏览器存储查看', emoji: '🗄️', desc: 'LocalStorage/SessionStorage', href: 'tools/storage-tool/index.html', category: '开发' },
    { name: 'Sitemap & Robots', emoji: '🤖', desc: '解析规则与提取链接', href: 'tools/robots-tool/index.html', category: '开发' },
    { name: 'RSS & OPML 工具', emoji: '📡', desc: 'RSS 转 JSON / 订阅源提取', href: 'tools/rss-tool/index.html', category: '开发' },

    // === 4. 媒体 ===
    { name: '在线屏幕录制', emoji: '🎥', desc: '录制屏幕/窗口/声音，优先原生MP4导出', href: 'tools/screen-recorder/index.html', category: '媒体' },
    { name: '视频转多格式动图', emoji: '🎬', desc: '视频转 GIF/WebP/序列帧，支持裁剪调速', href: 'tools/video-to-gif/index.html', category: '媒体' },
    { name: '白噪音与专注音效', emoji: '🎧', desc: '纯代码合成雨声/海浪/鸟鸣等 8 种环境音', href: 'tools/white-noise/index.html', category: '媒体' },
    { name: '文字云生成器', emoji: '☁️', desc: '智能词频统计 / 自定义形状 / 导出高清图', href: 'tools/wordcloud/index.html', category: '媒体' },
    { name: '在线录音机与转文字', emoji: '🎙️', desc: '实时录音、波形展示、语音转文字', href: 'tools/audio-recorder/index.html', category: '媒体' },
    { name: '架构图 & 脑图', emoji: '🧠', desc: 'Mermaid 流程图 / 时序图', href: 'tools/mermaid-tool/index.html', category: '媒体' },
    { name: '图表生成预览', emoji: '📉', desc: '折线 / 柱状 / 饼图', href: 'tools/chart-tool/index.html', category: '媒体' },
    { name: '乐器调音器 & 节拍器', emoji: '🎸', desc: '高精度麦克风调音与节拍器', href: 'tools/tuner-metronome/index.html', category: '媒体' },
    { name: '音频工具', emoji: '🎵', desc: '波形预览 / 音量调节 / 裁剪', href: 'tools/audio-tool/index.html', category: '媒体' },
    { name: '高级音频合成器', emoji: '🎹', desc: '11种乐器音色 / 支持录制', href: 'tools/audio-synth/index.html', category: '媒体' },
    { name: '关系网络图', emoji: '🗺️', desc: '知识图谱与关系交互可视化', href: 'tools/network-graph/index.html', category: '媒体' },
    { name: 'Lottie 动画预览', emoji: '🎞️', desc: '渲染 Lottie JSON 动画', href: 'tools/lottie-tool/index.html', category: '媒体' },

    // === 5. 办公 ===
    { name: '代码截图美化器', emoji: '📸', desc: '将代码生成极客风精美截图', href: 'tools/code-screenshot/index.html', category: '办公' },
    { name: 'Markdown 编辑器', emoji: '📑', desc: '实时预览 / 公式支持 / 提取目录', href: 'tools/markdown-tool/index.html', category: '办公' },
    { name: '表格处理工具', emoji: '📊', desc: 'CSV 与 Excel 互转、预览', href: 'tools/table-tool/index.html', category: '办公' },
    { name: '办公文档自动化', emoji: '📂', desc: 'Word 转 HTML 与提取图片', href: 'tools/doc-automation/index.html', category: '办公' },

    // === 6. 生活 ===
    { name: '单词卡片闪记', emoji: '📇', desc: '英日韩词库·学习和测试·一键生成精美卡片图', href: 'tools/word-card/index.html', category: '生活' },
    { name: '打字速度测试', emoji: '🏎️', desc: '中英文打字测速 / 实时统计 WPM / 正确率', href: 'tools/typing-test/index.html', category: '生活' },
    { name: '计算器工具箱', emoji: '🧮', desc: '科学 / 统计 / 房贷 / 理财', href: 'tools/calc-toolbox/index.html', category: '生活' },
    { name: '时间日期工具箱', emoji: '🕒', desc: '时间戳 / 时区 / 日期加减 / 农历', href: 'tools/time-date-tool/index.html', category: '生活' },
    { name: '单位与进制转换', emoji: '⚖️', desc: '大数进制 / 长度重量 / 大写金额', href: 'tools/unit-tool/index.html', category: '生活' },
    { name: '时间与计时工具', emoji: '⏱️', desc: '久坐 / 秒表 / 倒计时 / 番茄钟', href: 'tools/sitting-reminder/index.html', category: '生活' },
    { name: 'Cron 表达式解析', emoji: '⏰', desc: '实时预测未来执行时间', href: 'tools/cron-tool/index.html', category: '生活' },

    // === 7. 设计 ===
    { name: '颜色处理工具箱', emoji: '🌈', desc: '转换 / WCAG对比度 / 色盲模拟', href: 'tools/color-tool/index.html', category: '设计' },
    { name: 'CSS 生成器', emoji: '🎛️', desc: '可视化调节阴影、渐变', href: 'tools/css-tool/index.html', category: '设计' },
    { name: 'CSS 动画生成器', emoji: '💫', desc: '预设动画 / 可视化调参 / 一键复制代码', href: 'tools/css-animation/index.html', category: '设计' },

    // === 8. 安全 ===
    { name: '文件哈希校验', emoji: '🛡️', desc: 'MD5/SHA1/SHA256 大文件分片极速计算', href: 'tools/file-hash/index.html', category: '安全' },
    { name: '本地加密记事本', emoji: '🔒', desc: 'AES 加密，密码不泄露', href: 'tools/notepad-tool/index.html', category: '安全' },
    { name: '图片隐写术', emoji: '🕵️', desc: '将文本藏入图片像素深处', href: 'tools/steganography/index.html', category: '安全' },
    { name: '端口与编码字典', emoji: '📚', desc: '常用端口 / 国家码 / 区号', href: 'tools/dict-tool/index.html', category: '安全' },

    // === 9. 数据 ===
    { name: '生成器工具箱', emoji: '🆔', desc: 'UUID / NanoID / 密码强度', href: 'tools/generator-tool/index.html', category: '数据' },
    { name: '随机数据工具箱', emoji: '🎲', desc: 'Mock 数据 / 抽奖 / 多面骰子', href: 'tools/mock-tool/index.html', category: '数据' },
    { name: '码工具', emoji: '📱', desc: '二维码/条形码 生成与识别', href: 'tools/code-tool/index.html', category: '数据' },

    // === 10. 硬件 ===
    { name: '外设与硬件测试中心', emoji: '⌨️', desc: '键盘/鼠标/屏幕坏点/音视频摄像头全能诊断', href: 'tools/hardware-test/index.html', category: '硬件' },
    { name: '硬件串口调试', emoji: '🔌', desc: '纯浏览器连接 Arduino/ESP32', href: 'tools/serial-tool/index.html', category: '硬件' },

    // === 11. 趣味 ===
    { name: '数学函数绘图', emoji: '📈', desc: '输入表达式渲染 2D 曲线', href: 'tools/math-plot/index.html', category: '趣味' },
    { name: '图标与 Emoji', emoji: '🔣', desc: '一键检索复制符号', href: 'tools/icon-tool/index.html', category: '趣味' },
    { name: '玄学八字排盘', emoji: '🔮', desc: '干支 / 十神 / 五行推演', href: 'tools/bazi/index.html', category: '趣味' },

    // === 占位 ===
    { name: 'Coming Soon', emoji: '🚧', desc: '敬请期待，更多极客工具开发中...', href: '#', category: '趣味' }
  ];

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

  var cats = ['all'];
  tools.forEach(function (t) {
    if (cats.indexOf(t.category) === -1) cats.push(t.category);
  });

  cats.forEach(function (c) {
    var b = document.createElement('button');
    b.textContent = c === 'all' ? '全部' : c;
    b.dataset.cat = c;
    if (c === 'all') b.classList.add('active');
    tabsEl.appendChild(b);
  });

  tools.forEach(function (t) {
    var a = document.createElement('a');
    a.className = 'card';
    if (t.href === '#') {
      a.href = 'javascript:void(0)';
      a.addEventListener('click', function(e) {
        e.preventDefault();
        alert('🚧 该工具正在开发中，敬请期待！');
      });
    } else {
      a.href = basePath + t.href;
    }
    a.dataset.cat = t.category;
    a.dataset.search = (String(t.name) + ' ' + String(t.desc)).toLowerCase();
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
      var matchText = !q || card.dataset.search.indexOf(q) !== -1;
      var show = matchCat && matchText;

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
      emptyEl.textContent = q ? '没有找到包含「' + raw + '」的工具' : '当前分类下没有工具';
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
