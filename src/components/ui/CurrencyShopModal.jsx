/* src/components/ui/CurrencyShopModal.jsx */
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

const TABS = [
  { key: 'gem',  label: '💎 鑽石' },
  { key: 'gold', label: '💰 金幣' },
];

export default function CurrencyShopModal({ initialTab = 'gem', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  // 個別訂閱，不要回傳組合物件——組合物件每次 render 都是新 reference，
  // 會讓這個元件在任何跟 gem/gold 無關的 state 變動時也重新渲染
  const freeGem = useGameStore(s => s.freeGem ?? 0);
  const paidGem = useGameStore(s => s.paidGem ?? 0);
  const gold    = useGameStore(s => s.gold ?? 0);

  // iap.js 目前 getProducts() 不吃參數、只有鑽石商品線，金幣還沒開放購買。
  // 這裡明確依 tab 分流，避免把鑽石商品誤塞進金幣分頁。
  const products = tab === 'gem' ? IAP.getProducts() : [];

  const handleBuy = async (sku) => {
    setLoading(true);
    try {
      const result = await IAP.purchase(sku);
      if (result?.success) onClose();
    } catch (e) {
      console.error('[CurrencyShopModal] purchase failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await IAP.restorePurchases();
    } catch (e) {
      console.error('[CurrencyShopModal] restore failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>🛍️ 貨幣商店</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', padding: '10px 16px 0', gap: 8 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                border: tab === t.key ? '1.5px solid var(--color-gold, #f5a623)' : '1px solid var(--border, rgba(0,0,0,0.09))',
                background: tab === t.key ? 'var(--color-gold-soft, #fef3c7)' : 'transparent',
                color: 'var(--text, #2c1a0e)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ padding: '12px 16px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 4 }}>目前持有</div>
          {tab === 'gem' ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💎 免費 {freeGem}</span>
              <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💠 付費 {paidGem}</span>
            </div>
          ) : (
            <span style={{ fontWeight: 800, color: 'var(--color-gold-dark, #c47d0e)' }}>💰 {gold.toLocaleString()}</span>
          )}
        </div>

        {products.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚧</div>
            <div style={{ fontWeight: 700, color: 'var(--text, #2c1a0e)' }}>
              {tab === 'gold' ? '金幣購買準備中，敬請期待' : '目前沒有可購買的項目'}
            </div>
          </div>
        ) : (
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
        )}

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