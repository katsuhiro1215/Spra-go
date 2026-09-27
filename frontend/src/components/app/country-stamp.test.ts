import { describe, expect, it } from "vitest";

import { countryStampKey } from "./country-stamp";

describe("国のスタンプの画像", () => {
  it("スタンプのある7か国は、国のコードで引ける", () => {
    expect(countryStampKey("jp")).toBe("jp");
    expect(countryStampKey("us")).toBe("us");
    expect(countryStampKey("id")).toBe("id");
    expect(countryStampKey("fr")).toBe("fr");
    expect(countryStampKey("it")).toBe("it");
    expect(countryStampKey("gb")).toBe("gb");
    expect(countryStampKey("es")).toBe("es");
  });

  it("国のコードは大文字でも引ける(DBには GB・KR のような大文字も入っている)", () => {
    expect(countryStampKey("GB")).toBe("gb");
    expect(countryStampKey("Jp")).toBe("jp");
  });

  it("スタンプのない国・空のコードは null(国旗の丸のまま)", () => {
    expect(countryStampKey("KR")).toBeNull();
    expect(countryStampKey("")).toBeNull();
  });

  it("オブジェクトの組み込みの名前はスタンプとみなさない", () => {
    expect(countryStampKey("constructor")).toBeNull();
    expect(countryStampKey("toString")).toBeNull();
  });
});
