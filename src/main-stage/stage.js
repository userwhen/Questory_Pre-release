// src/main-stage/stage.js
import { createContext, useContext } from 'react';

export const StageContext = createContext({
  actorHeight: 160,
  wall:  { top: 0, bottom: 0, left: 0, right: 0 },
  floor: { top: 0, bottom: 0, left: 0, right: 0 },
  grid: {
    cols: 9,
    totalRows: 9,
    wallRows: 4,
    floorRows: 4,
    storyRows: 1,
    originX: 0,
    cellSize: 0,
    usableColMin: 0,
    usableColMax: 6,
  },
  characterSlot: { col: 4, row: 7 },
});

export function useStage() {
  return useContext(StageContext);
}

export function getGridCellX(grid, col) {
  return grid.originX + (col + 0.5) * grid.cellSize;
}

// 直接吃 grid（跟 getGridCellX 對齊，不要吃 stage）。
export function getGridCellY(grid, row) {
  return (row + 0.5) * grid.cellSize;
}

export function getTotalGridRows(grid) {
  return grid.totalRows;
}

// px → 格數：把一個以「格」為單位的高度換算成目前 grid.cellSize 下的
// 實際像素值。cellSize 現在是設計稿常數（見 MainPage 的 DESIGN_CELL），
// 不再是裝置現場量測出來的浮動值。
export function cellsToPx(grid, cells) {
  return (grid?.cellSize ?? 0) * cells;
}

/**
 * 可巡邏的列範圍。float 含牆面+地面，ground 只算地面。
 * heightCells > 0 時會排除「站在這排、身體會從畫布頂端穿出去」的列。
 *
 * ⚠️ 這裡直接吃「幾格高」（heightCells），不是「像素高度 ÷ cellSize」
 * 換算出來的連續值——因為所有實體的高度本來就是用「幾格」設計的
 * （人物5格/寵物2-3格/幼寵1.5格），不需要先轉成 px 再除回格數這一趟
 * 換算，直接用格數比較，純整數/格子邏輯，不依賴任何連續的像素度量。
 *
 * 保底：至少留最後一排（離鏡頭最近那排）能站，不會整個範圍被排光。
 */
export function getRoamRowRange(grid, roamType, heightCells = 0) {
  const floorEnd = grid.wallRows + grid.floorRows - 1;
  const rowMax = floorEnd;
  // float 可進牆面區，但不要從 row=0 起跳（頭部容易頂出設計稿）
  // ground 只在地面
  let rowMin = roamType === 'float' ? 1 : grid.wallRows;

  if (heightCells > 0) {
    // 腳錨點在 row 這一格的正中央（row+0.5），身體往上佔 heightCells
    // 格，最上緣落在 (row+0.5-heightCells)。
    // 再多留 0.5 格頂部安全距，避免 idle 浮動動畫（translateY -6~-8px）
    // 或 perspective 縮放後仍貼邊／畫出框外。
    const minRowForHeight = Math.ceil(heightCells - 0.5 + 0.5);
    rowMin = Math.max(rowMin, minRowForHeight);
    if (rowMin > rowMax) rowMin = rowMax;
  }
  return [rowMin, rowMax];
}

// colBounds 可覆寫欄位範圍（例如寵物要無視 ICON 安全區，傳
// { min: 0, max: grid.cols - 1 }）；不傳就用 grid.usableColMin/Max。
// 注意：UI 禁止停留已改由 isStayForbidden / hardOccupied 處理，
// 預設 colBounds 仍尊重 usableColMin/Max，避免一開始就抽到 ICON 欄。
function resolveColBounds(grid, colBounds) {
  const colMin = colBounds?.min ?? grid.usableColMin;
  const colMax = colBounds?.max ?? grid.usableColMax;
  return [colMin, colMax];
}

export function assignGridSlot(index, grid, roamType, heightCells = 0, colBounds = null) {
  const [rowMin, rowMax] = getRoamRowRange(grid, roamType, heightCells);
  const rowSpan = Math.max(1, rowMax - rowMin + 1);
  const [colMin, colMax] = resolveColBounds(grid, colBounds);
  const usableCols = Math.max(1, colMax - colMin + 1);
  const col = colMin + (index % usableCols);
  const row = rowMin + (Math.floor(index / usableCols) % rowSpan);
  return { col, row };
}

