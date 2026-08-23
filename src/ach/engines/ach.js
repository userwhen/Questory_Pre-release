/* src/engines/ach.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import {
  getSortedAchievements as getSortedAchievementsPure,
  getTierConfig as getTierConfigPure,
  getUnitString as getUnitStringPure,
} from '@/ach/utils/achSelectors.js';

export const AchEngine = {
  init: makeIdempotentInit(function () {
    this.seedSystemAchievements();
    const unsubTag = EventBus.on(Events.Ach.GENERATE_FOR_TAG, ({ cat }) => {
      this.generateDynamicAchievementsForTag(cat);
    });
    const unsubTaskDone = EventBus.on(Events.Task.COMPLETED, ({ task, impact }) => {
      this.onTaskCompleted(task, impact);
    });
    const unsubTaskUndone = EventBus.on(Events.Task.UNCOMPLETED, ({ task, impact }) => {
      this.onTaskUndone(task, impact);
    });
    const unsubTimer = EventBus.on(Events.Timer.COMPLETED, ({ mode, minutes }) => {
      this.onTimerCompleted(mode, minutes);
    });

    const unsubClaim = EventBus.on(Events.Ach.REQUEST_CLAIM_REWARD, ({ id, requestId }) => {
      const result = this.claimReward(id);
      EventBus.emit(Events.Ach.CLAIM_REWARD_RESULT, { ...result, requestId });
    });
    const unsubDeleteMs = EventBus.on(Events.Ach.REQUEST_DELETE_MILESTONE, ({ id }) => {
      this.deleteMilestone(id);
    });

    const unsubSkillMaxed = EventBus.on(Events.Stats.SKILL_MAXED, (skill) => {
      this.onSkillMaxed(skill);
    });
    const unsubSkillDeleted = EventBus.on(Events.Stats.SKILL_DELETED, ({ name }) => {
      this.onSkillDeleted(name);
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
      unsubClaim, unsubDeleteMs,
      unsubSkillMaxed, unsubSkillDeleted, unsubAttrLevelUp, unsubCreateContainer, unsubAddMember, unsubRemoveMember,
      unsubCompleteContainer, unsubUpdateText, unsubUpdateContainer];
  }),

  seedSystemAchievements() {
    const s = getState();

    const obsoleteIds = new Set(['sys_daily_checkin', 'sys_login_days_c', 'sys_login_days_b', 'sys_login_days_a', 'sys_login_days_s']);
    const existing = (s.achievements || []).filter(a => !obsoleteIds.has(a.id));
    if (existing.length !== (s.achievements || []).length) {
      setState({ achievements: existing });
    }

    const existingIds = new Set(existing.map(a => a.id));
    const toAdd = [];

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
      const updateList = list => list.map(m => m.id === id ? { ...m, claimed: true, finishDate: m.finishDate || Date.now(), isUpgradeable: false } : m);
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
          desc: `累積完成 ${newConfig.target} ${unit}`,
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

    // 技能大師成就：玩家實際按下領取的這一刻，才真的通知 stats.js 把技能移進 archivedSkills
    if (ms.targetType === 'skill_mastery') {
      EventBus.emit(Events.Stats.REQUEST_ARCHIVE_SKILL, { skillName: ms.targetValue });
    }

    return { success: true, reward };
  },

  generateDynamicAchievementsForTag(tagValue) {
    const s = getState();
    const exists = (s.achievements || []).some(
      a => a.targetType === 'tag' && a.targetValue === tagValue
    );
    if (exists) return;

    // 只生 C 階；B/A/S 改由 claimReward() 裡既有的 isUpgradeable/nextTierMap
    // 機制在玩家實際領取當階獎勵後才動態生成，不再一次把 C~S 全部生出來、
    // 讓還沒真正開始挑戰的高階成就就先出現在列表裡。
    // id 改用 `_tier_` 分隔（跟 claimReward() 的 baseId 切法一致），
    // title 拿掉尾巴的階級字母——TierBadge 已經會顯示階級，不用在文字裡重複。
    const config = this.getTierConfig('C', 'tag');
    const newAch = {
      id: `ach_tag_${tagValue}_tier_C`, title: `【${tagValue}】`,
      desc: `累積完成 ${config.target} 次`, type: 'progress', targetType: 'tag',
      targetValue: tagValue, tier: 'C', curr: 0, target: config.target,
      reward: config.reward, done: false, claimed: false, isSystem: true,
      editable: true, isUpgradeable: true, finishDate: null,
    };

    setState(state => ({ achievements: [...(state.achievements || []), newAch] }));
  },

  onSkillMaxed(skill) {
    const id = `ach_skill_${skill.name}`;
    const s = getState();
    if ((s.achievements || []).some(a => a.id === id)) return;

    // 動態獎勵：依「真正有練習的天數」（stats.js 的 practiceDays，同一天只算一次）計算，
    // 練越久獎勵越高，設上限避免無限膨脹。
    const days = skill.practiceDays || 1;
    const reward = {
      gold: Math.min(800, 100 + days * 15),
      exp: Math.min(1200, 150 + days * 20),
    };

    const newAch = {
      id, title: `【技能大成】${skill.name}`,
      desc: `${skill.name} 練至大師級（Lv.10）`, type: 'progress',
      targetType: 'skill_mastery', targetValue: skill.name, tier: null,
      curr: 1, target: 1, reward,
      done: true, claimed: false, isSystem: true, editable: false, isUpgradeable: false,
      finishDate: Date.now(),
    };
    setState(state => ({ achievements: [...(state.achievements || []), newAch] }));
  },

  // 技能被刪除時，如果對應的技能大師成就還沒被領取，一併清掉（避免孤兒成就）。
  // 已經領取過的維持不動，玩家已經拿到的獎勵跟殿堂紀錄不該因為刪技能而消失。
  onSkillDeleted(name) {
    setState(s => ({
      achievements: (s.achievements || []).filter(a =>
        !(a.targetType === 'skill_mastery' && a.targetValue === name && !a.claimed)),
    }));
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
      tier: null, curr: 0, target: null, reward: null, rewardItemId: null,
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

    return {
      success: true, reward, rewardItemId: ach.rewardItemId,
      summary: { count: memberTasks.length, totalDifficulty, byCat },
    };
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

  // 命名維持 deleteMilestone 不變（呼叫端事件名稱、AchPage.jsx 都沿用這個字），
  // 但實際上 milestones/achievements 兩個陣列都要篩，因為現在唯一還在用的
  // 刪除入口是容器成就（存在 achievements 裡），先前只篩 milestones 那份、
  // 沒篩到 achievements，容器的刪除鈕點下去其實沒有真的刪掉東西。
  deleteMilestone(id) {
    setState(s => ({
      milestones: (s.milestones || []).filter(m => m.id !== id),
      achievements: (s.achievements || []).filter(a => a.id !== id),
    }));
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