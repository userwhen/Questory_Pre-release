/* src/components/pages/HelpPage.jsx */
import React, { useState } from 'react';

const GUIDE_DATA = [
  {
    category: '🌱 新手入門',
    items: [
      { title: '什麼是 Questory？', desc: 'Questory 是一款把日常生活遊戲化的 App。完成真實任務來提升角色屬性，讓每天的努力都看得見。' },
      { title: '如何開始使用？', desc: '在任務頁新增你的第一個任務，每天完成任務、累積經驗，讓角色一起成長。' },
      { title: '什麼是等級與經驗值？', desc: '完成任務會獲得 EXP，累積到門檻後角色升級。等級代表你的整體成長進度，沒有上限。' },
    ],
  },
  {
    category: '✅ 任務系統',
    items: [
      { title: '任務類型有哪些？', desc: '任務分為每日任務（Daily）、一般待辦、以及帶截止日的限時任務。每日任務會在換日後自動重置。' },
      { title: '完成任務能獲得什麼？', desc: '完成任務可獲得 EXP、金幣，並提升綁定屬性的技能熟練度。嚴格模式下，逾期會扣除經驗。' },
      { title: '什麼是嚴格模式？', desc: '開啟嚴格模式後，取消任務完成時會扣除角色經驗與屬性值。' },
    ],
  },
  {
    category: '🏆 成就系統',
    items: [
      { title: '成就和里程碑有什麼不同？', desc: '里程碑是你自訂的個人目標，完成後可領取獎勵。官方成就則是系統追蹤的長期記錄，如連續登入天數。' },
      { title: '如何領取成就獎勵？', desc: '在成就頁面找到已達成的項目，點擊「領取」按鈕即可獲得金幣或經驗值。' },
    ],
  },
  {
    category: '📊 屬性系統',
    items: [
      { title: '六大屬性是什麼？', desc: '角色有體能(💪)、思考(🧠)、技術(🛠️)、魅力(✨)、創造(🎨)、經營(💼)六個屬性，對應生活中不同的能力面向。' },
      { title: '技能和屬性的關係？', desc: '每個技能都綁定一個主屬性。完成有該技能的任務時，技能與其主屬性都會同步提升。技能達到 Lv.10 後進入榮譽殿堂。' },
    ],
  },
  {
    category: '🛒 商店系統',
    items: [
      { title: '金幣和鑽石怎麼用？', desc: '金幣用於購買普通道具；免費鑽石(💎)可買限定物品；付費鑽石(💠)用於高級內容。鑽石可從成就和活動獲得。' },
      { title: '主題如何購買和切換？', desc: '在設定 → 主題商店中購買主題後，可直接套用。' },
    ],
  },
  {
    category: '📖 劇情模式',
    items: [
      { title: '什麼是劇情精力？', desc: '每次進入劇情探索會消耗 5 點精力值。精力每 10 分鐘自動恢復 1 點，也可透過背包中的精力藥水補充。' },
      { title: '劇情選擇有影響嗎？', desc: '劇情分支由隨機框架與你的 tag 狀態決定，每次探索都是不同的故事體驗。' },
    ],
  },
];

const TABS = [
  { val: 'guide',   label: '📖 說明' },
  { val: 'about',   label: '🏢 關於' },
  { val: 'contact', label: '📬 聯絡' },
];

/* ─── 說明 Tab ─────────────────────────────── */
function GuideTab() {
  const [activeCat, setActiveCat] = useState(GUIDE_DATA[0].category);
  const catData = GUIDE_DATA.find(c => c.category === activeCat) ?? GUIDE_DATA[0];

  return (
    <>
      {/* 分類選單 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {GUIDE_DATA.map(cat => (
          <button key={cat.category}
            style={{
              padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
              background: activeCat === cat.category ? 'var(--color-gold, #f5a623)' : 'var(--bg-elevated, #fff)',
              color:      activeCat === cat.category ? '#fff' : 'var(--text-muted, #8c6e52)',
            }}
            onClick={() => setActiveCat(cat.category)}
          >{cat.category}</button>
        ))}
      </div>

      {/* 說明項目 */}
      {catData.items.map((item, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontWeight: 800, color: 'var(--text, #2c1a0e)', fontSize: '0.92rem', marginBottom: 6 }}>
            {item.title}
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-2, #5c3d2e)', lineHeight: 1.6 }}>
            {item.desc}
          </div>
        </div>
      ))}
    </>
  );
}