// ── 人物占用格：ㅗ 形（腳底橫 3、身體中間 1 往上）────────────────
/** 腳底列左右各擴幾欄（1 → 腳列共 3 格）。 */
export const CHARACTER_OCCUPY_COL_RADIUS = 1;

/**
 * ㅗ 占用：
 *   腳錨列（characterSlot.row）：col ± colRadius（橫向 3 格）
 *   其上身體列：僅 characterSlot.col（中間一格往上）
 * 上半身兩側不在占用內 → 可停留、路徑可穿（z-index 依 row，不會蓋住人物）。
 * 路徑規劃（planMovePath）會把整組 ㅗ 當障礙，逼出 L 折線繞行。
 */
export function getCharacterOccupiedSlots(
  characterSlot,
  heightCells = ACTOR_HEIGHT_CELLS,
  colRadius = CHARACTER_OCCUPY_COL_RADIUS,
  grid = null,
) {
  if (!characterSlot) return [];
  const slots = [];
  const topRow = Math.max(0, characterSlot.row - Math.ceil(heightCells - 0.5));
  const footRow = characterSlot.row;
  const colMinBound = grid ? 0 : -Infinity;
  const colMaxBound = grid ? grid.cols - 1 : Infinity;

  const push = (c, r) => {
    if (c < colMinBound || c > colMaxBound) return;
    slots.push({ col: c, row: r });
  };

  // 腳列：橫向 3 格
  for (let dc = -colRadius; dc <= colRadius; dc++) {
    push(characterSlot.col + dc, footRow);
  }
  // 身體：僅中間 col，從頭頂到腳上一格
  for (let r = topRow; r < footRow; r++) {
    push(characterSlot.col, r);
  }
  return slots;
}

/** 把占用格轉成 "col,row" Set，方便路徑檢測。 */
export function occupiedSlotsToSet(slots) {
  const set = new Set();
  (slots ?? []).forEach(s => set.add(`${s.col},${s.row}`));
  return set;
}

/**
 * 格線直線 A→B 經過的格子（含終點、不含起點）。
 * 用簡易 grid walk，足夠大廳短距移動。
 */
export function cellsOnLine(from, to) {
  if (!from || !to) return [];
  const cells = [];
  let c0 = from.col;
  let r0 = from.row;
  const c1 = to.col;
  const r1 = to.row;
  const dc = Math.sign(c1 - c0);
  const dr = Math.sign(r1 - r0);
  const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  if (steps === 0) return [];
  for (let i = 1; i <= steps; i++) {
    // 先對齊較長軸，短軸按比例（近似）
    const t = i / steps;
    const c = c0 + Math.round((c1 - c0) * t);
    const r = r0 + Math.round((r1 - r0) * t);
    const key = `${c},${r}`;
    if (cells.length === 0 || cells[cells.length - 1].col !== c || cells[cells.length - 1].row !== r) {
      cells.push({ col: c, row: r });
    }
  }
  // 確保終點在內
  if (cells.length === 0 || cells[cells.length - 1].col !== c1 || cells[cells.length - 1].row !== r1) {
    cells.push({ col: c1, row: r1 });
  }
  return cells;
}

export function pathHitsObstacles(from, to, obstacleSet) {
  if (!obstacleSet || obstacleSet.size === 0) return false;
  return cellsOnLine(from, to).some(s => obstacleSet.has(`${s.col},${s.row}`));
}

