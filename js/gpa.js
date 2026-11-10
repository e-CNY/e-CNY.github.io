/* js/gpa.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.gpa.v1';

  /* ============ 等级映射 ============ */
  var GRADE_4 = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0
  };
  var GRADE_43 = {
    'A+': 4.3, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0
  };

  /* 4.0/4.3 制字母对应的百分制分数（用于加权平均分和最高/最低分换算） */
  var GRADE_TO_SCORE = {
    'A+': 98, 'A': 94, 'A-': 90,
    'B+': 87, 'B': 84, 'B-': 80,
    'C+': 77, 'C': 74, 'C-': 70,
    'D+': 67, 'D': 64, 'D-': 60,
    'F': 50
  };

  var LETTER_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

  /* ============ DOM ============ */
  var systemSeg     = document.getElementById('systemSeg');
  var tableBtn      = document.getElementById('tableBtn');
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
  function genId() {
    return 'c' + Date.now().toString(36) + '_' + (idCounter++).toString(36);
  }

  function formatNumber(n, digits) {
    if (!isFinite(n)) return '0';
    return Number(n).toFixed(digits == null ? 2 : digits);
  }

  /* ============ 成绩 <-> 绩点 ============ */
  function gradeToPoint(grade) {
    if (state.system === '4.0') return GRADE_4[grade] || 0;
    if (state.system === '4.3') return GRADE_43[grade] || 0;
    if (state.system === '5.0') {
      var s = parseFloat(grade);
      if (isNaN(s) || s < 60) return 0;
      return Math.min(5, Math.max(0, (s - 50) / 10));
    }
    if (state.system === '100') {
      var v = parseFloat(grade);
      return isNaN(v) ? 0 : v;
    }
    return 0;
  }

  function gradeToPercentScore(grade) {
    // 用于计算加权平均分和最高/最低分
    if (state.system === '4.0' || state.system === '4.3') {
      return GRADE_TO_SCORE[grade] || 0;
    }
    var v = parseFloat(grade);
    return isNaN(v) ? 0 : v;
  }

  function isLetterSystem() {
    return state.system === '4.0' || state.system === '4.3';
  }

  /* ============ 计算 ============ */
  function computeStats() {
    var totalCredits = 0;
    var totalPoints = 0;
    var totalScore = 0;
    var maxScore = 0;
    var minScore = 1000;
    var validCount = 0;

    state.courses.forEach(function (c) {
      var credit = parseFloat(c.credits);
      if (isNaN(credit) || credit <= 0) return;
      var point = gradeToPoint(c.grade);
      var score = gradeToPercentScore(c.grade);

      totalCredits += credit;
      totalPoints += point * credit;
      totalScore += score * credit;
      validCount++;

      if (score > maxScore) maxScore = score;
      if (score < minScore) minScore = score;
    });

    var gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    var avg = totalCredits > 0 ? totalScore / totalCredits : 0;

    return {
      gpa: gpa,
      credits: totalCredits,
      count: validCount,
      avg: avg,
      max: validCount > 0 ? maxScore : 0,
      min: validCount > 0 ? minScore : 0
    };
  }

  /* ============ 渲染 ============ */
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
        o.value = opt;
        o.textContent = opt;
        if (opt === course.grade) o.selected = true;
        sel.appendChild(o);
      });
      gradeInput = sel;
    } else {
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.dataset.field = 'grade';
      inp.min = state.system === '5.0' ? 0 : 0;
      inp.max = 100;
      inp.step = 0.5;
      inp.placeholder = '0-100';
      inp.value = course.grade == null ? '' : course.grade;
      gradeInput = inp;
    }

    tr.innerHTML =
      '<td class="col-num">' + (index + 1) + '</td>' +
      '<td class="col-name"><input type="text" data-field="name" placeholder="例如 高等数学" maxlength="30"></td>' +
      '<td class="col-credit"><input type="number" data-field="credits" min="0" max="30" step="0.5" placeholder="学分"></td>' +
      '<td class="col-grade"></td>' +
      '<td class="col-point">' + formatNumber(point, 2) + '</td>' +
      '<td class="col-act"><button class="del-btn" data-act="del" type="button" title="删除">×</button></td>';

    // 填充名称
    var nameInp = tr.querySelector('[data-field="name"]');
    nameInp.value = course.name || '';

    // 填充学分
    var creditInp = tr.querySelector('[data-field="credits"]');
    creditInp.value = course.credits != null ? course.credits : '';

    // 填充成绩（用刚构造的元素替换）
    tr.querySelector('.col-grade').appendChild(gradeInput);

    return tr;
  }

  function render() {
    // 制度按钮高亮
    Array.prototype.forEach.call(systemSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.system);
    });

    // GPA 标签
    var labels = {
      '4.0': 'GPA（4.0 制）',
      '4.3': 'GPA（4.3 制）',
      '5.0': 'GPA（5.0 制）',
      '100': '加权平均分'
    };
    gpaLabel.textContent = labels[state.system];
    statGPASub.textContent = state.system === '100' ? '百分制' : (state.system + ' 制');

    // 渲染表格
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

    // 统计
    var s = computeStats();
    statGPA.textContent = formatNumber(s.gpa, 2);
    statCredits.textContent = formatNumber(s.credits, s.credits % 1 === 0 ? 0 : 1);
    statCount.textContent = s.count;
    statAvg.textContent = formatNumber(s.avg, 2);
    statMax.textContent = s.count > 0 ? formatNumber(s.max, 1) : '—';
    statMin.textContent = s.count > 0 ? formatNumber(s.min, 1) : '—';

    // 重新计算目标反推（如果已经计算过）
    if (!targetResult.hidden) {
      calcTarget();
    }

    save();
  }

  /* ============ 保存 ============ */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (data.system && ['4.0', '4.3', '5.0', '100'].indexOf(data.system) >= 0) {
        state.system = data.system;
      }
      if (Array.isArray(data.courses)) {
        state.courses = data.courses.filter(function (c) {
          return c && c.id && typeof c.credits !== 'undefined';
        }).map(function (c) {
          return {
            id: String(c.id),
            name: String(c.name || ''),
            credits: c.credits,
            grade: c.grade
          };
        });
      }
    } catch (e) { /* ignore */ }
  }

  /* ============ 添加 / 删除 ============ */
  function defaultGrade() {
    return isLetterSystem() ? 'A' : 85;
  }

  function addCourse(name, credit, grade) {
    state.courses.push({
      id: genId(),
      name: name || '',
      credits: credit != null ? credit : '',
      grade: grade != null ? grade : defaultGrade()
    });
    render();
    // 聚焦新行的第一个输入
    var last = courseBody.querySelector('tr:last-child [data-field="name"]');
    if (last) last.focus();
  }

  function deleteCourse(id) {
    state.courses = state.courses.filter(function (c) { return c.id !== id; });
    render();
  }

  /* ============ 表格事件（委托） ============ */
  courseBody.addEventListener('input', function (e) {
    var tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    var id = tr.dataset.id;
    var field = e.target.dataset.field;
    if (!field) return;
    var course = state.courses.find(function (c) { return c.id === id; });
    if (!course) return;

    if (field === 'name') {
      course.name = e.target.value;
    } else if (field === 'credits') {
      course.credits = e.target.value === '' ? '' : parseFloat(e.target.value);
    } else if (field === 'grade') {
      course.grade = e.target.value;
    }
    // 实时更新绩点列和统计（不重建表格避免失焦）
    updateRowPoint(tr, course);
    updateStatsOnly();
    save();
  });

  courseBody.addEventListener('change', function (e) {
    var tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    var id = tr.dataset.id;
    var field = e.target.dataset.field;
    if (field !== 'grade') return;
    var course = state.courses.find(function (c) { return c.id === id; });
    if (!course) return;
    course.grade = e.target.value;
    updateRowPoint(tr, course);
    updateStatsOnly();
    save();
  });

  courseBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act="del"]');
    if (!btn) return;
    var tr = btn.closest('tr[data-id]');
    if (!tr) return;
    deleteCourse(tr.dataset.id);
  });

  function updateRowPoint(tr, course) {
    var pointEl = tr.querySelector('.col-point');
    if (!pointEl) return;
    pointEl.textContent = formatNumber(gradeToPoint(course.grade), 2);
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

  /* ============ 制度切换 ============ */
  systemSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    var newSystem = btn.dataset.value;
    if (newSystem === state.system) return;

    var wasLetter = isLetterSystem();
    var willBeLetter = (newSystem === '4.0' || newSystem === '4.3');

    // 切换制度时，如果成绩格式不兼容，统一重设为默认值
    state.courses.forEach(function (c) {
      if (wasLetter && !willBeLetter) {
        // 字母 → 数字，把字母转成对应的百分制分数
        c.grade = GRADE_TO_SCORE[c.grade] || 85;
      } else if (!wasLetter && willBeLetter) {
        // 数字 → 字母，把分数转成最接近的字母等级
        var s = parseFloat(c.grade) || 0;
        if (s >= 95) c.grade = 'A+';
        else if (s >= 90) c.grade = 'A';
        else if (s >= 87) c.grade = 'A-';
        else if (s >= 83) c.grade = 'B+';
        else if (s >= 80) c.grade = 'B';
        else if (s >= 76) c.grade = 'B-';
        else if (s >= 73) c.grade = 'C+';
        else if (s >= 70) c.grade = 'C';
        else if (s >= 66) c.grade = 'C-';
        else if (s >= 63) c.grade = 'D+';
        else if (s >= 60) c.grade = 'D';
        else c.grade = 'F';
      }
    });

    state.system = newSystem;
    targetResult.hidden = true;
    render();
  });

  /* ============ 顶部按钮 ============ */
  addRowBtn.addEventListener('click', function () {
    addCourse('', '', null);
  });

  clearBtn.addEventListener('click', function () {
    if (state.courses.length === 0) return;
    if (!confirm('确定清空全部课程？此操作不可撤销。')) return;
    state.courses = [];
    targetResult.hidden = true;
    render();
  });

  /* ============ 快捷添加 ============ */
  document.querySelectorAll('.quick-tag').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addCourse(btn.dataset.name, parseFloat(btn.dataset.credit), null);
    });
  });

  /* ============ 目标反推 ============ */
  function calcTarget() {
    if (state.courses.length === 0) {
      showTargetResult('err', '请先录入至少一门课程');
      return;
    }

    var target = parseFloat(targetGPAEl.value);
    var addCredits = parseFloat(addCreditsEl.value);

    if (isNaN(target) || target < 0) {
      showTargetResult('err', '请输入有效的目标 GPA');
      return;
    }
    if (isNaN(addCredits) || addCredits <= 0) {
      showTargetResult('err', '请输入大于 0 的未来新增学分');
      return;
    }

    var s = computeStats();
    var currentCredits = s.credits;
    var currentPoints = s.gpa * currentCredits;

    // 目标： (currentPoints + needed * addCredits) / (currentCredits + addCredits) = target
    // needed = (target * (currentCredits + addCredits) - currentPoints) / addCredits
    var needed = (target * (currentCredits + addCredits) - currentPoints) / addCredits;

    var maxGPA = parseFloat(state.system) || 4.0;

    if (needed > maxGPA) {
      showTargetResult('err',
        '❌ 目标过高。要达到 GPA <strong>' + target.toFixed(2) + '</strong>，' +
        '未来 ' + addCredits + ' 个学分需要达到平均绩点 <strong>' + needed.toFixed(2) + '</strong>，' +
        '超过了制度上限（' + maxGPA.toFixed(1) + '）。建议降低目标，或先提高现有课程成绩。');
      return;
    }
    if (needed < 0) {
      showTargetResult('ok',
        '🎉 恭喜！即使未来 ' + addCredits + ' 个学分全部挂科（GPA 0），你的 GPA 也能保持在 <strong>' + target.toFixed(2) + '</strong> 以上。' +
        '当前 GPA ' + s.gpa.toFixed(2) + '，总学分 ' + currentCredits + '。');
      return;
    }

    // 所需成绩（百分制）
    var neededScore;
    if (state.system === '5.0') {
      neededScore = needed * 10 + 50;
    } else if (state.system === '100') {
      neededScore = needed;
    } else {
      // 4.0/4.3：把绩点转成字母等级
      var letter = pointToLetter(needed);
      showTargetResult('ok',
        '🎯 需要在未来 <strong>' + addCredits + ' 个学分</strong> 的课程中平均拿到 <strong>' +
        needed.toFixed(2) + '</strong> 绩点（约 <strong>' + letter + '</strong> 等级），' +
        '就能把总体 GPA 从 ' + s.gpa.toFixed(2) + ' 提升到 <strong>' + target.toFixed(2) + '</strong>。');
      return;
    }

    if (neededScore > 100) {
      showTargetResult('err',
        '❌ 目标过高。所需平均成绩 <strong>' + neededScore.toFixed(1) + '</strong> 分，超出 100 分上限。建议降低目标。');
      return;
    }
    if (neededScore < 60) {
      showTargetResult('ok',
        '🎯 需要在未来 <strong>' + addCredits + ' 个学分</strong> 的课程中平均拿到 <strong>' +
        neededScore.toFixed(1) + '</strong> 分（及格线以下），就能把总体 GPA 提升到 <strong>' + target.toFixed(2) + '</strong>。');
      return;
    }

    showTargetResult('ok',
      '🎯 需要在未来 <strong>' + addCredits + ' 个学分</strong> 的课程中平均拿到 <strong>' +
      neededScore.toFixed(1) + '</strong> 分以上，就能把总体 GPA 从 ' + s.gpa.toFixed(2) +
      ' 提升到 <strong>' + target.toFixed(2) + '</strong>。');
  }

  function pointToLetter(point) {
    // 4.0 制反推
    var table40 = [
      { p: 4.0, l: 'A+ / A' },
      { p: 3.7, l: 'A-' },
      { p: 3.3, l: 'B+' },
      { p: 3.0, l: 'B' },
      { p: 2.7, l: 'B-' },
      { p: 2.3, l: 'C+' },
      { p: 2.0, l: 'C' },
      { p: 1.7, l: 'C-' },
      { p: 1.3, l: 'D+' },
      { p: 1.0, l: 'D' },
      { p: 0.7, l: 'D-' },
      { p: 0.0, l: 'F' }
    ];
    var closest = table40[0];
    var minDiff = Infinity;
    table40.forEach(function (t) {
      var diff = Math.abs(t.p - point);
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    });
    return closest.l;
  }

  function showTargetResult(type, html) {
    targetResult.hidden = false;
    targetResult.className = 'target-result ' + type;
    targetResult.innerHTML = html;
  }

  calcTargetBtn.addEventListener('click', calcTarget);
  targetGPAEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); calcTarget(); }
  });
  addCreditsEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); calcTarget(); }
  });

  /* ============ CSV 导入导出 ============ */
  function exportCSV() {
    if (state.courses.length === 0) {
      alert('没有课程可以导出');
      return;
    }

    var rows = [['课程名称', '学分', '成绩', '绩点', '制度']];
    state.courses.forEach(function (c) {
      rows.push([
        csvEscape(c.name || ''),
        c.credits != null ? c.credits : '',
        c.grade != null ? c.grade : '',
        formatNumber(gradeToPoint(c.grade), 2),
        state.system
      ]);
    });

    var csv = rows.map(function (r) { return r.join(','); }).join('\r\n');
    // 加 BOM 让 Excel 正确识别 UTF-8
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

    var d = new Date();
    var ts = d.getFullYear()
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gpa-' + ts + '-' + state.system + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function csvEscape(s) {
    s = String(s);
    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function parseCSV(text) {
    // 去掉 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [];
    var current = [];
    var cell = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else inQuotes = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { current.push(cell); cell = ''; }
        else if (ch === '\n') {
          current.push(cell); cell = '';
          rows.push(current); current = [];
        } else if (ch === '\r') {
          // 跳过 CR，等下个 LF
        } else {
          cell += ch;
        }
      }
    }
    if (cell !== '' || current.length > 0) {
      current.push(cell);
      rows.push(current);
    }
    return rows;
  }

  function importCSV() {
    importFile.click();
  }

  importFile.addEventListener('change', function () {
    var f = importFile.files && importFile.files[0];
    if (!f) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result || '');
        var rows = parseCSV(text);

        if (rows.length < 2) {
          alert('CSV 内容为空或格式不正确');
          return;
        }

        // 判断表头
        var header = rows[0];
        var hasHeader = false;
        if (header.length >= 3) {
          var h0 = (header[0] || '').trim();
          if (h0 === '课程名称' || h0.toLowerCase() === 'name' || h0.toLowerCase() === 'course') {
            hasHeader = true;
          }
        }

        var start = hasHeader ? 1 : 0;
        var newCourses = [];

        for (var i = start; i < rows.length; i++) {
          var r = rows[i];
          if (!r || r.length < 3) continue;
          var name = (r[0] || '').trim();
          var credit = parseFloat(r[1]);
          var grade = (r[2] || '').trim();
          if (!name && isNaN(credit)) continue;

          // 尝试解析成绩：如果是数字用数字，否则用字母
          var parsedGrade;
          if (!isNaN(parseFloat(grade)) && /^-?\d+(\.\d+)?$/.test(grade)) {
            parsedGrade = parseFloat(grade);
          } else {
            parsedGrade = grade;
          }

          newCourses.push({
            id: genId(),
            name: name,
            credits: isNaN(credit) ? '' : credit,
            grade: parsedGrade
          });
        }

        if (newCourses.length === 0) {
          alert('未找到有效课程行');
          return;
        }

        var merge = false;
        if (state.courses.length > 0) {
          merge = confirm('当前已有 ' + state.courses.length + ' 门课程。\n\n点击「确定」合并导入 ' + newCourses.length + ' 门课程；\n点击「取消」替换当前课程。');
        }

        if (merge) {
          state.courses = state.courses.concat(newCourses);
        } else {
          state.courses = newCourses;
        }

        targetResult.hidden = true;
        render();
        alert('✅ 成功导入 ' + newCourses.length + ' 门课程');
      } catch (err) {
        alert('读取 CSV 失败：' + (err && err.message ? err.message : err));
      } finally {
        importFile.value = '';
      }
    };
    reader.onerror = function () {
      alert('读取文件失败');
      importFile.value = '';
    };
    reader.readAsText(f);
  });

  exportCSVBtn.addEventListener('click', exportCSV);
  importCSVBtn.addEventListener('click', importCSV);

  /* ============ 等级对照表弹窗 ============ */
  function renderRefTable() {
    var title, rows;

    if (state.system === '4.0') {
      title = '📖 4.0 制 GPA 等级对照';
      rows = [
        ['A+', '4.0', '97-100'],
        ['A', '4.0', '93-96'],
        ['A-', '3.7', '90-92'],
        ['B+', '3.3', '87-89'],
        ['B', '3.0', '83-86'],
        ['B-', '2.7', '80-82'],
        ['C+', '2.3', '77-79'],
        ['C', '2.0', '73-76'],
        ['C-', '1.7', '70-72'],
        ['D+', '1.3', '67-69'],
        ['D', '1.0', '63-66'],
        ['D-', '0.7', '60-62'],
        ['F', '0', '0-59']
      ];
    } else if (state.system === '4.3') {
      title = '📖 4.3 制 GPA 等级对照';
      rows = [
        ['A+', '4.3', '97-100'],
        ['A', '4.0', '93-96'],
        ['A-', '3.7', '90-92'],
        ['B+', '3.3', '87-89'],
        ['B', '3.0', '83-86'],
        ['B-', '2.7', '80-82'],
        ['C+', '2.3', '77-79'],
        ['C', '2.0', '73-76'],
        ['C-', '1.7', '70-72'],
        ['D+', '1.3', '67-69'],
        ['D', '1.0', '63-66'],
        ['D-', '0.7', '60-62'],
        ['F', '0', '0-59']
      ];
    } else if (state.system === '5.0') {
      title = '📖 5.0 制 GPA 对照（线性公式）';
      rows = [
        ['95-100', '4.5-5.0', '优秀'],
        ['90-94', '4.0-4.4', '优秀'],
        ['85-89', '3.5-3.9', '良好'],
        ['80-84', '3.0-3.4', '良好'],
        ['75-79', '2.5-2.9', '中等'],
        ['70-74', '2.0-2.4', '中等'],
        ['65-69', '1.5-1.9', '及格'],
        ['60-64', '1.0-1.4', '及格'],
        ['<60', '0', '不及格']
      ];
      tableModalTitle.textContent = title;
      var html = '<p style="margin:0 0 12px;font-size:.82rem;color:#6b5d47;text-align:center;">公式：GPA = (分数 − 50) ÷ 10，分数低于 60 时按 0 处理</p>';
      html += '<table class="table-ref"><thead><tr><th>分数</th><th>GPA</th><th>评价</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
      });
      html += '</tbody></table>';
      tableRef.innerHTML = html;
      tableModal.hidden = false;
      return;
    } else {
      title = '📖 百分制加权平均分';
      tableModalTitle.textContent = title;
      var html2 = '<p style="margin:0 0 12px;font-size:.82rem;color:#6b5d47;text-align:center;line-height:1.6;">' +
        '本制度下不换算 GPA，直接显示按学分加权的百分制平均分。<br>' +
        '公式：Σ(分数 × 学分) ÷ Σ(学分)</p>' +
        '<table class="table-ref"><thead><tr><th>平均分</th><th>评价</th></tr></thead><tbody>' +
        '<tr><td>90+</td><td>优秀</td></tr>' +
        '<tr><td>80-89</td><td>良好</td></tr>' +
        '<tr><td>70-79</td><td>中等</td></tr>' +
        '<tr><td>60-69</td><td>及格</td></tr>' +
        '<tr><td>&lt;60</td><td>不及格</td></tr>' +
        '</tbody></table>';
      tableRef.innerHTML = html2;
      tableModal.hidden = false;
      return;
    }

    tableModalTitle.textContent = title;
    var html3 = '<table class="table-ref"><thead><tr><th>等级</th><th>绩点</th><th>分数区间</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html3 += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
    });
    html3 += '</tbody></table>';
    tableRef.innerHTML = html3;
    tableModal.hidden = false;
  }

  tableBtn.addEventListener('click', renderRefTable);
  tableModalClose.addEventListener('click', function () {
    tableModal.hidden = true;
  });
  tableModal.addEventListener('click', function (e) {
    if (e.target === tableModal) tableModal.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !tableModal.hidden) tableModal.hidden = true;
  });

  /* ============ 初始化 ============ */
  function init() {
    load();
    render();
  }

  init();
})();