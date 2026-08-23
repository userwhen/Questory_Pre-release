/* src/hooks/usePressGesture.js */
import { useRef } from 'react';

// ── 統一長按/滑動手勢邏輯 ──────────────────────────────
// 從 TaskCard.jsx 抽出來，Task/Skill/Ach 三處卡片共用同一套手感：
//   長按 600ms → onLongPress（進編輯）
//   水平滑動超過 56px → onSwipeSelect（進勾選/選取模式，帶滑出動畫）
// disabled 為 true 時整組手勢直接不綁定（例如唯讀卡片、已經在勾選模式中）。
const MOVE_CANCEL_PX = 10;
const SWIPE_THRESHOLD_PX = 56;
const LONG_PRESS_MS = 600;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

export function usePressGesture({ onLongPress, onSwipeSelect, disabled = false } = {}) {
  const swipeOrigin = useRef({ x: 0, y: 0 });
  const swipeArmed = useRef(false);
  const skipClick = useRef(false);
  const longPressTimer = useRef(null);
  const longPressOrigin = useRef({ x: 0, y: 0 });
  const longPressFired = useRef(false);
  const cardRef = useRef(null);
  const swipeDx = useRef(0);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const resetCardTransform = () => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.2s ease-out';
      cardRef.current.style.transform = 'translateX(0)';
    }
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    swipeOrigin.current = { x: e.clientX, y: e.clientY };
    swipeArmed.current = true;
    skipClick.current = false;
    swipeDx.current = 0;
    longPressFired.current = false;
    longPressOrigin.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      skipClick.current = true;
      swipeArmed.current = false;
      resetCardTransform();
      onLongPress && onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!swipeArmed.current && !longPressTimer.current) return;
    const dx = e.clientX - swipeOrigin.current.x;
    const dy = e.clientY - swipeOrigin.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 移動超過短距離 → 取消長按（改走滑動）
    if (longPressTimer.current) {
      const ldx = Math.abs(e.clientX - longPressOrigin.current.x);
      const ldy = Math.abs(e.clientY - longPressOrigin.current.y);
      if (ldx > LONG_PRESS_MOVE_CANCEL_PX || ldy > LONG_PRESS_MOVE_CANCEL_PX) {
        clearLongPress();
      }
    }

    if (!swipeArmed.current) return;

    // 垂直優先（判定為捲動，取消滑動）
    if (absDy > absDx && absDy > MOVE_CANCEL_PX) {
      swipeArmed.current = false;
      resetCardTransform();
      return;
    }

    // 跟手位移（卡片滑出感覺）
    if (absDx > 4 && cardRef.current) {
      swipeDx.current = dx;
      const clamped = Math.max(-80, Math.min(80, dx * 0.6));
      cardRef.current.style.transition = 'none';
      cardRef.current.style.transform = `translateX(${clamped}px)`;
    }

    if (absDx >= SWIPE_THRESHOLD_PX) {
      swipeArmed.current = false;
      skipClick.current = true;
      clearLongPress();
      if (cardRef.current) {
        const dir = dx > 0 ? 1 : -1;
        cardRef.current.style.transition = 'transform 0.18s ease-out';
        cardRef.current.style.transform = `translateX(${dir * 120}px)`;
        setTimeout(() => {
          resetCardTransform();
          onSwipeSelect && onSwipeSelect();
        }, 160);
      } else {
        onSwipeSelect && onSwipeSelect();
      }
    }
  };

  const handlePointerUp = () => {
    clearLongPress();
    if (swipeArmed.current && Math.abs(swipeDx.current) < SWIPE_THRESHOLD_PX) {
      resetCardTransform();
    }
    swipeArmed.current = false;
  };

  const handlePointerCancel = () => {
    clearLongPress();
    swipeArmed.current = false;
    resetCardTransform();
  };

  return {
    cardRef,
    skipClick,
    longPressFired,
    pressHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}