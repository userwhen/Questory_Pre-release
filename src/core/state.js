import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DefaultData, GameConfig } from '@/data/data.js';
import { EventBus } from './events.js';
import { Events } from './event_types.js';

const SAVE_KEY = GameConfig?.System?.SaveKey ?? 'questory_save_v1';
export const BASE_TASK_CATS = ['日常', '運動', '工作', '待辦', '願望'];
export const LOCKED_TASK_CATS = ['日常', '運動']; // 日常=系統保留fallback；運動=綁定卡路里欄位，皆不可改名/刪除
export const FALLBACK_TASK_CAT = '日常'; // 👈 補上這一行
const FREE_CUSTOM_CAT_LIMIT = 2;   // 免費版：可額外新增 2 個
const PRO_CUSTOM_CAT_LIMIT  = 10;  // PRO 版：可額外新增 10 個
const defaultState = () => JSON.parse(JSON.stringify(DefaultData));

// 精力上限：基礎 30，每 5 等+2，上限 100
export function calcMaxEnergy(lv = 1) {
  return Math.min(100, 30 + Math.floor((lv - 1) / 5) * 2);
}

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...defaultState(),

      // ─── 核心方法 ───────────────────────────────────────
      resetData() {
        set({
          ...defaultState(),
          installDate: Date.now(),
          lastLoginDate: new Date().toDateString(),
          lastEnergyTick: Date.now(),
        });
      },

      // migrateData()：補齊 store 缺少的欄位，確保向後相容
      // ⚠️ 全部改為 immutable 寫法：每一層有更動的巢狀物件/陣列都必須展開成新參考，
      //    不可以對 s 底下的物件直接賦值或 push（那是在 mutate 舊 state，同參考會讓
      //    依賴該物件做參考比對的 memo / selector 偵測不到變化）。
      migrateData() {
        set(s => {
          // userName 遷移：舊版只有 name 欄位
          const userName = s.userName || (s.name && s.name !== 'Commander' ? s.name : '') || '';

          // unlocks（含 calorie_tracker → feature_cal 改名遷移）
          const { calorie_tracker, ...restUnlocks } =
            s.unlocks ?? { basic: true, feature_cal: false, feature_strict: false };
          const unlocks = {
            basic: true,
            ...restUnlocks,
            feature_cal: calorie_tracker !== undefined ? calorie_tracker : (restUnlocks.feature_cal ?? false),
            feature_strict: restUnlocks.feature_strict ?? false,
          };

          // settings
          const settings = {
            ...(s.settings ?? { mode: 'adventurer' }),
            lobbyEditMode: false, // 每次啟動強制關閉
          };

          // avatar
          const legacyAvatar = s.avatar ?? {
            unlocked: ['body_01', 'face_01'],
            wearing: { body: 'body_01', face: 'face_01' },
          };
          const wearing = {
            ...(legacyAvatar.wearing ?? {}),
            body: legacyAvatar.wearing?.body ?? 'body_01',
            face: legacyAvatar.wearing?.face ?? 'face_01',
          };
          const unlockedSet = new Set(legacyAvatar.unlocked ?? []);
          unlockedSet.add('body_01');
          unlockedSet.add('face_01');
          const avatar = {
            ...legacyAvatar,
            wearing,
            unlocked: Array.from(unlockedSet),
          };

          // activePets：每一隻寵物物件都要展開，不能直接改到原陣列裡的物件
          const activePets = (s.activePets ?? []).map(p => ({
            ...p,
            status: p.status ?? 'normal',
            poops: p.poops ?? [],
            isSick: p.isSick ?? false,
          }));

          // subscription
          const subscription = s.subscription ?? { active: false, mock: false, sku: null, expiresAt: null };

          // story（含 energy 上限 clamp）
          const legacyStory = s.story ?? {
            energy: 30, tags: [], vars: {}, flags: {}, chain: null, currentNode: null,
          };
          const maxE = calcMaxEnergy(s.lv ?? 1);
          const story = {
            ...legacyStory,
            vars: legacyStory.vars ?? {},
            flags: legacyStory.flags ?? {},
            narrative: legacyStory.narrative ?? null,
            energy: Math.min(legacyStory.energy ?? 0, maxE),
          };

          // cal
          const cal = {
            ...(s.cal ?? { today: 0, logs: [] }),
            logs: s.cal?.logs ?? [],
          };

          // positions
          const positions = {
            ...(s.positions ?? {}),
            companion: s.positions?.companion ?? { x: 20, y: 30 },
          };

          return {
            ...s,
            userName,
            unlocks,
            history: s.history ?? [],
            tasks: s.tasks ?? [],
            milestones: s.milestones ?? [],
            achievements: s.achievements ?? [],
            settings,
            avatar,
            activePets,
            babyPet: s.babyPet ?? null,
            babyPetName: s.babyPetName ?? null,
            babyPetData: s.babyPetData ?? null,
            petRelationship: s.petRelationship ?? 50,
            petArchive: s.petArchive ?? [],
            traveledPets: s.traveledPets ?? [],
            subscription,
            story,
            cal,
            lastLoginDate: s.lastLoginDate ?? new Date().toDateString(),
            totalLoginDays: s.totalLoginDays ?? 0,
            loginStreak: s.loginStreak ?? 0,
            challenge: s.challenge ?? null,
            positions,
            previewWearing: s.previewWearing ?? null,
            gachaPity: s.gachaPity ?? 0,
            // 新增欄位：Task 頁面跨 App 重啟記住玩家上次停留的畫面（list / calendar）
            taskViewMode: s.taskViewMode ?? 'list',
            // 新增欄位：離線精力補算用的時間戳（見檔案底部 applyOfflineEnergyRecovery）
            lastEnergyTick: s.lastEnergyTick ?? Date.now(),
            taskCats: s.taskCats ?? [...BASE_TASK_CATS],
            customTaskCatNames: s.customTaskCatNames ?? [],
            rewardCoupons: s.rewardCoupons ?? 0,
          };
        });
      },
      checkDailyReset() {
        const s = get();
        if (s._dailyResetDone) return;

        const today = new Date().toDateString();
        if (s.lastLoginDate !== today) {
          let streak = 1;
          if (s.lastLoginDate) {
            const prev = new Date(s.lastLoginDate).setHours(0, 0, 0, 0);
            const now = new Date().setHours(0, 0, 0, 0);
            const diff = Math.round((now - prev) / 86400000);
            streak = diff === 1 ? (s.loginStreak ?? 0) + 1 : 1;
          }

          set({
            loginStreak: streak,
            lastLoginDate: today,
            totalLoginDays: (s.totalLoginDays ?? 0) + 1,
          });

          EventBus.emit(Events.System.DAILY_RESET);
        }

        set({ _dailyResetDone: true });
      },
      setTaskViewMode(mode) {
        set({ taskViewMode: mode === 'calendar' ? 'calendar' : 'list' });
      },
      // ─── 分類（taskCats）管理 ────────────────────────────
      addTaskCat(name) {
        const s = get();
        const trimmed = (name || '').trim();
        if (!trimmed) return { success: false, msg: '名稱不可為空' };

        const list = s.taskCats ?? [...BASE_TASK_CATS];
        if (list.includes(trimmed)) return { success: false, msg: '分類已存在' };

        const customNames = s.customTaskCatNames ?? [];
        const limit = s.subscription?.active ? PRO_CUSTOM_CAT_LIMIT : FREE_CUSTOM_CAT_LIMIT;
        if (customNames.length >= limit) {
          return {
            success: false,
            msg: s.subscription?.active
              ? `已達上限（${limit} 個）`
              : `免費版最多可新增 ${limit} 個分類，升級 PRO 可到 ${PRO_CUSTOM_CAT_LIMIT} 個`,
          };
        }

        set({
          taskCats: [...list, trimmed],
          customTaskCatNames: [...customNames, trimmed],
        });
        return { success: true };
      },

      renameTaskCat(oldName, newName) {
        if (LOCKED_TASK_CATS.includes(oldName)) return { success: false, msg: `「${oldName}」為系統保留分類，不可改名` };

        const s = get();
        const trimmed = (newName || '').trim();
        if (!trimmed) return { success: false, msg: '名稱不可為空' };

        const list = s.taskCats ?? [...BASE_TASK_CATS];
        if (!list.includes(oldName)) return { success: false, msg: '找不到原分類' };
        if (trimmed !== oldName && list.includes(trimmed)) return { success: false, msg: '分類已存在' };

        set(state => ({
          taskCats: (state.taskCats ?? [...BASE_TASK_CATS]).map(c => c === oldName ? trimmed : c),
          customTaskCatNames: (state.customTaskCatNames ?? []).map(c => c === oldName ? trimmed : c),
          // 級聯更新：改名要連動任務跟成就，避免資料斷鏈
          tasks: (state.tasks ?? []).map(t => t.cat === oldName ? { ...t, cat: trimmed } : t),
          achievements: (state.achievements ?? []).map(a =>
            a.targetType === 'tag' && a.targetValue === oldName ? { ...a, targetValue: trimmed } : a),
          milestones: (state.milestones ?? []).map(m =>
            m.targetType === 'tag' && m.targetValue === oldName ? { ...m, targetValue: trimmed } : m),
        }));
        return { success: true };
      },

      deleteTaskCat(name, alsoDeleteAchievements = false) {
        if (LOCKED_TASK_CATS.includes(name)) return { success: false, msg: `「${name}」為系統保留分類，不可刪除` };

        const s = get();
        const list = s.taskCats ?? [...BASE_TASK_CATS];
        if (!list.includes(name)) return { success: false, msg: '找不到分類' };

        set(state => ({
          taskCats: (state.taskCats ?? [...BASE_TASK_CATS]).filter(c => c !== name),
          customTaskCatNames: (state.customTaskCatNames ?? []).filter(c => c !== name),
          // 刪除分類時，原本用該分類的任務自動歸入「日常」
          tasks: (state.tasks ?? []).map(t => t.cat === name ? { ...t, cat: FALLBACK_TASK_CAT } : t),
          ...(alsoDeleteAchievements ? {
            achievements: (state.achievements ?? []).filter(a => !(a.targetType === 'tag' && a.targetValue === name)),
            milestones: (state.milestones ?? []).filter(m => !(m.targetType === 'tag' && m.targetValue === name)),
          } : {}),
        }));
        return { success: true };
      },
      addRewardCoupon(amount = 1) {
        if (amount <= 0) return;
        set(s => ({ rewardCoupons: (s.rewardCoupons || 0) + amount }));
      },

      spendRewardCoupon(amount = 1) {
        const s = get();
        if ((s.rewardCoupons || 0) < amount) return false;
        set(s => ({ rewardCoupons: s.rewardCoupons - amount }));
        return true;
      },

      // ─── 資源方法（未變動）───────────────────────────────
      addGold(amount) {
        if (amount <= 0) return;
        set(s => ({ gold: (s.gold ?? 0) + amount }));
        EventBus.emit(Events.Stats.UPDATED);
      },

      spendGold(amount) {
        const s = get();
        if ((s.gold ?? 0) < amount) return false;
        set(s => ({ gold: s.gold - amount }));
        EventBus.emit(Events.Stats.UPDATED);
        return true;
      },

      revokeGold(amount, allowDebt = false) {
        if (amount <= 0) return;
        set(s => ({ gold: allowDebt ? s.gold - amount : Math.max(0, (s.gold ?? 0) - amount) }));
        EventBus.emit(Events.Stats.UPDATED);
      },

      addGem(amount, isPaid = false) {
        if (amount <= 0) return;
        set(s => isPaid
          ? ({ paidGem: (s.paidGem ?? 0) + amount })
          : ({ freeGem: (s.freeGem ?? 0) + amount })
        );
        EventBus.emit(Events.Stats.UPDATED);
      },

      spendGem(amount) {
        const s = get();
        const total = (s.freeGem ?? 0) + (s.paidGem ?? 0);
        if (total < amount) return false;

        set(s => {
          if ((s.freeGem ?? 0) >= amount) return { freeGem: s.freeGem - amount };
          const remain = amount - (s.freeGem ?? 0);
          return { freeGem: 0, paidGem: (s.paidGem ?? 0) - remain };
        });

        EventBus.emit(Events.Stats.UPDATED);
        return true;
      },
    }),
    {
      name: SAVE_KEY,
      partialize: (s) => {
        const { _dailyResetDone, ...rest } = s;
        return rest;
      },
    }
  )
);

