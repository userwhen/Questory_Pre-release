/* src/engines/avatar.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { AvatarShop, GachaPool, GachaConfig } from '@/avatar/data/avatar_config.js';

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

    const unsubGacha = EventBus.on(Events.Avatar.REQUEST_GACHA, ({ times, requestId }) => {
      const results = this.executeGacha(times);
      EventBus.emit(Events.Avatar.GACHA_RESULT, { results, requestId });
    });
    const unsubCraft = EventBus.on(Events.Avatar.REQUEST_CRAFT_TICKET, () => {
      this.craftGachaTicket();
    });
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

    return [unsubGacha, unsubCraft, unsubPreview, unsubClearPreview, unsubWear, unsubBuy];
  }),

  // ─── 預覽（只寫 previewWearing，不存檔）─────────────
  previewItem(itemId, category) {
    if (!category) {
      const item = [...AvatarShop, ...GachaPool].find(i => i.id === itemId);
      category = item?.type ?? 'suit';
    }

    const s = getState();
    const previewWearing = { ...(s.previewWearing ?? s.avatar?.wearing ?? {}) };
    previewWearing[category] = itemId;
    setState(() => ({ previewWearing }));
    EventBus.emit(Events.Avatar.UPDATED);
  },

  // ─── 穿上 / 卸下 ────────────────────────────────────
  wearItem(itemId, category) {
    if (!category) {
      const item = [...AvatarShop, ...GachaPool].find(i => i.id === itemId);
      category = item?.type ?? 'suit';
    }

    // 寵物：轉發給 PetEngine，不在此處理
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

  // ─── 扭蛋抽卡 ────────────────────────────────────────
  executeGacha(times = 1) {
    const s = getState();
    const totalGem = (s.freeGem ?? 0) + (s.paidGem ?? 0);

    let currentBag = [...(s.bag ?? [])];
    const ticketIdx = currentBag.findIndex(i => i.id === 'sys_gacha_ticket');
    const ticketCount = ticketIdx > -1 ? currentBag[ticketIdx].count : 0;

    let useTickets = 0;
    let gemNeeded = 0;

    if (ticketCount >= times) {
      useTickets = times;
    } else {
      gemNeeded = times === 1 ? GachaConfig.singleCost : GachaConfig.tenCost;
    }

    if (gemNeeded > 0 && totalGem < gemNeeded) {
      EventBus.emit(
        Events.System.TOAST,
        `💎 資源不足（需 ${gemNeeded} 鑽 或 ${times} 張券）`
      );
      return null;
    }

    if (useTickets > 0 && ticketIdx > -1) {
      currentBag[ticketIdx] = {
        ...currentBag[ticketIdx],
        count: currentBag[ticketIdx].count - useTickets,
      };
    }

    let currentFreeGem = s.freeGem ?? 0;
    let currentPaidGem = s.paidGem ?? 0;
    if (gemNeeded > 0) {
      const fd = Math.min(gemNeeded, currentFreeGem);
      currentFreeGem -= fd;
      currentPaidGem = Math.max(0, currentPaidGem - (gemNeeded - fd));
    }

    const results = [];
    let currentUnlocked = [...(s.avatar?.unlocked ?? [])];
    let pity = s.gachaPity ?? 0;

    for (let i = 0; i < times; i++) {
      pity++;
      const roll = Math.random();
      let rarity = 'R';

      if (pity >= GachaConfig.pityLimit) {
        rarity = 'SSR';
        pity = 0;
      } else if (roll < GachaConfig.rates.SSR) {
        rarity = 'SSR';
        pity = 0;
      } else if (roll < GachaConfig.rates.SSR + GachaConfig.rates.SR) {
        rarity = 'SR';
      }

      const pool = GachaPool.filter(item => item.rarity === rarity);
      const picked = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : GachaPool[Math.floor(Math.random() * GachaPool.length)];

      const isNew = !currentUnlocked.includes(picked.id);
      results.push({ ...picked, isNew });

      if (isNew) {
        currentUnlocked.push(picked.id);
      } else {
        const fragIdx = currentBag.findIndex(b => b.id === 'sys_gacha_fragment');
        if (fragIdx > -1) {
          currentBag[fragIdx] = {
            ...currentBag[fragIdx],
            count: currentBag[fragIdx].count + 1,
          };
        } else {
          currentBag.push({ id: 'sys_gacha_fragment', count: 1 });
        }
      }
    }

    setState(prev => ({
      freeGem: currentFreeGem,
      paidGem: currentPaidGem,
      bag: currentBag,
      avatar: { ...prev.avatar, unlocked: currentUnlocked },
      gachaPity: pity,
    }));

    this._checkSetRewards?.();
    EventBus.emit(Events.Avatar.UPDATED);

    return results;
  },

  // ─── 碎片合成抽獎券 ──────────────────────────────────
  craftGachaTicket() {
    const s = getState();
    const bag = [...(s.bag ?? [])];
    const fragIdx = bag.findIndex(i => i.id === 'sys_gacha_fragment');

    if (fragIdx === -1 || bag[fragIdx].count < 10) {
      EventBus.emit(Events.System.TOAST, '❌ 碎片不足 10 個，無法合成喔！');
      return null;
    }

    const craftCount = Math.floor(bag[fragIdx].count / 10);
    const remainder = bag[fragIdx].count % 10;

    if (remainder > 0) {
      bag[fragIdx] = { ...bag[fragIdx], count: remainder };
    } else {
      bag.splice(fragIdx, 1);
    }

    const ticketIdx = bag.findIndex(i => i.id === 'sys_gacha_ticket');
    if (ticketIdx > -1) {
      bag[ticketIdx] = {
        ...bag[ticketIdx],
        count: bag[ticketIdx].count + craftCount,
      };
    } else {
      bag.push({ id: 'sys_gacha_ticket', count: craftCount });
    }

    setState(() => ({ bag }));
    EventBus.emit(Events.System.TOAST, `✨ 成功將碎片合成為 ${craftCount} 張抽獎券！`);
    EventBus.emit(Events.Avatar.UPDATED);
    return craftCount;
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