"use client";

import { useEffect, useState } from "react";

import { tilePosition, type Board } from "@/lib/slide-puzzle";

/** 絵の縦横の比(横÷縦)。読み込めるまでは国旗の 3:2 */
export function useImageAspect(src: string): number {
  const [aspect, setAspect] = useState(1.5);

  useEffect(() => {
    let active = true;
    const image = new window.Image();
    image.onload = () => {
      if (active && image.naturalWidth > 0 && image.naturalHeight > 0) setAspect(image.naturalWidth / image.naturalHeight);
    };
    image.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  return aspect;
}

/**
 * スライドパズルの盤(docs/design/2026-10-09-slide-puzzle-design.md 3-3)。絵を、列×行に切ったピースとして並べる。
 * 最後のピース(右下の絵)は、盤の右横に置いてある。ほかのピースが並んだら(arranged)、それをタップして入れると完成(complete)。
 * ピースは背景の絵の一部を見せる。完成したら、線を消して1枚の絵にする
 */
export function PuzzleBoard({
  image,
  cols,
  rows,
  board,
  aspect,
  arranged,
  complete,
  onTap,
  onInsert,
}: {
  image: string;
  cols: number;
  rows: number;
  board: Board;
  aspect: number;
  /** 最後のピース以外が、完成の並びになっている */
  arranged: boolean;
  /** 最後のピースを入れた(完成) */
  complete: boolean;
  onTap: (index: number) => void;
  onInsert: () => void;
}) {
  const sheet = (col: number, row: number) => ({
    backgroundImage: `url(${image})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols > 1 ? (col * 100) / (cols - 1) : 0}% ${rows > 1 ? (row * 100) / (rows - 1) : 0}%`,
  });

  return (
    <div className="mx-auto flex w-full max-w-[400px] items-end gap-0">
      <div
        role="group"
        aria-label="パズル"
        className="relative overflow-hidden rounded-2xl bg-[#1d2a55] shadow-[0_8px_22px_rgba(40,70,90,0.3)]"
        style={{ width: `${(cols / (cols + 1)) * 100}%`, aspectRatio: String(aspect) }}
      >
        {complete ? (
          // 完成したら、最後のピースも含めて、1枚の絵にする
          <div
            aria-label="完成した絵"
            className="absolute inset-0"
            style={{ backgroundImage: `url(${image})`, backgroundRepeat: "no-repeat", backgroundSize: "100% 100%" }}
          />
        ) : (
          board.map((tile, index) => {
            if (tile === 0) return null;
            const home = tilePosition(tile, cols, rows);
            return (
              <button
                key={tile}
                type="button"
                aria-label={`ピース ${tile}`}
                disabled={arranged}
                onClick={() => onTap(index)}
                className="absolute transition-[left,top] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  left: `${((index % cols) * 100) / cols}%`,
                  top: `${(Math.floor(index / cols) * 100) / rows}%`,
                  width: `${100 / cols}%`,
                  height: `${100 / rows}%`,
                  boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.75)",
                  ...sheet(home.col, home.row),
                }}
              />
            );
          })
        )}
      </div>

      {/* 最後のピース: 盤の右横(下の端)。ほかが並ぶまでは薄く、並んだらタップして入れる */}
      <div className="flex flex-col items-center justify-end" style={{ width: `${100 / (cols + 1)}%` }}>
        {!complete && (
          <button
            type="button"
            aria-label="さいごのピース"
            disabled={!arranged}
            onClick={onInsert}
            className={`w-[88%] rounded-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              arranged ? "animate-pulse opacity-100 ring-4 ring-[#f2b632]" : "opacity-45"
            }`}
            style={{ aspectRatio: String((aspect * rows) / cols), boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.75)", ...sheet(cols - 1, rows - 1) }}
          />
        )}
      </div>
    </div>
  );
}
