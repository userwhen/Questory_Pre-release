/* src/avatar/engines/portrait.js */
// 頭像／頭像框：純函式模組，刻意不碰 AvatarEngine 的任何內部狀態，只靠
// getState/setState/EventBus 跟外界溝通——保留「之後要獨立成 Engine」的空間，
// 屆時只要幫這裡包一層 makeIdempotentInit、自己註冊事件，main.jsx 多呼叫一次
// .init() 就好，這裡的邏輯完全不用重寫。
//
// 事件監聽目前仍然掛在 @/engines/avatar.js 的 init() 裡，這裡只負責邏輯本體。

import { getState, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { COSMETIC_TABLES, checkMilestoneUnlock, NONE_COSMETIC } from '@/avatar/data/portrait_config.js';

function resolveTable(kind) {
  const table = COSMETIC_TABLES[kind];
  if (!table) throw new Error(`[portrait.js] 未知的 kind: ${kind}`);
  return table;
}

// ─── 預覽（只寫 previewPortrait/previewFrame，不存檔）─────────────
export function previewCosmetic(kind, itemId) {
  const previewKey = kind === 'portrait' ? 'previewPortrait' : 'previewFrame';

  if (itemId && itemId !== NONE_COSMETIC) {
    const { unlockedKey } = resolveTable(kind);
    const unlocked = getState().avatar?.[unlockedKey] ?? [];
    if (!unlocked.includes(itemId)) return; // 還沒擁有的不給預覽
  }

  setState(() => ({ [previewKey]: itemId ?? null }));
  EventBus.emit(Events.Avatar.UPDATED);
}

export function clearCosmeticPreview(kind) {
  const previewKey = kind === 'portrait' ? 'previewPortrait' : 'previewFrame';
  setState(() => ({ [previewKey]: null }));
  EventBus.emit(Events.Avatar.UPDATED);
}

// ─── 裝備（無互斥邏輯；frame 允許 NONE_COSMETIC 表示不使用）─────────────
export function equipCosmetic(kind, id) {
  const { equippedKey, unlockedKey } = resolveTable(kind);
  const previewKey = kind === 'portrait' ? 'previewPortrait' : 'previewFrame';

  if (id && id !== NONE_COSMETIC) {
    const unlocked = getState().avatar?.[unlockedKey] ?? [];
    if (!unlocked.includes(id)) {
      EventBus.emit(Events.System.TOAST, '🔒 尚未解鎖這個項目');
      return;
    }
  }

  setState(s => ({
    avatar: { ...s.avatar, [equippedKey]: id ?? NONE_COSMETIC },
    [previewKey]: null,
  }));

  EventBus.emit(Events.System.TOAST, '✨ 已裝備');
  EventBus.emit(Events.Avatar.UPDATED);
}

// ─── 購買（鑽石，free 優先扣）─────────────────────────────────────
export function buyCosmetic(kind, id) {
  const { shop, unlockedKey } = resolveTable(kind);
  const s = getState();
  const unlocked = s.avatar?.[unlockedKey] ?? [];

  if (unlocked.includes(id)) return { success: false, msg: '這個已經擁有了' };

  const item = shop.find(i => i.id === id);
  if (!item) return { success: false, msg: '找不到這個項目' };
  if (item.unlockCondition) return { success: false, msg: '這個項目只能透過里程碑解鎖' };

  const totalGem = (s.freeGem ?? 0) + (s.paidGem ?? 0);
  if ((item.price ?? 0) > 0 && totalGem < item.price) {
    return { success: false, msg: `💎 鑽石不足（需 ${item.price}）` };
  }

  setState(s => {
    const newUnlocked = [...(s.avatar?.[unlockedKey] ?? []), id];
    let freeGem = s.freeGem ?? 0;
    let paidGem = s.paidGem ?? 0;

    if (item.price > 0) {
      let cost = item.price;
      const freeDeduct = Math.min(cost, freeGem);
      freeGem -= freeDeduct;
      cost -= freeDeduct;
      paidGem = Math.max(0, paidGem - cost);
    }

    return {
      freeGem,
      paidGem,
      avatar: { ...s.avatar, [unlockedKey]: newUnlocked },
    };
  });

  EventBus.emit(Events.Avatar.UPDATED);
  return { success: true };
}

// ─── 里程碑掃描：達標自動解鎖 + toast，比照 AvatarEngine._checkSetRewards() ─────
export function checkMilestones() {
  const s = getState();
  const playerStats = { lv: s.lv, loginStreak: s.loginStreak, totalLoginDays: s.totalLoginDays };

  let changed = false;
  let nextAvatar = { ...s.avatar };

  for (const kind of Object.keys(COSMETIC_TABLES)) {
    const { shop, unlockedKey } = COSMETIC_TABLES[kind];
    const unlocked = nextAvatar[unlockedKey] ?? [];

    const newItems = shop.filter(item =>
      item.unlockCondition &&
      !unlocked.includes(item.id) &&
      checkMilestoneUnlock(item, playerStats)
    );

    if (newItems.length === 0) continue;

    changed = true;
    nextAvatar = { ...nextAvatar, [unlockedKey]: [...unlocked, ...newItems.map(i => i.id)] };
    newItems.forEach(item => {
      EventBus.emit(Events.System.TOAST, `✨ 解鎖新${kind === 'portrait' ? '頭像' : '頭像框'}：【${item.name}】`);
    });
  }

  if (!changed) return;

  setState(() => ({ avatar: nextAvatar }));
  EventBus.emit(Events.Avatar.UPDATED);
}