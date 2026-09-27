import type { WorldItem } from "@/components/world/types";

export type TravelState = "visited" | "next" | "later";

/** 旅のじゅんびの1行(設計書4-4)。そろっていれば hint は null */
export type ChecklistRow = { kind: "level" | "item" | "souvenir"; label: string; done: boolean; hint: string | null };

export type TravelSouvenir = {
  key: string;
  name: string;
  asset_key: string;
  footprint: number;
  condition: "stage" | "boss";
  condition_label: string;
  met: boolean;
  received: boolean;
};

export type Destination = {
  key: string;
  name: string;
  country_id: number | null;
  code: string;
  flag: string;
  min_level: number;
  state: TravelState;
  ready: boolean;
  checklist: ChecklistRow[];
  souvenirs: TravelSouvenir[];
  gift_ready: boolean;
  greeting: { text: string; reading: string };
};

export type TravelData = { level: number; destinations: Destination[] };

export type DepartResult = { first: boolean; destination: Destination };

export type ReceiveResult = { world_item: WorldItem; destination: Destination };
