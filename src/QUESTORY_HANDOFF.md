# Questory 專案交接 — 接續提示詞

## 專案背景

Questory 是一款把日常任務遊戲化的 App，React 18 + Vite + Zustand + Capacitor 6，架構是「UI 元件 → EventBus → Engine → Zustand Store」三層分離。這是一輪大規模架構整理的延續，前一個對話已經完成大量重構，這份文件是交接內容，請先讀完再開始動作。

**開始前請先上傳專案的 `src/` 資料夾（打包成 zip 或 rar）**，因為新對話沒有前一輪的檔案存取權限。

---

## 已完成的工作（不要重做，僅供理解架構）

1. **事件系統收斂**：所有 UI-Engine 溝通都改用 `EventBus`，事件名稱全部收斂進 `core/event_types.js` 的 `Events` 常數（不再有手打字串）。命名慣例是 `REQUEST_X` / `X_RESULT` 成對出現。
2. **9 個 UI 元件已完全解耦**（GachaPage、CheckinModal、AvatarPage、SettingsPage、StatsPage、MainPage、ShopPage、AchPage、PetWidget），都不再直接 `import Engine`，改用：
   - **模式 A**：查詢類，`EventBus.emit(REQUEST) → EventBus.on(RESULT)`
   - **模式 B**：需要立即知道成功/失敗，用 `core/events.js` 的 `EventHelper.requestOnce(reqEvent, resEvent, payload)`，或更進一步用 `hooks/useRequestAction.js` 的 `useRequestAction()`（內建 loading 狀態 + toast 反饋 + 逾時處理）
   - **模式 C**：純指令不需要回應，UI 靠監聽對應的 `UPDATED` 事件自動重繪
3. **10 個 Engine** 都用 `core/events.js` 的 `makeIdempotentInit(setupFn)` 包住 `init()`，防止重複呼叫時重複訂閱事件。`setupFn` 用 `this` 呼叫、回傳 unsub 函式陣列即可，不用自己寫 `_inited`/`_cleanup`。
4. **共用元件**：
   - `components/ui/Modal.jsx` — 共用 Modal 殼層（`title`/`onClose`/`children`/`footer`/`maxWidth`/`bodyStyle`/`zIndex` props），已經套用到 10 個檔案、17 個 Modal
   - `components/ui/ConfirmDialog.jsx` — 共用二次確認對話框（`message`/`subMessage`/`icon`/`confirmText`/`danger` props）
   - `utils/toast.js` — `toast(msg)` 取代直接 `EventBus.emit(Events.System.TOAST, msg)`
5. **純函式抽出**：`utils/petDialog.js`、`utils/shopSelectors.js`、`utils/achSelectors.js` — 不吃 Engine 狀態的邏輯抽出來，UI 可以直接 import 不用透過 Engine
6. **抓到並修掉的真實 bug**：
   - `AvatarEngine.buyItem` 購買成功卻誤報失敗（回傳格式不一致）
   - `window.cheatGacha` 正式版沒有 DEV 判斷（漏洞）
   - `SettingsEngine.exportSave` 改用 Capacitor `Filesystem`+`Share`，純網頁環境自動 fallback
   - `PetEngine` 衰減計時器搬進 Engine 自己管理（原本只有大廳頁面掛載時才會動）
   - `@keyframes modalFadeIn` 從未真正定義過，已內建進 `Modal.jsx`/`ConfirmDialog.jsx`
   - `TaskFormModal.jsx` 的 duplicate key 警告
   - `ach.js` 移除了對 `StatsEngine` 的直接 import（Engine 對 Engine 违规）

---

## 明確排除、這次刻意沒動的部分

- **`AvatarPage.jsx` 內建的 GachaModal 完全沒動**，跟獨立的 `GachaPage.jsx` 仍是兩份重複邏輯。使用者說先不處理，之後才會決定要不要合併，兩邊視覺流程可能是刻意做不同的。
- **Story 系統相關檔案沒動**：`components/story/*`、`engines/story/*` 的內部邏輯，包含 `StoryActions.jsx`/`TaskBindModal.jsx`/`StoryPage.jsx` 仍直接 import Engine（文件裡刻意允許的例外）
- **`engines/story/` 命名不統一**（PascalCase vs 其他 engine 的全小寫）——建議用 IDE 的重新命名檔案功能（會自動更新所有 import 路徑），不建議手動改，風險比效益高
- **11 個死檔案**已盤點出來但使用者要自己清除，清單見下方
- **`main.jsx` 裡 `TestPool` 是否該在正式版載入**——使用者說不需要處理，維持現狀

### 死檔案清單（確認零引用，可直接刪除）
```
engines/story/story_learning.js
components/story/StoryLearningModal.jsx
components/task/BountyFormModal.jsx
components/task/ModePickerModal.jsx
data/story/data_endings.js
data/story/data_frames.js
data/story/data_piece.js
data/story/data_scenes.js
data/story/data_structures.js
data/story/data_tags.js
data/story/test_word_db.js
```
另外 `data/taskdict.js` 裡的 `BOUNTY_TYPES`/`STAMP_OPTIONS`、`data/data.js` 裡的 `GameConfig.Tutorial` 區塊是部分死亡（檔案裡其他部分還在用，只能刪特定 export，不能刪整個檔案）。

---

## 接下來要做的事（按優先順序）

