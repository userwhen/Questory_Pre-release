/* src/engines/task.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { isDailyTask, isRecurringTask, isTaskDueForReset, sortTasks } from '@/task/utils/taskSort.js';
import { getRewardWeight, getRewardRange } from '@/utils/rewardCurve.js';

let _taskIdCounter = 0;// 避免同一毫秒內連續 addTask（例如批次複製）撞到相同 id
let _rewardReqCounter = 0;
const _pendingRewardRequests = {}; // requestId -> { taskId, impact, combo }，等 RewardEngine 骰完結果回來對應用
export const TaskEngine = {
  _isDaily(task) {
    return isDailyTask(task);
  },

  init: makeIdempotentInit(function () {
    const unsubDailyReset = EventBus.on(Events.System.DAILY_RESET, () => this.resetDaily());

    const unsubHistorySummary = EventBus.on(Events.Task.REQUEST_HISTORY_SUMMARY, () => {
      EventBus.emit(Events.Task.HISTORY_SUMMARY_READY, this.getHistorySummary());
    });

    const unsubResolve = EventBus.on(Events.Task.REQUEST_RESOLVE, ({ id }) => this.resolveTask(id));
    const unsubIncrement = EventBus.on(Events.Task.REQUEST_INCREMENT, ({ id }) => this.incrementTask(id));
    const unsubToggleSub = EventBus.on(Events.Task.REQUEST_TOGGLE_SUB, ({ taskId, subIdx }) => this.toggleSubtask(taskId, subIdx));
    const unsubAdd = EventBus.on(Events.Task.REQUEST_ADD, (form) => this.addTask(form));
    const unsubUpdate = EventBus.on(Events.Task.REQUEST_UPDATE, (form) => this.updateTask(form));
    const unsubDelete = EventBus.on(Events.Task.REQUEST_DELETE, ({ id }) => this.deleteTask(id));
    const unsubBatchDelete = EventBus.on(Events.Task.REQUEST_BATCH_DELETE, ({ ids }) => { (ids || []).forEach(id => this.deleteTask(id)); });

    const unsubRewardResult = EventBus.on(Events.Reward.ROLL_RESULT, ({ requestId, gold, exp, coupon }) => {
      const pending = _pendingRewardRequests[requestId];
      if (!pending) return; // 不是本模組發出的請求，或已經處理過
      delete _pendingRewardRequests[requestId];
      this._finalizeCompletion(pending.taskId, pending.impact, pending.combo, { gold, exp, coupon });
    });

    return [unsubDailyReset, unsubHistorySummary, unsubResolve, unsubIncrement,
      unsubToggleSub, unsubAdd, unsubUpdate, unsubDelete, unsubBatchDelete, unsubRewardResult];
  }),

  resetDaily() {
    const s = getState();
    if (!s?.tasks) return;

    const now = Date.now();
    const oneDayMs = 86400000;
    const todayStr = new Date().toDateString();
    const isStrict = s.settings?.strictMode;

    setState(store => {
      const tasks = [...(store.tasks || [])];
      const history = [...(store.history || [])];

      const skills = (store.skills || []).map(sk => {
        const lastUsed = sk.lastUsed || sk.createDate || now;
        const daysGap = Math.floor((now - lastUsed) / oneDayMs);
        const isRusty = daysGap >= 3;
        if (isStrict && daysGap >= 7) {
          const decayAmount = Math.floor((daysGap - 6) * 1);
          EventBus.emit(Events.Stats.REDUCE_SKILL_PROFICIENCY, { skillName: sk.name, amount: decayAmount });
        }
        return { ...sk, isRusty };
      });

      tasks.forEach(t => {
        if (isRecurringTask(t) && t.done) {
          const alreadyRecorded = history.some(h => h.id === t.id && h.doneTime === t.doneTime);
          if (!alreadyRecorded) {
            history.push({ ...JSON.parse(JSON.stringify(t)), archivedDate: todayStr });
          }
        }
      });

      const resetTasks = tasks.map(t => {
        if (!isRecurringTask(t)) return t;
        if (!isTaskDueForReset(t, now)) return t;
        return {
          ...t,
          done: false,
          doneTime: null,
          ...(t.type === 'count' ? { curr: 0 } : {}),
          ...(t.subs ? { subs: t.subs.map(sub => ({ ...sub, done: false })) } : {}),
        };
      });

      return {
        tasks: resetTasks,
        history: history.slice(-500),
        skills,
        cal: { today: 0, logs: [] },
      };
    });
  },

  getSortedTasks(categoryFilter) {
    return sortTasks(getState().tasks, categoryFilter);
  },

  addTask(temp) {
    if (!temp.title?.trim()) return null;

    const newTask = {
      id: 't_' + Date.now() + '_' + (_taskIdCounter++),
      createDate: Date.now(),
      done: false,
      status: 'active',
      title: temp.title.trim(),
      desc: temp.desc || '',
      location: temp.location || '',
      cat: temp.cat || '日常',
      type: temp.type || 'normal',
      target: parseInt(temp.target) || 1,
      curr: 0,
      calories: parseInt(temp.calories) || 0,
      importance: parseInt(temp.importance) || 1,
      urgency: parseInt(temp.urgency) || 1,
      attrs: [...(temp.attrs || [])],
      subs: temp.subs ? JSON.parse(JSON.stringify(temp.subs)) : [],
      pinned: temp.pinned || false,
      startDate: temp.startDate || '',
      deadline: temp.deadline || '',
      recurrence: (!temp.recurrence || temp.recurrence === 'null' || temp.recurrence === '') ? null : temp.recurrence,
      subRule: temp.subRule || 'all',
      questClass: temp.questClass || 'guild',
      reminderMode: temp.reminderMode || 'none',
      narrativeText: temp.narrativeText || null,
      achLink: temp.achLink || null, // 保留在任務上，供成就詳情回溯來源任務用
    };
    setState(s => ({ tasks: [newTask, ...(s.tasks || [])] }));
    EventBus.emit(Events.Task.CREATED, newTask);
    EventBus.emit(Events.Ach.GENERATE_FOR_TAG, { cat: newTask.cat });

    if (temp.achLink?.mode === 'new' && temp.achLink.title?.trim()) {
      EventBus.emit(Events.Ach.REQUEST_CREATE_CONTAINER, { title: temp.achLink.title.trim(), taskId: newTask.id });
    } else if (temp.achLink?.mode === 'join' && temp.achLink.achievementId) {
      EventBus.emit(Events.Ach.REQUEST_ADD_MEMBER, { achievementId: temp.achLink.achievementId, taskId: newTask.id });
    }

    return newTask;
  },

  updateTask(temp) {
    const s = getState();

    setState(st => ({
      tasks: (st.tasks || []).map(t => t.id !== temp.id ? t : {
        ...t,
        title: temp.title,
        desc: temp.desc,
        location: temp.location || '',
        cat: temp.cat,
        type: temp.type,
        target: parseInt(temp.target) || 1,
        calories: parseInt(temp.calories) || 0,
        importance: parseInt(temp.importance) || 1,
        urgency: parseInt(temp.urgency) || 1,
        attrs: [...(temp.attrs || [])],
        subs: temp.subs ? JSON.parse(JSON.stringify(temp.subs)) : [],
        pinned: temp.pinned,
        startDate: temp.startDate || '',
        deadline: temp.deadline || '',
        recurrence: (!temp.recurrence || temp.recurrence === 'null' || temp.recurrence === '') ? null : temp.recurrence,
        subRule: temp.subRule || 'all',
        reminderMode: temp.reminderMode || 'none',
        narrativeText: temp.narrativeText || null,
        achLink: temp.achLink || null,
      }),
    }));
    EventBus.emit(Events.Task.UPDATED);

    // 成就歸屬異動：用「目前實際掛在哪個容器成就底下」當比對基準，不依賴 task.achLink（那只是建立當下的意圖紀錄）
    const currentContainer = (s.achievements || []).find(a =>
      a.targetType === 'manual_group' && (a.memberTaskIds || []).includes(temp.id));

    if (temp.achLink?.mode === 'join' && temp.achLink.achievementId) {
      if (currentContainer?.id !== temp.achLink.achievementId) {
        if (currentContainer) EventBus.emit(Events.Ach.REQUEST_REMOVE_MEMBER, { achievementId: currentContainer.id, taskId: temp.id });
        EventBus.emit(Events.Ach.REQUEST_ADD_MEMBER, { achievementId: temp.achLink.achievementId, taskId: temp.id });
      }
    } else if (temp.achLink?.mode === 'new' && temp.achLink.title?.trim()) {
      if (currentContainer) EventBus.emit(Events.Ach.REQUEST_REMOVE_MEMBER, { achievementId: currentContainer.id, taskId: temp.id });
      EventBus.emit(Events.Ach.REQUEST_CREATE_CONTAINER, { title: temp.achLink.title.trim(), taskId: temp.id });
    } else if (!temp.achLink && currentContainer) {
      EventBus.emit(Events.Ach.REQUEST_REMOVE_MEMBER, { achievementId: currentContainer.id, taskId: temp.id });
    }
  },

  deleteTask(id) {
    const s = getState();
    const task = (s.tasks || []).find(t => t.id === id);

    if (task?.done) {
      const actualReward = task.lastReward || { gold: 0, exp: 0, coupon: false };
      const isStrict = s.unlocks?.feature_strict && s.settings?.strictMode;

      setState(store => ({
        gold: isStrict
          ? (store.gold || 0) - actualReward.gold
          : Math.max(0, (store.gold || 0) - actualReward.gold),
        rewardCoupons: actualReward.coupon
          ? Math.max(0, (store.rewardCoupons || 0) - 1)
          : store.rewardCoupons,
      }));

      EventBus.emit(Events.Stats.REDUCE_PLAYER_EXP, { amount: actualReward.exp, isStrict });

      if (task.attrs?.length > 0) {
        task.attrs.forEach(skillName => {
          EventBus.emit(Events.Stats.REDUCE_SKILL_PROFICIENCY, { skillName, amount: 1 });
        });
      }
    }

    setState(store => ({
      tasks: (store.tasks || []).filter(t => t.id !== id),
      history: (store.history || []).filter(h => !(h.id === id && h.doneTime === task?.doneTime)),
    }));
    EventBus.emit(Events.Task.DELETED, { id });
  },

  previewRewards(imp, urg) {
    const w = getRewardWeight(imp, urg);
    return getRewardRange(w);
  },

  resolveTask(taskId) {
    const s = getState();
    const task = (s.tasks || []).find(t => t.id === taskId);
    if (!task) return;

    if (!task.done && task.type === 'count' && (task.curr || 0) < (task.target || 1)) {
      EventBus.emit(Events.System.TOAST, `🔒 尚未達成目標次數 (${task.curr || 0}/${task.target})`);
      return;
    }

    if (!task.done && task.subs?.length > 0 && task.type !== 'count') {
      const doneCount = task.subs.filter(sub => sub.done).length;
      const rule = task.subRule || 'all';
      if (rule === 'all' && doneCount < task.subs.length) {
        EventBus.emit(Events.System.TOAST, '🔒 請先完成所有步驟');
        return;
      }
      if (rule === 'any' && doneCount === 0) {
        EventBus.emit(Events.System.TOAST, '🔒 請至少完成一個步驟');
        return;
      }
    }

    const imp = parseInt(task.importance || 1);
    const urg = parseInt(task.urgency || 1);
    const impact = (imp * 1.5) + (urg * 0.5);

    if (!task.done) {
      // 完成任務：獎勵改成非同步跟 RewardEngine 要（含隨機性，走 requestId 模式避免競態），
      // 這裡只算「這次完成值不值得」的乘數（combo/祝福），實際數字讓 RewardEngine 骰
      const recentCount = (s.history || []).filter(h => h.doneTime && (Date.now() - h.doneTime) < 3600000).length;
      const combo = Math.min(recentCount, 4);
      const comboMultiplier = 1 + combo * 0.1;
      const enchantMultiplier = task.enchant?.boundAt ? 1.5 : 1;

      const requestId = 'rwd_' + Date.now() + '_' + (_rewardReqCounter++);
      _pendingRewardRequests[requestId] = { taskId, impact, combo };
      EventBus.emit(Events.Reward.REQUEST_ROLL, {
        requestId,
        importance: imp,
        urgency: urg,
        comboMultiplier,
        enchantMultiplier,
      });
      return;
    }

    // 撤銷已完成：回收先前實際發放的獎勵（含金幣券），這條路徑不含隨機性，維持同步
    const actualReward = task.lastReward || { gold: 0, exp: 0, coupon: false };
    const isStrict = s.unlocks?.feature_strict && s.settings?.strictMode;

    setState(store => {
      const oldTask = (store.tasks || []).find(t => t.id === taskId);
      const tasks = (store.tasks || []).map(t => t.id !== taskId ? t : {
        ...t, done: false, doneTime: null, status: 'active', lastReward: null,
      });
      const history = (store.history || []).filter(
        h => !(h.id === taskId && h.doneTime === oldTask?.doneTime)
      );
      const gold = isStrict
        ? (store.gold || 0) - actualReward.gold
        : Math.max(0, (store.gold || 0) - actualReward.gold);
      const rewardCoupons = actualReward.coupon
        ? Math.max(0, (store.rewardCoupons || 0) - 1)
        : store.rewardCoupons;
      const isCalActive = store.unlocks?.feature_cal || store.settings?.calMode;
      const cal = isCalActive && task.calories > 0
        ? {
          today: (store.cal?.today || 0) + task.calories,
          logs: [
            new Date().toTimeString().slice(0, 5) + ' (取消) ' + task.title + ' +' + task.calories,
            ...(store.cal?.logs || []),
          ].slice(0, 30),
        }
        : store.cal;
      return { tasks, history, gold, rewardCoupons, cal };
    });

    EventBus.emit(Events.Stats.REDUCE_PLAYER_EXP, { amount: actualReward.exp, isStrict });

    if (task.attrs?.length > 0) {
      task.attrs.forEach(skillName => {
        EventBus.emit(Events.Stats.REDUCE_SKILL_PROFICIENCY, { skillName, amount: 1 });
      });
    }

    EventBus.emit(Events.System.TOAST, isStrict ? '已撤銷 (⚠️ 獎勵全數回收)' : '已撤銷');
    EventBus.emit(Events.Task.UNCOMPLETED, { task, impact });
  },

  // RewardEngine 骰完結果回來後才真正寫入完成狀態、發獎勵、推 history
  _finalizeCompletion(taskId, impact, combo, rewards) {
    const task = (getState().tasks || []).find(t => t.id === taskId);
    if (!task || task.done) return; // 骰的過程中任務被刪除，或已經被別的路徑完成

    const historyEntry = {
      ...JSON.parse(JSON.stringify(task)),
      doneTime: Date.now(),
      doneImpact: impact,
      lastReward: rewards,
      status: 'completed',
    };

    setState(store => {
      const tasks = (store.tasks || []).map(t => t.id !== taskId ? t : {
        ...t, done: true, doneTime: historyEntry.doneTime, status: 'completed', lastReward: rewards,
      });
      const history = [...(store.history || []), historyEntry].slice(-500);
      const gold = (store.gold || 0) + rewards.gold;
      const rewardCoupons = rewards.coupon ? (store.rewardCoupons || 0) + 1 : store.rewardCoupons;
      const isCalActive = store.unlocks?.feature_cal || store.settings?.calMode;
      const cal = isCalActive && task.calories > 0
        ? {
          today: (store.cal?.today || 0) - task.calories,
          logs: [
            new Date().toTimeString().slice(0, 5) + ' ' + task.title + ' -' + task.calories,
            ...(store.cal?.logs || []),
          ].slice(0, 30),
        }
        : store.cal;
      return { tasks, history, gold, rewardCoupons, cal };
    });

    EventBus.emit(Events.Stats.ADD_PLAYER_EXP, { amount: rewards.exp });

    if (task.attrs?.length > 0) {
      task.attrs.forEach(skillName => {
        EventBus.emit(Events.Stats.ADD_SKILL_PROFICIENCY, { skillName, amount: 1 });
      });
    }

    const comboText = combo >= 2 ? ` 🔥 COMBO x${combo}!` : '';
    const enchantText = task.enchant?.boundAt ? ' ✦ 祝福加乘 x1.5' : '';
    const couponText = rewards.coupon ? ' 🎫 獲得金幣券！' : '';
    EventBus.emit(Events.System.TOAST, `完成！+${rewards.gold}💰 +${rewards.exp}✨${comboText}${enchantText}${couponText}`);
    EventBus.emit(Events.Task.COMPLETED, { task, impact, gained: rewards, combo });
  },

  incrementTask(id) {
    const s = getState();
    const task = (s.tasks || []).find(t => t.id === id);
    if (!task || task.done || task.type !== 'count') return;

    const newCurr = (task.curr || 0) + 1;
    if (newCurr >= task.target) {
      setState(store => ({
        tasks: (store.tasks || []).map(t => t.id !== id ? t : { ...t, curr: task.target }),
      }));
      this.resolveTask(id);
    } else {
      setState(store => ({
        tasks: (store.tasks || []).map(t => t.id !== id ? t : { ...t, curr: newCurr }),
      }));
      EventBus.emit(Events.Task.UPDATED);
    }
  },

  toggleSubtask(taskId, subIdx) {
    setState(store => ({
      tasks: (store.tasks || []).map(t => {
        if (t.id !== taskId || !t.subs?.[subIdx]) return t;
        const subs = t.subs.map((s, i) => i === subIdx ? { ...s, done: !s.done } : s);
        return { ...t, subs };
      }),
    }));
    EventBus.emit(Events.Task.UPDATED);
  },

  getHistorySummary() {
    const history = getState().history || [];
    const dailyMap = {};

    history.forEach(task => {
      const d = new Date(task.doneTime);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, totalImpact: 0, totalExp: 0, tasks: [], attrCounts: {} };
      dailyMap[dateStr].tasks.push(task);
      if (task.attrs?.length) {
        task.attrs.forEach(attr => {
          dailyMap[dateStr].attrCounts[attr] = (dailyMap[dateStr].attrCounts[attr] || 0) + 1;
        });
      }
      if (task.status === 'completed') {
        dailyMap[dateStr].totalImpact += task.doneImpact || 0;
        dailyMap[dateStr].totalExp += task.lastReward?.exp || 0;
      }
    });

    return Object.values(dailyMap).map(day => {
      const completed = day.tasks.filter(t => t.status === 'completed');
      completed.sort((a, b) => (b.doneImpact || 0) - (a.doneImpact || 0));
      const rank = day.totalImpact > 50 ? 'S' : day.totalImpact > 30 ? 'A' : day.totalImpact > 15 ? 'B' : 'C';
      let mainAttr = null;
      let maxCount = 0;
      if (day.attrCounts) {
        for (const [attr, count] of Object.entries(day.attrCounts)) {
          if (count > maxCount) { maxCount = count; mainAttr = attr; }
        }
      }
      return { ...day, rank, mvpTask: completed[0] || null, mainAttr };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  },
};