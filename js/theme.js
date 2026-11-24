/* ============================================================
   theme.js —— 全站通用主题切换（所有工具共用一份）
   用法：在工具 index.html 末尾（</body> 前）引用一次
        <script src="../../js/theme.js"></script>
   并在 header 里放一个按钮（id 必须是 btn-theme，内部留空）：
        <div class="theme-actions">
          <button class="cs-icon-btn" id="btn-theme" type="button" title="切换主题"></button>
        </div>

   特性：
     · 单按钮保证：页面若存在多个 #btn-theme，只保留第一个、其余移出文档，
       彻底避免“出现两个月亮”和两套图标规则打架；
     · 图标不反转：图标完全交给 theme.css 的 ::before（浅色🌙/深色☀️），
       JS 只负责 body.theme-dark 这个 class，不改按钮文字，语义一致；
     · 跟随系统：从没手动切过的访客，自动按系统“深色/浅色”偏好显示；
     · 手动优先：一旦点过按钮，就以用户选择为准，不再被系统覆盖；
     · 自动记忆：localStorage 记住手动选择，刷新/下次打开保持；
     · 不冲突：只认 id="btn-theme"，不碰你的 ⭐/📜 等其它按钮。

   扩展：想在月亮旁加“中英切换”等按钮，只需往 .theme-actions 里加一个
        <button>即可自动横向排列，本文件和 theme.css 都不用改。
   ============================================================ */
(function () {
  'use strict';

  var THEME_KEY = 'site_theme_v1';  // 全站共用记忆键；想按工具分开可改 'site_theme_' + location.pathname

  function getSaved() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function setSaved(t) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function effectiveTheme() {
    var s = getSaved();
    if (s === 'dark' || s === 'light') return s;
    return systemPrefersDark() ? 'dark' : 'light';
  }

  /* ---- 关键修复：一个页面只保留一个 #btn-theme ---- */
  function dedupeButtons() {
    var btns = document.querySelectorAll('#btn-theme');
    for (var i = 1; i < btns.length; i++) {
      var b = btns[i];
      // 若是被包在独立容器里的多余按钮，连同空容器一起移除
      var parent = b.parentNode;
      if (parent && parent !== document.body && /^theme-actions|cs-top-actions$/i.test(parent.className || '')) {
        if (!parent.querySelector('button:not(#btn-theme)') && parent.children.length <= 1) {
          if (parent.parentNode) parent.parentNode.removeChild(parent);
        } else if (parent.parentNode) {
          parent.removeChild(b);
        }
      } else if (parent && parent.parentNode) {
        parent.parentNode.removeChild(b);
      }
    }
    var keep = document.querySelector('#btn-theme');
    // 彻底清空保留按钮里的文本/子节点，杜绝“按钮文本emoji + CSS图标”两个月亮
    if (keep) { keep.textContent = ''; }
    return keep;
  }

  function applyTheme() {
    var t = effectiveTheme();
    document.body.classList.toggle('theme-dark', t === 'dark');
    var btn = document.querySelector('#btn-theme');
    if (btn) {
      var tip = t === 'dark' ? '切换到浅色' : '切换到深色';
      btn.setAttribute('title', tip);
      btn.setAttribute('aria-label', tip);
      btn.setAttribute('data-theme', t);   // 供自定义样式钩子使用
    }
  }

  function toggleTheme() {
    setSaved(effectiveTheme() === 'dark' ? 'light' : 'dark');
    applyTheme();
  }

  var bound = false;
  function bind() {
    var btn = dedupeButtons();     // 先去重，再绑定，保证只绑一个
    if (btn && !bound) {
      bound = true;
      btn.addEventListener('click', toggleTheme);
    }
    applyTheme();
  }

  /* 系统主题变化时：仅当没手动选过才自动跟随 */
  function onSystemChange() {
    var s = getSaved();
    if (s === 'dark' || s === 'light') return;
    applyTheme();
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
  // 防御：部分工具动态渲染 header，晚一拍再兜一次去重
  if (document.readyState !== 'loading') setTimeout(bind, 0);

  window.toggleTheme = toggleTheme;   // 暴露给自定义控件调用
})();
