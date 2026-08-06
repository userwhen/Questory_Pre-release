import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export const CheckinEngine = {
  init: makeIdempotentInit(function () {
    // 啟動時先做一次月份對齊
    this.initSession();

    // 監聽每日重置，自動切換新月份
    const unsubReset = EventBus.on(Events.System.DAILY_RESET, () => {
      this.initSession();
    });

    // 模式 A：查詢類（不需要 requestId，直接回應）
    const unsubSession = EventBus.on(Events.Checkin.REQUEST_INIT_SESSION, () => {
      this.initSession();
      const daysInMonth = this.getDaysInMonth();
      EventBus.emit(Events.Checkin.SESSION_READY, { daysInMonth });
    });

    // 模式 B：操作類（需要 requestId 隔離回應，搭配 EventHelper.requestOnce 使用）
    const unsubCheckIn = EventBus.on(Events.Checkin.REQUEST_CHECKIN_TODAY, ({ requestId }) => {
      const result = this.checkInToday();
      EventBus.emit(Events.Checkin.RESULT, { ...result, requestId });
    });
    const unsubMakeup = EventBus.on(Events.Checkin.REQUEST_MAKEUP, ({ dayIdx, requestId }) => {
      const result = this.makeupCheckIn(dayIdx);
      EventBus.emit(Events.Checkin.RESULT, { ...result, requestId });
    });
    const unsubWeek = EventBus.on(Events.Checkin.REQUEST_CLAIM_WEEK, ({ requestId }) => {
      const result = this.claimWeekReward();
      EventBus.emit(Events.Checkin.RESULT, { ...result, requestId });
    });
    const unsubMonth = EventBus.on(Events.Checkin.REQUEST_CLAIM_MONTH, ({ requestId }) => {
      const result = this.claimMonthReward();
      EventBus.emit(Events.Checkin.RESULT, { ...result, requestId });
    });

    return [unsubReset, unsubSession, unsubCheckIn, unsubMakeup, unsubWeek, unsubMonth];
  }),

  getDaysInMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  },

  initSession() {
    setState(s => {
      const checkin = s.checkin ?? {
        month: new Date().getMonth(),
        days: [], claimed7: 0,
        lastClaimedWeek: 0, claimedMonth: false,
      };
      checkin.lastClaimedWeek ??= 0;
      checkin.claimedMonth    ??= false;

      const currentMonth = new Date().getMonth();
      if (checkin.month !== currentMonth) {
        checkin.month        = currentMonth;
        checkin.days         = [];
        checkin.claimedMonth = false;
      }
      return { checkin };
    });
  },

  checkInToday() {
    const s = getState();
    const todayIdx = new Date().getDate() - 1;
    if (s.checkin?.days?.[todayIdx]) return { success: false, msg: '今天已經簽到過囉！' };

    let streak = 0;
    const days = [...(s.checkin?.days ?? [])];
    days[todayIdx] = true;
    for (let i = todayIdx; i >= 0; i--) {
      if (days[i]) streak++;
      else break;
    }

    setState(store => ({
      checkin: { ...store.checkin, days },
      loginStreak: streak,
      gold: (store.gold ?? 0) + 50,
    }));

    EventBus.emit(Events.Stats.UPDATED);
    return { success: true };
  },

  claimWeekReward() {
    const s = getState();
    const streak = s.loginStreak ?? 0;
    if (streak > 0 && streak % 7 === 0 && s.checkin?.lastClaimedWeek !== streak) {
      setState(store => ({
        checkin: { ...store.checkin, lastClaimedWeek: streak },
        dailyBuff: { goldRate: 2.0, expRate: 2.0 },
      }));
      return { success: true };
    }
    return { success: false, msg: '尚未達成 7 天，或已錯過領取時機！' };
  },

  claimMonthReward() {
    const s       = getState();
    const total   = this.getDaysInMonth();
    const checked = (s.checkin?.days ?? []).filter(Boolean).length;

    if (checked < total || s.checkin?.claimedMonth) {
      return { success: false, msg: '尚未達成滿月全勤！' };
    }

    setState(store => ({
      checkin: { ...store.checkin, claimedMonth: true },
      gold: (store.gold ?? 0) + 500,
    }));
    EventBus.emit(Events.Stats.UPDATED);
    return { success: true };
  },

  makeupCheckIn(dayIdx) {
    const s = getState();
    const ticketIdx = (s.bag ?? []).findIndex(i => i.id === 'sys_makeup_ticket' && i.count > 0);
    const hasTicket = ticketIdx >= 0;

    if (!hasTicket) {
      const totalGem = (s.freeGem ?? 0) + (s.paidGem ?? 0);
      if (totalGem < 50) return { success: false, msg: '補簽券與鑽石皆不足！(需 50 鑽石)' };
      setState(store => {
        const fd = Math.min(50, store.freeGem ?? 0);
        return { freeGem: (store.freeGem ?? 0) - fd, paidGem: (store.paidGem ?? 0) - (50 - fd) };
      });
    } else {
      setState(store => {
        const bag = store.bag.map((item, i) =>
          i === ticketIdx ? { ...item, count: item.count - 1 } : item
        ).filter(item => item.count > 0);
        return { bag };
      });
    }

    setState(store => {
      const days = [...(store.checkin?.days ?? [])];
      days[dayIdx] = true;
      return { checkin: { ...store.checkin, days }, gold: (store.gold ?? 0) + 20 };
    });

    EventBus.emit(Events.Stats.UPDATED);
    return { success: true, usedTicket: hasTicket };
  },
};