/* src/components/pages/StatsPage.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';
import Modal from '@/components/ui/Modal.jsx';
import { labelStyle, inputStyle, btnStyle } from '@/styles/modalStyles.js';
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
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', margin: '-8px 0 10px' }}>{error}</p>}

      <label style={labelStyle}>綁定主屬性</label>
      <select style={{ ...inputStyle, marginBottom: 12 }} value={parent} onChange={e => setParent(e.target.value)}>
        {Object.entries(attrs).map(([k, a]) => (
          <option key={k} value={k}>{a.icon} {a.name}</option>
        ))}
      </select>

      {isEdit && initial?.skill && (
        <div style={{ padding: 12, background: 'var(--color-gold-soft, #fef3c7)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--color-gold-dark, #c47d0e)', marginBottom: 12 }}>
          🔥 目前等級: Lv.{initial.skill.lv}<br />
          累積經驗: {initial.skill.exp} / {initial.skill.lv * 10}
        </div>
      )}
    </Modal>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────── */
export default function StatsPage() {
  // 拆成各自獨立的 selector：只有該欄位真的變動時才會觸發重繪，
  // 不會再被 attrs 以外的 store 更新拖著一起重建圖表
  const attrs          = useGameStore(s => s.attrs          || {});
  const skills         = useGameStore(s => s.skills         || []);
  const archivedSkills = useGameStore(s => s.archivedSkills || []);
  const lv             = useGameStore(s => s.lv             || 1);
  const exp            = useGameStore(s => s.exp            || 0);

  const [tab, setTab] = useState('attr');
  const [skillModal, setSkillModal] = useState(null); // null | { editId, name, parent, skill }

  const expPct = Math.min(100, Math.round((exp / (lv * 100)) * 100));

  const openAdd = () => setSkillModal({ editId: null, name: '', parent: 'STR' });
  const openEdit = sk => setSkillModal({ editId: sk.name, name: sk.name, parent: sk.parent, skill: sk });

  return (
    <div style={pageStyle}>
      {/* ── 頂部雷達/熱量切換 ── */}
      <div style={{ flexShrink: 0, padding: '10px 15px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[['attr', '● 能力分析'], ['cal', '● 熱量監控']].map(([val, label]) => (
            <button key={val}
              style={{ ...segBtnStyle, background: tab === val ? 'var(--color-correct, #227A59)' : 'var(--bg-box, rgba(0,0,0,0.035))', color: tab === val ? '#fff' : 'var(--text-muted, #8c6e52)' }}
              onClick={() => setTab(val)}
            >{label}</button>
          ))}
        </div>

        {tab === 'attr' ? (
          <RadarChart attrs={attrs} />
        ) : (
          <CalCard />
        )}
      </div>

      {/* ── 內容區 ── */}
      <div style={scrollAreaStyle}>
        {tab === 'attr' ? (
          <>
            {/* 屬性格子 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
              {Object.values(attrs).map(a => {
                const pct = Math.min(100, Math.round((a.exp / (a.v * 100)) * 100));
                return (
                  <div key={a.name} style={attrCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span>{a.icon} <strong>{a.name}</strong></span>
                      <span style={{ fontWeight: 700, color: 'var(--color-gold-dark, #c47d0e)' }}>Lv.{a.v}</span>
                    </div>
                    <ProgressBar pct={pct} text={`${a.exp}/${a.v * 100}`} />
                  </div>
                );
              })}
            </div>

            {/* 技能列表 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-2, #5c3d2e)' }}>修煉技能</h3>
              <button style={addBtnStyle} onClick={openAdd}>+ 新增</button>
            </div>

            {skills.length === 0 ? (
              <div style={emptyStyle}>
                <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>⚔️</div>
                <div style={{ fontWeight: 700 }}>尚無技能</div>
              </div>
            ) : skills.map(sk => {
              const pAttr = attrs[sk.parent] || { icon: '❓' };
              const pct = Math.min(100, Math.round((sk.exp / (sk.lv * 10)) * 100));
              return (
                <div key={sk.name} style={{ ...skillCardStyle, opacity: sk.isRusty ? 0.75 : 1 }}
                  onClick={() => openEdit(sk)}>
                  <span style={{ fontSize: '1.8rem', marginRight: 12, flexShrink: 0 }}>{pAttr.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {sk.name}
                      {sk.isRusty && <span style={{ fontSize: '0.75rem', color: 'var(--text-ghost, #9C7B5B)' }}>🕸️ 生鏽中</span>}
                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted, #8c6e52)' }}>Lv.{sk.lv}</span>
                    </div>
                    <ProgressBar pct={pct} text={`${sk.exp}/${sk.lv * 10}`} color="var(--color-gold, #f5a623)" />
                  </div>
                  <span style={{ fontSize: '1.1rem', marginLeft: 10, opacity: 0.5 }}>⚙️</span>
                </div>
              );
            })}

            {/* 榮譽殿堂 */}
            {archivedSkills.length > 0 && (
              <>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-2, #5c3d2e)', margin: '20px 0 10px' }}>🏆 榮譽殿堂</h3>
                {archivedSkills.map(sk => (
                  <div key={sk.name} style={{ ...skillCardStyle, opacity: 0.6, cursor: 'default' }}>
                    <span style={{ fontSize: '1.8rem', marginRight: 12 }}>{attrs[sk.parent]?.icon || '🏅'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{sk.name} <span style={{ fontSize: '0.8rem', color: 'var(--color-gold-dark, #c47d0e)' }}>大師級</span></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8c6e52)' }}>已達 Lv.{sk.lv}</div>
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>👑</span>
                  </div>
                ))}
              </>
            )}

            <div style={{ height: 80 }} />
          </>
        ) : (
          <CalLogList />
        )}
      </div>

      {skillModal && (
        <SkillModal initial={skillModal} attrs={attrs} onClose={() => setSkillModal(null)} />
      )}
    </div>
  );
}

