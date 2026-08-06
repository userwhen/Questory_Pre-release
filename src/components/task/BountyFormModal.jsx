/* src/components/task/BountyFormModal.jsx */
import React, { useState } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { BOUNTY_TYPES, STAMP_OPTIONS } from '@/data/taskdict.js';
import {
  maskStyle, modalStyle, modalHeadStyle, closeXStyle,
  modalBodyStyle, modalFootStyle, btnStyle,
} from '@/components/task/TaskStyles.js';

const parchmentStyle = {
  background: 'linear-gradient(160deg,#fdf8ed 0%,#f7e9c8 60%,#f0d9a0 100%)',
  borderRadius: 14,
  border: '2px solid #c8a96e',
  padding: '20px 18px',
  marginBottom: 16,
  boxShadow: 'inset 0 2px 8px rgba(150,100,30,0.10)',
  fontFamily: 'Georgia, serif',
  lineHeight: 2.0,
  fontSize: '1rem',
  color: '#3b2519',
};

const blankStyle = {
  display: 'inline-block',
  borderBottom: '2px solid #9a6c2e',
  minWidth: 80,
  padding: '0 4px',
  background: 'rgba(255,255,255,0.5)',
  borderRadius: '3px 3px 0 0',
  fontFamily: 'inherit',
  fontSize: '1rem',
  color: '#3b2519',
  outline: 'none',
  verticalAlign: 'bottom',
};