/**
 * 規劃移動路徑：直線不撞障礙就直走；否則試 L 折線（先橫後縱／先縱後橫）。
 * 兩種 L 都失敗時（常發生在 from/to 同一 row 或同一 col——這時 L 的
 * 轉角會跟起點或終點重合，被判定為無效，於是永遠掉到「直接一條線
 * 衝過去」，導致貫穿障礙物），再試「Z 字」：從 obstacleSet 直接算出
 * 障礙物在這段路徑欄位/列範圍內的實際 row/col 範圍，繞到邊緣之外
 * 再折回終點。
 *
 * bounds（可選）：{ rowMin, rowMax, colMin, colMax }，繞路的中繼點
 * 一定要落在這個範圍內才算數——沒有這層限制的話，繞路可能算出一個
 * 「幾何上避開障礙物、但實際上跑出這個實體合法可移動範圍」的點
 * （例如地面型陪伴者繞過人物「頭上」時，算出的 viaRow 落進牆面區）。
 * 呼叫端應該傳入該實體自己的 roam row/col 範圍（見 getRoamRowRange）。
 * 不傳就完全不限制，維持舊行為。
 *
 * 回傳 waypoints（不含起點，含終點），例如 [mid, to] 或 [p1, p2, to]。
 * 全部嘗試都失敗時仍回 [to]（保底不卡死；視覺上可能仍擦邊）。
 */
export function planMovePath(from, to, obstacleSet, bounds = null) {
  if (!from || !to) return to ? [to] : [];
  if (from.col === to.col && from.row === to.row) return [to];
  if (!pathHitsObstacles(from, to, obstacleSet)) return [to];

  const midH = { col: to.col, row: from.row }; // 先橫移
  const midV = { col: from.col, row: to.row }; // 先縱移

  const tryL = (mid) => {
    if (mid.col === from.col && mid.row === from.row) return false;
    if (mid.col === to.col && mid.row === to.row) return false;
    // 轉角本身若在障礙上也不行
    if (obstacleSet?.has(`${mid.col},${mid.row}`)) return false;
    if (pathHitsObstacles(from, mid, obstacleSet)) return false;
    if (pathHitsObstacles(mid, to, obstacleSet)) return false;
    return true;
  };

  const okH = tryL(midH);
  const okV = tryL(midV);
  if (okH && okV) {
    // 選總步數較短的；一樣就隨機
    const lenH = Math.abs(midH.col - from.col) + Math.abs(to.row - midH.row);
    const lenV = Math.abs(midV.row - from.row) + Math.abs(to.col - midV.col);
    if (lenH < lenV) return [midH, to];
    if (lenV < lenH) return [midV, to];
    return Math.random() < 0.5 ? [midH, to] : [midV, to];
  }
  if (okH) return [midH, to];
  if (okV) return [midV, to];

  // Z 字繞路：中繼點分別在 viaRow（橫向繞）或 viaCol（縱向繞）。
  const tryZViaRow = (viaRow) => {
    if (bounds?.rowMin != null && viaRow < bounds.rowMin) return null;
    if (bounds?.rowMax != null && viaRow > bounds.rowMax) return null;
    const p1 = { col: from.col, row: viaRow };
    const p2 = { col: to.col, row: viaRow };
    if (obstacleSet?.has(`${p1.col},${p1.row}`)) return null;
    if (obstacleSet?.has(`${p2.col},${p2.row}`)) return null;
    if (pathHitsObstacles(from, p1, obstacleSet)) return null;
    if (pathHitsObstacles(p1, p2, obstacleSet)) return null;
    if (pathHitsObstacles(p2, to, obstacleSet)) return null;
    return [p1, p2, to];
  };
  const tryZViaCol = (viaCol) => {
    if (bounds?.colMin != null && viaCol < bounds.colMin) return null;
    if (bounds?.colMax != null && viaCol > bounds.colMax) return null;
    const p1 = { col: viaCol, row: from.row };
    const p2 = { col: viaCol, row: to.row };
    if (obstacleSet?.has(`${p1.col},${p1.row}`)) return null;
    if (obstacleSet?.has(`${p2.col},${p2.row}`)) return null;
    if (pathHitsObstacles(from, p1, obstacleSet)) return null;
    if (pathHitsObstacles(p1, p2, obstacleSet)) return null;
    if (pathHitsObstacles(p2, to, obstacleSet)) return null;
    return [p1, p2, to];
  };

  if (obstacleSet && obstacleSet.size > 0) {
    const colLo = Math.min(from.col, to.col);
    const colHi = Math.max(from.col, to.col);
    const rowLo = Math.min(from.row, to.row);
    const rowHi = Math.max(from.row, to.row);
    let obsRowMin = Infinity, obsRowMax = -Infinity;
    let obsColMin = Infinity, obsColMax = -Infinity;
    for (const key of obstacleSet) {
      const [c, r] = key.split(',').map(Number);
      if (c >= colLo && c <= colHi) {
        if (r < obsRowMin) obsRowMin = r;
        if (r > obsRowMax) obsRowMax = r;
      }
      if (r >= rowLo && r <= rowHi) {
        if (c < obsColMin) obsColMin = c;
        if (c > obsColMax) obsColMax = c;
      }
    }
    if (obsRowMax > -Infinity) {
      // 先試「往前繞」（obsRowMax+1，人物腳前）；地面型此路徑幾乎必過。
      // 「往後繞」（obsRowMin-1，人物頭上）只有 bounds 允許進牆面區
      // （漂浮型）時才會被 tryZViaRow 接受。
      const z = tryZViaRow(obsRowMax + 1) || tryZViaRow(obsRowMin - 1);
      if (z) return z;
    }
    if (obsColMax > -Infinity) {
      const z = tryZViaCol(obsColMax + 1) || tryZViaCol(obsColMin - 1);
      if (z) return z;
    }
  }

  return [to];
}

