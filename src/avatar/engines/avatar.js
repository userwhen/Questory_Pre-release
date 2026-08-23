/* src/engines/avatar.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { AvatarShop, GachaPool, GachaConfig, checkAttrGate, passesAttrGate, AVATAR_FULL_WARDROBE_ENABLED } from '@/avatar/data/avatar_config.js';
import { previewCosmetic, clearCosmeticPreview, equipCosmetic, buyCosmetic, checkMilestones } from '@/avatar/engines/portrait.js';

// 穿上套裝時會被清空的局部裝備欄位；出發版預設綁定套裝時也用同一份清空
const SUIT_PARTIAL_CONFLICTS = ['top', 'bottom', 'hair_front', 'hair_back', 'hair_combo', 'accessory', 'body', 'face'];

export const AvatarEngine = {

  // ─── 初始化 ─────────────────────────────────────────
  init: makeIdempotentInit(function () {
    setState(s => {
      const avatar = s.avatar ?? { unlocked: [], wearing: {}, gender: 'm' };
      let unlocked = [...(avatar.unlocked ?? [])];
      let wearing = { ...(avatar.wearing ?? {}) };

      if (!unlocked.includes('outfit_01')) unlocked.push('outfit_01');
      if (!unlocked.includes('bg_01')) unlocked.push('bg_01');

      // 完全沒背景時補預設（避免舊檔空背景）
      const hasAnyBg =
        wearing.bg || wearing.wall_bg || wearing.floor_bg;
      if (!hasAnyBg) {
        wearing.bg = 'bg_01';
      }

      // 出發版：素體永遠綁定套裝，沒穿套裝時補上預設勇者，並清掉其他局部
      // 裝備欄位（比照手動穿套裝時 SUIT_PARTIAL_CONFLICTS 會清掉的內容一致）
      if (!AVATAR_FULL_WARDROBE_ENABLED && !wearing.suit) {
        wearing.suit = 'outfit_01';
        SUIT_PARTIAL_CONFLICTS.forEach(c => delete wearing[c]);
      }

      return {
        avatar: { ...avatar, unlocked, wearing },
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

    // ── 頭像／頭像框：完全轉呼叫 portrait.js，這裡只負責事件註冊 ──
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

    // 立即補跑一次：確保功能上線前就已達標的老玩家馬上拿到
    checkMilestones();

    return [
      unsubGacha, unsubCraft, unsubPreview, unsubClearPreview, unsubWear, unsubBuy,
      unsubCosmeticPreview, unsubCosmeticClearPreview, unsubCosmeticEquip, unsubCosmeticBuy,
      unsubCosmeticLevelUp, unsubCosmeticDailyReset,
    ];
  }),
  // ─── 預覽（只寫 previewWearing，不存檔）─────────────
  previewItem(itemId, category) {
    if (!category) {
      const item = [...AvatarShop, ...GachaPool].find(i => i.id === itemId);
      category = item?.type ?? 'suit';
    }

    const s = getState();
    const previewWearing = { ...(s.previewWearing ?? s.avatar?.wearing ?? {}) };

    // 互斥清理：比照 wearItem() 的邏輯，預覽套裝/特殊姿勢時清掉局部欄位，
    // 預覽局部欄位時清掉套裝/特殊姿勢，避免舊的預覽殘留卡住畫面
    if (category === 'suit' || category === 'special_pose') {
      SUIT_PARTIAL_CONFLICTS.forEach(c => delete previewWearing[c]);
      delete previewWearing.suit;
      delete previewWearing.special_pose;
    } else if (SUIT_PARTIAL_CONFLICTS.includes(category)) {
      delete previewWearing.suit;
      delete previewWearing.special_pose;
    }

    if (category === 'hair_combo') {
      delete previewWearing.hair_front;
      delete previewWearing.hair_back;
    } else if (category === 'hair_front' || category === 'hair_back') {
      delete previewWearing.hair_combo;
    }

    if (category === 'bg') {
      delete previewWearing.wall_bg;
      delete previewWearing.floor_bg;
      previewWearing.bg = itemId;
    } else if (category === 'wall_bg' || category === 'floor_bg') {
      previewWearing[category] = itemId;
      if (previewWearing.wall_bg && previewWearing.floor_bg) {
        delete previewWearing.bg;
      }
    } else {
      previewWearing[category] = itemId;
    }

    setState(() => ({ previewWearing }));
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
        if (category === 'bg') {
          EventBus.emit(Events.System.TOAST, '🌲 大廳背景無法卸下，請直接換另一張背景');
          return {};
        }
        if (category === 'suit' && !AVATAR_FULL_WARDROBE_ENABLED) {
          EventBus.emit(Events.System.TOAST, '👑 套裝無法卸下');
          return {};
        }
        delete wearing[category];
        // 卸下套裝（僅完整版會走到這）：補回預設素體與表情，避免裸體破圖
        if (category === 'suit') {
          wearing.body = 'body_01';
          wearing.face = 'face_01';
        }
        // 牆或地卸掉後，若不再「牆＋地齊全」→ 補回全景，避免破圖
        if (category === 'wall_bg' || category === 'floor_bg') {
          const hasFullRoom = wearing.wall_bg && wearing.floor_bg;
          if (!hasFullRoom && !wearing.bg) {
            wearing.bg = 'bg_01'; // 預設靜謐／翠綠森林
          }
        }
        EventBus.emit(Events.System.TOAST, '✨ 已取消裝備');
        return { avatar: { ...s.avatar, wearing }, previewWearing: null };
      }

      // 穿上 — 互斥
      if (category === 'suit' || category === 'special_pose') {
        SUIT_PARTIAL_CONFLICTS.forEach(c => delete wearing[c]);
      } else if (SUIT_PARTIAL_CONFLICTS.includes(category)) {
        delete wearing.suit;
        delete wearing.special_pose;
      }

      if (category === 'hair_combo') {
        delete wearing.hair_front;
        delete wearing.hair_back;
      } else if (category === 'hair_front' || category === 'hair_back') {
        delete wearing.hair_combo;
      }


      // 背景規則：
      // - 穿全景 bg → 清掉牆／地
      // - 穿牆或地 → 先穿上；兩邊都齊才清 bg；只有一邊時保留 bg 當底
      if (category === 'bg') {
        delete wearing.wall_bg;
        delete wearing.floor_bg;
        wearing.bg = itemId;
      } else if (category === 'wall_bg' || category === 'floor_bg') {
        wearing[category] = itemId;
        if (wearing.wall_bg && wearing.floor_bg) {
          delete wearing.bg; // 牆＋地齊全 → 純房間
        }
        // 只有一邊：不刪 bg，底下仍是全景
      } else {
        wearing[category] = itemId;
      }

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

  // ─── 扭蛋抽卡 ────────────────────────────────────────
  executeGacha(times = 1) {
    const s = getState();
    const totalGem = (s.freeGem ?? 0) + (s.paidGem ?? 0);

    let currentBag = [...(s.bag ?? [])];
    const ticketIdx = currentBag.findIndex(i => i.id === 'sys_misc_gacha_ticket');
    const ticketCount = ticketIdx > -1 ? currentBag[ticketIdx].count : 0;

    // 券優先：先扣券，不足次數用鑽補。
    // 優惠只在「全鑽十連」：混券時不足部分按單抽價計。
    const useTickets = Math.min(ticketCount, times);
    const remain = times - useTickets;
    let gemNeeded = 0;
    if (remain > 0) {
      if (useTickets === 0 && times === 10) {
        gemNeeded = GachaConfig.tenCost; // 全鑽十連優惠
      } else {
        gemNeeded = remain * GachaConfig.singleCost;
      }
    }

    if (gemNeeded > 0 && totalGem < gemNeeded) {
      EventBus.emit(
        Events.System.TOAST,
        useTickets > 0
          ? `💎 鑽石不足（已用 ${useTickets} 券，還需 ${gemNeeded} 鑽）`
          : `💎 資源不足（需 ${gemNeeded} 鑽 或 ${times} 張券）`
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

    // 依當前屬性過濾扭蛋池：未達 reqAttr 的商品不進池（公平、不抽到不能穿的）
    const attrs = s.attrs || {};
    const eligiblePool = GachaPool.filter(item => passesAttrGate(item, attrs));
    // 若全部被濾掉（極端情況），退回無門檻商品，避免空池崩潰
    const safePool = eligiblePool.length > 0
      ? eligiblePool
      : GachaPool.filter(item => !item.reqAttr);
    const drawPool = safePool.length > 0 ? safePool : GachaPool;

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

      const pool = drawPool.filter(item => item.rarity === rarity);
      const picked = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : drawPool[Math.floor(Math.random() * drawPool.length)];

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

    const ticketIdx = bag.findIndex(i => i.id === 'sys_misc_gacha_ticket');
    if (ticketIdx > -1) {
      bag[ticketIdx] = {
        ...bag[ticketIdx],
        count: bag[ticketIdx].count + craftCount,
      };
    } else {
      bag.push({ id: 'sys_misc_gacha_ticket', count: craftCount });
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