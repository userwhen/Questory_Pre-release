// src/components/story/StoryDrawer.jsx
import { useState } from 'react';
import { useGameStore } from '@/core/state.js';

// tagDict 由外部注入（避免 import 龐大資料檔）
let _tagDict = {};
export function injectTagDict(dict) { _tagDict = dict; }

// Deduction 家族的 pluginType，用來決定「線索」區塊要不要顯示
const DEDUCTION_TYPES = ['deduction', 'deduction_debate', 'relationship_truth'];

export default function StoryDrawer() {
  const [open, setOpen] = useState(false);

  const { tags, vars, settings, narrative } = useGameStore(s => ({
    narrative: s.story?.narrative ?? null,
    // world/state 來自 TagManager 快照，Plugin 私有蒐集物（證物/鑰匙）來自 displayState.tags
    tags: [
      ...(s.story?.narrative?.tags?.world ?? []),
      ...(s.story?.narrative?.tags?.state ?? []),
      ...(s.story?.narrative?.displayState?.tags ?? []),
    ],
    vars: s.story?.vars ?? {},
    settings: s.settings ?? {},
  }));

  // 沒有進行中的劇情：不渲染抽屜
  const hasStory = !!narrative?.running;
  if (!hasStory) return null;

  const lang = settings.targetLang === 'mix' ? 'zh' : (settings.targetLang || 'zh');

  // ── 過濾標籤 ──────────────────────────────
  const hiddenPrefixes = ['nutrients', 'pending_enchant'];

  const visibleTags = tags.filter(t => {
    if (hiddenPrefixes.some(p => t.startsWith(p))) return false;
    // world: 前綴的環境 tag 不顯示在道具區（只做背景資訊）
    if (t.startsWith('world:')) return false;
    return true;
  });

  const isMystery = DEDUCTION_TYPES.includes(narrative?.pluginType);
  // Deduction 系列的 displayState.tags 本質上就是證物/情報，全部當線索顯示；
  // 其他家族（密室鑰匙、宮鬥情報等）當一般道具/狀態顯示
  const clueTags = isMystery ? visibleTags : [];
  const regularTags = isMystery ? [] : visibleTags;

  // ── 位置資訊（來自 Plugin.getDisplayState() 的 stats.位置，只有 Space/Deduction 家族有）──
  const currentLocation = narrative?.displayState?.stats?.位置 || null;

  // ── 數值列表（story.vars 是 StoryBridge 的任務養分資料，跟本局玩法數值是兩回事，
  //    玩法本身的數值已經在 StoryActions 的 VarsBar 顯示，這裡維持顯示養分相關）──
  const varEntries = Object.entries(vars).filter(([, v]) => v !== 0);

  return (
    <div style={styles.wrapper}>
      {/* 把手 */}
      <button onClick={() => setOpen(o => !o)} style={styles.handle}>
        <span style={styles.handleIcon}>{open ? '▼' : '▲'}</span>
        <span style={styles.handleLabel}>
          {open ? '收起' : (currentLocation ? `📍 ${currentLocation}` : '📖 詳情')}
        </span>
      </button>

      {/* 抽屜內容 */}
      {open && (
        <div style={styles.body}>
          {/* 位置（只有 Space/Deduction 家族會有） */}
          {currentLocation && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📍 當前位置</div>
                <div style={styles.locationName}>{currentLocation}</div>
              </div>
              <div style={styles.divider} />
            </>
          )}

          {/* 養分數值 */}
          {varEntries.length > 0 && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📊 狀態數值</div>
                <div style={styles.tagRow}>
                  {varEntries.map(([k, v]) => (
                    <span key={k} style={{ ...styles.badge, ...styles.badgeVar }}>
                      <span style={styles.badgeKey}>{k}</span>
                      <span style={styles.badgeVal}>{v}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={styles.divider} />
            </>
          )}

          {/* 線索（僅 Deduction 家族） */}
          {isMystery && (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>🔍 收集線索</div>
                <div style={styles.tagRow}>
                  {clueTags.length === 0
                    ? <span style={styles.empty}>尚無線索</span>
                    : clueTags.map(t => (
                      <span key={t} style={{ ...styles.badge, ...styles.badgeClue }}>
                        {t.includes(':') ? t.substring(t.indexOf(':') + 1) : (_tagDict[t]?.[lang] || t)}
                      </span>
                    ))
                  }
                </div>
              </div>
              <div style={styles.divider} />
            </>
          )}

          {/* 道具與狀態 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🎒 道具與狀態</div>
            <div style={styles.tagRow}>
              {regularTags.length === 0
                ? <span style={styles.empty}>尚無特殊狀態</span>
                : regularTags.map(t => {
                  const hasPrefix = t.includes(':');
                  const label = hasPrefix
                    ? t.substring(t.indexOf(':') + 1)
                    : (_tagDict[t]?.[lang] || _tagDict[t]?.zh || t);
                  const tagType = hasPrefix
                    ? ({ 'state': 'status', 'world': 'loc' }[t.split(':')[0]] ?? 'info')
                    : (_tagDict[t]?.type || 'info');
                  const tagStyle = TAG_STYLES[tagType] || TAG_STYLES.info;
                  return (
                    <span key={t} style={{ ...styles.badge, ...tagStyle }}>
                      {label}
                    </span>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── tag 樣式對應 ──────────────────────────────────────────────────────────────
const TAG_STYLES = {
  loc: { color: 'var(--color-gold)', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)' },
  status: { color: 'var(--color-info)', background: 'rgba(41,128,185,0.15)', border: '1px solid rgba(41,128,185,0.3)' },
  warn: { color: 'var(--color-danger)', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)' },
  info: { color: 'var(--color-correct)', background: 'rgba(34,122,89,0.15)', border: '1px solid rgba(34,122,89,0.3)' },
  clue: { color: '#e67e22', background: 'rgba(230,126,34,0.15)', border: '1px solid rgba(230,126,34,0.3)' },
};

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    width: '100%',
    flexShrink: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  handle: {
    width: '100%',
    background: 'rgba(28,16,8,0.92)',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    color: 'var(--text-on-dark)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '0.82rem',
  },
  handleIcon: { color: 'var(--color-gold)', fontSize: '0.7rem' },
  handleLabel: { opacity: 0.8 },
  body: {
    background: 'rgba(20,12,5,0.97)',
    maxHeight: '45vh',
    overflowY: 'auto',
    padding: '12px 14px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  section: { marginBottom: '4px' },
  sectionTitle: {
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    color: 'rgba(245,166,35,0.7)',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  locationName: {
    color: 'var(--color-gold)',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    marginBottom: '2px',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.07)',
    margin: '10px 0',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.78rem',
    fontWeight: '500',
  },
  badgeVar: {
    color: 'var(--color-gold)',
    background: 'rgba(245,166,35,0.12)',
    border: '1px solid rgba(245,166,35,0.25)',
  },
  badgeClue: {
    color: '#e67e22',
    background: 'rgba(230,126,34,0.12)',
    border: '1px solid rgba(230,126,34,0.25)',
  },
  badgeKey: { opacity: 0.7, fontSize: '0.72rem' },
  badgeVal: { fontWeight: 'bold' },
  empty: { color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' },
};