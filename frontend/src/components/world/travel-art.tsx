import type { ReactNode } from "react";

import type { SouvenirArtKey } from "./art-keys";
import { IsoBox, IsoRoof } from "./iso-shapes";

// 原点(0,0)がマスの中心(2×2は4マスの真ん中)。item-art.tsx の絵の一覧に合わせて使う

function Stupa({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5 0 Q-5 -8 0 -9 Q5 -8 5 0 Z" fill="#b3a58f" />
      <path d="M0 -9 V-13" stroke="#9c8f7c" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function Stone({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <IsoBox w={5} h={24} left="#9a9a96" right="#80807c" top="#b0b0ab" />
    </g>
  );
}

function Lintel({ from, to }: { from: [number, number]; to: [number, number] }) {
  return (
    <g>
      <path d={`M${from[0]} ${from[1] - 27} L${to[0]} ${to[1] - 27}`} stroke="#8a8a86" strokeWidth={5} strokeLinecap="square" />
      <path d={`M${from[0]} ${from[1] - 29} L${to[0]} ${to[1] - 29}`} stroke="#b0b0ab" strokeWidth={1.6} strokeLinecap="square" />
    </g>
  );
}

export const TRAVEL_ART: Record<"boat_small" | "boat_large" | SouvenirArtKey, ReactNode> = {
  boat_small: (
    <g>
      <ellipse cx={0} cy={3} rx={22} ry={7} fill="#2f5d2a" opacity={0.15} />
      <path d="M-22 -8 L20 -14 L16 -3 Q0 4 -16 2 Z" fill="#b97b4c" />
      <path d="M-22 -8 L20 -14 L18 -10.5 L-20 -4.5 Z" fill="#d9a06c" />
      <path d="M-16 2 Q0 4 16 -3" stroke="#8e5c33" strokeWidth={1.6} fill="none" />
      <path d="M-2 -10 V-42" stroke="#6e472b" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-1 -41 L16 -31 L-1 -22 Z" fill="#fffaf0" />
      <path d="M-1 -41 L16 -31" stroke="#e5533f" strokeWidth={1.4} />
    </g>
  ),
  boat_large: (
    <g>
      <ellipse cx={0} cy={8} rx={58} ry={20} fill="#2f5d2a" opacity={0.14} />
      <path d="M-56 -10 L52 -26 L42 2 Q0 18 -46 10 Z" fill="#2f5d7a" />
      <path d="M-56 -10 L52 -26 L49 -19 L-53 -3 Z" fill="#fbf6ec" />
      <path d="M-46 10 Q0 18 42 2" stroke="#e5533f" strokeWidth={3} fill="none" />
      <circle cx={-30} cy={-1} r={2.6} fill="#9fd8ff" stroke="#fbf6ec" strokeWidth={1} />
      <circle cx={-18} cy={-3} r={2.6} fill="#9fd8ff" stroke="#fbf6ec" strokeWidth={1} />
      <circle cx={24} cy={-9} r={2.6} fill="#9fd8ff" stroke="#fbf6ec" strokeWidth={1} />
      <IsoBox w={18} h={16} lift={16} left="#fbf6ec" right="#e8dfcf" top="#fffaf0" />
      <rect x={6} y={-58} width={8} height={24} fill="#e5533f" />
      <rect x={6} y={-58} width={8} height={4} fill="#3a2e2a" />
      <path d="M-30 -14 V-72 M32 -24 V-66" stroke="#6e472b" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-29 -70 L-8 -54 L-29 -38 Z" fill="#fffaf0" />
      <path d="M33 -64 L48 -52 L33 -40 Z" fill="#fffaf0" />
    </g>
  ),
  komodo: (
    <g>
      <ellipse cx={0} cy={3} rx={18} ry={6} fill="#2f5d2a" opacity={0.15} />
      <IsoBox w={15} h={9} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <path
        d="M-20 -14 C-15 -17 -9 -20 -3 -20 C4 -20 8 -18 12 -21 C15 -23 19 -23 21 -20 C20 -17 16 -15 12 -15 C7 -14 1 -12 -4 -12 C-10 -12 -15 -12 -20 -14 Z"
        fill="#6f7d4a"
      />
      <path d="M-8 -13 l-3 5 M1 -13 l1 5 M8 -15 l3 5" stroke="#56613a" strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={17} cy={-20} r={1.1} fill="#1f2a14" />
      <path d="M21 -19 l4 -0.6 M21 -19 l4 0.8" stroke="#e5533f" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  ),
  borobudur: (
    <g>
      <ellipse cx={0} cy={6} rx={60} ry={27} fill="#2f5d2a" opacity={0.14} />
      {[0, 1, 2, 3].map((i) => (
        <IsoBox key={i} w={52 - i * 11} h={9} lift={i * 9} left="#9c8f7c" right="#86796a" top="#b3a58f" />
      ))}
      <Stupa x={-12} y={-37} s={0.9} />
      <Stupa x={12} y={-37} s={0.9} />
      <Stupa x={0} y={-31} s={0.9} />
      <path d="M-10 -38 Q-10 -52 0 -55 Q10 -52 10 -38 Z" fill="#c2b49c" />
      <path d="M0 -55 V-66" stroke="#9c8f7c" strokeWidth={2.6} strokeLinecap="round" />
      <Stupa x={-24} y={-26} s={0.8} />
      <Stupa x={24} y={-26} s={0.8} />
    </g>
  ),
  dol_hareubang: (
    <g>
      <ellipse cx={0} cy={3} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <rect x={-9} y={-30} width={18} height={31} rx={7} fill="#6b6a6e" />
      <ellipse cx={0} cy={-35} rx={10} ry={9} fill="#77767a" />
      <path d="M-11 -39 Q0 -55 11 -39 Z" fill="#5e5d61" />
      <ellipse cx={-4} cy={-35} rx={2.6} ry={3} fill="#8f8e92" />
      <ellipse cx={4} cy={-35} rx={2.6} ry={3} fill="#8f8e92" />
      <path d="M-2 -30.5 h4" stroke="#4a494d" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M-8 -16 Q-2 -12 3 -18 M8 -11 Q2 -7 -3 -13" stroke="#5e5d61" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <circle cx={-5} cy={-24} r={0.9} fill="#58575b" />
      <circle cx={5} cy={-4} r={0.9} fill="#58575b" />
      <circle cx={-3} cy={-6} r={0.9} fill="#58575b" />
    </g>
  ),
  bulguksa: (
    <g>
      <ellipse cx={0} cy={6} rx={60} ry={27} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={52} h={14} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <polygon points="-40,-6 -30,-1 -30,-12 -40,-17" fill="#d6cfc1" />
      <path d="M-39 -8 l9 4.5 M-39 -11 l9 4.5 M-39 -14 l9 4.5" stroke="#a39b8d" strokeWidth={1} />
      <IsoBox w={34} h={18} lift={14} left="#c94a33" right="#b23f2b" top="#c94a33" />
      <path d="M-26 -22 v10 M-14 -16 v10 M14 -16 v10 M26 -22 v10" stroke="#fbf6ec" strokeWidth={1.4} opacity={0.7} />
      <IsoBox w={42} h={3} lift={32} left="#3f7a5a" right="#34684c" top="#4f8f6b" />
      <IsoRoof w={44} h={17} lift={35} left="#4a4a52" right="#3a3a42" />
      <path d="M-44 -35 Q-49 -40 -44 -44 M44 -35 Q49 -40 44 -44" stroke="#3a3a42" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  ),
  bison: (
    <g>
      <ellipse cx={0} cy={3} rx={19} ry={6} fill="#2f5d2a" opacity={0.15} />
      <path d="M-13 -7 v7 M-7 -6 v7 M6 -6 v7 M11 -7 v7" stroke="#3f2818" strokeWidth={2.8} strokeLinecap="round" />
      <path
        d="M-17 -8 C-18 -16 -15 -24 -6 -28 C1 -31 9 -29 12 -24 C16 -23 19 -19 18 -13 C17 -9 14 -7 10 -7 C3 -6 -8 -6 -17 -8 Z"
        fill="#5a3b24"
      />
      <path d="M-2 -28 C5 -31 12 -28 13 -21 C13 -15 9 -9 3 -8 C-1 -14 -3 -21 -2 -28 Z" fill="#46301d" />
      <path d="M11 -23 C15 -25 20 -23 20 -17 C20 -13 17 -11 14 -12 Z" fill="#3f2818" />
      <path d="M14 -23 q2 -4 5 -3" stroke="#f2e6cc" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <circle cx={17} cy={-19} r={0.9} fill="#f2e6cc" />
      <path d="M-17 -12 q-4 2 -3 6" stroke="#3f2818" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </g>
  ),
  liberty: (
    <g>
      <ellipse cx={0} cy={6} rx={52} ry={23} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={42} h={10} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <IsoBox w={20} h={34} lift={10} left="#c9c1b3" right="#b3aa9a" top="#d6cfc1" />
      <path d="M-10 -44 L-7 -86 Q0 -92 7 -86 L10 -44 Z" fill="#6fb3a0" />
      <path d="M-7 -86 Q-3 -64 -9 -44 M3 -86 Q6 -62 4 -44" stroke="#5a9e8c" strokeWidth={1.2} fill="none" />
      <rect x={-12} y={-80} width={6} height={10} rx={1} fill="#5a9e8c" transform="rotate(-12 -9 -75)" />
      <path d="M6 -84 L12 -110" stroke="#6fb3a0" strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={0} cy={-94} r={5.5} fill="#7cc2ae" />
      <path d="M-7 -97 l-4 -5 M-3 -99 l-2 -6 M1 -99 l1 -6 M5 -98 l3 -5 M7 -95 l5 -3" stroke="#6fb3a0" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M9.5 -110 h6 l-1 5 h-4 z" fill="#6fb3a0" />
      <path d="M12.5 -111 q-4 -5 0 -11 q4 6 0 11" fill="#ffc94a" />
    </g>
  ),
  phone_box: (
    <g>
      <ellipse cx={0} cy={3} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <IsoBox w={11} h={36} left="#d8352a" right="#b82a21" top="#e5533f" />
      <polygon points="-9,-8 -2,-4.5 -2,-26 -9,-29.5" fill="#cfe7f2" />
      <polygon points="2,-4.5 9,-8 9,-29.5 2,-26" fill="#b7d8e6" />
      <path d="M-9 -15 l7 3.5 M-9 -22 l7 3.5 M-5.5 -6.2 v-21.5 M2 -11.5 l7 -3.5 M2 -18.5 l7 -3.5 M5.5 -6.2 v-21.5" stroke="#d8352a" strokeWidth={1} />
      <polygon points="-9,-31 -2,-27.5 -2,-29.5 -9,-33" fill="#fffaf0" />
      <IsoRoof w={12} h={5} lift={36} left="#c62f25" right="#a8261e" />
    </g>
  ),
  stonehenge: (
    <g>
      <ellipse cx={0} cy={6} rx={58} ry={27} fill="#2f5d2a" opacity={0.14} />
      <ellipse cx={0} cy={0} rx={50} ry={24} fill="#8fbf5a" opacity={0.45} />
      <Stone x={-16} y={-17} />
      <Stone x={16} y={-17} />
      <Stone x={-30} y={-12} />
      <Stone x={30} y={-12} />
      <Lintel from={[-30, -12]} to={[-16, -17]} />
      <Lintel from={[16, -17]} to={[30, -12]} />
      <g transform="translate(0 0)">
        <IsoBox w={12} h={4} left="#9a9a96" right="#80807c" top="#b0b0ab" />
      </g>
      <Stone x={-34} y={8} />
      <Stone x={34} y={8} />
      <Stone x={-20} y={15} />
      <Stone x={20} y={15} />
      <Lintel from={[-34, 8]} to={[-20, 15]} />
      <Lintel from={[20, 15]} to={[34, 8]} />
    </g>
  ),
  eiffel: (
    <g>
      <ellipse cx={0} cy={3} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <IsoBox w={12} h={4} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <path d="M-10 -5 C-6 -17 -3 -31 -1 -53 M10 -5 C6 -17 3 -31 1 -53" stroke="#8a6a4f" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M-7 -11 Q0 -17 7 -11" stroke="#8a6a4f" strokeWidth={2} fill="none" />
      <path d="M-8 -15 H8 M-5 -31 H5 M-2.5 -45 H2.5" stroke="#6e5440" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-6 -21 L4 -29 M6 -21 L-4 -29 M-3 -35 L2 -43 M3 -35 L-2 -43" stroke="#8a6a4f" strokeWidth={0.9} />
      <path d="M0 -53 V-60" stroke="#6e5440" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  ),
  mont_saint_michel: (
    <g>
      <ellipse cx={0} cy={6} rx={60} ry={27} fill="#2f5d2a" opacity={0.14} />
      <ellipse cx={0} cy={0} rx={54} ry={25} fill="#cfe6ef" />
      <path d="M-46 2 Q-32 -26 -9 -40 Q6 -48 21 -38 Q41 -22 48 2 Q0 16 -46 2 Z" fill="#9a8f7e" />
      <path d="M-46 2 Q0 16 48 2 L44 6 Q0 20 -42 6 Z" fill="#7d7364" />
      <path d="M-42 0 Q0 12 44 0" stroke="#c9c1b3" strokeWidth={4} fill="none" />
      <rect x={-34} y={-12} width={10} height={9} fill="#e8dfcf" />
      <path d="M-35 -12 l6 -5 l6 5 z" fill="#5b6a73" />
      <rect x={-20} y={-24} width={10} height={9} fill="#e8dfcf" />
      <path d="M-21 -24 l6 -5 l6 5 z" fill="#5b6a73" />
      <rect x={20} y={-20} width={10} height={9} fill="#e8dfcf" />
      <path d="M19 -20 l6 -5 l6 5 z" fill="#5b6a73" />
      <g transform="translate(4 0)">
        <IsoBox w={16} h={16} lift={38} left="#e8dfcf" right="#d4c9b4" top="#fbf6ec" />
        <IsoRoof w={18} h={9} lift={54} left="#5b6a73" right="#4a5760" />
      </g>
      <path d="M1 -64 L4 -96 L7 -64 Z" fill="#5b6a73" />
      <circle cx={4} cy={-98} r={2} fill="#d4a72c" />
    </g>
  ),
};
