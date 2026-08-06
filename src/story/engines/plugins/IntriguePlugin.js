// IntriguePlugin.js
// 複合玩法：宮鬥（職場/宮廷/感情皆可套皮）
// 組裝：RoundEngine（回合）+ TargetTracker（自身地位值）+ AutoProgress（對手陰謀，自動推進）
//      + EvidenceCollector（打探對手情報）+ ThreatSystem（設計對手的曝光風險，強制開啟）
//
// 三種行動 kind：
//   'safe'    — 鞏固自身地位，無風險
//   'evidence'— 打探情報，累積證物供「拆穿對手」使用
//   'scheme'  — 暗中設計對手，成功機率制：成功削弱對手進度，失敗依 config 承擔威脅值或地位損失

import * as RoundEngine       from '../shared/RoundEngine.js';
import * as TargetTracker     from '../shared/TargetTracker.js';
import * as AutoProgress      from '../shared/AutoProgress.js';
import * as EvidenceCollector from '../shared/EvidenceCollector.js';
import * as ThreatSystem      from '../shared/ThreatSystem.js';

export class IntriguePlugin {
  /**
   * @param {object} config
   * @param {string} config.pluginType
   * @param {string} [config.threatLevel]  - Hub 未骰選時，Plugin 自己預設 '中'
   * @param {string} [config.entityType]
   * @param {object} config.tagManager
   * @param {number} config.totalRounds
   * @param {object} [config.selfTargets]  - { mode: 'single', keys: string[] }，預設 { mode:'single', keys:['地位'] }
   * @param {number} [config.rivalThreshold]   - 對手陰謀進度達此值 = 得逞，預設 100
   * @param {number} [config.rivalRatePerRound]- 對手每回合自動推進速率，預設 10
   * @param {Array}  config.actions        - [{ actionTag, label, kind, targetKey?, delta?,
   *                                            evidenceTag?, threatDelta?, successChance?,
   *                                            successEffect?, failEffect? }]
   * @param {string[]} [config.evidencePool]  - 'evidence' 類行動可打探到的情報 tag 池
   * @param {number} [config.minEvidenceToExpose] - 蒐證滿多少可主動拆穿對手，預設 3
   * @param {number} [config.statusWinThreshold]  - 自身地位值達此值直接獲勝，預設 100
   * @param {string} [config.exposeEndingId]
   * @param {string} [config.statusWinEndingId]
   * @param {string} [config.rivalWinEndingId]
   * @param {string} [config.selfExposedEndingId]
   * @param {string} [config.defaultEndingId]
   * @param {object} [config.memory]
   */
  constructor(config) {
    this.config = config;
    this.tagManager = config.tagManager;
  }

  init() {
    const round = RoundEngine.createState(this.config.totalRounds);
    const selfTracker = TargetTracker.createState(
      this.config.selfTargets || { mode: 'single', keys: ['地位'] }
    );
    const rivalProgress = AutoProgress.createState(
      this.config.rivalThreshold ?? 100,
      this.config.rivalRatePerRound ?? 10
    );
    const evidence = EvidenceCollector.createState();
    // 宮鬥的曝光風險不可關閉：Hub 沒骰選時，自己給一個預設等級
    const threat = ThreatSystem.createState(this.config.threatLevel || '中', this.config.entityType || 'exposure');

    const pluginState = {
      round,
      selfTracker,
      rivalProgress,
      evidence,
      threat,
      lastAction: null,
      memory: this.config.memory || {},
    };

    return { stage: 'loop', pluginState };
  }

  getCurrentStage() {
    return 'loop';
  }

  getAvailableOptions(pluginState) {
    const options = (this.config.actions || []).map(a => ({ actionTag: a.actionTag, label: a.label }));

    const enough = EvidenceCollector.hasCount(pluginState.evidence, this.config.minEvidenceToExpose ?? 3);
    if (enough) {
      options.push({ actionTag: 'expose', label: '當眾拆穿對手' });
    }

    return options;
  }

  getContextTags(pluginState) {
    return {
      worldTags: this.tagManager.getWorldTags(),
      stateTags: [...this.tagManager.getStateTags(), ...pluginState.evidence.collectedTags],
      tensionLevel: this.tagManager.getTensionLevel(),
    };
  }

