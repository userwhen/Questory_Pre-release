/* src/avatar/components/PortraitStack.jsx
 * HUD 小頭像與 PortraitModal 大預覽共用同一套比例：
 * 不論有沒有頭像框，人像永遠依 PORTRAIT_INSET 縮進顯示，視覺大小固定不變——
 * 差別只在縮進後的邊界上疊的是「預設金框」還是「頭像框美術素材」。
 */
import React from 'react';
import { findCosmeticImgId, NONE_COSMETIC } from '@/avatar/data/portrait_config.js';

/** 人像相對外層容器的內縮比例（四邊各佔）。0.15 → 人像約為容器的 70%。
 *  生成頭像框美術素材時，挖空（透明）範圍要對齊這個比例。 */
export const PORTRAIT_INSET = 0.15;

/**
 * @param {object} props
 * @param {string|null} props.portrait  已裝備／預覽的頭像 id
 * @param {string|null} props.frame     已裝備／預覽的頭像框 id（NONE_COSMETIC / null = 無框）
 * @param {string} [props.fallback]     無頭像時的 emoji
 * @param {boolean} [props.showDefaultBorder=true] 無框時是否在人像邊界顯示金框
 */
export default function PortraitStack({
  portrait,
  frame,
  fallback = '🧙',
  showDefaultBorder = true,
}) {
  const portraitImgId = findCosmeticImgId('portrait', portrait);
  const hasFrame = !!(frame && frame !== NONE_COSMETIC);
  const frameImgId = hasFrame ? findCosmeticImgId('frame', frame) : null;

  if (!portraitImgId) {
    return (
      <span style={{ fontSize: 'var(--size-sm)', lineHeight: 1 }}>{fallback}</span>
    );
  }

  const insetPct = `${PORTRAIT_INSET * 100}%`;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 人像：不論有沒有頭像框，永遠用同一個 inset */}
      <div
        style={{
          position: 'absolute',
          left: insetPct,
          top: insetPct,
          right: insetPct,
          bottom: insetPct,
          overflow: 'hidden',
          borderRadius: 'var(--radius-xs)',
          zIndex: 1,
          background: 'transparent',
          border: (!hasFrame && showDefaultBorder)
            ? '2px solid var(--color-gold, #f5a623)'
            : 'none',
        }}
      >
        <img
          src={`img/${portraitImgId}.png`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={e => { e.target.style.opacity = '0'; }}
          alt=""
        />
      </div>

      {/* 頭像框：鋪滿外層容器，疊在人像上面 */}
      {frameImgId && (
        <img
          src={`img/${frameImgId}.png`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 2,
            pointerEvents: 'none',
          }}
          onError={e => { e.target.style.opacity = '0'; }}
          alt=""
        />
      )}
    </div>
  );
}
