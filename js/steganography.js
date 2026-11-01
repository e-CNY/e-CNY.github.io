(function () {
  var tabs = document.querySelectorAll('.st-tab');
  var panels = document.querySelectorAll('.st-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // ================= 隐藏信息 =================
  var hideImgInput = document.getElementById('hide-img');
  var hideText = document.getElementById('hide-text');
  var btnHide = document.getElementById('btn-hide');
  var hideResult = document.getElementById('hide-result');

  btnHide.addEventListener('click', function () {
    var file = hideImgInput.files[0];
    var text = hideText.value;
    
    if (!file) return alert('请上传封面图片');
    if (!text) return alert('请输入要隐藏的文本');

    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imgData.data;

        // 将文本转为包含结束符的二进制串
        var textToHide = text + '\0';
        var binaryStr = '';
        for (var i = 0; i < textToHide.length; i++) {
          var charCode = textToHide.charCodeAt(i);
          binaryStr += charCode.toString(2).padStart(8, '0');
        }

        if (binaryStr.length > data.length / 3) {
          return alert('图片太小，无法容纳这么长的文本！请换一张大图。');
        }

        // 注入 LSB
        var bitIndex = 0;
        for (var i = 0; i < data.length; i += 4) {
          for (var j = 0; j < 3; j++) { // 只修改 RGB，不动 Alpha
            if (bitIndex < binaryStr.length) {
              // 将当前颜色的最低位清零，并设为二进制字符
              data[i + j] = (data[i + j] & 0xFE) | parseInt(binaryStr[bitIndex]);
              bitIndex++;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        hideResult.innerHTML = `
          <img src="${canvas.toDataURL('image/png')}" alt="带隐写信息的图片">
          <br>
          <a href="${canvas.toDataURL('image/png')}" download="secret_image.png">⬇️ 下载隐秘图片</a>
        `;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ================= 提取信息 =================
  var extractImgInput = document.getElementById('extract-img');
  var btnExtract = document.getElementById('btn-extract');
  var extractText = document.getElementById('extract-text');

  btnExtract.addEventListener('click', function () {
    var file = extractImgInput.files[0];
    if (!file) return alert('请上传包含隐秘信息的图片');

    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imgData.data;

        var binaryStr = '';
        for (var i = 0; i < data.length; i += 4) {
          for (var j = 0; j < 3; j++) {
            binaryStr += (data[i + j] & 1).toString();
          }
        }

        // 按 8 位分割还原文本
        var extractedStr = '';
        for (var i = 0; i < binaryStr.length; i += 8) {
          var byte = binaryStr.substr(i, 8);
          if (byte.length < 8) break;
          var charCode = parseInt(byte, 2);
          if (charCode === 0) break; // 遇到结束符停止
          extractedStr += String.fromCharCode(charCode);
        }

        if (extractedStr) {
          extractText.value = extractedStr;
        } else {
          extractText.value = '未能提取到隐藏信息，或者原图已损坏（如被微信压缩、转为 JPG）。';
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

})();