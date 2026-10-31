(function () {
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

  // 1. robots.txt 解析
  document.getElementById('btn-robots').addEventListener('click', function () {
    var txt = document.getElementById('robots-input').value;
    var resEl = document.getElementById('robots-result');
    if (!txt) return;

    var lines = txt.split('\n');
    var html = '';
    var currentAgent = '';

    lines.forEach(function (line) {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      var parts = line.split(':');
      if (parts.length < 2) return;
      var key = parts[0].trim().toLowerCase();
      var val = parts.slice(1).join(':').trim();

      if (key === 'user-agent') {
        currentAgent = val;
        html += '<h4>🤖 User-agent: ' + val + '</h4>';
      } else if (key === 'allow') {
        html += '<div><span class="rb-allow">✅ Allow:</span> ' + val + '</div>';
      } else if (key === 'disallow') {
        if (val === '') {
          html += '<div><span class="rb-allow">✅ Disallow: (空，允许所有)</span></div>';
        } else {
          html += '<div><span class="rb-disallow">❌ Disallow:</span> ' + val + '</div>';
        }
      } else if (key === 'sitemap') {
        html += '<div style="margin-top:8px; color:#2563eb;">🔗 Sitemap: ' + val + '</div>';
      }
    });

    resEl.innerHTML = html || '未能解析出有效规则。';
  });

  // 2. Sitemap 提取
  document.getElementById('btn-sitemap').addEventListener('click', function () {
    var xmlStr = document.getElementById('sitemap-input').value;
    var resEl = document.getElementById('sitemap-result');
    if (!xmlStr) return;

    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      var locs = xmlDoc.getElementsByTagName('loc');
      if (locs.length === 0) {
        // 尝试找 sitemapindex 里的 loc
        resEl.textContent = '未找到 <loc> 标签，请确保是有效的 XML。';
        return;
      }
      
      var urls = [];
      for (var i = 0; i < locs.length; i++) {
        urls.push(locs[i].textContent.trim());
      }
      resEl.textContent = urls.join('\n');
    } catch (e) {
      resEl.textContent = '解析失败，请检查 XML 格式。';
    }
  });
})();