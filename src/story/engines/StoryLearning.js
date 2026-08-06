/**
 * src/engines/story/StoryLearning.js
 * 職責：語言學習模組（多語言文字解析、螺旋式單字測驗）
 * 依賴：state.js、events.js
 * 不依賴任何 UI / DOM
 * （原 src/engines/story_learning.js 搬移至此，內容未變更）
 */

import { getState, setState } from '@/core/state.js';
import { EventBus }           from '@/core/events.js';
import { Events }             from '@/core/event_types.js';

// ── 單字資料庫（由外部注入）─────────────────
let _learningDB = { words: [] };

export const StoryLearning = {

  // ══════════════════════════════════════════
  // 初始化
  // ══════════════════════════════════════════
  init(learningDB) {
    _learningDB = learningDB ?? _learningDB;
    console.log(`📖 StoryLearning 初始化，單字數: ${_learningDB.words?.length ?? 0}`);
  },

  // ══════════════════════════════════════════
  // 1. 多語言文字解析
  // ══════════════════════════════════════════
  resolveText(textObj) {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;

    const lang = this._getLang();

    if (lang === 'mix') {
      const available = ['zh', 'jp', 'kr'].filter(l => textObj[l]);
      if (!available.length) return textObj.zh ?? '';
      return textObj[available[Math.floor(Math.random() * available.length)]];
    }

    return textObj[lang] ?? textObj.zh ?? '';
  },

  resolveLabel(labelObj) {
    return this.resolveText(labelObj);
  },

  // ══════════════════════════════════════════
  // 2. 螺旋式單字挑選
  // ══════════════════════════════════════════
  pickSpiralWord() {
    const words    = _learningDB.words ?? [];
    if (!words.length) return null;

    const learning = getState().story?.learning ?? {};

    const unfamiliar = words.filter(w => {
      const rec = learning[w.id];
      if (!rec) return true;
      return rec.wrong > rec.correct;
    });

    const pool = unfamiliar.length > 0 ? unfamiliar : words;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  // ══════════════════════════════════════════
  // 3. 取得錯誤選項（四選一測驗用）
  // ══════════════════════════════════════════
  pickWrongOptions(correctId, count = 3) {
    const words = (_learningDB.words ?? []).filter(w => w.id !== correctId);
    return this._shuffle(words).slice(0, count);
  },

  // ══════════════════════════════════════════
  // 4. 建立測驗節點（四選一）
  // ══════════════════════════════════════════
  createQuizNode(wordId) {
    const words   = _learningDB.words ?? [];
    const wordObj = words.find(w => w.id === wordId) ?? { text: '未知', translation: '未知', id: wordId };

    const wrongs = this.pickWrongOptions(wordId, 3);

    let options = [
      { label: wordObj.translation, action: 'quiz_answer', isCorrect: true,  wordId },
      ...wrongs.map(w => ({ label: w.translation, action: 'quiz_answer', isCorrect: false, wordId })),
    ];
    options = this._shuffle(options);
    options.push({ label: '跳過，繼續前進', action: 'advance', style: 'danger' });

    return {
      id:       `quiz_${wordId}_${Date.now()}`,
      isSubScene: true,
      text:     `請問「${wordObj.text}」是什麼意思？`,
      vibe:     'calm',
      options,
    };
  },

  // ══════════════════════════════════════════
  // 5. 處理測驗結果
  // ══════════════════════════════════════════
  handleQuizResult(wordId, isCorrect) {
    setState(s => {
      const prev   = s.story?.learning?.[wordId] ?? { correct: 0, wrong: 0 };
      const updated = isCorrect
        ? { correct: prev.correct + 1, wrong: prev.wrong }
        : { correct: prev.correct,     wrong: prev.wrong + 1 };
      return {
        story: {
          ...s.story,
          learning: { ...(s.story.learning ?? {}), [wordId]: updated },
        },
      };
    });

    if (isCorrect) {
      EventBus.emit(Events.System.TOAST, '✅ 回答正確！記憶加深。');
    } else {
      EventBus.emit(Events.System.TOAST, '❌ 答錯了...再接再厲。');
    }
  },

  // ══════════════════════════════════════════
  // 6. 學習模式是否啟用
  // ══════════════════════════════════════════
  isEnabled() {
    const gs = getState();
    // 預設開啟（跟 calMode/strictMode 同慣例），除非玩家在設定頁主動關掉
    const settingsOn = gs.settings?.learningMode !== false;
    const unlocked   = Array.isArray(gs.unlocks)
      ? gs.unlocks.includes('learning')
      : !!gs.unlocks?.['learning'];
    // AND：要「已解鎖」且「開關沒被關掉」才算啟用；原本的 OR 會讓 Toggle 關閉形同虛設
    return settingsOn && unlocked;
  },

  // ══════════════════════════════════════════
  // 工具函式
  // ══════════════════════════════════════════
  _getLang() {
    return getState().settings?.targetLang ?? 'zh';
  },

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};
