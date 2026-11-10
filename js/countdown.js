/* js/countdown.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'tool.countdown.v1';

  /* ============ DOM ============ */
  var eventNameEl = document.getElementById('eventName');
  var eventDateEl = document.getElementById('eventDate');
  var eventTypeEl = document.getElementById('eventType');
  var eventNoteEl = document.getElementById('eventNote');
  var addBtn      = document.getElementById('addBtn');
  var cardsEl     = document.getElementById('cards');
  var eventCountEl= document.getElementById('eventCount');
  var emptyTip    = document.getElementById('emptyTip');
  var sortSeg     = document.getElementById('sortSeg');
  var modalMask   = document.getElementById('modalMask');
  var modalClose  = document.getElementById('modalClose');
  var modalCanvasWrap = document.getElementById('modalCanvasWrap');
  var downloadBtn = document.getElementById('downloadBtn');
  var copyShareBtn= document.getElementById('copyShareBtn');

  /* ============ 状态 ============ */
  var state = {
    events: [],
    sort: 'upcoming'
  };

  var shareDataUrl = null;
  var shareFileName = '';

  /* ============ 工具 ============ */
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
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ============ 持久化 ============ */
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
    } catch (e) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: state.events }));
    } catch (e) { /* ignore */ }
  }

  /* ============ 添加 / 删除 ============ */
  function addEvent() {
    var name = eventNameEl.value.trim();
    var date = eventDateEl.value;
    var type = eventTypeEl.value;
    var note = eventNoteEl.value.trim();

    if (!name) {
      alert('请填写事件名称');
      eventNameEl.focus();
      return;
    }
    if (!date) {
      alert('请选择日期');
      eventDateEl.focus();
      return;
    }
    var d = parseDate(date);
    if (!d) {
      alert('日期格式不正确');
      return;
    }

    state.events.push({
      id: genId(),
      name: name,
      date: date,
      type: type,
      note: note,
      createdAt: Date.now()
    });

    eventNameEl.value = '';
    eventDateEl.value = '';
    eventNoteEl.value = '';
    eventNameEl.focus();

    save();
    render();
  }

  function deleteEvent(id) {
    var e = state.events.find(function (x) { return x.id === id; });
    if (!e) return;
    if (!confirm('删除「' + e.name + '」？')) return;
    state.events = state.events.filter(function (x) { return x.id !== id; });
    save();
    render();
  }

  /* ============ 排序 ============ */
  function sortEvents() {
    var arr = state.events.slice();
    if (state.sort === 'upcoming') {
      arr.sort(function (a, b) {
        var da = calcDays(a);
        var db = calcDays(b);
        // 未来的按天数从小到大；已过去的排在最后，且从近到远
        var fa = da >= 0 ? da : Number.MAX_SAFE_INTEGER + Math.abs(da);
        var fb = db >= 0 ? db : Number.MAX_SAFE_INTEGER + Math.abs(db);
        return fa - fb;
      });
    } else if (state.sort === 'passed') {
      arr.sort(function (a, b) {
        var da = calcDays(a);
        var db = calcDays(b);
        // 已过去最久的在前（负数越小越前）
        return da - db;
      });
    } else {
      arr.sort(function (a, b) { return b.createdAt - a.createdAt; });
    }
    return arr;
  }

  /* ============ 渲染 ============ */
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

    /* 类型标签 */
    var tagHtml = '';
    if (event.type === 'yearly') {
      tagHtml = '<span class="cd-tag yearly">每年</span>';
    } else if (event.type === 'countup') {
      tagHtml = '<span class="cd-tag countup">正数</span>';
    } else if (isToday) {
      tagHtml = '<span class="cd-tag today">今天</span>';
    }

    /* 大数字 */
    var numHtml = '';
    if (isToday) {
      numHtml = '<div class="cd-num">今天<span class="cd-unit">🎉</span></div>';
    } else if (event.type === 'countup') {
      numHtml = '<div class="cd-num">' + Math.abs(days) + '<span class="cd-unit">天前</span></div>';
    } else if (isPast) {
      numHtml = '<div class="cd-num">' + Math.abs(days) + '<span class="cd-unit">天前</span></div>';
    } else {
      numHtml = '<div class="cd-num">' + days + '<span class="cd-unit">天</span></div>';
    }

    /* 日期描述 */
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
      list.forEach(function (e) {
        cardsEl.appendChild(renderCard(e));
      });
    }

    Array.prototype.forEach.call(sortSeg.children, function (b) {
      b.classList.toggle('active', b.dataset.value === state.sort);
    });
  }

  /* ============ 分享卡片绘制 ============ */
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var chars = Array.from(text);
    var line = '';
    var lines = [];
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    var startY = y - (lines.length - 1) * lineHeight / 2;
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], x, startY + j * lineHeight);
    }
  }

  function generateShareCanvas(event) {
    var W = 750, H = 1000;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    var days = calcDays(event);
    var target = getTargetDate(event);
    var isToday = days === 0 && event.type !== 'countup';
    var isPast = days < 0 && event.type === 'countdown';

    /* 背景 */
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    if (isToday) {
      bgGrad.addColorStop(0, '#fdd77a');
      bgGrad.addColorStop(1, '#e6b84a');
    } else {
      bgGrad.addColorStop(0, '#fdf8ec');
      bgGrad.addColorStop(1, '#efe6d0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    /* 顶部装饰条 */
    ctx.fillStyle = isToday ? '#a32222' : '#8a5a2b';
    ctx.fillRect(0, 0, W, 12);
    ctx.fillRect(0, H - 12, W, 12);

    /* 顶部圆形 emoji */
    ctx.beginPath();
    ctx.arc(W / 2, 160, 72, 0, Math.PI * 2);
    ctx.fillStyle = isToday ? 'rgba(255,255,255,.35)' : 'rgba(138,90,43,.1)';
    ctx.fill();

    ctx.font = '78px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isToday ? '🎉' : '📅', W / 2, 164);

    /* 事件名 */
    ctx.fillStyle = isToday ? '#3d1a1a' : '#3d3226';
    ctx.font = 'bold 52px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, event.name, W / 2, 320, W - 120, 66);

    /* 大数字 */
    var numStr, unitStr;
    if (isToday) {
      numStr = '今天';
      unitStr = '';
    } else if (event.type === 'countup' || isPast) {
      numStr = String(Math.abs(days));
      unitStr = '天前';
    } else {
      numStr = String(days);
      unitStr = '天';
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isToday ? '#a32222' : '#8a5a2b';

    if (isToday) {
      ctx.font = 'bold 220px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(numStr, W / 2, 570);
    } else {
      ctx.font = 'bold 260px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(numStr, W / 2, 570);
      ctx.font = 'bold 60px "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = isToday ? '#a32222' : '#a0947c';
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

  function downloadShare() {
    if (!shareDataUrl) return;
    var a = document.createElement('a');
    a.href = shareDataUrl;
    a.download = shareFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function copyShare() {
    if (!shareDataUrl) return;
    if (!navigator.clipboard || !window.ClipboardItem) {
      alert('当前浏览器不支持复制图片，请点击下载');
      return;
    }
    try {
      var canvas = modalCanvasWrap.querySelector('canvas');
      if (!canvas) return;
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(function () {
          alert('✅ 图片已复制到剪贴板');
        }).catch(function () {
          alert('复制失败，请点击下载');
        });
      });
    } catch (e) {
      alert('复制失败，请点击下载');
    }
  }

  /* ============ 事件绑定 ============ */
  addBtn.addEventListener('click', addEvent);

  [eventNameEl, eventNoteEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addEvent();
      }
    });
  });

  cardsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var id = btn.dataset.id;
    var act = btn.dataset.act;
    if (act === 'del') {
      deleteEvent(id);
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

  /* 快捷标签 */
  document.querySelectorAll('.quick-tag').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.name;
      var md = btn.dataset.date.split('-');
      var m = parseInt(md[0], 10);
      var d = parseInt(md[1], 10);
      var t = today();
      var target = new Date(t.getFullYear(), m - 1, d);
      if (target < t) {
        target = new Date(t.getFullYear() + 1, m - 1, d);
      }
      eventNameEl.value = name;
      eventDateEl.value = formatDateInput(target);
      eventTypeEl.value = 'yearly';
      eventNameEl.focus();
    });
  });

  modalClose.addEventListener('click', closeModal);
  modalMask.addEventListener('click', function (e) {
    if (e.target === modalMask) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modalMask.hidden) closeModal();
  });
  downloadBtn.addEventListener('click', downloadShare);
  copyShareBtn.addEventListener('click', copyShare);

  /* ============ 初始化 ============ */
  load();

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  eventDateEl.value = formatDateInput(tomorrow);

  render();
})();