/* js/idiomDictApp.js  成语词典应用逻辑 */
(function () {
  'use strict';

  /* =========================================================
   *   词库文件内容需形如：
   *      window.idiom.dictionary = [
   *        { word, pinyin, explanation }, ...
   *      ];
   *   可选字段：example（出处/例句）、tags（标签数组）
   * ========================================================= */

  var DATA_SOURCES = ['../../js/idiomDict.js'];

  var LS_FAV   = 'idiom.fav.v1';
  var LS_HIST  = 'idiom.hist.v1';
  var LS_NOTE  = 'idiom.note.v1';
  var LS_TAG   = 'idiom.tag.v1';
  var LS_CONF  = 'idiom.conf.v1';
  var MAX_HIST = 60;
  var PAGE_SIZE = 20;

  /* ================= DOM ================= */
  function $(id) { return document.getElementById(id); }
  var els = {
    q: $('q'), status: $('status'), modes: $('modes'), alpha: $('alpha'),
    suggest: $('suggest'), entry: $('entry'), placeholder: $('placeholder'),
    resultList: $('resultList'), pager: $('pager'),
    sideBody: $('sideBody'), sideTabs: $('sideTabs'),
    favCount: $('favCount'), histCount: $('histCount'),
    btnClear: $('btnClear'), btnRandom: $('btnRandom'),
    btnChain: $('btnChain'), btnFlash: $('btnFlash'), btnStats: $('btnStats'),
    btnImportFav: $('btnImportFav'), btnExportFav: $('btnExportFav'),
    btnExportNote: $('btnExportNote'), btnPrint: $('btnPrint'), btnClearFav: $('btnClearFav'),
    fileInput: $('fileInput'), toast: $('toast'),
    fLen: $('fLen'), fInitial: $('fInitial'), fInclude: $('fInclude'),
    fExclude: $('fExclude'), fDef: $('fDef'), fFav: $('fFav'), btnResetFilter: $('btnResetFilter'),
    chainPanel: $('chainPanel'), chainTrack: $('chainTrack'), chainInput: $('chainInput'),
    chainSubmit: $('chainSubmit'), chainRestart: $('chainRestart'), chainHint: $('chainHint'),
    chainClose: $('chainClose'), chainMode: $('chainMode'),
    flashPanel: $('flashPanel'), flashCard: $('flashCard'), flashFlip: $('flashFlip'),
    flashNext: $('flashNext'), flashClose: $('flashClose'), flashFavOnly: $('flashFavOnly'),
    statsPanel: $('statsPanel'), statsBody: $('statsBody'), statsClose: $('statsClose')
  };

  /* ================= 状态 ================= */
  var ALL = [];         // 全量条目
  var BY_WORD = [];     // 按 word 排序
  var BY_PINYIN = [];   // 按拼音排序
  var MAP = {};         // word -> entry
  var mode = 'prefix';
  var suggestList = [];
  var suggestIndex = -1;
  var composing = false;
  var sideTab = 'fav';
  var page = 1;
  var lastResults = [];
  var fuse = null;
  var clipboard = null;
  var TAGS = ['四字', '常用', '易错', '书面', '口语', '褒义', '贬义', '待复习'];

  var favs  = readStore(LS_FAV);
  var hists = readStore(LS_HIST);
  var notes = readObj(LS_NOTE);
  var tagMap = readObj(LS_TAG);
  var conf  = readObj(LS_CONF);
  if (conf.fFav) els.fFav.checked = true;

  /* ================= 工具函数 ================= */
  function readStore(key) {
    try {
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function readObj(key) {
    try {
      var o = JSON.parse(localStorage.getItem(key) || '{}');
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) { return {}; }
  }
  function writeStore(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }
  function writeObj(key, o) {
    try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) {}
  }
  function setStatus(text, kind) {
    if (!els.status) return;
    els.status.textContent = text || '';
    els.status.className = 'status' + (kind ? ' ' + kind : '');
  }
  var toastTimer = null;
  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 1800);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function highlight(text, kw) {
    var t = esc(text);
    if (!kw) return t;
    var k = esc(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return t.replace(new RegExp(k, 'g'), '<mark>$&</mark>'); }
    catch (e) { return t; }
  }
  function isFav(w) { return favs.indexOf(w) !== -1; }
  function tagsOf(w) { return tagMap[w] || []; }
  function noteOf(w) { return notes[w] || ''; }

  function copyText(txt) {
    if (clipboard && clipboard.on) {
      clipboard.setText(txt);
      return;
    }
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
  function initialsOf(pinyin) {
    var parts = String(pinyin || '').split(/\s+/), out = '';
    for (var i = 0; i < parts.length; i++) {
      var t = stripTone(parts[i]);
      if (t) out += t.charAt(0);
    }
    return out;
  }
  function isChinese(s) { return /[\u4e00-\u9fa5]/.test(s); }

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
    var entries = [], map = {};
    for (var i = 0; i < dict.length; i++) {
      var item = dict[i];
      if (!item || !item.word) continue;
      var lp = stripTone(item.pinyin || '');
      var entry = {
        w: item.word,
        p: item.pinyin || '',
        e: item.explanation || '',
        x: item.example || '',
        lp: lp,
        li: initialsOf(item.pinyin || ''),
        initial: lp.charAt(0) || '',
        len: String(item.word).length,
        tags: Array.isArray(item.tags) ? item.tags : []
      };
      entries.push(entry);
      map[item.word] = entry;
    }
    return { entries: entries, map: map };
  }

  function buildIndex(entries, done) {
    ALL = entries;
    BY_WORD = entries.slice().sort(function (a, b) {
      return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
    });
    BY_PINYIN = entries.slice().sort(function (a, b) {
      if (a.lp !== b.lp) return a.lp < b.lp ? -1 : 1;
      return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
    });
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
      var j = lowerBound(BY_PINYIN, lq, 'lp');
      while (j < BY_PINYIN.length && res.length < limit) {
        if (BY_PINYIN[j].lp.indexOf(lq) !== 0) break;
        res.push(BY_PINYIN[j]);
        j++;
      }
      if (!res.length && lq.length <= 4) {
        var k = lowerBound(BY_WORD, lq, 'li');
        while (k < BY_WORD.length && res.length < limit) {
          if (BY_WORD[k].li.indexOf(lq) !== 0) break;
          res.push(BY_WORD[k]);
          k++;
        }
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
      for (var j = 0; j < BY_PINYIN.length && res.length < limit; j++) {
        if (BY_PINYIN[j].lp.indexOf(lq) !== -1) res.push(BY_PINYIN[j]);
      }
    }
    return res;
  }

  /* 通配符：? 单字，* 任意串 */
  function wildcard(q, limit) {
    var re = new RegExp('^' + esc(q)
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\?/g, '[\u4e00-\u9fa5]')
      .replace(/\*/g, '[\u4e00-\u9fa5]*') + '$');
    var res = [];
    for (var i = 0; i < BY_WORD.length && res.length < limit; i++) {
      if (re.test(BY_WORD[i].w)) res.push(BY_WORD[i]);
    }
    return res;
  }

  /* 正则模式 */
  function searchRegex(q, limit) {
    var re;
    try { re = new RegExp(q); } catch (e) { return []; }
    var res = [];
    for (var i = 0; i < BY_WORD.length && res.length < limit; i++) {
      re.lastIndex = 0;
      if (re.test(BY_WORD[i].w) || re.test(BY_WORD[i].e)) res.push(BY_WORD[i]);
    }
    return res;
  }

  /* 模糊模式（Fuse.js） */
  function searchFuzzy(q, limit) {
    if (!fuse) {
      if (typeof window.Fuse === 'undefined') return null;
      fuse = new window.Fuse(ALL, {
        keys: [
          { name: 'w', weight: 0.5 },
          { name: 'p', weight: 0.2 },
          { name: 'lp', weight: 0.15 },
          { name: 'e', weight: 0.15 }
        ],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 1,
        ignoreLocation: true
      });
    }
    var out = fuse.search(q, { limit: limit });
    var res = [];
    for (var i = 0; i < out.length; i++) res.push(out[i].item);
    return res;
  }

  /* ================= 筛选 ================= */
  function passFilter(e) {
    var len = parseInt(els.fLen.value, 10) || 0;
    if (len === 1 && e.len !== 4) return false;
    if (len === 2 && e.len === 4) return false;
    var ini = els.fInitial.value;
    if (ini && e.initial !== ini) return false;
    var inc = els.fInclude.value.trim();
    if (inc && e.w.indexOf(inc) === -1) return false;
    var exc = els.fExclude.value.trim();
    if (exc && e.w.indexOf(exc) !== -1) return false;
    var df = els.fDef.value.trim();
    if (df && e.e.indexOf(df) === -1) return false;
    if (els.fFav.checked && !isFav(e.w)) return false;
    return true;
  }

  function doSearch(rawQ, limit) {
    var q = String(rawQ || '').trim();
    var res = [];
    if (!q) {
      res = BY_WORD.slice();
    } else if (/[?*]/.test(q) && isChinese(q.replace(/[?*]/g, ''))) {
      res = wildcard(q, limit);
    } else if (mode === 'exact') {
      var hit = MAP[q];
      if (hit) res = [hit];
    } else if (mode === 'contains') {
      res = searchContains(q, limit);
    } else if (mode === 'fuzzy') {
      var fz = searchFuzzy(q, limit);
      if (fz === null) {
        setStatus('未检测到 Fuse.js，已退回「包含」匹配', 'error');
        res = searchContains(q, limit);
      } else res = fz;
    } else if (mode === 'regex') {
      res = searchRegex(q, limit);
    } else {
      res = searchPrefix(q, limit);
    }
    if (els.fLen.value !== '0' || els.fInclude.value.trim() || els.fExclude.value.trim() ||
        els.fDef.value.trim() || els.fFav.checked || els.fInitial.value) {
      res = res.filter(passFilter);
    }
    return res;
  }

  /* ================= 渲染：详情 ================= */
  function entryHTML(e, kw, showTools) {
    var h = '';
    h += '<div class="entry-head">';
    h += '  <div class="entry-title">';
    h += '    <h2 class="entry-word">' + highlight(e.w, kw) + '</h2>';
    h += '    <div class="entry-pinyin">' + (esc(e.p) || '—') + '</div>';
    h += '  </div>';
    if (showTools !== false) {
      h += '  <div class="entry-tools">';
      h += '    <button class="icon-btn js-fav" type="button" data-word="' + esc(e.w) + '" title="' +
           (isFav(e.w) ? '移出生词本' : '加入生词本') + '">' + (isFav(e.w) ? '⭐' : '☆') + '</button>';
      h += '    <button class="icon-btn js-speak" type="button" data-word="' + esc(e.w) +
           '" data-pinyin="' + esc(e.p) + '" title="朗读">🔊</button>';
      h += '    <button class="icon-btn js-copy" type="button" data-word="' + esc(e.w) + '" title="复制">📋</button>';
      h += '  </div>';
    }
    h += '</div>';
    h += '<div class="entry-defs"><p class="def-para">' + (highlight(e.e, kw) || '暂无释义') + '</p></div>';
    if (e.x) h += '<div class="entry-defs"><p class="def-para">📖 ' + esc(e.x) + '</p></div>';

    var tags = tagsOf(e.w).concat(e.tags || []);
    tags = tags.filter(function (v, i, a) { return a.indexOf(v) === i; });
    h += '<div class="entry-tags">';
    for (var i = 0; i < tags.length; i++) {
      h += '<button type="button" class="tag-chip js-tag" data-tag="' + esc(tags[i]) + '">' + esc(tags[i]) + '</button>';
    }
    h += '<button type="button" class="tag-chip ghost js-addtag" data-word="' + esc(e.w) + '">+ 标签</button>';
    h += '</div>';

    h += '<details class="note-box"><summary>📝 我的笔记</summary>' +
         '<textarea id="noteText" rows="3" placeholder="记录用法、易错点…">' + esc(noteOf(e.w)) + '</textarea>' +
         '<button type="button" class="mini-btn" id="noteSave" data-word="' + esc(e.w) + '">保存笔记</button></details>';

    var rel = related(e, 8);
    if (rel.length) {
      h += '<div class="related"><div class="related-title">相关内容</div><div class="related-list">';
      for (var j = 0; j < rel.length; j++) {
        h += '<button type="button" class="related-chip js-goto" data-word="' + esc(rel[j].w) + '">' +
             esc(rel[j].w) + '</button>';
      }
      h += '</div></div>';
    }
    return h;
  }

  function related(e, limit) {
    var res = [], seen = {};
    seen[e.w] = 1;
    for (var i = 0; i < e.w.length - 1; i++) {
      var sub = e.w.substr(i, 2);
      for (var k = 0; k < BY_WORD.length && res.length < limit; k++) {
        var o = BY_WORD[k];
        if (seen[o.w]) continue;
        if (o.w.indexOf(sub) !== -1 && o.w !== e.w) { seen[o.w] = 1; res.push(o); }
      }
    }
    if (res.length < limit && e.lp) {
      for (var m = 0; m < BY_PINYIN.length && res.length < limit; m++) {
        var p = BY_PINYIN[m];
        if (seen[p.w]) continue;
        if (p.lp === e.lp) { seen[p.w] = 1; res.push(p); }
      }
    }
    return res.slice(0, limit);
  }

  function showEntry(e, kw) {
    els.entry.hidden = false;
    els.entry.innerHTML = entryHTML(e, kw, true);
    els.placeholder.hidden = true;
    hidePanels();
    addHist(e.w);
    renderSide();
  }

  function hidePanels() {
    els.resultList.hidden = true;
    els.pager.hidden = true;
    els.chainPanel.hidden = true;
    els.flashPanel.hidden = true;
    els.statsPanel.hidden = true;
  }

  /* ================= 渲染：结果列表 + 分页 ================= */
  function renderResult(list, kw) {
    lastResults = list;
    page = 1;
    if (!list.length) {
      els.entry.hidden = true;
      els.resultList.hidden = true;
      els.pager.hidden = true;
      els.placeholder.hidden = false;
      setStatus('没有匹配的成语', 'error');
      return;
    }
    els.entry.hidden = true;
    els.placeholder.hidden = true;
    hidePanels();
    renderPage(kw);
    setStatus('共 ' + list.length + ' 条结果' + (list.length >= 2000 ? '（仅显示前 2000 条）' : ''), 'ok');
  }

  function renderPage(kw) {
    var total = Math.ceil(lastResults.length / PAGE_SIZE);
    if (page < 1) page = 1;
    if (page > total) page = total;
    var start = (page - 1) * PAGE_SIZE;
    var slice = lastResults.slice(start, start + PAGE_SIZE);
    var h = '';
    for (var i = 0; i < slice.length; i++) {
      var e = slice[i];
      h += '<div class="res-row">' +
           '  <button type="button" class="res-main js-goto" data-word="' + esc(e.w) + '">' +
           '    <span class="res-word">' + highlight(e.w, kw) + '</span>' +
           '    <span class="res-pinyin">' + esc(e.p) + '</span>' +
           '  </button>' +
           '  <button type="button" class="icon-btn js-fav" data-word="' + esc(e.w) + '" title="收藏">' +
           (isFav(e.w) ? '⭐' : '☆') + '</button>' +
           '</div>';
      h += '<div class="res-def">' + highlight(e.e.length > 90 ? e.e.slice(0, 90) + '…' : e.e, kw) + '</div>';
    }
    els.resultList.innerHTML = h;
    els.resultList.hidden = false;

    if (total > 1) {
      var ph = '';
      ph += '<button class="mini-btn" type="button" data-page="1" ' + (page === 1 ? 'disabled' : '') + '>« 首页</button>';
      ph += '<button class="mini-btn" type="button" data-page="' + (page - 1) + '" ' + (page === 1 ? 'disabled' : '') + '>‹ 上页</button>';
      ph += '<span class="page-info">第 ' + page + ' / ' + total + ' 页</span>';
      ph += '<button class="mini-btn" type="button" data-page="' + (page + 1) + '" ' + (page === total ? 'disabled' : '') + '>下页 ›</button>';
      ph += '<button class="mini-btn" type="button" data-page="' + total + '" ' + (page === total ? 'disabled' : '') + '>末页 »</button>';
      els.pager.innerHTML = ph;
      els.pager.hidden = false;
    } else {
      els.pager.hidden = true;
    }
  }

  /* ================= 历史 / 生词本 ================= */
  function addHist(w) {
    var i = hists.indexOf(w);
    if (i !== -1) hists.splice(i, 1);
    hists.unshift(w);
    if (hists.length > MAX_HIST) hists.length = MAX_HIST;
    writeStore(LS_HIST, hists);
  }
  function toggleFav(w) {
    var i = favs.indexOf(w);
    if (i !== -1) { favs.splice(i, 1); toast('已从生词本移除：' + w); }
    else { favs.unshift(w); toast('已加入生词本：' + w); }
    writeStore(LS_FAV, favs);
    renderSide();
    if (!els.entry.hidden) {
      var b = els.entry.querySelector('.js-fav');
      if (b) { b.textContent = isFav(w) ? '⭐' : '☆'; b.title = isFav(w) ? '移出生词本' : '加入生词本'; }
    }
  }

  function renderSide() {
    if (els.favCount) els.favCount.textContent = favs.length;
    if (els.histCount) els.histCount.textContent = hists.length;
    var h = '';
    if (sideTab === 'fav') {
      if (!favs.length) h = '<div class="side-empty">还没有收藏，点 ☆ 加入生词本</div>';
      else {
        for (var i = 0; i < favs.length; i++) {
          var e = MAP[favs[i]];
          h += sideRow(favs[i], e ? e.p : '', false);
        }
      }
    } else if (sideTab === 'hist') {
      if (!hists.length) h = '<div class="side-empty">还没有查询记录</div>';
      else {
        for (var j = 0; j < hists.length; j++) {
          var e2 = MAP[hists[j]];
          h += sideRow(hists[j], e2 ? e2.p : '', true);
        }
      }
    } else {
      var keys = Object.keys(tagMap);
      if (!keys.length) h = '<div class="side-empty">还没有标签，在详情页点「+ 标签」添加</div>';
      else {
        for (var t = 0; t < TAGS.length; t++) {
          var name = TAGS[t], arr = tagMap[name] || [];
          if (!arr.length) continue;
          h += '<div class="tag-group"><div class="tag-group-title">' + esc(name) + '（' + arr.length + '）</div>';
          for (var m = 0; m < arr.length; m++) {
            if (MAP[arr[m]]) h += sideRow(arr[m], MAP[arr[m]].p, false);
          }
          h += '</div>';
        }
        var rest = keys.filter(function (k) { return TAGS.indexOf(k) === -1; });
        for (var r = 0; r < rest.length; r++) {
          var rn = rest[r];
          if (!tagMap[rn].length) continue;
          h += '<div class="tag-group"><div class="tag-group-title">' + esc(rn) + '（' + tagMap[rn].length + '）</div>';
          for (var n = 0; n < tagMap[rn].length; n++) {
            if (MAP[tagMap[rn][n]]) h += sideRow(tagMap[rn][n], MAP[tagMap[rn][n]].p, false);
          }
          h += '</div>';
        }
      }
    }
    els.sideBody.innerHTML = h;
  }
  function sideRow(w, p, showDel) {
    return '<div class="side-row">' +
      '<button type="button" class="side-word js-goto" data-word="' + esc(w) + '">' +
      esc(w) + (p ? ' <span class="side-py">' + esc(p) + '</span>' : '') + '</button>' +
      (showDel ? '<button type="button" class="side-del js-delhist" data-word="' + esc(w) + '" title="移除">✕</button>' : '') +
      '</div>';
  }

  /* ================= 联想 ================= */
  var sugTimer = null;
  function updateSuggest() {
    var q = els.q.value.trim();
    if (!q || composing) { els.suggest.hidden = true; suggestList = []; return; }
    var list = doSearch(q, 12);
    suggestList = list;
    suggestIndex = -1;
    if (!list.length) { els.suggest.hidden = true; return; }
    var h = '';
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      h += '<button type="button" class="suggest-item" data-i="' + i + '">' +
           '<span class="s-word">' + highlight(e.w, q) + '</span>' +
           '<span class="s-def">' + highlight((e.e || '').slice(0, 40), q) + '</span></button>';
    }
    els.suggest.innerHTML = h;
    els.suggest.hidden = false;
  }
  function moveSuggest(d) {
    if (els.suggest.hidden || !suggestList.length) return;
    suggestIndex += d;
    if (suggestIndex < 0) suggestIndex = suggestList.length - 1;
    if (suggestIndex >= suggestList.length) suggestIndex = 0;
    var items = els.suggest.querySelectorAll('.suggest-item');
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('active', i === suggestIndex);
    if (items[suggestIndex] && items[suggestIndex].scrollIntoView) {
      items[suggestIndex].scrollIntoView({ block: 'nearest' });
    }
  }
  function pickSuggest(i) {
    var e = suggestList[i >= 0 ? i : 0];
    if (!e) return;
    els.q.value = e.w;
    els.suggest.hidden = true;
    showEntry(e, e.w);
  }

  /* ================= 朗读 ================= */
  function speak(w, p) {
    if (!window.speechSynthesis) { toast('当前浏览器不支持朗读'); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(w || ''));
      u.lang = 'zh-CN';
      u.rate = 0.8;
      window.speechSynthesis.speak(u);
    } catch (e) { toast('❌ 朗读失败'); }
  }

  /* ================= 成语接龙 ================= */
  var chain = { seq: [], mode: 'tail', used: {} };
  function chainStart() {
    chain.seq = [];
    chain.used = {};
    chain.mode = els.chainMode.value;
    var pool = BY_WORD.filter(function (e) { return e.len === 4; });
    if (!pool.length) pool = BY_WORD.slice();
    var seed = pool[Math.floor(Math.random() * pool.length)];
    chain.seq.push(seed);
    chain.used[seed.w] = 1;
    renderChain();
    els.chainInput.value = '';
    els.chainInput.focus();
  }
  function renderChain() {
    var h = '';
    for (var i = 0; i < chain.seq.length; i++) {
      h += '<button type="button" class="chain-node js-goto" data-word="' + esc(chain.seq[i].w) + '">' +
           esc(chain.seq[i].w) + '</button>';
    }
    els.chainTrack.innerHTML = h;
    var last = chain.seq[chain.seq.length - 1];
    els.chainInput.placeholder = '输入以「' + (chain.mode === 'tail' ? last.w.charAt(last.w.length - 1) : (last.lp.split(' ').pop() || '')) +
                                 '」开头的成语，回车提交';
  }
  function chainSubmit() {
    var v = els.chainInput.value.trim();
    if (!v) return;
    var e = MAP[v];
    if (!e) { toast('词库里没有「' + v + '」'); return; }
    if (chain.used[v]) { toast('「' + v + '」已经用过了'); return; }
    var last = chain.seq[chain.seq.length - 1];
    var ok = false;
    if (chain.mode === 'tail') {
      ok = v.charAt(0) === last.w.charAt(last.w.length - 1);
    } else {
      var tail = last.lp.split(/\s+/).pop() || '';
      var head = (e.lp.split(/\s+/)[0] || '');
      ok = tail && head && tail === head;
    }
    if (!ok) {
      toast('接不上：上一句尾字/尾音对不上');
      return;
    }
    chain.seq.push(e);
    chain.used[v] = 1;
    els.chainInput.value = '';
    renderChain();
    toast('接上了！共 ' + chain.seq.length + ' 句');
    aiReply();
  }
  function aiReply() {
    var last = chain.seq[chain.seq.length - 1];
    var key = chain.mode === 'tail' ? last.w.charAt(last.w.length - 1) : (last.lp.split(/\s+/).pop() || '');
    if (!key) return;
    var cand = [];
    for (var i = 0; i < BY_WORD.length && cand.length < 30; i++) {
      var e = BY_WORD[i];
      if (chain.used[e.w]) continue;
      var headTxt = e.w.charAt(0);
      var headPy = (e.lp.split(/\s+/)[0] || '');
      if (chain.mode === 'tail' ? headTxt === key : (headPy && headPy === key)) cand.push(e);
    }
    if (!cand.length) { toast('🤖 接不上了，你赢了！'); return; }
    var pick = cand[Math.floor(Math.random() * cand.length)];
    chain.seq.push(pick);
    chain.used[pick.w] = 1;
    renderChain();
    toast('🤖 我接：' + pick.w);
  }
  function chainHint() {
    var last = chain.seq[chain.seq.length - 1];
    var key = chain.mode === 'tail' ? last.w.charAt(last.w.length - 1) : (last.lp.split(/\s+/).pop() || '');
    var out = [];
    for (var i = 0; i < BY_WORD.length && out.length < 6; i++) {
      var e = BY_WORD[i];
      if (chain.used[e.w]) continue;
      var headTxt = e.w.charAt(0);
      var headPy = (e.lp.split(/\s+/)[0] || '');
      if (chain.mode === 'tail' ? headTxt === key : (headPy && headPy === key)) out.push(e.w);
    }
    toast(out.length ? '💡 可以接：' + out.join('、') : '💡 没有可接的了');
  }

  /* ================= 抽认卡 ================= */
  var flash = { cur: null, front: true };
  function flashNextCard() {
    var pool = els.flashFavOnly.checked
      ? BY_WORD.filter(function (e) { return isFav(e.w); })
      : BY_WORD.slice();
    if (!pool.length) {
      els.flashCard.innerHTML = '<div class="flash-empty">生词本是空的，先去收藏几个成语吧</div>';
      flash.cur = null;
      return;
    }
    flash.cur = pool[Math.floor(Math.random() * pool.length)];
    flash.front = true;
    renderFlash();
  }
  function renderFlash() {
    if (!flash.cur) return;
    var e = flash.cur;
    els.flashCard.innerHTML = flash.front
      ? '<div class="flash-word">' + esc(e.w) + '</div><div class="flash-hint">点击或按空格看释义</div>'
      : '<div class="flash-word small">' + esc(e.w) + '</div>' +
        '<div class="flash-pinyin">' + esc(e.p) + '</div>' +
        '<div class="flash-def">' + esc(e.e) + '</div>' +
        (noteOf(e.w) ? '<div class="flash-note">📝 ' + esc(noteOf(e.w)) + '</div>' : '');
  }

  /* ================= 统计 ================= */
  function renderStats() {
    var total = ALL.length;
    var byLen = {}, byInit = {}, sumLen = 0, withEx = 0;
    for (var i = 0; i < ALL.length; i++) {
      var e = ALL[i];
      byLen[e.len] = (byLen[e.len] || 0) + 1;
      byInit[e.initial] = (byInit[e.initial] || 0) + 1;
      sumLen += e.len;
      if (e.x) withEx++;
    }
    var inits = Object.keys(byInit).sort();
    var maxInit = 0;
    for (var k = 0; k < inits.length; k++) maxInit = Math.max(maxInit, byInit[inits[k]]);
    var h = '<div class="stat-grid">';
    h += statCard('词库总量', total + ' 条');
    h += statCard('生词本', favs.length + ' 条');
    h += statCard('查询历史', hists.length + ' 条');
    h += statCard('平均字数', total ? (sumLen / total).toFixed(2) : '0');
    h += statCard('带出处/例句', withEx + ' 条');
    h += statCard('标签数', Object.keys(tagMap).length + ' 个');
    h += '</div>';
    h += '<div class="stat-block"><div class="stat-title">字数分布</div><div class="bars">';
    var lk = Object.keys(byLen).sort();
    for (var j = 0; j < lk.length; j++) {
      h += bar(lk[j] + ' 字', byLen[lk[j]], total);
    }
    h += '</div></div>';
    h += '<div class="stat-block"><div class="stat-title">首字母分布</div><div class="bars">';
    for (var m = 0; m < inits.length; m++) {
      h += bar(inits[m].toUpperCase(), byInit[inits[m]], maxInit);
    }
    h += '</div></div>';
    els.statsBody.innerHTML = h;
  }
  function statCard(t, v) {
    return '<div class="stat-card"><div class="stat-num">' + esc(v) + '</div><div class="stat-label">' + esc(t) + '</div></div>';
  }
  function bar(label, val, max) {
    var pct = max ? Math.round(val / max * 100) : 0;
    return '<div class="bar-row"><span class="bar-label">' + esc(label) + '</span>' +
           '<span class="bar-track"><i style="width:' + pct + '%"></i></span>' +
           '<span class="bar-val">' + val + '</span></div>';
  }

  /* ================= 导入 / 导出 / 打印 ================= */
  function exportFav() {
    if (!favs.length) { toast('生词本是空的'); return; }
    var lines = ['# 我的成语生词本', ''];
    for (var i = 0; i < favs.length; i++) {
      var e = MAP[favs[i]];
      if (!e) continue;
      lines.push('## ' + e.w + '（' + (e.p || '') + '）');
      lines.push(e.e || '');
      if (noteOf(e.w)) lines.push('> 笔记：' + noteOf(e.w));
      var tg = tagsOf(e.w);
      if (tg.length) lines.push('> 标签：' + tg.join('、'));
      lines.push('');
    }
    downloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), '成语生词本.txt');
  }
  function exportNote() {
    var list = els.entry.hidden ? [] : [els.entry];
    if (!favs.length && !list.length) { toast('没有可打印的内容'); return; }
    var rows = favs.map(function (w) { return MAP[w]; }).filter(Boolean);
    var h = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
            '<title>成语复习卡</title><style>' +
            'body{font-family:"PingFang SC","Microsoft YaHei",serif;padding:24px;color:#3d3226}' +
            '.card{display:inline-block;width:45%;vertical-align:top;border:1px dashed #c9b796;border-radius:10px;padding:12px 14px;margin:1% 2% 2% 0}' +
            '.w{font-size:20px;font-weight:700}.p{color:#8a5a2b;font-size:13px;margin:4px 0}.d{font-size:13px;line-height:1.6}' +
            '.n{font-size:12px;color:#666;margin-top:6px}h1{font-size:18px}' +
            '</style></head><body><h1>成语复习卡（' + rows.length + ' 条）</h1>';
    for (var i = 0; i < rows.length; i++) {
      h += '<div class="card"><div class="w">' + esc(rows[i].w) + '</div>' +
           '<div class="p">' + esc(rows[i].p) + '</div>' +
           '<div class="d">' + esc(rows[i].e) + '</div>' +
           (noteOf(rows[i].w) ? '<div class="n">笔记：' + esc(noteOf(rows[i].w)) + '</div>' : '') + '</div>';
    }
    h += '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { toast('❌ 弹窗被拦截，无法生成复习卡'); return; }
    w.document.open();
    w.document.write(h);
    w.document.close();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 300);
  }
  function downloadBlob(blob, filename) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('📤 已导出：' + filename);
    } catch (e) { toast('❌ 导出失败'); }
  }
  function importFav(text) {
    var added = 0;
    try {
      var j = JSON.parse(text);
      if (j && Array.isArray(j.favs)) {
        for (var i = 0; i < j.favs.length; i++) {
          var it = j.favs[i];
          var w = typeof it === 'string' ? it : (it && it.word);
          if (w && MAP[w] && !isFav(w)) { favs.unshift(w); added++; }
        }
        if (j.notes && typeof j.notes === 'object') {
          Object.keys(j.notes).forEach(function (k) { if (!notes[k]) notes[k] = j.notes[k]; });
        }
      }
    } catch (e) {
      var lines = text.split(/\r?\n/);
      for (var k = 0; k < lines.length; k++) {
        var m = lines[k].match(/^##\s*([\u4e00-\u9fa5]{2,6})/);
        if (m && MAP[m[1]] && !isFav(m[1])) { favs.unshift(m[1]); added++; }
        else {
          var w2 = lines[k].trim().slice(0, 4);
          if (MAP[w2] && !isFav(w2)) { favs.unshift(w2); added++; }
        }
      }
    }
    writeStore(LS_FAV, favs);
    writeObj(LS_NOTE, notes);
    renderSide();
    toast(added ? '✅ 导入 ' + added + ' 条成语' : '没有导入新成语（检查词库是否包含）');
  }

  /* ================= 事件绑定 ================= */
  function runSearch(q) {
    if (!q) {
      els.resultList.hidden = true;
      els.pager.hidden = true;
      els.entry.hidden = true;
      els.placeholder.hidden = false;
      setStatus('');
      return;
    }
    var list = doSearch(q, 2000);
    if (mode === 'exact' && list.length === 1) showEntry(list[0], q);
    else renderResult(list, q);
  }

  function bind() {
    if (els.q) {
      els.q.addEventListener('compositionstart', function () { composing = true; });
      els.q.addEventListener('compositionend', function () {
        composing = false;
        updateSuggest();
        els.btnClear.hidden = !els.q.value;
      });
      els.q.addEventListener('input', function () {
        els.btnClear.hidden = !els.q.value;
        clearTimeout(sugTimer);
        sugTimer = setTimeout(updateSuggest, 120);
      });
      els.q.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowDown') { ev.preventDefault(); moveSuggest(1); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveSuggest(-1); }
        else if (ev.key === 'Enter') {
          if (!els.suggest.hidden && suggestIndex >= 0) { ev.preventDefault(); pickSuggest(suggestIndex); return; }
          runSearch(els.q.value.trim());
          els.suggest.hidden = true;
        } else if (ev.key === 'Escape') {
          els.q.value = '';
          els.btnClear.hidden = true;
          els.suggest.hidden = true;
          runSearch('');
        }
      });
      els.q.addEventListener('blur', function () { setTimeout(function () { els.suggest.hidden = true; }, 150); });
    }
    if (els.btnClear) els.btnClear.addEventListener('click', function () {
      els.q.value = ''; els.btnClear.hidden = true; els.suggest.hidden = true; runSearch('');
    });

    if (els.modes) els.modes.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.mode') : null;
      if (!b) return;
      var ms = els.modes.querySelectorAll('.mode');
      for (var i = 0; i < ms.length; i++) ms[i].classList.remove('active');
      b.classList.add('active');
      mode = b.getAttribute('data-mode') || 'prefix';
      if (els.q.value.trim()) runSearch(els.q.value.trim());
    });

    ['fLen', 'fInitial', 'fInclude', 'fExclude', 'fDef'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var evName = (el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evName, function () {
        conf[id] = el.value; writeObj(LS_CONF, conf);
        if (els.q.value.trim()) runSearch(els.q.value.trim());
      });
    });
    if (els.fFav) els.fFav.addEventListener('change', function () {
      conf.fFav = els.fFav.checked; writeObj(LS_CONF, conf);
      if (els.q.value.trim()) runSearch(els.q.value.trim());
    });
    if (els.btnResetFilter) els.btnResetFilter.addEventListener('click', function () {
      els.fLen.value = '0'; els.fInitial.value = ''; els.fInclude.value = '';
      els.fExclude.value = ''; els.fDef.value = ''; els.fFav.checked = false;
      conf = {}; writeObj(LS_CONF, conf);
      if (els.q.value.trim()) runSearch(els.q.value.trim());
      toast('筛选条件已重置');
    });

    if (els.alpha) els.alpha.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.alpha-btn') : null;
      if (!b) return;
      var c = b.getAttribute('data-c') || '';
      els.q.value = c;
      els.btnClear.hidden = false;
      runSearch(c);
    });

    if (els.btnRandom) els.btnRandom.addEventListener('click', function () {
      if (!ALL.length) return;
      var e = ALL[Math.floor(Math.random() * ALL.length)];
      els.q.value = e.w;
      els.btnClear.hidden = false;
      showEntry(e, e.w);
    });

    if (els.sideTabs) els.sideTabs.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.side-tab') : null;
      if (!b) return;
      var ts = els.sideTabs.querySelectorAll('.side-tab');
      for (var i = 0; i < ts.length; i++) ts[i].classList.remove('active');
      b.classList.add('active');
      sideTab = b.getAttribute('data-tab') || 'fav';
      renderSide();
    });

    /* 全委托：详情、列表、侧栏、联想 */
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var el;

      if ((el = t.closest('.js-goto'))) {
        var w = el.getAttribute('data-word');
        var e = MAP[w];
        if (e) {
          els.q.value = w;
          els.btnClear.hidden = false;
          showEntry(e, w);
        }
        return;
      }
      if ((el = t.closest('.js-fav'))) { toggleFav(el.getAttribute('data-word')); return; }
      if ((el = t.closest('.js-delhist'))) {
        var dw = el.getAttribute('data-word');
        hists = hists.filter(function (x) { return x !== dw; });
        writeStore(LS_HIST, hists);
        renderSide();
        return;
      }
      if ((el = t.closest('.js-copy'))) {
        var cw = el.getAttribute('data-word');
        var ce = MAP[cw];
        if (ce) copyText(ce.w + '\n' + (ce.p || '') + '\n' + (ce.e || ''));
        return;
      }
      if ((el = t.closest('.js-speak'))) {
        speak(el.getAttribute('data-word'), el.getAttribute('data-pinyin'));
        return;
      }
      if ((el = t.closest('.js-tag'))) {
        var tn = el.getAttribute('data-tag');
        els.q.value = '';
        var list = BY_WORD.filter(function (x) {
          return tagsOf(x.w).indexOf(tn) !== -1 || (x.tags || []).indexOf(tn) !== -1;
        });
        renderResult(list, '');
        setStatus('标签「' + tn + '」共 ' + list.length + ' 条', 'ok');
        return;
      }
      if ((el = t.closest('.js-addtag'))) {
        var aw = el.getAttribute('data-word');
        var pickTag = window.prompt('为「' + aw + '」添加标签（可自定义）：', TAGS[0]);
        if (pickTag) {
          pickTag = pickTag.trim().slice(0, 8);
          var arr = tagMap[aw] || [];
          if (arr.indexOf(pickTag) === -1) arr.push(pickTag);
          tagMap[aw] = arr;
          writeObj(LS_TAG, tagMap);
          if (TAGS.indexOf(pickTag) === -1) TAGS.push(pickTag);
          toast('已加标签：' + pickTag);
          if (!els.entry.hidden) els.entry.innerHTML = entryHTML(MAP[aw], aw, true);
        }
        return;
      }
      if (t.id === 'noteSave') {
        var nw = t.getAttribute('data-word');
        var ta = $('noteText');
        if (nw && ta) {
          notes[nw] = ta.value.trim();
          writeObj(LS_NOTE, notes);
          toast('✅ 笔记已保存');
        }
        return;
      }
      if ((el = t.closest('.suggest-item'))) {
        pickSuggest(parseInt(el.getAttribute('data-i'), 10) || 0);
        return;
      }
      if ((el = t.closest('#pager .mini-btn'))) {
        var p = parseInt(el.getAttribute('data-page'), 10);
        if (p) { page = p; renderPage(els.q.value.trim()); }
        return;
      }
      if (t.id === 'btnChain') { openPanel('chain'); chainStart(); return; }
      if (t.id === 'chainSubmit') { chainSubmit(); return; }
      if (t.id === 'chainRestart') { chainStart(); return; }
      if (t.id === 'chainHint') { chainHint(); return; }
      if (t.id === 'btnFlash') { openPanel('flash'); flashNextCard(); return; }
      if (t.id === 'flashFlip') { flash.front = !flash.front; renderFlash(); return; }
      if (t.id === 'flashNext') { flashNextCard(); return; }
      if (t.id === 'btnStats') { openPanel('stats'); renderStats(); return; }
      if (t.id === 'statsClose') { els.statsPanel.hidden = true; return; }
    });

    document.addEventListener('keydown', function (ev) {
      var tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLowerCase() : '';
      var typing = tag === 'input' || tag === 'textarea';
      if (!typing && ev.key === '/') { ev.preventDefault(); els.q.focus(); return; }
      if (ev.key === 'Escape') {
        var opened = [els.chainPanel, els.flashPanel, els.statsPanel].filter(function (p) { return !p.hidden; });
        if (opened.length) { opened[0].hidden = true; return; }
        els.suggest.hidden = true;
      }
      if (typing && ev.key === 'Enter') {
        if (ev.target.id === 'chainInput') { chainSubmit(); return; }
      }
      if (!typing) {
        var k = ev.key.toLowerCase();
        if (k === 'r') { els.btnRandom.click(); }
        else if (k === 'f' && !els.entry.hidden) { toggleFav(els.entry.querySelector('.entry-word').textContent); }
        else if (k === ' ' && !els.flashPanel.hidden) { ev.preventDefault(); flash.front = !flash.front; renderFlash(); }
        else if (k === 'n' && !els.flashPanel.hidden) { flashNextCard(); }
      }
    });

    if (els.chainInput) els.chainInput.addEventListener('input', function () {
      var v = els.chainInput.value.trim();
      var tip = els.chainInput.nextElementSibling;
      if (tip && tip.classList.contains('chain-check')) tip.remove();
      if (!v) return;
      var e = MAP[v];
      var msg = e ? (chain.used[v] ? '⚠️ 已用过' : '✅ 词库中有此成语') : '⚠️ 词库里没有';
      var span = document.createElement('span');
      span.className = 'chain-check';
      span.textContent = msg;
      els.chainInput.parentNode.insertBefore(span, tip || null);
    });

    if (els.flashCard) els.flashCard.addEventListener('click', function () {
      flash.front = !flash.front; renderFlash();
    });
    if (els.flashFavOnly) els.flashFavOnly.addEventListener('change', flashNextCard);
    if (els.chainClose) els.chainClose.addEventListener('click', function () { els.chainPanel.hidden = true; });
    if (els.flashClose) els.flashClose.addEventListener('click', function () { els.flashPanel.hidden = true; });

    if (els.btnExportFav) els.btnExportFav.addEventListener('click', exportFav);
    if (els.btnExportNote) els.btnExportNote.addEventListener('click', exportNote);
    if (els.btnPrint) els.btnPrint.addEventListener('click', function () { window.print(); });
    if (els.btnClearFav) els.btnClearFav.addEventListener('click', function () {
      if (!favs.length) { toast('生词本已经是空的'); return; }
      if (!window.confirm('确定清空生词本（' + favs.length + ' 条）？')) return;
      favs = [];
      writeStore(LS_FAV, favs);
      renderSide();
      toast('已清空生词本');
    });
    if (els.btnImportFav) els.btnImportFav.addEventListener('click', function () { els.fileInput.click(); });
    if (els.fileInput) els.fileInput.addEventListener('change', function () {
      var f = els.fileInput.files && els.fileInput.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { importFav(String(r.result || '')); els.fileInput.value = ''; };
      r.readAsText(f, 'utf-8');
    });
  }

  function openPanel(which) {
    els.entry.hidden = true;
    els.placeholder.hidden = true;
    els.resultList.hidden = true;
    els.pager.hidden = true;
    els.chainPanel.hidden = (which !== 'chain');
    els.flashPanel.hidden = (which !== 'flash');
    els.statsPanel.hidden = (which !== 'stats');
  }

  /* ================= 初始化 ================= */
  function fillInitials() {
    if (!els.fInitial) return;
    var set = {};
    for (var i = 0; i < BY_PINYIN.length; i++) set[BY_PINYIN[i].initial] = 1;
    var keys = Object.keys(set).sort();
    var h = '<option value="">全部</option>';
    for (var k = 0; k < keys.length; k++) h += '<option value="' + esc(keys[k]) + '">' + esc(keys[k].toUpperCase()) + '</option>';
    els.fInitial.innerHTML = h;
    if (conf.fInitial) els.fInitial.value = conf.fInitial;
  }

  function renderAlpha() {
    if (!els.alpha) return;
    var set = {};
    for (var i = 0; i < BY_PINYIN.length; i++) set[BY_PINYIN[i].initial] = 1;
    var keys = Object.keys(set).sort();
    var h = '';
    for (var k = 0; k < keys.length; k++) {
      h += '<button type="button" class="alpha-btn" data-c="' + esc(keys[k]) + '">' + esc(keys[k].toUpperCase()) + '</button>';
    }
    els.alpha.innerHTML = h;
  }

  function init() {
    bind();
    try {
      if (window.ClipboardJS && els.entry) clipboard = new window.ClipboardJS('.js-copy', {
        text: function (trig) {
          var w = trig.getAttribute('data-word');
          var e = MAP[w];
          return e ? (e.w + '\n' + (e.p || '') + '\n' + (e.e || '')) : '';
        }
      });
      if (clipboard) {
        clipboard.on('success', function () { toast('✅ 已复制到剪贴板'); });
        clipboard.on('error', function () { toast('❌ 复制失败'); });
      }
    } catch (e) { clipboard = null; }

    if (els.fLen && conf.fLen) els.fLen.value = conf.fLen;
    if (els.fInclude) els.fInclude.value = conf.fInclude || '';
    if (els.fExclude) els.fExclude.value = conf.fExclude || '';
    if (els.fDef) els.fDef.value = conf.fDef || '';

    loadFirst(function (dict) {
      if (!dict || !dict.length) {
        setStatus('词库加载失败：请把 idiomDict.js 放到 js/ 目录下（window.idiom.dictionary = [...]）', 'error');
        return;
      }
      var p = prepare(dict);
      buildIndex(p.entries, function () {
        MAP = p.map;
        renderAlpha();
        fillInitials();
        renderSide();
        setStatus('词库已就绪：共 ' + ALL.length + ' 条成语' +
          (typeof window.Fuse === 'undefined' ? '（未加载 Fuse.js，「模糊」模式将退回包含匹配）' : ''), 'ok');
        els.btnClear.hidden = !els.q.value;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
