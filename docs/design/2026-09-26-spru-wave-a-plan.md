# スプルの表情・ポーズ、演出、時間帯と季節（A回）— 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** 町とクイズでスプルが場面ごとに表情・ポーズを変え、レベルアップ・ステージ開始の演出と、時間帯・季節で変わる町を作る。

**アーキテクチャ:** 素材集から切り抜いたWebP画像と、それを名前で引く一覧（スクリプトが生成）を用意する。「今の場面・時刻から、どの画像・吹き出しにするか」は画面から切り離した純粋な関数（`mood.ts`・`hint.ts`・`time-of-day.ts`）にまとめ、Vitestで確かめる。画面側（町・クイズ）はその結果を描くだけにする。サーバー側（Laravel）は変更しない。

**技術スタック:** Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest（新規）、Python 3 + Pillow（切り抜きスクリプト）

**設計書:** `docs/design/2026-09-26-spru-wave-a-design.md`（必ず併せて読むこと）

## 全体の制約

- サーバー側（`app/`・`routes/`・`database/`）は変更しない。バックエンドの既存テスト（134件）はすべて通ること
- 素材集は `/Users/katsuhiro.k1215/SmartSprouts/company/spra/mascot/assets/`（リポジトリの外）。切り抜いた画像と一覧はリポジトリに含める
- `frontend/src/components/spru/spru-assets.ts` は `tools/spru-assets/extract.py` が生成する。手で直さない
- スプルの吹き出しの言葉は設計書5章の文言どおり
- 画面に確認用の隠し機能を作らない。時刻を変えた確認はテスト用ブラウザの時計（Playwrightの `page.clock`）で行う
- ESLint（`react-hooks`）の規則: 描画中にrefの `.current` を読まない、effectの中で直接setStateしない（setInterval・setTimeout・非同期のコールバックの中はよい）。`useState(() => Date.now())` はよい
- 新しいUIのアイコンに絵文字を使わない。ドキュメント・コメントは日本語、コメントは「なぜ」が必要なときだけ1行
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/spru-wave-a`（作成済み）
- 開発サーバーはポート3000（`cd frontend && npm run dev -- -p 3000`）。バックエンドのCORSが3000だけを許可しているため、ログイン状態のブラウザ確認は3000で行う。3000が別プロジェクト（Tane）で使われているときはOwnerに相談する。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」

## レビューで特に見る点

1. **夜の眠りとほかの操作**: 22時以降、スプル以外（マス・アイテム・ナビ）をさわってもスプルは寝たままで、置く・動かすなどの操作は普通にできること（Task 4のブラウザ確認）
2. **開いたまま時刻をまたぐ**: 21:59に町を開いたまま22:00を過ぎると、1分以内にスプルが寝ること（Task 5のブラウザ確認、`page.clock`）
3. **最後の問題でのレベルアップ**: 最後の問題でレベルが上がったとき、結果画面の前にレベルアップの演出が出て、「つづける」で結果画面が正しく出ること（Task 6のブラウザ確認）
4. **「もう一度」**: 結果画面の「もう一度」で、ステージ開始のカードがもう一度出て、前回のレベルアップの演出が残っていないこと（Task 6のブラウザ確認）
5. **動きを減らす設定**: 季節の舞うものが出ず、スプルが跳ねたりゆれたりしないこと（Task 5のブラウザ確認）

## ファイル構成

**ツール（リポジトリ直下）**
- 作成: `tools/spru-assets/crops.json` — 切り抜く範囲の一覧
- 作成: `tools/spru-assets/extract.py` — 切り抜いてWebPと一覧（TS）を書き出す

**フロントエンド（`frontend/`）**
- 変更: `package.json`・`package-lock.json`（Vitest）
- 作成: `vitest.config.mts`
- 作成: `public/spru/{basic,expressions,actions,faces,scenes}/*.webp`（スクリプトが生成）
- 削除: `public/spru/idle.png`・`joy.png`・`front.png`
- 作成: `src/components/spru/spru-assets.ts`（スクリプトが生成）
- 作成: `src/components/spru/spru-figure.tsx` — `SpruFigure`・`SpruFace`
- 作成: `src/components/spru/mood.ts`・`mood.test.ts` — 町・クイズの出し分け
- 作成: `src/components/spru/hint.ts`・`hint.test.ts` — タップしたときのひとこと
- 作成: `src/components/world/time-of-day.ts`・`time-of-day.test.ts`
- 作成: `src/components/world/ambience.tsx` — 時間帯の配色・星・季節の舞うもの
- 変更: `src/components/world/world-scene.tsx`・`world-screen.tsx`・`world-hud.tsx`・`welcome-gift.tsx`・`landmark-art.tsx`・`item-art.tsx`
- 作成: `src/components/quiz/level-up-overlay.tsx`・`stage-start-card.tsx`
- 変更: `src/app/quiz/[stageId]/page.tsx`
- 変更: `src/app/globals.css`

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`・`/Users/katsuhiro.k1215/SmartSprouts/company/spra/mascot/CLAUDE.md`

---

### Task 1: Vitestの導入と、時間帯・季節の計算

**Files:**
- Modify: `frontend/package.json`・`frontend/package-lock.json`
- Create: `frontend/vitest.config.mts`
- Create: `frontend/src/components/world/time-of-day.ts`
- Test: `frontend/src/components/world/time-of-day.test.ts`

**Interfaces:**
- Produces: `type TimeOfDay = "morning" | "day" | "evening" | "night"`、`type Season = "spring" | "summer" | "autumn" | "winter"`、`getTimeOfDay(date: Date): TimeOfDay`、`getSeason(date: Date): Season`、`isSpruSleepTime(date: Date): boolean`、`npm test`（`vitest run`）

- [ ] **Step 1: Vitestを入れる**

```bash
cd frontend && npm install -D vitest vite-tsconfig-paths
```

`frontend/package.json` の `scripts` に1行足す（`"typecheck"` の次）:

```json
    "test": "vitest run"
```

`frontend/vitest.config.mts`:

```ts
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// 画面を描かない計算だけをテストするため、ブラウザの代わり(jsdom)は使わない
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: 失敗するテストを書く**

`frontend/src/components/world/time-of-day.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getSeason, getTimeOfDay, isSpruSleepTime, type Season, type TimeOfDay } from "./time-of-day";

const at = (hour: number, minute = 0) => new Date(2026, 8, 26, hour, minute);
const inMonth = (month: number) => new Date(2026, month - 1, 15, 12, 0);

describe("getTimeOfDay", () => {
  it.each<[number, number, TimeOfDay]>([
    [4, 59, "night"],
    [5, 0, "morning"],
    [9, 59, "morning"],
    [10, 0, "day"],
    [15, 59, "day"],
    [16, 0, "evening"],
    [18, 59, "evening"],
    [19, 0, "night"],
    [0, 0, "night"],
  ])("%i:%i は %s", (hour, minute, expected) => {
    expect(getTimeOfDay(at(hour, minute))).toBe(expected);
  });
});

describe("getSeason", () => {
  it.each<[number, Season]>([
    [2, "winter"],
    [3, "spring"],
    [5, "spring"],
    [6, "summer"],
    [8, "summer"],
    [9, "autumn"],
    [11, "autumn"],
    [12, "winter"],
    [1, "winter"],
  ])("%i月は %s", (month, expected) => {
    expect(getSeason(inMonth(month))).toBe(expected);
  });
});

describe("isSpruSleepTime", () => {
  it.each<[number, number, boolean]>([
    [21, 59, false],
    [22, 0, true],
    [3, 0, true],
    [5, 59, true],
    [6, 0, false],
    [19, 30, false],
  ])("%i:%i は %s", (hour, minute, expected) => {
    expect(isSpruSleepTime(at(hour, minute))).toBe(expected);
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `cd frontend && npm test`
Expected: FAIL（`./time-of-day` が見つからない）

- [ ] **Step 4: 実装する**

`frontend/src/components/world/time-of-day.ts`:

```ts
export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

// 端末の時計で決める(設計書7章)。境目の時刻はここだけで持つ
export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

// 今は日本の季節に合わせている。南半球の国は海外展開のときに見直す(TASKS.md)
export function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/** スプルが寝ている時間(22:00〜5:59)。夜の19〜22時は起きている */
export function isSpruSleepTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `cd frontend && npm test && npx tsc --noEmit`
Expected: PASS（24件）、型エラーなし

- [ ] **Step 6: コミット**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.mts frontend/src/components/world/time-of-day.ts frontend/src/components/world/time-of-day.test.ts
git commit -m "$(cat <<'EOF'
#NNNNN: feature:フロントエンドにVitestを導入し、時間帯・季節・スプルの寝る時間の計算を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: スプルの素材を切り抜く

**Files:**
- Create: `tools/spru-assets/crops.json`、`tools/spru-assets/extract.py`
- Create（生成）: `frontend/public/spru/{basic,expressions,actions,faces,scenes}/*.webp`、`frontend/src/components/spru/spru-assets.ts`

**Interfaces:**
- Produces: `SPRU_IMAGES`（キー: `front`・`three-quarter`・`normal`・`smile`・`laugh`・`surprised`・`think`・`effort`・`happy`・`sad`・`cry`・`shy`・`excited`・`walk`・`run`・`jump`・`wave`・`sit`・`sleep`・`startled`・`cheer`・`dash`・`palms`）、`SPRU_FACES`（表情11と同じキー）、`SPRU_SCENES`（`challenge`・`grow`）、各値は `{ src: string; width: number; height: number }`、`type SpruImageKey`・`SpruFaceKey`・`SpruSceneKey`、`SPRU_STAND_HEIGHT: number`（`three-quarter` の高さ）

- [ ] **Step 1: 切り抜く範囲の一覧を作る**

座標は素材集上のピクセル（[左, 上, 右, 下]）。mascot-6は透明度から検出した各キャラクターの外枠で、名前の文字（各枠の下）は含まない。

`tools/spru-assets/crops.json`:

