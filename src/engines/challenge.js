/* src/engines/challenge.js
 * 陪伴者挑戰系統
 *
 * 職責：
 *   1. 定期（每次進入大廳、每日重置）隨機產生挑戰
 *   2. 監聽 Task.COMPLETED，追蹤進行中挑戰的進度
 *   3. 挑戰完成時給予獎勵並清除 store.challenge
 *
 * store.challenge 結構：
 *   {
 *     id:       string,       // 唯一 ID
 *     status:   'pending'     // 待接受
 *             | 'active'      // 接受中
 *             | 'completed',  // 已完成
 *     desc:     string,       // 顯示文字
 *     type:     'count'       // 完成 N 項任務
 *             | 'cat'         // 完成特定分類任務
 *             | 'streak',     // 今日連續完成
 *     cat:      string|null,  // type==='cat' 時的分類
 *     target:   number,
 *     curr:     number,
 *     reward:   { gold, exp },
 *     active:   boolean,
 *     issuedAt: number,       // 發布時間（ms）
 *   }
 */

import { getState, setState } from '@/core/state.js';
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

// ─── 挑戰模板 ─────────────────────────────────────────
// desc 裡的 {n} 會被 target 替換，{cat} 會被分類名稱替換
const TEMPLATES = [
  // 完成任意 N 項
  { type: 'count', target: 1,  reward: { gold: 30,  exp: 30  }, desc: '完成任意 {n} 項任務' },
  { type: 'count', target: 3,  reward: { gold: 80,  exp: 80  }, desc: '今天完成 {n} 項任務' },
  { type: 'count', target: 5,  reward: { gold: 150, exp: 150 }, desc: '衝刺！完成 {n} 項任務' },
  // 完成特定分類
  { type: 'cat',   target: 1,  reward: { gold: 50,  exp: 50  }, desc: '完成一項「{cat}」類任務' },
  { type: 'cat',   target: 2,  reward: { gold: 100, exp: 100 }, desc: '完成兩項「{cat}」類任務' },
  { type: 'cat',   target: 3,  reward: { gold: 160, exp: 160 }, desc: '挑戰三項「{cat}」類任務！' },
  // 今日連續完成（連帶 streak 感）
  { type: 'streak', target: 2, reward: { gold: 120, exp: 120 }, desc: '連續完成 {n} 項任務，不能中斷！' },
  { type: 'streak', target: 3, reward: { gold: 200, exp: 200 }, desc: '不停歇！連續完成 {n} 項任務' },
];

// 陪伴者說的發布詞
const ISSUE_DIALOGS = [
  '嘿！我有個任務想請你幫忙～',
  '今天狀況不錯，來個小挑戰吧？',
  '我最近有個想法……你願意試試嗎？',
  '拜託拜託！這個忙你一定幫得上！',
  '有個小任務，說不定你一下就搞定了！',
];

// ─── 主引擎 ───────────────────────────────────────────
export const ChallengeEngine = {
  init: makeIdempotentInit(function () {
    // 監聽任務完成 → 追蹤進度
    const unsubDone = EventBus.on(Events.Task.COMPLETED, ({ task }) => {
      this._onTaskCompleted(task);
    });

    // 監聽每日重置 → 清掉昨天未完成的挑戰，重新發布
    const unsubReset = EventBus.on(Events.System.DAILY_RESET, () => {
      // 若還有未完成的挑戰，清除
      const s = getState();
      if (s.challenge && s.challenge.status !== 'completed') {
        setState(() => ({ challenge: null }));
      }
      // 延遲 3 秒再發布（讓用戶先看到簽到 Modal）
      setTimeout(() => this.tryIssueChallenge(), 3000);
    });

    return [unsubDone, unsubReset];
  }),

  // ─── 嘗試發布挑戰 ─────────────────────────────────
  // 條件：沒有進行中的挑戰 + 有裝備陪伴者
  tryIssueChallenge() {
    const s = getState();

    // 已有挑戰（pending 或 active）→ 不重複發
    if (s.challenge && s.challenge.status !== 'completed') return;

    // 沒有陪伴者 → 不發
    const companion = s.avatar?.wearing?.companion;
    if (!companion) return;

    // 發布冷卻：距上次發布不足 2 小時不重複發
    const lastIssued = s.challenge?.issuedAt ?? 0;
    if (Date.now() - lastIssued < 2 * 60 * 60 * 1000) return;

    const challenge = this._generateChallenge(s.taskCats ?? ['每日']);
    setState(() => ({ challenge }));
    EventBus.emit(Events.System.TOAST, '💬 陪伴者有話說～');
  },

  // ─── 產生挑戰 ─────────────────────────────────────
  _generateChallenge(taskCats) {
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const cats = taskCats.filter(c => c !== '全部');
    const cat  = cats.length > 0
      ? cats[Math.floor(Math.random() * cats.length)]
      : '每日';

    const desc = template.desc
      .replace('{n}', String(template.target))
      .replace('{cat}', cat);

    return {
      id:       'ch_' + Date.now(),
      status:   'pending',
      desc,
      type:     template.type,
      cat:      template.type === 'cat' ? cat : null,
      target:   template.target,
      curr:     0,
      reward:   { ...template.reward },
      active:   false,
      issuedAt: Date.now(),
      issueDialog: ISSUE_DIALOGS[Math.floor(Math.random() * ISSUE_DIALOGS.length)],
    };
  },

  // ─── 追蹤進度 ─────────────────────────────────────
  _onTaskCompleted(task) {
    const s = getState();
    const ch = s.challenge;
    if (!ch || ch.status !== 'active') return;

    let matches = false;
    if (ch.type === 'count')  matches = true;
    if (ch.type === 'cat')    matches = task.cat === ch.cat;
    if (ch.type === 'streak') matches = true;

    if (!matches) return;

    const newCurr = (ch.curr ?? 0) + 1;

    if (newCurr >= ch.target) {
      // 挑戰完成！
      setState(s => ({
        challenge: { ...s.challenge, curr: newCurr, status: 'completed' },
        gold: (s.gold ?? 0) + ch.reward.gold,
      }));
      EventBus.emit(Events.Stats.ADD_PLAYER_EXP, { amount: ch.reward.exp });
      EventBus.emit(Events.Stats.UPDATED);
      EventBus.emit(Events.System.TOAST,
        `🎉 挑戰完成！+${ch.reward.gold}💰 +${ch.reward.exp}✨`
      );

      // 3 分鐘後清除，讓陪伴者可以再發新的
      setTimeout(() => {
        setState(s => {
          if (s.challenge?.status === 'completed') return { challenge: null };
          return {};
        });
      }, 3 * 60 * 1000);

    } else {
      setState(s => ({
        challenge: { ...s.challenge, curr: newCurr },
      }));
    }
  },

  // ─── 手動觸發（供 debug 或測試用）──────────────────
  forceIssue() {
    const s = getState();
    const cats = s.taskCats ?? ['每日'];
    setState(() => ({ challenge: null }));
    setTimeout(() => {
      const ch = this._generateChallenge(cats);
      setState(() => ({ challenge: ch }));
    }, 100);
  },
};
