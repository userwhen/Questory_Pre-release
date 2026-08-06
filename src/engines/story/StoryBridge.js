/**
 * src/engines/story/StoryBridge.js
 * 職責：橋接 StoryEngine ↔ TaskEngine
 *   - 祝福派發：故事 action:'enchant_task' → 觸發 Modal
 *   - 任務結算：TaskEngine.resolveTask 完成後 → 養分萃取寫回 story
 *   - 共鳴注入：NarrativeEngine.start() 前 → 把近期任務標籤帶入 contextTags
 * 依賴：state.js、events.js、event_types.js
 * 不依賴任何 UI / DOM
 * （原 src/engines/story_bridge.js 搬移至此，內容未變更）
 */

import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events }             from '@/core/event_types.js';

const MAX_NUTRIENTS = 5;   // 養分保留最近幾筆

export const StoryBridge = {

  // ══════════════════════════════════════════
  // 1. 初始化（掛 EventBus 監聽）
  // ══════════════════════════════════════════
  init: makeIdempotentInit(function () {
    // 任務完成時萃取養分
    const unsubTaskDone = EventBus.on(Events.Task.COMPLETED, ({ task, impact }) => {
      this._extractNutrient(task, impact);
    });

    if (import.meta.env.DEV) console.log('🌉 StoryBridge 初始化完成');

    return [unsubTaskDone];
  }),

  // ══════════════════════════════════════════
  // 2. 祝福派發
  // ══════════════════════════════════════════

  requestEnchant(optionRef) {
    EventBus.emit(Events.Story.ENCHANT_REQUEST, { optionRef });
  },

  resolveEnchant(taskId, choice, optionRef) {
    if (choice === 'skip') {
      EventBus.emit(Events.Story.ENCHANT_RESOLVED, { bound: false, optionRef });
      return;
    }

    if (choice === 'later') {
      setState(s => ({
        story: {
          ...s.story,
          vars: {
            ...(s.story?.vars ?? {}),
            pending_enchant: JSON.stringify({ optionRef, storedAt: Date.now() }),
          },
        },
      }));
      EventBus.emit(Events.System.TOAST, '📜 祝福憑證已存入試煉背包');
      EventBus.emit(Events.Story.ENCHANT_RESOLVED, { bound: false, optionRef });
      return;
    }

    const gs   = getState();
    const tasks = gs.tasks ?? [];
    let target  = null;

    if (choice === 'random') {
      const active = tasks.filter(t => !t.done && t.status !== 'completed' && !t.enchant);
      if (!active.length) {
        EventBus.emit(Events.System.TOAST, '⚠️ 目前沒有進行中的任務');
        EventBus.emit(Events.Story.ENCHANT_RESOLVED, { bound: false, optionRef });
        return;
      }
      target = active[Math.floor(Math.random() * active.length)];
    } else {
      target = tasks.find(t => t.id === taskId);
    }

    if (target?.enchant) {
      EventBus.emit(Events.System.TOAST, '⚠️ 這個任務已經獲得祝福了');
      EventBus.emit(Events.Story.ENCHANT_RESOLVED, { bound: false, optionRef });
      return;
    }

    if (!target) {
      EventBus.emit(Events.Story.ENCHANT_RESOLVED, { bound: false, optionRef });
      return;
    }

    setState(s => ({
      tasks: (s.tasks ?? []).map(t =>
        t.id !== target.id ? t : {
          ...t,
          enchant: {
            storyVibe:  gs.story?.chain?.skeleton ?? 'unknown',
            boundAt:    Date.now(),
            optionLabel: optionRef?.label ?? '',
          },
        }
      ),
    }));

    EventBus.emit(Events.System.TOAST, `⚔️ 「${target.title}」已祝福！`);
    EventBus.emit(Events.Story.ENCHANT_RESOLVED, { bound: true, task: target, optionRef });
  },

  // ══════════════════════════════════════════
  // 3. 養分萃取（任務完成 → 寫回 story）
  // ══════════════════════════════════════════
  _extractNutrient(task, impact) {
    const gs       = getState();
    const resonance = gs.settings?.storyResonance ?? false;
    if (!resonance) return;

    const attrTags = (task.attrs ?? []).map(a => `skill_${a.toLowerCase().replace(/\s+/g, '_')}`);

    const vibeTags = impact >= 8
      ? ['vibe_epic']
      : impact >= 5
        ? ['vibe_active']
        : ['vibe_casual'];

    const newNutrient = {
      taskId:    task.id,
      title:     task.title,
      impact,
      tags:      [...vibeTags, ...attrTags],
      doneAt:    Date.now(),
    };

    setState(s => {
      const prev = s.story?.vars?.nutrients
        ? JSON.parse(s.story.vars.nutrients)
        : [];

      const next = [newNutrient, ...prev].slice(0, MAX_NUTRIENTS);

      const curTags  = s.story?.tags ?? [];
      const addTags  = newNutrient.tags.filter(t => !curTags.includes(t));

      return {
        story: {
          ...s.story,
          tags: [...curTags, ...addTags],
          vars: {
            ...(s.story?.vars ?? {}),
            nutrients:        JSON.stringify(next),
            last_task_name:   task.title,
            last_task_impact: impact >= 8 ? '強大' : impact >= 5 ? '穩定' : '輕微',
          },
        },
      };
    });
  },

  // ══════════════════════════════════════════
  // 4. 共鳴注入（explore 前呼叫）
  // ══════════════════════════════════════════
  getResonanceTags() {
    const gs        = getState();
    const resonance = gs.settings?.storyResonance ?? false;
    if (!resonance) return [];

    const raw = gs.story?.vars?.nutrients;
    if (!raw) return [];

    try {
      const nutrients = JSON.parse(raw);
      const rawTags = [...new Set(
        nutrients.slice(0, 3).flatMap(n => n.tags ?? [])
      )];

      return rawTags.map(t => {
        if (t.startsWith('state:') || t.startsWith('world:')) {
          return t;
        }
        return `state:${t}`;
      });
    } catch {
      return [];
    }
  },

  // ══════════════════════════════════════════
  // 5. 檢查 pending_enchant（進入故事時提醒）
  // ══════════════════════════════════════════
  checkPendingEnchant() {
    const gs  = getState();
    const raw = gs.story?.vars?.pending_enchant;
    if (!raw) return null;

    try {
      const pending = JSON.parse(raw);
      const ageMs   = Date.now() - (pending.storedAt ?? 0);
      if (ageMs > 3 * 24 * 60 * 60 * 1000) {
        setState(s => ({
          story: {
            ...s.story,
            vars: { ...(s.story?.vars ?? {}), pending_enchant: undefined },
          },
        }));
        return null;
      }
      return pending;
    } catch {
      return null;
    }
  },

  clearPendingEnchant() {
    setState(s => ({
      story: {
        ...s.story,
        vars: { ...(s.story?.vars ?? {}), pending_enchant: undefined },
      },
    }));
  },

  // ══════════════════════════════════════════
  // 6. 開啟 Modal（內部）
  // ══════════════════════════════════════════
  _openBindModal(optionRef) {
    EventBus.emit(Events.Story.BIND_MODAL_OPEN, { optionRef });
  },

  // ══════════════════════════════════════════
  // 7. 新系統養分萃取（NarrativeEngine 結局後呼叫）
  // ══════════════════════════════════════════
  _extractNutrientFromNarrative({ genre, endingType, plotTags, tension }) {
    const gs        = getState();
    const resonance = gs.settings?.storyResonance ?? false;
    if (!resonance) return;

    const vibeTags = tension >= 80
      ? ['vibe_epic']
      : tension >= 40
        ? ['vibe_active']
        : ['vibe_casual'];

    const storyTags = (plotTags || [])
      .filter(t => typeof t === 'string')
      .map(t => `story_${t.replace(/:/g, '_')}`);

    const endingTag = endingType === '正向'
      ? 'ending_positive'
      : endingType === '負向'
        ? 'ending_negative'
        : 'ending_neutral';

    const newNutrient = {
      source:    'narrative',
      genre,
      endingType,
      tension:   Math.round(tension),
      tags:      [...vibeTags, ...storyTags, endingTag, `genre_${genre}`],
      doneAt:    Date.now(),
    };

    setState(s => {
      const prev = s.story?.vars?.nutrients
        ? JSON.parse(s.story.vars.nutrients)
        : [];

      const next = [newNutrient, ...prev].slice(0, MAX_NUTRIENTS);

      const curTags = s.story?.tags ?? [];
      const addTags = newNutrient.tags.filter(t => !curTags.includes(t));

      return {
        story: {
          ...s.story,
          tags: [...curTags, ...addTags],
          vars: {
            ...(s.story?.vars ?? {}),
            nutrients:           JSON.stringify(next),
            last_narrative_genre: genre,
            last_ending_type:    endingType,
          },
        },
      };
    });
  },
};
