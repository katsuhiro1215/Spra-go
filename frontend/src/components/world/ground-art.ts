import type { Ground } from "./types";

/** 町の地面の絵(設計書 2026-10-05-town-blend 3章)。つなぎ目を消した512pxの正方形で、4×4マスをおおう */
export type GroundArt = { src: string; size: number };

export type GroundArtKey = Ground | "path" | "grove" | "meadow" | "road_id" | "road_kr" | "road_us" | "road_gb" | "road_fr";

/**
 * 絵がある地面だけ書く(tools/ground-assets/make_ground.py が frontend/public/spru/ground/ に出す)。
 * 書いていない地面は、今のマスごとの市松で描く。絵が届いたら、ここに1行足す
 */
export const GROUND_ART: Partial<Record<GroundArtKey, GroundArt>> = {
  grass: { src: "/spru/ground/grass_town.webp", size: 512 },
  bamboo: { src: "/spru/ground/grass_bamboo.webp", size: 512 },
  sand: { src: "/spru/ground/sand.webp", size: 512 },
  hill: { src: "/spru/ground/hill.webp", size: 512 },
  path: { src: "/spru/ground/path.webp", size: 512 },
  grove: { src: "/spru/ground/grove.webp", size: 512 },
  meadow: { src: "/spru/ground/meadow.webp", size: 512 },
  // 国の道(旅した国の道を、町の道に選べる。docs/design/2026-10-05-road-style-design.md)。キーは road_{旅の行き先のキー}
  road_id: { src: "/spru/ground/road_id.webp", size: 512 },
  road_kr: { src: "/spru/ground/road_kr.webp", size: 512 },
  road_us: { src: "/spru/ground/road_us.webp", size: 512 },
  road_gb: { src: "/spru/ground/road_gb.webp", size: 512 },
  road_fr: { src: "/spru/ground/road_fr.webp", size: 512 },
};

/** 地面の上にばらまく小物(草・草・小花・小石・落ち葉・クローバーの順。tools/ground-assets/make_ground.py が切り出す)。空なら、小物は出ない */
export type GroundDecal = { src: string; width: number; height: number };

export const GROUND_DECALS: GroundDecal[] = [
  { src: "/spru/ground/decal_0.webp", width: 128, height: 128 },
  { src: "/spru/ground/decal_1.webp", width: 128, height: 115 },
  { src: "/spru/ground/decal_2.webp", width: 128, height: 116 },
  { src: "/spru/ground/decal_3.webp", width: 128, height: 110 },
  { src: "/spru/ground/decal_4.webp", width: 127, height: 128 },
  { src: "/spru/ground/decal_5.webp", width: 128, height: 112 },
];
