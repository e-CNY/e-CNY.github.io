(function () {
  var tabs = document.querySelectorAll('.dc-tab');
  var searchInput = document.getElementById('dc-search');
  var thead = document.getElementById('dc-thead');
  var tbody = document.getElementById('dc-tbody');
  
  var currentType = 'port';

  // 数据字典
  var data = {
    port: {
      headers: ['端口', '协议', '服务名称', '说明'],
      list: [
        { c1: '20', c2: 'TCP', c3: 'FTP-Data', c4: 'FTP 数据传输' },
        { c1: '21', c2: 'TCP', c3: 'FTP-Control', c4: 'FTP 控制连接' },
        { c1: '22', c2: 'TCP', c3: 'SSH', c4: '安全外壳协议 (Git/服务器)' },
        { c1: '23', c2: 'TCP', c3: 'Telnet', c4: '远程登录（不安全）' },
        { c1: '25', c2: 'TCP', c3: 'SMTP', c4: '简单邮件传输协议' },
        { c1: '53', c2: 'TCP/UDP', c3: 'DNS', c4: '域名系统' },
        { c1: '80', c2: 'TCP', c3: 'HTTP', c4: '万维网服务' },
        { c1: '110', c2: 'TCP', c3: 'POP3', c4: '邮局协议版本3' },
        { c1: '143', c2: 'TCP', c3: 'IMAP', c4: '互联网邮件访问协议' },
        { c1: '443', c2: 'TCP', c3: 'HTTPS', c4: '安全超文本传输协议' },
        { c1: '3306', c2: 'TCP', c3: 'MySQL', c4: 'MySQL 数据库' },
        { c1: '5432', c2: 'TCP', c3: 'PostgreSQL', c4: 'PostgreSQL 数据库' },
        { c1: '6379', c2: 'TCP', c3: 'Redis', c4: 'Redis 数据库' },
        { c1: '27017', c2: 'TCP', c3: 'MongoDB', c4: 'MongoDB 数据库' }
      ]
    },
    country: {
      headers: ['国家/地区', 'ISO 2位', 'ISO 3位', '数字代码'],
      list: [
        { c1: '中国', c2: 'CN', c3: 'CHN', c4: '156' },
        { c1: '美国', c2: 'US', c3: 'USA', c4: '840' },
        { c1: '日本', c2: 'JP', c3: 'JPN', c4: '392' },
        { c1: '英国', c2: 'GB', c3: 'GBR', c4: '826' },
        { c1: '德国', c2: 'DE', c3: 'DEU', c4: '276' },
        { c1: '法国', c2: 'FR', c3: 'FRA', c4: '250' },
        { c1: '韩国', c2: 'KR', c3: 'KOR', c4: '410' },
        { c1: '加拿大', c2: 'CA', c3: 'CAN', c4: '124' },
        { c1: '澳大利亚', c2: 'AU', c3: 'AUS', c4: '036' },
        { c1: '俄罗斯', c2: 'RU', c3: 'RUS', c4: '643' },
        { c1: '新加坡', c2: 'SG', c3: 'SGP', c4: '702' }
      ]
    },
    area: {
      headers: ['国家/地区', '国际区号', '时区'],
      list: [
        { c1: '中国', c2: '+86', c3: 'UTC+8' },
        { c1: '美国/加拿大', c2: '+1', c3: 'UTC-5 至 UTC-10' },
        { c1: '俄罗斯', c2: '+7', c3: 'UTC+2 至 UTC+12' },
        { c1: '英国', c2: '+44', c3: 'UTC+0' },
        { c1: '日本', c2: '+81', c3: 'UTC+9' },
        { c1: '韩国', c2: '+82', c3: 'UTC+9' },
        { c1: '印度', c2: '+91', c3: 'UTC+5:30' },
        { c1: '澳大利亚', c2: '+61', c3: 'UTC+8 至 UTC+10' },
        { c1: '德国', c2: '+49', c3: 'UTC+1' },
        { c1: '法国', c2: '+33', c3: 'UTC+1' },
        { c1: '新加坡', c2: '+65', c3: 'UTC+8' }
      ]
    }
  };

  function renderTable(keyword) {
    var conf = data[currentType];
    
    // 表头
    thead.innerHTML = '<tr>' + conf.headers.map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr>';
    
    // 数据过滤
    var kw = keyword.toLowerCase();
    var filtered = conf.list.filter(function(item) {
      return String(item.c1).toLowerCase().includes(kw) || 
             String(item.c2).toLowerCase().includes(kw) || 
             String(item.c3).toLowerCase().includes(kw) || 
             String(item.c4).toLowerCase().includes(kw);
    });

    // 表体
    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8a7a5f;">未找到匹配项</td></tr>';
      return;
    }

    filtered.forEach(function(item) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + item.c1 + '</td><td>' + item.c2 + '</td><td>' + item.c3 + '</td><td>' + item.c4 + '</td>';
      tbody.appendChild(tr);
    });
  }

  // Tab 切换
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentType = tab.dataset.target.replace('panel-', '');
      searchInput.value = '';
      renderTable('');
    });
  });

  // 搜索
  searchInput.addEventListener('input', function() {
    renderTable(this.value);
  });

  // 初始化
  renderTable('');
})();