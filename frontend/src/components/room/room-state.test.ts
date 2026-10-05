import { describe, expect, it } from "vitest";

import { ROOM_SIT_AFTER_MS, ROOM_WAVE_MS, roomLine, roomMode, roomSpruPose } from "./room-state";

describe("部屋の昼・夜(設計書 2026-10-05-spru-room 5章)", () => {
  it("スプルが寝ていれば夜、起きていれば昼", () => {
    expect(roomMode(true)).toBe("night");
    expect(roomMode(false)).toBe("day");
  });
});

describe("部屋のスプルの様子", () => {
  const opened = 1000;

  it("開いた直後は立っていて、8秒たつと座る", () => {
    expect(roomSpruPose({ openedAt: opened, lastTapAt: null }, opened)).toBe("idle");
    expect(roomSpruPose({ openedAt: opened, lastTapAt: null }, opened + ROOM_SIT_AFTER_MS - 1)).toBe("idle");
    expect(roomSpruPose({ openedAt: opened, lastTapAt: null }, opened + ROOM_SIT_AFTER_MS)).toBe("sit");
  });

  it("タップから1.6秒は手を振り、そのあとは立つ", () => {
    const state = { openedAt: opened, lastTapAt: 5000 };
    expect(roomSpruPose(state, 5000)).toBe("wave");
    expect(roomSpruPose(state, 5000 + ROOM_WAVE_MS - 1)).toBe("wave");
    expect(roomSpruPose(state, 5000 + ROOM_WAVE_MS)).toBe("idle");
  });

  it("タップから8秒たつと座り、タップするとまた手を振る", () => {
    const state = { openedAt: opened, lastTapAt: 5000 };
    expect(roomSpruPose(state, 5000 + ROOM_SIT_AFTER_MS - 1)).toBe("idle");
    expect(roomSpruPose(state, 5000 + ROOM_SIT_AFTER_MS)).toBe("sit");
    expect(roomSpruPose({ ...state, lastTapAt: 20000 }, 20100)).toBe("wave");
  });
});

describe("部屋のスプルのひとこと", () => {
  it("昼は3つを順に回す", () => {
    const lines = [0, 1, 2, 3].map((n) => roomLine("day", n));
    expect(lines[0]).toBe("やっほー！");
    expect(lines[1]).toBe("おかえり！");
    expect(lines[2]).toBe("きょうも いい日だね");
    expect(lines[3]).toBe(lines[0]);
  });

  it("夜は、いつも「すやすや…」", () => {
    expect(roomLine("night", 0)).toBe("すやすや…");
    expect(roomLine("night", 5)).toBe("すやすや…");
  });
});
