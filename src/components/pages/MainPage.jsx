// src/components/pages/MainPage.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/core/state.js';
import PetWidget from '@/pet/components/PetWidget.jsx';
import CompanionWidget from '@/avatar/components/CompanionWidget.jsx';
import { getQuickIcons } from '@/data/theme_config.js';
import CharacterSprite from '@/components/ui/CharacterSprite.jsx';
import { StageContext, getGridCellX, getGridCellY } from '@/components/ui/stage.js';

const Z = {
  BACKDROP: 1,
  CHARACTER: 2,
  PET: 3,
  UI: 20,
  DEBUG: 999,
};

const CHAR_MIN = 120;
const CHAR_MAX = 200;
const CHAR_WIDTH_RATIO = 0.35;
const CHAR_ASPECT = 1.5;
const CHAR_FOOT_RATIO = 0.20; // 牆面／地面交界，跟人物之前腳底線同一個比例
const STORY_BTN_ZONE = 70;
const GRID_SIDE_MARGIN = 16;

// 統一格子：欄數橫跨牆面+地面共用；牆面/地面各自的列數可以不同
// （地面通常要多留幾排給人物/陪伴者/寵物站不同前後排）。
const GRID_COLS = 10;
const WALL_GRID_ROWS = 3;
const FLOOR_GRID_ROWS = 3;

// 人物固定站在地面「最前排」（數字最大＝最靠近鏡頭）正中間那一欄。
const CHARACTER_ROW = WALL_GRID_ROWS + FLOOR_GRID_ROWS - 1;
const CHARACTER_COL = Math.floor(GRID_COLS / 2);

const QUICKBAR_TOP_RATIO = 0.04;
const QUICKBAR_RIGHT_RATIO = 0.04;
const QUICKBAR_ICON_SIZE = 50;
const QUICKBAR_GAP = 10;
const MIN_GAP = 20;

const MIN_SAFE_WIDTH =
  (CHAR_MIN / 2 + MIN_GAP + QUICKBAR_ICON_SIZE) / (0.5 - QUICKBAR_RIGHT_RATIO);

// ⚠️ 除錯用：把牆面/地面分界、統一格子線畫在畫面上，方便截圖核對。
// 定案後改 false 即可完全隱藏，不用刪程式碼。
const DEBUG_SHOW_GRID = true;

function DebugGridOverlay({ stage }) {
  const { wall, floor, grid } = stage;
  const colLines = [];
  for (let i = 1; i < grid.cols; i++) colLines.push(grid.originX + i * grid.cellWidth);
  const wallRowLines = [];
  for (let i = 1; i < grid.wallRows; i++) wallRowLines.push(wall.top + i * grid.wallCellHeight);
  const floorRowLines = [];
  for (let i = 1; i < grid.floorRows; i++) floorRowLines.push(floor.top + i * grid.floorCellHeight);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: Z.DEBUG, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: floor.top, left: 0, right: 0, borderTop: '2px dashed rgba(255,60,60,0.85)' }}>
        <span style={{ position: 'absolute', left: 4, top: -15, fontSize: 10, fontWeight: 700, color: 'rgba(255,60,60,0.95)', background: 'rgba(255,255,255,0.65)', padding: '0 3px', borderRadius: 3 }}>牆面／地面交界</span>
      </div>
      {colLines.map((x, i) => (
        <div key={`c${i}`} style={{ position: 'absolute', left: x, top: wall.top, bottom: floor.bottom, borderLeft: '1px dashed rgba(0,190,120,0.35)' }} />
      ))}
      {wallRowLines.map((y, i) => (
        <div key={`wr${i}`} style={{ position: 'absolute', top: y, left: grid.originX, right: grid.originX, borderTop: '1px dashed rgba(30,144,255,0.4)' }} />
      ))}
      {floorRowLines.map((y, i) => (
        <div key={`fr${i}`} style={{ position: 'absolute', top: y, left: grid.originX, right: grid.originX, borderTop: '1px dashed rgba(0,190,120,0.4)' }} />
      ))}
    </div>
  );
}

