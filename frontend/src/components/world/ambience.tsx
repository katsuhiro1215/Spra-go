import type { ReactNode } from "react";

import type { Season, TimeOfDay } from "./time-of-day";

type TimeTheme = {
  background: string;
  groundTint: { color: string; opacity: number } | null;
  dimObjects: boolean;
  lit: boolean;
};

// 時間帯ごとの町の見た目(設計書7-1)。夜は物を少し暗くし、窓・灯籠・ちょうちんに明かりをともす
export const TIME_THEME: Record<TimeOfDay, TimeTheme> = {
  morning: {
    background: "linear-gradient(#d4f0f8, #aee0f0)",
    groundTint: { color: "#fff6e0", opacity: 0.12 },
    dimObjects: false,
    lit: false,
  },
  day: { background: "#8fd4e9", groundTint: null, dimObjects: false, lit: false },
  evening: {
    background: "linear-gradient(#f4a86f, #f8d6a4)",
    groundTint: { color: "#ff9a4d", opacity: 0.16 },
    dimObjects: false,
    lit: false,
  },
  night: {
    background: "linear-gradient(#131b3a, #2a3a6a)",
    groundTint: { color: "#1b2552", opacity: 0.42 },
    dimObjects: true,
    lit: true,
  },
};

// 位置・速さは固定の値にして、描くたびに変わらないようにする
const FALLING = [
  { left: 6, delay: 0, duration: 9 },
  { left: 14, delay: 3.2, duration: 11 },
  { left: 23, delay: 6.1, duration: 10 },
  { left: 31, delay: 1.4, duration: 12 },
  { left: 40, delay: 4.8, duration: 9.5 },
  { left: 48, delay: 7.5, duration: 11.5 },
  { left: 57, delay: 2.3, duration: 10.5 },
  { left: 65, delay: 5.6, duration: 12.5 },
  { left: 73, delay: 0.8, duration: 9 },
  { left: 81, delay: 3.9, duration: 11 },
  { left: 89, delay: 6.8, duration: 10 },
  { left: 95, delay: 2.9, duration: 12 },
];

const SPARKLES = [
  { left: 10, top: 14, delay: 0 },
  { left: 26, top: 8, delay: 0.9 },
  { left: 44, top: 20, delay: 1.7 },
  { left: 62, top: 10, delay: 0.4 },
  { left: 78, top: 18, delay: 1.3 },
  { left: 90, top: 6, delay: 2.1 },
  { left: 18, top: 30, delay: 1.1 },
  { left: 70, top: 32, delay: 2.5 },
];

const STARS = [
  { left: 6, top: 4 },
  { left: 15, top: 12 },
  { left: 24, top: 3 },
  { left: 33, top: 9 },
  { left: 47, top: 5 },
  { left: 56, top: 13 },
  { left: 64, top: 4 },
  { left: 72, top: 10 },
  { left: 81, top: 3 },
  { left: 88, top: 12 },
  { left: 94, top: 6 },
  { left: 40, top: 15 },
];

const FALLING_SHAPE: Record<Exclude<Season, "summer">, ReactNode> = {
  spring: (
    <svg width="10" height="8" viewBox="0 0 10 8">
      <ellipse cx="5" cy="4" rx="5" ry="3" fill="#f7b6c8" />
    </svg>
  ),
  autumn: (
    <svg width="12" height="10" viewBox="0 0 12 10">
      <path d="M1 9 C2 3 7 1 11 1 C10 5 7 9 1 9 Z" fill="#e8893a" />
    </svg>
  ),
  winter: (
    <svg width="7" height="7" viewBox="0 0 7 7">
      <circle cx="3.5" cy="3.5" r="3.5" fill="#ffffff" />
    </svg>
  ),
};

const SPARKLE_SHAPE: ReactNode = (
  <svg width="12" height="12" viewBox="0 0 12 12">
    <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#fff3b0" />
  </svg>
);

/** 町の上に重ねる、夜の星と季節の舞うもの(押せない) */
export function Ambience({ timeOfDay, season }: { timeOfDay: TimeOfDay; season: Season }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {timeOfDay === "night" &&
        STARS.map((star, i) => (
          <span
            key={`star-${i}`}
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{ left: `${star.left}%`, top: `${star.top}%`, animationDelay: `${(i % 5) * 0.6}s` }}
          />
        ))}
      {season === "summer"
        ? SPARKLES.map((sparkle, i) => (
            <span
              key={`sparkle-${i}`}
              className="season-sparkle absolute"
              style={{ left: `${sparkle.left}%`, top: `${sparkle.top}%`, animationDelay: `${sparkle.delay}s` }}
            >
              {SPARKLE_SHAPE}
            </span>
          ))
        : FALLING.map((particle, i) => (
            <span
              key={`fall-${i}`}
              className="season-fall absolute top-0"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            >
              {FALLING_SHAPE[season]}
            </span>
          ))}
    </div>
  );
}
