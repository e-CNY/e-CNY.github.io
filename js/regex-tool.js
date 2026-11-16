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

  window.copyText = function (id) {
    var el = document.getElementById(id);
    var text = el.value !== undefined ? el.value : el.innerHTML || el.textContent;
    if (!text) return showToast('没有可复制的内容');
    
    // 如果包含高亮标签，需要提取纯文本
    if (el.tagName !== 'TEXTAREA') {
      text = el.textContent;
    }

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

  // ================= 1. 正则测试 =================
  var rxCount = document.getElementById('rx-count');
  var rxHighlight = document.getElementById('rx-highlight');
  var rxGroups = document.getElementById('rx-groups');

  function getFlags() {
    var flags = '';
    if (document.getElementById('flag-g').checked) flags += 'g';
    if (document.getElementById('flag-i').checked) flags += 'i';
    if (document.getElementById('flag-m').checked) flags += 'm';
    if (document.getElementById('flag-s').checked) flags += 's';
    return flags;
  }

  document.getElementById('btn-regex').addEventListener('click', function () {
    var pattern = document.getElementById('rx-pattern').value;
    var text = document.getElementById('rx-text').value;
    var replaceStr = document.getElementById('rx-replace').value;
    var flags = getFlags();

    if (!pattern) return showToast('请输入正则表达式');

    try {
      var regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
      
      // 1. 替换预览
      if (replaceStr) {
        try {
          var replaced = text.replace(regex, replaceStr);
          rxHighlight.innerHTML = escapeHtml(replaced);
          rxCount.textContent = '替换完成';
          rxGroups.innerHTML = '<div class="rx-group-item" style="color:#7ba05b;">✔️ 已应用替换规则</div>';
          return;
        } catch (e) {
          rxHighlight.innerHTML = '<span style="color:#a8452a;">替换错误: ' + escapeHtml(e.message) + '</span>';
          return;
        }
      }

      // 2. 匹配高亮与捕获组
      var match;
      var count = 0;
      var lastIndex = 0;
      var resultHtml = '';
      var groupsHtml = '';
      var rawRegex = new RegExp(pattern, flags); // 保留原flags以防没有g

      // 防止死循环，如果没有g标志我们手动截断
      var isGlobal = flags.includes('g');
      
      while ((match = regex.exec(text)) !== null) {
        count++;
        
        // 拼接高亮文本
        resultHtml += escapeHtml(text.slice(lastIndex, match.index));
        resultHtml += '<mark>' + escapeHtml(match[0]) + '</mark>';
        lastIndex = regex.lastIndex;

        // 组装捕获组信息
        var groupInfo = '<div class="rx-group-item"><div class="rx-group-title">匹配 #' + count + ' (位置: ' + match.index + ')</div>';
        groupInfo += '<div class="rx-group-content"><b>完整匹配:</b> ' + escapeHtml(match[0]) + '</div>';
        
        if (match.length > 1) {
          for (var i = 1; i < match.length; i++) {
            groupInfo += '<div class="rx-group-content" style="color:#7ba05b; margin-left:10px;">Group ' + i + ': ' + escapeHtml(match[i] || '(空)') + '</div>';
          }
        }
        if (match.groups) {
          for (var key in match.groups) {
            groupInfo += '<div class="rx-group-content" style="color:#2563eb; margin-left:10px;">' + key + ': ' + escapeHtml(match.groups[key]) + '</div>';
          }
        }
        groupInfo += '</div>';
        groupsHtml += groupInfo;

        // 如果正则没带g，匹配到一次就退出，防止死循环
        if (!isGlobal) break;
        
        // 防止零宽匹配死循环
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      resultHtml += escapeHtml(text.slice(lastIndex));
      
      rxCount.textContent = count;
      rxHighlight.innerHTML = resultHtml || '无匹配项';
      rxGroups.innerHTML = groupsHtml || '<div style="color:#8a7a5f; text-align:center;">没有捕获组信息</div>';

    } catch (e) {
      rxHighlight.innerHTML = '<span style="color:#a8452a;">正则语法错误: ' + escapeHtml(e.message) + '</span>';
      rxCount.textContent = 0;
      rxGroups.innerHTML = '';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ================= 2. CSS 选择器 =================
  document.getElementById('btn-css').addEventListener('click', function () {
    var selector = document.getElementById('css-selector').value;
    var html = document.getElementById('css-html').value;
    var mode = document.getElementById('css-view-mode').value;
    var resultBox = document.getElementById('css-result');
    var countEl = document.getElementById('css-count');

    if (!selector || !html) return showToast('请填写选择器和 HTML');
    
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var elements = doc.querySelectorAll(selector);
      countEl.textContent = elements.length;
      
      var out = [];
      elements.forEach(function(el) {
        if (mode === 'html') {
          out.push(el.outerHTML);
        } else {
          out.push(el.textContent.trim());
        }
      });
      
      resultBox.innerHTML = out.length ? escapeHtml(out.join('\n\n')) : '无匹配项';
      if (out.length) showToast('查询成功');
    } catch (e) {
      resultBox.innerHTML = '<span style="color:#a8452a;">语法错误: ' + escapeHtml(e.message) + '</span>';
    }
  });

  // ================= 3. XPath 选择器 =================
  document.getElementById('btn-xpath').addEventListener('click', function () {
    var xpath = document.getElementById('xpath-selector').value;
    var html = document.getElementById('xpath-html').value;
    var mode = document.getElementById('xpath-view-mode').value;
    var resultBox = document.getElementById('xpath-result');
    var countEl = document.getElementById('xpath-count');

    if (!xpath || !html) return showToast('请填写 XPath 和 HTML');
    
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      countEl.textContent = result.snapshotLength;
      
      var out = [];
      for (var i = 0; i < result.snapshotLength; i++) {
        var node = result.snapshotItem(i);
        if (mode === 'html') {
          out.push(node.outerHTML || node.nodeValue);
        } else {
          out.push(node.textContent ? node.textContent.trim() : node.nodeValue.trim());
        }
      }
      
      resultBox.innerHTML = out.length ? escapeHtml(out.join('\n\n')) : '无匹配项';
      if (out.length) showToast('查询成功');
    } catch (e) {
      resultBox.innerHTML = '<span style="color:#a8452a;">XPath 语法错误: ' + escapeHtml(e.message) + '</span>';
    }
  });

  // ================= 4. 链接提取 =================
  function extractTags(selector, attrName) {
    var html = document.getElementById('ex-html').value;
    var outBox = document.getElementById('ex-result');
    var isMd = document.getElementById('ex-md-format').checked;
    var isDedupe = document.getElementById('ex-dedupe').checked;
    
    if (!html) return showToast('请先粘贴 HTML 源码');

    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var elements = doc.querySelectorAll(selector);
      var urls = [];
      
      elements.forEach(function(el) {
        var val = el.getAttribute(attrName);
        if (!val) return;
        
        var line = '';
        if (isMd && selector === 'a') {
          var text = el.textContent.trim() || '链接';
          line = '[' + text + '](' + val + ')';
        } else if (isMd && selector === 'img') {
          var alt = el.getAttribute('alt') || '图片';
          line = '![' + alt + '](' + val + ')';
        } else {
          line = val;
        }

        if (!isDedupe || urls.indexOf(line) === -1) {
          urls.push(line);
        }
      });
      
      outBox.value = urls.join('\n') || '未找到任何结果';
      showToast('提取完成，共 ' + urls.length + ' 条');
    } catch (e) {
      outBox.value = '解析失败: ' + e.message;
    }
  }

  document.getElementById('btn-extract-a').addEventListener('click', function () { extractTags('a', 'href'); });
  document.getElementById('btn-extract-img').addEventListener('click', function () { extractTags('img', 'src'); });

})();