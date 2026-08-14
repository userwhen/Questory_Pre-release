// src/layout/Navbar.jsx
import React from 'react';
import { useGameStore } from '@/core/state.js';
import { getNavbar } from '@/data/theme_config.js';

// basic 模式拿掉「大廳(main)」，改成角色屬性(stats)，位置維持在正中間，
// 圖示/文字固定、不跟著主題色系換——想要跟主題連動的話再告訴我
const BASIC_STATS_ITEM = { id: 'stats', icon: '📊', label: '屬性', action: 'stats' };

export default function Navbar({ activePage, onNavigate }) {
  const { mode, theme } = useGameStore(s => ({
    mode:  s.settings?.mode  ?? 'adventurer',
    theme: s.settings?.theme ?? 'default',
  }));

  const rawItems = getNavbar(theme);
  const items = mode === 'basic'
    ? rawItems.map(i => (i.id === 'main' ? BASIC_STATS_ITEM : i))
    : rawItems;

  return (
    <nav style={s.navbar}>
      {items.map(item => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            style={{ ...s.item, color: isActive ? 'var(--color-gold,#f5a623)' : 'rgba(255,255,255,0.3)' }}
            onClick={() => onNavigate(item.action ?? item.id)}
          >
            <span style={s.icon}>{item.icon}</span>
            <span style={s.label}>{item.label}</span>
            {isActive && <div style={s.activeBar} />}
          </button>
        );
      })}
    </nav>
  );
}

const s = {
  navbar: {
    flexShrink: 0,
    height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    background: 'var(--bg-nav,#1e1208)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    zIndex: 'var(--z-nav)',
  },
  item: {
    flex: 1, display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none',
    fontSize: 'var(--font-caption)', fontWeight: 700,
    letterSpacing: '0.04em',
    padding: 0, cursor: 'pointer',
    transition: 'color var(--t-base)',
    position: 'relative',
    fontFamily: 'inherit',
    gap: 2,
  },
  icon:  { fontSize: 'var(--font-title)', lineHeight: 1 },
  label: { lineHeight: 1 },
  activeBar: {
    position: 'absolute', bottom: 0,
    left: '50%', transform: 'translateX(-50%)',
    width: 'var(--size-xs)', height: 2,
    background: 'var(--color-gold,#f5a623)',
    borderRadius: '9999px 9999px 0 0',
    boxShadow: '0 0 6px rgba(245,166,35,0.5)',
  },
};