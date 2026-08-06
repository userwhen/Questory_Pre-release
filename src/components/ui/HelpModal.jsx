// src/components/ui/HelpModal.jsx
import React from 'react';
import HelpPage from '@/components/pages/HelpPage.jsx';
import { maskStyle, modalStyle as baseModalStyle, modalHeadStyle, closeXStyle } from '@/styles/modalStyles.js';

const modalStyle = { ...baseModalStyle, maxHeight: '85vh' };

export default function HelpModal({ onClose, onNavigate }) {
  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>❓ 常見問題</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <HelpPage onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}