import type { GameQuestion } from "@/components/games/game-question";

import { itemFactor } from "./space-view";

/**
 * うちゅう旅行のゲームの動き(docs/design/2026-10-09-space-trip-design.md 3章)。
 * ロケットは下で列を動く。1問の間に、隕石と星が上から来て、最後に答えの門が着く。門に着いたとき、いる列の門で答えが決まる。
 * 進み(progress)は 0〜1。ものは「着く時刻」(at。ロケットの高さに着く進み)を持ち、画面はその時刻から位置を計算して描く。
 * 時間を進める・動かすのはここの関数だけで行い、画面はこの状態を描くだけにする
 */
/** calm が真なら、隕石を出さない(動きを減らす設定。設計書3-3) */
export type SpaceSettings = { lanes: number; fallMs: number; obstacleRows: number; calm?: boolean };
export type SpacePhase = "falling" | "feedback" | "done";
export type SpaceAnswer = { questionId: number; choiceId: number; correct: boolean; stars: number };
export type SpaceItem = { kind: "meteor" | "star"; lane: number; at: number; done: boolean };
/** 飛んでいる種(列と、投げてからの時間)。ミリ秒は実時間 */
export type SpaceShot = { lane: number; ms: number };
/** こわれた隕石の見た目(列と、その隕石の着く時刻と、残り時間) */
export type SpaceBlast = { lane: number; at: number; ms: number };

export type SpaceState = {
  questions: GameQuestion[];
  settings: SpaceSettings;
  /** 隕石と星の置き方の種(遊んだ回の番号) */
  seed: number;
  index: number;
  /** ロケットがいる列(0が左) */
  lane: number;
  /** 0(始まり)〜1(門に着く) */
  progress: number;
  phase: SpacePhase;
  feedbackMs: number;
  /** 門をくぐった列 */
  gateLane: number | null;
  lastCorrect: boolean | null;
  items: SpaceItem[];
  /** この問題で集めた星 */
  stars: number;
  /** 隕石にぶつかった問題は、あとの星を数えない */
  starsLocked: boolean;
  /** ぶつかったあとの、ロケットがゆれている残りの時間 */
  hitMs: number;
  /** 飛んでいる種(設計書 2026-10-19-space-trip-shoot-design.md 3章) */
  shots: SpaceShot[];
  /** 次に種を投げられるまでの、残りの時間(ミリ秒) */
  cooldownMs: number;
  blasts: SpaceBlast[];
  score: number;
  combo: number;
  bestCombo: number;
  hearts: number;
  answers: SpaceAnswer[];
};

export const SPACE_HEARTS = 3;
export const FEEDBACK_MS = { correct: 800, wrong: 1600 };
export const HIT_MS = 600;
/** 1回に進める時間の上限。タブを離れていたあとなどに一気に進まないように */
export const MAX_STEP_MS = 100;
/** ものが、上から下まで進むのにかかる進みの長さ(1問の長さの割合)。小さいほど速い */
export const TRAVEL = 0.75;
/** ものが、ロケットに当たる範囲(着く時刻の前後) */
export const HIT_WINDOW = 0.07;
/** 種が、いちばん下から上まで飛ぶ時間(ミリ秒)と、次に投げられるまでの時間・こわれた隕石の見た目の時間 */
export const SHOT_MS = 260;
export const SHOT_COOLDOWN_MS = 350;
export const BLAST_MS = 300;
/** 隕石の段が並ぶ範囲と、星が着く時刻 */
const ROW_FROM = 0.3;
const ROW_TO = 0.7;
const STAR_TIMES = [0.34, 0.5, 0.66];
/** 点数の決まり。サーバーの config/games.php の catch.score と同じ */
const SCORE_RULES = { correct: 10, comboBonus: 5, comboBonusFrom: 3 };

/** 種から決まる乱数(mulberry32)。同じ種なら同じ並び */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 列を移るのにかかる時間(ミリ秒): 隣の列まで400。1列遠いごとに150ふえる */
export function moveMs(distance: number): number {
  return distance === 0 ? 0 : 400 + 150 * (distance - 1);
}

/** 1つの段の隕石の着く時刻(at)ごとに、隕石のある列を集める(時刻の早い順) */
function meteorRows(items: SpaceItem[]): { at: number; blocked: Set<number> }[] {
  const rows = new Map<number, Set<number>>();
  for (const item of items) {
    if (item.kind !== "meteor") continue;
    rows.set(item.at, (rows.get(item.at) ?? new Set()).add(item.lane));
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([at, blocked]) => ({ at, blocked }));
}

