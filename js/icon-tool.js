(function () {
  // 精选图标字典
  var icons = [
    // 表情 (Face)
    { char: "😀", name: "笑脸 开心", cat: "face" }, { char: "😅", name: "流汗 笑脸", cat: "face" },
    { char: "😂", name: "笑哭", cat: "face" }, { char: "😊", name: "微笑", cat: "face" },
    { char: "😍", name: "爱心眼", cat: "face" }, { char: "😎", name: "墨镜 酷", cat: "face" },
    { char: "🤔", name: "思考", cat: "face" }, { char: "😴", name: "睡觉", cat: "face" },
    { char: "😭", name: "大哭", cat: "face" }, { char: "😡", name: "愤怒", cat: "face" },
    { char: "🥳", name: "庆祝 派对", cat: "face" }, { char: "🤯", name: "爆炸头 震惊", cat: "face" },
    { char: "👻", name: "幽灵", cat: "face" }, { char: "💀", name: "骷髅", cat: "face" },
    { char: "👽", name: "外星人", cat: "face" }, { char: "🤖", name: "机器人", cat: "face" },
    // 开发与技术 (Tech)
    { char: "💻", name: "电脑 开发", cat: "tech" }, { char: "🖥️", name: "显示器 桌面", cat: "tech" },
    { char: "⌨️", name: "键盘", cat: "tech" }, { char: "🖱️", name: "鼠标", cat: "tech" },
    { char: "📱", name: "手机 移动端", cat: "tech" }, { char: "🌐", name: "网络 地球", cat: "tech" },
    { char: "🔗", name: "链接 引用", cat: "tech" }, { char: "🔒", name: "锁定 安全", cat: "tech" },
    { char: "🔑", name: "钥匙 密码", cat: "tech" }, { char: "⚙️", name: "设置 齿轮", cat: "tech" },
    { char: "🐛", name: "Bug 虫子", cat: "tech" }, { char: "🚀", name: "火箭 部署 启动", cat: "tech" },
    { char: "📦", name: "包 组件 盒子", cat: "tech" }, { char: "🗄️", name: "数据库 文件柜", cat: "tech" },
    { char: "☁️", name: "云 云端", cat: "tech" }, { char: "🛠️", name: "工具 修理", cat: "tech" },
    { char: "📝", name: "记录 文本 编辑", cat: "tech" }, { char: "📊", name: "图表 数据 统计", cat: "tech" },
    { char: "📈", name: "上升趋势 增长", cat: "tech" }, { char: "📉", name: "下降趋势 亏损", cat: "tech" },
    // 自然 (Nature)
    { char: "🌲", name: "树 森林", cat: "nature" }, { char: "🌻", name: "向日葵 花", cat: "nature" },
    { char: "🌊", name: "海浪 水", cat: "nature" }, { char: "🔥", name: "火 热门", cat: "nature" },
    { char: "❄️", name: "雪花 冷", cat: "nature" }, { char: "🌙", name: "月亮 夜晚", cat: "nature" },
    { char: "☀️", name: "太阳 晴天", cat: "nature" }, { char: "⭐", name: "星星 收藏", cat: "nature" },
    { char: "🌈", name: "彩虹", cat: "nature" }, { char: "🌍", name: "地球", cat: "nature" },
    // 符号 (Symbol)
    { char: "✅", name: "勾选 成功 完成", cat: "symbol" }, { char: "❌", name: "叉号 失败 关闭", cat: "symbol" },
    { char: "⚠️", name: "警告 注意", cat: "symbol" }, { char: "❓", name: "问号 疑问", cat: "symbol" },
    { char: "❗", name: "感叹号 强调", cat: "symbol" }, { char: "➕", name: "加号 新增", cat: "symbol" },
    { char: "➖", name: "减号 移除", cat: "symbol" }, { char: "➡️", name: "右箭头 下一步", cat: "symbol" },
    { char: "⬅️", name: "左箭头 返回", cat: "symbol" }, { char: "⬆️", name: "上箭头", cat: "symbol" },
    { char: "⬇️", name: "下箭头", cat: "symbol" }, { char: "🔄", name: "刷新 循环", cat: "symbol" },
    { char: "⏳", name: "沙漏 等待 加载", cat: "symbol" }, { char: "🚫", name: "禁止 不可用", cat: "symbol" },
    { char: "💡", name: "灯泡 灵感 提示", cat: "symbol" }, { char: "🎯", name: "靶心 目标", cat: "symbol" },
    // 物品 (Object)
    { char: "📁", name: "文件夹", cat: "object" }, { char: "📄", name: "文档 文件", cat: "object" },
    { char: "📅", name: "日历 日期", cat: "object" }, { char: "⏰", name: "闹钟 提醒", cat: "object" },
    { char: "📧", name: "邮件 邮箱", cat: "object" }, { char: "📞", name: "电话 联系", cat: "object" },
    { char: "🎁", name: "礼物 福利", cat: "object" }, { char: "🏆", name: "奖杯 冠军 排名", cat: "object" },
    { char: "💰", name: "钱袋 财富 金额", cat: "object" }, { char: "🛒", name: "购物车 购买", cat: "object" },
    { char: "🎨", name: "调色板 设计", cat: "object" }, { char: "🎵", name: "音符 音乐", cat: "object" },
    { char: "📷", name: "相机 拍照", cat: "object" }, { char: "🎬", name: "场记板 视频", cat: "object" },
    { char: "🔍", name: "放大镜 搜索", cat: "object" }, { char: "🔔", name: "铃铛 通知", cat: "object" }
  ];

  var grid = document.getElementById('ic-grid');
  var searchInput = document.getElementById('ic-search');
  var cats = document.querySelectorAll('.ic-cat');
  
  var currentCat = 'all';
  var currentSearch = '';

  // 提示框
  var toast = document.createElement('div');
  toast.className = 'ic-toast';
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2000);
  }

  function render() {
    grid.innerHTML = '';
    var filtered = icons.filter(function (item) {
      var matchCat = currentCat === 'all' || item.cat === currentCat;
      var matchSearch = item.name.includes(currentSearch) || item.char === currentSearch;
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#8a7a5f; padding: 40px 0;">未找到相关图标</div>';
      return;
    }

    filtered.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'ic-card';
      card.innerHTML = '<div class="ic-char">' + item.char + '</div><div class="ic-name">' + item.name + '</div>';
      
      card.addEventListener('click', function () {
        // 复制到剪贴板
        navigator.clipboard.writeText(item.char).then(function() {
          showToast('已复制字符: ' + item.char);
        }).catch(function() {
          // 降级处理
          var ta = document.createElement('textarea');
          ta.value = item.char;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast('已复制字符: ' + item.char);
        });
      });
      grid.appendChild(card);
    });
  }

  searchInput.addEventListener('input', function () {
    currentSearch = this.value.trim();
    render();
  });

  cats.forEach(function (btn) {
    btn.addEventListener('click', function () {
      cats.forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      render();
    });
  });

  render();
})();