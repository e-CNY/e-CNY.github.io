(function() {
  var inputTextEl = document.getElementById('input-text');
  var charCountEl = document.getElementById('char-count');
  var shapeTypeEl = document.getElementById('shape-type');
  var bgColorEl = document.getElementById('bg-color');
  var transparentBgEl = document.getElementById('transparent-bg');
  var colorThemeEl = document.getElementById('color-theme');
  var maxFontSizeEl = document.getElementById('max-font-size');
  var maxFontSizeValEl = document.getElementById('max-font-size-val');
  var gridSizeEl = document.getElementById('grid-size');
  var gridSizeValEl = document.getElementById('grid-size-val');
  var exportFormatEl = document.getElementById('export-format');
  var btnGenerate = document.getElementById('btn-generate');
  var btnDownload = document.getElementById('btn-download');
  var canvas = document.getElementById('wordcloud-canvas');

  var fontUploadEl = document.getElementById('font-upload');
  var btnUploadFont = document.getElementById('btn-upload-font');
  var fontStatusEl = document.getElementById('font-status');

  var defaultFont = '"LXGW WenKai", "Microsoft YaHei", sans-serif';
  var currentFontFamily = defaultFont;
  
  var MAX_CHARS = 10000; // 字符硬限制

  // 形状 SVG 生成器
  function getShapeSvg(shape) {
    var svg = '';
    if (shape === 'circle') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="black"/></svg>';
    } else if (shape === 'cardioid') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,30 C50,30 40,10 20,10 C0,10 0,40 20,60 L50,90 L80,60 C100,40 100,10 80,10 C60,10 50,30 50,30 Z" fill="black"/></svg>';
    } else if (shape === 'star') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="black"/></svg>';
    } else if (shape === 'diamond') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,0 100,50 50,100 0,50" fill="black"/></svg>';
    } else {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="black"/></svg>';
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // 中文/英文智能分词 + 词频统计
  function analyzeText(text) {
    var wordFreq = {};
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        var segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
        var segments = segmenter.segment(text);
        for (var s of segments) {
          var word = s.segment.trim();
          if (!word || /^[a-zA-Z]+$/.test(word) && word.length < 2) continue;
          if (/^[\p{P}\p{S}]+$/u.test(word)) continue;
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
        return Object.keys(wordFreq).map(function(key) {
          return [key, wordFreq[key]];
        });
      } catch (e) {
        console.warn('Intl.Segmenter 失败，降级切分。');
      }
    }
    var words = text.split(/[\s,.\-!?;:"'()\[\]{}]+/);
    words.forEach(function(w) {
      if (!w) return;
      if (/^[\u4e00-\u9fa5]+$/.test(w) && w.length > 1) {
        w.split('').forEach(function(char) {
          wordFreq[char] = (wordFreq[char] || 0) + 1;
        });
      } else {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    return Object.keys(wordFreq).map(function(key) {
      return [key, wordFreq[key]];
    }).sort(function(a, b) { return b[1] - a[1]; });
  }

  // 配色方案
  function getColorFunction(theme) {
    var palettes = {
      'ocean': ['#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#03045e'],
      'sunset': ['#e63946', '#f4a261', '#e76f51', '#264653', '#2a9d8f'],
      'forest': ['#2a9d8f', '#e9c46a', '#f4a261', '#264653', '#8ab17d']
    };
    if (theme === 'random-dark') {
      return function() { return 'hsl(' + Math.floor(Math.random() * 360) + ', 60%, 30%)'; };
    } else if (theme === 'random-light') {
      return function() { return 'hsl(' + Math.floor(Math.random() * 360) + ', 60%, 65%)'; };
    } else if (palettes[theme]) {
      return function() { return palettes[theme][Math.floor(Math.random() * palettes[theme].length)]; };
    }
    return '#3d3226';
  }

  // 生成文字云
  function generate() {
    var text = inputTextEl.value.trim();
    if (!text) {
      alert('请先输入文本内容！');
      return;
    }

    // 如果文本过长，先截取前 10000 字处理
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS);
    }

    var words = analyzeText(text);
    if (words.length === 0) {
      alert('未能提取到有效词汇，请检查输入内容。');
      return;
    }

    // 过滤策略：
    // 1. 最多只取排名前 150 个词
    // 2. 如果词很多，过滤掉只出现1次的词，避免画布太乱
    var validWords = words.filter(function(item) {
      return item[1] > 1; // 只要出现 2 次以上的词
    });
    
    // 如果过滤后太少，则回退到取前 150 个
    if (validWords.length < 10) {
      validWords = words;
    }
    
    var topWords = validWords.slice(0, 150);
    var maxFreq = topWords[0][1];
    var targetMaxFont = parseInt(maxFontSizeEl.value, 10);

    var maskImage = new Image();
    maskImage.src = getShapeSvg(shapeTypeEl.value);

    maskImage.onload = function() {
      var isTransparent = transparentBgEl.checked;
      var options = {
        list: topWords,
        gridSize: parseInt(gridSizeEl.value, 10),
        weightFactor: function(w) {
          if (maxFreq <= 1) return targetMaxFont;
          var ratio = Math.sqrt(w) / Math.sqrt(maxFreq);
          return 10 + ratio * (targetMaxFont - 10);
        },
        fontFamily: currentFontFamily,
        color: getColorFunction(colorThemeEl.value),
        backgroundColor: isTransparent ? 'transparent' : bgColorEl.value,
        rotateRatio: 0.3,
        minRotation: -Math.PI / 2,
        maxRotation: Math.PI / 2,
        maskImage: maskImage,
        clearCanvas: true,
        shuffle: false,
        drawOutOfBound: false,
        ellipticity: 0.8,
        weightMode: 'size'
      };

      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      WordCloud(canvas, options);
    };
  }

  // 下载图片
  function download() {
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var isEmpty = true;
    for (var i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] !== 0) { isEmpty = false; break; }
    }
    if (isEmpty) {
      alert('请先生成文字云！');
      return;
    }

    var format = exportFormatEl.value;
    var mimeType = 'image/' + format;
    var ext = format === 'jpeg' ? 'jpg' : format;

    if (format === 'jpeg') {
      var tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      var tCtx = tempCanvas.getContext('2d');
      
      tCtx.fillStyle = transparentBgEl.checked ? '#ffffff' : bgColorEl.value;
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.drawImage(canvas, 0, 0);
      
      var url = tempCanvas.toDataURL(mimeType, 0.95);
      triggerDownload(url, ext);
    } else {
      var url = canvas.toDataURL(mimeType, 0.95);
      triggerDownload(url, ext);
    }
  }

  function triggerDownload(url, ext) {
    var a = document.createElement('a');
    a.href = url;
    a.download = '文字云_' + new Date().toISOString().slice(0, 10) + '.' + ext;
    a.click();
  }

  // 字数统计与截断逻辑
  inputTextEl.addEventListener('input', function() {
    var len = inputTextEl.value.length;
    charCountEl.textContent = len + ' / ' + MAX_CHARS;
    
    if (len > MAX_CHARS) {
      charCountEl.classList.add('warning');
      // 可选：严格强制截断输入（如果是粘贴，瞬间超出，这里自动截取）
      inputTextEl.value = inputTextEl.value.substring(0, MAX_CHARS);
      charCountEl.textContent = MAX_CHARS + ' / ' + MAX_CHARS;
    } else {
      charCountEl.classList.remove('warning');
    }
  });

  // ====== 字体上传逻辑 ======
  btnUploadFont.addEventListener('click', function() {
    fontUploadEl.click();
  });

  fontUploadEl.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(evt) {
      var arrayBuffer = evt.target.result;
      var fontName = 'CustomFont_' + Date.now();
      var fontFace = new FontFace(fontName, arrayBuffer);

      fontFace.load().then(function(loadedFont) {
        document.fonts.add(loadedFont);
        currentFontFamily = '"' + fontName + '", ' + defaultFont;
        
        fontStatusEl.textContent = file.name;
        fontStatusEl.title = file.name;
        
        generate();
      }).catch(function(err) {
        console.error('字体加载失败', err);
        alert('字体加载失败，请确保文件格式正确。');
      });
    };
    reader.readAsArrayBuffer(file);
    fontUploadEl.value = '';
  });

  // ====== 事件绑定 ======

  transparentBgEl.addEventListener('change', function() {
    bgColorEl.disabled = transparentBgEl.checked;
  });

  exportFormatEl.addEventListener('change', function() {
    if (exportFormatEl.value === 'jpeg') {
      transparentBgEl.checked = false;
      transparentBgEl.disabled = true;
      bgColorEl.disabled = false;
    } else {
      transparentBgEl.disabled = false;
      bgColorEl.disabled = transparentBgEl.checked;
    }
  });

  btnGenerate.addEventListener('click', generate);
  btnDownload.addEventListener('click', download);

  maxFontSizeEl.addEventListener('input', function() {
    maxFontSizeValEl.textContent = maxFontSizeEl.value + 'px';
  });
  gridSizeEl.addEventListener('input', function() {
    gridSizeValEl.textContent = gridSizeEl.value;
  });

  window.addEventListener('load', function() {
    if (!inputTextEl.value.trim()) {
      inputTextEl.value = '文字云是一种用于展示词频的数据可视化技术。词频越高的词汇在图中占据的面积越大，从而帮助人们快速捕捉文本的核心概念。';
      // 触发一次统计更新
      inputTextEl.dispatchEvent(new Event('input'));
    }
    generate();
  });
})();