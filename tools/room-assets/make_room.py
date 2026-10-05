#!/usr/bin/env python3
"""スプルの家の中(見るだけの部屋)の絵を、透明な余白を詰めてWebPにし、配置に使う一覧を書き出す。

使い方(リポジトリ直下で): python3 tools/room-assets/make_room.py ../../company/spra/spra-world/assets

- 設計書: docs/design/2026-10-05-spru-room-design.md 3章
- 出力: frontend/public/spru/room/{キー}.webp と frontend/src/components/room/room-assets.ts(手で直さない)
- 配置は、元の1254×1254の座標で決める。一覧には、余白を詰めた範囲の元の絵の中の位置・大きさ(x・y・width・height)と、
  書き出したWebPの大きさ(outWidth・outHeight)を入れる
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/spru/room"
TS_OUT = ROOT / "frontend/src/components/room/room-assets.ts"
ALPHA = 24  # 余白を詰めるときの透明度のしきい値

# キー → (spra-worldのassetsからの相対, 長い方の辺の大きさ)
SOURCES = {
    "room": ("approved/interior/spru_house_room_01.png", 1024),
    "bed": ("approved/furniture/spru_bed_01.png", 512),
    "bed_sleeping": ("approved/state/spru_bed_sleeping_01.png", 512),
    "table": ("approved/furniture/spru_table_01.png", 512),
    "chair": ("approved/furniture/spru_chair_01.png", 512),
    "spru_idle": ("approved/mascot/spru/idle/spru_idle_lower_left_01.png", 384),
    "spru_wave": ("approved/mascot/spru/actions/spru_wave_lower_left_01.png", 384),
    "spru_sit": ("approved/mascot/spru/actions/spru_sit_lower_left_01.png", 384),
}


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 tools/room-assets/make_room.py <spra-worldのassetsのフォルダ>")
    assets = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    entries = {}
    total = 0
    for key, (rel, side) in SOURCES.items():
        img = Image.open(assets / rel).convert("RGBA")
        box = img.getchannel("A").point(lambda v: 255 if v > ALPHA else 0).getbbox()
        crop = img.crop(box)
        scale = side / max(crop.size)
        out_img = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
        path = OUT / f"{key}.webp"
        out_img.save(path, "WEBP", quality=88)
        total += path.stat().st_size
        entries[key] = {
            "src": f"/spru/room/{key}.webp",
            "x": box[0], "y": box[1], "width": box[2] - box[0], "height": box[3] - box[1],
            "outWidth": out_img.width, "outHeight": out_img.height,
        }
        print(f"{key}: {out_img.width}x{out_img.height} {path.stat().st_size // 1024}KB")
    print(f"合計 {total // 1024}KB")
    body = ",\n".join(f"  {k}: {json.dumps(v)}" for k, v in entries.items())
    TS_OUT.write_text(
        "// tools/room-assets/make_room.py が書き出す(手で直さない)。設計書 docs/design/2026-10-05-spru-room-design.md 3章\n"
        "export type RoomAsset = { src: string; x: number; y: number; width: number; height: number; outWidth: number; outHeight: number };\n\n"
        f"export const ROOM_ASSETS = {{\n{body},\n}} as const satisfies Record<string, RoomAsset>;\n\n"
        "export type RoomAssetKey = keyof typeof ROOM_ASSETS;\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
