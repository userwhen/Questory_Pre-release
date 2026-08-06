/* src/components/task/TaskFormModal.jsx */
import React, { useState, useMemo, useRef } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { TaskDict, REMINDER_MODES } from '@/task/data/taskdict.js';
import LocationPickerModal from '@/task/components/LocationPickerModal.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useGameStore, LOCKED_TASK_CATS, FALLBACK_TASK_CAT } from '@/core/state.js';
import {
  labelStyle, inputStyle,
  btnStyle, btnSmallStyle, boxStyle,
} from '@/task/components/TaskStyles.js';
import { getRewardWeight, getRewardRange } from '@/utils/rewardCurve.js';

// 每個分類預設顯示哪些欄位（其餘收進「展開進階戰術設定」）
const CATEGORY_VISIBLE_FIELDS = {
  gather: ['desc', 'subs'],
  hunt: ['subs', 'recurrence'],
  event: ['location', 'deadline', 'reminder'],
  boss: ['desc', 'subs', 'matrix'],
  guild: ['desc'],
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const ADVANCED_TOGGLABLE_FIELDS = ['desc', 'subs', 'location', 'recurrence', 'deadline', 'skills', 'matrix', 'achLink'];

// 目前是不是「自訂」：間隔 > 1，或選了「週」但有指定特定星期幾
const getRecurrencePresetKey = (r) => {
  if (!r) return 'none';
  if (r.interval > 1 || (r.unit === 'week' && r.days && r.days.length > 0)) return 'custom';
  if (r.unit === 'day') return 'day1';
  if (r.unit === 'week') return 'week1';
  if (r.unit === 'month') return 'month1';
  if (r.unit === 'year') return 'year1';
  return 'custom';
};

// 自訂週期時，依「起始日＋頻率」推算下一次發生日期；指定特定星期幾時邏輯較複雜，先不推算
const getNextOccurrenceLabel = (startDateStr, recurrence) => {
  if (!startDateStr || !recurrence) return null;
  if (recurrence.unit === 'week' && (recurrence.days || []).length > 0) return null;
  const start = new Date(`${startDateStr}T00:00:00`);
  if (isNaN(start.getTime())) return null;
  const interval = recurrence.interval || 1;
  const next = new Date(start);
  switch (recurrence.unit) {
    case 'day': next.setDate(next.getDate() + interval); break;
    case 'week': next.setDate(next.getDate() + interval * 7); break;
    case 'month': next.setMonth(next.getMonth() + interval); break;
    case 'year': next.setFullYear(next.getFullYear() + interval); break;
    default: return null;
  }
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `將於 ${y}/${m}/${d} 再次發生`;
};

export default function TaskFormModal({ initial, cats, skills = [], unlocks = {}, openAchievements = [], onSave, onDelete, onClose }) {
  const isEdit = !!initial?.id;
  const qc = initial?.questClass || 'guild';
  const qDict = TaskDict.Task.QuestClass[qc] || TaskDict.Task.QuestClass.guild;
  const dDict = TaskDict.Task.DefaultForm;

  const visibleFields = CATEGORY_VISIBLE_FIELDS[qc] || CATEGORY_VISIBLE_FIELDS.guild;
  const hasAdvancedFields = ADVANCED_TOGGLABLE_FIELDS.some(f => !visibleFields.includes(f));
  const showDescAbove = visibleFields.includes('desc');
  const showSubsAbove = visibleFields.includes('subs');
  const showMatrixAbove = visibleFields.includes('matrix');
  const showRecurrenceAbove = visibleFields.includes('recurrence');
  const showDeadlineAbove = visibleFields.includes('deadline');
  const showLocationAbove = visibleFields.includes('location');
  const showSkillsAbove = visibleFields.includes('skills');
  // 起始日/循環/截止日合併成一塊，兩者任一該露出，整塊就露出
  const showTimeSettingsAbove = showRecurrenceAbove || showDeadlineAbove;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [draggedSubIdx, setDraggedSubIdx] = useState(null);
  const [subDraft, setSubDraft] = useState('');
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [addDraft, setAddDraft] = useState('');
  const [pendingCatDelete, setPendingCatDelete] = useState(null);
  const catPressTimer = useRef(null);
  const catPressOrigin = useRef({ x: 0, y: 0 });

  const addTaskCat = useGameStore(s => s.addTaskCat);
  const renameTaskCat = useGameStore(s => s.renameTaskCat);
  const deleteTaskCat = useGameStore(s => s.deleteTaskCat);

  const [form, setForm] = useState(() => ({
    title: '',
    desc: '',
    cat: FALLBACK_TASK_CAT,
    type: 'normal',
    importance: 2,
    urgency: 2,
    target: 0,
    calories: 0,
    pinned: false,
    startDate: '',
    notifyOnStart: false,
    deadline: '',
    recurrence: null,
    reminderMode: 'none',
    narrativeMode: false,
    subRule: 'all',
    location: '',
    questClass: qc,
    achLink: null,
    ...initial,
    subs: initial?.subs ? JSON.parse(JSON.stringify(initial.subs)) : [],
    attrs: initial?.attrs ? [...initial.attrs] : [],
  }));

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const CAT_LONG_PRESS_MS = 600;
  const CAT_MOVE_CANCEL_PX = 10;
  const clearCatPressTimer = () => {
    if (catPressTimer.current) { clearTimeout(catPressTimer.current); catPressTimer.current = null; }
  };
  const handleCatPointerDown = (e, c) => {
    if (LOCKED_TASK_CATS.includes(c)) return;
    catPressOrigin.current = { x: e.clientX, y: e.clientY };
    catPressTimer.current = setTimeout(() => { setRenamingCat(c); setRenameDraft(c); }, CAT_LONG_PRESS_MS);
  };
  const handleCatPointerMove = (e) => {
    if (!catPressTimer.current) return;
    const dx = Math.abs(e.clientX - catPressOrigin.current.x);
    const dy = Math.abs(e.clientY - catPressOrigin.current.y);
    if (dx > CAT_MOVE_CANCEL_PX || dy > CAT_MOVE_CANCEL_PX) clearCatPressTimer();
  };
  const handleCatPointerUp = clearCatPressTimer;

  const submitRenameCat = () => {
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === renamingCat) { setRenamingCat(null); return; }
    const result = renameTaskCat(renamingCat, trimmed);
    if (!result.success) { EventBus.emit(Events.System.TOAST, `⚠️ ${result.msg}`); return; }
    if (form.cat === renamingCat) set('cat', trimmed);
    setRenamingCat(null);
  };

  const submitDeleteCat = () => {
    setPendingCatDelete(renamingCat);
    setRenamingCat(null);
  };

  const finalizeDeleteCat = (alsoDeleteAchievements) => {
    const result = deleteTaskCat(pendingCatDelete, alsoDeleteAchievements);
    if (!result.success) {
      EventBus.emit(Events.System.TOAST, `⚠️ ${result.msg}`);
      setPendingCatDelete(null);
      return;
    }
    if (form.cat === pendingCatDelete) set('cat', FALLBACK_TASK_CAT);
    setPendingCatDelete(null);
  };

  const submitAddCat = () => {
    const trimmed = addDraft.trim();
    if (!trimmed) { setAddingCat(false); return; }
    const result = addTaskCat(trimmed);
    if (!result.success) { EventBus.emit(Events.System.TOAST, `⚠️ ${result.msg}`); return; }
    set('cat', trimmed);
    setAddDraft('');
    setAddingCat(false);
  };

  const reorderSubs = (from, to) => {
    if (from === null || from === to) return;
    const ns = [...form.subs];
    const [moved] = ns.splice(from, 1);
    ns.splice(to, 0, moved);
    set('subs', ns);
  };

  const estimatedRewards = useMemo(() => {
    const w = getRewardWeight(form.importance, form.urgency);
    return getRewardRange(w);
  }, [form.importance, form.urgency]);

  const handleSave = () => {
    if (!form.title.trim()) { EventBus.emit(Events.System.TOAST, '⚠️ 請輸入任務名稱'); return; }
    const narrativeText = form.narrativeMode && qDict.descTemplate
      ? qDict.descTemplate({ title: form.title, desc: form.desc, subs: form.subs, target: form.target, location: form.location })
      : null;
    onSave({ ...form, narrativeText });
    onClose();
  };

  const DescBlock = (
    <>
      <label style={labelStyle}>{qDict.descLabel}</label>
      <textarea style={{ ...inputStyle, resize: 'none', minHeight: 60 }} placeholder={qDict.descPlaceholder} value={form.desc} onChange={e => set('desc', e.target.value)} />
    </>
  );

  const SkillsBlock = (
    <>
      <label style={labelStyle}>{dDict.skillsLabel}</label>
      <div style={{ ...boxStyle, display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15 }}>
        {skills.length === 0
          ? <span style={{ color: 'var(--text-ghost)', fontSize: '0.8rem' }}>{dDict.noSkills}</span>
          : skills.map(s => {
            const active = form.attrs?.includes(s.name);
            return (
              <button key={s.name} onClick={() => {
                const newAttrs = active ? form.attrs.filter(a => a !== s.name) : [...(form.attrs || []), s.name].slice(0, 3);
                set('attrs', newAttrs);
              }} style={{ ...btnSmallStyle, background: active ? 'var(--color-correct-soft)' : 'transparent', borderColor: active ? 'var(--color-correct)' : 'var(--border)', color: active ? 'var(--color-correct-dark)' : 'inherit', opacity: active ? 1 : 0.7 }}>
                {s.name}
              </button>
            );
          })
        }
      </div>
    </>
  );

  const CaloriesBlock = (unlocks.feature_cal && form.cat === '運動') ? (
    <div style={{ ...boxStyle, background: 'var(--color-gold-soft)', borderColor: 'var(--color-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
      <span style={{ fontWeight: 'bold', color: 'var(--color-gold-dark)' }}>{dDict.caloriesLabel}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input type="number" maxLength={4} style={{ ...inputStyle, width: 70, marginBottom: 0, padding: 6, border: 'none', background: 'rgba(255,255,255,0.7)' }} value={form.calories} onChange={e => set('calories', Math.min(9999, parseInt(e.target.value.slice(0, 4)) || 0))} />
        <span style={{ fontWeight: 'bold', color: 'var(--color-gold-dark)' }}>Kcal</span>
      </div>
    </div>
  ) : null;

  const MatrixBlock = (
    <div style={{ ...boxStyle, marginBottom: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>{dDict.matrixLabel}</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>💰{estimatedRewards.min}~{estimatedRewards.max} ✨{estimatedRewards.min}~{estimatedRewards.max}</span>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span>{dDict.importance}</span><b>{form.importance}</b></div>
        <input type="range" min="1" max="4" style={{ width: '100%' }} value={form.importance} onChange={e => set('importance', parseInt(e.target.value))} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span>{dDict.urgency}</span><b>{form.urgency}</b></div>
        <input type="range" min="1" max="4" style={{ width: '100%' }} value={form.urgency} onChange={e => set('urgency', parseInt(e.target.value))} />
      </div>
    </div>
  );
  const AchLinkBlock = (
    <div style={{ ...boxStyle, marginBottom: 15 }}>
      <label style={labelStyle}>🏅 成就歸屬</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: form.achLink ? 10 : 0 }}>
        {[{ key: null, label: '不指定' }, { key: 'new', label: '建立新成就' }, { key: 'join', label: '加入既有成就' }].map(opt => (
          <button key={String(opt.key)}
            style={{ ...btnSmallStyle, flex: 1, background: (form.achLink?.mode ?? null) === opt.key ? 'var(--color-correct)' : 'var(--bg-card)', color: (form.achLink?.mode ?? null) === opt.key ? '#fff' : 'inherit' }}
            onClick={() => {
              if (opt.key === null) set('achLink', null);
              else if (opt.key === 'new') set('achLink', { mode: 'new', title: '' });
              else set('achLink', { mode: 'join', achievementId: openAchievements[0]?.id || '' });
            }}>{opt.label}</button>
        ))}
      </div>
      {form.achLink?.mode === 'new' && (
        <input style={inputStyle} maxLength={10} placeholder="新成就標題，例如：App 上架計畫" value={form.achLink.title}
          onChange={e => set('achLink', { ...form.achLink, title: e.target.value })} />
      )}
      {form.achLink?.mode === 'join' && (
        openAchievements.length === 0
          ? <div style={{ fontSize: '0.8rem', color: 'var(--text-ghost)' }}>目前沒有可加入的成就，先用「建立新成就」開一個</div>
          : <select style={inputStyle} value={form.achLink.achievementId} onChange={e => set('achLink', { ...form.achLink, achievementId: e.target.value })}>
            {openAchievements.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
      )}
    </div>
  );

  const SubtasksBlock = (
    <div style={{ ...boxStyle, marginBottom: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>🔨 {qDict.subtasksLabel || dDict.addSubtask}</label>
        <button style={{ ...btnSmallStyle, padding: '3px 10px', fontSize: '0.7rem', background: 'var(--color-warning)', color: '#fff', border: 'none' }}
          onClick={() => set('subRule', form.subRule === 'all' ? 'any' : 'all')}>
          {form.subRule === 'all' ? dDict.ruleAll : dDict.ruleAny}
        </button>
      </div>
      {form.subs.map((s, i) => (
        <div key={i} data-sub-idx={i}
          style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, opacity: draggedSubIdx === i ? 0.4 : 1 }}>
          <input style={{ ...inputStyle, flex: 1, marginBottom: 0, padding: '4px 8px' }} value={s.text}
            maxLength={10}
            onChange={e => { const ns = [...form.subs]; ns[i] = { ...ns[i], text: e.target.value }; set('subs', ns); }}
            placeholder={`步驟 ${i + 1}`} />
          <button style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)' }} onClick={() => set('subs', form.subs.filter((_, idx) => idx !== i))}>✕</button>
          <span
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDraggedSubIdx(i); }}
            onPointerMove={e => {
              if (draggedSubIdx === null) return;
              const el = document.elementFromPoint(e.clientX, e.clientY);
              const rowEl = el && el.closest('[data-sub-idx]');
              if (!rowEl) return;
              const overIdx = parseInt(rowEl.dataset.subIdx, 10);
              if (overIdx !== draggedSubIdx) { reorderSubs(draggedSubIdx, overIdx); setDraggedSubIdx(overIdx); }
            }}
            onPointerUp={e => { e.currentTarget.releasePointerCapture(e.pointerId); setDraggedSubIdx(null); }}
            onPointerCancel={() => setDraggedSubIdx(null)}
            style={{ cursor: 'grab', color: 'var(--text-ghost)', fontSize: '1rem', lineHeight: 1, flexShrink: 0, touchAction: 'none' }}>☰</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input style={{ ...inputStyle, flex: 1, marginBottom: 0, padding: '4px 8px', border: '1px dashed var(--border)' }}
          value={subDraft}
          maxLength={10}
          onChange={e => setSubDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const text = subDraft.trim();
              if (!text) return;
              set('subs', [...form.subs, { text, done: false }]);
              setSubDraft('');
            }
          }}
          placeholder={dDict.addSubtask} />
        <button
          onClick={() => {
            const text = subDraft.trim();
            if (!text) return;
            set('subs', [...form.subs, { text, done: false }]);
            setSubDraft('');
          }}
          style={{
            background: 'var(--color-correct)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            width: 40,
            padding: '4px 0',
            fontSize: '1.2rem',
            lineHeight: 1,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ＋
        </button>
      </div>
    </div>
  );

  const NUM_INPUT_WIDTH = 90;

  const CountBlock = (
    <div style={{ ...boxStyle, marginBottom: 15 }}>
      <label style={labelStyle}>{dDict.targetLabel || '目標次數'}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        style={{ ...inputStyle, width: '100%', marginBottom: 0 }}
        value={form.target || ''}
        onChange={e => {
          const numericValue = e.target.value.replace(/\D/g, '').slice(0, 4);
          const v = Math.min(9999, parseInt(numericValue, 10) || 0);
          setForm(f => ({ ...f, target: v, type: v > 0 ? 'count' : 'normal' }));
        }}
        placeholder="請輸入須完成目標的次數"
      />
    </div>
  );

  const activePresetKey = getRecurrencePresetKey(form.recurrence);
  const nextOccurrenceLabel = activePresetKey === 'custom'
    ? getNextOccurrenceLabel(form.startDate, form.recurrence)
    : null;

  const TimeSettingsBlock = (
    <div style={{ ...boxStyle, marginBottom: 15 }}>
      <label style={labelStyle}>起始日</label>
      <input
        type="date"
        style={inputStyle}
        value={form.startDate || ''}
        onChange={e => set('startDate', e.target.value)}
      />
      {form.startDate && (
        <button
          style={{ ...btnSmallStyle, marginTop: 6, marginBottom: 4, background: form.notifyOnStart ? 'var(--color-correct)' : 'var(--bg-card)', color: form.notifyOnStart ? '#fff' : 'inherit' }}
          onClick={() => set('notifyOnStart', !form.notifyOnStart)}
        >
          {form.notifyOnStart ? '🔔 開始日會提醒我' : '🔕 開始日不提醒'}
        </button>
      )}

      <label style={{ ...labelStyle, marginTop: 10 }}>{dDict.recurrenceLabel}</label>
      <select
        style={inputStyle}
        value={activePresetKey}
        onChange={e => {
          const key = e.target.value;
          if (key === 'none') set('recurrence', null);
          else if (key === 'day1') set('recurrence', { unit: 'day', interval: 1 });
          else if (key === 'week1') set('recurrence', { unit: 'week', interval: 1, days: [] });
          else if (key === 'month1') set('recurrence', { unit: 'month', interval: 1 });
          else if (key === 'year1') set('recurrence', { unit: 'year', interval: 1 });
          else if (key === 'custom') set('recurrence', { unit: 'day', interval: 2, days: [] });
        }}
      >
        <option value="none">不循環</option>
        <option value="day1">每日</option>
        <option value="week1">每週</option>
        <option value="month1">每月</option>
        <option value="year1">每年</option>
        <option value="custom">自訂週期...</option>
      </select>

      {activePresetKey === 'custom' && form.recurrence && (
        <div style={{ padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 8, marginBottom: 15, marginTop: -5, animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>每</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              style={{ ...inputStyle, width: NUM_INPUT_WIDTH, marginBottom: 0, textAlign: 'center' }}
              value={form.recurrence.interval || 1}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                const val = Math.min(9999, Math.max(1, parseInt(digits, 10) || 1));
                set('recurrence', { ...form.recurrence, interval: val });
              }}
            />
            <select
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              value={form.recurrence.unit || 'day'}
              onChange={e => set('recurrence', { ...form.recurrence, unit: e.target.value, days: [] })}
            >
              <option value="day">天</option>
              <option value="week">週</option>
              <option value="month">個月</option>
              <option value="year">年</option>
            </select>
          </div>

          {form.recurrence.unit === 'week' && (
            <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
              {WEEKDAY_LABELS.map((label, idx) => {
                const active = (form.recurrence.days || []).includes(idx);
                return (
                  <button
                    key={idx}
                    style={{
                      ...btnSmallStyle,
                      flex: 1,
                      padding: '6px 0',
                      background: active ? 'var(--color-correct)' : 'var(--bg-card)',
                      color: active ? '#fff' : 'inherit',
                      border: active ? 'none' : '1px solid var(--border)',
                    }}
                    onClick={() => {
                      const days = form.recurrence.days || [];
                      const next = days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx];
                      set('recurrence', { ...form.recurrence, days: next });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {nextOccurrenceLabel && (
            <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-ghost)' }}>{nextOccurrenceLabel}</div>
          )}
        </div>
      )}

      <label style={{ ...labelStyle, marginTop: activePresetKey === 'custom' ? 0 : 5 }}>{dDict.deadlineLabel}</label>
      <input
        type="datetime-local"
        style={inputStyle}
        value={form.deadline}
        onChange={e => set('deadline', e.target.value)}
      />
    </div>
  );

  const ReminderBlock = form.deadline ? (
    <div style={{ ...boxStyle, marginBottom: 15 }}>
      <label style={{ ...labelStyle, marginBottom: 8 }}>{dDict.reminderLabel}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {REMINDER_MODES.map(m => (
          <button key={m.key}
            style={{ ...btnSmallStyle, flex: 1, background: form.reminderMode === m.key ? 'var(--color-correct)' : 'var(--bg-card)', color: form.reminderMode === m.key ? '#fff' : 'inherit' }}
            onClick={() => set('reminderMode', m.key)}>{m.label}</button>
        ))}
      </div>
    </div>
  ) : null;

  const LocationBlock = (
    <div style={{ ...boxStyle, marginBottom: 15, display: 'flex', gap: 6 }}>
      <input
        style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
        maxLength={10}
        placeholder="輸入地點，或用地圖選擇"
        value={form.location}
        onChange={e => set('location', e.target.value)}
      />
      <button style={{ ...btnSmallStyle, flexShrink: 0 }} onClick={() => setShowLocationPicker(true)}>📍 地圖</button>
    </div>
  );

  return (
    <Modal
      title={isEdit ? '編輯任務' : qDict.modalTitle}
      onClose={onClose}
      footer={isEdit ? (
        <>
          <button style={{ ...btnStyle, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            onClick={() => { onDelete(form.id); onClose(); }}>{dDict.btnDelete}</button>
          <button style={{ ...btnStyle, flex: 1, background: 'var(--color-info)', border: 'none' }}
            onClick={() => { onSave({ ...form, id: null, title: form.title + ' (副本)', createDate: Date.now() }); onClose(); }}>{dDict.btnCopy}</button>
          <button style={{ ...btnStyle, flex: 1 }} onClick={handleSave}>{dDict.btnSave}</button>
        </>
      ) : (
        <>
          <button style={{ ...btnStyle, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            onClick={() => setForm({ title: '', desc: '', cat: FALLBACK_TASK_CAT, type: 'normal', importance: 2, urgency: 2, target: 0, calories: 0, pinned: false, startDate: '', notifyOnStart: false, deadline: '', recurrence: null, reminderMode: 'none', narrativeMode: false, subRule: 'all', subs: [], attrs: [], questClass: qc, location: '', achLink: null })}>
            {dDict.btnClear}
          </button>
          <button style={{ ...btnStyle, flex: 1 }} onClick={handleSave}>{dDict.btnCreate}</button>
        </>
      )}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{qDict.inputLabel}</label>
          <input style={inputStyle} maxLength={10} placeholder="要做什麼呢？" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div style={{ paddingTop: 20, display: 'flex', gap: 4 }}>
          <button style={{ ...btnSmallStyle, fontSize: '0.75rem', padding: '6px 8px', border: 'none', background: form.narrativeMode ? 'var(--color-correct)' : 'transparent', color: form.narrativeMode ? '#fff' : 'inherit', opacity: form.narrativeMode ? 1 : 0.5 }}
            onClick={() => set('narrativeMode', !form.narrativeMode)}>🎭</button>
          <button style={{ ...btnSmallStyle, fontSize: '1.2rem', padding: '6px 8px', border: 'none', background: 'transparent', opacity: form.pinned ? 1 : 0.3 }} onClick={() => set('pinned', !form.pinned)}>📌</button>
        </div>
      </div>

      {showDescAbove && DescBlock}

      <div style={{ ...boxStyle, marginBottom: 15 }}>
        <label style={labelStyle}>{dDict.catLabel} <span style={{ fontSize: '0.7rem', color: 'var(--text-ghost)', fontWeight: 'normal' }}>{dDict.catHint}</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cats.map(c => (
            renamingCat === c ? (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  autoFocus
                  style={{ ...inputStyle, width: 90, marginBottom: 0, padding: '4px 8px' }}
                  maxLength={10}
                  value={renameDraft}
                  onChange={e => setRenameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitRenameCat(); if (e.key === 'Escape') setRenamingCat(null); }}
                />
                <button style={{ ...btnSmallStyle, padding: '4px 8px' }} onClick={submitRenameCat}>✓</button>
                <button style={{ ...btnSmallStyle, padding: '4px 8px', color: 'var(--color-danger)' }} onClick={submitDeleteCat}>🗑</button>
              </div>
            ) : (
              <button key={c}
                style={{ ...btnSmallStyle, background: form.cat === c ? 'var(--color-correct)' : 'var(--bg-card)', color: form.cat === c ? '#fff' : 'inherit' }}
                onClick={() => set('cat', c)}
                onPointerDown={e => handleCatPointerDown(e, c)}
                onPointerMove={handleCatPointerMove}
                onPointerUp={handleCatPointerUp}
                onPointerLeave={handleCatPointerUp}
              >{c}</button>
            )
          ))}
          {addingCat ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                autoFocus
                style={{ ...inputStyle, width: 90, marginBottom: 0, padding: '4px 8px' }}
                maxLength={10}
                value={addDraft}
                onChange={e => setAddDraft(e.target.value)}
                placeholder="新分類"
                onKeyDown={e => { if (e.key === 'Enter') submitAddCat(); if (e.key === 'Escape') setAddingCat(false); }}
              />
              <button style={{ ...btnSmallStyle, padding: '4px 8px' }} onClick={submitAddCat}>✓</button>
            </div>
          ) : (
            <button style={{ ...btnSmallStyle, padding: '4px 10px', opacity: 0.7 }}
              onClick={() => { setAddingCat(true); setAddDraft(''); }}>＋</button>
          )}
        </div>
      </div>
      {CaloriesBlock}
      {showSubsAbove && SubtasksBlock}
      {showSubsAbove && CountBlock}
      {showLocationAbove && LocationBlock}
      {showTimeSettingsAbove && TimeSettingsBlock}
      {showTimeSettingsAbove && ReminderBlock}
      {showSkillsAbove && SkillsBlock}
      {showMatrixAbove && MatrixBlock}

      {hasAdvancedFields && (
        <div onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ textAlign: 'center', padding: 12, marginBottom: 15, background: 'var(--bg-box)', borderRadius: 12, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
          {showAdvanced ? dDict.advClose : dDict.advOpen}
        </div>
      )}

      {hasAdvancedFields && showAdvanced && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {!showDescAbove && DescBlock}
          {!showSubsAbove && SubtasksBlock}
          {!showSubsAbove && CountBlock}
          {!showLocationAbove && LocationBlock}
          {!showTimeSettingsAbove && TimeSettingsBlock}
          {!showTimeSettingsAbove && ReminderBlock}
          {!showSkillsAbove && SkillsBlock}
          {!showMatrixAbove && MatrixBlock}
          {AchLinkBlock}
        </div>
      )}

      {showLocationPicker && (
        <LocationPickerModal
          initialLocation={form.location}
          onConfirm={(loc) => { set('location', loc); setShowLocationPicker(false); }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {pendingCatDelete && (
        <Modal
          title="刪除分類"
          onClose={() => setPendingCatDelete(null)}
          footer={
            <>
              <button style={{ ...btnStyle, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
                onClick={() => finalizeDeleteCat(false)}>保留相關成就</button>
              <button style={{ ...btnStyle, background: 'var(--color-danger)', border: 'none' }}
                onClick={() => finalizeDeleteCat(true)}>一併刪除成就</button>
            </>
          }
        >
          <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
            刪除「{pendingCatDelete}」後，跟這個分類綁在一起的成就要一併刪除嗎？<br />
            選「保留」的話，成就會留著但進度會停在現在的狀態——除非之後又新增一個同名分類，才會自動接回去繼續累積。
          </p>
        </Modal>
      )}
    </Modal>
  );
}