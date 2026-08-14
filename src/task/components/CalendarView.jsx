/* src/components/task/CalendarView.jsx */
import React, { useState, useMemo } from 'react';
import TaskCard from '@/task/components/TaskCard.jsx';
import { getOccurrenceDatesInRange, toLocalDateStr, resolveTaskForDate } from '@/task/utils/taskSort.js';
import { btnSmallStyle, emptyStyle } from '@/task/components/TaskStyles.js';

const WEEKDAY_LABELS = ['日','一','二','三','四','五','六'];

export default function CalendarView({ tasks, history = [], onOpenDetail, onToggle, onToggleSub, onIncrement, onRequestNewTask, onEdit, skillIconMap, onBackToList }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState(null);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const daysInMonth   = new Date(y, m + 1, 0).getDate();
  const firstDayIndex = new Date(y, m, 1).getDay();
  const monthStart    = new Date(y, m, 1);
  const monthEnd      = new Date(y, m, daysInMonth);
  const now           = new Date();
  const todayStr = toLocalDateStr(now);

  const occurrenceMap = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      getOccurrenceDatesInRange(t, monthStart, monthEnd).forEach(dateStr => {
        (map[dateStr] ??= []).push(t);
      });
    });
    return map;
  }, [tasks, y, m]);

  const grid = [];
  for (let i = 0; i < firstDayIndex; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  const handleDayClick = (dateStr, hasTasks) => {
    // 先選中該日，新增後下方列表會立刻顯示，不必再點一次
    setSelectedDate(dateStr);
    if (!hasTasks) onRequestNewTask(dateStr);
  };

  const selectedTasks = selectedDate
    ? (occurrenceMap[selectedDate] || []).map(t => resolveTaskForDate(t, selectedDate, history, todayStr))
    : [];

  return (
    <div style={{ padding: 'var(--space-xs) var(--space-sm)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
        <button style={btnSmallStyle} onClick={() => { setCursor(new Date(y, m - 1, 1)); setSelectedDate(null); }}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 'var(--font-title)' }}>{y}年{m + 1}月</span>
        <button style={btnSmallStyle} onClick={() => { setCursor(new Date(y, m + 1, 1)); setSelectedDate(null); }}>▶</button>
      </div>

      {onBackToList && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-xs)' }}>
          <button style={btnSmallStyle} onClick={onBackToList}>📋 任務列表</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
        {WEEKDAY_LABELS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
        {grid.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />;
          const dateStr = toLocalDateStr(new Date(y, m, d));
          const dayTasks   = occurrenceMap[dateStr] || [];
          const hasTasks   = dayTasks.length > 0;
          const isToday    = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          return (
            <div key={d}
              onClick={() => handleDayClick(dateStr, hasTasks)}
              style={{
                aspectRatio: '1', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? 'var(--color-correct, #227A59)' : 'var(--bg-box, rgba(0,0,0,0.035))',
                border: isToday ? '2px solid var(--text, #2c1a0e)' : '1px solid rgba(0,0,0,0.05)',
                color: isSelected ? '#fff' : 'var(--text, #2c1a0e)',
              }}>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: isToday ? 900 : 400 }}>{d}</span>
              {hasTasks && (
                <span style={{
                  marginTop: 2, minWidth: 6, height: 6, borderRadius: '50%',
                  background: isSelected ? '#fff' : 'var(--color-gold, #f5a623)',
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px dashed var(--border, rgba(0,0,0,0.09))', paddingTop: 'var(--space-sm)', flex: 1 }}>
        {selectedDate ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-body)' }}>{selectedDate}</span>
              <button style={btnSmallStyle} onClick={() => onRequestNewTask(selectedDate)}>＋ 新增任務</button>
            </div>
            {selectedTasks.length === 0
              ? <div style={{ ...emptyStyle, fontSize: 'var(--size-sm)', padding: 'var(--space-2xl) var(--space-lg)' }}>這天沒有任務</div>
              : selectedTasks.map(({ task: rt, readOnly }) => (
                  <TaskCard key={rt.id} task={rt}
                    onToggle={onToggle}
                    onOpenDetail={onOpenDetail}
                    onToggleSub={onToggleSub}
                    onIncrement={onIncrement}
                    onEdit={onEdit}
                    onEnterSelectMode={() => {}}
                    readOnly={readOnly}
                    skillIconMap={skillIconMap}
                  />
                ))
            }
          </>
        ) : (
          <div style={{ ...emptyStyle, fontSize: 'var(--font-title)', padding: 'var(--space-2xl) var(--space-lg)' }}>點選日期查看當天任務<br/><span style={{ fontSize: 'var(--font-body)' }}>空白日期點擊可直接新增</span></div>
        )}
      </div>
    </div>
  );
}