import { describe, expect, it } from "vitest";

import type { GameQuestion } from "@/components/games/game-question";

import {
  createSpaceGame,
  hasSafePath,
  HIT_WINDOW,
  layoutFor,
  moveTo,
  SHOT_COOLDOWN_MS,
  SHOT_MS,
  tick,
  throwSeed,
  TRAVEL,
  type SpaceItem,
  type SpaceSettings,
  type SpaceState,
} from "./space-engine";

/** docs/design/2026-10-19-space-trip-shoot-design.md 3・6章 */

const settings: SpaceSettings = { lanes: 3, fallMs: 6000, obstacleRows: 3 };

const questions: GameQuestion[] = [1, 2, 3].map((id) => ({
  id,
  prompt: `問題${id}？`,
  choices: [
    { id: id * 10 + 1, label: "A" },
    { id: id * 10 + 2, label: "B" },
    { id: id * 10 + 3, label: "C" },
  ],
  correctChoiceId: id * 10 + 2, // 真ん中の列(1)が正解
}));

function bare(over: Partial<SpaceState> = {}): SpaceState {
  return { ...createSpaceGame(questions, settings, 1), items: [], ...over };
}

function run(state: SpaceState, ms: number, each?: (s: SpaceState) => SpaceState): SpaceState {
  let next = state;
  for (let elapsed = 0; elapsed < ms; elapsed += 20) {
    next = tick(next, 20);
    if (each) next = each(next);
  }
  return next;
}

const meteor = (lane: number, at: number): SpaceItem => ({ kind: "meteor", lane, at, done: false });
const star = (lane: number, at: number): SpaceItem => ({ kind: "star", lane, at, done: false });

describe("避けられない岩をなくす(設計書2・3-4章)", () => {
  it("今までのバグ: 2列で、段の間隔0.133のとき、左右の岩は、よけられない", () => {
    // 0.433(左)と 0.567(右)。当たりの範囲が重なって、どの列にもいられない時間がある
    expect(hasSafePath([meteor(0, 0.4333), meteor(1, 0.5667)], 2, 8000)).toBe(false);
  });

  it("同じ列の岩が続くだけなら、ほかの列にいればよいので、よけられる", () => {
    expect(hasSafePath([meteor(0, 0.4333), meteor(0, 0.5667)], 2, 8000)).toBe(true);
  });

  it("間隔があいていて、列を移る時間がある(0.4秒+)なら、左右の岩でもよけられる。時間が足りなければ、よけられない", () => {
    // 6秒で、間隔0.3: (0.3-0.14)*6000 = 960ms。隣の列に移るには 400ms
    expect(hasSafePath([meteor(0, 0.35), meteor(1, 0.65)], 2, 6000)).toBe(true);
    // 4.5秒で、間隔0.16: (0.16-0.14)*4500 = 90ms。足りない
    expect(hasSafePath([meteor(0, 0.4), meteor(1, 0.56)], 2, 4500)).toBe(false);
  });

  it("隕石のない問題は、かならずよけられる", () => {
    expect(hasSafePath([star(0, 0.5)], 2, 8000)).toBe(true);
  });

  it("どの難しさ・どの種・どの問題番号でも、置かれた隕石は、よけられる", () => {
    const levels: [number, number, number][] = [[2, 2, 8000], [3, 3, 6000], [4, 4, 4500]]; // 列・段・fall_ms
    for (const [lanes, rows, fallMs] of levels) {
      for (let seed = 1; seed <= 200; seed++) {
        for (let index = 0; index < 10; index++) {
          const items = layoutFor(seed, index, lanes, rows, false, fallMs);
          expect({ lanes, seed, index, ok: hasSafePath(items, lanes, fallMs) }).toEqual({ lanes, seed, index, ok: true });
        }
      }
    }
  });

  it("道どおりに動けば、1回も隕石に当たらない(置き方・当たり・動きの通し)", () => {
    const lanesSettings: SpaceSettings[] = [
      { lanes: 2, fallMs: 8000, obstacleRows: 2 },
      { lanes: 3, fallMs: 6000, obstacleRows: 3 },
      { lanes: 4, fallMs: 4500, obstacleRows: 4 },
    ];
    for (const s of lanesSettings) {
      for (let seed = 1; seed <= 30; seed++) {
        const qs = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          prompt: "q",
          choices: Array.from({ length: s.lanes }, (_, l) => ({ id: (i + 1) * 10 + l, label: "x" })),
          correctChoiceId: (i + 1) * 10,
        }));
        let state = createSpaceGame(qs, s, seed);
        const hits: number[] = [];
        // お手本: 隕石が来ない列(その時点で、次に当たる段にも、重なる段にも、隕石がない列)へ、前もって動く
        state = run(state, s.fallMs * 12, (x) => {
          if (x.phase !== "falling") return x;
          const upcoming = x.items.filter((i) => i.kind === "meteor" && !i.done && i.at + HIT_WINDOW > x.progress && i.at - HIT_WINDOW - 0.12 < x.progress);
          const blocked = new Set(upcoming.map((i) => i.lane));
          if (blocked.has(x.lane)) {
            const free = Array.from({ length: s.lanes }, (_, l) => l).filter((l) => !blocked.has(l));
            if (free.length > 0) return moveTo(x, free.reduce((a, b) => (Math.abs(a - x.lane) <= Math.abs(b - x.lane) ? a : b)));
          }
          if (x.hitMs > 0) hits.push(x.index);
          return x;
        });
        expect({ lanes: s.lanes, seed, hits }).toEqual({ lanes: s.lanes, seed, hits: [] });
      }
    }
  });
});

