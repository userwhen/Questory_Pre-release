// src/layout/GameLayout.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { App as CapacitorApp } from '@capacitor/app';
import HUD from '@/layout/HUD.jsx';
import Navbar from '@/layout/Navbar.jsx';
import MainPage from '@/main-stage/MainPage.jsx';
import TaskPage from '@/task/pages/TaskPage.jsx';
import StatsPage from '@/stats/pages/StatsPage.jsx';
import ShopPage from '@/shop/pages/ShopPage.jsx';
import SettingsPage from '@/settings/pages/SettingsPage.jsx';
import AvatarPage from '@/avatar/pages/AvatarPage.jsx';
import GachaPage from '@/avatar/pages/GachaPage.jsx';
import { GACHA_ENABLED } from '@/avatar/data/avatar_config.js';
import ToastManager from '@/ui/ToastManager.jsx';
import CurrencyShopModal from '@/shop/components/CurrencyShopModal.jsx';
import HelpModal from '@/ui/HelpModal.jsx';
import Modal from '@/ui/Modal.jsx';
import QuickNoteModal from '@/task/components/QuickNoteModal.jsx';
import { useShallow } from 'zustand/react/shallow';

const FULLSCREEN_PAGES = [];

const FULLSCREEN_BG = {};

const FIXED_PARENTS = {
  gacha: 'avatar',
};

function getRoot(mode) {
  return mode === 'basic' ? 'stats' : 'main';
}

function getParent(pageId, mode) {
  const root = getRoot(mode);
  return FIXED_PARENTS[pageId] ?? root;
}

function PageRouter({ pageId, onNavigate, onBack, canGoBack, onRegisterBack }) {
  switch (pageId) {
    case 'main':    return <MainPage onNavigate={onNavigate} />;
    case 'task':    return <TaskPage onRegisterBack={onRegisterBack} />;
    case 'stats':   return <StatsPage />;
    case 'shop':    return <ShopPage />;
    case 'settings':return <SettingsPage />;
    case 'avatar':  return <AvatarPage onNavigate={onNavigate} onBack={onBack} canGoBack={canGoBack} />;
    case 'gacha':   return GACHA_ENABLED ? <GachaPage /> : <MainPage onNavigate={onNavigate} />;
    case 'profile': return <StatsPage />;
    default:        return <Placeholder pageId={pageId} />;
  }
}

function Placeholder({ pageId }) {
  return (
    <div style={s.placeholder}>
      <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>📄</div>
      <div style={{ fontWeight: 700, color: 'var(--text, #2c1a0e)' }}>{pageId}</div>
      <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)', marginTop: 'var(--space-xs)' }}>建設中...</div>
    </div>
  );
}

// 讓「打開哪個全域彈窗」的狀態去登記／取消登記硬體返回鍵攔截，
// 每個彈窗一行呼叫就好，不用各自重複寫 useEffect。
function useOverlayBackHandler(id, isOpen, setOpen, registerBackHandler) {
  useEffect(() => {
    registerBackHandler(id, isOpen ? () => setOpen(false) : null);
    return () => registerBackHandler(id, null);
  }, [id, isOpen, setOpen, registerBackHandler]);
}

