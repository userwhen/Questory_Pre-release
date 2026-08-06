/* src/engines/pet_decay.js */
// 被動/系統觸發的持續狀態變化：離線/定時衰減（依附性格判定、便便生成、
// 生病判定、探險邀約觸發、探險歸來發獎），以及每日重置時的生病康復檢查。
import { getState, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { DECAY_RATES, NEGLECT_PER_SICKNESS } from '@/pet/data/pet_config.js';
import { PERSONALITY_TABLE, PERSONALITY_KEYS } from '@/pet/data/pet_personality.js';
import { LINEAGE_DICTIONARY, DEFAULT_LINEAGE_ID } from '@/pet/data/pet_lineage.js';
import { PET_SHOP_ITEMS } from '@/pet/data/pet_shop_items.js';

const DEFAULT_PERSONALITY_STATS = { feedMult: 1, playMult: 1, touchAffMult: 1, lowStatPenaltyMult: 1, exploreChanceMult: 1 };

export const petDecayMethods = {

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
};