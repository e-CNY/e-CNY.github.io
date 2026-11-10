/* js/age.js */
(function () {
  'use strict';

  /* ============ DOM ============ */
  var birthDateEl     = document.getElementById('birthDate');
  var refDateEl       = document.getElementById('refDate');
  var lifeExpEl       = document.getElementById('lifeExpectancy');
  var calcBtn         = document.getElementById('calcBtn');
  var resultSection   = document.getElementById('resultSection');
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

  /* ============ 数据 ============ */
  var ZODIACS = [
    { emoji: '🐭', name: '鼠' },
    { emoji: '🐮', name: '牛' },
    { emoji: '🐯', name: '虎' },
    { emoji: '🐰', name: '兔' },
    { emoji: '🐲', name: '龙' },
    { emoji: '🐍', name: '蛇' },
    { emoji: '🐴', name: '马' },
    { emoji: '🐐', name: '羊' },
    { emoji: '🐵', name: '猴' },
    { emoji: '🐔', name: '鸡' },
    { emoji: '🐶', name: '狗' },
    { emoji: '🐷', name: '猪' }
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

  /* ============ 工具 ============ */
  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function formatDateCN(d) {
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function formatDateInput(d) {
    return formatDate(d);
  }

  function parseDate(str) {
    if (!str) return null;
    var p = str.split('-');
    if (p.length !== 3) return null;
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

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

  /* ============ 精确年龄 ============ */
  function calcPreciseAge(birth, ref) {
    var years = ref.getFullYear() - birth.getFullYear();
    var months = ref.getMonth() - birth.getMonth();
    var days = ref.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      var prevMonthLastDay = daysInMonth(ref.getFullYear(), ref.getMonth() === 0 ? 12 : ref.getMonth());
      if (ref.getMonth() === 0) {
        prevMonthLastDay = daysInMonth(ref.getFullYear() - 1, 12);
      } else {
        prevMonthLastDay = daysInMonth(ref.getFullYear(), ref.getMonth());
      }
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years: years, months: months, days: days };
  }

  /* ============ 生肖 / 星座 ============ */
  function getZodiac(birth) {
    var lunarYear = getLunarYear(birth);
    var idx = ((lunarYear - 1900) % 12 + 12) % 12;
    // 1900 年是鼠年
    return ZODIACS[idx];
  }

  function getLunarYear(date) {
    // 用 Intl 获取农历年
    try {
      var parts = new Intl.DateTimeFormat('en-US-u-ca-chinese', {
        year: 'numeric'
      }).formatToParts(date);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'relatedYear' || parts[i].type === 'year') {
          var v = parseInt(parts[i].value, 10);
          if (!isNaN(v) && v > 1800) return v;
        }
      }
    } catch (e) { /* ignore */ }
    // 兜底：按公历年
    return date.getFullYear();
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
      if (m > s[0] || (m === s[0] && d >= s[1])) {
        return SIGNS[i];
      }
    }
    return SIGNS[0];
  }

  function getLunarDateStr(date) {
    try {
      return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return '';
    }
  }

  /* ============ 虚岁 ============ */
  function calcXuAge(birth, ref) {
    var lunarYearBirth = getLunarYear(birth);
    var lunarYearRef = getLunarYear(ref);
    return lunarYearRef - lunarYearBirth + 1;
  }

  /* ============ 下一个生日 ============ */
  function calcNextBirthday(birth, ref) {
    var m = birth.getMonth();
    var d = birth.getDate();

    var thisYear = new Date(ref.getFullYear(), m, d);
    var nextYear = new Date(ref.getFullYear() + 1, m, d);

    // 处理 2 月 29 日：非闰年时按 3 月 1 日算
    if (m === 1 && d === 29 && !isLeapYear(ref.getFullYear())) {
      thisYear = new Date(ref.getFullYear(), 2, 1);
    }
    if (m === 1 && d === 29 && !isLeapYear(ref.getFullYear() + 1)) {
      nextYear = new Date(ref.getFullYear() + 1, 2, 1);
    }

    var refZero = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    var thisZero = new Date(thisYear.getFullYear(), thisYear.getMonth(), thisYear.getDate());

    var target;
    if (thisZero.getTime() === refZero.getTime()) {
      return { isToday: true, date: thisYear, daysLeft: 0 };
    }
    if (thisZero > refZero) {
      target = thisYear;
    } else {
      target = nextYear;
    }

    return {
      isToday: false,
      date: target,
      daysLeft: daysBetween(refZero, new Date(target.getFullYear(), target.getMonth(), target.getDate()))
    };
  }

  /* ============ 渲染 ============ */
  function fmtNum(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function calculate() {
    var birth = parseDate(birthDateEl.value);
    var ref = parseDate(refDateEl.value) || new Date();
    ref.setHours(0, 0, 0, 0);

    if (!birth) {
      alert('请输入出生日期');
      return;
    }
    if (birth > ref) {
      alert('出生日期不能晚于计算日期');
      return;
    }

    var lifeExp = clamp(parseFloat(lifeExpEl.value) || 80, 30, 150);

    var precise = calcPreciseAge(birth, ref);
    var totalDays = daysBetween(birth, ref);
    var totalWeeks = Math.floor(totalDays / 7);
    var totalMonths = precise.years * 12 + precise.months;
    var totalHours = totalDays * 24;
    var totalMinutes = totalHours * 60;

    var zodiac = getZodiac(birth);
    var ganzhi = getGanzhiYear(birth);
    var sign = getSign(birth);
    var xuAge = calcXuAge(birth, ref);
    var lunarDate = getLunarDateStr(birth);
    var birthWeekday = weekdayCN(birth);

    // 主卡片
    ageYearsEl.textContent = precise.years;
    var extra = [];
    if (precise.months > 0) extra.push(precise.months + ' 个月');
    if (precise.days > 0) extra.push(precise.days + ' 天');
    ageExtraEl.textContent = extra.length ? extra.join(' ') : '';

    birthInfoEl.textContent = '出生于 ' + formatDateCN(birth) + ' · ' + birthWeekday +
      (lunarDate ? ' · 农历 ' + lunarDate : '');

    zodiacEmojiEl.textContent = zodiac.emoji;
    zodiacNameEl.textContent = ganzhi + ' · ' + zodiac.name;
    signEmojiEl.textContent = sign.emoji;
    signNameEl.textContent = sign.name;

    // 数据网格
    var stats = [
      { label: '精确年龄', value: precise.years + ' 岁 ' + precise.months + ' 个月 ' + precise.days + ' 天', sm: true },
      { label: '虚岁（中国传统）', value: xuAge + ' 岁', sm: false, sub: '按农历年计算' },
      { label: '总天数', value: fmtNum(totalDays) + ' 天', sm: false },
      { label: '总周数', value: fmtNum(totalWeeks) + ' 周', sm: false, sub: '余 ' + (totalDays % 7) + ' 天' },
      { label: '总月数', value: fmtNum(totalMonths) + ' 个月', sm: false },
      { label: '总小时数', value: fmtNum(totalHours) + ' 小时', sm: true },
      { label: '总分钟数', value: fmtNum(totalMinutes) + ' 分钟', sm: true },
      { label: '出生星期', value: birthWeekday, sm: true }
    ];

    statsGrid.innerHTML = stats.map(function (s) {
      return '<div class="stat-cell">' +
        '<div class="stat-cell-label">' + s.label + '</div>' +
        '<div class="stat-cell-value' + (s.sm ? ' sm' : '') + '">' + s.value + '</div>' +
        (s.sub ? '<div class="stat-cell-sub">' + s.sub + '</div>' : '') +
        '</div>';
    }).join('');

    // 下一个生日
    renderNextBirthday(birth, ref);

    // 进度条
    renderProgress(precise.years, precise.months, precise.days, lifeExp);

    // 里程碑
    renderMilestones(birth, ref, precise.years);

    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clamp(v, min, max) {
    if (isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  function renderNextBirthday(birth, ref) {
    var nb = calcNextBirthday(birth, ref);

    if (nb.isToday) {
      nextBirthdayCard.innerHTML =
        '<div><span class="bd-today">🎂 今天就是生日！</span></div>' +
        '<div class="bd-date">' + formatDateCN(nb.date) + ' · ' + weekdayCN(nb.date) + '</div>';
      return;
    }

    var weekday = weekdayCN(nb.date);
    var nextAge = nb.date.getFullYear() - birth.getFullYear();
    var lunarStr = getLunarDateStr(nb.date);

    // 距离本月还差几个月几天
    var daysLeft = nb.daysLeft;
    var monthsLeft = Math.floor(daysLeft / 30);
    var remainDays = daysLeft % 30;
    var leftStr;
    if (daysLeft >= 60) {
      leftStr = '约 ' + monthsLeft + ' 个月 ' + remainDays + ' 天';
    } else if (daysLeft >= 30) {
      leftStr = '约 1 个月 ' + remainDays + ' 天';
    } else {
      leftStr = daysLeft + ' 天';
    }

    nextBirthdayCard.innerHTML =
      '<div class="bd-main">' +
        '<span class="bd-num">' + daysLeft + '</span>' +
        '<span class="bd-unit">天后</span>' +
      '</div>' +
      '<div class="bd-date">' + formatDateCN(nb.date) + ' · ' + weekday +
        (lunarStr ? ' · 农历 ' + lunarStr : '') + '</div>' +
      '<div class="bd-detail">' +
        '<span>将满 <strong>' + nextAge + ' 岁</strong></span>' +
        '<span>还剩 <strong>' + leftStr + '</strong></span>' +
      '</div>';
  }

  function renderProgress(years, months, days, lifeExp) {
    var totalDaysInLife = lifeExp * 365.25;
    var livedDays = (years * 365.25) + (months * 30.44) + days;
    var pct = Math.min(100, Math.max(0, (livedDays / totalDaysInLife) * 100));

    // 剩余时间
    var remainingDays = Math.max(0, lifeExp * 365.25 - livedDays);

    progressInfoEl.innerHTML =
      '<span>已走过人生的 <strong>' + pct.toFixed(1) + '%</strong></span>' +
      '<span>预计还剩 <strong>' + fmtNum(remainingDays) + '</strong> 天</span>';

    progressFillEl.style.width = pct + '%';
    progressMarkerEl.style.left = pct + '%';
    progressEndEl.textContent = lifeExp + ' 岁';
  }

  function renderMilestones(birth, ref, currentAge) {
    milestoneList.innerHTML = '';

    MILESTONES.forEach(function (m) {
      var item = document.createElement('div');
      item.className = 'milestone-item';

      if (currentAge >= m.age) {
        item.classList.add('passed');
      }

      var targetDate = new Date(birth.getFullYear() + m.age, birth.getMonth(), birth.getDate());
      // 处理 2/29
      if (birth.getMonth() === 1 && birth.getDate() === 29 && !isLeapYear(birth.getFullYear() + m.age)) {
        targetDate = new Date(birth.getFullYear() + m.age, 2, 1);
      }

      var daysDiff = daysBetween(ref, targetDate);
      var statusHTML;
      var tagHTML;

      if (daysDiff > 0) {
        tagHTML = '<span class="milestone-tag">' + m.emoji + ' ' + m.tag + '</span>';
        statusHTML = '还有 <strong>' + fmtNum(daysDiff) + '</strong> 天';
      } else if (daysDiff < 0) {
        tagHTML = '<span class="milestone-tag passed-tag">✓ 已达成</span>';
        statusHTML = '已过 ' + fmtNum(Math.abs(daysDiff)) + ' 天';
      } else {
        tagHTML = '<span class="milestone-tag">🎉 今天</span>';
        statusHTML = '<strong>就是今天！</strong>';
      }

      item.innerHTML =
        '<span class="milestone-age">' + m.age + ' 岁</span>' +
        tagHTML +
        '<span class="milestone-status">' + statusHTML + '</span>';

      milestoneList.appendChild(item);
    });
  }

  /* ============ 复制文字 ============ */
  function copySummary() {
    var birth = parseDate(birthDateEl.value);
    var ref = parseDate(refDateEl.value) || new Date();
    ref.setHours(0, 0, 0, 0);
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
      '🎂 年龄计算结果\n' +
      '出生日期：' + formatDateCN(birth) + '（' + weekdayCN(birth) + '）\n' +
      '精确年龄：' + precise.years + ' 岁 ' + precise.months + ' 个月 ' + precise.days + ' 天\n' +
      '总天数：' + totalDays + ' 天\n' +
      '生肖：' + ganzhi + ' ' + zodiac.name + '（虚岁 ' + xuAge + ' 岁）\n' +
      '星座：' + sign.name + '\n' +
      nbStr + '\n' +
      '\n—— 由工具站生成 ——';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        copyBtn.textContent = '✅ 已复制';
        setTimeout(function () { copyBtn.textContent = '📋 复制文字总结'; }, 1500);
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      copyBtn.textContent = '✅ 已复制';
    } catch (e) {
      alert('复制失败，请手动选中复制');
    }
    document.body.removeChild(ta);
    setTimeout(function () { copyBtn.textContent = '📋 复制文字总结'; }, 1500);
  }

  /* ============ 事件 ============ */
  calcBtn.addEventListener('click', calculate);
  copyBtn.addEventListener('click', copySummary);

  [birthDateEl, refDateEl, lifeExpEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
      }
    });
  });

  // 修改任意输入后自动重算（如果已经计算过）
  [birthDateEl, refDateEl, lifeExpEl].forEach(function (el) {
    el.addEventListener('change', function () {
      if (!resultSection.hidden && birthDateEl.value) {
        calculate();
      }
    });
  });

  /* ============ 初始化 ============ */
  function init() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    refDateEl.value = formatDateInput(today);

    // 默认出生日期：20 年前的今天
    var defaultBirth = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    birthDateEl.value = formatDateInput(defaultBirth);

    // 自动计算一次
    calculate();
  }

  init();
})();