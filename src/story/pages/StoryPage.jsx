// src/components/pages/StoryPage.jsx
import { useEffect, useState } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import StoryTopBar from '@/story/components/StoryTopBar.jsx';
import StoryTextBox from '@/story/components/StoryTextBox.jsx';
import StoryActions from '@/story/components/StoryActions.jsx';
import StoryDrawer from '@/story/components/StoryDrawer.jsx';
import TaskBindModal from '@/story/components/TaskBindModal.jsx';
import { narrativeEngine, NARRATIVE_EVENTS } from '@/story/engines/NarrativeEngine.js';

/**
 * 將敘事文字轉為 HTML
 * 規則：
 *  - \n\n → 段落空行（<p> 之間額外 margin）
 *  - 句尾標點（。！？…）→ 自動換行（新 <p>）
 *  - 其他內容在同一 <p> 內連續
 */
function formatNarrativeText(text) {
  if (!text) return '';

  const blocks = text.split(/\n\n+/);

  const renderedBlocks = blocks.map((block, blockIdx) => {
    const sentences = block
      .split(/(?<=[。！？…」』])\s*/)
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length === 0) return '';

    const paras = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const para = sentences.slice(i, i + 2).join('');
      paras.push(para);
    }

    const blockMargin = blockIdx > 0 ? 'margin-top:1.4em;' : '';
    return paras
      .map((p, i) => `<p style="${blockMargin && i === 0 ? blockMargin : ''}margin-bottom:0.75em;">${p}</p>`)
      .join('');
  });

  return renderedBlocks.join('');
}

export default function StoryPage({ onNavigate }) {
  const [vibe, setVibe] = useState('calm');

  const initialized = useGameStore(s => !!s.story);

  // ── EventBus 訂閱
  useEffect(() => {
    const unVibe = EventBus.on(Events.Story.SET_VIBE, v => {
      setVibe(v ?? 'calm');
    });
    const unIdle = EventBus.on(Events.Story.RENDER_IDLE, () => {
  EventBus.emit(Events.Story.CLEAR_SCREEN);
  setVibe('calm');
});

    // ── NarrativeEngine 事件訂閱
    const unNarrNode = EventBus.on(NARRATIVE_EVENTS.NODE, ({ text, options, vibe: nodeVibe }) => {
      // 更新 vibe（Hub 計算好的：片段自帶 vibe，或依 tensionLevel 後備映射）
      if (nodeVibe) setVibe(nodeVibe);

      EventBus.emit(Events.Story.CLEAR_SCREEN);
      EventBus.emit(Events.Story.APPEND_CHUNK, {
        html: formatNarrativeText(text),
        isLast: true,
        onComplete: () => {
          EventBus.emit(Events.Story.SHOW_OPTIONS, options.map(o => ({
            label: o.label,
            action: () => narrativeEngine.choose(o.actionTag),
          })));
        },
      });
    });

    const unNarrEnd = EventBus.on(NARRATIVE_EVENTS.END, ({ text, endingName, endingType, vibe: endingVibe }) => {
      if (endingVibe) setVibe(endingVibe);
      EventBus.emit(Events.Story.CLEAR_SCREEN);
      EventBus.emit(Events.Story.APPEND_CHUNK, {
        html: formatNarrativeText(text),
        isLast: true,
        onComplete: () => {
          // 交給 StoryActions 的 tap-to-continue 結局畫面接手
          EventBus.emit(Events.Story.SHOW_ENDING, { endingName, endingType });
        },
      });
    });

    const unNarrInterrupt = EventBus.on(NARRATIVE_EVENTS.INTERRUPT, () => {
      // vibe 由緊接在後的 NODE 事件決定，這裡不用重複設定
      // 保留這個訂閱點，未來想加畫面震動之類的即時反饋可以掛在這裡
    });

    return () => {
      unVibe(); unIdle();
      unNarrNode(); unNarrEnd(); unNarrInterrupt();
      narrativeEngine.abort();
    };
  }, []);

  const handleClose = () => {
    if (onNavigate) onNavigate('main');
  };

  if (!initialized) {
    return (
      <div style={styles.page}>
        <StoryTopBar onClose={handleClose} />
        <div style={styles.loadingBody}>
          <div style={styles.loadingText}>載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <StoryTopBar onClose={handleClose} />
      <div style={styles.body}>
        <StoryTextBox vibe={vibe} />
      </div>
      <StoryDrawer />
      <TaskBindModal />
      <StoryActions />
    </div>
  );
}

const styles = {
  page: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-hud)',
    overflow: 'hidden',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    boxSizing: 'border-box',
  },
  body: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingBody: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
};