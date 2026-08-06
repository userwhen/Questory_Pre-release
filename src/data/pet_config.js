/* src/data/pet_config.js */

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

// ─── 性格資料表（資料驅動：新增/調整性格只需要改這裡的數字，不用動邏輯）──
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

// ─── 血統字典 ────────────────────────────────────────
// 只透過繁殖產生，出生當下鎖定、終身不變。名稱都是暫定，之後可以再換。
//   difficult：圖鑑上標星，代表需要長期把父母養到高等級、同時避免生病才熬得出來的稀有血統
//   smart    ：探險戰利品雙倍判定用的旗標（取代舊版寫死名稱字串的做法，之後改名不會失效）
//   hint     ：圖鑑未解鎖時卡片正面的模糊提示
export const LINEAGE_DICTIONARY = {
  '平民血統': { icon: '🧸', desc: '沒有繁殖紀錄的第一代寵物，血統一片空白，什麼可能性都有。',       hint: '所有寵物出生時的預設血統',   difficult: false, smart: false },
  '野生血統': { icon: '🐾', desc: '父母資質平庸，但體質異常強健，適應力很強。',                     hint: '父母等級偏低，但體質強健',   difficult: false, smart: false },
  '尋常血統': { icon: '🌱', desc: '父母資質平庸，體質也普普通通。',                                 hint: '父母等級偏低，體質普通',     difficult: false, smart: false },
  '病弱兒':   { icon: '😮‍💨', desc: '父母資質平庸，體質偏弱，需要多加留意牠的健康。',               hint: '父母等級偏低，體質偏弱',     difficult: false, smart: false },
  '良種之後': { icon: '🍀', desc: '父母資質中等，體質強健，是穩定的中堅血統。',                     hint: '父母等級中等，體質強健',     difficult: false, smart: false },
  '平凡之子': { icon: '🌾', desc: '父母資質中等，體質也中規中矩。',                                 hint: '父母等級中等，體質普通',     difficult: false, smart: false },
  '病嬌天才': { icon: '💎', desc: '父母資質中等，但體質偏弱，帶著一絲脆弱的聰慧。',                 hint: '父母等級中等，但體質偏弱',   difficult: false, smart: true  },
  '天賦異稟': { icon: '🌟', desc: '父母資質優異，體質也十分強健，是萬中選一的存在。',               hint: '父母等級很高，且體質強健',   difficult: true,  smart: true  },
  '資優之後': { icon: '✨', desc: '父母資質優異，體質普通。',                                       hint: '父母等級很高，體質普通',     difficult: false, smart: true  },
  '早慧薄命': { icon: '🥀', desc: '父母資質優異，但體質偏弱，聰明卻讓人有些擔心。',                 hint: '父母等級很高，但體質偏弱',   difficult: true,  smart: true  },
  '望族之子': { icon: '👑', desc: '出身歷經多代累積的大家庭，且體質強健，是家族的驕傲。',           hint: '出身大家庭，且體質強健',     difficult: true,  smart: false },
};

const INTELLECT_THRESHOLDS = { HIGH: 15, MID: 8 };
const CONSTITUTION_THRESHOLDS = { WEAK: 5, NORMAL: 2 };

function getIntellectTier(avgParentLevel) {
  if (avgParentLevel >= INTELLECT_THRESHOLDS.HIGH) return 'high';
  if (avgParentLevel >= INTELLECT_THRESHOLDS.MID) return 'mid';
  return 'low';
}
function getConstitutionTier(neglectBias, arroganceBias) {
  const sum = (neglectBias ?? 0) + (arroganceBias ?? 0);
  if (sum >= CONSTITUTION_THRESHOLDS.WEAK) return 'weak';
  if (sum >= CONSTITUTION_THRESHOLDS.NORMAL) return 'normal';
  return 'strong';
}

const LINEAGE_MATRIX_IDS = {
  low_strong: '野生血統',  low_normal: '尋常血統',  low_weak: '病弱兒',
  mid_strong: '良種之後',  mid_normal: '平凡之子',  mid_weak: '病嬌天才',
  high_strong: '天賦異稟', high_normal: '資優之後', high_weak: '早慧薄命',
};
const GENERATION_TOP_VARIANT_ID = '望族之子';
export const DEFAULT_LINEAGE_ID = '平民血統';

