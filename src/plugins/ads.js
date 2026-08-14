// src/plugins/ads.js
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { Sub } from '@/plugins/subscription.js';

// 廣告的預留接口，寫法比照 iap.js / subscription.js：mock 模式先讓整個
// 流程/UI 都能跑，之後真的裝了廣告 SDK，只需要把 _initLive() / _liveRewarded()
// 兩個方法內容補上，呼叫端（UI 元件）完全不用改。
export const Ads = {
  ADS_MODE: 'mock', // 'mock' | 'live' —— 裝好廣告 SDK、填好正式版位 ID 後切成 'live'

  // 版位 ID 先放佔位字串，接 SDK（例如 AdMob）時換成正式的 Ad Unit ID。
  PLACEMENTS: {
    SHOP_BANNER:      'placeholder_shop_banner',
    REWARDED_STAMINA:  'placeholder_rewarded_stamina',
    REWARDED_TIMER:    'placeholder_rewarded_timer',
    REWARDED_CHECKIN:  'placeholder_rewarded_checkin',
  },

  _initialized: false,

  async init() {
    if (this._initialized) return;
    this._initialized = true;
    if (this.ADS_MODE === 'live') await this._initLive();
  },

  async _initLive() {
    if (typeof Capacitor === 'undefined') return;
    try {
      // TODO(接廣告 SDK 時補上)：例如 AdMob 的 Capacitor plugin
      // await AdMob.initialize({ requestTrackingAuthorization: true, ... });
      // 同時記得依 Play 政策，對 EEA/UK/加州使用者跑一次 UMP 同意流程。
    } catch (e) {
      console.warn('[Ads] live 模式初始化失敗，降級為模擬:', e);
      this.ADS_MODE = 'mock';
    }
  },

  // Pro（含試用）期間全站不顯示廣告，UI 元件應該優先用這個判斷要不要
  // 顯示廣告版位/按鈕，而不是等使用者點了才擋。
  shouldShowAds() {
    return Sub.shouldShowAds();
  },

  // 獎勵型廣告：使用者主動點擊觀看，看完才給獎勵。
  // 回傳 { completed: boolean }，呼叫端依 completed 決定要不要真的發獎勵。
  async showRewarded(placementId) {
    if (!this.shouldShowAds()) {
      // 防呆：理論上 Pro 玩家看不到廣告按鈕，萬一還是被呼叫到，直接視同看完。
      return { completed: true, skippedAsPro: true };
    }
    return this.ADS_MODE === 'mock' ? this._mockRewarded(placementId) : this._liveRewarded(placementId);
  },

  _mockRewarded(placementId) {
    EventBus.emit(Events.System.TOAST, '📺 （測試模式）模擬已看完廣告');
    return { completed: true, mock: true };
  },

  async _liveRewarded(placementId) {
    // TODO(接廣告 SDK 時補上)：播放真的 rewarded ad，await 使用者實際看完
    console.warn('[Ads] live 模式但插件未安裝，降級為模擬');
    return this._mockRewarded(placementId);
  },
};
