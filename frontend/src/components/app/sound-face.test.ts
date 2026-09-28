import { describe, expect, it } from "vitest";

import { soundIcon } from "./sound-face";

describe("音のボタンの絵(docs/design/2026-09-29-spru-icons-design.md 4-3)", () => {
  it("オンは音オンの絵", () => {
    expect(soundIcon(true)).toBe("sound-on");
  });

  it("オフは音オフの絵", () => {
    expect(soundIcon(false)).toBe("sound-off");
  });
});
