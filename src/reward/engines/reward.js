/* src/reward/engines/reward.js */
// 任務完成獎勵的骰值引擎：只做一件事——收到 REQUEST_ROLL 就骰一組
// gold/exp/coupon/freeGem 回傳。曲線公式在 utils/rewardCurve.js（跟
// TaskFormModal.jsx 的預覽共用同一份，數字不會兩邊對不上）。
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import {
  getRewardWeight,
  rollRewardAmount,
  getCouponDropChance,
  rollFreeGemAmount,
} from '@/reward/utils/rewardCurve.js';

export const RewardEngine = {
  init: makeIdempotentInit(function () {
    const unsubRoll = EventBus.on(Events.Reward.REQUEST_ROLL, ({ requestId, importance, urgency, comboMultiplier, enchantMultiplier }) => {
      const w = getRewardWeight(importance, urgency);
      const mult = (comboMultiplier ?? 1) * (enchantMultiplier ?? 1);

      // gold/exp 沿用舊版同步公式的行為（兩者本來就是同一個數字），
      // 只骰一次基準值，乘上 combo/祝福加成
      const amount = Math.round(rollRewardAmount(w) * mult);
      // 原本骰中只會讓一個抽象的「金幣券」計數器 +1，現在改成骰中直接授予一個
      // 真正的背包道具（sys_cash_pouch）。機率曲線沿用同一份 getCouponDropChance，
      // 函式名稱沒有跟著改字面——避免跟 TaskFormModal.jsx 表單預覽那邊共用的
      // import 對不上。
      const bonusItem = Math.random() < getCouponDropChance(w);
      // 鑽石：機率不吃祝福（較單純）；有掉到時的數量吃祝福倍率
      const freeGem = rollFreeGemAmount(w, enchantMultiplier ?? 1);

      EventBus.emit(Events.Reward.ROLL_RESULT, {
        requestId,
        gold: amount,
        exp: amount,
        bonusItem,
        freeGem,
      });
    });

    return [unsubRoll];
  }),
};
