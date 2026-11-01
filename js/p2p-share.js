(function () {
  var peer = null;
  var conn = null;
  var isHost = false;

  var myIdEl = document.getElementById('my-id');
  var statusEl = document.getElementById('conn-status');
  var btnCreate = document.getElementById('btn-create');
  var btnConnect = document.getElementById('btn-connect');
  var targetIdInput = document.getElementById('p2p-target-id');
  var transferArea = document.getElementById('transfer-area');
  var chatBox = document.getElementById('chat-box');
  var chatInput = document.getElementById('chat-input');
  var btnChat = document.getElementById('btn-chat');
  var dropZone = document.getElementById('p2p-drop');
  var fileInput = document.getElementById('p2p-file');

  // ================= 1. 建立连接 =================
  function initPeer(id) {
    peer = new Peer(id, { debug: 2 });

    peer.on('open', function (myId) {
      myIdEl.textContent = myId;
      myIdEl.style.color = '#2563eb';
      statusEl.textContent = '等待对方连接...';
      statusEl.style.color = '#8a5a2b';
    });

    peer.on('connection', function (c) {
      if (conn && conn.open) return c.close();
      conn = c;
      setupConnection();
    });

    peer.on('error', function (err) {
      alert('连接出错: ' + err.type);
      console.error(err);
    });
  }

  btnCreate.addEventListener('click', function () {
    isHost = true;
    // 生成一个短的 ID 供人连接
    var randomId = 'p2p-' + Math.random().toString(36).substr(2, 6);
    initPeer(randomId);
    btnCreate.disabled = true;
  });

  btnConnect.addEventListener('click', function () {
    var targetId = targetIdInput.value.trim();
    if (!targetId) return alert('请输入对方 ID');
    
    isHost = false;
    if (!peer) initPeer(); // 如果客户端没初始化，先初始化

    peer.on('open', function() {
      conn = peer.connect(targetId);
      setupConnection();
    });
  });

  function setupConnection() {
    conn.on('open', function () {
      statusEl.textContent = '✅ 已连接';
      statusEl.style.color = '#7ba05b';
      transferArea.style.display = 'block';
      chatInput.disabled = false;
      btnChat.disabled = false;
      addSystemMsg('✅ 点对点加密隧道已建立，可以开始聊天或传文件了！');
    });

    conn.on('data', function (data) {
      if (typeof data === 'string') {
        // 收到文本
        addMsg(data, 'other');
      } else {
        // 收到二进制文件
        var blob = new Blob([data.file]);
        var url = URL.createObjectURL(blob);
        addFileMsg(data.name, url, 'other');
      }
    });

    conn.on('close', function () {
      statusEl.textContent = '❌ 连接已断开';
      statusEl.style.color = '#a8452a';
      chatInput.disabled = true; btnChat.disabled = true;
      transferArea.style.display = 'none';
      addSystemMsg('对方已断开连接。');
    });
  }

  // ================= 2. 文字聊天 =================
  function sendMessage() {
    var text = chatInput.value.trim();
    if (!text || !conn || !conn.open) return;
    conn.send(text);
    addMsg(text, 'self');
    chatInput.value = '';
  }

  btnChat.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });

  function addMsg(text, type) {
    var div = document.createElement('div');
    div.className = 'p2p-msg ' + type;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  
  function addFileMsg(name, url, type) {
    var div = document.createElement('div');
    div.className = 'p2p-msg ' + type;
    div.innerHTML = '📁 收到文件: <a href="' + url + '" download="' + name + '">' + name + ' (点击下载)</a>';
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addSystemMsg(text) {
    var div = document.createElement('div');
    div.className = 'p2p-msg system';
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // ================= 3. 文件传输 =================
  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() { if (this.files.length > 0) sendFile(this.files[0]); });
  
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); this.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function(e) { e.preventDefault(); this.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault(); this.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) sendFile(e.dataTransfer.files[0]);
  });

  function sendFile(file) {
    if (!conn || !conn.open) return alert('尚未连接');
    if (file.size > 50 * 1024 * 1024) return alert('演示版限制单文件 50MB 以内（WebRTC 内存限制）');

    var reader = new FileReader();
    reader.onload = function(e) {
      var buffer = e.target.result;
      // PeerJS 直接传 ArrayBuffer
      conn.send({ name: file.name, file: buffer });
      
      var url = URL.createObjectURL(file);
      addFileMsg(file.name, url, 'self');
    };
    reader.readAsArrayBuffer(file);
  }

})();