/**
 * 前の段で「いてよい列」から、次の段で「いてよい列」を求める(設計書3-4章)。
 * 次の段で隕石のない列のうち、同じ列のまま、または、あいだに列を移る時間があって移れる列。
 * 2つの段の当たりの範囲が重なっているときは、同じ列のままでないといけない
 */
function reachable(previous: Set<number>, prevAt: number, at: number, blocked: Set<number>, lanes: number, fallMs: number): Set<number> {
  const out = new Set<number>();
  const overlap = at - prevAt < HIT_WINDOW * 2 - 1e-9;
  const gapMs = (at - prevAt - HIT_WINDOW * 2) * fallMs;
  for (let lane = 0; lane < lanes; lane++) {
    if (blocked.has(lane)) continue;
    for (const from of previous) {
      if (from === lane || (!overlap && gapMs >= moveMs(Math.abs(lane - from)))) {
        out.add(lane);
        break;
      }
    }
  }
  return out;
}

/** 置かれた隕石を、よけながら通れる道があるか(最初の段の前は、どの列にもいられる) */
export function hasSafePath(items: SpaceItem[], lanes: number, fallMs: number): boolean {
  const rows = meteorRows(items);
  let safe = new Set(Array.from({ length: lanes }, (_, lane) => lane));
  let prevAt = -1;
  for (const row of rows) {
    safe = reachable(safe, prevAt, row.at, row.blocked, lanes, fallMs);
    if (safe.size === 0) return false;
    prevAt = row.at;
  }
  return true;
}

/**
 * 1問分の隕石と星の置き方(純粋。同じ引数なら同じ結果)。
 * 隕石は、段(rows)ごとに、0または1〜(列の数−1)個。**置いたあと、よけて通れる道があるか調べ**、道が切れる段は、
 * 置き直す(20回まで)。それでも切れるなら、その段の隕石をなくす(設計書3-4章)。星は最大3つで、近くの隕石と同じ列には置かない
 */
