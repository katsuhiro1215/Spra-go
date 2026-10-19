import { GROUND_DECALS } from "../ground-art";
import { HALF_H, HALF_W, LAND_THICKNESS, tileCenter } from "../iso";
import { BLEND_FALLBACK, SOIL } from "./palette";
import { drawClouds } from "./draw-clouds";
import { CLIFF_SRC, type GroundModel, type SceneModel } from "./scene-model";

/**
 * 動かない層の描き方(docs/design/2026-10-19-town-canvas-design.md 5・6章)。座標はSVGの単位。
 * 波の縁(アニメーション)だけは毎フレーム drawFoam で描くので、地面の層は「波の縁の下(drawShoreGlow)」と「波の縁の上(drawLand)」に分ける。
 * ctx.filter(Safariで使えない)は使わず、ぼかしは shadowBlur で、夜の暗さは色を暗くして出す
 */

export type DrawEnv = {
  /** 1単位あたりの画面のピクセル数(表示の倍率 × 画面の密度) */
  scale: number;
  /** 同じ大きさ・同じ座標の、作業用の層(ぼかし・切り抜き用)を作る */
  layer: () => CanvasRenderingContext2D;
  image: (src: string) => CanvasImageSource | null;
};

type Ctx = CanvasRenderingContext2D;

const SHADOW_FAR = 20000; // 影だけを見せるために、図形を遠くへ置く距離(単位)

/** "#rrggbb" を factor 倍に暗くする(波の縁の、夜の暗さ。brightness の代わり) */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * factor).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

function tilePath(path: Path2D | Ctx, x: number, y: number) {
  const { sx, sy } = tileCenter(x, y);
  path.moveTo(sx, sy - HALF_H);
  path.lineTo(sx + HALF_W, sy);
  path.lineTo(sx, sy + HALF_H);
  path.lineTo(sx - HALF_W, sy);
  path.closePath();
}

function polyPath(path: Path2D | Ctx, points: [number, number][]) {
  points.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  path.closePath();
}

/** 絵を、SVGの pattern(patternMatrix)と同じ変形で貼る。真上から見た絵(size px)を、4×4マスの菱形に変形する */
function groundPattern(ctx: Ctx, image: CanvasImageSource, size: number): CanvasPattern | null {
  const pattern = ctx.createPattern(image, "repeat");
  if (!pattern) return null;
  const a = (4 * HALF_W) / size;
  const b = (4 * HALF_H) / size;
  pattern.setTransform(new DOMMatrix([a, b, -a, b, 0, 0]));
  return pattern;
}

/** ぼかした図形を描く(shadowBlur。図形そのものは遠くに置き、影だけを見せる)。sigma は単位 */
function blurred(ctx: Ctx, env: DrawEnv, sigma: number, color: string, draw: (c: Ctx) => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = sigma * 2 * env.scale;
  ctx.shadowOffsetX = SHADOW_FAR * env.scale;
  ctx.translate(-SHADOW_FAR, 0);
  draw(ctx);
  ctx.restore();
}

/** 波の縁の下の、水色のにじみ(動かない) */
export function drawShoreGlow(ctx: Ctx, env: DrawEnv, model: SceneModel) {
  const dim = model.theme.dimObjects;
  const path = new Path2D(model.ground.shorePath);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.lineJoin = "round";
  ctx.lineWidth = 44;
  blurred(ctx, env, 7, dim ? shade("#8fe3f0", 0.6) : "#8fe3f0", (c) => {
    c.strokeStyle = "#000";
    c.stroke(path);
  });
  ctx.restore();
}

/** 波の縁(白い線)。ゆっくり濃くなったり薄くなったりするので、毎フレーム描く */
export function drawFoam(ctx: Ctx, model: SceneModel, opacity: number) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = model.theme.dimObjects ? shade("#e9fbff", 0.6) : "#e9fbff";
  ctx.lineWidth = 9;
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(model.ground.shorePath));
  ctx.restore();
}

