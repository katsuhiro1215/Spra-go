import type { ReactNode } from "react";

// 原点(0,0)がマスの中心(地面に接する点)。Blender製の画像に差し替えるときはこのファイルだけ直す
const ART: Record<string, ReactNode> = {
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
  return <>{(assetKey && ART[assetKey]) ?? FALLBACK}</>;
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
  return (
    <svg viewBox="-34 -62 68 72" width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
