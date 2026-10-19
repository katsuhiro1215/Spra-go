import { describe, expect, it } from "vitest";

import { ITEM_IMAGE_FIT } from "./item-image-fit";
import { imagePlacement } from "./item-image";
import { SPRU_ITEMS } from "../spru/spru-assets";

const width = (key: string) => {
  const image = (SPRU_ITEMS as Record<string, { width: number; height: number }>)[key];
  return imagePlacement(image, 2, ITEM_IMAGE_FIT[key]).width;
};

describe("2×2の建物の絵の幅(2026-10-20 Ownerの指定)", () => {
  it("家は、Spruの家と同じ幅(約69)", () => {
    const target = width("spru_house");
    for (const key of ["cottage", "red_house", "seed_storehouse", "resident_cottage", "leaf_cottage", "blue_flower_cottage", "forest_flower_house", "human_house"]) {
      expect(Math.abs(width(key) - target), key).toBeLessThan(0.5);
    }
  });

  it("お店は、幅約80", () => {
    for (const key of ["bakery", "fish_shop", "greengrocer", "meat_shop", "produce_shop", "flower_shop", "clinic", "small_school", "post_office", "station_hut", "fire_station", "koban", "cafe"]) {
      expect(Math.abs(width(key) - 80), key).toBeLessThan(0.5);
    }
  });
});
