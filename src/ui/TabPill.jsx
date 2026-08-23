/* src/ui/TabPill.jsx
 * 共用分頁／分類膠囊按鈕。
 *
 * variant="scroll"（預設）：只回傳一串按鈕，不含外層容器 —— 外層的捲動／背景／邊框
 * 交給呼叫端的頁面自己決定（各頁面目前的外層 wrapper 樣式不完全一樣，例如 Shop 的
 * filterBarStyle、Avatar 的 tabBarStyle，各自有自己的 padding/background，這裡不強加統一）。
 * 用於：商店分類、衣櫥分類、任務分類篩選、背包分類篩選。
 *
 * variant="segment"：連同外層膠囊背景容器一起回傳（目前 Stats／Task 的二選一切換
 * 用的是同一份 wrapper 樣式，沒有各自客製化的需求，直接內建，呼叫端不需要再包一層）。
 * 用於：Stats 的「能力分析/熱量監控」、Task 的「任務列表/榮譽成就」。
 */
import React from 'react';

export default function TabPill({ items, value, onChange, variant = 'scroll' }) {
  const buttons = items.map(({ value: v, label }) => (
    <button
      key={v}
      style={
        variant === 'segment'
          ? {
              ...segBtnStyle,
              background: value === v ? 'var(--color-correct, #227A59)' : 'transparent',
              color: value === v ? '#fff' : 'var(--text-muted, #8c6e52)',
            }
          : {
              ...pillBtnStyle,
              background: value === v ? 'var(--color-correct, #227A59)' : 'transparent',
              color: value === v ? '#fff' : 'var(--text-muted, #8c6e52)',
              border: value === v ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))',
            }
      }
      onClick={() => onChange(v)}
    >{label}</button>
  ));

  if (variant === 'segment') {
    return <div style={segmentWrapStyle}>{buttons}</div>;
  }
  return buttons;
}

/* ─── 樣式 ──────────────────────────────────────────── */
const pillBtnStyle = {
  flexShrink: 0, borderRadius: 50, padding: 'var(--space-xs) var(--space-sm)',
  fontWeight: 700, fontSize: 'var(--font-caption)', cursor: 'pointer',
  transition: 'var(--t-fast)', fontFamily: 'inherit', whiteSpace: 'nowrap',
};
const segmentWrapStyle = {
  flexShrink: 0, display: 'flex', background: 'var(--bg-box, rgba(0,0,0,0.035))',
  borderRadius: 50, padding: 'var(--space-xs)', margin: 'var(--space-xs) var(--space-md)',
};
const segBtnStyle = {
  flex: 1, border: 'none', borderRadius: 50, padding: 'var(--space-xs) 0',
  fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer',
  transition: 'var(--t-base)', fontFamily: 'inherit',
};