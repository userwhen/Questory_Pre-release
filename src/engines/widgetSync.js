/* src/engines/widgetSync.js */
import { getState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { sortTasks } from '@/utils/taskSort.js';
import { WidgetBridge } from '@/plugins/widgetBridge.js';

const MAX_WIDGET_TASKS = 5;

export const WidgetSyncEngine = {
  init: makeIdempotentInit(function () {
    // 任務／寵物任何會影響小工具顯示的異動，重推一次快照
    const events = [
      Events.Task.CREATED, Events.Task.UPDATED, Events.Task.COMPLETED,
      Events.Task.UNCOMPLETED, Events.Task.DELETED,
      Events.Pet.UPDATED, Events.System.DAILY_RESET,
    ];
    const unsubs = events.map(ev => EventBus.on(ev, () => this.pushSnapshot()));

    // App 啟動先重放一次待處理佇列（使用者在小工具打勾但 App 沒開時累積的），再推最新快照
    this.drainPendingActions();

    // App 從背景回前景時比照辦理（跟 core/state.js 的 appStateChange 同一套機制，避免重裝套件）
    let removeResumeListener = null;
    import('@capacitor/app')
      .then(({ App: CapacitorApp }) => {
        const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) this.drainPendingActions();
        });
        removeResumeListener = () => handle.remove?.();
      })
      .catch(() => { });

    return [...unsubs, () => removeResumeListener?.()];
  }),

  buildSnapshot() {
    const s = getState();
    const tasks = sortTasks(s.tasks, null)
      .filter(t => !t.done)
      .slice(0, MAX_WIDGET_TASKS)
      .map(t => ({ id: t.id, title: t.title, cat: t.cat, pinned: !!t.pinned }));

    const toPetSnapshot = (p) => ({
      hasPet: true,
      id: p.id,
      name: p.name,
      mood: Math.round(p.mood ?? 0),
      food: Math.round(p.food ?? 0),
      level: p.level ?? 1,
      isSick: !!p.isSick,
      isPregnant: !!p.isPregnant,
      pendingExplore: !!p.pendingExplore,
    });

    const activePets = s.activePets || [];
    const p0 = activePets[0] || null;
    const pet = p0 ? toPetSnapshot(p0) : { hasPet: false }; // 沿用給合併版 TaskWidgetProvider，格式不變
    const pets = activePets.slice(0, 3).map(toPetSnapshot);  // 給新的純寵物小工具用

    return { tasks, pet, pets };
  },

  async pushSnapshot() {
    if (typeof Capacitor === 'undefined') return; // 純網頁開發環境沒有原生橋接
    try {
      await WidgetBridge.pushSnapshot(this.buildSnapshot());
    } catch (e) { console.warn('[WidgetSync] pushSnapshot 失敗', e); }
  },

  // 讀取小工具累積的打勾佇列，透過既有 REQUEST_RESOLVE 重放——跟 App 內點擊打勾同一條路徑
  async drainPendingActions() {
    if (typeof Capacitor === 'undefined') return;
    try {
      const { ids } = await WidgetBridge.getPendingActions();
      (ids || []).forEach(id => EventBus.emit(Events.Task.REQUEST_RESOLVE, { id }));
      if ((ids || []).length > 0) await WidgetBridge.clearPendingActions();
    } catch (e) {
      console.warn('[WidgetSync] drainPendingActions 失敗', e);
    } finally {
      this.pushSnapshot();
    }
  },
};