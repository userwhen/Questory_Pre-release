/* src/data/taskdict.js */
export const TaskDict = {
  Task: {
    // 類別差異已淡化：統一使用公會委託敘事與欄位文案
    QuestClass: {
      guild: {
        modalTitle: '📜 公會委託',
        inputLabel: '📜 委託任務名稱',
        descLabel: '📝 委託內容備註',
        descPlaceholder: '請在此輸入委託的具體要求、執行方向或備註...',
        subtasksLabel: '子任務步驟',
        descTemplate: ({ title, desc, subs, target, location }) => {
          const list = subs?.length ? subs.map((s, i) => `${i + 1}.${s.text}`).join('、') : null;
          const parts = [`公會佈告欄貼出一則委託：【${title}】。`];
          if (desc) parts.push(desc + '。');
          if (location) parts.push(`集合地點：${location}。`);
          if (target && target > 1) parts.push(`需達成 ${target} 次方可結案。`);
          if (list) parts.push(`此委託需歷經：${list}。`);
          parts.push('內容不拘，靜候有緣的冒險者前來承接。');
          return parts.join('');
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
      addSkill: '+ 新增技能',
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
      advOpen: '▼ 展開進階設定',
      advClose: '▲ 關閉進階設定',
      btnDelete: '刪除',
      btnCopy: '複製',
      btnSave: '保存',
      btnClear: '🗑️ 清空內容',
      btnCreate: '新增任務',
      sectionActive: '未完成',
      sectionDone: '已完成',
    },
  },
};

// 保留常數供其他模組引用；新增任務已不再走類別選擇器
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
  { key: 'none', label: '不提醒' },
  { key: 'dayOf', label: '當天提醒' },
  { key: 'atDeadline', label: '截止時提醒' },
];
