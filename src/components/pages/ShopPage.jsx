/* src/components/pages/ShopPage.jsx */
import React, { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { getShopItems, getStackedBag } from '@/utils/shopSelectors.js';
import CurrencyShopModal from '@/components/ui/CurrencyShopModal.jsx';
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

const CATS = ['全部', '熱量', '時間', '金錢', '其他', '寵物'];
const CAT_ICONS = { '熱量': '🔥', '時間': '⏳', '金錢': '💰', '其他': '📦', '寵物': '🐾' };

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

/* ─── 寵物道具（唯讀，無 footer）─────────────────────── */
function PetItemDetailModal({ item, onClose }) {
  // 只記錄「存在狀態」跟「數量」，實際互動/合成/孵化交還給寵物頁面，
  // 這裡不發任何 REQUEST_USE_ITEM / REQUEST_DISCARD_ITEM。
  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>📦 物品詳情</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{item.icon || '🐾'}</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4, color: 'var(--text, #2c1a0e)' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 16 }}>{item.desc}</div>}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-ghost, #9C7B5B)' }}>擁有 {item.count} 顆</div>
        </div>
      </div>
    </div>
  );
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

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.06em', margin: '18px 0 8px' }}>
      {children}
    </div>
  );
}

function CategoryPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {UPLOAD_CATS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            padding: '7px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.8rem',
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
    <div style={{ display: 'flex', gap: 8 }}>
      {opts.map(([v, label, hint]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1, padding: '8px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
            border: value === v ? '1.5px solid var(--color-correct, #227A59)' : '1.5px solid var(--border-input, #d5c5a8)',
            background: value === v ? 'rgba(34,122,89,0.1)' : 'var(--bg-input, #fff)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text, #2c1a0e)' }}>{label}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted, #8c6e52)', marginTop: 2 }}>{hint}</div>
        </button>
      ))}
    </div>
  );
}

