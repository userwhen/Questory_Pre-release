/* src/components/pages/GachaPage.jsx */
import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { GachaConfig } from '@/avatar/data/avatar_config.js';
import Modal from '@/components/ui/Modal.jsx';

const pageAnim = `
  @keyframes gachaFloat {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-8px); }
  }
  @keyframes ssrGlow {
    0%,100% { box-shadow:0 0 15px #f59e0b88; }
    50%     { box-shadow:0 0 30px #f59e0bcc; }
  }
  @keyframes resultIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

/* ─── 單張扭蛋結果卡（React 翻牌）────────────────────── */
function GachaCard({ result, index, isSingle }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), index * 150 + 300);
    return () => clearTimeout(t);
  }, [index]);

  const rarityColor = result.rarity === 'SSR'
    ? '#f59e0b'
    : result.rarity === 'SR'
      ? '#a855f7'
      : '#3b82f6';
  const isSSR = result.rarity === 'SSR';
  const imgId = result.imgId ?? result.id;

  return (
    <div
      style={{
        ...(isSingle ? singleCardWrapStyle : gridCardWrapStyle),
        perspective: 600, cursor: 'pointer',
      }}
      onClick={() => setFlipped(f => !f)}
    >
      <div style={{
        width: '100%', height: '100%',
        position: 'relative', transformStyle: 'preserve-3d',
        transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* 正面（問號） */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          borderRadius: 10,
          background: 'linear-gradient(135deg, var(--bg-card,#fff), var(--bg-panel,#f7e7ce))',
          border: '1.5px solid rgba(167,139,250,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 900, color: 'rgba(167,139,250,0.3)',
        }}>?</div>

        {/* 背面（結果） */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)', borderRadius: 10,
          background: 'var(--bg-card,#fff)',
          border: `2px solid ${rarityColor}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 6,
          boxShadow: `0 0 ${isSSR ? 20 : 10}px ${rarityColor}66`,
          animation: isSSR ? 'ssrGlow 1.5s ease-in-out infinite' : 'none',
        }}>
          {result.isNew && (
            <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--color-correct,#227A59)', color: '#fff', fontSize: '0.55rem', fontWeight: 700, padding: '2px 5px', borderRadius: 8, zIndex: 10 }}>
              NEW!
            </div>
          )}
          <div style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.55rem', fontWeight: 800, color: rarityColor, border: `1px solid ${rarityColor}`, padding: '1px 3px', borderRadius: 4 }}>
            {result.rarity}
          </div>

          <div style={{ fontSize: isSingle ? '4rem' : '1.8rem', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '60%' }}>
            <img src={`img/${imgId}.png`}
              style={{ width: '80%', height: '80%', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))' }}
              onError={e => { e.target.style.opacity = '0'; }}
            />
          </div>

          <div style={{ fontSize: isSingle ? '0.95rem' : '0.6rem', fontWeight: 700, color: 'var(--text,#2c1a0e)', textAlign: 'center', lineHeight: 1.3 }}>
            {result.name}
          </div>
          {!result.isNew && (
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted,#8c6e52)', marginTop: 3 }}>→ 碎片</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 主頁面 ────────────────────────────────────────── */
export default function GachaPage() {
  const { freeGem, paidGem, bag, gachaPity } = useGameStore(s => ({
    freeGem: s.freeGem ?? 0,
    paidGem: s.paidGem ?? 0,
    bag: s.bag ?? [],
    gachaPity: s.gachaPity ?? 0,
  }));

  const [phase, setPhase] = useState('select'); // 'select' | 'result'
  const [results, setResults] = useState([]);
  const [showOdds, setShowOdds] = useState(false); // 上架合規：抽卡前需可查看機率

  useEffect(() => {
    const unsub = EventBus.on(Events.Avatar.UPDATED, () => {
      useGameStore.setState(s => ({ ...s }));
    });
    return () => unsub();
  }, []);

  const totalGem = freeGem + paidGem;
  const ticketCount = bag.find(i => i.id === 'sys_gacha_ticket')?.count ?? 0;
  const fragCount = bag.find(i => i.id === 'sys_gacha_fragment')?.count ?? 0;
  const pityPct = Math.min(100, Math.round((gachaPity / GachaConfig.pityLimit) * 100));

  const { run } = useRequestAction();

  const handleDraw = useCallback(times => run(Events.Avatar.REQUEST_GACHA, Events.Avatar.GACHA_RESULT, { times }, {
    isSuccess: (result) => !!result?.results,
    showFailToast: false, // 資源不足時 executeGacha 內部已經自己 emit 過 toast，這裡不用再跳一次
    timeoutMsg: '❌ 抽卡逾時，請稍後再試',
    onSuccess: (result) => {
      const res = result.results;
      setResults(res);
      setLastTimes(times);
      setPhase('result');
      // SSR toast
      res.forEach(r => {
        if (r.rarity === 'SSR') {
          setTimeout(() => EventBus.emit(Events.System.TOAST, `✨ SSR 獲得！${r.name}`), 500);
        }
      });
    },
  }), [run]);

  const handleCraft = useCallback(() => {
    EventBus.emit(Events.Avatar.REQUEST_CRAFT_TICKET);
  }, []);

  return (
    <div style={pageStyle}>
      <style>{pageAnim}</style>

      {phase === 'select' && (
        <>
          {/* 扭蛋機動畫 */}
          <div style={machineAreaStyle}>
            <div style={{ fontSize: '7rem', animation: 'gachaFloat 3s ease-in-out infinite', filter: 'drop-shadow(0 4px 20px rgba(167,139,250,0.5))' }}>
              🎰
            </div>
          </div>

          {/* 保底進度 */}
          <div style={pityBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted,#8c6e52)', marginBottom: 6 }}>
              <span>保底進度</span>
              <span style={{ color: 'var(--color-gold,#f5a623)', fontWeight: 700 }}>{gachaPity} / {GachaConfig.pityLimit} 抽</span>
            </div>
            <div style={{ height: 7, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pityPct}%`, background: 'linear-gradient(90deg,#a855f7,var(--color-gold,#f5a623))', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* 資源列 */}
          <div style={resourceRowStyle}>
            <div style={resourceBoxStyle}>
              <div style={resourceLabelStyle}>🎟️ 抽獎券</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{ticketCount} 張</div>
            </div>

            <div style={{ ...resourceBoxStyle, flex: 1.3 }}>
              <div style={resourceLabelStyle}>🧩 碎片 ({fragCount}/10)</div>
              <button
                style={{ ...craftBtnStyle, background: fragCount >= 10 ? 'var(--color-gold,#f5a623)' : 'transparent', border: `1px solid ${fragCount >= 10 ? 'transparent' : 'var(--border,rgba(0,0,0,0.09))'}`, color: fragCount >= 10 ? '#000' : 'var(--text-muted,#8c6e52)', cursor: fragCount >= 10 ? 'pointer' : 'not-allowed' }}
                onClick={handleCraft}
                disabled={fragCount < 10}
              >{fragCount >= 10 ? '✨ 點擊合成' : '收集碎片'}</button>
            </div>

            <div style={resourceBoxStyle}>
              <div style={resourceLabelStyle}>💎 鑽石</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-info,#2980b9)' }}>{totalGem}</div>
            </div>
          </div>
          {/* 機率揭露連結 */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span onClick={() => setShowOdds(true)} style={{ fontSize: '0.75rem', color: 'var(--text-muted,#8c6e52)', textDecoration: 'underline', cursor: 'pointer' }}>
              查看各稀有度機率 ℹ️
            </span>
          </div>
          {/* 抽卡按鈕 */}
          <div style={drawBtnRowStyle}>
            <button
              style={{ ...drawBtnStyle, background: 'var(--bg-card,#fff)', color: 'var(--color-info,#2980b9)', border: '1.5px solid var(--color-info,#2980b9)', boxShadow: 'none' }}
              onClick={() => handleDraw(1)}
            >
              單抽
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, opacity: 0.85, marginTop: 2 }}>
                💎{GachaConfig.singleCost} / 🎟️ 1券
              </span>
            </button>
            <button
              style={{ ...drawBtnStyle, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', border: 'none', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}
              onClick={() => handleDraw(10)}
            >
              十連抽
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, opacity: 0.9, marginTop: 2 }}>
                💎{GachaConfig.tenCost} / 🎟️ 10券
              </span>
            </button>
          </div>
        </>
      )}

      {phase === 'result' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'resultIn 0.3s ease' }}>
          {/* 結果標題 */}
          <div style={{ textAlign: 'center', padding: '16px 16px 8px', flexShrink: 0 }}>
            <div style={{ fontSize: '2rem', marginBottom: 6 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text,#2c1a0e)' }}>
              恭喜獲得！
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted,#8c6e52)', fontWeight: 400 }}>（點擊卡片翻開）</span>
            </div>
          </div>

          {/* 卡片區 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
            <div style={results.length === 1
              ? { display: 'flex', justifyContent: 'center', paddingTop: 16 }
              : { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }
            }>
              {results.map((r, i) => (
                <GachaCard key={i} result={r} index={i} isSingle={results.length === 1} />
              ))}
            </div>
          </div>

          {/* 底部按鈕 */}
          <div style={resultFootStyle}>
            <button
              style={{ ...btnStyle, flex: 1, background: 'var(--bg-panel,#f7e7ce)', color: 'var(--text,#2c1a0e)', border: '1.5px solid var(--border-input,#d5c5a8)', boxShadow: 'none' }}
              onClick={() => setPhase('select')}
            >← 返回</button>
            <button
              style={{ ...btnStyle, flex: 2, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', border: 'none', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}
              onClick={() => handleDraw(lastTimes)}
            >🔄 再抽 {lastTimes} 次</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────────────────── */
const pageStyle = {
  display: 'flex', flexDirection: 'column',
  height: '100%', overflow: 'hidden',
  background: 'var(--bg-panel,#f7e7ce)',
  position: 'relative',
};

const machineAreaStyle = {
  flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  paddingTop: 32, paddingBottom: 16,
};

const pityBoxStyle = {
  flexShrink: 0,
  margin: '0 20px 16px',
  background: 'var(--bg-card,#fff)',
  borderRadius: 'var(--radius-md,12px)',
  padding: '12px 16px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
};

const resourceRowStyle = {
  flexShrink: 0,
  display: 'flex', gap: 10,
  margin: '0 16px 20px',
};

const resourceBoxStyle = {
  flex: 1,
  background: 'var(--bg-card,#fff)',
  padding: '10px 8px', borderRadius: 12,
  border: '1px solid var(--border,rgba(0,0,0,0.09))',
  textAlign: 'center',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 6,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const resourceLabelStyle = {
  fontSize: '0.72rem', color: 'var(--text-muted,#8c6e52)',
};

const craftBtnStyle = {
  width: '100%', padding: '4px 6px',
  fontSize: '0.72rem', fontWeight: 700,
  borderRadius: 6, fontFamily: 'inherit',
  transition: 'all 0.2s',
};

const drawBtnRowStyle = {
  flexShrink: 0,
  display: 'flex', gap: 12,
  padding: '0 16px 28px',
};

const drawBtnStyle = {
  flex: 1, padding: '14px 8px',
  borderRadius: 'var(--radius-md,12px)',
  fontWeight: 800, fontSize: '1rem',
  cursor: 'pointer', fontFamily: 'inherit',
  color: '#fff', transition: '0.15s',
  lineHeight: 1.2,
};

const resultFootStyle = {
  flexShrink: 0,
  display: 'flex', gap: 10,
  padding: '12px 16px 24px',
  borderTop: '1px solid var(--border,rgba(0,0,0,0.09))',
  background: 'var(--bg-card,#fff)',
};

const btnStyle = {
  padding: '11px 18px',
  borderRadius: 'var(--radius-sm,8px)',
  fontWeight: 700, fontSize: '0.95rem',
  cursor: 'pointer', fontFamily: 'inherit',
  color: '#fff', border: 'none',
  boxShadow: '0 4px 0 #185C42',
};

const singleCardWrapStyle = {
  width: 160, height: 230,
};

const gridCardWrapStyle = {
  aspectRatio: '2/3',
};
