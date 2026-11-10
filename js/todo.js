/* js/todo.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.todo.v1';
  var DEFAULT_CATEGORIES = ['默认', '工作', '生活', '学习', '购物'];

  /* ---------- DOM ---------- */
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
  var exportBtn      = document.getElementById('exportBtn');
  var clearDoneBtn   = document.getElementById('clearDoneBtn');
  var clearAllBtn    = document.getElementById('clearAllBtn');
  var importFile     = document.getElementById('importFile');

  /* ---------- 状态 ---------- */
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

  /* ---------- 持久化 ---------- */
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
    } catch (e) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks: state.tasks,
        categories: state.categories
      }));
    } catch (e) { /* ignore */ }
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

  /* ---------- 工具 ---------- */
  function todayString() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /* ---------- 渲染 ---------- */
  function renderCategoryFilters() {
    catFiltersEl.innerHTML = '';

    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.textContent = '全部分类';
    allBtn.dataset.cat = 'all';
    if (state.category === 'all') allBtn.classList.add('active');
    allBtn.addEventListener('click', function () {
      state.category = 'all';
      render();
    });
    catFiltersEl.appendChild(allBtn);

    state.categories.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      b.dataset.cat = c;
      if (state.category === c) b.classList.add('active');
      b.addEventListener('click', function () {
        state.category = c;
        render();
      });
      catFiltersEl.appendChild(b);
    });

    var addCat = document.createElement('button');
    addCat.type = 'button';
    addCat.className = 'cat-add';
    addCat.textContent = '＋';
    addCat.title = '新建分类';
    addCat.addEventListener('click', function () {
      var name = prompt('输入新分类名称：');
      if (!name) return;
      name = name.trim();
      if (!name) return;
      if (state.categories.indexOf(name) !== -1) {
        alert('分类「' + name + '」已存在');
        return;
      }
      state.categories.push(name);
      save();
      render();
    });
    catFiltersEl.appendChild(addCat);
  }

  function render() {
    /* 状态筛选按钮 */
    Array.prototype.forEach.call(statusFiltersEl.children, function (btn) {
      btn.classList.toggle('active', btn.dataset.status === state.status);
    });

    /* 分类筛选 */
    renderCategoryFilters();

    /* 过滤 */
    var list = state.tasks.filter(function (t) {
      if (state.status === 'active' && t.done) return false;
      if (state.status === 'done' && !t.done) return false;
      if (state.category !== 'all' && t.category !== state.category) return false;
      if (state.keyword && t.text.toLowerCase().indexOf(state.keyword) === -1) return false;
      return true;
    });

    /* 排序 */
    var mode = state.sortBy;
    if (mode === 'order') {
      list.sort(function (a, b) { return a.order - b.order; });
    } else if (mode === 'created') {
      list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    } else if (mode === 'priority') {
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

    /* DOM */
    taskListEl.innerHTML = '';
    if (!list.length) {
      emptyTip.hidden = false;
      emptyTip.textContent = state.tasks.length === 0
        ? '还没有任务，在上方输入框添加第一个吧 🎯'
        : '当前筛选条件下没有任务';
    } else {
      emptyTip.hidden = true;
    }

    var todayStr = todayString();
    var canDrag = (mode === 'order');
    list.forEach(function (t) {
      taskListEl.appendChild(renderTask(t, todayStr, canDrag));
    });

    /* 统计 */
    var total = state.tasks.length;
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    var active = total - done;
    statsEl.innerHTML =
      '共 <strong>' + total + '</strong> 项 · 进行中 <strong>' + active +
      '</strong> · 已完成 <strong>' + done + '</strong>';
  }

  function renderTask(t, todayStr, draggable) {
    var li = document.createElement('li');
    li.className = 'task' + (t.done ? ' done' : '');
    li.dataset.id = t.id;
    if (draggable) {
      li.draggable = true;
      li.title = '按住拖动排序';
    }

    /* 复选框 */
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

    /* 主体 */
    var main = document.createElement('div');
    main.className = 'task-main';

    var textEl = document.createElement('span');
    textEl.className = 'task-text';
    textEl.textContent = t.text;
    textEl.title = '双击编辑';
    textEl.addEventListener('dblclick', function () {
      startEdit(t, textEl);
    });
    main.appendChild(textEl);

    /* 元信息 */
    var meta = document.createElement('div');
    meta.className = 'task-meta';

    /* 优先级 */
    var prio = document.createElement('button');
    prio.type = 'button';
    prio.className = 'tag priority-' + t.priority;
    prio.textContent = t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低';
    prio.title = '点击切换优先级（高 → 中 → 低）';
    prio.addEventListener('click', function () {
      t.priority = t.priority === 'high' ? 'medium'
                 : t.priority === 'medium' ? 'low' : 'high';
      save();
      render();
    });
    meta.appendChild(prio);

    /* 分类 */
    var sel = document.createElement('select');
    sel.className = 'task-category';
    sel.title = '点击切换分类';
    var cats = state.categories.slice();
    if (cats.indexOf(t.category) === -1) cats.push(t.category);
    cats.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === t.category) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      t.category = sel.value;
      save();
      render();
    });
    meta.appendChild(sel);

    /* 到期日 */
    var due = document.createElement('input');
    due.type = 'date';
    due.className = 'task-due';
    due.value = t.due || '';
    due.title = '设置到期日';
    if (t.due && t.due < todayStr && !t.done) due.classList.add('overdue');
    due.addEventListener('change', function () {
      t.due = due.value;
      save();
      render();
    });
    meta.appendChild(due);

    main.appendChild(meta);
    li.appendChild(main);

    /* 删除 */
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'task-del';
    del.innerHTML = '×';
    del.title = '删除';
    del.addEventListener('click', function () {
      if (!confirm('删除任务：\n' + t.text + '\n\n确定？')) return;
      state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
      save();
      render();
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
    function cancel() {
      if (committed) return;
      committed = true;
      render();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
  }

  /* ---------- 拖拽排序 ---------- */
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
    var els = Array.prototype.slice.call(
      container.querySelectorAll('.task:not(.dragging)')
    );
    return els.reduce(function (closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      }
      return closest;
    }, { offset: -Infinity, element: null }).element;
  }

  function saveOrderFromDOM() {
    var domIds = Array.prototype.slice.call(
      taskListEl.querySelectorAll('.task')
    ).map(function (li) { return li.dataset.id; });

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

  /* ---------- 添加 ---------- */
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
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
  });

  /* ---------- 筛选事件 ---------- */
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

  /* ---------- 底部操作 ---------- */
  clearDoneBtn.addEventListener('click', function () {
    var doneCount = state.tasks.filter(function (t) { return t.done; }).length;
    if (doneCount === 0) return;
    if (!confirm('确定清除 ' + doneCount + ' 个已完成任务？')) return;
    state.tasks = state.tasks.filter(function (t) { return !t.done; });
    save();
    render();
  });

  clearAllBtn.addEventListener('click', function () {
    if (state.tasks.length === 0) return;
    if (!confirm('确定清除全部 ' + state.tasks.length + ' 个任务？此操作不可恢复。')) return;
    state.tasks = [];
    save();
    render();
  });

  exportBtn.addEventListener('click', function () {
    var data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: state.tasks,
      categories: state.categories
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'todo-' + todayString() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  importBtn.addEventListener('click', function () {
    importFile.click();
  });

  importFile.addEventListener('change', function () {
    var file = importFile.files && importFile.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.tasks)) {
          alert('文件格式不正确');
          return;
        }
        var tasks = data.tasks.map(normalizeTask);
        if (Array.isArray(data.categories)) {
          data.categories.forEach(function (c) {
            if (typeof c === 'string' && c && state.categories.indexOf(c) === -1) {
              state.categories.push(c);
            }
          });
        }
        if (!confirm('导入 ' + tasks.length + ' 个任务？会与现有任务合并。')) return;

        tasks.forEach(function (t) {
          var exists = state.tasks.some(function (x) { return x.id === t.id; });
          if (exists) t.id = genId();
          t.order = state.tasks.length;
          state.tasks.push(t);
        });
        save();
        render();
      } catch (err) {
        alert('读取失败：' + (err && err.message ? err.message : err));
      } finally {
        importFile.value = '';
      }
    };
    reader.onerror = function () {
      alert('读取文件失败');
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  /* ---------- 初始化 ---------- */
  load();
  state.tasks.sort(function (a, b) { return a.order - b.order; });
  state.tasks.forEach(function (t, i) { t.order = i; });

  render();
  newTaskInput.focus();
})();