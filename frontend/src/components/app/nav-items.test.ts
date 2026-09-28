import { describe, expect, it } from "vitest";

import { isNavActive, NAV_ITEMS } from "./nav-items";

describe("下のメニューの並び", () => {
  it("学ぶ・旅する・世界・ショップの順で、「じぶん」を足した5つの真ん中が世界", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["学ぶ", "旅する", "世界", "ショップ"]);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/learn", "/trip", "/", "/shop"]);
    expect(NAV_ITEMS[2].key).toBe("world");
  });
});

describe("下のメニューの選択中", () => {
  it("世界は町(/)のときだけ選択中", () => {
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
