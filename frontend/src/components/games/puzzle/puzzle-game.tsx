"use client";

import { useEffect, useRef, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button as AppButton } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { SkyText } from "@/components/app/sky-page";
import { arranged, formatTime, scramble, slide } from "@/lib/slide-puzzle";

import { answerOf, pictureOf, type PuzzleAnswer, type PuzzleQuestion, type PuzzleStart } from "./puzzle-api";
import { PuzzleBoard, useImageAspect } from "./puzzle-board";

/** 1枚分: パズル → 最後のピースを入れて完成 → 「これはなんでしょう」(docs/design/2026-10-09-slide-puzzle-design.md 1章) */
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
  const [board, setBoard] = useState(() => scramble(cols, rows, Math.random, question.tile_kinds));
  const [elapsed, setElapsed] = useState(0);
  const [complete, setComplete] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const ready = arranged(board, question.tile_kinds);

  // 最初に動かしてから、最後のピースを入れるまでの時間。表示は、動かしているあいだだけ進める
  useEffect(() => {
    if (complete || startedAt.current === null) return;
    const timer = window.setInterval(() => setElapsed(performance.now() - (startedAt.current ?? performance.now())), 100);
    return () => window.clearInterval(timer);
  }, [complete, board]);

  function tap(index: number) {
    if (ready) return;
    const next = slide(board, cols, index);
    if (!next) return;
    if (startedAt.current === null) startedAt.current = performance.now();
    setBoard(next);
  }

  function insert() {
    if (!ready || complete) return;
    setElapsed(performance.now() - (startedAt.current ?? performance.now()));
    setComplete(true);
  }

  function pick(choiceId: number) {
    if (picked !== null) return;
    setPicked(choiceId);
    playSound(choiceId === question.correct_choice_id ? "correct" : "incorrect");
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-6 py-6 pb-24 text-center">
      <SkyText className="flex w-full items-center justify-between text-sm font-black">
        <span>
          {number}/{total}
        </span>
        <span aria-live="off">{formatTime(elapsed)}</span>
      </SkyText>

      {!complete && (
        <div className="flex flex-col items-center gap-1">
          <SkyText className="text-xs">
            <AutoFurigana text="見本" />
          </SkyText>
          <div
            aria-hidden
            className="w-24 rounded-lg bg-[#1d2a55] bg-contain bg-center bg-no-repeat shadow"
            style={{ backgroundImage: `url(${picture})`, aspectRatio: String(aspect) }}
          />
        </div>
      )}

      <PuzzleBoard
        image={picture}
        cols={cols}
        rows={rows}
        board={board}
        aspect={aspect}
        arranged={ready}
        complete={complete}
        onTap={tap}
        onInsert={insert}
      />

      {!complete && (
        <SkyText className="text-sm">
          <AutoFurigana text={ready ? "さいごのピースを 右の はしから いれよう！" : "空いているところの そばのピースをタップ！"} />
        </SkyText>
      )}

      {complete && (
        <>
          <SkyText className="text-lg font-black">
            <AutoFurigana text="できた！ これはなんでしょう？" />
          </SkyText>
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
              <SkyText as="p" className="text-base font-black">
                <span role="status">
                  <AutoFurigana text={picked === question.correct_choice_id ? "せいかい！" : "ざんねん！ こたえは " + answerOf(question)} />
                </span>
              </SkyText>
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
          <button type="button" onClick={() => setConfirmQuit(true)} className="rounded-full px-3 py-1 text-sm underline underline-offset-2">
            <SkyText as="span">
              <AutoFurigana text="やめる" />
            </SkyText>
          </button>
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
