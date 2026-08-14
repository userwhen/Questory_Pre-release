// src/ui/CharacterSprite.jsx
import React from 'react';
import { ALL_ITEMS } from '@/avatar/data/avatar_config.js';

// 依 id 查找裝備設定（取得 imgId / layers 等資訊）
function findItem(itemId) {
  return ALL_ITEMS.find(i => i.id === itemId);
}

// 渲染單一裝備層，支援 layers 多層合成
function renderLayer(itemId, zIndex) {
  if (!itemId) return null;
  const item = findItem(itemId);

  if (item?.layers) {
    return item.layers.map((layer, i) => (
      <img
        key={`${itemId}-layer-${i}`}
        src={`img/${layer.img}.png`}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'contain',
          zIndex: layer.z ?? zIndex,
        }}
        onError={e => { e.target.style.opacity = '0'; }}
        alt=""
      />
    ));
  }

  const imgId = item?.imgId ?? itemId;
  return (
    <img
      key={itemId}
      src={`img/${imgId}.png`}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%', objectFit: 'contain',
        zIndex,
      }}
      onError={e => { e.target.style.opacity = '0'; }}
      alt=""
    />
  );
}

// 角色立繪疊圖元件
// 依 wearing 設定疊出完整造型；穿著 suit / special_pose 時只顯示該層
// （其餘部位已由 AvatarEngine.wearItem 互斥邏輯從 wearing 移除）
export default function CharacterSprite({ wearing = {} }) {
  const isSpecial = !!(wearing.special_pose || wearing.suit);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isSpecial ? (
        renderLayer(wearing.special_pose ?? wearing.suit, 10)
      ) : (
        <>
          {renderLayer(wearing.hair_back, 0)}
          {renderLayer(wearing.body, 1)}
          {renderLayer(wearing.face, 2)}
          {renderLayer(wearing.bottom, 3)}
          {renderLayer(wearing.top, 4)}
          {renderLayer(wearing.hair_combo, 6)}
          {renderLayer(wearing.hair_front, 6)}
          {renderLayer(wearing.accessory, 7)}
        </>
      )}
    </div>
  );
}