import { describe, expect, it } from "vitest";

import { MINI_GAMES, MINI_QUIZ_EMPTY } from "./mini-app";

describe("ミニゲームの一覧", () => {
  it("スプルキャッチ（えいたんご）が入っていて、名前・説明・行き先がある", () => {
    const catchGame = MINI_GAMES.find((game) => game.key === "catch");

    expect(catchGame).toMatchObject({ title: "スプルキャッチ（えいたんご）", href: "/games/catch" });
    expect(catchGame?.description).toContain("英語");
  });

  it("どのゲームも、名前・説明があり、行き先は /games/ で始まり、重ならない", () => {
    for (const game of MINI_GAMES) {
      expect(game.title.length).toBeGreaterThan(0);
      expect(game.description.length).toBeGreaterThan(0);
      expect(game.href.startsWith("/games/")).toBe(true);
    }
    expect(new Set(MINI_GAMES.map((game) => game.key)).size).toBe(MINI_GAMES.length);
    expect(new Set(MINI_GAMES.map((game) => game.href)).size).toBe(MINI_GAMES.length);
  });

  it("ミニクイズが無いときの文", () => {
    expect(MINI_QUIZ_EMPTY).toBe("ミニクイズは、じゅんびちゅうだよ");
  });
});
