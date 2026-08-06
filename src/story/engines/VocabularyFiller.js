// VocabularyFiller.js
// 將框架 template 中的 {佔位符} 替換為詞彙庫詞彙
// 支援多父節點聯集抽取（環境元素組合）
// 支援代名詞系統：{main_他} {main_他的} {main_他們} / {partner_他} 等

import {
  WORLD_VOCAB,
  DESC_VOCAB,
  STATE_VOCAB,
  PLACEHOLDER_MAP,
  WORLD_TAG_TO_VOCAB_KEY,
} from '@/story/data/data_vocabulary.js';

// ─────────────────────────────────────────────
// 代名詞展開表
// ─────────────────────────────────────────────

// 性別 → 各形式對應
const PRONOUN_TABLE = {
  m: { '他': '他', '他的': '他的', '他們': '他們' },
  f: { '他': '她', '他的': '她的', '他們': '她們' },
  n: { '他': '牠', '他的': '牠的', '他們': '牠們' },
};

// 支援的代名詞形式
const PRONOUN_FORMS = ['他們', '他的', '他']; // 注意順序：長的先匹配

/**
 * 展開 memory 中的代名詞佔位符
 * 支援格式：{main_他} {main_他的} {main_他們}
 *           {partner_他} {partner_他的} {partner_他們}
 *           {threat_他} 等
 * @param {string} placeholder
 * @param {object} memory
 * @returns {string|null}
 */
function resolvePronoun(placeholder, memory) {
  // 格式：{角色_代名詞形式}
  // 例：main_他 / partner_他的 / threat_他們
  const parts = placeholder.split('_');
  if (parts.length < 2) return null;

  // 可能有底線的角色名（目前只有 main / partner / threat）
  const role = parts[0];
  const form = parts.slice(1).join('_'); // 防止未來角色名帶底線

  const genderKey = `${role}_gender`;
  const gender = memory[genderKey];
  if (!gender) return null;

  const table = PRONOUN_TABLE[gender];
  if (!table) return null;

  // 尋找匹配的代名詞形式
  for (const f of PRONOUN_FORMS) {
    if (form === f) return table[f];
  }
  return null;
}

// ─────────────────────────────────────────────
// 主要 export
// ─────────────────────────────────────────────

/**
 * 填充框架 template
 * @param {string} template - 含 {佔位符} 的框架文字
 * @param {string[]} activeWorldTags - 當前啟用的 world tag 清單
 * @param {object} memory - skeleton.memory（角色記憶）
 * @returns {string} 填充後的文字
 */
export function fillTemplate(template, activeWorldTags = [], memory = {}) {
  if (!template) return '';

  // 每次 fillTemplate 呼叫前，先快取本次的隨機代名詞
  // 同一節點內相同角色的代名詞保持一致
  const pronounCache = {};

  return template.replace(/\{([^}]+)\}/g, (match, placeholder) => {
    // 1. 優先查 skeleton.memory（角色記憶，例如 main / partner / location）
    if (memory[placeholder] !== undefined && memory[placeholder] !== null) {
      return String(memory[placeholder]);
    }

    // 2. 代名詞佔位符（{main_他} {partner_他的} 等）
    if (pronounCache[placeholder] !== undefined) {
      return pronounCache[placeholder];
    }
    const pronoun = resolvePronoun(placeholder, memory);
    if (pronoun !== null) {
      pronounCache[placeholder] = pronoun;
      return pronoun;
    }

    // 3. 查 PLACEHOLDER_MAP
    const word = resolvePlaceholder(placeholder, activeWorldTags);
    return word !== null ? word : match;
  });
}

/**
 * 解析單一佔位符，返回隨機詞彙
 * @param {string} placeholder
 * @param {string[]} activeWorldTags
 * @returns {string|null}
 */
export function resolvePlaceholder(placeholder, activeWorldTags = []) {
  // 優先查 PLACEHOLDER_MAP
  const mapping = PLACEHOLDER_MAP[placeholder];
  if (mapping) {
    const pool = getVocabPool(mapping.source, mapping.key);
    return pool.length > 0 ? randomPick(pool) : null;
  }

  // 嘗試從 WORLD_VOCAB 直接查（e.g. 框架直接用地點名當佔位符）
  const worldKey = placeholder;
  if (WORLD_VOCAB[worldKey]) {
    return randomPick(WORLD_VOCAB[worldKey]);
  }

  // 找不到 → 保留原始標記供 debug
  return null;
}

/**
 * 從指定 source + key 取得詞彙池
 */
export function getVocabPool(source, key) {
  switch (source) {
    case 'world': return WORLD_VOCAB[key] || [];
    case 'desc':  return DESC_VOCAB[key]  || [];
    case 'state': return STATE_VOCAB[key] || [];
    default:      return [];
  }
}

/**
 * 根據當前啟用的 world tags 建立子詞彙聯集
 */
export function buildUnionPool(activeWorldTags) {
  const poolSet = new Set();
  activeWorldTags.forEach(tag => {
    const vocabKey = WORLD_TAG_TO_VOCAB_KEY[tag];
    if (vocabKey && WORLD_VOCAB[vocabKey]) {
      WORLD_VOCAB[vocabKey].forEach(word => poolSet.add(word));
    }
  });
  return [...poolSet];
}

/**
 * 填充結局 text_template
 */
export function fillEndingTemplate(template, activeWorldTags = [], memory = {}) {
  return fillTemplate(template, activeWorldTags, memory);
}

// ─────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────

function randomPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
