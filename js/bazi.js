(function () {
  // ================= Tab 切换 =================
  var tabs = document.querySelectorAll('.bz-tab');
  var panels = document.querySelectorAll('.bz-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. 八字排盘 =================
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
  document.getElementById('btn-bazi').click();


  // ================= 2. 梅花易数 (支持自定义时间) =================
  // 设置默认时间为当前时间
  var mhNow = new Date();
  mhNow.setMinutes(mhNow.getMinutes() - mhNow.getTimezoneOffset());
  document.getElementById('mh-date').value = mhNow.toISOString().slice(0, 16);

  document.getElementById('btn-meihua').addEventListener('click', function () {
    var dateStr = document.getElementById('mh-date').value;
    var d = dateStr ? new Date(dateStr) : new Date();
    
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = d.getHours();

    // 农历年支数
    var yearZhi = (year - 4) % 12 + 1;
    if (yearZhi <= 0) yearZhi += 12; // 处理公元前或负年份
    
    // 上卦：年+月+日 除以 8 的余数
    var upperSum = yearZhi + month + day;
    var upperNum = upperSum % 8 || 8;
    
    // 下卦：年+月+日+时 除以 8 的余数
    var lowerSum = upperSum + hour;
    var lowerNum = lowerSum % 8 || 8;

    // 动爻：年+月+日+时 除以 6 的余数
    var dongYao = lowerSum % 6 || 6;

    var bagua = { 1:'乾(天)', 2:'兑(泽)', 3:'离(火)', 4:'震(雷)', 5:'巽(风)', 6:'坎(水)', 7:'艮(山)', 8:'坤(地)' };

    var html = `
      <div class="name">起卦时间：${year}年${month}月${day}日 ${hour}时</div>
      <div style="font-size: 1.2rem; margin: 10px 0;">
        上卦：<b style="color:#a8452a">${bagua[upperNum]}</b> <br>
        下卦：<b style="color:#a8452a">${bagua[lowerNum]}</b> <br>
        本卦：<b style="color:#8a5a2b">${bagua[upperNum]} ${bagua[lowerNum]}</b> <br>
        动爻：<b style="color:#2563eb">第 ${dongYao} 爻</b>
      </div>
      <div class="name" style="margin-top:10px;">提示：梅花易数以体用生克断吉凶。此卦象仅供参考娱乐。</div>
    `;
    document.getElementById('meihua-content').innerHTML = html;
  });
  document.getElementById('btn-meihua').click();


  // ================= 3. 塔罗抽牌 =================
  var tarotDeck = [
    { n: '愚者 (The Fool)', m: '纯真、冒险、新起点。', r: '鲁莽、盲目、停滞不前。', i: '🤡' },
    { n: '魔术师 (The Magician)', m: '创造力、行动力、资源充足。', r: '欺骗、能力不足、资源浪费。', i: '🪄' },
    { n: '女祭司 (The High Priestess)', m: '直觉、神秘、内在智慧。', r: '忽视直觉、表面化、隐藏的秘密。', i: '🔮' },
    { n: '女皇 (The Empress)', m: '丰盛、母爱、孕育、创造力。', r: '过度依赖、缺乏成长、创造力受阻。', i: '👑' },
    { n: '皇帝 (The Emperor)', m: '权威、稳定、秩序、领导力。', r: '专制、固执、缺乏纪律。', i: '🏛️' },
    { n: '教皇 (The Hierophant)', m: '传统、信仰、精神指引。', r: '打破传统、教条主义、叛逆。', i: '📜' },
    { n: '恋人 (The Lovers)', m: '爱情、和谐、重要选择。', r: '不和谐、错误选择、价值观冲突。', i: '❤️' },
    { n: '战车 (The Chariot)', m: '意志力、胜利、控制局势。', r: '失控、方向迷失、缺乏动力。', i: '🛞' },
    { n: '力量 (Strength)', m: '勇气、耐心、内在力量。', r: '软弱、缺乏自信、滥用权力。', i: '🦁' },
    { n: '隐士 (The Hermit)', m: '内省、独处、寻找真理。', r: '孤立、孤独、拒绝沟通。', i: '🕯️' },
    { n: '命运之轮 (Wheel of Fortune)', m: '转机、好运、命中注定。', r: '厄运、失控、抗拒改变。', i: '🎡' },
    { n: '正义 (Justice)', m: '公平、真相、因果报应。', r: '不公、逃避责任、失衡。', i: '⚖️' },
    { n: '倒吊人 (The Hanged Man)', m: '牺牲、换位思考、暂停。', r: '无谓牺牲、固执、停滞。', i: '🙃' },
    { n: '死神 (Death)', m: '结束、重生、深刻转变。', r: '抗拒改变、停滞、恐惧。', i: '💀' },
    { n: '节制 (Temperance)', m: '平衡、协调、自我疗愈。', r: '失衡、极端、缺乏耐心。', i: '🍷' },
    { n: '恶魔 (The Devil)', m: '欲望、诱惑、物质束缚。', r: '解脱、挣脱束缚、克服成瘾。', i: '😈' },
    { n: '高塔 (The Tower)', m: '突变、破坏、破除执念。', r: '避免灾难、延迟的改变、恐惧。', i: '🗼' },
    { n: '星星 (The Star)', m: '希望、灵感、疗愈。', r: '绝望、失去信心、缺乏灵感。', i: '🌟' },
    { n: '月亮 (The Moon)', m: '幻觉、焦虑、潜意识。', r: '释放恐惧、看清真相、走出迷雾。', i: '🌙' },
    { n: '太阳 (The Sun)', m: '成功、快乐、充满活力。', r: '暂时的挫折、盲目乐观、缺乏能量。', i: '☀️' },
    { n: '审判 (Judgement)', m: '觉醒、重生、内在召唤。', r: '自我怀疑、拒绝反思、错失良机。', i: '📯' },
    { n: '世界 (The World)', m: '完成、圆满、达成目标。', r: '未完成、缺乏交代、止步不前。', i: '🌍' }
  ];

  document.getElementById('btn-tarot').addEventListener('click', function () {
    var shuffled = [...tarotDeck].sort(function () { return 0.5 - Math.random(); });
    var drawn = shuffled.slice(0, 3);
    var positions = ['过去 (原因)', '现在 (现状)', '未来 (发展)'];

    var html = '';
    drawn.forEach(function (card, index) {
      var isRev = Math.random() > 0.5;
      var desc = isRev ? card.r : card.m;
      var stateText = isRev ? '逆位' : '正位';
      
      html += `
        <div class="tarot-card">
          <div class="pos">${positions[index]}</div>
          <div class="icon" style="transform: rotate(${isRev ? '180deg' : '0deg'});">${card.i}</div>
          <div class="t-name">${card.n}</div>
          <div class="t-state">${stateText}</div>
          <div class="t-desc">${desc}</div>
        </div>
      `;
    });
    document.getElementById('tarot-result').innerHTML = html;
  });
  document.getElementById('btn-tarot').click();


  // ================= 4. 八宅风水 (无年份限制) =================
  document.getElementById('btn-fengshui').addEventListener('click', function () {
    var val = document.getElementById('fs-year').value.trim();
    var year = parseInt(val, 10);
    var gender = parseInt(document.getElementById('fs-gender').value, 10); // 1男 0女
    var container = document.getElementById('fengshui-content');

    // 如果为空或非数字，直接清空内容，不报错
    if (isNaN(year) || val === '') {
      container.innerHTML = '';
      return;
    }

    // 计算数字和
    var sum = 0;
    var yStr = String(Math.abs(year)); // 处理负年份
    for (var i = 0; i < yStr.length; i++) sum += parseInt(yStr[i], 10);
    while (sum > 9) {
      var temp = 0;
      var sStr = String(sum);
      for (var j = 0; j < sStr.length; j++) temp += parseInt(sStr[j], 10);
      sum = temp;
    }

    var guaNum;
    if (gender === 1) { // 男
      guaNum = 11 - sum;
      if (guaNum > 9) guaNum -= 9;
    } else { // 女
      guaNum = 4 + sum;
      if (guaNum > 9) guaNum -= 9;
    }

    var guaInfo = {
      1: { name: '坎卦', group: '东四命', element: '水' },
      2: { name: '坤卦', group: '西四命', element: '土' },
      3: { name: '震卦', group: '东四命', element: '木' },
      4: { name: '巽卦', group: '东四命', element: '木' },
      6: { name: '乾卦', group: '西四命', element: '金' },
      7: { name: '兑卦', group: '西四命', element: '金' },
      8: { name: '艮卦', group: '西四命', element: '土' },
      9: { name: '离卦', group: '东四命', element: '火' }
    };

    var info = guaInfo[guaNum];
    if (!info) info = { name: '中宫(无卦)', group: '特殊', element: '土' };

    var html = `
      <div class="name">出生年份：${year} 年 (${gender === 1 ? '男' : '女'})</div>
      <div style="font-size: 1.2rem; margin: 10px 0;">
        命卦：<b style="color:#a8452a">${info.name} (${info.element})</b> <br>
        宅命：<b style="color:#8a5a2b">${info.group}</b>
      </div>
      <div class="name" style="margin-top:10px; line-height: 1.5;">
        ${info.group === '东四命' ? '适合居住：东、东南、南、北向的房子。' : ''}
        ${info.group === '西四命' ? '适合居住：西、西南、西北、东北向的房子。' : ''}
      </div>
    `;
    container.innerHTML = html;
  });


  // ================= 5. 星座本命 =================
  document.getElementById('btn-zodiac').addEventListener('click', function () {
    var val = document.getElementById('zodiac-date').value;
    if (!val) return alert('请选择日期');
    
    var parts = val.split('-');
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);

    var zodiacs = [
      { name: '摩羯座', emoji: '♑', date: '12.22 - 01.19', desc: '踏实、稳重、有责任心。' },
      { name: '水瓶座', emoji: '♒', date: '01.20 - 02.18', desc: '创新、独立、思维活跃。' },
      { name: '双鱼座', emoji: '♓', date: '02.19 - 03.20', desc: '浪漫、感性、富有同情心。' },
      { name: '白羊座', emoji: '♈', date: '03.21 - 04.19', desc: '热情、冲动、勇于冒险。' },
      { name: '金牛座', emoji: '♉', date: '04.20 - 05.20', desc: '固执、可靠、重视物质。' },
      { name: '双子座', emoji: '♊', date: '05.21 - 06.21', desc: '善变、好奇、沟通力强。' },
      { name: '巨蟹座', emoji: '♋', date: '06.22 - 07.22', desc: '顾家、敏感、情绪化。' },
      { name: '狮子座', emoji: '♌', date: '07.23 - 08.22', desc: '自信、霸道、渴望被认可。' },
      { name: '处女座', emoji: '♍', date: '08.23 - 09.22', desc: '完美主义、挑剔、细心。' },
      { name: '天秤座', emoji: '♎', date: '09.23 - 10.23', desc: '犹豫、优雅、追求公平。' },
      { name: '天蝎座', emoji: '♏', date: '10.24 - 11.22', desc: '神秘、记仇、洞察力强。' },
      { name: '射手座', emoji: '♐', date: '11.23 - 12.21', desc: '自由、乐观、缺乏耐心。' }
    ];

    var result = null;
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) result = zodiacs[0];
    else if (m === 1 && d >= 20 || m === 2 && d <= 18) result = zodiacs[1];
    else if (m === 2 && d >= 19 || m === 3 && d <= 20) result = zodiacs[2];
    else if (m === 3 && d >= 21 || m === 4 && d <= 19) result = zodiacs[3];
    else if (m === 4 && d >= 20 || m === 5 && d <= 20) result = zodiacs[4];
    else if (m === 5 && d >= 21 || m === 6 && d <= 21) result = zodiacs[5];
    else if (m === 6 && d >= 22 || m === 7 && d <= 22) result = zodiacs[6];
    else if (m === 7 && d >= 23 || m === 8 && d <= 22) result = zodiacs[7];
    else if (m === 8 && d >= 23 || m === 9 && d <= 22) result = zodiacs[8];
    else if (m === 9 && d >= 23 || m === 10 && d <= 23) result = zodiacs[9];
    else if (m === 10 && d >= 24 || m === 11 && d <= 22) result = zodiacs[10];
    else if (m === 11 && d >= 23 || m === 12 && d <= 21) result = zodiacs[11];

    if (result) {
      var html = `
        <div class="name">你的太阳星座是</div>
        <div style="font-size: 3rem; margin: 10px 0;">${result.emoji}</div>
        <div style="font-size: 1.5rem; font-weight: bold; color: #a8452a;">${result.name}</div>
        <div class="name">${result.date}</div>
        <div style="margin-top: 16px; color: #6b5d47;">${result.desc}</div>
      `;
      document.getElementById('zodiac-content').innerHTML = html;
    }
  });
  document.getElementById('zodiac-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('btn-zodiac').click();

})();