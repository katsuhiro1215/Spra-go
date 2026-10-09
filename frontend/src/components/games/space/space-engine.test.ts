import { describe, expect, it } from "vitest";

import type { GameQuestion } from "@/components/games/game-question";

import {
  answersOf,
  createSpaceGame,
  HIT_WINDOW,
  layoutFor,
  moveBy,
  moveTo,
  scoreOf,
  tick,
  type SpaceSettings,
  type SpaceState,
} from "./space-engine";

const settings: SpaceSettings = { lanes: 3, fallMs: 6000, obstacleRows: 3 };

const questions: GameQuestion[] = [1, 2, 3].map((id) => ({
  id,
  prompt: `問題${id}？`,
  choices: [
    { id: id * 10 + 1, label: "A" },
    { id: id * 10 + 2, label: "B" },
    { id: id * 10 + 3, label: "C" },
  ],
  correctChoiceId: id * 10 + 2, // 真ん中の列が正解
}));

/** 隕石も星もない状態で始める(判定だけを確かめるとき) */
function bare(over: Partial<SpaceState> = {}): SpaceState {
  return { ...createSpaceGame(questions, settings, 1), items: [], ...over };
}

/** 時間を進める(1回の上限があるので、小さく刻む) */
function run(state: SpaceState, ms: number): SpaceState {
  let next = state;
  for (let elapsed = 0; elapsed < ms; elapsed += 50) next = tick(next, 50);
  return next;
}

describe("隕石と星の置き方(設計書3-3)", () => {
  it("同じ種・同じ問題の番号なら、同じ並び", () => {
    expect(layoutFor(7, 2, 3, 3)).toEqual(layoutFor(7, 2, 3, 3));
  });

  it("種か問題の番号が違えば、並びが変わりうる", () => {
    const layouts = new Set([1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(layoutFor(seed, 0, 4, 4))));
    expect(layouts.size).toBeGreaterThan(1);
  });

  it("どの段にも、かならず空いている列がある(列が2つでも)", () => {
    for (const [lanes, rows] of [[2, 2], [3, 3], [4, 4]] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        for (let index = 0; index < 10; index++) {
          const meteors = layoutFor(seed, index, lanes, rows).filter((item) => item.kind === "meteor");
          const byRow = new Map<number, number>();
          for (const meteor of meteors) byRow.set(meteor.at, (byRow.get(meteor.at) ?? 0) + 1);
          for (const count of byRow.values()) expect(count).toBeLessThanOrEqual(lanes - 1);
        }
      }
    }
  });

  it("隕石の段は、難しさの段の数だけ(隕石がある段の数は、それ以下)", () => {
    const atTimes = new Set(layoutFor(3, 0, 4, 4).filter((item) => item.kind === "meteor").map((item) => item.at));
    expect(atTimes.size).toBeLessThanOrEqual(4);
  });

  it("星は最大3つで、近くの隕石と同じ列に置かない", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const items = layoutFor(seed, 1, 3, 3);
      const stars = items.filter((item) => item.kind === "star");
      expect(stars.length).toBeLessThanOrEqual(3);
      for (const star of stars) {
        const clash = items.some((item) => item.kind === "meteor" && item.lane === star.lane && Math.abs(item.at - star.at) < HIT_WINDOW * 2);
        expect(clash).toBe(false);
      }
    }
  });

  it("calm(動きを減らす設定)なら、隕石は出さず、星だけ", () => {
    const items = layoutFor(3, 0, 3, 3, true);
    expect(items.some((item) => item.kind === "meteor")).toBe(false);
    expect(items.filter((item) => item.kind === "star")).toHaveLength(3);
    expect(createSpaceGame(questions, { ...settings, calm: true }, 3).items.some((item) => item.kind === "meteor")).toBe(false);
  });

  it("列は 0〜列の数−1 の中", () => {
    for (const item of layoutFor(5, 4, 2, 2)) {
      expect(item.lane).toBeGreaterThanOrEqual(0);
      expect(item.lane).toBeLessThanOrEqual(1);
    }
  });
});

describe("動かす", () => {
  it("1問目は真ん中の列から始まる", () => {
    expect(createSpaceGame(questions, settings, 1).lane).toBe(1);
  });

  it("端より外には行かない", () => {
    expect(moveBy(moveBy(bare({ lane: 0 }), -1), -1).lane).toBe(0);
    expect(moveTo(bare(), 99).lane).toBe(2);
  });

  it("門をくぐった後(feedback)は動かせない", () => {
    expect(moveBy(bare({ phase: "feedback" }), 1).lane).toBe(1);
  });
});

