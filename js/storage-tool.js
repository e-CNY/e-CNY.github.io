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

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ================= DOM 元素 =================
  var tbody = document.getElementById('st-tbody');
  var emptyMsg = document.getElementById('st-empty');
  var tabs = document.querySelectorAll('.st-tab');
  var searchInput = document.getElementById('st-search');
  
  var statType = document.getElementById('st-stat-type');
  var statCount = document.getElementById('st-stat-count');
  var statSize = document.getElementById('st-stat-size');

  var editModal = document.getElementById('edit-modal');
  var confirmModal = document.getElementById('confirm-modal');
  
  var currentType = 'local'; // 'local' or 'session'
  var isEditing = false;
  var currentEditKey = '';

  // ================= 核心逻辑 =================
  function getStorage() {
    return currentType === 'local' ? localStorage : sessionStorage;
  }

  // Tab 切换
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentType = tab.dataset.target === 'panel-local' ? 'local' : 'session';
      statType.textContent = currentType === 'local' ? 'LocalStorage' : 'SessionStorage';
      searchInput.value = '';
      renderTable();
    });
  });

  // 渲染表格
  function renderTable() {
    var storage = getStorage();
    var query = searchInput.value.trim().toLowerCase();
    var html = '';
    var count = 0;
    var totalSize = 0;

    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      var val = storage.getItem(key);
      
      // 计算大小
      totalSize += key.length + val.length;

      // 搜索过滤
      if (query && key.toLowerCase().indexOf(query) === -1 && val.toLowerCase().indexOf(query) === -1) {
        continue;
      }
      
      count++;

      var isJson = false;
      var displayVal = val;
      try {
        if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
          var parsed = JSON.parse(val);
          displayVal = JSON.stringify(parsed); // 紧凑显示
          isJson = true;
        }
      } catch(e) {}
      
      // 截断长文本
      if (displayVal.length > 150) {
        displayVal = displayVal.slice(0, 150) + '...';
      }

      html += '<tr>';
      html += '<td style="font-weight:bold; color:#8a5a2b;">' + escapeHtml(key) + '</td>';
      html += '<td>' + (isJson ? '<span class="st-badge json">JSON</span>' : '') + '<div class="st-val-preview">' + escapeHtml(displayVal) + '</div></td>';
      html += '<td style="text-align: center; white-space: nowrap;">';
      html += '<button class="st-btn-sm edit" data-key="' + escapeHtml(key) + '">编辑</button> ';
      html += '<button class="st-btn-sm del" data-key="' + escapeHtml(key) + '">删除</button>';
      html += '</td>';
      html += '</tr>';
    }

    tbody.innerHTML = html;
    
    // 更新统计
    statCount.textContent = storage.length;
    statSize.textContent = formatSize(totalSize * 2); // 粗略估算 UTF-16 占2字节

    if (count === 0) {
      emptyMsg.style.display = 'flex';
      if (query) {
        emptyMsg.innerHTML = '<div style="font-size:2rem; margin-bottom:10px;">🔍</div>没有找到匹配的记录';
      } else {
        emptyMsg.innerHTML = '<div style="font-size:2rem; margin-bottom:10px;">📭</div>当前存储为空';
      }
    } else {
      emptyMsg.style.display = 'none';
    }
  }

  // 搜索监听
  searchInput.addEventListener('input', renderTable);

  // ================= 新增与编辑 =================
  var modalTitle = document.getElementById('modal-title');
  var modalKey = document.getElementById('modal-key');
  var modalValue = document.getElementById('modal-value');
  var jsonHint = document.getElementById('json-hint');
  var jsonError = document.getElementById('json-error');

  // JSON 实时校验
  modalValue.addEventListener('input', function() {
    var val = this.value.trim();
    if (!val) {
      jsonHint.style.display = 'none';
      jsonError.style.display = 'none';
      return;
    }
    if (val.startsWith('{') || val.startsWith('[')) {
      try {
        JSON.parse(val);
        jsonHint.style.display = 'block';
        jsonError.style.display = 'none';
      } catch(e) {
        jsonHint.style.display = 'none';
        jsonError.style.display = 'block';
      }
    } else {
      jsonHint.style.display = 'none';
      jsonError.style.display = 'none';
    }
  });

  window.openModal = function(isEdit, key, val) {
    isEditing = isEdit;
    currentEditKey = key || '';
    
    modalTitle.textContent = isEdit ? '编辑键值对' : '新增键值对';
    modalKey.value = key || '';
    modalKey.disabled = isEdit; // 编辑时不允许修改键名
    modalValue.value = val || '';
    
    // 如果是 JSON，尝试格式化输出
    if (val) {
      try {
        if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
          modalValue.value = JSON.stringify(JSON.parse(val), null, 2);
        }
      } catch(e) {}
    }

    modalValue.dispatchEvent(new Event('input'));
    editModal.style.display = 'flex';
    if (!isEdit) modalKey.focus();
    else modalValue.focus();
  };

  window.closeModal = function() {
    editModal.style.display = 'none';
  };

  document.getElementById('btn-add').addEventListener('click', function() {
    openModal(false, '', '');
  });

  document.getElementById('modal-save').addEventListener('click', function() {
    var key = modalKey.value.trim();
    var val = modalValue.value;
    
    if (!key) return showToast('键名不能为空', true);
    
    if (!isEditing) {
      // 新增前检查是否已存在
      if (getStorage().getItem(key) !== null) {
        if (!confirm('键名 "' + key + '" 已存在，是否覆盖？')) return;
      }
    }
    
    try {
      getStorage().setItem(key, val);
      closeModal();
      renderTable();
      showToast(isEditing ? '修改成功' : '添加成功');
    } catch(e) {
      showToast('保存失败：存储空间可能已满', true);
    }
  });

  // ================= 删除与清空 (自定义确认框) =================
  var confirmTitle = document.getElementById('confirm-title');
  var confirmDesc = document.getElementById('confirm-desc');
  var confirmYes = document.getElementById('confirm-yes');
  var confirmAction = null;

  window.showConfirm = function(title, desc, onYes) {
    confirmTitle.textContent = title;
    confirmDesc.textContent = desc;
    confirmAction = onYes;
    confirmModal.style.display = 'flex';
  };

  window.closeConfirm = function() {
    confirmModal.style.display = 'none';
    confirmAction = null;
  };

  confirmYes.addEventListener('click', function() {
    if (confirmAction) confirmAction();
    closeConfirm();
  });

  // 表格操作代理
  tbody.addEventListener('click', function (e) {
    if (e.target.classList.contains('edit')) {
      var key = e.target.dataset.key;
      var currentVal = getStorage().getItem(key);
      openModal(true, key, currentVal);
    } 
    else if (e.target.classList.contains('del')) {
      var key = e.target.dataset.key;
      showConfirm('删除确认', '确定要删除键 "' + key + '" 吗？此操作不可逆。', function() {
        getStorage().removeItem(key);
        renderTable();
        showToast('已删除');
      });
    }
  });

  // 清空按钮
  document.getElementById('btn-clear').addEventListener('click', function () {
    if (getStorage().length === 0) return showToast('当前存储已经是空的了', true);
    showConfirm('清空存储', '⚠️ 警告：确定要清空所有的 ' + statType.textContent + ' 吗？此操作不可逆！', function() {
      getStorage().clear();
      renderTable();
      showToast('已清空当前存储');
    });
  });

  // ================= 导入导出 =================
  document.getElementById('btn-export').addEventListener('click', function() {
    var storage = getStorage();
    if (storage.length === 0) return showToast('当前存储为空，没有可导出的内容', true);
    
    var data = {};
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      data[key] = storage.getItem(key);
    }
    
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (currentType === 'local' ? 'local' : 'session') + 'Storage_backup_' + Date.now() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('备份文件已导出');
  });

  var importFile = document.getElementById('import-file');
  document.getElementById('btn-import').addEventListener('click', function() {
    importFile.click();
  });

  importFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      try {
        var data = JSON.parse(evt.target.result);
        if (typeof data !== 'object' || data === null) throw new Error('不是有效的对象格式');
        
        var count = 0;
        for (var key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            getStorage().setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]));
            count++;
          }
        }
        renderTable();
        showToast('成功导入 ' + count + ' 条数据');
      } catch(err) {
        showToast('导入失败，请检查文件格式是否为标准的 JSON 备份', true);
      }
    };
    reader.readAsText(file);
    this.value = '';
  });

  // 刷新
  document.getElementById('btn-refresh').addEventListener('click', function() {
    renderTable();
    showToast('列表已刷新');
  });

  // 初始化
  renderTable();

})();