describe("種を投げる(設計書3-1・3-2章)", () => {
  it("投げると種が出て、0.5秒のあいだは、次を投げられない", () => {
    let s = throwSeed(bare());
    expect(s.shots).toHaveLength(1);
    expect(s.shots[0].lane).toBe(s.lane);
    s = throwSeed(tick(s, 100));
    expect(s.shots).toHaveLength(1);
    s = run(s, SHOT_COOLDOWN_MS);
    expect(s.cooldownMs).toBe(0);
    expect(throwSeed(s).shots.length).toBeGreaterThanOrEqual(1);
  });

  it("進んでいない間(門のあとの○×・終わり)は、投げられない", () => {
    expect(throwSeed(bare({ phase: "feedback", feedbackMs: 500 })).shots).toHaveLength(0);
    expect(throwSeed(bare({ phase: "done" })).shots).toHaveLength(0);
  });

  it("隕石の列に投げると、隕石がこわれ、ロケットはぶつからない。星はゼロにならない", () => {
    // ロケットは真ん中(列1)。隕石が、同じ列のずっと上にある
    let s = bare({ progress: 0.2, stars: 1, items: [meteor(1, 0.5)] });
    s = throwSeed(s);
    s = run(s, 700);
    expect(s.items[0].done).toBe(true);
    expect(s.blasts.length).toBeGreaterThanOrEqual(0);
    expect(s.hitMs).toBe(0);
    expect(s.starsLocked).toBe(false);
    expect(s.stars).toBe(1);
    expect(s.shots).toHaveLength(0);
  });

  it("別の列の隕石には当たらない(種は、そのまま上まで飛んで消える)", () => {
    let s = bare({ progress: 0.2, items: [meteor(0, 0.5)] });
    s = throwSeed(s);
    s = run(s, SHOT_MS * 1.3);
    expect(s.items[0].done).toBe(false);
    expect(s.shots).toHaveLength(0);
  });

  it("星に当たると、星を取ったことになる(ぶつかっていなければ+1)。ぶつかったあとは、数えない", () => {
    let s = throwSeed(bare({ progress: 0.2, items: [star(1, 0.5)] }));
    s = run(s, 700);
    expect(s.items[0].done).toBe(true);
    expect(s.stars).toBe(1);

    let locked = throwSeed(bare({ progress: 0.2, starsLocked: true, items: [star(1, 0.5)] }));
    locked = run(locked, 700);
    expect(locked.items[0].done).toBe(true);
    expect(locked.stars).toBe(0);
  });

  it("種は、その列でいちばん近いものに当たって、消える。うしろのものには当たらない", () => {
    // ロケットに近いのは、着く時刻が早い隕石(0.45)。遠い隕石(0.62)には当たらない
    let s = bare({ progress: 0.3, items: [meteor(1, 0.45), meteor(1, 0.62)] });
    s = throwSeed(s);
    s = run(s, 700);
    const done = s.items.filter((i) => i.done);
    expect(done.map((i) => i.at)).toEqual([0.45]);
  });
});

