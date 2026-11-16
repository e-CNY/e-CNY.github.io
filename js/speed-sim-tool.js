(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  // ================= DOM 元素 =================
  var resList = document.getElementById('ss-res-list');
  var btnAdd = document.getElementById('btn-add-res');
  var btnReset = document.getElementById('btn-reset-res');
  var btnSimulate = document.getElementById('btn-simulate');
  var waterfall = document.getElementById('ss-waterfall');
  var gridLines = document.getElementById('ss-grid-lines');
  var networkSelect = document.getElementById('ss-network');
  var bwInput = document.getElementById('ss-bw');
  var rttInput = document.getElementById('ss-rtt');
  var concurrencySelect = document.getElementById('ss-concurrency');
  
  var statReq = document.getElementById('stat-req');
  var statSize = document.getElementById('stat-size');
  var statTime = document.getElementById('stat-time');
  var totalCount = document.getElementById('ss-total-count');

  var typeColors = {
    'html': '#f59e0b', // 橙
    'css': '#3b82f6',  // 蓝
    'js': '#eab308',   // 黄
    'img': '#10b981',  // 绿
    'font': '#8b5cf6', // 紫
    'other': '#94a3b8' // 灰
  };

  var defaultResources = [
    { name: 'index.html', type: 'html', size: 15 },
    { name: 'style.css', type: 'css', size: 45 },
    { name: 'app.js', type: 'js', size: 120 },
    { name: 'vendor.js', type: 'js', size: 250 },
    { name: 'hero-bg.jpg', type: 'img', size: 450 },
    { name: 'logo.png', type: 'img', size: 80 },
    { name: 'icon-font.woff2', type: 'font', size: 35 }
  ];

  var resources = JSON.parse(JSON.stringify(defaultResources));

  var presets = {
    '5g': { bw: 100, rtt: 10 },
    '4g': { bw: 15, rtt: 50 },
    '3g': { bw: 1.5, rtt: 200 },
    'slow3g': { bw: 0.4, rtt: 400 },
    'wifi': { bw: 50, rtt: 5 }
  };

  // ================= 1. 配置交互 =================
  networkSelect.addEventListener('change', function() {
    if (presets[this.value]) {
      bwInput.value = presets[this.value].bw;
      rttInput.value = presets[this.value].rtt;
    }
  });

  // ================= 2. 资源列表渲染 =================
  function renderList() {
    resList.innerHTML = '';
    resources.forEach(function(r, i) {
      var div = document.createElement('div');
      div.className = 'ss-res-item';
      div.innerHTML = `
        <input type="text" class="name" value="${r.name}" placeholder="资源名">
        <select class="type">
          <option value="html" ${r.type === 'html' ? 'selected' : ''}>HTML</option>
          <option value="css" ${r.type === 'css' ? 'selected' : ''}>CSS</option>
          <option value="js" ${r.type === 'js' ? 'selected' : ''}>JS</option>
          <option value="img" ${r.type === 'img' ? 'selected' : ''}>IMG</option>
          <option value="font" ${r.type === 'font' ? 'selected' : ''}>Font</option>
          <option value="other" ${r.type === 'other' ? 'selected' : ''}>其他</option>
        </select>
        <input type="number" class="size" value="${r.size}" placeholder="KB" min="1">
        <button class="del" title="删除">✕</button>
      `;
      div.querySelector('.name').addEventListener('input', function(e) { resources[i].name = e.target.value; });
      div.querySelector('.type').addEventListener('change', function(e) { resources[i].type = e.target.value; });
      div.querySelector('.size').addEventListener('input', function(e) { 
        var val = parseFloat(e.target.value);
        resources[i].size = isNaN(val) ? 1 : Math.max(1, val); 
      });
      div.querySelector('.del').addEventListener('click', function() {
        if (btnSimulate.disabled) return; // 模拟中禁止删除
        resources.splice(i, 1);
        renderList();
      });
      resList.appendChild(div);
    });
    totalCount.textContent = resources.length;
    
    // 同步更新底部统计
    var totalSize = resources.reduce(function(acc, r) { return acc + r.size; }, 0);
    statReq.textContent = resources.length;
    statSize.textContent = totalSize > 1024 ? (totalSize/1024).toFixed(2) + ' MB' : totalSize + ' KB';
  }

  btnAdd.addEventListener('click', function() {
    if (btnSimulate.disabled) return;
    resources.push({ name: 'new-resource', type: 'other', size: 50 });
    renderList();
    resList.scrollTop = resList.scrollHeight;
  });

  btnReset.addEventListener('click', function() {
    if (btnSimulate.disabled) return;
    resources = JSON.parse(JSON.stringify(defaultResources));
    renderList();
    showToast('已重置为默认资源列表');
  });

  // ================= 3. 模拟核心算法 =================
  btnSimulate.addEventListener('click', function() {
    if (resources.length === 0) return showToast('请至少添加一个资源');

    var bw = parseFloat(bwInput.value) || 1; 
    if (bw <= 0) bw = 1;
    var rtt = parseFloat(rttInput.value) || 100; 
    if (rtt < 0) rtt = 0;
    var maxConcurrency = parseInt(concurrencySelect.value, 10) || 6;

    // 1 Mbps = 128 KB/s = 0.128 KB/ms
    var kbPerMs = (bw * 128) / 1000; 

    btnSimulate.disabled = true;
    btnSimulate.textContent = '⏳ 模拟中...';
    waterfall.innerHTML = '';
    waterfall.appendChild(gridLines);
    gridLines.innerHTML = '';

    // 计算每个资源的开始和结束时间（并发排队模型）
    var currentSlots = new Array(maxConcurrency).fill(0); // 记录每个并发通道的空闲时间
    var timeline = [];
    var maxTime = 0;

    resources.forEach(function(r, i) {
      // 找到最早空闲的通道
      var minSlotIdx = 0;
      for (var s = 1; s < currentSlots.length; s++) {
        if (currentSlots[s] < currentSlots[minSlotIdx]) {
          minSlotIdx = s;
        }
      }
      
      var startTime = currentSlots[minSlotIdx];
      // 真实情况：如果通道空闲，需要 RTT 才能拿到数据；如果通道被占用，前一个请求结束后也要等 RTT (这里简化为叠加)
      if (startTime > 0) startTime += rtt; 
      else startTime += rtt; // 第一个请求总是有初始延迟

      var safeSize = r.size > 0 ? r.size : 1;
      var transferTime = safeSize / kbPerMs; 
      var endTime = startTime + transferTime;

      // 更新通道空闲时间
      currentSlots[minSlotIdx] = endTime;

      if (endTime > maxTime) maxTime = endTime;

      timeline.push({
        r: r,
        start: startTime,
        end: endTime,
        index: i
      });
    });

    // 更新预估总时间
    statTime.textContent = (maxTime / 1000).toFixed(2) + 's';

    // 渲染时间刻度尺和网格线
    renderRulerAndGrid(maxTime);

    // 渲染 DOM 瀑布流
    var domElements = [];
    timeline.forEach(function(item) {
      var color = typeColors[item.r.type] || typeColors.other;
      
      var barWrap = document.createElement('div');
      barWrap.className = 'ss-bar-wrap';
      barWrap.innerHTML = `
        <div class="ss-bar-name" title="${item.r.name}">
          <div class="ss-bar-icon" style="background:${color}"></div>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.r.name || '未命名'}</span>
        </div>
        <div class="ss-bar-track">
          <div class="ss-bar-fill" style="background:${color};">
            <span class="ss-bar-label">${Math.round(item.end - item.start)}ms</span>
          </div>
        </div>
      `;
      waterfall.appendChild(barWrap);
      
      domElements.push({
        el: barWrap.querySelector('.ss-bar-fill'),
        label: barWrap.querySelector('.ss-bar-label'),
        start: item.start,
        end: item.end,
        total: maxTime
      });
    });

    // 执行动画
    setTimeout(function() {
      domElements.forEach(function(item) {
        var leftPercent = item.total > 0 ? (item.start / item.total) * 100 : 0;
        var widthPercent = item.total > 0 ? ((item.end - item.start) / item.total) * 100 : 100;
        
        item.el.style.left = leftPercent + '%';
        item.el.style.width = widthPercent + '%';
        item.el.style.opacity = '1';
        item.label.style.opacity = '1';
      });
    }, 50);

    // 恢复按钮
    setTimeout(function() {
      btnSimulate.disabled = false;
      btnSimulate.textContent = '▶️ 开始模拟';
      showToast('模拟完成，总耗时 ' + (maxTime/1000).toFixed(2) + 's');
    }, 1000); // 等待动画走完
  });

  function renderRulerAndGrid(maxTime) {
    var ruler = document.getElementById('ss-time-ruler');
    ruler.innerHTML = '';
    gridLines.innerHTML = '';
    
    // 将总时间分为 5 个刻度
    var segments = 5;
    var step = maxTime / segments;
    
    // 向上取整到一个比较整的数字 (如 100, 200, 500, 1000)
    var stepSize = 10;
    if (step > 1000) stepSize = 200;
    else if (step > 500) stepSize = 100;
    else if (step > 100) stepSize = 50;
    else if (step > 50) stepSize = 10;
    
    // 重新计算真实刻度
    var actualMax = Math.ceil(maxTime / stepSize) * stepSize;
    var actualSteps = actualMax / stepSize;

    for (var i = 0; i <= actualSteps; i++) {
      var t = i * stepSize;
      var span = document.createElement('span');
      span.textContent = (t / 1000).toFixed(2) + 's';
      ruler.appendChild(span);

      if (i > 0) {
        var line = document.createElement('div');
        line.style.width = '1px';
        line.style.background = '#e5e7eb';
        line.style.position = 'absolute';
        line.style.left = ((i / actualSteps) * 100) + '%';
        line.style.top = '0';
        line.style.bottom = '0';
        line.style.zIndex = '0';
        // 因为 gridLines 在 track 内部可能不太好绝对定位，这里简化为在瀑布流容器中添加垂直线
        // 这里为了不破坏布局，我们通过 background-image 的方式在 track 里画
      }
    }
  }

  // 键盘快捷键
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !btnSimulate.disabled) {
      btnSimulate.click();
    }
  });

  // 初始化
  renderList();

})();