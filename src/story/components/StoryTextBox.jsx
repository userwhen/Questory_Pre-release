// src/components/story/StoryTextBox.jsx
import { useEffect, useRef, useCallback } from 'react';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';

const VIBE_CLASS = {
  horror: 'vibe-horror',
  tension: 'vibe-tension',
  dread: 'vibe-dread',
  romance: 'vibe-romance',
  ambiguous: 'vibe-ambiguous',
  mystery: 'vibe-mystery',
  triumph: 'vibe-triumph',
  calm: '',
};

// 亂碼字元池（極限張力用）
const GLITCH_CHARS = '█▓▒░⣿⠿Ẍ̵̶̷̸X̨̧̡̢̛̖̗̘̙̜̝̞̟̠̣̤̥̦̩̪̫̬̭̮̯̰̱̲̳▮▯⌂◈◉◊';
const SHAKE_CHARS = '▌▐▀▄║│';

export default function StoryTextBox({ vibe }) {
  const contentRef = useRef(null);
  const wrapRef = useRef(null);
  const cursorRef = useRef(null);
  const typingTimer = useRef(null);
  const skipFlag = useRef(false);
  const glitchTimer = useRef(null);
  const prevVibe = useRef('calm');
  const vibeRef = useRef('calm');
  // ── Glitch 效果（個別字元位移 + 亂碼）────────────────────────
  const stopGlitch = useCallback(() => {
    if (glitchTimer.current) {
      clearInterval(glitchTimer.current);
      glitchTimer.current = null;
    }
    // 還原所有 glitch span
    const box = contentRef.current;
    if (!box) return;
    box.querySelectorAll('.glitch-char').forEach(span => {
      span.style.transform = '';
      span.style.opacity = '';
      span.textContent = span.dataset.orig || span.textContent;
    });
  }, []);

  /**
   * 啟動 glitch 效果
   * @param {'shake'|'glitch'} mode
   *   shake  = 字元位移顫抖（dread）
   *   glitch = 位移 + 亂碼（horror）
   */
  const startGlitch = useCallback((mode) => {
    stopGlitch();
    const box = contentRef.current;
    if (!box) return;

    // 把文字節點的字元包成 span（只處理純文字節點，不動 HTML tag）
    const wrapChars = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text.trim()) return;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          const span = document.createElement('span');
          span.className = 'glitch-char';
          span.dataset.orig = ch;
          span.textContent = ch;
          frag.appendChild(span);
        }
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('glitch-char')) {
        // 遞迴，但不重複包
        Array.from(node.childNodes).forEach(wrapChars);
      }
    };

    // 只包一次（避免重複）
    if (!box.querySelector('.glitch-char')) {
      Array.from(box.childNodes).forEach(wrapChars);
    }

    const spans = Array.from(box.querySelectorAll('.glitch-char'));
    if (spans.length === 0) return;

    glitchTimer.current = setInterval(() => {
      // 每次隨機選 3~8 個字元處理
      const count = 3 + Math.floor(Math.random() * 6);
      const chosen = spans
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      chosen.forEach(span => {
        const orig = span.dataset.orig || span.textContent;

        if (mode === 'glitch' && Math.random() < 0.4) {
          // 亂碼替換
          span.textContent = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          span.style.color = Math.random() < 0.5 ? 'rgba(255,60,60,0.9)' : 'rgba(255,255,255,0.3)';
          // 短暫後還原
          setTimeout(() => {
            span.textContent = orig;
            span.style.color = '';
          }, 80 + Math.random() * 120);
        } else {
          // 位移顫抖
          const dx = (Math.random() - 0.5) * 4;
          const dy = (Math.random() - 0.5) * 3;
          span.style.transform = `translate(${dx}px,${dy}px)`;
          span.style.display = 'inline-block';
          setTimeout(() => {
            span.style.transform = '';
          }, 100 + Math.random() * 100);
        }
      });
    }, 150);
  }, [stopGlitch]);

  // ── vibe 變化時切換 glitch ────────────────────────────────────
  useEffect(() => {
    if (prevVibe.current === vibe) return;
    prevVibe.current = vibe;
    vibeRef.current = vibe;

    if (vibe === 'horror') {
      startGlitch('glitch');
    } else {
      stopGlitch();
    }
  }, [vibe, startGlitch, stopGlitch]);

  // ── 打字機核心 ────────────────────────────────────────────────
  const typeWriter = useCallback((element, htmlContent, onComplete) => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    skipFlag.current = false;

    // 打字開始前先停 glitch（打字期間不跑 glitch，避免衝突）
    stopGlitch();

    const tokens = [];
    const tagRegex = /(<[^>]+>)/g;
    let lastIdx = 0;
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      if (match.index > lastIdx) {
        for (const ch of htmlContent.substring(lastIdx, match.index)) {
          tokens.push({ type: 'text', val: ch });
        }
      }
      tokens.push({ type: 'html', val: match[0] });
      lastIdx = tagRegex.lastIndex;
    }
    if (lastIdx < htmlContent.length) {
      for (const ch of htmlContent.substring(lastIdx)) {
        tokens.push({ type: 'text', val: ch });
      }
    }

    let i = 0;
    let current = '';
    element.innerHTML = '';

    typingTimer.current = setInterval(() => {
      if (skipFlag.current) {
        element.innerHTML = htmlContent;
        clearInterval(typingTimer.current);
        typingTimer.current = null;
        skipFlag.current = false;
        // 打字完成後重啟 glitch（讀 ref，避免 stale closure）
        if (vibeRef.current === 'horror') startGlitch('glitch');
        if (onComplete) onComplete();
        return;
      }

      while (i < tokens.length && tokens[i].type === 'html') {
        current += tokens[i].val;
        i++;
      }
      if (i < tokens.length) {
        current += tokens[i].val;
        i++;
      }
      element.innerHTML = current;

      const wrap = wrapRef.current;
      if (wrap && i % 3 === 0) {
        if (wrap.scrollHeight - wrap.scrollTop > wrap.clientHeight + 50) {
          wrap.scrollTop = wrap.scrollHeight;
        }
      }

      if (i >= tokens.length) {
        clearInterval(typingTimer.current);
        typingTimer.current = null;
        // 打字完成後重啟 glitch
        // 打字完成後重啟 glitch（讀 ref，避免 stale closure）
        if (vibeRef.current === 'horror') startGlitch('glitch');
        if (onComplete) onComplete();
      }
    }, 20);
  }, [startGlitch, stopGlitch]);

  // ── EventBus 訂閱 ─────────────────────────────────────────────
  useEffect(() => {
    const unClear = EventBus.on(Events.Story.CLEAR_SCREEN, () => {
      if (typingTimer.current) {
        clearInterval(typingTimer.current);
        typingTimer.current = null;
      }
      stopGlitch();
      if (contentRef.current) contentRef.current.innerHTML = '';
      if (cursorRef.current) cursorRef.current.style.display = 'none';
      if (wrapRef.current) wrapRef.current.scrollTop = 0;
    });

    const unAppend = EventBus.on(Events.Story.APPEND_CHUNK, ({ html, isLast, onComplete }) => {
      const box = contentRef.current;
      const wrap = wrapRef.current;
      if (!box || !wrap) return;

      if (cursorRef.current) cursorRef.current.style.display = 'none';

      const shouldClear = box.innerHTML.trim() !== '' &&
        box.offsetHeight > wrap.clientHeight * 0.7;
      if (shouldClear) {
        box.innerHTML = '';
        wrap.scrollTop = 0;
      }

      const div = document.createElement('div');
      div.style.cssText = 'margin-bottom:14px; opacity:0.92;';
      box.appendChild(div);

      typeWriter(div, html, () => {
        div.style.opacity = '1';
        const cursor = cursorRef.current;
        if (cursor) {
          cursor.innerHTML = isLast ? '➤' : '▼';
          cursor.style.display = 'inline-block';
          div.appendChild(cursor);
        }
        if (onComplete) onComplete();
      });
    });

    const unSkip = EventBus.on(Events.Story.SKIP_TYPING, () => {
      if (typingTimer.current) {
        skipFlag.current = true;
      }
    });

    const unCheck = EventBus.on(Events.Story.APPEND_CHECK_RESULT, ({ stat, total, threshold, passed }) => {
      const html =
        `<div style="margin-top:6px;font-family:monospace;font-size:0.88rem;line-height:1.8;">` +
        `<span style="color:rgba(255,255,255,0.5);">🎲 ${stat}（${total} vs ${threshold}）</span><br>` +
        `<span style="font-weight:bold;color:${passed ? 'var(--color-correct)' : 'var(--color-danger)'};">` +
        `${passed ? '✅ 成功' : '❌ 失敗'}</span></div>`;
      const box = contentRef.current;
      if (box) {
        const div = document.createElement('div');
        div.innerHTML = html;
        box.appendChild(div);
        const wrap = wrapRef.current;
        if (wrap) wrap.scrollTop = wrap.scrollHeight;
      }
    });

    const unReward = EventBus.on(Events.Story.REWARD_POPUP, (msgs) => {
      const box = contentRef.current;
      if (!box || !msgs?.length) return;
      const div = document.createElement('div');
      div.style.cssText =
        'margin-top:10px;padding-top:8px;' +
        'border-top:1px solid rgba(255,255,255,0.08);' +
        'font-size:0.82rem;color:rgba(255,255,255,0.45);line-height:1.8;';
      div.innerHTML = msgs.map(m => `<span style="margin-right:10px;">${m}</span>`).join('');
      box.appendChild(div);
      const wrap = wrapRef.current;
      if (wrap) wrap.scrollTop = wrap.scrollHeight;
    });

    return () => {
      unClear(); unAppend(); unSkip(); unCheck(); unReward();
      if (typingTimer.current) clearInterval(typingTimer.current);
      stopGlitch();
    };
  }, [typeWriter, stopGlitch]);

  const vibeClass = VIBE_CLASS[vibe] || '';

  return (
    <div
      ref={wrapRef}
      className={`story-text-box ${vibeClass}`}
      onClick={() => EventBus.emit(Events.Story.SKIP_TYPING)}
      style={styles.wrap}
    >
      <div ref={contentRef} style={styles.content} />
      <span ref={cursorRef} style={{ display: 'none', ...styles.cursor }}>▼</span>
      <style>{VIBE_CSS}</style>
    </div>
  );
}

