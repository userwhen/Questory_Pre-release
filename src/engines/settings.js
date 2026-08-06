/* src/engines/settings.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { SettingsShopItems } from '@/data/theme_config.js';
import { GameConfig } from '@/data/data.js';

export const SettingsEngine = {

  // ─── 初始化（main.jsx 啟動時呼叫）──────────────────
  init: makeIdempotentInit(function () {
    // SettingsPage.jsx 透過這些事件呼叫，不再直接 import SettingsEngine
    const unsubTheme  = EventBus.on(Events.Settings.REQUEST_APPLY_THEME,     ({ themeKey }) => this.applyTheme(themeKey));
    const unsubBuy    = EventBus.on(Events.Settings.REQUEST_BUY_ITEM,        ({ id }) => this.buyItem(id));
    const unsubToggle = EventBus.on(Events.Settings.REQUEST_TOGGLE_MODULE,   ({ id }) => this.toggleModule(id));
    const unsubApply  = EventBus.on(Events.Settings.REQUEST_APPLY_SETTINGS, (patch) => this.applySettings(patch));
    const unsubCal    = EventBus.on(Events.Settings.REQUEST_SAVE_CAL_TARGET, ({ value }) => this.saveCalTarget(value));
    const unsubExport = EventBus.on(Events.Settings.REQUEST_EXPORT_SAVE,    () => this.exportSave());
    const unsubImport = EventBus.on(Events.Settings.REQUEST_IMPORT_SAVE,    ({ file }) => this.importSave(file));
    const unsubReset  = EventBus.on(Events.Settings.REQUEST_PERFORM_RESET,  () => this.performReset());
    const unsubMockSub = EventBus.on(Events.Settings.REQUEST_TOGGLE_MOCK_SUB, () => this.toggleMockSubscription());
    const unsubProUpsell = EventBus.on(Events.Settings.REQUEST_SHOW_PRO_UPSELL, ({ label }) => this.showProUpsell(label));

    return [unsubTheme, unsubBuy, unsubToggle, unsubApply, unsubCal, unsubExport, unsubImport, unsubReset, unsubMockSub, unsubProUpsell];
  }),

  // ─── 主題套用 ─────────────────────────────────────────────
  applyTheme(themeKey) {
    setState(s => ({
      settings: { ...(s.settings || {}), theme: themeKey || 'default' },
    }));

    // 套用 body class（CSS 主題變數）
    document.body.className = themeKey && themeKey !== 'default' ? `theme-${themeKey}` : '';

    EventBus.emit(Events.Settings.UPDATED);
    EventBus.emit(Events.System.TOAST, `🎨 已套用主題`);
  },

  // ─── 設定變更 ─────────────────────────────────────────────
  applySettings(patch) {
    setState(s => ({
      settings: { ...(s.settings || {}), ...patch },
    }));
    // 字體大小：先套在根節點，若專案 CSS 是用 rem 級聯字體大小就直接生效；
    // 之後看到全域 CSS 慣例不同，再回來調整這裡即可
    if (patch.fontSize) {
      document.documentElement.style.fontSize = patch.fontSize;
    }
    EventBus.emit(Events.Settings.UPDATED);
  },

  // ─── 卡路里目標 ───────────────────────────────────────────
saveCalTarget(val) {
    const num = parseInt(val);
    if (!num || num < 100) {
      EventBus.emit(Events.System.TOAST, '❌ 請輸入至少 100 的數字');
      return;
    }
    setState(s => ({
      settings: { ...(s.settings || {}), calMode: true, calMax: num },
      unlocks: { ...(s.unlocks || {}), feature_cal: true },
    }));
    EventBus.emit(Events.Settings.UPDATED);
    EventBus.emit(Events.Stats.UPDATED);
    EventBus.emit(Events.System.TOAST, `✅ 目標已更新：${num} Kcal`);
  },

  // ─── 購買主題 / 模組 ──────────────────────────────────────
  buyItem(itemId) {
    const s = getState();
    const item = SettingsShopItems.find(i => i.id === itemId);
    if (!item) return;

    // 主題類：theme_story 用鑽石購買；theme_basic 系列 currency 是 'pro'，改成看訂閱狀態
    if (item.type.startsWith('theme')) {
      if (item.currency === 'pro') {
        if (!s.subscription?.active) {
          EventBus.emit(Events.System.TOAST, '👑 需要訂閱 Pro 才能使用此主題');
          return;
        }
        // Pro 訂閱期間直接套用；不寫入 unlocks，訂閱到期後會自動再次鎖定
        const themeKey = item.preview || item.id.replace('theme_', '').replace('basic_', 'basic-');
        this.applyTheme(themeKey);
        return;
      }
      if (item.price > 0) {
        const totalGem = (s.freeGem || 0) + (s.paidGem || 0);
        if (totalGem < item.price) {
          EventBus.emit(Events.System.TOAST, '❌ 鑽石不足');
          return;
        }
        setState(st => {
          const unlocks = { ...(st.unlocks || {}), [itemId]: true };
          let freeGem = st.freeGem || 0;
          let paidGem = st.paidGem || 0;
          if (freeGem >= item.price) {
            freeGem -= item.price;
          } else {
            paidGem -= item.price - freeGem;
            freeGem = 0;
          }
          return { unlocks, freeGem, paidGem };
        });
        EventBus.emit(Events.System.TOAST, `🎉 已解鎖 ${item.name}`);
      }
      const themeKey = item.preview || item.id.replace('theme_', '').replace('basic_', 'basic-');
      this.applyTheme(themeKey);
      return;
    }

    // 模組類
    const totalGem = (s.freeGem || 0) + (s.paidGem || 0);
    if (totalGem < item.price) {
      EventBus.emit(Events.System.TOAST, '❌ 鑽石不足');
      return;
    }
    setState(st => {
      const unlocks = { ...(st.unlocks || {}), [itemId]: true };
      const settings = { ...(st.settings || {}), [itemId + '_active']: true };
      let freeGem = st.freeGem || 0;
      let paidGem = st.paidGem || 0;
      if (freeGem >= item.price) {
        freeGem -= item.price;
      } else {
        paidGem -= item.price - freeGem;
        freeGem = 0;
      }
      return { unlocks, settings, freeGem, paidGem };
    });
    EventBus.emit(Events.Settings.UPDATED);
    EventBus.emit(Events.System.TOAST, `🎉 已解鎖 ${item.name}`);
  },

  // ─── 模組開關 ─────────────────────────────────────────────
  toggleModule(itemId) {
    setState(s => {
      const current = s.settings?.[itemId + '_active'] !== false;
      return { settings: { ...(s.settings || {}), [itemId + '_active']: !current } };
    });
    EventBus.emit(Events.Settings.UPDATED);
  },

  // ─── 存檔管理 ─────────────────────────────────────────────
  async exportSave() {
    const s = getState();
    const json = JSON.stringify(s, null, 2);
    const fileName = `Questory_Backup_${new Date().toISOString().split('T')[0]}.json`;

    // Capacitor 原生環境：寫進 CACHE 目錄，再用系統分享面板讓玩家選擇儲存位置
    // （純網頁環境 Capacitor 是 undefined，會直接跳過走下面的瀏覽器下載）
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins?.Filesystem && Capacitor.Plugins?.Share) {
      try {
        const { Filesystem, Share } = Capacitor.Plugins;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: 'CACHE',
          encoding: 'utf8',
        });
        await Share.share({
          title: '匯出 Questory 存檔',
          url: result.uri, // content:// URI
        });
        EventBus.emit(Events.System.TOAST, '📤 存檔已匯出');
        return;
      } catch (e) {
        console.warn('[Settings] Capacitor 匯出失敗，改用網頁下載:', e);
        // 失敗就往下走網頁備援路徑，不直接讓玩家卡住
      }
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    EventBus.emit(Events.System.TOAST, '📤 存檔已匯出');
  },

  importSave(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && typeof data.lv !== 'undefined') {
          setState(() => data);
          EventBus.emit(Events.System.TOAST, '✅ 存檔已讀取，重新整理中...');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          EventBus.emit(Events.System.TOAST, '❌ 檔案格式錯誤');
        }
      } catch {
        EventBus.emit(Events.System.TOAST, '❌ 檔案損毀無法讀取');
      }
    };
    reader.readAsText(file);
  },

  performReset() {
    const saveKey = GameConfig?.System?.SaveKey ?? 'questory_save_v1';
    localStorage.removeItem(saveKey);
    window.location.reload();
  },

  // ─── 測試訂閱（TODO：串接真正 IAP 後，這裡應改成付款成功才呼叫，不能再讓 UI 直接觸發切換）─────
  // 關閉訂閱前，先算出「只靠 isPro bypass、沒有另外买断」會被一併鎖住的功能：
  // 卡路里/嚴格模式目前沒有买断管道（之後由新手任務/成就系統贈送 unlocks），
  // 寵物/學習模組已經有鑽石买断選項——不管哪一種，只要 unlocks 裡沒有對應
  // key，這次關閉訂閱就會讓它鎖回去，要列進提醒清單。
  // 寵物額外處理：牠是唯一有「當前活著資料」的功能，鎖住的同時要清空當前
  // 寵物（範圍同手動關閉，見 pet.js 的 _wipeCurrentPets）；其餘三個純粹是
  // UI 鎖住，之後恢復訂閱或买断，設定值直接接續，不需要清任何資料。
  toggleMockSubscription() {
    const s = getState();
    const next = !(s.subscription?.active);

    if (!next) {
      const unlocks = s.unlocks || {};
      const FEATURE_LABELS = {
        feature_cal: '🔥 卡路里追蹤',
        feature_strict: '⚡ 嚴格模式',
        module_pet: '🐾 寵物陪伴系統',
        learning: '📚 語言學習模組',
      };
      const lost = Object.entries(FEATURE_LABELS)
        .filter(([key]) => !unlocks[key])
        .map(([, label]) => label);

      if (!unlocks.module_pet) {
        EventBus.emit(Events.Pet.REQUEST_WIPE_CURRENT);
      }
      if (lost.length > 0) {
        EventBus.emit(Events.Settings.SUBSCRIPTION_FEATURES_LOST, { features: lost });
      }
    }

    setState(st => ({
      subscription: {
        ...(st.subscription || {}),
        active: next,
        mock: true,
        sku: next ? 'mock_pro' : null,
        startedAt: next ? Date.now() : (st.subscription?.startedAt ?? null),
      },
    }));
    EventBus.emit(Events.Settings.UPDATED);
    EventBus.emit(Events.System.TOAST, next ? '🧪 測試訂閱已開啟（Pro 功能已解鎖）' : '測試訂閱已關閉');
  },

  // ─── 鎖定功能列的 Pro 按鈕。目前先跳 Toast；之後想做②的「Pro 介紹頁」時，
  //     只要把這個方法內部換成打開 Modal，呼叫端（SettingsPage）完全不用動 ──
  showProUpsell(label) {
    EventBus.emit(Events.System.TOAST, `👑 需訂閱 Pro 才能解鎖「${label}」`);
  },
};