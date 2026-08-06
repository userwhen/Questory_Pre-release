// RoundEngine.js
// 回合計數共用模組：推進回合、判斷是否跑完
// 供 RaisingPlugin、IntriguePlugin、LearningPlugin 共用

export function createState(totalRounds) {
  return { currentRound: 0, totalRounds };
}

/**
 * @returns {object} 新的 roundState
 */
export function advance(roundState) {
  return { ...roundState, currentRound: roundState.currentRound + 1 };
}

export function isFinished(roundState) {
  return roundState.currentRound >= roundState.totalRounds;
}
