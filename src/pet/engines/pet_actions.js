/* src/engines/pet_actions.js */
// 玩家/任務直接觸發的動作：餵食/玩耍/觸摸互動、任務完成效果、撿便便、
// 探險同意/婉拒。
import { getState, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { ATTACHMENT_AFFECTION_MULT } from '@/pet/data/pet_config.js';
import { PERSONALITY_TABLE } from '@/pet/data/pet_personality.js';

const DEFAULT_PERSONALITY_STATS = { feedMult: 1, playMult: 1, touchAffMult: 1, lowStatPenaltyMult: 1, exploreChanceMult: 1 };

export const petActionsMethods = {

  // ─── 互動（餵食/玩耍/觸摸/任務）────────────────────
  interact(petIndex, actionType, value = 0) {
    const s = getState();

    // 幼崽
    if (petIndex === 'baby') {
      if (!s.babyPetData) return;
      setState(s => {
        const bd = { ...s.babyPetData };
        if (actionType === 'feed') bd.food = Math.min(100, bd.food + value);
        if (actionType === 'play') bd.mood = Math.min(100, bd.mood + value);
        if (actionType === 'touch') bd.mood = Math.min(100, bd.mood + 2);
        bd.lastUpdate = Date.now();
        return { babyPetData: bd };
      });
      EventBus.emit(Events.Pet.UPDATED);
      return;
    }

    if (!s.activePets?.[petIndex]) return;

    setState(s => {
      let unlockedLineage = null;

      const pets = s.activePets.map((pet, i) => {
        if (i !== petIndex) return pet;
        let p = { ...pet, traits: { ...pet.traits } };

        const pStats = PERSONALITY_TABLE[p.personality] ?? DEFAULT_PERSONALITY_STATS;
        let actualVal = value;
        let addAff    = 0;

        if (p.isSick && (actionType === 'feed' || actionType === 'play')) {
          actualVal = Math.floor(actualVal / 2);
        }

        if (actionType === 'feed') {
          actualVal = Math.round(actualVal * pStats.feedMult);
          p.food = Math.min(100, p.food + actualVal);
          addAff = 2;
        } else if (actionType === 'play') {
          actualVal = Math.round(actualVal * pStats.playMult);
          p.mood = Math.min(100, p.mood + actualVal);
          addAff = 3;
        } else if (actionType === 'touch') {
          if (p.food >= 20 && p.mood >= 20) addAff = 1 * (pStats.touchAffMult ?? 1);
          p.mood = Math.min(100, p.mood + 2);
        } else if (actionType === 'task') {
          addAff = actualVal;
        }

        // 依附性格影響親密度獲取效率：安全型有小幅加成，恐懼型打折
        // （跟性格倍率是疊乘關係，例如黏人+安全會疊出更高的加成）
        const attachMult = ATTACHMENT_AFFECTION_MULT[p.traits?.attachment] ?? 1;
        addAff = Math.round(addAff * attachMult);

        p.affection = (p.affection ?? 0) + addAff;
        if (['feed', 'play', 'touch'].includes(actionType)) p.lastInteract = Date.now();

        // 幼年期成長：自然長大的寵物，成長完成時鎖定預設血統；
        // 血統繼承來的寵物出生時 geneLocked 就已經是 true，不會走到這裡
        if (p.isGrowing) {
          if (p.food >= 60 && p.mood >= 60 && addAff > 0) {
            p.growthProgress = Math.min(100, (p.growthProgress ?? 0) + addAff * 4);
            p = this._finalizeGrowth(p);
            if (p.geneLocked && !(s.petArchive ?? []).includes(p.lineage)) {
              unlockedLineage = p.lineage;
            }
          }
        } else {
          // 升級判定
          const cap = p.level * 100;
          if (p.affection >= cap) {
            p.affection -= cap;
            p.level++;
            EventBus.emit(Events.System.TOAST, `🎉 ${p.name} 升級到了 Lv.${p.level}！`);
          }
        }

        p.lastUpdate = Date.now();
        return p;
      });

      if (!unlockedLineage) return { activePets: pets };

      const newArchive = [...(s.petArchive ?? []), unlockedLineage];
      const bonus = this._checkArchiveCompletion(newArchive);
      setTimeout(() => EventBus.emit(Events.System.TOAST, `📖 家族血統圖鑑解鎖：【${unlockedLineage}】！`), 800);

      return {
        activePets: pets,
        petArchive: newArchive,
        ...(bonus ? { gold: (s.gold ?? 0) + bonus.gold, freeGem: (s.freeGem ?? 0) + bonus.freeGem } : {}),
      };
    });

    EventBus.emit(Events.Pet.UPDATED);
    EventBus.emit(Events.Stats.UPDATED);
  },

  // ─── 任務完成觸發 ────────────────────────────────────
  onTaskCompleted(task) {
    const s = getState();
    if (!s.activePets?.length) return;

    setState(s => {
      const newlyUnlocked = [];

      const pets = s.activePets.map((pet, idx) => {
        let p = { ...pet, traits: { ...pet.traits, taskVotes: { ...(pet.traits?.taskVotes ?? {}) } } };
        const baseExpGain = (task.importance ?? 1) * 10;
        const attachMult = ATTACHMENT_AFFECTION_MULT[p.traits?.attachment] ?? 1;
        const expGain = Math.round(baseExpGain * attachMult);
        p.affection = (p.affection ?? 0) + expGain;

        if (p.isGrowing && p.food >= 60 && p.mood >= 60) {
          p.growthProgress = Math.min(100, (p.growthProgress ?? 0) + expGain * 0.5);
          p = this._finalizeGrowth(p);
          if (p.geneLocked && ![...(s.petArchive ?? []), ...newlyUnlocked].includes(p.lineage)) {
            newlyUnlocked.push(p.lineage);
          }
        } else if (!p.isGrowing) {
          while (p.affection >= p.level * 100) {
            p.affection -= p.level * 100;
            p.level++;
            EventBus.emit(Events.System.TOAST, `🎉 ${p.name} 升級到了 Lv.${p.level}！`);
          }
        }

        // 生病中完成任務，也能小幅加速康復進度
        if (p.isSick) {
          const newProgress = Math.min(100, (p.recoveryProgress ?? 0) + 5);
          if (newProgress >= 100) {
            p.isSick = false;
            p.recoveryProgress = 0;
            p.poops = [];
            EventBus.emit(Events.System.TOAST, `🎉 ${p.name} 恢復健康了！`);
          } else {
            p.recoveryProgress = newProgress;
          }
        }

        if (task.attrs?.length) {
          task.attrs.forEach(attr => {
            p.traits.taskVotes[attr] = (p.traits.taskVotes[attr] ?? 0) + 1;
          });
          let topAttr = '無', maxVotes = 0;
          Object.entries(p.traits.taskVotes).forEach(([k, v]) => {
            if (v > maxVotes) { maxVotes = v; topAttr = k; }
          });
          p.traits.task = topAttr;
        }

        return p;
      });

      const rel = Math.min(100, (s.petRelationship ?? 50) + (pets.length >= 2 ? 2 : 0));

      if (!newlyUnlocked.length) return { activePets: pets, petRelationship: rel };

      const newArchive = [...(s.petArchive ?? []), ...newlyUnlocked];
      const bonus = this._checkArchiveCompletion(newArchive);
      newlyUnlocked.forEach(id =>
        setTimeout(() => EventBus.emit(Events.System.TOAST, `📖 家族血統圖鑑解鎖：【${id}】！`), 800));

      return {
        activePets: pets,
        petRelationship: rel,
        petArchive: newArchive,
        ...(bonus ? { gold: (s.gold ?? 0) + bonus.gold, freeGem: (s.freeGem ?? 0) + bonus.freeGem } : {}),
      };
    });

    // 兩隻成寵都達到 5 級以上，才有機會觸發懷孕（生病中也能懷孕，只是比較難維持雙滿門檻）
    const updated = getState().activePets;
    if (updated.length === 2 && updated[0].level >= 5 && updated[1].level >= 5) {
      this.checkReproductionChance();
    }

    this._progressPregnancy(10);
    EventBus.emit(Events.Pet.UPDATED);
    EventBus.emit(Events.Stats.UPDATED);
  },

  // ─── 撿便便 ──────────────────────────────────────────
  pickUpPoop(petIndex, poopId) {
    setState(s => {
      const pets = s.activePets.map((pet, i) => {
        if (i !== petIndex) return pet;
        const poops = (pet.poops ?? []).filter(p => p.id !== poopId);
        return { ...pet, poops };
      });
      return { activePets: pets, gold: (s.gold ?? 0) + 5 };
    });
    EventBus.emit(Events.System.TOAST, '🧹 清理了便便，獲得 5 金幣！');
    EventBus.emit(Events.Pet.UPDATED);
    EventBus.emit(Events.Stats.UPDATED);
  },

  // ─── 探險：出發 ──────────────────────────────────────
  startExplore(index) {
    const s = getState();
    const pet = s.activePets?.[index];
    if (!pet) return;
    const EXPLORE_DURATION_MS = 2 * 3_600_000; // 探險時長 2 小時，可自行調整

    setState(s => ({
      activePets: s.activePets.map((p, i) => i === index
        ? { ...p, status: 'exploring', pendingExplore: false, exploreExpiresAt: null, returnTime: Date.now() + EXPLORE_DURATION_MS }
        : p),
    }));

    EventBus.emit(Events.System.TOAST, `🗺️ ${pet.name} 開心地出發去探險了！`);
    EventBus.emit(Events.Pet.UPDATED);
  },

  // ─── 探險：婉拒邀約 ──────────────────────────────────
  dismissExplore(index) {
    setState(s => ({
      activePets: (s.activePets ?? []).map((p, i) => i === index ? { ...p, pendingExplore: false, exploreExpiresAt: null } : p),
    }));
    EventBus.emit(Events.Pet.UPDATED);
  },
};