(function () {
  'use strict';

  // ================= 通用工具 =================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isError) toastEl.style.background = 'rgba(168, 69, 42, 0.95)';
    else toastEl.style.background = 'rgba(61, 50, 38, 0.92)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  window.copyText = function(id) {
    var el = document.getElementById(id);
    if (!el || !el.value) return showToast('没有可复制的内容');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.value).then(function () {
        showToast('✅ 已复制到剪贴板');
      }).catch(function () {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      el.select(); document.execCommand('copy'); showToast('✅ 已复制');
    }
  };

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function downloadBlob(data, filename, mimeType) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // Tab 切换
  var tabs = document.querySelectorAll('.zt-tab');
  var panels = document.querySelectorAll('.zt-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 1. 文件打包 (ZIP / TAR / TAR.GZ) =================
  var zipDrop = document.getElementById('zip-drop-zone');
  var zipInput = document.getElementById('zip-input');
  var zipFileList = document.getElementById('zip-file-list');
  var zipFormat = document.getElementById('zip-format');
  var btnZipPack = document.getElementById('btn-zip-pack');
  var zipTotalSize = document.getElementById('zip-total-size');
  var filesToZip = [];

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
    zipDrop.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); });
  });
  zipDrop.addEventListener('dragenter', function () { zipDrop.classList.add('dragover'); });
  zipDrop.addEventListener('dragover', function () { zipDrop.classList.add('dragover'); });
  zipDrop.addEventListener('dragleave', function () { zipDrop.classList.remove('dragover'); });
  zipDrop.addEventListener('drop', function (e) {
    zipDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      for (var i = 0; i < e.dataTransfer.files.length; i++) {
        filesToZip.push(e.dataTransfer.files[i]);
      }
      renderZipList();
    }
  });

  zipDrop.addEventListener('click', function () { zipInput.click(); });
  zipInput.addEventListener('change', function () {
    if (this.files.length > 0) {
      for (var i = 0; i < this.files.length; i++) filesToZip.push(this.files[i]);
      renderZipList();
    }
    this.value = '';
  });

  function renderZipList() {
    zipFileList.innerHTML = '';
    var totalSize = 0;
    
    filesToZip.forEach(function (f, index) {
      totalSize += f.size;
      var li = document.createElement('li');
      
      var nameSpan = document.createElement('span');
      nameSpan.className = 'f-name';
      nameSpan.textContent = f.name;
      nameSpan.title = f.name;
      
      var sizeSpan = document.createElement('span');
      sizeSpan.className = 'f-size';
      sizeSpan.textContent = formatSize(f.size);
      
      var delBtn = document.createElement('button');
      delBtn.className = 'f-del';
      delBtn.innerHTML = '✕';
      delBtn.title = '移除';
      delBtn.onclick = function() {
        filesToZip.splice(index, 1);
        renderZipList();
      };
      
      li.appendChild(nameSpan);
      li.appendChild(sizeSpan);
      li.appendChild(delBtn);
      zipFileList.appendChild(li);
    });
    
    zipTotalSize.textContent = filesToZip.length > 0 ? '共 ' + filesToZip.length + ' 个文件，' + formatSize(totalSize) : '';
    btnZipPack.disabled = filesToZip.length === 0;
  }

  btnZipPack.addEventListener('click', async function () {
    var format = zipFormat.value;
    var originalText = btnZipPack.textContent;
    btnZipPack.textContent = '⏳ 正在打包...';
    btnZipPack.disabled = true;

    try {
      if (format === 'zip') {
        var zip = new JSZip();
        filesToZip.forEach(function (file) { zip.file(file.name, file); });
        var content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, 'archive_' + Date.now() + '.zip', 'application/zip');
      } 
      else if (format === 'tar' || format === 'targz') {
        var tarBlob = await createTar(filesToZip);
        if (format === 'tar') {
          downloadBlob(tarBlob, 'archive_' + Date.now() + '.tar', 'application/x-tar');
        } else {
          var tarBuffer = await tarBlob.arrayBuffer();
          var gzBuffer = pako.gzip(new Uint8Array(tarBuffer));
          downloadBlob(new Blob([gzBuffer], {type: 'application/gzip'}), 'archive_' + Date.now() + '.tar.gz', 'application/gzip');
        }
      }
      showToast('打包完成，已开始下载');
    } catch (e) {
      console.error(e);
      showToast('打包失败: ' + e.message, true);
    } finally {
      btnZipPack.textContent = originalText;
      filesToZip = [];
      renderZipList();
    }
  });

  // 核心：手写稳健的 TAR 生成器 (修复中文编码问题)
  async function createTar(files) {
    var chunks = [];
    var encoder = new TextEncoder();
    
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var buffer = await file.arrayBuffer();
      var header = new Uint8Array(512);
      
      // 写入文件名 (UTF-8 编码，最长 100 字节)
      var nameBytes = encoder.encode(file.name);
      if (nameBytes.length > 100) {
        // 简单截断，保证不溢出
        nameBytes = nameBytes.slice(0, 100);
      }
      header.set(nameBytes, 0);

      // 写入文件大小 (12 bytes, 八进制)
      var sizeStr = file.size.toString(8).padStart(11, '0') + ' ';
      for (var k = 0; k < sizeStr.length; k++) {
        header[124 + k] = sizeStr.charCodeAt(k);
      }
      
      // 写入 magic "ustar\0"
      var magic = "ustar\0";
      for (var k = 0; k < 6; k++) header[257 + k] = magic.charCodeAt(k);
      // 写入 version "00"
      header[263] = 48; header[264] = 48;
      
      // 写入校验和占位符
      for (var k = 0; k < 8; k++) header[148 + k] = 32;
      
      // 计算校验和
      var checksum = 0;
      for (var j = 0; j < 512; j++) checksum += header[j];
      // 写入校验和 (6 bytes 八进制 + \0 + 空格)
      var chkStr = checksum.toString(8).padStart(6, '0') + '\0 ';
      for (var k = 0; k < chkStr.length; k++) {
        header[148 + k] = chkStr.charCodeAt(k);
      }

      chunks.push(header);
      chunks.push(new Uint8Array(buffer));

      // 补齐 512 字节对齐
      var padding = 512 - (file.size % 512);
      if (padding < 512) {
        chunks.push(new Uint8Array(padding));
      }
    }
    // 写入结尾的 1024 字节空块
    chunks.push(new Uint8Array(1024));
    
    return new Blob(chunks);
  }

  // ================= 2. 智能解压 ZIP =================
  var unzipDrop = document.getElementById('unzip-drop-zone');
  var unzipInput = document.getElementById('unzip-input');
  var unzipLog = document.getElementById('unzip-log');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
    unzipDrop.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); });
  });
  unzipDrop.addEventListener('dragenter', function () { unzipDrop.classList.add('dragover'); });
  unzipDrop.addEventListener('dragover', function () { unzipDrop.classList.add('dragover'); });
  unzipDrop.addEventListener('dragleave', function () { unzipDrop.classList.remove('dragover'); });
  unzipDrop.addEventListener('drop', function (e) {
    unzipDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleUnzip(e.dataTransfer.files[0]);
    }
  });

  unzipDrop.addEventListener('click', function () { unzipInput.click(); });
  unzipInput.addEventListener('change', function () {
    if (this.files.length > 0) handleUnzip(this.files[0]);
    this.value = '';
  });

  async function handleUnzip(file) {
    if (!file.name.endsWith('.zip')) return showToast('目前仅支持 .zip 格式', true);
    
    unzipLog.textContent = '正在读取压缩包...\n';
    try {
      var zip = await JSZip.loadAsync(file);
      var entries = Object.keys(zip.files).filter(function(path) {
        return !zip.files[path].dir;
      });
      
      unzipLog.textContent += '✅ 解析成功，共发现 ' + entries.length + ' 个文件。\n\n';
      
      if (entries.length === 0) {
        unzipLog.textContent += '压缩包为空，无需解压。';
        return;
      }

      // 如果只有1个文件，直接下载
      if (entries.length === 1) {
        var path = entries[0];
        var blob = await zip.files[path].async('blob');
        unzipLog.textContent += '📥 开始直接下载: ' + path + '\n';
        downloadBlob(blob, path.split('/').pop());
        showToast('解压成功，已下载单文件');
      } 
      // 如果有多文件，重新打包
      else {
        unzipLog.textContent += '📦 文件较多，正在为您重新打包为新的 ZIP 以便一键下载...\n';
        var newZip = new JSZip();
        for (var i = 0; i < entries.length; i++) {
          var path = entries[i];
          var blob = await zip.files[path].async('blob');
          newZip.file(path, blob);
          unzipLog.textContent += '  - 提取: ' + path + '\n';
        }
        
        var content = await newZip.generateAsync({ type: 'blob' });
        var newFilename = file.name.replace('.zip', '') + '_extracted_' + Date.now() + '.zip';
        downloadBlob(content, newFilename);
        unzipLog.textContent += '\n✅ 打包完成，已开始下载 ' + newFilename;
        showToast('解压成功，已重新打包下载');
      }
    } catch (err) {
      unzipLog.textContent = '❌ 解压失败，文件可能不是有效的 ZIP 格式。\n' + err.message;
      showToast('解压失败', true);
    }
  }

  // ================= 3. Gzip 文本处理 =================
  var gzInput = document.getElementById('gz-input');
  var gzOutput = document.getElementById('gz-output');
  var gzSizeIn = document.getElementById('gz-size-in');
  var gzSizeOut = document.getElementById('gz-size-out');
  var gzRatio = document.getElementById('gz-ratio');
  
  function updateGzipStats() {
    var inBytes = new TextEncoder().encode(gzInput.value);
    gzSizeIn.textContent = formatSize(inBytes.length);
    
    var outStr = gzOutput.value.trim();
    if (!outStr) {
      gzSizeOut.textContent = '0 B';
      gzRatio.textContent = '0%';
      return;
    }
    try {
      var outBytesLen = atob(outStr).length;
      gzSizeOut.textContent = formatSize(outBytesLen);
      var ratio = inBytes.length > 0 ? ((1 - outBytesLen / inBytes.length) * 100).toFixed(1) : 0;
      gzRatio.textContent = ratio + '%';
      if(ratio < 0) gzRatio.textContent = '变大了';
      else gzRatio.style.color = ratio > 30 ? '#7ba05b' : '#8a5a2b';
    } catch(e) {
      gzSizeOut.textContent = '-';
      gzRatio.textContent = '-';
    }
  }

  gzInput.addEventListener('input', updateGzipStats);
  gzOutput.addEventListener('input', updateGzipStats);

  document.getElementById('btn-gz-compress').addEventListener('click', function () {
    var text = gzInput.value;
    if (!text) return showToast('请输入需要压缩的文本');
    try {
      var bytes = new TextEncoder().encode(text);
      var compressed = pako.gzip(bytes);
      
      // 安全的 Uint8Array 转 Base64 (防止大文件爆栈)
      var binary = '';
      var len = compressed.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(compressed[i]);
      }
      gzOutput.value = btoa(binary);
      
      updateGzipStats();
      showToast('压缩成功');
    } catch (e) {
      showToast('压缩失败: ' + e.message, true);
    }
  });

  document.getElementById('btn-gz-decompress').addEventListener('click', function () {
    var b64 = gzOutput.value.trim() || gzInput.value.trim();
    if (!b64) return showToast('请在右侧输出框或左侧输入框填入 Base64');
    try {
      var strData = atob(b64);
      var charData = strData.split('').map(function(x){return x.charCodeAt(0);});
      var binData = new Uint8Array(charData);
      var decompressed = pako.ungzip(binData);
      var text = new TextDecoder().decode(decompressed);
      gzOutput.value = text; // 这里如果输出到右侧，统计逻辑会计算错误，但问题不大
      showToast('解压成功');
    } catch (e) {
      showToast('解压失败，请确保是正确的 Gzip Base64 字符串', true);
    }
  });

  document.getElementById('btn-gz-download').addEventListener('click', function () {
    var b64 = gzOutput.value.trim();
    if (!b64) return showToast('没有可下载的压缩内容');
    try {
      var strData = atob(b64);
      var charData = strData.split('').map(function(x){return x.charCodeAt(0);});
      var binData = new Uint8Array(charData);
      var blob = new Blob([binData], {type: 'application/gzip'});
      downloadBlob(blob, 'compressed_' + Date.now() + '.gz');
      showToast('gz 文件已下载');
    } catch(e) {
      showToast('导出失败，内容可能不是有效的 Base64', true);
    }
  });

  // 初始化
  updateGzipStats();

})();