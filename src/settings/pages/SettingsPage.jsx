/* src/settings/pages/SettingsPage.jsx */
import React, { useState, useRef } from 'react';
import { useGameStore } from '@/core/state.js';
import { useShallow } from 'zustand/react/shallow';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import { SettingsShopItems, getThemeCfg } from '@/data/theme_config.js';
import { Notification } from '@/plugins/notification.js';
import ConfirmDialog from '@/ui/ConfirmDialog.jsx';
import Modal from '@/ui/Modal.jsx';
import { labelStyle, inputStyle, btnStyle } from '@/styles/modalStyles.js';
import { Audio } from '@/plugins/audio.js';

/* ─── Toggle 開關 ────────────────────────────────────────── */
function Toggle({ checked, onChange, locked }) {
  if (locked) return <span style={lockedBadgeStyle}>🔒 未解鎖</span>;

  // 將間距提取為常數，統一管理不寫死
  const TOGGLE_PADDING = 3; 

  return (
    <div 
      style={{ 
        width: 'var(--size-md)', 
        height: 'var(--size-xs)', 
        borderRadius: 'var(--radius-full)', 
        background: checked ? 'var(--color-correct, #227A59)' : 'var(--border-input, #d5c5a8)', 
        cursor: 'pointer', 
        flexShrink: 0, 
        transition: 'var(--t-base)',
        // 核心 1：用 padding 與 border-box，讓軌道自動向內擠壓空間
        boxSizing: 'border-box',
        padding: TOGGLE_PADDING,
        display: 'flex',
        alignItems: 'center',
      }}
      onClick={onChange}
    >
      <div 
        style={{ 
          height: '100%', 
          // 核心 2：自動保持正圓形（寬度永遠 = 高度）
          aspectRatio: '1 / 1', 
          background: '#fff', 
          borderRadius: '50%', 
          boxShadow: 'var(--shadow-xs)',
          transition: 'var(--t-base)', 
          // 核心 3：極致優雅的平移算式（完全不需要扣除 padding）
          transform: checked ? 'translateX(calc(var(--size-md) - var(--size-xs)))' : 'translateX(0)',
        }} 
      />
    </div>
  );
}

/* ─── 設定行 ─────────────────────────────────────────────── */
function SettingRow({ icon, label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-sm)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--text, #2c1a0e)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          {icon && <span>{icon}</span>}{label}
        </div>
        {hint && <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ marginLeft: 'var(--space-sm)', flexShrink: 0 }}>{children}</div>
    </div>
  );
}

