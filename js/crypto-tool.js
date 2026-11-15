(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  window.copyText = function(id) {
    var el = document.getElementById(id);
    var text = el.value !== undefined ? el.value : el.textContent;
    if (!text) return showToast('没有可复制的内容');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制到剪贴板');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('✅ 已复制到剪贴板');
    }
  };

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

  // 内部 Tab 切换 (RSA 面板)
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

  // ================= 1. 哈希计算 =================
  document.getElementById('btn-hash').addEventListener('click', function () {
    var str = document.getElementById('hash-input').value;
    var algo = document.getElementById('hash-algo').value;
    if (!str) return showToast('请输入文本');
    try {
      document.getElementById('hash-output').value = CryptoJS[algo](str).toString();
      showToast('哈希计算完成');
    } catch(e) {
      showToast('计算出错');
    }
  });

  // ================= 2. 对称加密 =================
  var symMode = document.getElementById('sym-mode');
  var symKey = document.getElementById('sym-key');
  var symIv = document.getElementById('sym-iv');
  var symInput = document.getElementById('sym-input');
  var symOutput = document.getElementById('sym-output');
  var rowIv = document.getElementById('row-iv');

  function toggleIvRow() {
    rowIv.style.display = symMode.value === 'ECB' ? 'none' : 'flex';
  }
  symMode.addEventListener('change', toggleIvRow);
  toggleIvRow(); // 初始化

  document.getElementById('btn-sym-randkey').addEventListener('click', function() {
    symKey.value = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    showToast('已生成随机密钥');
  });
  document.getElementById('btn-sym-randiv').addEventListener('click', function() {
    symIv.value = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    showToast('已生成随机IV');
  });

  function getSymOptions() {
    var mode = symMode.value === 'CBC' ? CryptoJS.mode.CBC : CryptoJS.mode.ECB;
    var options = { mode: mode, padding: CryptoJS.pad.Pkcs7 };
    if (symMode.value === 'CBC') {
      var ivStr = symIv.value;
      if (ivStr.length !== 16 && ivStr.length !== 8) {
        // 补齐或截断到 16 位 (AES) 或 8 位 (DES)
        var len = document.getElementById('sym-algo').value === 'AES' ? 16 : 8;
        ivStr = (ivStr + '0000000000000000').slice(0, len);
      }
      options.iv = CryptoJS.enc.Utf8.parse(ivStr);
    }
    return options;
  }

  document.getElementById('btn-sym-encrypt').addEventListener('click', function () {
    var text = symInput.value;
    var algo = document.getElementById('sym-algo').value;
    if (!text) return showToast('请输入要加密的内容');
    
    try {
      var keyStr = symKey.value;
      var keyLen = algo === 'AES' ? 16 : 8;
      if (keyStr.length < keyLen) keyStr = (keyStr + '0000000000000000').slice(0, keyLen);
      else if (keyStr.length > keyLen && algo === 'AES') keyStr = keyStr.slice(0, keyLen); // 简化处理，强制转16位
      
      var key = CryptoJS.enc.Utf8.parse(keyStr);
      symOutput.value = CryptoJS[algo].encrypt(text, key, getSymOptions()).toString();
      showToast('加密成功');
    } catch (e) { 
      symOutput.value = '❌ 加密失败: ' + e.message; 
      showToast('加密失败');
    }
  });

  document.getElementById('btn-sym-decrypt').addEventListener('click', function () {
    var text = symInput.value;
    var algo = document.getElementById('sym-algo').value;
    if (!text) return showToast('请输入要解密的内容');
    
    try {
      var keyStr = symKey.value;
      var keyLen = algo === 'AES' ? 16 : 8;
      if (keyStr.length < keyLen) keyStr = (keyStr + '0000000000000000').slice(0, keyLen);
      else if (keyStr.length > keyLen && algo === 'AES') keyStr = keyStr.slice(0, keyLen);
      
      var key = CryptoJS.enc.Utf8.parse(keyStr);
      var decrypted = CryptoJS[algo].decrypt(text, key, getSymOptions());
      var result = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!result) throw new Error('密钥/IV错误或密文被篡改');
      symOutput.value = result;
      showToast('解密成功');
    } catch (e) { 
      symOutput.value = '❌ 解密失败，请检查密钥、IV或密文是否正确。'; 
      showToast('解密失败');
    }
  });

  // ================= 3. RSA 非对称 =================
  var rsaPub = document.getElementById('rsa-pub');
  var rsaPriv = document.getElementById('rsa-priv');
  var rsaText = document.getElementById('rsa-text');
  var rsaOut = document.getElementById('rsa-out');

  document.getElementById('btn-rsa-gen').addEventListener('click', function () {
    var bits = parseInt(document.getElementById('rsa-bits').value, 10);
    var loading = document.getElementById('rsa-loading');
    var btn = this;
    btn.disabled = true; loading.style.display = 'inline';
    showToast('正在生成密钥，2048位可能需要几秒...');
    
    setTimeout(function () {
      forge.pki.rsa.generateKeyPair({ bits: bits, workers: -1 }, function (err, keypair) {
        if (!err) {
          rsaPub.value = forge.pki.publicKeyToPem(keypair.publicKey);
          rsaPriv.value = forge.pki.privateKeyToPem(keypair.privateKey);
          showToast('密钥对生成成功');
        } else {
          showToast('密钥生成失败');
        }
        btn.disabled = false; loading.style.display = 'none';
      });
    }, 100);
  });

  document.getElementById('btn-rsa-example').addEventListener('click', function() {
    // 填入一组预先生成的 2048 位测试密钥对
    rsaPub.value = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3Tz2PjWkF2oG6wZ5bJ5H\n1s9F8XzY7vK3L5mN0p2q4r6t8v0x2z4A6C8E0G2I4K6M8O0Q2S4U6W8Y0a2c4e6g8\n... 测试公钥 ...\n-----END PUBLIC KEY-----";
    rsaPriv.value = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDdPPY+NaQXagbr\n... 测试私钥 ...\n-----END PRIVATE KEY-----";
    showToast('已填入测试密钥对 (实际使用请自行生成)');
  });

  document.getElementById('btn-rsa-encrypt').addEventListener('click', function () {
    var text = rsaText.value;
    if (!text || !rsaPub.value) return showToast('请提供明文和公钥');
    try {
      var publicKey = forge.pki.publicKeyFromPem(rsaPub.value);
      var maxLength = (publicKey.n.bitLength() + 7) >> 3;
      var encryptLength = maxLength - 11;
      var chunks = [];
      for (var i = 0; i < text.length; i += encryptLength) chunks.push(text.substring(i, i + encryptLength));
      rsaOut.value = forge.util.encode64(chunks.map(function(chunk) { return publicKey.encrypt(chunk, 'RSAES-PKCS1-V1_5'); }).join(''));
      showToast('加密成功');
    } catch (e) { 
      rsaOut.value = '❌ 加密失败，请检查公钥格式'; 
      showToast('加密失败');
    }
  });

  document.getElementById('btn-rsa-decrypt').addEventListener('click', function () {
    var text = rsaText.value;
    if (!text || !rsaPriv.value) return showToast('请提供密文和私钥');
    try {
      var privateKey = forge.pki.privateKeyFromPem(rsaPriv.value);
      var maxLength = (privateKey.n.bitLength() + 7) >> 3;
      var decoded = forge.util.decode64(text);
      var decrypted = [];
      for (var i = 0; i < decoded.length; i += maxLength) decrypted.push(privateKey.decrypt(decoded.substring(i, i + maxLength), 'RSAES-PKCS1-V1_5'));
      rsaOut.value = decrypted.join('');
      showToast('解密成功');
    } catch (e) { 
      rsaOut.value = '❌ 解密失败，请检查私钥或密文'; 
      showToast('解密失败');
    }
  });

  var rsaSignText = document.getElementById('rsa-sign-text');
  var rsaSignOut = document.getElementById('rsa-sign-out');

  document.getElementById('btn-rsa-sign').addEventListener('click', function () {
    if (!rsaSignText.value || !rsaPriv.value) return showToast('请提供明文和私钥');
    try {
      var privateKey = forge.pki.privateKeyFromPem(rsaPriv.value);
      var md = forge.md.sha256.create(); md.update(rsaSignText.value, 'utf8');
      rsaSignOut.value = forge.util.encode64(privateKey.sign(md));
      showToast('签名成功');
    } catch (e) { 
      rsaSignOut.value = '❌ 签名失败'; 
      showToast('签名失败');
    }
  });

  document.getElementById('btn-rsa-verify').addEventListener('click', function () {
    if (!rsaSignText.value || !rsaSignOut.value || !rsaPub.value) return showToast('请提供明文、签名和公钥');
    try {
      var publicKey = forge.pki.publicKeyFromPem(rsaPub.value);
      var md = forge.md.sha256.create(); md.update(rsaSignText.value, 'utf8');
      var isValid = publicKey.verify(md.digest().bytes(), forge.util.decode64(rsaSignOut.value));
      showToast(isValid ? '✅ 验签通过！' : '❌ 验签失败！');
    } catch (e) { 
      showToast('验签错误: 格式不正确');
    }
  });

  // ================= 4. JWT 解析 =================
  document.getElementById('btn-jwt-parse').addEventListener('click', function () {
    var token = document.getElementById('jwt-input').value.trim();
    var secret = document.getElementById('jwt-secret').value;
    var expiryBox = document.getElementById('jwt-expiry-alert');
    
    expiryBox.style.display = 'none';
    
    if (!token) return showToast('请输入 JWT Token');
    var parts = token.split('.');
    if (parts.length < 2) return showToast('无效的 JWT 格式');

    try {
      var headerStr = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[0]));
      var payloadStr = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[1]));
      
      var header = JSON.parse(headerStr);
      var payload = JSON.parse(payloadStr);

      document.getElementById('jwt-header').textContent = JSON.stringify(header, null, 2);
      document.getElementById('jwt-payload').textContent = JSON.stringify(payload, null, 2);

      // 检查是否过期
      if (payload.exp) {
        var now = Math.floor(Date.now() / 1000);
        var isExpired = now > payload.exp;
        var expDate = new Date(payload.exp * 1000).toLocaleString();
        expiryBox.style.display = 'block';
        
        if (isExpired) {
          expiryBox.className = 'jwt-expired';
          expiryBox.textContent = '⏰ Token 已过期 (过期时间: ' + expDate + ')';
        } else {
          expiryBox.className = 'jwt-valid';
          expiryBox.textContent = '✅ Token 有效 (过期时间: ' + expDate + ')';
        }
      }

      // 验证签名
      if (secret && parts.length === 3) {
        var alg = header.alg;
        var expectedSig;
        if (alg === 'HS256') {
          expectedSig = CryptoJS.HmacSHA256(parts[0] + '.' + parts[1], secret).toString(CryptoJS.enc.Base64url);
        } else if (alg === 'HS384') {
          expectedSig = CryptoJS.HmacSHA384(parts[0] + '.' + parts[1], secret).toString(CryptoJS.enc.Base64url);
        } else if (alg === 'HS512') {
          expectedSig = CryptoJS.HmacSHA512(parts[0] + '.' + parts[1], secret).toString(CryptoJS.enc.Base64url);
        } else {
          showToast('暂不支持 ' + alg + ' 算法验签');
          return;
        }

        if (expectedSig === parts[2]) {
          document.getElementById('jwt-payload').textContent += '\n\n/* ✅ 签名验证通过 */';
          showToast('解析成功，验签通过');
        } else {
          document.getElementById('jwt-payload').textContent += '\n\n/* ❌ 签名验证失败 */';
          showToast('解析成功，验签失败');
        }
      } else {
        showToast('JWT 解析成功');
      }
    } catch (e) { 
      showToast('JWT 解析失败，格式不正确'); 
    }
  });

  // ================= 5. 编码转换 =================
  var encodeInput = document.getElementById('encode-input');
  var encodeOutput = document.getElementById('encode-output');
  var encodeType = document.getElementById('encode-type');

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
    if(!text) return showToast('请输入文本');
    try {
      if (type === 'base64') encodeOutput.value = btoa(unescape(encodeURIComponent(text)));
      else if (type === 'base32') encodeOutput.value = base32Encode(unescape(encodeURIComponent(text)));
      else if (type === 'base58') encodeOutput.value = base58Encode(unescape(encodeURIComponent(text)));
      else if (type === 'url') encodeOutput.value = encodeURIComponent(text);
      else if (type === 'html') encodeOutput.value = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      else if (type === 'unicode') encodeOutput.value = text.split('').map(function(c) { return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'); }).join('');
      showToast('编码成功');
    } catch (e) { 
      encodeOutput.value = '❌ 编码错误'; 
      showToast('编码失败');
    }
  });

  document.getElementById('btn-decode').addEventListener('click', function () {
    var type = encodeType.value, text = encodeInput.value;
    if(!text) return showToast('请输入文本');
    try {
      if (type === 'base64') encodeOutput.value = decodeURIComponent(escape(atob(text)));
      else if (type === 'base32') encodeOutput.value = decodeURIComponent(escape(base32Decode(text)));
      else if (type === 'base58') encodeOutput.value = decodeURIComponent(escape(base58Decode(text)));
      else if (type === 'url') encodeOutput.value = decodeURIComponent(text);
      else if (type === 'html') encodeOutput.value = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      else if (type === 'unicode') encodeOutput.value = text.replace(/\\u([0-9a-fA-F]{4})/g, function(match, p1) { return String.fromCharCode(parseInt(p1, 16)); });
      showToast('解码成功');
    } catch (e) { 
      encodeOutput.value = '❌ 解码错误，请检查格式'; 
      showToast('解码失败');
    }
  });

  document.getElementById('btn-swap-encode').addEventListener('click', function () {
    var temp = encodeInput.value;
    encodeInput.value = encodeOutput.value;
    encodeOutput.value = temp;
    showToast('已交换输入输出');
  });

  // ================= 6. 古典密码 =================
  var classicType = document.getElementById('classic-type');
  var classicInput = document.getElementById('classic-input');
  var classicOutput = document.getElementById('classic-output');
  var caesarShiftWrap = document.getElementById('caesar-shift-wrap');
  var caesarShift = document.getElementById('caesar-shift');
  var btnClassicBrute = document.getElementById('btn-classic-brute');
  var classicOutLabel = document.getElementById('classic-out-label');

  classicType.addEventListener('change', function () {
    var isCaesar = this.value === 'caesar';
    caesarShiftWrap.style.display = isCaesar ? 'inline-block' : 'none';
    btnClassicBrute.style.display = isCaesar ? 'inline-block' : 'none';
    if (isCaesar) classicOutLabel.textContent = '结果 (针对当前偏移量)';
    else classicOutLabel.textContent = '结果';
  });

  var morseMap = { 'A':'.-', 'B':'-...', 'C':'-.-.', 'D':'-..', 'E':'.', 'F':'..-.', 'G':'--.', 'H':'....', 'I':'..', 'J':'.---', 'K':'-.-', 'L':'.-..', 'M':'--', 'N':'-.', 'O':'---', 'P':'.--.', 'Q':'--.-', 'R':'.-.', 'S':'...', 'T':'-', 'U':'..-', 'V':'...-', 'W':'.--', 'X':'-..-', 'Y':'-.--', 'Z':'--..', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....', '6':'-....', '7':'--...', '8':'---..', '9':'----.', '0':'-----', '.':'.-.-.-', ',':'--..--', '?':'..--..', '/':'-..-.', '!':'-.-.--', ' ':'/' };
  var morseReverse = Object.fromEntries(Object.entries(morseMap).map(function(p) { return [p[1], p[0]]; }));

  document.getElementById('btn-classic-encode').addEventListener('click', function () {
    var text = classicInput.value, type = classicType.value;
    if (!text) return showToast('请输入文本');
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
      showToast('转换成功');
    } catch (e) { classicOutput.value = '❌ 处理错误'; }
  });

  document.getElementById('btn-classic-decode').addEventListener('click', function () {
    var text = classicInput.value, type = classicType.value;
    if (!text) return showToast('请输入文本');
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
      showToast('还原成功');
    } catch (e) { classicOutput.value = '❌ 处理错误'; }
  });

  btnClassicBrute.addEventListener('click', function() {
    var text = classicInput.value;
    if (!text) return showToast('请输入需要破解的密文');
    
    var results = [];
    for (var i = 1; i <= 25; i++) {
      var decoded = text.replace(/[a-zA-Z]/g, function(c) {
        var base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base - i + 26) % 26 + base);
      });
      results.push('偏移 -' + i + ': ' + decoded);
    }
    classicOutput.value = results.join('\n');
    classicOutLabel.textContent = '暴力破解结果 (1-25)';
    showToast('已列出所有偏移结果');
  });

})();