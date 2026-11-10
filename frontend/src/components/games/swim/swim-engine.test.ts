import { describe, expect, it } from "vitest";

import {
  BIG_COIN_VALUE,
  CEILING_DEFAULT,
  createSwim,
  DASH_V,
  dashFlap,
  FLAP_V,
  flap,
  GRAVITY,
  INVINCIBLE_MS,
  MAX_COIN_VALUE_PER_SEC,
  scoreOf,
  SWIM_HEARTS,
  SWIM_SPEED,
  SWIM_X,
  tick,
  type SwimState,
} from "./swim-engine";

/** 16ms ずつ、ms だけ時間を進める(タップは each が true を返したときだけ) */
function run(state: SwimState, ms: number, each?: (s: SwimState) => boolean): SwimState {
  let s = state;
  for (let t = 0; t < ms; t += 16) {
    if (each?.(s)) s = flap(s);
    s = tick(s, 16);
  }
  return s;
}

/** じゃまもの・コインがない状態(動きだけを確かめる) */
function empty(state: SwimState): SwimState {
  return { ...state, obstacles: [], coins: [], nextSpawnX: Number.POSITIVE_INFINITY };
}

const EDGE_MARGIN = 16;

/**
 * お手本の子: 次のじゃまものの、広いほうの安全な範囲のまん中をめざしてタップする(マリオのジャンプと同じ)。
 * どのコースも、この子がこえられる = じゃまものの置き場所・間かくが安全になっている
 */
function idealBot(state: SwimState): SwimState {
  const ahead = [...state.obstacles].filter((o) => o.x - state.distance + o.w > SWIM_X).sort((a, b) => a.x - b.x)[0];
  let target = state.ceiling / 2;
  if (ahead) {
    const below = ahead.y - EDGE_MARGIN;
    const above = state.ceiling - EDGE_MARGIN - (ahead.y + ahead.h);
    // じゃまものの近くでオシレーション(タップの上下動)に巻き込まれないよう、じゃまものから遠いほうへ6割寄せてねらう
    target = above >= below ? ahead.y + ahead.h + above * 0.6 : EDGE_MARGIN + below * 0.4;
  }
  return state.y < target ? flap(state) : state;
}

