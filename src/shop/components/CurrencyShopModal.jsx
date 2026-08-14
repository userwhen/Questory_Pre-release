/* src/shop/components/CurrencyShopModal.jsx */
import React, { useState } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
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

// 鑽石換金幣固定匯率，1 鑽 ≈ 10 金幣，買越多優惠越高。
// 欄位名稱沿用跟 IAP 商品同一套是為了共用下面的渲染迴圈：
// gems 這裡實際代表「換到的金幣數」，price 只是顯示文字，
// gemCost 才是真正拿去跟玩家鑽石餘額比對、扣款用的數字。
const GOLD_EXCHANGE_PACKAGES = [
  { sku: 'gold_ex_10', icon: '💰', gems: 100, label: '小額兌換', price: '💎 10', gemCost: 10 },
  { sku: 'gold_ex_30', icon: '💰', gems: 320, label: '中量兌換', price: '💎 30', gemCost: 30, savePct: 7, badge: '優惠' },
  { sku: 'gold_ex_60', icon: '💰', gems: 700, label: '大量兌換', price: '💎 60', gemCost: 60, savePct: 17, badge: '最划算' },
];

export default function CurrencyShopModal({ initialTab = 'gem', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  const freeGem = useGameStore(s => s.freeGem ?? 0);
  const paidGem = useGameStore(s => s.paidGem ?? 0);
  const gold    = useGameStore(s => s.gold ?? 0);
  const totalGem = freeGem + paidGem;

  const products = tab === 'gem' ? IAP.getProducts() : GOLD_EXCHANGE_PACKAGES;

  const handleBuy = async (sku) => {
    if (tab === 'gold') {
      const pkg = GOLD_EXCHANGE_PACKAGES.find(p => p.sku === sku);
      if (!pkg) return;
      const ok = useGameStore.getState().spendGem(pkg.gemCost);
      if (ok) {
        useGameStore.getState().addGold(pkg.gems);
        EventBus.emit(Events.System.TOAST, `💰 兌換成功，獲得 ${pkg.gems} 金幣！`);
        onClose();
      } else {
        EventBus.emit(Events.System.TOAST, '💎 鑽石不足');
      }
      return;
    }

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

        <div style={{ display: 'flex', padding: 'var(--space-xs) var(--space-md) 0', gap: 'var(--space-xs)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: 'var(--space-xs) 0', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--font-body)',
                border: tab === t.key ? '1.5px solid var(--color-gold, #f5a623)' : '1px solid var(--border, rgba(0,0,0,0.09))',
                background: tab === t.key ? 'var(--color-gold-soft, #fef3c7)' : 'transparent',
                color: 'var(--text, #2c1a0e)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 'var(--space-sm) var(--space-md) 0', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginBottom: 'var(--space-xs)' }}>目前持有</div>
          {tab === 'gem' ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💎 免費 {freeGem}</span>
              <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💠 付費 {paidGem}</span>
            </div>
          ) : (
            <span style={{ fontWeight: 800, color: 'var(--color-gold-dark, #c47d0e)' }}>💰 {gold.toLocaleString()}</span>
          )}
        </div>

        {products.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6 }}>
            <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>🚧</div>
            <div style={{ fontWeight: 700, color: 'var(--text, #2c1a0e)' }}>
              目前沒有可購買的項目
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)' }}>
            {products.map(p => {
              // 金幣分頁能不能買取決於鑽石夠不夠；鑽石分頁走真錢 IAP，不受這個限制
              const canAfford = tab !== 'gold' || totalGem >= (p.gemCost ?? 0);
              const disabled = loading || !canAfford;
              return (
              <button
                key={p.sku}
                disabled={disabled}
                onClick={() => handleBuy(p.sku)}
                style={{
                  border: p.badge ? '2px solid var(--color-gold, #f5a623)' : '1px solid var(--border, rgba(0,0,0,0.09))',
                  borderRadius: 14, padding: 'var(--space-sm) var(--space-xs)',
                  background: p.badge ? 'var(--color-gold-soft, #fef3c7)' : 'var(--bg-card, #fff)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)',
                  position: 'relative', opacity: disabled ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {p.badge && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-gold, #f5a623)', color: '#fff', fontSize: 'var(--font-caption)', fontWeight: 900, padding: '2px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
                    {p.badge}
                  </div>
                )}
                <div style={{ fontSize: 'var(--size-sm)' }}>{p.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', color: 'var(--color-info, #2980b9)' }}>{p.gems}</div>
                <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)' }}>{p.label}</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)', marginTop: 2 }}>{p.price}</div>
                {p.savePct && (
                  <div style={{ fontSize: 'var(--font-caption)', background: 'var(--color-danger, #c0392b)', color: '#fff', padding: '1px 6px', borderRadius: 999 }}>省 {p.savePct}%</div>
                )}
              </button>
              );
            })}
          </div>
        )}

        <div style={{ padding: '0 var(--space-md) var(--space-md)', textAlign: 'center' }}>
          <button
            onClick={handleRestore}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8c6e52)', fontSize: 'var(--font-caption)', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            恢復已購買項目
          </button>
        </div>
      </div>
    </div>
  );
}