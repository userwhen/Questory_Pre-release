/* src/components/ui/PetSupplyTray.jsx */
// 補給道具托盤機制：托盤本體、飛行中的道具動畫、寵物箱按鈕（短按開
// 托盤／長按開圖鑑）。
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { PET_SHOP_ITEMS } from '@/pet/data/pet_shop_items.js';
import { LONG_PRESS_MS } from './usePetGesture.js';

/* ─── 道具托盤：短按寵物箱彈出，點道具→飛給寵物 ─────── */
export function ItemTray({ onPickItem }) {
  // ⚠️ 修正：原本 bag/gold 是兩個獨立的 useGameStore() 呼叫，違反專案
  //    「合併訂閱」的規則，這次拆分順便合併成一次。
  const { bag, gold } = useGameStore(s => ({
    bag:  s.bag  ?? [],
    gold: s.gold ?? 0,
  }));

  const buyOne = useCallback((shopItem) => {
    if (gold < shopItem.price) {
      EventBus.emit(Events.System.TOAST, '💰 金幣不足！');
      return;
    }
    useGameStore.setState(s => {
      const newBag = [...(s.bag ?? [])];
      const idx = newBag.findIndex(b => b.id === shopItem.id);
      if (idx > -1) newBag[idx] = { ...newBag[idx], count: newBag[idx].count + 1 };
      else newBag.push({ ...shopItem, count: 1 });
      return { bag: newBag, gold: (s.gold ?? 0) - shopItem.price };
    });
    EventBus.emit(Events.System.TOAST, `🛍️ 補了一件 ${shopItem.name}！`);
  }, [gold]);

  return (
    <div style={trayStyle} onClick={e => e.stopPropagation()}>
      <div style={bubbleArrowStyle} />
      {PET_SHOP_ITEMS.map(shopItem => {
        const owned = bag.find(b => b.id === shopItem.id)?.count ?? 0;
        return owned > 0 ? (
          <button key={shopItem.id} style={trayItemStyle} onClick={() => onPickItem(shopItem)}>
            <span style={{ fontSize: '1.6rem' }}>{shopItem.icon}</span>
            <span style={trayBadgeStyle}>{owned}</span>
          </button>
        ) : (
          <button key={shopItem.id} style={{ ...trayItemStyle, background: 'rgba(0,0,0,0.04)' }} onClick={() => buyOne(shopItem)}>
            <span style={{ fontSize: '1.6rem', opacity: 0.4 }}>{shopItem.icon}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-gold-dark,#c47d0e)' }}>💰{shopItem.price}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── 飛行中的道具（純 CSS transition，兩階段位移）───── */
export function FlyingItem({ emoji, from, to, onArrive }) {
  const [pos, setPos] = useState(from);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPos(to));
    const timer = setTimeout(onArrive, 550);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [to, onArrive]);

  return (
    <div style={{
      position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)',
      fontSize: '1.8rem', zIndex: 200, pointerEvents: 'none',
      transition: 'left 0.5s cubic-bezier(0.3,0.6,0.4,1), top 0.5s cubic-bezier(0.3,0.6,0.4,1)',
    }}>{emoji}</div>
  );
}

/* ─── 寵物箱按鈕：短按開托盤／長按開圖鑑 ─────────────── */
export function PetBoxButton({ boxRef, trayOpen, onToggleTray, onOpenArchive }) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);

  const onPointerDown = useCallback((e) => {
    firedRef.current = false;
    // 鎖定指標：這顆按鈕只有 44px，長按期間手指/滑鼠很容易稍微飄出範圍，
    // 沒鎖定的話下面的 onPointerLeave（已移除）或漏接 pointerup 都會讓長按判定失效
    e.currentTarget.setPointerCapture?.(e.pointerId);
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onOpenArchive();
    }, LONG_PRESS_MS);
  }, [onOpenArchive]);

  const onPointerUp = useCallback((e) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    clearTimeout(timerRef.current);
    if (firedRef.current) return; // 長按已經處理過了
    onToggleTray();
  }, [onToggleTray]);

  return (
    <button
      ref={boxRef}
      style={{ position: 'absolute', bottom: '22%', right: '4%', zIndex: 30, width: 44, height: 44, borderRadius: 12, background: trayOpen ? 'rgba(245,166,35,0.35)' : 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.2)', fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >🧰</button>
  );
}

/* ─── 樣式 ───────────────────────────────────────────── */
const trayStyle = {
  position: 'relative', display: 'flex', gap: 8,
  background: 'var(--bg-card,#fff)', border: '1px solid var(--border,rgba(0,0,0,0.09))',
  borderRadius: 16, padding: '8px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  animation: 'trayIn 0.2s ease',
};

const trayItemStyle = {
  position: 'relative', width: 48, height: 48, borderRadius: 12,
  background: 'var(--bg-box,rgba(0,0,0,0.04))', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const trayBadgeStyle = {
  position: 'absolute', top: -4, right: -4, background: 'var(--color-danger,#c0392b)', color: '#fff',
  fontSize: '0.62rem', fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
};

const bubbleArrowStyle = {
  position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
  width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
  borderTop: '6px solid var(--bg-card,#fff)',
};