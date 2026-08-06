import React, { useState } from 'react';
import { useGameStore } from '@/core/state.js';

export default function WelcomeScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('請輸入你的名字'); return; }
    if (trimmed.length > 12) { setError('名字最多 12 個字'); return; }
    useGameStore.setState({ userName: trimmed });
    onComplete?.();
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.npc}>🧚</div>
        <h2 style={styles.title}>歡迎來到 Questory</h2>
        <p style={styles.desc}>我是你的引導小精靈。<br />首先，請告訴我你的名字？</p>
        <input
          style={{ ...styles.input, borderColor: error ? 'var(--color-danger, #c0392b)' : 'var(--border-input, #d5c5a8)' }}
          placeholder="輸入暱稱..."
          value={name}
          maxLength={12}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.btn} onClick={handleConfirm}>
          確認，開始冒險！
        </button>
      </div>
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed', inset: 0,
    background: 'var(--bg-panel, #f7e7ce)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 99998,
    padding: 24,
  },
  card: {
    background: 'var(--bg-modal, #fdf5e6)',
    border: '2px solid var(--border-wood, #3e2723)',
    borderRadius: 'var(--radius-lg, 18px)',
    padding: '32px 24px',
    width: '100%', maxWidth: 360,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 14,
    boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0,0,0,0.20))',
  },
  npc: { fontSize: 48 },
  title: {
    fontSize: '1.2rem', fontWeight: 800,
    color: 'var(--text, #2c1a0e)',
    margin: 0, textAlign: 'center',
  },
  desc: {
    fontSize: '0.92rem', color: 'var(--text-2, #5c3d2e)',
    textAlign: 'center', lineHeight: 1.7, margin: 0,
  },
  input: {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid',
    borderRadius: 'var(--radius-sm, 8px)',
    fontSize: '1rem', fontFamily: 'inherit',
    background: 'var(--bg-input, #fff)',
    color: 'var(--text, #2c1a0e)',
    outline: 'none', boxSizing: 'border-box',
  },
  error: {
    fontSize: '0.8rem', color: 'var(--color-danger, #c0392b)',
    margin: 0, alignSelf: 'flex-start',
  },
  btn: {
    width: '100%', padding: '12px',
    background: 'var(--color-correct, #227A59)',
    color: '#fff', border: 'none',
    borderRadius: 'var(--radius-sm, 8px)',
    fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 0 var(--color-correct-dark, #185C42)',
    transition: 'filter 0.12s',
  },
};
