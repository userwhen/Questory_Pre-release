// src/components/ui/PetWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { getPetDialog } from '@/utils/petDialog.js';
import { DIALOGS, PET_SHOP_ITEMS, LINEAGE_DICTIONARY } from '@/data/pet_config.js';
import {
  maskStyle, modalStyle as baseModalStyle, modalHeadStyle, closeXStyle,
  modalFootStyle, inputStyle, btnStyle,
} from '@/styles/modalStyles.js';
import PetNamingModal from '@/components/ui/PetNamingModal.jsx';
const modalStyle = { ...baseModalStyle, maxWidth: 380 };

// ─── 手勢判定常數 ────────────────────────────────────
const RUB_DIST_PX     = 24;   // 位移超過這個距離才算「摩擦」（原本 15px 太敏感，一般點擊的自然晃動就會超過）
const RUB_WINDOW_MS   = 600;  // 摩擦手勢只在按下後這段時間內判定，避免長按久了因自然手震/滑鼠漂移被誤判成摩擦
const LONG_PRESS_MS   = 400;  // 長按判定的門檻時間，寵物箱跟寵物本體共用同一個數字
const RUB_BURST_WINDOW_MS = 1500; // 一次「搓一搓」手勢允許連續觸發的時間視窗
const RUB_BURST_MAX       = 8;    // 這個視窗內最多能連續觸發幾次摩擦（大約等於能拿到幾顆愛心）
const RUB_COOLDOWN_MS     = 2500; // 超過連續次數上限後，要等這麼久才能開始下一輪摩擦

const petAnim = `
  @keyframes petWalk {
    0%,100% { transform: translateX(0) scaleX(1); }
    25%      { transform: translateX(18px) scaleX(1); }
    50%      { transform: translateX(18px) scaleX(-1); }
    75%      { transform: translateX(0) scaleX(-1); }
  }
  @keyframes petJump {
    0%,100% { transform: translateY(0); }
    40%     { transform: translateY(-18px); }
  }
  @keyframes petWiggle {
    0%,100% { transform: rotate(0deg); }
    25%     { transform: rotate(-8deg); }
    75%     { transform: rotate(8deg); }
  }
  @keyframes petFloat {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-6px); }
  }
  @keyframes bubbleIn {
    from { opacity:0; transform:translate(-50%, 6px) scale(0.95); }
    to   { opacity:1; transform:translate(-50%, 0) scale(1); }
  }
  @keyframes petModalIn {
    from { opacity:0; transform:scale(0.92) translateY(12px); }
    to   { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes poopPop {
    from { opacity:0; transform:scale(0); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes heartFloat {
    0%   { opacity:1; transform:translateY(0) scale(0.8); }
    100% { opacity:0; transform:translateY(-40px) scale(1.3); }
  }
  @keyframes petRubWiggle {
    0%, 100% { transform: rotate(0deg); }
    25%      { transform: rotate(-6deg); }
    75%      { transform: rotate(6deg); }
  }
  @keyframes targetPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,0.6); }
    50%     { box-shadow: 0 0 0 10px rgba(245,166,35,0); }
  }
  @keyframes trayIn {
    from { opacity:0; transform:translateY(6px) scale(0.9); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
`;

/* ─── 簡化對話氣泡（輕點寵物才會顯示，不含數值條）───── */
function DialogBubble({ pet, dialogText, isBaby, onClose, extraAction }) {
  // 文字改成外部（handleTap 那一刻）決定好、透過 props 傳進來，不在這裡
  // 用 Math.random() 現算：因為這個元件顯示的 4 秒內，只要外層因為任何
  // 原因重繪（例如寵物待機動畫每幾秒切換一次），這裡都會跟著重新執行，
  // 若文字是現算的就會在顯示途中無預警換掉，造成「對話一直在跳」的觀感
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

/* ─── 探險邀約氣泡（沿用前一批，未改動）───────────────── */
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

/* ─── 數值條：只用在長按跳出的詳情面板裡，維持「平常抽象、
     深處才給數字」的分層，對話氣泡（A）完全不受影響 ───────── */
function StatBar({ icon, value, color }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = color ?? (value > 60 ? 'var(--color-correct,#227A59)' : value > 30 ? 'var(--color-gold,#f5a623)' : 'var(--color-danger,#c0392b)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <span style={{ fontSize: '0.9rem', flexShrink: 0, width: 18, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted,#8c6e52)', width: 34, textAlign: 'right', flexShrink: 0 }}>{Math.round(pct)}%</span>
    </div>
  );
}

