(function () {
  var tabs = document.querySelectorAll('.cs-tab');
  var panels = document.querySelectorAll('.cs-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // 1. Box Shadow
  function updateShadow() {
    var x = document.getElementById('sh-x').value;
    var y = document.getElementById('sh-y').value;
    var blur = document.getElementById('sh-blur').value;
    var spread = document.getElementById('sh-spread').value;
    var color = document.getElementById('sh-color').value;
    var opacity = document.getElementById('sh-opacity').value;

    document.getElementById('val-sh-x').textContent = x + 'px';
    document.getElementById('val-sh-y').textContent = y + 'px';
    document.getElementById('val-sh-blur').textContent = blur + 'px';
    document.getElementById('val-sh-spread').textContent = spread + 'px';

    // 转换颜色为 RGBA
    var r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
    var rgba = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';

    var code = 'box-shadow: ' + x + 'px ' + y + 'px ' + blur + 'px ' + spread + 'px ' + rgba + ';';
    document.getElementById('preview-shadow').style.boxShadow = code.replace('box-shadow: ', '').replace(';', '');
    document.getElementById('code-shadow').value = code;
  }

  ['sh-x', 'sh-y', 'sh-blur', 'sh-spread', 'sh-color', 'sh-opacity'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateShadow);
  });
  updateShadow();

  // 2. Border Radius
  function updateRadius() {
    var val = document.getElementById('rd-all').value;
    document.getElementById('val-rd-all').textContent = val + 'px';
    var code = 'border-radius: ' + val + 'px;';
    document.getElementById('preview-radius').style.borderRadius = val + 'px';
    document.getElementById('code-radius').value = code;
  }
  document.getElementById('rd-all').addEventListener('input', updateRadius);
  updateRadius();

  // 3. Gradient
  function updateGradient() {
    var angle = document.getElementById('gr-angle').value;
    var c1 = document.getElementById('gr-c1').value;
    var c2 = document.getElementById('gr-c2').value;
    
    document.getElementById('val-gr-angle').textContent = angle + 'deg';
    
    var code = 'background: linear-gradient(' + angle + 'deg, ' + c1 + ', ' + c2 + ');';
    document.getElementById('preview-gradient').style.background = 'linear-gradient(' + angle + 'deg, ' + c1 + ', ' + c2 + ')';
    document.getElementById('code-gradient').value = code;
  }
  ['gr-angle', 'gr-c1', 'gr-c2'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateGradient);
  });
  updateGradient();
})();