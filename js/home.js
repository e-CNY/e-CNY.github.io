(function () {
  // ====== 以后加工具，只改这个数组 ======
  var tools = [
    {
      name: '久坐提醒',
      emoji: '🪑',
      desc: '坐下 / 活动 / 站立循环提醒',
      href: 'tools/sitting-reminder/index.html',
      category: '生活'
    },
    {
      name: '图片加水印',
      emoji: '🖼️',
      desc: '本地处理，自定义字体与九宫格水印',
      href: 'tools/watermark/index.html',
      category: '图像'
    }
  ];

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
    b.textContent = c === 'all' ? '全部' : c;
    b.dataset.cat = c;
    if (c === 'all') b.classList.add('active');
    tabsEl.appendChild(b);
  });

  // 渲染卡片
  tools.forEach(function (t) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = t.href;
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