describe("星と隕石", () => {
  const star = { kind: "star" as const, lane: 1, at: 0.5, done: false };
  const meteor = { kind: "meteor" as const, lane: 1, at: 0.6, done: false };

  it("同じ列で星のところを通ると、星を集める", () => {
    const state = run(bare({ items: [star] }), 3300);
    expect(state.stars).toBe(1);
    expect(state.items[0].done).toBe(true);
  });

  it("別の列にいれば、星は集まらない", () => {
    expect(run(bare({ items: [star], lane: 0 }), 3300).stars).toBe(0);
  });

  it("隕石にぶつかると、その問題の星がゼロになり、ハートは減らない。そのあとの星も数えない", () => {
    const later = { kind: "star" as const, lane: 1, at: 0.7, done: false };
    const state = run(bare({ items: [star, meteor, later] }), 4500);

    expect(state.stars).toBe(0);
    expect(state.starsLocked).toBe(true);
    expect(state.hearts).toBe(3);
    expect(state.hitMs).toBeGreaterThanOrEqual(0);
  });

  it("隕石は、よければ当たらない", () => {
    const state = run(bare({ items: [meteor], lane: 0 }), 4500);
    expect(state.starsLocked).toBe(false);
  });

  it("ぶつかった瞬間は hitMs が立ち、時間とともに0へ戻る", () => {
    let state = run(bare({ items: [{ ...meteor, at: 0.1 }] }), 700);
    expect(state.hitMs).toBeGreaterThan(0);
    state = run(state, 1500);
    expect(state.hitMs).toBe(0);
  });
});

describe("門で答えが決まる(設計書3-2)", () => {
  it("門の位置(進みが1)に着くと、いる列の門で判定する。正解は +10点とコンボ", () => {
    const state = run(bare(), 6100);

    expect(state.phase).toBe("feedback");
    expect(state.lastCorrect).toBe(true);
    expect(state.score).toBe(10);
    expect(state.combo).toBe(1);
    expect(state.answers).toEqual([{ questionId: 1, choiceId: 12, correct: true, stars: 0 }]);
  });

  it("まちがいは、ハートが1つ減り、コンボが0に戻る", () => {
    const state = run(bare({ lane: 0 }), 6100);

    expect(state.lastCorrect).toBe(false);
    expect(state.hearts).toBe(2);
    expect(state.combo).toBe(0);
    expect(state.score).toBe(0);
  });

  it("集めた星は、点数に足される(まちがえた問題の星も)", () => {
    const stars = { ...bare({ lane: 0 }), stars: 3 };
    const state = run(stars, 6100);

    expect(state.score).toBe(3);
    expect(state.answers[0].stars).toBe(3);
  });

  it("コンボが3以上の正解は +5点", () => {
    let state = bare();
    for (let i = 0; i < 3; i++) {
      state = run(state, 6100); // 判定
      state = run(state, 900); // ○を見せて、次の問題へ
      state = { ...state, items: [] };
    }

    expect(state.score).toBe(10 + 10 + 15);
    expect(state.bestCombo).toBe(3);
  });

  it("次の問題に移ると、星と隕石の状態が新しくなる", () => {
    let state = run({ ...bare(), stars: 2, starsLocked: true }, 6100);
    state = run(state, 900);

    expect(state.index).toBe(1);
    expect(state.stars).toBe(0);
    expect(state.starsLocked).toBe(false);
    expect(state.progress).toBeLessThan(0.05); // 次の問題が始まって、少しだけ進んだところ
    expect(state.phase).toBe("falling");
  });

  it("ハートがなくなったら終わる。最後の問題でも終わる", () => {
    const dead = run(bare({ lane: 0, hearts: 1 }), 6100);
    expect(run(dead, 2000).phase).toBe("done");

    let state = createSpaceGame(questions.slice(0, 1), settings, 1);
    state = run({ ...state, items: [] }, 6100);
    expect(run(state, 900).phase).toBe("done");
  });

  it("タブを離れていたあとに、一気には進まない(1回の上限)", () => {
    expect(tick(bare(), 100000).progress).toBeLessThan(0.05);
  });
});

describe("点数と送る答え", () => {
  it("scoreOf は、サーバーの CatchGame::score と同じ決まり(星込み)", () => {
    expect(scoreOf([{ correct: true, stars: 1 }, { correct: true, stars: 2 }, { correct: true, stars: 3 }])).toEqual({ score: 41, bestCombo: 3 });
    expect(scoreOf([{ correct: false, stars: 2 }])).toEqual({ score: 2, bestCombo: 0 });
  });

  it("answersOf は、答えた順に、星の数を付ける", () => {
    const answers = [{ questionId: 1, choiceId: 12, correct: true, stars: 3 }];
    expect(answersOf({ ...bare(), answers })).toEqual([{ question_id: 1, choice_id: 12, stars: 3 }]);
  });
});
