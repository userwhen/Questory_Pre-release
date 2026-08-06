// NarrativeEngine.js
// Hub Engine：調度各玩法 Plugin，透過 EventBus 與 UI 溝通
// 不含任何玩法規則本身 — 規則全部下放到 plugins/*.js
// 職責只有三件事：
//   1. 開場流程（精力檢查、威脅骰選、Plugin 初始化）
//   2. 主迴圈（抽劇情池片段 → 顯示 → 收玩家選擇 → 丟給 Plugin 處理 → 判斷結局/打斷）
//   3. Zustand 同步

import { EventBus } from '@/core/events.js';
import { Events }   from '@/core/event_types.js';
import { setState, getState } from '@/core/state.js';

import { TagManager }      from './TagManager.js';
import * as PluginRegistry from './PluginRegistry.js';
import { selectSnippet }   from './StoryPoolSelector.js';
import { fillTemplate }    from './VocabularyFiller.js';
import { resolveEnding }   from './EndingResolver.js';
import { StoryBridge }     from './StoryBridge.js';
import * as ThreatSystem   from './shared/ThreatSystem.js';

// ─────────────────────────────────────────────
// 事件常數（沿用 event_types.js 既有定義）
// ─────────────────────────────────────────────
const EVENTS = {
  START:     Events.Story.NARRATIVE_START,
  NODE:      Events.Story.NARRATIVE_NODE,
  END:       Events.Story.NARRATIVE_END,
  INTERRUPT: Events.Story.NARRATIVE_INTERRUPT,
};

// 需要開場威脅骰選的 pluginType（恆有威脅，只骰強弱）
const THREAT_ROLL_TYPES = new Set([
  'escape_room', 'horror',
  'deduction', 'deduction_debate', 'relationship_truth',
  'social_climb',
]);

// pluginType → entityType 預設對照（風味標籤，供劇情池比對用，options.entityTheme 可覆寫）
const ENTITY_TYPE_MAP = {
  escape_room:       'monster',
  horror:            null, // 必須由 options.entityTheme 指定：'ghost'|'monster'|'curse'|'killer' 等
  deduction:         'murderer',
  deduction_debate:  'murderer',
  relationship_truth:'social_exposure',
  social_climb:      'social_exposure',
};

// ─────────────────────────────────────────────
// NarrativeEngine
// ─────────────────────────────────────────────
export class NarrativeEngine {
  constructor() {
    this._tagManager = new TagManager(); // 唯一實例，建立 Plugin 時以參照傳入
    this._plugin = null;
    this._pluginState = null;
    this._pluginType = null;
    this._stage = null;
    this._pool = [];               // 目前遊玩用的劇情池，由 loadPool() 或 start(options.pool) 提供
    this._pluginConfigs = {};      // 各 pluginType 的遊戲參數設定（房間/回合數/行動清單等），由 loadPluginConfigs() 提供
    this._running = false;
    this._visitedSnippetIds = [];  // 本次探索已用過的片段 id（陣列，防重複，非 Set）

    this._pendingEnchant = null;   // enchant_task 等待中的狀態（StoryBridge 回呼用）
  }

  // ─────────────────────────────────────────────
  // 劇情池載入
  // ─────────────────────────────────────────────
  loadPool(pool) {
    this._pool = Array.isArray(pool) ? pool : [];
  }

  /**
   * 載入各 pluginType 的遊戲參數設定表
   * @param {object} configs - { [pluginType]: configObject }
   */
  loadPluginConfigs(configs) {
    this._pluginConfigs = configs || {};
  }

  // ─────────────────────────────────────────────
  // 公開 API：開始一次探索
  // ─────────────────────────────────────────────

  /**
   * @param {string} pluginType - 遊戲類別 key（見 PluginRegistry）
   * @param {object} [options]
   * @param {object} [options.pluginConfig] - 傳給 Plugin 的客製設定（targets/rooms/testimony/rounds 等）
   * @param {string} [options.entityTheme]  - 威脅風味覆寫（horror 類必填：'ghost'|'monster'|'curse'|'killer'）
   * @param {Array}  [options.pool]         - 本次使用的劇情池，不傳則用 loadPool() 已載入的
   */
  start(pluginType, options = {}) {
    if (this._running) return;

    // 精力檢查與消耗（-5⚡，與舊系統一致）
    const COST = 5;
    const gs = getState();
    if ((gs.story?.energy ?? 0) < COST) {
      EventBus.emit(Events.System.TOAST, '❌ 精力不足');
      return;
    }
    setState(s => ({
      story: { ...s.story, energy: Math.max(0, (s.story.energy ?? 0) - COST) },
    }));
    EventBus.emit(Events.Story.UPDATE_TOPBAR);

    // pending_enchant 檢查：若有未完成的祝福憑證先提醒玩家
    const pending = StoryBridge.checkPendingEnchant();
    if (pending) {
      EventBus.emit(Events.System.TOAST, '📜 你還有未完成的祝福試煉！');
      EventBus.emit(Events.Story.BIND_MODAL_OPEN, { optionRef: pending.optionRef });
      const unsub = EventBus.on(Events.Story.ENCHANT_RESOLVED, () => {
        unsub();
        StoryBridge.clearPendingEnchant();
        this._startNarrative(pluginType, options);
      });
      return;
    }

    this._startNarrative(pluginType, options);
  }

