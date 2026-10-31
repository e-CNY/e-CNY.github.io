(function () {
  var lockScreen = document.getElementById('np-lock');
  var editorScreen = document.getElementById('np-editor');
  var pwdInput = document.getElementById('np-password');
  var btnUnlock = document.getElementById('btn-unlock');
  var btnLock = document.getElementById('btn-lock');
  var btnSave = document.getElementById('btn-save');
  var textarea = document.getElementById('np-content');
  var statusText = document.getElementById('np-status');

  var STORAGE_KEY = 'secure_notepad_data';
  var currentPassword = '';
  var hasUnsavedChanges = false;

  // 解锁或初始化
  btnUnlock.addEventListener('click', function () {
    var pwd = pwdInput.value.trim();
    if (!pwd) return alert('密码不能为空');
    
    currentPassword = pwd;
    var encryptedData = localStorage.getItem(STORAGE_KEY);

    if (encryptedData) {
      // 解密验证密码
      try {
        var decryptedBytes = CryptoJS.AES.decrypt(encryptedData, currentPassword);
        var decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedText && encryptedData !== '') {
          throw new Error('密码错误');
        }
        textarea.value = decryptedText;
      } catch (e) {
        alert('密码错误，无法解密数据！');
        pwdInput.value = '';
        return;
      }
    } else {
      // 首次创建
      textarea.value = '';
    }

    lockScreen.style.display = 'none';
    editorScreen.style.display = 'block';
    statusText.textContent = '🔒 已解密';
    statusText.style.color = '#7ba05b';
    pwdInput.value = '';
  });

  // 允许回车解锁
  pwdInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') btnUnlock.click();
  });

  // 实时标脏
  textarea.addEventListener('input', function () {
    if (!hasUnsavedChanges) {
      hasUnsavedChanges = true;
      statusText.textContent = '⚠️ 有未保存的更改';
      statusText.style.color = '#a8452a';
    }
  });

  // 保存并加密
  btnSave.addEventListener('click', function () {
    if (!currentPassword) return;
    var text = textarea.value;
    
    if (!text) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      // AES 加密并存入 localStorage
      var encrypted = CryptoJS.AES.encrypt(text, currentPassword).toString();
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
    
    hasUnsavedChanges = false;
    statusText.textContent = '✅ 已保存并加密';
    statusText.style.color = '#7ba05b';
    
    // 恢复状态文字
    setTimeout(function() {
      statusText.textContent = '🔒 已加密';
    }, 2000);
  });

  // 锁定
  btnLock.addEventListener('click', function () {
    if (hasUnsavedChanges) {
      if (!confirm('有未保存的更改，确定要锁定吗？更改将丢失。')) return;
    }
    currentPassword = '';
    textarea.value = '';
    hasUnsavedChanges = false;
    editorScreen.style.display = 'none';
    lockScreen.style.display = 'block';
  });

  // 防止意外关闭页面导致数据丢失
  window.addEventListener('beforeunload', function (e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '您有未保存的更改，确定要离开吗？';
    }
  });

})();