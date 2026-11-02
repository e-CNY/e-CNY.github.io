(function () {
  var resList = document.getElementById('ss-res-list');
  var btnAdd = document.getElementById('btn-add-res');
  var btnSimulate = document.getElementById('btn-simulate');
  var waterfall = document.getElementById('ss-waterfall');
  var networkSelect = document.getElementById('ss-network');
  var bwInput = document.getElementById('ss-bw');
  var rttInput = document.getElementById('ss-rtt');
  var summary = document.getElementById('ss-summary');

  // 默认资源
  var resources = [
    { name: 'HTML', size: 15 }, { name: 'CSS', size: 50 }, 
    { name: 'JS', size: 120 }, { name: '图片 A', size: 200 }, 
    { name: '图片 B', size: 350 }
  ];

  var presets = {
    '4g': { bw: 10, rtt: 50 },
    '3g': { bw: 1.5, rtt: 200 },
    'slow3g': { bw: 0.4, rtt: 400 },
    'wifi': { bw: 50, rtt: 10 }
  };

  networkSelect.addEventListener('change', function() {
    if (presets[this.value]) {
      bwInput.value = presets[this.value].bw;
      rttInput.value = presets[this.value].rtt;
    }
  });

  function renderList() {
    resList.innerHTML = '';
    resources.forEach(function(r, i) {
      var div = document.createElement('div');
      div.className = 'ss-res-item';
      div.innerHTML = `
        <input type="text" class="name" value="${r.name}" placeholder="名称">
        <input type="number" class="size" value="${r.size}" placeholder="KB" min="1">
        <button class="del">✕</button>
      `;
      div.querySelector('.name').addEventListener('input', function(e) { resources[i].name = e.target.value; });
      div.querySelector('.size').addEventListener('input', function(e) { 
        var val = parseFloat(e.target.value);
        resources[i].size = isNaN(val) ? 1 : Math.max(1, val); 
      });
      div.querySelector('.del').addEventListener('click', function() {
        resources.splice(i, 1);
        renderList();
      });
      resList.appendChild(div);
    });
  }

  btnAdd.addEventListener('click', function() {
    resources.push({ name: '新资源', size: 100 });
    renderList();
  });

  btnSimulate.addEventListener('click', async function() {
    // 容错：确保带宽和延迟不会是 0 或 NaN
    var bw = parseFloat(bwInput.value) || 1; 
    if (bw <= 0) bw = 1;
    var rtt = parseFloat(rttInput.value) || 100; 
    if (rtt < 0) rtt = 0;

    // 计算每毫秒能传输多少 KB (1 Mbps = 128 KB/s = 0.128 KB/ms)
    var kbPerMs = (bw * 128) / 1000; 

    btnSimulate.disabled = true;
    btnSimulate.textContent = '模拟中...';
    waterfall.innerHTML = '';

    var maxTime = 0;
    var domElements = [];

    resources.forEach(function(r, i) {
      var startTime = rtt + (i * (rtt / 2)); 
      // 确保大小至少为 1KB，防止除以 0 或无穷大
      var safeSize = r.size > 0 ? r.size : 1;
      var transferTime = safeSize / kbPerMs; 
      var endTime = startTime + transferTime;

      if (endTime > maxTime) maxTime = endTime;

      var barWrap = document.createElement('div');
      barWrap.className = 'ss-bar-wrap';
      barWrap.innerHTML = `
        <div class="ss-bar-name" title="${r.name}">${r.name || '未命名'}</div>
        <div class="ss-bar-track">
          <div class="ss-bar-fill" id="bar-${i}"><span class="ss-bar-label">${safeSize} KB</span></div>
        </div>
      `;
      waterfall.appendChild(barWrap);
      
      domElements.push({
        el: barWrap.querySelector('.ss-bar-fill'),
        start: startTime,
        end: endTime,
        total: maxTime
      });
    });

    // 渲染时间刻度尺
    var ruler = document.getElementById('ss-time-ruler');
    ruler.innerHTML = '';
    var step = Math.ceil(maxTime / 5); // 分5段
    for (var t = 0; t <= maxTime + step; t += step) {
      var span = document.createElement('span');
      span.textContent = (t/1000).toFixed(1) + 's';
      ruler.appendChild(span);
    }

    // 动画执行
    await new Promise(r => setTimeout(r, 100));

    domElements.forEach(function(item) {
      // 防止 maxTime 异常导致的百分比变成 NaN
      var leftPercent = item.total > 0 ? (item.start / item.total) * 100 : 0;
      var widthPercent = item.total > 0 ? ((item.end - item.start) / item.total) * 100 : 100;
      
      item.el.style.left = leftPercent + '%';
      item.el.style.width = widthPercent + '%';
      item.el.style.opacity = '1';
    });

    summary.innerHTML = `✅ 模拟完成，总耗时: <b>${(maxTime/1000).toFixed(2)}s</b>`;
    
    setTimeout(function() {
      btnSimulate.disabled = false;
      btnSimulate.textContent = '▶️ 开始模拟';
    }, 1000);
  });

  // 初始化
  renderList();
  // 延迟触发，防止 DOM 未渲染完毕
  setTimeout(function() { btnSimulate.click(); }, 300);
})();