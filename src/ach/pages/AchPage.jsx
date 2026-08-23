/* src/ach/pages/AchPage.jsx */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore, FALLBACK_TASK_CAT, BASE_TASK_CATS } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { usePressGesture } from '@/hooks/usePressGesture.js';
import { useConfirm } from '@/hooks/useConfirm.jsx';
import { getSortedAchievements, getTierConfig, getUnitString } from '@/ach/utils/achSelectors.js';
import { getShopItems } from '@/shop/utils/shopSelectors.js';
import Modal from '@/ui/Modal.jsx';
import { labelStyle, inputStyle, btnStyle } from '@/styles/modalStyles.js';

const modalAnim = `
`;

function ProgressBar({ curr, target }) {
  const pct = Math.min(100, Math.max(0, ((curr || 0) / (target || 1)) * 100));
  return (
    <div style={progressTrackStyle}>
      <div style={{ ...progressFillStyle, width: `${pct}%` }} />
      <span style={progressTextStyle}>{curr || 0} / {target}</span>
    </div>
  );
}

function TierBadge({ tier }) {
  const colors = {
    S: { bg: 'var(--color-danger,#c0392b)', text: '#fff' },
    A: { bg: 'var(--color-violet,#7c3aed)', text: '#fff' },
    B: { bg: 'var(--color-info,#2980b9)', text: '#fff' },
    C: { bg: 'var(--text-muted,#8c6e52)', text: '#fff' },
  };
  const c = colors[tier] || colors.C;
  return (
    <span style={{ ...tierBadgeBase, background: c.bg, color: c.text }}>{tier}</span>
  );
}

function AchCard({ ach, onClaim, onEdit, onCompleteContainer, containerReady }) {
  const isReady = ach.curr >= ach.target && !ach.claimed;
  const isClaimed = ach.claimed;
  const canOpen = !ach.isSystem || ach.editable;

  const { cardRef, pressHandlers } = usePressGesture({
    onLongPress: () => canOpen && onEdit && onEdit(ach),
    disabled: !canOpen,
  });

  let displayTitle = ach.title;
  let icon = '🏅';
  if (ach.tier) {
    if (ach.tier === 'S') icon = '👑';
    else if (ach.tier === 'A') icon = '💎';
  }

  const condLabel = (() => {
    if (ach.targetType === 'tag') return `🏷️ ${ach.targetValue}`;
    if (ach.targetType === 'attr') return `💪 ${ach.targetValue}`;
    if (ach.targetType === 'focus_time') return '⏱️ 專注';
    if (ach.targetType === 'pomodoro') return '🍅 番茄';
    if (ach.targetType === 'streak_tag') return `🔥 ${ach.targetValue}`;
    if (ach.targetType === 'streak_attr') return `🔥 ${ach.targetValue}`;
    if (ach.targetType === 'attr_level') return `⭐ ${ach.targetValue}`;
    if (ach.targetType === 'skill_mastery') return `🎯 ${ach.targetValue}`;
    return '';
  })();

  const borderColor = isReady || (ach.targetType === 'manual_group' && !ach.claimed && containerReady)
    ? 'var(--color-correct,#227A59)'
    : 'var(--border,rgba(0,0,0,0.09))';

  let btnHtml;
  if (ach.targetType === 'manual_group' && !ach.claimed) {
    btnHtml = containerReady
      ? <button style={{ ...claimBtnStyle, background: 'var(--color-gold,#f5a623)', color: '#fff', fontWeight: 800 }} onClick={e => { e.stopPropagation(); onCompleteContainer(ach.id); }}>完成成就</button>
      : <button style={disabledBtnStyle} disabled>尚有任務未完成</button>;
  } else {
    if (isReady) {
      btnHtml = <button style={claimBtnStyle} onClick={e => { e.stopPropagation(); onClaim(ach.id); }}>🎁 領取</button>;
    } else {
      btnHtml = <button style={disabledBtnStyle} disabled>{isClaimed ? '✅ 已領' : '未完成'}</button>;
    }
  }

  return (
    <div
      ref={cardRef}
      style={{ ...achCardStyle, borderLeftColor: borderColor, opacity: isClaimed ? 0.55 : 1, cursor: canOpen ? 'pointer' : 'default' }}
      {...pressHandlers}
    >
      <div style={{ fontSize: 'var(--size-sm)', flexShrink: 0, lineHeight: 1, marginRight: 'var(--space-sm)' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-title)', color: 'var(--text,#2c1a0e)', marginBottom: 'var(--space-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayTitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {ach.tier && <TierBadge tier={ach.tier} />}
          {condLabel && <span style={condTagStyle}>{condLabel}</span>}
          <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-ghost,#9C7B5B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {ach.desc}
          </span>
        </div>
        {ach.targetType !== 'manual_group' && <ProgressBar curr={ach.curr} target={ach.target} />}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 'var(--space-xs)' }}>{btnHtml}</div>
    </div>
  );
}

