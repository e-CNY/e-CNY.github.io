(function () {
  // 初始化当前时间
  var now = new Date();
  document.getElementById('bz-date').value = now.toISOString().split('T')[0];
  document.getElementById('bz-time').value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  document.getElementById('btn-bazi').addEventListener('click', function () {
    var dateStr = document.getElementById('bz-date').value;
    var timeStr = document.getElementById('bz-time').value;
    if (!dateStr || !timeStr) return alert('请选择出生日期和时间');

    var parts = dateStr.split('-');
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    var tParts = timeStr.split(':');
    var h = parseInt(tParts[0], 10), min = parseInt(tParts[1], 10);

    try {
      var solar = Solar.fromYmdHms(y, m, d, h, min, 0);
      var lunar = solar.getLunar();
      var ec = lunar.getEightChar();
      
      var pillars = [
        { name: '年柱', gan: ec.getYearGan(), zhi: ec.getYearZhi(), shi: ec.getYearShiShenGan() },
        { name: '月柱', gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), shi: ec.getMonthShiShenGan() },
        { name: '日柱', gan: ec.getDayGan(), zhi: ec.getDayZhi(), shi: '日主' },
        { name: '时柱', gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), shi: ec.getTimeShiShenGan() }
      ];

      var html = '';
      pillars.forEach(function(p) {
        html += `
          <div class="bz-pillar">
            <div class="name">${p.name}</div>
            <div class="gan">${p.gan}</div>
            <div class="zhi">${p.zhi}</div>
            <div class="shishen">${p.shi || ' '}</div>
          </div>
        `;
      });
      
      document.getElementById('bazi-result').innerHTML = html;
    } catch (e) {
      alert('排盘失败，请检查输入时间。');
    }
  });

  // 自动排一次
  document.getElementById('btn-bazi').click();
})();