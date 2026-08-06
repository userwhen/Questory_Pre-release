// SpacePlugin.js
// 空間驅動玩法：密室逃脫、恐怖逃脫解謎
// 組裝：SpaceNavigation（房間移動/蒐集）+ ThreatSystem（威脅/追擊，預設開啟）

import * as SpaceNavigation from '../shared/SpaceNavigation.js';
import * as ThreatSystem    from '../shared/ThreatSystem.js';

export class SpacePlugin {
  /**
   * @param {object} config
   * @param {string} config.pluginType
   * @param {string} [config.threatLevel]      - '低'|'中'|'高'，Hub 開場骰選後傳入
   * @param {string} [config.entityType]
   * @param {object} config.tagManager         - Hub 共用的 TagManager 實例
   * @param {Array}  config.rooms              - [{ id, name, reqTags?: string[] }]
   * @param {string} [config.startRoomId]
   * @param {string} config.exitRoomId         - 抵達此房間 + 集滿 requiredKeyTags 才能觸發離開
   * @param {string[]} [config.requiredKeyTags]- 離開所需的證物/鑰匙 tag 組合（建議用 'state:' 前綴）
   * @param {object} [config.itemsPerRoom]     - { [roomId]: string[] } 該房間可搜到的 tag 池
   * @param {string} [config.successEndingId]
   * @param {string} [config.catchEndingId]
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

    const threat = this.config.threatLevel
      ? ThreatSystem.createState(this.config.threatLevel, this.config.entityType)
      : null;

    const pluginState = {
      nav,
      threat,
      hasEntered: false,
      lastAction: null,
      memory: this.config.memory || {},
    };

    return { stage: 'start', pluginState };
  }

  getCurrentStage(pluginState) {
    return pluginState.hasEntered ? 'loop' : 'start';
  }

  getAvailableOptions(pluginState) {
    const contextTags = this._collectTagsForNav(pluginState);
    const rooms = SpaceNavigation.getAvailableRooms(pluginState.nav, contextTags);

    const options = [];
    rooms.forEach(r => {
      if (r.isCurrent || r.locked) return;
      options.push({ actionTag: `move:${r.id}`, label: `前往${r.name}` });
    });

    options.push({ actionTag: 'search', label: '搜查這裡' });

    const canExit =
      pluginState.nav.currentRoomId === this.config.exitRoomId &&
      SpaceNavigation.hasAllTags(pluginState.nav, this.config.requiredKeyTags || []);
    if (canExit) {
      options.push({ actionTag: 'exit', label: '離開此地' });
    }

    return options;
  }

  getContextTags(pluginState) {
    return {
      worldTags: this.tagManager.getWorldTags(),
      stateTags: [...this.tagManager.getStateTags(), ...pluginState.nav.collectedTags],
      tensionLevel: this.tagManager.getTensionLevel(),
    };
  }

  processAction(actionTag, pluginState) {
    let { nav, threat } = pluginState;

    if (actionTag.startsWith('move:')) {
      const roomId = actionTag.slice(5);
      nav = SpaceNavigation.moveToRoom(nav, roomId);
      if (threat) threat = ThreatSystem.tick(threat, 8);
    } else if (actionTag === 'search') {
      const pool = this.config.itemsPerRoom?.[nav.currentRoomId] || [];
      const notYetFound = pool.filter(tag => !nav.collectedTags.includes(tag));
      if (notYetFound.length > 0) {
        const found = notYetFound[Math.floor(Math.random() * notYetFound.length)];
        nav = SpaceNavigation.collectTag(nav, found);
      }
      if (threat) threat = ThreatSystem.tick(threat, 12); // 搜查逗留，威脅升更快
    }
    // actionTag === 'exit'：不改變 nav/threat，交給 checkEndingCondition 判定

    if (threat) this.tagManager.setTension(threat.value);

    return { ...pluginState, nav, threat, hasEntered: true, lastAction: actionTag };
  }

  checkEndingCondition(pluginState) {
    const { nav, threat, lastAction } = pluginState;

    if (threat && ThreatSystem.checkCaught(threat)) {
      return {
        endingId: this.config.catchEndingId || 'space_caught_fail',
        endingType: '負向',
        keyEventTags: nav.collectedTags,
      };
    }

    const reachedExit =
      lastAction === 'exit' &&
      nav.currentRoomId === this.config.exitRoomId &&
      SpaceNavigation.hasAllTags(nav, this.config.requiredKeyTags || []);
    if (reachedExit) {
      return {
        endingId: this.config.successEndingId || 'space_escape_success',
        endingType: '正向',
        keyEventTags: nav.collectedTags,
      };
    }

    return null;
  }

  shouldTriggerInterrupt(pluginState) {
    const { threat } = pluginState;
    if (!threat) return null;
    const ratio = threat.value / threat.catchThreshold;
    if (ratio >= 0.6 && Math.random() < 0.3) {
      return { direction: 'neg' }; // 威脅逼近的警示插曲
    }
    return null;
  }

  /**
   * 供 UI 顯示：數值 + 玩家可見的道具/證物 tag
   */
  getDisplayState(pluginState) {
    const { nav, threat } = pluginState;
    const roomName = this.config.rooms?.find(r => r.id === nav.currentRoomId)?.name ?? '';
    const stats = { 位置: roomName };
    if (threat) stats.威脅 = Math.round(threat.value);
    return { stats, tags: nav.collectedTags };
  }

  _collectTagsForNav(pluginState) {
    return [
      ...this.tagManager.getWorldTags(),
      ...this.tagManager.getStateTags(),
      ...pluginState.nav.collectedTags,
    ];
  }
}
