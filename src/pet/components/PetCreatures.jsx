/* src/pet/components/PetCreatures.jsx */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { DIALOGS } from "@/pet/data/pet_dialogs.js";
import { LINEAGE_DICTIONARY } from "@/pet/data/pet_lineage.js";
import { getPetDialog } from "@/pet/utils/petDialog.js";
import {
  maskStyle, modalHeadStyle, closeXStyle, modalFootStyle, inputStyle, btnStyle,
  compactModalStyle as modalStyle, statusTagStyle,
} from '@/styles/modalStyles.js';
import { usePetGesture } from './usePetGesture.js';
import { useStage, assignGridSlot, getGridCellX, getGridCellY } from '@/components/ui/stage.js';

function DialogBubble({ pet, dialogText, isBaby, onClose, extraAction }) {
  const lineage = !isBaby ? LINEAGE_DICTIONARY[pet.lineage] : null;

  return (
    <div style={bubbleStyle} onClick={e => e.stopPropagation()}>
      <div style={bubbleArrowStyle} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-gold,#f5a623)' }}>
          {pet.name ?? (isBaby ? '幼崽' : '寵物')}
          {!isBaby && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted,#8c6e52)', marginLeft: 4 }}>Lv.{pet.level ?? 1}</span>}
        </span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted,#8c6e52)', padding: 0 }} onClick={onClose}>✕</button>
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--text,#2c1a0e)', fontWeight: 600, marginBottom: 8, lineHeight: 1.4, whiteSpace: 'pre-line', textAlign: 'center' }}>
        {dialogText}
      </div>

      {pet.isSick && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted,#8c6e52)', textAlign: 'center', marginBottom: 3 }}>💊 康復中...</div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pet.recoveryProgress ?? 0}%`, background: '#e57373', borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {!isBaby && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginBottom: extraAction ? 8 : 0 }}>
          {lineage && <span style={statusTagStyle('#fff3e0', '#e67e22')}>{lineage.difficult ? '⭐' : lineage.icon} {pet.lineage}</span>}
          <span style={statusTagStyle('#e3f2fd', '#2980b9')}>{pet.personality}</span>
          {pet.traits?.task && pet.traits.task !== '無' && <span style={statusTagStyle('#fce4ec', '#d81b60')}>⚔️ {pet.traits.task}傾向</span>}
          {pet.isPregnant && <span style={statusTagStyle('#ffebee', '#e91e8c')}>💖 孕育</span>}
        </div>
      )}

      {extraAction}
    </div>
  );
}

function ExploreProposalBubble({ petName, onAccept, onDecline }) {
  return (
    <div style={bubbleStyle} onClick={e => e.stopPropagation()}>
      <div style={bubbleArrowStyle} />
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text,#2c1a0e)', marginBottom: 10, textAlign: 'center', lineHeight: 1.5 }}>
        🗺️ {petName} 想出去探險！<br />要讓牠去嗎？
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={actionBtnStyle('var(--color-correct,#227A59)', '#fff')} onClick={onAccept}>🗺️ 允許出門</button>
        <button style={actionBtnStyle('rgba(0,0,0,0.08)', 'var(--text,#2c1a0e)')} onClick={onDecline}>現在不要</button>
      </div>
    </div>
  );
}

function pickDialogText(pet, isBaby) {
  if (isBaby) return DIALOGS.baby[Math.floor(Math.random() * DIALOGS.baby.length)];
  if (pet.isSick) return DIALOGS.sick[Math.floor(Math.random() * DIALOGS.sick.length)];
  return getPetDialog(pet);
}

