/* src/utils/shopSelectors.js */
// 從 engines/shop.js 抽出來的純函式：只吃已經拿到手的 state 片段當參數，
// 不呼叫 getState()，讓元件可以搭配 useGameStore 的 reactive selector 使用，
// 不需要透過 Engine，也不會有「render 中直接讀 store」的問題。
import { GameConfig } from '@/data/data.js';

export function getShopItems(sysShop, userItems, cat) {
  const sysItems = (GameConfig.SystemShop || []).map(proto => {
    const state = sysShop?.[proto.id] || {};
    if (state.removed) return null;
    return { ...proto, qty: state.qty !== undefined ? state.qty : proto.maxQty };
  }).filter(Boolean);

  const all = [...sysItems, ...(userItems || [])];
  if (!cat || cat === '全部') return all;
  return all.filter(i => i.category === cat);
}

export function getStackedBag(bag, cat) {
  const items = bag || [];
  if (cat && cat !== '全部') return items.filter(i => i.category === cat);
  return items.filter(i => i.category !== '寵物');
}