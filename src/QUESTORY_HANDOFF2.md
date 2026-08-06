# Questory Task 系統交接 Prompt (v2)

（把這份文件內容貼到新對話框開頭，再上傳文件裡列出的檔案，就可以無縫接續。）

## 專案基本資訊
- Questory：RPG 風格的遊戲化任務管理 App
- 技術棧：React 18 + Vite + Zustand + Capacitor 6，純 JS ES6（無 TypeScript）
- 路徑別名 `@/` = `src/`
- 另有一個 AI 負責管理整個專案所有檔案的解耦工作，這裡做的解耦/新增內容需要能提交給該 AI 檢查

## 核心架構原則（務必遵守）
- UI 元件不可直接 `import` Engine（`src/engines/*.js`），Engine 之間也不可互相 `import`，一律透過 `EventBus` 溝通。三種模式：
  - **A（查詢）**：`EventBus.on('xxx:request_data', ...)` 回應 `emit('xxx:data_ready', result)`
  - **B（需要即時結果/含隨機性）**：用唯一 `requestId` 避免競態
  - **C（純指令）**：直接 `emit`，UI 靠監聽既有的 `UPDATED` 類事件自動重繪
- **Engine 也不可直接 import Plugin**（`src/plugins/*.js`）——這條容易被忽略。正確做法：Plugin 自己在 `init()` 監聽 Engine 既有在 emit 的事件（例：`Notification.js` 監聽 `Events.Task.CREATED/UPDATED/DELETED` 自己重新排程通知，而非被 `task.js` 直接呼叫）
- Immutable setState 寫法，不能對 store 底下物件直接 mutate
- 事件名稱一律用 `Events` 常數（`event_types.js`），不要用裸字串

## Task 系統目前狀態（已完成，不用重做）
- `TaskPage.jsx` / `DailyReportModal.jsx` / `task.js` 已完全解耦，`task.js` 不 import 任何 Plugin
- 5 個任務分類模板（取代舊的 boss/quest/routine/event）：`gather`收集任務 / `hunt`狩獵任務 / `event`限時副本 / `boss`BOSS戰 / `guild`公會委託；存檔為純測試資料不需遷移
- 每個分類有自己的預設顯示欄位（`CATEGORY_VISIBLE_FIELDS`），其餘欄位收進「展開進階戰術設定」；`guild` 分類全欄位展開、無此按鈕
- 已移除：`ModePickerModal.jsx`、`BountyFormModal.jsx`（由收集任務分類 + 遊戲口吻開關取代）、上方快速新增輸入框、卡片複製按鈕
- 循環設定：顯式開關（不循環/循環，預設不循環）→ 間隔/星期幾兩種模式 → 間隔模式可設起始日
- 提醒功能：三選一（不提醒/當天提醒/截止時提醒），預設不提醒；`Notification.js` 反應式監聽 Task 事件自動重新排程
- 地點欄位：純文字輸入 + 可選地圖選點（`LocationPickerModal.jsx`，OpenStreetMap/Leaflet，免申請免登入）
- 熱量欄位綁 `cat === '運動'`（不綁 questClass/分類模板）
- 遊戲口吻敘事文字：`narrativeMode` 預設開啟，用各分類的 `descTemplate` 生成故事化文字存進 `task.narrativeText`，不覆蓋原始 `desc`
- 任務詳情：卡片點擊開 `TaskDetailModal.jsx`（不再原地展開），編輯按鈕在詳情頁標題列；歷史頁卡片維持原地展開（`readOnly` 模式）
- 行事曆：移除原生同步，改成任務列表/行事曆同一顆按鈕切換，存進 `taskViewMode`（persisted）；`CalendarView.jsx` 月曆格子點擊：空白日期跳分類選擇新增任務，已有任務日期選中後下方列出清單（含循環任務投影）
- 已修復 bug：每日任務歷史重複記錄、計次任務未達標可跳過完成、刪除已完成任務未回收獎勵、`toISOString()` 時區偏移（已改用 `toLocalDateStr`）、`TaskDetailModal` 完成任務後未自動關閉
- 附魔加成：`task.enchant.boundAt` 存在時金幣/經驗 1.5×，TaskCard 顯示「✦ 祝福」徽章

## 表單美化——本輪（TaskFormModal.jsx）已完成
- 分類欄加上 `boxStyle` 分組（原本裸露，現在跟其他欄位視覺一致）
- 子任務欄：移除「一般/計次」模式切換按鈕；「全部/擇一」完成規則按鈕縮小移到「子任務步驟」標題列；子任務清單支援 Pointer Events 拖曳排序（滑鼠/觸控通用，非原生 `draggable`）+ 底部常駐輸入框，打字後 Enter 或按實體＋按鈕新增
- 「計次」不再跟分類綁定：新增獨立的「重複次數」欄位，一律顯示（不論分類），放在子任務欄下方；值 > 0 才視為 count 類型（`type`/`target` 由此欄位值反向決定），`CATEGORY_DEFAULT_TYPE` 已變成死代碼可以刪除
- `SkillsBlock`/`MatrixBlock`/`SubtasksBlock` 標題統一改用 `labelStyle`（原本各自客製字級，現在跟其他欄位一致）
- `DeadlineBlock` 輸入框改滿寬（移除 `width:'auto'/minWidth:200` 覆寫，直接用 `inputStyle`）