function cliffPattern(ctx: Ctx, image: CanvasImageSource, side: "left" | "right"): CanvasPattern | null {
  // 128×32の1枚(縦は1マスの段差ぶん)を、2倍の細かさで作る。SVGの pattern と同じ貼り方
  const tile = document.createElement("canvas");
  tile.width = 256;
  tile.height = 64;
  const t = tile.getContext("2d");
  if (!t) return null;
  t.scale(2, 2);
  if (side === "left") t.drawImage(image, 0, 0, 128, 64);
  else {
    t.drawImage(image, -48, 0, 128, 64);
    t.drawImage(image, 80, 0, 128, 64);
  }
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return null;
  pattern.setTransform(new DOMMatrix([1, side === "left" ? 0.5 : -0.5, 0, 1, 0, 0]).scale(0.5));
  return pattern;
}

function leftFace(path: Path2D, sx: number, sy: number, depth: number) {
  path.moveTo(sx - HALF_W, sy);
  path.lineTo(sx, sy + HALF_H);
  path.lineTo(sx, sy + HALF_H + depth);
  path.lineTo(sx - HALF_W, sy + depth);
  path.closePath();
}

function rightFace(path: Path2D, sx: number, sy: number, depth: number) {
  path.moveTo(sx, sy + HALF_H);
  path.lineTo(sx + HALF_W, sy);
  path.lineTo(sx + HALF_W, sy + depth);
  path.lineTo(sx, sy + HALF_H + depth);
  path.closePath();
}

function drawCliffs(ctx: Ctx, env: DrawEnv, ground: GroundModel) {
  const cliff = env.image(CLIFF_SRC);
  const left = cliff ? cliffPattern(ctx, cliff, "left") : null;
  const right = cliff ? cliffPattern(ctx, cliff, "right") : null;
  ctx.lineWidth = 0.4;
  for (const { sx, sy } of ground.edgesLeft) {
    const face = new Path2D();
    leftFace(face, sx, sy, LAND_THICKNESS);
    ctx.fillStyle = left ?? SOIL.left;
    ctx.fill(face);
    ctx.strokeStyle = SOIL.left;
    ctx.stroke(face);
  }
  for (const { sx, sy } of ground.edgesRight) {
    const face = new Path2D();
    rightFace(face, sx, sy, LAND_THICKNESS);
    ctx.fillStyle = right ?? SOIL.right;
    ctx.fill(face);
    ctx.strokeStyle = SOIL.right;
    ctx.stroke(face);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#2a1a0c";
    ctx.fill(face);
    ctx.globalAlpha = 1;
  }
}

