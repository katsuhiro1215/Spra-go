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
SEAMLESS_RATIO = 1.2  # つなぎ目の比がこれ以下なら、もともとつながっているとみなす
BLUR_BAND = 0.14  # 端からこの割合の帯を、ずらした絵となじませる

# キー → 素材の置き場所(company/spra/spra-world/assets からの相対)。approved/ground/ に届いた絵を足していく
SOURCES = {
    "grass_town": "approved/ground/ground_grass_town_01.png",
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


DECALS_SHEET = "approved/ground/ground_decals_sheet_01.png"  # 透過の1枚のシート(小物6点)
DECAL_MAX = 128  # 小物1つの、長い方の辺(px)
DECAL_MIN_PART = 2000  # これより小さい塊は、ごみとして除く(画素数)


def cut_decals(assets: Path) -> list[tuple[str, int, int]]:
    """透過のシートから、小物を1つずつ切り出して decal_{番号}.webp にする(左上から、上の段・下の段の順)"""
    src = assets / DECALS_SHEET
    if not src.exists():
        print(f"飛ばした(元の絵がまだ無い): 小物のシート ← {DECALS_SHEET}")
        return []
    sheet = Image.open(src).convert("RGBA")
    alpha = sheet.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    w, h = alpha.size
    px = alpha.load()
    seen = bytearray(w * h)
    parts = []
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0] == 0 or seen[y0 * w + x0]:
                continue
            stack = [(x0, y0)]
            seen[y0 * w + x0] = 1
            xs, ys, count = [x0], [y0], 0
            while stack:
                x, y = stack.pop()
                count += 1
                xs.append(x)
                ys.append(y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny * w + nx]:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            if count >= DECAL_MIN_PART:
                parts.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    # 近い物は1つにまとめず、上の段・下の段(縦の中心で2つに分ける)→左から右の順に並べる
    mid = h / 2
    parts.sort(key=lambda b: (0 if (b[1] + b[3]) / 2 < mid else 1, b[0]))
    out = []
    for i, box in enumerate(parts):
        crop = sheet.crop(box)
        scale = DECAL_MAX / max(crop.size)
        crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
        path = OUT / f"decal_{i}.webp"
        crop.save(path, "WEBP", quality=90)
        out.append((f"/spru/ground/decal_{i}.webp", crop.width, crop.height))
        print(f"decal_{i}: {crop.width}x{crop.height} {path.stat().st_size // 1024}KB")
    return out


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
        # もともとつながっている絵(比が1.2以下)は、そのまま使う。つながっていない絵だけ、なじませる
        raw_ratio = edge_ratio(raw)
        img = raw if raw_ratio <= SEAMLESS_RATIO else seamless(raw)
        out = OUT / f"{key}.webp"
        img.save(out, "WEBP", quality=85)
        note = "もともとつながっている" if img is raw else f"なじませた(元は{raw_ratio:.2f})"
        print(f"{key}: {out.stat().st_size // 1024}KB つなぎ目の比 {edge_ratio(img):.2f} {note}")
    cut_decals(assets)


if __name__ == "__main__":
    main()
