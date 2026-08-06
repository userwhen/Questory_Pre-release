/* src/components/ui/Modal.jsx */
import React from 'react';
import { maskStyle, modalStyle, modalHeadStyle, closeXStyle, modalFootStyle } from '@/styles/modalStyles.js';

/**
 * 共用 Modal 殼層：mask + 卡片 + 標題列(含 ✕) + 內容 + 可選的 footer。
 * 涵蓋大部分「標題 + ✕ + 內容 + 底部按鈕列」形狀的彈窗；
 * 少數版面差異較大的（例如 ConfirmDialog 那種純置中訊息框）不套用這個，繼續保留自己的結構即可。
 *
 * props:
 *   title      - 標題文字
 *   onClose    - 點遮罩或 ✕ 時觸發
 *   children   - 內容區
 *   footer     - 可選，底部按鈕列（不給就不渲染 modalFootStyle 那塊）
 *   maxWidth   - 可選，覆蓋預設的 modalStyle.maxWidth
 *   bodyStyle  - 可選，覆蓋內容區的 padding 等樣式
 *   zIndex     - 可選，覆蓋遮罩的 z-index（巢狀 Modal，例如疊在另一個 Modal 之上時使用）
 */
export default function Modal({ title, onClose, children, footer, maxWidth, bodyStyle, zIndex }) {
  const overlayStyle = zIndex ? { ...maskStyle, zIndex } : maskStyle;
  const style = maxWidth ? { ...modalStyle, maxWidth } : modalStyle;

  return (
    <div style={overlayStyle} onClick={onClose}>
      {/* modalStyle 的 animation 指向 modalFadeIn，這裡自帶定義，
          就算專案別處的全域 CSS 已經定義過也沒關係（重複定義不會報錯，後面的生效） */}
      <style>{'@keyframes modalFadeIn { from { opacity:0; transform:scale(0.9) translateY(14px); } to { opacity:1; transform:scale(1) translateY(0); } }'}</style>
      <div style={style} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>{title}</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', ...bodyStyle }}>
          {children}
        </div>
        {footer && <div style={modalFootStyle}>{footer}</div>}
      </div>
    </div>
  );
}
