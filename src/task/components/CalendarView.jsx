/* src/components/task/CalendarView.jsx */
import React, { useState, useMemo } from 'react';
import TaskCard from '@/task/components/TaskCard.jsx';
import { getOccurrenceDatesInRange, toLocalDateStr, resolveTaskForDate } from '@/task/utils/taskSort.js';
import { btnSmallStyle, emptyStyle } from '@/task/components/TaskStyles.js';

const WEEKDAY_LABELS = ['日','一','二','三','四','五','六'];

export default function CalendarView({ tasks, history = [], onOpenDetail, onToggle, onToggleSub, onIncrement, onRequestNewTask, onEdit, skillIconMap }) {
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
    if (!hasTasks) { onRequestNewTask(dateStr); return; }
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  };

  const selectedTasks = selectedDate
    ? (occurrenceMap[selectedDate] || []).map(t => resolveTaskForDate(t, selectedDate, history, todayStr))
    : [];

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button style={btnSmallStyle} onClick={() => { setCursor(new Date(y, m - 1, 1)); setSelectedDate(null); }}>◀</button>
        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{y}年{m + 1}月</span>
        <button style={btnSmallStyle} onClick={() => { setCursor(new Date(y, m + 1, 1)); setSelectedDate(null); }}>▶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {WEEKDAY_LABELS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-ghost, #9C7B5B)' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
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
                aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? 'var(--color-correct, #227A59)' : 'var(--bg-box, rgba(0,0,0,0.035))',
                border: isToday ? '2px solid var(--text, #2c1a0e)' : '1px solid rgba(0,0,0,0.05)',
                color: isSelected ? '#fff' : 'var(--text, #2c1a0e)',
              }}>
              <span style={{ fontSize: '0.85rem', fontWeight: isToday ? 900 : 400 }}>{d}</span>
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

      <div style={{ borderTop: '1px dashed var(--border, rgba(0,0,0,0.09))', paddingTop: 12, flex: 1 }}>
        {selectedDate ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedDate}</span>
              <button style={btnSmallStyle} onClick={() => onRequestNewTask(selectedDate)}>＋ 新增任務</button>
            </div>
            {selectedTasks.length === 0
              ? <div style={{ ...emptyStyle, fontSize: '1.5rem', padding: '30px 20px' }}>這天沒有任務</div>
              : selectedTasks.map(({ task: rt, readOnly }) => (
                  <TaskCard key={rt.id} task={rt}
                    onToggle={onToggle}
                    onOpenDetail={onOpenDetail}
                    onToggleSub={onToggleSub}
                    onIncrement={onIncrement}
                    onEdit={onEdit}
                    onLongPress={() => {}}
                    readOnly={readOnly}
                    skillIconMap={skillIconMap}
                  />
                ))
            }
          </>
        ) : (
          <div style={{ ...emptyStyle, fontSize: '1.2rem', padding: '30px 20px' }}>點選日期查看當天任務<br/><span style={{ fontSize: '0.85rem' }}>空白日期點擊可直接新增</span></div>
        )}
      </div>
    </div>
  );
}