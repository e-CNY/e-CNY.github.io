(function () {
  var inEl = document.getElementById('txt-in');
  var outEl = document.getElementById('txt-out');

  // 兼容不同系统的换行符（解决 Windows 拷贝过来带的 \r 问题）
  function getLines() {
    return inEl.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  }

  function setOut(str) {
    outEl.value = str;
  }

  // 去重 (使用 Set 解决特殊字符串触发对象原型链的问题)
  window.txtDedupe = function () {
    var lines = getLines();
    var unique = Array.from(new Set(lines));
    setOut(unique.join('\n'));
  };

  // 排序 (加入 numeric: true 让数字能够按大小正常排序，比如 2 在 10 前面)
  window.txtSort = function (dir) {
    var lines = getLines();
    lines.sort(function(a, b) {
      var options = { numeric: true, sensitivity: 'base' };
      if (dir === 'asc') {
        return a.localeCompare(b, undefined, options);
      } else {
        return b.localeCompare(a, undefined, options);
      }
    });
    setOut(lines.join('\n'));
  };

  // 大小写转换
  window.txtCase = function (type) {
    if (type === 'upper') setOut(inEl.value.toUpperCase());
    else setOut(inEl.value.toLowerCase());
  };

  // 去首尾空格
  window.txtTrim = function () {
    var lines = getLines().map(function(l) { return l.trim(); });
    setOut(lines.join('\n'));
  };

  // 加行号
  window.txtLineNumber = function () {
    var lines = getLines();
    var res = lines.map(function(l, i) { return (i + 1) + '. ' + l; });
    setOut(res.join('\n'));
  };

  // 包裹引号
  window.txtWrap = function () {
    var lines = getLines();
    var res = lines.map(function(l) { return l ? '"' + l + '"' : '""'; });
    setOut(res.join('\n'));
  };

  // 清空
  window.txtClear = function () {
    inEl.value = '';
    outEl.value = '';
  };
})();