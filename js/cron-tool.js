(function () {
  var crInput = document.getElementById('cr-input');
  var crDesc = document.getElementById('cr-desc');
  var crList = document.getElementById('cr-list');

  // 简易的 Cron 中文解释器 (仅针对 5 段)
  function getCronDescription(cron) {
    var parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return 'Cron 表达式必须包含 5 个部分 (分 时 日 月 周)';
    
    var m = parts[0], h = parts[1], dom = parts[2], mon = parts[3], dow = parts[4];
    
    var desc = [];
    if (m === '*' && h === '*' && dom === '*' && mon === '*' && dow === '*') return '<b>每分钟</b>执行一次';
    if (m === '0' && h === '*' && dom === '*' && mon === '*' && dow === '*') return '<b>每小时</b>的第 0 分钟执行';
    
    if (m !== '*') desc.push('在分钟 ' + m);
    if (h !== '*') desc.push('在小时 ' + h);
    if (dom !== '*') desc.push('在每月的第 ' + dom + ' 天');
    if (mon !== '*') desc.push('在 ' + mon + ' 月');
    if (dow !== '*') {
      var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      var dowDesc = dow.split(',').map(function(d) { return days[d] || d; }).join('、');
      if (dow.includes('-')) dowDesc = '从 ' + dow;
      desc.push('在 ' + dowDesc);
    }

    return '<b>' + (desc.join('，') || '每分钟') + '</b> 执行一次';
  }

  function parseCron() {
    var val = crInput.value.trim();
    if (!val) return;
    
    crDesc.innerHTML = getCronDescription(val);
    crList.innerHTML = '';

    try {
      // 兼容 UMD 引入方式，Cron 可能是全局变量，也可能挂载在 window 上
      var CronClass = window.Cron || window.croner;
      if (typeof CronClass === 'undefined') {
        throw new Error('Croner 库未加载，请检查 js/libs/croner.min.js 是否已正确放置并引入。');
      }

      var cron = new CronClass(val);
      var nextDates = [];
      var current = new Date();
      
      // 计算未来 10 次
      for (var i = 0; i < 10; i++) {
        var next = cron.nextRun(current);
        if (!next) break;
        nextDates.push(next);
        current = next;
      }

      if (nextDates.length === 0) {
        crList.innerHTML = '<li style="color:#a8452a;">无法计算未来运行时间，表达式可能不合法或永不触发。</li>';
        return;
      }

      nextDates.forEach(function (d) {
        var li = document.createElement('li');
        // 格式化日期，例如：2024/05/20 14:30:00
        var timeStr = d.toLocaleString('zh-CN', { hour12: false });
        li.innerHTML = '<span>' + timeStr + '</span><span style="color:#6b5d47;">' + getRelativeTime(d) + '</span>';
        crList.appendChild(li);
      });

    } catch (e) {
      crList.innerHTML = '<li style="color:#a8452a;">解析错误: ' + e.message + '</li>';
    }
  }

  // 计算相对时间
  function getRelativeTime(date) {
    var diff = date.getTime() - Date.now();
    if (diff < 0) return '已过期';
    var m = Math.floor(diff / 60000);
    if (m < 60) return m + ' 分钟后';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' 小时后';
    var d = Math.floor(h / 24);
    return d + ' 天后';
  }

  // 事件绑定
  document.getElementById('btn-cron').addEventListener('click', parseCron);
  crInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') parseCron();
  });

  // 示例点击
  document.querySelectorAll('.cr-tag').forEach(function (btn) {
    btn.addEventListener('click', function () {
      crInput.value = this.dataset.cron;
      parseCron();
    });
  });

  // 初始化
  parseCron();
})();