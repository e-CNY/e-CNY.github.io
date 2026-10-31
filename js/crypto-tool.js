(function () {
  // ================= Tab 切换 =================
  var tabs = document.querySelectorAll('.ct-tab');
  var panels = document.querySelectorAll('.ct-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. 哈希计算 =================
  document.getElementById('btn-hash').addEventListener('click', function () {
    var str = document.getElementById('hash-input').value;
    var algo = document.getElementById('hash-algo').value;
    if (!str) return;
    document.getElementById('hash-output').value = CryptoJS[algo](str).toString();
  });

  // ================= 2. 对称加密 =================
  var symAlgo = document.getElementById('sym-algo');
  var symMode = document.getElementById('sym-mode');
  var symKey = document.getElementById('sym-key');
  var symIv = document.getElementById('sym-iv');
  var symInput = document.getElementById('sym-input');
  var symOutput = document.getElementById('sym-output');
  var rowIv = document.getElementById('row-iv');

  symMode.addEventListener('change', function () {
    rowIv.style.display = this.value === 'ECB' ? 'none' : 'flex';
  });

  function getSymOptions() {
    var mode = symMode.value === 'CBC' ? CryptoJS.mode.CBC : CryptoJS.mode.ECB;
    var options = { mode: mode, padding: CryptoJS.pad.Pkcs7 };
    if (symMode.value === 'CBC') options.iv = CryptoJS.enc.Utf8.parse(symIv.value);
    return options;
  }

  document.getElementById('btn-sym-encrypt').addEventListener('click', function () {
    var text = symInput.value;
    if (!text) return;
    try {
      var key = CryptoJS.enc.Utf8.parse(symKey.value);
      symOutput.value = CryptoJS[symAlgo.value].encrypt(text, key, getSymOptions()).toString();
    } catch (e) { symOutput.value = '加密失败: ' + e.message; }
  });

  document.getElementById('btn-sym-decrypt').addEventListener('click', function () {
    var text = symInput.value;
    if (!text) return;
    try {
      var key = CryptoJS.enc.Utf8.parse(symKey.value);
      symOutput.value = CryptoJS[symAlgo.value].decrypt(text, key, getSymOptions()).toString(CryptoJS.enc.Utf8);
    } catch (e) { symOutput.value = '解密失败'; }
  });

  // ================= 3. RSA 非对称 =================
  var rsaPub = document.getElementById('rsa-pub');
  var rsaPriv = document.getElementById('rsa-priv');
  var rsaText = document.getElementById('rsa-text');
  var rsaOut = document.getElementById('rsa-out');

  var innerTabs = document.querySelectorAll('.ct-inner-tab');
  var innerPanels = document.querySelectorAll('.ct-inner-panel');
  innerTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      innerTabs.forEach(function(t) { t.classList.remove('active'); });
      innerPanels.forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  document.getElementById('btn-rsa-gen').addEventListener('click', function () {
    var bits = parseInt(document.getElementById('rsa-bits').value, 10);
    var loading = document.getElementById('rsa-loading');
    var btn = this;
    btn.disabled = true; loading.style.display = 'inline';
    setTimeout(function () {
      forge.pki.rsa.generateKeyPair({ bits: bits, workers: -1 }, function (err, keypair) {
        if (!err) {
          rsaPub.value = forge.pki.publicKeyToPem(keypair.publicKey);
          rsaPriv.value = forge.pki.privateKeyToPem(keypair.privateKey);
        }
        btn.disabled = false; loading.style.display = 'none';
      });
    }, 50);
  });

  document.getElementById('btn-rsa-encrypt').addEventListener('click', function () {
    var text = rsaText.value;
    if (!text || !rsaPub.value) return alert('请提供明文和公钥');
    try {
      var publicKey = forge.pki.publicKeyFromPem(rsaPub.value);
      var maxLength = (publicKey.n.bitLength() + 7) >> 3;
      var encryptLength = maxLength - 11;
      var chunks = [];
      for (var i = 0; i < text.length; i += encryptLength) chunks.push(text.substring(i, i + encryptLength));
      rsaOut.value = forge.util.encode64(chunks.map(function(chunk) { return publicKey.encrypt(chunk, 'RSAES-PKCS1-V1_5'); }).join(''));
    } catch (e) { rsaOut.value = '加密失败: ' + e.message; }
  });

  document.getElementById('btn-rsa-decrypt').addEventListener('click', function () {
    var text = rsaText.value;
    if (!text || !rsaPriv.value) return alert('请提供密文和私钥');
    try {
      var privateKey = forge.pki.privateKeyFromPem(rsaPriv.value);
      var maxLength = (privateKey.n.bitLength() + 7) >> 3;
      var decoded = forge.util.decode64(text);
      var decrypted = [];
      for (var i = 0; i < decoded.length; i += maxLength) decrypted.push(privateKey.decrypt(decoded.substring(i, i + maxLength), 'RSAES-PKCS1-V1_5'));
      rsaOut.value = decrypted.join('');
    } catch (e) { rsaOut.value = '解密失败: ' + e.message; }
  });

  var rsaSignText = document.getElementById('rsa-sign-text');
  var rsaSignOut = document.getElementById('rsa-sign-out');

  document.getElementById('btn-rsa-sign').addEventListener('click', function () {
    if (!rsaSignText.value || !rsaPriv.value) return alert('请提供明文和私钥');
    try {
      var privateKey = forge.pki.privateKeyFromPem(rsaPriv.value);
      var md = forge.md.sha256.create(); md.update(rsaSignText.value, 'utf8');
      rsaSignOut.value = forge.util.encode64(privateKey.sign(md));
    } catch (e) { rsaSignOut.value = '签名失败: ' + e.message; }
  });

  document.getElementById('btn-rsa-verify').addEventListener('click', function () {
    if (!rsaSignText.value || !rsaSignOut.value || !rsaPub.value) return alert('请提供明文、签名和公钥');
    try {
      var publicKey = forge.pki.publicKeyFromPem(rsaPub.value);
      var md = forge.md.sha256.create(); md.update(rsaSignText.value, 'utf8');
      var isValid = publicKey.verify(md.digest().bytes(), forge.util.decode64(rsaSignOut.value));
      alert(isValid ? '✅ 验签通过！' : '❌ 验签失败！');
    } catch (e) { alert('验签错误: ' + e.message); }
  });

  // ================= 4. JWT 解析 =================
  document.getElementById('btn-jwt-parse').addEventListener('click', function () {
    var token = document.getElementById('jwt-input').value.trim();
    var secret = document.getElementById('jwt-secret').value;
    if (!token) return;
    var parts = token.split('.');
    if (parts.length < 2) return alert('无效的 JWT 格式');
    try {
      var header = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[0])));
      var payload = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[1])));
      document.getElementById('jwt-header').textContent = JSON.stringify(header, null, 2);
      document.getElementById('jwt-payload').textContent = JSON.stringify(payload, null, 2);
      if (secret && parts.length === 3 && header.alg === 'HS256') {
        var expectedSig = CryptoJS.HmacSHA256(parts[0] + '.' + parts[1], secret).toString(CryptoJS.enc.Base64url);
        document.getElementById('jwt-payload').textContent += expectedSig === parts[2] ? '\n\n/* ✅ 签名验证通过 */' : '\n\n/* ❌ 签名验证失败 */';
      }
    } catch (e) { alert('解析失败'); }
  });

  // ================= 5. 编码转换 =================
  var encodeInput = document.getElementById('encode-input');
  var encodeOutput = document.getElementById('encode-output');
  var encodeType = document.getElementById('encode-type');

  // Base32 实现
  function base32Encode(str) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = '', bits = 0, value = 0;
    for (var i = 0; i < str.length; i++) {
      value = (value << 8) | str.charCodeAt(i); bits += 8;
      while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
    while (out.length % 8 !== 0) out += '=';
    return out;
  }
  function base32Decode(str) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', len = str.length, bits = 0, value = 0, out = '';
    str = str.replace(/=+$/, '').toUpperCase();
    for (var i = 0; i < str.length; i++) {
      value = (value << 5) | alphabet.indexOf(str[i]); bits += 5;
      if (bits >= 8) { out += String.fromCharCode((value >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    return out;
  }
  // Base58 实现
  var b58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function base58Encode(str) {
    var bytes = [], hex = ''; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); bytes.push(c & 0xff); bytes.push((c >> 8) & 0xff); }
    var num = 0n; for (var b of bytes) { num = (num << 8n) | BigInt(b); }
    var out = ''; while (num > 0n) { var rem = num % 58n; out = b58[Number(rem)] + out; num = num / 58n; }
    for (var b of bytes) { if (b !== 0) break; out = '1' + out; }
    return out || '1';
  }
  function base58Decode(str) {
    var num = 0n; for (var c of str) { var idx = b58.indexOf(c); if (idx === -1) throw new Error('无效字符'); num = num * 58n + BigInt(idx); }
    var bytes = []; while (num > 0n) { bytes.unshift(Number(num & 0xffn)); num >>= 8n; }
    for (var c of str) { if (c !== '1') break; bytes.unshift(0); }
    var out = ''; for (var i = 0; i < bytes.length; i += 2) out += String.fromCharCode(bytes[i] | (bytes[i+1] << 8));
    return out;
  }

  document.getElementById('btn-encode').addEventListener('click', function () {
    var type = encodeType.value, text = encodeInput.value;
    try {
      if (type === 'base64') encodeOutput.value = btoa(unescape(encodeURIComponent(text)));
      else if (type === 'base32') encodeOutput.value = base32Encode(unescape(encodeURIComponent(text)));
      else if (type === 'base58') encodeOutput.value = base58Encode(unescape(encodeURIComponent(text)));
      else if (type === 'url') encodeOutput.value = encodeURIComponent(text);
      else if (type === 'html') encodeOutput.value = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      else if (type === 'unicode') encodeOutput.value = text.split('').map(function(c) { return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'); }).join('');
    } catch (e) { encodeOutput.value = '编码错误'; }
  });

  document.getElementById('btn-decode').addEventListener('click', function () {
    var type = encodeType.value, text = encodeInput.value;
    try {
      if (type === 'base64') encodeOutput.value = decodeURIComponent(escape(atob(text)));
      else if (type === 'base32') encodeOutput.value = decodeURIComponent(escape(base32Decode(text)));
      else if (type === 'base58') encodeOutput.value = decodeURIComponent(escape(base58Decode(text)));
      else if (type === 'url') encodeOutput.value = decodeURIComponent(text);
      else if (type === 'html') encodeOutput.value = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      else if (type === 'unicode') encodeOutput.value = text.replace(/\\u([0-9a-fA-F]{4})/g, function(match, p1) { return String.fromCharCode(parseInt(p1, 16)); });
    } catch (e) { encodeOutput.value = '解码错误'; }
  });

  // ================= 6. 古典密码 =================
  var classicType = document.getElementById('classic-type');
  var classicInput = document.getElementById('classic-input');
  var classicOutput = document.getElementById('classic-output');
  var caesarShiftWrap = document.getElementById('caesar-shift-wrap');
  var caesarShift = document.getElementById('caesar-shift');

  classicType.addEventListener('change', function () {
    caesarShiftWrap.style.display = this.value === 'caesar' ? 'inline-block' : 'none';
  });

  var morseMap = { 'A':'.-', 'B':'-...', 'C':'-.-.', 'D':'-..', 'E':'.', 'F':'..-.', 'G':'--.', 'H':'....', 'I':'..', 'J':'.---', 'K':'-.-', 'L':'.-..', 'M':'--', 'N':'-.', 'O':'---', 'P':'.--.', 'Q':'--.-', 'R':'.-.', 'S':'...', 'T':'-', 'U':'..-', 'V':'...-', 'W':'.--', 'X':'-..-', 'Y':'-.--', 'Z':'--..', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....', '6':'-....', '7':'--...', '8':'---..', '9':'----.', '0':'-----', '.':'.-.-.-', ',':'--..--', '?':'..--..', '/':'-..-.', '!':'-.-.--', ' ':'/' };
  var morseReverse = Object.fromEntries(Object.entries(morseMap).map(function(p) { return [p[1], p[0]]; }));

  document.getElementById('btn-classic-encode').addEventListener('click', function () {
    var text = classicInput.value, type = classicType.value;
    if (!text) return;
    try {
      if (type === 'morse') {
        classicOutput.value = text.toUpperCase().split('').map(function(c) { return morseMap[c] || c; }).join(' ');
      } else if (type === 'caesar' || type === 'rot13') {
        var shift = type === 'rot13' ? 13 : parseInt(caesarShift.value, 10) || 0;
        classicOutput.value = text.replace(/[a-zA-Z]/g, function(c) {
          var base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base);
        });
      }
    } catch (e) { classicOutput.value = '处理错误'; }
  });

  document.getElementById('btn-classic-decode').addEventListener('click', function () {
    var text = classicInput.value, type = classicType.value;
    if (!text) return;
    try {
      if (type === 'morse') {
        classicOutput.value = text.split(' ').map(function(c) { return morseReverse[c] || c; }).join('');
      } else if (type === 'caesar' || type === 'rot13') {
        var shift = type === 'rot13' ? 13 : parseInt(caesarShift.value, 10) || 0;
        classicOutput.value = text.replace(/[a-zA-Z]/g, function(c) {
          var base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode((c.charCodeAt(0) - base - shift + 26) % 26 + base);
        });
      }
    } catch (e) { classicOutput.value = '处理错误'; }
  });

})();