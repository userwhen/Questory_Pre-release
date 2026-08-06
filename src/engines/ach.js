/* src/engines/ach.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import {
  getSortedAchievements as getSortedAchievementsPure,
  getTierConfig as getTierConfigPure,
  getUnitString as getUnitStringPure,
} from '@/utils/achSelectors.js';

export const AchEngine = {
  init: makeIdempotentInit(function () {
    this.seedSystemAchievements();
    const unsubTag = EventBus.on(Events.Ach.GENERATE_FOR_TAG, ({ cat }) => {
      this.generateDynamicAchievementsForTag(cat);
    });
    // 監聽任務完成事件，更新成就進度
    const unsubTaskDone = EventBus.on(Events.Task.COMPLETED, ({ task, impact }) => {
      this.onTaskCompleted(task, impact);
    });
    // 監聽任務撤銷事件
    const unsubTaskUndone = EventBus.on(Events.Task.UNCOMPLETED, ({ task, impact }) => {
      this.onTaskUndone(task, impact);
    });
    // 監聽計時完成事件（專注時間 / 番茄鐘成就）
    const unsubTimer = EventBus.on(Events.Timer.COMPLETED, ({ mode, minutes }) => {
      this.onTimerCompleted(mode, minutes);
    });

    // AchPage.jsx 透過這些事件呼叫，不再直接 import AchEngine
    const unsubClaim = EventBus.on(Events.Ach.REQUEST_CLAIM_REWARD, ({ id, requestId }) => {
      const result = this.claimReward(id);
      EventBus.emit(Events.Ach.CLAIM_REWARD_RESULT, { ...result, requestId });
    });
    const unsubCheckIn = EventBus.on(Events.Ach.REQUEST_CHECK_IN, ({ id, requestId }) => {
      const result = this.checkInAch(id);
      EventBus.emit(Events.Ach.CHECK_IN_RESULT, { ...result, requestId });
    });
    const unsubCreateMs = EventBus.on(Events.Ach.REQUEST_CREATE_MILESTONE, (data) => {
      this.createMilestone(data);
    });
    const unsubUpdateMs = EventBus.on(Events.Ach.REQUEST_UPDATE_MILESTONE, (data) => {
      this.updateMilestone(data);
    });
    const unsubDeleteMs = EventBus.on(Events.Ach.REQUEST_DELETE_MILESTONE, ({ id }) => {
      this.deleteMilestone(id);
    });

    const unsubSkillMaxed = EventBus.on(Events.Stats.SKILL_MAXED, (skill) => {
      this.onSkillMaxed(skill);
    });
    const unsubAttrLevelUp = EventBus.on(Events.Stats.ATTR_LEVEL_UP, ({ key, v }) => {
      this.onAttrLevelUp(key, v);
    });
    const unsubCreateContainer = EventBus.on(Events.Ach.REQUEST_CREATE_CONTAINER, ({ title, taskId }) => {
      this.createContainerAchievement(title, taskId);
    });
    const unsubAddMember = EventBus.on(Events.Ach.REQUEST_ADD_MEMBER, ({ achievementId, taskId }) => {
      this.addMemberToContainer(achievementId, taskId);
    });
    const unsubRemoveMember = EventBus.on(Events.Ach.REQUEST_REMOVE_MEMBER, ({ achievementId, taskId }) => {
      this.removeMemberFromContainer(achievementId, taskId);
    });
    const unsubCompleteContainer = EventBus.on(Events.Ach.REQUEST_COMPLETE_CONTAINER, ({ id, requestId }) => {
      const result = this.completeContainerAchievement(id);
      EventBus.emit(Events.Ach.COMPLETE_CONTAINER_RESULT, { ...result, requestId });
    });
    const unsubUpdateText = EventBus.on(Events.Ach.REQUEST_UPDATE_TEXT, ({ id, title, desc }) => {
      this.updateAchievementText(id, title, desc);
    });
    const unsubUpdateContainer = EventBus.on(Events.Ach.REQUEST_UPDATE_CONTAINER, ({ id, title, desc, rewardItemId }) => {
      this.updateContainerMeta(id, { title, desc, rewardItemId });
    });

    return [unsubTag, unsubTaskDone, unsubTaskUndone, unsubTimer,
      unsubClaim, unsubCheckIn, unsubCreateMs, unsubUpdateMs, unsubDeleteMs,
      unsubSkillMaxed, unsubAttrLevelUp, unsubCreateContainer, unsubAddMember,
      unsubRemoveMember, unsubCompleteContainer, unsubUpdateText, unsubUpdateContainer];
  }),

  seedSystemAchievements() {
  const s = getState();

  // 一次性清理：每日簽到/冒險啟程已移除（登入邏輯移到別處了），把先前可能已種下的舊資料一併濾掉
  const obsoleteIds = new Set(['sys_daily_checkin', 'sys_login_days_c', 'sys_login_days_b', 'sys_login_days_a', 'sys_login_days_s']);
  const existing = (s.achievements || []).filter(a => !obsoleteIds.has(a.id));
  if (existing.length !== (s.achievements || []).length) {
    setState({ achievements: existing });
  }

  const existingIds = new Set(existing.map(a => a.id));
  const toAdd = [];

    // 官方精選：鎖定分類（日常/運動），手刻文案，不可編輯
    const curatedTagAchievements = [
      { id: 'sys_curated_日常', title: '日常小尖兵', desc: '累積完成 100 件日常任務', tag: '日常', target: 100, reward: { gold: 100, exp: 200 } },
      { id: 'sys_curated_運動', title: '體能王',     desc: '累積完成 100 次運動任務', tag: '運動', target: 100, reward: { gold: 100, exp: 200 } },
    ];
    curatedTagAchievements.forEach(c => {
      if (!existingIds.has(c.id)) {
        toAdd.push({
          id: c.id, title: c.title, desc: c.desc, type: 'progress',
          targetType: 'tag', targetValue: c.tag, tier: null,
          curr: 0, target: c.target, reward: c.reward,
          done: false, claimed: false, isSystem: true, isUpgradeable: false, finishDate: null,
        });
      }
    });

    // 官方精選：六大屬性專屬，達到等級即解鎖
    const attrsNow = s.attrs || {};
    Object.entries(attrsNow).forEach(([key, attr]) => {
      const id = `sys_curated_attr_${key}`;
      if (!existingIds.has(id)) {
        toAdd.push({
          id, title: `${attr.icon || '⭐'} ${attr.name}大師`,
          desc: `${attr.name} 達到 Lv.10`, type: 'progress',
          targetType: 'attr_level', targetValue: key, tier: null,
          curr: attr.v || 1, target: 10, reward: { gold: 150, exp: 300 },
          done: (attr.v || 1) >= 10, claimed: false, isSystem: true, isUpgradeable: false, finishDate: null,
        });
      }
    });

    if (toAdd.length > 0) {
      setState(state => ({
        achievements: [...(state.achievements || []), ...toAdd],
      }));
    }

    // 每天重置 sys_daily_checkin 的 claimed 狀態
    this._resetDailyCheckinIfNeeded();
  },

  _resetDailyCheckinIfNeeded() {
    const s = getState();
    const today = new Date().toDateString();
    const ach = (s.achievements || []).find(a => a.id === 'sys_daily_checkin');
    if (!ach) return;
    // 如果上次領取日期不是今天，重置 claimed
    if (ach.claimed && ach.lastClaimedDate !== today) {
      setState(state => ({
        achievements: (state.achievements || []).map(a =>
          a.id === 'sys_daily_checkin'
            ? { ...a, claimed: false, done: false }
            : a
        ),
      }));
    }
  },

  checkInAch(id) {
    if (id === 'sys_daily_checkin') {
      const s = getState();
      const today = new Date().toDateString();
      const ach = (s.achievements || []).find(a => a.id === id);
      if (!ach) return { success: false, msg: '找不到簽到成就' };
      if (ach.claimed && ach.lastClaimedDate === today) return { success: false, msg: '今日已領取過了' };

      const reward = ach.reward || { gold: 50, exp: 50 };

      setState(state => {
        const newAchs = (state.achievements || []).map(a =>
          a.id === id ? { ...a, claimed: true, done: true, lastClaimedDate: today, finishDate: Date.now() } : a
        );
        return { gold: (state.gold || 0) + reward.gold, achievements: newAchs };
      });

      if (reward.exp) EventBus.emit(Events.Stats.ADD_PLAYER_EXP, { amount: reward.exp });

      // 同步更新登入天數相關成就進度
      this._updateLoginDaysProgress();

      return { success: true, reward };
    }
    return this.claimReward(id);
  },

  _updateLoginDaysProgress() {
    const s = getState();
    const total = s.totalLoginDays || 0;
    setState(state => ({
      achievements: (state.achievements || []).map(a => {
        if (a.targetType !== 'login_days' || a.id === 'sys_daily_checkin') return a;
        const curr = total;
        const done = curr >= a.target;
        return { ...a, curr, done: done || a.done, finishDate: done && !a.done ? Date.now() : a.finishDate };
      }),
    }));
  },

  onTaskCompleted(task, impact) {
    const val = (typeof impact === 'number') ? impact : 1;
    const s = getState();
    const taskCat = task.cat || task.category;
    const todayStr = new Date().toDateString();
    let anyUpdate = false;

    const processList = (list) => list.map(ms => {
      if (ms.done) return ms;
      let isMatch = false;
      if (ms.targetType === 'tag' && taskCat === ms.targetValue) isMatch = true;
      else if (ms.targetType === 'attr' && task.attrs?.includes(ms.targetValue)) isMatch = true;
      else if (ms.targetType === 'streak_tag' && taskCat === ms.targetValue) isMatch = true;
      else if (ms.targetType === 'streak_attr' && task.attrs?.includes(ms.targetValue)) isMatch = true;

      if (!isMatch) return ms;

      ms = { ...ms };
      if (ms.targetType.startsWith('streak_')) {
        if (ms.lastUpdateDate !== todayStr) {
          ms.curr = (ms.curr || 0) + 1;
          ms.lastUpdateDate = todayStr;
          anyUpdate = true;
        }
      } else {
        ms.curr = (ms.curr || 0) + val;
        anyUpdate = true;
      }

      if (ms.curr >= ms.target) {
        ms.done = true;
        ms.finishDate = Date.now();
      }
      return ms;
    });

    const newMilestones = processList(s.milestones || []);
    const newAchievements = processList(s.achievements || []);

    if (anyUpdate) setState({ milestones: newMilestones, achievements: newAchievements });
  },

  onTaskUndone(task, impact) {
    const val = (typeof impact === 'number') ? impact : 1;
    const s = getState();
    let anyUpdate = false;

    const processList = (list) => list.map(ms => {
      if (ms.claimed) return ms;
      let isMatch = false;
      if (ms.targetType === 'tag' && task.cat === ms.targetValue) isMatch = true;
      else if (ms.targetType === 'attr' && task.attrs?.includes(ms.targetValue)) isMatch = true;

      if (!isMatch) return ms;

      ms = { ...ms };
      ms.curr = Math.max(0, (ms.curr || 0) - val);
      if (ms.done && ms.curr < ms.target) ms.done = false;
      anyUpdate = true;
      return ms;
    });

    const newMilestones = processList(s.milestones || []);
    const newAchievements = processList(s.achievements || []);

    if (anyUpdate) setState({ milestones: newMilestones, achievements: newAchievements });
  },

  onTimerCompleted(mode, minutes) {
    const s = getState();
    let anyUpdate = false;

    const processList = (list) => list.map(ms => {
      if (ms.done) return ms;
      let valToAdd = 0;
      if (ms.targetType === 'focus_time') valToAdd = minutes;
      else if (ms.targetType === 'pomodoro' && mode === 'pomodoro') valToAdd = 1;

      if (valToAdd <= 0) return ms;

      ms = { ...ms };
      ms.curr = (ms.curr || 0) + valToAdd;
      anyUpdate = true;

      if (ms.curr >= ms.target) {
        ms.done = true;
        ms.finishDate = Date.now();
      }
      return ms;
    });

    const newMilestones = processList(s.milestones || []);
    const newAchievements = processList(s.achievements || []);

    if (anyUpdate) setState({ milestones: newMilestones, achievements: newAchievements });
  },

  claimReward(id) {
    const s = getState();
    const ms = [...(s.milestones || []), ...(s.achievements || [])].find(m => m.id === id);

    if (!ms) return { success: false, msg: '找不到成就' };
    if (!ms.done) return { success: false, msg: '尚未完成' };
    if (ms.claimed) return { success: false, msg: '已領取過了' };

    const reward = ms.reward || { gold: 0, exp: 0 };
    const nextTierMap = { C: 'B', B: 'A', A: 'S' };
    const nextTier = ms.isUpgradeable && ms.tier !== 'S' ? nextTierMap[ms.tier] : null;

    setState(state => {
      const updateList = list => list.map(m => m.id === id ? { ...m, claimed: true, finishDate: Date.now(), isUpgradeable: false } : m);
      let newMilestones = updateList(state.milestones || []);
      let newAchievements = updateList(state.achievements || []);

      if (nextTier) {
        const newConfig = this.getTierConfig(nextTier, ms.targetType);
        const unit = this.getUnitString(ms.targetType);
        const baseId = ms.id.split('_tier_')[0];
        const newAch = {
          ...ms,
          id: `${baseId}_tier_${nextTier}`,
          tier: nextTier,
          target: newConfig.target,
          reward: newConfig.reward,
          desc: ms.targetType === 'login_days'
            ? `累積登入 ${newConfig.target} 天`
            : `累積完成 ${newConfig.target} ${unit}`,
          curr: ms.curr,
          done: ms.curr >= newConfig.target,
          claimed: false,
          finishDate: null,
          isUpgradeable: true,
        };

        if ((state.milestones || []).some(m => m.id === id)) {
          newMilestones = [...newMilestones, newAch];
        } else {
          newAchievements = [...newAchievements, newAch];
        }
      }
      return {
        gold: (state.gold || 0) + (reward.gold || 0),
        milestones: newMilestones,
        achievements: newAchievements
      };
    });

    if (reward.exp) EventBus.emit(Events.Stats.ADD_PLAYER_EXP, { amount: reward.exp });
    return { success: true, reward };
  },

  generateDynamicAchievementsForTag(tagValue) {
    const s = getState();
    const exists = (s.achievements || []).some(
      a => a.targetType === 'tag' && a.targetValue === tagValue
    );
    if (exists) return;

    const newAchs = ['C', 'B', 'A', 'S'].map(tier => {
      const config = this.getTierConfig(tier, 'tag');
      return {
        id: `ach_tag_${tagValue}_${tier}`, title: `【${tagValue}】${tier}`,
        desc: `累積完成 ${config.target} 次`, type: 'progress', targetType: 'tag',
        targetValue: tagValue, tier, curr: 0, target: config.target,
        reward: config.reward, done: false, claimed: false, isSystem: true,
        editable: true, isUpgradeable: false, finishDate: null,
      };
    });

    setState(state => ({ achievements: [...(state.achievements || []), ...newAchs] }));
  },

  onSkillMaxed(skill) {
    const id = `ach_skill_${skill.name}`;
    const s = getState();
    if ((s.achievements || []).some(a => a.id === id)) return;

    const newAch = {
      id, title: `【技能大成】${skill.name}`,
      desc: `${skill.name} 練至大師級（Lv.10）`, type: 'progress',
      targetType: 'skill_mastery', targetValue: skill.name, tier: null,
      curr: 1, target: 1, reward: { gold: 300, exp: 500 },
      done: true, claimed: false, isSystem: true, editable: true, isUpgradeable: false,
      finishDate: Date.now(),
    };
    setState(state => ({ achievements: [...(state.achievements || []), newAch] }));
  },

  onAttrLevelUp(key, v) {
    let anyUpdate = false;
    setState(state => {
      const achievements = (state.achievements || []).map(a => {
        if (a.targetType !== 'attr_level' || a.targetValue !== key || a.done) return a;
        anyUpdate = true;
        const done = v >= a.target;
        return { ...a, curr: v, done, finishDate: done ? Date.now() : a.finishDate };
      });
      return anyUpdate ? { achievements } : state;
    });
  },

  createContainerAchievement(title, taskId) {
    const newAch = {
      id: 'ach_container_' + Date.now(), title: title || '未命名成就', desc: '',
      type: 'container', targetType: 'manual_group', memberTaskIds: [taskId],
      tier: null, curr: 0, target: null, reward: null,
      done: false, claimed: false, isSystem: false, isUpgradeable: false, finishDate: null,
    };
    setState(s => ({ achievements: [...(s.achievements || []), newAch] }));
  },

  addMemberToContainer(achievementId, taskId) {
    setState(s => ({
      achievements: (s.achievements || []).map(a =>
        a.id === achievementId ? { ...a, memberTaskIds: [...(a.memberTaskIds || []), taskId] } : a),
    }));
  },

  removeMemberFromContainer(achievementId, taskId) {
    setState(s => ({
      achievements: (s.achievements || []).map(a =>
        a.id === achievementId ? { ...a, memberTaskIds: (a.memberTaskIds || []).filter(id => id !== taskId) } : a),
    }));
  },

  completeContainerAchievement(id) {
    const s = getState();
    const ach = (s.achievements || []).find(a => a.id === id);
    if (!ach) return { success: false, msg: '找不到成就' };
    if (ach.claimed) return { success: false, msg: '已領取過了' };

    const memberTasks = [...(s.tasks || []), ...(s.history || [])]
      .filter(t => ach.memberTaskIds?.includes(t.id));
    const totalDifficulty = memberTasks.reduce((sum, t) => sum + (t.importance || 1) * 1.5 + (t.urgency || 1) * 0.5, 0);
    const reward = ach.reward || {
      gold: Math.floor(20 * Math.sqrt(totalDifficulty || 1)),
      exp: Math.floor(20 * Math.sqrt(totalDifficulty || 1)),
    };
    const byCat = {};
    memberTasks.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + 1; });

    setState(state => ({
      gold: (state.gold || 0) + reward.gold,
      achievements: (state.achievements || []).map(a =>
        a.id === id ? { ...a, done: true, claimed: true, finishDate: Date.now(), reward } : a),
    }));
    if (reward.exp) EventBus.emit(Events.Stats.ADD_PLAYER_EXP, { amount: reward.exp });
    if (ach.rewardItemId) EventBus.emit(Events.Shop.REQUEST_GRANT_ITEM, { id: ach.rewardItemId, qty: 1 });

    return { success: true, reward, rewardItemId: ach.rewardItemId, summary: { count: memberTasks.length, totalDifficulty, byCat } };
  },

  updateAchievementText(id, title, desc) {
    setState(s => ({
      achievements: (s.achievements || []).map(a =>
        a.id === id ? { ...a, title: title ?? a.title, desc: desc ?? a.desc } : a),
    }));
  },

  updateContainerMeta(id, patch) {
    setState(s => ({
      achievements: (s.achievements || []).map(a =>
        a.id === id ? { ...a, ...patch } : a),
    }));
  },

  createMilestone(data) {
    const config = this.getTierConfig(data.tier, data.targetType);
    const unit = this.getUnitString(data.targetType);

    const newMs = {
      id: 'ms_' + Date.now(), title: data.title,
      desc: `累積完成 ${config.target} ${unit}`, type: 'progress',
      targetType: data.targetType, targetValue: data.targetValue,
      tier: data.tier, curr: 0, target: config.target, reward: config.reward,
      done: false, claimed: false, startDate: Date.now(), finishDate: null,
      isUpgradeable: data.isUpgradeable || false,
    };

    setState(s => ({ milestones: [...(s.milestones || []), newMs] }));
  },

  updateMilestone(data) {
    setState(s => {
      const milestones = (s.milestones || []).map(ms => {
        if (ms.id !== data.id) return ms;

        let updated = { ...ms, title: data.title, isUpgradeable: data.isUpgradeable || false };

        if (ms.tier !== data.tier || ms.targetType !== data.targetType) {
          const config = this.getTierConfig(data.tier, data.targetType);
          const unit = this.getUnitString(data.targetType);
          updated = {
            ...updated, tier: data.tier, targetType: data.targetType,
            targetValue: data.targetValue, target: config.target,
            reward: config.reward, desc: `累積完成 ${config.target} ${unit}`,
          };
        }

        if (updated.curr >= updated.target && !updated.done) {
          updated.done = true;
          updated.finishDate = Date.now();
        }

        return updated;
      });

      return { milestones };
    });
  },

  deleteMilestone(id) {
    setState(s => ({ milestones: (s.milestones || []).filter(m => m.id !== id) }));
  },

  getSortedAchievements(milestones, achievements) {
    return getSortedAchievementsPure(milestones, achievements);
  },

  getTierConfig(tier, targetType) {
    return getTierConfigPure(tier, targetType);
  },

  getUnitString(type) {
    return getUnitStringPure(type);
  },
};