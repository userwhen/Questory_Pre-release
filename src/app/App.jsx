import React, { useState } from 'react';
import { useGameStore } from '@/core/state.js';
import SplashScreen from '@/layout/SplashScreen.jsx';
import WelcomeScreen from '@/layout/WelcomeScreen.jsx';
import GameLayout from '@/layout/GameLayout.jsx';

export default function App() {
  const [phase, setPhase] = useState('splash');
  const userName = useGameStore(s => s.userName);

  const onSplashDone = () => {
    setPhase(userName ? 'game' : 'welcome');
  };

  return (
    <>
      {phase === 'splash'  && <SplashScreen onComplete={onSplashDone} />}
      {phase === 'welcome' && <WelcomeScreen onComplete={() => setPhase('game')} />}
      {phase === 'game'    && <GameLayout />}
    </>
  );
}
