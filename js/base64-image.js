(function() {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand('copy');
        ok ? resolve() : reject(new Error('execCommand failed'));
      } catch(e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ================== Tab 切换 ==================
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


  // ================== 1. 图片转 Base64 ==================
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var img2b64Result = document.getElementById('img2b64-result');
  var uploadedImg = document.getElementById('uploaded-img');
  var fileInfo = document.getElementById('file-info');
  var base64Text = document.getElementById('base64-text');
  var dataurlText = document.getElementById('dataurl-text');

  var enableCompress = document.getElementById('enable-compress');
  var compressSettings = document.getElementById('compress-settings');
  var compressQuality = document.getElementById('compress-quality');
  var compressQualityVal = document.getElementById('compress-quality-val');
  
  var snippetHtml = document.getElementById('snippet-html');
  var snippetCss = document.getElementById('snippet-css');
  var snippetMd = document.getElementById('snippet-md');
  var snippetReact = document.getElementById('snippet-react');

  var currentDataUrl = '';
  var currentMime = '';
  var originalImageObj = null;
  var originalFile = null;

  // 交互事件
  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
    this.value = '';
  });

  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function(e) { e.preventDefault(); dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  // 全局粘贴支持 (Tab 1)
  document.addEventListener('paste', function(e) {
    if (!panelImg2b64.classList.contains('active')) return;
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      if (item.type.indexOf('image') !== -1) {
        var file = item.getAsFile();
        if (file) { e.preventDefault(); handleFile(file); }
        return;
      }
    }
  });

  compressQuality.addEventListener('input', function() {
    compressQualityVal.textContent = this.value + '%';
    if (enableCompress.checked && originalImageObj) {
      generateBase64(originalImageObj, true);
    }
  });

  enableCompress.addEventListener('change', function() {
    compressSettings.style.display = this.checked ? 'block' : 'none';
    if (originalImageObj) {
      generateBase64(originalImageObj, this.checked);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/') && !/\.(svg|webp)$/i.test(file.name)) {
      showToast('请选择图片文件！');
      return;
    }
    originalFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var img = new Image();
      img.onload = function() {
        originalImageObj = img;
        uploadedImg.src = dataUrl;
        
        // 显示信息
        var sizeStr = formatSize(file.size);
        fileInfo.innerHTML = 
          '📄 文件名：' + file.name + '<br>' +
          '📦 原文件大小：' + sizeStr + '<br>' +
          '🖼️ 图片尺寸：' + img.naturalWidth + ' × ' + img.naturalHeight + ' px<br>' +
          '🔤 格式：' + (file.type || '未知');

        // 如果是 SVG，Canvas 压缩可能会失效，强制禁用压缩
        if (file.type === 'image/svg+xml') {
          enableCompress.checked = false;
          enableCompress.disabled = true;
          compressSettings.style.display = 'none';
          generateBase64(img, false, dataUrl);
        } else {
          enableCompress.disabled = false;
          generateBase64(img, enableCompress.checked, dataUrl);
        }

        img2b64Result.hidden = false;
        dropZone.style.display = 'none';
        showToast('图片加载成功');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function generateBase64(img, useCompress, originalDataUrl) {
    var finalDataUrl = originalDataUrl;

    if (useCompress && img) {
      var cvs = document.createElement('canvas');
      cvs.width = img.naturalWidth;
      cvs.height = img.naturalHeight;
      var ctx = cvs.getContext('2d');
      
      // JPG 不支持透明，铺白底
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(img, 0, 0);

      var quality = parseInt(compressQuality.value, 10) / 100;
      finalDataUrl = cvs.toDataURL('image/jpeg', quality);
    }

    currentDataUrl = finalDataUrl;
    var match = finalDataUrl.match(/^data:([^;]+);base64,/);
    currentMime = match ? match[1] : 'image/png';
    
    var pureBase64 = finalDataUrl.split(',')[1];
    
    // 更新 textarea
    base64Text.value = pureBase64;
    dataurlText.value = finalDataUrl;

    // 更新代码片段
    snippetHtml.textContent = '<img src="' + finalDataUrl + '" alt="image" />';
    snippetCss.textContent = 'background-image: url("' + finalDataUrl + '");';
    snippetMd.textContent = '![image](' + finalDataUrl + ')';
    snippetReact.textContent = '<img src="' + finalDataUrl + '" alt="image" />';
    
    // 更新文件大小信息
    var b64Length = pureBase64.length;
    var estimatedSize = Math.floor(b64Length * 0.75); // 估算大小
    var infoStr = '📝 Base64 字符数：' + b64Length + ' 个';
    if (useCompress) {
      infoStr += '<br>🗜️ 压缩后大小：' + formatSize(estimatedSize);
    }
    
    // 保留原有 fileInfo 的其他信息，替换大小
    var infoLines = fileInfo.innerHTML.split('<br>');
    var newInfo = [];
    for (var i = 0; i < infoLines.length; i++) {
      if (infoLines[i].indexOf('Base64 字符数') === -1 && infoLines[i].indexOf('压缩后大小') === -1) {
        newInfo.push(infoLines[i]);
      }
    }
    fileInfo.innerHTML = newInfo.join('<br>') + '<br>' + infoStr;
  }

  // 复制按钮
  document.getElementById('btn-copy-pure').addEventListener('click', function() {
    if (!base64Text.value) return;
    copyTextToClipboard(base64Text.value).then(function() {
      showToast('已复制纯 Base64');
    }).catch(function() { showToast('复制失败'); });
  });

  document.getElementById('btn-copy-url').addEventListener('click', function() {
    if (!dataurlText.value) return;
    copyTextToClipboard(dataurlText.value).then(function() {
      showToast('已复制 Data URL');
    }).catch(function() { showToast('复制失败'); });
  });

  // 下载 TXT
  document.getElementById('btn-download-txt').addEventListener('click', function() {
    if (!base64Text.value) return;
    var blob = new Blob([base64Text.value], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'image_base64_' + Date.now() + '.txt');
    showToast('已下载 TXT 文件');
  });

  // 代码片段复制
  document.querySelectorAll('.code-snippets .small-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var type = this.dataset.copy;
      var text = '';
      if (type === 'html') text = snippetHtml.textContent;
      else if (type === 'css') text = snippetCss.textContent;
      else if (type === 'md') text = snippetMd.textContent;
      else if (type === 'react') text = snippetReact.textContent;

      copyTextToClipboard(text).then(function() {
        showToast('已复制代码片段');
      }).catch(function() { showToast('复制失败'); });
    });
  });


  // ================== 2. Base64 转图片 ==================
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
      showToast('请先粘贴 Base64 字符串！');
      return;
    }

    // 清理空白字符（可能包含换行）
    raw = raw.replace(/\s+/g, '');

    var finalDataUrl = raw;
    if (!raw.startsWith('data:')) {
      // 如果没有前缀，默认按 PNG 补齐
      finalDataUrl = 'data:image/png;base64,' + raw;
    }

    var testImg = new Image();
    testImg.onload = function() {
      decodedImg.src = finalDataUrl;
      
      var match = finalDataUrl.match(/^data:([^;]+);base64,/);
      var mime = match ? match[1] : '未知格式';
      var ext = mime.split('/')[1] || 'png';
      
      var pureB64 = finalDataUrl.split(',')[1];
      
      // 精确计算解码后的字节大小
      var size = (pureB64.length * 3 / 4) - (pureB64.endsWith('==') ? 2 : (pureB64.endsWith('=') ? 1 : 0));
      var sizeStr = formatSize(size);

      infoFormat.textContent = mime;
      infoSize.textContent = testImg.width + ' × ' + testImg.height + ' px';
      infoFilesize.textContent = sizeStr;

      b642imgResult.hidden = false;
      showToast('解码成功');
      
      // 下载逻辑
      btnDownloadB64.onclick = function() {
        var a = document.createElement('a');
        a.href = finalDataUrl;
        a.download = 'decoded_image_' + Date.now() + '.' + ext;
        a.click();
        showToast('图片已下载');
      };
    };
    testImg.onerror = function() {
      showToast('❌ 解码失败：提供的 Base64 代码不是有效图片，或者已被截断。');
      b642imgResult.hidden = true;
    };
    testImg.src = finalDataUrl;
  });

  btnClearB64.addEventListener('click', function() {
    b64Input.value = '';
    b642imgResult.hidden = true;
  });

  // Tab 2 粘贴自动填充 (可选增强)
  document.addEventListener('paste', function(e) {
    if (!panelB642img.classList.contains('active')) return;
    if (document.activeElement === b64Input) return; // 如果焦点已经在输入框，走默认逻辑
    if (!e.clipboardData) return;
    var text = e.clipboardData.getData('text');
    if (text) {
      // 判断像不像 Base64 字符串
      if (text.length > 50 && (text.indexOf('data:image') === 0 || /^[A-Za-z0-9+/=]+$/.test(text.replace(/\s+/g, '')))) {
        e.preventDefault();
        b64Input.value = text;
        showToast('已自动填充，点击“生成图片”查看');
      }
    }
  });

})();