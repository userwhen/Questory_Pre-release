// StoryPoolSelector.js
// 取代 FrameSelector.js：四維度篩選 + 三級降級
// 維度：applicable_plugins（含 pluginType）→ stage → tags(require/forbid) → tension
//
// entityType 風味比對（ghost/monster/murderer...）不獨立成第五維度，
// 由呼叫端在 contextTags 裡塞一個 "state:entity_ghost" 這種標籤即可，
// 走一般 tag 比對機制，不用在這裡特殊處理。

/**
 * 從劇情池中選出符合當前情境的片段
 * @param {object} params
 * @param {Array}    params.pool         - 劇情池全部片段
 * @param {string}   params.pluginType   - 目前遊戲類別 key（如 'escape_room'）
 * @param {string}   params.stage        - 目前階段（如 'start' | 'loop' | 'debate'）
 * @param {string[]} params.contextTags  - 目前所有 tag（TagManager.getAllTags()，含 world+state）
 * @param {string}   params.tensionLevel - '低'|'中'|'高'|'極限'
 * @param {string[]} [params.visitedIds] - 本次遊玩已用過的片段 id（防重複，陣列傳入，非 Set）
 * @returns {object|null} 抽中的片段，或 null（三級降級後仍無結果，交由呼叫端處理 fallback）
 */
export function selectSnippet({
  pool,
  pluginType,
  stage,
  contextTags = [],
  tensionLevel,
  visitedIds = [],
}) {
  // 第一層：plugin + stage + 排除已用過
  const basePool = filterByPluginAndStage(pool, pluginType, stage, visitedIds);
  if (basePool.length === 0) return null;

  // 第二層：Tag 過濾（require + forbid）
  const tagPool = filterByTags(basePool, contextTags);
  if (tagPool.length === 0) return null;

  // 第三層：張力過濾
  const tensionPool = filterByTension(tagPool, tensionLevel);
  if (tensionPool.length > 0) {
    return randomPick(tensionPool);
  }

  // ── 降級 Level 1：放寬張力區間上下各一檔 ──
  const relaxedPool = filterByTensionRelaxed(tagPool, tensionLevel);
  if (relaxedPool.length > 0) {
    return randomPick(relaxedPool);
  }

  // ── 降級 Level 2：移除 forbid_tags 限制，只保留 require_tags ──
  const requireOnlyPool = filterByRequireOnly(basePool, contextTags);
  if (requireOnlyPool.length > 0) {
    return randomPick(requireOnlyPool);
  }

  // ── 降級 Level 3：回傳 null，交給呼叫端處理（例如強制結局或用通用備案片段）──
  return null;
}

// ─────────────────────────────────────────────
// 過濾函式
// ─────────────────────────────────────────────

function filterByPluginAndStage(pool, pluginType, stage, visitedIds) {
  const visited = new Set(visitedIds); // 內部加速比對用，不影響外部傳入格式
  return pool.filter(s =>
    Array.isArray(s.applicable_plugins) &&
    s.applicable_plugins.includes(pluginType) &&
    s.stage === stage &&
    !visited.has(s.id)
  );
}

function filterByTags(snippets, contextTags) {
  const tagSet = new Set(contextTags);
  return snippets.filter(s => {
    const reqOk = !s.require_tags || s.require_tags.every(t => tagSet.has(t));
    const forbidOk = !s.forbid_tags || !s.forbid_tags.some(t => tagSet.has(t));
    return reqOk && forbidOk;
  });
}

function filterByTension(snippets, target) {
  // 片段未標記 tension 視為任何張力皆適用
  return snippets.filter(s => !s.tension || s.tension === target);
}

function filterByTensionRelaxed(snippets, target) {
  const levels = ['低', '中', '高', '極限'];
  const idx = levels.indexOf(target);
  if (idx === -1) return snippets;
  const adjacent = new Set([
    levels[idx],
    levels[Math.max(0, idx - 1)],
    levels[Math.min(levels.length - 1, idx + 1)],
  ]);
  return snippets.filter(s => !s.tension || adjacent.has(s.tension));
}

function filterByRequireOnly(snippets, contextTags) {
  const tagSet = new Set(contextTags);
  return snippets.filter(s => !s.require_tags || s.require_tags.every(t => tagSet.has(t)));
}

// ─────────────────────────────────────────────
// 工具
// ─────────────────────────────────────────────

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
