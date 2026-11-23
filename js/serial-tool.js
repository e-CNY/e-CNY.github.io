/* js/serial-tool.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var THEME_KEY = 'serial_tool_theme_v1';
  var MACRO_KEY = 'serial_tool_macros_v1';
  var HISTORY_KEY = 'serial_tool_history_v1';
  var MAX_TERM_LINES = 2000;
  var MAX_HISTORY = 30;

  /* ================= 状态 ================= */
  var state = {
    port: null,
    reader: null,
    keepReading: false,
    rxFormat: 'text',
    txFormat: 'text',
    theme: 'light',
    macros: [],
    history: [],
    historyIdx: -1,
    rxBytes: 0,
    txBytes: 0,
    loopTimer: null,
    termLines: 0,
    connected: false
  };

  var els = {};
  var toastTimer = null;

  /* ================= 工具 ================= */
  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 1800);
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function formatTime() {
    var d = new Date();
    return '[' + String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0') + '.' +
      String(d.getMilliseconds()).padStart(3, '0') + ']';
  }

  /* ================= 终端 ================= */
  function log(text, type) {
    if (!els.terminal) return;

    // 首次写日志时移除提示
    var hint = els.terminal.querySelector('.se-terminal-hint');
    if (hint) hint.remove();

    // 过滤
    if (type === 'rx' && !els.optShowRx.checked) return;
    if (type === 'tx' && !els.optShowTx.checked) return;

    var line = document.createElement('div');
    line.className = 'se-term-line ' + (type || '');

    var html = '';
    if (els.optTimestamp.checked && (type === 'rx' || type === 'tx')) {
      html += '<span class="se-time">' + formatTime() + '</span>';
    }
    var prefix = '';
    if (type === 'rx') prefix = '← ';
    else if (type === 'tx') prefix = '→ ';
    html += escapeHtml(prefix + text);

    line.innerHTML = html;
    els.terminal.appendChild(line);
    state.termLines++;

    // 限制行数
    if (state.termLines > MAX_TERM_LINES) {
      var first = els.terminal.firstChild;
      if (first && first !== hint) {
        first.remove();
        state.termLines--;
      }
    }

    // 自动滚动
    if (els.optAutoscroll.checked) {
      els.terminal.scrollTop = els.terminal.scrollHeight;
    }
  }

  function updateStats() {
    if (els.termStats) {
      els.termStats.textContent = 'RX: ' + formatBytes(state.rxBytes) +
        ' · TX: ' + formatBytes(state.txBytes);
    }
  }

  function updateStatus(status, msg) {
    if (els.statusDot) {
      els.statusDot.className = 'se-status-dot' + (status === 'connected' ? ' connected' : (status === 'error' ? ' error' : ''));
    }
    if (els.statusText) {
      els.statusText.textContent = msg;
    }
  }

  /* ================= Hex 转换 ================= */
  function bytesToHex(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      out.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
    }
    return out.join(' ');
  }

  function hexToBytes(hexStr) {
    var clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length % 2 !== 0) {
      throw new Error('Hex 字符串长度必须是偶数');
    }
    var bytes = new Uint8Array(clean.length / 2);
    for (var i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
    }
    return bytes;
  }

  /* ================= 连接 ================= */
  async function connect() {
    if (!('serial' in navigator)) {
      showToast('当前浏览器不支持 Web Serial API，请使用 Chrome / Edge 89+');
      log('当前浏览器不支持 Web Serial API，请使用 Chrome 或 Edge。', 'error');
      return;
    }

    try {
      var port = await navigator.serial.requestPort();
      var opts = {
        baudRate: parseInt(els.baudrate.value, 10),
        dataBits: parseInt(els.databits.value, 10),
        stopBits: parseInt(els.stopbits.value, 10),
        parity: els.parity.value,
        flowControl: els.flow.value,
        bufferSize: 65536
      };

      log('正在打开串口 ' + opts.baudRate + ' baud, ' +
        opts.dataBits + 'N' + opts.stopBits + '...', 'sys');

      await port.open(opts);

      state.port = port;
      state.connected = true;
      state.keepReading = true;

      els.btnConnect.disabled = true;
      els.btnDisconnect.disabled = false;
      els.btnSend.disabled = false;
      // 锁定连接参数
      [els.baudrate, els.databits, els.stopbits, els.parity, els.flow].forEach(function (el) {
        el.disabled = true;
      });

      updateStatus('connected', '已连接 · ' + opts.baudRate + ' baud');
      log('✅ 串口已连接 · ' + opts.baudRate + ' baud · ' + opts.dataBits + 'N' + opts.stopBits, 'sys');
      showToast('✅ 已连接');

      // 启动读取循环
      readLoop(port);

      // 启动断开检测（防止设备拔出时无提示）
      watchDisconnect(port);

    } catch (err) {
      console.error('[connect error]', err);
      if (err.name === 'NotFoundError' || (err.message && err.message.indexOf('No port selected') >= 0)) {
        // 用户取消，不算错误
        return;
      }
      updateStatus('error', '连接失败');
      log('❌ 连接失败: ' + (err.message || err), 'error');
      showToast('❌ 连接失败：' + (err.message || err));
    }
  }

  async function readLoop(port) {
    var reader;
    try {
      // 使用原始 reader（不用 TextDecoderStream，更灵活）
      var readable = port.readable;
      if (!readable) {
        log('❌ port.readable 为空', 'error');
        return;
      }
      reader = readable.getReader();
      state.reader = reader;

      var buffer = new Uint8Array(0);
      var lastFlushTime = 0;
      var pendingBytes = 0;

      while (state.keepReading) {
        var result = await reader.read();
        if (result.done) break;
        if (result.value && result.value.length > 0) {
          var chunk = result.value;
          state.rxBytes += chunk.length;

          // 累积并尝试解码
          if (state.rxFormat === 'hex') {
            // Hex 模式：每条立即显示
            log(bytesToHex(chunk), 'rx');
          } else {
            // 文本模式：按字符流处理，flush 时显示
            var newBuf = new Uint8Array(buffer.length + chunk.length);
            newBuf.set(buffer, 0);
            newBuf.set(chunk, buffer.length);
            buffer = newBuf;

            // 简单策略：每 30ms 或遇到换行时 flush
            var now = Date.now();
            var hasNewline = false;
            for (var i = 0; i < chunk.length; i++) {
              if (chunk[i] === 10) { hasNewline = true; break; }
            }
            if (hasNewline || now - lastFlushTime > 30 || buffer.length > 1024) {
              // 尝试 UTF-8 解码
              try {
                var text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
                if (text) {
                  // 按行拆分显示（保留换行）
                  var lines = text.split('\n');
                  for (var j = 0; j < lines.length; j++) {
                    if (lines[j].length > 0) log(lines[j], 'rx');
                  }
                }
                buffer = new Uint8Array(0);
                lastFlushTime = now;
              } catch (e) {
                console.error('[decode error]', e);
                buffer = new Uint8Array(0);
              }
            }
          }
          updateStats();
        }
      }
    } catch (err) {
      if (state.keepReading) {
        // 非主动断开
        console.error('[read error]', err);
        if (err.name !== 'NetworkError' && err.message.indexOf('The device has been lost') < 0) {
          log('❌ 读取中断: ' + (err.message || err), 'error');
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (e) {}
    }
  }

  async function watchDisconnect(port) {
    // 监听 navigator.serial 的断开事件
    if (!('serial' in navigator)) return;
    navigator.serial.addEventListener('disconnect', function (e) {
      if (state.port && e.target === state.port) {
        log('⚠️ 设备已断开', 'error');
        updateStatus('error', '设备已断开');
        handleDisconnected();
      }
    });
  }

  async function disconnect() {
    state.keepReading = false;
    stopLoopSend();

    try {
      if (state.reader) {
        try { await state.reader.cancel(); } catch (e) {}
        try { state.reader.releaseLock(); } catch (e) {}
        state.reader = null;
      }
      if (state.port) {
        try { await state.port.close(); } catch (e) {
          // 可能已断开
        }
        state.port = null;
      }
    } catch (err) {
      console.error('[disconnect error]', err);
    }

    handleDisconnected();
  }

  function handleDisconnected() {
    state.connected = false;
    state.keepReading = false;
    els.btnConnect.disabled = false;
    els.btnDisconnect.disabled = true;
    els.btnSend.disabled = true;
    [els.baudrate, els.databits, els.stopbits, els.parity, els.flow].forEach(function (el) {
      el.disabled = false;
    });
    updateStatus('', '未连接');
    log('🔌 串口已断开', 'sys');
    showToast('已断开');
  }

  /* ================= 发送 ================= */
  function getLineEnding() {
    switch (els.lineEnding.value) {
      case 'lf': return '\n';
      case 'cr': return '\r';
      case 'crlf': return '\r\n';
      default: return '';
    }
  }

  async function send() {
    if (!state.port || !state.port.writable) {
      showToast('❌ 串口未打开');
      return;
    }

    var raw = els.sendInput.value;
    if (!raw && state.txFormat !== 'hex') {
      // 允许发送空行（仅行尾）
    }

    var payload;
    try {
      if (state.txFormat === 'hex') {
        // Hex 模式下，raw 里可能已含空格/逗号，去掉非 hex 字符
        var bytes = hexToBytes(raw);
        // 行尾不加到 hex 数据里（除非用户明确输入）
        payload = bytes;
      } else {
        var text = raw + getLineEnding();
        payload = new TextEncoder().encode(text);
      }
    } catch (e) {
      showToast('❌ ' + e.message);
      log('❌ ' + e.message, 'error');
      return;
    }

    try {
      var writer = state.port.writable.getWriter();
      await writer.write(payload);
      writer.releaseLock();

      state.txBytes += payload.length;
      updateStats();

      // 显示 TX
      if (state.txFormat === 'hex') {
        log(bytesToHex(payload), 'tx');
      } else {
        var displayText = raw;
        log(displayText, 'tx');
      }

      // 加入发送历史
      addToHistory(raw);

    } catch (err) {
      console.error('[send error]', err);
      showToast('❌ 发送失败：' + (err.message || err));
      log('❌ 发送失败: ' + (err.message || err), 'error');
    }
  }

  /* ================= 循环发送 ================= */
  function startLoopSend() {
    stopLoopSend();
    if (!els.optLoopSend.checked) return;
    var interval = Math.max(100, Math.min(60000, parseInt(els.loopInterval.value, 10) || 1000));
    state.loopTimer = setInterval(function () {
      if (state.port && state.connected) {
        send();
      } else {
        stopLoopSend();
      }
    }, interval);
    showToast('🔁 循环发送中（' + interval + 'ms）');
  }

  function stopLoopSend() {
    if (state.loopTimer) {
      clearInterval(state.loopTimer);
      state.loopTimer = null;
    }
  }

  /* ================= 宏 ================= */
  function loadMacros() {
    try {
      var raw = localStorage.getItem(MACRO_KEY);
      state.macros = raw ? JSON.parse(raw) : [];
    } catch (e) { state.macros = []; }
    if (!Array.isArray(state.macros)) state.macros = [];
  }
  function saveMacros() {
    try {
      localStorage.setItem(MACRO_KEY, JSON.stringify(state.macros));
    } catch (e) {}
  }
  function renderMacros() {
    if (state.macros.length === 0) {
      els.macroList.innerHTML = '';
      return;
    }
    var html = '';
    state.macros.forEach(function (m, i) {
      html += '<div class="se-macro-item">' +
        '<button class="se-macro-item-btn" data-macro-idx="' + i + '" type="button" title="' + escapeHtml(m.content) + '">' +
          escapeHtml(m.name) +
        '</button>' +
        '<button class="se-macro-item-del" data-macro-del="' + i + '" type="button" title="删除">✕</button>' +
        '</div>';
    });
    els.macroList.innerHTML = html;
  }
  function addMacro() {
    var name = els.macroName.value.trim();
    var content = els.macroContent.value.trim();
    if (!name || !content) {
      showToast('名称和内容不能为空');
      return;
    }
    state.macros.push({ name: name, content: content });
    saveMacros();
    renderMacros();
    els.macroName.value = '';
    els.macroContent.value = '';
    showToast('已添加宏');
  }
  function applyMacro(idx) {
    var m = state.macros[idx];
    if (!m) return;
    if (!state.connected) {
      showToast('请先连接串口');
      return;
    }
    els.sendInput.value = m.content;
    send();
  }

  /* ================= 历史 ================= */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      state.history = raw ? JSON.parse(raw) : [];
    } catch (e) { state.history = []; }
    if (!Array.isArray(state.history)) state.history = [];
  }
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }
  function addToHistory(text) {
    if (!text) return;
    state.history = state.history.filter(function (h) { return h !== text; });
    state.history.unshift(text);
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    state.historyIdx = -1;
    saveHistory();
  }
  function showHistory() {
    var list = els.historyList;
    if (state.history.length === 0) {
      list.innerHTML = '';
    } else {
      var html = '';
      state.history.forEach(function (h, i) {
        html += '<div class="se-history-item" data-idx="' + i + '">' + escapeHtml(h) + '</div>';
      });
      list.innerHTML = html;
    }
    els.historyPopover.hidden = false;
  }
  function hideHistory() {
    els.historyPopover.hidden = true;
  }

  /* ================= 主题 ================= */
  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') state.theme = t;
    } catch (e) {}
    applyTheme();
  }
  function applyTheme() {
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    if (els.btnTheme) els.btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  /* ================= 导出 / 清空 ================= */
  function clearTerminal() {
    if (state.termLines === 0) return;
    if (!confirm('清空终端内容？')) return;
    els.terminal.innerHTML = '';
    state.termLines = 0;
    log('终端已清空', 'sys');
  }

  function exportTerminal() {
    var text = els.terminal.innerText || '';
    if (!text.trim()) {
      showToast('终端为空');
      return;
    }
    var d = new Date();
    var ts = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
      + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'serial-log-' + ts + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📥 已导出');
  }

  /* ================= DOM 缓存 ================= */
  function cacheEls() {
    els.statusDot = $('status-dot');
    els.statusText = $('status-text');
    els.btnTheme = $('btn-theme');

    els.baudrate = $('se-baudrate');
    els.databits = $('se-databits');
    els.stopbits = $('se-stopbits');
    els.parity = $('se-parity');
    els.flow = $('se-flow');
    els.btnConnect = $('btn-connect');
    els.btnDisconnect = $('btn-disconnect');

    els.segRxFormat = $('seg-rx-format');
    els.optTimestamp = $('opt-timestamp');
    els.optAutoscroll = $('opt-autoscroll');
    els.optShowRx = $('opt-show-rx');
    els.optShowTx = $('opt-show-tx');

    els.macroList = $('macro-list');
    els.macroName = $('macro-name');
    els.macroContent = $('macro-content');
    els.btnAddMacro = $('btn-add-macro');

    els.terminal = $('se-terminal');
    els.termStats = $('term-stats');
    els.btnClearTerm = $('btn-clear-term');
    els.btnExportTerm = $('btn-export-term');

    els.sendInput = $('se-send-input');
    els.btnSend = $('btn-send');
    els.segTxFormat = $('seg-tx-format');
    els.lineEnding = $('se-line-ending');
    els.optLoopSend = $('opt-loop-send');
    els.loopInterval = $('se-loop-interval');
    els.btnSendHistory = $('btn-send-history');

    els.historyPopover = $('history-popover');
    els.historyList = $('history-list');
    els.btnClearHistory = $('btn-clear-history');

    els.toast = $('se-toast');
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // 连接 / 断开
    els.btnConnect.addEventListener('click', connect);
    els.btnDisconnect.addEventListener('click', disconnect);

    // 接收格式切换
    els.segRxFormat.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-format]');
      if (!btn) return;
      Array.prototype.forEach.call(els.segRxFormat.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.rxFormat = btn.dataset.format;
    });

    // 发送格式切换
    els.segTxFormat.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-format]');
      if (!btn) return;
      Array.prototype.forEach.call(els.segTxFormat.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      state.txFormat = btn.dataset.format;
      els.sendInput.placeholder = state.txFormat === 'hex'
        ? '输入十六进制，如 48 65 6C 6C 6F（空格可省略）'
        : '输入要发送的内容，Ctrl+Enter 发送…';
    });

    // 发送
    els.btnSend.addEventListener('click', send);
    els.sendInput.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        send();
      } else if (e.key === 'ArrowUp' && !e.shiftKey && els.sendInput.selectionStart === 0) {
        // 上键调出历史
        if (state.history.length === 0) return;
        e.preventDefault();
        state.historyIdx = Math.min(state.history.length - 1, state.historyIdx + 1);
        els.sendInput.value = state.history[state.historyIdx];
        els.sendInput.setSelectionRange(els.sendInput.value.length, els.sendInput.value.length);
      } else if (e.key === 'ArrowDown' && !e.shiftKey) {
        if (state.historyIdx < 0) return;
        e.preventDefault();
        state.historyIdx--;
        if (state.historyIdx < 0) {
          els.sendInput.value = '';
        } else {
          els.sendInput.value = state.history[state.historyIdx];
        }
      }
    });

    // 循环发送
    els.optLoopSend.addEventListener('change', function () {
      if (this.checked) startLoopSend();
      else stopLoopSend();
    });
    els.loopInterval.addEventListener('change', function () {
      if (els.optLoopSend.checked) startLoopSend();
    });

    // 历史下拉
    els.btnSendHistory.addEventListener('click', function (e) {
      e.stopPropagation();
      if (els.historyPopover.hidden) showHistory();
      else hideHistory();
    });
    els.historyList.addEventListener('click', function (e) {
      var item = e.target.closest('.se-history-item');
      if (!item) return;
      var idx = parseInt(item.dataset.idx, 10);
      if (!isNaN(idx) && state.history[idx] !== undefined) {
        els.sendInput.value = state.history[idx];
        els.sendInput.focus();
      }
      hideHistory();
    });
    els.btnClearHistory.addEventListener('click', function () {
      state.history = [];
      saveHistory();
      showHistory();
      showToast('历史已清空');
    });
    document.addEventListener('click', function (e) {
      if (!els.historyPopover.hidden &&
          !els.historyPopover.contains(e.target) &&
          e.target !== els.btnSendHistory) {
        hideHistory();
      }
    });

    // 宏
    els.btnAddMacro.addEventListener('click', addMacro);
    els.macroList.addEventListener('click', function (e) {
      var del = e.target.closest('[data-macro-del]');
      if (del) {
        e.stopPropagation();
        var idx = parseInt(del.dataset.macroDel, 10);
        if (!isNaN(idx)) {
          state.macros.splice(idx, 1);
          saveMacros();
          renderMacros();
        }
        return;
      }
      var btn = e.target.closest('[data-macro-idx]');
      if (btn) {
        applyMacro(parseInt(btn.dataset.macroIdx, 10));
      }
    });
    els.macroContent.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addMacro();
      }
    });

    // 终端操作
    els.btnClearTerm.addEventListener('click', clearTerminal);
    els.btnExportTerm.addEventListener('click', exportTerminal);

    // 主题
    els.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
      applyTheme();
    });

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      // Esc 关闭历史下拉
      if (e.key === 'Escape' && !els.historyPopover.hidden) {
        hideHistory();
      }
      // Ctrl+L 清空终端（避免浏览器地址栏冲突，用 Ctrl+Shift+L）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        clearTerminal();
      }
    });

    // 页面卸载时断开
    window.addEventListener('beforeunload', function () {
      if (state.port) {
        state.keepReading = false;
        try { state.port.close(); } catch (e) {}
      }
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheEls();
    loadTheme();
    loadMacros();
    loadHistory();
    renderMacros();
    updateStats();
    bindEvents();

    // 检查 Web Serial 支持
    if (!('serial' in navigator)) {
      els.btnConnect.disabled = true;
      els.btnConnect.textContent = '❌ 浏览器不支持';
      updateStatus('error', '浏览器不支持 Web Serial');
      log('⚠️ 当前浏览器不支持 Web Serial API，请使用 Chrome / Edge 89+ 桌面版。', 'error');
      log('提示：某些环境（如 http:// 页面、iframe、隐私模式）可能禁用了该 API。', 'sys');
    } else {
      updateStatus('', '准备就绪');
      log('💡 提示：点击「连接串口」后，浏览器会弹出串口选择窗口。', 'sys');
      log('首次使用需要授予串口访问权限。', 'sys');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();