/* ─── 成寵 ───────────────────────────────────────────── */
export function SinglePet({ pet, index, targeting, onBecomeTarget, registerRef, isBubbleOpen, onOpenBubble, onCloseBubble, isDetailOpen, onOpenDetail, onCloseDetail }) {
  const stage = useStage();
  const { charScale, grid } = stage;
  const [dialogText, setDialogText] = useState('');
  const [hearts, setHearts] = useState([]);
  const [isPulsing, setIsPulsing] = useState(false);
  const [anim, setAnim] = useState('petWalk');
  const animRef = useRef(null);
  const hideTimerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const anims = ['petWalk', 'petJump', 'petWiggle'];
    animRef.current = setInterval(() => {
      setAnim(anims[Math.floor(Math.random() * anims.length)]);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(animRef.current);
  }, []);

  useEffect(() => {
    registerRef?.(index, wrapRef.current);
    return () => registerRef?.(index, null);
  }, [index, registerRef]);

  const handleTap = useCallback(() => {
    setDialogText(pickDialogText(pet, false));
    onOpenBubble();
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => onCloseBubble(), 4000);
  }, [pet, onOpenBubble, onCloseBubble]);

  const spawnHeart = useCallback(() => {
    const id = `heart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setHearts(h => [...h, { id, dx: (Math.random() - 0.5) * 24 }]);
    setTimeout(() => setHearts(h => h.filter(x => x.id !== id)), 700);
  }, []);

  const wiggleTimerRef = useRef(null);

  const handleRub = useCallback(() => {
    EventBus.emit(Events.Pet.REQUEST_INTERACT, { target: index, action: 'touch', amount: 0 });
    spawnHeart();
    setIsPulsing(true);
    clearTimeout(wiggleTimerRef.current);
    wiggleTimerRef.current = setTimeout(() => setIsPulsing(false), 300);
    navigator.vibrate?.(15);
  }, [index, spawnHeart]);

  const handleLongPress = useCallback(() => {
    onCloseBubble();
    onOpenDetail();
  }, [onCloseBubble, onOpenDetail]);

  const gesture = usePetGesture({
    targeting,
    onBecomeTarget: () => onBecomeTarget(index),
    onTap: handleTap,
    onRub: handleRub,
    onLongPress: handleLongPress,
  });

  if (pet.status === 'exploring') return null;

  const levelFactor = 0.425 + Math.min(5, pet.level ?? 1) * 0.05;
  const imgHeight = charScale * levelFactor;

  // ⚠️ roamType==='float'（飄浮/飛行/水中，例如鸚鵡、小丑魚）可以用
  // 牆面+地面整段列數；其餘（預設）只能用地面那幾排。這個欄位要在
  // 寵物資料裡加，沒加的寵物自動當地面寵物，不會壞。
  const roamType = pet.roamType === 'float' ? 'float' : 'ground';
  const slot = assignGridSlot(index, grid, roamType);
  const x = getGridCellX(grid, slot.col);
  const y = getGridCellY(stage, slot.row);

  return (
    <div ref={wrapRef} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', zIndex: 20 + index, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' }}>
      {pet.pendingExplore ? (
        <ExploreProposalBubble
          petName={pet.name ?? '寵物'}
          onAccept={() => EventBus.emit(Events.Pet.REQUEST_START_EXPLORE, { index })}
          onDecline={() => EventBus.emit(Events.Pet.REQUEST_DISMISS_EXPLORE, { index })}
        />
      ) : isBubbleOpen && (
        <DialogBubble pet={pet} dialogText={dialogText} isBaby={false} onClose={onCloseBubble} />
      )}
      <div
        style={{
          animation: `${anim} ${anim === 'petWalk' ? 6 : 1.2}s ease-in-out infinite`,
          cursor: 'pointer', position: 'relative', touchAction: 'none',
          borderRadius: '50%',
          ...(targeting ? { animation: `${anim} ${anim === 'petWalk' ? 6 : 1.2}s ease-in-out infinite, targetPulse 1s ease-in-out infinite` } : {}),
        }}
        onPointerDown={gesture.onPointerDown}
        onPointerMove={gesture.onPointerMove}
        onPointerUp={gesture.onPointerUp}
      >
        {pet.isSick     && <div style={sickTagStyle}>🤧</div>}
        {pet.isPregnant && <div style={pregnantTagStyle}>💖</div>}
        {pet.pendingExplore && <div style={exploreTagStyle}>❗</div>}
        {hearts.map(h => (
          <div key={h.id} style={{ position: 'absolute', top: -10, left: `calc(50% + ${h.dx}px)`, fontSize: '1.1rem', pointerEvents: 'none', animation: 'heartFloat 0.7s ease-out forwards', zIndex: 12 }}>💖</div>
        ))}
        <img
          src={`img/${pet.id}.png`}
          alt={pet.name}
          style={{
            height: imgHeight, width: 'auto', objectFit: 'contain',
            transition: 'filter 0.15s ease',
            filter: isPulsing ? 'drop-shadow(2px 4px 6px rgba(0,0,0,0.2)) brightness(1.25)' : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))',
            animation: isPulsing ? 'petRubWiggle 0.3s ease-in-out' : 'none',
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
      {(pet.poops ?? []).map(poop => (
        <div key={poop.id}
          style={{ position: 'absolute', bottom: -10, left: `calc(50% + ${poop.offsetX ?? 0}px)`, fontSize: '1.4rem', cursor: 'pointer', animation: 'poopPop 0.3s ease', zIndex: 5 }}
          onClick={e => { e.stopPropagation(); EventBus.emit(Events.Pet.REQUEST_PICKUP_POOP, { index, poopId: poop.id }); }}
        >💩</div>
      ))}
    </div>
  );
}

/* ─── 幼崽 ───────────────────────────────────────────── */
export function BabyPet({ babyId, babyData, babyName, targeting, onBecomeTarget, registerRef, isBubbleOpen, onOpenBubble, onCloseBubble, onOpenDetail, siblingCount = 0 }) {
  const stage = useStage();
  const { charScale, grid } = stage;
  const [dialogText, setDialogText] = useState('');
  const [showGrowModal, setShowGrowModal] = useState(false);
  const [hearts, setHearts] = useState([]);
  const [isPulsing, setIsPulsing] = useState(false);
  const hideTimerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    registerRef?.(wrapRef.current);
    return () => registerRef?.(null);
  }, [registerRef]);

  const handleTap = useCallback(() => {
    setDialogText(pickDialogText(babyData ?? {}, true));
    onOpenBubble();
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => onCloseBubble(), 4000);
  }, [babyData, onOpenBubble, onCloseBubble]);

  const spawnHeart = useCallback(() => {
    const id = `heart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setHearts(h => [...h, { id, dx: (Math.random() - 0.5) * 24 }]);
    setTimeout(() => setHearts(h => h.filter(x => x.id !== id)), 700);
  }, []);

  const wiggleTimerRef = useRef(null);

  const handleRub = useCallback(() => {
    EventBus.emit(Events.Pet.REQUEST_INTERACT, { target: 'baby', action: 'touch', amount: 0 });
    spawnHeart();
    setIsPulsing(true);
    clearTimeout(wiggleTimerRef.current);
    wiggleTimerRef.current = setTimeout(() => setIsPulsing(false), 300);
    navigator.vibrate?.(15);
  }, [spawnHeart]);

  const handleLongPress = useCallback(() => {
    onCloseBubble();
    onOpenDetail();
  }, [onCloseBubble, onOpenDetail]);

  const gesture = usePetGesture({
    targeting,
    onBecomeTarget: () => onBecomeTarget('baby'),
    onTap: handleTap,
    onRub: handleRub,
    onLongPress: handleLongPress,
  });

  const roamType = babyData?.roamType === 'float' ? 'float' : 'ground';
  const slot = assignGridSlot(siblingCount, grid, roamType);
  const x = getGridCellX(grid, slot.col);
  const y = getGridCellY(stage, slot.row);

  return (
    <div ref={wrapRef} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', zIndex: 25, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' }}>
      {isBubbleOpen && (
        <DialogBubble
          pet={{ ...(babyData ?? {}), name: babyName ?? '幼崽' }}
          dialogText={dialogText}
          isBaby
          onClose={onCloseBubble}
          extraAction={
            <button
              style={{ ...actionBtnStyle('var(--color-correct,#227A59)', '#fff'), width: '100%' }}
              onClick={() => { onCloseBubble(); setShowGrowModal(true); }}
            >✨ 申請成長</button>
          }
        />
      )}
      <div
        style={{
          transform: 'scale(0.65)', transformOrigin: 'bottom center', cursor: 'pointer',
          animation: targeting ? 'petFloat 3s ease-in-out infinite, targetPulse 1s ease-in-out infinite' : 'petFloat 3s ease-in-out infinite',
          touchAction: 'none', borderRadius: '50%', position: 'relative',
        }}
        onPointerDown={gesture.onPointerDown}
        onPointerMove={gesture.onPointerMove}
        onPointerUp={gesture.onPointerUp}
      >
        {hearts.map(h => (
          <div key={h.id} style={{ position: 'absolute', top: -10, left: `calc(50% + ${h.dx}px)`, fontSize: '1.1rem', pointerEvents: 'none', animation: 'heartFloat 0.7s ease-out forwards', zIndex: 12 }}>💖</div>
        ))}
        <img src={`img/${babyId}.png`} alt={babyName ?? '幼崽'}
          style={{
            height: charScale * 0.45, width: 'auto', objectFit: 'contain',
            transition: 'filter 0.15s ease',
            filter: isPulsing ? 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1)) brightness(1.25)' : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))',
            animation: isPulsing ? 'petRubWiggle 0.3s ease-in-out' : 'none',
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
      {showGrowModal && (
        <GrowUpModal
          babyName={babyName}
          onConfirm={name => { EventBus.emit(Events.Pet.REQUEST_GROW_UP_BABY, { name }); setShowGrowModal(false); }}
          onClose={() => setShowGrowModal(false)}
        />
      )}
    </div>
  );
}

