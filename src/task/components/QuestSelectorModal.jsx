import React from 'react';
import Modal from '@/ui/Modal.jsx';

export default function QuestSelectorModal({ onSelect, onClose }) {
  const types = [
    { key: 'guild',  label: '📜 公會委託', desc: '不限分類，完整欄位自由填寫' },
    { key: 'gather', label: '📦 收集任務', desc: '購物、收集材料或待辦清單，條列式勾選' },
    { key: 'hunt',   label: '🏹 狩獵任務', desc: '重複執行的習慣，可設定次數與週期' },
    { key: 'event',  label: '📍 限時副本', desc: '有時間地點的約會或行程' },
    { key: 'boss',   label: '👑 史詩戰役', desc: '大型專案，以子任務拆解推進' },
  ];
  return (
    <Modal title="接取任務" onClose={onClose}>
      {types.map(t => (
        <div key={t.key} onClick={() => onSelect(t.key)}
          style={{ padding: 'var(--space-sm)', marginBottom: 'var(--space-xs)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-title)' }}>{t.label}</div>
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)', marginTop: 3 }}>{t.desc}</div>
        </div>
      ))}
    </Modal>
  );
}