import React, { useState, useRef, useEffect } from 'react';
import {
  cardStyle, checkStyle, catPillStyle,
  cardZoneLeftStyle, cardZoneRightStyle, cardMiddleZoneStyle, cardHeaderStyle, cardExpandedStyle,
  progressTrackStyle, progressBarStyle, progressTextStyle,
} from '@/task/components/TaskStyles.js';
import { isTaskOverdue } from '@/task/utils/taskSort.js';

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

// ── 三分區架構：左（完成/勾選）、中（標題列＋展開內容）、右（編輯/拖曳），
//    在 DOM 上是彼此獨立的兄弟節點，不是巢狀在同一層。
//    左右兩個 zone 只用 onClick（不掛 pointer handler），所以水平滑動的
//    pointer handler 可以直接掛在最外層卡片、涵蓋整張卡，不會像巢狀結構
//    那樣一旦 setPointerCapture 就吃掉子元素的 click——這裡也刻意不用
//    setPointerCapture，touchAction:'pan-y' 已經夠讓手勢不被原生捲動搶走。
//    展開內容（子任務列表等）是標題列的兄弟區塊，天生就摸不到滑動判斷，
//    子任務點擊永遠不會被滑動邏輯干擾。
const MOVE_CANCEL_PX = 10;
const SWIPE_THRESHOLD_PX = 56; // 水平滑動超過此距離 → 進入勾選模式

