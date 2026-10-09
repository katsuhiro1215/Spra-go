import { describe, expect, it } from "vitest";

import { giftLine, giftTitle, sizeLabel } from "./gifts";

describe("ごほうびの文言", () => {
  it("タイトルにレベルが入る", () => {
    expect(giftTitle(12)).toBe("Lv.12のごほうび");
  });

  it("説明は、1つえらべることを伝える", () => {
    expect(giftLine()).toBe("すきな名所を1つ えらべるよ");
  });

  it("大きさは N×N", () => {
    expect(sizeLabel(2)).toBe("2×2");
    expect(sizeLabel(3)).toBe("3×3");
  });
});
