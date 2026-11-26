(function () {
  'use strict';

  // ============================================================
  // 1. 数据：紧凑数组 [char, 中文名, 英文关键词]
  // ============================================================
  var RAW = {
    smileys: [
      ['😀','咧嘴笑','grinning face smile happy'], ['😃','开心','smiley happy face'],
      ['😄','大笑','smile grin happy'], ['😁','露齿笑','beaming grin'],
      ['😆','眯眼笑','laughing squinting'], ['😅','流汗笑','sweat smile'],
      ['🤣','笑翻','rofl rolling laughing'], ['😂','笑哭','tears joy laugh'],
      ['🙂','微笑','slightly smile'], ['🙃','倒脸','upside down'],
      ['😉','眨眼','wink'], ['😊','害羞微笑','blush smile'],
      ['😇','天使','halo angel'], ['🥰','爱心脸','smiling hearts love'],
      ['😍','爱心眼','heart eyes love'], ['🤩','星星眼','star struck'],
      ['😘','飞吻','kiss blow'], ['😗','亲吻','kissing'],
      ['😚','亲闭眼','kiss closed eyes'], ['😙','亲微笑','kiss smile'],
      ['😋','馋嘴','yum savor'], ['😛','吐舌','tongue'],
      ['😜','吐舌眨眼','wink tongue'], ['🤪','疯狂','zany crazy'],
      ['😝','眯眼吐舌','squint tongue'], ['🤑','财迷','money mouth'],
      ['🤗','拥抱','hug'], ['🤭','捂嘴','hand over mouth'],
      ['🤫','嘘','shush quiet'], ['🤔','思考','thinking hmm'],
      ['🤐','闭嘴','zipper mouth'], ['🤨','挑眉','raised eyebrow'],
      ['😐','无语','neutral'], ['😑','呆滞','expressionless'],
      ['😶','没嘴','no mouth'], ['😏','奸笑','smirk'],
      ['😒','不爽','unamused'], ['🙄','翻白眼','eye roll'],
      ['😬','龇牙','grimace'], ['🤥','说谎','lying pinocchio'],
      ['😴','睡觉','sleeping zzz'], ['🤤','流口水','drool'],
      ['😪','困','sleepy'], ['😵','晕','dizzy'],
      ['🤯','爆炸头','exploding head mind blown'], ['🥳','庆祝','party celebrate'],
      ['😎','墨镜','sunglasses cool'], ['🤓','书呆子','nerd'],
      ['🧐','单片镜','monocle'], ['😕','困惑','confused'],
      ['😟','担心','worried'], ['🙁','微皱眉','slight frown'],
      ['😮','张嘴','open mouth'], ['😯','惊讶','hushed'],
      ['😲','震惊','astonished'], ['😳','脸红','flushed blush'],
      ['🥺','拜托','pleading please'], ['😦','皱眉','frown'],
      ['😧','痛苦','anguished'], ['😨','害怕','fearful'],
      ['😰','焦虑','anxious sweat'], ['😥','松口气','relieved'],
      ['😢','哭泣','cry tear'], ['😭','大哭','loudly cry sob'],
      ['😱','惊恐','scream fear'], ['😖','困惑','confounded'],
      ['😣','忍耐','persevere'], ['😞','失望','disappointed'],
      ['😓','汗','sweat downcast'], ['😩','疲惫','weary'],
      ['😫','累','tired'], ['🥱','打哈欠','yawn'],
      ['😤','得意','triumph nose'], ['😡','愤怒','pouting angry'],
      ['😠','生气','angry mad'], ['🤬','脏话','cursing swearing'],
      ['😈','恶魔笑','smiling devil'], ['👿','恶魔','angry devil'],
      ['💀','骷髅','skull dead'], ['☠️','骷髅交叉','skull crossbones'],
      ['💩','便便','poop pile'], ['🤡','小丑','clown'],
      ['👹','食人魔','ogre'], ['👺','鬼怪','goblin'],
      ['👻','幽灵','ghost'], ['👽','外星人','alien ufo'],
      ['👾','外星怪物','alien monster'], ['🤖','机器人','robot bot'],
      ['😺','猫笑','cat grin'], ['😸','猫微笑','cat smile'],
      ['😹','猫笑哭','cat tears'], ['😻','猫爱心','cat heart eyes'],
      ['😼','猫奸笑','cat wry'], ['😽','猫亲吻','cat kiss'],
      ['🙀','猫累','cat weary'], ['😿','猫哭','cat crying'],
      ['😾','猫生气','cat pouting']
    ],
    people: [
      ['👋','挥手','wave hello'], ['🤚','举手背','raised back hand'],
      ['✋','手掌','raised hand'], ['🖐️','五指','hand fingers'],
      ['👌','OK','ok hand perfect'], ['🤌','捏','pinched fingers'],
      ['🤏','捏小','pinching'], ['✌️','胜利V','victory peace'],
      ['🤞','交叉手指','crossed fingers'], ['🤟','爱你','love you gesture'],
      ['🤘','摇滚','rock on horns'], ['🤙','打电话','call me'],
      ['👈','向左','point left'], ['👉','向右','point right'],
      ['👆','向上','point up'], ['👇','向下','point down'],
      ['☝️','食指上','index up'], ['👍','赞','thumbs up like'],
      ['👎','踩','thumbs down dislike'], ['✊','拳头','raised fist'],
      ['👊','出拳','oncoming fist'], ['👏','鼓掌','clap applause'],
      ['🙌','举手欢呼','raising hands celebrate'], ['👐','张开手','open hands'],
      ['🤲','掌心向上','palms up'], ['🤝','握手','handshake deal'],
      ['🙏','祈祷','pray thanks'], ['✍️','写作','writing hand'],
      ['💅','美甲','nail polish'], ['💪','肌肉','flex muscle strong'],
      ['👂','耳朵','ear'], ['👃','鼻子','nose'],
      ['👀','双眼','eyes look'], ['👁️','眼睛','eye'],
      ['👅','舌头','tongue'], ['👄','嘴','mouth lips'],
      ['🧠','大脑','brain'], ['🦷','牙齿','tooth'],
      ['🦴','骨头','bone'], ['👤','用户','bust silhouette user'],
      ['👥','用户们','users busts'], ['👶','婴儿','baby'],
      ['🧒','小孩','child'], ['👦','男孩','boy'],
      ['👧','女孩','girl'], ['🧑','人','person'],
      ['👨','男人','man'], ['👩','女人','woman'],
      ['🧓','老人','older person'], ['👴','老爷爷','old man'],
      ['👵','老奶奶','old woman'], ['👮','警察','police officer'],
      ['💂','卫兵','guard'], ['🕵️','侦探','detective spy'],
      ['👷','工人','construction worker'], ['🤴','王子','prince'],
      ['👸','公主','princess'], ['🧙','法师','mage wizard'],
      ['🧚','仙子','fairy'], ['🧛','吸血鬼','vampire'],
      ['🧜','人鱼','merperson mermaid'], ['🧝','精灵','elf'],
      ['🧞','神灯精灵','genie'], ['🧟','僵尸','zombie'],
      ['💁','服务','tipping hand'], ['🙅','拒绝','no gesture'],
      ['🙆','好的','ok gesture'], ['🙋','举手','raising hand'],
      ['🙇','鞠躬','bowing'], ['🤦','捂脸','facepalm'],
      ['🤷','耸肩','shrug']
    ],
    animals: [
      ['🐶','狗','dog puppy'], ['🐱','猫','cat kitten'],
      ['🐭','鼠','mouse'], ['🐹','仓鼠','hamster'],
      ['🐰','兔','rabbit bunny'], ['🦊','狐狸','fox'],
      ['🐻','熊','bear'], ['🐼','熊猫','panda'],
      ['🐨','考拉','koala'], ['🐯','老虎','tiger'],
      ['🦁','狮子','lion'], ['🐮','牛','cow face'],
      ['🐷','猪','pig'], ['🐸','青蛙','frog'],
      ['🐵','猴','monkey face'], ['🙈','不看','see no evil'],
      ['🙉','不听','hear no evil'], ['🙊','不说','speak no evil'],
      ['🐔','鸡','chicken'], ['🐧','企鹅','penguin'],
      ['🐦','鸟','bird'], ['🐤','小鸡','baby chick'],
      ['🦆','鸭','duck'], ['🦅','鹰','eagle'],
      ['🦉','猫头鹰','owl'], ['🦇','蝙蝠','bat'],
      ['🐺','狼','wolf'], ['🐴','马','horse face'],
      ['🦄','独角兽','unicorn'], ['🐝','蜜蜂','bee honey'],
      ['🐛','虫子','bug caterpillar'], ['🦋','蝴蝶','butterfly'],
      ['🐌','蜗牛','snail'], ['🐞','瓢虫','ladybug'],
      ['🐜','蚂蚁','ant'], ['🕷️','蜘蛛','spider'],
      ['🦂','蝎子','scorpion'], ['🐢','乌龟','turtle'],
      ['🐍','蛇','snake'], ['🦎','蜥蜴','lizard'],
      ['🐙','章鱼','octopus'], ['🦑','鱿鱼','squid'],
      ['🦐','虾','shrimp'], ['🦞','龙虾','lobster'],
      ['🦀','蟹','crab'], ['🐡','河豚','blowfish'],
      ['🐠','热带鱼','tropical fish'], ['🐟','鱼','fish'],
      ['🐬','海豚','dolphin'], ['🐳','鲸','whale'],
      ['🦈','鲨鱼','shark'], ['🐊','鳄鱼','crocodile'],
      ['🐘','大象','elephant'], ['🦒','长颈鹿','giraffe'],
      ['🦓','斑马','zebra'], ['🦍','大猩猩','gorilla'],
      ['🐪','骆驼','camel'], ['🦘','袋鼠','kangaroo'],
      ['🐄','奶牛','cow'], ['🐎','马','horse'],
      ['🐖','猪','pig'], ['🐑','绵羊','sheep'],
      ['🦙','羊驼','llama alpaca'], ['🐐','山羊','goat'],
      ['🦌','鹿','deer'], ['🐕','狗','dog'],
      ['🐈','猫','cat'], ['🐓','公鸡','rooster'],
      ['🦃','火鸡','turkey'], ['🦚','孔雀','peacock'],
      ['🦜','鹦鹉','parrot'], ['🦢','天鹅','swan'],
      ['🕊️','鸽子','dove peace'], ['🐇','兔','rabbit'],
      ['🦝','浣熊','raccoon'], ['🦨','臭鼬','skunk'],
      ['🦦','水獭','otter'], ['🦥','树懒','sloth'],
      ['🦔','刺猬','hedgehog'], ['🐿️','松鼠','chipmunk squirrel']
    ],
    food: [
      ['🍎','苹果','apple'], ['🍐','梨','pear'],
      ['🍊','橘子','tangerine orange'], ['🍋','柠檬','lemon'],
      ['🍌','香蕉','banana'], ['🍉','西瓜','watermelon'],
      ['🍇','葡萄','grapes'], ['🍓','草莓','strawberry'],
      ['🍈','甜瓜','melon'], ['🍒','樱桃','cherry'],
      ['🍑','桃','peach'], ['🥭','芒果','mango'],
      ['🍍','菠萝','pineapple'], ['🥥','椰子','coconut'],
      ['🥝','猕猴桃','kiwi'], ['🍅','番茄','tomato'],
      ['🍆','茄子','eggplant'], ['🥑','牛油果','avocado'],
      ['🥦','西兰花','broccoli'], ['🥬','白菜','leafy green'],
      ['🥒','黄瓜','cucumber'], ['🌶️','辣椒','hot pepper'],
      ['🌽','玉米','corn'], ['🥕','胡萝卜','carrot'],
      ['🧄','蒜','garlic'], ['🧅','洋葱','onion'],
      ['🥔','土豆','potato'], ['🍠','红薯','sweet potato'],
      ['🥐','牛角包','croissant'], ['🥯','贝果','bagel'],
      ['🍞','面包','bread'], ['🥖','法棍','baguette'],
      ['🧀','奶酪','cheese'], ['🥚','蛋','egg'],
      ['🍳','煎蛋','cooking fried egg'], ['🥞','煎饼','pancakes'],
      ['🧇','华夫饼','waffle'], ['🥓','培根','bacon'],
      ['🍔','汉堡','hamburger burger'], ['🍟','薯条','fries'],
      ['🍕','披萨','pizza'], ['🌭','热狗','hot dog'],
      ['🥪','三明治','sandwich'], ['🌮','卷饼','taco'],
      ['🌯','墨西哥卷','burrito'], ['🍣','寿司','sushi'],
      ['🍱','便当','bento'], ['🍜','拉面','ramen noodles'],
      ['🍝','意面','spaghetti pasta'], ['🍛','咖喱饭','curry rice'],
      ['🍲','炖菜','stew'], ['🍿','爆米花','popcorn'],
      ['🍦','冰淇淋','ice cream'], ['🍩','甜甜圈','donut'],
      ['🍪','饼干','cookie'], ['🎂','生日蛋糕','birthday cake'],
      ['🍰','蛋糕','cake'], ['🧁','纸杯蛋糕','cupcake'],
      ['🍫','巧克力','chocolate'], ['🍬','糖','candy'],
      ['🍭','棒棒糖','lollipop'], ['🍯','蜂蜜','honey'],
      ['☕','咖啡','coffee hot'], ['🍵','茶','tea'],
      ['🥤','饮料','cup drink'], ['🍺','啤酒','beer'],
      ['🍻','碰杯','beers clink'], ['🥂','香槟','champagne'],
      ['🍷','葡萄酒','wine'], ['🥃','威士忌','whiskey'],
      ['🍸','鸡尾酒','cocktail'], ['🧊','冰块','ice']
    ],
    activities: [
      ['⚽','足球','soccer football'], ['🏀','篮球','basketball'],
      ['🏈','橄榄球','american football'], ['⚾','棒球','baseball'],
      ['🥎','垒球','softball'], ['🎾','网球','tennis'],
      ['🏐','排球','volleyball'], ['🏉','英式橄榄球','rugby'],
      ['🥏','飞盘','frisbee'], ['🎱','台球','billiards 8ball'],
      ['🏓','乒乓','ping pong'], ['🏸','羽毛球','badminton'],
      ['🏒','冰球','ice hockey'], ['🏑','曲棍球','field hockey'],
      ['🏏','板球','cricket'], ['⛳','高尔夫','golf'],
      ['🏹','射箭','bow arrow'], ['🎣','钓鱼','fishing'],
      ['🥊','拳击','boxing'], ['🥋','武术','martial arts'],
      ['🛹','滑板','skateboard'], ['🎿','滑雪','ski'],
      ['⛸️','溜冰','ice skate'], ['🛷','雪橇','sled'],
      ['🥌','冰壶','curling'], ['🎯','靶心','bullseye target'],
      ['🎮','游戏','game controller'], ['🎲','骰子','dice'],
      ['♟️','棋子','chess pawn'], ['🎰','老虎机','slot machine'],
      ['🎭','表演','performing arts theater'], ['🎨','调色板','art palette'],
      ['🎬','场记板','clapper video'], ['🎤','麦克风','microphone'],
      ['🎧','耳机','headphones'], ['🎼','乐谱','music score'],
      ['🎹','钢琴','piano keyboard'], ['🥁','鼓','drum'],
      ['🎷','萨克斯','saxophone'], ['🎺','小号','trumpet'],
      ['🎸','吉他','guitar'], ['🎻','小提琴','violin'],
      ['🎪','马戏','circus tent'], ['🎟️','票','admission ticket']
    ],
    travel: [
      ['🚗','汽车','car'], ['🚕','出租车','taxi'],
      ['🚌','公交','bus'], ['🏎️','赛车','racing car'],
      ['🚓','警车','police car'], ['🚑','救护车','ambulance'],
      ['🚒','消防车','fire engine'], ['🚐','面包车','van'],
      ['🚚','卡车','truck'], ['🛴','滑板车','scooter'],
      ['🚲','自行车','bicycle bike'], ['🛵','摩托','motor scooter'],
      ['🏍️','摩托车','motorcycle'], ['🚨','警灯','police light'],
      ['🚄','高铁','high-speed train'], ['🚅','子弹头','bullet train'],
      ['🚂','蒸汽火车','steam locomotive'], ['🚆','火车','train'],
      ['🚇','地铁','metro subway'], ['🚉','车站','station'],
      ['✈️','飞机','airplane plane'], ['🛫','起飞','takeoff'],
      ['🛬','降落','landing'], ['💺','座位','seat'],
      ['🚀','火箭','rocket launch'], ['🛸','飞碟','ufo flying saucer'],
      ['🚁','直升机','helicopter'], ['⛵','帆船','sailboat'],
      ['🚤','快艇','speedboat'], ['🛳️','邮轮','cruise passenger ship'],
      ['⛴️','渡轮','ferry'], ['🚢','船','ship'],
      ['⚓','锚','anchor'], ['🗺️','地图','world map'],
      ['🗿','摩艾石像','moai'], ['🗽','自由女神','statue liberty'],
      ['🗼','东京塔','tokyo tower'], ['🏰','城堡','castle'],
      ['🏯','日本城堡','japanese castle'], ['🏟️','体育场','stadium'],
      ['🎡','摩天轮','ferris wheel'], ['🎢','过山车','roller coaster'],
      ['🎠','旋转木马','carousel'], ['⛲','喷泉','fountain'],
      ['🏖️','沙滩','beach'], ['🏝️','荒岛','desert island'],
      ['🏜️','沙漠','desert'], ['🌋','火山','volcano'],
      ['⛰️','山','mountain'], ['🏔️','雪山','snow mountain'],
      ['🗻','富士山','mount fuji'], ['🏕️','露营','camping'],
      ['⛺','帐篷','tent'], ['🏠','房子','house'],
      ['🏡','院子房','house garden'], ['🏘️','房子们','houses'],
      ['🏭','工厂','factory'], ['🏢','办公楼','office building'],
      ['🏬','商场','department store'], ['🏥','医院','hospital'],
      ['🏦','银行','bank'], ['🏨','酒店','hotel'],
      ['🏪','便利店','convenience store'], ['🏫','学校','school'],
      ['💒','婚礼','wedding'], ['🏛️','古典建筑','classical building'],
      ['⛪','教堂','church'], ['🕌','清真寺','mosque'],
      ['🕍','犹太教堂','synagogue'], ['🕋','天房','kaaba']
    ],
    objects: [
      ['📱','手机','mobile phone smartphone'], ['💻','笔记本','laptop computer'],
      ['⌨️','键盘','keyboard'], ['🖥️','台式机','desktop monitor'],
      ['🖨️','打印机','printer'], ['🖱️','鼠标','mouse click'],
      ['💾','软盘','floppy disk save'], ['💿','光盘','optical disk cd'],
      ['📀','DVD','dvd disc'], ['🧮','算盘','abacus'],
      ['🎥','摄像机','movie camera'], ['📽️','投影仪','film projector'],
      ['📞','电话','telephone'], ['☎️','电话','telephone'],
      ['📟','传呼机','pager'], ['📠','传真','fax'],
      ['📺','电视','television tv'], ['📻','收音机','radio'],
      ['🎙️','录音麦','studio microphone'], ['🧭','指南针','compass'],
      ['⏱️','秒表','stopwatch'], ['⏰','闹钟','alarm clock'],
      ['🕰️','座钟','mantelpiece clock'], ['⌛','沙漏','hourglass'],
      ['📡','卫星天线','satellite antenna'], ['🔋','电池','battery'],
      ['🔌','插头','electric plug'], ['💡','灯泡','light bulb idea'],
      ['🔦','手电筒','flashlight'], ['🕯️','蜡烛','candle'],
      ['🧯','灭火器','fire extinguisher'], ['💸','飞钱','money wings'],
      ['💵','美元','dollar banknote'], ['💴','日元','yen banknote'],
      ['💶','欧元','euro banknote'], ['💷','英镑','pound banknote'],
      ['💰','钱袋','money bag'], ['💳','信用卡','credit card'],
      ['🧾','收据','receipt'], ['💎','宝石','gem diamond'],
      ['⚖️','天平','balance scale'], ['🔧','扳手','wrench'],
      ['🔨','锤子','hammer'], ['🛠️','工具','tools hammer wrench'],
      ['⛏️','镐','pick'], ['🔩','螺丝','nut bolt'],
      ['⚙️','齿轮','gear settings'], ['🧱','砖','brick'],
      ['⛓️','链条','chains'], ['🧲','磁铁','magnet'],
      ['🔫','水枪','water pistol gun'], ['💣','炸弹','bomb'],
      ['🔪','刀','kitchen knife'], ['🗡️','匕首','dagger'],
      ['⚔️','双剑','crossed swords'], ['🛡️','盾牌','shield'],
      ['🔮','水晶球','crystal ball'], ['📿','念珠','prayer beads'],
      ['🔭','望远镜','telescope'], ['🔬','显微镜','microscope'],
      ['💊','药丸','pill'], ['💉','注射器','syringe'],
      ['🩹','创可贴','bandage'], ['🩺','听诊器','stethoscope'],
      ['🧬','DNA','dna'], ['🦠','微生物','microbe virus'],
      ['🧪','试管','test tube'], ['🌡️','温度计','thermometer'],
      ['🧹','扫帚','broom'], ['🧻','卷纸','toilet paper'],
      ['🚽','厕所','toilet'], ['🚿','淋浴','shower'],
      ['🛁','浴缸','bathtub'], ['🧼','肥皂','soap'],
      ['🪒','剃刀','razor'], ['🧽','海绵','sponge']
    ],
    symbols: [
      ['❤️','红心','red heart love'], ['🧡','橙心','orange heart'],
      ['💛','黄心','yellow heart'], ['💚','绿心','green heart'],
      ['💙','蓝心','blue heart'], ['💜','紫心','purple heart'],
      ['🖤','黑心','black heart'], ['🤍','白心','white heart'],
      ['🤎','棕心','brown heart'], ['💔','心碎','broken heart'],
      ['❣️','心叹','heart exclamation'], ['💕','双心','two hearts'],
      ['💞','旋转心','revolving hearts'], ['💓','心跳','beating heart'],
      ['💗','成长心','growing heart'], ['💖','闪光心','sparkling heart'],
      ['💘','丘比特','heart arrow'], ['💝','丝带心','heart ribbon'],
      ['💟','心饰','heart decoration'], ['☮️','和平','peace'],
      ['✝️','十字','latin cross'], ['☪️','星月','crescent star'],
      ['🕉️','嗡','om'], ['☸️','法轮','dharma wheel'],
      ['✡️','大卫星','star david'], ['☯️','阴阳','yin yang'],
      ['♈','白羊','aries'], ['♉','金牛','taurus'],
      ['♊','双子','gemini'], ['♋','巨蟹','cancer'],
      ['♌','狮子','leo'], ['♍','处女','virgo'],
      ['♎','天秤','libra'], ['♏','天蝎','scorpio'],
      ['♐','射手','sagittarius'], ['♑','摩羯','capricorn'],
      ['♒','水瓶','aquarius'], ['♓','双鱼','pisces'],
      ['⚛️','原子','atom'], ['☢️','放射','radioactive'],
      ['☣️','生物危害','biohazard'], ['♻️','回收','recycle'],
      ['⭕','圈','hollow circle'], ['✅','对勾','check green'],
      ['☑️','勾选框','check box'], ['✔️','勾','check mark'],
      ['❌','叉','cross red'], ['❎','叉按钮','cross button'],
      ['➕','加','plus'], ['➖','减','minus'],
      ['➗','除','divide'], ['✖️','乘','multiply'],
      ['🟰','等于','equals'], ['♾️','无限','infinity'],
      ['‼️','双叹','double exclamation'], ['⁉️','叹问','exclamation question'],
      ['❓','问号','question red'], ['❔','白问号','question white'],
      ['❕','白叹','exclamation white'], ['❗','红叹','exclamation red'],
      ['©️','版权','copyright'], ['®️','注册','registered'],
      ['™️','商标','trade mark'], ['💲','美元符号','dollar sign'],
      ['💱','汇率','currency exchange'], ['⚠️','警告','warning'],
      ['🚫','禁止','prohibited no'], ['🆗','OK','ok button'],
      ['🆕','新','new button'], ['🆓','免费','free button'],
      ['🆒','酷','cool button'], ['🆘','SOS','sos button'],
      ['🔞','18+','no under 18 adult'], ['♠️','黑桃','spade'],
      ['♥️','红桃','heart suit'], ['♦️','方块','diamond suit'],
      ['♣️','梅花','club suit'], ['🔴','红圆','red circle'],
      ['🟠','橙圆','orange circle'], ['🟡','黄圆','yellow circle'],
      ['🟢','绿圆','green circle'], ['🔵','蓝圆','blue circle'],
      ['🟣','紫圆','purple circle'], ['⚫','黑圆','black circle'],
      ['⚪','白圆','white circle'], ['🟥','红方','red square'],
      ['🟧','橙方','orange square'], ['🟨','黄方','yellow square'],
      ['🟩','绿方','green square'], ['🟦','蓝方','blue square'],
      ['🟪','紫方','purple square'], ['⬛','黑方','black square'],
      ['⬜','白方','white square']
    ],
    flags: [
      ['🏁','格子旗','chequered flag finish'], ['🚩','三角旗','triangular flag'],
      ['🎌','交叉旗','crossed flags'], ['🏴','黑旗','black flag'],
      ['🏳️','白旗','white flag'], ['🏳️‍🌈','彩虹旗','rainbow flag lgbt'],
      ['🏴‍☠️','海盗旗','pirate flag'], ['🇨🇳','中国','china cn'],
      ['🇺🇸','美国','united states usa'], ['🇬🇧','英国','united kingdom uk'],
      ['🇯🇵','日本','japan jp'], ['🇰🇷','韩国','south korea kr'],
      ['🇫🇷','法国','france fr'], ['🇩🇪','德国','germany de'],
      ['🇮🇹','意大利','italy it'], ['🇪🇸','西班牙','spain es'],
      ['🇷🇺','俄罗斯','russia ru'], ['🇨🇦','加拿大','canada ca'],
      ['🇦🇺','澳大利亚','australia au'], ['🇧🇷','巴西','brazil br'],
      ['🇮🇳','印度','india in']
    ],
    tech: [
      ['💻','电脑','laptop computer dev'], ['🖥️','显示器','desktop monitor'],
      ['⌨️','键盘','keyboard'], ['🖱️','鼠标','mouse'],
      ['📱','手机','phone mobile'], ['📲','手机箭头','mobile arrow'],
      ['🖨️','打印机','printer'], ['💾','软盘','floppy save'],
      ['💿','光盘','cd disk'], ['📀','DVD','dvd'],
      ['🗄️','文件柜','file cabinet db database'], ['📦','包','package box module'],
      ['📫','邮箱','mailbox mail'], ['📮','邮筒','postbox'],
      ['🌐','网络','globe network web'], ['🌍','地球','earth'],
      ['🔗','链接','link url'], ['🔒','锁定','locked secure'],
      ['🔓','解锁','unlocked'], ['🔑','钥匙','key password'],
      ['🔐','上锁','locked with key'], ['🛡️','盾','shield security'],
      ['⚙️','齿轮','gear settings config'], ['🛠️','工具','tools fix'],
      ['🔧','扳手','wrench'], ['🔨','锤子','hammer'],
      ['🔩','螺丝','nut bolt'], ['🧰','工具箱','toolbox'],
      ['🐛','Bug','bug insect debug'], ['🚀','火箭','rocket deploy launch'],
      ['📊','柱状图','bar chart data'], ['📈','上升','chart increasing growth'],
      ['📉','下降','chart decreasing down'], ['📋','剪贴板','clipboard copy'],
      ['📌','图钉','pushpin pin'], ['📍','圆图钉','round pushpin location'],
      ['📎','回形针','paperclip attach'], ['📏','直尺','ruler straight'],
      ['📐','三角尺','triangular ruler'], ['✂️','剪刀','scissors cut'],
      ['🗑️','垃圾桶','trash garbage delete'], ['🔍','放大镜','search magnify'],
      ['🔎','放大镜右','search'], ['🖊️','笔','pen'],
      ['🖋️','钢笔','fountain pen'], ['✒️','黑笔尖','black nib'],
      ['✏️','铅笔','pencil edit'], ['📝','备忘录','memo note'],
      ['📄','文件','page document'], ['📑','书签标签','bookmark tabs'],
      ['🔖','书签','bookmark'], ['📓','笔记本','notebook'],
      ['📚','书堆','books stack'], ['📖','打开的书','open book read'],
      ['📶','信号','signal bars'], ['📡','卫星','satellite dish'],
      ['🔋','电池','battery'], ['💡','灯泡','idea bulb'],
      ['📅','日历','calendar date'], ['🗓️','螺旋日历','spiral calendar'],
      ['🗂️','文件夹','file folder'], ['📁','文件夹','folder dir'],
      ['📂','打开文件夹','open folder'], ['🧑‍💻','程序员','technologist coder dev'],
      ['👨‍💻','男程序员','man technologist coder'], ['👩‍💻','女程序员','woman technologist coder'],
      ['🔧','扳手','wrench fix'], ['⏱️','秒表','stopwatch time perf'],
      ['💯','100分','hundred perfect score'], ['🎉','派对礼花','tada celebrate release'],
      ['🔥','火','fire hot trending'], ['⚡','闪电','lightning zap fast'],
      ['✨','闪亮','sparkles shiny new'], ['⚠️','警告','warning']
    ]
  };

  // ============================================================
  // 2. 工具函数
  // ============================================================
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function toCodePoints(str) {
    return Array.from(str).map(function (ch) { return ch.codePointAt(0); });
  }
  function toCPStr(str) {
    return toCodePoints(str).map(function (n) {
      return 'U+' + n.toString(16).toUpperCase().padStart(4, '0');
    }).join(' ');
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function normalize(str) {
    // 去掉变体选择符 (VS16)
    return String(str || '').replace(/\uFE0F/g, '');
  }

  function getFormats(item) {
    var ch = item.char;
    var cps = toCodePoints(ch);
    var chars = Array.from(ch);
    return [
      { key: 'char',  label: '字符',         value: ch },
      { key: 'cp',    label: 'Unicode 码点', value: cps.map(function (n) {
        return 'U+' + n.toString(16).toUpperCase().padStart(4, '0');
      }).join(' ') },
      { key: 'htmlD', label: 'HTML 十进制',  value: chars.map(function (c) {
        return '&#' + c.codePointAt(0) + ';';
      }).join('') },
      { key: 'htmlH', label: 'HTML 十六进制', value: chars.map(function (c) {
        return '&#x' + c.codePointAt(0).toString(16).toUpperCase() + ';';
      }).join('') },
      { key: 'css',   label: 'CSS 转义',      value: chars.map(function (c) {
        return '\\' + c.codePointAt(0).toString(16).toUpperCase();
      }).join(' ') },
      { key: 'js',    label: 'JS 转义',       value: chars.map(function (c) {
        return '\\u{' + c.codePointAt(0).toString(16).toUpperCase() + '}';
      }).join('') },
      { key: 'url',   label: 'URL 编码',      value: encodeURIComponent(ch) }
    ];
  }

  function fmtValue(item, key) {
    var list = getFormats(item);
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i].value;
    }
    return item.char;
  }
  function fmtLabel(key) {
    switch (key) {
      case 'char':  return '字符';
      case 'cp':    return 'Unicode 码点';
      case 'htmlD': return 'HTML 十进制';
      case 'htmlH': return 'HTML 十六进制';
      case 'css':   return 'CSS 转义';
      case 'js':    return 'JS 转义';
      case 'url':   return 'URL 编码';
      default:      return key;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function exportPng(item) {
    var size = 512;
    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.font = Math.floor(size * 0.72) +
      'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.char, size / 2, size / 2 + size * 0.03);

    canvas.toBlob(function (blob) {
      if (!blob) { showToast('导出失败'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'emoji-' + item.cpStr.replace(/[^0-9A-F]/g, '') + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      showToast('已导出 PNG');
    }, 'image/png');
  }

  // ============================================================
  // 3. 状态 & 存储
  // ============================================================
  var LS_FAV = 'ic-favs-v1';
  var LS_RECENT = 'ic-recent-v1';
  var LS_OPTS = 'ic-opts-v1';

  var state = {
    cat: 'all',
    q: '',
    view: 'grid',
    size: 'md',
    copyFormat: 'char',
    favs: [],
    recent: []
  };

  function loadLS() {
    try {
      state.favs = JSON.parse(localStorage.getItem(LS_FAV) || '[]') || [];
      state.recent = JSON.parse(localStorage.getItem(LS_RECENT) || '[]') || [];
      var opts = JSON.parse(localStorage.getItem(LS_OPTS) || '{}') || {};
      if (opts.view === 'grid' || opts.view === 'list') state.view = opts.view;
      if (opts.size === 'sm' || opts.size === 'md' || opts.size === 'lg') state.size = opts.size;
      if (opts.copyFormat) state.copyFormat = opts.copyFormat;
    } catch (e) { /* ignore */ }
  }
  function saveLS() {
    try {
      localStorage.setItem(LS_FAV, JSON.stringify(state.favs));
      localStorage.setItem(LS_RECENT, JSON.stringify(state.recent));
      localStorage.setItem(LS_OPTS, JSON.stringify({
        view: state.view, size: state.size, copyFormat: state.copyFormat
      }));
    } catch (e) { /* ignore */ }
  }

  function addRecent(char) {
    var idx = state.recent.indexOf(char);
    if (idx >= 0) state.recent.splice(idx, 1);
    state.recent.unshift(char);
    if (state.recent.length > 30) state.recent.length = 30;
    saveLS();
  }
  function toggleFav(char) {
    var idx = state.favs.indexOf(char);
    if (idx >= 0) state.favs.splice(idx, 1);
    else state.favs.unshift(char);
    saveLS();
    return idx < 0;
  }

  // ============================================================
  // 4. 展开数据
  // ============================================================
  var EMOJIS = [];
  var MAP = {};
  Object.keys(RAW).forEach(function (cat) {
    RAW[cat].forEach(function (row) {
      var ch = row[0], name = row[1], kw = row[2] || '';
      var item = {
        char: ch,
        name: name,
        keywords: kw,
        cat: cat,
        searchText: (name + ' ' + kw + ' ' + cat).toLowerCase(),
        cpStr: toCPStr(ch)
      };
      EMOJIS.push(item);
      if (!MAP[ch]) MAP[ch] = item;
    });
  });

  // ============================================================
  // 5. 分类
  // ============================================================
  var CAT_LIST = [
    { key: 'all',       label: '全部' },
    { key: 'smileys',   label: '😃 表情' },
    { key: 'people',    label: '👤 人物' },
    { key: 'animals',   label: '🐾 动物' },
    { key: 'food',      label: '🍔 食物' },
    { key: 'activities',label: '🎯 活动' },
    { key: 'travel',    label: '✈️ 旅行' },
    { key: 'objects',   label: '💡 物品' },
    { key: 'symbols',   label: '✔️ 符号' },
    { key: 'flags',     label: '🏁 旗帜' },
    { key: 'tech',      label: '💻 开发' },
    { key: 'fav',       label: '⭐ 收藏' },
    { key: 'recent',    label: '🕘 最近' }
  ];

  // ============================================================
  // 6. DOM
  // ============================================================
  var grid = $('#ic-grid');
  var searchInput = $('#ic-search');
  var searchWrap = $('.ic-search-wrap');
  var searchClearBtn = $('#ic-search-clear');
  var catsWrap = $('#ic-categories');
  var countEl = $('#ic-count');
  var copyFormatSelect = $('#ic-copy-format');
  var randomBtn = $('#ic-random');

  var modal = $('#ic-modal');
  var modalCloseBtn = $('#ic-modal-close');
  var modalChar = $('#ic-modal-char');
  var modalName = $('#ic-modal-name');
  var modalCp = $('#ic-modal-cp');
  var modalFavBtn = $('#ic-modal-fav');
  var modalPngBtn = $('#ic-modal-png');
  var modalFmtList = $('#ic-fmt-list');

  // Toast
  var toast = document.createElement('div');
  toast.className = 'ic-toast';
  document.body.appendChild(toast);
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  // ============================================================
  // 7. 渲染
  // ============================================================
  function renderCats() {
    catsWrap.innerHTML = '';
    CAT_LIST.forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ic-cat' + (c.key === state.cat ? ' active' : '');
      btn.dataset.cat = c.key;
      btn.textContent = c.label;
      catsWrap.appendChild(btn);
    });
  }

  function getFiltered() {
    var source;
    if (state.cat === 'fav') {
      source = state.favs.map(function (c) { return MAP[c]; }).filter(Boolean);
    } else if (state.cat === 'recent') {
      source = state.recent.map(function (c) { return MAP[c]; }).filter(Boolean);
    } else if (state.cat === 'all') {
      source = EMOJIS;
    } else {
      source = EMOJIS.filter(function (e) { return e.cat === state.cat; });
    }

    var q = (state.q || '').trim().toLowerCase();
    if (q) {
      var nq = normalize(q);
      source = source.filter(function (e) {
        if (normalize(e.char) === nq) return true;
        if (q.indexOf('u+') === 0 && e.cpStr.toLowerCase().indexOf(q) !== -1) return true;
        if (e.cpStr.toLowerCase().indexOf(q) !== -1) return true;
        return e.searchText.indexOf(q) !== -1;
      });
    }
    return source;
  }

  function render() {
    var list = getFiltered();
    countEl.textContent = list.length;
    grid.dataset.size = state.size;
    grid.classList.toggle('ic-list', state.view === 'list');

    if (list.length === 0) {
      grid.innerHTML = '<div class="ic-empty">没有匹配的图标</div>';
      return;
    }

    var frag = document.createDocumentFragment();
    list.forEach(function (e) {
      var card = document.createElement('div');
      card.className = 'ic-card';
      card.dataset.char = e.char;
      card.title = e.name + ' · ' + e.cpStr;
      card.innerHTML =
        '<div class="ic-char">' + e.char + '</div>' +
        '<div class="ic-name">' + escapeHtml(e.name) + '</div>' +
        '<button type="button" class="ic-more" title="更多格式">⋯</button>';
      frag.appendChild(card);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  // ============================================================
  // 8. 弹窗
  // ============================================================
  function openModal(char) {
    var item = MAP[char];
    if (!item) return;

    modal.dataset.char = char;
    modalChar.textContent = item.char;
    modalName.textContent = item.name;
    modalCp.textContent = item.cpStr;

    var isFav = state.favs.indexOf(char) >= 0;
    modalFavBtn.textContent = isFav ? '⭐ 已收藏' : '☆ 收藏';
    modalFavBtn.classList.toggle('active', isFav);

    var formats = getFormats(item);
    modalFmtList.innerHTML = formats.map(function (f) {
      return '<div class="ic-fmt-row">' +
        '<div class="ic-fmt-label">' + escapeHtml(f.label) + '</div>' +
        '<code class="ic-fmt-val" title="' + escapeHtml(f.value) + '">' +
          escapeHtml(f.value) + '</code>' +
        '<button type="button" class="ic-fmt-copy" data-fmt="' + f.key + '">复制</button>' +
        '</div>';
    }).join('');

    modal.classList.add('open');
    addRecent(char);
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  // ============================================================
  // 9. 事件绑定
  // ============================================================
  function bindEvents() {
    // 搜索
    var searchTimer = null;
    searchInput.addEventListener('input', function () {
      var v = this.value;
      searchWrap.classList.toggle('has-value', !!v);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.q = v.trim();
        render();
      }, 100);
    });
    searchClearBtn.addEventListener('click', function () {
      searchInput.value = '';
      searchWrap.classList.remove('has-value');
      state.q = '';
      searchInput.focus();
      render();
    });

    // 分类
    catsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.ic-cat');
      if (!btn) return;
      state.cat = btn.dataset.cat;
      $$('.ic-cat', catsWrap).forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      render();
    });

    // 复制格式
    copyFormatSelect.value = state.copyFormat;
    copyFormatSelect.addEventListener('change', function () {
      state.copyFormat = this.value;
      saveLS();
    });

    // 视图切换
    $$('.ic-view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.view === state.view);
      btn.addEventListener('click', function () {
        state.view = btn.dataset.view;
        $$('.ic-view-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        saveLS();
        render();
      });
    });

    // 大小切换
    $$('.ic-size-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.size === state.size);
      btn.addEventListener('click', function () {
        state.size = btn.dataset.size;
        $$('.ic-size-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        saveLS();
        render();
      });
    });

    // 随机
    randomBtn.addEventListener('click', function () {
      if (EMOJIS.length === 0) return;
      var item = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      openModal(item.char);
    });

    // 网格点击（委托）
    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.ic-card');
      if (!card) return;
      var char = card.dataset.char;
      var item = MAP[char];
      if (!item) return;

      // 点击 "⋯" 打开详情
      if (e.target.closest('.ic-more')) {
        e.preventDefault();
        openModal(char);
        return;
      }

      // 点击卡片 = 按当前格式复制
      var key = state.copyFormat;
      var val = fmtValue(item, key);
      copyText(val).then(function () {
        showToast('已复制' + fmtLabel(key) + '：' + val);
      });
      addRecent(char);
    });

    // 弹窗
    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    // 弹窗内各格式复制
    modalFmtList.addEventListener('click', function (e) {
      var btn = e.target.closest('.ic-fmt-copy');
      if (!btn) return;
      var char = modal.dataset.char;
      var item = MAP[char];
      if (!item) return;
      var key = btn.dataset.fmt;
      var val = fmtValue(item, key);
      copyText(val).then(function () {
        showToast('已复制' + fmtLabel(key));
      });
      addRecent(char);
    });

    // 收藏切换
    modalFavBtn.addEventListener('click', function () {
      var char = modal.dataset.char;
      if (!char) return;
      var added = toggleFav(char);
      modalFavBtn.textContent = added ? '⭐ 已收藏' : '☆ 收藏';
      modalFavBtn.classList.toggle('active', added);
      showToast(added ? '已加入收藏' : '已取消收藏');
      // 如果当前在收藏分类，刷新
      if (state.cat === 'fav') render();
    });

    // 导出 PNG
    modalPngBtn.addEventListener('click', function () {
      var char = modal.dataset.char;
      var item = MAP[char];
      if (item) exportPng(item);
    });

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (modal.classList.contains('open')) { closeModal(); return; }
        if (document.activeElement === searchInput) { searchInput.blur(); return; }
      }
      // / 聚焦搜索
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
      // Ctrl+K / Cmd+K 聚焦搜索
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  // ============================================================
  // 10. 启动
  // ============================================================
  loadLS();
  renderCats();
  bindEvents();
  render();

})();