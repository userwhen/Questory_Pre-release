// ThreatSystem.js
// 威脅值/追擊共用模組：開場骰選強度，過程中累積，超過閾值視為被抓/曝光
// entityType 只是風味標籤（'ghost'|'monster'|'murderer'|'social_exposure'...），
// 不影響數值邏輯，只用來讓 StoryPoolSelector 抽對應風味的文字

const LEVEL_CONFIG = {
  低: { catchThreshold: 90, tickMultiplier: 0.6 },
  中: { catchThreshold: 75, tickMultiplier: 1.0 },
  高: { catchThreshold: 55, tickMultiplier: 1.5 },
};

const LEVEL_WEIGHTS = { 低: 0.4, 中: 0.4, 高: 0.2 };

/**
 * 開場骰選威脅強度（恆有威脅，只骰強弱）
 * @param {string} [pluginType] - 保留參數，未來可依 pluginType 微調權重表
 * @param {string} [entityType] - 保留參數，同上
 */
export function rollLevel(pluginType, entityType) {
  const roll = Math.random();
  let acc = 0;
  for (const [level, weight] of Object.entries(LEVEL_WEIGHTS)) {
    acc += weight;
    if (roll <= acc) return level;
  }
  return '中';
}

/**
 * 建立威脅狀態
 * @param {'低'|'中'|'高'} level
 * @param {string} entityType - 風味標籤
 */
export function createState(level, entityType) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG['中'];
  return {
    level,
    entityType,
    value: 0,
    catchThreshold: cfg.catchThreshold,
    tickMultiplier: cfg.tickMultiplier,
  };
}

/**
 * 威脅值變動（delta 為基礎變動量，實際套用會乘上強度係數）
 * @returns {object} 新的 threatState
 */
export function tick(threatState, delta) {
  if (!threatState) return threatState;
  const applied = delta * (threatState.tickMultiplier ?? 1);
  const value = Math.max(0, threatState.value + applied);
  return { ...threatState, value };
}

/**
 * 是否已達被抓/曝光閾值
 */
export function checkCaught(threatState) {
  if (!threatState) return false;
  return threatState.value >= threatState.catchThreshold;
}
