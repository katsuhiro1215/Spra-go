/**
 * スプルランのゲームの動き(docs/design/2026-10-22-spru-run-design.md 2章)。
 * ゲームの中は、横 WORLD_W の広さで計算する(画面の横幅に合わせて拡大して描く。縦は画面の高さしだいで、空が広くなる)。
 * 高さ y は、地面からの高さ(上が大きい)。じゃまもの・タネの x は「コースの上の位置」で、画面の位置は x − distance。
 * スプルは、画面の SPRU_X から SPRU_W の幅にいる。時間を進める・跳ぶのはここの関数だけで行い、画面はこの状態を描くだけにする
 */
export type ObstacleKind = "rock" | "stump" | "puddle" | "bush" | "fence" | "mushroom" | "hedgehog" | "bee";
/** base は、じゃまものが立っている高さ(床の上の岩は、床の高さ。地面は 0 か省略) */
export type Obstacle = { kind: ObstacleKind; x: number; w: number; h: number; base?: number; hit: boolean };
/** タネのある場所の種類(テストと、集めやすさの調整で使う) */
export type SeedKind = "ground" | "arc" | "river" | "wave" | "platform" | "high";
/** golden = 金(5個分)、silver = 銀(2個分)。どちらもなければ、ふつうのタネ(1個) */
export type Seed = { x: number; y: number; golden: boolean; silver?: boolean; taken: boolean; kind: SeedKind };
/** 下から跳ぶとすり抜けて、上から着地できる床。top は、床の上の面の高さ(地面から) */
export type Platform = { x: number; w: number; top: number };
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
  /** 今の空中で跳んだ回数(地面・床の上は 0) */
  jumps: number;
  /** 地面か床の上にいる(空中でない) */
  standing: boolean;
  hearts: number;
  /** ぶつかったあとの、ぶつからない残りの時間 */
  invincibleMs: number;
  obstacles: Obstacle[];
  seeds: Seed[];
  platforms: Platform[];
  /** 画面の高さ(ゲームの中の広さ。床・空のタネを置ける、いちばん高い所)。縦に長い画面ほど高い床まで積む */
  ceiling: number;
  /** 最近置いたパターン(新しいものが後ろ。最大3つ) */
  patterns: PatternId[];
  /** 次のパターンを置く、コースの上の位置 */
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
export const SPRU_W = 26;
export const SPRU_H = 50;

export const GRAVITY = 1280;
export const JUMP_V = 480;
export const DOUBLE_JUMP_V = 420;
/** 3段目のジャンプ(2段目より、小さい) */
export const TRIPLE_JUMP_V = 460;

export const SPEED_START = 180;
export const SPEED_MAX = 420;
export const SPEED_STEP = 18;
export const SPEED_EVERY_MS = 10_000;

export const RUN_HEARTS = 3;
export const INVINCIBLE_MS = 1500;
/** 1回に進める時間の上限。タブを離れていたあとなどに一気に進まないように */
export const MAX_STEP_MS = 100;
/** 当たりを調べる細かさ */
const SUB_STEP_MS = 16;

export const SEED_R = 12;
export const GOLDEN_VALUE = 5;
export const SILVER_VALUE = 2;
const SCORE_PER_METER = 2;
const SCORE_PER_SEED = 2;
/** 1秒に集められるタネの数え方の合計の上限(サーバーの config/games.php の max_seed_value_per_sec と同じ。テストで、コースに出る量より大きいことを確かめる) */
export const MAX_SEED_VALUE_PER_SEC = 24;

/** じゃまものの当たりの大きさ(絵の形に合わせる。絵は少し大きく描く)。tall は2段ジャンプが要る */
export const OBSTACLES: Record<ObstacleKind, { w: number; h: number; tall: boolean }> = {
  rock: { w: 44, h: 36, tall: false },
  stump: { w: 46, h: 44, tall: false },
  puddle: { w: 62, h: 8, tall: false },
  bush: { w: 48, h: 100, tall: true },
  fence: { w: 60, h: 100, tall: true },
  mushroom: { w: 44, h: 40, tall: false },
  hedgehog: { w: 46, h: 32, tall: false },
  // ハチは、空中に浮いている(base)。走ってくぐれば当たらず、ジャンプすると当たる
  bee: { w: 44, h: 34, tall: false },
};
/** ハチが浮いている高さ(いちばん下)。走るスプルの高さ(50)より、少し高い */
export const BEE_BASE = 62;

