// src/ui/ErrorBoundary.jsx
import React from 'react';

// 最外層安全網：避免任一畫面渲染時丟出未捕捉例外時，整個 App 白屏卡死。
// 只攔渲染期間的例外，不影響 EventBus/非同步邏輯的錯誤處理。
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Uncaught render error:', error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={s.wrap}>
        <div style={s.icon}>💔</div>
        <div style={s.title}>發生了一點問題</div>
        <div style={s.desc}>畫面出現未預期的錯誤，你的存檔資料不會受影響。</div>
        <button style={s.btn} onClick={this.handleReload}>重新載入</button>
      </div>
    );
  }
}

const s = {
  wrap: {
    position: 'fixed', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 'var(--space-sm)', padding: 'var(--space-xl)', textAlign: 'center',
    background: 'var(--bg-hud, #2c1a0e)',
    color: 'var(--text-on-dark, #f5e6cf)',
    zIndex: 'var(--z-toast)',
  },
  icon: { fontSize: 'var(--size-md)' },
  title: { fontSize: 'var(--font-title)', fontWeight: 700 },
  desc: { fontSize: 'var(--font-body)', opacity: 0.8, maxWidth: 280 },
  btn: {
    marginTop: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-xl)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-gold, #f5a623)',
    background: 'rgba(245,166,35,0.15)',
    color: 'var(--color-gold, #f5a623)',
    fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer',
  },
};
