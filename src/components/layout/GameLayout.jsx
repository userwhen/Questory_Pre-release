// src/components/layout/GameLayout.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/core/state.js';
import { setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { App as CapacitorApp } from '@capacitor/app';
import HUD from './HUD.jsx';
import Navbar from './Navbar.jsx';
import MainPage from '@/components/pages/MainPage.jsx';
import TaskPage from '@/task/pages/TaskPage.jsx';
import StatsPage from '@/components/pages/StatsPage.jsx';
import ShopPage from '@/components/pages/ShopPage.jsx';
import SettingsPage from '@/components/pages/SettingsPage.jsx';
import CheckinModal from '@/components/pages/CheckinModal.jsx';
import TimerModal from '@/components/pages/TimerModal.jsx';
import ScannerModal from '@/components/pages/ScannerModal.jsx';
import ToastManager from '@/components/ui/ToastManager.jsx';
import GemShopModal from '@/components/ui/GemShopModal.jsx';
import HelpModal from '@/components/ui/HelpModal.jsx';

const FULLSCREEN_PAGES = [];
const NO_HUD_PAGES = ['shop'];

const FULLSCREEN_BG = {};

const FIXED_PARENTS = {};

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
    case 'scanner': return (      <ScannerModal
        onClose={onBack}
        onResult={({ name, kcal }) => {
          const timeStr = new Date().toTimeString().slice(0, 5);
          const totalKcal = kcal || 0;
          setState(s => {
            const cal = s.cal || { today: 0, logs: [] };
            return {
              cal: {
                today: (cal.today || 0) + totalKcal,
                logs: [`${timeStr} ${name} +${totalKcal}`, ...(cal.logs || [])].slice(0, 30),
              },
            };
          });
          EventBus.emit(Events.Stats.UPDATED);
          EventBus.emit(Events.System.TOAST, `🍱 已記錄 ${name}：+${totalKcal} kcal`);
          onNavigate('stats');
        }}
      />
    );
    case 'profile': return <StatsPage />;
    default:        return <Placeholder pageId={pageId} />;
  }
}

function Placeholder({ pageId }) {
  return (
    <div style={s.placeholder}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
      <div style={{ fontWeight: 700, color: 'var(--text, #2c1a0e)' }}>{pageId}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #8c6e52)', marginTop: 4 }}>建設中...</div>
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
  const [showGemShop, setShowGemShop] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQA, setShowQA] = useState(false);

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

  useOverlayBackHandler('gem-shop-modal', showGemShop, setShowGemShop, registerBackHandler);
  useOverlayBackHandler('checkin-modal', showCheckin, setShowCheckin, registerBackHandler);
  useOverlayBackHandler('timer-modal', showTimer, setShowTimer, registerBackHandler);
  useOverlayBackHandler('quick-add-modal', showQuickAdd, setShowQuickAdd, registerBackHandler);
  useOverlayBackHandler('qa-modal', showQA, setShowQA, registerBackHandler);

  const navigate = useCallback((pageId) => {
    // 這幾個不是 page，是全域彈窗——攔截掉，不動 page 這個 state，
    // 背景維持原本在看的那一頁，不會被換成空白或另一頁。
    if (pageId === 'checkin') { setShowCheckin(true); return; }
    if (pageId === 'timer')   { setShowTimer(true); return; }
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
  const showHud = !isFullscreen && !NO_HUD_PAGES.includes(page);
  const needsOwnTopSafeArea = !isFullscreen && NO_HUD_PAGES.includes(page);
  const canGoBack = page !== getRoot(mode);

  const fullscreenStyle =
    page === 'story'
      ? {
          width: '100%',
          height: '100%',
          background: FULLSCREEN_BG.story,
          overflow: 'hidden',
          position: 'relative',
        }
      : {
          ...s.fullscreenSafeArea,
          background: FULLSCREEN_BG[page] ?? 'var(--bg-panel, #f7e7ce)',
        };

  return (
    <div style={s.frame}>
      {showHud && (
        <HUD
          onAvatarClick={() => navigate('stats')}
          onGemClick={() => setShowGemShop(true)}
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
        ) : needsOwnTopSafeArea ? (
          <div style={s.noHudSafeArea}>
            <PageRouter pageId={page} onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} onRegisterBack={registerBackHandler} />
          </div>
        ) : (
          <PageRouter pageId={page} onNavigate={navigate} onBack={goBack} canGoBack={canGoBack} onRegisterBack={registerBackHandler} />
        )}
      </div>
      {!isFullscreen && <Navbar activePage={page} onNavigate={navigate} />}

      {showGemShop && <GemShopModal onClose={() => setShowGemShop(false)} />}
      {showCheckin && <CheckinModal onClose={() => setShowCheckin(false)} />}
      {showTimer && <TimerModal onClose={() => setShowTimer(false)} />}
      {showQuickAdd && (
        <TaskPage quickAddOnly initialOpenForm onDismiss={() => setShowQuickAdd(false)} />
      )}
      {showQA && (
        <HelpModal onClose={() => setShowQA(false)} onNavigate={(target) => { setShowQA(false); navigate(target); }} />
      )}

      <ToastManager />
    </div>
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
  noHudSafeArea: {
    width: '100%', height: '100%',
    boxSizing: 'border-box',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '0 20px',
    boxSizing: 'border-box',
  },
};