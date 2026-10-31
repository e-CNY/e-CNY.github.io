(function () {
  var tabs = document.querySelectorAll('.rs-tab');
  var panels = document.querySelectorAll('.rs-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // 1. RSS 解析
  document.getElementById('btn-rss').addEventListener('click', function () {
    var xmlStr = document.getElementById('rss-input').value;
    var resEl = document.getElementById('rss-result');
    if (!xmlStr) return;

    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      
      var items = xmlDoc.querySelectorAll('item'); // RSS 2.0
      if (items.length === 0) items = xmlDoc.querySelectorAll('entry'); // Atom
      if (items.length === 0) return resEl.innerHTML = '未找到有效的 RSS / Atom 节点。';

      var html = '';
      for (var i = 0; i < Math.min(items.length, 50); i++) {
        var item = items[i];
        var title = item.querySelector('title') ? item.querySelector('title').textContent : '无标题';
        var linkNode = item.querySelector('link');
        var link = linkNode ? (linkNode.getAttribute('href') || linkNode.textContent) : '#';
        var pubDate = item.querySelector('pubDate') || item.querySelector('updated');
        var date = pubDate ? pubDate.textContent : '';

        html += '<div class="rss-item">';
        html += '<div class="rss-title"><a href="' + link + '" target="_blank" style="color:inherit;text-decoration:none;">' + title + '</a></div>';
        html += '<div class="rss-meta">' + date + ' | <a href="' + link + '" target="_blank">' + link + '</a></div>';
        html += '</div>';
      }
      resEl.innerHTML = html;
    } catch (e) {
      resEl.innerHTML = '<span style="color:#a8452a;">解析失败，请检查 XML 格式。</span>';
    }
  });

  // 2. OPML 解析
  document.getElementById('btn-opml').addEventListener('click', function () {
    var xmlStr = document.getElementById('opml-input').value;
    var resEl = document.getElementById('opml-result');
    if (!xmlStr) return;

    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      var outlines = xmlDoc.querySelectorAll('outline[xmlUrl]');
      if (outlines.length === 0) return resEl.textContent = '未找到订阅源 (xmlUrl 属性)。';

      var urls = [];
      outlines.forEach(function (o) {
        urls.push(o.getAttribute('xmlUrl'));
      });
      resEl.textContent = urls.join('\n');
    } catch (e) {
      resEl.textContent = '解析失败，请检查 XML 格式。';
    }
  });
})();