export default function MainPage({ onNavigate }) {
  const { avatar, settings, challenge } = useGameStore(s => ({
    avatar: s.avatar ?? {},
    settings: s.settings ?? {},
    challenge: s.challenge ?? null,
  }));

  const isBasic = settings.mode === 'basic';
  const wearing = avatar?.wearing ?? {};

  const handleAccept = useCallback(() => {
    useGameStore.setState(s => ({
      challenge: s.challenge ? { ...s.challenge, status: 'active', active: true } : null,
    }));
  }, []);

  const handleDecline = useCallback(() => {
    useGameStore.setState(() => ({ challenge: null }));
  }, []);

  const quickIcons = getQuickIcons(settings.theme, isBasic);
  const quickIconsCountRef = useRef(quickIcons.length);
  quickIconsCountRef.current = quickIcons.length;

  const containerRef = useRef(null);
  const [stage, setStage] = useState(() => ({
    charScale: CHAR_MIN,
    minWidth: MIN_SAFE_WIDTH,
    minHeight: (CHAR_MIN * CHAR_ASPECT) / (1 - CHAR_FOOT_RATIO),
    wall:  { top: 0, bottom: 0, left: GRID_SIDE_MARGIN, right: GRID_SIDE_MARGIN },
    floor: { top: 0, bottom: STORY_BTN_ZONE, left: GRID_SIDE_MARGIN, right: GRID_SIDE_MARGIN },
    grid: { cols: GRID_COLS, wallRows: WALL_GRID_ROWS, floorRows: FLOOR_GRID_ROWS, originX: GRID_SIDE_MARGIN, cellWidth: 0, wallCellHeight: 0, floorCellHeight: 0 },
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const charScale = Math.min(CHAR_MAX, Math.max(CHAR_MIN, w * CHAR_WIDTH_RATIO));
      const charHeight = charScale * CHAR_ASPECT;

      const floorTop = h * (1 - CHAR_FOOT_RATIO);

      const charMinHeight = charHeight / (1 - CHAR_FOOT_RATIO);
      const iconCount = quickIconsCountRef.current;
      const quickBarTotalHeight = iconCount * QUICKBAR_ICON_SIZE + Math.max(0, iconCount - 1) * QUICKBAR_GAP;
      const quickBarMinHeight =
        (quickBarTotalHeight + MIN_GAP) / (1 - CHAR_FOOT_RATIO - QUICKBAR_TOP_RATIO);
      const minHeight = Math.max(charMinHeight, quickBarMinHeight);

      const gridWidthPx = Math.max(0, w - GRID_SIDE_MARGIN * 2);
      const wallHeightPx = Math.max(0, floorTop);
      const floorHeightPx = Math.max(0, (h - STORY_BTN_ZONE) - floorTop);

      const grid = {
        cols: GRID_COLS,
        wallRows: WALL_GRID_ROWS,
        floorRows: FLOOR_GRID_ROWS,
        originX: GRID_SIDE_MARGIN,
        cellWidth: gridWidthPx / GRID_COLS,
        wallCellHeight: wallHeightPx / WALL_GRID_ROWS,
        floorCellHeight: floorHeightPx / FLOOR_GRID_ROWS,
      };

      setStage({
        charScale,
        minWidth: MIN_SAFE_WIDTH,
        minHeight,
        wall:  { top: 0, bottom: h - floorTop, left: GRID_SIDE_MARGIN, right: GRID_SIDE_MARGIN },
        floor: { top: floorTop, bottom: STORY_BTN_ZONE, left: GRID_SIDE_MARGIN, right: GRID_SIDE_MARGIN },
        grid,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const charX = getGridCellX(stage.grid, CHARACTER_COL);
  const charY = getGridCellY(stage, CHARACTER_ROW);

  return (
    <div
      ref={containerRef}
      style={{ ...styles.container, minWidth: stage.minWidth, minHeight: stage.minHeight }}
    >
      <StageContext.Provider value={stage}>
        {DEBUG_SHOW_GRID && <DebugGridOverlay stage={stage} />}

        {wearing.bg && (
          <img
            src={`img/${wearing.bg}.png`}
            style={styles.bgImage}
            onError={e => { e.target.style.display = 'none'; }}
            alt=""
          />
        )}

        {/* ⚠️ 陪伴者：格子位置(人物右邊一欄、同一排)已經想好，但
            CompanionWidget.jsx 內部定位邏輯還沒看過，先維持原本呼叫
            方式不變，等檔案給我再接上，不貿然傳入座標。 */}
        <div style={{ position: 'absolute', inset: 0, zIndex: Z.BACKDROP, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <CompanionWidget
              compId={wearing.companion}
              challenge={challenge}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          </div>
        </div>

        <div
          style={{ position: 'absolute', left: charX, top: charY, transform: 'translate(-50%, -100%)', zIndex: Z.CHARACTER, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onNavigate('stats')}
        >
          <div style={{ ...styles.charSprite, width: stage.charScale }}>
            <CharacterSprite wearing={wearing} />
          </div>
          <div style={styles.charShadow} />
        </div>

        <div style={{ position: 'absolute', inset: 0, zIndex: Z.PET, pointerEvents: 'none' }}>
          <PetWidget />
        </div>

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

        {!isBasic && (
          <div style={styles.storyBtnWrap}>
            <button style={styles.storyBtn} onClick={() => onNavigate('story')}>
              🌀 進入劇情模式
            </button>
          </div>
        )}
      </StageContext.Provider>
    </div>
  );
}

const styles = {
  container: {
    width: '100%', height: '100%',
    background: 'var(--bg-base,#fdf6ec)',
    position: 'relative', overflow: 'hidden',
    boxSizing: 'border-box',
  },
  bgImage: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover', opacity: 0.6, zIndex: 0,
  },
  quickBar: {
    position: 'absolute', top: `${QUICKBAR_TOP_RATIO * 100}%`, right: `${QUICKBAR_RIGHT_RATIO * 100}%`,
    display: 'flex', flexDirection: 'column', gap: QUICKBAR_GAP,
    zIndex: Z.UI,
  },
  quickBtn: {
    width: QUICKBAR_ICON_SIZE, height: QUICKBAR_ICON_SIZE, borderRadius: 12,
    background: 'rgba(44,26,14,0.06)',
    border: '1.5px solid rgba(44,26,14,0.12)',
    cursor: 'pointer', fontSize: '1.6rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(44,26,14,0.08)',
  },
  charSprite: {
    aspectRatio: '2 / 3',
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
  },
  charShadow: {
    width: 80, height: 12,
    background: 'rgba(0,0,0,0.35)',
    borderRadius: '50%', filter: 'blur(4px)', marginTop: -8,
  },
  storyBtnWrap: {
    position: 'absolute', bottom: 16, width: '100%',
    display: 'flex', justifyContent: 'center',
    zIndex: Z.UI,
  },
  storyBtn: {
    padding: '10px 28px', borderRadius: 9999,
    background: 'var(--color-correct,#227A59)', color: '#fff',
    border: 'none', fontWeight: 700, fontSize: '1rem',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 #185C42',
  },
};