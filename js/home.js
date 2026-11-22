/* js/home.js —— 工具站首页（教育类游戏厅放第 3 位，归属趣味分类） */
(function () {
  var tools = [
    // === 1. 图像 ===
    { name: '电子签名生成器', emoji: '✒️', desc: '双签名引擎·速度笔锋·压感支持·底图拖放/旋转·导出', href: 'tools/e-signature/index.html', category: '图像' },
    { name: '图片调色与滤镜', emoji: '🌅', desc: '40+项精细调节+44种预设滤镜·高清导出·裁切·直方图', href: 'tools/image-filter/index.html', category: '图像' },
    
    // === 插入到全部的第三位 ===
    { name: '成语词典查看器', emoji: '📔', desc: '离线词库·中文/拼音搜索·接龙·抽卡·生词本与历史记录', href: 'tools/idiomDict/index.html', category: '文档' },

    // === 继续图像分类 ===
    { name: '图片取色与配色', emoji: '🖍️', desc: '智能提取图片主色调，支持放大镜吸管与 UI 配色预览', href: 'tools/color-extractor/index.html', category: '图像' },
    { name: '照片处理与排版', emoji: '📸', desc: '加水印、换底色、排版打印', href: 'tools/watermark/index.html', category: '图像' },
    { name: 'Meme 梗图生成', emoji: '😂', desc: '一键生成梗图，三段式文字、图片滤镜与自定义字体', href: 'tools/meme-generator/index.html', category: '图像' },
    { name: '图片切图与拼接', emoji: '🧩', desc: '支持网格切图、长图拼接、网格拼图', href: 'tools/image-slicer/index.html', category: '图像' },
    { name: '图片处理全家桶', emoji: '🖼️', desc: '格式转换、压缩、EXIF 查看与清理', href: 'tools/image-toolbox/index.html', category: '图像' },
    { name: '图片Base64互转', emoji: '🖇️', desc: '极速将图片转换为Base64代码或将Base64代码还原', href: 'tools/base64-image/index.html', category: '图像' },
    { name: '多功能美术画板', emoji: '🎨', desc: '支持多种笔刷、平滑防抖、底图导入', href: 'tools/draw/index.html', category: '图像' },
    { name: '像素画点阵画板', emoji: '🖌️', desc: '支持图转像素、泛洪填充与高清导出', href: 'tools/pixel-tool/index.html', category: '图像' },
    { name: '高级矢量图白板', emoji: '📐', desc: '拖拽添加图形、插入图片，支持节点控制与高清导出', href: 'tools/vector-board/index.html', category: '图像' },
    { name: 'SVG格式化压缩', emoji: '🔷', desc: '实时预览 SVG 代码、格式化压缩、导出高清 PNG', href: 'tools/svg-tool/index.html', category: '图像' },
    { name: '字体预览与解析', emoji: '🔤', desc: '上传 TTF/OTF 字体，深度解析元信息，可视化调节排版', href: 'tools/font-tool/index.html', category: '图像' },
    { name: '页面标尺与网格', emoji: '📏', desc: '专业设计辅助，支持测距、参考线、屏幕校准全屏直尺', href: 'tools/ruler-tool/index.html', category: '图像' },
    { name: 'Favicon 生成器', emoji: '🏷️', desc: '从图片或文字一键生成全套网站图标', href: 'tools/favicon-generator/index.html', category: '图像' },

    // === 2. 文档 ===
    { name: 'Lorem Ipsum器', emoji: '🗒️', desc: '多语言占位文本 · 实时字数统计', href: 'tools/lorem-ipsum/index.html', category: '文档' },
    { name: 'Markdown 简历', emoji: '📋', desc: '左写右排，随机生成、头像上传与多格式导出', href: 'tools/resume-maker/index.html', category: '文档' },
    { name: '简体繁体转换器', emoji: '🔄', desc: '简体中文与繁体中文互相转换，支持词组精准匹配', href: 'tools/zh-convert/index.html', category: '文档' },
    { name: '英汉词典查看器', emoji: '📖', desc: '离线词库 · 前缀/模糊/精确搜索 · 生词本与历史记录', href: 'tools/dictionary/index.html', category: '文档' },
    { name: '汉字拼音转换器', emoji: '🗣️', desc: '汉字转拼音、首字母提取，内置高频易错词词典', href: 'tools/pinyin/index.html', category: '文档' },
    { name: 'PDF处理转换器', emoji: '📄', desc: '合并、拆分、旋转、加水印、图片与 PDF 互转', href: 'tools/pdf/index.html', category: '文档' },
    { name: '结构化数据工具', emoji: '📦', desc: '支持JSON / YAML / XML / TOML / CSV / SQL的转换', href: 'tools/json-toolbox/index.html', category: '文档' },
    { name: '文本处理工具箱', emoji: '🔠', desc: '涵盖 35+ 种批量文本处理功能', href: 'tools/text-toolbox/index.html', category: '文档' },
    { name: '字幕解析编辑器', emoji: '💬', desc: 'SRT / VTT 解析、时间轴平移、正则替换与格式互转', href: 'tools/subtitle-tool/index.html', category: '文档' },
    { name: '模板渲染测试', emoji: '🧾', desc: '支持 Mustache 语法，兼容 JSON / YAML 数据', href: 'tools/template-tool/index.html', category: '文档' },
    { name: '书法字帖生成器', emoji: '📝', desc: '自定义字体、背景与格子，支持PDF与图片打包导出', href: 'tools/calligraphy/index.html', category: '文档' },

    // === 3. 开发 ===
    { name: '加解密与编解码', emoji: '🔐', desc: '涵盖 Hash / AES / RSA / JWT / 编码转换 / 古典密码', href: 'tools/crypto-tool/index.html', category: '开发' },
    { name: '正则与选择测试', emoji: '🔍', desc: '正则匹配高亮与捕获、CSS/XPath测试、HTML提取', href: 'tools/regex-tool/index.html', category: '开发' },
    { name: '语言代码格式化', emoji: '🪄', desc: 'JS/TS/HTML/CSS/JSON/YAML/Markdown/SQL/Vue', href: 'tools/code-formatter/index.html', category: '开发' },
    { name: '代码沙盒预览器', emoji: '💻', desc: 'HTML / CSS / JS 实时预览，支持自动保存、控制台捕获', href: 'tools/code-sandbox/index.html', category: '开发' },
    { name: '开发辅助工具箱', emoji: '🛠️', desc: 'Cron表达式、Gitignore配置、Nginx格式化提效利器', href: 'tools/dev-tool/index.html', category: '开发' },
    { name: '网络与底层工具', emoji: '🌐', desc: 'CIDR子网划分计算、UA浏览器精准解析、HTTP状态码', href: 'tools/net-tool/index.html', category: '开发' },
    { name: '文件压缩与解压', emoji: '🗜️', desc: 'ZIP 打包解包 / Gzip 文本', href: 'tools/zip-tool/index.html', category: '开发' },
    { name: '前端测速模拟器', emoji: '🚀', desc: '模拟真实网络与HTTP并发限制下资源瀑布流加载耗时', href: 'tools/speed-sim-tool/index.html', category: '开发' },
    { name: '浏览器存储查看', emoji: '🗄️', desc: '查看、管理、导入LocalStorage与SessionStorage', href: 'tools/storage-tool/index.html', category: '开发' },
    { name: 'Robots规则解析', emoji: '🤖', desc: 'robots规则解析/爬取测试、Sitemap XML容错提取', href: 'tools/robots-tool/index.html', category: '开发' },
    { name: 'RSS&OPML工具', emoji: '📡', desc: 'RSS/Atom解析与JSON导出、OPML结构树提取', href: 'tools/rss-tool/index.html', category: '开发' },

    // === 4. 媒体 ===
    { name: '屏幕录制播放器', emoji: '🎥', desc: '无水印、无需安装。支持原生导出MP4/WebM，混音录制', href: 'tools/screen-recorder/index.html', category: '媒体' },
    { name: '视频转动态图片', emoji: '🎬', desc: '精准逐帧截取视频画面，支持调速、滤镜，打包导出', href: 'tools/video-to-gif/index.html', category: '媒体' },
    { name: '白噪音与自然音', emoji: '🎧', desc: '14 种纯代码合成白噪音与自然音效，自由混音', href: 'tools/white-noise/index.html', category: '媒体' },
    { name: '文字云生成工具', emoji: '☁️', desc: '智能词频统计 / 自定义形状 / 多格式高清导出', href: 'tools/wordcloud/index.html', category: '媒体' },
    { name: '实时频谱录音机', emoji: '🎙️', desc: '多设备选择、实时频谱、可视化裁剪、音量增益', href: 'tools/audio-recorder/index.html', category: '媒体' },
    { name: '流程图实时渲染', emoji: '🧠', desc: '支持Mermaid语法，实时渲染流程图、时序图、脑图等', href: 'tools/mermaid-tool/index.html', category: '媒体' },
    { name: '饼状图生成预览', emoji: '📉', desc: '支持折线、柱状、饼图、雷达等8种图表，实时JSON渲染', href: 'tools/chart-tool/index.html', category: '媒体' },
    { name: '乐器调音节拍器', emoji: '🎸', desc: '自相关拾音、多乐器支持、专业级多拍号节拍器', href: 'tools/tuner-metronome/index.html', category: '媒体' },
    { name: '音频编辑处理器', emoji: '🎵', desc: '高精度波形预览、无损倒放、精准选区裁剪、导出', href: 'tools/audio-tool/index.html', category: '媒体' },
    { name: '高级音频合成器', emoji: '🎹', desc: '多八度全键盘，11种乐器音色，混响/延迟，WAV录制', href: 'tools/audio-synth/index.html', category: '媒体' },
    { name: '知识关系网络图', emoji: '🗺️', desc: '知识图谱可视化，自定义数据、节点拖拽与高亮搜索', href: 'tools/network-graph/index.html', category: '媒体' },
    { name: 'Lottie 动画预览', emoji: '🎞️', desc: '播放控制、速度调节、引擎切换与高清帧导出', href: 'tools/lottie-tool/index.html', category: '媒体' },

    // === 5. 办公 ===
    { name: '电子印章生成器', emoji: '📮', desc: '环形文字 / 智能排版 / 真实做旧质感 / 导出透明 PNG', href: 'tools/seal/index.html', category: '办公' },
    { name: '代码截图美化器', emoji: '📸', desc: '将代码转化为极客风精美截图，多语言与个性化定制', href: 'tools/code-screenshot/index.html', category: '办公' },
    { name: 'Markdown编辑', emoji: '📑', desc: '完整GFM语法、公式、图表支持，导出MD/Word/PDF', href: 'tools/markdown-tool/index.html', category: '办公' },
    { name: '表格解析与处理', emoji: '📊', desc: 'Excel/CSV解析，支持编辑、直接粘贴Excel数据与导出', href: 'tools/table-tool/index.html', category: '办公' },
    { name: '办公文档自动化', emoji: '📂', desc: 'Word 转 HTML / Markdown，提取图片', href: 'tools/doc-automation/index.html', category: '办公' },

    // === 6. 生活 ===
    { name: '待办清单优先级', emoji: '✅', desc: '任务管理 · 分类标签 · 优先级 · 拖拽排序 · 多格式导出', href: 'tools/todo/index.html', category: '生活' },
    { name: '习惯打卡热力图', emoji: '🔥', desc: '每日好习惯追踪/连续天数/GitHub风格热力图/本地保存', href: 'tools/habit/index.html', category: '生活' },
    { name: '倒数日与纪念日', emoji: '📅', desc: '记录重要日子·倒数/正数天数·每年重复·生成分享图', href: 'tools/countdown/index.html', category: '生活' },
    { name: '年龄人生计算器', emoji: '🎂', desc: '精确年龄/生肖星座/生日倒计时/虚岁/人生进度/里程碑', href: 'tools/age/index.html', category: '生活' },
    { name: 'GPA绩点计算器', emoji: '🎓', desc: '多制度支持 · 加权计算 · 目标反推 · 智能剔除免修课', href: 'tools/gpa/index.html', category: '生活' },
    { name: '贷款组合计算器', emoji: '🏦', desc: '等额本息本金/组合贷款/提前还款/可视化交互图表', href: 'tools/loan/index.html', category: '生活' },
    { name: '投资复利计算器', emoji: '💰', desc: '初始本金/定期定投/复利增长/通胀调整/IRR/逐年明细', href: 'tools/investment/index.html', category: '生活' },
    { name: '百分占比计算器', emoji: '💯', desc: '12种场景·输入即计算·公式透明·历史记录·结果可复制', href: 'tools/percentage/index.html', category: '生活' },
    { name: '多城市时区转换', emoji: '🌍', desc: '多城市实时时钟/时区转换/会议规划/夏令时自动处理', href: 'tools/world-clock/index.html', category: '生活' },
    { name: '健康指标计算器', emoji: '💪', desc: '27 项综合指标：BMI/代谢/体脂/腰围/心血管/运动消耗', href: 'tools/health/index.html', category: '生活' },
    { name: '单词卡片闪记器', emoji: '📇', desc: '英语7大词库·日文JLPT·韩语TOPIK·SRS间隔重复·拼写', href: 'tools/word-card/index.html', category: '生活' },
    { name: '打字速度统计器', emoji: '🏎️', desc: '中英文·实时WPM曲线·虚拟键盘·历史记录·音效·分享', href: 'tools/typing-test/index.html', category: '生活' },
    { name: '计算器工具合集', emoji: '🧮', desc: '15种常用计算工具合集·数学/金融/日常 · 一键复制结果', href: 'tools/calc-toolbox/index.html', category: '生活' },
    { name: '时间日期工具箱', emoji: '🕒', desc: '时间戳·日期计算·多时区·农历·年龄·计时器·Cron', href: 'tools/time-date-tool/index.html', category: '生活' },
    { name: '单位与进制转换', emoji: '⚖️', desc: '进制/单位/中文数字/罗马数字/字符编码/颜色格式', href: 'tools/unit-tool/index.html', category: '生活' },
    { name: '时间与计时工具', emoji: '⏱️', desc: '久坐提醒 / 秒表 / 倒计时 / 番茄钟 / 统计', href: 'tools/sitting-reminder/index.html', category: '生活' },
    { name: 'Cron表达式解析', emoji: '⏰', desc: '字段拆解·中英描述·未来时间·时区切换·反向匹配·快捷', href: 'tools/cron-tool/index.html', category: '生活' },

    // === 7. 设计 ===
    { name: '颜色处理工具箱', emoji: '🌈', desc: '7种格式互转·WCAG对比度·色盲模拟·配色·色阶·取色', href: 'tools/color-tool/index.html', category: '设计' },
    { name: 'CSS调节生成器', emoji: '🎛️', desc: '10种常用CSS效果·可视化调节·预设库·一键复制', href: 'tools/css-tool/index.html', category: '设计' },
    { name: 'CSS动画生成器', emoji: '💫', desc: '54+经典预设·高级参数·实时预览·一键导出独立HTML', href: 'tools/css-animation/index.html', category: '设计' },

    // === 8. 安全 ===
    { name: '文件哈希校验器', emoji: '🛡️', desc: 'MD5/SHA-1/SHA-256/SHA-384/SHA-512/CRC32', href: 'tools/file-hash/index.html', category: '安全' },
    { name: '本地加密记事本', emoji: '🔒', desc: 'PBKDF2 + AES-256 · 多笔记 · 自动保存 · 加密备份', href: 'tools/notepad-tool/index.html', category: '安全' },
    { name: '图片隐写与处理', emoji: '🕵️', desc: '将文本藏入图片像素深处', href: 'tools/steganography/index.html', category: '安全' },
    { name: '端口与编码字典', emoji: '📚', desc: '120+网络端口·200+ISO国家码·160+国际区号·分类', href: 'tools/dict-tool/index.html', category: '安全' },

    // === 9. 数据 ===
    { name: '数据密码生成器', emoji: '🆔', desc: '7种ID·14种Mock·加密安全随机·Diceware1200+词库', href: 'tools/generator-tool/index.html', category: '数据' },
    { name: '随机数据工具箱', emoji: '🎲', desc: '28种字段·6种输出格式·权重抽奖·骰子·加密安全随机', href: 'tools/mock-tool/index.html', category: '数据' },
    { name: '码生成识别工具', emoji: '📱', desc: '二维码/条形码 生成与识别', href: 'tools/code-tool/index.html', category: '数据' },

    // === 10. 硬件 ===
    { name: '外设与硬件测试', emoji: '⌨️', desc: '键盘/鼠标/屏幕坏点/音视频摄像头全能诊断', href: 'tools/hardware-test/index.html', category: '硬件' },
    { name: '硬件串口调试器', emoji: '🔌', desc: '纯浏览器连接 Arduino/ESP32', href: 'tools/serial-tool/index.html', category: '硬件' },

    // === 11. 趣味 ===
    { name: '幸运抽奖大转盘', emoji: '🎡', desc: '自定义名单 / 随机公平抽取 / 流畅转盘动画', href: 'tools/wheel/index.html', category: '趣味' },
    { name: '全功能数学绘图', emoji: '📈', desc: '输入表达式渲染 2D 曲线', href: 'tools/math-plot/index.html', category: '趣味' },
    { name: '图标符号Emoji', emoji: '🔣', desc: '一键检索复制符号', href: 'tools/icon-tool/index.html', category: '趣味' },
    { name: '生辰历法计算器', emoji: '📆', desc: '公历农历转换 / 天干地支查询', href: 'tools/calculate/index.html', category: '趣味' }
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