(function () {
  // Tab 切换
  var tabs = document.querySelectorAll('.mk-tab');
  var panels = document.querySelectorAll('.mk-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. 随机数据生成逻辑 =================
  var surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨'];
  var names = ['伟', '芳', '娜', '敏', '静', '秀英', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平'];
  var domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'yahoo.com', 'foxmail.com'];
  var companies = ['字节跳动', '腾讯科技', '阿里巴巴', '百度', '美团', '滴滴出行', '网易', '京东', '小米', '华为'];
  var jobs = ['前端工程师', '后端开发', '产品经理', 'UI设计师', '测试工程师', '项目经理', 'HR', '运营', '财务', '数据分析师'];
  var cities = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '西安市'];

  function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  document.getElementById('btn-gen-mock').addEventListener('click', function () {
    var count = parseInt(document.getElementById('mock-count').value, 10) || 5;
    
    var result = [];
    for (var i = 0; i < count; i++) {
      var item = {};
      if (document.getElementById('mc-name').checked) item.name = getRandom(surnames) + getRandom(names);
      if (document.getElementById('mc-gender').checked) item.gender = Math.random() > 0.5 ? '男' : '女';
      if (document.getElementById('mc-age').checked) item.age = getRandomInt(18, 65);
      if (document.getElementById('mc-phone').checked) item.phone = '1' + getRandom(['3','5','7','8','9']) + String(getRandomInt(100000000, 999999999));
      if (document.getElementById('mc-email').checked) item.email = 'user_' + String(getRandomInt(10000, 99999)) + '@' + getRandom(domains);
      if (document.getElementById('mc-idcard').checked) {
        var year = getRandomInt(1960, 2005);
        var month = String(getRandomInt(1, 12)).padStart(2, '0');
        var day = String(getRandomInt(1, 28)).padStart(2, '0');
        item.idcard = '110105' + year + month + day + String(getRandomInt(1000, 9999));
      }
      if (document.getElementById('mc-company').checked) item.company = getRandom(companies);
      if (document.getElementById('mc-job').checked) item.job = getRandom(jobs);
      if (document.getElementById('mc-address').checked) item.address = getRandom(cities) + '某某区某某街道' + getRandomInt(1, 200) + '号';
      if (document.getElementById('mc-ip').checked) item.ip = getRandomInt(1, 255) + '.' + getRandomInt(0, 255) + '.' + getRandomInt(0, 255) + '.' + getRandomInt(1, 254);
      
      result.push(item);
    }
    document.getElementById('mock-output').value = JSON.stringify(result, null, 2);
  });

  // ================= 2. 抽奖逻辑 =================
  var lotteryResult = document.getElementById('lottery-result');
  
  document.getElementById('btn-lottery').addEventListener('click', function () {
    var str = document.getElementById('lottery-input').value.trim();
    if (!str) return alert('请输入抽奖选项（每行一个）');
    
    var arr = str.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (arr.length === 0) return alert('没有有效的抽奖选项');
    
    var winner = getRandom(arr);
    lotteryResult.style.color = '#7ba05b';
    lotteryResult.textContent = '🎉 ' + winner;
  });

  // ================= 3. 多面骰子逻辑 =================
  var diceBtns = document.querySelectorAll('.dice-btn');
  diceBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var max = parseInt(btn.dataset.max, 10);
      var num = getRandomInt(1, max);
      
      lotteryResult.style.color = '#a8452a';
      lotteryResult.textContent = '🎲 掷出 D' + max + ' : ' + num + ' 点';
    });
  });

})();