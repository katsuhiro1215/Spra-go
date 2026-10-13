import { describe, expect, it } from "vitest";

import { boardUrl, rankLines, rankingHref, RANKING_GAMES, rankText, valueText } from "./ranking-view";

describe("ランキングの表示", () => {
  it("点数は「点」、パズルは時間の書き方", () => {
    expect(valueText(false, 120)).toBe("120点");
    expect(valueText(true, 52000)).toBe("52.0秒");
    expect(valueText(true, 125000)).toBe("2:05");
  });

  it("順位の文", () => {
    expect(rankText(3)).toBe("3位");
  });

  it("終えた画面の行: 家族は必ず、みんなはあるときだけ。記録がなければ出さない", () => {
    expect(rankLines({ rank_family: 1 })).toEqual(["かぞくで 1位（こんしゅう）"]);
    expect(rankLines({ rank_family: 2, rank_public: 12 })).toEqual(["かぞくで 2位（こんしゅう）", "みんなで 12位（こんしゅう）"]);
    expect(rankLines({ rank_family: null })).toEqual([]);
    expect(rankLines({})).toEqual([]);
  });

  it("ゲームの画面からのリンクは、全ゲームでランキングの画面に対応する", () => {
    for (const { mode } of Object.values(RANKING_GAMES)) {
      const slug = rankingHref(mode).split("/").pop() as string;
      expect(RANKING_GAMES[slug].mode).toBe(mode);
    }
    expect(rankingHref("puzzle_flag")).toBe("/games/ranking/puzzle-flag");
  });

  it("パズルだけが時間のゲーム", () => {
    expect(Object.entries(RANKING_GAMES).filter(([, g]) => g.time).map(([slug]) => slug)).toEqual(["puzzle-flag", "puzzle-space"]);
  });

  it("問い合わせのURL", () => {
    expect(boardUrl("catch", "family", "初級", "week")).toBe("/api/games/catch/ranking?scope=family&difficulty=%E5%88%9D%E7%B4%9A&period=week");
  });
});
