// DeductionPlugin.js
// 證據驅動玩法：偵探推理、推理辯論、感情找真相
// 組裝：SpaceNavigation（場景移動）+ EvidenceCollector（蒐證）
//      + ThreatSystem（被追殺/被發現風險）+ TestimonySystem（辯論子模式，可選）
//
// stage 序列：scene（現場勘查）→ investigate（查證/盤問，可循環）→ [可選] debate（辯論）
// 指認（accuse）不是獨立 stage，是終結行動，觸發後直接進 checkEndingCondition 判定

import * as SpaceNavigation  from '../shared/SpaceNavigation.js';
import * as EvidenceCollector from '../shared/EvidenceCollector.js';
import * as ThreatSystem     from '../shared/ThreatSystem.js';
import * as TestimonySystem  from '../shared/TestimonySystem.js';

export class DeductionPlugin {
  /**
   * @param {object} config
   * @param {string} config.pluginType
   * @param {string} [config.threatLevel]
   * @param {string} [config.entityType]   - 'murderer' | 'social_exposure'
   * @param {object} config.tagManager
   * @param {Array}  config.rooms          - [{ id, name, reqTags?: string[] }] 場景清單
   * @param {string} [config.startRoomId]
   * @param {Array}  config.npcs           - [{ id, name }] 可盤問對象
   * @param {object} [config.itemsPerRoom] - { [roomId]: string[] } 搜查可找到的證物 tag 池
   * @param {object} [config.questionEffects] - { [npcId]: string[] } 盤問可吐露的證物 tag 池
   * @param {boolean} [config.hasDebate]   - 是否有辯論子階段（呼叫端可依威脅骰選結果動態決定）
   * @param {object} [config.testimonyConfig] - hasDebate=true 時提供，見 TestimonySystem
   * @param {number} [config.minEvidenceToAccuse] - 幾個證物才能進入指認/辯論（預設 3）
   * @param {Array}  config.accuseCandidates - [{ requiredTags: string[], endingId, endingType }]
   * @param {string} [config.defaultAccuseEndingId] - 證物不足以匹配任何候選時的兜底結局
   * @param {string} [config.caughtEndingId] - 被威脅抓到（兇手發現/伴侶發現）觸發的結局
   * @param {object} [config.memory]
   */
  constructor(config) {
    this.config = config;
    this.tagManager = config.tagManager;
  }

  init() {
    const nav = SpaceNavigation.createState({
      rooms: this.config.rooms || [],
      startRoomId: this.config.startRoomId,
    });
    const evidence = EvidenceCollector.createState();
    const threat = this.config.threatLevel
      ? ThreatSystem.createState(this.config.threatLevel, this.config.entityType)
      : null;

    const pluginState = {
      nav,
      evidence,
      threat,
      testimony: null,
      phase: 'scene', // 'scene' | 'investigate' | 'debate'
      lastAction: null,
      finalAccuse: false,
      memory: this.config.memory || {},
    };

    return { stage: 'scene', pluginState };
  }

  getCurrentStage(pluginState) {
    return pluginState.phase;
  }

  getAvailableOptions(pluginState) {
    if (pluginState.phase === 'debate') {
      return this._debateOptions(pluginState);
    }
    return this._investigateOptions(pluginState);
  }

  getContextTags(pluginState) {
    return {
      worldTags: this.tagManager.getWorldTags(),
      stateTags: [...this.tagManager.getStateTags(), ...pluginState.evidence.collectedTags],
      tensionLevel: this.tagManager.getTensionLevel(),
    };
  }

