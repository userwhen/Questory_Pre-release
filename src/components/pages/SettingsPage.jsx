/* src/components/pages/SettingsPage.jsx */
import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/core/state.js';
import { useShallow } from 'zustand/react/shallow'; // 👉 引入 Zustand 官方淺層比較工具
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
// 👉 修正：移除未導出的 ThemeConfig，改為 getThemeCfg
import { SettingsShopItems, getThemeCfg } from '@/data/theme_config.js';
import { Notification } from '@/plugins/notification.js';
import ConfirmDialog from '@/components/ui/ConfirmDialog.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { labelStyle, inputStyle, btnStyle } from '@/styles/modalStyles.js';
import { Audio } from '@/plugins/audio.js';

/* ─── Toggle 開關 ────────────────────────────────────────── */
function Toggle({ checked, onChange, locked }) {
  if (locked) return <span style={lockedBadgeStyle}>🔒 未解鎖</span>;
  return (
    <div style={{ width: 42, height: 24, borderRadius: 9999, background: checked ? 'var(--color-correct, #227A59)' : 'var(--border-input, #d5c5a8)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: '0.2s' }}
         onClick={onChange}>
      <div style={{ position: 'absolute', width: 18, height: 18, background: '#fff', borderRadius: '50%', top: 3, left: checked ? 21 : 3, transition: '0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

/* ─── 鎖定功能的解鎖入口：Pro 按鈕（樣式同主題商店的 Pro 按鈕）＋
   選配鑽石購買（只有帶 shopItem 的功能才顯示，例如 Pet/Learning）＋
   成就免費解鎖提示（目前純文字，成就系統做出來後不用動這裡）───── */
function FeatureLockActions({ label, shopItem }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={smallBtnStyle} onClick={() => EventBus.emit(Events.Settings.REQUEST_SHOW_PRO_UPSELL, { label })}>👑 Pro</button>
        {shopItem && (
          <button style={smallBtnStyle} onClick={() => EventBus.emit(Events.Settings.REQUEST_BUY_ITEM, { id: shopItem.id })}>
            💎 {shopItem.price}
          </button>
        )}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-ghost, #9C7B5B)' }}>🏆 或完成特定成就免費解鎖</div>
    </div>
  );
}

/* ─── 設定行 ─────────────────────────────────────────────── */
function SettingRow({ icon, label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text, #2c1a0e)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && <span>{icon}</span>}{label}
        </div>
        {hint && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8c6e52)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ marginLeft: 12, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

/* ─── 分節標題 ───────────────────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <div style={{ padding: '14px 14px 6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted, #8c6e52)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

/* ─── 主題商店 Modal ─────────────────────────────────────── */
function ThemeShopModal({ onClose }) {
  // 👉 內層 Modal 也可以同步優化訂閱機制
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
        <button style={{ ...smallBtnStyle, background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none' }}
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
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text, #2c1a0e)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.name}
            {item.badge && <span style={{ fontSize: '0.6rem', background: item.badge === 'HOT' ? 'var(--color-danger, #c0392b)' : item.badge === 'NEW' ? 'var(--color-correct, #227A59)' : 'var(--color-gold, #f5a623)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>{item.badge}</span>}
            {isActive && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold, #f5a623)', fontWeight: 700 }}>✓ 使用中</span>}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #8c6e52)', lineHeight: 1.4 }}>{item.desc}</div>
        </div>
        {actionBtn}
      </div>
    );
  };

  return (
    <Modal title="🛒 主題商店" onClose={onClose} bodyStyle={{ padding: '12px 14px' }}>
          <SectionTitle>✨ 沉浸世界</SectionTitle>
          {storyItems.map(renderThemeCard)}
          <SectionTitle>🎨 基礎面板</SectionTitle>
          {basicItems.map(renderThemeCard)}
          <div style={{ height: 20 }} />
    </Modal>
  );
}

/* ─── 重置確認 Modal ─────────────────────────────────────── */

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
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📥</div>
        <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text, #2c1a0e)' }}>請選擇 .json 存檔檔案</div>
        <input ref={fileRef} type="file" accept=".json" style={{ width: '100%', padding: 8, border: '1px dashed var(--border, rgba(0,0,0,0.09))', borderRadius: 8, background: 'var(--bg-box)', color: 'var(--text, #2c1a0e)' }} />
      </div>
    </Modal>
  );
}

/* ─── 主頁面 ─────────────────────────────────────────────── */
export default function SettingsPage() {
  // 👉 修正：整合 Zustand 訂閱，並使用 useShallow 確保性能
  const { settings, unlocks, lv, loginStreak, totalLoginDays, subscription } = useGameStore(
    useShallow(s => ({
      settings: s.settings || {},
      unlocks: s.unlocks || {},
      lv: s.lv || 1,
      loginStreak: s.loginStreak || 0,
      totalLoginDays: s.totalLoginDays || 0,
      subscription: s.subscription || {},
    }))
  );

  const isPro = !!subscription.active; // 訂閱期間（含測試假訂閱）：Pro 主題 + 熱量追蹤 + 嚴格模式全部解鎖

  const [modal, setModal] = useState(null); // 'theme' | 'reset' | 'import' | 'petOff'
  const [calInput, setCalInput] = useState(settings.calMax || 2000);
  const [lostFeatures, setLostFeatures] = useState(null); // 訂閱到期/取消時，列出被鎖住的功能清單

  useEffect(() => EventBus.on(Events.Settings.SUBSCRIPTION_FEATURES_LOST, ({ features }) => {
    setLostFeatures(features);
  }), []);

  const set = (key, val) => EventBus.emit(Events.Settings.REQUEST_APPLY_SETTINGS, { [key]: val });

  // 👉 修正：改用 getThemeCfg 純函式安全取得 theme 物件中的 label 屬性
    const curThemeLabel = getThemeCfg(settings.theme || 'default')?.label
    ?? SettingsShopItems.find(i => i.preview === settings.theme)?.name
    ?? '⚙️ 預設主題';

  // 遊戲模式鎖定功能：訂閱期間（含測試假訂閱）全部自動解鎖，非訂閱則各自看 unlocks
  const petItem = SettingsShopItems.find(i => i.id === 'module_pet');
  const learningItem = SettingsShopItems.find(i => i.id === 'learning');
  const calUnlocked = !!unlocks.feature_cal || isPro;
  const strictUnlocked = !!unlocks.feature_strict || isPro;
  const petUnlocked = !!unlocks.module_pet || isPro;
  const learningUnlocked = !!unlocks.learning || isPro;

  return (
    <div style={pageStyle}>
      <div style={scrollAreaStyle}>

        {/* ── 玩家資訊 ── */}
        <div style={profileCardStyle}>
          <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🧙</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-on-dark, #f5e6cf)' }}>Lv.{lv} 冒險者</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold, #f5a623)' }}>{loginStreak}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>連續天數</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-gold, #f5a623)' }}>{totalLoginDays}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>累計登入</div>
            </div>
          </div>
        </div>

        {/* ── 訂閱（測試按鈕：現在按下去直接解鎖，之後串真正 IAP 後改成付款成功才觸發）── */}
        <SectionTitle>👑 Pro 訂閱</SectionTitle>
        <div style={cardStyle}>
          <SettingRow
            icon={isPro ? '👑' : '🔓'}
            label={isPro ? 'Pro 已啟用（測試模式）' : '尚未訂閱'}
            hint={isPro ? '熱量追蹤、嚴格模式、專屬主題皆已解鎖' : '訂閱後解鎖熱量追蹤、嚴格模式與專屬主題'}
          >
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
          </SettingRow>
        </div>

        {/* ── 外觀主題 ── */}
        <SectionTitle>🎨 外觀主題</SectionTitle>
        <div style={cardStyle}>
          <SettingRow icon="🖌️" label="目前主題" hint={curThemeLabel}>
            <button style={smallBtnStyle} onClick={() => setModal('theme')}>更換</button>
          </SettingRow>
        </div>

        {/* ── 字體大小（按鈕先裝上，套用細節之後再調） ── */}
        <SectionTitle>🔍 介面字體大小</SectionTitle>
        <div style={{ ...cardStyle, padding: 10, display: 'flex', gap: 8 }}>
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
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 6 }}>每日目標 (Kcal)</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  value={calInput} onChange={e => setCalInput(e.target.value)} />
                <button style={{ ...smallBtnStyle, background: 'var(--color-correct, #227A59)', color: '#fff', border: 'none' }}
                  onClick={() => EventBus.emit(Events.Settings.REQUEST_SAVE_CAL_TARGET, { value: calInput })}>儲存</button>
              </div>
            </div>
          )}
          <SettingRow icon="⚡" label="嚴格模式" hint="任務失敗將回收已獲得獎勵">
            {strictUnlocked
              ? <Toggle checked={!!settings.strictMode} onChange={() => set('strictMode', !settings.strictMode)} />
              : <FeatureLockActions label="嚴格模式" />}
          </SettingRow>
          <SettingRow icon="🐾" label="寵物陪伴系統" hint={petItem?.desc ?? '解鎖大廳專屬寵物與互動功能'}>
            {petUnlocked
              ? <Toggle
                  checked={settings.module_pet_active !== false}
                  onChange={() => {
                    // 關閉前要跳確認（會清空當前寵物）；開啟不用，直接切
                    if (settings.module_pet_active !== false) setModal('petOff');
                    else EventBus.emit(Events.Settings.REQUEST_TOGGLE_MODULE, { id: 'module_pet' });
                  }}
                />
              : <FeatureLockActions label="寵物陪伴系統" shopItem={petItem} />}
          </SettingRow>
          <SettingRow icon="📚" label="語言學習模組" hint={learningItem?.desc ?? '解鎖多語言劇情與單字替換功能'}>
            {learningUnlocked
              ? <Toggle checked={settings.learningMode !== false} onChange={() => set('learningMode', settings.learningMode === false)} />
              : <FeatureLockActions label="語言學習模組" shopItem={learningItem} />}
          </SettingRow>
        </div>

        {/* ── 音效 ── */}
        <SectionTitle>🔊 音效設定</SectionTitle>
        <div style={cardStyle}>
          <SettingRow icon="🔊" label="音效">
            <Toggle checked={settings.soundEnabled !== false} onChange={() => set('soundEnabled', settings.soundEnabled === false)} />
          </SettingRow>
          {settings.soundEnabled !== false && (
            <div style={{ padding: '6px 14px 12px', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', minWidth: 60 }}>音效音量</span>
                <input type="range" min={0} max={100} value={Math.round((settings.volume ?? 0.7) * 100)}
                  onChange={e => { const v = Number(e.target.value) / 100; set('volume', v); Audio.setVolume(v); }}
                  style={{ flex: 1, accentColor: 'var(--color-gold, #f5a623)' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', minWidth: 32, textAlign: 'right' }}>
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
            <div style={{ padding: '6px 14px 12px', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', minWidth: 60 }}>音樂音量</span>
                <input type="range" min={0} max={100} value={Math.round((settings.musicVolume ?? 0.5) * 100)}
                  onChange={e => { const v = Number(e.target.value) / 100; set('musicVolume', v); Audio.setMusicVolume(v); }}
                  style={{ flex: 1, accentColor: 'var(--color-gold, #f5a623)' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', minWidth: 32, textAlign: 'right' }}>
                  {Math.round((settings.musicVolume ?? 0.5) * 100)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)' }}>
                  {settings.customBGM === 'custom' ? '✅ 已上傳自訂音樂' : '尚未上傳自訂音樂'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
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
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-ghost, #9C7B5B)', marginTop: 6 }}>
                💾 自訂音樂會保留在裝置上，重新整理或重開 App 後會自動接續播放（無痕模式等限制儲存的環境除外）
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
                  // 開啟：先請求權限
                  const granted = await Notification.requestPermission();
                  if (!granted) return; // 被拒絕就不繼續
                  await Notification.createChannels();
                  set('notificationEnabled', true);
                  await Notification.scheduleAll();
                } else {
                  // 關閉：取消所有排程
                  set('notificationEnabled', false);
                  await Notification.disableAll();
                }
              }}
            />
          </SettingRow>
          {settings.notificationEnabled && (
            <div style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text, #2c1a0e)' }}>⏰ 截止日提醒</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8c6e52)' }}>任務截止當天發送提醒</div>
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
                <div key={hKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text, #2c1a0e)' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={0} max={23}
                      style={{ ...inputStyle, width: 48, textAlign: 'center', marginBottom: 0, padding: '6px 4px' }}
                      defaultValue={settings[hKey] ?? defH}
                      onChange={e => { set(hKey, parseInt(e.target.value)); Notification.scheduleAll(); }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-muted, #8c6e52)' }}>:</span>
                    <input type="number" min={0} max={59}
                      style={{ ...inputStyle, width: 48, textAlign: 'center', marginBottom: 0, padding: '6px 4px' }}
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
          <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button style={{ ...btnStyle, background: 'var(--bg-card, #fff)', color: 'var(--text, #2c1a0e)', border: '1.5px solid var(--border-input, #d5c5a8)', boxShadow: 'none', fontSize: '0.88rem', padding: '10px' }}
              onClick={() => setModal('import')}>📥 匯入存檔</button>
            <button style={{ ...btnStyle, background: 'var(--bg-card, #fff)', color: 'var(--text, #2c1a0e)', border: '1.5px solid var(--border-input, #d5c5a8)', boxShadow: 'none', fontSize: '0.88rem', padding: '10px' }}
              onClick={() => EventBus.emit(Events.Settings.REQUEST_EXPORT_SAVE)}>📤 匯出存檔</button>
          </div>
          <div style={{ padding: '0 14px 12px' }}>
            <button style={{ ...btnStyle, background: 'var(--color-danger, #c0392b)', border: 'none', width: '100%', fontSize: '0.88rem' }}
              onClick={() => setModal('reset')}>⚠️ 重置所有資料</button>
          </div>
        </div>

        <div style={{ height: 80 }} />
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
      {modal === 'petOff' && (
        <ConfirmDialog
          icon="🐾"
          message="確定要關閉寵物系統嗎？"
          subMessage="目前的寵物會被清空（血統圖鑑、家族歷史不受影響），之後重新開啟要回更衣室重新領養。"
          confirmText="確定關閉"
          onConfirm={() => { EventBus.emit(Events.Pet.REQUEST_DISABLE_MODULE); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
      {lostFeatures && (
        <Modal
          title="⚠️ 訂閱已取消"
          onClose={() => setLostFeatures(null)}
          maxWidth={320}
          footer={<button style={{ ...btnStyle, width: '100%' }} onClick={() => setLostFeatures(null)}>知道了</button>}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text, #2c1a0e)', marginBottom: 10 }}>
            以下功能因未另外买断，已一併鎖住：
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {lostFeatures.map(f => (
              <li key={f} style={{ fontSize: '0.82rem', color: 'var(--text-muted, #8c6e52)', marginBottom: 4 }}>{f}</li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}

/* ─── 樣式（保持原樣不變） ──────────────────────────────── */
const pageStyle        = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
const scrollAreaStyle  = { flex: 1, overflowY: 'auto', overflowX: 'hidden' };
const profileCardStyle = { background: 'var(--bg-hud, #2c1a0e)', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
const cardStyle        = { background: 'var(--bg-card, #fff)', borderRadius: 12, margin: '0 12px 4px', border: '1px solid var(--border-card, rgba(0,0,0,0.07))', overflow: 'hidden' };
const smallBtnStyle    = { padding: '5px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-card, #fff)', border: '1.5px solid var(--border-input, #d5c5a8)', color: 'var(--text, #2c1a0e)', whiteSpace: 'nowrap' };
const lockedBadgeStyle = { fontSize: '0.75rem', color: 'var(--text-ghost, #9C7B5B)', background: 'var(--bg-box, rgba(0,0,0,0.035))', padding: '3px 8px', borderRadius: 6 };
const themeCardStyle   = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', marginBottom: 8, background: 'var(--bg-card, #fff)', borderRadius: 10, border: '1px solid var(--border, rgba(0,0,0,0.09))' };