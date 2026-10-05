import { describe, expect, it } from "vitest";

import { ROOM_ASSETS } from "./room-assets";
import { ROOM_CANVAS, ROOM_VIEW, roomItems } from "./room-layout";

const keys = (mode: "day" | "night", pose: "idle" | "wave" | "sit") => roomItems(mode, pose).map((item) => item.key);

describe("部屋の配置(設計書 2026-10-05-spru-room 4章)", () => {
  it("昼は、部屋→ベッド→テーブル→椅子→スプルの順(奥から手前)", () => {
    expect(keys("day", "idle")).toEqual(["room", "bed", "table", "chair", "spru_idle"]);
  });

  it("夜は、空のベッドの代わりに眠るスプル入りのベッド。起きているスプルは出ない", () => {
    expect(keys("night", "idle")).toEqual(["room", "bed_sleeping", "table", "chair"]);
    expect(keys("night", "sit")).not.toContain("spru_sit");
  });

  it("スプルの絵は、様子(待機・手を振る・座る)で切り替わる", () => {
    expect(keys("day", "wave").at(-1)).toBe("spru_wave");
    expect(keys("day", "sit").at(-1)).toBe("spru_sit");
  });

  it("すべての物が、部屋の見える範囲(1254×1254の中)に収まる", () => {
    for (const mode of ["day", "night"] as const) {
      for (const pose of ["idle", "wave", "sit"] as const) {
        for (const item of roomItems(mode, pose)) {
          expect(item.left, `${item.key} 左`).toBeGreaterThanOrEqual(ROOM_VIEW.x);
          expect(item.top, `${item.key} 上`).toBeGreaterThanOrEqual(ROOM_VIEW.y);
          expect(item.left + item.width, `${item.key} 右`).toBeLessThanOrEqual(ROOM_VIEW.x + ROOM_VIEW.width);
          expect(item.top + item.height, `${item.key} 下`).toBeLessThanOrEqual(ROOM_VIEW.y + ROOM_VIEW.height);
        }
      }
    }
    expect(ROOM_VIEW.x + ROOM_VIEW.width).toBeLessThanOrEqual(ROOM_CANVAS);
    expect(ROOM_VIEW.y + ROOM_VIEW.height).toBeLessThanOrEqual(ROOM_CANVAS);
  });

  it("部屋は元の位置のまま、家具は絵の大きさに倍率をかけた大きさ", () => {
    const room = roomItems("day", "idle")[0];
    expect([room.left, room.top, room.width, room.height]).toEqual([ROOM_ASSETS.room.x, ROOM_ASSETS.room.y, ROOM_ASSETS.room.width, ROOM_ASSETS.room.height]);
    const table = roomItems("day", "idle").find((item) => item.key === "table")!;
    expect(table.width).toBeCloseTo(ROOM_ASSETS.table.width * 0.27);
    expect(table.height).toBeCloseTo(ROOM_ASSETS.table.height * 0.27);
  });

  it("座るスプルは、立つスプルと足元の中心が同じ", () => {
    const standing = roomItems("day", "idle").at(-1)!;
    const sitting = roomItems("day", "sit").at(-1)!;
    expect(sitting.left + sitting.width / 2).toBeCloseTo(standing.left + standing.width / 2);
    expect(sitting.top + sitting.height).toBeCloseTo(standing.top + standing.height);
  });
});
