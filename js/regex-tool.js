(function () {
  var tabs = document.querySelectorAll('.rx-tab');
  var panels = document.querySelectorAll('.rx-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // 1. 正则测试
  document.getElementById('btn-regex').addEventListener('click', function () {
    var pattern = document.getElementById('rx-pattern').value;
    var flags = document.getElementById('rx-flags').value;
    var text = document.getElementById('rx-text').value;
    var highlightBox = document.getElementById('rx-highlight');
    var countEl = document.getElementById('rx-count');

    if (!pattern) return alert('请输入正则表达式');

    try {
      var regex = new RegExp(pattern, flags);
      if (!flags.includes('g')) {
        // 强行加上 g 以便高亮全部
        regex = new RegExp(pattern, flags + 'g');
      }

      var matches = text.match(regex);
      var count = matches ? matches.length : 0;
      countEl.textContent = count;

      var resultHTML = text.replace(regex, function(match) {
        return '<mark>' + match + '</mark>';
      });
      highlightBox.innerHTML = resultHTML || '无匹配项';
    } catch (e) {
      highlightBox.innerHTML = '<span style="color:#a8452a;">正则语法错误: ' + e.message + '</span>';
    }
  });

  // 2. CSS 选择器
  document.getElementById('btn-css').addEventListener('click', function () {
    var selector = document.getElementById('css-selector').value;
    var html = document.getElementById('css-html').value;
    var resultBox = document.getElementById('css-result');
    var countEl = document.getElementById('css-count');

    if (!selector || !html) return alert('请填写选择器和 HTML');
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var elements = doc.querySelectorAll(selector);
      countEl.textContent = elements.length;
      
      var out = '';
      elements.forEach(function(el) { out += el.outerHTML + '\n\n'; });
      resultBox.textContent = out || '无匹配项';
    } catch (e) {
      resultBox.innerHTML = '<span style="color:#a8452a;">语法错误: ' + e.message + '</span>';
    }
  });

  // 3. XPath 选择器
  document.getElementById('btn-xpath').addEventListener('click', function () {
    var xpath = document.getElementById('xpath-selector').value;
    var html = document.getElementById('xpath-html').value;
    var resultBox = document.getElementById('xpath-result');
    var countEl = document.getElementById('xpath-count');

    if (!xpath || !html) return alert('请填写 XPath 和 HTML');
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      countEl.textContent = result.snapshotLength;
      
      var out = '';
      for (var i = 0; i < result.snapshotLength; i++) {
        var node = result.snapshotItem(i);
        out += (node.outerHTML || node.nodeValue) + '\n\n';
      }
      resultBox.textContent = out || '无匹配项';
    } catch (e) {
      resultBox.innerHTML = '<span style="color:#a8452a;">XPath 语法错误: ' + e.message + '</span>';
    }
  });

  // 4. 链接提取
  function extractTags(selector, attrName) {
    var html = document.getElementById('ex-html').value;
    var outBox = document.getElementById('ex-result');
    if (!html) return alert('请先粘贴 HTML 源码');

    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var elements = doc.querySelectorAll(selector);
      var urls = [];
      elements.forEach(function(el) {
        var val = el.getAttribute(attrName);
        if (val && !urls.includes(val)) urls.push(val);
      });
      outBox.value = urls.join('\n') || '未找到任何链接';
    } catch (e) {
      outBox.value = '解析失败: ' + e.message;
    }
  }

  document.getElementById('btn-extract-a').addEventListener('click', function () { extractTags('a', 'href'); });
  document.getElementById('btn-extract-img').addEventListener('click', function () { extractTags('img', 'src'); });

})();