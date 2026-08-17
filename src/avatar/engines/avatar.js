/* src/engines/avatar.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { AvatarShop, checkAttrGate } from '@/avatar/data/avatar_config.js';
import { previewCosmetic, clearCosmeticPreview, equipCosmetic, buyCosmetic, checkMilestones } from '@/avatar/engines/portrait.js';

export const AvatarEngine = {

  // ─── 初始化 ─────────────────────────────────────────
  init: makeIdempotentInit(function () {
    setState(s => {
      const avatar = s.avatar ?? { unlocked: [], wearing: {}, gender: 'm' };

      const unlocked = avatar.unlocked.includes('outfit_01')
        ? avatar.unlocked
        : [...avatar.unlocked, 'outfit_01'];

      return {
        avatar: { ...avatar, unlocked },
        activePets: s.activePets ?? [],
      };
    });
    EventBus.emit(Events.Avatar.UPDATED);

    const unsubPreview = EventBus.on(Events.Avatar.REQUEST_PREVIEW_ITEM, ({ itemId, type }) => {
      this.previewItem(itemId, type);
    });
    const unsubClearPreview = EventBus.on(Events.Avatar.REQUEST_CLEAR_PREVIEW, () => {
      this.clearPreview();
    });
    const unsubWear = EventBus.on(Events.Avatar.REQUEST_WEAR_ITEM, ({ id, type }) => {
      this.wearItem(id, type);
    });
    const unsubBuy = EventBus.on(Events.Avatar.REQUEST_BUY_ITEM, ({ id, requestId }) => {
      const result = this.buyItem(id);
      EventBus.emit(Events.Avatar.BUY_ITEM_RESULT, { ...result, requestId });
    });

     // ── 頭像／頭像框：完全轉呼叫 portrait.js，這裡只負責事件註冊，不碰任何內部邏輯 ──
    //    之後要拆成獨立 Engine，搬走這幾行監聽器就好，portrait.js 完全不用改。
    const unsubCosmeticPreview = EventBus.on(Events.Avatar.REQUEST_PREVIEW_COSMETIC, ({ kind, itemId }) => {
      previewCosmetic(kind, itemId);
    });
    const unsubCosmeticClearPreview = EventBus.on(Events.Avatar.REQUEST_CLEAR_COSMETIC_PREVIEW, ({ kind }) => {
      clearCosmeticPreview(kind);
    });
    const unsubCosmeticEquip = EventBus.on(Events.Avatar.REQUEST_EQUIP_COSMETIC, ({ kind, id }) => {
      equipCosmetic(kind, id);
    });
    const unsubCosmeticBuy = EventBus.on(Events.Avatar.REQUEST_BUY_COSMETIC, ({ kind, id, requestId }) => {
      const result = buyCosmetic(kind, id);
      EventBus.emit(Events.Avatar.BUY_COSMETIC_RESULT, { ...result, requestId });
    });
    const unsubCosmeticLevelUp = EventBus.on(Events.Stats.LEVEL_UP, () => {
      checkMilestones();
    });
    const unsubCosmeticDailyReset = EventBus.on(Events.System.DAILY_RESET, () => {
      checkMilestones();
    });

    // 立即補跑一次：確保「功能上線前就已經達標」的老玩家馬上拿到，不用等下一次升級/換日才觸發
    checkMilestones();

    return [
      unsubPreview, unsubClearPreview, unsubWear, unsubBuy,
      unsubCosmeticPreview, unsubCosmeticClearPreview, unsubCosmeticEquip, unsubCosmeticBuy,
      unsubCosmeticLevelUp, unsubCosmeticDailyReset,
    ];
  }),

  // ─── 預覽（只寫 previewWearing，不存檔）─────────────
  previewItem(itemId, category) {
    if (!category) {
      const item = AvatarShop.find(i => i.id === itemId);
      category = item?.type ?? 'suit';
    }

    const s = getState();
    const previewWearing = { ...(s.previewWearing ?? s.avatar?.wearing ?? {}) };
    // 與 wearItem 一致：整片 bg 與牆/地互斥
    if (category === 'bg') {
      delete previewWearing.wall_bg;
      delete previewWearing.floor_bg;
    } else if (category === 'wall_bg' || category === 'floor_bg') {
      delete previewWearing.bg;
    }
    previewWearing[category] = itemId;
    setState(() => ({ previewWearing }));
    EventBus.emit(Events.Avatar.UPDATED);
  },

  // ─── 穿上 / 卸下 ────────────────────────────────────
  wearItem(itemId, category) {
    if (!category) {
      const item = AvatarShop.find(i => i.id === itemId);
      category = item?.type ?? 'suit';
    }

    // 寵物：轉發給 PetEngine，不在此處理。
    // 初版裁切：Avatar 頁面的寵物/陪伴分頁入口已隱藏，這個分支現在沒有
    // 任何 UI 路徑會觸發到；PetEngine 也沒有 init，EventBus 上這個事件
    // 沒有監聽者，emit 出去等同無操作，不會報錯。刻意留著不刪：
    // 之後要把寵物系統接回來時，這裡完全不用改。
    if (category === 'pet') {
      EventBus.emit(Events.Pet.REQUEST_WEAR_ITEM, { itemId });
      return;
    }

    const unlocked = getState().avatar?.unlocked ?? [];
    if (!unlocked.includes(itemId)) {
      EventBus.emit(Events.System.TOAST, '🔒 尚未解鎖這件物品');
      return;
    }

    setState(s => {
      const wearing = { ...(s.avatar?.wearing ?? {}) };

      // 卸下
      if (wearing[category] === itemId) {
        if (category === 'body') {
          EventBus.emit(Events.System.TOAST, '🛡️ 素體無法卸下');
          return {};
        }
        delete wearing[category];
        EventBus.emit(Events.System.TOAST, '✨ 已取消裝備');
        return { avatar: { ...s.avatar, wearing }, previewWearing: null };
      }

      // 穿上 — 互斥
      const partialConflicts = [
        'top', 'bottom', 'hair_front', 'hair_back', 'hair_combo', 'accessory', 'body',
      ];

      if (category === 'suit' || category === 'special_pose') {
        partialConflicts.forEach(c => delete wearing[c]);
      } else if (partialConflicts.includes(category)) {
        delete wearing.suit;
        delete wearing.special_pose;
      }

      if (category === 'hair_combo') {
        delete wearing.hair_front;
        delete wearing.hair_back;
      } else if (category === 'hair_front' || category === 'hair_back') {
        delete wearing.hair_combo;
      }

      // 整片背景 vs 牆/地：互斥，避免疊兩套背景邏輯
      if (category === 'bg') {
        delete wearing.wall_bg;
        delete wearing.floor_bg;
      } else if (category === 'wall_bg' || category === 'floor_bg') {
        delete wearing.bg;
      }

      wearing[category] = itemId;

      EventBus.emit(Events.System.TOAST, '✨ 已更換裝備');
      return { avatar: { ...s.avatar, wearing }, previewWearing: null };
    });

    EventBus.emit(Events.Avatar.UPDATED);
  },

  // ─── 購買 ────────────────────────────────────────────
  buyItem(itemId) {
    const s = getState();
    const unlocked = s.avatar?.unlocked ?? [];

    if (unlocked.includes(itemId)) return { success: false, msg: '這件已經擁有了' };

    const item = AvatarShop.find(i => i.id === itemId);
    if (!item) return { success: false, msg: '找不到這件商品' };

    // 屬性門檻（額外條件；鑽石夠仍可能被擋）
    const gate = checkAttrGate(item, s.attrs);
    if (!gate.ok) {
      return { success: false, msg: gate.msg || '屬性不足' };
    }

    const totalGem = (s.freeGem ?? 0) + (s.paidGem ?? 0);

    if (item.price > 0 && totalGem < item.price) {
      return { success: false, msg: `💎 鑽石不足（需 ${item.price}）` };
    }

    setState(s => {
      const newUnlocked = [...(s.avatar?.unlocked ?? []), itemId];
      let freeGem = s.freeGem ?? 0;
      let paidGem = s.paidGem ?? 0;

      if (item.price > 0) {
        let cost = item.price;
        const freeDeduct = Math.min(cost, freeGem);
        freeGem -= freeDeduct;
        cost -= freeDeduct;
        paidGem = Math.max(0, paidGem - cost);
      }

      return {
        freeGem,
        paidGem,
        avatar: { ...s.avatar, unlocked: newUnlocked },
      };
    });

    this._checkSetRewards();
    return { success: true };
  },

  // ─── 套裝集齊掃描 ────────────────────────────────────
  _checkSetRewards() {
    const s = getState();
    const unlocked = s.avatar?.unlocked ?? [];

    const newItems = AvatarShop.filter(item =>
      item.requires?.length > 0 &&
      !unlocked.includes(item.id) &&
      item.requires.every(reqId => unlocked.includes(reqId))
    );

    if (newItems.length === 0) return;

    setState(s => ({
      avatar: {
        ...s.avatar,
        unlocked: [
          ...(s.avatar?.unlocked ?? []),
          ...newItems.map(i => i.id),
        ],
      },
    }));

    newItems.forEach(item => {
      EventBus.emit(Events.System.TOAST, `✨ 恭喜集齊套裝！已解鎖：【${item.name}】`);
    });

    EventBus.emit(Events.Avatar.UPDATED);
  },

  // ─── 取得渲染用穿著資料 ──────────────────────────────
  getDisplayWearing() {
    const s = getState();
    return s.previewWearing ?? s.avatar?.wearing ?? {};
  },

  // ─── 清除預覽 ────────────────────────────────────────
  clearPreview() {
    setState(() => ({ previewWearing: null }));
  },
};