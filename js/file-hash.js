/* js/file-hash.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var CHUNK_SIZE = 8 * 1024 * 1024; // 8MB / 片
  var LARGE_FILE_THRESHOLD = 200 * 1024 * 1024; // 200MB：SHA 系列全量读阈值
  var THEME_KEY = 'file_hash_theme_v1';
  var HISTORY_KEY = 'file_hash_history_v1';
  var CASE_KEY = 'file_hash_case_v1';
  var MAX_HISTORY = 30;

  /* ================= DOM ================= */
  function $(id) { return document.getElementById(id); }

  var dropZone = $('drop-zone');
  var fileInput = $('file-input');

  var optMd5 = $('opt-md5');
  var optSha1 = $('opt-sha1');
  var optSha256 = $('opt-sha256');
  var optSha384 = $('opt-sha384');
  var optSha512 = $('opt-sha512');
  var optCrc32 = $('opt-crc32');

  var progressContainer = $('progress-container');
  var progressBar = $('progress-bar');
  var progressText = $('progress-text');

  var resultBox = $('result-box');
  var infoName = $('info-name');
  var infoSize = $('info-size');
  var infoTime = $('info-time');
  var hashList = $('hash-list');

  var verifyInput = $('verify-input');
  var verifyResult = $('verify-result');
  var btnVerifyClear = $('btn-verify-clear');

  var btnCopyAll = $('btn-copy-all');
  var btnExport = $('btn-export');
  var btnReset = $('btn-reset');

  var textInput = $('text-input');
  var textHashList = $('text-hash-list');
  var textBytesInfo = $('text-bytes-info');
  var btnTextClear = $('btn-text-clear');

  var btnTheme = $('btn-theme');
  var btnCase = $('btn-case');
  var btnHistory = $('btn-history');
  var historyCountEl = $('history-count');
  var drawer = $('drawer');
  var drawerBackdrop = $('drawer-backdrop');
  var drawerClose = $('drawer-close');
  var drawerList = $('drawer-list');
  var clearHistoryBtn = $('clear-history');
  var toastEl = $('h-toast');

  /* ================= 状态 ================= */
  var state = {
    uppercase: false,
    theme: 'light',
    currentFile: null,
    currentHashes: null,
    history: []
  };

  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (!text) { showToast('没有可复制内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ 已复制');
    } catch (e) { showToast('❌ 复制失败'); }
  }

  /* ================= 主题 ================= */
  try { state.theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
  try { state.uppercase = localStorage.getItem(CASE_KEY) === '1'; } catch (e) {}

  function applyTheme() {
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }
  function applyCase() {
    btnCase.textContent = state.uppercase ? '🔡 大写' : '🔠 小写';
    // 更新所有已有哈希显示
    document.querySelectorAll('.hash-value').forEach(function (el) {
      if (!el.value) return;
      if (state.uppercase) {
        el.value = el.value.toUpperCase();
      } else {
        el.value = el.value.toLowerCase();
      }
    });
  }

  btnTheme.addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
    applyTheme();
  });
  btnCase.addEventListener('click', function () {
    state.uppercase = !state.uppercase;
    try { localStorage.setItem(CASE_KEY, state.uppercase ? '1' : '0'); } catch (e) {}
    applyCase();
  });

  /* ================= 历史记录 ================= */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      state.history = raw ? (JSON.parse(raw) || []) : [];
    } catch (e) { state.history = []; }
    if (!Array.isArray(state.history)) state.history = [];
    updateHistoryCount();
  }
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }
  function updateHistoryCount() {
    historyCountEl.textContent = state.history.length;
  }
  function addHistory(entry) {
    // entry: { name, size, hashes, ts }
    state.history = state.history.filter(function (h) {
      return !(h.name === entry.name && h.size === entry.size && h.hashKey === entry.hashKey);
    });
    state.history.unshift(entry);
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    saveHistory();
    updateHistoryCount();
  }
  function renderHistoryDrawer() {
    if (state.history.length === 0) {
      drawerList.innerHTML = '<p class="h-drawer-empty">暂无历史记录</p>';
      return;
    }
    var html = '';
    state.history.forEach(function (h, idx) {
      var time = new Date(h.ts);
      var timeStr = (time.getMonth() + 1) + '/' + time.getDate() + ' ' +
        String(time.getHours()).padStart(2, '0') + ':' +
        String(time.getMinutes()).padStart(2, '0');
      // 展示 SHA-256 或第一个可用哈希
      var key = '';
      var keys = Object.keys(h.hashes || {});
      for (var i = 0; i < keys.length; i++) {
        if (h.hashes[keys[i]]) { key = keys[i] + ': ' + h.hashes[keys[i]]; break; }
      }
      html += '<div class="h-drawer-item" data-idx="' + idx + '">' +
        '<div class="h-drawer-item-head">' +
          '<span class="h-drawer-item-name">' + escapeHtml(h.name) + '</span>' +
          '<span class="h-drawer-item-time">' + timeStr + '</span>' +
        '</div>' +
        '<div class="h-drawer-item-hash">' + escapeHtml(key) + '</div>' +
        '</div>';
    });
    drawerList.innerHTML = html;
  }
  function openDrawer() {
    renderHistoryDrawer();
    drawerBackdrop.hidden = false;
    drawer.classList.add('open');
  }
  function closeDrawer() {
    drawerBackdrop.hidden = true;
    drawer.classList.remove('open');
  }
  btnHistory.addEventListener('click', openDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
  clearHistoryBtn.addEventListener('click', function () {
    if (!confirm('清空全部历史记录？')) return;
    state.history = [];
    saveHistory();
    updateHistoryCount();
    renderHistoryDrawer();
    showToast('已清空历史');
  });
  drawerList.addEventListener('click', function (e) {
    var item = e.target.closest('.h-drawer-item');
    if (!item) return;
    var idx = parseInt(item.dataset.idx, 10);
    var h = state.history[idx];
    if (!h) return;
    // 回填到比对输入框
    var firstHash = '';
    var keys = Object.keys(h.hashes || {});
    for (var i = 0; i < keys.length; i++) {
      if (h.hashes[keys[i]]) { firstHash = h.hashes[keys[i]]; break; }
    }
    verifyInput.value = firstHash;
    closeDrawer();
    if (h.hashes && Object.keys(h.hashes).length > 0) {
      // 显示到结果区
      showHistoryResult(h);
    }
  });

  function showHistoryResult(h) {
    infoName.textContent = h.name;
    infoSize.textContent = formatBytes(h.size) + ' (' + h.size + ' 字节)';
    infoTime.textContent = h.duration ? h.duration + ' ms' : '-';
    renderHashes(h.hashes);
    state.currentHashes = h.hashes;
    resultBox.hidden = false;
    dropZone.style.display = 'none';
    // 触发一次对比
    doVerify();
  }

  /* ================= 工具函数 ================= */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function bufToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  /* ================= CRC32 ================= */
  var CRC32_TABLE = null;
  function makeCrc32Table() {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  }
  function crc32Update(state, bytes) {
    if (!CRC32_TABLE) CRC32_TABLE = makeCrc32Table();
    var crc = state;
    for (var i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return crc >>> 0;
  }
  function crc32Hex(crc) {
    return (crc >>> 0).toString(16).padStart(8, '0');
  }

  /* ================= 算法配置 ================= */
  function getSelectedAlgos() {
    var algos = [];
    if (optMd5.checked) algos.push('MD5');
    if (optSha1.checked) algos.push('SHA-1');
    if (optSha256.checked) algos.push('SHA-256');
    if (optSha384.checked) algos.push('SHA-384');
    if (optSha512.checked) algos.push('SHA-512');
    if (optCrc32.checked) algos.push('CRC32');
    return algos;
  }

  function needFullRead() {
    // 除了 MD5 和 CRC32 外，其余 SHA 系列需全量读（用 crypto.subtle）
    return optSha1.checked || optSha256.checked || optSha384.checked || optSha512.checked;
  }

  /* ================= 进度条 ================= */
  function setProgress(pct, text) {
    progressContainer.hidden = false;
    progressBar.style.width = pct + '%';
    if (text) progressText.textContent = text;
    else progressText.textContent = Math.round(pct) + '%';
  }
  function hideProgress() {
    progressContainer.hidden = true;
  }

  /* ================= 核心：计算哈希 ================= */
  /**
   * 计算文件的哈希
   * - MD5: 分片增量（spark-md5）
   * - CRC32: 分片增量
   * - SHA 系列: 使用 crypto.subtle 一次性处理（要求全量读入内存）
   */
  async function computeFileHashes(file, algos, onProgress) {
    var startTime = performance.now();
    var needFull = algos.some(function (a) { return a.indexOf('SHA') === 0; });
    var needIncremental = algos.indexOf('MD5') >= 0 || algos.indexOf('CRC32') >= 0;

    var result = {};
    var totalBytes = file.size;

    // 大文件保护：如果 > 200MB 且需要 SHA 系列，提示用户
    if (needFull && totalBytes > LARGE_FILE_THRESHOLD) {
      var shaList = algos.filter(function (a) { return a.indexOf('SHA') === 0; }).join('、');
      var proceed = confirm(
        '⚠️ 文件较大（' + formatBytes(totalBytes) + '）\n\n' +
        'SHA 系列算法（' + shaList + '）需要将整个文件读入内存，' +
        '可能耗时较长或占用大量内存。\n\n' +
        '是否继续？\n' +
        '建议：取消后只勾选 MD5 / CRC32 可获得最佳性能。'
      );
      if (!proceed) {
        throw new Error('用户取消了 SHA 系列计算，请仅选择 MD5 / CRC32 后重试');
      }
    }

    // 分片读取
    var offset = 0;
    var md5Spark = new SparkMD5.ArrayBuffer();
    var crc = 0;
    // SHA 系列需要累积所有分片
    var chunks = needFull ? [] : null;

    while (offset < totalBytes) {
      var end = Math.min(offset + CHUNK_SIZE, totalBytes);
      var slice = file.slice(offset, end);
      var buf = await slice.arrayBuffer();

      if (algos.indexOf('MD5') >= 0) md5Spark.append(buf);
      if (algos.indexOf('CRC32') >= 0) crc = crc32Update(crc, new Uint8Array(buf));
      if (needFull) chunks.push(buf);

      offset = end;
      onProgress(offset / totalBytes);
    }

    // 处理空文件
    if (totalBytes === 0) {
      if (algos.indexOf('MD5') >= 0) result['MD5'] = SparkMD5.ArrayBuffer.hash(new ArrayBuffer(0));
      if (algos.indexOf('CRC32') >= 0) result['CRC32'] = crc32Hex(0);
    } else {
      if (algos.indexOf('MD5') >= 0) result['MD5'] = md5Spark.end();
      if (algos.indexOf('CRC32') >= 0) result['CRC32'] = crc32Hex(crc);
    }

    // SHA 系列
    if (needFull) {
      var fullBuf = concatBuffers(chunks, totalBytes);
      chunks = null; // 释放引用
      if (algos.indexOf('SHA-1') >= 0) {
        var b1 = await crypto.subtle.digest('SHA-1', fullBuf);
        result['SHA-1'] = bufToHex(b1);
      }
      if (algos.indexOf('SHA-256') >= 0) {
        var b256 = await crypto.subtle.digest('SHA-256', fullBuf);
        result['SHA-256'] = bufToHex(b256);
      }
      if (algos.indexOf('SHA-384') >= 0) {
        var b384 = await crypto.subtle.digest('SHA-384', fullBuf);
        result['SHA-384'] = bufToHex(b384);
      }
      if (algos.indexOf('SHA-512') >= 0) {
        var b512 = await crypto.subtle.digest('SHA-512', fullBuf);
        result['SHA-512'] = bufToHex(b512);
      }
    }

    var duration = Math.round(performance.now() - startTime);
    return { hashes: result, duration: duration };
  }

  function concatBuffers(buffers, totalLen) {
    var out = new Uint8Array(totalLen);
    var offset = 0;
    for (var i = 0; i < buffers.length; i++) {
      out.set(new Uint8Array(buffers[i]), offset);
      offset += buffers[i].byteLength;
    }
    return out.buffer;
  }

  /* ================= 渲染哈希列表 ================= */
  function renderHashes(hashes) {
    var order = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'];
    var html = '';
    order.forEach(function (algo) {
      if (!hashes[algo]) return;
      var value = state.uppercase ? hashes[algo].toUpperCase() : hashes[algo].toLowerCase();
      var id = 'hash-' + algo.replace(/[^A-Za-z0-9]/g, '_');
      html += '<div class="hash-item" data-algo="' + algo + '">' +
        '<div class="hash-title">' +
          '<span>' + algo + '</span>' +
          '<span class="hash-status" data-status="' + algo + '"></span>' +
        '</div>' +
        '<div class="hash-value-wrap">' +
          '<input type="text" class="hash-value" id="' + id + '" value="' + escapeHtml(value) + '" readonly>' +
          '<button class="h-btn" data-copy="' + id + '" type="button">📋 复制</button>' +
        '</div>' +
        '</div>';
    });
    hashList.innerHTML = html;

    // 绑定复制按钮
    hashList.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = $(btn.dataset.copy);
        if (el) copyText(el.value);
      });
    });
  }

  /* ================= 处理文件 ================= */
  async function processFile(file) {
    var algos = getSelectedAlgos();
    if (algos.length === 0) {
      showToast('请至少选择一种哈希算法');
      return;
    }

    state.currentFile = file;

    // 重置 UI
    dropZone.style.display = 'none';
    resultBox.hidden = true;
    hideProgress();
    setProgress(0, '准备中…');

    infoName.textContent = file.name;
    infoSize.textContent = formatBytes(file.size) + ' (' + file.size + ' 字节)';
    infoTime.textContent = '-';

    try {
      var out = await computeFileHashes(file, algos, function (ratio) {
        var pct = Math.round(ratio * 100);
        setProgress(pct, '计算中 ' + pct + '%');
      });

      infoTime.textContent = out.duration + ' ms';
      renderHashes(out.hashes);
      state.currentHashes = out.hashes;

      setProgress(100, '完成');
      setTimeout(function () {
        hideProgress();
        resultBox.hidden = false;
      }, 300);

      // 保存历史
      addHistory({
        name: file.name,
        size: file.size,
        hashes: out.hashes,
        duration: out.duration,
        hashKey: out.hashes['SHA-256'] || out.hashes['MD5'] || '',
        ts: Date.now()
      });

      // 若比对框有内容，自动比对
      if (verifyInput.value.trim()) doVerify();

    } catch (err) {
      console.error(err);
      hideProgress();
      dropZone.style.display = 'block';
      showToast('❌ ' + err.message);
    }
  }

  /* ================= 事件：文件选择 ================= */
  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = ''; // 允许重新选同一文件
    }
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) {
        showToast('一次处理一个文件，已选择第一个');
      }
      processFile(e.dataTransfer.files[0]);
    }
  });

  /* ================= 哈希对比验证 ================= */
  function doVerify() {
    var expected = verifyInput.value.trim().toLowerCase();
    if (!expected) {
      verifyResult.innerHTML = '';
      // 清空匹配状态
      document.querySelectorAll('.hash-value').forEach(function (el) {
        el.classList.remove('match', 'no-match');
      });
      document.querySelectorAll('.hash-status').forEach(function (el) {
        el.textContent = '';
      });
      return;
    }

    if (!state.currentHashes) {
      verifyResult.innerHTML = '<span class="badge info">请先计算文件哈希</span>';
      return;
    }

    // 遍历所有已计算哈希，查找匹配
    var order = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'];
    var matched = [];
    var anyMatch = false;

    order.forEach(function (algo) {
      var val = state.currentHashes[algo];
      var el = hashList.querySelector('[data-algo="' + algo + '"] .hash-value');
      var statusEl = hashList.querySelector('[data-status="' + algo + '"]');
      if (!el) return;

      el.classList.remove('match', 'no-match');
      if (statusEl) statusEl.textContent = '';

      if (!val) return;

      var norm = val.toLowerCase();
      // 允许用户粘贴带 "algo:" 前缀，也允许只粘哈希值
      var expNorm = expected.replace(/^[a-z0-9-]+\s*[:：]\s*/i, '').trim();

      // 长度一致才比对（避免 CRC32 8 位与 SHA 64 位混淆）
      if (norm.length !== expNorm.length) return;

      if (norm === expNorm) {
        matched.push(algo);
        anyMatch = true;
        el.classList.add('match');
        if (statusEl) { statusEl.textContent = '✅ 匹配'; statusEl.classList.remove('fail'); }
      } else if (statusEl) {
        // 同长度的其他算法若长度也吻合但不等于，则标记
        // 这里只做匹配，不做"不匹配"标记（因为用户可能粘贴的是另一个算法的哈希）
      }
    });

    if (anyMatch) {
      verifyResult.innerHTML =
        '<span class="badge ok">✅ 匹配成功</span>' +
        '与 <b>' + matched.join(', ') + '</b> 一致';
    } else {
      // 判断是否长度合规
      var valid = expected.replace(/^[a-z0-9-]+\s*[:：]\s*/i, '').trim();
      var isHex = /^[a-f0-9]+$/i.test(valid);
      if (!isHex) {
        verifyResult.innerHTML = '<span class="badge fail">❌ 格式错误</span> 请输入十六进制哈希字符串';
      } else if (valid.length !== 8 && valid.length !== 32 && valid.length !== 40 && valid.length !== 64 && valid.length !== 96 && valid.length !== 128) {
        verifyResult.innerHTML = '<span class="badge fail">❌ 长度不符</span> 常见哈希长度：8(CRC32)/32(MD5)/40(SHA-1)/64(SHA-256)/96(SHA-384)/128(SHA-512)';
      } else {
        verifyResult.innerHTML = '<span class="badge fail">❌ 不匹配</span> 该哈希与上方所有结果都不一致';
      }
    }
  }

  verifyInput.addEventListener('input', doVerify);
  btnVerifyClear.addEventListener('click', function () {
    verifyInput.value = '';
    doVerify();
  });

  /* ================= 复制全部 / 导出 ================= */
  btnCopyAll.addEventListener('click', function () {
    if (!state.currentHashes) return;
    var lines = [];
    lines.push('文件：' + state.currentFile.name);
    lines.push('大小：' + formatBytes(state.currentFile.size));
    lines.push('时间：' + new Date().toLocaleString('zh-CN'));
    lines.push('');
    var order = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'];
    order.forEach(function (algo) {
      if (state.currentHashes[algo]) {
        var v = state.uppercase ? state.currentHashes[algo].toUpperCase() : state.currentHashes[algo].toLowerCase();
        lines.push(algo + ': ' + v);
      }
    });
    copyText(lines.join('\n'));
  });

  btnExport.addEventListener('click', function () {
    if (!state.currentHashes) return;
    var lines = ['字段,值'];
    lines.push('"文件名","' + (state.currentFile.name || '').replace(/"/g, '""') + '"');
    lines.push('"大小(字节)",' + state.currentFile.size);
    lines.push('"耗时(ms)",' + (state.currentHashes._duration || '-'));
    var order = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'];
    order.forEach(function (algo) {
      if (state.currentHashes[algo]) {
        var v = state.uppercase ? state.currentHashes[algo].toUpperCase() : state.currentHashes[algo].toLowerCase();
        lines.push('"' + algo + '","' + v + '"');
      }
    });
    var csv = lines.join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'file-hash-' + Date.now() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
    showToast('📤 已导出 CSV');
  });

  btnReset.addEventListener('click', function () {
    state.currentFile = null;
    state.currentHashes = null;
    resultBox.hidden = true;
    dropZone.style.display = 'block';
    verifyInput.value = '';
    verifyResult.innerHTML = '';
    fileInput.value = '';
    showToast('已重置');
  });

  /* ================= 文本哈希（实时计算） ================= */
  var textTimer = null;
  function computeTextHashes(text) {
    var algos = getSelectedAlgos();
    textHashList.innerHTML = '';

    if (!text) {
      textBytesInfo.textContent = '0 字节';
      return;
    }

    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    textBytesInfo.textContent = data.length + ' 字节';

    if (algos.length === 0) return;

    var result = {};
    if (algos.indexOf('MD5') >= 0) {
      var spark = new SparkMD5.ArrayBuffer();
      spark.append(data.buffer);
      result['MD5'] = spark.end();
    }
    if (algos.indexOf('CRC32') >= 0) {
      var crc = crc32Update(0, data);
      result['CRC32'] = crc32Hex(crc);
    }
    // SHA 系列
    (async function () {
      try {
        if (algos.indexOf('SHA-1') >= 0) {
          var b1 = await crypto.subtle.digest('SHA-1', data.buffer);
          result['SHA-1'] = bufToHex(b1);
        }
        if (algos.indexOf('SHA-256') >= 0) {
          var b256 = await crypto.subtle.digest('SHA-256', data.buffer);
          result['SHA-256'] = bufToHex(b256);
        }
        if (algos.indexOf('SHA-384') >= 0) {
          var b384 = await crypto.subtle.digest('SHA-384', data.buffer);
          result['SHA-384'] = bufToHex(b384);
        }
        if (algos.indexOf('SHA-512') >= 0) {
          var b512 = await crypto.subtle.digest('SHA-512', data.buffer);
          result['SHA-512'] = bufToHex(b512);
        }
        renderTextHashes(result);
      } catch (e) {
        console.error(e);
        showToast('文本哈希计算出错');
      }
    })();

    // MD5/CRC32 同步显示，SHA 异步补充
    renderTextHashes(result);
    // 稍后再渲染一次（覆盖异步填充的部分）
    setTimeout(function () { renderTextHashes(result); }, 80);
  }

  function renderTextHashes(hashes) {
    var order = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'];
    var html = '';
    order.forEach(function (algo) {
      if (!hashes[algo]) return;
      var value = state.uppercase ? hashes[algo].toUpperCase() : hashes[algo].toLowerCase();
      var id = 'thash-' + algo.replace(/[^A-Za-z0-9]/g, '_');
      html += '<div class="hash-item" data-algo="' + algo + '">' +
        '<div class="hash-title">' + algo + '</div>' +
        '<div class="hash-value-wrap">' +
          '<input type="text" class="hash-value" id="' + id + '" value="' + escapeHtml(value) + '" readonly>' +
          '<button class="h-btn" data-text-copy="' + id + '" type="button">📋 复制</button>' +
        '</div>' +
        '</div>';
    });
    textHashList.innerHTML = html;
    textHashList.querySelectorAll('[data-text-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = $(btn.dataset.textCopy);
        if (el) copyText(el.value);
      });
    });
  }

  textInput.addEventListener('input', function () {
    clearTimeout(textTimer);
    var text = textInput.value;
    // 立即更新字节数
    var encoder = new TextEncoder();
    textBytesInfo.textContent = encoder.encode(text).length + ' 字节';
    // debounce
    textTimer = setTimeout(function () {
      computeTextHashes(text);
    }, 250);
  });

  btnTextClear.addEventListener('click', function () {
    textInput.value = '';
    textHashList.innerHTML = '';
    textBytesInfo.textContent = '0 字节';
  });

  /* ================= 快捷键 ================= */
  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea, select')) return;
    if (drawer.classList.contains('open')) return;
    // Ctrl/Cmd + O 打开文件
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      fileInput.click();
    }
  });

  /* ================= 初始化 ================= */
  applyTheme();
  applyCase();
  loadHistory();
  // 首次打开清空校验结果
  verifyResult.innerHTML = '';
  hideProgress();

})();