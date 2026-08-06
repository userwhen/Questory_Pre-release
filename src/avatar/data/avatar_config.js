/* src/data/avatarConfig.js */
// 商品 type 說明：
// suit         全套裝（會清除所有局部服裝）
// special_pose 特殊姿勢（同 suit 互斥邏輯）
// top          上裝
// bottom       下裝
// hair_front   前髮
// hair_back    後髮
// hair_combo   整體髮型（清除 hair_front / hair_back）
// face         臉部
// body         素體（無法卸下）
// accessory    配件
// bg           背景
// wall_bg      牆面背景（跟 floor_bg 一起決定房間視覺，取代舊版單張 bg）
// floor_bg     地面背景（跟 wall_bg 一起決定房間視覺）
// companion    陪伴者
// pet          寵物（獨立裝備邏輯，最多 2 隻）
// furniture    家具

export const AvatarShop = [
  { id: 'body_01', name: '白皙素體', price: 0, type: 'body', icon: '🧍', layers: [ { img: 'body_01_body' }, { img: 'body_01_head' } ], imgId: 'body_01', rarity: 'R' },
  { id: 'body_02', name: '白肌素體', price: 50, type: 'body', icon: '🧍🏽', layers: [ { img: 'body_02_body' }, { img: 'body_02_head' } ], imgId: 'body_02', rarity: 'R' },
  { id: 'body_03', name: '素體', price: 50, type: 'body', icon: '🧍🏽', layers: [ { img: 'body_03_body' }, { img: 'body_03_head' } ], imgId: 'body_03', rarity: 'R' },
  { id: 'body_04', name: '素體', price: 50, type: 'body', icon: '🧍🏽', layers: [ { img: 'body_04_body' }, { img: 'body_04_head' } ], imgId: 'body_04', rarity: 'R' },
  { id: 'body_05', name: '素體', price: 50, type: 'body', icon: '🧍🏽', layers: [ { img: 'body_05_body' }, { img: 'body_05_head' } ], imgId: 'body_05', rarity: 'R' },
  { id: 'body_06', name: '素體', price: 50, type: 'body', icon: '🧍🏽', layers: [ { img: 'body_06_body' }, { img: 'body_06_head' } ], imgId: 'body_06', rarity: 'R' },
  { id: 'face_01', name: '微笑表情', price: 0, type: 'face', icon: '😊', imgId: 'face_01', rarity: 'R' },
  { id: 'face_02', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_02', rarity: 'R' },
  { id: 'face_03', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_03', rarity: 'R' },
  { id: 'face_04', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_04', rarity: 'R' },
  { id: 'face_05', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_05', rarity: 'R' },
  { id: 'face_06', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_06', rarity: 'R' },
  { id: 'face_07', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_07', rarity: 'R' },
  { id: 'face_08', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_08', rarity: 'R' },
  { id: 'face_09', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_09', rarity: 'R' },
  { id: 'face_10', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_10', rarity: 'R' },
  { id: 'face_11', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_11', rarity: 'R' },
  { id: 'face_12', name: '俏皮眨眼', price: 50, type: 'face', icon: '😉', imgId: 'face_12', rarity: 'R' },
  { id: 'hair_f_01', name: '齊瀏海 (前髮)', price: 100, type: 'hair_front', icon: '✂️', imgId: 'hair_f_01', rarity: 'R' },
  { id: 'hair_b_01', name: '長直髮 (後髮)', price: 100, type: 'hair_back', icon: '🎀', imgId: 'hair_b_01', rarity: 'R' },
  { id: 'hair_c_01', name: '雙馬尾 (組合髮)', price: 150, type: 'hair_combo', icon: '👧', desc: '穿上會自動卸下前/後髮', layers: [ { img: 'hair_c_01_b', z: 0 }, { img: 'hair_c_01_f', z: 6 } ], imgId: 'hair_c_01', rarity: 'SR' },
  { id: 'top_01', name: '休閒白T恤', price: 100, type: 'top', icon: '👕', imgId: 'top_01', rarity: 'R' },
  { id: 'bottom_01', name: '經典牛仔褲', price: 100, type: 'bottom', icon: '👖', imgId: 'bottom_01', rarity: 'R' },
  { id: 'bottom_02', name: '格子百褶裙', price: 100, type: 'bottom', icon: '👗', imgId: 'bottom_02', rarity: 'R' },
  { id: 'acc_01', name: '頭帶', price: 50, type: 'accessory', icon: '👓', imgId: 'acc_01', rarity: 'R' },
  { id: 'acc_02', name: '魔法帽', price: 50, type: 'accessory', icon: '👒', imgId: 'acc_02', rarity: 'R' },
  { id: 'sp_pose_01', name: '星光魔法使', type: 'special_pose', icon: '✨', desc: '集齊星光套裝組即可免費解鎖！穿上時會覆蓋所有一般服裝與素體', requires: ['hair_c_01', 'outfit_02', 'acc_02'], imgId: 'sp_pose_01', rarity: 'SSR' },
  { id: 'outfit_01', name: '勇者', price: 0, type: 'suit', imgId: 'outfit_01', rarity: 'R' },
  { id: 'outfit_02', name: '法師', price: 0, type: 'suit', imgId: 'outfit_02', rarity: 'R' },
  { id: 'outfit_03', name: '射手', price: 150, type: 'suit', imgId: 'outfit_03', rarity: 'SR' },
  { id: 'outfit_04', name: '刺客', price: 150, type: 'suit', imgId: 'outfit_04', rarity: 'SR' },
  { id: 'outfit_05', name: '後宮 (男)', price: 150, type: 'suit', imgId: 'outfit_05', rarity: 'SR' },
  { id: 'outfit_06', name: '後宮 (女)', price: 150, type: 'suit', imgId: 'outfit_06', rarity: 'SR' },
  { id: 'outfit_07', name: '男學生', price: 150, type: 'suit', imgId: 'outfit_07', rarity: 'SR' },
  { id: 'outfit_08', name: '女學生', price: 150, type: 'suit', imgId: 'outfit_08', rarity: 'SR' },
  { id: 'outfit_09', name: '管家', price: 150, type: 'suit', imgId: 'outfit_09', rarity: 'SR' },
  { id: 'outfit_10', name: '女僕', price: 150, type: 'suit', imgId: 'outfit_10', rarity: 'SR' },
  { id: 'outfit_11', name: '工程師', price: 150, type: 'suit', imgId: 'outfit_11', rarity: 'SR' },
  { id: 'outfit_12', name: '檢驗師', price: 150, type: 'suit', imgId: 'outfit_12', rarity: 'SR' },
  { id: 'outfit_13', name: '電機刺客', price: 150, type: 'suit', imgId: 'outfit_13', rarity: 'SR' },
  { id: 'outfit_14', name: '電機駭客', price: 150, type: 'suit', imgId: 'outfit_14', rarity: 'SR' },
  { id: 'outfit_15', name: '貴族公子', price: 150, type: 'suit', imgId: 'outfit_15', rarity: 'SR' },
  { id: 'outfit_16', name: '貴族千金', price: 150, type: 'suit', imgId: 'outfit_16', rarity: 'SR' },
  { id: 'outfit_17', name: '貴族子弟', price: 150, type: 'suit', imgId: 'outfit_17', rarity: 'SR' },
  { id: 'outfit_18', name: '貴族小姐', price: 150, type: 'suit', imgId: 'outfit_18', rarity: 'SR' },
  { id: 'outfit_19', name: '現代男', price: 150, type: 'suit', imgId: 'outfit_19', rarity: 'SR' },
  { id: 'outfit_20', name: '現代女', price: 150, type: 'suit', imgId: 'outfit_20', rarity: 'SR' },
  { id: 'outfit_21', name: '男人魚', price: 150, type: 'suit', imgId: 'outfit_21', rarity: 'SR' },
  { id: 'outfit_22', name: '女人魚', price: 150, type: 'suit', imgId: 'outfit_22', rarity: 'SR' },
  { id: 'outfit_23', name: '人魚王子', price: 150, type: 'suit', imgId: 'outfit_23', rarity: 'SR' },
  { id: 'outfit_24', name: '人魚公主', price: 150, type: 'suit', imgId: 'outfit_24', rarity: 'SR' },
  { id: 'outfit_25', name: '黑市刺客', price: 150, type: 'suit', imgId: 'outfit_25', rarity: 'SR' },
  { id: 'outfit_26', name: '黑市獵人', price: 150, type: 'suit', imgId: 'outfit_26', rarity: 'SR' },
  { id: 'outfit_27', name: '後宮嬪妃', price: 150, type: 'suit', imgId: 'outfit_27', rarity: 'SR' },
  { id: 'comp_01', name: '森林小精靈', price: 200, type: 'companion', compType: 'flying', icon: '🧚', imgId: 'npc_outfit_02', rarity: 'SR' },
  { id: 'comp_02', name: '小宮女夥伴', price: 200, type: 'companion', compType: 'ground', icon: '', imgId: 'harem_f', rarity: 'SR' },
  { id: 'comp_03', name: '輔助機器人', price: 200, type: 'companion', compType: 'ground', icon: '🤖', imgId: 'comp_03', rarity: 'SR' },
  { id: 'comp_04', name: '小魚兒', price: 200, type: 'companion', compType: 'flying', icon: '', imgId: 'pet_14', rarity: 'SR' },
  { id: 'comp_05', name: '男人魚(伴)', price: 150, type: 'companion', compType: 'flying', imgId: 'outfit_21', rarity: 'SR' },
  { id: 'comp_06', name: '女人魚(伴)', price: 150, type: 'companion', compType: 'flying', imgId: 'outfit_22', rarity: 'SR' },
  { id: 'comp_07', name: '人魚王子(伴)', price: 150, type: 'companion', compType: 'flying', imgId: 'outfit_23', rarity: 'SR' },
  { id: 'comp_08', name: '人魚公主(伴)', price: 150, type: 'companion', compType: 'flying', imgId: 'outfit_24', rarity: 'SR' },
  { id: 'bg_01', name: '翠綠森林', price: 100, type: 'bg', icon: '🌲', imgId: 'bg_01', rarity: 'R' },
  { id: 'bg_02', name: '深宮內廷', price: 100, type: 'bg', icon: '🏰', imgId: 'bg_02', rarity: 'R' },
  { id: 'bg_03', name: '深海地帶', price: 100, type: 'bg', icon: '', imgId: 'bg_03', rarity: 'R' },
  { id: 'bg_04', name: '熱帶淺海', price: 100, type: 'bg', icon: '', imgId: 'bg_04', rarity: 'R' },
  { id: 'bg_05', name: '賽博九龍', price: 100, type: 'bg', icon: '', imgId: 'bg_05', rarity: 'R' },
  { id: 'bg_06', name: '內廷', price: 100, type: 'bg', icon: '', imgId: 'bg_06', rarity: 'R' },
  // ⚠️ imgId 對應的美術檔案還不存在，先測介面用，正式上線前要換成真圖或拿掉
  { id: 'wall_bg_01', name: '奶油色牆面', price: 100, type: 'wall_bg', icon: '🖼️', imgId: 'wall_bg_01', rarity: 'R' },
  { id: 'wall_bg_02', name: '磚紅色牆面', price: 100, type: 'wall_bg', icon: '🧱', imgId: 'wall_bg_02', rarity: 'R' },
  { id: 'floor_bg_01', name: '木質地板', price: 100, type: 'floor_bg', icon: '🟫', imgId: 'floor_bg_01', rarity: 'R' },
  { id: 'floor_bg_02', name: '磁磚地板', price: 100, type: 'floor_bg', icon: '⬜', imgId: 'floor_bg_02', rarity: 'R' },
  { id: 'pet_01', name: '白狗', price: 300, type: 'pet', icon: '🐩', imgId: 'pet_01', rarity: 'SSR' },
  { id: 'pet_02', name: '柴犬', price: 300, type: 'pet', icon: '🐕', imgId: 'pet_02', rarity: 'SSR' },
  { id: 'pet_03', name: '柯基', price: 300, type: 'pet', icon: '🐕', imgId: 'pet_03', rarity: 'SSR' },
  { id: 'pet_04', name: '花貓', price: 300, type: 'pet', icon: '🐱', imgId: 'pet_04', rarity: 'SSR' },
  { id: 'pet_05', name: '黑貓', price: 300, type: 'pet', icon: '🐈‍⬛', imgId: 'pet_05', rarity: 'SSR' },
  { id: 'pet_06', name: '藍貓', price: 300, type: 'pet', icon: '🐈‍⬛', imgId: 'pet_06', rarity: 'SSR' },
  { id: 'pet_07', name: '鸚鵡', price: 300, type: 'pet', icon: '🦜', imgId: 'pet_07', rarity: 'SSR' },
  { id: 'pet_08', name: '白兔', price: 300, type: 'pet', icon: '🐰', imgId: 'pet_08', rarity: 'SSR' },
  { id: 'pet_09', name: '松鼠', price: 300, type: 'pet', icon: '🐹', imgId: 'pet_09', rarity: 'SSR' },
  { id: 'pet_10', name: '倉鼠', price: 300, type: 'pet', icon: '🐾', imgId: 'pet_10', rarity: 'SSR' },
  { id: 'pet_11', name: '天竺鼠', price: 300, type: 'pet', icon: '🐖', imgId: 'pet_11', rarity: 'SSR' },
  { id: 'pet_12', name: '迷你豬', price: 300, type: 'pet', icon: '🐿️', imgId: 'pet_12', rarity: 'SSR' },
  { id: 'pet_13', name: '烏龜', price: 300, type: 'pet', icon: '🐢', imgId: 'pet_13', rarity: 'SSR' },
  { id: 'pet_14', name: '小丑魚', price: 300, type: 'pet', icon: '🐠', imgId: 'pet_14', rarity: 'SSR' },
  { id: 'furn_mirror', name: '魔法立鏡', price: 0, type: 'furniture', size: 'S', icon: '🪞', action: 'toggleQuickMenu', imgId: 'furn_mirror', rarity: 'R' },
  { id: 'furn_trash', name: '垃圾桶', price: 150, type: 'furniture', size: 'S', icon: '🗑️', desc: '銷毀餵食...', imgId: 'furn_trash', rarity: 'SR' },
  { id: 'furn_plant', name: '療癒盆栽', price: 100, type: 'furniture', size: 'S', icon: '🪴', imgId: 'furn_plant', rarity: 'R' },
  { id: 'furn_desk', name: '原木書桌', price: 150, type: 'furniture', size: 'M', icon: '🪑', imgId: 'furn_desk', rarity: 'SR' },
  { id: 'furn_bed', name: '舒適小床', price: 300, type: 'furniture', size: 'L', icon: '🛌', imgId: 'furn_bed', rarity: 'SSR' }
];

export const GachaPool = [
  // ── 扭蛋專屬物品 ───────────────────────────────────
  {
    id: 'gacha_suit_star',
    name: '星空套裝',
    type: 'suit',
    icon: '🌟',
    imgId: 'gacha_suit_star',
    rarity: 'SSR',
    // layers 範例（多層合成）：
    // layers: [
    //   { img: 'gacha_suit_star_base', z: 5 },
    //   { img: 'gacha_suit_star_overlay', z: 6 },
    // ],
  },
  {
    id: 'gacha_hair_moon',
    name: '月光髮型',
    type: 'hair_combo',
    icon: '🌙',
    imgId: 'gacha_hair_moon',
    rarity: 'SR',
  },
  {
    id: 'gacha_pet_cat',
    name: '小橘貓',
    type: 'pet',
    icon: '🐱',
    imgId: 'gacha_pet_cat',
    rarity: 'SR',
  },
];

// 扭蛋機率設定
export const GachaConfig = {
  singleCost:  50,                        // 單抽鑽石費用
  tenCost:     Math.floor(50 * 10 * 0.9), // 十連 9 折
  pityLimit:   50,                        // 保底抽數
  rates: {
    SSR: 0.03,
    SR:  0.12,
    R:   0.85,
  },
};
// 角色立繪查找用：合併所有可裝備物品（AvatarShop + GachaPool）
export const ALL_ITEMS = [...AvatarShop, ...GachaPool];