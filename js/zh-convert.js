(function() {
  var inputEl = document.getElementById('input-text');
  var outputEl = document.getElementById('output-text');
  var typeEl = document.getElementById('convert-type');
  var btnConvert = document.getElementById('btn-convert');
  var btnSwap = document.getElementById('btn-swap');
  var btnClear = document.getElementById('btn-clear');
  var btnCopy = document.getElementById('btn-copy');
  var btnUpload = document.getElementById('btn-upload');
  var fileUpload = document.getElementById('file-upload');
  var btnDownload = document.getElementById('btn-download');
  var inputCount = document.getElementById('input-count');
  var outputCount = document.getElementById('output-count');

  var converters = {};

  function getConverter(type) {
    if (!converters[type]) {
      var map = {
        cn2t: { from: 'cn', to: 't' },
        t2cn: { from: 't', to: 'cn' }
      };
      converters[type] = OpenCC.Converter(map[type]);
    }
    return converters[type];
  }

  function updateCounts() {
    inputCount.textContent = inputEl.value.length;
    outputCount.textContent = outputEl.value.length;
  }

  function convert() {
    var text = inputEl.value;
    if (!text.trim()) {
      outputEl.value = '';
      updateCounts();
      return;
    }
    try {
      var convertFn = getConverter(typeEl.value);
      outputEl.value = convertFn(text);
    } catch (e) {
      outputEl.value = '转换失败，请检查文本。';
    }
    updateCounts();
  }

  // 转换按钮
  btnConvert.addEventListener('click', convert);

  // 交换：把结果放回输入，并反转转换方向
  btnSwap.addEventListener('click', function() {
    if (!outputEl.value) return;
    inputEl.value = outputEl.value;
    outputEl.value = '';
    typeEl.value = typeEl.value === 'cn2t' ? 't2cn' : 'cn2t';
    convert();
  });

  // 清空
  btnClear.addEventListener('click', function() {
    inputEl.value = '';
    outputEl.value = '';
    updateCounts();
    inputEl.focus();
  });

  // 复制
  btnCopy.addEventListener('click', function() {
    if (!outputEl.value) return;
    navigator.clipboard.writeText(outputEl.value).then(function() {
      var originalText = btnCopy.textContent;
      btnCopy.textContent = '✅ 已复制';
      setTimeout(function() { btnCopy.textContent = originalText; }, 2000);
    });
  });

  // 导入 TXT
  btnUpload.addEventListener('click', function() { fileUpload.click(); });
  fileUpload.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      inputEl.value = evt.target.result;
      convert();
    };
    reader.readAsText(file);
    fileUpload.value = '';
  });

  // 导出 TXT
  btnDownload.addEventListener('click', function() {
    if (!outputEl.value) return;
    var blob = new Blob([outputEl.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '转换结果.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  // 输入计数
  inputEl.addEventListener('input', updateCounts);
})();