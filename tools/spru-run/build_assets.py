"""スプルランの絵を、アプリで使う形にする(docs/design/2026-10-22-spru-run-design.md 5章)。

元の絵(ChatGPT): company/spra/marketing/images/run/*.png
出力: frontend/public/games/spru-run/*.webp と、大きさの一覧 frontend/src/components/games/run/run-assets.ts

- スプル・じゃまもの・タネ: うすいふち(透明度40以下)を消し、中身だけに切り詰めて縮める。
  スプルは5枚とも同じ倍率で縮める(ポーズで大きさが変わらないように)。
- 背景: 左右の端を重ねてぼかし、横に並べてもつなぎ目が出ないようにする。
  地面は上の黒い帯を透明にする。空は流さないので、色のしっかりついた範囲だけを切り出す。

使い方: python3 tools/spru-run/build_assets.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parents[1] / "company/spra/marketing/images/run"
OUT = ROOT / "frontend/public/games/spru-run"
TS = ROOT / "frontend/src/components/games/run/run-assets.ts"

SPRU = ["run-a", "run-b", "jump", "double-jump", "triple-jump", "hit"]
# スプルの run-a の高さ(px)。表示は約80px なので、画面の細かさ3倍まで
SPRU_HEIGHT = 260
OBJECTS = {
    "rock": ("rock", 220),
    "stump": ("obstacle-stump", 220),
    "puddle": ("obstacle-puddle", 80),
    "bush": ("obstacle-bush", 420),
    "fence": ("obstacle-fence", 420),
    "seed": ("item-seed", 96),
    "golden-seed": ("item-golden-seed", 96),
    "silver-seed": ("item-silver-seed", 96),
    "bee": ("obstacle-bee", 150),
    "mushroom": ("obstacle-mushroom", 230),
    "hedgehog": ("obstacle-hedgehog", 190),
}

# 床の絵: 左のはし・まんなか(横にのばす)・右のはし、の3つに切る。幅1024に縮めたとき、はしの幅(px)とまんなかの幅(px)
PLATFORM_WIDTH = 1024
PLATFORM_CAP = 150
PLATFORM_MID = 200
PLATFORMS = {"platform-grass": "grass", "platform-cloud": "cloud"}


def clean(im: Image.Image) -> Image.Image:
    """うすいふちを消して、中身だけに切り詰める"""
    im = im.convert("RGBA")
    alpha = im.getchannel("A").point(lambda v: 0 if v <= 40 else v)
    im.putalpha(alpha)
    return im.crop(alpha.getbbox())


def save(im: Image.Image, name: str) -> tuple[int, int]:
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f"{name}.webp", "WEBP", quality=85, method=6)
    return im.size


def scaled(im: Image.Image, factor: float) -> Image.Image:
    return im.resize((max(1, round(im.width * factor)), max(1, round(im.height * factor))), Image.LANCZOS)


def seamless(im: Image.Image, blend_ratio: float = 0.08) -> Image.Image:
    """右の端を左の端に重ねてぼかす。並べたとき、右の端の次に左の端がなめらかにつながる"""
    im = im.convert("RGBA")
    w, h = im.size
    b = int(w * blend_ratio)
    out = im.crop((0, 0, w - b, h))
    tail = im.crop((w - b, 0, w, h))
    head = im.crop((0, 0, b, h))
    mask = Image.linear_gradient("L").rotate(90, expand=True).resize((b, h))  # 左が0、右が255
    mask = mask.transpose(Image.FLIP_LEFT_RIGHT)  # 左が255(右の端の絵)、右が0(もとの左の端)
    # 左の端: 右の端(tail)から、もとの左の端(head)へ、だんだん切り替える
    out.paste(Image.composite(tail, head, mask), (0, 0))
    return out


def ground() -> Image.Image:
    """地面: 黒い帯を透明にして、草の始まりから下を使う"""
    im = Image.open(SRC / "bg-ground.png").convert("RGB")
    gray = im.convert("L")
    alpha = gray.point(lambda v: 0 if v < 12 else (255 if v > 40 else (v - 12) * 9))
    im = im.convert("RGBA")
    im.putalpha(alpha)
    im = im.crop((0, alpha.getbbox()[1], im.width, im.height))
    return im


def sky() -> Image.Image:
    """空: 上下が透明にぼけているので、色のしっかりついた範囲(上から140〜850)だけを使う。空は流さないので、つなぎ目の処理はしない"""
    im = Image.open(SRC / "bg-sky.png").convert("RGBA").crop((0, 140, 1024, 850))
    base = Image.new("RGBA", im.size, (110, 190, 245, 255))
    return Image.alpha_composite(base, im)


def platform(file: str, key: str) -> dict:
    """床の絵を、左のはし・まんなか・右のはしに切って書き出す。平らな上の面の高さ(絵の上から何割か)も返す"""
    im = clean(Image.open(SRC / f"{file}.png"))
    im = scaled(im, PLATFORM_WIDTH / im.width)
    w, h = im.size
    alpha = im.getchannel("A")
    # 上の面: 中ほど(左右4分の1をのぞく)で、ほぼ全部が不透明になる、いちばん上の行
    top = next(y for y in range(h) if sum(1 for x in range(w // 4, 3 * w // 4, 4) if alpha.getpixel((x, y)) > 200) >= 0.9 * len(range(w // 4, 3 * w // 4, 4)))
    parts = {
        "l": im.crop((0, 0, PLATFORM_CAP, h)),
        "m": im.crop((w // 2 - PLATFORM_MID // 2, 0, w // 2 + PLATFORM_MID // 2, h)),
        "r": im.crop((w - PLATFORM_CAP, 0, w, h)),
    }
    for suffix, part in parts.items():
        save(part, f"{file}-{suffix}")
    return {"key": key, "height": h, "capWidth": PLATFORM_CAP, "topInset": round(top / h, 3)}


def main() -> None:
    sizes: dict[str, tuple[int, int]] = {}
    platform_art = {file: platform(file, key) for file, key in PLATFORMS.items()}

    spru = {name: clean(Image.open(SRC / f"{name}.png")) for name in SPRU}
    factor = SPRU_HEIGHT / spru["run-a"].height
    for name, im in spru.items():
        sizes[name] = save(scaled(im, factor), name)

    for key, (file, height) in OBJECTS.items():
        im = clean(Image.open(SRC / f"{file}.png"))
        sizes[key] = save(scaled(im, height / im.height), key)

    sizes["bg-sky"] = save(scaled(sky(), 900 / 1024), "bg-sky")
    for key, im, width in [
        ("bg-hills", Image.open(SRC / "bg-hills.png"), 1400),
        ("bg-meadow", Image.open(SRC / "bg-meadow.png"), 1400),
        ("bg-ground", ground(), 1400),
    ]:
        tile = seamless(im)
        sizes[key] = save(scaled(tile, width / tile.width), key)

    lines = [
        "// tools/spru-run/build_assets.py が作る。手で書き換えない",
        "export type RunAsset = { src: string; width: number; height: number };",
        "",
        "export const RUN_ASSETS = {",
        *[f'  "{key}": {{ src: "/games/spru-run/{key}.webp", width: {w}, height: {h} }},' for key, (w, h) in sizes.items()],
        "} as const satisfies Record<string, RunAsset>;",
        "",
        "/** 床の絵。左のはし(capWidth px)・まんなか(横にのばす)・右のはしの3枚(`<src>-l/-m/-r.webp`)。height は絵の高さ(px)、topInset は、絵の上から、平らな上の面までの割合 */",
        "export const PLATFORM_ART = {",
        *[f'  {a["key"]}: {{ src: "/games/spru-run/{file}", height: {a["height"]}, capWidth: {a["capWidth"]}, topInset: {a["topInset"]} }},' for file, a in platform_art.items()],
        "} as const;",
        "",
    ]
    TS.write_text("\n".join(lines), encoding="utf-8")
    for key, size in sizes.items():
        print(key, size)


if __name__ == "__main__":
    main()
