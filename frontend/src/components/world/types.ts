import type { ZukanGift } from "@/lib/zukan";

import type { ItemCategory } from "./categories";

export type Tile = [number, number];

export type Landmark = {
  key: "spru_house" | "torii" | "stone_lantern" | "garden" | "bamboo_grove" | "pier";
  x: number;
  y: number;
  /** N×Nマス使う目印(Spruの家は2)。なければ1マス */
  footprint?: number;
};

export type WorldItem = {
  id: number;
  shop_item_id: number;
  name: string;
  asset_key: string | null;
  /** 使うマスの一辺。2なら (x, y) を奥のマスにして2×2(設計書3-4) */
  footprint: number;
  /** カテゴリ(設計書 2026-09-28-town-items 3章)。おみやげは souvenir */
  category: ItemCategory;
  /** 旅のおみやげか(F回の設計書4-4) */
  souvenir: boolean;
  x: number | null;
  y: number | null;
};

export type Ground = "grass" | "bamboo" | "sand" | "hill";

/** 土地の区画(設計書3-1)。unlocked はこの人のレベルで開いているか */
export type WorldPlot = {
  key: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  min_level: number;
  ground: Ground;
  unlocked: boolean;
};

export type WorldLand = {
  width: number;
  height: number;
  plots: WorldPlot[];
  /** landmarks・paths・blocked は開いている区画のものだけ */
  landmarks: Landmark[];
  paths: Tile[];
  blocked: Tile[];
  spru: { x: number; y: number };
};

export type WorldProfile = {
  id: number;
  points: number;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  coins: number;
  level_xp: { floor: number; next: number };
};

export type WorldData = {
  land: WorldLand;
  /** 町の道のデザイン。日本は 'jp'、旅した国は行き先のキー(設計書 2026-10-05-road-style) */
  road_style: string;
  items: WorldItem[];
  bag: WorldItem[];
  profile: WorldProfile;
  welcome_available: boolean;
  continue_stage_id: number | null;
  spru: { growth: number };
  garden: WorldGarden;
  companions: WorldCompanion[];
  review: WorldReview;
  errands: WorldErrands;
  greetings: WorldGreeting[];
  family_count: number;
  /** 開いたが、まだ祝っていない区画のキー(必要レベルの低い順) */
  plots_new: string[];
  /** 持っているチケットの数(docs/design/2026-09-28-travel-tickets-design.md 3-2) */
  tickets: number;
  /** この読み込みで新しくもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 5-2) */
  new_seeds: NewSeed[];
  /** この読み込みでレベルで会えた通常の仲間(docs/design/2026-10-08-town-growth-design.md 4-2) */
  new_companions: WorldCompanion[];
  /** 届いたが、まだ名所を選んでいない回のレベル(同 4-4) */
  gifts_pending: number[];
};

export type ShopListItem = {
  id: number;
  name: string;
  price: number;
  type: "potion" | "title" | "decoration";
  currency: "coin" | "point";
  min_level: number;
  asset_key: string | null;
  footprint: number;
  /** 町のアイテムのカテゴリ。回復薬・称号は null */
  category: ItemCategory | null;
  locked: boolean;
  meta: { heal?: number; asset_key?: string } | null;
};

export type GardenState = "empty" | "seed" | "sprout" | "sprout_big";

/** 種のふくろの中の特別な種(docs/design/2026-09-29-rare-spru-design.md 4-4) */
export type SeedBagItem = { key: string; name: string };

export type WorldGarden = {
  x: number;
  y: number;
  state: GardenState;
  /** 育っている種の見た目。spru(仲間の種もこれ)か、レアスプルの色。空の畑は null */
  look: string | null;
  waterings: number;
  learned_today: boolean;
  watered_today: boolean;
  /** スプルの種(レベルアップ3回)ができている */
  spru_seed_ready: boolean;
  seed_bag: SeedBagItem[];
  can_sow: boolean;
  can_water: boolean;
};

export type WorldCompanion = {
  key: string;
  name: string;
  official_name: string;
  nickname: string | null;
  trait: string;
  lines: string[];
  hearts: number;
  heart_label: string;
  bond: number;
  next_heart_bond: number | null;
  is_partner: boolean;
  rare: boolean;
  /** 町に立っている(false ならおうちで休んでいて、x・y は null) */
  in_town: boolean;
  x: number | null;
  y: number | null;
};

export type WorldReview = {
  available: boolean;
  count: number;
  giver: { kind: "companion" | "spru"; key: string | null; name: string };
};

/** 回答APIが返す相棒(設計書4-4) */
export type AnswerPartner = {
  key: string;
  name: string;
  hearts: number;
  heart_label: string;
  hearts_up: boolean;
  new_line: string | null;
};

export type NewSeed = { key: string; name: string; reason: string };

/** なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 4-5) */
export type RosterStatus = "born" | "growing" | "in_bag" | "waiting";
export type RosterCondition = { text: string; current: number; target: number; unit: string };
export type RosterMember = {
  key: string;
  name: string;
  rare: boolean;
  status: RosterStatus;
  in_town: boolean;
  is_partner: boolean;
  hearts: number;
  condition: RosterCondition | null;
};
export type RosterData = { town_limit: number; town_count: number; members: RosterMember[]; new_seeds: NewSeed[] };

export type BornResult = ({ kind: "companion" } & WorldCompanion) | { kind: "item"; world_item: WorldItem };

export type ErrandKind = "correct" | "stage_clear" | "water" | "review" | "decorate" | "family_greet";

/** 今日のおつかい(設計書4-4) */
export type WorldErrand = {
  slot: number;
  kind: ErrandKind;
  target: number;
  progress: number;
  claimed: boolean;
  giver: { kind: "spru" | "partner"; key: string | null; name: string };
};

export type WorldErrands = { date: string; items: WorldErrand[]; bonus: { amount: number; claimed: boolean; gift_left: number } };

export type ErrandClaimResult = {
  errands: WorldErrands;
  points: number;
  gained: { points: number; bonus: number; bond: number };
  partner: AnswerPartner | null;
  /** パン屋さんからのおくりもの(ずかん)。3つ目の受け取りで、まだ贈れる物があるときだけ */
  gift: ZukanGift | null;
};

/** 家族から届いた、まだ見ていないあいさつ */
export type WorldGreeting = { id: number; from: { id: number; name: string }; stamp: string; text: string; greeted_on: string };

export type FamilyMember = { id: number; name: string; level: number; greeted_today: boolean };

/** 家族の町(見るだけ)。ポイント・HP・バッグなどは含まない */
export type FamilyTown = {
  profile: { id: number; name: string; level: number };
  land: WorldLand;
  road_style: string;
  items: WorldItem[];
  spru: { growth: number };
  garden: Pick<WorldGarden, "x" | "y" | "state" | "look">;
  companions: WorldCompanion[];
  greeted_today: boolean;
};
