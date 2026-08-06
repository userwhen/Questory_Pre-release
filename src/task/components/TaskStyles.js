import React from 'react';

export const modalAnim = `
@keyframes taskModalIn { from { opacity:0; transform:scale(0.9) translateY(14px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
`;

export const pageStyle         = { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
export const segmentWrapStyle  = { flexShrink: 0, display: 'flex', background: 'var(--bg-box, rgba(0,0,0,0.035))', borderRadius: 50, padding: 4, margin: '10px 15px' };
export const segBtnStyle       = { flex: 1, border: 'none', borderRadius: 50, padding: '7px 0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', fontFamily: 'inherit' };
export const filterBarStyle    = { flexShrink: 0, paddingBottom: 10, paddingTop: 4, paddingLeft: 10, paddingRight: 10, display: 'flex', alignItems: 'center' };
export const filterScrollStyle = { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', flex: 1 };
export const filterBtnStyle    = { flexShrink: 0, borderRadius: 50, padding: '4px 14px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: '0.15s', fontFamily: 'inherit', background: 'var(--bg-card)', border: '1px solid var(--border)' };
export const scrollAreaStyle   = { flex: 1, overflowY: 'auto', padding: '0 10px', overflowX: 'hidden' };
export const emptyStyle        = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', opacity: 0.6, fontSize: '3rem', fontWeight: 700, color: 'var(--text)' };

export const cardStyle = {
  background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md, 12px)',
  padding: '12px 13px 12px 17px', marginBottom: 10,
  boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))',
  borderTop: '1px solid var(--border-card, rgba(0,0,0,0.07))',
  borderRight: '1px solid var(--border-card, rgba(0,0,0,0.07))',
  borderBottom: '1px solid var(--border-card, rgba(0,0,0,0.07))',
  borderLeft: '4px solid var(--border-input, #d5c5a8)',
  cursor: 'pointer',
};

export const cardRowStyle      = { display: 'flex', alignItems: 'center', gap: 10, width: '100%' };
export const checkStyle        = { width: 24, height: 24, borderRadius: '50%', border: '2px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', boxSizing: 'border-box' };
export const catPillStyle      = { display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: 6, background: 'var(--color-gold-soft, #fef3c7)', color: 'var(--color-gold-dark, #c47d0e)', border: '1px solid var(--color-gold, #f5a623)', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' };
export const iconBtnStyle      = { background: 'transparent', border: 'none', fontSize: '1rem', cursor: 'pointer', padding: '0 4px', opacity: 0.6, flexShrink: 0 };
export const progressTrackStyle = { position: 'relative', background: 'rgba(0,0,0,0.09)', borderRadius: 9999, overflow: 'hidden', height: 12 };
export const progressBarStyle  = { height: '100%', background: 'linear-gradient(90deg, var(--color-correct, #227A59), #4ac994)', transition: 'width 0.3s' };

export const progressTextStyle = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 9, fontWeight: 800, color: 'var(--text, #2c1a0e)',
  textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 2px rgba(255,255,255,0.9)',
};

export const fabStyle          = { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: '50%', background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none', fontSize: '2rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0,0,0,0.20))', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 };
export const maskStyle         = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: 16 };
export const modalStyle        = { width: '100%', maxWidth: 400, maxHeight: '88vh', background: 'var(--bg-modal, #fdf5e6)', border: '2px solid var(--border-wood, #3e2723)', borderRadius: 'var(--radius-lg, 18px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'taskModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' };
export const modalHeadStyle    = { flexShrink: 0, background: 'var(--bg-modal-head, #3b2519)', color: 'var(--text-on-dark, #f5e6cf)', padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
export const closeXStyle       = { background: 'transparent', border: 'none', color: 'var(--text-on-dark, #f5e6cf)', fontSize: '1rem', cursor: 'pointer', padding: '0 4px' };
export const modalBodyStyle    = { flex: 1, overflowY: 'auto', padding: '16px' };
export const modalFootStyle    = { flexShrink: 0, padding: '12px 14px', background: 'var(--bg-modal-foot, #f0e4cc)', borderTop: '1px solid var(--border, rgba(0,0,0,0.09))', display: 'flex', gap: 8 };
export const labelStyle        = { display: 'block', fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase' };
export const inputStyle        = { width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm, 8px)', border: '1.5px solid var(--border-input, #d5c5a8)', fontSize: '0.95rem', fontFamily: 'inherit', background: 'var(--bg-input, #fff)', color: 'var(--text, #2c1a0e)', outline: 'none', boxSizing: 'border-box', marginBottom: 12, display: 'block' };
export const btnStyle          = { padding: '11px 18px', borderRadius: 'var(--radius-sm, 8px)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid var(--border-input, #d5c5a8)', background: 'var(--color-correct, #227A59)', color: '#fff', boxShadow: '0 4px 0 var(--color-correct-dark, #185C42)' };
export const btnSmallStyle     = { padding: '5px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)' };
export const boxStyle          = { padding: 12, background: 'var(--bg-elevated, #fff)', border: '1px solid var(--border)', borderRadius: 12 };