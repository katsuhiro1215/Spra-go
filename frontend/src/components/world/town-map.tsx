"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type MouseEvent } from "react";
import { House } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { prefersReducedMotion } from "@/lib/motion";

import { homePlot, isAwayFromHome, isDragMove, mapLayout, scrollForPlot } from "./map-view";
import type { WorldLand, WorldPlot } from "./types";

type Drag = { x: number; y: number; left: number; top: number; moved: boolean };

/**
 * 町の地図の枠(設計書3-3・5-1)。町が枠の横幅に収まる縮尺で地図全体を描き、はみ出した分はスクロールで見る。
 * スマホは指でスクロール、PCはマウスのドラッグ・ホイール・矢印キーで動かす
 */
export function TownMap({
  land,
  focus,
  children,
}: {
  land: WorldLand;
  focus: { plot: WorldPlot; at: number } | null;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const measuredWidth = useRef(0);
  const positioned = useRef(false);
  const [viewWidth, setViewWidth] = useState(0);
  const [away, setAway] = useState(false);
  const layout = viewWidth > 0 ? mapLayout(land, viewWidth) : null;

  // 枠の幅を測る。幅が変わったら(スマホを横にした等)、町が枠に収まる位置に戻す
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width === measuredWidth.current) return;
      measuredWidth.current = width;
      positioned.current = false;
      setViewWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewWidth === 0 || positioned.current) return;
    positioned.current = true;
    const home = scrollForPlot(homePlot(land), mapLayout(land, viewWidth), viewWidth);
    el.scrollTo({ left: home.left, top: home.top });
  }, [land, viewWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !focus || viewWidth === 0) return;
    const target = scrollForPlot(focus.plot, mapLayout(land, viewWidth), viewWidth);
    el.scrollTo({ left: target.left, top: target.top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [focus, land, viewWidth]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !layout) return;
    const home = scrollForPlot(homePlot(land), layout, viewWidth);
    setAway(isAwayFromHome({ left: el.scrollLeft, top: el.scrollTop }, home, viewWidth, layout.viewHeight));
  }

  function goHome() {
    const el = scrollRef.current;
    if (!el || !layout) return;
    const home = scrollForPlot(homePlot(land), layout, viewWidth);
    el.scrollTo({ left: home.left, top: home.top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  // 指のスクロールはブラウザにまかせ、マウスだけドラッグで動かす
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    const el = scrollRef.current;
    if (e.pointerType !== "mouse" || e.button !== 0 || !el) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = scrollRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && !isDragMove(dx, dy)) return;
    d.moved = true;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  }

  function handlePointerUp() {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  }

  // ドラッグした後に指を離した場所のボタン(アイテム・マス・雲の札)を押した扱いにしない
  function handleClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        role="region"
        aria-label="町の地図。矢印キーで動かせます"
        tabIndex={0}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onClickCapture={handleClickCapture}
        className="town-map-scroll cursor-grab overflow-auto select-none focus-visible:outline-3 focus-visible:outline-[#f2b632] active:cursor-grabbing"
        style={{ height: layout?.viewHeight }}
      >
        {layout && (
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            {children}
          </div>
        )}
      </div>
      {away && (
        <button
          type="button"
          onClick={goHome}
          className="absolute right-2 bottom-2 flex h-10 items-center gap-1 rounded-full bg-[#fffaf0] px-3 text-[12.5px] font-black text-[#2e6b1c] shadow-[0_3px_8px_rgba(59,50,38,0.2)]"
        >
          <House className="h-4 w-4" aria-hidden />
          <span>
            <AutoFurigana text="スプルの家へ戻る" />
          </span>
        </button>
      )}
    </div>
  );
}
