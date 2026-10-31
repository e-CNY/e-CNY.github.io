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
    if(val.length === 10) ts *= 1000; 
    var d = new Date(ts);
    if(isNaN(d.getTime())) return document.getElementById('ts-out-date').textContent = '......';
    document.getElementById('ts-out-date').textContent = d.toLocaleString('zh-CN', { hour12: false });
  });

  document.getElementById('btn-date-to-ts').addEventListener('click', function() {
    var val = document.getElementById('date-input').value;
    if(!val) return;
    var d = new Date(val);
    if (isNaN(d.getTime())) return document.getElementById('ts-out-ts').textContent = '......';
    var ts = d.getTime();
    document.getElementById('ts-out-ts').innerHTML = '秒: ' + Math.floor(ts/1000) + ' &nbsp;|&nbsp; 毫秒: ' + ts;
  });

  // ================= 2. 日期加减 =================
  document.getElementById('calc-date').value = new Date().toISOString().split('T')[0];
  
  document.getElementById('btn-calc-date').addEventListener('click', function() {
    var dateStr = document.getElementById('calc-date').value;
    var days = parseInt(document.getElementById('calc-days').value, 10);
    var outEl = document.getElementById('calc-out');
    
    if(!dateStr || isNaN(days)) {
      outEl.textContent = '请输入有效的日期和天数';
      return;
    }
    
    var d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    
    if (isNaN(d.getTime())) {
      outEl.textContent = '......';
      return;
    }

    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var weekStr = '日一二三四五六'.charAt(d.getDay());
    
    outEl.style.color = '#3d3226';
    outEl.textContent = y + '-' + m + '-' + day + ' (星期' + weekStr + ')';
  });

  // ================= 3. 多时区 =================
  var timezones = [
    { name: '北京/上海', tz: 'Asia/Shanghai' },
    { name: '香港/台北', tz: 'Asia/Hong_Kong' },
    { name: '东京', tz: 'Asia/Tokyo' },
    { name: '首尔', tz: 'Asia/Seoul' },
    { name: '新加坡', tz: 'Asia/Singapore' },
    { name: '迪拜', tz: 'Asia/Dubai' },
    { name: '伦敦', tz: 'Europe/London' },
    { name: '巴黎', tz: 'Europe/Paris' },
    { name: '柏林', tz: 'Europe/Berlin' },
    { name: '莫斯科', tz: 'Europe/Moscow' },
    { name: '纽约', tz: 'America/New_York' },
    { name: '芝加哥', tz: 'America/Chicago' },
    { name: '洛杉矶', tz: 'America/Los_Angeles' },
    { name: '多伦多', tz: 'America/Toronto' },
    { name: '圣保罗', tz: 'America/Sao_Paulo' },
    { name: '悉尼', tz: 'Australia/Sydney' }
  ];
  
  function updateTimezones() {
    var baseVal = document.getElementById('tz-base').value;
    var d = baseVal ? new Date(baseVal) : new Date();
    if (isNaN(d.getTime())) return;
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
  var now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('tz-base').value = now.toISOString().slice(0, 19);

  // ================= 4. 农历与生肖 =================
  document.getElementById('lunar-date').value = new Date().toISOString().split('T')[0];
  
  function calcLunar() {
    var val = document.getElementById('lunar-date').value;
    var outEl = document.getElementById('lunar-out');
    if(!val) return;
    
    var parts = val.split('-');
    var solarY = parseInt(parts[0], 10);
    var solarM = parseInt(parts[1], 10);
    var solarD = parseInt(parts[2], 10);
    
    if (typeof solarlunar === 'undefined') {
      outEl.innerHTML = '<div style="color:#a8452a; padding:10px;">❌ 农历库未加载。</div>';
      return;
    }

    if (solarY < 1900 || solarY > 2100) {
      outEl.innerHTML = '<div style="color:#a8452a; padding:10px; width: 100%; text-align: center;">⚠️ 农历和节气目前仅支持 1900 - 2100 年。</div>';
      return;
    }

    try {
      var res = solarlunar.solar2lunar(solarY, solarM, solarD);
      
      // 只保留 5 个核心数据，并排显示
      outEl.innerHTML = `
        <div class="lunar-item">
          <span class="label">农历日期</span>
          <span class="value">${res.gzYear}年 ${res.monthCn}${res.dayCn}</span>
        </div>
        <div class="lunar-item">
          <span class="label">干支纪年</span>
          <span class="value">${res.gzYear} ${res.gzMonth} ${res.gzDay}</span>
        </div>
        <div class="lunar-item">
          <span class="label">生肖属相</span>
          <span class="value">${res.animal}</span>
        </div>
        <div class="lunar-item">
          <span class="label">节气</span>
          <span class="value">${res.term || '无'}</span>
        </div>
        <div class="lunar-item">
          <span class="label">星期</span>
          <span class="value">${res.ncWeek}</span>
        </div>
      `;
    } catch(e) {
      outEl.innerHTML = '<div style="color:#a8452a; padding:10px; width: 100%; text-align: center;">❌ 该年份数据异常。</div>';
    }
  }

  document.getElementById('btn-lunar').addEventListener('click', calcLunar);
  document.getElementById('lunar-date').addEventListener('change', calcLunar);
  
  setTimeout(calcLunar, 100);

})();