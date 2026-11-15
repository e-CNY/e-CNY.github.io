(function() {
  'use strict';

  // ================== 通用工具 ==================
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  }

  // ================== DOM 元素 ==================
  var mdInput = document.getElementById('md-input');
  var resumeContent = document.getElementById('resume-content');
  var themeColorInput = document.getElementById('theme-color');
  var fontScaleInput = document.getElementById('font-scale');
  var lineScaleInput = document.getElementById('line-scale');
  
  var avatarInput = document.getElementById('avatar-input');
  var btnUploadAvatar = document.getElementById('btn-upload-avatar');
  var resumeAvatar = document.getElementById('resume-avatar');
  
  var btnRandom = document.getElementById('btn-random');
  var btnClear = document.getElementById('btn-clear');
  var btnPrint = document.getElementById('btn-print');
  var btnExportHtml = document.getElementById('btn-export-html');
  var btnExportMd = document.getElementById('btn-export-md');

  var currentAvatarBase64 = '';

  // ================== 1. Markdown 解析器 ==================
  function parseMarkdown(md) {
    // 1. 转义 HTML 防注入
    var html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 2. 处理行内元素
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:10px 0;">');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    var lines = html.split('\n');
    var resultHtml = '';
    var inList = false;
    var inBlockquote = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      // 处理引用块
      if (line.startsWith('&gt; ')) {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        if (!inBlockquote) { resultHtml += '<blockquote>'; inBlockquote = true; }
        resultHtml += '<p>' + line.substring(5) + '</p>';
        continue;
      } else if (inBlockquote) {
        resultHtml += '</blockquote>'; inBlockquote = false;
      }

      if (line.startsWith('# ')) {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        resultHtml += '<h1>' + line.substring(2) + '</h1>';
        continue;
      }

      if (line.startsWith('## ')) {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        resultHtml += '<h2>' + line.substring(3) + '</h2>';
        continue;
      }

      if (line === '---') {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        resultHtml += '<hr>';
        continue;
      }

      var listMatch = line.match(/^(\s*)-\s+(.*)/);
      if (listMatch) {
        var indent = listMatch[1].length;
        var content = listMatch[2];
        
        if (!inList) { resultHtml += '<ul>'; inList = true; }
        var style = indent > 0 ? ' style="margin-left: ' + (indent * 12) + 'px; list-style-type: circle;"' : '';
        resultHtml += '<li' + style + '>' + content + '</li>';
        continue;
      }

      if (line === '') {
        if (inList) { resultHtml += '</ul>'; inList = false; }
      } else {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        // 特殊处理引用后的副标题（旧版兼容）
        if (line.startsWith('> ')) {
          resultHtml += '<p class="subtitle">' + line.substring(2) + '</p>';
        } else {
          resultHtml += '<p>' + line + '</p>';
        }
      }
    }
    
    if (inList) resultHtml += '</ul>';
    if (inBlockquote) resultHtml += '</blockquote>';
    
    // 兼容旧版 `> 文字` 的副标题解析，在上面被处理成了 blockquote，如果需要可以特别修改。
    // 重新把第一段的 blockquote 变回 subtitle 样式
    resultHtml = resultHtml.replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, '<p class="subtitle">$1</p>');
    
    return resultHtml;
  }

  // ================== 2. 渲染与本地保存 ==================
  var saveTimer = null;
  function saveToLocal() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      try {
        var state = {
          md: mdInput.value,
          color: themeColorInput.value,
          font: fontScaleInput.value,
          line: lineScaleInput.value,
          avatar: currentAvatarBase64
        };
        localStorage.setItem('resume_maker_state', JSON.stringify(state));
      } catch (e) { /* 忽略容量超限等错误 */ }
    }, 500);
  }

  function loadFromLocal() {
    try {
      var state = JSON.parse(localStorage.getItem('resume_maker_state'));
      if (!state) return false;
      
      if (state.md) mdInput.value = state.md;
      if (state.color) themeColorInput.value = state.color;
      if (state.font) fontScaleInput.value = state.font;
      if (state.line) lineScaleInput.value = state.line;
      if (state.avatar) {
        currentAvatarBase64 = state.avatar;
        resumeAvatar.src = currentAvatarBase64;
        resumeAvatar.style.display = 'block';
      }
      return true;
    } catch (e) { return false; }
  }

  function render() {
    var mdText = mdInput.value;
    resumeContent.innerHTML = parseMarkdown(mdText);
    saveToLocal();
  }

  mdInput.addEventListener('input', render);

  // Tab 键支持
  mdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 4;
      render();
    }
  });

  // 主题色、字号、行距
  themeColorInput.addEventListener('input', function() {
    document.documentElement.style.setProperty('--theme-color', this.value);
    saveToLocal();
  });
  fontScaleInput.addEventListener('input', function() {
    document.getElementById('resume-page').style.setProperty('--font-scale', this.value / 100);
    saveToLocal();
  });
  lineScaleInput.addEventListener('input', function() {
    document.getElementById('resume-page').style.setProperty('--line-scale', this.value / 100);
    saveToLocal();
  });

  // 快捷工具栏
  document.querySelectorAll('.rm-format-tools button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var insertText = this.getAttribute('data-insert');
      var start = mdInput.selectionStart;
      var end = mdInput.selectionEnd;
      var text = mdInput.value;
      
      if (insertText === '**' || insertText === '*' || insertText === '`') {
        // 包裹型
        var selected = text.substring(start, end);
        mdInput.value = text.substring(0, start) + insertText + selected + insertText + text.substring(end);
        mdInput.selectionStart = start + insertText.length;
        mdInput.selectionEnd = end + insertText.length;
      } else {
        // 插入型 (在行首或光标处)
        mdInput.value = text.substring(0, start) + insertText + text.substring(end);
        mdInput.selectionStart = mdInput.selectionEnd = start + insertText.length;
      }
      mdInput.focus();
      render();
    });
  });

  // ================== 3. 头像上传 ==================
  btnUploadAvatar.addEventListener('click', function() { avatarInput.click(); });
  avatarInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      currentAvatarBase64 = evt.target.result;
      resumeAvatar.src = currentAvatarBase64;
      resumeAvatar.style.display = 'block';
      saveToLocal();
      showToast('头像已更新');
    };
    reader.readAsDataURL(file);
    this.value = '';
  });

  // ================== 4. 一键随机生成 (全虚构数据) ==================
  var roles = [
    {
      title: '前端开发工程师', 
      desc: '3年互联网研发经验，精通 Vue/React 与 Node.js。具备优秀的系统架构设计能力，主导过多个百万级日活项目，追求极致的用户体验与代码质量。',
      skills: ['熟练掌握 JavaScript / TypeScript / HTML / CSS', '深入理解 React / Vue 底层原理', '熟练使用 Webpack / Vite 等构建工具', '具备 Node.js 全栈开发能力'],
      companies: ['星辰科技', '蔚蓝网络', '极光互联', '云帆数据', '幻月智能'],
      schools: ['梧桐大学', '启明科技大学', '瀚海理工大学', '东林大学', '云顶学院']
    },
    {
      title: '高级产品经理',
      desc: '5年 B 端与 C 端产品经验，擅长从 0 到 1 搭建产品体系。曾主导过 SaaS 平台与电商核心链路改版，具备极强的数据分析与跨部门协作能力。',
      skills: ['熟练使用 Axure / Figma 绘制高保真原型', '精通 SQL，具备强数据驱动决策能力', '熟悉 A/B 测试与用户增长模型', '优秀的项目管理与沟通协调能力'],
      companies: ['星尘网络', '晨曦信息', '跃动科技', '云端矩阵', '未来工场'],
      schools: ['青藤大学', '光华管理学院', '明德学府', '博雅大学', '求真学院']
    },
    {
      title: '视觉 UI 设计师',
      desc: '4年 UI/UX 设计经验，审美在线，对色彩与排版极度敏感。主导过大型 App 设计系统搭建，擅长 B 端后台与 C 端营销活动设计。',
      skills: ['精通 Figma / Sketch / Adobe 全家桶', '具备完整的插画与动效设计能力', '深谙 iOS / Android 设计规范', '良好的交互逻辑思维'],
      companies: ['创想互娱', '幻境视觉', '星辰大海', '鲸落设计', '奇点工作室'],
      schools: ['白鹭美术学院', '天工设计学院', '水墨艺术学院', '流云传媒大学', '星海音乐学院']
    }
  ];

  var names = ['林风', '苏月', '陈星', '李念', '张宇', '王霜'];
  var phone = '138-0000-0000';

  var defaultTemplate = 
    '# 林风\n' +
    '> 前端开发工程师 | 意向城市：北京\n\n' +
    '## 联系方式\n' +
    '- 电话：138-0000-0000\n' +
    '- 邮箱：linfeng@example.com\n' +
    '- 作品集：[点击查看](https://example.com)\n' +
    '---\n\n' +
    '## 个人简介\n' +
    '3年互联网研发经验，精通 Vue/React 与 Node.js。追求极致的用户体验与代码质量。\n\n' +
    '## 工作经历\n' +
    '- **星辰科技** (2021.05 - 至今) - 前端开发工程师\n' +
    '  - 负责核心业务研发与迭代，优化系统性能。\n' +
    '  - 主导项目架构升级，将开发效率提升 40%。\n' +
    '- **蔚蓝网络** (2018.07 - 2021.04) - 前端开发\n' +
    '  - 参与产品需求评审，完成模块设计与开发。\n\n' +
    '## 教育背景\n' +
    '- **梧桐大学** (2014.09 - 2018.06) - 计算机科学与技术 本科\n\n' +
    '## 专业技能\n' +
    '- 熟练掌握 JavaScript / TypeScript / HTML / CSS\n' +
    '- 深入理解 React / Vue 底层原理\n' +
    '- 熟练使用 Webpack / Vite 等构建工具';

  btnRandom.addEventListener('click', function() {
    var role = roles[Math.floor(Math.random() * roles.length)];
    var name = names[Math.floor(Math.random() * names.length)];
    var company1 = role.companies[Math.floor(Math.random() * role.companies.length)];
    var company2 = role.companies[Math.floor(Math.random() * role.companies.length)];
    var school = role.schools[Math.floor(Math.random() * role.schools.length)];
    var email = name.toLowerCase() + '@example.com';
    
    var text = 
      '# ' + name + '\n' +
      '> ' + role.title + ' | 意向城市：上海\n\n' +
      '## 联系方式\n' +
      '- 电话：' + phone + '\n' +
      '- 邮箱：' + email + '\n' +
      '- 作品集：[点击查看](https://example.com)\n' +
      '---\n\n' +
      '## 个人简介\n' +
      role.desc + '\n\n' +
      '## 工作经历\n' +
      '- **' + company1 + '** (2021.05 - 至今) - ' + role.title + '\n' +
      '  - 负责核心业务研发与迭代，优化系统性能，提升用户体验。\n' +
      '  - 主导项目架构升级，将开发效率提升 40%。\n' +
      '- **' + company2 + '** (2018.07 - 2021.04) - 相关岗位\n' +
      '  - 参与产品需求评审，完成模块设计与开发。\n\n' +
      '## 教育背景\n' +
      '- **' + school + '** (2014.09 - 2018.06) - 相关专业 本科\n\n' +
      '## 专业技能\n' +
      role.skills.map(function(s) { return '- ' + s; }).join('\n');
      
    mdInput.value = text;
    render();
    showToast('已生成随机简历');
  });

  btnClear.addEventListener('click', function() {
    if (confirm('确定要清空当前简历吗？')) {
      mdInput.value = '';
      currentAvatarBase64 = '';
      resumeAvatar.style.display = 'none';
      resumeAvatar.src = '';
      render();
      showToast('已清空');
    }
  });

  // ================== 5. 导出功能 ==================
  btnPrint.addEventListener('click', function() { 
    // 稍微延时确保 DOM 渲染完毕
    setTimeout(function() { window.print(); }, 100);
  });

  btnExportMd.addEventListener('click', function() {
    if (!mdInput.value) return showToast('内容为空');
    var blob = new Blob([mdInput.value], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, '简历.md');
    showToast('Markdown 已下载');
  });

  btnExportHtml.addEventListener('click', function() {
    if (!mdInput.value) return showToast('内容为空');
    render();
    var htmlContent = resumeContent.innerHTML;
    var pageStyle = document.getElementById('resume-page').getAttribute('style') || '';
    var color = themeColorInput.value;
    
    var fullHtml = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>个人简历</title>\n<style>\n' +
      'body { margin: 0; background: #e5d9bd; display: flex; justify-content: center; padding: 20px; }\n' +
      '.rm-preview-page { width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.15); padding: 20mm; box-sizing: border-box; position: relative; ' + pageStyle + ' }\n' +
      '.rm-avatar { position: absolute; top: 20mm; right: 20mm; width: 28mm; height: 38mm; object-fit: cover; border-radius: 4px; border: 1px solid #eee; display: ' + (currentAvatarBase64 ? 'block' : 'none') + '; }\n' +
      '.rm-preview-content { color: #333; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; font-size: calc(14px * var(--font-scale, 1)); line-height: calc(1.6 * var(--line-scale, 1.5) / 1.5); }\n' +
      '.rm-preview-content h1 { font-size: 2em; margin: 0 0 4px 0; color: ' + color + '; font-weight: bold; }\n' +
      '.rm-preview-content .subtitle { font-size: 1.15em; color: #7f8c8d; margin: 0 0 16px 0; border-bottom: 2px solid ' + color + '; padding-bottom: 12px; }\n' +
      '.rm-preview-content h2 { font-size: 1.3em; margin: 20px 0 10px 0; color: ' + color + '; border-bottom: 1px solid #eee; padding-bottom: 4px; }\n' +
      '.rm-preview-content ul { margin: 0 0 10px 0; padding-left: 20px; }\n' +
      '.rm-preview-content li { margin-bottom: 6px; }\n' +
      '.rm-preview-content p { margin: 0 0 10px 0; }\n' +
      '.rm-preview-content strong { color: #2c3e50; font-weight: bold; }\n' +
      '.rm-preview-content em { font-style: italic; color: #555; }\n' +
      '.rm-preview-content a { color: ' + color + '; text-decoration: none; border-bottom: 1px dashed; }\n' +
      '.rm-preview-content code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }\n' +
      '.rm-preview-content hr { border: none; border-top: 1px dashed #ccc; margin: 15px 0; }\n' +
      '.rm-preview-content blockquote { margin: 0 0 16px 0; padding: 10px 16px; border-left: 4px solid ' + color + '; background: #f9f9f9; color: #666; border-radius: 0 4px 4px 0; }\n' +
      '@media print { @page { size: A4; margin: 0; } body { background: #fff; padding: 0; } .rm-preview-page { box-shadow: none; width: 100%; min-height: 100%; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="rm-preview-page">\n' +
      (currentAvatarBase64 ? '<img src="' + currentAvatarBase64 + '" class="rm-avatar">\n' : '') +
      '<div class="rm-preview-content">\n' + htmlContent + '\n</div>\n' +
      '</div>\n</body>\n</html>';
      
    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, '个人简历.html');
    showToast('HTML 已下载');
  });

  // ================== 6. 初始化 ==================
  document.documentElement.style.setProperty('--theme-color', themeColorInput.value);
  document.getElementById('resume-page').style.setProperty('--font-scale', 1);
  document.getElementById('resume-page').style.setProperty('--line-scale', 1.5);

  var hasSaved = loadFromLocal();
  if (hasSaved) {
    document.documentElement.style.setProperty('--theme-color', themeColorInput.value);
    document.getElementById('resume-page').style.setProperty('--font-scale', fontScaleInput.value / 100);
    document.getElementById('resume-page').style.setProperty('--line-scale', lineScaleInput.value / 100);
    render();
    showToast('已恢复上次编辑内容');
  } else {
    mdInput.value = defaultTemplate;
    render();
  }

})();