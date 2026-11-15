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

  // ================== DOM 元素 ==================
  var inputEl = document.getElementById('input-text');
  var outputEl = document.getElementById('output-text');
  var typeEl = document.getElementById('convert-type');
  var autoConvertEl = document.getElementById('auto-convert');
  
  var btnConvert = document.getElementById('btn-convert');
  var btnSwap = document.getElementById('btn-swap');
  var btnClear = document.getElementById('btn-clear');
  var btnCopy = document.getElementById('btn-copy');
  var btnUpload = document.getElementById('btn-upload');
  var fileUpload = document.getElementById('file-upload');
  var btnDownload = document.getElementById('btn-download');
  
  var inputCount = document.getElementById('input-count');
  var outputCount = document.getElementById('output-count');
  var inputParagraphs = document.getElementById('input-paragraphs');
  var outputParagraphs = document.getElementById('output-paragraphs');

  var btnTrim = document.getElementById('btn-trim');
  var btnRemoveEmpty = document.getElementById('btn-remove-empty');
  var inputBox = document.getElementById('input-box');

  // ================== 状态 ==================
  var converters = {};
  var convertTimer = null;

  // ================== 核心转换逻辑 ==================
  // 检查 opencc 是否加载
  if (typeof OpenCC === 'undefined') {
    showToast('OpenCC 库未加载，请检查 js/libs 目录');
    return;
  }

  // 恢复到最基础的简繁互转配置
  var CONFIG_MAP = {
    cn2t: { from: 'cn', to: 't' },
    t2cn: { from: 't',  to: 'cn' }
  };

  function getConverter(type) {
    if (!converters[type]) {
      try {
        converters[type] = OpenCC.Converter(CONFIG_MAP[type]);
      } catch (e) {
        console.error('转换器初始化失败:', e);
        showToast('该转换模式暂不支持');
        return null;
      }
    }
    return converters[type];
  }

  // ================== 统计与更新 ==================
  function updateCounts() {
    var inText = inputEl.value;
    var outText = outputEl.value;
    
    inputCount.textContent = inText.length;
    outputCount.textContent = outText.length;
    
    // 统计段落（非空行数量）
    inputParagraphs.textContent = inText.split('\n').filter(function(l) { return l.trim().length > 0; }).length;
    outputParagraphs.textContent = outText.split('\n').filter(function(l) { return l.trim().length > 0; }).length;
  }

  function performConvert() {
    var text = inputEl.value;
    if (!text) {
      outputEl.value = '';
      updateCounts();
      return;
    }
    
    var convertFn = getConverter(typeEl.value);
    if (!convertFn) return;

    try {
      outputEl.value = convertFn(text);
    } catch (e) {
      outputEl.value = '转换失败，请检查文本内容。';
      console.error(e);
    }
    updateCounts();
  }

  // 防抖转换
  function triggerAutoConvert() {
    if (!autoConvertEl.checked) return;
    clearTimeout(convertTimer);
    convertTimer = setTimeout(performConvert, 300);
  }

  // ================== 事件绑定 ==================

  // 手动转换
  btnConvert.addEventListener('click', function() {
    performConvert();
    showToast('转换完成');
  });

  // 输入监听
  inputEl.addEventListener('input', function() {
    updateCounts();
    triggerAutoConvert();
  });

  // 下拉菜单更改
  typeEl.addEventListener('change', function() {
    if (autoConvertEl.checked) performConvert();
  });

  // 交换逻辑 (仅简繁互转)
  btnSwap.addEventListener('click', function() {
    // 1. 交换文本
    var temp = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = temp;

    // 2. 翻转转换方向
    typeEl.value = typeEl.value === 'cn2t' ? 't2cn' : 'cn2t';

    // 3. 重新转换
    if (outputEl.value) performConvert();
    updateCounts();
    showToast('已交换文本与方向');
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
    if (!outputEl.value) return showToast('没有可复制的内容');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(outputEl.value).then(function() {
        showToast('✅ 已复制到剪贴板');
      }).catch(function() {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
    
    function fallbackCopy() {
      outputEl.select();
      document.execCommand('copy');
      showToast('✅ 已复制到剪贴板');
    }
  });

  // ================== 文件导入与导出 ==================
  
  btnUpload.addEventListener('click', function() { fileUpload.click(); });
  
  fileUpload.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) readFile(file);
    this.value = '';
  });

  // 拖拽支持
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(evt) {
    inputBox.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); });
  });
  inputBox.addEventListener('dragover', function() { inputBox.classList.add('dragover'); });
  inputBox.addEventListener('dragleave', function() { inputBox.classList.remove('dragover'); });
  inputBox.addEventListener('drop', function(e) {
    inputBox.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      var file = e.dataTransfer.files[0];
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        readFile(file);
      } else {
        showToast('请拖入 .txt 或 .md 文件');
      }
    }
  });

  function readFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      return showToast('文件过大，请限制在 10MB 以内');
    }
    var reader = new FileReader();
    reader.onload = function(evt) {
      inputEl.value = evt.target.result;
      updateCounts();
      performConvert();
      showToast('文件导入成功');
    };
    reader.readAsText(file);
  }

  btnDownload.addEventListener('click', function() {
    if (!outputEl.value) return showToast('没有可导出的内容');
    
    var blob = new Blob([outputEl.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '转换结果_' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('文件已导出');
  });

  // ================== 快捷文本清理 ==================
  
  btnTrim.addEventListener('click', function() {
    if (!inputEl.value) return;
    inputEl.value = inputEl.value.split('\n').map(function(line) {
      return line.trim();
    }).join('\n');
    updateCounts();
    triggerAutoConvert();
    showToast('已去除首尾空格');
  });

  btnRemoveEmpty.addEventListener('click', function() {
    if (!inputEl.value) return;
    inputEl.value = inputEl.value.split('\n').filter(function(line) {
      return line.trim().length > 0;
    }).join('\n');
    updateCounts();
    triggerAutoConvert();
    showToast('已删除空行');
  });

  // ================== 快捷键 ==================
  inputEl.addEventListener('keydown', function(e) {
    // Ctrl + Enter 快速转换
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      performConvert();
      showToast('转换完成');
    }
  });

  // ================== 初始化 ==================
  updateCounts();
})();