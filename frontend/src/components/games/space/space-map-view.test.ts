import { describe, expect, it } from "vitest";

import type { SpaceMapResult, SpaceMapState, SpaceStop } from "./space-map-api";
import { mapResultLines, starsLine, stopLook, stopsForDisplay } from "./space-map-view";

const stop = (key: string, name: string, extra: Partial<SpaceStop> = {}): SpaceStop => ({
  key, name, difficulty: "初級", color: "#fff", note: "", open: false, cleared: false, stars: 0, ...extra,
});

describe("宇宙ぼうけんマップの見た目", () => {
  it("星の評価の表示", () => {
    expect(starsLine(0)).toBe("☆☆☆");
    expect(starsLine(2)).toBe("★★☆");
    expect(starsLine(3)).toBe("★★★");
    expect(starsLine(9)).toBe("★★★");
  });

  it("星の見た目: 閉じている・いま向かう・開いている・クリアした", () => {
    expect(stopLook(stop("a", "A"), "b")).toBe("locked");
    expect(stopLook(stop("b", "B", { open: true }), "b")).toBe("current");
    expect(stopLook(stop("c", "C", { open: true }), "b")).toBe("open");
    expect(stopLook(stop("b", "B", { open: true, cleared: true, stars: 2 }), "b")).toBe("cleared");
  });

  it("画面には、いちばん遠い星が上になるよう、逆の順で渡す", () => {
    const map: SpaceMapState = { stops: [stop("moon", "月"), stop("mars", "火星")], current: "moon" };
    expect(stopsForDisplay(map).map((s) => s.key)).toEqual(["mars", "moon"]);
  });

  it("終わりの一言: クリア・次の星・ボーナス。クリアできなかったとき", () => {
    const stops = [stop("moon", "月"), stop("mercury", "水星")];
    const cleared: SpaceMapResult = { stop: "moon", cleared: true, stars: 2, best_stars: 2, first_clear: true, unlocked: "mercury", bonus: { xp: 30, point: 30 }, new_cards: [] };

    expect(mapResultLines(cleared, stops)).toEqual(["月 クリア！ ★★☆", "水星への 道が ひらいたよ！", "はじめてのクリアボーナス 経験値 +30　学習ポイント +30"]);
    expect(mapResultLines({ ...cleared, first_clear: false, unlocked: null, bonus: null }, stops)).toEqual(["月 クリア！ ★★☆"]);
    expect(mapResultLines({ ...cleared, cleared: false, stars: 0 }, stops)).toEqual(["月は、あと少し！ 6わり以上 せいかいで クリアだよ"]);
  });
});
