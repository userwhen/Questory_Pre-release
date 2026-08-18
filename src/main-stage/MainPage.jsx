// src/main-stage/MainPage.jsx
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { getQuickIcons } from '@/data/theme_config.js';
import CharacterSprite from '@/ui/CharacterSprite.jsx';
import { itemImgSrc } from '@/avatar/data/avatar_config.js';
import {
  StageContext,
  getGridCellX,
  getGridCellY,
  getDepthZIndex,
  getPerspectiveScale,
  DEPTH_TIEBREAK,
  CHARACTER_ASPECT_RATIO,
  cellsToPx,
  buildFootShadowStyle,
} from '@/main-stage/stageUtils.js';

// 舞台：固定設計稿
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
const FALLBACK_CHAR_HEIGHT_CELLS = 5.5;
const FALLBACK_CHARACTER_SLOT = { col: 4, row: 12 };

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

const WALL_PX_HEIGHT = DESIGN_GRID.wallRows * DESIGN_GRID.cellSize;
const FLOOR_PX_HEIGHT = DESIGN_GRID.floorRows * DESIGN_GRID.cellSize;

const Z = {
  BG: 0,
  UI: 5000,
};

export default function MainPage({ onNavigate }) {
  // 依照完整版：改為讀取 stage 而不是 avatar
  const { settings, stage } = useGameStore(s => ({
    settings: s.settings ?? {},
    stage: s.stage ?? null,
  }));

  const isBasic = settings.mode === 'basic';
  const quickIcons = getQuickIcons(settings.theme, isBasic);

  // 動態取得背景與實體狀態
  const backgrounds = stage?.backgrounds ?? { room: null, wall: null, floor: null };
  const mainEntity = (stage?.entities ?? []).find(e => e.id === 'main' || e.type === 'character');
  const characterSlot = mainEntity?.slot ?? stage?.characterSlot ?? FALLBACK_CHARACTER_SLOT;
  const charHeightCells = mainEntity?.heightCells ?? FALLBACK_CHAR_HEIGHT_CELLS;
  const wearing = mainEntity?.appearance?.wearing ?? {};

  const CHAR_X = getGridCellX(DESIGN_GRID, characterSlot.col);
  const CHAR_Y = getGridCellY(DESIGN_GRID, characterSlot.row);
  const CHAR_Z = getDepthZIndex(characterSlot.row, DEPTH_TIEBREAK.CHARACTER);
  const ACTOR_HEIGHT_PX = cellsToPx(DESIGN_GRID, charHeightCells);
  const CHAR_PERSPECTIVE = getPerspectiveScale(characterSlot.row, DESIGN_GRID, characterSlot.row);
  const CHAR_RENDER_HEIGHT = ACTOR_HEIGHT_PX * CHAR_PERSPECTIVE;

  // 使用 useMemo 避免不必要的 Context Re-render
  const stageValue = useMemo(() => ({
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
    characterSlot: { col: characterSlot.col, row: characterSlot.row },
  }), [ACTOR_HEIGHT_PX, characterSlot.col, characterSlot.row]);

  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ scale: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;

      const scale = Math.max(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
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
      // 依照完整版：改發送 EventBus 而不是直接 onNavigate
      EventBus.emit(Events.Stage.ENTITY_LONG_PRESS, {
        id: 'main',
        type: 'character',
        slot: { col: characterSlot.col, row: characterSlot.row },
      });
      // 如果你的初發版沒有實作事件監聽，想要維持原本行為，可以改回: onNavigate('stats');
    }, LONG_PRESS_MS);
  }, [characterSlot.col, characterSlot.row]);
  
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
              overflow: 'hidden',
            }}
          >
            <StageContext.Provider value={stageValue}>
              {backgrounds.room && itemImgSrc(backgrounds.room) && (
                <img
                  src={itemImgSrc(backgrounds.room)}
                  style={{ ...styles.bgImageBase, top: 0, height: DESIGN_HEIGHT }}
                  onError={e => { e.target.style.display = 'none'; }}
                  alt=""
                />
              )}
              {backgrounds.wall && itemImgSrc(backgrounds.wall) && (
                <img
                  src={itemImgSrc(backgrounds.wall)}
                  style={{
                    ...styles.bgImageBase,
                    top: 0,
                    height: WALL_PX_HEIGHT + 1,
                    objectFit: 'cover',
                    objectPosition: 'top',
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                  alt=""
                />
              )}
              {backgrounds.floor && itemImgSrc(backgrounds.floor) && (
                <img
                  src={itemImgSrc(backgrounds.floor)}
                  style={{
                    ...styles.bgImageBase,
                    top: WALL_PX_HEIGHT - 1,
                    height: FLOOR_PX_HEIGHT + 1,
                    objectFit: 'cover',
                    objectPosition: 'top',
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                  alt=""
                />
              )}

              {/* 主角色 */}
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
                  style={buildFootShadowStyle(DESIGN_GRID, characterSlot.col, characterSlot.row, {
                    widthPx: DESIGN_CELL * 2.2,
                    frontRow: characterSlot.row,
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
    objectPosition: 'center',
    opacity: 1,
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
    transformOrigin: 'center bottom',
    // 加入了完整版的呼吸動畫
    animation: 'char-breathe 2.8s ease-in-out infinite', 
  },
  charHitBox: {
    position: 'absolute',
    left: '22%',
    top: '12%',
    width: '56%',
    height: '78%',
    cursor: 'pointer',
    touchAction: 'none',
    pointerEvents: 'auto',
  },
};