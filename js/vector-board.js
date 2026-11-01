(function () {
  // 初始化 Fabric 画布
  var canvas = new fabric.Canvas('c', {
    width: document.querySelector('.vb-canvas-wrap').clientWidth,
    height: document.querySelector('.vb-canvas-wrap').clientHeight,
    backgroundColor: '#ffffff'
  });

  // 添加矩形
  document.getElementById('btn-rect').addEventListener('click', function () {
    var rect = new fabric.Rect({
      left: 100, top: 100, fill: '#7ba05b', width: 120, height: 80, rx: 10, ry: 10
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  });

  // 添加圆形
  document.getElementById('btn-circle').addEventListener('click', function () {
    var circle = new fabric.Circle({
      left: 150, top: 150, fill: '#4a90e2', radius: 60
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  });

  // 添加文字
  document.getElementById('btn-text').addEventListener('click', function () {
    var text = new fabric.IText('双击编辑文字', {
      left: 200, top: 200, fontFamily: 'sans-serif', fontSize: 24, fill: '#3d3226'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  });

  // 删除选中
  document.getElementById('btn-delete').addEventListener('click', function () {
    var activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach(function (obj) { canvas.remove(obj); });
    }
  });

  // 键盘删除支持
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        document.getElementById('btn-delete').click();
      }
    }
  });

  // 导出图片
  document.getElementById('btn-export').addEventListener('click', function () {
    var dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = 'vector_board_' + Date.now() + '.png';
    a.click();
  });

  // 响应式调整
  window.addEventListener('resize', function () {
    var wrap = document.querySelector('.vb-canvas-wrap');
    canvas.setWidth(wrap.clientWidth);
    canvas.setHeight(wrap.clientHeight);
  });
})();