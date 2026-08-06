/* src/components/ui/usePetGesture.js */
// 手勢辨識 hook：輕點 / 摩擦 / 長按互斥判定，PetCreatures.jsx 的成寵、幼崽
// 元件共用；LONG_PRESS_MS 也匯出給寵物箱按鈕（PetSupplyTray.jsx 的
// PetBoxButton）共用同一個長按門檻。
import { useRef, useCallback } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

// ─── 手勢判定常數 ────────────────────────────────────
export const RUB_DIST_PX     = 24;   // 位移超過這個距離才算「摩擦」（原本 15px 太敏感，一般點擊的自然晃動就會超過）
export const RUB_WINDOW_MS   = 600;  // 摩擦手勢只在按下後這段時間內判定，避免長按久了因自然手震/滑鼠漂移被誤判成摩擦
export const LONG_PRESS_MS   = 400;  // 長按判定的門檻時間，寵物箱跟寵物本體共用同一個數字
export const RUB_BURST_WINDOW_MS = 1500; // 一次「搓一搓」手勢允許連續觸發的時間視窗
export const RUB_BURST_MAX       = 8;    // 這個視窗內最多能連續觸發幾次摩擦（大約等於能拿到幾顆愛心）
export const RUB_COOLDOWN_MS     = 2500; // 超過連續次數上限後，要等這麼久才能開始下一輪摩擦

/* ─── 手勢辨識 helper：輕點 vs 摩擦 vs 長按（給 SinglePet / BabyPet 共用）─── */
// targeting 為 true 時（托盤已選好道具、且有多隻可選對象），任何一次按放
// 都直接視為「指定這隻當目標」，不走一般的輕點/摩擦判斷。
export function usePetGesture({ targeting, onBecomeTarget, onTap, onRub, onLongPress }) {
  const touchRef = useRef({
    startX: 0, startY: 0, startTime: 0, rubbed: false, isDown: false, lastTapAt: 0,
    burstStartAt: 0,  // 這一輪連續摩擦是從什麼時候開始算的
    burstCount: 0,    // 這一輪已經觸發過幾次摩擦了
    cooldownUntil: 0, // 觸發次數用完後，要等到這個時間點才能開始下一輪
    longPressTimer: null,  // 長按計時器；一旦偵測到摩擦就會被取消，兩種手勢互斥
    longPressFired: false, // 這次按放期間長按是否已觸發，觸發過就不再視為輕點
  });

  const onPointerDown = useCallback((e) => {
    if (touchRef.current.isDown) return; // 忽略還沒配對到 up 的重複 down
    touchRef.current.isDown = true;
    touchRef.current.startX = e.clientX;
    touchRef.current.startY = e.clientY;
    touchRef.current.startTime = Date.now();
    touchRef.current.rubbed = false;
    touchRef.current.longPressFired = false;
    // 鎖定指標：確保放開時事件一定回到這個元素身上，不會因為手指
    // 稍微移動就被瀏覽器判定成「離開了這隻寵物」而漏接 pointerup
    e.currentTarget.setPointerCapture?.(e.pointerId);

    if (!targeting && onLongPress) {
      clearTimeout(touchRef.current.longPressTimer);
      touchRef.current.longPressTimer = setTimeout(() => {
        if (touchRef.current.isDown && !touchRef.current.rubbed) {
          touchRef.current.longPressFired = true;
          onLongPress();
        }
      }, LONG_PRESS_MS);
    }
  }, [targeting, onLongPress]);

  const onPointerMove = useCallback((e) => {
    if (targeting || !touchRef.current.isDown) return;
    // 只在按下後的短暫視窗內判定摩擦，長按靜止不動不會因為時間拉長
    // 而被判成摩擦（這是造成「長按反而沒反應」的根因）
    if (Date.now() - touchRef.current.startTime > RUB_WINDOW_MS) return;

    const dx = e.clientX - touchRef.current.startX;
    const dy = e.clientY - touchRef.current.startY;
    if (Math.sqrt(dx * dx + dy * dy) <= RUB_DIST_PX) return;

    // 確定是搓動不是長按靜置：取消長按計時器
    clearTimeout(touchRef.current.longPressTimer);

    // 每次觸發後，把起始座標重設到目前位置，這樣同一次按住持續搓動時，
    // 每超過門檻距離一次就能再算一次新的摩擦，而不是整個手勢只判定一次
    touchRef.current.startX = e.clientX;
    touchRef.current.startY = e.clientY;
    touchRef.current.rubbed = true;

    const now = Date.now();
    if (now < touchRef.current.cooldownUntil) {
      EventBus.emit(Events.System.TOAST, '寵物需要休息一下～');
      return;
    }
    // 開一輪新的連續觸發視窗，或沿用還在視窗內的舊一輪
    if (now - touchRef.current.burstStartAt > RUB_BURST_WINDOW_MS) {
      touchRef.current.burstStartAt = now;
      touchRef.current.burstCount = 0;
    }
    touchRef.current.burstCount += 1;
    if (touchRef.current.burstCount > RUB_BURST_MAX) {
      touchRef.current.cooldownUntil = now + RUB_COOLDOWN_MS;
      EventBus.emit(Events.System.TOAST, '寵物需要休息一下～');
      return;
    }
    onRub();
  }, [targeting, onRub]);

  const onPointerUp = useCallback((e) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    clearTimeout(touchRef.current.longPressTimer);
    if (!touchRef.current.isDown) return; // 沒有配對的 down，忽略
    touchRef.current.isDown = false;

    if (touchRef.current.longPressFired) return; // 長按已經處理過了
    if (targeting) { onBecomeTarget(); return; }
    if (touchRef.current.rubbed) return; // move 階段已經觸發過摩擦了

    const now = Date.now();
    if (now - touchRef.current.lastTapAt < 350) return; // 避免快速連續觸發造成畫面閃爍
    touchRef.current.lastTapAt = now;
    onTap();
  }, [targeting, onBecomeTarget, onTap]);

  return { onPointerDown, onPointerMove, onPointerUp };
}