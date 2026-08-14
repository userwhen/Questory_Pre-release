// src/main-stage/MainPage.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/core/state.js';
import { getQuickIcons } from '@/data/theme_config.js';
import CharacterSprite from '@/ui/CharacterSprite.jsx';
import {
  StageContext,
  getGridCellX,
  getGridCellY,
  getDepthZIndex,
  getPerspectiveScale,
  DEPTH_TIEBREAK,
  ACTOR_HEIGHT_CELLS,
  CHARACTER_ASPECT_RATIO,
  cellsToPx,
  buildFootShadowStyle,
} from '@/main-stage/stage.js';

// 舞台：固定設計稿 + cover 填滿 PANEL（水平垂直置中裁切）
// UI：ICON 在 PANEL 座標，不跟舞台 scale
// 格數：牆8 / 地7 → 地平線約在垂直中間（已拿掉原本底部空白列）
const DESIGN_COLS = 9;
const DESIGN_WALL_ROWS = 8;
const DESIGN_FLOOR_ROWS = 7;
const DESIGN_CELL = 40;
const DESIGN_SIDE_MARGIN = 16;
const ICON_RESERVED_COLS = 1;

const DESIGN_TOTAL_ROWS = DESIGN_WALL_ROWS + DESIGN_FLOOR_ROWS;
const DESIGN_WIDTH = DESIGN_COLS * DESIGN_CELL + DESIGN_SIDE_MARGIN * 2;
const DESIGN_HEIGHT = DESIGN_TOTAL_ROWS * DESIGN_CELL;

const LONG_PRESS_MS = 500;

const DESIGN_GRID = {
  cols: DESIGN_COLS,
  totalRows: DESIGN_TOTAL_ROWS,
  wallRows: DESIGN_WALL_ROWS,
  floorRows: DESIGN_FLOOR_ROWS,
  originX: DESIGN_SIDE_MARGIN,
  cellSize: DESIGN_CELL,
  usableColMin: 0,
  usableColMax: DESIGN_COLS - 1 - ICON_RESERVED_COLS,
};

// 人物固定站在 row12（維持既有視覺位置）。
// 原本是用 STORY_ROW - CHAR_ROWS_ABOVE_STORY 算出來的，拿掉底部空白列後直接寫死，避免跟著往上移。
const CHARACTER_ROW = 12;
const CHARACTER_COL = Math.min(
  DESIGN_GRID.usableColMax,
  Math.max(DESIGN_GRID.usableColMin, Math.floor(DESIGN_COLS / 2))
);
const CHARACTER_SLOT = { col: CHARACTER_COL, row: CHARACTER_ROW };
const CHAR_X = getGridCellX(DESIGN_GRID, CHARACTER_COL);
const CHAR_Y = getGridCellY(DESIGN_GRID, CHARACTER_ROW);
const CHAR_Z = getDepthZIndex(CHARACTER_ROW, DEPTH_TIEBREAK.CHARACTER);
const ACTOR_HEIGHT_PX = cellsToPx(DESIGN_GRID, ACTOR_HEIGHT_CELLS);
const CHAR_PERSPECTIVE = getPerspectiveScale(CHARACTER_ROW, DESIGN_GRID, CHARACTER_ROW);
const CHAR_RENDER_HEIGHT = ACTOR_HEIGHT_PX * CHAR_PERSPECTIVE;

const WALL_PX_HEIGHT = DESIGN_GRID.wallRows * DESIGN_GRID.cellSize;
const FLOOR_PX_HEIGHT = DESIGN_GRID.floorRows * DESIGN_GRID.cellSize;

const STAGE_VALUE = {
  actorHeight: ACTOR_HEIGHT_PX,
  wall: {
    top: 0,
    bottom: DESIGN_HEIGHT - WALL_PX_HEIGHT,
    left: DESIGN_SIDE_MARGIN,
    right: DESIGN_SIDE_MARGIN,
  },
  floor: {
    top: WALL_PX_HEIGHT,
    bottom: DESIGN_HEIGHT - (WALL_PX_HEIGHT + FLOOR_PX_HEIGHT),
    left: DESIGN_SIDE_MARGIN,
    right: DESIGN_SIDE_MARGIN,
  },
  grid: DESIGN_GRID,
  characterSlot: CHARACTER_SLOT,
};

const Z = {
  BG: 0,
  UI: 5000,
};

