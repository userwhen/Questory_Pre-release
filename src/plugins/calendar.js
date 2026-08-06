/* src/plugins/calendar.js */
import { getState, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export const Calendar = {
  async addTask(task) {
    if (!task.deadline) {
      EventBus.emit(Events.System.TOAST, '❌ 此任務沒有截止日');
      return false;
    }

    if (task.calendarSynced) {
      await this._unsyncTask(task);
      return false;
    }

    const settings = getState().settings ?? {};
    if (!settings.preferredCalendarId) {
      return { needsCalendarSelect: true, task };
    }

    const calResult   = await this._writeToCalendar(task);
    const notifResult = await this._scheduleDeadlineNotification(task);

    if (calResult || notifResult) {
      setState(s => ({
        tasks: (s.tasks ?? []).map(t => t.id !== task.id ? t : {
          ...t,
          calendarSynced:   true,
          calendarSyncTime: Date.now(),
          calendarEventId:  typeof calResult === 'string' ? calResult
                          : calResult === true ? `mock_${task.id}` : null,
        }),
      }));
    }

    const msg = calResult && notifResult ? '📅 已加入行事曆並設定提醒'
              : calResult                ? '📅 已加入行事曆'
              : notifResult             ? '🔔 已設定截止日提醒'
              :                           '⚠️ 寫入失敗，請確認權限';
    EventBus.emit(Events.System.TOAST, msg);
    return calResult || notifResult;
  },

  async markAsDoneInCalendar(task) {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins?.LocalNotifications) {
      try {
        const baseId = this._taskNotifId(task.id);
        await Capacitor.Plugins.LocalNotifications.cancel({
          notifications: [{ id: baseId }, { id: baseId + 1 }],
        });
      } catch(e) {}
    }

    if (!task.calendarSynced || typeof Capacitor === 'undefined' || !Capacitor.Plugins?.CapacitorCalendar) return;

    try {
      const { CapacitorCalendar } = Capacitor.Plugins;
      if (task.calendarEventId) {
        if (CapacitorCalendar.deleteEventById) {
          await CapacitorCalendar.deleteEventById({ id: task.calendarEventId }).catch(() => {});
        } else if (CapacitorCalendar.deleteEventsById) {
          await CapacitorCalendar.deleteEventsById({ ids: [task.calendarEventId] }).catch(() => {});
        }
      }
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 60 * 1000);
      const result = await CapacitorCalendar.createEvent({
        title:     `✓ ${task.title}`,
        notes:     `完成時間：${now.toLocaleString()}\n分類：${task.cat || '未分類'}\n獎勵：+${task.lastReward?.gold || 0}💰 +${task.lastReward?.exp || 0}✨`,
        startDate: now.getTime(),
        endDate:   end.getTime(),
        isAllDay:  false,
      });
      if (result?.eventId || result?.id) {
        setState(s => ({
          tasks: (s.tasks ?? []).map(t => t.id !== task.id ? t : {
            ...t, calendarEventId: String(result.eventId || result.id),
          }),
        }));
      }
    } catch(e) { console.warn('[Calendar] markAsDone 失敗:', e); }
  },

  async selectCalendar() {
    try {
      if (typeof Capacitor !== 'undefined' && Capacitor.Plugins?.CapacitorCalendar) {
        const { CapacitorCalendar } = Capacitor.Plugins;
        await CapacitorCalendar.requestAllPermissions?.();
        const result = await CapacitorCalendar.listCalendars();
        return result.calendars ?? [];
      }
      return [
        { id: 'mock-google', title: 'Google 行事曆',  source: 'test@gmail.com' },
        { id: 'mock-local',  title: '本機預設行事曆', source: 'local' },
      ];
    } catch(e) {
      console.error('[Calendar] 列出行事曆失敗:', e);
      return [];
    }
  },

  setPreferredCalendar(calendarId) {
    setState(s => ({ settings: { ...s.settings, preferredCalendarId: calendarId } }));
    EventBus.emit(Events.System.TOAST, '✅ 已綁定行事曆帳戶！');
  },

  async _unsyncTask(task) {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins?.CapacitorCalendar && task.calendarEventId) {
      try {
        const { CapacitorCalendar } = Capacitor.Plugins;
        if (CapacitorCalendar.deleteEventById) {
          await CapacitorCalendar.deleteEventById({ id: task.calendarEventId });
        }
      } catch(e) { console.warn('[Calendar] 刪除行事曆事件失敗:', e); }
    }
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins?.LocalNotifications) {
      try {
        const baseId = this._taskNotifId(task.id);
        await Capacitor.Plugins.LocalNotifications.cancel({
          notifications: [{ id: baseId }, { id: baseId + 1 }],
        });
      } catch(e) {}
    }
    setState(s => ({
      tasks: (s.tasks ?? []).map(t => t.id !== task.id ? t : {
        ...t, calendarSynced: false, calendarSyncTime: null, calendarEventId: null,
      }),
    }));
    EventBus.emit(Events.System.TOAST, '🗓️ 已取消行事曆同步');
  },

  async _writeToCalendar(task) {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins?.CapacitorCalendar) return true;
    try {
      const { CapacitorCalendar } = Capacitor.Plugins;
      const perm = await CapacitorCalendar.requestWriteOnlyCalendarAccess?.()
                ?? await CapacitorCalendar.requestAllPermissions?.();
      if (!perm?.result?.includes('granted') && !perm?.granted) {
        EventBus.emit(Events.System.TOAST, '❌ 請開放行事曆權限');
        return false;
      }
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      const endTime = new Date(task.deadline);
      endTime.setHours(23, 59, 0, 0);
      const settings  = getState().settings ?? {};
      const eventData = {
        title:     `${task.title} [Questory]`,
        notes:     task.desc || '來自 Questory 的任務',
        startDate: deadline.getTime(),
        endDate:   endTime.getTime(),
        isAllDay:  true,
        ...(settings.preferredCalendarId ? { calendarId: settings.preferredCalendarId } : {}),
      };
      const result = await CapacitorCalendar.createEvent(eventData);
      return result?.eventId ? String(result.eventId) : result?.id ? String(result.id) : true;
    } catch(e) {
      EventBus.emit(Events.System.TOAST, '❌ 行事曆寫入失敗');
      return false;
    }
  },

  async _scheduleDeadlineNotification(task) {
    if (typeof Capacitor === 'undefined' || !Capacitor.Plugins?.LocalNotifications) return true;
    try {
      const settings = getState().settings ?? {};
      const notifyAt = new Date(task.deadline);
      notifyAt.setHours(settings.notifyDailyHour ?? 9, settings.notifyDailyMinute ?? 0, 0, 0);
      if (notifyAt <= new Date()) return true;
      await Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [{
          id:           this._taskNotifId(task.id),
          title:        '⏰ 任務截止提醒',
          body:         `「${task.title}」今天到期了！`,
          schedule:     { at: notifyAt },
          sound:        'default',
          smallIcon:    'ic_notification',
          channelId:    'quest-deadline',
          actionTypeId: 'TASK_ACTION',
          extra:        { taskId: task.id },
        }],
      });
      return true;
    } catch(e) { return false; }
  },

  _taskNotifId(taskId) {
    let hash = 5000;
    for (let i = 0; i < taskId.length; i++) {
      hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 90000 + 5000;
  },
};