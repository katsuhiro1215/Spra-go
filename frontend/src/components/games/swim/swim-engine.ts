/**
 * スプルスイムのゲームの動き(docs/design/2026-11-10-spru-swim-design.md 2・6章)。
 * スプルランの run-engine.ts と同じ考え方: 横 WORLD_W の広さで計算し、画面に合わせて拡大する。
 * たて y は、海底からの高さ(上が大きい。0=海底、CEILING=水面)。じゃまもの・コインの x は「コースの上の位置」で、画面の位置は x − distance。
 * タップすると、その場で上向きの速さになる(マリオのジャンプと同じ)。あとは重力でだんだん沈んでいく。
 * じゃまものは、スプルランと同じく「パターン」の組み合わせで置く(単体の生き物・コインだけの列・金コインのごほうびなど)。
 * 同じパターンが続かないようにして、単調にならないようにする。時間を進めるのはここの関数だけで、画面はこの状態を描くだけにする
 */
export type ObstacleKind = "jellyfish" | "urchin" | "octopus" | "shark" | "crab" | "squid";
/** 単体のじゃまもの(海の生き物)。x・y は左下の位置、w・h は当たりの大きさ */
export type Obstacle = { kind: ObstacleKind; x: number; y: number; w: number; h: number; hit: boolean };
/** ふつう1枚・big = 複数枚分(光るコイン) */
export type Coin = { x: number; y: number; big: boolean; taken: boolean };
export type SwimPhase = "swimming" | "done";

export type SwimState = {
  seed: number;
  rng: number;
  phase: SwimPhase;
  elapsedMs: number;
  distance: number;
  speed: number;
  y: number;
  vy: number;
  hearts: number;
  invincibleMs: number;
  obstacles: Obstacle[];
  coins: Coin[];
  ceiling: number;
  /** 最近置いたパターン(新しいものが後ろ。最大3つ) */
  patterns: PatternId[];
  nextSpawnX: number;
  coinValue: number;
  pickupCount: number;
  hitCount: number;
  /** 小休止→ステージ1→小休止→ステージ2…の並び。段 0 は、始めの小休止 */
  stage: number;
  /** 今の段(小休止・ステージ)の種類 */
  segmentKind: SegmentKind;
  /** 今の段が終わる、コースの上の位置 */
  segmentEndX: number;
  /** 20ステージに届いた瞬間(お祝いを1回だけ出すため) */
  justCleared: boolean;
};

export const WORLD_W = 340;
export const PX_PER_M = 40;

export const SWIM_X = 70;
/** 当たりの大きさ(絵より小さめ。run-engine と同じ考え方) */
export const SWIM_W = 30;
export const SWIM_H = 22;

/** 常にかかる重力(沈む力)。水の中なので、run-engine.ts の空気中のジャンプより軽く・ゆっくりにする(ふわっと感) */
export const GRAVITY = 430;
/** タップしたときの、上向きの速さ。その場で、この速さに切り替わる。
 * 1回のタップで上がる高さ(頂点)を、じゃまものの高さよりかなり小さくする(FLAP_APEX参照)。
 * 小さいぶん、タップをくり返して細かく高さを合わせる(本物のFlappy系と同じ操作感) */
export const FLAP_V = 150;
/** 沈む速さの上限(これ以上は速くならない。何もしなくても、急に落ちすぎないように) */
export const MAX_SINK_V = 260;
/** 1回タップしたときの、いちばん高く上がる高さ(頂点。FLAP_V²÷(2×GRAVITY)) */
export const FLAP_APEX = (FLAP_V * FLAP_V) / (2 * GRAVITY);

/** すばやく2回タップ(ダブルタップ)したときの、強い上向きの速さ。
 * 「一番下のコインのすぐあと、ずっと上のコインを取りたい」ときの救済(Ownerの提案 2026-11-10)。
 * ダブルタップの判定は画面側(swim-game.tsx)で、実際のタップ時刻(performance.now())を見て行う。
 * エンジン側は判定を持たず、物理(FLAP_V による通常のタップとの違い)だけを持つ:
 * お手本の子(idealBot)による安全確認は、常にふつうのタップ(flap)だけで行う前提を崩さないため */
