"use client";

import { useEffect, useRef, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { formatTime, isSolved, scramble, slide } from "@/lib/slide-puzzle";

import { pictureOf, type PuzzleAnswer, type PuzzleQuestion, type PuzzleStart } from "./puzzle-api";
import { PuzzleBoard, useImageAspect } from "./puzzle-board";

/** 1枚分: パズル → 完成 → 「これはなんでしょう」(docs/design/2026-10-09-slide-puzzle-design.md 1章) */
function PuzzleRound({
  question,
  grid,
  number,
  total,
  last,
  onDone,
}: {
  question: PuzzleQuestion;
  grid: [number, number];
  number: number;
  total: number;
  last: boolean;
  onDone: (choiceId: number, elapsedMs: number) => void;
}) {
  const [cols, rows] = grid;
  const { play: playSound } = useSound();
  const picture = pictureOf(question);
  const aspect = useImageAspect(picture);
  const [board, setBoard] = useState(() => scramble(cols, rows));
  const [elapsed, setElapsed] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const solved = isSolved(board);

  // 最初に動かしてから完成までの時間。表示は、動かしているあいだだけ進める
  useEffect(() => {
    if (solved || startedAt.current === null) return;
    const timer = window.setInterval(() => setElapsed(performance.now() - (startedAt.current ?? performance.now())), 100);
    return () => window.clearInterval(timer);
  }, [solved, board]);

  function tap(index: number) {
    const next = slide(board, cols, index);
    if (!next) return;
    if (startedAt.current === null) startedAt.current = performance.now();
    setBoard(next);
    if (isSolved(next)) setElapsed(performance.now() - (startedAt.current ?? performance.now()));
  }

  function pick(choiceId: number) {
    if (picked !== null) return;
    setPicked(choiceId);
    playSound(choiceId === question.correct_choice_id ? "correct" : "incorrect");
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-6 pb-24 text-center">
      <div className="flex w-full items-center justify-between text-sm font-black text-[#3b3226]">
        <span>
          {number}/{total}
        </span>
        <span aria-live="off">{formatTime(elapsed)}</span>
      </div>

      {!solved && (
        <>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-bold text-[#3b3226]">
              <AutoFurigana text="見本" />
            </p>
            <div
              aria-hidden
              className="w-24 rounded-lg bg-[#1d2a55] bg-contain bg-center bg-no-repeat shadow"
              style={{ backgroundImage: `url(${picture})`, aspectRatio: String(aspect) }}
            />
          </div>
          <PuzzleBoard image={picture} cols={cols} rows={rows} board={board} aspect={aspect} onTap={tap} />
          <p className="text-xs font-bold text-[#3b3226]">
            <AutoFurigana text="空いているところの そばのピースをタップ！" />
          </p>
        </>
      )}

      {solved && (
        <>
          <PuzzleBoard image={picture} cols={cols} rows={rows} board={board} aspect={aspect} onTap={() => {}} />
          <p className="text-lg font-black text-[#3b3226]">
            <AutoFurigana text="できた！ これはなんでしょう？" />
          </p>
          <div className="grid w-full grid-cols-2 gap-3">
            {question.choices.map((choice) => {
              const isCorrect = choice.id === question.correct_choice_id;
              const variant = picked === null ? "default" : isCorrect ? "primary" : choice.id === picked ? "danger" : "locked";
              return (
                <AppButton key={choice.id} variant={variant} size="lg" disabled={picked !== null} onClick={() => pick(choice.id)} className="h-auto min-h-14 whitespace-normal py-2">
                  <AutoFurigana text={choice.label} />
                </AppButton>
              );
            })}
          </div>
          {picked !== null && (
            <>
              <p role="status" className="text-base font-black text-[#3b3226]">
                <AutoFurigana text={picked === question.correct_choice_id ? "せいかい！" : "ざんねん！ こたえは " + (question.choices.find((c) => c.id === question.correct_choice_id)?.label ?? "")} />
              </p>
              <AppButton variant="warning" size="lg" onClick={() => onDone(picked, elapsed)} className="w-full">
                <AutoFurigana text={last ? "けっかを見る" : "つぎへ"} />
              </AppButton>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** 3枚を順に遊ぶ。終わったら、答えと、パズルにかかった時間の合計を渡す */
export function PuzzleGame({
  start,
  onFinish,
  onQuit,
}: {
  start: PuzzleStart;
  onFinish: (answers: PuzzleAnswer[], elapsedMs: number) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PuzzleAnswer[]>([]);
  const [totalMs, setTotalMs] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const question = start.questions[index];

  function done(choiceId: number, elapsedMs: number) {
    const nextAnswers = [...answers, { question_id: question.id, choice_id: choiceId }];
    const nextTotal = totalMs + Math.round(elapsedMs);
    if (index + 1 >= start.questions.length) {
      onFinish(nextAnswers, nextTotal);
      return;
    }
    setAnswers(nextAnswers);
    setTotalMs(nextTotal);
    setIndex(index + 1);
  }

  return (
    <>
      <div className="relative z-20 flex justify-start px-4 pt-3">
        {confirmQuit ? (
          <div className="flex items-center gap-2 rounded-full bg-[#fffaf0] px-3 py-1 text-xs font-bold text-[#3b3226] shadow">
            <AutoFurigana text="やめる？ここまでの答えは残らないよ" />
            <AppButton variant="default" size="sm" onClick={onQuit}>
              <AutoFurigana text="やめる" />
            </AppButton>
            <AppButton variant="ghost" size="sm" onClick={() => setConfirmQuit(false)}>
              <AutoFurigana text="つづける" />
            </AppButton>
          </div>
        ) : (
          <AppButton variant="ghost" size="sm" onClick={() => setConfirmQuit(true)}>
            <AutoFurigana text="やめる" />
          </AppButton>
        )}
      </div>
      <PuzzleRound
        key={question.id}
        question={question}
        grid={start.grid}
        number={index + 1}
        total={start.questions.length}
        last={index + 1 >= start.questions.length}
        onDone={done}
      />
    </>
  );
}
