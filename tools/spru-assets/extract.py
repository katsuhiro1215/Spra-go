#!/usr/bin/env python3
"""スプルの素材集(company/mascot/assets/)から、ゲームで使う画像を1体ずつ切り抜く。

使い方(リポジトリ直下で): python3 tools/spru-assets/extract.py ../../company/mascot/assets

- 切り抜く範囲は同じフォルダの crops.json に書く(素材集上のピクセル座標 [左, 上, 右, 下])
- 出力: frontend/public/spru/{group}/{key}.webp、表情の顔アイコン frontend/public/spru/faces/{key}.webp、
  シーン frontend/public/spru/scenes/{key}.webp
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


def largest_component(mask: Image.Image) -> Image.Image:
    """二値マスクのうち一番大きい塊だけを残す(離れた効果線・zzz・きらきらを除く)"""
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    best: list[tuple[int, int]] = []
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
                if len(comp) > len(best):
                    best = comp
    out = Image.new("L", (w, h), 0)
    op = out.load()
    for x, y in best:
        op[x, y] = 255
    return out


def cut_figure(src: Image.Image, box: list[int], scale: float) -> Image.Image:
    x0, y0, x1, y1 = box
    crop = src.crop((x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD))
    alpha = crop.getchannel("A")
    core = largest_component(alpha.point(lambda v: 255 if v > CORE_ALPHA else 0))
    keep = core.filter(ImageFilter.MaxFilter(5))  # 輪郭のなめらかな半透明部分は残す
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


def write_ts(images: dict, faces: dict, scenes: dict) -> None:
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    stand = images["three-quarter"]["height"]
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

export type SpruImageKey = keyof typeof SPRU_IMAGES;
export type SpruFaceKey = keyof typeof SPRU_FACES;
export type SpruSceneKey = keyof typeof SPRU_SCENES;

/** 立ち姿(3/4)の元画像の高さ。ほかの画像はこれとの比で大きさをそろえる(素材集の中で縮尺が同じため) */
export const SPRU_STAND_HEIGHT = {stand};
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
    for fig in spec["figures"]:
        img = cut_figure(sources[fig["source"]], fig["box"], fig.get("scale", 1.0))
        images[fig["key"]] = save(img, f'{fig["group"]}/{fig["key"]}.webp')
        if fig["group"] == "expressions":
            faces[fig["key"]] = save(face_of(img), f'faces/{fig["key"]}.webp')
    for scene in spec["scenes"]:
        img = sources[scene["source"]].convert("RGB").crop(tuple(scene["box"]))
        scenes[scene["key"]] = save(img, f'scenes/{scene["key"]}.webp')

    write_ts(images, faces, scenes)
    print(f"画像 {len(images)}・顔 {len(faces)}・シーン {len(scenes)} を書き出しました")


if __name__ == "__main__":
    main()
