/* js/health.js */
(function () {
  'use strict';

  /* ============ DOM ============ */
  var genderSeg    = document.getElementById('genderSeg');
  var goalSeg      = document.getElementById('goalSeg');
  var ageEl        = document.getElementById('age');
  var heightEl     = document.getElementById('height');
  var weightEl     = document.getElementById('weight');
  var waistEl      = document.getElementById('waist');
  var activityEl   = document.getElementById('activity');
  var neckEl       = document.getElementById('neck');
  var hipEl        = document.getElementById('hip');
  var restHREl     = document.getElementById('restHR');
  var bpSysEl      = document.getElementById('bpSys');
  var bpDiaEl      = document.getElementById('bpDia');
  var glucoseEl    = document.getElementById('glucose');
  var calcBtn      = document.getElementById('calcBtn');
  var resultSection= document.getElementById('resultSection');
  var resultContainer = document.getElementById('resultContainer');

  /* ============ 状态 ============ */
  var state = {
    gender: 'male',
    goal: 'maintain'
  };

  /* ============ 工具 ============ */
  function clamp(v, min, max) {
    if (isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }
  function num(el, fallback) {
    var v = parseFloat(el.value);
    return isNaN(v) ? fallback : v;
  }
  function fmt1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function fmt0(v) { return Math.round(v).toString(); }

  /* ============ 计算 ============ */
  function calcBMI(w, h) { var m = h / 100; return w / (m * m); }
  function bmiCategory(bmi) {
    if (bmi < 18.5) return { tag: '偏瘦', color: 'c-blue', seg: 0 };
    if (bmi < 24)   return { tag: '正常', color: 'c-green', seg: 1 };
    if (bmi < 28)   return { tag: '超重', color: 'c-orange', seg: 2 };
    return { tag: '肥胖', color: 'c-red', seg: 3 };
  }

  function calcBMR(gender, w, h, age) {
    var base = 10 * w + 6.25 * h - 5 * age;
    return gender === 'male' ? base + 5 : base - 161;
  }

  function calcBodyFatNavy(gender, h, waist, neck, hip) {
    try {
      if (gender === 'male') {
        if (!waist || !neck || waist <= neck) return null;
        var bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(h) + 36.76;
        return (bf > 0 && bf < 70) ? bf : null;
      } else {
        if (!waist || !neck || !hip) return null;
        var sum = waist + hip - neck;
        if (sum <= 0) return null;
        var bfw = 163.205 * Math.log10(sum) - 97.684 * Math.log10(h) - 78.387;
        return (bfw > 0 && bfw < 75) ? bfw : null;
      }
    } catch (e) { return null; }
  }
  function bodyFatCategory(gender, bf) {
    if (gender === 'male') {
      if (bf < 6)  return { tag: '必需偏低', color: 'c-blue' };
      if (bf < 14) return { tag: '运动员', color: 'c-green' };
      if (bf < 18) return { tag: '健康', color: 'c-green' };
      if (bf < 25) return { tag: '可接受', color: 'c-orange' };
      return { tag: '偏高', color: 'c-red' };
    } else {
      if (bf < 14) return { tag: '必需偏低', color: 'c-blue' };
      if (bf < 21) return { tag: '运动员', color: 'c-green' };
      if (bf < 25) return { tag: '健康', color: 'c-green' };
      if (bf < 32) return { tag: '可接受', color: 'c-orange' };
      return { tag: '偏高', color: 'c-red' };
    }
  }

  function calcWater(w, activity) {
    var mlPerKg = 30;
    if (activity >= 1.9) mlPerKg = 40;
    else if (activity >= 1.725) mlPerKg = 38;
    else if (activity >= 1.55) mlPerKg = 35;
    else if (activity >= 1.375) mlPerKg = 33;
    return w * mlPerKg;
  }

  function calcHeartRate(age) {
    var maxHR = 208 - 0.7 * age;
    return {
      max: maxHR,
      zones: [
        { name: '热身 / 恢复', cls: 'hr-z1', low: maxHR * 0.50, high: maxHR * 0.60 },
        { name: '燃脂',         cls: 'hr-z2', low: maxHR * 0.60, high: maxHR * 0.70 },
        { name: '有氧耐力',     cls: 'hr-z3', low: maxHR * 0.70, high: maxHR * 0.80 },
        { name: '无氧 / 力量',  cls: 'hr-z4', low: maxHR * 0.80, high: maxHR * 0.90 },
        { name: '极限',         cls: 'hr-z5', low: maxHR * 0.90, high: maxHR }
      ]
    };
  }

  function calcMacros(weight, tdee, goal) {
    var factor, ppk, fatPct;
    if (goal === 'cut')       { factor = 0.8; ppk = 2.2; fatPct = 0.25; }
    else if (goal === 'bulk') { factor = 1.1; ppk = 2.0; fatPct = 0.25; }
    else                      { factor = 1.0; ppk = 1.6; fatPct = 0.30; }
    var targetCal  = tdee * factor;
    var proteinG   = weight * ppk;
    var proteinCal = proteinG * 4;
    var fatCal     = targetCal * fatPct;
    var fatG       = fatCal / 9;
    var carbCal    = Math.max(0, targetCal - proteinCal - fatCal);
    var carbG      = carbCal / 4;
    return { cal: targetCal, proteinG: proteinG, fatG: fatG, carbG: carbG };
  }

  function calcLBM(weight, bfPct) { return weight * (1 - bfPct / 100); }
  function calcFFMI(lbm, hCm) { var m = hCm / 100; return lbm / (m * m); }
  function ffmiCategory(gender, ffmi) {
    if (gender === 'male') {
      if (ffmi < 18) return { tag: '偏低', color: 'c-blue' };
      if (ffmi < 20) return { tag: '正常', color: 'c-green' };
      if (ffmi < 22) return { tag: '肌肉发达', color: 'c-teal' };
      if (ffmi < 24) return { tag: '非常发达', color: 'c-orange' };
      return { tag: '顶级水平', color: 'c-purple' };
    } else {
      if (ffmi < 15) return { tag: '偏低', color: 'c-blue' };
      if (ffmi < 17) return { tag: '正常', color: 'c-green' };
      if (ffmi < 19) return { tag: '肌肉发达', color: 'c-teal' };
      if (ffmi < 21) return { tag: '非常发达', color: 'c-orange' };
      return { tag: '顶级水平', color: 'c-purple' };
    }
  }

  function calcWHtR(waist, hCm) { return waist / hCm; }
  function whtrCategory(r) {
    if (r < 0.4) return { tag: '偏瘦', color: 'c-blue' };
    if (r < 0.5) return { tag: '健康', color: 'c-green' };
    if (r < 0.6) return { tag: '腹部肥胖', color: 'c-orange' };
    return { tag: '重度腹部肥胖', color: 'c-red' };
  }

  function calcWHR(waist, hip) { return waist / hip; }
  function whrCategory(gender, r) {
    if (gender === 'male') {
      if (r < 0.85) return { tag: '偏低', color: 'c-blue' };
      if (r < 0.9)  return { tag: '健康', color: 'c-green' };
      if (r < 1.0)  return { tag: '风险升高', color: 'c-orange' };
      return { tag: '高风险', color: 'c-red' };
    } else {
      if (r < 0.75) return { tag: '偏低', color: 'c-blue' };
      if (r < 0.85) return { tag: '健康', color: 'c-green' };
      if (r < 0.9)  return { tag: '风险升高', color: 'c-orange' };
      return { tag: '高风险', color: 'c-red' };
    }
  }

  function restHRCategory(hr) {
    if (hr < 40) return { tag: '异常偏低', color: 'c-red', note: '静息心率低于 40 次/分需医学评估' };
    if (hr < 50) return { tag: '心动过缓', color: 'c-orange', note: '如果是长期运动人群属正常，否则建议检查' };
    if (hr < 60) return { tag: '运动员级', color: 'c-purple', note: '心脏效率高，通常见于长期有氧训练人群' };
    if (hr < 70) return { tag: '优秀', color: 'c-green', note: '心肺功能良好，继续保持' };
    if (hr < 80) return { tag: '良好', color: 'c-green', note: '处于健康范围内' };
    if (hr < 90) return { tag: '一般', color: 'c-orange', note: '建议增加有氧运动，改善心肺功能' };
    return { tag: '偏高', color: 'c-red', note: '静息心率持续偏高，建议咨询医生' };
  }

  function bpCategory(sys, dia) {
    if (!sys || !dia) return null;
    var sLv, dLv;
    if (sys < 90) sLv = 0;
    else if (sys < 120) sLv = 1;
    else if (sys < 140) sLv = 2;
    else if (sys < 160) sLv = 3;
    else if (sys < 180) sLv = 4;
    else sLv = 5;

    if (dia < 60) dLv = 0;
    else if (dia < 80) dLv = 1;
    else if (dia < 90) dLv = 2;
    else if (dia < 100) dLv = 3;
    else if (dia < 110) dLv = 4;
    else dLv = 5;

    if (sLv === 0 && dLv === 0) return { tag: '低血压', color: 'c-blue', note: '低于 90/60 mmHg 属于低血压范围' };

    var level = Math.max(sLv, dLv);
    if (level === 0) level = 1;
    var labels = ['低血压', '正常', '正常高值', '1 级高血压', '2 级高血压', '3 级高血压'];
    var colors = ['c-blue', 'c-green', 'c-teal', 'c-orange', 'c-red', 'c-red'];
    var notes = [
      '低于 90/60 mmHg',
      '低于 120/80 mmHg，非常理想',
      '120-139 / 80-89 mmHg，需注意生活方式',
      '140-159 / 90-99 mmHg，建议就医并改善生活方式',
      '160-179 / 100-109 mmHg，建议尽快就医',
      '≥180 / ≥110 mmHg，请立即就医'
    ];
    return { tag: labels[level], color: colors[level], note: notes[level] };
  }

  function glucoseCategory(g) {
    if (g < 3.9) return { tag: '低血糖', color: 'c-blue', note: '空腹血糖低于 3.9 mmol/L' };
    if (g < 6.1) return { tag: '正常', color: 'c-green', note: '空腹血糖 3.9-6.1 mmol/L 属于正常' };
    if (g < 7.0) return { tag: '空腹血糖受损', color: 'c-orange', note: '6.1-7.0 mmol/L，属于糖尿病前期，建议就医' };
    return { tag: '疑似糖尿病', color: 'c-red', note: '≥7.0 mmol/L，建议到内分泌科复查' };
  }

  function calcVO2max(age, restHR) {
    var maxHR = 208 - 0.7 * age;
    return 15.3 * (maxHR / restHR);
  }
  function vo2Category(gender, age, vo2) {
    var base;
    if (gender === 'male') {
      if (age < 30) base = [40, 45, 52, 60];
      else if (age < 40) base = [38, 43, 49, 57];
      else if (age < 50) base = [35, 40, 46, 53];
      else if (age < 60) base = [32, 37, 42, 50];
      else base = [28, 33, 38, 45];
    } else {
      if (age < 30) base = [36, 40, 46, 53];
      else if (age < 40) base = [34, 38, 44, 50];
      else if (age < 50) base = [31, 35, 41, 47];
      else if (age < 60) base = [28, 32, 37, 43];
      else base = [24, 28, 33, 39];
    }
    if (vo2 < base[0]) return { tag: '差', color: 'c-red' };
    if (vo2 < base[1]) return { tag: '一般', color: 'c-orange' };
    if (vo2 < base[2]) return { tag: '良好', color: 'c-teal' };
    if (vo2 < base[3]) return { tag: '优秀', color: 'c-green' };
    return { tag: '运动员级', color: 'c-purple' };
  }

  function calcBSA(hCm, wKg) { return Math.sqrt(hCm * wKg / 3600); }

  function calcIdealWeights(gender, hCm) {
    var inches = hCm / 2.54;
    var over60 = Math.max(0, inches - 60);
    var devine   = gender === 'male' ? 50 + 2.3 * over60 : 45.5 + 2.3 * over60;
    var robinson = gender === 'male' ? 52 + 1.9 * over60 : 49 + 1.7 * over60;
    var miller   = gender === 'male' ? 56.2 + 1.41 * over60 : 53.1 + 1.36 * over60;
    var hamwi    = gender === 'male' ? 48 + 2.7 * over60 : 45.5 + 2.2 * over60;
    return { devine: devine, robinson: robinson, miller: miller, hamwi: hamwi,
             avg: (devine + robinson + miller + hamwi) / 4 };
  }

  /* MET 表 */
  var MET_TABLE = [
    { name: '走路 · 4 km/h 慢走',   met: 3.0 },
    { name: '走路 · 6 km/h 快走',   met: 4.3 },
    { name: '慢跑 · 8 km/h',        met: 8.3 },
    { name: '跑步 · 10 km/h',       met: 9.8 },
    { name: '跑步 · 12 km/h',       met: 11.8 },
    { name: '骑行 · 16 km/h',       met: 5.8 },
    { name: '骑行 · 20 km/h',       met: 8.0 },
    { name: '游泳（自由泳中等）',    met: 5.8 },
    { name: '跳绳',                  met: 11.0 },
    { name: 'HIIT 高强度间歇',       met: 8.0 },
    { name: '力量训练（中等强度）',  met: 3.5 },
    { name: '瑜伽',                  met: 2.5 },
    { name: '太极',                  met: 3.0 },
    { name: '羽毛球',                met: 5.5 },
    { name: '篮球',                  met: 6.5 },
    { name: '乒乓球',                met: 4.0 },
    { name: '广场舞',                met: 4.5 },
    { name: '家务 · 拖地',           met: 3.0 }
  ];

  /* ============ 卡片构造 ============ */
  function cardBMI(bmi) {
    var cat = bmiCategory(bmi);
    var pct = clamp(((bmi - 15) / 25) * 100, 0, 100);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">📏 BMI 身体质量指数</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + fmt1(bmi) + '<span class="unit">kg/m²</span></div>',
        '<div class="card-bar">',
          '<div class="card-bar-seg bmi-thin"   style="flex:3.5"></div>',
          '<div class="card-bar-seg bmi-normal" style="flex:5.5"></div>',
          '<div class="card-bar-seg bmi-over"   style="flex:4"></div>',
          '<div class="card-bar-seg bmi-obese"  style="flex:12"></div>',
          '<div class="card-bar-marker" style="left:' + pct + '%"></div>',
        '</div>',
        '<div class="card-bar-labels">',
          '<span style="flex:3.5">&lt;18.5</span>',
          '<span style="flex:5.5">正常</span>',
          '<span style="flex:4">超重</span>',
          '<span style="flex:12">肥胖</span>',
        '</div>',
        '<p class="card-note">按中国成人标准：18.5-24 正常，24-28 超重，≥28 肥胖。</p>',
      '</div>'
    ].join('');
  }

  function cardBMR(bmr) {
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🔥 基础代谢 BMR</div>',
          '<span class="card-tag c-orange">静息消耗</span>',
        '</div>',
        '<div class="card-value">' + fmt0(bmr) + '<span class="unit">kcal/天</span></div>',
        '<p class="card-note">躺平一天身体消耗的热量，采用 Mifflin-St Jeor 公式（公认最准估算）。</p>',
      '</div>'
    ].join('');
  }

  function cardTDEE(tdee) {
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">⚡ 每日总消耗 TDEE</div>',
          '<span class="card-tag c-purple">活动加成</span>',
        '</div>',
        '<div class="card-value">' + fmt0(tdee) + '<span class="unit">kcal/天</span></div>',
        '<p class="card-note">维持当前体重每天需摄入的总热量（BMR × 活动系数）。</p>',
      '</div>'
    ].join('');
  }

  function cardBSA(bsa) {
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">📐 体表面积 BSA</div>',
          '<span class="card-tag c-teal">Mosteller</span>',
        '</div>',
        '<div class="card-value">' + bsa.toFixed(2) + '<span class="unit">m²</span></div>',
        '<p class="card-note">临床常用指标（如某些药物剂量按体表面积计算）。成人男性约 1.9 m²，女性约 1.6 m²。</p>',
      '</div>'
    ].join('');
  }

  function cardBodyFat(gender, bf) {
    if (bf == null) return '';
    var cat = bodyFatCategory(gender, bf);
    var max = gender === 'male' ? 40 : 50;
    var pct = clamp((bf / max) * 100, 0, 100);
    var segs = gender === 'male'
      ? [
          { cls: 'bf-essential', flex: 6,  label: '<6' },
          { cls: 'bf-athlete',   flex: 8,  label: '6-14' },
          { cls: 'bf-fit',       flex: 4,  label: '14-18' },
          { cls: 'bf-average',   flex: 7,  label: '18-25' },
          { cls: 'bf-obese',     flex: 15, label: '≥25' }
        ]
      : [
          { cls: 'bf-essential', flex: 14, label: '<14' },
          { cls: 'bf-athlete',   flex: 7,  label: '14-21' },
          { cls: 'bf-fit',       flex: 4,  label: '21-25' },
          { cls: 'bf-average',   flex: 7,  label: '25-32' },
          { cls: 'bf-obese',     flex: 18, label: '≥32' }
        ];
    var segHtml = segs.map(function (s) {
      return '<div class="card-bar-seg ' + s.cls + '" style="flex:' + s.flex + '"></div>';
    }).join('');
    var labelHtml = segs.map(function (s) {
      return '<span style="flex:' + s.flex + '">' + s.label + '</span>';
    }).join('');
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">💧 体脂率估算</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + fmt1(bf) + '<span class="unit">%</span></div>',
        '<div class="card-bar">', segHtml,
          '<div class="card-bar-marker" style="left:' + pct + '%"></div>',
        '</div>',
        '<div class="card-bar-labels">' + labelHtml + '</div>',
        '<p class="card-note">基于 US Navy 公式（腰围' + (gender === 'female' ? ' + 臀围' : '') + ' + 颈围）估算，精度约 ±3-5%。</p>',
      '</div>'
    ].join('');
  }

  function cardLBM(gender, lbm, weight, bf) {
    if (lbm == null) return '';
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🏋️ 瘦体重 LBM</div>',
          '<span class="card-tag c-teal">肌肉+骨骼+器官</span>',
        '</div>',
        '<div class="card-value">' + fmt1(lbm) + '<span class="unit">kg</span></div>',
        '<div class="dual">',
          '<div class="dual-item">',
            '<div class="dual-label">脂肪量</div>',
            '<div class="dual-value">' + fmt1(weight - lbm) + '<span class="u">kg</span></div>',
          '</div>',
          '<div class="dual-item">',
            '<div class="dual-label">脂肪占比</div>',
            '<div class="dual-value">' + fmt1(bf) + '<span class="u">%</span></div>',
          '</div>',
        '</div>',
        '<p class="card-note">瘦体重 = 体重 × (1 − 体脂率)。增肌训练时这个数字应该稳步上升。</p>',
      '</div>'
    ].join('');
  }

  function cardFFMI(gender, ffmi) {
    if (ffmi == null) return '';
    var cat = ffmiCategory(gender, ffmi);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">💪 FFMI 去脂体重指数</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + fmt1(ffmi) + '</div>',
        '<p class="card-note">FFMI = 瘦体重 / 身高²。男性自然训练上限约 25，女性约 22。数值越高说明肌肉量越多。</p>',
      '</div>'
    ].join('');
  }

  function cardWHtR(gender, ratio) {
    if (ratio == null) return '';
    var cat = whtrCategory(ratio);
    var pct = clamp(((ratio - 0.35) / 0.35) * 100, 0, 100);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">📐 腰高比 WHtR</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + ratio.toFixed(2) + '</div>',
        '<div class="card-bar">',
          '<div class="card-bar-seg whtr-thin"    style="flex:1"></div>',
          '<div class="card-bar-seg whtr-healthy" style="flex:1"></div>',
          '<div class="card-bar-seg whtr-over"    style="flex:1"></div>',
          '<div class="card-bar-seg whtr-obese"   style="flex:1"></div>',
          '<div class="card-bar-marker" style="left:' + pct + '%"></div>',
        '</div>',
        '<div class="card-bar-labels">',
          '<span style="flex:1">&lt;0.4</span>',
          '<span style="flex:1">0.4-0.5</span>',
          '<span style="flex:1">0.5-0.6</span>',
          '<span style="flex:1">≥0.6</span>',
        '</div>',
        '<p class="card-note">腰围 ÷ 身高。0.5 是重要分界线，超过即提示中心性肥胖。比 BMI 更能反映腹部脂肪风险。</p>',
      '</div>'
    ].join('');
  }

  function cardWHR(gender, ratio) {
    if (ratio == null) return '';
    var cat = whrCategory(gender, ratio);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">📐 腰臀比 WHR</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + ratio.toFixed(2) + '</div>',
        '<p class="card-note">腰围 ÷ 臀围。WHO 建议：男性 &lt;0.9，女性 &lt;0.85 为健康。数值越高，心血管风险越大。</p>',
      '</div>'
    ].join('');
  }

  function cardIdealWeight(heightCm, weight) {
    var h = heightCm / 100;
    var minW = 18.5 * h * h;
    var maxW = 24 * h * h;
    var inRange = weight >= minW && weight <= maxW;
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">⚖️ 健康体重范围</div>',
          '<span class="card-tag ' + (inRange ? 'c-green' : 'c-orange') + '">' +
            (inRange ? '在范围内' : '超出范围') + '</span>',
        '</div>',
        '<div class="card-value sm">' + fmt1(minW) + ' – ' + fmt1(maxW) +
          '<span class="unit">kg</span></div>',
        '<p class="card-note">按中国 BMI 18.5-24 反推。当前体重 <strong>' + fmt1(weight) + ' kg</strong>。</p>',
      '</div>'
    ].join('');
  }

  function cardTargetTime(weight, minW, maxW) {
    var html = [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🎯 目标达成时间</div>'
    ];
    if (weight > maxW) {
      var lose = weight - maxW;
      var weeks = Math.ceil(lose / 0.5);
      var months = (weeks / 4.3).toFixed(1);
      html.push('<span class="card-tag c-orange">需减重</span></div>');
      html.push('<div class="card-value">约 ' + weeks + ' 周<span class="unit">≈ ' + months + ' 月</span></div>');
      html.push('<p class="card-note">减掉 <strong>' + fmt1(lose) + ' kg</strong> 到达健康上限 ' + fmt1(maxW) + ' kg。按每周 0.5 kg 安全速度，通常需要 ' + weeks + ' 周，切勿急功近利。</p>');
    } else if (weight < minW) {
      var gain = minW - weight;
      var weeks2 = Math.ceil(gain / 0.3);
      var months2 = (weeks2 / 4.3).toFixed(1);
      html.push('<span class="card-tag c-blue">需增重</span></div>');
      html.push('<div class="card-value">约 ' + weeks2 + ' 周<span class="unit">≈ ' + months2 + ' 月</span></div>');
      html.push('<p class="card-note">增加 <strong>' + fmt1(gain) + ' kg</strong> 到达健康下限 ' + fmt1(minW) + ' kg。按每周 0.3 kg 速度，优先增肌。</p>');
    } else {
      html.push('<span class="card-tag c-green">已达标 ✓</span></div>');
      html.push('<div class="card-value">已达标<span class="unit">✓</span></div>');
      html.push('<p class="card-note">当前体重在健康范围内（' + fmt1(minW) + ' – ' + fmt1(maxW) + ' kg），继续保持饮食与运动即可。</p>');
    }
    html.push('</div>');
    return html.join('');
  }

  function cardMacros(macros, goal) {
    var goalLabel = goal === 'cut' ? '减脂期' : goal === 'bulk' ? '增肌期' : '维持期';
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🍽️ 三大营养素建议</div>',
          '<span class="card-tag c-orange">' + goalLabel + ' · ' + fmt0(macros.cal) + ' kcal</span>',
        '</div>',
        '<div class="macro-grid">',
          '<div class="macro-item macro-protein">',
            '<div class="macro-value">' + fmt0(macros.proteinG) + '<span class="u">g</span></div>',
            '<div class="macro-label">蛋白质</div>',
          '</div>',
          '<div class="macro-item macro-carb">',
            '<div class="macro-value">' + fmt0(macros.carbG) + '<span class="u">g</span></div>',
            '<div class="macro-label">碳水化合物</div>',
          '</div>',
          '<div class="macro-item macro-fat">',
            '<div class="macro-value">' + fmt0(macros.fatG) + '<span class="u">g</span></div>',
            '<div class="macro-label">脂肪</div>',
          '</div>',
        '</div>',
        '<p class="card-note">蛋白质优先瘦肉 / 鸡胸 / 鱼虾 / 蛋 / 豆制品；碳水优先全谷物、薯类；脂肪优先坚果、橄榄油、牛油果。</p>',
      '</div>'
    ].join('');
  }

  function cardWater(ml) {
    var liters = ml / 1000;
    var cups = Math.round(ml / 250);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🚰 每日饮水推荐</div>',
          '<span class="card-tag c-teal">基础</span>',
        '</div>',
        '<div class="card-value">' + fmt1(liters) + '<span class="unit">L / 天</span></div>',
        '<div class="dual">',
          '<div class="dual-item">',
            '<div class="dual-label">约合</div>',
            '<div class="dual-value">' + cups + '<span class="u">杯</span></div>',
          '</div>',
          '<div class="dual-item">',
            '<div class="dual-label">每杯</div>',
            '<div class="dual-value">250<span class="u">ml</span></div>',
          '</div>',
        '</div>',
        '<p class="card-note">按体重 + 活动水平估算。运动出汗、天热时额外补充，少量多次效果最佳。</p>',
      '</div>'
    ].join('');
  }

  function cardRestHR(hr) {
    if (hr == null) return '';
    var cat = restHRCategory(hr);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">💓 静息心率评估</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + hr + '<span class="unit">次/分</span></div>',
        '<p class="card-note">' + cat.note + '。正常成人 60-100 次/分；长期运动人群可低至 40-50。</p>',
      '</div>'
    ].join('');
  }

  function cardBP(sys, dia) {
    if (sys == null || dia == null) return '';
    var cat = bpCategory(sys, dia);
    if (!cat) return '';
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🩺 血压评估</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + sys + '/' + dia + '<span class="unit">mmHg</span></div>',
        '<div class="dual">',
          '<div class="dual-item">',
            '<div class="dual-label">收缩压（高压）</div>',
            '<div class="dual-value">' + sys + '<span class="u">mmHg</span></div>',
          '</div>',
          '<div class="dual-item">',
            '<div class="dual-label">舒张压（低压）</div>',
            '<div class="dual-value">' + dia + '<span class="u">mmHg</span></div>',
          '</div>',
        '</div>',
        '<p class="card-note">' + cat.note + '。参考中国高血压防治指南 2024。</p>',
      '</div>'
    ].join('');
  }

  function cardHeartZones(zones, maxHR) {
    var rows = zones.map(function (z, i) {
      return [
        '<div class="hr-zone ' + z.cls + '">',
          '<span class="hr-zone-idx">' + (i + 1) + '</span>',
          '<span class="hr-zone-name">' + z.name + '</span>',
          '<span class="hr-zone-bpm">' + Math.round(z.low) + '–' + Math.round(z.high) + ' 次/分</span>',
        '</div>'
      ].join('');
    }).join('');
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">❤️ 心率训练区间</div>',
          '<span class="card-tag c-red">最大 ' + Math.round(maxHR) + '</span>',
        '</div>',
        '<div class="hr-zones">' + rows + '</div>',
        '<p class="card-note">最大心率按 Tanaka 公式 208 − 0.7×年龄 估算（比 220-年龄 更准确）。</p>',
      '</div>'
    ].join('');
  }

  function cardVO2(gender, age, restHR, vo2) {
    if (vo2 == null) return '';
    var cat = vo2Category(gender, age, vo2);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🫁 最大摄氧量估算</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + fmt1(vo2) + '<span class="unit">ml/kg/min</span></div>',
        '<p class="card-note">Uth-Sørensen 公式：15.3 × (最大心率 ÷ 静息心率)。反映心肺耐力，是健康与长寿的重要预测指标。误差较大，仅供参考。</p>',
      '</div>'
    ].join('');
  }

  function cardMET(weight) {
    var rows = MET_TABLE.map(function (m) {
      var perHour = Math.round(m.met * weight);
      var per30 = Math.round(perHour / 2);
      return [
        '<tr>',
          '<td>' + m.name + '</td>',
          '<td class="num">' + m.met.toFixed(1) + '</td>',
          '<td class="num">' + per30 + '</td>',
          '<td class="num">' + perHour + '</td>',
        '</tr>'
      ].join('');
    }).join('');
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🏃 常见运动热量消耗（按当前体重 ' + fmt1(weight) + ' kg 估算）</div>',
        '</div>',
        '<div style="overflow-x:auto;">',
        '<table class="met-table">',
          '<thead><tr>',
            '<th>运动</th>',
            '<th style="text-align:right">MET</th>',
            '<th style="text-align:right">30 分钟</th>',
            '<th style="text-align:right">1 小时</th>',
          '</tr></thead>',
          '<tbody>' + rows + '</tbody>',
        '</table>',
        '</div>',
        '<p class="card-note">MET 为代谢当量，数值越大强度越高。公式：kcal = MET × 体重(kg) × 时间(小时)。</p>',
      '</div>'
    ].join('');
  }

  function cardGlucose(g) {
    if (g == null) return '';
    var cat = glucoseCategory(g);
    return [
      '<div class="result-card">',
        '<div class="card-head">',
          '<div class="card-title">🩸 空腹血糖评估</div>',
          '<span class="card-tag ' + cat.color + '">' + cat.tag + '</span>',
        '</div>',
        '<div class="card-value">' + fmt1(g) + '<span class="unit">mmol/L</span></div>',
        '<div class="card-bar">',
          '<div class="card-bar-seg bmi-thin"   style="flex:1"></div>',
          '<div class="card-bar-seg bmi-normal" style="flex:3"></div>',
          '<div class="card-bar-seg bmi-over"   style="flex:1"></div>',
          '<div class="card-bar-seg bmi-obese"  style="flex:2"></div>',
          '<div class="card-bar-marker" style="left:' + clamp((g / 10) * 100, 0, 100) + '%"></div>',
        '</div>',
        '<div class="card-bar-labels">',
          '<span style="flex:1">&lt;3.9</span>',
          '<span style="flex:3">正常</span>',
          '<span style="flex:1">受损</span>',
          '<span style="flex:2">≥7.0</span>',
        '</div>',
        '<p class="card-note">' + cat.note + '。参考中国 2 型糖尿病防治指南。建议空腹 8 小时以上采血。</p>',
      '</div>'
    ].join('');
  }

  /* ============ 主计算 ============ */
  function calculate() {
    /* 校验必填 */
    if (!ageEl.value || !heightEl.value || !weightEl.value) {
      alert('请填写年龄、身高和体重');
      return;
    }

    var age     = clamp(num(ageEl, 25), 10, 120);
    var height  = clamp(num(heightEl, 170), 100, 250);
    var weight  = clamp(num(weightEl, 65), 20, 300);
    var waist   = num(waistEl, 0);
    var neck    = num(neckEl, 0);
    var hip     = num(hipEl, 0);
    var restHR  = num(restHREl, 0);
    var bpSys   = num(bpSysEl, 0);
    var bpDia   = num(bpDiaEl, 0);
    var glucose = num(glucoseEl, 0);
    var activity= parseFloat(activityEl.value) || 1.55;

    /* 计算 */
    var bmi     = calcBMI(weight, height);
    var bmr     = calcBMR(state.gender, weight, height, age);
    var tdee    = bmr * activity;
    var bodyFat = calcBodyFatNavy(state.gender, height, waist, neck, hip);
    var lbm     = bodyFat != null ? calcLBM(weight, bodyFat) : null;
    var ffmi    = lbm != null ? calcFFMI(lbm, height) : null;
    var whtr    = waist > 0 ? calcWHtR(waist, height) : null;
    var whr     = (waist > 0 && hip > 0) ? calcWHR(waist, hip) : null;
    var ideal   = calcIdealWeights(state.gender, height);
    var waterMl = calcWater(weight, activity);
    var hr      = calcHeartRate(age);
    var macros  = calcMacros(weight, tdee, state.goal);
    var vo2     = (restHR > 30 && restHR < 150) ? calcVO2max(age, restHR) : null;
    var bsa     = calcBSA(height, weight);
    var h       = height / 100;
    var minW    = 18.5 * h * h;
    var maxW    = 24 * h * h;

    /* 构建分组 */
    var groups = [
      {
        title: '📊 身体基础',
        cards: [
          cardBMI(bmi),
          cardBMR(bmr),
          cardTDEE(tdee),
          cardBSA(bsa)
        ]
      },
      {
        title: '🏃 身体成分',
        cards: [
          cardBodyFat(state.gender, bodyFat),
          cardLBM(state.gender, lbm, weight, bodyFat),
          cardFFMI(state.gender, ffmi),
          cardWHtR(state.gender, whtr),
          cardWHR(state.gender, whr)
        ]
      },
      {
        title: '🎯 目标与营养',
        cards: [
          cardIdealWeight(height, weight),
          cardTargetTime(weight, minW, maxW),
          cardMacros(macros, state.goal),
          cardWater(waterMl)
        ]
      },
      {
        title: '❤️ 心血管健康',
        cards: [
          cardRestHR(restHR),
          cardBP(bpSys, bpDia),
          cardVO2(state.gender, age, restHR, vo2),
          cardHeartZones(hr.zones, hr.max)
        ]
      },
      {
        title: '🏋️ 运动消耗（按体重估算）',
        cards: [cardMET(weight)],
        wide: true
      },
      {
        title: '🩺 代谢健康',
        cards: [cardGlucose(glucose)]
      }
    ];

    /* 渲染 */
    var html = '';
    groups.forEach(function (g) {
      var visibleCards = g.cards.filter(function (c) { return c && c.length > 0; });
      if (visibleCards.length === 0) return;
      html += '<div class="group-block">';
      html += '<h2 class="group-title">' + g.title + '</h2>';
      html += '<div class="card-grid' + (g.wide ? ' wide' : '') + '">';
      html += visibleCards.join('');
      html += '</div></div>';
    });

    if (!html) {
      alert('未能计算出结果，请检查输入');
      return;
    }

    resultContainer.innerHTML = html;
    resultSection.hidden = false;

    setTimeout(function () {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  /* ============ 事件 ============ */
  genderSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(genderSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.gender = btn.dataset.value;
    document.body.classList.toggle('gender-female', state.gender === 'female');
  });

  goalSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    Array.prototype.forEach.call(goalSeg.children, function (b) {
      b.classList.toggle('active', b === btn);
    });
    state.goal = btn.dataset.value;
  });

  calcBtn.addEventListener('click', calculate);

  /* Enter 快捷 */
  [ageEl, heightEl, weightEl, waistEl, neckEl, hipEl, restHREl, bpSysEl, bpDiaEl, glucoseEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculate();
      }
    });
  });

  /* 初始化 */
  document.body.classList.toggle('gender-female', state.gender === 'female');
})();