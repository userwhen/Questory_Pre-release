import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/core/state.js';
import { EventBus } from '@/core/events.js';
import { Events } from '@/core/event_types.js';
import SplashScreen from '@/components/layout/SplashScreen.jsx';
import WelcomeScreen from '@/components/layout/WelcomeScreen.jsx';
import GameLayout from '@/components/layout/GameLayout.jsx';
import CheckinModal from '@/components/pages/CheckinModal.jsx';

export default function App() {
  const [phase, setPhase] = useState('splash');
  const [showCheckin, setShowCheckin] = useState(false);
  const userName = useGameStore(s => s.userName);

  const onSplashDone = () => {
    setPhase(userName ? 'game' : 'welcome');
  };

  // 換日後自動彈出簽到 Modal（對應舊版 checkDailyReset 的 setTimeout openCheckIn）
  useEffect(() => {
    if (phase !== 'game') return;

    const unsub = EventBus.on(Events.System.DAILY_RESET, () => {
      setTimeout(() => setShowCheckin(true), 1500);
    });

    return () => unsub();
  }, [phase]);

  return (
    <>
      {phase === 'splash'  && <SplashScreen onComplete={onSplashDone} />}
      {phase === 'welcome' && <WelcomeScreen onComplete={() => setPhase('game')} />}
      {phase === 'game'    && <GameLayout />}

      {/* 換日後自動彈出的簽到 Modal，獨立於頁面路由之外 */}
      {showCheckin && (
        <CheckinModal onClose={() => setShowCheckin(false)} />
      )}
    </>
  );
}