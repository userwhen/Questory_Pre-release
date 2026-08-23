/* src/shop/pages/ShopPage.jsx */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { getShopItems, getStackedBag } from '@/shop/utils/shopSelectors.js';
import AdBanner from '@/ui/AdBanner.jsx';
import { Ads } from '@/plugins/ads.js';

import {
  maskStyle,
  modalStyle as baseModalStyle,
  modalHeadStyle,
  closeXStyle,
  modalFootStyle,
  labelStyle,
  inputStyle,
  btnStyle,
} from '@/styles/modalStyles.js';
const modalStyle = { ...baseModalStyle, maxHeight: '85vh' };

const drawerAnim = `@keyframes drawerUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`;

const numberInputCss = `input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`;

const CATS = ['全部', '熱量', '時間', '金錢', '其他'];
const CAT_ICONS = { '熱量': '🔥', '時間': '⏳', '金錢': '💰', '其他': '📦' };

/* ─── 購買 Modal ─────────────────────────────────────── */
function BuyModal({ item, onClose }) {
  const [qty, setQty] = useState(1);
  const gold = useGameStore(s => s.gold || 0);
  const freeGem = useGameStore(s => s.freeGem || 0);
  const paidGem = useGameStore(s => s.paidGem || 0);
  const totalGem = freeGem + paidGem;

  const totalCost = item.price * qty;
  const canAfford = item.currency === 'gold' ? gold >= totalCost : totalGem >= totalCost;
  const currIcon = item.currency === 'gold' ? '💰' : '💎';

  // ── 長按 +/− 直接跳最小/最大值；輕點維持原本 ±1 ──
  // pointerdown 起一個 500ms 計時器，時間到就跳極值並標記已觸發；
  // pointerup 時如果還沒觸發（沒撐滿 500ms），才當作一般輕點 ±1。
  const holdTimer = useRef(null);
  const holdFired = useRef(false);
  const startHold = (jumpAction) => {
    holdFired.current = false;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holdFired.current = true;
      jumpAction();
    }, 500);
  };
  const endHold = (tapAction) => {
    clearTimeout(holdTimer.current);
    if (!holdFired.current) tapAction();
  };
  const cancelHold = () => clearTimeout(holdTimer.current);

  const { run, loading: buying } = useRequestAction();
  const handleBuy = () => run(Events.Shop.REQUEST_BUY_ITEM, Events.Shop.BUY_ITEM_RESULT, { id: item.id, qty }, {
    successMsg: '✅ 購買成功！',
    failMsg: (result) => `❌ ${result?.msg}`,
    timeoutMsg: '❌ 購買逾時，請稍後再試',
    onSuccess: onClose,
  });

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>🛒 購買商品</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)' }}>{item.icon || '📦'}</div>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', marginBottom: 'var(--space-xs)', color: 'var(--text, #2c1a0e)' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)', marginBottom: 'var(--space-md)' }}>{item.desc}</div>}

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={qtyLabelStyle}>MIN</span>
              <button
                style={qtyBtnStyle}
                onPointerDown={() => startHold(() => setQty(1))}
                onPointerUp={() => endHold(() => setQty(q => Math.max(1, q - 1)))}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
              >－</button>
            </div>
            <input
              type="number"
              value={qty}
              min={1}
              max={item.qty}
              onChange={e => setQty(Math.min(item.qty, Math.max(1, parseInt(e.target.value) || 1)))}
              style={qtyInputStyle}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={qtyLabelStyle}>MAX</span>
              <button
                style={qtyBtnStyle}
                onPointerDown={() => startHold(() => setQty(item.qty))}
                onPointerUp={() => endHold(() => setQty(q => Math.min(item.qty, q + 1)))}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
              >＋</button>
            </div>
          </div>

          <div style={{ fontSize: 'var(--font-title)', fontWeight: 700, color: canAfford ? 'var(--color-gold-dark, #c47d0e)' : 'var(--color-danger, #c0392b)' }}>
            總價：{currIcon} {totalCost}
            <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-ghost, #9C7B5B)', fontWeight: 400, marginLeft: 'var(--space-xs)' }}>剩餘 {item.qty}</span>
          </div>
        </div>
        <div style={modalFootStyle}>
          <button style={{ ...btnStyle, background: 'var(--bg-card, #fff)', color: 'var(--text, #2c1a0e)', border: '1.5px solid var(--border-input, #d5c5a8)', boxShadow: 'none' }} onClick={onClose}>取消</button>
          <button style={{ ...btnStyle, flex: 1, opacity: (canAfford && !buying) ? 1 : 0.5 }} onClick={handleBuy} disabled={!canAfford || buying}>{buying ? '購買中…' : '確認購買'}</button>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} 小時 ${m} 分` : `${m} 分`;
}
function formatCountdownShort(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

/* ─── 一般道具詳情（可使用/丟棄）───────────────────────── */
function ItemDetailModal({ item, onClose }) {
  const [qty, setQty] = useState(1);

  const { run, loading: using } = useRequestAction();
  const handleUse = () => run(Events.Shop.REQUEST_USE_ITEM, Events.Shop.USE_ITEM_RESULT, { id: item.id, qty }, {
    successMsg: (result) => result.msg,
    failMsg: (result) => `❌ ${result?.msg}`,
    timeoutMsg: '❌ 使用逾時，請稍後再試',
    onSuccess: onClose,
  });

  const handleDiscard = () => {
    EventBus.emit(Events.Shop.REQUEST_DISCARD_ITEM, { id: item.id, qty });
    EventBus.emit(Events.System.TOAST, `🗑️ 已丟棄 ${qty} 個`);
    onClose();
  };

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>📦 物品詳情</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)' }}>{item.icon || '📦'}</div>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', marginBottom: 'var(--space-xs)', color: 'var(--text, #2c1a0e)' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)', marginBottom: 'var(--space-md)' }}>{item.desc}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={qtyLabelStyle}>MIN</span>
              <button style={qtyBtnStyle} onClick={() => setQty(q => Math.max(1, q - 1))}>－</button>
            </div>
            <input
              type="number"
              value={qty}
              min={1}
              max={item.count}
              onChange={e => setQty(Math.min(item.count, Math.max(1, parseInt(e.target.value) || 1)))}
              style={qtyInputStyle}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={qtyLabelStyle}>MAX</span>
              <button style={qtyBtnStyle} onClick={() => setQty(q => Math.min(item.count, q + 1))}>＋</button>
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-ghost, #9C7B5B)' }}>剩餘: {item.count}</div>
        </div>
        <div style={modalFootStyle}>
          <button style={{ ...btnStyle, background: 'var(--color-danger, #c0392b)', color: '#fff', border: 'none' }} onClick={handleDiscard}>🗑️ 丟棄</button>
          <button style={{ ...btnStyle, flex: 1, opacity: using ? 0.6 : 1 }} onClick={handleUse} disabled={using}>{using ? '使用中…' : '✨ 使用'}</button>
        </div>
      </div>
    </div>
  );
}
/* ─── 上架表單 Modal ─────────────────────────────────── */
const UPLOAD_CATS = ['熱量', '時間', '金錢', '其他'];

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: 'var(--font-caption)', fontWeight: 800, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.06em', margin: 'var(--space-md) 0 var(--space-xs)' }}>
      {children}
    </div>
  );
}

function CategoryPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
      {UPLOAD_CATS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'var(--font-body)',
            border: value === c ? 'none' : '1px solid var(--border-input, #d5c5a8)',
            background: value === c ? 'var(--color-correct, #227A59)' : 'var(--bg-input, #fff)',
            color: value === c ? '#fff' : 'var(--text, #2c1a0e)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{CAT_ICONS[c]} {c}</button>
      ))}
    </div>
  );
}

function ResetTypeToggle({ value, onChange }) {
  const opts = [['once', '單次', '用完即下架'], ['daily', '常駐', '每日重置庫存']];
  return (
    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
      {opts.map(([v, label, hint]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1, padding: 'var(--space-xs) var(--space-xs)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
            border: value === v ? '1.5px solid var(--color-correct, #227A59)' : '1.5px solid var(--border-input, #d5c5a8)',
            background: value === v ? 'rgba(34,122,89,0.1)' : 'var(--bg-input, #fff)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)' }}>{label}</div>
          <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginTop: 2 }}>{hint}</div>
        </button>
      ))}
    </div>
  );
}

function QtyField({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <input type="number" min="0" value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
    </div>
  );
}

function DynamicFields({ category, val, onValChange }) {
  if (category === '熱量') {
    const [kcal, size] = (val || '').toString().includes('|') ? val.split('|') : [val || '', ''];
    return (
      <>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Kcal 估值</label>
          <input type="number" value={kcal} placeholder="熱量..." onChange={e => onValChange(`${e.target.value}|${size}`)} style={{ ...inputStyle, marginBottom: 0 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ml / g 估值</label>
          <input type="number" value={size} placeholder="份量..." onChange={e => onValChange(`${kcal}|${e.target.value}`)} style={{ ...inputStyle, marginBottom: 0 }} />
        </div>
      </>
    );
  }
  if (category === '時間') {
    const [h, m] = (val || '0|0').toString().split('|');
    return (
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>時長（時 : 分）</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <input type="number" value={h || ''} placeholder="0" onChange={e => onValChange(`${e.target.value}|${m || 0}`)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          <span style={{ fontWeight: 700, opacity: 0.5, color: 'var(--text, #2c1a0e)' }}>:</span>
          <input type="number" value={m || ''} placeholder="0" onChange={e => onValChange(`${h || 0}|${e.target.value}`)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        </div>
      </div>
    );
  }
  if (category === '金錢') {
    return (
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>數值（$）</label>
        <input type="number" value={val || ''} placeholder="0" onChange={e => onValChange(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
      </div>
    );
  }
  return null;
}

const ICON_POOL = ['📦', '🍎', '🍕', '🍜', '🧃', '☕', '🏃', '💪', '😴', '📚', '🎮', '💊', '🎁', '⚔️', '🛡️', '✨', '💰', '💎', '🔥', '⏳'];

function UploadModal({ editItem, onClose }) {
  const isEdit = !!editItem;
  const [form, setForm] = useState(() => editItem || {
    name: '', desc: '', category: '熱量', price: 0, qty: 1, type: 'daily', val: '', icon: '📦',
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { EventBus.emit(Events.System.TOAST, '⚠️ 請輸入商品名稱'); return; }
    EventBus.emit(Events.Shop.REQUEST_UPLOAD_ITEM, { ...form, price: parseInt(form.price) || 0, qty: parseInt(form.qty) || 1, maxQty: parseInt(form.qty) || 1 });
    EventBus.emit(Events.System.TOAST, isEdit ? '✅ 已更新' : '✅ 上架成功');
    onClose();
  };

  const handleDelete = () => {
    EventBus.emit(Events.Shop.REQUEST_DELETE_ITEM, { id: editItem.id });
    EventBus.emit(Events.System.TOAST, '🗑️ 已下架');
    onClose();
  };

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>{isEdit ? '編輯商品' : '⬆️ 上架商品'}</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 'var(--space-xs) var(--space-md) var(--space-md)', overflowY: 'auto', flex: 1 }}>
          <SectionHeader>商品資訊</SectionHeader>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-start' }}>
            <button onClick={() => setShowIconPicker(p => !p)} style={{ flexShrink: 0, width: 'var(--size-md)', height: 'var(--size-md)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-input, #d5c5a8)', background: 'var(--bg-input, #fff)', fontSize: 'var(--size-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.icon}</button>
            <div style={{ flex: 1 }}>
              {/* ⚠️ marginBottom 這裡是我原本建議的 10px，你已經自己修過間距，
                  請保留你目前檔案裡實際用的數值，不要被這裡蓋掉 */}
              <input style={{ ...inputStyle, marginBottom: 'var(--space-xs)' }} placeholder="商品名稱..." value={form.name} onChange={e => set('name', e.target.value)} />
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 'var(--size-md)', marginBottom: 0 }} placeholder="一句話描述這個商品..." value={form.desc} onChange={e => set('desc', e.target.value)} />
            </div>
          </div>
          {showIconPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', padding: 'var(--space-xs) 0 0' }}>
              {ICON_POOL.map(ic => (
                <button key={ic} onClick={() => { set('icon', ic); setShowIconPicker(false); }} style={{ width: 'var(--size-sm)', height: 'var(--size-sm)', borderRadius: 'var(--radius-sm)', border: form.icon === ic ? '2px solid var(--color-correct, #227A59)' : '1px solid var(--border-input, #d5c5a8)', background: 'var(--bg-input, #fff)', fontSize: 'var(--font-title)', cursor: 'pointer' }}>{ic}</button>
              ))}
            </div>
          )}
          <SectionHeader>效果設定</SectionHeader>
          <CategoryPicker value={form.category} onChange={c => { set('category', c); set('val', ''); }} />
          {form.category !== '其他' && (
            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
              <DynamicFields category={form.category} val={form.val} onValChange={v => set('val', v)} />
            </div>
          )}
          <SectionHeader>販售設定</SectionHeader>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <QtyField label="價格 💰" value={form.price} onChange={v => set('price', v)} />
            <QtyField label="庫存" value={form.qty} onChange={v => set('qty', v)} />
          </div>
          <ResetTypeToggle value={form.type} onChange={v => set('type', v)} />
        </div>
        <div style={modalFootStyle}>
          {isEdit && <button style={{ ...btnStyle, background: 'var(--color-danger, #c0392b)', color: '#fff', border: 'none' }} onClick={handleDelete}>下架</button>}
          <button style={{ ...btnStyle, flex: 1 }} onClick={handleSave}>{isEdit ? '保存' : '上架'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 背包抽屜 ──────────────────────────────────────── */
function BagDrawer({ isOpen, onToggle, onUseItem }) {
  const [bagCat, setBagCat] = useState('全部');
  const [now, setNow] = useState(Date.now());
  const bagCats = ['全部', '熱量', '時間', '金錢', '其他'];

  const bag = useGameStore(s => s.bag);
  const filtered = useMemo(() => getStackedBag(bag, bagCat), [bag, bagCat]);

  useEffect(() => {
    if (!filtered.some(i => i.readyAt)) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [filtered]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{drawerAnim}</style>
      {isOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto', zIndex: 10 }}
          onClick={onToggle} />
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, background: 'var(--bg-panel, #f7e7ce)', borderTop: '2px solid var(--border-wood, #3e2723)', borderRadius: '16px 16px 0 0', pointerEvents: 'auto', zIndex: 11, transform: isOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform var(--t-slow) cubic-bezier(0.25,1,0.5,1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: -36, right: 16, background: 'var(--bg-nav, #1e1208)', color: 'var(--color-gold, #f5a623)', border: '1px solid var(--color-gold, #f5a623)', borderRadius: '8px 8px 0 0', padding: 'var(--space-xs) var(--space-lg)', fontSize: 'var(--font-body)', fontWeight: 700, cursor: 'pointer', pointerEvents: 'auto', zIndex: 12 }}
          onClick={onToggle}>
          {isOpen ? '▼ 背包' : '▲ 背包'}
        </div>

        <div style={{ padding: 'var(--space-xs) var(--space-sm) var(--space-xs)', flexShrink: 0, borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {bagCats.map(c => (
              <button key={c} style={{ ...filterBtnStyle, background: bagCat === c ? 'var(--color-correct, #227A59)' : 'transparent', color: bagCat === c ? '#fff' : 'var(--text-muted, #8c6e52)', border: bagCat === c ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))' }}
                onClick={() => setBagCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-xs) var(--space-sm)' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', opacity: 0.5, color: 'var(--text, #2c1a0e)' }}>
              <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>🎒</div>
              <div style={{ fontWeight: 700 }}>背包空空如也</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-xs)' }}>
               {filtered.map(item => {
                const isReady = item.readyAt && now >= item.readyAt;
                return (
                  <div key={item.id} style={bagItemStyle} onClick={() => onUseItem(item)}>
                    <div style={{ position: 'relative', marginBottom: 3 }}>
                      <div style={{ fontSize: 'var(--size-sm)', lineHeight: 1 }}>{item.icon || '📦'}</div>
                      {item.readyAt && (
                        <span style={{
                          position: 'absolute', bottom: -4, right: -8, lineHeight: 1.4,
                          fontSize: 'var(--font-caption)', fontWeight: 700, padding: '1px 4px', borderRadius: 999,
                          background: isReady ? 'var(--color-correct, #227A59)' : 'rgba(0,0,0,0.65)', color: '#fff',
                          whiteSpace: 'nowrap',
                        }}>
                          {isReady ? '✓' : formatCountdownShort(item.readyAt - now)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--font-caption)', fontWeight: 700, color: 'var(--text, #2c1a0e)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{item.name}</div>
                    <div style={{ fontSize: 'var(--font-caption)', color: 'var(--color-gold, #f5a623)', fontWeight: 700 }}>x{item.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────── */
const NPC_LINES = [
  { text: '歡迎光臨！今日有新貨喔～' },
  { text: '需要什麼儘管說，別客氣！' },
  { text: '最近進了不少好東西呢。' },
  { text: '優質商品，童叟無欺！' },
  { text: '今天手氣不錯，多買一點吧？' },
  { text: '今天下面也有一些不錯的優惠喔，可以看看～' },
  { text: '要不要看段影片，說不定能挖到寶石？', ad: true },
];

const AD_COOLDOWN_MS = 30 * 60 * 1000; // 廣告冷卻 30 分鐘
const AD_REWARD_TIERS_TOTAL = 5; // 對應 shop.js 的 AD_REWARD_TABLE 長度，這裡只用來判斷今日額度是否發完，實際鑽石量由 shop.js 算

export default function ShopPage() {
  const [cat, setCat] = useState('全部');
  const [buyTarget, setBuyTarget] = useState(null);
  const [useTarget, setUseTarget] = useState(null);
  const [uploadItem, setUploadItem] = useState(undefined);
  const [bagOpen, setBagOpen] = useState(false);
  const [npcIdx, setNpcIdx] = useState(0);
  const [adNow, setAdNow] = useState(Date.now());
  const topBannerRef = useRef(null);
  const { run: runAdReward } = useRequestAction();

  const npcCurrent = NPC_LINES[npcIdx % NPC_LINES.length];
  const handleNpcClick = () => setNpcIdx(i => (i + 1) % NPC_LINES.length);

  const shopAd = useGameStore(s => s.shopAd);
  const adCooldownRemainMs = shopAd?.lastWatchAt ? Math.max(0, AD_COOLDOWN_MS - (adNow - shopAd.lastWatchAt)) : 0;
  const adOnCooldown = adCooldownRemainMs > 0;
  const adRewardsLeft = AD_REWARD_TIERS_TOTAL - (shopAd?.rewardsGivenToday ?? 0);
  const adButtonLabel = adOnCooldown
    ? `還要 ${formatCountdown(adCooldownRemainMs)} 才能看喔`
    : (adRewardsLeft > 0 ? '點擊觀看廣告獲得鑽石' : '鑽石送完了，點擊廣告支持創作者');

  // 冷卻倒數：只有真的在冷卻中才需要每 30 秒 tick 一次刷新畫面
  useEffect(() => {
    if (!adOnCooldown) return;
    const t = setInterval(() => setAdNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [adOnCooldown]);

  // 🔧【暫時診斷用，找到問題後刪掉】全域攔截，不管崩潰發生在哪一段都會印出來
  useEffect(() => {
    const onRejection = (e) => console.error('[診斷][全域] 未攔截的 Promise rejection:', e.reason);
    const onError = (e) => console.error('[診斷][全域] 未攔截的錯誤:', e.error || e.message);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

    const handleWatchAd = async () => {
    console.log('[診斷] handleWatchAd 開始，事件常數：', Events.Shop.REQUEST_AD_REWARD, Events.Shop.AD_REWARD_RESULT);
    try {
      const result = await Ads.showRewarded(Ads.PLACEMENTS.REWARDED_SHOP_DIAMONDS);
      console.log('[診斷] showRewarded 回傳：', result);
      if (!result.completed) return;
      runAdReward(Events.Shop.REQUEST_AD_REWARD, Events.Shop.AD_REWARD_RESULT, {}, {
        successMsg: (r) => r.granted > 0 ? `💎 獲得 ${r.granted} 顆鑽石！` : '❤️ 感謝支持！',
        failMsg: (r) => `❌ ${r?.msg || '發放失敗'}`,
        timeoutMsg: '❌ 逾時，請稍後再試',
      });
      console.log('[診斷] runAdReward 已呼叫');
    } catch (e) {
      console.error('[診斷] handleWatchAd 內部例外：', e);
      throw e;
    }
  };
  // 商店最上方的橫幅：只要在這頁、廣告該顯示、且沒有任何彈出視窗擋著，就嘗試顯示原生橫幅；
  // 只要有任一彈窗開著就先隱藏，避免橫幅疊在彈窗上面蓋住內容。
  const anyModalOpen = !!buyTarget || !!useTarget || uploadItem !== undefined || bagOpen;
  useEffect(() => {
    if (!Ads.shouldShowAds() || Ads.ADS_MODE !== 'live') return;
    if (anyModalOpen) {
      Ads.hideBanner();
      return;
    }
    const el = topBannerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const BANNER_MARGIN_ADJUST = 53; // 手動校正值：往上移多少 px，數字要在裝置上實測微調，不是算出來的
    console.log('[Ads] 廣告版位量到的 top:', rect.top, '校正後:', rect.top - BANNER_MARGIN_ADJUST);
    Ads.showBanner(Ads.PLACEMENTS.SHOP_BANNER, rect.top - BANNER_MARGIN_ADJUST);
    return () => { Ads.hideBanner(); };
  }, [anyModalOpen]);
  
  const sysShop = useGameStore(s => s.sysShop);
  const userShopItems = useGameStore(s => s.shop?.user);
  const activePets = useGameStore(s => s.activePets);
  const items = useMemo(() => getShopItems(sysShop, userShopItems, cat).filter(i => !i.hidden), [sysShop, userShopItems, cat]);

  const handleBuy = useCallback(item => setBuyTarget(item), []);
  const handleEdit = useCallback(item => setUploadItem(item), []);

  return (
    <div style={pageStyle}>
      <div style={npcAreaStyle}>
        <img src="img/tavern_back.png" alt="" style={npcSceneBackStyle} onError={e => { e.target.style.opacity = '0'; }} />

        <div style={npcSpriteWrapStyle} onClick={handleNpcClick}>
          <img
            src="img/npc_outfit_01.png"
            alt="店主"
            style={npcSpriteImgStyle}
            onError={e => { e.target.style.opacity = '0'; }}
          />
        </div>

        <img src="img/tavern_front.png" alt="" style={npcSceneFrontStyle} onError={e => { e.target.style.opacity = '0'; }} />

        <div style={npcBubbleWrapStyle}>
          <div style={npcBubbleStyle}>
            <div style={npcArrowStyle} />
            <span style={{ fontWeight: 700, fontSize: 'var(--font-title)', color: 'var(--text, #2c1a0e)' }}>{npcCurrent.text}</span>
          </div>
          {npcCurrent.ad && (
            <button
              style={{ ...npcAdBtnStyle, opacity: adOnCooldown ? 0.5 : 1, cursor: adOnCooldown ? 'not-allowed' : 'pointer' }}
              disabled={adOnCooldown}
              onClick={handleWatchAd}
            >
              {adButtonLabel}
            </button>
          )}
        </div>
      </div>
      {Ads.ADS_MODE === 'live'
        ? <div ref={topBannerRef} style={{ height: 'var(--size-lg)', flexShrink: 0 }} />
        : <AdBanner placementId={Ads.PLACEMENTS.SHOP_BANNER} style={{ flexShrink: 0, margin: 0 }} />}
      <div style={filterBarStyle}>
        <div style={{ flex: 1, display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.map(c => (
            <button key={c} style={{ ...filterBtnStyle, background: cat === c ? 'var(--color-correct, #227A59)' : 'transparent', color: cat === c ? '#fff' : 'var(--text-muted, #8c6e52)', border: cat === c ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))' }}
              onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <button style={{ ...filterBtnStyle, flexShrink: 0, marginLeft: 'var(--space-xs)' }} onClick={() => setUploadItem(null)}>⬆️ 上架</button>
      </div>

      <div style={scrollAreaStyle}>
        {items.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)' }}>🛒</div>
            <div style={{ fontWeight: 700, color: 'var(--text, #2c1a0e)' }}>暫無商品</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-xs)', padding: '10px 10px 120px' }}>
            {items.map(item => {
              const isSoldOut = item.qty <= 0;
              const currIcon = item.currency === 'gold' ? '💰' : '💎';
              const isUser = item.id?.startsWith('usr_');
              return (
                <div key={item.id} style={{ ...shopCardStyle, opacity: isSoldOut ? 0.6 : 1, position: 'relative' }}>
                  {isSoldOut && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: 'inherit' }}>
                      <span style={{ border: '2px solid var(--color-danger, #c0392b)', color: 'var(--color-danger, #c0392b)', fontWeight: 700, fontSize: 'var(--font-body)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', transform: 'rotate(-12deg)', background: 'var(--bg-panel, #f7e7ce)' }}>SOLD OUT</span>
                    </div>
                  )}
                  {isUser && (
                    <button style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', fontSize: 'var(--font-body)', cursor: 'pointer', zIndex: 3, opacity: 0.6 }}
                      onClick={e => { e.stopPropagation(); handleEdit(item); }}>⚙️</button>
                  )}
                  <div style={{ fontSize: 'var(--size-sm)', lineHeight: 1, marginBottom: 'var(--space-xs)' }}>{item.icon || CAT_ICONS[item.category] || '📦'}</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)', marginBottom: 3, textAlign: 'center' }}>{item.name}</div>
                  <div style={{ fontSize: 'var(--font-body)', color: 'var(--color-gold, #f5a623)', fontWeight: 700, marginBottom: 2 }}>{currIcon} {item.price}</div>
                  <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)', marginBottom: 'var(--space-xs)' }}>剩 {item.qty}</div>
                  <button
                    style={{ ...shopBuyBtnStyle, opacity: isSoldOut ? 0.4 : 1 }}
                    disabled={isSoldOut}
                    onClick={() => !isSoldOut && handleBuy(item)}
                  >購買</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BagDrawer isOpen={bagOpen} onToggle={() => setBagOpen(o => !o)} onUseItem={setUseTarget} />

      {buyTarget && <BuyModal item={buyTarget} onClose={() => setBuyTarget(null)} />}
      {useTarget && <ItemDetailModal item={useTarget} onClose={() => setUseTarget(null)} />}
      {uploadItem !== undefined && (
        <UploadModal editItem={uploadItem} onClose={() => setUploadItem(undefined)} />
      )}
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────────────────── */
const pageStyle = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)', position: 'relative' };
const npcAreaStyle = { flexShrink: 0, position: 'relative', height: 130, overflow: 'hidden', background: 'var(--bg-hud, #2c1a0e)' };
const npcSceneBackStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', zIndex: 1 };
const npcSpriteImgStyle = { width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', pointerEvents: 'none' };
const npcSpriteWrapStyle = { position: 'absolute', left: '3%', bottom: 0, width: '42%', height: '100%', zIndex: 2, cursor: 'pointer' };
const npcBubbleWrapStyle = { position: 'absolute', right: 'var(--space-sm, 10px)', top: 'var(--space-sm, 10px)', maxWidth: '64%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-xs)', zIndex: 4 };
const npcBubbleStyle = { position: 'relative', padding: 'var(--space-sm) var(--space-md)', display: 'flex', alignItems: 'center', background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' };
const npcArrowStyle = { position: 'absolute', left: -8, top: 'var(--space-md, 16px)', width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '8px solid var(--bg-card, #fff)' };
const npcAdBtnStyle = { padding: 'var(--space-xs) var(--space-md)', borderRadius: 'var(--radius-full)', border: 'none', background: 'var(--color-gold, #f5a623)', color: '#fff', fontWeight: 700, fontSize: 'var(--font-body)', fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)', textAlign: 'right' };
const npcSceneFrontStyle = { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '30%', objectFit: 'cover', objectPosition: 'bottom', zIndex: 3, pointerEvents: 'none' };
const filterBarStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg-elevated, #fdf0d8)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' };
const filterBtnStyle = { flexShrink: 0, borderRadius: 50, padding: 'var(--space-xs) var(--space-sm)', fontWeight: 700, fontSize: 'var(--font-caption)', cursor: 'pointer', transition: 'var(--t-fast)', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const scrollAreaStyle = { flex: 1, overflowY: 'auto', overflowX: 'hidden' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', opacity: 0.5 };
const shopCardStyle = { background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-xs)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card, rgba(0,0,0,0.07))' };
const shopBuyBtnStyle = { width: '100%', padding: 'var(--space-xs) 0', background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit' };
const bagItemStyle = { background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-xs) var(--space-xs)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px solid var(--border-card, rgba(0,0,0,0.07))', cursor: 'pointer' };

const qtyBtnStyle = { width: 'var(--size-sm)', height: 'var(--size-sm)', borderRadius: '50%', background: 'var(--bg-box, rgba(0,0,0,0.035))', border: '1.5px solid var(--border-input, #d5c5a8)', fontSize: 'var(--font-title)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' };
const qtyInputStyle = { width: 'var(--size-lg)', height: 'var(--size-sm)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-input, #d5c5a8)', textAlign: 'center', fontSize: 'var(--font-title)', fontWeight: 800, fontFamily: 'inherit', background: 'var(--bg-input, #fff)', color: 'var(--text, #2c1a0e)', outline: 'none', MozAppearance: 'textfield', WebkitAppearance: 'none' };
const qtyLabelStyle = { fontSize: 'var(--font-caption)', fontWeight: 700, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.08em' };