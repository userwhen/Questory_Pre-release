/* src/avatar/components/PortraitModal.jsx */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import { useShallow } from 'zustand/react/shallow';
import { EventBus, EventHelper } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { COSMETIC_TABLES, findCosmeticImgId, NONE_COSMETIC } from '@/avatar/data/portrait_config.js';
import PortraitStack from '@/avatar/components/PortraitStack.jsx';
import Modal from '@/ui/Modal.jsx';

function formatUnlockCondition(cond) {
  if (!cond) return '';
  if (cond.type === 'level') return `Lv.${cond.value} 解鎖`;
  if (cond.type === 'loginStreak') return `連續登入 ${cond.value} 天解鎖`;
  if (cond.type === 'totalLoginDays') return `累計登入 ${cond.value} 天解鎖`;
  return '未解鎖';
}

/* ─── 大圖預覽區：與 HUD 共用 PortraitStack 同一套比例 ─── */
function PreviewStage({ portrait, frame }) {
  return (
    <div style={previewStageStyle}>
      <div style={previewStackWrapStyle}>
        <PortraitStack
          portrait={portrait}
          frame={frame}
          showDefaultBorder={false}
        />
      </div>
    </div>
  );
}

/* ─── 收藏格卡片 ─────────────────────────────────────────── */
function CosmeticCard({ item, kind, isOwned, isEquipped, isSelected, onPreview, onEquip, onBuy }) {
  const imgId = findCosmeticImgId(kind, item.id);
  const locked = !isOwned && !!item.unlockCondition;

  let actionBtn;
  if (isEquipped) {
    actionBtn = <button style={{ ...cardBtnStyle, background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none' }} disabled>已裝備</button>;
  } else if (isOwned) {
    actionBtn = <button style={{ ...cardBtnStyle, background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none' }} onClick={() => onEquip(item.id)}>裝備</button>;
  } else if (locked) {
    actionBtn = <button style={{ ...cardBtnStyle, opacity: 0.6, cursor: 'not-allowed' }} disabled>🔒 {formatUnlockCondition(item.unlockCondition)}</button>;
  } else {
    actionBtn = (
      <button style={{ ...cardBtnStyle, background: 'var(--bg-panel,#f7e7ce)', border: '1px solid var(--color-gold,#f5a623)', color: 'var(--color-gold-dark,#c47d0e)' }}
        onClick={() => onBuy(item.id)}>
        {item.price > 0 ? `💎${item.price}` : '免費領取'}
      </button>
    );
  }

  const canPreview = !!imgId || item.id === NONE_COSMETIC;

  return (
    <div style={{
      ...cardStyle,
      borderColor: isSelected ? 'var(--color-gold,#f5a623)' : 'transparent',
      boxShadow: isSelected ? '0 0 0 1px rgba(245,166,35,0.35)' : 'var(--shadow-xs)',
      opacity: locked ? 0.72 : 1,
    }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '1/1',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canPreview ? 'pointer' : 'default',
          padding: 2,
          boxSizing: 'border-box',
        }}
        onClick={() => canPreview && onPreview(item.id)}
        role={canPreview ? 'button' : undefined}
        title={canPreview ? '點擊預覽' : undefined}
      >
        {imgId ? (
          <img
            src={`img/${imgId}.png`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-xs)', pointerEvents: 'none' }}
            onError={e => { e.target.style.opacity = '0'; }}
            alt=""
          />
        ) : (
          <span style={{ fontSize: 'var(--size-sm)', opacity: 0.4 }}>🚫</span>
        )}
      </div>
      <div style={{
        fontSize: 'clamp(0.58rem,2vw,0.7rem)',
        fontWeight: 700,
        textAlign: 'center',
        color: 'var(--text,#2c1a0e)',
        margin: '2px 0 0',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        width: '100%',
      }}>
        {item.name}
      </div>
      <div style={{ flexShrink: 0, width: '100%', marginTop: 2 }}>
        {actionBtn}
      </div>
    </div>
  );
}

/* ─── 主體 ───────────────────────────────────────────────── */
export default function PortraitModal({ onClose }) {
  const { lv, loginStreak, totalLoginDays, avatar, previewPortrait, previewFrame } = useGameStore(
    useShallow(s => ({
      lv: s.lv || 1,
      loginStreak: s.loginStreak || 0,
      totalLoginDays: s.totalLoginDays || 0,
      avatar: s.avatar || {},
      previewPortrait: s.previewPortrait ?? null,
      previewFrame: s.previewFrame ?? null,
    }))
  );

  const [mode, setMode] = useState('portrait'); // 'portrait' | 'frame'

  useEffect(() => {
    return () => {
      EventBus.emit(Events.Avatar.REQUEST_CLEAR_COSMETIC_PREVIEW, { kind: 'portrait' });
      EventBus.emit(Events.Avatar.REQUEST_CLEAR_COSMETIC_PREVIEW, { kind: 'frame' });
    };
  }, []);

  const displayPortrait = previewPortrait ?? avatar.equippedPortrait ?? null;
  const displayFrame = previewFrame ?? avatar.equippedFrame ?? null;

  const { unlockedKey, equippedKey, shop } = COSMETIC_TABLES[mode];
  const unlocked = avatar[unlockedKey] ?? [];
  const equippedId = avatar[equippedKey] ?? null;

  const previewId = mode === 'portrait' ? previewPortrait : previewFrame;
  const selectedId = previewId ?? equippedId ?? (mode === 'frame' ? NONE_COSMETIC : null);

  const items = useMemo(() => (
    mode === 'frame' ? [{ id: NONE_COSMETIC, name: '不使用', price: 0 }, ...shop] : shop
  ), [mode, shop]);

  const handlePreview = useCallback((id) => {
    EventBus.emit(Events.Avatar.REQUEST_PREVIEW_COSMETIC, { kind: mode, itemId: id });
  }, [mode]);

  const handleEquip = useCallback((id) => {
    EventBus.emit(Events.Avatar.REQUEST_EQUIP_COSMETIC, { kind: mode, id });
  }, [mode]);

  const handleBuy = useCallback(async (id) => {
    let res;
    try {
      res = await EventHelper.requestOnce(Events.Avatar.REQUEST_BUY_COSMETIC, Events.Avatar.BUY_COSMETIC_RESULT, { kind: mode, id });
    } catch {
      EventBus.emit(Events.System.TOAST, '❌ 購買逾時，請稍後再試');
      return;
    }
    if (!res.success) {
      EventBus.emit(Events.System.TOAST, res.msg || '購買失敗');
      return;
    }
    EventBus.emit(Events.System.TOAST, '🎉 購買成功！');
  }, [mode]);

  const isItemOwned = (item) => item.id === NONE_COSMETIC ? true : unlocked.includes(item.id);
  const isItemEquipped = (item) => item.id === NONE_COSMETIC
    ? (!equippedId || equippedId === NONE_COSMETIC)
    : equippedId === item.id;
  const isItemSelected = (item) => item.id === NONE_COSMETIC
    ? (!selectedId || selectedId === NONE_COSMETIC)
    : selectedId === item.id;

  return (
    <Modal title="🖼️ 頭像收藏" onClose={onClose} maxWidth={380} bodyStyle={{ padding: 0 }}>
      <div style={infoBarStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={infoValStyle}>Lv.{lv}</div>
          <div style={infoLabelStyle}>等級</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={infoValStyle}>{loginStreak}</div>
          <div style={infoLabelStyle}>連續天數</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={infoValStyle}>{totalLoginDays}</div>
          <div style={infoLabelStyle}>累計登入</div>
        </div>
      </div>

      <PreviewStage portrait={displayPortrait} frame={displayFrame} />

      <div style={modeBarStyle}>
        {[['portrait', '👤 頭像'], ['frame', '🖼️ 頭像框']].map(([m, label]) => (
          <button key={m}
            style={{ ...modeBtnStyle, background: mode === m ? 'var(--color-correct,#227A59)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-muted,#8c6e52)' }}
            onClick={() => setMode(m)}
          >{label}</button>
        ))}
      </div>

      <div style={gridWrapStyle}>
        <div style={gridStyle}>
          {items.map(item => (
            <CosmeticCard
              key={item.id}
              item={item}
              kind={mode}
              isOwned={isItemOwned(item)}
              isEquipped={isItemEquipped(item)}
              isSelected={isItemSelected(item)}
              onPreview={handlePreview}
              onEquip={handleEquip}
              onBuy={handleBuy}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const infoBarStyle = { display: 'flex', justifyContent: 'space-around', padding: 'var(--space-sm)', background: 'var(--bg-hud,#2c1a0e)' };
const infoValStyle = { fontSize: 'var(--font-title)', fontWeight: 800, color: 'var(--color-gold,#f5a623)' };
const infoLabelStyle = { fontSize: 'var(--font-caption)', color: 'rgba(255,255,255,0.5)' };
const previewStageStyle = {
  position: 'relative',
  width: '100%',
  /* 縮小預覽區，去掉大塊空白 */
  height: 120,
  background: 'transparent',
  overflow: 'visible',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 0',
  boxSizing: 'border-box',
};
const previewStackWrapStyle = {
  position: 'relative',
  width: 100,
  height: 100,
  flexShrink: 0,
};
const modeBarStyle = { display: 'flex', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg-panel,#f7e7ce)', borderBottom: '1px solid var(--border,rgba(0,0,0,0.09))' };
const modeBtnStyle = { flex: 1, padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'var(--t-fast)' };
const gridWrapStyle = { maxHeight: 360, overflowY: 'auto', padding: 'var(--space-xs)' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-xs)' };
const cardStyle = {
  borderRadius: 'var(--radius-md,12px)',
  border: '2px solid transparent',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  padding: '6px',
  /* 不要整卡 1:1，否則名稱＋按鈕會被裁掉 */
  background: 'var(--bg-card,#fff)',
  boxShadow: 'var(--shadow-xs)',
  overflow: 'hidden',
  boxSizing: 'border-box',
  minWidth: 0,
};
const cardBtnStyle = {
  width: '100%',
  padding: '4px 2px',
  fontSize: 'clamp(0.58rem,2.2vw,0.72rem)',
  fontWeight: 700,
  cursor: 'pointer',
  borderRadius: 'var(--radius-xs)',
  fontFamily: 'inherit',
  border: '1px solid var(--border-input,#d5c5a8)',
  background: 'var(--bg-card,#fff)',
  color: 'var(--text,#2c1a0e)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
  lineHeight: 1.2,
};
