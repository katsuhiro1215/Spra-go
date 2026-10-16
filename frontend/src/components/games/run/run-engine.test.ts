import { describe, expect, it } from "vitest";

import {
  createRun,
  DOUBLE_JUMP_V,
  GRAVITY,
  idealCenterTime,
  INVINCIBLE_MS,
  jump,
  jumpHeightAt,
  JUMP_V,
  choosePattern,
  SILVER_VALUE,
  TRIPLE_JUMP_V,
  meters,
  minGapAfter,
  OBSTACLES,
  PATTERNS,
  BEE_BASE,
  PLATFORM_TOPS,
  PLATFORM_STEP,
  PLATFORM_CEILING,
  platformExitGap,
  RUN_HEARTS,
  scoreOf,
  MAX_SEED_VALUE_PER_SEC,
  SPEED_MAX,
  SPEED_START,
  SPEED_STEP,
  SPRU_W,
  SPRU_X,
  tick,
  type PatternId,
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
  return { ...state, obstacles: [], seeds: [], platforms: [], nextSpawnX: Number.POSITIVE_INFINITY };
}

/**
 * お手本の子: 前のじゃまものまでの近さで跳ぶ。高いものは、近づいたら、てっぺんで2段目を跳ぶ。
 * どのコースも、この子が走りきれる = こえられる並びになっている
 */
function bot(state: RunState): RunState {
  const front = SPRU_X + SPRU_W;
  const next = state.obstacles.find((o) => (o.base ?? 0) === 0 && o.x - state.distance + o.w > SPRU_X);
  if (!next) return state;
  const d = next.x - state.distance - front;
  const tall = OBSTACLES[next.kind].tall;
  const grounded = state.y <= 0 && state.vy <= 0;
  if (grounded && d > 0 && d <= state.speed * (tall ? 0.45 : 0.15)) return jump(state);
  // 2段目は、その高いじゃまものが近いときだけ(遠くのものを見て、早く跳ばない)
  if (tall && !grounded && state.jumps === 1 && state.vy <= 0 && d <= state.speed * 0.45) return jump(state);
  return state;
}

/**
 * ちょうどよく跳ぶ子: じゃまものの真ん中が、決めた時間(idealCenterTime)のあとにスプルの真ん中に来るときに跳ぶ。
 * 高いものは、てっぺんで2段目を跳ぶ
 */
