/* src/hooks/useConfirm.jsx */
import { useState, useCallback } from 'react';
import ConfirmDialog from '@/ui/ConfirmDialog.jsx';

// ── 統一「刪除前跳確認、可取消」的樣板 ──────────────────
// 用法：
//   const [askConfirm, confirmDialog] = useConfirm();
//   askConfirm('確定要刪除嗎？', () => doDelete());
//   // JSX 最後放 {confirmDialog}
export function useConfirm() {
  const [pending, setPending] = useState(null); // { message, confirmText, onConfirm } | null

  const askConfirm = useCallback((message, onConfirm, confirmText = '確定刪除') => {
    setPending({ message, confirmText, onConfirm });
  }, []);

  const handleConfirm = () => {
    pending?.onConfirm?.();
    setPending(null);
  };

  const confirmDialog = pending ? (
    <ConfirmDialog
      message={pending.message}
      confirmText={pending.confirmText}
      onConfirm={handleConfirm}
      onCancel={() => setPending(null)}
    />
  ) : null;

  return [askConfirm, confirmDialog];
}