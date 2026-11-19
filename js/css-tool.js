/* js/css-tool.js */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  /* ================= 通用工具 ================= */
  var toastTimer = null;
  function showToast(msg) {
    var el = $('cs-toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (!text) { showToast('没有可复制的内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制');
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
      showToast('✅ 已复制');
    } catch (e) { showToast('❌ 复制失败'); }
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function randomHex() {
    return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  }

  /* ================= 主题 ================= */
  var THEME_KEY = 'cs_theme_v1';
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

  /* ================= Tabs ================= */
  var tabs = document.querySelectorAll('.cs-tab');
  var panels = document.querySelectorAll('.cs-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var target = $(tab.dataset.target);
      if (target) target.classList.add('active');
    });
  });

  /* ================= 复制按钮 ================= */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.cs-copy-btn');
    if (!btn) return;
    var targetId = btn.dataset.target;
    var target = $(targetId);
    if (target) {
      copyText(target.value);
    }
  });

  /* ================= 收藏 / 历史 ================= */
  var FAV_KEY = 'cs_fav_v1';
  var HISTORY_KEY = 'cs_history_v1';
  var favorites = [];
  var history = [];
  try {
    favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') || [];
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') || [];
  } catch (e) {}

  function saveFav() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites.slice(0, 50))); } catch (e) {}
  }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30))); } catch (e) {}
  }
  function updateHistoryCount() {
    $('history-count').textContent = history.length;
  }

  function addHistory(code) {
    if (!code) return;
    history = history.filter(function (h) { return h !== code; });
    history.unshift(code);
    if (history.length > 30) history.length = 30;
    saveHistory();
    updateHistoryCount();
  }

  function renderDrawer() {
    var favList = $('fav-list');
    var histList = $('history-list');
    if (favorites.length === 0) {
      favList.innerHTML = '<p class="cs-drawer-empty">暂无收藏</p>';
    } else {
      favList.innerHTML = favorites.map(function (code, i) {
        return '<div class="cs-drawer-item" data-code-idx="' + i + '">' +
          escHtml(code) +
          '<button class="cs-drawer-del" data-del-fav="' + i + '" type="button">✕</button>' +
          '</div>';
      }).join('');
    }
    if (history.length === 0) {
      histList.innerHTML = '<p class="cs-drawer-empty">暂无历史</p>';
    } else {
      histList.innerHTML = history.map(function (code, i) {
        return '<div class="cs-drawer-item" data-code-idx="' + i + '">' + escHtml(code) + '</div>';
      }).join('');
    }
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function openDrawer() {
    renderDrawer();
    $('drawer-backdrop').hidden = false;
    $('drawer').classList.add('open');
  }
  function closeDrawer() {
    $('drawer-backdrop').hidden = true;
    $('drawer').classList.remove('open');
  }
  $('btn-history').addEventListener('click', openDrawer);
  $('drawer-close').addEventListener('click', closeDrawer);
  $('drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('drawer').classList.contains('open')) closeDrawer();
  });

  $('clear-history').addEventListener('click', function () {
    if (!confirm('清空全部历史记录？收藏不受影响')) return;
    history = [];
    saveHistory();
    updateHistoryCount();
    renderDrawer();
    showToast('已清空历史');
  });

  // 抽屉内的收藏/历史点击和删除
  $('drawer').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-fav]');
    if (del) {
      e.stopPropagation();
      var di = parseInt(del.dataset.delFav, 10);
      if (!isNaN(di)) {
        favorites.splice(di, 1);
        saveFav();
        renderDrawer();
      }
      return;
    }
    var item = e.target.closest('.cs-drawer-item');
    if (!item) return;
    // 简单复制该 CSS
    var text = item.textContent.replace(/✕\s*$/, '').trim();
    copyText(text);
    closeDrawer();
  });

  // 收藏当前 CSS
  $('btn-fav').addEventListener('click', function () {
    var activePanel = document.querySelector('.cs-panel.active');
    if (!activePanel) return;
    var codeEl = activePanel.querySelector('.cs-code');
    if (!codeEl || !codeEl.value.trim()) { showToast('当前没有可收藏的 CSS'); return; }
    var code = codeEl.value.trim();
    if (favorites.indexOf(code) >= 0) { showToast('已收藏过了'); return; }
    favorites.unshift(code);
    if (favorites.length > 50) favorites.length = 50;
    saveFav();
    addHistory(code);
    showToast('⭐ 已收藏');
  });

  /* ================= 阴影 ================= */
  var shadowLayers = [
    { x: 10, y: 10, blur: 20, spread: 0, color: '#000000', opacity: 0.2, inset: false }
  ];

  function renderShadowLayers() {
    var container = $('shadow-layers');
    var html = '';
    shadowLayers.forEach(function (l, i) {
      html += '<div class="cs-layer">' +
        '<div class="cs-layer-head">' +
          '<span>层 ' + (i + 1) + (l.inset ? ' (内阴影)' : '') + '</span>' +
          (shadowLayers.length > 1 ?
            '<button class="cs-layer-del" data-del-shadow="' + i + '" type="button">✕</button>' : '') +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label>X</label><input type="number" data-shadow-x="' + i + '" value="' + l.x + '">' +
          '<label>Y</label><input type="number" data-shadow-y="' + i + '" value="' + l.y + '">' +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label>模糊</label><input type="number" data-shadow-blur="' + i + '" value="' + l.blur + '" min="0">' +
          '<label>扩散</label><input type="number" data-shadow-spread="' + i + '" value="' + l.spread + '">' +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label>颜色</label><input type="color" data-shadow-color="' + i + '" value="' + l.color + '">' +
          '<input type="range" data-shadow-opacity="' + i + '" min="0" max="1" step="0.05" value="' + l.opacity + '">' +
          '<span class="cs-val">' + l.opacity + '</span>' +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label style="min-width:auto;"><input type="checkbox" data-shadow-inset="' + i + '" ' + (l.inset ? 'checked' : '') + '> 内阴影</label>' +
        '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function updateShadow() {
    var parts = shadowLayers.map(function (l) {
      return (l.inset ? 'inset ' : '') +
        l.x + 'px ' + l.y + 'px ' + l.blur + 'px ' + l.spread + 'px ' +
        hexToRgba(l.color, l.opacity);
    });
    var value = parts.join(', ');
    $('preview-shadow').style.boxShadow = value;
    $('code-shadow').value = 'box-shadow: ' + value + ';';
    addHistory($('code-shadow').value);
  }

  function bindShadowLayerEvents() {
    // 输入事件委托
    $('shadow-layers').addEventListener('input', function (e) {
      var el = e.target;
      if (el.matches('[data-shadow-x]')) shadowLayers[+el.dataset.shadowX].x = parseInt(el.value) || 0;
      else if (el.matches('[data-shadow-y]')) shadowLayers[+el.dataset.shadowY].y = parseInt(el.value) || 0;
      else if (el.matches('[data-shadow-blur]')) shadowLayers[+el.dataset.shadowBlur].blur = Math.max(0, parseInt(el.value) || 0);
      else if (el.matches('[data-shadow-spread]')) shadowLayers[+el.dataset.shadowSpread].spread = parseInt(el.value) || 0;
      else if (el.matches('[data-shadow-color]')) shadowLayers[+el.dataset.shadowColor].color = el.value;
      else if (el.matches('[data-shadow-opacity]')) {
        shadowLayers[+el.dataset.shadowOpacity].opacity = parseFloat(el.value);
        var lbl = el.nextElementSibling;
        if (lbl) lbl.textContent = el.value;
      }
      else if (el.matches('[data-shadow-inset]')) {
        shadowLayers[+el.dataset.shadowInset].inset = el.checked;
        renderShadowLayers();
      }
      else return;
      updateShadow();
    });
    // 删除
    $('shadow-layers').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-del-shadow]');
      if (!btn) return;
      var i = parseInt(btn.dataset.delShadow, 10);
      if (!isNaN(i) && shadowLayers.length > 1) {
        shadowLayers.splice(i, 1);
        renderShadowLayers();
        updateShadow();
      }
    });
  }

  $('btn-add-shadow').addEventListener('click', function () {
    if (shadowLayers.length >= 5) { showToast('最多 5 层'); return; }
    shadowLayers.push({ x: 0, y: 4, blur: 12, spread: 0, color: '#000000', opacity: 0.15, inset: false });
    renderShadowLayers();
    updateShadow();
  });

  // 背景切换
  $('shadow-bg-picker').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-bg]');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    $('shadow-preview-bg').style.background = btn.dataset.bg;
  });
  $('shadow-bg-custom').addEventListener('input', function () {
    $('shadow-preview-bg').style.background = this.value;
    Array.prototype.forEach.call($('shadow-bg-picker').querySelectorAll('button'), function (b) {
      b.classList.remove('active');
    });
  });

  /* ================= 圆角 ================= */
  var rdUnit = 'px';
  var rdLocked = true;
  function updateRadius() {
    var unit = rdUnit;
    var tl = parseInt($('rd-tl').value) || 0;
    var tr = parseInt($('rd-tr').value) || 0;
    var bl = parseInt($('rd-bl').value) || 0;
    var br = parseInt($('rd-br').value) || 0;
    var value = tl + unit + ' ' + tr + unit + ' ' + br + unit + ' ' + bl + unit;
    $('preview-radius').style.borderRadius = value;
    $('code-radius').value = 'border-radius: ' + value + ';';
    $('val-rd-tl').textContent = tl + unit;
    $('val-rd-tr').textContent = tr + unit;
    $('val-rd-bl').textContent = bl + unit;
    $('val-rd-br').textContent = br + unit;
    $('val-rd-all').textContent = tl + unit;
    addHistory($('code-radius').value);
  }

  ['rd-all', 'rd-tl', 'rd-tr', 'rd-bl', 'rd-br'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var v = parseInt(el.value) || 0;
      if (id === 'rd-all' || rdLocked) {
        // 同步四角
        if (rdLocked) {
          $('rd-tl').value = v; $('rd-tr').value = v;
          $('rd-bl').value = v; $('rd-br').value = v;
        }
      }
      updateRadius();
    });
  });

  $('rd-unit').addEventListener('change', function () {
    rdUnit = this.value;
    updateRadius();
  });

  $('rd-lock').addEventListener('click', function () {
    rdLocked = !rdLocked;
    this.textContent = rdLocked ? '🔓 锁定' : '🔒 已锁定';
  });

  /* ================= 渐变 ================= */
  var grType = 'linear';
  var grShape = 'circle';
  var grColors = [
    { color: '#8a5a2b', pos: 0 },
    { color: '#7ba05b', pos: 100 }
  ];

  function renderGradientColors() {
    var container = $('gr-colors');
    var html = '';
    grColors.forEach(function (c, i) {
      html += '<div class="cs-layer">' +
        '<div class="cs-layer-head">' +
          '<span>颜色 ' + (i + 1) + '</span>' +
          (grColors.length > 2 ?
            '<button class="cs-layer-del" data-del-grcolor="' + i + '" type="button">✕</button>' : '') +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<input type="color" data-gr-color="' + i + '" value="' + c.color + '">' +
          '<input type="range" data-gr-pos="' + i + '" min="0" max="100" value="' + c.pos + '">' +
          '<span class="cs-val">' + c.pos + '%</span>' +
        '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function updateGradient() {
    var angle = parseInt($('gr-angle').value) || 0;
    var colorStr = grColors.map(function (c) { return c.color + ' ' + c.pos + '%'; }).join(', ');
    var value;
    if (grType === 'linear') {
      value = 'linear-gradient(' + angle + 'deg, ' + colorStr + ')';
    } else if (grType === 'radial') {
      value = 'radial-gradient(' + grShape + ', ' + colorStr + ')';
    } else {
      value = 'conic-gradient(from ' + angle + 'deg, ' + colorStr + ')';
    }
    $('preview-gradient').style.background = value;
    $('code-gradient').value = 'background: ' + value + ';';
    $('val-gr-angle').textContent = angle + '°';
    addHistory($('code-gradient').value);
  }

  $('gr-angle').addEventListener('input', updateGradient);
  $('gr-add-color').addEventListener('click', function () {
    if (grColors.length >= 5) { showToast('最多 5 种颜色'); return; }
    grColors.push({ color: '#ff6b6b', pos: 50 });
    renderGradientColors();
    updateGradient();
  });

  $('gr-type').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-val]');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    grType = btn.dataset.val;
    $('gr-angle-row').hidden = (grType === 'radial');
    $('gr-shape-row').hidden = (grType !== 'radial');
    updateGradient();
  });

  $('gr-shape').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-val]');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    grShape = btn.dataset.val;
    updateGradient();
  });

  $('gr-colors').addEventListener('input', function (e) {
    var el = e.target;
    if (el.matches('[data-gr-color]')) grColors[+el.dataset.grColor].color = el.value;
    else if (el.matches('[data-gr-pos]')) {
      grColors[+el.dataset.grPos].pos = parseInt(el.value) || 0;
      var lbl = el.nextElementSibling;
      if (lbl) lbl.textContent = el.value + '%';
    } else return;
    updateGradient();
  });
  $('gr-colors').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del-grcolor]');
    if (!btn) return;
    var i = parseInt(btn.dataset.delGrcolor, 10);
    if (!isNaN(i) && grColors.length > 2) {
      grColors.splice(i, 1);
      renderGradientColors();
      updateGradient();
    }
  });

  /* ================= 毛玻璃 ================= */
  var glBgPresets = {
    pink: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    blue: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    green: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)'
  };

  function updateGlass() {
    var blur = $('gl-blur').value;
    var op = $('gl-opacity').value;
    var border = $('gl-border').value;
    var sat = $('gl-saturate').value;

    var preview = $('preview-glass');
    preview.style.backdropFilter = 'blur(' + blur + 'px) saturate(' + sat + '%)';
    preview.style.webkitBackdropFilter = 'blur(' + blur + 'px) saturate(' + sat + '%)';
    preview.style.background = 'rgba(255, 255, 255, ' + op + ')';
    preview.style.border = '1px solid rgba(255, 255, 255, ' + border + ')';

    $('val-gl-blur').textContent = blur + 'px';
    $('val-gl-opacity').textContent = op;
    $('val-gl-border').textContent = border;
    $('val-gl-saturate').textContent = sat + '%';

    var code = 'background: rgba(255, 255, 255, ' + op + ');\n' +
      'backdrop-filter: blur(' + blur + 'px) saturate(' + sat + '%);\n' +
      '-webkit-backdrop-filter: blur(' + blur + 'px) saturate(' + sat + '%);\n' +
      'border: 1px solid rgba(255, 255, 255, ' + border + ');\n' +
      'border-radius: 12px;';
    $('code-glass').value = code;
    addHistory(code);
  }

  ['gl-blur', 'gl-opacity', 'gl-border', 'gl-saturate'].forEach(function (id) {
    $(id).addEventListener('input', updateGlass);
  });

  $('gl-bg-preset').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-val]');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    var val = btn.dataset.val;
    if (val === 'upload') {
      $('gl-bg-file').click();
    } else {
      $('gl-bg-area').style.backgroundImage = glBgPresets[val];
      $('gl-bg-area').style.backgroundSize = 'cover';
    }
  });

  $('gl-bg-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    var url = URL.createObjectURL(file);
    $('gl-bg-area').style.backgroundImage = 'url(' + url + ')';
    $('gl-bg-area').style.backgroundSize = 'cover';
    $('gl-bg-area').style.backgroundPosition = 'center';
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  });

  /* ================= 滤镜 ================= */
  function updateFilter() {
    var blur = $('ft-blur').value;
    var gray = $('ft-gray').value;
    var bright = $('ft-bright').value;
    var contrast = $('ft-contrast').value;
    var sat = $('ft-saturate').value;
    var sepia = $('ft-sepia').value;
    var hue = $('ft-hue').value;
    var invert = $('ft-invert').value;

    $('val-ft-blur').textContent = blur + 'px';
    $('val-ft-gray').textContent = gray + '%';
    $('val-ft-bright').textContent = bright + '%';
    $('val-ft-contrast').textContent = contrast + '%';
    $('val-ft-saturate').textContent = sat + '%';
    $('val-ft-sepia').textContent = sepia + '%';
    $('val-ft-hue').textContent = hue + '°';
    $('val-ft-invert').textContent = invert + '%';

    var filterStr = 'blur(' + blur + 'px) ' +
      'grayscale(' + gray + '%) ' +
      'brightness(' + bright + '%) ' +
      'contrast(' + contrast + '%) ' +
      'saturate(' + sat + '%) ' +
      'sepia(' + sepia + '%) ' +
      'hue-rotate(' + hue + 'deg) ' +
      'invert(' + invert + '%)';

    $('preview-filter').style.filter = filterStr;
    $('code-filter').value = 'filter: ' + filterStr + ';';
    addHistory($('code-filter').value);
  }

  ['ft-blur', 'ft-gray', 'ft-bright', 'ft-contrast', 'ft-saturate', 'ft-sepia', 'ft-hue', 'ft-invert'].forEach(function (id) {
    $(id).addEventListener('input', updateFilter);
  });

  /* ================= 变换 ================= */
  var tfOrigin = 'center center';

  function updateTransform() {
    var x = $('tf-x').value;
    var y = $('tf-y').value;
    var rot = $('tf-rotate').value;
    var scale = $('tf-scale').value;
    var skx = $('tf-skewx').value;
    var sky = $('tf-skewy').value;

    $('val-tf-x').textContent = x + 'px';
    $('val-tf-y').textContent = y + 'px';
    $('val-tf-rotate').textContent = rot + '°';
    $('val-tf-scale').textContent = scale;
    $('val-tf-skewx').textContent = skx + '°';
    $('val-tf-skewy').textContent = sky + '°';

    var transformStr = 'translate(' + x + 'px, ' + y + 'px) ' +
      'rotate(' + rot + 'deg) ' +
      'scale(' + scale + ') ' +
      'skew(' + skx + 'deg, ' + sky + 'deg)';

    var preview = $('preview-transform');
    preview.style.transform = transformStr;
    preview.style.transformOrigin = tfOrigin;

    $('code-transform').value = 'transform: ' + transformStr + ';\n' +
      'transform-origin: ' + tfOrigin + ';';
    addHistory($('code-transform').value);
  }

  ['tf-x', 'tf-y', 'tf-rotate', 'tf-scale', 'tf-skewx', 'tf-skewy'].forEach(function (id) {
    $(id).addEventListener('input', updateTransform);
  });

  $('tf-origin').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    tfOrigin = btn.dataset.origin;
    updateTransform();
  });

  /* ================= 文字阴影 ================= */
  var tshadowLayers = [
    { x: 2, y: 2, blur: 4, color: '#000000', opacity: 0.3 }
  ];

  function renderTextShadowLayers() {
    var container = $('tshadow-layers');
    var html = '';
    tshadowLayers.forEach(function (l, i) {
      html += '<div class="cs-layer">' +
        '<div class="cs-layer-head">' +
          '<span>层 ' + (i + 1) + '</span>' +
          (tshadowLayers.length > 1 ?
            '<button class="cs-layer-del" data-del-tshadow="' + i + '" type="button">✕</button>' : '') +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label>X</label><input type="number" data-tshadow-x="' + i + '" value="' + l.x + '">' +
          '<label>Y</label><input type="number" data-tshadow-y="' + i + '" value="' + l.y + '">' +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label>模糊</label><input type="number" data-tshadow-blur="' + i + '" value="' + l.blur + '" min="0">' +
        '</div>' +
        '<div class="cs-layer-row">' +
          '<label>颜色</label><input type="color" data-tshadow-color="' + i + '" value="' + l.color + '">' +
          '<input type="range" data-tshadow-opacity="' + i + '" min="0" max="1" step="0.05" value="' + l.opacity + '">' +
          '<span class="cs-val">' + l.opacity + '</span>' +
        '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function updateTextShadow() {
    var text = $('ts-text').value || 'Hello CSS';
    var parts = tshadowLayers.map(function (l) {
      return l.x + 'px ' + l.y + 'px ' + l.blur + 'px ' + hexToRgba(l.color, l.opacity);
    });
    var value = parts.join(', ');
    $('preview-text-shadow').textContent = text;
    $('preview-text-shadow').style.textShadow = value;
    $('code-text-shadow').value = 'text-shadow: ' + value + ';';
    addHistory($('code-text-shadow').value);
  }

  $('ts-text').addEventListener('input', updateTextShadow);
  $('btn-add-tshadow').addEventListener('click', function () {
    if (tshadowLayers.length >= 4) { showToast('最多 4 层'); return; }
    tshadowLayers.push({ x: 0, y: 4, blur: 8, color: '#8a5a2b', opacity: 0.4 });
    renderTextShadowLayers();
    updateTextShadow();
  });
  $('tshadow-layers').addEventListener('input', function (e) {
    var el = e.target;
    if (el.matches('[data-tshadow-x]')) tshadowLayers[+el.dataset.tshadowX].x = parseInt(el.value) || 0;
    else if (el.matches('[data-tshadow-y]')) tshadowLayers[+el.dataset.tshadowY].y = parseInt(el.value) || 0;
    else if (el.matches('[data-tshadow-blur]')) tshadowLayers[+el.dataset.tshadowBlur].blur = Math.max(0, parseInt(el.value) || 0);
    else if (el.matches('[data-tshadow-color]')) tshadowLayers[+el.dataset.tshadowColor].color = el.value;
    else if (el.matches('[data-tshadow-opacity]')) {
      tshadowLayers[+el.dataset.tshadowOpacity].opacity = parseFloat(el.value);
      var lbl = el.nextElementSibling;
      if (lbl) lbl.textContent = el.value;
    }
    else return;
    updateTextShadow();
  });
  $('tshadow-layers').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del-tshadow]');
    if (!btn) return;
    var i = parseInt(btn.dataset.delTshadow, 10);
    if (!isNaN(i) && tshadowLayers.length > 1) {
      tshadowLayers.splice(i, 1);
      renderTextShadowLayers();
      updateTextShadow();
    }
  });

  /* ================= 文本渐变 ================= */
  function updateTextGrad() {
    var text = $('tg-text').value || 'Gradient Text';
    var angle = $('tg-angle').value;
    var c1 = $('tg-c1').value;
    var c2 = $('tg-c2').value;
    var c3 = $('tg-c3').value;

    var grad = 'linear-gradient(' + angle + 'deg, ' + c1 + ', ' + c2 + ', ' + c3 + ')';
    var el = $('preview-text-grad');
    el.textContent = text;
    el.style.backgroundImage = grad;
    el.style.webkitBackgroundClip = 'text';
    el.style.backgroundClip = 'text';
    el.style.webkitTextFillColor = 'transparent';
    el.style.color = 'transparent';

    $('val-tg-angle').textContent = angle + '°';

    var code = 'background: ' + grad + ';\n' +
      '-webkit-background-clip: text;\n' +
      'background-clip: text;\n' +
      '-webkit-text-fill-color: transparent;\n' +
      'color: transparent;';
    $('code-text-grad').value = code;
    addHistory(code);
  }

  ['tg-text', 'tg-angle', 'tg-c1', 'tg-c2', 'tg-c3'].forEach(function (id) {
    $(id).addEventListener('input', updateTextGrad);
  });

  /* ================= Flex ================= */
  function updateFlex() {
    var dir = document.querySelector('#fl-dir button.active').dataset.val;
    var justify = $('fl-justify').value;
    var align = $('fl-align').value;
    var wrap = document.querySelector('#fl-wrap button.active').dataset.val;
    var gap = $('fl-gap').value;
    var count = parseInt($('fl-count').value, 10);

    $('val-fl-gap').textContent = gap + 'px';
    $('val-fl-count').textContent = count;

    var preview = $('preview-flex');
    preview.style.flexDirection = dir;
    preview.style.justifyContent = justify;
    preview.style.alignItems = align;
    preview.style.flexWrap = wrap;
    preview.style.gap = gap + 'px';

    var itemsHtml = '';
    for (var i = 0; i < count; i++) {
      var label = String.fromCharCode(65 + (i % 26));
      itemsHtml += '<div class="cs-flex-item">' + label + '</div>';
    }
    preview.innerHTML = itemsHtml;

    $('code-flex').value = 'display: flex;\n' +
      'flex-direction: ' + dir + ';\n' +
      'justify-content: ' + justify + ';\n' +
      'align-items: ' + align + ';\n' +
      'flex-wrap: ' + wrap + ';\n' +
      'gap: ' + gap + 'px;';
    addHistory($('code-flex').value);
  }

  $('fl-dir').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    updateFlex();
  });
  $('fl-wrap').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b === btn);
    });
    updateFlex();
  });
  $('fl-justify').addEventListener('change', updateFlex);
  $('fl-align').addEventListener('change', updateFlex);
  $('fl-gap').addEventListener('input', updateFlex);
  $('fl-count').addEventListener('input', updateFlex);

  /* ================= Grid ================= */
  function updateGrid() {
    var cols = $('gd-cols').value;
    var rows = $('gd-rows').value;
    var gap = $('gd-gap').value;
    var count = parseInt($('gd-count').value, 10);

    $('val-gd-cols').textContent = cols;
    $('val-gd-rows').textContent = rows;
    $('val-gd-gap').textContent = gap + 'px';
    $('val-gd-count').textContent = count;

    var preview = $('preview-grid');
    preview.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    preview.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
    preview.style.gap = gap + 'px';

    var itemsHtml = '';
    for (var i = 0; i < count; i++) {
      itemsHtml += '<div class="cs-grid-item">' + (i + 1) + '</div>';
    }
    preview.innerHTML = itemsHtml;

    $('code-grid').value = 'display: grid;\n' +
      'grid-template-columns: repeat(' + cols + ', 1fr);\n' +
      'grid-template-rows: repeat(' + rows + ', 1fr);\n' +
      'gap: ' + gap + 'px;';
    addHistory($('code-grid').value);
  }

  ['gd-cols', 'gd-rows', 'gd-gap', 'gd-count'].forEach(function (id) {
    $(id).addEventListener('input', updateGrid);
  });

  /* ================= 预设 ================= */
  var PRESETS = {
    // 阴影
    'sh-material1': function () { shadowLayers = [{ x: 0, y: 1, blur: 3, spread: 0, color: '#000000', opacity: 0.12, inset: false }, { x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.24, inset: false }]; renderShadowLayers(); updateShadow(); },
    'sh-material3': function () { shadowLayers = [{ x: 0, y: 3, blur: 6, spread: 0, color: '#000000', opacity: 0.16, inset: false }, { x: 0, y: 3, blur: 6, spread: 0, color: '#000000', opacity: 0.23, inset: false }]; renderShadowLayers(); updateShadow(); },
    'sh-card': function () { shadowLayers = [{ x: 0, y: 8, blur: 24, spread: 0, color: '#000000', opacity: 0.12, inset: false }]; renderShadowLayers(); updateShadow(); },
    'sh-dialog': function () { shadowLayers = [{ x: 0, y: 20, blur: 60, spread: -12, color: '#000000', opacity: 0.3, inset: false }]; renderShadowLayers(); updateShadow(); },
    'sh-neon': function () { shadowLayers = [{ x: 0, y: 0, blur: 20, spread: 0, color: '#ff00ff', opacity: 0.8, inset: false }, { x: 0, y: 0, blur: 40, spread: 5, color: '#00ffff', opacity: 0.6, inset: false }]; renderShadowLayers(); updateShadow(); },
    'sh-inset': function () { shadowLayers = [{ x: 0, y: 4, blur: 8, spread: 0, color: '#000000', opacity: 0.2, inset: true }]; renderShadowLayers(); updateShadow(); },
    'sh-layer': function () { shadowLayers = [
      { x: 1, y: 2, blur: 3, spread: 0, color: '#000000', opacity: 0.2, inset: false },
      { x: 2, y: 4, blur: 6, spread: 0, color: '#000000', opacity: 0.2, inset: false },
      { x: 4, y: 8, blur: 12, spread: 0, color: '#000000', opacity: 0.2, inset: false }
    ]; renderShadowLayers(); updateShadow(); },
    // 圆角
    'rd-all': function () { setRadiusAll(20); },
    'rd-pill': function () { setRadiusAll(50); rdUnit = 'px'; $('rd-unit').value = 'px'; updateRadius(); },
    'rd-circle': function () { setRadiusAll(50); rdUnit = '%'; $('rd-unit').value = '%'; updateRadius(); },
    'rd-card': function () { setRadius([12, 12, 12, 12]); },
    'rd-leaf': function () { setRadius([0, 40, 0, 40]); },
    'rd-bubble': function () { setRadius([20, 20, 20, 0]); },
    // 渐变
    'gr-sunset': function () { grType='linear'; grShape='circle'; grColors=[{color:'#ff6b6b',pos:0},{color:'#feca57',pos:100}]; $('gr-angle').value=135; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-ocean': function () { grType='linear'; grColors=[{color:'#2E3192',pos:0},{color:'#1BFFFF',pos:100}]; $('gr-angle').value=135; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-emerald': function () { grType='linear'; grColors=[{color:'#11998e',pos:0},{color:'#38ef7d',pos:100}]; $('gr-angle').value=135; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-fire': function () { grType='linear'; grColors=[{color:'#f12711',pos:0},{color:'#f5af19',pos:100}]; $('gr-angle').value=0; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-aurora': function () { grType='linear'; grColors=[{color:'#00c9ff',pos:0},{color:'#92fe9d',pos:100}]; $('gr-angle').value=135; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-candy': function () { grType='linear'; grColors=[{color:'#fcb69f',pos:0},{color:'#ffecd2',pos:100}]; $('gr-angle').value=45; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-sakura': function () { grType='linear'; grColors=[{color:'#fbc2eb',pos:0},{color:'#a6c1ee',pos:100}]; $('gr-angle').value=45; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    'gr-night': function () { grType='linear'; grColors=[{color:'#0f2027',pos:0},{color:'#203a43',pos:50},{color:'#2c5364',pos:100}]; $('gr-angle').value=135; syncGrTypeUI(); renderGradientColors(); updateGradient(); },
    // 毛玻璃
    'gl-ios': function () { $('gl-blur').value=20; $('gl-opacity').value=0.3; $('gl-border').value=0.5; $('gl-saturate').value=180; updateGlass(); },
    'gl-macos': function () { $('gl-blur').value=15; $('gl-opacity').value=0.4; $('gl-border').value=0.4; $('gl-saturate').value=140; updateGlass(); },
    'gl-win11': function () { $('gl-blur').value=30; $('gl-opacity').value=0.5; $('gl-border').value=0.6; $('gl-saturate').value=120; updateGlass(); },
    'gl-heavy': function () { $('gl-blur').value=25; $('gl-opacity').value=0.6; $('gl-border').value=0.3; $('gl-saturate').value=200; updateGlass(); },
    // 滤镜
    'ft-orig': function () { setFilter(0,0,100,100,100,0,0,0); },
    'ft-mono': function () { setFilter(0,100,100,100,100,0,0,0); },
    'ft-retro': function () { setFilter(0,30,110,120,80,50,0,0); },
    'ft-dark': function () { setFilter(0,0,60,120,80,0,0,0); },
    'ft-vivid': function () { setFilter(0,0,110,140,150,0,0,0); },
    'ft-warm': function () { setFilter(0,0,105,105,110,20,15,0); },
    'ft-cool': function () { setFilter(0,0,105,105,110,0,180,0); },
    'ft-blur': function () { setFilter(4,0,100,100,100,0,0,0); },
    // 变换
    'tf-reset': function () { setTransform(0,0,0,1,0,0); tfOrigin='center center'; syncOriginUI(); updateTransform(); },
    'tf-hover': function () { setTransform(0,0,0,1.15,0,0); },
    'tf-rotate45': function () { setTransform(0,0,45,1,0,0); },
    'tf-flip': function () { setTransform(0,0,180,1,0,0); },
    'tf-skew': function () { setTransform(0,0,0,1,15,0); },
    'tf-pop': function () { setTransform(0,-20,0,1.1,0,0); },
    // 文字阴影
    'ts-glow': function () { tshadowLayers=[{x:0,y:0,blur:10,color:'#ffff00',opacity:0.9},{x:0,y:0,blur:20,color:'#ffff00',opacity:0.5}]; renderTextShadowLayers(); updateTextShadow(); },
    'ts-neon': function () { tshadowLayers=[{x:0,y:0,blur:5,color:'#ff00ff',opacity:1},{x:0,y:0,blur:15,color:'#00ffff',opacity:1}]; renderTextShadowLayers(); updateTextShadow(); },
    'ts-3d': function () { tshadowLayers=[{x:1,y:1,blur:0,color:'#666666',opacity:1},{x:2,y:2,blur:0,color:'#555555',opacity:1},{x:3,y:3,blur:0,color:'#444444',opacity:1}]; renderTextShadowLayers(); updateTextShadow(); },
    'ts-outline': function () { tshadowLayers=[{x:-1,y:-1,blur:0,color:'#000000',opacity:1},{x:1,y:-1,blur:0,color:'#000000',opacity:1},{x:-1,y:1,blur:0,color:'#000000',opacity:1},{x:1,y:1,blur:0,color:'#000000',opacity:1}]; renderTextShadowLayers(); updateTextShadow(); },
    'ts-soft': function () { tshadowLayers=[{x:0,y:2,blur:8,color:'#000000',opacity:0.2}]; renderTextShadowLayers(); updateTextShadow(); },
    // 文本渐变
    'tg-gold': function () { setTextGrad('#ffd700','#ffed4e','#ffa500',90); },
    'tg-rainbow': function () { setTextGrad('#ff0000','#00ff00','#0000ff',45); },
    'tg-fire': function () { setTextGrad('#ff6b6b','#ffb347','#ffe066',0); },
    'tg-candy': function () { setTextGrad('#fbc2eb','#a6c1ee','#fbc2eb',135); },
    'tg-night': function () { setTextGrad('#667eea','#764ba2','#f093fb',135); },
    // Flex
    'fl-center': function () { setFlex('row','center','center','nowrap',8); },
    'fl-between': function () { setFlex('row','space-between','stretch','nowrap',8); },
    'fl-column': function () { setFlex('column','flex-start','center','nowrap',8); },
    'fl-wrap': function () { setFlex('row','flex-start','flex-start','wrap',8); },
    // Grid
    'gd-2col': function () { setGrid(2,3,10,6); },
    'gd-3col': function () { setGrid(3,2,10,6); },
    'gd-4col': function () { setGrid(4,2,10,8); },
    'gd-holy': function () { setGrid(3,3,8,9); }
  };

  function setRadius(vals) {
    $('rd-tl').value = vals[0];
    $('rd-tr').value = vals[1];
    $('rd-br').value = vals[2];
    $('rd-bl').value = vals[3];
    updateRadius();
  }
  function setRadiusAll(v) {
    ['rd-all','rd-tl','rd-tr','rd-bl','rd-br'].forEach(function (id) {
      $(id).value = v;
    });
    updateRadius();
  }
  function syncGrTypeUI() {
    document.querySelectorAll('#gr-type button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.val === grType);
    });
    $('gr-angle-row').hidden = (grType === 'radial');
    $('gr-shape-row').hidden = (grType !== 'radial');
  }
  function setFilter(blur, gray, bright, contrast, sat, sepia, hue, inv) {
    $('ft-blur').value = blur;
    $('ft-gray').value = gray;
    $('ft-bright').value = bright;
    $('ft-contrast').value = contrast;
    $('ft-saturate').value = sat;
    $('ft-sepia').value = sepia;
    $('ft-hue').value = hue;
    $('ft-invert').value = inv;
    updateFilter();
  }
  function setTransform(x, y, rot, scale, skx, sky) {
    $('tf-x').value = x;
    $('tf-y').value = y;
    $('tf-rotate').value = rot;
    $('tf-scale').value = scale;
    $('tf-skewx').value = skx;
    $('tf-skewy').value = sky;
    updateTransform();
  }
  function syncOriginUI() {
    document.querySelectorAll('#tf-origin button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.origin === tfOrigin);
    });
  }
  function setTextGrad(c1, c2, c3, angle) {
    $('tg-c1').value = c1;
    $('tg-c2').value = c2;
    $('tg-c3').value = c3;
    $('tg-angle').value = angle;
    updateTextGrad();
  }
  function setFlex(dir, justify, align, wrap, gap) {
    document.querySelectorAll('#fl-dir button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.val === dir);
    });
    document.querySelectorAll('#fl-wrap button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.val === wrap);
    });
    $('fl-justify').value = justify;
    $('fl-align').value = align;
    $('fl-gap').value = gap;
    updateFlex();
  }
  function setGrid(cols, rows, gap, count) {
    $('gd-cols').value = cols;
    $('gd-rows').value = rows;
    $('gd-gap').value = gap;
    $('gd-count').value = count;
    updateGrid();
  }

  // 绑定预设按钮
  document.querySelectorAll('.cs-preset-bar').forEach(function (bar) {
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-preset]');
      if (!btn) return;
      var preset = btn.dataset.preset;
      if (PRESETS[preset]) {
        PRESETS[preset]();
        showToast('已应用：' + btn.textContent);
      }
    });
  });

  /* ================= 随机按钮 ================= */
  $('btn-random').addEventListener('click', function () {
    var activePanel = document.querySelector('.cs-panel.active');
    if (!activePanel) return;
    var id = activePanel.id;

    if (id === 'panel-shadow') {
      shadowLayers = [{
        x: Math.floor(Math.random() * 40 - 10),
        y: Math.floor(Math.random() * 40 - 10),
        blur: Math.floor(Math.random() * 30 + 5),
        spread: 0,
        color: randomHex(),
        opacity: (Math.random() * 0.4 + 0.1).toFixed(2),
        inset: false
      }];
      renderShadowLayers();
      updateShadow();
    } else if (id === 'panel-radius') {
      var r = Math.floor(Math.random() * 60);
      setRadiusAll(r);
    } else if (id === 'panel-gradient') {
      grColors = [
        { color: randomHex(), pos: 0 },
        { color: randomHex(), pos: 100 }
      ];
      renderGradientColors();
      $('gr-angle').value = Math.floor(Math.random() * 360);
      updateGradient();
    } else if (id === 'panel-glass') {
      $('gl-blur').value = Math.floor(Math.random() * 25 + 5);
      $('gl-opacity').value = (Math.random() * 0.5 + 0.1).toFixed(2);
      $('gl-saturate').value = Math.floor(Math.random() * 100 + 100);
      updateGlass();
    } else if (id === 'panel-filter') {
      setFilter(
        Math.floor(Math.random() * 5),
        Math.floor(Math.random() * 100),
        Math.floor(Math.random() * 60 + 70),
        Math.floor(Math.random() * 60 + 70),
        Math.floor(Math.random() * 100 + 50),
        Math.floor(Math.random() * 50),
        Math.floor(Math.random() * 360),
        Math.floor(Math.random() * 50)
      );
    } else if (id === 'panel-transform') {
      setTransform(
        Math.floor(Math.random() * 100 - 50),
        Math.floor(Math.random() * 100 - 50),
        Math.floor(Math.random() * 360),
        (Math.random() * 1.5 + 0.5).toFixed(2),
        Math.floor(Math.random() * 30 - 15),
        Math.floor(Math.random() * 30 - 15)
      );
    } else if (id === 'panel-text-shadow') {
      tshadowLayers = [{
        x: Math.floor(Math.random() * 10 - 5),
        y: Math.floor(Math.random() * 10 - 5),
        blur: Math.floor(Math.random() * 15 + 2),
        color: randomHex(),
        opacity: (Math.random() * 0.5 + 0.3).toFixed(2)
      }];
      renderTextShadowLayers();
      updateTextShadow();
    } else if (id === 'panel-text-grad') {
      setTextGrad(randomHex(), randomHex(), randomHex(), Math.floor(Math.random() * 360));
    } else if (id === 'panel-flex') {
      var dirs = ['row', 'row-reverse', 'column', 'column-reverse'];
      var justs = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
      var aligns = ['flex-start', 'center', 'flex-end', 'stretch'];
      setFlex(
        dirs[Math.floor(Math.random() * dirs.length)],
        justs[Math.floor(Math.random() * justs.length)],
        aligns[Math.floor(Math.random() * aligns.length)],
        Math.random() < 0.5 ? 'wrap' : 'nowrap',
        Math.floor(Math.random() * 20)
      );
    } else if (id === 'panel-grid') {
      setGrid(
        Math.floor(Math.random() * 4 + 1),
        Math.floor(Math.random() * 3 + 1),
        Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 8 + 4)
      );
    }
    showToast('🎲 已随机生成');
  });

  /* ================= 初始化 ================= */
  renderShadowLayers();
  bindShadowLayerEvents();
  updateShadow();

  renderGradientColors();
  updateGradient();

  renderTextShadowLayers();
  updateTextShadow();

  updateRadius();
  updateGlass();
  updateFilter();
  updateTransform();
  updateTextGrad();
  updateFlex();
  updateGrid();

  updateHistoryCount();
})();