// 血統計算：只有「有父母資料」（真正透過繁殖出生）時才會算出真正的血統，
// 沒有父母資料（初代寵物、或自然長大的寵物）一律回傳預設血統。
export function calculateLineageId({ avgParentLevel, neglectBias, arroganceBias, generation }) {
  if (avgParentLevel === undefined || avgParentLevel === null) return DEFAULT_LINEAGE_ID;
  const intellectTier = getIntellectTier(avgParentLevel);
  const constitutionTier = getConstitutionTier(neglectBias, arroganceBias);
  if ((generation ?? 0) >= 1 && constitutionTier === 'strong') return GENERATION_TOP_VARIANT_ID;
  return LINEAGE_MATRIX_IDS[`${intellectTier}_${constitutionTier}`] ?? DEFAULT_LINEAGE_ID;
}

// ─── 共用：組出一隻寵物物件的基本欄位 ─────────────────
// 供 pet.js（出生／長大路徑）和 avatar.js（購買／裝備路徑）共用，確保
// 兩扇門進來的寵物資料格式永遠一致。放在資料層而不是任一個 engine 裡，
// 是因為 engine 之間不能互相 import，但兩邊都可以安全 import 資料層。
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

// ─── 生病導致的血統懲罰累加量 ─────────────────────────
// 每從健康轉為生病一次，bias.neglect 就累加這個量（康復後不會歸零，
// 會留在血統紀錄上，影響這隻寵物未來生的孩子的體質血統）
export const NEGLECT_PER_SICKNESS = 1;

// ─── 寵物對話庫 ─────────────────────────────────────
export const DIALOGS = {
  baby: [
    '(期待地看著你)', '(轉圈圈)', '咿呀？(歪頭看著你)',
    '(發出呼嚕呼嚕的聲音)', '抱抱！',
    '(用水汪汪的大眼睛盯著你)', '(睡眼惺忪地打了個哈欠)',
  ],
  // 生病期間專用對話：只要 isSick，UI 就固定顯示這組，不會顯示一般對話
  sick: [
    '咳咳...好難受...(看起來病懨懨的，一直在發抖)',
    '……(有氣無力地趴在地上，不太想理你)',
    '嗚嗚，身體好不舒服喔...(小小聲地哼哼著)',
  ],
  greetings: {
    '安全': ['嘿！你回來了呀！', '看到你心情就變好了～', '今天也要一起加油喔！'],
    '焦慮': ['你去哪了...不要丟下我...', '今天可以多陪我一下嗎？'],
    '逃避': ['喔，是你啊，我剛好在忙。', '我自己一個也可以過得很好。'],
    '恐懼': ['你...這次會留下來嗎？', '...你不會又馬上走掉吧？'],
  },
  supports: {
    STR: ['多流點汗感覺真好！', '今天也要充滿活力喔！'],
    INT: ['知識就是力量呢！', '集中精神，你能行的！'],
    AGI: ['熟能生巧，對吧？', '動作越來越俐落了呢！'],
    CHR: ['大家一定都很喜歡你！', '你的笑容最棒了！'],
    VIT: ['有什麼新點子嗎？', '盡情發揮想像力吧！'],
    LUK: ['努力會有回報的！', '一步一步慢慢累積吧！'],
    '無': [''],
  },
  // ⚠️ 這組 key 目前還是舊版性格（貪吃/貪玩/安靜），性格軸已經改成
  // 美食家/活潑/黏人/高冷/好奇，engine 端已經不會再讀這幾個舊 key 了，
  // 但對話文字要交給別人重新撰寫對應「美食家/活潑/黏人/高冷/好奇」的內容，
  // 這次先不動（避免影響核心邏輯定稿的驗證範圍）
  actions: {
    '貪吃': ['(不停地嗅著地板，好像在找零食)', '(看著你的口袋，口水快流出來了)'],
    '貪玩': ['(興奮地跳來跳去，體力無限！)', '(邀你一起玩球，尾巴搖得飛快)'],
    '安靜': ['(害羞地從角落看著你)', '(靜靜地坐在窗邊看窗外)'],
    '嗜睡': ['(半夢半醒地揉著眼睛)', '(找了個舒服的角落縮成一團)'],
    '好奇': ['(盯著螢幕看，研究你在做什麼)', '(歪著頭觀察路過的影子)'],
  },
};

// ─── 補給站道具 ─────────────────────────────────────
export const PET_SHOP_ITEMS = [
  { id: 'sys_pet_food', name: '頂級寵物飼料', icon: '🍖', price: 50, currency: 'gold', type: 'food', val: 20, desc: '回復 20 點飽食度' },
  { id: 'sys_pet_toy',  name: '毛線球玩具',   icon: '🧶', price: 50, currency: 'gold', type: 'toy',  val: 20, desc: '回復 20 點心情'   },
];