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

  document.getElementById('btn-gen-uuid').addEventListener('click', function () {
    document.getElementById('out-uuid').value = uuidv4();
  });
  document.getElementById('btn-gen-nano').addEventListener('click', function () {
    document.getElementById('out-nano').value = nanoid(21);
  });
  document.getElementById('btn-gen-mac').addEventListener('click', function () {
    var mac = [];
    for (var i = 0; i < 6; i++) mac.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
    document.getElementById('out-mac').value = mac.join(':');
  });
  document.getElementById('btn-gen-ip').addEventListener('click', function () {
    var ip = [];
    for (var i = 0; i < 4; i++) ip.push(Math.floor(Math.random() * (i === 0 ? 255 : 256)) + (i === 0 ? 1 : 0));
    document.getElementById('out-ip').value = ip.join('.');
  });

  // ================= 2. 密码生成与强度 =================
  var pwdLen = document.getElementById('pwd-len');
  var pwdLenVal = document.getElementById('pwd-len-val');
  var outPwd = document.getElementById('out-pwd');
  var pwdBar = document.getElementById('pwd-bar');
  var pwdStrengthText = document.getElementById('pwd-strength-text');

  pwdLen.addEventListener('input', function () {
    pwdLenVal.textContent = this.value;
  });

  function checkStrength(pwd) {
    var strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  }

  function renderStrength(pwd) {
    var score = checkStrength(pwd); // 0-5
    var percent = (score / 5) * 100;
    var color = '#a8452a';
    var text = '非常弱';
    
    if (score >= 4) { color = '#7ba05b'; text = '非常强'; }
    else if (score === 3) { color = '#f1c40f'; text = '中等'; }
    else if (score === 2) { color = '#e67e22'; text = '较弱'; }

    pwdBar.style.width = percent + '%';
    pwdBar.style.background = color;
    pwdStrengthText.textContent = '密码强度：' + text;
    pwdStrengthText.style.color = color;
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
    for (var i = 0; i < len; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }

    outPwd.value = pwd;
    renderStrength(pwd);
  });

  // 初始化一个密码
  document.getElementById('btn-gen-pwd').click();
})();