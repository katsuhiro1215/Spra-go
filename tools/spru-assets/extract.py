#!/usr/bin/env python3
"""スプルの素材集(company/spra/mascot/assets/)から、ゲームで使う画像を1体ずつ切り抜く。

使い方(リポジトリ直下で): python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets

- 切り抜く範囲は同じフォルダの crops.json に書く(素材集上のピクセル座標 [左, 上, 右, 下])
- 1点ごとに "width" を書くと、その幅(px)に縮める(アイテムは1マス256px・2×2は384px)
- 出力: frontend/public/spru/{group}/{key}.webp、表情の顔アイコン faces/、シーン scenes/、
  つぼみ・花 bloom/、畑で育つ絵 growth/{見た目}/{段階}.webp(キーに / を入れる)、仲間 companions/、リュックのスプル outing/、季節の衣装 costumes/、バッジ badges/、
  国のスタンプ stamps/(キーは国のコードの小文字)、スプルの家 house/(背景が透明でない絵は四隅から背景を抜く)、
  (背景の透明を灰色の格子模様で描いてしまった絵は "background": "checker" で格子を抜く。新しい設定画 spru/ の多く)、
  町のアイテム・おみやげ・目印 items/(キーは絵のキー。docs/design/2026-09-28-town-items-design.md 7-1。
  離れた部品も残すため、既定の mode は "all")
- 画面のアイコン icons/・ステージの丸 stages/・アバター avatars/・旅の乗り物とチケット travel/・ページの絵 pages/
  (docs/design/2026-09-29-spru-icons-design.md 3章。元の絵は image4〜6)
- 画面側が読む一覧 frontend/src/components/spru/spru-assets.ts もここで書き出す(手で直さない)
- Spru Master(Blender)ができたら、同じキー・同じ置き場所の画像に差し替える
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/spru"
TS_OUT = ROOT / "frontend/src/components/spru/spru-assets.ts"
PAD = 8
CORE_ALPHA = 200  # これより不透明な所をキャラクター本体とみなす(区切り枠や名前の文字は半透明)
EDGE_ALPHA = 24  # 余白を詰めるときの透明度のしきい値
MIN_PART = 20  # mode "all" で残す塊の最小の大きさ(小さなごみを除く)
TIP_ALPHA = 128  # Sの先を探すときの不透明さのしきい値
TIP_ROWS = 6  # いちばん上から何行分の平均を、Sの先の横位置にするか
BG_THRESH = 55  # 背景を抜くとき、四隅の色からどれだけ離れた色まで背景とみなすか
CHECKER_SPREAD = 14  # 格子とみなす色の、RGBの最大と最小の差の上限(色味のない灰色)
CHECKER_RANGE = (100, 215)  # 格子とみなす明るさ(Rの値)の範囲。白い花びらや、つやの白は入らない
CHECKER_TONE_DIST = 16  # 明るさの山の近くとみなす差
CHECKER_HOLE_MIN = 30  # 囲まれた格子として抜く塊の最小の大きさ(小さな灰色の点は残す)
CHECKER_HOLE_TONE_SHARE = 0.6  # 囲まれた塊のうち、明るさの2つの山の近くにある点の割合がこれ以上なら格子とみなす
CHECKER_HOLE_SPREAD = 32  # 囲まれた格子とみなす色の、RGBの最大と最小の差の上限(うっすら色が付いた格子も入れる)
CHECKER_HOLE_GAP = 30  # 格子の濃い灰と薄い灰の明るさの差の下限(四辺の格子では約48)


def components(mask: Image.Image) -> list[list[tuple[int, int]]]:
    """二値マスクの塊(上下左右でつながった点の集まり)を、見つけた順に返す"""
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    found: list[list[tuple[int, int]]] = []
    for y in range(h):
        for x in range(w):
            if px[x, y] and not seen[y * w + x]:
                comp = []
                queue = deque([(x, y)])
                seen[y * w + x] = 1
                while queue:
                    cx, cy = queue.popleft()
                    comp.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny * w + nx]:
                            seen[ny * w + nx] = 1
                            queue.append((nx, ny))
                found.append(comp)
    return found


def mask_of(size: tuple[int, int], points: list[tuple[int, int]]) -> Image.Image:
    out = Image.new("L", size, 0)
    op = out.load()
    for x, y in points:
        op[x, y] = 255
    return out


def clear_background(img: Image.Image) -> Image.Image:
    """背景が透明でない絵(スプルの家 image1 など)から、四隅につながる背景色を透明にする。
    もともと透明な所がある絵はそのまま返す(背景を消した絵に差し替えたときは何もしない)"""
    if img.getchannel("A").getextrema()[0] < 255:
        return img
    rgb = img.convert("RGB")
    marked = rgb.copy()
    w, h = marked.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(marked, corner, (255, 0, 255), thresh=BG_THRESH)
    diff = ImageChops.difference(marked, Image.new("RGB", marked.size, (255, 0, 255))).convert("L")
    alpha = diff.point(lambda v: 255 if v > 0 else 0).filter(ImageFilter.GaussianBlur(1.2))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def clear_checker(img: Image.Image) -> Image.Image:
    """背景の透明を灰色の格子模様で描いてしまった絵(company/spra/mascot/assets/spru/ の多く)から、
    四辺につながる格子(色味のない灰色)を透明にする。もともと透明な所がある絵はそのまま返す。
    銀・真珠のように体の色が格子と近い絵は、体まで削れるので使わない(透明な絵に描き直してもらう)"""
    if img.getchannel("A").getextrema()[0] < 255:
        return img
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    lo, hi = CHECKER_RANGE

    def is_checker(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        return max(r, g, b) - min(r, g, b) <= CHECKER_SPREAD and lo <= r <= hi

    seen = bytearray(w * h)
    queue = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while queue:
        x, y = queue.popleft()
        i = y * w + x
        if seen[i] or not is_checker(x, y):
            continue
        seen[i] = 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                queue.append((nx, ny))
    clear_checker_holes(px, w, h, seen)
    alpha = Image.frombytes("L", (w, h), bytes(0 if v else 255 for v in seen)).filter(ImageFilter.GaussianBlur(1.2))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def clear_checker_holes(px, w: int, h: int, seen: bytearray) -> None:
    """Sの輪の内側や足もとの影のように、四辺からつながらない格子、うっすら色が付いた格子も抜く(seen に印を付ける)。
    色味の少ない灰色の塊を集め、明るさが2つの山(格子の濃い灰と薄い灰)にはっきり分かれている塊だけを格子とみなす
    (体のつやや影は明るさがなだらかに変わるので2つの山にならず、残る)"""
    lo, hi = CHECKER_RANGE

    def candidate(x: int, y: int) -> bool:
        r, g, b = px[x, y]
        return max(r, g, b) - min(r, g, b) <= CHECKER_HOLE_SPREAD and lo - 20 <= (r + g + b) // 3 <= hi

    visited = bytearray(w * h)
    for start in range(w * h):
        if seen[start] or visited[start]:
            continue
        sx, sy = start % w, start // w
        if not candidate(sx, sy):
            continue
        comp = []
        queue = deque([(sx, sy)])
        visited[start] = 1
        while queue:
            x, y = queue.popleft()
            comp.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                j = ny * w + nx
                if 0 <= nx < w and 0 <= ny < h and not visited[j] and not seen[j] and candidate(nx, ny):
                    visited[j] = 1
                    queue.append((nx, ny))
        if len(comp) >= CHECKER_HOLE_MIN and is_two_tone([sum(px[x, y]) // 3 for x, y in comp]):
            for x, y in comp:
                seen[y * w + x] = 1


def is_two_tone(values: list[int]) -> bool:
    """明るさが、はなれた2つの山にまとまっているか(格子の市松)。2つに分けたそれぞれの平均の差が CHECKER_HOLE_GAP 以上で、
    どちらの山にも2割以上あり、山の近く(±CHECKER_TONE_DIST)に CHECKER_HOLE_TONE_SHARE 以上が入っていれば真"""
    dark, light = min(values), max(values)
    for _ in range(10):
        mid = (dark + light) / 2
        low = [v for v in values if v <= mid]
        high = [v for v in values if v > mid]
        if not low or not high:
            return False
        dark, light = sum(low) / len(low), sum(high) / len(high)
    if light - dark < CHECKER_HOLE_GAP or min(len(low), len(high)) < len(values) * 0.2:
        return False
    near = sum(1 for v in values if abs(v - dark) <= CHECKER_TONE_DIST or abs(v - light) <= CHECKER_TONE_DIST)
    return near >= len(values) * CHECKER_HOLE_TONE_SHARE


def cut_figure(src: Image.Image, box: list[int], scale: float, mode: str = "largest") -> Image.Image:
    """mode: "largest" は一番大きい塊だけ(離れた効果線・zzzを除く)、"all" は離れた部品も残す
    (飛んでいる種など。名前の文字が入らないよう枠ぴったりで切る)、"rect" は四角くそのまま切る"""
    x0, y0, x1, y1 = box
    if mode == "rect":
        crop = src.crop((x0, y0, x1, y1))
    else:
        pad = 0 if mode == "all" else PAD
        crop = src.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
        alpha = crop.getchannel("A")
        comps = components(alpha.point(lambda v: 255 if v > CORE_ALPHA else 0))
        if mode == "all":
            points = [p for comp in comps if len(comp) >= MIN_PART for p in comp]
        else:
            points = max(comps, key=len) if comps else []
        keep = mask_of(alpha.size, points).filter(ImageFilter.MaxFilter(5))  # 輪郭のなめらかな半透明部分は残す
        crop.putalpha(Image.composite(alpha, Image.new("L", alpha.size, 0), keep))
        crop = crop.crop(crop.getchannel("A").point(lambda v: 255 if v > EDGE_ALPHA else 0).getbbox())
    if scale != 1.0:
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    return crop


def face_of(img: Image.Image) -> Image.Image:
    """表情の画像から顔の部分を正方形で切り出す(丸く表示する前提)"""
    w, h = img.size
    side = round(w * 0.8)
    cx, cy = round(w * 0.52), round(h * 0.5)
    left = max(0, min(w - side, cx - side // 2))
    top = max(0, min(h - side, cy - side // 2))
    return img.crop((left, top, left + side, top + side))


def tip_of(img: Image.Image) -> dict:
    """Sの先(画像のいちばん上)の位置。つぼみ・花をここに重ねる"""
    alpha = img.getchannel("A").point(lambda v: 255 if v > TIP_ALPHA else 0)
    top = alpha.getbbox()[1]
    px = alpha.load()
    xs = [x for y in range(top, min(img.height, top + TIP_ROWS)) for x in range(img.width) if px[x, y]]
    return {"x": round(sum(xs) / len(xs)), "y": top}


def save(img: Image.Image, rel: str) -> dict:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=88, method=6)
    return {"src": f"/spru/{rel}", "width": img.width, "height": img.height}


def entries(items: dict) -> str:
    return "\n".join(
        f'  {json.dumps(k)}: {{ src: {json.dumps(v["src"])}, width: {v["width"]}, height: {v["height"]} }},'
        for k, v in items.items()
    )


def write_ts(
    images: dict, faces: dict, scenes: dict, bloom: dict, growth: dict, companions: dict,
    outing: dict, costumes: dict, badges: dict, stamps: dict, house: dict, items: dict, tips: dict,
    icons: dict, stages: dict, avatars: dict, travel: dict, pages: dict,
) -> None:
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    stand = images["three-quarter"]["height"]
    tip_lines = "\n".join(f'  {json.dumps(k)}: {{ x: {v["x"]}, y: {v["y"]} }},' for k, v in tips.items())
    TS_OUT.write_text(
        f"""// このファイルは tools/spru-assets/extract.py が書き出す。手で直さない
