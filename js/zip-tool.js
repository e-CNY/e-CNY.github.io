(function () {
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
  var filesToZip = [];

  // 修复：绑定拖拽事件
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
    filesToZip.forEach(function (f) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + f.name + '</span><span>' + (f.size/1024).toFixed(1) + ' KB</span>';
      zipFileList.appendChild(li);
    });
    btnZipPack.disabled = filesToZip.length === 0;
  }

  btnZipPack.addEventListener('click', async function () {
    var format = zipFormat.value;
    btnZipPack.textContent = '⏳ 正在打包...';
    btnZipPack.disabled = true;

    try {
      if (format === 'zip') {
        var zip = new JSZip();
        filesToZip.forEach(function (file) { zip.file(file.name, file); });
        var content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, 'archive_' + Date.now() + '.zip');
      } 
      else if (format === 'tar' || format === 'targz') {
        var tarBuffer = await createTar(filesToZip);
        if (format === 'tar') {
          downloadBlob(new Blob([tarBuffer], {type: 'application/x-tar'}), 'archive_' + Date.now() + '.tar');
        } else {
          // TAR.GZ
          var gzBuffer = pako.gzip(new Uint8Array(tarBuffer));
          downloadBlob(new Blob([gzBuffer], {type: 'application/gzip'}), 'archive_' + Date.now() + '.tar.gz');
        }
      }
    } catch (e) {
      alert('打包失败: ' + e.message);
    }

    btnZipPack.textContent = '打包并下载';
    filesToZip = [];
    renderZipList();
  });

  // 核心：手写 TAR 生成器
  async function createTar(files) {
    var chunks = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var buffer = await file.arrayBuffer();
      var header = new Uint8Array(512);
      
      // 写入文件名 (100 bytes)
      writeString(header, 0, file.name, 100);
      // 写入文件大小 (12 bytes, 八进制)
      writeString(header, 124, file.size.toString(8).padStart(11, '0') + ' ', 12);
      // 写入 magic "ustar\0"
      writeString(header, 257, "ustar\0", 6);
      // 写入 version "00"
      writeString(header, 263, "00", 2);
      // 写入校验和占位符 (先填满空格)
      writeString(header, 148, '        ', 8);
      
      // 计算校验和
      var checksum = 0;
      for (var j = 0; j < 512; j++) checksum += header[j];
      // 写入校验和 (8 bytes, 八进制 + \0 + 空格)
      writeString(header, 148, checksum.toString(8).padStart(6, '0') + '\0 ', 8);

      chunks.push(header);
      chunks.push(new Uint8Array(buffer));

      // 补齐到 512 字节对齐
      var padding = 512 - (file.size % 512);
      if (padding < 512) {
        chunks.push(new Uint8Array(padding));
      }
    }
    // 写入两个空的 512 字节块作为结尾
    chunks.push(new Uint8Array(1024));
    
    // 合并所有 chunk
    return new Blob(chunks);
  }

  function writeString(arr, offset, str, maxLength) {
    var len = Math.min(str.length, maxLength);
    for (var i = 0; i < len; i++) {
      arr[offset + i] = str.charCodeAt(i);
    }
  }

  // ================= 2. ZIP 解压 =================
  var unzipDrop = document.getElementById('unzip-drop-zone');
  var unzipInput = document.getElementById('unzip-input');
  var unzipLog = document.getElementById('unzip-log');

  // 修复：绑定拖拽事件
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

  function handleUnzip(file) {
    if (!file.name.endsWith('.zip')) return alert('目前纯前端解压仅支持 .zip 格式');
    
    unzipLog.textContent = '正在读取压缩包...';
    var reader = new FileReader();
    reader.onload = function (e) {
      JSZip.loadAsync(e.target.result).then(function (zip) {
        var count = 0;
        unzipLog.textContent = '✅ 解压成功，共 ' + Object.keys(zip.files).length + ' 个文件，开始逐个下载...\n';
        
        zip.forEach(function (relativePath, zipEntry) {
          if (!zipEntry.dir) {
            zipEntry.async('blob').then(function (blob) {
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = relativePath.split('/').pop();
              a.click();
              count++;
              unzipLog.textContent += '已提取: ' + a.download + '\n';
            });
          }
        });
      }).catch(function (err) {
        unzipLog.textContent = '❌ 解压失败，文件可能不是有效的 ZIP 格式。\n' + err.message;
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // ================= 3. Gzip 文本 =================
  document.getElementById('btn-gz-compress').addEventListener('click', function () {
    var text = document.getElementById('gz-input').value;
    if (!text) return;
    try {
      var bytes = new TextEncoder().encode(text);
      var compressed = pako.gzip(bytes);
      var b64 = btoa(String.fromCharCode.apply(null, compressed));
      document.getElementById('gz-output').value = b64;
    } catch (e) {
      document.getElementById('gz-output').value = '压缩失败: ' + e.message;
    }
  });

  document.getElementById('btn-gz-decompress').addEventListener('click', function () {
    var b64 = document.getElementById('gz-output').value.trim() || document.getElementById('gz-input').value.trim();
    if (!b64) return;
    try {
      var strData = atob(b64);
      var charData = strData.split('').map(function(x){return x.charCodeAt(0);});
      var binData = new Uint8Array(charData);
      var decompressed = pako.ungzip(binData);
      var text = new TextDecoder().decode(decompressed);
      document.getElementById('gz-output').value = text;
    } catch (e) {
      document.getElementById('gz-output').value = '解压失败，请确保输入的是有效的 Gzip Base64 字符串。';
    }
  });

  function downloadBlob(data, filename) {
    var blob = data instanceof Blob ? data : new Blob([data]);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();