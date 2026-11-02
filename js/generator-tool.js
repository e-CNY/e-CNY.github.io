(function () {
  // ================= 1. ID 生成 =================
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  function nanoid(size) {
    var urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
    var id = '', i = size;
    while (i--) id += urlAlphabet[(Math.random() * 64) | 0];
    return id;
  }

  function generateULID() {
    var time = Date.now().toString(32).toUpperCase().padStart(10, '0');
    var random = '';
    for (var i = 0; i < 16; i++) random += Math.floor(Math.random() * 32).toString(32).toUpperCase();
    return time + random;
  }

  function generateSnowflake() {
    var epoch = 1609459200000n; // 2021-01-01
    var timestamp = BigInt(Date.now()) - epoch;
    var workerId = BigInt(Math.floor(Math.random() * 32)); // 模拟机器码
    var sequence = BigInt(Math.floor(Math.random() * 4096)); // 模拟序列号
    
    var id = (timestamp << 22n) | (workerId << 17n) | sequence;
    return id.toString();
  }

  document.getElementById('btn-gen-uuid').addEventListener('click', function () {
    document.getElementById('out-uuid').value = uuidv4();
  });
  document.getElementById('btn-gen-nano').addEventListener('click', function () {
    document.getElementById('out-nano').value = nanoid(21);
  });
  document.getElementById('btn-gen-ulid').addEventListener('click', function () {
    document.getElementById('out-ulid').value = generateULID();
  });
  document.getElementById('btn-gen-snowflake').addEventListener('click', function () {
    document.getElementById('out-snowflake').value = generateSnowflake();
  });

  // ================= 2. 随机 Mock 数据 =================
  var surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨'];
  var names = ['伟', '芳', '娜', '敏', '静', '秀英', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平'];
  var domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'yahoo.com', 'foxmail.com'];

  function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  document.getElementById('btn-gen-name').addEventListener('click', function () {
    document.getElementById('out-name').value = getRandom(surnames) + getRandom(names);
  });
  document.getElementById('btn-gen-phone').addEventListener('click', function () {
    document.getElementById('out-phone').value = '1' + getRandom(['3','5','7','8','9']) + String(getRandomInt(100000000, 999999999));
  });
  document.getElementById('btn-gen-email').addEventListener('click', function () {
    document.getElementById('out-email').value = 'user_' + getRandomInt(10000, 99999) + '@' + getRandom(domains);
  });
  document.getElementById('btn-gen-mac').addEventListener('click', function () {
    var mac = [];
    for (var i = 0; i < 6; i++) mac.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
    document.getElementById('out-mac').value = mac.join(':');
  });

  // ================= 3. 密码与短语 =================
  var pwdLen = document.getElementById('pwd-len');
  var pwdLenVal = document.getElementById('pwd-len-val');
  var outPwd = document.getElementById('out-pwd');
  var pwdBar = document.getElementById('pwd-bar');
  var pwdStrengthText = document.getElementById('pwd-strength-text');

  pwdLen.addEventListener('input', function () { pwdLenVal.textContent = this.value; });

  function checkStrength(pwd) {
    var strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  }

  document.getElementById('btn-gen-pwd').addEventListener('click', function () {
    var len = parseInt(pwdLen.value, 10);
    var useUpper = document.getElementById('pwd-upper').checked;
    var useLower = document.getElementById('pwd-lower').checked;
    var useNum = document.getElementById('pwd-num').checked;
    var useSym = document.getElementById('pwd-sym').checked;

    var chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNum) chars += '0123456789';
    if (useSym) chars += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    if (!chars) return alert('请至少选择一种字符类型');

    var pwd = '';
    for (var i = 0; i < len; i++) pwd += chars[Math.floor(Math.random() * chars.length)];

    outPwd.value = pwd;

    // 渲染强度
    var score = checkStrength(pwd);
    var percent = (score / 5) * 100;
    var color = '#a8452a', text = '非常弱';
    if (score >= 4) { color = '#7ba05b'; text = '非常强'; }
    else if (score === 3) { color = '#f1c40f'; text = '中等'; }
    else if (score === 2) { color = '#e67e22'; text = '较弱'; }

    pwdBar.style.width = percent + '%';
    pwdBar.style.background = color;
    pwdStrengthText.textContent = '密码强度：' + text;
    pwdStrengthText.style.color = color;
  });

  // 密码短语词库 (极简演示，真实 Diceware 有 7776 个词)
  var phraseWords = [
    "apple", "brave", "crane", "drift", "eagle", "flame", "ghost", "heart", "island", "jelly",
    "kite", "lemon", "mango", "night", "ocean", "piano", "queen", "river", "stone", "tiger",
    "unity", "voice", "water", "xenon", "yacht", "zebra", "amber", "bison", "cloud", "drake",
    "frost", "glide", "hover", "ivory", "jewel", "knock", "lunar", "mocha", "noble", "opera",
    "pearl", "quest", "roast", "solar", "toast", "urban", "vivid", "waltz", "yield", "zonal"
  ];

  document.getElementById('btn-gen-phrase').addEventListener('click', function () {
    var count = parseInt(document.getElementById('passphrase-words').value, 10);
    var sep = document.getElementById('passphrase-sep').value;
    var phrase = [];
    for (var i = 0; i < count; i++) {
      phrase.push(getRandom(phraseWords));
    }
    document.getElementById('out-phrase').value = phrase.join(sep);
  });

  // 初始化
  document.getElementById('btn-gen-pwd').click();
  document.getElementById('btn-gen-phrase').click();
})();