import { describe, expect, it } from "vitest";

import { CATCH_MODES } from "@/components/games/catch/catch-view";

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

  it("スプルキャッチ（こっき）が入っていて、画面の設定の名前と同じ", () => {
    const flagCatch = MINI_GAMES.find((game) => game.key === "flag-catch");

    expect(flagCatch).toMatchObject({ title: CATCH_MODES.flag_catch.title, href: "/games/flag-catch" });
    expect(flagCatch?.description).toContain("国旗");
    expect(MINI_GAMES.find((game) => game.key === "catch")?.title).toBe(CATCH_MODES.catch.title);
  });

});