describe("種を答えの門に当てて、すぐ答える(設計書3-2章)", () => {
  /** 門が見えている進み(門の位置が、画面の中) */
  const gateVisible = 0.6;

  it("正解の列(真ん中)の門に当てると、ロケットが門に着くのを待たずに、正解になる", () => {
    const s = run(throwSeed(bare({ progress: gateVisible })), SHOT_MS * 1.2);
    expect(s.phase).toBe("feedback");
    expect(s.lastCorrect).toBe(true);
    expect(s.gateLane).toBe(1);
    expect(s.progress).toBeLessThan(1); // 着いていない
    expect(s.answers).toHaveLength(1);
    expect(s.score).toBeGreaterThanOrEqual(10);
    expect(s.hearts).toBe(3);
  });

  it("まちがいの列の門に当てると、まちがい: ハート−1・コンボ0", () => {
    const left = moveTo(bare({ progress: gateVisible, combo: 2 }), 0);
    const s = run(throwSeed(left), SHOT_MS * 1.2);
    expect(s.lastCorrect).toBe(false);
    expect(s.gateLane).toBe(0);
    expect(s.hearts).toBe(2);
    expect(s.combo).toBe(0);
  });

  it("門が、まだ画面の上に見えていない間は、種は門に当たらない", () => {
    const s = run(throwSeed(bare({ progress: 0.05 })), SHOT_MS * 1.2);
    expect(s.phase).toBe("falling");
    expect(s.answers).toHaveLength(0);
  });

  it("隕石が門の前にあれば、先に隕石に当たる(門は決まらない)", () => {
    // ロケットのすぐ上(進みでいうと、まもなく着く)に隕石
    const s = run(throwSeed(bare({ progress: gateVisible, items: [meteor(1, gateVisible + 0.1)] })), SHOT_MS * 1.2);
    expect(s.items[0].done).toBe(true);
    expect(s.phase).toBe("falling");
  });

  it("早く答えたあとは、星が増えない。○×のあと、次の問題へ進み、種とためる時間がリセットされる", () => {
    let s = run(throwSeed(bare({ progress: gateVisible, stars: 2, items: [star(0, 0.9)] })), SHOT_MS * 1.2);
    expect(s.phase).toBe("feedback");
    expect(s.answers[0].stars).toBe(2);
    s = run(s, 1000);
    expect(s.phase).toBe("falling");
    expect(s.index).toBe(1);
    expect(s.shots).toHaveLength(0);
    expect(s.cooldownMs).toBe(0);
    expect(s.stars).toBe(0);
  });

  it("門に着いて答える今のやり方も、そのまま使える", () => {
    const s = run(bare(), 6200);
    expect(s.answers.length).toBeGreaterThanOrEqual(1);
  });
});

describe("種の飛び方", () => {
  it("種は、約SHOT_MSで画面の上まで飛ぶ。門の位置(TRAVEL)とは別の、実時間", () => {
    expect(SHOT_MS).toBeGreaterThan(300);
    expect(SHOT_MS).toBeLessThan(700);
    expect(TRAVEL).toBeGreaterThan(0);
  });
});
