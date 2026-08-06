// EndingResolver.js
// 結局文字解析：只負責「ending_id → 劇情池抽結局文字」
// 勝負判定已收歸各 Plugin 的 checkEndingCondition()，這裡不再比對任何 tag 條件

import { fillTemplate } from './VocabularyFiller.js';

/**
 * 依 endingId 從劇情池抽取對應的結局文字外殼
 * 劇情池裡結局片段的慣例：stage === 'ending'，並帶 ending_id 欄位對應 Plugin 吐出的代碼
 * @param {object} params
 * @param {Array}  params.pool        - 劇情池
 * @param {string} params.pluginType
 * @param {string} params.endingId
 * @param {string[]} [params.worldTags]
 * @param {object}   [params.memory]
 * @returns {{ endingId: string, text: string }}
 */
export function resolveEnding({ pool, pluginType, endingId, worldTags = [], memory = {} }) {
  const candidates = (pool || []).filter(s =>
    s.stage === 'ending' &&
    Array.isArray(s.applicable_plugins) &&
    s.applicable_plugins.includes(pluginType) &&
    s.ending_id === endingId
  );

  if (candidates.length === 0) {
    // 劇情池還沒補上對應結局文字時的保底，不讓玩家卡在空白畫面
    return {
      endingId,
      endingName: endingId,
      text: '事情就這樣結束了。你整理了一下，轉身走了。有些故事，沒有漂亮的句點。',
      vibe: undefined,
    };
  }

  const snippet = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    endingId,
    endingName: snippet.ending_name || endingId,
    text: fillTemplate(snippet.text_template, worldTags, memory),
    vibe: snippet.vibe,
  };
}