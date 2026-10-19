"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

import { foamOpacity } from "./animation";
import { drawFoam, drawLand, drawShoreGlow, type DrawEnv } from "./draw-ground";
import { drawObjectsLayer, type Motion, type ObjectEnv } from "./draw-objects";
import { createImageCache, loadBrowserImage } from "./image-cache";
import { modelSources, type SceneModel } from "./scene-model";

/** 画面の密度の上限と、Canvasの幅(ピクセル)の上限(設計書8章) */
const MAX_DPR = 2;
const MAX_WIDTH_PX = 4096;
/** 黒を重ねる濃さ。夜の物の `brightness(0.78)` と同じ明るさになる */
const DIM_ALPHA = 0.22;

type Stamp = { key: string | number; start: number };

const nowSeconds = () => performance.now() / 1000;

function dimmed(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(0, 0, 0, ${DIM_ALPHA})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * 町の絵をCanvasで描く(docs/design/2026-10-19-town-canvas-design.md)。SVG版 WorldScene の絵の部分と同じ座標で描く。
 * 動かない層(地面・崖・道など)は別のCanvasに描いて保存し、変わったときだけ作り直す。毎フレームは、それを貼って、動く物だけ描く
 */
export function TownCanvas({
  model,
  groundKey,
  quiet,
  poppedItemId,
  spruImage,
  companionTalk,
  veilFading,
}: {
  model: SceneModel;
  /** 動かない層が変わるかの鍵(scene-model.ts の groundSignature) */
  groundKey: string;
  quiet: boolean;
  poppedItemId: number | null;
  spruImage: string;
  companionTalk: { key: string; at: number } | null;
  veilFading: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ width: number; scale: number } | null>(null);
  const [version, setVersion] = useState(0);
  const cacheRef = useRef<ReturnType<typeof createImageCache<HTMLImageElement>> | null>(null);
  const dimCache = useRef(new Map<string, HTMLCanvasElement>());
  const layers = useRef<{ key: string; glow: HTMLCanvasElement; land: HTMLCanvasElement } | null>(null);
  const modelRef = useRef(model);
  const stamps = useRef<{ pop: Stamp | null; hop: Stamp | null; spru: Stamp | null; veil: Stamp | null }>({ pop: null, hop: null, spru: null, veil: null });
  const reduced = useRef(false);
  const quietRef = useRef(quiet);

  // 描くときに読む値を、描くたびの render のあとで最新にする(render の中では ref を書き換えない)
  useEffect(() => {
    modelRef.current = model;
    quietRef.current = quiet;
  });

  // 画像の読み込み。まとまって読めたら、描き直す
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setVersion((v) => v + 1);
      }, 80);
    };
    cacheRef.current ??= createImageCache(loadBrowserImage, bump);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const sources = modelSources(model).join("\n");
  useEffect(() => {
    void cacheRef.current?.request(sources.split("\n")).then(() => setVersion((v) => v + 1));
  }, [sources]);

  // できごとからの経過秒の起点(置いた・跳ねた・雲が晴れる)
  useEffect(() => {
    stamps.current.pop = poppedItemId === null ? null : { key: poppedItemId, start: nowSeconds() };
  }, [poppedItemId]);
  useEffect(() => {
    stamps.current.hop = companionTalk ? { key: `${companionTalk.key}:${companionTalk.at}`, start: nowSeconds() } : null;
  }, [companionTalk]);
  useEffect(() => {
    stamps.current.spru = spruImage === "jump" ? { key: "jump", start: nowSeconds() } : null;
  }, [spruImage]);
  useEffect(() => {
    stamps.current.veil = veilFading ? { key: "veil", start: nowSeconds() } : null;
  }, [veilFading]);

  // Canvasの大きさ(表示の幅 × 画面の密度。幅の上限あり)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const cssWidth = canvas.clientWidth;
      if (cssWidth === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.min(Math.round(cssWidth * dpr), MAX_WIDTH_PX);
      setSize((old) => (old && old.width === width ? old : { width, scale: width / modelRef.current.vb.width }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // 描く道具(Canvasの大きさが決まったときに作る)
  const toolsRef = useRef<{
    ctx: CanvasRenderingContext2D;
    apply: (c: CanvasRenderingContext2D) => void;
    groundEnv: DrawEnv;
    objectEnv: ObjectEnv;
    width: number;
  } | null>(null);

  function draw() {
    const tools = toolsRef.current;
    const l = layers.current;
    const canvas = canvasRef.current;
    if (!tools || !l || !canvas) return;
    const { ctx, apply, objectEnv } = tools;
    const m = modelRef.current;
    const t = nowSeconds();
    const isReduced = reduced.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(l.glow, 0, 0);
    apply(ctx);
    drawFoam(ctx, m, isReduced ? 0.55 : foamOpacity(t));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(l.land, 0, 0);
    apply(ctx);
    const since = (stamp: Stamp | null) => (stamp ? t - stamp.start : null);
    const motion: Motion = {
      t,
      quiet: quietRef.current || isReduced,
      reduced: isReduced,
      popped: stamps.current.pop ? { itemId: Number(stamps.current.pop.key), elapsed: t - stamps.current.pop.start } : null,
      companionHop: stamps.current.hop ? { key: String(stamps.current.hop.key).split(":")[0], elapsed: t - stamps.current.hop.start } : null,
      spruHop: isReduced ? null : since(stamps.current.spru),
      veilClear: since(stamps.current.veil),
    };
    drawObjectsLayer(ctx, objectEnv, m, motion);
  }
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  // Canvasの大きさと道具
  useEffect(() => {
    const canvas = canvasRef.current;
    const cache = cacheRef.current;
    if (!canvas || !cache || !size) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { vb } = modelRef.current;
    const scale = size.scale;
    const height = Math.ceil(vb.height * scale);
    canvas.width = size.width;
    canvas.height = height;
    const apply = (c: CanvasRenderingContext2D) => c.setTransform(scale, 0, 0, scale, -vb.x * scale, -vb.y * scale);
    const image = (src: string) => cache.get(src);
    dimCache.current.clear();
    const dimImage = (src: string) => {
      const found = dimCache.current.get(src);
      if (found) return found;
      const original = cache.get(src);
      if (!original) return null;
      const d = dimmed(original);
      dimCache.current.set(src, d);
      return d;
    };
    const layer = () => {
      const c = document.createElement("canvas");
      c.width = size.width;
      c.height = height;
      const g = c.getContext("2d")!;
      apply(g);
      return g;
    };
    toolsRef.current = { ctx, apply, groundEnv: { scale, layer, image }, objectEnv: { image, dimImage }, width: size.width };
    layers.current = null;
    reduced.current = prefersReducedMotion();
    setVersion((v) => v + 1);
    return () => {
      toolsRef.current = null;
    };
  }, [size]);

  // 動かない層。鍵(地面の中身・読めた画像の数・大きさ)が変わったときだけ作り直す
  useEffect(() => {
    const tools = toolsRef.current;
    const cache = cacheRef.current;
    if (!tools || !cache) return;
    const layerKey = `${groundKey}|${cache.loaded()}|${tools.width}`;
    if (layers.current?.key === layerKey) return;
    const glow = tools.groundEnv.layer();
    drawShoreGlow(glow, tools.groundEnv, modelRef.current);
    const land = tools.groundEnv.layer();
    drawLand(land, tools.groundEnv, modelRef.current);
    layers.current = { key: layerKey, glow: glow.canvas, land: land.canvas };
    if (reduced.current) drawRef.current();
  }, [groundKey, version, size]);

  // 動く物のために、毎フレーム描く。動きを減らす設定のときは、変わったとき(下の effect)だけ描く
  useEffect(() => {
    if (!size || reduced.current) return;
    let frame = 0;
    const loop = () => {
      drawRef.current();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [size]);

  useEffect(() => {
    if (reduced.current) drawRef.current();
  }, [model, quiet, size, version]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
