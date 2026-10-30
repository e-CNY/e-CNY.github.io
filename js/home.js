(function () {
  var tools = [
    { name: '时间与计时工具', emoji: '⏱️', desc: '久坐提醒 / 秒表 / 番茄钟 / 倒计时', href: 'tools/sitting-reminder/index.html', category: '生活' },
    { name: '图片全家桶', emoji: '🖼️', desc: '格式转换 / 压缩 / EXIF信息 / ASCII画', href: 'tools/image-toolbox/index.html', category: '图像' },
    { name: '码工具', emoji: '📱', desc: '二维码生成/识别 / 条形码生成', href: 'tools/code-tool/index.html', category: '图像' },
    { name: '图片加水印', emoji: '💧', desc: '本地处理，自定义字体与九宫格水印', href: 'tools/watermark/index.html', category: '图像' },
    { name: '在线画板', emoji: '🎨', desc: '支持多种笔刷、形状、撤销重做与保存', href: 'tools/draw/index.html', category: '图像' },
    { name: 'PDF 工具', emoji: '📄', desc: '合并、拆分、水印、页码等全能处理', href: 'tools/pdf/index.html', category: '文档' },
    { name: '结构化数据工具', emoji: '📦', desc: 'JSON/YAML/XML/TOML 转换、校验、查询、对比', href: 'tools/json-toolbox/index.html', category: '文档' },
    { name: '文本处理工具箱', emoji: '📝', desc: '去重/排序/大小写/前后缀/行号等批量处理', href: 'tools/text-toolbox/index.html', category: '文本' },
    { name: 'Mock 与随机工具', emoji: '🎲', desc: '随机数据/生成器/抽奖轮盘/多面骰子', href: 'tools/mock-tool/index.html', category: '开发' },
    { name: '计算器工具箱', emoji: '🧮', desc: '科学计算/统计/房贷/分页/矩阵', href: 'tools/calc-toolbox/index.html', category: '计算' },
    { name: '哈希与加解密', emoji: '🔐', desc: 'MD5/SHA/AES/HMAC/JWT解析', href: 'tools/crypto-tool/index.html', category: '安全' }
  ];

  var basePath = window.location.pathname;
  if (basePath.endsWith('.html')) basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
  else if (!basePath.endsWith('/')) basePath += '/';
  if (window.location.protocol === 'file:') basePath = '';

  var search = document.getElementById('search');
  var tabsEl = document.getElementById('tabs');
  var gridEl = document.getElementById('grid');
  var emptyEl = document.getElementById('empty');
  var activeCat = 'all';

  var cats = ['all'];
  tools.forEach(function (t) { if (cats.indexOf(t.category) === -1) cats.push(t.category); });
  cats.forEach(function (c) {
    var b = document.createElement('button');
    b.textContent = c === 'all' ? '全部' : c;
    b.dataset.cat = c; if (c === 'all') b.classList.add('active');
    tabsEl.appendChild(b);
  });

  tools.forEach(function (t) {
    var a = document.createElement('a');
    a.className = 'card'; a.href = basePath + t.href;
    a.dataset.cat = t.category; a.dataset.name = String(t.name).toLowerCase();
    a.innerHTML = '<span class="emoji"></span><span class="name"></span><span class="desc"></span>';
    a.querySelector('.emoji').textContent = t.emoji;
    a.querySelector('.name').textContent = t.name;
    a.querySelector('.desc').textContent = t.desc;
    gridEl.appendChild(a);
  });

  var cards = Array.prototype.slice.call(gridEl.children);
  var tabButtons = Array.prototype.slice.call(tabsEl.children);

  function apply() {
    var raw = search.value.trim(); var q = raw.toLowerCase(); var visible = 0;
    cards.forEach(function (card) {
      var matchCat = activeCat === 'all' || card.dataset.cat === activeCat;
      var matchName = !q || card.dataset.name.indexOf(q) !== -1;
      var show = matchCat && matchName;
      if (show) { card.hidden = false; card.style.display = 'flex'; visible++; }
      else { card.hidden = true; card.style.display = 'none'; }
    });
    if (visible === 0) {
      emptyEl.textContent = q ? '没有找到名称包含「' + raw + '」的工具' : '当前分类下没有工具';
      emptyEl.hidden = false;
    } else emptyEl.hidden = true;
  }

  var composing = false;
  search.addEventListener('compositionstart', function () { composing = true; });
  search.addEventListener('compositionend', function () { composing = false; apply(); });
  search.addEventListener('input', function () { if (!composing) apply(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
    if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; apply(); }
  });
  tabButtons.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabButtons.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active'); activeCat = tab.dataset.cat; apply();
    });
  });
  apply();
})();