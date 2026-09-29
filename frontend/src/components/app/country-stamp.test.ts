import { describe, expect, it } from "vitest";

import { countryStampKey } from "./country-stamp";

describe("国のスタンプの画像", () => {
  it("スタンプのある8か国は、国のコードで引ける(韓国は2026-09-29に badges/badge4 から足した)", () => {
    expect(countryStampKey("jp")).toBe("jp");
    expect(countryStampKey("us")).toBe("us");
    expect(countryStampKey("id")).toBe("id");
    expect(countryStampKey("fr")).toBe("fr");
    expect(countryStampKey("it")).toBe("it");
    expect(countryStampKey("gb")).toBe("gb");
    expect(countryStampKey("es")).toBe("es");
    expect(countryStampKey("kr")).toBe("kr");
  });

  it("国のコードは大文字でも引ける(DBには GB・KR のような大文字も入っている)", () => {
    expect(countryStampKey("GB")).toBe("gb");
    expect(countryStampKey("KR")).toBe("kr");
    expect(countryStampKey("Jp")).toBe("jp");
  });

  it("スタンプのない国・空のコードは null(国旗の丸のまま)", () => {
    expect(countryStampKey("CA")).toBeNull();
    expect(countryStampKey("")).toBeNull();
  });

  it("オブジェクトの組み込みの名前はスタンプとみなさない", () => {
    expect(countryStampKey("constructor")).toBeNull();
    expect(countryStampKey("toString")).toBeNull();
  });
});
