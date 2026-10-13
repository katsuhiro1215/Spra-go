import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { MAP_VIEWS, OKINAWA_INSET, PREFECTURE_SHAPES } from "./japan-map";

// database/data/prefectures.php の県のkeyと名前・地方(並びは都道府県コード順)
const php = readFileSync(resolve(__dirname, "../../../../database/data/prefectures.php"), "utf-8");
const table = [...php.matchAll(/'key'\s*=>\s*'([a-z]+)',\s*'tier'\s*=>\s*\d,\s*'name'\s*=>\s*'([^']+)',\s*'region'\s*=>\s*'([^']+)'/g)].map((m) => ({
  key: m[1],
  name: m[2],
  region: m[3],
}));

describe("都道府県の地図データ(設計書 2026-10-13-prefecture-map-quiz 4章)", () => {
  it("県のデータ表の47県と、key・名前・地方・並びが同じ", () => {
    expect(table).toHaveLength(47);
    expect(Object.keys(PREFECTURE_SHAPES)).toEqual(table.map((p) => p.key));
    for (const p of table) {
      expect(PREFECTURE_SHAPES[p.key].name, p.key).toBe(p.name);
      expect(PREFECTURE_SHAPES[p.key].region, p.key).toBe(p.region);
    }
  });

  it("どの県にも、閉じた輪のパスがある(頂点が3つ以上)", () => {
    for (const [key, shape] of Object.entries(PREFECTURE_SHAPES)) {
      const rings = shape.d.split("Z").filter(Boolean);
      expect(rings.length, key).toBeGreaterThan(0);
      for (const ring of rings) expect(ring.split("L").length, key).toBeGreaterThanOrEqual(3);
    }
  });

  it("頂点の数は、画面で軽いまま(全体で3,000点以下)・データは50KB以下", () => {
    const points = Object.values(PREFECTURE_SHAPES).reduce((n, s) => n + s.d.split("L").length, 0);
    expect(points).toBeLessThan(3000);
    const size = readFileSync(resolve(__dirname, "./japan-map.ts"), "utf-8").length;
    expect(size).toBeLessThan(50_000);
  });

  it("表示の範囲は、全国と6つの地方。幅・高さが正で、県のパスが範囲の中に入る", () => {
    expect(Object.keys(MAP_VIEWS).sort()).toEqual(["chubu", "chugoku-shikoku", "hokkaido-tohoku", "japan", "kanto", "kinki", "kyushu-okinawa"]);
    for (const [view, [, , w, h]] of Object.entries(MAP_VIEWS)) {
      expect(w, view).toBeGreaterThan(0);
      expect(h, view).toBeGreaterThan(0);
    }
    const [x, y, w, h] = MAP_VIEWS.japan;
    for (const [key, shape] of Object.entries(PREFECTURE_SHAPES)) {
      const nums = [...shape.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      for (let i = 0; i < nums.length; i += 2) {
        expect(nums[i], key).toBeGreaterThanOrEqual(x);
        expect(nums[i], key).toBeLessThanOrEqual(x + w);
        expect(nums[i + 1], key).toBeGreaterThanOrEqual(y);
        expect(nums[i + 1], key).toBeLessThanOrEqual(y + h);
      }
    }
  });

  it("沖縄の枠は、全国の範囲の中にあり、沖縄のパスを囲む", () => {
    const [ix, iy, iw, ih] = OKINAWA_INSET;
    const [x, y, w, h] = MAP_VIEWS.japan;
    expect(ix).toBeGreaterThanOrEqual(x);
    expect(iy).toBeGreaterThanOrEqual(y);
    expect(ix + iw).toBeLessThanOrEqual(x + w);
    expect(iy + ih).toBeLessThanOrEqual(y + h);
    const nums = [...PREFECTURE_SHAPES.okinawa.d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThan(ix);
      expect(nums[i]).toBeLessThan(ix + iw);
      expect(nums[i + 1]).toBeGreaterThan(iy);
      expect(nums[i + 1]).toBeLessThan(iy + ih);
    }
  });
});
