import React, { useEffect, useRef } from 'react';

export default function SplashScreen({ onComplete }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onComplete?.();
    }, 2000);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.logoWrap}>
        <div style={styles.icon}>⚔️</div>
        <div style={styles.title}>Questory</div>
        <div style={styles.sub}>你的冒險，從今天開始</div>
      </div>
      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: '0s' }} />
        <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
        <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
      </div>
      <style>{dotAnim}</style>
    </div>
  );
}

const dotAnim = `
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
`;

const styles = {
  root: {
    position: 'fixed', inset: 0,
    background: 'var(--bg-hud, #2c1a0e)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 24, zIndex: 99999,
  },
  logoWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10,
  },
  icon: { fontSize: 56 },
  title: {
    fontSize: '2rem', fontWeight: 900,
    color: 'var(--color-gold, #f5a623)',
    letterSpacing: '0.08em',
    fontFamily: "'Noto Sans TC', sans-serif",
  },
  sub: {
    fontSize: '0.85rem', fontWeight: 500,
    color: 'var(--text-on-dark, #f5e6cf)',
    opacity: 0.7, letterSpacing: '0.05em',
  },
  dots: { display: 'flex', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--color-gold, #f5a623)',
    display: 'inline-block',
    animation: 'dotPulse 1.2s ease-in-out infinite',
  },
};
