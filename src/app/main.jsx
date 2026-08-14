import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { IosSwipeBackPlugin } from 'capacitor-swipe-back';
import { useGameStore, applyOfflineEnergyRecovery } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import App from '@/app/App.jsx';
import ErrorBoundary from '@/ui/ErrorBoundary.jsx';
import { StatsEngine } from '@/stats/engines/stats.js';
import { AchEngine } from '@/ach/engines/ach.js';
import { ShopEngine } from '@/shop/engines/shop.js';
import { TaskEngine } from '@/task/engines/task.js';
import { Audio } from '@/plugins/audio.js';
import { Notification } from '@/plugins/notification.js';
import { IAP } from '@/plugins/iap.js';
import { Ads } from '@/plugins/ads.js';
import { RewardEngine } from '@/reward/engines/reward.js';
import { AvatarEngine } from '@/avatar/engines/avatar.js';
import { SettingsEngine } from '@/settings/engines/settings.js';

// 初版裁切：不 init 的引擎（保留檔案，之後要開回來只要把 import + init 加回來）
//   StoryBridge / narrativeEngine  — Story 全系統
//   CheckinEngine                  — 簽到
//   WidgetSyncEngine                — 小工具同步
//   ChallengeEngine                 — 陪伴者挑戰
//   PetEngine                       — 寵物（含 Avatar 寵物/陪伴分頁的購買/裝備事件，
//                                      入口已在 AvatarPage.jsx 隱藏，不會有人發出這個事件）
// AchEngine 保留（成就系統維持運作，task.js 的 achLink 連結功能仍然有效）

// 初始化 iOS 滑動返回插件
IosSwipeBackPlugin.enable();

function Root() {
  const migrateData = useGameStore(s => s.migrateData);
  const checkDailyReset = useGameStore(s => s.checkDailyReset);

  useEffect(() => {
    // 1. 資料遷移（最先執行，確保 store 欄位完整）
    migrateData();

    // 1.5 離線精力補算：處理「App 關閉期間」累積的離線時長。
    //     必須放在 migrateData() 之後，確保 lastEnergyTick 欄位已經補齊。
    //     App 從背景切回前景的情況，已經在 state.js 內掛了 Capacitor
    //     appStateChange 監聽，這裡只需要處理「開機當下」這一次。
    applyOfflineEnergyRecovery();

    // 2. 初始化各引擎（掛 EventBus listeners）
    //     必須在 checkDailyReset() 之前，避免 DAILY_RESET 在監聽掛上前就被觸發而漏接
    StatsEngine.init();
    AchEngine.init();
    ShopEngine.init();
    TaskEngine.init();
    Audio.init();
    Notification.init();
    IAP.init(); // 之前漏掉這行：沒呼叫 init() 會導致 _liveProducts 永遠是 null，
                // 使得每次購買都不論 IAP_MODE 設定、一律走 _mockPurchase() 免費贈送。
    Ads.init();
    RewardEngine.init();
    AvatarEngine.init();
    SettingsEngine.init();

    // 3. 每日重置時同步觸發各引擎
    //    ⚠️ 修正：此監聽務必在 checkDailyReset() 之前註冊。
    //    checkDailyReset() 若判定跨日會「同步」emit DAILY_RESET，
    //    若監聽是在它之後才掛上，剛好跨日的那一次 ShopEngine.performDailyReset()
    //    保證不會被呼叫到（商店每日重置庫存永遠不會重置），
    //    且因為只有跨日瞬間才會出錯，重開 App 不會馬上看到差異，非常不容易發現。
    const unsubReset = EventBus.on(Events.System.DAILY_RESET, () => {
      ShopEngine.performDailyReset();
    });

    // 4. 每日重置檢查（更新 loginStreak / totalLoginDays，可能觸發 DAILY_RESET）
    checkDailyReset();

    EventBus.emit(Events.System.INIT);

    return () => {
      unsubReset();
    };
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>
);
