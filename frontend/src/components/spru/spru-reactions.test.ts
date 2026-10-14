import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SPRU_REACTIONS } from "./spru-reactions";

describe("リアクション12コマ", () => {
  it("12点あり、画像のファイルがすべて存在する", () => {
    expect(Object.keys(SPRU_REACTIONS)).toHaveLength(12);
    for (const asset of Object.values(SPRU_REACTIONS)) {
      expect(existsSync(join(process.cwd(), "public", asset.src))).toBe(true);
    }
  });

  it("キーは react- から始まり、素材集のキーとぶつからない", () => {
    for (const key of Object.keys(SPRU_REACTIONS)) expect(key.startsWith("react-")).toBe(true);
  });
});
