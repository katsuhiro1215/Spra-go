import { describe, expect, it } from "vitest";

import { IDLE_LIMIT_MS, shouldSendBeat } from "./play-time";

const base = { hasProfile: true, visible: true, lastActivityAt: 1_000_000, now: 1_030_000 };

describe("shouldSendBeat", () => {
  it("プロフィールがあり、画面が見えていて、直近60秒以内に操作があれば送る", () => {
    expect(shouldSendBeat(base)).toBe(true);
    expect(shouldSendBeat({ ...base, now: base.lastActivityAt + IDLE_LIMIT_MS })).toBe(true);
  });

  it("画面が隠れている・操作が60秒より前・プロフィールが無いときは送らない", () => {
    expect(shouldSendBeat({ ...base, visible: false })).toBe(false);
    expect(shouldSendBeat({ ...base, now: base.lastActivityAt + IDLE_LIMIT_MS + 1 })).toBe(false);
    expect(shouldSendBeat({ ...base, hasProfile: false })).toBe(false);
  });
});