/* ─── 詳情面板（B）：長按寵物才會跳出，是唯一會顯示精確數字
     （等級/EXP/飽食度/心情%）的地方 ───────────────────────── */
function PetDetailModal({ pet, isBaby, onClose }) {
  const level = pet.level ?? (isBaby ? 0 : 1);
  const isGrowing = pet.isGrowing ?? isBaby;
  const lineage = !isBaby ? LINEAGE_DICTIONARY[pet.lineage] : null;

  const progressPct = isGrowing
    ? (pet.growthProgress ?? 0)
    : Math.min(100, ((pet.affection ?? 0) / (level * 100)) * 100);
  const progressLabel = isGrowing ? '成長進度' : `等級 Lv.${level}`;
  const progressText  = isGrowing
    ? `${Math.floor(pet.growthProgress ?? 0)}%`
    : `EXP ${Math.round(pet.affection ?? 0)} / ${level * 100}`;

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>📊 {pet.name ?? (isBaby ? '幼崽' : '寵物')} 的詳細資訊</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {!isBaby && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
              {lineage && <span style={statusTagStyle('#fff3e0', '#e67e22')}>{lineage.difficult ? '⭐' : lineage.icon} {pet.lineage}</span>}
              <span style={statusTagStyle('#e3f2fd', '#2980b9')}>{pet.personality}</span>
              {pet.traits?.task && pet.traits.task !== '無' && <span style={statusTagStyle('#fce4ec', '#d81b60')}>⚔️ {pet.traits.task}傾向</span>}
              {pet.traits?.attachment && <span style={statusTagStyle('rgba(0,0,0,0.06)', 'var(--text,#2c1a0e)')}>{pet.traits.attachment}</span>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.76rem', color: 'var(--text-muted,#8c6e52)' }}>
            <span>{progressLabel}</span><span>{progressText}</span>
          </div>
          <StatBar icon="💖" value={progressPct} color="#8bc34a" />

          <StatBar icon="🍖" value={pet.food ?? 50} />
          <StatBar icon="😊" value={pet.mood ?? 50} />

          {pet.isSick && (
            <>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted,#8c6e52)', marginTop: 4 }}>💊 康復進度</div>
              <StatBar icon="💊" value={pet.recoveryProgress ?? 0} color="#e57373" />
            </>
          )}

          {pet.isPregnant && (
            <>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted,#8c6e52)', marginTop: 4 }}>💗 孕育進度</div>
              <StatBar icon="💗" value={pet.pregnancyProgress ?? 0} color="#ff80ab" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 手勢辨識 helper：輕點 vs 摩擦 vs 長按（給 SinglePet / BabyPet 共用）─── */
// targeting 為 true 時（托盤已選好道具、且有多隻可選對象），任何一次按放
// 都直接視為「指定這隻當目標」，不走一般的輕點/摩擦判斷。
function usePetGesture({ targeting, onBecomeTarget, onTap, onRub, onLongPress }) {
  const touchRef = useRef({
    startX: 0, startY: 0, startTime: 0, rubbed: false, isDown: false, lastTapAt: 0,
    burstStartAt: 0,  // 這一輪連續摩擦是從什麼時候開始算的
    burstCount: 0,    // 這一輪已經觸發過幾次摩擦了
    cooldownUntil: 0, // 觸發次數用完後，要等到這個時間點才能開始下一輪
    longPressTimer: null,  // 長按計時器；一旦偵測到摩擦就會被取消，兩種手勢互斥
    longPressFired: false, // 這次按放期間長按是否已觸發，觸發過就不再視為輕點
  });

  const onPointerDown = useCallback((e) => {
    if (touchRef.current.isDown) return; // 忽略還沒配對到 up 的重複 down
    touchRef.current.isDown = true;
    touchRef.current.startX = e.clientX;
    touchRef.current.startY = e.clientY;
    touchRef.current.startTime = Date.now();
    touchRef.current.rubbed = false;
    touchRef.current.longPressFired = false;
    // 鎖定指標：確保放開時事件一定回到這個元素身上，不會因為手指
    // 稍微移動就被瀏覽器判定成「離開了這隻寵物」而漏接 pointerup
    e.currentTarget.setPointerCapture?.(e.pointerId);

    if (!targeting && onLongPress) {
      clearTimeout(touchRef.current.longPressTimer);
      touchRef.current.longPressTimer = setTimeout(() => {
        if (touchRef.current.isDown && !touchRef.current.rubbed) {
          touchRef.current.longPressFired = true;
          onLongPress();
        }
      }, LONG_PRESS_MS);
    }
  }, [targeting, onLongPress]);

  const onPointerMove = useCallback((e) => {
    if (targeting || !touchRef.current.isDown) return;
    // 只在按下後的短暫視窗內判定摩擦，長按靜止不動不會因為時間拉長
    // 而被判成摩擦（這是造成「長按反而沒反應」的根因）
    if (Date.now() - touchRef.current.startTime > RUB_WINDOW_MS) return;

    const dx = e.clientX - touchRef.current.startX;
    const dy = e.clientY - touchRef.current.startY;
    if (Math.sqrt(dx * dx + dy * dy) <= RUB_DIST_PX) return;

    // 確定是搓動不是長按靜置：取消長按計時器
    clearTimeout(touchRef.current.longPressTimer);

    // 每次觸發後，把起始座標重設到目前位置，這樣同一次按住持續搓動時，
    // 每超過門檻距離一次就能再算一次新的摩擦，而不是整個手勢只判定一次
    touchRef.current.startX = e.clientX;
    touchRef.current.startY = e.clientY;
    touchRef.current.rubbed = true;

    const now = Date.now();
    if (now < touchRef.current.cooldownUntil) {
      EventBus.emit(Events.System.TOAST, '寵物需要休息一下～');
      return;
    }
    // 開一輪新的連續觸發視窗，或沿用還在視窗內的舊一輪
    if (now - touchRef.current.burstStartAt > RUB_BURST_WINDOW_MS) {
      touchRef.current.burstStartAt = now;
      touchRef.current.burstCount = 0;
    }
    touchRef.current.burstCount += 1;
    if (touchRef.current.burstCount > RUB_BURST_MAX) {
      touchRef.current.cooldownUntil = now + RUB_COOLDOWN_MS;
      EventBus.emit(Events.System.TOAST, '寵物需要休息一下～');
      return;
    }
    onRub();
  }, [targeting, onRub]);

  const onPointerUp = useCallback((e) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    clearTimeout(touchRef.current.longPressTimer);
    if (!touchRef.current.isDown) return; // 沒有配對的 down，忽略
    touchRef.current.isDown = false;

    if (touchRef.current.longPressFired) return; // 長按已經處理過了
    if (targeting) { onBecomeTarget(); return; }
    if (touchRef.current.rubbed) return; // move 階段已經觸發過摩擦了

    const now = Date.now();
    if (now - touchRef.current.lastTapAt < 350) return; // 避免快速連續觸發造成畫面閃爍
    touchRef.current.lastTapAt = now;
    onTap();
  }, [targeting, onBecomeTarget, onTap]);

  return { onPointerDown, onPointerMove, onPointerUp };
}
// 對話文字集中在這裡挑一次，SinglePet/BabyPet 的 handleTap 只呼叫一次、
// 存進 state，不要交給 DialogBubble 每次重繪時自己重新抽——理由見
// DialogBubble 內的註解
function pickDialogText(pet, isBaby) {
  if (isBaby) return DIALOGS.baby[Math.floor(Math.random() * DIALOGS.baby.length)];
  if (pet.isSick) return DIALOGS.sick[Math.floor(Math.random() * DIALOGS.sick.length)];
  return getPetDialog(pet);
}
/* ─── 成寵 ───────────────────────────────────────────── */
function SinglePet({ pet, index, targeting, onBecomeTarget, registerRef, isBubbleOpen, onOpenBubble, onCloseBubble, isDetailOpen, onOpenDetail, onCloseDetail }) {
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
    navigator.vibrate?.(15); // 觸覺回饋，不支援的裝置（如多數 iOS）會安靜略過
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

  const imgHeight = 85 + Math.min(5, pet.level ?? 1) * 10;
  const rightPct = pet.rightPos ?? (15 + index * 25);

  return (
    <div ref={wrapRef} style={{ position: 'absolute', bottom: '8%', right: `${rightPct}%`, zIndex: 20 + index, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
function BabyPet({ babyId, babyData, babyName, targeting, onBecomeTarget, registerRef, isBubbleOpen, onOpenBubble, onCloseBubble, onOpenDetail }) {
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

  return (
    <div ref={wrapRef} style={{ position: 'absolute', bottom: '8%', right: `${babyData?.rightPos ?? 45}%`, zIndex: 25, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            height: 90, width: 'auto', objectFit: 'contain',
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

// 取名視窗已經抽成共用元件 PetNamingModal（見檔案頂部 import），
// 因為 AvatarPage.jsx 裝備寵物那一刻也需要立即跳出同一份 UI，
// 不能只留在這個檔案裡自己用。

function BirthModal({ babyId, babyName, onResolve, onClose }) {
  const [step, setStep] = useState('choose');
  const [choice, setChoice] = useState(null);
  const [name, setName] = useState('新寵物');

  const handleChoice = c => {
    if (c === 'giveaway') { onResolve('giveaway', babyId, null); onClose(); return; }
    setChoice(c);
    setStep('name');
  };

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>✨ 迎接新生命</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🍼</div>
          {step === 'choose' ? (
            <>
              <p style={{ color: 'var(--text-muted,#8c6e52)', fontSize: '0.9rem', marginBottom: 14, lineHeight: 1.5 }}>
                寶寶出生了！請決定牠的未來：
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={ghostBtnStyle} onClick={() => handleChoice('replace')}>🌟 讓父母去旅行，繼承優秀基因</button>
                <button style={ghostBtnStyle} onClick={() => handleChoice('mascot')}>🧸 父母留下，寶寶當迷你幼仔</button>
                <button style={ghostBtnStyle} onClick={() => handleChoice('giveaway')}>🏡 為寶寶尋找新家（+100金幣）</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted,#8c6e52)', fontSize: '0.9rem', marginBottom: 14 }}>為寶寶取個名字：</p>
              <input style={inputStyle} value={name} maxLength={10} onChange={e => setName(e.target.value)} placeholder="最多10個字" />
            </>
          )}
        </div>
        {step === 'name' && (
          <div style={modalFootStyle}>
            <button style={{ ...ghostBtnStyle, flex: 1 }} onClick={() => setStep('choose')}>← 返回</button>
            <button style={{ ...btnStyle, flex: 2 }} onClick={() => { onResolve(choice, babyId, name); onClose(); }}>確認</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 血統圖鑑（原基因圖鑑，改讀 LINEAGE_DICTIONARY）───── */
function LineageArchiveModal({ archive, onClose }) {
  const [flipped, setFlipped] = useState({});
  const entries = Object.entries(LINEAGE_DICTIONARY);

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>🧬 家族血統圖鑑</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 10, fontSize: '0.85rem', color: 'var(--color-gold,#f5a623)', fontWeight: 700 }}>
            已解鎖：{archive.length} / {entries.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {entries.map(([id, lineage]) => {
              const unlocked = archive.includes(id);
              const isFlipped = flipped[id];
              return (
                <div key={id}
                  style={{ borderRadius: 14, border: `2px solid ${unlocked ? 'var(--color-gold,#f5a623)' : 'var(--border,rgba(0,0,0,0.09))'}`, background: unlocked ? 'rgba(245,166,35,0.06)' : 'rgba(0,0,0,0.04)', padding: 12, textAlign: 'center', cursor: unlocked ? 'pointer' : 'default', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => unlocked && setFlipped(f => ({ ...f, [id]: !f[id] }))}
                >
                  {!isFlipped ? (
                    <>
                      {lineage.difficult && unlocked && <div style={{ fontSize: '0.7rem', marginBottom: 2 }}>⭐⭐⭐</div>}
                      <div style={{ fontSize: unlocked ? '2.2rem' : '2rem', marginBottom: 6, filter: unlocked ? 'none' : 'grayscale(100%)' }}>
                        {unlocked ? lineage.icon : '❓'}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: unlocked ? 'var(--text,#2c1a0e)' : 'var(--text-muted,#8c6e52)' }}>
                        {unlocked ? id : '尚未解鎖'}
                      </div>
                      {!unlocked && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted,#8c6e52)', marginTop: 4, lineHeight: 1.4, padding: '0 4px' }}>
                          💡 {lineage.hint}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2,#5c3d2e)', lineHeight: 1.5 }}>{lineage.desc}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 道具托盤：短按寵物箱彈出，點道具→飛給寵物 ─────── */
function ItemTray({ onPickItem }) {
  const bag = useGameStore(s => s.bag ?? []);
  const gold = useGameStore(s => s.gold ?? 0);

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
function FlyingItem({ emoji, from, to, onArrive }) {
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
function PetBoxButton({ boxRef, trayOpen, onToggleTray, onOpenArchive }) {
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

/* ─── 主體 ───────────────────────────────────────────── */
export default function PetWidget() {
  const { activePets, babyPet, babyPetName, babyPetData, petArchive, wearing, isModuleActive } = useGameStore(s => ({
    activePets:     s.activePets  ?? [],
    babyPet:        s.babyPet     ?? null,
    babyPetName:    s.babyPetName ?? null,
    babyPetData:    s.babyPetData ?? null,
    petArchive:     s.petArchive  ?? [],
    wearing:        s.avatar?.wearing ?? {},
    isModuleActive: !!(s.unlocks?.module_pet),
  }));

  const [showArchive, setShowArchive] = useState(false);
  const [birthData,   setBirthData]   = useState(null);
  const [namingIndex, setNamingIndex] = useState(null);
  const [trayOpen,     setTrayOpen]     = useState(false);
  const [pickedItem,   setPickedItem]   = useState(null); // 托盤裡被選中、等待指定對象的道具
  const [flying,       setFlying]       = useState([]);   // 飛行中的道具動畫佇列

  // 氣泡/詳情框都由這裡統一管理「目前開著的是哪一隻」（'baby' 或成寵的 index），
  // 同一時間只允許一個開著，不然每隻寵物各自管理自己的開關狀態時，點了另一隻
  // 卻不會關掉前一隻，會出現「兩個氣泡同時疊出來」的問題
  const [openBubbleFor, setOpenBubbleFor] = useState(null);
  const [detailTarget,  setDetailTarget]  = useState(null); // 詳情框現在要顯示哪隻寵物的資料
  const containerRef = useRef(null);
  const boxRef = useRef(null);
  const trayWrapRef = useRef(null);
  const petElRefs = useRef({});   // { [index]: HTMLElement }
  const babyElRef = useRef(null);

  useEffect(() => {
    const unsub = EventBus.on(Events.Pet.BIRTH_READY, ({ motherIndex }) => {
      const pool = useGameStore.getState().activePets ?? [];
      const id = pool[motherIndex]?.id ?? pool[0]?.id ?? 'pet_01';
      setBirthData({ babyId: id });
    });
    return () => unsub();
  }, []);

  // 檢查是否有從購買/裝備門進來、還沒取名的寵物。不用事件通知（裝備動作
  // 發生在更衣室，這個元件當下不一定有掛載），改成每次 activePets 變動
  // 時都檢查一次，掛載當下也會跑一次，保證不管玩家什麼時候切回大廳都會
  // 跳出來。namingIndex !== null 時代表視窗已經開著，不重複搶佔（多隻
  // 待命名時，會在前一隻命名完成、activePets 再次變動後接續跳出下一隻）。
  useEffect(() => {
    if (namingIndex !== null) return;
    const idx = activePets.findIndex(p => p.needsNaming);
    if (idx !== -1) setNamingIndex(idx);
  }, [activePets, namingIndex]);

  const handleConfirmName = useCallback((name) => {
    EventBus.emit(Events.Pet.REQUEST_NAME_PET, { index: namingIndex, name });
    setNamingIndex(null);
  }, [namingIndex]);

  // 有效可餵食對象：非探險中的成寵 + 在家的幼崽
  const getValidTargets = useCallback(() => {
    const targets = [];
    activePets.forEach((p, i) => { if (p.status !== 'exploring') targets.push(i); });
    if (babyPet && babyPetData) targets.push('baby');
    return targets;
  }, [activePets, babyPet, babyPetData]);

  const registerPetRef = useCallback((index, el) => { petElRefs.current[index] = el; }, []);
  const registerBabyRef = useCallback((el) => { babyElRef.current = el; }, []);

  const flyItemTo = useCallback((shopItem, targetEl) => {
    if (!boxRef.current || !targetEl || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const boxRect = boxRef.current.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const from = { x: boxRect.left - containerRect.left + boxRect.width / 2, y: boxRect.top - containerRect.top + boxRect.height / 2 };
    const to   = { x: targetRect.left - containerRect.left + targetRect.width / 2, y: targetRect.top - containerRect.top + targetRect.height / 2 };
    const flyId = `fly_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setFlying(f => [...f, { id: flyId, emoji: shopItem.icon, from, to }]);
  }, []);

  const consumeItemAndInteract = useCallback((shopItem, target) => {
    const bag = useGameStore.getState().bag ?? [];
    const owned = bag.find(b => b.id === shopItem.id)?.count ?? 0;
    if (owned <= 0) return; // 飛行途中被別的地方用掉了，安全防呆
    useGameStore.setState(s => ({
      bag: (s.bag ?? []).map(i => i.id === shopItem.id ? { ...i, count: i.count - 1 } : i),
    }));
    EventBus.emit(Events.Pet.REQUEST_INTERACT, { target, action: shopItem.type, amount: shopItem.val });
  }, []);

  const handlePickItem = useCallback((shopItem) => {
    const targets = getValidTargets();
    if (targets.length === 0) {
      EventBus.emit(Events.System.TOAST, '目前沒有在家的寵物可以互動喔！');
      return;
    }
    if (targets.length === 1) {
      const only = targets[0];
      const el = only === 'baby' ? babyElRef.current : petElRefs.current[only];
      flyItemTo(shopItem, el);
      consumeItemAndInteract(shopItem, only);
      return;
    }
    // 多隻可選：進入指定模式，等玩家點選目標
    setPickedItem(shopItem);
    EventBus.emit(Events.System.TOAST, '選一隻寵物送過去吧！');
  }, [getValidTargets, flyItemTo, consumeItemAndInteract]);

  const handleBecomeTarget = useCallback((target) => {
    if (!pickedItem) return;
    const el = target === 'baby' ? babyElRef.current : petElRefs.current[target];
    flyItemTo(pickedItem, el);
    consumeItemAndInteract(pickedItem, target);
    setPickedItem(null);
    setTrayOpen(false);
  }, [pickedItem, flyItemTo, consumeItemAndInteract]);

  const handleOpenDetailFor = useCallback((target, petData, isBaby) => {
    setOpenBubbleFor(null); // 開詳情框時，先確保沒有殘留的對話氣泡
    setDetailTarget({ target, pet: petData, isBaby });
  }, []);

  // 只有托盤開著、或有選中待送出的道具時，才需要處理「點擊別處」的邏輯，
  // 平常點寵物、點畫面其他地方都不該被這裡攔截
  // 點在任何一隻寵物身上：交給該寵物自己的 pointerup -> onBecomeTarget 處理
  const isInsideAnyPet = useCallback((target) => {
    if (babyElRef.current?.contains(target)) return true;
    return Object.values(petElRefs.current).some(el => el?.contains(target));
  }, []);

  const handleOutsidePointerDown = useCallback((e) => {
    if (!trayOpen && !pickedItem) return;

    const target = e.target;
    const insideTray = trayWrapRef.current?.contains(target);
    const insideBox  = boxRef.current?.contains(target);
    // 點在托盤或寵物箱本身：交給它們自己的手勢/onClick 處理，
    // 這裡絕對不能搶著關閉，不然托盤裡的道具按鈕會在自己的 onClick
    // 觸發之前就被這裡關掉、從畫面上被抽離，導致點擊完全沒反應
    if (insideTray || insideBox) return;

    if (pickedItem) {
      if (isInsideAnyPet(target)) return; // 交給被點中的寵物自己處理指定送達
      // 點在畫面空白處：取消這次指定，避免玩家點錯地方浪費道具
      setPickedItem(null);
      setTrayOpen(false);
      EventBus.emit(Events.System.TOAST, '已取消送出');
      return;
    }

    setTrayOpen(false);
  }, [trayOpen, pickedItem, isInsideAnyPet]);

  const hasStaticPet = !isModuleActive && !!wearing.pet;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <style>{petAnim}</style>
      <div style={{ pointerEvents: 'auto', position: 'absolute', inset: 0 }} onPointerDown={handleOutsidePointerDown}>

        {isModuleActive && activePets.map((pet, i) => (
          <SinglePet
            key={pet.id + i}
            pet={pet}
            index={i}
            targeting={!!pickedItem}
            onBecomeTarget={handleBecomeTarget}
            registerRef={registerPetRef}
            isBubbleOpen={openBubbleFor === i}
            onOpenBubble={() => setOpenBubbleFor(i)}
            onCloseBubble={() => setOpenBubbleFor(cur => cur === i ? null : cur)}
            onOpenDetail={() => handleOpenDetailFor(i, pet, false)}
          />
        ))}

        {hasStaticPet && (
          <div style={{ position: 'absolute', left: '20%', bottom: '8%', zIndex: 15, pointerEvents: 'none' }}>
            <img src={`img/${wearing.pet}.png`}
              style={{ height: 90, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {babyPet && babyPetData && (
          <BabyPet
            babyId={babyPet} babyData={babyPetData} babyName={babyPetName}
            targeting={!!pickedItem}
            onBecomeTarget={handleBecomeTarget}
            registerRef={registerBabyRef}
            isBubbleOpen={openBubbleFor === 'baby'}
            onOpenBubble={() => setOpenBubbleFor('baby')}
            onCloseBubble={() => setOpenBubbleFor(cur => cur === 'baby' ? null : cur)}
            onOpenDetail={() => handleOpenDetailFor('baby', { ...babyPetData, name: babyPetName, level: 0, isGrowing: true }, true)}
          />
        )}

        {isModuleActive && (
          <PetBoxButton
            boxRef={boxRef}
            trayOpen={trayOpen}
            onToggleTray={() => setTrayOpen(o => !o)}
            onOpenArchive={() => { setTrayOpen(false); setShowArchive(true); }}
          />
        )}

        {trayOpen && (
          <div ref={trayWrapRef} style={{ position: 'absolute', bottom: '32%', right: '4%', zIndex: 31 }}>
            <ItemTray onPickItem={handlePickItem} />
          </div>
        )}

        {flying.map(f => (
          <FlyingItem
            key={f.id} emoji={f.emoji} from={f.from} to={f.to}
            onArrive={() => setFlying(list => list.filter(x => x.id !== f.id))}
          />
        ))}

        {detailTarget && (
          <PetDetailModal
            pet={detailTarget.pet}
            isBaby={detailTarget.isBaby}
            onClose={() => setDetailTarget(null)}
          />
        )}
        {showArchive && <LineageArchiveModal archive={petArchive} onClose={() => setShowArchive(false)} />}
        {namingIndex !== null && activePets[namingIndex] && (
          <PetNamingModal onConfirm={handleConfirmName} />
        )}
        {birthData && (
          <BirthModal
            babyId={birthData.babyId}
            babyName="新寵物"
            onResolve={(choice, id, name) => EventBus.emit(Events.Pet.REQUEST_RESOLVE_BIRTH, { choice, babyId: id, babyName: name })}
            onClose={() => setBirthData(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ─── 樣式 ───────────────────────────────────────────── */
const statusTagStyle = (bg, color = '#fff') => ({
  fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8,
  background: bg, color, fontWeight: 600,
});

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

const ghostBtnStyle = {
  padding: '11px 18px', borderRadius: 'var(--radius-sm,8px)',
  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
  fontFamily: 'inherit',
  background: 'var(--bg-panel,#f7e7ce)', color: 'var(--text,#2c1a0e)',
  border: '1.5px solid var(--border-input,#d5c5a8)', boxShadow: 'none',
};