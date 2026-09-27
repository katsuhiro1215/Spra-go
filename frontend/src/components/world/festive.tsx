import type { ReactNode } from "react";

import type { TimeOfDay } from "./time-of-day";

// 位置・速さは固定の値にして、描くたびに変わらないようにする(位置はブラウザで見て調整してよい)
const BIRDS = [
  { top: 7, delay: 0, duration: 16 },
  { top: 13, delay: 6, duration: 19 },
];
const BUTTERFLIES = [
  { left: 18, top: 58, delay: 0 },
  { left: 72, top: 62, delay: 1.8 },
];
const BALLOONS = [
  { left: 4, top: 30, color: "#f2685a", delay: 0 },
  { left: 88, top: 22, color: "#f6c342", delay: 1.2 },
  { left: 92, top: 44, color: "#5aa9e6", delay: 2.1 },
];
const FIREWORKS = [
  { left: 22, top: 10, color: "#ffd166", delay: 0 },
  { left: 70, top: 6, color: "#ff8fab", delay: 1.1 },
  { left: 48, top: 14, color: "#9bf6ff", delay: 2.2 },
];
const FLAG_COLORS = ["#f2685a", "#f6c342", "#5bb33e", "#5aa9e6"];

const BIRD: ReactNode = (
  <svg width="16" height="8" viewBox="0 0 16 8">
    <path d="M1 6 Q4 1 8 5 Q12 1 15 6" stroke="#3b3226" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </svg>
);

const BUTTERFLY: ReactNode = (
  <svg width="14" height="12" viewBox="0 0 14 12">
    <ellipse cx="4" cy="5" rx="3.5" ry="4" fill="#f7a8c8" />
    <ellipse cx="10" cy="5" rx="3.5" ry="4" fill="#f7a8c8" />
    <rect x="6.3" y="2" width="1.4" height="8" rx="0.7" fill="#5a4a30" />
  </svg>
);

function Balloon({ color }: { color: string }) {
  return (
    <svg width="16" height="30" viewBox="0 0 16 30">
      <ellipse cx="8" cy="8" rx="7" ry="8" fill={color} />
      <path d="M8 16 Q6 22 9 29" stroke="#8a7a5c" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

function Firework({ color }: { color: string }) {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return { cx: 14 + Math.cos(angle) * 11, cy: 14 + Math.sin(angle) * 11 };
  });
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={1.8} fill={color} />
      ))}
    </svg>
  );
}

// 糸は y = 2 + 20t(1-t) のゆるい弧。旗は弧の上に10個
function Bunting() {
  const flags = Array.from({ length: 10 }, (_, i) => {
    const x = 5 + i * 10;
    const t = x / 100;
    return { x, y: 2 + 20 * t * (1 - t), color: FLAG_COLORS[i % FLAG_COLORS.length] };
  });
  return (
    <svg className="absolute top-[4%] left-[6%] w-[88%]" viewBox="0 0 100 14" aria-hidden>
      <path d="M0 2 Q50 12 100 2" stroke="#8a7a5c" strokeWidth="0.5" fill="none" />
      {flags.map((flag) => (
        <polygon
          key={flag.x}
          points={`${flag.x - 2.5},${flag.y} ${flag.x + 2.5},${flag.y} ${flag.x},${flag.y + 5}`}
          fill={flag.color}
        />
      ))}
    </svg>
  );
}

/** にぎやか度の飾り(設計書3-2・5-3)。押せない。夜は小鳥・ちょうちょが寝ていて、22〜6時は動かさない */
export function Festive({ level, timeOfDay, quiet }: { level: number; timeOfDay: TimeOfDay; quiet: boolean }) {
  const night = timeOfDay === "night";
  const creatures = !night && !quiet;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {level >= 4 && <Bunting />}
      {level >= 2 &&
        creatures &&
        BIRDS.map((bird, i) => (
          <span
            key={`bird-${i}`}
            className="festive-fly absolute"
            style={{ top: `${bird.top}%`, animationDelay: `${bird.delay}s`, animationDuration: `${bird.duration}s` }}
          >
            {BIRD}
          </span>
        ))}
      {level >= 3 &&
        creatures &&
        BUTTERFLIES.map((butterfly, i) => (
          <span
            key={`butterfly-${i}`}
            className="festive-flutter absolute"
            style={{ left: `${butterfly.left}%`, top: `${butterfly.top}%`, animationDelay: `${butterfly.delay}s` }}
          >
            {BUTTERFLY}
          </span>
        ))}
      {level >= 5 &&
        BALLOONS.map((balloon, i) => (
          <span
            key={`balloon-${i}`}
            className={quiet ? "absolute" : "festive-float absolute"}
            style={{ left: `${balloon.left}%`, top: `${balloon.top}%`, animationDelay: `${balloon.delay}s` }}
          >
            <Balloon color={balloon.color} />
          </span>
        ))}
      {level >= 5 &&
        night &&
        !quiet &&
        FIREWORKS.map((firework, i) => (
          <span
            key={`firework-${i}`}
            className="festive-firework absolute"
            style={{ left: `${firework.left}%`, top: `${firework.top}%`, animationDelay: `${firework.delay}s` }}
          >
            <Firework color={firework.color} />
          </span>
        ))}
    </div>
  );
}
