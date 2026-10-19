import { SPRU_BLOOM } from "@/components/spru/spru-assets";

import { HALF_H, HALF_W, tileCenter } from "../iso";
import { bobOffset, cloudClear, hopOffset, popState, pulseOpacity } from "./animation";
import type { CloudDraw, ObjectArt, SceneModel, SceneObject } from "./scene-model";

/**
 * 動く層の描き方(docs/design/2026-10-19-town-canvas-design.md 5・6章)。毎フレーム、奥から手前へ描く。
 * 動きは、時刻 motion.t(秒)と、できごとからの経過秒から計算する(animation.ts)
 */

type Ctx = CanvasRenderingContext2D;

export type ObjectEnv = {
  image: (src: string) => CanvasImageSource | null;
  /** 夜に、少し暗くした絵(黒を重ねたもの)。絵がなければ null */
  dimImage: (src: string) => CanvasImageSource | null;
};

export type Motion = {
  /** 動かし続ける時計(秒) */
  t: number;
  /** 静かにするとき(夜など): ゆれを止める */
  quiet: boolean;
  /** 動きを減らす設定: 光る場所の点滅も止める(CSSの `animation: none` と同じ) */
  reduced: boolean;
  /** 置いたばかりのアイテムと、置いてからの秒 */
  popped: { itemId: number; elapsed: number } | null;
  /** 跳ねている仲間と、跳ね始めてからの秒 */
  companionHop: { key: string; elapsed: number } | null;
  /** スプルが跳ねているとき、跳ね始めてからの秒 */
  spruHop: number | null;
  /** 開いたばかりの雲が晴れ始めてからの秒(まだ晴れていなければ null) */
  veilClear: number | null;
};

const SHADOW_GREEN = "#2f5d2a";

function tileShape(ctx: Ctx, x: number, y: number) {
  const { sx, sy } = tileCenter(x, y);
  ctx.beginPath();
  ctx.moveTo(sx, sy - HALF_H);
  ctx.lineTo(sx + HALF_W, sy);
  ctx.lineTo(sx, sy + HALF_H);
  ctx.lineTo(sx - HALF_W, sy);
  ctx.closePath();
}

function glowTile(ctx: Ctx, x: number, y: number, alpha: number) {
  tileShape(ctx, x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffe27a";
  ctx.fill();
  ctx.strokeStyle = "#d99a12";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, alpha: number, rotate = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotate, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function polygon(ctx: Ctx, points: [number, number][], fill: string) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// 畑の畝(garden-art.tsx と同じ形)
function drawGardenBed(ctx: Ctx, env: ObjectEnv, plant: { src: string; width: number; height: number } | null) {
  ellipse(ctx, 0, 3, 26, 10, SHADOW_GREEN, 0.14);
  polygon(ctx, [[-24, 0], [0, -12], [24, 0], [0, 12]], "#8a5a3a");
  polygon(ctx, [[-24, 0], [0, 12], [0, 15], [-24, 3]], "#6e452b");
  polygon(ctx, [[0, 12], [24, 0], [24, 3], [0, 15]], "#5c3a24");
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#6e452b";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [a, b, c, d] of [[-14, -3, 10, -15], [-8, 3, 16, -9], [-2, 9, 22, -3]]) {
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
  }
  ctx.stroke();
  ctx.restore();
  if (plant) {
    const image = env.image(plant.src);
    if (image) ctx.drawImage(image, -plant.width / 2, -plant.height + 4, plant.width, plant.height);
  }
}

function drawGift(ctx: Ctx) {
  ellipse(ctx, 0, 2, 13, 5, SHADOW_GREEN, 0.15);
  polygon(ctx, [[-12, -2], [0, 4], [0, -12], [-12, -18]], "#f2b632");
  polygon(ctx, [[0, 4], [12, -2], [12, -18], [0, -12]], "#d4960e");
  polygon(ctx, [[-12, -18], [0, -12], [12, -18], [0, -24]], "#ffd35c");
  ctx.strokeStyle = "#e5533f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -21);
  ctx.lineTo(6, -15);
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 4);
  ctx.stroke();
}