  /**
   * 隨機抽一個已註冊的 pluginType 開始探索：先抽家族，家族內再均分
   * learning 家族預設不進隨機池（它是獨立功能，不是探險主題），
   * 要包含它就傳 { includeLearning: true }——未來接上設定開關時，
   * 呼叫端傳 { includeLearning: 該設定值 } 即可，不用改這裡的邏輯
   * @param {object} [options] - 同 start() 的 options
   * @param {object} [choice]
   * @param {boolean} [choice.includeLearning] - 是否把 learning 家族也納入隨機池，預設 false
   * @param {string[]} [choice.familyPool] - 限定只從這些家族抽，不傳則用預設家族清單
   */
  startRandom(options = {}, { includeLearning = false, familyPool } = {}) {
    const allFamilies = PluginRegistry.listFamilies();
    const families = familyPool && familyPool.length > 0
      ? familyPool
      : allFamilies.filter(f => includeLearning || f !== 'learning');

    if (families.length === 0) return;
    const pickedFamily = families[Math.floor(Math.random() * families.length)];
    const candidates = PluginRegistry.listTypesInFamily(pickedFamily);
    if (candidates.length === 0) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    this.start(picked, options);
  }

  _startNarrative(pluginType, options = {}) {
    if (!PluginRegistry.isRegistered(pluginType)) {
      EventBus.emit(Events.System.TOAST, `❌ 未知的遊戲類別：${pluginType}`);
      return;
    }

    // ── 開場威脅骰選（恆有威脅，只骰強弱）──
    let threatLevel = null;
    let entityType = null;
    if (THREAT_ROLL_TYPES.has(pluginType)) {
      entityType = options.entityTheme || ENTITY_TYPE_MAP[pluginType] || 'unknown';
      threatLevel = ThreatSystem.rollLevel(pluginType, entityType);
    }

    // ── 初始化 ──
    this._running = true;
    this._pluginType = pluginType;
    if (options.pool) this._pool = options.pool;
    this._visitedSnippetIds = [];
    this._tagManager.reset();

    // ── 遊戲參數設定（提前查表，world tag 挑選也要用）──
    const baseConfig = this._pluginConfigs[pluginType] || {};

    // world tag：從 config.worldTagPool 隨機挑一組寫入，整局固定不變
    // worldTagPool 格式：string[][]，例如 [["world:醫院"], ["world:森林", "world:深夜"]]
    if (Array.isArray(baseConfig.worldTagPool) && baseConfig.worldTagPool.length > 0) {
      const pickedSet = baseConfig.worldTagPool[Math.floor(Math.random() * baseConfig.worldTagPool.length)];
      this._tagManager.addTags(pickedSet);
    }

    // entityType 寫入 state tag，供劇情池比對風味（不另開維度，走一般 tag 比對機制）
    if (entityType) {
      this._tagManager.addTag(`state:entity_${entityType}`);
    }

    // 共鳴注入：把近期任務標籤帶入初始 tag
    const resonanceTags = StoryBridge.getResonanceTags();
    if (resonanceTags.length > 0) {
      this._tagManager.addTags(resonanceTags);
    }

    // ── 建立 Plugin（自動合併該 pluginType 的預設參數設定，options.pluginConfig 可覆蓋）──
    this._plugin = PluginRegistry.create(pluginType, {
      ...baseConfig,
      ...(options.pluginConfig || {}),
      threatLevel,
      entityType,
      tagManager: this._tagManager,
    });

    const { stage, pluginState } = this._plugin.init();
    this._stage = stage;
    this._pluginState = pluginState;

    EventBus.emit(EVENTS.START, { pluginType, stage, threatLevel, entityType });

    this._syncToStore();
    this._outputCurrentNode();
  }

  // ─────────────────────────────────────────────
  // 公開 API：玩家選擇選項
  // ─────────────────────────────────────────────

