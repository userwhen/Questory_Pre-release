/* src/engines/pet_roster.js */
// 寵物名冊管理：建立新寵物資料、確認取名、以及購買/裝備門的新增與替換邏輯。
// 後三者（_handlePetWear/_addNewPet/confirmPetReplace）原本在 avatar.js，
// 因為 Engine 之間不能互相 import，且這些動作本質上是在管理 activePets
// 名冊，這次搬進 PetEngine 統一管理；avatar.js 現在只發 EventBus 事件請求。
import { getState, setState } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { createBasePetFields, pickSpacedRightPos } from '@/pet/data/pet_config.js';

export const petRosterMethods = {

  // ─── 建立新寵物資料 ──────────────────────────────────
  // 實際欄位組裝在 pet_config.js 的 createBasePetFields()，讓出生/長大路徑
  // （pet_breeding.js）跟購買/裝備路徑（本檔案）共用同一份，確保兩扇門
  // 進來的寵物資料格式永遠一致。保留這個方法名稱只是維持既有呼叫端不用改。
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

  // ─── 寵物裝備（從 avatar.js 搬過來）──────────────────
  _handlePetWear(itemId) {
    const unlocked = getState().avatar?.unlocked ?? [];
    if (!unlocked.includes(itemId)) {
      EventBus.emit(Events.System.TOAST, '🔒 尚未解鎖這隻寵物');
      return;
    }

    const s = getState();
    const activePets = [...(s.activePets ?? [])];
    const existingIdx = activePets.findIndex(p => p.id === itemId);

    if (existingIdx !== -1) {
      // 卸下
      activePets.splice(existingIdx, 1);
      setState(() => ({ activePets }));
      EventBus.emit(Events.System.TOAST, '✨ 已讓寵物回窩休息');
      EventBus.emit(Events.Avatar.UPDATED);
      return;
    }

    if (activePets.length >= 2) {
      // 滿位，觸發替換彈窗（由 AvatarPage 監聽 Events.Pet.REPLACE_PROMPT 顯示 Modal；
      // 原本是 Events.Avatar.PET_REPLACE_PROMPT，搬進 PetEngine 後改掛在 Pet 底下）
      EventBus.emit(Events.Pet.REPLACE_PROMPT, { newItemId: itemId });
      return;
    }

    this._addNewPet(itemId);
  },

  // ─── 新增寵物（共用邏輯，供直接領養與替換後領養使用，從 avatar.js 搬過來）──
  // 這扇門進來的寵物沒有父母、沒有經歷幼年期成長，直接視為「已成年、
  // 血統鎖定為平民血統」（createBasePetFields 不特別傳 lineage 時預設
  // 就是平民血統），性格照樣隨機抽一個。needsNaming: true 交給
  // PetWidget.jsx 掛載時檢查並跳出取名視窗——不用即時事件通知，因為
  // 裝備動作發生在更衣室，PetWidget 當下不一定有掛載，事件會憑空消失、
  // 永遠等不到人監聽；改用持久化欄位，不管玩家什麼時候切回大廳都保證
  // 會跳出來。
  _addNewPet(itemId) {
    // 跟現有寵物保持一定間距，避免兩隻寵物剛好被隨機分配到很接近的
    // 位置，看起來像疊在一起、動畫也像是黏在一起移動、卻始終不會分開
    const existingPets = getState().activePets ?? [];
    const newPet = createBasePetFields({
      id: itemId,
      isGrowing: false,
      level: 1,
      growthProgress: 100,
      geneLocked: true,
      needsNaming: true,
      rightPos: pickSpacedRightPos(existingPets),
    });

    let newIndex = -1;
    setState(s => {
      const activePets = [...(s.activePets ?? []), newPet];
      newIndex = activePets.length - 1;
      return { activePets };
    });
    EventBus.emit(Events.Avatar.UPDATED);
    // 立即通知：這扇門的呼叫方（AvatarPage，不管是直接裝備還是替換後
    // 領養）當下一定是掛載狀態，讓取名視窗當場跳出來，不用等玩家切回
    // 大廳才被 PetWidget.jsx 的保底檢查攔截到。needsNaming 欄位依然
    // 保留在寵物物件上，作為沒有人監聽這個事件時的安全網。
    EventBus.emit(Events.Pet.PET_ADDED_NEEDS_NAMING, { index: newIndex });
  },

  // ─── 確認替換：送走指定 index 的寵物，換上新寵物（從 avatar.js 搬過來）──
  confirmPetReplace(replaceIndex, newItemId) {
    const s = getState();
    const activePets = [...(s.activePets ?? [])];
    if (!activePets[replaceIndex]) return;

    const oldPet = activePets[replaceIndex];
    const traveledPets = [...(s.traveledPets ?? [])];
    if (!traveledPets.includes(oldPet.id)) traveledPets.push(oldPet.id);

    // ⚠️ 刻意不改動既有的 traveledPets（純字串陣列），避免弄壞任何可能
    // 已經假設它是純字串陣列的既有讀取端。改成疊加一份新的、獨立的
    // 詳細紀錄，保留血統/世代/性格資料，供未來「旅行紀錄／家族樹」等
    // 功能使用。
    const retiredPetHistory = [...(s.retiredPetHistory ?? []), {
      id: oldPet.id,
      name: oldPet.name,
      level: oldPet.level,
      lineage: oldPet.lineage,
      generation: oldPet.generation,
      personality: oldPet.personality,
      retiredAt: Date.now(),
    }];

    activePets.splice(replaceIndex, 1);
    setState(() => ({ activePets, traveledPets, retiredPetHistory }));

    this._addNewPet(newItemId);
  },
};