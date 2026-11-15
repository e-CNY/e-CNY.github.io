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

  var inEl = document.getElementById('txt-in');
  var outEl = document.getElementById('txt-out');
  var statIn = document.getElementById('stat-in');
  var statOut = document.getElementById('stat-out');
  var statsInBox = document.getElementById('char-stats-in');
  var statsOutBox = document.getElementById('char-stats-out');
  var inBox = document.getElementById('tt-in-box');

  // ================= 状态统计 =================
  function updateStats() {
    function getStats(str) {
      var lines = str ? str.split('\n').length : 0;
      var chinese = (str.match(/[\u4e00-\u9fa5]/g) || []).length;
      var letters = (str.match(/[a-zA-Z]/g) || []).length;
      var numbers = (str.match(/\d/g) || []).length;
      var spaces = (str.match(/\s/g) || []).length;
      return { chars: str.length, lines: lines, zh: chinese, en: letters, num: numbers, sp: spaces };
    }

    var sIn = getStats(inEl.value);
    var sOut = getStats(outEl.value);

    statIn.textContent = sIn.chars + ' 字 / ' + sIn.lines + ' 行';
    statOut.textContent = sOut.chars + ' 字 / ' + sOut.lines + ' 行';

    statsInBox.innerHTML = '<span>中文字符: <b>' + sIn.zh + '</b></span><span>英文字母: <b>' + sIn.en + '</b></span><span>数字: <b>' + sIn.num + '</b></span><span>空格: <b>' + sIn.sp + '</b></span>';
    statsOutBox.innerHTML = '<span>中文字符: <b>' + sOut.zh + '</b></span><span>英文字母: <b>' + sOut.en + '</b></span><span>数字: <b>' + sOut.num + '</b></span><span>空格: <b>' + sOut.sp + '</b></span>';
  }

  inEl.addEventListener('input', updateStats);

  function getLines() {
    return inEl.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  }

  function setOut(str) {
    outEl.value = str;
    updateStats();
  }

  // ================= 行处理 =================
  window.txtDedupe = function () {
    var unique = Array.from(new Set(getLines()));
    setOut(unique.join('\n'));
    showToast('已去重');
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
    showToast('排序完成');
  };

  window.txtShuffle = function () {
    var lines = getLines();
    for (var i = lines.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = lines[i]; lines[i] = lines[j]; lines[j] = temp;
    }
    setOut(lines.join('\n'));
    showToast('已随机打乱');
  };

  window.txtLineNumber = function () {
    setOut(getLines().map(function(l, i) { return (i + 1) + '. ' + l; }).join('\n'));
    showToast('已添加行号');
  };

  window.txtRemoveEmpty = function () {
    setOut(getLines().filter(function(l) { return l.trim() !== ''; }).join('\n'));
    showToast('已去除空行');
  };

  window.txtMergeLines = function () {
    var lines = getLines().map(function(l) { return l.trim(); }).filter(Boolean);
    setOut(lines.join(' ')); // 默认用空格连接
    showToast('已合并为一行');
  };

  // ================= 文本转换 =================
  window.txtCase = function (type) {
    var str = inEl.value;
    if (type === 'upper') str = str.toUpperCase();
    else if (type === 'lower') str = str.toLowerCase();
    else if (type === 'title') {
      str = str.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    } else if (type === 'toggle') {
      str = str.replace(/[a-zA-Z]/g, function(c) {
        return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
      });
    }
    setOut(str);
  };

  window.txtReverse = function () {
    setOut(inEl.value.split('').reverse().join(''));
  };

  window.txtFullHalf = function (type) {
    var str = inEl.value;
    if (type === 'half') {
      str = str.replace(/[\uFF01-\uFF5E]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
      }).replace(/\u3000/g, ' ');
    } else {
      str = str.replace(/[\u0021-\u007E]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
      }).replace(/ /g, '\u3000');
    }
    setOut(str);
    showToast(type === 'half' ? '已全转半' : '已半转全');
  };

  // ================= 清理与过滤 =================
  window.txtTrim = function () {
    setOut(getLines().map(function(l) { return l.trim(); }).join('\n'));
    showToast('已去首尾空格');
  };

  window.txtRemoveAllSpaces = function () {
    setOut(inEl.value.replace(/\s+/g, ''));
    showToast('已去所有空格');
  };

  window.txtMergeSpaces = function () {
    setOut(inEl.value.replace(/[ \t]+/g, ' '));
    showToast('已合并连续空格');
  };

  window.txtRemoveHtml = function () {
    setOut(inEl.value.replace(/<[^>]+>/g, ''));
    showToast('已去HTML标签');
  };

  window.txtRemovePunctuation = function () {
    setOut(inEl.value.replace(/[\u3000-\u303F\uFF00-\uFFEF\s~!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, ''));
    showToast('已去标点符号');
  };

  window.txtFilterLines = function () {
    var keyword = prompt('请输入要【保留】的关键词 (留空则取消):');
    if (keyword === null) return;
    if (keyword === '') {
      setOut(inEl.value); return;
    }
    var lines = getLines().filter(function(l) { return l.indexOf(keyword) !== -1; });
    setOut(lines.join('\n'));
    showToast('已过滤出包含关键词的行');
  };

  // ================= 提取与修饰 =================
  window.txtExtractEmails = function () {
    var emails = inEl.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    setOut(emails ? Array.from(new Set(emails)).join('\n') : '');
    showToast(emails ? '提取成功' : '未找到邮箱');
  };

  window.txtExtractUrls = function () {
    var urls = inEl.value.match(/https?:\/\/[^\s]+/g);
    setOut(urls ? Array.from(new Set(urls)).join('\n') : '');
    showToast(urls ? '提取成功' : '未找到网址');
  };

  window.txtExtractPhone = function () {
    var phones = inEl.value.match(/1[3-9]\d{9}/g);
    setOut(phones ? Array.from(new Set(phones)).join('\n') : '');
    showToast(phones ? '提取成功' : '未找到手机号');
  };

  window.txtExtractIP = function () {
    var ips = inEl.value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    setOut(ips ? Array.from(new Set(ips)).join('\n') : '');
    showToast(ips ? '提取成功' : '未找到IP');
  };

  window.txtWrap = function () {
    setOut(getLines().map(function(l) { return l ? '"' + l + '"' : '""'; }).join('\n'));
    showToast('已添加双引号');
  };

  window.txtAddPrefixSuffix = function (type) {
    var text = prompt('请输入要添加的' + (type === 'prefix' ? '前缀' : '后缀') + ' (如 "- " ):');
    if (text === null) return;
    if (type === 'prefix') {
      setOut(getLines().map(function(l) { return text + l; }).join('\n'));
    } else {
      setOut(getLines().map(function(l) { return l + text; }).join('\n'));
    }
    showToast('添加完成');
  };

  // ================= 编码与导出 =================
  window.txtBase64 = function (type) {
    try {
      if (type === 'encode') setOut(btoa(unescape(encodeURIComponent(inEl.value))));
      else setOut(decodeURIComponent(escape(atob(inEl.value))));
      showToast('Base64 处理成功');
    } catch (e) {
      setOut('❌ 编码/解码失败，请检查输入格式。');
    }
  };

  window.txtUrlEncode = function () {
    setOut(encodeURIComponent(inEl.value));
    showToast('URL 编码成功');
  };

  window.txtUrlDecode = function () {
    try {
      setOut(decodeURIComponent(inEl.value));
      showToast('URL 解码成功');
    } catch (e) {
      setOut('❌ 解码失败，请检查格式。');
    }
  };

  window.txtUnicode = function (type) {
    if (type === 'encode') {
      setOut(inEl.value.split('').map(function(c) {
        return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
      }).join(''));
    } else {
      setOut(inEl.value.replace(/\\u([0-9a-fA-F]{4})/g, function(match, grp) {
        return String.fromCharCode(parseInt(grp, 16));
      }));
    }
    showToast('Unicode 处理成功');
  };

  // ================= 文件导入与导出 =================
  var fileInput = document.getElementById('file-input');

  window.txtImport = function () { fileInput.click(); };

  fileInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (file) readFile(file);
    this.value = '';
  });

  // 拖拽支持
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    inBox.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  inBox.addEventListener('dragover', function() { inBox.classList.add('dragover'); });
  inBox.addEventListener('dragleave', function() { inBox.classList.remove('dragover'); });
  inBox.addEventListener('drop', function(e) {
    inBox.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var file = e.dataTransfer.files[0];
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        readFile(file);
      } else {
        showToast('请拖入 .txt / .md / .csv 文件');
      }
    }
  });

  function readFile(file) {
    if (file.size > 20 * 1024 * 1024) return showToast('文件过大，请限制在 20MB 以内');
    var reader = new FileReader();
    reader.onload = function(evt) {
      inEl.value = evt.target.result;
      updateStats();
      showToast('文件导入成功');
    };
    reader.readAsText(file);
  }

  window.copyResult = function () {
    if (!outEl.value) return showToast('结果为空');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outEl.value).then(function () {
        showToast('✅ 已复制到剪贴板');
      }).catch(function () {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      outEl.select(); document.execCommand('copy'); showToast('✅ 已复制到剪贴板');
    }
  };

  window.txtDownload = function () {
    var text = outEl.value || inEl.value;
    if (!text) return showToast('没有可保存的内容');
    
    var isMd = text.indexOf('# ') !== -1 || text.indexOf('- ') !== -1; // 简单猜测是否 Markdown
    var filename = 'text_export_' + Date.now() + (isMd ? '.md' : '.txt');
    
    var blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('文件已导出');
  };

  window.txtClear = function () {
    inEl.value = '';
    outEl.value = '';
    updateStats();
    showToast('已清空所有内容');
  };

  // ================= 快捷键支持 =================
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      // 默认执行去重？不好，Ctrl+Enter 一般是执行当前选中。
      // 既然没有单选，可以设为复制结果。
      if(outEl.value) window.copyResult();
    }
  });

  // 初始化
  updateStats();
})();