```json
{
  "sources": {
    "m4": "mascot-4.png",
    "m6": "mascot-6.png",
    "logo": "mascot-logo.png"
  },
  "figures": [
    { "key": "front", "group": "basic", "source": "m6", "box": [30, 48, 158, 258] },
    { "key": "three-quarter", "group": "basic", "source": "m6", "box": [174, 54, 288, 258] },
    { "key": "normal", "group": "expressions", "source": "m6", "box": [32, 342, 160, 520] },
    { "key": "smile", "group": "expressions", "source": "m6", "box": [180, 328, 308, 520] },
    { "key": "laugh", "group": "expressions", "source": "m6", "box": [330, 328, 460, 522] },
    { "key": "surprised", "group": "expressions", "source": "m6", "box": [480, 330, 608, 520] },
    { "key": "think", "group": "expressions", "source": "m6", "box": [634, 324, 764, 522] },
    { "key": "effort", "group": "expressions", "source": "m6", "box": [786, 328, 916, 524] },
    { "key": "happy", "group": "expressions", "source": "m6", "box": [942, 328, 1076, 524] },
    { "key": "sad", "group": "expressions", "source": "m6", "box": [1100, 334, 1222, 524] },
    { "key": "cry", "group": "expressions", "source": "m6", "box": [1246, 330, 1374, 522] },
    { "key": "shy", "group": "expressions", "source": "m6", "box": [1394, 320, 1516, 522] },
    { "key": "excited", "group": "expressions", "source": "m4", "box": [351, 46, 490, 264], "scale": 0.82 },
    { "key": "walk", "group": "actions", "source": "m6", "box": [40, 592, 140, 758] },
    { "key": "run", "group": "actions", "source": "m6", "box": [176, 594, 270, 758] },
    { "key": "jump", "group": "actions", "source": "m6", "box": [290, 576, 404, 748] },
    { "key": "wave", "group": "actions", "source": "m6", "box": [464, 576, 574, 758] },
    { "key": "sit", "group": "actions", "source": "m6", "box": [624, 594, 734, 764] },
    { "key": "sleep", "group": "actions", "source": "m6", "box": [770, 654, 904, 760] },
    { "key": "startled", "group": "actions", "source": "m6", "box": [952, 590, 1058, 760] },
    { "key": "cheer", "group": "actions", "source": "m6", "box": [1094, 590, 1212, 758] },
    { "key": "dash", "group": "actions", "source": "m6", "box": [1256, 604, 1358, 754] },
    { "key": "palms", "group": "actions", "source": "m6", "box": [1406, 584, 1506, 756] }
  ],
  "scenes": [
    { "key": "challenge", "source": "logo", "box": [284, 930, 502, 1098] },
    { "key": "grow", "source": "logo", "box": [750, 925, 930, 1100] }
  ]
}
```

（`excited` は mascot-4 の「わくわく」。mascot-4 は mascot-6 より大きく描かれているため `scale` で縮尺をそろえる）

- [ ] **Step 2: 切り抜きスクリプトを作る**

`tools/spru-assets/extract.py`:

```python
#!/usr/bin/env python3
"""スプルの素材集(company/spra/mascot/assets/)から、ゲームで使う画像を1体ずつ切り抜く。

使い方(リポジトリ直下で): python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets

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
```

- [ ] **Step 3: スクリプトを実行する**

Run（リポジトリ直下で）: `python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets`
Expected: `画像 23・顔 11・シーン 2 を書き出しました`

- [ ] **Step 4: 出来上がりを確かめる**

Run:

```bash
find frontend/public/spru -name '*.webp' | wc -l
du -sh frontend/public/spru
cd frontend && npx tsc --noEmit
```

Expected: 36ファイル、合計500KB未満、型エラーなし

目で確かめるため、紺色の背景に全部並べた一覧を作って見る（欠け・枠の残り・文字の混入が無いこと）:

```bash
python3 - <<'EOF'
from pathlib import Path
from PIL import Image
files = sorted(Path("frontend/public/spru").rglob("*.webp"))
sheet = Image.new("RGBA", (1400, 760), (34, 52, 84, 255))
x, y, row_h = 8, 8, 0
for f in files:
    im = Image.open(f).convert("RGBA")
    if x + im.width > 1392:
        x, y, row_h = 8, y + row_h + 8, 0
    sheet.alpha_composite(im, (x, y))
    x, row_h = x + im.width + 8, max(row_h, im.height)
sheet.save("/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/spru-assets-check.png")
EOF
```

`/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/spru-assets-check.png` をReadツールで開いて確認し、確認後に削除する。

- [ ] **Step 5: コミット**

```bash
git add tools/spru-assets frontend/public/spru frontend/src/components/spru/spru-assets.ts
git commit -m "$(cat <<'EOF'
#NNNNN: feature:スプルの表情・ポーズ・顔アイコン・シーン画像を素材集から切り抜くスクリプトと画像を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: スプルの出し分けと、タップしたときのひとこと

**Files:**
- Create: `frontend/src/components/spru/mood.ts`、`frontend/src/components/spru/hint.ts`
- Test: `frontend/src/components/spru/mood.test.ts`、`frontend/src/components/spru/hint.test.ts`

**Interfaces:**
- Consumes: Task 1 の `getTimeOfDay`・`isSpruSleepTime`・`TimeOfDay`、Task 2 の `SpruImageKey`・`SpruFaceKey`・`SPRU_FACES`、既存の `ShopListItem`・`WorldItem`（`components/world/types.ts`）
- Produces:
  - `type TownEvent`（`kind`: `greet`・`placed`・`stored`・`error`・`welcome`・`tap`・`woke`。`at: number`（ミリ秒）。`placed`・`stored` は `itemName`、`tap` は `image: "shy" | "laugh" | "cheer"` と `hint`）
  - `type SpruView = { image: SpruImageKey; face: SpruFaceKey; line: string; sleeping: boolean }`
  - `type TownMoodInput = { now: number; lastInteractionAt: number; event: TownEvent | null; nightWokenAt: number | null; placing: boolean }`
  - `pickTownMood(input: TownMoodInput): SpruView`
  - `pickAnswerImage({ correct, combo, comboBonus }): SpruImageKey`、`pickResult(score, total): { image: SpruImageKey; line: string | null }`
  - 定数 `IDLE_SIT_MS`（30000）・`IDLE_SLEEP_MS`（90000）・`NIGHT_AWAKE_MS`（60000）・`EVENT_LINE_MS`（8000）
  - `pickTownHint({ bag, points, level, shop }): string`

- [ ] **Step 1: 失敗するテストを書く（出し分け）**

`frontend/src/components/spru/mood.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  EVENT_LINE_MS,
  IDLE_SIT_MS,
  IDLE_SLEEP_MS,
  NIGHT_AWAKE_MS,
  pickAnswerImage,
  pickResult,
  pickTownMood,
  type TownMoodInput,
} from "./mood";

// 2026-09-26のローカル時刻(ミリ秒)
const t = (hour: number, minute = 0, second = 0) => new Date(2026, 8, 26, hour, minute, second).getTime();
const input = (overrides: Partial<TownMoodInput> = {}): TownMoodInput => ({
  now: t(12),
  lastInteractionAt: t(12),
  event: null,
  nightWokenAt: null,
  placing: false,
  ...overrides,
});

describe("pickTownMood", () => {
  it("ふだんは3/4の立ち姿で、時間帯のあいさつを言う", () => {
    expect(pickTownMood(input())).toEqual({
      image: "three-quarter",
      face: "normal",
      line: "こんにちは！今日もいっしょに学ぼう",
      sleeping: false,
    });
    expect(pickTownMood(input({ now: t(7), lastInteractionAt: t(7) })).line).toBe("おはよう！今日もいっしょに学ぼう");
    expect(pickTownMood(input({ now: t(17), lastInteractionAt: t(17) })).line).toBe("おかえり！もうひとがんばりしよう");
    expect(pickTownMood(input({ now: t(20), lastInteractionAt: t(20) })).line).toBe(
      "こんばんは！寝る前にちょっとだけ学ぼう",
    );
  });

  it("町を開いた直後は手を振り、2.5秒で立ち姿に戻る", () => {
    const event = { kind: "greet" as const, at: t(12) };
    expect(pickTownMood(input({ event, now: t(12) + 2_499 }))).toMatchObject({ image: "wave", face: "happy" });
    expect(pickTownMood(input({ event, now: t(12) + 2_500 })).image).toBe("three-quarter");
  });

  it("置いたらジャンプし、2.6秒後は立ち姿に戻るが、吹き出しは8秒まで残る", () => {
    const event = { kind: "placed" as const, at: t(12), itemName: "ベンチ" };
    expect(pickTownMood(input({ event, now: t(12) + 1_000 }))).toEqual({
      image: "jump",
      face: "happy",
      line: "ベンチを置いたよ！町がにぎやかになったね",
      sleeping: false,
    });
    expect(pickTownMood(input({ event, now: t(12) + 2_600 }))).toMatchObject({
      image: "three-quarter",
      line: "ベンチを置いたよ！町がにぎやかになったね",
    });
    expect(pickTownMood(input({ event, now: t(12) + EVENT_LINE_MS })).line).toBe("こんにちは！今日もいっしょに学ぼう");
  });

  it("しまったら手を合わせ、通信エラーはがっかり、初回プレゼントはジャンプ", () => {
    expect(pickTownMood(input({ event: { kind: "stored", at: t(12), itemName: "花だん" } }))).toMatchObject({
      image: "palms",
      face: "smile",
      line: "花だんをバッグにしまったよ",
    });
    expect(pickTownMood(input({ event: { kind: "error", at: t(12) } }))).toMatchObject({
      image: "sad",
      face: "sad",
      line: "うまくいかなかった…もう一度ためしてね",
    });
    expect(pickTownMood(input({ event: { kind: "welcome", at: t(12) } }))).toMatchObject({
      image: "jump",
      line: "ポイントでショップのアイテムを買ってみよう！",
    });
  });

  it("タップしたときは選ばれた画像とひとことを出す", () => {
    const event = { kind: "tap" as const, at: t(12), image: "shy" as const, hint: "つづきから学ぼう！" };
    expect(pickTownMood(input({ event }))).toEqual({
      image: "shy",
      face: "shy",
      line: "つづきから学ぼう！",
      sleeping: false,
    });
  });

  it("30秒さわらないと座り、90秒で寝る", () => {
    const at = (idle: number) => pickTownMood(input({ now: t(12) + idle, lastInteractionAt: t(12) }));
    expect(at(IDLE_SIT_MS - 1).image).toBe("three-quarter");
    expect(at(IDLE_SIT_MS)).toMatchObject({ image: "sit", face: "smile", line: "ひと休み…", sleeping: false });
    expect(at(IDLE_SLEEP_MS - 1).image).toBe("sit");
    expect(at(IDLE_SLEEP_MS)).toEqual({ image: "sleep", face: "normal", line: "すやすや…", sleeping: true });
  });

  it("置く場所を選んでいる間は、さわらなくても座らず、わくわく顔で案内する", () => {
    expect(pickTownMood(input({ placing: true, now: t(12) + IDLE_SLEEP_MS, lastInteractionAt: t(12) }))).toEqual({
      image: "three-quarter",
      face: "excited",
      line: "どこに置く？光っているマスをタップしてね",
      sleeping: false,
    });
  });

  it("22時からは最初から寝ていて、町を開いたときのあいさつより眠りが優先される", () => {
    const event = { kind: "greet" as const, at: t(22) };
    expect(pickTownMood(input({ event, now: t(22), lastInteractionAt: t(22) }))).toMatchObject({
      image: "sleep",
      sleeping: true,
    });
    expect(pickTownMood(input({ now: t(21, 59), lastInteractionAt: t(21, 59) })).sleeping).toBe(false);
  });

  it("夜にスプルを起こすと1分間は起きていて、さわらないまま1分たつとまた寝る", () => {
    const woke = t(23);
    const at = (idle: number) =>
      pickTownMood(input({ now: woke + idle, lastInteractionAt: woke, nightWokenAt: woke }));
    expect(at(NIGHT_AWAKE_MS - 1).sleeping).toBe(false);
    expect(at(NIGHT_AWAKE_MS).sleeping).toBe(true);
  });

  it("起こしたときは驚き、夜と昼で言葉が変わる", () => {
    expect(pickTownMood(input({ event: { kind: "woke", at: t(12) } }))).toMatchObject({
      image: "startled",
      face: "surprised",
      line: "わっ、びっくりした！",
    });
    const night = t(23);
    expect(
      pickTownMood(input({ now: night, lastInteractionAt: night, nightWokenAt: night, event: { kind: "woke", at: night } })),
    ).toMatchObject({ image: "startled", line: "ふぁ…まだ起きてたの？" });
  });

  it("できごとは夜の眠りより優先される(夜でも置いたらジャンプする)", () => {
    const night = t(23);
    expect(
      pickTownMood(input({ now: night, lastInteractionAt: night, event: { kind: "placed", at: night, itemName: "木" } })),
    ).toMatchObject({ image: "jump", sleeping: false });
  });
});

