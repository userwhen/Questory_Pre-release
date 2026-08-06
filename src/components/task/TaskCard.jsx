import React, { useState, useRef } from 'react';
import {
  cardStyle, cardRowStyle, checkStyle, catPillStyle,
  progressTrackStyle, progressBarStyle, progressTextStyle,
} from '@/components/task/TaskStyles.js';
import { isTaskOverdue } from '@/utils/taskSort.js';

// === 新增：循環任務說明 helper ===
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
// ===============================

const LONG_PRESS_MS = 600;
const MOVE_CANCEL_PX = 10;

export default function TaskCard({ task, onToggle, onOpenDetail, onToggleSub, onIncrement, isSelectMode, isSelected, onToggleSelect, readOnly, onLongPress, onEdit, onDragStart, onDragMove, onDragEnd, skillIconMap }) {
  const [expanded, setExpanded] = useState(false); // 僅歷史頁（readOnly）卡片使用
  const pressTimer = useRef(null);
  const pressOrigin = useRef({ x: 0, y: 0 });

  const isOverdue = isTaskOverdue(task);
  const recurrenceText = describeRecurrence(task.recurrence); // 這裡現在抓得到函式了

  const priorityColor = (() => {
    if (isOverdue) return 'var(--color-danger, #c0392b)';
    const i = task.importance || 1, u = task.urgency || 1;
    if (i >= 3 && u >= 3) return 'var(--color-danger, #c0392b)';
    if (i >= 3) return 'var(--color-info, #2980b9)';
    if (u >= 3) return 'var(--color-warning, #f39c12)';
    return 'var(--border-input, #d5c5a8)';
  })();

  const subsDone = task.subs?.filter(s => s.done).length || 0;
  const subsTotal = task.subs?.length || 0;
  const countPct = task.type === 'count' ? Math.min(100, ((task.curr || 0) / (task.target || 1)) * 100) : 0;

  const clearPressTimer = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const handlePointerDown = (e) => {
    if (readOnly || isSelectMode) return;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => onLongPress(task.id), LONG_PRESS_MS);
  };
  const handlePointerMove = (e) => {
    if (!pressTimer.current) return;
    const dx = Math.abs(e.clientX - pressOrigin.current.x);
    const dy = Math.abs(e.clientY - pressOrigin.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearPressTimer();
  };
  const handlePointerUp = clearPressTimer;

  const handleCardClick = () => {
    if (isSelectMode) { onToggleSelect(task.id); return; }
    setExpanded(e => !e); // 點擊卡片：原地展開/收合，歷史頁跟一般清單共用同一套
  };

  return (
    <div data-task-id={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 10 }}>
      {isSelectMode && !readOnly && (
        <div onClick={() => onToggleSelect(task.id)} style={{ padding: '0 5px', cursor: 'pointer' }}>
          <input type="checkbox" readOnly checked={isSelected} style={{ transform: 'scale(1.3)', accentColor: 'var(--color-correct, #227A59)' }} />
        </div>
      )}
      <div
        style={{
          ...cardStyle, flex: 1, marginBottom: 0, opacity: task.done ? 0.75 : 1,
          borderTop: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderTop,
          borderRight: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderRight,
          borderBottom: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderBottom,
          borderLeft: isSelected ? '2px solid var(--color-correct, #227A59)' : `4px solid ${priorityColor}`,
        }}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div style={cardRowStyle}>
          {/* 1. 左側：打勾按鈕 */}
          {!readOnly && (
            <div
              style={{ ...checkStyle, background: task.done ? 'var(--color-correct, #227A59)' : 'var(--bg-card, #fff)', borderColor: task.done ? 'var(--color-correct, #227A59)' : 'var(--border-input, #d5c5a8)' }}
              onClick={e => {
                e.stopPropagation();
                if (task.type === 'count' && !task.done) onIncrement(task.id);
                else onToggle(task.id);
              }}
            >
              {task.done && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
            </div>
          )}

          {/* 2. 中間：標題與進度條區塊 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text, #2c1a0e)', textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                {task.title}
              </span>
              {task.cat && <span style={catPillStyle}>{task.cat}</span>}
              {isOverdue && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, background: 'var(--color-danger, #c0392b)', color: '#fff', fontWeight: 700 }}>⏰ 逾期</span>}
              {task.importance >= 3 && <span style={{ fontSize: '0.8rem' }}>🔥</span>}
              {task.urgency >= 3 && <span style={{ fontSize: '0.8rem' }}>⚡</span>}
              {task.recurrence && <span style={{ fontSize: '0.8rem' }}>🔁</span>}
              {task.attrs?.length > 0 && task.attrs.map(a => (
                <span key={a} style={{ fontSize: '0.8rem' }} title={a}>{skillIconMap?.[a] || '❓'}</span>
              ))}
              {task.pinned && <span style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>📌</span>}
              {task.enchant?.boundAt && <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: 4, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontWeight: 700, letterSpacing: '0.04em' }}>✦ 祝福</span>}
            </div>

            {task.type === 'count' && (
              <div style={{ marginTop: 5 }}>
                <div style={progressTrackStyle}>
                  <div style={{ ...progressBarStyle, width: `${countPct}%` }} />
                  <span style={progressTextStyle}>{task.curr || 0} / {task.target}</span>
                </div>
              </div>
            )}

            {task.type !== 'count' && subsTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
                {task.subs.map((_, i) => (
                  <React.Fragment key={i}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: i < subsDone ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
                    {i < subsTotal - 1 && <div style={{ flex: 1, height: 3, background: i < subsDone - 1 ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.1)' }} />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* 3. 右側：齒輪與拖曳把手 */}
          {!readOnly && (
            isSelectMode ? (
              <span
                onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); onDragStart && onDragStart(task.id); }}
                onPointerMove={e => { e.stopPropagation(); onDragMove && onDragMove(e); }}
                onPointerUp={e => { e.stopPropagation(); e.currentTarget.releasePointerCapture(e.pointerId); onDragEnd && onDragEnd(); }}
                onPointerCancel={e => { e.stopPropagation(); onDragEnd && onDragEnd(); }}
                style={{ cursor: 'grab', color: 'var(--text-ghost)', fontSize: '1.1rem', flexShrink: 0, touchAction: 'none', padding: '0 2px' }}
              >☰</span>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onEdit && onEdit(task); }}
                style={{ background: 'transparent', border: 'none', fontSize: '1rem', flexShrink: 0, opacity: 0.5, cursor: 'pointer', padding: '0 2px' }}
              >⚙️</button>
            )
          )}
        </div>

        {/* 4. 原地展開內容與詳情連結 */}
        {expanded && (
          <div style={{ paddingTop: 10, marginTop: 10, borderTop: '1px dashed var(--border, rgba(0,0,0,0.09))', paddingLeft: 34, fontSize: '0.9rem' }}>
            {task.attrs?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                {task.attrs.map(a => (
                  <span key={a} style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8c6e52)' }}>
                    {skillIconMap?.[a] || '❓'} {a}
                  </span>
                ))}
              </div>
            )}
            {(task.narrativeText || task.desc) && (
              <p style={{ margin: '0 0 10px', lineHeight: 1.5, color: 'var(--text-2, #5c3d2e)', opacity: 0.85, fontStyle: task.narrativeText ? 'italic' : 'normal' }}>
                {task.narrativeText || task.desc}
              </p>
            )}

            {task.type !== 'count' && subsTotal > 0 && (
              <div style={{ marginBottom: 10 }}>
                {task.subs.map((sub, idx) => (
                  <div key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: readOnly ? 'default' : 'pointer' }}
                    onClick={e => { e.stopPropagation(); if (!readOnly) onToggleSub(task.id, idx); }}>
                    <div style={{ width: 16, height: 16, border: `1px solid ${sub.done ? 'var(--color-correct, #227A59)' : 'var(--text-ghost, #9C7B5B)'}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: sub.done ? 'var(--color-correct, #227A59)' : 'transparent' }}>
                      {sub.done && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '0.85rem', textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.5 : 1 }}>{sub.text}</span>
                  </div>
                ))}
              </div>
            )}

            {task.location && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>📍 {task.location}</div>}
            {task.startDate && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>🚀 起始日：{task.startDate}</div>}
            {recurrenceText && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>🔁 {recurrenceText}</div>}
            {task.deadline && (
              <div style={{ fontSize: '0.8rem', color: isOverdue ? 'var(--color-danger, #c0392b)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400, marginBottom: 6 }}>
                📅 {task.deadline}{isOverdue ? '（已逾期）' : ''}
              </div>
            )}

            {!readOnly && (
              <span
                onClick={e => { e.stopPropagation(); onOpenDetail && onOpenDetail(task); }}
                style={{ fontSize: '0.75rem', color: 'var(--color-info, #2980b9)', cursor: 'pointer' }}
              >完整詳情 ›</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}