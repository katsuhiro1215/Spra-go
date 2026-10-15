/**
 * スプルランのゲームの動き(docs/design/2026-10-22-spru-run-design.md 2章)。
 * ゲームの中は、横 WORLD_W の広さで計算する(画面の横幅に合わせて拡大して描く。縦は画面の高さしだいで、空が広くなる)。
 * 高さ y は、地面からの高さ(上が大きい)。じゃまもの・タネの x は「コースの上の位置」で、画面の位置は x − distance。
 * スプルは、画面の SPRU_X から SPRU_W の幅にいる。時間を進める・跳ぶのはここの関数だけで行い、画面はこの状態を描くだけにする
 */
export type ObstacleKind = "rock" | "stump" | "puddle" | "bush" | "fence";
export type Obstacle = { kind: ObstacleKind; x: number; w: number; h: number; hit: boolean };
export type Seed = { x: number; y: number; golden: boolean; taken: boolean };
export type RunPhase = "running" | "done";

export type RunState = {
  seed: number;
  /** 乱数の今の状態(種から始まる) */
  rng: number;
  phase: RunPhase;
  elapsedMs: number;
  /** 進んだ広さ(40 = 1m) */
  distance: number;
  speed: number;
  y: number;
  vy: number;
  /** 今の空中で跳んだ回数(0 は地面) */
  jumps: number;
  hearts: number;
  /** ぶつかったあとの、ぶつからない残りの時間 */
  invincibleMs: number;
  obstacles: Obstacle[];
  seeds: Seed[];
  /** 次のじゃまものを置く、コースの上の位置 */
  nextSpawnX: number;
  /** 集めたタネ(金は5個分) */
  seedValue: number;
  /** 音を鳴らすための数(ジャンプ・タネ・ぶつかった) */
  jumpCount: number;
  pickupCount: number;
  hitCount: number;
};

export const WORLD_W = 340;
export const PX_PER_M = 40;

export const SPRU_X = 70;
/** 当たりの大きさ(絵より小さめ。設計書2-1) */
export const SPRU_W = 34;
export const SPRU_H = 50;

export const GRAVITY = 1280;
export const JUMP_V = 480;
export const DOUBLE_JUMP_V = 420;

export const SPEED_START = 220;
export const SPEED_MAX = 420;
export const SPEED_STEP = 15;
export const SPEED_EVERY_MS = 10_000;

export const RUN_HEARTS = 3;
export const INVINCIBLE_MS = 1500;
/** 1回に進める時間の上限。タブを離れていたあとなどに一気に進まないように */
export const MAX_STEP_MS = 100;
/** 当たりを調べる細かさ */
const SUB_STEP_MS = 16;

export const SEED_R = 12;
/** 浮かぶタネの間かく */
const SEED_SPACING = 36;
export const GOLDEN_VALUE = 5;
const SCORE_PER_SEED = 10;

/** じゃまものの当たりの大きさ(絵の形に合わせる。絵は少し大きく描く)。tall は2段ジャンプが要る */
export const OBSTACLES: Record<ObstacleKind, { w: number; h: number; tall: boolean }> = {
  rock: { w: 50, h: 36, tall: false },
  stump: { w: 54, h: 44, tall: false },
  puddle: { w: 62, h: 8, tall: false },
  bush: { w: 48, h: 100, tall: true },
  fence: { w: 60, h: 100, tall: true },
};

const LOW_KINDS: ObstacleKind[] = ["rock", "stump", "puddle"];
const TALL_KINDS: ObstacleKind[] = ["bush", "fence"];
/** 高いじゃまものが出始める時間と、出る割合 */
const TALL_FROM_MS = 8000;
const TALL_RATE = 0.3;
/** 空中にいる時間(秒。1回 / 2段) */
const AIR_SINGLE = (2 * JUMP_V) / GRAVITY;
const AIR_DOUBLE = JUMP_V / GRAVITY + (DOUBLE_JUMP_V + Math.sqrt(DOUBLE_JUMP_V ** 2 + 2 * GRAVITY * ((JUMP_V * JUMP_V) / (2 * GRAVITY)))) / GRAVITY;
/** 着地してから、次に跳ぶまでの余裕(秒) */
const GAP_MARGIN_S = 0.5;
const GAP_EXTRA_S = 0.9;
const FIRST_SPAWN_X = WORLD_W + 80;

