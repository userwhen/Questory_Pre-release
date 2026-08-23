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
import { usePressGesture } from '@/hooks/usePressGesture.js';
import { useConfirm } from '@/hooks/useConfirm.jsx';

// 3. UI 元件與樣式 (Components & Styles)
import Modal from '@/ui/Modal.jsx';
import { btnStyle, btnDangerStyle, inputStyle, labelStyle } from '@/styles/modalStyles.js';
import { pageStyle, scrollAreaStyle, btnSmallStyle } from '@/task/components/TaskStyles.js';

// Chart.js 註冊
Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const ATTR_ORDER = ['STR', 'INT', 'AGI', 'CHR', 'VIT', 'LUK'];

/* ─── 雷達圖（頂點疊透明按鈕當點擊熱區，位置直接讀 Chart.js 實際畫出來的座標，
       不用自己另外猜角度，跟畫面上看到的完全對齊）───────────────────── */
function RadarChart({ attrs, selectedAttr, onSelectAttr }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [points, setPoints] = useState([]); // [{ key, x, y }] —— x/y 是屬性名稱標籤的位置，不是雷達頂點本身

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !Chart) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels = [], values = [], keys = [];
    ATTR_ORDER.forEach(k => { if (attrs[k]) { labels.push(attrs[k].name); values.push(attrs[k].v); keys.push(k); } });

    const style = getComputedStyle(document.body);
    const gold = style.getPropertyValue('--color-gold').trim() || '#f5a623';
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
          pointBackgroundColor: keys.map(k => k === selectedAttr ? gold : '#fff'),
          pointBorderColor: gold,
          pointRadius: keys.map(k => k === selectedAttr ? 6 : 4),
          pointHoverRadius: keys.map(k => k === selectedAttr ? 6 : 4),
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
            // 屬性名稱改由下面的 HTML 藥丸按鈕渲染（含背景色，可視覺標示可點擊），
            // Chart.js 自己的文字標籤關掉，避免兩份文字疊在一起。
            pointLabels: { display: false },
            grid: { color: 'rgba(0,0,0,0.06)' },
            angleLines: { color: 'rgba(0,0,0,0.06)' },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    // 熱區疊在「外圈屬性名稱」的位置，不是疊在雷達頂點本身：
    // 拿圓心座標（scale.xCenter/yCenter，穩定公開屬性）+ 頂點座標，
    // 沿同一條半徑方向再往外推一段固定距離，大致落在 pointLabels 文字的位置。
    // 不去碰 Chart.js 內部的 label 座標（那是私有屬性，版本間可能改動）。
    const LABEL_HIT_OFFSET_PX = 28;
    const readPoints = () => {
      const meta = chartRef.current?.getDatasetMeta(0);
      const scale = chartRef.current?.scales?.r;
      if (!meta || !scale) return;
      const cx = scale.xCenter;
      const cy = scale.yCenter;
      setPoints(keys.map((k, i) => {
        const dp = meta.data[i];
        const dx = dp.x - cx;
        const dy = dp.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
          key: k,
          x: dp.x + (dx / len) * LABEL_HIT_OFFSET_PX,
          y: dp.y + (dy / len) * LABEL_HIT_OFFSET_PX,
        };
      }));
    };
    readPoints();

    const handleResize = () => {
      chartRef.current?.resize();
      readPoints();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [attrs, selectedAttr]);

  return (
    <div style={{ height: 170, width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />
      {points.map(p => {
        const isSel = p.key === selectedAttr;
        return (
          <button
            key={p.key}
            onClick={() => onSelectAttr(isSel ? null : p.key)}
            aria-label={attrs[p.key]?.name}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '4px 10px',
              minHeight: 28,
              whiteSpace: 'nowrap',
              borderRadius: 'var(--radius-full, 999px)',
              background: isSel ? 'var(--color-gold, #f5a623)' : 'var(--bg-card, #fff)',
              border: `1.5px solid ${isSel ? 'var(--color-gold, #f5a623)' : 'var(--border-input, #d5c5a8)'}`,
              color: isSel ? '#fff' : 'var(--text, #2c1a0e)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs, 0 1px 3px rgba(0,0,0,0.12))',
            }}
          >
            {attrs[p.key]?.icon} {attrs[p.key]?.name}
          </button>
        );
      })}
    </div>
  );
}

