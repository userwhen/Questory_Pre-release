// RaisingPlugin.js
// 數值驅動玩法：養成、后宮養成、上位劇情、工作養成
// 組裝：RoundEngine（回合）+ TargetTracker（單一數值池/多目標好感度）
//      + CriticalGate（上位模式關鍵回合，可選）+ ThreatSystem（上位模式社交曝光風險，可選）

import * as RoundEngine    from '../shared/RoundEngine.js';
import * as TargetTracker  from '../shared/TargetTracker.js';
import * as ThreatSystem   from '../shared/ThreatSystem.js';
import * as CriticalGate   from '../shared/CriticalGate.js';

export class RaisingPlugin {
  /**
   * @param {object} config
   * @param {string} config.pluginType
   * @param {string} [config.threatLevel]  - 僅 social_climb 會有值
   * @param {string} [config.entityType]
   * @param {object} config.tagManager
   * @param {number} config.totalRounds
   * @param {object} config.targets        - { mode: 'single'|'multi', keys: string[] }
   * @param {Array}  config.actions        - [{ actionTag, label, targetKey, delta, threatDelta? }]
   * @param {object} [config.criticalRounds] - { [roundIndex]: { validTags: string[], failEndingId: string } }
   * @param {number} [config.eventChance]  - 0~1，每回合觸發特殊事件機率
   * @param {Array}  [config.events]       - [{ id, actions: [{ actionTag, label, targetKey, delta }] }]
   * @param {object} [config.routeEndings] - { [targetKey]: endingId } 最終數值最高的 key 對應結局
   * @param {string} [config.defaultEndingId]
   * @param {string} [config.exposedEndingId] - 威脅值破表（社交曝光）觸發的結局
   * @param {object} [config.memory]
   */
  constructor(config) {
    this.config = config;
    this.tagManager = config.tagManager;
  }

  init() {
    const round = RoundEngine.createState(this.config.totalRounds);
    const tracker = TargetTracker.createState(this.config.targets);
    const threat = this.config.threatLevel
      ? ThreatSystem.createState(this.config.threatLevel, this.config.entityType)
      : null;

    const pluginState = {
      round,
      tracker,
      threat,
      isEventRound: false,
      eventId: null,
      lastAction: null,
      criticalFail: null,
      memory: this.config.memory || {},
    };

    return { stage: 'loop', pluginState };
  }

  getCurrentStage(pluginState) {
    return pluginState.isEventRound ? `event_${pluginState.eventId}` : 'loop';
  }

  getAvailableOptions(pluginState) {
    if (pluginState.isEventRound) {
      const event = (this.config.events || []).find(e => e.id === pluginState.eventId);
      return (event?.actions || []).map(a => ({ actionTag: a.actionTag, label: a.label }));
    }

    // 關鍵回合不過濾選項——全部照常列出，玩家看不出哪個是正確答案，
    // 選對選錯留到 processAction 後由 CriticalGate 判定，維持懸疑感。
    return (this.config.actions || []).map(a => ({ actionTag: a.actionTag, label: a.label }));
  }

  getContextTags(pluginState) {
    return {
      worldTags: this.tagManager.getWorldTags(),
      stateTags: this.tagManager.getStateTags(),
      tensionLevel: this.tagManager.getTensionLevel(),
    };
  }

  processAction(actionTag, pluginState) {
    let { round, tracker, threat, isEventRound, eventId } = pluginState;

    // 1. 找出本次行動的效果定義
    const actionDef = isEventRound
      ? (this.config.events || []).find(e => e.id === eventId)?.actions.find(a => a.actionTag === actionTag)
      : (this.config.actions || []).find(a => a.actionTag === actionTag);

    if (actionDef) {
      tracker = TargetTracker.adjust(tracker, actionDef.targetKey, actionDef.delta);
      if (threat && actionDef.threatDelta) {
        threat = ThreatSystem.tick(threat, actionDef.threatDelta);
      }
    }

    // 2. 關鍵回合判定（僅非事件回合適用）
    const roundIdx = round.currentRound;
    const critical = this.config.criticalRounds?.[roundIdx];
    let criticalFail = null;
    if (critical && !isEventRound) {
      const gateResult = CriticalGate.evaluate(
        { validTags: critical.validTags, onFail: 'endGame', failEndingId: critical.failEndingId },
        actionTag
      );
      if (!gateResult.passed) {
        criticalFail = gateResult.endingId;
      }
    }

    // 3. 推進回合
    round = RoundEngine.advance(round);

    // 4. 決定下一回合是否為特殊事件
    const events = this.config.events || [];
    const isNextEvent = events.length > 0 && Math.random() < (this.config.eventChance ?? 0);
    const nextEventId = isNextEvent ? events[Math.floor(Math.random() * events.length)].id : null;

    if (threat) this.tagManager.setTension(threat.value);

    return {
      ...pluginState,
      round, tracker, threat,
      isEventRound: isNextEvent,
      eventId: nextEventId,
      lastAction: actionTag,
      criticalFail,
    };
  }

  checkEndingCondition(pluginState) {
    const { round, tracker, threat, criticalFail } = pluginState;

    if (criticalFail) {
      return { endingId: criticalFail, endingType: '負向', keyEventTags: [] };
    }

    if (threat && ThreatSystem.checkCaught(threat)) {
      return {
        endingId: this.config.exposedEndingId || 'raising_exposed_fail',
        endingType: '負向',
        keyEventTags: [],
      };
    }

    if (RoundEngine.isFinished(round)) {
      return this._resolveFinalEnding(tracker);
    }

    return null;
  }

  shouldTriggerInterrupt() {
    return null; // 特殊事件走自己的 event_${eventId} stage，不用 Hub 的打斷機制
  }

  /**
   * 供 UI 顯示：tracker 數值直接就是要顯示的數值列表
   */
  getDisplayState(pluginState) {
    return { stats: { ...pluginState.tracker.values }, tags: [] };
  }

  // ─────────────────────────────────────────────
  // 內部：依最終數值判定結局路線
  // ─────────────────────────────────────────────
  _resolveFinalEnding(tracker) {
    const highest = TargetTracker.getHighest(tracker);
    const endingId =
      (highest && this.config.routeEndings?.[highest.key]) ||
      this.config.defaultEndingId ||
      'raising_default_end';
    return {
      endingId,
      endingType: '中性',
      keyEventTags: highest ? [highest.key] : [],
    };
  }
}