  processAction(actionTag, pluginState) {
    let { nav, evidence, threat, testimony, phase } = pluginState;
    let finalAccuse = false;

    if (actionTag.startsWith('move:')) {
      nav = SpaceNavigation.moveToRoom(nav, actionTag.slice(5));
      if (threat) threat = ThreatSystem.tick(threat, 5);

    } else if (actionTag === 'search') {
      const pool = this.config.itemsPerRoom?.[nav.currentRoomId] || [];
      const notFound = pool.filter(t => !evidence.collectedTags.includes(t));
      if (notFound.length > 0) {
        evidence = EvidenceCollector.collect(evidence, notFound[Math.floor(Math.random() * notFound.length)]);
      }
      if (threat) threat = ThreatSystem.tick(threat, 10);

    } else if (actionTag.startsWith('question:')) {
      const npcId = actionTag.slice(9);
      const pool = this.config.questionEffects?.[npcId] || [];
      const notFound = pool.filter(t => !evidence.collectedTags.includes(t));
      if (notFound.length > 0) {
        evidence = EvidenceCollector.collect(evidence, notFound[Math.floor(Math.random() * notFound.length)]);
      }
      if (threat) threat = ThreatSystem.tick(threat, 6);

    } else if (actionTag === 'enter_debate') {
      phase = 'debate';
      testimony = TestimonySystem.createState(this.config.testimonyConfig);

    } else if (actionTag.startsWith('press:')) {
      testimony = TestimonySystem.pressStatement(actionTag.slice(6), testimony);

    } else if (actionTag.startsWith('contest:')) {
      const stmtId = actionTag.slice(8);
      const stmt = (this.config.testimonyConfig?.statements || []).find(s => s.id === stmtId);
      const requiredTag = stmt?.contradiction?.requiredEvidenceTag;
      const hasIt = requiredTag && EvidenceCollector.hasAllTags(evidence, [requiredTag]);
      const result = TestimonySystem.presentEvidence(stmtId, hasIt ? requiredTag : '__none__', testimony);
      testimony = result.testimonyState;
      if (result.result === 'wrong' && threat) {
        threat = ThreatSystem.tick(threat, 20); // 猜錯反駁，對方警覺，威脅上升
      }

    } else if (actionTag === 'proceed_to_accuse' || actionTag === 'accuse') {
      finalAccuse = true;
    }

    if (phase === 'scene') phase = 'investigate'; // 第一步之後離開 scene 階段

    if (threat) this.tagManager.setTension(threat.value);

    return { ...pluginState, nav, evidence, threat, testimony, phase, lastAction: actionTag, finalAccuse };
  }

  checkEndingCondition(pluginState) {
    const { threat, evidence, finalAccuse } = pluginState;

    if (threat && ThreatSystem.checkCaught(threat)) {
      return {
        endingId: this.config.caughtEndingId || 'deduction_caught_fail',
        endingType: '負向',
        keyEventTags: evidence.collectedTags,
      };
    }

    if (finalAccuse) {
      const candidate = EvidenceCollector.matchBestCandidate(evidence, this.config.accuseCandidates || []);
      if (candidate) {
        return {
          endingId: candidate.endingId,
          endingType: candidate.endingType || '正向',
          keyEventTags: evidence.collectedTags,
        };
      }
      return {
        endingId: this.config.defaultAccuseEndingId || 'deduction_misjudge_end',
        endingType: '中性',
        keyEventTags: evidence.collectedTags,
      };
    }

    return null;
  }

  shouldTriggerInterrupt(pluginState) {
    const { threat } = pluginState;
    if (!threat) return null;
    const ratio = threat.value / threat.catchThreshold;
    if (ratio >= 0.6 && Math.random() < 0.25) {
      return { direction: 'neg' }; // 兇手/對方逼近的警示插曲
    }
    return null;
  }

  /**
   * 供 UI 顯示：數值 + 玩家可見的證物 tag
   */
  getDisplayState(pluginState) {
    const { nav, evidence, threat } = pluginState;
    const roomName = this.config.rooms?.find(r => r.id === nav.currentRoomId)?.name ?? '';
    const stats = { 位置: roomName, 證物: evidence.collectedTags.length };
    if (threat) stats.威脅 = Math.round(threat.value);
    return { stats, tags: evidence.collectedTags };
  }

  // ─────────────────────────────────────────────
  // 內部：選項組裝
  // ─────────────────────────────────────────────

  _investigateOptions(pluginState) {
    const contextTags = [
      ...this.tagManager.getWorldTags(),
      ...this.tagManager.getStateTags(),
      ...pluginState.evidence.collectedTags,
    ];
    const rooms = SpaceNavigation.getAvailableRooms(pluginState.nav, contextTags);

    const options = [];
    rooms.forEach(r => {
      if (r.isCurrent || r.locked) return;
      options.push({ actionTag: `move:${r.id}`, label: `前往${r.name}` });
    });

    options.push({ actionTag: 'search', label: '搜查這裡' });

    (this.config.npcs || []).forEach(npc => {
      options.push({ actionTag: `question:${npc.id}`, label: `盤問${npc.name}` });
    });

    const enough = EvidenceCollector.hasCount(pluginState.evidence, this.config.minEvidenceToAccuse ?? 3);
    if (enough) {
      options.push(
        this.config.hasDebate
          ? { actionTag: 'enter_debate', label: '準備當面對質' }
          : { actionTag: 'accuse', label: '指認真相' }
      );
    }

    return options;
  }

  _debateOptions(pluginState) {
    const options = [];
    TestimonySystem.getTestimony(pluginState.testimony).forEach(t => {
      if (t.exposed) return;
      options.push({ actionTag: `press:${t.id}`, label: '追問這段證詞' });
      options.push({ actionTag: `contest:${t.id}`, label: '提出證據反駁' });
    });

    if (TestimonySystem.isFullyExposed(pluginState.testimony)) {
      options.push({ actionTag: 'proceed_to_accuse', label: '準備指認' });
    }

    return options;
  }
}