## 表單美化——待處理（正在討論，尚未定案/實作）
1. **循環頻率重構**：目前 inline 展開三層（不循環/循環 → 間隔/星期幾 → 數值），討論方向是改成單行摘要 + 點擊開 modal（參考圖二的「重複頻次：無限」→ 彈窗設定），讓主表單維持每欄位一行、`boxStyle` 分組整齊。這是結構改動，尚未動手
2. **TaskDetailModal 標籤列排版**：標籤列要跟分類標籤同一行、同樣大小；下方才是描述，若無描述則留白。需要 `TaskDetailModal.jsx` 才能給 diff
3. **長按多選模式拖曳排序**：長按卡片進入勾選模式後，要能按住卡片拖動來重新排序/移動任務。需要 `TaskCard.jsx`/`TaskPage.jsx` 才能給 diff

## 其他已確認方向、尚未實作項目（backlog，不在本輪表單美化範圍內）
- **分類→資料夾系統**：「每日」已改名「日常」（使用者已自行完成）；長按其他分類可改名、分類區＋新增鍵、免費版預設+2上限/PRO版10個、外框樣式跟技能綁定區一致——都還沒做。卡住原因：`state.js` 完全沒有 `taskCats` 的新增/刪除/改名方法，要從零寫
- **成就系統**：`Events.Ach.GENERATE_FOR_TAG` 目前吃 `cat`（每日/運動/工作/待辦/願望），不是新的 5 個 `questClass`；要不要綁定新分類需要先看 `ach.js`/`AchPage.jsx` 才能評估
- **批次複製**：目前只有批次刪除（舊功能），要不要加還沒決定
- **`src/plugins/calendar.js`**：孤兒檔案（沒人 import），刪不刪還沒決定
- **Recheck 異常偵測**（跨系統金幣/經驗值健全度稽核）：已決定不做，交給負責解耦的另一個 AI
- **`stats.js` 待辦**：`reduceSkillProficiency` 的 hard mode（`strictMode`）降級邏輯（`lv--` 到 lv=1）；`_mutAddAttrExp` 直接賦值違規要修正；`init()` 要拿掉初始化 setState，改成訂閱 `'stats:add_skill_proficiency'`/`'stats:reduce_skill_proficiency'` 兩個 EventBus 事件並回傳 unsub

## 欄位命名對照表（討論時統一用這套稱呼）
| 名稱 | 對應內容 | 程式碼變數 |
|---|---|---|
| 標題列 | 任務名稱輸入框 + 📌釘選 + 🎭口吻切換 | 直接寫在 JSX |
| 描述欄 | 描述/備註文字框 | `DescBlock` |
| 分類欄 | 分類標籤（已加 boxStyle） | 直接寫在 JSX |
| 子任務欄 | 子任務清單（拖曳排序+Enter新增），無模式切換 | `SubtasksBlock` |
| 重複次數欄 | 獨立計次欄位，不綁分類 | `CountBlock`（新增） |
| 地點欄 | 輸入地點/地圖按鈕 | `LocationBlock` |
| 循環欄 | 循環頻率設定（待重構成 modal） | `RecurrenceBlock` |
| 截止欄 | 到期時間（已改滿寬） | `DeadlineBlock` |
| 提醒欄 | 不提醒/當天/截止時三選一 | `ReminderBlock` |
| 技能欄 | 綁定修煉技能 | `SkillsBlock` |
| 熱量欄 | 消耗熱量（cat=運動才顯示） | `CaloriesBlock` |
| 評估欄 | 重要性/緊急性+獎勵預覽 | `MatrixBlock` |
| 展開鍵 | 收合/展開進階戰術設定 | 獨立 toggle |
| 頁尾 | 清空內容/新增任務 | footer 按鈕 |

## 需要使用者上傳的檔案（依討論內容決定要哪些）
- `TaskFormModal.jsx`（本輪修改後的最新完整版——請上傳你實際套用改動後的檔案，不是最初那份）
- `TaskStyles.js`（樣式變數定義，已提供過，方便的話一起附上）
- `TaskDetailModal.jsx`（處理標籤列排版時需要）
- `TaskCard.jsx` / `TaskPage.jsx`（處理長按拖曳排序時需要）
- `state.js`（處理分類/資料夾系統時需要）
- `ach.js` / `AchPage.jsx`（處理成就跟新分類整合時需要）

## 使用者偏好（務必遵守）
- 直接給結果，不要前言/摘要/多餘的過程敘述
- 工具使用完只回報結果
- 除非被問，否則不解釋在做什麼
- 程式碼一定要完整；其他回覆盡量簡短
- 既有檔案的修改只給改動片段（diff 風格：要替換的部分），不要整份檔案——除非改動量超過檔案 50%