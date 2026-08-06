/* src/engines/pet.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import {
  DECAY_RATES, ATTACHMENT_AFFECTION_MULT,
  PERSONALITY_TABLE, PERSONALITY_KEYS,
  LINEAGE_DICTIONARY, calculateLineageId, DEFAULT_LINEAGE_ID,
  NEGLECT_PER_SICKNESS, PET_SHOP_ITEMS, createBasePetFields,
} from '@/data/pet_config.js';

const DEFAULT_PERSONALITY_STATS = { feedMult: 1, playMult: 1, touchAffMult: 1, lowStatPenaltyMult: 1, exploreChanceMult: 1 };

export const PetEngine = {

  // ─── 初始化 ──────────────────────────────────────────
  init: makeIdempotentInit(function () {
    setState(s => ({
      activePets:      s.activePets      ?? [],
      babyPet:         s.babyPet         ?? null,
      babyPetName:     s.babyPetName     ?? null,
      babyPetData:     s.babyPetData     ?? null,
      petRelationship: s.petRelationship ?? 50,
      petArchive:      s.petArchive      ?? [],
    }));

    this.updateDecay();

    const unsubTask = EventBus.on(Events.Task.COMPLETED, ({ task }) => {
      this.onTaskCompleted(task);
    });

    const unsubInteract = EventBus.on(Events.Pet.REQUEST_INTERACT, ({ target, action, amount }) => {
      this.interact(target, action, amount);
    });
    const unsubPickup = EventBus.on(Events.Pet.REQUEST_PICKUP_POOP, ({ index, poopId }) => {
      this.pickUpPoop(index, poopId);
    });
    const unsubGrowUp = EventBus.on(Events.Pet.REQUEST_GROW_UP_BABY, ({ name }) => {
      this.growUpBaby(name);
    });
    const unsubBirth = EventBus.on(Events.Pet.REQUEST_RESOLVE_BIRTH, ({ choice, babyId, babyName }) => {
      this.resolveBirth(choice, babyId, babyName);
    });
    const unsubStartExplore = EventBus.on(Events.Pet.REQUEST_START_EXPLORE, ({ index }) => {
      this.startExplore(index);
    });
    const unsubDismissExplore = EventBus.on(Events.Pet.REQUEST_DISMISS_EXPLORE, ({ index }) => {
      this.dismissExplore(index);
    });
    const unsubDailyReset = EventBus.on(Events.System.DAILY_RESET, () => {
      this.processSickRecoveryOnDailyReset();
    });
    const unsubNamePet = EventBus.on(Events.Pet.REQUEST_NAME_PET, ({ index, name }) => {
      this.namePet(index, name);
    });

    const decayInterval = setInterval(() => this.updateDecay(), 60_000);

    return [unsubTask, unsubInteract, unsubPickup, unsubGrowUp, unsubBirth,
      unsubStartExplore, unsubDismissExplore, unsubDailyReset, unsubNamePet,
      () => clearInterval(decayInterval)];
  }),

  // ─── 建立新寵物資料 ──────────────────────────────────
  // 實際欄位組裝已經搬到 pet_config.js 的 createBasePetFields()，讓
  // avatar.js（購買/裝備路徑）也能共用同一份，確保兩扇門進來的寵物
  // 資料格式永遠一致。保留這個方法名稱只是維持既有呼叫端
  // （resolveBirth/growUpBaby 等）不用改呼叫方式。
  createNewPet(options = {}) {
    return createBasePetFields(options);
  },

  // ─── 幫剛從購買/裝備這扇門進來的寵物確認名字 ─────────
  namePet(index, name) {
    setState(s => ({
      activePets: (s.activePets ?? []).map((p, i) => i === index
        ? { ...p, name: name?.trim() || p.name, needsNaming: false }
        : p),
    }));
    EventBus.emit(Events.Pet.UPDATED);
  },

  // ─── 離線 / 定時衰減 ────────────────────────────────
  updateDecay() {
    const s    = getState();
    const now  = Date.now();
    const hasAdults = (s.activePets?.length ?? 0) > 0;
    const hasBaby   = !!(s.babyPet && s.babyPetData);
    if (!hasAdults && !hasBaby) return;

    let changed = false;
    const returnedPets = [];

    // ── 成寵衰減 ──
    if (hasAdults) {
      const newPets = s.activePets.map(pet => {
        // 探險中跳過
        if (pet.status === 'exploring') {
          if (pet.returnTime && now >= pet.returnTime) {
            changed = true;
            returnedPets.push({ ...pet });
            return { ...pet, status: 'normal', returnTime: null };
          }
          return pet;
        }

        let p = { ...pet };
        if (!Number.isFinite(p.food))      p.food      = 50;
        if (!Number.isFinite(p.mood))      p.mood      = 50;
        if (!Number.isFinite(p.affection)) p.affection = 0;
        if (!p.poops)  p.poops  = [];
        if (!p.traits) p.traits = { task: '無', attachment: '安全', taskVotes: {} };
        if (!p.bias)   p.bias   = { arrogance: 0, neglect: 0, anxiety: 0 };
        if (p.generation === undefined) p.generation = 0;
        // 相容舊存檔：這批更新之前建立的寵物可能還沒有性格/血統欄位
        if (!p.personality) p.personality = PERSONALITY_KEYS[Math.floor(Math.random() * PERSONALITY_KEYS.length)];
        if (!p.lineage)      p.lineage    = DEFAULT_LINEAGE_ID;

        const pStats = PERSONALITY_TABLE[p.personality] ?? DEFAULT_PERSONALITY_STATS;

        const elapsedHours = (now - (p.lastUpdate || now)) / 3_600_000;
        if (elapsedHours < 0.1) return p;

        const mult = p.isSick ? 1.5 : 1;
        p.food = Math.max(0, p.food - DECAY_RATES.food * elapsedHours * mult);
        p.mood = Math.max(0, p.mood - DECAY_RATES.mood * elapsedHours * mult);

        // 依附性格
        const interactHours = (now - (p.lastInteract || now)) / 3_600_000;
        p.traits = { ...p.traits };
        if      (interactHours < 12) p.traits.attachment = '安全';
        else if (interactHours < 24) p.traits.attachment = '焦慮';
        else if (interactHours < 48) p.traits.attachment = '逃避';
        else                         p.traits.attachment = '恐懼';

        // 便便生成：每小時約 15% 機率，最多累積 3 坨
        if (p.poops.length < 3 && Math.random() < elapsedHours * 0.15) {
          p.poops = [...p.poops, {
            id: `poop_${now}_${Math.floor(Math.random() * 1000)}`,
            createdAt: now,
            offsetX: (Math.random() - 0.5) * 80,
          }];
          EventBus.emit(Events.System.TOAST, `💩 哎呀！${p.name ?? '寵物'}剛剛便便了，快清掉以免生病！`);
        }

        // 便便數量 → 生病（一旦生病，只能靠康復進度自然痊癒，清便便不會直接治癒）
        // 每次「從健康轉為生病」，都會在血統上留下一筆 neglect 紀錄，康復後也不會
        // 消除，會影響這隻寵物未來生的孩子的體質血統（但不影響牠自己懷孕的能力）
        if (!p.isSick && p.poops.length >= 3) {
          p.isSick = true;
          p.recoveryProgress = 0;
          p.bias = { ...p.bias, neglect: (p.bias.neglect ?? 0) + NEGLECT_PER_SICKNESS };
          EventBus.emit(Events.System.TOAST, `🤧 ${p.name ?? '寵物'}生病了！好好照顧牠，讓牠早日康復吧。`);
        }

        // 親密度懲罰（高冷性格對這個懲罰有抵抗力，情緒比較獨立）
        if (p.food < 30 || p.mood < 30) {
          let penalty = 0;
          if (p.food < 30) penalty += 1;
          if (p.mood < 30) penalty += 1;
          if (p.food === 0 && p.mood === 0) penalty += 2;
          p.affection -= penalty * elapsedHours * (pStats.lowStatPenaltyMult ?? 1);
          while (p.affection < 0 && p.level > 1) {
            p.level--;
            p.affection += p.level * 100;
          }
          if (p.level <= 1 && p.affection < 0) p.affection = 0;
        }

        // 探險邀約逾時：玩家沒有在時間內回應，邀約自動收回，要等下次機率重新觸發
        // （故意設計成「有時候有，錯過要再等」，鼓勵玩家常回來看看；
        //   好奇性格觸發機率倍增，呼應牠對外界充滿好奇心的個性）
        if (p.pendingExplore && p.exploreExpiresAt && now >= p.exploreExpiresAt) {
          p.pendingExplore = false;
          p.exploreExpiresAt = null;
        } else if (!p.isGrowing && !p.isPregnant && !p.isSick && !p.pendingExplore
            && p.food >= 60 && p.mood >= 60
            && Math.random() < elapsedHours * 0.03 * (pStats.exploreChanceMult ?? 1)) {
          p.pendingExplore = true;
          p.exploreExpiresAt = now + 30 * 60 * 1000; // 30 分鐘內要回應，可自行調整
          EventBus.emit(Events.System.TOAST, `🗺️ ${p.name ?? '寵物'}好像想出去探險，去看看牠怎麼說吧！`);
        }

        p.lastUpdate = now;
        changed = true;
        return p;
      });

      if (changed) setState(() => ({ activePets: newPets }));
    }

    // ── 感情衰減 ──
    if ((s.activePets?.length ?? 0) === 2) {
      const relHours = (now - (s.lastRelUpdate || now)) / 3_600_000;
      if (relHours >= 0.1) {
        const [p1, p2] = s.activePets;
        let decay = 0.5 * relHours;
        if (p1.food < 30 || p2.food < 30) decay += 1.5 * relHours;
        if (p1.isSick || p2.isSick)       decay += 2.0 * relHours;
        setState(s => ({
          petRelationship: Math.max(0, (s.petRelationship ?? 50) - decay),
          lastRelUpdate: now,
        }));
        changed = true;
      }
    }

    // ── 幼崽衰減 ──
    if (hasBaby) {
      const bd = s.babyPetData;
      const bHours = (now - (bd.lastUpdate || now)) / 3_600_000;
      if (bHours >= 0.1) {
        setState(s => ({
          babyPetData: {
            ...s.babyPetData,
            food: Math.max(0, (s.babyPetData.food ?? 50) - DECAY_RATES.food * bHours * 1.2),
            mood: Math.max(0, (s.babyPetData.mood ?? 50) - DECAY_RATES.mood * bHours * 1.2),
            lastUpdate: now,
          },
        }));
        changed = true;
      }
    }

    // ── 探險歸來發獎 ──
    returnedPets.forEach(pet => {
      const isGenius = LINEAGE_DICTIONARY[pet.lineage]?.smart === true;
      const lootCount = isGenius ? 2 : 1;
      const lootItem = PET_SHOP_ITEMS.find(i => i.id === 'sys_pet_toy');
      if (lootItem) {
        setState(s => {
          const bag = [...(s.bag ?? [])];
          const bIdx = bag.findIndex(b => b.id === lootItem.id);
          if (bIdx > -1) bag[bIdx] = { ...bag[bIdx], count: bag[bIdx].count + lootCount };
          else bag.push({ ...lootItem, count: lootCount });
          return { bag };
        });
      }
      EventBus.emit(Events.System.TOAST, isGenius
        ? `🗺️ ${pet.name ?? '寵物'} 運用聰明才智，探險帶回了雙倍的毛線球玩具！`
        : `🗺️ ${pet.name ?? '寵物'} 探險歸來，帶回了一顆毛線球玩具！`);
    });

    if (changed) EventBus.emit(Events.Pet.UPDATED);
  },

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

  // ─── 生病康復：每日重置時檢查「昨天有沒有把寵物照顧到雙滿」──
  processSickRecoveryOnDailyReset() {
    const s = getState();
    if (!s.activePets?.some(p => p.isSick)) return;

    setState(s => ({
      activePets: s.activePets.map(p => {
        if (!p.isSick) return p;

        const wellCared = (p.food ?? 0) >= 90 && (p.mood ?? 0) >= 90;
        if (!wellCared) return p;

        const progress = Math.min(100, (p.recoveryProgress ?? 0) + 40);
        if (progress >= 100) {
          EventBus.emit(Events.System.TOAST, `🎉 ${p.name} 恢復健康了！`);
          return { ...p, isSick: false, recoveryProgress: 0, poops: [] };
        }
        EventBus.emit(Events.System.TOAST, `💊 悉心照顧下，${p.name} 的康復進度提升了！`);
        return { ...p, recoveryProgress: progress };
      }),
    }));

    EventBus.emit(Events.Pet.UPDATED);
  },

  // ─── 幼崽長大 ────────────────────────────────────────
  // 血統/世代早在 resolveBirth() 的 mascot 分支就已經算好、存進 babyPetData 裡了，
  // 這裡只是把它讀出來、正式鎖定成一隻完整的寵物
  growUpBaby(babyName) {
    const s = getState();
    if (!s.babyPet) return;

    const bd = s.babyPetData ?? {};
    const lineageId = bd.pendingLineage ?? DEFAULT_LINEAGE_ID;
    const generation = bd.pendingGeneration ?? 0;

    setState(s => {
      const newPet = this.createNewPet({
        id: s.babyPet, name: babyName ?? s.babyPetName ?? '新寵物',
        isGrowing: false, level: 1, growthProgress: 100,
        lineage: lineageId, geneLocked: true, generation,
      });

      const newArchive = [...(s.petArchive ?? [])];
      let bonus = null;
      if (!newArchive.includes(lineageId)) {
        newArchive.push(lineageId);
        bonus = this._checkArchiveCompletion(newArchive);
        setTimeout(() => EventBus.emit(Events.System.TOAST, `📖 家族血統圖鑑解鎖：【${lineageId}】！`), 800);
      }

      return {
        activePets: [newPet], // 幼崽長大取代父母（沿用既有行為，已跟你確認過是預期設計）
        babyPet: null, babyPetName: null, babyPetData: null,
        petArchive: newArchive,
        avatar: s.avatar ? { ...s.avatar, wearing: { ...s.avatar.wearing, pet: s.babyPet } } : s.avatar,
        ...(bonus ? { gold: (s.gold ?? 0) + bonus.gold, freeGem: (s.freeGem ?? 0) + bonus.freeGem } : {}),
      };
    });

    EventBus.emit(Events.System.TOAST, `✨ 寵物順利長大了，血統是【${lineageId}】！`);
    EventBus.emit(Events.Pet.UPDATED);
  },

  // ─── 出生選擇 ────────────────────────────────────────
  resolveBirth(choice, babyId, babyName) {
    const s = getState();
    const [p1, p2] = s.activePets ?? [];

    // 重置懷孕狀態
    setState(s => ({
      activePets: (s.activePets ?? []).map(p => ({ ...p, isPregnant: false, pregnancyProgress: 0 })),
    }));

    if (choice === 'giveaway') {
      setState(s => ({ gold: (s.gold ?? 0) + 100 }));
      EventBus.emit(Events.System.TOAST, '🏡 寶寶找到了好人家！獲得 100 金幣。');
      EventBus.emit(Events.Pet.UPDATED);
      return;
    }

    const finalName = babyName?.trim() || '新寵物';

    // 血統計算所需的親代資料。「讓父母去旅行」跟「當迷你幼仔」兩條路徑共用同一套
    // 公式，都是在出生的當下就用父母目前的狀態鎖定血統，之後不會再被個體表現覆蓋
    const lineageParams = (p1 && p2) ? {
      avgParentLevel: (p1.level + p2.level) / 2,
      neglectBias:    (p1.bias?.neglect ?? 0) + (p2.bias?.neglect ?? 0),
      arroganceBias:  (p1.bias?.arrogance ?? 0) + (p2.bias?.arrogance ?? 0),
      generation: Math.max(p1.generation ?? 0, p2.generation ?? 0) + 1,
    } : { avgParentLevel: undefined, neglectBias: 0, arroganceBias: 0, generation: 0 };

    const lineageId = calculateLineageId(lineageParams);

    if (choice === 'replace') {
      const newPet = this.createNewPet({
        id: babyId, name: finalName,
        isGrowing: false, level: 1, growthProgress: 100,
        lineage: lineageId, geneLocked: true, generation: lineageParams.generation,
      });

      setState(s => {
        const newArchive = [...(s.petArchive ?? [])];
        let bonus = null;
        if (!newArchive.includes(lineageId)) {
          newArchive.push(lineageId);
          bonus = this._checkArchiveCompletion(newArchive);
          setTimeout(() => EventBus.emit(Events.System.TOAST, `📖 家族血統圖鑑解鎖：【${lineageId}】！`), 800);
        }
        return {
          activePets: [newPet],
          petArchive: newArchive,
          avatar: s.avatar ? { ...s.avatar, wearing: { ...s.avatar.wearing, pet: babyId } } : s.avatar,
          ...(bonus ? { gold: (s.gold ?? 0) + bonus.gold, freeGem: (s.freeGem ?? 0) + bonus.freeGem } : {}),
        };
      });
      EventBus.emit(Events.System.TOAST, `✈️ 父母去旅行了，留下【${lineageId}】的 ${finalName}！`);
    }

    if (choice === 'mascot') {
      // 迷你幼仔現在還沒有真正的 pet 物件，血統先算好存進 babyPetData，
      // 等玩家之後呼叫 growUpBaby() 時直接拿來鎖定即可
      setState(() => ({
        babyPet:     babyId,
        babyPetName: finalName,
        babyPetData: {
          food: 50, mood: 50, lastUpdate: Date.now(), rightPos: 45,
          pendingLineage: lineageId, pendingGeneration: lineageParams.generation,
        },
      }));
      EventBus.emit(Events.System.TOAST, `🧸 ${finalName} 成為了家裡的迷你幼仔！`);
    }

    EventBus.emit(Events.Pet.UPDATED);
  },

  // ─── 內部：幼年期結束，鎖定血統 ──────────────────────
  // 只有「自然長大」（沒有走繁殖路徑）的寵物會呼叫到這裡，
  // 所以 avgParentLevel 永遠是 undefined，一律拿到預設血統（平民血統）；
  // 繁殖出生的寵物（replace/mascot）在出生當下就已經鎖定血統、isGrowing 直接
  // 是 false，不會再進到這個判定。
  _finalizeGrowth(pet) {
    if (!pet.isGrowing || pet.growthProgress < 100) return pet;

    const p = { ...pet };
    p.isGrowing      = false;
    p.level          = 1;
    p.affection      = 0;
    p.growthProgress = 100;
    p.lineage = calculateLineageId({
      avgParentLevel: undefined,
      neglectBias: p.bias?.neglect,
      arroganceBias: p.bias?.arrogance,
      generation: p.generation,
    });
    p.geneLocked = true;

    EventBus.emit(Events.System.TOAST, `✨ ${p.name} 順利長大了！`);
    return p;
  },

  // ─── 內部：家族血統圖鑑全收集獎勵 ────────────────────
  _checkArchiveCompletion(newArchive) {
    if (newArchive.length < Object.keys(LINEAGE_DICTIONARY).length) return null;
    setTimeout(() => EventBus.emit(Events.System.TOAST,
      '🏆 家族血統圖鑑全數收集齊全！感謝你悉心照顧每一位毛孩，獲得 500 金幣、50 鑽石獎勵！'), 2400);
    return { gold: 500, freeGem: 50 };
  },

  // ─── 內部：懷孕推進 ──────────────────────────────────
  _progressPregnancy(amount) {
    const s = getState();
    const idx = (s.activePets ?? []).findIndex(p => p.isPregnant);
    if (idx < 0) return;

    setState(s => {
      const pets = s.activePets.map((p, i) => {
        if (i !== idx) return p;
        const progress = Math.min(100, (p.pregnancyProgress ?? 0) + amount);
        return { ...p, pregnancyProgress: progress };
      });
      return { activePets: pets };
    });

    const updated = getState().activePets[idx];
    if (updated.pregnancyProgress >= 100) {
      EventBus.emit(Events.Pet.BIRTH_READY, { motherIndex: idx });
    }
  },

  // ─── 繁殖機率檢查 ────────────────────────────────────
  // 刻意不擋 isSick：生病只會讓食物/心情衰減變快、比較難維持雙滿門檻，
  // 不會直接封鎖懷孕，這是跟你確認過的設計
  checkReproductionChance() {
    const s = getState();
    if (s.babyPet) return;
    if ((s.activePets ?? []).some(p => p.isGrowing || p.isPregnant)) return;
    if ((s.activePets?.length ?? 0) < 2) return;

    const [p1, p2] = s.activePets;
    if (p1.food < 80 || p1.mood < 80 || p2.food < 80 || p2.mood < 80) return;

    const chance = 0.05 * ((s.petRelationship ?? 50) / 100);
    if (Math.random() < chance) {
      const motherIdx = Math.random() > 0.5 ? 0 : 1;
      setState(s => ({
        activePets: s.activePets.map((p, i) =>
          i === motherIdx ? { ...p, isPregnant: true, pregnancyProgress: 0 } : p
        ),
      }));
      EventBus.emit(Events.System.TOAST, '💖 寵物們似乎有了愛的結晶...！');
      EventBus.emit(Events.Pet.UPDATED);
    }
  },
};