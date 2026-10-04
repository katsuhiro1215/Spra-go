import { describe, expect, it } from "vitest";

import type { GameQuestion } from "@/components/games/game-question";

import {
  CATCH_HEARTS,
  FEEDBACK_MS,
  THROW_POSE_MS,
  answersOf,
  createCatchGame,
  growthStage,
  isPerfect,
  moveBy,
  moveTo,
  scoreOf,
  startLane,
  throwAt,
  tick,
  type CatchState,
} from "./catch-engine";

/** 問題を作る。選択肢の番号は 問題の番号×10＋列 */
function question(id: number, labels: string[], correctLane = 0): GameQuestion {
  const choices = labels.map((label, lane) => ({ id: id * 10 + lane, label }));
  return { id, prompt: `「word${id}」の意味は？`, choices, correctChoiceId: choices[correctLane].id };
}

const SETTINGS = { lanes: 2, fallMs: 1000 };

function fallToLine(state: CatchState): CatchState {
  let next = state;
  while (next.phase === "falling") next = tick(next, 100);
  return next;
}

function endFeedback(state: CatchState): CatchState {
  let next = state;
  while (next.phase === "feedback") next = tick(next, 100);
  return next;
}

/** 正解の列に動いて受け取り、○×を見せ終わるまで進める */
function answer(state: CatchState, correct: boolean): CatchState {
  const current = state.questions[state.index];
  const correctLane = current.choices.findIndex((c) => c.id === current.correctChoiceId);
  const lane = correct ? correctLane : current.choices.findIndex((c) => c.id !== current.correctChoiceId);
  return endFeedback(fallToLine(moveTo(state, lane)));
}

describe("始まり", () => {
  it("スプルは真ん中の列(偶数なら真ん中の左)から始まる", () => {
    expect([startLane(2), startLane(3), startLane(4)]).toEqual([0, 1, 1]);
  });

  it("ハート3つ・0点・1問目が落ち始めた状態で始まる", () => {
    const state = createCatchGame([question(1, ["a", "b", "c"])], { lanes: 3, fallMs: 1000 });
    expect([state.lane, state.hearts, state.score, state.index, state.phase, state.progress]).toEqual([1, CATCH_HEARTS, 0, 0, "falling", 0]);
  });

  it("問題がなければ最初から終わり", () => {
    expect(createCatchGame([], SETTINGS).phase).toBe("done");
  });
});

describe("動かす", () => {
  it("1列ずつ動き、端より外には行かない", () => {
    let state = createCatchGame([question(1, ["a", "b", "c", "d"])], { lanes: 4, fallMs: 1000 });
    state = moveBy(state, 1);
    state = moveBy(state, 1);
    state = moveBy(state, 1);
    expect(state.lane).toBe(3);
    state = moveBy(moveBy(moveBy(moveBy(state, -1), -1), -1), -1);
    expect(state.lane).toBe(0);
  });

  it("列を直接選べる。範囲の外は端に止まる", () => {
    const state = createCatchGame([question(1, ["a", "b", "c"])], { lanes: 3, fallMs: 1000 });
    expect(moveTo(state, 2).lane).toBe(2);
    expect(moveTo(state, 9).lane).toBe(2);
    expect(moveTo(state, -1).lane).toBe(0);
  });

  it("○×を見せている間は動かない", () => {
    const caught = fallToLine(createCatchGame([question(1, ["a", "b"]), question(2, ["c", "d"])], SETTINGS));
    expect(caught.phase).toBe("feedback");
    expect(moveBy(caught, 1).lane).toBe(caught.lane);
    expect(moveTo(caught, 1).lane).toBe(caught.lane);
  });
});

