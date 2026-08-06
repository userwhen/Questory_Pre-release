// LearningPlugin.js
// 語言學習玩法：螺旋式選字測驗，答對才推進，答錯原地重試（同一題）
// 組裝：RoundEngine（題數當回合）+ CriticalGate（onFail: 'retry'）
//      + 沿用既有 StoryLearning.js 的選字/測驗生成邏輯（螺旋優先錯多於對的單字）
//
// 題目文字走一般劇情池流程：text_template 用 {current_word} 佔位符，
// VocabularyFiller 會優先從 pluginState.memory 讀取，不用改任何既有模組。

import * as RoundEngine   from '../shared/RoundEngine.js';
import * as CriticalGate  from '../shared/CriticalGate.js';
import { StoryLearning }  from '../StoryLearning.js';

export class LearningPlugin {
  /**
   * @param {object} config
   * @param {string} config.pluginType
   * @param {object} config.tagManager
   * @param {number} [config.totalQuestions] - 總題數，預設 10
   * @param {boolean} [config.allowSkip]      - 是否提供「跳過」選項
   * @param {string} [config.completeEndingId]
   * @param {object} [config.memory]
   */
  constructor(config) {
    this.config = config;
    this.tagManager = config.tagManager;
  }

  init() {
    const round = RoundEngine.createState(this.config.totalQuestions ?? 10);
    const pluginState = this._setupQuestion(round, StoryLearning.pickSpiralWord());
    return { stage: 'loop', pluginState };
  }

  getCurrentStage() {
    return 'loop';
  }

  getAvailableOptions(pluginState) {
    const options = [...pluginState.choiceLabels];
    if (this.config.allowSkip) {
      options.push({ actionTag: 'skip', label: '跳過，繼續前進' });
    }
    return options;
  }

  getContextTags(pluginState) {
    return {
      worldTags: this.tagManager.getWorldTags(),
      stateTags: this.tagManager.getStateTags(),
      tensionLevel: this.tagManager.getTensionLevel(),
    };
  }

  processAction(actionTag, pluginState) {
    if (actionTag === 'skip') {
      if (pluginState.wordId) StoryLearning.handleQuizResult(pluginState.wordId, false);
      const round = RoundEngine.advance(pluginState.round);
      return { ...this._setupQuestion(round, StoryLearning.pickSpiralWord()), lastResult: 'skipped' };
    }

    const gate = CriticalGate.evaluate({ validTags: ['answer_correct'], onFail: 'retry' }, actionTag);

    if (pluginState.wordId) {
      StoryLearning.handleQuizResult(pluginState.wordId, gate.passed);
    }

    if (gate.passed) {
      const round = RoundEngine.advance(pluginState.round);
      return { ...this._setupQuestion(round, StoryLearning.pickSpiralWord()), lastResult: 'correct' };
    }

    // 答錯，原地重試同一題（重新洗牌選項順序，避免玩家記位置作弊）
    const sameWordObj = {
      id: pluginState.wordId,
      text: pluginState.memory.current_word,
      translation: pluginState.correctTranslation,
    };
    return { ...this._setupQuestion(pluginState.round, sameWordObj), lastResult: 'wrong' };
  }

  checkEndingCondition(pluginState) {
    if (RoundEngine.isFinished(pluginState.round)) {
      return {
        endingId: this.config.completeEndingId || 'learning_complete',
        endingType: '正向',
        keyEventTags: [],
      };
    }
    return null;
  }

  shouldTriggerInterrupt() {
    return null; // 學習模式不需要打斷/隨機事件
  }

  /**
   * 供 UI 顯示：目前第幾題/共幾題
   */
  getDisplayState(pluginState) {
    return {
      stats: { 進度: `${pluginState.round.currentRound}/${pluginState.round.totalRounds}` },
      tags: [],
    };
  }

  // ─────────────────────────────────────────────
  // 內部：建立一題的狀態（新題或同題重試皆呼叫此）
  // ─────────────────────────────────────────────
  _setupQuestion(round, wordObj) {
    const wrongs = StoryLearning.pickWrongOptions(wordObj?.id, 3);
    const correctLabel = StoryLearning.resolveLabel(wordObj?.translation);

    const choiceLabels = this._shuffle([
      { actionTag: 'answer_correct', label: correctLabel },
      ...wrongs.map((w, i) => ({
        actionTag: `answer_wrong_${i}`,
        label: StoryLearning.resolveLabel(w.translation),
      })),
    ]);

    return {
      round,
      wordId: wordObj?.id ?? null,
      correctTranslation: wordObj?.translation, // 保留原始（可能是多語系物件），供重試時重建 wordObj
      choiceLabels,
      lastResult: null,
      memory: { current_word: StoryLearning.resolveText(wordObj?.text) },
    };
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