export const getState = () => useGameStore.getState();
export const setState = (fn) => useGameStore.setState(fn);

if (import.meta.env.DEV) {
  window.__debug = {
    store: useGameStore,
    getState,
    setState,
    eventBus: EventBus,
    addGold: (amt) => useGameStore.getState().addGold(amt),
    addGem: (amt, paid) => useGameStore.getState().addGem(amt, paid),
    dumpState: () => console.log(JSON.stringify(useGameStore.getState(), null, 2)),
  };
}

// ── 精力回復：前景 tick + 背景/離線補算 ──────────────────
const ENERGY_REGEN_MS = 10 * 60 * 1000; // 每 10 分鐘 +1

// 前景：每 10 分鐘 tick 一次，同時更新 lastEnergyTick，
// 避免跟下面的離線補算重複計算同一段時間
function startEnergyLoop() {
  setInterval(() => {
    const s = useGameStore.getState();
    const max = calcMaxEnergy(s.lv ?? 1);
    const cur = s.story?.energy ?? 0;

    if (cur >= max) {
      useGameStore.setState({ lastEnergyTick: Date.now() });
      return;
    }

    useGameStore.setState(state => ({
      story: {
        ...state.story,
        energy: Math.min(calcMaxEnergy(state.lv ?? 1), (state.story?.energy ?? 0) + 1),
      },
      lastEnergyTick: Date.now(),
    }));
    EventBus.emit(Events.Story.UPDATE_TOPBAR);
  }, ENERGY_REGEN_MS);
}

