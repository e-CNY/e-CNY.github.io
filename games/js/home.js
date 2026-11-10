/* games/js/home.js —— 游戏厅的游戏清单，直接写相对路径（相对 games 文件夹），无需 basePath */
(function () {
  var games = [
    {
      name: '数学闪电战',
      emoji: '🧮',
      desc: '60 秒限时心算挑战 · 加减乘除 · 提升反应与计算速度',
      href: 'sample-game/index.html',
      category: '数学'
    }
    // 未来新游戏在此追加，例如：
    // { name: '识字大冒险', emoji: '📖', desc: '拼音识字 / 闯关复习', href: 'word-game/index.html', category: '语文' },
    // { name: '英文拼写达人', emoji: '🔤', desc: '单词拼写 / 音标发音', href: 'spelling/index.html', category: '英语' },
  ];

  var search = document.getElementById('search');
  var tabsEl = document.getElementById('tabs');
  var gridEl = document.getElementById('grid');
  var emptyEl = document.getElementById('empty');
  var activeCat = 'all';

  var cats = ['all'];
  games.forEach(function (g) {
    if (cats.indexOf(g.category) === -1) cats.push(g.category);
  });

  cats.forEach(function (c) {
    var b = document.createElement('button');
    b.textContent = c === 'all' ? '全部' : c;
    b.dataset.cat = c;
    if (c === 'all') b.classList.add('active');
    tabsEl.appendChild(b);
  });

  games.forEach(function (g) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = g.href;
    a.dataset.cat = g.category;
    a.dataset.search = (String(g.name) + ' ' + String(g.desc)).toLowerCase();
    a.innerHTML =
      '<span class="emoji"></span>' +
      '<span class="name"></span>' +
      '<span class="desc"></span>';
    a.querySelector('.emoji').textContent = g.emoji;
    a.querySelector('.name').textContent = g.name;
    a.querySelector('.desc').textContent = g.desc;
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
      emptyEl.textContent = q ? '没有找到包含「' + raw + '」的游戏' : '当前分类下没有游戏';
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