export default function MainPage({ onNavigate }) {
  const { avatar, settings } = useGameStore(s => ({
    avatar: s.avatar ?? {},
    settings: s.settings ?? {},
  }));

  const isBasic = settings.mode === 'basic';
  const wearing = avatar?.wearing ?? {};

  const quickIcons = getQuickIcons(settings.theme, isBasic);

  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ scale: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;

      // 以寬為主：寬度貼齊 PANEL，維持「正常寬」
      // 僅當舞台因此高於 PANEL 時才再縮小（極矮螢幕）
      // 極高視窗：上下露出 container 深色（HUD/Nav 同系），不把房間拉高變形
      let scale = w / DESIGN_WIDTH;
      if (DESIGN_HEIGHT * scale > h) {
        scale = h / DESIGN_HEIGHT;
      }
      const scaledW = DESIGN_WIDTH * scale;
      const scaledH = DESIGN_HEIGHT * scale;
      const offsetX = (w - scaledW) / 2;
      const offsetY = (h - scaledH) / 2;

      setViewport({ scale, offsetX, offsetY });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const longPressTimerRef = useRef(null);
  const clearLongPress = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);
  const handleCharPointerDown = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      onNavigate('stats');
    }, LONG_PRESS_MS);
  }, [onNavigate]);
  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);

  return (
    <div ref={containerRef} style={styles.container}>
      {viewport.scale > 0 && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
              transformOrigin: 'top left',
              overflow: 'hidden', // 防止漂浮實體頭部／身體畫出設計稿框外
            }}
          >
            <StageContext.Provider value={STAGE_VALUE}>
              {/* 完整房間背景（可與牆/地共存；在最底） */}
              {wearing.room_bg && (
                <img
                  src={`img/${wearing.room_bg}.png`}
                  style={{ ...styles.bgImageBase, top: 0, height: DESIGN_HEIGHT }}
                  onError={e => { e.target.style.display = 'none'; }}
                  alt=""
                />
              )}
              {wearing.wall_bg && (
                <img
                  src={`img/${wearing.wall_bg}.png`}
                  style={{ ...styles.bgImageBase, top: 0, height: WALL_PX_HEIGHT }}
                  onError={e => { e.target.style.display = 'none'; }}
                  alt=""
                />
              )}
              {wearing.floor_bg && (
                <img
                  src={`img/${wearing.floor_bg}.png`}
                  style={{ ...styles.bgImageBase, top: WALL_PX_HEIGHT, height: FLOOR_PX_HEIGHT }}
                  onError={e => { e.target.style.display = 'none'; }}
                  alt=""
                />
              )}

              {/* 主角色：外層定位；陰影掛在定位層內與移動同步 */}
              <div
                style={{
                  position: 'absolute',
                  left: CHAR_X,
                  top: CHAR_Y,
                  transform: 'translate(-50%, -100%)',
                  zIndex: CHAR_Z,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={buildFootShadowStyle(DESIGN_GRID, CHARACTER_COL, CHARACTER_ROW, {
                    widthPx: DESIGN_CELL * 2.2,
                    frontRow: CHARACTER_ROW,
                  })}
                />
                <div style={{ ...styles.charSprite, height: CHAR_RENDER_HEIGHT, position: 'relative', zIndex: 1 }}>
                  <CharacterSprite wearing={wearing} />
                  <div
                    style={styles.charHitBox}
                    onPointerDown={handleCharPointerDown}
                    onPointerUp={clearLongPress}
                    onPointerLeave={clearLongPress}
                    onPointerCancel={clearLongPress}
                  />
                </div>
              </div>
            </StageContext.Provider>
          </div>

          <div style={styles.uiLayer}>
            <div style={styles.quickBar}>
              {quickIcons.map((item, i) => (
                <button
                  key={i}
                  style={styles.quickBtn}
                  onClick={() => onNavigate(item.page ?? item.val ?? item.action)}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    background: 'var(--bg-hud, #2c1a0e)',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  bgImageBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    objectFit: 'cover',
    opacity: 1, // 不壓暗；需要淡化時再調
    zIndex: Z.BG,
  },
  uiLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: Z.UI,
    pointerEvents: 'none',
  },
  quickBar: {
    position: 'absolute',
    top: '4%',
    right: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    pointerEvents: 'auto',
  },
  quickBtn: {
    width: 'var(--size-md)',
    height: 'var(--size-md)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.92)',
    border: '1.5px solid rgba(44,26,14,0.12)',
    cursor: 'pointer',
    fontSize: 'var(--size-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-xs)',
  },
  charSprite: {
    aspectRatio: String(CHARACTER_ASPECT_RATIO),
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
  },
  // 軀幹中心點擊區：寬約 40%、高約 35%，垂直放在中上（胸口）
  // 四肢仍可與其他實體視覺重疊，但長按／點擊只認這裡
  charHitBox: {
    position: 'absolute',
    left: '30%',
    top: '28%',
    width: '40%',
    height: '35%',
    cursor: 'pointer',
    touchAction: 'none',
    pointerEvents: 'auto',
    // 除錯時可暫時打開背景看範圍：
    // background: 'rgba(255,0,0,0.25)',
  },
};