/** UI（ICON）禁止停留的欄位。目前 = usableColMax 右邊那幾欄。 */
export function getUIForbiddenCols(grid) {
  if (!grid) return [];
  const cols = [];
  for (let c = (grid.usableColMax ?? grid.cols - 2) + 1; c < grid.cols; c++) {
    cols.push(c);
  }
  return cols;
}

/**
 * 判斷 (col, row) 是否為「硬性禁止停留」：
 * - UI ICON 欄，但只在牆面區生效（row < wallRows）——ICON 按鈕貼在
 *   畫面右上，跟牆面/裝飾區重疊的視覺風險比地板區高很多；地板區
 *   （row >= wallRows）改成軟性避開，見 isUISoftAvoid + pickRandomGridSlot
 * - 人物占用格
 * soft（其他實體目前位置 / 地板區 ICON 欄）不在這裡判斷，由 pick 時
 * 另做 SOFT_RETRY 次重試。
 */
export function isHardStayForbidden(col, row, { grid, characterSlot, includeUI = true, includeCharacter = true } = {}) {
  if (includeUI && grid) {
    const uiCols = getUIForbiddenCols(grid);
    const wallRows = grid.wallRows ?? 0;
    if (uiCols.includes(col) && row < wallRows) return true;
  }
  if (includeCharacter && characterSlot) {
    const occ = getCharacterOccupiedSlots(characterSlot, ACTOR_HEIGHT_CELLS, CHARACTER_OCCUPY_COL_RADIUS, grid);
    if (occ.some(s => s.col === col && s.row === row)) return true;
  }
  return false;
}

/**
 * ICON 欄在地板區（row >= wallRows）的軟性避開：不像牆面區那樣硬擋，
 * 只是盡量不要停在這裡——跟 otherSlots 共用 pickRandomGridSlot 裡同一套
 * SOFT_RETRY 重試機制。
 */
export function isUISoftAvoid(col, row, grid) {
  if (!grid) return false;
  const uiCols = getUIForbiddenCols(grid);
  const wallRows = grid.wallRows ?? 0;
  return uiCols.includes(col) && row >= wallRows;
}

// ── 輕量占用註冊（模組級，避免為了互斥再拉一層 React context）──
const _occupancy = {
  companion: null, // { col, row } | null
  pets: new Map(), // id(string) -> { col, row }
};

export function setCompanionOccupancy(slot) {
  _occupancy.companion = slot ? { col: slot.col, row: slot.row } : null;
}

export function setPetOccupancy(id, slot) {
  if (id == null) return;
  if (!slot) _occupancy.pets.delete(String(id));
  else _occupancy.pets.set(String(id), { col: slot.col, row: slot.row });
}

