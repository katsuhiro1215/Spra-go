# 町のアイテムの画像（段階2・3） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ownerのシート9枚から町のアイテム・おみやげ・目印の48点を切り抜いて画像にし、大きさを画像の幅から、夜の明かりを画像の中の位置から決める形にして、プログラムの絵を消し、新しい16点をショップに並べる。

**Architecture:** 切り抜きは今の `tools/spru-assets/extract.py` の `items` の組（シートごとに同じ `scale`）。町での幅は `imagePlacement` で「画像の幅×0.225×調整」、明かりは `IMAGE_LIGHTS`（画像の中の割合）を `lightCircles` でSVGの位置にする。プログラムの絵（`item-art.tsx`・`travel-art.tsx`・`iso-shapes.tsx`・`landmark-art.tsx` の絵）は消し、スプルの花とプレゼント箱だけ残す。新しい16点は `config/world.php`・`WorldItemSeeder`・`art-keys.ts` に足す。

**Tech Stack:** Laravel 13（Pest）/ Next.js 16・React 19・TypeScript（Vitest）/ Python 3 + Pillow

**Spec:** `docs/design/2026-09-28-town-items-design.md`（2026-09-29 更新。4-1〜4-5・7章・8章）

**ブランチ:** `feature/town-item-images`（作成済み。設計書の更新とこの計画は #00243）。タスクのコミットは #00244 から順に。

## Global Constraints

- 返答・ドキュメント・コミットの要約は日本語。コミットは `git commit -m "#NNNNN: type:要約" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`
- 使うシート: `company/mascot/assets/items/` の `item1-2`・`item2-2`・`item3-2`・`item4`・`item5-2`・`item6`・`item7`・`item8`・`item9`（`item1`・`item2`・`item3`・`item5` は使わない）
- 同じシートの物は同じ `scale`（設計書7-1の表）。町での幅は `画像の幅(px) × 0.225 × 調整の scale`（設計書7-2）
- 明かりは `IMAGE_LIGHTS` に `{ x, y, r }`（x・y は画像の左上からの割合 0〜1、r はSVGの単位）で持つ（設計書7-3）
- 新しい16点のレベルと値段は設計書5-2のとおり。2×2は パン屋・和風の家・カフェ・灯台
- 種から咲くスプルの花とプレゼント箱の絵は消さない
- 画面のテストは `frontend/` で `npx vitest run <ファイル>`、全部は `npm test`・`npm run typecheck`・`npm run lint`。サーバーのテストは リポジトリ直下で `./vendor/bin/sail test <ファイル>`（`--parallel` を付けない。結果は JSON の `"tool":"pest","result"` を見る）
- 切り抜きは リポジトリ直下で `python3 tools/spru-assets/extract.py ../../company/mascot/assets`（2分を超えるので、長く待てる形で流す）
- 開発用のデータベースは `migrate:fresh` しない。品ぞろえは `db:seed --class=WorldItemSeeder`（何度流しても増えない）で足す。ブラウザで確かめたあとは町テストのデータを確認前の状態に戻す
- 開発用の画面は `http://localhost:3000`（すでに動いている）

## Review Focus

1. 画像のないキー（これから足すキー・設定の書き間違い）のアイテムが町に置かれても、画面が壊れずプレゼント箱が出る。画像を足し忘れたキーはテストで見つかる → Task 2 の「すべてのキーに画像がある」テストと、Task 3 で残すプレゼント箱
2. 大きさの調整（`scale`）を変えても、夜の光の輪が絵の同じ所に付く → Task 1 の `lightCircles` のテスト（scale 2）
3. 2×2の物（大きな画像）でも、幅が足元のマスの数で2倍にならず、画像の幅どおりになる → Task 1 の `imagePlacement` のテスト
4. 幅320pxの画面で、高い絵（モン・サン＝ミシェル・五重塔など）や細い絵（街灯）が、ショップの小さな絵の枠からはみ出したり、見えないほど小さくなったりしない → Task 5 のブラウザでの確認（ショップ）
5. 新しいアイテムの足元の数（2×2）がサーバーと画面でずれて、置いたときに重なる → 今の `art-keys.test.ts`（`asset_footprints` と `BIG_ASSETS` が同じ）と Task 4 の品ぞろえのテスト

---

## ファイルの構成

| ファイル | 役割 | タスク |
|---|---|---|
| `frontend/src/components/world/item-image.ts`・`item-image.test.ts` | 画像の置き場所（幅は画像の幅から）・光の輪の位置（`lightCircles`）・すべてのキーに画像があるテスト | 1・2 |
| `frontend/src/components/world/item-image-fit.ts` | 物ごとの微調整と、明かり（`IMAGE_LIGHTS`） | 1・3 |
| `tools/spru-assets/crops.json` | シート9枚と48点の切り抜く範囲 | 2 |
| `frontend/public/spru/items/*.webp`・`frontend/src/components/spru/spru-assets.ts` | 切り抜いた画像と一覧（道具が書き出す） | 2 |
| `frontend/src/components/world/item-art.tsx` | アイテム・おみやげの絵（画像・スプルの花・プレゼント箱だけにする） | 3 |
| `frontend/src/components/world/landmark-art.tsx` | 目印の絵（画像だけにする） | 3 |
| `frontend/src/components/world/world-scene.tsx` | 夜の光の輪を `lightCircles` で重ねる | 3 |
| `frontend/src/components/world/travel-art.tsx`・`iso-shapes.tsx` | 消す | 3 |
| `config/world.php`・`database/seeders/WorldItemSeeder.php`・`tests/Feature/WorldBuildingTest.php` | 新しい16点（サーバー） | 4 |
| `frontend/src/components/world/art-keys.ts` | 新しい16点（画面） | 4 |
| `SPEC.md`・`TASKS.md` | ドキュメント | 5 |

---

### Task 1: 幅を画像の幅から決め、光の輪を画像の中の位置から出す

**Files:**
- Modify: `frontend/src/components/world/item-image.ts`
- Modify: `frontend/src/components/world/item-image.test.ts`
- Modify: `frontend/src/components/world/item-image-fit.ts`

**Interfaces:**
- Produces:
  - `imagePlacement(image: { width: number; height: number }, footprint: number, fit?: ItemImageFit): ImagePlacement`（今と同じ形。幅の決め方だけ変わる）
  - `lightCircles(key: string | null, footprint: number, images?: Record<string, SpruImage | undefined>, lights?: Partial<Record<string, ImageLight[]>>, fits?: Partial<Record<string, ItemImageFit>>): { cx: number; cy: number; r: number }[]`（`@/components/world/item-image`。後ろの3つは省くと本物の一覧）
  - 型 `ImageLight = { x: number; y: number; r: number }` と `IMAGE_LIGHTS: Partial<Record<string, ImageLight[]>>`（`item-image-fit.ts`。この Task では空）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/world/item-image.test.ts` を次の内容にする:

```ts
import { describe, expect, it } from "vitest";

import { iconViewBox, imagePlacement, itemImage, lightCircles } from "./item-image";

const square = { width: 256, height: 256 };
const big = { width: 512, height: 1024 };
const thin = { width: 64, height: 256 };

