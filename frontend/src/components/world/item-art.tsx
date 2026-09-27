import type { ReactNode } from "react";

import { SPRU_BLOOM } from "@/components/spru/spru-assets";

import { isBigAsset, type ItemArtKey } from "./art-keys";
import { LandmarkArt } from "./landmark-art";

// 原点を中心にした、横の半幅 w・高さ h の箱を、地面から lift 持ち上げて描く(左の面・右の面・上の面)
function IsoBox({ w, h, lift = 0, left, right, top }: { w: number; h: number; lift?: number; left: string; right: string; top: string }) {
  const b = -lift;
  const q = w / 2;
  return (
    <>
      <polygon points={`${-w},${b} 0,${b + q} 0,${b + q - h} ${-w},${b - h}`} fill={left} />
      <polygon points={`0,${b + q} ${w},${b} ${w},${b - h} 0,${b + q - h}`} fill={right} />
      <polygon points={`${-w},${b - h} 0,${b + q - h} ${w},${b - h} 0,${b - q - h}`} fill={top} />
    </>
  );
}

// 原点を中心にした、横の半幅 w・高さ h の四角すいの屋根を、地面から lift 持ち上げて描く
function IsoRoof({ w, h, lift = 0, left, right }: { w: number; h: number; lift?: number; left: string; right: string }) {
  const b = -lift;
  const q = w / 2;
  return (
    <>
      <polygon points={`${-w},${b} 0,${b + q} 0,${b - h}`} fill={left} />
      <polygon points={`0,${b + q} ${w},${b} 0,${b - h}`} fill={right} />
    </>
  );
}