/**
 * 取得「其他實體」目前占用格（給軟性互斥用）。
 * exclude: { type: 'companion' } | { type: 'pet', id }
 */
export function getOtherEntitySlots(exclude = null) {
  const list = [];
  if (!(exclude?.type === 'companion') && _occupancy.companion) {
    list.push({ ..._occupancy.companion });
  }
  for (const [id, s] of _occupancy.pets) {
    if (exclude?.type === 'pet' && String(exclude.id) === id) continue;
    list.push({ ...s });
  }
  return list;
}

/**
 * 從合法範圍內挑一個格子。options：
 *   exclude     — { col, row } 不要選到跟目前一樣的格子
 *   heightCells — 邊界安全檢查用，幾格高（見 getRoamRowRange）
 *   colBounds   — 覆寫可用欄位範圍
 *   avoidFront  — { col, row, radius } 禁止「跟這個點同一排、欄位在
 *                  radius 內」。用在陪伴者「不能站在人物正前方」，
 *                  radius=0 代表只排除完全同一格，同排左右不受影響。
 *   avoidBehind — { col, row, colRadius, rowSpan } 禁止「這一欄附近、
 *                  且比這個 row 更靠牆（row 更小）」的一塊矩形帶。用在
 *                  「不要讓寵物/陪伴者主動跑到人物背後」。
 *   patrol      — { col, row, radius } 只在目前位置附近幾格內選（隨機
 *                  漫步），不是整個可移動範圍隨機跳。
 *   characterSlot — 人物占用（硬性禁止停留）
 *   otherSlots  — 其他實體目前位置（軟性：最多重試 SOFT_RETRY 次）
 *   includeUI   — 是否把 ICON 欄當硬性禁止（預設 true）
 */
const SOFT_RETRY = 2;

