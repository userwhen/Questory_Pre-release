// EvidenceCollector.js
// 證物/情報蒐集共用模組：累積 tag、判斷是否達到門檻
// 供 DeductionPlugin（推理蒐證）與 IntriguePlugin（打探對手情報）共用

export function createState() {
  return { collectedTags: [] };
}

/**
 * 收集一個證物/情報 tag
 * @returns {object} 新的 evidenceState
 */
export function collect(evidenceState, tag) {
  if (!tag || evidenceState.collectedTags.includes(tag)) return evidenceState;
  return { collectedTags: [...evidenceState.collectedTags, tag] };
}

/**
 * 是否集滿指定數量（不限定哪幾個，只看總數）
 */
export function hasCount(evidenceState, count) {
  return evidenceState.collectedTags.length >= count;
}

/**
 * 是否集滿指定的 tag 組合（限定必須是這幾個）
 */
export function hasAllTags(evidenceState, requiredTags = []) {
  return requiredTags.every(t => evidenceState.collectedTags.includes(t));
}

/**
 * 比對候選結局清單，回傳「證物組合最匹配」的一個
 * @param {object} evidenceState
 * @param {Array} candidates - [{ id, requiredTags: string[] }]
 * @returns {object|null}
 */
export function matchBestCandidate(evidenceState, candidates = []) {
  const tagSet = new Set(evidenceState.collectedTags);
  const matched = candidates.filter(c =>
    (c.requiredTags || []).every(t => tagSet.has(t))
  );
  if (matched.length === 0) return null;
  matched.sort((a, b) => (b.requiredTags?.length ?? 0) - (a.requiredTags?.length ?? 0));
  return matched[0];
}
