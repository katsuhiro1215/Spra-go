import { describe, expect, it } from "vitest";

import { costumeImage } from "./costume";

describe("着ている衣装の絵(docs/design/2026-10-17-spru-costumes-design.md 3章)", () => {
  it("衣装のキーがあれば、その衣装の絵。なければ・知らないキーなら null(ふつうのスプラの絵を使う)", () => {
    expect(costumeImage("halloween-ghost")?.src).toBe("/spru/costumes/halloween-ghost.webp");
    expect(costumeImage(null)).toBeNull();
    expect(costumeImage(undefined)).toBeNull();
    expect(costumeImage("no-such")).toBeNull();
  });

  it("季節のあいさつ用の4つ(halloween など)は、着られる衣装ではないので null", () => {
    expect(costumeImage("halloween")).toBeNull();
  });

  it("スイムコイン交換所の衣装(hero-・cool-・kawaii-)も、着られる衣装として返る", () => {
    expect(costumeImage("hero-knight")?.src).toBe("/spru/costumes/hero-knight.webp");
    expect(costumeImage("cool-biker")?.src).toBe("/spru/costumes/cool-biker.webp");
    expect(costumeImage("kawaii-heart")?.src).toBe("/spru/costumes/kawaii-heart.webp");
  });
});