const LOW_KINDS: ObstacleKind[] = ["rock", "stump", "puddle", "mushroom", "hedgehog"];
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

/** 床の高さ。低い床は、地面から1回のジャンプで登れる。高い床は、地面から2段ジャンプ・低い床から1回のジャンプで登れる */
/** 床の1段の高さの差(1回のジャンプで登れる。ジャンプの高さ90より、余裕をもって低い) */
export const PLATFORM_STEP = 64;
export const PLATFORM_TOPS = { low: 56, high: 56 + PLATFORM_STEP };
/** 床・空のタネを置ける、いちばん高い所(どの画面の高さでも見える高さ) */
export const PLATFORM_CEILING = 420;
/** 床・タネの波から着地したあと、次のじゃまものを跳ぶ準備をする余裕(秒)。高いじゃまものを、ちょうどよく跳ぶ時間より長くする */
const LANDING_MARGIN_S = 0.85;

/** 床のあとに空ける、いちばん短い間かく(床の終わりから、次のパターンの始まりまで。床の上から落ちて、着地する長さ) */
export function platformExitGap(speed: number, top: number): number {
  return speed * (Math.sqrt((2 * top) / GRAVITY) + LANDING_MARGIN_S) + SPRU_W;
}

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

/** startMs: 途中から始める時間(試作で、後半のパターンを試すため。ふつうは 0) */
export function createRun(seed: number, startMs = 0, ceiling = PLATFORM_CEILING): RunState {
  return spawn({
    seed,
    rng: (seed * 2654435761) >>> 0,
    phase: "running",
    elapsedMs: startMs,
    distance: 0,
    speed: speedAt(startMs),
    y: 0,
    vy: 0,
    jumps: 0,
    standing: true,
    hearts: RUN_HEARTS,
    invincibleMs: 0,
    obstacles: [],
    seeds: [],
    platforms: [],
    ceiling,
    patterns: [],
    nextSpawnX: FIRST_SPAWN_X,
    seedValue: 0,
    jumpCount: 0,
    pickupCount: 0,
    hitCount: 0,
  });
}

/** 跳ぶ。地面なら1段目、空中で2段目・3段目(4回目はできない) */
export function jump(state: RunState): RunState {
  if (state.phase !== "running") return state;
  if (state.jumps === 0) return { ...state, vy: JUMP_V, jumps: 1, jumpCount: state.jumpCount + 1 };
  if (state.jumps === 1) return { ...state, vy: DOUBLE_JUMP_V, jumps: 2, jumpCount: state.jumpCount + 1 };
  if (state.jumps === 2) return { ...state, vy: TRIPLE_JUMP_V, jumps: 3, jumpCount: state.jumpCount + 1 };
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
  const distance = s.distance + s.speed * dt;
  let vy = s.vy - GRAVITY * dt;
  let y = s.y + s.vy * dt - (GRAVITY * dt * dt) / 2;
  let jumps = s.jumps;
  let standing = false;

  // 床には、落ちていくとき(のぼっているときは、すり抜ける)に、足が床の上の面をこえるところで着地する。床の上にいるあいだは、毎回ここで着地し直す
  const landing = s.platforms
    .filter((p) => vy <= 0 && s.y >= p.top - 0.01 && y <= p.top && overlapsSpru(p, distance))
    .sort((a, b) => b.top - a.top)[0];
  if (landing) {
    y = landing.top;
    vy = 0;
    jumps = 0;
    standing = true;
  } else if (y <= 0) {
    y = 0;
    vy = 0;
    jumps = 0;
    standing = true;
  }
  return {
    ...s,
    elapsedMs,
    speed: speedAt(elapsedMs),
    distance,
    y,
    vy,
    jumps,
    standing,
    invincibleMs: Math.max(0, s.invincibleMs - dtMs),
  };
}

