"use client";

import { useEffect, useState } from "react";

import { isSolved, tilePosition, type Board } from "@/lib/slide-puzzle";

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
 * ピースは背景の絵の一部を見せる。空きマスは何も置かない。完成したら、線を消して1枚の絵にする
 */
export function PuzzleBoard({
  image,
  cols,
  rows,
  board,
  aspect,
  onTap,
}: {
  image: string;
  cols: number;
  rows: number;
  board: Board;
  aspect: number;
  onTap: (index: number) => void;
}) {
  const solved = isSolved(board);

  return (
    <div
      role="group"
      aria-label="パズル"
      className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl bg-[#1d2a55] shadow-[0_8px_22px_rgba(40,70,90,0.3)]"
      style={{ aspectRatio: String(aspect) }}
    >
      {solved && (
        // 完成したら、空きマスだった所も含めて、1枚の絵にする
        <div
          aria-label="完成した絵"
          className="absolute inset-0"
          style={{ backgroundImage: `url(${image})`, backgroundRepeat: "no-repeat", backgroundSize: "100% 100%" }}
        />
      )}
      {!solved && board.map((tile, index) => {
        if (tile === 0) return null;
        const home = tilePosition(tile, cols, rows);
        return (
          <button
            key={tile}
            type="button"
            aria-label={`ピース ${tile}`}
            onClick={() => onTap(index)}
            className="absolute transition-[left,top] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{
              left: `${((index % cols) * 100) / cols}%`,
              top: `${(Math.floor(index / cols) * 100) / rows}%`,
              width: `${100 / cols}%`,
              height: `${100 / rows}%`,
              backgroundImage: `url(${image})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${cols * 100}% ${rows * 100}%`,
              backgroundPosition: `${cols > 1 ? (home.col * 100) / (cols - 1) : 0}% ${rows > 1 ? (home.row * 100) / (rows - 1) : 0}%`,
              boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.75)",
            }}
          />
        );
      })}
    </div>
  );
}