export function pickRandomGridSlot(grid, roamType, options = {}) {
  const {
    exclude = null,
    heightCells = 0,
    colBounds = null,
    rowBounds = null, // { min?, max? } 額外限制列範圍（例如陪伴者不可站人物正前方）
    avoidFront = null,
    avoidBehind = null,
    patrol = null,
    characterSlot = null,
    otherSlots = null,
    includeUI = true,
  } = options;

  const [rowMinBase0, rowMaxBase0] = getRoamRowRange(grid, roamType, heightCells);
  // rowBounds 在 patrol 之前套用，作為這次選點的「合法列」上限／下限
  const rowMinBase = rowBounds?.min != null ? Math.max(rowMinBase0, rowBounds.min) : rowMinBase0;
  const rowMaxBase = rowBounds?.max != null ? Math.min(rowMaxBase0, rowBounds.max) : rowMaxBase0;
  const [colMinBase, colMaxBase] = resolveColBounds(grid, colBounds);

  let rowMin = rowMinBase, rowMax = rowMaxBase;
  let colMin = colMinBase, colMax = colMaxBase;

  if (patrol && patrol.radius > 0) {
    const pRowMin = Math.max(rowMinBase, patrol.row - patrol.radius);
    const pRowMax = Math.min(rowMaxBase, patrol.row + patrol.radius);
    const pColMin = Math.max(colMinBase, patrol.col - patrol.radius);
    const pColMax = Math.min(colMaxBase, patrol.col + patrol.radius);
    // 範圍交集要有效才採用，避免半徑太小夾出空集合
    if (pRowMin <= pRowMax && pColMin <= pColMax) {
      rowMin = pRowMin; rowMax = pRowMax; colMin = pColMin; colMax = pColMax;
    }
  }

  const rows = [];
  for (let r = rowMin; r <= rowMax; r++) rows.push(r);
  const cols = [];
  for (let c = colMin; c <= colMax; c++) cols.push(c);

  if (rows.length === 0 || cols.length === 0) {
    return { col: colMinBase, row: rowMinBase };
  }

  const softList = otherSlots ?? [];

  const hitsExclude = (col, row) => exclude && col === exclude.col && row === exclude.row;
  const hitsFront = (col, row) =>
    avoidFront && row === avoidFront.row && Math.abs(col - avoidFront.col) <= avoidFront.radius;
  const hitsBehind = (col, row) =>
    avoidBehind &&
    Math.abs(col - avoidBehind.col) <= avoidBehind.colRadius &&
    row < avoidBehind.row &&
    row >= avoidBehind.row - avoidBehind.rowSpan;
  const hitsHard = (col, row) =>
    isHardStayForbidden(col, row, { grid, characterSlot, includeUI, includeCharacter: !!characterSlot });
  const hitsSoft = (col, row) =>
    softList.some(s => s.col === col && s.row === row) || isUISoftAvoid(col, row, grid);

  // 硬性（UI / 人物 / front / behind / exclude）永遠不能當目標
  const isHardBlocked = (col, row) =>
    hitsExclude(col, row) || hitsFront(col, row) || hitsBehind(col, row) || hitsHard(col, row);

  let attempts = 0;
  let softHits = 0;
  let col, row;
  do {
    col = cols[Math.floor(Math.random() * cols.length)];
    row = rows[Math.floor(Math.random() * rows.length)];
    attempts++;
    if (isHardBlocked(col, row)) continue;
    if (hitsSoft(col, row)) {
      softHits++;
      // 軟性互斥：最多再試 SOFT_RETRY 次，超過就接受重疊
      if (softHits <= SOFT_RETRY) continue;
    }
    break;
  } while (attempts < 20);

  // 保底：若最後一抽仍硬性撞到，往非禁區推一格（優先避開 front/behind/人物）
  if (isHardBlocked(col, row)) {
    const zone = (avoidBehind && hitsBehind(col, row)) ? avoidBehind
      : (avoidFront && hitsFront(col, row)) ? avoidFront
      : null;
    if (zone) {
      const radius = zone.colRadius ?? zone.radius ?? 0;
      const zoneColMin = zone.col - radius;
      const zoneColMax = zone.col + radius;
      const mid = (colMin + colMax) / 2;
      col = zone.col <= mid ? Math.min(colMax, zoneColMax + 1) : Math.max(colMin, zoneColMin - 1);
    }
    // 再檢查硬性；若仍撞，掃描找第一個非硬性格
    if (isHardBlocked(col, row)) {
      let found = false;
      for (const r of rows) {
        for (const c of cols) {
          if (!isHardBlocked(c, r)) {
            col = c; row = r; found = true; break;
          }
        }
        if (found) break;
      }
    }
  }

  return { col, row };
}

/**
 * 把一個格子座標夾回目前 grid 的合法範圍。目前 grid 尺寸已經是固定的
 * 設計稿常數，理論上不會再變了，但保留這個函式給之後真的有需要「夾回
 * 邊界」的情境用（例如允許使用者未來自訂欄數之類的擴充）。
 */
export function clampGridSlot(slot, grid, roamType, heightCells = 0, colBounds = null) {
  if (!slot) return null;
  const [rowMin, rowMax] = getRoamRowRange(grid, roamType, heightCells);
  const [colMin, colMax] = resolveColBounds(grid, colBounds);
  const col = Math.min(colMax, Math.max(colMin, slot.col));
  const row = Math.min(rowMax, Math.max(rowMin, slot.row));
  return { col, row };
}

// ── 「不要主動跑到人物背後/正前方」的禁區建構器 ──────────────────
export const BEHIND_ZONE_COL_RADIUS = 1;
export const BEHIND_ZONE_ROW_SPAN = 2;

export function buildBehindZone(characterSlot) {
  if (!characterSlot) return null;
  return {
    col: characterSlot.col,
    row: characterSlot.row,
    colRadius: BEHIND_ZONE_COL_RADIUS,
    rowSpan: BEHIND_ZONE_ROW_SPAN,
  };
}

export function buildFrontZone(characterSlot, radius = 0) {
  if (!characterSlot) return null;
  return { col: characterSlot.col, row: characterSlot.row, radius };
}

/**
 * 景深用的 z-index：純粹依 row 決定，row 愈大（愈靠近鏡頭）疊得愈上面。
 */
