/* js/gpa.js */
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

  function confirmAction(title, msg, onOk) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    var modal = document.getElementById('confirmModal');
    modal.hidden = false;

    var btnOk = document.getElementById('confirmOk');
    var btnCancel = document.getElementById('confirmCancel');

    function cleanup() {
      modal.hidden = true;
      btnOk.removeEventListener('click', okHandler);
      btnCancel.removeEventListener('click', cleanup);
    }

    function okHandler() {
      cleanup();
      if (onOk) onOk();
    }

    btnOk.addEventListener('click', okHandler);
    btnCancel.addEventListener('click', cleanup);
  }

  var STORAGE_KEY = 'tool.gpa.v2';

  /* ============ 等级映射 ============ */
  var GRADE_4 = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0 };
  var GRADE_43 = { 'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0 };
  var GRADE_TO_SCORE = { 'A+': 98, 'A': 94, 'A-': 90, 'B+': 87, 'B': 84, 'B-': 80, 'C+': 77, 'C': 74, 'C-': 70, 'D+': 67, 'D': 64, 'D-': 60, 'F': 50 };
  var LETTER_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

  /* ============ DOM ============ */
  var systemSeg     = document.getElementById('systemSeg');
  var tableBtn      = document.getElementById('tableBtn');
  var loadSampleBtn = document.getElementById('loadSampleBtn');
  var statGPA       = document.getElementById('statGPA');
  var statGPASub    = document.getElementById('statGPASub');
  var gpaLabel      = document.getElementById('gpaLabel');
  var statCredits   = document.getElementById('statCredits');
  var statCount     = document.getElementById('statCount');
  var statAvg       = document.getElementById('statAvg');
  var statMax       = document.getElementById('statMax');
  var statMin       = document.getElementById('statMin');
  var courseBody    = document.getElementById('courseBody');
  var emptyTip      = document.getElementById('emptyTip');
  var listCount     = document.getElementById('listCount');
  var addRowBtn     = document.getElementById('addRowBtn');
  var clearBtn      = document.getElementById('clearBtn');
  var targetGPAEl   = document.getElementById('targetGPA');
  var addCreditsEl  = document.getElementById('addCredits');
  var calcTargetBtn = document.getElementById('calcTargetBtn');
  var targetResult  = document.getElementById('targetResult');
  var exportCSVBtn  = document.getElementById('exportCSVBtn');
  var importCSVBtn  = document.getElementById('importCSVBtn');
  var importFile    = document.getElementById('importFile');
  var tableModal    = document.getElementById('tableModal');
  var tableModalClose = document.getElementById('tableModalClose');
  var tableModalTitle = document.getElementById('tableModalTitle');
  var tableRef      = document.getElementById('tableRef');

  /* ============ 状态 ============ */
  var state = {
    system: '4.0',
    courses: []
  };
  var idCounter = 1;

  /* ============ 工具 ============ */
  function genId() { return 'c' + Date.now().toString(36) + '_' + (idCounter++).toString(36); }
  function formatNumber(n, digits) { return isFinite(n) ? Number(n).toFixed(digits == null ? 2 : digits) : '0'; }

  /* ============ 换算逻辑 ============ */
  function gradeToPoint(grade) {
    if (state.system === '4.0') return GRADE_4[grade] || 0;
    if (state.system === '4.3') return GRADE_43[grade] || 0;
    if (state.system === '5.0') {
      var s = parseFloat(grade);
      return (isNaN(s) || s < 60) ? 0 : Math.min(5, Math.max(0, (s - 50) / 10));
    }
    if (state.system === '100') {
      var v = parseFloat(grade);
      return isNaN(v) ? 0 : v;
    }
    return 0;
  }

  function gradeToPercentScore(grade) {
    if (state.system === '4.0' || state.system === '4.3') return GRADE_TO_SCORE[grade] || 0;
    var v = parseFloat(grade);
    return isNaN(v) ? 0 : v;
  }

  function isLetterSystem() { return state.system === '4.0' || state.system === '4.3'; }

  /* ============ 核心计算 ============ */
  function computeStats() {
    var calcCredits = 0;
    var calcPoints = 0;
    var calcScore = 0;
    var maxScore = 0;
    var minScore = 1000;
    var validCount = 0;

    // 所有课程的学分总计（包含不计入 GPA 的）
    var totalCreditsAll = 0;
    // 计入 GPA 的课程
    var calcCount = 0;

    state.courses.forEach(function (c) {
      var credit = parseFloat(c.credits);
      if (isNaN(credit) || credit <= 0) return;
      
      totalCreditsAll += credit;

      if (c.isCalc === false) return; // 跳过不计入的

      var point = gradeToPoint(c.grade);
      var score = gradeToPercentScore(c.grade);

      calcCredits += credit;
      calcPoints += point * credit;
      calcScore += score * credit;
      validCount++;
      calcCount++;

      if (score > maxScore) maxScore = score;
      if (score < minScore) minScore = score;
    });

    var gpa = calcCredits > 0 ? calcPoints / calcCredits : 0;
    var avg = calcCredits > 0 ? calcScore / calcCredits : 0;

    return {
      gpa: gpa,
      credits: calcCredits,
      count: calcCount,
      avg: avg,
      max: validCount > 0 ? maxScore : 0,
      min: validCount > 0 ? minScore : 0,
      totalCreditsAll: totalCreditsAll
    };
  }

  /* ============ 渲染表格行 ============ */
  function renderRow(course, index) {
    var tr = document.createElement('tr');
    tr.dataset.id = course.id;

    var point = gradeToPoint(course.grade);

    var gradeInput;
    if (isLetterSystem()) {
      var sel = document.createElement('select');
      sel.dataset.field = 'grade';
      LETTER_OPTIONS.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (opt === course.grade) o.selected = true;
        sel.appendChild(o);
      });
      gradeInput = sel;
    } else {
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.dataset.field = 'grade';
      inp.min = 0; inp.max = 100; inp.step = 0.5;
      inp.placeholder = '0-100';
      inp.value = course.grade == null ? '' : course.grade;
      gradeInput = inp;
    }

    var isCalcChecked = course.isCalc !== false ? 'checked' : '';

    tr.innerHTML =
      '<td class="col-num">' + (index + 1) + '</td>' +
      '<td class="col-name"><input type="text" data-field="name" placeholder="例如 高等数学" maxlength="30"></td>' +
      '<td class="col-credit"><input type="number" data-field="credits" min="0" max="30" step="0.5" placeholder="学分"></td>' +
      '<td class="col-grade"></td>' +
      '<td class="col-point">' + formatNumber(point, 2) + '</td>' +
      '<td class="col-calc"><input type="checkbox" data-field="isCalc" ' + isCalcChecked + '></td>' +
      '<td class="col-act"><button class="del-btn" data-act="del" type="button" title="删除">×</button></td>';

    tr.querySelector('[data-field="name"]').value = course.name || '';
    tr.querySelector('[data-field="credits"]').value = course.credits != null ? course.credits : '';
    tr.querySelector('.col-grade').appendChild(gradeInput);

    return tr;
  }

  /* ============ 渲染主界面 ============ */
  function render() {
    Array.prototype.forEach.call(systemSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.system);
    });

    var labels = {
      '4.0': 'GPA（4.0 制）',
      '4.3': 'GPA（4.3 制）',
      '5.0': 'GPA（5.0 制）',
      '100': '加权平均分'
    };
    gpaLabel.textContent = labels[state.system];
    statGPASub.textContent = state.system === '100' ? '百分制' : (state.system + ' 制');

    courseBody.innerHTML = '';
    if (state.courses.length === 0) {
      emptyTip.hidden = false;
    } else {
      emptyTip.hidden = true;
      state.courses.forEach(function (c, i) {
        courseBody.appendChild(renderRow(c, i));
      });
    }

    listCount.textContent = state.courses.length;
    updateStatsOnly();

    if (!targetResult.hidden) calcTarget();
    save();
  }

  function updateStatsOnly() {
    var s = computeStats();
    statGPA.textContent = formatNumber(s.gpa, 2);
    statCredits.textContent = formatNumber(s.credits, s.credits % 1 === 0 ? 0 : 1);
    statCount.textContent = s.count;
    statAvg.textContent = formatNumber(s.avg, 2);
    statMax.textContent = s.count > 0 ? formatNumber(s.max, 1) : '—';
    statMin.textContent = s.count > 0 ? formatNumber(s.min, 1) : '—';
    if (!targetResult.hidden) calcTarget();
  }

  /* ============ 持久化 ============ */
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && data.system) state.system = data.system;
      if (data && Array.isArray(data.courses)) {
        state.courses = data.courses.map(function (c) {
          return {
            id: String(c.id || genId()),
            name: String(c.name || ''),
            credits: c.credits,
            grade: c.grade,
            isCalc: c.isCalc !== false
          };
        });
      }
    } catch (e) {}
  }

  /* ============ 交互逻辑 ============ */
  function defaultGrade() { return isLetterSystem() ? 'A' : 85; }

  function addCourse(name, credit, grade) {
    state.courses.push({
      id: genId(),
      name: name || '',
      credits: credit != null ? credit : '',
      grade: grade != null ? grade : defaultGrade(),
      isCalc: true
    });
    render();
    var last = courseBody.querySelector('tr:last-child [data-field="name"]');
    if (last) last.focus();
  }

  function deleteCourse(id) {
    state.courses = state.courses.filter(function (c) { return c.id !== id; });
    render();
  }

  /* 表格数据变化监听 */
  courseBody.addEventListener('input', function (e) {
    var tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    var course = state.courses.find(function (c) { return c.id === tr.dataset.id; });
    if (!course) return;
    var field = e.target.dataset.field;

    if (field === 'name') course.name = e.target.value;
    else if (field === 'credits') course.credits = e.target.value === '' ? '' : parseFloat(e.target.value);
    else if (field === 'grade') course.grade = e.target.value;

    if (field === 'name' || field === 'credits' || field === 'grade') {
      var pointEl = tr.querySelector('.col-point');
      if (pointEl) pointEl.textContent = formatNumber(gradeToPoint(course.grade), 2);
      updateStatsOnly();
      save();
    }
  });

  courseBody.addEventListener('change', function (e) {
    var tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    var course = state.courses.find(function (c) { return c.id === tr.dataset.id; });
    if (!course) return;

    if (e.target.dataset.field === 'isCalc') {
      course.isCalc = e.target.checked;
      updateStatsOnly();
      save();
    }
  });

  courseBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="del"]');
    if (btn) {
      deleteCourse(btn.closest('tr[data-id]').dataset.id);
    }
  });

  /* 新增、清空、示例 */
  addRowBtn.addEventListener('click', function () { addCourse('', '', null); });

  clearBtn.addEventListener('click', function () {
    if (state.courses.length === 0) return showToast('列表已经是空的', true);
    confirmAction('清空确认', '确定要清空所有课程数据吗？此操作不可撤销。', function() {
      state.courses = []; 
      targetResult.hidden = true;
      render();
      showToast('已清空全部数据');
    });
  });

  loadSampleBtn.addEventListener('click', function() {
    confirmAction('载入示例', '此操作会覆盖当前表格内容，确定继续吗？', function() {
      state.system = '4.0';
      state.courses = [
        { id: genId(), name: '高等数学', credits: 5, grade: 'A', isCalc: true },
        { id: genId(), name: '大学英语', credits: 3, grade: 'B+', isCalc: true },
        { id: genId(), name: '线性代数', credits: 3, grade: 'B', isCalc: true },
        { id: genId(), name: 'C 语言程序设计', credits: 4, grade: 'A-', isCalc: true },
        { id: genId(), name: '大学物理', credits: 4, grade: 'C+', isCalc: true },
        { id: genId(), name: '体育', credits: 1, grade: 'A+', isCalc: false },
        { id: genId(), name: '军事理论', credits: 2, grade: 'B', isCalc: false }
      ];
      targetResult.hidden = true;
      render();
      showToast('已载入示例数据');
    });
  });

  /* 快捷标签 */
  document.querySelectorAll('.quick-tag').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addCourse(btn.dataset.name, parseFloat(btn.dataset.credit), null);
    });
  });

  /* ============ 制度切换 ============ */
  systemSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    var newSystem = btn.dataset.value;
    if (newSystem === state.system) return;

    var wasLetter = isLetterSystem();
    var willBeLetter = (newSystem === '4.0' || newSystem === '4.3');

    state.courses.forEach(function (c) {
      if (wasLetter && !willBeLetter) {
        c.grade = GRADE_TO_SCORE[c.grade] || 85;
      } else if (!wasLetter && willBeLetter) {
        var s = parseFloat(c.grade) || 0;
        if (s >= 95) c.grade = 'A+'; else if (s >= 90) c.grade = 'A';
        else if (s >= 87) c.grade = 'A-'; else if (s >= 83) c.grade = 'B+';
        else if (s >= 80) c.grade = 'B'; else if (s >= 76) c.grade = 'B-';
        else if (s >= 73) c.grade = 'C+'; else if (s >= 70) c.grade = 'C';
        else if (s >= 66) c.grade = 'C-'; else if (s >= 63) c.grade = 'D+';
        else if (s >= 60) c.grade = 'D'; else c.grade = 'F';
      }
    });

    state.system = newSystem;
    targetResult.hidden = true;
    render();
    showToast('已切换至 ' + newSystem + ' 制');
  });

  /* ============ 目标反推 ============ */
  function calcTarget() {
    if (state.courses.length === 0) return showTargetResult('err', '请先录入至少一门课程');

    var target = parseFloat(targetGPAEl.value);
    var addCredits = parseFloat(addCreditsEl.value);

    if (isNaN(target) || target < 0) return showTargetResult('err', '请输入有效的目标 GPA');
    if (isNaN(addCredits) || addCredits <= 0) return showTargetResult('err', '请输入大于 0 的未来新增学分');

    var s = computeStats();
    var currentCredits = s.credits;
    var currentPoints = s.gpa * currentCredits;

    var needed = (target * (currentCredits + addCredits) - currentPoints) / addCredits;
    var maxGPA = parseFloat(state.system) || 4.0;

    if (needed > maxGPA) {
      return showTargetResult('err',
        '❌ 目标过高。未来 ' + addCredits + ' 个学分需要达到平均绩点 <strong>' + needed.toFixed(2) + '</strong>，' +
        '超过了制度上限（' + maxGPA.toFixed(1) + '）。建议降低目标，或先提高现有成绩。');
    }
    if (needed < 0) {
      return showTargetResult('ok',
        '🎉 恭喜！即使未来 ' + addCredits + ' 个学分全部挂科（绩点 0），你的 GPA 也能保持在 <strong>' + target.toFixed(2) + '</strong> 以上。' +
        '当前 GPA ' + s.gpa.toFixed(2) + '。');
    }

    var neededScore;
    if (state.system === '5.0') {
      neededScore = needed * 10 + 50;
    } else if (state.system === '100') {
      neededScore = needed;
    } else {
      var letter = pointToLetter(needed);
      return showTargetResult('ok',
        '🎯 需要在未来 <strong>' + addCredits + ' 个学分</strong> 的课程中平均拿到 <strong>' +
        needed.toFixed(2) + '</strong> 绩点（约 <strong>' + letter + '</strong> 等级），' +
        '就能把总体 GPA 从 ' + s.gpa.toFixed(2) + ' 提升到 <strong>' + target.toFixed(2) + '</strong>。');
    }

    if (neededScore > 100) {
      return showTargetResult('err',
        '❌ 目标过高。所需平均成绩 <strong>' + neededScore.toFixed(1) + '</strong> 分，超出 100 分上限。建议降低目标。');
    }

    showTargetResult('ok',
      '🎯 需要在未来 <strong>' + addCredits + ' 个学分</strong> 的课程中平均拿到 <strong>' +
      neededScore.toFixed(1) + '</strong> 分' + (neededScore < 60 ? '（及格线以下）' : '') + '，' +
      '就能把总体 GPA 从 ' + s.gpa.toFixed(2) + ' 提升到 <strong>' + target.toFixed(2) + '</strong>。');
  }

  function pointToLetter(point) {
    var table = [
      { p: 4.0, l: 'A+ / A' }, { p: 3.7, l: 'A-' }, { p: 3.3, l: 'B+' },
      { p: 3.0, l: 'B' }, { p: 2.7, l: 'B-' }, { p: 2.3, l: 'C+' },
      { p: 2.0, l: 'C' }, { p: 1.7, l: 'C-' }, { p: 1.3, l: 'D+' },
      { p: 1.0, l: 'D' }, { p: 0.7, l: 'D-' }, { p: 0.0, l: 'F' }
    ];
    var closest = table[0], minDiff = Infinity;
    table.forEach(function (t) {
      var diff = Math.abs(t.p - point);
      if (diff < minDiff) { minDiff = diff; closest = t; }
    });
    return closest.l;
  }

  function showTargetResult(type, html) {
    targetResult.hidden = false;
    targetResult.className = 'target-result ' + type;
    targetResult.innerHTML = html;
  }

  calcTargetBtn.addEventListener('click', calcTarget);
  [targetGPAEl, addCreditsEl].forEach(function(el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') calcTarget(); });
  });

  /* ============ CSV 导入导出 ============ */
  function csvEscape(s) {
    s = String(s);
    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  exportCSVBtn.addEventListener('click', function() {
    if (state.courses.length === 0) return showToast('没有数据可导出', true);
    var rows = [['课程名称', '学分', '成绩', '绩点', '是否计入GPA', '制度']];
    state.courses.forEach(function (c) {
      rows.push([csvEscape(c.name || ''), c.credits != null ? c.credits : '', c.grade != null ? c.grade : '', formatNumber(gradeToPoint(c.grade), 2), c.isCalc ? '是' : '否', state.system]);
    });
    var csv = rows.map(function (r) { return r.join(','); }).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'gpa_backup_' + Date.now() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
    showToast('CSV 文件已导出');
  });

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], current = [], cell = '', inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') { if (text[i+1] === '"') { cell += '"'; i++; } else inQuotes = false; }
        else cell += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { current.push(cell); cell = ''; }
        else if (ch === '\n') { current.push(cell); rows.push(current); current = []; cell = ''; }
        else if (ch === '\r') { /* skip */ }
        else cell += ch;
      }
    }
    if (cell !== '' || current.length > 0) { current.push(cell); rows.push(current); }
    return rows;
  }

  importCSVBtn.addEventListener('click', function() { importFile.click(); });

  importFile.addEventListener('change', function() {
    var f = importFile.files && importFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function() {
      try {
        var rows = parseCSV(String(reader.result || ''));
        if (rows.length < 2) return showToast('文件内容为空或格式不正确', true);

        var start = 1;
        var newCourses = [];
        for (var i = start; i < rows.length; i++) {
          var r = rows[i];
          if (!r || r.length < 3) continue;
          var name = (r[0] || '').trim();
          var credit = parseFloat(r[1]);
          var grade = (r[2] || '').trim();
          var isCalc = (r[4] !== '否'); // 默认计入，如果明确写了否，则为 false
          if (!name && isNaN(credit)) continue;

          var parsedGrade = (!isNaN(parseFloat(grade)) && /^-?\d+(\.\d+)?$/.test(grade)) ? parseFloat(grade) : grade;

          newCourses.push({
            id: genId(), name: name,
            credits: isNaN(credit) ? '' : credit,
            grade: parsedGrade,
            isCalc: isCalc
          });
        }

        if (newCourses.length === 0) return showToast('未找到有效课程行', true);

        if (state.courses.length > 0) {
          confirmAction('导入确认', '当前已有 ' + state.courses.length + ' 门课程。确定覆盖导入 ' + newCourses.length + ' 门课程吗？', function() {
            state.courses = newCourses;
            targetResult.hidden = true;
            render();
            showToast('成功导入 ' + newCourses.length + ' 门课程');
          });
        } else {
          state.courses = newCourses;
          targetResult.hidden = true;
          render();
          showToast('成功导入 ' + newCourses.length + ' 门课程');
        }
      } catch (err) {
        showToast('读取 CSV 失败', true);
      } finally {
        importFile.value = '';
      }
    };
    reader.onerror = function() { showToast('读取文件失败', true); importFile.value = ''; };
    reader.readAsText(f);
  });

  /* ============ 等级对照表 ============ */
  tableBtn.addEventListener('click', function() {
    var title, html = '';
    if (state.system === '4.0' || state.system === '4.3') {
      title = '📖 ' + state.system + ' 制 GPA 对照';
      var rows = [
        ['A+', '4.3' === state.system ? '4.3' : '4.0', '97-100'],
        ['A', '4.0', '93-96'], ['A-', '3.7', '90-92'],
        ['B+', '3.3', '87-89'], ['B', '3.0', '83-86'], ['B-', '2.7', '80-82'],
        ['C+', '2.3', '77-79'], ['C', '2.0', '73-76'], ['C-', '1.7', '70-72'],
        ['D+', '1.3', '67-69'], ['D', '1.0', '63-66'], ['D-', '0.7', '60-62'],
        ['F', '0', '0-59']
      ];
      html = '<table class="table-ref"><thead><tr><th>等级</th><th>绩点</th><th>分数区间</th></tr></thead><tbody>';
      rows.forEach(function (r) { html += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; });
      html += '</tbody></table>';
    } else if (state.system === '5.0') {
      title = '📖 5.0 制 GPA 对照（线性公式）';
      html = '<p style="margin:0 0 12px;font-size:.82rem;color:#6b5d47;text-align:center;">公式：GPA = (分数 - 50) ÷ 10，分数 <60 按 0 处理</p>';
      html += '<table class="table-ref"><thead><tr><th>分数</th><th>GPA</th><th>评价</th></tr></thead><tbody>' +
        '<tr><td>90-100</td><td>4.0-5.0</td><td>优秀</td></tr>' +
        '<tr><td>80-89</td><td>3.0-3.9</td><td>良好</td></tr>' +
        '<tr><td>70-79</td><td>2.0-2.9</td><td>中等</td></tr>' +
        '<tr><td>60-69</td><td>1.0-1.9</td><td>及格</td></tr>' +
        '<tr><td>&lt;60</td><td>0</td><td>不及格</td></tr></tbody></table>';
    } else {
      title = '📖 百分制加权平均分';
      html = '<p style="margin:0 0 12px;font-size:.82rem;color:#6b5d47;text-align:center;">公式：Σ(分数 × 学分) ÷ Σ(学分)</p>';
      html += '<table class="table-ref"><thead><tr><th>平均分</th><th>评价</th></tr></thead><tbody>' +
        '<tr><td>90+</td><td>优秀</td></tr>' +
        '<tr><td>80-89</td><td>良好</td></tr>' +
        '<tr><td>70-79</td><td>中等</td></tr>' +
        '<tr><td>60-69</td><td>及格</td></tr>' +
        '<tr><td>&lt;60</td><td>不及格</td></tr></tbody></table>';
    }
    tableModalTitle.textContent = title;
    tableRef.innerHTML = html;
    tableModal.hidden = false;
  });

  tableModalClose.addEventListener('click', function() { tableModal.hidden = true; });
  tableModal.addEventListener('click', function(e) { if (e.target === tableModal) tableModal.hidden = true; });

  /* ============ 初始化 ============ */
  load();
  render();
})();