/* js/dictionary.js */
(function () {
  'use strict';

  /* =========================================================
   * 词库文件约定（二选一即可）：
   *   1) js/libs/ecdict-cn/ecdict-cn.js  内容形如：
   *        window.ECDICT_CN = { "year":"n. 年, 年度, 年龄\n[经] 年度", ... };
   *   2) 也支持把字典对象直接挂到 window.ECDICT / window.DICT_DATA 等常见全局名
   *   脚本会自动在多个路径 + 多个全局名里探测，无需手动改代码
   * ========================================================= */

  var DATA_SOURCES = [
    '../../js/libs/ecdict-cn/ecdict-cn.js',
    '../../js/libs/ecdict-cn/dict.js',
    '../../js/libs/ecdict-cn/data.js',
    '../../js/libs/ecdict-cn/index.js',
    '../../js/libs/ecdict-cn.js',
    '../../js/ecdict-cn/ecdict-cn.js',
    '../../js/ecdict-cn/dict.js',
    '../../js/ecdict-cn/data.js',
    '../../js/ecdict-cn/index.js',
    '../../js/ecdict-cn.js'
  ];

  var GLOBAL_NAMES = [
    'ECDICT_CN', 'ECDICT', 'ECDICT_DATA', 'DICT_CN', 'DICT_DATA',
    'ecdictCN', 'ecdict', 'dictCN', 'dictData', 'dictionary', 'DICT'
  ];

  var LS_FAV = 'dict.fav.v1';
  var LS_HIST = 'dict.hist.v1';
  var MAX_HIST = 60;

  /* ================= DOM ================= */
  var els = {
    q: document.getElementById('q'),
    status: document.getElementById('status'),
    modes: document.getElementById('modes'),
    alpha: document.getElementById('alpha'),
    suggest: document.getElementById('suggest'),
    entry: document.getElementById('entry'),
    placeholder: document.getElementById('placeholder'),
    sideBody: document.getElementById('sideBody'),
    sideTabs: document.getElementById('sideTabs'),
    favCount: document.getElementById('favCount'),
    histCount: document.getElementById('histCount'),
    btnClear: document.getElementById('btnClear'),
    btnRandom: document.getElementById('btnRandom'),
    btnDaily: document.getElementById('btnDaily'),
    btnExportFav: document.getElementById('btnExportFav'),
    btnClearFav: document.getElementById('btnClearFav'),
    toast: document.getElementById('toast')
  };

  /* ================= 状态 ================= */
  var DICT = null;
  var ENTRIES = [];
  var mode = 'prefix';
  var suggestList = [];
  var suggestIndex = -1;
  var composing = false;
  var sideTab = 'fav';

  var favs = readStore(LS_FAV);
  var hists = readStore(LS_HIST);

  /* ================= 工具函数 ================= */
  function readStore(key) {
    try {
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeStore(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }
  function setStatus(text, kind) {
    els.status.textContent = text || '';
    els.status.className = 'status' + (kind ? ' ' + kind : '');
  }
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1600);
  }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        function () { toast('已复制'); },
        function () { fallbackCopy(txt); }
      );
    } else {
      fallbackCopy(txt);
    }
  }
  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? '已复制' : '复制失败');
  }

  /* ================= 词库加载 ================= */
  function findDictInWindow() {
    for (var i = 0; i < GLOBAL_NAMES.length; i++) {
      var v = window[GLOBAL_NAMES[i]];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (v.__esModule && v.default && typeof v.default === 'object') v = v.default;
        var n = 0;
        for (var k in v) {
          if (Object.prototype.hasOwnProperty.call(v, k)) {
            n++;
            if (n > 20) break;
          }
        }
        if (n > 20) return v;
      }
    }
    return null;
  }

  function loadFirst(done) {
    var i = 0;
    function next() {
      if (i >= DATA_SOURCES.length) { done(null); return; }
      var src = DATA_SOURCES[i++];
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () {
        var d = findDictInWindow();
        if (d) done(d); else next();
      };
      s.onerror = function () { next(); };
      document.head.appendChild(s);
    }
    next();
  }

  /* ================= 索引构建 ================= */
  function buildIndex(dict, onProgress, done) {
    var keys = Object.keys(dict);
    var total = keys.length;
    var arr = new Array(total);
    var i = 0;
    var CHUNK = 4000;

    function step() {
      var end = Math.min(i + CHUNK, total);
      for (; i < end; i++) {
        var k = keys[i];
        arr[i] = { w: k, l: k.toLowerCase() };
      }
      if (onProgress) onProgress(i, total);
      if (i < total) {
        setTimeout(step, 0);
      } else {
        arr.sort(function (a, b) {
          return a.l < b.l ? -1 : (a.l > b.l ? 1 : 0);
        });
        done(arr);
      }
    }
    step();
  }

  /* ================= 查找算法 ================= */
  function lowerBound(arr, s) {
    var lo = 0, hi = arr.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (arr[mid].l < s) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function searchPrefix(q, limit) {
    var res = [];
    var i = lowerBound(ENTRIES, q);
    var len = ENTRIES.length;
    for (; i < len && res.length < limit; i++) {
      if (ENTRIES[i].l.lastIndexOf(q, 0) !== 0) break;
      res.push(ENTRIES[i].w);
    }
    return res;
  }

  function searchContains(q, limit) {
    var res = [];
    var len = ENTRIES.length;
    for (var i = 0; i < len && res.length < limit; i++) {
      if (ENTRIES[i].l.indexOf(q) !== -1) res.push(ENTRIES[i].w);
    }
    return res;
  }

  function findExact(q) {
    var lq = q.toLowerCase();
    var i = lowerBound(ENTRIES, lq);
    if (i < ENTRIES.length && ENTRIES[i].l === lq) return ENTRIES[i].w;
    return null;
  }

  /* ================= 释义解析 ================= */
  function parseDefs(text) {
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var groups = [];
    var cur = null;

    function addItem(pos, domain, str) {
      str = String(str || '').trim();
      if (!str) return;
      if (!(cur && cur.pos === pos && cur.domain === domain)) {
        cur = { pos: pos, domain: domain, items: [] };
        groups.push(cur);
      }
      var parts = str.split(/[,，;；]/);
      for (var i = 0; i < parts.length; i++) {
        var s = parts[i].trim();
        if (s) cur.items.push(s);
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var mPos = line.match(/^([a-zA-Z]{1,8}\.)\s*(.*)$/);
      if (mPos) { addItem(mPos[1].toLowerCase(), '', mPos[2]); continue; }

      var mDom = line.match(/^\[([^\]]{1,10})\]\s*(.*)$/);
      if (mDom) { addItem('', mDom[1], mDom[2]); continue; }

      addItem('', '', line);
    }
    return groups;
  }

  /* ================= 词形还原猜测 ================= */
  function guessBases(word) {
    var w = word.toLowerCase();
    var cands = [];

    if (/ies$/.test(w)) cands.push(w.slice(0, -3) + 'y');
    if (/ied$/.test(w)) cands.push(w.slice(0, -3) + 'y');
    if (/ier$/.test(w)) cands.push(w.slice(0, -3) + 'y');
    if (/iest$/.test(w)) cands.push(w.slice(0, -4) + 'y');
    if (/es$/.test(w)) cands.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) cands.push(w.slice(0, -1));
    if (/ed$/.test(w)) { cands.push(w.slice(0, -2)); cands.push(w.slice(0, -1)); }
    if (/ing$/.test(w)) { cands.push(w.slice(0, -3)); cands.push(w.slice(0, -3) + 'e'); }
    if (/er$/.test(w)) { cands.push(w.slice(0, -2)); cands.push(w.slice(0, -1)); }
    if (/est$/.test(w)) { cands.push(w.slice(0, -3)); cands.push(w.slice(0, -2)); }

    var mDouble = w.match(/^(.*?)([bcdfgklmnprstvz])\2(ed|ing|er|est)$/);
    if (mDouble) cands.push(mDouble[1] + mDouble[2]);

    var out = [];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c.length > 1 && c !== w && out.indexOf(c) === -1) out.push(c);
    }
    return out;
  }

  /* ================= 渲染：联想列表 ================= */
  function highlightWord(word, q) {
    var frag = document.createDocumentFragment();
    if (!q) {
      frag.appendChild(document.createTextNode(word));
      return frag;
    }
    var i = word.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) {
      frag.appendChild(document.createTextNode(word));
      return frag;
    }
    if (i > 0) frag.appendChild(document.createTextNode(word.slice(0, i)));
    var mark = document.createElement('mark');
    mark.textContent = word.slice(i, i + q.length);
    frag.appendChild(mark);
    if (i + q.length < word.length) {
      frag.appendChild(document.createTextNode(word.slice(i + q.length)));
    }
    return frag;
  }

  function renderSuggest(list, q) {
    els.suggest.innerHTML = '';
    if (!list.length) { els.suggest.hidden = true; return; }

    for (var i = 0; i < list.length; i++) {
      (function (word) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggest-item';
        btn.dataset.word = word;

        var wEl = document.createElement('span');
        wEl.className = 's-word';
        wEl.appendChild(highlightWord(word, q));

        var dEl = document.createElement('span');
        dEl.className = 's-def';
        var raw = String(DICT[word] || '').split(/\r?\n/)[0] || '';
        dEl.textContent = raw.length > 64 ? raw.slice(0, 64) + '…' : raw;

        btn.appendChild(wEl);
        btn.appendChild(dEl);

        btn.addEventListener('mousedown', function (e) {
          e.preventDefault();
          lookup(word);
          hideSuggest();
        });
        els.suggest.appendChild(btn);
      })(list[i]);
    }
    els.suggest.hidden = false;
    suggestIndex = -1;
  }

  function hideSuggest() {
    els.suggest.hidden = true;
    els.suggest.innerHTML = '';
    suggestList = [];
    suggestIndex = -1;
  }

  function updateSuggestActive() {
    var items = els.suggest.children;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', i === suggestIndex);
    }
    if (suggestIndex >= 0 && items[suggestIndex]) {
      items[suggestIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function computeSuggest() {
    var q = els.q.value.trim();
    if (!q || !ENTRIES.length) { hideSuggest(); return; }
    var lower = q.toLowerCase();
    var list;

    if (mode === 'exact') {
      var w = findExact(lower);
      list = w ? [w] : [];
    } else if (mode === 'contains') {
      list = searchContains(lower, 40);
    } else {
      list = searchPrefix(lower, 40);
    }
    suggestList = list;
    renderSuggest(list, q);
  }

  /* ================= 渲染：词条详情 ================= */
  function mkIconBtn(icon, title, handler) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.textContent = icon;
    b.addEventListener('click', handler);
    return b;
  }

  function isFav(word) {
    return favs.indexOf(word) !== -1;
  }

  function renderEntry(word, def) {
    els.placeholder.hidden = true;
    els.entry.hidden = false;
    els.entry.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'entry-head';

    var h2 = document.createElement('h2');
    h2.className = 'entry-word';
    h2.textContent = word;
    head.appendChild(h2);

    var tools = document.createElement('div');
    tools.className = 'entry-tools';

    var bStar = mkIconBtn(isFav(word) ? '⭐' : '☆', '收藏 / 取消收藏', function () {
      toggleFav(word);
      bStar.textContent = isFav(word) ? '⭐' : '☆';
    });
    tools.appendChild(bStar);
    tools.appendChild(mkIconBtn('📋', '复制释义', function () {
      copyText(word + '\n' + def);
    }));
    tools.appendChild(mkIconBtn('🔗', '复制链接', function () {
      copyText(location.origin + location.pathname + '#w=' + encodeURIComponent(word));
    }));
    head.appendChild(tools);
    els.entry.appendChild(head);

    var groups = parseDefs(def);
    var defsWrap = document.createElement('div');
    defsWrap.className = 'entry-defs';

    if (!groups.length) {
      var none = document.createElement('p');
      none.className = 'ph-tip';
      none.textContent = '（暂无释义）';
      defsWrap.appendChild(none);
    }

    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      var gEl = document.createElement('div');
      gEl.className = 'def-group';

      if (grp.pos || grp.domain) {
        var label = document.createElement('div');
        label.className = 'def-label';
        if (grp.pos) {
          var p = document.createElement('span');
          p.className = 'pos';
          p.textContent = grp.pos;
          label.appendChild(p);
        }
        if (grp.domain) {
          var dm = document.createElement('span');
          dm.className = 'domain';
          dm.textContent = grp.domain;
          label.appendChild(dm);
        }
        gEl.appendChild(label);
      }

      var ul = document.createElement('ul');
      ul.className = 'def-list';
      for (var k = 0; k < grp.items.length; k++) {
        var li = document.createElement('li');
        li.textContent = grp.items[k];
        ul.appendChild(li);
      }
      gEl.appendChild(ul);
      defsWrap.appendChild(gEl);
    }
    els.entry.appendChild(defsWrap);

    var bases = guessBases(word).filter(function (b) { return DICT[b] !== undefined; });
    if (bases.length) {
      var rel = document.createElement('div');
      rel.className = 'related';
      var t = document.createElement('div');
      t.className = 'related-title';
      t.textContent = '可能是以下词形：';
      rel.appendChild(t);

      var list = document.createElement('div');
      list.className = 'related-list';
      for (var i = 0; i < bases.length; i++) {
        (function (b) {
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'related-chip';
          chip.textContent = b;
          chip.addEventListener('click', function () {
            els.q.value = b;
            lookup(b);
            hideSuggest();
          });
          list.appendChild(chip);
        })(bases[i]);
      }
      rel.appendChild(list);
      els.entry.appendChild(rel);
    }
  }

  function renderEmptyResult(q) {
    els.placeholder.hidden = true;
    els.entry.hidden = false;
    els.entry.innerHTML = '';

    var box = document.createElement('div');
    box.className = 'empty-result';

    var emo = document.createElement('div');
    emo.className = 'ph-emoji';
    emo.textContent = '🕵️';
    box.appendChild(emo);

    var p = document.createElement('p');
    p.textContent = '未找到「' + q + '」';
    box.appendChild(p);

    var near = [];
    if (q.length >= 2) {
      near = searchPrefix(q.toLowerCase().slice(0, Math.max(2, q.length - 1)), 8);
    }
    if (near.length) {
      var tip = document.createElement('p');
      tip.className = 'ph-tip';
      tip.textContent = '你是不是想找：';
      box.appendChild(tip);

      var list = document.createElement('div');
      list.className = 'related-list';
      list.style.justifyContent = 'center';
      for (var i = 0; i < near.length; i++) {
        (function (w) {
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'related-chip';
          chip.textContent = w;
          chip.addEventListener('click', function () {
            els.q.value = w;
            lookup(w);
            hideSuggest();
          });
          list.appendChild(chip);
        })(near[i]);
      }
      box.appendChild(list);
    } else {
      var tip2 = document.createElement('p');
      tip2.className = 'ph-tip';
      tip2.textContent = '试试切换「包含」模式，或检查拼写';
      box.appendChild(tip2);
    }

    els.entry.appendChild(box);
  }

  function showPlaceholder() {
    els.entry.hidden = true;
    els.entry.innerHTML = '';
    els.placeholder.hidden = false;
  }

  /* ================= 主流程 ================= */
  function lookup(word) {
    if (!word || !DICT) return;
    if (DICT[word] === undefined) {
      var alt = findExact(word);
      if (alt) word = alt;
    }
    if (DICT[word] === undefined) {
      renderEmptyResult(word);
      return;
    }
    renderEntry(word, DICT[word]);
    pushHistory(word);
    if (location.hash !== '#w=' + encodeURIComponent(word)) {
      try { history.replaceState(null, '', '#w=' + encodeURIComponent(word)); } catch (e) {}
    }
  }

  function pushHistory(word) {
    hists = hists.filter(function (w) { return w !== word; });
    hists.unshift(word);
    if (hists.length > MAX_HIST) hists.length = MAX_HIST;
    writeStore(LS_HIST, hists);
    renderSide();
  }

  function toggleFav(word) {
    var i = favs.indexOf(word);
    if (i === -1) {
      favs.unshift(word);
      toast('已加入生词本');
    } else {
      favs.splice(i, 1);
      toast('已移出生词本');
    }
    writeStore(LS_FAV, favs);
    renderSide();
  }

  /* ================= 侧栏 ================= */
  function renderSide() {
    els.favCount.textContent = favs.length;
    els.histCount.textContent = hists.length;

    var list = sideTab === 'fav' ? favs : hists;
    els.sideBody.innerHTML = '';

    if (!list.length) {
      var em = document.createElement('p');
      em.className = 'side-empty';
      em.textContent = sideTab === 'fav' ? '还没有收藏单词' : '还没有查询记录';
      els.sideBody.appendChild(em);
      return;
    }

    for (var i = 0; i < list.length; i++) {
      (function (w) {
        var row = document.createElement('div');
        row.className = 'side-row';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'side-word';
        btn.textContent = w;
        btn.title = w;
        btn.addEventListener('click', function () {
          els.q.value = w;
          lookup(w);
          hideSuggest();
        });

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'side-del';
        del.textContent = '✕';
        del.title = '移除';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          if (sideTab === 'fav') {
            favs = favs.filter(function (x) { return x !== w; });
            writeStore(LS_FAV, favs);
          } else {
            hists = hists.filter(function (x) { return x !== w; });
            writeStore(LS_HIST, hists);
          }
          renderSide();
        });

        row.appendChild(btn);
        row.appendChild(del);
        els.sideBody.appendChild(row);
      })(list[i]);
    }
  }

  /* ================= 每日一词 / 随机词 ================= */
  function pickGoodWord(n) {
    var len = ENTRIES.length;
    if (!len) return null;
    for (var t = 0; t < 40; t++) {
      var w = ENTRIES[n % len].w;
      if (/^[a-z]{4,10}$/.test(w)) return w;
      n += 7919;
    }
    return ENTRIES[n % len].w;
  }

  function dailyWord() {
    if (!ENTRIES.length) return;
    var d = new Date();
    var seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    var w = pickGoodWord(seed);
    if (w) { els.q.value = w; lookup(w); hideSuggest(); }
  }

  function randomWord() {
    if (!ENTRIES.length) return;
    var n = Math.floor(Math.random() * ENTRIES.length);
    var w = pickGoodWord(n);
    if (w) { els.q.value = w; lookup(w); hideSuggest(); }
  }

  /* ================= 事件绑定 ================= */
  function debounce(fn, wait) {
    var t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  var debouncedSuggest = debounce(computeSuggest, 120);

  function bindEvents() {
    els.q.addEventListener('compositionstart', function () { composing = true; });
    els.q.addEventListener('compositionend', function () {
      composing = false;
      debouncedSuggest();
      els.btnClear.hidden = !els.q.value;
    });
    els.q.addEventListener('input', function () {
      els.btnClear.hidden = !els.q.value;
      if (!composing) debouncedSuggest();
    });

    els.q.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        if (!els.suggest.hidden && suggestList.length) {
          e.preventDefault();
          suggestIndex = (suggestIndex + 1) % suggestList.length;
          updateSuggestActive();
        }
      } else if (e.key === 'ArrowUp') {
        if (!els.suggest.hidden && suggestList.length) {
          e.preventDefault();
          suggestIndex = (suggestIndex - 1 + suggestList.length) % suggestList.length;
          updateSuggestActive();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var word = null;
        if (suggestIndex >= 0 && suggestList[suggestIndex]) {
          word = suggestList[suggestIndex];
        } else {
          var q = els.q.value.trim();
          if (q) word = findExact(q) || (suggestList[0] || null);
        }
        if (word) {
          lookup(word);
          hideSuggest();
        }
      } else if (e.key === 'Escape') {
        if (!els.suggest.hidden) { hideSuggest(); }
        else if (els.q.value) {
          els.q.value = '';
          els.btnClear.hidden = true;
          showPlaceholder();
        }
      }
    });

    els.q.addEventListener('blur', function () {
      setTimeout(function () {
        if (document.activeElement !== els.q) hideSuggest();
      }, 120);
    });

    els.btnClear.addEventListener('click', function () {
      els.q.value = '';
      els.btnClear.hidden = true;
      els.q.focus();
      hideSuggest();
      showPlaceholder();
    });

    els.modes.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.mode') : null;
      if (!btn) return;
      var btns = els.modes.querySelectorAll('.mode');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
      btn.classList.add('active');
      mode = btn.dataset.mode;
      computeSuggest();
      els.q.focus();
    });

    els.btnRandom.addEventListener('click', randomWord);
    els.btnDaily.addEventListener('click', dailyWord);

    els.sideTabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.side-tab') : null;
      if (!btn) return;
      var btns = els.sideTabs.querySelectorAll('.side-tab');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
      btn.classList.add('active');
      sideTab = btn.dataset.tab;
      renderSide();
    });

    els.btnExportFav.addEventListener('click', function () {
      var list = sideTab === 'fav' ? favs : hists;
      if (!list.length) { toast('列表为空'); return; }
      var lines = [];
      for (var i = 0; i < list.length; i++) {
        var d = String(DICT[list[i]] || '').replace(/\r?\n/g, ' ');
        lines.push(list[i] + '\t' + d);
      }
      var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (sideTab === 'fav' ? '生词本' : '查询历史') + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast('已导出');
    });

    els.btnClearFav.addEventListener('click', function () {
      var isFavTab = sideTab === 'fav';
      var list = isFavTab ? favs : hists;
      if (!list.length) { toast('列表已是空的'); return; }
      if (!window.confirm('确定清空' + (isFavTab ? '生词本' : '查询历史') + '吗？')) return;
      if (isFavTab) { favs = []; writeStore(LS_FAV, favs); }
      else { hists = []; writeStore(LS_HIST, hists); }
      renderSide();
      toast('已清空');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== els.q) {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        els.q.focus();
        els.q.select();
      }
    });

    window.addEventListener('hashchange', function () {
      var m = location.hash.match(/^#w=(.+)$/);
      if (m) {
        try { lookup(decodeURIComponent(m[1])); } catch (err) {}
      }
    });
  }

  /* ================= 字母索引 ================= */
  function buildAlpha() {
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    els.alpha.innerHTML = '';
    letters.forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'alpha-btn';
      b.textContent = ch;
      b.addEventListener('click', function () {
        els.q.value = ch.toLowerCase();
        els.btnClear.hidden = false;
        els.q.focus();
        computeSuggest();
      });
      els.alpha.appendChild(b);
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    buildAlpha();
    bindEvents();
    renderSide();
    setStatus('正在加载词库…', '');

    loadFirst(function (dict) {
      if (!dict) {
        setStatus('⚠️ 未找到词库文件，请检查 js/libs/ecdict-cn/ 目录', 'error');
        els.placeholder.innerHTML =
          '<div class="ph-emoji">📂</div>' +
          '<p>未找到词库数据</p>' +
          '<p class="ph-tip">请确认存在 js/libs/ecdict-cn/ecdict-cn.js，<br>' +
          '内容形如：<code>window.ECDICT_CN = { "year": "n. 年…" };</code></p>';
        return;
      }

      DICT = dict;
      setStatus('正在建立索引…', '');

      buildIndex(dict, function (done, total) {
        var pct = total ? Math.floor(done / total * 100) : 0;
        setStatus('正在建立索引… ' + pct + '%', '');
      }, function (arr) {
        ENTRIES = arr;
        setStatus('✅ 词库就绪 · 共 ' + ENTRIES.length.toLocaleString() + ' 条词条', 'ok');

        var m = location.hash.match(/^#w=(.+)$/);
        if (m) {
          try { lookup(decodeURIComponent(m[1])); return; } catch (e) {}
        }
        dailyWord();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();