describe("pickAnswerImage", () => {
  it("正解はうれしい、2コンボ以上は大笑い、ボーナスは応援、不正解はがっかり", () => {
    expect(pickAnswerImage({ correct: true, combo: 1, comboBonus: 0 })).toBe("happy");
    expect(pickAnswerImage({ correct: true, combo: 2, comboBonus: 0 })).toBe("laugh");
    expect(pickAnswerImage({ correct: true, combo: 5, comboBonus: 20 })).toBe("cheer");
    expect(pickAnswerImage({ correct: false, combo: 0, comboBonus: 0 })).toBe("sad");
  });
});

describe("pickResult", () => {
  it("全問正解はジャンプ、半分以上はにっこり、それ未満は頑張る", () => {
    expect(pickResult(10, 10)).toEqual({ image: "jump", line: null });
    expect(pickResult(5, 10)).toEqual({ image: "smile", line: null });
    expect(pickResult(4, 10)).toEqual({ image: "effort", line: "次はもっとできるよ！" });
  });
});
```

- [ ] **Step 2: 失敗するテストを書く（ひとこと）**

`frontend/src/components/spru/hint.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { ShopListItem, WorldItem } from "@/components/world/types";

import { pickTownHint } from "./hint";

const item = (name: string, price: number, minLevel: number, id = price * 100 + minLevel): ShopListItem => ({
  id,
  name,
  price,
  type: "decoration",
  currency: "point",
  min_level: minLevel,
  asset_key: "bench",
  locked: false,
  meta: { asset_key: "bench" },
});
const bagItem = (name: string): WorldItem => ({ id: 1, shop_item_id: 1, name, asset_key: "bench", x: null, y: null });
const shop = [item("ベンチ", 30, 1), item("花だん", 20, 1), item("木", 30, 2)];

