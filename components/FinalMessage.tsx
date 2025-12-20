import React, { useEffect, useState } from 'react';

interface FinalMessageProps {
  show: boolean;
  onComplete: () => void;
}

export const FinalMessage: React.FC<FinalMessageProps> = ({ show, onComplete }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!show) {
      setText('');
      return;
    }

    const line1Text = "有你的聖誕很特別";
    const line2Text = "你是最好的禮物";
    let currentText = "";
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const typeLine2 = () => {
      let j = 0;
      const typeChar = () => {
        if (j < line2Text.length) {
          currentText += line2Text.charAt(j);
          setText(currentText + (j === line2Text.length - 1 ? "" : ""));
          j++;
          timeouts.push(setTimeout(typeChar, 200));
        } else {
           // Wait 3 seconds after finishing typing before triggering completion (TV Off)
           timeouts.push(setTimeout(onComplete, 3000));
        }
      };
      typeChar();
    };

    const typeLine1 = () => {
      let i = 0;
      const typeChar = () => {
        if (i < line1Text.length) {
          currentText = line1Text.substring(0, i + 1);
          setText(currentText);
          i++;
          timeouts.push(setTimeout(typeChar, 200));
        } else {
          currentText += "\n";
          setText(currentText);
          timeouts.push(setTimeout(typeLine2, 500));
        }
      };
      typeChar();
    };

    timeouts.push(setTimeout(typeLine1, 500));

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-white text-xl md:text-2xl text-center w-[85%] leading-loose tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] font-bold whitespace-pre-line">
      {text}
      <span className="inline-block w-0.5 h-5 bg-white ml-1 align-middle cursor-blink"></span>
    </div>
  );
};