import { describe, expect, it } from "vitest";

import type { GroundArt } from "@/components/world/ground-art";

import { ROAD_STYLE_NAMES, roadArt, roadArtKey, roadChoice, roadName } from "./road";

const art = (name: string): GroundArt => ({ src: `/spru/ground/${name}.webp`, size: 512 });

describe("国の道の絵(設計書 2026-10-05-road-style 4章)", () => {
  it("日本は今までの道の絵、ほかは road_{キー}", () => {
    expect(roadArtKey("jp")).toBe("path");
    expect(roadArtKey("fr")).toBe("road_fr");
    expect(roadArtKey("gb")).toBe("road_gb");
  });

  it("選んだ国の道の絵を引き、絵が無ければ日本の道の絵", () => {
    const arts = { path: art("path"), road_fr: art("road_fr") };
    expect(roadArt("fr", arts)).toEqual({ key: "road_fr", art: arts.road_fr });
    expect(roadArt("kr", arts)).toEqual({ key: "path", art: arts.path });
    expect(roadArt("jp", arts)).toEqual({ key: "path", art: arts.path });
  });

  it("日本の道の絵も無ければ null(今の道の色で描く)", () => {
    expect(roadArt("fr", {})).toBeNull();
  });

  it("ボタン: 絵が無ければ出さない・選んでいれば印・そうでなければ選べる", () => {
    expect(roadChoice("kr", "jp", false)).toBe("none");
    expect(roadChoice("kr", "kr", false)).toBe("none");
    expect(roadChoice("kr", "kr", true)).toBe("selected");
    expect(roadChoice("kr", "jp", true)).toBe("select");
  });

  it("名前: 「インドネシアの道」などの形", () => {
    expect(roadName("gb")).toBe("イギリスの道");
    expect(roadName("jp")).toBe("日本の道");
    expect(Object.keys(ROAD_STYLE_NAMES).sort()).toEqual(["fr", "gb", "id", "jp", "kr", "us"]);
  });

  it("知らないキーの名前は、キーのまま(画面が壊れない)", () => {
    expect(roadName("zz")).toBe("zzの道");
  });
});