describe("受け取る", () => {
  it("時間が進むと落ち、受け取る線で立っている列の言葉を受け取る", () => {
    let state = createCatchGame([question(1, ["a", "b"], 1)], SETTINGS);
    state = tick(state, 100);
    expect(state.progress).toBeCloseTo(0.1);
    state = fallToLine(moveBy(state, 1));
    expect([state.phase, state.caughtLane, state.answers]).toEqual(["feedback", 1, [{ questionId: 1, choiceId: 11, correct: true }]]);
  });

  it("正解は +10点・コンボ+1・○を0.8秒見せる", () => {
    const state = fallToLine(createCatchGame([question(1, ["a", "b"], 0)], SETTINGS));
    expect([state.lastCorrect, state.score, state.combo, state.hearts, state.feedbackMs]).toEqual([true, 10, 1, 3, FEEDBACK_MS.correct]);
  });

  it("まちがいはハート−1・コンボ0・×を1.6秒見せる", () => {
    const state = fallToLine(createCatchGame([question(1, ["a", "b"], 1)], SETTINGS));
    expect([state.lastCorrect, state.score, state.combo, state.hearts, state.feedbackMs]).toEqual([false, 0, 0, 2, FEEDBACK_MS.wrong]);
  });

  it("○×のあと次の問題へ。スプルは同じ列のまま", () => {
    let state = createCatchGame([question(1, ["a", "b"], 1), question(2, ["c", "d"])], SETTINGS);
    state = endFeedback(fallToLine(moveBy(state, 1)));
    expect([state.index, state.phase, state.progress, state.lane, state.caughtLane]).toEqual([1, "falling", 0, 1, null]);
  });

  it("コンボが3以上の正解は、さらに5点", () => {
    let state = createCatchGame([1, 2, 3].map((id) => question(id, ["a", "b"])), SETTINGS);
    state = answer(answer(answer(state, true), true), true);
    expect([state.score, state.combo, state.bestCombo]).toEqual([35, 3, 3]);
  });

  it("ハートが0になったら、×を見せたあと終わる", () => {
    let state = createCatchGame([1, 2, 3, 4].map((id) => question(id, ["a", "b"])), SETTINGS);
    state = answer(answer(state, false), false);
    state = fallToLine(moveTo(state, 1));
    expect([state.phase, state.hearts]).toEqual(["feedback", 0]);
    expect(endFeedback(state).phase).toBe("done");
  });

  it("最後の問題のあとは終わる", () => {
    const state = answer(createCatchGame([question(1, ["a", "b"])], SETTINGS), true);
    expect([state.phase, state.answers.length]).toEqual(["done", 1]);
  });
});

describe("時間", () => {
  it("1回に進める時間は100ミリ秒まで(タブを離れていたあとに一気に進まない)", () => {
    const state = tick(createCatchGame([question(1, ["a", "b"])], SETTINGS), 60000);
    expect([state.phase, state.progress]).toEqual(["falling", 0.1]);
  });

  it("マイナスの時間では進まない", () => {
    const state = tick(createCatchGame([question(1, ["a", "b"])], SETTINGS), -500);
    expect(state.progress).toBe(0);
  });
});

describe("点数の決まり(サーバーの CatchGame::score と同じ例)", () => {
  it("正解6→まちがい→正解2→まちがいで100点・いちばん長いコンボ6", () => {
    expect(scoreOf([true, true, true, true, true, true, false, true, true, false])).toEqual({ score: 100, bestCombo: 6 });
  });

  it("10問全部正解で140点", () => {
    expect(scoreOf(Array(10).fill(true))).toEqual({ score: 140, bestCombo: 10 });
  });

  it("まちがい→正解3で35点。答えがなければ0点", () => {
    expect(scoreOf([false, true, true, true])).toEqual({ score: 35, bestCombo: 3 });
    expect(scoreOf([])).toEqual({ score: 0, bestCombo: 0 });
  });
});

describe("成長の印", () => {
  it("いちばん長いコンボで 種→芽→つぼみ→花", () => {
    expect([0, 2, 3, 5, 6, 9, 10].map(growthStage)).toEqual(["seed", "seed", "sprout", "sprout", "bud", "bud", "flower"]);
  });
});

describe("終わり", () => {
  it("全問正解かどうか", () => {
    const questions = [question(1, ["a", "b"]), question(2, ["c", "d"])];
    expect(isPerfect(answer(answer(createCatchGame(questions, SETTINGS), true), true))).toBe(true);
    expect(isPerfect(answer(answer(createCatchGame(questions, SETTINGS), true), false))).toBe(false);
    expect(isPerfect(answer(createCatchGame(questions, SETTINGS), true))).toBe(false); // まだ途中
  });

  it("終わるときに送る答えは、答えた順の問題と選択肢の番号", () => {
    const state = answer(answer(createCatchGame([question(1, ["a", "b"]), question(2, ["c", "d"])], SETTINGS), true), false);
    expect(answersOf(state)).toEqual([
      { question_id: 1, choice_id: 10 },
      { question_id: 2, choice_id: 21 },
    ]);
  });
});