function idealBot(state: RunState): RunState {
  const next = state.obstacles.find((o) => (o.base ?? 0) === 0 && o.x - state.distance + o.w > SPRU_X);
  if (!next) return state;
  const tall = OBSTACLES[next.kind].tall;
  const ahead = next.x + next.w / 2 - state.distance - (SPRU_X + SPRU_W / 2);
  const grounded = state.y <= 0 && state.vy <= 0;
  if (grounded && ahead > 0 && ahead <= state.speed * idealCenterTime(tall)) return jump(state);
  if (tall && !grounded && state.jumps === 1 && state.vy <= 0 && ahead <= state.speed * idealCenterTime(true)) return jump(state);
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

  it("空中で2段・3段ジャンプができるが、4回目はできない", () => {
    let s = run(jump(empty(createRun(1))), 200);
    s = jump(s);
    expect(s.jumps).toBe(2);
    expect(s.vy).toBe(DOUBLE_JUMP_V);
    s = run(s, 150);
    s = jump(s);
    expect(s.jumps).toBe(3);
    expect(s.vy).toBe(TRIPLE_JUMP_V);
    const vy = run(s, 50).vy;
    const fourth = jump(run(s, 50));
    expect(fourth.vy).toBe(vy);
  });

  it("3段ジャンプは、2段ジャンプより、さらに上がれる。着地すると、また3回跳べる", () => {
    const two = (() => {
      let top = 0;
      run(jump(empty(createRun(1))), 1500, (x) => {
        top = Math.max(top, x.y);
        if (x.jumps === 1 && x.vy <= 0) return jump(x);
        return x;
      });
      return top;
    })();
    let top3 = 0;
    const end = run(jump(empty(createRun(1))), 2000, (x) => {
      top3 = Math.max(top3, x.y);
      if ((x.jumps === 1 || x.jumps === 2) && x.vy <= 0) return jump(x);
      return x;
    });
    expect(top3).toBeGreaterThan(two + 30);
    expect(end.jumps).toBe(0);
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
        for (const o of x.obstacles) if ((o.base ?? 0) === 0) seen.set(o.x, o); // 空中のハチ・床の上の岩は、地面のじゃまものではない
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

  it("ちょうどよく跳ぶと、ぶつからず、じゃまものの上・手前のタネと、タネの川は、ほとんど取れる", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const seen = new Map<string, { x: number; golden: boolean; silver?: boolean }>();
      const s = run(createRun(seed), 60_000, (x) => {
        for (const item of x.seeds) {
          if (["ground", "arc", "river"].includes(item.kind)) seen.set(`${item.x}:${item.y}`, { x: item.x, golden: item.golden, silver: item.silver });
        }
        return idealBot(x);
      });
      // スプルが通り過ぎたタネだけを数える(まだ右にあるタネは、取れていなくて当然)
      let passed = 0;
      for (const item of seen.values()) if (item.x < s.distance + SPRU_X) passed += item.golden ? 5 : item.silver ? 2 : 1;
      expect({ seed, hearts: s.hearts }).toEqual({ seed, hearts: RUN_HEARTS });
      expect(s.seedValue).toBeGreaterThanOrEqual(passed * 0.9);
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

  it("タネは1個、銀のタネは2個分、金のタネは5個分を数える", () => {
    const base = empty(createRun(1));
    const s = tick(
      {
        ...base,
        seeds: [
          { x: SPRU_X + 10, y: 20, golden: false, taken: false, kind: "ground" },
          { x: SPRU_X + 20, y: 30, golden: true, taken: false, kind: "ground" },
          { x: SPRU_X + 15, y: 25, golden: false, silver: true, taken: false, kind: "ground" },
        ],
      },
      16,
    );
    expect(s.seedValue).toBe(1 + 5 + SILVER_VALUE);
    expect(SILVER_VALUE).toBe(2);
    expect(s.seeds.every((seed) => seed.taken)).toBe(true);
  });

  it("点数は、距離(m)+タネ×10", () => {
    expect(scoreOf(1234, 6)).toBe(1234 * 2 + 6 * 2);
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


/** 床の上に立つ、置いて確かめるための状態 */
function onTopOf(platform: { x: number; w: number; top: number }, y: number, vy = 0): RunState {
  const inAir = y > 0 && y !== platform.top;
  return { ...empty(createRun(1)), platforms: [{ ...platform }], y, vy, jumps: inAir ? 1 : 0, standing: !inAir };
}

describe("床(ジャンプで登れる足場)", () => {
  const platform = { x: SPRU_X - 20, w: 260, top: 56 };

  it("上から落ちてきたら、床の上に着地して、ジャンプの回数がもどる", () => {
    const s = run(onTopOf(platform, 90, -50), 300);
    expect(s.y).toBe(platform.top);
    expect(s.jumps).toBe(0);
    expect(s.standing).toBe(true);
  });

  it("下から跳ぶと、すり抜けて、上から着地できる(頭をぶつけない)", () => {
    const start = jump(onTopOf(platform, 0));
    let sawAbove = false;
    const s = run(start, 700, (x) => {
      if (x.y > platform.top) sawAbove = true;
      return x;
    });
    expect(sawAbove).toBe(true);
    expect(s.y).toBe(platform.top);
    expect(s.standing).toBe(true);
  });

  it("跳ばずに下を走ると、床のはしにも、ぶつからない。地面のまま", () => {
    const s = run(onTopOf(platform, 0), 800);
    expect(s.y).toBe(0);
    expect(s.hearts).toBe(RUN_HEARTS);
  });

  it("床の上を走りきると、床のはしから落ちて、地面にもどる", () => {
    const s = run(onTopOf({ x: SPRU_X, w: 80, top: 56 }, 56), 1500);
    expect(s.y).toBe(0);
    expect(s.standing).toBe(true);
  });

  it("床の上でも、ジャンプと2段ジャンプができる。床の上からの1段目は、床より高く上がる", () => {
    let s = jump(onTopOf(platform, platform.top));
    expect(s.vy).toBe(JUMP_V);
    s = run(s, 250);
    expect(s.y).toBeGreaterThan(platform.top + 50);
  });

  it("高い床は、地面からの2段ジャンプ・低い床からの1段ジャンプで届く高さにある", () => {
    const single = (JUMP_V * JUMP_V) / (2 * GRAVITY);
    const double = single + (DOUBLE_JUMP_V * DOUBLE_JUMP_V) / (2 * GRAVITY);
    const [low, high] = [PLATFORM_TOPS.low, PLATFORM_TOPS.high];
    expect(single).toBeGreaterThan(low + 20); // 地面から1回で低い床へ
    expect(single).toBeLessThan(high); // 高い床は、地面から1回では届かない
    expect(double).toBeGreaterThan(high + 20); // 地面から2段で高い床へ
    expect(low + single).toBeGreaterThan(high + 20); // 低い床から1回で高い床へ
  });

  it("床の上に置いた岩は、床の上でジャンプしないとぶつかる。床の下を走るときは、ぶつからない", () => {
    const rock = { kind: "rock" as const, x: 0, w: 50, h: 36, base: platform.top, hit: false };
    const rockOnScreen = { ...rock, x: SPRU_X - 5 };
    const under = run({ ...empty(createRun(1)), obstacles: [rockOnScreen] }, 100);
    expect(under.hearts).toBe(RUN_HEARTS);
    const standing = run({ ...onTopOf({ x: SPRU_X - 100, w: 300, top: platform.top }, platform.top), obstacles: [rockOnScreen] }, 100);
    expect(standing.hearts).toBe(RUN_HEARTS - 1);
  });
});

describe("パターンの選び方", () => {
  const ground: PatternId[] = ["single"];
  const roll = (value: number) => () => value;

  it("地面のパターンが2回続いたら、次は、かならず床のパターン", () => {
    for (const value of [0, 0.2, 0.5, 0.8, 0.99]) {
      const id = choosePattern(["single", "single"], 20_000, roll(value));
      expect(PATTERNS[id].kind).toBe("platform");
    }
  });

  it("間にタネのパターンが入れば、床は強制されない", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i++) kinds.add(PATTERNS[choosePattern(["single", "river"], 20_000, roll(i / 40))].kind);
    expect(kinds.has("ground")).toBe(true);
  });

  it("同じパターンを3回続けない", () => {
    for (let i = 0; i < 60; i++) {
      const id = choosePattern(["river", "river"], 30_000, roll(i / 60));
      expect(id).not.toBe("river");
    }
    for (let i = 0; i < 60; i++) {
      const id = choosePattern(["wave", "wave"], 30_000, roll(i / 60));
      expect(id).not.toBe("wave");
    }
  });

  it("始めの数秒は、床が出ない。床は、ほかのパターンが続いたあとの8秒ごろから", () => {
    for (let i = 0; i < 60; i++) {
      expect(PATTERNS[choosePattern([], 0, roll(i / 60))].kind).not.toBe("platform");
      expect(PATTERNS[choosePattern(["single"], 2000, roll(i / 60))].kind).not.toBe("platform");
    }
    expect(ground.length).toBe(1);
  });

  it("時間が経つほど、パターンの種類が増える", () => {
    const seen = (ms: number) => {
      const ids = new Set<PatternId>();
      for (let i = 0; i < 400; i++) ids.add(choosePattern([], ms, roll(i / 400)));
      return ids.size;
    };
    expect(seen(0)).toBeLessThan(seen(15_000));
    expect(seen(15_000)).toBeLessThan(seen(40_000));
    expect(seen(40_000)).toBe(Object.keys(PATTERNS).length);
  });
});

/** 床に登って、タネを集める子。ふつうのじゃまものは、idealBot と同じように、こえる */
function platformBot(state: RunState): RunState {
  const front = SPRU_X + SPRU_W;
  const standing = state.standing;
  const next = state.platforms.find((p) => p.x + p.w - state.distance > SPRU_X + SPRU_W / 2 && p.top <= PLATFORM_TOPS.high);
  if (next) {
    const ahead = next.x - state.distance - front;
    const climbFromGround = standing && state.y === 0 && next.top <= PLATFORM_TOPS.low && ahead > 0 && ahead <= state.speed * 0.5;
    const climbFromLow = standing && state.y > 0 && state.y < next.top && next.top > PLATFORM_TOPS.low && ahead > 0 && ahead <= state.speed * 0.45;
    if (climbFromGround || climbFromLow) return jump(state);
    // 床の上から、1段上の床(横に重なっているもの)へ
    if (standing && state.y > 0) {
      const above = state.platforms.find(
        (q) => Math.abs(q.top - (state.y + PLATFORM_STEP)) < 0.5 && q.x - state.distance - front <= state.speed * 0.4 && q.x + q.w - state.distance > SPRU_X + 70,
      );
      if (above) return jump(state);
    }
  }
  // 床の上の岩・地面のじゃまもの
  const rock = state.obstacles.find((o) => (o.base ?? 0) > 0 && o.x - state.distance + o.w > SPRU_X);
  if (rock && standing && state.y === rock.base) {
    const d = rock.x - state.distance - front;
    if (d > 0 && d <= state.speed * 0.15) return jump(state);
  }
  return idealBot(state);
}

describe("床のパターンも、こえられる・登れる", () => {
  it("床に登るお手本の子は、どのコースも1分間ぶつからず、床の上のタネを、ほとんど集める", () => {
    let platformSeeds = 0;
    let taken = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const seen = new Set<string>();
      const s = run(createRun(seed), 60_000, (x) => {
        for (const item of x.seeds) {
          if (item.kind === "platform" && !seen.has(`${item.x}:${item.y}`)) {
            seen.add(`${item.x}:${item.y}`);
            platformSeeds += item.golden ? 5 : item.silver ? 2 : 1;
          }
        }
        return platformBot(x);
      });
      expect({ seed, hearts: s.hearts }).toEqual({ seed, hearts: RUN_HEARTS });
      taken += s.seedValue;
    }
    expect(platformSeeds).toBeGreaterThan(100); // 床のパターンが、ちゃんと出ている
    expect(taken).toBeGreaterThan(platformSeeds * 0.5);
  });

  it("どのコースにも、1分のうちに、床のパターンが出る。60秒までに2種類以上の床", () => {
    let withPlatform = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      const kinds = new Set<string>();
      for (let t = 0; t < 60_000; t += 16) {
        s = idealBot(tick(s, 16));
        for (const p of s.platforms) kinds.add(`${p.top}`);
        if (s.hearts <= 0) break;
      }
      if (kinds.size >= 1) withPlatform++;
    }
    expect(withPlatform).toBe(30);
  });

  it("床のあとには、落ちて着地して、次のじゃまものに備える間かくがある", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      const platforms = new Map<number, { x: number; w: number; top: number }>();
      const obstacles = new Map<number, { x: number; base: number }>();
      s = run(s, 60_000, (x) => {
        for (const p of x.platforms) platforms.set(p.x, p);
        for (const o of x.obstacles) obstacles.set(o.x, { x: o.x, base: o.base ?? 0 });
        return idealBot(x);
      });
      for (const p of platforms.values()) {
        const after = [...obstacles.values()].filter((o) => o.base === 0 && o.x > p.x + p.w - 1);
        const nearest = Math.min(...after.map((o) => o.x), Number.POSITIVE_INFINITY);
        if (Number.isFinite(nearest)) expect(nearest - (p.x + p.w)).toBeGreaterThanOrEqual(platformExitGap(SPEED_START, p.top) - 0.001);
      }
    }
  });
});

