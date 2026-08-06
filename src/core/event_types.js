export const Events = {
  System: {
    INIT: 'sys:init',
    NAVIGATE: 'sys:navigate',
    LEAVE: 'sys:leave',
    TOAST: 'sys:toast',
    MODAL_OPEN: 'sys:modal_open',
    MODAL_CLOSE: 'sys:modal_close',
    SAVE: 'sys:save',
    DAILY_RESET: 'sys:daily_reset',
  },
  Task: {
    CREATED: 'task:created',
    UPDATED: 'task:updated',
    DELETED: 'task:deleted',
    COMPLETED: 'task:completed',
    UNCOMPLETED: 'task:uncompleted',
    FAILED: 'task:failed',

    // ── UI → TaskEngine 請求（模式 A/C，元件已解耦不再直接 import Engine）──
    REQUEST_RESOLVE: 'task:request_resolve',
    REQUEST_INCREMENT: 'task:request_increment',
    REQUEST_TOGGLE_SUB: 'task:request_toggle_sub',
    REQUEST_ADD: 'task:request_add',
    REQUEST_UPDATE: 'task:request_update',
    REQUEST_DELETE: 'task:request_delete',
    REQUEST_BATCH_DELETE: 'task:request_batch_delete',
    REQUEST_HISTORY_SUMMARY: 'task:request_history_summary',
    HISTORY_SUMMARY_READY: 'task:history_summary_ready',
  },
  Shop: {
    UPDATED: 'shop:updated',
    BAG_UPDATED: 'shop:bag_updated',

    // ── 模式 B：需要立即知道成功與否、扣款結果 ──
    REQUEST_BUY_ITEM: 'shop:request_buy_item',   // payload: { id, qty, requestId }
    BUY_ITEM_RESULT: 'shop:buy_item_result',     // payload: { success, msg, requestId }
    REQUEST_USE_ITEM: 'shop:request_use_item',   // payload: { id, qty, requestId }
    USE_ITEM_RESULT: 'shop:use_item_result',     // payload: { success, msg, requestId }
    // ── 模式 C：不需要等回應，UI 靠上面的 UPDATED/BAG_UPDATED 重繪 ──
    REQUEST_DISCARD_ITEM: 'shop:request_discard_item', // payload: { id, qty }
    REQUEST_UPLOAD_ITEM: 'shop:request_upload_item',   // payload: 商品表單資料
    REQUEST_DELETE_ITEM: 'shop:request_delete_item',   // payload: { id }
    REQUEST_GRANT_ITEM: 'shop:request_grant_item',     // payload: { id, qty } — 成就獎勵直接發放道具，不扣款
  },
  Stats: {
    UPDATED: 'stats:updated',
    LEVEL_UP: 'stats:level_up',
    SKILL_MAXED: 'stats:skill_maxed',
    ATTR_LEVEL_UP: 'stats:attr_level_up', // payload: { key, v } — 屬性升級時觸發，供官方屬性成就更新進度
    // 加在 Stats: { ... } 內，UPDATED/LEVEL_UP/SKILL_MAXED 後面
    REQUEST_CALORIE_TRUTH: 'stats:request_calorie_truth',
    CALORIE_TRUTH_READY: 'stats:calorie_truth_ready',
    REQUEST_SKILL_ICON_MAP: 'stats:request_skill_icon_map',
    SKILL_ICON_MAP_READY: 'stats:skill_icon_map_ready',
    REQUEST_POP_BALL: 'stats:request_pop_ball',   // payload: { amount, requestId }
    POP_BALL_RESULT: 'stats:pop_ball_result',     // payload: { success, requestId }
    // ── 各處請求 StatsEngine 加/扣經驗、熟練度 ──
    ADD_PLAYER_EXP: 'stats:add_player_exp',
    REDUCE_PLAYER_EXP: 'stats:reduce_player_exp',
    ADD_SKILL_PROFICIENCY: 'stats:add_skill_proficiency',
    REDUCE_SKILL_PROFICIENCY: 'stats:reduce_skill_proficiency',

    // ── StatsPage.jsx 技能表單（模式 B：saveSkill 有驗證訊息需要立即回應）──
    REQUEST_SAVE_SKILL: 'stats:request_save_skill',       // payload: { name, parent, editId, requestId }
    SAVE_SKILL_RESULT: 'stats:save_skill_result',         // payload: { success, msg?, requestId }
    // ── 模式 C：刪除不需要等回應，UI 靠 Events.Stats.UPDATED 自動重繪 ──
    REQUEST_DELETE_SKILL: 'stats:request_delete_skill',   // payload: { name }
  },
  Story: {
    // ── 現有（保留）────────────────────────────────
    NAVIGATE: 'story:navigate',
    RENDER_IDLE: 'story:render_idle',
    REFRESH_VIEW: 'story:refresh_view',

    // ── 畫面控制（新增）────────────────────────────
    CLEAR_SCREEN: 'story:clear_screen',
    APPEND_CHUNK: 'story:append_chunk',        // payload: { html, isLast, onComplete }
    SKIP_TYPING: 'story:skip_typing',
    APPEND_CHECK_RESULT: 'story:append_check_result', // payload: { stat, total, threshold, passed }
    REWARD_POPUP: 'story:reward_popup',        // payload: string[]

    // ── 選項（新增）────────────────────────────────
    SHOW_OPTIONS: 'story:show_options',        // payload: options[]
    DISABLE_OPTIONS: 'story:disable_options',

    // ── 演出（新增）────────────────────────────────
    SET_VIBE: 'story:set_vibe',            // payload: 'horror'|'romance'|'tension'|'calm'|'triumph'

    // ── 流程控制（新增）────────────────────────────
    GOTO_NODE: 'story:goto_node',           // payload: nodeId (string)
    ADVANCE_CHAIN: 'story:advance_chain',       // payload: nextTags (string[])
    FINISH_CHAIN: 'story:finish_chain',
    SANDBOX_MOVE: 'story:sandbox_move',        // payload: { roomId }
    SANDBOX_EXIT: 'story:sandbox_exit',
    EXPLORING: 'story:exploring',  // 探索過渡中，Actions 鎖定

    // ── UI 更新（新增）─────────────────────────────
    UPDATE_TOPBAR: 'story:update_topbar',
    UPDATE_DRAWER: 'story:update_drawer',
    SHOW_QUIZ: 'story:show_quiz',
    HIDE_QUIZ: 'story:hide_quiz',
    // ── BUFF橋接 ───────────────────────────────
    ENCHANT_REQUEST: 'story:enchant_request',   // payload: { optionRef }
    ENCHANT_RESOLVED: 'story:enchant_resolved',  // payload: { bound, task?, optionRef }
    BIND_MODAL_OPEN: 'story:bind_modal_open',   // payload: { optionRef }
    SHOW_ENDING: 'story:show_ending',  // payload: node（結局節點）
    NARRATIVE_START: 'story:narrative_start',
    NARRATIVE_NODE: 'story:narrative_node',
    NARRATIVE_END: 'story:narrative_end',
    NARRATIVE_INTERRUPT: 'story:narrative_interrupt',
  },
  Reward: {
    // task.js 完成任務時發出：requestId + importance/urgency/comboMultiplier/enchantMultiplier
    REQUEST_ROLL: 'reward:request_roll',
    // RewardEngine 骰完後回傳：requestId + gold/exp/coupon
    ROLL_RESULT: 'reward:roll_result',
  },
  Ach: {
    UPDATED: 'ach:updated',
    UNLOCKED: 'ach:unlocked',
    GENERATE_FOR_TAG: 'ach:generate_for_tag', // 新增任務時，自動為該分類建立對應成就

    // ── 模式 B：需要立即知道成功與否、獎勵內容 ──
    REQUEST_CLAIM_REWARD: 'ach:request_claim_reward', // payload: { id, requestId }
    CLAIM_REWARD_RESULT: 'ach:claim_reward_result',   // payload: { success, msg?, reward?, requestId }
    REQUEST_CHECK_IN: 'ach:request_check_in',         // payload: { id, requestId }
    CHECK_IN_RESULT: 'ach:check_in_result',           // payload: { success, msg?, reward?, requestId }
    REQUEST_COMPLETE_CONTAINER: 'ach:request_complete_container', // payload: { id, requestId } — 容器成就按下「我完成了」
    COMPLETE_CONTAINER_RESULT: 'ach:complete_container_result',   // payload: { success, msg?, reward?, summary?, requestId }

    // ── 模式 C：不需要等回應，UI 靠上面的 UPDATED 重繪 ──
    REQUEST_CREATE_MILESTONE: 'ach:request_create_milestone', // payload: 里程碑表單資料
    REQUEST_UPDATE_MILESTONE: 'ach:request_update_milestone', // payload: 里程碑表單資料
    REQUEST_DELETE_MILESTONE: 'ach:request_delete_milestone', // payload: { id }
    REQUEST_CREATE_CONTAINER: 'ach:request_create_container', // payload: { title, taskId } — 新增任務時勾選「建立新成就」
    REQUEST_ADD_MEMBER: 'ach:request_add_member',             // payload: { achievementId, taskId } — 新增任務時勾選「加入既有成就」
    REQUEST_REMOVE_MEMBER: 'ach:request_remove_member', // payload: { achievementId, taskId } — 編輯任務時解除成就歸屬用
    REQUEST_UPDATE_TEXT: 'ach:request_update_text',           // payload: { id, title, desc } — 系統可編輯成就（分類/技能）改文字用
    REQUEST_UPDATE_CONTAINER: 'ach:request_update_container', // payload: { id, title, desc, rewardItemId, rewardCoupons }
  },
  Settings: {
    UPDATED: 'settings:updated',
    MODE_CHANGED: 'settings:mode_changed',
    SET_LANG: 'settings:set_lang',    // ← 加這行

    // ── SettingsPage.jsx（模式 C：全部不需要等回應，UI 靠 UPDATED 或內部自帶的 TOAST 重繪/提示）──
    REQUEST_APPLY_THEME: 'settings:request_apply_theme',       // payload: { themeKey }
    REQUEST_BUY_ITEM: 'settings:request_buy_item',             // payload: { id }
    REQUEST_TOGGLE_MODULE: 'settings:request_toggle_module',   // payload: { id }
    REQUEST_APPLY_SETTINGS: 'settings:request_apply_settings', // payload: 設定 patch 物件
    REQUEST_SAVE_CAL_TARGET: 'settings:request_save_cal_target', // payload: { value }
    REQUEST_EXPORT_SAVE: 'settings:request_export_save',
    REQUEST_IMPORT_SAVE: 'settings:request_import_save',       // payload: { file }
    REQUEST_PERFORM_RESET: 'settings:request_perform_reset',
    // ── 測試用假訂閱開關（TODO：串接真正 IAP 後，應改由付款成功的 callback 觸發，不能再讓 UI 直接呼叫）──
    REQUEST_TOGGLE_MOCK_SUB: 'settings:request_toggle_mock_sub',
    // ── 鎖定功能列的 Pro 按鈕（目前先跳 Toast；之後想做「Pro 介紹頁」時，見②，暫緩）──
    REQUEST_SHOW_PRO_UPSELL: 'settings:request_show_pro_upsell', // payload: { label }
    // ── 訂閱到期/取消，通知 UI 哪些沒买断的功能被一併鎖住了（payload: { features: string[] }）──
    SUBSCRIPTION_FEATURES_LOST: 'settings:subscription_features_lost',
  },
  Avatar: {
    UPDATED: 'avatar:updated',

    // ── 抽卡（模式 B，含隨機性，需要 requestId 搭配 EventHelper）──
    REQUEST_GACHA: 'avatar:request_gacha',       // payload: { times, requestId }
    GACHA_RESULT: 'avatar:gacha_result',         // payload: { results, requestId }
    // ── 碎片合成券（模式 C，UI 靠 Events.Avatar.UPDATED 自動重繪）──
    REQUEST_CRAFT_TICKET: 'avatar:request_craft_ticket',

    // ── AvatarPage.jsx 更衣室（模式 C，不需要回應）──
    REQUEST_PREVIEW_ITEM: 'avatar:request_preview_item',           // payload: { itemId }
    REQUEST_CLEAR_PREVIEW: 'avatar:request_clear_preview',
    REQUEST_WEAR_ITEM: 'avatar:request_wear_item',                 // payload: { id, type }
    // ── 購買（模式 B：需要立即知道成功與否、扣款結果）──
    REQUEST_BUY_ITEM: 'avatar:request_buy_item',   // payload: { id, requestId }
    BUY_ITEM_RESULT: 'avatar:buy_item_result',     // payload: { success, msg, requestId }
  },
  Pet: {
    UPDATED: 'pet:updated',
    BIRTH_READY: 'pet:birth_ready',

    // ── PetWidget.jsx 互動（模式 C：不需要等回應，UI 靠上面的 UPDATED 重繪）──
    REQUEST_INTERACT: 'pet:request_interact',           // payload: { target, action, amount }
    REQUEST_PICKUP_POOP: 'pet:request_pickup_poop',     // payload: { index, poopId }
    REQUEST_GROW_UP_BABY: 'pet:request_grow_up_baby',   // payload: { name }
    REQUEST_RESOLVE_BIRTH: 'pet:request_resolve_birth', // payload: { choice, babyId, babyName }
    REQUEST_START_EXPLORE: 'pet:request_start_explore',     // payload: { index }（玩家同意寵物出門探險）
    REQUEST_DISMISS_EXPLORE: 'pet:request_dismiss_explore', // payload: { index }（玩家婉拒探險邀約）
    REQUEST_NAME_PET: 'pet:request_name_pet', // payload: { index, name }（幫剛從購買/裝備門進來、needsNaming 為 true 的寵物確認名字）
    PET_ADDED_NEEDS_NAMING: 'pet:added_needs_naming', // payload: { index }（新寵物剛加入 activePets 那一刻立即發出，讓當下掛載的頁面直接跳出取名視窗，不用等玩家切回大廳）
    // ── 從 Avatar 搬過來（購買/裝備門的寵物邏輯已搬進 PetEngine）──
    REQUEST_WEAR_ITEM: 'pet:request_wear_item', // payload: { itemId }（avatar.js 的 wearItem() 選到 pet 分類時轉發過來）
    REPLACE_PROMPT: 'pet:replace_prompt', // payload: { newItemId }（原 Avatar.PET_REPLACE_PROMPT）
    REQUEST_CONFIRM_REPLACE: 'pet:request_confirm_replace', // payload: { index, newItemId }（原 Avatar.REQUEST_CONFIRM_PET_REPLACE）
    // ── 關閉寵物系統：清空當前寵物（不影響 petArchive/traveledPets/retiredPetHistory）──
    REQUEST_DISABLE_MODULE: 'pet:request_disable_module', // Settings 頁手動關閉，UI 端已跳過 ConfirmDialog 確認
    REQUEST_WIPE_CURRENT: 'pet:request_wipe_current',      // 訂閱到期/取消、且沒买断時呼叫，只清資料不動 module_pet_active
  },
  Timer: {
    // 原本是裸字串 'TIMER_COMPLETED'（跟其他 category:action 命名風格不一致），
    // 這裡順便統一格式；plugins/timer.js 和 engines/ach.js 兩處呼叫點已同步更新
    COMPLETED: 'timer:completed',
  },
  Checkin: {
    REQUEST_INIT_SESSION: 'checkin:request_init_session',
    SESSION_READY: 'checkin:session_ready',
    REQUEST_CHECKIN_TODAY: 'checkin:request_checkin_today',
    REQUEST_MAKEUP: 'checkin:request_makeup',
    REQUEST_CLAIM_WEEK: 'checkin:request_claim_week',
    REQUEST_CLAIM_MONTH: 'checkin:request_claim_month',
    // RESULT 是給 EventHelper 用的固定事件名，requestId 放在 payload 裡（不是事件名稱本身）。
    // CheckinModal.jsx 已經用 EventHelper.requestOnce 接上這組事件。
    RESULT: 'checkin:result',
  },
};