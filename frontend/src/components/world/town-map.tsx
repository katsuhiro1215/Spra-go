"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type MouseEvent } from "react";
import { House, Minus, Plus } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { prefersReducedMotion } from "@/lib/motion";

import { ZOOM_STEPS, homePlot, isAwayFromHome, isDragMove, mapLayout, nextZoom, scrollForPlot, zoomedScroll } from "./map-view";
import type { WorldLand, WorldPlot } from "./types";

type Drag = { x: number; y: number; left: number; top: number; moved: boolean };

/**
 * 町の地図の枠(設計書3-3・5-1)。町が枠の横幅に収まる縮尺で地図全体を描き、はみ出した分はスクロールで見る。
 * スマホは指でスクロール、PCはマウスのドラッグ・ホイール・矢印キーで動かす
 */
export function TownMap({
  land,
  focus,
  dim = false,
  lockScroll = false,
  children,
}: {
  /** 道を引いている間は、マウスのドラッグで地図を動かさない(引くのに使うので) */
  lockScroll?: boolean;
  land: WorldLand;
  /** 夜は海を暗くする */
  dim?: boolean;
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
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ pointers: Map<number, { x: number; y: number }>; distance: number }>({ pointers: new Map(), distance: 0 });
  const layout = viewWidth > 0 ? mapLayout(land, viewWidth, zoom) : null;

  // 拡大・縮小。枠の真ん中に見えていた場所が、真ん中のままになるようスクロールも合わせる
  function changeZoom(direction: "in" | "out") {
    const el = scrollRef.current;
    const next = nextZoom(zoom, direction);
    if (!el || next === zoom || viewWidth === 0) return;
    const nextLayout = mapLayout(land, viewWidth, next);
    const to = zoomedScroll({ left: el.scrollLeft, top: el.scrollTop }, { width: el.clientWidth, height: el.clientHeight }, zoom, next, nextLayout);
    setZoom(next);
    requestAnimationFrame(() => el.scrollTo({ left: to.left, top: to.top }));
  }

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
    if (e.pointerType === "touch") {
      pinch.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinch.current.distance = 0;
    }
    const el = scrollRef.current;
    if (lockScroll || e.pointerType !== "mouse" || e.button !== 0 || !el) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  }

  // 2本の指の幅が1.3倍以上になったら拡大、1/1.3以下になったら縮小(1段ずつ)
  function handlePinch(e: PointerEvent<HTMLDivElement>) {
    const { pointers } = pinch.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size !== 2) return;
    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch.current.distance === 0) {
      pinch.current.distance = distance;
      return;
    }
    const ratio = distance / pinch.current.distance;
    if (ratio >= 1.3) changeZoom("in");
    else if (ratio <= 1 / 1.3) changeZoom("out");
    else return;
    pinch.current.distance = distance;
    suppressClick.current = true;
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    handlePinch(e);
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

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    pinch.current.pointers.delete(e.pointerId);
    pinch.current.distance = 0;
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
    // 遠くから見ている(0.35倍以下)ときは、雲の札を隠す(区画が13あるので、重なって読めないため)
    <div className="relative" data-town-zoom={zoom <= 0.35 ? "far" : "near"}>
      {/* 海は枠いっぱいの背景1枚。陸が動いても海は動かない(上下は空へ溶ける) */}
      <div className="town-sea" style={dim ? { filter: "brightness(0.55) saturate(0.9)" } : undefined} aria-hidden />
      <div
        ref={scrollRef}
        role="region"
        aria-label="町の地図。矢印キーで動かせます"
        tabIndex={0}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) changeZoom(e.deltaY < 0 ? "in" : "out");
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onClickCapture={handleClickCapture}
        className="town-map-scroll relative cursor-grab overflow-auto select-none focus-visible:outline-3 focus-visible:outline-[#f2b632] active:cursor-grabbing"
        // 枠は、画面の空きいっぱいまで高くする(町が収まる高さより低くはしない)
        style={{ height: layout ? `max(${layout.viewHeight}px, calc(100dvh - 400px))` : undefined, touchAction: "pan-x pan-y" }}
      >
        {layout && (
          <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
            {children}
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 flex flex-col overflow-hidden rounded-full bg-[#fffaf0] shadow-[0_3px_8px_rgba(59,50,38,0.2)]">
        <button
          type="button"
          onClick={() => changeZoom("in")}
          disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          aria-label="町を大きく見る"
          className="flex h-10 w-10 items-center justify-center text-[#2e6b1c] disabled:opacity-35"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => changeZoom("out")}
          disabled={zoom === ZOOM_STEPS[0]}
          aria-label="町を小さく見る"
          className="flex h-10 w-10 items-center justify-center border-t border-[#e8dfcf] text-[#2e6b1c] disabled:opacity-35"
        >
          <Minus className="h-5 w-5" aria-hidden />
        </button>
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
