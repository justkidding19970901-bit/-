import React from 'react';
import { useApp } from '../context/AppContext';

// 依時間問候
function timeGreeting(): { hi: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6) return { hi: '夜深了', emoji: '🌙' };
  if (h < 11) return { hi: '早安', emoji: '☀️' };
  if (h < 14) return { hi: '午安', emoji: '🍱' };
  if (h < 18) return { hi: '午後好', emoji: '🌤️' };
  return { hi: '晚安', emoji: '🌆' };
}

function todayLabel(): string {
  const d = new Date();
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 週${wd}`;
}

export const Greeting: React.FC = () => {
  const { currentUser, stats } = useApp();
  const { hi, emoji } = timeGreeting();

  // 依當月手機殼達成率給回饋語
  const t = stats.target.phoneCaseTarget;
  const done = stats.phoneCaseDone;
  let feedback = '今天也一起把作品推進一點點吧。';
  if (t > 0) {
    const ratio = done / t;
    if (ratio >= 1) feedback = '本月 KPI 已達標，超棒的，保持手感！';
    else if (ratio >= 0.5) feedback = `已完成 ${done}/${t} 款，節奏很穩，繼續保持。`;
    else if (done > 0) feedback = `起步了（${done}/${t} 款），一步一步來，不急。`;
    else feedback = '新的一個月，先從一個小進度開始就好。';
  }

  return (
    <div className="animate-fade-in mb-5">
      <div className="text-xl font-bold text-slate-800">
        {emoji} {hi}，{currentUser?.name}
      </div>
      <div className="text-sm text-slate-400 mt-0.5">
        {todayLabel()}　·　{feedback}
      </div>
    </div>
  );
};
