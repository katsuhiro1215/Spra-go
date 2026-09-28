import { describe, expect, it } from "vitest";

import { SPRU_TRAVEL } from "@/components/spru/spru-assets";

import {
  ARRIVE_MS,
  SAIL_MS,
  WALK_MS,
  departureCaption,
  departurePhase,
  departureStart,
  hubLine,
  islandLabel,
  islandTag,
  lockedCountryText,
  pickBeginnerGroup,
  ticketHintText,
  transportText,
  unlockedCountries,
  vehicleImage,
} from "./travel";
import type { Destination, TravelSouvenir } from "./types";

const souvenir = (key: string, over: Partial<TravelSouvenir> = {}): TravelSouvenir => ({
  key,
  name: key,
  asset_key: key,
  footprint: 1,
  condition: "stage",
  condition_label: "",
  met: false,
  received: false,
  ...over,
});

const dest = (name: string, over: Partial<Destination> = {}): Destination => ({
  key: name,
  name,
  country_id: 1,
  code: "id",
  flag: "/flag/id.svg",
  transport: "ship",
  state: "unvisited",
  can_depart: false,
  souvenirs: [],
  souvenir_count: 2,
  gift_ready: false,
  greeting: { text: "Hello!", reading: "ハロー" },
  ...over,
});

const visited = (name: string, over: Partial<Destination> = {}) =>
  dest(name, { state: "visited", souvenirs: [souvenir("a"), souvenir("b", { condition: "boss", footprint: 2 })], ...over });

describe("hubLine", () => {
  it("受け取れるおみやげがある国があれば、いちばん先にそれを言う", () => {
    const destinations = [visited("インドネシア", { gift_ready: true }), dest("韓国", { can_depart: true })];
    expect(hubLine({ tickets: 1, ticket_hint: null, destinations })).toBe("インドネシアのおみやげ屋さんで、おみやげを受け取れるよ！");
  });

  it("チケットがあれば、行きたい国を選ぶようにすすめる", () => {
    expect(hubLine({ tickets: 1, ticket_hint: null, destinations: [dest("韓国", { can_depart: true })] })).toBe(
      "チケットがあるよ！行きたい国を選んでね",
    );
  });

  it("チケットがなければ、どこの初級のボスを倒せばもらえるかを言う", () => {
    expect(hubLine({ tickets: 0, ticket_hint: "日本", destinations: [dest("韓国")] })).toBe(
      "日本の初級のボスを倒すと、チケットがもらえるよ",
    );
  });

  it("全部の国に着いたら、ほめる", () => {
    const all = ["インドネシア", "韓国", "アメリカ", "イギリス", "フランス"].map((name) => visited(name));
    expect(hubLine({ tickets: 0, ticket_hint: null, destinations: all })).toBe("5つの国をぜんぶ旅したね！すごい！");
  });
});

describe("ticketHintText", () => {
  it("国の名前があれば入れ、なければ国の名前なしで言う", () => {
    expect(ticketHintText("アメリカ")).toBe("アメリカの初級のボスを倒すと、チケットがもらえるよ");
    expect(ticketHintText(null)).toBe("初級のボスを倒すと、チケットがもらえるよ");
  });
});

describe("島のラベルと札", () => {
  it("着いた国は、受け取ったおみやげの数を言う", () => {
    const island = visited("インドネシア", { souvenirs: [souvenir("a", { received: true }), souvenir("b")] });
    expect(islandLabel(island)).toBe("インドネシア(着いた国・おみやげ1/2)");
    expect(islandTag(island)).toBe("おみやげ 1/2");
  });

  it("着いた国で受け取れるおみやげがあれば、札は「おみやげ！」", () => {
    expect(islandTag(visited("インドネシア", { gift_ready: true }))).toBe("おみやげ！");
  });

  it("まだの国は、チケットがあれば「行ける！」、なければ「？」", () => {
    expect(islandLabel(dest("アメリカ", { can_depart: true }))).toBe("アメリカ(まだの国・行けます)");
    expect(islandTag(dest("アメリカ", { can_depart: true }))).toBe("行ける！");
    expect(islandLabel(dest("アメリカ"))).toBe("アメリカ(まだの国)");
    expect(islandTag(dest("アメリカ"))).toBe("？");
  });
});

describe("乗り物と出発の場面の文", () => {
  it("乗り物の説明", () => {
    expect(transportText("plane")).toBe("飛行機で行く国");
    expect(transportText("ship")).toBe("船で行く国");
  });

  it("船の国は桟橋から船で、飛行機の国は空港から飛行機で向かう", () => {
    const ship = dest("韓国", { transport: "ship" });
    const plane = dest("アメリカ", { transport: "plane" });
    expect(departureCaption("walk", ship)).toBe("桟橋から出発！");
    expect(departureCaption("sail", ship)).toBe("韓国へ船で向かっているよ");
    expect(departureCaption("walk", plane)).toBe("空港から出発！");
    expect(departureCaption("sail", plane)).toBe("アメリカへ飛行機で向かっているよ");
    expect(departureCaption("arrive", plane)).toBe("アメリカに着いた！");
  });
});

describe("学ぶタブの鍵", () => {
  it("鍵のない国だけを並びのまま残す(地図に渡す)", () => {
    const countries = [
      { code: "jp", locked: false },
      { code: "id", locked: true },
      { code: "us", locked: false },
    ];
    expect(unlockedCountries(countries).map((country) => country.code)).toEqual(["jp", "us"]);
  });

  it("鍵の国を押したときの案内", () => {
    expect(lockedCountryText("アメリカ")).toBe("アメリカへは『せかい』でチケットを使うと行けるよ");
  });
});

describe("pickBeginnerGroup", () => {
  const group = (difficulty: string, language: boolean, boss: boolean, id: number) => ({
    id,
    category: { is_language_mode: language },
    difficulty,
    stages: [{ is_boss: false }, { is_boss: boss }],
  });

  it("初級で、ことばを学ぶモードでなく、ボスがあるグループを選ぶ", () => {
    const groups = [group("初級", true, true, 1), group("初級", false, false, 2), group("初級", false, true, 3), group("中級", false, true, 4)];
    expect(pickBeginnerGroup(groups)?.id).toBe(3);
  });

  it("当てはまるものがなければ最初の初級のグループ、初級がなければ null", () => {
    expect(pickBeginnerGroup([group("中級", false, true, 1), group("初級", true, false, 2)])?.id).toBe(2);
    expect(pickBeginnerGroup([group("中級", false, true, 1)])).toBeNull();
  });
});

describe("出発の場面", () => {
  it("経過時間で、歩く → 乗り物 → 着いた → おわり と進む", () => {
    expect(departurePhase(0)).toBe("walk");
    expect(departurePhase(WALK_MS - 1)).toBe("walk");
    expect(departurePhase(WALK_MS)).toBe("sail");
    expect(departurePhase(SAIL_MS)).toBe("arrive");
    expect(departurePhase(ARRIVE_MS - 1)).toBe("arrive");
    expect(departurePhase(ARRIVE_MS)).toBe("done");
  });

  it("動きを減らす設定のときは、着いた場面から始める", () => {
    expect(departureStart(false)).toBe(0);
    expect(departurePhase(departureStart(true))).toBe("arrive");
  });
});

describe("出発の場面の乗り物の絵(docs/design/2026-09-29-spru-icons-design.md 4-7)", () => {
  it("船の国は船、飛行機の国は飛行機", () => {
    expect(vehicleImage("ship")).toEqual(SPRU_TRAVEL.ship);
    expect(vehicleImage("plane")).toEqual(SPRU_TRAVEL.plane);
  });
});
