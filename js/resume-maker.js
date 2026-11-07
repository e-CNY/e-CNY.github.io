(function() {
  var mdInput = document.getElementById('md-input');
  var resumeContent = document.getElementById('resume-content');
  var themeColorInput = document.getElementById('theme-color');
  var fontScaleInput = document.getElementById('font-scale');
  var lineScaleInput = document.getElementById('line-scale');
  
  var avatarInput = document.getElementById('avatar-input');
  var btnUploadAvatar = document.getElementById('btn-upload-avatar');
  var resumeAvatar = document.getElementById('resume-avatar');
  
  var btnRandom = document.getElementById('btn-random');
  var btnPrint = document.getElementById('btn-print');
  var btnExportHtml = document.getElementById('btn-export-html');
  var btnExportMd = document.getElementById('btn-export-md');

  var currentAvatarBase64 = '';

  // ================= 1. Markdown 解析器 =================
  function parseMarkdown(md) {
    var html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 处理链接 [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    // 处理行内代码 `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    // 处理加粗 **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    var lines = html.split('\n');
    var resultHtml = '';
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line.startsWith('# ')) {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        resultHtml += '<h1>' + line.substring(2) + '</h1>';
        continue;
      }

      if (line.startsWith('> ')) {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        resultHtml += '<p class="subtitle">' + line.substring(2) + '</p>';
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
        
        if (!inList) {
          resultHtml += '<ul>';
          inList = true;
        }
        var style = indent > 0 ? ' style="margin-left: ' + (indent * 12) + 'px; list-style-type: circle;"' : '';
        resultHtml += '<li' + style + '>' + content + '</li>';
        continue;
      }

      if (line === '') {
        if (inList) { resultHtml += '</ul>'; inList = false; }
      } else {
        if (inList) { resultHtml += '</ul>'; inList = false; }
        resultHtml += '<p>' + line + '</p>';
      }
    }
    
    if (inList) resultHtml += '</ul>';
    return resultHtml;
  }

  // ================= 2. 渲染与设置 =================
  function render() {
    var mdText = mdInput.value;
    resumeContent.innerHTML = parseMarkdown(mdText);
  }

  mdInput.addEventListener('input', render);

  // 实时更新主题色、字号、行距
  themeColorInput.addEventListener('input', function() {
    document.documentElement.style.setProperty('--theme-color', this.value);
  });
  fontScaleInput.addEventListener('input', function() {
    document.getElementById('resume-page').style.setProperty('--font-scale', this.value / 100);
  });
  lineScaleInput.addEventListener('input', function() {
    document.getElementById('resume-page').style.setProperty('--line-scale', this.value / 100);
  });

  // ================= 3. 头像上传 =================
  btnUploadAvatar.addEventListener('click', function() { avatarInput.click(); });
  avatarInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      currentAvatarBase64 = evt.target.result;
      resumeAvatar.src = currentAvatarBase64;
      resumeAvatar.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  // ================= 4. 一键随机生成 =================
  var roles = [
    {
      title: '前端开发工程师', 
      desc: '3年互联网大厂前端开发经验，精通 Vue/React 与 Node.js。具备优秀的系统架构设计能力，主导过多个百万级日活项目。',
      skills: ['熟练掌握 JavaScript / TypeScript / HTML / CSS', '熟悉 React / Vue 源码与底层原理', '熟练使用 Webpack / Vite 等构建工具'],
      companies: ['字节跳动', '腾讯科技', '阿里巴巴', '美团点评'],
      schools: ['清华大学', '北京大学', '浙江大学', '复旦大学']
    },
    {
      title: '高级产品经理',
      desc: '5年 B 端与 C 端产品经验，擅长从 0 到 1 搭建产品体系。曾主导过 SaaS 平台与电商核心链路改版，具备极强的数据分析与跨部门协作能力。',
      skills: ['熟练使用 Axure / Figma 绘制高保真原型', '精通 SQL，具备强数据驱动决策能力', '熟悉 A/B 测试与用户增长模型'],
      companies: ['网易', '小米', '京东', '滴滴出行'],
      schools: ['同济大学', '武汉大学', '中山大学', '南京大学']
    },
    {
      title: '视觉 UI 设计师',
      desc: '4年 UI/UX 设计经验，审美在线，对色彩与排版极度敏感。主导过大型 App 设计系统搭建，擅长 B 端后台与 C 端营销活动设计。',
      skills: ['精通 Figma / Sketch / Adobe 全家桶', '具备完整的插画与动效设计能力', '深谙 iOS / Android 设计规范'],
      companies: ['百度', '快手', '哔哩哔哩', '小红书'],
      schools: ['中央美术学院', '中国美术学院', '清华大学美术学院', '同济大学']
    }
  ];

  var names = ['张伟', '王芳', '李娜', '刘洋', '陈杰', '林雨'];
  var phone = '138-0000-0000';

  btnRandom.addEventListener('click', function() {
    var role = roles[Math.floor(Math.random() * roles.length)];
    var name = names[Math.floor(Math.random() * names.length)];
    var company1 = role.companies[Math.floor(Math.random() * role.companies.length)];
    var company2 = role.companies[Math.floor(Math.random() * role.companies.length)];
    var school = role.schools[Math.floor(Math.random() * role.schools.length)];
    var email = 'example@mail.com';
    
    var text = 
      '# ' + name + '\n' +
      '> ' + role.title + ' | 意向城市：北京\n\n' +
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
  });

  // ================= 5. 导出功能 =================
  btnPrint.addEventListener('click', function() { window.print(); });

  btnExportMd.addEventListener('click', function() {
    var blob = new Blob([mdInput.value], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, '简历.md');
  });

  btnExportHtml.addEventListener('click', function() {
    render();
    var htmlContent = resumeContent.innerHTML;
    var pageStyle = document.getElementById('resume-page').getAttribute('style') || '';
    var color = themeColorInput.value;
    
    // 拼装一个包含完整 CSS 的单文件 HTML
    var fullHtml = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>简历</title>\n<style>\n' +
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
      '.rm-preview-content a { color: ' + color + '; text-decoration: none; border-bottom: 1px dashed; }\n' +
      '.rm-preview-content code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }\n' +
      '.rm-preview-content hr { border: none; border-top: 1px dashed #ccc; margin: 15px 0; }\n' +
      '@media print { @page { size: A4; margin: 0; } body { background: #fff; padding: 0; } .rm-preview-page { box-shadow: none; width: 100%; min-height: 100%; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="rm-preview-page">\n' +
      (currentAvatarBase64 ? '<img src="' + currentAvatarBase64 + '" class="rm-avatar">\n' : '') +
      '<div class="rm-preview-content">\n' + htmlContent + '\n</div>\n' +
      '</div>\n</body>\n</html>';
      
    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, '简历.html');
  });

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ================= 6. 初始化 =================
  // 默认加载一份初始数据
  btnRandom.click();
  document.documentElement.style.setProperty('--theme-color', themeColorInput.value);
  document.getElementById('resume-page').style.setProperty('--font-scale', 1);
  document.getElementById('resume-page').style.setProperty('--line-scale', 1.5);

})();