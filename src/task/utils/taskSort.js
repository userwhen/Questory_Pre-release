/* src/utils/taskSort.js */
export function isDailyTask(task) {
  if (!task.recurrence || typeof task.recurrence !== 'object') return false;
  return task.recurrence.unit === 'day' && (parseInt(task.recurrence.interval) || 1) === 1;
}

export function isRecurringTask(task) {
  if (!task.recurrence || typeof task.recurrence !== 'object') return false;
  return !!task.recurrence.unit;
}

const UNIT_DAYS = { day: 1, week: 7, month: 30, year: 365 };

export function getRecurrencePeriodDays(task) {
  if (isDailyTask(task)) return 1;
  if (!task.recurrence || typeof task.recurrence !== 'object') return null;
  const interval = parseInt(task.recurrence.interval) || 1;
  const unitDays = UNIT_DAYS[task.recurrence.unit] || 1;
  return interval * unitDays;
}

export function isRecurringTaskDue(task, now = Date.now()) {
  const periodDays = getRecurrencePeriodDays(task);
  if (periodDays === null || !task.doneTime) return false;
  const daysSince = Math.floor((now - task.doneTime) / 86400000);
  return daysSince >= periodDays;
}

export function isTaskOverdue(task, now = Date.now()) {
  return !task.done && !!task.deadline && new Date(task.deadline).getTime() < now;
}

// 每週指定星期幾模式：unit 為 week 且有指定 days 才算這種模式
export function isWeekdayDue(task, now = Date.now()) {
  const days = task.recurrence?.days || [];
  if (task.recurrence?.unit !== 'week' || days.length === 0) return false;
  return days.includes(new Date(now).getDay());
}

// 統一入口：今天這個循環任務該不該重置（daily / 每週指定星期幾 / interval 三種模式都涵蓋）
export function isTaskDueForReset(task, now = Date.now()) {
  if (isDailyTask(task)) return true;
  const days = task.recurrence?.days || [];
  if (task.recurrence?.unit === 'week' && days.length > 0) return isWeekdayDue(task, now);
  return isRecurringTaskDue(task, now);
}
export function sortTasks(tasks, categoryFilter) {
  const todayStr = new Date().toDateString();

  const filtered = (tasks || []).filter(t => {
    if (categoryFilter && categoryFilter !== '全部' && t.cat !== categoryFilter) return false;
    if (!t.done) return true;
    if (isRecurringTask(t)) return true;
    if (t.doneTime && new Date(t.doneTime).toDateString() === todayStr) return true;
    return false;
  });

  return filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const sa = (parseInt(a.importance || 1) * 1.5) + (parseInt(a.urgency || 1) * 0.5);
    const sb = (parseInt(b.importance || 1) * 1.5) + (parseInt(b.urgency || 1) * 0.5);
    if (sa !== sb) return sb - sa;
    const ta = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const tb = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return ta - tb;
  });
}

// 用本地時區組日期字串，避免 toISOString() 的 UTC 轉換造成日期偏移一天
export function toLocalDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// 給一個任務跟日期範圍（rangeStart/rangeEnd 皆為 Date），算出這個任務在範圍內所有會出現的日期（'YYYY-MM-DD' 陣列）
export function getOccurrenceDatesInRange(task, rangeStart, rangeEnd) {
  const dates   = [];
  const startMs = new Date(rangeStart).setHours(0, 0, 0, 0);
  const endMs   = new Date(rangeEnd).setHours(0, 0, 0, 0);
  const DAY_MS  = 86400000;

  // 有明確截止日的：只要落在範圍內就算一次（不論是否也有循環規則）
  if (task.deadline) {
    const d = new Date(task.deadline);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= startMs && d.getTime() <= endMs) {
      dates.push(toLocalDateStr(d));
    }

    // 非循環的一次性任務：逾期仍未完成時，除了原本 deadline 那天（維持歷史真實性）外，
    // 額外把「今天」也算進投影日期，讓行事曆持續提醒使用者尚未處理
    if (!isRecurringTask(task) && !task.done) {
      const todayMs = new Date().setHours(0, 0, 0, 0);
      if (d.getTime() < todayMs && todayMs >= startMs && todayMs <= endMs) {
        dates.push(toLocalDateStr(todayMs));
      }
    }
  }

  // 循環規則的額外投影：狩獵任務這種沒有截止日的，主要靠這段才會出現在行事曆上
  if (task.recurrence) {
    const weekDays = task.recurrence.days || [];
    if (task.recurrence.unit === 'week' && weekDays.length > 0) {
      for (let t = startMs; t <= endMs; t += DAY_MS) {
        if (weekDays.includes(new Date(t).getDay())) {
          dates.push(toLocalDateStr(t));
        }
      }
    } else {
      const interval = parseInt(task.recurrence.interval) || 1;
      const unitDays = UNIT_DAYS[task.recurrence.unit] || 1;
      const stepMs   = interval * unitDays * DAY_MS;

      if (stepMs > 0) {
        // 起始日現在是 task.startDate（跟 recurrence 脫鉤），不再是 task.recurrence.startDate
        let anchorMs = task.startDate
          ? new Date(task.startDate).setHours(0, 0, 0, 0)
          : new Date(task.createDate || Date.now()).setHours(0, 0, 0, 0);

        while (anchorMs < startMs) anchorMs += stepMs;
        while (anchorMs > startMs) anchorMs -= stepMs;

        for (let t = anchorMs; t <= endMs; t += stepMs) {
          if (t >= startMs) dates.push(toLocalDateStr(t));
        }      }
    }
  }

  return [...new Set(dates)]; // 去重：同時有截止日又符合循環規則時可能重複算到同一天
}
// 依「選定日期」決定卡片該顯示什麼狀態、能不能互動：
//   - 非循環任務：只有一個實例，不受跨日重置影響，永遠顯示真實可互動狀態
//   - 循環任務 + 今天：顯示真實可互動狀態
//   - 循環任務 + 未來：顯示「尚未完成」的全新樣子，唯讀
//   - 循環任務 + 過去：查 history（用 doneTime 換算當地日期比對）顯示當天實際完成紀錄；
//                      找不到紀錄則顯示「尚未完成」的全新樣子，皆唯讀
export function resolveTaskForDate(task, dateStr, history = [], todayStr) {
  const today = todayStr || toLocalDateStr(new Date());

  if (!isRecurringTask(task)) {
    return { task, readOnly: false };
  }

  if (dateStr === today) {
    return { task, readOnly: false };
  }

  const freshTask = () => ({
    ...task,
    done: false,
    doneTime: null,
    curr: task.type === 'count' ? 0 : task.curr,
    subs: task.subs ? task.subs.map(s => ({ ...s, done: false })) : task.subs,
  });

  if (dateStr > today) {
    return { task: freshTask(), readOnly: true };
  }

  const record = history.find(h => h.id === task.id && h.doneTime && toLocalDateStr(h.doneTime) === dateStr);
  if (record) {
    return { task: record, readOnly: true };
  }

  return { task: freshTask(), readOnly: true };
}