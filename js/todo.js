/* js/todo.js */
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

  function todayString() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ================= 状态定义 =================
  var STORAGE_KEY = 'tool.todo.v2';
  var DEFAULT_CATEGORIES = ['默认', '工作', '生活', '学习', '购物'];

  var newTaskInput   = document.getElementById('newTask');
  var addBtn         = document.getElementById('addBtn');
  var taskListEl     = document.getElementById('taskList');
  var emptyTip       = document.getElementById('emptyTip');
  var statusFiltersEl= document.getElementById('statusFilters');
  var searchEl       = document.getElementById('search');
  var catFiltersEl   = document.getElementById('catFilters');
  var sortByEl       = document.getElementById('sortBy');
  var statsEl        = document.getElementById('stats');
  var importBtn      = document.getElementById('importBtn');
  var exportJsonBtn  = document.getElementById('exportJsonBtn');
  var exportMdBtn    = document.getElementById('exportMdBtn');
  var clearDoneBtn   = document.getElementById('clearDoneBtn');
  var clearAllBtn    = document.getElementById('clearAllBtn');
  var importFile     = document.getElementById('importFile');
  var selectAllCb    = document.getElementById('selectAll');

  var state = {
    tasks: [],
    categories: DEFAULT_CATEGORIES.slice(),
    status: 'all',
    category: 'all',
    keyword: '',
    sortBy: 'order'
  };

  var uidCounter = 0;
  function genId() {
    return 't' + Date.now().toString(36) + '_' + (uidCounter++).toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ================= 数据持久化 =================
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (Array.isArray(data.tasks)) {
        state.tasks = data.tasks.map(normalizeTask);
      }
      if (Array.isArray(data.categories) && data.categories.length) {
        state.categories = data.categories.slice();
      }
    } catch (e) { console.warn('读取缓存失败'); }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks: state.tasks,
        categories: state.categories
      }));
    } catch (e) { showToast('保存失败，本地存储可能已满', true); }
  }

  function normalizeTask(t) {
    t = t || {};
    return {
      id: String(t.id || genId()),
      text: String(t.text || ''),
      done: !!t.done,
      priority: ['high', 'medium', 'low'].indexOf(t.priority) >= 0 ? t.priority : 'medium',
      category: String(t.category || state.categories[0] || '默认'),
      due: String(t.due || ''),
      createdAt: Number(t.createdAt) || Date.now(),
      order: Number(t.order) || 0
    };
  }

  // ================= 渲染主逻辑 =================
  function render() {
    // 状态按钮高亮
    Array.prototype.forEach.call(statusFiltersEl.children, function (btn) {
      btn.classList.toggle('active', btn.dataset.status === state.status);
    });

    renderCategoryFilters();
    
    // 过滤数据
    var list = state.tasks.filter(function (t) {
      if (state.status === 'active' && t.done) return false;
      if (state.status === 'done' && !t.done) return false;
      if (state.category !== 'all' && t.category !== state.category) return false;
      if (state.keyword && t.text.toLowerCase().indexOf(state.keyword) === -1) return false;
      return true;
    });

    // 排序
    var mode = state.sortBy;
    if (mode === 'order') list.sort(function (a, b) { return a.order - b.order; });
    else if (mode === 'created') list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    else if (mode === 'priority') {
      var rank = { high: 0, medium: 1, low: 2 };
      list.sort(function (a, b) {
        var r = rank[a.priority] - rank[b.priority];
        return r !== 0 ? r : a.order - b.order;
      });
    } else if (mode === 'due') {
      list.sort(function (a, b) {
        if (!a.due && !b.due) return a.order - b.order;
        if (!a.due) return 1;
        if (!b.due) return -1;
        var r = a.due.localeCompare(b.due);
        return r !== 0 ? r : a.order - b.order;
      });
    }

    // 渲染 DOM
    taskListEl.innerHTML = '';
    if (!list.length) {
      emptyTip.hidden = false;
      emptyTip.textContent = state.tasks.length === 0 ? '还没有任务，在上方输入框添加第一个吧 🎯' : '当前筛选条件下没有任务';
    } else {
      emptyTip.hidden = true;
    }

    var todayStr = todayString();
    var canDrag = (mode === 'order');
    
    list.forEach(function (t) {
      taskListEl.appendChild(renderTask(t, todayStr, canDrag));
    });

    // 更新统计与全选框
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    var active = total - done;
    statsEl.innerHTML = '共 <strong>' + total + '</strong> 项 · 进行中 <strong>' + active + '</strong> · 已完成 <strong>' + done + '</strong>';

    var visibleDone = list.filter(function(t) { return t.done; }).length;
    if (list.length > 0 && visibleDone === list.length) {
      selectAllCb.checked = true;
    } else {
      selectAllCb.checked = false;
    }
  }

  function renderCategoryFilters() {
    catFiltersEl.innerHTML = '';
    var allBtn = document.createElement('button');
    allBtn.textContent = '全部分类';
    if (state.category === 'all') allBtn.classList.add('active');
    allBtn.addEventListener('click', function () { state.category = 'all'; render(); });
    catFiltersEl.appendChild(allBtn);

    state.categories.forEach(function (c) {
      var b = document.createElement('button');
      b.textContent = c;
      if (state.category === c) b.classList.add('active');
      b.addEventListener('click', function () { state.category = c; render(); });
      catFiltersEl.appendChild(b);
    });

    var addCat = document.createElement('button');
    addCat.className = 'cat-add';
    addCat.textContent = '＋';
    addCat.title = '新建分类';
    addCat.addEventListener('click', function () {
      // 替换为输入框
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'cat-input';
      input.placeholder = '分类名，回车保存';
      
      catFiltersEl.replaceChild(input, addCat);
      input.focus();
      
      function saveCat() {
        var name = input.value.trim();
        if (name && state.categories.indexOf(name) === -1) {
          state.categories.push(name);
          save();
          showToast('已添加分类：' + name);
        }
        render();
      }
      
      input.addEventListener('blur', saveCat);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); saveCat(); }
        else if (e.key === 'Escape') { e.preventDefault(); render(); }
      });
    });
    catFiltersEl.appendChild(addCat);
  }

  function renderTask(t, todayStr, draggable) {
    var li = document.createElement('li');
    li.className = 'task' + (t.done ? ' done' : '') + (draggable ? '' : ' no-drag');
    li.dataset.id = t.id;
    if (draggable) li.draggable = true;

    // 拖拽手柄
    var handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.textContent = '≡';
    li.appendChild(handle);

    // 复选框
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'task-check';
    cb.checked = t.done;
    cb.addEventListener('change', function () {
      t.done = cb.checked;
      save();
      render();
    });
    li.appendChild(cb);

    // 主体区
    var main = document.createElement('div');
    main.className = 'task-main';

    var textEl = document.createElement('span');
    textEl.className = 'task-text';
    textEl.textContent = t.text;
    textEl.title = '双击编辑';
    textEl.addEventListener('dblclick', function () { startEdit(t, textEl); });
    main.appendChild(textEl);

    var meta = document.createElement('div');
    meta.className = 'task-meta';

    // 优先级
    var prio = document.createElement('button');
    prio.className = 'tag priority-' + t.priority;
    prio.textContent = t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低';
    prio.title = '点击切换优先级';
    prio.addEventListener('click', function () {
      t.priority = t.priority === 'high' ? 'medium' : t.priority === 'medium' ? 'low' : 'high';
      save(); render();
    });
    meta.appendChild(prio);

    // 分类
    var sel = document.createElement('select');
    sel.className = 'task-category';
    var cats = state.categories.slice();
    if (cats.indexOf(t.category) === -1) cats.push(t.category);
    cats.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      if (c === t.category) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      t.category = sel.value;
      save(); render();
    });
    meta.appendChild(sel);

    // 到期日
    var due = document.createElement('input');
    due.type = 'date';
    due.className = 'task-due';
    due.value = t.due || '';
    if (t.due && t.due < todayStr && !t.done) due.classList.add('overdue');
    due.addEventListener('change', function () {
      t.due = due.value;
      save(); render();
    });
    meta.appendChild(due);
    main.appendChild(meta);
    li.appendChild(main);

    // 删除
    var del = document.createElement('button');
    del.className = 'task-del';
    del.innerHTML = '×';
    del.title = '删除';
    del.addEventListener('click', function () {
      // 为了提高效率，去掉了 confirm，直接删除并提示
      state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
      save(); render();
      showToast('已删除任务');
    });
    li.appendChild(del);

    return li;
  }

  function startEdit(t, textEl) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-text-edit';
    input.value = t.text;
    input.maxLength = 200;

    textEl.replaceWith(input);
    input.focus();
    input.select();

    var committed = false;
    function commit() {
      if (committed) return;
      committed = true;
      var v = input.value.trim();
      if (v) { t.text = v; save(); }
      render();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); committed = true; render(); }
    });
  }

  // ================= 全选与操作 =================
  selectAllCb.addEventListener('change', function() {
    var isChecked = this.checked;
    // 只修改当前视图下可见的任务
    var visibleTasks = state.tasks.filter(function (t) {
      if (state.status === 'active' && t.done) return false;
      if (state.status === 'done' && !t.done) return false;
      if (state.category !== 'all' && t.category !== state.category) return false;
      if (state.keyword && t.text.toLowerCase().indexOf(state.keyword) === -1) return false;
      return true;
    });
    
    visibleTasks.forEach(function(t) { t.done = isChecked; });
    save();
    render();
    showToast(isChecked ? '已全部标记为完成' : '已全部标记为未完成');
  });

  // ================= 拖拽排序 =================
  var dragId = null;

  taskListEl.addEventListener('dragstart', function (e) {
    var li = e.target.closest('.task');
    if (!li || !li.draggable) { e.preventDefault(); return; }
    dragId = li.dataset.id;
    li.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (ignore) {}
    }
  });

  taskListEl.addEventListener('dragover', function (e) {
    if (!dragId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    var dragging = taskListEl.querySelector('.dragging');
    if (!dragging) return;
    var after = getDragAfterElement(taskListEl, e.clientY);
    if (after == null) {
      taskListEl.appendChild(dragging);
    } else if (after !== dragging) {
      taskListEl.insertBefore(dragging, after);
    }
  });

  taskListEl.addEventListener('drop', function (e) {
    if (!dragId) return;
    e.preventDefault();
    saveOrderFromDOM();
    dragId = null;
  });

  taskListEl.addEventListener('dragend', function () {
    var dragging = taskListEl.querySelector('.dragging');
    if (dragging) dragging.classList.remove('dragging');
    dragId = null;
  });

  function getDragAfterElement(container, y) {
    var els = Array.prototype.slice.call(container.querySelectorAll('.task:not(.dragging)'));
    return els.reduce(function (closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      return closest;
    }, { offset: -Infinity, element: null }).element;
  }

  function saveOrderFromDOM() {
    var domIds = Array.prototype.slice.call(taskListEl.querySelectorAll('.task')).map(function (li) { return li.dataset.id; });
    var domSet = {};
    domIds.forEach(function (id) { domSet[id] = true; });
    
    var hidden = state.tasks.filter(function (t) { return !domSet[t.id]; });
    hidden.sort(function (a, b) { return a.order - b.order; });
    
    var map = {};
    state.tasks.forEach(function (t) { map[t.id] = t; });
    
    var newArr = [];
    domIds.forEach(function (id) { if (map[id]) newArr.push(map[id]); });
    hidden.forEach(function (t) { newArr.push(t); });
    
    newArr.forEach(function (t, i) { t.order = i; });
    state.tasks = newArr;
    save();
    render();
  }

  // ================= 添加任务与事件 =================
  function addTask() {
    var text = newTaskInput.value.trim();
    if (!text) return;
    var t = normalizeTask({
      id: genId(),
      text: text,
      done: false,
      priority: 'medium',
      category: state.category !== 'all' ? state.category : (state.categories[0] || '默认'),
      due: '',
      createdAt: Date.now(),
      order: state.tasks.length
    });
    state.tasks.push(t);
    newTaskInput.value = '';
    newTaskInput.focus();
    save();
    render();
  }

  addBtn.addEventListener('click', addTask);
  newTaskInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
  });

  statusFiltersEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-status]');
    if (!btn) return;
    state.status = btn.dataset.status;
    render();
  });

  searchEl.addEventListener('input', function () {
    state.keyword = searchEl.value.trim().toLowerCase();
    render();
  });

  sortByEl.addEventListener('change', function () {
    state.sortBy = sortByEl.value;
    render();
  });

  // ================= 导入与导出 =================
  clearDoneBtn.addEventListener('click', function () {
    var doneCount = state.tasks.filter(function (t) { return t.done; }).length;
    if (doneCount === 0) return showToast('没有已完成的任务', true);
    state.tasks = state.tasks.filter(function (t) { return !t.done; });
    save(); render();
    showToast('已清除 ' + doneCount + ' 个已完成任务');
  });

  clearAllBtn.addEventListener('click', function () {
    if (state.tasks.length === 0) return showToast('列表已经是空的', true);
    if (!confirm('⚠️ 确定要清空所有 ' + state.tasks.length + ' 个任务吗？此操作不可恢复！')) return;
    state.tasks = [];
    save(); render();
    showToast('已清空全部任务');
  });

  function downloadBlob(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  exportJsonBtn.addEventListener('click', function () {
    var data = { version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks, categories: state.categories };
    downloadBlob(JSON.stringify(data, null, 2), 'todo_' + todayString() + '.json', 'application/json');
    showToast('JSON 备份已下载');
  });

  exportMdBtn.addEventListener('click', function () {
    var md = '# 待办清单 (' + todayString() + ')\n\n';
    
    // 进行中
    var actives = state.tasks.filter(function(t) { return !t.done; }).sort(function(a,b){return a.order - b.order;});
    if (actives.length > 0) {
      md += '## 进行中\n';
      actives.forEach(function(t) {
        md += '- [ ] ' + t.text;
        if (t.due) md += ' (到期: ' + t.due + ')';
        if (t.priority !== 'medium') md += ' [' + (t.priority === 'high' ? '高优先级' : '低优先级') + ']';
        md += '\n';
      });
      md += '\n';
    }
    
    // 已完成
    var dones = state.tasks.filter(function(t) { return t.done; }).sort(function(a,b){return b.createdAt - a.createdAt;});
    if (dones.length > 0) {
      md += '## 已完成\n';
      dones.forEach(function(t) {
        md += '- [x] ' + t.text + '\n';
      });
    }
    
    downloadBlob(md, 'todo_' + todayString() + '.md', 'text/markdown;charset=utf-8');
    showToast('Markdown 文件已下载');
  });

  importBtn.addEventListener('click', function () { importFile.click(); });

  importFile.addEventListener('change', function () {
    var file = importFile.files && importFile.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.tasks)) return showToast('文件格式不正确', true);
        
        var tasks = data.tasks.map(normalizeTask);
        if (Array.isArray(data.categories)) {
          data.categories.forEach(function (c) {
            if (typeof c === 'string' && c && state.categories.indexOf(c) === -1) {
              state.categories.push(c);
            }
          });
        }
        
        var importedCount = 0;
        tasks.forEach(function (t) {
          var exists = state.tasks.some(function (x) { return x.id === t.id; });
          if (exists) t.id = genId();
          t.order = state.tasks.length;
          state.tasks.push(t);
          importedCount++;
        });
        save(); render();
        showToast('成功导入 ' + importedCount + ' 个任务');
      } catch (err) {
        showToast('读取失败：文件格式错误', true);
      } finally {
        importFile.value = '';
      }
    };
    reader.readAsText(file);
  });

  // ================= 全局快捷键 =================
  document.addEventListener('keydown', function(e) {
    // Ctrl+K 或 / 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchEl.focus();
    }
    if (e.key === '/' && document.activeElement !== newTaskInput && document.activeElement !== searchEl) {
      e.preventDefault();
      searchEl.focus();
    }
    // Esc 清空搜索
    if (e.key === 'Escape' && document.activeElement === searchEl) {
      searchEl.value = '';
      state.keyword = '';
      render();
      searchEl.blur();
    }
  });

  // ================= 初始化 =================
  load();
  state.tasks.sort(function (a, b) { return a.order - b.order; });
  state.tasks.forEach(function (t, i) { t.order = i; });
  render();
  newTaskInput.focus();
})();