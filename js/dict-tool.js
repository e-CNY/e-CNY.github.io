/* js/dict-tool.js */
(function () {
  'use strict';

  /* ================= 常量 ================= */
  var THEME_KEY = 'dict_tool_theme_v1';

  /* ================= 数据：网络端口 ================= */
  // [port, protocol, service, description, category]
  var PORTS_RAW = [
    ['20', 'TCP', 'FTP-DATA', 'FTP 数据传输（主动模式）', 'system'],
    ['21', 'TCP', 'FTP', 'FTP 控制连接', 'system'],
    ['22', 'TCP', 'SSH', '安全外壳协议 / SFTP', 'system'],
    ['23', 'TCP', 'Telnet', '远程登录（明文，不安全）', 'system'],
    ['25', 'TCP', 'SMTP', '简单邮件传输协议', 'system'],
    ['37', 'TCP', 'TIME', '时间协议（已废弃）', 'system'],
    ['43', 'TCP', 'WHOIS', '域名查询服务', 'system'],
    ['53', 'TCP/UDP', 'DNS', '域名系统', 'system'],
    ['67', 'UDP', 'DHCP-Server', 'DHCP 服务器', 'system'],
    ['68', 'UDP', 'DHCP-Client', 'DHCP 客户端', 'system'],
    ['69', 'UDP', 'TFTP', '简单文件传输', 'system'],
    ['70', 'TCP', 'Gopher', 'Gopher 协议（历史）', 'system'],
    ['79', 'TCP', 'Finger', '用户信息查询（历史）', 'system'],
    ['80', 'TCP', 'HTTP', '万维网服务', 'system'],
    ['88', 'TCP', 'Kerberos', 'Kerberos 认证', 'system'],
    ['102', 'TCP', 'ISO-TSAP', 'ISO 传输服务', 'system'],
    ['110', 'TCP', 'POP3', '邮局协议 v3', 'system'],
    ['111', 'TCP', 'RPC', 'Sun RPC portmapper', 'system'],
    ['113', 'TCP', 'Ident', '用户身份识别', 'system'],
    ['119', 'TCP', 'NNTP', '网络新闻传输', 'system'],
    ['123', 'UDP', 'NTP', '网络时间协议', 'system'],
    ['135', 'TCP', 'MS-RPC', 'Windows RPC', 'system'],
    ['137', 'UDP', 'NetBIOS-NS', 'NetBIOS 名称服务', 'system'],
    ['138', 'UDP', 'NetBIOS-DGM', 'NetBIOS 数据报', 'system'],
    ['139', 'TCP', 'NetBIOS-SSN', 'NetBIOS 会话服务', 'system'],
    ['143', 'TCP', 'IMAP', '互联网邮件访问', 'system'],
    ['161', 'UDP', 'SNMP', '简单网络管理', 'system'],
    ['162', 'UDP', 'SNMP-Trap', 'SNMP Trap', 'system'],
    ['177', 'UDP', 'XDMCP', 'X Display Manager', 'system'],
    ['179', 'TCP', 'BGP', '边界网关协议', 'system'],
    ['194', 'TCP', 'IRC', 'Internet 中继聊天', 'system'],
    ['201', 'UDP', 'AppleTalk', 'AppleTalk RTMP', 'system'],
    ['318', 'UDP', 'TSP', '时间戳协议', 'system'],
    ['389', 'TCP', 'LDAP', '轻量目录访问', 'system'],
    ['411', 'TCP', 'DirectConnect', 'Direct Connect 集线器', 'system'],
    ['443', 'TCP', 'HTTPS', '安全超文本传输', 'system'],
    ['445', 'TCP', 'SMB', 'Windows 文件共享', 'system'],
    ['464', 'TCP/UDP', 'Kerberos-PWD', 'Kerberos 密码修改', 'system'],
    ['465', 'TCP', 'SMTPS', 'SMTP over SSL', 'system'],
    ['500', 'UDP', 'IKE', 'IPsec 密钥交换', 'system'],
    ['512', 'TCP', 'rexec', '远程执行（不安全）', 'system'],
    ['513', 'TCP', 'rlogin', '远程登录（不安全）', 'system'],
    ['514', 'UDP', 'Syslog', '系统日志', 'system'],
    ['515', 'TCP', 'LPD', '远程打印', 'system'],
    ['520', 'UDP', 'RIP', '路由信息协议', 'system'],
    ['546', 'UDP', 'DHCPv6-Client', 'DHCPv6 客户端', 'system'],
    ['547', 'UDP', 'DHCPv6-Server', 'DHCPv6 服务器', 'system'],
    ['548', 'TCP', 'AFP', 'Apple 归档协议', 'system'],
    ['554', 'TCP/UDP', 'RTSP', '实时流协议', 'system'],
    ['563', 'TCP/UDP', 'NNTPS', 'NNTP over SSL', 'system'],
    ['587', 'TCP', 'SMTP-Sub', 'SMTP 提交服务', 'system'],
    ['631', 'TCP', 'IPP', 'Internet 打印协议', 'system'],
    ['636', 'TCP', 'LDAPS', 'LDAP over SSL', 'system'],
    ['639', 'TCP', 'MSDP', 'Multicast Source Discovery', 'system'],
    ['646', 'TCP', 'LDP', 'Label Distribution Protocol', 'system'],
    ['700', 'TCP', 'EPP', '域名注册协议', 'system'],
    ['749', 'TCP', 'Kerberos-ADM', 'Kerberos 管理', 'system'],
    ['989', 'TCP', 'FTPS-Data', 'FTP over SSL 数据', 'file'],
    ['990', 'TCP', 'FTPS', 'FTP over SSL 控制', 'file'],
    ['992', 'TCP', 'Telnet-SSL', 'Telnet over SSL', 'system'],
    ['993', 'TCP', 'IMAPS', 'IMAP over SSL', 'mail'],
    ['994', 'TCP', 'IRCS', 'IRC over SSL', 'system'],
    ['995', 'TCP', 'POP3S', 'POP3 over SSL', 'mail'],
    ['1080', 'TCP', 'SOCKS', 'SOCKS 代理', 'web'],
    ['1194', 'UDP', 'OpenVPN', 'OpenVPN', 'remote'],
    ['1433', 'TCP', 'MSSQL', 'Microsoft SQL Server', 'database'],
    ['1521', 'TCP', 'Oracle-DB', 'Oracle 数据库', 'database'],
    ['1701', 'UDP', 'L2TP', 'Layer 2 隧道', 'remote'],
    ['1723', 'TCP', 'PPTP', '点对点隧道', 'remote'],
    ['1883', 'TCP', 'MQTT', 'MQTT (IoT 消息)', 'message'],
    ['1935', 'TCP', 'RTMP', 'Real-Time Messaging', 'stream'],
    ['2049', 'TCP/UDP', 'NFS', '网络文件系统', 'file'],
    ['2082', 'TCP', 'cPanel', 'cPanel 用户面板', 'web'],
    ['2083', 'TCP', 'cPanel-SSL', 'cPanel SSL', 'web'],
    ['2086', 'TCP', 'WHM', 'WHM 面板', 'web'],
    ['2087', 'TCP', 'WHM-SSL', 'WHM SSL', 'web'],
    ['2095', 'TCP', 'Webmail', 'cPanel Webmail', 'web'],
    ['2096', 'TCP', 'Webmail-SSL', 'cPanel Webmail SSL', 'web'],
    ['2181', 'TCP', 'ZooKeeper', 'Apache ZooKeeper', 'dev'],
    ['2195', 'TCP', 'APNs', 'Apple 推送通知', 'message'],
    ['2196', 'TCP', 'APNs-Feedback', 'Apple 推送反馈', 'message'],
    ['2222', 'TCP', 'SSH-Alt', 'SSH 备用端口', 'remote'],
    ['2375', 'TCP', 'Docker', 'Docker 守护进程', 'dev'],
    ['2376', 'TCP', 'Docker-TLS', 'Docker 加密', 'dev'],
    ['2379', 'TCP', 'etcd', 'etcd 客户端', 'dev'],
    ['2380', 'TCP', 'etcd-Peer', 'etcd 集群', 'dev'],
    ['3000', 'TCP', 'Node/React', 'Node/React 开发', 'dev'],
    ['3128', 'TCP', 'Squid', 'Squid 缓存代理', 'web'],
    ['3260', 'TCP', 'iSCSI', 'iSCSI 目标', 'file'],
    ['3268', 'TCP', 'AD-Global', 'AD 全局目录', 'system'],
    ['3269', 'TCP', 'AD-Global-SSL', 'AD 全局目录 SSL', 'system'],
    ['3306', 'TCP', 'MySQL', 'MySQL 数据库', 'database'],
    ['3389', 'TCP/UDP', 'RDP', '远程桌面协议', 'remote'],
    ['3478', 'TCP/UDP', 'STUN', 'NAT 穿透', 'stream'],
    ['3479', 'TCP/UDP', 'STUNS', 'STUN over TLS', 'stream'],
    ['4000', 'TCP', 'Diablo II', 'Diablo II（游戏）', 'stream'],
    ['4369', 'TCP', 'EPMD', 'Erlang Port Mapper', 'dev'],
    ['4444', 'TCP', 'Metasploit', 'Metasploit 监听', 'remote'],
    ['4505', 'TCP', 'SaltStack', 'SaltStack Master', 'dev'],
    ['4506', 'TCP', 'SaltStack-Pub', 'SaltStack Publish', 'dev'],
    ['4848', 'TCP', 'GlassFish', 'GlassFish 管理', 'dev'],
    ['5000', 'TCP', 'Flask/UPnP', 'Flask/UPnP', 'dev'],
    ['5044', 'TCP', 'Logstash-Beats', 'Logstash Beats 输入', 'dev'],
    ['5060', 'TCP/UDP', 'SIP', 'SIP 信令', 'stream'],
    ['5061', 'TCP', 'SIP-TLS', 'SIP over TLS', 'stream'],
    ['5222', 'TCP', 'XMPP-Client', 'XMPP 客户端连接', 'message'],
    ['5269', 'TCP', 'XMPP-Server', 'XMPP 服务端连接', 'message'],
    ['5280', 'TCP', 'XMPP-BOSH', 'XMPP BOSH', 'message'],
    ['5353', 'UDP', 'mDNS', '组播 DNS (Bonjour)', 'system'],
    ['5355', 'UDP', 'LLMNR', '本地链路多播名称解析', 'system'],
    ['5432', 'TCP', 'PostgreSQL', 'PostgreSQL 数据库', 'database'],
    ['5555', 'TCP', 'ADB', 'Android Debug Bridge', 'dev'],
    ['5601', 'TCP', 'Kibana', 'Kibana 面板', 'dev'],
    ['5666', 'TCP', 'NRPE', 'Nagios Remote Plugin', 'dev'],
    ['5672', 'TCP', 'AMQP', 'AMQP 消息队列', 'message'],
    ['5683', 'UDP', 'CoAP', 'IoT 轻量协议', 'message'],
    ['5900', 'TCP', 'VNC', '虚拟网络计算', 'remote'],
    ['5984', 'TCP', 'CouchDB', 'CouchDB 数据库', 'database'],
    ['5985', 'TCP', 'WinRM', 'Windows 远程管理', 'remote'],
    ['5986', 'TCP', 'WinRM-SSL', 'WinRM SSL', 'remote'],
    ['6000', 'TCP', 'X11', 'X Window 系统', 'remote'],
    ['61616', 'TCP', 'ActiveMQ', 'ActiveMQ 消息', 'message'],
    ['6379', 'TCP', 'Redis', 'Redis 数据库', 'database'],
    ['6443', 'TCP', 'K8s-API', 'Kubernetes API Server', 'dev'],
    ['7001', 'TCP', 'WebLogic', 'Oracle WebLogic', 'web'],
    ['7199', 'TCP', 'Cassandra-JMX', 'Cassandra JMX', 'database'],
    ['7474', 'TCP', 'Neo4j', 'Neo4j HTTP', 'database'],
    ['7547', 'TCP', 'TR-069', 'CWMP 协议', 'remote'],
    ['8000', 'TCP', 'HTTP-Alt', 'HTTP 备用端口', 'web'],
    ['8001', 'TCP', 'HTTP-Alt', 'HTTP 备用端口', 'web'],
    ['8008', 'TCP', 'HTTP-Alt', 'HTTP 备用端口', 'web'],
    ['8009', 'TCP', 'AJP/Cast', 'AJP/Chromecast', 'web'],
    ['8080', 'TCP', 'HTTP-Alt', 'Tomcat/代理', 'web'],
    ['8081', 'TCP', 'HTTP-Alt', 'HTTP 备用端口', 'web'],
    ['8086', 'TCP', 'InfluxDB', 'InfluxDB HTTP', 'database'],
    ['8088', 'TCP', 'YARN', 'Hadoop YARN', 'dev'],
    ['8123', 'TCP', 'Home Assistant', 'Home Assistant', 'dev'],
    ['8161', 'TCP', 'ActiveMQ-Web', 'ActiveMQ 管理', 'message'],
    ['8200', 'TCP', 'Vault', 'HashiCorp Vault', 'dev'],
    ['8443', 'TCP', 'HTTPS-Alt', 'HTTPS 备用端口', 'web'],
    ['8880', 'TCP', 'HTTP-Alt', 'HTTP 备用端口', 'web'],
    ['8888', 'TCP', 'Jupyter', 'Jupyter Notebook', 'dev'],
    ['9000', 'TCP', 'PHP-FPM', 'PHP-FPM / SonarQube', 'dev'],
    ['9042', 'TCP', 'Cassandra', 'Cassandra 原生协议', 'database'],
    ['9090', 'TCP', 'Prometheus', 'Prometheus 监控', 'dev'],
    ['9091', 'TCP', 'Transmission', 'Transmission BT', 'dev'],
    ['9092', 'TCP', 'Kafka', 'Apache Kafka', 'message'],
    ['9093', 'TCP', 'Alertmanager', 'Prometheus Alertmanager', 'dev'],
    ['9100', 'TCP', 'Node-Exporter', 'Prometheus Node Exporter', 'dev'],
    ['9200', 'TCP', 'Elasticsearch', 'Elasticsearch HTTP', 'database'],
    ['9300', 'TCP', 'ES-Cluster', 'Elasticsearch 集群', 'database'],
    ['9418', 'TCP', 'Git', 'Git 协议', 'dev'],
    ['9443', 'TCP', 'Portainer', 'Portainer HTTPS', 'dev'],
    ['9999', 'TCP', 'HTTP-Alt', 'HTTP 备用端口', 'web'],
    ['10000', 'TCP', 'Webmin', 'Webmin 管理', 'remote'],
    ['11211', 'TCP/UDP', 'Memcached', 'Memcached 缓存', 'database'],
    ['15672', 'TCP', 'RabbitMQ', 'RabbitMQ 管理面板', 'message'],
    ['20000', 'TCP/UDP', 'DNP3', '工业 SCADA 协议', 'other'],
    ['25565', 'TCP', 'Minecraft', 'Minecraft 服务器', 'stream'],
    ['27015', 'UDP', 'Source-Engine', 'CS/Source 游戏', 'stream'],
    ['27017', 'TCP', 'MongoDB', 'MongoDB 数据库', 'database'],
    ['27018', 'TCP', 'MongoDB-Shard', 'MongoDB 分片', 'database'],
    ['50000', 'TCP', 'DB2', 'IBM DB2 数据库', 'database'],
    ['50070', 'TCP', 'HDFS', 'Hadoop HDFS NameNode', 'database']
  ];

  var PORT_CATEGORIES = {
    all: '全部',
    system: '系统协议',
    web: 'Web 服务',
    mail: '邮件服务',
    file: '文件传输',
    remote: '远程访问',
    database: '数据库',
    message: '消息队列',
    stream: '流媒体',
    dev: '开发工具',
    other: '其他'
  };

  var PORT_QUICK_TAGS = ['HTTP', 'HTTPS', 'SSH', 'MySQL', 'Redis', 'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes'];

  /* ================= 数据：国家 ISO 代码 ================= */
  // [nameZh, nameEn, iso2, iso3, numeric, continent]
  var COUNTRIES_RAW = [
    ['中国', 'China', 'CN', 'CHN', '156', 'asia'],
    ['中国香港', 'Hong Kong', 'HK', 'HKG', '344', 'asia'],
    ['中国澳门', 'Macau', 'MO', 'MAC', '446', 'asia'],
    ['中国台湾', 'Taiwan', 'TW', 'TWN', '158', 'asia'],
    ['日本', 'Japan', 'JP', 'JPN', '392', 'asia'],
    ['韩国', 'South Korea', 'KR', 'KOR', '410', 'asia'],
    ['朝鲜', 'North Korea', 'KP', 'PRK', '408', 'asia'],
    ['蒙古', 'Mongolia', 'MN', 'MNG', '496', 'asia'],
    ['新加坡', 'Singapore', 'SG', 'SGP', '702', 'asia'],
    ['马来西亚', 'Malaysia', 'MY', 'MYS', '458', 'asia'],
    ['印度尼西亚', 'Indonesia', 'ID', 'IDN', '360', 'asia'],
    ['菲律宾', 'Philippines', 'PH', 'PHL', '608', 'asia'],
    ['泰国', 'Thailand', 'TH', 'THA', '764', 'asia'],
    ['越南', 'Vietnam', 'VN', 'VNM', '704', 'asia'],
    ['老挝', 'Laos', 'LA', 'LAO', '418', 'asia'],
    ['柬埔寨', 'Cambodia', 'KH', 'KHM', '116', 'asia'],
    ['缅甸', 'Myanmar', 'MM', 'MMR', '104', 'asia'],
    ['文莱', 'Brunei', 'BN', 'BRN', '096', 'asia'],
    ['东帝汶', 'Timor-Leste', 'TL', 'TLS', '626', 'asia'],
    ['印度', 'India', 'IN', 'IND', '356', 'asia'],
    ['巴基斯坦', 'Pakistan', 'PK', 'PAK', '586', 'asia'],
    ['孟加拉国', 'Bangladesh', 'BD', 'BGD', '050', 'asia'],
    ['斯里兰卡', 'Sri Lanka', 'LK', 'LKA', '144', 'asia'],
    ['尼泊尔', 'Nepal', 'NP', 'NPL', '524', 'asia'],
    ['不丹', 'Bhutan', 'BT', 'BTN', '064', 'asia'],
    ['马尔代夫', 'Maldives', 'MV', 'MDV', '462', 'asia'],
    ['阿富汗', 'Afghanistan', 'AF', 'AFG', '004', 'asia'],
    ['伊朗', 'Iran', 'IR', 'IRN', '364', 'asia'],
    ['伊拉克', 'Iraq', 'IQ', 'IRQ', '368', 'asia'],
    ['沙特阿拉伯', 'Saudi Arabia', 'SA', 'SAU', '682', 'asia'],
    ['阿联酋', 'United Arab Emirates', 'AE', 'ARE', '784', 'asia'],
    ['卡塔尔', 'Qatar', 'QA', 'QAT', '634', 'asia'],
    ['科威特', 'Kuwait', 'KW', 'KWT', '414', 'asia'],
    ['巴林', 'Bahrain', 'BH', 'BHR', '048', 'asia'],
    ['阿曼', 'Oman', 'OM', 'OMN', '512', 'asia'],
    ['也门', 'Yemen', 'YE', 'YEM', '887', 'asia'],
    ['约旦', 'Jordan', 'JO', 'JOR', '400', 'asia'],
    ['黎巴嫩', 'Lebanon', 'LB', 'LBN', '422', 'asia'],
    ['叙利亚', 'Syria', 'SY', 'SYR', '760', 'asia'],
    ['以色列', 'Israel', 'IL', 'ISR', '376', 'asia'],
    ['巴勒斯坦', 'Palestine', 'PS', 'PSE', '275', 'asia'],
    ['土耳其', 'Turkey', 'TR', 'TUR', '792', 'asia'],
    ['塞浦路斯', 'Cyprus', 'CY', 'CYP', '196', 'asia'],
    ['格鲁吉亚', 'Georgia', 'GE', 'GEO', '268', 'asia'],
    ['亚美尼亚', 'Armenia', 'AM', 'ARM', '051', 'asia'],
    ['阿塞拜疆', 'Azerbaijan', 'AZ', 'AZE', '031', 'asia'],
    ['哈萨克斯坦', 'Kazakhstan', 'KZ', 'KAZ', '398', 'asia'],
    ['乌兹别克斯坦', 'Uzbekistan', 'UZ', 'UZB', '860', 'asia'],
    ['土库曼斯坦', 'Turkmenistan', 'TM', 'TKM', '795', 'asia'],
    ['吉尔吉斯斯坦', 'Kyrgyzstan', 'KG', 'KGZ', '417', 'asia'],
    ['塔吉克斯坦', 'Tajikistan', 'TJ', 'TJK', '762', 'asia'],
    ['英国', 'United Kingdom', 'GB', 'GBR', '826', 'europe'],
    ['爱尔兰', 'Ireland', 'IE', 'IRL', '372', 'europe'],
    ['法国', 'France', 'FR', 'FRA', '250', 'europe'],
    ['德国', 'Germany', 'DE', 'DEU', '276', 'europe'],
    ['意大利', 'Italy', 'IT', 'ITA', '380', 'europe'],
    ['西班牙', 'Spain', 'ES', 'ESP', '724', 'europe'],
    ['葡萄牙', 'Portugal', 'PT', 'PRT', '620', 'europe'],
    ['荷兰', 'Netherlands', 'NL', 'NLD', '528', 'europe'],
    ['比利时', 'Belgium', 'BE', 'BEL', '056', 'europe'],
    ['卢森堡', 'Luxembourg', 'LU', 'LUX', '442', 'europe'],
    ['瑞士', 'Switzerland', 'CH', 'CHE', '756', 'europe'],
    ['奥地利', 'Austria', 'AT', 'AUT', '040', 'europe'],
    ['丹麦', 'Denmark', 'DK', 'DNK', '208', 'europe'],
    ['瑞典', 'Sweden', 'SE', 'SWE', '752', 'europe'],
    ['挪威', 'Norway', 'NO', 'NOR', '578', 'europe'],
    ['芬兰', 'Finland', 'FI', 'FIN', '246', 'europe'],
    ['冰岛', 'Iceland', 'IS', 'ISL', '352', 'europe'],
    ['波兰', 'Poland', 'PL', 'POL', '616', 'europe'],
    ['捷克', 'Czech Republic', 'CZ', 'CZE', '203', 'europe'],
    ['斯洛伐克', 'Slovakia', 'SK', 'SVK', '703', 'europe'],
    ['匈牙利', 'Hungary', 'HU', 'HUN', '348', 'europe'],
    ['罗马尼亚', 'Romania', 'RO', 'ROU', '642', 'europe'],
    ['保加利亚', 'Bulgaria', 'BG', 'BGR', '100', 'europe'],
    ['希腊', 'Greece', 'GR', 'GRC', '300', 'europe'],
    ['克罗地亚', 'Croatia', 'HR', 'HRV', '191', 'europe'],
    ['斯洛文尼亚', 'Slovenia', 'SI', 'SVN', '705', 'europe'],
    ['塞尔维亚', 'Serbia', 'RS', 'SRB', '688', 'europe'],
    ['波黑', 'Bosnia', 'BA', 'BIH', '070', 'europe'],
    ['黑山', 'Montenegro', 'ME', 'MNE', '499', 'europe'],
    ['北马其顿', 'North Macedonia', 'MK', 'MKD', '807', 'europe'],
    ['阿尔巴尼亚', 'Albania', 'AL', 'ALB', '008', 'europe'],
    ['爱沙尼亚', 'Estonia', 'EE', 'EST', '233', 'europe'],
    ['拉脱维亚', 'Latvia', 'LV', 'LVA', '428', 'europe'],
    ['立陶宛', 'Lithuania', 'LT', 'LTU', '440', 'europe'],
    ['白俄罗斯', 'Belarus', 'BY', 'BLR', '112', 'europe'],
    ['乌克兰', 'Ukraine', 'UA', 'UKR', '804', 'europe'],
    ['摩尔多瓦', 'Moldova', 'MD', 'MDA', '498', 'europe'],
    ['俄罗斯', 'Russia', 'RU', 'RUS', '643', 'europe'],
    ['马耳他', 'Malta', 'MT', 'MLT', '470', 'europe'],
    ['梵蒂冈', 'Vatican City', 'VA', 'VAT', '336', 'europe'],
    ['摩纳哥', 'Monaco', 'MC', 'MCO', '492', 'europe'],
    ['圣马力诺', 'San Marino', 'SM', 'SMR', '674', 'europe'],
    ['列支敦士登', 'Liechtenstein', 'LI', 'LIE', '438', 'europe'],
    ['安道尔', 'Andorra', 'AD', 'AND', '020', 'europe'],
    ['美国', 'United States', 'US', 'USA', '840', 'north-america'],
    ['加拿大', 'Canada', 'CA', 'CAN', '124', 'north-america'],
    ['墨西哥', 'Mexico', 'MX', 'MEX', '484', 'north-america'],
    ['危地马拉', 'Guatemala', 'GT', 'GTM', '320', 'north-america'],
    ['伯利兹', 'Belize', 'BZ', 'BLZ', '084', 'north-america'],
    ['萨尔瓦多', 'El Salvador', 'SV', 'SLV', '222', 'north-america'],
    ['洪都拉斯', 'Honduras', 'HN', 'HND', '340', 'north-america'],
    ['尼加拉瓜', 'Nicaragua', 'NI', 'NIC', '558', 'north-america'],
    ['哥斯达黎加', 'Costa Rica', 'CR', 'CRI', '188', 'north-america'],
    ['巴拿马', 'Panama', 'PA', 'PAN', '591', 'north-america'],
    ['古巴', 'Cuba', 'CU', 'CUB', '192', 'north-america'],
    ['牙买加', 'Jamaica', 'JM', 'JAM', '388', 'north-america'],
    ['海地', 'Haiti', 'HT', 'HTI', '332', 'north-america'],
    ['多米尼加', 'Dominican Republic', 'DO', 'DOM', '214', 'north-america'],
    ['巴哈马', 'Bahamas', 'BS', 'BHS', '044', 'north-america'],
    ['特立尼达和多巴哥', 'Trinidad and Tobago', 'TT', 'TTO', '780', 'north-america'],
    ['巴巴多斯', 'Barbados', 'BB', 'BRB', '052', 'north-america'],
    ['巴西', 'Brazil', 'BR', 'BRA', '076', 'south-america'],
    ['阿根廷', 'Argentina', 'AR', 'ARG', '032', 'south-america'],
    ['智利', 'Chile', 'CL', 'CHL', '152', 'south-america'],
    ['哥伦比亚', 'Colombia', 'CO', 'COL', '170', 'south-america'],
    ['秘鲁', 'Peru', 'PE', 'PER', '604', 'south-america'],
    ['委内瑞拉', 'Venezuela', 'VE', 'VEN', '862', 'south-america'],
    ['厄瓜多尔', 'Ecuador', 'EC', 'ECU', '218', 'south-america'],
    ['玻利维亚', 'Bolivia', 'BO', 'BOL', '068', 'south-america'],
    ['巴拉圭', 'Paraguay', 'PY', 'PRY', '600', 'south-america'],
    ['乌拉圭', 'Uruguay', 'UY', 'URY', '858', 'south-america'],
    ['圭亚那', 'Guyana', 'GY', 'GUY', '328', 'south-america'],
    ['苏里南', 'Suriname', 'SR', 'SUR', '740', 'south-america'],
    ['埃及', 'Egypt', 'EG', 'EGY', '818', 'africa'],
    ['利比亚', 'Libya', 'LY', 'LBY', '434', 'africa'],
    ['突尼斯', 'Tunisia', 'TN', 'TUN', '788', 'africa'],
    ['阿尔及利亚', 'Algeria', 'DZ', 'DZA', '012', 'africa'],
    ['摩洛哥', 'Morocco', 'MA', 'MAR', '504', 'africa'],
    ['苏丹', 'Sudan', 'SD', 'SDN', '729', 'africa'],
    ['南苏丹', 'South Sudan', 'SS', 'SSD', '728', 'africa'],
    ['埃塞俄比亚', 'Ethiopia', 'ET', 'ETH', '231', 'africa'],
    ['厄立特里亚', 'Eritrea', 'ER', 'ERI', '232', 'africa'],
    ['吉布提', 'Djibouti', 'DJ', 'DJI', '262', 'africa'],
    ['索马里', 'Somalia', 'SO', 'SOM', '706', 'africa'],
    ['肯尼亚', 'Kenya', 'KE', 'KEN', '404', 'africa'],
    ['乌干达', 'Uganda', 'UG', 'UGA', '800', 'africa'],
    ['坦桑尼亚', 'Tanzania', 'TZ', 'TZA', '834', 'africa'],
    ['卢旺达', 'Rwanda', 'RW', 'RWA', '646', 'africa'],
    ['布隆迪', 'Burundi', 'BI', 'BDI', '108', 'africa'],
    ['刚果（金）', 'DR Congo', 'CD', 'COD', '180', 'africa'],
    ['刚果（布）', 'Congo', 'CG', 'COG', '178', 'africa'],
    ['加蓬', 'Gabon', 'GA', 'GAB', '266', 'africa'],
    ['喀麦隆', 'Cameroon', 'CM', 'CMR', '120', 'africa'],
    ['中非', 'Central African Republic', 'CF', 'CAF', '140', 'africa'],
    ['乍得', 'Chad', 'TD', 'TCD', '148', 'africa'],
    ['尼日尔', 'Niger', 'NE', 'NER', '562', 'africa'],
    ['尼日利亚', 'Nigeria', 'NG', 'NGA', '566', 'africa'],
    ['贝宁', 'Benin', 'BJ', 'BEN', '204', 'africa'],
    ['多哥', 'Togo', 'TG', 'TGO', '768', 'africa'],
    ['加纳', 'Ghana', 'GH', 'GHA', '288', 'africa'],
    ['科特迪瓦', 'Ivory Coast', 'CI', 'CIV', '384', 'africa'],
    ['布基纳法索', 'Burkina Faso', 'BF', 'BFA', '854', 'africa'],
    ['马里', 'Mali', 'ML', 'MLI', '466', 'africa'],
    ['塞内加尔', 'Senegal', 'SN', 'SEN', '686', 'africa'],
    ['几内亚', 'Guinea', 'GN', 'GIN', '324', 'africa'],
    ['塞拉利昂', 'Sierra Leone', 'SL', 'SLE', '694', 'africa'],
    ['利比里亚', 'Liberia', 'LR', 'LBR', '430', 'africa'],
    ['冈比亚', 'Gambia', 'GM', 'GMB', '270', 'africa'],
    ['毛里塔尼亚', 'Mauritania', 'MR', 'MRT', '478', 'africa'],
    ['西撒哈拉', 'Western Sahara', 'EH', 'ESH', '732', 'africa'],
    ['佛得角', 'Cape Verde', 'CV', 'CPV', '132', 'africa'],
    ['安哥拉', 'Angola', 'AO', 'AGO', '024', 'africa'],
    ['赞比亚', 'Zambia', 'ZM', 'ZMB', '894', 'africa'],
    ['马拉维', 'Malawi', 'MW', 'MWI', '454', 'africa'],
    ['莫桑比克', 'Mozambique', 'MZ', 'MOZ', '508', 'africa'],
    ['津巴布韦', 'Zimbabwe', 'ZW', 'ZWE', '716', 'africa'],
    ['博茨瓦纳', 'Botswana', 'BW', 'BWA', '072', 'africa'],
    ['纳米比亚', 'Namibia', 'NA', 'NAM', '516', 'africa'],
    ['南非', 'South Africa', 'ZA', 'ZAF', '710', 'africa'],
    ['莱索托', 'Lesotho', 'LS', 'LSO', '426', 'africa'],
    ['斯威士兰', 'Eswatini', 'SZ', 'SWZ', '748', 'africa'],
    ['马达加斯加', 'Madagascar', 'MG', 'MDG', '450', 'africa'],
    ['毛里求斯', 'Mauritius', 'MU', 'MUS', '480', 'africa'],
    ['塞舌尔', 'Seychelles', 'SC', 'SYC', '690', 'africa'],
    ['科摩罗', 'Comoros', 'KM', 'COM', '174', 'africa'],
    ['澳大利亚', 'Australia', 'AU', 'AUS', '036', 'oceania'],
    ['新西兰', 'New Zealand', 'NZ', 'NZL', '554', 'oceania'],
    ['巴布亚新几内亚', 'Papua New Guinea', 'PG', 'PNG', '598', 'oceania'],
    ['斐济', 'Fiji', 'FJ', 'FJI', '242', 'oceania'],
    ['所罗门群岛', 'Solomon Islands', 'SB', 'SLB', '090', 'oceania'],
    ['瓦努阿图', 'Vanuatu', 'VU', 'VUT', '548', 'oceania'],
    ['萨摩亚', 'Samoa', 'WS', 'WSM', '882', 'oceania'],
    ['汤加', 'Tonga', 'TO', 'TON', '776', 'oceania'],
    ['密克罗尼西亚', 'Micronesia', 'FM', 'FSM', '583', 'oceania'],
    ['马绍尔群岛', 'Marshall Islands', 'MH', 'MHL', '584', 'oceania'],
    ['帕劳', 'Palau', 'PW', 'PLW', '585', 'oceania'],
    ['基里巴斯', 'Kiribati', 'KI', 'KIR', '296', 'oceania'],
    ['图瓦卢', 'Tuvalu', 'TV', 'TUV', '798', 'oceania'],
    ['瑙鲁', 'Nauru', 'NR', 'NRU', '520', 'oceania'],
    ['南极洲', 'Antarctica', 'AQ', 'ATA', '010', 'antarctica']
  ];

  var COUNTRY_CATEGORIES = {
    all: '全部',
    asia: '🌏 亚洲',
    europe: '🌍 欧洲',
    'north-america': '🌎 北美洲',
    'south-america': '🌎 南美洲',
    africa: '🌍 非洲',
    oceania: '🌏 大洋洲',
    antarctica: '❄️ 南极洲'
  };

  var COUNTRY_QUICK_TAGS = ['CN', 'US', 'JP', 'GB', 'DE', 'FR', 'KR', 'RU'];

  /* ================= 数据：国际区号 ================= */
  // [nameZh, nameEn, code, region]
  var AREA_RAW = [
    ['中国', 'China', '+86', 'asia'],
    ['中国香港', 'Hong Kong', '+852', 'asia'],
    ['中国澳门', 'Macau', '+853', 'asia'],
    ['中国台湾', 'Taiwan', '+886', 'asia'],
    ['日本', 'Japan', '+81', 'asia'],
    ['韩国', 'South Korea', '+82', 'asia'],
    ['朝鲜', 'North Korea', '+850', 'asia'],
    ['蒙古', 'Mongolia', '+976', 'asia'],
    ['新加坡', 'Singapore', '+65', 'asia'],
    ['马来西亚', 'Malaysia', '+60', 'asia'],
    ['印度尼西亚', 'Indonesia', '+62', 'asia'],
    ['菲律宾', 'Philippines', '+63', 'asia'],
    ['泰国', 'Thailand', '+66', 'asia'],
    ['越南', 'Vietnam', '+84', 'asia'],
    ['老挝', 'Laos', '+856', 'asia'],
    ['柬埔寨', 'Cambodia', '+855', 'asia'],
    ['缅甸', 'Myanmar', '+95', 'asia'],
    ['文莱', 'Brunei', '+673', 'asia'],
    ['东帝汶', 'Timor-Leste', '+670', 'asia'],
    ['印度', 'India', '+91', 'asia'],
    ['巴基斯坦', 'Pakistan', '+92', 'asia'],
    ['孟加拉国', 'Bangladesh', '+880', 'asia'],
    ['斯里兰卡', 'Sri Lanka', '+94', 'asia'],
    ['尼泊尔', 'Nepal', '+977', 'asia'],
    ['不丹', 'Bhutan', '+975', 'asia'],
    ['马尔代夫', 'Maldives', '+960', 'asia'],
    ['阿富汗', 'Afghanistan', '+93', 'asia'],
    ['伊朗', 'Iran', '+98', 'asia'],
    ['伊拉克', 'Iraq', '+964', 'asia'],
    ['沙特阿拉伯', 'Saudi Arabia', '+966', 'asia'],
    ['阿联酋', 'United Arab Emirates', '+971', 'asia'],
    ['卡塔尔', 'Qatar', '+974', 'asia'],
    ['科威特', 'Kuwait', '+965', 'asia'],
    ['巴林', 'Bahrain', '+973', 'asia'],
    ['阿曼', 'Oman', '+968', 'asia'],
    ['也门', 'Yemen', '+967', 'asia'],
    ['约旦', 'Jordan', '+962', 'asia'],
    ['黎巴嫩', 'Lebanon', '+961', 'asia'],
    ['叙利亚', 'Syria', '+963', 'asia'],
    ['以色列', 'Israel', '+972', 'asia'],
    ['巴勒斯坦', 'Palestine', '+970', 'asia'],
    ['土耳其', 'Turkey', '+90', 'asia'],
    ['塞浦路斯', 'Cyprus', '+357', 'asia'],
    ['格鲁吉亚', 'Georgia', '+995', 'asia'],
    ['亚美尼亚', 'Armenia', '+374', 'asia'],
    ['阿塞拜疆', 'Azerbaijan', '+994', 'asia'],
    ['哈萨克斯坦', 'Kazakhstan', '+7', 'asia'],
    ['乌兹别克斯坦', 'Uzbekistan', '+998', 'asia'],
    ['土库曼斯坦', 'Turkmenistan', '+993', 'asia'],
    ['吉尔吉斯斯坦', 'Kyrgyzstan', '+996', 'asia'],
    ['塔吉克斯坦', 'Tajikistan', '+992', 'asia'],
    ['英国', 'United Kingdom', '+44', 'europe'],
    ['爱尔兰', 'Ireland', '+353', 'europe'],
    ['法国', 'France', '+33', 'europe'],
    ['德国', 'Germany', '+49', 'europe'],
    ['意大利', 'Italy', '+39', 'europe'],
    ['西班牙', 'Spain', '+34', 'europe'],
    ['葡萄牙', 'Portugal', '+351', 'europe'],
    ['荷兰', 'Netherlands', '+31', 'europe'],
    ['比利时', 'Belgium', '+32', 'europe'],
    ['卢森堡', 'Luxembourg', '+352', 'europe'],
    ['瑞士', 'Switzerland', '+41', 'europe'],
    ['奥地利', 'Austria', '+43', 'europe'],
    ['丹麦', 'Denmark', '+45', 'europe'],
    ['瑞典', 'Sweden', '+46', 'europe'],
    ['挪威', 'Norway', '+47', 'europe'],
    ['芬兰', 'Finland', '+358', 'europe'],
    ['冰岛', 'Iceland', '+354', 'europe'],
    ['波兰', 'Poland', '+48', 'europe'],
    ['捷克', 'Czech Republic', '+420', 'europe'],
    ['斯洛伐克', 'Slovakia', '+421', 'europe'],
    ['匈牙利', 'Hungary', '+36', 'europe'],
    ['罗马尼亚', 'Romania', '+40', 'europe'],
    ['保加利亚', 'Bulgaria', '+359', 'europe'],
    ['希腊', 'Greece', '+30', 'europe'],
    ['克罗地亚', 'Croatia', '+385', 'europe'],
    ['斯洛文尼亚', 'Slovenia', '+386', 'europe'],
    ['塞尔维亚', 'Serbia', '+381', 'europe'],
    ['波黑', 'Bosnia', '+387', 'europe'],
    ['黑山', 'Montenegro', '+382', 'europe'],
    ['北马其顿', 'North Macedonia', '+389', 'europe'],
    ['阿尔巴尼亚', 'Albania', '+355', 'europe'],
    ['爱沙尼亚', 'Estonia', '+372', 'europe'],
    ['拉脱维亚', 'Latvia', '+371', 'europe'],
    ['立陶宛', 'Lithuania', '+370', 'europe'],
    ['白俄罗斯', 'Belarus', '+375', 'europe'],
    ['乌克兰', 'Ukraine', '+380', 'europe'],
    ['摩尔多瓦', 'Moldova', '+373', 'europe'],
    ['俄罗斯', 'Russia', '+7', 'europe'],
    ['马耳他', 'Malta', '+356', 'europe'],
    ['梵蒂冈', 'Vatican City', '+379', 'europe'],
    ['摩纳哥', 'Monaco', '+377', 'europe'],
    ['圣马力诺', 'San Marino', '+378', 'europe'],
    ['列支敦士登', 'Liechtenstein', '+423', 'europe'],
    ['安道尔', 'Andorra', '+376', 'europe'],
    ['美国', 'United States', '+1', 'americas'],
    ['加拿大', 'Canada', '+1', 'americas'],
    ['墨西哥', 'Mexico', '+52', 'americas'],
    ['危地马拉', 'Guatemala', '+502', 'americas'],
    ['伯利兹', 'Belize', '+501', 'americas'],
    ['萨尔瓦多', 'El Salvador', '+503', 'americas'],
    ['洪都拉斯', 'Honduras', '+504', 'americas'],
    ['尼加拉瓜', 'Nicaragua', '+505', 'americas'],
    ['哥斯达黎加', 'Costa Rica', '+506', 'americas'],
    ['巴拿马', 'Panama', '+507', 'americas'],
    ['古巴', 'Cuba', '+53', 'americas'],
    ['牙买加', 'Jamaica', '+1876', 'americas'],
    ['海地', 'Haiti', '+509', 'americas'],
    ['多米尼加', 'Dominican Republic', '+1809', 'americas'],
    ['巴哈马', 'Bahamas', '+1242', 'americas'],
    ['特立尼达和多巴哥', 'Trinidad and Tobago', '+1868', 'americas'],
    ['巴巴多斯', 'Barbados', '+1246', 'americas'],
    ['巴西', 'Brazil', '+55', 'americas'],
    ['阿根廷', 'Argentina', '+54', 'americas'],
    ['智利', 'Chile', '+56', 'americas'],
    ['哥伦比亚', 'Colombia', '+57', 'americas'],
    ['秘鲁', 'Peru', '+51', 'americas'],
    ['委内瑞拉', 'Venezuela', '+58', 'americas'],
    ['厄瓜多尔', 'Ecuador', '+593', 'americas'],
    ['玻利维亚', 'Bolivia', '+591', 'americas'],
    ['巴拉圭', 'Paraguay', '+595', 'americas'],
    ['乌拉圭', 'Uruguay', '+598', 'americas'],
    ['圭亚那', 'Guyana', '+592', 'americas'],
    ['苏里南', 'Suriname', '+597', 'americas'],
    ['埃及', 'Egypt', '+20', 'africa'],
    ['利比亚', 'Libya', '+218', 'africa'],
    ['突尼斯', 'Tunisia', '+216', 'africa'],
    ['阿尔及利亚', 'Algeria', '+213', 'africa'],
    ['摩洛哥', 'Morocco', '+212', 'africa'],
    ['苏丹', 'Sudan', '+249', 'africa'],
    ['南苏丹', 'South Sudan', '+211', 'africa'],
    ['埃塞俄比亚', 'Ethiopia', '+251', 'africa'],
    ['厄立特里亚', 'Eritrea', '+291', 'africa'],
    ['吉布提', 'Djibouti', '+253', 'africa'],
    ['索马里', 'Somalia', '+252', 'africa'],
    ['肯尼亚', 'Kenya', '+254', 'africa'],
    ['乌干达', 'Uganda', '+256', 'africa'],
    ['坦桑尼亚', 'Tanzania', '+255', 'africa'],
    ['卢旺达', 'Rwanda', '+250', 'africa'],
    ['布隆迪', 'Burundi', '+257', 'africa'],
    ['刚果（金）', 'DR Congo', '+243', 'africa'],
    ['刚果（布）', 'Congo', '+242', 'africa'],
    ['加蓬', 'Gabon', '+241', 'africa'],
    ['喀麦隆', 'Cameroon', '+237', 'africa'],
    ['中非', 'Central African Republic', '+236', 'africa'],
    ['乍得', 'Chad', '+235', 'africa'],
    ['尼日尔', 'Niger', '+227', 'africa'],
    ['尼日利亚', 'Nigeria', '+234', 'africa'],
    ['贝宁', 'Benin', '+229', 'africa'],
    ['多哥', 'Togo', '+228', 'africa'],
    ['加纳', 'Ghana', '+233', 'africa'],
    ['科特迪瓦', 'Ivory Coast', '+225', 'africa'],
    ['布基纳法索', 'Burkina Faso', '+226', 'africa'],
    ['马里', 'Mali', '+223', 'africa'],
    ['塞内加尔', 'Senegal', '+221', 'africa'],
    ['几内亚', 'Guinea', '+224', 'africa'],
    ['塞拉利昂', 'Sierra Leone', '+232', 'africa'],
    ['利比里亚', 'Liberia', '+231', 'africa'],
    ['冈比亚', 'Gambia', '+220', 'africa'],
    ['毛里塔尼亚', 'Mauritania', '+222', 'africa'],
    ['佛得角', 'Cape Verde', '+238', 'africa'],
    ['安哥拉', 'Angola', '+244', 'africa'],
    ['赞比亚', 'Zambia', '+260', 'africa'],
    ['马拉维', 'Malawi', '+265', 'africa'],
    ['莫桑比克', 'Mozambique', '+258', 'africa'],
    ['津巴布韦', 'Zimbabwe', '+263', 'africa'],
    ['博茨瓦纳', 'Botswana', '+267', 'africa'],
    ['纳米比亚', 'Namibia', '+264', 'africa'],
    ['南非', 'South Africa', '+27', 'africa'],
    ['莱索托', 'Lesotho', '+266', 'africa'],
    ['斯威士兰', 'Eswatini', '+268', 'africa'],
    ['马达加斯加', 'Madagascar', '+261', 'africa'],
    ['毛里求斯', 'Mauritius', '+230', 'africa'],
    ['塞舌尔', 'Seychelles', '+248', 'africa'],
    ['科摩罗', 'Comoros', '+269', 'africa'],
    ['澳大利亚', 'Australia', '+61', 'oceania'],
    ['新西兰', 'New Zealand', '+64', 'oceania'],
    ['巴布亚新几内亚', 'Papua New Guinea', '+675', 'oceania'],
    ['斐济', 'Fiji', '+679', 'oceania'],
    ['所罗门群岛', 'Solomon Islands', '+677', 'oceania'],
    ['瓦努阿图', 'Vanuatu', '+678', 'oceania'],
    ['萨摩亚', 'Samoa', '+685', 'oceania'],
    ['汤加', 'Tonga', '+676', 'oceania'],
    ['密克罗尼西亚', 'Micronesia', '+691', 'oceania'],
    ['马绍尔群岛', 'Marshall Islands', '+692', 'oceania'],
    ['帕劳', 'Palau', '+680', 'oceania'],
    ['基里巴斯', 'Kiribati', '+686', 'oceania'],
    ['图瓦卢', 'Tuvalu', '+688', 'oceania'],
    ['瑙鲁', 'Nauru', '+674', 'oceania'],
    ['国际免费电话', 'International Freephone', '+800', 'special'],
    ['国际卫星电话', 'Inmarsat', '+870', 'special'],
    ['国际电信', 'International Telecom', '+888', 'special']
  ];

  var AREA_CATEGORIES = {
    all: '全部',
    asia: '🌏 亚洲',
    europe: '🌍 欧洲',
    americas: '🌎 美洲',
    africa: '🌍 非洲',
    oceania: '🌏 大洋洲',
    special: '✨ 特殊号段'
  };

  var AREA_QUICK_TAGS = ['+86', '+1', '+44', '+81', '+82', '+49', '+33', '+61'];

  /* ================= 构建数据集 ================= */
  // 统一成 { columns: [...], rows: [{...}], filters: {...}, quickTags: [...] } 结构
  function buildDatasets() {
    return {
      port: {
        columns: [
          { key: 'port', label: '端口', sortable: true, sortType: 'num', cls: 'mono' },
          { key: 'protocol', label: '协议', sortable: true, render: renderProtocolBadge },
          { key: 'service', label: '服务名称', sortable: true, cls: 'service' },
          { key: 'description', label: '说明', sortable: false, cls: 'primary' },
          { key: 'category', label: '分类', sortable: true, render: renderCategoryBadge }
        ],
        rows: PORTS_RAW.map(function (r) {
          return {
            port: r[0],
            protocol: r[1],
            service: r[2],
            description: r[3],
            category: r[4]
          };
        }),
        filters: PORT_CATEGORIES,
        quickTags: PORT_QUICK_TAGS,
        searchFields: ['port', 'protocol', 'service', 'description', 'category']
      },
      country: {
        columns: [
          { key: 'nameZh', label: '国家/地区', sortable: true, cls: 'primary' },
          { key: 'nameEn', label: 'English', sortable: true },
          { key: 'iso2', label: 'ISO 2位', sortable: true, cls: 'mono' },
          { key: 'iso3', label: 'ISO 3位', sortable: true, cls: 'mono' },
          { key: 'numeric', label: '数字代码', sortable: true, cls: 'mono' },
          { key: 'continent', label: '大洲', sortable: true, render: renderContinentBadge }
        ],
        rows: COUNTRIES_RAW.map(function (r) {
          return {
            nameZh: r[0],
            nameEn: r[1],
            iso2: r[2],
            iso3: r[3],
            numeric: r[4],
            continent: r[5]
          };
        }),
        filters: COUNTRY_CATEGORIES,
        filterKey: 'continent',
        quickTags: COUNTRY_QUICK_TAGS,
        searchFields: ['nameZh', 'nameEn', 'iso2', 'iso3', 'numeric', 'continent']
      },
      area: {
        columns: [
          { key: 'nameZh', label: '国家/地区', sortable: true, cls: 'primary' },
          { key: 'nameEn', label: 'English', sortable: true },
          { key: 'code', label: '国际区号', sortable: true, cls: 'mono' },
          { key: 'region', label: '地区', sortable: true, render: renderContinentBadge }
        ],
        rows: AREA_RAW.map(function (r) {
          return {
            nameZh: r[0],
            nameEn: r[1],
            code: r[2],
            region: r[3]
          };
        }),
        filters: AREA_CATEGORIES,
        filterKey: 'region',
        quickTags: AREA_QUICK_TAGS,
        searchFields: ['nameZh', 'nameEn', 'code', 'region']
      }
    };
  }

  /* ================= 状态 ================= */
  var DATASETS = buildDatasets();
  var state = {
    tab: 'port',
    keyword: '',
    category: 'all',
    sortKey: null,
    sortDir: 'asc',  // 'asc' | 'desc'
    theme: 'light'
  };
  var els = {};
  var toastTimer = null;

  /* ================= 渲染辅助 ================= */
  function renderProtocolBadge(val) {
    var cls = 'both';
    if (val === 'TCP') cls = 'tcp';
    else if (val === 'UDP') cls = 'udp';
    return '<span class="badge ' + cls + '">' + escapeHtml(val) + '</span>';
  }

  function renderCategoryBadge(val) {
    var map = PORT_CATEGORIES;
    var label = map[val] || val;
    return '<span class="badge">' + escapeHtml(label) + '</span>';
  }

  function renderContinentBadge(val) {
    var map = COUNTRY_CATEGORIES;
    var label = map[val] || val;
    return '<span class="badge">' + escapeHtml(label) + '</span>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ================= Toast ================= */
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 1600);
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('✅ 已复制：' + text);
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ 已复制：' + text);
    } catch (e) { showToast('❌ 复制失败'); }
  }

  /* ================= 数据处理 ================= */
  function getFilteredAndSorted() {
    var ds = DATASETS[state.tab];
    var kw = state.keyword.toLowerCase().trim();
    var cat = state.category;
    var filterKey = ds.filterKey;
    var result = ds.rows;

    // 分类过滤
    if (cat !== 'all' && filterKey) {
      result = result.filter(function (row) {
        return row[filterKey] === cat;
      });
    }

    // 搜索
    if (kw) {
      result = result.filter(function (row) {
        var fields = ds.searchFields || Object.keys(row);
        for (var i = 0; i < fields.length; i++) {
          var v = row[fields[i]];
          if (v == null) continue;
          if (String(v).toLowerCase().indexOf(kw) >= 0) return true;
        }
        return false;
      });
    }

    // 排序
    if (state.sortKey) {
      var col = ds.columns.filter(function (c) { return c.key === state.sortKey; })[0];
      var isNum = col && col.sortType === 'num';
      result = result.slice().sort(function (a, b) {
        var av = a[state.sortKey];
        var bv = b[state.sortKey];
        var cmp;
        if (isNum) {
          cmp = (parseFloat(av) || 0) - (parseFloat(bv) || 0);
        } else {
          cmp = String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), 'zh-Hans-CN');
        }
        return state.sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }

  /* ================= 渲染分类栏 ================= */
  function renderFilters() {
    var ds = DATASETS[state.tab];
    var filters = ds.filters || {};
    var filterKey = ds.filterKey;
    var rows = ds.rows;

    // 统计每个分类的条数
    var counts = { all: rows.length };
    if (filterKey) {
      rows.forEach(function (r) {
        var v = r[filterKey];
        counts[v] = (counts[v] || 0) + 1;
      });
    }

    var html = '';
    Object.keys(filters).forEach(function (key) {
      if (key !== 'all' && !counts[key]) return; // 没数据的分类隐藏
      var active = key === state.category ? ' active' : '';
      var count = counts[key] || 0;
      html += '<button class="dc-filter-chip' + active + '" data-cat="' + escapeHtml(key) + '" type="button">' +
        escapeHtml(filters[key]) +
        '<span class="chip-count">' + count + '</span>' +
        '</button>';
    });
    els.filters.innerHTML = html;
  }

  /* ================= 渲染快捷标签 ================= */
  function renderQuickTags() {
    var ds = DATASETS[state.tab];
    var tags = ds.quickTags || [];
    if (tags.length === 0) {
      els.quickTags.innerHTML = '';
      return;
    }
    var html = '';
    tags.forEach(function (tag) {
      html += '<button class="dc-quick-tag" data-tag="' + escapeHtml(tag) + '" type="button">' + escapeHtml(tag) + '</button>';
    });
    els.quickTags.innerHTML = html;
  }

  /* ================= 渲染表头 ================= */
  function renderThead() {
    var ds = DATASETS[state.tab];
    var html = '<tr>';
    ds.columns.forEach(function (col) {
      var sorted = state.sortKey === col.key;
      var cls = col.sortable ? '' : ' no-sort';
      if (sorted) cls += ' sorted';
      var icon = '';
      if (col.sortable) {
        if (sorted) {
          icon = '<span class="dc-sort-icon">' + (state.sortDir === 'asc' ? '▲' : '▼') + '</span>';
        } else {
          icon = '<span class="dc-sort-icon">⇅</span>';
        }
      }
      html += '<th class="' + cls.trim() + '" data-key="' + col.key + '">' +
        escapeHtml(col.label) + icon + '</th>';
    });
    html += '</tr>';
    els.thead.innerHTML = html;
  }

  /* ================= 渲染表格 ================= */
  function renderTableBody() {
    var ds = DATASETS[state.tab];
    var rows = getFilteredAndSorted();
    var colCount = ds.columns.length;

    if (rows.length === 0) {
      els.tbody.innerHTML = '<tr class="dc-empty-row"><td colspan="' + colCount + '">' +
        (state.keyword || state.category !== 'all' ? '没有匹配结果，试试换个关键词' : '暂无数据') +
        '</td></tr>';
      return;
    }

    var html = '';
    rows.forEach(function (row) {
      html += '<tr>';
      ds.columns.forEach(function (col) {
        var val = row[col.key];
        var content;
        if (col.render) {
          content = col.render(val, row);
        } else {
          content = escapeHtml(val);
        }
        var cellCls = [];
        if (col.cls) cellCls.push(col.cls);
        if (col.mono) cellCls.push('mono');
        var copyable = val != null && String(val).trim() !== '' && !col.render;
        if (copyable) cellCls.push('dc-copyable');
        var copyAttr = copyable
          ? ' data-copy="' + escapeHtml(String(val)) + '"'
          : '';
        html += '<td class="' + cellCls.join(' ') + '"' + copyAttr + '>' + content + '</td>';
      });
      html += '</tr>';
    });
    els.tbody.innerHTML = html;
  }

  /* ================= 渲染计数 ================= */
  function renderCountInfo() {
    var ds = DATASETS[state.tab];
    var total = ds.rows.length;
    var shown = getFilteredAndSorted().length;
    var parts = [];
    parts.push('显示 <span class="count-highlight">' + shown + '</span> / ' + total + ' 条');

    if (state.keyword) {
      parts.push('关键词：<span class="count-highlight">「' + escapeHtml(state.keyword) + '」</span>');
    }
    if (state.category !== 'all' && ds.filters[state.category]) {
      parts.push('分类：<span class="count-highlight">' + escapeHtml(ds.filters[state.category]) + '</span>');
    }

    var hint = '💡 点击任意单元格可复制内容';
    els.countInfo.innerHTML = '<span>' + parts.join(' · ') + '</span>' +
      '<span style="opacity:.7;font-size:.72rem;">' + hint + '</span>';
  }

  /* ================= 全量渲染 ================= */
  function render() {
    renderFilters();
    renderQuickTags();
    renderThead();
    renderTableBody();
    renderCountInfo();
    // 同步清空按钮
    els.btnSearchClear.hidden = !state.keyword;
    // 同步 tab 高亮
    Array.prototype.forEach.call(els.tabs.children, function (b) {
      b.classList.toggle('active', b.dataset.target === state.tab);
    });
  }

  /* ================= URL 同步 ================= */
  function syncURL() {
    try {
      var sp = new URLSearchParams();
      if (state.tab !== 'port') sp.set('tab', state.tab);
      if (state.keyword) sp.set('q', state.keyword);
      if (state.category !== 'all') sp.set('cat', state.category);
      if (state.sortKey) {
        sp.set('s', state.sortKey);
        sp.set('d', state.sortDir);
      }
      var qs = sp.toString();
      var url = location.pathname + (qs ? '?' + qs : '');
      history.replaceState(null, '', url);
    } catch (e) {}
  }

  function loadFromURL() {
    try {
      var sp = new URLSearchParams(location.search);
      var tab = sp.get('tab');
      if (tab && DATASETS[tab]) state.tab = tab;
      if (sp.has('q')) state.keyword = sp.get('q');
      if (sp.has('cat')) {
        var cat = sp.get('cat');
        if (DATASETS[state.tab].filters[cat]) state.category = cat;
      }
      if (sp.has('s') && sp.has('d')) {
        state.sortKey = sp.get('s');
        state.sortDir = sp.get('d') === 'desc' ? 'desc' : 'asc';
      }
    } catch (e) {}
  }

  /* ================= 主题 ================= */
  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') state.theme = t;
    } catch (e) {}
    applyTheme();
  }
  function applyTheme() {
    document.body.classList.toggle('theme-dark', state.theme === 'dark');
    if (els.btnTheme) els.btnTheme.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  /* ================= DOM 缓存 ================= */
  function cacheEls() {
    els.tabs = document.getElementById('dc-tabs');
    els.filters = document.getElementById('dc-filters');
    els.search = document.getElementById('dc-search');
    els.btnSearchClear = document.getElementById('btn-search-clear');
    els.quickTags = document.getElementById('dc-quick-tags');
    els.countInfo = document.getElementById('dc-count-info');
    els.thead = document.getElementById('dc-thead');
    els.tbody = document.getElementById('dc-tbody');
    els.btnTheme = document.getElementById('btn-theme');
    els.btnShare = document.getElementById('btn-share');
    els.toast = document.getElementById('dc-toast');
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    // Tab 切换
    els.tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.dc-tab');
      if (!btn) return;
      var target = btn.dataset.target;
      if (!DATASETS[target]) return;
      if (target === state.tab) return;
      state.tab = target;
      state.category = 'all';
      state.sortKey = null;
      state.sortDir = 'asc';
      // 保留 keyword，方便跨表搜索
      render();
      syncURL();
    });

    // 分类筛选
    els.filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.dc-filter-chip');
      if (!btn) return;
      state.category = btn.dataset.cat;
      render();
      syncURL();
    });

    // 快捷标签
    els.quickTags.addEventListener('click', function (e) {
      var btn = e.target.closest('.dc-quick-tag');
      if (!btn) return;
      var tag = btn.dataset.tag;
      state.keyword = tag;
      if (els.search) els.search.value = tag;
      render();
      syncURL();
    });

    // 搜索
    els.search.addEventListener('input', function () {
      state.keyword = this.value;
      render();
      syncURL();
    });
    els.btnSearchClear.addEventListener('click', function () {
      els.search.value = '';
      state.keyword = '';
      els.search.focus();
      render();
      syncURL();
    });

    // 表头排序
    els.thead.addEventListener('click', function (e) {
      var th = e.target.closest('th');
      if (!th || th.classList.contains('no-sort')) return;
      var key = th.dataset.key;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }
      render();
      syncURL();
    });

    // 单元格复制（事件委托）
    els.tbody.addEventListener('click', function (e) {
      var td = e.target.closest('td.dc-copyable');
      if (!td) return;
      var val = td.getAttribute('data-copy');
      if (val) {
        copyText(val);
        // 复制反馈
        td.classList.add('copied');
        setTimeout(function () { td.classList.remove('copied'); }, 1200);
      }
    });

    // 主题
    els.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
      applyTheme();
    });

    // 分享
    els.btnShare.addEventListener('click', function () {
      syncURL();
      copyText(location.href);
    });

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      // Ctrl/Cmd + K 聚焦搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        els.search.focus();
        els.search.select();
      }
      // Esc 清空搜索
      if (e.key === 'Escape' && document.activeElement === els.search) {
        if (els.search.value) {
          els.search.value = '';
          state.keyword = '';
          render();
          syncURL();
        } else {
          els.search.blur();
        }
      }
    });
  }

  /* ================= 初始化 ================= */
  function init() {
    cacheEls();
    loadTheme();
    loadFromURL();

    // 应用 URL 中的 keyword 到输入框
    if (state.keyword && els.search) {
      els.search.value = state.keyword;
    }

    bindEvents();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();