export default function BountyFormModal({ cats, skills = [], onSave, onClose }) {
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState('');
  const [target,   setTarget]   = useState(10);
  const [stamps,   setStamps]   = useState(new Set());
  const [deadline, setDeadline] = useState('');
  const [subs,     setSubs]     = useState([{ text: '', done: false }]);
  const [imp,      setImp]      = useState(2);
  const [urg,      setUrg]      = useState(2);
  const [cat,      setCat]      = useState('');

  const toggleStamp = key => {
    setStamps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = () => {
    if (!title.trim()) { EventBus.emit(Events.System.TOAST, '⚠️ 委託書尚未填寫任務名稱'); return; }
    const resolvedType = type === 'count' ? 'count' : 'normal';
    const questClass   = type === 'boss' ? 'boss' : 'guild';
    onSave({
      title:      title.trim(),
      cat,
      type:       resolvedType,
      importance: stamps.has('reward') ? imp : 2,
      urgency:    stamps.has('reward') ? urg : 2,
      target:     type === 'count' ? (parseInt(target) || 10) : 1,
      deadline:   stamps.has('deadline') ? deadline : '',
      subs:       stamps.has('subs') ? subs.filter(s => s.text.trim()) : [],
      subRule:    'all',
      pinned:     false,
      attrs:      [],
      questClass,
    });
    onClose();
  };

  const catOptions = cats || ['日常', '運動', '工作', '待辦'];

  return (
    <div style={maskStyle} onClick={onClose}>
      <div style={{ ...modalStyle, maxHeight: '92vh', background: '#fdf5e6' }} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalHeadStyle, background: '#5c3317' }}>
          <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>📜 委託書</span>
          <button style={closeXStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ ...modalBodyStyle, paddingTop: 20 }}>
          <div style={parchmentStyle}>
            <div style={{ fontSize: '0.72rem', color: '#9a6c2e', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, textAlign: 'center' }}>— 懸賞委託 —</div>

            <div style={{ marginBottom: 4 }}>
              本人承諾完成&nbsp;
              <input
                style={{ ...blankStyle, minWidth: 140 }}
                placeholder="任務名稱"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 4 }}>
              任務性質為&nbsp;
              <select
                style={{ ...blankStyle, minWidth: 100, cursor: 'pointer' }}
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="">【選擇類型】</option>
                {BOUNTY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>

            {type === 'count' && (
              <div style={{ marginBottom: 4, animation: 'fadeIn 0.3s' }}>
                共需執行&nbsp;
                <input
                  type="number"
                  style={{ ...blankStyle, minWidth: 48, width: 56, textAlign: 'center' }}
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                />&nbsp;次方可結算
              </div>
            )}

            {type === 'exercise' && (
              <div style={{ marginBottom: 4, animation: 'fadeIn 0.3s', fontSize: '0.9rem', color: '#7a4a1e' }}>
                此為體能強化類委託，完成後自動計入鍛鍊紀錄。
              </div>
            )}

            {type === 'boss' && (
              <div style={{ marginBottom: 4, animation: 'fadeIn 0.3s', fontSize: '0.9rem', color: '#7a4a1e' }}>
                此為重大專案，需拆解子任務逐步推進。
              </div>
            )}

            <div style={{ marginBottom: 4 }}>
              歸類於&nbsp;
              <select style={{ ...blankStyle, minWidth: 80, cursor: 'pointer' }} value={cat} onChange={e => setCat(e.target.value)}>
                {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>&nbsp;類別
            </div>

            {stamps.has('deadline') && (
              <div style={{ marginBottom: 4, animation: 'fadeIn 0.3s' }}>
                限期於&nbsp;
                <input
                  type="datetime-local"
                  style={{ ...blankStyle, minWidth: 160 }}
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                />&nbsp;前完成
              </div>
            )}

            {stamps.has('reward') && (
              <div style={{ marginBottom: 4, animation: 'fadeIn 0.3s' }}>
                重要程度&nbsp;
                <input type="range" min="1" max="4" value={imp} onChange={e => setImp(parseInt(e.target.value))}
                  style={{ verticalAlign: 'middle', width: 80 }} />
                &nbsp;<b>{imp}</b>，緊迫程度&nbsp;
                <input type="range" min="1" max="4" value={urg} onChange={e => setUrg(parseInt(e.target.value))}
                  style={{ verticalAlign: 'middle', width: 80 }} />
                &nbsp;<b>{urg}</b>
              </div>
            )}

            {stamps.has('subs') && (
              <div style={{ marginTop: 8, animation: 'fadeIn 0.3s' }}>
                <div style={{ fontSize: '0.8rem', color: '#9a6c2e', marginBottom: 6 }}>執行步驟：</div>
                {subs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ color: '#9a6c2e', fontWeight: 700, minWidth: 18 }}>{i + 1}.</span>
                    <input style={{ ...blankStyle, flex: 1 }}
                      placeholder={`步驟 ${i + 1}`}
                      value={s.text}
                      onChange={e => { const ns = [...subs]; ns[i] = { ...ns[i], text: e.target.value }; setSubs(ns); }}
                    />
                    {subs.length > 1 && (
                      <button style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', padding: 0 }}
                        onClick={() => setSubs(subs.filter((_, idx) => idx !== i))}>✕</button>
                    )}
                  </div>
                ))}
                <button
                  style={{ fontSize: '0.8rem', color: '#9a6c2e', background: 'transparent', border: '1px dashed #c8a96e', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', marginTop: 4 }}
                  onClick={() => setSubs([...subs, { text: '', done: false }])}>+ 新增步驟</button>
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: 'right', fontSize: '0.72rem', color: '#9a6c2e', borderTop: '1px dashed #c8a96e', paddingTop: 8 }}>
              立書人簽章 ＿＿＿＿　日期 {new Date().toLocaleDateString()}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>魔法印章（追加條款）</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STAMP_OPTIONS.map(st => (
                <button key={st.key}
                  onClick={() => toggleStamp(st.key)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', transition: '0.15s',
                    border: stamps.has(st.key) ? '2px solid #9a6c2e' : '2px dashed #c8a96e',
                    background: stamps.has(st.key) ? '#f0d9a0' : 'transparent',
                    color: '#5c3317',
                    boxShadow: stamps.has(st.key) ? '0 2px 6px rgba(150,100,30,0.25)' : 'none',
                  }}>
                  {st.icon} {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...modalFootStyle, background: '#f0d9a0', borderTop: '1px solid #c8a96e' }}>
          <button style={{ ...btnStyle, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', boxShadow: 'none' }} onClick={onClose}>取消</button>
          <button style={{ ...btnStyle, flex: 1, background: '#5c3317', border: 'none', boxShadow: '0 4px 0 #3b2008' }} onClick={handleSave}>📜 發布委託</button>
        </div>
      </div>
    </div>
  );
}
