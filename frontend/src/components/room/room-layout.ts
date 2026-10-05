import { ROOM_ASSETS, type RoomAssetKey } from "./room-assets";
import type { RoomMode, RoomSpruPose } from "./room-state";

/**
 * スプルの家の中の配置(設計書 2026-10-05-spru-room 4章)。
 * 座標は、元の絵の1254×1254。各物は、足元の中心(cx, bottom)と倍率(scale)で置く。数字は、試作の合成で決めた初期値
 */
export const ROOM_CANVAS = 1254;

/** 画面に見せる範囲(部屋の絵とすべての物が入る) */
export const ROOM_VIEW = { x: 80, y: 120, width: 1120, height: 1020 };

/** 夜に光らせる丸窓(部屋の絵の右奥)の位置と半径(元の絵の座標) */
export const ROOM_WINDOW = { cx: 944, cy: 462, r: 90 };

type Place = { scale: number; cx: number; bottom: number };

const PLACES = {
  bed: { scale: 0.34, cx: 900, bottom: 820 },
  bed_sleeping: { scale: 0.3, cx: 900, bottom: 820 },
  table: { scale: 0.27, cx: 560, bottom: 920 },
  chair: { scale: 0.19, cx: 430, bottom: 1000 },
} satisfies Partial<Record<RoomAssetKey, Place>>;

// スプルは、足元の中心を同じにして、ポーズごとの大きさのずれ(Spra-worldの正規化の倍率)を合わせる
const SPRU_BASE = { scale: 0.2, cx: 700, bottom: 1040 };
const SPRU_POSE_FACTOR: Record<RoomSpruPose, number> = { idle: 1, wave: 0.87961, sit: 0.95464 };
const SPRU_KEY: Record<RoomSpruPose, RoomAssetKey> = { idle: "spru_idle", wave: "spru_wave", sit: "spru_sit" };

export type RoomItem = { key: RoomAssetKey; left: number; top: number; width: number; height: number };

function place(key: RoomAssetKey, p: Place): RoomItem {
  const asset = ROOM_ASSETS[key];
  const width = asset.width * p.scale;
  const height = asset.height * p.scale;
  return { key, left: p.cx - width / 2, top: p.bottom - height, width, height };
}

/** 奥から手前の順に描く物。夜は、空のベッドの代わりに眠るスプル入りのベッドで、起きているスプルは出ない */
export function roomItems(mode: RoomMode, pose: RoomSpruPose): RoomItem[] {
  const room = ROOM_ASSETS.room;
  const items: RoomItem[] = [
    { key: "room", left: room.x, top: room.y, width: room.width, height: room.height },
    mode === "night" ? place("bed_sleeping", PLACES.bed_sleeping) : place("bed", PLACES.bed),
    place("table", PLACES.table),
    place("chair", PLACES.chair),
  ];
  if (mode === "day") {
    items.push(place(SPRU_KEY[pose], { ...SPRU_BASE, scale: SPRU_BASE.scale * SPRU_POSE_FACTOR[pose] }));
  }
  return items;
}