describe("タネの数", () => {
  it("まえより、タネが多い: 60秒走って、タネが150個より多く出る(速さのある川・波・床で)", () => {
    for (let seed = 1; seed <= 10; seed++) {
      let s = createRun(seed);
      const all = new Set<string>();
      s = run(s, 60_000, (x) => {
        for (const item of x.seeds) all.add(`${item.x}:${item.y}`);
        return platformBot(x);
      });
      expect(all.size).toBeGreaterThan(150);
    }
  });
});

describe("タネの波", () => {
  it("最初のタネのところで跳ぶと、波のタネを、ほとんど取れる(ぶつからない)", () => {
    let total = 0;
    let taken = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      const seenWave = new Set<string>();
      let before = new Set<string>();
      for (let t = 0; t < 60_000; t += 16) {
        const ground = s.standing && s.y === 0;
        const first = s.seeds.find((x) => x.kind === "wave" && x.y < 40 && x.x - s.distance > SPRU_X - 4);
        const started = ground && first && first.x - s.distance - (SPRU_X + SPRU_W / 2) <= 8;
        s = idealBot(started ? jump(s) : s);
        s = tick(s, 16);
        const now = new Set(s.seeds.filter((x) => x.kind === "wave" && x.x - s.distance > -100).map((x) => `${x.x}:${x.y}`));
        for (const key of before) if (!now.has(key)) taken++;
        for (const key of now) seenWave.add(key);
        before = now;
        expect(s.hearts).toBe(RUN_HEARTS);
      }
      total += seenWave.size;
    }
    expect(total).toBeGreaterThan(100);
    expect(taken).toBeGreaterThan(total * 0.6);
  });
});


