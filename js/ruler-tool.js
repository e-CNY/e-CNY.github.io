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

  // ================== DOM 元素 ==================
  var gridToggle = document.getElementById('rl-grid-toggle');
  var gridX = document.getElementById('rl-grid-x');
  var gridY = document.getElementById('rl-grid-y');
  var gridColor = document.getElementById('rl-grid-color');
  var gridOpacity = document.getElementById('rl-grid-opacity');
  var gridOpacityVal = document.getElementById('rl-grid-opacity-val');
  var gridLayer = document.getElementById('grid-layer');

  var rulerToggle = document.getElementById('rl-ruler-toggle');
  var crosshairToggle = document.getElementById('rl-crosshair-toggle');
  var rulerTop = document.getElementById('ruler-top');
  var rulerLeft = document.getElementById('ruler-left');
  var crossX = document.getElementById('cross-x');
  var crossY = document.getElementById('cross-y');

  var canvasArea = document.getElementById('canvas-area');
  var measureBox = document.getElementById('measure-box');
  var measureSizeLabel = document.getElementById('measure-size-label');
  var statStart = document.getElementById('stat-start');
  var statEnd = document.getElementById('stat-end');
  var statSize = document.getElementById('stat-size');

  var btnClearGuides = document.getElementById('btn-clear-guides');
  var btnClearMeasure = document.getElementById('btn-clear-measure');

  // 图片与取色
  var imageInput = document.getElementById('rl-image-input');
  var bgImage = document.getElementById('rl-bg-image');
  var btnRemoveBgImg = document.getElementById('btn-remove-bg-img');
  var bgOpacityInput = document.getElementById('rl-bg-opacity');
  var bgOpacityVal = document.getElementById('rl-bg-opacity-val');
  
  var btnEyedropper = document.getElementById('btn-eyedropper');
  var fallbackPanel = document.getElementById('rl-eyedropper-fallback');
  var colorCircle = document.getElementById('rl-color-circle');
  var hexText = document.getElementById('rl-hex');
  var rgbText = document.getElementById('rl-rgb');

  // 全屏直尺与校准
  var btnFullscreenRuler = document.getElementById('btn-fullscreen-ruler');
  var btnExitFullscreen = document.getElementById('btn-exit-fullscreen');
  var fsRulerView = document.getElementById('fullscreen-ruler-view');
  var fsTicks = document.getElementById('fs-ticks');
  
  var btnCalibrate = document.getElementById('btn-calibrate');
  var calibrationModal = document.getElementById('calibration-modal');
  var calibCard = document.getElementById('calib-card');
  var calibSlider = document.getElementById('calib-slider');
  var btnCancelCalib = document.getElementById('btn-cancel-calib');
  var btnConfirmCalib = document.getElementById('btn-confirm-calib');

  // ================== 状态变量 ==================
  var isDrawing = false;
  var startX = 0, startY = 0;
  var currentX = 0, currentY = 0;
  var guides = [];
  var guideDragging = null;
  var hasBgImage = false;
  
  // 从本地存储读取校准值，默认估算 1mm = 3.78px (常见手机屏幕)
  var CALIBRATION_KEY = 'rl_px_per_mm';
  var pxPerMM = parseFloat(localStorage.getItem(CALIBRATION_KEY)) || 3.78;

  // ================== 1. 网格控制逻辑 ==================
  function updateGrid() {
    if (!gridToggle.checked) {
      gridLayer.style.backgroundImage = 'none';
      return;
    }
    var x = parseInt(gridX.value, 10) || 20;
    var y = parseInt(gridY.value, 10) || 20;
    var c = gridColor.value;
    var o = parseInt(gridOpacity.value, 10) / 100;

    var r = parseInt(c.slice(1, 3), 16);
    var g = parseInt(c.slice(3, 5), 16);
    var b = parseInt(c.slice(5, 7), 16);
    var rgba = 'rgba(' + r + ',' + g + ',' + b + ',' + o + ')';

    gridLayer.style.backgroundSize = x + 'px ' + y + 'px';
    gridLayer.style.backgroundImage = 
      'linear-gradient(to right, ' + rgba + ' 1px, transparent 1px), ' +
      'linear-gradient(to bottom, ' + rgba + ' 1px, transparent 1px)';
  }

  [gridToggle, gridX, gridY, gridColor].forEach(function(el) {
    el.addEventListener('input', updateGrid);
    el.addEventListener('change', updateGrid);
  });
  gridOpacity.addEventListener('input', function() {
    gridOpacityVal.textContent = this.value + '%';
    updateGrid();
  });
  updateGrid();

  // ================== 2. 标尺刻度渲染 ==================
  function renderRulers() {
    if (!rulerToggle.checked) {
      rulerTop.style.display = 'none';
      rulerLeft.style.display = 'none';
      return;
    }
    rulerTop.style.display = 'block';
    rulerLeft.style.display = 'block';

    var w = rulerTop.clientWidth;
    var h = rulerLeft.clientHeight;

    var topHtml = '';
    for (var i = 0; i <= w; i += 10) {
      var isMajor = i % 50 === 0;
      topHtml += '<div class="tick ' + (isMajor ? 'major' : '') + '" style="left:' + i + 'px"></div>';
      if (isMajor) topHtml += '<div class="tick-label" style="left:' + i + 'px">' + i + '</div>';
    }
    rulerTop.innerHTML = topHtml;

    var leftHtml = '';
    for (var j = 0; j <= h; j += 10) {
      var isMajorY = j % 50 === 0;
      leftHtml += '<div class="tick ' + (isMajorY ? 'major' : '') + '" style="top:' + j + 'px"></div>';
      if (isMajorY) leftHtml += '<div class="tick-label" style="top:' + j + 'px">' + j + '</div>';
    }
    rulerLeft.innerHTML = leftHtml;
  }

  rulerToggle.addEventListener('change', renderRulers);
  window.addEventListener('resize', renderRulers);
  setTimeout(renderRulers, 50);

  // ================== 3. 十字辅助线 ==================
  function updateCrosshair(e) {
    if (!crosshairToggle.checked) {
      crossX.style.display = 'none';
      crossY.style.display = 'none';
      return;
    }
    crossX.style.display = 'block';
    crossY.style.display = 'block';
    
    var rect = canvasArea.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    
    crossX.style.left = x + 'px';
    crossY.style.top = y + 'px';
  }

  crosshairToggle.addEventListener('change', function() {
    if (!this.checked) {
      crossX.style.display = 'none';
      crossY.style.display = 'none';
    }
  });

  // ================== 4. 测距逻辑 ==================
  canvasArea.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.classList.contains('rl-guide')) return;

    isDrawing = true;
    var rect = canvasArea.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    measureBox.style.display = 'block';
    measureBox.style.left = startX + 'px';
    measureBox.style.top = startY + 'px';
    measureBox.style.width = '0px';
    measureBox.style.height = '0px';
    
    statStart.textContent = '(' + Math.round(startX) + ', ' + Math.round(startY) + ')';
    statEnd.textContent = '-';
    statSize.textContent = '0 × 0';
    measureSizeLabel.textContent = '0 × 0';
  });

  window.addEventListener('mousemove', function(e) {
    updateCrosshair(e);
    if (!isDrawing) return;
    
    var rect = canvasArea.getBoundingClientRect();
    currentX = e.clientX - rect.left;
    currentY = e.clientY - rect.top;

    var w = currentX - startX;
    var h = currentY - startY;
    
    var left = w < 0 ? currentX : startX;
    var top = h < 0 ? currentY : startY;
    var absW = Math.abs(w);
    var absH = Math.abs(h);

    measureBox.style.left = left + 'px';
    measureBox.style.top = top + 'px';
    measureBox.style.width = absW + 'px';
    measureBox.style.height = absH + 'px';

    var label = Math.round(absW) + ' × ' + Math.round(absH);
    measureSizeLabel.textContent = label;
    statEnd.textContent = '(' + Math.round(currentX) + ', ' + Math.round(currentY) + ')';
    statSize.textContent = label;
  });

  window.addEventListener('mouseup', function() { isDrawing = false; });

  btnClearMeasure.addEventListener('click', function() {
    measureBox.style.display = 'none';
    statStart.textContent = '-';
    statEnd.textContent = '-';
    statSize.textContent = '-';
  });

  // ================== 5. 参考线逻辑 ==================
  rulerTop.addEventListener('dblclick', function(e) {
    var rect = rulerTop.getBoundingClientRect();
    createGuide('horizontal', e.clientY - rect.top);
  });

  rulerLeft.addEventListener('dblclick', function(e) {
    var rect = rulerLeft.getBoundingClientRect();
    createGuide('vertical', e.clientX - rect.left);
  });

  function createGuide(type, pos) {
    var guide = document.createElement('div');
    guide.className = 'rl-guide ' + type;
    if (type === 'horizontal') guide.style.top = pos + 'px';
    else guide.style.left = pos + 'px';

    guide.addEventListener('mousedown', function(e) {
      e.stopPropagation(); guideDragging = guide;
    });
    guide.addEventListener('dblclick', function(e) {
      e.stopPropagation(); guide.remove();
      guides = guides.filter(function(g) { return g !== guide; });
    });

    canvasArea.appendChild(guide);
    guides.push(guide);
    showToast('已添加参考线');
  }

  window.addEventListener('mousemove', function(e) {
    if (!guideDragging) return;
    var rect = canvasArea.getBoundingClientRect();
    if (guideDragging.classList.contains('horizontal')) {
      var y = e.clientY - rect.top;
      if (y < 0) y = 0; if (y > rect.height) y = rect.height;
      guideDragging.style.top = y + 'px';
    } else {
      var x = e.clientX - rect.left;
      if (x < 0) x = 0; if (x > rect.width) x = rect.width;
      guideDragging.style.left = x + 'px';
    }
  });

  window.addEventListener('mouseup', function() { guideDragging = null; });

  btnClearGuides.addEventListener('click', function() {
    guides.forEach(function(g) { g.remove(); });
    guides = [];
    showToast('已清除所有参考线');
  });

  // ================== 6. 图片与取色逻辑 ==================
  imageInput.addEventListener('change', function(e) {
    if (!e.target.files.length) return;
    var file = e.target.files[0];
    if (!file.type.startsWith('image/')) return;
    
    var url = URL.createObjectURL(file);
    bgImage.src = url;
    bgImage.onload = function() {
      bgImage.style.display = 'block';
      hasBgImage = true;
      btnRemoveBgImg.style.display = 'block';
      URL.revokeObjectURL(url);
      showToast('图片已作为底图加载');
    };
    this.value = '';
  });

  bgOpacityInput.addEventListener('input', function() {
    bgOpacityVal.textContent = this.value + '%';
    bgImage.style.opacity = this.value / 100;
  });

  btnRemoveBgImg.addEventListener('click', function() {
    bgImage.style.display = 'none';
    bgImage.src = '';
    hasBgImage = false;
    this.style.display = 'none';
  });

  var isNativeEyeDropper = 'EyeDropper' in window;
  if (!isNativeEyeDropper) {
    btnEyedropper.style.display = 'none';
    fallbackPanel.style.display = 'block';
  } else {
    btnEyedropper.addEventListener('click', async function() {
      try {
        var eyeDropper = new EyeDropper();
        var result = await eyeDropper.open();
        applyColor(result.sRGBHex);
      } catch (e) { console.log('取消取色'); }
    });
  }

  canvasArea.addEventListener('click', function(e) {
    if (!hasBgImage || isNativeEyeDropper) return;
    if (e.target.classList.contains('rl-guide') || e.target.classList.contains('rl-measure-box')) return;

    var imgRect = bgImage.getBoundingClientRect();
    var imgX = e.clientX - imgRect.left;
    var imgY = e.clientY - imgRect.top;

    if (imgX >= 0 && imgX < bgImage.naturalWidth && imgY >= 0 && imgY < bgImage.naturalHeight) {
      var canvas = document.createElement('canvas');
      canvas.width = bgImage.naturalWidth;
      canvas.height = bgImage.naturalHeight;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bgImage, 0, 0);
      
      var p = ctx.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
      var hex = '#' + [p[0], p[1], p[2]].map(function(v) {
        return ('0' + v.toString(16)).slice(-2);
      }).join('').toUpperCase();
      
      applyColor(hex, p[0], p[1], p[2]);
    }
  });

  function applyColor(hex, r, g, b) {
    if (r === undefined) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    colorCircle.style.background = hex;
    hexText.textContent = hex.toUpperCase();
    rgbText.textContent = 'RGB: ' + r + ', ' + g + ', ' + b;
    showToast('已取色 ' + hex.toUpperCase());
  }

  // ================== 7. 屏幕校准与全屏直尺 ==================
  
  // 打开校准弹窗
  btnCalibrate.addEventListener('click', function() {
    // 初始化滑块为当前的 px/mm 反推值（假设卡片 85.6mm）
    calibSlider.value = Math.round(85.6 * pxPerMM);
    calibCard.style.width = calibSlider.value + 'px';
    calibrationModal.style.display = 'flex';
  });

  calibSlider.addEventListener('input', function() {
    calibCard.style.width = this.value + 'px';
  });

  btnCancelCalib.addEventListener('click', function() {
    calibrationModal.style.display = 'none';
  });

  btnConfirmCalib.addEventListener('click', function() {
    var cardWidthPx = parseInt(calibSlider.value, 10);
    pxPerMM = cardWidthPx / 85.6;
    localStorage.setItem(CALIBRATION_KEY, pxPerMM);
    calibrationModal.style.display = 'none';
    showToast('校准成功！1mm ≈ ' + pxPerMM.toFixed(2) + 'px');
  });

  // 进入全屏直尺
  btnFullscreenRuler.addEventListener('click', function() {
    fsRulerView.style.display = 'flex';
    
    // 尝试全屏
    if (fsRulerView.requestFullscreen) {
      fsRulerView.requestFullscreen().catch(function() { console.log('全屏请求被拒绝'); });
    } else if (fsRulerView.webkitRequestFullscreen) {
      fsRulerView.webkitRequestFullscreen();
    }
    
    // 如果当前屏幕是竖屏，提示用户
    if (window.innerHeight > window.innerWidth) {
      showToast('建议横屏使用，测量更准确');
    }

    renderFullscreenRuler();
  });

  // 退出全屏
  btnExitFullscreen.addEventListener('click', function() {
    fsRulerView.style.display = 'none';
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function() {});
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  });

  // 监听全屏变化（按 ESC 退出时）
  document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
      fsRulerView.style.display = 'none';
    }
  });

  window.addEventListener('resize', function() {
    if (fsRulerView.style.display === 'flex') {
      renderFullscreenRuler();
    }
  });

  // 渲染直尺刻度
  function renderFullscreenRuler() {
    fsTicks.innerHTML = '';
    var screenWidth = fsTicks.clientWidth;
    var totalMM = Math.floor(screenWidth / pxPerMM);
    
    // 用 DocumentFragment 优化性能
    var fragment = document.createDocumentFragment();
    
    for (var i = 0; i <= totalMM; i++) {
      var isCM = i % 10 === 0;
      var isHalfCM = i % 5 === 0 && !isCM;
      
      var tick = document.createElement('div');
      tick.className = 'fs-tick ' + (isCM ? 'cm' : (isHalfCM ? 'mm half' : 'mm'));
      tick.style.left = (i * pxPerMM) + 'px';
      
      // 每个毫米都画线，但线长度不同
      if (isCM) {
        tick.style.height = '60px';
        tick.style.width = '2px';
        tick.style.backgroundColor = '#3d3226';
      } else if (isHalfCM) {
        tick.style.height = '40px';
      } else {
        tick.style.height = '20px';
        tick.style.backgroundColor = '#999';
      }
      
      fragment.appendChild(tick);
      
      // 标注数字 (仅厘米级)
      if (isCM) {
        var label = document.createElement('div');
        label.className = 'fs-tick-label';
        label.style.left = (i * pxPerMM) + 'px';
        label.textContent = (i / 10); // 显示 cm 数值
        fragment.appendChild(label);
      }
    }
    
    fsTicks.appendChild(fragment);
  }

})();