/** 宇宙ぼうけんマップとうちゅうずかんのAPIの返事の形(docs/design/2026-10-10-space-adventure-map-design.md 3-1) */
export type SpaceStop = {
  key: string;
  name: string;
  difficulty: "初級" | "中級" | "上級";
  color: string;
  note: string;
  open: boolean;
  cleared: boolean;
  /** いちばんよい星の評価(0〜3) */
  stars: number;
};

export type SpaceMapState = { stops: SpaceStop[]; current: string };

export type SpaceNewCard = { key: string; name: string | null; image: string };

/** 地図から始めた回の、終わったときの返事(finish の map) */
export type SpaceMapResult = {
  stop: string;
  cleared: boolean;
  stars: number;
  best_stars: number;
  first_clear: boolean;
  unlocked: string | null;
  bonus: { xp: number; point: number } | null;
  new_cards: SpaceNewCard[];
};

export type SpaceCard = { key: string; name: string | null; image: string; unlocked: boolean };