/** 種から決まる乱数(mulberry32)の1歩。[0〜1の値, 次の状態] */
function nextRandom(a: number): [number, number] {
  const next = (a + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** そのじゃまもののあとに空ける、いちばん短い間かく(じゃまものの終わりから、次の始まりまで) */
export function minGapAfter(kind: ObstacleKind, speed: number): number {
  return speed * ((OBSTACLES[kind].tall ? AIR_DOUBLE : AIR_SINGLE) + GAP_MARGIN_S) + SPRU_W;
}

/**
 * ちょうどよく跳んだとき、跳んでから、じゃまものの真ん中の上に来るまでの時間(秒)。
 * 低いものは1段目のてっぺん、高いものは(1段目のてっぺんで2段目を跳んだときの)2段目のてっぺん
 */
export function idealCenterTime(tall: boolean): number {
  return JUMP_V / GRAVITY + (tall ? DOUBLE_JUMP_V / GRAVITY : 0);
}

/** ちょうどよく跳んだとき、跳んでから t 秒後の高さ(地面からの足の高さ) */
export function jumpHeightAt(t: number, tall: boolean): number {
  const apexT = JUMP_V / GRAVITY;
  if (!tall || t <= apexT) return Math.max(0, JUMP_V * t - (GRAVITY * t * t) / 2);
  const u = t - apexT;
  return Math.max(0, (JUMP_V * JUMP_V) / (2 * GRAVITY) + DOUBLE_JUMP_V * u - (GRAVITY * u * u) / 2);
}

export function speedAt(elapsedMs: number): number {
  return Math.min(SPEED_MAX, SPEED_START + Math.floor(elapsedMs / SPEED_EVERY_MS) * SPEED_STEP);
}

export function createRun(seed: number): RunState {
  return spawn({
    seed,
    rng: (seed * 2654435761) >>> 0,
    phase: "running",
    elapsedMs: 0,
    distance: 0,
    speed: SPEED_START,
    y: 0,
    vy: 0,
    jumps: 0,
    hearts: RUN_HEARTS,
    invincibleMs: 0,
    obstacles: [],
    seeds: [],
    nextSpawnX: FIRST_SPAWN_X,
    seedValue: 0,
    jumpCount: 0,
    pickupCount: 0,
    hitCount: 0,
  });
}

/** 跳ぶ。地面なら1段目、空中で1回だけ2段目 */
export function jump(state: RunState): RunState {
  if (state.phase !== "running") return state;
  if (state.jumps === 0) return { ...state, vy: JUMP_V, jumps: 1, jumpCount: state.jumpCount + 1 };
  if (state.jumps === 1) return { ...state, vy: DOUBLE_JUMP_V, jumps: 2, jumpCount: state.jumpCount + 1 };
  return state;
}

/** 時間を進める。動き・当たり・じゃまものの置き方を、細かい歩みに分けて行う */
export function tick(state: RunState, dtMs: number): RunState {
  if (state.phase !== "running") return state;
  let rest = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
  if (rest === 0) return state;

  let s = state;
  while (rest > 0 && s.phase === "running") {
    const dt = Math.min(SUB_STEP_MS, rest);
    rest -= dt;
    s = spawn(collide(move(s, dt)));
  }
  return prune(s);
}

function move(s: RunState, dtMs: number): RunState {
  const dt = dtMs / 1000;
  const elapsedMs = s.elapsedMs + dtMs;
  let vy = s.vy - GRAVITY * dt;
  let y = s.y + s.vy * dt - (GRAVITY * dt * dt) / 2;
  let jumps = s.jumps;
  if (y <= 0) {
    y = 0;
    vy = 0;
    jumps = 0;
  }
  return {
    ...s,
    elapsedMs,
    speed: speedAt(elapsedMs),
    distance: s.distance + s.speed * dt,
    y,
    vy,
    jumps,
    invincibleMs: Math.max(0, s.invincibleMs - dtMs),
  };
}

/** スプルの当たりの箱と重なったものを片づける */
function collide(s: RunState): RunState {
  const left = SPRU_X;
  const right = SPRU_X + SPRU_W;
  let { hearts, invincibleMs, seedValue, pickupCount, hitCount } = s;
  let obstacles = s.obstacles;
  let seeds = s.seeds;

  if (invincibleMs === 0) {
    const index = obstacles.findIndex((o) => {
      const x = o.x - s.distance;
      return !o.hit && x < right && x + o.w > left && s.y < o.h;
    });
    if (index >= 0) {
      obstacles = obstacles.map((o, i) => (i === index ? { ...o, hit: true } : o));
      hearts -= 1;
      invincibleMs = INVINCIBLE_MS;
      hitCount += 1;
    }
  }

  if (seeds.some((seed) => !seed.taken && touches(seed, s.distance, s.y))) {
    seeds = seeds.map((seed) => {
      if (seed.taken || !touches(seed, s.distance, s.y)) return seed;
      seedValue += seed.golden ? GOLDEN_VALUE : 1;
      pickupCount += 1;
      return { ...seed, taken: true };
    });
  }

  if (obstacles === s.obstacles && seeds === s.seeds) return s;
  return {
    ...s,
    obstacles,
    seeds,
    hearts,
    invincibleMs,
    seedValue,
    pickupCount,
    hitCount,
    phase: hearts <= 0 ? "done" : s.phase,
  };
}

function touches(seed: Seed, distance: number, y: number): boolean {
  const x = seed.x - distance;
  return x + SEED_R > SPRU_X && x - SEED_R < SPRU_X + SPRU_W && seed.y + SEED_R > y && seed.y - SEED_R < y + SPRU_H;
}

/** 画面の右の少し先まで、じゃまものとタネを置く。間かくは、今より1段速い速さで計算する(置いたあとに速くなっても、こえられる) */
function spawn(s: RunState): RunState {
  if (s.distance + WORLD_W + 200 < s.nextSpawnX) return s;

  let rng = s.rng;
  const roll = () => {
    const [value, next] = nextRandom(rng);
    rng = next;
    return value;
  };
  const obstacles = [...s.obstacles];
  const seeds = [...s.seeds];
  let x = s.nextSpawnX;

  while (x < s.distance + WORLD_W + 200) {
    const tall = s.elapsedMs >= TALL_FROM_MS && roll() < TALL_RATE;
    const kinds = tall ? TALL_KINDS : LOW_KINDS;
    const kind = kinds[Math.floor(roll() * kinds.length)];
    const { w, h } = OBSTACLES[kind];
    obstacles.push({ kind, x, w, h, hit: false });

    const golden = roll() < 0.08;
    const passSpeed = Math.min(SPEED_MAX, s.speed + SPEED_STEP / 2);
    const center = idealCenterTime(tall);
    if (roll() < 0.5) {
      // じゃまものの上の弧: ちょうどよく跳んだときの、スプルの体の真ん中の通り道に並べる
      [-1, 0, 1].forEach((n, i) =>
        seeds.push({
          x: x + w / 2 + n * SEED_SPACING,
          y: jumpHeightAt(center + (n * SEED_SPACING) / passSpeed, tall) + SPRU_H / 2,
          golden: golden && i === 1,
          taken: false,
        }),
      );
    } else {
      // じゃまものの手前の地面の列: ちょうどよく跳ぶ所より手前で、取り終わるように並べる
      const last = x + w / 2 - passSpeed * center - SPRU_W;
      for (let n = 0; n < 3; n++) seeds.push({ x: last - (2 - n) * 30, y: SEED_R + 4, golden: golden && n === 2, taken: false });
    }

    const speed = Math.min(SPEED_MAX, s.speed + SPEED_STEP);
    x += w + minGapAfter(kind, speed) + roll() * speed * GAP_EXTRA_S;
  }

  return { ...s, rng, obstacles, seeds, nextSpawnX: x };
}

/** 画面の左に消えたものを捨てる */
function prune(s: RunState): RunState {
  const edge = s.distance - 120;
  if (!s.obstacles.some((o) => o.x + o.w < edge) && !s.seeds.some((seed) => seed.x < edge || seed.taken)) return s;
  return {
    ...s,
    obstacles: s.obstacles.filter((o) => o.x + o.w >= edge),
    seeds: s.seeds.filter((seed) => seed.x >= edge && !seed.taken),
  };
}

export function meters(distance: number): number {
  return Math.floor(distance / PX_PER_M);
}

/** 点数: 距離(m)+タネ×10(設計書2章)。サーバーでも同じ計算をする */
export function scoreOf(distanceM: number, seedValue: number): number {
  return distanceM + seedValue * SCORE_PER_SEED;
}

/** 今の点数 */
export function currentScore(state: RunState): number {
  return scoreOf(meters(state.distance), state.seedValue);
}
