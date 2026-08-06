// src/components/story/StoryTopBar.jsx
import { useGameStore, calcMaxEnergy } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

// pluginType → 顯示標籤（純呈現用，不影響任何遊戲邏輯）
const PLUGIN_TYPE_LABELS = {
  escape_room: '密室逃脫', horror: '恐怖',
  deduction: '推理', deduction_debate: '推理辯論', relationship_truth: '真相調查',
  raising: '養成', harem: '后宮', social_climb: '社交', career: '職涯',
  intrigue: '宮鬥', learning: '學習',
};

export default function StoryTopBar({ onClose }) {
  const { energy, settings, unlocks, narrative, maxEnergy } = useGameStore(s => ({
    energy: s.story?.energy ?? 0,
    narrative: s.story?.narrative ?? null,
    settings: s.settings ?? {},
    unlocks: s.unlocks ?? {},
    maxEnergy: calcMaxEnergy(s.lv ?? 1),
  }));

  const pct = Math.min(100, Math.max(0, (energy / maxEnergy) * 100));

  const hasLearning = Array.isArray(unlocks)
    ? unlocks.includes('learning')
    : !!unlocks['learning'];

  const langOpts = [
    { value: 'mix', label: 'Mix' },
    { value: 'zh', label: 'ZH' },
    { value: 'jp', label: 'JP' },
    { value: 'kr', label: 'KR' },
    { value: 'en', label: 'EN' },
  ];

  const handleLangChange = (e) => {
    EventBus.emit(Events.Settings.SET_LANG, e.target.value);
  };

  const handleBuyEnergy = () => {
    const s = useGameStore.getState();
    const bag = s.bag ?? [];
    const smallIdx = bag.findIndex(i => i.id === 'sys_stamina_s' && i.count > 0);
    const medIdx = bag.findIndex(i => i.id === 'sys_stamina_m' && i.count > 0);
    const bigIdx = bag.findIndex(i => i.id === 'sys_stamina_l' && i.count > 0);

    const useIdx = smallIdx > -1 ? smallIdx : medIdx > -1 ? medIdx : bigIdx > -1 ? bigIdx : -1;

    if (useIdx > -1) {
      const item = bag[useIdx];
      const val = item.id === 'sys_stamina_s' ? 30 : item.id === 'sys_stamina_m' ? 60 : maxEnergy;
      useGameStore.setState(st => {
        const newBag = (st.bag ?? []).map((b, i) =>
          i === useIdx ? { ...b, count: b.count - 1 } : b
        ).filter(b => b.count > 0);
        const newEnergy = Math.min(calcMaxEnergy(st.lv ?? 1), (st.story?.energy ?? 0) + val);
        return {
          bag: newBag,
          story: { ...st.story, energy: newEnergy },
        };
      });
      EventBus.emit(Events.System.TOAST, `⚡ 回復了 ${val} 點精力！`);
      EventBus.emit(Events.Story.UPDATE_TOPBAR);
    } else {
      EventBus.emit(Events.System.TOAST, '🏪 背包裡沒有精力藥水，前往商店購買吧！');
    }
  };

  const locationSuffix = narrative?.displayState?.stats?.位置
    ? ` · ${narrative.displayState.stats.位置}`
    : '';

  return (
    <div style={styles.bar}>
      {/* 精力條 */}
      <div style={styles.energyGroup}>
        <span style={styles.bolt}>⚡</span>
        <div style={styles.barWrap}>
          <div style={{ ...styles.barFill, width: `${pct}%` }} />
          <span style={styles.barText}>{Math.floor(energy)}/{maxEnergy}</span>
        </div>
        <button onClick={handleBuyEnergy} style={styles.plusBtn}>+</button>
      </div>

      {/* 目前進行中的玩法類別 + 位置（取代舊的 sandbox/genre 顯示） */}
      {narrative?.running && (
        <div style={styles.apBadge}>
          📖 {PLUGIN_TYPE_LABELS[narrative.pluginType] || narrative.pluginType}{locationSuffix}
        </div>
      )}

      <div style={styles.spacer} />

      {/* 語言選擇 */}
      {hasLearning && (
        <select
          value={settings.targetLang || 'mix'}
          onChange={handleLangChange}
          style={styles.langSelect}
        >
          {langOpts.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* 關閉 */}
      <button onClick={onClose} style={styles.closeBtn}>✕</button>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = {
  bar: {
    flexShrink: 0,
    /* 真正吃掉瀏海安全區 */
    paddingTop: 'env(safe-area-inset-top, 0px)',
    /* 52px 是工具列高度 */
    minHeight: 'calc(52px + env(safe-area-inset-top, 0px))',
    background: 'var(--bg-nav)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
    paddingRight: '10px',
    gap: '8px',
    boxSizing: 'border-box',
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    zIndex: 20,
  },
  energyGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: '130px',
    flexShrink: 0,
  },
  bolt: {
    color: 'var(--color-gold)',
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  barWrap: {
    flex: 1,
    height: '12px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    background: 'var(--color-gold)',
    borderRadius: '6px',
    transition: 'width 0.4s ease',
  },
  barText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  plusBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--color-correct)',
    color: '#fff',
    border: 'none',
    fontSize: '0.85rem',
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  },
  apBadge: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 8px',
    fontSize: '0.78rem',
    color: 'var(--text-on-dark)',
    flexShrink: 0,
  },
  spacer: { flex: 1 },
  langSelect: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-on-dark)',
    fontSize: '0.8rem',
    padding: '3px 6px',
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'rgba(192,57,43,0.25)',
    border: '1px solid rgba(192,57,43,0.4)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-danger)',
    padding: '3px 10px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};