export function layoutFor(seed: number, index: number, lanes: number, rows: number, calm = false, fallMs = 6000): SpaceItem[] {
  const next = random(seed * 7919 + index * 104729 + 12345);
  const items: SpaceItem[] = [];
  const minMeteors = lanes >= 4 ? 1 : 0;
  const maxMeteors = lanes - 1;
  let safe = new Set(Array.from({ length: lanes }, (_, lane) => lane));
  let prevAt = -1;

  for (let row = 0; row < (calm ? 0 : rows); row++) {
    const at = round(ROW_FROM + ((ROW_TO - ROW_FROM) * (row + 1)) / (rows + 1));
    let placed: number[] = [];
    let after: Set<number> | null = null;
    for (let attempt = 0; attempt < 20 && after === null; attempt++) {
      const count = minMeteors + Math.floor(next() * (maxMeteors - minMeteors + 1));
      const free = Array.from({ length: lanes }, (_, lane) => lane);
      const picked: number[] = [];
      for (let n = 0; n < count; n++) picked.push(free.splice(Math.floor(next() * free.length), 1)[0]);
      const result = reachable(safe, prevAt, at, new Set(picked), lanes, fallMs);
      if (result.size > 0) {
        placed = picked;
        after = result;
      }
    }
    if (after === null) {
      // どうしても道が切れる段は、隕石を置かない
      after = reachable(safe, prevAt, at, new Set(), lanes, fallMs);
      placed = [];
    }
    for (const lane of placed) items.push({ kind: "meteor", lane, at, done: false });
    if (after.size > 0) {
      safe = after;
      prevAt = at;
    }
  }

  for (const at of STAR_TIMES) {
    const blocked = new Set(items.filter((item) => item.kind === "meteor" && Math.abs(item.at - at) < HIT_WINDOW * 2).map((item) => item.lane));
    const open = Array.from({ length: lanes }, (_, lane) => lane).filter((lane) => !blocked.has(lane));
    if (open.length === 0) continue;
    items.push({ kind: "star", lane: open[Math.floor(next() * open.length)], at, done: false });
  }

  return items;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/** 1問目のロケットの列。真ん中(偶数なら真ん中の左) */
export function startLane(lanes: number): number {
  return Math.floor((lanes - 1) / 2);
}

export function createSpaceGame(questions: GameQuestion[], settings: SpaceSettings, seed: number): SpaceState {
  return {
    questions,
    settings,
    seed,
    index: 0,
    lane: startLane(settings.lanes),
    progress: 0,
    phase: questions.length === 0 ? "done" : "falling",
    feedbackMs: 0,
    gateLane: null,
    lastCorrect: null,
    items: layoutFor(seed, 0, settings.lanes, settings.obstacleRows, settings.calm, settings.fallMs),
    stars: 0,
    starsLocked: false,
    hitMs: 0,
    shots: [],
    cooldownMs: 0,
    blasts: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: SPACE_HEARTS,
    answers: [],
  };
}

/** 列を選んで動く。進んでいる間だけ。端より外には行かない */
export function moveTo(state: SpaceState, lane: number): SpaceState {
  if (state.phase !== "falling") return state;
  const next = Math.min(state.settings.lanes - 1, Math.max(0, lane));
  return next === state.lane ? state : { ...state, lane: next };
}

export function moveBy(state: SpaceState, step: -1 | 1): SpaceState {
  return moveTo(state, state.lane + step);
}

/** 時間を進める。星・隕石の当たりを調べ、門に着いたら答えを決め、○×を見せたあと次の問題か終わりに移る */
export function tick(state: SpaceState, dtMs: number): SpaceState {
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
  if (dt === 0) return state;

  if (state.phase === "falling") {
    const progress = state.progress + dt / state.settings.fallMs;
    const base = { ...state, progress, hitMs: Math.max(0, state.hitMs - dt), cooldownMs: Math.max(0, state.cooldownMs - dt) };
    const flown = flyShots(base, state.progress, dt);
    if (flown.early !== null) return settle(flown.state, flown.early, true);
    const moved = collide(flown.state);
    return progress >= 1 ? settle(moved, moved.lane, false) : moved;
  }
  if (state.phase === "feedback") {
    const feedbackMs = state.feedbackMs - dt;
    return feedbackMs > 0 ? { ...state, feedbackMs, hitMs: Math.max(0, state.hitMs - dt), blasts: ageBlasts(state.blasts, dt) } : advance(state);
  }
  return state;
}

/** 種を投げる。進んでいる間で、ためていないときだけ。ロケットがいる列のまっすぐ上へ飛ぶ */
export function throwSeed(state: SpaceState): SpaceState {
  if (state.phase !== "falling" || state.cooldownMs > 0) return state;
  return { ...state, shots: [...state.shots, { lane: state.lane, ms: 0 }], cooldownMs: SHOT_COOLDOWN_MS };
}

const ageBlasts = (blasts: SpaceBlast[], dt: number): SpaceBlast[] =>
  blasts.map((blast) => ({ ...blast, ms: blast.ms - dt })).filter((blast) => blast.ms > 0);

/** 種の位置(ものと同じ座標。1でロケットの頭の上、0でいちばん上) */
const shotFactor = (ms: number) => 1 - ms / SHOT_MS;
/** 種が、画面の上をこえて消える時間 */
const SHOT_END_MS = SHOT_MS * 1.15;
/** 種が、答えの門に当たれる、門の位置のいちばん上(これより上の門は、画面の外) */
const GATE_TOP = 0;

/**
 * 種を飛ばす。種の位置が、同じ列のものの位置を、前の時間から今の時間のあいだに、こえたときが当たり
 * (ものは下へ、種は上へ動く)。1つの種は、いちばんロケットに近い(位置の数が大きい)1つに当たって消える。
 * 門に当たったら、その列の答えを early として返す(門は、画面の中にあるときだけ)
 */
function flyShots(state: SpaceState, prevProgress: number, dt: number): { state: SpaceState; early: number | null } {
  if (state.shots.length === 0 && state.blasts.length === 0) return { state, early: null };

  let items = state.items;
  let stars = state.stars;
  const blasts = ageBlasts(state.blasts, dt);
  const shots: SpaceShot[] = [];
  let early: number | null = null;

  for (const shot of state.shots) {
    const s0 = shotFactor(shot.ms);
    const s1 = shotFactor(shot.ms + dt);
    let hit: { factor: number; index: number } | null = null;
    items.forEach((item, index) => {
      if (item.done || item.lane !== shot.lane) return;
      const f0 = itemFactor(prevProgress, item.at, TRAVEL);
      const f1 = itemFactor(state.progress, item.at, TRAVEL);
      if (s0 - f0 >= 0 && s1 - f1 <= 0 && (hit === null || f1 > hit.factor)) hit = { factor: f1, index };
    });
    const g0 = itemFactor(prevProgress, 1, TRAVEL);
    const g1 = itemFactor(state.progress, 1, TRAVEL);
    const gateHit = s0 - g0 >= 0 && s1 - g1 <= 0 && g1 >= GATE_TOP;

    if (gateHit && (hit === null || g1 > (hit as { factor: number }).factor)) {
      early = shot.lane;
      continue;
    }
    if (hit !== null) {
      const { index } = hit as { factor: number; index: number };
      const item = items[index];
      items = items.map((it, i) => (i === index ? { ...it, done: true } : it));
      if (item.kind === "meteor") blasts.push({ lane: item.lane, at: item.at, ms: BLAST_MS });
      else if (!state.starsLocked) stars += 1;
      continue;
    }
    if (shot.ms + dt < SHOT_END_MS) shots.push({ lane: shot.lane, ms: shot.ms + dt });
  }

  return { state: { ...state, items, stars, shots, blasts }, early };
}

/** ロケットがいる列で、当たる範囲に入ったものを片づける。隕石は星をゼロにし、星は(ぶつかっていなければ)数える */
function collide(state: SpaceState): SpaceState {
  let { stars, starsLocked, hitMs } = state;
  let changed = false;

  const items = state.items.map((item) => {
    if (item.done || item.lane !== state.lane || Math.abs(state.progress - item.at) > HIT_WINDOW) return item;
    changed = true;
    if (item.kind === "meteor") {
      stars = 0;
      starsLocked = true;
      hitMs = HIT_MS;
    } else if (!starsLocked) {
      stars += 1;
    }

    return { ...item, done: true };
  });

  return changed ? { ...state, items, stars, starsLocked, hitMs } : state;
}

function pointsFor(correct: boolean, combo: number): number {
  if (!correct) return 0;
  return SCORE_RULES.correct + (combo >= SCORE_RULES.comboBonusFrom ? SCORE_RULES.comboBonus : 0);
}

/** 答えを決める。門に着いたとき(early でない)は、いる列の門。種を門に当てたとき(early)は、当てた列の門で、その場で止まる */
function settle(state: SpaceState, lane: number, early: boolean): SpaceState {
  const question = state.questions[state.index];
  const choice = question.choices[lane];
  const correct = choice.id === question.correctChoiceId;
  const combo = correct ? state.combo + 1 : 0;

  return {
    ...state,
    progress: early ? state.progress : 1,
    phase: "feedback",
    feedbackMs: correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong,
    shots: [],
    cooldownMs: 0,
    gateLane: lane,
    lastCorrect: correct,
    score: state.score + pointsFor(correct, combo) + state.stars,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    hearts: correct ? state.hearts : state.hearts - 1,
    answers: [...state.answers, { questionId: question.id, choiceId: choice.id, correct, stars: state.stars }],
  };
}

function advance(state: SpaceState): SpaceState {
  const nextIndex = state.index + 1;
  if (state.hearts <= 0 || nextIndex >= state.questions.length) {
    return { ...state, phase: "done", feedbackMs: 0 };
  }
  return {
    ...state,
    index: nextIndex,
    progress: 0,
    phase: "falling",
    feedbackMs: 0,
    gateLane: null,
    lastCorrect: null,
    items: layoutFor(state.seed, nextIndex, state.settings.lanes, state.settings.obstacleRows, state.settings.calm, state.settings.fallMs),
    stars: 0,
    starsLocked: false,
    hitMs: 0,
    shots: [],
    cooldownMs: 0,
    blasts: [],
  };
}

/** 答えの並び(正解か・星の数)から、点数といちばん長いコンボ。サーバーの CatchGame::score と同じ決まり */
export function scoreOf(results: { correct: boolean; stars: number }[]): { score: number; bestCombo: number } {
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  for (const result of results) {
    combo = result.correct ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
    score += pointsFor(result.correct, combo) + result.stars;
  }
  return { score, bestCombo };
}

/** 全部の問題に答えて、全部正解だったか */
export function isPerfect(state: SpaceState): boolean {
  return (
    state.phase === "done" &&
    state.questions.length > 0 &&
    state.answers.length === state.questions.length &&
    state.answers.every((answer) => answer.correct)
  );
}

/** 集めた星の合計 */
export function totalStars(state: SpaceState): number {
  return state.answers.reduce((sum, answer) => sum + answer.stars, 0);
}

/** 終えるAPIに送る答え(答えた順。星つき) */
export function answersOf(state: SpaceState): { question_id: number; choice_id: number; stars: number }[] {
  return state.answers.map((answer) => ({ question_id: answer.questionId, choice_id: answer.choiceId, stars: answer.stars }));
}
