// src/components/ui/stage.js
import { createContext, useContext } from 'react';

export const StageContext = createContext({
  charScale: 160,
  wall:  { top: 0, bottom: 0, left: 0, right: 0 },
  floor: { top: 0, bottom: 0, left: 0, right: 0 },
  grid: { cols: 1, wallRows: 1, floorRows: 1, originX: 0, cellWidth: 0, wallCellHeight: 0, floorCellHeight: 0 },
});

export function useStage() {
  return useContext(StageContext);
}

/**
 * 統一格子系統：欄(col)橫跨牆面+地面共用同一組欄寬；列(row)分兩段——
 * row 0 ~ grid.wallRows-1 是牆面列（由上到下），
 * row grid.wallRows ~ grid.wallRows+grid.floorRows-1 是地面列（由上到下）。
 * 回傳的座標是相對 MainPage 容器本身的絕對像素位置，不是相對某個
 * 子區域——這樣同一個實體（例如飄浮寵物）row 索引連續變化時，才能
 * 視覺上從牆面無縫滑到地面，不用切換座標系統或處理兩套 offset。
 */
export function getGridCellX(grid, col) {
  return grid.originX + (col + 0.5) * grid.cellWidth;
}

export function getGridCellY(stage, row) {
  const { wall, floor, grid } = stage;
  if (row < grid.wallRows) {
    return wall.top + (row + 0.5) * grid.wallCellHeight;
  }
  const floorRow = row - grid.wallRows;
  return floor.top + (floorRow + 0.5) * grid.floorCellHeight;
}

export function getTotalGridRows(grid) {
  return grid.wallRows + grid.floorRows;
}

/**
 * 依 roamType 決定可用的列範圍。'float'（飄浮/飛行/水中，例如鸚鵡、
 * 小丑魚）可以用牆面+地面整段；預設（一般地面寵物）只能用地面那幾排。
 */
export function getRoamRowRange(grid, roamType) {
  const total = getTotalGridRows(grid);
  if (roamType === 'float') return [0, total - 1];
  return [grid.wallRows, total - 1];
}

/**
 * 簡單的格子分配：同一批實體依 index 依序分配 (col,row)，
 * 在允許的列範圍內先排滿列、再往下一欄放，兩側各留一欄當邊界。
 */
export function assignGridSlot(index, grid, roamType) {
  const [rowMin, rowMax] = getRoamRowRange(grid, roamType);
  const rowSpan = Math.max(1, rowMax - rowMin + 1);
  const usableCols = Math.max(1, grid.cols - 2);
  const row = rowMin + (index % rowSpan);
  const col = 1 + (Math.floor(index / rowSpan) % usableCols);
  return { col, row };
}