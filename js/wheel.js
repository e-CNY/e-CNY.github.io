/* js/wheel.js */
(function () {
  'use strict';

  var entriesEl     = document.getElementById('entries');
  var countEl       = document.getElementById('count');
  var warnEl        = document.getElementById('warn');
  var canvas        = document.getElementById('wheel');
  var ctx           = canvas.getContext('2d');
  var spinBtn       = document.getElementById('spinBtn');
  var resultEl      = document.getElementById('result');
  var resultText    = resultEl.querySelector('.result-text');
  var historyList   = document.getElementById('historyList');
  var historyEmpty  = document.getElementById('historyEmpty');
  var removeWinnerEl= document.getElementById('removeWinner');
  var soundToggleEl = document.getElementById('soundToggle');
  var clearHistoryBtn = document.getElementById('clearHistory');
  var shuffleBtn    = document.getElementById('shuffleBtn');
  var resetBtn      = document.getElementById('resetBtn');

  var DEFAULT_TEXT = [
    '🎁 一等奖',
    '🎈 二等奖',
    '🍬 三等奖',
    '😀 谢谢参与',
    '🎉 再来一次',
    '⭐ 幸运奖',
    '🎊 神秘奖'
  ].join('\n');

  var items = [];
  var rotation = -Math.PI / 2;   // 当前旋转角（弧度）
  var spinning = false;
  var cssSize  = 400;            // canvas 的 CSS 像素边长
  var lastTickIdx  = -1;
  var lastTickTime = 0;
  var audioCtx = null;

  /* ================= 尺寸 ================= */
  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(160, Math.round(rect.width || 400));
    var dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cssSize = w;
    draw();
  }

  /* ================= 名单 ================= */
  function syncItems() {
    var raw = entriesEl.value.split(/\r?\n/);
    var arr = [];
    for (var i = 0; i < raw.length; i++) {
      var s = raw[i].trim();
      if (s) arr.push(s);
    }
    if (arr.length > 100) {
      arr = arr.slice(0, 100);
      warnEl.textContent = '⚠️ 最多支持 100 个选项，超出部分已忽略';
      warnEl.hidden = false;
    } else {
      warnEl.hidden = true;
    }
    items = arr;
    countEl.textContent = arr.length + ' 项';
    draw();
  }

  /* ================= 颜色 ================= */
  function colorFor(i, n) {
    var hue = (i * 360 / Math.max(n, 1) + 12) % 360;
    var sat = 58 + (i % 3) * 8;
    var lig = 48 + (i % 2) * 6;
    return 'hsl(' + hue.toFixed(0) + ',' + sat + '%,' + lig + '%)';
  }

  /* ================= 绘制 ================= */
  function draw() {
    var size = cssSize;
    var cx = size / 2;
    var cy = size / 2;
    var r  = size / 2 - 6;
    var n  = items.length;

    ctx.clearRect(0, 0, size, size);

    // 外圈底色
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e2d3b4';
    ctx.fill();

    if (n === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(10, r - 4), 0, Math.PI * 2);
      ctx.fillStyle = '#f9f3e3';
      ctx.fill();
      ctx.fillStyle = '#8a7a5f';
      ctx.font = '600 15px "LXGW WenKai", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('请先在左侧输入选项', cx, cy);
      return;
    }

    var seg = Math.PI * 2 / n;

    // 扇形
    for (var i = 0; i < n; i++) {
      var a0 = rotation + i * seg;
      var a1 = a0 + seg;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = colorFor(i, n);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 文字
    var fs = Math.max(9, Math.min(20, 280 / n)) * Math.max(0.75, Math.min(1.35, r / 190));
    fs = Math.min(fs, r * 0.16);
    ctx.font = '600 ' + fs.toFixed(1) + 'px "LXGW WenKai", system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    var maxW = Math.max(r * 0.34, r - fs * 1.9);

    for (var j = 0; j < n; j++) {
      var mid = rotation + (j + 0.5) * seg;
      var label = items[j];

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);

      // 过长截断
      if (ctx.measureText(label).width > maxW) {
        var s = label;
        while (s.length > 1 && ctx.measureText(s + '…').width > maxW) {
          s = s.slice(0, -1);
        }
        label = s + '…';
      }

      var norm = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var flip = norm > Math.PI / 2 && norm < Math.PI * 1.5;

      ctx.fillStyle = '#ffffff';
      if (flip) {
        ctx.rotate(Math.PI);
        ctx.textAlign = 'left';
        ctx.fillText(label, -(r - fs * 0.9), 0);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(label, r - fs * 0.9, 0);
      }
      ctx.restore();
    }

    // 中心圆
    var cr = Math.max(16, r * 0.11);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = '#fdf8ec';
    ctx.fill();
    ctx.strokeStyle = '#d8c8a6';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#8a5a2b';
    ctx.font = '700 ' + Math.max(11, cr * 0.8).toFixed(0) + 'px "LXGW WenKai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO', cx, cy);
  }

  /* ================= 指针当前扇区 ================= */
  function indexAtPointer() {
    var n = items.length;
    if (!n) return -1;
    var seg = Math.PI * 2 / n;
    var a = (-Math.PI / 2 - rotation) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return Math.floor(a / seg) % n;
  }

  /* ================= 音效 ================= */
  function playTick() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1100, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) { /* 忽略 */ }
  }

  /* ================= 抽奖 ================= */
  function spin() {
    if (spinning) return;
    if (items.length < 2) {
      alert('至少需要 2 个选项才能抽奖');
      return;
    }

    var n = items.length;
    var seg = Math.PI * 2 / n;
    var idx = Math.floor(Math.random() * n);
    var pointer = -Math.PI / 2;

    // 让第 idx 个扇形中心停在指针处
    var target = pointer - (idx + 0.5) * seg;
    var currentMod = rotation % (Math.PI * 2);
    var delta = target - currentMod;
    while (delta < 0) delta += Math.PI * 2;

    var spins  = 5 + Math.floor(Math.random() * 3);
    var offset = (Math.random() - 0.5) * seg * 0.55;   // 落点微随机
    var total  = delta + spins * Math.PI * 2 + offset;

    var start = rotation;
    var duration = 4000 + Math.random() * 1000;
    var t0 = performance.now();

    spinning = true;
    spinBtn.disabled = true;
    lastTickIdx = -1;
    lastTickTime = 0;
    resultEl.classList.remove('pop');
    resultText.textContent = '抽奖中…';

    function frame(now) {
      var t = Math.min(1, (now - t0) / duration);
      var e = 1 - Math.pow(1 - t, 4);          // easeOutQuart
      rotation = start + total * e;
      draw();

      var cur = indexAtPointer();
      if (cur !== lastTickIdx && now - lastTickTime > 45 && t < 0.985) {
        lastTickIdx = cur;
        lastTickTime = now;
        if (soundToggleEl.checked) playTick();
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = rotation % (Math.PI * 2);
        spinning = false;
        spinBtn.disabled = false;
        finish(idx);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ================= 收尾 ================= */
  function finish(idx) {
    var winner = items[idx];
    if (!winner) return;

    resultText.textContent = winner;
    resultEl.classList.remove('pop');
    void resultEl.offsetWidth;
    resultEl.classList.add('pop');

    addHistory(winner);

    if (removeWinnerEl.checked) {
      items.splice(idx, 1);
      entriesEl.value = items.join('\n');
      countEl.textContent = items.length + ' 项';
    }

    draw();
  }

  /* ================= 历史 ================= */
  function addHistory(name) {
    if (historyEmpty) historyEmpty.style.display = 'none';

    var li = document.createElement('li');

    var s1 = document.createElement('span');
    s1.className = 'h-name';
    s1.textContent = name;

    var s2 = document.createElement('span');
    s2.className = 'h-time';
    s2.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });

    li.appendChild(s1);
    li.appendChild(s2);

    historyList.insertBefore(li, historyList.firstChild);
    while (historyList.children.length > 50) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  /* ================= 事件 ================= */
  entriesEl.addEventListener('input', syncItems);
  spinBtn.addEventListener('click', spin);
  canvas.addEventListener('click', spin);

  shuffleBtn.addEventListener('click', function () {
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
    entriesEl.value = items.join('\n');
    syncItems();
  });

  resetBtn.addEventListener('click', function () {
    entriesEl.value = DEFAULT_TEXT;
    syncItems();
  });

  clearHistoryBtn.addEventListener('click', function () {
    historyList.innerHTML = '';
    if (historyEmpty) historyEmpty.style.display = '';
  });

  if (window.ResizeObserver) {
    new ResizeObserver(resizeCanvas).observe(canvas);
  } else {
    window.addEventListener('resize', resizeCanvas);
  }

  /* ================= 初始化 ================= */
  entriesEl.value = DEFAULT_TEXT;
  syncItems();
  resizeCanvas();
})();