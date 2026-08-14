import React, { useState, useMemo, useEffect } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import DailyReportModal from '@/task/components/DailyReportModal.jsx';
import TaskCard from '@/task/components/TaskCard.jsx';
import { toLocalDateStr, parseLocalDateOnly } from '@/task/utils/taskSort.js';
import { btnSmallStyle, emptyStyle } from '@/task/components/TaskStyles.js';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function historyItemDateStr(item) {
  const raw = item.doneTime || item.archivedDate || item.date;
  if (!raw) return null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  return toLocalDateStr(parseLocalDateOnly(raw) || raw);
}

export default function HistoryView({ taskHistory, onBackToList }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [skillIconMap, setSkillIconMap] = useState({});

  useEffect(() => {
    const unsub = EventBus.on(Events.Stats.SKILL_ICON_MAP_READY, setSkillIconMap);
    EventBus.emit(Events.Stats.REQUEST_SKILL_ICON_MAP);
    return unsub;
  }, []);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDayIndex = new Date(y, m, 1).getDay();
  const todayStr = toLocalDateStr(new Date());

  const { grid, activeDays, totalTasksMonth } = useMemo(() => {
    const countsMap = {};
    for (let i = 1; i <= daysInMonth; i++) {
      countsMap[toLocalDateStr(new Date(y, m, i))] = 0;
    }
    (taskHistory || []).forEach(item => {
      const ds = historyItemDateStr(item);
      if (ds && countsMap[ds] != null) countsMap[ds]++;
    });

    let active = 0;
    let total = 0;
    const cells = Array.from({ length: firstDayIndex }, () => null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = toLocalDateStr(new Date(y, m, i));
      const count = countsMap[dateStr] || 0;
      if (count > 0) active++;
      total += count;
      cells.push({ day: i, dateStr, count, isToday: dateStr === todayStr });
    }
    return { grid: cells, activeDays: active, totalTasksMonth: total };
  }, [taskHistory, y, m, daysInMonth, firstDayIndex, todayStr]);

  const dayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return (taskHistory || []).filter(item => historyItemDateStr(item) === selectedDate);
  }, [taskHistory, selectedDate]);

  const getColor = count => {
    if (count === 0) return 'var(--bg-box, rgba(0,0,0,0.035))';
    if (count <= 2) return 'var(--color-correct, #227A59)';
    if (count <= 5) return 'var(--color-warning, #f39c12)';
    return 'var(--color-danger, #c0392b)';
  };

  return (
    <div style={{ padding: 'var(--space-xs) var(--space-sm)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
        <button style={btnSmallStyle} onClick={() => { setCursor(new Date(y, m - 1, 1)); setSelectedDate(null); }}>◀</button>
        <span style={{ fontWeight: 700, fontSize: 'var(--font-title)' }}>{y}年{m + 1}月</span>
        <button style={btnSmallStyle} onClick={() => { setCursor(new Date(y, m + 1, 1)); setSelectedDate(null); }}>▶</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
        {onBackToList && (
          <button style={btnSmallStyle} onClick={onBackToList}>📋 任務列表</button>
        )}
        <button style={btnSmallStyle} onClick={() => setShowReport(true)}>📊 昨日戰報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
        {WEEKDAY_LABELS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
        {grid.map((cell, i) => {
          if (cell === null) return <div key={`e-${i}`} />;
          const isSelected = cell.dateStr === selectedDate;
          return (
            <div
              key={cell.dateStr}
              onClick={() => setSelectedDate(prev => prev === cell.dateStr ? null : cell.dateStr)}
              title={`${m + 1}/${cell.day}: 完成 ${cell.count} 項`}
              style={{
                aspectRatio: '1', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? 'var(--color-correct, #227A59)' : getColor(cell.count),
                border: cell.isToday ? '2px solid var(--text, #2c1a0e)' : '1px solid rgba(0,0,0,0.05)',
                color: isSelected || cell.count > 0 ? '#fff' : 'var(--text-ghost)',
                fontWeight: cell.isToday || isSelected ? 900 : 400,
                fontSize: 'var(--font-body)',
              }}
            >
              {cell.day}
              {cell.count > 0 && !isSelected && (
                <span style={{ fontSize: 'var(--font-caption)', marginTop: 1, opacity: 0.9 }}>{cell.count}</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-2)', marginBottom: 'var(--space-sm)' }}>
        這個月內，你點亮了 <b style={{ color: 'var(--color-gold-dark)' }}>{activeDays}</b> 天，完成了 <b style={{ color: 'var(--color-gold-dark)' }}>{totalTasksMonth}</b> 項任務。
      </div>

      <div style={{ borderTop: '1px dashed var(--border, rgba(0,0,0,0.09))', paddingTop: 'var(--space-sm)', flex: 1 }}>
        {selectedDate ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', marginBottom: 'var(--space-xs)' }}>{selectedDate} 的紀錄</div>
            {dayTasks.length === 0
              ? <div style={{ ...emptyStyle, fontSize: 'var(--font-title)', padding: 'var(--space-2xl) var(--space-lg)' }}>這天沒有完成紀錄</div>
              : dayTasks.map((t, i) => (
                <TaskCard key={`hist-${t.id}-${selectedDate}-${i}`} task={t} readOnly skillIconMap={skillIconMap} />
              ))
            }
          </>
        ) : (
          <div style={{ ...emptyStyle, fontSize: 'var(--font-title)', padding: 'var(--space-2xl) var(--space-lg)' }}>
            點選日期查看當天完成的任務
          </div>
        )}
      </div>

      {showReport && <DailyReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
