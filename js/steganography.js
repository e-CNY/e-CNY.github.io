/* js/steganography.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var MAGIC = [0x53, 0x54, 0x47, 0x31]; // "STG1"
  var HEADER_SIZE = 9;                   // magic(4) + depth(1) + length(4)
  var HEADER_CHANNELS = HEADER_SIZE * 8; // 头部固定用 1 位 LSB

  /* ================= 状态 ================= */
  var hideState = { file: null, imageData: null, width: 0, height: 0 };
  var extractState = { file: null, imageData: null, width: 0, height: 0 };
  var hideDepth = 1;
  var toastTimer = null;

  /* ================= DOM 缓存 ================= */
  var els = {};
  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    els.tabs = $('st-tabs');
    els.hideDropzone = $('hide-dropzone');
    els.hideImgInput = $('hide-img');
    els.hidePreviewWrap = $('hide-preview-wrap');
    els.hidePreview = $('hide-preview');
    els.hideImageInfo = $('hide-image-info');
    els.hideCapacity = $('hide-capacity');
    els.hideText = $('hide-text');
    els.hideTextInfo = $('hide-text-info');
    els.hideDepthSeg = $('hide-depth-seg');
    els.hideDepthHint = $('hide-depth-hint');
    els.hidePassword = $('hide-password');
    els.btnHide = $('btn-hide');
    els.hideResult = $('hide-result');

    els.extractDropzone = $('extract-dropzone');
    els.extractImgInput = $('extract-img');
    els.extractPreviewWrap = $('extract-preview-wrap');
    els.extractPreview = $('extract-preview');
    els.extractImageInfo = $('extract-image-info');
    els.extractPassword = $('extract-password');
    els.btnExtract = $('btn-extract');
    els.extractText = $('extract-text');
    els.extractTextInfo = $('extract-text-info');
    els.btnCopyExtract = $('btn-copy-extract');

    els.toast = $('st-toast');
  }

  /* ================= 通用工具 ================= */
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ================= 通道映射 ================= */
  function buildChannelIndexes(width, height) {
    var totalPixels = width * height;
    var arr = new Int32Array(totalPixels * 3);
    var idx = 0;
    for (var p = 0; p < totalPixels; p++) {
      var base = p * 4;
      arr[idx++] = base;
      arr[idx++] = base + 1;
      arr[idx++] = base + 2;
    }
    return arr;
  }

  function writeBits(data, channelIndexes, startChannel, bytes, depth) {
    var mask = (1 << depth) - 1;
    var channelsPerByte = 8 / depth;
    var totalChannels = channelIndexes.length;
    for (var b = 0; b < bytes.length; b++) {
      var byte = bytes[b];
      for (var c = 0; c < channelsPerByte; c++) {
        var globalChannel = startChannel + b * channelsPerByte + c;
        if (globalChannel >= totalChannels) {
          throw new Error('通道溢出：数据超出图片容量');
        }
        var dataIdx = channelIndexes[globalChannel];
        var shift = 8 - (c + 1) * depth;
        var bits = (byte >> shift) & mask;
        data[dataIdx] = (data[dataIdx] & ~mask) | bits;
      }
    }
  }

  function readBits(data, channelIndexes, startChannel, byteCount, depth) {
    var mask = (1 << depth) - 1;
    var channelsPerByte = 8 / depth;
    var totalChannels = channelIndexes.length;
    var result = new Uint8Array(byteCount);
    for (var b = 0; b < byteCount; b++) {
      var byte = 0;
      for (var c = 0; c < channelsPerByte; c++) {
        var globalChannel = startChannel + b * channelsPerByte + c;
        if (globalChannel >= totalChannels) {
          throw new Error('读取越界：通道数不足');
        }
        var dataIdx = channelIndexes[globalChannel];
        var bits = data[dataIdx] & mask;
        byte = (byte << depth) | bits;
      }
      result[b] = byte;
    }
    return result;
  }

  function calcCapacity(width, height, depth) {
    var totalChannels = width * height * 3;
    var availableChannels = totalChannels - HEADER_CHANNELS;
    if (availableChannels <= 0) return 0;
    return Math.floor(availableChannels * depth / 8);
  }

  /* ================= 简单 XOR ================= */
  function xorCipher(bytes, password) {
    if (!password) return bytes;
    var out = new Uint8Array(bytes.length);
    var pwdLen = password.length;
    for (var i = 0; i < bytes.length; i++) {
      out[i] = (bytes[i] ^ (password.charCodeAt(i % pwdLen) & 0xFF)) & 0xFF;
    }
    return out;
  }

  /* ================= 编码 ================= */
  function embedText(imageData, text, depth, password) {
    var textBytes = new TextEncoder().encode(text);
    if (textBytes.length === 0) {
      throw new Error('文本不能为空');
    }

    if (password) {
      textBytes = xorCipher(textBytes, password);
    }

    var header = new Uint8Array(HEADER_SIZE);
    header[0] = MAGIC[0];
    header[1] = MAGIC[1];
    header[2] = MAGIC[2];
    header[3] = MAGIC[3];
    header[4] = depth;
    var len = textBytes.length;
    header[5] = (len >>> 24) & 0xFF;
    header[6] = (len >>> 16) & 0xFF;
    header[7] = (len >>> 8) & 0xFF;
    header[8] = len & 0xFF;

    var width = imageData.width;
    var height = imageData.height;
    var totalChannels = width * height * 3;
    var requiredChannels = HEADER_CHANNELS + Math.ceil(textBytes.length * 8 / depth);
    if (requiredChannels > totalChannels) {
      var maxBytes = calcCapacity(width, height, depth);
      throw new Error(
        '容量不足：当前图片在 ' + depth + ' 位 LSB 下最多容纳 ' +
        formatBytes(maxBytes) + '，但需要 ' + formatBytes(textBytes.length)
      );
    }

    var channelIndexes = buildChannelIndexes(width, height);
    var data = imageData.data;
    writeBits(data, channelIndexes, 0, header, 1);
    writeBits(data, channelIndexes, HEADER_CHANNELS, textBytes, depth);

    return textBytes.length;
  }

  /* ================= 解码 ================= */
  function extractTextFrom(imageData, password) {
    var width = imageData.width;
    var height = imageData.height;
    var totalChannels = width * height * 3;

    if (totalChannels < HEADER_CHANNELS) {
      throw new Error('图片太小，不含隐藏信息');
    }

    var channelIndexes = buildChannelIndexes(width, height);
    var data = imageData.data;

    var header = readBits(data, channelIndexes, 0, HEADER_SIZE, 1);

    if (header[0] !== MAGIC[0] || header[1] !== MAGIC[1] ||
        header[2] !== MAGIC[2] || header[3] !== MAGIC[3]) {
      throw new Error('未检测到隐藏信息（魔术头不匹配）。该图片可能不含隐写数据，或被压缩/重新保存过');
    }

    var depth = header[4];
    if (depth !== 1 && depth !== 2 && depth !== 4) {
      throw new Error('数据已损坏：位深字段无效 (' + depth + ')');
    }

    var length = ((header[5] << 24) | (header[6] << 16) | (header[7] << 8) | header[8]) >>> 0;

    var requiredChannels = HEADER_CHANNELS + Math.ceil(length * 8 / depth);
    if (requiredChannels > totalChannels) {
      throw new Error('数据已损坏：长度字段超出图片容量');
    }

    var bytes = readBits(data, channelIndexes, HEADER_CHANNELS, length, depth);

    if (password) {
      bytes = xorCipher(bytes, password);
    }

    var text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    var replacementCount = (text.match(/\uFFFD/g) || []).length;
    if (text.length > 0 && replacementCount / text.length > 0.1) {
      throw new Error('解密失败：密码可能不正确，或数据已损坏');
    }

    return { text: text, depth: depth, byteCount: length };
  }

  /* ================= 图片加载 ================= */
  function loadImageToCanvas(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.onload = function (e) {
        var img = new Image();
        img.onerror = function () { reject(new Error('图片加载失败')); };
        img.onload = function () {
          try {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve({ imageData: imageData, width: img.width, height: img.height });
          } catch (err) {
            reject(new Error('图片处理失败：' + err.message));
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ================= 隐藏面板 ================= */
  function bindDropzone(dropzone, input, callback) {
    if (!dropzone || !input) return;
    dropzone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) {
        callback(e.target.files[0]);
        e.target.value = '';
      }
    });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        callback(e.dataTransfer.files[0]);
      }
    });
  }

  async function onHideFile(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      showToast('请选择图片文件');
      return;
    }
    try {
      showToast('正在加载图片…');
      var result = await loadImageToCanvas(file);
      hideState.file = file;
      hideState.imageData = result.imageData;
      hideState.width = result.width;
      hideState.height = result.height;

      els.hidePreview.src = URL.createObjectURL(file);
      els.hidePreviewWrap.hidden = false;
      els.hideImageInfo.textContent = result.width + ' × ' + result.height + ' · ' + formatBytes(file.size);

      updateHideCapacity();
      updateHideTextInfo();
      showToast('✅ 图片已加载');
    } catch (err) {
      console.error('[hide load error]', err);
      showToast('❌ ' + err.message);
    }
  }

  function updateHideCapacity() {
    if (!hideState.imageData) {
      els.hideCapacity.innerHTML = '';
      return;
    }
    var cap = calcCapacity(hideState.width, hideState.height, hideDepth);
    var textBytes = new TextEncoder().encode(els.hideText.value).length;
    var remain = cap - textBytes;

    var html = '📦 容量：<strong>' + formatBytes(cap) + '</strong>';
    html += ' · 已用 <strong>' + formatBytes(textBytes) + '</strong>';
    if (remain < 0) {
      html += ' · <strong style="color:var(--st-danger);">超出 ' + formatBytes(-remain) + '</strong>';
      els.hideCapacity.className = 'st-capacity warn';
    } else {
      html += ' · 剩余 <strong>' + formatBytes(remain) + '</strong>';
      els.hideCapacity.className = 'st-capacity ok';
    }
    els.hideCapacity.innerHTML = html;
  }

  function updateHideTextInfo() {
    var bytes = new TextEncoder().encode(els.hideText.value).length;
    var chars = els.hideText.value.length;
    els.hideTextInfo.textContent = chars + ' 字符 · ' + formatBytes(bytes);
    updateHideCapacity();
  }

  function onBtnHideClick() {
    if (!hideState.imageData) {
      showToast('请先上传图片');
      return;
    }
    var text = els.hideText.value;
    if (!text) {
      showToast('请输入要隐藏的文本');
      return;
    }
    var password = els.hidePassword.value;

    try {
      els.btnHide.disabled = true;
      els.btnHide.textContent = '⏳ 处理中…';

      var cloneData = new ImageData(
        new Uint8ClampedArray(hideState.imageData.data),
        hideState.imageData.width,
        hideState.imageData.height
      );

      var hiddenBytes = embedText(cloneData, text, hideDepth, password);

      // 自验证
      var verify = extractTextFrom(cloneData, password);
      if (verify.text !== text) {
        throw new Error('内部验证失败：解码结果与原文本不一致');
      }

      var canvas = document.createElement('canvas');
      canvas.width = hideState.width;
      canvas.height = hideState.height;
      var ctx = canvas.getContext('2d');
      ctx.putImageData(cloneData, 0, 0);

      var dataUrl = canvas.toDataURL('image/png');
      var timestamp = Date.now();
      var filename = 'stego_' + timestamp + '.png';

      els.hideResult.innerHTML =
        '<img src="' + dataUrl + '" alt="隐写图片">' +
        '<div class="st-result-actions">' +
          '<a href="' + dataUrl + '" download="' + filename + '">⬇️ 下载 PNG</a>' +
        '</div>' +
        '<div class="st-result-info">' +
          '✅ 已成功隐藏 <strong>' + formatBytes(hiddenBytes) + '</strong>' +
          '（' + hideDepth + ' 位 LSB' +
          (password ? ' · 🔐 密码加密' : ' · 未加密') + '）<br>' +
          '⚠️ 请务必以下载的 PNG 原图传播，切勿截图或转 JPEG' +
        '</div>';

      setTimeout(function () {
        els.hideResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);

      showToast('✅ 已生成隐写图片');
    } catch (err) {
      console.error('[encode error]', err);
      showToast('❌ ' + err.message);
      els.hideResult.innerHTML = '<div style="color:var(--st-danger);padding:12px;">❌ ' + escapeHtml(err.message) + '</div>';
    } finally {
      els.btnHide.disabled = false;
      els.btnHide.textContent = '🔒 隐藏并生成图片';
    }
  }

  /* ================= 提取面板 ================= */
  async function onExtractFile(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      showToast('请选择图片文件');
      return;
    }
    try {
      showToast('正在加载图片…');
      var result = await loadImageToCanvas(file);
      extractState.file = file;
      extractState.imageData = result.imageData;
      extractState.width = result.width;
      extractState.height = result.height;

      els.extractPreview.src = URL.createObjectURL(file);
      els.extractPreviewWrap.hidden = false;
      els.extractImageInfo.textContent = result.width + ' × ' + result.height + ' · ' + formatBytes(file.size);

      els.extractText.value = '';
      els.extractTextInfo.textContent = '';
      els.btnCopyExtract.hidden = true;
      showToast('✅ 图片已加载');
    } catch (err) {
      console.error('[extract load error]', err);
      showToast('❌ ' + err.message);
    }
  }

  function onBtnExtractClick() {
    if (!extractState.imageData) {
      showToast('请先上传图片');
      return;
    }
    var password = els.extractPassword.value;

    try {
      els.btnExtract.disabled = true;
      els.btnExtract.textContent = '⏳ 提取中…';

      var result = extractTextFrom(extractState.imageData, password);

      els.extractText.value = result.text;
      els.extractTextInfo.textContent =
        formatBytes(result.byteCount) + ' · ' + result.depth + ' 位 LSB' +
        (password ? ' · 🔐 已解密' : '');
      els.btnCopyExtract.hidden = false;

      showToast('✅ 已提取 ' + formatBytes(result.byteCount));
    } catch (err) {
      console.error('[decode error]', err);
      els.extractText.value = '';
      els.extractTextInfo.textContent = '❌ ' + err.message;
      els.btnCopyExtract.hidden = true;
      showToast('❌ ' + err.message);
    } finally {
      els.btnExtract.disabled = false;
      els.btnExtract.textContent = '🔍 提取隐藏文本';
    }
  }

  function fallbackCopy(text) {
    try {
      els.extractText.select();
      document.execCommand('copy');
      showToast('✅ 已复制');
    } catch (e) {
      showToast('❌ 复制失败，请手动选中复制');
    }
  }

  function onBtnCopyClick() {
    var text = els.extractText.value;
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  /* ================= 事件绑定（统一在 init 之后执行） ================= */
  function bindEvents() {
    // 隐藏面板
    els.hideText.addEventListener('input', updateHideTextInfo);

    els.hideDepthSeg.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-depth]');
      if (!btn) return;
      Array.prototype.forEach.call(els.hideDepthSeg.children, function (b) {
        b.classList.toggle('active', b === btn);
      });
      hideDepth = parseInt(btn.dataset.depth, 10);
      var hints = {
        1: '质量最佳 · 容量最小（肉眼完全无法察觉）',
        2: '质量优秀 · 容量 2 倍（几乎无法察觉）',
        4: '容量 4 倍 · 图像可能出现轻微噪点'
      };
      els.hideDepthHint.textContent = hints[hideDepth] || '';
      updateHideCapacity();
    });

    els.btnHide.addEventListener('click', onBtnHideClick);
    bindDropzone(els.hideDropzone, els.hideImgInput, onHideFile);

    // 提取面板
    els.btnExtract.addEventListener('click', onBtnExtractClick);
    els.btnCopyExtract.addEventListener('click', onBtnCopyClick);
    bindDropzone(els.extractDropzone, els.extractImgInput, onExtractFile);

    // Tabs 切换
    els.tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.st-tab');
      if (!btn) return;
      Array.prototype.forEach.call(els.tabs.children, function (t) {
        t.classList.toggle('active', t === btn);
      });
      document.querySelectorAll('.st-panel').forEach(function (p) {
        p.classList.toggle('active', p.id === btn.dataset.target);
      });
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    try {
      cacheEls();
      bindEvents();
      if (els.hideDepthHint) {
        els.hideDepthHint.textContent = '质量最佳 · 容量最小（肉眼完全无法察觉）';
      }
      // 首次进入时同步容量显示
      if (els.hideCapacity) updateHideCapacity();
    } catch (err) {
      console.error('[steganography init error]', err);
      // 用户可见的错误提示
      var main = document.querySelector('main');
      if (main) {
        var errDiv = document.createElement('div');
        errDiv.style.cssText = 'margin:20px auto;max-width:600px;padding:20px;background:#fce0e0;border:1px solid #b3261e;border-radius:10px;color:#b3261e;font-size:.9rem;line-height:1.6;text-align:center;';
        errDiv.innerHTML = '⚠️ 初始化失败：' + escapeHtml(err.message || String(err)) + '<br>请打开浏览器控制台（F12）查看详细信息。';
        main.insertBefore(errDiv, main.firstChild);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();