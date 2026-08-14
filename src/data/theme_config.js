// src/data/theme_config.js
// 移除對舊版 State 全域物件的依賴，改為純函式接收參數

const THEMES = {
  harem: {
    type: 'story', shopId: 'theme_harem', label: '🪭 後宮模式', petIcon: '🧺',
    navbar: [
      { id: 'task', icon: '📋', label: '奏摺', action: 'task' },
      { id: 'main', icon: '🏯', label: '宮廷', action: 'main' },
      { id: 'shop', icon: '🧧', label: '賞賜', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📋', page: 'quick' },
      { icon: '👘', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  tech: {
    type: 'story', shopId: 'theme_tech', label: '💠 未來科技', petIcon: '🧊',
    navbar: [
      { id: 'task', icon: '📋', label: '任務', action: 'task' },
      { id: 'main', icon: '🏢', label: '大廳', action: 'main' },
      { id: 'shop', icon: '🛒', label: '商店', action: 'shop' },
    ],
    quickIcons: [
      { icon: '🗂️', page: 'quick' },
      { icon: '🦾', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  wood: {
    type: 'story', shopId: 'theme_wood', label: '🌑 魔法學院', petIcon: '💼',
    navbar: [
      { id: 'task', icon: '📜', label: '任務', action: 'task' },
      { id: 'main', icon: '🏰', label: '學院', action: 'main' },
      { id: 'shop', icon: '⚗️', label: '商店', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📜', page: 'quick' },
      { icon: '🎓', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  white: {
    type: 'story', shopId: 'theme_white', label: '☀️ 晨曦物語', petIcon: '🧺',
    navbar: [
      { id: 'task', icon: '📋', label: '任務', action: 'task' },
      { id: 'main', icon: '🏡', label: '大廳', action: 'main' },
      { id: 'shop', icon: '🌸', label: '商店', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📝', page: 'quick' },
      { icon: '👒', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  story: {
    type: 'story', shopId: 'theme_story', label: '🌙 賽博都市', petIcon: '🧳',
    navbar: [
      { id: 'task', icon: '📡', label: '任務', action: 'task' },
      { id: 'main', icon: '🏠', label: '大廳', action: 'main' },
      { id: 'shop', icon: '💾', label: '商店', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📡', page: 'quick' },
      { icon: '🥽', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  siren: {
    type: 'story', shopId: 'theme_siren', label: '🧜 深海賽壬', petIcon: '🦪',
    navbar: [
      { id: 'task', icon: '🔱', label: '使命', action: 'task' },
      { id: 'main', icon: '🌊', label: '深海', action: 'main' },
      { id: 'shop', icon: '🐡', label: '寶庫', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📜', page: 'quick' },
      { icon: '🧜', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  mermaid: {
    type: 'story', shopId: 'theme_mermaid', label: '🐚 夢幻人魚', petIcon: '🐚',
    navbar: [
      { id: 'task', icon: '🐚', label: '心願', action: 'task' },
      { id: 'main', icon: '🏝️', label: '海灣', action: 'main' },
      { id: 'shop', icon: '💎', label: '珍寶', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📝', page: 'quick' },
      { icon: '🐠', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
  gilded: {
    type: 'story', shopId: 'theme_gilded', label: '✨ 深淵鎏金', petIcon: '⚱️',
    navbar: [
      { id: 'task', icon: '⚗️', label: '任務', action: 'task' },
      { id: 'main', icon: '🏛️', label: '大廳', action: 'main' },
      { id: 'shop', icon: '⚙️', label: '商店', action: 'shop' },
    ],
    quickIcons: [
      { icon: '📜', page: 'quick' },
      { icon: '🎭', page: 'avatar' },
      { icon: '❓', page: 'qa' },
    ],
  },
};

const DEFAULTS = {
  petIcon: '🧰',
  navbar: [
    { id: 'task', icon: '📋', label: '任務', action: 'task' },
    { id: 'main', icon: '🏠', label: '大廳', action: 'main' },
    { id: 'shop', icon: '🛒', label: '商店', action: 'shop' },
  ],
  quickIcons: [
    { icon: '📜', page: 'quick'   },
    { icon: '👗', page: 'avatar'  },
    { icon: '❓', page: 'qa'      },
  ],
};

const BASIC_QUICK_ICONS = [
  { icon: '📜', page: 'quick'   },
];

export function getNavbar(theme) {
  return THEMES[theme]?.navbar ?? DEFAULTS.navbar;
}

export function getQuickIcons(theme, isBasic) {
  if (isBasic) return BASIC_QUICK_ICONS;
  return THEMES[theme]?.quickIcons ?? [...DEFAULTS.quickIcons];
}

export function getPetHouseIcon(theme) {
  return THEMES[theme]?.petIcon ?? DEFAULTS.petIcon;
}

export function getThemeCfg(theme) {
  return THEMES[theme] ?? null;
}

export const SettingsShopItems = [
  { id: 'theme_harem',        name: '🪭 後宮模式',   type: 'theme_story', desc: '故宮硃砂紅、宮廷金箔、專屬劇情與NPC，重溫宮廷的明爭暗鬥與古典風雅。',           price: 300, currency: 'paid', color: '#82111F', bg: '#FDF9F1', border: '#C8AFA5', badge: 'HOT', preview: 'harem'       },
  { id: 'theme_tech',         name: '💠 未來科技',   type: 'theme_story', desc: '深海軍藍儀表板、科技網格、高科技介面，解鎖數位專屬模組。',                       price: 300, currency: 'paid', color: '#0066FF', bg: '#0A1628', border: '#1E3A5F', badge: 'NEW', preview: 'tech'         },
  { id: 'theme_mermaid',      name: '🐚 夢幻人魚',   type: 'theme_story', desc: '粉藍珍珠底，柔光氣泡紋路，夢幻浪漫的海底仙境。',                               price: 300, currency: 'paid', color: '#5B8FD4', bg: '#EDF4FC', border: '#C0D8F0', badge: 'NEW', preview: 'mermaid'      },
  { id: 'theme_wood',         name: '🌑 魔法學院',   type: 'theme_story', desc: '暗木深褐、魔法陣紋路、黃銅金與魔法綠，沉浸霍格華茲學院氛圍。',                   price: 300, currency: 'paid', color: '#2E8B57', bg: '#1A110D', border: '#523828', badge: 'NEW', preview: 'wood'         },
  { id: 'theme_white',        name: '☀️ 晨曦物語',   type: 'theme_story', desc: '奶油暖白、晨曦橘光、柔光暈染，清新日系生活感完整體驗。',                         price: 300, currency: 'paid', color: '#D98227', bg: '#FCF9F2', border: '#EBE3D5', badge: '',    preview: 'white'        },
  { id: 'theme_story',        name: '🌙 賽博都市',   type: 'theme_story', desc: '極黑底色、霓虹紫光暈、掃描線紋路，沉浸賽博龐克都市。',                           price: 300, currency: 'paid', color: '#B829EA', bg: '#111111', border: '#333336', badge: '',    preview: 'story'        },
  { id: 'theme_siren',        name: '🧜 深海賽壬',   type: 'theme_story', desc: '深邃藍黑底，毒藍綠螢光點綴，危險神秘的深海女妖氛圍。',                           price: 300, currency: 'paid', color: '#00FFD1', bg: '#03060D', border: '#0A2040', badge: 'NEW', preview: 'siren'        },
  { id: 'theme_gilded',       name: '✨ 深淵鎏金',   type: 'theme_story', desc: 'Art Deco 幾何金紋，氧化銅綠與深邃黑底，沉浸於海底銷金窟的奢華與衰敗。',           price: 300, currency: 'paid', color: '#C8891E', bg: '#0C1A14', border: '#8A5E10', badge: 'NEW', preview: 'gilded'       },
  { id: 'theme_basic_harem',  name: '🪭 宮廷朱色',   type: 'theme_basic', desc: '暖米底色搭配硃砂紅調，感受宮廷典雅而不失輕盈。',                                 price: 0,   currency: 'pro',  color: '#82111F', bg: '#FDF9F1', border: '#C8AFA5', badge: 'Pro', preview: 'basic-harem'  },
  { id: 'theme_basic_tech',   name: '💠 科技藍調',   type: 'theme_basic', desc: '清爽藍白配色，職場科技感簡約版本。',                                             price: 0,   currency: 'pro',  color: '#0066FF', bg: '#F2F5F8', border: '#CBD5E1', badge: 'Pro', preview: 'basic-tech'   },
  { id: 'theme_basic_white',  name: '☀️ 明亮清晨',   type: 'theme_basic', desc: '暖白奶油色系，輕盈清爽的日常極簡風。',                                           price: 0,   currency: 'pro',  color: '#F29C38', bg: '#FFFFFF', border: '#EBE3D5', badge: 'Pro', preview: 'basic-white'  },
  { id: 'theme_basic_mermaid',name: '🐚 珍珠粉藍',   type: 'theme_basic', desc: '夢幻人魚色票基礎版，只換配色不含氣泡紋路。',                                     price: 0,   currency: 'pro',  color: '#5B8FD4', bg: '#EDF4FC', border: '#C0D8F0', badge: 'Pro', preview: 'basic-mermaid'},
  { id: 'theme_basic_wood',   name: '🌑 沉靜學院',   type: 'theme_basic', desc: '深褐暗木色調，低調沉穩的學院風格。',                                             price: 0,   currency: 'pro',  color: '#D4AF37', bg: '#35251C', border: '#523828', badge: 'Pro', preview: 'basic-wood'   },
  { id: 'theme_basic_story',  name: '🌙 霓光暗夜',   type: 'theme_basic', desc: '極黑模式搭配霓虹點綴，護眼深色簡約版。',                                         price: 0,   currency: 'pro',  color: '#B829EA', bg: '#1E1E21', border: '#333336', badge: 'Pro', preview: 'basic-story'  },
  { id: 'theme_basic_siren',  name: '🧜 深海藍黑',   type: 'theme_basic', desc: '深海色票基礎版，只換配色不含紋路。',                                             price: 0,   currency: 'pro',  color: '#00C9A7', bg: '#060D1A', border: '#0E2038', badge: 'Pro', preview: 'basic-siren'  },
  { id: 'theme_basic_gilded', name: '✨ 鎏金暗影',   type: 'theme_basic', desc: '深淵鎏金色票基礎版，保留高對比復古金綠配色，移除背景光柱動效。',                   price: 0,   currency: 'pro',  color: '#C8891E', bg: '#0C1A14', border: '#5A4614', badge: 'Pro', preview: 'basic-gilded' },
  // 初版裁切：learning（綁 Story 單字替換）、module_pet（綁寵物系統）先拿掉，
  // 兩個系統都還沒進這個分支，賣了也沒有對應功能可解鎖。
  // 之後要開回來，把這兩筆物件定義加回來即可（內容見完整版 src9 分支）。
];