describe("swim-engine", () => {
  it("始めは、水の真ん中あたりで、ハート3つ・始めの速さ", () => {
    const s = createSwim(1);
    expect(s.phase).toBe("swimming");
    expect(s.y).toBeCloseTo(CEILING_DEFAULT / 2);
    expect(s.hearts).toBe(SWIM_HEARTS);
    expect(s.speed).toBe(SWIM_SPEED);
  });

  it("タップすると、その場で上向きの速さになる", () => {
    const s = flap(createSwim(1));
    expect(s.vy).toBe(FLAP_V);
  });

  it("ダブルタップ(dashFlap)は、ふつうのタップより強く上がる(高いコインを取りたいときの救済。判定は画面側)", () => {
    const s = dashFlap(createSwim(1));
    expect(s.vy).toBe(DASH_V);
    expect(DASH_V).toBeGreaterThan(FLAP_V);
  });

  it("タップすると上がり、そのあとは重力で沈んでいく", () => {
    let s = flap(empty(createSwim(1)));
    s = run(s, 300);
    expect(s.y).toBeGreaterThan(CEILING_DEFAULT / 2);
    const afterRise = s.y;
    s = run(s, 1000); // タップしない→沈む
    expect(s.y).toBeLessThan(afterRise);
  });

  it("海底・水面に着くと、ぶつかったのと同じにあつかう(ハートが減る)", () => {
    const s = run(empty(createSwim(2)), 5000); // ずっとタップしない→沈んで海底に着く
    expect(s.hearts).toBeLessThan(SWIM_HEARTS);
    expect(s.y).toBe(0);
  });

  it("ぶつかるとハートが減り、無敵時間のあいだはぶつからない。0で終わる", () => {
    let s = createSwim(3); // タップしない→沈んでいくので、じゃまものにも海底にもぶつかる
    let first = -1;
    let second = -1;
    let t = 0;
    while (s.phase === "swimming" && t < 120_000) {
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
    expect(after).toBe(s); // 終わったら、時間を進めても変わらない
  });

  it("コインに触れると集まり、光るコインは複数枚分", () => {
    const base = createSwim(5);
    const coin = { x: SWIM_X + 5, y: base.y, big: false, taken: false };
    const big = { x: SWIM_X + 5, y: base.y, big: true, taken: false };
    let s: SwimState = { ...base, coins: [coin], obstacles: [], nextSpawnX: Number.POSITIVE_INFINITY };
    s = tick(s, 16);
    expect(s.coinValue).toBe(1);
    expect(s.pickupCount).toBe(1);
    s = { ...base, coins: [big], obstacles: [], nextSpawnX: Number.POSITIVE_INFINITY };
    s = tick(s, 16);
    expect(s.coinValue).toBe(BIG_COIN_VALUE);
  });

  it("速さはずっと一定(Ownerの決定: すき間の狭さ・頻度で難しくする)", () => {
    let s = empty(createSwim(7));
    expect(s.speed).toBe(SWIM_SPEED);
    s = run(s, 60_000, (x) => x.y < CEILING_DEFAULT / 2);
    expect(s.speed).toBe(SWIM_SPEED);
  });

  it("タブを離れたあとなどに、1回で一気に進まない(MAX_STEP_MS で止まる)", () => {
    const s = tick(empty(createSwim(9)), 10_000);
    expect(s.elapsedMs).toBeLessThan(10_000);
  });

  it("点数は、距離(m)×2 + コイン×2", () => {
    expect(scoreOf(100, 30)).toBe(100 * 2 + 30 * 2);
  });

  it("重力はつねにかかる(GRAVITY > 0)", () => {
    expect(GRAVITY).toBeGreaterThan(0);
  });

  it("どのコースも、お手本の子が長く泳いでも、ぶつからずに進める(90秒・序盤のパターンだけ)", () => {
    for (const seed of [1, 2, 3, 4, 5, 11, 23, 42, 99, 123]) {
      let s = createSwim(seed);
      for (let t = 0; t < 90_000; t += 16) {
        s = idealBot(s);
        s = tick(s, 16);
      }
      expect({ seed, hearts: s.hearts }).toEqual({ seed, hearts: SWIM_HEARTS });
    }
  });

  it("20ステージ クリアのあと、エンドレスまで含めて、お手本の子が長く泳いでも、ぶつからずに進める(twin・tripleも含む)", () => {
    for (const seed of [1, 2, 3, 4, 5, 7]) {
      let s = createSwim(seed);
      let reachedClear = false;
      for (let t = 0; t < 480_000; t += 16) {
        if (s.justCleared) reachedClear = true;
        s = idealBot(s);
        s = tick(s, 16);
      }
      expect({ seed, hearts: s.hearts, reachedClear }).toEqual({ seed, hearts: SWIM_HEARTS, reachedClear: true });
    }
  });

  it("1秒に集められるコインの数え方の合計は、サーバーの上限より小さい", () => {
    // 多くの種で、お手本の子がどの10秒の窓でも集められる量を測る
    let maxPerSec = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      let s = createSwim(seed);
      const seen = new Map<string, number>();
      for (let t = 0; t < 120_000; t += 16) {
        s = idealBot(s);
        const before = s.coinValue;
        s = tick(s, 16);
        if (s.coinValue > before) {
          const windowStart = Math.floor(t / 1000) * 1000;
          seen.set(`${seed}-${windowStart}`, (seen.get(`${seed}-${windowStart}`) ?? 0) + (s.coinValue - before));
        }
      }
      for (const v of seen.values()) maxPerSec = Math.max(maxPerSec, v);
    }
    expect(maxPerSec).toBeLessThanOrEqual(MAX_COIN_VALUE_PER_SEC);
  });
});
