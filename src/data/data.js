/* js/data.js - V7.0 Unified Config & Default State (ES6 Module 版) */

// ==========================================
// 1. 玩家初始預設存檔 (Default State)
// ==========================================
export const DefaultData = {
    userName: '',        // WelcomeScreen 寫入此欄，App.jsx 讀取判斷是否顯示歡迎畫面
    name: 'Commander',  // 舊欄位保留相容
    gold: 0, freeGem: 2000, paidGem: 0, lv: 1, exp: 0,
    loginStreak: 0, totalLoginDays: 0, lastLoginDate: new Date().toDateString(),

    attrs: {
        STR: { name: '體能', v: 1, exp: 0, icon: '💪' },
        INT: { name: '思考', v: 1, exp: 0, icon: '🧠' },
        AGI: { name: '技術', v: 1, exp: 0, icon: '🛠️' },
        CHR: { name: '魅力', v: 1, exp: 0, icon: '✨' },
        VIT: { name: '創造', v: 1, exp: 0, icon: '🎨' },
        LUK: { name: '經營', v: 1, exp: 0, icon: '💼' }
    },
    pet: { name: '波吉', level: 1, food: 100, mood: 100, companionId: 'pet_01' },
    dailyBuff: { goldRate: 1.0, expRate: 1.0 },

    skills: [], archivedSkills: [], deletedSkills: [],
    tasks: [], achievements: [], milestones: [], history: [], bag: [],

    story: { energy: 30, tags: [], vars: {}, flags: {}, learning: {}, chain: null, currentNode: null },

    avatar: {
        unlocked: ['body_01', 'face_01', 'furn_mirror'],
        wearing: { body: 'body_01', face: 'face_01' }
    },

    shop: { user: [] },

    settings: {
        mode: 'adventurer',
        theme: 'default',
        calMode: false,
        calMax: 2000,
        strictMode: false,
        notificationEnabled: false,
        notifyDailyHour: 9,
        notifyDailyMinute: 0,
        notifyStreakHour: 21,
        notifyStreakMinute: 0,
        notifyDeadline: true,
        soundEnabled: true,
        musicEnabled: false,
        vibrationEnabled: true,
        volume: 0.7,
        musicVolume: 0.5,
        customBGM: null,
        fontSize: 'var(--font-title)'
    },
    unlocks: { basic: true, feature_cal: false, feature_strict: false },

    subscription: {
        active: false,
        mock: false,
        sku: null,
        expiresAt: null,
        startedAt: null,
        trialStart: null,
        trialUsed: false,
    },
    cal: { today: 0, logs: [] },
    taskCats: ['日常', '運動', '工作', '待辦', '願望'],
    checkin: { month: new Date().getMonth(), days: [], claimed7: 0 },
    positions: {},
    furniture: [],
};

// ==========================================
// 2. 遊戲靜態配置中心 (Game Configuration)
// ==========================================
export const GameConfig = {
    System: {
        SaveKey: 'Levelife_Save_V1',
        SaveInterval: 5000,
        Version: '1.0.0'
    },
    RandomEvents: [
        { text: "出門時微風徐徐，感覺今天會有好事發生！", buff: { goldRate: 1.05 }, icon: "🍃" },
        { text: "昨晚睡得很香，身體充滿了力量！", buff: { expRate: 1.1 }, icon: "💪" },
        { text: "在路邊撿到一枚閃亮亮的硬幣！", reward: { gold: 50 }, icon: "💰" }
    ],
    // SystemShop 已經依道具歸屬拆開遷移：
    //   通用道具 → src/shop/data/shopConfig.js（SHOP_CONFIG_ITEMS）
    //   寵物道具 → src/pet/data/pet_shop_items.js（PET_SHOP_ITEMS）
    // 合併後的清單從 src/shop/data/shopConfig.js 匯出（SystemShop），呼叫端用法不變。
    // AvatarShop 已經遷移至 src/avatar/data/avatar_config.js

    Assets: {
        basePath: 'img/',
        defExt: '.png',
        fallback: '🧚',
        avatars: {
            adventurer: { m: 'outfit_01', f: 'outfit_02' },
            harem: { m: 'outfit_05', f: 'outfit_06' },
            basic: { m: 'outfit_01', f: 'outfit_02' }
        }
    },
    Stats: {
        skillLimit: 10,
        newSkillReward: { freeGem: 50, exp: 500 }
    }
    // Tutorial 區塊（含舊品牌名「LevLife」的歡迎文案）已刪除：全專案沒有任何地方
    // 讀取這個欄位，WelcomeScreen.jsx 的實際歡迎文字是獨立寫死在該檔案裡的正確版本。
};