import React from 'react';
import { useGameStore } from '@/core/state.js';

export default function HUD({ onAvatarClick, onGemClick, onSettingsClick }) {
    const { userName, lv, exp, gold, freeGem, paidGem } = useGameStore(s => ({
        userName: s.userName ?? 'Commander',
        lv: s.lv ?? 1,
        exp: s.exp ?? 0,
        gold: s.gold ?? 0,
        freeGem: s.freeGem ?? 0,
        paidGem: s.paidGem ?? 0,
    }));

    const expPct = Math.min(100, Math.round((exp / (lv * 100)) * 100));
    const totalGem = freeGem + paidGem;

    return (
        <div style={s.hud}>
            <div style={s.left}>
                <div style={s.avatar} onClick={onAvatarClick}>
                    <AvatarImage />
                </div>
                <div style={s.info}>
                    <div style={s.name}>{userName}</div>
                    <div style={s.lvRow}>
                        <span style={s.lvBadge}>LV {lv}</span>
                        <div style={s.track}>
                            <div style={{ ...s.bar, width: `${expPct}%` }} />
                        </div>
                        <span style={s.expTxt}>{exp}/{lv * 100}</span>
                    </div>
                </div>
            </div>

            <div style={s.right}>
                <div style={{ ...s.currency, cursor: 'pointer' }} onClick={onGemClick}>
                    <span style={s.gemFree}>💎 {freeGem}</span>
                    <span style={s.gemPaid}>💠 {paidGem}</span>
                </div>
                <div style={s.currency}>
                    <span style={s.gold}>💰 {gold.toLocaleString()}</span>
                    <button style={s.menuBtn} onClick={onSettingsClick}>≡</button>
                </div>
            </div>
        </div>
    );
}

function AvatarImage() {
    // Assets 模組未遷移前的暫時顯示
    return <span style={{ fontSize: 26 }}>🧙</span>;
}

const s = {
    hud: {
        flexShrink: 0,
        height: 'calc(72px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'var(--bg-hud, #2c1a0e)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 14px',
        boxSizing: 'border-box',
        zIndex: 100,
    },
    left: {
        flex: 1, display: 'flex',
        alignItems: 'center', gap: 10,
        minWidth: 0, marginRight: 12,
    },
    avatar: {
        width: 48, height: 48,
        borderRadius: 10,
        border: '2px solid var(--color-gold, #f5a623)',
        background: '#3b2519',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: 'pointer',
        overflow: 'hidden',
    },
    info: {
        display: 'flex', flexDirection: 'column',
        gap: 5, flex: 1, minWidth: 0,
    },
    name: {
        fontSize: '0.88rem', fontWeight: 700,
        color: 'var(--text-on-dark, #f5e6cf)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    lvRow: {
        display: 'flex', alignItems: 'center', gap: 6,
    },
    lvBadge: {
        fontSize: '0.62rem', fontWeight: 900,
        color: 'var(--color-gold, #f5a623)',
        background: 'rgba(245,166,35,0.15)',
        border: '1px solid rgba(245,166,35,0.3)',
        padding: '1px 6px', borderRadius: 9999,
        flexShrink: 0, letterSpacing: '0.05em',
    },
    track: {
        flex: 1, height: 5, borderRadius: 9999,
        background: 'rgba(255,255,255,0.12)', overflow: 'hidden',
    },
    bar: {
        height: '100%', borderRadius: 9999,
        background: 'linear-gradient(90deg, var(--color-gold-dark, #c47d0e), var(--color-gold, #f5a623))',
        transition: 'width 0.35s ease',
    },
    expTxt: {
        fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)',
        flexShrink: 0,
    },
    right: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: 4,
    },
    currency: {
        display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem',
    },
    currVal: {
        color: 'var(--text-on-dark, #f5e6cf)', fontWeight: 700,
    },
    gemFree: { color: 'var(--color-info, #2980b9)', fontWeight: 700, fontSize: '0.75rem' },
    gemPaid: { color: 'var(--color-info, #2980b9)', fontWeight: 700, fontSize: '0.75rem' },
    gold: { color: 'var(--color-gold, #f5a623)', fontWeight: 700, fontSize: '0.75rem' },
    menuBtn: {
        background: 'none', border: 'none',
        color: 'var(--color-gold, #f5a623)',
        fontSize: '1.4rem', cursor: 'pointer',
        padding: '0 0 0 8px', lineHeight: 1,
    },
};