export default function TaskCard({ task, onToggle, onOpenDetail, onToggleSub, onIncrement, isSelectMode, isSelected, onToggleSelect, readOnly, onEnterSelectMode, onEdit, onDragStart, onDragMove, onDragEnd, skillIconMap }) {
  const [expanded, setExpanded] = useState(false);
  const swipeOrigin = useRef({ x: 0, y: 0 });
  const swipeArmed = useRef(false);
  const skipClick = useRef(false);

  // 進勾選模式時把卡片鎖起來：自動收合，展開內容（含子任務列表）整個不渲染，
  // 不用再逐一幫每個內部控制項補 isSelectMode 判斷
  useEffect(() => {
    if (isSelectMode) setExpanded(false);
  }, [isSelectMode]);

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

  // 水平滑動（左或右，範圍涵蓋整張卡片，含左右兩個 zone）→ 勾選模式；
  // 點擊標題列 → 展開/收合（或勾選模式下切換選取）
  // 注意：這裡刻意不呼叫 setPointerCapture——touchAction:'pan-y' 已經足夠避免手機上
  // 被原生垂直捲動搶走手勢；capture 才是真正會害左右 zone 的 click 被吃掉的元兇。
  const handlePointerDown = (e) => {
    if (readOnly || isSelectMode) return;
    swipeOrigin.current = { x: e.clientX, y: e.clientY };
    swipeArmed.current = true;
    skipClick.current = false;
  };
  const handlePointerMove = (e) => {
    if (!swipeArmed.current) return;
    const dx = e.clientX - swipeOrigin.current.x;
    const dy = e.clientY - swipeOrigin.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > MOVE_CANCEL_PX) {
      swipeArmed.current = false; // 垂直滾動優先
      return;
    }
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      swipeArmed.current = false;
      skipClick.current = true;
      onEnterSelectMode && onEnterSelectMode(task.id);
    }
  };
  const handlePointerUp = () => { swipeArmed.current = false; };
  const handlePointerCancel = () => { swipeArmed.current = false; }; // 手勢被系統中斷（例如轉為原生捲動）時也要重置，否則狀態卡住

  const handleHeaderClick = () => {
    if (skipClick.current) { skipClick.current = false; return; }
    if (isSelectMode) { onToggleSelect(task.id); return; }
    setExpanded(e => !e);
  };

  return (
    <div
      data-task-id={task.id}
      style={{
        ...cardStyle,
        opacity: task.done ? 0.75 : 1,
        borderTop: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderTop,
        borderRight: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderRight,
        borderBottom: isSelected ? '2px solid var(--color-correct, #227A59)' : cardStyle.borderBottom,
        borderLeft: isSelected ? '2px solid var(--color-correct, #227A59)' : `4px solid ${priorityColor}`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* 左 zone：一般模式＝完成/增量，勾選模式＝選取（同一個位置換皮膚，不是兩顆按鈕疊在一起） */}
      {!readOnly && (
        <div
          style={cardZoneLeftStyle}
          onClick={() => {
            if (skipClick.current) { skipClick.current = false; return; } // 剛完成一次滑動，這次點擊不算數
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

      {/* 中 zone：標題列（掛滑動手勢）＋ 展開內容（獨立區塊，不掛滑動手勢） */}
      <div style={cardMiddleZoneStyle}>
        <div
          style={cardHeaderStyle}
          onClick={handleHeaderClick}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)', textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
              {task.title}
            </span>
            {task.cat && <span style={catPillStyle}>{task.cat}</span>}
            {isOverdue && <span style={{ fontSize: 'var(--font-caption)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'var(--color-danger, #c0392b)', color: '#fff', fontWeight: 700 }}>⏰ 逾期</span>}
            {task.recurrence && <span style={{ fontSize: 'var(--font-body)' }}>🔁</span>}
            {task.attrs?.length > 0 && task.attrs.map(a => (
              <span key={a} style={{ fontSize: 'var(--font-body)' }} title={a}>{skillIconMap?.[a] || '❓'}</span>
            ))}
            {task.pinned && <span style={{ fontSize: 'var(--font-body)', marginLeft: 'auto' }}>📌</span>}
            {task.enchant?.boundAt && <span style={{ fontSize: 'var(--font-caption)', padding: '1px 5px', borderRadius: 'var(--radius-xs)', background: 'linear-gradient(135deg,var(--color-violet,#7c3aed),var(--color-rarity-sr,#a855f7))', color: '#fff', fontWeight: 700, letterSpacing: '0.04em' }}>✦ 祝福</span>}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 'var(--space-xs)' }}>
              {task.subs.map((_, i) => (
                <React.Fragment key={i}>
                  <div style={{ width: 'var(--size-xs)', height: 'var(--size-xs)', borderRadius: '50%', background: i < subsDone ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  {i < subsTotal - 1 && <div style={{ flex: 1, height: 3, background: i < subsDone - 1 ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.1)' }} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {expanded && !isSelectMode && (
          <div style={cardExpandedStyle}>
            {task.attrs?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                {task.attrs.map(a => (
                  <span key={a} style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)' }}>
                    {skillIconMap?.[a] || '❓'} {a}
                  </span>
                ))}
              </div>
            )}
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

            {!readOnly && (
              <span
                onClick={() => onOpenDetail && onOpenDetail(task)}
                style={{ fontSize: 'var(--font-caption)', color: 'var(--color-info, #2980b9)', cursor: 'pointer' }}
              >完整詳情 ›</span>
            )}
          </div>
        )}
      </div>

      {/* 右 zone：一般模式＝輕點開編輯（不用長按），勾選模式＝拖曳排序 */}
      {!readOnly && (
        <div style={cardZoneRightStyle}>
          {isSelectMode ? (
            <span
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onDragStart && onDragStart(task.id); }}
              onPointerMove={e => onDragMove && onDragMove(e)}
              onPointerUp={e => { e.currentTarget.releasePointerCapture(e.pointerId); onDragEnd && onDragEnd(); }}
              onPointerCancel={() => onDragEnd && onDragEnd()}
              style={{ cursor: 'grab', color: 'var(--text-ghost)', fontSize: 'var(--font-title)', touchAction: 'none' }}
            >☰</span>
          ) : (
            <span
              onClick={() => {
                if (skipClick.current) { skipClick.current = false; return; }
                onEdit && onEdit(task);
              }}
              style={{ cursor: 'pointer', color: 'var(--text-ghost)', fontSize: 'var(--font-title)' }}
            >⚙️</span>
          )}
        </div>
      )}
    </div>
  );
}
