import { describe, expect, it } from "vitest";

import { sceneViewBox, tileCenter } from "../iso";
import { tileAt } from "./tile-at";

/** docs/design/2026-10-19-town-roads-design.md 5-1。画面の座標 → マス。tileCenter の逆 */

const vb = sceneViewBox(17, 17);
// 表示の幅は vb の1/2(倍率0.5)。左上が画面の(100, 50)
const rect = { left: 100, top: 50, width: vb.width / 2, height: vb.height / 2 };
const screenOf = (x: number, y: number) => {
  const { sx, sy } = tileCenter(x, y);
  return { x: rect.left + ((sx - vb.x) / vb.width) * rect.width, y: rect.top + ((sy - vb.y) / vb.height) * rect.height };
};

describe("画面の座標からマス", () => {
  it("マスの中心を指すと、そのマス", () => {
    for (const [x, y] of [[0, 0], [3, 3], [5, 2], [16, 16], [0, 16], [16, 0]]) {
      const p = screenOf(x, y);
      expect(tileAt(p, rect, vb)).toEqual([x, y]);
    }
  });

  it("マスの菱形の内側(中心から少しずらす)でも、同じマス", () => {
    const p = screenOf(4, 6);
    expect(tileAt({ x: p.x + 6, y: p.y }, rect, vb)).toEqual([4, 6]);
    expect(tileAt({ x: p.x - 6, y: p.y }, rect, vb)).toEqual([4, 6]);
    expect(tileAt({ x: p.x, y: p.y + 3 }, rect, vb)).toEqual([4, 6]);
    expect(tileAt({ x: p.x, y: p.y - 3 }, rect, vb)).toEqual([4, 6]);
  });

  it("地図の外は、範囲外のマス番号になる(呼ぶ側が外と判断する)", () => {
    const [x, y] = tileAt({ x: rect.left - 500, y: rect.top }, rect, vb);
    expect(x < 0 || y < 0 || x > 16 || y > 16).toBe(true);
  });
});
