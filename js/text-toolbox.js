(function () {
  var inEl = document.getElementById('txt-in');
  var outEl = document.getElementById('txt-out');

  function getLines() { return inEl.value.split('\n'); }
  function setOut(str) { outEl.value = str; }

  window.txtDedupe = function () {
    var lines = getLines();
    var unique = [];
    var seen = {};
    lines.forEach(function(line) {
      if (!seen[line]) { seen[line] = true; unique.push(line); }
    });
    setOut(unique.join('\n'));
  };

  window.txtSort = function (dir) {
    var lines = getLines();
    lines.sort(function(a, b) {
      if (dir === 'asc') return a.localeCompare(b);
      else return b.localeCompare(a);
    });
    setOut(lines.join('\n'));
  };

  window.txtCase = function (type) {
    if (type === 'upper') setOut(inEl.value.toUpperCase());
    else setOut(inEl.value.toLowerCase());
  };

  window.txtTrim = function () {
    var lines = getLines().map(function(l) { return l.trim(); });
    setOut(lines.join('\n'));
  };

  window.txtLineNumber = function () {
    var lines = getLines();
    var res = lines.map(function(l, i) { return (i + 1) + '. ' + l; });
    setOut(res.join('\n'));
  };

  window.txtWrap = function () {
    var lines = getLines();
    var res = lines.map(function(l) { return l ? '"' + l + '"' : '""'; });
    setOut(res.join('\n'));
  };

  window.txtClear = function () {
    inEl.value = ''; outEl.value = '';
  };
})();