describe("pickTownHint", () => {
  it("バッグにアイテムがあれば、置くようにすすめる", () => {
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 1, shop })).toBe(
      "バッグにちょうちんがあるよ。町に置いてみよう",
    );
  });

  it("今のポイントで買える解放済みのアイテムがあれば、いちばん安いものをすすめる", () => {
    expect(pickTownHint({ bag: [], points: 25, level: 1, shop })).toBe("花だんが買えるよ！ショップをのぞいてみよう");
  });

  it("ポイントが足りなければ、いちばん安いアイテムまでの差を言う", () => {
    expect(pickTownHint({ bag: [], points: 5, level: 1, shop })).toBe("あと15ptで花だんが買えるよ");
  });

  it("解放済みのアイテムが無ければ、次に解放されるアイテムを言う", () => {
    expect(pickTownHint({ bag: [], points: 0, level: 1, shop: [item("屋台", 120, 12), item("木", 30, 2)] })).toBe(
      "Lv.2で木が買えるようになるよ",
    );
  });

  it("町のアイテムが1つも無ければ、学ぶようにすすめる", () => {
    expect(pickTownHint({ bag: [], points: 0, level: 1, shop: [] })).toBe("つづきから学ぼう！");
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `cd frontend && npm test`
Expected: FAIL（`./mood`・`./hint` が見つからない）

- [ ] **Step 4: 出し分けを実装する**

`frontend/src/components/spru/mood.ts`:

```ts
import { getTimeOfDay, isSpruSleepTime, type TimeOfDay } from "@/components/world/time-of-day";

import { SPRU_FACES, type SpruFaceKey, type SpruImageKey } from "./spru-assets";

export type TownEvent =
  | { kind: "greet"; at: number }
  | { kind: "placed" | "stored"; at: number; itemName: string }
  | { kind: "error" | "welcome" | "woke"; at: number }
  | { kind: "tap"; at: number; image: "shy" | "laugh" | "cheer"; hint: string };

export type SpruView = { image: SpruImageKey; face: SpruFaceKey; line: string; sleeping: boolean };

export type TownMoodInput = {
  now: number;
  lastInteractionAt: number;
  event: TownEvent | null;
  nightWokenAt: number | null;
  placing: boolean;
};

export const IDLE_SIT_MS = 30_000;
export const IDLE_SLEEP_MS = 90_000;
export const NIGHT_AWAKE_MS = 60_000;
// 吹き出しはできごとから8秒間そのできごとの言葉を出し、その後ふだんの言葉に戻る
export const EVENT_LINE_MS = 8_000;

const EVENT_IMAGE_MS: Record<TownEvent["kind"], number> = {
  greet: 2_500,
  placed: 2_600,
  stored: 2_600,
  error: 2_600,
  welcome: 2_600,
  tap: 2_600,
  woke: 1_500,
};

const GREETINGS: Record<TimeOfDay, string> = {
  morning: "おはよう！今日もいっしょに学ぼう",
  day: "こんにちは！今日もいっしょに学ぼう",
  evening: "おかえり！もうひとがんばりしよう",
  night: "こんばんは！寝る前にちょっとだけ学ぼう",
};

// アクションの画像には対応する表情が無いため、吹き出しの顔アイコンを対応づける
const FACE_FOR_IMAGE: Partial<Record<SpruImageKey, SpruFaceKey>> = {
  front: "normal",
  "three-quarter": "normal",
  wave: "happy",
  jump: "happy",
  cheer: "happy",
  palms: "smile",
  sit: "smile",
  sleep: "normal",
  startled: "surprised",
};

function faceFor(image: SpruImageKey): SpruFaceKey {
  return FACE_FOR_IMAGE[image] ?? (image in SPRU_FACES ? (image as SpruFaceKey) : "normal");
}

function eventImage(event: TownEvent): SpruImageKey {
  switch (event.kind) {
    case "greet":
      return "wave";
    case "placed":
    case "welcome":
      return "jump";
    case "stored":
      return "palms";
    case "error":
      return "sad";
    case "woke":
      return "startled";
    case "tap":
      return event.image;
  }
}

function eventLine(event: TownEvent, date: Date): string {
  switch (event.kind) {
    case "greet":
      return GREETINGS[getTimeOfDay(date)];
    case "placed":
      return `${event.itemName}を置いたよ！町がにぎやかになったね`;
    case "stored":
      return `${event.itemName}をバッグにしまったよ`;
    case "error":
      return "うまくいかなかった…もう一度ためしてね";
    case "welcome":
      return "ポイントでショップのアイテムを買ってみよう！";
    case "woke":
      return isSpruSleepTime(date) ? "ふぁ…まだ起きてたの？" : "わっ、びっくりした！";
    case "tap":
      return event.hint;
  }
}

/** 町のスプルの画像・顔・吹き出し。優先順位は できごと → 夜の眠り → さわらない時間 → ふだん(設計書5-1) */
export function pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing }: TownMoodInput): SpruView {
  const date = new Date(now);
  const idleMs = now - lastInteractionAt;
  const nightAwake = nightWokenAt !== null && idleMs < NIGHT_AWAKE_MS;
  const nightSleeping = isSpruSleepTime(date) && !nightAwake;
  // 夜は最初から寝ているため、町を開いたときのあいさつだけは夜の眠りより弱い
  const activeEvent = event && !(event.kind === "greet" && nightSleeping) ? event : null;
  const eventAge = activeEvent ? now - activeEvent.at : Infinity;

  if (activeEvent && eventAge < EVENT_IMAGE_MS[activeEvent.kind]) {
    const image = eventImage(activeEvent);
    return { image, face: faceFor(image), line: eventLine(activeEvent, date), sleeping: false };
  }
  if (nightSleeping || (!placing && idleMs >= IDLE_SLEEP_MS)) {
    return { image: "sleep", face: "normal", line: "すやすや…", sleeping: true };
  }
  if (!placing && idleMs >= IDLE_SIT_MS) {
    return { image: "sit", face: "smile", line: "ひと休み…", sleeping: false };
  }
  if (placing) {
    return { image: "three-quarter", face: "excited", line: "どこに置く？光っているマスをタップしてね", sleeping: false };
  }
  const line = activeEvent && eventAge < EVENT_LINE_MS ? eventLine(activeEvent, date) : GREETINGS[getTimeOfDay(date)];
  return { image: "three-quarter", face: "normal", line, sleeping: false };
}

/** クイズの正解・不正解の画面のスプル(設計書5-3。不正解に泣き顔は使わない) */
export function pickAnswerImage({
  correct,
  combo,
  comboBonus,
}: {
  correct: boolean;
  combo: number;
  comboBonus: number;
}): SpruImageKey {
  if (!correct) return "sad";
  if (comboBonus > 0) return "cheer";
  if (combo >= 2) return "laugh";
  return "happy";
}

export function pickResult(score: number, total: number): { image: SpruImageKey; line: string | null } {
  if (total > 0 && score === total) return { image: "jump", line: null };
  if (score * 2 >= total) return { image: "smile", line: null };
  return { image: "effort", line: "次はもっとできるよ！" };
}
```

- [ ] **Step 5: ひとことを実装する**

`frontend/src/components/spru/hint.ts`:

```ts
import type { ShopListItem, WorldItem } from "@/components/world/types";

/** スプルをタップしたときのひとこと。上から順に最初に当てはまるもの(設計書5-2) */
export function pickTownHint({
  bag,
  points,
  level,
  shop,
}: {
  bag: WorldItem[];
  points: number;
  level: number;
  shop: ShopListItem[];
}): string {
  if (bag.length > 0) return `バッグに${bag[0].name}があるよ。町に置いてみよう`;

  const decorations = shop.filter((item) => item.type === "decoration");
  const unlocked = decorations.filter((item) => item.min_level <= level).sort((a, b) => a.price - b.price);
  const affordable = unlocked.find((item) => item.price <= points);
  if (affordable) return `${affordable.name}が買えるよ！ショップをのぞいてみよう`;
  if (unlocked.length > 0) return `あと${unlocked[0].price - points}ptで${unlocked[0].name}が買えるよ`;

  const nextLocked = decorations
    .filter((item) => item.min_level > level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  if (nextLocked) return `Lv.${nextLocked.min_level}で${nextLocked.name}が買えるようになるよ`;

  return "つづきから学ぼう！";
}
```

- [ ] **Step 6: テストが通ることを確認する**

Run: `cd frontend && npm test && npx tsc --noEmit && npx eslint src/components/spru`
Expected: PASS（Task 1の24件＋出し分け13件＋ひとこと5件＝42件）、型エラー・lintエラーなし

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/spru/mood.ts frontend/src/components/spru/mood.test.ts frontend/src/components/spru/hint.ts frontend/src/components/spru/hint.test.ts
git commit -m "$(cat <<'EOF'
#NNNNN: feature:スプルの表情・ポーズ・吹き出しを場面と時刻から決める計算と、タップしたときのひとことを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 町のスプルを出し分ける

**Files:**
- Create: `frontend/src/components/spru/spru-figure.tsx`
- Modify: `frontend/src/components/world/world-scene.tsx`、`world-screen.tsx`、`world-hud.tsx`、`welcome-gift.tsx`
- Delete: `frontend/public/spru/idle.png`・`joy.png`・`front.png`

**Interfaces:**
- Consumes: Task 3 の `pickTownMood`・`TownEvent`・`SpruView`・`pickTownHint`、Task 2 の `SPRU_IMAGES`・`SPRU_FACES`・`SPRU_STAND_HEIGHT`、Task 1 の `isSpruSleepTime`
- Produces: `SpruFigure({ image, standHeight, alt?, className? })`、`SpruFace({ face, size, className? })`、`WorldScene` の新しいprops `{ land, items, validTiles, placing, onTileTap, onItemTap, spru: SpruView, onSpruTap, timeOfDay: TimeOfDay, poppedItemId }`（`timeOfDay` はTask 5で使う。このタスクでは受け取るだけ）

- [ ] **Step 1: スプルを出す部品を作る**

`frontend/src/components/spru/spru-figure.tsx`:

```tsx
import Image from "next/image";

import { SPRU_FACES, SPRU_IMAGES, SPRU_STAND_HEIGHT, type SpruFaceKey, type SpruImageKey } from "./spru-assets";

/**
 * HTMLの中でスプルを出す(クイズ・演出用)。standHeight は立ち姿のときの高さ(px)で、
 * 座る・寝るなどほかの画像は素材集の縮尺どおりに大きさをそろえる
 */
export function SpruFigure({
  image,
  standHeight,
  alt = "",
  className,
}: {
  image: SpruImageKey;
  standHeight: number;
  alt?: string;
  className?: string;
}) {
  const asset = SPRU_IMAGES[image];
  const scale = standHeight / SPRU_STAND_HEIGHT;
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={Math.round(asset.width * scale)}
      height={Math.round(asset.height * scale)}
      className={className}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}

/** 丸い顔アイコン(吹き出しの横・アバター用) */
export function SpruFace({ face, size, className }: { face: SpruFaceKey; size: number; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-[#fff4df] ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image src={SPRU_FACES[face].src} alt="" width={size} height={size} aria-hidden />
    </span>
  );
}
```

- [ ] **Step 2: 町の描画を変える**

`frontend/src/components/world/world-scene.tsx` を次の内容にする（スプルの画像を一覧から引く、スプルのボタン、吹き出しの顔アイコン。時間帯の見た目はTask 5で足す）:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import type { SpruView } from "@/components/spru/mood";
import { SPRU_IMAGES, SPRU_STAND_HEIGHT } from "@/components/spru/spru-assets";
import { SpruFace } from "@/components/spru/spru-figure";

import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ItemArt } from "./item-art";
import { LandmarkArt } from "./landmark-art";
import type { TimeOfDay } from "./time-of-day";
import type { WorldItem, WorldLand } from "./types";

// 町の中のスプルの立ち姿の高さ(SVGの単位)。座る・寝るは素材集の縮尺どおりにそろえる
const TOWN_STAND_HEIGHT = 58;

type SceneObject =
  | { kind: "landmark"; id: string; x: number; y: number; landmarkKey: string }
  | { kind: "item"; id: string; x: number; y: number; item: WorldItem }
  | { kind: "spru"; id: string; x: number; y: number };

export function WorldScene({
  land,
  items,
  validTiles,
  placing,
  onTileTap,
  onItemTap,
  spru,
  onSpruTap,
  timeOfDay,
  poppedItemId,
}: {
  land: WorldLand;
  items: WorldItem[];
  validTiles: Set<string>;
  placing: boolean;
  onTileTap: (x: number, y: number) => void;
  onItemTap: (item: WorldItem) => void;
  spru: SpruView;
  onSpruTap: () => void;
  timeOfDay: TimeOfDay;
  poppedItemId: number | null;
}) {
  void timeOfDay;
  const vb = sceneViewBox(land.size);
  const n = land.size;
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);

  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) tiles.push({ x, y });
  }

  // 奥(x+yが小さい)から手前へ描くことで、手前の物が奥の物に重なる
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i) => ({ kind: "landmark" as const, id: `landmark-${i}`, x: l.x, y: l.y, landmarkKey: l.key })),
    ...placed.map((item) => ({ kind: "item" as const, id: `item-${item.id}`, x: item.x, y: item.y, item })),
    { kind: "spru" as const, id: "spru", x: land.spru.x, y: land.spru.y },
  ].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);

  const left = { x: -n * HALF_W, y: n * HALF_H };
  const bottom = { x: 0, y: n * HALF_H * 2 };
  const right = { x: n * HALF_W, y: n * HALF_H };
  const spruCenter = tileCenter(land.spru.x, land.spru.y);
  const bubble = toPercent(spruCenter.sx, spruCenter.sy - 60, vb);

  const spruAsset = SPRU_IMAGES[spru.image];
  const spruScale = TOWN_STAND_HEIGHT / SPRU_STAND_HEIGHT;
  const spruW = spruAsset.width * spruScale;
  const spruH = spruAsset.height * spruScale;
  const spruMotion = spru.sleeping ? undefined : spru.image === "jump" ? "animate-spru-hop" : "animate-spru-bob";

  const boxStyle = (sx: number, sy: number, halfWidth: number, up: number, down: number) => {
    const topLeft = toPercent(sx - halfWidth, sy - up, vb);
    return {
      left: `${topLeft.left}%`,
      top: `${topLeft.top}%`,
      width: `${((halfWidth * 2) / vb.width) * 100}%`,
      height: `${((up + down) / vb.height) * 100}%`,
    };
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: `${vb.width} / ${vb.height}` }}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon
          points={`${left.x},${left.y + 50} ${bottom.x},${bottom.y + 50} ${right.x},${right.y + 50} 0,50`}
          fill="#62b8d6"
          opacity={0.55}
        />
        <polygon
          points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + LAND_THICKNESS} ${left.x},${left.y + LAND_THICKNESS}`}
          fill="#d7a574"
        />
        <polygon
          points={`${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + LAND_THICKNESS} ${bottom.x},${bottom.y + LAND_THICKNESS}`}
          fill="#bf8a5b"
        />
        <polygon points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + 7} ${left.x},${left.y + 7}`} fill="#86c56d" />
        <polygon points={`${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + 7} ${bottom.x},${bottom.y + 7}`} fill="#74b35d" />
        <path
          d={`M${left.x} ${left.y + LAND_THICKNESS} L${bottom.x} ${bottom.y + LAND_THICKNESS} L${right.x} ${right.y + LAND_THICKNESS}`}
          stroke="#e6f7fb"
          strokeWidth={3}
          fill="none"
        />

        {tiles.map(({ x, y }) => {
          const key = tileKey(x, y);
          const fill = pathSet.has(key) ? "#f1dfbb" : (x + y) % 2 === 0 ? "#b4e19b" : "#a9da8e";
          return <polygon key={key} points={tilePoints(x, y)} fill={fill} />;
        })}

        {placing &&
          [...validTiles].map((key) => {
            const [x, y] = key.split(",").map(Number);
            return (
              <polygon
                key={`valid-${key}`}
                points={tilePoints(x, y)}
                fill="#ffe27a"
                stroke="#d99a12"
                strokeWidth={1.5}
                className="animate-tile-pulse"
              />
            );
          })}

        {objects.map((o) => {
          const { sx, sy } = tileCenter(o.x, o.y);
          return (
            <g key={o.id} transform={`translate(${sx} ${sy})`}>
              {o.kind === "landmark" && <LandmarkArt landmarkKey={o.landmarkKey} />}
              {o.kind === "item" && (
                <g className={o.item.id === poppedItemId ? "animate-pop-in" : undefined}>
                  <ItemArt assetKey={o.item.asset_key} />
                </g>
              )}
              {o.kind === "spru" && (
                <image
                  key={spru.image}
                  href={spruAsset.src}
                  x={-spruW / 2}
                  y={-spruH + 2}
                  width={spruW}
                  height={spruH}
                  className={spruMotion}
                />
              )}
            </g>
          );
        })}
      </svg>

      {placing
        ? [...validTiles].map((key) => {
            const [x, y] = key.split(",").map(Number);
            const { sx, sy } = tileCenter(x, y);
            return (
              <button
                key={`tile-${key}`}
                type="button"
                aria-label={`横${x + 1}・縦${y + 1}のマスに置く`}
                onClick={() => onTileTap(x, y)}
                className="absolute focus-visible:outline-3 focus-visible:outline-[#f2b632]"
                style={{
                  ...boxStyle(sx, sy, HALF_W, HALF_H, HALF_H),
                  clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                }}
              />
            );
          })
        : // 押せる範囲は上に伸びて奥のアイテムと重なるため、絵と同じく奥から順に並べて手前のボタンを上にする
          [...placed].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x).map((item) => {
            const { sx, sy } = tileCenter(item.x, item.y);
            return (
              <button
                key={`item-button-${item.id}`}
                type="button"
                aria-label={`${item.name}(動かす・しまう)`}
                onClick={() => onItemTap(item)}
                className="absolute rounded-lg focus-visible:outline-3 focus-visible:outline-[#f2b632]"
                style={boxStyle(sx, sy, HALF_W - 4, 56, 14)}
              />
            );
          })}

      <button
        type="button"
        data-spru
        aria-label="スプル"
        disabled={placing}
        onClick={onSpruTap}
        className="absolute rounded-full focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none"
        style={boxStyle(spruCenter.sx, spruCenter.sy, 20, 60, 6)}
      />

      <div
        className="pointer-events-none absolute flex max-w-[66%] -translate-x-[18%] -translate-y-full items-center gap-2 rounded-2xl bg-white py-1.5 pr-3 pl-1.5 text-[12.5px] leading-relaxed font-bold text-[#3b3226] shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
        style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }}
        aria-live="polite"
      >
        <SpruFace face={spru.face} size={28} />
        <span>
          <AutoFurigana text={spru.line} />
        </span>
        <span className="absolute -bottom-1.5 left-[18%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 町の画面でできごと・さわらない時間・時刻を管理する**

