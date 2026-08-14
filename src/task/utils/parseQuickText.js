/**
 * 隨手記文字解析（純函式，不綁 React / EventBus）
 *
 * 規則：
 * - 第一非空行若非 ** / 數字. → 當 title（可選前導 /）
 * - 第一行若是 ** 或 數字. → title 固定「新任務」，整段走標記
 * - ** → desc；^\d+. → subs；其餘 → desc
 * - 僅一行 → 只有 title、無 desc
 */

const MARKER_TITLE = '新任務';

/**
 * @param {string} text
 * @returns {{ title: string, desc: string, subs: Array<{ text: string, done: boolean }> } | null}
 *          null 表示無有效內容（全空白）
 */
export function parseQuickText(text) {
  if (typeof text !== 'string') return null;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  const isMarkerLine = (line) =>
    line.startsWith('**') || /^\d+\./.test(line);

  let title;
  let startIdx;

  if (isMarkerLine(lines[0])) {
    title = MARKER_TITLE;
    startIdx = 0; // 第一行也走標記規則
  } else {
    title = lines[0].startsWith('/')
      ? lines[0].substring(1).trim()
      : lines[0];
    startIdx = 1;
  }

  if (!title) {
    title = MARKER_TITLE;
  }

  let desc = '';
  const subs = [];

  for (let i = startIdx; i < lines.length; i++) {
    const t = lines[i];
    if (t.startsWith('**')) {
      const part = t.substring(2).trim();
      if (part) desc = desc ? desc + '\n' + part : part;
    } else if (/^\d+\./.test(t)) {
      const subText = t.replace(/^\d+\./, '').trim();
      if (subText) subs.push({ text: subText, done: false });
    } else {
      desc = desc ? desc + '\n' + t : t;
    }
  }

  return { title, desc, subs };
}
