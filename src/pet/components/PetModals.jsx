/* src/components/ui/PetModals.jsx */
// PetWidget 頂層彈窗（不屬於任何單一寵物實體，一律在最外層渲染，
// 不巢狀塞進寵物 wrapper）：詳情面板、出生選擇、血統圖鑑。
import React, { useState } from 'react';
import { LINEAGE_DICTIONARY } from '@/pet/data/pet_lineage.js';
import {
  maskStyle, modalHeadStyle, closeXStyle, modalFootStyle, inputStyle, btnStyle,
  compactModalStyle as modalStyle, statusTagStyle,
} from '@/styles/modalStyles.js';

/* ─── 數值條：只用在長按跳出的詳情面板裡，維持「平常抽象、
     深處才給數字」的分層，對話氣泡完全不受影響 ───────── */
function StatBar({ icon, value, color }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = color ?? (value > 60 ? 'var(--color-correct,#227A59)' : value > 30 ? 'var(--color-gold,#f5a623)' : 'var(--color-danger,#c0392b)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <span style={{ fontSize: '0.9rem', flexShrink: 0, width: 18, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted,#8c6e52)', width: 34, textAlign: 'right', flexShrink: 0 }}>{Math.round(pct)}%</span>
    </div>
  );
}

/* ─── 詳情面板（B）：長按寵物才會跳出，是唯一會顯示精確數字
     （等級/EXP/飽食度/心情%）的地方 ───────────────────────── */
