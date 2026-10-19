#!/usr/bin/env python3
"""4棟を1枚にしたシート(2×2配置)を、1棟ずつの透明PNGに切り分け、縁のにじみ(黄色〜オレンジのふち)を取り除く。

使い方(リポジトリ直下で):
  4棟のシート: python3 tools/spru-assets/split_set.py <シート.png> <出力フォルダ> 左上 右上 左下 右下
  1棟ずつの絵(フォルダの中の全部): python3 tools/spru-assets/split_set.py --single <入力フォルダ> <出力フォルダ>
    (入力は、`fire-station.png` のように、ハイフンの名前。出力は `fire_station.png` に直す)
  例: python3 tools/spru-assets/split_set.py ../../company/spra/spra-go/town-set.png ../../company/spra/spra-go/town-shops bakery fish_shop greengrocer meat_shop

- 背景を抜いたときの半透明の縁を、不透明度のしきい値と1ピクセルの縮めで取り除き、縁をなめらかにする
- 出力は、余白をつめない(絵の置き場所は extract.py が決める)。1棟1ファイル {名前}.png
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter

CUT = 150  # これより薄い縁は消す
GROW = 1  # 不透明な所を、さらに縮めるピクセル数(にじみの外側を落とす)


def clean(cell: Image.Image) -> Image.Image:
    alpha = cell.split()[3].point(lambda v: 0 if v < CUT else 255)
    for _ in range(GROW):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    out = cell.copy()
    out.putalpha(alpha)
    return out


def main(sheet: Path, out: Path, names: list[str]) -> None:
    im = Image.open(sheet).convert("RGBA")
    half_w, half_h = im.width // 2, im.height // 2
    boxes = [(0, 0), (half_w, 0), (0, half_h), (half_w, half_h)]
    out.mkdir(parents=True, exist_ok=True)
    for name, (ox, oy) in zip(names, boxes):
        clean(im.crop((ox, oy, ox + half_w, oy + half_h))).save(out / f"{name}.png")
        print(name)


def single(src: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for path in sorted(src.glob("*.png")):
        if path.stem in ("town-set", "town-shop-scale-compare"):
            continue
        clean(Image.open(path).convert("RGBA")).save(out / f"{path.stem.replace('-', '_')}.png")
        print(path.stem)


if __name__ == "__main__":
    if sys.argv[1] == "--single":
        single(Path(sys.argv[2]), Path(sys.argv[3]))
    else:
        main(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3:7])
