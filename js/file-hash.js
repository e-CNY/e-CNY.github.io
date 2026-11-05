(function() {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var optMd5 = document.getElementById('opt-md5');
  var optSha1 = document.getElementById('opt-sha1');
  var optSha256 = document.getElementById('opt-sha256');
  
  var progressContainer = document.getElementById('progress-container');
  var progressBar = document.getElementById('progress-bar');
  var progressText = document.getElementById('progress-text');
  
  var resultBox = document.getElementById('result-box');
  var infoName = document.getElementById('info-name');
  var infoSize = document.getElementById('info-size');
  
  var resultMd5 = document.getElementById('result-md5');
  var resultSha1 = document.getElementById('result-sha1');
  var resultSha256 = document.getElementById('result-sha256');
  var valMd5 = document.getElementById('val-md5');
  var valSha1 = document.getElementById('val-sha1');
  var valSha256 = document.getElementById('val-sha256');

  // 文件上传与拖拽
  dropZone.addEventListener('click', function() { fileInput.click(); });
  
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  });

  // 格式化大小
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 将 ArrayBuffer 转换为 Hex 字符串
  function bufToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function(b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  // ================= 核心计算逻辑 =================
  async function processFile(file) {
    var needMd5 = optMd5.checked;
    var needSha1 = optSha1.checked;
    var needSha256 = optSha256.checked;

    if (!needMd5 && !needSha1 && !needSha256) {
      alert('请至少选择一种哈希算法！');
      return;
    }

    // 重置 UI
    dropZone.style.display = 'none';
    progressContainer.hidden = false;
    resultBox.hidden = true;
    
    progressBar.style.width = '0%';
    progressText.textContent = '正在读取...';
    
    infoName.textContent = file.name;
    infoSize.textContent = formatBytes(file.size) + ' (' + file.size + ' 字节)';

    try {
      // 1. 读取文件到内存（通过原生 FileReader，读取进度占 50%）
      var buffer = await new Promise(function(resolve, reject) {
        if (file.size === 0) {
          resolve(new ArrayBuffer(0));
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) { resolve(e.target.result); };
        reader.onerror = function(e) { reject(new Error('文件读取失败')); };
        reader.onprogress = function(e) {
          if (e.lengthComputable) {
            var percent = Math.floor((e.loaded / e.total) * 50);
            progressBar.style.width = percent + '%';
            progressText.textContent = '读取中 ' + percent + '%';
          }
        };
        reader.readAsArrayBuffer(file);
      });

      // 2. 开始计算
      progressBar.style.width = '50%';
      progressText.textContent = '计算哈希中...';
      
      // 强制给浏览器 100ms 的时间渲染“计算中”这几个字
      await new Promise(function(r) { setTimeout(r, 100); });

      // 计算 MD5 (使用 SparkMD5)
      if (needMd5) {
        valMd5.value = SparkMD5.ArrayBuffer.hash(buffer);
        resultMd5.hidden = false;
      } else {
        resultMd5.hidden = true;
      }

      // 计算 SHA-1 和 SHA-256
      // 优先使用现代浏览器极速原生的 crypto.subtle API
      if (window.crypto && window.crypto.subtle) {
        if (needSha1) {
          var hashBuffer1 = await crypto.subtle.digest('SHA-1', buffer);
          valSha1.value = bufToHex(hashBuffer1);
          resultSha1.hidden = false;
        } else {
          resultSha1.hidden = true;
        }

        if (needSha256) {
          var hashBuffer256 = await crypto.subtle.digest('SHA-256', buffer);
          valSha256.value = bufToHex(hashBuffer256);
          resultSha256.hidden = false;
        } else {
          resultSha256.hidden = true;
        }
      } else {
        // 降级处理：针对不支持原生 API 的旧浏览器
        if (needSha1) {
          var sha1Hash = sha1.create();
          sha1Hash.update(buffer);
          valSha1.value = sha1Hash.hex();
          resultSha1.hidden = false;
        } else {
          resultSha1.hidden = true;
        }

        if (needSha256) {
          var sha256Hash = sha256.create();
          sha256Hash.update(buffer);
          valSha256.value = sha256Hash.hex();
          resultSha256.hidden = false;
        } else {
          resultSha256.hidden = true;
        }
      }

      // 3. 完成
      progressBar.style.width = '100%';
      progressText.textContent = '完成';
      
      // 稍微停顿一下显示完成，然后隐藏进度条展示结果
      setTimeout(function() {
        progressContainer.hidden = true;
        resultBox.hidden = false;
        dropZone.style.display = 'block';
      }, 300);

    } catch (err) {
      console.error(err);
      alert('❌ 计算失败：' + err.message + '\n如果文件过大（如超过 500MB），建议使用专业桌面软件计算。');
      progressContainer.hidden = true;
      dropZone.style.display = 'block';
    }
  }

  // ================= 文本哈希计算 =================
  document.getElementById('btn-text-hash').addEventListener('click', async function() {
    var text = document.getElementById('text-input').value;
    if (!text) {
      alert('请先输入文本内容！');
      return;
    }

    var needMd5 = optMd5.checked;
    var needSha1 = optSha1.checked;
    var needSha256 = optSha256.checked;

    if (!needMd5 && !needSha1 && !needSha256) {
      alert('请至少选择一种哈希算法！');
      return;
    }

    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    
    dropZone.style.display = 'none';
    progressContainer.hidden = true;
    resultBox.hidden = false;
    
    infoName.textContent = '（纯文本输入）';
    infoSize.textContent = data.length + ' 字节';

    try {
      if (needMd5) {
        var spark = new SparkMD5.ArrayBuffer();
        spark.append(data.buffer);
        valMd5.value = spark.end();
        resultMd5.hidden = false;
      } else {
        resultMd5.hidden = true;
      }

      if (window.crypto && window.crypto.subtle) {
        if (needSha1) {
          var hashBuffer1 = await crypto.subtle.digest('SHA-1', data.buffer);
          valSha1.value = bufToHex(hashBuffer1);
          resultSha1.hidden = false;
        } else {
          resultSha1.hidden = true;
        }

        if (needSha256) {
          var hashBuffer256 = await crypto.subtle.digest('SHA-256', data.buffer);
          valSha256.value = bufToHex(hashBuffer256);
          resultSha256.hidden = false;
        } else {
          resultSha256.hidden = true;
        }
      } else {
        if (needSha1) {
          var sha1Hash = sha1.create();
          sha1Hash.update(data);
          valSha1.value = sha1Hash.hex();
          resultSha1.hidden = false;
        } else {
          resultSha1.hidden = true;
        }

        if (needSha256) {
          var sha256Hash = sha256.create();
          sha256Hash.update(data);
          valSha256.value = sha256Hash.hex();
          resultSha256.hidden = false;
        } else {
          resultSha256.hidden = true;
        }
      }
    } catch (e) {
      alert('文本计算失败：' + e.message);
    }
  });

  // 复制
  window.copyHash = function(id) {
    var el = document.getElementById(id);
    if (!el.value) return;
    navigator.clipboard.writeText(el.value).then(function() {
      var btn = el.nextElementSibling;
      var originalText = btn.textContent;
      btn.textContent = '✅ 已复制';
      setTimeout(function() { btn.textContent = originalText; }, 2000);
    }).catch(function() {
      el.select();
      document.execCommand('copy');
      alert('✅ 复制成功！');
    });
  };
})();