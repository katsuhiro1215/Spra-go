import type { CloudDraw } from "./scene-model";

type Ctx = CanvasRenderingContext2D;

/**
 * 閉じた区画をおおう雲(区画の形で切り取り、マスに1つおきの丸を重ねる)。
 * 閉じた区画の雲は動かないので、地面の層に描いて保存する(docs/design/2026-10-19-town-land-design.md 5章)。
 * 開いた直後に晴れる雲だけ、動く層で transform つきで描く
 */
export function drawClouds(ctx: Ctx, clouds: CloudDraw[], transform?: { opacity: number; dy: number; scale: number }) {
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
