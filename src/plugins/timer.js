import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export const TimerEngine = {
  POMODORO_WORK:  25 * 60,
  POMODORO_BREAK: 5  * 60,

  _interval:    null,
  _startTime:   0,
  _callbacks:   {},

  on(event, cb)  { this._callbacks[event] = cb; },
  off(event)     { delete this._callbacks[event]; },
  _emit(event, data) { this._callbacks[event]?.(data); },

  start({ mode, total, phase = 'work', focusLocked = false }) {
    this._stop();
    this._startTime = Date.now();
    this._mode        = mode;
    this._total       = total;
    this._elapsed     = 0;
    this._phase       = phase;
    this._focusLocked = focusLocked;

    this._scheduleBgAlarm(total);

    this._interval = setInterval(() => {
      this._elapsed = Math.floor((Date.now() - this._startTime) / 1000);

      if (mode === 'stopwatch') {
        this._emit('tick', { elapsed: this._elapsed });
        return;
      }

      const remaining = total - this._elapsed;
      if (remaining <= 0) {
        this._elapsed = total;
        this._stop();
        this._cancelBgAlarm();
        this._onComplete(mode, total, phase);
      } else {
        this._emit('tick', { elapsed: this._elapsed, remaining });
      }
    }, 1000);

    this._emit('started', { mode, total, phase });
  },

  pause() {
    if (!this._interval) return;
    this._stop();
    this._cancelBgAlarm();
    this._emit('paused', { elapsed: this._elapsed });
  },

  resume({ mode, total, phase, focusLocked }) {
    this._startTime = Date.now() - (this._elapsed * 1000);
    this.start({ mode, total, phase, focusLocked });
  },

  stop() {
    this._stop();
    this._cancelBgAlarm();
    this._emit('stopped', {});
  },

  _stop() {
    clearInterval(this._interval);
    this._interval = null;
  },

  _onComplete(mode, total, phase) {
    const elapsed = this._elapsed;

    if (mode === 'pomodoro' && phase === 'work') {
      this._emit('pomodoroBreak', { elapsed });
      return;
    }

    this._giveReward(mode, elapsed);
    this._emit('completed', { mode, total, elapsed, phase });
  },

  _giveReward(mode, elapsed) {
    const minutes = Math.floor(elapsed / 60);
    if (minutes < 1) return;

    const expReward = Math.min(minutes * 5, 300);
    useGameStore.setState(s => ({ exp: (s.exp ?? 0) + expReward }));
    EventBus.emit(Events.Stats.UPDATED);
    EventBus.emit(Events.System.TOAST, `⏱️ 專注完成！獲得 ${expReward} EXP`);
    EventBus.emit(Events.Timer.COMPLETED, { mode, minutes });
  },

  async _scheduleBgAlarm(totalSeconds) {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins?.LocalNotifications) return;
    try {
      const LN   = Capacitor.Plugins.LocalNotifications;
      const perm = await LN.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LN.requestPermissions();
        if (req.display !== 'granted') return;
      }
      const endMs = Date.now() + totalSeconds * 1000;
      await LN.schedule({
        notifications: [{
          id: 8888, title: '⏰ 時間到囉！',
          body: '你的計時已完成，快回來看！',
          schedule: { at: new Date(endMs), allowWhileIdle: true },
          sound: 'default', channelId: 'quest-reminder',
        }],
      });
    } catch(e) { console.warn('[Timer] 背景通知排程失敗', e); }
  },

  _cancelBgAlarm() {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins?.LocalNotifications) return;
    Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: 8888 }] }).catch(() => {});
  },
};