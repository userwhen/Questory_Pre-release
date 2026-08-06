// SpaceNavigation.js
// 空間移動共用模組：房間清單、鎖定判定、移動、道具/證物收集
// 純函式風格：不 mutate 傳入的 state，回傳新的 navState
// 供 SpacePlugin（密室/恐怖）與 DeductionPlugin（推理蒐證）共用

/**
 * 建立初始導航狀態
 * @param {object} roomsConfig
 * @param {Array}  roomsConfig.rooms - [{ id, name, reqTags?: string[] }]
 * @param {string} [roomsConfig.startRoomId] - 起始房間，不指定則用第一個
 */
export function createState(roomsConfig) {
  const rooms = roomsConfig?.rooms ?? [];
  const startRoomId = roomsConfig?.startRoomId ?? rooms[0]?.id ?? null;
  return {
    rooms,
    currentRoomId: startRoomId,
    visitedRooms: startRoomId ? [startRoomId] : [],
    collectedTags: [],
  };
}

/**
 * 取得目前房間清單（含鎖定/已訪問/當前位置標記，不強制過濾，UI 自行決定顯示方式）
 * @param {object} navState
 * @param {string[]} contextTags - 目前累積的所有 tag（world+state，會與 collectedTags 合併判斷）
 */
export function getAvailableRooms(navState, contextTags = []) {
  const tagSet = new Set([...contextTags, ...navState.collectedTags]);
  return navState.rooms.map(r => ({
    ...r,
    locked: Array.isArray(r.reqTags) && !r.reqTags.every(t => tagSet.has(t)),
    visited: navState.visitedRooms.includes(r.id),
    isCurrent: r.id === navState.currentRoomId,
  }));
}

/**
 * 移動到指定房間（呼叫前應先用 getAvailableRooms 確認未鎖定）
 * @returns {object} 新的 navState
 */
export function moveToRoom(navState, roomId) {
  const room = navState.rooms.find(r => r.id === roomId);
  if (!room) return navState;
  return {
    ...navState,
    currentRoomId: roomId,
    visitedRooms: navState.visitedRooms.includes(roomId)
      ? navState.visitedRooms
      : [...navState.visitedRooms, roomId],
  };
}

/**
 * 在目前房間收集到證物/鑰匙 tag
 * @returns {object} 新的 navState
 */
export function collectTag(navState, tag) {
  if (!tag || navState.collectedTags.includes(tag)) return navState;
  return {
    ...navState,
    collectedTags: [...navState.collectedTags, tag],
  };
}

/**
 * 檢查是否集滿指定 tag 組合（密室出口/推理指認常用）
 */
export function hasAllTags(navState, requiredTags = []) {
  return requiredTags.every(t => navState.collectedTags.includes(t));
}
