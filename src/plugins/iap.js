import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { Audio } from './audio.js';
import { Purchases, PRODUCT_CATEGORY } from '@revenuecat/purchases-capacitor';

export const IAP = {
  IAP_MODE: 'live', // 'mock' | 'live' —— 測試階段可先切回 'mock'

  PRODUCTS: [
    { sku:'gem_30',   gems:30,   price:'NT$30',  label:'小袋鑽石', icon:'💎', badge:null,        color:'#4fc3f7' },
    { sku:'gem_100',  gems:100,  price:'NT$90',  label:'鑽石袋',   icon:'💎', badge:'🔥 最熱門', color:'#ff7043' },
    { sku:'gem_300',  gems:300,  price:'NT$250', label:'鑽石箱',   icon:'💎', badge:'⚡ 超值',   savePct:17, color:'#ab47bc' },
    { sku:'gem_1000', gems:1000, price:'NT$790', label:'鑽石寶庫', icon:'💎', badge:'👑 最划算', savePct:34, color:'#ffc107' },
  ],

  DONATE_PRODUCTS: [
    { sku:'coffee_1', price:'NT$30', label:'請開發者喝咖啡', icon:'☕', desc:'小小支持，大大鼓勵！' },
  ],

  _initialized: false,
  _liveProducts: null,

  async init() {
    if (this._initialized) return;
    this._initialized = true;
    if (this.IAP_MODE === 'live') await this._initLive();
  },

  getProducts()       { return this.PRODUCTS; },
  getDonateProducts() { return this.DONATE_PRODUCTS; },

  async purchase(sku) {
    const product = [...this.PRODUCTS, ...this.DONATE_PRODUCTS].find(p => p.sku === sku);
    if (!product) { EventBus.emit(Events.System.TOAST, '❌ 找不到商品'); return { success: false }; }
    return this.IAP_MODE === 'mock' ? this._mockPurchase(product) : this._livePurchase(product);
  },

  _mockPurchase(product) {
    if (product.sku.startsWith('coffee_')) {
      EventBus.emit(Events.System.TOAST, '☕ 感謝你的支持！（測試模式）');
      Audio.feedback('achievement');
      return { success: true, mock: true, donate: true };
    }
    useGameStore.getState().addGem(product.gems, true);
    EventBus.emit(Events.System.TOAST, `💎 獲得 ${product.gems} 鑽石！（測試模式）`);
    Audio.feedback('purchase');
    return { success: true, mock: true, gems: product.gems };
  },

  async _initLive() {
    if (typeof Capacitor === 'undefined') return;
    try {
      await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_ANDROID_PUBLIC_KEY' });

      const skus = [...this.PRODUCTS, ...this.DONATE_PRODUCTS].map(p => p.sku);
      const { products } = await Purchases.getProducts({
        productIdentifiers: skus,
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      this._liveProducts = products;
    } catch (e) {
      console.warn('[IAP] live 模式初始化失敗，降級為模擬:', e);
      this.IAP_MODE = 'mock';
    }
  },

  async _livePurchase(product) {
    if (!this._liveProducts) {
      console.warn('[IAP] live 模式尚未初始化完成，降級為模擬');
      return this._mockPurchase(product);
    }
    const storeProduct = this._liveProducts.find(p => p.identifier === product.sku);
    if (!storeProduct) {
      EventBus.emit(Events.System.TOAST, '❌ 商店查無此商品，稍後再試');
      return { success: false };
    }
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct({ product: storeProduct });
      if (product.sku.startsWith('coffee_')) {
        EventBus.emit(Events.System.TOAST, '☕ 感謝你的支持！');
        Audio.feedback('achievement');
        return { success: true, donate: true };
      }
      useGameStore.getState().addGem(product.gems, true);
      EventBus.emit(Events.System.TOAST, `💎 獲得 ${product.gems} 鑽石！`);
      Audio.feedback('purchase');
      return { success: true, gems: product.gems, customerInfo };
    } catch (e) {
      if (e?.userCancelled) return { success: false, cancelled: true };
      console.warn('[IAP] 購買失敗:', e);
      EventBus.emit(Events.System.TOAST, '❌ 購買失敗，請稍後再試');
      return { success: false, error: e?.message };
    }
  },

  async restorePurchases() {
    if (this.IAP_MODE === 'mock') {
      EventBus.emit(Events.System.TOAST, 'ℹ️ 測試模式不支援恢復購買');
      return;
    }
    try {
      await Purchases.restorePurchases();
      EventBus.emit(Events.System.TOAST, '✅ 已還原購買紀錄');
    } catch (e) {
      EventBus.emit(Events.System.TOAST, '❌ 還原失敗，請稍後再試');
    }
  },
};