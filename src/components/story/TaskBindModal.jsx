/**
 * src/components/story/TaskBindModal.jsx
 * 祝福任務綁定彈窗
 * 由 StoryBridge.BIND_MODAL_OPEN 事件觸發開啟
 */

import React, { useState, useEffect } from 'react';
import { useGameStore }  from '@/core/state.js';
import { EventBus }      from '@/core/events.js';
import { Events }        from '@/core/event_types.js';
import { StoryBridge }   from '@/engines/story/StoryBridge.js';

export default function TaskBindModal() {
  const [visible,    setVisible]    = useState(false);
  const [optionRef,  setOptionRef]  = useState(null);

  const tasks = useGameStore(s =>
    (s.tasks ?? []).filter(t => !t.done && t.status !== 'completed')
  );

  // ── 監聽開啟事件 ──────────────────────────
  useEffect(() => {
    const unsub = EventBus.on(Events.Story.BIND_MODAL_OPEN, ({ optionRef: ref }) => {
      setOptionRef(ref);
      setVisible(true);
    });
    return () => unsub();
  }, []);

  if (!visible) return null;

  // ── 選擇處理 ─────────────────────────────
  const handleChoice = (taskId, choice) => {
    setVisible(false);
    StoryBridge.resolveEnchant(taskId, choice, optionRef);
  };

  return (
    <div style={maskStyle} onClick={() => handleChoice(null, 'skip')}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* 標題列 */}
        <div style={headStyle}>
          <span style={{ fontWeight: 700 }}>⚔️ 祝福試煉</span>
          <button style={closeXStyle} onClick={() => handleChoice(null, 'skip')}>✕</button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(88vh - 56px)' }}>

          {/* 說明 */}
          <p style={descStyle}>
            選擇一個現實任務施加祝福——完成它將為這段旅途注入力量。
          </p>

          {/* 快捷選項 */}
          <div style={quickRowStyle}>
            <button style={quickBtnStyle('#e8f5e9', '#2e7d32')}
                    onClick={() => handleChoice(null, 'random')}>
              🎲 隨機祝福
            </button>
            <button style={quickBtnStyle('#fff8e1', '#f57f17')}
                    onClick={() => handleChoice(null, 'later')}>
              📜 稍後再說
            </button>
            <button style={quickBtnStyle('#fce4ec', '#c62828')}
                    onClick={() => handleChoice(null, 'skip')}>
              🚫 放棄試煉
            </button>
          </div>

          {/* 分隔線 */}
          <div style={dividerStyle}>── 或選擇任務 ──</div>

          {/* 任務清單 */}
          {tasks.length === 0
            ? <p style={{ textAlign: 'center', color: 'var(--text-muted, #8c6e52)', fontSize: '0.85rem', padding: '12px 0' }}>
                目前沒有進行中的任務
              </p>
            : tasks.map(task => (
                <button
                  key={task.id}
                  style={taskItemStyle}
                  onClick={() => handleChoice(task.id, 'bind')}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main, #3e2723)', marginBottom: 2 }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #8c6e52)', display: 'flex', gap: 8 }}>
                    <span>📂 {task.cat}</span>
                    {task.attrs?.length > 0 && <span>🏷️ {task.attrs.join('、')}</span>}
                    <span>⭐ {task.importance ?? 1} / ⚡ {task.urgency ?? 1}</span>
                  </div>
                </button>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ── 樣式（沿用 CheckinModal 規範）────────────
const maskStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 9000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(3px)',
  padding: 16,
};
const modalStyle = {
  width: '100%', maxWidth: 400, maxHeight: '88vh',
  background: 'var(--bg-modal, #fdf5e6)',
  border: '2px solid var(--border-wood, #3e2723)',
  borderRadius: 18,
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};
const headStyle = {
  flexShrink: 0,
  background: 'var(--bg-modal-head, #3b2519)',
  color: 'var(--text-on-dark, #f5e6cf)',
  padding: '13px 16px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const closeXStyle = {
  background: 'transparent', border: 'none',
  color: 'var(--text-on-dark, #f5e6cf)',
  fontSize: '1rem', cursor: 'pointer',
};
const descStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-muted, #8c6e52)',
  marginBottom: 12,
  lineHeight: 1.5,
};
const quickRowStyle = {
  display: 'flex', gap: 8, marginBottom: 12,
};
const quickBtnStyle = (bg, color) => ({
  flex: 1,
  background: bg,
  border: `1px solid ${color}`,
  borderRadius: 10,
  padding: '8px 4px',
  fontSize: '0.78rem',
  fontWeight: 600,
  color,
  cursor: 'pointer',
  textAlign: 'center',
});
const dividerStyle = {
  textAlign: 'center',
  fontSize: '0.75rem',
  color: 'var(--text-ghost, #9C7B5B)',
  margin: '4px 0 12px',
};
const taskItemStyle = {
  width: '100%',
  background: 'var(--bg-box, rgba(0,0,0,0.035))',
  border: '1px solid var(--border, rgba(0,0,0,0.09))',
  borderRadius: 10,
  padding: '10px 12px',
  marginBottom: 8,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.15s',
};