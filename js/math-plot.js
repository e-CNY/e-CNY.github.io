(function () {
  var funcInput = document.getElementById('mp-func');
  var plotArea = document.getElementById('plot-area');

  function drawPlot() {
    var expr = funcInput.value;
    var xValues = [], yValues = [];
    
    // 生成 X 轴数据 (-10 到 10)
    for (var x = -10; x <= 10; x += 0.1) {
      xValues.push(x);
      try {
        // 安全执行用户输入的数学表达式（仅限含 Math. 的表达式）
        var y = Function('"use strict"; var x=' + x + '; return ' + expr + ';')();
        yValues.push(y);
      } catch (e) {
        yValues.push(null); // 表达式错误或产生 NaN 时置空
      }
    }

    var trace = {
      x: xValues,
      y: yValues,
      mode: 'lines',
      type: 'scatter',
      line: { color: '#8a5a2b', width: 3 }
    };

    var layout = {
      title: 'y = ' + expr,
      xaxis: { title: 'x', zeroline: true, zerolinecolor: '#999' },
      yaxis: { title: 'y', zeroline: true, zerolinecolor: '#999' },
      margin: { t: 40, b: 40, l: 40, r: 40 },
      hovermode: 'closest'
    };

    Plotly.newPlot(plotArea, [trace], layout, { responsive: true });
  }

  document.getElementById('btn-plot').addEventListener('click', drawPlot);
  funcInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') drawPlot();
  });

  drawPlot();
})();