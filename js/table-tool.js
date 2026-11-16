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

  // ================= DOM 元素 =================
  var fileInput = document.getElementById('tt-input');
  var dropZone = document.getElementById('tt-drop-zone');
  var table = document.getElementById('tt-preview-table');
  var emptyState = document.getElementById('tt-empty-state');
  var statusText = document.getElementById('tt-status');
  var contextMenu = document.getElementById('tt-context-menu');

  var btnUndo = document.getElementById('btn-undo');
  var btnRedo = document.getElementById('btn-redo');
  var btnNew = document.getElementById('btn-new-table');
  
  var btnCsv = document.getElementById('btn-export-csv');
  var btnJson = document.getElementById('btn-export-json');
  var btnXlsx = document.getElementById('btn-export-xlsx');
  var btnMd = document.getElementById('btn-export-md');

  var statRows = document.getElementById('stat-rows');
  var statCols = document.getElementById('stat-cols');
  var statCells = document.getElementById('stat-cells');

  // ================= 状态管理 =================
  var gridData = [];         // 二维数组数据源
  var currentCell = null;    // { r, c } 当前选中的单元格
  var historyStack = [];     // 撤销栈
  var historyIndex = -1;
  var MAX_HISTORY = 50;

  // ================= 初始化与历史记录 =================
  function saveHistory() {
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    // 深拷贝当前状态入栈
    historyStack.push(JSON.stringify(gridData));
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    } else {
      historyIndex++;
    }
    updateUndoRedoBtn();
  }

  function updateUndoRedoBtn() {
    btnUndo.disabled = historyIndex <= 0;
    btnRedo.disabled = historyIndex >= historyStack.length - 1;
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      gridData = JSON.parse(historyStack[historyIndex]);
      renderTable();
      updateUndoRedoBtn();
    }
  }

  function redo() {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      gridData = JSON.parse(historyStack[historyIndex]);
      renderTable();
      updateUndoRedoBtn();
    }
  }

  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);

  // ================= 渲染逻辑 =================
  function renderTable() {
    table.innerHTML = '';
    
    if (gridData.length === 0 || gridData[0].length === 0) {
      emptyState.style.display = 'flex';
      table.style.display = 'none';
      updateStats();
      toggleExportBtns(false);
      return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';

    var tbody = document.createElement('tbody');

    gridData.forEach(function (rowData, r) {
      var tr = document.createElement('tr');
      
      rowData.forEach(function (cellData, c) {
        var cell = (r === 0) ? document.createElement('th') : document.createElement('td');
        cell.textContent = cellData;
        cell.setAttribute('contenteditable', 'true');
        cell.dataset.r = r;
        cell.dataset.c = c;

        // 监听编辑完成（失焦时保存到 gridData）
        cell.addEventListener('blur', function() {
          gridData[r][c] = this.textContent;
        });
        
        // 监听键盘快捷键 (Tab / Enter)
        cell.addEventListener('keydown', handleCellKeydown);

        // 右键菜单
        cell.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          currentCell = { r: r, c: c };
          showContextMenu(e.clientX, e.clientY);
        });

        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    updateStats();
    toggleExportBtns(true);
  }

  function updateStats() {
    var rows = gridData.length;
    var cols = rows > 0 ? gridData[0].length : 0;
    statRows.textContent = rows;
    statCols.textContent = cols;
    statCells.textContent = rows * cols;
  }

  function toggleExportBtns(enable) {
    btnCsv.disabled = !enable;
    btnJson.disabled = !enable;
    btnXlsx.disabled = !enable;
    btnMd.disabled = !enable;
  }

  // ================= 键盘导航与编辑同步 =================
  function handleCellKeydown(e) {
    var r = parseInt(this.dataset.r, 10);
    var c = parseInt(this.dataset.c, 10);
    
    if (e.key === 'Tab') {
      e.preventDefault();
      this.blur(); // 触发保存
      // 移动到右侧，如果到底了就换行
      var nextCell;
      if (c + 1 < gridData[0].length) {
        nextCell = table.querySelector('tr:nth-child(' + (r + 1) + ') > *:nth-child(' + (c + 2) + ')');
      } else if (r + 1 < gridData.length) {
        nextCell = table.querySelector('tr:nth-child(' + (r + 2) + ') > *:nth-child(1)');
      }
      if (nextCell) nextCell.focus();
    } 
    else if (e.key === 'Enter') {
      e.preventDefault();
      this.blur();
      // 移动到下方
      var nextCell = table.querySelector('tr:nth-child(' + (r + 2) + ') > *:nth-child(' + (c + 1) + ')');
      if (nextCell) nextCell.focus();
    }
    // Ctrl + Z 撤销
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }

  // ================= 解析导入 =================
  dropZone.addEventListener('click', function () { fileInput.click(); });
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); });
  });
  dropZone.addEventListener('dragover', function () { dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  function handleFile(file) {
    if (file.size > 20 * 1024 * 1024) return showToast('文件太大，请小于 20MB', true);
    statusText.textContent = '正在解析文件...';
    var reader = new FileReader();

    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        gridData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        
        if (gridData.length === 0) gridData = [['']];
        
        // 补齐所有行，确保长度一致
        var maxCols = 0;
        gridData.forEach(function(row) { if (row.length > maxCols) maxCols = row.length; });
        gridData.forEach(function(row) {
          while (row.length < maxCols) row.push('');
        });

        saveHistory();
        renderTable();
        statusText.textContent = '✅ 已加载: ' + file.name;
        showToast('文件解析成功');
      } catch (err) {
        statusText.textContent = '❌ 解析失败';
        showToast('文件解析失败，请确保格式正确', true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // 新建空表格
  btnNew.addEventListener('click', function() {
    gridData = [
      ['标题1', '标题2', '标题3'],
      ['', '', ''],
      ['', '', '']
    ];
    saveHistory();
    renderTable();
    statusText.textContent = '已新建空表格';
  });

  // ================= 粘贴 Excel 数据 =================
  document.addEventListener('paste', function(e) {
    // 如果当前不在表格区域内，且没有被聚焦的输入框
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    var pasteText = (e.clipboardData || window.clipboardData).getData('text');
    if (!pasteText) return;
    
    // 判断是否像多行多列数据 (包含制表符或换行)
    if (pasteText.indexOf('\t') !== -1 || pasteText.indexOf('\n') !== -1) {
      e.preventDefault();
      
      // 解析 TSV (Tab-Separated Values)
      var rows = pasteText.split(/\r?\n/);
      if (rows[rows.length - 1] === '') rows.pop(); // 去掉末尾空行
      
      var parsedData = rows.map(function(row) {
        return row.split('\t');
      });

      // 如果当前表格为空，直接覆盖；否则追加到末尾
      if (gridData.length === 0) {
        gridData = parsedData;
      } else {
        parsedData.forEach(function(newRow) {
          // 补齐列数
          while (newRow.length < gridData[0].length) newRow.push('');
          gridData.push(newRow);
        });
      }
      
      saveHistory();
      renderTable();
      showToast('已粘贴 ' + parsedData.length + ' 行数据');
    }
  });

  // ================= 右键菜单与行列操作 =================
  function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    // 防止菜单超出屏幕
    var menuW = contextMenu.offsetWidth;
    var menuH = contextMenu.offsetHeight;
    if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
    if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  window.addEventListener('click', hideContextMenu);
  window.addEventListener('scroll', hideContextMenu);

  contextMenu.addEventListener('click', function(e) {
    var item = e.target.closest('.ctx-item');
    if (!item || !currentCell) return;
    
    var action = item.dataset.action;
    var r = currentCell.r;
    var c = currentCell.c;
    var cols = gridData[0].length;

    if (action === 'insert-row-above') {
      gridData.splice(r, 0, new Array(cols).fill(''));
    } 
    else if (action === 'insert-row-below') {
      gridData.splice(r + 1, 0, new Array(cols).fill(''));
    }
    else if (action === 'delete-row') {
      if (gridData.length <= 1) return showToast('无法删除所有行', true);
      gridData.splice(r, 1);
    }
    else if (action === 'insert-col-left') {
      gridData.forEach(function(row) { row.splice(c, 0, ''); });
    }
    else if (action === 'insert-col-right') {
      gridData.forEach(function(row) { row.splice(c + 1, 0, ''); });
    }
    else if (action === 'delete-col') {
      if (cols <= 1) return showToast('无法删除所有列', true);
      gridData.forEach(function(row) { row.splice(c, 1); });
    }
    
    saveHistory();
    renderTable();
    hideContextMenu();
  });

  // ================= 导出逻辑 =================
  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); 
    a.href = url; a.download = filename; 
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  function syncDataFromDOM() {
    // 确保数据是最新的，由于我们绑定了 blur 事件，这里主要是保险起见
    var cells = table.querySelectorAll('th, td');
    cells.forEach(function(cell) {
      var r = parseInt(cell.dataset.r, 10);
      var c = parseInt(cell.dataset.c, 10);
      if (gridData[r] && gridData[r][c] !== undefined) {
        gridData[r][c] = cell.textContent;
      }
    });
  }

  btnCsv.addEventListener('click', function () {
    if (!gridData.length) return;
    var csvContent = gridData.map(function(row) {
      return row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    downloadBlob('\uFEFF' + csvContent, 'table_' + Date.now() + '.csv', 'text/csv;charset=utf-8');
  });

  btnJson.addEventListener('click', function () {
    if (!gridData.length) return;
    var headers = gridData[0];
    var jsonArr = [];
    for (var i = 1; i < gridData.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j] || ('列' + j)] = gridData[i][j] || '';
      }
      jsonArr.push(obj);
    }
    downloadBlob(JSON.stringify(jsonArr, null, 2), 'table_' + Date.now() + '.json', 'application/json');
  });

  btnXlsx.addEventListener('click', function () {
    if (!gridData.length) return;
    var ws = XLSX.utils.aoa_to_sheet(gridData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'table_' + Date.now() + '.xlsx');
  });

  btnMd.addEventListener('click', function() {
    if (!gridData.length) return;
    var headers = gridData[0];
    var md = '| ' + headers.join(' | ') + ' |\n';
    md += '| ' + headers.map(function() { return '---'; }).join(' | ') + ' |\n';
    for (var i = 1; i < gridData.length; i++) {
      md += '| ' + gridData[i].join(' | ') + ' |\n';
    }
    downloadBlob(md, 'table_' + Date.now() + '.md', 'text/markdown;charset=utf-8');
  });

  // ================= 初始化 =================
  updateStats();
  updateUndoRedoBtn();
})();