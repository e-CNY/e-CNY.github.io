(function () {
  var btnConnect = document.getElementById('btn-connect');
  var btnDisconnect = document.getElementById('btn-disconnect');
  var btnSend = document.getElementById('btn-send');
  var baudSelect = document.getElementById('se-baudrate');
  var sendInput = document.getElementById('se-send-input');
  var terminal = document.getElementById('se-terminal');

  var port = null;
  var reader = null;
  var keepReading = true;

  function log(text, type) {
    var span = document.createElement('span');
    span.className = type || '';
    span.textContent = text + '\n';
    terminal.appendChild(span);
    terminal.scrollTop = terminal.scrollHeight;
  }

  if (!('serial' in navigator)) {
    btnConnect.textContent = '❌ 浏览器不支持串口';
    btnConnect.disabled = true;
    log('当前浏览器不支持 Web Serial API，请使用桌面版 Chrome 或 Edge。', 'sys');
    return;
  }

  btnConnect.addEventListener('click', async function () {
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: parseInt(baudSelect.value, 10) });
      
      btnConnect.disabled = true;
      btnDisconnect.disabled = false;
      btnSend.disabled = false;
      log('✅ 串口已连接。', 'sys');
      
      readLoop();
    } catch (err) {
      log('❌ 连接失败: ' + err.message, 'sys');
    }
  });

  async function readLoop() {
    var decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable).catch(function(){});
    reader = decoder.readable.getReader();
    
    try {
      while (keepReading) {
        var result = await reader.read();
        if (result.done) break;
        if (result.value) log('RX: ' + result.value, 'rx');
      }
    } catch (err) {
      // 忽略断开时的异常
    } finally {
      reader.releaseLock();
    }
  }

  btnDisconnect.addEventListener('click', async function () {
    keepReading = false;
    if (reader) await reader.cancel();
    if (port) await port.close();
    port = null;
    btnConnect.disabled = false;
    btnDisconnect.disabled = true;
    btnSend.disabled = true;
    log('🔌 串口已断开。', 'sys');
  });

  btnSend.addEventListener('click', async function () {
    var text = sendInput.value;
    if (!text || !port) return;
    
    var encoder = new TextEncoder();
    var writer = port.writable.getWriter();
    await writer.write(encoder.encode(text + '\n'));
    writer.releaseLock();
    
    log('TX: ' + text, 'tx');
    sendInput.value = '';
  });

  sendInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') btnSend.click();
  });
})();