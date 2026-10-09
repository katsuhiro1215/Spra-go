"use client";

import { useMemo, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { Button } from "@/components/app/button";
import { answerOf, canSubmit, clearAll, placeTile, removeAt, tilesOf } from "@/lib/spelling";
import { cn } from "@/lib/utils";

type Props = {
  length: number;
  letters: string[];
  answered: boolean;
  submitting: boolean;
  /** 答えたあとの結果。正しい綴りと、正解だったか */
  result: { correct: boolean; correctSpelling: string | null } | null;
  onSubmit: (spelling: string) => void;
};

/**
 * スペルを並べる問題(docs/design/2026-10-09-review-variety-design.md 3-3)。文字のタイルをタップして、枠に入れていく。
 * キーボードは使わない。入れた文字をタップするともどる。全部の枠が埋まったら「できた！」で答えを送る
 */
export function SpellingQuestion({ length, letters, answered, submitting, result, onSubmit }: Props) {
  const tiles = useMemo(() => tilesOf(letters), [letters]);
  const [placed, setPlaced] = useState<number[]>([]);
  const ready = canSubmit(placed, length, { answered, submitting });
  const attempt = answerOf(placed, tiles);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-center gap-2" aria-label="答えの枠">
        {Array.from({ length }, (_, slot) => {
          const tileId = placed[slot];
          const filled = tileId !== undefined;
          return (
            <button
              key={slot}
              type="button"
              disabled={answered || !filled}
              aria-label={filled ? `${slot + 1}文字目 ${tiles[tileId].letter}。タップでもどす` : `${slot + 1}文字目 から`}
              onClick={() => setPlaced((current) => removeAt(current, slot))}
              className={cn(
                "flex h-14 w-11 items-center justify-center rounded-xl border-2 border-b-4 text-3xl font-black uppercase transition-colors disabled:pointer-events-none",
                !answered && (filled ? "border-[#2b6fa3] bg-[#e6f1f9] text-[#2b4a6a]" : "border-dashed border-[#c9bfae] bg-white"),
                answered && result?.correct && "border-[#5bb33e] bg-[#dff5d3] text-[#2e6b1c]",
                answered && result && !result.correct && "border-[#f28b6d] bg-[#ffd9cc] text-[#a23b20]",
              )}
            >
              {filled ? tiles[tileId].letter : ""}
            </button>
          );
        })}
      </div>

      {answered && result && !result.correct && result.correctSpelling && (
        <p className="text-center text-base font-black text-[#2e6b1c]">
          <AutoFurigana text="正しいつづり" />： <span className="text-2xl tracking-widest">{result.correctSpelling}</span>
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2" aria-label="文字のタイル">
        {tiles.map((tile) => {
          const used = placed.includes(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              disabled={answered || used}
              aria-label={`文字 ${tile.letter}`}
              onClick={() => setPlaced((current) => placeTile(current, tile.id, length))}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-xl border-2 border-b-4 border-[#e8dfcf] bg-[#fffaf0] text-3xl font-black uppercase shadow-sm transition-opacity disabled:pointer-events-none",
                used && "opacity-25",
              )}
            >
              {tile.letter}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="default" disabled={placed.length === 0 || submitting} onClick={() => setPlaced(clearAll())}>
            けす
          </Button>
          <Button variant="primary" disabled={!ready} onClick={() => onSubmit(attempt)}>
            できた！
          </Button>
        </div>
      )}
    </div>
  );
}
