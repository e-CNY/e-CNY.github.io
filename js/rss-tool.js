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
      }).catch(function () { fallbackCopy(text); });
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

  window.clearInput = function(id) {
    document.getElementById(id).value = '';
  };

  // Tab 切换
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

  // 视图切换
  var toggleBtns = document.querySelectorAll('.rs-toggle-btn');
  var viewCard = document.getElementById('rss-result-card');
  var viewJson = document.getElementById('rss-result-json');
  
  toggleBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      toggleBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var view = this.dataset.view;
      
      if (view === 'card') {
        viewCard.classList.add('active');
        viewJson.style.display = 'none';
      } else {
        viewCard.classList.remove('active');
        viewJson.style.display = 'block';
      }
    });
  });

  // ================= 1. RSS 解析核心 =================
  window.loadRssSample = function() {
    document.getElementById('rss-input').value = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>工具站官方博客</title>
  <link>https://www.example.com/blog</link>
  <description>提供最新最全的开发工具资讯</description>
  <item>
    <title>如何使用代码沙盒进行前端调试</title>
    <link>https://www.example.com/blog/post-1</link>
    <description><![CDATA[<p>这是一个非常棒的沙盒工具...</p>]]></description>
    <pubDate>Mon, 01 Nov 2023 10:00:00 GMT</pubDate>
    <author>张三</author>
  </item>
  <item>
    <title>正则表达式高级用法总结</title>
    <link>https://www.example.com/blog/post-2</link>
    <description>正则表达式是程序员必备的技能...</description>
    <pubDate>Tue, 02 Nov 2023 12:30:00 GMT</pubDate>
  </item>
</channel>
</rss>`;
    document.getElementById('btn-rss').click();
    showToast('示例已填入');
  };

  document.getElementById('btn-rss').addEventListener('click', function () {
    var xmlStr = document.getElementById('rss-input').value.trim();
    var resCard = document.getElementById('rss-result-card');
    var resJson = document.getElementById('rss-result-json');
    
    if (!xmlStr) return showToast('请先输入 XML 内容', true);

    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      
      // 检查 XML 解析错误
      var parseError = xmlDoc.querySelector('parsererror');
      if (parseError) throw new Error('XML 格式错误');

      var isAtom = xmlDoc.documentElement.nodeName.toLowerCase() === 'feed';
      var channelNode = isAtom ? xmlDoc.documentElement : xmlDoc.querySelector('channel');
      
      if (!channelNode) throw new Error('未找到 RSS <channel> 或 Atom <feed> 节点');

      var feedData = {
        type: isAtom ? 'atom' : 'rss',
        title: getNodeText(channelNode, 'title') || '未知频道',
        link: getChannelLink(channelNode, isAtom),
        description: getNodeText(channelNode, 'description') || getNodeText(channelNode, 'subtitle') || '',
        items: []
      };

      var items = channelNode.querySelectorAll(isAtom ? 'entry' : 'item');
      var cardHtml = '';

      // 渲染顶部 Header
      cardHtml += '<div class="rss-feed-header">';
      cardHtml += '<div class="rss-feed-icon">📡</div>';
      cardHtml += '<div class="rss-feed-info">';
      cardHtml += '<h3>' + escapeHtml(feedData.title) + '</h3>';
      cardHtml += '<p>' + escapeHtml(feedData.description).substring(0, 80) + ' | <a href="' + feedData.link + '" target="_blank">访问网站</a></p>';
      cardHtml += '</div></div>';

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var title = getNodeText(item, 'title') || '无标题';
        var link = getItemLink(item, isAtom);
        var date = getNodeText(item, 'pubDate') || getNodeText(item, 'updated') || getNodeText(item, 'published') || '';
        var author = getNodeText(item, 'author') || (item.querySelector('author') ? getNodeText(item.querySelector('author'), 'name') : '');
        var desc = getNodeText(item, 'description') || getNodeText(item, 'summary') || getNodeText(item, 'content') || '';
        
        var itemObj = {
          title: title,
          link: link,
          date: date,
          author: author,
          description: stripHtml(desc)
        };
        feedData.items.push(itemObj);

        // 组装卡片
        cardHtml += '<div class="rss-item">';
        cardHtml += '<div class="rss-title"><a href="' + link + '" target="_blank">' + escapeHtml(title) + '</a></div>';
        cardHtml += '<div class="rss-meta">';
        if (date) cardHtml += '<span>📅 ' + escapeHtml(date) + '</span>';
        if (author) cardHtml += '<span>👤 ' + escapeHtml(author) + '</span>';
        cardHtml += '</div>';
        if (desc) cardHtml += '<div class="rss-desc">' + escapeHtml(stripHtml(desc)) + '</div>';
        cardHtml += '</div>';
      }

      resCard.innerHTML = cardHtml;
      resJson.value = JSON.stringify(feedData, null, 2);
      
      showToast('解析成功，共 ' + feedData.items.length + ' 篇文章');

    } catch (e) {
      resCard.innerHTML = '<div class="rs-empty" style="color:#a8452a;">❌ 解析失败: ' + e.message + '</div>';
      resJson.value = '';
      showToast('解析失败', true);
    }
  });

  // 辅助函数：获取节点文本（处理 CDATA）
  function getNodeText(parent, tagName) {
    var node = parent.querySelector(tagName);
    if (!node) return '';
    return node.textContent.trim();
  }

  // 辅助函数：获取频道链接 (兼容 Atom)
  function getChannelLink(channel, isAtom) {
    if (isAtom) {
      var links = channel.querySelectorAll('link');
      for (var i = 0; i < links.length; i++) {
        if (links[i].getAttribute('rel') === 'alternate' || !links[i].getAttribute('rel')) {
          return links[i].getAttribute('href') || '';
        }
      }
      return '';
    } else {
      return getNodeText(channel, 'link');
    }
  }

  // 辅助函数：获取文章链接
  function getItemLink(item, isAtom) {
    if (isAtom) {
      var links = item.querySelectorAll('link');
      for (var i = 0; i < links.length; i++) {
        if (links[i].getAttribute('rel') === 'alternate' || !links[i].getAttribute('rel')) {
          return links[i].getAttribute('href') || '#';
        }
      }
      return '#';
    } else {
      var linkNode = item.querySelector('link');
      return linkNode ? (linkNode.getAttribute('href') || linkNode.textContent) : '#';
    }
  }

  // 剥离 HTML 标签
  function stripHtml(html) {
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ================= 2. OPML 解析 =================
  window.loadOpmlSample = function() {
    document.getElementById('opml-input').value = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>我的订阅源</title>
  </head>
  <body>
    <outline text="科技资讯" title="科技资讯">
      <outline type="rss" text="36氪" title="36氪" xmlUrl="https://36kr.com/feed" htmlUrl="https://36kr.com"/>
      <outline type="rss" text="少数派" title="少数派" xmlUrl="https://sspai.com/feed" htmlUrl="https://sspai.com"/>
    </outline>
    <outline type="rss" text="阮一峰的网络日志" title="阮一峰的网络日志" xmlUrl="http://www.ruanyifeng.com/blog/atom.xml" htmlUrl="http://www.ruanyifeng.com/blog/"/>
  </body>
</opml>`;
    document.getElementById('btn-opml').click();
    showToast('示例已填入');
  };

  var opmlData = [];

  document.getElementById('btn-opml').addEventListener('click', function () {
    var xmlStr = document.getElementById('opml-input').value.trim();
    var resEl = document.getElementById('opml-result');
    var countEl = document.getElementById('opml-count');
    
    if (!xmlStr) return showToast('请先输入 OPML 内容', true);

    try {
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      
      var parseError = xmlDoc.querySelector('parsererror');
      if (parseError) throw new Error('XML 格式错误');

      opmlData = [];
      
      // 递归遍历 outline 节点
      function parseOutline(node, parentGroup) {
        var children = node.children;
        for (var i = 0; i < children.length; i++) {
          var el = children[i];
          if (el.nodeName.toLowerCase() !== 'outline') continue;

          var text = el.getAttribute('text') || el.getAttribute('title') || '';
          var xmlUrl = el.getAttribute('xmlUrl');
          var htmlUrl = el.getAttribute('htmlUrl') || '';
          
          if (xmlUrl) {
            // 这是一个订阅源
            opmlData.push({
              group: parentGroup || '未分类',
              title: text,
              xmlUrl: xmlUrl,
              htmlUrl: htmlUrl
            });
          } else if (el.children.length > 0) {
            // 这是一个文件夹
            parseOutline(el, text);
          }
        }
      }

      var body = xmlDoc.querySelector('body');
      if (body) parseOutline(body, '');

      if (opmlData.length === 0) {
        resEl.value = '未找到包含 xmlUrl 的订阅源。';
        countEl.textContent = '';
        return;
      }

      resEl.value = JSON.stringify(opmlData, null, 2);
      countEl.textContent = '(共 ' + opmlData.length + ' 个源)';
      showToast('成功提取 ' + opmlData.length + ' 个订阅源');

    } catch (e) {
      resEl.value = '❌ 提取失败: ' + e.message;
      countEl.textContent = '';
      showToast('提取失败', true);
    }
  });

  // ================= 通用导出 =================
  window.downloadResult = function(type) {
    var content = '';
    var filename = '';
    
    if (type === 'rss') {
      content = document.getElementById('rss-result-json').value;
      filename = 'rss_export_' + Date.now() + '.json';
    } else {
      content = document.getElementById('opml-result').value;
      filename = 'opml_feeds_' + Date.now() + '.json';
    }
    
    if (!content || content.trim() === '') return showToast('没有可下载的内容，请先解析', true);
    
    var blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('文件已导出');
  };

  // ================= 初始化 =================
  loadRssSample();
  loadOpmlSample();

})();