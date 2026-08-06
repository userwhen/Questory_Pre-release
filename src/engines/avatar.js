/* src/engines/avatar.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { AvatarShop, GachaPool, GachaConfig } from '@/data/avatar_config.js';
import { createBasePetFields, pickSpacedRightPos } from '@/data/pet_config.js';

export const AvatarEngine = {

  // ─── 初始化（main.jsx 啟動時呼叫；AvatarPage 掛載時也會呼叫，
  //     靠 makeIdempotentInit 保護不會重複訂閱）────────────────────
  init: makeIdempotentInit(function () {
    setState(s => {
      const avatar = s.avatar ?? { unlocked: [], wearing: {}, gender: 'm' };

      // 確保預設套裝已解鎖
      const unlocked = avatar.unlocked.includes('outfit_01')
        ? avatar.unlocked
        : [...avatar.unlocked, 'outfit_01'];

      return {
        avatar:     { ...avatar, unlocked },
        activePets: s.activePets ?? [],
      };
    });
    EventBus.emit(Events.Avatar.UPDATED);

    // GachaPage.jsx / AvatarPage.jsx 透過這些事件呼叫，不再直接 import AvatarEngine
    const unsubGacha = EventBus.on(Events.Avatar.REQUEST_GACHA, ({ times, requestId }) => {
      const results = this.executeGacha(times);
      EventBus.emit(Events.Avatar.GACHA_RESULT, { results, requestId });
    });
    const unsubCraft = EventBus.on(Events.Avatar.REQUEST_CRAFT_TICKET, () => {
      this.craftGachaTicket();
    });
    // ⚠️ 修正：補回 type，previewItem 需要知道要寫入 previewWearing 的哪個分類 key
    const unsubPreview = EventBus.on(Events.Avatar.REQUEST_PREVIEW_ITEM, ({ itemId, type }) => {
      this.previewItem(itemId, type);
    });
    const unsubClearPreview = EventBus.on(Events.Avatar.REQUEST_CLEAR_PREVIEW, () => {
      this.clearPreview();
    });
    const unsubWear = EventBus.on(Events.Avatar.REQUEST_WEAR_ITEM, ({ id, type }) => {
      this.wearItem(id, type);
    });
    const unsubPetReplace = EventBus.on(Events.Avatar.REQUEST_CONFIRM_PET_REPLACE, ({ index, newItemId }) => {
      this.confirmPetReplace(index, newItemId);
    });
    const unsubBuy = EventBus.on(Events.Avatar.REQUEST_BUY_ITEM, ({ id, requestId }) => {
      const result = this.buyItem(id);
      EventBus.emit(Events.Avatar.BUY_ITEM_RESULT, { ...result, requestId });
    });

    return [unsubGacha, unsubCraft, unsubPreview, unsubClearPreview, unsubWear, unsubPetReplace, unsubBuy];
  }),

  // ─── 預覽（只寫 previewWearing，不存檔）─────────────
  // ⚠️ 修正：category 由呼叫端的 item.type 帶入，寫入 previewWearing 對應的分類 key，
  //    不再不分青紅皂白全部寫進 .suit（舊 bug：預覽任何非套裝物品都會被誤判成
  //    「穿了全套裝」，導致 CharacterSprite 只渲染那張圖、其餘部位全部消失）。
  //    若呼叫端沒帶 category，比照 wearItem 的防呆寫法反查一次。
  //    注意：預覽刻意不檢查 unlocked——「先試穿再購買」是合理的功能，
  //    真正的擁有權把關在 wearItem／_handlePetWear 做。
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

    if (category === 'pet') {
      this._handlePetWear(itemId);
      return;
    }

    // ⚠️ 修正：補上擁有權檢查。之前這裡完全沒檢查 avatar.unlocked，
    //    正常情況下 UI 只會在 isUnlocked 時顯示「裝備」按鈕，理論上不會呼叫到這裡；
    //    但先前 AvatarPage.jsx 的 isItemWearing 判斷用了混合了預覽的 wearing，
    //    導致只是點過預覽的未解鎖物品，按鈕也會誤判成「已裝備/卸下」，點下去照樣
    //    會呼叫到這裡——沒有這層檢查前，等於點一下預覽縮圖就能免費裝備上未解鎖
    //    的服裝，且會真的寫進存檔。即使 UI 那邊判斷失準，引擎層也要擋下來。
    const unlocked = getState().avatar?.unlocked ?? [];
    if (!unlocked.includes(itemId)) {
      EventBus.emit(Events.System.TOAST, '🔒 尚未解鎖這件物品');
      return;
    }

    setState(s => {
      const wearing = { ...(s.avatar?.wearing ?? {}) };

      // 卸下邏輯
      if (wearing[category] === itemId) {
        if (category === 'body') {
          EventBus.emit(Events.System.TOAST, '🛡️ 素體無法卸下');
          return {};
        }
        delete wearing[category];
        EventBus.emit(Events.System.TOAST, '✨ 已取消裝備');
        // ⚠️ 修正：previewWearing 一併清空。真正卸下後畫面要立刻改讀取剛更新好的
        //    avatar.wearing，不然舊的 previewWearing[category] 還殘留卸下前的物品，
        //    得等離開更衣室觸發 REQUEST_CLEAR_PREVIEW 才會消失
        //   （這就是「卸下要切頁面才會刷新」的原因）。
        return { avatar: { ...s.avatar, wearing }, previewWearing: null };
      }

      // 穿上邏輯 — 互斥處理
      const partialConflicts = ['top', 'bottom', 'hair_front', 'hair_back', 'hair_combo', 'accessory', 'body'];

      if (category === 'suit' || category === 'special_pose') {
        // 全套裝：清除所有局部
        partialConflicts.forEach(c => delete wearing[c]);
      } else if (partialConflicts.includes(category)) {
        // 局部：清除全套裝
        delete wearing.suit;
        delete wearing.special_pose;
      }

      // 髮型內部互斥
      if (category === 'hair_combo') {
        delete wearing.hair_front;
        delete wearing.hair_back;
      } else if (category === 'hair_front' || category === 'hair_back') {
        delete wearing.hair_combo;
      }

      wearing[category] = itemId;

      EventBus.emit(Events.System.TOAST, '✨ 已更換裝備');
      // 同上：真的裝備後直接清空 previewWearing，畫面改讀取剛更新好的 avatar.wearing
      return { avatar: { ...s.avatar, wearing }, previewWearing: null };
    });

    EventBus.emit(Events.Avatar.UPDATED);
  },

  // ─── 寵物裝備（獨立邏輯）────────────────────────────
  _handlePetWear(itemId) {
    // ⚠️ 修正：跟 wearItem 同樣的洞，這裡也補上擁有權檢查
    //    （pet 分頁的 isWearing 判斷是看 activePets，不受預覽 bug 影響，
    //    但引擎層本來就不該假設呼叫端一定會做好把關，這裡一併補齊比較安全）。
    const unlocked = getState().avatar?.unlocked ?? [];
    if (!unlocked.includes(itemId)) {
      EventBus.emit(Events.System.TOAST, '🔒 尚未解鎖這隻寵物');
      return;
    }

    const s = getState();
    const activePets = [...(s.activePets ?? [])];
    const existingIdx = activePets.findIndex(p => p.id === itemId);

    if (existingIdx !== -1) {
      // 卸下
      activePets.splice(existingIdx, 1);
      setState(() => ({ activePets }));
      EventBus.emit(Events.System.TOAST, '✨ 已讓寵物回窩休息');
      EventBus.emit(Events.Avatar.UPDATED);
      return;
    }

    if (activePets.length >= 2) {
      // 滿位，觸發替換彈窗（由 AvatarPage 監聽 PET_REPLACE_PROMPT 顯示 Modal）
      EventBus.emit(Events.Avatar.PET_REPLACE_PROMPT, { newItemId: itemId });
      return;
    }

    this._addNewPet(itemId);
  },

  // ─── 新增寵物（共用邏輯，供直接領養與替換後領養使用）──
  // 這扇門進來的寵物沒有父母、沒有經歷幼年期成長，直接視為「已成年、
  // 血統鎖定為平民血統」（createBasePetFields 不特別傳 lineage 時預設
  // 就是平民血統），性格照樣隨機抽一個。needsNaming: true 交給
  // PetWidget.jsx 掛載時檢查並跳出取名視窗——不用即時事件通知，因為
  // 裝備動作發生在更衣室，PetWidget 當下不一定有掛載，事件會憑空消失、
  // 永遠等不到人監聽；改用持久化欄位，不管玩家什麼時候切回大廳都保證
  // 會跳出來。
  _addNewPet(itemId) {
    // 跟現有寵物保持一定間距，避免兩隻寵物剛好被隨機分配到很接近的
    // 位置，看起來像疊在一起、動畫也像是黏在一起移動、卻始終不會分開
    const existingPets = getState().activePets ?? [];
    const newPet = createBasePetFields({
      id: itemId,
      isGrowing: false,
      level: 1,
      growthProgress: 100,
      geneLocked: true,
      needsNaming: true,
      rightPos: pickSpacedRightPos(existingPets),
    });

    let newIndex = -1;
    setState(s => {
      const activePets = [...(s.activePets ?? []), newPet];
      newIndex = activePets.length - 1;
      return { activePets };
    });
    EventBus.emit(Events.Avatar.UPDATED);
    // 立即通知：這扇門的呼叫方（AvatarPage，不管是直接裝備還是替換後
    // 領養）當下一定是掛載狀態，讓取名視窗當場跳出來，不用等玩家切回
    // 大廳才被 PetWidget.jsx 的保底檢查攔截到。needsNaming 欄位依然
    // 保留在寵物物件上，作為沒有人監聽這個事件時的安全網。
    EventBus.emit(Events.Pet.PET_ADDED_NEEDS_NAMING, { index: newIndex });
  },

  // ─── 確認替換：送走指定 index 的寵物，換上新寵物（比照舊版旅行記錄）──
  confirmPetReplace(replaceIndex, newItemId) {
    const s = getState();
    const activePets = [...(s.activePets ?? [])];
    if (!activePets[replaceIndex]) return;

    const oldPet = activePets[replaceIndex];
    const traveledPets = [...(s.traveledPets ?? [])];
    if (!traveledPets.includes(oldPet.id)) traveledPets.push(oldPet.id);

    // ⚠️ 刻意不改動既有的 traveledPets（純字串陣列），避免弄壞任何可能
    // 已經假設它是純字串陣列的既有讀取端。改成疊加一份新的、獨立的
    // 詳細紀錄，保留血統/世代/性格資料，供未來「旅行紀錄／家族樹」等
    // 功能使用。
    const retiredPetHistory = [...(s.retiredPetHistory ?? []), {
      id: oldPet.id,
      name: oldPet.name,
      level: oldPet.level,
      lineage: oldPet.lineage,
      generation: oldPet.generation,
      personality: oldPet.personality,
      retiredAt: Date.now(),
    }];

    activePets.splice(replaceIndex, 1);
    setState(() => ({ activePets, traveledPets, retiredPetHistory }));

    this._addNewPet(newItemId);
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
      let freeGem  = s.freeGem  ?? 0;
      let paidGem  = s.paidGem  ?? 0;

      // 優先扣免費鑽石
      if (item.price > 0) {
        let cost = item.price;
        const freeDeduct = Math.min(cost, freeGem);
        freeGem -= freeDeduct;
        cost    -= freeDeduct;
        paidGem  = Math.max(0, paidGem - cost);
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
    let anyNew = false;

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
    
    // 建立暫存背包，避免直接修改原始狀態
    let currentBag = [...(s.bag ?? [])];
    const ticketIdx = currentBag.findIndex(i => i.id === 'sys_gacha_ticket');
    const ticketCount = ticketIdx > -1 ? currentBag[ticketIdx].count : 0;
    
    // 1. 資源結算邏輯 (嚴格區分：全用券 vs 全用鑽石)
    let useTickets = 0;
    let gemNeeded = 0;

    if (ticketCount >= times) {
      // 優先且數量足夠時，全扣券
      useTickets = times;
    } else {
      // 券不夠十連時，不混用，直接扣除十連抽的鑽石
      gemNeeded = times === 1 ? GachaConfig.singleCost : GachaConfig.tenCost;
    }

    if (gemNeeded > 0 && totalGem < gemNeeded) {
      EventBus.emit(Events.System.TOAST, `💎 資源不足（需 ${gemNeeded} 鑽 或 ${times} 張券）`);
      return null;
    }

    // 2. 扣除資源 (計算好最終的 bag, freeGem, paidGem)
    if (useTickets > 0 && ticketIdx > -1) {
      currentBag[ticketIdx] = { ...currentBag[ticketIdx], count: currentBag[ticketIdx].count - useTickets };
    }
    
    let currentFreeGem = s.freeGem ?? 0;
    let currentPaidGem = s.paidGem ?? 0;
    if (gemNeeded > 0) {
      const fd = Math.min(gemNeeded, currentFreeGem);
      currentFreeGem -= fd;
      currentPaidGem = Math.max(0, currentPaidGem - (gemNeeded - fd));
    }

    // 3. 抽卡運算準備 (宣告暫存變數，避免迴圈內連續 setState)
    const results = [];
    let currentUnlocked = [...(s.avatar?.unlocked ?? [])];
    let pity = s.gachaPity ?? 0;

    for (let i = 0; i < times; i++) {
      pity++;
      const roll = Math.random();
      let rarity = 'R';

      // 保底機制與機率計算
      if (pity >= GachaConfig.pityLimit) {
        rarity = 'SSR';
        pity = 0; // 保底觸發，歸零
      } else if (roll < GachaConfig.rates.SSR) {
        rarity = 'SSR';
        pity = 0; // 常規抽中 SSR，保底歸零 (若你要保留硬保底，請將這行註解掉)
      } else if (roll < GachaConfig.rates.SSR + GachaConfig.rates.SR) {
        rarity = 'SR';
      }

      // 抽選物品
      const pool = GachaPool.filter(item => item.rarity === rarity);
      const picked = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : GachaPool[Math.floor(Math.random() * GachaPool.length)];

      // 檢查是否為新物品 (比對的對象是暫存的 currentUnlocked，確保十連抽內不會出錯)
      const isNew = !currentUnlocked.includes(picked.id);
      results.push({ ...picked, isNew });

      if (isNew) {
        currentUnlocked.push(picked.id); // 新物品加入解鎖陣列
      } else {
        // 重複 → 碎片
        const fragIdx = currentBag.findIndex(b => b.id === 'sys_gacha_fragment');
        if (fragIdx > -1) {
          currentBag[fragIdx] = { ...currentBag[fragIdx], count: currentBag[fragIdx].count + 1 };
        } else {
          currentBag.push({ id: 'sys_gacha_fragment', count: 1 });
        }
      }
    }

    // 4. 一次性寫入所有狀態 (最高效且安全)
    setState(prev => ({
      freeGem: currentFreeGem,
      paidGem: currentPaidGem,
      bag: currentBag,
      avatar: { ...prev.avatar, unlocked: currentUnlocked },
      gachaPity: pity
    }));

    this._checkSetRewards?.(); // 注意：若此函式不存在要加 ? 避免報錯
    EventBus.emit(Events.Avatar.UPDATED);
    
    return results;
  },
  // ─── 碎片合成抽獎券（批量轉換，比照舊版 10 個一批）──
  craftGachaTicket() {
    const s = getState();
    const bag = [...(s.bag ?? [])];
    const fragIdx = bag.findIndex(i => i.id === 'sys_gacha_fragment');

    if (fragIdx === -1 || bag[fragIdx].count < 10) {
      EventBus.emit(Events.System.TOAST, '❌ 碎片不足 10 個，無法合成喔！');
      return null;
    }

    const craftCount = Math.floor(bag[fragIdx].count / 10);
    const remainder  = bag[fragIdx].count % 10;

    if (remainder > 0) {
      bag[fragIdx] = { ...bag[fragIdx], count: remainder };
    } else {
      bag.splice(fragIdx, 1);
    }

    const ticketIdx = bag.findIndex(i => i.id === 'sys_gacha_ticket');
    if (ticketIdx > -1) {
      bag[ticketIdx] = { ...bag[ticketIdx], count: bag[ticketIdx].count + craftCount };
    } else {
      bag.push({ id: 'sys_gacha_ticket', count: craftCount });
    }

    setState(() => ({ bag }));
    EventBus.emit(Events.System.TOAST, `✨ 成功將碎片合成為 ${craftCount} 張抽獎券！`);
    EventBus.emit(Events.Avatar.UPDATED);
    return craftCount;
  },
  // ─── 取得渲染用穿著資料（給 AvatarStage 用）────────
  getDisplayWearing() {
    const s = getState();
    // previewWearing 優先（更衣室試穿中）
    return s.previewWearing ?? s.avatar?.wearing ?? {};
  },

  // ─── 清除預覽（離開更衣室時）────────────────────────
  clearPreview() {
    setState(() => ({ previewWearing: null }));
  },
};