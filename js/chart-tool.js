(function () {
  var typeSelect = document.getElementById('ch-type');
  var dataTextarea = document.getElementById('ch-data');
  var btnRender = document.getElementById('btn-render');
  var ctx = document.getElementById('myChart').getContext('2d');
  var myChart = null;

  // 默认示例数据
  var defaultData = {
    labels: ['一月', '二月', '三月', '四月', '五月', '六月'],
    datasets: [{
      label: '访问量',
      data: [120, 190, 300, 500, 200, 300],
      backgroundColor: [
        'rgba(138, 90, 43, 0.6)',
        'rgba(123, 160, 91, 0.6)',
        'rgba(106, 141, 184, 0.6)',
        'rgba(201, 154, 75, 0.6)',
        'rgba(168, 69, 42, 0.6)',
        'rgba(142, 68, 173, 0.6)'
      ],
      borderColor: [
        '#8a5a2b', '#7ba05b', '#6a8db8', '#c99a4b', '#a8452a', '#8e44ad'
      ],
      borderWidth: 2,
      tension: 0.4 // 用于折线图平滑
    }]
  };

  dataTextarea.value = JSON.stringify(defaultData, null, 2);

  function renderChart() {
    var type = typeSelect.value;
    var dataStr = dataTextarea.value;
    var dataObj;

    try {
      dataObj = JSON.parse(dataStr);
    } catch (e) {
      return alert('JSON 数据格式错误，请检查！\n' + e.message);
    }

    if (myChart) {
      myChart.destroy();
    }

    // 如果是饼图或环形图，不需要边框
    if (type === 'pie' || type === 'doughnut') {
      if (dataObj.datasets && dataObj.datasets.length > 0) {
        dataObj.datasets.forEach(function(ds) {
          ds.borderWidth = 1;
          ds.borderColor = '#fff';
        });
      }
    }

    try {
      myChart = new Chart(ctx, {
        type: type,
        data: dataObj,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { family: 'system-ui' } } }
          },
          scales: (type === 'pie' || type === 'doughnut') ? {} : {
            y: { beginAtZero: true, grid: { color: '#e5d9bd' } },
            x: { grid: { display: false } }
          }
        }
      });
    } catch (e) {
      alert('图表渲染失败: ' + e.message);
    }
  }

  btnRender.addEventListener('click', renderChart);
  
  // 切换类型时自动重新渲染
  typeSelect.addEventListener('change', renderChart);

  // 初始化
  setTimeout(renderChart, 100);
})();