/* src/components/pages/AvatarPage.jsx */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus, EventHelper } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { AvatarShop, ALL_ITEMS, checkAttrGate, GACHA_ENABLED, AVATAR_FULL_WARDROBE_ENABLED } from '@/avatar/data/avatar_config.js';
import CharacterSprite from '@/ui/CharacterSprite.jsx';
import TabPill from '@/ui/TabPill.jsx';

// ─── AvatarStage ──────────────────────────────────────────────────────────────
// 層級：背景(1) → 陪伴者左後(2) → 角色置中(3) → 寵物右下(4+)
// 角色佔中央，陪伴／寵物不擠進主角空間。
function AvatarStage({ wearing }) {
  const findItem = id => ALL_ITEMS.find(i => i.id === id);
  const w = wearing;

  // 全景當底；牆／地可疊在上面（兩邊齊全時 engine 會清掉 bg）
  const fullBg = w.bg || null;
  const wallBg = w.wall_bg || null;
  const floorBg = w.floor_bg || null;

  const fullBgSrc = fullBg ? (findItem(fullBg)?.imgId ?? fullBg) : null;
  const wallSrc = wallBg ? (findItem(wallBg)?.imgId ?? wallBg) : null;
  const floorSrc = floorBg ? (findItem(floorBg)?.imgId ?? floorBg) : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}>
      {/* 1. 整片全景（底） */}
      {fullBgSrc && (
        <img
          src={`img/${fullBgSrc}.png`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, zIndex: 1 }}
          onError={e => { e.target.style.opacity = '0'; }}
          alt=""
        />
      )}

      {/* 2. 牆（可疊在全景上） */}
      {wallSrc && (
        <img
          src={`img/${wallSrc}.png`}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70%', width: '100%', objectFit: 'cover', opacity: 0.75, zIndex: 2 }}
          onError={e => { e.target.style.opacity = '0'; }}
          alt=""
        />
      )}

      {/* 3. 地（可疊在全景上） */}
      {floorSrc && (
        <img
          src={`img/${floorSrc}.png`}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', width: '100%', objectFit: 'cover', opacity: 0.75, zIndex: 2 }}
          onError={e => { e.target.style.opacity = '0'; }}
          alt=""
        />
      )}

      {/* 角色群組（陪伴＋角色＋寵物）：只有這組留呼吸空間縮小，背景維持滿版 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3, transform: 'scale(0.85)', transformOrigin: 'center' }}>
        {/* 陪伴者：偏左後方、放大、在角色圖層之後，不壓主角 */}
        {w.companion && (
          <div style={{
            position: 'absolute',
            bottom: '8%',
            left: '2%',
            zIndex: 2,
            height: 140,
            maxWidth: '32%',
            display: 'flex',
            alignItems: 'flex-end',
          }}>
            <img
              src={`img/${findItem(w.companion)?.imgId ?? w.companion}.png`}
              style={{
                height: '100%',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.12))',
              }}
              onError={e => { e.target.style.opacity = '0'; }}
              alt=""
            />
          </div>
        )}

        {/* 角色：置中，預留左右空間給陪伴／寵物 */}
        <div style={{
          position: 'absolute',
          bottom: '4%',
          left: '18%',
          right: '22%',
          height: '88%',
          zIndex: 3,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <CharacterSprite wearing={w} />
          </div>
        </div>

        
      </div>
    </div>
  );
}

