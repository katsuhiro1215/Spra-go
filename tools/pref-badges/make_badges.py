"""都道府県バッジ47枚を、シートから丸く切り抜いて frontend/public/badge/pref/{key}.webp にする。
元のシートは company/spra/mascot/assets/badges/prefecture/sheet_01〜08.png。
丸の位置は crops.json(measure.py で測り、確認画像で直す)。輪のすぐ外(半径+MARGIN)で切って、外側を透明にする。
使い方: python3 tools/pref-badges/make_badges.py [--check]  (--check は確認用の一覧画像を作る)"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SHEETS = ROOT.parent.parent / "company/spra/mascot/assets/badges/prefecture"
HERE = Path(__file__).parent
OUT = ROOT / "frontend/public/badge/pref"
SIZE = 192
MARGIN = 6
SUPER = 4  # 丸の縁をなめらかにするため、大きく作ってから縮める


def circle_mask(size, radius_ratio):
    big = size * SUPER
    mask = Image.new("L", (big, big), 0)
    c = big / 2
    r = big * radius_ratio / 2
    ImageDraw.Draw(mask).ellipse([c - r, c - r, c + r, c + r], fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def main():
    crops = json.loads((HERE / "crops.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    sheets = {}
    results = {}
    total = 0
    for key, c in crops.items():
        sheet = sheets.setdefault(c["sheet"], Image.open(SHEETS / f"{c['sheet']}.png").convert("RGBA"))
        r = c["r"] + MARGIN
        crop = sheet.crop((c["cx"] - r, c["cy"] - r, c["cx"] + r, c["cy"] + r)).resize((SIZE, SIZE), Image.LANCZOS)
        crop.putalpha(circle_mask(SIZE, 1.0))
        path = OUT / f"{key}.webp"
        crop.save(path, "WEBP", quality=82, method=6)
        total += path.stat().st_size
        results[key] = crop
    print(f"{len(results)}枚、合計 {total / 1024:.0f}KB")

    if "--check" in sys.argv:
        cols = 8
        rows = (len(results) + cols - 1) // cols
        for name, bg in (("dark", (30, 30, 40)), ("light", (250, 245, 235))):
            sheet = Image.new("RGB", (cols * SIZE, rows * SIZE), bg)
            for i, img in enumerate(results.values()):
                sheet.paste(img, ((i % cols) * SIZE, (i // cols) * SIZE), img)
            sheet.save(HERE / f"_check_all_{name}.png")


main()
