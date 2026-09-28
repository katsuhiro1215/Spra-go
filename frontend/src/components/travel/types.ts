import type { WorldItem } from "@/components/world/types";

export type TravelState = "visited" | "unvisited";

export type Transport = "ship" | "plane";

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
  transport: Transport;
  state: TravelState;
  /** まだの国で、チケットが1枚以上あるとき true */
  can_depart: boolean;
  /** 着いた国だけ中身が入る(まだの国は「？」で出すため空) */
  souvenirs: TravelSouvenir[];
  souvenir_count: number;
  gift_ready: boolean;
  greeting: { text: string; reading: string };
};

export type TravelData = { level: number; tickets: number; ticket_hint: string | null; destinations: Destination[] };

export type DepartResult = { first: boolean; destination: Destination };

export type ReceiveResult = { world_item: WorldItem; destination: Destination };
