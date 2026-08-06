import { useGameStore, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export const Scanner = {
  SUPABASE_URL: 'https://ggsjbaoszjllprdmpcrl.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnc2piYW9zempsbHByZG1wY3JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc2MDY2NCwiZXhwIjoyMDg5MzM2NjY0fQ.BRowCnlDniEnpbHB3ikrcTSsdg1bCjMT93z0Rv6c0tQ',

  async scan() {
    const BSC = typeof Capacitor !== 'undefined' ? Capacitor.Plugins?.BarcodeScanner : null;
    if (!BSC) return null;

    try {
      let granted = false;
      if (BSC.checkPermissions) {
        const s = await BSC.checkPermissions();
        granted = s.camera === 'granted';
        if (!granted && BSC.requestPermissions) {
          const r = await BSC.requestPermissions();
          granted = r.camera === 'granted';
        }
      } else if (BSC.checkPermission) {
        const s = await BSC.checkPermission({ force: true });
        granted = s.granted;
      }

      if (!granted) {
        EventBus.emit(Events.System.TOAST, '❌ 需要相機權限才能掃描');
        return null;
      }

      document.body.classList.add('sq-scanner-active');
      if (BSC.hideBackground) await BSC.hideBackground();
      const result = BSC.scan ? await BSC.scan() : await BSC.startScan();
      document.body.classList.remove('sq-scanner-active');
      if (BSC.showBackground) await BSC.showBackground();

      let barcode = null;
      if (result.barcodes?.length > 0) barcode = result.barcodes[0].rawValue ?? result.barcodes[0].displayValue;
      else if (result.hasContent && result.content) barcode = result.content;
      else if (typeof result === 'string') barcode = result;

      if (!barcode) { EventBus.emit(Events.System.TOAST, '⚠️ 未能讀取條碼'); return null; }
      if (barcode.includes('http') || !/^\d+$/.test(barcode) || barcode.length < 5) {
        EventBus.emit(Events.System.TOAST, '⚠️ 無效條碼：請掃描商品上的純數字條碼');
        return null;
      }

      if (navigator.vibrate) navigator.vibrate(50);
      return await this.lookup(barcode);
    } catch(e) {
      document.body.classList.remove('sq-scanner-active');
      try { Capacitor.Plugins?.BarcodeScanner?.showBackground(); } catch(_) {}
      return null;
    }
  },

  stop() {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins?.BarcodeScanner) {
      Capacitor.Plugins.BarcodeScanner.stopScan?.();
      Capacitor.Plugins.BarcodeScanner.showBackground?.();
    }
    document.body.classList.remove('sq-scanner-active');
  },

  async lookup(barcode) {
    if (this.SUPABASE_URL && this.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
      try {
        const res  = await fetch(`${this.SUPABASE_URL}/rest/v1/tw_foods?barcode=eq.${barcode}`, {
          headers: { apikey: this.SUPABASE_KEY, Authorization: `Bearer ${this.SUPABASE_KEY}` },
        });
        const data = await res.json();
        if (data?.length > 0) {
          const item = data[0];
          return { found: true, barcode, name: item.name, kcal: item.kcal, size: item.size, brand: '玩家共創庫' };
        }
      } catch(e) { console.warn('[Scanner] 自建庫查詢失敗', e); }
    }

    for (const url of [
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      `https://tw.openfoodfacts.org/api/v0/product/${barcode}.json`,
    ]) {
      try {
        const res  = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'Questory/1.0' } });
        const data = await res.json();
        if (data.status !== 1 || !data.product) continue;

        const p    = data.product;
        const n    = p.nutriments ?? {};
        const kcal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : null);
        const brand  = p.brands?.split(',')[0].trim() ?? '';
        const rawName = p.product_name_zh ?? p.product_name_tw ?? p.product_name ?? '';
        const name    = brand && rawName ? `${brand} ${rawName}` : rawName || brand || '未知商品';

        return { found: true, barcode, name: name.trim().slice(0, 30), kcal: kcal ? Math.round(kcal) : null, size: p.quantity ?? '' };
      } catch(e) {}
    }

    return { found: false, barcode, error: '找不到商品' };
  },

  async contribute(barcode, name, kcal, size = '') {
    if (!barcode || barcode.length < 5 || this.SUPABASE_URL === 'YOUR_SUPABASE_URL') return;

    const s = useGameStore.getState();
    const userId = s.userId ?? (() => {
      const id = 'usr_' + Math.random().toString(36).slice(2, 10);
      setState(store => ({ userId: id }));
      return id;
    })();

    const finalSize = (size === '' || size == null) ? null : String(size);
    try {
      const res = await fetch(`${this.SUPABASE_URL}/rest/v1/tw_foods`, {
        method: 'POST',
        headers: {
          apikey: this.SUPABASE_KEY,
          Authorization: `Bearer ${this.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates, return=minimal',
        },
        body: JSON.stringify({ barcode: String(barcode), name: String(name), kcal: Number(kcal) || 0, size: finalSize, contributor_id: String(userId) }),
      });
      if (!res.ok) console.error('[Scanner] Supabase 寫入失敗:', await res.json());
    } catch(e) { console.error('[Scanner] 連線失敗', e); }
  },

  giveContributeReward(barcode) {
    const s = useGameStore.getState();
    const today = new Date().toDateString();

    const corrected = s.correctedBarcodes ?? [];
    if (corrected.includes(barcode)) {
      EventBus.emit(Events.System.TOAST, '✅ 已存入資料庫！(此商品已領過獎勵)');
      return;
    }

    const dailyCount = s.lastContributeDate === today ? (s.dailyContributes ?? 0) : 0;

    setState(store => ({
      correctedBarcodes: [...(store.correctedBarcodes ?? []), barcode],
      lastContributeDate: today,
      dailyContributes: dailyCount + 1,
      freeGem: dailyCount < 10 ? (store.freeGem ?? 0) + 1 : (store.freeGem ?? 0),
    }));

    if (dailyCount < 10) {
      EventBus.emit(Events.System.TOAST, '🎉 感謝建檔！獲得 1 顆免費鑽石 💎');
      EventBus.emit(Events.Stats.UPDATED);
    } else {
      EventBus.emit(Events.System.TOAST, '✅ 已存入！(今日鑽石獎勵達上限)');
    }
  },
};