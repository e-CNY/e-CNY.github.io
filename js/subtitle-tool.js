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

  // ================= DOM 元素 =================
  var inEl = document.getElementById('sb-input');
  var outEl = document.getElementById('sb-output');
  var fileInput = document.getElementById('file-input');
  var msgIn = document.getElementById('msg-in');
  
  var statBlocks = document.getElementById('stat-blocks');
  var statChars = document.getElementById('stat-chars');
  
  var tabText = document.querySelector('[data-view="text"]');
  var tabVisual = document.querySelector('[data-view="visual"]');
  var viewText = document.getElementById('view-text');
  var viewVisual = document.getElementById('view-visual');
  var visualList = document.getElementById('visual-list');

  var inputBox = document.querySelector('.sb-editor-col');
  var currentFormat = 'srt';

  // ================= 解析与渲染核心 =================
  // 解析时间 "00:00:00,000" / "00:00:00.000" -> 毫秒
  function timeToMs(t) {
    var parts = t.trim().replace(',', '.').split(':');
    if (parts.length !== 3) return 0;
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    var sParts = parts[2].split('.');
    var s = parseInt(sParts[0], 10) || 0;
    var ms = parseInt((sParts[1] || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
    return (h * 3600 + m * 60 + s) * 1000 + ms;
  }

  // 毫秒 -> 时间字符串
  function msToTime(ms, format) {
    if (ms < 0) ms = 0;
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var millis = ms % 1000;
    
    var sep = (format === 'vtt') ? '.' : ',';
    return String(h).padStart(2, '0') + ':' + 
           String(m).padStart(2, '0') + ':' + 
           String(s).padStart(2, '0') + sep + 
           String(millis).padStart(3, '0');
  }

  // 解析字幕文本
  function parseSubs(text) {
    // 兼容 VTT 格式
    if (text.indexOf('WEBVTT') === 0) {
      currentFormat = 'vtt';
      text = text.replace(/^WEBVTT.*?\n\n/s, ''); // 去掉头部
    } else {
      currentFormat = 'srt';
    }

    var blocks = text.trim().split(/\n\s*\n/);
    var result = [];
    
    blocks.forEach(function (block, index) {
      var lines = block.split('\n');
      var timeLineIdx = -1;
      
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('-->') !== -1) {
          timeLineIdx = i; break;
        }
      }
      
      if (timeLineIdx !== -1) {
        var timeLine = lines[timeLineIdx];
        var times = timeLine.split('-->');
        var startStr = times[0].trim();
        var endStr = times[1].trim().split(' ')[0]; // 去掉可能存在的设置参数
        
        var start = timeToMs(startStr);
        var end = timeToMs(endStr);
        var textContent = lines.slice(timeLineIdx + 1).join('\n');
        
        result.push({ 
          index: index + 1, 
          start: start, 
          end: end, 
          text: textContent,
          rawStart: startStr,
          rawEnd: endStr
        });
      }
    });
    return result;
  }

  // 渲染为指定格式
  function renderSubs(subs, format) {
    var out = [];
    if (format === 'vtt') {
      out.push('WEBVTT\n');
    }
    
    return (format === 'vtt' ? 'WEBVTT\n\n' : '') + subs.map(function (sub, i) {
      var idx = (format === 'srt') ? (i + 1) + '\n' : '';
      var start = msToTime(sub.start, format);
      var end = msToTime(sub.end, format);
      return idx + start + ' --> ' + end + '\n' + sub.text;
    }).join('\n\n');
  }

  // ================= 主流程与视图更新 =================
  function updateStatsAndVisual(subs) {
    statBlocks.textContent = subs.length;
    statChars.textContent = inEl.value.length;

    // 更新可视化列表
    visualList.innerHTML = '';
    if (subs.length === 0) {
      visualList.innerHTML = '<p class="sb-empty">未解析到字幕数据...</p>';
      return;
    }
    
    subs.forEach(function(sub, i) {
      var div = document.createElement('div');
      div.className = 'sb-visual-item';
      
      var isTimeValid = sub.end > sub.start;
      var timeHtml = 
        '<div class="sb-visual-index">#' + (i + 1) + '</div>' +
        '<div class="sb-visual-time">' + msToTime(sub.start, 'srt') + '<br>↓<br>' + msToTime(sub.end, 'srt') + '</div>' +
        (isTimeValid ? '' : '<div class="sb-visual-error">⚠️ 结束时间早于开始</div>');

      div.innerHTML = 
        '<div class="sb-visual-info">' + timeHtml + '</div>' +
        '<div class="sb-visual-text">' + escapeHtml(sub.text) + '</div>';
      
      visualList.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 监听输入实时解析
  var debounceTimer;
  inEl.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      var subs = parseSubs(inEl.value);
      updateStatsAndVisual(subs);
      msgIn.textContent = ''; // 清除错误
    }, 300);
  });

  // ================= 交互功能实现 =================

  // 1. 平移
  document.getElementById('btn-shift-add').addEventListener('click', function() { shiftTime(1); });
  document.getElementById('btn-shift-sub').addEventListener('click', function() { shiftTime(-1); });

  function shiftTime(direction) {
    var sec = parseFloat(document.getElementById('sb-shift').value) || 0;
    var msShift = sec * 1000 * direction;
    
    var subs = parseSubs(inEl.value);
    if (subs.length === 0) return showToast('没有可处理的有效字幕');
    
    subs.forEach(function (sub) {
      sub.start = Math.max(0, sub.start + msShift);
      sub.end = Math.max(0, sub.end + msShift);
    });
    
    outEl.value = renderSubs(subs, 'srt');
    updateStatsAndVisual(subs);
    showToast('已整体' + (direction > 0 ? '延后' : '提前') + ' ' + sec + ' 秒');
  }

  // 2. 消除时间空隙
  document.getElementById('btn-remove-gap').addEventListener('click', function() {
    var subs = parseSubs(inEl.value);
    if (subs.length < 2) return showToast('字幕数太少，无需处理');
    
    var offset = 0;
    for (var i = 1; i < subs.length; i++) {
      var prevEnd = subs[i - 1].end;
      var curStart = subs[i].start;
      
      if (curStart - prevEnd > 100 && curStart > offset) { // 间隔大于 100ms
        var gap = curStart - prevEnd;
        offset += gap;
        
        // 将当前及之后的所有字幕提前
        for (var j = i; j < subs.length; j++) {
          subs[j].start -= gap;
          subs[j].end -= gap;
          if (subs[j].start < 0) subs[j].start = 0;
          if (subs[j].end < 0) subs[j].end = 0;
        }
      }
    }
    
    outEl.value = renderSubs(subs, 'srt');
    updateStatsAndVisual(subs);
    showToast('已消除多余空隙，共压缩 ' + (offset / 1000).toFixed(1) + ' 秒');
  });

  // 3. 文本替换
  document.getElementById('btn-replace').addEventListener('click', function() {
    var find = document.getElementById('sb-find').value;
    var rep = document.getElementById('sb-replace').value;
    var useRegex = document.getElementById('chk-regex').checked;
    var caseSensitive = document.getElementById('chk-case').checked;
    
    if (!find) return showToast('请输入查找内容');
    
    var subs = parseSubs(inEl.value);
    if (subs.length === 0) return showToast('没有可处理的字幕');
    
    try {
      var reg;
      if (useRegex) {
        reg = new RegExp(find, caseSensitive ? 'g' : 'gi');
      } else {
        var escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        reg = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
      }
      
      subs.forEach(function(s) {
        s.text = s.text.replace(reg, rep);
      });
      
      outEl.value = renderSubs(subs, 'srt');
      updateStatsAndVisual(subs);
      showToast('替换完成');
    } catch(e) {
      showToast('正则表达式错误: ' + e.message);
    }
  });

  // 4. 格式转换
  document.getElementById('btn-to-srt').addEventListener('click', function() {
    var subs = parseSubs(inEl.value);
    outEl.value = renderSubs(subs, 'srt');
    showToast('已转为 SRT 格式');
  });

  document.getElementById('btn-to-vtt').addEventListener('click', function() {
    var subs = parseSubs(inEl.value);
    outEl.value = renderSubs(subs, 'vtt');
    showToast('已转为 VTT 格式');
  });

  // ================= 文件导入导出与复制 =================
  
  window.importFile = function() { fileInput.click(); };

  fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) readFile(file);
    this.value = '';
  });

  // 拖拽支持
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    inputBox.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  inputBox.addEventListener('dragover', function() { inputBox.classList.add('dragover'); });
  inputBox.addEventListener('dragleave', function() { inputBox.classList.remove('dragover'); });
  inputBox.addEventListener('drop', function(e) {
    inputBox.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var file = e.dataTransfer.files[0];
      if (file.name.endsWith('.srt') || file.name.endsWith('.vtt') || file.name.endsWith('.txt')) {
        readFile(file);
      } else {
        showToast('请拖入 .srt / .vtt / .txt 文件');
      }
    }
  });

  function readFile(file) {
    if (file.size > 20 * 1024 * 1024) return showToast('文件过大，请限制在 20MB 以内');
    var reader = new FileReader();
    reader.onload = function(evt) {
      inEl.value = evt.target.result;
      inEl.dispatchEvent(new Event('input')); // 触发解析
      showToast('文件导入成功');
    };
    reader.readAsText(file);
  }

  window.downloadSub = function(format) {
    var text = outEl.value;
    if (!text) {
      // 如果输出为空，尝试转换当前输入再下载
      var subs = parseSubs(inEl.value);
      if (subs.length === 0) return showToast('没有可导出的字幕内容');
      text = renderSubs(subs, format);
    }
    
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'subtitle_' + Date.now() + '.' + format;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('文件已导出');
  };

  window.copyResult = function() {
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

  window.clearAll = function() {
    inEl.value = '';
    outEl.value = '';
    updateStatsAndVisual([]);
    showToast('已清空');
  };

  // 视图切换
  tabText.addEventListener('click', function() {
    tabText.classList.add('active');
    tabVisual.classList.remove('active');
    viewText.classList.add('active');
    viewVisual.classList.remove('active');
  });

  tabVisual.addEventListener('click', function() {
    tabVisual.classList.add('active');
    tabText.classList.remove('active');
    viewVisual.classList.add('active');
    viewText.classList.remove('active');
  });

  // ================= 初始化 =================
  inEl.value = `1
00:00:01,000 --> 00:00:04,000
你好，欢迎来到工具站！

2
00:00:05,500 --> 00:00:08,000
这是一个字幕测试。

3
00:00:10,000 --> 00:00:12,000
请点击按钮进行平移。`;

  // 触发首次解析
  inEl.dispatchEvent(new Event('input'));
  outEl.value = inEl.value;

})();