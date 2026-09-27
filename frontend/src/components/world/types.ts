export type Tile = [number, number];

export type Landmark = {
  key: "spru_house" | "torii" | "stone_lantern" | "garden" | "bamboo_grove" | "pier";
  x: number;
  y: number;
};

export type WorldItem = {
  id: number;
  shop_item_id: number;
  name: string;
  asset_key: string | null;
  /** 使うマスの一辺。2なら (x, y) を奥のマスにして2×2(設計書3-4) */
  footprint: number;
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
  /** 次の行き先のじゅんびがそろっていれば、その国(F回) */
  travel_ready: { key: string; name: string } | null;
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
  /** 旅のじゅんびに使うアイテム(ショップの「旅じたく」の札) */
  travel_gear: boolean;
  locked: boolean;
  meta: { heal?: number; asset_key?: string } | null;
};

export type GardenState = "empty" | "seed" | "sprout" | "sprout_big";

export type WorldGarden = {
  x: number;
  y: number;
  state: GardenState;
  waterings: number;
  learned_today: boolean;
  watered_today: boolean;
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

export type WorldErrands = { date: string; items: WorldErrand[]; bonus: { amount: number; claimed: boolean } };

export type ErrandClaimResult = {
  errands: WorldErrands;
  points: number;
  gained: { points: number; bonus: number; bond: number };
  partner: AnswerPartner | null;
};

/** 家族から届いた、まだ見ていないあいさつ */
export type WorldGreeting = { id: number; from: { id: number; name: string }; stamp: string; text: string; greeted_on: string };

export type FamilyMember = { id: number; name: string; level: number; greeted_today: boolean };

/** 家族の町(見るだけ)。ポイント・HP・バッグなどは含まない */
export type FamilyTown = {
  profile: { id: number; name: string; level: number };
  land: WorldLand;
  items: WorldItem[];
  spru: { growth: number };
  garden: Pick<WorldGarden, "x" | "y" | "state">;
  companions: WorldCompanion[];
  greeted_today: boolean;
};
