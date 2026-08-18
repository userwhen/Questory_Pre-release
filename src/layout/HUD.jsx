import React from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import PortraitStack from '@/avatar/components/PortraitStack.jsx';

export default function HUD({ onAvatarClick, onSettingsClick }) {
    const { userName, lv, exp, gold, freeGem, paidGem, portrait, frame } = useGameStore(s => ({
        userName: s.userName ?? 'Commander',
        lv: s.lv ?? 1,
        exp: s.exp ?? 0,
        gold: s.gold ?? 0,
        freeGem: s.freeGem ?? 0,
        paidGem: s.paidGem ?? 0,
        portrait: s.avatar?.equippedPortrait ?? null,
        frame: s.avatar?.equippedFrame ?? null,
    }));

    const expPct = Math.min(100, Math.round((exp / (lv * 100)) * 100));

    return (
        <div style={s.hud}>
            <div style={s.left}>
                <div style={s.avatar} onClick={onAvatarClick}>
                    <PortraitStack portrait={portrait} frame={frame} />
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
                <div style={{ ...s.currency, cursor: 'pointer' }} onClick={() => EventBus.emit(Events.System.MODAL_OPEN, { type: 'currencyShop', tab: 'gem' })}>
                    <span style={s.gemFree}>💎 {freeGem}</span>
                    <span style={s.gemPaid}>💠 {paidGem}</span>
                </div>
                <div style={s.currency}>
                    <span style={{ ...s.gold, cursor: 'pointer' }} onClick={() => EventBus.emit(Events.System.MODAL_OPEN, { type: 'currencyShop', tab: 'gold' })}>💰 {gold.toLocaleString()}</span>
                    <button style={s.menuBtn} onClick={onSettingsClick}>≡</button>
                </div>
            </div>
        </div>
    );
}

const s = {
    hud: {
        flexShrink: 0,
        height: 'calc(72px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'var(--space-sm)',
        paddingRight: 'var(--space-sm)',
        paddingBottom: 'var(--space-xs)',
        background: 'var(--bg-hud, #2c1a0e)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        boxSizing: 'border-box',
        zIndex: 'var(--z-hud)',
    },
    left: {
        flex: 1, display: 'flex',
        alignItems: 'center', gap: 'var(--space-xs)',
        minWidth: 0, marginRight: 'var(--space-sm)',
    },
    avatar: {
        width: 'var(--size-md)', height: 'var(--size-md)',
        flexShrink: 0, cursor: 'pointer',
        position: 'relative',
    },
    info: {
        display: 'flex', flexDirection: 'column',
        gap: 'var(--space-xs)', flex: 1, minWidth: 0,
    },
    name: {
        fontSize: 'var(--font-body)', fontWeight: 700,
        color: 'var(--text-on-dark, #f5e6cf)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    },
    lvRow: {
        display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
    },
    lvBadge: {
        fontSize: 'var(--font-caption)', fontWeight: 900,
        color: 'var(--color-gold, #f5a623)',
        background: 'rgba(245,166,35,0.15)',
        border: '1px solid rgba(245,166,35,0.3)',
        padding: '1px 6px', borderRadius: 'var(--radius-full)',
        flexShrink: 0, letterSpacing: '0.05em',
    },
    track: {
        flex: 1, height: 5, borderRadius: 'var(--radius-full)',
        background: 'rgba(255,255,255,0.12)', overflow: 'hidden',
    },
    bar: {
        height: '100%', borderRadius: 'var(--radius-full)',
        background: 'linear-gradient(90deg, var(--color-gold-dark, #c47d0e), var(--color-gold, #f5a623))',
        transition: 'width var(--t-slow) ease',
    },
    expTxt: {
        fontSize: 'var(--font-caption)', color: 'rgba(255,255,255,0.4)',
        flexShrink: 0,
    },
    right: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', gap: 'var(--space-xs)',
    },
    currency: {
        display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--font-caption)',
    },
    gemFree: { color: 'var(--color-info, #2980b9)', fontWeight: 700, fontSize: 'var(--font-caption)' },
    gemPaid: { color: 'var(--color-info, #2980b9)', fontWeight: 700, fontSize: 'var(--font-caption)' },
    gold: { color: 'var(--color-gold, #f5a623)', fontWeight: 700, fontSize: 'var(--font-caption)' },
    menuBtn: {
        background: 'none', border: 'none',
        color: 'var(--color-gold, #f5a623)',
        fontSize: 'var(--size-sm)', cursor: 'pointer',
        padding: '0 0 0 var(--space-xs)', lineHeight: 1,
    },
};
