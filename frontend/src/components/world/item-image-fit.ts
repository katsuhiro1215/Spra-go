/** 画像のアイテム・目印の物ごとの調整(設計書 2026-09-28-town-items 7-2)。scale は大きさの倍率、dx・dy はずらす量(SVGの単位)。必要な物だけ書く */
export type ItemImageFit = { scale?: number; dx?: number; dy?: number };

export const ITEM_IMAGE_FIT: Partial<Record<string, ItemImageFit>> = {};

/** 夜の明かりの光の輪(設計書7-3)。x・y は画像の左上からの割合(0〜1)、r は半径(SVGの単位) */
export type ImageLight = { x: number; y: number; r: number };

/** 光る物の明かり。アイテムも目印も同じキーで書く(石灯籠は両方で使う) */
export const IMAGE_LIGHTS: Partial<Record<string, ImageLight[]>> = {};
