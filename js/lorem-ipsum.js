(function () {
  // ========== 词库 ==========
  var LEXICON = {
    latin: {
      name: '拉丁',
      classic: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      words: ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
        'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud ' +
        'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute ' +
        'irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat ' +
        'nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa ' +
        'qui officia deserunt mollit anim id est laborum').split(' ')
    },
    zh: {
      name: '中文',
      words: ['我们','你们','他们','这个','那个','什么','怎么','时间','工作','生活',
        '学习','朋友','世界','中国','今天','明天','昨天','喜欢','知道','觉得',
        '问题','事情','方法','地方','东西','看见','听见','开始','结束','发现',
        '认为','希望','感觉','需要','能够','可以','应该','必须','特别','非常',
        '一直','已经','正在','将要','曾经','经常','偶尔','突然','终于','总是',
        '自己','别人','大家','每个','所有','一些','很多','很少','没有','还有',
        '因为','所以','但是','虽然','如果','然后','而且','或者','不过','只有',
        '美丽','漂亮','干净','整齐','安静','热闹','快乐','幸福','悲伤','难过',
        '城市','乡村','山岳','河流','天空','土地','森林','大海','阳光','风雨',
        '读书','写字','吃饭','睡觉','行走','奔跑','跳跃','歌唱','舞蹈','微笑']
    },
    ja: {
      name: '日文',
      words: ['これ','それ','あれ','ここ','そこ','あそこ','わたし','あなた','かれ','かのじょ',
        'とき','いま','きょう','あした','きのう','いちにち','いちねん','あさ','ひる','よる',
        'いえ','まち','やま','かわ','うみ','そら','もり','はな','き','くさ',
        'みず','ひ','つき','ほし','かぜ','あめ','ゆき','くも','にじ','かみなり',
        'たべる','のむ','あるく','はしる','よむ','かく','はなす','きく','みる','おもう',
        'しごと','がくしゅう','せいかつ','ともだち','せかい','にほん','ことば','こころ','ゆめ','かぞく',
        'しあわせ','かなしい','うれしい','たのしい','すき','きらい','おおきい','ちいさい','あかるい','くらい',
        'あか','あお','しろ','くろ','きいろ','みどり','むらさき','ちゃいろ','ぎん','きん']
    },
    ko: {
      name: '韩文',
      words: ['우리','너희','그들','이것','저것','무엇','어떻게','시간','일','생활',
        '공부','친구','세계','한국','오늘','내일','어제','좋아하다','알다','생각하다',
        '문제','방법','장소','물건','보다','듣다','시작','끝','발견','여기다',
        '희망','느끼다','필요','할수있다','가능하다','마땅하다','반드시','특별히','매우','계속',
        '이미','지금','곧','예전','자주','가끔','갑자기','드디어','항상','자기',
        '남','모두','각','모든','약간','많이','적게','없다','있다','왜냐하면',
        '그래서','그러나','비록','만약','그리고','또는','그런데','단지','오직','아름답다',
        '예쁘다','깨끗하다','정돈되다','조용하다','번화하다','즐겁다','행복하다','슬프다','괴롭다','도시',
        '시골','산','강','하늘','땅','숲','바다','햇빛','비바람','독서',
        '쓰기','식사','잠','걷기','달리기','도약','노래','춤','미소','마음']
    }
  };

  // ========== DOM ==========
  var langEl = document.getElementById('lang');
  var modeEl = document.getElementById('mode');
  var countEl = document.getElementById('count');
  var maxCharsEl = document.getElementById('maxChars');
  var startEl = document.getElementById('startClassic');
  var useCustomEl = document.getElementById('useCustom');
  var customWrap = document.getElementById('customWrap');
  var customTextEl = document.getElementById('customText');
  var outputEl = document.getElementById('output');
  var previewEl = document.getElementById('preview');
  var generateBtn = document.getElementById('generate');
  var copyBtn = document.getElementById('copy');
  var copyTextBtn = document.getElementById('copyText');
  var copyHint = document.getElementById('copyHint');
  var stWords = document.getElementById('stWords');
  var stChars = document.getElementById('stChars');
  var stSentences = document.getElementById('stSentences');
  var stParagraphs = document.getElementById('stParagraphs');

  // ========== 工具函数 ==========
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function forEachNode(nodes, fn) {
    Array.prototype.forEach.call(nodes, fn);
  }

  // 词源
  function getWordPool() {
    if (useCustomEl.checked) {
      var t = customTextEl.value.trim();
      if (!t) return LEXICON[langEl.value].words;
      var parts = t.split(/\s+/).filter(Boolean);
      if (parts.length > 1) return parts;
      parts = t.split(/[,，。.、;；:：!！?？\n\r]+/).filter(Boolean);
      if (parts.length > 1) return parts;
      if (t.length >= 2) {
        var grams = [];
        for (var i = 0; i < t.length - 1; i++) grams.push(t.substr(i, 2));
        return grams;
      }
      return [t];
    }
    return LEXICON[langEl.value].words;
  }

  function getSegmenterLocale() {
    var l = langEl.value;
    return l === 'zh' ? 'zh' : l === 'ja' ? 'ja' : l === 'ko' ? 'ko' : 'en';
  }

  function isLatin() { return langEl.value === 'latin'; }

  // 生成句子
  function makeSentence(pool) {
    var n = randInt(5, 12);
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(pick(pool));
    if (isLatin()) {
      var s = arr.join(' ');
      s = s.charAt(0).toUpperCase() + s.slice(1) + '.';
      return s;
    }
    var punct = langEl.value === 'ko' ? '.' : '。';
    return arr.join('') + punct;
  }

  function makeParagraph(pool) {
    var n = randInt(3, 5);
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(makeSentence(pool));
    return isLatin() ? arr.join(' ') : arr.join('');
  }

  function makeWords(pool, n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(pick(pool));
    return isLatin() ? arr.join(' ') : arr.join('');
  }

  function generateUnits(n) {
    var pool = getWordPool();
    var mode = modeEl.value;
    var units = [];

    if (mode === 'paragraphs') {
      for (var i = 0; i < n; i++) units.push(makeParagraph(pool));
    } else if (mode === 'sentences') {
      for (var j = 0; j < n; j++) units.push(makeSentence(pool));
    } else {
      units.push(makeWords(pool, n));
    }

    if (startEl.checked && isLatin() && !useCustomEl.checked && units.length) {
      units[0] = LEXICON.latin.classic + ' ' + units[0];
    }
    return units;
  }

  // 字数限制（纯文本层面截断，HTML 包裹前执行）
  function limitUnits(units, maxChars) {
    if (!maxChars || maxChars <= 0) return units;
    var out = [];
    var total = 0;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var len = u.replace(/\s/g, '').length;
      if (total + len <= maxChars) {
        out.push(u);
        total += len;
      } else {
        var remain = maxChars - total;
        if (remain > 0) {
          var truncated = truncateText(u, remain);
          if (truncated) out.push(truncated);
        }
        break;
      }
    }
    return out;
  }

  function truncateText(text, maxLen) {
    if (maxLen <= 0) return '';
    var sentences = text.match(/[^。.!?！？\n]+[。.!?！？]?/g) || [text];
    var out = '';
    var total = 0;
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      var len = s.replace(/\s/g, '').length;
      if (total + len <= maxLen) {
        out += s;
        total += len;
      } else {
        var remain = maxLen - total;
        if (remain > 0) {
          var count = 0;
          var cut = '';
          for (var k = 0; k < s.length; k++) {
            if (/\s/.test(s[k])) { cut += s[k]; continue; }
            if (count >= remain) break;
            cut += s[k];
            count++;
          }
          out += cut;
        }
        break;
      }
    }
    return out;
  }

  // ========== HTML 包裹 ==========
  var BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'pre', 'ul', 'ol', 'dl'];
  var HEADING_LIKE = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote'];

  function getSelectedInlineTags() {
    var boxes = document.querySelectorAll('.inline-fieldset input[type="checkbox"]');
    var arr = [];
    forEachNode(boxes, function (b) { if (b.checked) arr.push(b.value); });
    return arr;
  }

  function getSelectedBlockTag() {
    var radios = document.querySelectorAll('.block-fieldset input[name="blockTag"]');
    var v = 'none';
    forEachNode(radios, function (r) { if (r.checked) v = r.value; });
    return v;
  }

  // 行内包裹一个文本片段（text 需为已转义文本）
  function wrapInline(text, inlineTags) {
    if (!inlineTags.length) return text;
    var t = pick(inlineTags);
    switch (t) {
      case 'a': return '<a href="#">' + text + '</a>';
      case 'b': return '<b>' + text + '</b>';
      case 'i': return '<i>' + text + '</i>';
      case 'u': return '<u>' + text + '</u>';
      case 'strong': return '<strong>' + text + '</strong>';
      case 'em': return '<em>' + text + '</em>';
      case 'mark': return '<mark>' + text + '</mark>';
      case 'del': return '<del>' + text + '</del>';
      case 'ins': return '<ins>' + text + '</ins>';
      case 'sub': return '<sub>' + text + '</sub>';
      case 'sup': return '<sup>' + text + '</sup>';
      case 'q': return '<q>' + text + '</q>';
      case 'cite': return '<cite>' + text + '</cite>';
      case 'abbr': return '<abbr title="' + text + '">' + text + '</abbr>';
      case 'kbd': return '<kbd>' + text + '</kbd>';
      case 'samp': return '<samp>' + text + '</samp>';
      case 'var': return '<var>' + text + '</var>';
      case 'small': return '<small>' + text + '</small>';
      case 'time': return '<time>' + text + '</time>';
      default: return text;
    }
  }

  // 对一段文本按句子切分，每个句子随机包裹
  function inlineWrapText(text, inlineTags) {
    if (!inlineTags.length) return text;
    var sentences = text.match(/[^。.!?！？\n]+[。.!?！？]?/g) || [text];
    return sentences.map(function (s) { return wrapInline(s, inlineTags); }).join('');
  }

  function wrapBlock(unit, tag) {
    switch (tag) {
      case 'p': return '<p>' + unit + '</p>';
      case 'h1': return '<h1>' + unit + '</h1>';
      case 'h2': return '<h2>' + unit + '</h2>';
      case 'h3': return '<h3>' + unit + '</h3>';
      case 'h4': return '<h4>' + unit + '</h4>';
      case 'h5': return '<h5>' + unit + '</h5>';
      case 'blockquote': return '<blockquote>' + unit + '</blockquote>';
      case 'pre': return '<pre><code>' + unit + '</code></pre>';
      case 'ul': return '<ul><li>' + unit + '</li></ul>';
      case 'ol': return '<ol><li>' + unit + '</li></ol>';
      case 'dl': return '<dl><dt>' + unit + '</dt><dd>' + unit + '</dd></dl>';
      default: return unit;
    }
  }

  function assembleBlock(units, blockTag, inlineTags) {
    if (blockTag === 'none') {
      return units.map(function (u) {
        return inlineWrapText(escapeHtml(u), inlineTags);
      }).join('\n\n');
    }

    if (blockTag === 'pre') {
      var body = units.map(function (u) { return escapeHtml(u); }).join('\n\n');
      return '<pre><code>' + body + '</code></pre>';
    }

    if (blockTag === 'ul' || blockTag === 'ol') {
      var items = units.map(function (u) {
        return '  <li>' + inlineWrapText(escapeHtml(u), inlineTags) + '</li>';
      }).join('\n');
      return '<' + blockTag + '>\n' + items + '\n</' + blockTag + '>';
    }

    if (blockTag === 'dl') {
      var dlItems = units.map(function (u) {
        var plain = escapeHtml(u);
        var short = u.length > 20 ? escapeHtml(u.slice(0, 20) + '…') : plain;
        return '  <dt>' + inlineWrapText(short, inlineTags) + '</dt>\n' +
               '  <dd>' + inlineWrapText(plain, inlineTags) + '</dd>';
      }).join('\n');
      return '<dl>\n' + dlItems + '\n</dl>';
    }

    return units.map(function (u) {
      var inner = escapeHtml(u);
      if (HEADING_LIKE.indexOf(blockTag) !== -1) {
        inner = inlineWrapText(inner, inlineTags);
      }
      return wrapBlock(inner, blockTag);
    }).join('\n');
  }

  function assembleMixed(units, inlineTags) {
    if (!units.length) return '';
    var blocks = [];
    units.forEach(function (u) {
      var tag = pick(BLOCK_TAGS);
      if (tag === 'pre') {
        blocks.push({ type: 'pre', items: [u] });
        return;
      }
      if (tag === 'ul' || tag === 'ol' || tag === 'dl') {
        var last = blocks[blocks.length - 1];
        if (last && last.type === tag) last.items.push(u);
        else blocks.push({ type: tag, items: [u] });
        return;
      }
      blocks.push({ type: tag, items: [u] });
    });

    return blocks.map(function (b) {
      if (b.type === 'pre') {
        return '<pre><code>' + escapeHtml(b.items[0]) + '</code></pre>';
      }
      if (b.type === 'ul' || b.type === 'ol') {
        var items = b.items.map(function (u) {
          return '  <li>' + inlineWrapText(escapeHtml(u), inlineTags) + '</li>';
        }).join('\n');
        return '<' + b.type + '>\n' + items + '\n</' + b.type + '>';
      }
      if (b.type === 'dl') {
        var dlItems = b.items.map(function (u) {
          var plain = escapeHtml(u);
          var short = u.length > 20 ? escapeHtml(u.slice(0, 20) + '…') : plain;
          return '  <dt>' + inlineWrapText(short, inlineTags) + '</dt>\n' +
                 '  <dd>' + inlineWrapText(plain, inlineTags) + '</dd>';
        }).join('\n');
        return '<dl>\n' + dlItems + '\n</dl>';
      }
      var u = b.items[0];
      var inner = escapeHtml(u);
      if (HEADING_LIKE.indexOf(b.type) !== -1) {
        inner = inlineWrapText(inner, inlineTags);
      }
      return wrapBlock(inner, b.type);
    }).join('\n');
  }

  // ========== 主流程 ==========
  function generate() {
    var n = Math.max(1, Math.min(200, parseInt(countEl.value, 10) || 3));
    var maxChars = Math.max(0, parseInt(maxCharsEl.value, 10) || 0);
    var units = generateUnits(n);
    units = limitUnits(units, maxChars).filter(function (u) { return u && u.trim(); });

    var blockTag = getSelectedBlockTag();
    var inlineTags = getSelectedInlineTags();

    var html = blockTag === 'mixed'
      ? assembleMixed(units, inlineTags)
      : assembleBlock(units, blockTag, inlineTags);

    outputEl.value = html;
    updatePreview(html);
    updateStats(units);
  }

  function updatePreview(html) {
    previewEl.innerHTML = html || '';
    forEachNode(previewEl.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
      });
    });
  }

  function updateStats(units) {
    var plain = units.join('\n\n');
    var sentences = plain.split(/[。.!?！？]+/).filter(function (s) { return s.trim(); }).length;
    var paragraphs = units.filter(function (u) { return u.trim(); }).length;
    var chars = plain.replace(/\s/g, '').length;
    var words = countWords(plain);

    stWords.textContent = words;
    stChars.textContent = chars;
    stSentences.textContent = sentences;
    stParagraphs.textContent = paragraphs;
  }

  function countWords(text) {
    if (!text.trim()) return 0;
    var lang = getSegmenterLocale();
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        var seg = new Intl.Segmenter(lang, { granularity: 'word' });
        var count = 0;
        var iter = seg.segment(text);
        for (var piece of iter) {
          if (piece.isWordLike) count++;
        }
        return count;
      } catch (e) { /* fallback */ }
    }
    if (lang === 'en') return text.trim().split(/\s+/).length;
    return text.replace(/\s/g, '').length;
  }

  // ========== 事件 ==========
  generateBtn.addEventListener('click', generate);

  copyBtn.addEventListener('click', function () {
    if (!outputEl.value) return;
    copyToClipboard(outputEl.value);
  });

  copyTextBtn.addEventListener('click', function () {
    var tmp = document.createElement('div');
    tmp.innerHTML = outputEl.value;
    var text = tmp.textContent || '';
    if (!text.trim()) return;
    copyToClipboard(text);
  });

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showHint(); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showHint(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function showHint() {
    copyHint.hidden = false;
    setTimeout(function () { copyHint.hidden = true; }, 1600);
  }

  useCustomEl.addEventListener('change', function () {
    customWrap.hidden = !useCustomEl.checked;
  });

  // 首次自动生成
  generate();
})();