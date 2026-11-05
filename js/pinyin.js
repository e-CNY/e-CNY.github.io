(function() {
  var inputEl = document.getElementById('input-text');
  var outputEl = document.getElementById('output-text');
  var toneTypeEl = document.getElementById('tone-type');
  var realtimeEl = document.getElementById('realtime');
  var btnConvert = document.getElementById('btn-convert');
  var btnCopy = document.getElementById('btn-copy');
  var inputCount = document.getElementById('input-count');
  var outputCount = document.getElementById('output-count');

  var debounceTimer;

  // ========== 1. 内置高频易错词词典 ==========
  // 正确用法是调用 customPinyin 注入词典，格式：词语: '拼音（空格分隔）'
  // 这些词典的优先级高于系统内置词典，能有效纠正多音字误判
  var errorProneDict = {
    // --- 口语/日常易错 ---
    '色子': 'shǎi zi',
    '骰子': 'tóu zi',
    '钥匙': 'yào shi',
    '唠叨': 'láo dao',
    '疙瘩': 'gē da',
    '胳膊': 'gē bo',
    '萝卜': 'luó bo',
    '蘑菇': 'mó gu',
    '玻璃': 'bō li',
    '菩萨': 'pú sà',
    '琵琶': 'pí pá',
    '枇杷': 'pí pá',
    '馄饨': 'hún tun',
    '炸酱面': 'zhá jiàng miàn',
    '豆腐': 'dòu fu',
    '工夫': 'gōng fu',
    '功夫': 'gōng fu',
    '晃荡': 'huàng dang',
    '硬朗': 'yìng lang',
    '铃铛': 'líng dang',
    '行当': 'háng dang',
    '打量': 'dǎ liang',
    '动弹': 'dòng tan',
    '招呼': 'zhāo hu',
    '糊涂': 'hú tu',
    '马虎': 'mǎ hu',
    '扎实': 'zhā shi',
    '招呼': 'zhāo hu',
    '折腾': 'zhē teng',
    '折磨': 'zhé mó',
    '折腾': 'zhē teng',
    '搭讪': 'dā shàn',
    '邋遢': 'lā ta',
    '旮旯': 'gā lá',
    '窟窿': 'kū long',
    '马虎': 'mǎ hu',
    '苗条': 'miáo tiao',
    '明白': 'míng bai',
    '清楚': 'qīng chu',
    '漂亮': 'piào liang',
    '热闹': 'rè nao',
    '认识': 'rèn shi',
    '舒服': 'shū fu',
    '商量': 'shāng liang',
    '扎实': 'zhā shi',
    '帐篷': 'zhàng peng',
    '知识': 'zhī shi',
    '嘱咐': 'zhǔ fu',
    '困难': 'kùn nan',
    '阔气': 'kuò qi',
    '粮食': 'liáng shi',
    '地方': 'dì fang',
    '东西': 'dōng xi',

    // --- 多音字核心词组 ---
    '重庆': 'chóng qìng',
    '银行': 'yín háng',
    '行业': 'háng yè',
    '行长': 'háng zhǎng',
    '音乐': 'yīn yuè',
    '快乐': 'kuài lè',
    '乐器': 'yuè qì',
    '长大': 'zhǎng dà',
    '长城': 'cháng chéng',
    '长度': 'cháng dù',
    '重新': 'chóng xīn',
    '重复': 'chóng fù',
    '重量': 'zhòng liàng',
    '重要': 'zhòng yào',
    '发现': 'fā xiàn',
    '头发': 'tóu fa',
    '理发': 'lǐ fà',
    '发行': 'fā xíng',
    '人行': 'rén xíng',
    '不行': 'bù xíng',
    '行驶': 'xíng shǐ',
    '投降': 'tóu xiáng',
    '降落': 'jiàng luò',
    '降低': 'jiàng dī',
    '嫌少': 'xián shǎo',
    '多少': 'duō shǎo',
    '少年': 'shào nián',
    '少数': 'shǎo shù',
    '好奇': 'hào qí',
    '好人': 'hǎo rén',
    '爱好': 'ài hào',
    '好学': 'hào xué',
    '好客': 'hào kè',
    '挣扎': 'zhēng zhá',
    '扎针': 'zhā zhēn',
    '包扎': 'bāo zā',
    '驻扎': 'zhù zhā',
    '调查': 'diào chá',
    '调节': 'tiáo jié',
    '空调': 'kōng tiáo',
    '音调': 'yīn diào',
    '强调': 'qiáng diào',
    '勉强': 'miǎn qiǎng',
    '倔强': 'jué jiàng',
    '强大': 'qiáng dà',
    '参差': 'cēn cī',
    '差别': 'chā bié',
    '出差': 'chū chāi',
    '差劲': 'chà jìn',
    '差点': 'chà diǎn',
    '刹那': 'chà nà',
    '刹车': 'shā chē',
    '古刹': 'gǔ chà',
    '扁舟': 'piān zhōu',
    '扁担': 'biǎn dan',
    '屏息': 'bǐng xī',
    '屏幕': 'píng mù',
    '屏风': 'píng fēng',
    '剥削': 'bō xuē',
    '剥皮': 'bāo pí',
    '停泊': 'tíng bó',
    '湖泊': 'hú pō',
    '淡泊': 'dàn bó',
    '磅礴': 'páng bó',
    '压迫': 'yā pò',
    '压根': 'yà gēn',
    '压力': 'yā lì',
    '咽喉': 'yān hóu',
    '吞咽': 'tūn yàn',
    '呜咽': 'wū yè',
    '应该': 'yīng gāi',
    '答应': 'dā ying',
    '应用': 'yìng yòng',
    '反应': 'fǎn yìng',
    '呼应': 'hū yìng',
    '载重': 'zài zhòng',
    '记载': 'jì zǎi',
    '刊载': 'kān zǎi',
    '一年半载': 'yī nián bàn zǎi',
    '转弯': 'zhuǎn wān',
    '转圈': 'zhuàn quān',
    '旋转': 'xuán zhuǎn',
    '转动': 'zhuàn dòng',
    '传记': 'zhuàn jì',
    '传奇': 'chuán qí',
    '传说': 'chuán shuō',
    '自传': 'zì zhuàn',
    '畜生': 'chù sheng',
    '畜牧': 'xù mù',
    '牲畜': 'shēng chù',
    '效率': 'xiào lǜ',
    '率领': 'shuài lǐng',
    '草率': 'cǎo shuài',
    '坦率': 'tǎn shuài',
    '倔强': 'jué jiàng',
    '强迫': 'qiǎng pò',
    '勉强': 'miǎn qiǎng',
    '牵强': 'qiān qiǎng',
    '和面': 'huó miàn',
    '和泥': 'huó ní',
    '和药': 'huò yào',
    '和稀泥': 'huò xī ní',
    '暖和': 'nuǎn huo',
    '软和': 'ruǎn huo',
    '掺和': 'chān huo',
    '附和': 'fù hè',
    '唱和': 'chàng hè',
    '一唱一和': 'yī chàng yī hè',
    '薄荷': 'bò he',
    '薄弱': 'bó ruò',
    '单薄': 'dān bó',
    '薄饼': 'báo bǐng',
    '薄片': 'báo piàn',
    '姓单': 'xìng shàn',
    '单于': 'chán yú',
    '单独': 'dān dú',
    '简单': 'jiǎn dān',
    '单县': 'shàn xiàn',
    '解放': 'jiě fàng',
    '解送': 'jiè sòng',
    '解数': 'xiè shù',
    '姓解': 'xìng xiè',
    '浑身解数': 'hún shēn xiè shù',
    '押解': 'yā jiè',
    '解甲归田': 'jiě jiǎ guī tián',
    '落枕': 'lào zhěn',
    '落色': 'lào shǎi',
    '落不是': 'lào bù shi',
    '丢三落四': 'diū sān là sì',
    '落下了': 'là xià le',
    '落花生': 'luò huā shēng',
    '降落': 'jiàng luò',
    '飘落': 'piāo luò',
    '丢落': 'diū luò',

    // --- 成语/书面语易错 ---
    '一哄而散': 'yī hòng ér sàn',
    '哄堂大笑': 'hōng táng dà xiào',
    '哄骗': 'hǒng piàn',
    '起哄': 'qǐ hòng',
    '蛮横': 'mán hèng',
    '横祸': 'hèng huò',
    '横财': 'hèng cái',
    '横行霸道': 'héng xíng bà dào',
    '横七竖八': 'héng qī shù bā',
    '飞来横祸': 'fēi lái hèng huò',
    '恃强凌弱': 'shì qiáng líng ruò',
    '强词夺理': 'qiǎng cí duó lǐ',
    '强人所难': 'qiǎng rén suǒ nán',
    '牵强附会': 'qiān qiǎng fù huì',
    '咀嚼': 'jǔ jué',
    '味同嚼蜡': 'wèi tóng jiáo là',
    '咬文嚼字': 'yǎo wén jiáo zì',
    '倒嚼': 'dǎo jiào',
    '慰藉': 'wèi jiè',
    '杯盘狼藉': 'bēi pán láng jí',
    '蕴藉': 'yùn jiè',
    '姓区': 'xìng ōu',
    '地区': 'dì qū',
    '区别': 'qū bié',
    '姓仇': 'xìng qiú',
    '仇恨': 'chóu hèn',
    '报仇': 'bào chóu',
    '姓朴': 'xìng piáo',
    '朴素': 'pǔ sù',
    '姓查': 'xìng zhā',
    '调查': 'diào chá',
    '检查': 'jiǎn chá',
    '姓繁': 'xìng pó',
    '繁荣': 'fán róng',
    '繁琐': 'fán suǒ',
    '姓员': 'xìng yùn',
    '员工': 'yuán gōng',
    '人员': 'rén yuán',
    '姓能': 'xìng nài',
    '能力': 'néng lì',
    '姓阚': 'xìng kàn',
    '姓秘': 'xìng bì',
    '秘鲁': 'bì lǔ',
    '秘密': 'mì mì',
    '姓折': 'xìng shé',
    '折断': 'zhé duàn',
    '打折': 'dǎ zhé',
    '姓尉': 'xìng wèi',
    '尉迟': 'yù chí',
    '尉官': 'wèi guān',
    '姓乐': 'xìng yuè',
    '快乐': 'kuài lè',
    '音乐': 'yīn yuè',

    // --- 古诗词/文言高频 ---
    '回车叱牛牵向北': 'huí chē chì niú qiān xiàng běi',
    '风吹草低见牛羊': 'fēng chuī cǎo dī xiàn niú yáng',
    '遥知兄弟登高处遍插茱萸少一人': 'yáo zhī xiōng dì dēng gāo chù biàn chā zhū yú shǎo yī rén',
    '一骑红尘妃子笑': 'yī jì hóng chén fēi zǐ xiào',
    '坐骑': 'zuò qí',
    '骑兵': 'qí bīng',
    '铁骑': 'tiě jì',
    '千乘之国': 'qiān shèng zhī guó',
    '乘凉': 'chéng liáng',
    '乘客': 'chéng kè',
    '史乘': 'shǐ shèng',
    '女红': 'nǚ gōng',
    '红领巾': 'hóng lǐng jīn',
    '红色': 'hóng sè',
    '轮台东门送君去去时雪满天山路': 'lún tái dōng mén sòng jūn qù qù shí xuě mǎn tiān shān lù',
    '荡胸生曾云': 'dàng xiōng shēng céng yún',
    '决眦入归鸟': 'jué zì rù guī niǎo',
    '造化钟神秀阴阳割昏晓': 'zào huà zhōng shén xiù yīn yáng gē hūn xiǎo'
  };

  // 调用 customPinyin 注入词典（这是关键修复点）
  if (typeof pinyinPro.customPinyin === 'function') {
    pinyinPro.customPinyin(errorProneDict);
  }

  // ========== 2. 转换逻辑 ==========
  function updateCounts() {
    inputCount.textContent = inputEl.value.length;
    outputCount.textContent = outputEl.value.length;
  }

  function convert() {
    var text = inputEl.value.trim();
    if (!text) {
      outputEl.value = '';
      updateCounts();
      return;
    }

    var tone = toneTypeEl.value;

    try {
      var options = {
        toneType: tone === 'num' ? 'num' : (tone === 'none' || tone === 'first' ? 'none' : 'symbol'),
        pattern: tone === 'first' ? 'first' : 'pinyin',
        type: 'array'
      };

      var result = pinyinPro.pinyin(text, options);
      outputEl.value = result.join(' ');
    } catch (e) {
      outputEl.value = '转换失败：' + e.message;
    }
    updateCounts();
  }

  // 手动转换
  btnConvert.addEventListener('click', convert);

  // 实时输入防抖
  inputEl.addEventListener('input', function() {
    updateCounts();
    if (realtimeEl.checked) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(convert, 300);
    }
  });

  // 切换声调模式时若实时开启则立即刷新
  toneTypeEl.addEventListener('change', function() {
    if (realtimeEl.checked) convert();
  });

  // 复制
  btnCopy.addEventListener('click', function() {
    if (!outputEl.value) return;
    navigator.clipboard.writeText(outputEl.value).then(function() {
      var originalText = btnCopy.textContent;
      btnCopy.textContent = '✅ 已复制';
      setTimeout(function() { btnCopy.textContent = originalText; }, 2000);
    });
  });
})();