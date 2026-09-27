#!/usr/bin/env python3
"""スプルの素材集(company/mascot/assets/)から、ゲームで使う画像を1体ずつ切り抜く。

使い方(リポジトリ直下で): python3 tools/spru-assets/extract.py ../../company/mascot/assets

- 切り抜く範囲は同じフォルダの crops.json に書く(素材集上のピクセル座標 [左, 上, 右, 下])
- 出力: frontend/public/spru/{group}/{key}.webp、表情の顔アイコン faces/、シーン scenes/、
  つぼみ・花 bloom/、畑の種・芽 garden/、仲間 companions/、リュックのスプル outing/、季節の衣装 costumes/、バッジ badges/、
  国のスタンプ stamps/(キーは国のコードの小文字)
- 画面側が読む一覧 frontend/src/components/spru/spru-assets.ts もここで書き出す(手で直さない)
- Spru Master(Blender)ができたら、同じキー・同じ置き場所の画像に差し替える
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/spru"
TS_OUT = ROOT / "frontend/src/components/spru/spru-assets.ts"
PAD = 8
CORE_ALPHA = 200  # これより不透明な所をキャラクター本体とみなす(区切り枠や名前の文字は半透明)
EDGE_ALPHA = 24  # 余白を詰めるときの透明度のしきい値
MIN_PART = 20  # mode "all" で残す塊の最小の大きさ(小さなごみを除く)
TIP_ALPHA = 128  # Sの先を探すときの不透明さのしきい値
TIP_ROWS = 6  # いちばん上から何行分の平均を、Sの先の横位置にするか


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
    images: dict, faces: dict, scenes: dict, bloom: dict, garden: dict, companions: dict,
    outing: dict, costumes: dict, badges: dict, stamps: dict, tips: dict,
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

export const GARDEN_IMAGES = {{
{entries(garden)}
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

export type SpruImageKey = keyof typeof SPRU_IMAGES;
export type SpruFaceKey = keyof typeof SPRU_FACES;
export type SpruSceneKey = keyof typeof SPRU_SCENES;
export type SpruBloomKey = keyof typeof SPRU_BLOOM;
export type GardenImageKey = keyof typeof GARDEN_IMAGES;
export type CompanionKey = keyof typeof COMPANION_IMAGES;
export type OutingKey = keyof typeof OUTING_IMAGES;
export type CostumeKey = keyof typeof COSTUME_IMAGES;
export type BadgeKey = keyof typeof BADGE_IMAGES;
export type StampKey = keyof typeof STAMP_IMAGES;

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

    parts: dict = {}
    for group in ("bloom", "garden", "companions", "outing", "costumes", "badges", "stamps"):
        parts[group] = {}
        for part in spec[group]:
            img = cut_figure(sources[part["source"]], part["box"], part.get("scale", 1.0), part.get("mode", "largest"))
            parts[group][part["key"]] = save(img, f'{group}/{part["key"]}.webp')

    write_ts(
        images, faces, scenes, parts["bloom"], parts["garden"], parts["companions"],
        parts["outing"], parts["costumes"], parts["badges"], parts["stamps"], tips,
    )
    print(
        f"画像 {len(images)}・顔 {len(faces)}・シーン {len(scenes)}・花 {len(parts['bloom'])}"
        f"・畑 {len(parts['garden'])}・仲間 {len(parts['companions'])}"
        f"・お出かけ {len(parts['outing'])}・衣装 {len(parts['costumes'])}・バッジ {len(parts['badges'])}"
        f"・スタンプ {len(parts['stamps'])} を書き出しました"
    )


if __name__ == "__main__":
    main()
