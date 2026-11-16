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
  var chartDom = document.getElementById('ng-chart');
  var myChart = echarts.init(chartDom);
  var layoutSelect = document.getElementById('ng-layout');
  var symbolSelect = document.getElementById('ng-symbol');
  var searchInput = document.getElementById('ng-search');
  var dataTextarea = document.getElementById('ng-data');
  var loadingOverlay = document.getElementById('ng-loading');

  // ================= 默认示例数据 =================
  var defaultCategories = [
    { name: '核心', itemStyle: { color: '#a8452a' } },
    { name: '前端', itemStyle: { color: '#7ba05b' } },
    { name: '后端', itemStyle: { color: '#4a90e2' } },
    { name: '工具', itemStyle: { color: '#f1c40f' } }
  ];

  var defaultNodes = [
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

  var defaultLinks = [
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

  // 当前使用的真实数据
  var currentNodes = [];
  var currentLinks = [];
  var currentCategories = [];

  // ================= 核心渲染函数 =================
  function initChartData(nodes, links, categories) {
    currentNodes = JSON.parse(JSON.stringify(nodes));
    currentLinks = links;
    currentCategories = categories || [];

    // 重置搜索框
    searchInput.value = '';

    var option = {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: function (params) {
          if (params.dataType === 'node') {
            return '<b>' + params.data.name + '</b><br/>ID: ' + params.data.id;
          }
          return params.data.source + ' -> ' + params.data.target;
        }
      },
      legend: [{ 
        data: currentCategories.map(function (a) { return a.name; }), 
        bottom: 0,
        textStyle: { color: '#4b3f2f' }
      }],
      series: [{
        type: 'graph',
        layout: layoutSelect.value, // 从 UI 读取布局
        data: currentNodes,
        links: currentLinks,
        categories: currentCategories,
        roam: true,           // 允许缩放和拖拽画布
        draggable: true,      // 允许拖拽节点
        label: { 
          show: true, 
          position: 'right', 
          formatter: '{b}',
          color: '#3d3226',
          fontSize: 12
        },
        force: { 
          repulsion: 300, 
          edgeLength: 120, 
          gravity: 0.1 
        },
        lineStyle: { 
          color: 'source', 
          curveness: 0.1, 
          width: 1.5,
          opacity: 0.7
        },
        edgeSymbol: ['none', 'arrow'], // 连线带箭头
        edgeSymbolSize: 8,
        itemStyle: { 
          borderColor: '#fff', 
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.1)'
        },
        emphasis: { 
          focus: 'adjacency', 
          lineStyle: { width: 3 },
          label: { fontWeight: 'bold' }
        },
        symbol: symbolSelect.value // 从 UI 读取形状
      }]
    };

    myChart.clear();
    myChart.setOption(option);
  }

  // ================= 数据交互与解析 =================
  function applyCustomData() {
    var raw = dataTextarea.value.trim();
    if (!raw) return showToast('请输入 JSON 数据', true);

    loadingOverlay.style.display = 'flex';

    // 延时防止主线程卡死
    setTimeout(function() {
      try {
        var json = JSON.parse(raw);
        if (!json.nodes || !Array.isArray(json.nodes)) throw new Error('缺少 nodes 数组');
        if (!json.links || !Array.isArray(json.links)) throw new Error('缺少 links 数组');
        
        // 简单处理：如果没有传入 categories，尝试自动分类
        var cats = json.categories;
        if (!cats && json.nodes.length > 0 && json.nodes[0].category !== undefined) {
          // 如果节点自带了 category，就生成一个默认图例
          var catSet = new Set();
          json.nodes.forEach(function(n) { catSet.add(n.category); });
          cats = Array.from(catSet).map(function(c, i) { return { name: '类别 ' + c }; });
        }

        initChartData(json.nodes, json.links, cats);
        showToast('数据应用成功');
      } catch (e) {
        showToast('JSON 解析失败: ' + e.message, true);
      } finally {
        loadingOverlay.style.display = 'none';
      }
    }, 100);
  }

  // ================= 节点搜索与高亮 =================
  function searchNode() {
    var keyword = searchInput.value.trim().toLowerCase();
    if (!keyword) return resetSearch();

    var foundIndex = -1;
    currentNodes.forEach(function(n, i) {
      if (n.name.toLowerCase().includes(keyword)) {
        foundIndex = i;
      }
    });

    if (foundIndex === -1) {
      return showToast('未找到包含该关键词的节点', true);
    }

    // 重新拷贝一份数据用于修改
    var highlightNodes = JSON.parse(JSON.stringify(currentNodes));
    
    highlightNodes.forEach(function(n, i) {
      if (i === foundIndex) {
        // 找到的节点：放大、高亮边框、加阴影
        n.symbolSize = (n.symbolSize || 30) * 1.5;
        n.itemStyle = { 
          borderColor: '#ff0000', 
          borderWidth: 4, 
          shadowBlur: 20, 
          shadowColor: 'rgba(255,0,0,0.5)' 
        };
      } else {
        // 其他节点：变暗
        n.itemStyle = { opacity: 0.2 };
        n.label = { show: false }; // 隐藏标签防遮挡
      }
    });

    myChart.setOption({ series: [{ data: highlightNodes }] });

    // 将视野聚焦到该节点
    myChart.dispatchAction({
      type: 'focusNodeAdjacency',
      seriesIndex: 0,
      dataIndex: foundIndex
    });
    
    showToast('已定位到节点: ' + highlightNodes[foundIndex].name);
  }

  function resetSearch() {
    searchInput.value = '';
    // 恢复原始数据
    myChart.setOption({ series: [{ data: JSON.parse(JSON.stringify(currentNodes)) }] });
    // 取消聚焦
    myChart.dispatchAction({ type: 'unfocusNodeAdjacency', seriesIndex: 0 });
  }

  // ================= 导出与重置 =================
  function downloadImage() {
    var url = myChart.getDataURL({
      type: 'png',
      pixelRatio: 2, // 2倍高清
      backgroundColor: '#ffffff'
    });
    var a = document.createElement('a');
    a.href = url;
    a.download = 'network_graph_' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('图片已开始下载');
  }

  function resetData() {
    if (confirm('确定要恢复为默认的示例数据吗？')) {
      var raw = {
        categories: defaultCategories,
        nodes: defaultNodes,
        links: defaultLinks
      };
      dataTextarea.value = JSON.stringify(raw, null, 2);
      initChartData(defaultNodes, defaultLinks, defaultCategories);
      showToast('已恢复示例数据');
    }
  }

  // ================= 事件绑定 =================
  
  // 切换布局
  layoutSelect.addEventListener('change', function () {
    myChart.setOption({ series: [{ layout: this.value }] });
  });

  // 切换形状
  symbolSelect.addEventListener('change', function () {
    myChart.setOption({ series: [{ symbol: this.value }] });
  });

  // 搜索
  document.getElementById('btn-search').addEventListener('click', searchNode);
  document.getElementById('btn-clear-search').addEventListener('click', resetSearch);
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchNode();
  });

  // 操作按钮
  document.getElementById('btn-apply-data').addEventListener('click', applyCustomData);
  document.getElementById('btn-reset-data').addEventListener('click', resetData);
  document.getElementById('btn-download').addEventListener('click', downloadImage);
  document.getElementById('btn-reset-view').addEventListener('click', function() {
    // 重新渲染当前数据可以重置力导向的排布
    initChartData(currentNodes, currentLinks, currentCategories);
    showToast('节点已重新整理');
  });

  // ================= 初始化 =================
  var initRaw = {
    categories: defaultCategories,
    nodes: defaultNodes,
    links: defaultLinks
  };
  dataTextarea.value = JSON.stringify(initRaw, null, 2);
  initChartData(defaultNodes, defaultLinks, defaultCategories);

  // 窗口自适应
  window.addEventListener('resize', function() {
    myChart.resize();
  });

})();