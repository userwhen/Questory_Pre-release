import React from 'react';

export const modalAnim = `
@keyframes taskModalIn { from { opacity:0; transform:scale(0.9) translateY(14px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
`;

export const pageStyle         = { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
export const segmentWrapStyle  = { flexShrink: 0, display: 'flex', background: 'var(--bg-box, rgba(0,0,0,0.035))', borderRadius: 50, padding: 'var(--space-xs)', margin: 'var(--space-xs) var(--space-md)' };
export const segBtnStyle       = { flex: 1, border: 'none', borderRadius: 50, padding: 'var(--space-xs) 0', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', transition: 'var(--t-base)', fontFamily: 'inherit' };
export const filterBarStyle    = { flexShrink: 0, paddingBottom: 'var(--space-xs)', paddingTop: 'var(--space-xs)', paddingLeft: 'var(--space-xs)', paddingRight: 'var(--space-xs)', display: 'flex', alignItems: 'center' };
export const filterScrollStyle = { display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', flex: 1 };
export const filterBtnStyle    = { flexShrink: 0, borderRadius: 50, padding: 'var(--space-xs) var(--space-sm)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', transition: 'var(--t-fast)', fontFamily: 'inherit', background: 'var(--bg-card)', border: '1px solid var(--border)' };
export const scrollAreaStyle   = { flex: 1, overflowY: 'auto', padding: '0 var(--space-xs)', overflowX: 'hidden' };
export const emptyStyle        = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', opacity: 0.6, fontSize: 'var(--size-md)', fontWeight: 700, color: 'var(--text)' };

export const cardStyle = {
  background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md, 12px)',
  marginBottom: 'var(--space-xs)',
  boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))',
  borderTop: '1px solid var(--border-card, rgba(0,0,0,0.07))',
  borderRight: '1px solid var(--border-card, rgba(0,0,0,0.07))',
  borderBottom: '1px solid var(--border-card, rgba(0,0,0,0.07))',
  borderLeft: '4px solid var(--border-input, #d5c5a8)',
  display: 'flex', // 左/中/右三個 zone 用 flex 排成一列，各自管自己的手勢，彼此是兄弟不是巢狀
  overflow: 'hidden', // 讓內部 zone 的分隔線不會跑出圓角外面
  touchAction: 'pan-y', // 保留原生垂直捲動；水平手勢判斷交給整張卡的 pointer handler，不用 setPointerCapture
};

// ── 任務卡三分區（左：完成/勾選、中：標題+展開內容、右：編輯/拖曳），
//    彼此是兄弟節點，各自只認一種手勢，不需要互相 stopPropagation ──
export const cardZoneLeftStyle   = { width: 'var(--size-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border, rgba(0,0,0,0.08))', cursor: 'pointer' };
export const cardZoneRightStyle  = { width: 'var(--size-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border, rgba(0,0,0,0.08))', cursor: 'pointer' };
export const cardMiddleZoneStyle = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' };
export const cardHeaderStyle     = { padding: 'var(--space-sm) var(--space-sm)', cursor: 'pointer' };
export const cardExpandedStyle   = { padding: '0 var(--space-sm) var(--space-sm)', borderTop: 'none', marginTop: 'var(--space-xs)', fontSize: 'var(--font-body)' };

export const cardRowStyle      = { display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', width: '100%' };
export const checkStyle        = { width: 'var(--size-xs)', height: 'var(--size-xs)', borderRadius: '50%', border: '2px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all var(--t-base)', boxSizing: 'border-box' };
export const catPillStyle      = { display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: 'var(--radius-xs)', background: 'var(--color-gold-soft, #fef3c7)', color: 'var(--color-gold-dark, #c47d0e)', border: '1px solid var(--color-gold, #f5a623)', fontSize: 'var(--font-caption)', fontWeight: 700, whiteSpace: 'nowrap' };
export const iconBtnStyle      = { background: 'transparent', border: 'none', fontSize: 'var(--font-title)', cursor: 'pointer', padding: '0 var(--space-xs)', opacity: 0.6, flexShrink: 0 };
export const progressTrackStyle = { position: 'relative', background: 'rgba(0,0,0,0.09)', borderRadius: 'var(--radius-full)', overflow: 'hidden', height: 'var(--size-xs)' };
export const progressBarStyle  = { height: '100%', background: 'linear-gradient(90deg, var(--color-correct, #227A59), #4ac994)', transition: 'width var(--t-slow)' };

export const progressTextStyle = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 'var(--font-caption)', fontWeight: 800, color: 'var(--text, #2c1a0e)',
  textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 2px rgba(255,255,255,0.9)',
};

export const fabStyle          = { position: 'absolute', bottom: 25, right: 25, width: 'var(--size-lg)', height: 'var(--size-lg)', borderRadius: '50%', background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none', fontSize: 'var(--size-sm)', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0,0,0,0.20))', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 };
export const maskStyle         = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: 'var(--space-md)' };
export const modalStyle        = { width: '100%', maxWidth: 400, maxHeight: '88vh', background: 'var(--bg-modal, #fdf5e6)', border: '2px solid var(--border-wood, #3e2723)', borderRadius: 'var(--radius-lg, 18px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'taskModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' };
export const modalHeadStyle    = { flexShrink: 0, background: 'var(--bg-modal-head, #3b2519)', color: 'var(--text-on-dark, #f5e6cf)', padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
export const closeXStyle       = { background: 'transparent', border: 'none', color: 'var(--text-on-dark, #f5e6cf)', fontSize: 'var(--font-title)', cursor: 'pointer', padding: '0 var(--space-xs)' };
export const modalBodyStyle    = { flex: 1, overflowY: 'auto', padding: 'var(--space-md)' };
export const modalFootStyle    = { flexShrink: 0, padding: 'var(--space-sm) var(--space-sm)', background: 'var(--bg-modal-foot, #f0e4cc)', borderTop: '1px solid var(--border, rgba(0,0,0,0.09))', display: 'flex', gap: 'var(--space-xs)' };
export const labelStyle        = { display: 'block', fontWeight: 700, fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginBottom: 'var(--space-xs)', letterSpacing: '0.07em', textTransform: 'uppercase' };
export const inputStyle        = { width: '100%', padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm, 8px)', border: '1.5px solid var(--border-input, #d5c5a8)', fontSize: 'var(--font-body)', fontFamily: 'inherit', background: 'var(--bg-input, #fff)', color: 'var(--text, #2c1a0e)', outline: 'none', boxSizing: 'border-box', marginBottom: 'var(--space-sm)', display: 'block' };
export const btnStyle          = { padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm, 8px)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid var(--border-input, #d5c5a8)', background: 'var(--color-correct, #227A59)', color: '#fff', boxShadow: '0 4px 0 var(--color-correct-dark, #185C42)' };
export const btnSmallStyle     = { padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-xs)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)' };
export const boxStyle          = { padding: 'var(--space-sm)', background: 'var(--bg-elevated, #fff)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' };