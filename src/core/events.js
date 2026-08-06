export const EventBus = {
  _listeners: {},

  on(event, callback) {
    (this._listeners[event] ??= []).push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    this._listeners[event]?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[EventBus] ${event}:`, e); }
    });
  },

  once(event, callback) {
    const wrapper = (data) => { callback(data); this.off(event, wrapper); };
    this.on(event, wrapper);
  },
};

// ─── EventHelper：封裝「發請求 → 等回應」的一次性往返 ───────────────
// 取代交接文件裡的「模式 B」手刻寫法，解決兩個問題：
//   1. 不用再動態拼事件名稱（如 `avatar:gacha_result:${requestId}`）。
//      事件名稱固定不變、可以放進 Events 常數；requestId 改成放進 payload 裡過濾。
//   2. 一定會清掉 listener：不管成功還是 timeout，都會 unsub，
//      不會有「Engine 忘記 emit 回應」造成的永久記憶體洩漏。
//
// 使用契約（Engine 端務必遵守，否則呼叫方永遠等到 timeout）：
//   EventBus.on(Events.Xxx.REQUEST_YYY, ({ requestId, ...payload }) => {
//     const result = doSomething(payload);
//     EventBus.emit(Events.Xxx.YYY_RESULT, { ...result, requestId }); // ← requestId 要原封不動 echo 回去
//   });
//
// 元件端使用範例：
//   try {
//     const result = await EventHelper.requestOnce(
//       Events.Avatar.REQUEST_GACHA,
//       Events.Avatar.GACHA_RESULT,
//       { times: 10 }
//     );
//     // 處理 result
//   } catch (err) {
//     // 處理 timeout（Engine 沒有回應）
//   }
export const EventHelper = {
  requestOnce(reqEvent, resEvent, payload = {}, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      let timeoutTimer;

      const unsub = EventBus.on(resEvent, (data) => {
        if (!data || data.requestId !== requestId) return; // 不是這次請求的回應，忽略
        clearTimeout(timeoutTimer);
        unsub();
        resolve(data);
      });

      timeoutTimer = setTimeout(() => {
        unsub();
        reject(new Error(`[EventHelper] "${reqEvent}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      EventBus.emit(reqEvent, { ...payload, requestId });
    });
  },
};

// ─── makeIdempotentInit：包住 Engine 的「防止 init() 被重複呼叫」pattern ───────
// 取代這種在 9 個 engine 檔案裡幾乎逐字重複的寫法：
//   _inited: false,
//   init() {
//     if (this._inited) return this._cleanup;
//     this._inited = true;
//     const unsub1 = EventBus.on(...);
//     const unsub2 = EventBus.on(...);
//     this._cleanup = () => { unsub1(); unsub2(); this._inited = false; };
//     return this._cleanup;
//   },
//
// 改成：
//   init: makeIdempotentInit(function () {
//     const unsub1 = EventBus.on(...);
//     const unsub2 = EventBus.on(...);
//     return [unsub1, unsub2]; // 只要回傳 unsub 陣列，其餘的都交給這個 factory 處理
//   }),
//
// setupFn 用 this 呼叫（不是箭頭函式），所以裡面照樣可以用 this.xxx() 呼叫同一個 Engine 的其他方法。
// setupFn 也可以不回傳任何東西（例如 shop.js/avatar.js 這種目前沒有 EventBus.on 的 engine）。
export function makeIdempotentInit(setupFn) {
  let inited = false;
  let cleanup = null;

  return function (...args) {
    if (inited) return cleanup;
    inited = true;

    const unsubs = setupFn.apply(this, args) || [];

    cleanup = () => {
      unsubs.forEach(fn => fn?.());
      inited = false;
    };
    return cleanup;
  };
}