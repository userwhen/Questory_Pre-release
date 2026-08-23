import React from 'react';
import {
  cardStyle, checkStyle, catPillStyle,
  cardZoneLeftStyle, cardZoneRightStyle, cardMiddleZoneStyle, cardHeaderStyle, cardExpandedStyle,
  progressTrackStyle, progressBarStyle, progressTextStyle,
} from '@/task/components/TaskStyles.js';
import { isTaskOverdue } from '@/task/utils/taskSort.js';
import { usePressGesture } from '@/hooks/usePressGesture.js';

// === 循環任務說明 helper ===
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

// ── 三分區架構：左（完成/勾選）、中（標題＋詳情）、右（拖曳把手，僅勾選模式）
// 卡片固定展開；長按中區進入編輯；水平滑動達閾值後帶滑出動畫再進勾選模式
// 手勢判定（長按/滑動閾值）已抽到 usePressGesture，Skill/Ach 卡片共用同一套手感，這裡純粹搬家。
export default function TaskCard({
  task, onToggle, onToggleSub, onIncrement,
  isSelectMode, isSelected, onToggleSelect, readOnly,
  onEnterSelectMode, onEdit, onDragStart, onDragMove, onDragEnd, skillIconMap,
}) {
  const { cardRef, skipClick, longPressFired, pressHandlers } = usePressGesture({
    onLongPress: () => onEdit && onEdit(task),
    onSwipeSelect: () => onEnterSelectMode && onEnterSelectMode(task.id),
    disabled: readOnly || isSelectMode,
  });

  const isOverdue = isTaskOverdue(task);
  const recurrenceText = describeRecurrence(task.recurrence);

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

  return (
    <div
      ref={cardRef}
      data-task-id={task.id}
      style={{
        ...cardStyle,
        opacity: task.done ? 0.75 : 1,
        borderTop: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderTop,
        borderRight: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderRight,
        borderBottom: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderBottom,
        borderLeft: isSelected ? '2px solid var(--color-correct, #227A59)' : `4px solid ${priorityColor}`,
      }}
      {...pressHandlers}
    >
      {/* 左 zone：完成 / 選取 */}
      {!readOnly && (
        <div
          style={cardZoneLeftStyle}
          onClick={() => {
            if (skipClick.current) { skipClick.current = false; return; }
            if (longPressFired.current) { longPressFired.current = false; return; }
            if (isSelectMode) { onToggleSelect(task.id); return; }
            if (task.type === 'count' && !task.done) onIncrement(task.id);
            else onToggle(task.id);
          }}
        >
          {isSelectMode ? (
            <input type="checkbox" readOnly checked={isSelected} style={{ transform: 'scale(1.3)', accentColor: 'var(--color-correct, #227A59)' }} />
          ) : (
            <div style={{ ...checkStyle, background: task.done ? 'var(--color-correct, #227A59)' : 'var(--bg-card, #fff)', borderColor: task.done ? 'var(--color-correct, #227A59)' : 'var(--border-input, #d5c5a8)' }}>
              {task.done && <span style={{ color: '#fff', fontSize: 'var(--font-body)', fontWeight: 900 }}>✓</span>}
            </div>
          )}
        </div>
      )}

      {/* 中 zone：標題（名稱＋分類）＋ 固定展開詳情 */}
      <div style={cardMiddleZoneStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 700,
              fontSize: 'var(--font-body)',
              color: 'var(--text, #2c1a0e)',
              textDecoration: task.done ? 'line-through' : 'none',
              wordBreak: 'break-word',
            }}>
              {task.title}
            </span>
            {task.cat && <span style={catPillStyle}>{task.cat}</span>}
          </div>

          {task.type === 'count' && (
            <div style={{ marginTop: 'var(--space-xs)' }}>
              <div style={progressTrackStyle}>
                <div style={{ ...progressBarStyle, width: `${countPct}%` }} />
                <span style={progressTextStyle}>{task.curr || 0} / {task.target}</span>
              </div>
            </div>
          )}

          {task.type !== 'count' && subsTotal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 'var(--space-xs)', paddingRight: 'var(--space-sm)' }}>
              {task.subs.map((_, i) => (
                <React.Fragment key={i}>
                  <div style={{ width: 'var(--size-xs)', height: 'var(--size-xs)', borderRadius: '50%', background: i < subsDone ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  {i < subsTotal - 1 && <div style={{ flex: 1, height: 6, borderRadius: 3, background: i < subsDone - 1 ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.1)' }} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* 固定展開的詳情區：其餘小標放這裡 */}
        {!isSelectMode && (
          <div style={cardExpandedStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
              {isOverdue && <span style={{ fontSize: 'var(--font-caption)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'var(--color-danger, #c0392b)', color: '#fff', fontWeight: 700 }}>⏰ 逾期</span>}
              {task.recurrence && <span style={{ fontSize: 'var(--font-body)' }}>🔁</span>}
              {task.pinned && <span style={{ fontSize: 'var(--font-body)' }}>📌</span>}
              {task.enchant?.boundAt && <span style={{ fontSize: 'var(--font-caption)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'linear-gradient(135deg,var(--color-violet,#7c3aed),var(--color-rarity-sr,#a855f7))', color: '#fff', fontWeight: 700, letterSpacing: '0.04em' }}>✦ 祝福</span>}
              {task.attrs?.length > 0 && task.attrs.map(a => (
                <span key={a} style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)' }}>
                  {skillIconMap?.[a] || '❓'} {a}
                </span>
              ))}
            </div>

            {(task.narrativeText || task.desc) && (
              <p style={{ margin: '0 0 var(--space-xs)', lineHeight: 1.5, color: 'var(--text-2, #5c3d2e)', opacity: 0.85, fontStyle: task.narrativeText ? 'italic' : 'normal' }}>
                {task.narrativeText || task.desc}
              </p>
            )}

            {task.type !== 'count' && subsTotal > 0 && (
              <div style={{ marginBottom: 'var(--space-xs)' }}>
                {task.subs.map((sub, idx) => (
                  <div key={idx}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)', cursor: readOnly ? 'default' : 'pointer' }}
                    onClick={() => { if (!readOnly) onToggleSub(task.id, idx); }}>
                    <div style={{ width: 'var(--size-xs)', height: 'var(--size-xs)', border: `1px solid ${sub.done ? 'var(--color-correct, #227A59)' : 'var(--text-ghost, #9C7B5B)'}`, borderRadius: 'var(--radius-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: sub.done ? 'var(--color-correct, #227A59)' : 'transparent' }}>
                      {sub.done && <span style={{ color: '#fff', fontSize: 'var(--font-caption)', fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 'var(--font-body)', textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.5 : 1 }}>{sub.text}</span>
                  </div>
                ))}
              </div>
            )}

            {task.location && <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>📍 {task.location}</div>}
            {task.startDate && <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>🚀 起始日：{task.startDate}</div>}
            {recurrenceText && <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>🔁 {recurrenceText}</div>}
            {task.deadline && (
              <div style={{ fontSize: 'var(--font-body)', color: isOverdue ? 'var(--color-danger, #c0392b)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400, marginBottom: 'var(--space-xs)' }}>
                📅 {task.deadline}{isOverdue ? '（已逾期）' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右 zone：勾選模式才顯示拖曳把手（一般模式長按編輯，不再放設定鈕） */}
      {!readOnly && isSelectMode && (
        <div style={cardZoneRightStyle}>
          <span
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onDragStart && onDragStart(task.id); }}
            onPointerMove={e => onDragMove && onDragMove(e)}
            onPointerUp={e => { e.currentTarget.releasePointerCapture(e.pointerId); onDragEnd && onDragEnd(); }}
            onPointerCancel={() => onDragEnd && onDragEnd()}
            style={{ cursor: 'grab', color: 'var(--text-ghost)', fontSize: 'var(--font-title)', touchAction: 'none' }}
          >☰</span>
        </div>
      )}
    </div>
  );
}