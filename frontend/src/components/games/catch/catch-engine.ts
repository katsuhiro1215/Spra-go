import type { GameQuestion } from "@/components/games/game-question";

/**
 * スプルキャッチのゲームの動き(docs/design/2026-09-29-spru-catch-design.md 3章・8章)。
 * 1問ごとに選択肢が横一列で落ち、受け取る線に着いたとき、スプルが立っている列の言葉を受け取る。
 * 画面はこの状態を描くだけにし、時間を進める・動かすのはここの関数だけで行う
 */
export type CatchSettings = { lanes: number; fallMs: number };
export type CatchPhase = "falling" | "feedback" | "done";
export type CatchAnswer = { questionId: number; choiceId: number; correct: boolean };
export type GrowthStage = "seed" | "sprout" | "bud" | "flower";
export type CatchVia = "line" | "throw";

export type CatchState = {
  questions: GameQuestion[];
  settings: CatchSettings;
  /** 今の問題 */
  index: number;
  /** スプルが立っている列(0が左) */
  lane: number;
  /** 0(上)〜1(受け取る線) */
  progress: number;
  phase: CatchPhase;
  /** ○×を見せている残りの時間 */
  feedbackMs: number;
  caughtLane: number | null;
  lastCorrect: boolean | null;
  /** 最後の答えの決まり方。線(受け取る線で決まった)か、投げた(タップで決めた)か。見た目にだけ使う */
  lastVia: CatchVia | null;
  score: number;
  combo: number;
  bestCombo: number;
  hearts: number;
  answers: CatchAnswer[];
};

export const CATCH_HEARTS = 3;
export const FEEDBACK_MS = { correct: 800, wrong: 1600 };
/** 種を投げたあと、スプルが投げる絵でいる時間(ミリ秒) */
export const THROW_POSE_MS = 300;
/** 1回に進める時間の上限。タブを離れていたあとなどに一気に進まないように */
export const MAX_STEP_MS = 100;
/** 点数の決まり。サーバーの config/games.php の catch.score と同じ */
const SCORE_RULES = { correct: 10, comboBonus: 5, comboBonusFrom: 3 };

/** 1問目のスプルの列。真ん中(偶数なら真ん中の左) */
export function startLane(lanes: number): number {
  return Math.floor((lanes - 1) / 2);
}

export function createCatchGame(questions: GameQuestion[], settings: CatchSettings): CatchState {
  return {
    questions,
    settings,
    index: 0,
    lane: startLane(settings.lanes),
    progress: 0,
    phase: questions.length === 0 ? "done" : "falling",
    feedbackMs: 0,
    caughtLane: null,
    lastCorrect: null,
    lastVia: null,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: CATCH_HEARTS,
    answers: [],
  };
}

/** 列を選んで動く。落ちている間だけ。端より外には行かない */
export function moveTo(state: CatchState, lane: number): CatchState {
  if (state.phase !== "falling") return state;
  const next = Math.min(state.settings.lanes - 1, Math.max(0, lane));
  return next === state.lane ? state : { ...state, lane: next };
}

export function moveBy(state: CatchState, step: -1 | 1): CatchState {
  return moveTo(state, state.lane + step);
}

/** 時間を進める。受け取る線に着いたら判定し、○×を見せたあと次の問題か終わりに移る */
export function tick(state: CatchState, dtMs: number): CatchState {
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS);
  if (dt === 0) return state;

  if (state.phase === "falling") {
    const progress = state.progress + dt / state.settings.fallMs;
    return progress >= 1 ? catchAtLine(state) : { ...state, progress };
  }
  if (state.phase === "feedback") {
    const feedbackMs = state.feedbackMs - dt;
    return feedbackMs > 0 ? { ...state, feedbackMs } : advance(state);
  }
  return state;
}

function pointsFor(correct: boolean, combo: number): number {
  if (!correct) return 0;
  return SCORE_RULES.correct + (combo >= SCORE_RULES.comboBonusFrom ? SCORE_RULES.comboBonus : 0);
}

/** 答えを決める(受け取る線でも、投げたときでも同じ決まり)。progress は、決まった高さ */
function settle(state: CatchState, lane: number, progress: number, via: CatchVia): CatchState {
  const question = state.questions[state.index];
  const choice = question.choices[lane];
  const correct = choice.id === question.correctChoiceId;
  const combo = correct ? state.combo + 1 : 0;

  return {
    ...state,
    progress,
    phase: "feedback",
    feedbackMs: correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong,
    caughtLane: lane,
    lastCorrect: correct,
    lastVia: via,
    score: state.score + pointsFor(correct, combo),
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    hearts: correct ? state.hearts : state.hearts - 1,
    answers: [...state.answers, { questionId: question.id, choiceId: choice.id, correct }],
  };
}

function catchAtLine(state: CatchState): CatchState {
  return settle(state, state.lane, 1, "line");
}

/**
 * 落ちている言葉をタップして、スプルが種を投げて答える(docs/design/2026-10-04-mini-app-tidy-design.md 4-1)。
 * 落ちている間だけ。どの高さでも投げられ、言葉はその高さで止まる。スプルの列は動かさない
 */
export function throwAt(state: CatchState, lane: number): CatchState {
  if (state.phase !== "falling" || !Number.isInteger(lane) || lane < 0 || lane >= state.settings.lanes) return state;
  return settle(state, lane, state.progress, "throw");
}

function advance(state: CatchState): CatchState {
  const nextIndex = state.index + 1;
  if (state.hearts <= 0 || nextIndex >= state.questions.length) {
    return { ...state, phase: "done", feedbackMs: 0 };
  }
  return { ...state, index: nextIndex, progress: 0, phase: "falling", feedbackMs: 0, caughtLane: null, lastCorrect: null, lastVia: null };
}

/** 答えの並び(正解か)から、点数といちばん長いコンボ。サーバーの CatchGame::score と同じ決まり */
export function scoreOf(results: boolean[]): { score: number; bestCombo: number } {
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  for (const correct of results) {
    combo = correct ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
    score += pointsFor(correct, combo);
  }
  return { score, bestCombo };
}

/** その回のいちばん長いコンボから、成長の印(設計書3-4) */
export function growthStage(bestCombo: number): GrowthStage {
  if (bestCombo >= 10) return "flower";
  if (bestCombo >= 6) return "bud";
  if (bestCombo >= 3) return "sprout";
  return "seed";
}

/** 全部の問題に答えて、全部正解だったか */
export function isPerfect(state: CatchState): boolean {
  return (
    state.phase === "done" &&
    state.questions.length > 0 &&
    state.answers.length === state.questions.length &&
    state.answers.every((answer) => answer.correct)
  );
}

/** 終えるAPIに送る答え(答えた順) */
export function answersOf(state: CatchState): { question_id: number; choice_id: number }[] {
  return state.answers.map((answer) => ({ question_id: answer.questionId, choice_id: answer.choiceId }));
}
