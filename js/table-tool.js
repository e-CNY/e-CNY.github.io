(function () {
  var fileInput = document.getElementById('tt-input');
  var dropZone = document.getElementById('tt-drop-zone');
  var btnCsv = document.getElementById('btn-export-csv');
  var btnJson = document.getElementById('btn-export-json');
  var btnXlsx = document.getElementById('btn-export-xlsx');
  var btnAddRow = document.getElementById('btn-add-row');
  var btnAddCol = document.getElementById('btn-add-col');
  var btnClear = document.getElementById('btn-clear');
  var statusText = document.getElementById('tt-status');
  var table = document.getElementById('tt-preview-table');

  var currentData = []; // 存储原始数据的二维数组

  // ================= 1. 文件读取与解析 =================
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
    if (file.size > 20 * 1024 * 1024) return alert('文件太大，请小于 20MB');
    statusText.textContent = '正在解析文件...';
    var reader = new FileReader();

    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        currentData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        
        if (currentData.length === 0) currentData = [['']]; // 至少一列
        renderTable();
        
        statusText.textContent = '✅ 解析成功：' + file.name + ' (可双击单元格编辑)';
        enableButtons(true);
      } catch (err) {
        statusText.textContent = '❌ 解析失败';
        alert('文件解析失败，请确保格式正确。');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ================= 2. 渲染表格与在线编辑 =================
  function renderTable() {
    table.innerHTML = '';
    if (currentData.length === 0) return;
    
    // 表头
    var thead = document.createElement('thead');
    var trHead = document.createElement('tr');
    currentData[0].forEach(function (cell) {
      var th = document.createElement('th');
      th.textContent = cell;
      th.setAttribute('contenteditable', 'true'); // 开启编辑
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // 内容体
    var tbody = document.createElement('tbody');
    for (var i = 1; i < currentData.length; i++) {
      var tr = document.createElement('tr');
      for (var j = 0; j < currentData[0].length; j++) {
        var td = document.createElement('td');
        td.textContent = currentData[i][j] || '';
        td.setAttribute('contenteditable', 'true'); // 开启编辑
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  // 从 DOM 反向同步最新数据（防止用户修改了没保存）
  function syncDataFromDOM() {
    if (!table.querySelector('thead')) return;
    
    var newData = [];
    // 读表头
    var headerCells = table.querySelectorAll('thead th');
    var headers = [];
    headerCells.forEach(function(th) { headers.push(th.textContent.trim()); });
    newData.push(headers);

    // 读内容
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(tr) {
      var rowData = [];
      var cells = tr.querySelectorAll('td');
      cells.forEach(function(td) { rowData.push(td.textContent.trim()); });
      newData.push(rowData);
    });

    currentData = newData;
  }

  // ================= 3. 行列操作与清空 =================
  btnAddRow.addEventListener('click', function () {
    syncDataFromDOM();
    if (currentData.length === 0) return;
    
    var cols = currentData[0].length;
    var newRow = new Array(cols).fill('');
    currentData.push(newRow);
    renderTable();
  });

  btnAddCol.addEventListener('click', function () {
    syncDataFromDOM();
    if (currentData.length === 0) {
      currentData = [['新列']];
    } else {
      currentData.forEach(function(row) { row.push(''); });
    }
    renderTable();
  });

  btnClear.addEventListener('click', function () {
    if (confirm('确定要清空所有数据吗？')) {
      currentData = [];
      table.innerHTML = '';
      statusText.textContent = '表格已清空，点击左侧“添加行/列”开始创建';
      enableButtons(false);
      btnAddRow.disabled = false;
      btnAddCol.disabled = false;
    }
  });

  // ================= 4. 导出逻辑 =================
  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  btnCsv.addEventListener('click', function () {
    syncDataFromDOM();
    if (!currentData.length) return;
    
    var csvContent = currentData.map(function(row) {
      return row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    
    downloadBlob('\uFEFF' + csvContent, 'export_' + Date.now() + '.csv', 'text/csv;charset=utf-8');
  });

  btnJson.addEventListener('click', function () {
    syncDataFromDOM();
    if (!currentData.length) return;
    
    var headers = currentData[0];
    var jsonArr = [];
    for (var i = 1; i < currentData.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j] || ('列' + j)] = currentData[i][j];
      }
      jsonArr.push(obj);
    }
    downloadBlob(JSON.stringify(jsonArr, null, 2), 'export_' + Date.now() + '.json', 'application/json');
  });

  btnXlsx.addEventListener('click', function () {
    syncDataFromDOM();
    if (!currentData.length) return;
    
    var ws = XLSX.utils.aoa_to_sheet(currentData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'export_' + Date.now() + '.xlsx');
  });

  // 辅助
  function enableButtons(enable) {
    btnCsv.disabled = !enable;
    btnJson.disabled = !enable;
    btnXlsx.disabled = !enable;
    btnAddRow.disabled = !enable;
    btnAddCol.disabled = !enable;
    btnClear.disabled = !enable;
  }

  // 给“清空”后的空状态留个后门
  btnAddRow.disabled = true;
  btnAddCol.disabled = true;
  btnClear.addEventListener('click', function () {
    // 允许在不上传文件的情况下手动创建表格
    btnAddRow.disabled = false;
    btnAddCol.disabled = false;
  });

})();