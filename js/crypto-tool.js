(function () {
  // Tab 切换
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

  // 1. 哈希计算
  document.getElementById('btn-hash').addEventListener('click', function () {
    var str = document.getElementById('hash-input').value;
    if (!str) return;
    document.getElementById('hash-res-group').style.display = 'block';
    document.getElementById('res-md5').value = CryptoJS.MD5(str).toString();
    document.getElementById('res-sha1').value = CryptoJS.SHA1(str).toString();
    document.getElementById('res-sha256').value = CryptoJS.SHA256(str).toString();
  });

  // 2. JWT 解析
  document.getElementById('btn-jwt').addEventListener('click', function () {
    var token = document.getElementById('jwt-input').value.trim();
    var resBox = document.getElementById('jwt-res');
    if (!token) return;
    var parts = token.split('.');
    if (parts.length !== 3) {
      alert('无效的 JWT 格式，必须包含两个点(.)');
      resBox.style.display = 'none';
      return;
    }
    try {
      var header = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[0])));
      var payload = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(parts[1])));
      document.getElementById('jwt-header').textContent = JSON.stringify(header, null, 2);
      document.getElementById('jwt-payload').textContent = JSON.stringify(payload, null, 2);
      resBox.style.display = 'block';
    } catch (e) {
      alert('解析失败，Base64 解码错误或 JSON 格式不正确。');
      resBox.style.display = 'none';
    }
  });

  // 3. Base64 编解码
  document.getElementById('btn-b64-encode').addEventListener('click', function () {
    var str = document.getElementById('b64-input').value;
    document.getElementById('b64-output').value = btoa(unescape(encodeURIComponent(str)));
  });

  document.getElementById('btn-b64-decode').addEventListener('click', function () {
    var str = document.getElementById('b64-input').value;
    try {
      document.getElementById('b64-output').value = decodeURIComponent(escape(atob(str)));
    } catch (e) {
      document.getElementById('b64-output').value = '❌ 解码失败，请检查 Base64 字符串是否正确。';
    }
  });
})();