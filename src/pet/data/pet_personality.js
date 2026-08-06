/* src/data/pet_personality.js */
// 性格資料表（資料驅動：新增/調整性格只需要改這裡的數字，不用動邏輯）。
// 出生時隨機抽一個，終身不變。key 本身就是顯示用的名稱，不需要額外對照表。
//   feedMult          ：餵食效果倍率（影響食物恢復量）
//   playMult          ：玩耍效果倍率（影響心情恢復量）
//   touchAffMult      ：摸摸互動的親密度倍率（0 代表完全不吃這套）
//   lowStatPenaltyMult：食物/心情過低時，親密度懲罰的倍率（<1 代表比較不受傷）
//   exploreChanceMult ：觸發探險邀約的機率倍率
export const PERSONALITY_TABLE = {
  '美食家': { feedMult: 1.5, playMult: 1,   touchAffMult: 1, lowStatPenaltyMult: 1,   exploreChanceMult: 1 },
  '活潑':   { feedMult: 1,   playMult: 1.5, touchAffMult: 1, lowStatPenaltyMult: 1,   exploreChanceMult: 1 },
  '黏人':   { feedMult: 1,   playMult: 1,   touchAffMult: 2, lowStatPenaltyMult: 1,   exploreChanceMult: 1 },
  '高冷':   { feedMult: 1,   playMult: 1,   touchAffMult: 0, lowStatPenaltyMult: 0.5, exploreChanceMult: 1 },
  '好奇':   { feedMult: 1,   playMult: 1,   touchAffMult: 1, lowStatPenaltyMult: 1,   exploreChanceMult: 2 },
};
export const PERSONALITY_KEYS = Object.keys(PERSONALITY_TABLE);