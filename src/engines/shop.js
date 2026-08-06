/* src/engines/shop.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { GameConfig } from '@/data/data.js';
import { getShopItems as getShopItemsPure, getStackedBag as getStackedBagPure } from '@/utils/shopSelectors.js';

export const ShopEngine = {
  systemPrototypes: [],

  init: makeIdempotentInit(function () {
    this.systemPrototypes = GameConfig.SystemShop || [];

    setState(s => {
      const updates = {};
      if (!s.shop) updates.shop = { user: [] };
      if (!s.bag) updates.bag = [];
      if (!s.sysShop) updates.sysShop = {};
      return Object.keys(updates).length ? updates : s;
    });

    EventBus.emit(Events.Shop.UPDATED);

    // ShopPage.jsx 透過這些事件呼叫，不再直接 import ShopEngine
    const unsubBuy = EventBus.on(Events.Shop.REQUEST_BUY_ITEM, ({ id, qty, requestId }) => {
      const result = this.buyItem(id, qty);
      EventBus.emit(Events.Shop.BUY_ITEM_RESULT, { ...result, requestId });
    });
    const unsubUse = EventBus.on(Events.Shop.REQUEST_USE_ITEM, ({ id, qty, requestId }) => {
      const result = this.useItem(id, qty);
      EventBus.emit(Events.Shop.USE_ITEM_RESULT, { ...result, requestId });
    });
    const unsubDiscard = EventBus.on(Events.Shop.REQUEST_DISCARD_ITEM, ({ id, qty }) => {
      this.discardItem(id, qty);
    });
    const unsubUpload = EventBus.on(Events.Shop.REQUEST_UPLOAD_ITEM, (data) => {
      this.uploadItem(data);
    });
    const unsubDelete = EventBus.on(Events.Shop.REQUEST_DELETE_ITEM, ({ id }) => {
      this.deleteItem(id);
    });
    const unsubGrant = EventBus.on(Events.Shop.REQUEST_GRANT_ITEM, ({ id, qty }) => {
      this.grantItem(id, qty);
    });

    return [unsubBuy, unsubUse, unsubDiscard, unsubUpload, unsubDelete, unsubGrant];
  }),

  performDailyReset() {
    setState(s => {
      const sysShop = { ...s.sysShop };
      // 重置系統商品
      Object.keys(sysShop).forEach(id => {
        const proto = this.systemPrototypes.find(p => p.id === id);
        if (proto?.type === 'daily') delete sysShop[id];
      });

      // 重置玩家商品
      const userShop = (s.shop?.user || [])
        .filter(item => !(item.type === 'once' && item.qty <= 0))
        .map(item => item.type === 'daily'
          ? { ...item, qty: item.maxQty || 1 }
          : item
        );

      return { sysShop, shop: { ...s.shop, user: userShop } };
    });
  },

  getShopItems(cat) {
    const s = getState();
    return getShopItemsPure(s.sysShop, s.shop?.user, cat);
  },

  getStackedBag(cat) {
    const s = getState();
    return getStackedBagPure(s.bag, cat);
  },

  buyItem(id, qty = 1) {
    const s = getState();
    const items = this.getShopItems('全部');
    const item = items.find(i => i.id === id);

    if (!item) return { success: false, msg: '商品不存在' };
    if (item.qty < qty) return { success: false, msg: '庫存不足' };
    if (item.currency === 'gold' && (s.gold || 0) < 0)
      return { success: false, msg: '🚫 帳戶負債，請先還清！' };

    const totalCost = item.price * qty;

    // 扣款
    if (item.currency === 'gold') {
      if ((s.gold || 0) < totalCost) return { success: false, msg: '金幣不足' };
    } else {
      const totalGem = (s.freeGem || 0) + (s.paidGem || 0);
      if (totalGem < totalCost) return { success: false, msg: '鑽石不足' };
    }

    setState(store => {
      // 扣貨幣
      let gold = store.gold || 0;
      let freeGem = store.freeGem || 0;
      let paidGem = store.paidGem || 0;

      if (item.currency === 'gold') {
        gold -= totalCost;
      } else {
        if (freeGem >= totalCost) {
          freeGem -= totalCost;
        } else {
          const remain = totalCost - freeGem;
          freeGem = 0;
          paidGem -= remain;
        }
      }

      // 扣庫存
      const sysShop = { ...store.sysShop };
      if (id.startsWith('sys_')) {
        sysShop[id] = { ...(sysShop[id] || {}), qty: (sysShop[id]?.qty ?? item.qty) - qty };
      }

      const userShop = (store.shop?.user || []).map(u =>
        u.id !== id ? u : { ...u, qty: u.qty - qty }
      );

      // 進背包
      const bag = [...(store.bag || [])];
      const existing = bag.findIndex(b => b.id === id);
      if (existing > -1) {
        bag[existing] = { ...bag[existing], count: bag[existing].count + qty };
      } else {
        bag.push({ ...item, count: qty });
      }

      return { gold, freeGem, paidGem, sysShop, shop: { ...store.shop, user: userShop }, bag };
    });

    EventBus.emit(Events.Shop.BAG_UPDATED);
    EventBus.emit(Events.Stats.UPDATED);
    return { success: true };
  },

  useItem(id, qty = 1) {
    const s = getState();
    const item = (s.bag || []).find(i => i.id === id);
    if (!item) return { success: false, msg: '背包中找不到物品' };
    if (item.count < qty) return { success: false, msg: '物品數量不足' };

    const baseVal = parseInt(item.val || 0);
    const totalVal = baseVal * qty;
    let msg = '已使用';

    if (item.category === '熱量' && totalVal > 0) {
      const timeStr = new Date().toTimeString().slice(0, 5);
      setState(store => {
        const cal = store.cal || { today: 0, logs: [] };
        const logs = [`${timeStr} ${item.icon || '🍙'} ${item.name} x${qty} +${totalVal}`, ...(cal.logs || [])].slice(0, 30);
        return { cal: { ...cal, today: (cal.today || 0) + totalVal, logs } };
      });
      msg = `😋 攝取了 ${totalVal} Kcal`;
      EventBus.emit(Events.Stats.UPDATED);

    } else if (item.category === '金錢' && totalVal > 0) {
      setState(store => ({ gold: (store.gold || 0) + totalVal }));
      msg = `💰 獲得了 ${totalVal} 金幣`;
      EventBus.emit(Events.Stats.UPDATED);
    } else if (item.category === '時間') {
      const parts = String(item.val || '0|0').split('|');
      const totalMinutes = (parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0)) * qty;
      msg = `⏱️ 計時 ${totalMinutes} 分鐘（請至計時器頁面使用）`;
    } else if (item.category === '其他' && id.includes('stamina')) {
      setState(store => {
        const story = store.story || { energy: 0 };
        const maxEnergy = 30 + Math.floor((store.lv || 1) / 5) * 10;
        return { story: { ...story, energy: Math.min(story.energy + totalVal, maxEnergy) } };
      });
      msg = `⚡ 恢復了 ${totalVal} 點精力`;
      EventBus.emit(Events.Stats.UPDATED);
    }

    this.discardItem(id, qty);
    return { success: true, msg };
  },

  discardItem(id, qty = 1) {
    setState(store => {
      const bag = (store.bag || [])
        .map(b => b.id !== id ? b : { ...b, count: b.count - qty })
        .filter(b => b.count > 0);
      return { bag };
    });
    EventBus.emit(Events.Shop.BAG_UPDATED);
  },

  uploadItem(data) {
    setState(store => {
      const user = [...(store.shop?.user || [])];
      if (data.id) {
        const idx = user.findIndex(i => i.id === data.id);
        if (idx >= 0) user[idx] = { ...user[idx], ...data };
      } else {
        user.push({ ...data, id: 'usr_' + Date.now(), currency: 'gold', icon: data.icon || '📦' });
      }
      return { shop: { ...store.shop, user } };
    });
    EventBus.emit(Events.Shop.UPDATED);
    return true;
  },

  deleteItem(id) {
    setState(store => ({
      shop: { ...store.shop, user: (store.shop?.user || []).filter(i => i.id !== id) },
    }));
    EventBus.emit(Events.Shop.UPDATED);
  },

  grantItem(id, qty = 1) {
    const items = this.getShopItems('全部');
    const item = items.find(i => i.id === id);
    if (!item) return { success: false, msg: '商品不存在' };

    setState(store => {
      const bag = [...(store.bag || [])];
      const existing = bag.findIndex(b => b.id === id);
      if (existing > -1) {
        bag[existing] = { ...bag[existing], count: bag[existing].count + qty };
      } else {
        bag.push({ ...item, count: qty });
      }
      return { bag };
    });
    EventBus.emit(Events.Shop.BAG_UPDATED);
    return { success: true };
  },
};