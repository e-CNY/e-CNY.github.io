/* js/seal.js */
(function () {
  'use strict';

  /* ============ 字体栈 ============ */
  var FONTS = {
    kai:  '"楷体", KaiTi, STKaiti, "Kaiti SC", "LXGW WenKai", serif',
    song: '"宋体", SimSun, STSong, "Songti SC", "LXGW WenKai", serif',
    hei:  '"黑体", SimHei, STHei, "Heiti SC", "Microsoft YaHei", sans-serif',
    li:   '"隶书", LiSu, STLiti, "Lisu SC", KaiTi, "LXGW WenKai", serif',
    yuan: '"幼圆", YouYuan, "Yuanti SC", "Microsoft YaHei", "LXGW WenKai", sans-serif'
  };

  /* ============ 状态 ============ */
  var state = {
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

  /* ============ 绘制核心 ============ */
  function renderSeal(ctx, size) {
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

    /* ============ 5. 做旧效果 ============ */
    if (state.aging > 0) {
      applyAging(ctx, size, state.aging);
    }
  }

  /* ---------- 通用形状路径 ---------- */
  function drawShapePath(ctx, cx, cy, rx, ry, isSquare) {
    ctx.beginPath();
    if (isSquare) {
      var side = Math.min(rx, ry) * 2;
      var r = side * 0.04;
      // 圆角方形
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

    // 计算跨度
    var totalSpan = Math.min(4.2, n * 0.4 + 1.2);
    var startAngle = 3 * Math.PI / 2 - totalSpan / 2;

    // 字号（按平均半径和弧长估算）
    var avgR = Math.min(rx, ry);
    var deltaAngle = n > 1 ? totalSpan / (n - 1) : 0;
    var autoFontSize = n > 1 ? avgR * deltaAngle * 0.62 : avgR * 0.45;
    autoFontSize = Math.min(autoFontSize, avgR * 0.55);

    var fontSize = autoFontSize * state.fontScale;

    // 字符中心圆半径，保证字不超出内圈
    var textRX = rx - fontSize / 2 - rx * 0.02;
    var textRY = ry - fontSize / 2 - ry * 0.02;

    // 如果五角星较大，需要让文字圆半径更大一些避免重叠
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

      // 旋转角度：字符"上"指向外侧
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

    // 自动缩小保证单行放得下
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

    // 垂直居中的位置：考虑五角星
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

    // 五角星较大时下移
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
    // 防止贴边框
    var maxY = cy + ry - fontSize * 0.9;
    if (y > maxY) y = maxY;

    ctx.fillText(text, cx, y);
    ctx.restore();
  }

  /* ---------- 做旧效果 ---------- */
  function applyAging(ctx, size, level) {
    var densities = [0, 0.0004, 0.0012, 0.0032];
    var density = densities[level] || 0;
    var count = Math.floor(size * size * density);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';

    // 细密噪点
    for (var i = 0; i < count; i++) {
      var x = Math.random() * size;
      var y = Math.random() * size;
      var r = Math.random() * size * 0.0025 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 稍大的斑块
    var bigCount = Math.floor(count * 0.05);
    for (var j = 0; j < bigCount; j++) {
      var bx = Math.random() * size;
      var by = Math.random() * size;
      var br = Math.random() * size * 0.012 + 1;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ============ 预览 ============ */
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
    renderSeal(ctx, cssSize);
  }

  /* ============ 导出 ============ */
  function exportPNG() {
    var outSize = parseInt(exportSizeEl.value, 10) || 512;
    var off = document.createElement('canvas');
    off.width = outSize;
    off.height = outSize;
    var ctx = off.getContext('2d');
    renderSeal(ctx, outSize);

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
    drawPreview();
  });

  /* 副文字 */
  subTextEl.addEventListener('input', function () {
    state.subText = subTextEl.value;
    drawPreview();
  });

  /* 字体 */
  fontSelect.addEventListener('change', function () {
    state.font = fontSelect.value;
    drawPreview();
  });

  /* 字号 */
  fontScaleEl.addEventListener('input', function () {
    state.fontScale = parseFloat(fontScaleEl.value) || 1;
    fontScaleVal.textContent = state.fontScale.toFixed(2) + '×';
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
      drawPreview();
    });
  });

  /* 自定义颜色 */
  colorPicker.addEventListener('input', function () {
    state.color = colorPicker.value;
    document.querySelectorAll('.swatch').forEach(function (s) {
      s.classList.remove('active');
    });
    drawPreview();
  });

  /* 旋转 */
  rotationEl.addEventListener('input', function () {
    state.rotation = parseFloat(rotationEl.value) || 0;
    rotationVal.textContent = state.rotation + '°';
    drawPreview();
  });

  /* 导出 */
  downloadBtn.addEventListener('click', exportPNG);

  /* 尺寸变化重绘 */
  if (window.ResizeObserver) {
    new ResizeObserver(drawPreview).observe(canvas);
  } else {
    window.addEventListener('resize', drawPreview);
  }

  /* ============ 初始化 ============ */
  function init() {
    // 高亮初始颜色
    document.querySelectorAll('.swatch').forEach(function (s) {
      s.classList.toggle('active', s.dataset.color === state.color);
    });
    textLenEl.textContent = Array.from(state.text).length + ' / 20';
    fontScaleVal.textContent = state.fontScale.toFixed(2) + '×';
    rotationVal.textContent = state.rotation + '°';
    drawPreview();
  }

  // 字体加载后再重绘一次（避免某些字体延迟加载）
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(drawPreview);
  }

  init();
})();