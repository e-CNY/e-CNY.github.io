/* js/seal.js */
(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ============ 字体栈 ============ */
  var FONTS = {
    kai:  '"楷体", KaiTi, STKaiti, "Kaiti SC", "LXGW WenKai", serif',
    song: '"宋体", SimSun, STSong, "Songti SC", "LXGW WenKai", serif',
    hei:  '"黑体", SimHei, STHei, "Heiti SC", "Microsoft YaHei", sans-serif',
    li:   '"隶书", LiSu, STLiti, "Lisu SC", KaiTi, "LXGW WenKai", serif',
    yuan: '"幼圆", YouYuan, "Yuanti SC", "Microsoft YaHei", "LXGW WenKai", sans-serif'
  };

  /* ============ 默认状态 ============ */
  var defaultState = {
    shape: 'circle',
    text: '华夏科技有限公司',
    subText: '合同专用章',
    layout: 'arc',
    font: 'kai',
    fontScale: 1.0,
    color: '#c8202a',
    star: 'medium',
    border: 'double',
    aging: 0,
    rotation: 0
  };

  var state = JSON.parse(JSON.stringify(defaultState));
  var STORAGE_KEY = 'seal_config_v2';

  // 读取本地缓存
  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        // 合并配置，防止旧版本缺失字段
        for (var key in defaultState) {
          if (parsed[key] !== undefined) state[key] = parsed[key];
        }
      }
    } catch(e) {}
  }

  // 保存状态
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  /* ============ DOM ============ */
  var canvas       = document.getElementById('sealCanvas');
  var mainTextEl   = document.getElementById('mainText');
  var subTextEl    = document.getElementById('subText');
  var fontSelect   = document.getElementById('fontSelect');
  var fontScaleEl  = document.getElementById('fontScale');
  var fontScaleVal = document.getElementById('fontScaleVal');
  var colorPicker  = document.getElementById('colorPicker');
  var rotationEl   = document.getElementById('rotation');
  var rotationVal  = document.getElementById('rotationVal');
  var textLenEl    = document.getElementById('textLen');
  var exportSizeEl = document.getElementById('exportSize');
  var downloadBtn  = document.getElementById('downloadBtn');
  var layoutGroup  = document.getElementById('layoutGroup');
  var canvasWrap   = document.getElementById('canvasWrap');

  /* ============ 绘制核心 ============ */
  // 伪随机数生成器 (基于坐标，保证同一位置的值固定)
  function pseudoRandom(x, y, seed) {
    var sin = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return sin - Math.floor(sin);
  }

  function renderSeal(ctx, size, seed) {
    ctx.clearRect(0, 0, size, size);

    var cx = size / 2;
    var cy = size / 2;
    var color = state.color;
    var isCircle = state.shape === 'circle';
    var isSquare = state.shape === 'square';
    var isEllipse = state.shape === 'ellipse';

    var pad = size * 0.045;
    var outerRX, outerRY;

    if (isEllipse) {
      outerRX = size * 0.46;
      outerRY = size * 0.33;
    } else {
      outerRX = outerRY = size / 2 - pad;
    }

    var borderWidth = size * 0.018;
    var gapInside = size * 0.025;
    var doubleGap = size * 0.012;

    var innerRX = outerRX - borderWidth - gapInside - (state.border === 'double' ? borderWidth + doubleGap : 0);
    var innerRY = outerRY - borderWidth - gapInside - (state.border === 'double' ? borderWidth + doubleGap : 0);

    /* 应用旋转微调 */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((state.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    /* ============ 1. 边框 ============ */
    if (state.border !== 'none') {
      // 外框
      ctx.lineWidth = borderWidth;
      drawShapePath(ctx, cx, cy, outerRX, outerRY, isSquare);
      ctx.stroke();

      // 内框（双圈时）
      if (state.border === 'double') {
        var innerBorderRX = outerRX - borderWidth - doubleGap;
        var innerBorderRY = outerRY - borderWidth - doubleGap;
        if (isSquare) {
          innerBorderRX = innerBorderRY = Math.min(innerBorderRX, innerBorderRY);
        }
        drawShapePath(ctx, cx, cy, innerBorderRX, innerBorderRY, isSquare);
        ctx.stroke();
      }
    }

    /* ============ 2. 五角星 ============ */
    var starRadius = 0;
    if (state.star !== 'none') {
      var starRatios = { small: 0.07, medium: 0.10, large: 0.13 };
      starRadius = size * (starRatios[state.star] || 0.10);
      drawStar(ctx, cx, cy, starRadius, color);
    }

    /* ============ 3. 主文字 ============ */
    var layout = state.layout;
    // 如果当前是方形，且设置为环形，强制降级为横排
    if (isSquare && layout === 'arc') layout = 'horizontal';

    if (layout === 'arc') {
      drawArcText(ctx, cx, cy, innerRX, innerRY, starRadius, color, size);
    } else if (layout === 'horizontal') {
      drawHorizontalText(ctx, cx, cy, innerRX, innerRY, starRadius, color, size);
    } else {
      drawVerticalText(ctx, cx, cy, innerRX, innerRY, starRadius, color, size);
    }

    /* ============ 4. 副文字 ============ */
    if (state.subText.trim()) {
      drawSubText(ctx, cx, cy, innerRX, innerRY, color, size);
    }

    ctx.restore();

    /* ============ 5. 真实印油质感与做旧 ============ */
    applyRealisticInk(ctx, size, seed);

    if (state.aging > 0) {
      applyAging(ctx, size, state.aging, seed);
    }
  }

  /* ---------- 通用形状路径 ---------- */
  function drawShapePath(ctx, cx, cy, rx, ry, isSquare) {
    ctx.beginPath();
    if (isSquare) {
      var side = Math.min(rx, ry) * 2;
      var r = side * 0.04;
      ctx.moveTo(cx - side / 2 + r, cy - side / 2);
      ctx.lineTo(cx + side / 2 - r, cy - side / 2);
      ctx.quadraticCurveTo(cx + side / 2, cy - side / 2, cx + side / 2, cy - side / 2 + r);
      ctx.lineTo(cx + side / 2, cy + side / 2 - r);
      ctx.quadraticCurveTo(cx + side / 2, cy + side / 2, cx + side / 2 - r, cy + side / 2);
      ctx.lineTo(cx - side / 2 + r, cy + side / 2);
      ctx.quadraticCurveTo(cx - side / 2, cy + side / 2, cx - side / 2, cy + side / 2 - r);
      ctx.lineTo(cx - side / 2, cy - side / 2 + r);
      ctx.quadraticCurveTo(cx - side / 2, cy - side / 2, cx - side / 2 + r, cy - side / 2);
      ctx.closePath();
    } else {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
  }

  /* ---------- 五角星 ---------- */
  function drawStar(ctx, cx, cy, radius, color) {
    var points = 5;
    var outer = radius;
    var inner = radius * 0.382;
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var angle = -Math.PI / 2 + (i * Math.PI) / points;
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ---------- 环形文字 ---------- */
  function drawArcText(ctx, cx, cy, rx, ry, starRadius, color, size) {
    var chars = Array.from(state.text.replace(/\s+/g, ''));
    var n = chars.length;
    if (n === 0) return;

    var totalSpan = Math.min(4.2, n * 0.4 + 1.2);
    var startAngle = 3 * Math.PI / 2 - totalSpan / 2;

    var avgR = Math.min(rx, ry);
    var deltaAngle = n > 1 ? totalSpan / (n - 1) : 0;
    var autoFontSize = n > 1 ? avgR * deltaAngle * 0.62 : avgR * 0.45;
    autoFontSize = Math.min(autoFontSize, avgR * 0.55);

    var fontSize = autoFontSize * state.fontScale;
    var textRX = rx - fontSize / 2 - rx * 0.02;
    var textRY = ry - fontSize / 2 - ry * 0.02;

    if (starRadius > 0) {
      var minR = starRadius + fontSize * 0.7;
      if (textRX < minR) textRX = Math.min(minR, rx - fontSize / 2);
      if (textRY < minR) textRY = Math.min(minR, ry - fontSize / 2);
    }

    ctx.save();
    ctx.font = '700 ' + fontSize.toFixed(1) + 'px ' + FONTS[state.font];
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      var angle = startAngle + totalSpan * t;

      var x = cx + textRX * Math.cos(angle);
      var y = cy + textRY * Math.sin(angle);
      var rot = Math.atan2(ry * Math.cos(angle), -rx * Math.sin(angle));

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- 横排文字 ---------- */
  function drawHorizontalText(ctx, cx, cy, rx, ry, starRadius, color, size) {
    var text = state.text.trim();
    if (!text) return;

    var maxWidth = rx * 1.6;
    var fontSize = size * 0.13 * state.fontScale;
    fontSize = Math.min(fontSize, ry * 0.5);

    ctx.save();
    ctx.font = '700 ' + fontSize + 'px ' + FONTS[state.font];
    var measured = ctx.measureText(text).width;
    if (measured > maxWidth) {
      fontSize = fontSize * (maxWidth / measured);
      ctx.font = '700 ' + fontSize + 'px ' + FONTS[state.font];
    }

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var textY = cy;
    if (starRadius > 0) textY = cy + starRadius + fontSize * 0.6;
    if (textY + fontSize / 2 > cy + ry * 0.7) textY = cy + ry * 0.55;

    ctx.fillText(text, cx, textY);
    ctx.restore();
  }

  /* ---------- 竖排文字 ---------- */
  function drawVerticalText(ctx, cx, cy, rx, ry, starRadius, color, size) {
    var chars = Array.from(state.text.replace(/\s+/g, ''));
    var n = chars.length;
    if (n === 0) return;

    var availableH = ry * 1.5;
    var fontSize = Math.min(size * 0.13 * state.fontScale, availableH / n * 0.92);
    fontSize = Math.min(fontSize, rx * 0.55);

    var lineHeight = fontSize * 1.08;
    var totalH = lineHeight * n;
    var startY = cy - totalH / 2 + lineHeight / 2;

    if (starRadius > 0 && startY - fontSize / 2 < cy - starRadius - fontSize * 0.5) {
      startY = cy + starRadius + fontSize * 0.7 + lineHeight / 2;
    }

    ctx.save();
    ctx.font = '700 ' + fontSize.toFixed(1) + 'px ' + FONTS[state.font];
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < n; i++) {
      var y = startY + i * lineHeight;
      if (y + fontSize / 2 > cy + ry * 0.85) break;
      ctx.fillText(chars[i], cx, y);
    }
    ctx.restore();
  }

  /* ---------- 副文字 ---------- */
  function drawSubText(ctx, cx, cy, rx, ry, color, size) {
    var text = state.subText.trim();
    if (!text) return;

    var maxWidth = rx * 1.5;
    var fontSize = size * 0.062 * state.fontScale;

    ctx.save();
    ctx.font = '700 ' + fontSize + 'px ' + FONTS[state.font];
    var measured = ctx.measureText(text).width;
    if (measured > maxWidth) {
      fontSize = fontSize * (maxWidth / measured);
      ctx.font = '700 ' + fontSize + 'px ' + FONTS[state.font];
    }

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var y = cy + ry * 0.62;
    var maxY = cy + ry - fontSize * 0.9;
    if (y > maxY) y = maxY;

    ctx.fillText(text, cx, y);
    ctx.restore();
  }

  /* ---------- 真实印油质感 (透明度渐变 + 边缘毛刺) ---------- */
  function applyRealisticInk(ctx, size, seed) {
    ctx.save();
    // 1. 制造印油浓淡不均 (覆盖一层半透明的白色，带极细噪点)
    ctx.globalCompositeOperation = 'destination-out';
    
    // 用径向渐变让边缘颜色浅一点，中心深一点
    var gradient = ctx.createRadialGradient(size/2, size/2, size*0.1, size/2, size/2, size*0.5);
    gradient.addColorStop(0, 'rgba(0,0,0,0)'); // 中心完全保留
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.05)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.15)'); // 边缘淡一点
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 2. 边缘毛刺 (专门针对边框和文字边缘，用大颗粒噪点擦拭)
    // 这里用大量大半径的圆去擦除，制造印章盖下时的毛边感
    var spikes = 300;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (var i = 0; i < spikes; i++) {
      var angle = pseudoRandom(i, 1, seed) * Math.PI * 2;
      var dist = size * 0.44 + pseudoRandom(i, 2, seed) * size * 0.06; // 集中在边缘
      var x = size/2 + Math.cos(angle) * dist;
      var y = size/2 + Math.sin(angle) * dist;
      var r = pseudoRandom(i, 3, seed) * size * 0.008 + 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  /* ---------- 固定噪点做旧效果 ---------- */
  function applyAging(ctx, size, level, seed) {
    var densities = [0, 0.0006, 0.0018, 0.0040];
    var density = densities[level] || 0;
    var count = Math.floor(size * size * density);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';

    // 细密噪点 (坐标伪随机固定)
    for (var i = 0; i < count; i++) {
      // 使用 i 和 seed 生成固定的 x y
      var x = pseudoRandom(i, 1, seed) * size;
      var y = pseudoRandom(i, 2, seed) * size;
      var r = pseudoRandom(i, 3, seed) * size * 0.0025 + 0.4;
      
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 大斑块
    var bigCount = Math.floor(count * 0.04);
    for (var j = 0; j < bigCount; j++) {
      var bx = pseudoRandom(j, 11, seed) * size;
      var by = pseudoRandom(j, 12, seed) * size;
      var br = pseudoRandom(j, 13, seed) * size * 0.015 + 1.5;
      
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ============ 预览 ============ */
  // 生成一个固定的种子，保证当前页面生命周期内做旧纹理不变
  var globalSeed = Date.now() % 10000;

  function drawPreview() {
    var dpr = window.devicePixelRatio || 1;
    var cssSize = canvas.clientWidth || 400;
    var pixels = Math.round(cssSize * dpr);
    if (canvas.width !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderSeal(ctx, cssSize, globalSeed);
  }

  /* ============ 导出 ============ */
  function exportPNG() {
    var outSize = parseInt(exportSizeEl.value, 10) || 512;
    var off = document.createElement('canvas');
    off.width = outSize;
    off.height = outSize;
    var ctx = off.getContext('2d');
    renderSeal(ctx, outSize, globalSeed);

    off.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var d = new Date();
      var ts = d.getFullYear()
        + String(d.getMonth() + 1).padStart(2, '0')
        + String(d.getDate()).padStart(2, '0')
        + '_' + String(d.getHours()).padStart(2, '0')
        + String(d.getMinutes()).padStart(2, '0')
        + String(d.getSeconds()).padStart(2, '0');
      a.href = url;
      a.download = 'seal_' + ts + '_' + outSize + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      showToast('印章已下载');
    }, 'image/png');
  }

  /* ============ 事件绑定 ============ */
  function bindSeg(segId, key, onUpdate) {
    var el = document.getElementById(segId);
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-value]');
      if (!btn) return;
      Array.prototype.forEach.call(el.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      var v = btn.dataset.value;
      state[key] = (key === 'aging') ? parseInt(v, 10) : v;
      if (onUpdate) onUpdate(v);
      saveState();
      drawPreview();
    });
  }

  /* 形状 */
  bindSeg('shapeSeg', 'shape', function () {
    // 方形时自动切横排
    if (state.shape === 'square' && state.layout === 'arc') {
      state.layout = 'horizontal';
      Array.prototype.forEach.call(
        document.getElementById('layoutSeg').children,
        function (b) { b.classList.toggle('active', b.dataset.value === 'horizontal'); }
      );
    }
    // 如果是圆形/椭圆，且当前是横排，且用户之前是方形切过来的，可以自动切回环形，但尊重用户选择
    layoutGroup.style.opacity = (state.shape === 'square') ? '.55' : '1';
  });

  /* 文字排版 */
  bindSeg('layoutSeg', 'layout');

  /* 五角星 */
  bindSeg('starSeg', 'star');

  /* 边框 */
  bindSeg('borderSeg', 'border');

  /* 做旧 */
  bindSeg('agingSeg', 'aging');

  /* 主文字 */
  mainTextEl.addEventListener('input', function () {
    state.text = mainTextEl.value;
    textLenEl.textContent = Array.from(state.text).length + ' / 20';
    saveState();
    drawPreview();
  });

  /* 副文字 */
  subTextEl.addEventListener('input', function () {
    state.subText = subTextEl.value;
    saveState();
    drawPreview();
  });

  /* 字体 */
  fontSelect.addEventListener('change', function () {
    state.font = fontSelect.value;
    saveState();
    drawPreview();
  });

  /* 字号 */
  fontScaleEl.addEventListener('input', function () {
    state.fontScale = parseFloat(fontScaleEl.value) || 1;
    fontScaleVal.textContent = state.fontScale.toFixed(2) + '×';
    saveState();
    drawPreview();
  });

  /* 颜色预设 */
  Array.prototype.forEach.call(document.querySelectorAll('.swatch'), function (btn) {
    btn.addEventListener('click', function () {
      var c = btn.dataset.color;
      state.color = c;
      colorPicker.value = c;
      document.querySelectorAll('.swatch').forEach(function (s) {
        s.classList.toggle('active', s === btn);
      });
      saveState();
      drawPreview();
    });
  });

  /* 自定义颜色 */
  colorPicker.addEventListener('input', function () {
    state.color = colorPicker.value;
    document.querySelectorAll('.swatch').forEach(function (s) {
      s.classList.remove('active');
    });
    saveState();
    drawPreview();
  });

  /* 旋转 */
  rotationEl.addEventListener('input', function () {
    state.rotation = parseFloat(rotationEl.value) || 0;
    rotationVal.textContent = state.rotation + '°';
    saveState();
    drawPreview();
  });

  /* 导出 */
  downloadBtn.addEventListener('click', exportPNG);

  /* 恢复默认 */
  document.getElementById('btn-reset').addEventListener('click', function () {
    if (confirm('确定要恢复所有默认设置吗？')) {
      state = JSON.parse(JSON.stringify(defaultState));
      localStorage.removeItem(STORAGE_KEY);
      globalSeed = Date.now() % 10000; // 重新生成噪点
      syncUI();
      drawPreview();
      showToast('已恢复默认设置');
    }
  });

  /* 预览背景切换 */
  document.querySelectorAll('.bg-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.bg-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      
      canvasWrap.className = 'canvas-wrap bg-' + this.dataset.bg;
    });
  });

  /* 尺寸变化重绘 */
  if (window.ResizeObserver) {
    new ResizeObserver(drawPreview).observe(canvas);
  } else {
    window.addEventListener('resize', drawPreview);
  }

  /* ============ 初始化 ============ */
  function syncUI() {
    // 输入框
    mainTextEl.value = state.text;
    subTextEl.value = state.subText;
    textLenEl.textContent = Array.from(state.text).length + ' / 20';
    
    fontSelect.value = state.font;
    fontScaleEl.value = state.fontScale;
    fontScaleVal.textContent = state.fontScale.toFixed(2) + '×';
    
    colorPicker.value = state.color;
    document.querySelectorAll('.swatch').forEach(function (s) {
      s.classList.toggle('active', s.dataset.color === state.color);
    });

    rotationEl.value = state.rotation;
    rotationVal.textContent = state.rotation + '°';

    // 按钮组
    function setSeg(segId, value) {
      Array.prototype.forEach.call(document.getElementById(segId).children, function (b) {
        b.classList.toggle('active', b.dataset.value === String(value));
      });
    }
    setSeg('shapeSeg', state.shape);
    setSeg('layoutSeg', state.layout);
    setSeg('starSeg', state.star);
    setSeg('borderSeg', state.border);
    setSeg('agingSeg', state.aging);

    layoutGroup.style.opacity = (state.shape === 'square') ? '.55' : '1';
  }

  function init() {
    loadState();
    syncUI();
    drawPreview();
    showToast('配置已加载');
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(drawPreview);
  }

  init();
})();