export type SpruImage = {{ src: string; width: number; height: number }};

export const SPRU_IMAGES = {{
{entries(images)}
}} as const satisfies Record<string, SpruImage>;

export const SPRU_FACES = {{
{entries(faces)}
}} as const satisfies Record<string, SpruImage>;

export const SPRU_SCENES = {{
{entries(scenes)}
}} as const satisfies Record<string, SpruImage>;

export const SPRU_BLOOM = {{
{entries(bloom)}
}} as const satisfies Record<string, SpruImage>;

export const GROWTH_IMAGES = {{
{entries(growth)}
}} as const satisfies Record<string, SpruImage>;

export const COMPANION_IMAGES = {{
{entries(companions)}
}} as const satisfies Record<string, SpruImage>;

export const OUTING_IMAGES = {{
{entries(outing)}
}} as const satisfies Record<string, SpruImage>;

export const COSTUME_IMAGES = {{
{entries(costumes)}
}} as const satisfies Record<string, SpruImage>;

export const BADGE_IMAGES = {{
{entries(badges)}
}} as const satisfies Record<string, SpruImage>;

/** パスポートの国スタンプ。キーは国のコードの小文字 */
export const STAMP_IMAGES = {{
{entries(stamps)}
}} as const satisfies Record<string, SpruImage>;

