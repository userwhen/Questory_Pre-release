// TestimonySystem.js
// 逆轉裁判式辯論子系統：陳述逐句檢視，用證據 tag 指認矛盾點
// 僅供 DeductionPlugin 的辯論子模式（stage: 'debate'）使用

/**
 * 建立辯論狀態
 * @param {object} testimonyConfig
 * @param {Array} testimonyConfig.statements
 *   - [{ id, contradiction: null | { requiredEvidenceTag, exposeResult } }]
 */
export function createState(testimonyConfig) {
  const statements = testimonyConfig?.statements ?? [];
  return {
    statements,
    exposedIds: [],
    pressedIds: [],
    failCount: 0,
  };
}

/**
 * 取得目前完整證詞清單（含每句是否已被拆穿/追問的標記，供 UI 顯示）
 */
export function getTestimony(testimonyState) {
  return testimonyState.statements.map(s => ({
    id: s.id,
    exposed: testimonyState.exposedIds.includes(s.id),
    pressed: testimonyState.pressedIds.includes(s.id),
  }));
}

/**
 * 追問某句陳述（可能吐露細節，不影響矛盾判定）
 * @returns {object} 新的 testimonyState
 */
export function pressStatement(statementId, testimonyState) {
  if (testimonyState.pressedIds.includes(statementId)) return testimonyState;
  return {
    ...testimonyState,
    pressedIds: [...testimonyState.pressedIds, statementId],
  };
}

/**
 * 對指定陳述提出證據
 * @returns {{ testimonyState: object, result: 'correct'|'wrong'|'no_contradiction' }}
 */
export function presentEvidence(statementId, evidenceTag, testimonyState) {
  const stmt = testimonyState.statements.find(s => s.id === statementId);

  if (!stmt || !stmt.contradiction) {
    return { testimonyState, result: 'no_contradiction' };
  }

  if (stmt.contradiction.requiredEvidenceTag === evidenceTag) {
    const exposedIds = testimonyState.exposedIds.includes(statementId)
      ? testimonyState.exposedIds
      : [...testimonyState.exposedIds, statementId];
    return {
      testimonyState: { ...testimonyState, exposedIds },
      result: 'correct',
    };
  }

  return {
    testimonyState: { ...testimonyState, failCount: testimonyState.failCount + 1 },
    result: 'wrong',
  };
}

/**
 * 是否所有含矛盾的陳述都已被拆穿（辯論過關判定用）
 */
export function isFullyExposed(testimonyState) {
  const contradictable = testimonyState.statements.filter(s => s.contradiction);
  return contradictable.every(s => testimonyState.exposedIds.includes(s.id));
}
