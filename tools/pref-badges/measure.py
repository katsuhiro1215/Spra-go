"""シートの丸いバッジの中心と半径を測る(make_badges.py が使う crops.json を作る)。
初期位置の近くで、輪の縁(明るさの変わり目)が円周にいちばん合う円を探す。実行後は、確認画像を目で見て直す"""
import json
import sys
from pathlib import Path

import math

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SHEETS = ROOT.parent.parent / "company/spra/mascot/assets/badges/prefecture"
HERE = Path(__file__).parent

# シート → 県のキー(左上から右、2段目)
LAYOUT = {
    "sheet_01": ["hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata"],
    "sheet_02": ["fukushima", "ibaraki", "tochigi", "gunma", "saitama", "chiba"],
    "sheet_03": ["tokyo", "kanagawa", "niigata", "toyama", "ishikawa", "fukui"],
    "sheet_04": ["yamanashi", "nagano", "gifu", "shizuoka", "aichi", "mie"],
    "sheet_05": ["shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama"],
    "sheet_06": ["tottori", "shimane", "okayama", "hiroshima", "yamaguchi", "tokushima"],
    "sheet_07": ["kagawa", "ehime", "kochi", "fukuoka", "saga", "nagasaki"],
    "sheet_08": ["kumamoto", "oita", "miyazaki", "kagoshima", "okinawa"],
}
XS = [280, 768, 1255]
YS = [245, 735]
# 5県のシートの2段目は中央寄り
INITIAL = {
    f"slot{i}": (XS[i % 3], YS[i // 3]) for i in range(6)
}
SHEET8_ROW2 = [(495, 735), (1040, 735)]


def best_circle(edge, cx0, cy0):
    w, h = edge.size
    px = edge.load()
    angles = [2 * math.pi * k / 120 for k in range(120)]
    cos = [math.cos(a) for a in angles]
    sin = [math.sin(a) for a in angles]

    def score(cx, cy, r):
        total = 0
        for c, s_ in zip(cos, sin):
            x = min(max(int(cx + r * c), 0), w - 1)
            y = min(max(int(cy + r * s_), 0), h - 1)
            total += px[x, y]
        return total / len(cos)

    def ring(cx, cy, r):
        # 輪の縁が強く、そのすぐ外側(光のにじみ)がなめらかな円ほど高い
        return score(cx, cy, r) - 0.7 * score(cx, cy, r + 16)

    best = (-1e9, cx0, cy0, 235)
    for r in range(222, 252, 2):
        for dy in range(-24, 25, 4):
            for dx in range(-24, 25, 4):
                v = ring(cx0 + dx, cy0 + dy, r)
                if v > best[0]:
                    best = (v, cx0 + dx, cy0 + dy, r)
    _, cx, cy, r = best
    for r2 in range(r - 3, r + 4):
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                v = ring(cx + dx, cy + dy, r2)
                if v > best[0]:
                    best = (v, cx + dx, cy + dy, r2)
    return best[1], best[2], best[3]


def main():
    crops = {}
    for sheet, keys in LAYOUT.items():
        img = Image.open(SHEETS / f"{sheet}.png").convert("RGB")
        edge = img.convert("L").filter(ImageFilter.GaussianBlur(1)).filter(ImageFilter.FIND_EDGES)
        overlay = img.copy()
        draw = ImageDraw.Draw(overlay)
        for i, key in enumerate(keys):
            if sheet == "sheet_08" and i >= 3:
                cx0, cy0 = SHEET8_ROW2[i - 3]
            else:
                cx0, cy0 = INITIAL[f"slot{i}"]
            cx, cy, r = best_circle(edge, cx0, cy0)
            crops[key] = {"sheet": sheet, "cx": cx, "cy": cy, "r": r}
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 0), width=3)
            print(key, sheet, cx, cy, r)
        if "--overlay" in sys.argv:
            overlay.resize((768, 512)).save(HERE / f"_check_{sheet}.png")
    (HERE / "crops.json").write_text(json.dumps(crops, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


main()