export const DASH_V = 240;
/** ダブルタップとみなす、タップの間かく(ms)。画面側で使う */
export const DASH_WINDOW_MS = 260;

/** 進む速さ(ずっと一定。Ownerの決定: スイムは速さを一定にし、じゃまものの数・組み合わせで難しくする) */
export const SWIM_SPEED = 170;

export const SWIM_HEARTS = 3;
export const INVINCIBLE_MS = 1500;
/** 1回に進める時間の上限(タブを離れたあとなどに一気に進まないように) */
export const MAX_STEP_MS = 100;
const SUB_STEP_MS = 16;

export const COIN_R = 12;
export const BIG_COIN_VALUE = 5;
const SCORE_PER_METER = 2;
const SCORE_PER_COIN = 2;
/** 1秒に集められるコインの数え方の合計の上限(サーバー側の上限確認で使う予定。run-engine の MAX_SEED_VALUE_PER_SEC と同じ考え方) */
export const MAX_COIN_VALUE_PER_SEC = 20;

/** じゃまもの(海の生き物)の当たりの大きさ。絵は、この高さより少し大きく描く */
export const OBSTACLE_W = 64;
export const OBSTACLE_H = 86;
/** 画面のはし(海底・水面)から、じゃまものを置かない余白 */
const EDGE_MARGIN = 16;
export const CEILING_DEFAULT = 300;
const FIRST_SPAWN_X = WORLD_W + 100;

/** 「小休止→ステージ1→小休止→ステージ2…」の構成(Ownerの決定。2026-11-10)。
 * 小休止は短め(5秒前後)・ステージも短め(10〜15秒前後)。20ステージ目に届いたら、お祝いを出してエンドレスへ続ける */
export type SegmentKind = "rest" | "stage";
const REST_S = 5;
const STAGE_S_MIN = 10;
const STAGE_S_MAX = 15;
/** 達成感を出す区切り。ここに届いたら「20ステージ クリア！」を出す。そのあともエンドレスで続く(段の数字は増え続け、むずかしさは20の値のまま) */
export const CLEAR_STAGE = 20;