describe("そびえる床(タワー): 画面の高いところまで、床を一段ずつ登る", () => {
  const towerAt = (elapsedMs: number) => {
    let s = { ...empty(createRun(5)), elapsedMs };
    const built = PATTERNS.tower.build({ x: 400, speed: 300, passSpeed: 300, elapsedMs: s.elapsedMs, roll: () => 0.4 });
    s = { ...s, platforms: built.platforms, seeds: built.seeds };
    return { s, built };
  };

  it("段の高さの差は、1回のジャンプで登れる大きさ。上の段は、下の段と、横に重なっている", () => {
    const single = (JUMP_V * JUMP_V) / (2 * GRAVITY);
    const { built } = towerAt(30_000);
    const tiers = [...built.platforms].sort((a, b) => a.top - b.top);
    expect(tiers.length).toBeGreaterThanOrEqual(3);
    expect(PLATFORM_STEP).toBeLessThan(single - 15);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].top - tiers[i - 1].top).toBe(PLATFORM_STEP);
      expect(tiers[i].x).toBeLessThan(tiers[i - 1].x + tiers[i - 1].w - 60);
      expect(tiers[i].x).toBeGreaterThan(tiers[i - 1].x);
    }
  });

  it("段の数は、時間とともに増える。いちばん高い床でも、画面の高さの上限をこえない。空にタネがある", () => {
    const early = towerAt(14_000).built.platforms.length;
    const late = towerAt(60_000).built.platforms.length;
    expect(late).toBeGreaterThan(early);
    const { built } = towerAt(60_000);
    const top = Math.max(...built.platforms.map((p) => p.top));
    expect(top + 100).toBeLessThanOrEqual(PLATFORM_CEILING);
    expect(built.seeds.filter((x) => x.kind === "high").some((x) => x.y > top + 60)).toBe(true);
  });

  it("一段ずつ登るお手本の子は、高い床まで登って、上のタネも集める。ぶつからない", () => {
    let towers = 0;
    let reached = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      const climbed = new Set<number>();
      const seenTowers = new Set<number>();
      s = run(s, 80_000, (x) => {
        for (const p of x.platforms) if (p.top >= PLATFORM_TOPS.low + PLATFORM_STEP * 2) seenTowers.add(p.x);
        if (x.standing && x.y >= PLATFORM_TOPS.low + PLATFORM_STEP * 2) {
          const p = x.platforms.find((q) => q.top === x.y);
          if (p) climbed.add(p.x);
        }
        return platformBot(x);
      });
      expect({ seed, hearts: s.hearts }).toEqual({ seed, hearts: RUN_HEARTS });
      towers += seenTowers.size;
      reached += climbed.size;
    }
    expect(towers).toBeGreaterThan(40);
    expect(reached).toBeGreaterThan(towers * 0.6);
  });
});


