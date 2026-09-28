import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("ホーム画面に追加したときの名前とアイコン(docs/design/2026-09-29-spru-icons-design.md 5章)", () => {
  it("名前は Spra Go", () => {
    expect(manifest().name).toBe("Spra Go");
    expect(manifest().short_name).toBe("Spra Go");
  });

  it("アイコンは192pxと512pxで、ファイルが public/ にある", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of icons) {
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });
});