/** 種から決まる乱数(mulberry32)の1歩。run-engine.ts と同じ */
function nextRandom(a: number): [number, number] {
  const next = (a + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSwim(seed: number, startMs = 0, ceiling = CEILING_DEFAULT): SwimState {
  return spawn({
    seed,
    rng: (seed * 2654435761) >>> 0,
    phase: "swimming",
    elapsedMs: startMs,
    distance: 0,
    speed: SWIM_SPEED,
    y: ceiling / 2,
    vy: 0,
    hearts: SWIM_HEARTS,
    invincibleMs: 0,
    obstacles: [],
    coins: [],
    ceiling,
    patterns: [],
    nextSpawnX: FIRST_SPAWN_X,
    coinValue: 0,
    pickupCount: 0,
    hitCount: 0,
    stage: 0,
    segmentKind: "rest",
    segmentEndX: FIRST_SPAWN_X + REST_S * SWIM_SPEED,
    justCleared: false,
  });
}

/** タップする。その場で、上向きの速さ(FLAP_V)に切り替わる(マリオのジャンプと同じ。空中でも何回でもできる) */
export function flap(state: SwimState): SwimState {
  if (state.phase !== "swimming") return state;
  return { ...state, vy: FLAP_V };
}

/** ダブルタップしたときの、強い上向きの速さ(DASH_V)。判定は画面側で行う */
export function dashFlap(state: SwimState): SwimState {
  if (state.phase !== "swimming") return state;
  return { ...state, vy: DASH_V };
}

export function tick(state: SwimState, dtMs: number): SwimState {
  if (state.phase !== "swimming") return state;
  let rest = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
  if (rest === 0) return state;

  // justCleared は「ちょうど20ステージに届いた、その1回だけ」の合図。毎回のtickの始めにいったん消す
  let s = state.justCleared ? { ...state, justCleared: false } : state;
  while (rest > 0 && s.phase === "swimming") {
    const dt = Math.min(SUB_STEP_MS, rest);
    rest -= dt;
    s = spawn(collide(move(s, dt)));
  }
  return prune(s);
}

function move(s: SwimState, dtMs: number): SwimState {
  const dt = dtMs / 1000;
  const elapsedMs = s.elapsedMs + dtMs;
  const distance = s.distance + s.speed * dt;
  let vy = Math.max(s.vy - GRAVITY * dt, -MAX_SINK_V);
  const y = clamp(s.y + vy * dt, 0, s.ceiling);
  // 海底・水面に着いたら、その方向の速さは0にする(めり込まない)
  if (y <= 0 || y >= s.ceiling) vy = 0;

  return {
    ...s,
    elapsedMs,
    distance,
    y,
    vy,
    invincibleMs: Math.max(0, s.invincibleMs - dtMs),
  };
}

function collide(s: SwimState): SwimState {
  const left = SWIM_X;
  const right = SWIM_X + SWIM_W;
  let { hearts, invincibleMs, coinValue, pickupCount, hitCount } = s;
  let obstacles = s.obstacles;
  let coins = s.coins;

  // 海底・水面に着いたことも、ぶつかったことと同じにあつかう(むりに押し続けて水面を出た/何もせず沈みきった)
  const atEdge = s.y <= 0 || s.y >= s.ceiling;

  if (invincibleMs === 0) {
    const index = obstacles.findIndex((o) => {
      const x = o.x - s.distance;
      return !o.hit && x < right && x + o.w > left && s.y < o.y + o.h && s.y + SWIM_H > o.y;
    });
    if (index >= 0 || atEdge) {
      if (index >= 0) obstacles = obstacles.map((o, i) => (i === index ? { ...o, hit: true } : o));
      hearts -= 1;
      invincibleMs = INVINCIBLE_MS;
      hitCount += 1;
    }
  }

  if (coins.some((c) => !c.taken && touches(c, s.distance, s.y))) {
    coins = coins.map((c) => {
      if (c.taken || !touches(c, s.distance, s.y)) return c;
      coinValue += c.big ? BIG_COIN_VALUE : 1;
      pickupCount += 1;
      return { ...c, taken: true };
    });
  }

  if (obstacles === s.obstacles && coins === s.coins && hitCount === s.hitCount) return s;
  return {
    ...s,
    obstacles,
    coins,
    hearts,
    invincibleMs,
    coinValue,
    pickupCount,
    hitCount,
    phase: hearts <= 0 ? "done" : s.phase,
  };
}

function touches(coin: Coin, distance: number, y: number): boolean {
  const x = coin.x - distance;
  return x + COIN_R > SWIM_X && x - COIN_R < SWIM_X + SWIM_W && coin.y + COIN_R > y && coin.y - COIN_R < y + SWIM_H;
}

export type PatternId = "single" | "coinRow" | "treasure" | "twin" | "triple";
type Built = { obstacles: Obstacle[]; coins: Coin[]; end: number; gap: number };
type Context = { x: number; ceiling: number; stage: number; roll: () => number };
/** fromStage: このステージ数から出る(20で頭打ち。1ステージ目から出すものは1) */
type Pattern = { fromStage: number; weight: number; build: (c: Context) => Built };

/** 序盤からいる、おだやかな生き物 */
const OBSTACLE_KINDS: ObstacleKind[] = ["jellyfish", "urchin", "octopus", "crab"];
/** このステージから、サメ・イカも混ざる(Ownerの決定: 後半はサメなど見た目も難しそうに。2026-11-10) */
const HARD_KIND_STAGE = 10;
const HARD_OBSTACLE_KINDS: ObstacleKind[] = [...OBSTACLE_KINDS, "shark", "squid"];
const kindsForStage = (stage: number): ObstacleKind[] => (stage >= HARD_KIND_STAGE ? HARD_OBSTACLE_KINDS : OBSTACLE_KINDS);
const randomKind = (stage: number, roll: () => number): ObstacleKind => {
  const kinds = kindsForStage(stage);
  return kinds[Math.floor(roll() * kinds.length)];
};
const coinAt = (x: number, y: number, big = false): Coin => ({ x, y, big, taken: false });

/** 反応するための時間(秒)。これに速さをかけて、パターンのあとの間かくを決める(run-engine の間かくと同じ考え方)。
 * 前のじゃまものと反対がわ(上⇄下)へ、まるごと動き直せる時間より長くする */
const REACTION_S = 1.6;

/** 単体のじゃまもの1体を、画面の中のどこかに置く(端には寄せすぎない) */
function placeObstacle(x: number, ceiling: number, stage: number, roll: () => number): Obstacle {
  const y = EDGE_MARGIN + roll() * (ceiling - OBSTACLE_H - EDGE_MARGIN * 2);
  return { kind: randomKind(stage, roll), x, y, w: OBSTACLE_W, h: OBSTACLE_H, hit: false };
}

/** じゃまものに対して、広いほうの安全な範囲([下端, 上端])を返す */
function safeBand(o: Obstacle, ceiling: number): { from: number; to: number } {
  const below = o.y - EDGE_MARGIN;
  const above = ceiling - EDGE_MARGIN - (o.y + o.h);
  return above >= below ? { from: o.y + o.h, to: ceiling - EDGE_MARGIN } : { from: EDGE_MARGIN, to: o.y };
}

/** コインを横一列に並べる(spacing の間かくで count 枚) */
function coinRowAt(startX: number, y: number, count: number, spacing: number): Coin[] {
  return Array.from({ length: count }, (_, i) => coinAt(startX + i * spacing, y));
}

const PATTERNS_TABLE: Record<PatternId, Pattern> = {
  // コインだけの、横一列(息ぬき。run-engine の river と同じ考え方)
  coinRow: {
    fromStage: 1,
    weight: 1,
    build: ({ x, ceiling, roll }) => {
      const y = EDGE_MARGIN + 40 + roll() * (ceiling - EDGE_MARGIN * 2 - 80);
      const count = 5;
      const spacing = 30;
      const coins = coinRowAt(x, y, count, spacing);
      if (roll() < 0.15) coins[Math.floor(count / 2)] = { ...coins[Math.floor(count / 2)], big: true };
      return { obstacles: [], coins, end: x + (count - 1) * spacing, gap: SWIM_SPEED * 0.5 };
    },
  },
  // 単体の生き物1体。広いほうのすき間に、横一列のコインを置いて、通り道の目安にする
  single: {
    fromStage: 1,
    weight: 4,
    build: ({ x, ceiling, stage, roll }) => {
      const obstacle = placeObstacle(x, ceiling, stage, roll);
      const band = safeBand(obstacle, ceiling);
      const y = clamp(band.from + (band.to - band.from) / 2, EDGE_MARGIN, ceiling - EDGE_MARGIN);
      const count = 3;
      const spacing = 30;
      const coins = coinRowAt(obstacle.x + obstacle.w / 2 - ((count - 1) * spacing) / 2, y, count, spacing);
      return { obstacles: [obstacle], coins, end: obstacle.x + obstacle.w, gap: 0 };
    },
  },
  // 単体の生き物1体+金コイン(生き物のすぐそば、少しせまい所に置く。ごほうび)
  treasure: {
    fromStage: 4,
    weight: 1.1,
    build: ({ x, ceiling, stage, roll }) => {
      const obstacle = placeObstacle(x, ceiling, stage, roll);
      const band = safeBand(obstacle, ceiling);
      // 金コインは、生き物のすぐそば(せまいほうの端)に置く。安全な側の広い範囲にも、ふつうのコインを2枚
      const nearSide = band.from === obstacle.y + obstacle.h ? obstacle.y + obstacle.h + 14 : obstacle.y - 14;
      const gold = coinAt(obstacle.x + obstacle.w / 2, clamp(nearSide, EDGE_MARGIN, ceiling - EDGE_MARGIN), true);
      const safeY = clamp(band.from + (band.to - band.from) / 2, EDGE_MARGIN, ceiling - EDGE_MARGIN);
      const coins = [gold, ...coinRowAt(obstacle.x + obstacle.w / 2 - 15, safeY, 2, 30)];
      return { obstacles: [obstacle], coins, end: obstacle.x + obstacle.w, gap: 0 };
    },
  },
  // 2体を続けて置く(時間がたってから出す)。2体とも、画面の上がわ・下がわのどちらかに決め打ちして置くので、
  // 安全な側(あいている側)が、2体ともかならずそろう(上⇄下へ動き直さなくてよい)
  twin: {
    fromStage: 8,
    weight: 1,
    build: ({ x, ceiling, stage, roll }) => {
      const low = roll() < 0.5;
      // low: 2体とも画面の下半分寄りに置く(あいている側は、かならず上) / 逆は、かならず下があく
      const yFrom = low ? EDGE_MARGIN : ceiling * 0.55;
      const yTo = low ? ceiling * 0.45 - OBSTACLE_H : ceiling - EDGE_MARGIN - OBSTACLE_H;
      const placeAt = (ox: number): Obstacle => ({ kind: randomKind(stage, roll), x: ox, y: yFrom + roll() * Math.max(0, yTo - yFrom), w: OBSTACLE_W, h: OBSTACLE_H, hit: false });
      const first = placeAt(x);
      const gap1 = SWIM_SPEED * REACTION_S * 0.7;
      const second = placeAt(first.x + first.w + gap1);
      const band1 = safeBand(first, ceiling);
      const band2 = safeBand(second, ceiling);
      const coins = [
        coinAt(first.x + first.w / 2, clamp((band1.from + band1.to) / 2, EDGE_MARGIN, ceiling - EDGE_MARGIN)),
        coinAt(second.x + second.w / 2, clamp((band2.from + band2.to) / 2, EDGE_MARGIN, ceiling - EDGE_MARGIN)),
      ];
      return { obstacles: [first, second], coins, end: second.x + second.w, gap: 0 };
    },
  },
  // 3体を続けて置く(twinと同じ考え方で3体とも同じ側に決め打ち)。後半のステージ向けの、さらに長い難所
  triple: {
    fromStage: 14,
    weight: 0.8,
    build: ({ x, ceiling, stage, roll }) => {
      const low = roll() < 0.5;
      const yFrom = low ? EDGE_MARGIN : ceiling * 0.55;
      const yTo = low ? ceiling * 0.45 - OBSTACLE_H : ceiling - EDGE_MARGIN - OBSTACLE_H;
      const placeAt = (ox: number): Obstacle => ({ kind: randomKind(stage, roll), x: ox, y: yFrom + roll() * Math.max(0, yTo - yFrom), w: OBSTACLE_W, h: OBSTACLE_H, hit: false });
      const gap = SWIM_SPEED * REACTION_S * 0.7;
      const first = placeAt(x);
      const second = placeAt(first.x + first.w + gap);
      const third = placeAt(second.x + second.w + gap);
      const bands = [first, second, third].map((o) => safeBand(o, ceiling));
      const coins = [first, second, third].map((o, i) => coinAt(o.x + o.w / 2, clamp((bands[i].from + bands[i].to) / 2, EDGE_MARGIN, ceiling - EDGE_MARGIN)));
      return { obstacles: [first, second, third], coins, end: third.x + third.w, gap: 0 };
    },
  },
};

export const PATTERNS = PATTERNS_TABLE;
const PATTERN_IDS = Object.keys(PATTERNS_TABLE) as PatternId[];
const REPEAT_WEIGHT = 0.3;
/** 出始めてから、本来の重みに育つまでのステージ数。いきなり出すのではなく、だんだん増やす(20ステージ全体で、じわじわ難しくする) */
const RAMP_STAGES = 4;

/** そのステージでの、パターンの出やすさ。fromStageに届いた直後は控えめにして、RAMP_STAGES かけて本来の重みまで増やす */
function rampedWeight(pattern: Pattern, stage: number): number {
  const t = clamp((stage - pattern.fromStage) / RAMP_STAGES, 0, 1);
  return pattern.weight * (0.25 + 0.75 * t);
}

/** 次に置くパターンを選ぶ。ステージが進むほど、出るパターンが増え・出やすくなる。同じパターンは3回続けない(run-engine の choosePattern と同じ考え方) */
export function choosePattern(history: PatternId[], stage: number, roll: () => number): PatternId {
  let pool = PATTERN_IDS.filter((id) => PATTERNS_TABLE[id].fromStage <= stage);
  const lastTwo = history.slice(-2);
  if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
    const others = pool.filter((id) => id !== lastTwo[1]);
    if (others.length > 0) pool = others;
  }
  const last = history.at(-1);
  const weights = pool.map((id) => rampedWeight(PATTERNS_TABLE[id], stage) * (id === last ? REPEAT_WEIGHT : 1));
  let target = roll() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    target -= weights[i];
    if (target < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** 画面の右の少し先まで、「小休止→ステージ→小休止→…」の並びで置く */
function spawn(s: SwimState): SwimState {
  const threshold = s.distance + WORLD_W + 200;
  if (threshold <= s.nextSpawnX) return s;

  let rng = s.rng;
  const roll = () => {
    const [value, next] = nextRandom(rng);
    rng = next;
    return value;
  };
  const obstacles = [...s.obstacles];
  const coins = [...s.coins];
  let patterns = s.patterns;
  let x = s.nextSpawnX;
  let stage = s.stage;
  let segmentKind = s.segmentKind;
  let segmentEndX = s.segmentEndX;
  let justCleared = s.justCleared;

  while (x < threshold) {
    if (x >= segmentEndX) {
      if (segmentKind === "rest") {
        stage += 1;
        segmentKind = "stage";
        segmentEndX = x + (STAGE_S_MIN + roll() * (STAGE_S_MAX - STAGE_S_MIN)) * s.speed;
        if (stage === CLEAR_STAGE) justCleared = true;
      } else {
        segmentKind = "rest";
        segmentEndX = x + REST_S * s.speed;
      }
      continue;
    }

    if (segmentKind === "rest") {
      // 小休止は、1区切りをまるごと「何もない」か「コインだけの列」にする(Ownerの決定: 小休止は短め)
      if (roll() < 0.6) {
        const y = EDGE_MARGIN + 40 + roll() * (s.ceiling - EDGE_MARGIN * 2 - 80);
        const spacing = 30;
        const count = Math.max(1, Math.floor((segmentEndX - x) / spacing));
        coins.push(...coinRowAt(x, y, count, spacing));
      }
      x = segmentEndX;
    } else {
      const difficulty = Math.min(stage, CLEAR_STAGE);
      const id = choosePattern(patterns, difficulty, roll);
      const built = PATTERNS_TABLE[id].build({ x, ceiling: s.ceiling, stage: difficulty, roll });
      obstacles.push(...built.obstacles);
      coins.push(...built.coins);
      patterns = [...patterns, id].slice(-3);
      x = built.end + built.gap + s.speed * REACTION_S + roll() * s.speed * 0.3;
    }
  }

  return { ...s, rng, obstacles, coins, patterns, nextSpawnX: x, stage, segmentKind, segmentEndX, justCleared };
}

function prune(s: SwimState): SwimState {
  const edge = s.distance - 120;
  if (!s.obstacles.some((o) => o.x + o.w < edge) && !s.coins.some((c) => c.x < edge || c.taken)) return s;
  return {
    ...s,
    obstacles: s.obstacles.filter((o) => o.x + o.w >= edge),
    coins: s.coins.filter((c) => c.x >= edge && !c.taken),
  };
}

export function meters(distance: number): number {
  return Math.floor(distance / PX_PER_M);
}

/** 点数: 距離(m)×2 + コイン×2(run-engine の scoreOf と同じ考え方) */
export function scoreOf(distanceM: number, coinValue: number): number {
  return distanceM * SCORE_PER_METER + coinValue * SCORE_PER_COIN;
}

export function currentScore(state: SwimState): number {
  return scoreOf(meters(state.distance), state.coinValue);
}
