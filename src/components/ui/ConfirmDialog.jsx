/* src/components/ui/ConfirmDialog.jsx */
import React from 'react';
import { maskStyle, modalStyle, btnStyle } from '@/styles/modalStyles.js';

/**
 * 全站共用的二次確認對話框（原本只有 components/task/ConfirmDialog.jsx 在用，
 * 現在移到 ui/ 讓 SettingsPage 的重置存檔等其他「危險操作」也能共用）。
 *
 * props:
 *   message      - 確認訊息（主標）
 *   subMessage   - 可選，副標小字（例如「此操作無法復原」）
 *   icon         - 可選，上方大 emoji 圖示
 *   confirmText  - 確認按鈕文字，預設「確定」
 *   danger       - 確認按鈕是否用警示色，預設 true
 */
export default function ConfirmDialog({ message, subMessage, icon, confirmText = '確定', danger = true, onConfirm, onCancel }) {
  return (
    <div style={maskStyle} onClick={onCancel}>
      <style>{'@keyframes modalFadeIn { from { opacity:0; transform:scale(0.9) translateY(14px); } to { opacity:1; transform:scale(1) translateY(0); } }'}</style>
      <div style={{ ...modalStyle, padding: 20, textAlign: 'center', maxWidth: 300 }} onClick={e => e.stopPropagation()}>
        {icon && <div style={{ fontSize: '3rem', marginBottom: 10 }}>{icon}</div>}
        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: subMessage ? 6 : 20, color: 'var(--text)' }}>{message}</div>
        {subMessage && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 20 }}>{subMessage}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btnStyle, flex: 1, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={onCancel}>取消</button>
          <button
            style={{ ...btnStyle, flex: danger ? 2 : 1, background: danger ? 'var(--color-danger)' : 'var(--color-correct,#227A59)', border: 'none' }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
