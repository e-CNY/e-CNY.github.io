(function () {
  // ================= 1. 进制转换 (BigInt) =================
  var b10 = document.getElementById('base-10');
  var b16 = document.getElementById('base-16');
  var b2 = document.getElementById('base-2');
  var b8 = document.getElementById('base-8');

  function updateBase(sourceId, value, fromBase) {
    if (!value) {
      b10.value = b16.value = b2.value = b8.value = '';
      return;
    }
    try {
      var num = BigInt(parseInt(value, fromBase) || 0);
      if (sourceId !== 'base-10') b10.value = num.toString(10);
      if (sourceId !== 'base-16') b16.value = num.toString(16).toUpperCase();
      if (sourceId !== 'base-2') b2.value = num.toString(2);
      if (sourceId !== 'base-8') b8.value = num.toString(8);
    } catch (e) {
      // 忽略非法输入
    }
  }

  b10.addEventListener('input', function() { updateBase('base-10', this.value, 10); });
  b16.addEventListener('input', function() { updateBase('base-16', this.value, 16); });
  b2.addEventListener('input', function() { updateBase('base-2', this.value, 2); });
  b8.addEventListener('input', function() { updateBase('base-8', this.value, 8); });

  // ================= 2. 单位换算 =================
  var unitType = document.getElementById('unit-type');
  var unitFrom = document.getElementById('unit-from');
  var unitTo = document.getElementById('unit-to');
  var unitInput = document.getElementById('unit-input');
  var unitResult = document.getElementById('unit-result');

  var unitsData = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.34, foot: 0.3048, inch: 0.0254 },
    weight: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.453592, oz: 0.0283495 },
    storage: { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024, TB: 1024*1024*1024*1024 }
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
    unitTo.selectedIndex = 1; // 默认选第二个
    calculateUnit();
  }

  function calculateUnit() {
    var type = unitType.value;
    var from = unitFrom.value;
    var to = unitTo.value;
    var val = parseFloat(unitInput.value) || 0;
    var baseVal = val * unitsData[type][from];
    var finalVal = baseVal / unitsData[type][to];
    unitResult.textContent = finalVal.toPrecision(6).replace(/\.?0+$/, '') + ' ' + to;
  }

  unitType.addEventListener('change', updateUnits);
  unitFrom.addEventListener('change', calculateUnit);
  unitTo.addEventListener('change', calculateUnit);
  unitInput.addEventListener('input', calculateUnit);
  updateUnits(); // 初始化

  // ================= 3. 人民币大写 =================
  document.getElementById('btn-rmb').addEventListener('click', function () {
    var n = parseFloat(document.getElementById('rmb-input').value);
    var resBox = document.getElementById('rmb-result');
    if (isNaN(n) || n < 0 || n > 999999999999.99) {
      resBox.textContent = '请输入 0 ~ 9999亿 以内的合法金额';
      return;
    }

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
    
    resBox.textContent = head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
  });

  // ================= 4. 罗马数字 =================
  function toRoman(num) {
    if (num <= 0 || num >= 4000) return '';
    var lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 };
    var roman = '';
    for (var i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  }

  document.getElementById('roman-input').addEventListener('input', function () {
    var val = parseInt(this.value, 10);
    document.getElementById('roman-output').value = isNaN(val) ? '' : toRoman(val);
  });
  
  // 初始化罗马数字
  document.getElementById('roman-input').dispatchEvent(new Event('input'));

  // 自动触发一次大写金额转换
  document.getElementById('btn-rmb').click();

})();