describe("新しい障害物", () => {
  it("ハチは、頭の少し上に浮いている。走って下をくぐればぶつからず、ジャンプするとぶつかる", () => {
    const bee = { kind: "bee" as const, x: SPRU_X - 5, w: OBSTACLES.bee.w, h: OBSTACLES.bee.h, base: BEE_BASE, hit: false };
    const under = run({ ...empty(createRun(1)), obstacles: [{ ...bee }] }, 200);
    expect(under.hearts).toBe(RUN_HEARTS);
    expect(BEE_BASE).toBeGreaterThan(50); // 走るスプル(高さ50)が、くぐれる
    const jumped = run(jump({ ...empty(createRun(1)), obstacles: [{ ...bee, x: SPRU_X + 40 }] }), 400);
    expect(jumped.hearts).toBe(RUN_HEARTS - 1);
  });

  it("キノコ・ハリネズミは、石・切り株と同じように、1回のジャンプでこえられる大きさ", () => {
    const single = (JUMP_V * JUMP_V) / (2 * GRAVITY);
    for (const kind of ["mushroom", "hedgehog"] as const) {
      expect(OBSTACLES[kind].tall).toBe(false);
      expect(OBSTACLES[kind].h).toBeLessThan(single - 40);
      expect(OBSTACLES[kind].w).toBeLessThanOrEqual(OBSTACLES.stump.w + 4);
    }
  });

  it("ハチの門は、12秒すぎから出る。下の地面にタネが並び、くぐればタネが取れる", () => {
    expect(PATTERNS.beegate.from).toBeGreaterThanOrEqual(10_000);
    const built = PATTERNS.beegate.build({ x: 400, speed: 300, passSpeed: 300, elapsedMs: 20_000, roll: () => 0.2 });
    expect(built.obstacles.every((o) => o.kind === "bee" && o.base === BEE_BASE)).toBe(true);
    expect(built.seeds.length).toBeGreaterThanOrEqual(8);
    // 走るだけ(跳ばない)で、ぶつからず、タネがほとんど取れる
    let s = { ...empty(createRun(2)), obstacles: built.obstacles, seeds: built.seeds };
    s = { ...s, distance: 400 - SPRU_X - 120 };
    const total = built.seeds.length;
    s = run(s, 3000);
    expect(s.hearts).toBe(RUN_HEARTS);
    expect(s.pickupCount).toBeGreaterThanOrEqual(total - 1);
  });
});