const DEPTH_Z_BASE = 1000;
const DEPTH_Z_ROW_STEP = 100;
export function getDepthZIndex(row, tiebreak = 0) {
  return DEPTH_Z_BASE + row * DEPTH_Z_ROW_STEP + tiebreak;
}

export const DEPTH_TIEBREAK = {
  /** 陰影永遠低於同 row 實體，避免疊在一起時影蓋过人 */
  SHADOW: -40,
  COMPANION: 0,
  CHARACTER: 40,
  PET: 80,
};

const PERSPECTIVE_MIN_SCALE = 0.55;
const PERSPECTIVE_MAX_SCALE = 1;

/**
 * 近大遠小：frontRow（預設站人物那排＝地板最前排）縮放 1.0，
 * 愈往牆面（row 愈小）縮得愈小，線性內插。
 */
export function getPerspectiveScale(row, grid, frontRow = null) {
  const front = frontRow ?? (grid.wallRows + grid.floorRows - 1);
  const back = 0;
  if (front <= back) return PERSPECTIVE_MAX_SCALE;
  const t = Math.min(1, Math.max(0, (row - back) / (front - back)));
  return PERSPECTIVE_MIN_SCALE + t * (PERSPECTIVE_MAX_SCALE - PERSPECTIVE_MIN_SCALE);
}

/**
 * 跟 getPerspectiveScale 一樣，但漂浮型（float）進入牆面區
 * （row < wallRows）後凍結在「地面最後一格」（row = wallRows）
 * 當下的縮放值，不再繼續縮小。ground 型物件本來就不會進牆面區，
 * 這裡直接等同 getPerspectiveScale。
 */
export function getRoamPerspectiveScale(row, grid, roamType, frontRow = null) {
  const effectiveRow = roamType === 'float' ? Math.max(row, grid.wallRows) : row;
  return getPerspectiveScale(effectiveRow, grid, frontRow);
}

// ── 尺寸基準：全部以「格」為單位，改一個數字全站統一調整 ──────────
export const ACTOR_HEIGHT_CELLS = 7;

// 人物實際渲染比例（寬/高）。MainPage 的 CharacterSprite 用
// aspectRatio: '2 / 3' 撐開高度換算寬度，這裡抽出同一個數字給
// debug overlay／未來任何需要精確算人物視覺寬度的地方用，避免
// 兩邊各自硬編、之後改比例漏改一邊。
export const CHARACTER_ASPECT_RATIO = 2 / 3; // width / height

export const PET_HEIGHT_CELLS_BASE = 3;
export const PET_HEIGHT_CELLS_PER_LEVEL = 0.1;
export const PET_HEIGHT_CELLS_MAX = 4;
export const BABY_HEIGHT_CELLS = 2;

/**
 * 陰影落點列：地面實體跟腳錨同 row；
 * 若腳在牆面區（row < wallRows，漂浮），影投影到第一排地面（wallRows）。
 */
export function getShadowRow(slotRow, grid) {
  if (!grid || slotRow == null) return slotRow ?? 0;
  return Math.max(slotRow, grid.wallRows);
}

// ── 陰影可調常數（集中改這裡）──────────────────────────────────
/**
 * 影中心 = 立足點本身（正式設計，不是除錯用的暫時值）：影子直接代表
 * 腳錨座標，方便美術對齊——新畫的圖只要讓圖片本身的「腳底」對準這個
 * 點（也就是外層 translate(-50%,-100%) 的錨點）即可，不需要再另外
 * 猜一個美術修正值。若某張圖真的需要微調，個別呼叫端可用 yOffsetPx
 * 覆蓋，但預設是 0。
 */
export const SHADOW_Y_OFFSET_PX = 0;
/** 預設不透明度（人物／陪伴） */
export const SHADOW_OPACITY = 0.22;
/** 寵物更淡 */
export const SHADOW_OPACITY_PET = 0.14;
/** 橢圓高寬比 */
export const SHADOW_HEIGHT_RATIO = 0.32;
/** blur */
export const SHADOW_BLUR_PX = 3;

