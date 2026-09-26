import type { ReactNode } from "react";

// 原点(0,0)がマスの中心。最初から町にある、動かせない目印
const ART: Record<string, ReactNode> = {
  spru_house: (
    <g>
      <ellipse cx={0} cy={4} rx={30} ry={12} fill="#2f5d2a" opacity={0.15} />
      <polygon points="-24,0 0,12 0,-14 -24,-26" fill="#fbf1dc" />
      <polygon points="0,12 24,0 24,-26 12,-38 0,-14" fill="#e8d4b0" />
      <polygon points="-16,4 -8,8 -8,-6 -16,-10" fill="#b8734c" />
      <circle cx={-9.8} cy={0.6} r={0.9} fill="#f6d08a" />
      <polygon points="-23,-9.5 -19,-7.5 -19,-15.5 -23,-17.5" fill="#9fd6e6" stroke="#fffaf0" strokeWidth={1} />
      <polygon points="-6,-1 -2,1 -2,-7 -6,-9" fill="#9fd6e6" stroke="#fffaf0" strokeWidth={1} />
      <polygon points="8,-4 16,-8 16,-16 8,-12" fill="#9fd6e6" stroke="#fffaf0" strokeWidth={1.2} />
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
  ),
  torii: (
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
  stone_lantern: (
    <g>
      <ellipse cx={0} cy={1} rx={8} ry={3.5} fill="#2f5d2a" opacity={0.14} />
      <rect x={-5} y={-4} width={10} height={4} rx={1} fill="#b8b0a2" />
      <rect x={-2} y={-14} width={4} height={10} fill="#c9c1b3" />
      <rect x={-6} y={-17} width={12} height={3} rx={1} fill="#b8b0a2" />
      <rect x={-4.5} y={-24} width={9} height={7} rx={1} fill="#d6cfc1" />
      <rect x={-2.2} y={-22.5} width={4.4} height={4} fill="#ffd98a" />
      <polygon points="-8,-24 0,-30 8,-24" fill="#a39b8d" />
      <circle cx={0} cy={-31} r={1.6} fill="#a39b8d" />
    </g>
  ),
};

export function LandmarkArt({ landmarkKey }: { landmarkKey: string }) {
  return <>{ART[landmarkKey] ?? null}</>;
}
