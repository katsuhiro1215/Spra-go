import { describe, expect, it } from "vitest";

import {
  createRun,
  DOUBLE_JUMP_V,
  GRAVITY,
  INVINCIBLE_MS,
  jump,
  JUMP_V,
  meters,
  minGapAfter,
  OBSTACLES,
  RUN_HEARTS,
  scoreOf,
  SPEED_MAX,
  SPEED_START,
  SPEED_STEP,
  SPRU_W,
  SPRU_X,
  tick,
  type RunState,
} from "./run-engine";

/** 16ms ずつ、ms だけ時間を進める */
function run(state: RunState, ms: number, each?: (s: RunState) => RunState): RunState {
  let s = state;
  for (let t = 0; t < ms; t += 16) {
    s = tick(s, 16);
    if (each) s = each(s);
  }
  return s;
}

/** じゃまものも、タネもない状態(動きだけを確かめる) */
function empty(state: RunState): RunState {
  return { ...state, obstacles: [], seeds: [], nextSpawnX: Number.POSITIVE_INFINITY };
}

/**
 * お手本の子: 前のじゃまものまでの近さで跳ぶ。高いものは、近づいたら、てっぺんで2段目を跳ぶ。
 * どのコースも、この子が走りきれる = こえられる並びになっている
 */
function bot(state: RunState): RunState {
  const front = SPRU_X + SPRU_W;
  const next = state.obstacles.find((o) => o.x - state.distance + o.w > SPRU_X);
  if (!next) return state;
  const d = next.x - state.distance - front;
  const tall = OBSTACLES[next.kind].tall;
  const grounded = state.y <= 0 && state.vy <= 0;
  if (grounded && d > 0 && d <= state.speed * (tall ? 0.45 : 0.15)) return jump(state);
  // 2段目は、その高いじゃまものが近いときだけ(遠くのものを見て、早く跳ばない)
  if (tall && !grounded && state.jumps === 1 && state.vy <= 0 && d <= state.speed * 0.45) return jump(state);
  return state;
}

describe("run-engine", () => {
  it("始めは、地面で、ハート3つ・始めの速さで走る", () => {
    const s = createRun(1);
    expect(s.phase).toBe("running");
    expect(s.y).toBe(0);
    expect(s.hearts).toBe(RUN_HEARTS);
    expect(s.speed).toBe(SPEED_START);
  });

  it("タップでジャンプし、しばらくすると地面にもどる", () => {
    let s = jump(empty(createRun(1)));
    expect(s.vy).toBe(JUMP_V);
    s = run(s, 300);
    expect(s.y).toBeGreaterThan(80);
    s = run(s, 600);
    expect(s.y).toBe(0);
    expect(s.jumps).toBe(0);
  });

  it("空中で2段ジャンプできるが、3段目はできない", () => {
    let s = run(jump(empty(createRun(1))), 200);
    s = jump(s);
    expect(s.jumps).toBe(2);
    expect(s.vy).toBe(DOUBLE_JUMP_V);
    const vy = run(s, 50).vy;
    const third = jump(run(s, 50));
    expect(third.vy).toBe(vy);
  });

  it("1回のジャンプでは高いじゃまものをこえられず、2段ジャンプならこえられる", () => {
    const single = (JUMP_V * JUMP_V) / (2 * GRAVITY);
    const tallMin = Math.min(...Object.values(OBSTACLES).filter((o) => o.tall).map((o) => o.h));
    const lowMax = Math.max(...Object.values(OBSTACLES).filter((o) => !o.tall).map((o) => o.h));
    expect(single).toBeLessThan(tallMin);
    expect(single).toBeGreaterThan(lowMax + 40);
    expect(single + (DOUBLE_JUMP_V * DOUBLE_JUMP_V) / (2 * GRAVITY)).toBeGreaterThan(tallMin + 40);
  });

  it("10秒ごとに速くなり、上限で止まる", () => {
    let s = empty(createRun(1));
    s = run(s, 10_050);
    expect(s.speed).toBe(SPEED_START + SPEED_STEP);
    s = run(s, 300_000);
    expect(s.speed).toBe(SPEED_MAX);
  });

  it("同じ種なら同じコース、ちがう種ならちがうコース", () => {
    const a = run(createRun(7), 5000, bot).obstacles.map((o) => [o.kind, o.x]);
    const b = run(createRun(7), 5000, bot).obstacles.map((o) => [o.kind, o.x]);
    const c = run(createRun(8), 5000, bot).obstacles.map((o) => [o.kind, o.x]);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("じゃまものの間かくは、こえて着地できる長さより短くない", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      const seen = new Map<number, RunState["obstacles"][number]>();
      s = run(s, 60_000, (x) => {
        for (const o of x.obstacles) seen.set(o.x, o);
        return bot(x);
      });
      const list = [...seen.values()].sort((p, q) => p.x - q.x);
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        expect(list[i].x - (prev.x + prev.w)).toBeGreaterThanOrEqual(minGapAfter(prev.kind, SPEED_START) - 0.001);
      }
    }
  });

  it("お手本の子は、どのコースも2分間ぶつからずに走れる", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = run(createRun(seed), 120_000, bot);
      expect({ seed, hearts: s.hearts }).toEqual({ seed, hearts: RUN_HEARTS });
    }
  });

  it("ぶつかるとハートが減り、点滅のあいだはぶつからない。0で終わる", () => {
    let s = run(createRun(3), 30_000); // 跳ばない
    expect(s.hearts).toBeLessThan(RUN_HEARTS);
    s = createRun(3);
    let first = -1;
    let second = -1;
    let t = 0;
    while (s.phase === "running" && t < 120_000) {
      const before = s.hearts;
      s = tick(s, 16);
      t += 16;
      if (s.hearts < before) {
        if (first < 0) first = t;
        else if (second < 0) second = t;
      }
    }
    expect(second - first).toBeGreaterThanOrEqual(INVINCIBLE_MS);
    expect(s.phase).toBe("done");
    expect(s.hearts).toBe(0);
    const after = tick(s, 16);
    expect(after).toBe(s);
  });

  it("タネは1個、金のタネは5個分を数える", () => {
    const base = empty(createRun(1));
    const s = tick(
      {
        ...base,
        seeds: [
          { x: SPRU_X + 10, y: 20, golden: false, taken: false },
          { x: SPRU_X + 20, y: 30, golden: true, taken: false },
        ],
      },
      16,
    );
    expect(s.seedValue).toBe(6);
    expect(s.seeds.every((seed) => seed.taken)).toBe(true);
  });

  it("点数は、距離(m)+タネ×10", () => {
    expect(scoreOf(1234, 6)).toBe(1234 + 60);
    expect(meters(400)).toBe(10);
  });

  it("一度に進める時間には上限がある(タブを離れたあとに一気に進まない)", () => {
    const s = tick(empty(createRun(1)), 5000);
    expect(s.elapsedMs).toBeLessThanOrEqual(100);
  });

  it("終わったあとは、ジャンプしない", () => {
    const done = { ...createRun(1), phase: "done" as const };
    expect(jump(done)).toBe(done);
  });
});