### 1. Debug UI 面板（god mode）— 使用者明確要求，還沒開始

使用者會拿去實機測試，**必須是視覺化面板，不能是 console 指令**（沒辦法在手機上打字下指令）。

要求：
- 只在 `import.meta.env.DEV` 顯示，正式版完全不掛載（沿用整個專案已經驗證過的這個模式）
- 一個浮動按鈕，點開後彈出面板，裡面用按鈕/輸入框直接操作，不要用 console
- 建議涵蓋的系統：玩家數值（等級/經驗/金幣/鑽石直接設定）、任務（一鍵全部完成、觸發換日重置）、寵物（催熟幼崽、設定衰減數值）、精力（回滿）、簽到（強制觸發每日重置）、成就（全部解鎖）
- 面板呼叫方式要走現有的 EventBus 模式（例如 `EventBus.emit(Events.Stats.ADD_PLAYER_EXP, {amount})`），不要繞過架構直接改 store，這樣才能測試到真實的遊戲邏輯路徑
- 可以先問使用者「每個系統最想要哪些測試指令」，列成清單讓他勾選，再決定做多細，不要自己假設全部細節

### 2. 漸進式功能解鎖架構（Feature Flag）— 已討論但沒有實作

使用者想要遊戲一開始只有基礎功能，之後陸續解鎖，理由：(a) 讓玩家感覺遊戲有在進步 (b) 保護還沒公開的內容不被玩家挖出來。

已經確認的方向：**用「延後下載」的架構同時解決這兩個問題**——未解鎖的內容（劇情節點、扭蛋池、新玩法邏輯）不要打包進當次出貨的 App，等真正要解鎖時才從伺服器/CDN 抓下來。這剛好符合 `NarrativeEngine.loadPool()`/`loadPluginConfigs()` 現有的「執行期注入資料」設計，只是目前餵的是本地 `TestPool`，之後要改成從遠端抓。

具體要做的：
- 設計一個 `GameConfig.Features = { pets: true, story: false, gacha: true, ... }` 這樣的開關表
- `main.jsx` 呼叫各 Engine `.init()` 前先檢查對應開關
- Navbar/路由（`theme_config.js` 的 navbar 清單）也要依開關過濾，不顯示未解鎖系統的入口
- **重要**：這件事沒有做「伺服器權威」架構（防止玩家竄改本地存檔數值），那是完全不同量級的工程，這次不包含在內，只解決「延後釋出內容」跟「感覺持續更新」這兩件事

### 3. Google Play 上架準備

已查證的重點（截至查證當下）：
- Capacitor 的 `targetSdkVersion` 綁定在大版本上，Capacitor 6 預設是 34，Google Play 現在要求新 App/更新要 target API 36（2026/8/31 起，可申請延到 11/1）。**需要先確認專案目前實際的 Capacitor 版本**，如果還在 6，要規劃升級到 7 或 8，不要只手動改 gradle 數字
- 遊戲有扭蛋機制，**強制規定**：只要付費能導向隨機虛擬道具，購買前必須明確揭露機率，否則審核不會過。使用者傾向保留扭蛋、加上機率文字（不打算移除或延後），這個判斷是對的，機率文字是三個選項裡工作量最小的
- 使用者傾向先只保留 IAP（真的要不要開啟金流會再觀察）+ 推播通知，Data Safety 表單仍然是**強制**要填的（不管 IAP 是不是「贊助」性質，只要蒐集任何資料就要填，不是選擇性的）
- `.aab` 可以直接用 Android Studio 打包（Build → Generate Signed App Bundle），Capacitor 標準流程是 `npx cap sync android` → 開 Android Studio → 打包，不需要額外工具

還沒做的：實際確認 Capacitor 版本、規劃升級路徑、扭蛋機率 UI 文字、完整上架檢查清單（Data Safety 表單怎麼填、隱私權政策網址、權限聲明等）

### 4. Tier 3 收尾（低優先，有空再做）
- `engines/story/` 命名統一 → 交給 IDE 重新命名工具
- Modal.jsx 有個已知的小落差：`PetWidget.jsx` 原本 4 個 Modal 有自訂 `maxWidth:380`，套用共用 `Modal` 元件時沒有帶過去這個覆蓋值（改用預設 400），視覺差異很小，沒特別處理，有需要可以在呼叫處補 `maxWidth={380}`

---

## 工程規範（整個對話過程中確立、請延續）

- Engine 是物件字面量單例（`export const XxxEngine = {...}`），不是 class，`init()` 用 `makeIdempotentInit` 包
- 事件常數一律放 `core/event_types.js`，不要手打字串
- UI 元件不可以直接 `import Engine`，一律透過 `EventBus`
- Engine 之間也不可以直接互相 import
- 不確定回傳值格式時要先看 Engine 方法的實際 `return`，不要假設
- 每次修改後用 `node --check`（純 `.js`）或安裝好的 `esbuild`（`.jsx`，指令：`/home/claude/node_modules/.bin/esbuild file.jsx`）驗證語法——但**esbuild 只檢查語法，不檢查變數是否真的存在**，刪除/搬移變數定義後要額外用 grep 交叉比對確認沒有殘留引用
- 輸出方式：文字說明改了哪裡就好，不要整份貼代碼；只有新建檔案或改動大到文字講不清楚時才用檔案輸出，且盡量集中在一輪工作完成後才輸出，不要每個小改動都輸出一次