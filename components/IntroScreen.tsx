import React, { useEffect, useState } from 'react';

interface IntroScreenProps {
  onStart: () => void;
  visible: boolean;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, visible }) => {
  const [render, setRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRender(true);
    } else {
      const timer = setTimeout(() => setRender(false), 1500); // Wait for fade out
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!render) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-center items-center bg-black text-white cursor-pointer transition-opacity duration-1000 ease-in-out touch-manipulation ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={onStart}
      onTouchEnd={(e) => {
        // Prevent default ghost clicks if needed, though mostly handled by touch-action
        onStart();
      }}
    >
      <div className="text-2xl md:text-3xl tracking-[3px] mb-5 text-center font-bold animate-pulse leading-relaxed">
        點 擊 進 入 世 界<br />
        <span className="text-sm md:text-base text-yellow-400 tracking-normal md:tracking-widest">♫ 請開啟聲音體驗</span>
      </div>
      <div className="text-sm md:text-base text-gray-400 tracking-[2px]">
        獻給 鹿霖 的聖誕禮物
      </div>
    </div>
  );
};
