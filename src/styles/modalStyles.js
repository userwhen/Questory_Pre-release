// src/styles/modalStyles.js
// 共用 Modal 樣式常數，取代各檔案各自定義一份 maskStyle/modalStyle 等
// 統一進場動畫名稱：modalFadeIn（沿用既有全域 CSS 已定義的 keyframes，這裡不重複定義）

export const modalEnterAnim = 'modalFadeIn 0.25s cubic-bezier(0.34,1.56,0.64,1)';

export const maskStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 'var(--z-modal)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(3px)',
  padding: 'var(--space-md)',
};

export const modalStyle = {
  width: '100%', maxWidth: 400, maxHeight: '88vh',
  background: 'var(--bg-modal, #fdf5e6)',
  border: '2px solid var(--border-wood, #3e2723)',
  borderRadius: 'var(--radius-lg)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
  animation: modalEnterAnim,
};

export const modalHeadStyle = {
  flexShrink: 0,
  background: 'var(--bg-modal-head, #3b2519)',
  color: 'var(--text-on-dark, #f5e6cf)',
  padding: 'var(--space-sm) var(--space-md)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

export const closeXStyle = {
  background: 'transparent', border: 'none',
  color: 'var(--text-on-dark, #f5e6cf)',
  fontSize: 'var(--font-title)', cursor: 'pointer',
};

export const modalBodyStyle = {
  padding: 'var(--space-md)',
  overflowY: 'auto',
  maxHeight: 'calc(88vh - 56px)',
};

export const modalFootStyle = {
  flexShrink: 0,
  padding: 'var(--space-sm) var(--space-md)',
  borderTop: '1px solid rgba(0,0,0,0.08)',
  display: 'flex',
  gap: 'var(--space-xs)',
  justifyContent: 'flex-end',
};

export const labelStyle = {
  display: 'block',
  fontSize: 'var(--font-body)',
  fontWeight: 600,
  color: 'var(--text-muted, #8c6e52)',
  marginBottom: 'var(--space-xs)',
};

export const inputStyle = {
  width: '100%',
  padding: 'var(--space-xs) var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border, rgba(0,0,0,0.15))',
  fontSize: 'var(--font-body)',
  background: 'var(--bg-box, #fff)',
  color: 'var(--text, #3e2723)',
};

export const btnStyle = {
  padding: 'var(--space-xs) var(--space-md)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  fontSize: 'var(--font-body)',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'var(--color-correct, #227a59)',
  color: '#fff',
};

export const btnSecondaryStyle = {
  ...btnStyle,
  background: 'rgba(0,0,0,0.06)',
  color: 'var(--text, #3e2723)',
  border: '1px solid var(--border, rgba(0,0,0,0.15))',
};

export const btnDangerStyle = {
  ...btnStyle,
  background: 'var(--color-danger, #c0392b)',
};
/** Ghost：透明底、無邊框，適合圖示切換（釘選等）；狀態用 opacity 自行疊 */
export const btnGhostStyle = {
  ...btnStyle,
  background: 'transparent',
  color: 'var(--text, #3e2723)',
  border: 'none',
  boxShadow: 'none',
};
// ── 從 PetWidget.jsx 拆分時搬過來的共用樣式（原本是寵物元件本地定義，
//    因為多處共用而收斂到這裡）。標記起來方便追蹤：如果未來寵物系統的
//    標籤或彈窗樣式需求跟其他地方分岔，可以再拉回寵物專屬的檔案自己維護。
export const compactModalStyle = { ...modalStyle, maxWidth: 380 };

export const statusTagStyle = (bg, color = '#fff') => ({
  fontSize: 'var(--font-caption)', padding: '1px 6px', borderRadius: 'var(--radius-sm)',
  background: bg, color, fontWeight: 600,
});
