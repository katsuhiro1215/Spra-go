#!/usr/bin/env python3
"""宇宙の絵(PNG)を検査して、512px の webp に変換し、frontend/public/space/ に置く。

使い方(projects/Spra-go で):
    python3 -I tools/space/import-images.py [入力フォルダ] [--dry-run]

- 入力の既定: ../../company/spra/assets/incoming/space
- キーの一覧は database/data/space/pictures.csv(1列目)。ファイル名 {キー}.png
- 検査: 正方形か、解像度、キーの過不足(足りない・知らないファイル名)
- 出力: frontend/public/space/{キー}.webp(正方形 512px、画質 82)
"""

import csv
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SRC = ROOT / "../../company/spra/assets/incoming/space"
OUT = ROOT / "frontend/public/space"
SIZE = 512
QUALITY = 82
MIN_SOURCE = 1000


def keys() -> list[str]:
    with open(ROOT / "database/data/space/pictures.csv", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    return [row[0] for row in rows[1:] if row]


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    src = Path(args[0]) if args else DEFAULT_SRC.resolve()
    expected = keys()
    problems: list[str] = []

    files = {p.stem: p for p in src.glob("*.png")}
    for stray in sorted(set(files) - set(expected)):
        problems.append(f"知らないファイル名: {stray}.png（キーに無い）")
    missing = [k for k in expected if k not in files]
    if missing:
        problems.append("まだ届いていない: " + "、".join(missing))

    converted = 0
    for key in expected:
        path = files.get(key)
        if path is None:
            continue
        with Image.open(path) as image:
            if image.width != image.height:
                problems.append(f"{key}: 正方形でない（{image.width}×{image.height}）")
                continue
            if image.width < MIN_SOURCE:
                problems.append(f"{key}: 小さすぎる（{image.width}px）")
                continue
            if dry:
                converted += 1
                continue
            OUT.mkdir(parents=True, exist_ok=True)
            image.convert("RGB").resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f"{key}.webp", "WEBP", quality=QUALITY, method=6)
            converted += 1

    verb = "検査だけ" if dry else "変換"
    print(f"{verb}: {converted}/{len(expected)} 枚")
    for line in problems:
        print(f" - {line}")
    return 1 if any(not p.startswith("まだ届いていない") for p in problems) else 0


if __name__ == "__main__":
    sys.exit(main())
