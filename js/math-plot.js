(function () {
  var typeSelect = document.getElementById('mp-type');
  var inputsArea = document.getElementById('mp-inputs');
  var plotArea = document.getElementById('plot-area');

  // ================= 1. 动态渲染输入框 =================
  function renderInputs() {
    var type = typeSelect.value;
    inputsArea.innerHTML = '';

    if (type === 'explicit') {
      inputsArea.innerHTML = `
        <div class="mp-input-row">
          <label>y =</label>
          <input type="text" id="expr-1" class="mp-input" value="Math.sin(x) + Math.cos(x * 2)">
        </div>
        <div class="mp-range-row">
          <label>x 范围:</label>
          <input type="number" id="range-xmin" class="mp-range-input" value="-10">
          <span>至</span>
          <input type="number" id="range-xmax" class="mp-range-input" value="10">
        </div>
      `;
    } 
    else if (type === 'parametric') {
      inputsArea.innerHTML = `
        <div class="mp-input-row">
          <label>x(t) =</label>
          <input type="text" id="expr-x" class="mp-input" value="Math.cos(3 * t)">
        </div>
        <div class="mp-input-row">
          <label>y(t) =</label>
          <input type="text" id="expr-y" class="mp-input" value="Math.sin(4 * t)">
        </div>
        <div class="mp-range-row">
          <label>t 范围:</label>
          <input type="number" id="range-tmin" class="mp-range-input" value="0" step="0.1">
          <span>至</span>
          <input type="number" id="range-tmax" class="mp-range-input" value="6.28" step="0.1">
        </div>
      `;
    } 
    else if (type === 'polar') {
      inputsArea.innerHTML = `
        <div class="mp-input-row">
          <label>r(θ) =</label>
          <input type="text" id="expr-r" class="mp-input" value="Math.cos(3 * theta)">
        </div>
        <div class="mp-range-row">
          <label>θ 范围 (弧度):</label>
          <input type="number" id="range-thmin" class="mp-range-input" value="0" step="0.1">
          <span>至</span>
          <input type="number" id="range-thmax" class="mp-range-input" value="6.28" step="0.1">
        </div>
      `;
    } 
    else if (type === 'implicit') {
      inputsArea.innerHTML = `
        <div class="mp-input-row">
          <label>f(x,y) = 0，即输入表达式:</label>
          <input type="text" id="expr-xy" class="mp-input" value="x*x + y*y - 25">
        </div>
        <div class="mp-range-row">
          <label>网格范围:</label>
          <input type="number" id="range-imin" class="mp-range-input" value="-10">
          <span>至</span>
          <input type="number" id="range-imax" class="mp-range-input" value="10">
        </div>
      `;
    }
    else if (type === 'surface') {
      inputsArea.innerHTML = `
        <div class="mp-input-row">
          <label>z =</label>
          <input type="text" id="expr-z" class="mp-input" value="Math.sin(x) * Math.cos(y)">
        </div>
        <div class="mp-range-row">
          <label>网格范围:</label>
          <input type="number" id="range-smin" class="mp-range-input" value="-5">
          <span>至</span>
          <input type="number" id="range-smax" class="mp-range-input" value="5">
        </div>
      `;
    }

    drawPlot(); // 切换类型时自动画一次
  }

  // ================= 2. 核心绘图引擎 =================
  function drawPlot() {
    if (typeof Plotly === 'undefined') {
      alert('❌ Plotly 库未加载。请确保 js/libs/plotly.min.js 已正确下载。');
      return;
    }

    var type = typeSelect.value;
    var trace = null;
    var layout = { margin: { t: 40, b: 40, l: 40, r: 40 }, hovermode: 'closest' };

    try {
      if (type === 'explicit') {
        var expr = document.getElementById('expr-1').value;
        var xmin = parseFloat(document.getElementById('range-xmin').value) || -10;
        var xmax = parseFloat(document.getElementById('range-xmax').value) || 10;
        
        var xData = [], yData = [];
        var steps = 500;
        var stepSize = (xmax - xmin) / steps;
        
        for (var x = xmin; x <= xmax; x += stepSize) {
          xData.push(x);
          try {
            var y = Function('"use strict"; var x=' + x + '; return ' + expr + ';')();
            yData.push((isNaN(y) || !isFinite(y)) ? null : y);
          } catch (e) { yData.push(null); }
        }
        
        trace = { x: xData, y: yData, mode: 'lines', type: 'scatter', line: { color: '#8a5a2b', width: 3 } };
        layout.title = 'y = ' + expr;
        layout.xaxis = { title: 'x', zeroline: true, zerolinecolor: '#999' };
        layout.yaxis = { title: 'y', zeroline: true, zerolinecolor: '#999' };

      } 
      else if (type === 'parametric') {
        var exprX = document.getElementById('expr-x').value;
        var exprY = document.getElementById('expr-y').value;
        var tmin = parseFloat(document.getElementById('range-tmin').value) || 0;
        var tmax = parseFloat(document.getElementById('range-tmax').value) || 6.28;
        
        var xData = [], yData = [];
        var steps = 1000;
        var stepSize = (tmax - tmin) / steps;
        
        for (var t = tmin; t <= tmax; t += stepSize) {
          try {
            var fx = Function('"use strict"; var t=' + t + '; return ' + exprX + ';')();
            var fy = Function('"use strict"; var t=' + t + '; return ' + exprY + ';')();
            xData.push((isNaN(fx) || !isFinite(fx)) ? null : fx);
            yData.push((isNaN(fy) || !isFinite(fy)) ? null : fy);
          } catch (e) { xData.push(null); yData.push(null); }
        }
        
        trace = { x: xData, y: yData, mode: 'lines', type: 'scatter', line: { color: '#a8452a', width: 3 } };
        layout.title = '参数方程';
        layout.xaxis = { title: 'x', zeroline: true, zerolinecolor: '#999' };
        layout.yaxis = { title: 'y', zeroline: true, zerolinecolor: '#999' };
      }
      else if (type === 'polar') {
        var exprR = document.getElementById('expr-r').value;
        var thmin = parseFloat(document.getElementById('range-thmin').value) || 0;
        var thmax = parseFloat(document.getElementById('range-thmax').value) || 6.28;
        
        var rData = [], thetaData = [];
        var steps = 500;
        var stepSize = (thmax - thmin) / steps;
        
        for (var theta = thmin; theta <= thmax; theta += stepSize) {
          try {
            var r = Function('"use strict"; var theta=' + theta + '; return ' + exprR + ';')();
            // Plotly polar 不支持负半径，取绝对值或忽略，这里采用取绝对值并加上 180 度偏移的近似法
            // 但为了简单演示，我们直接忽略负值
            rData.push((isNaN(r) || !isFinite(r)) ? null : r);
            thetaData.push(theta);
          } catch (e) { rData.push(null); thetaData.push(theta); }
        }
        
        trace = { r: rData, theta: thetaData, mode: 'lines', type: 'scatterpolar', line: { color: '#7ba05b', width: 3 } };
        layout.title = 'r = ' + exprR;
        layout.polar = { radialaxis: { visible: true, range: [0, 10] } };
      }
      else if (type === 'implicit') {
        var exprXY = document.getElementById('expr-xy').value;
        var imin = parseFloat(document.getElementById('range-imin').value) || -10;
        var imax = parseFloat(document.getElementById('range-imax').value) || 10;
        
        var gridSize = 100;
        var step = (imax - imin) / gridSize;
        
        var xVals = [], yVals = [], zVals = [];
        
        for (var y = imin; y <= imax; y += step) {
          var rowX = [], rowY = [], rowZ = [];
          for (var x = imin; x <= imax; x += step) {
            rowX.push(x);
            rowY.push(y);
            try {
              var z = Function('"use strict"; var x=' + x + ', y=' + y + '; return ' + exprXY + ';')();
              rowZ.push(isNaN(z) || !isFinite(z) ? 0 : z);
            } catch(e) { rowZ.push(0); }
          }
          xVals.push(rowX);
          yVals.push(rowY);
          zVals.push(rowZ);
        }
        
        trace = {
          x: xVals, y: yVals, z: zVals,
          type: 'contour',
          contours: { start: 0, end: 0, coloring: 'lines' }, // 只画 z=0 的线
          line: { color: '#2563eb', width: 3 },
          hoverinfo: 'none'
        };
        layout.title = exprXY + ' = 0';
        layout.xaxis = { title: 'x', zeroline: true, zerolinecolor: '#999' };
        layout.yaxis = { title: 'y', zeroline: true, zerolinecolor: '#999' };
      }
      else if (type === 'surface') {
        var exprZ = document.getElementById('expr-z').value;
        var smin = parseFloat(document.getElementById('range-smin').value) || -5;
        var smax = parseFloat(document.getElementById('range-smax').value) || 5;
        
        var gridSize = 50;
        var step = (smax - smin) / gridSize;
        
        var xVals = [], yVals = [], zVals = [];
        
        for (var y = smin; y <= smax; y += step) {
          var rowX = [], rowY = [], rowZ = [];
          for (var x = smin; x <= smax; x += step) {
            rowX.push(x);
            rowY.push(y);
            try {
              var z = Function('"use strict"; var x=' + x + ', y=' + y + '; return ' + exprZ + ';')();
              rowZ.push(isNaN(z) || !isFinite(z) ? 0 : z);
            } catch(e) { rowZ.push(0); }
          }
          xVals.push(rowX);
          yVals.push(rowY);
          zVals.push(rowZ);
        }
        
        trace = {
          x: xVals, y: yVals, z: zVals,
          type: 'surface',
          colorscale: 'Viridis',
        };
        layout.title = 'z = ' + exprZ;
        layout.scene = {
          xaxis: { title: 'x' },
          yaxis: { title: 'y' },
          zaxis: { title: 'z' }
        };
        layout.margin = { l: 0, r: 0, b: 0, t: 40 };
      }

      Plotly.newPlot(plotArea, [trace], layout, { responsive: true });
    } catch (err) {
      alert('❌ 绘图发生错误: ' + err.message);
    }
  }

  // ================= 3. 事件绑定 =================
  typeSelect.addEventListener('change', renderInputs);
  document.getElementById('btn-plot').addEventListener('click', drawPlot);

  // 监听动态生成的输入框的回车事件
  inputsArea.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') drawPlot();
  });

  // 初始化
  renderInputs();
})();