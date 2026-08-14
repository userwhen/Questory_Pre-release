/* src/avatar/pages/GachaPage.jsx */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { useRequestAction } from '@/hooks/useRequestAction.js';
import { GachaConfig, GachaPool } from '@/avatar/data/avatar_config.js';

const pageAnim = `
  @keyframes gachaFloat {
    0%,100% { transform:translateY(0); }
    50%     { transform:translateY(-8px); }
  }
  @keyframes ssrGlow {
    0%,100% { box-shadow:0 0 14px #f5c84299, 0 0 28px #ffe08a55; }
    50%     { box-shadow:0 0 24px #f5c842cc, 0 0 40px #ffe08a88; }
  }
  @keyframes resultIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes spinPulse {
    0%   { transform:scale(1); filter:drop-shadow(0 0 16px #f5c842aa); }
    50%  { transform:scale(1.08); filter:drop-shadow(0 0 32px #ffe08acc); }
    100% { transform:scale(1); filter:drop-shadow(0 0 16px #f5c842aa); }
  }
  @keyframes raySpin {
    from { transform:rotate(0deg); }
    to   { transform:rotate(360deg); }
  }
  @keyframes cardPop {
    0%   { opacity:0; transform:scale(0.55); }
    70%  { opacity:1; transform:scale(1.05); }
    100% { opacity:1; transform:scale(1); }
  }
  @keyframes bannerFade {
    from { opacity:0; }
    to   { opacity:1; }
  }
`;

const RARITY = {
  SSR: { color: 'var(--color-rarity-ssr)', label: 'SSR', bg: 'linear-gradient(160deg,#fff8e7,#fde68a)', border: '#f59e0b' },
  SR:  { color: 'var(--color-rarity-sr)', label: 'SR',  bg: 'linear-gradient(160deg,#faf5ff,#e9d5ff)', border: '#a855f7' },
  R:   { color: 'var(--color-rarity-r)', label: 'R',   bg: 'linear-gradient(160deg,#eff6ff,#bfdbfe)', border: '#3b82f6' },
};

function getRarityMeta(r) {
  return RARITY[r] || RARITY.R;
}

/* ─── Banner：未來放美術圖；暫無圖時隨機展示池內商品 ─── */
function BannerCard() {
  const showcase = useMemo(() => {
    const pool = (GachaPool || []).filter(i => i.rarity === 'SSR' || i.rarity === 'SR');
    const src = pool.length > 0 ? pool : (GachaPool || []);
    if (!src.length) return null;
    return src[Math.floor(Math.random() * src.length)];
  }, []);

  const meta = showcase ? getRarityMeta(showcase.rarity) : null;
  const imgId = showcase?.imgId ?? showcase?.id;

  return (
    <div style={bannerCardStyle}>
      {/* 未來有活動圖時改這裡：backgroundImage / <img> cover */}
      <div style={bannerInnerStyle}>
        {showcase ? (
          <>
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: meta.color, color: '#fff',
              fontSize: 'var(--font-caption)', fontWeight: 900,
              padding: '3px 8px', borderRadius: 'var(--radius-sm)', zIndex: 2,
            }}>
              {meta.label}
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 0, width: '100%', animation: 'bannerFade 0.4s ease',
            }}>
              <img
                src={`img/${imgId}.png`}
                alt=""
                style={{
                  maxWidth: '70%', maxHeight: '78%',
                  objectFit: 'contain',
                }}
                onError={e => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                }}
              />
              <span style={{ display: 'none', fontSize: 'var(--size-lg)' }}>{showcase.icon || '🎁'}</span>
            </div>
            <div style={{
              flexShrink: 0, textAlign: 'center', padding: '0 var(--space-sm) var(--space-sm)',
              fontWeight: 800, fontSize: 'var(--font-body)', color: 'var(--text,#2c1a0e)',
            }}>
              {showcase.name}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 'var(--size-md)', opacity: 0.4 }}>✨</div>
        )}
      </div>
    </div>
  );
}

