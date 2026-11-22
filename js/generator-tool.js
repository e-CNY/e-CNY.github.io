/* js/generator-tool.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var THEME_KEY = 'generator_tool_theme_v1';
  var HISTORY_KEY = 'generator_tool_history_v1';
  var MAX_HISTORY = 40;

  var CROCKFORD32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

  /* ================= DOM ================= */
  function $(id) { return document.getElementById(id); }

  var els = {};
  function cacheEls() {
    els.topbar = document.querySelector('.gn-topbar');
    els.btnHistory = $('btn-history');
    els.historyCount = $('history-count');
    els.btnTheme = $('btn-theme');

    els.idList = $('id-list');
    els.mockFilters = $('mock-filters');
    els.mockList = $('mock-list');

    els.pwdLen = $('pwd-len');
    els.pwdLenVal = $('pwd-len-val');
    els.pwdUpper = $('pwd-upper');
    els.pwdLower = $('pwd-lower');
    els.pwdNum = $('pwd-num');
    els.pwdSym = $('pwd-sym');
    els.pwdNoAmbiguous = $('pwd-no-ambiguous');
    els.pwdNoSimilar = $('pwd-no-similar');
    els.pwdRequireAll = $('pwd-require-all');
    els.pwdExclude = $('pwd-exclude');
    els.pwdBatchSeg = $('pwd-batch-seg');
    els.btnGenPwd = $('btn-gen-pwd');
    els.pwdOutputs = $('pwd-outputs');

    els.phraseWords = $('phrase-words');
    els.phraseSep = $('phrase-sep');
    els.phraseCap = $('phrase-cap');
    els.phraseNumber = $('phrase-number');
    els.phraseSymbol = $('phrase-symbol');
    els.btnGenPhrase = $('btn-gen-phrase');
    els.phraseOutputs = $('phrase-outputs');

    els.drawer = $('drawer');
    els.drawerBackdrop = $('drawer-backdrop');
    els.drawerClose = $('drawer-close');
    els.drawerList = $('drawer-list');
    els.clearHistory = $('clear-history');

    els.toast = $('gn-toast');
  }

  /* ================= 状态 ================= */
  var state = {
    theme: 'light',
    mockFilter: 'all',
    pwdBatch: 1,
    history: []
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
    // 拒绝采样避免偏差
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

  /* ================= ID 生成 ================= */

  // UUID v4：加密安全
  function uuidv4() {
    var bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0F) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3F) | 0x80; // variant 10xx
    var hex = [];
    for (var i = 0; i < 16; i++) {
      hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    var h = hex.join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // UUID v7：RFC 9562，时间有序
  function uuidv7() {
    var bytes = randomBytes(16);
    var ts = BigInt(Date.now());
    bytes[0] = Number((ts >> 40n) & 0xFFn);
    bytes[1] = Number((ts >> 32n) & 0xFFn);
    bytes[2] = Number((ts >> 24n) & 0xFFn);
    bytes[3] = Number((ts >> 16n) & 0xFFn);
    bytes[4] = Number((ts >> 8n) & 0xFFn);
    bytes[5] = Number(ts & 0xFFn);
    bytes[6] = (bytes[6] & 0x0F) | 0x70; // version 7
    bytes[8] = (bytes[8] & 0x3F) | 0x80; // variant 10xx
    var hex = [];
    for (var i = 0; i < 16; i++) {
      hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    var h = hex.join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // ULID：Crockford Base32（修复版）
  function encodeCrockford32(value, length) {
    var out = '';
    for (var i = 0; i < length; i++) {
      out = CROCKFORD32[value % 32] + out;
      value = Math.floor(value / 32);
    }
    return out;
  }

  function generateULID() {
    var timeStr = encodeCrockford32(Date.now(), 10);
    var rand = randomBytes(16);
    var randStr = '';
    for (var i = 0; i < 16; i++) {
      randStr += CROCKFORD32[rand[i] % 32];
    }
    return timeStr + randStr;
  }

  // Snowflake：41 位时间戳 + 10 位机器 + 12 位序列（修复位运算）
  var SNOWFLAKE_EPOCH = 1288834974657n; // Twitter 原版 2010-11-04
  var snowflakeWorkerId = BigInt(randomIntRange(0, 1023)); // 10 位
  var snowflakeLastTime = 0n;
  var snowflakeSeq = 0n;

  function generateSnowflake() {
    var now = BigInt(Date.now());
    if (now === snowflakeLastTime) {
      snowflakeSeq = (snowflakeSeq + 1n) & 4095n;
      if (snowflakeSeq === 0n) {
        // 序列用尽，等到下一毫秒
        while (BigInt(Date.now()) <= snowflakeLastTime) { /* busy wait */ }
        now = BigInt(Date.now());
      }
    } else {
      snowflakeSeq = 0n;
    }
    snowflakeLastTime = now;
    var timestamp = now - SNOWFLAKE_EPOCH;
    var id = (timestamp << 22n) | (snowflakeWorkerId << 12n) | snowflakeSeq;
    return id.toString();
  }

  // NanoID
  function nanoid(size) {
    size = size || 21;
    var rand = randomBytes(size);
    var id = '';
    for (var i = 0; i < size; i++) {
      id += NANOID_ALPHABET[rand[i] & 63];
    }
    return id;
  }

  // CUID2 风格：时间戳 + 随机
  function cuid2() {
    var t = Date.now().toString(36);
    var rand = '';
    for (var i = 0; i < 20; i++) {
      rand += 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)];
    }
    return 'c' + t + rand;
  }

  // MongoDB ObjectId：4 字节时间 + 5 字节随机 + 3 字节计数
  var objectIdCounter = randomInt(0xFFFFFF);
  function objectId() {
    var ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    var rand = '';
    for (var i = 0; i < 10; i++) {
      rand += '0123456789abcdef'[randomInt(16)];
    }
    objectIdCounter = (objectIdCounter + 1) & 0xFFFFFF;
    var count = objectIdCounter.toString(16).padStart(6, '0');
    return ts + rand + count;
  }

  /* ================= ID 列表配置 ================= */
  var ID_GENERATORS = [
    { key: 'uuid', label: 'UUID v4', desc: '通用唯一标识，随机', gen: uuidv4 },
    { key: 'uuidv7', label: 'UUID v7', desc: 'RFC 9562 时间有序', gen: uuidv7 },
    { key: 'ulid', label: 'ULID', desc: '26 位 Base32 时间有序', gen: generateULID },
    { key: 'snowflake', label: 'Snowflake', desc: 'Twitter 分布式 ID', gen: generateSnowflake },
    { key: 'nanoid', label: 'NanoID (21)', desc: '短小 URL 安全', gen: function () { return nanoid(21); } },
    { key: 'cuid2', label: 'CUID2', desc: '碰撞概率极低', gen: cuid2 },
    { key: 'objectid', label: 'ObjectId', desc: 'MongoDB 24 位 Hex', gen: objectId }
  ];

  function renderIdList() {
    var html = '';
    ID_GENERATORS.forEach(function (g) {
      html += '<div class="gn-id-item" data-key="' + g.key + '">' +
        '<div class="gn-id-label">' +
          '<span>' + escapeHtml(g.label) + '</span>' +
          '<span class="gn-id-desc">' + escapeHtml(g.desc) + '</span>' +
        '</div>' +
        '<div class="gn-id-value-wrap">' +
          '<div class="gn-id-value" data-key="' + g.key + '" title="点击复制"></div>' +
          '<button class="gn-id-gen-btn" data-key="' + g.key + '" type="button">生成</button>' +
        '</div>' +
        '</div>';
    });
    els.idList.innerHTML = html;
  }

  function generateId(key) {
    var g = ID_GENERATORS.filter(function (x) { return x.key === key; })[0];
    if (!g) return;
    var value = g.gen();
    var target = els.idList.querySelector('.gn-id-value[data-key="' + key + '"]');
    if (target) target.textContent = value;
    addHistory('id', g.label, value);
    return value;
  }

  /* ================= Mock 数据 ================= */
  var MOCK_DATA = {
    name: {
      label: '姓名',
      categories: ['cn'],
      gen: function () {
        var surnames = ['赵','钱','孙','李','周','吴','郑','王','冯','陈','褚','卫','蒋','沈','韩','杨','朱','秦','许','何','吕','施','张','孔','曹','严','华','金','魏','陶','姜','戚','谢','邹','喻','柏','水','窦','章','云','苏','潘','葛','奚','范','彭','郎','鲁','韦','昌','马','苗','凤','花','方','俞','任','袁','柳','鲍','史','唐','费','廉','岑','薛','雷','贺','倪','汤','滕','殷','罗','毕','郝','邬','安','常','乐','于','时','傅','皮','卞','齐','康','伍','余','元','卜','顾','孟','平','黄','和','穆','萧','尹','欧阳','司马','诸葛','上官','东方','独孤','慕容','长孙'];
        var maleNames = ['伟','强','军','洋','勇','杰','涛','明','超','刚','平','辉','健','斌','龙','飞','鹏','磊','峰','帅','浩','杰','浩','涛','伟','康','乐','凡','晨','轩','泽','宇','睿','昊','子轩','浩然','子轩','泽宇','明轩','子涵','鹏飞','俊杰','志强','建国','建华','德胜','文博'];
        var femaleNames = ['芳','娜','敏','静','秀英','艳','娟','霞','秀兰','丽','燕','敏','丽','兰','凤','洁','芳','梅','琳','娜','婷','艳','秀英','秀兰','雅静','雅琪','思婷','雨欣','欣怡','梓涵','紫萱','诗涵','语嫣','诗琪','悦','静怡','雅涵','雨萱','梦琪','雪欣'];
        var gender = randomInt(2) === 0 ? 'male' : 'female';
        var surname = pick(surnames);
        var name = gender === 'male' ? pick(maleNames) : pick(femaleNames);
        return surname + name;
      }
    },
    phone: {
      label: '手机号',
      categories: ['cn'],
      gen: function () {
        // 真实中国手机号段
        var prefixes = [
          '130','131','132','133','134','135','136','137','138','139',
          '145','147','149','150','151','152','153','155','156','157','158','159',
          '166','170','171','172','173','175','176','177','178',
          '180','181','182','183','184','185','186','187','188','189',
          '191','198','199'
        ];
        return pick(prefixes) + String(randomIntRange(10000000, 99999999));
      }
    },
    email: {
      label: '邮箱',
      categories: ['cn'],
      gen: function () {
        var localParts = ['user', 'admin', 'test', 'info', 'contact', 'hello', 'me', 'mail', 'dev', 'support', 'john', 'mary', 'alex', 'emma'];
        var domains = ['gmail.com', 'qq.com', '163.com', '126.com', 'outlook.com', 'yahoo.com', 'foxmail.com', 'sina.com', 'sohu.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
        var local = pick(localParts) + (randomInt(2) === 0 ? '' : String(randomIntRange(1, 9999)));
        if (randomInt(2) === 0) local += '.' + pick(['dev', 'mail', 'pro', 'a', 'b', 'c']);
        return local + '@' + pick(domains);
      }
    },
    mac: {
      label: 'MAC 地址',
      categories: ['network'],
      gen: function () {
        var out = [];
        for (var i = 0; i < 6; i++) out.push(randomInt(256).toString(16).padStart(2, '0').toUpperCase());
        return out.join(':');
      }
    },
    ipv4: {
      label: 'IPv4',
      categories: ['network'],
      gen: function () {
        var a = randomIntRange(1, 223);
        if (a === 127) a = 128;
        if (a === 10 || a === 172 || a === 192) {
          // 允许保留地址，用于测试
        }
        return a + '.' + randomInt(256) + '.' + randomInt(256) + '.' + randomIntRange(1, 254);
      }
    },
    ipv6: {
      label: 'IPv6',
      categories: ['network'],
      gen: function () {
        var groups = [];
        for (var i = 0; i < 8; i++) {
          groups.push(randomInt(65536).toString(16));
        }
        return groups.join(':');
      }
    },
    url: {
      label: 'URL',
      categories: ['network'],
      gen: function () {
        var protocols = ['https://', 'http://'];
        var domains = ['example.com', 'test.org', 'demo.net', 'site.io', 'api.dev', 'app.co'];
        var paths = ['/api/users', '/docs/getting-started', '/products/123', '/blog/post/hello', '/search?q=test', '/images/logo.png'];
        return pick(protocols) + pick(domains) + pick(paths);
      }
    },
    username: {
      label: '用户名',
      categories: ['cn'],
      gen: function () {
        var bases = ['user', 'admin', 'test', 'dev', 'coder', 'hacker', 'master', 'king', 'pro', 'tech', 'geek', 'ninja'];
        return pick(bases) + (randomInt(2) === 0 ? '_' + String(randomIntRange(1, 999)) : String(randomIntRange(1, 9999)));
      }
    },
    company: {
      label: '公司名',
      categories: ['cn'],
      gen: function () {
        var cities = ['北京', '上海', '深圳', '广州', '杭州', '成都', '南京', '武汉', '西安', '苏州'];
        var fields = ['科技', '网络', '信息', '数据', '智能', '云计算', '软件', '电子', '互联网', '传媒'];
        var suffixes = ['有限公司', '股份有限公司', '科技有限公司', '网络有限公司', '信息技术有限公司'];
        return pick(cities) + pick(fields) + pick(suffixes);
      }
    },
    address: {
      label: '地址',
      categories: ['cn'],
      gen: function () {
        var provinces = ['北京市', '上海市', '广东省', '江苏省', '浙江省', '山东省', '河南省', '四川省', '湖北省', '福建省'];
        var cities = ['朝阳区', '海淀区', '浦东新区', '天河区', '西湖区', '鼓楼区', '历下区', '锦江区', '江汉区', '鼓浪屿区'];
        var streets = ['中山路', '人民路', '解放路', '建设路', '和平路', '新华路', '长江路', '黄河路', '文化路', '学府路'];
        return pick(provinces) + pick(cities) + pick(streets) + String(randomIntRange(1, 999)) + '号';
      }
    },
    idcard: {
      label: '身份证',
      categories: ['cn'],
      gen: function () {
        // 18 位：6 区号 + 8 生日 + 3 顺序 + 1 校验
        var regions = ['110101', '310101', '440106', '440304', '330106', '320102', '370102', '510107', '420102', '350203', '110105', '310115'];
        var region = pick(regions);
        var year = randomIntRange(1960, 2005);
        var month = String(randomIntRange(1, 12)).padStart(2, '0');
        var day = String(randomIntRange(1, 28)).padStart(2, '0');
        var seq = String(randomIntRange(1, 999)).padStart(3, '0');
        var base = region + year + month + day + seq;
        // 校验位
        var weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        var checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
        var sum = 0;
        for (var i = 0; i < 17; i++) sum += parseInt(base[i], 10) * weights[i];
        return base + checkCodes[sum % 11];
      }
    },
    bankcard: {
      label: '银行卡号',
      categories: ['cn'],
      gen: function () {
        // 生成 16 位或 19 位，Luhn 校验
        var prefix = pick(['622202', '622848', '622700', '622262', '621226', '621700', '622588', '622909']);
        var len = randomInt(2) === 0 ? 16 : 19;
        var body = prefix;
        while (body.length < len - 1) body += randomInt(10);
        // Luhn 校验位
        var sum = 0;
        var idx = 0;
        for (var i = body.length - 1; i >= 0; i--) {
          var d = parseInt(body[i], 10);
          if (idx % 2 === 0) {
            d *= 2;
            if (d > 9) d -= 9;
          }
          sum += d;
          idx++;
        }
        var checkDigit = (10 - (sum % 10)) % 10;
        return body + checkDigit;
      }
    },
    date: {
      label: '日期时间',
      categories: ['misc'],
      gen: function () {
        var ts = Date.now() + randomIntRange(-365 * 86400, 365 * 86400) * 1000;
        var d = new Date(ts);
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
          ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      }
    },
    uuid: {
      label: 'UUID',
      categories: ['misc'],
      gen: uuidv4
    }
  };

  var MOCK_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'cn', label: '🇨🇳 中国' },
    { key: 'network', label: '🌐 网络' },
    { key: 'misc', label: '🔧 其他' }
  ];

  function renderMockFilters() {
    var html = '';
    MOCK_FILTERS.forEach(function (f) {
      html += '<button class="gn-mock-filter' + (f.key === state.mockFilter ? ' active' : '') + '" data-filter="' + f.key + '" type="button">' +
        escapeHtml(f.label) + '</button>';
    });
    els.mockFilters.innerHTML = html;
  }

  function renderMockList() {
    var keys = Object.keys(MOCK_DATA);
    if (state.mockFilter !== 'all') {
      keys = keys.filter(function (k) {
        return MOCK_DATA[k].categories.indexOf(state.mockFilter) >= 0;
      });
    }
    var html = '';
    keys.forEach(function (key) {
      var item = MOCK_DATA[key];
      html += '<div class="gn-mock-item">' +
        '<span class="gn-mock-label">' + escapeHtml(item.label) + '</span>' +
        '<span class="gn-mock-value" data-key="' + key + '"></span>' +
        '<button class="gn-mock-gen" data-key="' + key + '" type="button" title="重新生成">🎲</button>' +
        '</div>';
    });
    els.mockList.innerHTML = html;

    // 立即为每个生成一个值
    keys.forEach(function (key) {
      generateMock(key, true);
    });
  }

  function generateMock(key, silent) {
    var item = MOCK_DATA[key];
    if (!item) return;
    var value = item.gen();
    var target = els.mockList.querySelector('.gn-mock-value[data-key="' + key + '"]');
    if (target) target.textContent = value;
    if (!silent) {
      addHistory('mock', item.label, value);
    }
    return value;
  }

  /* ================= 密码生成 ================= */
  var CHARSETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    num: '0123456789',
    sym: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  var AMBIGUOUS = 'O0oIl1|`\'"';
  var SIMILAR_SYMBOLS = '`\'"|';

  function buildCharset() {
    var charset = '';
    var excluded = els.pwdExclude.value || '';

    if (els.pwdUpper.checked) charset += CHARSETS.upper;
    if (els.pwdLower.checked) charset += CHARSETS.lower;
    if (els.pwdNum.checked) charset += CHARSETS.num;
    if (els.pwdSym.checked) charset += CHARSETS.sym;

    var filterChars = '';
    if (els.pwdNoAmbiguous.checked) filterChars += AMBIGUOUS;
    if (els.pwdNoSimilar.checked) filterChars += SIMILAR_SYMBOLS;
    filterChars += excluded;

    if (filterChars) {
      var filtered = '';
      for (var i = 0; i < charset.length; i++) {
        if (filterChars.indexOf(charset[i]) === -1) filtered += charset[i];
      }
      charset = filtered;
    }

    return charset;
  }

  function generatePassword() {
    var len = parseInt(els.pwdLen.value, 10) || 16;
    var charset = buildCharset();
    if (!charset) {
      showToast('❌ 请至少选择一种字符类型');
      return null;
    }

    var required = [];
    if (els.pwdRequireAll.checked) {
      var types = [];
      if (els.pwdUpper.checked) types.push(CHARSETS.upper);
      if (els.pwdLower.checked) types.push(CHARSETS.lower);
      if (els.pwdNum.checked) types.push(CHARSETS.num);
      if (els.pwdSym.checked) types.push(CHARSETS.sym);

      types.forEach(function (type) {
        // 从每个类型中筛选出可用字符
        var avail = '';
        for (var i = 0; i < type.length; i++) {
          if (charset.indexOf(type[i]) >= 0) avail += type[i];
        }
        if (avail.length > 0) {
          required.push(avail[randomInt(avail.length)]);
        }
      });
    }

    var remaining = len - required.length;
    if (remaining < 0) {
      showToast('❌ 长度不足以包含每种类型至少 1 个');
      return null;
    }

    var chars = required.slice();
    for (var i = 0; i < remaining; i++) {
      chars.push(charset[randomInt(charset.length)]);
    }

    return shuffle(chars).join('');
  }

  function calcEntropy(pwd, charsetSize) {
    if (!pwd) return 0;
    return pwd.length * Math.log2(charsetSize || 1);
  }

  function getStrengthInfo(entropyBits) {
    if (entropyBits >= 100) return { text: '极强', color: '#2e7d32', pct: 100 };
    if (entropyBits >= 80) return { text: '非常强', color: '#4caf50', pct: 88 };
    if (entropyBits >= 60) return { text: '强', color: '#7ba05b', pct: 72 };
    if (entropyBits >= 40) return { text: '中等', color: '#f1c40f', pct: 50 };
    if (entropyBits >= 25) return { text: '较弱', color: '#e67e22', pct: 32 };
    return { text: '弱', color: '#a8452a', pct: 16 };
  }

  function renderPwdCards(passwords) {
    var charset = buildCharset();
    var charsetSize = charset.length;
    var html = '';
    passwords.forEach(function (pwd, i) {
      var entropy = calcEntropy(pwd, charsetSize);
      var info = getStrengthInfo(entropy);
      html += '<div class="gn-pwd-card" data-pwd="' + escapeHtml(pwd) + '">' +
        '<div class="gn-pwd-value-row">' +
          '<div class="gn-pwd-value" data-pwd-copy="' + escapeHtml(pwd) + '">' + escapeHtml(pwd) + '</div>' +
          '<button class="gn-pwd-copy" data-copy="' + escapeHtml(pwd) + '" type="button">📋 复制</button>' +
        '</div>' +
        '<div class="gn-strength-row">' +
          '<div class="gn-strength-bar-wrap">' +
            '<div class="gn-strength-bar" style="width:' + info.pct + '%;background:' + info.color + ';"></div>' +
          '</div>' +
          '<span class="gn-strength-text" style="color:' + info.color + ';">' +
            info.text + ' · ' + entropy.toFixed(1) + ' bits' +
          '</span>' +
        '</div>' +
        '</div>';
    });
    els.pwdOutputs.innerHTML = html;

    // 记录历史
    passwords.forEach(function (p) {
      addHistory('password', '密码', p);
    });
  }

  function doGeneratePasswords() {
    var count = state.pwdBatch;
    var results = [];
    for (var i = 0; i < count; i++) {
      var pwd = generatePassword();
      if (pwd) results.push(pwd);
    }
    if (results.length > 0) {
      renderPwdCards(results);
      showToast('✅ 已生成 ' + results.length + ' 个密码');
    }
  }

  /* ================= Diceware 短语 ================= */
  // 1200+ 常用英文单词（4-7 字母，便于记忆）
  var DICEWARE_WORDS = (
    'able acid acorn acre act actor adapt adopt adult after again age agree ahead aim air alarm album alert alien align alive allow alone alpha altar amber amount ample anchor angel anger angle angry animal ankle answer ant antenna any apart apple april arch arctic area arena argue arise armor army around arrow artist ash aspect asset atlas atom attic aunt author autumn avoid awake award aware axis away baby back bacon badge bad bag bake balance ball bamboo banana band bank banner bar bare barn barrel base basic basket bat batch bath battle bay beach bean bear beard beat beauty beaver bed bee beef beer begin bell belly belt bench bend berry best bet better beyond bicycle bid big bike bill bind bird birth biscuit bit bite bitter black blade blame blanket blast blaze bleach blend bless blind blink block bloom blow blue blur blush board boat body boil bold bolt bomb bone book boost boot border born boss both bottle bottom bounce bow bowl box boy brain brake branch brand brass brave bread break breeze brick bridge brief bright bring brisk broad broken bronze brook broom brother brown brush bubble bucket bud buffalo build bulb bulk bullet bundle bunker burden burger burst bus bush business busy butter button buyer buzz cabbage cabin cable cactus cage cake calf call calm camel camera camp canal candle candy cannon canoe canvas canyon capable capital captain car carbon card care cargo carpet carry cart case cash castle casual cat catalog catch cause cave cedar ceiling celery cement census cereal certain chain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chess chest chicken chief child chill chimney chip choice choose chop chorus chose chunk cider cigar cinema circle circus citizen city civil claim clap class claw clay clean clear clerk clever click client cliff climb clinic clip clock close cloth cloud clover club clue coach coal coast coat code coffee coil coin cold collar collect colony color column comb combat come comet comfort comic common company compass concert concrete conduct cone confer connect consider console copper copy coral core corn correct cost cotton couch cough could council count country couple courage course court cousin cover coyote crack craft crane crash crate crawl crazy cream create credit creek crew cricket crime crisp critic crop cross crowd crown cruise crumble crunch crush crystal cube culture cup curious current curtain curve custom cycle daily dairy daisy dance danger dare dark dash data date dawn day deal debate debris decade decide deck declare decor deer defend define degree delay deliver demand denial dentist deny depart depend deposit depth deputy derive desert design desk despair detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover dish dismiss display distance divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drive drop drum dry duck dumb dune during dust duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder elect elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye fabric face fact factor fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon idea identify idle ignore ill illegal image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thing this thought three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo'
  ).split(' ');

  // 去除空项和重复项
  DICEWARE_WORDS = Array.from(new Set(DICEWARE_WORDS.filter(function (w) { return w && w.length > 0; })));

  function generatePhrase() {
    var count = parseInt(els.phraseWords.value, 10) || 4;
    var sep = els.phraseSep.value;
    var words = [];
    for (var i = 0; i < count; i++) {
      var word = pick(DICEWARE_WORDS);
      if (els.phraseCap.checked) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      words.push(word);
    }
    var phrase = words.join(sep);

    if (els.phraseNumber.checked) {
      phrase += sep + randomIntRange(0, 99);
    }
    if (els.phraseSymbol.checked) {
      phrase += pick(['!', '@', '#', '$', '%', '&', '*', '?']);
    }

    // 计算熵值
    var entropy = count * Math.log2(DICEWARE_WORDS.length);
    if (els.phraseNumber.checked) entropy += Math.log2(100);
    if (els.phraseSymbol.checked) entropy += Math.log2(8);

    return { phrase: phrase, entropy: entropy, wordCount: count };
  }

  function renderPhraseCard(info) {
    var strength = getStrengthInfo(info.entropy);
    var html = '<div class="gn-pwd-card">' +
      '<div class="gn-pwd-value-row">' +
        '<div class="gn-pwd-value" data-pwd-copy="' + escapeHtml(info.phrase) + '" style="font-family:var(--gn-mono);">' + escapeHtml(info.phrase) + '</div>' +
        '<button class="gn-pwd-copy" data-copy="' + escapeHtml(info.phrase) + '" type="button">📋 复制</button>' +
      '</div>' +
      '<div class="gn-strength-row">' +
        '<div class="gn-strength-bar-wrap">' +
          '<div class="gn-strength-bar" style="width:' + strength.pct + '%;background:' + strength.color + ';"></div>' +
        '</div>' +
        '<span class="gn-strength-text" style="color:' + strength.color + ';">' +
          strength.text + ' · ' + info.entropy.toFixed(1) + ' bits · ' + info.wordCount + ' 词' +
        '</span>' +
      '</div>' +
      '</div>';
    els.phraseOutputs.innerHTML = html;
    addHistory('phrase', '短语', info.phrase);
  }

  function doGeneratePhrase() {
    var info = generatePhrase();
    renderPhraseCard(info);
    showToast('✅ 已生成 ' + info.wordCount + ' 词短语');
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
  function addHistory(type, label, value) {
    if (!value) return;
    state.history = state.history.filter(function (h) {
      return !(h.type === type && h.value === value);
    });
    state.history.unshift({
      type: type,
      label: label,
      value: value,
      ts: Date.now()
    });
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    saveHistory();
    updateHistoryCount();
  }
  function renderDrawer() {
    if (state.history.length === 0) {
      els.drawerList.innerHTML = '<p class="gn-drawer-empty">暂无记录</p>';
      return;
    }
    var html = '';
    state.history.forEach(function (h, i) {
      var d = new Date(h.ts);
      var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      html += '<div class="gn-drawer-item" data-idx="' + i + '">' +
        '<div class="gn-drawer-item-type">' +
          '<span>' + escapeHtml(h.label) + '</span>' +
          '<span>' + time + '</span>' +
        '</div>' +
        '<div class="gn-drawer-item-value">' + escapeHtml(h.value) + '</div>' +
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
    // ID 列表
    els.idList.addEventListener('click', function (e) {
      var genBtn = e.target.closest('.gn-id-gen-btn');
      if (genBtn) {
        e.preventDefault();
        generateId(genBtn.dataset.key);
        return;
      }
      var val = e.target.closest('.gn-id-value');
      if (val && val.textContent) {
        copyText(val.textContent);
      }
    });

    // Mock 筛选
    els.mockFilters.addEventListener('click', function (e) {
      var btn = e.target.closest('.gn-mock-filter');
      if (!btn) return;
      state.mockFilter = btn.dataset.filter;
      renderMockFilters();
      renderMockList();
    });

    // Mock 列表
    els.mockList.addEventListener('click', function (e) {
      var genBtn = e.target.closest('.gn-mock-gen');
      if (genBtn) {
        e.preventDefault();
        generateMock(genBtn.dataset.key, false);
        return;
      }
      var val = e.target.closest('.gn-mock-value');
      if (val && val.textContent) {
        copyText(val.textContent);
      }
    });

    // 密码长度
    els.pwdLen.addEventListener('input', function () {
      els.pwdLenVal.textContent = this.value;
    });

    // 批量生成
    els.pwdBatchSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-count]');
      if (!btn) return;
      Array.prototype.forEach.call(els.pwdBatchSeg.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.pwdBatch = parseInt(btn.dataset.count, 10) || 1;
    });

    // 生成密码
    els.btnGenPwd.addEventListener('click', doGeneratePasswords);

    // 密码复制
    els.pwdOutputs.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.dataset.copy);
        return;
      }
      var pwdVal = e.target.closest('.gn-pwd-value');
      if (pwdVal && pwdVal.dataset.pwdCopy) {
        copyText(pwdVal.dataset.pwdCopy);
      }
    });

    // 生成短语
    els.btnGenPhrase.addEventListener('click', doGeneratePhrase);

    // 短语复制
    els.phraseOutputs.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.dataset.copy);
        return;
      }
      var pwdVal = e.target.closest('.gn-pwd-value');
      if (pwdVal && pwdVal.dataset.pwdCopy) {
        copyText(pwdVal.dataset.pwdCopy);
      }
    });

    // 主题
    els.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
      applyTheme();
    });

    // 历史
    els.btnHistory.addEventListener('click', openDrawer);
    els.drawerClose.addEventListener('click', closeDrawer);
    els.drawerBackdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.drawer.classList.contains('open')) closeDrawer();
    });

    els.drawerList.addEventListener('click', function (e) {
      var item = e.target.closest('.gn-drawer-item');
      if (!item) return;
      var idx = parseInt(item.dataset.idx, 10);
      var h = state.history[idx];
      if (!h) return;
      copyText(h.value);
    });

    els.clearHistory.addEventListener('click', function () {
      if (!confirm('清空全部历史记录？')) return;
      state.history = [];
      saveHistory();
      updateHistoryCount();
      renderDrawer();
      showToast('🗑 已清空历史');
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheEls();
    loadTheme();
    loadHistory();
    bindEvents();

    renderIdList();
    renderMockFilters();
    renderMockList();

    // 首次自动生成密码和短语
    doGeneratePasswords();
    doGeneratePhrase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();