/* js/mock-tool.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var THEME_KEY = 'mock_tool_theme_v1';
  var HISTORY_KEY = 'mock_tool_history_v1';
  var MAX_HISTORY = 30;

  /* ================= 加密安全随机 ================= */
  function randomBytes(n) {
    var bytes = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }

  function randomInt(max) {
    if (max <= 0) return 0;
    var limit = Math.floor(0xFFFFFFFF / max) * max;
    var arr = new Uint32Array(1);
    do {
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(arr);
      } else {
        arr[0] = Math.floor(Math.random() * 0xFFFFFFFF);
      }
    } while (arr[0] >= limit);
    return arr[0] % max;
  }

  function randomIntRange(min, max) {
    return min + randomInt(max - min + 1);
  }

  function randomFloat() {
    var arr = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      arr[0] = Math.floor(Math.random() * 0xFFFFFFFF);
    }
    return arr[0] / 0xFFFFFFFF;
  }

  function pick(arr) {
    return arr[randomInt(arr.length)];
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ================= DOM ================= */
  function $(id) { return document.getElementById(id); }

  var els = {};
  function cacheEls() {
    els.tabs = $('mk-tabs');
    els.btnHistory = $('btn-history');
    els.historyCount = $('history-count');
    els.btnTheme = $('btn-theme');
    els.toast = $('mk-toast');

    // Mock
    els.mockCount = $('mock-count');
    els.mockCountSeg = $('mock-count-seg');
    els.mockFields = $('mock-fields');
    els.btnSelectAll = $('btn-select-all');
    els.btnSelectNone = $('btn-select-none');
    els.btnPresetCn = $('btn-select-preset-cn');
    els.btnPresetEcom = $('btn-select-preset-ecom');
    els.mockFormatSeg = $('mock-format-seg');
    els.mockTableName = $('mock-table-name');
    els.btnGenMock = $('btn-gen-mock');
    els.mockOutput = $('mock-output');
    els.mockOutputInfo = $('mock-output-info');
    els.btnMockCopy = $('btn-mock-copy');
    els.btnMockDownload = $('btn-mock-download');

    // Lottery
    els.lotteryInput = $('lottery-input');
    els.lotteryMeta = $('lottery-meta');
    els.lotteryCount = $('lottery-count');
    els.lotteryUnique = $('lottery-unique');
    els.lotteryAnimate = $('lottery-animate');
    els.btnLottery = $('btn-lottery');
    els.btnLotteryReset = $('btn-lottery-reset');
    els.btnLotteryDemo = $('btn-lottery-demo');
    els.btnLotteryClear = $('btn-lottery-clear');
    els.lotteryDisplay = $('lottery-display');
    els.lotteryHistory = $('lottery-history');

    // Dice
    els.diceQuick = $('dice-quick');
    els.diceN = $('dice-n');
    els.diceM = $('dice-m');
    els.diceModifier = $('dice-modifier');
    els.btnRollCustom = $('btn-roll-custom');
    els.btnClearDice = $('btn-clear-dice');
    els.diceDisplay = $('dice-display');
    els.diceHistory = $('dice-history');
    els.diceHistoryCount = $('dice-history-count');

    // Random
    els.rndIntMin = $('rnd-int-min');
    els.rndIntMax = $('rnd-int-max');
    els.rndIntCount = $('rnd-int-count');
    els.btnRndInt = $('btn-rnd-int');
    els.rndIntOutput = $('rnd-int-output');
    els.rndFloatMin = $('rnd-float-min');
    els.rndFloatMax = $('rnd-float-max');
    els.rndFloatDec = $('rnd-float-dec');
    els.btnRndFloat = $('btn-rnd-float');
    els.rndFloatOutput = $('rnd-float-output');
    els.rndStrLen = $('rnd-str-len');
    els.rndStrCharset = $('rnd-str-charset');
    els.btnRndStr = $('btn-rnd-str');
    els.rndStrOutput = $('rnd-str-output');
    els.btnRndColor = $('btn-rnd-color');
    els.btnRndColorBatch = $('btn-rnd-color-batch');
    els.rndColorOutput = $('rnd-color-output');
    els.rndUuidCount = $('rnd-uuid-count');
    els.btnRndUuid = $('btn-rnd-uuid');
    els.rndUuidOutput = $('rnd-uuid-output');
    els.btnCoin = $('btn-coin');
    els.btnDie6 = $('btn-die-6');
    els.btnDie20 = $('btn-die-20');
    els.rndCoinOutput = $('rnd-coin-output');

    // Drawer
    els.drawer = $('drawer');
    els.drawerBackdrop = $('drawer-backdrop');
    els.drawerClose = $('drawer-close');
    els.drawerList = $('drawer-list');
    els.clearHistory = $('clear-history');
  }

  /* ================= 状态 ================= */
  var state = {
    theme: 'light',
    mockFormat: 'json',
    history: [],
    lotteryOptions: [],      // [{name, weight, removed}]
    lotteryResults: [],
    diceHistory: []
  };

  var toastTimer = null;

  /* ================= 工具 ================= */
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (!text) { showToast('没有可复制内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ 已复制');
    } catch (e) { showToast('❌ 复制失败'); }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
  }

  /* ================= 数据字典 ================= */
  var SURNAMES = ['赵','钱','孙','李','周','吴','郑','王','冯','陈','褚','卫','蒋','沈','韩','杨','朱','秦','许','何','吕','施','张','孔','曹','严','华','金','魏','陶','姜','戚','谢','邹','喻','柏','水','窦','章','云','苏','潘','葛','奚','范','彭','郎','鲁','韦','昌','马','苗','凤','花','方','俞','任','袁','柳','鲍','史','唐','费','廉','岑','薛','雷','贺','倪','汤','滕','殷','罗','毕','郝','邬','安','常','乐','于','时','傅','皮','卞','齐','康','伍','余','元','卜','顾','孟','平','黄','和','穆','萧','尹','欧阳','司马','诸葛','上官','东方','独孤','慕容'];
  var MALE_NAMES = ['伟','强','军','洋','勇','杰','涛','明','超','刚','平','辉','健','斌','龙','飞','鹏','磊','峰','帅','浩','康','乐','凡','晨','轩','泽','宇','睿','昊','子轩','浩然','泽宇','明轩','子涵','鹏飞','俊杰','志强','建国','建华','德胜','文博'];
  var FEMALE_NAMES = ['芳','娜','敏','静','秀英','艳','娟','霞','秀兰','丽','燕','凤','洁','梅','琳','婷','雅静','雅琪','思婷','雨欣','欣怡','梓涵','紫萱','诗涵','语嫣','诗琪','悦','静怡','雅涵','雨萱','梦琪','雪欣'];
  var EN_FIRST = ['James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles','Mary','Patricia','Jennifer','Linda','Elizabeth','Barbara','Susan','Jessica','Sarah','Karen','Emma','Olivia','Noah','Liam','Sophia','Ava','Mia','Ethan','Lucas','Mason'];
  var EN_LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin'];
  var EMAIL_DOMAINS = ['gmail.com','qq.com','163.com','126.com','outlook.com','yahoo.com','foxmail.com','sina.com','sohu.com','hotmail.com','icloud.com','protonmail.com'];
  var COMPANIES = ['字节跳动','腾讯科技','阿里巴巴','百度在线','美团点评','滴滴出行','网易','京东','小米','华为技术','蚂蚁金服','拼多多','快手','哔哩哔哩','携程','饿了么','微博','360','字节跳动科技','京东数字科技','顺丰速运','三一重工','中国移动','中国联通','中国电信','招商银行','工商银行','建设银行','平安保险','阿里巴巴集团'];
  var JOBS = ['前端工程师','后端开发','全栈工程师','产品经理','UI设计师','UX设计师','测试工程师','运维工程师','项目经理','HR','运营专员','数据分析师','算法工程师','架构师','CTO','CEO','COO','CFO','市场经理','销售经理','客服专员','设计师','内容编辑','视频编辑','数据工程师','DBA','安全工程师','技术支持','产品助理','商务经理'];
  var DEPARTMENTS = ['技术部','产品部','设计部','市场部','销售部','运营部','人事部','财务部','法务部','客服部','数据部','行政部','采购部','研发部','测试部','运维部'];
  var PROVINCES = ['北京市','上海市','广东省','江苏省','浙江省','山东省','河南省','四川省','湖北省','福建省','湖南省','安徽省','河北省','陕西省','辽宁省','江西省','重庆市','天津市','广西壮族自治区','云南省','贵州省','山西省','吉林省','黑龙江省','内蒙古自治区','新疆维吾尔自治区','甘肃省','海南省','宁夏回族自治区','青海省','西藏自治区'];
  var CITIES = ['朝阳区','海淀区','浦东新区','天河区','西湖区','鼓楼区','历下区','锦江区','江汉区','思明区','雨花区','蜀山区','长安区','和平区','渝中区','南开区','海珠区','越秀区','建邺区','滨江区'];
  var STREETS = ['中山路','人民路','解放路','建设路','和平路','新华路','长江路','黄河路','文化路','学府路','光明路','朝阳路','春风路','迎宾路','世纪大道','金融街','科技园','软件园','创业路','创新大道'];
  var PHONE_PREFIXES = ['130','131','132','133','134','135','136','137','138','139','145','147','149','150','151','152','153','155','156','157','158','159','166','170','171','172','173','175','176','177','178','180','181','182','183','184','185','186','187','188','189','191','198','199'];
  var URL_PROTOCOLS = ['https://','http://'];
  var URL_DOMAINS = ['example.com','test.org','demo.net','site.io','api.dev','app.co','github.com','stackoverflow.com','mozilla.org','wikipedia.org'];
  var URL_PATHS = ['/','/api/users','/docs/getting-started','/products/123','/blog/post/hello','/search?q=test','/images/logo.png','/about','/contact','/pricing'];

  /* ================= Mock 字段定义 ================= */
  var MOCK_FIELDS = [
    { key: 'name', label: '中文姓名', group: 'person' },
    { key: 'enName', label: '英文姓名', group: 'person' },
    { key: 'gender', label: '性别', group: 'person' },
    { key: 'age', label: '年龄', group: 'person' },
    { key: 'birthday', label: '生日', group: 'person' },
    { key: 'phone', label: '手机号', group: 'contact' },
    { key: 'email', label: '邮箱', group: 'contact' },
    { key: 'idcard', label: '身份证号', group: 'id' },
    { key: 'username', label: '用户名', group: 'id' },
    { key: 'password', label: '随机密码', group: 'id' },
    { key: 'company', label: '公司名称', group: 'work' },
    { key: 'job', label: '职位', group: 'work' },
    { key: 'department', label: '部门', group: 'work' },
    { key: 'province', label: '省份', group: 'address' },
    { key: 'city', label: '城市/区', group: 'address' },
    { key: 'address', label: '详细地址', group: 'address' },
    { key: 'zipcode', label: '邮编', group: 'address' },
    { key: 'ip', label: 'IPv4 地址', group: 'network' },
    { key: 'ipv6', label: 'IPv6 地址', group: 'network' },
    { key: 'mac', label: 'MAC 地址', group: 'network' },
    { key: 'url', label: 'URL', group: 'network' },
    { key: 'domain', label: '域名', group: 'network' },
    { key: 'bankcard', label: '银行卡号', group: 'finance' },
    { key: 'creditcard', label: '信用卡号', group: 'finance' },
    { key: 'price', label: '价格', group: 'finance' },
    { key: 'amount', label: '金额', group: 'finance' },
    { key: 'productName', label: '产品名', group: 'ecom' },
    { key: 'productSku', label: '商品编码', group: 'ecom' },
    { key: 'orderId', label: '订单号', group: 'ecom' },
    { key: 'trackingNo', label: '物流单号', group: 'ecom' },
    { key: 'color', label: '颜色 HEX', group: 'misc' },
    { key: 'uuid', label: 'UUID', group: 'misc' },
    { key: 'datetime', label: '日期时间', group: 'misc' },
    { key: 'timestamp', label: 'Unix 时间戳', group: 'misc' },
    { key: 'plateNo', label: '车牌号', group: 'misc' },
    { key: 'isbn', label: 'ISBN', group: 'misc' }
  ];

  var MOCK_PRESETS = {
    cn: ['name', 'gender', 'age', 'phone', 'email', 'province', 'address'],
    ecom: ['orderId', 'productName', 'productSku', 'amount', 'trackingNo', 'datetime']
  };

  /* ================= Mock 字段生成器 ================= */
  var MOCK_GENERATORS = {
    name: function () {
      var gender = randomInt(2) === 0 ? 'male' : 'female';
      var surname = pick(SURNAMES);
      var given = gender === 'male' ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
      return surname + given;
    },
    enName: function () {
      return pick(EN_FIRST) + ' ' + pick(EN_LAST);
    },
    gender: function () { return randomInt(2) === 0 ? '男' : '女'; },
    age: function () { return randomIntRange(18, 65); },
    birthday: function () {
      var y = randomIntRange(1960, 2005);
      var m = randomIntRange(1, 12);
      var d = randomIntRange(1, 28);
      return y + '-' + pad2(m) + '-' + pad2(d);
    },
    phone: function () {
      return pick(PHONE_PREFIXES) + String(randomIntRange(10000000, 99999999));
    },
    email: function () {
      var localParts = ['user','admin','test','info','contact','hello','me','mail','dev','support','john','mary','alex','emma'];
      var local = pick(localParts) + (randomInt(2) === 0 ? '' : String(randomIntRange(1, 9999)));
      return local + '@' + pick(EMAIL_DOMAINS);
    },
    idcard: function () {
      var regions = ['110101','310101','440106','440304','330106','320102','370102','510107','420102','350203','110105','310115'];
      var region = pick(regions);
      var year = randomIntRange(1960, 2005);
      var month = pad2(randomIntRange(1, 12));
      var day = pad2(randomIntRange(1, 28));
      var seq = String(randomIntRange(1, 999)).padStart(3, '0');
      var base = region + year + month + day + seq;
      var weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      var checkCodes = ['1','0','X','9','8','7','6','5','4','3','2'];
      var sum = 0;
      for (var i = 0; i < 17; i++) sum += parseInt(base[i], 10) * weights[i];
      return base + checkCodes[sum % 11];
    },
    username: function () {
      var bases = ['user','admin','test','dev','coder','hacker','master','king','pro','tech','geek','ninja'];
      return pick(bases) + (randomInt(2) === 0 ? '_' : '') + String(randomIntRange(1, 9999));
    },
    password: function () {
      var charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
      var len = randomIntRange(12, 20);
      var out = '';
      for (var i = 0; i < len; i++) out += charset[randomInt(charset.length)];
      return out;
    },
    company: function () { return pick(COMPANIES); },
    job: function () { return pick(JOBS); },
    department: function () { return pick(DEPARTMENTS); },
    province: function () { return pick(PROVINCES); },
    city: function () { return pick(CITIES); },
    address: function () { return pick(PROVINCES) + pick(CITIES) + pick(STREETS) + randomIntRange(1, 999) + '号'; },
    zipcode: function () { return String(randomIntRange(100000, 999999)); },
    ip: function () {
      var a = randomIntRange(1, 223);
      if (a === 127) a = 128;
      return a + '.' + randomInt(256) + '.' + randomInt(256) + '.' + randomIntRange(1, 254);
    },
    ipv6: function () {
      var out = [];
      for (var i = 0; i < 8; i++) out.push(randomInt(65536).toString(16));
      return out.join(':');
    },
    mac: function () {
      var out = [];
      for (var i = 0; i < 6; i++) out.push(randomInt(256).toString(16).padStart(2, '0').toUpperCase());
      return out.join(':');
    },
    url: function () { return pick(URL_PROTOCOLS) + pick(URL_DOMAINS) + pick(URL_PATHS); },
    domain: function () { return pick(URL_DOMAINS); },
    bankcard: function () {
      var prefix = pick(['622202','622848','622700','622262','621226','621700','622588','622909']);
      var len = randomInt(2) === 0 ? 16 : 19;
      var body = prefix;
      while (body.length < len - 1) body += randomInt(10);
      var sum = 0;
      var idx = 0;
      for (var i = body.length - 1; i >= 0; i--) {
        var d = parseInt(body[i], 10);
        if (idx % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        idx++;
      }
      var check = (10 - (sum % 10)) % 10;
      return body + check;
    },
    creditcard: function () {
      var prefix = pick(['4532','4539','4556','4916','5404','5405','5523','5105']);
      var len = 16;
      var body = prefix;
      while (body.length < len - 1) body += randomInt(10);
      var sum = 0;
      var idx = 0;
      for (var i = body.length - 1; i >= 0; i--) {
        var d = parseInt(body[i], 10);
        if (idx % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
        idx++;
      }
      var check = (10 - (sum % 10)) % 10;
      return body + check;
    },
    price: function () { return (randomIntRange(1, 99999) / 100).toFixed(2); },
    amount: function () { return (randomIntRange(100, 9999999) / 100).toFixed(2); },
    productName: function () {
      var brands = ['小米','华为','苹果','三星','索尼','戴尔','联想','华硕','罗技','大疆'];
      var categories = ['手机','笔记本','平板','耳机','键盘','鼠标','显示器','相机','手表','音箱'];
      var models = ['Pro','Max','Ultra','Plus','Lite','Air','Mini','2024','2023'];
      return pick(brands) + pick(categories) + ' ' + pick(models);
    },
    productSku: function () {
      return 'SKU-' + String(randomIntRange(100000, 999999));
    },
    orderId: function () {
      return 'ORD' + Date.now().toString(36).toUpperCase() + randomIntRange(100, 999);
    },
    trackingNo: function () {
      var prefixes = ['SF','YT','ZT','JD','EMS','DBL'];
      return pick(prefixes) + String(randomIntRange(100000000000, 999999999999));
    },
    color: function () {
      var hex = randomInt(0x1000000).toString(16).padStart(6, '0');
      return '#' + hex.toUpperCase();
    },
    uuid: function () {
      var bytes = randomBytes(16);
      bytes[6] = (bytes[6] & 0x0F) | 0x40;
      bytes[8] = (bytes[8] & 0x3F) | 0x80;
      var hex = [];
      for (var i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));
      var h = hex.join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    },
    datetime: function () {
      var ts = Date.now() + randomIntRange(-365 * 86400, 365 * 86400) * 1000;
      var d = new Date(ts);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
        ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    },
    timestamp: function () { return Date.now() - randomIntRange(0, 365 * 86400000); },
    plateNo: function () {
      var prov = ['京','沪','粤','苏','浙','鲁','豫','川','鄂','闽','湘','皖','冀','陕','辽','赣','渝','津','桂','云','贵','晋','吉','黑','蒙','新','甘','琼','宁','青','藏'];
      var letter = 'ABCDEFGHJKLMNPQRSTUVWXYZ'[randomInt(24)];
      var digits = String(randomIntRange(10000, 99999));
      return pick(prov) + letter + digits;
    },
    isbn: function () {
      // ISBN-13 简单实现
      var prefix = '978';
      var body = prefix;
      for (var i = 0; i < 9; i++) body += randomInt(10);
      var sum = 0;
      for (var j = 0; j < 12; j++) {
        sum += parseInt(body[j], 10) * (j % 2 === 0 ? 1 : 3);
      }
      var check = (10 - (sum % 10)) % 10;
      return body + check;
    }
  };

  /* ================= 数据生成 ================= */
  function getSelectedFields() {
    var selected = [];
    els.mockFields.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      if (cb.checked) selected.push(cb.dataset.key);
    });
    return selected;
  }

  function generateMockData() {
    var count = Math.max(1, Math.min(1000, parseInt(els.mockCount.value, 10) || 10));
    var fields = getSelectedFields();
    if (fields.length === 0) {
      showToast('❌ 请至少选择一个字段');
      return;
    }

    var rows = [];
    for (var i = 0; i < count; i++) {
      var row = {};
      fields.forEach(function (key) {
        var gen = MOCK_GENERATORS[key];
        if (gen) row[key] = gen();
      });
      rows.push(row);
    }

    var output = formatOutput(rows, fields, els.mockTableName.value || 'data');
    els.mockOutput.value = output;
    els.mockOutputInfo.textContent = '✅ 已生成 ' + rows.length + ' 条 × ' + fields.length + ' 字段';
    els.btnMockCopy.hidden = false;
    els.btnMockDownload.hidden = false;

    addHistory('mock', '生成数据', count + ' 条 × ' + fields.length + ' 字段', output);
  }

  /* ================= 输出格式化 ================= */
  function formatOutput(rows, fields, tableName) {
    switch (state.mockFormat) {
      case 'json': return formatJSON(rows);
      case 'csv': return formatCSV(rows, fields);
      case 'sql': return formatSQL(rows, fields, tableName);
      case 'ts': return formatTS(rows, fields, tableName);
      case 'yaml': return formatYAML(rows);
      case 'markdown': return formatMarkdown(rows, fields);
      default: return formatJSON(rows);
    }
  }

  function formatJSON(rows) {
    return JSON.stringify(rows, null, 2);
  }

  function formatCSV(rows, fields) {
    var lines = [];
    lines.push(fields.join(','));
    rows.forEach(function (row) {
      var vals = fields.map(function (f) {
        var v = row[f];
        if (v == null) return '';
        var s = String(v);
        if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      });
      lines.push(vals.join(','));
    });
    return lines.join('\r\n');
  }

  function formatSQL(rows, fields, tableName) {
    var lines = [];
    var cols = fields.map(function (f) { return '`' + f + '`'; }).join(', ');
    lines.push('-- Table: ' + tableName);
    lines.push('-- Rows: ' + rows.length);
    lines.push('');
    rows.forEach(function (row) {
      var vals = fields.map(function (f) {
        var v = row[f];
        if (v == null) return 'NULL';
        if (typeof v === 'number') return v;
        return "'" + String(v).replace(/'/g, "''") + "'";
      }).join(', ');
      lines.push('INSERT INTO `' + tableName + '` (' + cols + ') VALUES (' + vals + ');');
    });
    return lines.join('\n');
  }

  function formatTS(rows, fields, tableName) {
    var lines = [];
    var typeMap = {
      age: 'number', price: 'number', amount: 'number', timestamp: 'number'
    };
    var interfaceName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
    lines.push('// Interface for ' + tableName);
    lines.push('export interface ' + interfaceName + ' {');
    fields.forEach(function (f) {
      lines.push('  ' + f + ': ' + (typeMap[f] || 'string') + ';');
    });
    lines.push('}');
    lines.push('');
    lines.push('export const ' + tableName + ': ' + interfaceName + '[] = ' + JSON.stringify(rows, null, 2) + ';');
    return lines.join('\n');
  }

  function formatYAML(rows) {
    var lines = [];
    rows.forEach(function (row, i) {
      lines.push('- ' + Object.keys(row).map(function (k) { return k + ':'; }).join('\n  '));
      var keys = Object.keys(row);
      lines.pop(); // 简化处理
      // 更简单的方式
    });
    // 用简化的 YAML 生成
    lines = [];
    rows.forEach(function (row) {
      var first = true;
      Object.keys(row).forEach(function (k) {
        var prefix = first ? '- ' : '  ';
        first = false;
        var v = row[k];
        var valStr;
        if (v == null) valStr = 'null';
        else if (typeof v === 'number') valStr = String(v);
        else {
          // 需要引号时加引号
          var s = String(v);
          if (/[:\-\n"']/.test(s) || s.trim() !== s) {
            valStr = '"' + s.replace(/"/g, '\\"') + '"';
          } else {
            valStr = s;
          }
        }
        lines.push(prefix + k + ': ' + valStr);
      });
    });
    return lines.join('\n');
  }

  function formatMarkdown(rows, fields) {
    var lines = [];
    lines.push('| ' + fields.join(' | ') + ' |');
    lines.push('| ' + fields.map(function () { return '---'; }).join(' | ') + ' |');
    rows.forEach(function (row) {
      var vals = fields.map(function (f) {
        var v = row[f];
        return v == null ? '' : String(v).replace(/\|/g, '\\|');
      });
      lines.push('| ' + vals.join(' | ') + ' |');
    });
    return lines.join('\n');
  }

  /* ================= 渲染 Mock 字段 ================= */
  function renderMockFields() {
    var html = '';
    MOCK_FIELDS.forEach(function (f) {
      var checked = ['name','gender','age','phone','email'].indexOf(f.key) >= 0 ? ' checked' : '';
      html += '<label><input type="checkbox" data-key="' + f.key + '"' + checked + '> ' + escapeHtml(f.label) + '</label>';
    });
    els.mockFields.innerHTML = html;
  }

  function selectFields(keys) {
    els.mockFields.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.checked = keys.indexOf(cb.dataset.key) >= 0;
    });
  }

  /* ================= 抽奖 ================= */
  function parseLotteryInput() {
    var raw = els.lotteryInput.value;
    var lines = raw.split('\n');
    var options = [];
    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(',');
      var name = parts[0].trim();
      var weight = 1;
      if (parts.length > 1) {
        var w = parseFloat(parts[1]);
        if (!isNaN(w) && w > 0) weight = w;
      }
      options.push({ name: name, weight: weight });
    });
    return options;
  }

  function updateLotteryMeta() {
    var opts = parseLotteryInput();
    var removed = state.lotteryOptions.filter(function (o) { return o.removed; }).length;
    var total = opts.length;
    var active = state.lotteryOptions.filter(function (o) { return !o.removed; }).length;
    els.lotteryMeta.textContent = total + ' 个选项' +
      (removed > 0 ? ' · 已移除 ' + removed + ' · 剩余 ' + active : '');
  }

  function doLottery() {
    // 解析输入
    state.lotteryOptions = parseLotteryInput().map(function (o) {
      // 保留已移除状态
      var existing = state.lotteryOptions.filter(function (x) {
        return x.name === o.name && !x.removed;
      })[0];
      return { name: o.name, weight: o.weight, removed: false };
    });

    if (state.lotteryOptions.length === 0) {
      showToast('❌ 请输入抽奖选项');
      return;
    }

    var available = state.lotteryOptions.filter(function (o) { return !o.removed; });
    if (available.length === 0) {
      showToast('所有选项都已抽取，请点击重置');
      return;
    }

    var count = Math.max(1, Math.min(available.length, parseInt(els.lotteryCount.value, 10) || 1));
    var unique = els.lotteryUnique.checked;
    var animate = els.lotteryAnimate.checked;

    // 抽取
    var winners = [];
    var pool = available.slice();
    for (var i = 0; i < count; i++) {
      if (pool.length === 0) break;
      var winner = pickWeighted(pool);
      if (!winner) break;
      winners.push(winner);
      if (unique) {
        pool = pool.filter(function (o) { return o !== winner; });
        winner.removed = true;
      }
    }

    if (winners.length === 0) return;

    // 显示
    if (animate) {
      animateLottery(winners, function () {
        finishLottery(winners);
      });
    } else {
      finishLottery(winners);
    }

    addHistory('lottery', '抽奖', winners.map(function (w) { return w.name; }).join(', '), null);
  }

  function pickWeighted(pool) {
    var total = 0;
    pool.forEach(function (o) { total += o.weight; });
    var r = randomFloat() * total;
    var acc = 0;
    for (var i = 0; i < pool.length; i++) {
      acc += pool[i].weight;
      if (r < acc) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function animateLottery(winners, callback) {
    els.lotteryDisplay.classList.add('rolling');
    els.lotteryDisplay.classList.remove('winner');
    els.lotteryDisplay.innerHTML = '🎰 抽取中...';
    var pool = state.lotteryOptions.filter(function (o) { return !o.removed || winners.indexOf(o) >= 0; });
    var allNames = state.lotteryOptions.map(function (o) { return o.name; });
    var steps = 0;
    var maxSteps = 20 + randomInt(15);
    var interval = setInterval(function () {
      steps++;
      var fake = allNames[randomInt(allNames.length)];
      els.lotteryDisplay.innerHTML = '🎰 ' + escapeHtml(fake);
      if (steps >= maxSteps) {
        clearInterval(interval);
        els.lotteryDisplay.classList.remove('rolling');
        callback();
      }
    }, 60);
  }

  function finishLottery(winners) {
    els.lotteryDisplay.classList.add('winner');
    var html;
    if (winners.length === 1) {
      html = '🏆 ' + escapeHtml(winners[0].name);
    } else {
      html = '🏆 ' + winners.length + ' 位中奖者<br>' +
        winners.map(function (w) { return escapeHtml(w.name); }).join(' · ');
    }
    els.lotteryDisplay.innerHTML = html;

    // 添加到本轮结果
    winners.forEach(function (w) {
      state.lotteryResults.push(w.name);
    });

    renderLotteryHistory();
    updateLotteryMeta();
    showToast('🎉 抽奖完成！');
  }

  function renderLotteryHistory() {
    if (state.lotteryResults.length === 0) {
      els.lotteryHistory.innerHTML = '';
      return;
    }
    var html = '';
    state.lotteryResults.forEach(function (name, i) {
      html += '<div class="mk-lottery-item">' +
        '<span class="mk-lottery-idx">#' + (i + 1) + '</span>' +
        '<span class="mk-lottery-name">' + escapeHtml(name) + '</span>' +
        '</div>';
    });
    els.lotteryHistory.innerHTML = html;
  }

  /* ================= 骰子 ================= */
  function renderDiceQuick() {
    var dices = [4, 6, 8, 10, 12, 20, 100];
    var html = '';
    dices.forEach(function (d) {
      html += '<button data-max="' + d + '" type="button">D' + d + '</button>';
    });
    els.diceQuick.innerHTML = html;
  }

  function rollDice(n, m, modifier) {
    if (n < 1 || n > 20) { showToast('❌ 骰子数量需在 1-20 之间'); return; }
    if (m < 2 || m > 100) { showToast('❌ 骰子面数需在 2-100 之间'); return; }
    modifier = modifier || 0;

    var rolls = [];
    var sum = 0;
    for (var i = 0; i < n; i++) {
      var r = randomIntRange(1, m);
      rolls.push(r);
      sum += r;
    }
    var total = sum + modifier;

    // 显示
    els.diceDisplay.innerHTML =
      '<div class="mk-dice-big">' + total + '</div>' +
      '<div class="mk-dice-detail">' +
        rolls.map(function (r) { return '<span class="mk-dice-each">' + r + '</span>'; }).join('+') +
        (modifier !== 0 ? ' ' + (modifier > 0 ? '+' : '') + modifier : '') +
        ' = ' + total +
      '</div>';

    // 动画
    els.diceDisplay.classList.add('rolling');
    setTimeout(function () { els.diceDisplay.classList.remove('rolling'); }, 300);

    // 添加历史
    state.diceHistory.unshift({
      n: n, m: m, rolls: rolls, sum: sum, modifier: modifier, total: total, ts: Date.now()
    });
    if (state.diceHistory.length > 30) state.diceHistory.length = 30;
    renderDiceHistory();

    addHistory('dice', '投掷', n + 'd' + m + (modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : '') + ' = ' + total, null);
  }

  function renderDiceHistory() {
    els.diceHistoryCount.textContent = state.diceHistory.length + ' 次';
    if (state.diceHistory.length === 0) {
      els.diceHistory.innerHTML = '';
      return;
    }
    var html = '';
    state.diceHistory.forEach(function (h, i) {
      html += '<div class="mk-dice-item">' +
        '<span class="mk-dice-idx">#' + (state.diceHistory.length - i) + '</span>' +
        '<span class="mk-dice-name">' + h.n + 'd' + h.m +
          (h.modifier !== 0 ? (h.modifier > 0 ? '+' : '') + h.modifier : '') +
          ' [' + h.rolls.join(',') + ']</span>' +
        '<span class="mk-dice-sum">= ' + h.total + '</span>' +
        '</div>';
    });
    els.diceHistory.innerHTML = html;
  }

  /* ================= 随机值 ================= */
  function generateRandomInt() {
    var min = parseInt(els.rndIntMin.value, 10) || 0;
    var max = parseInt(els.rndIntMax.value, 10) || 100;
    var count = Math.max(1, Math.min(100, parseInt(els.rndIntCount.value, 10) || 1));
    if (min > max) { var t = min; min = max; max = t; }
    var results = [];
    for (var i = 0; i < count; i++) results.push(randomIntRange(min, max));
    els.rndIntOutput.textContent = results.join(', ');
    els.rndIntOutput.dataset.copy = results.join(', ');
    addHistory('random', '整数', results.join(', '), null);
  }

  function generateRandomFloat() {
    var min = parseFloat(els.rndFloatMin.value) || 0;
    var max = parseFloat(els.rndFloatMax.value) || 1;
    var dec = Math.max(0, Math.min(10, parseInt(els.rndFloatDec.value, 10) || 2));
    if (min > max) { var t = min; min = max; max = t; }
    var val = min + randomFloat() * (max - min);
    val = val.toFixed(dec);
    els.rndFloatOutput.textContent = val;
    els.rndFloatOutput.dataset.copy = val;
    addHistory('random', '小数', val, null);
  }

  function generateRandomString() {
    var len = Math.max(1, Math.min(200, parseInt(els.rndStrLen.value, 10) || 16));
    var charsetType = els.rndStrCharset.value;
    var charsets = {
      alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      num: '0123456789',
      hex: '0123456789abcdef',
      base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    };
    if (charsetType === 'emoji') {
      var emojis = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🙂','🤗','🤔','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠'];
      var out = '';
      for (var i = 0; i < len; i++) out += emojis[randomInt(emojis.length)];
      els.rndStrOutput.textContent = out;
      els.rndStrOutput.dataset.copy = out;
      return;
    }
    var charset = charsets[charsetType] || charsets.alnum;
    var result = '';
    for (var j = 0; j < len; j++) result += charset[randomInt(charset.length)];
    els.rndStrOutput.textContent = result;
    els.rndStrOutput.dataset.copy = result;
    addHistory('random', '字符串', result, null);
  }

  function generateRandomColor(batch) {
    var count = batch ? 5 : 1;
    els.rndColorOutput.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var hex = '#' + randomInt(0x1000000).toString(16).padStart(6, '0').toUpperCase();
      var el = document.createElement('div');
      el.className = 'mk-color-item';
      el.style.background = hex;
      el.dataset.hex = hex;
      el.dataset.copy = hex;
      el.title = '点击复制 ' + hex;
      els.rndColorOutput.appendChild(el);
    }
  }

  function generateUUIDs() {
    var count = Math.max(1, Math.min(100, parseInt(els.rndUuidCount.value, 10) || 5));
    var uuids = [];
    for (var i = 0; i < count; i++) uuids.push(MOCK_GENERATORS.uuid());
    els.rndUuidOutput.value = uuids.join('\n');
    addHistory('random', 'UUID', count + ' 个', uuids.join('\n'));
  }

  /* ================= 历史记录 ================= */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      state.history = raw ? JSON.parse(raw) : [];
    } catch (e) { state.history = []; }
    if (!Array.isArray(state.history)) state.history = [];
    updateHistoryCount();
  }
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }
  function updateHistoryCount() {
    if (els.historyCount) els.historyCount.textContent = state.history.length;
  }
  function addHistory(type, label, summary, fullValue) {
    state.history.unshift({
      type: type,
      label: label,
      summary: summary,
      value: fullValue || summary,
      ts: Date.now()
    });
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    saveHistory();
    updateHistoryCount();
  }
  function renderDrawer() {
    if (state.history.length === 0) {
      els.drawerList.innerHTML = '<p class="mk-drawer-empty">暂无记录</p>';
      return;
    }
    var html = '';
    state.history.forEach(function (h, i) {
      var d = new Date(h.ts);
      var time = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
      html += '<div class="mk-drawer-item" data-idx="' + i + '">' +
        '<div class="mk-drawer-item-head">' +
          '<span>' + escapeHtml(h.label) + '</span>' +
          '<span>' + time + '</span>' +
        '</div>' +
        '<div class="mk-drawer-item-value">' + escapeHtml(h.summary) + '</div>' +
        '</div>';
    });
    els.drawerList.innerHTML = html;
  }
  function openDrawer() {
    renderDrawer();
    els.drawerBackdrop.hidden = false;
    els.drawer.classList.add('open');
  }
  function closeDrawer() {
    els.drawerBackdrop.hidden = true;
    els.drawer.classList.remove('open');
  }

  /* ================= 主题 ================= */
  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') state.theme = t;
    } catch (e) {}
    applyTheme();
  }
  function applyTheme() {
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    if (els.btnTheme) els.btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // Tabs
    els.tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.mk-tab');
      if (!btn) return;
      Array.prototype.forEach.call(els.tabs.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      document.querySelectorAll('.mk-panel').forEach(function (p) {
        p.classList.toggle('active', p.id === btn.dataset.target);
      });
    });

    // 主题 / 历史
    els.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
      applyTheme();
    });
    els.btnHistory.addEventListener('click', openDrawer);
    els.drawerClose.addEventListener('click', closeDrawer);
    els.drawerBackdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.drawer.classList.contains('open')) closeDrawer();
    });
    els.clearHistory.addEventListener('click', function () {
      if (!confirm('清空全部历史记录？')) return;
      state.history = [];
      saveHistory();
      updateHistoryCount();
      renderDrawer();
      showToast('🗑 已清空历史');
    });
    els.drawerList.addEventListener('click', function (e) {
      var item = e.target.closest('.mk-drawer-item');
      if (!item) return;
      var idx = parseInt(item.dataset.idx, 10);
      var h = state.history[idx];
      if (h && h.value) copyText(h.value);
    });

    // ============ Mock 面板 ============
    els.mockCountSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-n]');
      if (!btn) return;
      Array.prototype.forEach.call(els.mockCountSeg.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      els.mockCount.value = btn.dataset.n;
    });

    els.mockFormatSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-format]');
      if (!btn) return;
      Array.prototype.forEach.call(els.mockFormatSeg.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.mockFormat = btn.dataset.format;
    });

    els.btnSelectAll.addEventListener('click', function () {
      els.mockFields.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = true; });
    });
    els.btnSelectNone.addEventListener('click', function () {
      els.mockFields.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    });
    els.btnPresetCn.addEventListener('click', function () {
      selectFields(MOCK_PRESETS.cn);
    });
    els.btnPresetEcom.addEventListener('click', function () {
      selectFields(MOCK_PRESETS.ecom);
    });

    els.btnGenMock.addEventListener('click', generateMockData);

    els.btnMockCopy.addEventListener('click', function () {
      copyText(els.mockOutput.value);
    });
    els.btnMockDownload.addEventListener('click', function () {
      var ext = state.mockFormat === 'json' ? 'json'
        : state.mockFormat === 'csv' ? 'csv'
        : state.mockFormat === 'sql' ? 'sql'
        : state.mockFormat === 'ts' ? 'ts'
        : state.mockFormat === 'yaml' ? 'yaml'
        : 'md';
      var mime = state.mockFormat === 'json' ? 'application/json'
        : state.mockFormat === 'csv' ? 'text/csv'
        : 'text/plain';
      downloadFile(els.mockOutput.value, 'mock-data.' + ext, mime);
      showToast('📥 已下载');
    });

    // ============ 抽奖面板 ============
    els.lotteryInput.addEventListener('input', function () {
      state.lotteryOptions = parseLotteryInput().map(function (o) {
        return { name: o.name, weight: o.weight, removed: false };
      });
      updateLotteryMeta();
    });

    els.btnLotteryDemo.addEventListener('click', function () {
      els.lotteryInput.value = '张三\n李四\n王五,3\n赵六,2\n钱七\n孙八\n周九';
      state.lotteryOptions = parseLotteryInput().map(function (o) {
        return { name: o.name, weight: o.weight, removed: false };
      });
      updateLotteryMeta();
    });
    els.btnLotteryClear.addEventListener('click', function () {
      els.lotteryInput.value = '';
      state.lotteryOptions = [];
      state.lotteryResults = [];
      els.lotteryDisplay.innerHTML = '<div class="mk-winner-hint">🎯 点击「开始抽取」</div>';
      els.lotteryDisplay.classList.remove('winner', 'rolling');
      renderLotteryHistory();
      updateLotteryMeta();
    });

    els.btnLottery.addEventListener('click', doLottery);
    els.btnLotteryReset.addEventListener('click', function () {
      state.lotteryOptions.forEach(function (o) { o.removed = false; });
      state.lotteryResults = [];
      els.lotteryDisplay.innerHTML = '<div class="mk-winner-hint">🎯 点击「开始抽取」</div>';
      els.lotteryDisplay.classList.remove('winner', 'rolling');
      renderLotteryHistory();
      updateLotteryMeta();
      showToast('✅ 已重置');
    });

    // ============ 骰子面板 ============
    els.diceQuick.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-max]');
      if (!btn) return;
      var m = parseInt(btn.dataset.max, 10);
      rollDice(1, m, 0);
    });

    els.btnRollCustom.addEventListener('click', function () {
      var n = parseInt(els.diceN.value, 10) || 1;
      var m = parseInt(els.diceM.value, 10) || 6;
      var mod = parseInt(els.diceModifier.value, 10) || 0;
      rollDice(n, m, mod);
    });

    els.btnClearDice.addEventListener('click', function () {
      state.diceHistory = [];
      renderDiceHistory();
      els.diceDisplay.innerHTML = '<div class="mk-winner-hint">🎲 点击上方骰子开始投掷</div>';
      showToast('已清空历史');
    });

    // ============ 随机值面板 ============
    els.btnRndInt.addEventListener('click', generateRandomInt);
    els.btnRndFloat.addEventListener('click', generateRandomFloat);
    els.btnRndStr.addEventListener('click', generateRandomString);
    els.btnRndColor.addEventListener('click', function () { generateRandomColor(false); });
    els.btnRndColorBatch.addEventListener('click', function () { generateRandomColor(true); });
    els.btnRndUuid.addEventListener('click', generateUUIDs);

    els.btnCoin.addEventListener('click', function () {
      var r = randomInt(2) === 0 ? '正面 (Heads)' : '反面 (Tails)';
      els.rndCoinOutput.textContent = '🪙 ' + r;
      els.rndCoinOutput.dataset.copy = r;
    });
    els.btnDie6.addEventListener('click', function () {
      var r = randomIntRange(1, 6);
      els.rndCoinOutput.textContent = '🎲 D6: ' + r;
      els.rndCoinOutput.dataset.copy = String(r);
    });
    els.btnDie20.addEventListener('click', function () {
      var r = randomIntRange(1, 20);
      els.rndCoinOutput.textContent = '🎲 D20: ' + r;
      els.rndCoinOutput.dataset.copy = String(r);
    });

    // 输出区点击复制
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-copy]');
      if (el && el.dataset.copy) {
        copyText(el.dataset.copy);
      }
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheEls();
    loadTheme();
    loadHistory();
    bindEvents();

    renderMockFields();
    renderDiceQuick();
    renderLotteryHistory();
    renderDiceHistory();
    updateLotteryMeta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();