/* ─── 翻牌結果卡（無陰影）───────────────────────────── */
function GachaCard({ result, index, isSingle }) {
  const [flipped, setFlipped] = useState(false);
  const meta = getRarityMeta(result.rarity);
  const isSSR = result.rarity === 'SSR';
  const imgId = result.imgId ?? result.id;

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), index * 140 + 280);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      style={{
        ...(isSingle ? singleCardWrapStyle : gridCardWrapStyle),
        perspective: 800,
        cursor: 'pointer',
        animation: `cardPop 0.35s ease ${index * 0.05}s both`,
      }}
      onClick={() => setFlipped(f => !f)}
    >
      <div style={{
        width: '100%', height: '100%',
        position: 'relative',
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
        transition: 'transform 0.55s cubic-bezier(0.4,0.2,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(145deg, #4a3820, #2a1e10)',
          border: '2px solid #f5c84288',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: isSingle ? '3rem' : '1.6rem',
            fontWeight: 900, color: '#f5c842', opacity: 0.7,
          }}>?</span>
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: 'var(--radius-md)',
          background: meta.bg,
          border: `2.5px solid ${meta.border}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: isSingle ? 10 : 5,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: meta.color, color: '#fff',
            fontSize: isSingle ? '0.75rem' : '0.52rem',
            fontWeight: 900, letterSpacing: '0.04em',
            padding: isSingle ? '4px 10px' : '2px 5px',
            borderRadius: '0 0 8px 0', zIndex: 5,
          }}>
            {meta.label}
          </div>

          {result.isNew && (
            <div style={{
              position: 'absolute', top: 4, right: 4,
              background: 'var(--color-correct,#227A59)', color: '#fff',
              fontSize: isSingle ? '0.65rem' : '0.48rem',
              fontWeight: 800, padding: '2px 5px',
              borderRadius: 'var(--radius-xs)', zIndex: 5,
            }}>
              NEW
            </div>
          )}

          <div style={{
            flex: 1, width: '100%', minHeight: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={`img/${imgId}.png`}
              style={{ maxWidth: '82%', maxHeight: '82%', objectFit: 'contain' }}
              onError={e => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
              }}
              alt=""
            />
            <span style={{ display: 'none', fontSize: isSingle ? '3.2rem' : '1.5rem' }}>
              {result.icon || '🎁'}
            </span>
          </div>

          <div style={{ flexShrink: 0, width: '100%', textAlign: 'center', paddingTop: 2 }}>
            <div style={{
              fontSize: isSingle ? '0.95rem' : '0.58rem',
              fontWeight: 800, color: 'var(--text,#2c1a0e)', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {result.name}
            </div>
            {!result.isNew && (
              <div style={{
                fontSize: isSingle ? '0.68rem' : '0.48rem',
                color: 'var(--text-muted,#8c6e52)', marginTop: 1,
              }}>
                → 碎片
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 抽卡動畫（亮金底）──────────────────────────────── */
function DrawAnim({ count, onSkip }) {
  return (
    <div style={animOverlayStyle} onClick={onSkip}>
      <div style={rayStyle} />
      <div style={{
        fontSize: 'var(--size-xl)',
        animation: 'spinPulse 1.2s ease-in-out infinite',
        position: 'relative', zIndex: 2,
      }}>
        ✨
      </div>
      <div style={{
        marginTop: 'var(--space-md)', fontWeight: 800, fontSize: 'var(--font-title)',
        color: '#5c4010',
        position: 'relative', zIndex: 2,
      }}>
        {count === 1 ? '單抽進行中…' : '十連抽進行中…'}
      </div>
      <div style={{
        marginTop: 'var(--space-xs)', fontSize: 'var(--font-caption)',
        color: 'rgba(92,64,16,0.65)',
        position: 'relative', zIndex: 2,
      }}>
        點擊任意處跳過
      </div>
    </div>
  );
}

/* ─── 機率說明 ───────────────────────────────────────── */
function OddsSheet({ onClose }) {
  const rates = GachaConfig.rates;
  const rows = [
    { key: 'SSR', rate: rates.SSR, note: `保底 ${GachaConfig.pityLimit} 抽必出` },
    { key: 'SR',  rate: rates.SR,  note: '' },
    { key: 'R',   rate: rates.R,   note: '' },
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', color: 'var(--text,#2c1a0e)' }}>
            稀有度機率
          </div>
          <button type="button" style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>
        {rows.map(row => {
          const meta = getRarityMeta(row.key);
          return (
            <div key={row.key} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
              padding: 'var(--space-sm) var(--space-sm)', marginBottom: 'var(--space-xs)',
              borderRadius: 'var(--radius-md)', background: meta.bg,
              border: `1.5px solid ${meta.border}55`,
            }}>
              <div style={{ minWidth: 'var(--size-md)', textAlign: 'center', fontWeight: 900, fontSize: 'var(--font-body)', color: meta.color }}>
                {row.key}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', color: 'var(--text,#2c1a0e)' }}>
                  {(row.rate * 100).toFixed(1)}%
                </div>
                {row.note && (
                  <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted,#8c6e52)', marginTop: 2 }}>
                    {row.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted,#8c6e52)', lineHeight: 1.5, marginTop: 'var(--space-xs)', marginBottom: 0 }}>
          券優先扣除；不足次數以單抽價補鑽。僅「全鑽十連」享有折扣價。
        </p>
      </div>
    </div>
  );
}

/* ─── 預估花費文案 ───────────────────────────────────── */
function estimateCost(times, ticketCount) {
  const use = Math.min(ticketCount, times);
  const remain = times - use;
  if (remain === 0) return { tickets: use, gems: 0, label: `🎟${use}` };
  let gems;
  if (use === 0 && times === 10) gems = GachaConfig.tenCost;
  else gems = remain * GachaConfig.singleCost;
  if (use === 0) return { tickets: 0, gems, label: `💎${gems}` };
  return { tickets: use, gems, label: `🎟${use}+💎${gems}` };
}

/* ─── 主頁面 ────────────────────────────────────────── */
export default function GachaPage() {
  const { freeGem, paidGem, bag, gachaPity } = useGameStore(s => ({
    freeGem: s.freeGem ?? 0,
    paidGem: s.paidGem ?? 0,
    bag: s.bag ?? [],
    gachaPity: s.gachaPity ?? 0,
  }));

  const [phase, setPhase] = useState('select');
  const [results, setResults] = useState([]);
  const [lastTimes, setLastTimes] = useState(1);
  const [showOdds, setShowOdds] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const animTimerRef = useRef(null);

  useEffect(() => {
    const unsub = EventBus.on(Events.Avatar.UPDATED, () => {
      useGameStore.setState(s => ({ ...s }));
    });
    return () => {
      unsub();
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const totalGem = freeGem + paidGem;
  const ticketCount = bag.find(i => i.id === 'sys_misc_gacha_ticket')?.count ?? 0;
  const fragCount = bag.find(i => i.id === 'sys_gacha_fragment')?.count ?? 0;
  const pityLeft = Math.max(0, GachaConfig.pityLimit - gachaPity);
  const pityPct = Math.min(100, Math.round((gachaPity / GachaConfig.pityLimit) * 100));

  const cost1 = estimateCost(1, ticketCount);
  const cost10 = estimateCost(10, ticketCount);

  const { run } = useRequestAction();

  const goToResult = useCallback((res, times) => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    setResults(res);
    setLastTimes(times);
    setPhase('result');
    setDrawing(false);
    res.forEach(r => {
      if (r.rarity === 'SSR') {
        setTimeout(() => EventBus.emit(Events.System.TOAST, `✨ SSR 獲得！${r.name}`), 500);
      }
    });
  }, []);

  const handleDraw = useCallback(times => {
    if (drawing) return;
    setDrawing(true);
    run(Events.Avatar.REQUEST_GACHA, Events.Avatar.GACHA_RESULT, { times }, {
      isSuccess: (result) => !!result?.results,
      showFailToast: false,
      timeoutMsg: '❌ 抽卡逾時，請稍後再試',
      onSuccess: (result) => {
        const res = result.results || [];
        setLastTimes(times);
        setResults(res);
        setPhase('animating');
        animTimerRef.current = setTimeout(() => goToResult(res, times), 1800);
      },
      onFail: () => setDrawing(false),
    });
    setTimeout(() => setDrawing(false), 9000);
  }, [run, drawing, goToResult]);

  const handleSkipAnim = useCallback(() => {
    if (phase !== 'animating') return;
    goToResult(results, lastTimes);
  }, [phase, results, lastTimes, goToResult]);

  const handleCraft = useCallback(() => {
    EventBus.emit(Events.Avatar.REQUEST_CRAFT_TICKET);
  }, []);

  return (
    <div style={pageStyle}>
      <style>{pageAnim}</style>

      {phase === 'select' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* 頂部 */}
          <div style={headerStyle}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 'var(--font-title)', color: 'var(--text,#2c1a0e)' }}>
                ✨ 幸運扭蛋
              </div>
              <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted,#8c6e52)', marginTop: 2 }}>
                抽取限定服裝・寵物・造型
              </div>
            </div>
            <button type="button" style={oddsLinkStyle} onClick={() => setShowOdds(true)}>
              機率 ℹ️
            </button>
          </div>

          {/* Banner：填滿標題與下方操作區之間 */}
          <div style={bannerWrapStyle}>
            <BannerCard />
          </div>

          {/* 下方操作區：保底 + 資源 + 按鈕（貼底、中間有空隙） */}
          <div style={bottomBlockStyle}>
            <div style={pityBoxStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-xs)' }}>
                <span style={{ fontSize: 'var(--font-caption)', fontWeight: 700, color: 'var(--text,#2c1a0e)' }}>
                  SSR 保底
                  <span style={{ fontWeight: 500, color: 'var(--text-muted,#8c6e52)', marginLeft: 'var(--space-xs)', fontSize: 'var(--font-caption)' }}>
                    SSR {(GachaConfig.rates.SSR * 100).toFixed(0)}%
                  </span>
                </span>
                <span style={{ fontSize: 'var(--font-caption)', color: '#d4920a', fontWeight: 800 }}>
                  {gachaPity} / {GachaConfig.pityLimit}
                  <span style={{ color: 'var(--text-muted,#8c6e52)', fontWeight: 500, marginLeft: 'var(--space-xs)' }}>
                    （還需 {pityLeft}）
                  </span>
                </span>
              </div>
              <div style={pityTrackStyle}>
                <div style={{
                  height: '100%', width: `${pityPct}%`, borderRadius: 999,
                  background: 'linear-gradient(90deg,#e8b84a,#ffe08a)',
                  transition: 'width 0.45s ease', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)',
                    backgroundSize: '200% 100%',
                    animation: pityPct > 0 ? 'shimmer 2s linear infinite' : 'none',
                  }} />
                </div>
              </div>
            </div>

            <div style={resourceRowStyle}>
              <div style={resourceChipStyle}>
                <div style={chipLabelStyle}>🎟️ 抽獎券</div>
                <div style={chipValueStyle}>{ticketCount}</div>
              </div>
              <div style={{ ...resourceChipStyle, flex: 1.25 }}>
                <div style={chipLabelStyle}>🧩 碎片 {fragCount}/10</div>
                <button
                  type="button"
                  style={{
                    ...craftBtnStyle,
                    background: fragCount >= 10 ? 'linear-gradient(135deg,#f5c842,#ffe08a)' : 'transparent',
                    border: `1px solid ${fragCount >= 10 ? 'transparent' : 'var(--border,rgba(0,0,0,0.12))'}`,
                    color: fragCount >= 10 ? '#3b2a12' : 'var(--text-muted,#8c6e52)',
                    cursor: fragCount >= 10 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleCraft}
                  disabled={fragCount < 10}
                >
                  {fragCount >= 10 ? '✨ 合成券' : '收集中'}
                </button>
              </div>
              <div style={resourceChipStyle}>
                <div style={chipLabelStyle}>💎 鑽石</div>
                <div style={{ ...chipValueStyle, color: 'var(--color-info,#2980b9)' }}>{totalGem}</div>
              </div>
            </div>

            <div style={drawFooterStyle}>
              <button
                type="button"
                disabled={drawing}
                style={{
                  ...drawBtnStyle,
                  background: '#fff',
                  color: '#b8860b',
                  border: '2px solid #f5c842',
                  opacity: drawing ? 0.6 : 1,
                }}
                onClick={() => handleDraw(1)}
              >
                單抽
                <span style={drawSubStyle}>{cost1.label}</span>
              </button>
              <button
                type="button"
                disabled={drawing}
                style={{
                  ...drawBtnStyle,
                  background: 'linear-gradient(135deg,#f5c842,#ffe08a)',
                  color: '#3b2a12',
                  border: 'none',
                  boxShadow: '0 4px 0 #d4a017',
                  opacity: drawing ? 0.6 : 1,
                }}
                onClick={() => handleDraw(10)}
              >
                十連抽
                <span style={{ ...drawSubStyle, opacity: 0.9 }}>{cost10.label}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'animating' && (
        <DrawAnim count={lastTimes} onSkip={handleSkipAnim} />
      )}

      {phase === 'result' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'resultIn 0.28s ease' }}>
          <div style={{ textAlign: 'center', padding: 'var(--space-md) var(--space-md) var(--space-xs)', flexShrink: 0 }}>
            <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', color: 'var(--text,#2c1a0e)' }}>
              恭喜獲得！
            </div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted,#8c6e52)', marginTop: 'var(--space-xs)' }}>
              共 {results.length} 項 · 點擊卡片可再翻一次
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-xs) var(--space-sm) var(--space-sm)' }}>
            <div style={results.length === 1
              ? { display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-sm)' }
              : { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-xs)' }
            }>
              {results.map((r, i) => (
                <GachaCard key={`${r.id}-${i}-${lastTimes}`} result={r} index={i} isSingle={results.length === 1} />
              ))}
            </div>
          </div>

          <div style={resultFootStyle}>
            <button
              type="button"
              style={{
                ...drawBtnStyle, flex: 1,
                background: 'var(--bg-panel,#f7e7ce)',
                color: 'var(--text,#2c1a0e)',
                border: '1.5px solid var(--border,rgba(0,0,0,0.12))',
                padding: 'var(--space-sm) var(--space-xs)',
              }}
              onClick={() => setPhase('select')}
            >
              ← 返回
            </button>
            <button
              type="button"
              disabled={drawing}
              style={{
                ...drawBtnStyle, flex: 2,
                background: 'linear-gradient(135deg,#f5c842,#ffe08a)',
                color: '#3b2a12', border: 'none',
                boxShadow: '0 4px 0 #d4a017',
                padding: 'var(--space-sm) var(--space-xs)',
                opacity: drawing ? 0.6 : 1,
              }}
              onClick={() => handleDraw(lastTimes)}
            >
              🔄 再抽 {lastTimes} 次
            </button>
          </div>
        </div>
      )}

      {showOdds && <OddsSheet onClose={() => setShowOdds(false)} />}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────── */
const pageStyle = {
  display: 'flex', flexDirection: 'column',
  height: '100%', overflow: 'hidden',
  background: 'var(--bg-panel,#f7e7ce)',
  position: 'relative',
};

const headerStyle = {
  flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: 'var(--space-sm) var(--space-md) var(--space-xs)',
};

const oddsLinkStyle = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 20, padding: 'var(--space-xs) var(--space-sm)',
  fontSize: 'var(--font-caption)', fontWeight: 700,
  color: 'var(--text,#2c1a0e)', cursor: 'pointer', fontFamily: 'inherit',
};

const bannerWrapStyle = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: 'var(--space-xs) var(--space-md) var(--space-xs)',
};

const bannerCardStyle = {
  flex: 1,
  minHeight: 120,
  borderRadius: 16,
  background: 'linear-gradient(160deg, #fff9ef, #f5e6cf)',
  border: '1.5px solid rgba(245,200,66,0.35)',
  overflow: 'hidden',
  position: 'relative',
};

const bannerInnerStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

const bottomBlockStyle = {
  flexShrink: 0,
  display: 'flex', flexDirection: 'column',
  gap: 'var(--space-xs)',
  paddingTop: 'var(--space-xs)',
};

const pityBoxStyle = {
  margin: '0 var(--space-md)',
  background: '#fff',
  borderRadius: 14,
  padding: 'var(--space-sm) var(--space-sm)',
};

const pityTrackStyle = {
  height: 8, background: 'rgba(0,0,0,0.07)',
  borderRadius: 999, overflow: 'hidden',
};

const resourceRowStyle = {
  display: 'flex', gap: 'var(--space-xs)', margin: '0 var(--space-md)',
};

const resourceChipStyle = {
  flex: 1, background: '#fff', borderRadius: 'var(--radius-md)',
  padding: 'var(--space-xs) var(--space-xs)', border: '1px solid rgba(0,0,0,0.08)',
  textAlign: 'center', display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 'var(--space-xs)',
};

const chipLabelStyle = { fontSize: 'var(--font-caption)', color: 'var(--text-muted,#8c6e52)', fontWeight: 600 };
const chipValueStyle = { fontWeight: 900, fontSize: 'var(--font-title)', color: 'var(--text,#2c1a0e)' };

const craftBtnStyle = {
  width: '100%', padding: 'var(--space-xs) var(--space-xs)',
  fontSize: 'var(--font-caption)', fontWeight: 800,
  borderRadius: 'var(--radius-sm)', fontFamily: 'inherit',
};

const drawFooterStyle = {
  display: 'flex', gap: 'var(--space-xs)',
  padding: '4px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
  background: 'transparent',
};

const drawBtnStyle = {
  flex: 1, padding: 'var(--space-sm) var(--space-xs)', borderRadius: 14,
  fontWeight: 800, fontSize: 'var(--font-title)', cursor: 'pointer', fontFamily: 'inherit',
  lineHeight: 1.2, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 3,
};

const drawSubStyle = {
  display: 'block', fontSize: 'var(--font-caption)', fontWeight: 600, opacity: 0.9, marginTop: 1,
};

const resultFootStyle = {
  flexShrink: 0, display: 'flex', gap: 'var(--space-xs)',
  padding: '12px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
  borderTop: '1px solid rgba(0,0,0,0.08)',
  background: '#fff',
};

const singleCardWrapStyle = { width: 170, height: 240 };
const gridCardWrapStyle = { aspectRatio: '2/3' };

const animOverlayStyle = {
  position: 'absolute', inset: 0, zIndex: 40,
  // 亮金暖色底（與主畫面一致，不做暗幕）
  background: 'radial-gradient(ellipse at center, #fff6d6 0%, #f5e6cf 55%, #f0d9a8 100%)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', overflow: 'hidden',
};

const rayStyle = {
  position: 'absolute',
  width: 300, height: 300,
  borderRadius: '50%',
  background: 'conic-gradient(from 0deg, transparent 0deg, #f5c84266 50deg, transparent 90deg, #ffe08a55 160deg, transparent 200deg, #f5c84266 270deg, transparent 310deg)',
  animation: 'raySpin 5s linear infinite',
  opacity: 0.85,
};

const overlayStyle = {
  position: 'absolute', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheetStyle = {
  width: '100%', background: '#fff',
  borderRadius: '18px 18px 0 0',
  padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
  maxHeight: '70%', overflowY: 'auto',
};

const closeBtnStyle = {
  width: 'var(--size-sm)', height: 'var(--size-sm)', borderRadius: 16,
  border: 'none', background: 'rgba(0,0,0,0.06)',
  fontSize: 'var(--font-body)', cursor: 'pointer',
  color: 'var(--text,#2c1a0e)', fontFamily: 'inherit',
};
