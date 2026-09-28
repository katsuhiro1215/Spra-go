import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SPRU_AVATARS, SPRU_ICONS, SPRU_PAGES, SPRU_STAGES, SPRU_TRAVEL, type SpruImage } from "./spru-assets";

const keys = (record: Record<string, SpruImage>) => Object.keys(record).sort();

describe("スプルのアイコン・画像の一覧(docs/design/2026-09-29-spru-icons-design.md 3-3)", () => {
  it("アイコンは15点", () => {
    expect(keys(SPRU_ICONS)).toEqual([
      "add-player",
      "bag",
      "continue",
      "family",
      "key",
      "letter",
      "login",
      "logout",
      "nav-learn",
      "nav-shop",
      "nav-town",
      "nav-trip",
      "sound-off",
      "sound-on",
      "switch-profile",
    ]);
  });

  it("ステージの丸は3種", () => {
    expect(keys(SPRU_STAGES)).toEqual(["cleared", "locked", "open"]);
  });

  it("アバターは6種", () => {
    expect(keys(SPRU_AVATARS)).toEqual(["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6"]);
  });

  it("旅は船・飛行機・チケット", () => {
    expect(keys(SPRU_TRAVEL)).toEqual(["plane", "ship", "ticket"]);
  });

  it("ページの絵は迷子のスプル", () => {
    expect(keys(SPRU_PAGES)).toEqual(["lost"]);
  });

  it("どの絵も public/ にファイルがあり、幅と高さがある", () => {
    for (const record of [SPRU_ICONS, SPRU_STAGES, SPRU_AVATARS, SPRU_TRAVEL, SPRU_PAGES]) {
      for (const image of Object.values(record) as SpruImage[]) {
        expect(existsSync(join(process.cwd(), "public", image.src))).toBe(true);
        expect(image.width).toBeGreaterThan(0);
        expect(image.height).toBeGreaterThan(0);
      }
    }
  });
});
