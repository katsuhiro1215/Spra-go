import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { flagSrc } from "./flag";

describe("国旗の絵のパス", () => {
  it("国コードは小文字にする", () => {
    expect(flagSrc("JP")).toBe("/flag/jp.svg");
    expect(flagSrc("gb")).toBe("/flag/gb.svg");
  });

  it("国名がコードに入っているデータは、2文字のコードのファイルへ読み替える", () => {
    expect(flagSrc("Belgium")).toBe("/flag/be.svg");
    expect(flagSrc("Georgia")).toBe("/flag/ge.svg");
  });

  it("CountrySeeder の全部の国に、小文字の国旗ファイルがある(本番はファイル名の大文字・小文字を区別する)", () => {
    const seeder = readFileSync(join(process.cwd(), "../database/seeders/CountrySeeder.php"), "utf8");
    const codes = [...seeder.matchAll(/'code' => '([A-Za-z]+)'/g)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThanOrEqual(45);

    // existsSync は、開発のMac(大文字・小文字を区別しない)では見逃すので、ファイル名の一覧と文字どおりに比べる
    const files = new Set(readdirSync(join(process.cwd(), "public/flag")));
    const missing = [...codes, "Belgium", "Georgia"].filter((code) => !files.has(flagSrc(code).replace("/flag/", "")));
    expect(missing).toEqual([]);
  });
});
