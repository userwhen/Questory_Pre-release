// src/components/pages/MainPage.jsx
import React, { useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import PetWidget from '@/components/ui/PetWidget.jsx';
import CompanionWidget from '@/components/ui/CompanionWidget.jsx';
import { getQuickIcons } from '@/data/theme_config.js';
import CharacterSprite from '@/components/ui/CharacterSprite.jsx';

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

  return (
    <div style={styles.container}>
      {/* ── 背景圖（由 avatar.wearing.bg 決定）── */}
      {wearing.bg && (
        <img
          src={`img/${wearing.bg}.png`}
          style={styles.bgImage}
          onError={e => { e.target.style.display = 'none'; }}
          alt=""
        />
      )}
      {/* ── 右側快捷欄 ── */}
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

      {/* ── 陪伴者 ── */}
      <CompanionWidget
        compId={wearing.companion}
        challenge={challenge}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />

      {/* ── 角色（點擊進屬性頁）── */}
      <div style={styles.charArea} onClick={() => onNavigate('stats')}>
        <div style={styles.charSprite}>
          <CharacterSprite wearing={wearing} />
        </div>
        <div style={styles.charShadow} />
      </div>


      {/* ── 寵物 ── */}
      <PetWidget />

      {/* ── 劇情模式按鈕 ── */}
      {!isBasic && (
        <div style={styles.storyBtnWrap}>
          <button style={styles.storyBtn} onClick={() => onNavigate('story')}>
            🌀 進入劇情模式
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%', height: '100%',
    background: 'var(--bg-base,#1a1625)',
    position: 'relative', overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover', opacity: 0.6, zIndex: 0,
  },
  quickBar: {
    position: 'absolute', top: '4%', right: '4%',
    display: 'flex', flexDirection: 'column', gap: 10, zIndex: 10,
  },
  quickBtn: {
    width: 50, height: 50, borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    cursor: 'pointer', fontSize: '1.6rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  charArea: {
    position: 'absolute', left: '50%', bottom: '20%',
    transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    cursor: 'pointer', zIndex: 5,
  },
  charSprite: {
    width: 'clamp(120px, 35vw, 200px)',
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
    display: 'flex', justifyContent: 'center', zIndex: 10,
  },
  storyBtn: {
    padding: '10px 28px', borderRadius: 9999,
    background: 'var(--color-correct,#227A59)', color: '#fff',
    border: 'none', fontWeight: 700, fontSize: '1rem',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 #185C42',
  },
};