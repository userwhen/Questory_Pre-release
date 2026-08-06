/* src/components/ui/PetReplaceModal.jsx */
import React from 'react';
import { ALL_ITEMS } from '@/data/avatar_config.js';

export default function PetReplaceModal({ activePets, newItemId, onConfirm, onCancel }) {
  const newItem = ALL_ITEMS.find(i => i.id === newItemId);
  const newName = newItem?.name ?? '新寵物';

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: 10 }}>🎒</div>
        <p style={descStyle}>
          家裡的空間已經滿了！如果要領養 <b>{newName}</b>，
          必須讓現有的寵物前往世界各地旅行。
          <br />
          <span style={{ color: '#f05555', fontSize: '0.8rem' }}>
            （⚠️ 注意：送去旅行後，牠就會離開這裡。下次領養的將會是全新的寵物喔！）
          </span>
        </p>
        <hr style={{ borderColor: 'var(--border)', margin: '15px 0', opacity: 0.5 }} />
        <p style={{ fontWeight: 'bold', marginBottom: 10 }}>請問要讓誰去旅行呢？</p>

        {activePets.map((p, index) => (
          <button
            key={p.id}
            style={petBtnStyle}
            onClick={() => onConfirm(index, newItemId)}
          >
            <span>🐾 讓【{p.name || '寵物'}】(Lv.{p.level || 1}) 去旅行</span>
            <span style={{ fontSize: '1.5rem' }}>✈️</span>
          </button>
        ))}

        <button style={cancelBtnStyle} onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

// ⚠️ 修正：position 從 'fixed' 改成 'absolute'。這個 Modal 是被塞在 AvatarPage
// 自己的 pageStyle（position:'relative'）底下渲染，用 'fixed' 會直接蓋滿整個
// 瀏覽器視窗、蓋出 App 框架之外；改成 'absolute' 後會正確被限制在頁面框架內。
const overlayStyle = { position: 'absolute', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const cardStyle = { background: 'var(--bg-card,#fff)', borderRadius: 16, padding: 20, maxWidth: 360, width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' };
const descStyle = { color: 'var(--text-muted,#8c6e52)', fontSize: '0.95rem', lineHeight: 1.5, textAlign: 'center' };
const petBtnStyle = { background: 'var(--bg-box,#f7e7ce)', border: '2px solid var(--border)', borderRadius: 12, padding: 15, margin: '5px 0', width: '100%', cursor: 'pointer', color: 'var(--text)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' };
const cancelBtnStyle = { width: '100%', marginTop: 10, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' };