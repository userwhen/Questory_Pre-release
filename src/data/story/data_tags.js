// data_tags.js
// Tag 四層定義、消耗規則、劇情類型歸屬

// ─────────────────────────────────────────────
// World Tags — 環境/道具
// ─────────────────────────────────────────────
export const WORLD_TAGS = [
  // 地點類（不消耗）
  { tag: "world:醫院",       consumable: false, category: "location" },
  { tag: "world:學校",       consumable: false, category: "location" },
  { tag: "world:宮廷",       consumable: false, category: "location" },
  { tag: "world:廢棄",       consumable: false, category: "location" },
  { tag: "world:森林",       consumable: false, category: "location" },
  { tag: "world:都市",       consumable: false, category: "location" },
  { tag: "world:密室",       consumable: false, category: "location" },
  { tag: "world:海邊",       consumable: false, category: "location" },
  { tag: "world:古代",       consumable: false, category: "location" },
  { tag: "world:現代",       consumable: false, category: "location" },
  { tag: "world:未來",       consumable: false, category: "location" },
  { tag: "world:戰場",       consumable: false, category: "location" },
  { tag: "world:旅館",       consumable: false, category: "location" },
  // 道具類（可消耗）
  { tag: "world:手電筒",     consumable: true,  category: "item" },
  { tag: "world:鑰匙",       consumable: true,  category: "item" },
  { tag: "world:武器",       consumable: true,  category: "item" },
  { tag: "world:急救包",     consumable: true,  category: "item" },
  { tag: "world:通訊工具",   consumable: true,  category: "item" },
  { tag: "world:文件",       consumable: true,  category: "item" },
  { tag: "world:證據",       consumable: true,  category: "item" },
];

// ─────────────────────────────────────────────
// State Tags — 玩家狀態（不消耗，可被 remove 覆蓋）
// ─────────────────────────────────────────────
export const STATE_TAGS = [
  { tag: "state:孤立",       consumable: false },
  { tag: "state:恐懼",       consumable: false },
  { tag: "state:憤怒",       consumable: false },
  { tag: "state:悲傷",       consumable: false },
  { tag: "state:希望",       consumable: false },
  { tag: "state:疲憊",       consumable: false },
  { tag: "state:受傷",       consumable: false },
  { tag: "state:武裝",       consumable: false },
  { tag: "state:有線索",     consumable: false },
  { tag: "state:有道具",     consumable: false },
  { tag: "state:警覺",       consumable: false },
  { tag: "state:謹慎",       consumable: false },
  { tag: "state:主動",       consumable: false },
  { tag: "state:隱蔽",       consumable: false },
  { tag: "state:困惑",       consumable: false },
  { tag: "state:好奇",       consumable: false },
  { tag: "state:緊張",       consumable: false },
  { tag: "state:無助",       consumable: false },
  { tag: "state:觀望",       consumable: false },
  { tag: "state:暴露",       consumable: false },
  { tag: "state:迷失",       consumable: false },
  { tag: "state:有情報",     consumable: false },
  { tag: "state:深入",       consumable: false },
  { tag: "state:絕境",       consumable: false },
];

