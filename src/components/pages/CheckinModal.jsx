import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import Modal from '@/components/ui/Modal.jsx';

export default function CheckinModal({ onClose }) {
  const { checkin, loginStreak, bag } = useGameStore(s => ({
    checkin:    s.checkin    ?? { month: 0, days: [], lastClaimedWeek: 0, claimedMonth: false },
    loginStreak: s.loginStreak ?? 0,
    bag:        s.bag        ?? [],
  }));
  const { run } = useRequestAction();

  const [daysInMonth, setDaysInMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  });

  useEffect(() => {
    const unsub = EventBus.on(Events.Checkin.SESSION_READY, ({ daysInMonth }) => {
      setDaysInMonth(daysInMonth);
    });
    EventBus.emit(Events.Checkin.REQUEST_INIT_SESSION);
    return unsub;
  }, []);

  const today         = new Date().getDate();
  const streakProgress = loginStreak % 7;
  const canClaimWeek  = loginStreak > 0 && loginStreak % 7 === 0 && checkin.lastClaimedWeek !== loginStreak;
  const makeupTickets = bag.find(i => i.id === 'sys_makeup_ticket')?.count ?? 0;
  const checkedCount  = (checkin.days ?? []).filter(Boolean).length;
  const isFullMonth   = checkedCount === daysInMonth;

  const handleCheckIn = () => run(Events.Checkin.REQUEST_CHECKIN_TODAY, Events.Checkin.RESULT, {}, {
    successMsg: '✅ 簽到成功！獲得 50 💰',
    timeoutMsg: '❌ 簽到逾時，請稍後再試',
  });

  const handleMakeup = (idx) => run(Events.Checkin.REQUEST_MAKEUP, Events.Checkin.RESULT, { dayIdx: idx }, {
    successMsg: (result) => result.usedTicket ? '🎟️ 已使用補簽券' : '💎 已消耗 50 鑽石補簽',
    timeoutMsg: '❌ 補簽逾時，請稍後再試',
  });

  const handleClaimWeek = () => run(Events.Checkin.REQUEST_CLAIM_WEEK, Events.Checkin.RESULT, {}, {
    successMsg: '🔥 已領取 7 天加成 Buff！',
    timeoutMsg: '❌ 領取逾時，請稍後再試',
  });

  const handleClaimMonth = () => run(Events.Checkin.REQUEST_CLAIM_MONTH, Events.Checkin.RESULT, {}, {
    successMsg: '🎉 恭喜！領取全勤獎勵 +500 💰',
    timeoutMsg: '❌ 領取逾時，請稍後再試',
  });

  return (
    <Modal title="✨ 每日簽到" onClose={onClose}>
          {/* 統計列 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted,#8c6e52)' }}>
              🔥 連續：<b style={{ color: 'var(--color-gold,#f5a623)' }}>{loginStreak}</b> 天
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted,#8c6e52)' }}>
              🎟️ 補簽券：<b style={{ color: 'var(--color-info,#2980b9)' }}>{makeupTickets}</b> 張
            </span>
          </div>

          {/* 7天進度 */}
          <div style={weekBarStyle}>
            {Array.from({ length: 7 }, (_, i) => {
              const day = i + 1;
              const isChest   = day === 7;
              const isReached = canClaimWeek ? true : day <= streakProgress;

              if (isChest) {
                return (
                  <div key={day}
                    style={{ ...weekDayStyle, opacity: 1, cursor: canClaimWeek ? 'pointer' : 'default' }}
                    onClick={canClaimWeek ? handleClaimWeek : undefined}
                  >
                    <div style={{ fontSize: '1.5rem' }}>{canClaimWeek ? '🔥' : '🎁'}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: canClaimWeek ? 'var(--color-danger,#c0392b)' : 'var(--text-ghost,#9C7B5B)' }}>
                      {canClaimWeek ? '點擊領取' : 'Buff獎勵'}
                    </div>
                  </div>
                );
              }

              return (
                <div key={day} style={{ ...weekDayStyle, opacity: isReached ? 1 : 0.4 }}>
                  <div style={{ fontSize: '1.5rem' }}>{isReached ? '🔥' : '⭕'}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isReached ? 'var(--color-gold,#f5a623)' : 'var(--text-ghost,#9C7B5B)' }}>
                    第{day}天
                  </div>
                </div>
              );
            })}
          </div>

          {/* 月曆格 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day     = i + 1;
              const isToday = day === today;
              const isPast  = day < today;
              const isLast  = day === daysInMonth;
              const checked = !!(checkin.days ?? [])[i];

              if (isLast) {
                if (isFullMonth && !checkin.claimedMonth) {
                  return (
                    <div key={day} style={{ ...cellStyle, background:'var(--color-gold-soft,#fef3c7)', borderColor:'var(--color-gold,#f5a623)', cursor:'pointer' }}
                         onClick={handleClaimMonth}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color:'var(--color-gold-dark,#c47d0e)' }}>全勤獎</div>
                      <div style={{ fontSize: '1.2rem' }}>💎</div>
                    </div>
                  );
                }
                return (
                  <div key={day} style={{ ...cellStyle, opacity: 0.7 }}>
                    <div style={{ fontSize: '0.68rem', color:'var(--text-muted,#8c6e52)' }}>{day}</div>
                    <div style={{ fontSize: '1rem' }}>🎁</div>
                  </div>
                );
              }

              if (checked) {
                return (
                  <div key={day} style={{ ...cellStyle, background:'var(--color-correct-soft,rgba(34,122,89,0.1))', borderColor:'var(--color-correct,#227A59)' }}>
                    <div style={{ fontSize: '0.68rem', color:'var(--text-muted,#8c6e52)' }}>{day}</div>
                    <div style={{ fontSize: '0.9rem' }}>✅</div>
                  </div>
                );
              }

              if (isToday) {
                return (
                  <div key={day} style={{ ...cellStyle, background:'var(--color-gold-soft,#fef3c7)', borderColor:'var(--color-gold,#f5a623)', cursor:'pointer' }}
                       onClick={handleCheckIn}>
                    <div style={{ fontSize: '0.68rem', color:'var(--text-muted,#8c6e52)' }}>{day}</div>
                    <div style={{ fontSize: '0.9rem' }}>✨</div>
                  </div>
                );
              }

              if (isPast) {
                return (
                  <div key={day} style={{ ...cellStyle, cursor:'pointer', opacity: 0.8 }}
                       onClick={() => handleMakeup(i)}>
                    <div style={{ fontSize: '0.68rem', color:'var(--text-muted,#8c6e52)' }}>{day}</div>
                    <div style={{ fontSize: '0.68rem', color:'var(--color-danger,#c0392b)', fontWeight:700 }}>補簽</div>
                  </div>
                );
              }

              return (
                <div key={day} style={{ ...cellStyle, opacity: 0.4 }}>
                  <div style={{ fontSize: '0.68rem', color:'var(--text-muted,#8c6e52)' }}>{day}</div>
                  <div style={{ fontSize: '0.9rem' }}>🔒</div>
                </div>
              );
            })}
          </div>
    </Modal>
  );
}


const weekBarStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-box,rgba(0,0,0,0.035))', padding:'12px 8px', borderRadius:12, border:'1px solid var(--border,rgba(0,0,0,0.09))', marginBottom:16 };
const weekDayStyle = { display:'flex', flexDirection:'column', alignItems:'center', gap:3 };
const cellStyle   = { borderRadius:8, height:52, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'1px solid var(--border,rgba(0,0,0,0.09))', gap:2 };