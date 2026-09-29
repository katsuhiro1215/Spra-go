import { SPRU_ITEMS, type SpruImage } from "@/components/spru/spru-assets";

import { HALF_W } from "./iso";
import { IMAGE_LIGHTS, ITEM_IMAGE_FIT, type ImageLight, type ItemImageFit } from "./item-image-fit";

/** 画像の置き場所(SVGの単位。原点=マスの中心、2×2は4マスの真ん中) */
export type ImagePlacement = { x: number; y: number; width: number; height: number };

// 設計書 2026-09-28-town-items 7-2: 幅は 画像の幅(px)×0.225(256pxが1マスの幅の0.9=57.6)。
// 画像の下の真ん中を原点から 足元のマスの数×8 だけ手前に置く
const UNIT_PER_PX = (HALF_W * 2 * 0.9) / 256;
const DROP = 8;

export function imagePlacement(
  image: { width: number; height: number },
  footprint: number,
  fit: ItemImageFit = {},
): ImagePlacement {
  const width = image.width * UNIT_PER_PX * (fit.scale ?? 1);
  const height = (width * image.height) / image.width;
  const bottom = footprint * DROP + (fit.dy ?? 0);
  return { x: -width / 2 + (fit.dx ?? 0), y: bottom - height, width, height };
}

/** その絵の画像。まだ無ければ null(プレゼント箱で描く) */
export function itemImage(
  key: string | null,
  images: Record<string, SpruImage | undefined> = SPRU_ITEMS as Record<string, SpruImage | undefined>,
): SpruImage | null {
  return (key !== null && images[key]) || null;
}

/** 小さな絵(ItemIcon)で見せる範囲。画像の範囲に余白を足した正方形 */
export function iconViewBox(p: ImagePlacement, pad = 4): string {
  const side = Math.max(p.width, p.height) + pad * 2;
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  return [cx - side / 2, cy - side / 2, side, side].map((n) => Math.round(n * 100) / 100).join(" ");
}

/** 夜の光の輪(設計書7-3)。画像の中の割合の位置を、置き場所に合わせてSVGの位置(原点=マスの中心)にする。明かり・画像がなければ空 */
export function lightCircles(
  key: string | null,
  footprint: number,
  images: Record<string, SpruImage | undefined> = SPRU_ITEMS as Record<string, SpruImage | undefined>,
  lights: Partial<Record<string, ImageLight[]>> = IMAGE_LIGHTS,
  fits: Partial<Record<string, ItemImageFit>> = ITEM_IMAGE_FIT,
): { cx: number; cy: number; r: number }[] {
  const image = itemImage(key, images);
  const spots = key === null ? undefined : lights[key];
  if (!image || !spots || key === null) return [];
  const p = imagePlacement(image, footprint, fits[key]);
  return spots.map((spot) => ({ cx: p.x + spot.x * p.width, cy: p.y + spot.y * p.height, r: spot.r }));
}