function drawFlower(ctx: Ctx, env: ObjectEnv) {
  ellipse(ctx, 0, 2, 11, 4.5, SHADOW_GREEN, 0.15);
  ctx.strokeStyle = "#5a9e3a";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.bezierCurveTo(-1.5, -8, 1.5, -14, 0, -22);
  ctx.stroke();
  ellipse(ctx, -5, -9, 5, 2.4, "#74b35d", 1, (-25 * Math.PI) / 180);
  ellipse(ctx, 5, -14, 5, 2.4, "#86c56d", 1, (25 * Math.PI) / 180);
  const image = env.image(SPRU_BLOOM.flower.src);
  if (image) ctx.drawImage(image, -11, -36, 22, 26);
}

/** アイテム・プレビューの絵(影つき)。mirrored は、足元の真ん中(原点)を軸に左右反転する */
function drawArt(ctx: Ctx, env: ObjectEnv, art: ObjectArt, mirrored: boolean, dim: boolean) {
  if (!art.image) {
    if (art.fallback === "flower") drawFlower(ctx, env);
    else drawGift(ctx);
    return;
  }
  const { placement } = art.image;
  ellipse(ctx, 0, 2, 20 * art.footprint, 8 * art.footprint, SHADOW_GREEN, 0.15);
  const image = dim ? env.dimImage(art.image.src) : env.image(art.image.src);
  if (!image) return;
  ctx.save();
  if (mirrored) ctx.scale(-1, 1);
  ctx.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  ctx.restore();
}

function drawLights(ctx: Ctx, lights: { cx: number; cy: number; r: number }[]) {
  for (const light of lights) ellipse(ctx, light.cx, light.cy, light.r, light.r, "#ffd98a", 0.5);
}

function bobbing(ctx: Ctx, dy: number, draw: () => void) {
  ctx.save();
  ctx.translate(0, dy);
  draw();
  ctx.restore();
}

function reviewMark(ctx: Ctx, x: number, y: number, motion: Motion) {
  ctx.save();
  ctx.translate(x, y + (motion.quiet ? 0 : bobOffset(motion.t, 0, 1.2)));
  ctx.fillStyle = "#f28c28";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("!", 0, 3.8);
  ctx.restore();
}

function partnerTag(ctx: Ctx) {
  ctx.save();
  ctx.translate(0, 7);
  ctx.beginPath();
  ctx.roundRect(-13, -5.5, 26, 11, 5.5);
  ctx.fillStyle = "#3b7f26";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 7.5px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("相棒", 0, 3);
  ctx.restore();
}

function sleepMark(ctx: Ctx, x: number, y: number, motion: Motion) {
  ctx.save();
  ctx.translate(x, y + (motion.quiet ? 0 : bobOffset(motion.t)));
  ctx.lineJoin = "round";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#5a4526";
  for (const [size, px, py, line] of [[12, 0, 0, 0.6], [16, 9, -9, 0.7], [20, 20, -20, 0.8]] as const) {
    ctx.font = `900 ${size}px sans-serif`;
    ctx.lineWidth = line;
    ctx.strokeText("z", px, py);
    ctx.fillText("z", px, py);
  }
  ctx.restore();
}

