"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";

import { Flag } from "./flag";
import { islandLabel, islandTag } from "./travel";
import type { Destination } from "./types";

// 地図の座標(viewBox 360×600)。日本の近くに近い国、遠くに遠い国の島が並ぶ(行く順番は自由)。6か国目以降は最後の位置の近くに置く
const W = 360;
const H = 600;
const HOME = { x: 70, y: 540 };
const ISLANDS = [
  { x: 262, y: 452 },
  { x: 96, y: 352 },
  { x: 266, y: 250 },
  { x: 98, y: 150 },
  { x: 256, y: 62 },
];

function islandPoint(index: number) {
  const last = ISLANDS[ISLANDS.length - 1];
  return ISLANDS[index] ?? { x: last.x, y: last.y - (index - ISLANDS.length + 1) * 40 };
}

function Island({ x, y, visited, glow, dim }: { x: number; y: number; visited: boolean; glow: boolean; dim: boolean }) {
  return (
    <g opacity={dim ? 0.55 : 1}>
      {glow && <ellipse cx={x} cy={y} rx={50} ry={23} fill="#fff6b0" opacity={0.7} className="animate-pulse" />}
      <ellipse cx={x} cy={y + 4} rx={42} ry={18} fill="#3f93c4" opacity={0.35} />
      <ellipse cx={x} cy={y} rx={40} ry={17} fill={dim ? "#cfc8b8" : "#f1dfae"} />
      <ellipse cx={x - 4} cy={y - 4} rx={28} ry={11} fill={dim ? "#9aa39a" : "#7cc26a"} />
      <path
        d={`M${x + 12} ${y - 6} q2 -14 -2 -22`}
        stroke={dim ? "#7d857d" : "#8a5a33"}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${x + 10} ${y - 28} q-9 -2 -14 4 M${x + 10} ${y - 28} q9 -3 13 3 M${x + 10} ${y - 28} q0 -8 6 -10`}
        stroke={dim ? "#9aa39a" : "#3f8f35"}
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
      {visited && (
        <g transform={`translate(${x - 26} ${y - 8})`}>
          <circle r={9} fill="#fffaf0" stroke="#d8352a" strokeWidth={2} />
          <path d="M-4 0 l3 3 l5 -6" stroke="#d8352a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/** まだの国でチケットがないとき、島と名前をうす暗くする */
function isDim(destination: Destination): boolean {
  return destination.state === "unvisited" && !destination.can_depart;
}

/** せかいの海の地図(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-2)。島の文字とボタンはふりがなが付くようHTMLで重ねる */
export function TravelMap({
  destinations,
  line,
  onSelect,
}: {
  destinations: Destination[];
  line: string;
  onSelect: (destination: Destination) => void;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(20,60,90,0.25)]"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="travel-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5db6e3" />
            <stop offset="1" stopColor="#8fd3f0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#travel-sea)" />
        {[80, 200, 310, 420, 500].map((y, i) => (
          <path
            key={y}
            d={`M${20 + (i % 2) * 150} ${y} q10 -5 20 0 q10 5 20 0`}
            stroke="#ffffff"
            strokeWidth={2}
            fill="none"
            opacity={0.5}
            strokeLinecap="round"
          />
        ))}
        {destinations.map((destination, index) => {
          if (destination.state !== "visited") return null;
          const point = islandPoint(index);
          return (
            <path
              key={destination.key}
              d={`M${HOME.x} ${HOME.y} L${point.x} ${point.y}`}
              stroke="#ffffff"
              strokeWidth={3.5}
              strokeDasharray="2 7"
              strokeLinecap="round"
              opacity={0.95}
            />
          );
        })}
        <g>
          <ellipse cx={HOME.x} cy={HOME.y + 5} rx={60} ry={25} fill="#3f93c4" opacity={0.35} />
          <ellipse cx={HOME.x} cy={HOME.y} rx={58} ry={24} fill="#f1dfae" />
          <ellipse cx={HOME.x - 6} cy={HOME.y - 5} rx={44} ry={16} fill="#7cc26a" />
          <path d={`M${HOME.x + 40} ${HOME.y - 2} L${HOME.x + 74} ${HOME.y - 14}`} stroke="#8a5a33" strokeWidth={7} strokeLinecap="round" />
          <path d={`M${HOME.x + 40} ${HOME.y - 2} L${HOME.x + 74} ${HOME.y - 14}`} stroke="#c9905a" strokeWidth={3} strokeDasharray="3 3" />
        </g>
        {destinations.map((destination, index) => {
          const point = islandPoint(index);
          return (
            <Island
              key={destination.key}
              x={point.x}
              y={point.y}
              visited={destination.state === "visited"}
              glow={destination.can_depart}
              dim={isDim(destination)}
            />
          );
        })}
      </svg>

      {destinations.map((destination, index) => {
        const point = islandPoint(index);
        const tag = islandTag(destination);
        return (
          <button
            key={destination.key}
            type="button"
            aria-label={islandLabel(destination)}
            onClick={() => onSelect(destination)}
            className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
            style={{ left: `${(point.x / W) * 100}%`, top: `${((point.y - 20) / H) * 100}%` }}
          >
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-black whitespace-nowrap shadow ${
                isDim(destination) ? "bg-white/70 text-[#5b6770]" : "bg-[#fffaf0] text-[#3b3226]"
              }`}
            >
              <Flag src={destination.flag} size={20} />
              {destination.name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] leading-none font-black whitespace-nowrap text-white shadow ${
                destination.gift_ready
                  ? "bg-[#d8352a]"
                  : destination.can_depart
                    ? "bg-[#3b7f26]"
                    : destination.state === "visited"
                      ? "bg-[#2b6fa3]"
                      : "bg-[#8a7a5a]"
              }`}
            >
              <AutoFurigana text={tag} />
            </span>
          </button>
        );
      })}

      <div className="absolute" style={{ left: `${((HOME.x - 26) / W) * 100}%`, top: `${((HOME.y - 78) / H) * 100}%` }}>
        <SpruFigure image="wave" standHeight={64} alt="スプル" />
      </div>
      <p
        className="absolute max-w-[62%] rounded-2xl bg-[#fffaf0] px-3 py-2 text-[13px] leading-snug font-bold text-[#3b3226] shadow"
        style={{ left: `${((HOME.x + 26) / W) * 100}%`, top: `${((HOME.y - 72) / H) * 100}%` }}
      >
        <AutoFurigana text={line} />
      </p>
      <p className="absolute bottom-2 left-3 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-black text-[#2b5d7a]">
        <AutoFurigana text="はじまりの町" />
      </p>
    </div>
  );
}
