(function () {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ================== 词库 ==================
  var LEXICON = {
    latin: {
      classic: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      words: ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
        'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud ' +
        'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute ' +
        'irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat ' +
        'nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa ' +
        'qui officia deserunt mollit anim id est laborum').split(' ')
    },
    zh: {
      words: ['我们','你们','他们','这个','那个','什么','怎么','时间','工作','生活',
        '学习','朋友','世界','中国','今天','明天','昨天','喜欢','知道','觉得',
        '问题','事情','方法','地方','东西','看见','听见','开始','结束','发现',
        '认为','希望','感觉','需要','能够','可以','应该','必须','特别','非常',
        '一直','已经','正在','将要','曾经','经常','偶尔','突然','终于','总是',
        '自己','别人','大家','每个','所有','一些','很多','很少','没有','还有',
        '因为','所以','但是','虽然','如果','然后','而且','或者','不过','只有']
    },
    ja: {
      words: ['これ','それ','あれ','ここ','そこ','あそこ','わたし','あなた','かれ','かのじょ',
        'とき','いま','きょう','あした','きのう','いちにち','いちねん','あさ','ひる','よる',
        'いえ','まち','やま','かわ','うみ','そら','もり','はな','き','くさ',
        'みず','ひ','つき','ほし','かぜ','あめ','ゆき','くも','にじ','かみなり',
        'たべる','のむ','あるく','はしる','よむ','かく','はなす','きく','みる','おもう']
    },
    ko: {
      words: ['우리','너희','그들','이것','저것','무엇','어떻게','시간','일','생활',
        '공부','친구','세계','한국','오늘','내일','어제','좋아하다','알다','생각하다',
        '문제','방법','장소','물건','보다','듣다','시작','끝','발견','여기다',
        '희망','느끼다','필요','할수있다','가능하다','마땅하다','반드시','특별히','매우','계속',
        '이미','지금','곧','예전','자주','가끔','갑자기','드디어','항상','자기']
    },
    de: {
      words: ['der','die','das','und','in','zu','den','von','nicht','mit',
        'ist','es','sich','auch','auf','für','an','werden','aus','er',
        'hat','dass','sie','nach','wird','bei','einer','um','am','sind',
        'noch','wie','einem','über','einen','so','zum','war','haben','nur',
        'oder','aber','vor','zur','bis','mehr','durch','man','sein','wurde']
    },
    fr: {
      words: ['le','la','les','de','des','du','un','une','et','en',
        'à','au','aux','ce','ces','cet','cette','dans','pour','par',
        'sur','pas','plus','ne','se','qui','que','il','elle','ils',
        'elles','nous','vous','je','tu','on','être','avoir','faire','dire',
        'pouvoir','aller','voir','savoir','vouloir','venir','devoir','prendre','trouver','donner']
    },
    es: {
      words: ['el','la','los','las','un','una','unos','unas','de','del',
        'a','al','en','con','por','para','sin','sobre','entre','hasta',
        'desde','cuando','donde','como','que','quien','cual','cuyo','cuanto','tanto',
        'ser','estar','haber','tener','hacer','poder','decir','ir','ver','dar',
        'saber','querer','llegar','pasar','deber','poner','parecer','quedar','creer','hablar']
    }
  };

  // ================== DOM 元素 ==================
  var langEl = document.getElementById('lang');
  var formatEl = document.getElementById('format');
  var modeEl = document.getElementById('mode');
  var countEl = document.getElementById('count');
  var maxCharsEl = document.getElementById('maxChars');
  var startEl = document.getElementById('startClassic');
  var useCustomEl = document.getElementById('useCustom');
  var customWrap = document.getElementById('customWrap');
  var customTextEl = document.getElementById('customText');
  var blockTagEl = document.getElementById('blockTag');
  var tagsPanel = document.getElementById('tagsPanel');
  var inlineTagsWrap = document.getElementById('inlineTagsWrap');
  var clearInlineBtn = document.getElementById('clearInlineTags');
  
  var generateBtn = document.getElementById('generate');
  var outputEl = document.getElementById('output');
  var previewEl = document.getElementById('preview');
  var previewWrap = document.getElementById('previewWrap');
  var copyBtn = document.getElementById('copy');
  var copyTextBtn = document.getElementById('copyText');
  var downloadBtn = document.getElementById('download');
  
  var viewBtns = document.querySelectorAll('.view-btn');
  
  var stWords = document.getElementById('stWords');
  var stChars = document.getElementById('stChars');
  var stSentences = document.getElementById('stSentences');
  var stParagraphs = document.getElementById('stParagraphs');

  // ================== 状态 ==================
  var currentFormat = 'html';

  // ================== 核心逻辑 ==================
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

  function isLatin() { return langEl.value === 'latin'; }
  function isCJK() { return ['zh', 'ja', 'ko'].includes(langEl.value); }

  function makeSentence(pool) {
    var n = randInt(5, 15);
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(pick(pool));
    
    if (isLatin() || langEl.value === 'de' || langEl.value === 'fr' || langEl.value === 'es') {
      var s = arr.join(' ');
      s = s.charAt(0).toUpperCase() + s.slice(1) + '.';
      return s;
    }
    // CJK 处理
    var punct = langEl.value === 'ko' ? '.' : '。';
    return arr.join(' ') + punct; // 韩文用空格分隔
  }

  function makeParagraph(pool) {
    var n = randInt(3, 6);
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(makeSentence(pool));
    return arr.join(' ');
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
      var w = [];
      for (var k = 0; k < n; k++) w.push(pick(pool));
      units.push(w.join(' '));
    }

    if (startEl.checked && isLatin() && !useCustomEl.checked && units.length) {
      units[0] = LEXICON.latin.classic + ' ' + units[0];
    }
    return units;
  }

  // 截断逻辑
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
    var count = 0, cut = '';
    for (var i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) { cut += text[i]; continue; }
      if (count >= maxLen) break;
      cut += text[i];
      count++;
    }
    return cut + '...';
  }

  // ================== 格式化引擎 ==================
  
  function getSelectedInlineTags() {
    if (currentFormat === 'text') return [];
    var boxes = document.querySelectorAll('.inline-tags-grid input[type="checkbox"]');
    var arr = [];
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) arr.push(boxes[i].value);
    return arr;
  }

  function wrapInline(text, tags) {
    if (!tags.length) return text;
    var t = pick(tags);
    
    if (currentFormat === 'markdown') {
      switch(t) {
        case 'b': case 'strong': return '**' + text + '**';
        case 'i': case 'em': return '*' + text + '*';
        case 'del': return '~~' + text + '~~';
        case 'code': case 'kbd': case 'samp': return '`' + text + '`';
        case 'a': return '[' + text + '](#)';
        default: return text;
      }
    } else {
      switch(t) {
        case 'a': return '<a href="#">' + text + '</a>';
        case 'code': return '<code>' + text + '</code>';
        default: return '<' + t + '>' + text + '</' + t + '>';
      }
    }
  }

  function inlineWrapText(text, tags) {
    if (!tags.length) return text;
    // 按句子分段包裹，防止整段变粗
    var sentences = text.match(/[^。.!?！？\n]+[。.!?！？]?/g) || [text];
    return sentences.map(function(s) { return wrapInline(s, tags); }).join('');
  }

  function formatBlock(units, blockTag, inlineTags) {
    if (currentFormat === 'text') return units.join('\n\n');

    var isHtml = currentFormat === 'html';
    var isMd = currentFormat === 'markdown';

    // 如果 blockTag 为 none
    if (blockTag === 'none') {
      return units.map(function(u) {
        return inlineWrapText(isHtml ? escapeHtml(u) : u, inlineTags);
      }).join('\n\n');
    }

    // HTML 块
    if (isHtml) {
      if (blockTag === 'ul' || blockTag === 'ol') {
        var items = units.map(function(u) {
          return '  <li>' + inlineWrapText(escapeHtml(u), inlineTags) + '</li>';
        }).join('\n');
        return '<' + blockTag + '>\n' + items + '\n</' + blockTag + '>';
      }
      if (blockTag === 'mixed') {
        return units.map(function(u) {
          var tags = ['p', 'h2', 'h3', 'blockquote', 'ul', 'ol'];
          var t = pick(tags);
          var inner = inlineWrapText(escapeHtml(u), inlineTags);
          if (t === 'ul' || t === 'ol') return '<' + t + '><li>' + inner + '</li></' + t + '>';
          return '<' + t + '>' + inner + '</' + t + '>';
        }).join('\n');
      }
      return units.map(function(u) {
        var inner = inlineWrapText(escapeHtml(u), inlineTags);
        return '<' + blockTag + '>' + inner + '</' + blockTag + '>';
      }).join('\n');
    }

    // Markdown 块
    if (isMd) {
      if (blockTag === 'mixed') {
        return units.map(function(u) {
          var tags = ['p', 'md_h2', 'md_h3', 'md_bq', 'md_ul'];
          var t = pick(tags);
          var inner = inlineWrapText(u, inlineTags);
          if (t === 'md_ul') return '- ' + inner;
          if (t === 'md_bq') return '> ' + inner;
          if (t === 'md_h2') return '## ' + inner;
          if (t === 'md_h3') return '### ' + inner;
          return inner;
        }).join('\n\n');
      }
      if (blockTag === 'md_ul') return units.map(function(u) { return '- ' + inlineWrapText(u, inlineTags); }).join('\n');
      if (blockTag === 'md_ol') return units.map(function(u, i) { return (i+1) + '. ' + inlineWrapText(u, inlineTags); }).join('\n');
      if (blockTag === 'md_bq') return units.map(function(u) { return '> ' + inlineWrapText(u, inlineTags); }).join('\n>\n');
      if (blockTag === 'md_h1') return units.map(function(u) { return '# ' + inlineWrapText(u, inlineTags); }).join('\n\n');
      if (blockTag === 'md_h2') return units.map(function(u) { return '## ' + inlineWrapText(u, inlineTags); }).join('\n\n');
      if (blockTag === 'md_h3') return units.map(function(u) { return '### ' + inlineWrapText(u, inlineTags); }).join('\n\n');
      // 默认普通段落
      return units.map(function(u) { return inlineWrapText(u, inlineTags); }).join('\n\n');
    }
    return '';
  }

  // ================== 主流程 ==================
  var debounceTimer;
  function generate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doGenerate, 100);
  }

  function doGenerate() {
    var n = Math.max(1, Math.min(500, parseInt(countEl.value, 10) || 3));
    var maxChars = Math.max(0, parseInt(maxCharsEl.value, 10) || 0);
    
    var units = generateUnits(n);
    units = limitUnits(units, maxChars).filter(function (u) { return u && u.trim(); });

    var blockTag = blockTagEl.value;
    var inlineTags = getSelectedInlineTags();
    
    var html = formatBlock(units, blockTag, inlineTags);
    outputEl.value = html;
    
    updatePreview(html);
    updateStats(units);
    saveSettings();
  }

  function updatePreview(html) {
    if (currentFormat === 'markdown') {
      // 简单的 Markdown 转 HTML 预览
      var text = escapeHtml(html);
      // 标题
      text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      // 引用
      text = text.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
      // 列表
      text = text.replace(/^\s*\- (.*$)/gim, '<ul><li>$1</li></ul>');
      text = text.replace(/^\s*\d+\. (.*$)/gim, '<ol><li>$1</li></ol>');
      // 行内样式
      text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
      text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
      text = text.replace(/`(.*?)`/g, '<code>$1</code>');
      text = text.replace(/\[(.*?)\]\(#\)/g, '<a href="#">$1</a>');
      // 换行
      text = text.replace(/\n\n/g, '<br><br>');
      text = text.replace(/\n/g, '<br>');
      
      // 修正被分开的列表
      text = text.replace(/<\/ul>\s*<ul>/g, '');
      text = text.replace(/<\/ol>\s*<ol>/g, '');
      
      previewEl.innerHTML = text;
    } else if (currentFormat === 'html') {
      previewEl.innerHTML = html || '';
      var links = previewEl.querySelectorAll('a');
      for(var i=0; i<links.length; i++) {
        links[i].addEventListener('click', function(e){ e.preventDefault(); });
      }
    } else {
      previewEl.innerHTML = '<pre style="white-space:pre-wrap; font-family:inherit;">' + escapeHtml(html) + '</pre>';
    }
  }

  function updateStats(units) {
    var plain = units.join('\n\n');
    var sentences = plain.split(/[。.!?！？]+/).filter(function (s) { return s.trim(); }).length;
    var paragraphs = units.filter(function (u) { return u.trim(); }).length;
    var chars = plain.replace(/\s/g, '').length;
    
    var lang = langEl.value;
    var words = 0;
    if (['zh', 'ja', 'ko'].includes(lang)) {
      words = chars; // CJK 以字数计算
    } else {
      words = plain.trim() ? plain.trim().split(/\s+/).length : 0;
    }

    stWords.textContent = words;
    stChars.textContent = chars;
    stSentences.textContent = sentences;
    stParagraphs.textContent = paragraphs;
  }

  // ================== 交互与事件 ==================
  
  // 切换格式
  formatEl.addEventListener('change', function() {
    currentFormat = this.value;
    
    // 显示/隐藏标签设置
    if (currentFormat === 'text') {
      tagsPanel.style.display = 'none';
    } else {
      tagsPanel.style.display = 'block';
    }

    // 动态替换块级标签下拉菜单的选中项
    var val = blockTagEl.value;
    if (currentFormat === 'markdown') {
      if (['p','h1','h2','h3','blockquote','ul','ol'].includes(val)) {
        blockTagEl.value = 'none';
      }
    } else if (currentFormat === 'html') {
      if (val.startsWith('md_')) {
        blockTagEl.value = 'none';
      }
    }
    
    generate();
  });

  // 清空行内标签
  clearInlineBtn.addEventListener('click', function(e) {
    e.preventDefault();
    var boxes = document.querySelectorAll('.inline-tags-grid input[type="checkbox"]');
    for(var i=0; i<boxes.length; i++) boxes[i].checked = false;
    generate();
  });

  // 自定义开关
  useCustomEl.addEventListener('change', function() {
    customWrap.style.display = this.checked ? 'block' : 'none';
    generate();
  });

  // 视图切换
  viewBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      viewBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      
      if (this.dataset.view === 'code') {
        outputEl.style.display = 'block';
        previewWrap.style.display = 'none';
      } else {
        outputEl.style.display = 'none';
        previewWrap.style.display = 'block';
      }
    });
  });

  // 复制
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('已复制到剪贴板');
      }).catch(function() {
        showToast('复制失败');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('已复制到剪贴板');
    }
  }

  copyBtn.addEventListener('click', function() {
    if (outputEl.value) copyText(outputEl.value);
  });

  copyTextBtn.addEventListener('click', function() {
    if (!outputEl.value) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = outputEl.value;
    copyText(tmp.textContent || tmp.innerText || '');
  });

  // 下载
  downloadBtn.addEventListener('click', function() {
    if (!outputEl.value) return;
    
    var ext = currentFormat === 'markdown' ? 'md' : (currentFormat === 'html' ? 'html' : 'txt');
    var blob = new Blob([outputEl.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lorem_ipsum_' + Date.now() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('已下载文件');
  });

  // 防抖触发生成
  var inputs = [langEl, modeEl, countEl, maxCharsEl, startEl, blockTagEl];
  inputs.forEach(function(el) {
    el.addEventListener('input', generate);
    el.addEventListener('change', generate);
  });
  
  document.querySelectorAll('.inline-tags-grid input').forEach(function(el) {
    el.addEventListener('change', generate);
  });

  generateBtn.addEventListener('click', function() {
    doGenerate();
    showToast('生成成功');
  });

  // ================== 本地存储 ==================
  function saveSettings() {
    try {
      var settings = {
        lang: langEl.value,
        format: formatEl.value,
        mode: modeEl.value,
        count: countEl.value,
        maxChars: maxCharsEl.value,
        startClassic: startEl.checked,
        blockTag: blockTagEl.value,
        inline: []
      };
      document.querySelectorAll('.inline-tags-grid input:checked').forEach(function(el) {
        settings.inline.push(el.value);
      });
      localStorage.setItem('lorem_settings', JSON.stringify(settings));
    } catch(e) {}
  }

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem('lorem_settings'));
      if (!s) return;
      if (s.lang) langEl.value = s.lang;
      if (s.format) {
        formatEl.value = s.format;
        currentFormat = s.format;
      }
      if (s.mode) modeEl.value = s.mode;
      if (s.count) countEl.value = s.count;
      if (s.maxChars !== undefined) maxCharsEl.value = s.maxChars;
      if (s.startClassic !== undefined) startEl.checked = s.startClassic;
      if (s.blockTag) blockTagEl.value = s.blockTag;
      
      if (s.inline && s.inline.length > 0) {
        document.querySelectorAll('.inline-tags-grid input').forEach(function(el) {
          if (s.inline.includes(el.value)) el.checked = true;
        });
      }
      
      if (currentFormat === 'text') tagsPanel.style.display = 'none';
      
    } catch(e) {}
  }

  // 初始化
  loadSettings();
  doGenerate();

})();