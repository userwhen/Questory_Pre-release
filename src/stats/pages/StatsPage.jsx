/* src/stats/pages/StatsPage.jsx */

// 1. 第三方套件 (External Libraries)
import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  Filler,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip
} from 'chart.js';

// 2. 核心機制與狀態 (Core & Hooks)
import { Events } from '@/core/event_types.js';
import { EventBus } from '@/core/events.js';
import { useGameStore } from '@/core/state.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';

// 3. UI 元件與樣式 (Components & Styles)
import Modal from '@/ui/Modal.jsx';
import { btnStyle, inputStyle, labelStyle } from '@/styles/modalStyles.js';
import { pageStyle, scrollAreaStyle } from '@/task/components/TaskStyles.js'; // ⚠️ 已根據你的目錄結構修正路徑

// Chart.js 註冊
Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/* ─── 雷達圖 ─────────────────────────────────────────── */
function RadarChart({ attrs }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !Chart) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const order = ['STR', 'INT', 'AGI', 'CHR', 'VIT', 'LUK'];
    const labels = [], values = [];
    order.forEach(k => { if (attrs[k]) { labels.push(attrs[k].name); values.push(attrs[k].v); } });

    const style = getComputedStyle(document.body);
    const gold = style.getPropertyValue('--color-gold').trim() || '#f5a623';
    const muted = style.getPropertyValue('--text-muted').trim() || '#8c6e52';
    const maxVal = Math.max(...values, 1) + 2;

    chartRef.current = new Chart(canvas, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: gold + '55',
          borderColor: gold,
          borderWidth: 2,
          pointBackgroundColor: '#fff',
          pointBorderColor: gold,
        }],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: maxVal,
            ticks: { display: false },
            pointLabels: { font: { size: 12, weight: 'bold' }, color: muted },
            grid: { color: 'rgba(0,0,0,0.06)' },
            angleLines: { color: 'rgba(0,0,0,0.06)' },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [attrs]);

  return (
    <div style={{ height: 170, width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ─── 技能表單 Modal ─────────────────────────────────── */
function SkillModal({ initial, attrs, onClose }) {
  const isEdit = !!initial?.editId;
  const [name, setName] = useState(initial?.name || '');
  const [parent, setParent] = useState(initial?.parent || 'STR');
  const [error, setError] = useState('');
  const { run, loading: saving } = useRequestAction();

  const handleSave = () => run(Events.Stats.REQUEST_SAVE_SKILL, Events.Stats.SAVE_SKILL_RESULT,
    { name, parent, editId: initial?.editId || null },
    {
      showFailToast: false,
      timeoutMsg: '儲存逾時，請稍後再試',
      onSuccess: onClose,
      onError: (result) => setError(result?.msg || '儲存逾時，請稍後再試'),
    }
  );

  const handleDelete = () => {
    EventBus.emit(Events.Stats.REQUEST_DELETE_SKILL, { name: initial.editId });
    onClose();
  };

  return (
    <Modal
      title={isEdit ? '編輯技能' : '新增技能'}
      onClose={onClose}
      footer={
        <>
          {isEdit && (
            <button style={{ ...btnStyle, background: 'var(--color-danger, #c0392b)', color: '#fff', border: 'none' }}
              onClick={handleDelete}>🗑️ 刪除</button>
          )}
          <button style={{ ...btnStyle, flex: 1, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? '儲存中…' : (isEdit ? '儲存變更' : '確認新增')}
          </button>
        </>
      }
    >
      <label style={labelStyle}>技能名稱</label>
      <input style={inputStyle} placeholder="例如：跑酷..."
        value={name} onChange={e => { setName(e.target.value); setError(''); }} />
      {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-body)', margin: '-8px 0 10px' }}>{error}</p>}

      <label style={labelStyle}>綁定主屬性</label>
      <select style={{ ...inputStyle, marginBottom: 'var(--space-sm)' }} value={parent} onChange={e => setParent(e.target.value)}>
        {Object.entries(attrs).map(([k, a]) => (
          <option key={k} value={k}>{a.icon} {a.name}</option>
        ))}
      </select>

      {isEdit && initial?.skill && (
        <div style={{ padding: 'var(--space-sm)', background: 'var(--color-gold-soft, #fef3c7)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-body)', color: 'var(--color-gold-dark, #c47d0e)', marginBottom: 'var(--space-sm)' }}>
          🔥 目前等級: Lv.{initial.skill.lv}<br />
          累積經驗: {initial.skill.exp} / {initial.skill.lv * 10}
        </div>
      )}
    </Modal>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────── */
export default function StatsPage() {
  const attrs          = useGameStore(s => s.attrs          || {});
  const skills         = useGameStore(s => s.skills         || []);
  const archivedSkills = useGameStore(s => s.archivedSkills || []);
  const lv             = useGameStore(s => s.lv             || 1);
  const exp            = useGameStore(s => s.exp             || 0);

  const [skillModal, setSkillModal] = useState(null); // null | { editId, name, parent, skill }

  const expPct = Math.min(100, Math.round((exp / (lv * 100)) * 100));

  const openAdd = () => setSkillModal({ editId: null, name: '', parent: 'STR' });
  const openEdit = sk => setSkillModal({ editId: sk.name, name: sk.name, parent: sk.parent, skill: sk });

  return (
    <div style={pageStyle}>
      {/* ── 雷達圖 ── */}
      <div style={{ flexShrink: 0, padding: 'var(--space-xs) var(--space-md)' }}>
        <RadarChart attrs={attrs} />
      </div>

      {/* ── 內容區 ── */}
      <div style={scrollAreaStyle}>
            {/* 屬性格子 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)' }}>
              {Object.values(attrs).map(a => {
                const pct = Math.min(100, Math.round((a.exp / (a.v * 100)) * 100));
                return (
                  <div key={a.name} style={attrCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                      <span>{a.icon} <strong>{a.name}</strong></span>
                      <span style={{ fontWeight: 700, color: 'var(--color-gold-dark, #c47d0e)' }}>Lv.{a.v}</span>
                    </div>
                    <ProgressBar pct={pct} text={`${a.exp}/${a.v * 100}`} />
                  </div>
                );
              })}
            </div>

            {/* 技能列表 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-title)', color: 'var(--text-2, #5c3d2e)' }}>修煉技能</h3>
              <button style={addBtnStyle} onClick={openAdd}>+ 新增</button>
            </div>

            {skills.length === 0 ? (
              <div style={emptyStyle}>
                <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>⚔️</div>
                <div style={{ fontWeight: 700 }}>尚無技能</div>
              </div>
            ) : skills.map(sk => {
              const pAttr = attrs[sk.parent] || { icon: '❓' };
              const pct = Math.min(100, Math.round((sk.exp / (sk.lv * 10)) * 100));
              return (
                <div key={sk.name} style={{ ...skillCardStyle, opacity: sk.isRusty ? 0.75 : 1 }}
                  onClick={() => openEdit(sk)}>
                  <span style={{ fontSize: 'var(--size-sm)', marginRight: 'var(--space-sm)', flexShrink: 0 }}>{pAttr.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      {sk.name}
                      {sk.isRusty && <span style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)' }}>🕸️ 生鏽中</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)' }}>Lv.{sk.lv}</span>
                    </div>
                    <ProgressBar pct={pct} text={`${sk.exp}/${sk.lv * 10}`} color="var(--color-gold, #f5a623)" />
                  </div>
                  <span style={{ fontSize: 'var(--font-title)', marginLeft: 'var(--space-xs)', opacity: 0.5 }}>⚙️</span>
                </div>
              );
            })}

            {/* 榮譽殿堂 */}
            {archivedSkills.length > 0 && (
              <>
                <h3 style={{ fontSize: 'var(--font-title)', color: 'var(--text-2, #5c3d2e)', margin: 'var(--space-lg) 0 var(--space-xs)' }}>🏆 榮譽殿堂</h3>
                {archivedSkills.map(sk => (
                  <div key={sk.name} style={{ ...skillCardStyle, opacity: 0.6, cursor: 'default' }}>
                    <span style={{ fontSize: 'var(--size-sm)', marginRight: 'var(--space-sm)' }}>{attrs[sk.parent]?.icon || '🏅'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{sk.name} <span style={{ fontSize: 'var(--font-body)', color: 'var(--color-gold-dark, #c47d0e)' }}>大師級</span></div>
                      <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)' }}>已達 Lv.{sk.lv}</div>
                    </div>
                    <span style={{ fontSize: 'var(--font-title)' }}>👑</span>
                  </div>
                ))}
              </>
            )}

            <div style={{ height: 'var(--size-xl)' }} />
      </div>

      {skillModal && (
        <SkillModal initial={skillModal} attrs={attrs} onClose={() => setSkillModal(null)} />
      )}
    </div>
  );
}

/* ─── 共用進度條 ─────────────────────────────────────── */
function ProgressBar({ pct, text, color = 'var(--color-correct, #227A59)' }) {
  return (
    <div style={{ position: 'relative', background: 'rgba(0,0,0,0.09)', borderRadius: 'var(--radius-full)', overflow: 'hidden', height: 'var(--size-xs)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width var(--t-slow)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-caption)', color: '#fff', fontWeight: 800, textShadow: '0 1px 1px rgba(0,0,0,0.8)' }}>
        {text}
      </div>
    </div>
  );
}

/* ─── 樣式（Stats 專屬的部分維持在這裡；pageStyle/segmentWrapStyle/segBtnStyle/
       scrollAreaStyle 已改成 import，不在這裡重複定義）──────────────── */
const attrCardStyle = { background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)', boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.07))', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)' };
const skillCardStyle = { display: 'flex', alignItems: 'center', background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-sm)', marginBottom: 'var(--space-xs)', boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', borderLeft: '4px solid var(--color-gold, #f5a623)', cursor: 'pointer' };
const addBtnStyle = { padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-xs)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', opacity: 0.5, color: 'var(--text, #2c1a0e)' };