(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  window.copyText = function (id) {
    var el = document.getElementById(id);
    var text = el.value !== undefined ? el.value : el.innerText;
    if (!text) return showToast('没有可复制的内容', true);
    
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
  var tabs = document.querySelectorAll('.rb-tab');
  var panels = document.querySelectorAll('.rb-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. robots.txt 解析与测试 =================
  window.loadRobotsSample = function() {
    document.getElementById('robots-input').value = `User-agent: *\nDisallow: /admin/\nDisallow: /private/\nAllow: /admin/public/\nAllow: /\n\nSitemap: https://www.example.com/sitemap.xml`;
    document.getElementById('btn-robots').click();
    showToast('示例已填入');
  };

  // 解析 robots.txt 的规则
  function parseRobotsRules(txt) {
    var lines = txt.split('\n');
    var rules = [];
    var currentAgents = [];
    var isRelevantGroup = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].split('#')[0].trim();
      if (!line) continue;
      
      var parts = line.split(':');
      if (parts.length < 2) continue;
      var key = parts[0].trim().toLowerCase();
      var val = parts.slice(1).join(':').trim();

      if (key === 'user-agent') {
        // 如果上一个指令不是 user-agent，说明是新的一组
        if (currentAgents.length > 0 && i > 0 && lines[i-1].toLowerCase().indexOf('user-agent') === -1) {
          currentAgents = [];
          isRelevantGroup = false;
        }
        currentAgents.push(val);
        if (val === '*') isRelevantGroup = true;
      } 
      else if (key === 'allow' || key === 'disallow') {
        if (isRelevantGroup && val) {
          rules.push({ type: key, path: val });
        }
      }
    }
    return rules;
  }

  // 测试路径是否允许
  function testPath(rules, path) {
    // 如果没有匹配的规则，默认允许
    var matchedRule = null;
    var maxMatchLength = -1;

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var rulePath = rule.path;
      
      // 将 * 转为 .*，其余转义
      var regexStr = rulePath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      // 如果是结尾，加上 $
      if (regexStr.endsWith('$')) {
        regexStr = regexStr.slice(0, -1) + '$';
      } else {
        regexStr = regexStr; // 默认前缀匹配
      }

      var regex = new RegExp('^' + regexStr);
      
      if (regex.test(path)) {
        // 匹配长度
        var matchLen = rulePath.replace(/\*/g, '').length;
        if (matchLen > maxMatchLength) {
          maxMatchLength = matchLen;
          matchedRule = rule;
        } else if (matchLen === maxMatchLength) {
          // Google 规范：如果长度相同，Allow 优先
          if (rule.type === 'allow') {
            matchedRule = rule;
          }
        }
      }
    }

    if (matchedRule) {
      return matchedRule.type === 'allow';
    }
    return true; // 默认允许
  }

  function renderRobots() {
    var txt = document.getElementById('robots-input').value;
    var resEl = document.getElementById('robots-result');
    if (!txt.trim()) return showToast('请先输入 robots.txt 内容', true);

    var lines = txt.split('\n');
    var html = '';
    var currentAgent = '';
    var rulesFound = 0;

    lines.forEach(function (line) {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      var parts = line.split(':');
      if (parts.length < 2) return;
      var key = parts[0].trim().toLowerCase();
      var val = parts.slice(1).join(':').trim();

      if (key === 'user-agent') {
        currentAgent = val;
        html += '<h4>🤖 User-agent: ' + escapeHtml(val) + '</h4>';
        rulesFound++;
      } else if (key === 'allow') {
        html += '<div class="rb-result-item allow"><span class="rb-allow">✅ Allow:</span> ' + escapeHtml(val) + '</div>';
        rulesFound++;
      } else if (key === 'disallow') {
        if (val === '') {
          html += '<div class="rb-result-item allow"><span class="rb-allow">✅ Disallow: (空，允许所有)</span></div>';
        } else {
          html += '<div class="rb-result-item disallow"><span class="rb-disallow">❌ Disallow:</span> ' + escapeHtml(val) + '</div>';
        }
        rulesFound++;
      } else if (key === 'sitemap') {
        html += '<div class="rb-result-item sitemap">🔗 Sitemap: ' + escapeHtml(val) + '</div>';
      }
    });

    resEl.innerHTML = html || '未能解析出有效规则。';
    if (rulesFound > 0) showToast('解析成功');
  }

  document.getElementById('btn-robots').addEventListener('click', renderRobots);

  document.getElementById('btn-robots-test').addEventListener('click', function() {
    var txt = document.getElementById('robots-input').value;
    var testUrl = document.getElementById('robots-test-url').value.trim();
    var resEl = document.getElementById('robots-result');
    
    if (!txt.trim()) return showToast('请先输入 robots.txt 内容', true);
    if (!testUrl) return showToast('请输入要测试的 URL 路径', true);
    
    // 规范化路径
    if (!testUrl.startsWith('/')) testUrl = '/' + testUrl;
    var pathOnly = testUrl.split('?')[0].split('#')[0];

    var rules = parseRobotsRules(txt);
    var isAllowed = testPath(rules, pathOnly);

    renderRobots(); // 先渲染规则
    
    var resultHtml = isAllowed 
      ? '<span class="rb-test-pass">✅ 允许抓取 (Allowed)</span>'
      : '<span class="rb-test-fail">❌ 禁止抓取 (Disallowed)</span>';
      
    resEl.innerHTML = '<div style="margin-bottom:16px; padding:12px; background:#f9f3e3; border-radius:8px; border:1px solid #d5c7a8;"><b>测试路径:</b> <code>' + escapeHtml(pathOnly) + '</code><br><b>测试结果:</b> ' + resultHtml + '</div>' + resEl.innerHTML;
  });

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ================= 2. Sitemap XML 提取 =================
  window.loadSitemapSample = function() {
    document.getElementById('sitemap-input').value = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><![CDATA[https://www.example.com/]]></loc>
    <lastmod>2023-10-01</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://www.example.com/about</loc>
    <lastmod>2023-10-02</lastmod>
  </url>
  <url>
    <loc>https://www.example.com/products</loc>
  </url>
</urlset>`;
    document.getElementById('btn-sitemap').click();
    showToast('示例已填入');
  };

  var extractedUrls = [];

  document.getElementById('btn-sitemap').addEventListener('click', function () {
    var xmlStr = document.getElementById('sitemap-input').value.trim();
    var resEl = document.getElementById('sitemap-result');
    var countEl = document.getElementById('sitemap-count');
    
    if (!xmlStr) return showToast('请先输入 sitemap.xml 内容', true);

    try {
      extractedUrls = [];
      
      // 方法1：使用正则匹配所有 <loc> 标签，容错 CDATA
      // 匹配 <loc>...</loc>，忽略大小写，非贪婪
      var locRegex = /<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/loc>/gi;
      var match;
      
      while ((match = locRegex.exec(xmlStr)) !== null) {
        var url = match[1].trim();
        // 过滤掉明显的空格或空字符串
        if (url && url.indexOf('<') === -1) {
          if (extractedUrls.indexOf(url) === -1) {
            extractedUrls.push(url);
          }
        }
      }

      if (extractedUrls.length === 0) {
        resEl.textContent = '未能提取到任何 URL。请确保 XML 中包含 <loc> 标签。';
        countEl.textContent = '';
        return;
      }

      resEl.textContent = extractedUrls.join('\n');
      countEl.textContent = '(共 ' + extractedUrls.length + ' 条)';
      showToast('成功提取 ' + extractedUrls.length + ' 个 URL');
      
    } catch (e) {
      resEl.textContent = '提取失败: ' + e.message;
      showToast('提取失败', true);
    }
  });

  window.downloadSitemapUrls = function() {
    if (!extractedUrls || extractedUrls.length === 0) return showToast('没有可下载的内容，请先提取', true);
    
    var blob = new Blob([extractedUrls.join('\n')], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap_urls_' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('URL 列表已下载');
  };

  // 初始化
  loadRobotsSample();
  loadSitemapSample();

})();