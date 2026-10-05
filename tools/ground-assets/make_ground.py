#!/usr/bin/env python3
"""町の地面の絵(真上から見た平らな正方形)を、つなぎ目を消して、512pxのWebPにする。

使い方(リポジトリ直下で): python3 tools/ground-assets/make_ground.py ../../company/spra/spra-world/assets

- 設計書: docs/design/2026-10-05-town-blend-design.md 3-4。依頼書: company/spra/spra-world/prompts/batches/002-ground-textures.md
- 上下左右がつながるよう、半分ずらした絵と、中央を残すぼかしマスクで合成する
- 出力: frontend/public/spru/ground/{キー}.webp。元の絵が無いキーは飛ばして、飛ばしたことを表示する
- 絵が増えたら、下の SOURCES に1行足す(足したキーは frontend/src/components/world/ground-art.ts にも足す)
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/spru/ground"
SIZE = 512
BLUR_BAND = 0.14  # 端からこの割合の帯を、ずらした絵となじませる

# キー → 素材の置き場所(company/spra/spra-world/assets からの相対)。approved/ground/ に届いた絵を足していく
SOURCES = {
    "grass_town": "source/terrain/soft_grass_01/v002.png",  # 仮(新しい絵が届くまで)
    "path": "source/terrain/warm_dirt_path_01/v001.png",  # 仮
    "grass_bamboo": "approved/ground/ground_bamboo_floor_01.png",
    "sand": "approved/ground/ground_sand_beach_01.png",
    "hill": "approved/ground/ground_hill_meadow_01.png",
    "grove": "approved/ground/ground_grove_floor_01.png",
    "meadow": "approved/ground/ground_flower_meadow_01.png",
}


def seamless(image: Image.Image, size: int = SIZE) -> Image.Image:
    img = image.convert("RGB").resize((size, size), Image.LANCZOS)
    shifted = ImageChops.offset(img, size // 2, size // 2)
    band = int(size * BLUR_BAND)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rectangle((band, band, size - band, size - band), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.6))
    return Image.composite(img, shifted, mask)


def edge_ratio(img: Image.Image) -> float:
    """2×2に並べたときの、つなぎ目の画素の差 ÷ 絵の中の隣り合う画素の差。2以内ならつなぎ目は目立たない"""
    w, h = img.size
    px = img.load()

    def diff(a, b):
        return sum(abs(a[i] - b[i]) for i in range(3))

    seam = sum(diff(px[w - 1, y], px[0, y]) for y in range(h)) + sum(diff(px[x, h - 1], px[x, 0]) for x in range(w))
    inner = sum(diff(px[w // 2, y], px[w // 2 + 1, y]) for y in range(h)) + sum(diff(px[x, h // 2], px[x + 1, h // 2]) for x in range(w - 1))
    return (seam / (w + h)) / max(inner / (w + h - 1), 0.001)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 tools/ground-assets/make_ground.py <spra-worldのassetsのフォルダ>")
    assets = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for key, rel in SOURCES.items():
        src = assets / rel
        if not src.exists():
            print(f"飛ばした(元の絵がまだ無い): {key} ← {rel}")
            continue
        raw = Image.open(src).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        # もともとつながっている絵(比が1以下)は、そのまま使う。つながっていない絵だけ、なじませる
        raw_ratio = edge_ratio(raw)
        img = raw if raw_ratio <= 1.0 else seamless(raw)
        out = OUT / f"{key}.webp"
        img.save(out, "WEBP", quality=85)
        note = "もともとつながっている" if img is raw else f"なじませた(元は{raw_ratio:.2f})"
        print(f"{key}: {out.stat().st_size // 1024}KB つなぎ目の比 {edge_ratio(img):.2f} {note}")


if __name__ == "__main__":
    main()
