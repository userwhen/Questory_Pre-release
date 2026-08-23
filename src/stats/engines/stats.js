/* src/stats/engines/stats.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

export const StatsEngine = {
  init: makeIdempotentInit(function () {
    const unsubAdd = EventBus.on(Events.Stats.ADD_SKILL_PROFICIENCY, ({ skillName, amount }) => this.addSkillProficiency(skillName, amount));
    const unsubReduce = EventBus.on(Events.Stats.REDUCE_SKILL_PROFICIENCY, ({ skillName, amount }) => this.reduceSkillProficiency(skillName, amount));
    const unsubAddExp = EventBus.on(Events.Stats.ADD_PLAYER_EXP, ({ amount }) => this.addPlayerExp(amount));
    const unsubReduceExp = EventBus.on(Events.Stats.REDUCE_PLAYER_EXP, ({ amount, isStrict }) => this.reducePlayerExp(amount, isStrict));

    const unsubSaveSkill = EventBus.on(Events.Stats.REQUEST_SAVE_SKILL, ({ name, parent, editId, requestId }) => {
      const result = this.saveSkill({ name, parent, editId });
      EventBus.emit(Events.Stats.SAVE_SKILL_RESULT, { ...result, requestId });
    });
    const unsubDeleteSkill = EventBus.on(Events.Stats.REQUEST_DELETE_SKILL, ({ name }) => {
      this.deleteSkill(name);
    });
    // 技能大師成就在 Ach 頁面被領取後，才真的把技能搬進 archivedSkills（見 ach.js 的 claimReward）
    const unsubArchiveSkill = EventBus.on(Events.Stats.REQUEST_ARCHIVE_SKILL, ({ skillName }) => {
      this.archiveSkill(skillName);
    });
    // 加在 unsubDeleteSkill 後面
    const unsubCalTruth = EventBus.on(Events.Stats.REQUEST_CALORIE_TRUTH, () => {
      EventBus.emit(Events.Stats.CALORIE_TRUTH_READY, this.getCalorieTruth());
    });
    const unsubPopBall = EventBus.on(Events.Stats.REQUEST_POP_BALL, ({ amount, requestId }) => {
      const result = this.popCalorieBall(amount);
      EventBus.emit(Events.Stats.POP_BALL_RESULT, { ...result, requestId });
    });

    const unsubIconMap = EventBus.on(Events.Stats.REQUEST_SKILL_ICON_MAP, () => {
      EventBus.emit(Events.Stats.SKILL_ICON_MAP_READY, this.getSkillIconMap());
    });

    return [unsubAdd, unsubReduce, unsubAddExp, unsubReduceExp, unsubSaveSkill, unsubDeleteSkill, unsubArchiveSkill, unsubCalTruth, unsubPopBall, unsubIconMap];
  }),

  // ─── 玩家經驗值 ─────────────────────────────────────
  addPlayerExp(amount) {
    setState(s => {
      let exp = (s.exp || 0) + amount;
      let lv = s.lv || 1;
      let leveledUp = false;

      while (exp >= lv * 100) {
        exp -= lv * 100;
        lv++;
        leveledUp = true;
        EventBus.emit(Events.System.TOAST, `🆙 等級提升！Lv.${lv}`);
      }
      if (leveledUp) EventBus.emit(Events.Stats.LEVEL_UP);
      return { exp, lv };
    });
    EventBus.emit(Events.Stats.UPDATED);
  },

  // 取消完成＝完整還原：一律允許降等（方案甲）。
  // isStrict 保留給呼叫端其他懲罰語意（例如金幣可否扣成負），此處不再用來決定是否降等。
  reducePlayerExp(amount, _isStrict = false) {
    setState(s => {
      let exp = (s.exp || 0) - amount;
      let lv = s.lv || 1;

      while (exp < 0 && lv > 1) {
        lv--;
        exp += lv * 100;
        EventBus.emit(Events.System.TOAST, `📉 等級降回 Lv.${lv}`);
      }
      if (exp < 0) exp = 0;
      return { exp, lv };
    });
    EventBus.emit(Events.Stats.UPDATED);
  },

    // ─── 技能熟練度 ─────────────────────────────────────
  addSkillProficiency(skillName, amount = 1) {
    setState(s => {
      let skills = s.skills.map(sk => ({ ...sk }));
      let attrs = JSON.parse(JSON.stringify(s.attrs || {}));
      const idx = skills.findIndex(sk => sk.name === skillName);

      if (idx > -1) {
        const sk = skills[idx];

        // 已經大師化（等待玩家去 Ach 頁面領取）：技能本身經驗/等級凍結不再變動，
        // 但父屬性仍然照常吃經驗——大師只是技能這條進度線封頂，屬性成長不受影響。
        if (!sk.isMaxed) {
          sk.lastUsed = Date.now();
          sk.exp = (sk.exp || 0) + amount;

          // practiceDays：同一天內重複練習只算一次，反映「真正有練習的天數」，
          // 供 ach.js 的技能大師成就計算動態獎勵用（見 onSkillMaxed）。
          const todayStr = new Date().toDateString();
          if (sk.lastPracticeDate !== todayStr) {
            sk.practiceDays = (sk.practiceDays || 0) + 1;
            sk.lastPracticeDate = todayStr;
          }

          while (sk.exp >= sk.lv * 10) {
            sk.exp -= sk.lv * 10;
            sk.lv++;
            EventBus.emit(Events.System.TOAST, `💡 技能 [${sk.name}] 升至 Lv.${sk.lv}`);
            if (sk.lv >= 10) {
              sk.isMaxed = true;
              EventBus.emit(Events.Stats.SKILL_MAXED, sk);
              EventBus.emit(Events.System.TOAST, `🎉 [${sk.name}] 達到大師級！前往成就頁領取獎勵`);
              break;
            }
          }
        }

        if (sk.parent && attrs[sk.parent]) {
          attrs = this._mutAddAttrExp(attrs, sk.parent, amount);
        }
      } else if (attrs[skillName]) {
        attrs = this._mutAddAttrExp(attrs, skillName, amount);
      }

      return { skills, attrs };
    });
    EventBus.emit(Events.Stats.UPDATED);
  },

    // 取消完成＝完整還原：技能等級與父屬性一律回扣（方案甲），不再只在嚴格模式生效。
  // 已大師化（isMaxed）的技能凍結中，不回扣經驗/等級，但父屬性依然照常回扣。
  reduceSkillProficiency(skillName, amount = 1) {
    setState(s => {
      let attrs = JSON.parse(JSON.stringify(s.attrs || {}));
      let targetParent = null;

      const skills = s.skills.map(sk => {
        if (sk.name !== skillName) return sk;
        targetParent = sk.parent;
        if (sk.isMaxed) return sk;
        let exp = (sk.exp || 0) - amount;
        let lv = sk.lv;
        while (exp < 0 && lv > 1) {
          lv--;
          exp += lv * 10;
        }
        if (exp < 0) exp = 0;
        return { ...sk, exp, lv };
      });

      if (targetParent && attrs[targetParent]) {
        attrs = this._mutReduceAttrExp(attrs, targetParent, amount);
      } else if (!targetParent && attrs[skillName]) {
        attrs = this._mutReduceAttrExp(attrs, skillName, amount);
      }

      return { skills, attrs };
    });
    EventBus.emit(Events.Stats.UPDATED);
  },

  // ─── 屬性經驗值（內部） ─────────────────────────────
  _mutAddAttrExp(attrs, key, amount) {
  const attr = attrs[key];
  if (!attr) return attrs;
  let exp = (attr.exp || 0) + amount;
  let v = attr.v;
  let cap = v * 100;
  while (exp >= cap) {
    exp -= cap;
    v++;
    EventBus.emit(Events.System.TOAST, `🎉 ${attr.name} 提升至 Lv.${v}`);
    EventBus.emit(Events.Stats.ATTR_LEVEL_UP, { key, v });
    cap = v * 100;
  }
  return { ...attrs, [key]: { ...attr, exp, v } };
},

  _mutReduceAttrExp(attrs, key, amount) {
    const attr = attrs[key];
    if (!attr) return attrs;
    let exp = (attr.exp || 0) - amount;
    let v = attr.v;
    while (exp < 0 && v > 1) {
      v--;
      exp += v * 100;
    }
    if (exp < 0) exp = 0;
    return { ...attrs, [key]: { ...attr, exp, v } };
  },

  // ─── 技能 CRUD ──────────────────────────────────────
  saveSkill({ name, parent, editId = null }) {
    name = name?.trim();
    if (!name) return { success: false, msg: '技能名稱不能為空' };

    const s = getState();
    const duplicate = s.skills.find(sk => sk.name === name && sk.name !== editId);
    if (duplicate) return { success: false, msg: '技能名稱重複' };

    if (editId) {
  setState(st => ({
    skills: st.skills.map(sk => sk.name !== editId ? sk : { ...sk, name, parent }),
    tasks: (st.tasks || []).map(t => ({
      ...t,
      attrs: t.attrs?.map(a => a === editId ? name : a) ?? [],
    })),
    history: (st.history || []).map(h => ({
      ...h,
      attrs: h.attrs?.map(a => a === editId ? name : a) ?? [],
    })),
    // 級聯更新：技能改名要連動追蹤該技能的成就/里程碑，避免資料斷鏈
    // skill_mastery 額外要把 title 裡的舊技能名也換掉，不然文案會卡在改名前的舊名字
    achievements: (st.achievements || []).map(a => {
      if (a.targetType === 'skill_mastery' && a.targetValue === editId) {
        return { ...a, targetValue: name, title: `【技能大成】${name}` };
      }
      if ((a.targetType === 'attr' || a.targetType === 'streak_attr') && a.targetValue === editId) {
        return { ...a, targetValue: name };
      }
      return a;
    }),
    milestones: (st.milestones || []).map(m =>
      (m.targetType === 'attr' || m.targetType === 'streak_attr') && m.targetValue === editId
        ? { ...m, targetValue: name } : m),
  }));
} else {
      if (s.skills.length >= 10) return { success: false, msg: '技能數量已達上限 (10)' };
      setState(st => ({
        skills: [...st.skills, { name, parent: parent || 'STR', lv: 1, exp: 0, lastUsed: Date.now() }],
      }));
    }

    EventBus.emit(Events.Stats.UPDATED);
    return { success: true };
  },

  deleteSkill(name) {
  setState(s => {
    const dying = s.skills.find(sk => sk.name === name);
    const deletedSkills = dying
      ? [...(s.deletedSkills || []), { name: dying.name, parent: dying.parent }]
      : (s.deletedSkills || []);
    return {
      skills: s.skills.filter(sk => sk.name !== name),
      deletedSkills,
      tasks: (s.tasks || []).map(t => ({
        ...t,
        attrs: t.attrs?.filter(a => a !== name) ?? [],
      })),
      achievements: (s.achievements || []).filter(a =>
        !((a.targetType === 'attr' || a.targetType === 'streak_attr') && a.targetValue === name)),
      milestones: (s.milestones || []).filter(m =>
        !((m.targetType === 'attr' || m.targetType === 'streak_attr') && m.targetValue === name)),
    };
  });
  EventBus.emit(Events.Stats.UPDATED);
  // 通知 ach.js：如果這隻技能還掛著未領取的 skill_mastery 成就，要一併清掉
  EventBus.emit(Events.Stats.SKILL_DELETED, { name });
},

  // 技能大師成就在 Ach 頁面被領取的那一刻才呼叫（見 ach.js 的 claimReward），
  // 真正把技能從 skills 搬進 archivedSkills；在那之前技能只是 isMaxed=true 凍結著，還留在 skills 裡等玩家去領。
  archiveSkill(skillName) {
    setState(s => {
      const idx = s.skills.findIndex(sk => sk.name === skillName);
      if (idx === -1) return s; // 技能可能領取前就被刪除了，安全跳過
      const skills = [...s.skills];
      const [archivedSkill] = skills.splice(idx, 1);
      return {
        skills,
        archivedSkills: [...(s.archivedSkills || []), archivedSkill],
      };
    });
    EventBus.emit(Events.Stats.UPDATED);
  },
  // 給 TaskCard 等「不能直接讀 Stats 相關 store 欄位」的地方用：
  // 一次要到「技能名稱 → 圖標」的完整對照表，Task 那邊只要查表，不用碰 attrs/skills 本體
  getSkillIconMap() {
    const s = getState();
    const attrs = s.attrs || {};
    const map = {};

    // 屬性代號本身也可能被直接當成 skillName 使用，優先權最高
    Object.entries(attrs).forEach(([key, a]) => { map[key] = a.icon; });

    // 存活技能 > 榮譽殿堂(滿級) > 已刪除(墓碑)，同名時前者優先
    [...(s.skills || []), ...(s.archivedSkills || []), ...(s.deletedSkills || [])].forEach(sk => {
      if (map[sk.name]) return;
      map[sk.name] = attrs[sk.parent]?.icon || '❓';
    });

    return map;
  },

  // ─── 熱量真相運算（供 CalWidget / BurnMode 使用） ────
  // 資料來源：cal.today（淨值，由 task.js 維護）與 cal.popped（已燃燒額度）
  // 回傳：{ consumed, burned, popped, quota, displayConsumed, balls }
  getCalorieTruth() {
    const s = getState();
    const cal = s.cal || { today: 0, logs: [], popped: 0 };

    let grossConsumed = 0;
    let grossBurned = 0;
    let rawBalls = [];

    (cal.logs || []).forEach(log => {
      const minusMatch = log.match(/-(\d+)/);
      if (minusMatch) grossBurned += parseInt(minusMatch[1]);

      const plusMatch = log.match(/\+(\d+)/);
      const qtyMatch = log.match(/x(\d+)/);
      // 一定要同時有 xN，才是「吃東西」的 log；task.js 取消運動任務回補熱量的 log 沒有 xN，不該算進來
      if (plusMatch && qtyMatch) {
        const totalKcal = parseInt(plusMatch[1]);
        grossConsumed += totalKcal;

        const qty = parseInt(qtyMatch[1]);
        const perItemKcal = Math.floor(totalKcal / qty);

        // log 格式："HH:MM <icon> <name> xN +total"，icon 直接從字串取
        const iconMatch = log.match(/^\d{2}:\d{2}\s+(\S+)\s+/);
        const icon = iconMatch ? iconMatch[1] : '🍙';

        let radius = 16;
        if (perItemKcal >= 500) radius = 32;
        else if (perItemKcal >= 250) radius = 26;
        else if (perItemKcal >= 100) radius = 20;

        for (let i = 0; i < qty; i++) {
          rawBalls.push({ kcal: perItemKcal, emoji: icon, radius });
        }
      }
    });

    // poppedAmounts 存「每一次實際點掉的 kcal」清單，不是單一總量——
    // 只存總量的話，重建球清單只能用「最舊的先扣」去猜，猜錯就會錯亂
    const poppedAmounts = grossConsumed === 0 ? [] : [...(cal.poppedAmounts || [])];
    const popped = poppedAmounts.reduce((sum, v) => sum + v, 0);

    const remaining = [...poppedAmounts];
    let balls = [];
    rawBalls.forEach(ball => {
      const idx = remaining.indexOf(ball.kcal);
      if (idx > -1) {
        remaining.splice(idx, 1);
      } else {
        balls.push(ball);
      }
    });

    return {
      consumed: grossConsumed,
      burned: grossBurned,
      popped,
      quota: Math.max(0, grossBurned - popped),
      displayConsumed: Math.max(0, grossConsumed - popped),
      balls,
    };
  },

  // 點擊熱量球燃燒：amount 為該球的 kcal
  popCalorieBall(amount) {
    const truth = this.getCalorieTruth();
    if (truth.quota < amount) {
      EventBus.emit(Events.System.TOAST, '❌ 燃燒額度不足！');
      return { success: false };
    }
    setState(s => ({
      cal: { ...s.cal, poppedAmounts: [...(s.cal?.poppedAmounts || []), amount] },
    }));
    EventBus.emit(Events.Stats.UPDATED);
    return { success: true };
  },
};