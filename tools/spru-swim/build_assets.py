"""スプルスイムの絵を、アプリで使う形にする(docs/design/2026-11-10-spru-swim-design.md)。

元の絵(ChatGPT): rooms/Spra/assets/go/*.png
出力: frontend/public/games/spru-swim/*.webp と、大きさの一覧 frontend/src/components/games/swim/swim-assets.ts

run-run の tools/spru-run/build_assets.py と同じやり方(うすいふちを消す・倍率をそろえる・横につなげる)。

使い方: python3 tools/spru-swim/build_assets.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# rooms/Spra は、いまはWindows側(/mnt/c)にあり、WSL側の projects/ とは別の場所
SRC = Path("/mnt/c/Users/katsu/SmartSprouts/rooms/Spra/assets/go")
OUT = ROOT / "frontend/public/games/spru-swim"
TS = ROOT / "frontend/src/components/games/swim/swim-assets.ts"

SPRU = ["swim-a", "swim-b", "rise", "hit"]
# スプルの swim-a の高さ(px)。run-run の SPRU_HEIGHT と同じ考え方
SPRU_HEIGHT = 260
OBJECTS = {
    "jellyfish": ("obstacle-jellyfish", 220),
    "urchin": ("obstacle-urchin", 190),
    "octopus": ("obstacle-octopus", 210),
    "shark": ("obstacle-shark", 230),
    "crab": ("obstacle-crab", 190),
    "squid": ("obstacle-squid", 220),
    "coin": ("item-coin", 90),
    "big-coin": ("item-big-coin", 110),
}


def clean(im: Image.Image) -> Image.Image:
    """うすいふちを消して、中身だけに切り詰める(run-run の clean() と同じ)"""
    im = im.convert("RGBA")
    alpha = im.getchannel("A").point(lambda v: 0 if v <= 60 else v)
    im.putalpha(alpha)
    box = alpha.getbbox()
    return im.crop(box) if box else im


def save(im: Image.Image, name: str) -> tuple[int, int]:
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f"{name}.webp", "WEBP", quality=85, method=6)
    return im.size


def scaled(im: Image.Image, factor: float) -> Image.Image:
    return im.resize((max(1, round(im.width * factor)), max(1, round(im.height * factor))), Image.LANCZOS)


def seamless(im: Image.Image, blend_ratio: float = 0.08) -> Image.Image:
    """右の端を左の端に重ねてぼかす(run-run の seamless() と同じ)"""
    im = im.convert("RGBA")
    w, h = im.size
    b = int(w * blend_ratio)
    out = im.crop((0, 0, w - b, h))
    tail = im.crop((w - b, 0, w, h))
    head = im.crop((0, 0, b, h))
    mask = Image.linear_gradient("L").rotate(90, expand=True).resize((b, h))
    mask = mask.transpose(Image.FLIP_LEFT_RIGHT)
    out.paste(Image.composite(tail, head, mask), (0, 0))
    return out


def main() -> None:
    sizes: dict[str, tuple[int, int]] = {}

    # スプル: 同じ倍率で縮め、ポーズで大きさが変わらないようにする
    base = clean(Image.open(SRC / f"{SPRU[0]}.png"))
    factor = SPRU_HEIGHT / base.height
    for name in SPRU:
        im = scaled(clean(Image.open(SRC / f"{name}.png")), factor)
        sizes[name] = save(im, name)

    # じゃまもの・コイン: それぞれの高さに縮める
    for key, (src_name, height) in OBJECTS.items():
        im = clean(Image.open(SRC / f"{src_name}.png"))
        im = scaled(im, height / im.height)
        sizes[key] = save(im, key)

    # 背景: 水面(いちばん奥。流さない)、中層・海底(横につなげる)
    surface = Image.open(SRC / "bg-surface.png").convert("RGBA")
    sizes["bg-surface"] = save(surface, "bg-surface")

    midwater = seamless(Image.open(SRC / "bg-midwater.png").convert("RGBA"))
    sizes["bg-midwater"] = save(midwater, "bg-midwater")

    seabed = seamless(Image.open(SRC / "bg-seabed.png").convert("RGBA"))
    sizes["bg-seabed"] = save(seabed, "bg-seabed")

    lines = [
        "// tools/spru-swim/build_assets.py が作る。手で書き換えない",
        "export type SwimAsset = { src: string; width: number; height: number };",
        "",
        "export const SWIM_ASSETS = {",
    ]
    for name, (w, h) in sizes.items():
        lines.append(f'  "{name}": {{ src: "/games/spru-swim/{name}.webp", width: {w}, height: {h} }},')
    lines.append("} as const satisfies Record<string, SwimAsset>;")
    TS.parent.mkdir(parents=True, exist_ok=True)
    TS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT}")
    print(f"一覧: {TS}")


if __name__ == "__main__":
    main()
