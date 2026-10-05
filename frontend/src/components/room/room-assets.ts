// tools/room-assets/make_room.py が書き出す(手で直さない)。設計書 docs/design/2026-10-05-spru-room-design.md 3章
export type RoomAsset = { src: string; x: number; y: number; width: number; height: number; outWidth: number; outHeight: number };

export const ROOM_ASSETS = {
  room: {"src": "/spru/room/room.webp", "x": 106, "y": 196, "width": 1067, "height": 916, "outWidth": 1024, "outHeight": 879},
  bed: {"src": "/spru/room/bed.webp", "x": 140, "y": 226, "width": 1010, "height": 841, "outWidth": 512, "outHeight": 426},
  bed_sleeping: {"src": "/spru/room/bed_sleeping.webp", "x": 76, "y": 170, "width": 1143, "height": 1008, "outWidth": 512, "outHeight": 452},
  table: {"src": "/spru/room/table.webp", "x": 166, "y": 222, "width": 924, "height": 853, "outWidth": 512, "outHeight": 473},
  chair: {"src": "/spru/room/chair.webp", "x": 311, "y": 216, "width": 671, "height": 861, "outWidth": 399, "outHeight": 512},
  spru_idle: {"src": "/spru/room/spru_idle.webp", "x": 404, "y": 181, "width": 563, "height": 909, "outWidth": 238, "outHeight": 384},
  spru_wave: {"src": "/spru/room/spru_wave.webp", "x": 334, "y": 121, "width": 703, "height": 1033, "outWidth": 261, "outHeight": 384},
  spru_sit: {"src": "/spru/room/spru_sit.webp", "x": 390, "y": 234, "width": 611, "height": 916, "outWidth": 256, "outHeight": 384},
} as const satisfies Record<string, RoomAsset>;

export type RoomAssetKey = keyof typeof ROOM_ASSETS;
