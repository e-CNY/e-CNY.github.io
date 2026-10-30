(function () {
  // 1. 科学计算
  document.getElementById('btn-calc').addEventListener('click', function () {
    var expr = document.getElementById('calc-expr').value;
    // 安全替换，防止 XSS 和意外执行
    expr = expr.replace(/[^-()\d/*+.]/g, '');
    try {
      var res = Function('"use strict";return (' + expr + ')')();
      document.getElementById('calc-res').textContent = '= ' + res;
    } catch (e) {
      document.getElementById('calc-res').textContent = '表达式错误';
    }
  });

  // 2. 统计计算
  document.getElementById('btn-stat').addEventListener('click', function () {
    var str = document.getElementById('stat-input').value;
    var arr = str.split(/[\s,]+/).filter(Boolean).map(Number);
    var resEl = document.getElementById('stat-res');
    if (arr.length === 0 || arr.some(isNaN)) {
      resEl.innerHTML = '<span style="color:#a8452a;">请输入有效数字</span>'; return;
    }
    var sum = arr.reduce(function (a, b) { return a + b; }, 0);
    var avg = sum / arr.length;
    var sorted = [...arr].sort(function(a, b) { return a - b; });
    var median = sorted.length % 2 === 0 ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 : sorted[Math.floor(sorted.length/2)];
    var min = Math.min(...arr); var max = Math.max(...arr);
    
    resEl.innerHTML = '总和: ' + sum + '<br>均值: ' + avg.toFixed(2) + '<br>中位数: ' + median + '<br>最小: ' + min + '<br>最大: ' + max;
  });

  // 3. 房贷计算 (等额本息)
  document.getElementById('btn-loan').addEventListener('click', function () {
    var amount = parseFloat(document.getElementById('loan-amount').value) * 10000;
    var rate = parseFloat(document.getElementById('loan-rate').value) / 100 / 12;
    var months = parseInt(document.getElementById('loan-years').value) * 12;
    var resEl = document.getElementById('loan-res');
    
    if (!amount || !months) { resEl.innerHTML = '参数不能为空'; return; }
    
    if (rate === 0) {
      var m = amount / months;
      resEl.innerHTML = '月供: ' + m.toFixed(2) + ' 元<br>总利息: 0 元';
      return;
    }
    var monthly = amount * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
    var total = monthly * months;
    var interest = total - amount;
    resEl.innerHTML = '每月月供: <b>' + monthly.toFixed(2) + '</b> 元<br>总利息: ' + interest.toFixed(2) + ' 元<br>总还款: ' + total.toFixed(2) + ' 元';
  });

  // 4. 分页计算
  document.getElementById('btn-pg').addEventListener('click', function () {
    var cur = parseInt(document.getElementById('pg-current').value, 10);
    var size = parseInt(document.getElementById('pg-size').value, 10);
    var resEl = document.getElementById('pg-res');
    if (cur < 1 || size < 1) { resEl.innerHTML = '页码和条数必须大于0'; return; }
    var offset = (cur - 1) * size;
    resEl.innerHTML = 'SQL 示例: <br><code>SELECT * FROM table LIMIT ' + size + ' OFFSET ' + offset + ';</code>';
  });
})();