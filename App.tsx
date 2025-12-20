import React, { useState, useCallback } from 'react';
import { ThreeScene } from './components/ThreeScene';
import { IntroScreen } from './components/IntroScreen';
import { FinalMessage } from './components/FinalMessage';

const App: React.FC = () => {
  const [resetKey, setResetKey] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [uiMessage, setUiMessage] = useState("點擊禮物盒打開驚喜");
  const [uiOpacity, setUiOpacity] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [showRestart, setShowRestart] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleUiUpdate = useCallback((message: string, opacity: number) => {
    setUiMessage(message);
    setUiOpacity(opacity);
  }, []);

  const handleFinalSequenceStart = useCallback(() => {
    setShowFinalMessage(true);
  }, []);

  const handleGameEnd = useCallback(() => {
    setFlash(true);
    // Hide final message immediately when flash starts to prevent overlap with restart button
    setShowFinalMessage(false);
    
    setTimeout(() => {
        setFlash(false);
        setShowRestart(true);
    }, 500);
  }, []);

  const handleRestart = () => {
    setResetKey(prev => prev + 1);
    setIsStarted(false);
    setUiOpacity(0);
    setShowFinalMessage(false);
    setShowRestart(false);
    setFlash(false);
  };

  // Callback from FinalMessage when typing + delay is done
  // Fix: Wrapped in useCallback to ensure stability and prevent FinalMessage effect from restarting
  const handleTypewriterComplete = useCallback(() => {
    // Dispatch event to ThreeScene to trigger TV off animation
    window.dispatchEvent(new Event('TRIGGER_TV_OFF'));
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* 3D Scene */}
      <ThreeScene 
        key={resetKey}
        isStarted={isStarted}
        onUiUpdate={handleUiUpdate}
        onFinalSequenceStart={handleFinalSequenceStart}
        onGameEnd={handleGameEnd}
      />

      {/* Intro Overlay */}
      <IntroScreen visible={!isStarted} onStart={handleStart} />

      {/* Main UI Layer (Instructions) */}
      <div 
        className="fixed bottom-[8%] left-1/2 -translate-x-1/2 z-10 text-white/90 text-center text-base md:text-lg tracking-wider font-bold w-[90%] pointer-events-none transition-opacity duration-1000 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{ opacity: uiOpacity }}
      >
        {uiMessage}
      </div>

      {/* Final Message (Typewriter) */}
      <FinalMessage show={showFinalMessage} onComplete={handleTypewriterComplete} />

      {/* White Flash Effect */}
      <div 
        className={`fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-500 ${flash ? 'opacity-100' : 'opacity-0'}`} 
      />

      {/* Restart Button */}
      {showRestart && (
        <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] px-6 py-3 text-white border border-white/50 bg-black/80 rounded-full cursor-pointer hover:bg-white/10 hover:border-white transition-all duration-500 animate-fade-in text-lg tracking-widest"
            onClick={handleRestart}
        >
            ↻ 重新進入世界
        </div>
      )}
    </div>
  );
};

export default App;