(function () {
  // 判断是否为本地双击环境，如果是，直接放行，不拦截任何操作
  var isFileProtocol = window.location.protocol === 'file:';
  
  function showNotice() {
    if (document.getElementById('traffic-limit-overlay')) return;
    
    var overlay = document.createElement('div');
    overlay.id = 'traffic-limit-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(249, 243, 227, 0.98);
        z-index: 99999; display: flex; flex-direction: column; 
        align-items: center; justify-content: center; text-align: center;
        padding: 24px; font-family: system-ui, -apple-system, sans-serif; color: #3d3226;
    `;
    overlay.innerHTML = `
        <h1 style="font-size: 2rem; margin-bottom: 16px;">🚦 本月流量已耗尽</h1>
        <p style="font-size: 1.1rem; line-height: 1.6; max-width: 600px; color: #6b5d47;">
            感谢大家的热情支持！本站的 GitHub Pages 免费流量（100GB/月）已使用完毕，静态资源加载受限。
        </p>
        <p style="font-size: 1.1rem; margin-top: 24px; margin-bottom: 32px;">
            您依然可以使用全部功能，只需 <strong>免费下载源码在本地运行</strong>：
        </p>
        <a href="https://github.com/e-CNY/e-CNY.github.io" target="_blank" style="
            background: #7ba05b; color: #fff; padding: 14px 32px; border-radius: 8px;
            text-decoration: none; font-weight: bold; font-size: 1.1rem;
        ">📦 点击前往 GitHub 下载源码</a>
        <p style="font-size: 0.9rem; color: #8a7a5f; margin-top: 48px;">
            下载解压后，直接双击 <strong>index.html</strong> 即可完美体验所有工具！
        </p>
    `;
    document.body.appendChild(overlay);
  }

  async function checkStatus() {
    // 如果是本地双击，直接跳过检测，绝不影响小白用户
    if (isFileProtocol) return;

    try {
      // 用极小的请求探测是否被限流（返回 429 或 403）
      var res = await fetch('index.html', { method: 'HEAD', cache: 'no-store' });
      if (res.status === 429 || res.status === 403) {
        showNotice();
      }
    } catch (e) {
      // 忽略网络波动等非限流错误
    }
  }

  // 页面加载完毕后，延迟 2 秒静默检测，不阻塞用户使用
  window.addEventListener('load', function() {
    setTimeout(checkStatus, 2000);
  });
})();