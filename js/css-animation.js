/* js/css-animation.js */
(function () {
  'use strict';

  /* ================= 预设动画数据 ================= */
  var PRESETS = [
    {
      group: 'Attention（吸引注意）',
      items: [
        { name: 'bounce', label: '弹跳 Bounce' },
        { name: 'flash', label: '闪烁 Flash' },
        { name: 'pulse', label: '脉冲 Pulse' },
        { name: 'rubberBand', label: '橡皮筋 Rubber Band' },
        { name: 'shakeX', label: '左右抖 Shake X' },
        { name: 'shakeY', label: '上下抖 Shake Y' },
        { name: 'headShake', label: '摇头 Head Shake' },
        { name: 'swing', label: '摇摆 Swing' },
        { name: 'tada', label: '惊叹 Tada' },
        { name: 'wobble', label: '摇晃 Wobble' },
        { name: 'jello', label: '果冻 Jello' },
        { name: 'heartBeat', label: '心跳 Heart Beat' }
      ]
    },
    {
      group: 'Fading（淡入淡出）',
      items: [
        { name: 'fadeIn', label: '淡入 Fade In' },
        { name: 'fadeInUp', label: '向上淡入' },
        { name: 'fadeInDown', label: '向下淡入' },
        { name: 'fadeInLeft', label: '向右淡入' },
        { name: 'fadeInRight', label: '向左淡入' },
        { name: 'fadeOut', label: '淡出 Fade Out' },
        { name: 'fadeOutUp', label: '向上淡出' },
        { name: 'fadeOutDown', label: '向下淡出' }
      ]
    },
    {
      group: 'Zoom（缩放）',
      items: [
        { name: 'zoomIn', label: '放大进入 Zoom In' },
        { name: 'zoomInUp', label: '向上放大进入' },
        { name: 'zoomInDown', label: '向下放大进入' },
        { name: 'zoomOut', label: '缩小退出 Zoom Out' },
        { name: 'zoomOutUp', label: '向上缩小退出' }
      ]
    },
    {
      group: 'Slide（滑动）',
      items: [
        { name: 'slideInUp', label: '向上滑入' },
        { name: 'slideInDown', label: '向下滑入' },
        { name: 'slideInLeft', label: '向右滑入' },
        { name: 'slideInRight', label: '向左滑入' },
        { name: 'slideOutUp', label: '向上滑出' },
        { name: 'slideOutDown', label: '向下滑出' }
      ]
    },
    {
      group: 'Rotate & Flip（旋转翻转）',
      items: [
        { name: 'rotateIn', label: '旋转进入 Rotate In' },
        { name: 'rotateInDownLeft', label: '左下旋转进入' },
        { name: 'rotateInUpRight', label: '右上旋转进入' },
        { name: 'rotateOut', label: '旋转退出 Rotate Out' },
        { name: 'flip', label: '3D 翻转 Flip' },
        { name: 'flipInX', label: 'X 轴翻转进入' },
        { name: 'flipInY', label: 'Y 轴翻转进入' }
      ]
    },
    {
      group: 'Back & Light（回弹与光速）',
      items: [
        { name: 'backInDown', label: '向下回弹进入' },
        { name: 'backInUp', label: '向上回弹进入' },
        { name: 'backOutUp', label: '向上回弹退出' },
        { name: 'lightSpeedInRight', label: '光速向右进入' },
        { name: 'lightSpeedOutRight', label: '光速向右退出' }
      ]
    },
    {
      group: 'Special（新特效）',
      items: [
        { name: 'bounceIn', label: '弹性进入 Bounce In' },
        { name: 'bounceOut', label: '弹性退出 Bounce Out' },
        { name: 'glow', label: '发光 Glow' },
        { name: 'float', label: '浮动 Float' },
        { name: 'spin', label: '旋转 Spin' },
        { name: 'shimmer', label: '微光扫过 Shimmer' },
        { name: 'glitch', label: '故障 Glitch' },
        { name: 'pulseRing', label: '脉冲环 Pulse Ring' }
      ]
    }
  ];

  /* ================= Keyframes 生成器 ================= */
  function getKeyframesCSS(name) {
    var k = '';
    switch (name) {
      case 'bounce': k = `from, 20%, 53%, to { transform: translate3d(0,0,0); }\n20%, 53% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); }\n40%, 43% { transform: translate3d(0, -30px, 0) scaleY(1.1); animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); }\n70% { transform: translate3d(0, -15px, 0) scaleY(1.05); animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); }\n80% { transform: translate3d(0,0,0) scaleY(0.95); }\n90% { transform: translate3d(0, -4px, 0) scaleY(1.02); }`; break;
      case 'flash': k = `from, 50%, to { opacity: 1; }\n25%, 75% { opacity: 0; }`; break;
      case 'pulse': k = `from { transform: scale3d(1, 1, 1); }\n50% { transform: scale3d(1.05, 1.05, 1.05); }\nto { transform: scale3d(1, 1, 1); }`; break;
      case 'rubberBand': k = `from { transform: scale3d(1, 1, 1); }\n30% { transform: scale3d(1.25, 0.75, 1); }\n40% { transform: scale3d(0.75, 1.25, 1); }\n50% { transform: scale3d(1.15, 0.85, 1); }\n65% { transform: scale3d(0.95, 1.05, 1); }\n75% { transform: scale3d(1.05, 0.95, 1); }\nto { transform: scale3d(1, 1, 1); }`; break;
      case 'shakeX': k = `from, to { transform: translate3d(0, 0, 0); }\n10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); }\n20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); }`; break;
      case 'shakeY': k = `from, to { transform: translate3d(0, 0, 0); }\n10%, 30%, 50%, 70%, 90% { transform: translate3d(0, -10px, 0); }\n20%, 40%, 60%, 80% { transform: translate3d(0, 10px, 0); }`; break;
      case 'headShake': k = `0% { transform: translateX(0); }\n6.5% { transform: translateX(-6px) rotateY(-9deg); }\n18.5% { transform: translateX(5px) rotateY(7deg); }\n31.5% { transform: translateX(-3px) rotateY(-5deg); }\n43.5% { transform: translateX(2px) rotateY(3deg); }\n50% { transform: translateX(0); }`; break;
      case 'swing': k = `20% { transform: rotate3d(0, 0, 1, 15deg); }\n40% { transform: rotate3d(0, 0, 1, -10deg); }\n60% { transform: rotate3d(0, 0, 1, 5deg); }\n80% { transform: rotate3d(0, 0, 1, -5deg); }\nto { transform: rotate3d(0, 0, 1, 0deg); }`; break;
      case 'tada': k = `from { transform: scale3d(1, 1, 1); }\n10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); }\n30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); }\n40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); }\nto { transform: scale3d(1, 1, 1); }`; break;
      case 'wobble': k = `from { transform: translate3d(0, 0, 0); }\n15% { transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); }\n30% { transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); }\n45% { transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); }\n60% { transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); }\n75% { transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); }\nto { transform: translate3d(0, 0, 0); }`; break;
      case 'jello': k = `from, 11.1%, to { transform: translate3d(0, 0, 0); }\n22.2% { transform: skewX(-12.5deg) skewY(-12.5deg); }\n33.3% { transform: skewX(6.25deg) skewY(6.25deg); }\n44.4% { transform: skewX(-3.125deg) skewY(-3.125deg); }\n55.5% { transform: skewX(1.5625deg) skewY(1.5625deg); }\n66.6% { transform: skewX(-0.78125deg) skewY(-0.78125deg); }\n77.7% { transform: skewX(0.390625deg) skewY(0.390625deg); }\n88.8% { transform: skewX(-0.1953125deg) skewY(-0.1953125deg); }`; break;
      case 'heartBeat': k = `0% { transform: scale(1); }\n14% { transform: scale(1.3); }\n28% { transform: scale(1); }\n42% { transform: scale(1.3); }\n70% { transform: scale(1); }`; break;
      case 'fadeIn': k = `from { opacity: 0; }\nto { opacity: 1; }`; break;
      case 'fadeInUp': k = `from { opacity: 0; transform: translate3d(0, 100%, 0); }\nto { opacity: 1; transform: translate3d(0, 0, 0); }`; break;
      case 'fadeInDown': k = `from { opacity: 0; transform: translate3d(0, -100%, 0); }\nto { opacity: 1; transform: translate3d(0, 0, 0); }`; break;
      case 'fadeInLeft': k = `from { opacity: 0; transform: translate3d(-100%, 0, 0); }\nto { opacity: 1; transform: translate3d(0, 0, 0); }`; break;
      case 'fadeInRight': k = `from { opacity: 0; transform: translate3d(100%, 0, 0); }\nto { opacity: 1; transform: translate3d(0, 0, 0); }`; break;
      case 'fadeOut': k = `from { opacity: 1; }\nto { opacity: 0; }`; break;
      case 'fadeOutUp': k = `from { opacity: 1; }\nto { opacity: 0; transform: translate3d(0, -100%, 0); }`; break;
      case 'fadeOutDown': k = `from { opacity: 1; }\nto { opacity: 0; transform: translate3d(0, 100%, 0); }`; break;
      case 'zoomIn': k = `from { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); }\n50% { opacity: 1; }`; break;
      case 'zoomInUp': k = `from { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(0, 1000px, 0); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); }\n60% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(0, -60px, 0); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); }`; break;
      case 'zoomInDown': k = `from { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(0, -1000px, 0); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); }\n60% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); }`; break;
      case 'zoomOut': k = `from { opacity: 1; }\n50% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); }\nto { opacity: 0; }`; break;
      case 'zoomOutUp': k = `40% { opacity: 1; transform: scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0); animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); }\nto { opacity: 0; transform: scale3d(0.1, 0.1, 0.1) translate3d(0, -1000px, 0); animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1); }`; break;
      case 'slideInUp': k = `from { transform: translate3d(0, 100%, 0); visibility: visible; }\nto { transform: translate3d(0, 0, 0); }`; break;
      case 'slideInDown': k = `from { transform: translate3d(0, -100%, 0); visibility: visible; }\nto { transform: translate3d(0, 0, 0); }`; break;
      case 'slideInLeft': k = `from { transform: translate3d(-100%, 0, 0); visibility: visible; }\nto { transform: translate3d(0, 0, 0); }`; break;
      case 'slideInRight': k = `from { transform: translate3d(100%, 0, 0); visibility: visible; }\nto { transform: translate3d(0, 0, 0); }`; break;
      case 'slideOutUp': k = `from { transform: translate3d(0, 0, 0); }\nto { visibility: hidden; transform: translate3d(0, -100%, 0); }`; break;
      case 'slideOutDown': k = `from { transform: translate3d(0, 0, 0); }\nto { visibility: hidden; transform: translate3d(0, 100%, 0); }`; break;
      case 'rotateIn': k = `from { transform-origin: center; transform: rotate3d(0, 0, 1, -200deg); opacity: 0; }\nto { transform-origin: center; transform: translate3d(0, 0, 0); opacity: 1; }`; break;
      case 'rotateInDownLeft': k = `from { transform-origin: left bottom; transform: rotate3d(0, 0, 1, -45deg); opacity: 0; }\nto { transform-origin: left bottom; transform: translate3d(0, 0, 0); opacity: 1; }`; break;
      case 'rotateInUpRight': k = `from { transform-origin: right bottom; transform: rotate3d(0, 0, 1, -90deg); opacity: 0; }\nto { transform-origin: right bottom; transform: translate3d(0, 0, 0); opacity: 1; }`; break;
      case 'rotateOut': k = `from { transform-origin: center; opacity: 1; }\nto { transform-origin: center; transform: rotate3d(0, 0, 1, 200deg); opacity: 0; }`; break;
      case 'flip': k = `from { transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, -360deg); animation-timing-function: ease-out; }\n40% { transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -190deg); animation-timing-function: ease-out; }\n50% { transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 150px) rotate3d(0, 1, 0, -170deg); animation-timing-function: ease-in; }\n80% { transform: perspective(400px) scale3d(0.95, 0.95, 0.95) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg); animation-timing-function: ease-in; }\nto { transform: perspective(400px) scale3d(1, 1, 1) translate3d(0, 0, 0) rotate3d(0, 1, 0, 0deg); animation-timing-function: ease-in; }`; break;
      case 'flipInX': k = `from { transform: perspective(400px) rotate3d(1, 0, 0, 90deg); animation-timing-function: ease-in; opacity: 0; }\n40% { transform: perspective(400px) rotate3d(1, 0, 0, -20deg); animation-timing-function: ease-in; }\n60% { transform: perspective(400px) rotate3d(1, 0, 0, 10deg); opacity: 1; }\n80% { transform: perspective(400px) rotate3d(1, 0, 0, -5deg); }\nto { transform: perspective(400px); }`; break;
      case 'flipInY': k = `from { transform: perspective(400px) rotate3d(0, 1, 0, 90deg); animation-timing-function: ease-in; opacity: 0; }\n40% { transform: perspective(400px) rotate3d(0, 1, 0, -20deg); animation-timing-function: ease-in; }\n60% { transform: perspective(400px) rotate3d(0, 1, 0, 10deg); opacity: 1; }\n80% { transform: perspective(400px) rotate3d(0, 1, 0, -5deg); }\nto { transform: perspective(400px); }`; break;
      case 'backInDown': k = `0% { transform: translateY(-1200px) scale(0.7); opacity: 0.7; }\n80% { transform: translateY(0px) scale(0.7); opacity: 0.7; }\n100% { transform: scale(1); opacity: 1; }`; break;
      case 'backInUp': k = `0% { transform: translateY(1200px) scale(0.7); opacity: 0.7; }\n80% { transform: translateY(0px) scale(0.7); opacity: 0.7; }\n100% { transform: scale(1); opacity: 1; }`; break;
      case 'backOutUp': k = `0% { transform: scale(1); opacity: 1; }\n20% { transform: translateY(0px) scale(0.7); opacity: 0.7; }\n100% { transform: translateY(-700px) scale(0.7); opacity: 0.7; }`; break;
      case 'lightSpeedInRight': k = `from { transform: translate3d(100%, 0, 0) skewX(-30deg); opacity: 0; }\n60% { transform: skewX(20deg); opacity: 1; }\n80% { transform: skewX(-5deg); }\nto { transform: translate3d(0, 0, 0); }`; break;
      case 'lightSpeedOutRight': k = `from { opacity: 1; }\nto { transform: translate3d(100%, 0, 0) skewX(30deg); opacity: 0; }`; break;
      case 'bounceIn': k = `from, 20%, 40%, 60%, 80%, to { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); }\n0% { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); }\n20% { transform: scale3d(1.1, 1.1, 1.1); }\n40% { transform: scale3d(0.9, 0.9, 0.9); }\n60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); }\n80% { transform: scale3d(0.97, 0.97, 0.97); }\nto { opacity: 1; transform: scale3d(1, 1, 1); }`; break;
      case 'bounceOut': k = `20% { transform: scale3d(0.9, 0.9, 0.9); }\n50%, 55% { opacity: 1; transform: scale3d(1.1, 1.1, 1.1); }\nto { opacity: 0; transform: scale3d(0.3, 0.3, 0.3); }`; break;
      case 'glow': k = `from { box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #8a5a2b; }\n50% { box-shadow: 0 0 20px #fff, 0 0 30px #8a5a2b, 0 0 40px #8a5a2b; }\nto { box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #8a5a2b; }`; break;
      case 'float': k = `0%, 100% { transform: translateY(0); }\n50% { transform: translateY(-20px); }`; break;
      case 'spin': k = `from { transform: rotate(0deg); }\nto { transform: rotate(360deg); }`; break;
      case 'shimmer': k = `0% { background-position: -200% 0; }\n100% { background-position: 200% 0; }`; break;
      case 'glitch': k = `0% { transform: translate(0); }\n20% { transform: translate(-2px, 2px); }\n40% { transform: translate(-2px, -2px); }\n60% { transform: translate(2px, 2px); }\n80% { transform: translate(2px, -2px); }\n100% { transform: translate(0); }`; break;
      case 'pulseRing': k = `0% { transform: scale(0.8); opacity: 1; }\n100% { transform: scale(2); opacity: 0; }`; break;
      default: k = `from { opacity: 0; }\nto { opacity: 1; }`;
    }
    return '@keyframes ' + name + ' {\n  ' + k.split('\n').join('\n  ') + '\n}';
  }

  /* ================= 状态 ================= */
  var state = {
    activePreset: 'bounce',
    duration: 1,
    delay: 0,
    timing: 'ease',
    iteration: 'infinite',
    direction: 'normal',
    fillMode: 'none',
    shape: 'rect',
    customText: '🎁',
    filter: 'all',
    isPaused: false
  };

  var THEME_KEY = 'ca_theme_v1';
  var FAV_KEY = 'ca_favorites_v1';
  var HISTORY_KEY = 'ca_history_v1';
  var favorites = [];
  var history = [];
  var historyCount = 0;

  /* ================= 元素 ================= */
  var els = {};
  function cacheEls() {
    els.presetList = document.getElementById('ca-preset-list');
    els.search = document.getElementById('ca-search');
    els.filterBar = document.getElementById('ca-filter-bar');
    els.previewBox = document.getElementById('ca-preview-box');
    els.previewText = document.getElementById('ca-preview-text');
    els.gridBg = document.getElementById('ca-grid-bg');
    els.btnReplay = document.getElementById('ca-btn-replay');
    els.btnPause = document.getElementById('ca-btn-pause');
    els.textInput = document.getElementById('ca-text-input');
    els.shapeSelect = document.getElementById('ca-shape');
    els.btnToggleGrid = document.getElementById('ca-toggle-grid');
    els.ctrlDuration = document.getElementById('ctrl-duration');
    els.valDuration = document.getElementById('val-duration');
    els.ctrlDelay = document.getElementById('ctrl-delay');
    els.valDelay = document.getElementById('val-delay');
    els.ctrlTiming = document.getElementById('ctrl-timing');
    els.ctrlIteration = document.getElementById('ctrl-iteration');
    els.ctrlDirection = document.getElementById('ctrl-direction');
    els.ctrlFillMode = document.getElementById('ctrl-fill-mode');
    els.codeOutput = document.getElementById('ca-code-output');
    els.btnCopy = document.getElementById('ca-btn-copy');
    els.btnDownloadCss = document.getElementById('ca-btn-download-css');
    els.btnTheme = document.getElementById('btn-theme');
    els.btnRandom = document.getElementById('btn-random');
    els.btnFav = document.getElementById('btn-fav');
    els.btnHistory = document.getElementById('btn-history');
    els.btnShare = document.getElementById('btn-share');
    els.btnExport = document.getElementById('btn-export');
    els.historyCountEl = document.getElementById('history-count');
    els.drawer = document.getElementById('ca-drawer');
    els.drawerBackdrop = document.getElementById('ca-drawer-backdrop');
    els.drawerClose = document.getElementById('drawer-close');
    els.favList = document.getElementById('fav-list');
    els.historyList = document.getElementById('history-list');
    els.clearHistory = document.getElementById('clear-history');
    els.toast = document.getElementById('ca-toast');
  }

  /* ================= Toast ================= */
  var toastTimer = null;
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 1600);
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

  /* ================= 主题 ================= */
  var theme = 'light';
  try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
  function applyTheme() {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    els.btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /* ================= 收藏 / 历史 ================= */
  function loadStorage() {
    try {
      favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') || [];
      history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') || [];
    } catch (e) {}
    historyCount = history.length;
    updateHistoryCount();
  }
  function saveStorage() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites.slice(0, 50)));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    } catch (e) {}
  }
  function updateHistoryCount() {
    if (els.historyCountEl) els.historyCountEl.textContent = history.length;
  }
  function addToHistory(name) {
    if (!name) return;
    history = history.filter(function (h) { return h !== name; });
    history.unshift(name);
    if (history.length > 30) history.length = 30;
    saveStorage();
    updateHistoryCount();
  }
  function toggleFavorite(name) {
    var idx = favorites.indexOf(name);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      showToast('已取消收藏');
    } else {
      favorites.unshift(name);
      showToast('⭐ 已收藏');
    }
    saveStorage();
    renderPresets(els.search.value);
    renderDrawer();
  }

  /* ================= 渲染预设列表 ================= */
  function getAllPresets() {
    var all = [];
    PRESETS.forEach(function (g) {
      g.items.forEach(function (item) {
        all.push({ group: g.group, name: item.name, label: item.label });
      });
    });
    return all;
  }
  var ALL_PRESETS = getAllPresets();

  function renderPresets(filter) {
    filter = (filter || '').toLowerCase().trim();
    els.presetList.innerHTML = '';

    var visibleSet = null;
    if (state.filter === 'fav') {
      visibleSet = {};
      favorites.forEach(function (n) { visibleSet[n] = true; });
    } else if (state.filter === 'recent') {
      visibleSet = {};
      history.forEach(function (n) { visibleSet[n] = true; });
    }

    var found = false;

    PRESETS.forEach(function (group) {
      var items = group.items.filter(function (item) {
        var matchSearch = !filter ||
          item.name.toLowerCase().indexOf(filter) >= 0 ||
          item.label.toLowerCase().indexOf(filter) >= 0 ||
          group.group.toLowerCase().indexOf(filter) >= 0;
        var matchSet = !visibleSet || visibleSet[item.name];
        return matchSearch && matchSet;
      });

      if (items.length === 0) return;
      found = true;

      var groupEl = document.createElement('div');
      groupEl.className = 'ca-preset-group';

      var titleEl = document.createElement('div');
      titleEl.className = 'ca-preset-title';
      titleEl.textContent = group.group;
      groupEl.appendChild(titleEl);

      items.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ca-preset-btn' + (item.name === state.activePreset ? ' active' : '');
        btn.dataset.name = item.name;

        var isFav = favorites.indexOf(item.name) >= 0;
        btn.innerHTML = '<span>' + escapeHtml(item.label) + '</span>' +
          '<span class="fav-star' + (isFav ? ' favorited' : '') + '">★</span>';

        btn.addEventListener('click', function () {
          state.activePreset = item.name;
          addToHistory(item.name);
          renderPresets(els.search.value);
          renderDrawer();
          updateAnimation();
          updateURL();
        });

        groupEl.appendChild(btn);
      });

      els.presetList.appendChild(groupEl);
    });

    if (!found) {
      els.presetList.innerHTML = '<p class="ca-drawer-empty" style="padding:24px;">没有匹配的动画</p>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ================= 抽屉渲染 ================= */
  function renderDrawer() {
    if (!els.favList || !els.historyList) return;

    function renderItem(name, opts) {
      opts = opts || {};
      var preset = ALL_PRESETS.filter(function (p) { return p.name === name; })[0];
      var label = preset ? preset.label : name;
      return '<div class="ca-drawer-item" data-name="' + escapeHtml(name) + '">' +
        '<span class="ca-drawer-item-name">' + escapeHtml(label) + '</span>' +
        (opts.showDel
          ? '<button class="ca-drawer-del" data-del="' + escapeHtml(name) + '" type="button" title="移除">✕</button>'
          : '') +
        '</div>';
    }

    if (favorites.length === 0) {
      els.favList.innerHTML = '<p class="ca-drawer-empty">还没有收藏动画</p>';
    } else {
      els.favList.innerHTML = favorites.map(function (n) { return renderItem(n, { showDel: true }); }).join('');
    }

    if (history.length === 0) {
      els.historyList.innerHTML = '<p class="ca-drawer-empty">还没有最近使用</p>';
    } else {
      els.historyList.innerHTML = history.map(function (n) { return renderItem(n); }).join('');
    }
  }

  /* ================= 代码高亮 ================= */
  function highlightCSS(code) {
    return escapeHtml(code)
      .replace(/@keyframes\s+([a-zA-Z0-9_-]+)/g, '<span class="token atrule">@keyframes</span> <span class="token selector">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>')
      .replace(/([a-zA-Z-]+)\s*:/g, '<span class="token property">$1</span><span class="token punctuation">:</span>')
      .replace(/(\d+\.?\d*(?:px|s|%|deg|vh|vw|em|rem)?)/g, '<span class="token number">$1</span>')
      .replace(/(\.[a-zA-Z0-9_-]+)/g, '<span class="token selector">$1</span>')
      .replace(/([{}])/g, '<span class="token punctuation">$1</span>');
  }

  /* ================= 更新动画与代码 ================= */
  function updateAnimation() {
    if (!els.previewBox) return;

    var name = state.activePreset;
    var duration = state.duration + 's';
    var delay = state.delay + 's';

    // Keyframes
    var keyframesCSS = getKeyframesCSS(name);
    var styleId = 'ca-dynamic-keyframes';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = keyframesCSS;

    // 强制重绘以重新触发动画
    els.previewBox.style.animation = 'none';
    void els.previewBox.offsetWidth;

    var animStr = name + ' ' + duration + ' ' + state.timing + ' ' +
      delay + ' ' + state.iteration + ' ' + state.direction + ' ' + state.fillMode;
    els.previewBox.style.animation = animStr;
    els.previewBox.style.animationPlayState = state.isPaused ? 'paused' : 'running';

    // 生成代码
    var cssCode = '.element {\n' +
      '  animation: ' + animStr + ';\n' +
      '  display: inline-block;\n' +
      '  transform-origin: center;\n' +
      '}\n\n' +
      keyframesCSS;

    els.codeOutput.innerHTML = '<code>' + highlightCSS(cssCode) + '</code>';
    els.codeOutput.dataset.raw = cssCode;
  }

  /* ================= URL 同步 ================= */
  function updateURL() {
    try {
      var sp = new URLSearchParams();
      sp.set('p', state.activePreset);
      sp.set('d', state.duration);
      sp.set('dl', state.delay);
      sp.set('t', state.timing);
      sp.set('i', state.iteration);
      sp.set('dir', state.direction);
      sp.set('f', state.fillMode);
      if (state.shape !== 'rect') sp.set('s', state.shape);
      if (state.customText && state.customText !== '🎁') sp.set('txt', state.customText);
      var url = location.pathname + '?' + sp.toString();
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  function loadFromURL() {
    try {
      var sp = new URLSearchParams(location.search);
      if (!sp.has('p')) return false;
      var validNames = ALL_PRESETS.map(function (p) { return p.name; });
      if (validNames.indexOf(sp.get('p')) >= 0) state.activePreset = sp.get('p');
      if (sp.has('d')) state.duration = Math.max(0.1, Math.min(5, parseFloat(sp.get('d')) || 1));
      if (sp.has('dl')) state.delay = Math.max(0, Math.min(3, parseFloat(sp.get('dl')) || 0));
      if (sp.has('t')) {
        var t = sp.get('t');
        var validTimings = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out',
          'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          'cubic-bezier(0.175, 0.885, 0.32, 1.275)'];
        if (validTimings.indexOf(t) >= 0) state.timing = t;
      }
      if (sp.has('i')) state.iteration = sp.get('i');
      if (sp.has('dir')) state.direction = sp.get('dir');
      if (sp.has('f')) state.fillMode = sp.get('f');
      if (sp.has('s')) state.shape = sp.get('s');
      if (sp.has('txt')) state.customText = sp.get('txt');
      return true;
    } catch (e) { return false; }
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // 搜索
    els.search.addEventListener('input', function () {
      renderPresets(els.search.value);
    });

    // 筛选
    els.filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.filter = btn.dataset.filter;
      renderPresets(els.search.value);
    });

    // 重播 / 暂停
    els.btnReplay.addEventListener('click', function () {
      state.isPaused = false;
      els.btnPause.textContent = '⏸';
      updateAnimation();
    });
    els.btnPause.addEventListener('click', function () {
      state.isPaused = !state.isPaused;
      els.previewBox.style.animationPlayState = state.isPaused ? 'paused' : 'running';
      els.btnPause.textContent = state.isPaused ? '▶️' : '⏸';
      showToast(state.isPaused ? '⏸ 已暂停' : '▶️ 继续播放');
    });

    // 自定义内容
    els.textInput.addEventListener('input', function () {
      state.customText = els.textInput.value.trim() || '🎁';
      els.previewText.textContent = state.customText;
      updateAnimation();
      updateURL();
    });

    // 形状切换
    els.shapeSelect.addEventListener('change', function () {
      state.shape = this.value;
      updateShape();
      updateURL();
    });

    // 网格背景开关
    els.btnToggleGrid.addEventListener('click', function () {
      els.gridBg.classList.toggle('no-grid');
      this.classList.toggle('active', els.gridBg.classList.contains('no-grid'));
    });

    // 参数控制
    els.ctrlDuration.addEventListener('input', function () {
      state.duration = parseFloat(this.value);
      els.valDuration.textContent = state.duration + 's';
      updateAnimation();
      updateURL();
    });
    els.ctrlDelay.addEventListener('input', function () {
      state.delay = parseFloat(this.value);
      els.valDelay.textContent = state.delay + 's';
      updateAnimation();
      updateURL();
    });
    els.ctrlTiming.addEventListener('change', function () {
      state.timing = this.value;
      updateAnimation();
      updateURL();
    });
    els.ctrlIteration.addEventListener('change', function () {
      state.iteration = this.value;
      updateAnimation();
      updateURL();
    });
    els.ctrlDirection.addEventListener('change', function () {
      state.direction = this.value;
      updateAnimation();
      updateURL();
    });
    els.ctrlFillMode.addEventListener('change', function () {
      state.fillMode = this.value;
      updateAnimation();
      updateURL();
    });

    // 复制
    els.btnCopy.addEventListener('click', function () {
      var raw = els.codeOutput.dataset.raw || '';
      copyText(raw);
    });

    // 下载 .css
    els.btnDownloadCss.addEventListener('click', function () {
      var raw = els.codeOutput.dataset.raw || '';
      if (!raw) return;
      downloadFile(raw, 'animation-' + state.activePreset + '.css', 'text/css');
    });

    // 主题
    els.btnTheme.addEventListener('click', function () {
      theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
      applyTheme();
    });

    // 随机
    els.btnRandom.addEventListener('click', function () {
      var randomPreset = ALL_PRESETS[Math.floor(Math.random() * ALL_PRESETS.length)];
      var timings = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'];
      state.activePreset = randomPreset.name;
      state.duration = Math.round((0.4 + Math.random() * 1.6) * 10) / 10;
      state.delay = 0;
      state.timing = timings[Math.floor(Math.random() * timings.length)];
      state.iteration = Math.random() < 0.5 ? 'infinite' : String(Math.floor(Math.random() * 3) + 1);
      state.direction = Math.random() < 0.8 ? 'normal' : 'alternate';

      syncUIFromState();
      addToHistory(state.activePreset);
      renderPresets(els.search.value);
      renderDrawer();
      updateAnimation();
      updateURL();
      showToast('🎲 随机动画：' + randomPreset.label);
    });

    // 收藏
    els.btnFav.addEventListener('click', function () {
      toggleFavorite(state.activePreset);
    });

    // 分享
    els.btnShare.addEventListener('click', function () {
      updateURL();
      copyText(location.href);
    });

    // 导出独立 HTML
    els.btnExport.addEventListener('click', function () {
      exportAsHTML();
    });

    // 抽屉
    els.btnHistory.addEventListener('click', openDrawer);
    els.drawerClose.addEventListener('click', closeDrawer);
    els.drawerBackdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.drawer.classList.contains('open')) closeDrawer();
    });

    els.clearHistory.addEventListener('click', function () {
      if (!confirm('清空全部历史记录？收藏不受影响')) return;
      history = [];
      saveStorage();
      updateHistoryCount();
      renderDrawer();
      showToast('已清空历史');
    });

    // 抽屉内的点击
    els.drawer.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        var name = del.dataset.del;
        var idx = favorites.indexOf(name);
        if (idx >= 0) {
          favorites.splice(idx, 1);
          saveStorage();
          renderDrawer();
          renderPresets(els.search.value);
        }
        return;
      }
      var item = e.target.closest('.ca-drawer-item');
      if (!item) return;
      var n = item.dataset.name;
      if (!n) return;
      state.activePreset = n;
      addToHistory(n);
      renderPresets(els.search.value);
      renderDrawer();
      updateAnimation();
      updateURL();
      closeDrawer();
    });

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea, select')) return;
      if (els.drawer.classList.contains('open')) return;
      if (e.key === ' ') {
        e.preventDefault();
        els.btnReplay.click();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        els.btnRandom.click();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        els.btnFav.click();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        els.btnShare.click();
      }
    });
  }

  function openDrawer() {
    renderDrawer();
    els.drawerBackdrop.hidden = false;
    els.drawer.classList.add('open');
  }
  function closeDrawer() {
    els.drawerBackdrop.hidden = true;
    els.drawer.classList.remove('open');
  }

  /* ================= 形状更新 ================= */
  function updateShape() {
    els.previewBox.classList.remove('shape-rect', 'shape-rounded', 'shape-circle', 'shape-text', 'shape-img');
    els.previewBox.classList.add('shape-' + state.shape);
  }

  /* ================= 同步 UI ================= */
  function syncUIFromState() {
    els.ctrlDuration.value = state.duration;
    els.valDuration.textContent = state.duration + 's';
    els.ctrlDelay.value = state.delay;
    els.valDelay.textContent = state.delay + 's';
    els.ctrlTiming.value = state.timing;
    els.ctrlIteration.value = state.iteration;
    els.ctrlDirection.value = state.direction;
    els.ctrlFillMode.value = state.fillMode;
    els.shapeSelect.value = state.shape;
    els.textInput.value = state.customText;
    els.previewText.textContent = state.customText;
    updateShape();
  }

  /* ================= 下载文件 ================= */
  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('⬇️ 已下载 ' + filename);
  }

  /* ================= 导出独立 HTML ================= */
  function exportAsHTML() {
    var name = state.activePreset;
    var keyframes = getKeyframesCSS(name);
    var animStr = name + ' ' + state.duration + 's ' + state.timing + ' ' +
      state.delay + 's ' + state.iteration + ' ' + state.direction + ' ' + state.fillMode;

    var shapeCSS = '';
    var content = escapeHtml(state.customText);
    if (state.shape === 'circle') {
      shapeCSS = 'width: 160px; height: 160px; border-radius: 50%;';
    } else if (state.shape === 'rounded') {
      shapeCSS = 'width: 200px; height: 160px; border-radius: 32px;';
    } else if (state.shape === 'text') {
      shapeCSS = 'padding: 20px; background: transparent; color: #3d3226; font-size: 3rem; font-weight: 800;';
    } else if (state.shape === 'img') {
      shapeCSS = 'width: 200px; height: 200px; border-radius: 16px; background: url("https://picsum.photos/400/400") center/cover;';
    } else {
      shapeCSS = 'width: 220px; height: 160px; border-radius: 16px;';
    }

    var html = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>CSS Animation - ' + escapeHtml(name) + '</title>\n<style>\n' +
      'body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fdf8ec; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }\n' +
      '.stage { padding: 60px; }\n' +
      '.demo {\n' +
      '  display: flex;\n  align-items: center;\n  justify-content: center;\n' +
      '  background: linear-gradient(135deg, #c08a4c, #8a5a2b);\n' +
      '  color: #fff;\n  font-size: 2.5rem;\n  text-shadow: 0 2px 4px rgba(0,0,0,.2);\n' +
      '  ' + shapeCSS + '\n' +
      '  animation: ' + animStr + ';\n' +
      '  transform-origin: center;\n' +
      '}\n\n' +
      keyframes + '\n\n' +
      '.info { margin-top: 40px; text-align: center; color: #6b5d47; font-size: 0.9rem; }\n' +
      '.info code { background: #f1e7cf; padding: 2px 8px; border-radius: 4px; font-family: monospace; }\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="stage">\n' +
      '  <div class="demo">' + content + '</div>\n' +
      '  <div class="info">\n' +
      '    <p>预设：<code>' + escapeHtml(name) + '</code> · 时长：<code>' + state.duration + 's</code> · 循环：<code>' + state.iteration + '</code></p>\n' +
      '    <p>由「CSS 动画生成器」生成</p>\n' +
      '  </div>\n' +
      '</div>\n</body>\n</html>';

    downloadFile(html, 'animation-' + name + '.html', 'text/html');
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheEls();
    applyTheme();
    loadStorage();

    var fromURL = loadFromURL();

    if (!fromURL) {
      // 默认动画
      state.activePreset = 'bounce';
    }

    syncUIFromState();
    bindEvents();

    // 主题按钮绑定（在此之前 applyTheme 需要用到 btnTheme）
    els.btnTheme.addEventListener('click', function () { /* 已在 bindEvents 中绑定 */ });

    renderPresets('');
    renderDrawer();
    updateAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();