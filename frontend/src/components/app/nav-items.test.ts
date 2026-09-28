import { describe, expect, it } from "vitest";

import { SPRU_ICONS } from "@/components/spru/spru-assets";

import { isNavActive, NAV_ITEMS } from "./nav-items";

describe("下のメニューの並び", () => {
  it("学ぶ・せかい・まち・ショップの順で、「じぶん」を足した5つの真ん中がまち", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["学ぶ", "せかい", "まち", "ショップ"]);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/learn", "/trip", "/", "/shop"]);
    expect(NAV_ITEMS[2].key).toBe("town");
  });

  it("どのメニューにも、スプルのアイコンの絵がある(docs/design/2026-09-29-spru-icons-design.md 4-1)", () => {
    expect(NAV_ITEMS.map((item) => item.icon)).toEqual(["nav-learn", "nav-trip", "nav-town", "nav-shop"]);
    for (const item of NAV_ITEMS) {
      expect(SPRU_ICONS[item.icon]).toBeDefined();
    }
  });
});

describe("下のメニューの選択中", () => {
  it("まちは町(/)のときだけ選択中", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/learn", "/")).toBe(false);
  });

  it("ほかはそのページとその下で選択中。名前が似ているだけのページやバッグでは選択中にしない", () => {
    expect(isNavActive("/learn", "/learn")).toBe(true);
    expect(isNavActive("/trip/id", "/trip")).toBe(true);
    expect(isNavActive("/shopping", "/shop")).toBe(false);
    expect(isNavActive("/bag", "/shop")).toBe(false);
  });
});
