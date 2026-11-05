(function() {
  // 切换 Tab
  var tabImg2b64 = document.getElementById('tab-img2b64');
  var tabB642img = document.getElementById('tab-b642img');
  var panelImg2b64 = document.getElementById('panel-img2b64');
  var panelB642img = document.getElementById('panel-b642img');

  tabImg2b64.addEventListener('click', function() {
    tabImg2b64.classList.add('active');
    tabB642img.classList.remove('active');
    panelImg2b64.classList.add('active');
    panelB642img.classList.remove('active');
  });

  tabB642img.addEventListener('click', function() {
    tabB642img.classList.add('active');
    tabImg2b64.classList.remove('active');
    panelB642img.classList.add('active');
    panelImg2b64.classList.remove('active');
  });

  // ================= 图片转 Base64 =================
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var img2b64Result = document.getElementById('img2b64-result');
  var uploadedImg = document.getElementById('uploaded-img');
  var fileInfo = document.getElementById('file-info');
  var base64Text = document.getElementById('base64-text');
  var dataurlText = document.getElementById('dataurl-text');

  var currentDataUrl = '';
  var currentMime = '';

  // 点击上传
  dropZone.addEventListener('click', function() {
    fileInput.click();
  });

  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // 拖拽上传
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
      handleFile(e.dataTransfer.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      currentDataUrl = dataUrl;
      
      // 解析 MIME
      var match = dataUrl.match(/^data:([^;]+);base64,/);
      currentMime = match ? match[1] : 'image/png';
      
      // 提取纯 Base64
      var base64Str = dataUrl.split(',')[1];

      // 更新 UI
      uploadedImg.src = dataUrl;
      base64Text.value = base64Str;
      dataurlText.value = dataUrl;

      var sizeKB = (file.size / 1024).toFixed(2);
      var b64Length = base64Str.length;
      fileInfo.innerHTML = 
        '📄 文件名：' + file.name + '<br>' +
        '📦 原文件大小：' + sizeKB + ' KB<br>' +
        '📝 Base64 字符数：' + b64Length + ' 个<br>' +
        '🖼️ 图片格式：' + currentMime;

      img2b64Result.hidden = false;
      dropZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // 复制功能
  window.copyText = function(id) {
    var el = document.getElementById(id);
    if (!el.value) return;
    navigator.clipboard.writeText(el.value).then(function() {
      alert('✅ 复制成功！');
    }).catch(function() {
      // 降级
      el.select();
      document.execCommand('copy');
      alert('✅ 复制成功！');
    });
  };

  // 复制代码片段
  window.copySnippet = function(type) {
    if (!currentDataUrl) return;
    var code = '';
    if (type === 'html') {
      code = '<img src="' + currentDataUrl + '" alt="image">';
    } else if (type === 'css') {
      code = 'background-image: url("' + currentDataUrl + '");';
    }
    navigator.clipboard.writeText(code).then(function() {
      alert('✅ 代码已复制！');
    });
  };

  // ================= Base64 转图片 =================
  var b64Input = document.getElementById('b64-input');
  var btnDecode = document.getElementById('btn-decode');
  var btnClearB64 = document.getElementById('btn-clear-b64');
  var b642imgResult = document.getElementById('b642img-result');
  var decodedImg = document.getElementById('decoded-img');
  var btnDownloadB64 = document.getElementById('btn-download-b64');
  
  var infoFormat = document.getElementById('info-format');
  var infoSize = document.getElementById('info-size');
  var infoFilesize = document.getElementById('info-filesize');

  btnDecode.addEventListener('click', function() {
    var raw = b64Input.value.trim();
    if (!raw) {
      alert('请先粘贴 Base64 字符串！');
      return;
    }

    // 清理空白字符
    raw = raw.replace(/\s+/g, '');

    var finalDataUrl = raw;
    if (!raw.startsWith('data:')) {
      // 如果没有前缀，尝试补全为 png
      finalDataUrl = 'data:image/png;base64,' + raw;
    }

    // 创建一个 Image 对象测试是否合法
    var testImg = new Image();
    testImg.onload = function() {
      decodedImg.src = finalDataUrl;
      
      // 解析格式
      var match = finalDataUrl.match(/^data:([^;]+);base64,/);
      var mime = match ? match[1] : '未知';
      var ext = mime.split('/')[1] || 'png';
      
      // 解析纯 b64 长度计算大小
      var pureB64 = finalDataUrl.split(',')[1];
      var size = Math.floor(pureB64.length * 0.75);
      var sizeStr = size > 1024 * 1024 
        ? (size / (1024 * 1024)).toFixed(2) + ' MB' 
        : (size / 1024).toFixed(2) + ' KB';

      infoFormat.textContent = mime;
      infoSize.textContent = testImg.width + ' x ' + testImg.height + ' px';
      infoFilesize.textContent = '约 ' + sizeStr;

      b642imgResult.hidden = false;
      
      // 下载逻辑
      btnDownloadB64.onclick = function() {
        var a = document.createElement('a');
        a.href = finalDataUrl;
        a.download = 'decoded_image.' + ext;
        a.click();
      };
    };
    testImg.onerror = function() {
      alert('❌ 解码失败：提供的 Base64 代码不是有效图片，或者已被截断。');
      b642imgResult.hidden = true;
    };
    testImg.src = finalDataUrl;
  });

  btnClearB64.addEventListener('click', function() {
    b64Input.value = '';
    b642imgResult.hidden = true;
  });
})();