/* js/idiomDictApp.js  成语词典应用逻辑 */
(function () {
  'use strict';

  /* =========================================================
   *   词库文件内容需形如：
   *      window.idiom.dictionary = [
   *        { word, pinyin, explanation }, ...
   *      ];
   * ========================================================= */

  var DATA_SOURCES = ['../../js/idiomDict.js'];

  var LS_FAV = 'idiom.fav.v1';
  var LS_HIST = 'idiom.hist.v1';
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
    btnImportFav: document.getElementById('btnImportFav'),
    btnExportFav: document.getElementById('btnExportFav'),
    btnClearFav: document.getElementById('btnClearFav'),
    fileInput: document.getElementById('fileInput'),
    toast: document.getElementById('toast')
  };

  /* ================= 状态 ================= */
  var BY_WORD = [];     // 按 word 排序
  var BY_PINYIN = [];   // 按拼音排序
  var MAP = {};         // word -> entry
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
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1800);
  }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        function () { toast('✅ 已复制'); },
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
    toast(ok ? '✅ 已复制' : '❌ 复制失败');
  }

  /* ================= 拼音去声调 ================= */
  var TONE_MAP = {
    'ā':'a','á':'a','ǎ':'a','à':'a',
    'ē':'e','é':'e','ě':'e','è':'e',
    'ī':'i','í':'i','ǐ':'i','ì':'i',
    'ō':'o','ó':'o','ǒ':'o','ò':'o',
    'ū':'u','ú':'u','ǔ':'u','ù':'u',
    'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v',
    'ü':'v','ń':'n','ň':'n','ǹ':'n','ḿ':'m'
  };
  function stripTone(s) {
    s = String(s || '').toLowerCase();
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (TONE_MAP[c]) out += TONE_MAP[c];
      else if (c >= 'a' && c <= 'z') out += c;
    }
    return out;
  }

  /* ================= 词库加载 ================= */
  function loadFirst(done) {
    var i = 0;
    function next() {
      if (i >= DATA_SOURCES.length) { done(null); return; }
      var src = DATA_SOURCES[i++];
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () {
        if (window.idiom && Array.isArray(window.idiom.dictionary)) {
          done(window.idiom.dictionary);
        } else {
          next();
        }
      };
      s.onerror = function () { next(); };
      document.head.appendChild(s);
    }
    next();
  }

  /* ================= 索引构建 ================= */
  function prepare(dict) {
    var entries = [];
    var map = {};
    for (var i = 0; i < dict.length; i++) {
      var item = dict[i];
      if (!item || !item.word) continue;
      var lp = stripTone(item.pinyin || '');
      var entry = {
        w: item.word,
        p: item.pinyin || '',
        e: item.explanation || '',
        lp: lp,
        initial: lp.charAt(0) || ''
      };
      entries.push(entry);
      map[item.word] = entry;
    }
    return { entries: entries, map: map };
  }

  function buildIndex(entries, done) {
    var byWord = entries.slice().sort(function (a, b) {
      return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
    });
    var byPinyin = entries.slice().sort(function (a, b) {
      return a.lp < b.lp ? -1 : (a.lp > b.lp ? 1 : 0);
    });
    BY_WORD = byWord;
    BY_PINYIN = byPinyin;
    done();
  }

  /* ================= 查找算法 ================= */
  function lowerBound(arr, key, field) {
    var lo = 0, hi = arr.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (arr[mid][field] < key) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function isChinese(s) {
    return /[\u4e00-\u9fa5]/.test(s);
  }

  function searchPrefix(q, limit) {
    var res = [];
    if (isChinese(q)) {
      var i = lowerBound(BY_WORD, q, 'w');
      while (i < BY_WORD.length && res.length < limit) {
        if (BY_WORD[i].w.indexOf(q) !== 0) break;
        res.push(BY_WORD[i]);
        i++;
      }
    } else {
      var lq = stripTone(q);
      if (!lq) return res;
      var i2 = lowerBound(BY_PINYIN, lq, 'lp');
      while (i2 < BY_PINYIN.length && res.length < limit) {
        if (BY_PINYIN[i2].lp.indexOf(lq) !== 0) break;
        res.push(BY_PINYIN[i2]);
        i2++;
      }
    }
    return res;
  }

  function searchContains(q, limit) {
    var res = [];
    if (isChinese(q)) {
      for (var i = 0; i < BY_WORD.length && res.length < limit; i++) {
        if (BY_WORD[i].w.indexOf(q) !== -1) res.push(BY_WORD[i]);
      }
    } else {
      var lq = stripTone(q);
      if (!lq) return res;
      for (var j = 0; j < BY_PINYIN.length && res.length < limit; j++) {
        if (BY_PINYIN[j].lp.indexOf(lq) !== -1) res.push(BY_PINYIN[j]);
      }
    }
    return res;
  }

  function findExact(q) {
    if (MAP[q]) return MAP[q];
    var lq = stripTone(q);
    if (!lq) return null;
    var i = lowerBound(BY_PINYIN, lq, 'lp');
    if (i < BY_PINYIN.length && BY_PINYIN[i].lp === lq) return BY_PINYIN[i];
    return null;
  }

  /* ================= 渲染：联想列表 ================= */
  function highlightWord(word, q) {
    var frag = document.createDocumentFragment();
    if (!q || !isChinese(q)) {
      frag.appendChild(document.createTextNode(word));
      return frag;
    }
    var i = word.indexOf(q);
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
      (function (entry) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggest-item';
        btn.dataset.word = entry.w;

        var wEl = document.createElement('span');
        wEl.className = 's-word';
        wEl.appendChild(highlightWord(entry.w, q));

        var dEl = document.createElement('span');
        dEl.className = 's-def';
        dEl.textContent = entry.p || '';

        btn.appendChild(wEl);
        btn.appendChild(dEl);

        btn.addEventListener('mousedown', function (e) {
          e.preventDefault();
          lookup(entry.w);
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
    if (!q || !BY_WORD.length) { hideSuggest(); return; }
    var list;
    if (mode === 'exact') {
      var one = findExact(q);
      list = one ? [one] : [];
    } else if (mode === 'contains') {
      list = searchContains(q, 40);
    } else {
      list = searchPrefix(q, 40);
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

  function renderEntry(entry) {
    els.placeholder.hidden = true;
    els.entry.hidden = false;
    els.entry.innerHTML = '';

    var word = entry.w;
    var pinyin = entry.p;
    var explanation = entry.e;

    var head = document.createElement('div');
    head.className = 'entry-head';

    var titleWrap = document.createElement('div');
    titleWrap.className = 'entry-title';

    var h2 = document.createElement('h2');
    h2.className = 'entry-word';
    h2.textContent = word;
    titleWrap.appendChild(h2);

    if (pinyin) {
      var py = document.createElement('div');
      py.className = 'entry-pinyin';
      py.textContent = pinyin;
      titleWrap.appendChild(py);
    }
    head.appendChild(titleWrap);

    var tools = document.createElement('div');
    tools.className = 'entry-tools';

    var bStar = mkIconBtn(isFav(word) ? '⭐' : '☆', '收藏 / 取消收藏', function () {
      toggleFav(word);
      bStar.textContent = isFav(word) ? '⭐' : '☆';
    });
    tools.appendChild(bStar);

    tools.appendChild(mkIconBtn('🔤', '复制成语', function () {
      copyText(word);
    }));

    tools.appendChild(mkIconBtn('📋', '复制成语 + 拼音 + 释义', function () {
      copyText(word + '\n' + pinyin + '\n' + explanation);
    }));

    tools.appendChild(mkIconBtn('🔗', '复制链接', function () {
      copyText(location.origin + location.pathname + '#w=' + encodeURIComponent(word));
    }));
    head.appendChild(tools);
    els.entry.appendChild(head);

    var defsWrap = document.createElement('div');
    defsWrap.className = 'entry-defs';

    var paras = String(explanation || '').split(/\r?\n/).map(function (s) {
      return s.trim();
    }).filter(Boolean);

    if (!paras.length) paras = ['（暂无释义）'];

    for (var i = 0; i < paras.length; i++) {
      var p = document.createElement('p');
      p.className = 'def-para';
      p.textContent = paras[i];
      defsWrap.appendChild(p);
    }
    els.entry.appendChild(defsWrap);
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
    p.textContent = '本地词库中未找到「' + q + '」';
    box.appendChild(p);

    var near = [];
    if (q.length >= 1) {
      var prefixQ = q.slice(0, Math.max(1, q.length - 1));
      near = searchPrefix(prefixQ, 8).map(function (x) { return x.w; });
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
      tip2.textContent = '尝试切换「包含」模式，或检查输入';
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
    if (!word || !BY_WORD.length) return;
    var entry = MAP[word];
    if (!entry) {
      var alt = findExact(word);
      if (alt) { entry = alt; word = alt.w; }
    }
    if (!entry) {
      renderEmptyResult(word);
      return;
    }
    renderEntry(entry);
    pushHistory(entry.w);
    if (location.hash !== '#w=' + encodeURIComponent(entry.w)) {
      try { history.replaceState(null, '', '#w=' + encodeURIComponent(entry.w)); } catch (e) {}
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
      toast('⭐ 已加入生词本');
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
      em.textContent = sideTab === 'fav' ? '还没有收藏成语' : '还没有查询记录';
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

  /* ================= 随机成语 ================= */
  function pickGoodWord(n) {
    var len = BY_WORD.length;
    if (!len) return null;
    for (var t = 0; t < 40; t++) {
      var w = BY_WORD[n % len].w;
      if (w.length >= 3 && w.length <= 10) return w;
      n += 7919;
    }
    return BY_WORD[n % len].w;
  }

  function randomWord() {
    if (!BY_WORD.length) return;
    var n = Math.floor(Math.random() * BY_WORD.length);
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
          word = suggestList[suggestIndex].w;
        } else {
          var q = els.q.value.trim();
          if (q) {
            var exact = findExact(q);
            word = exact ? exact.w : (suggestList[0] ? suggestList[0].w : null);
          }
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

    els.sideTabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.side-tab') : null;
      if (!btn) return;
      var btns = els.sideTabs.querySelectorAll('.side-tab');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
      btn.classList.add('active');
      sideTab = btn.dataset.tab;
      renderSide();
    });

    /* ---- 导出 ---- */
    els.btnExportFav.addEventListener('click', function () {
      var list = sideTab === 'fav' ? favs : hists;
      if (!list.length) { toast('列表为空'); return; }

      var isMarkdown = confirm('点击【确定】导出为 Markdown 格式，点击【取消】导出为 TXT 格式。');

      var lines = [];
      if (isMarkdown) {
        lines.push('# ' + (sideTab === 'fav' ? '我的成语生词本' : '查询历史'));
        lines.push('> 由工具站导出\n');
        for (var i = 0; i < list.length; i++) {
          var e = MAP[list[i]] || {};
          lines.push('## ' + list[i]);
          if (e.p) lines.push('*拼音：' + e.p + '*');
          lines.push(String(e.e || '').replace(/\r?\n/g, ' '));
          lines.push('');
        }
      } else {
        for (var j = 0; j < list.length; j++) {
          var ej = MAP[list[j]] || {};
          lines.push(list[j] + '\t' + (ej.p || '') + '\t' + String(ej.e || '').replace(/\r?\n/g, ' '));
        }
      }

      var content = lines.join('\n');
      var blob = new Blob([content], { type: isMarkdown ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (sideTab === 'fav' ? '成语生词本' : '查询历史') + (isMarkdown ? '.md' : '.txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast('导出成功');
    });

    /* ---- 清空 ---- */
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

    /* ---- 导入 ---- */
    els.btnImportFav.addEventListener('click', function () {
      els.fileInput.click();
    });

    els.fileInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (evt) {
        var text = evt.target.result;
        var lines = text.split(/\r?\n/);
        var added = 0;
        lines.forEach(function (line) {
          // 兼容 ## word / word\t... / 纯 word 行
          var m = line.match(/^(?:##\s*)?([\u4e00-\u9fa5·]{2,12})/);
          if (m) {
            var word = m[1].trim();
            if (word && MAP[word] && favs.indexOf(word) === -1) {
              favs.push(word);
              added++;
            }
          }
        });
        if (added > 0) {
          writeStore(LS_FAV, favs);
          renderSide();
          toast('成功导入 ' + added + ' 个成语');
        } else {
          toast('未找到有效成语或均已存在');
        }
      };
      reader.readAsText(file);
      this.value = '';
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
        setStatus('⚠️ 未找到词库文件，请检查路径', 'error');
        els.placeholder.innerHTML =
          '<div class="ph-emoji">📂</div>' +
          '<p>未找到离线词库数据</p>' +
          '<p class="ph-tip">请将词库文件放置于：<br><b>js/idiomDict.js</b><br><br>' +
          '内容应形如：<br><code>window.idiom = { dictionary: [ { word, pinyin, explanation }, … ] };</code></p>';
        return;
      }

      setStatus('正在建立索引…', '');

      var prepared = prepare(dict);
      MAP = prepared.map;

      buildIndex(prepared.entries, function () {
        setStatus('✅ 词库就绪 · 共 ' + BY_WORD.length.toLocaleString() + ' 条成语', 'ok');

        var m = location.hash.match(/^#w=(.+)$/);
        if (m) {
          try { lookup(decodeURIComponent(m[1])); return; } catch (e) {}
        }

        randomWord();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();