(function () {
  // 通用绑定
  function bind(id, fn) { document.getElementById(id).addEventListener('click', fn); }
  
  // 1. 科学计算
  bind('btn-calc', function () {
    var expr = document.getElementById('calc-expr').value.replace(/[^-()\d/*+.]/g, '');
    try {
      var res = Function('"use strict";return (' + expr + ')')();
      document.getElementById('calc-res').textContent = '= ' + res;
    } catch (e) {
      document.getElementById('calc-res').textContent = '表达式错误';
    }
  });

  // 2. 统计计算
  bind('btn-stat', function () {
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
  bind('btn-loan', function () {
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
  bind('btn-pg', function () {
    var cur = parseInt(document.getElementById('pg-current').value, 10);
    var size = parseInt(document.getElementById('pg-size').value, 10);
    var resEl = document.getElementById('pg-res');
    if (cur < 1 || size < 1) { resEl.innerHTML = '页码和条数必须大于0'; return; }
    var offset = (cur - 1) * size;
    resEl.innerHTML = 'SQL 示例: <br><code>SELECT * FROM table LIMIT ' + size + ' OFFSET ' + offset + ';</code>';
  });

  // 5. 复利/存款计算
  bind('btn-ci', function () {
    var P = parseFloat(document.getElementById('ci-p').value);
    var r = parseFloat(document.getElementById('ci-r').value) / 100;
    var t = parseFloat(document.getElementById('ci-t').value);
    var resEl = document.getElementById('ci-res');
    if(!P || !r || !t) { resEl.innerHTML = '参数不能为空'; return; }
    
    // 按年复利公式 A = P(1+r)^t
    var A = P * Math.pow(1 + r, t);
    var interest = A - P;
    resEl.innerHTML = '最终本息合计: <b>' + A.toFixed(2) + '</b> 元<br>获得利息: ' + interest.toFixed(2) + ' 元';
  });

  // 6. 股票补仓计算
  bind('btn-stock', function () {
    var q1 = parseFloat(document.getElementById('st-qty1').value) || 0;
    var c1 = parseFloat(document.getElementById('st-cost1').value) || 0;
    var q2 = parseFloat(document.getElementById('st-qty2').value) || 0;
    var c2 = parseFloat(document.getElementById('st-cost2').value) || 0;
    var resEl = document.getElementById('st-res');
    if(q1 + q2 === 0) { resEl.innerHTML = '总股数不能为0'; return; }
    
    var totalCost = (q1 * c1) + (q2 * c2);
    var newCost = totalCost / (q1 + q2);
    resEl.innerHTML = '总投入成本: ' + totalCost.toFixed(2) + ' 元<br>补仓后摊薄成本价: <b>' + newCost.toFixed(3) + '</b> 元';
  });

  // 7. 基金定投计算 (期末年金公式)
  bind('btn-dca', function () {
    var Pmt = parseFloat(document.getElementById('dca-m').value);
    var r = parseFloat(document.getElementById('dca-r').value) / 100 / 12;
    var n = parseFloat(document.getElementById('dca-y').value) * 12;
    var resEl = document.getElementById('dca-res');
    if(!Pmt || !n) { resEl.innerHTML = '参数不能为空'; return; }

    var FV;
    if(r === 0) {
      FV = Pmt * n;
    } else {
      FV = Pmt * (Math.pow(1 + r, n) - 1) / r;
    }
    var principal = Pmt * n;
    var interest = FV - principal;
    resEl.innerHTML = '累计投入本金: ' + principal.toFixed(2) + ' 元<br>预计期末总资产: <b>' + FV.toFixed(2) + '</b> 元<br>预计总收益: ' + interest.toFixed(2) + ' 元';
  });

  // 8. 投资回报率 (ROI)
  bind('btn-roi', function () {
    var cost = parseFloat(document.getElementById('roi-cost').value);
    var val = parseFloat(document.getElementById('roi-value').value);
    var resEl = document.getElementById('roi-res');
    if(!cost || cost === 0) { resEl.innerHTML = '初始投入不能为0'; return; }

    var profit = val - cost;
    var roi = (profit / cost) * 100;
    var color = roi >= 0 ? '#7ba05b' : '#a8452a';
    resEl.innerHTML = '净利润: <span style="color:'+color+'">' + profit.toFixed(2) + ' 元</span><br>投资回报率 (ROI): <b style="color:'+color+'">' + roi.toFixed(2) + '%</b>';
  });

  // 9. 个人所得税
  bind('btn-tax', function () {
    var salary = parseFloat(document.getElementById('tax-salary').value);
    var deduct = parseFloat(document.getElementById('tax-deduct').value) || 0;
    var resEl = document.getElementById('tax-res');
    if(!salary) { resEl.innerHTML = '请输入月薪'; return; }
    
    var taxable = salary - deduct - 5000; // 起征点5000
    if (taxable <= 0) {
      resEl.innerHTML = '免税额度内，到手工资: <b>' + salary.toFixed(2) + '</b> 元';
      return;
    }
    
    var tax = 0;
    if (taxable <= 3000) tax = taxable * 0.03;
    else if (taxable <= 12000) tax = taxable * 0.1 - 210;
    else if (taxable <= 25000) tax = taxable * 0.2 - 1410;
    else if (taxable <= 35000) tax = taxable * 0.25 - 2660;
    else if (taxable <= 55000) tax = taxable * 0.3 - 4410;
    else if (taxable <= 80000) tax = taxable * 0.35 - 7160;
    else tax = taxable * 0.45 - 15160;

    var netSalary = salary - deduct - tax;
    resEl.innerHTML = '应缴个税: ' + tax.toFixed(2) + ' 元<br>实际到手工资: <b style="color:#7ba05b">' + netSalary.toFixed(2) + '</b> 元';
  });

  // 10. 打折计算
  bind('btn-discount', function () {
    var price = parseFloat(document.getElementById('ds-price').value);
    var rate = parseFloat(document.getElementById('ds-rate').value);
    var resEl = document.getElementById('ds-res');
    if(!price || !rate) { resEl.innerHTML = '参数不能为空'; return; }
    
    var finalPrice = price * (rate / 10);
    var save = price - finalPrice;
    resEl.innerHTML = '折后价格: <b>' + finalPrice.toFixed(2) + '</b> 元<br>为您节省: <span style="color:#a8452a">' + save.toFixed(2) + '</span> 元';
  });

})();