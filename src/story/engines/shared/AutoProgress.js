// AutoProgress.js
// 自動遞增進度共用模組：不受玩家行動影響、每回合自動推進的數值
// 供 IntriguePlugin（對手陰謀進度，逼玩家不能純防守）等場景共用

/**
 * @param {number} threshold - 達到此值視為「自動完成」（例如對手陰謀得逞）
 * @param {number} ratePerRound - 每回合自動增加量，強度可依威脅骰選結果調整
 */
export function createState(threshold, ratePerRound) {
  return { value: 0, threshold, ratePerRound };
}

/**
 * 推進一回合（不管玩家做了什麼都呼叫一次）
 * @returns {object} 新的 progressState
 */
export function tick(progressState) {
  return { ...progressState, value: progressState.value + progressState.ratePerRound };
}

/**
 * 手動介入減緩/打斷進度（例如玩家成功拆穿對手時呼叫）
 * @returns {object} 新的 progressState
 */
export function interrupt(progressState, amount) {
  return { ...progressState, value: Math.max(0, progressState.value - amount) };
}

export function isCompleted(progressState) {
  return progressState.value >= progressState.threshold;
}
