import { describe, expect, it } from "vitest";

import { CATCH_MODES } from "@/components/games/catch/catch-view";

import { listedGames, MINI_GAMES, MINI_QUIZ_EMPTY, newGameNotices, readDismissed, writeDismissed } from "./mini-app";

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

  it("うちゅう旅行が入っていて、画面の設定の名前と同じ", () => {
    const spaceTrip = MINI_GAMES.find((game) => game.key === "space-trip");

    expect(spaceTrip).toMatchObject({ title: CATCH_MODES.space_trip.title, href: "/games/space-trip" });
    expect(spaceTrip?.description).toContain("ロケット");
  });
});

describe("ミニゲームの小出し(docs/design/2026-10-09-minigame-rollout-design.md)", () => {
  const flags = { new: false, featured: false, seasonal: false };

  it("APIにあるゲームだけを、一覧の順に、札つきで出す。APIにないゲームは出さない。読み込み前は空", () => {
    expect(listedGames(null)).toEqual([]);

    const games = listedGames([
      { key: "space-trip", ...flags, new: true },
      { key: "catch", ...flags, featured: true },
      { key: "unknown-game", ...flags },
    ]);

    expect(games.map((game) => game.key)).toEqual(["catch", "space-trip"]);
    expect(games[0]).toMatchObject({ featured: true, new: false });
    expect(games[1]).toMatchObject({ new: true, href: "/games/space-trip" });
  });

  it("お知らせは、NEWで、まだ閉じていないゲームだけ", () => {
    const games = listedGames([
      { key: "catch", ...flags },
      { key: "flag-catch", ...flags, new: true },
      { key: "space-trip", ...flags, new: true },
    ]);

    expect(newGameNotices(games, []).map((game) => game.key)).toEqual(["flag-catch", "space-trip"]);
    expect(newGameNotices(games, ["flag-catch"]).map((game) => game.key)).toEqual(["space-trip"]);
  });

  it("閉じたゲームは端末に覚える。読めない・書けないときも壊れない", () => {
    const store: Record<string, string> = {};
    const storage = { getItem: (key: string) => store[key] ?? null, setItem: (key: string, value: string) => void (store[key] = value) };

    expect(readDismissed(storage)).toEqual([]);
    writeDismissed(storage, ["space-trip"]);
    expect(readDismissed(storage)).toEqual(["space-trip"]);

    store["spra:dismissed-new-games"] = "こわれた";
    expect(readDismissed(storage)).toEqual([]);
    expect(readDismissed(null)).toEqual([]);
    expect(() => writeDismissed({ setItem: () => { throw new Error("blocked"); } }, ["a"])).not.toThrow();
  });
});
