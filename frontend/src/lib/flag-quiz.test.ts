import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { COURSE_IMAGES, WORLD_COURSE_NAME, WORLD_COURSE_NOTE, hasImageChoices, isFlagImage } from "./flag-quiz";

describe("国旗クイズの画面の判定", () => {
  it("国旗の絵のある選択肢が1つでもあれば、国旗の選択肢として描く", () => {
    expect(hasImageChoices([{ id: 1, label: "日本", meta: { image: "/flag/Japan.svg" } }])).toBe(true);
    expect(hasImageChoices([{ id: 1, label: "日本", meta: null }, { id: 2, label: "韓国" }])).toBe(false);
    expect(hasImageChoices([])).toBe(false);
  });

  it("/flag/ の絵は、切り取らずに全体を見せる", () => {
    expect(isFlagImage("/flag/Japan.svg")).toBe(true);
    expect(isFlagImage("/heritage/jp/mt-fuji.jpg")).toBe(false);
  });

  it("コースの絵は、7つのコースぶんあり、絵のファイルが実在する", () => {
    expect(Object.keys(COURSE_IMAGES)).toEqual(["アジア", "ヨーロッパ", "アフリカ", "北アメリカ", "南アメリカ", "オセアニア", WORLD_COURSE_NAME]);
    for (const src of Object.values(COURSE_IMAGES)) {
      expect(existsSync(join(__dirname, "../../public", src))).toBe(true);
    }
    expect(WORLD_COURSE_NOTE).toBe("ちょうむずかしい");
  });
});
