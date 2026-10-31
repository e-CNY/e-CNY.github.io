(function () {
  var tabs = document.querySelectorAll('.nt-tab');
  var panels = document.querySelectorAll('.nt-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. CIDR 子网计算 =================
  function ipToLong(ip) {
    return ip.split('.').reduce(function (sum, octet) {
      return (sum << 8) + parseInt(octet, 10);
    }, 0) >>> 0;
  }
  function longToIp(long) {
    return [ (long >>> 24), (long >>> 16) & 255, (long >>> 8) & 255, long & 255 ].join('.');
  }

  document.getElementById('btn-cidr').addEventListener('click', function () {
    var val = document.getElementById('cidr-input').value.trim();
    var resBox = document.getElementById('cidr-result');
    var parts = val.split('/');
    if (parts.length !== 2) return resBox.textContent = '格式错误，请使用 IP/掩码格式 (如 192.168.1.0/24)';

    var ip = parts[0];
    var cidr = parseInt(parts[1], 10);
    if (cidr < 0 || cidr > 32) return resBox.textContent = '掩码范围必须在 0-32 之间';

    try {
      var ipLong = ipToLong(ip);
      var maskLong = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
      var networkLong = (ipLong & maskLong) >>> 0;
      var broadcastLong = (networkLong | (~maskLong)) >>> 0;
      var firstUsable = cidr >= 31 ? networkLong : networkLong + 1;
      var lastUsable = cidr >= 31 ? broadcastLong : broadcastLong - 1;
      var totalHosts = Math.pow(2, 32 - cidr);

      resBox.innerHTML = 
        '网络地址 (Network): <span>' + longToIp(networkLong) + '</span>\n' +
        '广播地址 (Broadcast): <span>' + longToIp(broadcastLong) + '</span>\n' +
        '子网掩码 (Subnet Mask): <span>' + longToIp(maskLong) + '</span>\n' +
        '可用 IP 范围: <span>' + longToIp(firstUsable) + ' - ' + longToIp(lastUsable) + '</span>\n' +
        '可用 IP 数量: <span>' + (totalHosts > 2 ? totalHosts - 2 : totalHosts) + '</span>\n' +
        '总 IP 容量: <span>' + totalHosts + '</span>';
    } catch (e) {
      resBox.textContent = '计算失败，请检查 IP 格式';
    }
  });

  // ================= 2. UA 检测 =================
  var uaInput = document.getElementById('ua-input');
  uaInput.value = navigator.userAgent;
  
  document.getElementById('btn-ua').addEventListener('click', function () {
    var ua = uaInput.value;
    var res = document.getElementById('ua-result');
    if (!ua) return;

    var browser = "未知";
    var os = "未知";
    var device = "桌面设备";

    if (/MicroMessenger/i.test(ua)) browser = "微信内置浏览器";
    else if (/Edg/i.test(ua)) browser = "Microsoft Edge";
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Google Chrome";
    else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Apple Safari";
    else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer";

    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) os = "macOS";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Linux/i.test(ua)) os = "Linux";

    if (/Mobile|iPhone|Android/i.test(ua)) device = "移动手机";
    if (/iPad|Tablet/i.test(ua)) device = "平板电脑";

    res.innerHTML = '浏览器: <span>' + browser + '</span>\n' +
                     '操作系统: <span>' + os + '</span>\n' +
                     '设备类型: <span>' + device + '</span>\n' +
                     '原始 UA: <span>' + ua + '</span>';
  });

  // ================= 3. HTTP 状态码 =================
  var httpCodes = [
    { code: 200, name: "OK", desc: "请求成功" },
    { code: 201, name: "Created", desc: "资源创建成功" },
    { code: 301, name: "Moved Permanently", desc: "永久重定向" },
    { code: 302, name: "Found", desc: "临时重定向" },
    { code: 304, name: "Not Modified", desc: "资源未修改（走缓存）" },
    { code: 400, name: "Bad Request", desc: "客户端请求语法错误" },
    { code: 401, name: "Unauthorized", desc: "未授权/未登录" },
    { code: 403, name: "Forbidden", desc: "禁止访问/无权限" },
    { code: 404, name: "Not Found", desc: "找不到页面或资源" },
    { code: 405, name: "Method Not Allowed", desc: "请求方法不被允许" },
    { code: 408, name: "Request Timeout", desc: "请求超时" },
    { code: 429, name: "Too Many Requests", desc: "请求过多（限流）" },
    { code: 500, name: "Internal Server Error", desc: "服务器内部错误" },
    { code: 502, name: "Bad Gateway", desc: "网关错误（后端无响应）" },
    { code: 503, name: "Service Unavailable", desc: "服务不可用" },
    { code: 504, name: "Gateway Timeout", desc: "网关超时" }
  ];

  var httpTbody = document.querySelector('#http-table tbody');
  function renderHttpCodes(filter) {
    httpTbody.innerHTML = '';
    var q = filter.toLowerCase();
    httpCodes.forEach(function (item) {
      if (String(item.code).includes(q) || item.name.toLowerCase().includes(q) || item.desc.includes(q)) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><b>' + item.code + '</b></td><td>' + item.name + '</td><td>' + item.desc + '</td>';
        httpTbody.appendChild(tr);
      }
    });
  }

  document.getElementById('http-input').addEventListener('input', function() {
    renderHttpCodes(this.value);
  });

  renderHttpCodes('');
})();