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
        <input type="number" class="size" value="${r.size}" placeholder="KB">
        <button class="del">✕</button>
      `;
      div.querySelector('.name').addEventListener('input', function(e) { resources[i].name = e.target.value; });
      div.querySelector('.size').addEventListener('input', function(e) { resources[i].size = parseFloat(e.target.value) || 0; });
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
    var bw = parseFloat(bwInput.value) || 1; // Mbps
    var rtt = parseFloat(rttInput.value) || 100; // ms
    var bytesPerMs = (bw * 1024 * 1024) / 8 / 1000; // KB/ms 的换算：Mbps -> MB/s -> KB/ms

    btnSimulate.disabled = true;
    btnSimulate.textContent = '模拟中...';
    waterfall.innerHTML = '';

    // 计算每个资源的耗时
    var maxTime = 0;
    var domElements = [];

    resources.forEach(function(r, i) {
      // 模拟并发，通过 RTT 错开启动时间
      var startTime = rtt + (i * (rtt / 2)); 
      // 传输时间 = 大小 / 带宽
      var transferTime = r.size / bytesPerMs;
      var endTime = startTime + transferTime;

      if (endTime > maxTime) maxTime = endTime;

      var barWrap = document.createElement('div');
      barWrap.className = 'ss-bar-wrap';
      barWrap.innerHTML = `
        <div class="ss-bar-name" title="${r.name}">${r.name}</div>
        <div class="ss-bar-track">
          <div class="ss-bar-fill" id="bar-${i}"><span class="ss-bar-label">${r.size} KB</span></div>
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
    for (var t = 0; t <= Math.ceil(maxTime/1000)*1000; t += 1000) {
      var span = document.createElement('span');
      span.textContent = (t/1000) + 's';
      ruler.appendChild(span);
    }

    // 动画执行
    await new Promise(r => setTimeout(r, 100));

    domElements.forEach(function(item) {
      var leftPercent = (item.start / item.total) * 100;
      var widthPercent = ((item.end - item.start) / item.total) * 100;
      
      item.el.style.left = leftPercent + '%';
      item.el.style.width = widthPercent + '%';
      item.el.style.opacity = '1';
    });

    summary.innerHTML = `✅ 模拟完成，总耗时（最后资源加载完毕）: <b>${(maxTime/1000).toFixed(2)}s</b>`;
    
    setTimeout(function() {
      btnSimulate.disabled = false;
      btnSimulate.textContent = '▶️ 开始模拟';
    }, 1000);
  });

  // 初始化
  renderList();
  btnSimulate.click();
})();