  choose(actionTag) {
    if (!this._running || !this._plugin) return;

    // enchant_task 特殊選項：交給 StoryBridge 處理（沿用舊機制）
    if (actionTag === 'enchant_task') {
      this._pendingEnchant = { actionTag };
      EventBus.emit(Events.Story.BIND_MODAL_OPEN, { optionRef: { actionTag } });
      const unsub = EventBus.on(Events.Story.ENCHANT_RESOLVED, () => {
        unsub();
        this._pendingEnchant = null;
        this._advance(actionTag);
      });
      return;
    }

    this._advance(actionTag);
  }

  _advance(actionTag) {
    const prevTags = this._plugin.getDisplayState?.(this._pluginState)?.tags ?? [];

    // 1. Plugin 處理選項，更新私有狀態（不可變更新）
    this._pluginState = this._plugin.processAction(actionTag, this._pluginState);

    // 新增的 tag（道具/證物/情報）自動提示玩家
    const newTags = this._plugin.getDisplayState?.(this._pluginState)?.tags ?? [];
    newTags.filter(t => !prevTags.includes(t)).forEach(t => {
      const label = t.includes(':') ? t.substring(t.indexOf(':') + 1) : t;
      EventBus.emit(Events.System.TOAST, `🎒 獲得：${label}`);
    });

    // 2. 每次行動後即時檢查結局
    const endingCheck = this._plugin.checkEndingCondition(this._pluginState);
    if (endingCheck) {
      this._triggerEnding(endingCheck);
      return;
    }

    // 3. 更新目前 stage（動態決定，非固定陣列 index）
    this._stage = this._plugin.getCurrentStage(this._pluginState);

    // 4. 檢查是否觸發打斷/隨機事件（找不到對應劇情池內容時自動放棄，回歸正常流程）
    const interrupt = this._plugin.shouldTriggerInterrupt(this._pluginState);
    if (interrupt && this._tryOutputInterrupt(interrupt)) {
      return;
    }

    this._syncToStore();
    this._outputCurrentNode();
  }

  /**
   * 強制結束當前探索（外部呼叫用，例如玩家離開頁面）
   */
  abort() {
    this._running = false;
    this._plugin = null;
    this._pluginState = null;
    this._clearStore();
  }

  isRunning() { return this._running; }

  // ─────────────────────────────────────────────
  // 節點輸出
  // ─────────────────────────────────────────────

  _outputCurrentNode() {
    const { worldTags, stateTags, tensionLevel } = this._plugin.getContextTags(this._pluginState);
    const contextTags = [...worldTags, ...stateTags];

    let snippet = selectSnippet({
      pool: this._pool,
      pluginType: this._pluginType,
      stage: this._stage,
      contextTags,
      tensionLevel,
      visitedIds: this._visitedSnippetIds,
    });

    // 找不到全新片段時，允許重複抽已用過的（內容量不足時的最後防線，
    // 避免玩法明明還沒結束，卻因為文字庫不夠大而被迫提前收尾）
    if (!snippet) {
      snippet = selectSnippet({
        pool: this._pool,
        pluginType: this._pluginType,
        stage: this._stage,
        contextTags,
        tensionLevel,
        visitedIds: [],
      });
    }

    if (!snippet) {
      // 連重複抽都找不到 → 這個 stage 真的完全沒有任何內容，才強制收尾
      this._triggerEnding({ endingId: 'ending_anticlimactic', endingType: '中性' });
      return;
    }

    this._visitedSnippetIds.push(snippet.id);

    const memory = this._pluginState?.memory ?? {};
    const text = fillTemplate(snippet.text_template, worldTags, memory);
    const options = this._buildOptions(snippet);
    const vibe = this._resolveVibe(snippet, tensionLevel);

    EventBus.emit(EVENTS.NODE, {
      text,
      options,
      stage: this._stage,
      pluginType: this._pluginType,
      tensionLevel,
      vibe,
    });
  }

  /**
   * 嘗試輸出打斷節點。找不到對應劇情池內容時回傳 false，交還正常流程。
   */
  _tryOutputInterrupt(interrupt) {
    const interruptStage = `interrupt_${interrupt.direction}`;
    const { worldTags, stateTags, tensionLevel } = this._plugin.getContextTags(this._pluginState);
    const contextTags = [...worldTags, ...stateTags];

    const snippet = selectSnippet({
      pool: this._pool,
      pluginType: this._pluginType,
      stage: interruptStage,
      contextTags,
      tensionLevel,
      visitedIds: this._visitedSnippetIds,
    });

    if (!snippet) return false;

    this._visitedSnippetIds.push(snippet.id);
    const memory = this._pluginState?.memory ?? {};
    const text = fillTemplate(snippet.text_template, worldTags, memory);
    const options = this._buildOptions(snippet);
    const vibe = this._resolveVibe(snippet, tensionLevel);

    EventBus.emit(EVENTS.INTERRUPT, { direction: interrupt.direction });
    EventBus.emit(EVENTS.NODE, {
      text,
      options,
      stage: interruptStage,
      pluginType: this._pluginType,
      tensionLevel,
      vibe,
      isInterrupt: true,
    });

    this._syncToStore();
    return true;
  }