function QtyField({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        min="0"
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
      <>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Kcal 估值</label>
          <input
            type="number"
            value={kcal}
            placeholder="熱量..."
            onChange={e => onValChange(`${e.target.value}|${size}`)}
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ml / g 估值</label>
          <input
            type="number"
            value={size}
            placeholder="份量..."
            onChange={e => onValChange(`${kcal}|${e.target.value}`)}
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </div>
      </>
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

        <div style={{ padding: '4px 16px 16px', overflowY: 'auto', flex: 1 }}>

          <SectionHeader>商品資訊</SectionHeader>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <button
              onClick={() => setShowIconPicker(p => !p)}
              style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 12, border: '1.5px solid var(--border-input, #d5c5a8)', background: 'var(--bg-input, #fff)', fontSize: '1.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >{form.icon}</button>
            <div style={{ flex: 1 }}>
              <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="商品名稱..." value={form.name} onChange={e => set('name', e.target.value)} />
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 48, marginBottom: 0 }} placeholder="一句話描述這個商品..." value={form.desc} onChange={e => set('desc', e.target.value)} />
            </div>
          </div>

          {showIconPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0 0' }}>
              {ICON_POOL.map(ic => (
                <button key={ic} onClick={() => { set('icon', ic); setShowIconPicker(false); }}
                  style={{ width: 36, height: 36, borderRadius: 8, border: form.icon === ic ? '2px solid var(--color-correct, #227A59)' : '1px solid var(--border-input, #d5c5a8)', background: 'var(--bg-input, #fff)', fontSize: '1.3rem', cursor: 'pointer' }}>{ic}</button>
              ))}
            </div>
          )}

          <SectionHeader>效果設定</SectionHeader>
          <CategoryPicker value={form.category} onChange={c => { set('category', c); set('val', ''); }} />
          {form.category !== '其他' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <DynamicFields category={form.category} val={form.val} onValChange={v => set('val', v)} />
            </div>
          )}

          <SectionHeader>販售設定</SectionHeader>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
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
  const bagCats = ['全部', '熱量', '時間', '金錢', '其他', '寵物'];

  const bag = useGameStore(s => s.bag);
  const filtered = useMemo(() => getStackedBag(bag, bagCat), [bag, bagCat]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{drawerAnim}</style>
      {isOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto', zIndex: 10 }}
          onClick={onToggle} />
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, background: 'var(--bg-panel, #f7e7ce)', borderTop: '2px solid var(--border-wood, #3e2723)', borderRadius: '16px 16px 0 0', pointerEvents: 'auto', zIndex: 11, transform: isOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.25,1,0.5,1)', display: 'flex', flexDirection: 'column' }}>
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

export default function ShopPage() {
  const [cat, setCat] = useState('全部');
  const [buyTarget, setBuyTarget] = useState(null);
  const [useTarget, setUseTarget] = useState(null);
  const [uploadItem, setUploadItem] = useState(undefined);
  const [bagOpen, setBagOpen] = useState(false);
  const [npcLine, setNpcLine] = useState(0);
  const [currencyShopTab, setCurrencyShopTab] = useState(null); // null=關閉，'gem'|'gold'

  const gold = useGameStore(s => s.gold ?? 0);
  const totalGem = useGameStore(s => (s.freeGem ?? 0) + (s.paidGem ?? 0));

  const cycleNpc = useCallback(() => {
    setNpcLine(n => (n + 1) % NPC_LINES.length);
  }, []);

  const sysShop = useGameStore(s => s.sysShop);
  const userShopItems = useGameStore(s => s.shop?.user);
  const items = useMemo(() => getShopItems(sysShop, userShopItems, cat), [sysShop, userShopItems, cat]);

  const handleBuy = useCallback(item => setBuyTarget(item), []);
  const handleEdit = useCallback(item => setUploadItem(item), []);

  return (
    <div style={pageStyle}>
      <div style={npcAreaStyle}>
        <div style={npcAvatarStyle} onClick={cycleNpc}>🧝</div>
        <div style={npcBubbleStyle}>
          <div style={npcArrowStyle} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text, #2c1a0e)' }}>{NPC_LINES[npcLine]}</span>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => setCurrencyShopTab('gem')}
            style={currencyBtnStyle('gem')}
          >
            <span style={{ fontSize: '1rem' }}>💎</span>
            <span style={{ fontWeight: 800, color: 'var(--color-gold, #f5a623)', fontSize: '0.82rem' }}>{totalGem}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-gold-dark, #c47d0e)', fontWeight: 700 }}>＋</span>
          </button>
          <button
            onClick={() => setCurrencyShopTab('gold')}
            style={currencyBtnStyle('gold')}
          >
            <span style={{ fontSize: '1rem' }}>💰</span>
            <span style={{ fontWeight: 800, color: 'var(--color-gold-dark, #c47d0e)', fontSize: '0.82rem' }}>{gold.toLocaleString()}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-gold-dark, #c47d0e)', fontWeight: 700 }}>＋</span>
          </button>
        </div>
      </div>
      <div style={filterBarStyle}>
        <div style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.map(c => (
            <button key={c} style={{ ...filterBtnStyle, background: cat === c ? 'var(--color-correct, #227A59)' : 'transparent', color: cat === c ? '#fff' : 'var(--text-muted, #8c6e52)', border: cat === c ? 'none' : '1px solid var(--border, rgba(0,0,0,0.09))' }}
              onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <button style={{ ...filterBtnStyle, flexShrink: 0, marginLeft: 6 }} onClick={() => setUploadItem(null)}>⬆️ 上架</button>
      </div>

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
              const currIcon = item.currency === 'gold' ? '💰' : '💎';
              const isUser = item.id?.startsWith('usr_');
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

      <BagDrawer isOpen={bagOpen} onToggle={() => setBagOpen(o => !o)} onUseItem={setUseTarget} />

      {buyTarget && <BuyModal item={buyTarget} onClose={() => setBuyTarget(null)} />}
      {useTarget && (
        useTarget.category === '寵物'
          ? <PetItemDetailModal item={useTarget} onClose={() => setUseTarget(null)} />
          : <ItemDetailModal item={useTarget} onClose={() => setUseTarget(null)} />
      )}
      {uploadItem !== undefined && (
        <UploadModal editItem={uploadItem} onClose={() => setUploadItem(undefined)} />
      )}
      {currencyShopTab && <CurrencyShopModal initialTab={currencyShopTab} onClose={() => setCurrencyShopTab(null)} />}
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────────────────── */
const pageStyle = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)', position: 'relative' };
const npcAreaStyle = { flexShrink: 0, background: 'var(--bg-hud, #2c1a0e)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 90 };
const npcAvatarStyle = { width: 60, height: 60, borderRadius: '50%', border: '2px solid var(--color-gold, #f5a623)', background: 'var(--bg-nav, #1e1208)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, cursor: 'pointer' };
const npcBubbleStyle = { background: 'var(--bg-card, #fff)', padding: '10px 14px', borderRadius: 12, position: 'relative', flex: 1, boxShadow: 'var(--shadow-sm)' };
const npcArrowStyle = { position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '8px solid var(--bg-card, #fff)' };
const currencyBtnStyle = (kind) => ({
  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
  background: kind === 'gem' ? 'rgba(245,166,35,0.15)' : 'rgba(196,125,14,0.12)',
  border: `1.5px solid ${kind === 'gem' ? 'var(--color-gold, #f5a623)' : 'var(--color-gold-dark, #c47d0e)'}`,
  borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
});
const filterBarStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated, #fdf0d8)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' };
const filterBtnStyle = { flexShrink: 0, borderRadius: 50, padding: '4px 12px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: '0.15s', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const scrollAreaStyle = { flex: 1, overflowY: 'auto', overflowX: 'hidden' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', opacity: 0.5 };
const shopCardStyle = { background: 'var(--bg-card, #fff)', borderRadius: 12, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card, rgba(0,0,0,0.07))' };
const shopBuyBtnStyle = { width: '100%', padding: '6px 0', background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' };
const bagItemStyle = { background: 'var(--bg-card, #fff)', borderRadius: 10, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px solid var(--border-card, rgba(0,0,0,0.07))', cursor: 'pointer' };

const qtyBtnStyle = { width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-box, rgba(0,0,0,0.035))', border: '1.5px solid var(--border-input, #d5c5a8)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' };
const qtyInputStyle = { width: 56, height: 36, borderRadius: 8, border: '1.5px solid var(--border-input, #d5c5a8)', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, fontFamily: 'inherit', background: 'var(--bg-input, #fff)', color: 'var(--text, #2c1a0e)', outline: 'none', MozAppearance: 'textfield', WebkitAppearance: 'none' };
const qtyLabelStyle = { fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.08em' };