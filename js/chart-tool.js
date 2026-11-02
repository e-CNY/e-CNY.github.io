(function () {
  var typeSelect = document.getElementById('ch-type');
  var dataTextarea = document.getElementById('ch-data');
  var btnRender = document.getElementById('btn-render');
  var ctx = document.getElementById('myChart').getContext('2d');
  var myChart = null;

  // 包含了各种图表类型的完整示例数据
  var sampleData = {
    line: {
      labels: ['一月', '二月', '三月', '四月', '五月'],
      datasets: [{ label: '访问量', data: [120, 190, 300, 500, 200], borderColor: '#8a5a2b', tension: 0.4, fill: false }]
    },
    bar: {
      labels: ['红', '蓝', '黄', '绿', '紫'],
      datasets: [{ label: '销量', data: [12, 19, 3, 5, 2], backgroundColor: '#7ba05b' }]
    },
    pie: {
      labels: ['前端', '后端', '测试', '产品'],
      datasets: [{ data: [300, 50, 100, 80], backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0'] }]
    },
    doughnut: {
      labels: ['iOS', 'Android', 'Web'],
      datasets: [{ data: [50, 40, 10], backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'] }]
    },
    radar: {
      labels: ['吃', '喝', '玩', '乐', '睡'],
      datasets: [{ label: '我的周末', data: [80, 90, 100, 70, 120], backgroundColor: 'rgba(123, 160, 91, 0.2)', borderColor: '#7ba05b' }]
    },
    polarArea: {
      labels: ['红', '绿', '黄', '蓝'],
      datasets: [{ data: [11, 16, 7, 14], backgroundColor: ['#ff6384', '#4bc0c0', '#ffce56', '#36a2eb'] }]
    },
    bubble: {
      datasets: [{
        label: '气泡数据',
        data: [{x: 10, y: 20, r: 15}, {x: 15, y: 10, r: 10}, {x: 20, y: 30, r: 25}],
        backgroundColor: 'rgba(138, 90, 43, 0.6)'
      }]
    },
    scatter: {
      datasets: [{
        label: '散点数据',
        data: [{x: -10, y: 0}, {x: 0, y: 10}, {x: 10, y: 5}, {x: 0.5, y: 5.5}],
        backgroundColor: '#a8452a'
      }]
    }
  };

  // 切换类型时，自动填入对应的示例数据
  typeSelect.addEventListener('change', function () {
    var type = this.value;
    dataTextarea.value = JSON.stringify(sampleData[type], null, 2);
    renderChart();
  });

  function renderChart() {
    var type = typeSelect.value;
    var dataStr = dataTextarea.value;
    var dataObj;

    try {
      dataObj = JSON.parse(dataStr);
    } catch (e) {
      return alert('JSON 数据格式错误，请检查！\n' + e.message);
    }

    if (myChart) myChart.destroy();

    // 部分图表特殊处理
    if (type === 'pie' || type === 'doughnut') {
      if (dataObj.datasets && dataObj.datasets.length > 0) {
        dataObj.datasets.forEach(function(ds) {
          ds.borderWidth = 1;
          ds.borderColor = '#fff';
        });
      }
    }

    // 基础配置
    var options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: 'system-ui' } } }
      }
    };

    // 坐标系配置 (饼图和极地图不需要 XY 轴)
    if (!['pie', 'doughnut', 'polarArea', 'radar'].includes(type)) {
      options.scales = {
        y: { beginAtZero: true, grid: { color: '#e5d9bd' } },
        x: { grid: { display: false } }
      };
    }

    try {
      myChart = new Chart(ctx, { type: type, data: dataObj, options: options });
    } catch (e) {
      alert('图表渲染失败: ' + e.message);
    }
  }

  btnRender.addEventListener('click', renderChart);

  // 初始化
  setTimeout(function() {
    dataTextarea.value = JSON.stringify(sampleData.line, null, 2);
    renderChart();
  }, 100);
})();