export default function GameLayout() {
  const mode = useGameStore(s => s.settings?.mode ?? 'adventurer');
  const [page, setPage] = useState(() => getRoot(mode));

  // ── 全域彈窗（不是 page，不會讓背景頁面被換掉）──────────
  const [currencyShopTab, setCurrencyShopTab] = useState(null); // null=關閉，'gem'|'gold'
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const pageRef = useRef(page);
  pageRef.current = page;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const hasSentinelRef = useRef(false);

  const backHandlersRef = useRef(new Map());
  const orderCounterRef = useRef(0);

  const registerBackHandler = useCallback((id, handler) => {
    const map = backHandlersRef.current;
    if (handler) {
      orderCounterRef.current += 1;
      map.set(id, { handler, order: orderCounterRef.current });
    } else {
      map.delete(id);
    }
  }, []);

  const consumeBack = useCallback(() => {
    const map = backHandlersRef.current;
    let top = null;
    for (const entry of map.values()) {
      if (!top || entry.order > top.order) top = entry;
    }
    if (top) {
      top.handler();
      return true;
    }
    return false;
  }, []);

  useOverlayBackHandler('currency-shop-modal', !!currencyShopTab, setCurrencyShopTab, registerBackHandler);
  useOverlayBackHandler('quick-add-modal', showQuickAdd, setShowQuickAdd, registerBackHandler);
  useOverlayBackHandler('qa-modal', showQA, setShowQA, registerBackHandler);
  useOverlayBackHandler('profile-modal', showProfile, setShowProfile, registerBackHandler);

  // 讓非 HUD 的頁面（未來任何地方）也能透過事件打開貨幣商店，不用一路 prop-drilling
  useEffect(() => {
    const unsub = EventBus.on(Events.System.MODAL_OPEN, (payload) => {
      if (payload?.type === 'currencyShop') setCurrencyShopTab(payload.tab || 'gem');
    });
    return unsub;
  }, []);

  const navigate = useCallback((pageId) => {
    // 這幾個不是 page，是全域彈窗——攔截掉，不動 page 這個 state，
    // 背景維持原本在看的那一頁，不會被換成空白或另一頁。
    if (pageId === 'quick')   { setShowQuickAdd(true); return; }
    if (pageId === 'qa')      { setShowQA(true); return; }

    if (modeRef.current === 'basic' && pageId === 'main') return;
    setPage(current => (current === pageId ? current : pageId));
  }, []);

  const goBack = useCallback(() => {
    if (consumeBack()) return;
    if (pageRef.current === getRoot(modeRef.current)) return;
    window.history.back();
  }, [consumeBack]);

  useEffect(() => {
    window.history.replaceState({ questoryDepth: 1 }, '');
  }, []);

  useEffect(() => {
    const root = getRoot(mode);
    const isRoot = page === root;
    if (!isRoot && !hasSentinelRef.current) {
      window.history.pushState({ questorySentinel: true }, '');
      hasSentinelRef.current = true;
    } else if (isRoot && hasSentinelRef.current) {
      hasSentinelRef.current = false;
      window.history.replaceState({}, '');
    }
  }, [page, mode]);

  useEffect(() => {
    const onPopState = () => {
      hasSentinelRef.current = false;
      if (consumeBack()) {
        window.history.pushState({ questorySentinel: true }, '');
        hasSentinelRef.current = true;
        return;
      }
      setPage(current => getParent(current, modeRef.current));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [consumeBack]);

  useEffect(() => {
    const exitPromptRef = { current: 0 };
    let handle;

    CapacitorApp.addListener('backButton', () => {
      if (consumeBack()) return;
      const root = getRoot(modeRef.current);
      if (pageRef.current !== root) {
        setPage(current => getParent(current, modeRef.current));
        return;
      }
      const now = Date.now();
      if (now - exitPromptRef.current < 2000) {
        CapacitorApp.exitApp();
      } else {
        exitPromptRef.current = now;
        EventBus.emit(Events.System.TOAST, '再按一次返回鍵離開');
      }
    }).then(h => { handle = h; });

    return () => { handle?.remove(); };
  }, [consumeBack]);

  const isFullscreen = FULLSCREEN_PAGES.includes(page);
  const showHud = !isFullscreen;
  const canGoBack = page !== getRoot(mode);

  const fullscreenStyle = {
    ...s.fullscreenSafeArea,
    background: FULLSCREEN_BG[page] ?? 'var(--bg-panel, #f7e7ce)',
  };

  return (
    <div style={s.frame}>
      {showHud && (
        <HUD
          onAvatarClick={() => setShowProfile(true)}
          onSettingsClick={() => navigate('settings')}
        />
      )}
      <div style={s.content}>
        {isFullscreen ? (
          <div style={fullscreenStyle}>
            <PageRouter
              pageId={page}
              onNavigate={navigate}
              onBack={goBack}
              canGoBack={canGoBack}
              onRegisterBack={registerBackHandler}
            />
          </div>
        ) : (
          <PageRouter pageId={page} onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} onRegisterBack={registerBackHandler} />
        )}
      </div>
      {!isFullscreen && <Navbar activePage={page} onNavigate={navigate} />}

      {currencyShopTab && <CurrencyShopModal initialTab={currencyShopTab} onClose={() => setCurrencyShopTab(null)} />}
      {showQuickAdd && (
        <QuickNoteModal onClose={() => setShowQuickAdd(false)} />
      )}
      {showQA && (
        <HelpModal onClose={() => setShowQA(false)} onNavigate={(target) => { setShowQA(false); navigate(target); }} />
      )}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <ToastManager />
    </div>
  );
}

/* ─── 點擊頭像：顯示原 Settings 上方玩家資訊卡 ─── */
function ProfileModal({ onClose }) {
  const { lv, loginStreak, totalLoginDays } = useGameStore(
    useShallow(s => ({
      lv: s.lv || 1,
      loginStreak: s.loginStreak || 0,
      totalLoginDays: s.totalLoginDays || 0,
    }))
  );

  return (
    <Modal title="🧙 冒險者資訊" onClose={onClose} maxWidth={320}>
      <div style={{
        background: 'var(--bg-hud, #2c1a0e)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-xl) var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-xs)',
      }}>
        <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-xs)' }}>🧙</div>
        <div style={{ fontWeight: 800, fontSize: 'var(--font-title)', color: 'var(--text-on-dark, #f5e6cf)' }}>
          Lv.{lv} 冒險者
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xs)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-title)', fontWeight: 800, color: 'var(--color-gold, #f5a623)' }}>{loginStreak}</div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'rgba(255,255,255,0.5)' }}>連續天數</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-title)', fontWeight: 800, color: 'var(--color-gold, #f5a623)' }}>{totalLoginDays}</div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'rgba(255,255,255,0.5)' }}>累計登入</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const s = {
  frame: {
    position: 'relative',
    width: '100%', height: '100%',
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--bg-panel, #f7e7ce)',
    boxShadow: '0 0 40px rgba(0,0,0,0.4)',
  },
  content: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  fullscreenSafeArea: {
    width: '100%', height: '100%',
    boxSizing: 'border-box',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    overflow: 'hidden',
    position: 'relative',
  },
  
  placeholder: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '0 var(--space-lg)',
    boxSizing: 'border-box',
  },
};