describe("画像の置き場所(設計書 2026-09-28-town-items 7-2)", () => {
  it("幅は画像の幅×0.225。256pxは57.6で、画像の下の真ん中が原点から8だけ手前", () => {
    const p = imagePlacement(square, 1);
    expect(p.width).toBeCloseTo(57.6);
    expect(p.height).toBeCloseTo(57.6);
    expect(p.x).toBeCloseTo(-28.8);
    expect(p.y + p.height).toBeCloseTo(8);
  });

  it("2×2でも幅は画像の幅どおり(512pxで115.2)。下は16だけ手前。高さは縦横の比から", () => {
    const p = imagePlacement(big, 2);
    expect(p.width).toBeCloseTo(115.2);
    expect(p.height).toBeCloseTo(230.4);
    expect(p.y + p.height).toBeCloseTo(16);
  });

  it("細い画像は細く出て、幅は足元のマスの数によらない", () => {
    expect(imagePlacement(thin, 1).width).toBeCloseTo(14.4);
    expect(imagePlacement(thin, 1).height).toBeCloseTo(57.6);
    expect(imagePlacement(thin, 2).width).toBeCloseTo(14.4);
  });

  it("物ごとの調整値(scale・dx・dy)が効く", () => {
    const p = imagePlacement(square, 1, { scale: 1.5, dx: 4, dy: -3 });
    expect(p.width).toBeCloseTo(86.4);
    expect(p.x).toBeCloseTo(-39.2);
    expect(p.y + p.height).toBeCloseTo(5);
  });
});

describe("画像があるか", () => {
  it("一覧にある絵は画像、ない絵・キーなしは null", () => {
    const images = { tree: { src: "/spru/items/tree.webp", width: 256, height: 300 } };
    expect(itemImage("tree", images)).toEqual(images.tree);
    expect(itemImage("bench", images)).toBeNull();
    expect(itemImage(null, images)).toBeNull();
  });
});

describe("小さな絵の範囲", () => {
  it("画像の範囲に余白を足した正方形で、背の高い画像もはみ出さない", () => {
    const p = imagePlacement(big, 2);
    const [x, y, w, h] = iconViewBox(p).split(" ").map(Number);
    expect(w).toBeCloseTo(238.4);
    expect(h).toBeCloseTo(238.4);
    expect(x).toBeLessThanOrEqual(p.x);
    expect(y).toBeLessThanOrEqual(p.y);
    expect(x + w).toBeGreaterThanOrEqual(p.x + p.width);
    expect(y + h).toBeGreaterThanOrEqual(p.y + p.height);
  });
});

