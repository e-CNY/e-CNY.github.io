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
    var res = CryptoJS[algo](str).toString();
    document.getElementById('hash-output').value = res;
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
    if (symMode.value === 'CBC') {
      options.iv = CryptoJS.enc.Utf8.parse(symIv.value);
    }
    return options;
  }

  document.getElementById('btn-sym-encrypt').addEventListener('click', function () {
    var text = symInput.value;
    if (!text) return;
    try {
      var key = CryptoJS.enc.Utf8.parse(symKey.value);
      var encrypted = CryptoJS[symAlgo.value].encrypt(text, key, getSymOptions());
      symOutput.value = encrypted.toString(); // Base64
    } catch (e) {
      symOutput.value = '加密失败: ' + e.message;
    }
  });

  document.getElementById('btn-sym-decrypt').addEventListener('click', function () {
    var text = symInput.value;
    if (!text) return;
    try {
      var key = CryptoJS.enc.Utf8.parse(symKey.value);
      var decrypted = CryptoJS[symAlgo.value].decrypt(text, key, getSymOptions());
      symOutput.value = decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      symOutput.value = '解密失败: 密文或密钥不正确';
    }
  });

  // ================= 3. RSA 非对称 =================
  var rsaPub = document.getElementById('rsa-pub');
  var rsaPriv = document.getElementById('rsa-priv');
  var rsaText = document.getElementById('rsa-text');
  var rsaOut = document.getElementById('rsa-out');

  // 内部 Tab
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

  // 生成密钥对
  document.getElementById('btn-rsa-gen').addEventListener('click', function () {
    var bits = parseInt(document.getElementById('rsa-bits').value, 10);
    var loading = document.getElementById('rsa-loading');
    var btn = this;
    
    btn.disabled = true;
    loading.style.display = 'inline';

    setTimeout(function () {
      forge.pki.rsa.generateKeyPair({ bits: bits, workers: -1 }, function (err, keypair) {
        if (err) {
          alert('生成失败: ' + err);
        } else {
          rsaPub.value = forge.pki.publicKeyToPem(keypair.publicKey);
          rsaPriv.value = forge.pki.privateKeyToPem(keypair.privateKey);
        }
        btn.disabled = false;
        loading.style.display = 'none';
      });
    }, 50); // 让 UI 有时间渲染 Loading
  });

  // RSA 公钥加密 (长文本分段)
  document.getElementById('btn-rsa-encrypt').addEventListener('click', function () {
    var text = rsaText.value;
    if (!text || !rsaPub.value) return alert('请提供明文和公钥');
    try {
      var publicKey = forge.pki.publicKeyFromPem(rsaPub.value);
      var maxLength = (publicKey.n.bitLength() + 7) >> 3; // 密钥字节长度
      var encryptLength = maxLength - 11; // PKCS#1 v1.5 填充限制
      
      var chunks = [];
      for (var i = 0; i < text.length; i += encryptLength) {
        chunks.push(text.substring(i, i + encryptLength));
      }
      
      var encrypted = chunks.map(function(chunk) {
        return publicKey.encrypt(chunk, 'RSAES-PKCS1-V1_5');
      });
      
      // 将二进制拼接后转 Base64
      var combined = encrypted.join('');
      rsaOut.value = forge.util.encode64(combined);
    } catch (e) {
      rsaOut.value = '加密失败: ' + e.message;
    }
  });

  // RSA 私钥解密
  document.getElementById('btn-rsa-decrypt').addEventListener('click', function () {
    var text = rsaText.value;
    if (!text || !rsaPriv.value) return alert('请提供密文和私钥');
    try {
      var privateKey = forge.pki.privateKeyFromPem(rsaPriv.value);
      var maxLength = (privateKey.n.bitLength() + 7) >> 3;
      
      var decoded = forge.util.decode64(text);
      var decrypted = [];
      
      for (var i = 0; i < decoded.length; i += maxLength) {
        var chunk = decoded.substring(i, i + maxLength);
        decrypted.push(privateKey.decrypt(chunk, 'RSAES-PKCS1-V1_5'));
      }
      
      rsaOut.value = decrypted.join('');
    } catch (e) {
      rsaOut.value = '解密失败: ' + e.message;
    }
  });

  // RSA 签名与验签
  var rsaSignText = document.getElementById('rsa-sign-text');
  var rsaSignOut = document.getElementById('rsa-sign-out');

  document.getElementById('btn-rsa-sign').addEventListener('click', function () {
    var text = rsaSignText.value;
    if (!text || !rsaPriv.value) return alert('请提供明文和私钥');
    try {
      var privateKey = forge.pki.privateKeyFromPem(rsaPriv.value);
      var md = forge.md.sha256.create();
      md.update(text, 'utf8');
      var signature = privateKey.sign(md);
      rsaSignOut.value = forge.util.encode64(signature);
    } catch (e) {
      rsaSignOut.value = '签名失败: ' + e.message;
    }
  });

  document.getElementById('btn-rsa-verify').addEventListener('click', function () {
    var text = rsaSignText.value;
    var signature = rsaSignOut.value;
    if (!text || !signature || !rsaPub.value) return alert('请提供明文、签名和公钥');
    try {
      var publicKey = forge.pki.publicKeyFromPem(rsaPub.value);
      var md = forge.md.sha256.create();
      md.update(text, 'utf8');
      var decodedSig = forge.util.decode64(signature);
      var isValid = publicKey.verify(md.digest().bytes(), decodedSig);
      alert(isValid ? '✅ 验签通过，数据完整！' : '❌ 验签失败，数据被篡改或公钥不匹配。');
    } catch (e) {
      alert('验签发生错误: ' + e.message);
    }
  });

  // ================= 4. JWT 解析 =================
  document.getElementById('btn-jwt-parse').addEventListener('click', function () {
    var token = document.getElementById('jwt-input').value.trim();
    var secret = document.getElementById('jwt-secret').value;
    if (!token) return;
    
    var parts = token.split('.');
    if (parts.length < 2) {
      alert('无效的 JWT 格式');
      return;
    }
    
    try {
      var header = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[0])));
      var payload = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[1])));
      
      document.getElementById('jwt-header').textContent = JSON.stringify(header, null, 2);
      document.getElementById('jwt-payload').textContent = JSON.stringify(payload, null, 2);
      
      // 验证签名 (如果是 HS256)
      if (secret && parts.length === 3 && header.alg === 'HS256') {
        var expectedSig = CryptoJS.HmacSHA256(parts[0] + '.' + parts[1], secret).toString(CryptoJS.enc.Base64url);
        if (expectedSig === parts[2]) {
          document.getElementById('jwt-payload').textContent += '\n\n/* ✅ 签名验证通过 */';
        } else {
          document.getElementById('jwt-payload').textContent += '\n\n/* ❌ 签名验证失败 (密钥错误或数据被篡改) */';
        }
      }
    } catch (e) {
      alert('解析失败，请检查 Token 格式');
    }
  });

  // ================= 5. Base64 =================
  document.getElementById('btn-b64-encode').addEventListener('click', function () {
    var str = document.getElementById('b64-input').value;
    document.getElementById('b64-output').value = btoa(unescape(encodeURIComponent(str)));
  });

  document.getElementById('btn-b64-decode').addEventListener('click', function () {
    var str = document.getElementById('b64-input').value;
    try {
      document.getElementById('b64-output').value = decodeURIComponent(escape(atob(str)));
    } catch (e) {
      document.getElementById('b64-output').value = '❌ 解码失败，请检查 Base64 是否正确。';
    }
  });

})();