/* src/components/pages/ShopPage.jsx */
import React, { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { getShopItems, getStackedBag } from '@/utils/shopSelectors.js';
import { IAP } from '@/plugins/iap.js';
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
// ShopPage 的 Modal 有自訂 maxHeight（animation 已經包含在 baseModalStyle 裡，不需要再覆寫一次）
const modalStyle = { ...baseModalStyle, maxHeight: '85vh' };

/* ─── 購買鑽石 Modal ─────────────────────────── */
function GemShopModal({ onClose }) {
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
    // IAP.purchase()（_mockPurchase / 未來的 _livePurchase）已經自己 emit 過對應的
    // TOAST 文案了，這裡不需要再重複 emit 一次。
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
      <div style={{ ...modalStyle, maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>💎 購買鑽石</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>

        {/* 目前持有 */}
        <div style={{ padding: '12px 16px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 4 }}>目前持有</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💎 免費 {freeGem}</span>
            <span style={{ fontWeight: 800, color: 'var(--color-info, #2980b9)' }}>💠 付費 {paidGem}</span>
          </div>
        </div>

        {/* 商品列表 */}
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

        {/* 恢復購買 */}
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

const drawerAnim = `@keyframes drawerUp { from { transform:translateY(100%); } to { transform:translateY(0); } }`;

// 隱藏數字輸入框的上下箭頭
const numberInputCss = `input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`;

const CATS = ['全部', '熱量', '時間', '金錢', '其他', '寵物'];
const CAT_ICONS = { '熱量': '🔥', '時間': '⏳', '金錢': '💰', '其他': '📦', '寵物': '🐾' };

/* ─── 購買 Modal ─────────────────────────────────────── */
function BuyModal({ item, onClose }) {
  const [qty, setQty] = useState(1);
  const gold    = useGameStore(s => s.gold    || 0);
  const freeGem = useGameStore(s => s.freeGem || 0);
  const paidGem = useGameStore(s => s.paidGem || 0);
  const totalGem = freeGem + paidGem;

  const totalCost = item.price * qty;
  const canAfford = item.currency === 'gold' ? gold >= totalCost : totalGem >= totalCost;
  const currIcon  = item.currency === 'gold' ? '💰' : '💎';

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
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{item.icon || '📦'}</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4, color: 'var(--text, #2c1a0e)' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 16 }}>{item.desc}</div>}

          {/* 數量選擇 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={qtyLabelStyle}>MIN</span>
              <button style={qtyBtnStyle} onClick={() => setQty(q => Math.max(1, q - 1))}>－</button>
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
              <button style={qtyBtnStyle} onClick={() => setQty(q => Math.min(item.qty, q + 1))}>＋</button>
            </div>
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 700, color: canAfford ? 'var(--color-gold-dark, #c47d0e)' : 'var(--color-danger, #c0392b)' }}>
            總價：{currIcon} {totalCost}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-ghost, #9C7B5B)', fontWeight: 400, marginLeft: 8 }}>剩餘 {item.qty}</span>
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

/* ─── 道具詳情 Modal ─────────────────────────────────── */
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
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{item.icon || '📦'}</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4, color: 'var(--text, #2c1a0e)' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 16 }}>{item.desc}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
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
          <div style={{ fontSize: '0.8rem', color: 'var(--text-ghost, #9C7B5B)' }}>剩餘: {item.count}</div>
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

function QtyField({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, marginBottom: 0 }}
      />
    </div>
  );
}

function DynamicFields({ category, val, onValChange }) {
  if (category === '熱量') {
    const [kcal, size] = (val || '').toString().includes('|')
      ? val.split('|')
      : [val || '', ''];
    return (
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Kcal 估值</label>
        <input
          type="number"
          value={kcal}
          placeholder="熱量..."
          onChange={e => onValChange(`${e.target.value}|${size}`)}
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        <label style={labelStyle}>ml / g 估值</label>
        <input
          type="number"
          value={size}
          placeholder="份量..."
          onChange={e => onValChange(`${kcal}|${e.target.value}`)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>
    );
  }
  if (category === '時間') {
    const [h, m] = (val || '0|0').toString().split('|');
    return (
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>時長（時 : 分）</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="number" value={h || ''} placeholder="0"
            onChange={e => onValChange(`${e.target.value}|${m || 0}`)}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          <span style={{ fontWeight: 700, opacity: 0.5, color: 'var(--text, #2c1a0e)' }}>:</span>
          <input type="number" value={m || ''} placeholder="0"
            onChange={e => onValChange(`${h || 0}|${e.target.value}`)}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        </div>
      </div>
    );
  }
  if (category === '金錢') {
    return (
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>數值（$）</label>
        <input type="number" value={val || ''} placeholder="0"
          onChange={e => onValChange(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }} />
      </div>
    );
  }
  return <div style={{ flex: 1 }} />;
}

const ICON_POOL = ['📦','🍎','🍕','🍜','🧃','☕','🏃','💪','😴','📚','🎮','💊','🎁','⚔️','🛡️','✨','💰','💎','🔥','⏳'];

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

        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>

          {/* 圖示 + 名稱 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 0 }}>
            <div style={{ flexShrink: 0 }}>
              <label style={labelStyle}>圖示</label>
              <button
                onClick={() => setShowIconPicker(p => !p)}
                style={{ width: 48, height: 48, borderRadius: 10, border: '1.5px solid var(--border-input, #d5c5a8)', background: 'var(--bg-input, #fff)', fontSize: '1.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >{form.icon}</button>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>商品名稱</label>
              <input style={inputStyle} placeholder="輸入名稱..." value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>

          {/* 圖示選擇器 */}
          {showIconPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0', marginBottom: 8 }}>
              {ICON_POOL.map(ic => (
                <button key={ic} onClick={() => { set('icon', ic); setShowIconPicker(false); }}
                  style={{ width: 36, height: 36, borderRadius: 8, border: form.icon === ic ? '2px solid var(--color-correct, #227A59)' : '1px solid var(--border-input, #d5c5a8)', background: 'var(--bg-input, #fff)', fontSize: '1.3rem', cursor: 'pointer' }}>{ic}</button>
              ))}
            </div>
          )}

          {/* 描述 */}
          <label style={labelStyle}>描述</label>
          <textarea style={{ ...inputStyle, resize: 'none', minHeight: 52 }} placeholder="說明..." value={form.desc} onChange={e => set('desc', e.target.value)} />

          {/* 分類 + 動態欄位 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>分類</label>
              <select style={{ ...inputStyle, marginBottom: 0 }} value={form.category}
                onChange={e => { set('category', e.target.value); set('val', ''); }}>
                {UPLOAD_CATS.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <DynamicFields category={form.category} val={form.val} onValChange={v => set('val', v)} />
          </div>

          {/* 價格 / 庫存 / 重置 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <QtyField label="價格 💰" value={form.price} onChange={v => set('price', v)} />
            <QtyField label="庫存" value={form.qty} onChange={v => set('qty', v)} />
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>重置</label>
              <select style={{ ...inputStyle, marginBottom: 0 }} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="once">單次</option>
                <option value="daily">常駐</option>
              </select>
            </div>
          </div>

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
  const bagCats = ['全部', '熱量', '時間', '金錢', '其他'];

  const bag = useGameStore(s => s.bag);
  const filtered = useMemo(() => getStackedBag(bag, bagCat), [bag, bagCat]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{drawerAnim}</style>
      {/* 半透明背景 */}
      {isOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto', zIndex: 10 }}
             onClick={onToggle} />
      )}
      {/* 抽屜本體 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, background: 'var(--bg-panel, #f7e7ce)', borderTop: '2px solid var(--border-wood, #3e2723)', borderRadius: '16px 16px 0 0', pointerEvents: 'auto', zIndex: 11, transform: isOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.25,1,0.5,1)', display: 'flex', flexDirection: 'column' }}>
        {/* 把手 */}
        <div style={{ position: 'absolute', top: -36, right: 16, background: 'var(--bg-nav, #1e1208)', color: 'var(--color-gold, #f5a623)', border: '1px solid var(--color-gold, #f5a623)', borderRadius: '8px 8px 0 0', padding: '6px 20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', pointerEvents: 'auto', zIndex: 12 }}
             onClick={onToggle}>
          {isOpen ? '▼ 背包' : '▲ 背包'}
        </div>

        <div style={{ padding: '10px 12px 4px', flexShrink: 0, borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {bagCats.map(c => (
              <button key={c} style={{ ...filterBtnStyle, background: bagCat === c ? 'var(--color-correct, #227A59)' : 'transparent', color: bagCat === c ? '#fff' : 'var(--text-muted, #8c6e52)', border: bagCat === c ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))' }}
                onClick={() => setBagCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', opacity: 0.5, color: 'var(--text, #2c1a0e)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>🎒</div>
              <div style={{ fontWeight: 700 }}>背包空空如也</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {filtered.map(item => (
                <div key={item.id} style={bagItemStyle} onClick={() => onUseItem(item)}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 3 }}>{item.icon || '📦'}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text, #2c1a0e)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{item.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-gold, #f5a623)', fontWeight: 700 }}>x{item.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────── */
const NPC_LINES = [
  '歡迎光臨！今日有新貨喔～',
  '需要什麼儘管說，別客氣！',
  '最近進了不少好東西呢。',
  '優質商品，童叟無欺！',
  '今天手氣不錯，多買一點吧？',
];

// ⚠️ 新增：initialOpenGemShop——比照 TaskPage 的 initialOpenForm 慣例，
//    讓 GameLayout 的 'shop_gems' 路由可以直接開啟購買鑽石 Modal，
//    不用先進商店頁再手動點一次鑽石＋按鈕。
export default function ShopPage({ initialOpenGemShop = false }) {
  const [cat,        setCat]        = useState('全部');
  const [buyTarget,  setBuyTarget]  = useState(null);
  const [useTarget,  setUseTarget]  = useState(null);
  const [uploadItem, setUploadItem] = useState(undefined);
  const [bagOpen,    setBagOpen]    = useState(false);
  const [npcLine,    setNpcLine]    = useState(0);
  const [showGemShop, setShowGemShop] = useState(initialOpenGemShop);

  const totalGem = useGameStore(s => (s.freeGem ?? 0) + (s.paidGem ?? 0));

  const cycleNpc = useCallback(() => {
    setNpcLine(n => (n + 1) % NPC_LINES.length);
  }, []);

  // 注意：sysShop / shop.user / bag 都已經是 useGameStore 的 reactive selector，
  // shop.js 的更新也都是 immutable 寫法，store 變動時本來就會自動觸發重新渲染，
  // 不需要額外訂閱 Events.Shop.UPDATED / BAG_UPDATED 再手動 setState 強制刷新
  // （先前這裡多了一個沒被使用的 tick state 就是這種重複訂閱，已移除）。

  const sysShop = useGameStore(s => s.sysShop);
  const userShopItems = useGameStore(s => s.shop?.user);
  const items = useMemo(() => getShopItems(sysShop, userShopItems, cat), [sysShop, userShopItems, cat]);

  const handleBuy  = useCallback(item => setBuyTarget(item), []);
  const handleEdit = useCallback(item => setUploadItem(item), []);

  return (
    <div style={pageStyle}>
      {/* ── NPC 區域 ── */}
      <div style={npcAreaStyle}>
        <div style={npcAvatarStyle} onClick={cycleNpc}>🧝</div>
        <div style={npcBubbleStyle}>
          <div style={npcArrowStyle} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text, #2c1a0e)' }}>{NPC_LINES[npcLine]}</span>
        </div>
        <button
          onClick={() => setShowGemShop(true)}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,166,35,0.15)', border: '1.5px solid var(--color-gold, #f5a623)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span style={{ fontSize: '1rem' }}>💎</span>
          <span style={{ fontWeight: 800, color: 'var(--color-gold, #f5a623)', fontSize: '0.82rem' }}>{totalGem}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-gold-dark, #c47d0e)', fontWeight: 700 }}>＋</span>
        </button>
      </div>
      {/* ── 過濾列 ── */}
      <div style={filterBarStyle}>
        <div style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.map(c => (
            <button key={c} style={{ ...filterBtnStyle, background: cat === c ? 'var(--color-correct, #227A59)' : 'transparent', color: cat === c ? '#fff' : 'var(--text-muted, #8c6e52)', border: cat === c ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))' }}
              onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <button style={{ ...filterBtnStyle, flexShrink: 0, marginLeft: 6 }} onClick={() => setUploadItem(null)}>⬆️ 上架</button>
      </div>

      {/* ── 商品列表 ── */}
      <div style={scrollAreaStyle}>
        {items.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🛒</div>
            <div style={{ fontWeight: 700, color: 'var(--text, #2c1a0e)' }}>暫無商品</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 10px 120px' }}>
            {items.map(item => {
              const isSoldOut = item.qty <= 0;
              const currIcon  = item.currency === 'gold' ? '💰' : '💎';
              const isUser    = item.id?.startsWith('usr_');
              return (
                <div key={item.id} style={{ ...shopCardStyle, opacity: isSoldOut ? 0.6 : 1, position: 'relative' }}>
                  {isSoldOut && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: 'inherit' }}>
                      <span style={{ border: '2px solid var(--color-danger, #c0392b)', color: 'var(--color-danger, #c0392b)', fontWeight: 700, fontSize: '0.85rem', padding: '2px 8px', borderRadius: 6, transform: 'rotate(-12deg)', background: 'var(--bg-panel, #f7e7ce)' }}>SOLD OUT</span>
                    </div>
                  )}
                  {isUser && (
                    <button style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', zIndex: 3, opacity: 0.6 }}
                      onClick={e => { e.stopPropagation(); handleEdit(item); }}>⚙️</button>
                  )}
                  <div style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: 5 }}>{item.icon || CAT_ICONS[item.category] || '📦'}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text, #2c1a0e)', marginBottom: 3, textAlign: 'center' }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-danger, #c0392b)', fontWeight: 700, marginBottom: 2 }}>{currIcon} {item.price}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-ghost, #9C7B5B)', marginBottom: 8 }}>剩 {item.qty}</div>
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

      {/* ── 背包抽屜 ── */}
      <BagDrawer isOpen={bagOpen} onToggle={() => setBagOpen(o => !o)} onUseItem={setUseTarget} />

      {/* ── Modals ── */}
      {buyTarget  && <BuyModal     item={buyTarget}  onClose={() => setBuyTarget(null)} />}
      {useTarget  && <ItemDetailModal item={useTarget} onClose={() => setUseTarget(null)} />}
      {uploadItem !== undefined && (
        <UploadModal editItem={uploadItem} onClose={() => setUploadItem(undefined)} />
      )}
      {showGemShop && <GemShopModal onClose={() => setShowGemShop(false)} />}
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────────────────── */
const pageStyle      = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)', position: 'relative' };
const npcAreaStyle   = { flexShrink: 0, background: 'var(--bg-hud, #2c1a0e)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, height: 90 };
const npcAvatarStyle = { width: 60, height: 60, borderRadius: '50%', border: '2px solid var(--color-gold, #f5a623)', background: 'var(--bg-nav, #1e1208)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, cursor: 'pointer' };
const npcBubbleStyle = { background: 'var(--bg-card, #fff)', padding: '10px 14px', borderRadius: 12, position: 'relative', flex: 1, boxShadow: 'var(--shadow-sm)' };
const npcArrowStyle  = { position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '8px solid var(--bg-card, #fff)' };
const filterBarStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated, #fdf0d8)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' };
const filterBtnStyle = { flexShrink: 0, borderRadius: 50, padding: '4px 12px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: '0.15s', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const scrollAreaStyle = { flex: 1, overflowY: 'auto', overflowX: 'hidden' };
const emptyStyle     = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', opacity: 0.5 };
const shopCardStyle  = { background: 'var(--bg-card, #fff)', borderRadius: 12, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card, rgba(0,0,0,0.07))' };
const shopBuyBtnStyle = { width: '100%', padding: '6px 0', background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' };
const bagItemStyle   = { background: 'var(--bg-card, #fff)', borderRadius: 10, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px solid var(--border-card, rgba(0,0,0,0.07))', cursor: 'pointer' };

const qtyBtnStyle    = { width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-box, rgba(0,0,0,0.035))', border: '1.5px solid var(--border-input, #d5c5a8)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' };
const qtyInputStyle  = { width: 56, height: 36, borderRadius: 8, border: '1.5px solid var(--border-input, #d5c5a8)', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'inherit', background: 'var(--bg-input, #fff)', color: 'var(--text, #2c1a0e)', outline: 'none', MozAppearance: 'textfield', WebkitAppearance: 'none' };
const qtyLabelStyle  = { fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.08em' };