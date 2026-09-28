import { describe, expect, it } from "vitest";

import { soundFace } from "./sound-face";

describe("音のボタンの絵", () => {
  it("オンは笑顔に♪", () => {
    expect(soundFace(true)).toEqual({ face: "laugh", mark: "♪", dim: false });
  });

  it("オフはふつうの顔を薄くして✕", () => {
    expect(soundFace(false)).toEqual({ face: "normal", mark: "✕", dim: true });
  });
});