/** 床の上に、スプルの足が乗るか(スプルの左右を少しせまくして、はしにかすっただけでは乗らない) */
function overlapsSpru(p: Platform, distance: number): boolean {
  const x = p.x - distance;
  return x < SPRU_X + SPRU_W - 6 && x + p.w > SPRU_X + 6;
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
      const base = o.base ?? 0;
      return !o.hit && x < right && x + o.w > left && s.y < base + o.h && s.y + SPRU_H > base;
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
      seedValue += seed.golden ? GOLDEN_VALUE : seed.silver ? SILVER_VALUE : 1;
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

export type PatternId = "single" | "river" | "wave" | "step" | "stairs" | "tower" | "bridge" | "highgold" | "beegate";
/** ground = 地面のじゃまもの、bonus = タネの多い息ぬき、platform = 床 */
type PatternKind = "ground" | "bonus" | "platform";
type Built = { obstacles: Obstacle[]; seeds: Seed[]; platforms: Platform[]; end: number; gap: number; extra: number };
/** speed: 次のパターンの間かくを決める速さ(今より1段速い)。passSpeed: タネを置くときに、通るときの速さと見なす値 */
type Context = { x: number; speed: number; passSpeed: number; elapsedMs: number; roll: () => number; ceiling?: number };
type Pattern = { kind: PatternKind; from: number; weight: number; build: (c: Context) => Built };

type Rare = "gold" | "silver" | null;
const seedAt = (x: number, y: number, kind: SeedKind, rare: Rare = null): Seed => ({ x, y, kind, golden: rare === "gold", silver: rare === "silver", taken: false });
/** パターンの目玉のタネ(1つ)が、金・銀・ふつうのどれか。金は、めったに出ない */
const GOLD_RATE = 0.08;
const SILVER_RATE = 0.3;
const rareOf = (value: number): Rare => (value < GOLD_RATE ? "gold" : value < GOLD_RATE + SILVER_RATE ? "silver" : null);
/** 床の上に立ったスプルの体の真ん中の高さ */
const onTopY = (top: number) => top + SPRU_H / 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 床の上に、間かく spacing でタネを並べる(はしから 20 あける) */
function platformRow(p: Platform, y: number, spacing: number, rareAt: number | null, rare: Rare, from = 20, to = 20): Seed[] {
  const count = Math.max(1, Math.floor((p.w - from - to) / spacing) + 1);
  return Array.from({ length: count }, (_, i) => seedAt(p.x + from + i * spacing, y, "platform", i === rareAt ? rare : null));
}

const PATTERNS_TABLE: Record<PatternId, Pattern> = {
  // じゃまもの1つと、そのまわりのタネ(これまでのパターン)
  single: {
    kind: "ground",
    from: 0,
    weight: 4,
    build: ({ x, speed, passSpeed, elapsedMs, roll }) => {
      const tall = elapsedMs >= TALL_FROM_MS && roll() < TALL_RATE;
      const kinds = tall ? TALL_KINDS : LOW_KINDS;
      const kind = kinds[Math.floor(roll() * kinds.length)];
      const { w, h } = OBSTACLES[kind];
      const rare = rareOf(roll());
      const center = idealCenterTime(tall);
      const seeds: Seed[] = [];
      if (roll() < 0.5) {
        // じゃまものの上の弧: ちょうどよく跳んだときの、スプルの体の真ん中の通り道に並べる
        [-2, -1, 0, 1, 2].forEach((n) =>
          seeds.push(seedAt(x + w / 2 + n * ARC_SPACING, jumpHeightAt(center + (n * ARC_SPACING) / passSpeed, tall) + SPRU_H / 2, "arc", n === 0 ? rare : null)),
        );
      } else {
        // じゃまものの手前の地面の列: ちょうどよく跳ぶ所より手前で、取り終わるように並べる
        const last = x + w / 2 - passSpeed * center - SPRU_W;
        for (let n = 0; n < 5; n++) seeds.push(seedAt(last - (4 - n) * 28, SEED_R + 4, "ground", n === 4 ? rare : null));
      }
      return { obstacles: [{ kind, x, w, h, hit: false }], seeds, platforms: [], end: x + w, gap: minGapAfter(kind, speed), extra: speed * GAP_EXTRA_S };
    },
  },
  // 地面にタネがずらっと並ぶ(走るだけで集まる。スピード感)
  river: {
    kind: "bonus",
    from: 0,
    weight: 1.5,
    build: ({ x, speed, roll }) => {
      const rare = rareOf(roll());
      const seeds = Array.from({ length: 10 }, (_, i) => seedAt(x + i * 26, SEED_R + 4, "river", i === 9 ? rare : null));
      return { obstacles: [], seeds, platforms: [], end: x + 9 * 26, gap: 40, extra: speed * 0.3 };
    },
  },
  // ジャンプの通り道にタネが並ぶ(地面から始まって、弧をえがく)
  wave: {
    kind: "bonus",
    from: 3000,
    weight: 1.5,
    build: ({ x, speed, passSpeed, roll }) => {
      const rare = rareOf(roll());
      const seeds = Array.from({ length: 8 }, (_, k) => {
        const t = k * WAVE_STEP_S;
        return seedAt(x + passSpeed * t, jumpHeightAt(t, false) + SPRU_H / 2, "wave", k === 4 ? rare : null);
      });
      return { obstacles: [], seeds, platforms: [], end: x + passSpeed * 7 * WAVE_STEP_S, gap: SPRU_W + speed * LANDING_MARGIN_S, extra: speed * 0.3 };
    },
  },
  // ハチの門: 頭の上にハチが浮いている。ジャンプせず、走ってくぐると、地面のタネが取れる
  beegate: {
    kind: "bonus",
    from: 12_000,
    weight: 1.3,
    build: ({ x, speed, roll }) => {
      const two = roll() < 0.4;
      const count = two ? 12 : 9;
      const rare = rareOf(roll());
      const seeds = Array.from({ length: count }, (_, i) => seedAt(x + i * 26, SEED_R + 4, "river", i === count - 1 ? rare : null));
      const { w, h } = OBSTACLES.bee;
      const bees = (two ? [2, 8] : [4]).map((i) => ({ kind: "bee" as const, x: x + i * 26 - w / 2, w, h, base: BEE_BASE, hit: false }));
      return { obstacles: bees, seeds, platforms: [], end: x + (count - 1) * 26, gap: SPRU_W + speed * LANDING_MARGIN_S, extra: speed * 0.3 };
    },
  },
  // 低い床。上にタネの列、さらに上にタネ(ジャンプで取る)
  step: {
    kind: "platform",
    from: 8000,
    weight: 1,
    build: ({ x, speed, roll }) => {
      const p = { x, w: clamp(speed * 0.8, 190, 330), top: PLATFORM_TOPS.low };
      const mid = p.x + p.w / 2;
      const rare = rareOf(roll());
      const high = [-1, 0, 1, 2].map((n, i) => seedAt(mid + (n - 0.5) * 32, p.top + 95, "high", i === 1 ? rare : null));
      return { obstacles: [], seeds: [...platformRow(p, onTopY(p.top), 28, null, null), ...high], platforms: [p], end: p.x + p.w, gap: platformExitGap(speed, p.top), extra: speed * 0.4 };
    },
  },
  // 低い床から高い床へ、階段のように登る
  stairs: {
    kind: "platform",
    from: 18_000,
    weight: 0.8,
    build: ({ x, speed, roll }) => {
      const low = { x, w: 170, top: PLATFORM_TOPS.low };
      const high = { x: x + 190, w: 200, top: PLATFORM_TOPS.high };
      const rare = rareOf(roll());
      const above = [-1, 0, 1].map((n) => seedAt(high.x + high.w / 2 + n * 32, high.top + 95, "high"));
      const seeds = [...platformRow(low, onTopY(low.top), 28, null, null), ...platformRow(high, onTopY(high.top), 28, 5, rare), ...above];
      return { obstacles: [], seeds, platforms: [low, high], end: high.x + high.w, gap: platformExitGap(speed, high.top), extra: speed * 0.4 };
    },
  },
  // そびえる床: 床を一段ずつ高く重ねて、空までタネがつながる(画面いっぱいを使う)。段の数は時間とともに増える
  tower: {
    kind: "platform",
    from: 14_000,
    weight: 0.8,
    build: ({ x, speed, elapsedMs, roll, ceiling = PLATFORM_CEILING }) => {
      // 12秒ごとに1段ふえる。画面の高さに入る段までで、少なくとも3段
      const fits = Math.floor((ceiling - 100 - PLATFORM_TOPS.low) / PLATFORM_STEP) + 1;
      const tiers = clamp(3 + Math.floor(Math.max(0, elapsedMs - 14_000) / 12_000), 3, Math.max(3, Math.min(8, fits)));
      const w = clamp(speed * 1.2, 240, 440);
      const offset = clamp(speed * 0.3, 80, 140);
      const platforms = Array.from({ length: tiers }, (_, k) => ({ x: x + k * offset, w, top: PLATFORM_TOPS.low + k * PLATFORM_STEP }));
      const top = platforms[tiers - 1];
      const seeds: Seed[] = platforms.flatMap((p) => platformRow(p, onTopY(p.top), 40, null, null, 30, 30));
      // 空のタネ: いちばん上の床の上に、横にならべる。まんなかの1つが金
      // 空のまんなかのタネは、ごほうび(銀。ときどき金)
      const prize: Rare = roll() < 0.3 ? "gold" : "silver";
      const sky = [0, 1, 2, 3, 4].map((i) => seedAt(top.x + top.w / 2 + (i - 2) * 34, top.top + 95, "high", i === 2 ? prize : null));
      return { obstacles: [], seeds: [...seeds, ...sky], platforms, end: top.x + top.w, gap: platformExitGap(speed, top.top), extra: speed * 0.4 };
    },
  },
  // 長い床の上の岩。床の上でも、ジャンプしてこえる
  bridge: {
    kind: "platform",
    from: 26_000,
    weight: 0.6,
    build: ({ x, speed, passSpeed }) => {
      const p = { x, w: clamp(speed * 1.25, 300, 600), top: PLATFORM_TOPS.low };
      const { w, h } = OBSTACLES.rock;
      const rockX = p.x + p.w * 0.5;
      const center = idealCenterTime(false);
      const seeds: Seed[] = [
        ...[0, 1, 2, 3].map((i) => seedAt(p.x + 30 + i * 28, onTopY(p.top), "platform")),
        ...[-2, -1, 0, 1, 2].map((n) => seedAt(rockX + w / 2 + n * ARC_SPACING, p.top + jumpHeightAt(center + (n * ARC_SPACING) / passSpeed, false) + SPRU_H / 2, "platform")),
      ];
      return { obstacles: [{ kind: "rock", x: rockX, w, h, base: p.top, hit: false }], seeds, platforms: [p], end: p.x + p.w, gap: platformExitGap(speed, p.top), extra: speed * 0.4 };
    },
  },
  // 高い床に、金のタネ(2段ジャンプで登る)
  highgold: {
    kind: "platform",
    from: 20_000,
    weight: 0.5,
    build: ({ x, speed, roll }) => {
      const p = { x, w: clamp(speed * 0.55, 150, 260), top: PLATFORM_TOPS.high };
      const mid = p.x + p.w / 2;
      // 高い床のまんなかの上は、ごほうび(金か銀)
      const prize: Rare = roll() < 0.5 ? "gold" : "silver";
      const seeds = [...platformRow(p, onTopY(p.top), 28, 2, "silver"), seedAt(mid, p.top + 95, "high", prize)];
      return { obstacles: [], seeds, platforms: [p], end: p.x + p.w, gap: platformExitGap(speed, p.top), extra: speed * 0.4 };
    },
  },
};

export const PATTERNS = PATTERNS_TABLE;
const PATTERN_IDS = Object.keys(PATTERNS_TABLE) as PatternId[];
/** 弧のタネの間かく・波のタネの時間の間かく(秒) */
const ARC_SPACING = 30;
const WAVE_STEP_S = 0.1;
/** 前と同じパターンになりにくくする倍率 */
const REPEAT_WEIGHT = 0.35;

/**
 * 次に置くパターンを選ぶ。時間で、出るパターンが増える。同じパターンは、3回続けない。
 * 地面のパターンが2回続いたら、次は、かならず床のパターン(出せる床があるとき)
 */
export function choosePattern(history: PatternId[], elapsedMs: number, roll: () => number): PatternId {
  let pool = PATTERN_IDS.filter((id) => PATTERNS_TABLE[id].from <= elapsedMs);
  const lastTwo = history.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((id) => PATTERNS_TABLE[id].kind === "ground")) {
    const platforms = pool.filter((id) => PATTERNS_TABLE[id].kind === "platform");
    if (platforms.length > 0) pool = platforms;
  }
  if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
    const others = pool.filter((id) => id !== lastTwo[1]);
    if (others.length > 0) pool = others;
  }
  // 床のあとは、床を続けない(床が多いと、登れない)
  if (history.length > 0 && PATTERNS_TABLE[history[history.length - 1]].kind === "platform") {
    const others = pool.filter((id) => PATTERNS_TABLE[id].kind !== "platform");
    if (others.length > 0) pool = others;
  }
  const last = history.at(-1);
  const weights = pool.map((id) => PATTERNS_TABLE[id].weight * (id === last ? REPEAT_WEIGHT : 1));
  let target = roll() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    target -= weights[i];
    if (target < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** 画面の右の少し先まで、パターンを置く。間かくは、今より1段速い速さで計算する(置いたあとに速くなっても、こえられる) */
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
  const platforms = [...s.platforms];
  let patterns = s.patterns;
  let x = s.nextSpawnX;
  const speed = Math.min(SPEED_MAX, s.speed + SPEED_STEP);
  const passSpeed = Math.min(SPEED_MAX, s.speed + SPEED_STEP / 2);

  while (x < s.distance + WORLD_W + 200) {
    const id = choosePattern(patterns, s.elapsedMs, roll);
    const built = PATTERNS_TABLE[id].build({ x, speed, passSpeed, elapsedMs: s.elapsedMs, roll, ceiling: s.ceiling });
    obstacles.push(...built.obstacles);
    seeds.push(...built.seeds);
    platforms.push(...built.platforms);
    patterns = [...patterns, id].slice(-3);
    x = built.end + built.gap + roll() * built.extra;
  }

  return { ...s, rng, obstacles, seeds, platforms, patterns, nextSpawnX: x };
}

/** 画面の左に消えたものを捨てる */
function prune(s: RunState): RunState {
  const edge = s.distance - 120;
  if (!s.obstacles.some((o) => o.x + o.w < edge) && !s.platforms.some((p) => p.x + p.w < edge) && !s.seeds.some((seed) => seed.x < edge || seed.taken)) return s;
  return {
    ...s,
    obstacles: s.obstacles.filter((o) => o.x + o.w >= edge),
    platforms: s.platforms.filter((p) => p.x + p.w >= edge),
    seeds: s.seeds.filter((seed) => seed.x >= edge && !seed.taken),
  };
}

export function meters(distance: number): number {
  return Math.floor(distance / PX_PER_M);
}

/** 点数: 距離(m)×2 + タネ×2(設計書14-1)。サーバー(RunGame::finish)でも同じ計算をする */
export function scoreOf(distanceM: number, seedValue: number): number {
  return distanceM * SCORE_PER_METER + seedValue * SCORE_PER_SEED;
}

/** 今の点数 */
export function currentScore(state: RunState): number {
  return scoreOf(meters(state.distance), state.seedValue);
}