  processAction(actionTag, pluginState) {
    let { round, selfTracker, rivalProgress, evidence, threat } = pluginState;

    const actionDef = (this.config.actions || []).find(a => a.actionTag === actionTag);

    if (actionDef) {
      if (actionDef.kind === 'safe') {
        selfTracker = TargetTracker.adjust(selfTracker, actionDef.targetKey, actionDef.delta);

      } else if (actionDef.kind === 'evidence') {
        const pool = this.config.evidencePool || [];
        const notFound = pool.filter(t => !evidence.collectedTags.includes(t));
        if (notFound.length > 0) {
          evidence = EvidenceCollector.collect(evidence, notFound[Math.floor(Math.random() * notFound.length)]);
        }
        if (actionDef.threatDelta) threat = ThreatSystem.tick(threat, actionDef.threatDelta);

      } else if (actionDef.kind === 'scheme') {
        const success = Math.random() < (actionDef.successChance ?? 0.5);
        if (success) {
          if (actionDef.successEffect?.rivalInterrupt) {
            rivalProgress = AutoProgress.interrupt(rivalProgress, actionDef.successEffect.rivalInterrupt);
          }
          if (actionDef.successEffect?.targetKey) {
            selfTracker = TargetTracker.adjust(
              selfTracker, actionDef.successEffect.targetKey, actionDef.successEffect.delta ?? 0
            );
          }
        } else {
          if (actionDef.failEffect?.threatDelta) {
            threat = ThreatSystem.tick(threat, actionDef.failEffect.threatDelta);
          }
          if (actionDef.failEffect?.targetKey) {
            selfTracker = TargetTracker.adjust(
              selfTracker, actionDef.failEffect.targetKey, actionDef.failEffect.delta ?? 0
            );
          }
        }
      }
    }

    // 不管玩家做什麼，對手陰謀每回合自動推進（本回合若有成功打斷，已在上面扣減過）
    rivalProgress = AutoProgress.tick(rivalProgress);
    round = RoundEngine.advance(round);

    this.tagManager.setTension(threat.value);

    return { ...pluginState, round, selfTracker, rivalProgress, evidence, threat, lastAction: actionTag };
  }

  checkEndingCondition(pluginState) {
    const { round, selfTracker, rivalProgress, evidence, threat, lastAction } = pluginState;

    // 1. 自己布局被抓包 → 立即出局
    if (ThreatSystem.checkCaught(threat)) {
      return {
        endingId: this.config.selfExposedEndingId || 'intrigue_self_exposed',
        endingType: '負向',
        keyEventTags: [],
      };
    }

    // 2. 蒐證滿了，主動拆穿對手 → 立即獲勝
    if (lastAction === 'expose' && EvidenceCollector.hasCount(evidence, this.config.minEvidenceToExpose ?? 3)) {
      return {
        endingId: this.config.exposeEndingId || 'intrigue_expose_win',
        endingType: '正向',
        keyEventTags: evidence.collectedTags,
      };
    }

    const statusHighest = TargetTracker.getHighest(selfTracker);

    // 3. 自身地位值達標 → 立即獲勝
    if (statusHighest && statusHighest.value >= (this.config.statusWinThreshold ?? 100)) {
      return {
        endingId: this.config.statusWinEndingId || 'intrigue_status_win',
        endingType: '正向',
        keyEventTags: [],
      };
    }

    // 4. 對手陰謀先得逞 → 失敗
    if (AutoProgress.isCompleted(rivalProgress)) {
      return {
        endingId: this.config.rivalWinEndingId || 'intrigue_rival_win',
        endingType: '負向',
        keyEventTags: [],
      };
    }

    // 5. 回合跑完，比較最終數值
    if (RoundEngine.isFinished(round)) {
      const won = statusHighest && statusHighest.value > rivalProgress.value;
      return {
        endingId: won
          ? (this.config.statusWinEndingId || 'intrigue_status_win')
          : (this.config.defaultEndingId || 'intrigue_draw_end'),
        endingType: won ? '正向' : '中性',
        keyEventTags: [],
      };
    }

    return null;
  }

  shouldTriggerInterrupt(pluginState) {
    const { rivalProgress } = pluginState;
    const ratio = rivalProgress.value / rivalProgress.threshold;
    if (ratio >= 0.7 && Math.random() < 0.3) {
      return { direction: 'neg' }; // 對手陰謀逼近完成的警示插曲
    }
    return null;
  }

  /**
   * 供 UI 顯示：自身地位值 + 對手陰謀進度 + 蒐集到的情報
   */
  getDisplayState(pluginState) {
    const highest = TargetTracker.getHighest(pluginState.selfTracker);
    return {
      stats: {
        地位: highest?.value ?? 0,
        對手陰謀: Math.round(pluginState.rivalProgress.value),
      },
      tags: pluginState.evidence.collectedTags,
    };
  }
}
