(function () {
  var fileInput = document.getElementById('tt-input');
  var dropZone = document.getElementById('tt-drop-zone');
  var btnCsv = document.getElementById('btn-export-csv');
  var btnJson = document.getElementById('btn-export-json');
  var btnXlsx = document.getElementById('btn-export-xlsx');
  var statusText = document.getElementById('tt-status');
  var table = document.getElementById('tt-preview-table');

  var currentData = []; // 存储 JSON 格式的二维数组

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
        
        // 转换为二维数组
        currentData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        renderTable(currentData);
        
        statusText.textContent = '✅ 解析成功：' + file.name;
        btnCsv.disabled = false;
        btnJson.disabled = false;
        btnXlsx.disabled = false;
      } catch (err) {
        statusText.textContent = '❌ 解析失败';
        alert('文件解析失败，请确保格式正确。');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function renderTable(data) {
    table.innerHTML = '';
    if (data.length === 0) return;
    
    var thead = document.createElement('thead');
    var trHead = document.createElement('tr');
    data[0].forEach(function (cell) {
      var th = document.createElement('th');
      th.textContent = cell;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var i = 1; i < data.length; i++) {
      var tr = document.createElement('tr');
      data[i].forEach(function (cell) {
        var td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // 导出逻辑
  btnCsv.addEventListener('click', function () {
    if (!currentData.length) return;
    var csvContent = currentData.map(function(row) {
      return row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    downloadBlob('\uFEFF' + csvContent, 'export.csv', 'text/csv;charset=utf-8');
  });

  btnJson.addEventListener('click', function () {
    if (!currentData.length) return;
    var headers = currentData[0];
    var jsonArr = [];
    for (var i = 1; i < currentData.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) obj[headers[j] || ('列' + j)] = currentData[i][j];
      jsonArr.push(obj);
    }
    downloadBlob(JSON.stringify(jsonArr, null, 2), 'export.json', 'application/json');
  });

  btnXlsx.addEventListener('click', function () {
    if (!currentData.length) return;
    var ws = XLSX.utils.aoa_to_sheet(currentData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'export.xlsx');
  });

})();