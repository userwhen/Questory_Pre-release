/* js/data.js - V7.0 Unified Config & Default State (ES6 Module 版) */

// ==========================================
// 1. 玩家初始預設存檔 (Default State)
// ==========================================
export const DefaultData = {
    userName: '',        // WelcomeScreen 寫入此欄，App.jsx 讀取判斷是否顯示歡迎畫面
    name: 'Commander',  // 舊欄位保留相容
    gold: 0, freeGem: 0, paidGem: 0, lv: 1, exp: 0,
    loginStreak: 0, totalLoginDays: 0, lastLoginDate: new Date().toDateString(),
    
    attrs: { 
        STR: {name:'體能', v:1, exp:0, icon:'💪'}, 
        INT: {name:'思考', v:1, exp:0, icon:'🧠'}, 
        AGI: {name:'技術', v:1, exp:0, icon:'🛠️'}, 
        CHR: {name:'魅力', v:1, exp:0, icon:'✨'}, 
        VIT: {name:'創造', v:1, exp:0, icon:'🎨'}, 
        LUK: {name:'經營', v:1, exp:0, icon:'💼'} 
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
        fontSize: '16px'
    },
    unlocks: { basic: true, feature_cal: false, feature_strict: false },

    subscription: {
        active:     false,
        mock:       false,
        sku:        null,
        expiresAt:  null,
        startedAt:  null,
        trialStart: null,
        trialUsed:  false,
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
        SaveKey:      'Levelife_Save_V1',
        SaveInterval: 5000,
        Version:      '1.0.0'
    },
    RandomEvents: [
        { text: "出門時微風徐徐，感覺今天會有好事發生！", buff: { goldRate: 1.05 }, icon: "🍃" },
        { text: "昨晚睡得很香，身體充滿了力量！", buff: { expRate: 1.1 }, icon: "💪" },
        { text: "在路邊撿到一枚閃亮亮的硬幣！", reward: { gold: 50 }, icon: "💰" }
    ],
    SystemShop: [
        { id: 'sys_food', name: '飽餐一頓', price: 250, currency: 'gold', maxQty: 99, category: '熱量', val: 250, icon: '🍱', desc: '回復 250kcal 熱量', type: 'daily' },
        { id: 'sys_relax', name: '休閒時光', price: 250, currency: 'gold', maxQty: 99, category: '時間', val: 15, icon: '🎮', desc: '15分鐘的休閒時間', type: 'daily' },
        { id: 'sys_money', name: '小錢袋', price: 250, currency: 'gold', maxQty: 99, category: '金錢', val: 250, icon: '💰', desc: '獲得 250 金幣', type: 'daily' },
        { id: 'sys_ticket', name: '放鬆券', price: 250, currency: 'gold', maxQty: 99, category: '其他', val: 0, icon: '🎫', desc: '做一件讓自己放鬆的事情', type: 'daily' },
        { id: 'sys_rename', name: '更名券', price: 250, currency: 'gem', maxQty: 1, category: '其他', val: 0, icon: '🏷️', desc: '修改一次冒險者暱稱', type: 'daily' },
        { id: 'sys_stamina_s', name: '精力藥水小', price: 10, currency: 'gem', maxQty: 99, category: '其他', val: 30, icon: '🧪', desc: '回復 30 點精力', type: 'daily' },
        { id: 'sys_stamina_m', name: '精力藥水中', price: 20, currency: 'gem', maxQty: 99, category: '其他', val: 60, icon: '⚗️', desc: '回復 60 點精力', type: 'daily' },
        { id: 'sys_stamina_l', name: '精力藥水大', price: 30, currency: 'gem', maxQty: 99, category: '其他', val: 100, icon: '💉', desc: '精力完全恢復', type: 'daily' },
        { id: 'sys_gacha_ticket', name: '幸運抽獎券', price: 50, currency: 'gem', maxQty: 99, category: '其他', val: 0, icon: '🎟️', desc: '在扭蛋機試試手氣', type: 'daily' },
        { id: 'sys_makeup_ticket', name: '補簽券', price: 50, currency: 'gem', maxQty: 2, category: '其他', val: 0, icon: '🎫', desc: '用來補簽漏掉的日曆', type: 'daily' },
        { id: 'sys_pet_food', name: '頂級寵物飼料', price: 50, currency: 'gold', maxQty: 99, category: '寵物', val: 20, icon: '🍖', desc: '回復寵物 20 飽食度', type: 'daily' },
        { id: 'sys_pet_toy', name: '毛線球玩具', price: 50, currency: 'gold', maxQty: 99, category: '寵物', val: 20, icon: '🧶', desc: '回復寵物 20 心情', type: 'daily' }
    ],
    
    // AvatarShop 已經遷移至 src/data/avatarConfig.js 
    
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
    },
    Tutorial: {
        guideNpc: '🧚',
        step0_intro: { title: '✨ 歡迎來到 LevLife', desc: '我是你的引導小精靈。\n首先，請告訴我你的名字？', placeholder: '輸入暱稱...', btn: '確認' },
    }
};