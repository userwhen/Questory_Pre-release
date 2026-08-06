/* src/components/task/TaskDetailModal.jsx */
import React from 'react';
import {
  maskStyle, modalStyle, modalHeadStyle, closeXStyle, modalBodyStyle, modalFootStyle,
  btnStyle, checkStyle, progressTrackStyle, progressBarStyle, progressTextStyle, catPillStyle,
} from '@/task/components/TaskStyles.js';
import { isTaskOverdue } from '@/task/utils/taskSort.js';

const RECURRENCE_UNIT_LABEL = { day: '天', week: '週', month: '月', year: '年' };
const RECUR_WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function describeRecurrence(recurrence) {
  if (!recurrence) return null;
  const days = recurrence.days || [];
  if (recurrence.unit === 'week' && days.length > 0) {
    return `每週${days.map(d => RECUR_WEEKDAY_LABELS[d]).join('、')}`;
  }
  return `每 ${recurrence.interval || 1} ${RECURRENCE_UNIT_LABEL[recurrence.unit] || '天'}`;
}

export default function TaskDetailModal({ task, onClose, onEdit, onToggle, onToggleSub }) {
  const isOverdue = isTaskOverdue(task);
  const subsTotal = task.subs?.length || 0;
  const countPct = task.type === 'count' ? Math.min(100, ((task.curr || 0) / (task.target || 1)) * 100) : 0;
  const recurrenceText = describeRecurrence(task.recurrence);

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.title}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button style={closeXStyle} onClick={() => { onEdit(task); onClose(); }}>⚙️</button>
            <button style={closeXStyle} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={modalBodyStyle}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {task.cat && <span style={catPillStyle}>{task.cat}</span>}
            {isOverdue && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'var(--color-danger, #c0392b)', color: '#fff', fontWeight: 700 }}>⏰ 逾期</span>}
            {task.pinned && <span style={{ fontSize: '0.85rem' }}>📌</span>}
            {task.enchant?.boundAt && <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 700 }}>✦ 祝福</span>}
          </div>

          {(task.narrativeText || task.desc) && (
            <p style={{ margin: '0 0 16px', lineHeight: 1.6, color: 'var(--text-2, #5c3d2e)', fontStyle: task.narrativeText ? 'italic' : 'normal' }}>
              {task.narrativeText || task.desc}
            </p>
          )}

          {task.type === 'count' ? (
            <div style={{ marginBottom: 16 }}>
              <div style={progressTrackStyle}>
                <div style={{ ...progressBarStyle, width: `${countPct}%` }} />
                <span style={progressTextStyle}>{task.curr || 0} / {task.target}</span>
              </div>
            </div>
          ) : subsTotal > 0 && (
            <div style={{ marginBottom: 16 }}>
              {task.subs.map((sub, idx) => (
                <div key={idx}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => onToggleSub(task.id, idx)}>
                  <div style={{ width: 18, height: 18, border: `1px solid ${sub.done ? 'var(--color-correct, #227A59)' : 'var(--text-ghost, #9C7B5B)'}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: sub.done ? 'var(--color-correct, #227A59)' : 'transparent' }}>
                    {sub.done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '0.9rem', textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.5 : 1 }}>{sub.text}</span>
                </div>
              ))}
            </div>
          )}

          {task.location && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>📍 {task.location}</div>
          )}
          {task.startDate && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>🚀 起始日：{task.startDate}</div>
          )}
          {recurrenceText && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>🔁 {recurrenceText}</div>
          )}
          {task.deadline && (
            <div style={{ fontSize: '0.85rem', color: isOverdue ? 'var(--color-danger, #c0392b)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400, marginBottom: 8 }}>
              📅 {task.deadline}{isOverdue ? '（已逾期）' : ''}
            </div>
          )}
        </div>

        <div style={modalFootStyle}>
          <button
            style={{
              ...btnStyle, flex: 1,
              background: task.done ? 'var(--bg-card)' : 'var(--color-correct)',
              color: task.done ? 'var(--text)' : '#fff',
              border: task.done ? '1.5px solid var(--border-input, #d5c5a8)' : 'none',
              boxShadow: task.done ? 'none' : btnStyle.boxShadow,
            }}
            onClick={() => { onToggle(task.id); onClose(); }}
          >
            {task.done ? '↩️ 取消完成' : '✓ 標記完成'}
          </button>        </div>
      </div>
    </div>
  );
}