// ─── Vibe CSS ──────────────────────────────────────────────────────────────────
const VIBE_CSS = `
/* ── dread：高張力，強紅光脈衝，無整體顫抖（改為個別字元 glitch） */
.vibe-dread {
  box-shadow: inset 0 0 50px rgba(220,0,0,0.45) !important;
  background-color: rgba(40,0,0,0.1) !important;
  animation: tensionPulse 2s ease-in-out infinite;
  border: 1px solid rgba(200,30,30,0.25);
}
.vibe-dread .story-action    { color: rgba(255,160,160,0.95) !important; }
.vibe-dread .story-narrative { color: rgba(255,100,100,0.55) !important; }

/* glitch-char 的 inline-block 讓 transform 生效 */
.glitch-char { display: inline; }
.vibe-dread .glitch-char,
.vibe-horror .glitch-char { display: inline-block; }

/* ── horror：深紅閃爍 + 掃描線 */
.vibe-horror {
  box-shadow: inset 0 0 60px rgba(180,0,0,0.6) !important;
  background-color: rgba(60,0,0,0.15) !important;
  animation: horrorFlicker 3s infinite, tensionPulse 1.8s ease-in-out infinite;
  border: 1px solid rgba(180,0,0,0.35);
}
.vibe-horror .story-action    { color: rgba(255,120,120,0.9) !important; }
.vibe-horror .story-narrative { color: rgba(200,80,80,0.5)  !important; }
@keyframes horrorFlicker {
  0%,100% { opacity:1 }
  91%     { opacity:1 }
  92%     { opacity:0.6 }
  93%     { opacity:1 }
  96%     { opacity:1 }
  97%     { opacity:0.4 }
  98%     { opacity:1 }
}

/* ── tension：紅框脈衝 */
.vibe-tension {
  box-shadow: inset 0 0 30px rgba(192,57,43,0.15);
  animation: tensionPulse 2.5s ease-in-out infinite;
}
.vibe-tension .story-action { color: rgba(255,180,170,0.9) !important; }
@keyframes tensionPulse {
  0%,100% { box-shadow: inset 0 0 30px rgba(192,57,43,0.15); }
  50%     { box-shadow: inset 0 0 55px rgba(192,57,43,0.35); }
}

/* ── romance：粉暖光 + 心跳律動 */
.vibe-romance {
  box-shadow: inset 0 0 40px rgba(220,100,140,0.15);
  animation: romanceHeartbeat 2.2s ease-in-out infinite;
  border: 1px solid rgba(220,100,140,0.1);
}
.vibe-romance .story-action { color: rgba(255,190,210,0.95) !important; font-style: italic; }
.vibe-romance .story-dialogue span { color: rgba(255,180,200,0.95) !important; }
@keyframes romanceHeartbeat {
  0%,100% { box-shadow: inset 0 0 40px rgba(220,100,140,0.1); }
  30%     { box-shadow: inset 0 0 55px rgba(220,100,140,0.25); }
  50%     { box-shadow: inset 0 0 40px rgba(220,100,140,0.1); }
  70%     { box-shadow: inset 0 0 60px rgba(220,100,140,0.3); }
}
/* 戀愛文字特效：字元輕微上浮 */
.vibe-romance .story-action .glitch-char {
  display: inline-block;
  animation: romanceFloat 3s ease-in-out infinite;
  animation-delay: calc(var(--char-idx, 0) * 0.05s);
}
@keyframes romanceFloat {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-1.5px); }
}

/* ── ambiguous：粉紫曖昧光 */
.vibe-ambiguous {
  animation: ambiguousBreath 3.5s ease-in-out infinite;
}
.vibe-ambiguous .story-action { color: rgba(220,180,240,0.9) !important; font-style: italic; }
.vibe-ambiguous .story-dialogue span { color: rgba(255,200,230,0.95) !important; }
@keyframes ambiguousBreath {
  0%,100% { box-shadow: inset 0 0 40px rgba(180,100,200,0.1); }
  50%     { box-shadow: inset 0 0 65px rgba(180,100,200,0.28); }
}

/* ── mystery：冷藍聚光 */
.vibe-mystery {
  animation: mysteryScan 4s ease-in-out infinite;
}
.vibe-mystery .story-action    { color: rgba(180,210,255,0.9) !important; letter-spacing: 0.03em; }
.vibe-mystery .story-narrative { color: rgba(140,180,240,0.55) !important; }
@keyframes mysteryScan {
  0%,100% { box-shadow: inset 0 0 35px rgba(30,80,160,0.15); }
  50%     { box-shadow: inset 0 0 55px rgba(30,80,160,0.3); }
}

/* ── triumph：金光閃爍 */
.vibe-triumph {
  box-shadow: inset 0 0 40px rgba(245,166,35,0.15);
  animation: triumphGlow 1.8s ease-in-out infinite;
}
.vibe-triumph .story-action { color: rgba(255,220,130,0.95) !important; }
@keyframes triumphGlow {
  0%,100% { box-shadow: inset 0 0 40px rgba(245,166,35,0.15); }
  50%     { box-shadow: inset 0 0 65px rgba(245,166,35,0.28); }
}

/* ── 過渡 */
.story-text-box { transition: box-shadow 0.5s ease, background-color 0.5s ease, border-color 0.5s ease; }

/* ── 游標 */
@keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0.15} }

/* ── 文字分類 */
.story-narrative { color: rgba(255,255,255,0.45); font-style: italic; display: block; }
.story-dialogue  { display: block; }
.story-action    { color: var(--text-on-dark); display: block; }
`;

const styles = {
  wrap: {
    flex: 1,
    minHeight: 0,
    padding: '28px 20px 36px',
    overflowY: 'auto',
    color: 'var(--text-on-dark)',
    fontSize: '1.1rem',
    lineHeight: '1.7',
    cursor: 'pointer',
    position: 'relative',
    scrollBehavior: 'smooth',
  },
  content: {
    position: 'relative',
  },
  cursor: {
    color: 'var(--color-gold)',
    fontWeight: 'bold',
    marginLeft: '4px',
    animation: 'cursorBlink 1s infinite',
  },
};