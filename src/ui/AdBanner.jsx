// src/ui/AdBanner.jsx
import React from 'react';
import { Ads } from '@/plugins/ads.js';

// 通用橫幅廣告版位。Pro 訂閱期間自動不顯示（免廣告是訂閱誘因之一）。
// 廣告 SDK 還沒接上前先顯示佔位卡片：一來讓版面先留好、量測會不會跟
// 旁邊按鈕靠太近容易誤觸，二來 SDK 接上後只要換掉這個元件內部就好，
// 呼叫端（例如 ShopPage.jsx）完全不用改。
export default function AdBanner({ placementId, label = '廣告版位（尚未串接）', style }) {
  if (!Ads.shouldShowAds()) return null;
  return (
    <div style={{ ...s.wrap, ...style }}>
      <span style={s.label}>{label}</span>
    </div>
  );
}

const s = {
  wrap: {
    height: 'var(--size-lg)', margin: '0 0 var(--space-sm)', borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--border, rgba(0,0,0,0.15))',
    background: 'var(--bg-card, #fff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  label: { fontSize: 'var(--font-caption)', color: 'var(--text-muted, #999)' },
};
