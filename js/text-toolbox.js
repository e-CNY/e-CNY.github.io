(function () {
  var inEl = document.getElementById('txt-in');
  var outEl = document.getElementById('txt-out');
  var statIn = document.getElementById('stat-in');
  var statOut = document.getElementById('stat-out');

  // ================= 基础工具函数 =================
  function getLines() {
    return inEl.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  }

  function setOut(str) {
    outEl.value = str;
    updateStats();
  }

  // 实时字数统计
  function updateStats() {
    function getStrStat(str) {
      var chars = str.length;
      var lines = str ? str.split('\n').length : 0;
      return chars + ' 字 / ' + lines + ' 行';
    }
    statIn.textContent = getStrStat(inEl.value);
    statOut.textContent = getStrStat(outEl.value);
  }

  inEl.addEventListener('input', updateStats);
  
  // ================= 基础处理 =================
  window.txtDedupe = function () {
    var unique = Array.from(new Set(getLines()));
    setOut(unique.join('\n'));
  };

  window.txtSort = function (type) {
    var lines = getLines();
    if (type === 'len') {
      lines.sort(function(a, b) { return a.length - b.length; });
    } else {
      var options = { numeric: true, sensitivity: 'base' };
      if (type === 'asc') lines.sort(function(a, b) { return a.localeCompare(b, undefined, options); });
      else lines.sort(function(a, b) { return b.localeCompare(a, undefined, options); });
    }
    setOut(lines.join('\n'));
  };

  window.txtShuffle = function () {
    var lines = getLines();
    for (var i = lines.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = lines[i]; lines[i] = lines[j]; lines[j] = temp;
    }
    setOut(lines.join('\n'));
  };

  window.txtReverse = function () {
    setOut(inEl.value.split('').reverse().join(''));
  };

  // ================= 空格与大小写 =================
  window.txtCase = function (type) {
    setOut(type === 'upper' ? inEl.value.toUpperCase() : inEl.value.toLowerCase());
  };

  window.txtTrim = function () {
    setOut(getLines().map(function(l) { return l.trim(); }).join('\n'));
  };

  window.txtRemoveEmpty = function () {
    setOut(getLines().filter(function(l) { return l.trim() !== ''; }).join('\n'));
  };

  window.txtRemoveAllSpaces = function () {
    setOut(inEl.value.replace(/\s+/g, ''));
  };

  window.txtFullHalf = function (type) {
    var str = inEl.value;
    if (type === 'half') {
      // 全角转半角
      str = str.replace(/[\uFF01-\uFF5E]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
      }).replace(/\u3000/g, ' ');
    } else {
      // 半角转全角
      str = str.replace(/[\u0021-\u007E]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
      }).replace(/ /g, '\u3000');
    }
    setOut(str);
  };

  // ================= 行操作与提取 =================
  window.txtLineNumber = function () {
    setOut(getLines().map(function(l, i) { return (i + 1) + '. ' + l; }).join('\n'));
  };

  window.txtWrap = function () {
    setOut(getLines().map(function(l) { return l ? '"' + l + '"' : '""'; }).join('\n'));
  };

  window.txtAddPrefix = function () {
    var prefix = prompt('请输入要添加的前缀（例如 "- " 或序号）：', '- ');
    if (prefix === null) return;
    setOut(getLines().map(function(l) { return prefix + l; }).join('\n'));
  };

  window.txtRemoveHtml = function () {
    setOut(inEl.value.replace(/<[^>]+>/g, ''));
  };

  window.txtExtractEmails = function () {
    var emails = inEl.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    setOut(emails ? Array.from(new Set(emails)).join('\n') : '未找到邮箱');
  };

  window.txtExtractUrls = function () {
    var urls = inEl.value.match(/https?:\/\/[^\s]+/g);
    setOut(urls ? Array.from(new Set(urls)).join('\n') : '未找到网址');
  };

  // ================= 编码与导出 =================
  window.txtBase64 = function (type) {
    try {
      if (type === 'encode') {
        setOut(btoa(unescape(encodeURIComponent(inEl.value))));
      } else {
        setOut(decodeURIComponent(escape(atob(inEl.value))));
      }
    } catch (e) {
      setOut('❌ 编码/解码失败，请检查输入内容或格式。');
    }
  };

  window.txtDownload = function () {
    var text = outEl.value || inEl.value;
    if (!text) return alert('没有可保存的内容');
    
    // 加上 BOM 头防止 Windows 记事本乱码
    var blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'text_export_' + Date.now() + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  window.txtClear = function () {
    inEl.value = '';
    outEl.value = '';
    updateStats();
  };

  updateStats();
})();