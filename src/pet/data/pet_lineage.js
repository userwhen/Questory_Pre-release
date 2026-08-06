/* src/data/pet_lineage.js */
// 血統系統：血統字典、血統計算公式。只透過繁殖產生，出生當下鎖定、
// 終身不會被個體表現覆蓋。
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