import { describe, expect, it } from "vitest";

import { plantImage } from "./plant";
import { GROWTH_IMAGES } from "./spru-assets";

describe("plantImage", () => {
  it("色と段階の絵を返す", () => {
    expect(plantImage("gold", "bud")).toBe(GROWTH_IMAGES["gold/bud"]);
    expect(plantImage("spru", "seed")).toBe(GROWTH_IMAGES["spru/seed"]);
  });

  it("見た目が無い・知らない色は、ふつうのスプルの絵", () => {
    expect(plantImage(null, "sprout")).toBe(GROWTH_IMAGES["spru/sprout"]);
    expect(plantImage("riri", "flower")).toBe(GROWTH_IMAGES["spru/flower"]);
  });

  it("10色と、ふつうのスプルの4段階がそろっている", () => {
    const looks = ["spru", "ruby", "sapphire", "silver", "amber", "obsidian", "crystal", "pearl", "emerald", "gold", "platinum"];
    for (const look of looks) {
      for (const stage of ["seed", "sprout", "bud", "flower"] as const) {
        expect(Object.keys(GROWTH_IMAGES)).toContain(`${look}/${stage}`);
      }
    }
  });
});