describe("種を投げて答える", () => {
  const two = [question(1, ["正", "誤"]), question(2, ["正", "誤"])];

  it("落ちている間にタップした列の言葉で、すぐ答えが決まる(正解は点数とコンボが増える)", () => {
    const state = throwAt(createCatchGame(two, SETTINGS), 0);

    expect(state.phase).toBe("feedback");
    expect(state.lastCorrect).toBe(true);
    expect([state.score, state.combo, state.bestCombo, state.hearts]).toEqual([10, 1, 1, CATCH_HEARTS]);
    expect(state.caughtLane).toBe(0);
    expect(state.lastVia).toBe("throw");
    expect(state.answers).toEqual([{ questionId: 1, choiceId: 10, correct: true }]);
  });

  it("まちがいは、点数なし・コンボが戻る・ハートが1つ減る", () => {
    const state = throwAt(createCatchGame(two, SETTINGS), 1);

    expect([state.lastCorrect, state.score, state.combo, state.hearts]).toEqual([false, 0, 0, CATCH_HEARTS - 1]);
    expect(state.answers).toEqual([{ questionId: 1, choiceId: 11, correct: false }]);
  });

  it("言葉の高さは、投げた瞬間のまま止まる。スプルの列は動かない", () => {
    let state = createCatchGame(two, SETTINGS);
    state = tick(state, 100); // 0.1 落ちる
    const thrown = throwAt(state, 1);

    expect(thrown.progress).toBe(state.progress);
    expect(thrown.lane).toBe(state.lane);
  });

  it("○×を見せたあと、次の問題へ進み、スプルは同じ列から始まる。投げた答えは1つだけ記録される", () => {
    const next = endFeedback(throwAt(createCatchGame(two, SETTINGS), 0));

    expect(next.index).toBe(1);
    expect(next.phase).toBe("falling");
    expect(next.lastVia).toBeNull();
    expect(next.answers).toHaveLength(1);
  });

  it("投げたあとは、受け取る線に着いても、もう一度は決まらない", () => {
    let state = throwAt(createCatchGame(two, SETTINGS), 0);
    for (let i = 0; i < 20; i++) state = tick(state, 100); // 余裕を持って進める(○×のあと、2問目が落ち始める)

    expect(state.answers.filter((a) => a.questionId === 1)).toHaveLength(1);
  });

  it("受け取る線で決まったときは、lastVia が line", () => {
    const state = fallToLine(createCatchGame(two, SETTINGS));

    expect(state.lastVia).toBe("line");
  });

  it("落ちていない間(○×を見せている・終わった)・範囲外の列・小数の列は、何も起きない", () => {
    const feedback = throwAt(createCatchGame(two, SETTINGS), 0);
    expect(throwAt(feedback, 1)).toBe(feedback);

    const falling = createCatchGame(two, SETTINGS);
    expect(throwAt(falling, -1)).toBe(falling);
    expect(throwAt(falling, 2)).toBe(falling);
    expect(throwAt(falling, 0.5)).toBe(falling);

    const done = createCatchGame([], SETTINGS);
    expect(throwAt(done, 0)).toBe(done);
  });

  it("最後の問題や、ハートが0になった投げ方でも、○×のあとに終わる", () => {
    const last = endFeedback(throwAt(createCatchGame([question(1, ["正", "誤"])], SETTINGS), 0));
    expect(last.phase).toBe("done");

    let state = createCatchGame([1, 2, 3, 4].map((id) => question(id, ["正", "誤"])), SETTINGS);
    for (let i = 0; i < 3; i++) state = endFeedback(throwAt(state, 1)); // 3回まちがえる
    expect([state.hearts, state.phase]).toEqual([0, "done"]);
  });

  it("投げて答えた並びの点数は、受け取りで答えたときの採点と同じ(サーバーの採点し直しと合う)", () => {
    let state = createCatchGame([1, 2, 3].map((id) => question(id, ["正", "誤"])), SETTINGS);
    state = endFeedback(throwAt(state, 0));
    state = endFeedback(throwAt(state, 0));
    state = endFeedback(throwAt(state, 1));

    expect(scoreOf(state.answers.map((a) => a.correct))).toEqual({ score: state.score, bestCombo: state.bestCombo });
  });

  it("投げたあとの、スプルの投げる絵の時間は 300ms", () => {
    expect(THROW_POSE_MS).toBe(300);
  });
});