// 原点(0,0)がマスの中心(地面に接する点)。Blender製の画像に差し替えるときはこのファイルだけ直す
const ART: Record<ItemArtKey | "spru_flower", ReactNode> = {
  // 種から咲いた「スプルの花」(非売品)。花は素材集の切り抜き
  spru_flower: (
    <g>
      <ellipse cx={0} cy={2} rx={11} ry={4.5} fill="#2f5d2a" opacity={0.15} />
      <path d="M0 2 C-1.5 -8 1.5 -14 0 -22" stroke="#5a9e3a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <ellipse cx={-5} cy={-9} rx={5} ry={2.4} fill="#74b35d" transform="rotate(-25 -5 -9)" />
      <ellipse cx={5} cy={-14} rx={5} ry={2.4} fill="#86c56d" transform="rotate(25 5 -14)" />
      <image href={SPRU_BLOOM.flower.src} x={-11} y={-36} width={22} height={26} />
    </g>
  ),
  bench: (
    <g transform="translate(-32 -52)">
      <ellipse cx={33} cy={55} rx={19} ry={5} fill="#2f5d2a" opacity={0.15} />
      <polygon points="24,40 50,53 50,44 24,31" fill="#b97b4c" />
      <polygon points="24,31 50,44 50,42 24,29" fill="#d9a06c" />
      <path d="M19 46 v7 M41 57 v4 M47 54 v4" stroke="#6e472b" strokeWidth={2.4} strokeLinecap="round" />
      <polygon points="16,44 42,57 50,53 24,40" fill="#dba56f" />
      <polygon points="16,44 42,57 42,60 16,47" fill="#a8703f" />
      <polygon points="42,57 50,53 50,56 42,60" fill="#8e5c33" />
    </g>
  ),
  flowerbed: (
    <g>
      <polygon points="-20,0 0,10 0,5 -20,-5" fill="#b27a4f" />
      <polygon points="0,10 20,0 20,-5 0,5" fill="#945f3a" />
      <polygon points="-20,-5 0,5 20,-5 0,-15" fill="#7a5a3c" />
      <circle cx={-10} cy={-5} r={2.6} fill="#f48aa4" />
      <circle cx={-3} cy={-8.5} r={2.6} fill="#ffd35c" />
      <circle cx={4} cy={-4.5} r={2.6} fill="#f48aa4" />
      <circle cx={10} cy={-6.5} r={2.6} fill="#b58cf0" />
      <circle cx={-2} cy={-1.5} r={2.6} fill="#ff9d5c" />
      <circle cx={3} cy={-11} r={2.4} fill="#b58cf0" />
      <circle cx={-7} cy={-9.5} r={1.8} fill="#6fbf5a" />
      <circle cx={8} cy={-1.5} r={1.8} fill="#6fbf5a" />
    </g>
  ),
  chochin: (
    <g transform="translate(-32 -52)">
      <ellipse cx={32} cy={54} rx={9} ry={3.5} fill="#2f5d2a" opacity={0.15} />
      <rect x={30.5} y={16} width={3} height={38} rx={1.2} fill="#6e472b" />
      <path d="M32 18 h10" stroke="#6e472b" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={41} cy={32} r={13} fill="#ffd98a" opacity={0.4} />
      <path d="M41 18 v4" stroke="#3b3226" strokeWidth={1.4} />
      <ellipse cx={41} cy={32} rx={7.5} ry={9.5} fill="#e5533f" />
      <path d="M34.2 28 h13.6 M33.6 32 h14.8 M34.2 36 h13.6" stroke="#c2402c" strokeWidth={1.1} />
      <rect x={37.5} y={21.5} width={7} height={2.8} rx={1} fill="#3b3226" />
      <rect x={37.5} y={40} width={7} height={2.8} rx={1} fill="#3b3226" />
    </g>
  ),
  tree: (
    <g>
      <ellipse cx={0} cy={2} rx={15} ry={6.5} fill="#2f5d2a" opacity={0.16} />
      <rect x={-2.6} y={-18} width={5.2} height={19} rx={2} fill="#9b6a45" />
      <circle cx={-7} cy={-24} r={10} fill="#57a45c" />
      <circle cx={7} cy={-24} r={10} fill="#4f9a55" />
      <circle cx={0} cy={-33} r={12} fill="#69b86b" />
      <circle cx={-4} cy={-37} r={5.5} fill="#8ccf85" />
    </g>
  ),
  sakura: (
    <g>
      <ellipse cx={0} cy={2} rx={16} ry={6.5} fill="#2f5d2a" opacity={0.16} />
      <rect x={-2.6} y={-18} width={5.2} height={19} rx={2} fill="#8a5a40" />
      <circle cx={-8} cy={-24} r={10.5} fill="#e38aa3" />
      <circle cx={8} cy={-24} r={10.5} fill="#dc7f9a" />
      <circle cx={0} cy={-34} r={13} fill="#f0a3b9" />
      <circle cx={-5} cy={-39} r={5.5} fill="#fbd3de" />
      <circle cx={-14} cy={0} r={1.5} fill="#f0a3b9" />
      <circle cx={12} cy={3} r={1.3} fill="#f0a3b9" />
    </g>
  ),
  vending: (
    <g>
      <ellipse cx={0} cy={2} rx={14} ry={6} fill="#2f5d2a" opacity={0.14} />
      <polygon points="-12,0 0,6 0,-18 -12,-24" fill="#e4583f" />
      <polygon points="0,6 12,0 12,-24 0,-18" fill="#bf432d" />
      <polygon points="-12,-24 0,-18 12,-24 0,-30" fill="#f07b63" />
      <polygon points="-11,-11.5 -1,-6.5 -1,-15.5 -11,-20.5" fill="#eaf6fa" />
      <circle cx={-9} cy={-14.7} r={1.3} fill="#3f8fd0" />
      <circle cx={-6} cy={-13.2} r={1.3} fill="#f2b632" />
      <circle cx={-3} cy={-11.7} r={1.3} fill="#5bb33e" />
      <circle cx={-9} cy={-18} r={1.3} fill="#e5533f" />
      <circle cx={-6} cy={-16.5} r={1.3} fill="#3f8fd0" />
      <circle cx={-3} cy={-15} r={1.3} fill="#f2b632" />
      <polygon points="-9,-1.5 -3,1.5 -3,-1.5 -9,-4.5" fill="#3a2e2a" />
    </g>
  ),
  bicycle: (
    <g transform="translate(-32 -52)">
      <ellipse cx={33} cy={55} rx={21} ry={4} fill="#2f5d2a" opacity={0.15} />
      <circle cx={19} cy={45} r={8.5} fill="none" stroke="#3b3226" strokeWidth={2.6} />
      <circle cx={46} cy={45} r={8.5} fill="none" stroke="#3b3226" strokeWidth={2.6} />
      <path
        d="M19 45 L27 32 L40 32 L46 45 M27 32 L32 45 L19 45 M32 45 L40 32"
        stroke="#e5533f"
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M40 32 L38 26 L43.5 25" stroke="#3b3226" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <path d="M26 32 L25 28.5" stroke="#3b3226" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M22 28 h6.5" stroke="#3b3226" strokeWidth={3.2} strokeLinecap="round" />
      <rect x={42.5} y={27} width={11} height={7.5} rx={2} fill="#d9a06c" stroke="#a8703f" strokeWidth={1.2} />
    </g>
  ),
  stall: (
    <g transform="translate(-32 -52)">
      <ellipse cx={32} cy={55} rx={22} ry={4.5} fill="#2f5d2a" opacity={0.15} />
      <rect x={15} y={22} width={3} height={18} fill="#8e5c33" />
      <rect x={46} y={22} width={3} height={18} fill="#8e5c33" />
      <rect x={11} y={15} width={42} height={9} rx={2} fill="#fff4e6" />
      <rect x={11} y={15} width={7} height={9} fill="#e5533f" />
      <rect x={25} y={15} width={7} height={9} fill="#e5533f" />
      <rect x={39} y={15} width={7} height={9} fill="#e5533f" />
      <path d="M11 24 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 z" fill="#fff4e6" />
      <rect x={13} y={38} width={38} height={12} rx={2} fill="#d9a06c" />
      <rect x={13} y={38} width={38} height={3} fill="#b97b4c" />
      <rect x={24} y={41.5} width={16} height={7} rx={1.5} fill="#3f6fa0" />
      <circle cx={20} cy={52} r={4} fill="#6e472b" />
      <circle cx={44} cy={52} r={4} fill="#6e472b" />
      <ellipse cx={49.5} cy={30.5} rx={3.5} ry={4.5} fill="#e5533f" />
    </g>
  ),
  stone_lantern: <LandmarkArt landmarkKey="stone_lantern" />,
  bamboo: (
    <g>
      <ellipse cx={0} cy={2} rx={14} ry={5} fill="#2f5d2a" opacity={0.15} />
      <path d="M-7 2 V-42 M1 4 V-54 M8 1 V-36" stroke="#6fae4a" strokeWidth={3.4} strokeLinecap="round" />
      <path
        d="M-8.7 -14 h3.4 M-8.7 -28 h3.4 M-0.7 -18 h3.4 M-0.7 -36 h3.4 M6.3 -12 h3.4 M6.3 -24 h3.4"
        stroke="#4e8a32"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <ellipse cx={-13} cy={-40} rx={6.5} ry={2.3} fill="#7cc35a" transform="rotate(-24 -13 -40)" />
      <ellipse cx={7} cy={-52} rx={6.5} ry={2.3} fill="#86c56d" transform="rotate(22 7 -52)" />
      <ellipse cx={-5} cy={-48} rx={5.5} ry={2} fill="#6fae4a" transform="rotate(-30 -5 -48)" />
      <ellipse cx={14} cy={-34} rx={6} ry={2.2} fill="#7cc35a" transform="rotate(26 14 -34)" />
    </g>
  ),
  palm: (
    <g>
      <ellipse cx={0} cy={2} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <path d="M0 2 C3 -14 -3 -30 4 -46" stroke="#a8703f" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M-2 -8 h4.5 M-1 -18 h4.5 M-0.5 -28 h4.5 M1 -38 h4.5" stroke="#8e5c33" strokeWidth={1.2} />
      <path d="M4 -46 Q-8 -54 -20 -44 Q-8 -49 4 -46 Z" fill="#4fa35a" />
      <path d="M4 -46 Q16 -54 28 -44 Q16 -49 4 -46 Z" fill="#5cb866" />
      <path d="M4 -46 Q-4 -60 -14 -62 Q-4 -55 4 -46 Z" fill="#5cb866" />
      <path d="M4 -46 Q12 -60 22 -62 Q12 -55 4 -46 Z" fill="#4fa35a" />
      <circle cx={1.5} cy={-43} r={2.6} fill="#8e5c33" />
      <circle cx={6.5} cy={-42.5} r={2.6} fill="#7a4e2c" />
    </g>
  ),
  parasol: (
    <g>
      <ellipse cx={0} cy={2} rx={15} ry={5.5} fill="#2f5d2a" opacity={0.13} />
      <polygon points="-16,1 -2,8 10,2 -4,-5" fill="#5aa9e6" />
      <path d="M-13 1.5 L-1 7.5 M-9 -0.5 L3 5.5" stroke="#fff4e6" strokeWidth={1.2} />
      <path d="M2 4 L-1 -34" stroke="#e8dfcf" strokeWidth={2} strokeLinecap="round" />
      <path d="M-21 -30 Q-12 -46 -1 -46 L-1 -30 Z" fill="#e5533f" />
      <path d="M-1 -46 Q11 -46 19 -30 L-1 -30 Z" fill="#fff4e6" />
      <path d="M-11 -30 Q-8 -44 -1 -46 Q5 -44 8 -30 Z" fill="#f6c342" />
      <path
        d="M-21 -30 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0"
        fill="none"
        stroke="#c9432f"
        strokeWidth={1.2}
      />
      <circle cx={-1} cy={-47} r={1.8} fill="#c9432f" />
    </g>
  ),
  fountain: (
    <g>
      <ellipse cx={0} cy={6} rx={54} ry={25} fill="#2f5d2a" opacity={0.14} />
      <ellipse cx={0} cy={0} rx={46} ry={21} fill="#a39b8d" />
      <rect x={-46} y={-9} width={92} height={9} fill="#b8b0a2" />
      <ellipse cx={0} cy={-9} rx={46} ry={21} fill="#d6cfc1" />
      <ellipse cx={0} cy={-9} rx={39} ry={17} fill="#62b8d6" />
      <ellipse cx={-10} cy={-13} rx={15} ry={4.5} fill="#a8e2f2" opacity={0.8} />
      <rect x={-5} y={-40} width={10} height={31} fill="#c9c1b3" />
      <ellipse cx={0} cy={-40} rx={15} ry={6.5} fill="#d6cfc1" />
      <ellipse cx={0} cy={-41} rx={11} ry={4.5} fill="#62b8d6" />
      <path
        d="M0 -44 C-3 -60 -15 -60 -21 -42 M0 -44 C3 -60 15 -60 21 -42 M0 -44 V-64"
        stroke="#bfe9f5"
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={-23} cy={-24} r={1.8} fill="#e6f7fb" />
      <circle cx={24} cy={-22} r={1.8} fill="#e6f7fb" />
      <circle cx={-4} cy={-68} r={1.6} fill="#e6f7fb" />
    </g>
  ),
  pagoda: (
    <g>
      <ellipse cx={0} cy={6} rx={48} ry={22} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={34} h={6} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <IsoBox w={20 - i * 2.5} h={11} lift={6 + i * 17} left="#e0573e" right="#c94a33" top="#e0573e" />
          <IsoBox w={33 - i * 2.5} h={3} lift={17 + i * 17} left="#4a3f3a" right="#3a2e2a" top="#5b4f49" />
        </g>
      ))}
      <path d="M0 -92 V-120" stroke="#d4a72c" strokeWidth={2.4} />
      <path d="M-3 -100 h6 M-3 -106 h6 M-3 -112 h6" stroke="#d4a72c" strokeWidth={1.6} />
      <circle cx={0} cy={-121} r={2.4} fill="#d4a72c" />
    </g>
  ),
  castle: (
    <g>
      <ellipse cx={0} cy={6} rx={56} ry={25} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={46} h={16} left="#a39b8d" right="#8f887b" top="#b8b0a2" />
      <IsoBox w={32} h={22} lift={16} left="#fbf6ec" right="#e8dfcf" top="#fbf6ec" />
      <polygon points="-22.4,-18.2 -17.6,-15.8 -17.6,-22.8 -22.4,-25.2" fill="#3a2e2a" />
      <polygon points="-12.8,-13.4 -8,-11 -8,-18 -12.8,-20.4" fill="#3a2e2a" />
      <polygon points="9.6,-11.8 14.4,-14.2 14.4,-21.2 9.6,-18.8" fill="#3a2e2a" />
      <polygon points="19.2,-16.6 24,-19 24,-26 19.2,-23.6" fill="#3a2e2a" />
      <IsoBox w={40} h={4} lift={38} left="#3f5a66" right="#324a55" top="#4f6d7a" />
      <IsoBox w={22} h={18} lift={42} left="#fbf6ec" right="#e8dfcf" top="#fbf6ec" />
      <IsoRoof w={30} h={22} lift={60} left="#3f5a66" right="#324a55" />
      <path d="M-3 -84 l-3 -5 M3 -84 l3 -5" stroke="#d4a72c" strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  tower: (
    <g>
      <ellipse cx={0} cy={6} rx={42} ry={19} fill="#2f5d2a" opacity={0.14} />
      <path
        d="M-34 0 L-5 -96 M34 0 L5 -96 M-14 12 L-2 -96 M14 12 L2 -96"
        stroke="#e5533f"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M-30 -14 L22 -40 M30 -14 L-22 -40 M-20 -48 L14 -70 M20 -48 L-14 -70" stroke="#e5533f" strokeWidth={1.6} />
      <path d="M-27 -24 H27 M-17 -58 H17 M-10 -80 H10" stroke="#fff4e6" strokeWidth={3} strokeLinecap="round" />
      <IsoBox w={18} h={7} lift={48} left="#e8dfcf" right="#d4c9b4" top="#fbf6ec" />
      <IsoBox w={9} h={5} lift={96} left="#e8dfcf" right="#d4c9b4" top="#fbf6ec" />
      <path d="M0 -106 V-140" stroke="#e5533f" strokeWidth={3} strokeLinecap="round" />
      <path d="M0 -118 V-128" stroke="#fff4e6" strokeWidth={3} />
      <circle cx={0} cy={-141} r={2.4} fill="#ffd35c" />
    </g>
  ),
};

