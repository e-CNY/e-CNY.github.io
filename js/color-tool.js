/* js/color-tool.js */
(function () {
  'use strict';

  /* ================= 工具 ================= */
  function $(id) { return document.getElementById(id); }

  var toastTimer = null;
  function showToast(msg) {
    var el = $('cl-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制 ' + text);
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ 已复制 ' + text);
    } catch (e) { showToast('❌ 复制失败'); }
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ================= 颜色转换核心 ================= */
  function hexToRgb(hex) {
    hex = String(hex || '').replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function h(x) {
      var s = clamp(Math.round(x), 0, 255).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + h(r) + h(g) + h(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d) % 6; break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    var c = (1 - r - k) / (1 - k);
    var m = (1 - g - k) / (1 - k);
    var y = (1 - b - k) / (1 - k);
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  }

  /* 相对亮度 & 对比度 */
  function relativeLuminance(rgb) {
    var a = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function contrastRatio(rgb1, rgb2) {
    var l1 = relativeLuminance(rgb1);
    var l2 = relativeLuminance(rgb2);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /* 色盲模拟 */
  function simulateBlind(rgb, type) {
    var r = rgb.r, g = rgb.g, b = rgb.b;
    var nr, ng, nb;
    if (type === 'protanopia') {
      nr = 0.567 * r + 0.433 * g + 0 * b;
      ng = 0.558 * r + 0.442 * g + 0 * b;
      nb = 0 * r + 0.242 * g + 0.758 * b;
    } else if (type === 'deuteranopia') {
      nr = 0.625 * r + 0.375 * g;
      ng = 0.7 * r + 0.3 * g;
      nb = 0 * r + 0.3 * g + 0.7 * b;
    } else { // tritanopia
      nr = 0.95 * r + 0.05 * g;
      ng = 0 * r + 0.433 * g + 0.567 * b;
      nb = 0 * r + 0.475 * g + 0.525 * b;
    }
    return {
      r: clamp(Math.round(nr), 0, 255),
      g: clamp(Math.round(ng), 0, 255),
      b: clamp(Math.round(nb), 0, 255)
    };
  }

  /* ================= 颜色名称 ================= */
  var NAMED_COLORS = [
    ['black', '#000000'], ['white', '#FFFFFF'],
    ['red', '#FF0000'], ['green', '#008000'],
    ['blue', '#0000FF'], ['yellow', '#FFFF00'],
    ['cyan', '#00FFFF'], ['magenta', '#FF00FF'],
    ['gray', '#808080'], ['silver', '#C0C0C0'],
    ['maroon', '#800000'], ['olive', '#808000'],
    ['lime', '#00FF00'], ['teal', '#008080'],
    ['navy', '#000080'], ['purple', '#800080'],
    ['orange', '#FFA500'], ['pink', '#FFC0CB'],
    ['brown', '#A52A2A'], ['gold', '#FFD700'],
    ['coral', '#FF7F50'], ['crimson', '#DC143C'],
    ['indigo', '#4B0082'], ['salmon', '#FA8072'],
    ['tomato', '#FF6347'], ['violet', '#EE82EE'],
    ['turquoise', '#40E0D0'], ['khaki', '#F0E68C'],
    ['lavender', '#E6E6FA'], ['beige', '#F5F5DC'],
    ['coral', '#FF7F50'], ['orchid', '#DA70D6'],
    ['plum', '#DDA0DD'], ['tan', '#D2B48C'],
    ['wheat', '#F5DEB3'], ['chocolate', '#D2691E'],
    ['skyblue', '#87CEEB'], ['steelblue', '#4682B4'],
    ['forestgreen', '#228B22'], ['seagreen', '#2E8B57']
  ];

  function findClosestName(rgb) {
    var minDist = Infinity;
    var closest = null;
    for (var i = 0; i < NAMED_COLORS.length; i++) {
      var c = hexToRgb(NAMED_COLORS[i][1]);
      var dr = c.r - rgb.r, dg = c.g - rgb.g, db = c.b - rgb.b;
      var dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < minDist) {
        minDist = dist;
        closest = NAMED_COLORS[i];
      }
    }
    // 距离在 60 以内才显示名称，否则太远无意义
    if (minDist < 60) return closest[0];
    return null;
  }

  /* ================= 解析任意颜色输入 ================= */
  function parseColor(input) {
    input = String(input || '').trim();
    if (!input) return null;

    // 命名色
    var lower = input.toLowerCase();
    for (var i = 0; i < NAMED_COLORS.length; i++) {
      if (NAMED_COLORS[i][0].toLowerCase() === lower) {
        return hexToRgb(NAMED_COLORS[i][1]);
      }
    }

    // HEX
    if (/^#?[0-9a-f]{3}$/i.test(input)) {
      var h = input.replace(/^#/, '');
      return hexToRgb(h[0] + h[0] + h[1] + h[1] + h[2] + h[2]);
    }
    if (/^#?[0-9a-f]{6}$/i.test(input)) {
      return hexToRgb(input);
    }

    // rgb()
    var m = input.match(/^rgba?\s*\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
    if (m) {
      return { r: clamp(+m[1], 0, 255), g: clamp(+m[2], 0, 255), b: clamp(+m[3], 0, 255) };
    }

    // hsl()
    m = input.match(/^hsla?\s*\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i);
    if (m) {
      return hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    }

    return null;
  }

  /* ================= 状态 ================= */
  var state = {
    currentRgb: { r: 123, g: 160, b: 91 },
    fg: '#333333',
    bg: '#ffffff',
    history: [],
    favorites: []
  };

  var HISTORY_KEY = 'cl_history_v1';
  var FAV_KEY = 'cl_favorites_v1';
  var THEME_KEY = 'cl_theme_v1';

  /* ================= 主题 ================= */
  var theme = 'light';
  try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
  function applyTheme() {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    $('btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  applyTheme();
  $('btn-theme').addEventListener('click', function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    applyTheme();
  });

  /* ================= 主颜色更新 ================= */
  function applyColor(rgb, silent) {
    if (!rgb) return;
    state.currentRgb = rgb;

    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    var cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    // 大预览
    $('color-preview').style.background = hex;
    $('color-picker').value = hex;

    // 输入框
    if (!silent) {
      $('cl-input').value = hex.toUpperCase();
      $('cl-input').classList.remove('error');
    }

    // 名称
    var name = findClosestName(rgb);
    var nameEl = $('color-name');
    if (name) {
      nameEl.textContent = '🎨 ' + name;
      nameEl.hidden = false;
    } else {
      nameEl.hidden = true;
    }

    // 7 种格式
    var alpha = 1;
    var formats = [
      { label: 'HEX', value: hex.toUpperCase() },
      { label: 'HEX Alpha', value: hex.toUpperCase() + 'FF' },
      { label: 'RGB', value: 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')' },
      { label: 'RGBA', value: 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')' },
      { label: 'HSL', value: 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)' },
      { label: 'HSV', value: 'hsv(' + hsv.h + ', ' + hsv.s + '%, ' + hsv.v + '%)' },
      { label: 'CMYK', value: 'cmyk(' + cmyk.c + '%, ' + cmyk.m + '%, ' + cmyk.y + '%, ' + cmyk.k + '%)' },
      { label: 'CSS 变量', value: '--color: ' + hex + ';' }
    ];

    var formatHtml = '';
    formats.forEach(function (f) {
      formatHtml += '<div class="cl-format-row">' +
        '<span class="cl-format-label">' + f.label + '</span>' +
        '<span class="cl-format-value">' + f.value + '</span>' +
        '<button class="cl-copy-btn" data-copy="' + f.value.replace(/"/g, '&quot;') + '" type="button" title="复制">📋</button>' +
        '</div>';
    });
    $('format-list').innerHTML = formatHtml;

    // 历史记录
    if (!silent) addHistory(hex);

    // 更新所有面板
    renderBlindSimulation(rgb);
    renderSchemes(rgb, hsl);
    renderShades(hsl);

    // WCAG 前景色同步当前颜色（仅当用户初次进入且未手动改过时用默认）
    // 保持不变
  }

  /* ================= 渲染：色盲模拟 ================= */
  function renderBlindSimulation(rgb) {
    var items = [
      { type: 'protanopia', name: '红色盲 (Protanopia)' },
      { type: 'deuteranopia', name: '绿色盲 (Deuteranopia)' },
      { type: 'tritanopia', name: '蓝色盲 (Tritanopia)' }
    ];
    var html = '';
    items.forEach(function (item) {
      var sim = simulateBlind(rgb, item.type);
      var simHex = rgbToHex(sim.r, sim.g, sim.b);
      html += '<div class="cl-blind-item">' +
        '<div class="cl-blind-swatch" style="background:' + simHex + '"></div>' +
        '<div class="cl-blind-body">' +
          '<div class="cl-blind-label">' + item.name + '</div>' +
          '<div class="cl-blind-values">' + simHex.toUpperCase() +
            ' · rgb(' + sim.r + ',' + sim.g + ',' + sim.b + ')' +
          '</div>' +
        '</div>' +
        '<button class="cl-copy-btn" data-copy="' + simHex.toUpperCase() + '" type="button" title="复制">📋</button>' +
        '</div>';
    });
    $('blind-list').innerHTML = html;
  }

  /* ================= 渲染：配色方案 ================= */
  function renderSchemes(rgb, hsl) {
    var schemes = [
      { name: '互补色', angles: [180] },
      { name: '分裂互补', angles: [150, 210] },
      { name: '类似色', angles: [30, -30] },
      { name: '三角配色', angles: [120, 240] },
      { name: '四角配色', angles: [90, 180, 270] }
    ];

    var html = '';
    schemes.forEach(function (scheme) {
      var colors = [rgbToHex(rgb.r, rgb.g, rgb.b)];
      scheme.angles.forEach(function (offset) {
        var newH = (hsl.h + offset + 360) % 360;
        var c = hslToRgb(newH, hsl.s, hsl.l);
        colors.push(rgbToHex(c.r, c.g, c.b));
      });

      html += '<div class="cl-scheme-row">' +
        '<span class="cl-scheme-label">' + scheme.name + '</span>' +
        '<div class="cl-scheme-colors">';
      colors.forEach(function (hex) {
        html += '<div class="cl-scheme-swatch" style="background:' + hex + '" ' +
          'data-hex="' + hex.toUpperCase() + '" title="' + hex.toUpperCase() + '"></div>';
      });
      html += '</div></div>';
    });
    $('scheme-list').innerHTML = html;
  }

  /* ================= 渲染：色阶 ================= */
  function renderShades(hsl) {
    var levels = [5, 15, 25, 35, 45, 50, 60, 70, 80, 90, 95];
    var html = '';
    levels.forEach(function (l) {
      var c = hslToRgb(hsl.h, hsl.s, l);
      var hex = rgbToHex(c.r, c.g, c.b);
      var isDark = l < 50;
      html += '<div class="cl-shade' + (isDark ? ' cl-shade-dark' : '') + '" ' +
        'style="background:' + hex + '" ' +
        'data-hex="' + hex.toUpperCase() + '" title="' + hex.toUpperCase() + '">' +
        '<span class="cl-shade-label">' + l + '</span>' +
        '</div>';
    });
    $('shades').innerHTML = html;
  }

  /* ================= WCAG 对比度 ================= */
  function updateWcag() {
    var fgRgb = hexToRgb(state.fg);
    var bgRgb = hexToRgb(state.bg);
    if (!fgRgb || !bgRgb) return;

    $('fg-hex').textContent = state.fg.toUpperCase();
    $('bg-hex').textContent = state.bg.toUpperCase();

    var demo = $('wcag-demo');
    demo.style.background = state.bg;
    demo.style.color = state.fg;

    var ratio = contrastRatio(fgRgb, bgRgb);

    var grades = [
      { name: 'AA 正常文本 (≥4.5)', threshold: 4.5 },
      { name: 'AA 大文本 (≥3.0)', threshold: 3.0 },
      { name: 'AAA 正常文本 (≥7.0)', threshold: 7.0 },
      { name: 'AAA 大文本 (≥4.5)', threshold: 4.5 }
    ];

    var gradeHtml = '';
    grades.forEach(function (g) {
      var pass = ratio >= g.threshold;
      gradeHtml += '<div class="cl-grade-item">' +
        '<span>' + g.name + '</span>' +
        '<span class="' + (pass ? 'cl-grade-pass' : 'cl-grade-fail') + '">' +
          (pass ? '✅ 通过' : '❌ 未通过') +
        '</span>' +
        '</div>';
    });

    $('wcag-result').innerHTML =
      '<div class="cl-wcag-ratio">' +
        '<div class="cl-wcag-ratio-label">对比度比值</div>' +
        '<div class="cl-wcag-ratio-value">' + ratio.toFixed(2) + ' : 1</div>' +
      '</div>' +
      '<div class="cl-wcag-grade">' + gradeHtml + '</div>';
  }

  /* ================= 图片取色 ================= */
  var imgCanvas = $('img-canvas');
  var imgCtx = null;
  var imgLoaded = false;

  $('img-input').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      showToast('请上传图片文件');
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      // 限制最大宽度
      var maxW = 800;
      var scale = Math.min(1, maxW / img.width);
      imgCanvas.width = Math.round(img.width * scale);
      imgCanvas.height = Math.round(img.height * scale);
      imgCtx = imgCanvas.getContext('2d');
      imgCtx.drawImage(img, 0, 0, imgCanvas.width, imgCanvas.height);
      $('img-canvas-wrap').hidden = false;
      $('img-pick-info').textContent = '将鼠标移到图片上取色';
      imgLoaded = true;
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      showToast('图片加载失败');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  imgCanvas.addEventListener('mousemove', function (e) {
    if (!imgLoaded) return;
    var rect = imgCanvas.getBoundingClientRect();
    var scaleX = imgCanvas.width / rect.width;
    var scaleY = imgCanvas.height / rect.height;
    var x = Math.floor((e.clientX - rect.left) * scaleX);
    var y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= imgCanvas.width || y >= imgCanvas.height) return;

    var pixel = imgCtx.getImageData(x, y, 1, 1).data;
    var rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    // 显示光标
    var cursor = $('img-cursor');
    cursor.hidden = false;
    cursor.style.left = (e.clientX - rect.left) + 'px';
    cursor.style.top = (e.clientY - rect.top) + 'px';

    $('img-pick-info').innerHTML = '🎯 ' + hex.toUpperCase() +
      ' · rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
  });

  imgCanvas.addEventListener('mouseleave', function () {
    $('img-cursor').hidden = true;
  });

  imgCanvas.addEventListener('click', function (e) {
    if (!imgLoaded) return;
    var rect = imgCanvas.getBoundingClientRect();
    var scaleX = imgCanvas.width / rect.width;
    var scaleY = imgCanvas.height / rect.height;
    var x = Math.floor((e.clientX - rect.left) * scaleX);
    var y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= imgCanvas.width || y >= imgCanvas.height) return;
    var pixel = imgCtx.getImageData(x, y, 1, 1).data;
    applyColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
    showToast('✅ 已应用颜色 ' + rgbToHex(pixel[0], pixel[1], pixel[2]).toUpperCase());
  });

  /* ================= 历史 / 收藏 ================= */
  function loadHistory() {
    try {
      state.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') || [];
      state.favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') || [];
    } catch (e) {
      state.history = [];
      state.favorites = [];
    }
  }
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, 30)));
      localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites));
    } catch (e) {}
  }
  function addHistory(hex) {
    hex = hex.toLowerCase();
    // 与最近一条去重
    if (state.history[0] === hex) return;
    state.history = state.history.filter(function (h) { return h !== hex; });
    state.history.unshift(hex);
    if (state.history.length > 30) state.history.length = 30;
    saveHistory();
    updateHistoryCount();
  }
  function toggleFavorite(hex) {
    hex = hex.toLowerCase();
    var idx = state.favorites.indexOf(hex);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
      showToast('已取消收藏');
    } else {
      state.favorites.unshift(hex);
      showToast('⭐ 已收藏');
    }
    saveHistory();
    updateHistoryCount();
    renderDrawerList();
  }
  function updateHistoryCount() {
    $('history-count').textContent = state.history.length;
  }
  function renderDrawerList() {
    var favList = $('fav-list');
    var histList = $('history-list');

    if (state.favorites.length === 0) {
      favList.innerHTML = '<p class="cl-drawer-empty">还没有收藏颜色</p>';
    } else {
      favList.innerHTML = state.favorites.map(function (hex) {
        return '<div class="cl-drawer-item" data-hex="' + hex + '">' +
          '<div class="cl-drawer-swatch" style="background:' + hex + '"></div>' +
          '<span class="cl-drawer-hex">' + hex.toUpperCase() + '</span>' +
          '<button class="cl-drawer-del" data-del-fav="' + hex + '" type="button" title="移除">✕</button>' +
          '</div>';
      }).join('');
    }

    if (state.history.length === 0) {
      histList.innerHTML = '<p class="cl-drawer-empty">还没有历史记录</p>';
    } else {
      histList.innerHTML = state.history.map(function (hex) {
        return '<div class="cl-drawer-item" data-hex="' + hex + '">' +
          '<div class="cl-drawer-swatch" style="background:' + hex + '"></div>' +
          '<span class="cl-drawer-hex">' + hex.toUpperCase() + '</span>' +
          '</div>';
      }).join('');
    }
  }

  /* ================= 事件绑定 ================= */
  // 输入框识别任意格式
  $('cl-input').addEventListener('input', function () {
    var rgb = parseColor(this.value);
    if (rgb) {
      this.classList.remove('error');
      applyColor(rgb);
    } else {
      this.classList.add('error');
    }
  });

  // 颜色拾取器
  $('color-picker').addEventListener('input', function () {
    var rgb = hexToRgb(this.value);
    if (rgb) applyColor(rgb);
  });

  // 复制按钮（全局委托）
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (btn) {
      var text = btn.getAttribute('data-copy');
      if (text) { copyText(text); return; }
    }
    // 配色/色阶色块点击应用
    var swatch = e.target.closest('.cl-scheme-swatch, .cl-shade');
    if (swatch) {
      var hex = swatch.getAttribute('data-hex');
      if (hex) {
        var rgb = hexToRgb(hex);
        if (rgb) {
          applyColor(rgb);
          showToast('已应用 ' + hex);
        }
      }
    }
  });

  // WCAG 前景/背景
  $('fg-color').addEventListener('input', function () {
    state.fg = this.value;
    updateWcag();
  });
  $('bg-color').addEventListener('input', function () {
    state.bg = this.value;
    updateWcag();
  });
  $('btn-swap').addEventListener('click', function () {
    var tmp = state.fg;
    state.fg = state.bg;
    state.bg = tmp;
    $('fg-color').value = state.fg;
    $('bg-color').value = state.bg;
    updateWcag();
  });

  // 随机颜色
  $('btn-random').addEventListener('click', function () {
    var r = Math.floor(Math.random() * 256);
    var g = Math.floor(Math.random() * 256);
    var b = Math.floor(Math.random() * 256);
    applyColor({ r: r, g: g, b: b });
    showToast('🎲 随机颜色 ' + rgbToHex(r, g, b).toUpperCase());
  });

  // 收藏
  $('btn-fav').addEventListener('click', function () {
    var hex = rgbToHex(state.currentRgb.r, state.currentRgb.g, state.currentRgb.b);
    toggleFavorite(hex);
  });

  // 历史抽屉
  $('btn-history').addEventListener('click', function () {
    renderDrawerList();
    $('drawer-backdrop').hidden = false;
    $('drawer').classList.add('open');
  });
  $('drawer-close').addEventListener('click', closeDrawer);
  $('drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('drawer').classList.contains('open')) closeDrawer();
  });
  function closeDrawer() {
    $('drawer-backdrop').hidden = true;
    $('drawer').classList.remove('open');
  }

  // 抽屉中的颜色点击 & 删除
  $('drawer').addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del-fav]');
    if (delBtn) {
      e.stopPropagation();
      var hex = delBtn.getAttribute('data-del-fav');
      var idx = state.favorites.indexOf(hex);
      if (idx >= 0) {
        state.favorites.splice(idx, 1);
        saveHistory();
        renderDrawerList();
        updateHistoryCount();
      }
      return;
    }
    var item = e.target.closest('.cl-drawer-item');
    if (!item) return;
    var h = item.getAttribute('data-hex');
    var rgb = hexToRgb(h);
    if (rgb) {
      applyColor(rgb);
      closeDrawer();
    }
  });

  // 清空历史
  $('clear-history').addEventListener('click', function () {
    if (!confirm('清空全部历史记录？收藏不受影响')) return;
    state.history = [];
    saveHistory();
    updateHistoryCount();
    renderDrawerList();
    showToast('已清空历史');
  });

  /* ================= 初始化 ================= */
  loadHistory();
  updateHistoryCount();

  // 初始颜色
  applyColor(state.currentRgb, true);
  $('cl-input').value = rgbToHex(state.currentRgb.r, state.currentRgb.g, state.currentRgb.b).toUpperCase();

  // WCAG 初始
  updateWcag();

})();