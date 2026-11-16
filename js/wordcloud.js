(function() {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  // ================= DOM 元素 =================
  var inputTextEl = document.getElementById('input-text');
  var charCountEl = document.getElementById('char-count');
  var shapeTypeEl = document.getElementById('shape-type');
  var bgColorEl = document.getElementById('bg-color');
  var transparentBgEl = document.getElementById('transparent-bg');
  var colorThemeEl = document.getElementById('color-theme');
  var maxFontSizeEl = document.getElementById('max-font-size');
  var maxFontSizeValEl = document.getElementById('max-font-size-val');
  var rotateRatioEl = document.getElementById('rotate-ratio');
  var rotateRatioValEl = document.getElementById('rotate-ratio-val');
  var gridSizeEl = document.getElementById('grid-size');
  var gridSizeValEl = document.getElementById('grid-size-val');
  var exportFormatEl = document.getElementById('export-format');
  var exportScaleEl = document.getElementById('export-scale');
  var enableStopwordsEl = document.getElementById('enable-stopwords');
  
  var btnGenerate = document.getElementById('btn-generate');
  var btnDownload = document.getElementById('btn-download');
  var canvas = document.getElementById('wordcloud-canvas');
  var loadingOverlay = document.getElementById('loading-overlay');

  var fontUploadEl = document.getElementById('font-upload');
  var btnUploadFont = document.getElementById('btn-upload-font');
  var fontStatusEl = document.getElementById('font-status');

  var shapeUploadEl = document.getElementById('shape-upload');
  var btnUploadShape = document.getElementById('btn-upload-shape');
  var shapeFileNameEl = document.getElementById('shape-file-name');
  var customShapeRow = document.getElementById('custom-shape-row');

  // ================= 状态变量 =================
  var defaultFont = '"LXGW WenKai", "Microsoft YaHei", sans-serif';
  var currentFontFamily = defaultFont;
  var customMaskImage = null;
  var MAX_CHARS = 10000;
  var generateTimer = null;
  
  // 停用词库
  var stopWords = {
    zh: ['的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '没有', '我们', '你们', '他们', '它们', '这个', '那个', '这些', '那些', '因为', '所以', '但是', '然后', '如果', '虽然', '可以', '自己', '什么', '怎么', '还是', '这样', '那样', '不是', '就是', '只是'],
    en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also']
  };

  // ================= 形状与遮罩 =================
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

  shapeTypeEl.addEventListener('change', function() {
    if (this.value === 'custom') {
      customShapeRow.style.display = 'flex';
    } else {
      customShapeRow.style.display = 'none';
    }
    scheduleGenerate();
  });

  btnUploadShape.addEventListener('click', function() {
    shapeUploadEl.click();
  });

  shapeUploadEl.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      var img = new Image();
      img.onload = function() {
        customMaskImage = img;
        shapeFileNameEl.textContent = file.name;
        shapeTypeEl.value = 'custom';
        customShapeRow.style.display = 'flex';
        generate();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // ================= 文本分词与词频统计 =================
  function analyzeText(text) {
    var wordFreq = {};
    var cleanText = text.toLowerCase(); // 统一转小写处理

    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        var segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
        var segments = segmenter.segment(cleanText);
        for (var s of segments) {
          var word = s.segment.trim();
          if (!word || /^[\p{P}\p{S}]+$/u.test(word)) continue;
          
          if (enableStopwordsEl.checked) {
            if (stopWords.zh.indexOf(word) !== -1 || stopWords.en.indexOf(word) !== -1) continue;
            if (word.length === 1 && /^[a-z]$/.test(word)) continue; // 过滤单个字母
          }
          
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
        return Object.keys(wordFreq).map(function(key) {
          return [key, wordFreq[key]];
        }).sort(function(a, b) { return b[1] - a[1]; });
      } catch (e) {
        console.warn('Intl.Segmenter 失败，降级切分。');
      }
    }
    
    // 降级切分
    var words = cleanText.split(/[\s,.\-!?;:"'()\[\]{}]+/);
    words.forEach(function(w) {
      if (!w) return;
      if (enableStopwordsEl.checked) {
        if (stopWords.zh.indexOf(w) !== -1 || stopWords.en.indexOf(w) !== -1) return;
      }
      
      if (/^[\u4e00-\u9fa5]+$/.test(w) && w.length > 1) {
        w.split('').forEach(function(char) {
          if (enableStopwordsEl.checked && stopWords.zh.indexOf(char) !== -1) return;
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

  // ================= 配色方案 =================
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
    } else if (theme === 'monochrome') {
      return function() { return '#3d3226'; };
    } else if (palettes[theme]) {
      return function() { return palettes[theme][Math.floor(Math.random() * palettes[theme].length)]; };
    }
    return '#3d3226';
  }

  // ================= 生成核心逻辑 =================
  function scheduleGenerate() {
    clearTimeout(generateTimer);
    generateTimer = setTimeout(generate, 400);
  }

  function generate() {
    var text = inputTextEl.value.trim();
    if (!text) return showToast('请先输入文本内容！', true);

    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS);
    }

    var words = analyzeText(text);
    if (words.length === 0) return showToast('未能提取到有效词汇，可能是全被过滤了', true);

    // 过滤策略：词频大于1的优先，如果太少则放开
    var validWords = words.filter(function(item) { return item[1] > 1; });
    if (validWords.length < 10) validWords = words;
    
    var topWords = validWords.slice(0, 200); // 增加上限到200个词

    if (topWords.length === 0) return showToast('有效词汇为 0', true);

    var maxFreq = topWords[0][1];
    var targetMaxFont = parseInt(maxFontSizeEl.value, 10);

    loadingOverlay.style.display = 'flex';

    var maskImage = new Image();
    maskImage.crossOrigin = 'anonymous';
    
    if (shapeTypeEl.value === 'custom' && customMaskImage) {
      maskImage.src = customMaskImage.src;
    } else {
      maskImage.src = getShapeSvg(shapeTypeEl.value);
    }

    maskImage.onload = function() {
      var isTransparent = transparentBgEl.checked;
      var rotateRatio = parseInt(rotateRatioEl.value, 10) / 100;

      var options = {
        list: topWords,
        gridSize: parseInt(gridSizeEl.value, 10),
        weightFactor: function(w) {
          if (maxFreq <= 1) return targetMaxFont;
          var ratio = Math.sqrt(w) / Math.sqrt(maxFreq);
          return 12 + ratio * (targetMaxFont - 12);
        },
        fontFamily: currentFontFamily,
        color: getColorFunction(colorThemeEl.value),
        backgroundColor: isTransparent ? 'transparent' : bgColorEl.value,
        rotateRatio: rotateRatio,
        minRotation: -Math.PI / 2,
        maxRotation: Math.PI / 2,
        maskImage: maskImage,
        clearCanvas: true,
        shuffle: false,
        drawOutOfBound: false,
        ellipticity: 0.8,
        weightMode: 'size',
        origin: [canvas.width / 2, canvas.height / 2]
      };

      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        WordCloud(canvas, options);
        
        // WordCloud 是异步渲染的，监听结束事件
        var stopCheck = setInterval(function() {
          // 简单粗暴地延时隐藏，实际上 wordcloud2 内部处理可能需要时间
        }, 100);

        setTimeout(function() {
          loadingOverlay.style.display = 'none';
        }, 800); // 给足渲染时间
        
      } catch (e) {
        console.error(e);
        loadingOverlay.style.display = 'none';
        showToast('渲染出错：' + e.message, true);
      }
    };
    
    maskImage.onerror = function() {
      loadingOverlay.style.display = 'none';
      showToast('形状遮罩加载失败', true);
    };
  }

  // ================= 下载高分辨率图片 =================
  function download() {
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var isEmpty = true;
    for (var i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] !== 0) { isEmpty = false; break; }
    }
    if (isEmpty) return showToast('请先生成文字云！', true);

    var format = exportFormatEl.value;
    var mimeType = 'image/' + format;
    var ext = format === 'jpeg' ? 'jpg' : format;
    var scale = parseInt(exportScaleEl.value, 10);

    if (scale === 1 && format !== 'jpeg') {
      triggerDownload(canvas.toDataURL(mimeType, 0.95), ext);
      return;
    }

    // 处理高倍数导出
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * scale;
    tempCanvas.height = canvas.height * scale;
    var tCtx = tempCanvas.getContext('2d');

    if (format === 'jpeg') {
      tCtx.fillStyle = transparentBgEl.checked ? '#ffffff' : bgColorEl.value;
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    tCtx.scale(scale, scale);
    tCtx.drawImage(canvas, 0, 0);

    var url = tempCanvas.toDataURL(mimeType, 0.95);
    triggerDownload(url, ext);
  }

  function triggerDownload(url, ext) {
    var a = document.createElement('a');
    a.href = url;
    a.download = '文字云_' + Date.now() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('图片已开始下载');
  }

  // ================= 事件监听 =================
  inputTextEl.addEventListener('input', function() {
    var len = inputTextEl.value.length;
    charCountEl.textContent = len + ' / ' + MAX_CHARS;
    
    if (len > MAX_CHARS) {
      charCountEl.classList.add('warning');
      inputTextEl.value = inputTextEl.value.substring(0, MAX_CHARS);
      charCountEl.textContent = MAX_CHARS + ' / ' + MAX_CHARS;
    } else {
      charCountEl.classList.remove('warning');
    }
    scheduleGenerate();
  });

  transparentBgEl.addEventListener('change', function() {
    bgColorEl.disabled = transparentBgEl.checked;
    scheduleGenerate();
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

  enableStopwordsEl.addEventListener('change', scheduleGenerate);
  colorThemeEl.addEventListener('change', scheduleGenerate);
  
  maxFontSizeEl.addEventListener('input', function() {
    maxFontSizeValEl.textContent = maxFontSizeEl.value + 'px';
    scheduleGenerate();
  });
  
  rotateRatioEl.addEventListener('input', function() {
    rotateRatioValEl.textContent = rotateRatioEl.value + '%';
    scheduleGenerate();
  });

  gridSizeEl.addEventListener('input', function() {
    gridSizeValEl.textContent = gridSizeEl.value;
    scheduleGenerate();
  });

  btnGenerate.addEventListener('click', generate);
  btnDownload.addEventListener('click', download);

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
        
        generate(); // 字体加载完立即重绘
      }).catch(function(err) {
        console.error('字体加载失败', err);
        showToast('字体加载失败，请确保文件格式正确。', true);
      });
    };
    reader.readAsArrayBuffer(file);
    fontUploadEl.value = '';
  });

  // ================= 初始化 =================
  window.addEventListener('load', function() {
    if (!inputTextEl.value.trim()) {
      inputTextEl.value = '文字云是一种用于展示词频的数据可视化技术。词频越高的词汇在图中占据的面积越大，从而帮助人们快速捕捉文本的核心概念。文字云不仅可以生成圆形，还可以生成心形、星形或者自定义图片的形状。';
      inputTextEl.dispatchEvent(new Event('input'));
    }
    setTimeout(generate, 200); // 延迟一点等外部库
  });

})();