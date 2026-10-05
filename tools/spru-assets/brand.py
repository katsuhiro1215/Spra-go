#!/usr/bin/env python3
"""アプリのアイコンと、SNSで共有したときの画像を作る(docs/design/2026-09-29-spru-icons-design.md 5・6章)。

使い方(リポジトリ直下で): python3 tools/spru-assets/brand.py ../../company/spra/mascot/assets

- アイコンは image9(頭がS字の芽のスプル)、SNS画像は image10(家の前で手を振るスプル)から作る
- SNS画像の字は M PLUS Rounded 1c(fonts/、SIL Open Font License)。ロゴのマークは frontend/public/logo.svg を
  Next.js に入っている sharp で PNG にしてから重ねる(node が要る)
- 出力: frontend/src/app/ の favicon.ico・icon.png・apple-icon.png・opengraph-image.jpg・twitter-image.jpg、
  frontend/public/icons/ の icon-192.png・icon-512.png(ホーム画面に追加したとき。app/manifest.ts が指す)
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "frontend/src/app"
PUBLIC_ICONS = ROOT / "frontend/public/icons"
FONT = Path(__file__).parent / "fonts/MPLUSRounded1c-ExtraBold.ttf"
FAVICON_BOX = (127, 40, 1127, 1040)  # image9 の頭(顔とS字の芽)のまわり。小さいと芽がつぶれるので、体を切って大きめに出す
OG_SIZE = (1200, 630)
TEXT_X = 290  # SNS画像の字を並べる左の空の真ん中
GREEN = "#3b7f26"
BROWN = "#3b3226"


def square(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def logo_png(height: int) -> Image.Image:
    """ロゴのマーク(SVG)を、高さ height の PNG にする"""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "logo.png"
        code = "require('sharp')('public/logo.svg',{density:900}).resize({height:+process.argv[2]}).png().toFile(process.argv[1])"
        subprocess.run(["node", "-e", code, str(out), str(height)], cwd=ROOT / "frontend", check=True)
        img = Image.open(out)
        img.load()
        return img.convert("RGBA")


def build_icons(assets: Path) -> None:
    src = Image.open(assets / "image9.png").convert("RGB")
    # Next.js は ico の中の画像が RGBA でないと読めないので、RGBA にしてから保存する
    head = src.crop(FAVICON_BOX).resize((256, 256), Image.LANCZOS).convert("RGBA")
    head.save(APP / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    square(src, 512).save(APP / "icon.png")
    # iPhone は透明な所を黒くするので、背景の黄緑のまま(RGB)で出す
    square(src, 180).save(APP / "apple-icon.png")
    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        square(src, size).save(PUBLIC_ICONS / f"icon-{size}.png")


def build_og(assets: Path) -> None:
    src = Image.open(assets / "image10.png").convert("RGBA")
    height = round(src.height * OG_SIZE[0] / src.width)
    img = src.resize((OG_SIZE[0], height), Image.LANCZOS)
    top = (height - OG_SIZE[1]) // 2
    img = img.crop((0, top, OG_SIZE[0], top + OG_SIZE[1]))

    logo = logo_png(150)
    img.alpha_composite(logo, (TEXT_X - logo.width // 2, 100))
    draw = ImageDraw.Draw(img)
    draw.text(
        (TEXT_X, 330), "Spra Go", font=ImageFont.truetype(str(FONT), 112),
        fill=GREEN, anchor="mm", stroke_width=8, stroke_fill="white",
    )
    draw.text(
        (TEXT_X, 420), "学ぶほど、世界が広がる。", font=ImageFont.truetype(str(FONT), 40),
        fill=BROWN, anchor="mm", stroke_width=6, stroke_fill="white",
    )

    rgb = img.convert("RGB")
    for name in ("opengraph-image.jpg", "twitter-image.jpg"):
        rgb.save(APP / name, quality=88)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 tools/spru-assets/brand.py <素材集のフォルダ>")
    assets = Path(sys.argv[1])
    build_icons(assets)
    build_og(assets)
    print("アイコン(favicon・icon・apple-icon・icons/192・512)と、SNS画像(opengraph・twitter)を書き出しました")


if __name__ == "__main__":
    main()
