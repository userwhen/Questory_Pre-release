/* src/ui/HelpPage.jsx */
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
        {GUIDE_DATA.map(cat => (
          <button key={cat.category}
            style={{
              padding: 'var(--space-xs) var(--space-xs)', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer',
              fontSize: 'var(--font-caption)', fontWeight: 700, fontFamily: 'inherit',
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
          <div style={{ fontWeight: 800, color: 'var(--text, #2c1a0e)', fontSize: 'var(--font-body)', marginBottom: 'var(--space-xs)' }}>
            {item.title}
          </div>
          <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-2, #5c3d2e)', lineHeight: 1.6 }}>
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
      <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0 var(--space-md)' }}>
        <div style={{ fontSize: 'var(--size-lg)', marginBottom: 'var(--space-xs)' }}>⚔️</div>
        <div style={{ fontSize: 'var(--font-title)', fontWeight: 900, color: 'var(--text, #2c1a0e)', letterSpacing: '0.05em' }}>
          Questory
        </div>
        <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginTop: 'var(--space-xs)', letterSpacing: '0.08em' }}>
          你的冒險，從今天開始
        </div>
        <div style={{ display: 'inline-block', marginTop: 'var(--space-xs)', padding: '3px 12px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated, #fff)', fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)' }}>
          v1.0.0
        </div>
      </div>

      {/* 開發者資訊 */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
        <div style={{ width: 'var(--size-md)', height: 'var(--size-md)', borderRadius: 'var(--radius-md)', background: 'var(--color-gold-soft, #fef3c7)', border: '1px solid var(--color-gold, #f5a623)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--size-sm)', flexShrink: 0 }}>
          🎮
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text, #2c1a0e)', fontSize: 'var(--font-body)' }}>Questory Studio</div>
          <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginTop: 2 }}>獨立開發 · 台灣</div>
        </div>
      </div>

      {/* 法律連結 */}
      <div style={{ ...cardStyle, padding: '0 var(--space-md)', marginBottom: 'var(--space-xs)' }}>
        {[
          { icon: '📋', label: '隱私政策', href: 'https://www.questory.app/privacy' },
          { icon: '📄', label: '使用條款', href: 'https://www.questory.app/terms' },
        ].map((row, i, arr) => (
          <a key={row.label} href={row.href} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) 0', textDecoration: 'none', borderBottom: i < arr.length - 1 ? '1px solid var(--border, rgba(0,0,0,0.09))' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span style={{ fontSize: 'var(--font-title)' }}>{row.icon}</span>
              <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--text, #2c1a0e)' }}>{row.label}</span>
            </div>
            <span style={{ color: 'var(--text-ghost, #9C7B5B)' }}>›</span>
          </a>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: 'var(--space-sm) 0 var(--space-xs)', fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)', lineHeight: 1.7 }}>
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
      <div style={{ marginBottom: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-sm)', background: 'var(--color-gold-soft, #fef3c7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gold, #f5a623)', fontSize: 'var(--font-body)', color: 'var(--color-gold-dark, #c47d0e)', lineHeight: 1.6 }}>
        💬 有任何問題、建議或合作邀請，歡迎透過以下管道聯繫我們。通常會在 2 個工作天內回覆。
      </div>

      {links.map(link => (
        <div key={link.title} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
          <div style={{ width: 'var(--size-md)', height: 'var(--size-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--size-sm)', flexShrink: 0 }}>
            {link.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: 'var(--text, #2c1a0e)', fontSize: 'var(--font-body)' }}>{link.title}</div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--text-muted, #8c6e52)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.desc}</div>
          </div>
          <a href={link.href} target="_blank" rel="noopener noreferrer"
            style={{ padding: 'var(--space-xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-gold, #f5a623)', background: 'var(--color-gold-soft, #fef3c7)', color: 'var(--color-gold-dark, #c47d0e)', fontSize: 'var(--font-caption)', fontWeight: 800, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {link.label}
          </a>
        </div>
      ))}

      <div style={{ marginTop: 'var(--space-xs)', padding: 'var(--space-sm)', background: 'var(--bg-elevated, #fff)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: 'var(--font-caption)', color: 'var(--text-ghost, #9C7B5B)', lineHeight: 1.6 }}>
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
              flex: 1, padding: 'var(--space-xs) var(--space-xs)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              fontSize: 'var(--font-body)', fontWeight: 700, fontFamily: 'inherit', transition: 'var(--t-fast)',
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
        <div style={{ height: 'var(--size-sm)' }} />
      </div>
    </div>
  );
}

/* ─── 樣式 ─────────────────────────────────── */
const pageStyle  = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-panel, #f7e7ce)' };
const tabBarStyle = { flexShrink: 0, display: 'flex', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm) 0', background: 'var(--bg-panel, #f7e7ce)', borderBottom: '1px solid var(--border, rgba(0,0,0,0.09))' };
const scrollStyle = { flex: 1, overflowY: 'auto', padding: 'var(--space-sm) var(--space-sm) 0' };
const cardStyle   = { background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border, rgba(0,0,0,0.09))', padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-xs)', boxShadow: 'var(--shadow-xs)' };
