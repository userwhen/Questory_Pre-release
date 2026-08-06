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
import TaskPage from '@/components/pages/TaskPage.jsx';
import StatsPage from '@/components/pages/StatsPage.jsx';
import ShopPage from '@/components/pages/ShopPage.jsx';
import SettingsPage from '@/components/pages/SettingsPage.jsx';
import AvatarPage from '@/components/pages/AvatarPage.jsx';
import GachaPage from '@/components/pages/GachaPage.jsx';
import StoryPage from '@/components/pages/StoryPage.jsx';
import CheckinModal from '@/components/pages/CheckinModal.jsx';
import TimerModal from '@/components/pages/TimerModal.jsx';
import ScannerModal from '@/components/pages/ScannerModal.jsx';
import ToastManager from '@/components/ui/ToastManager.jsx';
import HelpPage from '@/components/pages/HelpPage.jsx';

const FULLSCREEN_PAGES = ['story', 'avatar'];

// 安全區內縮後，各全螢幕頁面自己的底色──避免上下安全區留白的顏色
// 跟畫面本身背景不同，變成一條突兀色塊
// story 的頂部安全區已交由 StoryTopBar 內部自己處理[cite: 1]
const FULLSCREEN_BG = {
  avatar: 'var(--bg-panel, #f7e7ce)',
  story: 'var(--bg-hud, #2c1a0e)',
};

// ── 固定階層返回邏輯 ─────────────────────────────────────
// 不是「真實瀏覽紀錄」，是「這一頁規定好的上一層是誰」。
// ach 已經拿掉：現在只透過 TaskPage 內部分頁進入，不再是 GameLayout 的路由
const FIXED_PARENTS = {
  gacha: 'avatar',
};

function getRoot(mode) {
  return mode === 'basic' ? 'stats' : 'main';
}

function getParent(pageId, mode, shopGemsOrigin) {
  const root = getRoot(mode);
  // shop_gems 是唯一的例外：從哪一頁點鑽石開的，返回就回那一頁
  if (pageId === 'shop_gems') return shopGemsOrigin ?? root;
  return FIXED_PARENTS[pageId] ?? root;
}

function PageRouter({ pageId, onNavigate, onBack, canGoBack, onRegisterBack }) {
  switch (pageId) {
    case 'main': return <MainPage onNavigate={onNavigate} />;
    case 'task': return <TaskPage onRegisterBack={onRegisterBack} />;
    case 'stats': return <StatsPage />;
    case 'shop': return <ShopPage />;
    // ⚠️ HUD 點鑽石直接開購買 Modal 用，比照 'quick' 開任務表單的做法
    case 'shop_gems': return <ShopPage initialOpenGemShop />;
    case 'settings': return <SettingsPage />;
    case 'avatar': return <AvatarPage onNavigate={onNavigate} onBack={onBack} canGoBack={canGoBack} />;
    case 'story': return <StoryPage onNavigate={onNavigate} onBack={onBack} canGoBack={canGoBack} />;
    case 'gacha': return <GachaPage />;
    case 'checkin': return <CheckinModal onClose={onBack} />;
    case 'timer': return <TimerModal onClose={onBack} />;
    case 'scanner': return (
      <ScannerModal
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
    // 'quick' → 直接開啟任務新增（導到 task 頁）
    case 'quick': return <TaskPage initialOpenForm onRegisterBack={onRegisterBack} />;
    // 'profile' / 'qa' → 導到對應頁面
    case 'profile': return <StatsPage />;
    case 'qa': return <HelpPage onNavigate={onNavigate} />;
    default: return <Placeholder pageId={pageId} />;
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

export default function GameLayout() {
  const mode = useGameStore(s => s.settings?.mode ?? 'adventurer');
  const [page, setPage] = useState(() => getRoot(mode));

  const pageRef = useRef(page);
  pageRef.current = page;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const shopGemsOriginRef = useRef(getRoot(mode));
  const hasSentinelRef = useRef(false);

  // ── 頁面內部子畫面的「返回攔截」登記表 ──────────────────
  // 頁面自己有子畫面打開時（例如 AchPage 的榮譽殿堂、TaskPage 的
  // history/calendar 分頁），登記一個 handler 進來；沒有打開就登記 null。
  // 同時間可能有巢狀的兩層都登記著（TaskPage 的分頁 + 裡面 AchPage 的殿堂），
  // 用「最後一次被設成非 null 的時間」決定現在該由哪一層接手，
  // 天然對應巢狀關係最內層優先。
  const backHandlersRef = useRef(new Map()); // id -> { handler, order }
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

  // 回傳 true 表示已經被某個子畫面攔截處理掉了，呼叫端不用再做「跳上一層」
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

  const navigate = useCallback((pageId) => {
    if (modeRef.current === 'basic' && pageId === 'main') return;
    setPage(current => {
      if (current === pageId) return current;
      if (pageId === 'shop_gems') {
        shopGemsOriginRef.current = current;
      }
      return pageId;
    });
  }, []);

  const goBack = useCallback(() => {
    if (consumeBack()) return;
    if (pageRef.current === getRoot(modeRef.current)) return;
    window.history.back();
  }, [consumeBack]);

  useEffect(() => {
    window.history.replaceState({ questoryDepth: 1 }, '');
  }, []);

  // 維護「哨兵」history entry：離開 root 就推一筆，回到 root 就蓋掉
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

  // Android 實體返回鍵在能 goBack() 時、iOS 邊緣滑動手勢，
  // 都會消耗掉一筆 history entry，反映成這個 popstate 事件。
  useEffect(() => {
    const onPopState = () => {
      hasSentinelRef.current = false;
      if (consumeBack()) {
        // 子畫面被攔截處理掉了，頁面本身沒有離開──
        // 把剛剛被原生返回消耗掉的哨兵補回去，
        // 這樣「再按一次」還能繼續往上一層跳
        window.history.pushState({ questorySentinel: true }, '');
        hasSentinelRef.current = true;
        return;
      }
      setPage(current => getParent(current, modeRef.current, shopGemsOriginRef.current));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [consumeBack]);

  // 只有已經在 root、退無可退時，才會真的收到這個事件
  useEffect(() => {
    const exitPromptRef = { current: 0 };
    let handle;

    CapacitorApp.addListener('backButton', () => {
      if (consumeBack()) return;
      const root = getRoot(modeRef.current);
      if (pageRef.current !== root) {
        // 保險用：理論上不會走到這裡
        setPage(current => getParent(current, modeRef.current, shopGemsOriginRef.current));
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
      {!isFullscreen && (
        <HUD
          onAvatarClick={() => navigate('stats')}
          onGemClick={() => navigate('shop_gems')}
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
      {/* shop_gems 只是 shop 的變體（直接開鑽石 Modal），底部導覽列仍要顯示「商店」為選中 */}
      {!isFullscreen && <Navbar activePage={page === 'shop_gems' ? 'shop' : page} onNavigate={navigate} />}
      {/* Toast 通知層，全域顯示 */}
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
  placeholder: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '0 20px',
    boxSizing: 'border-box',
  },
};