/**
 * 橢圓陰影本體樣式（不含 left/top）。
 * kind: 'default' | 'pet' — 寵物更淡、略小。
 * yOffsetPx: 覆蓋預設 SHADOW_Y_OFFSET_PX。
 */
export function footShadowStyle(scale = 1, widthPx = 48, {
  kind = 'default',
  yOffsetPx = SHADOW_Y_OFFSET_PX,
} = {}) {
  const opacity = kind === 'pet' ? SHADOW_OPACITY_PET : SHADOW_OPACITY;
  const sizeMul = kind === 'pet' ? 0.85 : 1;
  const w = Math.max(12, widthPx * scale * sizeMul);
  const h = Math.max(4, w * SHADOW_HEIGHT_RATIO);
  return {
    position: 'absolute',
    width: w,
    height: h,
    borderRadius: '50%',
    background: `rgba(0,0,0,${opacity})`,
    filter: `blur(${SHADOW_BLUR_PX}px)`,
    pointerEvents: 'none',
    // 水平置中；垂直：-50% 對格心後再加 yOffset（負值上移，上緣進小腿）
    transform: `translate(-50%, calc(-50% + ${yOffsetPx}px))`,
  };
}

/**
 * 陰影樣式 — 掛在角色定位 wrapper 內，與 left/top 移動完全同步。
 * 結構：
 *   div.position (left/top transition, translate(-50%,-100%))
 *     div.shadow  ← 本函式；不進 idle 動畫
 *     img/anim   ← walk/float 只動這裡
 *
 * 漂浮時：影相對腳錨往下推到地面列（deltaY），仍跟 wrapper 一起橫移。
 */
export function buildFootShadowStyle(grid, slotCol, slotRow, {
  widthPx = 48,
  frontRow = null,
  kind = 'default',
  yOffsetPx = SHADOW_Y_OFFSET_PX,
} = {}) {
  if (!grid || slotRow == null) return { display: 'none' };
  const shadowRow = getShadowRow(slotRow, grid);
  const footY = getGridCellY(grid, slotRow);
  const shadowY = getGridCellY(grid, shadowRow);
  const deltaY = shadowY - footY; // 地面 0；漂浮時 > 0（影往下到地面）
  const scale = getPerspectiveScale(shadowRow, grid, frontRow);
  const base = footShadowStyle(scale, widthPx, { kind, yOffsetPx });
  return {
    ...base,
    left: '50%',
    top: `calc(100% + ${deltaY}px)`,
    zIndex: 'var(--z-bg)',
  };
}

// 純格數，不需要 grid：exclusion 檢查用這個，不要用 px 版本。
export function getPetHeightCells(level = 1) {
  return Math.min(
    PET_HEIGHT_CELLS_MAX,
    PET_HEIGHT_CELLS_BASE + Math.min(5, Math.max(1, level)) * PET_HEIGHT_CELLS_PER_LEVEL
  );
}

// px 版本（渲染用）：cellsToPx 的薄包裝，方便呼叫端一行拿到能直接
// 塞進 style.height 的數字。
export function getPetBaseHeight(grid, level = 1) {
  return cellsToPx(grid, getPetHeightCells(level));
}

export function getBabyHeight(grid) {
  return cellsToPx(grid, BABY_HEIGHT_CELLS);
}

// ── 移動速度／時長 ─────────────────────────────────────────────
const MOVE_MIN_DURATION_S = 0.9;
const MOVE_MAX_DURATION_S = 3.2;

export const PET_BASE_SPEED_PX_S = 58;
export const COMPANION_BASE_SPEED_PX_S = 52;

export function computeMoveDuration(distancePx, baseSpeedPxPerSec, movementProfile, isDash = false) {
  const jitter = 0.85 + Math.random() * 0.3;
  const speed = baseSpeedPxPerSec
    * (movementProfile?.speedMultiplier ?? 1)
    * (isDash ? (movementProfile?.dashSpeedMult ?? 1) : 1)
    * jitter;
  const raw = distancePx / Math.max(1, speed);
  return Math.min(MOVE_MAX_DURATION_S, Math.max(MOVE_MIN_DURATION_S, raw));
}