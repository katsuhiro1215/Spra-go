// tools/spru-run/build_assets.py が作る。手で書き換えない
export type RunAsset = { src: string; width: number; height: number };

export const RUN_ASSETS = {
  "run-a": { src: "/games/spru-run/run-a.webp", width: 158, height: 260 },
  "run-b": { src: "/games/spru-run/run-b.webp", width: 156, height: 257 },
  "jump": { src: "/games/spru-run/jump.webp", width: 160, height: 250 },
  "double-jump": { src: "/games/spru-run/double-jump.webp", width: 168, height: 245 },
  "triple-jump": { src: "/games/spru-run/triple-jump.webp", width: 172, height: 266 },
  "hit": { src: "/games/spru-run/hit.webp", width: 206, height: 266 },
  "rock": { src: "/games/spru-run/rock.webp", width: 362, height: 220 },
  "stump": { src: "/games/spru-run/stump.webp", width: 340, height: 220 },
  "puddle": { src: "/games/spru-run/puddle.webp", width: 491, height: 80 },
  "bush": { src: "/games/spru-run/bush.webp", width: 252, height: 420 },
  "fence": { src: "/games/spru-run/fence.webp", width: 336, height: 420 },
  "seed": { src: "/games/spru-run/seed.webp", width: 84, height: 96 },
  "golden-seed": { src: "/games/spru-run/golden-seed.webp", width: 85, height: 96 },
  "silver-seed": { src: "/games/spru-run/silver-seed.webp", width: 87, height: 96 },
  "bee": { src: "/games/spru-run/bee.webp", width: 187, height: 150 },
  "mushroom": { src: "/games/spru-run/mushroom.webp", width: 284, height: 230 },
  "hedgehog": { src: "/games/spru-run/hedgehog.webp", width: 267, height: 190 },
  "bg-sky": { src: "/games/spru-run/bg-sky.webp", width: 900, height: 624 },
  "bg-hills": { src: "/games/spru-run/bg-hills.webp", width: 1400, height: 1014 },
  "bg-meadow": { src: "/games/spru-run/bg-meadow.webp", width: 1400, height: 1014 },
  "bg-ground": { src: "/games/spru-run/bg-ground.webp", width: 1400, height: 335 },
} as const satisfies Record<string, RunAsset>;

/** 床の絵。左のはし(capWidth px)・まんなか(横にのばす)・右のはしの3枚(`<src>-l/-m/-r.webp`)。height は絵の高さ(px)、topInset は、絵の上から、平らな上の面までの割合 */
export const PLATFORM_ART = {
  grass: { src: "/games/spru-run/platform-grass", height: 170, capWidth: 150, topInset: 0.224 },
  cloud: { src: "/games/spru-run/platform-cloud", height: 127, capWidth: 150, topInset: 0.11 },
} as const;
