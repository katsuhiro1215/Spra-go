import { describe, expect, it } from "vitest";

import { bloomOf, bloomRect } from "./bloom";
import { SPRU_STAND_HEIGHT, SPRU_TIPS } from "./spru-assets";

describe("bloomOf", () => {
  it("育ち具合1はつぼみ、2と3は花、0は何も付けない", () => {
    expect(bloomOf(0)).toBeNull();
    expect(bloomOf(1)).toBe("bud");
    expect(bloomOf(2)).toBe("flower");
    expect(bloomOf(3)).toBe("flower");
  });
});

describe("bloomRect", () => {
  it("花はSの先を中心に、少し下へずらして置く", () => {
    const rect = bloomRect("three-quarter", "flower");
    const tip = SPRU_TIPS["three-quarter"]!;
    expect(rect).not.toBeNull();
    expect(rect!.x + rect!.width / 2).toBeCloseTo(tip.x);
    expect(rect!.y + rect!.height / 2).toBeCloseTo(tip.y + 0.055 * SPRU_STAND_HEIGHT);
    expect(rect!.width).toBeCloseTo(0.22 * SPRU_STAND_HEIGHT);
  });

  it("つぼみは花より小さい", () => {
    expect(bloomRect("sit", "bud")!.width).toBeLessThan(bloomRect("sit", "flower")!.width);
  });

  it("種まきの画像は花が描かれているので重ねない", () => {
    expect(bloomRect("sow-shake", "flower")).toBeNull();
    expect(bloomRect("sow-fly", "bud")).toBeNull();
  });
});
