/* src/avatar/data/portrait_config.js */
// 頭像／頭像框：跟 avatar_config.js 的換裝系統完全獨立，不會被 CharacterSprite 讀取，
// 只給 HUD 頭像徽章跟 PortraitModal 用。每筆都是單張完整插畫，沒有 layers、沒有 reqAttr。
//
// 取得方式二選一：
//   price           → 鑽石購買（見 @/avatar/engines/portrait.js 的 buyCosmetic）
//   unlockCondition → 里程碑達成自動解鎖（達標時比照 AvatarEngine._checkSetRewards 自動發放 + toast）
//
// ⚠️ imgId 對應的美術檔案目前都還不存在，先測介面用，正式上線前要換成真圖。

export const PortraitShop = [
  { id: 'portrait_01', name: '新手冒險者', price: 0, imgId: 'portrait_01', rarity: 'R' },
  { id: 'portrait_02', name: '沉思的旅人', price: 100, imgId: 'portrait_02', rarity: 'R' },
  { id: 'portrait_03', name: '林間精靈', price: 200, imgId: 'portrait_03', rarity: 'SR' },
  { id: 'portrait_04', name: '星夜魔法師', price: 300, imgId: 'portrait_04', rarity: 'SSR' },
  { id: 'portrait_05', name: '勤勉的證明', unlockCondition: { type: 'level', value: 10 }, imgId: 'portrait_05', rarity: 'SR' },
  { id: 'portrait_06', name: '七日之約', unlockCondition: { type: 'loginStreak', value: 7 }, imgId: 'portrait_06', rarity: 'SR' },
  { id: 'portrait_07', name: '百日行者', unlockCondition: { type: 'totalLoginDays', value: 100 }, imgId: 'portrait_07', rarity: 'SSR' },
];

export const FrameShop = [
  { id: 'frame_01', name: '木紋描邊', price: 100, imgId: 'frame_01', rarity: 'R' },
  { id: 'frame_02', name: '金色藤蔓', price: 250, imgId: 'frame_02', rarity: 'SR' },
  { id: 'frame_03', name: '星辰之環', unlockCondition: { type: 'level', value: 20 }, imgId: 'frame_03', rarity: 'SSR' },
  { id: 'frame_04', name: '連續七日', unlockCondition: { type: 'loginStreak', value: 7 }, imgId: 'frame_04', rarity: 'SR' },
];

// 頭像框「不使用」的 sentinel——跟 null（從未設定過）分開，
// 讓 previewFrame 能正確分辨「正在預覽不使用」跟「沒在預覽」這兩種狀態（見 portrait.js）
export const NONE_COSMETIC = '__none__';

// ─── 商品表對照：portrait.js／UI 用 kind 找對應的表跟 state 欄位 ─────────
export const COSMETIC_TABLES = {
  portrait: { shop: PortraitShop, unlockedKey: 'unlockedPortraits', equippedKey: 'equippedPortrait' },
  frame:    { shop: FrameShop,    unlockedKey: 'unlockedFrames',    equippedKey: 'equippedFrame' },
};

// ─── 圖檔查找：id → imgId，null/NONE_COSMETIC 一律回傳 null（不渲染）─────
export function findCosmeticImgId(kind, id) {
  if (!id || id === NONE_COSMETIC) return null;
  const shop = COSMETIC_TABLES[kind]?.shop ?? [];
  return shop.find(i => i.id === id)?.imgId ?? id;
}

// ─── 里程碑判定：純函式，吃目前數值、回傳是否達標 ─────────────────────
/**
 * @param {{ unlockCondition?: { type: 'level'|'loginStreak'|'totalLoginDays', value: number } }} item
 * @param {{ lv?: number, loginStreak?: number, totalLoginDays?: number }} playerStats
 * @returns {boolean}
 */
export function checkMilestoneUnlock(item, playerStats = {}) {
  const cond = item?.unlockCondition;
  if (!cond) return false;

  const current = {
    level: playerStats.lv ?? 1,
    loginStreak: playerStats.loginStreak ?? 0,
    totalLoginDays: playerStats.totalLoginDays ?? 0,
  }[cond.type];

  return (current ?? 0) >= cond.value;
}