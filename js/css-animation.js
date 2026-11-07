/* js/css-animation.js */
(function () {
  'use strict';

  /* ================= 预设动画数据 (扩充版) ================= */
  var PRESETS = [
    {
      group: 'Attention Seekers (吸引注意)',
      items: [
        { name: 'bounce', label: '弹跳 (Bounce)' },
        { name: 'flash', label: '闪烁 (Flash)' },
        { name: 'pulse', label: '脉冲放大 (Pulse)' },
        { name: 'rubberBand', label: '橡皮筋 (Rubber Band)' },
        { name: 'shakeX', label: '左右抖动 (Shake X)' },
        { name: 'shakeY', label: '上下抖动 (Shake Y)' },
        { name: 'headShake', label: '摇头 (Head Shake)' },
        { name: 'swing', label: '摇摆 (Swing)' },
        { name: 'tada', label: '惊叹 (Tada)' },
        { name: 'wobble', label: '摇晃 (Wobble)' },
        { name: 'jello', label: '果冻 (Jello)' },
        { name: 'heartBeat', label: '心跳 (Heart Beat)' }
      ]
    },
    {
      group: 'Fading (淡入淡出)',
      items: [
        { name: 'fadeIn', label: '淡入 (Fade In)' },
        { name: 'fadeInUp', label: '向上淡入 (Fade In Up)' },
        { name: 'fadeInDown', label: '向下淡入 (Fade In Down)' },
        { name: 'fadeInLeft', label: '向右淡入 (Fade In Left)' },
        { name: 'fadeInRight', label: '向左淡入 (Fade In Right)' },
        { name: 'fadeOut', label: '淡出 (Fade Out)' },
        { name: 'fadeOutUp', label: '向上淡出 (Fade Out Up)' },
        { name: 'fadeOutDown', label: '向下淡出 (Fade Out Down)' }
      ]
    },
    {
      group: 'Zoom (缩放)',
      items: [
        { name: 'zoomIn', label: '放大进入 (Zoom In)' },
        { name: 'zoomInUp', label: '向上放大进入' },
        { name: 'zoomInDown', label: '向下放大进入' },
        { name: 'zoomOut', label: '缩小退出 (Zoom Out)' },
        { name: 'zoomOutUp', label: '向上缩小退出' }
      ]
    },
    {
      group: 'Slide (滑动)',
      items: [
        { name: 'slideInUp', label: '向上滑入 (Slide In Up)' },
        { name: 'slideInDown', label: '向下滑入 (Slide In Down)' },
        { name: 'slideInLeft', label: '向右滑入 (Slide In Left)' },
        { name: 'slideInRight', label: '向左滑入 (Slide In Right)' },
        { name: 'slideOutUp', label: '向上滑出 (Slide Out Up)' },
        { name: 'slideOutDown', label: '向下滑出 (Slide Out Down)' }
      ]
    },
    {
      group: 'Rotate & Flip (旋转与翻转)',
      items: [
        { name: 'rotateIn', label: '旋转进入 (Rotate In)' },
        { name: 'rotateInDownLeft', label: '左下旋转进入' },
        { name: 'rotateInUpRight', label: '右上旋转进入' },
        { name: 'rotateOut', label: '旋转退出 (Rotate Out)' },
        { name: 'flip', label: '3D 翻转 (Flip)' },
        { name: 'flipInX', label: 'X轴翻转进入 (Flip X)' },
        { name: 'flipInY', label: 'Y轴翻转进入 (Flip Y)' }
      ]
    },
    {
      group: 'Back & Special (回弹与特殊)',
      items: [
        { name: 'backInDown', label: '向下回弹进入' },
        { name: 'backInUp', label: '向上回弹进入' },
        { name: 'backOutUp', label: '向上回弹退出' },
        { name: 'lightSpeedInRight', label: '光速向右进入' },
        { name: 'lightSpeedOutRight', label: '光速向右退出' }
      ]
    }
  ];

  /* ================= Keyframes 生成器 ================= */
  function getKeyframesCSS(name) {
    var k = '';
    switch(name) {
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
      default: k = `from { opacity: 0; }\nto { opacity: 1; }`;
    }
    return `@keyframes ${name} {\n  ${k.split('\n').join('\n  ')}\n}`;
  }

  /* ================= 状态管理 ================= */
  var state = {
    activePreset: 'bounce',
    duration: 1,
    delay: 0,
    timing: 'ease',
    iteration: 'infinite',
    direction: 'normal',
    fillMode: 'none'
  };

  var els = {
    presetList: document.getElementById('ca-preset-list'),
    search: document.getElementById('ca-search'),
    previewBox: document.getElementById('ca-preview-box'),
    previewText: document.getElementById('ca-preview-text'),
    btnReplay: document.getElementById('ca-btn-replay'),
    textInput: document.getElementById('ca-text-input'),
    
    ctrlDuration: document.getElementById('ctrl-duration'),
    valDuration: document.getElementById('val-duration'),
    ctrlDelay: document.getElementById('ctrl-delay'),
    valDelay: document.getElementById('val-delay'),
    ctrlTiming: document.getElementById('ctrl-timing'),
    ctrlIteration: document.getElementById('ctrl-iteration'),
    ctrlDirection: document.getElementById('ctrl-direction'),
    ctrlFillMode: document.getElementById('ctrl-fill-mode'),
    
    codeOutput: document.getElementById('ca-code-output'),
    btnCopy: document.getElementById('ca-btn-copy')
  };

  /* ================= 渲染左侧列表 ================= */
  function renderPresets(filter) {
    filter = (filter || '').toLowerCase();
    els.presetList.innerHTML = '';

    PRESETS.forEach(function (group) {
      var groupMatched = group.items.filter(function (item) {
        return item.name.toLowerCase().indexOf(filter) !== -1 || item.label.indexOf(filter) !== -1 || group.group.toLowerCase().indexOf(filter) !== -1;
      });

      if (groupMatched.length === 0) return;

      var groupEl = document.createElement('div');
      groupEl.className = 'ca-preset-group';

      var titleEl = document.createElement('div');
      titleEl.className = 'ca-preset-title';
      titleEl.textContent = group.group;
      groupEl.appendChild(titleEl);

      groupMatched.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ca-preset-btn' + (item.name === state.activePreset ? ' active' : '');
        btn.textContent = item.label;
        btn.dataset.name = item.name;
        btn.addEventListener('click', function () {
          state.activePreset = item.name;
          renderPresets(els.search.value);
          updateAnimation();
        });
        groupEl.appendChild(btn);
      });

      els.presetList.appendChild(groupEl);
    });
  }

  /* ================= 代码高亮函数 ================= */
  function highlightCSS(code) {
    return code
      .replace(/@keyframes\s+([a-zA-Z0-9_-]+)/g, '<span class="token atrule">@keyframes</span> <span class="token selector">$1</span>')
      .replace(/([a-zA-Z-]+)\s*:/g, '<span class="token property">$1</span><span class="token punctuation">:</span>')
      .replace(/(\d+\.?\d*(?:px|s|%|deg|vh|vw)?)/g, '<span class="token number">$1</span>')
      .replace(/(\.[a-zA-Z0-9_-]+)/g, '<span class="token selector">$1</span>')
      .replace(/([{}])/g, '<span class="token punctuation">$1</span>');
  }

  /* ================= 更新动画与代码 ================= */
  function updateAnimation() {
    var name = state.activePreset;
    var duration = state.duration + 's';
    var delay = state.delay + 's';
    var timing = state.timing;
    var iteration = state.iteration;
    var direction = state.direction;
    var fillMode = state.fillMode;

    // 1. 重新生成 Keyframes
    var keyframesCSS = getKeyframesCSS(name);
    
    // 2. 将动画注入到页面
    var styleId = 'ca-dynamic-keyframes';
    var styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = keyframesCSS;

    // 3. 触发重播 (Force Reflow)
    els.previewBox.style.animation = 'none';
    void els.previewBox.offsetWidth; // 触发重绘
    
    // 组合完整的 animation 字符串
    var animStr = name + ' ' + duration + ' ' + timing + ' ' + delay + ' ' + iteration + ' ' + direction + ' ' + fillMode;
    els.previewBox.style.animation = animStr;

    // 4. 生成输出代码 (并格式化)
    var cssCode = '.element {\n' +
                  '  animation: ' + animStr + ';\n' +
                  '  /* 建议配合以下属性使用 */\n' +
                  '  transform-origin: center;\n' +
                  '  display: inline-block;\n' +
                  '}\n\n' +
                  keyframesCSS;

    // 5. 应用高亮
    els.codeOutput.innerHTML = highlightCSS(cssCode);
    
    // 保存原始纯文本用于复制
    els.codeOutput.dataset.raw = cssCode;
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // 搜索
    els.search.addEventListener('input', function () {
      renderPresets(els.search.value);
    });

    // 预览重播
    els.btnReplay.addEventListener('click', updateAnimation);

    // 自定义内容
    els.textInput.addEventListener('input', function () {
      var v = els.textInput.value.trim() || '🎁';
      els.previewText.textContent = v;
      // 重新播放一下，避免文本变长后动画不触发
      updateAnimation();
    });

    // 时长
    els.ctrlDuration.addEventListener('input', function () {
      state.duration = parseFloat(this.value);
      els.valDuration.textContent = state.duration + 's';
      updateAnimation();
    });

    // 延迟
    els.ctrlDelay.addEventListener('input', function () {
      state.delay = parseFloat(this.value);
      els.valDelay.textContent = state.delay + 's';
      updateAnimation();
    });

    // 以下皆为 Select 选项
    els.ctrlTiming.addEventListener('change', function () { state.timing = this.value; updateAnimation(); });
    els.ctrlIteration.addEventListener('change', function () { state.iteration = this.value; updateAnimation(); });
    els.ctrlDirection.addEventListener('change', function () { state.direction = this.value; updateAnimation(); });
    els.ctrlFillMode.addEventListener('change', function () { state.fillMode = this.value; updateAnimation(); });

    // 复制
    els.btnCopy.addEventListener('click', function () {
      var rawCode = els.codeOutput.dataset.raw || els.codeOutput.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawCode).then(function () {
          var original = els.btnCopy.textContent;
          els.btnCopy.textContent = '✅ 已复制';
          setTimeout(function () { els.btnCopy.textContent = original; }, 1500);
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = rawCode;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        var original2 = els.btnCopy.textContent;
        els.btnCopy.textContent = '✅ 已复制';
        setTimeout(function () { els.btnCopy.textContent = original2; }, 1500);
      }
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    renderPresets('');
    bindEvents();
    updateAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();