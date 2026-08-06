// src/components/ui/CompanionWidget.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarShop, GachaPool } from '@/avatar/data/avatar_config.js';

const compAnim = `
  @keyframes compFloat {
    0%,100% { transform: translate(-50%,-50%) translateY(0); }
    50%      { transform: translate(-50%,-50%) translateY(-8px); }
  }
  @keyframes bubbleIn {
    from { opacity:0; transform:translateY(6px) scale(0.95); }
    to   { opacity:1; transform:translateY(0)   scale(1); }
  }
  @keyframes shadowPulse {
    0%,100% { transform:scaleX(1); opacity:0.35; }
    50%     { transform:scaleX(0.8); opacity:0.2; }
  }
`;

function CompanionBubble({ text, hasQuest, onAccept, onDecline, onClose }) {
  return (
    <div style={bubbleStyle} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text,#2c1a0e)', lineHeight: 1.5, marginBottom: hasQuest ? 10 : 0 }}>
        {text}
      </div>
      {hasQuest && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={questBtnStyle('var(--color-correct,#227A59)')} onClick={onAccept}>✔️ 接受</button>
          <button style={questBtnStyle('var(--color-danger,#c0392b)')}  onClick={onDecline}>❌ 婉拒</button>
        </div>
      )}
      {!hasQuest && (
        <button style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted,#8c6e52)' }}
          onClick={onClose}>✕</button>
      )}
    </div>
  );
}

export default function CompanionWidget({ compId, challenge, onAccept, onDecline }) {
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [pos, setPos]   = useState({ top: 30, left: 20 });
  const [flip, setFlip] = useState(false);
  const timerRef  = useRef(null);
  const posRef    = useRef({ top: 30, left: 20 }); // 解決 closure 問題

  // 找配置
  const allItems = [...AvatarShop, ...GachaPool];
  const compConf = allItems.find(i => i.id === compId) ?? {};
  const imgId    = compConf.imgId ?? compId;
  const compType = compConf.compType
    ?? (compId?.startsWith('fairy_') || compId?.startsWith('fly_') ? 'flying' : 'ground_free');

  const bounds = {
    flying:            { minTop: 15, maxTop: 50, minLeft: 5, maxLeft: 45 },
    ground_free:       { minTop: 55, maxTop: 82, minLeft: 5, maxLeft: 45 },
    ground_restricted: { minTop: 60, maxTop: 82, minLeft: 5, maxLeft: 40 },
  }[compType] ?? { minTop: 15, maxTop: 50, minLeft: 5, maxLeft: 45 };

  const heightStyle = {
    flying:            'clamp(110px,18vh,200px)',
    ground_free:       'clamp(100px,17vh,190px)',
    ground_restricted: 'clamp(90px,16vh,175px)',
  }[compType] ?? 'clamp(100px,17vh,190px)';

  // 巡邏（用 ref 讀取最新 pos 避免 closure 問題）
  useEffect(() => {
    if (!compId) return;
    const patrol = setInterval(() => {
      const newLeft = bounds.minLeft + Math.random() * (bounds.maxLeft - bounds.minLeft);
      const newTop  = bounds.minTop  + Math.random() * (bounds.maxTop  - bounds.minTop);
      setFlip(newLeft < posRef.current.left);
      posRef.current = { top: newTop, left: newLeft };
      setPos({ top: newTop, left: newLeft });
    }, 4500);
    return () => clearInterval(patrol);
  }, [compId, bounds.minTop, bounds.maxTop, bounds.minLeft, bounds.maxLeft]);

  useEffect(() => {
    if (challenge?.status === 'pending') {
      const dialog = challenge.issueDialog ?? '嘿！我有個任務想請你幫忙～';
      setBubbleText(`${dialog}\n【新挑戰】${challenge.desc}`);
      setShowBubble(true);
    } else if (challenge?.status === 'completed') {
      setBubbleText(`太棒了！你完成了挑戰！\n【${challenge.desc}】\n謝謝你 🎉`);
      setShowBubble(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowBubble(false), 5000);
    }
  }, [challenge?.status]);

  const handleClick = useCallback(() => {
    if (challenge?.status === 'pending') {
      const dialog = challenge.issueDialog ?? '嘿！我有個任務想請你幫忙～';
      setBubbleText(`${dialog}\n【新挑戰】${challenge.desc}`);
      setShowBubble(true);
      return;
    }
    if (challenge?.status === 'completed') {
      setBubbleText(`你完成了挑戰！\n【${challenge.desc}】\n辛苦了 🎉`);
      setShowBubble(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowBubble(false), 4000);
      return;
    }
    if (challenge?.status === 'active') {
      const done = challenge.curr >= challenge.target;
      setBubbleText(done
        ? `【挑戰完成】${challenge.desc}！`
        : `【進行中】${challenge.desc}\n(${challenge.curr}/${challenge.target})`
      );
    } else {
      const dialogs = ['今天也要加油喔！', '有什麼我能幫你的嗎？', '繼續努力，你做得到的！', '休息一下也很重要喔～'];
      setBubbleText(dialogs[Math.floor(Math.random() * dialogs.length)]);
    }
    setShowBubble(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowBubble(false), 4000);
  }, [challenge]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleAccept  = useCallback(() => { onAccept?.();  setShowBubble(false); }, [onAccept]);
  const handleDecline = useCallback(() => { onDecline?.(); setShowBubble(false); }, [onDecline]);

  if (!compId) return null;

  const hasQuest = challenge?.status === 'pending';
  const isFlying = compType === 'flying';
  const animStyle = hasQuest || isFlying ? 'compFloat 4s ease-in-out infinite' : 'none';

  return (
    <>
      <style>{compAnim}</style>
      <div style={{
        position: 'absolute',
        top:  `${pos.top}%`,
        left: `${pos.left}%`,
        transform: 'translate(-50%,-50%)',
        zIndex: 15,
        transition: 'top 3s ease-in-out, left 3s ease-in-out',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto',
      }}>
        {isFlying && (
          <div style={{ position: 'absolute', bottom: -14, left: '50%', marginLeft: -20, width: 40, height: 12, background: 'rgba(0,0,0,0.3)', borderRadius: '50%', filter: 'blur(3px)', animation: 'shadowPulse 4s ease-in-out infinite' }} />
        )}
        {showBubble && (
          <CompanionBubble
            text={bubbleText}
            hasQuest={hasQuest}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onClose={() => setShowBubble(false)}
          />
        )}
        <img
          src={`img/${imgId}.png`}
          alt="companion"
          style={{
            height: heightStyle,
            width: 'auto', objectFit: 'contain',
            filter: hasQuest
              ? 'drop-shadow(0 0 8px rgba(255,215,0,0.8))'
              : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))',
            transform: flip ? 'scaleX(-1)' : 'scaleX(1)',
            animation: animStyle,
            cursor: 'pointer', transition: 'filter 0.3s',
          }}
          onClick={handleClick}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
    </>
  );
}

const questBtnStyle = bg => ({
  flex: 1, padding: '5px 0', borderRadius: 8,
  background: bg, color: '#fff', border: 'none',
  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
});

const bubbleStyle = {
  position: 'absolute', bottom: '110%', left: '50%',
  transform: 'translateX(-50%)',
  minWidth: 200, maxWidth: 280,
  background: 'var(--bg-card,#fff)',
  border: '2px solid var(--color-gold,#f5a623)',
  borderRadius: 14, padding: '10px 12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  zIndex: 150, animation: 'bubbleIn 0.2s ease',
  whiteSpace: 'pre-line',
};