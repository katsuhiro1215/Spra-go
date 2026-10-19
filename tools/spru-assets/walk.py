#!/usr/bin/env python3
"""町で歩くスプルの絵(4方向×3コマ)を、素材集から書き出す。

使い方(リポジトリ直下で): python3 tools/spru-assets/walk.py ../../company/spra/mascot/assets/walk

- 元の絵は、Spra Worldの試作(showcases/spraworldsample/assets/)と同じ12枚(640×800・透明)。company/spra/mascot/assets/walk/ に原本を置く
- 12枚は、同じ大きさの枠に、足元をそろえて描かれている。12枚の不透明な範囲を重ねた1つの四角で、全部を同じように切り抜き、同じ縮尺で縮める
  (コマごとに切り抜くと、足元がずれて、歩くたびに跳ねて見える)
- 出力: frontend/public/spru/walk/{向き}_{コマ}.webp と、画面側が読む frontend/src/components/spru/spru-walk.ts(手で直さない)
- 向き: lower_left(左下)・lower_right(右下)・upper_left(左上)・upper_right(右上)。コマ: passing(足をそろえた形)・step_l・step_r
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/spru/walk"
TS_OUT = ROOT / "frontend/src/components/spru/spru-walk.ts"
DIRECTIONS = ["lower_left", "lower_right", "upper_left", "upper_right"]
FRAMES = ["passing", "step_l", "step_r"]
ALPHA = 128  # これより不透明な所を、本体とみなす
PAD = 4
HEIGHT = 200  # 出力の高さ(px)。町のスプルの立ち姿(front 214px)と同じ細かさ


def main(src: Path) -> None:
    images = {f"{d}_{f}": Image.open(src / f"{d}_{f}.png").convert("RGBA") for d in DIRECTIONS for f in FRAMES}
    left = top = 10**9
    right = bottom = 0
    for im in images.values():
        box = im.split()[3].point(lambda v: 255 if v > ALPHA else 0).getbbox()
        left, top, right, bottom = min(left, box[0]), min(top, box[1]), max(right, box[2]), max(bottom, box[3])
    box = (max(left - PAD, 0), max(top - PAD, 0), right + PAD, bottom + PAD)
    width = round((box[2] - box[0]) * HEIGHT / (box[3] - box[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    for key, im in images.items():
        im.crop(box).resize((width, HEIGHT), Image.LANCZOS).save(OUT / f"{key}.webp", "WEBP", quality=88, method=6)
    lines = [
        "// このファイルは tools/spru-assets/walk.py が書き出す。手で直さない",
        "export type WalkDirection = " + " | ".join(f'"{d}"' for d in DIRECTIONS) + ";",
        "export type WalkFrame = " + " | ".join(f'"{f}"' for f in FRAMES) + ";",
        "",
        "/** 歩くスプルの絵の大きさ。12枚とも同じ大きさで、足元は下の真ん中 */",
        f"export const SPRU_WALK_SIZE = {{ width: {width}, height: {HEIGHT} }} as const;",
        "",
        "export const SPRU_WALK: Record<`${WalkDirection}_${WalkFrame}`, string> = {",
    ]
    lines += [f'  "{key}": "/spru/walk/{key}.webp",' for key in images]
    lines.append("};")
    TS_OUT.write_text("\n".join(lines) + "\n")
    print(f"{len(images)}枚 {width}x{HEIGHT} 切り抜き {box}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
