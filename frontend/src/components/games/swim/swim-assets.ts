// tools/spru-swim/build_assets.py が作る。手で書き換えない
export type SwimAsset = { src: string; width: number; height: number };

export const SWIM_ASSETS = {
  "swim-a": { src: "/games/spru-swim/swim-a.webp", width: 304, height: 260 },
  "swim-b": { src: "/games/spru-swim/swim-b.webp", width: 311, height: 262 },
  "rise": { src: "/games/spru-swim/rise.webp", width: 211, height: 320 },
  "hit": { src: "/games/spru-swim/hit.webp", width: 266, height: 320 },
  "jellyfish": { src: "/games/spru-swim/jellyfish.webp", width: 186, height: 220 },
  "urchin": { src: "/games/spru-swim/urchin.webp", width: 180, height: 190 },
  "octopus": { src: "/games/spru-swim/octopus.webp", width: 268, height: 210 },
  "shark": { src: "/games/spru-swim/shark.webp", width: 378, height: 230 },
  "crab": { src: "/games/spru-swim/crab.webp", width: 286, height: 190 },
  "squid": { src: "/games/spru-swim/squid.webp", width: 210, height: 220 },
  "coin": { src: "/games/spru-swim/coin.webp", width: 87, height: 90 },
  "big-coin": { src: "/games/spru-swim/big-coin.webp", width: 104, height: 110 },
  "bg-surface": { src: "/games/spru-swim/bg-surface.webp", width: 1024, height: 1536 },
  "bg-midwater": { src: "/games/spru-swim/bg-midwater.webp", width: 1414, height: 1024 },
  "bg-seabed": { src: "/games/spru-swim/bg-seabed.webp", width: 1999, height: 724 },
} as const satisfies Record<string, SwimAsset>;
