// src/components/ui/GemShopModal.jsx
import React, { useState } from 'react';
import { useGameStore } from '@/core/state.js';
import { IAP } from '@/plugins/iap.js';
import {
  maskStyle,
  modalStyle as baseModalStyle,
  modalHeadStyle,
  closeXStyle,
} from '@/styles/modalStyles.js';

const modalStyle = { ...baseModalStyle, maxHeight: '88vh' };

export default function GemShopModal({ onClose }) {
  const { freeGem, paidGem } = useGameStore(s => ({
    freeGem: s.freeGem ?? 0,
    paidGem: s.paidGem ?? 0,
  }));
  const [loading, setLoading] = useState(false);

  const products = IAP.getProducts();

  const handleBuy = async (sku) => {
    setLoading(true);
    const result = await IAP.purchase(sku);
    setLoading(false);
    if (result.success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    await IAP.restorePurchases();
    setLoading(false);
  };

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>💎 購買鑽石</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '12px 16px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 4 }}>目前持有</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💎 免費 {freeGem}</span>
            <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💠 付費 {paidGem}</span>
          </div>
        </div>

        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {products.map(p => (
            <button
              key={p.sku}
              disabled={loading}
              onClick={() => handleBuy(p.sku)}
              style={{
                border: p.badge ? '2px solid var(--color-gold, #f5a623)' : '1px solid var(--border, rgba(0,0,0,0.09))',
                borderRadius: 14, padding: '14px 10px',
                background: p.badge ? 'var(--color-gold-soft, #fef3c7)' : 'var(--bg-card, #fff)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                position: 'relative', opacity: loading ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {p.badge && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-gold, #f5a623)', color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontSize: '2rem' }}>{p.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-info, #2980b9)' }}>{p.gems}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8c6e52)' }}>{p.label}</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text, #2c1a0e)', marginTop: 2 }}>{p.price}</div>
              {p.savePct && (
                <div style={{ fontSize: '0.68rem', background: 'var(--color-danger, #c0392b)', color: '#fff', padding: '1px 6px', borderRadius: 999 }}>省 {p.savePct}%</div>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
          <button
            onClick={handleRestore}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8c6e52)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            恢復已購買項目
          </button>
        </div>
      </div>
    </div>
  );
}