/** スプルの家(入口の1枚の絵)。町のマスには置かない */
export const HOUSE_IMAGES = {{
{entries(house)}
}} as const satisfies Record<string, SpruImage>;

/** 町のアイテム・おみやげ・目印の画像(docs/design/2026-09-28-town-items-design.md 7章)。キーは絵のキー。無い物はプログラムの絵で描く */
export const SPRU_ITEMS = {{
{entries(items)}
}} as const satisfies Record<string, SpruImage>;

/** 画面のアイコン(下のメニュー・音・じぶん・町・入口。docs/design/2026-09-29-spru-icons-design.md 3-3) */
export const SPRU_ICONS = {{
{entries(icons)}
}} as const satisfies Record<string, SpruImage>;

/** ステージの丸(鍵・遊べる・クリア) */
export const SPRU_STAGES = {{
{entries(stages)}
}} as const satisfies Record<string, SpruImage>;

/** プレイヤーのアバター6種。キーはサーバーの UserProfile::AVATARS と同じ */
export const SPRU_AVATARS = {{
{entries(avatars)}
}} as const satisfies Record<string, SpruImage>;

/** 旅(出発の場面の船・飛行機は左向き、チケット) */
export const SPRU_TRAVEL = {{
{entries(travel)}
}} as const satisfies Record<string, SpruImage>;

