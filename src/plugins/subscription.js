import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { Audio } from './audio.js';

export const Sub = {
  SUB_MODE:       'mock',
  SKU_MONTHLY:    'sub_pro_monthly',
  SKU_YEARLY:     'sub_pro_yearly',
  FREE_TASK_LIMIT: 20,
  FREE_CAT_LIMIT:  3,
  TRIAL_DAYS:      7,

  isPro() {
    const sub = useGameStore.getState().subscription;
    if (!sub) return false;
    if (sub.mock) return true;
    if (!sub.active || !sub.expiresAt) return false;
    return Date.now() < sub.expiresAt;
  },

  isInTrial() {
    const sub = useGameStore.getState().subscription;
    if (!sub?.trialStart || sub.active === false) return false;
    return (Date.now() - sub.trialStart) < this.TRIAL_DAYS * 86400000;
  },

  isProOrTrial() { return this.isPro() || this.isInTrial(); },

  canAddTask() {
    if (this.isProOrTrial()) return { ok: true };
    const count = (useGameStore.getState().tasks || []).filter(t => !t.done).length;
    return count < this.FREE_TASK_LIMIT ? { ok: true } : { ok: false, reason: `免費版上限 ${this.FREE_TASK_LIMIT} 個任務` };
  },

  canAddCategory() {
    if (this.isProOrTrial()) return { ok: true };
    const cats = (useGameStore.getState().taskCats || []).length;
    return cats < this.FREE_CAT_LIMIT ? { ok: true } : { ok: false, reason: `免費版上限 ${this.FREE_CAT_LIMIT} 個分類` };
  },

  canUseFocusLock() { return this.isProOrTrial() ? { ok: true } : { ok: false, reason: 'Focus Lock 為 Pro 功能' }; },
  canUseCalendar()  { return this.isProOrTrial() ? { ok: true } : { ok: false, reason: '行事曆同步為 Pro 功能' }; },
  canUseScanner()   { return this.isProOrTrial() ? { ok: true } : { ok: false, reason: '條碼掃描為 Pro 功能' }; },
  canUseTheme()     { return this.isProOrTrial() ? { ok: true } : { ok: false, reason: '自訂主題為 Pro 功能' }; },

  startTrial() {
    const s = useGameStore.getState().subscription ?? {};
    if (s.trialUsed) { EventBus.emit(Events.System.TOAST, '⚠️ 試用期已使用過'); return false; }
    useGameStore.setState({
      subscription: { ...s, trialStart: Date.now(), trialUsed: true, active: true },
    });
    EventBus.emit(Events.System.TOAST, `🎉 ${this.TRIAL_DAYS} 天免費試用已開始！`);
    Audio.play('achievement');
    return true;
  },

  async subscribe(sku) {
    return this.SUB_MODE === 'mock' ? this._mockSubscribe(sku) : this._liveSubscribe(sku);
  },

  _mockSubscribe(sku) {
    const isYearly = sku === this.SKU_YEARLY;
    useGameStore.setState({
      subscription: {
        mock: true, active: true, sku,
        expiresAt: Date.now() + (isYearly ? 365 : 30) * 86400000,
        startedAt: Date.now(),
      },
    });
    EventBus.emit(Events.System.TOAST, `✅ ${isYearly ? 'Pro 年訂閱' : 'Pro 月訂閱'} 已啟用！（測試模式）`);
    Audio.play('achievement');
    return { success: true, mock: true };
  },

  async _liveSubscribe(sku) {
    console.warn('[Sub] live 模式但插件未安裝，降級為模擬');
    return this._mockSubscribe(sku);
  },

  cancelSubscription() {
    EventBus.emit(Events.System.TOAST, '請在 Google Play 管理訂閱頁面取消');
  },

  async restoreSubscription() {
    if (this.SUB_MODE === 'mock') EventBus.emit(Events.System.TOAST, 'ℹ️ 測試模式不支援恢復訂閱');
  },

  expiryLabel() {
    const sub = useGameStore.getState().subscription;
    if (!sub?.expiresAt) return '';
    const d = new Date(sub.expiresAt);
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
  },

  showUpgradePrompt(reason) {
    EventBus.emit(Events.System.TOAST, `🔒 ${reason || 'Pro 功能'} — 請升級 Pro`);
  },
};