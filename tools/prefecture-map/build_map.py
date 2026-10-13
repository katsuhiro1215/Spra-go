#!/usr/bin/env python3
"""都道府県の地図データ(SVGのパス)を作る。標準ライブラリだけで動く。

使い方(リポジトリ直下で):
    python3 tools/prefecture-map/build_map.py <Natural Earth の ne_10m_admin_1_states_provinces.geojson>

- 入力: Natural Earth 1:10m admin-1(パブリックドメイン。出典の明記は不要)。
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
- 出力: frontend/src/components/prefecture-map/japan-map.ts(手で直さない)
- 設計書: docs/design/2026-10-13-prefecture-map-quiz-design.md 4章
- 県のkeyは、都道府県コード(JP-01〜JP-47)の順に、下の KEYS を割り当てる(database/data/prefectures.php の並びと同じ。テストで確かめる)
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/src/components/prefecture-map/japan-map.ts"

KEYS = [
    "hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima", "ibaraki", "tochigi", "gunma",
    "saitama", "chiba", "tokyo", "kanagawa", "niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano",
    "gifu", "shizuoka", "aichi", "mie", "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama",
    "tottori", "shimane", "okayama", "hiroshima", "yamaguchi", "tokushima", "kagawa", "ehime", "kochi", "fukuoka",
    "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa",
]
# 地方は、database/data/prefectures.php と同じ分け方(三重県は近畿。テストで確かめる)
REGION_OF = {
    **dict.fromkeys(["hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"], "hokkaido-tohoku"),
    **dict.fromkeys(["ibaraki", "tochigi", "gunma", "saitama", "chiba", "tokyo", "kanagawa"], "kanto"),
    **dict.fromkeys(["niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano", "gifu", "shizuoka", "aichi"], "chubu"),
    **dict.fromkeys(["mie", "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama"], "kinki"),
    **dict.fromkeys(["tottori", "shimane", "okayama", "hiroshima", "yamaguchi", "tokushima", "kagawa", "ehime", "kochi"], "chugoku-shikoku"),
    **dict.fromkeys(["fukuoka", "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa"], "kyushu-okinawa"),
}

SCALE = 60.0  # 1度あたりの座標の大きさ
LON0, LAT_MID = 137.0, 37.5
SIMPLIFY = 0.02  # 度。ダグラス・ポイカーの許容
MIN_AREA = 0.004  # 平方度。これより小さい島は省く(ただし、その県の最大の島は必ず残す)
OKINAWA_SHIFT = (-2.0, 6.0)  # 度。九州の左(東シナ海の位置)へ寄せて、枠で囲む(経度・緯度の差)
DROP_LON_LAT_BELOW = (24.0, 36.0)  # 小笠原などの遠い島(東京の緯度24〜36度の範囲外)を省く


def project(lon: float, lat: float) -> tuple[float, float]:
    return ((lon - LON0) * math.cos(math.radians(LAT_MID)) * SCALE, -lat * SCALE)


def ring_area(ring: list[list[float]]) -> float:
    a = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def simplify(points: list[tuple[float, float]], tol: float) -> list[tuple[float, float]]:
    """ダグラス・ポイカー(再帰を避けて、スタックで)"""
    if len(points) < 3:
        return points
    if points[0] == points[-1]:
        # 閉じた輪は、始点と終点が同じで、線分にならない。始点からいちばん遠い点で2つに分けて、それぞれ簡略化する
        far = max(range(1, len(points) - 1), key=lambda i: math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]))
        left = simplify(points[: far + 1], tol)
        right = simplify(points[far:], tol)
        return left[:-1] + right
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        lo, hi = stack.pop()
        (x1, y1), (x2, y2) = points[lo], points[hi]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-12
        far, dist = -1, 0.0
        for i in range(lo + 1, hi):
            x, y = points[i]
            d = abs(dy * (x - x1) - dx * (y - y1)) / norm
            if d > dist:
                far, dist = i, d
        if dist > tol and far != -1:
            keep[far] = True
            stack.append((lo, far))
            stack.append((far, hi))
    return [p for p, k in zip(points, keep) if k]


def polygons(feature: dict) -> list[list[list[list[float]]]]:
    g = feature["geometry"]
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def path_of(polys: list, shift: tuple[float, float]) -> tuple[str, tuple[float, float, float, float]]:
    d, xs, ys = [], [], []
    for rings in polys:
        for ring in rings[:1]:  # 外側の輪だけ(県の内側の穴はない)
            pts = [project(lon + shift[0], lat + shift[1]) for lon, lat in ring]
            pts = simplify(pts, SIMPLIFY * SCALE)
            if len(pts) < 3:
                continue
            d.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z")
            xs += [p[0] for p in pts]
            ys += [p[1] for p in pts]
    return "".join(d), (min(xs), min(ys), max(xs), max(ys))


def keep_polys(polys: list, key: str) -> list:
    sized = [(ring_area(p[0]), p) for p in polys]
    biggest = max(a for a, _ in sized)
    out = []
    for area, p in sized:
        lons = [c[0] for c in p[0]]
        lats = [c[1] for c in p[0]]
        if key == "tokyo" and sum(lats) / len(lats) < DROP_LON_LAT_BELOW[0]:
            continue  # 小笠原
        if key == "okinawa" and sum(lons) / len(lons) > 130.0:
            continue  # 大東諸島(沖縄本島から遠く、枠が広がるため省く)
        if area == biggest or area >= MIN_AREA:
            out.append(p)
    return out


def main() -> None:
    src = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    features = {f["properties"]["iso_3166_2"]: f for f in src["features"] if f["properties"].get("iso_a2") == "JP"}
    assert len(features) == 47, f"47県そろわない: {len(features)}"

    prefectures: dict[str, dict] = {}
    for number, key in enumerate(KEYS, start=1):
        feature = features[f"JP-{number:02d}"]
        shift = OKINAWA_SHIFT if key == "okinawa" else (0.0, 0.0)
        d, box = path_of(keep_polys(polygons(feature), key), shift)
        prefectures[key] = {"name": feature["properties"]["name_ja"], "d": d, "box": box}

    # 沖縄の枠(九州の左下)
    ox0, oy0, ox1, oy1 = prefectures["okinawa"]["box"]
    pad = 8.0
    inset = (ox0 - pad, oy0 - pad, ox1 + pad, oy1 + pad)

    def union(keys: list[str], margin: float = 14.0) -> list[float]:
        boxes = [prefectures[k]["box"] for k in keys]
        x0 = min(b[0] for b in boxes) - margin
        y0 = min(b[1] for b in boxes) - margin
        x1 = max(b[2] for b in boxes) + margin
        y1 = max(b[3] for b in boxes) + margin
        return [round(x0, 1), round(y0, 1), round(x1 - x0, 1), round(y1 - y0, 1)]

    views = {"japan": union(KEYS)}
    for region in dict.fromkeys(REGION_OF.values()):
        members = [k for k in KEYS if REGION_OF[k] == region]
        # 九州・沖縄は、沖縄を枠に寄せているので、九州・沖縄全体で切り取ればよい
        views[region] = union(members)

    lines = [
        "// このファイルは tools/prefecture-map/build_map.py が書き出す。手で直さない。",
        "// 元データ: Natural Earth 1:10m admin-1(パブリックドメイン)。設計書 docs/design/2026-10-13-prefecture-map-quiz-design.md",
        "",
        "export type PrefectureShape = { name: string; d: string; region: string };",
        "",
        "export const PREFECTURE_SHAPES: Record<string, PrefectureShape> = {",
    ]
    for key in KEYS:
        p = prefectures[key]
        lines.append(f'  {key}: {{ name: {json.dumps(p["name"], ensure_ascii=False)}, region: "{REGION_OF[key]}", d: "{p["d"]}" }},')
    lines += [
        "};",
        "",
        "/** 表示する範囲 [x, y, 幅, 高さ]。japan=全国、そのほかは地方のkey */",
        "export const MAP_VIEWS: Record<string, [number, number, number, number]> = {",
    ]
    for name, box in views.items():
        lines.append(f'  {json.dumps(name)}: {json.dumps(box)},')
    lines += [
        "};",
        "",
        "/** 沖縄の枠(九州の左下に寄せた沖縄を囲む線) [x, y, 幅, 高さ] */",
        f"export const OKINAWA_INSET: [number, number, number, number] = {json.dumps([round(inset[0], 1), round(inset[1], 1), round(inset[2] - inset[0], 1), round(inset[3] - inset[1], 1)])};",
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    size = OUT.stat().st_size
    points = sum(p["d"].count("L") + p["d"].count("M") for p in prefectures.values())
    print(f"書き出しました: {OUT.relative_to(ROOT)}（{size // 1024}KB・頂点 約{points}）")


if __name__ == "__main__":
    main()