/* ─── 分節標題 ───────────────────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <div style={{ padding: 'var(--space-sm) var(--space-sm) var(--space-xs)', fontSize: 'var(--font-caption)', fontWeight: 800, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

/* ─── 主題商店 Modal ─────────────────────────────────────── */
function ThemeShopModal({ onClose }) {
  const { unlocks, settings } = useGameStore(
    useShallow(s => ({
      unlocks: s.unlocks || {},
      settings: s.settings || {},
    }))
  );

  const curTheme = settings.theme || 'default';

  // 初版裁切：Pro限定的「基礎面板」主題先隱藏（theme_config.js 資料原封不動留著，
  // 等訂閱系統回歸時，只要把 basicItems 這段 UI 加回來就好）。
  const storyItems  = SettingsShopItems.filter(i => i.type === 'theme_story');

  const renderThemeCard = item => {
    const themeKey = item.preview;
    const isActive = curTheme === themeKey;
    const isOwned  = item.price === 0 || unlocks[item.id];

    let actionBtn;
    if (isActive) {
      actionBtn = (
        <button style={{ ...smallBtnStyle, background: 'var(--color-danger-soft, #fee2e2)', color: 'var(--color-danger, #c0392b)', border: '1px solid var(--color-danger, #c0392b)' }}
          onClick={() => EventBus.emit(Events.Settings.REQUEST_APPLY_THEME, { themeKey: 'default' })}>卸下</button>
      );
    } else if (isOwned) {
      actionBtn = (
        <button style={{ ...btnStyle, padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--font-body)' }}
          onClick={() => { EventBus.emit(Events.Settings.REQUEST_APPLY_THEME, { themeKey }); onClose(); }}>套用</button>
      );
    } else {
      actionBtn = (
        <button style={{ ...smallBtnStyle }}
          onClick={() => EventBus.emit(Events.Settings.REQUEST_BUY_ITEM, { id: item.id })}>
          💎 {item.price}
        </button>
      );
    }

    return (
      <div key={item.id} style={{ ...themeCardStyle, border: isActive ? '2px solid var(--color-gold, #f5a623)' : '1px solid var(--border, rgba(0,0,0,0.09))' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            {item.name}
            {item.badge && <span style={{ fontSize: 'var(--font-caption)', background: item.badge === 'HOT' ? 'var(--color-danger, #c0392b)' : item.badge === 'NEW' ? 'var(--color-correct, #227A59)' : 'var(--color-gold, #f5a623)', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-xs)', fontWeight: 900 }}>{item.badge}</span>}
            {isActive && <span style={{ fontSize: 'var(--font-caption)', color: 'var(--color-gold, #f5a623)', fontWeight: 700 }}>✓ 使用中</span>}
          </div>
          <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', lineHeight: 1.4 }}>{item.desc}</div>
        </div>
        {actionBtn}
      </div>
    );
  };

  return (
    <Modal title="🛒 主題商店" onClose={onClose} bodyStyle={{ padding: 'var(--space-sm) var(--space-sm)' }}>
          <SectionTitle>✨ 沉浸世界</SectionTitle>
          {storyItems.map(renderThemeCard)}
          <div style={{ height: 'var(--size-xs)' }} />
    </Modal>
  );
}

/* ─── 匯入 Modal ─────────────────────────────────────────── */
function ImportModal({ onClose }) {
  const fileRef = useRef(null);
  const handleImport = () => {
    const file = fileRef.current?.files?.[0];
    EventBus.emit(Events.Settings.REQUEST_IMPORT_SAVE, { file });
  };
  return (
    <Modal
      title="📥 讀取存檔"
      onClose={onClose}
      maxWidth={340}
      footer={
        <>
          <button style={{ ...btnStyle, background: 'var(--bg-card, #fff)', color: 'var(--text, #2c1a0e)', border: '1.5px solid var(--border-input, #d5c5a8)', boxShadow: 'none' }} onClick={onClose}>取消</button>
          <button style={{ ...btnStyle, flex: 1 }} onClick={handleImport}>讀取</button>
        </>
      }
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--size-sm)', marginBottom: 'var(--space-sm)' }}>📥</div>
        <div style={{ fontWeight: 700, marginBottom: 'var(--space-sm)', color: 'var(--text, #2c1a0e)' }}>請選擇 .json 存檔檔案</div>
        <input ref={fileRef} type="file" accept=".json" style={{ width: '100%', padding: 'var(--space-xs)', border: '1px dashed var(--border, rgba(0,0,0,0.09))', borderRadius: 'var(--radius-sm)', background: 'var(--bg-box)', color: 'var(--text, #2c1a0e)' }} />
      </div>
    </Modal>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────────── */
export default function SettingsPage() {
  const { settings } = useGameStore(
    useShallow(s => ({
      settings: s.settings || {},
    }))
  );

  const [modal, setModal] = useState(null); // 'theme' | 'reset' | 'import'

  const set = (key, val) => EventBus.emit(Events.Settings.REQUEST_APPLY_SETTINGS, { [key]: val });

  // 👉 #14：theme 為 undefined/'default' 時不可用 preview===undefined 命中 module（語言學習等）
  const themeKey = settings.theme || 'default';
  const curThemeLabel = getThemeCfg(themeKey)?.label
    ?? SettingsShopItems.find(i => i.preview === themeKey)?.name
    ?? '⚙️ 預設主題';

  return (
    <div style={pageStyle}>
      <div style={scrollAreaStyle}>

        {/* ── 外觀主題 ── */}
        <SectionTitle>🎨 外觀主題</SectionTitle>
        <div style={cardStyle}>
          <SettingRow icon="🖌️" label="目前主題" hint={curThemeLabel}>
            <button style={smallBtnStyle} onClick={() => setModal('theme')}>更換</button>
          </SettingRow>
        </div>

        {/* ── 字體大小 ── */}
        <SectionTitle>🔍 介面字體大小</SectionTitle>
        <div style={{ ...cardStyle, padding: 'var(--space-xs)', display: 'flex', gap: 'var(--space-xs)' }}>
          {[
            { val: '14px', label: '小' },
            { val: '16px', label: '中' },
            { val: '18px', label: '大' },
          ].map(opt => {
            const isActive = (settings.fontSize || '16px') === opt.val;
            return (
              <button
                key={opt.val}
                style={{
                  ...smallBtnStyle,
                  flex: 1,
                  background: isActive ? 'var(--color-correct, #227A59)' : 'var(--bg-card, #fff)',
                  color: isActive ? '#fff' : 'var(--text, #2c1a0e)',
                  border: isActive ? 'none' : '1.5px solid var(--border-input, #d5c5a8)',
                }}
                onClick={() => set('fontSize', opt.val)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* ── 遊戲模式 ── */}
        <SectionTitle>🎮 遊戲模式</SectionTitle>
        <div style={cardStyle}>
          <SettingRow icon="📊" label="基礎模式" hint="隱藏大廳，直接進入任務頁">
            <Toggle
              checked={settings.mode === 'basic'}
              onChange={() => set('mode', settings.mode === 'basic' ? 'adventurer' : 'basic')}
            />
          </SettingRow>
        </div>

        {/* ── 音效 ── */}
        <SectionTitle>🔊 音效設定</SectionTitle>
        <div style={cardStyle}>
          <SettingRow icon="🔊" label="音效">
            <Toggle checked={settings.soundEnabled !== false} onChange={() => set('soundEnabled', settings.soundEnabled === false)} />
          </SettingRow>
          {settings.soundEnabled !== false && (
            <div style={{ padding: 'var(--space-xs) var(--space-sm) var(--space-sm)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <span style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', minWidth: 'var(--size-lg)' }}>音效音量</span>
                <input type="range" min={0} max={100} value={Math.round((settings.volume ?? 0.7) * 100)}
                  onChange={e => { const v = Number(e.target.value) / 100; set('volume', v); Audio.setVolume(v); }}
                  style={{ flex: 1, accentColor: 'var(--color-gold, #f5a623)' }} />
                <span style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', minWidth: 'var(--size-sm)', textAlign: 'right' }}>
                  {Math.round((settings.volume ?? 0.7) * 100)}%
                </span>
              </div>
            </div>
          )}

          <SettingRow icon="📳" label="震動">
            <Toggle checked={settings.vibrationEnabled !== false} onChange={() => set('vibrationEnabled', settings.vibrationEnabled === false)} />
          </SettingRow>
        </div>

        {/* ── 通知 ── */}
        <SectionTitle>🔔 通知設定</SectionTitle>
        <div style={cardStyle}>
          <SettingRow icon="🔔" label="推播通知">
            <Toggle
              checked={!!settings.notificationEnabled}
              onChange={async () => {
                const next = !settings.notificationEnabled;
                if (next) {
                  // 👉 #11：網頁仍允許切換並寫入 state，方便測試排錯；真機才走權限＋排程
                  if (typeof Capacitor === 'undefined') {
                    set('notificationEnabled', true);
                    EventBus.emit(Events.System.TOAST, '⚠️ 網頁僅供測試開關，真機才會真正排程通知');
                    return;
                  }
                  const granted = await Notification.requestPermission();
                  if (!granted) return;
                  await Notification.createChannels();
                  set('notificationEnabled', true);
                  await Notification.scheduleAll();
                } else {
                  set('notificationEnabled', false);
                  await Notification.disableAll();
                }
              }}
            />
          </SettingRow>
          {settings.notificationEnabled && (
            <div style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)' }}>⏰ 截止日提醒</div>
                  <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)' }}>任務截止當天發送提醒</div>
                </div>
                <Toggle
                  checked={settings.notifyDeadline !== false}
                  onChange={() => { set('notifyDeadline', settings.notifyDeadline === false); Notification.scheduleAll(); }}
                />
              </div>
              {[
                { label: '📋 每日任務提醒', hKey: 'notifyDailyHour', mKey: 'notifyDailyMinute', defH: 9, defM: 0 },
                { label: '🔥 連續天數警告', hKey: 'notifyStreakHour', mKey: 'notifyStreakMinute', defH: 21, defM: 0 },
              ].map(({ label, hKey, mKey, defH, defM }) => (
                <div key={hKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                  <div style={{ fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <input type="number" min={0} max={23}
                      style={{ ...inputStyle, width: 'var(--size-md)', textAlign: 'center', marginBottom: 0, padding: 'var(--space-xs) var(--space-xs)' }}
                      defaultValue={settings[hKey] ?? defH}
                      onChange={e => { set(hKey, parseInt(e.target.value)); Notification.scheduleAll(); }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-muted, #8c6e52)' }}>:</span>
                    <input type="number" min={0} max={59}
                      style={{ ...inputStyle, width: 'var(--size-md)', textAlign: 'center', marginBottom: 0, padding: 'var(--space-xs) var(--space-xs)' }}
                      defaultValue={settings[mKey] ?? defM}
                      onChange={e => { set(mKey, parseInt(e.target.value)); Notification.scheduleAll(); }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 存檔管理 ── */}
        <SectionTitle>💾 存檔管理</SectionTitle>
        <div style={{ ...cardStyle, border: '1px solid var(--color-danger, #c0392b)', background: 'var(--color-danger-soft, #fee2e2)' }}>
          <div style={{ padding: 'var(--space-sm) var(--space-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)' }}>
            <button style={{ ...btnStyle, background: 'var(--bg-card, #fff)', color: 'var(--text, #2c1a0e)', border: '1.5px solid var(--border-input, #d5c5a8)', boxShadow: 'none', fontSize: 'var(--font-body)', padding: 'var(--space-xs)' }}
              onClick={() => setModal('import')}>📥 匯入存檔</button>
            <button style={{ ...btnStyle, background: 'var(--bg-card, #fff)', color: 'var(--text, #2c1a0e)', border: '1.5px solid var(--border-input, #d5c5a8)', boxShadow: 'none', fontSize: 'var(--font-body)', padding: 'var(--space-xs)' }}
              onClick={() => EventBus.emit(Events.Settings.REQUEST_EXPORT_SAVE)}>📤 匯出存檔</button>
          </div>
          <div style={{ padding: '0 var(--space-sm) var(--space-sm)' }}>
            <button style={{ ...btnStyle, background: 'var(--color-danger, #c0392b)', border: 'none', width: '100%', fontSize: 'var(--font-body)' }}
              onClick={() => setModal('reset')}>⚠️ 重置所有資料</button>
          </div>
        </div>

        <div style={{ height: 'var(--size-xl)' }} />
      </div>

      {modal === 'theme'  && <ThemeShopModal onClose={() => setModal(null)} />}
      {modal === 'reset'  && (
        <ConfirmDialog
          icon="⚠️"
          message="確定要刪除所有進度嗎？"
          subMessage="此操作無法復原。"
          confirmText="確定重置"
          onConfirm={() => { EventBus.emit(Events.Settings.REQUEST_PERFORM_RESET); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'import' && <ImportModal    onClose={() => setModal(null)} />}
    </div>
  );
}

/* ─── 樣式 ──────────────────────────────── */
const pageStyle        = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
const scrollAreaStyle  = { flex: 1, overflowY: 'auto', overflowX: 'hidden' };
const cardStyle        = { background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', margin: '0 var(--space-sm) var(--space-xs)', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', overflow: 'hidden' };
const smallBtnStyle    = { padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-xs)', fontWeight: 700, fontSize: 'var(--font-body)', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)', whiteSpace: 'nowrap' };
const lockedBadgeStyle = { fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)', background: 'var(--bg-box, rgba(0,0,0,0.035))', padding: '3px 8px', borderRadius: 'var(--radius-xs)' };
const themeCardStyle   = { display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm)', marginBottom: 'var(--space-xs)', background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border, rgba(0,0,0,0.09))' };