function drawObject(ctx: Ctx, env: ObjectEnv, model: SceneModel, o: SceneObject, motion: Motion) {
  const dim = model.theme.dimObjects;
  ctx.save();
  ctx.translate(o.sx, o.sy);
  if (o.kind === "landmark") {
    if (o.garden) drawGardenBed(ctx, env, o.garden.plant);
    else if (o.image) {
      ellipse(ctx, 0, 2, 20 * o.footprint, 8 * o.footprint, SHADOW_GREEN, 0.15);
      const image = dim ? env.dimImage(o.image.src) : env.image(o.image.src);
      const p = o.image.placement;
      if (image) ctx.drawImage(image, p.x, p.y, p.width, p.height);
    }
    drawLights(ctx, o.lights);
  } else if (o.kind === "item") {
    const pop = motion.popped && motion.popped.itemId === o.itemId ? popState(motion.popped.elapsed) : null;
    if (pop) {
      // 足元(絵の下の方)を軸に、ふくらむ
      const originY = o.image ? o.image.placement.y + o.image.placement.height * 0.9 : -10;
      ctx.translate(0, originY);
      ctx.scale(pop.scale, pop.scale);
      ctx.translate(0, -originY);
      ctx.globalAlpha = pop.opacity;
    }
    drawArt(ctx, env, o, o.mirrored, dim);
    drawLights(ctx, o.lights);
  } else if (o.kind === "companion") {
    const hopping = motion.companionHop?.key === o.key;
    const dy = hopping ? hopOffset(motion.companionHop!.elapsed) : motion.quiet ? 0 : bobOffset(motion.t, o.index * 0.5, 3.2);
    const image = env.image(o.src);
    bobbing(ctx, dy, () => {
      if (image) ctx.drawImage(image, -o.width / 2, -o.height + 2, o.width, o.height);
    });
    if (o.partner) partnerTag(ctx);
    if (o.review) reviewMark(ctx, o.width / 2 - 2, -o.height + 10, motion);
  } else {
    const dy = motion.spruHop !== null ? hopOffset(motion.spruHop) : motion.quiet ? 0 : bobOffset(motion.t);
    const x = -o.width / 2;
    const y = -o.height + 2;
    const image = env.image(o.src);
    bobbing(ctx, dy, () => {
      if (image) ctx.drawImage(image, x, y, o.width, o.height);
      if (o.bloom) {
        const bloom = env.image(o.bloom.src);
        if (bloom) ctx.drawImage(bloom, o.bloom.x, o.bloom.y, o.bloom.width, o.bloom.height);
      }
    });
    if (o.review) reviewMark(ctx, x + o.width - 4, y + 8, motion);
  }
  ctx.restore();
}

function drawClouds(ctx: Ctx, clouds: CloudDraw[], transform?: { opacity: number; dy: number; scale: number }) {
  for (const cloud of clouds) {
    ctx.save();
    const area = new Path2D();
    cloud.area.forEach(([x, y], i) => (i === 0 ? area.moveTo(x, y) : area.lineTo(x, y)));
    area.closePath();
    ctx.clip(area);
    if (transform) {
      // 雲の真ん中を軸に、消えながら上へ行って大きくなる
      const xs = cloud.puffs.map((p) => p.sx);
      const ys = cloud.puffs.map((p) => p.sy);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      ctx.globalAlpha = transform.opacity;
      ctx.translate(cx, cy + transform.dy);
      ctx.scale(transform.scale, transform.scale);
      ctx.translate(-cx, -cy);
    }
    for (const [dy, r, color] of [[4, 34, "#dfeaf2"], [-4, 33, "#ffffff"]] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const p of cloud.puffs) {
        ctx.moveTo(p.sx + r, p.sy + dy);
        ctx.arc(p.sx, p.sy + dy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  }
}

/** 動く層を、奥から手前へ描く */
export function drawObjectsLayer(ctx: Ctx, env: ObjectEnv, model: SceneModel, motion: Motion) {
  const pulse = pulseOpacity(motion.t);
  if (model.gardenGlow) glowTile(ctx, model.gardenTile[0], model.gardenTile[1], quietPulse(motion, pulse));
  for (const [x, y] of model.validTiles) glowTile(ctx, x, y, quietPulse(motion, pulse));

  if (model.preview) {
    for (const [x, y] of model.preview.tiles) {
      tileShape(ctx, x, y);
      ctx.fillStyle = "#9fd8ff";
      ctx.fill();
      ctx.strokeStyle = "#3a8fc9";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawClouds(ctx, model.clouds);

  for (const o of model.objects) drawObject(ctx, env, model, o, motion);

  if (model.sleepMark) sleepMark(ctx, model.sleepMark.sx, model.sleepMark.sy, motion);

  if (model.preview) {
    ctx.save();
    ctx.translate(model.preview.center.sx, model.preview.center.sy);
    ctx.globalAlpha = 0.6;
    drawArt(ctx, env, model.preview.item, false, false);
    ctx.restore();
  }

  if (model.veil) {
    const clear = model.veil.fading && motion.veilClear !== null ? cloudClear(motion.veilClear) : undefined;
    drawClouds(ctx, model.veil.clouds, clear);
  }
}

// 動きを減らす設定のときは、光る場所は点滅させない(CSSの動きを止めると、不透明度は1のまま)
function quietPulse(motion: Motion, pulse: number): number {
  return motion.reduced ? 1 : pulse;
}
