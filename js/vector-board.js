(function () {
  var wrap = document.getElementById('canvas-wrap');
  
  // 初始化时，让画布稍微比容器小一点点，留出边距
  function getCanvasSize() {
    return {
      width: wrap.clientWidth - 32,
      height: wrap.clientHeight - 32
    };
  }

  var size = getCanvasSize();
  var canvas = new fabric.Canvas('c', {
    width: size.width,
    height: size.height,
    backgroundColor: '#ffffff'
  });

  // 默认画笔设置
  canvas.freeDrawingBrush.color = '#3d3226';
  canvas.freeDrawingBrush.width = 3;

  // 1. 图形与画笔
  document.getElementById('btn-pen').addEventListener('click', function () {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    this.classList.toggle('active', canvas.isDrawingMode);
  });

  document.getElementById('btn-rect').addEventListener('click', function () {
    canvas.isDrawingMode = false;
    document.getElementById('btn-pen').classList.remove('active');
    var rect = new fabric.Rect({ left: 100, top: 100, fill: '#7ba05b', width: 100, height: 80, rx: 8, ry: 8 });
    canvas.add(rect); canvas.setActiveObject(rect);
  });

  document.getElementById('btn-circle').addEventListener('click', function () {
    canvas.isDrawingMode = false;
    document.getElementById('btn-pen').classList.remove('active');
    var circle = new fabric.Circle({ left: 150, top: 150, fill: '#4a90e2', radius: 50 });
    canvas.add(circle); canvas.setActiveObject(circle);
  });

  document.getElementById('btn-triangle').addEventListener('click', function () {
    canvas.isDrawingMode = false;
    document.getElementById('btn-pen').classList.remove('active');
    var tri = new fabric.Triangle({ left: 200, top: 200, fill: '#c99a4b', width: 80, height: 80 });
    canvas.add(tri); canvas.setActiveObject(tri);
  });

  document.getElementById('btn-line').addEventListener('click', function () {
    canvas.isDrawingMode = false;
    document.getElementById('btn-pen').classList.remove('active');
    var line = new fabric.Line([50, 50, 200, 200], { stroke: '#a8452a', strokeWidth: 3 });
    canvas.add(line); canvas.setActiveObject(line);
  });

  document.getElementById('btn-text').addEventListener('click', function () {
    canvas.isDrawingMode = false;
    document.getElementById('btn-pen').classList.remove('active');
    var text = new fabric.IText('双击编辑文字', { left: 250, top: 250, fontFamily: 'sans-serif', fontSize: 24, fill: '#3d3226' });
    canvas.add(text); canvas.setActiveObject(text);
  });

  // 2. 插入图片
  document.getElementById('image-input').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (f) {
      fabric.Image.fromURL(f.target.result, function (img) {
        img.scaleToWidth(200);
        canvas.add(img);
        canvas.setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // 3. 背景色切换
  document.getElementById('btn-bg').addEventListener('click', function () {
    var colors = ['#ffffff', '#f9f3e3', '#2d3748', '#000000'];
    var current = canvas.backgroundColor;
    var idx = colors.indexOf(current);
    var next = colors[(idx + 1) % colors.length];
    canvas.setBackgroundColor(next, canvas.renderAll.bind(canvas));
  });

  // 4. 全屏控制
  document.getElementById('btn-fullscreen').addEventListener('click', function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function(err) {
        alert('无法进入全屏: ' + err.message);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // 5. 删除与导出
  document.getElementById('btn-delete').addEventListener('click', function () {
    var activeObjs = canvas.getActiveObjects();
    if (activeObjs.length) {
      canvas.discardActiveObject();
      activeObjs.forEach(function (obj) { canvas.remove(obj); });
    }
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        document.getElementById('btn-delete').click();
      }
    }
  });

  document.getElementById('btn-export').addEventListener('click', function () {
    var dataURL = canvas.toDataURL({ format: 'png', multiplier: 2 });
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = 'vector_board_' + Date.now() + '.png';
    a.click();
  });

  // 6. 窗口大小或全屏状态改变时，画布自适应
  window.addEventListener('resize', function () {
    var newSize = getCanvasSize();
    canvas.setWidth(newSize.width);
    canvas.setHeight(newSize.height);
    canvas.calcOffset(); // 重新计算鼠标偏移量，防止点击错位
  });
})();