`frontend/src/components/world/world-screen.tsx` を次の内容にする:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { useSound } from "@/components/app/sound-provider";
import { pickTownHint } from "@/components/spru/hint";
import { pickTownMood, type TownEvent } from "@/components/spru/mood";
import { apiFetch } from "@/lib/api";

import { tileKey } from "./iso";
import { ItemActionSheet } from "./item-action-sheet";
import { PlacementBar } from "./placement-bar";
import { getTimeOfDay, isSpruSleepTime } from "./time-of-day";
import type { ShopListItem, WorldData, WorldItem } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";

const WELCOME_AMOUNT = 100;
const TAP_IMAGES = ["shy", "laugh", "cheer"] as const;

export function WorldScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 最初に開いたときの ?place= だけを使う(配置後に読み直しても配置モードに戻らないようにURLからは消す)
  const initialPlaceParam = useRef(searchParams.get("place"));
  const { play } = useSound();
  const [placingId, setPlacingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [poppedItemId, setPoppedItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { profile: sharedProfile, applyPartial, refresh: refreshProfile } = useProfile();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [shop, setShop] = useState<ShopListItem[]>([]);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  // スプルの出し分け(components/spru/mood.ts)に渡す状態。時刻は1秒ごとに進める
  const [now, setNow] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [event, setEvent] = useState<TownEvent | null>(null);
  const [nightWokenAt, setNightWokenAt] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // プロフィール選択直後はここに来るため、アプリ起動時(未選択)のままの共有プロフィールを取り直す
    refreshProfile();
    apiFetch("/api/world").then(async (res) => {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 422) {
        router.replace("/profiles");
        return;
      }
      if (res.ok) {
        const data: WorldData = await res.json();
        setWorld(data);
        applyPartial({ points: data.profile.points });
        setEvent({ kind: "greet", at: Date.now() });

        // ショップやバッグから /?place=ID で来たら、そのアイテムの配置モードにする。
        // 自分のアイテムでないIDや存在しないIDは無視して普通に表示する
        const placeParam = initialPlaceParam.current;
        if (placeParam) {
          initialPlaceParam.current = null;
          const id = Number(placeParam);
          if ([...data.items, ...data.bag].some((item) => item.id === id)) setPlacingId(id);
          router.replace("/");
        }
      }
    });
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShop(await res.json());
    });
  }, [router, applyPartial, refreshProfile]);

  const placingItem = useMemo(
    () => (world && placingId !== null ? [...world.items, ...world.bag].find((item) => item.id === placingId) ?? null : null),
    [world, placingId],
  );

  const validTiles = useMemo(() => {
    const tiles = new Set<string>();
    if (!world || placingId === null) return tiles;
    const blocked = new Set(world.land.blocked.map(([x, y]) => tileKey(x, y)));
    const occupied = new Set(
      world.items.filter((item) => item.id !== placingId).map((item) => tileKey(item.x as number, item.y as number)),
    );
    for (let y = 0; y < world.land.size; y++) {
      for (let x = 0; x < world.land.size; x++) {
        const key = tileKey(x, y);
        if (!blocked.has(key) && !occupied.has(key)) tiles.add(key);
      }
    }
    return tiles;
  }, [world, placingId]);

  const mood = pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing: placingItem !== null });

  // スプル以外をさわったとき。昼に座って・寝ていたら起きる(夜の眠りはスプルをタップしたときだけ起きる)
  function handleInteraction(e: { target: EventTarget }) {
    if (e.target instanceof Element && e.target.closest("[data-spru]")) return;
    const at = Date.now();
    if (mood.sleeping && !isSpruSleepTime(new Date(at))) setEvent({ kind: "woke", at });
    setLastInteractionAt(at);
  }

  function handleSpruTap() {
    if (!world) return;
    const at = Date.now();
    setLastInteractionAt(at);
    if (mood.sleeping) {
      if (isSpruSleepTime(new Date(at))) setNightWokenAt(at);
      setEvent({ kind: "woke", at });
      return;
    }
    setEvent({
      kind: "tap",
      at,
      image: TAP_IMAGES[Math.floor(Math.random() * TAP_IMAGES.length)],
      hint: pickTownHint({ bag: world.bag, points: world.profile.points, level: world.profile.level, shop }),
    });
  }

  // 画面を先に更新し、APIが失敗したら元に戻す
  async function moveItem(item: WorldItem, x: number | null, y: number | null): Promise<boolean> {
    if (!world) return false;
    const previous = world;
    const updated = { ...item, x, y };
    const others = (list: WorldItem[]) => list.filter((i) => i.id !== item.id);
    setWorld({
      ...world,
      items: x === null ? others(world.items) : [...others(world.items), updated],
      bag: x === null ? [...others(world.bag), updated] : others(world.bag),
    });

    const res = await apiFetch(`/api/world/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ x, y }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setWorld(previous);
      setMessage(data.message ?? "通信エラーが発生しました。");
      setEvent({ kind: "error", at: Date.now() });
      return false;
    }
    return true;
  }

  async function placeAt(x: number, y: number) {
    if (!placingItem) return;
    const item = placingItem;
    setPlacingId(null);
    setMessage(null);
    if (await moveItem(item, x, y)) {
      play("correct");
      setPoppedItemId(item.id);
      setEvent({ kind: "placed", at: Date.now(), itemName: item.name });
    }
  }

  async function putAway(item: WorldItem) {
    setSelected(null);
    setMessage(null);
    if (await moveItem(item, null, null)) {
      setEvent({ kind: "stored", at: Date.now(), itemName: item.name });
    }
  }

  async function receiveWelcome() {
    setWelcomeBusy(true);
    try {
      const res = await apiFetch("/api/world/welcome", { method: "POST" });
      if (!res.ok) return;
      const data: { granted: boolean; points: number } = await res.json();
      setWorld((prev) => (prev ? { ...prev, welcome_available: false, profile: { ...prev.profile, points: data.points } } : prev));
      applyPartial({ points: data.points });
      setEvent({ kind: "welcome", at: Date.now() });
    } finally {
      setWelcomeBusy(false);
    }
  }

  const timeOfDay = getTimeOfDay(new Date(now));

  if (!world) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込み中...
      </div>
    );
  }

  const nextLocked = shop
    .filter((item) => item.type === "decoration" && item.min_level > world.profile.level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  const nextUnlock = nextLocked ? `Lv.${nextLocked.min_level}で ${nextLocked.name}` : null;
  const continueHref = world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn";

  return (
    <div className="min-h-screen bg-[#8fd4e9]" onPointerDown={handleInteraction} onKeyDown={handleInteraction}>
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} nextUnlock={nextUnlock} />

        {placingItem && <PlacementBar item={placingItem} onCancel={() => setPlacingId(null)} />}

        {message && (
          <p role="alert" className="mx-4 mt-3 rounded-xl bg-[#fdebe5] px-3 py-2 text-sm font-bold text-[#a33a22]">
            {message}
          </p>
        )}

        <p className="mx-auto mt-3 rounded-full bg-[rgba(255,250,240,0.94)] px-3 py-1 text-[12.5px] font-black shadow-[0_2px_6px_rgba(59,50,38,0.12)]">
          日本 · はじまりの町
        </p>

        <div className="relative mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={validTiles}
            placing={placingItem !== null}
            onTileTap={placeAt}
            onItemTap={setSelected}
            spru={mood}
            onSpruTap={handleSpruTap}
            timeOfDay={timeOfDay}
            poppedItemId={poppedItemId}
          />
        </div>

        {!placingItem && (
          <Link
            href={continueHref}
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <BookOpen className="h-5 w-5" aria-hidden />
            つづきから学ぶ
          </Link>
        )}
      </div>

      <BottomNav />

      {selected && (
        <ItemActionSheet
          item={selected}
          onMove={() => {
            setPlacingId(selected.id);
            setSelected(null);
          }}
          onPutAway={() => putAway(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: HUDのアバターと初回プレゼントの画像を差し替える**

`frontend/src/components/world/world-hud.tsx`:
- importに `import { SPRU_FACES } from "@/components/spru/spru-assets";` を追加
- アバターの `<Image src="/spru/front.png" alt="" width={40} height={40} className="h-10 w-10 object-cover object-[50%_40%]" />` を次にする:

```tsx
          <Image src={SPRU_FACES.normal.src} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
```

`frontend/src/components/world/welcome-gift.tsx`:
- `import Image from "next/image";` を `import { SpruFigure } from "@/components/spru/spru-figure";` に置き換える
- `<Image src="/spru/joy.png" alt="よろこぶSpru" width={110} height={106} className="animate-spru-hop" />` を次にする:

```tsx
        <SpruFigure image="jump" standHeight={120} alt="よろこぶスプル" className="animate-spru-hop" />
```

- [ ] **Step 5: 古い仮画像を消す**

Run: `grep -rn "spru/idle.png\|spru/joy.png\|spru/front.png" frontend/src`
Expected: 何も出ない

```bash
git rm frontend/public/spru/idle.png frontend/public/spru/joy.png frontend/public/spru/front.png
```

- [ ] **Step 6: 型・lint・テスト**

Run: `cd frontend && npx tsc --noEmit && npx eslint src/components && npm test`
Expected: エラーなし、テストPASS

- [ ] **Step 7: ブラウザで確認する（スマホ幅390pxとPC幅）**

開発サーバー（ポート3000）で「町テスト」にログインして確認する。時刻は `page.clock.install({ time: new Date(2026, 8, 26, 12, 0) })` を `browser_run_code_unsafe` で入れてから町を開き、待つ場面は `page.clock.runFor(ミリ秒)` で進める。
- 町を開くと手を振り、2.5秒後に3/4の立ち姿でゆれる。吹き出しの左に顔アイコン、「こんにちは！今日もいっしょに学ぼう」
- バッグのアイテムを置く → ジャンプ＋「〇〇を置いたよ！…」、しまう → 手を合わせる、オフラインで置く → がっかり＋「うまくいかなかった…」
- 置く場所を選んでいる間は、顔アイコンがわくわくになり、スプルは押せない
- スプルをタップ → 照れる・大笑い・応援のどれかと、状況に合ったひとこと（ポイント・バッグの状態を変えて5-2の出し分け）
- `runFor(31000)` で座る、`runFor(60000)` でさらに寝る。画面のどこかをタップすると驚いてから起きる
- 夜: `page.clock.install({ time: new Date(2026, 8, 26, 22, 30) })` で町を開くと最初から寝ていて「すやすや…」。マス・アイテム・ナビをさわっても寝たまま（置く操作はできる）。スプルをタップすると驚いて「ふぁ…まだ起きてたの？」。`runFor(61000)` でまた寝る（レビューで特に見る点1）
- HUDのアバター、初回プレゼントのスプル（新しいプロフィールで確認）が新しい画像になっている

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/spru/spru-figure.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/world-screen.tsx frontend/src/components/world/world-hud.tsx frontend/src/components/world/welcome-gift.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町のスプルを場面・さわらない時間・夜で出し分け、タップで反応するようにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

（古い仮画像の削除は Step 5 の `git rm` で登録済み）

---

### Task 5: 時間帯と季節で変わる町

**Files:**
- Create: `frontend/src/components/world/ambience.tsx`
- Modify: `frontend/src/components/world/world-scene.tsx`、`world-screen.tsx`、`landmark-art.tsx`、`item-art.tsx`、`frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 の `TimeOfDay`・`Season`・`getSeason`、Task 4 の `WorldScene` の `timeOfDay` prop
- Produces: `TIME_THEME: Record<TimeOfDay, { background: string; groundTint: { color: string; opacity: number } | null; dimObjects: boolean; lit: boolean }>`、`Ambience({ timeOfDay, season })`、`LandmarkArt({ landmarkKey, lit? })`、`ITEM_LIGHTS: Record<string, { cx: number; cy: number; r: number }>`

- [ ] **Step 1: 時間帯の配色と、星・季節の舞うものを作る**

`frontend/src/components/world/ambience.tsx`:

```tsx
import type { ReactNode } from "react";

import type { Season, TimeOfDay } from "./time-of-day";

type TimeTheme = {
  background: string;
  groundTint: { color: string; opacity: number } | null;
  dimObjects: boolean;
  lit: boolean;
};

// 時間帯ごとの町の見た目(設計書7-1)。夜は物を少し暗くし、窓・灯籠・ちょうちんに明かりをともす
export const TIME_THEME: Record<TimeOfDay, TimeTheme> = {
  morning: {
    background: "linear-gradient(#d4f0f8, #aee0f0)",
    groundTint: { color: "#fff6e0", opacity: 0.12 },
    dimObjects: false,
    lit: false,
  },
  day: { background: "#8fd4e9", groundTint: null, dimObjects: false, lit: false },
  evening: {
    background: "linear-gradient(#f4a86f, #f8d6a4)",
    groundTint: { color: "#ff9a4d", opacity: 0.16 },
    dimObjects: false,
    lit: false,
  },
  night: {
    background: "linear-gradient(#131b3a, #2a3a6a)",
    groundTint: { color: "#1b2552", opacity: 0.42 },
    dimObjects: true,
    lit: true,
  },
};

// 位置・速さは固定の値にして、描くたびに変わらないようにする
const FALLING = [
  { left: 6, delay: 0, duration: 9 },
  { left: 14, delay: 3.2, duration: 11 },
  { left: 23, delay: 6.1, duration: 10 },
  { left: 31, delay: 1.4, duration: 12 },
  { left: 40, delay: 4.8, duration: 9.5 },
  { left: 48, delay: 7.5, duration: 11.5 },
  { left: 57, delay: 2.3, duration: 10.5 },
  { left: 65, delay: 5.6, duration: 12.5 },
  { left: 73, delay: 0.8, duration: 9 },
  { left: 81, delay: 3.9, duration: 11 },
  { left: 89, delay: 6.8, duration: 10 },
  { left: 95, delay: 2.9, duration: 12 },
];

const SPARKLES = [
  { left: 10, top: 14, delay: 0 },
  { left: 26, top: 8, delay: 0.9 },
  { left: 44, top: 20, delay: 1.7 },
  { left: 62, top: 10, delay: 0.4 },
  { left: 78, top: 18, delay: 1.3 },
  { left: 90, top: 6, delay: 2.1 },
  { left: 18, top: 30, delay: 1.1 },
  { left: 70, top: 32, delay: 2.5 },
];

const STARS = [
  { left: 6, top: 4 },
  { left: 15, top: 12 },
  { left: 24, top: 3 },
  { left: 33, top: 9 },
  { left: 47, top: 5 },
  { left: 56, top: 13 },
  { left: 64, top: 4 },
  { left: 72, top: 10 },
  { left: 81, top: 3 },
  { left: 88, top: 12 },
  { left: 94, top: 6 },
  { left: 40, top: 15 },
];

const FALLING_SHAPE: Record<Exclude<Season, "summer">, ReactNode> = {
  spring: (
    <svg width="10" height="8" viewBox="0 0 10 8">
      <ellipse cx="5" cy="4" rx="5" ry="3" fill="#f7b6c8" />
    </svg>
  ),
  autumn: (
    <svg width="12" height="10" viewBox="0 0 12 10">
      <path d="M1 9 C2 3 7 1 11 1 C10 5 7 9 1 9 Z" fill="#e8893a" />
    </svg>
  ),
  winter: (
    <svg width="7" height="7" viewBox="0 0 7 7">
      <circle cx="3.5" cy="3.5" r="3.5" fill="#ffffff" />
    </svg>
  ),
};

const SPARKLE_SHAPE: ReactNode = (
  <svg width="12" height="12" viewBox="0 0 12 12">
    <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill="#fff3b0" />
  </svg>
);

/** 町の上に重ねる、夜の星と季節の舞うもの(押せない) */
export function Ambience({ timeOfDay, season }: { timeOfDay: TimeOfDay; season: Season }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {timeOfDay === "night" &&
        STARS.map((star, i) => (
          <span
            key={`star-${i}`}
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{ left: `${star.left}%`, top: `${star.top}%`, animationDelay: `${(i % 5) * 0.6}s` }}
          />
        ))}
      {season === "summer"
        ? SPARKLES.map((sparkle, i) => (
            <span
              key={`sparkle-${i}`}
              className="season-sparkle absolute"
              style={{ left: `${sparkle.left}%`, top: `${sparkle.top}%`, animationDelay: `${sparkle.delay}s` }}
            >
              {SPARKLE_SHAPE}
            </span>
          ))
        : FALLING.map((particle, i) => (
            <span
              key={`fall-${i}`}
              className="season-fall absolute top-0"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            >
              {FALLING_SHAPE[season]}
            </span>
          ))}
    </div>
  );
}
```

- [ ] **Step 2: アニメーションを足す**

`frontend/src/app/globals.css` の `.animate-pop-in { ... }` のブロック（`transform-origin: 50% 90%;` で終わる）の直後に追加:

```css
  @keyframes season-fall {
    0% {
      transform: translate3d(0, -12px, 0) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translate3d(28px, 460px, 0) rotate(220deg);
      opacity: 0;
    }
  }
  .season-fall {
    animation: season-fall 10s linear infinite both;
  }

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.25;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-twinkle,
  .season-sparkle {
    animation: twinkle 2.4s ease-in-out infinite both;
  }

  @keyframes stage-start {
    0% {
      opacity: 0;
      transform: translateY(-8px);
    }
    15% {
      opacity: 1;
      transform: translateY(0);
    }
    85% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .animate-stage-start {
    animation: stage-start 2s ease-out both;
  }
```

同じファイルの最初の `@media (prefers-reduced-motion: reduce) {` のセレクタ一覧で、`.animate-pop-in,` の次に追加:

```css
    .animate-twinkle,
    .animate-stage-start,
```

同じ `@media` ブロックの、`animation: none !important;` を含むルールの閉じ括弧 `}` の直後（`@media` の閉じ括弧の前）に追加:

```css
    /* 舞うものは止めると画面に散らばって見えるため、出さない */
    .season-fall,
    .season-sparkle {
      display: none;
    }
```

（`.animate-stage-start` はTask 6のステージ開始のカードで使う）

- [ ] **Step 3: 目印とアイテムに夜の明かりを足す**

`frontend/src/components/world/landmark-art.tsx` を次の内容にする（形は今と同じ。夜は窓を明るくし、灯籠に光の輪を足す）:

```tsx
import type { ReactNode } from "react";

// 原点(0,0)がマスの中心。最初から町にある、動かせない目印。lit は夜に明かりがともっているとき
const ART: Record<string, (lit: boolean) => ReactNode> = {
  spru_house: (lit) => {
    const glass = lit ? "#ffe08a" : "#9fd6e6";
    return (
      <g>
        <ellipse cx={0} cy={4} rx={30} ry={12} fill="#2f5d2a" opacity={0.15} />
        <polygon points="-24,0 0,12 0,-14 -24,-26" fill="#fbf1dc" />
        <polygon points="0,12 24,0 24,-26 12,-38 0,-14" fill="#e8d4b0" />
        <polygon points="-16,4 -8,8 -8,-6 -16,-10" fill="#b8734c" />
        <circle cx={-9.8} cy={0.6} r={0.9} fill="#f6d08a" />
        <polygon points="-23,-9.5 -19,-7.5 -19,-15.5 -23,-17.5" fill={glass} stroke="#fffaf0" strokeWidth={1} />
        <polygon points="-6,-1 -2,1 -2,-7 -6,-9" fill={glass} stroke="#fffaf0" strokeWidth={1} />
        <polygon points="8,-4 16,-8 16,-16 8,-12" fill={glass} stroke="#fffaf0" strokeWidth={1.2} />
        <polygon points="7,-2.5 17,-7.5 17,-5.5 7,-0.5" fill="#8c5a3c" />
        <circle cx={9} cy={-3.6} r={1.5} fill="#f48ba5" />
        <circle cx={12} cy={-5.1} r={1.5} fill="#ffd35c" />
        <circle cx={15} cy={-6.6} r={1.5} fill="#f48ba5" />
        <polygon points="-28,-24.6 1.4,-10 14.7,-36.7 -14.7,-51.3" fill="#e5795d" />
        <path
          d="M-24.7 -31.3 L4.7 -16.7 M-21.4 -38 L8.1 -23.4 M-18 -44.6 L11.4 -30"
          stroke="#cf6549"
          strokeWidth={1.1}
          opacity={0.7}
        />
        <polygon points="-14.7,-51.3 14.7,-36.7 14,-34.4 -15.4,-49" fill="#f39c82" />
        <polygon points="1.4,-10 14.7,-36.7 14.7,-33.2 2.8,-8.4" fill="#c25f45" />
        <polygon points="14.7,-36.7 27.5,-24.5 27.5,-21.3 14.7,-33.2" fill="#c25f45" />
      </g>
    );
  },
  torii: () => (
    <g>
      <ellipse cx={0} cy={1} rx={18} ry={6} fill="#2f5d2a" opacity={0.13} />
      <polygon points="-12,-6 -8,-4 -8,-42 -12,-44" fill="#e0573e" />
      <polygon points="8,4 12,6 12,-32 8,-34" fill="#c94a33" />
      <polygon points="-12,-6 -8,-4 -8,-8 -12,-10" fill="#3a2e2a" />
      <polygon points="8,4 12,6 12,2 8,0" fill="#3a2e2a" />
      <polygon points="-13,-34.5 13,-21.5 13,-24.5 -13,-37.5" fill="#cf4a33" />
      <polygon points="-17,-44.5 17,-27.5 17,-31.5 -17,-48.5" fill="#e0573e" />
      <polygon points="-19,-49.5 19,-30.5 20,-33 -20,-53" fill="#3a2e2a" />
    </g>
  ),
  stone_lantern: (lit) => (
    <g>
      <ellipse cx={0} cy={1} rx={8} ry={3.5} fill="#2f5d2a" opacity={0.14} />
      <rect x={-5} y={-4} width={10} height={4} rx={1} fill="#b8b0a2" />
      <rect x={-2} y={-14} width={4} height={10} fill="#c9c1b3" />
      <rect x={-6} y={-17} width={12} height={3} rx={1} fill="#b8b0a2" />
      <rect x={-4.5} y={-24} width={9} height={7} rx={1} fill="#d6cfc1" />
      <rect x={-2.2} y={-22.5} width={4.4} height={4} fill={lit ? "#fff0b8" : "#ffd98a"} />
      <polygon points="-8,-24 0,-30 8,-24" fill="#a39b8d" />
      <circle cx={0} cy={-31} r={1.6} fill="#a39b8d" />
      {lit && <circle cx={0} cy={-20.5} r={11} fill="#ffd98a" opacity={0.45} />}
    </g>
  ),
};

export function LandmarkArt({ landmarkKey, lit = false }: { landmarkKey: string; lit?: boolean }) {
  return <>{ART[landmarkKey]?.(lit) ?? null}</>;
}
```

`frontend/src/components/world/item-art.tsx` の `const FALLBACK` の直前に追加（絵と同じ原点の座標）:

```tsx
// 夜に光るアイテムの光の輪(原点=マスの中心)。絵を差し替えるときは位置も合わせて直す
export const ITEM_LIGHTS: Record<string, { cx: number; cy: number; r: number }> = {
  chochin: { cx: 9, cy: -20, r: 15 },
};
```

- [ ] **Step 4: 町の描画に時間帯を反映する**

`frontend/src/components/world/world-scene.tsx` を変更する。

importを変更・追加:

```tsx
import { TIME_THEME } from "./ambience";
import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ITEM_LIGHTS, ItemArt } from "./item-art";
```

`void timeOfDay;` の行を次にする:

```tsx
  const theme = TIME_THEME[timeOfDay];
  // 夜は物を少し暗くする(明かりは暗くしない)
  const artStyle = theme.dimObjects ? { filter: "brightness(0.78) saturate(0.85)" } : undefined;
```

マス目を描く `{tiles.map(...)}` の直後（`{placing && ...` の前）に、地面の色みを足す:

```tsx
        {theme.groundTint && (
          <polygon
            points={`0,0 ${right.x},${right.y} ${right.x},${right.y + LAND_THICKNESS} ${bottom.x},${bottom.y + LAND_THICKNESS} ${left.x},${left.y + LAND_THICKNESS} ${left.x},${left.y}`}
            fill={theme.groundTint.color}
            opacity={theme.groundTint.opacity}
          />
        )}
```

物を描く部分の、目印とアイテムの2行を次にする:

```tsx
              {o.kind === "landmark" && (
                <g style={artStyle}>
                  <LandmarkArt landmarkKey={o.landmarkKey} lit={theme.lit} />
                </g>
              )}
              {o.kind === "item" && (
                <g className={o.item.id === poppedItemId ? "animate-pop-in" : undefined}>
                  <g style={artStyle}>
                    <ItemArt assetKey={o.item.asset_key} />
                  </g>
                  {theme.lit && o.item.asset_key && ITEM_LIGHTS[o.item.asset_key] && (
                    <circle
                      cx={ITEM_LIGHTS[o.item.asset_key].cx}
                      cy={ITEM_LIGHTS[o.item.asset_key].cy}
                      r={ITEM_LIGHTS[o.item.asset_key].r}
                      fill="#ffd98a"
                      opacity={0.5}
                    />
                  )}
                </g>
              )}
```

（目印の窓・灯籠の明かりは絵の中にあるため、暗くするフィルターが一緒に少しかかる。明かりは明るい黄色なので、夜でも光って見える。アイテムの光の輪はフィルターの外に描くので暗くならない）

- [ ] **Step 5: 町の画面に背景と舞うものを足す**

`frontend/src/components/world/world-screen.tsx` を変更する。

importを変更・追加:

```tsx
import { Ambience, TIME_THEME } from "./ambience";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "./time-of-day";
```

`const timeOfDay = getTimeOfDay(new Date(now));` の次に:

```tsx
  const season = getSeason(new Date(now));
```

ルートの `<div className="min-h-screen bg-[#8fd4e9]" onPointerDown={handleInteraction} onKeyDown={handleInteraction}>` を次にする:

```tsx
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={handleInteraction}
      onKeyDown={handleInteraction}
    >
```

`<WorldScene ... />` の直後（同じ `relative mt-2 px-1` の div の中）に:

```tsx
          <Ambience timeOfDay={timeOfDay} season={season} />
```

- [ ] **Step 6: 型・lint・テスト**

Run: `cd frontend && npx tsc --noEmit && npx eslint src/components src/app && npm test`
Expected: エラーなし、テストPASS

- [ ] **Step 7: ブラウザで確認する（スマホ幅390pxとPC幅）**

`page.clock.install({ time })` で時刻を入れてから町を開く。
- 朝（2026-09-26 7:00）・昼（12:00）・夕方（17:00）・夜（20:00）で空の色・地面の色みが変わる。夜は星が出て、Spruの家の窓・灯籠・置いたちょうちんに明かりがともり、スプルは起きている（20時）
- 季節: 4月15日（桜の花びら）・7月15日（きらきら）・10月15日（落ち葉）・1月15日（雪）
- 21:59に町を開いたまま `page.clock.runFor(70000)` で22時を過ぎさせると、1分以内にスプルが寝る（レビューで特に見る点2）
- `page.emulateMedia({ reducedMotion: "reduce" })` で、舞うものが出ず、スプルのゆれ・ジャンプの動きが止まる（レビューで特に見る点5）

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/world/ambience.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/world-screen.tsx frontend/src/components/world/landmark-art.tsx frontend/src/components/world/item-art.tsx frontend/src/app/globals.css
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町の見た目を時間帯(朝・昼・夕方・夜)と季節(花びら・日差し・落ち葉・雪)で変える

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: クイズのスプルと、レベルアップ・ステージ開始の演出

**Files:**
- Create: `frontend/src/components/quiz/level-up-overlay.tsx`、`frontend/src/components/quiz/stage-start-card.tsx`
- Modify: `frontend/src/app/quiz/[stageId]/page.tsx`

**Interfaces:**
- Consumes: Task 3 の `pickAnswerImage`・`pickResult`、Task 4 の `SpruFigure`、Task 2 の `SPRU_SCENES`、Task 5 の `.animate-stage-start`、既存の `ShopListItem`・`ItemIcon`、回答APIの `profile.leveled_up`・`profile.level`
- Produces: `LevelUpOverlay({ level, unlocked, onContinue })`、`StageStartCard({ stageNumber })`

- [ ] **Step 1: レベルアップの演出を作る**

`frontend/src/components/quiz/level-up-overlay.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_SCENES } from "@/components/spru/spru-assets";
import { ItemIcon } from "@/components/world/item-art";
import type { ShopListItem } from "@/components/world/types";

/** レベルアップの全画面演出(設計書6-1)。クイズの途中なのでショップへは飛ばさず、次の目標として見せるだけ */
export function LevelUpOverlay({
  level,
  unlocked,
  onContinue,
}: {
  level: number;
  unlocked: ShopListItem[];
  onContinue: () => void;
}) {
  const scene = SPRU_SCENES.grow;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <Image
          src={scene.src}
          alt="成長するスプル"
          width={200}
          height={Math.round((200 * scene.height) / scene.width)}
          className="rounded-2xl"
        />
        <h2 id="level-up-title" className="text-2xl font-black text-[#2e6b1c]">
          レベルアップ！ Lv.{level}
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text="HPが全回復したよ" />
        </p>
        {unlocked.length > 0 && (
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-[#f5efe1] p-3">
            {unlocked.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-left">
                <ItemIcon assetKey={item.asset_key} size={44} />
                <span className="text-sm font-black">
                  <AutoFurigana text={`${item.name}が買えるようになったよ`} />
                </span>
              </div>
            ))}
            <p className="text-xs font-bold text-[#6b5d45]">
              <AutoFurigana text="町に戻ったらショップをのぞいてみよう" />
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          つづける
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ステージ開始のカードを作る**

`frontend/src/components/quiz/stage-start-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { SPRU_SCENES } from "@/components/spru/spru-assets";

/** ステージ開始の小さなカード(設計書6-2)。何度も通る場面なので、タップ不要で2秒で消える */
export function StageStartCard({ stageNumber }: { stageNumber: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const scene = SPRU_SCENES.challenge;
  return (
    <div
      role="status"
      className="animate-stage-start pointer-events-none fixed inset-x-0 top-20 z-40 mx-auto flex w-fit items-center gap-3 rounded-2xl bg-[#fffaf0] p-2 pr-4 text-[#3b3226] shadow-xl"
    >
      <Image
        src={scene.src}
        alt=""
        width={96}
        height={Math.round((96 * scene.height) / scene.width)}
        className="rounded-xl"
        aria-hidden
      />
      <p className="text-lg font-black">Stage {stageNumber} スタート！</p>
    </div>
  );
}
```

- [ ] **Step 3: クイズ画面を変更する**

`frontend/src/app/quiz/[stageId]/page.tsx` を変更する。

importに追加:

```tsx
import { LevelUpOverlay } from "@/components/quiz/level-up-overlay";
import { StageStartCard } from "@/components/quiz/stage-start-card";
import { pickAnswerImage, pickResult } from "@/components/spru/mood";
import { SpruFigure } from "@/components/spru/spru-figure";
import type { ShopListItem } from "@/components/world/types";
```

`const [completeResult, setCompleteResult] = useState<CompleteResult | null>(null);` の次に:

```tsx
  const [levelUp, setLevelUp] = useState<{ level: number; previousLevel: number } | null>(null);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [shopItems, setShopItems] = useState<ShopListItem[]>([]);
  // 「もう一度」のたびに増やし、ステージ開始のカードを出し直す
  const [runId, setRunId] = useState(0);
```

ステージを読み込む `useEffect`（`apiFetch(\`/api/stages/${stageId}\`)` を含む）の中、`.catch(() => setStage(null));` の次に:

```tsx
    // レベルアップの演出で「新しく買えるようになったアイテム」を見せるため
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShopItems(await res.json());
    });
```

`submitAnswer` の中、`applyPartial({...});` の閉じ `}` の直後（`if (data.profile) { ... }` の中の最後）に:

```tsx
        if (data.profile.leveled_up) {
          setLevelUp({ level: data.profile.level, previousLevel: profile?.level ?? data.profile.level - 1 });
        }
```

`function handleNext() { ... }` を次の3つの関数に置き換える:

```tsx
  function advance() {
    setCurrentIndex((prev) => prev + 1);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setMatchingResults(null);
    setAnswered(false);
    setLastDelta(null);
  }

  function handleNext() {
    // レベルが上がったときは、次の問題(最後なら結果画面)の前にお祝いを挟む
    if (levelUp && !levelUpOpen) {
      setLevelUpOpen(true);
      playSound("allCorrect");
      return;
    }
    advance();
  }

  function handleLevelUpContinue() {
    setLevelUp(null);
    setLevelUpOpen(false);
    advance();
  }
```

`handleRestart` の中、`setCompleteResult(null);` の次に:

```tsx
    setLevelUp(null);
    setLevelUpOpen(false);
    setRunId((prev) => prev + 1);
```

HPが0の画面で、`<p className="text-5xl">💤</p>` を次にする:

```tsx
            <SpruFigure image="sleep" standHeight={96} />
```

同じ画面の `ハートがなくなっちゃった。もう少し待とう。` を `スプルもひと休み。HPが回復したらまた遊ぼう` にする。

結果画面（`if (finished) {`）で、`return (` の前に:

```tsx
    const result = pickResult(score, stage.questions.length);
```

同じ結果画面の `<h1 className="text-2xl font-bold">結果発表</h1>` の直前に:

```tsx
            <SpruFigure image={result.image} standHeight={96} className={result.image === "jump" ? "animate-spru-hop" : undefined} />
```

同じ結果画面の `問正解` の `</p>` の直後に:

```tsx
            {result.line && <p className="text-sm font-semibold text-muted-foreground">{result.line}</p>}
```

問題画面の `return (` の中、`<AppHeader />` の直後に:

```tsx
      {currentIndex === 0 && <StageStartCard key={runId} stageNumber={stage.stage_number} />}
```

正解・不正解の全画面表示（`{answered && (`）で、`{lastCorrect ? (` の直前に:

```tsx
              <SpruFigure
                key={currentIndex}
                image={pickAnswerImage({
                  correct: lastCorrect,
                  combo: combo?.combo ?? 0,
                  comboBonus: combo?.combo_milestone_bonus_coin ?? 0,
                })}
                standHeight={100}
                className="animate-pop-in"
              />
```

同じ部分の `✨ Correct!!` を `Correct!!` に、`😢 Wrong...` を `Wrong...` にする（スプルが気持ちを表すため、絵文字を外す）。

問題画面の `return (` の最後、ルートの `</div>` の直前（問題カードを包む `relative z-10 mx-auto ...` の `</div>` の後）に追加する。正解・不正解の表示は問題カード（`backdrop-blur-sm`）の中にあり、`fixed` でもカードの範囲に収まってしまうため、レベルアップの演出はカードの外に置いて画面全体を覆う:

```tsx
      {levelUpOpen && levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          unlocked={shopItems.filter(
            (item) =>
              item.type === "decoration" && item.min_level > levelUp.previousLevel && item.min_level <= levelUp.level,
          )}
          onContinue={handleLevelUpContinue}
        />
      )}
```

- [ ] **Step 4: 型・lint・テスト・本番ビルド**

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npm test && npm run build`
Expected: エラーなし、テストPASS、ビルド成功

- [ ] **Step 5: ブラウザで確認する（スマホ幅390pxとPC幅）**

- クイズを始めると「挑戦する」のカードと「Stage 1 スタート！」が出て、2秒で消える。カードが出ている間も選択肢を押せる
- 正解でうれしい、2コンボ以上で大笑い、5コンボのボーナスで応援、不正解でがっかりのスプルが出る
- 結果画面: 全問正解でジャンプ、半分以上でにっこり、それ未満で頑張る＋「次はもっとできるよ！」
- HPが0になるとスプルが寝ていて「スプルもひと休み。HPが回復したらまた遊ぼう」（tinkerで `hp` を0にして確認し、確認後に戻す）
- レベルアップ: 次のレベルまでXPが10のプロフィールで正解する → 「次へ」でレベルアップの演出（成長するスプル・Lv・HP全回復・新しく買えるアイテム）→「つづける」で次の問題へ
- 最後の問題でレベルアップ → 演出 →「つづける」で結果画面が正しく出る（レビューで特に見る点3）
- 結果画面の「もう一度」→ ステージ開始のカードがもう一度出て、レベルアップの演出は残っていない（レビューで特に見る点4）
- 動きを減らす設定で、カードが動かずに出て消える

XPの調整は開発DBで行う（例: `./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::where("name","町テスト")->first(); $p->update(["xp"=>190,"level"=>2]);'`）。確認が終わったら元の値に戻す。

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/quiz "frontend/src/app/quiz/[stageId]/page.tsx"
git commit -m "$(cat <<'EOF'
#NNNNN: feature:クイズにスプルの反応と、レベルアップ・ステージ開始の演出を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 仕上げ（通し確認・ドキュメント・マージ）

**Files:**
- Modify: `SPEC.md`、`TASKS.md`、`/Users/katsuhiro.k1215/SmartSprouts/company/spra/mascot/CLAUDE.md`

- [ ] **Step 1: 全テストと本番ビルド**

Run: `./vendor/bin/sail artisan test && cd frontend && npm test && npx tsc --noEmit && npx eslint src && npm run build`
Expected: バックエンド134件PASS、フロントのテストPASS、型・lintエラーなし、ビルド成功

- [ ] **Step 2: 通しのブラウザ確認**

「町テスト」で、スマホ幅（390px）とPC幅の両方で、Task 4〜6のブラウザ確認を一通りもう一度行う（特に「レビューで特に見る点」の1〜5）。あわせて、①で確認した「買う → 置く → 動かす → しまう → バッグから置き直す」が今も動くことを確認する。

- [ ] **Step 3: SPEC.md を更新する**

`SPEC.md`:
- 1章の「2026-09-26 コンセプト転換」の項目の次に追加: 「- **2026-09-26 仲間と成長の構想（Owner承認）**: 仲間（Lumi・Momo・Kuru・Piko・Ruru）を種から育てて手に入れ、相棒にしていく。スプルは学ぶと芽→つぼみ→花と育ち、種をまくと新しい芽（仲間）が生まれる。A〜Eの5回に分けて作る（A: 表情・ポーズの出し分け・演出・時間帯と季節（実装済み、`docs/design/2026-09-26-spru-wave-a-design.md`）、B: 成長サイクル・水やり・仲間の誕生、C: 相棒・仲間の成長・仲間からの復習問題、D: 今日のおつかい・にぎやか度・家族の町、E: 土地の解放と旅・おみやげ）。着せ替えと図鑑は後回し。コインで回すガチャは入れない」
- 4-9の「⚠️ Spruは設定画から切り抜いた仮画像」の行を次に置き換える: 「- ✅（2026-09-26、A回）スプルの表情・ポーズの出し分け: 町では開いたときに手を振る、置く→ジャンプ、しまう→手を合わせる、通信エラー→がっかり、タップ→照れる・大笑い・応援と状況に合ったひとこと、30秒さわらない→座る、90秒→寝る。クイズでは正解・コンボ・不正解・結果・HP切れで表情が変わる。吹き出しの左に顔アイコン（`components/spru/mood.ts`・`hint.ts`）」「- ✅（A回）レベルアップの全画面演出（新しく買えるアイテムを表示）と、ステージ開始のカード（2秒で消える）」「- ✅（A回）時間帯（朝・昼・夕方・夜、端末の時計）と季節（桜・日差し・落ち葉・雪、端末の日付の月）で町の見た目が変わる。夜は窓・灯籠・ちょうちんに明かりがともり、22〜6時はスプルが寝ている（タップで起きる。遊ぶことは止めない）」「- ⚠️ スプルの画像は素材集（`company/spra/mascot/assets/mascot-4〜6.png`・`mascot-logo.png`）から切り抜いた仮素材（`tools/spru-assets/` で再生成できる）。Spru Master（Blender）ができたら同じ名前で差し替える」
- 3章（技術スタック）に、フロントエンドの自動テストとして Vitest（計算部分のみ）を導入したことを1行追記する

- [ ] **Step 4: TASKS.md を更新する**

`TASKS.md` の「ワールド画面（学ぶほど世界が広がる…）」の節で:
- 「②レベルによる土地の解放と、新しい国への旅」「③復習を混ぜた「今日のレッスン」」「Spru Master（Blender）ができたら差し替える」「（既知）フロントエンドのテストフレームワークが未導入」の4行を、次の行に置き換える:

```markdown
- [x] **A回: スプルの表情・ポーズの出し分け、レベルアップ・ステージ開始の演出、時間帯と季節**（2026-09-26。設計書 `docs/design/2026-09-26-spru-wave-a-design.md`、実装計画 `docs/design/2026-09-26-spru-wave-a-plan.md`。フロントにVitestを導入）
- [ ] **B回: 成長サイクル（芽→つぼみ→花→種）、毎日の水やり（休んでも枯れない）、種から仲間が生まれる**（仲間は mascot-4・6 の Lumi・Momo・Kuru・Piko・Ruru を想定。設計時にOwnerと確定。仲間ごとの表情・ポーズ集があると表現が増える）
- [ ] **C回: 相棒えらび（名前つき）、仲間ごとの成長、仲間からの復習問題**（「今日のレッスン」の代わりになる。間違えた問題は `profile_currency_ledger` の `answer_wrong` から探せる）
- [ ] **D回: 今日のおつかい、町のにぎやか度、家族の町を見に行く**（同じ家族アカウント内だけ）
- [ ] **E回: 土地の解放と、新しい国への旅（雲に隠れた竹林・インドネシアの島・「旅のじゅんび」リスト）、国ごとのおみやげアイテム**
- [ ] 後回し: 着せ替え（国ごとの帽子）、図鑑。入れない: コインで回すガチャ（景品表示法等の懸念）
- [ ] Spru Master（Blender）ができたら、`tools/spru-assets/` の出力と同じ名前で `public/spru/` とアイテムの絵を差し替える
- [ ] 南半球の国向けに季節を反転する（海外展開のとき。`components/world/time-of-day.ts`）
```

- [ ] **Step 5: マスコット部の資料に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/spra/mascot/CLAUDE.md` の「Spra-goで仮素材を使用（2026-09-26）」の項目の末尾に追記:

「（A回で追加）表情・ポーズ・顔アイコンは mascot-6（「わくわく」のみ mascot-4）、レベルアップ・ステージ開始のシーンは mascot-logo から切り抜いて使用中。切り抜き範囲は `projects/Spra-go/tools/spru-assets/crops.json`。素材集を差し替えたら `extract.py` で作り直せる」

（このファイルはSpra-goのリポジトリ外のため、Spra-goのコミットには含めない）

- [ ] **Step 6: ドキュメントをコミットし、mainへマージしてpushする**

```bash
git add SPEC.md TASKS.md
git commit -m "$(cat <<'EOF'
#NNNNN: docs:スプルのA回(表情・ポーズ・演出・時間帯と季節)と仲間・成長の構想(A〜E)をSPEC/TASKSに反映

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git checkout main
git merge --no-ff feature/spru-wave-a
./vendor/bin/sail artisan test
cd frontend && npm test && cd ..
git push origin main feature/spru-wave-a
```

Expected: マージ後もバックエンド・フロントのテストがすべてPASS、pushが成功する（Keychainの確認が出た場合はOwnerに入力してもらう）
