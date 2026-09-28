/** 画像のアイテム・目印の物ごとの調整(設計書 2026-09-28-town-items 7-2)。scale は大きさの倍率、dx・dy はずらす量(SVGの単位)。必要な物だけ書く */
export type ItemImageFit = { scale?: number; dx?: number; dy?: number };

export const ITEM_IMAGE_FIT: Partial<Record<string, ItemImageFit>> = {};

/** 画像の目印の、夜の明かりの光の輪(設計書7-3。原点=マスの中心)。画像を取り込んだら位置を測って書く */
export const LANDMARK_LIGHTS: Partial<Record<string, { cx: number; cy: number; r: number }[]>> = {};
