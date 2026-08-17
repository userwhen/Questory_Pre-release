/* src/settings/engines/settings.js */
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

    return [unsubTheme, unsubBuy, unsubToggle, unsubApply, unsubCal, unsubExport, unsubImport, unsubReset];
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

    // 主題類：theme_story 用鑽石購買；theme_basic 系列 currency 是 'pro'
    // 初版裁切：訂閱系統已移除，這批主題先保留資料但不開放購買，等訂閱回歸再開放。
    if (item.type.startsWith('theme')) {
      if (item.currency === 'pro') {
        EventBus.emit(Events.System.TOAST, '🔒 此主題尚未開放');
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

};