function CalCard() {
  const cal = useGameStore(s => s.cal || { today: 0, logs: [] });
  const settings = useGameStore(s => s.settings || {});
  const maxCal = settings.calMax || 2000;
  const consumed = Math.max(0, cal.today || 0);
  const consumedPct = Math.min(100, Math.round((consumed / maxCal) * 100));

  const [punchMode, setPunchMode] = useState(false);
  const [truth, setTruth] = useState(null);
  const [popping, setPopping] = useState(null);
  const { run, loading } = useRequestAction();

  useEffect(() => {
    const unsub = EventBus.on(Events.Stats.CALORIE_TRUTH_READY, setTruth);
    EventBus.emit(Events.Stats.REQUEST_CALORIE_TRUTH);
    return unsub;
  }, [cal]);

  const quota = truth?.quota || 0;
  const burned = truth?.burned || 0;
  const balls = truth?.balls || [];
  const burnPct = burned > 0 ? Math.round((quota / burned) * 100) : 0;

  const handlePunch = (ball, idx) => {
    if (!punchMode || loading) return;
    run(Events.Stats.REQUEST_POP_BALL, Events.Stats.POP_BALL_RESULT,
      { amount: ball.kcal },
      {
        showFailToast: false, // popCalorieBall() 內部已經自己 toast「額度不足」
        onSuccess: () => { setPopping(idx); setTimeout(() => setPopping(null), 300); },
      }
    );
  };

  return (
    <div style={{
      position: 'relative', minHeight: 170, borderRadius: 12, overflow: 'hidden',
      border: '1px solid var(--border, rgba(0,0,0,0.09))',
      background: punchMode ? 'rgba(192,57,43,0.08)' : 'var(--bg-card, #fff)',
      transition: 'background 0.3s', padding: 16,
    }}>
      <button
        onClick={() => setPunchMode(v => !v)}
        disabled={balls.length === 0 && !punchMode}
        title={punchMode ? '結束打擊' : '打擊熱量'}
        style={{
          position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%',
          border: `2px solid ${punchMode ? '#fff' : 'var(--border, rgba(0,0,0,0.09))'}`,
          background: punchMode ? 'var(--color-danger, #c0392b)' : 'var(--bg-box, rgba(0,0,0,0.045))',
          fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))', zIndex: 2,
        }}
      >{punchMode ? '❌' : '🥊'}</button>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 5, color: punchMode ? 'var(--color-danger, #c0392b)' : 'var(--text-muted, #8c6e52)' }}>
          {punchMode ? '🥊 今日可燃燒（運動任務獲得）' : '今日已攝取（未燃燒）'}
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, marginBottom: 8, color: punchMode ? 'var(--color-danger, #c0392b)' : 'var(--text, #2c1a0e)' }}>
          {punchMode
            ? <>{quota} <span style={{ fontSize: '1rem' }}>kcal</span></>
            : <>{consumed} <span style={{ fontSize: '1rem', color: 'var(--text-ghost, #9C7B5B)' }}>/ {maxCal}</span></>
          }
        </div>
        <div style={{ width: '75%', margin: '0 auto' }}>
          <ProgressBar
            pct={punchMode ? burnPct : consumedPct}
            text={punchMode ? `${quota} kcal 額度` : `${consumed} kcal`}
            color={punchMode ? 'var(--color-danger, #c0392b)' : (consumedPct > 80 ? 'var(--color-danger, #c0392b)' : 'var(--color-correct, #227A59)')}
          />
        </div>
      </div>

      {punchMode && (
        balls.length === 0 ? (
          <div style={{ marginTop: 14, fontSize: '0.8rem', color: 'var(--text-ghost, #9C7B5B)', textAlign: 'center' }}>
            目前沒有熱量球，去運動任務賺點燃燒額度，或吃點東西吧！
          </div>
        ) : (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {balls.map((ball, idx) => (
              <button
                key={idx}
                onClick={() => handlePunch(ball, idx)}
                title={`${ball.kcal} kcal`}
                style={{
                  width: ball.radius * 2, height: ball.radius * 2, borderRadius: '50%',
                  border: '1.5px solid var(--color-danger, #c0392b)', background: 'var(--bg-card, #fff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: ball.radius * 0.9, cursor: 'pointer',
                  transform: popping === idx ? 'scale(0)' : 'scale(1)', opacity: popping === idx ? 0 : 1,
                  transition: 'transform 0.3s ease, opacity 0.3s ease',
                }}
              >{ball.emoji}</button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function CalLogList() {
  const logs = useGameStore(s => s.cal?.logs || []);
  return (
    <div style={{ paddingBottom: 80 }}>
      {logs.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🍽️</div>
          <div style={{ fontWeight: 700 }}>尚無紀錄</div>
        </div>
      ) : logs.map((l, i) => {
        const match = l.match(/([+-]?\d+)$/);
        const val = match ? parseInt(match[1]) : 0;
        const text = l.replace(/([+-]?\d+)$/, '').trim();
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed var(--border, rgba(0,0,0,0.09))' }}>
            <span style={{ color: 'var(--text-2, #5c3d2e)', fontSize: '0.95rem' }}>{text}</span>
            <span style={{ fontWeight: 700, color: val <= 0 ? 'var(--color-correct, #227A59)' : 'var(--color-danger, #c0392b)' }}>
              {val > 0 ? '+' : ''}{val}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── 共用進度條 ─────────────────────────────────────── */
function ProgressBar({ pct, text, color = 'var(--color-correct, #227A59)' }) {
  return (
    <div style={{ position: 'relative', background: 'rgba(0,0,0,0.09)', borderRadius: 9999, overflow: 'hidden', height: 13 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 800, textShadow: '0 1px 1px rgba(0,0,0,0.8)' }}>
        {text}
      </div>
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────────────────── */
const pageStyle = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
const scrollAreaStyle = { flex: 1, overflowY: 'auto', padding: '10px 15px', overflowX: 'hidden' };
const segBtnStyle = { flex: 1, border: 'none', borderRadius: 50, padding: '7px 0', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: '0.2s', fontFamily: 'inherit' };
const attrCardStyle = { background: 'var(--bg-card, #fff)', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.07))', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', fontSize: '0.9rem', color: 'var(--text, #2c1a0e)' };
const skillCardStyle = { display: 'flex', alignItems: 'center', background: 'var(--bg-card, #fff)', borderRadius: 12, padding: '12px 13px', marginBottom: 10, boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', borderLeft: '4px solid var(--color-gold, #f5a623)', cursor: 'pointer' };
const addBtnStyle = { padding: '5px 14px', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', opacity: 0.5, color: 'var(--text, #2c1a0e)' };
