// src/components/story/StoryActions.jsx
import { useState, useEffect } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useGameStore } from '@/core/state.js';
import { narrativeEngine } from '@/story/engines/NarrativeEngine.js';

export default function StoryActions() {
  const [options, setOptions] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [mode, setMode] = useState('idle');
  // idle 子狀態：'default' | 'ending' | 'post_end' | 'exploring'
  const [idleMode, setIdleMode] = useState('default');

  const { myVars, lang, energy } = useGameStore(s => ({
    myVars:  s.story?.vars ?? {},
    lang:    s.settings?.targetLang === 'mix' ? 'zh' : (s.settings?.targetLang ?? 'zh'),
    energy:  s.story?.energy ?? 0,
  }));
  const canExplore = energy >= 5;

  useEffect(() => {
    const unShow = EventBus.on(Events.Story.SHOW_OPTIONS, (opts) => {
      setOptions(opts ?? []);
      setDisabled(false);
      setMode('options');
    });
    const unDisable = EventBus.on(Events.Story.DISABLE_OPTIONS, () => {
      setDisabled(true);
    });
    const unIdle = EventBus.on(Events.Story.RENDER_IDLE, () => {
      setOptions([]);
      setDisabled(false);
      setMode('idle');
      setIdleMode('default');
    });
    const unClear = EventBus.on(Events.Story.CLEAR_SCREEN, () => {
      // 只清選項，不改 mode（避免閃現）
      if (mode === 'options') {
        setOptions([]);
        setDisabled(false);
      }
    });
    const unExploring = EventBus.on(Events.Story.EXPLORING, () => {
      setMode('idle');
      setIdleMode('exploring');
      setDisabled(true);
    });
    const unEnding = EventBus.on(Events.Story.SHOW_ENDING, () => {
      // 結局文字打完字後由 StoryPage 觸發，切到 tap-to-continue 畫面
      setMode('idle');
      setIdleMode('ending');
    });

    return () => {
      unShow(); unDisable(); unIdle(); unClear(); unExploring(); unEnding();
    };
  }, [mode]);

  const handleOption = (idx) => {
    if (disabled) return;
    const opt = options[idx];
    if (!opt) return;

    if (typeof opt.action === 'function') {
      setOptions([]);
      setDisabled(true);
      opt.action();
      return;
    }

    console.warn('[StoryActions] 未知 action:', opt.action);
  };

  const handleEndingClick = () => {
  EventBus.emit(Events.Story.CLEAR_SCREEN);
  EventBus.emit(Events.Story.SET_VIBE, 'calm');
  setIdleMode('post_end');
};

  const handleStartExplore = () => {
    if (!canExplore) return;
    setMode('options');
    setOptions([]);
    setDisabled(true);
    narrativeEngine.startRandom();
  };

  // ── options 畫面 ──────────────────────────
  if (mode === 'options') {
    return (
      <div style={styles.container}>
        <VarsBar />
        <div style={styles.btnGroup}>
          {options.map((opt, idx) => {
            const label = resolveLabel(opt.label, myVars, lang);
            const btnStyle = getButtonStyle(opt.style, disabled || opt.action === 'locked');
            return (
              <button
                key={idx}
                onClick={() => handleOption(idx)}
                disabled={disabled || opt.action === 'locked'}
                style={btnStyle}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── idle 畫面 ─────────────────────────────
  if (idleMode === 'exploring') {
    return <div style={styles.container} />;
  }

  if (idleMode === 'ending') {
    return (
      <div style={{ ...styles.container, ...styles.endingOverlay }}
        onClick={handleEndingClick}>
        <span style={styles.tapHint}>點擊畫面繼續</span>
      </div>
    );
  }

  if (idleMode === 'post_end') {
    return (
      <div style={styles.container}>
        <div style={styles.postEndMsg}>✨ 冒險結束了。新的旅程正在等待...</div>
        <div style={styles.btnGroup}>
          <button
            onClick={() => { setIdleMode('default'); handleStartExplore(); }}
            disabled={!canExplore}
            style={{
              ...styles.btn,
              ...(canExplore ? styles.btnCorrect : styles.btnDisabled),
            }}
          >
            🔍 開始新探索 (5⚡)
          </button>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={styles.container}>
      <div style={styles.btnGroup}>
        <button
          onClick={handleStartExplore}
          disabled={!canExplore}
          style={{
            ...styles.btn,
            ...(canExplore ? styles.btnCorrect : styles.btnDisabled),
          }}
        >
          🔍 開始探索 (5⚡)
        </button>
      </div>
    </div>
  );
}

// ── VarsBar ───────────────────────────────────
function VarsBar() {
  const { stats, narrativeTension } = useGameStore(s => ({
    narrativeTension: s.story?.narrative?.tension ?? null,
    stats: s.story?.narrative?.displayState?.stats ?? {},
  }));

  const displayVars = narrativeTension !== null
    ? { ...stats, 張力: Math.round(narrativeTension) }
    : stats;

  const entries = Object.entries(displayVars).filter(([, v]) => v !== 0 && v !== '');
  if (!entries.length) return null;

  return (
    <div style={styles.varsBar}>
      <style>{`#story-vars-bar::-webkit-scrollbar{display:none}`}</style>
      <div id="story-vars-bar" style={styles.varsScroll}>
        {entries.map(([k, v]) => (
          <span key={k} style={{
            ...styles.varChip,
            ...(k === '張力' ? styles.varChipTension : {}),
          }}>
            <span style={styles.varKey}>{k}</span>
            <span style={styles.varVal}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function resolveLabel(label, myVars, lang) {
  if (!label) return '';
  if (typeof label === 'object' && label !== null) {
    label = label[lang] ?? label.zh ?? Object.values(label)[0] ?? '';
  }
  if (typeof label === 'string') {
    return label.replace(/\{([^}]+)\}/g, (m, key) =>
      myVars[key] !== undefined ? String(myVars[key]) : m
    );
  }
  return String(label);
}

function getButtonStyle(styleKey, isDisabled) {
  if (isDisabled) return { ...styles.btn, ...styles.btnDisabled };
  switch (styleKey) {
    case 'correct':
    case 'primary': return { ...styles.btn, ...styles.btnCorrect };
    case 'danger': return { ...styles.btn, ...styles.btnDanger };
    case 'info': return { ...styles.btn, ...styles.btnInfo };
    default: return { ...styles.btn, ...styles.btnNormal };
  }
}

const styles = {
  container: {
    flexShrink: 0,
    width: '100%',
    minHeight: '200px',
    maxHeight: '220px',
    background: 'var(--bg-hud)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 -4px 18px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
    overflowY: 'auto',
  },
  endingOverlay: {
    cursor: 'pointer',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: '18px',
    background: 'rgba(20,12,5,0.85)',
  },
  tapHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
  },
  postEndMsg: {
    color: 'var(--text-on-dark)',
    fontSize: '0.88rem',
    opacity: 0.7,
    padding: '16px 14px 4px',
    textAlign: 'center',
  },
  varsBar: {
    flexShrink: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.2)',
    minHeight: '36px',
  },
  varsScroll: {
    display: 'flex',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
  },
  varChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(0,0,0,0.45)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '2px 10px',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
  },
  varChipTension: {
    borderColor: 'rgba(192,57,43,0.4)',
    background: 'rgba(192,57,43,0.15)',
  },
  varKey: { color: 'var(--text-muted)', fontSize: '0.72rem' },
  varVal: { color: 'var(--color-gold)', fontWeight: 'bold' },
  btnGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 14px',
    alignItems: 'center',
    flex: 1,
  },
  btn: {
    width: '100%',
    maxWidth: '400px',
    padding: '11px 16px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'opacity 0.15s, transform 0.1s',
    letterSpacing: '0.02em',
  },
  btnNormal: {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--text-on-dark)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  btnCorrect: {
    background: 'var(--color-correct)',
    color: '#fff',
    boxShadow: '0 4px 0 #185C42',
  },
  btnDanger: {
    background: 'var(--color-danger)',
    color: '#fff',
    boxShadow: '0 4px 0 #922b21',
  },
  btnInfo: {
    background: 'var(--color-info)',
    color: '#fff',
    boxShadow: '0 4px 0 #1a5276',
  },
  btnDisabled: {
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.25)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};