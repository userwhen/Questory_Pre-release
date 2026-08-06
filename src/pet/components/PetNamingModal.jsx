// src/components/ui/PetNamingModal.jsx
// 共用元件：從購買/裝備門進來、needsNaming 為 true 的寵物取名視窗。
// AvatarPage.jsx（裝備當下立即跳出）跟 PetWidget.jsx（保底：以防
// AvatarPage 那邊漏接事件，玩家切回大廳時還是會被攔截到）都會用到，
// 抽成共用元件避免兩邊各自維護一份重複的 UI。
// 刻意不做「點外面關閉」或「✕」——這隻寵物已經是一隻正式成立的
// activePets 物件了，要求玩家一定要確認名字才能關閉，避免一隻名字
// 缺失的寵物到處跑。
import React, { useState } from 'react';
import {
  maskStyle, compactModalStyle as modalStyle, modalHeadStyle, modalFootStyle, inputStyle, btnStyle,
} from '@/styles/modalStyles.js';

export default function PetNamingModal({ onConfirm }) {
  const [name, setName] = useState('新寵物');
  return (
    <div style={maskStyle}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>🐾 迎接新夥伴</span>
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🐾</div>
          <p style={{ color: 'var(--text-muted,#8c6e52)', fontSize: '0.9rem', marginBottom: 14, lineHeight: 1.5 }}>
            一隻新寵物來到了你身邊！<br />幫牠取個名字吧：
          </p>
          <input style={inputStyle} value={name} maxLength={10} onChange={e => setName(e.target.value)} placeholder="最多10個字" autoFocus />
        </div>
        <div style={modalFootStyle}>
          <button style={{ ...btnStyle, flex: 1 }} onClick={() => onConfirm(name)}>🌟 確認</button>
        </div>
      </div>
    </div>
  );
}