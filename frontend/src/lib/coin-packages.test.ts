import { describe, expect, it } from "vitest";

import { coinPackagesFrom } from "./coin-packages";

const PACKAGE = { key: "small", coins: 100, amount: 120, currency: "jpy", label: "100コイン" };

describe("coinPackagesFrom", () => {
  it("ONのときだけ、パッケージを返す", () => {
    expect(coinPackagesFrom({ enabled: true, packages: [PACKAGE] })).toEqual([PACKAGE]);
  });

  it("OFFのときは、中身があっても空", () => {
    expect(coinPackagesFrom({ enabled: false, packages: [PACKAGE] })).toEqual([]);
    expect(coinPackagesFrom({ enabled: false, packages: [] })).toEqual([]);
  });

  it("古い形(配列そのもの)やおかしな形は、安全側で空にする", () => {
    expect(coinPackagesFrom([PACKAGE])).toEqual([]);
    expect(coinPackagesFrom(null)).toEqual([]);
    expect(coinPackagesFrom({ enabled: true })).toEqual([]);
  });
});
