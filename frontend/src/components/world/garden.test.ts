import { describe, expect, it } from "vitest";

import { gardenPrompt, growthLabel, levelUpGrowthLine, pickGardenTap } from "./garden";
import type { WorldGarden } from "./types";

const garden = (overrides: Partial<WorldGarden> = {}): WorldGarden => ({
  x: 1,
  y: 2,
  state: "empty",
  waterings: 0,
  learned_today: false,
  watered_today: false,
  can_sow: false,
  can_water: false,
  ...overrides,
});

describe("pickGardenTap", () => {
  it("種がまけるときは種まき", () => {
    expect(pickGardenTap(garden({ can_sow: true }))).toEqual({ action: "sow" });
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
  it("種まき、水やりの順に案内し、どちらもできなければ無し", () => {
    expect(gardenPrompt(garden({ can_sow: true }))).toBe("花が咲いたよ！タップして種をまこう");
    expect(gardenPrompt(garden({ state: "seed", can_water: true }))).toBe("芽に水をあげよう！");
    expect(gardenPrompt(garden({ state: "seed", learned_today: true, watered_today: true }))).toBeNull();
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