  /**
   * 計算本節點的情緒主題，優先級：片段自帶 vibe > tensionLevel 後備映射
   */
  _resolveVibe(snippet, tensionLevel) {
    if (snippet?.vibe) return snippet.vibe;
    const table = this._pluginType === 'horror'
      ? { '極限': 'horror', '高': 'dread', '中': 'tension', '低': 'calm' }
      : { '極限': 'dread', '高': 'dread', '中': 'tension', '低': 'calm' };
    return table[tensionLevel] || 'calm';
  }

  /**
   * 合併 Plugin 目前有效的行動 + 劇情池片段提供的文字包裝
   * Plugin 決定「現在能做什麼」，劇情池決定「這句話怎麼講」
   * @param {object} snippet - 劇情池片段，snippet.options: [{ action_tag, label }]
   */
  _buildOptions(snippet) {
    const validActions = this._plugin.getAvailableOptions(this._pluginState); // [{ actionTag, label }]
    const flavorMap = new Map(
      (snippet.options || []).map(o => [o.action_tag, o.label])
    );

    return validActions.map(a => ({
      actionTag: a.actionTag,
      label: flavorMap.get(a.actionTag) || a.label,
    }));
  }

  // ─────────────────────────────────────────────
  // 結局
  // ─────────────────────────────────────────────

  _triggerEnding(endingCheck) {
    this._running = false;

    const worldTags = this._tagManager.getWorldTags();
    const memory = this._pluginState?.memory ?? {};

    const resolved = resolveEnding({
      pool: this._pool,
      pluginType: this._pluginType,
      endingId: endingCheck.endingId,
      worldTags,
      memory,
    });

    // 養分萃取（StoryBridge 介面沿用舊參數名 plotTags，實際塞入 Plugin 吐出的 keyEventTags）
    StoryBridge._extractNutrientFromNarrative({
      genre: this._pluginType,
      endingType: endingCheck.endingType ?? '中性',
      plotTags: endingCheck.keyEventTags ?? [],
      tension: this._tagManager.getTension(),
    });

    const vibe = this._resolveEndingVibe(resolved.vibe, endingCheck.endingType);
    console.log(`[NE ending vibe] pluginType=${this._pluginType} endingId=${endingCheck.endingId} endingType=${endingCheck.endingType} snippetVibe=${resolved.vibe} finalVibe=${vibe}`);

    this._clearStore();

    EventBus.emit(EVENTS.END, {
      endingId: resolved.endingId,
      endingName: resolved.endingName,
      endingType: endingCheck.endingType,
      text: resolved.text,
      vibe,
    });
  }

  /**
   * 結局 vibe：片段自帶優先，否則依 endingType 給預設情緒，
   * 「負向」預設是 dread，只有 horror 家族才會是真的 horror（觸發亂碼效果）
   */
  _resolveEndingVibe(snippetVibe, endingType) {
    if (snippetVibe) return snippetVibe;
    if (endingType === '正向') return 'triumph';
    if (endingType === '負向') return this._pluginType === 'horror' ? 'horror' : 'dread';
    return 'calm';
  }

  // ─────────────────────────────────────────────
  // Zustand 同步
  // ─────────────────────────────────────────────

  _syncToStore() {
    const displayState = this._plugin?.getDisplayState?.(this._pluginState) ?? { stats: {}, tags: [] };
    setState(s => ({
      story: {
        ...s.story,
        narrative: {
          pluginType: this._pluginType,
          stage: this._stage,
          running: this._running,
          tension: this._tagManager.getTension(),
          tags: this._tagManager.snapshot(),
          displayState,
        },
      },
    }));
  }

  _clearStore() {
    setState(s => ({
      story: { ...s.story, narrative: null },
    }));
  }
}

// ─────────────────────────────────────────────
// 單例 export（全域共用一個引擎實例）
// ─────────────────────────────────────────────
export const narrativeEngine = new NarrativeEngine();

// EventBus 事件名稱常數，供 UI 層訂閱
export { EVENTS as NARRATIVE_EVENTS };