/** ページの絵(見つからないページの迷子のスプル) */
export const SPRU_PAGES = {{
{entries(pages)}
}} as const satisfies Record<string, SpruImage>;

export type SpruImageKey = keyof typeof SPRU_IMAGES;
export type SpruFaceKey = keyof typeof SPRU_FACES;
export type SpruSceneKey = keyof typeof SPRU_SCENES;
export type SpruBloomKey = keyof typeof SPRU_BLOOM;
export type GrowthImageKey = keyof typeof GROWTH_IMAGES;
export type CompanionKey = keyof typeof COMPANION_IMAGES;
export type OutingKey = keyof typeof OUTING_IMAGES;
export type CostumeKey = keyof typeof COSTUME_IMAGES;
export type BadgeKey = keyof typeof BADGE_IMAGES;
export type StampKey = keyof typeof STAMP_IMAGES;
export type HouseImageKey = keyof typeof HOUSE_IMAGES;
export type SpruIconKey = keyof typeof SPRU_ICONS;
export type SpruStageKey = keyof typeof SPRU_STAGES;

/** 立ち姿(3/4)の元画像の高さ。ほかの画像はこれとの比で大きさをそろえる(素材集の中で縮尺が同じため) */
export const SPRU_STAND_HEIGHT = {stand};

