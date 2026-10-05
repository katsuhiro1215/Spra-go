import { describe, expect, it } from "vitest";

import {
  claimableErrands,
  claimedCount,
  errandGo,
  errandLine,
  errandProgressText,
  errandTitle,
  townPrompt,
} from "./errands";
import type { WorldErrand, WorldErrands, WorldGarden, WorldReview } from "./types";

const errand = (overrides: Partial<WorldErrand> = {}): WorldErrand => ({
  slot: 1,
  kind: "correct",
  target: 5,
  progress: 0,
  claimed: false,
  giver: { kind: "spru", key: null, name: "スプル" },
  ...overrides,
});
const errands = (items: WorldErrand[]): WorldErrands => ({ date: "2026-09-27", items, bonus: { amount: 30, claimed: false, gift_left: 15 } });
const garden: WorldGarden = {
  x: 1,
  y: 2,
  state: "empty",
  look: null,
  waterings: 0,
  learned_today: false,
  watered_today: false,
  spru_seed_ready: false,
  seed_bag: [],
  can_sow: false,
  can_water: false,
};
const noReview: WorldReview = { available: false, count: 0, giver: { kind: "spru", key: null, name: "スプル" } };

describe("おつかいの名前とひとこと", () => {
  it("正解のおつかいは目標の数を入れる", () => {
    expect(errandTitle(errand({ target: 10 }))).toBe("問題に10問正解する");
    expect(errandLine(errand({ target: 5 }))).toBe("問題に5問正解してきてね");
  });

  it("種類ごとの名前とひとこと", () => {
    expect(errandTitle(errand({ kind: "stage_clear", target: 1 }))).toBe("ステージを1つクリアする");
    expect(errandTitle(errand({ kind: "decorate", target: 1 }))).toBe("町のもようがえ（置く・動かす）");
    expect(errandTitle(errand({ kind: "family_greet", target: 1 }))).toBe("家族の町にあいさつに行く");
    expect(errandLine(errand({ kind: "water", target: 1 }))).toBe("芽に水をあげてほしいな");
    expect(errandLine(errand({ kind: "review", target: 1 }))).toBe("おさらいの問題を解いてみよう");
    expect(errandLine(errand({ kind: "family_greet", target: 1 }))).toBe("家族の町に、あいさつに行ってみよう");
  });
});

describe("進み具合と受け取り", () => {
  it("進み具合は目標で止めて出す", () => {
    expect(errandProgressText(errand({ progress: 3 }))).toBe("3/5");
    expect(errandProgressText(errand({ progress: 7 }))).toBe("5/5");
  });

  it("受け取れるのは、やりとげて受け取っていないものだけ", () => {
    const list = errands([
      errand({ slot: 1, progress: 5 }),
      errand({ slot: 2, progress: 5, claimed: true }),
      errand({ slot: 3, progress: 4 }),
    ]);

    expect(claimableErrands(list).map((e) => e.slot)).toEqual([1]);
    expect(claimedCount(list)).toBe(1);
  });
});

describe("［やりに行く］の行き先", () => {
  const ctx = { continueHref: "/quiz/12", learnedToday: false, bagCount: 0 };

  it("正解・ステージは「つづきから学ぶ」と同じ行き先", () => {
    expect(errandGo(errand(), ctx)).toEqual({ kind: "link", href: "/quiz/12" });
    expect(errandGo(errand({ kind: "stage_clear", target: 1 }), ctx)).toEqual({ kind: "link", href: "/quiz/12" });
  });

  it("復習と家族はそのページへ", () => {
    expect(errandGo(errand({ kind: "review", target: 1 }), ctx)).toEqual({ kind: "link", href: "/review" });
    expect(errandGo(errand({ kind: "family_greet", target: 1 }), ctx)).toEqual({ kind: "link", href: "/family" });
  });

  it("水やりは、今日まだ正解していなければ先に1問", () => {
    expect(errandGo(errand({ kind: "water", target: 1 }), ctx)).toEqual({ kind: "say", line: "1問正解したら、水をあげられるよ" });
    expect(errandGo(errand({ kind: "water", target: 1 }), { ...ctx, learnedToday: true })).toEqual({
      kind: "say",
      line: "畑をタップして水をあげよう",
    });
  });

  it("もようがえは、バッグにアイテムがあればバッグへ", () => {
    expect(errandGo(errand({ kind: "decorate", target: 1 }), ctx)).toEqual({ kind: "say", line: "アイテムをタップすると動かせるよ" });
    expect(errandGo(errand({ kind: "decorate", target: 1 }), { ...ctx, bagCount: 2 })).toEqual({ kind: "link", href: "/bag" });
  });
});

describe("スプルのふだんのひとことの優先順", () => {
  it("受け取れるおつかいが一番上", () => {
    expect(
      townPrompt({ errands: errands([errand({ progress: 5 })]), garden: { ...garden, spru_seed_ready: true, can_sow: true }, review: noReview }),
    ).toBe("おつかいができたね！受け取ろう");
  });

  it("受け取れるおつかいが無ければ、畑、復習の順", () => {
    const none = errands([errand()]);
    expect(townPrompt({ errands: none, garden: { ...garden, can_water: true }, review: noReview })).toBe("芽に水をあげよう！");
    expect(
      townPrompt({
        errands: none,
        garden,
        review: { available: true, count: 2, giver: { kind: "companion", key: "momo", name: "モモ" } },
      }),
    ).toBe("モモが復習を用意してるよ");
    expect(townPrompt({ errands: none, garden, review: noReview })).toBeNull();
  });
});
