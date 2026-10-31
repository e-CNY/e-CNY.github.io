(function () {
  var tbody = document.getElementById('st-tbody');
  var emptyMsg = document.getElementById('st-empty');
  var tabs = document.querySelectorAll('.st-tab');
  
  var currentType = 'local'; // 'local' or 'session'

  // Tab 切换
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentType = tab.dataset.target === 'panel-local' ? 'local' : 'session';
      renderTable();
    });
  });

  function getStorage() {
    return currentType === 'local' ? localStorage : sessionStorage;
  }

  function renderTable() {
    var storage = getStorage();
    tbody.innerHTML = '';
    
    if (storage.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        var val = storage.getItem(key);
        
        var tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(key)}</td>
          <td>${escapeHtml(val)}</td>
          <td style="text-align: center;">
            <button class="st-btn-sm edit" data-key="${escapeHtml(key)}">编辑</button>
            <button class="st-btn-sm del" data-key="${escapeHtml(key)}">删除</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 事件代理：编辑和删除
  tbody.addEventListener('click', function (e) {
    if (e.target.classList.contains('edit')) {
      var key = e.target.dataset.key;
      var currentVal = getStorage().getItem(key);
      var newVal = prompt('修改键 "' + key + '" 的值:', currentVal);
      if (newVal !== null) {
        getStorage().setItem(key, newVal);
        renderTable();
      }
    } 
    else if (e.target.classList.contains('del')) {
      var key = e.target.dataset.key;
      if (confirm('确定要删除键 "' + key + '" 吗？')) {
        getStorage().removeItem(key);
        renderTable();
      }
    }
  });

  // 刷新按钮
  document.getElementById('btn-refresh').addEventListener('click', renderTable);

  // 新增按钮
  document.getElementById('btn-add').addEventListener('click', function () {
    var key = prompt('请输入键名 (Key):');
    if (!key) return;
    if (getStorage().getItem(key) !== null) {
      if (!confirm('键名已存在，是否覆盖？')) return;
    }
    var val = prompt('请输入值 (Value):');
    if (val !== null) {
      getStorage().setItem(key, val);
      renderTable();
    }
  });

  // 清空按钮
  document.getElementById('btn-clear').addEventListener('click', function () {
    if (getStorage().length === 0) return;
    if (confirm('⚠️ 警告：确定要清空当前所有的 ' + (currentType === 'local' ? 'Local' : 'Session') + 'Storage 吗？此操作不可逆！')) {
      getStorage().clear();
      renderTable();
    }
  });

  // 初始化
  renderTable();
})();