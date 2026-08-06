import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerEngine } from '@/plugins/timer.js';
import { Sub } from '@/plugins/subscription.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

const timerAnim = `
  @keyframes timerFadeIn {
    from { opacity:0; transform:scale(0.97); }
    to   { opacity:1; transform:scale(1); }
  }
`;

const MODES = [
  { id: 'countdown', label: '⏳ 倒數' },
  { id: 'pomodoro',  label: '🍅 番茄' },
  { id: 'stopwatch', label: '⏱️ 正計時' },
];

const MODE_COLORS = {
  countdown: { ring: '#f0a500', text: '#ffd166' },
  pomodoro:  { ring: '#e55a5a', text: '#ff8080' },
  stopwatch: { ring: '#5b8af0', text: '#80a8ff' },
};

const POMODORO_WORK  = 25 * 60;
const POMODORO_BREAK = 5  * 60;

export default function TimerModal({ onClose }) {
  const [phase,       setPhase]       = useState('idle');
  const [mode,        setMode]        = useState('countdown');
  const [total,       setTotal]       = useState(15 * 60);
  const [elapsed,     setElapsed]     = useState(0);
  const [pomPhase,    setPomPhase]    = useState('work');
  const [focusLocked, setFocusLocked] = useState(false);
  const [alertOn,     setAlertOn]     = useState(true);
  const origNavigate  = useRef(null);

  const col = MODE_COLORS[mode] ?? MODE_COLORS.countdown;
  const remaining = Math.max(0, total - elapsed);
  const progress  = mode === 'stopwatch'
    ? Math.min(elapsed / 3600, 1)
    : total > 0 ? (total - remaining) / total : 0;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  const display = mode === 'stopwatch' ? fmt(elapsed) : fmt(remaining);

  const R = 110;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - progress);

  useEffect(() => {
    TimerEngine.on('tick',         ({ elapsed: e }) => setElapsed(e));
    TimerEngine.on('paused',       () => setPhase('paused'));
    TimerEngine.on('stopped',      () => setPhase('idle'));
    TimerEngine.on('completed',    () => { setPhase('done'); });
    TimerEngine.on('pomodoroBreak', () => {
      setPomPhase('break');
      setTotal(POMODORO_BREAK);
      setElapsed(0);
      setPhase('done');
      setTimeout(() => {
        setPhase('running');
        TimerEngine.start({ mode: 'pomodoro', total: POMODORO_BREAK, phase: 'break' });
      }, 3000);
    });

    return () => {
      TimerEngine.off('tick');
      TimerEngine.off('paused');
      TimerEngine.off('stopped');
      TimerEngine.off('completed');
      TimerEngine.off('pomodoroBreak');
    };
  }, []);

  const applyFocusLock = useCallback(() => {
    if (!origNavigate.current) {
      origNavigate.current = true;
    }
  }, []);

  const releaseFocusLock = useCallback(() => {
    origNavigate.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (focusLocked && phase === 'running') {
      EventBus.emit(Events.System.TOAST, '🔒 專注鎖定中，請先完成計時');
      return;
    }
    TimerEngine.stop();
    releaseFocusLock();
    onClose?.();
  }, [focusLocked, phase, onClose, releaseFocusLock]);

  const handleStart = useCallback(() => {
    const t = mode === 'pomodoro' ? POMODORO_WORK : total;
    if (focusLocked) applyFocusLock();
    setElapsed(0);
    setPomPhase('work');
    setTotal(t);
    setPhase('running');
    TimerEngine.start({ mode, total: t, phase: 'work', focusLocked });
  }, [mode, total, focusLocked, applyFocusLock]);

  const handleTogglePause = useCallback(() => {
    if (phase === 'running') {
      TimerEngine.pause();
    } else if (phase === 'paused') {
      setPhase('running');
      TimerEngine.resume({ mode, total, phase: pomPhase, focusLocked });
    }
  }, [phase, mode, total, pomPhase, focusLocked]);

  const handleFinishEarly = useCallback(() => {
    if (mode === 'stopwatch') {
      TimerEngine.stop();
      setPhase('done');
    } else {
      TimerEngine.stop();
      setPhase('idle');
      setElapsed(0);
      releaseFocusLock();
    }
  }, [mode, releaseFocusLock]);

  const handleRestart = useCallback(() => {
    setElapsed(0);
    setPomPhase('work');
    setFocusLocked(false);
    releaseFocusLock();
    const t = mode === 'pomodoro' ? POMODORO_WORK : total;
    setTotal(t);
    setPhase('idle');
  }, [mode, total, releaseFocusLock]);

  const handleModeSelect = useCallback((m) => {
    setMode(m);
    setElapsed(0);
    setPomPhase('work');
    setPhase('idle');
    if (m === 'pomodoro')  setTotal(POMODORO_WORK);
    else if (m === 'stopwatch') setTotal(0);
    else setTotal(15 * 60);
  }, []);

  const handleAdjustTime = useCallback((delta) => {
    setTotal(t => Math.max(60, t + delta * 60));
  }, []);

  const handleToggleFocusLock = useCallback(() => {
    if (!Sub.isProOrTrial()) {
      EventBus.emit(Events.System.TOAST, '🔒 Focus Lock 為 Pro 功能');
      return;
    }
    setFocusLocked(f => !f);
  }, []);

  const modeLabel = { countdown: '⏳ 倒數計時', pomodoro: pomPhase === 'work' ? '🍅 專注中' : '☕ 休息中', stopwatch: '⏱️ 正計時' }[mode];

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <style>{timerAnim}</style>
      <div style={containerStyle} onClick={e => e.stopPropagation()}>

        {/* 關閉按鈕 */}
        {!focusLocked && (
          <button style={closeAbsStyle} onClick={handleClose}>✕</button>
        )}

        {/* Focus Lock Badge */}
        {focusLocked && phase === 'running' && (
          <div style={focusBadgeStyle}>🔒 FOCUS LOCK 啟動中</div>
        )}

        {/* 模式標題 */}
        <div style={{ fontSize:'0.82rem', fontWeight:700, color: col.ring, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>
          {modeLabel}
        </div>

        {/* 模式選擇 + Focus Lock（idle 才顯示） */}
        {phase === 'idle' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              {MODES.map(m => (
                <button key={m.id}
                  style={{ padding:'7px 12px', borderRadius:50, cursor:'pointer', fontSize:'0.82rem', fontWeight:600, border:'none', background: mode === m.id ? col.ring : 'rgba(255,255,255,0.08)', color: mode === m.id ? '#111' : 'rgba(255,255,255,0.5)', transition:'all 0.15s' }}
                  onClick={() => handleModeSelect(m.id)}
                >{m.label}</button>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, padding:'9px 14px', borderRadius:50, cursor:'pointer', background: focusLocked ? 'rgba(239,83,80,0.15)' : 'rgba(255,255,255,0.05)', border:`1px solid ${focusLocked ? 'rgba(239,83,80,0.4)' : 'rgba(255,255,255,0.1)'}` }}
                 onClick={handleToggleFocusLock}>
              <span>{focusLocked ? '🔒' : '🔓'}</span>
              <span style={{ fontSize:'0.82rem', fontWeight:600, color: focusLocked ? '#ff8a80' : 'rgba(255,255,255,0.4)' }}>
                Focus Lock {focusLocked ? '已開啟' : '關閉'}
              </span>
              {!Sub.isProOrTrial() && <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.25)', marginLeft:'auto' }}>PRO</span>}
            </div>

            {mode === 'countdown' && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                {[-5,-1].map(d => (
                  <button key={d} style={adjBtnStyle} onClick={() => handleAdjustTime(d)}>{d}</button>
                ))}
                <span style={{ fontSize:'1rem', color:'rgba(255,255,255,0.5)', minWidth:60, textAlign:'center' }}>
                  {Math.floor(total/60)} 分
                </span>
                {[1,5].map(d => (
                  <button key={d} style={adjBtnStyle} onClick={() => handleAdjustTime(d)}>+{d}</button>
                ))}
              </div>
            )}

            {mode === 'pomodoro' && (
              <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.35)', marginBottom:16 }}>
                25 分鐘專注 → 5 分鐘休息
              </div>
            )}
          </>
        )}

        {/* 完成畫面 */}
        {phase === 'done' && (
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:'3rem', marginBottom:8 }}>{mode === 'countdown' ? '⏰' : '🎉'}</div>
            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#fff' }}>
              {mode === 'countdown' ? '時間到！' : '專注完成！'}
            </div>
            <div style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', marginTop:4 }}>
              {mode === 'stopwatch' ? `共計時 ${fmt(elapsed)}` : `${Math.floor(total/60)} 分鐘`}
            </div>
          </div>
        )}

        {/* 圓形進度計時器 */}
        <div style={{ position:'relative', width:260, height:260, marginBottom:20 }}>
          <button style={alertBtnStyle} onClick={() => setAlertOn(a => !a)}>
            {alertOn ? '🔔' : '🔕'}
          </button>
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            <circle cx="130" cy="130" r={R} fill="none" stroke={col.ring} strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={dash}
              transform="rotate(-90 130 130)"
              style={{ filter:`drop-shadow(0 0 8px ${col.ring}66)`, transition:'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <span style={{ fontSize:'3rem', fontWeight:200, color: col.text, fontVariantNumeric:'tabular-nums', letterSpacing:'0.05em' }}>
              {display}
            </span>
          </div>
        </div>

        {/* 控制按鈕 */}
        {phase === 'done' ? (
          <div style={{ display:'flex', gap:12 }}>
            <button style={{ ...ctrlBtnStyle, background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)' }}
              onClick={handleRestart}>🔁 再來一次</button>
            <button style={{ ...ctrlBtnStyle, background: col.ring, color:'#111' }}
              onClick={handleClose}>完成 ✓</button>
          </div>
        ) : phase === 'idle' ? (
          <button style={{ ...ctrlBtnStyle, background: col.ring, color:'#111', minWidth:160 }}
            onClick={handleStart}>▶ 開始</button>
        ) : (
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button style={{ ...ctrlBtnStyle, background: col.ring, color:'#111', minWidth:100 }}
              onClick={handleTogglePause}>
              {phase === 'paused' ? '▶ 繼續' : '⏸ 暫停'}
            </button>
            {(!focusLocked || mode === 'stopwatch') ? (
              <button style={{ ...ctrlBtnStyle, background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', fontSize:'0.85rem' }}
                onClick={handleFinishEarly}>
                {mode === 'stopwatch' ? '⏹ 結束' : '✕ 放棄'}
              </button>
            ) : (
              <div style={{ fontSize:'0.72rem', color:'rgba(239,83,80,0.6)', textAlign:'center', maxWidth:80, lineHeight:1.4 }}>
                🔒 鎖定中<br/>堅持到底！
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle    = { position:'fixed', inset:0, background:'rgba(10,10,18,0.96)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', animation:'timerFadeIn 0.25s ease' };
const containerStyle  = { display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', padding:'40px 20px 32px' };
const closeAbsStyle   = { position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:'1rem' };
const focusBadgeStyle = { position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', background:'rgba(239,83,80,0.15)', border:'1px solid rgba(239,83,80,0.3)', borderRadius:50, padding:'4px 12px', fontSize:'0.72rem', color:'#ff8a80', whiteSpace:'nowrap' };
const adjBtnStyle     = { padding:'7px 12px', borderRadius:50, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', fontSize:'0.95rem', fontFamily:'inherit' };
const alertBtnStyle   = { position:'absolute', top:4, right:4, zIndex:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:'1.1rem', color:'#fff' };
const ctrlBtnStyle    = { padding:'13px 26px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:'1rem', letterSpacing:'0.05em', fontFamily:'inherit', transition:'all 0.15s' };