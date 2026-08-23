// src/plugins/ads.js
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js'
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
// 廣告的預留接口，寫法比照 iap.js / subscription.js：mock 模式先讓整個
// 流程/UI 都能跑，之後真的裝了廣告 SDK，只需要把 _initLive() / _liveRewarded()
// 兩個方法內容補上，呼叫端（UI 元件）完全不用改。
export const Ads = {
  ADS_MODE: 'live', // 'mock' | 'live' —— 裝好廣告 SDK、填好正式版位 ID 後切成 'live'

  // 版位 ID 先放佔位字串，接 SDK（例如 AdMob）時換成正式的 Ad Unit ID。
  PLACEMENTS: {
    SHOP_BANNER: 'ca-app-pub-3940256099942544/6300978111',
    REWARDED_STAMINA: 'ca-app-pub-3940256099942544/5224354917',
    REWARDED_TIMER: 'ca-app-pub-3940256099942544/5224354917',
    REWARDED_CHECKIN: 'ca-app-pub-3940256099942544/5224354917',
    REWARDED_SHOP_DIAMONDS: 'ca-app-pub-3940256099942544/5224354917', // 商店 NPC 廣告入口，先跟其他 REWARDED_* 共用同一組 demo ID
  },

  _initialized: false,
  _bannerVisible: false,
  _rewardedInFlight: false,
  async init() {
    if (this._initialized) return;
    this._initialized = true;
    if (this.ADS_MODE === 'live') await this._initLive();
  },

  async _initLive() {
    if (typeof Capacitor === 'undefined') return;
    try {
      await AdMob.initialize();

      // UMP 同意流程：EEA/UK 等地區法規要求的使用者同意表單，
      // 套件會自動判斷當前使用者是否需要，不用自己寫地區判斷
      const consentInfo = await AdMob.requestConsentInfo();
      if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }

      // iOS 的 ATT 追蹤授權；在 Android 平台呼叫這個是無害的 no-op，不用另外判斷平台
      const trackingInfo = await AdMob.trackingAuthorizationStatus();
      if (trackingInfo.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }
    } catch (e) {
      console.warn('[Ads] live 模式初始化失敗，降級為模擬:', e);
      this.ADS_MODE = 'mock';
    }
  },

  // Pro（含試用）期間全站不顯示廣告，UI 元件應該優先用這個判斷要不要
  // 顯示廣告版位/按鈕，而不是等使用者點了才擋。
  shouldShowAds() {
    return true;
  },

  // 獎勵型廣告：使用者主動點擊觀看，看完才給獎勵。
  // 回傳 { completed: boolean }，呼叫端依 completed 決定要不要真的發獎勵。
  async showRewarded(placementId) {
    if (!this.shouldShowAds()) {
      // 防呆：理論上 Pro 玩家看不到廣告按鈕，萬一還是被呼叫到，直接視同看完。
      return { completed: true, skippedAsPro: true };
    }
    if (this._rewardedInFlight) {
      // 防連點：上一次的廣告流程還沒結束，這次呼叫直接擋掉，不重複觸發
      EventBus.emit(Events.System.TOAST, '⏳ 廣告準備中，請稍候');
      return { completed: false, busy: true };
    }
    this._rewardedInFlight = true;
    try {
      return this.ADS_MODE === 'mock' ? await this._mockRewarded(placementId) : await this._liveRewarded(placementId);
    } finally {
      this._rewardedInFlight = false;
    }
  },

  _mockRewarded(placementId) {
    EventBus.emit(Events.System.TOAST, '📺 （測試模式）模擬已看完廣告');
    return { completed: true, mock: true };
  },

  async _liveRewarded(placementId) {
    console.log('[診斷] _liveRewarded 開始，placementId=', placementId);
    let earned = false;
    let rewardedListener;
    try {
      rewardedListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        earned = true;
        console.log('[診斷] Rewarded 事件觸發');
      });
      console.log('[診斷] addListener 完成');
    } catch (e) {
      console.error('[診斷] addListener 本身丟出例外：', e);
      throw e;
    }

    try {
      await AdMob.prepareRewardVideoAd({ adId: placementId });
      console.log('[診斷] prepareRewardVideoAd 完成');
      await AdMob.showRewardVideoAd();
      console.log('[診斷] showRewardVideoAd 完成（廣告視窗已關閉）');
    } catch (e) {
      console.warn('[Ads] Rewarded 廣告播放失敗:', e);
    } finally {
      await rewardedListener.remove();
      console.log('[診斷] listener.remove 完成，earned=', earned);
    }

    return { completed: earned };
  },
  async showBanner(placementId, marginTop = 0) {
    if (typeof Capacitor === 'undefined' || this.ADS_MODE !== 'live') return;
    try {
      await AdMob.showBanner({
        adId: placementId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        margin: Math.round(marginTop),
      });
      this._bannerVisible = true;
    } catch (e) {
      console.warn('[Ads] 顯示橫幅廣告失敗:', e);
    }
  },

  async hideBanner() {
    if (!this._bannerVisible) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      console.warn('[Ads] 隱藏橫幅廣告失敗:', e);
    } finally {
      this._bannerVisible = false;
    }
  },
};