export function PetDetailModal({ pet, isBaby, onClose }) {
  const level = pet.level ?? (isBaby ? 0 : 1);
  const isGrowing = pet.isGrowing ?? isBaby;
  const lineage = !isBaby ? LINEAGE_DICTIONARY[pet.lineage] : null;

  const progressPct = isGrowing
    ? (pet.growthProgress ?? 0)
    : Math.min(100, ((pet.affection ?? 0) / (level * 100)) * 100);
  const progressLabel = isGrowing ? '成長進度' : `等級 Lv.${level}`;
  const progressText  = isGrowing
    ? `${Math.floor(pet.growthProgress ?? 0)}%`
    : `EXP ${Math.round(pet.affection ?? 0)} / ${level * 100}`;

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>📊 {pet.name ?? (isBaby ? '幼崽' : '寵物')} 的詳細資訊</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {!isBaby && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
              {lineage && <span style={statusTagStyle('#fff3e0', '#e67e22')}>{lineage.difficult ? '⭐' : lineage.icon} {pet.lineage}</span>}
              <span style={statusTagStyle('#e3f2fd', '#2980b9')}>{pet.personality}</span>
              {pet.traits?.task && pet.traits.task !== '無' && <span style={statusTagStyle('#fce4ec', '#d81b60')}>⚔️ {pet.traits.task}傾向</span>}
              {pet.traits?.attachment && <span style={statusTagStyle('rgba(0,0,0,0.06)', 'var(--text,#2c1a0e)')}>{pet.traits.attachment}</span>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.76rem', color: 'var(--text-muted,#8c6e52)' }}>
            <span>{progressLabel}</span><span>{progressText}</span>
          </div>
          <StatBar icon="💖" value={progressPct} color="#8bc34a" />

          <StatBar icon="🍖" value={pet.food ?? 50} />
          <StatBar icon="😊" value={pet.mood ?? 50} />

          {pet.isSick && (
            <>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted,#8c6e52)', marginTop: 4 }}>💊 康復進度</div>
              <StatBar icon="💊" value={pet.recoveryProgress ?? 0} color="#e57373" />
            </>
          )}

          {pet.isPregnant && (
            <>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted,#8c6e52)', marginTop: 4 }}>💗 孕育進度</div>
              <StatBar icon="💗" value={pet.pregnancyProgress ?? 0} color="#ff80ab" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function BirthModal({ babyId, babyName, onResolve, onClose }) {
  const [step, setStep] = useState('choose');
  const [choice, setChoice] = useState(null);
  const [name, setName] = useState('新寵物');

  const handleChoice = c => {
    if (c === 'giveaway') { onResolve('giveaway', babyId, null); onClose(); return; }
    setChoice(c);
    setStep('name');
  };

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>✨ 迎接新生命</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🍼</div>
          {step === 'choose' ? (
            <>
              <p style={{ color: 'var(--text-muted,#8c6e52)', fontSize: '0.9rem', marginBottom: 14, lineHeight: 1.5 }}>
                寶寶出生了！請決定牠的未來：
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={ghostBtnStyle} onClick={() => handleChoice('replace')}>🌟 讓父母去旅行，繼承優秀基因</button>
                <button style={ghostBtnStyle} onClick={() => handleChoice('mascot')}>🧸 父母留下，寶寶當迷你幼仔</button>
                <button style={ghostBtnStyle} onClick={() => handleChoice('giveaway')}>🏡 為寶寶尋找新家（+100金幣）</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted,#8c6e52)', fontSize: '0.9rem', marginBottom: 14 }}>為寶寶取個名字：</p>
              <input style={inputStyle} value={name} maxLength={10} onChange={e => setName(e.target.value)} placeholder="最多10個字" />
            </>
          )}
        </div>
        {step === 'name' && (
          <div style={modalFootStyle}>
            <button style={{ ...ghostBtnStyle, flex: 1 }} onClick={() => setStep('choose')}>← 返回</button>
            <button style={{ ...btnStyle, flex: 2 }} onClick={() => { onResolve(choice, babyId, name); onClose(); }}>確認</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 血統圖鑑（原基因圖鑑，改讀 LINEAGE_DICTIONARY）───── */
export function LineageArchiveModal({ archive, onClose }) {
  const [flipped, setFlipped] = useState({});
  const entries = Object.entries(LINEAGE_DICTIONARY);

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeadStyle}>
          <span style={{ fontWeight: 700 }}>🧬 家族血統圖鑑</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 10, fontSize: '0.85rem', color: 'var(--color-gold,#f5a623)', fontWeight: 700 }}>
            已解鎖：{archive.length} / {entries.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {entries.map(([id, lineage]) => {
              const unlocked = archive.includes(id);
              const isFlipped = flipped[id];
              return (
                <div key={id}
                  style={{ borderRadius: 14, border: `2px solid ${unlocked ? 'var(--color-gold,#f5a623)' : 'var(--border,rgba(0,0,0,0.09))'}`, background: unlocked ? 'rgba(245,166,35,0.06)' : 'rgba(0,0,0,0.04)', padding: 12, textAlign: 'center', cursor: unlocked ? 'pointer' : 'default', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => unlocked && setFlipped(f => ({ ...f, [id]: !f[id] }))}
                >
                  {!isFlipped ? (
                    <>
                      {lineage.difficult && unlocked && <div style={{ fontSize: '0.7rem', marginBottom: 2 }}>⭐⭐⭐</div>}
                      <div style={{ fontSize: unlocked ? '2.2rem' : '2rem', marginBottom: 6, filter: unlocked ? 'none' : 'grayscale(100%)' }}>
                        {unlocked ? lineage.icon : '❓'}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: unlocked ? 'var(--text,#2c1a0e)' : 'var(--text-muted,#8c6e52)' }}>
                        {unlocked ? id : '尚未解鎖'}
                      </div>
                      {!unlocked && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted,#8c6e52)', marginTop: 4, lineHeight: 1.4, padding: '0 4px' }}>
                          💡 {lineage.hint}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2,#5c3d2e)', lineHeight: 1.5 }}>{lineage.desc}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 樣式 ───────────────────────────────────────────── */
const ghostBtnStyle = {
  padding: '11px 18px', borderRadius: 'var(--radius-sm,8px)',
  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
  fontFamily: 'inherit',
  background: 'var(--bg-panel,#f7e7ce)', color: 'var(--text,#2c1a0e)',
  border: '1.5px solid var(--border-input,#d5c5a8)', boxShadow: 'none',
};