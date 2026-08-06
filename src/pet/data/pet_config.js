/* src/data/pet_config.js */
// 共用工廠函式 + 跨系統的調校數值。血統/性格/對話/道具已分別搬到
// pet_lineage.js / pet_personality.js / pet_dialogs.js / pet_shop_items.js，
// 這裡只留下建立寵物資料需要組裝這些東西的地方，以及不屬於任何單一
// 分類的小型調校常數。
import { PERSONALITY_KEYS } from './pet_personality.js';
import { DEFAULT_LINEAGE_ID } from './pet_lineage.js';

// ─── 衰減速率（每小時）──────────────────────────────
export const DECAY_RATES = { food: 2, mood: 3 };

// ─── 依附性格對親密度/經驗獲取的倍率 ─────────────────
// 安全型有小幅加成，恐懼型打七五折，鼓勵玩家維持穩定互動頻率
export const ATTACHMENT_AFFECTION_MULT = {
  '安全': 1.1,
  '焦慮': 1.0,
  '逃避': 0.9,
  '恐懼': 0.75,
};

// ─── 生病導致的血統懲罰累加量 ─────────────────────────
// 每從健康轉為生病一次，bias.neglect 就累加這個量（康復後不會歸零，
// 會留在血統紀錄上，影響這隻寵物未來生的孩子的體質血統）
export const NEGLECT_PER_SICKNESS = 1;

// ─── 共用：組出一隻寵物物件的基本欄位 ─────────────────
// 供 pet_roster.js（購買／裝備路徑）和 pet_breeding.js（出生／長大路徑）
// 共用，確保兩扇門進來的寵物資料格式永遠一致。
export function createBasePetFields(options = {}) {
  const now = Date.now();
  return {
    id:             options.id             ?? 'pet_01',
    name:           options.name           ?? '新寵物',
    level:          options.level          ?? 0,
    isGrowing:      options.isGrowing      ?? true,
    growthProgress: options.growthProgress ?? 0,
    food:           options.food           ?? 80,
    mood:           options.mood           ?? 80,
    affection:      options.affection      ?? 0,
    personality: options.personality ?? PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)],
    traits: options.traits ?? {
      task:       '無',
      attachment: '安全',
      taskVotes:  {},
    },
    bias:       options.bias       ?? { arrogance: 0, neglect: 0, anxiety: 0 },
    lineage:    options.lineage    ?? DEFAULT_LINEAGE_ID,
    geneLocked: options.geneLocked ?? false,
    generation: options.generation ?? 0,
    status:            options.status  ?? 'normal',
    rightPos:          options.rightPos ?? (15 + Math.random() * 55),
    lastUpdate:        now,
    lastInteract:      now,
    poops:             [],
    isSick:            false,
    recoveryProgress:  0,
    isPregnant:        false,
    pregnancyProgress: 0,
    // 從購買／裝備這扇門進來的寵物會是 true，PetWidget.jsx 掛載時會檢查
    // 這個欄位，只要為真就跳出取名視窗；出生／長大路徑的寵物一律是
    // false（那兩條路徑本來就已經有自己的取名步驟，走 BirthModal /
    // GrowUpModal）。
    needsNaming: options.needsNaming ?? false,
  };
}

// ─── 幫新寵物挑一個跟現有寵物保持距離的位置 ───────────
// rightPos 只在寵物誕生當下決定一次、之後終身不變，如果不做這層檢查，
// 純隨機抽出來的位置很容易剛好跟現有寵物太接近，導致兩隻寵物擠在一起
// 各自跑動畫，看起來像「黏在一起移動、分不開」，而且因為位置之後不會
// 再被修正，這個問題會一直持續下去。
export function pickSpacedRightPos(existingPets = []) {
  const occupied = existingPets.map(p => p.rightPos).filter(Number.isFinite);
  const MIN_GAP = 30; // 最小間距（百分比）
  let candidate;
  let attempts = 0;
  do {
    candidate = 15 + Math.random() * 55;
    attempts++;
  } while (occupied.some(o => Math.abs(o - candidate) < MIN_GAP) && attempts < 10);
  return candidate;
}