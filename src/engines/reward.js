/* src/engines/reward.js */
// 任務完成獎勵的骰值引擎：只做一件事——收到 REQUEST_ROLL 就骰一組
// gold/exp/coupon 回傳。曲線公式在 utils/rewardCurve.js（跟
// TaskFormModal.jsx 的預覽共用同一份，數字不會兩邊對不上）。
import { EventBus, makeIdempotentInit } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { getRewardWeight, rollRewardAmount, getCouponDropChance } from '@/utils/rewardCurve.js';

export const RewardEngine = {
  init: makeIdempotentInit(function () {
    const unsubRoll = EventBus.on(Events.Reward.REQUEST_ROLL, ({ requestId, importance, urgency, comboMultiplier, enchantMultiplier }) => {
      const w = getRewardWeight(importance, urgency);
      const mult = (comboMultiplier ?? 1) * (enchantMultiplier ?? 1);

      // gold/exp 沿用舊版同步公式的行為（兩者本來就是同一個數字），
      // 只骰一次基準值，乘上 combo/祝福加成
      const amount = Math.round(rollRewardAmount(w) * mult);
      const coupon = Math.random() < getCouponDropChance(w);

      EventBus.emit(Events.Reward.ROLL_RESULT, {
        requestId,
        gold: amount,
        exp: amount,
        coupon,
      });
    });

    return [unsubRoll];
  }),
};