import React, { useEffect, useState } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { maskStyle, modalStyle, btnStyle } from '@/task/components/TaskStyles.js';

export default function DailyReportModal({ onClose }) {
  const [summary, setSummary] = useState(null);
  const [skillIconMap, setSkillIconMap] = useState({});

  useEffect(() => {
    const unsub = EventBus.on(Events.Task.HISTORY_SUMMARY_READY, setSummary);
    EventBus.emit(Events.Task.REQUEST_HISTORY_SUMMARY);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = EventBus.on(Events.Stats.SKILL_ICON_MAP_READY, setSkillIconMap);
    EventBus.emit(Events.Stats.REQUEST_SKILL_ICON_MAP);
    return unsub;
  }, []);

  if (summary === null) return null; // EventBus 為同步呼叫，此狀態理論上僅存在極短暫的一個 tick

  // 固定取「昨天」：今天 8/8 → 顯示並計算 8/7
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const report = Array.isArray(summary)
    ? (summary.find(d => d.date === yesterdayStr) || null)
    : null;

  const rankColor = { S: 'var(--color-gold)', A: 'var(--color-correct)', B: 'var(--color-warning)', C: 'var(--color-danger)' };
  const rankLabel = { S: '完美的一天', A: '出色的表現', B: '穩健推進', C: '充分休息' };

  if (!report) return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, padding: 'var(--space-lg)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 'var(--space-lg)' }}>尚無紀錄</div>
        <button style={{ ...btnStyle, width: '100%' }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, padding: 'var(--space-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', fontSize: 'var(--font-title)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>📊 昨日戰報 · {report.date}</div>
        <div style={{ textAlign: 'center', padding: 'var(--space-xs) 0' }}>
          <div style={{ fontSize: 'var(--size-lg)', fontWeight: 900, color: rankColor[report.rank] || 'var(--text)', lineHeight: 1, marginBottom: 'var(--space-xs)' }}>{report.rank}</div>
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)' }}>{rankLabel[report.rank] || ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', margin: 'var(--space-md) 0' }}>
          <div style={{ flex: 1, padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', background: 'var(--bg-box)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--size-sm)', fontWeight: 'bold', color: 'var(--color-gold)' }}>+{report.totalExp}</div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted)' }}>✨ 經驗值</div>
          </div>
          <div style={{ flex: 1, padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', background: 'var(--bg-box)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--size-sm)', fontWeight: 'bold', color: 'var(--text)' }}>{report.tasks.filter(t => t.status === 'completed').length}</div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted)' }}>📋 完成任務</div>
          </div>
        </div>
        {report.mvpTask && (
          <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-sm)' }}>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>昨日 MVP</div>
            <div style={{ fontWeight: 'bold' }}>👑 {report.mvpTask.title}</div>
          </div>
        )}
        {report.mainAttr && (
          <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>主力屬性</div>
            <div style={{ fontWeight: 'bold' }}>{skillIconMap[report.mainAttr] || '❓'} {report.mainAttr}</div>
          </div>
        )}
        <button style={{ ...btnStyle, width: '100%' }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}