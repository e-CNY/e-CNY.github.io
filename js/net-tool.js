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

  function copyToClipboard(text) {
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
  }

  // ================= Tab 切换 =================
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
    var parts = ip.split('.');
    if (parts.length !== 4) return null;
    var long = 0;
    for (var i = 0; i < 4; i++) {
      var num = parseInt(parts[i], 10);
      if (isNaN(num) || num < 0 || num > 255) return null;
      long = (long << 8) + num;
    }
    return long >>> 0;
  }

  function longToIp(long) {
    return [ (long >>> 24), (long >>> 16) & 255, (long >>> 8) & 255, long & 255 ].join('.');
  }

  function longToBin(long) {
    var b = (long >>> 0).toString(2);
    // 安全补齐 32 位，每 8 位加一个点
    var padded = b.padStart(32, '0');
    return padded.match(/.{8}/g).join('.');
  }

  window.copyCidrResult = function() {
    var box = document.getElementById('cidr-result');
    if (box.querySelector('.cidr-error')) return showToast('无有效结果');
    var text = box.innerText || box.textContent;
    copyToClipboard(text);
  };

  document.getElementById('btn-cidr').addEventListener('click', function () {
    var val = document.getElementById('cidr-input').value.trim();
    var resBox = document.getElementById('cidr-result');
    var parts = val.split('/');
    
    if (parts.length !== 2) {
      resBox.innerHTML = '<div class="cidr-error">格式错误，请使用 IP/掩码 格式 (如 192.168.1.0/24)</div>';
      return;
    }

    var ip = parts[0];
    var cidr = parseInt(parts[1], 10);
    
    if (cidr < 0 || cidr > 32) {
      resBox.innerHTML = '<div class="cidr-error">掩码范围必须在 0-32 之间</div>';
      return;
    }

    var ipLong = ipToLong(ip);
    if (ipLong === null) {
      resBox.innerHTML = '<div class="cidr-error">无效的 IP 地址，请检查</div>';
      return;
    }

    var maskLong = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
    var networkLong = (ipLong & maskLong) >>> 0;
    var broadcastLong = (networkLong | (~maskLong)) >>> 0;
    var firstUsable = cidr >= 31 ? networkLong : networkLong + 1;
    var lastUsable = cidr >= 31 ? broadcastLong : broadcastLong - 1;
    var totalHosts = Math.pow(2, 32 - cidr);
    var usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts;

    var html = '';
    html += '<div class="cidr-item"><span class="cidr-label">网络地址 (Network)</span><span class="cidr-val">' + longToIp(networkLong) + '</span></div>';
    html += '<div class="cidr-item"><span class="cidr-label">广播地址 (Broadcast)</span><span class="cidr-val">' + longToIp(broadcastLong) + '</span></div>';
    html += '<div class="cidr-item"><span class="cidr-label">子网掩码 (Mask)</span><span class="cidr-val">' + longToIp(maskLong) + '</span></div>';
    html += '<div class="cidr-item"><span class="cidr-label">掩码长度 (CIDR)</span><span class="cidr-val">/' + cidr + '</span></div>';
    html += '<div class="cidr-item" style="grid-column: 1/-1;"><span class="cidr-label">可用 IP 范围 (Usable Range)</span><span class="cidr-val">' + longToIp(firstUsable) + ' - ' + longToIp(lastUsable) + '</span></div>';
    html += '<div class="cidr-item"><span class="cidr-label">可用 IP 数量</span><span class="cidr-val">' + usableHosts.toLocaleString() + '</span></div>';
    html += '<div class="cidr-item"><span class="cidr-label">总 IP 容量</span><span class="cidr-val">' + totalHosts.toLocaleString() + '</span></div>';
    
    // 增加二进制显示
    if (cidr > 0) {
        html += '<div class="cidr-item" style="grid-column: 1/-1;"><span class="cidr-label">网络地址 (二进制)</span><span class="cidr-val" style="font-size:0.85rem; letter-spacing:1px;">' + longToBin(networkLong) + '</span></div>';
        html += '<div class="cidr-item" style="grid-column: 1/-1;"><span class="cidr-label">子网掩码 (二进制)</span><span class="cidr-val" style="font-size:0.85rem; letter-spacing:1px;">' + longToBin(maskLong) + '</span></div>';
    }

    resBox.innerHTML = html;
    showToast('CIDR 计算完成');
  });
  
  // 初始化计算一次
  document.getElementById('btn-cidr').click();

  // ================= 2. UA 检测 =================
  var uaInput = document.getElementById('ua-input');
  var lastUaData = null;
  
  uaInput.value = navigator.userAgent;

  window.copyUaResult = function() {
    if (!lastUaData) return showToast('请先解析 UA');
    var text = '浏览器: ' + lastUaData.browser + ' ' + lastUaData.browserVer + '\n' +
               '操作系统: ' + lastUaData.os + ' ' + lastUaData.osVer + '\n' +
               '渲染引擎: ' + lastUaData.engine + '\n' +
               '设备类型: ' + lastUaData.device + '\n' +
               '原始 UA: ' + lastUaData.raw;
    copyToClipboard(text);
  };

  document.getElementById('btn-ua').addEventListener('click', function () {
    var ua = uaInput.value;
    var res = document.getElementById('ua-result');
    if (!ua) return showToast('请输入 UA 字符串');

    var browser = "未知浏览器";
    var bVer = "";
    var os = "未知系统";
    var oVer = "";
    var engine = "未知内核";
    var device = "桌面设备";

    // 1. 浏览器与内核识别
    if (/MicroMessenger\/([\d.]+)/i.test(ua)) { browser = "微信内置浏览器"; bVer = RegExp.$1; engine = "Blink/WebKit"; }
    else if (/Edg(?:e|A|iOS)?\/([\d.]+)/i.test(ua)) { browser = "Microsoft Edge"; bVer = RegExp.$1; engine = "Blink"; }
    else if (/OPR\/([\d.]+)/i.test(ua)) { browser = "Opera"; bVer = RegExp.$1; engine = "Blink"; }
    else if (/Firefox\/([\d.]+)/i.test(ua)) { browser = "Mozilla Firefox"; bVer = RegExp.$1; engine = "Gecko"; }
    else if (/Chrome\/([\d.]+)/i.test(ua) && !/Edg|OPR/i.test(ua)) { browser = "Google Chrome"; bVer = RegExp.$1; engine = "Blink"; }
    else if (/Version\/([\d.]+).*Safari/i.test(ua)) { browser = "Apple Safari"; bVer = RegExp.$1; engine = "WebKit"; }
    else if (/MSIE (\d+\.\d+);/.test(ua) || /Trident\/.*rv:([\d.]+)/i.test(ua)) { browser = "Internet Explorer"; bVer = RegExp.$1; engine = "Trident"; }

    // 2. OS 识别
    if (/Windows NT ([\d.]+)/i.test(ua)) {
      os = "Windows";
      var ntVer = RegExp.$1;
      if (ntVer === "10.0") oVer = "10 / 11";
      else if (ntVer === "6.3") oVer = "8.1";
      else if (ntVer === "6.2") oVer = "8";
      else if (ntVer === "6.1") oVer = "7";
      else oVer = ntVer;
    }
    else if (/Mac OS X ([\d_.]+)/i.test(ua) && !/iPhone|iPad/i.test(ua)) { os = "macOS"; oVer = RegExp.$1.replace(/_/g, '.'); }
    else if (/iPhone OS ([\d_]+)/i.test(ua)) { os = "iOS"; oVer = RegExp.$1.replace(/_/g, '.'); }
    else if (/iPad;.*OS ([\d_]+)/i.test(ua)) { os = "iPadOS"; oVer = RegExp.$1.replace(/_/g, '.'); }
    else if (/Android ([\d.]+)/i.test(ua)) { os = "Android"; oVer = RegExp.$1; }
    else if (/Linux/i.test(ua)) { os = "Linux"; }

    // 3. 设备识别
    if (/Mobile|iPhone|Android/i.test(ua)) device = "移动手机";
    if (/iPad|Tablet/i.test(ua)) device = "平板电脑";

    lastUaData = {
      browser: browser, browserVer: bVer,
      os: os, osVer: oVer,
      engine: engine,
      device: device,
      raw: ua
    };

    var html = '';
    html += '<div class="ua-item"><div class="ua-label">浏览器</div><div class="ua-val">' + browser + (bVer ? ' ' + bVer : '') + '</div></div>';
    html += '<div class="ua-item"><div class="ua-label">操作系统</div><div class="ua-val">' + os + (oVer ? ' ' + oVer : '') + '</div></div>';
    html += '<div class="ua-item"><div class="ua-label">渲染引擎</div><div class="ua-val">' + engine + '</div></div>';
    html += '<div class="ua-item"><div class="ua-label">设备类型</div><div class="ua-val">' + device + '</div></div>';
    html += '<div class="ua-raw"><b>原始 UA:</b><br>' + ua + '</div>';

    res.innerHTML = html;
    showToast('UA 解析完成');
  });
  
  // 初始化解析一次
  document.getElementById('btn-ua').click();

  // ================= 3. HTTP 状态码 =================
  var httpCodes = [
    { code: 100, name: "Continue", desc: "继续。客户端应继续其请求" },
    { code: 101, name: "Switching Protocols", desc: "切换协议。服务端根据客户端的请求切换协议" },
    
    { code: 200, name: "OK", desc: "请求成功。一般用于 GET 与 POST 请求" },
    { code: 201, name: "Created", desc: "已创建。成功请求并创建了新的资源" },
    { code: 202, name: "Accepted", desc: "已接受。已经接受请求，但未处理完成" },
    { code: 204, name: "No Content", desc: "无内容。服务器成功处理，但未返回内容" },
    { code: 206, name: "Partial Content", desc: "部分内容。服务器成功处理了部分 GET 请求" },
    
    { code: 301, name: "Moved Permanently", desc: "永久移动。请求的资源已被永久移动到新 URI" },
    { code: 302, name: "Found", desc: "临时移动。请求的资源临时被移动到新 URI" },
    { code: 303, name: "See Other", desc: "查看其他地址。建议客户端使用 GET 访问新 URI" },
    { code: 304, name: "Not Modified", desc: "未修改。所请求的资源未修改，走缓存" },
    { code: 307, name: "Temporary Redirect", desc: "临时重定向。与 302 类似，但期望客户端保持原方法" },
    { code: 308, name: "Permanent Redirect", desc: "永久重定向。与 301 类似，但期望客户端保持原方法" },
    
    { code: 400, name: "Bad Request", desc: "客户端请求的语法错误，服务器无法理解" },
    { code: 401, name: "Unauthorized", desc: "请求要求用户的身份认证（通常未登录）" },
    { code: 403, name: "Forbidden", desc: "服务器理解请求客户端的请求，但是拒绝执行此请求" },
    { code: 404, name: "Not Found", desc: "服务器无法根据客户端的请求找到资源" },
    { code: 405, name: "Method Not Allowed", desc: "客户端请求中的方法被禁止" },
    { code: 406, name: "Not Acceptable", desc: "服务器无法根据客户端请求的内容特性完成请求" },
    { code: 408, name: "Request Timeout", desc: "请求超时。服务器等待客户端发送的请求时间过长" },
    { code: 409, name: "Conflict", desc: "冲突。服务器在处理请求时发生冲突" },
    { code: 410, name: "Gone", desc: "已失效。请求的资源已被永久删除" },
    { code: 413, name: "Payload Too Large", desc: "请求实体过大，服务器拒收" },
    { code: 414, name: "URI Too Long", desc: "请求的 URI 过长" },
    { code: 415, name: "Unsupported Media Type", desc: "不支持的媒体类型" },
    { code: 429, name: "Too Many Requests", desc: "请求过多。客户端发送的请求频率过高" },
    
    { code: 500, name: "Internal Server Error", desc: "服务器内部错误，无法完成请求" },
    { code: 501, name: "Not Implemented", desc: "服务器不支持请求的功能" },
    { code: 502, name: "Bad Gateway", desc: "网关错误。作为网关或代理工作的服务器从远端服务器收到的响应无效" },
    { code: 503, name: "Service Unavailable", desc: "服务不可用。服务器暂时过载或维护" },
    { code: 504, name: "Gateway Timeout", desc: "网关超时。代理服务器未及时从远端服务器获取请求" },
    { code: 505, name: "HTTP Version Not Supported", desc: "服务器不支持请求的 HTTP 协议的版本" }
  ];

  var httpTbody = document.querySelector('#http-table tbody');
  var httpFilter = 'all';
  var httpQuery = '';

  function getCodeClass(code) {
    if (code < 200) return '';
    if (code < 300) return 'code-2xx';
    if (code < 400) return 'code-3xx';
    if (code < 500) return 'code-4xx';
    return 'code-5xx';
  }

  function highlight(text, q) {
    if (!q) return text;
    var reg = new RegExp('(' + q + ')', 'gi');
    return text.replace(reg, '<mark>$1</mark>');
  }

  function renderHttpCodes() {
    httpTbody.innerHTML = '';
    var q = httpQuery.toLowerCase();
    var filtered = httpCodes.filter(function(item) {
      // 1. 分类过滤
      var catMatch = true;
      if (httpFilter !== 'all') {
        catMatch = String(item.code).startsWith(httpFilter.replace('xx', ''));
      }
      // 2. 搜索过滤
      var searchMatch = true;
      if (q) {
        searchMatch = String(item.code).includes(q) || item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      }
      return catMatch && searchMatch;
    });

    if (filtered.length === 0) {
      httpTbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#8a7a5f; padding: 20px;">没有找到匹配的状态码</td></tr>';
      return;
    }

    filtered.forEach(function (item) {
      var tr = document.createElement('tr');
      var cls = getCodeClass(item.code);
      tr.innerHTML = '<td><b class="' + cls + '">' + item.code + '</b></td>' +
                     '<td>' + highlight(item.name, httpQuery) + '</td>' +
                     '<td>' + highlight(item.desc, httpQuery) + '</td>';
      httpTbody.appendChild(tr);
    });
  }

  document.getElementById('http-input').addEventListener('input', function() {
    httpQuery = this.value.trim();
    renderHttpCodes();
  });

  document.querySelectorAll('.http-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.http-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      httpFilter = this.dataset.filter;
      renderHttpCodes();
    });
  });

  renderHttpCodes();
})();