// PluginRegistry.js
// pluginType 字串 → Plugin class 對照表
// NarrativeEngine（Hub）只透過這裡動態建立 Plugin 實例，不直接 import 任何特定 Plugin
//
// 同一個 Plugin class 可以被多個 pluginType 共用（換皮），
// 差異完全由 create() 傳入的 config 決定（targets.mode / hasDebate / criticalRounds 等）

import { SpacePlugin }     from './plugins/SpacePlugin.js';
import { DeductionPlugin } from './plugins/DeductionPlugin.js';
import { RaisingPlugin }   from './plugins/RaisingPlugin.js';
import { IntriguePlugin }  from './plugins/IntriguePlugin.js';
import { LearningPlugin }  from './plugins/LearningPlugin.js';

const REGISTRY = {
  // ── Space 家族：密室逃脫、恐怖逃脫解謎 ──
  escape_room: SpacePlugin,
  horror:      SpacePlugin,

  // ── Deduction 家族：偵探推理、推理辯論、感情找真相 ──
  deduction:          DeductionPlugin,
  deduction_debate:   DeductionPlugin,
  relationship_truth: DeductionPlugin,

  // ── Raising 家族：養成、后宮養成、上位劇情、工作養成 ──
  raising:      RaisingPlugin,
  harem:        RaisingPlugin,
  social_climb: RaisingPlugin,
  career:       RaisingPlugin,

  // ── Intrigue 家族：宮鬥 ──
  intrigue: IntriguePlugin,

  // ── Learning 家族：語言學習 ──
  learning: LearningPlugin,
};

// pluginType 依家族分組，供隨機抽選（先抽家族、家族內再均分）等場景使用
// 這是家族分組的唯一真相來源，NarrativeEngine 的 startRandom() 透過下方 export 取用，不重複定義
const FAMILIES = {
  space:     ['escape_room', 'horror'],
  deduction: ['deduction', 'deduction_debate', 'relationship_truth'],
  raising:   ['raising', 'harem', 'social_climb', 'career'],
  intrigue:  ['intrigue'],
  learning:  ['learning'],
};

/**
 * 取得所有家族名稱
 */
export function listFamilies() {
  return Object.keys(FAMILIES);
}

/**
 * 取得指定家族底下的 pluginType 清單
 */
export function listTypesInFamily(family) {
  return FAMILIES[family] || [];
}

/**
 * 建立指定 pluginType 的 Plugin 實例
 * @param {string} pluginType
 * @param {object} config - 傳給 Plugin 的設定（threatLevel、entityType、targets、criticalRounds 等）
 * @returns {object} Plugin 實例
 */
export function create(pluginType, config = {}) {
  const PluginClass = REGISTRY[pluginType];
  if (!PluginClass) {
    throw new Error(`[PluginRegistry] 未註冊的 pluginType: ${pluginType}`);
  }
  return new PluginClass({ ...config, pluginType });
}

/**
 * 查詢某 pluginType 是否已註冊
 */
export function isRegistered(pluginType) {
  return pluginType in REGISTRY;
}

/**
 * 取得所有已註冊的 pluginType 清單（供隨機挑選/UI 選單使用）
 */
export function listPluginTypes() {
  return Object.keys(REGISTRY);
}