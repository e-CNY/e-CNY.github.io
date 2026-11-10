/* games/sample-game/game.js */
(function () {
  'use strict';

  /* ============ DOM ============ */
  var scoreVal     = document.getElementById('scoreVal');
  var streakVal    = document.getElementById('streakVal');
  var timeVal      = document.getElementById('timeVal');
  var stageIdle    = document.getElementById('stageIdle');
  var stagePlaying = document.getElementById('stagePlaying');
  var stageEnd     = document.getElementById('stageEnd');
  var questionText = document.getElementById('questionText');
  var optionsGrid  = document.getElementById('optionsGrid');
  var startBtn     = document.getElementById('startBtn');
  var againBtn     = document.getElementById('againBtn');
  var endEmoji     = document.getElementById('endEmoji');
  var endTitle     = document.getElementById('endTitle');
  var finalScore   = document.getElementById('finalScore');
  var maxStreakEl  = document.getElementById('maxStreak');
  var accuracyEl   = document.getElementById('accuracy');

  /* ============ 游戏状态 ============ */
  var state = {
    score: 0,
    streak: 0,
    maxStreak: 0,
    totalAnswered: 0,
    correctAnswered: 0,
    timeLeft: 60,
    timer: null,
    currentAnswer: null,
    locked: false,
    playing: false
  };

  var TIME_LIMIT = 60;

  /* ============ 出题 ============ */
  function genQuestion() {
    // 根据分数调整难度：分数越高，题目越难
    var level = Math.floor(state.score / 5);   // 每答对 5 题升一级
    var ops = ['+', '-'];
    if (level >= 1) ops.push('×');
    if (level >= 3) ops.push('÷');

    var op = ops[Math.floor(Math.random() * ops.length)];
    var a, b, answer;

    switch (op) {
      case '+':
        var maxAdd = Math.min(10 + level * 5, 50);
        a = randInt(1, maxAdd);
        b = randInt(1, maxAdd);
        answer = a + b;
        break;
      case '-':
        var maxSub = Math.min(10 + level * 5, 50);
        a = randInt(2, maxSub);
        b = randInt(1, a);         // 保证 a - b >= 0
        answer = a - b;
        break;
      case '×':
        var maxMul = Math.min(5 + level, 10);
        a = randInt(2, maxMul);
        b = randInt(2, maxMul);
        answer = a * b;
        break;
      case '÷':
        var maxDiv = Math.min(3 + level, 9);
        b = randInt(2, maxDiv);
        answer = randInt(2, maxDiv);
        a = b * answer;            // 保证整除
        break;
    }

    return {
      text: a + ' ' + op + ' ' + b + ' = ?',
      answer: answer
    };
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* ============ 选项生成 ============ */
  function genOptions(answer) {
    var set = {};
    set[answer] = true;
    var options = [answer];

    // 干扰项：答案上下小幅波动
    var spread = Math.max(3, Math.floor(Math.abs(answer) * 0.3) + 2);
    var tries = 0;
    while (options.length < 4 && tries < 50) {
      tries++;
      var delta = randInt(-spread, spread);
      if (delta === 0) continue;
      var val = answer + delta;
      if (val < 0) continue;
      if (set[val]) continue;
      set[val] = true;
      options.push(val);
    }

    // 若不足 4 个（极端情况），补齐
    var extra = 1;
    while (options.length < 4) {
      if (!set[answer + extra]) {
        set[answer + extra] = true;
        options.push(answer + extra);
      }
      extra++;
    }

    // 洗牌
    for (var i = options.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = options[i];
      options[i] = options[j];
      options[j] = tmp;
    }
    return options;
  }

  /* ============ 出题渲染 ============ */
  function nextQuestion() {
    var q = genQuestion();
    state.currentAnswer = q.answer;
    state.locked = false;

    questionText.textContent = q.text;

    var options = genOptions(q.answer);
    optionsGrid.innerHTML = '';
    options.forEach(function (val) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = val;
      btn.addEventListener('click', function () { handleAnswer(btn, val); });
      optionsGrid.appendChild(btn);
    });
  }

  /* ============ 处理答案 ============ */
  function handleAnswer(btn, val) {
    if (state.locked) return;
    state.locked = true;
    state.totalAnswered++;

    var buttons = optionsGrid.querySelectorAll('.option-btn');
    Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });

    if (val === state.currentAnswer) {
      btn.classList.add('correct');
      state.score++;
      state.streak++;
      state.correctAnswered++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    } else {
      btn.classList.add('wrong');
      // 标记正确答案
      Array.prototype.forEach.call(buttons, function (b) {
        if (parseInt(b.textContent, 10) === state.currentAnswer) {
          b.classList.add('correct');
        }
      });
      state.streak = 0;
      // 答错扣 2 秒
      state.timeLeft = Math.max(0, state.timeLeft - 2);
      updateHud();
      if (state.timeLeft <= 0) {
        endGame();
        return;
      }
    }

    updateHud();

    setTimeout(function () {
      if (state.playing) nextQuestion();
    }, 420);
  }

  /* ============ HUD ============ */
  function updateHud() {
    scoreVal.textContent = state.score;
    streakVal.textContent = state.streak;
    timeVal.textContent = state.timeLeft;
  }

  /* ============ 计时器 ============ */
  function startTimer() {
    stopTimer();
    state.timer = setInterval(function () {
      state.timeLeft--;
      updateHud();
      if (state.timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /* ============ 开始 / 结束 ============ */
  function startGame() {
    state.score = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.totalAnswered = 0;
    state.correctAnswered = 0;
    state.timeLeft = TIME_LIMIT;
    state.locked = false;
    state.playing = true;
    updateHud();

    stageIdle.hidden = true;
    stageEnd.hidden = true;
    stagePlaying.hidden = false;

    nextQuestion();
    startTimer();
  }

  function endGame() {
    state.playing = false;
    stopTimer();

    stagePlaying.hidden = true;
    stageIdle.hidden = true;
    stageEnd.hidden = false;

    var accuracy = state.totalAnswered > 0
      ? Math.round((state.correctAnswered / state.totalAnswered) * 100)
      : 0;

    finalScore.textContent = state.score;
    maxStreakEl.textContent = state.maxStreak;
    accuracyEl.textContent = accuracy + '%';

    // 根据分数改变结束文案
    if (state.score >= 30) {
      endEmoji.textContent = '🏆';
      endTitle.textContent = '心算大师！';
    } else if (state.score >= 20) {
      endEmoji.textContent = '🥇';
      endTitle.textContent = '非常棒！';
    } else if (state.score >= 12) {
      endEmoji.textContent = '🎯';
      endTitle.textContent = '不错哦！';
    } else if (state.score >= 6) {
      endEmoji.textContent = '👍';
      endTitle.textContent = '继续加油！';
    } else {
      endEmoji.textContent = '💪';
      endTitle.textContent = '再来一局试试？';
    }
  }

  /* ============ 事件 ============ */
  startBtn.addEventListener('click', startGame);
  againBtn.addEventListener('click', startGame);

  /* ============ 离开页面自动停止 ============ */
  window.addEventListener('beforeunload', function () {
    stopTimer();
  });
})();