/* src/ach/utils/achSelectors.js */
// 從 engines/ach.js 抽出來的純函式：不呼叫 getState()/setState()，
// ach.js 內部大量方法仍會呼叫這幾個（改成委派過來，邏輯只維護一份），
// AchPage.jsx 則可以直接 import 使用，不需要透過 Engine。

export function getSortedAchievements(milestones, achievements) {
  return [...(milestones || []), ...(achievements || [])].sort((a, b) => {
    const score = x => (x.done && !x.claimed) ? 2 : (!x.done ? 1 : 0);
    return score(b) - score(a);
  });
}

export function getTierConfig(tier, targetType) {
  const targets = {
    tag:          { S: 1000, A: 500,  B: 200,  C: 50 },
    attr:         { S: 1000, A: 500,  B: 200,  C: 50 },
    focus_time:   { S: 6000, A: 3000, B: 1200, C: 300 },
    pomodoro:     { S: 250,  A: 100,  B: 40,   C: 10 },
    login_days:   { S: 365,  A: 100,  B: 30,   C: 7 },
    login_streak: { S: 50,   A: 21,   B: 7,    C: 3 },
  };
  const rewards = {
    S: { gold: 500, exp: 1000 },
    A: { gold: 200, exp: 400 },
    B: { gold: 80,  exp: 150 },
    C: { gold: 20,  exp: 50 },
  };
  const tType = targets[targetType] ? targetType : 'tag';
  return {
    target: targets[tType][tier] ?? targets[tType]['C'],
    reward: rewards[tier]        ?? rewards['C'],
  };
}

export function getUnitString(type) {
  if (type === 'focus_time')                             return '分鐘';
  if (type === 'pomodoro')                                return '顆番茄';
  if (type === 'login_days' || type === 'login_streak')  return '天';
  if (type === 'streak_tag' || type === 'streak_attr')   return '天';
  return '積分';
}