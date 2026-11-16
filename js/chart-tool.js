(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  // ================= DOM 元素 =================
  var typeSelect = document.getElementById('ch-type');
  var themeSelect = document.getElementById('ch-theme');
  var showLegendCheckbox = document.getElementById('ch-show-legend');
  var showGridCheckbox = document.getElementById('ch-show-grid');
  var dataTextarea = document.getElementById('ch-data');
  var errorEl = document.getElementById('ch-error');
  var btnRender = document.getElementById('btn-render');
  var btnDownload = document.getElementById('btn-download');
  var ctx = document.getElementById('myChart').getContext('2d');
  
  var myChart = null;
  var renderTimer = null;

  // ================= 示例数据 =================
  var sampleData = {
    line: {
      labels: ['一月', '二月', '三月', '四月', '五月', '六月'],
      datasets: [
        { label: '访问量', data: [120, 190, 300, 500, 200, 300], borderColor: '#8a5a2b', tension: 0.4, fill: false }
      ]
    },
    bar: {
      labels: ['红', '蓝', '黄', '绿', '紫'],
      datasets: [{ label: '销量', data: [12, 19, 3, 5, 2] }]
    },
    pie: {
      labels: ['前端', '后端', '测试', '产品'],
      datasets: [{ data: [300, 50, 100, 80] }]
    },
    doughnut: {
      labels: ['iOS', 'Android', 'Web'],
      datasets: [{ data: [50, 40, 10] }]
    },
    radar: {
      labels: ['吃', '喝', '玩', '乐', '睡'],
      datasets: [{ label: '我的周末', data: [80, 90, 100, 70, 120] }]
    },
    polarArea: {
      labels: ['红', '绿', '黄', '蓝'],
      datasets: [{ data: [11, 16, 7, 14] }]
    },
    bubble: {
      datasets: [{
        label: '气泡数据',
        data: [{x: 10, y: 20, r: 15}, {x: 15, y: 10, r: 10}, {x: 20, y: 30, r: 25}]
      }]
    },
    scatter: {
      datasets: [{
        label: '散点数据',
        data: [{x: -10, y: 0}, {x: 0, y: 10}, {x: 10, y: 5}, {x: 0.5, y: 5.5}]
      }]
    }
  };

  // ================= 颜色主题 =================
  var themes = {
    default: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#8a5a2b', '#7ba05b'],
    morandi: ['#b1a7a6', '#a4b494', '#9c9583', '#d3b8ae', '#c0b2a5', '#d9c6c6'],
    pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8baff'],
    vivid: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']
  };

  function applyThemeToData(dataObj) {
    var colors = themes[themeSelect.value] || themes.default;
    var type = typeSelect.value;
    
    if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
      if (dataObj.datasets) {
        dataObj.datasets.forEach(function(ds) {
          ds.backgroundColor = colors;
          ds.borderWidth = 1;
          ds.borderColor = '#fff';
        });
      }
    } else {
      // 线图、柱状图、雷达图等
      if (dataObj.datasets) {
        dataObj.datasets.forEach(function(ds, index) {
          var color = colors[index % colors.length];
          
          if (type === 'line') {
            ds.borderColor = color;
            ds.backgroundColor = color + '33'; // 添加20%透明度
            ds.pointBackgroundColor = color;
          } else if (type === 'bar') {
            ds.backgroundColor = color;
          } else if (type === 'radar') {
            ds.borderColor = color;
            ds.backgroundColor = color + '33';
            ds.pointBackgroundColor = color;
          } else if (type === 'bubble' || type === 'scatter') {
            ds.backgroundColor = color + '99'; // 60%透明度
            ds.borderColor = color;
          }
        });
      }
    }
  }

  // ================= 渲染图表 =================
  function renderChart(silent) {
    var type = typeSelect.value;
    var dataStr = dataTextarea.value.trim();
    
    if (!dataStr) {
      errorEl.textContent = '';
      if (myChart) { myChart.destroy(); myChart = null; }
      return;
    }

    var dataObj;
    try {
      dataObj = JSON.parse(dataStr);
      errorEl.textContent = '';
    } catch (e) {
      errorEl.textContent = '❌ JSON 格式错误: ' + e.message;
      return; // 保持图表原样，不乱销毁
    }

    // 应用配色
    applyThemeToData(dataObj);

    if (myChart) {
      myChart.destroy();
    }

    // 基础配置
    var options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: showLegendCheckbox.checked,
          position: 'top', 
          labels: { font: { family: 'system-ui', size: 13 } } 
        }
      }
    };

    // 坐标系配置 (饼图和极地图不需要 XY 轴网格)
    if (!['pie', 'doughnut', 'polarArea', 'radar'].includes(type)) {
      options.scales = {
        y: { 
          beginAtZero: true, 
          grid: { 
            display: showGridCheckbox.checked,
            color: '#e5d9bd' 
          } 
        },
        x: { 
          grid: { 
            display: showGridCheckbox.checked,
            color: '#e5e5e5' 
          } 
        }
      };
    }

    try {
      myChart = new Chart(ctx, {
        type: type,
        data: dataObj,
        options: options
      });
      if (!silent) showToast('图表渲染成功');
    } catch (e) {
      errorEl.textContent = '❌ 渲染失败: ' + e.message;
    }
  }

  // 防抖渲染
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(function() { renderChart(true); }, 500);
  }

  // ================= 事件绑定 =================
  
  // 切换类型时，自动填入对应的示例数据并渲染
  typeSelect.addEventListener('change', function () {
    var type = this.value;
    // 如果用户改过数据结构，强制使用默认模板防报错
    dataTextarea.value = JSON.stringify(sampleData[type], null, 2);
    renderChart(false);
  });

  themeSelect.addEventListener('change', function() {
    renderChart(false);
  });

  showLegendCheckbox.addEventListener('change', function() {
    renderChart(true);
  });

  showGridCheckbox.addEventListener('change', function() {
    renderChart(true);
  });

  dataTextarea.addEventListener('input', scheduleRender);

  btnRender.addEventListener('click', function() {
    renderChart(false);
  });

  // JSON 辅助工具
  document.getElementById('btn-format-json').addEventListener('click', function() {
    try {
      var obj = JSON.parse(dataTextarea.value);
      dataTextarea.value = JSON.stringify(obj, null, 2);
      showToast('JSON 已格式化');
      renderChart(true);
    } catch(e) {
      showToast('JSON 格式有误，无法格式化', true);
    }
  });

  document.getElementById('btn-reset-json').addEventListener('click', function() {
    var type = typeSelect.value;
    dataTextarea.value = JSON.stringify(sampleData[type], null, 2);
    errorEl.textContent = '';
    renderChart(false);
    showToast('已重置为示例数据');
  });

  // 导出图片
  btnDownload.addEventListener('click', function() {
    if (!myChart) return showToast('请先生成图表', true);
    
    // 为了导出高清图，我们可以利用 Chart.js 的自带 API，或者临时放大 canvas
    var url = myChart.toBase64Image('image/png', 1);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'chart_' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('图片已开始下载');
  });

  // ================= 初始化 =================
  setTimeout(function() {
    dataTextarea.value = JSON.stringify(sampleData.line, null, 2);
    renderChart(true);
  }, 100);

})();