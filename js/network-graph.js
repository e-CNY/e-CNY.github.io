(function () {
  var chartDom = document.getElementById('ng-chart');
  var myChart = echarts.init(chartDom);
  var layoutSelect = document.getElementById('ng-layout');
  var symbolSelect = document.getElementById('ng-symbol');
  var searchInput = document.getElementById('ng-search');

  // 模拟知识图谱数据
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
    { id: '9', name: 'ECharts', symbolSize: 30, category: 1 },
    { id: '10', name: 'Chart.js', symbolSize: 30, category: 1 },
    { id: '11', name: 'Mermaid', symbolSize: 30, category: 1 }
  ];

  var links = [
    { source: '0', target: '3' },
    { source: '1', target: '0' },
    { source: '2', target: '0' },
    { source: '3', target: '4' },
    { source: '3', target: '8' },
    { source: '3', target: '9' },
    { source: '3', target: '10' },
    { source: '3', target: '11' },
    { source: '4', target: '0' },
    { source: '5', target: '0' },
    { source: '6', target: '0' },
    { source: '7', target: '6' }
  ];

  var option = {
    tooltip: {},
    legend: [{ data: categories.map(function (a) { return a.name; }), bottom: 10 }],
    series: [{
      type: 'graph',
      layout: 'force',
      data: JSON.parse(JSON.stringify(nodes)), // 深拷贝防止污染
      links: links,
      categories: categories,
      roam: true, 
      label: { show: true, position: 'right', formatter: '{b}' },
      force: { repulsion: 300, edgeLength: 100, gravity: 0.1 },
      lineStyle: { color: 'source', curveness: 0.1, width: 2 },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      emphasis: { focus: 'adjacency', lineStyle: { width: 4 } }
    }]
  };

  myChart.setOption(option);

  // 切换布局
  layoutSelect.addEventListener('change', function () {
    myChart.setOption({ series: [{ layout: this.value }] });
  });

  // 切换形状
  symbolSelect.addEventListener('change', function () {
    myChart.setOption({ series: [{ symbol: this.value }] });
  });

  // 搜索节点并高亮
  document.getElementById('btn-search').addEventListener('click', function () {
    var keyword = searchInput.value.trim();
    if (!keyword) return;

    // 恢复所有节点原始状态
    myChart.setOption({ series: [{ data: JSON.parse(JSON.stringify(nodes)) }] });

    var foundNode = nodes.find(function(n) { return n.name.toLowerCase().includes(keyword.toLowerCase()); });
    
    if (foundNode) {
      // 将找到的节点放大并高亮
      var newNodes = JSON.parse(JSON.stringify(nodes));
      newNodes.forEach(function(n) {
        if (n.id === foundNode.id) {
          n.symbolSize = 80;
          n.itemStyle = { borderColor: '#000', borderWidth: 4, shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.5)' };
        } else {
          n.itemStyle = { opacity: 0.3 }; // 其他节点变暗
        }
      });
      myChart.setOption({ series: [{ data: newNodes }] });
    } else {
      alert('未找到该节点');
    }
  });

  // 搜索框回车支持
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') document.getElementById('btn-search').click();
  });

  window.addEventListener('resize', function() {
    myChart.resize();
  });
})();