/* src/engines/pet.js */
import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { petDecayMethods } from './pet_decay.js';
import { petActionsMethods } from './pet_actions.js';
import { petBreedingMethods } from './pet_breeding.js';
import { petRosterMethods } from './pet_roster.js';

// PetEngine 由四個子模組的方法組合而成：
//   pet_decay.js    — 被動/系統觸發的持續狀態變化（updateDecay / 生病康復每日檢查）
//   pet_actions.js  — 玩家/任務直接觸發的動作（互動/撿便便/任務完成/探險同意或婉拒）
//   pet_breeding.js — 繁殖/血統整條管線（出生選擇/幼崽長大/懷孕/血統圖鑑）
//   pet_roster.js   — 寵物名冊管理（新增/替換/取名，含購買/裝備門的邏輯，
//                      這部分是這次從 avatar.js 搬過來的）
// 各子模組互相呼叫對方的方法（例如 interact() 呼叫 _finalizeGrowth()）都維持
// this.xxx() 寫法：因為最終都合併在同一個 PetEngine 物件上、呼叫端永遠是
// PetEngine.foo()，this 一定指向整個合併後的物件，拆分完全不影響呼叫關係。
export const PetEngine = {
  ...petDecayMethods,
  ...petActionsMethods,
  ...petBreedingMethods,
  ...petRosterMethods,

  // 寵物模組總開關：沒解鎖（unlocks.module_pet，或訂閱期間）
  // 或解鎖後被玩家在設定頁暫停（settings.module_pet_active === false），都算停用。
  // 停用期間：任務完成不再發寵物獎勵、互動/撿便便/長大/繁殖/探險/取名/裝備一律擋下、
  // decay 也不再往前推進——寵物狀態原地凍結，不是玩家看不到但背地裡照樣餓肚子/生病。
  // 已存在的 activePets 完全不動，重新啟用後從凍結的狀態接續。
  isEnabled() {
    const s = getState();
    const unlocked = !!s.unlocks?.module_pet || !!s.subscription?.active;
    const active = s.settings?.module_pet_active !== false;
    return unlocked && active;
  },

  // ─── 清空目前寵物：手動關閉／訂閱到期沒买断，兩種情境共用同一份清空範圍 ──
  // 保留 petArchive（血統圖鑑進度）/ traveledPets / retiredPetHistory（家族歷史），
  // 金幣鑽石也不動——只清「當前養著的這幾隻」，讓玩家有東山再起的念想，
  // 不是把整個寵物系統的養成紀錄都歸零。
  _wipeCurrentPets() {
    setState(() => ({
      activePets: [],
      babyPet: null,
      babyPetName: null,
      babyPetData: null,
      petRelationship: 50,
    }));
    EventBus.emit(Events.Pet.UPDATED);
  },

  // ─── 手動關閉（Settings 頁 Toggle，UI 端已經跳過 ConfirmDialog 確認過一次）──
  disableModule() {
    this._wipeCurrentPets();
    setState(s => ({
      settings: { ...(s.settings || {}), module_pet_active: false },
    }));
    EventBus.emit(Events.Settings.UPDATED);
    EventBus.emit(Events.System.TOAST, '🐾 寵物系統已關閉，當前寵物已清空');
  },

  // ─── 訂閱到期/取消，且沒有买断 module_pet 時呼叫：只清當前寵物，
  //     不動 module_pet_active——鎖不鎖得住是 isEnabled() 即時算出來的
  //     （unlocks.module_pet || subscription.active），訂閱恢復或之後买断，
  //     畫面會自動解鎖，不需要額外旗標記錄「因為訂閱到期而關閉」這件事。
  wipeCurrent() {
    this._wipeCurrentPets();
  },

  // 玩家主動觸發的操作（互動/撿便便/長大/繁殖/探險/取名/裝備）用這個：
  // 停用時直接擋下並提示。任務獎勵/decay/每日重置這種背景系統改用 isEnabled() 靜默略過即可，
  // 不用每次任務完成都跳一次 toast 打擾玩家。
  _guardEnabled() {
    if (this.isEnabled()) return true;
    EventBus.emit(Events.System.TOAST, '🔒 寵物系統尚未啟用');
    return false;
  },

  init: makeIdempotentInit(function () {
    setState(s => ({
      activePets:      s.activePets      ?? [],
      babyPet:         s.babyPet         ?? null,
      babyPetName:     s.babyPetName     ?? null,
      babyPetData:     s.babyPetData     ?? null,
      petRelationship: s.petRelationship ?? 50,
      petArchive:      s.petArchive      ?? [],
    }));

    if (this.isEnabled()) this.updateDecay();

    const unsubTask = EventBus.on(Events.Task.COMPLETED, ({ task }) => {
      if (!this.isEnabled()) return;
      this.onTaskCompleted(task);
    });

    const unsubInteract = EventBus.on(Events.Pet.REQUEST_INTERACT, ({ target, action, amount }) => {
      if (!this._guardEnabled()) return;
      this.interact(target, action, amount);
    });
    const unsubPickup = EventBus.on(Events.Pet.REQUEST_PICKUP_POOP, ({ index, poopId }) => {
      if (!this._guardEnabled()) return;
      this.pickUpPoop(index, poopId);
    });
    const unsubGrowUp = EventBus.on(Events.Pet.REQUEST_GROW_UP_BABY, ({ name }) => {
      if (!this._guardEnabled()) return;
      this.growUpBaby(name);
    });
    const unsubBirth = EventBus.on(Events.Pet.REQUEST_RESOLVE_BIRTH, ({ choice, babyId, babyName }) => {
      if (!this._guardEnabled()) return;
      this.resolveBirth(choice, babyId, babyName);
    });
    const unsubStartExplore = EventBus.on(Events.Pet.REQUEST_START_EXPLORE, ({ index }) => {
      if (!this._guardEnabled()) return;
      this.startExplore(index);
    });
    const unsubDismissExplore = EventBus.on(Events.Pet.REQUEST_DISMISS_EXPLORE, ({ index }) => {
      if (!this._guardEnabled()) return;
      this.dismissExplore(index);
    });
    const unsubDailyReset = EventBus.on(Events.System.DAILY_RESET, () => {
      if (!this.isEnabled()) return;
      this.processSickRecoveryOnDailyReset();
    });
    const unsubNamePet = EventBus.on(Events.Pet.REQUEST_NAME_PET, ({ index, name }) => {
      if (!this._guardEnabled()) return;
      this.namePet(index, name);
    });
    // ── 從 avatar.js 搬過來的兩個訂閱：購買/裝備門進來的寵物邏輯 ──
    const unsubWearItem = EventBus.on(Events.Pet.REQUEST_WEAR_ITEM, ({ itemId }) => {
      if (!this._guardEnabled()) return;
      this._handlePetWear(itemId);
    });
    const unsubConfirmReplace = EventBus.on(Events.Pet.REQUEST_CONFIRM_REPLACE, ({ index, newItemId }) => {
      if (!this._guardEnabled()) return;
      this.confirmPetReplace(index, newItemId);
    });
    // ── 關閉/清空寵物系統：不經過 _guardEnabled()，這兩個處理的正是
    //    「關閉/清空」這件事本身，不是一般的玩家互動 ──
    const unsubDisableModule = EventBus.on(Events.Pet.REQUEST_DISABLE_MODULE, () => {
      this.disableModule();
    });
    const unsubWipeCurrent = EventBus.on(Events.Pet.REQUEST_WIPE_CURRENT, () => {
      this.wipeCurrent();
    });

    const decayInterval = setInterval(() => {
      if (this.isEnabled()) this.updateDecay();
    }, 60_000);

    return [unsubTask, unsubInteract, unsubPickup, unsubGrowUp, unsubBirth,
      unsubStartExplore, unsubDismissExplore, unsubDailyReset, unsubNamePet,
      unsubWearItem, unsubConfirmReplace, unsubDisableModule, unsubWipeCurrent,
      () => clearInterval(decayInterval)];
  }),
};