function GrowUpModal({ babyName, onConfirm, onClose }) {
  const [name, setName] = useState(babyName ?? '新寵物');
  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>✨ 幼崽的期盼</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🍼</div>
          <p style={{ color: 'var(--text-muted,#8c6e52)', fontSize: '0.9rem', marginBottom: 14, lineHeight: 1.5 }}>
            讓【{babyName}】正式長大吧！<br />請為牠取個成年後的名字：
          </p>
          <input style={inputStyle} value={name} maxLength={10} onChange={e => setName(e.target.value)} placeholder="最多10個字" />
        </div>
        <div style={modalFootStyle}>
          <button style={{ ...btnStyle, flex: 1 }} onClick={() => onConfirm(name)}>🌟 確認長大</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 樣式 ───────────────────────────────────────────── */
const actionBtnStyle = (bg, color) => ({
  flex: 1, padding: '5px 0', borderRadius: 8,
  background: bg, color, border: 'none',
  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
});

const sickTagStyle = {
  position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
  fontSize: '1rem', zIndex: 5,
};

const pregnantTagStyle = {
  position: 'absolute', top: -22, right: 0,
  fontSize: '1rem', zIndex: 5,
};

const exploreTagStyle = {
  position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
  fontSize: '1.1rem', zIndex: 6,
  animation: 'petFloat 1.2s ease-in-out infinite',
};

const bubbleStyle = {
  position: 'absolute', bottom: '100%', left: '50%',
  transform: 'translateX(-50%)',
  minWidth: 200, maxWidth: 280,
  background: 'var(--bg-card,#fff)',
  border: '1px solid var(--border,rgba(0,0,0,0.09))',
  borderRadius: 12, padding: '10px 12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  marginBottom: 8, zIndex: 80,
  animation: 'bubbleIn 0.2s ease',
};

const bubbleArrowStyle = {
  position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
  width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
  borderTop: '6px solid var(--bg-card,#fff)',
};