describe("途中から始める(試作で、後半のパターンをすぐ試すため)", () => {
  it("始める時間を決めると、その時間の速さと、その時間に出るパターンから始まる", () => {
    const s = createRun(3, 40_000);
    expect(s.elapsedMs).toBe(40_000);
    expect(s.speed).toBeGreaterThan(SPEED_START);
    const kinds = new Set(Object.values(run(s, 20_000, bot).patterns));
    expect(kinds.size).toBeGreaterThan(0);
  });
});

describe("画面の高さに合わせたタワー", () => {
  const towerWith = (ceiling: number, elapsedMs: number) => {
    const s = createRun(5, elapsedMs, ceiling);
    return PATTERNS.tower.build({ x: 400, speed: 300, passSpeed: 300, elapsedMs, roll: () => 0.4, ceiling: s.ceiling });
  };

  it("画面が高いほど、高い段まで積む。いちばん高い床の上のタネが、画面の高さに入る", () => {
    const short = towerWith(420, 80_000).platforms.length;
    const tall = towerWith(640, 80_000).platforms.length;
    expect(tall).toBeGreaterThan(short);
    for (const ceiling of [320, 420, 540, 640]) {
      const { platforms, seeds } = towerWith(ceiling, 80_000);
      const top = Math.max(...platforms.map((p) => p.top));
      expect(top + 100).toBeLessThanOrEqual(Math.max(ceiling, PLATFORM_TOPS.low + 2 * PLATFORM_STEP + 100));
      expect(Math.max(...seeds.map((x) => x.y))).toBeLessThanOrEqual(Math.max(ceiling, 380));
    }
  });

  it("画面が低くても、3段は積む。段の増え方は、時間とともに(12秒ごとに1段)", () => {
    expect(towerWith(200, 14_000).platforms.length).toBe(3);
    expect(towerWith(640, 14_000).platforms.length).toBe(3);
    expect(towerWith(640, 26_000).platforms.length).toBe(4);
    expect(towerWith(640, 38_000).platforms.length).toBe(5);
  });

  it("高い段まで一段ずつ登るお手本の子は、高い画面でも、ぶつからず登る", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const s = run(createRun(seed, 40_000, 600), 40_000, platformBot);
      expect({ seed, hearts: s.hearts }).toEqual({ seed, hearts: RUN_HEARTS });
    }
  });
});


