/* src/components/pages/AvatarPage.jsx */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus, EventHelper } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { AvatarShop, ALL_ITEMS } from '@/data/avatar_config.js';
import CharacterSprite from '@/components/ui/CharacterSprite.jsx';
import PetReplaceModal from '@/components/ui/PetReplaceModal.jsx';
import PetNamingModal from '@/components/ui/PetNamingModal.jsx';
// ⚠️ 移除了未被使用的 avatarModalIn（原本沒有任何地方套用這個動畫，屬於死程式碼）
const modalAnim = `
  @keyframes gachaFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes gachaFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
  @keyframes ssrGlow { 0%,100%{box-shadow:0 0 15px rgba(245,158,11,0.53);} 50%{box-shadow:0 0 30px rgba(245,158,11,0.8);} }
  @keyframes floatBubble { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-4px);} }
`;

// ─── AvatarStage ──────────────────────────────────────────────────────────────
function AvatarStage({ wearing, activePets }) {
  const findItem = id => ALL_ITEMS.find(i => i.id === id);
  const w = wearing;
  const [compPos, setCompPos] = useState({ top: 15, left: 5, movingLeft: false });
  const [bubbleText, setBubbleText] = useState('');

  useEffect(() => {
    if (!w.companion) return;
    const patrolInterval = setInterval(() => {
      setCompPos(prev => {
        const moveLeft = Math.random() > 0.5;
        const newLeft = Math.max(0, Math.min(80, prev.left + (moveLeft ? -10 : 10)));
        const newTop = 15 + (Math.random() * 10 - 5);
        return { top: newTop, left: newLeft, movingLeft: moveLeft };
      });
    }, 4000);

    const bubbleInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setBubbleText('主人加油！✨');
        setTimeout(() => setBubbleText(''), 3000);
      }
    }, 8000);

    return () => { clearInterval(patrolInterval); clearInterval(bubbleInterval); };
  }, [w.companion]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
      {w.bg && <img src={`img/${w.bg}.png`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6, zIndex: 1 }} onError={e => { e.target.style.opacity = '0'; }} alt="" />}

      {w.companion && (
        <div style={{ position: 'absolute', top: `${compPos.top}%`, left: `${compPos.left}%`, zIndex: 2, height: 110, transition: 'all 3s ease-in-out' }}>
          <img src={`img/${findItem(w.companion)?.imgId ?? w.companion}.png`} style={{ height: '100%', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))', transform: compPos.movingLeft ? 'scaleX(1)' : 'scaleX(-1)', transition: 'transform 0.5s' }} onError={e => { e.target.style.opacity = '0'; }} alt="" />
          {bubbleText && (
            <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 8, fontSize: '0.7rem', color: 'var(--text)', whiteSpace: 'nowrap', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', animation: 'floatBubble 2s infinite ease-in-out' }}>
              {bubbleText}
              <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 8, height: 8, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '5%', width: '100%', height: '85%', zIndex: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <CharacterSprite wearing={w} />
        </div>
      </div>

      {(activePets ?? []).map((pet, idx) => (
        <div key={pet.id + idx} style={{ position: 'absolute', bottom: '5%', right: `${5 + idx * 25}%`, zIndex: 4 + idx, height: 90 }}>
          <img src={`img/${pet.id}.png`} style={{ height: '100%', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} onError={e => { e.target.style.opacity = '0'; }} alt="" />
        </div>
      ))}
    </div>
  );
}

// ─── WardrobeCard ─────────────────────────────────────────────────────────────
function WardrobeCard({ item, isWearing, isUnlocked, onWear, onBuy }) {
  const shopConfig = AvatarShop.find(i => i.id === item.id);
  const canBuy = shopConfig && shopConfig.price !== undefined;
  const needsSet = (shopConfig?.requires?.length ?? 0) > 0;
  const imgId = item.imgId ?? item.id;

  const handlePreview = (e) => {
    e.stopPropagation();
    // 帶 type，讓 AvatarEngine.previewItem 知道要寫入 previewWearing 的哪個分類 key
    EventBus.emit(Events.Avatar.REQUEST_PREVIEW_ITEM, { itemId: item.id, type: item.type });
  };

  return (
    <div style={{ ...wardrobeCardStyle, borderColor: isWearing ? 'var(--color-gold,#f5a623)' : 'transparent', background: isWearing ? 'rgba(245,166,35,0.08)' : 'var(--bg-card,#fff)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '4px 4px 2px', minHeight: 0 }} onClick={handlePreview}>
        <div style={{ position: 'relative', width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
          {item.layers ? item.layers.map((l, i) => (
            <img key={i} src={`img/${l.img}.png`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 3 }} onError={e => { e.target.style.opacity = '0'; }} alt="" />
          )) : (
            <img src={`img/${imgId}.png`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} onError={e => { e.target.style.opacity = '0'; }} alt="" />
          )}
          <span style={{ fontSize: '1.8rem', opacity: 0.25, position: 'absolute', zIndex: 1 }}>{item.icon || '📦'}</span>
        </div>
        <div style={{ fontSize: 'clamp(0.6rem,2vw,0.7rem)', fontWeight: 700, color: 'var(--text,#2c1a0e)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
          {item.name}
        </div>
      </div>

      <div style={{ width: '100%', flexShrink: 0, marginTop: 'auto' }}>
        {isWearing ? (
          <button style={{ ...wardrobeBtnStyle, background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none' }} onClick={() => onWear(item.id, item.type)}>
            {item.type === 'body' || item.type === 'face' ? '已裝備' : '卸下'}
          </button>
        ) : isUnlocked ? (
          <button style={{ ...wardrobeBtnStyle, background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none' }} onClick={() => onWear(item.id, item.type)}>
            裝備
          </button>
        ) : needsSet ? (
          <button style={{ ...wardrobeBtnStyle, opacity: 0.55, cursor: 'not-allowed' }} disabled>✨集齊解鎖</button>
        ) : canBuy ? (
          <button style={{ ...wardrobeBtnStyle, background: 'var(--bg-panel,#f7e7ce)', border: '1px solid var(--color-gold,#f5a623)', color: 'var(--color-gold-dark,#c47d0e)' }} onClick={() => onBuy(item.id)}>
            {shopConfig.price > 0 ? `💎${shopConfig.price}` : '免費領取'}
          </button>
        ) : (
          <button style={{ ...wardrobeBtnStyle, opacity: 0.55, cursor: 'not-allowed' }} disabled>🎡 扭蛋</button>
        )}
      </div>
    </div>
  );
}

// ─── GachaModal ───────────────────────────────────────────────────────────────
function GachaModal({ onClose }) {
  const bag = useGameStore(s => s.bag) || [];
  const freeGem = useGameStore(s => s.freeGem) || 0;
  const paidGem = useGameStore(s => s.paidGem) || 0;
  const gachaPity = useGameStore(s => s.gachaPity) || 0;

  const ticketCount = bag.find(i => i.id === 'sys_gacha_ticket')?.count || 0;
  const fragCount = bag.find(i => i.id === 'sys_gacha_fragment')?.count || 0;
  const totalGems = freeGem + paidGem;

  const [state, setState] = useState('select');
  const [drawCount, setDrawCount] = useState(1);
  const [results, setResults] = useState([]);
  const [flippedCards, setFlippedCards] = useState(new Set());
  // drawKey 每次抽卡都換，讓卡片以全新狀態渲染，解決重抽不重置翻牌的問題
  const [drawKey, setDrawKey] = useState(0);

  const timeoutRefs = useRef([]);

  useEffect(() => {
    return () => timeoutRefs.current.forEach(clearTimeout);
  }, []);

  const SINGLE_DRAW_COST = 50;
  const TEN_DRAW_COST = Math.floor(SINGLE_DRAW_COST * 10 * 0.9);
  const pityPct = Math.min(100, Math.round((gachaPity / 50) * 100));

  // ── 碎片合成：透過事件請求 AvatarEngine 處理 ──────────────────────────
  const handleCraft = useCallback(() => {
    EventBus.emit(Events.Avatar.REQUEST_CRAFT_TICKET);
  }, []);

  // ── 確認抽數，進入 ready 頁 ────────────────────────────────────────────────
  const confirmDraw = (times) => {
    setDrawCount(times);
    setState('ready');
  };

  // ── 執行抽卡 ──────────────────────────────────────────────────────────────
  const executeDraw = async () => {
    let res;
    try {
      ({ results: res } = await EventHelper.requestOnce(Events.Avatar.REQUEST_GACHA, Events.Avatar.GACHA_RESULT, { times: drawCount }));
    } catch {
      EventBus.emit(Events.System.TOAST, '❌ 抽卡逾時，請稍後再試');
      setState('select');
      return;
    }

    // 引擎層資源不足時回傳 null（並自行發 Toast），退回選擇頁即可
    if (!res) {
      setState('select');
      return;
    }

    // 清除上一輪的計時器
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    // 設定新結果、重置翻牌、更換 drawKey（讓卡片以全新狀態掛載）
    setResults(res);
    setFlippedCards(new Set());
    setDrawKey(k => k + 1);
    setState('result');

    // 依序翻牌
    res.forEach((r, i) => {
      const t1 = setTimeout(() => {
        setFlippedCards(prev => new Set(prev).add(i));
        if (r.rarity === 'SSR') {
          const t2 = setTimeout(
            () => EventBus.emit(Events.System.TOAST, `✨ SSR 獲得！${r.name}`),
            200
          );
          timeoutRefs.current.push(t2);
        }
      }, i * 150 + 300);
      timeoutRefs.current.push(t1);
    });
  };

  // ── 稀有度顏色 ────────────────────────────────────────────────────────────
  const getRarityColor = (r) => {
    if (r === 'SSR') return '#f59e0b';
    if (r === 'SR') return '#a855f7';
    if (r === 'R') return '#3b82f6';
    return 'var(--text-ghost, #6b7280)';
  };

  // ── 卡片渲染：key 使用 drawKey-i，每輪抽卡都全新掛載 ──────────────────────
  const renderResultCard = (r, i) => {
    const isFlipped = flippedCards.has(i);
    const rColor = getRarityColor(r.rarity);
    const isSSR = r.rarity === 'SSR';
    const isSingle = results.length === 1;
    const cardSize = isSingle
      ? { width: 160, height: 230, margin: '0 auto' }
      : { aspectRatio: '2/3' };
    const imageTypes = ['suit', 'top', 'bottom', 'hair_front', 'hair_back', 'hair_combo', 'face', 'body', 'accessory', 'bg', 'companion', 'pet', 'furniture'];
    const isImage = r.type && imageTypes.includes(r.type);
    const imgFile = r.imgId || r.id;

    return (
      <div
        key={`${drawKey}-${i}`}
        style={{ ...cardSize, perspective: 600, cursor: 'pointer' }}
        onClick={() => setFlippedCards(prev => new Set(prev).add(i))}
      >
        <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          {/* 背面 */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 10, background: 'linear-gradient(135deg, var(--bg-card), var(--bg-box))', border: '1.5px solid rgba(167,139,250,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: 'rgba(167,139,250,0.3)' }}>?</div>
          {/* 正面 */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 10, background: 'var(--bg-box)', border: `2px solid ${rColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${isSSR ? 20 : 10}px ${rColor}66`, padding: 6, animation: isSSR ? 'ssrGlow 1.5s ease-in-out infinite' : 'none' }}>
            {r.isNew && <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--color-correct)', color: '#fff', fontSize: '0.55rem', fontWeight: 'bold', padding: '2px 5px', borderRadius: 8, zIndex: 10 }}>NEW!</div>}
            <div style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.55rem', fontWeight: 800, color: rColor, border: `1px solid ${rColor}`, padding: '1px 3px', borderRadius: 4, zIndex: 10 }}>{r.rarity || 'R'}</div>
            <div style={{ fontSize: isSingle ? '4rem' : '1.8rem', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '60%' }}>
              {isImage ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={`img/${imgFile}.png`} style={{ width: '80%', height: '80%', objectFit: 'contain', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))', zIndex: 2 }} onError={e => { e.target.style.opacity = '0'; e.target.nextElementSibling.style.display = 'block'; }} alt="" />
                  <span style={{ display: 'none', position: 'absolute', zIndex: 1 }}>{r.icon || '🎁'}</span>
                </div>
              ) : (r.icon || '🎁')}
            </div>
            <div style={{ fontSize: isSingle ? '0.95rem' : '0.6rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', zIndex: 10 }}>{r.name}</div>
            {!r.isNew && r.type !== 'reward' && <div style={{ fontSize: '0.55rem', color: 'var(--text-ghost)', marginTop: 3 }}>→碎片</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    // ⚠️ 修正：position 從 'fixed' 改成 'absolute'。'fixed' 會相對瀏覽器真實視窗
    //    定位，蓋出 AvatarPage 自己的框架（pageStyle，已有 position:'relative'）
    //    之外；改成 'absolute' 後正確被限制在頁面框架內。
    <div style={{ position: 'absolute', inset: 0, zIndex: 9000, background: 'var(--bg-panel, #1a1625)', display: 'flex', flexDirection: 'column', animation: 'gachaFadeIn 0.2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>✨ 幸運扭蛋</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🎟️ {ticketCount}張 &nbsp; 💎 {totalGems}</span>
          <button style={{ ...wardrobeBtnStyle, width: 'auto', padding: '4px 10px', border: 'none', background: 'transparent' }} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── select ── */}
      {state === 'select' && (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 20, overflow: 'hidden' }}>
            <div style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 20px rgba(167,139,250,0.5))', animation: 'gachaFloat 3s ease-in-out infinite' }}>🎰</div>
            <div style={{ width: '100%', maxWidth: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 5 }}>
                <span>保底進度</span><span style={{ color: 'var(--color-gold)' }}>{gachaPity} / 50 抽</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-box)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${pityPct}%`, background: 'linear-gradient(90deg, #a855f7, var(--color-gold))', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%', maxWidth: 320 }}>
              <div style={{ flex: 1, background: 'var(--bg-box)', padding: 10, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>🎟️ 抽獎券</div>
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>{ticketCount} 張</div>
              </div>
              <div style={{ flex: 1.2, background: 'var(--bg-box)', padding: 10, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>🧩 碎片 ({fragCount}/10)</div>
                <button
                  onClick={handleCraft}
                  disabled={fragCount < 10}
                  style={{ background: fragCount >= 10 ? 'var(--color-gold)' : 'transparent', border: `1px solid ${fragCount >= 10 ? 'transparent' : 'var(--border)'}`, color: fragCount >= 10 ? '#000' : 'var(--text-muted)', borderRadius: 6, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 'bold', cursor: fragCount >= 10 ? 'pointer' : 'not-allowed', width: '100%', transition: 'all 0.2s' }}
                >
                  {fragCount >= 10 ? '✨ 點擊合成' : '收集碎片'}
                </button>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-box)', padding: 10, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>💎 鑽石</div>
                <div style={{ fontWeight: 800, color: 'var(--color-info)' }}>{totalGems}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 10, flexShrink: 0, borderTop: '1px solid var(--border)' }}>
            <button style={{ ...wardrobeBtnStyle, flex: 1, padding: '13px 8px', border: '1.5px solid var(--color-info)', color: 'var(--color-info)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => confirmDraw(1)}>
              <span>單抽</span><span style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.8 }}>💎 {SINGLE_DRAW_COST} / 🎟️ 1券</span>
            </button>
            <button style={{ ...wardrobeBtnStyle, flex: 1, padding: '13px 8px', background: 'linear-gradient(135deg,#6d28d9,#a855f7)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(168,85,247,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => confirmDraw(10)}>
              <span>十連抽</span><span style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.9 }}>💎 {TEN_DRAW_COST} / 🎟️ 10券</span>
            </button>
          </div>
        </>
      )}

      {/* ── ready ── */}
      {state === 'ready' && (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', gap: 16 }}>
            <p style={{ color: 'var(--text-muted)' }}>準備好了：<b style={{ color: 'var(--color-gold)' }}>{drawCount === 1 ? '單抽' : '十連抽'}</b></p>
            <div onClick={executeDraw} style={{ fontSize: '8rem', cursor: 'pointer', filter: 'drop-shadow(0 4px 20px rgba(167,139,250,0.6))', animation: 'gachaFloat 1.5s ease-in-out infinite', userSelect: 'none' }}>🎰</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>點擊扭蛋機啟動！</p>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 10, flexShrink: 0, borderTop: '1px solid var(--border)' }}>
            <button style={{ ...wardrobeBtnStyle, flex: 1, background: 'transparent' }} onClick={() => setState('select')}>← 返回</button>
            <button style={{ ...wardrobeBtnStyle, flex: 2, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }} onClick={executeDraw}>🚀 啟動扭蛋</button>
          </div>
        </>
      )}

      {/* ── result ── */}
      {state === 'result' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
            <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 8 }}>🎉</div>
            <h3 style={{ textAlign: 'center', color: 'var(--text)', marginBottom: 16, fontSize: '1rem' }}>
              恭喜獲得！<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>（點擊卡片翻開）</span>
            </h3>
            <div style={{ display: results.length === 1 ? 'flex' : 'grid', justifyContent: 'center', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, width: '100%' }}>
              {results.map((r, i) => renderResultCard(r, i))}
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 10, flexShrink: 0, borderTop: '1px solid var(--border)' }}>
            {/* ← 返回：回到扭蛋主選單，不是關閉整個 Modal */}
            <button style={{ ...wardrobeBtnStyle, flex: 1, background: 'transparent' }} onClick={() => setState('select')}>← 返回</button>
            <button style={{ ...wardrobeBtnStyle, flex: 2, background: 'var(--color-correct)', color: '#fff', border: 'none' }} onClick={() => setState('ready')}>🔄 再抽 {drawCount} 次</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AvatarPage ───────────────────────────────────────────────────────────────
export default function AvatarPage({ onNavigate }) {
  const avatar = useGameStore(s => s.avatar) || { unlocked: [], wearing: {}, gender: 'm' };
  const activePets = useGameStore(s => s.activePets) || [];
  const previewWearing = useGameStore(s => s.previewWearing) || null;

  const [mode, setMode] = useState('avatar');
  const [tab, setTab] = useState('suit');
  const [showGacha, setShowGacha] = useState(false);
  const [petReplacePrompt, setPetReplacePrompt] = useState(null); // { newItemId } | null
  const [namingIndex, setNamingIndex] = useState(null); // 剛裝備/替換完成、還沒取名的寵物在 activePets 裡的 index

  useEffect(() => {
    const unsub = EventBus.on(Events.Avatar.PET_REPLACE_PROMPT, ({ newItemId }) => {
      setPetReplacePrompt({ newItemId });
    });
    return unsub;
  }, []);

  // 不管是直接裝備、還是替換後領養（PetReplaceModal 確認後），avatar.js 的
  // _addNewPet() 都會發這個事件，這裡是唯一需要監聽它的地方——裝備動作
  // 一定發生在這個頁面上，事件不會被漏接，取名視窗可以立即彈出。
  useEffect(() => {
    const unsub = EventBus.on(Events.Pet.PET_ADDED_NEEDS_NAMING, ({ index }) => {
      setNamingIndex(index);
    });
    return unsub;
  }, []);

  const handlePetReplaceConfirm = useCallback((index, newItemId) => {
    EventBus.emit(Events.Avatar.REQUEST_CONFIRM_PET_REPLACE, { index, newItemId });
    setPetReplacePrompt(null);
  }, []);

  const handleConfirmPetName = useCallback((name) => {
    EventBus.emit(Events.Pet.REQUEST_NAME_PET, { index: namingIndex, name });
    setNamingIndex(null);
  }, [namingIndex]);

  const handleBackToLobby = () => onNavigate('main');

  useEffect(() => {
    // F12 測試用：cheatGacha() 或 cheatGacha(999999, 100)
    // ⚠️ 只在開發環境掛載，正式版 build 這段完全不會執行，也不會出現在 window 上
    if (import.meta.env.DEV) {
      window.cheatGacha = (gem = 50000, tickets = 50) => {
        useGameStore.setState(s => {
          const bag = [...(s.bag || [])];
          const tIdx = bag.findIndex(i => i.id === 'sys_gacha_ticket');
          if (tIdx > -1) bag[tIdx] = { ...bag[tIdx], count: bag[tIdx].count + tickets };
          else bag.push({ id: 'sys_gacha_ticket', count: tickets });
          return { freeGem: (s.freeGem || 0) + gem, bag };
        });
        console.log(`💎 作弊：+${gem} 鑽石, +${tickets} 券`);
      };
    }

    return () => {
      EventBus.emit(Events.Avatar.REQUEST_CLEAR_PREVIEW);
      if (import.meta.env.DEV) delete window.cheatGacha;
    };
  }, []);

  const handleSetMode = useCallback(m => {
    setMode(m);
    const defaults = { avatar: 'suit', pet: 'pet', decor: 'bg' };
    setTab(defaults[m] ?? 'suit');
  }, []);

  const wearing = previewWearing ?? avatar.wearing ?? {};
  const unlockedSet = new Set(avatar.unlocked ?? []);

  const MODE_TABS = {
    avatar: ['suit', 'top', 'bottom', 'hair', 'face', 'body', 'accessory'],
    pet: ['pet', 'companion'],
    decor: ['bg', 'furniture'],
  };
  const TAB_LABELS = {
    suit: '套裝', top: '上裝', bottom: '下裝', hair: '髮型',
    face: '臉部', body: '素體', accessory: '配件',
    pet: '寵物', companion: '陪伴', bg: '背景', furniture: '家具',
  };

  const tabItems = useMemo(() => {
    const seen = new Set();
    return ALL_ITEMS.filter(item => {
      const typeMatch = tab === 'hair'
        ? ['hair_front', 'hair_back', 'hair_combo'].includes(item.type)
        : tab === 'suit'
          ? ['suit', 'special_pose'].includes(item.type)
          : item.type === tab;
      if (!typeMatch || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [tab]);

  // ⚠️ 修正：判斷「是否已裝備」只看真實的 avatar.wearing，不要用混合了預覽的
  //    wearing（previewWearing ?? avatar.wearing）。用混合值會導致「只是點過
  //    預覽、還沒購買/裝備」的物品，按鈕也誤判成「已裝備/卸下」，使用者點下去
  //    會把未解鎖的物品真的裝備上去（免費穿裝）。這裡改成只認真實狀態，
  //    預覽本身仍用 wearing 顯示在角色身上（不受影響，繼續能「先試穿」）。
  const isItemWearing = item =>
    tab === 'pet'
      ? activePets.some(p => p.id === item.id)
      : (avatar.wearing ?? {})[item.type] === item.id;

  const handleWear = useCallback((id, type) => EventBus.emit(Events.Avatar.REQUEST_WEAR_ITEM, { id, type }), []);
  const handleBuy = useCallback(async id => {
    let res;
    try {
      res = await EventHelper.requestOnce(Events.Avatar.REQUEST_BUY_ITEM, Events.Avatar.BUY_ITEM_RESULT, { id });
    } catch {
      EventBus.emit(Events.System.TOAST, '❌ 購買逾時，請稍後再試');
      return;
    }
    if (!res.success) {
      EventBus.emit(Events.System.TOAST, res.msg || '餘額不足');
      return;
    }
    EventBus.emit(Events.System.TOAST, '🎉 購買成功！');
  }, []);

  const modeBtnActive = m => mode === m;

  return (
    <div style={pageStyle}>
      <style>{modalAnim}</style>

      {/* TopBar */}
      <div style={topBarStyle}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text, #2c1a0e)' }}>👗 更衣室</div>
        <button style={backBtnStyle} onClick={handleBackToLobby}>↵ 返回</button>
      </div>

      {/* Stage */}
      <div style={stageStyle}>
        <div style={modeColStyle}>
          <button style={modeBtnStyle} onClick={() => setShowGacha(true)}>🎰</button>
          {[['avatar', '👗'], ['pet', '🐾'], ['decor', '🖼️']].map(([m, icon]) => (
            <button key={m}
              style={{ ...modeBtnStyle, borderColor: modeBtnActive(m) ? 'var(--color-gold,#f5a623)' : 'var(--border,rgba(0,0,0,0.09))', background: modeBtnActive(m) ? 'rgba(245,166,35,0.12)' : 'var(--bg-card,#fff)' }}
              onClick={() => handleSetMode(m)}
            >{icon}</button>
          ))}
        </div>
        <div style={{ width: '100%', height: '100%', transform: 'scale(0.85)', transformOrigin: 'center' }}>
          <AvatarStage wearing={wearing} activePets={activePets} />
        </div>
      </div>

      {/* Wardrobe */}
      <div style={wardrobeAreaStyle}>
        <div style={tabBarStyle}>
          {MODE_TABS[mode].map(t => (
            <button key={t}
              style={{ ...tabBtnStyle, background: tab === t ? 'var(--color-correct,#227A59)' : 'transparent', color: tab === t ? '#fff' : 'var(--text-muted,#8c6e52)', border: tab === t ? 'none' : '1px solid var(--border,rgba(0,0,0,0.09))' }}
              onClick={() => setTab(t)}
            >{TAB_LABELS[t]}</button>
          ))}
        </div>
        <div style={wardrobeListStyle}>
          {tabItems.length === 0 ? (
            <div style={emptyStyle}>
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>📦</div>
              <div style={{ fontWeight: 700 }}>尚無物品</div>
            </div>
          ) : (
            <div style={wardrobeGridStyle}>
              {tabItems.map(item => (
                <WardrobeCard
                  key={item.id}
                  item={item}
                  isWearing={isItemWearing(item)}
                  isUnlocked={unlockedSet.has(item.id)}
                  onWear={handleWear}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          )}
          <div style={{ height: 20 }} />
        </div>
      </div>

      {showGacha && <GachaModal onClose={() => setShowGacha(false)} />}
      {petReplacePrompt && (
        <PetReplaceModal
          activePets={activePets}
          newItemId={petReplacePrompt.newItemId}
          onConfirm={handlePetReplaceConfirm}
          onCancel={() => setPetReplacePrompt(null)}
        />
      )}
      {namingIndex !== null && <PetNamingModal onConfirm={handleConfirmPetName} />}
    </div>
  );
}



// ─── Styles ───────────────────────────────────────────────────────────────────
const pageStyle = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel,#f7e7ce)', position: 'relative' };
const topBarStyle = { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-panel, #f7e7ce)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))', zIndex: 100 };
const backBtnStyle = { padding: '6px 14px', borderRadius: '8px', background: 'var(--bg-box, #fff)', border: '1px solid var(--border, rgba(0,0,0,0.09))', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text, #2c1a0e)', fontFamily: 'inherit', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const stageStyle = { flexShrink: 0, height: '38%', minHeight: 190, position: 'relative', background: 'var(--bg-body,#e8d5b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid var(--border,rgba(0,0,0,0.09))' };
const modeColStyle = { position: 'absolute', top: 10, right: 14, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 100 };
const modeBtnStyle = { width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--border,rgba(0,0,0,0.09))', background: 'var(--bg-card,#fff)', fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'all 0.2s' };
const wardrobeAreaStyle = { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card,#fff)', boxShadow: '0 -4px 15px rgba(0,0,0,0.07)', overflow: 'hidden', zIndex: 10 };
const tabBarStyle = { flexShrink: 0, display: 'flex', gap: 6, padding: '8px 12px', background: 'var(--bg-panel,#f7e7ce)', borderBottom: '1px solid var(--border,rgba(0,0,0,0.09))', overflowX: 'auto', scrollbarWidth: 'none' };
const tabBtnStyle = { flexShrink: 0, borderRadius: 50, padding: '4px 12px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: '0.15s', fontFamily: 'inherit' };
const wardrobeListStyle = { flex: 1, overflowY: 'auto', padding: 8 };
const wardrobeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 };
const wardrobeCardStyle = { borderRadius: 'var(--radius-md,12px)', border: '2px solid transparent', display: 'flex', flexDirection: 'column', padding: 4, aspectRatio: '1/1', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', transition: 'all 0.2s', overflow: 'hidden', boxSizing: 'border-box' };
const wardrobeBtnStyle = { width: '100%', padding: '3px 2px', fontSize: 'clamp(0.58rem,2.2vw,0.72rem)', fontWeight: 700, cursor: 'pointer', borderRadius: 6, fontFamily: 'inherit', border: '1px solid var(--border-input,#d5c5a8)', background: 'var(--bg-card,#fff)', color: 'var(--text,#2c1a0e)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', opacity: 0.5, textAlign: 'center' };