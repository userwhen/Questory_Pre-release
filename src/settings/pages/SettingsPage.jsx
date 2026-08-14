/* src/settings/pages/SettingsPage.jsx */
import React, { useState, useRef, useEffect } from 'react';
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
  return (
    <div style={{ width: 'var(--size-md)', height: 'var(--size-xs)', borderRadius: 'var(--radius-full)', background: checked ? 'var(--color-correct, #227A59)' : 'var(--border-input, #d5c5a8)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'var(--t-base)' }}
         onClick={onChange}>
      <div style={{ position: 'absolute', width: 'var(--size-xs)', height: 'var(--size-xs)', background: '#fff', borderRadius: '50%', top: 3, left: checked ? 21 : 3, transition: 'var(--t-base)', boxShadow: 'var(--shadow-xs)' }} />
    </div>
  );
}

/* ─── 鎖定功能的解鎖入口：Pro 按鈕＋選配鑽石購買＋成就免費解鎖提示 ───── */
function FeatureLockActions({ label, shopItem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-xs)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
        <button style={smallBtnStyle} onClick={() => EventBus.emit(Events.Settings.REQUEST_SHOW_PRO_UPSELL, { label })}>👑 Pro</button>
        {shopItem && (
          <button style={smallBtnStyle} onClick={() => EventBus.emit(Events.Settings.REQUEST_BUY_ITEM, { id: shopItem.id })}>
            💎 {shopItem.price}
          </button>
        )}
      </div>
      <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)' }}>🏆 或完成特定成就免費解鎖</div>
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
  const { unlocks, settings, subscription } = useGameStore(
    useShallow(s => ({
      unlocks: s.unlocks || {},
      settings: s.settings || {},
      subscription: s.subscription || {},
    }))
  );

  const curTheme = settings.theme || 'default';
  const isPro = !!subscription.active;

  const storyItems  = SettingsShopItems.filter(i => i.type === 'theme_story');
  const basicItems  = SettingsShopItems.filter(i => i.type === 'theme_basic');

  const renderThemeCard = item => {
    const themeKey = item.preview;
    const isActive = curTheme === themeKey;
    const isOwned  = item.currency === 'pro' ? isPro : (item.price === 0 || unlocks[item.id]);

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
          {item.currency === 'pro' ? '👑 Pro' : `💎 ${item.price}`}
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
          <SectionTitle>🎨 基礎面板</SectionTitle>
          {basicItems.map(renderThemeCard)}
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
  const { settings, unlocks, subscription } = useGameStore(
    useShallow(s => ({
      settings: s.settings || {},
      unlocks: s.unlocks || {},
      subscription: s.subscription || {},
    }))
  );

  const isPro = !!subscription.active;

  const [modal, setModal] = useState(null); // 'theme' | 'reset' | 'import'
  const [calInput, setCalInput] = useState(settings.calMax || 2000);
  const [lostFeatures, setLostFeatures] = useState(null);

  useEffect(() => EventBus.on(Events.Settings.SUBSCRIPTION_FEATURES_LOST, ({ features }) => {
    setLostFeatures(features);
  }), []);

  // 非 Pro 不應保留自訂 BGM（取消訂閱或舊存檔）：強制清掉並退回預設
  useEffect(() => {
    if (!isPro && settings.customBGM === 'custom') {
      Audio.clearCustomBGM();
    }
  }, [isPro, settings.customBGM]);

  const set = (key, val) => EventBus.emit(Events.Settings.REQUEST_APPLY_SETTINGS, { [key]: val });

  // 👉 #14：theme 為 undefined/'default' 時不可用 preview===undefined 命中 module（語言學習等）
  const themeKey = settings.theme || 'default';
  const curThemeLabel = getThemeCfg(themeKey)?.label
    ?? SettingsShopItems.find(i => i.preview === themeKey)?.name
    ?? '⚙️ 預設主題';

  const calUnlocked = !!unlocks.feature_cal || isPro;
  const strictUnlocked = !!unlocks.feature_strict || isPro;

  return (
    <div style={pageStyle}>
      <div style={scrollAreaStyle}>

        {/* ── 訂閱（PRO 保留在 Settings；上方 profile 卡已移至點擊頭像 Modal）── */}
        <SectionTitle>👑 Pro 訂閱</SectionTitle>
        <div style={cardStyle}>
          <SettingRow
            icon={isPro ? '👑' : '🔓'}
            label={isPro ? (import.meta.env.DEV ? 'Pro 已啟用（測試模式）' : 'Pro 已啟用') : '尚未訂閱'}
            hint={isPro ? '熱量追蹤、嚴格模式、專屬主題皆已解鎖' : '訂閱後解鎖熱量追蹤、嚴格模式與專屬主題'}
          >
            {/* 這顆按鈕直接免費開通/取消 Pro，只給開發測試用。正式訂閱購買流程
                （跟 IAP 一起串好之後）要另外做一個真的走金流的入口，
                不能讓這顆測試按鈕留在正式環境被玩家點到。 */}
            {import.meta.env.DEV && (
              <button
                style={{
                  ...smallBtnStyle,
                  background: isPro ? 'var(--color-danger-soft, #fee2e2)' : 'var(--color-gold, #f5a623)',
                  color: isPro ? 'var(--color-danger, #c0392b)' : '#fff',
                  border: isPro ? '1px solid var(--color-danger, #c0392b)' : 'none',
                }}
                onClick={() => EventBus.emit(Events.Settings.REQUEST_TOGGLE_MOCK_SUB)}
              >
                {isPro ? '取消訂閱' : '🧪 開通訂閱'}
              </button>
            )}
          </SettingRow>
        </div>

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
          <SettingRow icon="🔥" label="卡路里追蹤" hint="記錄每日熱量攝取與消耗">
            {calUnlocked
              ? <Toggle checked={!!settings.calMode} onChange={() => set('calMode', !settings.calMode)} />
              : <FeatureLockActions label="卡路里追蹤" />}
          </SettingRow>
          {settings.calMode && (
            <div style={{ padding: 'var(--space-xs) var(--space-sm)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)', marginBottom: 'var(--space-xs)' }}>每日目標 (Kcal)</div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                <input type="number" style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  value={calInput} onChange={e => setCalInput(e.target.value)} />
                <button style={{ ...btnStyle, padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--font-body)' }}
                  onClick={() => EventBus.emit(Events.Settings.REQUEST_SAVE_CAL_TARGET, { value: calInput })}>儲存</button>
              </div>
            </div>
          )}
          <SettingRow icon="⚡" label="嚴格模式" hint="任務失敗將回收已獲得獎勵">
            {strictUnlocked
              ? <Toggle checked={!!settings.strictMode} onChange={() => set('strictMode', !settings.strictMode)} />
              : <FeatureLockActions label="嚴格模式" />}
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

          <SettingRow icon="🎵" label="背景音樂">
            <Toggle
              checked={!!settings.musicEnabled}
              onChange={() => {
                const next = !settings.musicEnabled;
                set('musicEnabled', next);
                next ? Audio.playGameBGM() : Audio.stopCustomBGM();
              }}
            />
          </SettingRow>
          {settings.musicEnabled && (
            <div style={{ padding: 'var(--space-xs) var(--space-sm) var(--space-sm)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                <span style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', minWidth: 'var(--size-lg)' }}>音樂音量</span>
                <input type="range" min={0} max={100} value={Math.round((settings.musicVolume ?? 0.5) * 100)}
                  onChange={e => { const v = Number(e.target.value) / 100; set('musicVolume', v); Audio.setMusicVolume(v); }}
                  style={{ flex: 1, accentColor: 'var(--color-gold, #f5a623)' }} />
                <span style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', minWidth: 'var(--size-sm)', textAlign: 'right' }}>
                  {Math.round((settings.musicVolume ?? 0.5) * 100)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)' }}>
                  {isPro
                    ? (settings.customBGM === 'custom' ? '✅ 已上傳自訂音樂' : '尚未上傳自訂音樂')
                    : '👑 自訂音樂為 Pro 專屬'}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  {isPro ? (
                    <>
                      {settings.customBGM === 'custom' && (
                        <button style={smallBtnStyle} onClick={() => Audio.clearCustomBGM()}>清除</button>
                      )}
                      <button style={smallBtnStyle} onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'audio/*';
                        input.onchange = e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          Audio.uploadCustomBGM(file);
                        };
                        input.click();
                      }}>上傳</button>
                    </>
                  ) : (
                    <button
                      style={smallBtnStyle}
                      onClick={() => EventBus.emit(Events.Settings.REQUEST_SHOW_PRO_UPSELL, { label: '自訂背景音樂' })}
                    >
                      👑 Pro
                    </button>
                  )}
                </div>
              </div>
              {isPro && (
                <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)', marginTop: 'var(--space-xs)' }}>
                  💾 自訂音樂會保留在裝置上，重新整理或重開 App 後會自動接續播放（無痕模式等限制儲存的環境除外）
                </div>
              )}
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
      {lostFeatures && (
        <Modal
          title="⚠️ 訂閱已取消"
          onClose={() => setLostFeatures(null)}
          maxWidth={320}
          footer={<button style={{ ...btnStyle, width: '100%' }} onClick={() => setLostFeatures(null)}>知道了</button>}
        >
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text, #2c1a0e)', marginBottom: 'var(--space-xs)' }}>
            以下功能因未另外買斷，已一併鎖住：
          </div>
          <ul style={{ margin: 0, paddingLeft: 'var(--space-lg)' }}>
            {lostFeatures.map(f => (
              <li key={f} style={{ fontSize: 'var(--font-body)', color: 'var(--text-muted, #8c6e52)', marginBottom: 'var(--space-xs)' }}>{f}</li>
            ))}
          </ul>
        </Modal>
      )}
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
