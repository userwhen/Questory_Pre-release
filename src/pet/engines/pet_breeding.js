/* src/engines/pet_breeding.js */
// 繁殖/血統整條管線：出生選擇、幼崽長大、繁殖機率檢查、懷孕推進、
// 幼年期結束鎖定血統、家族血統圖鑑全收集獎勵。
import { getState, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { LINEAGE_DICTIONARY, calculateLineageId, DEFAULT_LINEAGE_ID } from '@/pet/data/pet_lineage.js';

export const petBreedingMethods = {

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