/* src/shop/data/shopConfig.js */
// 通用系統商店道具（從 data/data.js 的 GameConfig.SystemShop 移入）。
// 這些道具的「效果套用」邏輯直接寫在 shop/engines/shop.js 的 useItem() 裡
// （依 category 或 id 判斷），所以資料留在 shop/ 底下跟邏輯放一起最好找。
//
// 初版裁切：寵物類道具（原本合併自 pet/data/pet_shop_items.js）已經拿掉，
// 因為 Avatar 頁面的寵物／陪伴分頁入口已隱藏，賣了也沒地方用。
// 之後要把寵物系統加回來時，把這行 import 加回來、SystemShop 的合併也加回去即可：
//   import { PET_SHOP_ITEMS } from '@/pet/data/pet_shop_items.js';
//   export const SystemShop = [...SHOP_CONFIG_ITEMS, ...PET_SHOP_ITEMS];

export const SHOP_CONFIG_ITEMS = [
  { id: 'sys_cal_meal', name: '飽餐一頓', price: 250, currency: 'gold', maxQty: 99, category: '熱量', val: 250, icon: '🍱', desc: '回復 250kcal 熱量', type: 'daily' },
  { id: 'sys_time_relax', name: '休閒時光', price: 250, currency: 'gold', maxQty: 99, category: '時間', val: 15, icon: '🎮', desc: '15分鐘的休閒時間', type: 'daily' },
  { id: 'sys_cash_pouch', name: '小錢袋', price: 250, currency: 'gold', maxQty: 99, category: '金錢', val: 250, icon: '💰', desc: '獲得 250 金幣', type: 'daily' },
  { id: 'sys_misc_relax_ticket', name: '放鬆券', price: 250, currency: 'gold', maxQty: 99, category: '其他', val: 0, icon: '🎫', desc: '做一件讓自己放鬆的事情', type: 'daily' },
  { id: 'sys_misc_rename_ticket', name: '更名券', price: 250, currency: 'gem', maxQty: 1, category: '其他', val: 0, icon: '🏷️', desc: '修改一次冒險者暱稱', type: 'daily' },
  { id: 'sys_misc_stamina_s', name: '精力藥水小', price: 10, currency: 'gem', maxQty: 99, category: '其他', val: 30, icon: '🧪', desc: '回復 30 點精力', type: 'daily' },
  { id: 'sys_misc_stamina_m', name: '精力藥水中', price: 20, currency: 'gem', maxQty: 99, category: '其他', val: 60, icon: '⚗️', desc: '回復 60 點精力', type: 'daily' },
  { id: 'sys_misc_stamina_l', name: '精力藥水大', price: 30, currency: 'gem', maxQty: 99, category: '其他', val: 100, icon: '💉', desc: '精力完全恢復', type: 'daily' },
];

// 合併後的完整系統商店清單：舊呼叫端原本讀 GameConfig.SystemShop，
// 現在改讀這裡匯出的 SystemShop，內容完全等價，只是來源分散到各 domain。
export const SystemShop = [...SHOP_CONFIG_ITEMS];
