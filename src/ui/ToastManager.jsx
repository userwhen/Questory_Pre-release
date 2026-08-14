// src/ui/ToastManager.jsx
// 監聽 Events.System.TOAST 並在畫面上顯示通知
import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

const toastAnim = `
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.95); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.95); }
}
`;

let _toastId = 0;

const BASE_DURATION = 1800;   // 基礎顯示時間
const EXIT_DURATION = 300;    // 退場動畫時間

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  // 清除某筆 toast 的所有 timer
  const clearTimers = (id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    if (timers.current[`${id}_rm`]) {
      clearTimeout(timers.current[`${id}_rm`]);
      delete timers.current[`${id}_rm`];
    }
  };

  // 為指定 id 設定退場 + 移除 timer
  const scheduleExit = (id, duration) => {
    clearTimers(id);

    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));

      timers.current[`${id}_rm`] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        clearTimers(id);
      }, EXIT_DURATION);
    }, duration);
  };

  useEffect(() => {
    const unsub = EventBus.on(Events.System.TOAST, (msg) => {
      if (!msg) return;

      setToasts(prev => {
        // 找是否已有相同文案且尚未退場的 toast
        const existing = prev.find(t => t.msg === msg && !t.exiting);

        if (existing) {
          const duration = BASE_DURATION;   // 每次都重設回 3 秒，不再累加

          // 更新 count（可選，主要是為了計算 duration）
          const next = prev;

          // 重設該 id 的 timer
          scheduleExit(existing.id, duration);

          return next;
        }

        // 不同文案：新增
        const id = ++_toastId;
        const next = prev.length >= 3 ? prev.slice(1) : prev;
        const newToasts = [...next, { id, msg, exiting: false }];  // 拿掉 count: 1

        scheduleExit(id, BASE_DURATION);

        return newToasts;
      });
    });

    return () => {
      unsub();
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{toastAnim}</style>
      <div style={containerStyle}>
        {toasts.map((t, i) => (
          <div
            key={t.id}
            style={{
              ...toastStyle,
              animation: t.exiting
                ? 'toastOut 0.3s ease forwards'
                : 'toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
              bottom: 90 + i * 52,
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}

const containerStyle = {
  position: 'fixed',
  left: '50%',
  bottom: 0,
  zIndex: 'var(--z-toast)',
  pointerEvents: 'none',
  width: 0,
};

const toastStyle = {
  position: 'absolute',
  left: 0,
  transform: 'translateX(-50%)',
  whiteSpace: 'nowrap',
  maxWidth: 320,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  background: 'rgba(44, 26, 14, 0.92)',
  color: 'var(--text-on-dark, #f5e6cf)',
  padding: 'var(--space-xs) var(--space-md)',
  borderRadius: 50,
  fontSize: 'var(--font-body)',
  fontWeight: 600,
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid rgba(245,166,35,0.25)',
  backdropFilter: 'blur(6px)',
  fontFamily: 'inherit',
};