// 夜に光るアイテムの光の輪(原点=マスの中心)。絵を差し替えるときは位置も合わせて直す
export const ITEM_LIGHTS: Record<string, { cx: number; cy: number; r: number }> = {
  chochin: { cx: 9, cy: -20, r: 15 },
  stone_lantern: { cx: 0, cy: -20.5, r: 11 },
  tower: { cx: 0, cy: -141, r: 9 },
};

// 絵が未登録のキーでも画面が壊れないようにする代わりの絵(プレゼント箱)
const FALLBACK: ReactNode = (
  <g>
    <ellipse cx={0} cy={2} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
    <polygon points="-12,-2 0,4 0,-12 -12,-18" fill="#f2b632" />
    <polygon points="0,4 12,-2 12,-18 0,-12" fill="#d4960e" />
    <polygon points="-12,-18 0,-12 12,-18 0,-24" fill="#ffd35c" />
    <path d="M-6 -21 L6 -15 M0 -12 V4" stroke="#e5533f" strokeWidth={2} />
  </g>
);

export function ItemArt({ assetKey }: { assetKey: string | null }) {
  return <>{(assetKey && (ART as Record<string, ReactNode>)[assetKey]) ?? FALLBACK}</>;
}

export function ItemIcon({
  assetKey,
  size = 56,
  className,
}: {
  assetKey: string | null;
  size?: number;
  className?: string;
}) {
  // 2×2の建物は4マスぶん横に広く、タワーは高いので、広い範囲で描く
  const viewBox = isBigAsset(assetKey) ? "-70 -150 140 180" : "-34 -62 68 72";
  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
