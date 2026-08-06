import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { IosSwipeBackPlugin } from 'capacitor-swipe-back';
import { useGameStore, applyOfflineEnergyRecovery } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import App from '@/App.jsx';
import { StatsEngine } from '@/engines/stats.js';
import { ShopEngine } from '@/engines/shop.js';
import { CheckinEngine } from '@/engines/checkin.js';
import { TaskEngine } from '@/task/engines/task.js';
import { Audio } from '@/plugins/audio.js';
import { Notification } from '@/plugins/notification.js';
import { RewardEngine } from '@/engines/reward.js';
import { SettingsEngine } from '@/engines/settings.js';
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
    ShopEngine.init();
    CheckinEngine.init();
    TaskEngine.init();
    Audio.init();
    Notification.init();
    RewardEngine.init();
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

createRoot(document.getElementById('root')).render(<Root />);