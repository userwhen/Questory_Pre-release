import { useGameStore } from '@/core/state.js';

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

  // ─── 播放預設 BGM ───────────────────────────────────
  // 呼叫時機：① 玩家在 Settings 手動開啟音樂開關 ② App 啟動後第一次互動時嘗試接續播放
  // 初版裁切：自訂BGM上傳功能跟訂閱系統一起拿掉，這裡一律播預設音樂。
  async playGameBGM() {
    const settings = useGameStore.getState().settings ?? {};
    if (!settings.musicEnabled) return;
    if (this._ctx?.state === 'suspended') this._ctx.resume();
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

  // ─── App 重新整理/重開後，第一次使用者互動時嘗試接續播放上次的 BGM ───
  _resumeBgmIfEnabled() {
    if (this._bgmResumeAttempted) return;
    this._bgmResumeAttempted = true;
    if (this._bgmAudio) return; // 已經在播了（理論上不會發生，防呆用）
    this.playGameBGM();
  },
};