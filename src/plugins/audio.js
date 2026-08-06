import { useGameStore } from '@/core/state.js';

// ── 自訂 BGM 持久化（IndexedDB）──────────────────────────
// 舊版把 URL.createObjectURL() 的結果直接存進 zustand persist（等於存進 localStorage），
// 但 blob URL 只在建立它的那個分頁存活，重新整理/重開 App 後就是死連結，
// 玩家會看到「✅ 已上傳自訂音樂」卻放不出聲音。
// 改法：實際檔案（File/Blob）存進 IndexedDB；zustand 裡的 settings.customBGM
// 只存 'custom' 這個旗標字串（給 UI 判斷「有沒有上傳過」用），blob URL 每次用到才重建。
const DB_NAME = 'questory_audio';
const STORE_NAME = 'bgm';
const BGM_KEY = 'custom_bgm';

function openBgmDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSetBgm(blob) {
  const db = await openBgmDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, BGM_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetBgm() {
  const db = await openBgmDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(BGM_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbClearBgm() {
  const db = await openBgmDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(BGM_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const Audio = {
  _ctx:                null,
  _masterGain:         null,
  _musicGain:          null,
  _bgmAudio:           null,
  _isPausedBySystem:   false,
  _bgmResumeAttempted: false, // 防止 init() 的 once 監聽器（click/touchend 各一個）重複觸發接續播放

  get _enabled()      { return useGameStore.getState().settings?.soundEnabled ?? true; },
  get _volume()       { return useGameStore.getState().settings?.volume       ?? 0.7; },
  get _musicVolume()  { return useGameStore.getState().settings?.musicVolume  ?? 0.5; },
  get _musicEnabled() { return useGameStore.getState().settings?.musicEnabled ?? false; },

  init() {
    const initCtx = () => {
      if (this._ctx) return;
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this._volume;
        this._masterGain.connect(this._ctx.destination);
        this._musicGain = this._ctx.createGain();
        this._musicGain.gain.value = this._musicVolume;
        this._musicGain.connect(this._ctx.destination);
      } catch(e) { console.warn('[Audio] Context 建立失敗', e); }

      // 瀏覽器的自動播放限制：<audio>.play() 一定要在使用者手動互動之後才會成功，
      // 所以「重新整理/重開 App 後接續播放上次的 BGM」也只能掛在這個 once 監聽器裡，
      // 玩家第一次點畫面的當下順便嘗試接續播放（如果上次是開著音樂離開的）。
      this._resumeBgmIfEnabled();
    };

    document.addEventListener('click',    initCtx, { once: true });
    document.addEventListener('touchend', initCtx, { once: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this._bgmAudio && !this._bgmAudio.paused) {
          this._bgmAudio.pause();
          this._isPausedBySystem = true;
        }
      } else {
        if (this._musicEnabled && this._isPausedBySystem && this._bgmAudio) {
          this._bgmAudio.play().catch(() => {});
          this._isPausedBySystem = false;
        }
      }
    });
  },

  play(type) {
    if (!this._enabled || !this._ctx) return;
    if (this._ctx.state === 'suspended') this._ctx.resume();

    const sounds = {
      taskComplete: { type:'sine',     freq:[440,660],         dur:0.15, vol:0.4 },
      taskUndo:     { type:'sine',     freq:[330,220],         dur:0.12, vol:0.25 },
      levelUp:      { type:'triangle', freq:[440,550,660],     dur:0.2,  vol:0.5 },
      goldGain:     { type:'sine',     freq:[880],             dur:0.08, vol:0.3 },
      purchase:     { type:'sine',     freq:[550,660],         dur:0.12, vol:0.35 },
      error:        { type:'sine',     freq:[330,220],         dur:0.12, vol:0.25 },
      toast:        { type:'sine',     freq:[660],             dur:0.1,  vol:0.2 },
      click:        { type:'sine',     freq:[440],             dur:0.05, vol:0.15 },
      achievement:  { type:'triangle', freq:[440,550,660,880], dur:0.18, vol:0.5 },
      open:         { type:'sine',     freq:[520,620],         dur:0.1,  vol:0.2 },
      close:        { type:'sine',     freq:[400,320],         dur:0.1,  vol:0.2 },
      toggle_on:    { type:'sine',     freq:[480,600],         dur:0.1,  vol:0.25 },
      toggle_off:   { type:'sine',     freq:[400,320],         dur:0.1,  vol:0.2 },
      navigate:     { type:'sine',     freq:[500],             dur:0.07, vol:0.15 },
      save:         { type:'triangle', freq:[550,660],         dur:0.15, vol:0.3 },
      delete:       { type:'sine',     freq:[330,220],         dur:0.12, vol:0.25 },
    };

    const s = sounds[type];
    if (!s) return;
    try {
      const freqs = Array.isArray(s.freq) ? s.freq : [s.freq];
      freqs.forEach((freq, i) => {
        setTimeout(() => {
          if (!this._ctx) return;
          const osc  = this._ctx.createOscillator();
          const gain = this._ctx.createGain();
          osc.connect(gain);
          gain.connect(this._masterGain);
          osc.type = s.type;
          osc.frequency.value = freq;
          const now = this._ctx.currentTime;
          gain.gain.setValueAtTime(s.vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
          osc.start(now);
          osc.stop(now + s.dur);
        }, i * (s.dur * 1000 * 0.8));
      });
    } catch(e) { console.warn('[Audio] play 失敗:', e); }
  },

  vibrate(type) {
    if (!useGameStore.getState().settings?.vibrationEnabled) return;
    if (!navigator.vibrate) return;
    const patterns = {
      taskComplete: [50], levelUp: [100,50,100],
      achievement: [100,50,200], error: [200],
      click: [15], toggle_on: [30], toggle_off: [20],
    };
    navigator.vibrate(patterns[type] || [30]);
  },

  feedback(type) { this.play(type); this.vibrate(type); },

  setVolume(v) {
    useGameStore.setState(s => ({ settings: { ...s.settings, volume: v } }));
    if (this._masterGain) this._masterGain.gain.value = v;
  },

  setMusicVolume(v) {
    useGameStore.setState(s => ({ settings: { ...s.settings, musicVolume: v } }));
    if (this._musicGain)  this._musicGain.gain.value = v;
    if (this._bgmAudio)   this._bgmAudio.volume = v;
  },

  setMusicEnabled(v) {
    useGameStore.setState(s => ({ settings: { ...s.settings, musicEnabled: v } }));
    v ? this.playGameBGM() : this.stopCustomBGM();
  },

  // ─── 播放「現在該播的 BGM」：有自訂音樂就播自訂的，沒有就播預設的 ───
  // 呼叫時機：① 玩家在 Settings 手動開啟音樂開關 ② App 啟動後第一次互動時嘗試接續播放
  async playGameBGM() {
    const settings = useGameStore.getState().settings ?? {};
    if (!settings.musicEnabled) return;
    if (this._ctx?.state === 'suspended') this._ctx.resume();

    if (settings.customBGM === 'custom') {
      try {
        const blob = await idbGetBgm();
        if (blob) {
          this.playCustomBGM(URL.createObjectURL(blob));
          return;
        }
      } catch (e) {
        console.warn('[Audio] 讀取自訂音樂失敗，改播預設音樂:', e);
      }
      // IndexedDB 裡找不到資料（例如清過瀏覽器資料、換了瀏覽器）：
      // 旗標跟實際資料對不上，順手修正回 null，避免下次又白跑一趟
      useGameStore.setState(s => ({ settings: { ...s.settings, customBGM: null } }));
    }

    this.playCustomBGM('audio/default_bgm.mp3');
  },

  // 底層播放器：不分自訂或預設，統一都是 <audio> 播放 + loop
  playCustomBGM(url) {
    if (!useGameStore.getState().settings?.musicEnabled) return;
    this.stopCustomBGM();
    try {
      this._bgmAudio = new window.Audio(url);
      this._bgmAudio.loop   = true;
      this._bgmAudio.volume = this._musicVolume;
      this._bgmAudio.play().catch(() => {});
    } catch(e) { console.warn('[Audio] BGM 失敗:', e); }
  },

  stopCustomBGM() {
    if (this._bgmAudio) {
      this._bgmAudio.pause();
      this._bgmAudio.currentTime = 0;
      this._bgmAudio = null;
    }
  },

  // ─── 上傳自訂 BGM：存進 IndexedDB（跨重整/重開持久化）＋立即播放 ───
  async uploadCustomBGM(file) {
    try {
      await idbSetBgm(file);
    } catch (e) {
      // 寫入失敗（例如無痕模式限制儲存）不擋播放，只是這次重整後會失效
      console.warn('[Audio] 自訂音樂寫入 IndexedDB 失敗，僅本次分頁有效:', e);
    }
    useGameStore.setState(s => ({ settings: { ...s.settings, customBGM: 'custom' } }));
    this.playCustomBGM(URL.createObjectURL(file));
  },

  // ─── 清除自訂 BGM：連 IndexedDB 裡的資料一起清掉，退回預設音樂 ───
  async clearCustomBGM() {
    try {
      await idbClearBgm();
    } catch (e) {
      console.warn('[Audio] 清除自訂音樂失敗:', e);
    }
    useGameStore.setState(s => ({ settings: { ...s.settings, customBGM: null } }));
    this.stopCustomBGM();
    this.playGameBGM();
  },

  // ─── App 重新整理/重開後，第一次使用者互動時嘗試接續播放上次的 BGM ───
  _resumeBgmIfEnabled() {
    if (this._bgmResumeAttempted) return;
    this._bgmResumeAttempted = true;
    if (this._bgmAudio) return; // 已經在播了（理論上不會發生，防呆用）
    this.playGameBGM();
  },
};