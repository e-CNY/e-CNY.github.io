(function () {
  // 隐藏的 SVG 色盲滤镜矩阵
  var svgFilter = `
    <svg style="display:none;">
      <filter id="protanopia">
        <feColorMatrix type="matrix" values="0.567,0.433,0,0,0  0.558,0.442,0,0,0  0,0.242,0.758,0,0  0,0,0,1,0"/>
      </filter>
      <filter id="deuteranopia">
        <feColorMatrix type="matrix" values="0.625,0.375,0,0,0  0.7,0.3,0,0,0  0,0.3,0.7,0,0  0,0,0,1,0"/>
      </filter>
      <filter id="tritanopia">
        <feColorMatrix type="matrix" values="0.95,0.05,0,0,0  0,0.433,0.567,0,0  0,0.475,0.525,0,0  0,0,0,1,0"/>
      </filter>
    </svg>`;
  document.body.insertAdjacentHTML('beforeend', svgFilter);

  var picker = document.getElementById('color-picker');
  var preview = document.getElementById('color-preview');
  var inHex = document.getElementById('in-hex');
  var inRgb = document.getElementById('in-rgb');
  var inHsl = document.getElementById('in-hsl');
  
  var wcagText = document.getElementById('wcag-text-preview');
  var wcagRatio = document.getElementById('wcag-ratio');
  var wcagAA = document.getElementById('wcag-aa');
  var wcagAAA = document.getElementById('wcag-aaa');

  var simPro = document.getElementById('sim-protanopia');
  var simDeu = document.getElementById('sim-deuteranopia');
  var simTri = document.getElementById('sim-tritanopia');

  // HEX 转 RGB
  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  // RGB 转 HEX
  function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
  }

  // RGB 转 HSL
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
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

  // 计算对比度
  function getLuminance(r, g, b) {
    var a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function updateColor(hex) {
    if(!/^#[0-9A-F]{6}$/i.test(hex)) return;
    
    picker.value = hex;
    preview.style.background = hex;
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    inHex.value = hex;
    inRgb.value = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
    inHsl.value = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';

    // 更新 WCAG
    wcagText.style.color = hex;
    var L1 = getLuminance(rgb.r, rgb.g, rgb.b);
    var L2 = getLuminance(255, 255, 255); // 白底
    var ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    
    wcagRatio.textContent = ratio.toFixed(2);
    
    wcagAA.innerHTML = ratio >= 4.5 ? '<span class="pass">✅ 通过</span>' : '<span class="fail">❌ 未通过</span>';
    wcagAAA.innerHTML = ratio >= 7 ? '<span class="pass">✅ 通过</span>' : '<span class="fail">❌ 未通过</span>';

    // 色盲模拟（直接修改滤镜计算后的背景）
    simPro.style.background = hex;
    simPro.className = 'cl-blind-preview blind-protanopia';
    simDeu.style.background = hex;
    simDeu.className = 'cl-blind-preview blind-deuteranopia';
    simTri.style.background = hex;
    simTri.className = 'cl-blind-preview blind-tritanopia';
  }

  picker.addEventListener('input', function() { updateColor(this.value); });
  
  inHex.addEventListener('input', function() {
    var val = this.value;
    if(val.indexOf('#') !== 0) val = '#' + val;
    if(/^#[0-9A-F]{6}$/i.test(val)) updateColor(val);
  });

  // 初始化
  updateColor('#7ba05b');
})();