// ─── WardrobeCard ─────────────────────────────────────────────────────────────
function WardrobeCard({ item, isWearing, isUnlocked, attrs, onWear, onBuy }) {
  const [imgFailed, setImgFailed] = useState(false);
  const shopConfig = AvatarShop.find(i => i.id === item.id);
  const canBuy = shopConfig && shopConfig.price !== undefined;
  const needsSet = (shopConfig?.requires?.length ?? 0) > 0;
  const gate = checkAttrGate(shopConfig || item, attrs);
  const attrLocked = !gate.ok;
  const imgId = item.imgId ?? item.id;

  const handlePreview = (e) => {
    e.stopPropagation();
    EventBus.emit(Events.Avatar.REQUEST_PREVIEW_ITEM, { itemId: item.id, type: item.type });
  };

  // 未達屬性：點擊按鈕時 toast 完整句（Engine 擋購買時也會回同一句）
  const handleAttrLockedClick = (e) => {
    e.stopPropagation();
    if (gate.msg) EventBus.emit(Events.System.TOAST, `🔒 ${gate.msg}`);
  };

  return (
    <div style={{
      ...wardrobeCardStyle,
      borderColor: isWearing ? 'var(--color-gold,#f5a623)' : 'transparent',
      background: isWearing ? 'rgba(245,166,35,0.08)' : 'var(--bg-card,#fff)',
      opacity: (!isUnlocked && (attrLocked || needsSet)) ? 0.72 : 1,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '4px 4px 2px', minHeight: 0 }} onClick={handlePreview}>
        <div style={{ position: 'relative', width: '100%', height: 'var(--size-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
          {imgFailed ? (
            <span style={{ fontSize: 'var(--size-sm)' }}>{item.icon || '📦'}</span>
          ) : item.layers ? (
            item.layers.map((l, i) => (
              <img key={i} src={`img/${l.img}.png`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} onError={() => setImgFailed(true)} alt="" />
            ))
          ) : (
            <img src={`img/${imgId}.png`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} onError={() => setImgFailed(true)} alt="" />
          )}
        </div>
        <div style={{ fontSize: 'clamp(0.6rem,2vw,0.7rem)', fontWeight: 700, color: 'var(--text,#2c1a0e)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
          {item.name}
        </div>
      </div>

      <div style={{ width: '100%', flexShrink: 0, marginTop: 'auto' }}>
        {isWearing ? (
          <button style={{ ...wardrobeBtnStyle, background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none' }} onClick={() => onWear(item.id, item.type)}>
            {item.type === 'body' || item.type === 'face' || (item.type === 'suit' && !AVATAR_FULL_WARDROBE_ENABLED) ? '已裝備' : '卸下'}
          </button>
        ) : isUnlocked ? (
          <button style={{ ...wardrobeBtnStyle, background: 'var(--color-correct,#227A59)', color: '#fff', border: 'none' }} onClick={() => onWear(item.id, item.type)}>
            裝備
          </button>
        ) : needsSet ? (
          <button style={{ ...wardrobeBtnStyle, opacity: 0.55, cursor: 'not-allowed' }} disabled>✨集齊解鎖</button>
        ) : attrLocked && canBuy ? (
          <button
            style={{ ...wardrobeBtnStyle, opacity: 0.7, cursor: 'pointer', background: 'var(--bg-box,rgba(0,0,0,0.045))', color: 'var(--text-muted,#8c6e52)' }}
            onClick={handleAttrLockedClick}
            title={gate.msg || ''}
          >
            🔒{gate.shortLabel || '屬性'}
          </button>
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

// ─── AvatarPage ───────────────────────────────────────────────────────────────
export default function AvatarPage({ onNavigate }) {
  const avatar = useGameStore(s => s.avatar) || { unlocked: [], wearing: {}, gender: 'm' };
  
  const previewWearing = useGameStore(s => s.previewWearing) || null;
  const attrs = useGameStore(s => s.attrs) || {};

  const [mode, setMode] = useState('avatar');
  const [tab, setTab] = useState('suit');

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.cheatGacha = (gem = 50000, tickets = 50) => {
        useGameStore.setState(s => {
          const bag = [...(s.bag || [])];
          const tIdx = bag.findIndex(i => i.id === 'sys_misc_gacha_ticket');
          if (tIdx > -1) bag[tIdx] = { ...bag[tIdx], count: bag[tIdx].count + tickets };
          else bag.push({ id: 'sys_misc_gacha_ticket', count: tickets });
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
    const defaults = { avatar: 'suit', decor: 'bg' };
    setTab(defaults[m] ?? 'suit');
  }, []);

  const wearing = previewWearing ?? avatar.wearing ?? {};
  const unlockedSet = new Set(avatar.unlocked ?? []);

  const MODE_TABS = {
    avatar: AVATAR_FULL_WARDROBE_ENABLED
      ? ['suit', 'top', 'bottom', 'hair', 'face', 'body', 'accessory']
      : ['suit'],
    // bg = 整片滿版背景；wall_bg / floor_bg = 房間牆地拆分
    decor: ['bg', 'wall_bg', 'floor_bg', 'furniture'],
  };
  const TAB_LABELS = {
    suit: '套裝', top: '上裝', bottom: '下裝', hair: '髮型',
    face: '臉部', body: '素體', accessory: '配件',
    pet: '寵物', companion: '陪伴', bg: '背景', furniture: '家具',
    wall_bg: '牆面', floor_bg: '地面',
  };

  const tabItems = useMemo(() => {
    const seen = new Set();
    const filtered = ALL_ITEMS.filter(item => {
      const typeMatch = tab === 'hair'
        ? ['hair_front', 'hair_back', 'hair_combo'].includes(item.type)
        : tab === 'suit'
          ? ['suit', 'special_pose'].includes(item.type)
          : item.type === tab;
      if (!typeMatch || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // 靠 requires 集齊解鎖、還沒集齊的排到最後（半透明顯示，不整格隱藏）
    const unlocked = avatar.unlocked ?? [];
    const ready = [];
    const pending = [];
    filtered.forEach(item => {
      const needsSet = (item.requires?.length ?? 0) > 0 && !unlocked.includes(item.id);
      (needsSet ? pending : ready).push(item);
    });
    return [...ready, ...pending];
  }, [tab, avatar.unlocked]);

  const isItemWearing = item => (avatar.wearing ?? {})[item.type] === item.id;

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
      <div style={stageStyle}>
        <div style={modeColStyle}>
          {GACHA_ENABLED && (
            <button style={modeBtnStyle} onClick={() => onNavigate('gacha')}>🎰</button>
          )}
          {[['avatar', '👗'], ['decor', '🖼️']].map(([m, icon]) => (
            <button key={m}
              style={{ ...modeBtnStyle, borderColor: modeBtnActive(m) ? 'var(--color-gold,#f5a623)' : 'var(--border,rgba(0,0,0,0.09))', background: modeBtnActive(m) ? 'rgba(245,166,35,0.12)' : 'var(--bg-card,#fff)' }}
              onClick={() => handleSetMode(m)}
            >{icon}</button>
          ))}
        </div>
        <div style={{ width: '100%', height: '100%' }}>
          <AvatarStage wearing={wearing} />
        </div>
      </div>

      <div style={wardrobeAreaStyle}>
        <div style={tabBarStyle}>
          <TabPill items={MODE_TABS[mode].map(t => ({ value: t, label: TAB_LABELS[t] }))} value={tab} onChange={setTab} />
        </div>
        <div style={wardrobeListStyle}>
          {tabItems.length === 0 ? (
            <div style={emptyStyle}>
              <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>📦</div>
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
                  attrs={attrs}
                  onWear={handleWear}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          )}
          <div style={{ height: 'var(--size-xs)' }} />
        </div>
      </div>

      
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const pageStyle = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel,#f7e7ce)', position: 'relative' };
const stageStyle = { flexShrink: 0, height: '38%', minHeight: 190, position: 'relative', background: 'var(--bg-elevated,#e8d5b7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid var(--border,rgba(0,0,0,0.09))' };
const modeColStyle = { position: 'absolute', top: 10, right: 14, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', zIndex: 'var(--z-page)' };
const modeBtnStyle = { width: 'var(--size-md)', height: 'var(--size-md)', borderRadius: '50%', border: '2px solid var(--border,rgba(0,0,0,0.09))', background: 'var(--bg-card,#fff)', fontSize: 'var(--font-title)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', transition: 'all var(--t-base)' };
const wardrobeAreaStyle = { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card,#fff)', boxShadow: '0 -4px 15px rgba(0,0,0,0.07)', overflow: 'hidden', zIndex: 10 };
const tabBarStyle = { flexShrink: 0, display: 'flex', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg-panel,#f7e7ce)', borderBottom: '1px solid var(--border,rgba(0,0,0,0.09))', overflowX: 'auto', scrollbarWidth: 'none' };

const wardrobeListStyle = { flex: 1, overflowY: 'auto', padding: 'var(--space-xs)' };
const wardrobeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-xs)' };
const wardrobeCardStyle = { borderRadius: 'var(--radius-md,12px)', border: '2px solid transparent', display: 'flex', flexDirection: 'column', padding: 'var(--space-xs)', aspectRatio: '1/1', boxShadow: 'var(--shadow-xs)', transition: 'all var(--t-base)', overflow: 'hidden', boxSizing: 'border-box' };
const wardrobeBtnStyle = { width: '100%', padding: '3px 2px', fontSize: 'clamp(0.58rem,2.2vw,0.72rem)', fontWeight: 700, cursor: 'pointer', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', border: '1px solid var(--border-input,#d5c5a8)', background: 'var(--bg-card,#fff)', color: 'var(--text,#2c1a0e)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' };
const emptyStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', opacity: 0.5, textAlign: 'center' };
