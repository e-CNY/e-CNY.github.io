(function () {
  // ================= 1. 万能进制 =================
  var b10 = document.getElementById('base-10');
  var b16 = document.getElementById('base-16');
  var b2 = document.getElementById('base-2');
  var b8 = document.getElementById('base-8');
  var bCustomN = document.getElementById('base-custom-n');
  var bCustom = document.getElementById('base-custom');

  function updateBase(sourceId, value, fromBase) {
    if (!value) {
      b10.value = b16.value = b2.value = b8.value = bCustom.value = '';
      return;
    }
    try {
      var num = BigInt(parseInt(value, fromBase) || 0);
      if (sourceId !== 'base-10') b10.value = num.toString(10);
      if (sourceId !== 'base-16') b16.value = num.toString(16).toUpperCase();
      if (sourceId !== 'base-2') b2.value = num.toString(2);
      if (sourceId !== 'base-8') b8.value = num.toString(8);
      
      var customN = parseInt(bCustomN.value, 10) || 36;
      if (sourceId !== 'base-custom') bCustom.value = num.toString(customN).toUpperCase();
    } catch (e) {}
  }

  b10.addEventListener('input', function() { updateBase('base-10', this.value, 10); });
  b16.addEventListener('input', function() { updateBase('base-16', this.value, 16); });
  b2.addEventListener('input', function() { updateBase('base-2', this.value, 2); });
  b8.addEventListener('input', function() { updateBase('base-8', this.value, 8); });
  bCustom.addEventListener('input', function() { 
    var n = parseInt(bCustomN.value, 10) || 36;
    updateBase('base-custom', this.value, n); 
  });
  bCustomN.addEventListener('input', function() { updateBase('base-10', b10.value, 10); });

  // ================= 2. 物理与开发单位 =================
  var unitType = document.getElementById('unit-type');
  var unitFrom = document.getElementById('unit-from');
  var unitTo = document.getElementById('unit-to');
  var unitInput = document.getElementById('unit-input');
  var unitResult = document.getElementById('unit-result');
  var devRootRow = document.getElementById('dev-root-row');
  var devRootSize = document.getElementById('dev-root-size');

  var unitsData = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.34, foot: 0.3048, inch: 0.0254 },
    weight: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.453592, oz: 0.0283495 },
    storage: { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024, TB: 1024*1024*1024*1024 },
    temperature: { '℃': 1, '℉': 1, 'K': 1 }, // 特殊处理
    speed: { 'km/h': 1, 'm/s': 3.6, 'mph': 1.60934 },
    area: { 'm²': 1, '亩': 666.667, '公顷': 10000, 'km²': 1000000 },
    dev: { 'px': 1, 'rem': 1, 'em': 1 } // 特殊处理
  };

  function updateUnits() {
    var type = unitType.value;
    var data = unitsData[type];
    var keys = Object.keys(data);
    
    unitFrom.innerHTML = '';
    unitTo.innerHTML = '';
    keys.forEach(function(k) {
      unitFrom.add(new Option(k, k));
      unitTo.add(new Option(k, k));
    });
    unitTo.selectedIndex = Math.min(1, keys.length - 1);
    devRootRow.style.display = type === 'dev' ? 'flex' : 'none';
    calculateUnit();
  }

  function calculateUnit() {
    var type = unitType.value;
    var from = unitFrom.value;
    var to = unitTo.value;
    var val = parseFloat(unitInput.value) || 0;
    var finalVal = 0;

    if (type === 'temperature') {
      // 先转为摄氏度
      var c = val;
      if (from === '℉') c = (val - 32) * 5 / 9;
      if (from === 'K') c = val - 273.15;
      
      // 再转为目标
      finalVal = c;
      if (to === '℉') finalVal = c * 9 / 5 + 32;
      if (to === 'K') finalVal = c + 273.15;
    } 
    else if (type === 'dev') {
      var root = parseFloat(devRootSize.value) || 16;
      // 全转成 px
      var px = val;
      if (from === 'rem') px = val * root;
      if (from === 'em') px = val * root; // 简化处理，em 默认与 rem 同根
      
      // 转目标
      finalVal = px;
      if (to === 'rem') finalVal = px / root;
      if (to === 'em') finalVal = px / root;
    } 
    else {
      var baseVal = val * unitsData[type][from];
      finalVal = baseVal / unitsData[type][to];
    }
    
    unitResult.textContent = finalVal.toPrecision(6).replace(/\.?0+$/, '') + ' ' + to;
  }

  unitType.addEventListener('change', updateUnits);
  unitFrom.addEventListener('change', calculateUnit);
  unitTo.addEventListener('change', calculateUnit);
  unitInput.addEventListener('input', calculateUnit);
  devRootSize.addEventListener('input', calculateUnit);
  updateUnits();

  // ================= 3. 中文数字与金额 =================
  function toChineseMoney(n) {
    var fraction = ['角', '分'];
    var digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    var unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']];
    var head = n < 0 ? '欠' : '';
    n = Math.abs(n);
    var s = '';
    for (var i = 0; i < fraction.length; i++) {
      s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    n = Math.floor(n);
    for (var i = 0; i < unit[0].length && n > 0; i++) {
      var p = '';
      for (var j = 0; j < unit[1].length && n > 0; j++) {
        p = digit[n % 10] + unit[1][j] + p;
        n = Math.floor(n / 10);
      }
      s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  }

  document.getElementById('btn-cn-num').addEventListener('click', function () {
    var val = parseFloat(document.getElementById('cn-num-input').value);
    if (isNaN(val)) return;
    document.getElementById('cn-num-result').textContent = toChineseMoney(val);
  });

  function toArabicNum(cn) {
    var cnNums = { '零':0, '一':1, '二':2, '两':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
    var cnUnits = { '十':10, '百':100, '千':1000, '万':10000, '亿':100000000 };
    var result = 0, section = 0, number = 0;
    for (var i = 0; i < cn.length; i++) {
      var c = cn[i];
      if (cnNums[c] !== undefined) {
        number = cnNums[c];
      } else if (cnUnits[c] !== undefined) {
        var unit = cnUnits[c];
        if (unit >= 10000) {
          section = (section + number) * unit;
          result += section;
          section = 0;
        } else {
          section += (number === 0 ? 1 : number) * unit;
        }
        number = 0;
      }
    }
    return result + section + number;
  }

  document.getElementById('btn-cn-str').addEventListener('click', function () {
    var val = document.getElementById('cn-str-input').value.trim();
    if (!val) return;
    document.getElementById('cn-str-result').textContent = toArabicNum(val);
  });

  // ================= 4. 罗马数字 =================
  function toRoman(num) {
    if (num <= 0 || num >= 4000) return '';
    var lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 };
    var roman = '';
    for (var i in lookup) {
      while (num >= lookup[i]) { roman += i; num -= lookup[i]; }
    }
    return roman;
  }
  document.getElementById('roman-input').addEventListener('input', function () {
    var val = parseInt(this.value, 10);
    document.getElementById('roman-output').value = isNaN(val) ? '' : toRoman(val);
  });
  document.getElementById('roman-input').dispatchEvent(new Event('input'));

})();