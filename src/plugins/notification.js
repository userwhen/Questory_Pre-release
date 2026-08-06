import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export const Notification = {
  DEFAULTS: {
    dailyHour: 9, dailyMinute: 0,
    streakWarningHour: 21, streakWarningMinute: 0,
    enabled: false,
  },

  async init() {
    EventBus.on(Events.Task.CREATED, () => this.scheduleAll());
    EventBus.on(Events.Task.UPDATED, () => this.scheduleAll());
    EventBus.on(Events.Task.DELETED, () => this.scheduleAll());

    if (typeof Capacitor === 'undefined') return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      if (!LocalNotifications) return;

      await LocalNotifications.registerActionTypes({
        types: [{
          id: 'TASK_ACTION',
          actions: [
            { id: 'complete', title: '✅ 完成' },
            { id: 'snooze',   title: '⏰ 延後 1 小時' },
          ],
        }],
      });

      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const taskId = action.notification.extra?.taskId;
        if (!taskId) return;
        const s = useGameStore.getState();
        const task = (s.tasks ?? []).find(t => t.id === taskId);
        if (!task) return;

        if (action.actionId === 'complete' && !task.done) {
          import('@/task/engines/task.js').then(({ TaskEngine }) => TaskEngine.resolveTask(taskId));
          EventBus.emit(Events.System.TOAST, '✅ 任務已從通知列完成！');
        } else if (action.actionId === 'snooze') {
          const newTime = new Date(Date.now() + 3600000);
          const offset  = newTime.getTimezoneOffset() * 60000;
          useGameStore.setState(store => ({
            tasks: (store.tasks ?? []).map(t =>
              t.id !== taskId ? t : { ...t, deadline: new Date(newTime - offset).toISOString().slice(0, 16) }
            ),
          }));
          this.scheduleAll();
          EventBus.emit(Events.System.TOAST, '⏰ 任務已延後 1 小時');
        }
      });

      const settings = useGameStore.getState().settings ?? {};
      if (settings.notificationEnabled) await this.scheduleAll();
    } catch(e) { console.warn('[Notification] init 失敗:', e); }
  },

  async requestPermission() {
    if (typeof Capacitor === 'undefined') {
      EventBus.emit(Events.System.TOAST, '⚠️ 通知功能需要安裝版 App');
      return false;
    }
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      EventBus.emit(Events.System.TOAST, granted ? '🔔 通知已開啟！' : '❌ 通知權限被拒絕');
      return granted;
    } catch(e) { return false; }
  },

  async scheduleAll() {
    if (typeof Capacitor === 'undefined') return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      await LocalNotifications.cancel({
        notifications: [
          { id: 1001 }, { id: 1002 },
          ...Array.from({ length: 50 }, (_, i) => ({ id: 2000 + i })),
          ...Array.from({ length: 50 }, (_, i) => ({ id: 3000 + i })),
        ],
      });

      const settings = useGameStore.getState().settings ?? {};
      const notifications = [];

      if (settings.notificationEnabled) {
        const dailyTime = this._getNextTime(
          settings.notifyDailyHour   ?? this.DEFAULTS.dailyHour,
          settings.notifyDailyMinute ?? this.DEFAULTS.dailyMinute,
        );
        notifications.push({
          id: 1001, title: '⚔️ 今日任務等你完成！',
          body: this._getDailyBody(),
          schedule: { at: dailyTime, repeats: true, every: 'day' },
          sound: 'default', smallIcon: 'ic_notification', channelId: 'quest-reminder',
        });

        if (settings.notifyStreakWarning !== false) {
          const streak    = useGameStore.getState().loginStreak ?? 0;
          const lastLogin = useGameStore.getState().lastLoginDate;
          if (streak > 0 && lastLogin !== new Date().toDateString()) {
            const streakTime = this._getNextTime(
              settings.notifyStreakHour   ?? this.DEFAULTS.streakWarningHour,
              settings.notifyStreakMinute ?? this.DEFAULTS.streakWarningMinute,
            );
            notifications.push({
              id: 1002, title: `🔥 連續 ${streak} 天！今天還沒回來`,
              body: '再不登入，連續天數就要歸零了！',
              schedule: { at: streakTime },
              sound: 'default', smallIcon: 'ic_notification', channelId: 'quest-reminder',
            });
          }
        }

        if (settings.notifyDeadline !== false) {
          notifications.push(...this._buildDeadlineNotifications());
        }
        if (settings.notifyStartDate !== false) {
          notifications.push(...this._buildStartDateNotifications());
        }
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    } catch(e) { console.warn('[Notification] scheduleAll 失敗:', e); }
  },

  _buildDeadlineNotifications() {
    const tasks  = useGameStore.getState().tasks ?? [];
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    let counter  = 0;

    tasks.forEach(task => {
      if (!task.deadline || task.done) return;
      const mode = task.reminderMode || 'none';
      if (mode === 'none') return;

      const dl = new Date(task.deadline);

      if (mode === 'dayOf') {
        const dlDay = new Date(dl);
        dlDay.setHours(0, 0, 0, 0);
        if (dlDay.getTime() !== today.getTime()) return;

        const notifyAt = new Date();
        notifyAt.setHours(8, 0, 0, 0);
        if (notifyAt < new Date()) notifyAt.setTime(Date.now() + 3600000);

        result.push({
          id: 2000 + counter++,
          title: '⏰ 今日截止任務提醒',
          body: `「${task.title}」今天就是截止日！`,
          schedule: { at: notifyAt },
          sound: 'default', smallIcon: 'ic_notification',
          channelId: 'quest-deadline',
          actionTypeId: 'TASK_ACTION',
          extra: { taskId: task.id },
        });
      } else if (mode === 'atDeadline') {
        if (dl <= new Date()) return;
        result.push({
          id: 2000 + counter++,
          title: '⏰ 任務截止提醒',
          body: `「${task.title}」截止時間到了！`,
          schedule: { at: dl },
          sound: 'default', smallIcon: 'ic_notification',
          channelId: 'quest-deadline',
          actionTypeId: 'TASK_ACTION',
          extra: { taskId: task.id },
        });
      }
    });
    return result;
  },
  _buildStartDateNotifications() {
    const tasks  = useGameStore.getState().tasks ?? [];
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    let counter  = 0;

    tasks.forEach(task => {
      if (!task.startDate || !task.notifyOnStart || task.done) return;
      const sd = new Date(`${task.startDate}T00:00:00`);
      sd.setHours(0, 0, 0, 0);
      if (sd.getTime() !== today.getTime()) return;

      const notifyAt = new Date();
      notifyAt.setHours(8, 0, 0, 0);
      if (notifyAt < new Date()) notifyAt.setTime(Date.now() + 3600000);

      result.push({
        id: 3000 + counter++,
        title: '🚩 任務開始提醒',
        body: `「${task.title}」今天開始囉！`,
        schedule: { at: notifyAt },
        sound: 'default', smallIcon: 'ic_notification',
        channelId: 'quest-reminder',
        actionTypeId: 'TASK_ACTION',
        extra: { taskId: task.id },
      });
    });
    return result;
  },

  _getNextTime(hour, minute) {
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= new Date()) target.setDate(target.getDate() + 1);
    return target;
  },

  _getDailyBody() {
    const tasks = (useGameStore.getState().tasks ?? []).filter(t => !t.done && (t.cat === '日常' || t.recurrence));
    if (tasks.length === 0) return '今天的任務都完成了嗎？去看看有沒有新的！';
    if (tasks.length === 1) return `還有 1 個任務「${tasks[0].title}」等你完成！`;
    return `還有 ${tasks.length} 個任務等你完成，加油！`;
  },

  async createChannels() {
    if (typeof Capacitor === 'undefined') return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      await LocalNotifications.createChannel({ id:'quest-reminder', name:'每日提醒', importance:4, sound:'default', vibration:true });
      await LocalNotifications.createChannel({ id:'quest-deadline', name:'截止日提醒', importance:5, sound:'default', vibration:true });
    } catch(e) {}
  },

  async disableAll() {
    if (typeof Capacitor === 'undefined') return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch(e) {}
  },
};