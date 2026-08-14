/* src/task/components/QuickNoteModal.jsx */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import Modal from '@/ui/Modal.jsx';
import { parseQuickText } from '@/task/utils/parseQuickText.js';
import {
  labelStyle, inputStyle, btnStyle,
} from '@/task/components/TaskStyles.js';

const DRAFT_KEY = 'SQ_QUICK_DRAFT';

const helpTextStyle = {
  fontSize: 'var(--font-body)',
  color: 'var(--text-muted)',
  marginBottom: 'var(--space-sm)',
  background: 'var(--bg-box)',
  padding: 'var(--space-xs)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  lineHeight: 1.55,
};

/**
 * 隨手記：自由文字 → 解析 title / desc / subs → 直接 REQUEST_ADD
 * 草稿：localStorage SQ_QUICK_DRAFT；按「儲存」寫入，關閉／卸載時也自動寫入（規格 A）
 */
export default function QuickNoteModal({ onClose }) {
  const [text, setText] = useState('');
  const textRef = useRef(text);
  textRef.current = text;
  /** 生成成功後不寫回草稿 */
  const skipAutoSaveRef = useRef(false);

  const writeDraft = useCallback((value) => {
    try {
      localStorage.setItem(DRAFT_KEY, value ?? '');
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }, []);

  // 開啟讀草稿；卸載時自動存（硬體返回只 unmount 也會走到）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY) || '';
      setText(saved);
    } catch {
      setText('');
    }
    return () => {
      if (!skipAutoSaveRef.current) {
        writeDraft(textRef.current);
      }
    };
  }, [writeDraft]);

  const handleClose = useCallback(() => {
    if (!skipAutoSaveRef.current) {
      writeDraft(text);
    }
    onClose?.();
  }, [text, writeDraft, onClose]);

  const handleSaveDraft = useCallback(() => {
    writeDraft(text);
    EventBus.emit(Events.System.TOAST, '💾 隨手記已暫存');
  }, [text, writeDraft]);

  const handleGenerate = useCallback(() => {
    const raw = (text || '').trim();
    if (!raw) {
      EventBus.emit(Events.System.TOAST, '⚠️ 請輸入內容');
      return;
    }

    const parsed = parseQuickText(text);
    if (!parsed || !parsed.title?.trim()) {
      EventBus.emit(Events.System.TOAST, '⚠️ 請輸入內容');
      return;
    }

    EventBus.emit(Events.Task.REQUEST_ADD, {
      title: parsed.title.trim(),
      desc: parsed.desc || '',
      subs: parsed.subs || [],
      type: 'normal',
    });

    skipAutoSaveRef.current = true;
    clearDraft();
    setText('');
    EventBus.emit(Events.System.TOAST, '✅ 任務已建立');
    onClose?.();
  }, [text, clearDraft, onClose]);

  return (
    <Modal
      title="📝 隨手記"
      onClose={handleClose}
      footer={
        <>
          <button
            type="button"
            style={{
              ...btnStyle,
              background: 'var(--bg-card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              flex: 1,
            }}
            onClick={handleSaveDraft}
          >
            儲存
          </button>
          <button
            type="button"
            style={{ ...btnStyle, flex: 2 }}
            onClick={handleGenerate}
          >
            生成任務
          </button>
        </>
      }
    >
      <div style={helpTextStyle}>
        <div>
          <b style={{ color: 'var(--text)' }}>第一行</b> → 標題（也可寫{' '}
          <b style={{ color: 'var(--text)' }}>/標題</b>）
        </div>
        <div>
          <b style={{ color: 'var(--text)' }}>**</b> 備註（例如: **要去巷口那家）
        </div>
        <div>
          <b style={{ color: 'var(--text)' }}>1.</b> 子任務（例如: 1.領錢）
        </div>
        <div style={{ marginTop: 'var(--space-xs)' }}>
          💡 不小心關閉也不怕，草稿會自動備份～
        </div>
      </div>

      <label style={labelStyle}>隨手記</label>
      <textarea
        className="inp"
        style={{
          ...inputStyle,
          width: '100%',
          height: 200,
          resize: 'none',
          boxSizing: 'border-box',
        }}
        placeholder="在此輸入隨手記…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </Modal>
  );
}
