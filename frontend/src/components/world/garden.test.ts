import { describe, expect, it } from "vitest";

import { canSowSpruSeed, gardenPrompt, growthLabel, levelUpGrowthLine, pickGardenTap, seedLabel, seedOptions } from "./garden";
import type { WorldGarden } from "./types";

const garden = (overrides: Partial<WorldGarden> = {}): WorldGarden => ({
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
  ...overrides,
});

describe("pickGardenTap", () => {
  it("スプルの種ができていて、ふくろが空なら、すぐ種まき", () => {
    expect(pickGardenTap(garden({ spru_seed_ready: true, can_sow: true }))).toEqual({ action: "sow" });
  });

  it("ふくろに種があれば、どの種をまくかを選ぶ", () => {
    const bag = [{ key: "ruby", name: "ルビースプル" }];
    expect(pickGardenTap(garden({ seed_bag: bag, can_sow: true }))).toEqual({ action: "choose" });
    expect(pickGardenTap(garden({ spru_seed_ready: true, seed_bag: bag, can_sow: true }))).toEqual({ action: "choose" });
  });

  it("空の畑でまだ種ができていなければ、花が咲く条件を言う", () => {
    expect(pickGardenTap(garden())).toEqual({
      action: "say",
      image: "think",
      line: "レベルが上がると、スプルに花が咲くよ",
    });
  });

  it("水をあげられるときは水やり", () => {
    expect(pickGardenTap(garden({ state: "seed", learned_today: true, can_water: true }))).toEqual({ action: "water" });
  });

  it("今日まだ正解していなければ、正解するように言う", () => {
    expect(pickGardenTap(garden({ state: "sprout" }))).toEqual({
      action: "say",
      image: "think",
      line: "今日1問正解したら、水をあげられるよ",
    });
  });

  it("今日もう水をあげていれば、また明日と言う", () => {
    expect(pickGardenTap(garden({ state: "sprout", learned_today: true, watered_today: true }))).toEqual({
      action: "say",
      image: "smile",
      line: "今日はもう水をあげたよ。また明日ね",
    });
  });
});

describe("gardenPrompt", () => {
  it("スプルの種、特別な種、水やりの順に案内し、どれもできなければ無し", () => {
    expect(gardenPrompt(garden({ spru_seed_ready: true, can_sow: true }))).toBe("花が咲いたよ！タップして種をまこう");
    expect(gardenPrompt(garden({ seed_bag: [{ key: "ruby", name: "ルビースプル" }], can_sow: true }))).toBe(
      "特別な種を畑にまいてみよう！",
    );
    expect(gardenPrompt(garden({ state: "seed", can_water: true }))).toBe("芽に水をあげよう！");
    expect(gardenPrompt(garden({ state: "seed", learned_today: true, watered_today: true }))).toBeNull();
  });

  it("畑に種があれば、スプルの種ができていても種まきの案内はしない", () => {
    expect(gardenPrompt(garden({ state: "seed", spru_seed_ready: true, learned_today: true, watered_today: true }))).toBeNull();
  });
});

describe("canSowSpruSeed", () => {
  it("畑が空いていて、スプルの種ができているときだけ", () => {
    expect(canSowSpruSeed(garden({ spru_seed_ready: true }))).toBe(true);
    expect(canSowSpruSeed(garden({ seed_bag: [{ key: "ruby", name: "ルビースプル" }], can_sow: true }))).toBe(false);
    expect(canSowSpruSeed(garden({ state: "seed", spru_seed_ready: true }))).toBe(false);
  });
});

describe("seedOptions", () => {
  it("スプルの種(できているときだけ)→ふくろの種の順", () => {
    const bag = [
      { key: "ruby", name: "ルビースプル" },
      { key: "gold", name: "ゴールドスプル" },
    ];
    expect(seedOptions(garden({ spru_seed_ready: true, seed_bag: bag }))).toEqual([
      { seed: "spru", label: "スプルの種", note: "なにが生まれるかな？", look: "spru" },
      { seed: "ruby", label: "ルビーの種", note: null, look: "ruby" },
      { seed: "gold", label: "ゴールドの種", note: null, look: "gold" },
    ]);
    expect(seedOptions(garden({ seed_bag: bag })).map((option) => option.seed)).toEqual(["ruby", "gold"]);
  });

  it("「〇〇スプル」を「〇〇の種」にする", () => {
    expect(seedLabel("オブシディアンスプル")).toBe("オブシディアンの種");
  });
});

describe("growthLabel", () => {
  it("次に育つものと残りXPを出し、種ができたら残りは出さない", () => {
    const levelXp = { floor: 100, next: 220 };
    expect(growthLabel(0, 150, levelXp)).toBe("つぼみまで あと70XP");
    expect(growthLabel(1, 150, levelXp)).toBe("花まで あと70XP");
    expect(growthLabel(2, 150, levelXp)).toBe("種まで あと70XP");
    expect(growthLabel(3, 150, levelXp)).toBe("種ができた！");
  });
});

describe("levelUpGrowthLine", () => {
  it("育ち具合に合わせたひとことで、種ができたときは畑が空いているかで変える", () => {
    expect(levelUpGrowthLine(0, false)).toBeNull();
    expect(levelUpGrowthLine(1, false)).toBe("スプルにつぼみがついた！");
    expect(levelUpGrowthLine(2, false)).toBe("スプルの花が咲いた！");
    expect(levelUpGrowthLine(3, false)).toBe("種ができた！町でまいてみよう");
    expect(levelUpGrowthLine(3, true)).toBe("畑の芽が育ったら、種をまけるよ");
  });
});
