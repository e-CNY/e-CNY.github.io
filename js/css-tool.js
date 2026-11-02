(function () {
  // 1. Tab 切换
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

  // 2. 统一复制功能
  document.querySelectorAll('.cs-copy-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var targetId = this.dataset.target;
      var text = document.getElementById(targetId).value;
      
      navigator.clipboard.writeText(text).then(function() {
        var original = btn.textContent;
        btn.textContent = '✅';
        btn.style.background = '#dcfce7';
        setTimeout(function() {
          btn.textContent = original;
          btn.style.background = '#fdf8ec';
        }, 1500);
      }).catch(function() {
        alert('复制失败，请手动选中复制');
      });
    });
  });

  // 3. 阴影 (Box Shadow)
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

  // 4. 圆角 (Border Radius)
  function updateRadius() {
    var val = document.getElementById('rd-all').value;
    document.getElementById('val-rd-all').textContent = val + 'px';
    document.getElementById('preview-radius').style.borderRadius = val + 'px';
    document.getElementById('code-radius').value = 'border-radius: ' + val + 'px;';
  }
  document.getElementById('rd-all').addEventListener('input', updateRadius);
  updateRadius();

  // 5. 渐变 (Gradient)
  function updateGradient() {
    var angle = document.getElementById('gr-angle').value;
    var c1 = document.getElementById('gr-c1').value;
    var c2 = document.getElementById('gr-c2').value;
    document.getElementById('val-gr-angle').textContent = angle + 'deg';
    
    var bg = 'linear-gradient(' + angle + 'deg, ' + c1 + ', ' + c2 + ')';
    document.getElementById('preview-gradient').style.background = bg;
    document.getElementById('code-gradient').value = 'background: ' + bg + ';';
  }
  ['gr-angle', 'gr-c1', 'gr-c2'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateGradient);
  });
  updateGradient();

  // 6. 毛玻璃 (Glassmorphism)
  function updateGlass() {
    var blur = document.getElementById('gl-blur').value;
    var opacity = document.getElementById('gl-opacity').value;
    var border = document.getElementById('gl-border').value;
    
    document.getElementById('val-gl-blur').textContent = blur + 'px';
    document.getElementById('val-gl-opacity').textContent = opacity;
    document.getElementById('val-gl-border').textContent = border;

    var preview = document.getElementById('preview-glass');
    preview.style.backdropFilter = 'blur(' + blur + 'px)';
    preview.style.webkitBackdropFilter = 'blur(' + blur + 'px)';
    preview.style.background = 'rgba(255, 255, 255, ' + opacity + ')';
    preview.style.border = '1px solid rgba(255, 255, 255, ' + border + ')';

    var code = 'background: rgba(255, 255, 255, ' + opacity + ');\n' +
               'backdrop-filter: blur(' + blur + 'px);\n' +
               '-webkit-backdrop-filter: blur(' + blur + 'px);\n' +
               'border: 1px solid rgba(255, 255, 255, ' + border + ');';
    document.getElementById('code-glass').value = code;
  }
  ['gl-blur', 'gl-opacity', 'gl-border'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateGlass);
  });
  updateGlass();

  // 7. 滤镜 (Filter)
  function updateFilter() {
    var blur = document.getElementById('ft-blur').value;
    var gray = document.getElementById('ft-gray').value;
    var bright = document.getElementById('ft-bright').value;
    var contrast = document.getElementById('ft-contrast').value;

    document.getElementById('val-ft-blur').textContent = blur + 'px';
    document.getElementById('val-ft-gray').textContent = gray + '%';
    document.getElementById('val-ft-bright').textContent = bright + '%';
    document.getElementById('val-ft-contrast').textContent = contrast + '%';

    var filterStr = 'blur(' + blur + 'px) grayscale(' + gray + '%) brightness(' + bright + '%) contrast(' + contrast + '%)';
    document.getElementById('preview-filter').style.filter = filterStr;
    document.getElementById('code-filter').value = 'filter: ' + filterStr + ';';
  }
  ['ft-blur', 'ft-gray', 'ft-bright', 'ft-contrast'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateFilter);
  });
  updateFilter();

  // 8. 变换 (Transform)
  function updateTransform() {
    var x = document.getElementById('tf-x').value;
    var y = document.getElementById('tf-y').value;
    var rot = document.getElementById('tf-rotate').value;
    var scale = document.getElementById('tf-scale').value;

    document.getElementById('val-tf-x').textContent = x + 'px';
    document.getElementById('val-tf-y').textContent = y + 'px';
    document.getElementById('val-tf-rotate').textContent = rot + 'deg';
    document.getElementById('val-tf-scale').textContent = scale + 'x';

    var transformStr = 'translate(' + x + 'px, ' + y + 'px) rotate(' + rot + 'deg) scale(' + scale + ')';
    document.getElementById('preview-transform').style.transform = transformStr;
    document.getElementById('code-transform').value = 'transform: ' + transformStr + ';';
  }
  ['tf-x', 'tf-y', 'tf-rotate', 'tf-scale'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', updateTransform);
  });
  updateTransform();

})();