import React, { useState, useMemo, useEffect } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import DailyReportModal from '@/components/task/DailyReportModal.jsx';
import TaskCard from '@/components/task/TaskCard.jsx';
import { boxStyle, btnSmallStyle, emptyStyle } from '@/components/task/TaskStyles.js';

export default function HistoryView({ taskHistory }) {
  const [showReport, setShowReport] = useState(false);
  const [skillIconMap, setSkillIconMap] = useState({});
  useEffect(() => {
    const unsub = EventBus.on(Events.Stats.SKILL_ICON_MAP_READY, setSkillIconMap);
    EventBus.emit(Events.Stats.REQUEST_SKILL_ICON_MAP);
    return unsub;
  }, []);

  const heatmapData = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayIndex = new Date(y, m, 1).getDay();

    const counts = {};
    for (let i = 1; i <= daysInMonth; i++) counts[new Date(y, m, i).toDateString()] = 0;

    taskHistory.forEach(item => {
      const timestamp = item.doneTime || item.archivedDate || item.date;
      if (!timestamp) return;
      const d = new Date(timestamp);
      if (d.getFullYear() === y && d.getMonth() === m) {
        d.setHours(0, 0, 0, 0);
        counts[d.toDateString()]++;
      }
    });

    let activeDays = 0, totalTasksMonth = 0;
    const grid = Array.from({ length: firstDayIndex }, () => null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = new Date(y, m, i).toDateString();
      const count = counts[dateStr];
      if (count > 0) activeDays++;
      totalTasksMonth += count;
      grid.push({ day: i, count, isToday: i === today.getDate() });
    }
    return { m, grid, activeDays, totalTasksMonth };
  }, [taskHistory]);

  const getColor = count => {
    if (count === 0) return 'var(--bg-box, rgba(0,0,0,0.035))';
    if (count <= 2) return 'var(--color-correct, #227A59)';
    if (count <= 5) return 'var(--color-warning, #f39c12)';
    return 'var(--color-danger, #c0392b)';
  };

  return (
    <div style={{ padding: '15px 10px', animation: 'fadeIn 0.3s' }}>
      <div style={{ ...boxStyle, marginBottom: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>📅 本月冒險足跡 ({heatmapData.m + 1}月)</div>
          <button style={btnSmallStyle} onClick={() => setShowReport(true)}>📊 昨日戰報</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 12 }}>
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-ghost, #9C7B5B)' }}>{d}</div>
          ))}
          {heatmapData.grid.map((cell, i) => (
            cell === null ? <div key={`e-${i}`} /> : (
              <div key={`d-${cell.day}`}
                title={`${heatmapData.m + 1}/${cell.day}: 完成 ${cell.count} 項`}
                style={{ aspectRatio: '1', background: getColor(cell.count), borderRadius: 6, border: cell.isToday ? '2px solid var(--text, #2c1a0e)' : '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: cell.count === 0 ? 'var(--text-ghost)' : '#fff', filter: cell.count > 0 ? 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))' : 'none' }}>
                {cell.day}
              </div>
            )
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, fontSize: '0.65rem', color: 'var(--text-ghost)' }}>
          <span>少</span>
          {['var(--bg-box)', 'var(--color-correct)', 'var(--color-warning)', 'var(--color-danger)'].map((bg, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
          ))}
          <span>多</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', borderTop: '1px dashed var(--border)', paddingTop: 10, marginTop: 12 }}>
          這個月內，你點亮了 <b style={{ color: 'var(--color-gold-dark)' }}>{heatmapData.activeDays}</b> 天，完成了 <b style={{ color: 'var(--color-gold-dark)' }}>{heatmapData.totalTasksMonth}</b> 項任務。
        </div>
      </div>

      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)', margin: '0 5px 10px' }}>📋 任務明細</div>
      {taskHistory.length === 0
        ? <div style={emptyStyle}>📜<br />尚無冒險紀錄</div>
        : [...taskHistory].reverse().map((t, i) => (
          <TaskCard key={`hist-${t.id}-${i}`} task={t} readOnly skillIconMap={skillIconMap} />
        ))
      }
      {showReport && <DailyReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}