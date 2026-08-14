#!/usr/bin/env node
// codemod_ui_tokens.mjs
// 自動修正 UI 硬寫數值 → 改用 token。預設 dry-run（只出報告，不寫檔），加 --write 才真的寫回檔案。
//
// 修正機制分兩種：
//  A. 精確比對換用（不改變實際渲染值）：color / radius / shadow / z-index
//     —— 硬寫值剛好等於某個既有 token 的定義值，就直接換成 var(--token)
//  B. 收斂到既定 scale（會微調實際數值，本輪對話已定案）：fontSize / spacing / dimension(icon尺寸)
//
// 明確不自動修正（樣本太小 / 尚無定案 token / 風險高，只留在報告中供人工判斷）：
//     lineHeight, letterSpacing, borderWidth, transform角度, 動態值(模板字串/三元運算)
//
// 用法：
//   node codemod_ui_tokens.mjs <src路徑> <style.css路徑> <theme.css路徑> [--write]

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const positional = args.filter(a => !a.startsWith('--'));
const [SRC_DIR, STYLE_CSS, THEME_CSS] = positional;

if (!SRC_DIR || !STYLE_CSS || !THEME_CSS) {
  console.error('用法: node codemod_ui_tokens.mjs <src路徑> <style.css> <theme.css> [--write]');
  process.exit(1);
}

// ========================================================================
// 1. 動態解析 style.css 的 :root token（不寫死數值，跟實際專案永遠同步）
// ========================================================================
function parseRootTokens(cssText) {
  const rootMatch = cssText.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!rootMatch) return {};
  const body = rootMatch[1];
  const tokens = {};
  const declRe = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = declRe.exec(body)) !== null) tokens[m[1]] = m[2].trim();
  return tokens;
}

