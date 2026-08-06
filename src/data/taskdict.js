/* src/data/taskdict.js */
export const TaskDict = {
    Task: {
        // 原本整個 QuestClass 物件替換成：
QuestClass: {
    gather: {
        modalTitle: '📦 收集任務',
        inputLabel: '📦 收集任務名稱',
        descLabel: '📝 收集內容備註',
        descPlaceholder: '請在此輸入要收集/購買的物品說明或備註...',
        subtasksLabel: '收集清單',
        descTemplate: ({ title, desc, subs }) => {
            const list = subs?.length ? subs.map((s, i) => `${i+1}.${s.text}`).join('、') : null;
            return `公會佈告欄貼出一則收集委託——【${title}】。${desc ? desc + '。' : ''}${list ? `冒險者需備齊：${list}，` : ''}方能順利交付委託。`;
        },
    },
    hunt: {
        modalTitle: '🏹 狩獵任務',
        inputLabel: '🏹 狩獵目標名稱',
        descLabel: '📝 狩獵備註',
        descPlaceholder: '請在此輸入狩獵的具體要求或備註...',
        subtasksLabel: '狩獵階段',
        descTemplate: ({ title, desc, target }) => {
            return `狩獵令已頒布：【${title}】${target ? `，需達成 ${target} 次方可結案` : ''}。${desc ? desc + '。' : ''}持之以恆的獵人，終將成為傳說。`;
        },
    },
    event: {
        modalTitle: '📍 限時副本',
        inputLabel: '🚩 副本活動名稱',
        descLabel: '🕵️ 副本情報紀實',
        descPlaceholder: '請在此輸入與會人員、應攜帶道具或時空背景備註...',
        subtasksLabel: '副本前置步驟',
        descTemplate: ({ title, desc, location }) => {
            return `限時副本【${title}】即將開啟！${location ? `集合地點：${location}。` : ''}${desc ? desc + '。' : ''}務必在時限內抵達，逾期副本將自動關閉。`;
        },
    },
    boss: {
        modalTitle: '👑 史詩戰役',
        inputLabel: '⚔️ 戰役目標名稱',
        descLabel: '📜 戰術規劃日誌',
        descPlaceholder: '請在此輸入這場戰役的宏觀戰略或背景情報備註...',
        subtasksLabel: '戰役階段拆解 (HP 血條)',
        descTemplate: ({ title, desc, subs }) => {
            const list = subs?.length ? subs.map((s, i) => `${i+1}.${s.text}`).join('、') : null;
            return `史詩戰役【${title}】已然揭幕！${desc ? desc + '。' : ''}${list ? `此役需歷經：${list}，方能擊破。` : ''}前方路途或許艱辛，但豐厚的戰利品正在等候著你...`;
        },
    },
    guild: {
        modalTitle: '📜 公會委託',
        inputLabel: '📜 委託任務名稱',
        descLabel: '📝 委託內容備註',
        descPlaceholder: '請在此輸入委託的具體要求、執行方向或備註...',
        subtasksLabel: '子任務步驟',
        descTemplate: ({ title, desc }) => {
            return `公會佈告欄貼出一則委託：【${title}】。${desc ? desc + '。' : ''}內容不拘，靜候有緣的冒險者前來承接。`;
        },
    },
},
        DefaultForm: {
            catLabel: '分類',
            catHint: '(長按標籤可刪除)',
            typeNormal: '📝 一般',
            typeCount: '🔢 計次',
            ruleAny: '🎯 擇一',
            ruleAll: '📌 全部',
            addSubtask: '+ 新增步驟',
            skillsLabel: '📚 綁定修煉技能',
            noSkills: '無可用修煉技能',
            caloriesLabel: '🔥 消耗熱量',
            matrixLabel: '📊 價值權重評估',
            importance: '重要性',
            urgency: '緊急性',
            deadlineLabel: '📅 到期時間',
            recurrenceLabel: '🔄 循環頻率',
            every: '每',
            unitDay: '天',
            unitWeek: '週',
            unitMonth: '月',
            unitYear: '年',
            reminderLabel: '⏰ 提醒時間',
            advOpen: '▼ 展開進階屬性 (熱量、技能、價值評估)',
            advClose: '▲ 收合進階戰術設定',
            btnDelete: '刪除',
            btnCopy: '複製',
            btnSave: '保存',
            btnClear: '🗑️ 清空內容',
            btnCreate: '新增任務',
        },
    },
};
export const BOUNTY_TYPES = [
    { key: 'normal', label: '⚔️ 一般行動' },
    { key: 'count', label: '🔁 重複執行' },
    { key: 'exercise', label: '💪 運動鍛鍊' },
    { key: 'boss', label: '👑 重大專案' },
];

export const STAMP_OPTIONS = [
    { key: 'deadline', label: '⏳ 期限印章', icon: '⏳' },
    { key: 'subs', label: '🗡️ 子任務印章', icon: '🗡️' },
    { key: 'reward', label: '⚖️ 難度印章', icon: '⚖️' },
];

// Google 行事曆風格提醒預設選項；custom 由使用者輸入任意數字+單位
export const REMINDER_MODES = [
    { key: 'none',       label: '不提醒' },
    { key: 'dayOf',      label: '當天提醒' },
    { key: 'atDeadline', label: '截止時提醒' },
];