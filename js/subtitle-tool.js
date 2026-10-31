(function () {
  var inEl = document.getElementById('sb-input');
  var outEl = document.getElementById('sb-output');

  // 解析时间 "00:00:00,000" -> 毫秒
  function timeToMs(t) {
    var parts = t.trim().replace(',', '.').split(':');
    if (parts.length !== 3) return 0;
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    var sParts = parts[2].split('.');
    var s = parseInt(sParts[0], 10) || 0;
    var ms = parseInt(sParts[1] || 0, 10) || 0;
    return (h * 3600 + m * 60 + s) * 1000 + ms;
  }

  // 毫秒 -> 时间
  function msToTime(ms, format) {
    if (ms < 0) ms = 0;
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var millis = ms % 1000;
    
    var sep = format === 'vtt' ? '.' : ',';
    return String(h).padStart(2, '0') + ':' + 
           String(m).padStart(2, '0') + ':' + 
           String(s).padStart(2, '0') + sep + 
           String(millis).padStart(3, '0');
  }

  // 解析字幕文本为块
  function parseSubs(text) {
    // 替换掉 VTT 头部
    text = text.replace(/^WEBVTT.*\n/, '');
    var blocks = text.trim().split(/\n\s*\n/);
    var result = [];
    
    blocks.forEach(function (block) {
      var lines = block.split('\n');
      if (lines.length >= 2) {
        var timeLine = lines.find(function(l) { return l.indexOf('-->') !== -1; });
        if (timeLine) {
          var times = timeLine.split('-->');
          var start = timeToMs(times[0]);
          var end = timeToMs(times[1]);
          var textContent = lines.slice(lines.indexOf(timeLine) + 1).join('\n');
          result.push({ start: start, end: end, text: textContent });
        }
      }
    });
    return result;
  }

  // 渲染为指定格式
  function renderSubs(subs, format) {
    return subs.map(function (sub, i) {
      var idx = format === 'srt' ? (i + 1) + '\n' : '';
      var start = msToTime(sub.start, format);
      var end = msToTime(sub.end, format);
      return idx + start + ' --> ' + end + '\n' + sub.text;
    }).join('\n\n');
  }

  function update(shiftMs, format) {
    var inputText = inEl.value.trim();
    if (!inputText) return;
    
    var subs = parseSubs(inputText);
    
    if (shiftMs !== 0) {
      subs.forEach(function (sub) {
        sub.start = Math.max(0, sub.start + shiftMs);
        sub.end = Math.max(0, sub.end + shiftMs);
      });
    }
    
    outEl.value = renderSubs(subs, format);
  }

  // 事件绑定
  document.getElementById('btn-shift-add').addEventListener('click', function() {
    var sec = parseFloat(document.getElementById('sb-shift').value) || 0;
    update(sec * 1000, 'srt');
  });

  document.getElementById('btn-shift-sub').addEventListener('click', function() {
    var sec = parseFloat(document.getElementById('sb-shift').value) || 0;
    update(-sec * 1000, 'srt');
  });

  document.getElementById('btn-to-srt').addEventListener('click', function() { update(0, 'srt'); });
  document.getElementById('btn-to-vtt').addEventListener('click', function() { update(0, 'vtt'); });

  document.getElementById('btn-replace').addEventListener('click', function() {
    var find = document.getElementById('sb-find').value;
    var rep = document.getElementById('sb-replace').value;
    if (!find) return;
    var subs = parseSubs(inEl.value);
    subs.forEach(function(s) {
      s.text = s.text.split(find).join(rep);
    });
    outEl.value = renderSubs(subs, 'srt');
  });

  // 默认示例
  inEl.value = `1\n00:00:01,000 --> 00:00:04,000\n你好，欢迎来到工具站！\n\n2\n00:00:05,500 --> 00:00:08,000\n这是一个字幕测试。\n\n3\n00:00:10,000 --> 00:00:12,000\n请点击按钮进行平移。`;
  update(0, 'srt');
})();