const styleCssText = fs.readFileSync(STYLE_CSS, 'utf8');
const rootTokens = parseRootTokens(styleCssText);

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const RGB_RE = /^rgba?\(/;
function isColorValue(v) { return HEX_RE.test(v) || RGB_RE.test(v); }
function normColor(v) { return v.trim().toLowerCase().replace(/\s+/g, ''); }
function normNum(v) { return v.trim().replace(/\s+/g, ' '); }

function buildColorMap(tokenObj) {
  // value -> [tokenName, ...]（保留全部候選，交由呼叫端依屬性語意挑選，不再「先到先贏」）
  const map = new Map();
  for (const [name, value] of Object.entries(tokenObj)) {
    if (isColorValue(value.trim())) {
      const key = normColor(value);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(name);
    }
  }
  return map;
}

// 顏色自動修正範圍刻意收窄：只認 --color-*（例如 --color-gold、--color-danger）這組
// 「通用調色盤」token——這些本來就設計給任何元件重用。
// --bg-*/--text-*/--border-*/--nav-* 這類「掛著特定元件語意」的 token 一律不參與自動配對，
// 即使數值剛好相同也不猜（實測發現 avatar 背景色 #3b2519 剛好等於 --bg-modal-head，
// 若照數值硬換會變成語意錯誤的耦合——只是「這次顏色恰好一樣」不代表「這裡該用modal的token」）。
// 這些留在報告的 skip 清單，交由人工判斷是否要新增/沿用哪個既有 token。
function pickColorToken(candidates) {
  if (!candidates || candidates.length === 0) return null;
  const match = candidates.find(name => name.startsWith('--color-'));
  return match || null;
}
function buildPrefixMap(tokenObj, prefix) {
  const map = new Map();
  for (const [name, value] of Object.entries(tokenObj)) {
    if (name.startsWith(prefix)) map.set(normNum(value), name);
  }
  return map;
}

const rootColorMap = buildColorMap(rootTokens);
const radiusMap = buildPrefixMap(rootTokens, '--radius-');
const shadowMap = buildPrefixMap(rootTokens, '--shadow');
const zIndexMap = buildPrefixMap(rootTokens, '--z-');

// ========================================================================
// 2. 解析 theme.css 的每個主題 token 覆寫區塊（給顏色做「主題感知」比對用）
// ========================================================================
function splitTopLevelBlocks(cssText) {
  // 簡單大括號配對切區塊，跳過 @keyframes 內容（避免誤判 transform 百分比關鍵影格）
  const blocks = [];
  let i = 0;
  while (i < cssText.length) {
    const open = cssText.indexOf('{', i);
    if (open === -1) break;
    let depth = 1, j = open + 1;
    while (j < cssText.length && depth > 0) {
      if (cssText[j] === '{') depth++;
      else if (cssText[j] === '}') depth--;
      j++;
    }
    const selector = cssText.slice(i, open).trim();
    const bodyStart = open + 1;
    const bodyEnd = j - 1;
    blocks.push({ selector, bodyStart, bodyEnd, body: cssText.slice(bodyStart, bodyEnd) });
    i = j;
  }
  return blocks;
}

const themeCssText = fs.readFileSync(THEME_CSS, 'utf8');
const themeBlocks = splitTopLevelBlocks(themeCssText);

const perThemeColorMap = {}; // { harem: Map(normColor -> tokenName) }
for (const b of themeBlocks) {
  if (b.selector.startsWith('@')) continue; // @keyframes 等跳過
  const isDefBlock = /^--[a-zA-Z0-9-]+\s*:/.test(b.body.trim()) && /body\.theme-/.test(b.selector);
  const themeMatch = b.selector.match(/theme-([a-z]+)/);
  if (!themeMatch) continue;
  const themeName = themeMatch[1];
  if (isDefBlock) {
    const decls = {};
    const declRe = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
    let m;
    while ((m = declRe.exec(b.body)) !== null) decls[m[1]] = m[2].trim();
    perThemeColorMap[themeName] = buildColorMap({ ...rootTokens, ...decls }); // 該主題覆寫值優先，未覆寫的沿用 root
  }
}
function effectiveColorMapFor(selector) {
  const m = selector.match(/theme-([a-z]+)/);
  if (m && perThemeColorMap[m[1]]) return perThemeColorMap[m[1]];
  return rootColorMap;
}

// ========================================================================
// 3. 字級三層 / 間距 scale / icon尺寸 scale（本輪對話定案的邊界與數值）
// ========================================================================
const FONT_CAPTION = '--font-caption';
const FONT_BODY = '--font-body';
const FONT_TITLE = '--font-title';
// fontSize >= 1.4rem 才進「展示」scale，且只挑 sm/md/lg/xl（xs保留給icon尺寸専用，避免比文字階層還小的怪結果）
const SIZE_TOKENS_TEXT = [['--size-sm', 2], ['--size-md', 3], ['--size-lg', 3.75], ['--size-xl', 5]];
const SIZE_TOKENS_DIM = [['--size-xs', 19.2], ['--size-sm', 32], ['--size-md', 48], ['--size-lg', 60], ['--size-xl', 80]];
const SPACING_SCALE = [['--space-xs', 8], ['--space-sm', 12], ['--space-md', 16], ['--space-lg', 20], ['--space-xl', 24], ['--space-2xl', 32]];
const SPACING_SNAP_THRESHOLD = 4; // px，超過這個距離就不自動動，交人工判斷

function nearest(list, val) {
  let best = null, bestDist = Infinity;
  for (const [name, v] of list) {
    const d = Math.abs(v - val);
    if (d < bestDist) { bestDist = d; best = { name, dist: d }; }
  }
  return best;
}
function pxToRem(str) {
  const m = str.trim().match(/^(-?[\d.]+)(px|rem)$/);
  if (!m) return null;
  return m[2] === 'px' ? parseFloat(m[1]) / 16 : parseFloat(m[1]);
}
function pxToPx(str) {
  const m = str.trim().match(/^(-?[\d.]+)px$/);
  return m ? parseFloat(m[1]) : null;
}

function resolveFontSize(raw) {
  const rem = pxToRem(raw);
  if (rem === null) return null;
  if (rem < 0.79) return `var(${FONT_CAPTION})`;
  if (rem < 0.98) return `var(${FONT_BODY})`;
  if (rem < 1.4) return `var(${FONT_TITLE})`;
  return `var(${nearest(SIZE_TOKENS_TEXT, rem).name})`;
}
function resolveSpacingSingle(raw) {
  const px = pxToPx(raw);
  if (px === null || px === 0) return null; // 0 是合法特例，不上scale
  const n = nearest(SPACING_SCALE, px);
  if (n.dist > SPACING_SNAP_THRESHOLD) return null;
  return `var(${n.name})`;
}
function resolveSpacing(raw) {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return resolveSpacingSingle(parts[0]);
  const resolved = parts.map(p => (p === '0' || p === '0px') ? '0' : resolveSpacingSingle(p));
  if (resolved.some(r => r === null)) return null; // shorthand內只要有一節換不了就整條放棄，避免破壞語意
  return resolved.join(' ');
}
const DIMENSION_SNAP_THRESHOLD = 10; // px，離最近的尺寸太遠就不猜（防止誤判的極端值被硬套一個離譜的token）
function resolveDimension(raw) {
  const px = pxToPx(raw);
  if (px === null || px === 0 || px > 90) return null; // 超出icon/avatar合理範圍不碰，避免誤判版面尺寸
  const n = nearest(SIZE_TOKENS_DIM, px);
  if (n.dist > DIMENSION_SNAP_THRESHOLD) return null;
  return `var(${n.name})`;
}
function resolveRadius(raw) { const t = radiusMap.get(normNum(raw)); return t ? `var(${t})` : null; }
function resolveShadow(raw) { const t = shadowMap.get(normNum(raw)); return t ? `var(${t})` : null; }
function resolveZIndex(raw) { const t = zIndexMap.get(normNum(raw)); return t ? `var(${t})` : null; }

// ========================================================================
// 4. 類別 -> 屬性表 -> 處理函式
// ========================================================================
const AUTOFIX_RULES = [
  { cat: 'color', jsProps: ['color', 'backgroundColor', 'background', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'fill', 'stroke', 'outlineColor'], cssProps: ['color', 'background', 'background-color', 'border-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'fill', 'stroke', 'outline-color'], themed: true },
  { cat: 'radius', jsProps: ['borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'], cssProps: ['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius'], resolve: resolveRadius },
  { cat: 'shadow', jsProps: ['boxShadow', 'textShadow'], cssProps: ['box-shadow', 'text-shadow'], resolve: resolveShadow },
  { cat: 'zIndex', jsProps: ['zIndex'], cssProps: ['z-index'], resolve: resolveZIndex },
  { cat: 'fontSize', jsProps: ['fontSize'], cssProps: ['font-size'], resolve: resolveFontSize },
  { cat: 'spacing', jsProps: ['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'gap', 'rowGap', 'columnGap'], cssProps: ['padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'gap', 'row-gap', 'column-gap'], resolve: resolveSpacing },
  { cat: 'dimension', jsProps: ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'], cssProps: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'], resolve: resolveDimension },
];
const jsPropIndex = {}; const cssPropIndex = {};
for (const rule of AUTOFIX_RULES) {
  for (const p of rule.jsProps) jsPropIndex[p] = rule;
  for (const p of rule.cssProps) cssPropIndex[p] = rule;
}

function isRawValue(v) { return !/var\(\s*--/.test(v); }

// ========================================================================
// 5. 檔案走訪
// ========================================================================
function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, exts, out);
    } else if (exts.some(e => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const summary = {}; // cat -> {fixed, skippedNoMatch, skippedOutOfThreshold}
for (const rule of AUTOFIX_RULES) summary[rule.cat] = { fixed: 0, skipped: 0 };
const editsPerFile = {}; // file -> [{start,end,oldText,newText,cat}]  (絕對offset，稍後由後往前套用)
const fixLog = []; // 給報告用的清單

function queueEdit(file, start, end, oldText, newText, cat) {
  (editsPerFile[file] ||= []).push({ start, end, oldText, newText });
  summary[cat].fixed++;
  fixLog.push({ file, cat, old: oldText, new: newText });
}
function noteSkip(cat) { summary[cat].skipped++; }

// ---- JS/JSX ----
const jsPropsPattern = Object.keys(jsPropIndex).join('|');
function scanJSFile(file, text) {
  // (?<!-) 防止「line-height」「row-gap」這類 kebab-case CSS文字（例如字串裡拼HTML的 style="..."）
  // 被誤判成獨立的 height/gap 屬性——這種情境不是真正的 JS style object，不該被自動修正動到
  const re = new RegExp(`(?<!-)\\b(${jsPropsPattern})(\\s*:\\s*)(?:(['"\`])([^'"\`]*)\\3|(-?[\\d.]+)(?!\\w))`, 'gd');
  let m;
  while ((m = re.exec(text)) !== null) {
    const prop = m[1];
    const rule = jsPropIndex[prop];
    const isQuoted = m[3] !== undefined;
    let rawValue = isQuoted ? m[4] : m[5];
    if (rawValue === undefined) continue;
    if (/\$\{/.test(rawValue)) continue; // 動態值跳過

    let forResolve = rawValue;
    if (!isQuoted) {
      if (!['lineHeight', 'zIndex', 'opacity'].includes(prop)) forResolve = `${rawValue}px`;
    }
    if (!isRawValue(forResolve)) continue; // 已經是 var(--...) 了，不算違規也不算skip，直接跳過

    let replacement = null;
    if (rule.themed) {
      if (isColorValue(forResolve.trim())) {
        const candidates = rootColorMap.get(normColor(forResolve)); // JS端沒有主題scope概念，只比對root
        const tokenName = pickColorToken(candidates);
        replacement = tokenName ? `var(${tokenName})` : null;
      }
    } else if (rule.resolve) {
      replacement = rule.resolve(forResolve);
    }

    if (replacement) {
      const [vStart, vEnd] = isQuoted ? m.indices[4] : m.indices[5];
      const newText = isQuoted ? replacement : `'${replacement}'`; // bare number 換成字串要補引號
      queueEdit(file, vStart, vEnd, m[0], newText, rule.cat);
    } else if ((rule.themed && isColorValue(forResolve.trim())) || (!rule.themed && rule.resolve)) {
      noteSkip(rule.cat);
    }
  }
}

// ---- CSS ----
function scanCSSFile(file, text) {
  const blocks = splitTopLevelBlocks(text);
  const declRe = /([a-zA-Z-]+)\s*:\s*([^;{}]+);/gd;
  for (const b of blocks) {
    if (b.selector.startsWith('@')) continue; // @keyframes 等跳過
    const colorMap = effectiveColorMapFor(b.selector);
    declRe.lastIndex = 0;
    let m;
    while ((m = declRe.exec(b.body)) !== null) {
      const prop = m[1].trim();
      if (prop.startsWith('--')) continue; // token 定義本身絕不動
      const rule = cssPropIndex[prop];
      if (!rule) continue;
      const rawValue = m[2].trim();
      if (!isRawValue(rawValue)) continue; // 已經是 var() 了

      let replacement = null;
      if (rule.themed) {
        if (isColorValue(rawValue)) {
          const candidates = colorMap.get(normColor(rawValue));
          const tokenName = pickColorToken(candidates);
          replacement = tokenName ? `var(${tokenName})` : null;
        }
      } else if (rule.resolve) {
        replacement = rule.resolve(rawValue);
      }

      const absStart = b.bodyStart + m.indices[2][0];
      const absEnd = b.bodyStart + m.indices[2][1];
      if (replacement) {
        queueEdit(file, absStart, absEnd, rawValue, replacement, rule.cat);
      } else if ((rule.themed && isColorValue(rawValue)) || (!rule.themed && rule.resolve)) {
        noteSkip(rule.cat);
      }
    }
  }
}

const jsFiles = walk(SRC_DIR, ['.js', '.jsx']);
for (const f of jsFiles) scanJSFile(f, fs.readFileSync(f, 'utf8'));
scanCSSFile(STYLE_CSS, styleCssText);
scanCSSFile(THEME_CSS, themeCssText);

// ========================================================================
// 6. 套用修改（由後往前，避免offset位移）並輸出報告
// ========================================================================
let filesChanged = 0;
for (const [file, edits] of Object.entries(editsPerFile)) {
  edits.sort((a, b) => b.start - a.start);
  let text = fs.readFileSync(file, 'utf8');
  for (const e of edits) text = text.slice(0, e.start) + e.newText + text.slice(e.end);
  if (WRITE) {
    fs.writeFileSync(file, text, 'utf8');
    filesChanged++;
  } else {
    fs.writeFileSync(file + '.codemod-preview', text, 'utf8'); // dry-run也留一份預覽檔方便比對
    filesChanged++;
  }
}

const report = {
  mode: WRITE ? 'write' : 'dry-run',
  scannedFiles: { js: jsFiles.length, css: 2 },
  filesWithChanges: Object.keys(editsPerFile).length,
  byCategory: summary,
  excludedFromAutofix: ['lineHeight', 'letterSpacing', 'borderWidth', 'angle(transform rotate)', 'dynamic values (template literals / ternary)'],
};
fs.writeFileSync('codemod_report.json', JSON.stringify({ report, fixLog }, null, 2));
console.log(JSON.stringify(report, null, 2));
