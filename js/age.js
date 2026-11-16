/* js/age.js */
(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ============ DOM ============ */
  var birthDateEl     = document.getElementById('birthDate');
  var refDateEl       = document.getElementById('refDate');
  var lifeExpEl       = document.getElementById('lifeExpectancy');
  var calcBtn         = document.getElementById('calcBtn');
  var resultSection   = document.getElementById('resultSection');
  var mainCard        = document.getElementById('mainCard');
  
  var ageYearsEl      = document.getElementById('ageYears');
  var ageExtraEl      = document.getElementById('ageExtra');
  var birthInfoEl     = document.getElementById('birthInfo');
  
  var zodiacEmojiEl   = document.getElementById('zodiacEmoji');
  var zodiacNameEl    = document.getElementById('zodiacName');
  var signEmojiEl     = document.getElementById('signEmoji');
  var signNameEl      = document.getElementById('signName');
  
  var statsGrid       = document.getElementById('statsGrid');
  var nextBirthdayCard= document.getElementById('nextBirthdayCard');
  var progressInfoEl  = document.getElementById('progressInfo');
  var progressFillEl  = document.getElementById('progressFill');
  var progressMarkerEl= document.getElementById('progressMarker');
  var progressEndEl   = document.getElementById('progressEnd');
  var milestoneList   = document.getElementById('milestoneList');
  var copyBtn         = document.getElementById('copyBtn');

  /* ============ 数据字典 ============ */
  var ZODIACS = [
    { emoji: '🐭', name: '鼠' }, { emoji: '🐮', name: '牛' },
    { emoji: '🐯', name: '虎' }, { emoji: '🐰', name: '兔' },
    { emoji: '🐲', name: '龙' }, { emoji: '🐍', name: '蛇' },
    { emoji: '🐴', name: '马' }, { emoji: '🐑', name: '羊' },
    { emoji: '🐵', name: '猴' }, { emoji: '🐔', name: '鸡' },
    { emoji: '🐶', name: '狗' }, { emoji: '🐷', name: '猪' }
  ];

  var SIGNS = [
    { emoji: '♑', name: '摩羯座', start: [12, 22] },
    { emoji: '♒', name: '水瓶座', start: [1, 20] },
    { emoji: '♓', name: '双鱼座', start: [2, 19] },
    { emoji: '♈', name: '白羊座', start: [3, 21] },
    { emoji: '♉', name: '金牛座', start: [4, 20] },
    { emoji: '♊', name: '双子座', start: [5, 21] },
    { emoji: '♋', name: '巨蟹座', start: [6, 22] },
    { emoji: '♌', name: '狮子座', start: [7, 23] },
    { emoji: '♍', name: '处女座', start: [8, 23] },
    { emoji: '♎', name: '天秤座', start: [9, 23] },
    { emoji: '♏', name: '天蝎座', start: [10, 24] },
    { emoji: '♐', name: '射手座', start: [11, 23] },
    { emoji: '♑', name: '摩羯座', start: [12, 22] }
  ];

  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  var MILESTONES = [
    { age: 1,  tag: '周岁',    emoji: '🍼' },
    { age: 3,  tag: '幼儿园',  emoji: '🎒' },
    { age: 6,  tag: '小学',    emoji: '📚' },
    { age: 12, tag: '中学',    emoji: '📖' },
    { age: 18, tag: '成年',    emoji: '🎓' },
    { age: 22, tag: '毕业',    emoji: '🎉' },
    { age: 30, tag: '而立',    emoji: '🌳' },
    { age: 40, tag: '不惑',    emoji: '🌾' },
    { age: 50, tag: '知天命',  emoji: '🏔️' },
    { age: 60, tag: '花甲',    emoji: '🎊' },
    { age: 70, tag: '古稀',    emoji: '🏮' },
    { age: 80, tag: '杖朝',    emoji: '🌅' }
  ];

  /* ============ 日期工具 ============ */
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function formatDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function formatDateCN(d) { return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'; }
  function formatDateInput(d) { return formatDate(d); }
  
  function parseDate(str) {
    if (!str) return null;
    var p = str.split('-');
    if (p.length !== 3) return null;
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  
  function daysInMonth(y, m) {
    var d = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m === 2 && isLeapYear(y)) return 29;
    return d[m - 1];
  }

  function daysBetween(a, b) {
    var ms = b.getTime() - a.getTime();
    return Math.floor(ms / 86400000);
  }

  function weekdayCN(d) {
    var days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return days[d.getDay()];
  }

  /* ============ 核心算法 ============ */
  function calcPreciseAge(birth, ref) {
    var years = ref.getFullYear() - birth.getFullYear();
    var months = ref.getMonth() - birth.getMonth();
    var days = ref.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      var prevMonthLastDay = ref.getMonth() === 0 ? daysInMonth(ref.getFullYear() - 1, 12) : daysInMonth(ref.getFullYear(), ref.getMonth());
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years: years, months: months, days: days };
  }

  function getLunarYear(date) {
    try {
      var parts = new Intl.DateTimeFormat('en-US-u-ca-chinese', { year: 'numeric' }).formatToParts(date);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'relatedYear' || parts[i].type === 'year') {
          var v = parseInt(parts[i].value, 10);
          if (!isNaN(v) && v > 1800) return v;
        }
      }
    } catch (e) {}
    return date.getFullYear();
  }

  function getZodiac(birth) {
    var lunarYear = getLunarYear(birth);
    var idx = ((lunarYear - 1900) % 12 + 12) % 12;
    return ZODIACS[idx];
  }

  function getGanzhiYear(birth) {
    var lunarYear = getLunarYear(birth);
    var gan = GAN[((lunarYear - 4) % 10 + 10) % 10];
    var zhi = ZHI[((lunarYear - 4) % 12 + 12) % 12];
    return gan + zhi;
  }

  function getSign(birth) {
    var m = birth.getMonth() + 1;
    var d = birth.getDate();
    for (var i = SIGNS.length - 1; i >= 0; i--) {
      var s = SIGNS[i].start;
      if (m > s[0] || (m === s[0] && d >= s[1])) return SIGNS[i];
    }
    return SIGNS[0];
  }

  function getLunarDateStr(date) {
    try {
      return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    } catch (e) { return ''; }
  }

  function calcXuAge(birth, ref) {
    return getLunarYear(ref) - getLunarYear(birth) + 1;
  }

  function calcNextBirthday(birth, ref) {
    var m = birth.getMonth(), d = birth.getDate();
    var thisYear = new Date(ref.getFullYear(), m, d);
    var nextYear = new Date(ref.getFullYear() + 1, m, d);

    if (m === 1 && d === 29 && !isLeapYear(ref.getFullYear())) thisYear = new Date(ref.getFullYear(), 2, 1);
    if (m === 1 && d === 29 && !isLeapYear(ref.getFullYear() + 1)) nextYear = new Date(ref.getFullYear() + 1, 2, 1);

    var refZero = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    var thisZero = new Date(thisYear.getFullYear(), thisYear.getMonth(), thisYear.getDate());

    if (thisZero.getTime() === refZero.getTime()) return { isToday: true, date: thisYear, daysLeft: 0 };
    
    var target = thisZero > refZero ? thisYear : nextYear;
    return {
      isToday: false,
      date: target,
      daysLeft: daysBetween(refZero, new Date(target.getFullYear(), target.getMonth(), target.getDate()))
    };
  }

  function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }

  /* ============ 核心渲染逻辑 ============ */
  function calculate() {
    var birth = parseDate(birthDateEl.value);
    var ref = parseDate(refDateEl.value) || new Date();
    ref.setHours(0, 0, 0, 0);

    if (!birth) return showToast('请输入出生日期', true);
    if (birth > ref) return showToast('出生日期不能晚于计算日期', true);

    var lifeExp = Math.max(30, Math.min(150, parseFloat(lifeExpEl.value) || 80));

    var precise = calcPreciseAge(birth, ref);
    var totalDays = daysBetween(birth, ref);
    var totalWeeks = Math.floor(totalDays / 7);
    var totalMonths = precise.years * 12 + precise.months;
    var totalHours = totalDays * 24;
    var totalMinutes = totalHours * 60;
    var totalSeconds = totalMinutes * 60;

    var zodiac = getZodiac(birth);
    var ganzhi = getGanzhiYear(birth);
    var sign = getSign(birth);
    var xuAge = calcXuAge(birth, ref);
    var lunarDate = getLunarDateStr(birth);
    var birthWeekday = weekdayCN(birth);
    var nb = calcNextBirthday(birth, ref);

    // 判断是否是生日当天
    if (nb.isToday) {
      mainCard.classList.add('is-birthday');
      showToast('🎉 今天是你的生日，生日快乐！');
    } else {
      mainCard.classList.remove('is-birthday');
    }

    // 1. 主卡片
    ageYearsEl.textContent = precise.years;
    var extra = [];
    if (precise.months > 0) extra.push(precise.months + ' 个月');
    if (precise.days > 0) extra.push(precise.days + ' 天');
    ageExtraEl.textContent = extra.length ? extra.join(' ') : '';

    birthInfoEl.textContent = '出生于 ' + formatDateCN(birth) + ' · ' + birthWeekday + (lunarDate ? ' · 农历 ' + lunarDate : '');
    zodiacEmojiEl.textContent = zodiac.emoji;
    zodiacNameEl.textContent = ganzhi + ' · ' + zodiac.name;
    signEmojiEl.textContent = sign.emoji;
    signNameEl.textContent = sign.name;

    // 2. 数据网格
    var stats = [
      { label: '精确年龄', value: precise.years + ' 岁 ' + precise.months + ' 个月 ' + precise.days + ' 天', sm: true },
      { label: '虚岁（中国传统）', value: xuAge + ' 岁', sm: false, sub: '按农历年计算' },
      { label: '总天数', value: fmtNum(totalDays) + ' 天', sm: false },
      { label: '总周数', value: fmtNum(totalWeeks) + ' 周', sm: false, sub: '余 ' + (totalDays % 7) + ' 天' },
      { label: '总月数', value: fmtNum(totalMonths) + ' 个月', sm: false },
      { label: '总小时数', value: fmtNum(totalHours) + ' 小时', sm: true },
      { label: '总分钟数', value: fmtNum(totalMinutes) + ' 分钟', sm: true },
      { label: '总秒数', value: fmtNum(totalSeconds) + ' 秒', sm: true, sub: '时间在滴答作响' }
    ];
    statsGrid.innerHTML = stats.map(function (s) {
      return '<div class="stat-cell">' +
        '<div class="stat-cell-label">' + s.label + '</div>' +
        '<div class="stat-cell-value' + (s.sm ? ' sm' : '') + '">' + s.value + '</div>' +
        (s.sub ? '<div class="stat-cell-sub">' + s.sub + '</div>' : '') +
        '</div>';
    }).join('');

    // 3. 下一个生日
    renderNextBirthday(birth, ref, nb);

    // 4. 人生进度
    renderProgress(precise.years, precise.months, precise.days, lifeExp);

    // 5. 里程碑
    renderMilestones(birth, ref, precise.years);

    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderNextBirthday(birth, ref, nb) {
    if (nb.isToday) {
      nextBirthdayCard.innerHTML =
        '<div><span class="bd-today">🎂 今天就是生日！</span></div>' +
        '<div class="bd-date">' + formatDateCN(nb.date) + ' · ' + weekdayCN(nb.date) + '</div>' +
        '<div class="bd-detail"><span>祝你生日快乐，岁岁平安！</span></div>';
      return;
    }

    var weekday = weekdayCN(nb.date);
    var nextAge = nb.date.getFullYear() - birth.getFullYear();
    var lunarStr = getLunarDateStr(nb.date);
    var daysLeft = nb.daysLeft;
    var leftStr = daysLeft >= 60 ? '约 ' + Math.floor(daysLeft/30) + ' 个月' : daysLeft + ' 天';

    nextBirthdayCard.innerHTML =
      '<div class="bd-main"><span class="bd-num">' + daysLeft + '</span><span class="bd-unit">天后</span></div>' +
      '<div class="bd-date">' + formatDateCN(nb.date) + ' · ' + weekday + (lunarStr ? ' · 农历 ' + lunarStr : '') + '</div>' +
      '<div class="bd-detail">' +
        '<span>将满 <strong>' + nextAge + ' 岁</strong></span>' +
        '<span>倒计时 <strong>' + leftStr + '</strong></span>' +
      '</div>';
  }

  function renderProgress(years, months, days, lifeExp) {
    var totalDaysInLife = lifeExp * 365.25;
    var livedDays = (years * 365.25) + (months * 30.44) + days;
    var pct = Math.min(100, Math.max(0, (livedDays / totalDaysInLife) * 100));
    var remainingDays = Math.max(0, lifeExp * 365.25 - livedDays);

    // 距离百岁还有多少天
    var daysTo100 = Math.max(0, (100 * 365.25) - livedDays);
    var to100Str = daysTo100 > 0 ? ('距离 100 岁还有 ' + fmtNum(daysTo100) + ' 天') : '已超百岁，寿比南山！';

    progressInfoEl.innerHTML =
      '<span>已走过人生的 <strong>' + pct.toFixed(1) + '%</strong> (' + to100Str + ')</span>' +
      '<span>预计还剩 <strong>' + fmtNum(remainingDays) + '</strong> 天</span>';

    progressFillEl.style.width = pct + '%';
    progressMarkerEl.style.left = pct + '%';
    progressEndEl.textContent = lifeExp + ' 岁';
  }

  function renderMilestones(birth, ref, currentAge) {
    milestoneList.innerHTML = '';
    MILESTONES.forEach(function (m) {
      var item = document.createElement('div');
      item.className = 'milestone-item' + (currentAge >= m.age ? ' passed' : '');

      var targetDate = new Date(birth.getFullYear() + m.age, birth.getMonth(), birth.getDate());
      if (birth.getMonth() === 1 && birth.getDate() === 29 && !isLeapYear(birth.getFullYear() + m.age)) {
        targetDate = new Date(birth.getFullYear() + m.age, 2, 1);
      }

      var daysDiff = daysBetween(ref, targetDate);
      var statusHTML = '';
      var tagHTML = '';

      if (daysDiff > 0) {
        tagHTML = '<span class="milestone-tag">' + m.emoji + ' ' + m.tag + '</span>';
        statusHTML = '还有 <strong>' + fmtNum(daysDiff) + '</strong> 天';
      } else if (daysDiff < 0) {
        tagHTML = '<span class="milestone-tag passed-tag">✓ 已达成</span>';
        statusHTML = '已过 ' + fmtNum(Math.abs(daysDiff)) + ' 天';
      } else {
        tagHTML = '<span class="milestone-tag" style="background:#fce0e0;color:#a32222;">🎉 今天</span>';
        statusHTML = '<strong>就是今天！</strong>';
      }

      item.innerHTML =
        '<span class="milestone-age">' + m.age + ' 岁</span>' +
        tagHTML +
        '<span class="milestone-status">' + statusHTML + '</span>';

      milestoneList.appendChild(item);
    });
  }

  /* ============ 复制文本 ============ */
  function copySummary() {
    var birth = parseDate(birthDateEl.value);
    var ref = parseDate(refDateEl.value) || new Date();
    if (!birth) return;

    var precise = calcPreciseAge(birth, ref);
    var totalDays = daysBetween(birth, ref);
    var zodiac = getZodiac(birth);
    var sign = getSign(birth);
    var xuAge = calcXuAge(birth, ref);
    var ganzhi = getGanzhiYear(birth);
    var nb = calcNextBirthday(birth, ref);
    var nbStr = nb.isToday ? '今天就是生日！' : '距离下次生日还有 ' + nb.daysLeft + ' 天';

    var text =
      '🎂 年龄计算报告\n\n' +
      '出生日期：' + formatDateCN(birth) + ' (' + weekdayCN(birth) + ')\n' +
      '精确年龄：' + precise.years + ' 岁 ' + precise.months + ' 个月 ' + precise.days + ' 天\n' +
      '总天数：' + totalDays + ' 天\n' +
      '生肖：' + ganzhi + ' ' + zodiac.name + ' (虚岁 ' + xuAge + ' 岁)\n' +
      '星座：' + sign.name + '\n' +
      nbStr + '\n\n' +
      '—— 由工具站生成';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 报告已复制到剪贴板');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('✅ 报告已复制'); }
    catch (e) { showToast('复制失败', true); }
    document.body.removeChild(ta);
  }

  /* ============ 事件绑定 ============ */
  calcBtn.addEventListener('click', calculate);
  copyBtn.addEventListener('click', copySummary);

  [birthDateEl, refDateEl, lifeExpEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') calculate(); });
  });

  [birthDateEl, refDateEl, lifeExpEl].forEach(function (el) {
    el.addEventListener('change', function () {
      if (!resultSection.hidden && birthDateEl.value) calculate();
    });
  });

  /* ============ 初始化 ============ */
  function init() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    refDateEl.value = formatDateInput(today);

    var defaultBirth = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    birthDateEl.value = formatDateInput(defaultBirth);

    calculate();
  }

  init();
})();