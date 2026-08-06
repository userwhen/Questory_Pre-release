/* src/utils/petDialog.js */
// 從 engines/pet.js 抽出來的純函式：只吃 petData 參數，不碰 store、不用 EventBus，
// 所以不算 Engine 邏輯，UI 元件可以直接 import 使用，不違反「UI 不可直接 import Engine」的規則。
import { DIALOGS } from '@/pet/data/pet_dialogs.js';

export function getPetDialog(petData) {
  if (!petData) return '...';
  if (petData.isSick) return '咳咳...好難受...';
  if (petData.food < 20 && petData.mood < 20) return '......';
  if (petData.food < 30) return '肚子好餓喔...';
  if (petData.mood < 30) return '覺得有點無聊...';

  const attach    = petData.traits?.attachment ?? '安全';
  const baseTrait = petData.traits?.base       ?? '安靜';
  const taskAttr  = petData.traits?.task       ?? '無';

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const g  = pick(DIALOGS.greetings[attach]   ?? DIALOGS.greetings['安全']);
  const su = pick(DIALOGS.supports[taskAttr]  ?? DIALOGS.supports['無']);
  const a  = pick(DIALOGS.actions[baseTrait]  ?? DIALOGS.actions['安靜']);

  return `${g}${su ? ' ' + su : ''}\n${a}`;
}