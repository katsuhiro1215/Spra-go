import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { flagSrc } from "./flag";

describe("国旗の絵のパス", () => {
  it("国コードは小文字にする", () => {
    expect(flagSrc("JP")).toBe("/flag/jp.svg");
    expect(flagSrc("gb")).toBe("/flag/gb.svg");
  });

  it("CountrySeeder の全部の国に、小文字の国旗ファイルがある(本番はファイル名の大文字・小文字を区別する)", () => {
    const seeder = readFileSync(join(process.cwd(), "../database/seeders/CountrySeeder.php"), "utf8");
    const codes = [...seeder.matchAll(/'code' => '([A-Za-z]+)'/g)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThanOrEqual(45);

    const missing = codes.filter((code) => !existsSync(join(process.cwd(), "public", flagSrc(code))));
    expect(missing).toEqual([]);
  });
});
