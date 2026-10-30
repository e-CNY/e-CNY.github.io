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

  // 随机数据生成
  var surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈'];
  var names = ['伟', '芳', '娜', '敏', '静', '秀英', '强', '磊', '军', '洋'];
  var domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com'];

  function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  document.getElementById('btn-gen-mock').addEventListener('click', function () {
    var count = parseInt(document.getElementById('mock-count').value, 10) || 10;
    var useName = document.getElementById('mc-name').checked;
    var usePhone = document.getElementById('mc-phone').checked;
    var useEmail = document.getElementById('mc-email').checked;
    var useAddress = document.getElementById('mc-address').checked;
    
    var result = [];
    for (var i = 0; i < count; i++) {
      var item = {};
      if (useName) item.name = getRandom(surnames) + getRandom(names);
      if (usePhone) item.phone = '138' + Math.floor(10000000 + Math.random() * 90000000);
      if (useEmail) item.email = 'user' + Math.floor(Math.random() * 10000) + '@' + getRandom(domains);
      if (useAddress) item.address = '某某省某某市某某区某某路' + Math.floor(Math.random() * 100) + '号';
      result.push(item);
    }
    document.getElementById('mock-output').value = JSON.stringify(result, null, 2);
  });

  // 抽奖
  document.getElementById('btn-lottery').addEventListener('click', function () {
    var str = document.getElementById('lottery-input').value.trim();
    if (!str) return;
    var arr = str.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (arr.length === 0) return;
    var winner = getRandom(arr);
    document.getElementById('lottery-result').textContent = '🎉 ' + winner;
  });

  // 掷骰子
  document.getElementById('btn-dice').addEventListener('click', function () {
    var num = Math.floor(Math.random() * 6) + 1;
    document.getElementById('lottery-result').textContent = '🎲 ' + num + ' 点';
  });
})();