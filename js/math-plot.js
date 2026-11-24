(function () {
  'use strict';

  // ============================================================
  // 0. 工具函数
  // ============================================================
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var v = parseFloat(el.value);
    return isFinite(v) ? v : fallback;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // 不安全的词（避免表达式里调用页面 API）
  var UNSAFE = /(?:window|document|eval|Function|fetch|XMLHttpRequest|localStorage|sessionStorage|location|importScripts|require|globalThis|cookie|top|parent|self|postMessage)/i;

  var MATH_SHORTHANDS = [
    'sin','cos','tan','asin','acos','atan','atan2',
    'sinh','cosh','tanh','asinh','acosh','atanh',
    'sqrt','cbrt','abs','sign','exp','expm1',
    'log','log2','log10','log1p',
    'pow','floor','ceil','round','trunc','min','max','hypot','random'
  ];

  // 编译表达式：允许 Math.xxx 写法，也允许 sin/cos/PI/E 等简写
  function compileExpr(expr, varNames) {
    if (!expr || !String(expr).trim()) return null;
    if (UNSAFE.test(expr)) throw new Error('表达式包含不允许使用的关键字');
    var prelude = 'var PI=Math.PI, E=Math.E, TAU=2*Math.PI, LN2=Math.LN2, LN10=Math.LN10;';
    MATH_SHORTHANDS.forEach(function (n) { prelude += 'var ' + n + '=Math.' + n + ';'; });
    // eslint-disable-next-line no-new-func
    return new Function(varNames.join(','), '"use strict";' + prelude + 'return (' + expr + ');');
  }

  // ============================================================
  // 1. 配置
  // ============================================================
  var DEFAULTS = {
    explicit:  [{ expr1: 'Math.sin(x) + Math.cos(x * 2)', color: '#8a5a2b', width: 3 }],
    parametric:[{ exprX: 'Math.cos(3 * t)', exprY: 'Math.sin(4 * t)', color: '#a8452a', width: 3 }],
    polar:     [{ exprR: 'Math.cos(3 * theta)', color: '#7ba05b', width: 3 }],
    implicit:  [{ exprXY: 'x*x + y*y - 25', color: '#2563eb', width: 3 }],
    vector:    [{ exprP: '-y', exprQ: 'x', color: '#9333ea', width: 1.5 }],
    surface:   [{ exprZ: 'Math.sin(x) * Math.cos(y)', colorscale: 'Viridis' }]
  };

  var RANGES = {
    explicit:  { xmin: -10, xmax: 10, steps: 600 },
    parametric:{ tmin: 0, tmax: 6.28, steps: 1200 },
    polar:     { thmin: 0, thmax: 6.28, steps: 800 },
    implicit:  { xmin: -10, xmax: 10, ymin: -10, ymax: 10, steps: 220 },
    vector:    { xmin: -5, xmax: 5, ymin: -5, ymax: 5, steps: 16 },
    surface:   { xmin: -5, xmax: 5, ymin: -5, ymax: 5, steps: 60 }
  };

  var COLORS = ['#8a5a2b','#a8452a','#7ba05b','#2563eb','#9333ea','#0891b2','#db2777','#ca8a04'];

  // ============================================================
  // 2. DOM 引用
  // ============================================================
  var typeSelect   = document.getElementById('mp-type');
  var inputsArea   = document.getElementById('mp-inputs');
  var plotArea     = document.getElementById('plot-area');
  var btnPlot      = document.getElementById('btn-plot');
  var btnAdd       = document.getElementById('btn-add');
  var btnReset     = document.getElementById('btn-reset');
  var btnExport    = document.getElementById('btn-export');

  var curvesContainer = null;
  var curveCounter = 0;
  var autoPlotTimer = null;

  // ============================================================
  // 3. 渲染输入区
  // ============================================================
  function rowHtml(label, cls, value) {
    return '<div class="mp-input-row">' +
      '<label>' + label + '</label>' +
      '<input type="text" class="mp-input ' + cls + '" value="' + esc(value) + '" spellcheck="false">' +
      '</div>';
  }

  function renderInputs() {
    var type = typeSelect.value;
    curveCounter = 0;
    inputsArea.innerHTML = '';

    curvesContainer = document.createElement('div');
    curvesContainer.className = 'mp-curves';
    inputsArea.appendChild(curvesContainer);

    (DEFAULTS[type] || []).forEach(function (c) { addCurve(type, c); });

    inputsArea.appendChild(renderRangeRow(type));

    // 选项行
    var optRow = document.createElement('div');
    optRow.className = 'mp-options-row';
    optRow.innerHTML =
      '<label><input type="checkbox" id="opt-grid" checked> 显示网格</label>' +
      '<label><input type="checkbox" id="opt-legend" checked> 显示图例</label>';
    optRow.addEventListener('change', drawPlot);
    inputsArea.appendChild(optRow);

    drawPlot();
  }

  function renderRangeRow(type) {
    var row = document.createElement('div');
    row.className = 'mp-range-row';
    var r = RANGES[type];
    var html = '';

    if (type === 'explicit') {
      html =
        '<label>x 范围:</label>' +
        '<input type="number" id="range-xmin" class="mp-range-input" value="' + r.xmin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-xmax" class="mp-range-input" value="' + r.xmax + '" step="any">' +
        '<label>采样点:</label>' +
        '<input type="number" id="range-steps" class="mp-range-input" value="' + r.steps + '" min="10" max="20000" step="10">';
    } else if (type === 'parametric') {
      html =
        '<label>t 范围:</label>' +
        '<input type="number" id="range-tmin" class="mp-range-input" value="' + r.tmin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-tmax" class="mp-range-input" value="' + r.tmax + '" step="any">' +
        '<label>采样点:</label>' +
        '<input type="number" id="range-steps" class="mp-range-input" value="' + r.steps + '" min="10" max="50000" step="10">';
    } else if (type === 'polar') {
      html =
        '<label>θ 范围:</label>' +
        '<input type="number" id="range-thmin" class="mp-range-input" value="' + r.thmin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-thmax" class="mp-range-input" value="' + r.thmax + '" step="any">' +
        '<label>采样点:</label>' +
        '<input type="number" id="range-steps" class="mp-range-input" value="' + r.steps + '" min="10" max="50000" step="10">';
    } else if (type === 'implicit') {
      html =
        '<label>x 范围:</label>' +
        '<input type="number" id="range-xmin" class="mp-range-input" value="' + r.xmin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-xmax" class="mp-range-input" value="' + r.xmax + '" step="any">' +
        '<label>y 范围:</label>' +
        '<input type="number" id="range-ymin" class="mp-range-input" value="' + r.ymin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-ymax" class="mp-range-input" value="' + r.ymax + '" step="any">' +
        '<label>网格:</label>' +
        '<input type="number" id="range-steps" class="mp-range-input" value="' + r.steps + '" min="20" max="500" step="10">';
    } else if (type === 'vector') {
      html =
        '<label>x 范围:</label>' +
        '<input type="number" id="range-xmin" class="mp-range-input" value="' + r.xmin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-xmax" class="mp-range-input" value="' + r.xmax + '" step="any">' +
        '<label>y 范围:</label>' +
        '<input type="number" id="range-ymin" class="mp-range-input" value="' + r.ymin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-ymax" class="mp-range-input" value="' + r.ymax + '" step="any">' +
        '<label>网格密度:</label>' +
        '<input type="number" id="range-steps" class="mp-range-input" value="' + r.steps + '" min="3" max="50" step="1">';
    } else if (type === 'surface') {
      html =
        '<label>x 范围:</label>' +
        '<input type="number" id="range-xmin" class="mp-range-input" value="' + r.xmin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-xmax" class="mp-range-input" value="' + r.xmax + '" step="any">' +
        '<label>y 范围:</label>' +
        '<input type="number" id="range-ymin" class="mp-range-input" value="' + r.ymin + '" step="any">' +
        '<span>至</span>' +
        '<input type="number" id="range-ymax" class="mp-range-input" value="' + r.ymax + '" step="any">' +
        '<label>网格:</label>' +
        '<input type="number" id="range-steps" class="mp-range-input" value="' + r.steps + '" min="10" max="200" step="5">';
    }

    row.innerHTML = html;
    return row;
  }

  // ============================================================
  // 4. 曲线卡片
  // ============================================================
  function addCurve(type, data) {
    if (!curvesContainer) return;
    data = data || {};
    curveCounter++;

    var card = document.createElement('div');
    card.className = 'mp-curve';

    var exprHtml = '';
    if (type === 'explicit') {
      exprHtml = rowHtml('y =', 'mp-expr-1', data.expr1 || 'Math.sin(x)');
    } else if (type === 'parametric') {
      exprHtml =
        rowHtml('x(t) =', 'mp-expr-x', data.exprX || 'Math.cos(3 * t)') +
        rowHtml('y(t) =', 'mp-expr-y', data.exprY || 'Math.sin(4 * t)');
    } else if (type === 'polar') {
      exprHtml = rowHtml('r(θ) =', 'mp-expr-r', data.exprR || 'Math.cos(3 * theta)');
    } else if (type === 'implicit') {
      exprHtml = rowHtml('f(x,y) =', 'mp-expr-xy', data.exprXY || 'x*x + y*y - 25');
    } else if (type === 'vector') {
      exprHtml =
        rowHtml('P(x,y) =', 'mp-expr-p', data.exprP || '-y') +
        rowHtml('Q(x,y) =', 'mp-expr-q', data.exprQ || 'x');
    } else if (type === 'surface') {
      exprHtml = rowHtml('z =', 'mp-expr-z', data.exprZ || 'Math.sin(x) * Math.cos(y)');
    }

    var colorCtrl;
    if (type === 'surface') {
      var scales = ['Viridis','Plasma','Inferno','Magma','Cividis',
                    'Blues','Reds','Greens','Hot','Greys',
                    'Earth','Jet','Portland','RdBu','Picnic'];
      colorCtrl = '<select class="mp-select-sm mp-colorscale">' +
        scales.map(function (s) {
          return '<option value="' + s + '"' +
            (s === (data.colorscale || 'Viridis') ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select>';
    } else {
      var c0 = data.color || COLORS[(curveCounter - 1) % COLORS.length];
      colorCtrl = '<input type="color" class="mp-color" value="' + c0 + '">';
    }

    var widthCtrl = (type === 'surface') ? '' :
      '<input type="number" class="mp-width" min="1" max="10" step="0.5" value="' +
      (data.width || 3) + '">';

    card.innerHTML =
      '<div class="mp-curve-body">' + exprHtml + '</div>' +
      '<div class="mp-curve-opts">' +
        colorCtrl + widthCtrl +
        '<button type="button" class="mp-btn mp-btn-icon mp-remove" title="删除此曲线">×</button>' +
      '</div>';

    card.querySelector('.mp-remove').addEventListener('click', function () {
      if (curvesContainer.children.length <= 1) {
        alert('至少保留一条曲线');
        return;
      }
      card.remove();
      drawPlot();
    });

    curvesContainer.appendChild(card);
  }

  // ============================================================
  // 5. 读取曲线参数
  // ============================================================
  function getCurves(type) {
    var result = [];
    if (!curvesContainer) return result;
    Array.prototype.forEach.call(curvesContainer.children, function (card) {
      var c = {};
      if (type === 'explicit') {
        c.expr1 = card.querySelector('.mp-expr-1').value;
      } else if (type === 'parametric') {
        c.exprX = card.querySelector('.mp-expr-x').value;
        c.exprY = card.querySelector('.mp-expr-y').value;
      } else if (type === 'polar') {
        c.exprR = card.querySelector('.mp-expr-r').value;
      } else if (type === 'implicit') {
        c.exprXY = card.querySelector('.mp-expr-xy').value;
      } else if (type === 'vector') {
        c.exprP = card.querySelector('.mp-expr-p').value;
        c.exprQ = card.querySelector('.mp-expr-q').value;
      } else if (type === 'surface') {
        c.exprZ = card.querySelector('.mp-expr-z').value;
        var cs = card.querySelector('.mp-colorscale');
        c.colorscale = cs ? cs.value : 'Viridis';
      }
      var col = card.querySelector('.mp-color');
      if (col) c.color = col.value;
      var w = card.querySelector('.mp-width');
      if (w) c.width = parseFloat(w.value) || 3;
      result.push(c);
    });
    return result;
  }

  // ============================================================
  // 6. Marching Squares（隐函数）
  // ============================================================
  function interpT(v0, v1) {
    if (v1 === v0) return 0.5;
    return (0 - v0) / (v1 - v0);
  }

  function marchingSquares(fn, xmin, xmax, ymin, ymax, res) {
    var dx = (xmax - xmin) / res;
    var dy = (ymax - ymin) / res;

    var grid = [];
    for (var j = 0; j <= res; j++) {
      var row = [];
      for (var i = 0; i <= res; i++) {
        var v;
        try { v = fn(xmin + i * dx, ymin + j * dy); } catch (e) { v = NaN; }
        row.push(isFinite(v) ? v : NaN);
      }
      grid.push(row);
    }

    var xs = [], ys = [];

    for (var jj = 0; jj < res; jj++) {
      for (var ii = 0; ii < res; ii++) {
        var v00 = grid[jj][ii];
        var v10 = grid[jj][ii + 1];
        var v11 = grid[jj + 1][ii + 1];
        var v01 = grid[jj + 1][ii];
        if (isNaN(v00) || isNaN(v10) || isNaN(v11) || isNaN(v01)) continue;

        var x0 = xmin + ii * dx, y0 = ymin + jj * dy;
        var x1 = x0 + dx, y1 = y0 + dy;

        var b = (v00 > 0 ? 1 : 0) | (v10 > 0 ? 2 : 0) | (v11 > 0 ? 4 : 0) | (v01 > 0 ? 8 : 0);
        if (b === 0 || b === 15) continue;

        var bPt = [x0 + interpT(v00, v10) * dx, y0];
        var tPt = [x0 + interpT(v01, v11) * dx, y1];
        var lPt = [x0, y0 + interpT(v00, v01) * dy];
        var rPt = [x1, y0 + interpT(v10, v11) * dy];

        var segs;
        switch (b) {
          case 1:  segs = [[bPt, lPt]]; break;
          case 2:  segs = [[bPt, rPt]]; break;
          case 3:  segs = [[lPt, rPt]]; break;
          case 4:  segs = [[rPt, tPt]]; break;
          case 5:
            if (v00 + v10 + v11 + v01 > 0) segs = [[bPt, rPt], [lPt, tPt]];
            else                           segs = [[bPt, lPt], [rPt, tPt]];
            break;
          case 6:  segs = [[bPt, tPt]]; break;
          case 7:  segs = [[lPt, tPt]]; break;
          case 8:  segs = [[lPt, tPt]]; break;
          case 9:  segs = [[bPt, tPt]]; break;
          case 10:
            if (v00 + v10 + v11 + v01 > 0) segs = [[bPt, lPt], [rPt, tPt]];
            else                           segs = [[bPt, rPt], [lPt, tPt]];
            break;
          case 11: segs = [[rPt, tPt]]; break;
          case 12: segs = [[lPt, rPt]]; break;
          case 13: segs = [[bPt, rPt]]; break;
          case 14: segs = [[bPt, lPt]]; break;
        }

        for (var s = 0; s < segs.length; s++) {
          xs.push(segs[s][0][0], segs[s][1][0], null);
          ys.push(segs[s][0][1], segs[s][1][1], null);
        }
      }
    }

    return { x: xs, y: ys };
  }

  // ============================================================
  // 7. 向量场箭头
  // ============================================================
  function addArrow(xs, ys, x, y, dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) return;

    var tipX = x + dx, tipY = y + dy;

    // 箭杆
    xs.push(x, tipX, null);
    ys.push(y, tipY, null);

    // 箭头（两撇）
    var angle = Math.atan2(dy, dx);
    var headLen = len * 0.35;
    var headAngle = Math.PI / 6;
    var hx1 = tipX + headLen * Math.cos(angle + Math.PI - headAngle);
    var hy1 = tipY + headLen * Math.sin(angle + Math.PI - headAngle);
    var hx2 = tipX + headLen * Math.cos(angle + Math.PI + headAngle);
    var hy2 = tipY + headLen * Math.sin(angle + Math.PI + headAngle);

    xs.push(tipX, hx1, null, tipX, hx2, null);
    ys.push(tipY, hy1, null, tipY, hy2, null);
  }

  // ============================================================
  // 8. 主绘图
  // ============================================================
  function drawPlot() {
    if (typeof Plotly === 'undefined') {
      alert('❌ Plotly 库未加载。请确认 js/libs/plotly.min.js 已存在。');
      return;
    }

    var type = typeSelect.value;
    var curves = getCurves(type);
    var traces = [];

    var showGridEl = document.getElementById('opt-grid');
    var showLegendEl = document.getElementById('opt-legend');
    var showGrid = showGridEl ? showGridEl.checked : true;
    var showLegend = showLegendEl ? showLegendEl.checked : true;

    var layout = {
      margin: { t: 50, b: 50, l: 55, r: 30 },
      hovermode: 'closest',
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'ui-monospace, Menlo, Consolas, monospace', size: 12 },
      showlegend: showLegend && curves.length > 1,
      legend: { orientation: 'h', x: 0, y: 1.13, bgcolor: 'rgba(255,255,255,.6)' }
    };

    var axisBase = {
      zeroline: true,
      zerolinecolor: '#999',
      zerolinewidth: 1,
      showgrid: showGrid,
      gridcolor: '#e5dcc5',
      tickfont: { size: 11 },
      automargin: true
    };

    try {
      // ---------- 显函数 ----------
      if (type === 'explicit') {
        var xmin = num('range-xmin', -10);
        var xmax = num('range-xmax', 10);
        if (xmax <= xmin) throw new Error('x 范围无效');
        var steps = clamp(num('range-steps', 600), 10, 20000);

        layout.title = '显函数';
        layout.xaxis = Object.assign({}, axisBase, { title: 'x' });
        layout.yaxis = Object.assign({}, axisBase, { title: 'y' });

        curves.forEach(function (c) {
          var fn;
          try { fn = compileExpr(c.expr1, ['x']); } catch (e) { console.warn(e); return; }
          if (!fn) return;
          var xs = [], ys = [];
          var dx = (xmax - xmin) / steps;
          for (var i = 0; i <= steps; i++) {
            var x = xmin + i * dx, y;
            try { y = fn(x); } catch (e) { y = NaN; }
            xs.push(x);
            ys.push(isFinite(y) ? y : null);
          }
          traces.push({
            x: xs, y: ys, mode: 'lines', type: 'scatter',
            name: c.expr1,
            line: { color: c.color, width: c.width }
          });
        });
      }

      // ---------- 参数方程 ----------
      else if (type === 'parametric') {
        var tmin = num('range-tmin', 0);
        var tmax = num('range-tmax', 6.28);
        if (tmax <= tmin) throw new Error('t 范围无效');
        var steps2 = clamp(num('range-steps', 1200), 10, 50000);

        layout.title = '参数方程';
        layout.xaxis = Object.assign({}, axisBase, { title: 'x' });
        layout.yaxis = Object.assign({}, axisBase, { title: 'y' });

        curves.forEach(function (c) {
          var fx, fy;
          try {
            fx = compileExpr(c.exprX, ['t']);
            fy = compileExpr(c.exprY, ['t']);
          } catch (e) { console.warn(e); return; }
          if (!fx || !fy) return;

          var xs = [], ys = [], ts = [];
          var dt = (tmax - tmin) / steps2;
          for (var i = 0; i <= steps2; i++) {
            var t = tmin + i * dt, x, y;
            try { x = fx(t); y = fy(t); } catch (e) { x = NaN; y = NaN; }
            xs.push(isFinite(x) ? x : null);
            ys.push(isFinite(y) ? y : null);
            ts.push(t);
          }
          traces.push({
            x: xs, y: ys, customdata: ts,
            mode: 'lines', type: 'scatter',
            name: 'x=' + c.exprX + ', y=' + c.exprY,
            line: { color: c.color, width: c.width },
            hovertemplate: 'x: %{x:.4f}<br>y: %{y:.4f}<br>t: %{customdata:.4f}<extra></extra>'
          });
        });
      }

      // ---------- 极坐标 ----------
      else if (type === 'polar') {
        var thmin = num('range-thmin', 0);
        var thmax = num('range-thmax', 6.28);
        if (thmax <= thmin) throw new Error('θ 范围无效');
        var steps3 = clamp(num('range-steps', 800), 10, 50000);

        layout.title = '极坐标（负半径自动反向）';
        layout.xaxis = Object.assign({}, axisBase, { title: 'x', scaleanchor: 'y', scaleratio: 1 });
        layout.yaxis = Object.assign({}, axisBase, { title: 'y' });

        curves.forEach(function (c) {
          var fr;
          try { fr = compileExpr(c.exprR, ['theta']); } catch (e) { console.warn(e); return; }
          if (!fr) return;

          var xs = [], ys = [], ths = [];
          var dth = (thmax - thmin) / steps3;
          for (var i = 0; i <= steps3; i++) {
            var th = thmin + i * dth, r;
            try { r = fr(th); } catch (e) { r = NaN; }
            ths.push(th);
            if (!isFinite(r)) { xs.push(null); ys.push(null); continue; }
            xs.push(r * Math.cos(th));
            ys.push(r * Math.sin(th));
          }
          traces.push({
            x: xs, y: ys, customdata: ths,
            mode: 'lines', type: 'scatter',
            name: 'r=' + c.exprR,
            line: { color: c.color, width: c.width },
            hovertemplate: 'x: %{x:.3f}<br>y: %{y:.3f}<br>θ: %{customdata:.4f}<extra></extra>'
          });
        });
      }

      // ---------- 隐函数 ----------
      else if (type === 'implicit') {
        var imxmin = num('range-xmin', -10), imxmax = num('range-xmax', 10);
        var imymin = num('range-ymin', -10), imymax = num('range-ymax', 10);
        if (imxmax <= imxmin || imymax <= imymin) throw new Error('网格范围无效');
        var res = clamp(Math.round(num('range-steps', 220)), 20, 500);

        layout.title = '隐函数';
        layout.xaxis = Object.assign({}, axisBase, { title: 'x', scaleanchor: 'y', scaleratio: 1 });
        layout.yaxis = Object.assign({}, axisBase, { title: 'y' });

        curves.forEach(function (c) {
          var fn;
          try { fn = compileExpr(c.exprXY, ['x', 'y']); } catch (e) { console.warn(e); return; }
          if (!fn) return;

          var seg = marchingSquares(fn, imxmin, imxmax, imymin, imymax, res);
          if (seg.x.length === 0) return;

          traces.push({
            x: seg.x, y: seg.y,
            mode: 'lines', type: 'scatter',
            name: c.exprXY + ' = 0',
            line: { color: c.color, width: c.width },
            hoverinfo: 'skip'
          });
        });
      }

      // ---------- 向量场 ----------
      else if (type === 'vector') {
        var vxmin = num('range-xmin', -5), vxmax = num('range-xmax', 5);
        var vymin = num('range-ymin', -5), vymax = num('range-ymax', 5);
        if (vxmax <= vxmin || vymax <= vymin) throw new Error('网格范围无效');
        var vsteps = clamp(Math.round(num('range-steps', 16)), 3, 50);

        layout.title = '向量场';
        layout.xaxis = Object.assign({}, axisBase, { title: 'x', scaleanchor: 'y', scaleratio: 1 });
        layout.yaxis = Object.assign({}, axisBase, { title: 'y' });

        curves.forEach(function (c) {
          var fp, fq;
          try {
            fp = compileExpr(c.exprP, ['x', 'y']);
            fq = compileExpr(c.exprQ, ['x', 'y']);
          } catch (e) { console.warn(e); return; }
          if (!fp || !fq) return;

          var dx = (vxmax - vxmin) / vsteps;
          var dy = (vymax - vymin) / vsteps;

          var vectors = [];
          var maxLen = 0;
          for (var j = 0; j <= vsteps; j++) {
            for (var i = 0; i <= vsteps; i++) {
              var px = vxmin + i * dx;
              var py = vymin + j * dy;
              var vx, vy;
              try { vx = fp(px, py); vy = fq(px, py); } catch (e) { vx = 0; vy = 0; }
              if (!isFinite(vx) || !isFinite(vy)) continue;
              var len = Math.sqrt(vx * vx + vy * vy);
              if (len < 1e-12) continue;
              if (len > maxLen) maxLen = len;
              vectors.push({ x: px, y: py, vx: vx, vy: vy });
            }
          }
          if (!maxLen || vectors.length === 0) return;

          var spacing = Math.min(dx, dy);
          var scale = (spacing * 2.2) / maxLen;
          var xs = [], ys = [];
          vectors.forEach(function (v) {
            addArrow(xs, ys, v.x, v.y, v.vx * scale, v.vy * scale);
          });

          traces.push({
            x: xs, y: ys,
            mode: 'lines', type: 'scatter',
            name: 'F = (' + c.exprP + ', ' + c.exprQ + ')',
            line: { color: c.color, width: c.width },
            hoverinfo: 'skip'
          });
        });
      }

      // ---------- 3D 曲面 ----------
      else if (type === 'surface') {
        var sxmin = num('range-xmin', -5), sxmax = num('range-xmax', 5);
        var symin = num('range-ymin', -5), symax = num('range-ymax', 5);
        if (sxmax <= sxmin || symax <= symin) throw new Error('网格范围无效');
        var ssteps = clamp(Math.round(num('range-steps', 60)), 10, 200);

        layout.title = '3D 曲面';
        layout.margin = { l: 0, r: 0, b: 0, t: 50 };
        layout.showlegend = false;
        layout.scene = {
          xaxis: { title: 'x' },
          yaxis: { title: 'y' },
          zaxis: { title: 'z' },
          camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
        };

        curves.forEach(function (c) {
          var fn;
          try { fn = compileExpr(c.exprZ, ['x', 'y']); } catch (e) { console.warn(e); return; }
          if (!fn) return;

          var xVals = [], yVals = [], zVals = [];
          for (var j2 = 0; j2 <= ssteps; j2++) {
            var y2 = symin + (symax - symin) * j2 / ssteps;
            var rowX = [], rowY = [], rowZ = [];
            for (var i2 = 0; i2 <= ssteps; i2++) {
              var x2 = sxmin + (sxmax - sxmin) * i2 / ssteps;
              rowX.push(x2);
              rowY.push(y2);
              var z2;
              try { z2 = fn(x2, y2); } catch (e) { z2 = NaN; }
              rowZ.push(isFinite(z2) ? z2 : null);
            }
            xVals.push(rowX);
            yVals.push(rowY);
            zVals.push(rowZ);
          }
          traces.push({
            x: xVals, y: yVals, z: zVals,
            type: 'surface',
            colorscale: c.colorscale || 'Viridis',
            showscale: true,
            colorbar: { thickness: 10, len: 0.7 }
          });
        });
      }

      Plotly.newPlot(plotArea, traces, layout, { responsive: true });
    } catch (err) {
      console.error(err);
      alert('❌ 绘图发生错误：' + err.message);
    }
  }

  // ============================================================
  // 9. 事件绑定
  // ============================================================
  typeSelect.addEventListener('change', renderInputs);
  btnPlot.addEventListener('click', drawPlot);

  btnAdd.addEventListener('click', function () {
    var type = typeSelect.value;
    var defaults = DEFAULTS[type] || [];
    addCurve(type, defaults[0] || {});
    drawPlot();
  });

  btnReset.addEventListener('click', function () {
    if (confirm('确定重置为当前类型的默认设置？')) renderInputs();
  });

  btnExport.addEventListener('click', function () {
    if (typeof Plotly === 'undefined') return;
    Plotly.toImage(plotArea, { format: 'png', width: 1600, height: 1200, scale: 1 })
      .then(function (url) {
        var a = document.createElement('a');
        a.href = url;
        a.download = 'math-plot-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(function (e) {
        alert('导出失败：' + (e && e.message ? e.message : e));
      });
  });

  // 回车触发绘图
  inputsArea.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') {
      e.preventDefault();
      drawPlot();
    }
  });

  // 范围输入变化 -> 自动防抖重绘
  inputsArea.addEventListener('input', function (e) {
    if (e.target && e.target.classList &&
        e.target.classList.contains('mp-range-input')) {
      clearTimeout(autoPlotTimer);
      autoPlotTimer = setTimeout(drawPlot, 420);
    }
  });

  // ============================================================
  // 10. 初始化
  // ============================================================
  renderInputs();
})();