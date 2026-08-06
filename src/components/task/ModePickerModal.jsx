import React from 'react';
import { maskStyle, modalStyle, modalHeadStyle, modalBodyStyle, closeXStyle } from '@/components/task/TaskStyles.js';

export default function ModePickerModal({ onSelectMode, onClose }) {
  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxHeight: '60vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>📋 新增任務</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...modalBodyStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => onSelectMode('quick')}
            style={{ padding: 18, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>🍺 酒館傳聞</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>隨手記下，不設定，立即建立</div>
          </div>
          <div onClick={() => onSelectMode('bounty')}
            style={{ padding: 18, borderRadius: 14, border: '2px solid var(--color-gold,#f5a623)', background: 'var(--color-gold-soft,#fef3c7)', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>📜 委託書</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>填寫正式懸賞委託，升等獎勵、設定條件</div>
          </div>
          <div onClick={() => onSelectMode('legacy')}
            style={{ padding: 14, borderRadius: 14, border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>⚙️ 進階表單（舊版）</div>
          </div>
        </div>
      </div>
    </div>
  );
}