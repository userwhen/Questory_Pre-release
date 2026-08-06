// TargetTracker.js
// 數值追蹤共用模組：單一數值池（工作養成）或多目標陣列（后宮好感度）皆可
// 供 RaisingPlugin、IntriguePlugin（自身地位值）共用

/**
 * @param {object} config
 * @param {'single'|'multi'} config.mode
 * @param {string[]} config.keys - single: 數值名稱清單；multi: 角色名稱清單
 */
export function createState(config) {
  const keys = config?.keys ?? [];
  const values = {};
  keys.forEach(k => { values[k] = 0; });
  return { mode: config?.mode ?? 'single', values };
}

/**
 * 調整指定 key 的數值
 * @returns {object} 新的 trackerState
 */
export function adjust(trackerState, key, delta) {
  if (!(key in trackerState.values)) return trackerState;
  return {
    ...trackerState,
    values: { ...trackerState.values, [key]: trackerState.values[key] + delta },
  };
}

/**
 * 取得數值最高的 key（multi 模式判定結局路線用）
 * @returns {{ key: string, value: number }|null}
 */
export function getHighest(trackerState) {
  const entries = Object.entries(trackerState.values);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { key: entries[0][0], value: entries[0][1] };
}

/**
 * 檢查某 key 是否達到門檻
 */
export function hasReached(trackerState, key, threshold) {
  return (trackerState.values[key] ?? 0) >= threshold;
}