/* ─── 技能卡（長按進編輯、滑動進勾選模式）─────────────── */
function SkillCard({ skill: sk, attrIcon, isSelectMode, isSelected, onEdit, onEnterSelectMode, onToggleSelect }) {
  const { cardRef, skipClick, longPressFired, pressHandlers } = usePressGesture({
    onLongPress: () => onEdit(sk),
    onSwipeSelect: () => onEnterSelectMode(sk.name),
    disabled: isSelectMode,
  });

  const pct = Math.min(100, Math.round((sk.exp / (sk.lv * 10)) * 100));
  const rusty = !!sk.isRusty && !sk.isMaxed;

  return (
    <div
      ref={cardRef}
      style={{
        ...skillCardStyle,
        borderLeftColor: rusty ? 'var(--text-ghost, #9C7B5B)' : 'var(--color-gold, #f5a623)',
      }}
      {...pressHandlers}
      onClick={() => {
        if (skipClick.current) { skipClick.current = false; return; }
        if (longPressFired.current) { longPressFired.current = false; return; }
        if (isSelectMode) onToggleSelect(sk.name);
      }}
    >
      {isSelectMode && (
        <input type="checkbox" readOnly checked={isSelected} style={{ transform: 'scale(1.2)', accentColor: 'var(--color-correct, #227A59)', marginRight: 'var(--space-sm)', flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 'var(--size-sm)', marginRight: 'var(--space-sm)', flexShrink: 0, filter: rusty ? 'grayscale(1)' : 'none' }}>{attrIcon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          {sk.name}
          {sk.isMaxed && <span style={{ fontSize: 'var(--font-caption)', color: 'var(--color-gold-dark, #c47d0e)' }}>🏅 待領取</span>}
          {rusty && <span style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)' }}>🕸️ 生鏽中</span>}
          <span style={{ marginLeft: 'auto', fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)' }}>Lv.{sk.lv}</span>
        </div>
        <ProgressBar
          pct={sk.isMaxed ? 100 : pct}
          text={sk.isMaxed ? '已達大師級，前往成就頁領取' : `${sk.exp}/${sk.lv * 10}`}
          color={rusty ? 'var(--text-ghost, #9C7B5B)' : 'var(--color-gold, #f5a623)'}
        />
      </div>
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
  const [askConfirm, confirmDialog] = useConfirm();

  const handleSave = () => run(Events.Stats.REQUEST_SAVE_SKILL, Events.Stats.SAVE_SKILL_RESULT,
    { name, parent, editId: initial?.editId || null },
    {
      showFailToast: false,
      timeoutMsg: '儲存逾時，請稍後再試',
      onSuccess: onClose,
      onError: (result) => setError(result?.msg || '儲存逾時，請稍後再試'),
    }
  );

  const handleDeleteClick = () => {
    askConfirm(
      `確定要刪除「${initial.editId}」嗎？尚未領取的相關成就也會一併消失，此動作無法復原。`,
      () => {
        EventBus.emit(Events.Stats.REQUEST_DELETE_SKILL, { name: initial.editId });
        onClose();
      }
    );
  };

  return (
    <>
      <Modal
        title={isEdit ? '編輯技能' : '新增技能'}
        onClose={onClose}
        footer={
          <>
            {isEdit && (
              <button style={{ ...btnStyle, background: 'var(--color-danger, #c0392b)', color: '#fff', border: 'none' }}
                onClick={handleDeleteClick}>🗑️ 刪除</button>
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
            {initial.skill.isMaxed ? '已達大師級，等待領取成就獎勵' : `累積經驗: ${initial.skill.exp} / ${initial.skill.lv * 10}`}
          </div>
        )}
      </Modal>
      {confirmDialog}
    </>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────── */
export default function StatsPage() {
  const attrs      = useGameStore(s => s.attrs || {});
  const skills     = useGameStore(s => s.skills || []);
  const featureCal = useGameStore(s => s.unlocks?.feature_cal || false);

  const [tab, setTab] = useState('attr');
  const [selectedAttr, setSelectedAttr] = useState(null);
  const [skillModal, setSkillModal] = useState(null); // null | { editId, name, parent, skill }
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(new Set());
  const [askConfirm, confirmDialog] = useConfirm();

  const showAttrTab = !featureCal || tab === 'attr';

  const openAdd = () => setSkillModal({ editId: null, name: '', parent: selectedAttr || 'STR' });
  const openEdit = sk => setSkillModal({ editId: sk.name, name: sk.name, parent: sk.parent, skill: sk });

  const startSelectMode = (initialName) => {
    setIsSelectMode(true);
    setSelectedSkills(new Set(initialName ? [initialName] : []));
  };
  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedSkills(new Set());
  };
  const toggleSelectSkill = (name) => {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const handleBatchDelete = () => {
    const names = [...selectedSkills];
    askConfirm(
      `確定要刪除選取的 ${names.length} 個技能嗎？尚未領取的相關成就也會一併消失，此動作無法復原。`,
      () => {
        names.forEach(name => EventBus.emit(Events.Stats.REQUEST_DELETE_SKILL, { name }));
        exitSelectMode();
      }
    );
  };

  const displayedSkills = selectedAttr ? skills.filter(sk => sk.parent === selectedAttr) : skills;

  return (
    <div style={pageStyle}>
      {/* ── 分頁切換：只有解鎖熱量監控（unlocks.feature_cal）才顯示，
             未解鎖時整段不渲染，畫面等同於只有能力分析的精簡版 ── */}
      {featureCal && (
        <TabPill
          variant="segment"
          items={[{ value: 'attr', label: '● 能力分析' }, { value: 'cal', label: '● 熱量監控' }]}
          value={tab}
          onChange={setTab}
        />
      )}

      {/* ── 雷達圖/熱量卡 ── */}
      <div style={{ flexShrink: 0, padding: 'var(--space-xs) var(--space-md)' }}>
        {showAttrTab ? (
          <RadarChart attrs={attrs} selectedAttr={selectedAttr} onSelectAttr={setSelectedAttr} />
        ) : (
          <CalCard />
        )}
      </div>

      {/* ── 內容區 ── */}
      <div style={scrollAreaStyle}>
        {showAttrTab ? (
          <>
            {selectedAttr && attrs[selectedAttr] && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <button style={backLinkStyle} onClick={() => setSelectedAttr(null)}>← 返回總覽</button>
                <div style={{ ...attrCardStyle, marginTop: 'var(--space-xs)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <span>{attrs[selectedAttr].icon} <strong>{attrs[selectedAttr].name}</strong></span>
                    <span style={{ fontWeight: 700, color: 'var(--color-gold-dark, #c47d0e)' }}>Lv.{attrs[selectedAttr].v}</span>
                  </div>
                  <ProgressBar
                    pct={Math.min(100, Math.round((attrs[selectedAttr].exp / (attrs[selectedAttr].v * 100)) * 100))}
                    text={`${attrs[selectedAttr].exp}/${attrs[selectedAttr].v * 100}`}
                  />
                </div>
              </div>
            )}

            {/* 技能列表 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-title)', color: 'var(--text-2, #5c3d2e)' }}>
                {selectedAttr ? `${attrs[selectedAttr]?.icon || ''} ${attrs[selectedAttr]?.name || ''} 的技能` : '修煉技能'}
              </h3>
              {!isSelectMode && <button style={addBtnStyle} onClick={openAdd}>+ 新增</button>}
            </div>

            {displayedSkills.length === 0 ? (
              <div style={emptyStyle}>
                <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>⚔️</div>
                <div style={{ fontWeight: 700 }}>{selectedAttr ? '這個屬性還沒有技能' : '尚無技能'}</div>
              </div>
            ) : displayedSkills.map(sk => (
              <SkillCard
                key={sk.name}
                skill={sk}
                attrIcon={attrs[sk.parent]?.icon || '❓'}
                isSelectMode={isSelectMode}
                isSelected={selectedSkills.has(sk.name)}
                onEdit={openEdit}
                onEnterSelectMode={startSelectMode}
                onToggleSelect={toggleSelectSkill}
              />
            ))}

            <div style={{ height: 'var(--size-xl)' }} />
          </>
        ) : (
          <CalLogList />
        )}
      </div>

      {/* ── 技能勾選模式底部列 ── */}
      {isSelectMode && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--bg-panel)', padding: 'var(--space-md)', boxShadow: '0 -4px 10px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 'bold' }}>已選取: {selectedSkills.size}</div>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <button style={{ ...btnDangerStyle, padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--font-body)' }} onClick={handleBatchDelete} disabled={selectedSkills.size === 0}>刪除</button>
            <button style={btnSmallStyle} onClick={() => setSelectedSkills(selectedSkills.size === displayedSkills.length ? new Set() : new Set(displayedSkills.map(sk => sk.name)))}>
              {selectedSkills.size === displayedSkills.length ? '取消全選' : '全選'}
            </button>
            <button style={btnSmallStyle} onClick={exitSelectMode}>取消</button>
          </div>
        </div>
      )}

      {skillModal && (
        <SkillModal initial={skillModal} attrs={attrs} onClose={() => setSkillModal(null)} />
      )}

      {confirmDialog}
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
        showFailToast: false,
        onSuccess: () => { setPopping(idx); setTimeout(() => setPopping(null), 300); },
      }
    );
  };

  return (
    <div style={{
      position: 'relative', minHeight: 170, borderRadius: 'var(--radius-md)', overflow: 'hidden',
      border: '1px solid var(--border, rgba(0,0,0,0.09))',
      background: punchMode ? 'rgba(192,57,43,0.08)' : 'var(--bg-card, #fff)',
      transition: 'background var(--t-slow)', padding: 'var(--space-md)',
    }}>
      <button
        onClick={() => setPunchMode(v => !v)}
        disabled={balls.length === 0 && !punchMode}
        title={punchMode ? '結束打擊' : '打擊熱量'}
        style={{
          position: 'absolute', top: 12, right: 12, width: 'var(--size-sm)', height: 'var(--size-sm)', borderRadius: '50%',
          border: `2px solid ${punchMode ? '#fff' : 'var(--border, rgba(0,0,0,0.09))'}`,
          background: punchMode ? 'var(--color-danger, #c0392b)' : 'var(--bg-box, rgba(0,0,0,0.045))',
          fontSize: 'var(--font-title)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))', zIndex: 2,
        }}
      >{punchMode ? '❌' : '🥊'}</button>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--font-body)', fontWeight: 700, marginBottom: 'var(--space-xs)', color: punchMode ? 'var(--color-danger, #c0392b)' : 'var(--text-muted, #8c6e52)' }}>
          {punchMode ? '🥊 今日可燃燒（運動任務獲得）' : '今日已攝取（未燃燒）'}
        </div>
        <div style={{ fontSize: 'var(--size-sm)', fontWeight: 900, lineHeight: 1, marginBottom: 'var(--space-xs)', color: punchMode ? 'var(--color-danger, #c0392b)' : 'var(--text, #2c1a0e)' }}>
          {punchMode
            ? <>{quota} <span style={{ fontSize: 'var(--font-title)' }}>kcal</span></>
            : <>{consumed} <span style={{ fontSize: 'var(--font-title)', color: 'var(--text-ghost, #9C7B5B)' }}>/ {maxCal}</span></>
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
          <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-body)', color: 'var(--text-ghost, #9C7B5B)', textAlign: 'center' }}>
            目前沒有熱量球，去運動任務賺點燃燒額度，或吃點東西吧！
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', justifyContent: 'center' }}>
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
                  transition: 'transform var(--t-slow) ease, opacity var(--t-slow) ease',
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
          <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>🍽️</div>
          <div style={{ fontWeight: 700 }}>尚無紀錄</div>
        </div>
      ) : logs.map((l, i) => {
        const match = l.match(/([+-]?\d+)$/);
        const val = match ? parseInt(match[1]) : 0;
        const text = l.replace(/([+-]?\d+)$/, '').trim();
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) 0', borderBottom: '1px dashed var(--border, rgba(0,0,0,0.09))' }}>
            <span style={{ color: 'var(--text-2, #5c3d2e)', fontSize: 'var(--font-body)' }}>{text}</span>
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
    <div style={{ position: 'relative', background: 'rgba(0,0,0,0.09)', borderRadius: 'var(--radius-full)', overflow: 'hidden', height: 'var(--size-xs)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width var(--t-slow)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-caption)', color: '#fff', fontWeight: 800, textShadow: '0 1px 1px rgba(0,0,0,0.8)' }}>
        {text}
      </div>
    </div>
  );
}

/* ─── 樣式 ───────────────────────────────────────────── */
const attrCardStyle = { background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)', boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.07))', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)' };
const skillCardStyle = { display: 'flex', alignItems: 'center', background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-sm)', marginBottom: 'var(--space-xs)', boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.09))', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', borderLeft: '4px solid var(--color-gold, #f5a623)' };
const addBtnStyle = { padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-xs)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', opacity: 0.5, color: 'var(--text, #2c1a0e)' };
const backLinkStyle = { background: 'none', border: 'none', padding: 0, fontSize: 'var(--font-body)', fontWeight: 700, color: 'var(--text-muted, #8c6e52)', cursor: 'pointer', fontFamily: 'inherit' };