/** 各画像の中のSの先の位置(つぼみ・花を重ねる)。種まきの画像は花が描かれているので無い */
export const SPRU_TIPS: Partial<Record<SpruImageKey, {{ x: number; y: number }}>> = {{
{tip_lines}
}};
""",
        encoding="utf-8",
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 tools/spru-assets/extract.py <素材集のフォルダ>")
    assets = Path(sys.argv[1])
    spec = json.loads((Path(__file__).parent / "crops.json").read_text(encoding="utf-8"))
    sources = {name: Image.open(assets / file).convert("RGBA") for name, file in spec["sources"].items()}

    images: dict = {}
    faces: dict = {}
    scenes: dict = {}
    tips: dict = {}
    for fig in spec["figures"]:
        img = cut_figure(sources[fig["source"]], fig["box"], fig.get("scale", 1.0), fig.get("mode", "largest"))
        images[fig["key"]] = save(img, f'{fig["group"]}/{fig["key"]}.webp')
        if fig.get("tip", True):
            tips[fig["key"]] = tip_of(img)
        if fig["group"] == "expressions":
            faces[fig["key"]] = save(face_of(img), f'faces/{fig["key"]}.webp')
    for scene in spec["scenes"]:
        img = sources[scene["source"]].convert("RGB").crop(tuple(scene["box"]))
        scenes[scene["key"]] = save(img, f'scenes/{scene["key"]}.webp')

    checker_cleared: dict = {}  # 格子を抜くのは重いので、元の絵ごとに1回だけ
    parts: dict = {}
    for group in (
        "bloom", "growth", "companions", "outing", "costumes", "badges", "stamps", "house", "items",
        "icons", "stages", "avatars", "travel", "pages",
    ):
        parts[group] = {}
        default_mode = "all" if group == "items" else "largest"
        for part in spec.get(group, []):
            src = sources[part["source"]]
            if part.get("background") == "flood":
                src = clear_background(src)
            elif part.get("background") == "checker":
                if part["source"] not in checker_cleared:
                    checker_cleared[part["source"]] = clear_checker(src)
                src = checker_cleared[part["source"]]
            img = cut_figure(src, part["box"], part.get("scale", 1.0), part.get("mode", default_mode))
            if "width" in part:
                img = img.resize((part["width"], round(img.height * part["width"] / img.width)), Image.LANCZOS)
            parts[group][part["key"]] = save(img, f'{group}/{part["key"]}.webp')

    write_ts(
        images, faces, scenes, parts["bloom"], parts["growth"], parts["companions"],
        parts["outing"], parts["costumes"], parts["badges"], parts["stamps"], parts["house"], parts["items"], tips,
        parts["icons"], parts["stages"], parts["avatars"], parts["travel"], parts["pages"],
    )
    print(
        f"画像 {len(images)}・顔 {len(faces)}・シーン {len(scenes)}・花 {len(parts['bloom'])}"
        f"・育つ絵 {len(parts['growth'])}・仲間 {len(parts['companions'])}"
        f"・お出かけ {len(parts['outing'])}・衣装 {len(parts['costumes'])}・バッジ {len(parts['badges'])}"
        f"・スタンプ {len(parts['stamps'])}・家 {len(parts['house'])}・アイテム {len(parts['items'])}"
        f"・アイコン {len(parts['icons'])}・ステージ {len(parts['stages'])}・アバター {len(parts['avatars'])}"
        f"・旅 {len(parts['travel'])}・ページ {len(parts['pages'])} を書き出しました"
    )


if __name__ == "__main__":
    main()
