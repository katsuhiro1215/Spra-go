export type Tile = [number, number];

export type Landmark = {
  key: "spru_house" | "torii" | "stone_lantern" | "garden";
  x: number;
  y: number;
};

export type WorldItem = {
  id: number;
  shop_item_id: number;
  name: string;
  asset_key: string | null;
  x: number | null;
  y: number | null;
};

export type WorldLand = {
  size: number;
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
};

export type ShopListItem = {
  id: number;
  name: string;
  price: number;
  type: "potion" | "title" | "decoration";
  currency: "coin" | "point";
  min_level: number;
  asset_key: string | null;
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
