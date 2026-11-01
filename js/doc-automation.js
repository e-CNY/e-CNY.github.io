(function () {
  var dropZone = document.getElementById('da-drop-zone');
  var fileInput = document.getElementById('da-input');
  var actions = document.getElementById('da-actions');
  var preview = document.getElementById('da-preview');
  var status = document.getElementById('da-status');
  var btnDownload = document.getElementById('btn-download-html');
  var currentHtml = '';

  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) handleFile(this.files[0]);
    this.value = '';
  });

  // 拖拽支持
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(ev) {
    dropZone.addEventListener(ev, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener('dragover', function() { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  function handleFile(file) {
    if (!file.name.endsWith('.docx')) return alert('请上传 .docx 格式的文件');
    status.textContent = '正在解析...';
    
    var reader = new FileReader();
    reader.onload = function (e) {
      var arrayBuffer = e.target.result;
      
      // 使用 Mammoth 将 docx 转为 HTML，并将图片转 base64
      mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, {
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        })
      }).then(function (result) {
        currentHtml = result.value;
        preview.innerHTML = currentHtml;
        status.textContent = '✅ 解析成功: ' + file.name;
        actions.style.display = 'block';
        btnDownload.style.display = 'block';
      }).catch(function (err) {
        alert('解析失败: ' + err.message);
        status.textContent = '解析失败';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  document.getElementById('btn-copy-html').addEventListener('click', function () {
    navigator.clipboard.writeText(currentHtml).then(function() {
      alert('HTML 代码已复制到剪贴板');
    });
  });

  document.getElementById('btn-copy-rich').addEventListener('click', function () {
    // 将 HTML 作为富文本复制，粘贴到 Word 里可保留格式
    var div = document.createElement('div');
    div.innerHTML = currentHtml;
    div.style.position = 'fixed';
    div.style.left = '-9999px';
    document.body.appendChild(div);
    
    var range = document.createRange();
    range.selectNodeContents(div);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    document.execCommand('copy');
    document.body.removeChild(div);
    alert('富文本已复制，可直接粘贴到 Word 中！');
  });

  btnDownload.addEventListener('click', function () {
    var blob = new Blob([currentHtml], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'converted_' + Date.now() + '.html';
    a.click();
    URL.revokeObjectURL(url);
  });
})();