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

  // ================= 1. ZIP 打包 =================
  var zipDrop = document.getElementById('zip-drop-zone');
  var zipInput = document.getElementById('zip-input');
  var zipFileList = document.getElementById('zip-file-list');
  var btnZipPack = document.getElementById('btn-zip-pack');
  var filesToZip = [];

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
    filesToZip.forEach(function (f, idx) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + f.name + '</span><span>' + (f.size/1024).toFixed(1) + ' KB</span>';
      zipFileList.appendChild(li);
    });
    btnZipPack.disabled = filesToZip.length === 0;
  }

  btnZipPack.addEventListener('click', function () {
    var zip = new JSZip();
    filesToZip.forEach(function (file) { zip.file(file.name, file); });
    btnZipPack.textContent = '⏳ 正在打包...';
    
    zip.generateAsync({ type: 'blob' }).then(function (content) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'archive_' + Date.now() + '.zip';
      a.click();
      btnZipPack.textContent = '打包并下载 ZIP';
      filesToZip = [];
      renderZipList();
    });
  });

  // ================= 2. ZIP 解压 =================
  var unzipDrop = document.getElementById('unzip-drop-zone');
  var unzipInput = document.getElementById('unzip-input');
  var unzipLog = document.getElementById('unzip-log');

  unzipDrop.addEventListener('click', function () { unzipInput.click(); });
  unzipInput.addEventListener('change', function () {
    if (this.files.length > 0) {
      var file = this.files[0];
      unzipLog.textContent = '正在读取压缩包...';
      var reader = new FileReader();
      reader.onload = function (e) {
        JSZip.loadAsync(e.target.result).then(function (zip) {
          unzipLog.textContent = '✅ 解压成功，共 ' + Object.keys(zip.files).length + ' 个文件，开始逐个下载...\n';
          var count = 0;
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
    this.value = '';
  });

  // ================= 3. Gzip 压缩 =================
  document.getElementById('btn-gz-compress').addEventListener('click', function () {
    var text = document.getElementById('gz-input').value;
    if (!text) return;
    try {
      // 将字符串转为 Uint8Array 然后进行 gzip 压缩
      var bytes = new TextEncoder().encode(text);
      var compressed = pako.gzip(bytes);
      // 转为 Base64 方便展示
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
})();