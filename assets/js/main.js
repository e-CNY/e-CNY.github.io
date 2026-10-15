fetch('./tools.json')
  .then(res => res.json())
  .then(tools => {
    const grid = document.getElementById('tool-grid');
    grid.innerHTML = tools.map(tool => `
      <a class="card" href="${tool.path}">
        <span class="card-icon">${tool.icon}</span>
        <h3>${tool.name}</h3>
        <p>${tool.desc}</p>
      </a>
    `).join('');
  })
  .catch(() => {
    document.getElementById('tool-grid').innerHTML =
      '<p style="color:red">工具列表加载失败，请检查 tools.json</p>';
  });