/* ─── 關於 Tab ─────────────────────────────── */
function AboutTab() {
  return (
    <>
      {/* Logo 區 */}
      <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>⚔️</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text, #2c1a0e)', letterSpacing: '0.05em' }}>
          Questory
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8c6e52)', marginTop: 4, letterSpacing: '0.08em' }}>
          你的冒險，從今天開始
        </div>
        <div style={{ display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 999, background: 'var(--bg-elevated, #fff)', fontSize: '0.72rem', color: 'var(--text-ghost, #9C7B5B)' }}>
          v1.0.0
        </div>
      </div>

      {/* 開發者資訊 */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-gold-soft, #fef3c7)', border: '1px solid var(--color-gold, #f5a623)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
          🎮
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text, #2c1a0e)', fontSize: '0.95rem' }}>Questory Studio</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #8c6e52)', marginTop: 2 }}>獨立開發 · 台灣</div>
        </div>
      </div>

      {/* 法律連結 */}
      <div style={{ ...cardStyle, padding: '0 16px', marginBottom: 10 }}>
        {[
          { icon: '📋', label: '隱私政策', href: 'https://www.questory.app/privacy' },
          { icon: '📄', label: '使用條款', href: 'https://www.questory.app/terms' },
        ].map((row, i, arr) => (
          <a key={row.label} href={row.href} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', textDecoration: 'none', borderBottom: i < arr.length - 1 ? '1px solid var(--border, rgba(0,0,0,0.09))' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.1rem' }}>{row.icon}</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text, #2c1a0e)' }}>{row.label}</span>
            </div>
            <span style={{ color: 'var(--text-ghost, #9C7B5B)' }}>›</span>
          </a>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '12px 0 4px', fontSize: '0.72rem', color: 'var(--text-ghost, #9C7B5B)', lineHeight: 1.7 }}>
        © 2025 Questory Studio. All rights reserved.
      </div>
    </>
  );
}

/* ─── 聯絡 Tab ─────────────────────────────── */
function ContactTab() {
  const links = [
    { icon: '📧', title: '電子郵件',     desc: 'contact@questory.app', href: 'mailto:contact@questory.app', label: '發送郵件' },
    { icon: '🌐', title: '官方網站',     desc: 'www.questory.app',     href: 'https://www.questory.app',   label: '前往網站' },
    { icon: '📝', title: '意見回饋表單', desc: '問題回報 / 功能建議', href: 'https://forms.questory.app', label: '填寫表單' },
  ];

  return (
    <>
      <div style={{ marginBottom: 14, padding: '12px 14px', background: 'var(--color-gold-soft, #fef3c7)', borderRadius: 12, border: '1px solid var(--color-gold, #f5a623)', fontSize: '0.84rem', color: 'var(--color-gold-dark, #c47d0e)', lineHeight: 1.6 }}>
        💬 有任何問題、建議或合作邀請，歡迎透過以下管道聯繫我們。通常會在 2 個工作天內回覆。
      </div>

      {links.map(link => (
        <div key={link.title} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-elevated, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
            {link.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--text, #2c1a0e)', fontSize: '0.9rem' }}>{link.title}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #8c6e52)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.desc}</div>
          </div>
          <a href={link.href} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--color-gold, #f5a623)', background: 'var(--color-gold-soft, #fef3c7)', color: 'var(--color-gold-dark, #c47d0e)', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {link.label}
          </a>
        </div>
      ))}

      <div style={{ marginTop: 6, padding: 12, background: 'var(--bg-elevated, #fff)', borderRadius: 10, textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-ghost, #9C7B5B)', lineHeight: 1.6 }}>
        如果你喜歡 Questory，歡迎在 App Store 留下評分！<br />
        你的支持是我們持續開發的最大動力 🙏
      </div>
    </>
  );
}

/* ─── 主頁面 ───────────────────────────────── */
export default function HelpPage() {
  const [tab, setTab] = useState('guide');

  return (
    <div style={pageStyle}>
      {/* Tab 列 */}
      <div style={tabBarStyle}>
        {TABS.map(t => (
          <button key={t.val}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit', transition: '0.15s',
              background: tab === t.val ? 'var(--color-gold-soft, #fef3c7)' : 'var(--bg-box, rgba(0,0,0,0.035))',
              color:      tab === t.val ? 'var(--color-gold-dark, #c47d0e)' : 'var(--text-muted, #8c6e52)',
              borderBottom: tab === t.val ? '2px solid var(--color-gold, #f5a623)' : '2px solid transparent',
            }}
            onClick={() => setTab(t.val)}
          >{t.label}</button>
        ))}
      </div>

      {/* 內容區 */}
      <div style={scrollStyle}>
        {tab === 'guide'   && <GuideTab />}
        {tab === 'about'   && <AboutTab />}
        {tab === 'contact' && <ContactTab />}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

/* ─── 樣式 ─────────────────────────────────── */
const pageStyle  = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
const tabBarStyle = { flexShrink: 0, display: 'flex', gap: 4, padding: '10px 12px 0', background: 'var(--bg-panel, #f7e7ce)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' };
const scrollStyle = { flex: 1, overflowY: 'auto', padding: '14px 14px 0' };
const cardStyle   = { background: 'var(--bg-card, #fff)', borderRadius: 12, border: '1px solid var(--border, rgba(0,0,0,0.09))', padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