function HallCard({ ach, allTasksById = {} }) {
  const [flipped, setFlipped] = useState(false);
  const d = new Date(ach.finishDate || Date.now());
  const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  const tierColor = ach.tier === 'S' ? 'var(--color-danger,#c0392b)' : 'var(--color-gold,#f5a623)';
  const bgStyle = ach.tier === 'S' ? { background: 'var(--color-gold-soft,#fef3c7)', borderColor: 'var(--color-gold,#f5a623)' } : {};
  const memberTitles = (ach.memberTaskIds || []).map(id => allTasksById[id] || '(已刪除)');

  return (
    <div style={{ perspective: '1000px', cursor: 'pointer', aspectRatio: '1/1' }} onClick={() => setFlipped(f => !f)}>
      <div style={{ position: 'relative', width: '100%', height: '100%', transition: 'transform 0.6s', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        <div style={{ ...hallCardFaceStyle, ...bgStyle, backfaceVisibility: 'hidden', position: 'absolute', top: 0, left: 0 }}>
          <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
            {ach.tier === 'S' ? '👑' : '🏅'}
          </div>
          <div style={{ fontWeight: 900, fontSize: 'var(--font-body)', color: 'var(--text,#2c1a0e)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{ach.title}</div>
          <div style={{ fontSize: 'var(--font-caption)', color: tierColor, fontWeight: 800, marginTop: 'var(--space-xs)' }}>TIER {ach.tier}</div>
        </div>
        <div style={{ ...hallCardFaceStyle, backfaceVisibility: 'hidden', position: 'absolute', top: 0, left: 0, transform: 'rotateY(180deg)', background: 'var(--bg-elevated,#fff)', border: `2px solid ${tierColor}` }}>
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-2,#5c3d2e)', fontWeight: 700, marginBottom: 'var(--space-xs)', textAlign: 'center', lineHeight: 1.4 }}>{ach.desc}</div>
          {memberTitles.length > 0 && (
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost,#9C7B5B)', textAlign: 'center', marginBottom: 'var(--space-xs)', lineHeight: 1.4, padding: '0 var(--space-xs)' }}>
              📋 {memberTitles.join('、')}
            </div>
          )}
          <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost,#9C7B5B)', background: 'var(--bg-box,rgba(0,0,0,0.035))', padding: 'var(--space-xs) var(--space-xs)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>📅 達成日<br />{dateStr}</div>
        </div>
      </div>
    </div>
  );
}

function RewardRevealModal({ summary, onClose }) {
  const [phase, setPhase] = useState('roll');

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <Modal
      title="🎉 成就達成！"
      onClose={phase === 'reveal' ? onClose : undefined}
      footer={
        <button style={{ ...btnStyle, flex: 1 }} onClick={onClose} disabled={phase === 'roll'}>
          {phase === 'roll' ? '發放中...' : '太棒了！'}
        </button>
      }
    >
      <div style={{ textAlign: 'center', padding: 'var(--space-xs) 0' }}>
        <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)', animation: phase === 'roll' ? 'npcBounce 0.6s infinite' : 'npcSettle 0.4s' }}>
          🧙
        </div>
        {phase === 'roll' ? (
          <div style={{ fontSize: 'var(--font-title)', fontWeight: 700, color: 'var(--text-muted)' }}>正在準備獎勵...</div>
        ) : (
          <div style={{ animation: 'fadeIn 0.4s' }}>
            <div style={{ fontWeight: 800, marginBottom: 'var(--space-xs)' }}>總共完成了 {summary.summary.count} 項相關任務</div>
            <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
              {Object.entries(summary.summary.byCat).map(([cat, n]) => `${cat} x${n}`).join('　')}
            </div>
            <div style={{ fontWeight: 700, color: 'var(--color-gold-dark)', fontSize: 'var(--font-title)' }}>
              💰+{summary.reward.gold} ✨+{summary.reward.exp}
            </div>
            {summary.rewardCoupons > 0 && (
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-2)', marginTop: 'var(--space-xs)' }}>🎫 金幣券 x{summary.rewardCoupons}</div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes npcBounce { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
        @keyframes npcSettle { from{transform:scale(0.7);opacity:0;} to{transform:scale(1);opacity:1;} }
        @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
      `}</style>
    </Modal>
  );
}

function RewardItemPicker({ items, value, onChange }) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...items].sort((a, b) => {
    const ua = a.id.startsWith('usr_') ? 0 : 1;
    const ub = b.id.startsWith('usr_') ? 0 : 1;
    return ua - ub;
  }), [items]);
  const selected = items.find(i => i.id === value);

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => setOpen(o => !o)}>
        <span>{selected ? `${selected.icon} ${selected.name}` : '不指定（依任務難度自動計算金幣/經驗）'}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: 'var(--bg-card,#fff)', border: '1px solid var(--border,rgba(0,0,0,0.09))', borderRadius: 'var(--radius-sm)', padding: 'var(--space-xs)', marginTop: 'var(--space-xs)', maxHeight: 220, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
          <button type="button" onClick={() => { onChange(''); setOpen(false); }} style={{ ...pickerGridItemStyle, width: '100%', flexDirection: 'row', justifyContent: 'center', marginBottom: 'var(--space-xs)', fontSize: 'var(--font-body)' }}>不指定</button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-xs)' }}>
            {sorted.map(i => (
              <button type="button" key={i.id} onClick={() => { onChange(i.id); setOpen(false); }}
                style={{ ...pickerGridItemStyle, background: value === i.id ? 'var(--color-correct-soft,#d7f0e6)' : pickerGridItemStyle.background }}>
                <div style={{ fontSize: 'var(--size-sm)' }}>{i.icon}</div>
                <div style={{ fontSize: 'var(--font-caption)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{i.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneFormModal({ initial, taskCats, skills, shopItems = [], allTasksById = {}, onSave, onDelete, onClose }) {
  const isEdit = !!initial?.id;
  const isSystemEditable = !!(initial?.isSystem && initial?.editable);
  const isContainer = initial?.targetType === 'manual_group';
  const memberTaskTitles = (initial?.memberTaskIds || []).map(id => allTasksById[id] || '(已刪除)');
  const [form, setForm] = useState(() => initial
    ? { ...initial }
    : { id: null, title: '', desc: '', targetType: 'tag', targetValue: taskCats[0] || FALLBACK_TASK_CAT, tier: 'C', isUpgradeable: false }
  );
  const [askConfirm, confirmDialog] = useConfirm();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const targetTypeStr = form.targetType;
  const taskCatsStr = taskCats.join(',');
  const skillsStr = skills.map(sk => sk.name).join(',');

  useEffect(() => {
    if (isSystemEditable || isContainer) return;
    if (targetTypeStr === 'attr' || targetTypeStr === 'streak_attr') {
      if (!skills.some(sk => sk.name === form.targetValue)) set('targetValue', skills[0]?.name || '');
    } else if (targetTypeStr === 'tag' || targetTypeStr === 'streak_tag') {
      if (!taskCats.includes(form.targetValue)) set('targetValue', taskCats[0] || FALLBACK_TASK_CAT);
    }
  }, [targetTypeStr, skillsStr, taskCatsStr, skills, taskCats, form.targetValue, isSystemEditable, isContainer]);

  const config = getTierConfig(form.tier, form.targetType);
  const unitStr = getUnitString(form.targetType);

  const needsValueSelect = !['focus_time', 'pomodoro'].includes(form.targetType);
  const isStreak = form.targetType.startsWith('streak_');
  const isAttr = form.targetType === 'attr' || form.targetType === 'streak_attr';

  const handleSave = () => {
    if (!form.title.trim()) {
      EventBus.emit(Events.System.TOAST, '⚠️ 請輸入目標標題');
      return;
    }
    onSave(form);
    onClose();
  };

  const handleDeleteClick = () => {
    askConfirm(
      isContainer
        ? '確定要刪除這個成就嗎？歸入的任務不會被刪除，但這個成就的設定與進度會一併消失，此動作無法復原。'
        : '確定要刪除這個目標嗎？進度會一併消失，此動作無法復原。',
      () => { onDelete(form.id); onClose(); }
    );
  };

  const typeOptions = [
    { value: 'tag', label: '🏷️ 任務分類' },
    { value: 'attr', label: '💪 技能鍛鍊' },
    { value: 'streak_tag', label: '🔥 連續分類' },
    { value: 'streak_attr', label: '🔥 連續技能' },
  ];

  return (
    <>
      <Modal
        title={isEdit ? '編輯目標' : '建立新目標'}
        onClose={onClose}
        footer={
          <>
            {isEdit && !isSystemEditable && (
              <button style={{ ...btnStyle, background: 'var(--color-danger,#c0392b)', border: 'none', boxShadow: '0 4px 0 var(--color-danger-dark,#922b21)' }} onClick={handleDeleteClick}>刪除</button>
            )}
            <button style={{ ...btnStyle, flex: 1 }} onClick={handleSave}>{isEdit ? '儲存' : '建立目標'}</button>
          </>
        }
      >
        <label style={labelStyle}>目標標題</label>
        <input style={inputStyle} placeholder="例如：健身達人" value={form.title} onChange={e => set('title', e.target.value)} />

        {isSystemEditable ? (
          <>
            <label style={{ ...labelStyle, marginTop: 'var(--space-xs)' }}>描述</label>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: 'var(--size-lg)' }} value={form.desc || ''} onChange={e => set('desc', e.target.value)} placeholder="寫下這個成就對你的意義" />
          </>
        ) : isContainer ? (
          <>
            <label style={{ ...labelStyle, marginTop: 'var(--space-xs)' }}>描述（選填）</label>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: 'var(--size-md)' }} value={form.desc || ''} onChange={e => set('desc', e.target.value)} placeholder="這個成就對你的意義" />

            <div style={{ ...boxStyle, marginTop: 'var(--space-xs)' }}>
              <label style={labelStyle}>已歸入的任務（{memberTaskTitles.length}）</label>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted)' }}>
                {memberTaskTitles.length === 0 ? '尚無任務' : memberTaskTitles.join('、')}
              </div>
            </div>

            <div style={{ ...boxStyle, marginTop: 'var(--space-xs)' }}>
              <label style={labelStyle}>🎁 指定獎勵道具（選填，鑽石類商品不開放）</label>
              <RewardItemPicker items={shopItems.filter(i => i.currency !== 'gem')} value={form.rewardItemId || ''} onChange={v => set('rewardItemId', v || null)} />
            </div>

            <div style={{ ...boxStyle, marginTop: 'var(--space-xs)' }}>
              <label style={labelStyle}>🎫 附加金幣券（選填）</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {[0, 1, 3, 5].map(n => (
                  <button key={n} type="button"
                    style={{ ...tierBtnStyle, flex: 1, background: (form.rewardCoupons || 0) === n ? 'var(--color-correct,#227A59)' : 'var(--bg-card,#fff)', color: (form.rewardCoupons || 0) === n ? '#fff' : 'var(--text,#2c1a0e)', border: `1.5px solid ${(form.rewardCoupons || 0) === n ? 'var(--color-correct,#227A59)' : 'var(--border-input,#d5c5a8)'}` }}
                    onClick={() => set('rewardCoupons', n)}>{n === 0 ? '不給' : `${n}張`}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ ...boxStyle, marginTop: 'var(--space-xs)' }}>
              <label style={labelStyle}>達成條件</label>
              <select style={{ ...inputStyle, marginBottom: 'var(--space-xs)' }} value={form.targetType} onChange={e => set('targetType', e.target.value)}>
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <div>
                {isStreak && <div style={{ color: 'var(--color-danger,#c0392b)', fontSize: 'var(--font-body)', marginBottom: 'var(--space-xs)', fontStyle: 'italic' }}>🔥 必須每天至少完成一項，中斷即歸零！</div>}
                {form.targetType === 'focus_time' && <div style={hintTextStyle}>將根據每次專注的分鐘數累積</div>}
                {form.targetType === 'pomodoro' && <div style={hintTextStyle}>完成一次番茄鐘累積 1 顆</div>}

                {needsValueSelect && (
                  <>
                    <label style={labelStyle}>{isAttr ? '選擇技能' : '選擇分類'}</label>
                    {isAttr ? (
                      <select style={inputStyle} value={form.targetValue} onChange={e => set('targetValue', e.target.value)}>
                        {skills.map(sk => <option key={sk.name} value={sk.name}>{sk.name}</option>)}
                      </select>
                    ) : (
                      <select style={inputStyle} value={form.targetValue} onChange={e => set('targetValue', e.target.value)}>
                        {taskCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ ...boxStyle, marginTop: 'var(--space-xs)', borderColor: 'var(--color-gold,#f5a623)', background: 'var(--color-gold-soft,#fef3c7)' }}>
              <label style={labelStyle}>難度層級</label>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                {['S', 'A', 'B', 'C'].map(t => (
                  <button key={t} style={{ ...tierBtnStyle, flex: 1, background: form.tier === t ? 'var(--color-correct,#227A59)' : 'var(--bg-card,#fff)', color: form.tier === t ? '#fff' : 'var(--text,#2c1a0e)', border: `1.5px solid ${form.tier === t ? 'var(--color-correct,#227A59)' : 'var(--border-input,#d5c5a8)'}` }} onClick={() => set('tier', t)}>{t}</button>
                ))}
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-2,#5c3d2e)', background: 'rgba(255,255,255,0.5)', padding: 'var(--space-xs)', borderRadius: 'var(--radius-sm,8px)' }}>
                <div>🎯 目標：累積完成 <b>{config.target}</b> {unitStr}</div>
                <div>🎁 獎勵：💰{config.reward.gold} ✨{config.reward.exp}</div>
              </div>
            </div>

            <div style={{ ...boxStyle, marginTop: 'var(--space-xs)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer', fontSize: 'var(--font-body)', color: 'var(--text)' }}>
                <input type="checkbox" checked={form.isUpgradeable} onChange={() => set('isUpgradeable', !form.isUpgradeable)} style={{ width: 'var(--size-xs)', height: 'var(--size-xs)', accentColor: 'var(--color-correct,#227A59)' }} />
                達成後自動開啟下一階段挑戰
              </label>
            </div>
          </>
        )}
      </Modal>
      {confirmDialog}
    </>
  );
}

function HallOfFame({ onBack }) {
  const milestones = useGameStore(s => s.milestones) || [];
  const achievements = useGameStore(s => s.achievements) || [];
  const tasks = useGameStore(s => s.tasks) || [];
  const history = useGameStore(s => s.history) || [];
  const allTasksById = useMemo(() => {
    const map = {};
    [...tasks, ...history].forEach(t => { map[t.id] = t.title; });
    return map;
  }, [tasks, history]);

  const claimed = [...milestones, ...achievements].filter(a => a.claimed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-panel,#f7e7ce)' }}>
      {/* 返回由 onRegisterBack 處理，不另顯示頂部標題列 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-2xl)' }}>
        <div style={statBoardStyle}>
          <div>
            <div style={{ fontSize: 'var(--font-body)', color: 'var(--color-gold-dark,#c47d0e)', fontWeight: 'bold' }}>榮譽總數</div>
            <div style={{ fontSize: 'var(--size-sm)', fontWeight: 900, color: 'var(--text)' }}>{claimed.length}</div>
          </div>
          <div style={{ width: 2, background: 'var(--color-gold,#f5a623)', opacity: 0.3 }} />
          <div>
            <div style={{ fontSize: 'var(--font-body)', color: 'var(--color-gold-dark,#c47d0e)', fontWeight: 'bold' }}>S級傳說</div>
            <div style={{ fontSize: 'var(--size-sm)', fontWeight: 900, color: 'var(--color-danger,#c0392b)' }}>
              {claimed.filter(a => a.tier === 'S').length}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 var(--space-md)' }}>
          {claimed.length === 0 ? (
            <div style={emptyStyle}>
              <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)' }}>🏆</div>
              <div style={{ fontWeight: 700 }}>尚未領取任何獎牌</div>
            </div>
          ) : (
            <>
              {(() => {
                const official = claimed.filter(a => a.isSystem);
                const custom = claimed.filter(a => !a.isSystem);
                const section = (title, list) => list.length === 0 ? null : (
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ fontWeight: 800, fontSize: 'var(--font-body)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>{title}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {list.map(a => <HallCard key={a.id} ach={a} allTasksById={allTasksById} />)}
                    </div>
                  </div>
                );
                return (
                  <>
                    {section('🏅 官方成就', official)}
                    {section('✨ 自訂成就', custom)}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
      <style>{modalAnim}</style>
    </div>
  );
}

export default function AchPage({ onRegisterBack } = {}) {
  const milestones = useGameStore(s => s.milestones) || [];
  const achievements = useGameStore(s => s.achievements) || [];
  const taskCats = useGameStore(s => s.taskCats) || BASE_TASK_CATS;
  const skills = useGameStore(s => s.skills) || [];
  const tasks = useGameStore(s => s.tasks) || [];
  const history = useGameStore(s => s.history) || [];
  const sysShop = useGameStore(s => s.sysShop) || {};
  const shopUserItems = useGameStore(s => s.shop?.user) || [];
  const shopItems = useMemo(() => getShopItems(sysShop, shopUserItems, '全部'), [sysShop, shopUserItems]);
  const allTasksById = useMemo(() => {
    const map = {};
    [...tasks, ...history].forEach(t => { map[t.id] = t.title; });
    return map;
  }, [tasks, history]);
  const tasksById = useMemo(() => {
    const map = {};
    tasks.forEach(t => { map[t.id] = t; });
    return map;
  }, [tasks]);

  const isContainerReady = useCallback((ach) => {
    if (ach.targetType !== 'manual_group') return true;
    return (ach.memberTaskIds || []).every(id => {
      const t = tasksById[id];
      return !t || t.done;
    });
  }, [tasksById]);

  const [filter, setFilter] = useState('全部');
  const [showHall, setShowHall] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAch, setEditingAch] = useState(null);
  const [containerSummary, setContainerSummary] = useState(null);

  useEffect(() => {
    if (!onRegisterBack) return;
    if (showHall) {
      onRegisterBack('achpage-hall', () => setShowHall(false));
    } else {
      onRegisterBack('achpage-hall', null);
    }
    return () => onRegisterBack('achpage-hall', null);
  }, [showHall, onRegisterBack]);

  const dynamicTags = [...new Set(
    achievements.filter(a => a.isSystem && a.targetType === 'tag').map(a => a.targetValue)
  )];
  const filterCats = ['全部', '里程碑', '官方', ...dynamicTags];

  const sorted = getSortedAchievements(milestones, achievements);
  const displayed = sorted
    .filter(a => {
      if (a.claimed) return false;
      if (filter === '里程碑') return !a.isSystem;
      if (filter === '官方') return a.isSystem;
      if (dynamicTags.includes(filter)) return a.targetValue === filter;
      return true;
    })
    .sort((a, b) => {
      const customA = !a.isSystem ? 1 : 0;
      const customB = !b.isSystem ? 1 : 0;
      if (customA !== customB) return customB - customA;
      const scoreA = (a.done && !a.claimed) ? 2 : (!a.done ? 1 : 0);
      const scoreB = (b.done && !b.claimed) ? 2 : (!b.done ? 1 : 0);
      return scoreB - scoreA;
    });

  const { run } = useRequestAction();

  useEffect(() => {
    const unsub = EventBus.on(Events.Ach.COMPLETE_CONTAINER_RESULT, (result) => {
      if (result.success) setContainerSummary(result);
      else EventBus.emit(Events.System.TOAST, `⚠️ ${result.msg || '無法完成'}`);
    });
    return unsub;
  }, []);

  const handleClaim = useCallback(id => run(Events.Ach.REQUEST_CLAIM_REWARD, Events.Ach.CLAIM_REWARD_RESULT, { id }, {
    successMsg: (result) => `🎉 領取成功！💰+${result.reward.gold} ✨+${result.reward.exp}`,
    failMsg: (result) => `⚠️ ${result?.msg || '領取失敗'}`,
    timeoutMsg: '❌ 領取逾時，請稍後再試',
  }), [run]);

  const handleCompleteContainer = useCallback(id => {
    EventBus.emit(Events.Ach.REQUEST_COMPLETE_CONTAINER, { id, requestId: Date.now() });
  }, []);

    const handleSaveMilestone = useCallback(form => {
    if (!form?.id) return;
    if (form.isSystem && form.editable) {
      EventBus.emit(Events.Ach.REQUEST_UPDATE_TEXT, { id: form.id, title: form.title, desc: form.desc });
    } else if (form.targetType === 'manual_group') {
      EventBus.emit(Events.Ach.REQUEST_UPDATE_CONTAINER, { id: form.id, title: form.title, desc: form.desc, rewardItemId: form.rewardItemId || null });
    }
  }, []);

  const handleDeleteMilestone = useCallback(id => {
    EventBus.emit(Events.Ach.REQUEST_DELETE_MILESTONE, { id });
  }, []);

  const handleEdit = useCallback(ach => {
    setEditingAch(ach);
    setShowForm(true);
  }, []);

  if (showHall) return <HallOfFame onBack={() => setShowHall(false)} />;

  return (
    <div style={pageStyle}>
      <div style={filterBarStyle}>
        <div style={filterScrollStyle}>
          {filterCats.map(c => (
            <button key={c}
              style={{ ...filterBtnStyle, background: filter === c ? 'var(--color-correct,#227A59)' : 'transparent', color: filter === c ? '#fff' : 'var(--text-muted,#8c6e52)', border: filter === c ? 'none' : '1px solid var(--border,rgba(0,0,0,0.09))' }}
              onClick={() => setFilter(c)}
            >{c}</button>
          ))}
        </div>
        <button style={hallEntryBtnStyle} onClick={() => setShowHall(true)}>🏆 殿堂</button>
      </div>

      <div style={scrollAreaStyle}>
        {displayed.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 'var(--size-md)', marginBottom: 'var(--space-xs)' }}>🏅</div>
            <div style={{ fontWeight: 700, color: 'var(--text,#2c1a0e)' }}>暫無成就</div>
            <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted,#8c6e52)', marginTop: 'var(--space-xs)' }}>可在新增任務時綁定成就，或完成官方目標後領取</div>
          </div>
        ) : (
          displayed.map(a => (
            <AchCard
              key={a.id} ach={a}
              onClaim={handleClaim} onEdit={handleEdit}
              onCompleteContainer={handleCompleteContainer}
              containerReady={isContainerReady(a)}
            />
          ))
        )}
        <div style={{ height: 100 }} />
      </div>

      <style>{modalAnim}</style>

      {showForm && editingAch && (
        <MilestoneFormModal
          initial={editingAch}
          taskCats={taskCats}
          skills={skills}
          shopItems={shopItems}
          allTasksById={allTasksById}
          onSave={handleSaveMilestone}
          onDelete={handleDeleteMilestone}
          onClose={() => setShowForm(false)}
        />
      )}

      {containerSummary && (
        <RewardRevealModal summary={containerSummary} onClose={() => setContainerSummary(null)} />
      )}
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────────────────── */
// 與 Task 列表共用同一套 filter 高度／間距，避免 list ↔ ach 切換時標籤列跳動
const pageStyle = { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-panel,#f7e7ce)' };
const filterBarStyle = { flexShrink: 0, paddingBottom: 'var(--space-xs)', paddingTop: 'var(--space-xs)', paddingLeft: 'var(--space-xs)', paddingRight: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' };
const filterScrollStyle = { flex: 1, display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' };
const filterBtnStyle = { flexShrink: 0, borderRadius: 50, padding: 'var(--space-xs) var(--space-sm)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', transition: 'var(--t-fast)', fontFamily: 'inherit', background: 'var(--bg-card)', border: '1px solid var(--border)' };
const hallEntryBtnStyle = { flexShrink: 0, padding: 'var(--space-xs) var(--space-sm)', borderRadius: 50, border: '1.5px solid var(--color-gold,#f5a623)', background: 'var(--bg-card,#fff)', color: 'var(--color-gold-dark,#c47d0e)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit' };
const scrollAreaStyle = { flex: 1, overflowY: 'auto', padding: '0 var(--space-xs)', overflowX: 'hidden' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', opacity: 0.6 };
const achCardStyle = { display: 'flex', alignItems: 'center', background: 'var(--bg-card,#fff)', borderRadius: 'var(--radius-md,12px)', padding: 'var(--space-sm) var(--space-sm) var(--space-sm) var(--space-md)', marginBottom: 'var(--space-xs)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border,rgba(0,0,0,0.07))', borderLeft: '4px solid var(--border-input,#d5c5a8)' };
const tierBadgeBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'var(--size-xs)', height: 'var(--size-xs)', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-caption)', fontWeight: 900, flexShrink: 0 };
const condTagStyle = { background: 'var(--bg-box,rgba(0,0,0,0.035))', padding: '2px 6px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-caption)', color: 'var(--text-muted,#8c6e52)', border: '1px solid var(--border,rgba(0,0,0,0.09))', whiteSpace: 'nowrap' };
const progressTrackStyle = { position: 'relative', background: 'rgba(0,0,0,0.09)', borderRadius: 'var(--radius-full)', overflow: 'hidden', height: 'var(--size-xs)', marginTop: 'var(--space-xs)' };
const progressFillStyle = { height: '100%', background: 'linear-gradient(90deg, var(--color-correct,#227A59), #4ac994)', transition: 'width var(--t-slow)' };
const progressTextStyle = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-caption)', color: '#fff', fontWeight: 800, textShadow: '0 1px 1px rgba(0,0,0,0.8)' };
const claimBtnStyle = { padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm,8px)', border: 'none', background: 'var(--color-gold,#f5a623)', color: 'var(--color-gold-dark,#c47d0e)', fontSize: 'var(--font-body)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' };
const disabledBtnStyle = { padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm,8px)', border: '1px solid var(--border,rgba(0,0,0,0.09))', background: 'var(--bg-box,rgba(0,0,0,0.035))', color: 'var(--text-ghost,#9C7B5B)', fontSize: 'var(--font-body)', cursor: 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' };
const hallHeaderStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card,#fff)', padding: 'var(--space-sm) var(--space-sm)', borderBottom: '1px solid var(--border,rgba(0,0,0,0.09))' };
const backBtnStyle = { background: 'transparent', border: 'none', fontSize: 'var(--font-title)', cursor: 'pointer', color: 'var(--text,#2c1a0e)', width: 'var(--size-sm)', height: 'var(--size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statBoardStyle = { background: 'var(--color-gold-soft,#fef3c7)', border: '2px solid var(--color-gold,#f5a623)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', margin: 'var(--space-md)', display: 'flex', justifyContent: 'space-around', textAlign: 'center', boxShadow: 'var(--shadow-sm,0 2px 6px rgba(0,0,0,0.09))' };
const hallCardFaceStyle = { width: '100%', height: '100%', background: 'var(--bg-card,#fff)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border,rgba(0,0,0,0.09))', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm,0 2px 6px rgba(0,0,0,0.09))' };
const tierBtnStyle = { padding: 'var(--space-xs) 0', borderRadius: 'var(--radius-sm,8px)', fontWeight: 800, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit', transition: 'var(--t-fast)' };
const boxStyle = { padding: 'var(--space-xs)', background: 'var(--bg-elevated,#fff)', border: '1px solid var(--border,rgba(0,0,0,0.09))', borderRadius: 'var(--radius-md,12px)' };
const hintTextStyle = { fontSize: 'var(--font-body)', color: 'var(--text-muted,#8c6e52)', fontStyle: 'italic', marginBottom: 'var(--space-xs)', paddingLeft: 2 };
const pickerGridItemStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border,rgba(0,0,0,0.09))', cursor: 'pointer', background: 'var(--bg-box,rgba(0,0,0,0.035))', fontFamily: 'inherit' };
const fabStyle = { position: 'absolute', bottom: 25, right: 25, width: 'var(--size-lg)', height: 'var(--size-lg)', borderRadius: '50%', background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none', fontSize: 'var(--size-sm)', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 };