describe("金・銀のタネ", () => {
  it("金のタネは、銀より少ない。銀のタネは、ときどき出る", () => {
    let gold = 0;
    let silver = 0;
    let normal = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let r = createRun(seed, 20_000);
      const seen = new Set<string>();
      for (let t = 0; t < 40_000; t += 16) {
        r = tick(r, 16);
        for (const item of r.seeds) {
          const key = `${item.x}:${item.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (item.golden) gold++;
          else if (item.silver) silver++;
          else normal++;
        }
        if (r.hearts <= 0) r = { ...r, hearts: RUN_HEARTS, phase: "running" };
      }
    }
    expect(gold).toBeGreaterThan(0);
    expect(silver).toBeGreaterThan(gold);
    expect(gold / (gold + silver + normal)).toBeLessThan(0.03);
  });
});

describe("床の出る割合", () => {
  const roll = (value: number) => () => value;

  it("床のあとに、すぐ床が続かない", () => {
    for (let i = 0; i < 80; i++) {
      for (const last of ["step", "stairs", "tower", "bridge", "highgold"] as PatternId[]) {
        expect(PATTERNS[choosePattern(["single", last], 40_000, roll(i / 80))].kind).not.toBe("platform");
      }
    }
  });

  it("1分のうち、床のパターンは、全体の3割以下", () => {
    let platforms = 0;
    let all = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let r = createRun(seed, 20_000);
      let last = "";
      r = run(r, 50_000, (x) => {
        const id = x.patterns.at(-1)!;
        const key = `${x.patterns.length}:${x.nextSpawnX}`;
        if (key !== last) {
          last = key;
          all++;
          if (PATTERNS[id].kind === "platform") platforms++;
        }
        return bot(x);
      });
    }
    expect(all).toBeGreaterThan(200);
    expect(platforms / all).toBeLessThan(0.3);
  });
});

describe("ゆっくりスタートでも、どの障害物も、跳ぶタイミングに余裕がある", () => {
  /** ちょうどよく跳んだとき、足が高さ h より上にいる時間(秒)。1ミリ秒ごとに調べる */
  const airAbove = (h: number, tall: boolean) => {
    let count = 0;
    for (let t = 0; t < 2; t += 0.001) if (jumpHeightAt(t, tall) > h) count++;
    return count / 1000;
  };

  it("地面の障害物を、通り過ぎる時間より、足が上にいる時間のほうが、0.12秒以上長い(始めの速さで)", () => {
    for (const [kind, o] of Object.entries(OBSTACLES)) {
      if (kind === "bee") continue; // 空中のハチは、くぐる
      const pass = (o.w + SPRU_W) / SPEED_START;
      expect({ kind, margin: airAbove(o.h, o.tall) - pass >= 0.12 }).toEqual({ kind, margin: true });
    }
  });

  it("始めの速さは、ゆっくり(190以下)。上限は、前のまま(420)", () => {
    expect(SPEED_START).toBeLessThanOrEqual(190);
    expect(SPEED_MAX).toBe(420);
  });

  it("3段目のジャンプは、1回目と同じくらい高く上がる(1回目の高さの8割以上)", () => {
    const gain = (v: number) => (v * v) / (2 * GRAVITY);
    expect(gain(TRIPLE_JUMP_V)).toBeGreaterThanOrEqual(gain(JUMP_V) * 0.8);
  });

  it("どの10秒の間にも、コースに出るタネの数え方の合計は、サーバーの上限(MAX_SEED_VALUE_PER_SEC)より小さい", () => {
    let worst = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      let s: RunState = { ...createRun(seed, 0, 480), hearts: 999 };
      const seen = new Set<string>();
      const spawns: { at: number; value: number }[] = [];
      for (let i = 0; i < (300_000 / 16) && s.phase !== "done"; i += 1) {
        s = idealBot(tick(s, 16));
        for (const seedItem of s.seeds) {
          const key = `${seedItem.x}:${seedItem.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          spawns.push({ at: s.elapsedMs, value: seedItem.golden ? 5 : seedItem.silver ? 2 : 1 });
        }
      }
      for (let start = 0; start < 290_000; start += 2_000) {
        const sum = spawns.filter((x) => x.at >= start && x.at < start + 10_000).reduce((a, x) => a + x.value, 0);
        worst = Math.max(worst, sum / 10);
      }
    }
    expect(worst).toBeLessThan(MAX_SEED_VALUE_PER_SEC);
  });
});