describe("夜の光の輪(設計書 2026-09-28-town-items 7-3)", () => {
  const images = { lamp: { src: "/spru/items/lamp.webp", width: 128, height: 256 } };
  const lights = { lamp: [{ x: 0.5, y: 0.25, r: 6 }] };

  it("画像の中の割合の位置が、置き場所に合わせたSVGの位置になる", () => {
    // 幅 28.8・高さ 57.6・左 -14.4・上 8-57.6=-49.6
    const [c] = lightCircles("lamp", 1, images, lights, {});
    expect(c.cx).toBeCloseTo(0);
    expect(c.cy).toBeCloseTo(-35.2);
    expect(c.r).toBe(6);
  });

  it("大きさの調整(scale)を変えても、絵の同じ所に付く", () => {
    // 幅 57.6・高さ 115.2・左 -28.8・上 8-115.2=-107.2
    const [c] = lightCircles("lamp", 1, images, lights, { lamp: { scale: 2 } });
    expect(c.cx).toBeCloseTo(0);
    expect(c.cy).toBeCloseTo(-78.4);
  });

  it("明かりのない物・画像のない物・キーなしは空", () => {
    expect(lightCircles("lamp", 1, images, {}, {})).toEqual([]);
    expect(lightCircles("tree", 1, images, { tree: [{ x: 0.5, y: 0.5, r: 5 }] }, {})).toEqual([]);
    expect(lightCircles(null, 1, images, lights, {})).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/item-image.test.ts`
Expected: FAIL（`lightCircles` がない。「2×2でも幅は画像の幅どおり」「細い画像は細く出て」も、今は幅が足元のマスの数で決まるので失敗）

- [ ] **Step 3: 明かりの型を足す**

`frontend/src/components/world/item-image-fit.ts` を次の内容にする:

```ts
/** 画像のアイテム・目印の物ごとの調整(設計書 2026-09-28-town-items 7-2)。scale は大きさの倍率、dx・dy はずらす量(SVGの単位)。必要な物だけ書く */
export type ItemImageFit = { scale?: number; dx?: number; dy?: number };

export const ITEM_IMAGE_FIT: Partial<Record<string, ItemImageFit>> = {};

/** 夜の明かりの光の輪(設計書7-3)。x・y は画像の左上からの割合(0〜1)、r は半径(SVGの単位) */
export type ImageLight = { x: number; y: number; r: number };

/** 光る物の明かり。アイテムも目印も同じキーで書く(石灯籠は両方で使う) */
export const IMAGE_LIGHTS: Partial<Record<string, ImageLight[]>> = {};
```

`LANDMARK_LIGHTS` を消すので、`frontend/src/components/world/landmark-art.tsx` の

```tsx
import { ITEM_IMAGE_FIT, LANDMARK_LIGHTS } from "./item-image-fit";
```

を

```tsx
import { ITEM_IMAGE_FIT } from "./item-image-fit";
```

にし、`LandmarkArt` の画像の枝の

```tsx
        {lit &&
          LANDMARK_LIGHTS[landmarkKey]?.map((light, index) => (
            <circle key={index} cx={light.cx} cy={light.cy} r={light.r} fill="#ffd98a" opacity={0.5} />
          ))}
```

を消す（目印の明かりは Task 3 で町の側から重ねる。今は画像の目印がないので、見た目は変わらない）。

- [ ] **Step 4: 置き場所と光の輪の計算を直す**

`frontend/src/components/world/item-image.ts` を次の内容にする:

```ts
import { SPRU_ITEMS, type SpruImage } from "@/components/spru/spru-assets";

import { HALF_W } from "./iso";
import { IMAGE_LIGHTS, ITEM_IMAGE_FIT, type ImageLight, type ItemImageFit } from "./item-image-fit";

/** 画像の置き場所(SVGの単位。原点=マスの中心、2×2は4マスの真ん中) */
export type ImagePlacement = { x: number; y: number; width: number; height: number };

// 設計書 2026-09-28-town-items 7-2: 幅は 画像の幅(px)×0.225(256pxが1マスの幅の0.9=57.6)。
// 画像の下の真ん中を原点から 足元のマスの数×8 だけ手前に置く
const UNIT_PER_PX = (HALF_W * 2 * 0.9) / 256;
const DROP = 8;

export function imagePlacement(
  image: { width: number; height: number },
  footprint: number,
  fit: ItemImageFit = {},
): ImagePlacement {
  const width = image.width * UNIT_PER_PX * (fit.scale ?? 1);
  const height = (width * image.height) / image.width;
  const bottom = footprint * DROP + (fit.dy ?? 0);
  return { x: -width / 2 + (fit.dx ?? 0), y: bottom - height, width, height };
}

/** その絵の画像。まだ無ければ null(プレゼント箱で描く) */
export function itemImage(
  key: string | null,
  images: Record<string, SpruImage | undefined> = SPRU_ITEMS as Record<string, SpruImage | undefined>,
): SpruImage | null {
  return (key !== null && images[key]) || null;
}

/** 小さな絵(ItemIcon)で見せる範囲。画像の範囲に余白を足した正方形 */
export function iconViewBox(p: ImagePlacement, pad = 4): string {
  const side = Math.max(p.width, p.height) + pad * 2;
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  return [cx - side / 2, cy - side / 2, side, side].map((n) => Math.round(n * 100) / 100).join(" ");
}

/** 夜の光の輪(設計書7-3)。画像の中の割合の位置を、置き場所に合わせてSVGの位置(原点=マスの中心)にする。明かり・画像がなければ空 */
export function lightCircles(
  key: string | null,
  footprint: number,
  images: Record<string, SpruImage | undefined> = SPRU_ITEMS as Record<string, SpruImage | undefined>,
  lights: Partial<Record<string, ImageLight[]>> = IMAGE_LIGHTS,
  fits: Partial<Record<string, ItemImageFit>> = ITEM_IMAGE_FIT,
): { cx: number; cy: number; r: number }[] {
  const image = itemImage(key, images);
  const spots = key === null ? undefined : lights[key];
  if (!image || !spots || key === null) return [];
  const p = imagePlacement(image, footprint, fits[key]);
  return spots.map((spot) => ({ cx: p.x + spot.x * p.width, cy: p.y + spot.y * p.height, r: spot.r }));
}
```

- [ ] **Step 5: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/item-image.test.ts`
Expected: PASS（9件）

- [ ] **Step 6: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/world/item-image.ts frontend/src/components/world/item-image.test.ts frontend/src/components/world/item-image-fit.ts frontend/src/components/world/landmark-art.tsx
git commit -q -m "#00244: feat:町のアイテムの画像の幅を画像の幅から決め、夜の光の輪を画像の中の位置から出す計算を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 48点を切り抜く

**Files:**
- Modify: `tools/spru-assets/crops.json`（`sources` と `"items": []`）
- Modify: `frontend/src/components/world/item-image.test.ts`（1件足す）
- 書き出される: `frontend/public/spru/items/*.webp`（48）・`frontend/src/components/spru/spru-assets.ts`

**Interfaces:**
- Consumes: `imagePlacement`（Task 1）
- Produces: `SPRU_ITEMS` に48キー（アイテム18＋新しい16＋おみやげ10＋目印4〔spru_house・torii・bamboo_grove・pier〕。石灯籠はアイテムと目印で同じキー）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/world/item-image.test.ts` の import に次の2行を足す（`import { iconViewBox, ...` の前）:

```ts
import { SPRU_ITEMS } from "@/components/spru/spru-assets";

import { ITEM_ART_KEYS, SOUVENIR_ART_KEYS } from "./art-keys";
```

ファイルの最後に足す:

```ts

describe("すべての絵に画像がある(設計書 2026-09-28-town-items 7-5)", () => {
  // config/world.php の land の landmarks のうち、畑(garden)は素材集の切り抜きのままなので除く
  const LANDMARK_KEYS = ["spru_house", "torii", "stone_lantern", "bamboo_grove", "pier"];

  it("アイテム・おみやげ・目印のすべてのキーに SPRU_ITEMS の画像がある", () => {
    const missing = [...ITEM_ART_KEYS, ...SOUVENIR_ART_KEYS, ...LANDMARK_KEYS].filter((key) => !(key in SPRU_ITEMS));
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/item-image.test.ts`
Expected: FAIL（今は `SPRU_ITEMS` が空なので、33キーの一覧が出る）

- [ ] **Step 3: 切り抜く範囲を書く**

`tools/spru-assets/crops.json` の `sources` の最後の行を直す:

```json
    "i6": "image6.png",
    "item1-2": "items/item1-2.png",
    "item2-2": "items/item2-2.png",
    "item3-2": "items/item3-2.png",
    "item4": "items/item4.png",
    "item5-2": "items/item5-2.png",
    "item6": "items/item6.png",
    "item7": "items/item7.png",
    "item8": "items/item8.png",
    "item9": "items/item9.png"
  },
```

（直す前は `    "i6": "image6.png"` と `  },`）

同じファイルの `  "items": [],` を次に置き換える（範囲は 2026-09-29 に各シートの背景を抜いて測った外枠。`scale` は設計書7-1の表。`item3-2` は透明なので `background` を書かない）:

```json
  "items": [
    { "key": "flowerbed", "source": "item1-2", "box": [28, 108, 504, 496], "background": "flood", "scale": 0.4 },
    { "key": "bench", "source": "item1-2", "box": [548, 96, 984, 496], "background": "flood", "scale": 0.4 },
    { "key": "bicycle", "source": "item1-2", "box": [1052, 100, 1508, 528], "background": "flood", "scale": 0.4 },
    { "key": "boat_small", "source": "item1-2", "box": [44, 560, 536, 900], "background": "flood", "scale": 0.4 },
    { "key": "pier", "source": "item1-2", "box": [540, 520, 1012, 928], "background": "flood", "scale": 0.4 },
    { "key": "komodo", "source": "item1-2", "box": [1052, 556, 1500, 920], "background": "flood", "scale": 0.4 },
    { "key": "bison", "source": "item2-2", "box": [84, 52, 484, 480], "background": "flood", "scale": 0.4 },
    { "key": "tulip", "source": "item2-2", "box": [536, 88, 952, 480], "background": "flood", "scale": 0.4 },
    { "key": "rock", "source": "item2-2", "box": [996, 140, 1492, 484], "background": "flood", "scale": 0.4 },
    { "key": "sunflower", "source": "item2-2", "box": [64, 484, 484, 972], "background": "flood", "scale": 0.4 },
    { "key": "bush", "source": "item2-2", "box": [568, 576, 972, 964], "background": "flood", "scale": 0.4 },
    { "key": "flower_pots", "source": "item2-2", "box": [1052, 588, 1480, 964], "background": "flood", "scale": 0.4 },
    { "key": "spru_house", "source": "item3-2", "box": [56, 24, 548, 544], "scale": 0.512 },
    { "key": "torii", "source": "item3-2", "box": [576, 56, 992, 504], "scale": 0.512 },
    { "key": "tree", "source": "item3-2", "box": [1024, 48, 1456, 512], "scale": 0.512 },
    { "key": "chochin", "source": "item3-2", "box": [92, 552, 372, 940], "scale": 0.512 },
    { "key": "vending", "source": "item3-2", "box": [584, 528, 888, 952], "scale": 0.512 },
    { "key": "cottage", "source": "item3-2", "box": [968, 520, 1496, 968], "scale": 0.512 },
    { "key": "stone_lantern", "source": "item4", "box": [152, 84, 404, 456], "background": "flood", "scale": 0.533 },
    { "key": "bamboo", "source": "item4", "box": [580, 24, 912, 456], "background": "flood", "scale": 0.533 },
    { "key": "bamboo_grove", "source": "item4", "box": [1000, 24, 1452, 468], "background": "flood", "scale": 0.533 },
    { "key": "sakura", "source": "item4", "box": [56, 484, 532, 964], "background": "flood", "scale": 0.533 },
    { "key": "palm", "source": "item4", "box": [584, 496, 976, 960], "background": "flood", "scale": 0.533 },
    { "key": "parasol", "source": "item4", "box": [1060, 556, 1444, 956], "background": "flood", "scale": 0.533 },
    { "key": "stall", "source": "item5-2", "box": [76, 76, 496, 504], "background": "flood", "scale": 0.556 },
    { "key": "momiji", "source": "item5-2", "box": [552, 24, 996, 512], "background": "flood", "scale": 0.556 },
    { "key": "pine", "source": "item5-2", "box": [1048, 36, 1488, 520], "background": "flood", "scale": 0.556 },
    { "key": "well", "source": "item5-2", "box": [116, 532, 504, 972], "background": "flood", "scale": 0.556 },
    { "key": "street_lamp", "source": "item5-2", "box": [704, 540, 820, 968], "background": "flood", "scale": 0.556 },
    { "key": "mailbox", "source": "item5-2", "box": [1120, 616, 1372, 972], "background": "flood", "scale": 0.556 },
    { "key": "red_house", "source": "item6", "box": [44, 44, 704, 660], "background": "flood", "scale": 0.388 },
    { "key": "dol_hareubang", "source": "item6", "box": [744, 148, 1140, 656], "background": "flood", "scale": 0.388 },
    { "key": "phone_box", "source": "item6", "box": [1240, 52, 1584, 656], "background": "flood", "scale": 0.388 },
    { "key": "eiffel", "source": "item6", "box": [1744, 96, 2116, 656], "background": "flood", "scale": 0.388 },
    { "key": "fountain", "source": "item7", "box": [44, 144, 544, 504], "background": "flood", "scale": 1.0 },
    { "key": "pagoda", "source": "item7", "box": [576, 12, 952, 504], "background": "flood", "scale": 1.0 },
    { "key": "castle", "source": "item7", "box": [1000, 64, 1500, 508], "background": "flood", "scale": 1.0 },
    { "key": "boat_large", "source": "item7", "box": [64, 612, 548, 916], "background": "flood", "scale": 1.0 },
    { "key": "tower", "source": "item7", "box": [600, 508, 948, 980], "background": "flood", "scale": 1.0 },
    { "key": "lighthouse", "source": "item7", "box": [1080, 548, 1472, 972], "background": "flood", "scale": 1.0 },
    { "key": "bakery", "source": "item8", "box": [28, 56, 508, 480], "background": "flood", "scale": 0.985 },
    { "key": "japanese_house", "source": "item8", "box": [520, 40, 1028, 484], "background": "flood", "scale": 0.985 },
    { "key": "cafe", "source": "item8", "box": [1032, 68, 1520, 488], "background": "flood", "scale": 0.985 },
    { "key": "borobudur", "source": "item8", "box": [20, 528, 536, 952], "background": "flood", "scale": 0.985 },
    { "key": "bulguksa", "source": "item8", "box": [548, 560, 1068, 956], "background": "flood", "scale": 0.985 },
    { "key": "liberty", "source": "item8", "box": [1100, 484, 1492, 980], "background": "flood", "scale": 0.985 },
    { "key": "stonehenge", "source": "item9", "box": [28, 252, 864, 792], "background": "flood", "scale": 0.617 },
    { "key": "mont_saint_michel", "source": "item9", "box": [916, 20, 1752, 828], "background": "flood", "scale": 0.617 }
  ],
```

- [ ] **Step 4: 切り抜きを流す**

Run（リポジトリ直下で。2分を超えるので長く待てる形で）: `python3 tools/spru-assets/extract.py ../../company/mascot/assets`
Expected: 最後に「…・アイテム 48・アイコン 15・ステージ 3・アバター 6・旅 3・ページ 1 を書き出しました」

Run: `git status --short`
Expected: 変わったのは `tools/spru-assets/crops.json`・`frontend/src/components/spru/spru-assets.ts`・新しいフォルダ `frontend/public/spru/items/`（とテスト）だけ。ほかの `frontend/public/spru/` の絵が変わっていないこと

- [ ] **Step 5: 切り抜いた48点を目で見る**

```bash
python3 - <<'EOF'
from pathlib import Path
from PIL import Image
files = sorted(Path("frontend/public/spru/items").glob("*.webp"))
cell, cols = 130, 8
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGBA", (cell * cols, cell * rows * 2), (128, 128, 128, 255))
for i, f in enumerate(files):
    img = Image.open(f).convert("RGBA")
    img.thumbnail((cell - 8, cell - 8))
    for row, bg in ((0, (35, 35, 35, 255)), (1, (170, 215, 120, 255))):
        x, y = (i % cols) * cell, ((i // cols) * 2 + row) * cell
        tile = Image.new("RGBA", (cell, cell), bg)
        tile.alpha_composite(img, ((cell - img.width) // 2, (cell - img.height) // 2))
        sheet.alpha_composite(tile, (x, y))
out = Path("/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/items-check.png")
sheet.save(out)
print(len(files), out)
EOF
```

Expected: `48` と見本のパス。見本を開き、48点すべてで、背景の白やもやが縁に残っていない・絵が欠けていない・隣の絵が入っていないこと

- [ ] **Step 6: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/item-image.test.ts`
Expected: PASS（10件）

- [ ] **Step 7: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 8: コミット**

```bash
git add tools/spru-assets/crops.json frontend/src/components/spru/spru-assets.ts frontend/public/spru/items frontend/src/components/world/item-image.test.ts
git commit -q -m "#00245: feat:Ownerのシート9枚から町のアイテム・おみやげ・目印の48点を切り抜く" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: プログラムの絵を消し、明かりを画像の中の位置にする

**Files:**
- Modify: `frontend/src/components/world/item-art.tsx`（全体）
- Modify: `frontend/src/components/world/landmark-art.tsx`（全体）
- Modify: `frontend/src/components/world/world-scene.tsx`（import と光の輪）
- Modify: `frontend/src/components/world/item-image-fit.ts`（`IMAGE_LIGHTS` の値）
- Delete: `frontend/src/components/world/travel-art.tsx`・`frontend/src/components/world/iso-shapes.tsx`

**Interfaces:**
- Consumes: `lightCircles`・`IMAGE_LIGHTS`（Task 1）、`SPRU_ITEMS`（Task 2）
- Produces:
  - `ItemArt({ assetKey: string | null })`・`ItemIcon({ assetKey, size?, className? })`（今と同じ形。`ITEM_LIGHTS` はなくなる）
  - `LandmarkArt({ landmarkKey: string })`（`lit` はなくなる）

- [ ] **Step 1: 明かりの位置が絵に合っているかを確かめる見本を作る**

`frontend/src/components/world/item-image-fit.ts` の `IMAGE_LIGHTS` を次の値にする（2026-09-29 にシートの上で測った目安）:

```ts
export const IMAGE_LIGHTS: Partial<Record<string, ImageLight[]>> = {
  chochin: [{ x: 0.71, y: 0.5, r: 9 }],
  stone_lantern: [{ x: 0.5, y: 0.41, r: 7 }],
  street_lamp: [{ x: 0.48, y: 0.16, r: 7 }],
  tower: [{ x: 0.5, y: 0.05, r: 7 }],
  liberty: [{ x: 0.34, y: 0.03, r: 7 }],
  lighthouse: [{ x: 0.45, y: 0.18, r: 10 }],
  spru_house: [
    { x: 0.09, y: 0.675, r: 6 },
    { x: 0.71, y: 0.71, r: 6 },
  ],
};
```

画像の上に光の輪を描いた見本を作って開く（リポジトリ直下で）:

```bash
python3 - <<'EOF'
import re
from pathlib import Path
from PIL import Image, ImageDraw
UNIT = 57.6 / 256  # 設計書7-2: 1px = 0.225
src = Path("frontend/src/components/world/item-image-fit.ts").read_text(encoding="utf-8")
block = src.split("export const IMAGE_LIGHTS")[1]
lights = {}
for key, body in re.findall(r"([a-z_]+): \[(.*?)\],\n", block, re.S):
    lights[key] = [tuple(map(float, m)) for m in re.findall(r"\{ x: ([\d.]+), y: ([\d.]+), r: ([\d.]+) \}", body)]
tiles = []
for key, spots in lights.items():
    img = Image.open(f"frontend/public/spru/items/{key}.webp").convert("RGBA")
    k = 3
    img = img.resize((img.width * k // 2, img.height * k // 2))
    d = ImageDraw.Draw(img)
    for x, y, r in spots:
        rr = r / UNIT * k / 2
        d.ellipse([x * img.width - rr, y * img.height - rr, x * img.width + rr, y * img.height + rr], outline=(255, 0, 180, 255), width=3)
    tiles.append(img)
W = sum(t.width for t in tiles) + 10 * len(tiles)
H = max(t.height for t in tiles)
sheet = Image.new("RGBA", (W, H), (30, 30, 50, 255))
x = 0
for t in tiles:
    sheet.alpha_composite(t, (x, H - t.height)); x += t.width + 10
out = "/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/lights-check.png"
sheet.save(out); print(list(lights), out)
EOF
```

Expected: 7つのキーと見本のパス。見本を開き、ピンクの輪が ちょうちんの紙の袋・石灯籠の火袋・街灯の丸い灯り・タワーの先・自由の女神のたいまつ・灯台の灯りの部屋・スプルの家のランプと窓 に重なっていること。ずれていたら `x`・`y`（割合）・`r` を直して、もう一度流す。直した値は Ruling として記録する

- [ ] **Step 2: アイテムの絵を画像・スプルの花・プレゼント箱だけにする**

`frontend/src/components/world/item-art.tsx` を次の内容にする（スプルの花の絵は今のものをそのまま移す）:

```tsx
import type { ReactNode } from "react";

import { SPRU_BLOOM } from "@/components/spru/spru-assets";

import { isBigAsset } from "./art-keys";
import { iconViewBox, imagePlacement, itemImage } from "./item-image";
import { ImageArt } from "./item-image-art";
import { ITEM_IMAGE_FIT } from "./item-image-fit";

// 原点(0,0)がマスの中心(地面に接する点)。アイテム・おみやげは SPRU_ITEMS の画像で描く(docs/design/2026-09-28-town-items-design.md 7章)。
// 夜の光の輪は町の側で重ねる(world-scene.tsx・lightCircles)

// 種から咲いた「スプルの花」(非売品)。花は素材集の切り抜き
const SPRU_FLOWER: ReactNode = (
  <g>
    <ellipse cx={0} cy={2} rx={11} ry={4.5} fill="#2f5d2a" opacity={0.15} />
    <path d="M0 2 C-1.5 -8 1.5 -14 0 -22" stroke="#5a9e3a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
    <ellipse cx={-5} cy={-9} rx={5} ry={2.4} fill="#74b35d" transform="rotate(-25 -5 -9)" />
    <ellipse cx={5} cy={-14} rx={5} ry={2.4} fill="#86c56d" transform="rotate(25 5 -14)" />
    <image href={SPRU_BLOOM.flower.src} x={-11} y={-36} width={22} height={26} />
  </g>
);

// 画像のないキーでも画面が壊れないようにする代わりの絵(プレゼント箱)
const FALLBACK: ReactNode = (
  <g>
    <ellipse cx={0} cy={2} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
    <polygon points="-12,-2 0,4 0,-12 -12,-18" fill="#f2b632" />
    <polygon points="0,4 12,-2 12,-18 0,-12" fill="#d4960e" />
    <polygon points="-12,-18 0,-12 12,-18 0,-24" fill="#ffd35c" />
    <path d="M-6 -21 L6 -15 M0 -12 V4" stroke="#e5533f" strokeWidth={2} />
  </g>
);

export function ItemArt({ assetKey }: { assetKey: string | null }) {
  const image = itemImage(assetKey);
  if (image && assetKey) {
    return <ImageArt image={image} footprint={isBigAsset(assetKey) ? 2 : 1} fit={ITEM_IMAGE_FIT[assetKey]} />;
  }
  return <>{assetKey === "spru_flower" ? SPRU_FLOWER : FALLBACK}</>;
}

export function ItemIcon({
  assetKey,
  size = 56,
  className,
}: {
  assetKey: string | null;
  size?: number;
  className?: string;
}) {
  const image = itemImage(assetKey);
  // 画像の物は画像の範囲に合わせる。スプルの花・プレゼント箱は1マスの範囲
  const viewBox =
    image && assetKey
      ? iconViewBox(imagePlacement(image, isBigAsset(assetKey) ? 2 : 1, ITEM_IMAGE_FIT[assetKey]))
      : "-34 -62 68 72";
  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
```

- [ ] **Step 3: 目印の絵を画像だけにする**

`frontend/src/components/world/landmark-art.tsx` を次の内容にする:

```tsx
import { itemImage } from "./item-image";
import { ImageArt } from "./item-image-art";
import { ITEM_IMAGE_FIT } from "./item-image-fit";

/**
 * 最初から町にある、動かせない目印(スプルの家・鳥居・石灯籠・竹林・桟橋。docs/design/2026-09-28-town-items-design.md 7-6)。
 * 原点(0,0)がマスの中心。画像で描き、夜の光の輪は町の側で重ねる(world-scene.tsx・lightCircles)
 */
export function LandmarkArt({ landmarkKey }: { landmarkKey: string }) {
  const image = itemImage(landmarkKey);
  return image ? <ImageArt image={image} footprint={1} fit={ITEM_IMAGE_FIT[landmarkKey]} /> : null;
}
```

- [ ] **Step 4: 町の光の輪を lightCircles で重ねる**

`frontend/src/components/world/world-scene.tsx` の

```tsx
import { ITEM_LIGHTS, ItemArt } from "./item-art";
```

を

```tsx
import { ItemArt } from "./item-art";
import { lightCircles } from "./item-image";
```

に（`./item-image` の import は、ほかの `./` の import の並びに合わせて置く）、目印の

```tsx
              {o.kind === "landmark" && (
                <g style={artStyle}>
                  {o.landmarkKey === "garden" ? (
                    <GardenArt state={garden.state} />
                  ) : (
                    <LandmarkArt landmarkKey={o.landmarkKey} lit={theme.lit} />
                  )}
                </g>
              )}
```

を

```tsx
              {o.kind === "landmark" && (
                <>
                  <g style={artStyle}>
                    {o.landmarkKey === "garden" ? (
                      <GardenArt state={garden.state} />
                    ) : (
                      <LandmarkArt landmarkKey={o.landmarkKey} />
                    )}
                  </g>
                  {theme.lit &&
                    lightCircles(o.landmarkKey, 1).map((light, index) => (
                      <circle key={index} cx={light.cx} cy={light.cy} r={light.r} fill="#ffd98a" opacity={0.5} />
                    ))}
                </>
              )}
```

に、アイテムの

```tsx
                  {theme.lit && o.item.asset_key && ITEM_LIGHTS[o.item.asset_key] && (
                    <circle
                      cx={ITEM_LIGHTS[o.item.asset_key].cx}
                      cy={ITEM_LIGHTS[o.item.asset_key].cy}
                      r={ITEM_LIGHTS[o.item.asset_key].r}
                      fill="#ffd98a"
                      opacity={0.5}
                    />
                  )}
```

を

```tsx
                  {theme.lit &&
                    lightCircles(o.item.asset_key, o.item.footprint).map((light, index) => (
                      <circle key={index} cx={light.cx} cy={light.cy} r={light.r} fill="#ffd98a" opacity={0.5} />
                    ))}
```

に直す。

- [ ] **Step 5: 使わなくなったプログラムの絵を消す**

```bash
git rm -q frontend/src/components/world/travel-art.tsx frontend/src/components/world/iso-shapes.tsx
cd frontend && grep -rn "travel-art\|iso-shapes\|TRAVEL_ART\|IsoBox\|IsoRoof\|ITEM_LIGHTS\|LANDMARK_LIGHTS" src
```

Expected: grep は何も出さない（出たら、その参照を消す）

- [ ] **Step 6: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/world/item-art.tsx frontend/src/components/world/landmark-art.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/item-image-fit.ts
git commit -q -m "#00246: feat:町のアイテム・目印をすべて画像にしてプログラムの絵を消し、夜の明かりを画像の中の位置から重ねる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（`travel-art.tsx`・`iso-shapes.tsx` の削除は Step 5 の `git rm` で入っている）

---

### Task 4: 新しい16点をショップに並べる

**Files:**
- Modify: `tests/Feature/WorldBuildingTest.php`（品ぞろえのテスト）
- Modify: `config/world.php`（`asset_keys`・`asset_footprints`・`asset_categories`）
- Modify: `database/seeders/WorldItemSeeder.php`
- Modify: `frontend/src/components/world/art-keys.ts`

**Interfaces:**
- Consumes: `SPRU_ITEMS` の新しい16キー（Task 2）
- Produces: `ITEM_ART_KEYS` に16キー（`tulip`・`rock`・`sunflower`・`bush`・`momiji`・`pine`・`flower_pots`・`well`・`street_lamp`・`mailbox`・`cottage`・`red_house`・`bakery`・`japanese_house`・`cafe`・`lighthouse`）、`BIG_ASSETS` に `bakery`・`japanese_house`・`cafe`・`lighthouse`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldBuildingTest.php` の

```php
it('品ぞろえのシーダーで大きな建物5つ(F回の大きな船を含む)を含む18種類がそろい、2回実行しても増えない', function () {
    $this->seed(WorldItemSeeder::class);
    $this->seed(WorldItemSeeder::class);

    $items = ShopItem::query()->where('type', 'decoration')->get();

    expect($items)->toHaveCount(18)
        ->and($items->filter(fn (ShopItem $item) => $item->footprint() === 2)->pluck('name')->sort()->values()->all())
        ->toBe(['お城', 'タワー', '五重塔', '噴水', '大きな船'])
        ->and($items->firstWhere('name', 'タワー')->only(['price', 'min_level']))->toBe(['price' => 500, 'min_level' => 12]);
});
```

を次に置き換える:

```php
it('品ぞろえのシーダーで大きな建物9つ(新しい4つを含む)を含む34種類がそろい、2回実行しても増えない', function () {
    $this->seed(WorldItemSeeder::class);
    $this->seed(WorldItemSeeder::class);

    $items = ShopItem::query()->where('type', 'decoration')->get();

    expect($items)->toHaveCount(34)
        ->and($items->filter(fn (ShopItem $item) => $item->footprint() === 2)->pluck('name')->sort()->values()->all())
        ->toBe(['お城', 'カフェ', 'タワー', 'パン屋', '五重塔', '和風の家', '噴水', '大きな船', '灯台'])
        ->and($items->firstWhere('name', 'タワー')->only(['price', 'min_level']))->toBe(['price' => 500, 'min_level' => 12]);
});

it('新しい16点は設計書 2026-09-28-town-items 5-2 のレベル・値段・カテゴリで並ぶ', function () {
    $this->seed(WorldItemSeeder::class);

    $row = function (string $name): array {
        $item = ShopItem::query()->where('name', $name)->firstOrFail();

        return [$item->min_level, $item->price, $item->assetKey(), $item->category()];
    };

    expect($row('チューリップ'))->toBe([1, 15, 'tulip', 'nature'])
        ->and($row('松'))->toBe([6, 45, 'pine', 'nature'])
        ->and($row('植木鉢'))->toBe([1, 15, 'flower_pots', 'decor'])
        ->and($row('街灯'))->toBe([3, 40, 'street_lamp', 'decor'])
        ->and($row('小さな家'))->toBe([2, 120, 'cottage', 'house'])
        ->and($row('カフェ'))->toBe([9, 320, 'cafe', 'house'])
        ->and($row('灯台'))->toBe([9, 350, 'lighthouse', 'landmark']);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/WorldBuildingTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"failed"`（件数が18、新しい物がない）

- [ ] **Step 3: サーバーの設定と品ぞろえに足す**

`config/world.php` の `asset_keys` の

```php
        'boat_small', 'boat_large',
    ],
```

を

```php
        'boat_small', 'boat_large',
        // 段階2・3(docs/design/2026-09-28-town-items-design.md 5-2)
        'tulip', 'rock', 'sunflower', 'bush', 'momiji', 'pine', 'flower_pots', 'well', 'street_lamp', 'mailbox',
        'cottage', 'red_house', 'bakery', 'japanese_house', 'cafe', 'lighthouse',
    ],
```

に、`asset_footprints` の

```php
        'borobudur' => 2, 'bulguksa' => 2, 'liberty' => 2, 'stonehenge' => 2, 'mont_saint_michel' => 2,
    ],
```

を

```php
        'borobudur' => 2, 'bulguksa' => 2, 'liberty' => 2, 'stonehenge' => 2, 'mont_saint_michel' => 2,
        'bakery' => 2, 'japanese_house' => 2, 'cafe' => 2, 'lighthouse' => 2,
    ],
```

に、`asset_categories` の

```php
        'bicycle' => 'vehicle', 'boat_small' => 'vehicle', 'boat_large' => 'vehicle',
    ],
```

を

```php
        'bicycle' => 'vehicle', 'boat_small' => 'vehicle', 'boat_large' => 'vehicle',
        'tulip' => 'nature', 'rock' => 'nature', 'sunflower' => 'nature', 'bush' => 'nature', 'momiji' => 'nature', 'pine' => 'nature',
        'flower_pots' => 'decor', 'well' => 'decor', 'street_lamp' => 'decor', 'mailbox' => 'decor',
        'cottage' => 'house', 'red_house' => 'house', 'bakery' => 'house', 'japanese_house' => 'house', 'cafe' => 'house',
        'lighthouse' => 'landmark',
    ],
```

に直す。

`database/seeders/WorldItemSeeder.php` の

```php
            ['name' => '大きな船', 'price' => 450, 'min_level' => 11, 'asset_key' => 'boat_large'],
        ];
```

を

```php
            ['name' => '大きな船', 'price' => 450, 'min_level' => 11, 'asset_key' => 'boat_large'],
            // 段階2・3(docs/design/2026-09-28-town-items-design.md 5-2)。序盤(Lv.1〜3)の物を多めにした
            ['name' => 'チューリップ', 'price' => 15, 'min_level' => 1, 'asset_key' => 'tulip'],
            ['name' => '岩と草', 'price' => 15, 'min_level' => 2, 'asset_key' => 'rock'],
            ['name' => 'ひまわり', 'price' => 25, 'min_level' => 3, 'asset_key' => 'sunflower'],
            ['name' => 'まるい植え込み', 'price' => 20, 'min_level' => 4, 'asset_key' => 'bush'],
            ['name' => 'もみじ', 'price' => 50, 'min_level' => 5, 'asset_key' => 'momiji'],
            ['name' => '松', 'price' => 45, 'min_level' => 6, 'asset_key' => 'pine'],
            ['name' => '植木鉢', 'price' => 15, 'min_level' => 1, 'asset_key' => 'flower_pots'],
            ['name' => '井戸', 'price' => 50, 'min_level' => 2, 'asset_key' => 'well'],
            ['name' => '街灯', 'price' => 40, 'min_level' => 3, 'asset_key' => 'street_lamp'],
            ['name' => 'ポスト', 'price' => 35, 'min_level' => 5, 'asset_key' => 'mailbox'],
            ['name' => '小さな家', 'price' => 120, 'min_level' => 2, 'asset_key' => 'cottage'],
            ['name' => '赤い屋根の家', 'price' => 180, 'min_level' => 5, 'asset_key' => 'red_house'],
            ['name' => 'パン屋', 'price' => 250, 'min_level' => 6, 'asset_key' => 'bakery'],
            ['name' => '和風の家', 'price' => 280, 'min_level' => 8, 'asset_key' => 'japanese_house'],
            ['name' => 'カフェ', 'price' => 320, 'min_level' => 9, 'asset_key' => 'cafe'],
            ['name' => '灯台', 'price' => 350, 'min_level' => 9, 'asset_key' => 'lighthouse'],
        ];
```

に直す。

- [ ] **Step 4: サーバーのテストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/WorldBuildingTest.php tests/Feature/WorldCategoryTest.php 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`
Expected: `"result":"passed"`（すべて PASS。`WorldCategoryTest` の「すべての asset_keys にカテゴリがある」も通る）

- [ ] **Step 5: 画面の一覧が設定と食い違うのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/art-keys.test.ts`
Expected: FAIL（`asset_keys`・`asset_footprints`・`asset_categories` と画面の一覧が同じでない）

- [ ] **Step 6: 画面の一覧に足す**

`frontend/src/components/world/art-keys.ts` の `ITEM_ART_KEYS` の

```ts
  "boat_small",
  "boat_large",
] as const;

export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];
```

を

```ts
  "boat_small",
  "boat_large",
  // 段階2・3(docs/design/2026-09-28-town-items-design.md 5-2)
  "tulip",
  "rock",
  "sunflower",
  "bush",
  "momiji",
  "pine",
  "flower_pots",
  "well",
  "street_lamp",
  "mailbox",
  "cottage",
  "red_house",
  "bakery",
  "japanese_house",
  "cafe",
  "lighthouse",
] as const;

export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];
```

に、`ITEM_ART_LABELS` の `  boat_large: "大きな船",` の次に足す:

```ts
  tulip: "チューリップ",
  rock: "岩と草",
  sunflower: "ひまわり",
  bush: "まるい植え込み",
  momiji: "もみじ",
  pine: "松",
  flower_pots: "植木鉢",
  well: "井戸",
  street_lamp: "街灯",
  mailbox: "ポスト",
  cottage: "小さな家",
  red_house: "赤い屋根の家",
  bakery: "パン屋",
  japanese_house: "和風の家",
  cafe: "カフェ",
  lighthouse: "灯台",
```

`ITEM_ART_CATEGORIES` の `  boat_large: "vehicle",` の次に足す:

```ts
  tulip: "nature",
  rock: "nature",
  sunflower: "nature",
  bush: "nature",
  momiji: "nature",
  pine: "nature",
  flower_pots: "decor",
  well: "decor",
  street_lamp: "decor",
  mailbox: "decor",
  cottage: "house",
  red_house: "house",
  bakery: "house",
  japanese_house: "house",
  cafe: "house",
  lighthouse: "landmark",
```

`BIG_ASSETS` の `  "mont_saint_michel",` の次に足す:

```ts
  "bakery",
  "japanese_house",
  "cafe",
  "lighthouse",
```

- [ ] **Step 7: 画面のテスト全部・型・lint を確かめる**

Run: `cd frontend && npx vitest run src/components/world/art-keys.test.ts && npm run typecheck && npm run lint && npm test`
Expected: art-keys は PASS。エラーなし。テストは全部 PASS（Task 2 の「すべての絵に画像がある」も、新しい16キーを含めて通る）

- [ ] **Step 8: 開発用のデータに新しい品ぞろえを足す**

Run: `./vendor/bin/sail artisan db:seed --class=WorldItemSeeder`
Expected: エラーなし。`./vendor/bin/sail artisan tinker --execute='echo App\Models\ShopItem::where("type","decoration")->count(), PHP_EOL;'` が `34`

- [ ] **Step 9: コミット**

```bash
git add tests/Feature/WorldBuildingTest.php config/world.php database/seeders/WorldItemSeeder.php frontend/src/components/world/art-keys.ts
git commit -q -m "#00247: feat:町のアイテムに新しい16点(花・木・井戸・街灯・家・お店・灯台など)を足してショップに並べる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 町に置いて確かめ、調整して、ドキュメントを直す

**Files:**
- Modify（調整が要れば）: `tools/spru-assets/crops.json`（シートの `scale`）・`frontend/src/components/world/item-image-fit.ts`（物ごとの `ITEM_IMAGE_FIT`・`IMAGE_LIGHTS`）
- Modify: `SPEC.md`・`TASKS.md`

**Interfaces:**
- Consumes: Task 1〜4 のすべて
- Produces: なし

- [ ] **Step 1: 全部を町の大きさで並べた見本を作って、大きさの比率を見る**

リポジトリ直下で（設計書7-2の計算をそのまま使い、菱形のマスの上に48点を並べる。`ITEM_IMAGE_FIT` に `scale` を書いた物はその倍率も掛ける）:

```bash
python3 - <<'EOF'
import re
from pathlib import Path
from PIL import Image, ImageDraw
U = 3  # 1 SVG単位 = 3px
UNIT = 57.6 / 256
ts = Path("frontend/src/components/spru/spru-assets.ts").read_text(encoding="utf-8")
block = ts.split("export const SPRU_ITEMS = {")[1].split("\n}")[0]
items = [(k, int(w), int(h)) for k, w, h in re.findall(r'"([a-z_]+)": \{ src: "[^"]+", width: (\d+), height: (\d+) \}', block)]
art = Path("frontend/src/components/world/art-keys.ts").read_text(encoding="utf-8")
big = set(re.findall(r'"([a-z_]+)"', art.split("export const BIG_ASSETS")[1].split("];")[0]))
fit_src = Path("frontend/src/components/world/item-image-fit.ts").read_text(encoding="utf-8").split("export const ITEM_IMAGE_FIT")[1].split("};")[0]
fits = {k: float(s) for k, s in re.findall(r"([a-z_]+): \{[^}]*scale: ([\d.]+)", fit_src)}
cols, cw, ch = 8, 150 * U, 190 * U
rows = (len(items) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * cw, rows * ch), (170, 215, 120, 255))
d = ImageDraw.Draw(sheet)
for i, (k, w, h) in enumerate(items):
    fp = 2 if k in big else 1
    ox, oy = (i % cols) * cw + cw // 2, (i // cols) * ch + ch - 40 * U
    hw, hh = 32 * fp * U, 16 * fp * U
    d.polygon([(ox, oy - hh), (ox + hw, oy), (ox, oy + hh), (ox - hw, oy)], outline=(80, 130, 50, 255), width=2)
    width = w * UNIT * fits.get(k, 1.0) * U
    height = width * h / w
    img = Image.open(f"frontend/public/spru/items/{k}.webp").convert("RGBA").resize((round(width), round(height)))
    sheet.alpha_composite(img, (round(ox - width / 2), round(oy + fp * 8 * U - height)))
    d.text(((i % cols) * cw + 6, (i // cols) * ch + 6), k, fill=(30, 30, 30, 255))
out = "/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/town-scale-check.png"
sheet.save(out); print(len(items), out)
EOF
```

Expected: `48` と見本のパス。見本を開き、次を確かめる:
- 家（spru_house・cottage・red_house）が1マスにだいたいおさまる大きさで、ほぼ同じ大きさ
- 木（tree・sakura・momiji・pine・palm）は家と同じくらいか少し高い
- 低い物（ベンチ・花だん・自転車・岩など）は家より小さい
- 細い物（街灯・ポスト・ちょうちん）は細く、家より少し低いか同じくらい
- 2×2の物は4マスにだいたいおさまり、1マスの家より大きい

合わない物があれば、シート全体なら `crops.json` のそのシートの `scale` を、1点だけなら `item-image-fit.ts` の `ITEM_IMAGE_FIT` に `{ scale }` を書いて直す（`crops.json` を直したら Task 2 の Step 4 の切り抜きを流し直す）。直した値は Ruling として記録する

- [ ] **Step 2: 開発用のデータの確認前の状態を記録する**

Run（リポジトリ直下で）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::find(7); echo json_encode([$p->only(["current_streak","best_streak","last_played_date","xp","coins","hp","points","avatar","level","last_review_on"]), DB::table("profile_errands")->where("user_profile_id",7)->pluck("id"), DB::table("profile_world_items")->where("user_profile_id",7)->count(), DB::table("profile_currency_ledger")->max("id")]), PHP_EOL;'
```

Expected: 1行のJSON。これを確認前の状態として控える

- [ ] **Step 3: ブラウザで確かめる（幅390px）**

`test@example.com` / `password` でログインし、町テストを選ぶ（ログイン済みならそのまま）。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、見終わったら消す。

- 町（`/`）: スプルの家・鳥居・石灯籠（目印）と、置いてあるアイテム（ベンチ・花だん・ちょうちんなど）が画像で出る。大きさが町のマス・スプル・仲間と合っている。足元の草・台座と、プログラムの影（だ円）が重なって変に見えない
- ショップ（`/shop`）: 各カテゴリのタブで、新しい16点を含む品が小さな絵で出る。細い物（街灯）が見えないほど小さくない。高い物（五重塔・タワー）が枠からはみ出さない
- バッグ（`/bag`）: 持っている物の小さな絵
- 夜の明かり: Task 3 の Step 1 の見本で位置を確かめたので、ブラウザでは確かめない（町の時刻を変える仕組みがないため）

合わない物は Step 1 と同じやり方で直し、Ruling として記録する。影が草・台座と重なって変に見える物は、`ITEM_IMAGE_FIT` の `dy` で絵を少し下げて影を隠すか、影をそのままにするかを決めて Ruling に書く

- [ ] **Step 4: 幅320pxと1280pxでも確かめる**

- 320px: ショップの小さな絵の枠からはみ出さない。町の大きな絵が上の札に重ならない
- 1280px: 町とショップが今までどおりの幅におさまる

- [ ] **Step 5: 開発用のデータを元に戻す**

町を開いたことで今日のおつかいが増えた場合は、Step 2 のあとに増えた `profile_errands` の行を消す（町テスト＝id 7 の行だけ）:

```bash
./vendor/bin/sail artisan tinker --execute='DB::table("profile_errands")->where("user_profile_id",7)->whereNotIn("id",[<Step 2 で控えたおつかいの id>])->delete();'
```

もう一度 Step 2 のコマンドを流す。
Expected: Step 2 と同じ（体力の自然回復で `hp` だけ変わった場合は、Step 2 の値に戻す: `App\Models\UserProfile::whereKey(7)->update(["hp"=><値>])`）

- [ ] **Step 6: ドキュメントを直す**

`SPEC.md` の4-9（ワールド・自分の町）の、町のアイテムのカテゴリ分け（2026-09-28）の行の次に足す:

```markdown
- ✅（2026-09-29）**町のアイテム・おみやげ・目印をすべて画像にした**: Ownerのシート9枚（`company/mascot/assets/items/`、つやのある立体のタッチ）から48点を切り抜き、プログラムの絵を消した（種から咲くスプルの花と、画像のないときのプレゼント箱は残す）。町での幅は「画像の幅×0.225」で、同じシートの物は同じ縮尺で切り抜くので、シートの中の大きさの比率がそのまま町の大きさになる。夜の明かりは画像の中の位置（割合）で持つ。新しい16点（チューリップ・岩と草・ひまわり・まるい植え込み・もみじ・松・植木鉢・井戸・街灯・ポスト・小さな家・赤い屋根の家・パン屋・和風の家・カフェ・灯台）をショップに足し、町のアイテムは34種類になった（`docs/design/2026-09-28-town-items-design.md` 7〜8章）
```

`TASKS.md` の「町のアイテムのカテゴリ分けと画像への差し替え」の下で:

- `  - [ ] 段階2: アイテム画像の試しの1枚（…）が届いたら、…` と、その次の段階3の行を、次の1行にまとめる: `  - [x] 段階2・3（2026-09-29。実装計画 `docs/design/2026-09-29-town-item-images-plan.md`）: シート9枚から48点を切り抜いて画像にし、プログラムの絵を消した。大きさは画像の幅から、夜の明かりは画像の中の位置から決める。新しい16点をショップに足した（34種類）`
- `  - アイテム画像の依頼（Ownerが追加の画像のあとに用意）: …` の行を消す（届いた）
- 見出しの行の `- [ ] **町のアイテムのカテゴリ分けと画像への差し替え**` を `- [x] **町のアイテムのカテゴリ分けと画像への差し替え**` に直す

- [ ] **Step 7: サーバーと画面のテスト全部・型・lint を確かめる**

Run: `./vendor/bin/sail test 2>&1 | grep -o '"tool":"pest","result":"[a-z]*","tests":[0-9]*,"passed":[0-9]*'`（2分を超えるので長く待てる形で）と `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: サーバーは `"result":"passed"`（386件）、画面は全部 PASS、エラーなし

- [ ] **Step 8: コミット**

```bash
git add SPEC.md TASKS.md tools/spru-assets/crops.json frontend/src/components/world/item-image-fit.ts frontend/src/components/spru/spru-assets.ts frontend/public/spru/items
git commit -q -m "#00248: docs:町のアイテムの画像(段階2・3)をSPEC/TASKSに反映し、町で見た大きさを調整する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（調整がなかったときは、`crops.json`・`item-image-fit.ts`・画像は変わっていないので `git add` しても何も入らない）
