import type { ReactNode } from "react";

// 原点(0,0)がマスの中心。最初から町にある、動かせない目印。lit は夜に明かりがともっているとき
const ART: Record<string, (lit: boolean) => ReactNode> = {
  spru_house: (lit) => {
    const glass = lit ? "#ffe08a" : "#9fd6e6";
    return (
      <g>
        <ellipse cx={0} cy={4} rx={30} ry={12} fill="#2f5d2a" opacity={0.15} />
        <polygon points="-24,0 0,12 0,-14 -24,-26" fill="#fbf1dc" />
        <polygon points="0,12 24,0 24,-26 12,-38 0,-14" fill="#e8d4b0" />
        <polygon points="-16,4 -8,8 -8,-6 -16,-10" fill="#b8734c" />
        <circle cx={-9.8} cy={0.6} r={0.9} fill="#f6d08a" />
        <polygon points="-23,-9.5 -19,-7.5 -19,-15.5 -23,-17.5" fill={glass} stroke="#fffaf0" strokeWidth={1} />
        <polygon points="-6,-1 -2,1 -2,-7 -6,-9" fill={glass} stroke="#fffaf0" strokeWidth={1} />
        <polygon points="8,-4 16,-8 16,-16 8,-12" fill={glass} stroke="#fffaf0" strokeWidth={1.2} />
        <polygon points="7,-2.5 17,-7.5 17,-5.5 7,-0.5" fill="#8c5a3c" />
        <circle cx={9} cy={-3.6} r={1.5} fill="#f48ba5" />
        <circle cx={12} cy={-5.1} r={1.5} fill="#ffd35c" />
        <circle cx={15} cy={-6.6} r={1.5} fill="#f48ba5" />
        <polygon points="-28,-24.6 1.4,-10 14.7,-36.7 -14.7,-51.3" fill="#e5795d" />
        <path
          d="M-24.7 -31.3 L4.7 -16.7 M-21.4 -38 L8.1 -23.4 M-18 -44.6 L11.4 -30"
          stroke="#cf6549"
          strokeWidth={1.1}
          opacity={0.7}
        />
        <polygon points="-14.7,-51.3 14.7,-36.7 14,-34.4 -15.4,-49" fill="#f39c82" />
        <polygon points="1.4,-10 14.7,-36.7 14.7,-33.2 2.8,-8.4" fill="#c25f45" />
        <polygon points="14.7,-36.7 27.5,-24.5 27.5,-21.3 14.7,-33.2" fill="#c25f45" />
      </g>
    );
  },
  torii: () => (
    <g>
      <ellipse cx={0} cy={1} rx={18} ry={6} fill="#2f5d2a" opacity={0.13} />
      <polygon points="-12,-6 -8,-4 -8,-42 -12,-44" fill="#e0573e" />
      <polygon points="8,4 12,6 12,-32 8,-34" fill="#c94a33" />
      <polygon points="-12,-6 -8,-4 -8,-8 -12,-10" fill="#3a2e2a" />
      <polygon points="8,4 12,6 12,2 8,0" fill="#3a2e2a" />
      <polygon points="-13,-34.5 13,-21.5 13,-24.5 -13,-37.5" fill="#cf4a33" />
      <polygon points="-17,-44.5 17,-27.5 17,-31.5 -17,-48.5" fill="#e0573e" />
      <polygon points="-19,-49.5 19,-30.5 20,-33 -20,-53" fill="#3a2e2a" />
    </g>
  ),
  stone_lantern: (lit) => (
    <g>
      <ellipse cx={0} cy={1} rx={8} ry={3.5} fill="#2f5d2a" opacity={0.14} />
      <rect x={-5} y={-4} width={10} height={4} rx={1} fill="#b8b0a2" />
      <rect x={-2} y={-14} width={4} height={10} fill="#c9c1b3" />
      <rect x={-6} y={-17} width={12} height={3} rx={1} fill="#b8b0a2" />
      <rect x={-4.5} y={-24} width={9} height={7} rx={1} fill="#d6cfc1" />
      <rect x={-2.2} y={-22.5} width={4.4} height={4} fill={lit ? "#fff0b8" : "#ffd98a"} />
      <polygon points="-8,-24 0,-30 8,-24" fill="#a39b8d" />
      <circle cx={0} cy={-31} r={1.6} fill="#a39b8d" />
      {lit && <circle cx={0} cy={-20.5} r={11} fill="#ffd98a" opacity={0.45} />}
    </g>
  ),
  bamboo_grove: () => (
    <g>
      <ellipse cx={0} cy={2} rx={20} ry={8} fill="#2f5d2a" opacity={0.16} />
      <path
        d="M-14 0 V-50 M-6 4 V-64 M3 -2 V-58 M11 3 V-70 M17 -1 V-46"
        stroke="#5f9f3f"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <path
        d="M-15.7 -18 h3.4 M-7.7 -24 h3.4 M1.3 -20 h3.4 M9.3 -28 h3.4 M15.3 -16 h3.4 M-7.7 -44 h3.4 M9.3 -50 h3.4"
        stroke="#437a2b"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <ellipse cx={-18} cy={-48} rx={7} ry={2.4} fill="#7cc35a" transform="rotate(-25 -18 -48)" />
      <ellipse cx={-2} cy={-62} rx={7} ry={2.4} fill="#86c56d" transform="rotate(20 -2 -62)" />
      <ellipse cx={7} cy={-56} rx={6} ry={2.2} fill="#6fae4a" transform="rotate(-20 7 -56)" />
      <ellipse cx={16} cy={-68} rx={7} ry={2.4} fill="#7cc35a" transform="rotate(25 16 -68)" />
      <ellipse cx={21} cy={-44} rx={6} ry={2.2} fill="#86c56d" transform="rotate(20 21 -44)" />
      <ellipse cx={-9} cy={-58} rx={6} ry={2.2} fill="#6fae4a" transform="rotate(-30 -9 -58)" />
    </g>
  ),
  // 桟橋は、マスから左手前(yが大きくなる向き)の海へ伸びる
  pier: () => (
    <g>
      <polygon points="19.2,0 -41.6,30.4 -41.6,34.4 19.2,4" fill="#8e5c33" />
      <polygon points="0,-9.6 19.2,0 -41.6,30.4 -60.8,20.8" fill="#c8915c" />
      <path
        d="M-12.16 -3.52 L7.04 6.08 M-24.32 2.56 L-5.12 12.16 M-36.48 8.64 L-17.28 18.24 M-48.64 14.72 L-29.44 24.32"
        stroke="#a8703f"
        strokeWidth={1}
      />
      <path d="M-41.6 30.4 v10 M-60.8 20.8 v10 M-20 19.6 v8" stroke="#6e472b" strokeWidth={2.6} strokeLinecap="round" />
    </g>
  ),
};

export function LandmarkArt({ landmarkKey, lit = false }: { landmarkKey: string; lit?: boolean }) {
  return <>{ART[landmarkKey]?.(lit) ?? null}</>;
}
