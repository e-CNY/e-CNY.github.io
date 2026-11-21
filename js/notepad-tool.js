/* js/notepad-tool.js */
(function () {
  'use strict';

  var STORAGE_KEY = 'secure_notepad_v2';
  var THEME_KEY = 'secure_notepad_theme_v1';
  var SENTINEL_TEXT = 'SENTINEL_OK_V2';
  var PBKDF2_ITERATIONS = 10000;
  var AUTOSAVE_DELAY = 2000;

  var state = {
    masterKey: null,
    password: '',
    salt: '',
    notes: [],
    activeId: null,
    settings: { autoSave: true, autoLockMin: 30, theme: 'light' },
    dirty: false,
    viewMode: 'edit'
  };

  var autoSaveTimer = null;
  var autoLockTimer = null;
  var toastTimer = null;

  function $(id) { return document.getElementById(id); }

  var els = {};
  function cacheEls() {
    els.lock = $('np-lock');
    els.lockTitle = $('np-lock-title');
    els.lockSubtitle = $('np-lock-subtitle');
    els.password = $('np-password');
    els.btnPwdToggle = $('btn-pwd-toggle');
    els.strengthBar = $('np-strength-bar');
    els.strengthFill = $('np-strength-fill');
    els.strengthText = $('np-strength-text');
    els.btnUnlock = $('btn-unlock');

    els.app = $('np-app');
    els.sidebar = $('np-sidebar');
    els.btnSidebarToggle = $('btn-sidebar-toggle');
    els.search = $('np-search');
    els.noteList = $('np-note-list');
    els.noteCount = $('np-note-count');
    els.btnNewNote = $('btn-new-note');

    els.empty = $('np-empty');
    els.editor = $('np-editor');
    els.noteTitle = $('np-note-title');
    els.content = $('np-content');
    els.preview = $('np-preview');
    els.status = $('np-status');
    els.stats = $('np-stats');
    els.btnViewToggle = $('btn-view-toggle');
    els.btnCopyNote = $('btn-copy-note');
    els.btnExportNote = $('btn-export-note');
    els.btnSaveNote = $('btn-save-note');
    els.btnLock = $('btn-lock');
    els.btnTheme = $('btn-theme');
    els.btnSettings = $('btn-settings');

    els.settingsBackdrop = $('np-settings-backdrop');
    els.settingsDrawer = $('np-settings-drawer');
    els.btnSettingsClose = $('btn-settings-close');
    els.setAutoSave = $('set-autosave');
    els.setAutoLock = $('set-autolock');
    els.btnChangePwd = $('btn-change-pwd');
    els.btnExportAll = $('btn-export-all');
    els.btnImportBackup = $('btn-import-backup');
    els.importFile = $('np-import-file');
    els.btnClearAll = $('btn-clear-all');

    els.chpwdModal = $('np-chpwd-modal');
    els.chpwdOld = $('chpwd-old');
    els.chpwdNew = $('chpwd-new');
    els.chpwdConfirm = $('chpwd-confirm');
    els.chpwdCancel = $('chpwd-cancel');
    els.chpwdConfirmBtn = $('chpwd-confirm-btn');

    els.toast = $('np-toast');
  }

  function showToast(msg) {
    if (!els.toast) { console.log('[Toast]', msg); return; }
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(ts) {
    var d = new Date(ts);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return '今天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    var diff = (now - d) / (1000 * 60 * 60 * 24);
    if (diff < 7) {
      var days = ['日', '一', '二', '三', '四', '五', '六'];
      return '周' + days[d.getDay()];
    }
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      showToast('❌ 保存失败：' + e.message);
      return false;
    }
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(THEME_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (typeof s.autoSave === 'boolean') state.settings.autoSave = s.autoSave;
        if (typeof s.autoLockMin === 'number') state.settings.autoLockMin = s.autoLockMin;
        if (s.theme === 'dark' || s.theme === 'light') state.settings.theme = s.theme;
      }
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(THEME_KEY, JSON.stringify(state.settings)); } catch (e) {}
  }

  /* ================= CryptoJS 检测 ================= */
  function checkCryptoReady() {
    if (typeof CryptoJS === 'undefined') {
      return { ok: false, msg: 'crypto-js.min.js 未加载' };
    }
    var needed = ['PBKDF2', 'AES', 'lib', 'enc', 'mode', 'pad'];
    for (var i = 0; i < needed.length; i++) {
      if (!CryptoJS[needed[i]]) {
        return { ok: false, msg: '缺少模块 CryptoJS.' + needed[i] + '（请使用完整版 crypto-js.min.js）' };
      }
    }
    if (!CryptoJS.lib.WordArray || typeof CryptoJS.lib.WordArray.random !== 'function') {
      return { ok: false, msg: '缺少 CryptoJS.lib.WordArray.random' };
    }
    if (!CryptoJS.mode.CBC) return { ok: false, msg: '缺少 CryptoJS.mode.CBC' };
    if (!CryptoJS.pad.Pkcs7) return { ok: false, msg: '缺少 CryptoJS.pad.Pkcs7' };
    if (!CryptoJS.enc.Hex || !CryptoJS.enc.Utf8) {
      return { ok: false, msg: '缺少 CryptoJS.enc.Hex 或 CryptoJS.enc.Utf8' };
    }

    // 功能自检：用新写法跑一遍往返加解密
    try {
      var testSalt = CryptoJS.lib.WordArray.random(16);
      var testKey = CryptoJS.PBKDF2('test-pwd', testSalt, {
        keySize: 256 / 32,
        iterations: 100
      });
      if (!testKey || !testKey.words || testKey.sigBytes <= 0) {
        return { ok: false, msg: 'PBKDF2 密钥派生返回无效结果' };
      }

      // 关键：显式传 iv
      var testIv = CryptoJS.lib.WordArray.random(16);
      var testCipher = CryptoJS.AES.encrypt('hello', testKey, {
        iv: testIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
      if (!testCipher) {
        return { ok: false, msg: 'AES 加密返回空结果' };
      }

      var testDec = CryptoJS.AES.decrypt(testCipher, testKey, {
        iv: testIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8);
      if (testDec !== 'hello') {
        return { ok: false, msg: 'AES 加解密自检失败' };
      }
    } catch (e) {
      return { ok: false, msg: '加密库功能自检异常：' + (e.message || e) };
    }

    return { ok: true, msg: '' };
  }

  /* ================= 加密核心（关键修复） ================= */

  function deriveKey(password, saltHex) {
    var salt = CryptoJS.enc.Hex.parse(saltHex);
    var key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: PBKDF2_ITERATIONS
    });
    if (!key || !key.words || key.sigBytes <= 0) {
      throw new Error('PBKDF2 密钥派生返回无效结果');
    }
    return key;
  }

  /**
   * AES 加密：随机 IV，格式 "ivHex:ciphertext"
   * 关键：显式传 iv，否则 CryptoJS 会把 WordArray key 当口令处理，报 undefined reading '0'
   */
  function encryptText(plaintext, key) {
    if (!key || !key.words || key.sigBytes <= 0) {
      throw new Error('加密密钥无效');
    }
    var iv = CryptoJS.lib.WordArray.random(16);
    var encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return iv.toString() + ':' + encrypted;
  }

  function decryptText(ciphertext, key) {
    if (!key || !key.words || key.sigBytes <= 0) return '';
    if (!ciphertext || typeof ciphertext !== 'string') return '';
    var parts = ciphertext.split(':');
    if (parts.length !== 2) return '';
    try {
      var iv = CryptoJS.enc.Hex.parse(parts[0]);
      var bytes = CryptoJS.AES.decrypt(parts[1], key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return '';
    }
  }

  function generateSalt() {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  /* ================= 解锁 / 创建 ================= */
  function updatePasswordStrength() {
    var pwd = els.password.value;
    if (!pwd) {
      els.strengthBar.hidden = true;
      els.strengthText.hidden = true;
      return;
    }
    els.strengthBar.hidden = false;
    els.strengthText.hidden = false;

    var score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    var levels = [
      { pct: 20, color: '#e57373', text: '很弱 · 建议至少 8 位混合字符' },
      { pct: 40, color: '#ffb74d', text: '较弱 · 建议加入大小写和符号' },
      { pct: 60, color: '#ffd54f', text: '中等 · 可继续加强' },
      { pct: 80, color: '#aed581', text: '较强 · 不错' },
      { pct: 100, color: '#66bb6a', text: '很强 · 优秀' }
    ];
    var level = levels[Math.min(score, 4)];
    els.strengthFill.style.width = level.pct + '%';
    els.strengthFill.style.background = level.color;
    els.strengthText.textContent = level.text;
    els.strengthText.style.color = level.color;
  }

  function tryUnlock() {
    var chk = checkCryptoReady();
    if (!chk.ok) {
      showToast('❌ ' + chk.msg);
      alert('加密库不可用：' + chk.msg);
      return;
    }

    var pwd = els.password.value;
    if (!pwd) { showToast('请输入密码'); return; }

    var data = readStorage();

    /* ============ 首次创建 ============ */
    if (!data) {
      if (pwd.length < 6) {
        showToast('首次创建密码至少 6 位');
        return;
      }
      try {
        var salt = generateSalt();
        var key = deriveKey(pwd, salt);
        var sentinel = encryptText(SENTINEL_TEXT, key);

        var firstId = genId();
        var firstNote = { id: firstId, title: '', content: '', updatedAt: Date.now() };

        var newData = {
          version: 2,
          salt: salt,
          sentinel: sentinel,
          notes: [{
            id: firstNote.id,
            title: encryptText('', key),
            content: encryptText('', key),
            updatedAt: firstNote.updatedAt
          }],
          createdAt: Date.now()
        };

        if (!writeStorage(newData)) return;

        state.password = pwd;
        state.masterKey = key;
        state.salt = salt;
        state.notes = [firstNote];
        state.activeId = firstNote.id;

        enterApp();
        showToast('✅ 已创建加密记事本');
        setTimeout(function () { els.noteTitle.focus(); }, 200);
      } catch (e) {
        console.error('[创建失败]', e);
        var errMsg = (e && e.message) || String(e);
        showToast('❌ 创建失败：' + errMsg);
        alert('创建失败：\n\n' + errMsg);
      }
      return;
    }

    /* ============ 解锁已有数据 ============ */
    try {
      var key2 = deriveKey(pwd, data.salt);
      var check = decryptText(data.sentinel, key2);
      if (check !== SENTINEL_TEXT) {
        showToast('❌ 密码错误');
        els.password.value = '';
        els.password.focus();
        return;
      }

      var notes = [];
      (data.notes || []).forEach(function (n) {
        notes.push({
          id: n.id,
          title: decryptText(n.title, key2),
          content: decryptText(n.content, key2),
          updatedAt: n.updatedAt || Date.now()
        });
      });

      var needAutoCreate = notes.length === 0;
      if (needAutoCreate) {
        notes.push({ id: genId(), title: '', content: '', updatedAt: Date.now() });
      }

      state.password = pwd;
      state.masterKey = key2;
      state.salt = data.salt;
      state.notes = notes;
      state.activeId = notes[0].id;

      if (needAutoCreate) saveAllToStorage();

      enterApp();
      showToast('✅ 已解锁');
    } catch (e) {
      console.error('[解锁失败]', e);
      showToast('❌ 解锁失败：' + ((e && e.message) || e));
    }
  }

  function enterApp() {
    els.lock.hidden = true;
    els.app.hidden = false;
    els.password.value = '';
    els.strengthBar.hidden = true;
    els.strengthText.hidden = true;

    try {
      renderNoteList();
      if (state.activeId) {
        loadNote(state.activeId);
      } else {
        els.empty.hidden = false;
        els.editor.hidden = true;
      }
      applyTheme();
      startAutoLockTimer();
      updateSettingsUI();
    } catch (e) {
      console.error('[进入应用失败]', e);
      showToast('❌ 进入应用出错：' + ((e && e.message) || e));
    }
  }

  function lockApp(silent) {
    try { if (state.dirty && state.activeId) saveCurrentNote(true); } catch (e) {}

    state.password = '';
    state.masterKey = null;
    state.notes = [];
    state.activeId = null;
    state.dirty = false;

    clearTimeout(autoSaveTimer);
    clearTimeout(autoLockTimer);

    els.app.hidden = true;
    els.lock.hidden = false;
    els.lockTitle.textContent = '解锁记事本';

    var data = readStorage();
    if (data && data.notes && data.notes.length > 0) {
      els.lockSubtitle.textContent = '已加密存储 ' + data.notes.length + ' 条笔记';
    } else {
      els.lockSubtitle.textContent = '';
    }

    if (!silent) showToast('🔒 已锁定');
    setTimeout(function () { els.password.focus(); }, 100);
  }

  /* ================= 笔记列表 ================= */
  function renderNoteList() {
    if (!els.noteList) return;
    var search = (els.search.value || '').trim().toLowerCase();
    var filtered = state.notes.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    if (search) {
      filtered = filtered.filter(function (n) {
        return (n.title || '').toLowerCase().indexOf(search) >= 0 ||
               (n.content || '').toLowerCase().indexOf(search) >= 0;
      });
    }

    els.noteCount.textContent = state.notes.length + ' 条笔记' +
      (search ? '（匹配 ' + filtered.length + '）' : '');

    if (filtered.length === 0) { els.noteList.innerHTML = ''; return; }

    var html = '';
    filtered.forEach(function (n) {
      var title = n.title || '无标题';
      var preview = (n.content || '').replace(/\s+/g, ' ').slice(0, 40);
      var active = n.id === state.activeId;
      html += '<div class="np-note-item' + (active ? ' active' : '') + '" data-id="' + n.id + '">' +
        '<button class="np-note-item-del" data-del-id="' + n.id + '" type="button" title="删除">✕</button>' +
        '<div class="np-note-item-title">' + escapeHtml(title) + '</div>' +
        '<div class="np-note-item-meta">' +
          '<span>' + formatDate(n.updatedAt) + '</span>' +
          '<span>' + (n.content ? n.content.length + ' 字' : '空') + '</span>' +
        '</div>' +
        (preview ? '<div class="np-note-item-preview">' + escapeHtml(preview) + '</div>' : '') +
        '</div>';
    });
    els.noteList.innerHTML = html;
  }

  function loadNote(id) {
    var note = state.notes.filter(function (n) { return n.id === id; })[0];
    if (!note) { els.empty.hidden = false; els.editor.hidden = true; return; }
    state.activeId = id;
    state.dirty = false;
    els.empty.hidden = true;
    els.editor.hidden = false;
    els.noteTitle.value = note.title || '';
    els.content.value = note.content || '';
    switchView('edit');
    updateStats();
    updateStatus('🔒 已解锁');
    renderNoteList();
  }

  function createNote() {
    try {
      if (state.dirty && state.activeId) saveCurrentNote(true);
      var newNote = { id: genId(), title: '', content: '', updatedAt: Date.now() };
      state.notes.push(newNote);
      state.activeId = newNote.id;
      renderNoteList();
      loadNote(newNote.id);
      saveAllToStorage();
      showToast('已新建笔记');
      setTimeout(function () { els.noteTitle.focus(); }, 100);
    } catch (e) {
      console.error('[新建失败]', e);
      showToast('❌ 新建失败：' + ((e && e.message) || e));
    }
  }

  function deleteNote(id) {
    var note = state.notes.filter(function (n) { return n.id === id; })[0];
    if (!note) return;
    if (!confirm('确定删除笔记「' + (note.title || '无标题') + '」？')) return;
    state.notes = state.notes.filter(function (n) { return n.id !== id; });
    if (state.activeId === id) {
      state.activeId = state.notes.length > 0 ? state.notes[0].id : null;
    }
    saveAllToStorage();
    renderNoteList();
    if (state.activeId) loadNote(state.activeId);
    else { els.empty.hidden = false; els.editor.hidden = true; }
    showToast('已删除笔记');
  }

  /* ================= 保存 ================= */
  function saveCurrentNote(silent) {
    if (!state.activeId || !state.masterKey) return;
    var note = state.notes.filter(function (n) { return n.id === state.activeId; })[0];
    if (!note) return;
    note.title = els.noteTitle.value;
    note.content = els.content.value;
    note.updatedAt = Date.now();
    saveAllToStorage();
    state.dirty = false;
    updateStatus(silent ? '🔒 已解锁' : '✅ 已保存并加密');
    if (!silent) {
      setTimeout(function () { if (!state.dirty) updateStatus('🔒 已解锁'); }, 1500);
    }
    renderNoteList();
  }

  function saveAllToStorage() {
    if (!state.masterKey) return;
    try {
      var data = readStorage() || { version: 2, salt: state.salt, sentinel: '', notes: [], createdAt: Date.now() };
      data.salt = state.salt;
      data.sentinel = data.sentinel || encryptText(SENTINEL_TEXT, state.masterKey);
      data.notes = state.notes.map(function (n) {
        return {
          id: n.id,
          title: encryptText(n.title || '', state.masterKey),
          content: encryptText(n.content || '', state.masterKey),
          updatedAt: n.updatedAt
        };
      });
      writeStorage(data);
    } catch (e) {
      console.error('[保存失败]', e);
      showToast('❌ 保存失败：' + ((e && e.message) || e));
    }
  }

  function updateStatus(text, isDirty) {
    els.status.textContent = text;
    els.status.classList.toggle('dirty', !!isDirty);
  }

  function updateStats() {
    var text = els.content.value;
    var chars = text.length;
    var lines = text === '' ? 0 : text.split('\n').length;
    var words = (text.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g) || []).length;
    els.stats.textContent = chars + ' 字符 · ' + lines + ' 行 · ' + words + ' 词';
  }

  function markDirty() {
    if (!state.dirty) { state.dirty = true; updateStatus('⚠️ 有未保存的更改', true); }
    updateStats();
    resetAutoLockTimer();
    if (state.settings.autoSave) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(function () {
        if (state.dirty) { saveCurrentNote(true); showToast('💾 自动保存'); }
      }, AUTOSAVE_DELAY);
    }
  }

  function switchView(mode) {
    state.viewMode = mode;
    if (mode === 'preview') {
      els.preview.innerHTML = renderMarkdown(els.content.value);
      els.preview.hidden = false;
      els.content.hidden = true;
      els.btnViewToggle.textContent = '✏️';
      els.btnViewToggle.title = '返回编辑';
    } else {
      els.preview.hidden = true;
      els.content.hidden = false;
      els.btnViewToggle.textContent = '👁';
      els.btnViewToggle.title = '预览';
    }
    els.btnViewToggle.classList.toggle('active', mode === 'preview');
  }

  function renderMarkdown(text) {
    var lines = text.split('\n');
    var html = [];
    var inCode = false, codeBuf = [], listType = null, listBuf = [];
    function flushList() {
      if (listBuf.length > 0) { html.push('<' + listType + '>' + listBuf.join('') + '</' + listType + '>'); listBuf = []; listType = null; }
    }
    function flushCode() {
      if (inCode) { html.push('<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>'); codeBuf = []; inCode = false; }
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^```/.test(line)) { if (inCode) flushCode(); else { flushList(); inCode = true; codeBuf = []; } continue; }
      if (inCode) { codeBuf.push(line); continue; }
      if (line.trim() === '') { flushList(); html.push('<p class="np-md-space"></p>'); continue; }
      var m = line.match(/^(#{1,6})\s+(.+)$/);
      if (m) { flushList(); var lv = m[1].length; html.push('<h' + lv + '>' + inlineMd(escapeHtml(m[2])) + '</h' + lv + '>'); continue; }
      if (/^---+$/.test(line.trim())) { flushList(); html.push('<hr>'); continue; }
      var bq = line.match(/^>\s?(.*)$/);
      if (bq) { flushList(); html.push('<blockquote>' + inlineMd(escapeHtml(bq[1])) + '</blockquote>'); continue; }
      var ulm = line.match(/^[\*\-+]\s+(.+)$/);
      if (ulm) { if (listType !== 'ul') { flushList(); listType = 'ul'; } listBuf.push('<li>' + inlineMd(escapeHtml(ulm[1])) + '</li>'); continue; }
      var olm = line.match(/^\d+\.\s+(.+)$/);
      if (olm) { if (listType !== 'ol') { flushList(); listType = 'ol'; } listBuf.push('<li>' + inlineMd(escapeHtml(olm[1])) + '</li>'); continue; }
      flushList();
      html.push('<p>' + inlineMd(escapeHtml(line)) + '</p>');
    }
    flushList(); flushCode();
    return html.join('\n');
  }
  function inlineMd(s) {
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }

  function applyTheme() {
    var isDark = state.settings.theme === 'dark';
    document.body.classList.toggle('theme-dark', isDark);
    if (els.btnTheme) els.btnTheme.textContent = isDark ? '☀️' : '🌙';
  }
  function updateSettingsUI() {
    if (els.setAutoSave) els.setAutoSave.checked = state.settings.autoSave;
    if (els.setAutoLock) els.setAutoLock.value = String(state.settings.autoLockMin);
  }

  function resetAutoLockTimer() {
    clearTimeout(autoLockTimer);
    if (!state.settings.autoLockMin || state.settings.autoLockMin <= 0) return;
    autoLockTimer = setTimeout(function () {
      if (els.app && !els.app.hidden) { lockApp(true); showToast('⏱ 闲置超时，已自动锁定'); }
    }, state.settings.autoLockMin * 60 * 1000);
  }
  function startAutoLockTimer() { resetAutoLockTimer(); }

  function copyText(text) {
    if (!text) { showToast('没有可复制内容'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { showToast('✅ 已复制'); })
        .catch(function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); showToast('✅ 已复制');
    } catch (e) { showToast('❌ 复制失败'); }
  }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 800);
  }

  function exportCurrentNote() {
    if (!state.activeId) return;
    var note = state.notes.filter(function (n) { return n.id === state.activeId; })[0];
    if (!note) return;
    var title = note.title || '无标题';
    downloadFile('# ' + title + '\n\n' + (note.content || ''), title + '.md', 'text/markdown');
    showToast('📤 已导出 .md');
  }

  function exportAllEncrypted() {
    var data = readStorage();
    if (!data) { showToast('没有数据可导出'); return; }
    var backup = {
      _meta: { app: 'secure-notepad', version: 2, exportedAt: new Date().toISOString(), noteCount: (data.notes || []).length },
      salt: data.salt, sentinel: data.sentinel, notes: data.notes
    };
    var d = new Date();
    var ts = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    downloadFile(JSON.stringify(backup, null, 2), 'notepad-backup-' + ts + '.json', 'application/json');
    showToast('📤 已导出加密备份');
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var backup = JSON.parse(e.target.result);
        if (!backup || !backup.salt || !backup.sentinel || !Array.isArray(backup.notes)) {
          showToast('❌ 备份文件格式无效'); return;
        }
        var backupKey = deriveKey(state.password, backup.salt);
        if (decryptText(backup.sentinel, backupKey) !== SENTINEL_TEXT) {
          showToast('❌ 备份密码与当前密码不一致'); return;
        }
        var count = 0;
        backup.notes.forEach(function (bn) {
          var title = decryptText(bn.title, backupKey);
          var content = decryptText(bn.content, backupKey);
          var exists = state.notes.some(function (n) { return n.title === title && n.content === content; });
          if (!exists) {
            state.notes.push({ id: genId(), title: title, content: content, updatedAt: bn.updatedAt || Date.now() });
            count++;
          }
        });
        saveAllToStorage();
        renderNoteList();
        showToast('✅ 已导入 ' + count + ' 条笔记');
      } catch (err) { showToast('❌ 导入失败：' + err.message); }
    };
    reader.readAsText(file);
  }

  function openChangePwd() {
    els.chpwdOld.value = ''; els.chpwdNew.value = ''; els.chpwdConfirm.value = '';
    els.chpwdModal.hidden = false; els.chpwdOld.focus();
  }
  function closeChangePwd() { els.chpwdModal.hidden = true; }

  function doChangePwd() {
    var oldPwd = els.chpwdOld.value, newPwd = els.chpwdNew.value, confirmPwd = els.chpwdConfirm.value;
    if (!oldPwd || !newPwd || !confirmPwd) { showToast('请填写所有字段'); return; }
    if (newPwd !== confirmPwd) { showToast('两次新密码不一致'); return; }
    if (newPwd.length < 6) { showToast('新密码至少 6 位'); return; }
    try {
      var data = readStorage();
      if (!data) { showToast('数据异常'); return; }
      var oldKey = deriveKey(oldPwd, data.salt);
      if (decryptText(data.sentinel, oldKey) !== SENTINEL_TEXT) { showToast('❌ 当前密码错误'); return; }
      var newSalt = generateSalt();
      var newKey = deriveKey(newPwd, newSalt);
      state.masterKey = newKey;
      state.salt = newSalt;
      state.password = newPwd;
      writeStorage({
        version: 2, salt: newSalt,
        sentinel: encryptText(SENTINEL_TEXT, newKey),
        notes: state.notes.map(function (n) {
          return { id: n.id, title: encryptText(n.title || '', newKey), content: encryptText(n.content || '', newKey), updatedAt: n.updatedAt };
        }),
        createdAt: data.createdAt || Date.now(), pwdChangedAt: Date.now()
      });
      closeChangePwd();
      showToast('✅ 主密码已更新');
    } catch (e) {
      console.error('[改密码失败]', e);
      showToast('❌ 修改失败：' + ((e && e.message) || e));
    }
  }

  function clearAll() {
    if (!confirm('⚠️ 确定清空所有数据？所有笔记将永久删除，不可恢复！')) return;
    if (!confirm('再次确认：真的要清空吗？')) return;
    localStorage.removeItem(STORAGE_KEY);
    lockApp(true);
    showToast('🗑 已清空所有数据');
    els.lockSubtitle.textContent = '';
  }

  function openSettings() {
    els.settingsBackdrop.hidden = false;
    els.settingsDrawer.classList.add('open');
  }
  function closeSettings() {
    els.settingsBackdrop.hidden = true;
    els.settingsDrawer.classList.remove('open');
  }

  function bindEvents() {
    els.btnUnlock.addEventListener('click', tryUnlock);
    els.password.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
    els.password.addEventListener('input', function () { if (!readStorage()) updatePasswordStrength(); });
    els.btnPwdToggle.addEventListener('click', function () {
      var t = els.password.type === 'password' ? 'text' : 'password';
      els.password.type = t;
      els.btnPwdToggle.textContent = t === 'password' ? '👁' : '🙈';
    });

    els.btnNewNote.addEventListener('click', createNote);
    els.search.addEventListener('input', renderNoteList);

    els.noteList.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del-id]');
      if (del) { e.stopPropagation(); deleteNote(del.dataset.delId); return; }
      var item = e.target.closest('.np-note-item');
      if (!item) return;
      if (state.dirty && state.activeId) saveCurrentNote(true);
      loadNote(item.dataset.id);
      if (window.innerWidth <= 720) els.sidebar.classList.remove('open');
    });

    els.noteTitle.addEventListener('input', markDirty);
    els.content.addEventListener('input', function () {
      markDirty();
      if (state.viewMode === 'preview') switchView('edit');
    });

    els.btnSaveNote.addEventListener('click', function () { saveCurrentNote(false); showToast('💾 已保存并加密'); });
    els.btnViewToggle.addEventListener('click', function () { switchView(state.viewMode === 'edit' ? 'preview' : 'edit'); });
    els.btnCopyNote.addEventListener('click', function () { copyText(els.content.value); });
    els.btnExportNote.addEventListener('click', exportCurrentNote);

    els.btnLock.addEventListener('click', function () { lockApp(); });
    els.btnTheme.addEventListener('click', function () {
      state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
      saveSettings(); applyTheme();
    });
    els.btnSettings.addEventListener('click', openSettings);
    els.btnSidebarToggle.addEventListener('click', function () { els.sidebar.classList.toggle('open'); });

    els.btnSettingsClose.addEventListener('click', closeSettings);
    els.settingsBackdrop.addEventListener('click', closeSettings);

    els.setAutoSave.addEventListener('change', function () {
      state.settings.autoSave = this.checked; saveSettings();
      showToast(this.checked ? '✅ 自动保存已开启' : '自动保存已关闭');
    });
    els.setAutoLock.addEventListener('change', function () {
      state.settings.autoLockMin = parseInt(this.value, 10) || 0;
      saveSettings(); resetAutoLockTimer();
      showToast(this.value === '0' ? '已关闭自动锁定' : '闲置 ' + this.value + ' 分钟自动锁定');
    });

    els.btnChangePwd.addEventListener('click', openChangePwd);
    els.chpwdCancel.addEventListener('click', closeChangePwd);
    els.chpwdConfirmBtn.addEventListener('click', doChangePwd);
    els.chpwdModal.addEventListener('click', function (e) { if (e.target === els.chpwdModal) closeChangePwd(); });

    els.btnExportAll.addEventListener('click', exportAllEncrypted);
    els.btnImportBackup.addEventListener('click', function () { els.importFile.click(); });
    els.importFile.addEventListener('change', function () {
      if (this.files && this.files[0]) { importBackup(this.files[0]); this.value = ''; }
    });
    els.btnClearAll.addEventListener('click', clearAll);

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!els.app.hidden && state.activeId) { saveCurrentNote(false); showToast('💾 已保存'); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); if (!els.app.hidden) lockApp(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); if (!els.app.hidden) createNote(); }
      if (e.key === 'Escape') {
        if (!els.chpwdModal.hidden) closeChangePwd();
        else if (els.settingsDrawer.classList.contains('open')) closeSettings();
      }
    });

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(function (evt) {
      document.addEventListener(evt, function () { if (!els.app.hidden) resetAutoLockTimer(); }, { passive: true });
    });

    window.addEventListener('beforeunload', function (e) {
      if (state.dirty && state.settings.autoSave === false) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  function init() {
    cacheEls();
    var chk = checkCryptoReady();
    if (!chk.ok) {
      document.querySelector('main').innerHTML =
        '<div style="padding:60px 20px;text-align:center;">' +
        '<div style="font-size:3rem;margin-bottom:16px;">⚠️</div>' +
        '<h2 style="color:#b3261e;margin:0 0 12px;">加密库加载失败</h2>' +
        '<p style="color:#6b5d47;line-height:1.8;max-width:600px;margin:0 auto;">' +
        escapeHtml(chk.msg) + '</p></div>';
      console.error('[Notepad] CryptoJS 不可用:', chk.msg);
      return;
    }
    loadSettings();
    applyTheme();
    var data = readStorage();
    if (data && data.notes && data.notes.length > 0) {
      els.lockTitle.textContent = '解锁记事本';
      els.lockSubtitle.textContent = '已加密存储 ' + data.notes.length + ' 条笔记';
      els.btnUnlock.textContent = '🔓 解锁';
    } else if (data) {
      els.lockTitle.textContent = '解锁记事本';
      els.lockSubtitle.textContent = '已有加密数据';
      els.btnUnlock.textContent = '🔓 解锁';
    } else {
      els.lockTitle.textContent = '创建加密记事本';
      els.lockSubtitle.textContent = '首次使用，请设置一个主密码（≥ 6 位）';
      els.btnUnlock.textContent = '✨ 创建';
    }
    bindEvents();
    setTimeout(function () { els.password.focus(); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();