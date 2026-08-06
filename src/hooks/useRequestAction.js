/* src/hooks/useRequestAction.js */
import { useState, useCallback } from 'react';
import { EventHelper } from '@/core/events.js';
import { toast } from '@/utils/toast.js';

/**
 * 包住「EventHelper.requestOnce + loading 狀態 + 成功/失敗/逾時 toast」這個重複很多次的 pattern。
 *
 * 用法：
 *   const { run, loading } = useRequestAction();
 *   const handleBuy = () => run(Events.Shop.REQUEST_BUY_ITEM, Events.Shop.BUY_ITEM_RESULT,
 *     { id: item.id },
 *     { successMsg: '✅ 購買成功！', onSuccess: () => onClose() }
 *   );
 *
 * options：
 *   - successMsg: string | (result) => string，成功時要顯示的 toast（不給就不顯示）
 *   - failMsg:    (result) => string，失敗時的 toast，預設用 result.msg
 *   - timeoutMsg: 逾時時的 toast，預設「❌ 操作逾時，請稍後再試」
 *   - onSuccess:  (result) => void，成功時的額外動作（例如關 Modal）
 *   - isSuccess:  (result) => boolean，自訂「怎樣算成功」，預設看 result.success
 */
export function useRequestAction() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (reqEvent, resEvent, payload, options = {}) => {
    const {
      successMsg,
      failMsg = (result) => `⚠️ ${result?.msg || '操作失敗'}`,
      timeoutMsg = '❌ 操作逾時，請稍後再試',
      onSuccess,
      onError,           // 可選：失敗時的額外處理（例如表單行內錯誤訊息）
      showFailToast = true, // 設 false 可以只用 onError 顯示，不跳 toast（兩者不衝突，可以都給）
      isSuccess = (result) => result?.success !== false,
    } = options;

    setLoading(true);
    try {
      const result = await EventHelper.requestOnce(reqEvent, resEvent, payload);
      if (isSuccess(result)) {
        if (successMsg) toast(typeof successMsg === 'function' ? successMsg(result) : successMsg);
        onSuccess?.(result);
      } else {
        if (showFailToast) toast(failMsg(result));
        onError?.(result);
      }
      return result;
    } catch {
      if (showFailToast) toast(timeoutMsg);
      onError?.(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading };
}
