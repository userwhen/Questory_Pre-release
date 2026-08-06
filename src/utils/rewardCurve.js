/* src/utils/rewardCurve.js */
// 任務難度 → 獎勵範圍/掉券機率 的曲線，RewardEngine（真正發獎勵）跟 TaskFormModal.jsx（表單預覽）
// 共用這一份公式，避免兩邊各自算出不同數字
const CURVE_EXPONENT = 2; // 想要低段更平緩，可以調高到 3；數字越大，前段漲得越慢、後段越陡

export function getRewardWeight(importance, urgency) {
  const imp = parseInt(importance) || 1;
  const urg = parseInt(urgency) || 1;
  return (imp * 1.5) + (urg * 0.5); // 範圍 2 ~ 8
}

function normalizedWeight(w) {
  return Math.min(1, Math.max(0, (w - 2) / 6));
}

export function getRewardRange(w) {
  const curve = Math.pow(normalizedWeight(w), CURVE_EXPONENT);
  return {
    min: Math.round(15 + 135 * curve),
    max: Math.round(25 + 275 * curve),
  };
}

export function getCouponDropChance(w) {
  const curve = Math.pow(normalizedWeight(w), CURVE_EXPONENT);
  return 0.03 + 0.17 * curve; // 3% ~ 20%
}

export function rollRewardAmount(w) {
  const { min, max } = getRewardRange(w);
  return Math.floor(min + Math.random() * (max - min + 1));
}