// ─────────────────────────────────────────────
// Plot Tags — 劇情里程碑（不消耗，永久存在至探索結束）
// ─────────────────────────────────────────────
export const PLOT_TAGS = [
  // 生存/逃脫
  { tag: "plot:找到出路",         consumable: false, genres: ["恐怖","生存"] },
  { tag: "plot:退路截斷",         consumable: false, genres: ["恐怖","生存","推理"] },
  { tag: "plot:擊退威脅",         consumable: false, genres: ["恐怖","生存"] },
  { tag: "plot:受致命傷",         consumable: false, genres: ["恐怖","生存"] },
  { tag: "plot:慷慨赴死",         consumable: false, genres: ["生存","宮鬥"] },
  { tag: "plot:求救失敗",         consumable: false, genres: ["恐怖","生存"] },
  { tag: "plot:求救嘗試",         consumable: false, genres: ["恐怖","生存"] },
  // 恐怖/心理
  { tag: "plot:目睹禁忌",         consumable: false, genres: ["恐怖","推理"] },
  { tag: "plot:精神動搖",         consumable: false, genres: ["恐怖","推理"] },
  { tag: "plot:意識模糊",         consumable: false, genres: ["恐怖","搞笑"] },
  { tag: "plot:時間錯亂",         consumable: false, genres: ["恐怖"] },
  { tag: "plot:發現血跡",         consumable: false, genres: ["恐怖","推理"] },
  { tag: "plot:遇到陌生人",       consumable: false, genres: ["恐怖","生存","推理"] },
  { tag: "plot:發出聲響",         consumable: false, genres: ["恐怖","生存"] },
  { tag: "plot:器材故障",         consumable: false, genres: ["恐怖","生存"] },
  { tag: "plot:暴露行蹤",         consumable: false, genres: ["恐怖","推理","宮鬥"] },
  { tag: "plot:放棄思考",         consumable: false, genres: ["恐怖","推理"] },
  // 推理/真相
  { tag: "plot:取得關鍵證據",     consumable: false, genres: ["推理"] },
  { tag: "plot:識破謊言",         consumable: false, genres: ["推理","宮鬥"] },
  { tag: "plot:逼出供詞",         consumable: false, genres: ["推理","宮鬥"] },
  { tag: "plot:證據被毀",         consumable: false, genres: ["推理"] },
  { tag: "plot:真相留存",         consumable: false, genres: ["推理","生存"] },
  { tag: "plot:真相湮滅",         consumable: false, genres: ["推理"] },
  { tag: "plot:查明真相",         consumable: false, genres: ["推理"] },
  { tag: "plot:發現線索",         consumable: false, genres: ["推理"] },
  { tag: "plot:建立懷疑",         consumable: false, genres: ["推理","宮鬥"] },
  { tag: "plot:審訊完成",         consumable: false, genres: ["推理","宮鬥"] },
  { tag: "plot:確認嫌疑人",       consumable: false, genres: ["推理"] },
  { tag: "plot:跟蹤線索",         consumable: false, genres: ["推理","恐怖"] },
  { tag: "plot:獲得情報",         consumable: false, genres: ["推理","宮鬥"] },
  // 宮鬥/政治
  { tag: "plot:計謀敗露",         consumable: false, genres: ["宮鬥","推理"] },
  { tag: "plot:謀逆證據確立",     consumable: false, genres: ["宮鬥"] },
  { tag: "plot:遭到背叛",         consumable: false, genres: ["宮鬥","推理"] },
  { tag: "plot:扭轉局勢",         consumable: false, genres: ["宮鬥","生存"] },
  { tag: "plot:公開表態",         consumable: false, genres: ["宮鬥","搞笑"] },
  { tag: "plot:贏得支持",         consumable: false, genres: ["宮鬥","搞笑"] },
  { tag: "plot:信譽崩潰",         consumable: false, genres: ["宮鬥","搞笑"] },
  { tag: "plot:醜事曝光",         consumable: false, genres: ["宮鬥","搞笑"] },
  { tag: "plot:罪行確認",         consumable: false, genres: ["宮鬥","推理"] },
  { tag: "plot:結盟成功",         consumable: false, genres: ["宮鬥"] },
  { tag: "plot:結盟嘗試",         consumable: false, genres: ["宮鬥","推理"] },
  { tag: "plot:遭人陷害",         consumable: false, genres: ["宮鬥","推理"] },
  // 戀愛/情感
  { tag: "plot:告白成功",         consumable: false, genres: ["戀愛"] },
  { tag: "plot:遭到拒絕",         consumable: false, genres: ["戀愛"] },
  { tag: "plot:心結化解",         consumable: false, genres: ["戀愛","搞笑"] },
  { tag: "plot:獲得回應",         consumable: false, genres: ["戀愛"] },
  { tag: "plot:關係破裂",         consumable: false, genres: ["戀愛","宮鬥"] },
  { tag: "plot:誤會產生",         consumable: false, genres: ["戀愛","搞笑"] },
  { tag: "plot:誤會解開",         consumable: false, genres: ["戀愛","搞笑"] },
  { tag: "plot:秘密坦白",         consumable: false, genres: ["戀愛","推理"] },
  { tag: "plot:初次相遇",         consumable: false, genres: ["戀愛"] },
  { tag: "plot:共度危機",         consumable: false, genres: ["戀愛","生存"] },
  // 搞笑/意外
  { tag: "plot:意外曝光",         consumable: false, genres: ["搞笑"] },
  { tag: "plot:才能展現",         consumable: false, genres: ["搞笑","宮鬥"] },
  { tag: "plot:引起誤會",         consumable: false, genres: ["搞笑"] },
  { tag: "plot:搞砸計畫",         consumable: false, genres: ["搞笑","宮鬥"] },
  // 通用里程碑
  { tag: "plot:完成任務",         consumable: false, genres: ["全劇情類型"] },
  { tag: "plot:任務起點",         consumable: false, genres: ["全劇情類型"] },
  { tag: "plot:初步盤點",         consumable: false, genres: ["全劇情類型"] },
  { tag: "plot:取得鑰匙",         consumable: true,  genres: ["恐怖","生存","推理"] },
  { tag: "plot:取得道具",         consumable: true,  genres: ["全劇情類型"] },
  // 對峙串聯 tags
  { tag: "plot:對峙交鋒一",       consumable: false, genres: ["推理","宮鬥","戀愛"] },
  { tag: "plot:對峙交鋒二",       consumable: false, genres: ["推理","宮鬥","戀愛"] },
  // 已逃脫（禁止再觸發部分框架）
  { tag: "plot:已逃脫",           consumable: false, genres: ["恐怖","生存"] },
];

// ─────────────────────────────────────────────
// 可見 Tag 清單（玩家 UI 顯示用）
// ─────────────────────────────────────────────
export const VISIBLE_TAG_PREFIXES = ["world:"];
export const VISIBLE_PLOT_TAGS = [
  "plot:發現血跡",
  "plot:遇到陌生人",
  "plot:取得鑰匙",
  "plot:取得道具",
  "plot:發現線索",
  "plot:完成任務",
  "plot:告白成功",
  "plot:查明真相",
  "plot:取得關鍵證據",
];

// 道具類 world tag（item category），這些可消耗
export const ITEM_WORLD_TAGS = WORLD_TAGS
  .filter(t => t.category === "item")
  .map(t => t.tag);

// 快速查表：tag → 是否可消耗
export const TAG_CONSUMABLE_MAP = (() => {
  const map = {};
  [...WORLD_TAGS, ...STATE_TAGS, ...PLOT_TAGS].forEach(t => {
    map[t.tag] = t.consumable;
  });
  return map;
})();