// 離線 / 背景補算：依「實際經過時間」補精力，取代單純依賴 setInterval。
// （手機背景執行時 setInterval 會被系統節流甚至暫停，需要用時間戳回推才準確）
//
// 呼叫時機：
//   1. main.jsx 在 migrateData() 之後呼叫一次（處理「App 關閉期間」的離線時長）
//   2. 下方 Capacitor App resume 監聽會在「App 從背景回到前景」時自動呼叫
export function applyOfflineEnergyRecovery() {
  const s = useGameStore.getState();
  const now = Date.now();
  const last = s.lastEnergyTick ?? now;
  const diffMs = now - last;

  if (diffMs < ENERGY_REGEN_MS) return; // 還不到一個回復週期，不用算

  const recovered = Math.floor(diffMs / ENERGY_REGEN_MS);
  const max = calcMaxEnergy(s.lv ?? 1);
  const newEnergy = Math.min(max, (s.story?.energy ?? 0) + recovered);

  useGameStore.setState(state => ({
    story: { ...state.story, energy: newEnergy },
    // 保留餘數時間，讓下一次回復週期的計算基準仍然準確，不會整個歸零重算
    lastEnergyTick: now - (diffMs % ENERGY_REGEN_MS),
  }));

  EventBus.emit(Events.Story.UPDATE_TOPBAR);
}

// ── module 層級 side effect 統一註冊 ──────────────────────
// 用 window 上的旗標防止 Vite HMR 重新載入這個檔案時重複註冊
// （setInterval / EventBus.on / Capacitor listener 疊加會導致「精力跳兩倍快」
// 這類難查的假象，只在開發模式會發生，正式版一次性載入不受影響）
if (typeof window !== 'undefined' && !window.__questoryStateSideEffectsInited) {
  window.__questoryStateSideEffectsInited = true;

  // 監聽換語言事件並更新狀態
  EventBus.on(Events.Settings.SET_LANG, (newLang) => {
    useGameStore.setState(state => ({
      settings: { ...state.settings, targetLang: newLang },
    }));
  });

  startEnergyLoop();

  // 監聽 App 從背景回到前景
  // 需要 @capacitor/app；若專案尚未安裝這個套件，動態 import 會 reject，
  // 但不影響其他功能（純網頁開發環境也會直接跳過，不會噴錯）。
  import('@capacitor/app')
    .then(({ App: CapacitorApp }) => {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) applyOfflineEnergyRecovery();
      });
    })
    .catch(() => {
      // 尚未安裝 @capacitor/app，靜默略過
    });
}