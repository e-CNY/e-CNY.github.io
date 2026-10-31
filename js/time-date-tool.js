(function () {
  // Tabs
  var tabs = document.querySelectorAll('.td-tab');
  var panels = document.querySelectorAll('.td-panel');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      panels.forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
      if(tab.dataset.target === 'panel-timezone') updateTimezones();
    });
  });

  // ================= 1. 时间戳转换 =================
  function getNowStr() {
    var now = Date.now();
    return Math.floor(now/1000) + ' (秒) / ' + now + ' (毫秒)';
  }
  document.getElementById('ts-now').value = getNowStr();
  document.getElementById('btn-ts-now').addEventListener('click', function() {
    document.getElementById('ts-now').value = getNowStr();
  });

  document.getElementById('btn-ts-to-date').addEventListener('click', function() {
    var val = document.getElementById('ts-input').value.trim();
    if(!val) return;
    var ts = parseInt(val, 10);
    if(val.length === 10) ts *= 1000; // 秒转毫秒
    var d = new Date(ts);
    if(isNaN(d.getTime())) return document.getElementById('ts-out-date').textContent = '无效时间戳';
    document.getElementById('ts-out-date').textContent = d.toLocaleString() + ' (本地时间)';
  });

  document.getElementById('btn-date-to-ts').addEventListener('click', function() {
    var val = document.getElementById('date-input').value;
    if(!val) return;
    var d = new Date(val);
    var ts = d.getTime();
    document.getElementById('ts-out-ts').innerHTML = '秒: ' + Math.floor(ts/1000) + ' <br> 毫秒: ' + ts;
  });

  // ================= 2. 日期加减 =================
  document.getElementById('calc-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('btn-calc-date').addEventListener('click', function() {
    var dateStr = document.getElementById('calc-date').value;
    var days = parseInt(document.getElementById('calc-days').value, 10);
    if(!dateStr || isNaN(days)) return;
    var d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    document.getElementById('calc-out').textContent = d.toISOString().split('T')[0];
  });

  // ================= 3. 多时区 =================
  var timezones = [
    { name: '北京/上海', tz: 'Asia/Shanghai' },
    { name: '东京', tz: 'Asia/Tokyo' },
    { name: '伦敦', tz: 'Europe/London' },
    { name: '巴黎', tz: 'Europe/Paris' },
    { name: '纽约', tz: 'America/New_York' },
    { name: '洛杉矶', tz: 'America/Los_Angeles' },
    { name: '悉尼', tz: 'Australia/Sydney' },
    { name: '迪拜', tz: 'Asia/Dubai' }
  ];
  
  function updateTimezones() {
    var baseVal = document.getElementById('tz-base').value;
    var d = baseVal ? new Date(baseVal) : new Date();
    var grid = document.getElementById('tz-grid');
    grid.innerHTML = '';
    
    timezones.forEach(function(tz) {
      var str = d.toLocaleString('zh-CN', { timeZone: tz.tz, hour12: false });
      var card = document.createElement('div');
      card.className = 'tz-card';
      card.innerHTML = '<h4>' + tz.name + '</h4><div class="time">' + str + '</div>';
      grid.appendChild(card);
    });
  }
  document.getElementById('tz-base').addEventListener('input', updateTimezones);
  // 初始化当前时间
  var now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('tz-base').value = now.toISOString().slice(0, 19);

  // ================= 4. 农历 =================
  document.getElementById('lunar-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('btn-lunar').addEventListener('click', function() {
    var val = document.getElementById('lunar-date').value;
    if(!val) return;
    var parts = val.split('-');
    var solarY = parseInt(parts[0], 10);
    var solarM = parseInt(parts[1], 10);
    var solarD = parseInt(parts[2], 10);
    
    try {
      var res = solarlunar.solar2lunar(solarY, solarM, solarD);
      document.getElementById('lunar-out').innerHTML = 
        '农历日期：<b>' + res.gzYear + '年 ' + res.monthCn + res.dayCn + '</b><br>' +
        '生肖属相：<b>' + res.animal + '</b><br>' +
        '节气：<b>' + (res.term || '无') + '</b><br>' +
        '星期：<b>' + res.ncWeek + '</b>';
    } catch(e) {
      document.getElementById('lunar-out').textContent = '计算失败，请检查日期是否合法。';
    }
  });

})();