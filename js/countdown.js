/* js/countdown.js */
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

  // ================= 状态定义 =================
  var STORAGE_KEY = 'tool.countdown.v2';
  var state = {
    events: [],
    sort: 'upcoming',
    editingId: null
  };

  var shareDataUrl = null;
  var shareFileName = '';

  // ================= DOM 元素 =================
  var formTitle     = document.getElementById('formTitle');
  var addPanel      = document.getElementById('addPanel');
  var cancelEditBtn = document.getElementById('cancelEditBtn');
  
  var eventNameEl   = document.getElementById('eventName');
  var eventDateEl   = document.getElementById('eventDate');
  var eventTypeEl   = document.getElementById('eventType');
  var eventNoteEl   = document.getElementById('eventNote');
  
  var addBtn        = document.getElementById('addBtn');
  var cardsEl       = document.getElementById('cards');
  var eventCountEl  = document.getElementById('eventCount');
  var emptyTip      = document.getElementById('emptyTip');
  var sortSeg       = document.getElementById('sortSeg');
  
  var importBtn     = document.getElementById('importBtn');
  var exportBtn     = document.getElementById('exportBtn');
  var importFile    = document.getElementById('importFile');
  
  var modalMask     = document.getElementById('modalMask');
  var modalClose    = document.getElementById('modalClose');
  var modalCanvasWrap = document.getElementById('modalCanvasWrap');
  var downloadBtn   = document.getElementById('downloadBtn');
  var copyShareBtn  = document.getElementById('copyShareBtn');

  // ================= 日期与计算工具 =================
  function genId() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function today() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseDate(str) {
    if (!str) return null;
    var parts = String(str).split('-');
    if (parts.length !== 3) return null;
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  }

  function formatDate(d) {
    if (!d) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function formatDateInput(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function dateDiff(a, b) {
    return Math.round((a.getTime() - b.getTime()) / 86400000);
  }

  function getTargetDate(event) {
    var d = parseDate(event.date);
    if (!d) return null;
    if (event.type === 'yearly') {
      var t = today();
      var thisYear = new Date(t.getFullYear(), d.getMonth(), d.getDate());
      if (thisYear < t) {
        return new Date(t.getFullYear() + 1, d.getMonth(), d.getDate());
      }
      return thisYear;
    }
    return d;
  }

  function calcDays(event) {
    var t = today();
    var target = getTargetDate(event);
    if (!target) return 0;
    return dateDiff(target, t);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ================= 数据存取 =================
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.events)) {
        state.events = data.events.filter(function (e) {
          return e && e.id && e.name && e.date;
        });
      }
    } catch (e) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: state.events }));
    } catch (e) { showToast('本地存储已满，无法保存', true); }
  }

  // ================= 添加 / 编辑逻辑 =================
  function resetForm() {
    state.editingId = null;
    formTitle.textContent = '添加重要日子';
    addBtn.textContent = '＋ 添加事件';
    cancelEditBtn.style.display = 'none';
    addPanel.classList.remove('editing');
    eventNameEl.value = '';
    eventNoteEl.value = '';
    
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    eventDateEl.value = formatDateInput(tomorrow);
    eventTypeEl.value = 'countdown';
  }

  function editEvent(id) {
    var e = state.events.find(function (x) { return x.id === id; });
    if (!e) return;

    state.editingId = id;
    formTitle.textContent = '修改重要日子';
    addBtn.textContent = '💾 保存修改';
    cancelEditBtn.style.display = 'inline-block';
    addPanel.classList.add('editing');
    
    eventNameEl.value = e.name;
    eventDateEl.value = e.date;
    eventTypeEl.value = e.type;
    eventNoteEl.value = e.note || '';
    
    // 滚动到顶部并聚焦
    window.scrollTo({ top: 0, behavior: 'smooth' });
    eventNameEl.focus();
  }

  function saveEvent() {
    var name = eventNameEl.value.trim();
    var date = eventDateEl.value;
    var type = eventTypeEl.value;
    var note = eventNoteEl.value.trim();

    if (!name) return showToast('请填写事件名称', true) || eventNameEl.focus();
    if (!date) return showToast('请选择日期', true) || eventDateEl.focus();
    var d = parseDate(date);
    if (!d) return showToast('日期格式不正确', true);

    if (state.editingId) {
      var e = state.events.find(function (x) { return x.id === state.editingId; });
      if (e) {
        e.name = name; e.date = date; e.type = type; e.note = note;
      }
      showToast('修改成功');
    } else {
      state.events.push({
        id: genId(), name: name, date: date, type: type, note: note, createdAt: Date.now()
      });
      showToast('添加成功');
    }

    save();
    resetForm();
    render();
  }

  function deleteEvent(id) {
    var e = state.events.find(function (x) { return x.id === id; });
    if (!e) return;
    confirmAction('删除确认', '确定要删除「' + e.name + '」吗？', function() {
      state.events = state.events.filter(function (x) { return x.id !== id; });
      if (state.editingId === id) resetForm(); // 如果正在编辑这个，取消编辑状态
      save(); 
      render();
      showToast('已删除');
    });
  }

  // ================= 渲染逻辑 =================
  function sortEvents() {
    var arr = state.events.slice();
    if (state.sort === 'upcoming') {
      arr.sort(function (a, b) {
        var da = calcDays(a), db = calcDays(b);
        var fa = da >= 0 ? da : Number.MAX_SAFE_INTEGER + Math.abs(da);
        var fb = db >= 0 ? db : Number.MAX_SAFE_INTEGER + Math.abs(db);
        return fa - fb;
      });
    } else if (state.sort === 'passed') {
      arr.sort(function (a, b) { return calcDays(a) - calcDays(b); });
    } else {
      arr.sort(function (a, b) { return b.createdAt - a.createdAt; });
    }
    return arr;
  }

  function renderCard(event) {
    var days = calcDays(event);
    var target = getTargetDate(event);
    var isToday = days === 0 && event.type !== 'countup';
    var isPast = days < 0 && event.type === 'countdown';

    var card = document.createElement('div');
    card.className = 'cd-card';
    if (isToday) card.classList.add('status-today');
    if (isPast) card.classList.add('status-past');
    card.dataset.id = event.id;

    var tagHtml = '';
    if (event.type === 'yearly') {
      tagHtml = '<span class="cd-tag yearly">每年</span>';
    } else if (event.type === 'countup') {
      tagHtml = '<span class="cd-tag countup">正数</span>';
    } else if (isToday) {
      tagHtml = '<span class="cd-tag today">今天</span>';
    }

    var numHtml = '';
    if (isToday) {
      numHtml = '<div class="cd-num">今天<span class="cd-unit">🎉</span></div>';
    } else if (event.type === 'countup' || isPast) {
      numHtml = '<div class="cd-num">' + Math.abs(days) + '<span class="cd-unit">天前</span></div>';
    } else {
      numHtml = '<div class="cd-num">' + days + '<span class="cd-unit">天</span></div>';
    }

    var dateLabel = event.type === 'yearly' ? '下一次' : '目标日期';
    var dateText = formatDate(target);

    var html = '';
    html += tagHtml;
    html += numHtml;
    html += '<div class="cd-name">' + escapeHtml(event.name) + '</div>';
    html += '<div class="cd-meta">';
    html += '<div class="cd-meta-line"><span class="cd-meta-label">' + dateLabel + '</span><span class="cd-meta-value">' + dateText + '</span></div>';
    if (event.type === 'yearly') {
      html += '<div class="cd-meta-line"><span class="cd-meta-label">首次日期</span><span class="cd-meta-value">' + formatDate(parseDate(event.date)) + '</span></div>';
    }
    html += '</div>';

    if (event.note) {
      html += '<div class="cd-note">' + escapeHtml(event.note) + '</div>';
    }

    html += '<div class="cd-actions">';
    html += '<button class="cd-btn" data-act="share" data-id="' + event.id + '" type="button">📤 分享</button>';
    html += '<button class="cd-btn" data-act="edit" data-id="' + event.id + '" type="button">✏️ 编辑</button>';
    html += '<button class="cd-btn danger" data-act="del" data-id="' + event.id + '" type="button">🗑️ 删除</button>';
    html += '</div>';

    card.innerHTML = html;
    return card;
  }

  function render() {
    var list = sortEvents();
    eventCountEl.textContent = list.length;
    cardsEl.innerHTML = '';

    if (list.length === 0) {
      emptyTip.hidden = false;
    } else {
      emptyTip.hidden = true;
      list.forEach(function (e) { cardsEl.appendChild(renderCard(e)); });
    }

    Array.prototype.forEach.call(sortSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.sort);
    });
  }

  // ================= Canvas 分享图生成 =================
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var chars = Array.from(text);
    var line = '';
    var lines = [];
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line); line = chars[i];
      } else { line = test; }
    }
    if (line) lines.push(line);

    var startY = y - (lines.length - 1) * lineHeight / 2;
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], x, startY + j * lineHeight);
  }

  function generateShareCanvas(event) {
    // 使用 2 倍分辨率保证导出图片极致清晰
    var W = 750, H = 1000;
    var dpr = 2;
    var canvas = document.createElement('canvas');
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var days = calcDays(event);
    var target = getTargetDate(event);
    var isToday = days === 0 && event.type !== 'countup';
    var isPast = days < 0 && event.type === 'countdown';

    /* 背景渐变 */
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    if (isToday) {
      bgGrad.addColorStop(0, '#fdd77a'); bgGrad.addColorStop(1, '#e6b84a');
    } else if (event.type === 'countup' || isPast) {
      bgGrad.addColorStop(0, '#f3f4f6'); bgGrad.addColorStop(1, '#d1d5db');
    } else if (event.type === 'yearly') {
      bgGrad.addColorStop(0, '#e0f2fe'); bgGrad.addColorStop(1, '#bae6fd');
    } else {
      bgGrad.addColorStop(0, '#fdf8ec'); bgGrad.addColorStop(1, '#efe6d0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    /* 装饰条 */
    ctx.fillStyle = isToday ? '#a32222' : '#8a5a2b';
    if (event.type === 'countup') ctx.fillStyle = '#6b5d47';
    if (event.type === 'yearly') ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, W, 12);
    ctx.fillRect(0, H - 12, W, 12);

    /* 顶部圆形 emoji */
    ctx.beginPath();
    ctx.arc(W / 2, 160, 72, 0, Math.PI * 2);
    ctx.fillStyle = isToday ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.6)';
    ctx.fill();

    ctx.font = '78px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isToday ? '🎉' : (event.type === 'yearly' ? '🎂' : (event.type === 'countup' ? '⏳' : '📅')), W / 2, 164);

    /* 事件名 */
    ctx.fillStyle = isToday ? '#3d1a1a' : '#3d3226';
    ctx.font = 'bold 52px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, event.name, W / 2, 320, W - 120, 66);

    /* 大数字 */
    var numStr, unitStr;
    if (isToday) {
      numStr = '今天'; unitStr = '';
    } else if (event.type === 'countup' || isPast) {
      numStr = String(Math.abs(days)); unitStr = '天前';
    } else {
      numStr = String(days); unitStr = '天';
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isToday ? '#a32222' : (event.type === 'yearly' ? '#0369a1' : '#8a5a2b');
    if (event.type === 'countup' || isPast) ctx.fillStyle = '#4b5563';

    if (isToday) {
      ctx.font = 'bold 220px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(numStr, W / 2, 570);
    } else {
      ctx.font = 'bold 260px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(numStr, W / 2, 570);
      ctx.font = 'bold 60px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = isToday ? '#a32222' : '#a0947c';
      if (event.type === 'countup' || isPast) ctx.fillStyle = '#6b7280';
      ctx.fillText(unitStr, W / 2, 720);
    }

    /* 日期行 */
    ctx.fillStyle = isToday ? '#3d1a1a' : '#6b5d47';
    ctx.font = '40px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
    var dateLabel = event.type === 'yearly' ? '下一次：' : '';
    ctx.fillText(dateLabel + formatDate(target), W / 2, 825);

    /* 备注 */
    if (event.note) {
      ctx.fillStyle = isToday ? '#5a2010' : '#6b5d47';
      ctx.font = '32px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      wrapText(ctx, '「' + event.note + '」', W / 2, 885, W - 120, 42);
    }

    /* 水印 */
    ctx.fillStyle = 'rgba(138, 90, 43, .45)';
    ctx.font = '26px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('— 工具站 · 倒数日 —', W / 2, H - 34);

    return canvas;
  }

  function openShareModal(event) {
    var canvas = generateShareCanvas(event);
    modalCanvasWrap.innerHTML = '';
    modalCanvasWrap.appendChild(canvas);
    shareDataUrl = canvas.toDataURL('image/png');
    shareFileName = 'countdown-' + String(event.name).replace(/[\\/:*?"<>|]/g, '_') + '.png';
    modalMask.hidden = false;
  }

  function closeModal() {
    modalMask.hidden = true;
    modalCanvasWrap.innerHTML = '';
    shareDataUrl = null;
  }

  // ================= 导入导出逻辑 =================
  function downloadBlob(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  exportBtn.addEventListener('click', function() {
    if (state.events.length === 0) return showToast('没有数据可导出', true);
    var data = { version: 2, exportedAt: new Date().toISOString(), events: state.events };
    downloadBlob(JSON.stringify(data, null, 2), 'countdown_backup_' + formatDateInput(new Date()) + '.json', 'application/json');
    showToast('备份文件已下载');
  });

  importBtn.addEventListener('click', function() { importFile.click(); });

  importFile.addEventListener('change', function() {
    var f = importFile.files && importFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function() {
      try {
        var data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.events)) return showToast('文件格式不正确', true);
        
        var imported = data.events.filter(function(e) { return e && e.name && e.date; }).map(function(e) {
          return {
            id: genId(),
            name: String(e.name),
            date: String(e.date),
            type: ['countdown', 'countup', 'yearly'].indexOf(e.type) !== -1 ? e.type : 'countdown',
            note: String(e.note || ''),
            createdAt: Number(e.createdAt) || Date.now()
          };
        });

        if (imported.length === 0) return showToast('没有找到有效事件', true);

        if (state.events.length > 0) {
          confirmAction('导入确认', '当前已有 ' + state.events.length + ' 个事件。确定追加导入 ' + imported.length + ' 个事件吗？', function() {
            state.events = state.events.concat(imported);
            save(); render(); showToast('成功导入 ' + imported.length + ' 个事件');
          });
        } else {
          state.events = imported;
          save(); render(); showToast('成功导入 ' + imported.length + ' 个事件');
        }
      } catch (err) {
        showToast('读取文件失败', true);
      } finally {
        importFile.value = '';
      }
    };
    reader.readAsText(f);
  });

  // ================= 事件绑定 =================
  addBtn.addEventListener('click', saveEvent);
  cancelEditBtn.addEventListener('click', function() {
    resetForm();
    showToast('已取消编辑');
  });

  [eventNameEl, eventNoteEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveEvent(); }
    });
  });

  cardsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var id = btn.dataset.id;
    var act = btn.dataset.act;
    
    if (act === 'del') {
      deleteEvent(id);
    } else if (act === 'edit') {
      editEvent(id);
    } else if (act === 'share') {
      var ev = state.events.find(function (x) { return x.id === id; });
      if (ev) openShareModal(ev);
    }
  });

  sortSeg.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-value]');
    if (!btn) return;
    state.sort = btn.dataset.value;
    render();
  });

  // 快捷标签一键添加
  document.querySelectorAll('.quick-tag').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.name;
      var md = btn.dataset.date.split('-');
      var m = parseInt(md[0], 10);
      var d = parseInt(md[1], 10);
      var t = today();
      var target = new Date(t.getFullYear(), m - 1, d);
      if (target < t) target = new Date(t.getFullYear() + 1, m - 1, d);
      
      // 检查是否已存在
      var exists = state.events.some(function(e) { return e.name === name && e.type === 'yearly'; });
      if (exists) return showToast('该节日已在列表中', true);

      state.events.push({
        id: genId(), name: name, date: formatDateInput(target),
        type: 'yearly', note: '', createdAt: Date.now()
      });
      save(); render();
      showToast('已添加：' + name);
    });
  });

  // Modal 事件
  modalClose.addEventListener('click', closeModal);
  modalMask.addEventListener('click', function (e) { if (e.target === modalMask) closeModal(); });
  downloadBtn.addEventListener('click', function () {
    if (!shareDataUrl) return;
    var a = document.createElement('a');
    a.href = shareDataUrl; a.download = shareFileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('图片已下载');
  });
  copyShareBtn.addEventListener('click', function () {
    if (!shareDataUrl) return;
    if (!navigator.clipboard || !window.ClipboardItem) return showToast('当前浏览器不支持复制图片', true);
    var canvas = modalCanvasWrap.querySelector('canvas');
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(function () {
        showToast('✅ 图片已复制到剪贴板');
      }).catch(function () { showToast('复制失败，请保存图片', true); });
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!modalMask.hidden) closeModal();
      else if (state.editingId) { resetForm(); showToast('已取消编辑'); }
    }
  });

  // ================= 初始化 =================
  load();
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  eventDateEl.value = formatDateInput(tomorrow);
  render();
})();