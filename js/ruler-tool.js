(function () {
  var gridToggle = document.getElementById('rl-grid-toggle');
  var gridSize = document.getElementById('rl-grid-size');
  var rulerToggle = document.getElementById('rl-ruler-toggle');
  
  var preview = document.getElementById('rl-preview-area');
  var posText = document.getElementById('rl-pos');
  var colorCircle = document.getElementById('rl-color');
  var hexText = document.getElementById('rl-hex');

  // 动态添加十字辅助线元素
  var lineX = document.createElement('div');
  lineX.className = 'rl-ruler-x';
  var lineY = document.createElement('div');
  lineY.className = 'rl-ruler-y';
  document.body.appendChild(lineX);
  document.body.appendChild(lineY);

  // 1. 网格控制
  function updateGrid() {
    if (gridToggle.checked) {
      document.body.classList.remove('no-grid');
      var size = parseInt(gridSize.value) || 20;
      document.documentElement.style.setProperty('--grid-size', size + 'px');
    } else {
      document.body.classList.add('no-grid');
    }
  }

  gridToggle.addEventListener('change', updateGrid);
  gridSize.addEventListener('input', updateGrid);
  updateGrid();

  // 2. 标尺控制
  rulerToggle.addEventListener('change', function () {
    if (this.checked) document.body.classList.add('show-ruler');
    else document.body.classList.remove('show-ruler');
  });
  if (rulerToggle.checked) document.body.classList.add('show-ruler');

  // 3. 鼠标跟随与坐标显示
  document.addEventListener('mousemove', function (e) {
    // 更新坐标文字
    posText.textContent = 'X: ' + e.clientX + ', Y: ' + e.clientY;
    
    // 更新十字辅助线
    lineX.style.left = e.clientX + 'px';
    lineY.style.top = e.clientY + 'px';
  });

  // 监听在 Preview 区域取色
  preview.addEventListener('mousemove', function (e) {
    var rect = preview.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    // 简单演示：通过判断位置模拟一个颜色变化（不做真实的 Canvas 像素读取，因为这只是一个区域）
    // 如果有实际取色需求，可以使用 EyeDropper API
  });

  // 4. 吸管取色 (EyeDropper API)
  var btnEyedropper = document.getElementById('btn-eyedropper');
  
  if ('EyeDropper' in window) {
    btnEyedropper.addEventListener('click', async function () {
      try {
        var eyeDropper = new EyeDropper();
        var result = await eyeDropper.open();
        // result.sRGBHex 类似 "#7BA05B"
        colorCircle.style.background = result.sRGBHex;
        hexText.textContent = result.sRGBHex.toUpperCase();
      } catch (e) {
        console.log('用户取消了取色');
      }
    });
  } else {
    btnEyedropper.textContent = '⚠️ 浏览器不支持吸管';
    btnEyedropper.disabled = true;
    btnEyedropper.style.opacity = '0.5';
    btnEyedropper.style.cursor = 'not-allowed';
  }

})();