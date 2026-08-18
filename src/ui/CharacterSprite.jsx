// src/ui/CharacterSprite.jsx
import React from 'react';
import { findItemById, itemImgSrc } from '@/avatar/data/avatar_config.js';

function renderLayer(itemId, zIndex) {
  if (!itemId) return null;
  const item = findItemById(itemId);

  if (item?.layers) {
    return item.layers.map((layer, i) => (
      <img
        key={`${itemId}-layer-${i}`}
        src={itemImgSrc(layer.img)}
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

  return (
    <img
      key={itemId}
      src={itemImgSrc(itemId)}
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
