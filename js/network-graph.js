(function () {
  var chartDom = document.getElementById('ng-chart');
  var myChart = echarts.init(chartDom);

  // 模拟一份极客关系网络数据
  var categories = [
    { name: '核心', itemStyle: { color: '#a8452a' } },
    { name: '前端', itemStyle: { color: '#7ba05b' } },
    { name: '后端', itemStyle: { color: '#4a90e2' } },
    { name: '工具', itemStyle: { color: '#f1c40f' } }
  ];

  var nodes = [
    { id: '0', name: '工具站', symbolSize: 60, category: 0 },
    { id: '1', name: 'HTML', symbolSize: 40, category: 1 },
    { id: '2', name: 'CSS', symbolSize: 40, category: 1 },
    { id: '3', name: 'JavaScript', symbolSize: 50, category: 1 },
    { id: '4', name: 'Node.js', symbolSize: 45, category: 2 },
    { id: '5', name: 'Python', symbolSize: 45, category: 2 },
    { id: '6', name: 'GitHub', symbolSize: 35, category: 3 },
    { id: '7', name: 'Git', symbolSize: 35, category: 3 },
    { id: '8', name: 'Fabric.js', symbolSize: 30, category: 1 },
    { id: '9', name: 'ECharts', symbolSize: 30, category: 1 }
  ];

  var links = [
    { source: '0', target: '3' },
    { source: '1', target: '0' },
    { source: '2', target: '0' },
    { source: '3', target: '4' },
    { source: '3', target: '8' },
    { source: '3', target: '9' },
    { source: '4', target: '0' },
    { source: '5', target: '0' },
    { source: '6', target: '0' },
    { source: '7', target: '6' }
  ];

  var option = {
    title: { text: '技术栈知识图谱', left: 'center', top: 20 },
    tooltip: { formatter: '{b}' },
    legend: [{ data: categories.map(function (a) { return a.name; }), bottom: 10 }],
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      categories: categories,
      roam: true, // 支持缩放和拖拽
      label: { show: true, position: 'right', formatter: '{b}' },
      force: { repulsion: 300, edgeLength: 100 },
      lineStyle: { color: 'source', curveness: 0.1, width: 2 },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
    }]
  };

  myChart.setOption(option);
  
  window.addEventListener('resize', function() {
    myChart.resize();
  });
})();