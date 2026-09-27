import { describe, expect, it } from "vitest";

import {
  ARRIVE_MS,
  SAIL_MS,
  WALK_MS,
  departurePhase,
  departureStart,
  hubLine,
  islandLabel,
  islandTag,
  pickBeginnerGroup,
} from "./travel";
import type { ChecklistRow, Destination, TravelSouvenir } from "./types";

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

const row = (kind: ChecklistRow["kind"], label: string, done: boolean, hint: string | null = null): ChecklistRow => ({
  kind,
  label,
  done,
  hint,
});

const dest = (name: string, over: Partial<Destination> = {}): Destination => ({
  key: name,
  name,
  country_id: 1,
  code: "id",
  flag: "/flag/id.svg",
  min_level: 7,
  state: "later",
  ready: false,
  checklist: [],
  souvenirs: [souvenir("a"), souvenir("b", { condition: "boss", footprint: 2 })],
  gift_ready: false,
  greeting: { text: "Hello!", reading: "ハロー" },
  ...over,
});

describe("hubLine", () => {
  it("受け取れるおみやげがある国があれば、いちばん先にそれを言う", () => {
    const destinations = [
      dest("インドネシア", { state: "visited", gift_ready: true }),
      dest("韓国", { state: "next", ready: true }),
    ];
    expect(hubLine(destinations)).toBe("インドネシアのおみやげ屋さんで、おみやげを受け取れるよ！");
  });

  it("次の行き先のじゅんびがそろっていれば、出発をすすめる", () => {
    expect(hubLine([dest("インドネシア", { state: "next", ready: true })])).toBe("じゅんびができたよ！インドネシアへ出発しよう");
  });

  it("レベルが足りなければ、あと何レベルかを言う", () => {
    const next = dest("インドネシア", {
      state: "next",
      checklist: [row("level", "レベル7", false, "あと2レベル"), row("item", "小さな船", false, "ショップで買えるよ")],
    });
    expect(hubLine([next])).toBe("次はインドネシア！あと2レベルだね");
  });

  it("町のアイテムが足りなければ、そのアイテムを言う", () => {
    const next = dest("インドネシア", {
      state: "next",
      checklist: [row("level", "レベル7", true), row("item", "小さな船", false, "ショップで買えるよ")],
    });
    expect(hubLine([next])).toBe("小さな船があればインドネシアへ行けるよ");
  });

  it("前の国のおみやげが足りなければ、そのおみやげを言う", () => {
    const next = dest("韓国", {
      state: "next",
      checklist: [
        row("level", "レベル9", true),
        row("item", "自転車", true),
        row("souvenir", "インドネシアのおみやげ「ボロブドゥール寺院」", false, "インドネシアの初級のボスをクリアしよう"),
      ],
    });
    expect(hubLine([dest("インドネシア", { state: "visited" }), next])).toBe(
      "インドネシアのおみやげ「ボロブドゥール寺院」があれば韓国へ行けるよ",
    );
  });

  it("全部の国に着いたら、ほめる", () => {
    const all = ["インドネシア", "韓国", "アメリカ", "イギリス", "フランス"].map((name) => dest(name, { state: "visited" }));
    expect(hubLine(all)).toBe("5つの国をぜんぶ旅したね！すごい！");
  });
});

describe("島のラベルと札", () => {
  it("着いた国は、受け取ったおみやげの数を言う", () => {
    const visited = dest("インドネシア", { state: "visited", souvenirs: [souvenir("a", { received: true }), souvenir("b")] });
    expect(islandLabel(visited)).toBe("インドネシア(着いた国・おみやげ1/2)");
    expect(islandTag(visited)).toBe("おみやげ 1/2");
  });

  it("着いた国で受け取れるおみやげがあれば、札は「おみやげ！」", () => {
    expect(islandTag(dest("インドネシア", { state: "visited", gift_ready: true }))).toBe("おみやげ！");
  });

  it("次の行き先は、出発できるか・じゅんび中かを言う", () => {
    expect(islandLabel(dest("インドネシア", { state: "next", ready: true }))).toBe("インドネシア(出発できます)");
    expect(islandTag(dest("インドネシア", { state: "next", ready: true }))).toBe("出発できる");
    expect(islandLabel(dest("インドネシア", { state: "next" }))).toBe("インドネシア(じゅんび中)");
    expect(islandTag(dest("インドネシア", { state: "next" }))).toBe("じゅんび中");
  });

  it("まだ先の国は札を出さない", () => {
    expect(islandLabel(dest("アメリカ"))).toBe("アメリカ(まだ先)");
    expect(islandTag(dest("アメリカ"))).toBeNull();
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
  it("経過時間で、歩く → 船 → 着いた → おわり と進む", () => {
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
