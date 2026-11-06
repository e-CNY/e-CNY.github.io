(function() {
  var textDisplay = document.getElementById('tt-text-display');
  var inputEl = document.getElementById('tt-input');
  var overlay = document.getElementById('tt-overlay');
  var startBtn = document.getElementById('tt-start-btn');
  var restartBtn = document.getElementById('tt-restart');
  var langSelect = document.getElementById('tt-lang');
  var limitSelect = document.getElementById('tt-limit');
  var modeBtns = document.querySelectorAll('.tt-mode-btn');
  
  var wpmEl = document.getElementById('tt-wpm');
  var cpmEl = document.getElementById('tt-cpm');
  var accEl = document.getElementById('tt-acc');
  var timeEl = document.getElementById('tt-time');
  
  var resultPanel = document.getElementById('tt-result');
  var resWpm = document.getElementById('res-wpm');
  var resCpm = document.getElementById('res-cpm');
  var resAcc = document.getElementById('res-acc');
  var resBest = document.getElementById('res-best');
  var againBtn = document.getElementById('tt-again-btn');

  // 词库
  var WORDS_EN = "the be of and a to in he have it that for they I with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through years much where your way well down should because each just those people Mr how too little state good very make world still own see men work long get here between both life being under never day same another know while last might us great old year off come since against go came right used take three states himself few house use during without again place around however home small found thought went say part once general high upon school every don't does got united left number course war until always away something fact water though less public put think almost hand enough far took head yet government system better set told nothing night end why didn't called didn't eyes face fact water though less public put think almost hand enough far took head yet government system better set told nothing night end why didn't called didn't eyes face";
  
  var TEXTS_ZH = [
    "在追求梦想的道路上，我们总会遇到各种各样的挫折与困难。但请相信，每一次的跌倒都是为了更好地站起来。只要心中有光，脚下就有路。不要害怕失败，因为失败是成功之母。只有经历过风雨，才能见到最美的彩虹。",
    "人生就像一场旅行，不在乎目的地，在乎的是沿途的风景以及看风景的心情。让心灵去旅行，去感受大自然的神奇与美丽。无论是高山流水，还是大漠孤烟，都有其独特的魅力。珍惜每一天，活在当下，让生命绽放出最绚烂的光彩。",
    "编程不仅仅是一门技术，更是一种艺术。它需要我们用严谨的逻辑去思考问题，用创新的思维去解决问题。优秀的代码不仅要能运行，还要易于阅读和维护。不断学习，不断实践，才能在这个快速发展的时代保持竞争力。"
  ];

  var currentText = "";
  var currentLang = "en";
  var currentMode = "time"; // time 或 words
  var currentLimit = 60;
  
  var timer = null;
  var timeLeft = 0;
  var totalTyped = 0;
  var correctTyped = 0;
  var isStarted = false;
  var isComposing = false; // 中文输入法组合状态

  // 初始化事件（如果切换语言/模式/时长，直接重置并生效，无需刷新）
  modeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      modeBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentMode = this.dataset.mode;
      updateLimitOptions();
      resetTest();
    });
  });

  langSelect.addEventListener('change', function() {
    currentLang = this.value;
    resetTest();
  });

  limitSelect.addEventListener('change', function() {
    currentLimit = parseInt(this.value, 10);
    resetTest();
  });

  function updateLimitOptions() {
    limitSelect.innerHTML = '';
    if (currentMode === 'time') {
      limitSelect.innerHTML = '<option value="15">15秒</option><option value="30">30秒</option><option value="60" selected>60秒</option><option value="120">120秒</option>';
      currentLimit = 60;
    } else {
      limitSelect.innerHTML = '<option value="10">10词</option><option value="25">25词</option><option value="50" selected>50词</option><option value="100">100词</option>';
      currentLimit = 50;
    }
  }

  // 生成新文本
  function generateText() {
    if (currentLang === 'en') {
      var words = WORDS_EN.split(' ');
      var result = [];
      if (currentMode === 'time') {
        for (var i = 0; i < 100; i++) result.push(words[Math.floor(Math.random() * words.length)]);
      } else {
        for (var i = 0; i < currentLimit; i++) result.push(words[Math.floor(Math.random() * words.length)]);
      }
      return result.join(' ');
    } else {
      var text = TEXTS_ZH[Math.floor(Math.random() * TEXTS_ZH.length)];
      if (currentMode === 'words') {
        return text.substring(0, currentLimit * 2); // 中文按字符算，简单截取
      }
      return text + text; // 拼接两次防不够打
    }
  }

  // 渲染文本
  function renderText(text) {
    textDisplay.innerHTML = '';
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'tt-char';
      span.textContent = text[i];
      textDisplay.appendChild(span);
    }
    updateCurrentChar(0);
  }

  // 更新光标位置
  function updateCurrentChar(index) {
    var chars = textDisplay.querySelectorAll('.tt-char');
    chars.forEach(function(c) { c.classList.remove('current'); });
    if (index < chars.length) {
      chars[index].classList.add('current');
      var lineHeight = chars[index].offsetHeight;
      var scrollTop = chars[index].offsetTop;
      var containerScrollTop = textDisplay.parentElement.scrollTop;
      var containerHeight = textDisplay.parentElement.offsetHeight;
      if (scrollTop < containerScrollTop) {
        textDisplay.parentElement.scrollTop = scrollTop - lineHeight;
      } else if (scrollTop + lineHeight > containerScrollTop + containerHeight) {
        textDisplay.parentElement.scrollTop = scrollTop - containerHeight + lineHeight * 2;
      }
    }
  }

  // 重置测试
  function resetTest() {
    isStarted = false;
    clearInterval(timer);
    inputEl.value = '';
    inputEl.readOnly = false;
    totalTyped = 0;
    correctTyped = 0;
    
    wpmEl.textContent = '0';
    cpmEl.textContent = '0';
    accEl.textContent = '100%';
    timeEl.textContent = currentLimit;
    
    overlay.style.display = 'flex';
    resultPanel.style.display = 'none';
    
    currentText = generateText();
    renderText(currentText);
    
    var chars = textDisplay.querySelectorAll('.tt-char');
    chars.forEach(function(c) {
      c.classList.remove('correct', 'incorrect', 'correct-space');
    });
    updateCurrentChar(0);
  }

  // 开始测试
  function startTest() {
    if (isStarted) return;
    isStarted = true;
    overlay.style.display = 'none';
    inputEl.focus();
    
    if (currentMode === 'time') {
      timeLeft = currentLimit;
      timer = setInterval(function() {
        timeLeft--;
        timeEl.textContent = timeLeft;
        updateStats();
        if (timeLeft <= 0) {
          finishTest();
        }
      }, 1000);
    } else {
      timeEl.textContent = '0';
      timer = setInterval(function() {
        timeEl.textContent = parseInt(timeEl.textContent) + 1;
        updateStats();
      }, 1000);
    }
  }

  // 结束测试
  function finishTest() {
    isStarted = false;
    clearInterval(timer);
    inputEl.readOnly = true;
    
    var elapsedMinutes;
    if (currentMode === 'time') {
      elapsedMinutes = currentLimit / 60;
    } else {
      elapsedMinutes = parseInt(timeEl.textContent) / 60;
      if (elapsedMinutes <= 0) elapsedMinutes = 1 / 60;
    }
    
    var cpm = Math.round(correctTyped / elapsedMinutes);
    var wpm = currentLang === 'en' ? Math.round(cpm / 5) : cpm; 
    var acc = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
    
    if (acc < 0) acc = 0;

    resWpm.textContent = wpm;
    resCpm.textContent = cpm;
    resAcc.textContent = acc + '%';
    
    var bestKey = 'typing_best_' + currentLang;
    var best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    if (wpm > best) {
      best = wpm;
      localStorage.setItem(bestKey, best);
    }
    resBest.textContent = best;
    
    resultPanel.style.display = 'block';
  }

  // 实时统计
  function updateStats() {
    if (!isStarted) return;
    
    var elapsedMinutes;
    if (currentMode === 'time') {
      elapsedMinutes = (currentLimit - timeLeft) / 60;
    } else {
      elapsedMinutes = parseInt(timeEl.textContent) / 60;
    }
    
    if (elapsedMinutes > 0.01) {
      var cpm = Math.round(correctTyped / elapsedMinutes);
      var wpm = currentLang === 'en' ? Math.round(cpm / 5) : cpm;
      var acc = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
      if (acc < 0) acc = 0;
      
      wpmEl.textContent = wpm;
      cpmEl.textContent = cpm;
      accEl.textContent = acc + '%';
    }
  }

  // ================= 核心：输入法处理 =================
  inputEl.addEventListener('compositionstart', function() {
    isComposing = true;
  });

  inputEl.addEventListener('compositionend', function() {
    isComposing = false;
    handleInput();
  });

  inputEl.addEventListener('input', function() {
    // 如果正在拼音输入中，不进行判定（避免拼音字母被标红）
    if (!isComposing) {
      handleInput();
    }
  });

  function handleInput() {
    if (!isStarted) return;
    
    // 防止换行
    inputEl.value = inputEl.value.replace(/[\r\n]/g, '');
    var text = inputEl.value;
    var chars = textDisplay.querySelectorAll('.tt-char');
    
    totalTyped = text.length;
    correctTyped = 0;
    
    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.remove('correct', 'incorrect', 'correct-space');
      
      if (i < text.length) {
        if (text[i] === currentText[i]) {
          chars[i].classList.add('correct');
          correctTyped++;
        } else {
          chars[i].classList.add('incorrect');
        }
      }
    }
    
    if (text.length > currentText.length) {
      correctTyped -= (text.length - currentText.length);
    }
    
    if (correctTyped < 0) correctTyped = 0;

    updateCurrentChar(text.length);
    updateStats();

    if (currentMode === 'words' && text.length >= currentText.length) {
      finishTest();
    }
  }

  // 屏蔽 Tab 键，防止焦点丢失
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
    }
  });

  startBtn.addEventListener('click', startTest);
  restartBtn.addEventListener('click', resetTest);
  againBtn.addEventListener('click', resetTest);

  // 初始化
  resetTest();
})();