function drawPaths(ctx: Ctx, env: DrawEnv, ground: GroundModel) {
  if (ground.pathTiles.length === 0) return;
  const art = ground.road ? env.image(ground.road.src) : null;
  const fill = art && ground.road ? groundPattern(ctx, art, ground.road.size) : null;
  const tiles = new Path2D();
  for (const [x, y] of ground.pathTiles) tilePath(tiles, x, y);
  ctx.fillStyle = fill ?? ground.pathColor;
  ctx.fill(tiles);
  if (fill) {
    // 道のマスの間に隙間の線が出ないよう、同じ絵でふちを1だけ太らせる
    ctx.strokeStyle = fill;
    ctx.lineWidth = 1;
    ctx.stroke(tiles);
  }
  if (ground.pathLines.length === 0) return;
  const lines = new Path2D(ground.pathLines.join(" "));
  const { edge, marks } = ground;
  ctx.lineJoin = "round";
  if (edge.band) {
    ctx.save();
    ctx.clip(tiles);
    ctx.strokeStyle = edge.band;
    ctx.lineWidth = edge.bandWidth * 2;
    ctx.lineCap = "round";
    ctx.stroke(lines);
    ctx.restore();
  }
  if (marks) {
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = "#fffdf5";
    ctx.lineCap = "butt";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.4;
    ctx.stroke(new Path2D(marks.center.join(" ")));
    ctx.setLineDash([]);
    ctx.lineWidth = 1.8;
    ctx.stroke(new Path2D(marks.crossings.join(" ")));
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = edge.lineOpacity;
  ctx.strokeStyle = edge.line;
  ctx.lineWidth = edge.lineWidth;
  ctx.lineCap = "round";
  ctx.stroke(lines);
  ctx.restore();
}

/** 池: まわりが開いた陸でかこまれた水を、陸の中の池として描く(岸・水・ゆれる光・はす。座標から決まる、毎回同じ絵) */
// マスの角(u, v)の座標。マス(x, y)の奥の角が(x, y)
const corner = (u: number, v: number): [number, number] => [(u - v) * HALF_W, (u + v) * HALF_H];

/** 池のまわりの線だけ(池のマスどうしの境は引かない。マスの継ぎ目が線に見えないように) */
function pondOutline(ponds: [number, number][]): Path2D {
  const has = new Set(ponds.map(([x, y]) => `${x},${y}`));
  const outline = new Path2D();
  for (const [x, y] of ponds) {
    const sides: [number, number, [number, number], [number, number]][] = [
      [x, y - 1, corner(x, y), corner(x + 1, y)],
      [x + 1, y, corner(x + 1, y), corner(x + 1, y + 1)],
      [x, y + 1, corner(x + 1, y + 1), corner(x, y + 1)],
      [x - 1, y, corner(x, y + 1), corner(x, y)],
    ];
    for (const [nx, ny, from, to] of sides) {
      if (has.has(`${nx},${ny}`)) continue;
      outline.moveTo(from[0], from[1]);
      outline.lineTo(to[0], to[1]);
    }
  }
  return outline;
}

function drawPonds(ctx: Ctx, ground: GroundModel) {
  if (ground.ponds.length === 0) return;
  const shape = new Path2D();
  for (const [x, y] of ground.ponds) tilePath(shape, x, y);
  const outline = pondOutline(ground.ponds);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ground.ponds) {
    const { sx, sy } = tileCenter(x, y);
    minX = Math.min(minX, sx - HALF_W);
    maxX = Math.max(maxX, sx + HALF_W);
    minY = Math.min(minY, sy - HALF_H);
    maxY = Math.max(maxY, sy + HALF_H);
  }
  ctx.save();
  ctx.lineJoin = "round";
  // 岸(土の色の外側の縁)→ 水(深い青緑から、明るい水色へ)→ 水ぎわの明るい線
  ctx.strokeStyle = "#d0c89c";
  ctx.lineWidth = 7;
  ctx.stroke(outline);
  const water = ctx.createLinearGradient(minX, minY, maxX, maxY);
  water.addColorStop(0, "#438f88");
  water.addColorStop(0.45, "#4caeaa");
  water.addColorStop(1, "#8dd0b5");
  ctx.fillStyle = water;
  ctx.fill(shape);
  // マスの継ぎ目に、すきまの線が出ないよう、同じ水の色でふちを太らせる
  ctx.strokeStyle = water;
  ctx.lineWidth = 1;
  ctx.stroke(shape);
  ctx.strokeStyle = "#dce3ae";
  ctx.lineWidth = 2;
  ctx.stroke(outline);
  // ゆれる光とはす(マスの座標から決まる位置)
  ctx.clip(shape);
  for (const [x, y] of ground.ponds) {
    const { sx, sy } = tileCenter(x, y);
    const h = Math.imul(x + 31, 73856093) ^ Math.imul(y + 17, 19349663);
    const a = (h >>> 0) % 100;
    ctx.strokeStyle = "rgba(217,250,224,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(sx + ((a + i * 37) % 30) - 15, sy + ((a + i * 23) % 14) - 7, 10 + i * 6, 2.5, 0, 0.15, 2.6);
      ctx.stroke();
    }
    if (a % 3 === 0) {
      ctx.fillStyle = "#87ae66";
      ctx.beginPath();
      ctx.ellipse(sx + (a % 20) - 10, sy + (a % 10) - 5, 7, 3.2, 0, 0.2, 6.1);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 林・花畑: 地面の絵を、ぼかしたマスの形で切り抜いて重ねる */
function drawBlend(ctx: Ctx, env: DrawEnv, model: SceneModel) {
  for (const layer of model.ground.blend) {
    const fill = env.layer();
    const art = layer.art ? env.image(layer.art.src) : null;
    const pattern = art && layer.art ? groundPattern(fill, art, layer.art.size) : null;
    const fallback = BLEND_FALLBACK[layer.kind];
    const { vb } = model;
    fill.globalAlpha = pattern ? 1 : fallback.opacity;
    fill.fillStyle = pattern ?? fallback.color;
    fill.fillRect(vb.x, vb.y, vb.width, vb.height);
    fill.globalAlpha = 1;

    const mask = env.layer();
    const cells = new Path2D();
    for (const [x, y] of layer.cells) tilePath(cells, x, y);
    blurred(mask, env, 3, "#fff", (c) => {
      c.fillStyle = "#000";
      c.fill(cells);
    });

    fill.save();
    fill.setTransform(1, 0, 0, 1, 0, 0);
    fill.globalCompositeOperation = "destination-in";
    fill.drawImage(mask.canvas, 0, 0);
    fill.restore();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fill.canvas, 0, 0);
    ctx.restore();
  }
}

function drawDecals(ctx: Ctx, env: DrawEnv, ground: GroundModel) {
  for (const { x, y, kind, dx, dy } of ground.decals) {
    const decal = GROUND_DECALS[kind];
    const image = env.image(decal.src);
    if (!image) continue;
    const { sx, sy } = tileCenter(x, y);
    // 草・石などは、立てて(つぶさずに)小さく置く。足元がマスの中心にくる
    const width = 20;
    const height = (width * decal.height) / decal.width;
    ctx.drawImage(image, sx + dx - width / 2, sy + dy - height * 0.8, width, height);
  }
}

/** 波の縁の上に重ねる、動かない地面の層(崖・地面・道・林・小物・夜の色) */
export function drawLand(ctx: Ctx, env: DrawEnv, model: SceneModel) {
  const { ground, theme } = model;
  drawCliffs(ctx, env, ground);

  // 区画の地面の絵(海のマスは陸の形で切り抜く)
  ctx.save();
  ctx.clip(new Path2D(ground.landPath));
  for (const plot of ground.plots) {
    const image = env.image(plot.art.src);
    const pattern = image ? groundPattern(ctx, image, plot.art.size) : null;
    if (!pattern) continue;
    const shape = new Path2D();
    polyPath(shape, plot.points);
    ctx.fillStyle = pattern;
    ctx.fill(shape);
  }
  ctx.restore();

  drawPonds(ctx, ground);

  for (const tile of ground.checker) {
    const path = new Path2D();
    tilePath(path, tile.x, tile.y);
    ctx.fillStyle = tile.color;
    ctx.fill(path);
  }

  drawPaths(ctx, env, ground);
  drawBlend(ctx, env, model);
  drawDecals(ctx, env, ground);

  if (theme.groundTint) {
    // 側面と陸の形を、まず1枚に塗り(重なる所は1回だけ)、あとから薄く重ねる。SVGの <g opacity> と同じ
    const tint = env.layer();
    tint.fillStyle = theme.groundTint.color;
    const faces = new Path2D();
    for (const { sx, sy } of ground.edgesLeft) leftFace(faces, sx, sy, LAND_THICKNESS);
    for (const { sx, sy } of ground.edgesRight) rightFace(faces, sx, sy, LAND_THICKNESS);
    tint.fill(faces);
    tint.save();
    tint.clip(new Path2D(ground.landPath));
    const shapes = new Path2D();
    for (const points of ground.plotShapes) polyPath(shapes, points);
    tint.fill(shapes);
    tint.restore();
    // 池にも、夜の色を重ねる
    const ponds = new Path2D();
    for (const [x, y] of ground.ponds) tilePath(ponds, x, y);
    tint.fill(ponds);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = theme.groundTint.opacity;
    ctx.drawImage(tint.canvas, 0, 0);
    ctx.restore();
  }

  // 閉じた区画の雲(動かないので、ここに保存する)。物より先に描く順は、今までと同じ
  drawClouds(ctx, model.clouds);
}
