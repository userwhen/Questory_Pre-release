// CriticalGate.js
// 關鍵節點正確性判定共用模組：特定回合/階段需要玩家選對 action_tag
// 失敗行為可配置：
//   'endGame' — 直接觸發指定壞結局（上位模式：關鍵回合選錯，劇情提前收尾）
//   'retry'   — 原地重試，不結束（學習模式：答錯不過關，換一題/同一題再來）
// 供 RaisingPlugin（上位模式關鍵回合）、LearningPlugin（螺旋式答題）共用

/**
 * 檢查本次 actionTag 是否通過關鍵判定
 * @param {object} gateConfig
 * @param {string[]} gateConfig.validTags - 正確答案的 action_tag 清單
 * @param {'endGame'|'retry'} gateConfig.onFail
 * @param {string} [gateConfig.failEndingId] - onFail==='endGame' 時必填
 * @param {string} actionTag - 玩家本次選擇
 * @returns {{ passed: boolean, action: 'advance'|'endGame'|'retry', endingId?: string }}
 */
export function evaluate(gateConfig, actionTag) {
  const passed = (gateConfig.validTags || []).includes(actionTag);

  if (passed) {
    return { passed: true, action: 'advance' };
  }

  if (gateConfig.onFail === 'endGame') {
    return { passed: false, action: 'endGame', endingId: gateConfig.failEndingId };
  }

  return { passed: false, action: 'retry' };
}
