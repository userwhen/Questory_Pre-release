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

  const report = summary[0] || null;

  const rankColor = { S: 'var(--color-gold)', A: 'var(--color-correct)', B: 'var(--color-warning)', C: 'var(--color-danger)' };
  const rankLabel = { S: '完美的一天', A: '出色的表現', B: '穩健推進', C: '充分休息' };

  if (!report) return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, padding: 20, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 20 }}>尚無紀錄</div>
        <button style={{ ...btnStyle, width: '100%' }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, marginBottom: 15 }}>📊 昨日戰報 · {report.date}</div>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: rankColor[report.rank] || 'var(--text)', lineHeight: 1, marginBottom: 4 }}>{report.rank}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{rankLabel[report.rank] || ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, margin: '15px 0' }}>
          <div style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--bg-box)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>+{report.totalExp}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>✨ 經驗值</div>
          </div>
          <div style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--bg-box)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text)' }}>{report.tasks.filter(t => t.status === 'completed').length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📋 完成任務</div>
          </div>
        </div>
        {report.mvpTask && (
          <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>昨日 MVP</div>
            <div style={{ fontWeight: 'bold' }}>👑 {report.mvpTask.title}</div>
          </div>
        )}
        {report.mainAttr && (
          <div style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>主力屬性</div>
            <div style={{ fontWeight: 'bold' }}>{skillIconMap[report.mainAttr] || '❓'} {report.mainAttr}</div>
          </div>
        )}
        <button style={{ ...btnStyle, width: '100%' }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}