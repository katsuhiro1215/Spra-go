import type { Ground } from "./types";

/** 町の地面の絵(設計書 2026-10-05-town-blend 3章)。つなぎ目を消した512pxの正方形で、4×4マスをおおう */
export type GroundArt = { src: string; size: number };

export type GroundArtKey = Ground | "path" | "grove" | "meadow";

/**
 * 絵がある地面だけ書く(tools/ground-assets/make_ground.py が frontend/public/spru/ground/ に出す)。
 * 書いていない地面は、今のマスごとの市松で描く。絵が届いたら、ここに1行足す
 */
export const GROUND_ART: Partial<Record<GroundArtKey, GroundArt>> = {
  grass: { src: "/spru/ground/grass_town.webp", size: 512 },
  path: { src: "/spru/ground/path.webp", size: 512 },
};

/** 地面の上にばらまく小物(真上から見た絵)。シートが届いたら足す。空なら、小物は出ない */
export type GroundDecal = { src: string; width: number; height: number };

export const GROUND_DECALS: GroundDecal[] = [];
