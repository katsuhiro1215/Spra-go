# スプルのアイコン・画像を画面に入れる 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ownerが用意したスプルのアイコン・画像（image4〜6・9・10）を切り抜いて画面に入れ、線のアイコンと仮の絵をなくし、アプリのアイコン・SNS画像・見つからないページを作る。

**Architecture:** 今の切り抜きの道具（`tools/spru-assets/extract.py`・`crops.json`）に組（icons・stages・avatars・travel・pages）を足し、`spru-assets.ts` の一覧から画面が読む。絵を出すのは新しい共通の部品 `AssetImage` 1つ。アプリのアイコンとSNS画像は新しい道具 `tools/spru-assets/brand.py` で1回作り、Next.jsの決まった名前のファイルとして `frontend/src/app/` に置く。サーバー（Laravel）は触らない。

**Tech Stack:** Next.js 16（App Router・メタデータのファイルの決まり）/ React 19 / TypeScript / Tailwind v4 / Vitest / Python 3 + Pillow / sharp（Next.jsに入っている。ロゴのSVGをPNGにする）

**Spec:** `docs/design/2026-09-29-spru-icons-design.md`

**ブランチ:** `feature/spru-icons`（作成済み。設計書 #00231・この計画 #00232）。タスクのコミットは #00233 から順に。

## Global Constraints

- 返答・ドキュメント・コミットの要約は日本語。コミットは `git commit -m "#NNNNN: type:要約" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`
- 名前の表記は「Spra Go」（空白あり）。「スプラ」を単独で使わない
- ブランドの S: アプリのアイコン・SNS画像は image9・image10（S字の芽）から作る。画面の中のバッジは葉の形のままでよい
- 切り抜いた絵は元の絵より大きくしない（設計書3-3）
- ふりがな・文字の大きさのアイコン、「おつかい」の札の線の絵（リュック）は今のまま
- 手紙・鍵のスプル（`icons/letter`・`icons/key`）は切り抜くだけで、画面では使わない
- 有料の素材は使わない。書体は M PLUS Rounded 1c（SIL Open Font License）
- 画面のテストは `cd frontend && npx vitest run <ファイル>`、全部は `npm test`・`npm run typecheck`・`npm run lint`（どれも `frontend/` で）
- 切り抜きは リポジトリ直下（`projects/Spra-go/`）で `python3 tools/spru-assets/extract.py ../../company/mascot/assets`
- 開発用のデータベースは `migrate:fresh` しない。ブラウザで確かめたあとは確認前の状態に戻す
- 開発用の画面は `http://localhost:3000`（すでに動いている。起動し直さない）

## Review Focus

1. 古いプロフィールでアバターが空（`null`）や知らない値のとき、「じぶん」とプロフィール選びで1つ目のアバターが出て、画面が壊れない → Task 2 の `avatarImage` のテスト（空・知らない名前は1つ目）と、Task 3 の `ProfileAvatar`（プレイヤーがいないときはスプルの顔）
2. 鍵がかかっているボス・クリアしたボスのように状態が重なるステージで、決めた順（鍵 > クリア > まだのボス > 遊べる）の絵になる → Task 4 の `stageNodeImage` のテスト
3. 切り抜き忘れ・キーの書き間違いで絵のファイルがない → Task 1 の一覧のテスト（全キー・ファイルがある）と、Task 3 の `NAV_ITEMS` のテスト、型（`SpruIconKey`）
4. 幅320pxの画面で、下のメニューの大きい「まち」の絵と「じぶん」のアバターの芽がはみ出して、ほかのボタンや字に重ならない → Task 8 のブラウザでの確認
5. 本番で `NEXT_PUBLIC_SITE_URL` を設定し忘れて、SNSの画像のURLが `localhost` になる → Task 7 で `TASKS.md` の公開前の確認に足す（Task 8）。開発ではページの頭の `og:image` を確かめる

---

## ファイルの構成

| ファイル | 役割 | タスク |
|---|---|---|
| `tools/spru-assets/crops.json` | 切り抜く範囲（新しい元の絵 i4・i5・i6 と5つの組） | 1 |
| `tools/spru-assets/extract.py` | 新しい組を切り抜き、`SPRU_ICONS` などを書き出す | 1 |
| `frontend/public/spru/{icons,stages,avatars,travel,pages}/` | 切り抜いた絵（道具が書き出す） | 1 |
| `frontend/src/components/spru/spru-assets.ts` | 画面が読む一覧（道具が書き出す。手で直さない） | 1 |
| `frontend/src/components/spru/spru-assets.test.ts` | 新しい一覧のキーとファイルのテスト（新規） | 1 |
| `frontend/src/components/app/asset-image.tsx` | 切り抜いた絵を高さを決めて出す共通の部品（新規） | 1 |
| `frontend/src/components/app/avatars.ts`・`avatars.test.ts` | アバター6種の対応 | 2 |
| `frontend/src/components/app/avatar-badge.tsx` | アバターの丸・「じぶん」の絵（`ProfileAvatar`） | 2・3 |
| `frontend/src/components/app/guest-landing.tsx`・`frontend/src/app/profiles/page.tsx` | 入口のバッジ | 2 |
| `frontend/src/components/app/nav-items.ts`・`nav-items.test.ts`・`bottom-nav.tsx` | 下のメニュー | 3 |
| `frontend/src/components/app/profile-provider.tsx` | プレイヤーの型に `avatar` | 3 |
| `frontend/src/components/app/me-sheet.tsx` | 「じぶん」のパネル | 3 |
| `frontend/src/components/app/sound-face.ts`・`sound-face.test.ts`・`sound-controls.tsx` | 音のボタン | 3 |
| `frontend/src/components/app/stage-node.ts`・`stage-node.test.ts`・`stage-path.tsx` | ステージの丸 | 4 |
| `frontend/src/components/world/world-screen.tsx`・`town-buttons.tsx`・`world-hud.tsx`・`frontend/src/app/family/page.tsx` | 町・家族の町 | 5 |
| `frontend/src/components/travel/travel.ts`・`travel.test.ts`・`departure-scene.tsx`・`ticket-earned-card.tsx`・`frontend/src/app/trip/page.tsx` | 旅（乗り物・チケット）。`plane-art.tsx` は消す | 5 |
| `frontend/src/app/not-found.tsx` | 見つからないページ（新規） | 6 |
| `frontend/src/lib/brand-name.test.ts` | 「SpraGo」が残っていないテスト（新規） | 6 |
| `frontend/src/**`（「SpraGo」のある10ファイル） | 名前の表記 | 6 |
| `tools/spru-assets/brand.py`・`tools/spru-assets/fonts/` | アプリのアイコン・SNS画像を作る道具と書体（新規） | 7 |
| `frontend/src/app/favicon.ico`・`icon.png`・`apple-icon.png`・`opengraph-image.jpg`・`twitter-image.jpg`・`*.alt.txt`・`frontend/public/icons/` | 作った画像（道具が書き出す） | 7 |
| `frontend/src/app/manifest.ts`・`manifest.test.ts`・`frontend/src/app/layout.tsx` | ホーム画面の名前・SNSのカード | 7 |
| `SPEC.md`・`TASKS.md`・`company/mascot/CLAUDE.md` | ドキュメント | 8 |

---

### Task 1: 切り抜き（新しい組）と共通の部品 `AssetImage`

**Files:**
- Modify: `tools/spru-assets/crops.json`（`sources` と末尾の `"items": []`）
- Modify: `tools/spru-assets/extract.py`（説明・`write_ts`・`main`）
- Create: `frontend/src/components/spru/spru-assets.test.ts`
- Create: `frontend/src/components/app/asset-image.tsx`
- 書き出される: `frontend/public/spru/icons/*.webp`（15）・`stages/*.webp`（3）・`avatars/*.webp`（6）・`travel/*.webp`（3）・`pages/lost.webp`、`frontend/src/components/spru/spru-assets.ts`

**Interfaces:**
- Produces:
  - `SPRU_ICONS`（キー: `nav-learn`・`nav-trip`・`nav-town`・`nav-shop`・`sound-on`・`sound-off`・`bag`・`logout`・`continue`・`family`・`login`・`switch-profile`・`add-player`・`letter`・`key`）
  - `SPRU_STAGES`（`locked`・`open`・`cleared`）、`SPRU_AVATARS`（`avatar-1`〜`avatar-6`）、`SPRU_TRAVEL`（`ship`・`plane`・`ticket`）、`SPRU_PAGES`（`lost`）
  - 型 `SpruIconKey = keyof typeof SPRU_ICONS`、`SpruStageKey = keyof typeof SPRU_STAGES`（どれも `spru-assets.ts` から）
  - `AssetImage({ asset: SpruImage; size: number; className?: string; alt?: string; flip?: boolean })`（`@/components/app/asset-image`。`size` は高さ px。`flip` は左右反転。`alt` がなければ飾り）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/spru/spru-assets.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SPRU_AVATARS, SPRU_ICONS, SPRU_PAGES, SPRU_STAGES, SPRU_TRAVEL, type SpruImage } from "./spru-assets";

const keys = (record: Record<string, SpruImage>) => Object.keys(record).sort();

describe("スプルのアイコン・画像の一覧(docs/design/2026-09-29-spru-icons-design.md 3-3)", () => {
  it("アイコンは15点", () => {
    expect(keys(SPRU_ICONS)).toEqual([
      "add-player",
      "bag",
      "continue",
      "family",
      "key",
      "letter",
      "login",
      "logout",
      "nav-learn",
      "nav-shop",
      "nav-town",
      "nav-trip",
      "sound-off",
      "sound-on",
      "switch-profile",
    ]);
  });

  it("ステージの丸は3種", () => {
    expect(keys(SPRU_STAGES)).toEqual(["cleared", "locked", "open"]);
  });

  it("アバターは6種", () => {
    expect(keys(SPRU_AVATARS)).toEqual(["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6"]);
  });

  it("旅は船・飛行機・チケット", () => {
    expect(keys(SPRU_TRAVEL)).toEqual(["plane", "ship", "ticket"]);
  });

  it("ページの絵は迷子のスプル", () => {
    expect(keys(SPRU_PAGES)).toEqual(["lost"]);
  });

  it("どの絵も public/ にファイルがあり、幅と高さがある", () => {
    for (const record of [SPRU_ICONS, SPRU_STAGES, SPRU_AVATARS, SPRU_TRAVEL, SPRU_PAGES]) {
      for (const image of Object.values(record) as SpruImage[]) {
        expect(existsSync(join(process.cwd(), "public", image.src))).toBe(true);
        expect(image.width).toBeGreaterThan(0);
        expect(image.height).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/spru/spru-assets.test.ts`
Expected: FAIL（`SPRU_ICONS` などがまだないので、`Object.keys` に `undefined` が渡る TypeError など、6件とも失敗）

- [ ] **Step 3: 切り抜く範囲を書く**

`tools/spru-assets/crops.json` の `sources` の最後の行を直す:

```json
    "house": "image1.png",
    "i4": "image4.png",
    "i5": "image5.png",
    "i6": "image6.png"
  },
```

（直す前は `    "house": "image1.png"` と `  },`）

同じファイルの末尾の

```json
  "items": []
}
```

を次に置き換える（範囲は 2026-09-29 に不透明度200で測った各絵の外枠。`cut_figure` が8pxの余白を足して、いちばん大きい塊だけを取る）:

```json
  "items": [],
  "icons": [
    { "key": "login", "source": "i4", "box": [28, 92, 224, 340] },
    { "key": "switch-profile", "source": "i4", "box": [236, 100, 420, 336] },
    { "key": "add-player", "source": "i4", "box": [432, 104, 620, 336] },
    { "key": "nav-learn", "source": "i4", "box": [16, 368, 236, 592] },
    { "key": "nav-trip", "source": "i4", "box": [252, 372, 452, 596] },
    { "key": "nav-town", "source": "i4", "box": [464, 372, 672, 596] },
    { "key": "nav-shop", "source": "i4", "box": [680, 376, 892, 596] },
    { "key": "sound-on", "source": "i5", "box": [28, 152, 368, 480], "width": 192 },
    { "key": "sound-off", "source": "i5", "box": [408, 156, 740, 480], "width": 192 },
    { "key": "bag", "source": "i5", "box": [792, 152, 1120, 484], "width": 192 },
    { "key": "logout", "source": "i5", "box": [1164, 152, 1508, 484], "width": 192 },
    { "key": "continue", "source": "i5", "box": [24, 544, 364, 896], "width": 192 },
    { "key": "family", "source": "i5", "box": [404, 564, 748, 896], "width": 192 },
    { "key": "letter", "source": "i5", "box": [792, 556, 1128, 900], "width": 192 },
    { "key": "key", "source": "i5", "box": [1168, 556, 1512, 900], "width": 192 }
  ],
  "stages": [
    { "key": "locked", "source": "i4", "box": [920, 392, 1112, 588] },
    { "key": "open", "source": "i4", "box": [1116, 392, 1312, 584] },
    { "key": "cleared", "source": "i4", "box": [1320, 384, 1512, 592] }
  ],
  "avatars": [
    { "key": "avatar-1", "source": "i6", "box": [32, 40, 436, 472], "width": 288 },
    { "key": "avatar-2", "source": "i6", "box": [556, 64, 964, 472], "width": 288 },
    { "key": "avatar-3", "source": "i6", "box": [1104, 56, 1508, 472], "width": 288 },
    { "key": "avatar-4", "source": "i6", "box": [32, 548, 436, 960], "width": 288 },
    { "key": "avatar-5", "source": "i6", "box": [560, 552, 968, 960], "width": 288 },
    { "key": "avatar-6", "source": "i6", "box": [1100, 556, 1504, 960], "width": 288 }
  ],
  "travel": [
    { "key": "ship", "source": "i4", "box": [636, 628, 820, 788] },
    { "key": "plane", "source": "i4", "box": [820, 628, 1000, 788] },
    { "key": "ticket", "source": "i4", "box": [40, 808, 332, 1004], "width": 192 }
  ],
  "pages": [
    { "key": "lost", "source": "i4", "box": [812, 800, 1024, 1004], "mode": "all" }
  ]
}
```

- [ ] **Step 4: 道具に新しい組を足す**

`tools/spru-assets/extract.py` の説明（1〜15行目）の

```python
  離れた部品も残すため、既定の mode は "all")
```

の次の行に足す:

```python
- 画面のアイコン icons/・ステージの丸 stages/・アバター avatars/・旅の乗り物とチケット travel/・ページの絵 pages/
  (docs/design/2026-09-29-spru-icons-design.md 3章。元の絵は image4〜6)
```

`write_ts` の引数を直す:

```python
def write_ts(
    images: dict, faces: dict, scenes: dict, bloom: dict, garden: dict, companions: dict,
    outing: dict, costumes: dict, badges: dict, stamps: dict, house: dict, items: dict, tips: dict,
    icons: dict, stages: dict, avatars: dict, travel: dict, pages: dict,
) -> None:
```

書き出す文の `SPRU_ITEMS` の塊

```python
export const SPRU_ITEMS = {{
{entries(items)}
}} as const satisfies Record<string, SpruImage>;
```

の次に足す:

```python

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
```

型の並びの `export type HouseImageKey = keyof typeof HOUSE_IMAGES;` の次に足す:

```python
export type SpruIconKey = keyof typeof SPRU_ICONS;
export type SpruStageKey = keyof typeof SPRU_STAGES;
```

`main` の組の並びを直す:

```python
    for group in (
        "bloom", "garden", "companions", "outing", "costumes", "badges", "stamps", "house", "items",
        "icons", "stages", "avatars", "travel", "pages",
    ):
```

`write_ts(...)` の呼び出しを直す:

```python
    write_ts(
        images, faces, scenes, parts["bloom"], parts["garden"], parts["companions"],
        parts["outing"], parts["costumes"], parts["badges"], parts["stamps"], parts["house"], parts["items"], tips,
        parts["icons"], parts["stages"], parts["avatars"], parts["travel"], parts["pages"],
    )
```

最後の `print(...)` の文の `f"・スタンプ {len(parts['stamps'])}・家 {len(parts['house'])}・アイテム {len(parts['items'])} を書き出しました"` を次に直す:

```python
        f"・スタンプ {len(parts['stamps'])}・家 {len(parts['house'])}・アイテム {len(parts['items'])}"
        f"・アイコン {len(parts['icons'])}・ステージ {len(parts['stages'])}・アバター {len(parts['avatars'])}"
        f"・旅 {len(parts['travel'])}・ページ {len(parts['pages'])} を書き出しました"
```

- [ ] **Step 5: 切り抜きを流す**

Run（`projects/Spra-go/` で）: `python3 tools/spru-assets/extract.py ../../company/mascot/assets`
Expected: 最後に「…・アイコン 15・ステージ 3・アバター 6・旅 3・ページ 1 を書き出しました」

Run: `git status --short`
Expected: 変わったのは `tools/spru-assets/crops.json`・`tools/spru-assets/extract.py`・`frontend/src/components/spru/spru-assets.ts` と、新しいフォルダ `frontend/public/spru/icons/`・`stages/`・`avatars/`・`travel/`・`pages/`（と Step 1 のテスト）だけ。今までの `frontend/public/spru/` の絵が変わっていないこと

- [ ] **Step 6: 切り抜いた絵を目で見る**

暗い背景と白い背景に並べた見本を作って開く:

```bash
python3 - <<'EOF'
from pathlib import Path
from PIL import Image
files = [f for group in ("icons", "stages", "avatars", "travel", "pages") for f in sorted(Path("frontend/public/spru", group).glob("*.webp"))]
cell = 110
sheet = Image.new("RGBA", (cell * 10, cell * ((len(files) + 9) // 10) * 2), (128, 128, 128, 255))
for i, f in enumerate(files):
    img = Image.open(f).convert("RGBA")
    img.thumbnail((cell - 10, cell - 10))
    for row, bg in ((0, (40, 40, 40, 255)), (1, (255, 255, 255, 255))):
        x, y = (i % 10) * cell, ((i // 10) * 2 + row) * cell
        tile = Image.new("RGBA", (cell, cell), bg)
        tile.alpha_composite(img, ((cell - img.width) // 2, (cell - img.height) // 2))
        sheet.alpha_composite(tile, (x, y))
out = Path("/private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/icons-check.png")
sheet.save(out)
print(len(files), out)
EOF
```

Expected: `28` と見本のパス。見本を開き、28点すべてで、もや（うすい色の輪）が残っていない・絵が欠けていない・隣の絵が入っていないこと。迷子のスプルは頭の上の「？」が残っていること

- [ ] **Step 7: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/spru/spru-assets.test.ts`
Expected: PASS（6件）

- [ ] **Step 8: 共通の部品を作る**

`frontend/src/components/app/asset-image.tsx`:

```tsx
import Image from "next/image";

import { fixedImageSize } from "@/components/app/image-size";
import type { SpruImage } from "@/components/spru/spru-assets";

/**
 * 切り抜いたスプルの絵を、高さ(size)を決めて出す(docs/design/2026-09-29-spru-icons-design.md 4章)。
 * alt がなければ飾り。flip は左右反転(左向きの乗り物を右向きにする)
 */
export function AssetImage({
  asset,
  size,
  className,
  alt,
  flip = false,
}: {
  asset: SpruImage;
  size: number;
  className?: string;
  alt?: string;
  flip?: boolean;
}) {
  const { width, height } = fixedImageSize(asset, size);
  return (
    <Image
      src={asset.src}
      alt={alt ?? ""}
      width={width}
      height={height}
      aria-hidden={alt ? undefined : true}
      className={`shrink-0 ${flip ? "-scale-x-100" : ""} ${className ?? ""}`}
      style={{ width, height }}
    />
  );
}
```

- [ ] **Step 9: 型とlintを確かめる**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: どちらもエラーなし

- [ ] **Step 10: コミット**

```bash
git add tools/spru-assets/crops.json tools/spru-assets/extract.py frontend/src/components/spru/spru-assets.ts frontend/src/components/spru/spru-assets.test.ts frontend/src/components/app/asset-image.tsx frontend/public/spru/icons frontend/public/spru/stages frontend/public/spru/avatars frontend/public/spru/travel frontend/public/spru/pages
git commit -q -m "#00233: feat:Ownerのアイコン・アバター・ステージ・旅・迷子の絵を切り抜き、絵を出す共通の部品を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: アバター6種と入口のバッジ

**Files:**
- Modify: `frontend/src/components/app/avatars.ts`（1行目の import と `AVATAR_IMAGES`）
- Modify: `frontend/src/components/app/avatars.test.ts`
- Modify: `frontend/src/components/app/avatar-badge.tsx`（全体）
- Modify: `frontend/src/components/app/guest-landing.tsx`（「アカウントをお持ちの方はログイン」のリンク）
- Modify: `frontend/src/app/profiles/page.tsx`（「プレイヤーを追加」のボタン）

**Interfaces:**
- Consumes: `SPRU_AVATARS`・`SPRU_ICONS`（Task 1）、`AssetImage`（Task 1）
- Produces: `AvatarBadge({ avatar: string | null; size: number; selected?: boolean; className?: string })`（今と同じ形。見た目だけ変わる）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/app/avatars.test.ts` の import を直し、「アバターの絵」の describe に1件足す:

```ts
import { describe, expect, it } from "vitest";

import { SPRU_AVATARS } from "@/components/spru/spru-assets";

import { AVATAR_KEYS, avatarImage, avatarKeyOf, firstUnusedAvatar } from "./avatars";

describe("アバターの絵", () => {
  it("6つの名前で、それぞれ別の絵", () => {
    const srcs = AVATAR_KEYS.map((key) => avatarImage(key).src);
    expect(new Set(srcs).size).toBe(6);
  });

  it("6つの名前は、Ownerのアバター6種の同じ名前の絵(docs/design/2026-09-29-spru-icons-design.md 4-9)", () => {
    for (const key of AVATAR_KEYS) {
      expect(avatarImage(key)).toEqual(SPRU_AVATARS[key]);
    }
  });

  it("空・知らない名前は、1つ目の絵", () => {
    expect(avatarImage(null)).toEqual(avatarImage("avatar-1"));
    expect(avatarImage("avatar-9")).toEqual(avatarImage("avatar-1"));
  });
});
```

（「名前をアバターの名前にそろえる」「追加のときに最初から選ぶアバター」の describe は今のまま）

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/avatars.test.ts`
Expected: FAIL（新しい1件。`avatar-1` が仲間の絵 `/spru/companions/lumi.webp` のため）。ほかは PASS

- [ ] **Step 3: 対応表を替える**

`frontend/src/components/app/avatars.ts` の1行目

```ts
import { COMPANION_IMAGES, SPRU_IMAGES, type SpruImage } from "@/components/spru/spru-assets";
```

を

```ts
import { SPRU_AVATARS, type SpruImage } from "@/components/spru/spru-assets";
```

に、次の塊

```ts
// Ownerのアバター6種が届くまでの仮の絵(設計書6-2)。届いたらここだけ替える
const AVATAR_IMAGES: Record<AvatarKey, SpruImage> = {
  "avatar-1": COMPANION_IMAGES.lumi,
  "avatar-2": COMPANION_IMAGES.momo,
  "avatar-3": COMPANION_IMAGES.kuru,
  "avatar-4": COMPANION_IMAGES.piko,
  "avatar-5": COMPANION_IMAGES.ruru,
  "avatar-6": SPRU_IMAGES.smile,
};
```

を

```ts
// Ownerのアバター6種(docs/design/2026-09-29-spru-icons-design.md 3-3・4-9)。赤・橙・黄・青・紫・桃の順
const AVATAR_IMAGES: Record<AvatarKey, SpruImage> = SPRU_AVATARS;
```

に直す。

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/avatars.test.ts`
Expected: PASS（10件）

- [ ] **Step 5: アバターの丸を直す**

`frontend/src/components/app/avatar-badge.tsx` を次の内容にする:

```tsx
import Image from "next/image";

import { avatarImage } from "@/components/app/avatars";

/**
 * プレイヤーのアバター(docs/design/2026-09-29-spru-icons-design.md 4-9)。絵に色の輪が描いてあるので枠は付けない。
 * 絵の幅を size にそろえ、下を丸の下にそろえる(頭の芽は丸の上に出る)。selected は選んでいる印(外側の緑の輪)
 */
export function AvatarBadge({
  avatar,
  size,
  selected = false,
  className,
}: {
  avatar: string | null;
  size: number;
  selected?: boolean;
  className?: string;
}) {
  const asset = avatarImage(avatar);
  const height = Math.round((asset.height * size) / asset.width);
  return (
    <span
      className={`relative flex shrink-0 items-end justify-center rounded-full ${
        selected ? "ring-4 ring-[#3b7f26] ring-offset-2 ring-offset-[#fffaf0]" : ""
      } ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={asset.src}
        alt=""
        width={size}
        height={height}
        style={{ width: size, height }}
        className="max-w-none drop-shadow-[0_3px_6px_rgba(59,50,38,0.2)]"
        aria-hidden
      />
    </span>
  );
}
```

- [ ] **Step 6: 入口のバッジを足す**

`frontend/src/components/app/guest-landing.tsx` の import に足す（`import { LogoMark } ...` の前）:

```tsx
import { AssetImage } from "@/components/app/asset-image";
```

`import { STAMP_IMAGES, type StampKey } from "@/components/spru/spru-assets";` を

```tsx
import { SPRU_ICONS, STAMP_IMAGES, type StampKey } from "@/components/spru/spru-assets";
```

に直し、ログインのリンク

```tsx
        <Link
          href="/login"
          className="mt-3 rounded-full bg-[#fffaf0] px-4 py-1.5 text-sm font-black text-[#2b6fa3] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          アカウントをお持ちの方はログイン
        </Link>
```

を

```tsx
        <Link
          href="/login"
          className="mt-3 flex items-center gap-1.5 rounded-full bg-[#fffaf0] py-1 pr-4 pl-1.5 text-sm font-black text-[#2b6fa3] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          <AssetImage asset={SPRU_ICONS.login} size={28} />
          アカウントをお持ちの方はログイン
        </Link>
```

に直す。

`frontend/src/app/profiles/page.tsx` の import に足す（`import { AvatarBadge } ...` の前）:

```tsx
import { AssetImage } from "@/components/app/asset-image";
```

と（`import { SpruHouse } ...` の前）:

```tsx
import { SPRU_ICONS } from "@/components/spru/spru-assets";
```

「プレイヤーを追加」のボタンの中の

```tsx
                  <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-dashed border-[#fffaf0] bg-[rgba(255,250,240,0.55)] text-4xl font-black text-[#3b7f26] transition-transform group-hover:scale-105">
                    ＋
                  </span>
```

を

```tsx
                  <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-dashed border-[#fffaf0] bg-[rgba(255,250,240,0.55)] transition-transform group-hover:scale-105">
                    <AssetImage asset={SPRU_ICONS["add-player"]} size={64} />
                  </span>
```

に直す。

- [ ] **Step 7: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/app/avatars.ts frontend/src/components/app/avatars.test.ts frontend/src/components/app/avatar-badge.tsx frontend/src/components/app/guest-landing.tsx frontend/src/app/profiles/page.tsx
git commit -q -m "#00234: feat:アバターをOwnerの6種にし、トップのログインとプレイヤーの追加にバッジを付ける" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 下のメニュー・「じぶん」・音のボタン

**Files:**
- Modify: `frontend/src/components/app/nav-items.ts`・`nav-items.test.ts`
- Modify: `frontend/src/components/app/bottom-nav.tsx`（全体）
- Modify: `frontend/src/components/app/profile-provider.tsx`（`Profile` の型）
- Modify: `frontend/src/components/app/avatar-badge.tsx`（`ProfileAvatar` を足す）
- Modify: `frontend/src/components/app/me-sheet.tsx`
- Modify: `frontend/src/components/app/sound-face.ts`・`sound-face.test.ts`（全体）
- Modify: `frontend/src/components/app/sound-controls.tsx`（全体）

**Interfaces:**
- Consumes: `SPRU_ICONS`・`SpruIconKey`・`AssetImage`（Task 1）、`AvatarBadge`（Task 2）
- Produces:
  - `NAV_ITEMS: { key: NavKey; href: string; label: string; icon: SpruIconKey }[]`
  - `ProfileAvatar({ profile: { avatar: string | null } | null; size: number })`（`@/components/app/avatar-badge`）
  - `soundIcon(enabled: boolean): "sound-on" | "sound-off"`（`@/components/app/sound-face`。今の `soundFace` は消す）
  - `Profile` の型に `avatar: string | null`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/app/nav-items.test.ts` の import を直し、「下のメニューの並び」の describe に1件足す:

```ts
import { describe, expect, it } from "vitest";

import { SPRU_ICONS } from "@/components/spru/spru-assets";

import { isNavActive, NAV_ITEMS } from "./nav-items";

describe("下のメニューの並び", () => {
  it("学ぶ・せかい・まち・ショップの順で、「じぶん」を足した5つの真ん中がまち", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["学ぶ", "せかい", "まち", "ショップ"]);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/learn", "/trip", "/", "/shop"]);
    expect(NAV_ITEMS[2].key).toBe("town");
  });

  it("どのメニューにも、スプルのアイコンの絵がある(docs/design/2026-09-29-spru-icons-design.md 4-1)", () => {
    expect(NAV_ITEMS.map((item) => item.icon)).toEqual(["nav-learn", "nav-trip", "nav-town", "nav-shop"]);
    for (const item of NAV_ITEMS) {
      expect(SPRU_ICONS[item.icon]).toBeDefined();
    }
  });
});
```

（「下のメニューの選択中」の describe は今のまま）

`frontend/src/components/app/sound-face.test.ts` を次の内容にする:

```ts
import { describe, expect, it } from "vitest";

import { soundIcon } from "./sound-face";

describe("音のボタンの絵(docs/design/2026-09-29-spru-icons-design.md 4-3)", () => {
  it("オンは音オンの絵", () => {
    expect(soundIcon(true)).toBe("sound-on");
  });

  it("オフは音オフの絵", () => {
    expect(soundIcon(false)).toBe("sound-off");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/nav-items.test.ts src/components/app/sound-face.test.ts`
Expected: FAIL（`icon` が `undefined`、`soundIcon` がない）

- [ ] **Step 3: メニューに絵のキーを持たせ、音の絵を決める関数を作る**

`frontend/src/components/app/nav-items.ts` の1〜2行目のコメントの次に import を足し、`NAV_ITEMS` を直す:

```ts
// 下のメニュー(docs/design/2026-09-28-app-chrome-design.md 4-5、名前は docs/design/2026-09-28-travel-tickets-design.md 5-1、
// 絵は docs/design/2026-09-29-spru-icons-design.md 4-1)。
// 画面を描かない部分だけをここに置く。「じぶん」はページを移らずパネルを開くボタンなので、ここには入れない

import type { SpruIconKey } from "@/components/spru/spru-assets";

export type NavKey = "learn" | "trip" | "town" | "shop";

export const NAV_ITEMS: { key: NavKey; href: string; label: string; icon: SpruIconKey }[] = [
  { key: "learn", href: "/learn", label: "学ぶ", icon: "nav-learn" },
  { key: "trip", href: "/trip", label: "せかい", icon: "nav-trip" },
  { key: "town", href: "/", label: "まち", icon: "nav-town" },
  { key: "shop", href: "/shop", label: "ショップ", icon: "nav-shop" },
];
```

（`isNavActive` は今のまま）

`frontend/src/components/app/sound-face.ts` を次の内容にする:

```ts
// 音のボタンの絵(docs/design/2026-09-29-spru-icons-design.md 4-3)

/** オンは音オンの絵、オフは音オフの絵(どちらも SPRU_ICONS のキー) */
export function soundIcon(enabled: boolean): "sound-on" | "sound-off" {
  return enabled ? "sound-on" : "sound-off";
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/nav-items.test.ts src/components/app/sound-face.test.ts`
Expected: PASS（nav-items 4件・sound-face 2件）

- [ ] **Step 5: プレイヤーの型にアバターを足し、「じぶん」の絵の部品を作る**

`frontend/src/components/app/profile-provider.tsx` の `Profile` の型の `name: string;` の次に足す:

```ts
  /** アバターの名前(avatar-1〜6。GET /api/profiles/active が返す。docs/design/2026-09-29-spru-icons-design.md 4-1) */
  avatar: string | null;
```

`frontend/src/components/app/avatar-badge.tsx` の2行目の import の次に足す:

```tsx
import { SPRU_FACES } from "@/components/spru/spru-assets";
```

ファイルの最後に足す:

```tsx

/** 「じぶん」の絵(docs/design/2026-09-29-spru-icons-design.md 4-1・4-2)。プレイヤーがいればそのアバター、いなければスプルのふつうの顔 */
export function ProfileAvatar({ profile, size }: { profile: { avatar: string | null } | null; size: number }) {
  if (profile) return <AvatarBadge avatar={profile.avatar} size={size} />;
  const face = SPRU_FACES.normal;
  return (
    <Image
      src={face.src}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className="shrink-0 rounded-full bg-[#e3f3d6]"
      style={{ width: size, height: size }}
    />
  );
}
```

- [ ] **Step 6: 下のメニューを絵にする**

`frontend/src/components/app/bottom-nav.tsx` を次の内容にする:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AssetImage } from "@/components/app/asset-image";
import { ProfileAvatar } from "@/components/app/avatar-badge";
import { MeSheet } from "@/components/app/me-sheet";
import { useRegisterMenu } from "@/components/app/menu-presence";
import { isNavActive, NAV_ITEMS } from "@/components/app/nav-items";
import { useProfile } from "@/components/app/profile-provider";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

const ITEM_CLASS = "relative flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11.5px]";
const ACTIVE_TEXT = "font-black text-[#3b7f26]";
const IDLE_TEXT = "font-bold text-[#6b5d45] hover:text-[#3b3226]";

function ActiveBar() {
  return <span className="absolute top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#5bb33e]" />;
}

/**
 * 画面下部の常設ナビ(設計書4-5)。学ぶ・せかい・まち(真ん中で大きく)・ショップ・じぶん。
 * 絵はスプルのアイコン、「じぶん」はそのプレイヤーのアバター(docs/design/2026-09-29-spru-icons-design.md 4-1)。
 * 「じぶん」はページを移らず、下から出るパネル(MeSheet)を開く。各ページは下端の余白(pb-24)を確保すること
 */
export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const [meOpen, setMeOpen] = useState(false);
  useRegisterMenu();

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[480px] grid-cols-5 rounded-t-[22px] bg-[#fffaf0] shadow-[0_-4px_14px_rgba(59,50,38,0.12)]"
        aria-label="メインナビゲーション"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const icon = SPRU_ICONS[item.icon];
          if (item.key === "town") {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${ITEM_CLASS} justify-end pb-2 ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-[0_4px_6px_rgba(40,70,90,0.25)]">
                  <AssetImage asset={icon} size={60} />
                </span>
                {item.label}
              </Link>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${ITEM_CLASS} ${active ? ACTIVE_TEXT : IDLE_TEXT}`}
            >
              {active && <ActiveBar />}
              <AssetImage asset={icon} size={32} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMeOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={meOpen}
          className={`${ITEM_CLASS} ${meOpen ? ACTIVE_TEXT : IDLE_TEXT}`}
        >
          {meOpen && <ActiveBar />}
          <ProfileAvatar profile={profile} size={28} />
          じぶん
        </button>
      </nav>
      <MeSheet open={meOpen} onOpenChange={setMeOpen} />
    </>
  );
}
```

- [ ] **Step 7: 「じぶん」のパネルを絵にする**

`frontend/src/components/app/me-sheet.tsx` の import の

```tsx
import { ArrowLeftRight, Backpack, LogOut } from "lucide-react";
```

を消し、

```tsx
import { BadgeImage } from "@/components/app/badge-image";
```

を次の3行に直す:

```tsx
import { AssetImage } from "@/components/app/asset-image";
import { ProfileAvatar } from "@/components/app/avatar-badge";
import { BadgeImage } from "@/components/app/badge-image";
```

`import { apiFetch } from "@/lib/api";` の前に足す:

```tsx
import { SPRU_ICONS } from "@/components/spru/spru-assets";
```

パネルの上の名前の1文字

```tsx
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2b6fa3] text-lg font-black text-white"
            >
              {profile?.name.slice(0, 1)}
            </span>
```

を

```tsx
            <ProfileAvatar profile={profile} size={44} />
```

に、バッグの行

```tsx
            <SheetLink href="/bag" icon={<Backpack aria-hidden className="h-5 w-5" />} label="バッグ" onNavigate={close} />
```

を

```tsx
            <SheetLink href="/bag" icon={<AssetImage asset={SPRU_ICONS.bag} size={28} />} label="バッグ" onNavigate={close} />
```

に、プロフィールの切り替えの行の

```tsx
              icon={<ArrowLeftRight aria-hidden className="h-5 w-5" />}
```

を

```tsx
              icon={<AssetImage asset={SPRU_ICONS["switch-profile"]} size={28} />}
```

に、ログアウトの

```tsx
                  <LogOut aria-hidden className="h-5 w-5" />
```

を

```tsx
                  <AssetImage asset={SPRU_ICONS.logout} size={28} />
```

に直す。

- [ ] **Step 8: 音のボタンを絵にする**

`frontend/src/components/app/sound-controls.tsx` を次の内容にする:

```tsx
"use client";

import { AssetImage } from "@/components/app/asset-image";
import { soundIcon } from "@/components/app/sound-face";
import { useSound } from "@/components/app/sound-provider";
import { useFloatingSettingsShown } from "@/components/app/use-floating-settings";
import { SPRU_ICONS } from "@/components/spru/spru-assets";

/**
 * 画面右下に浮かぶ、効果音のオン・オフ(設計書4-7。絵は docs/design/2026-09-29-spru-icons-design.md 4-3)。
 * 右下の「文A」が出ている画面ではその上、出ていない画面(プレイヤーの画面)では1段下に置く
 */
export function SoundControls() {
  const { enabled, toggleEnabled } = useSound();
  const floatingShown = useFloatingSettingsShown();

  return (
    <button
      onClick={toggleEnabled}
      aria-pressed={enabled}
      aria-label={enabled ? "効果音をオフにする" : "効果音をオンにする"}
      className={`fixed right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.2)] ${
        floatingShown ? "bottom-36" : "bottom-20"
      }`}
    >
      <AssetImage asset={SPRU_ICONS[soundIcon(enabled)]} size={44} />
    </button>
  );
}
```

- [ ] **Step 9: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 10: コミット**

```bash
git add frontend/src/components/app/nav-items.ts frontend/src/components/app/nav-items.test.ts frontend/src/components/app/bottom-nav.tsx frontend/src/components/app/profile-provider.tsx frontend/src/components/app/avatar-badge.tsx frontend/src/components/app/me-sheet.tsx frontend/src/components/app/sound-face.ts frontend/src/components/app/sound-face.test.ts frontend/src/components/app/sound-controls.tsx
git commit -q -m "#00235: feat:下のメニュー・じぶん・音のボタンをスプルの絵にし、じぶんにアバターを出す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ステージの丸

**Files:**
- Modify: `frontend/src/components/app/stage-node.ts`（`stageNodeImage` を足す）
- Modify: `frontend/src/components/app/stage-node.test.ts`（describe を足す）
- Modify: `frontend/src/components/app/stage-path.tsx`（全体）

**Interfaces:**
- Consumes: `SPRU_STAGES`・`SpruStageKey`・`AssetImage`（Task 1）
- Produces: `stageNodeImage(stage: { locked: boolean; cleared: boolean; is_boss: boolean }): SpruStageKey | null`（`@/components/app/stage-node`）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/app/stage-node.test.ts` の import を

```ts
import { stageNodeClasses, stageNodeImage } from "./stage-node";
```

に直し、ファイルの最後に足す:

```ts

describe("ステージの丸の絵(docs/design/2026-09-29-spru-icons-design.md 4-4)", () => {
  it("鍵がかかっていれば、ボスでもクリア済みでも鍵の絵", () => {
    expect(stageNodeImage({ ...base, locked: true })).toBe("locked");
    expect(stageNodeImage({ ...base, locked: true, is_boss: true })).toBe("locked");
    expect(stageNodeImage({ ...base, locked: true, cleared: true })).toBe("locked");
  });

  it("クリア済みは、ボスでもクリアの絵", () => {
    expect(stageNodeImage({ ...base, cleared: true })).toBe("cleared");
    expect(stageNodeImage({ ...base, cleared: true, is_boss: true })).toBe("cleared");
  });

  it("まだのボスは絵を使わない(赤い丸とボスの印のまま)", () => {
    expect(stageNodeImage({ ...base, is_boss: true })).toBeNull();
  });

  it("それ以外は、遊べる絵", () => {
    expect(stageNodeImage(base)).toBe("open");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/stage-node.test.ts`
Expected: FAIL（`stageNodeImage` がない）

- [ ] **Step 3: 絵を決める関数を作る**

`frontend/src/components/app/stage-node.ts` の先頭に足す:

```ts
import type { SpruStageKey } from "@/components/spru/spru-assets";

/** ステージの丸の絵(docs/design/2026-09-29-spru-icons-design.md 4-4)。鍵 > クリア済み > まだのボス(絵なし) > 遊べる の順で決める */
export function stageNodeImage(stage: { locked: boolean; cleared: boolean; is_boss: boolean }): SpruStageKey | null {
  if (stage.locked) return "locked";
  if (stage.cleared) return "cleared";
  if (stage.is_boss) return null;
  return "open";
}

```

（`stageNodeClasses` は、まだのボスの丸に使い続けるので今のまま）

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/stage-node.test.ts`
Expected: PASS（8件）

- [ ] **Step 5: ステージの丸を絵にする**

`frontend/src/components/app/stage-path.tsx` を次の内容にする:

```tsx
"use client";

import { AssetImage } from "@/components/app/asset-image";
import { BadgeImage } from "@/components/app/badge-image";
import { stageNodeClasses, stageNodeImage } from "@/components/app/stage-node";
import { SPRU_STAGES } from "@/components/spru/spru-assets";

export type StagePathNode = {
  id: number;
  stage_number: number;
  is_boss: boolean;
  title_reward: string | null;
  cleared: boolean;
  locked: boolean;
  assigned_count?: number;
};

/**
 * ステージ一覧を単純なグリッドではなく、蛇行パス状に配置するコンポーネント。
 * docs/content/test.tsx(Owner提供、過去にDuolingoを参考に作った試作)を参考に、
 * このプロジェクトの技術構成(react-circular-progressbar等は使わない)向けに
 * 作り直したもの。次にプレイできるステージには「START」の吹き出しを表示する。
 * 丸はスプルのバッジの絵で、番号は丸の下の札(docs/design/2026-09-29-spru-icons-design.md 4-4)。まだのボスだけ赤い丸とボスの印
 */
export function StagePath({
  stages,
  selectedId,
  onSelect,
}: {
  stages: StagePathNode[];
  selectedId?: number | null;
  onSelect: (stage: StagePathNode) => void;
}) {
  const nextPlayableIndex = stages.findIndex(
    (s) =>
      !s.locked && !s.cleared && (s.assigned_count === undefined || s.assigned_count > 0),
  );

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {stages.map((stage, index) => {
        const playable =
          !stage.locked &&
          (stage.assigned_count === undefined || stage.assigned_count > 0);
        const isNext = index === nextPlayableIndex;
        const isSelected = selectedId === stage.id;
        // S字を描くように左右へ揺らす(蛇行パス)
        const offset = Math.round(Math.sin(index * (Math.PI / 2)) * 44);
        const image = stageNodeImage(stage);

        const label = stage.locked
          ? `ステージ${stage.stage_number}(ロック中)`
          : `ステージ${stage.stage_number}${stage.is_boss ? "・ボス" : ""}${
              stage.cleared ? "・クリア済み" : ""
            }`;

        const press = playable ? "hover:scale-105 active:translate-y-0.5" : "";
        // 鍵の絵はもう灰色なので薄くしない。問題がなくて押せないステージだけ薄くする
        const shape = image
          ? `${isSelected ? "ring-4 ring-[#9fd8ff]" : ""} ${!playable && !stage.locked ? "opacity-70" : ""}`
          : `border-b-4 shadow-lg ${playable ? "active:border-b-0" : ""} ${stageNodeClasses(stage, isSelected)}`;

        return (
          <div
            key={stage.id}
            className="relative"
            style={{ transform: `translateX(${offset}px)` }}
          >
            {isNext && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce rounded-full border-2 border-[#2b6fa3] bg-[#fffaf0] px-2 py-0.5 text-[10px] font-black whitespace-nowrap text-[#2b6fa3] shadow">
                START
              </div>
            )}
            <button
              type="button"
              disabled={!playable}
              onClick={() => onSelect(stage)}
              aria-label={label}
              title={label}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-transform disabled:cursor-not-allowed ${press} ${shape}`}
            >
              {image ? <AssetImage asset={SPRU_STAGES[image]} size={64} /> : <BadgeImage badge="boss" size={30} />}
              <span
                aria-hidden
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#fffaf0] px-1.5 text-[10px] leading-4 font-black text-[#3b3226] shadow"
              >
                {stage.stage_number}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/app/stage-node.ts frontend/src/components/app/stage-node.test.ts frontend/src/components/app/stage-path.tsx
git commit -q -m "#00236: feat:ステージの丸をスプルのバッジの絵にし、番号を丸の下の札にする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 町・家族の町・旅

**Files:**
- Modify: `frontend/src/components/travel/travel.ts`（`vehicleImage` を足す）・`travel.test.ts`
- Modify: `frontend/src/components/travel/departure-scene.tsx`
- Delete: `frontend/src/components/travel/plane-art.tsx`
- Modify: `frontend/src/components/travel/ticket-earned-card.tsx`（全体）
- Modify: `frontend/src/app/trip/page.tsx`（チケットの札）
- Modify: `frontend/src/components/world/world-screen.tsx`（つづきから学ぶ）
- Modify: `frontend/src/components/world/town-buttons.tsx`（家族の町の札）
- Modify: `frontend/src/components/world/world-hud.tsx`（バッグのボタン）
- Modify: `frontend/src/app/family/page.tsx`（見出し・自分の町にもどる）

**Interfaces:**
- Consumes: `SPRU_ICONS`・`SPRU_TRAVEL`・`AssetImage`（Task 1）、`HOUSE_IMAGES`（今ある）
- Produces: `vehicleImage(transport: Transport): SpruImage`（`@/components/travel/travel`）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/travel/travel.test.ts` の import を直す。1行目の `import { describe, expect, it } from "vitest";` の次に空行と

```ts
import { SPRU_TRAVEL } from "@/components/spru/spru-assets";
```

を足し、`from "./travel"` の並びの

```ts
  transportText,
  unlockedCountries,
} from "./travel";
```

を

```ts
  transportText,
  unlockedCountries,
  vehicleImage,
} from "./travel";
```

に直す。

ファイルの最後に足す:

```ts

describe("出発の場面の乗り物の絵(docs/design/2026-09-29-spru-icons-design.md 4-7)", () => {
  it("船の国は船、飛行機の国は飛行機", () => {
    expect(vehicleImage("ship")).toEqual(SPRU_TRAVEL.ship);
    expect(vehicleImage("plane")).toEqual(SPRU_TRAVEL.plane);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/travel/travel.test.ts`
Expected: FAIL（`vehicleImage` がない）

- [ ] **Step 3: 乗り物の絵を決める関数を作る**

`frontend/src/components/travel/travel.ts` の1行目 `import type { Destination, TravelData, Transport } from "./types";` の前に足す:

```ts
import { SPRU_TRAVEL, type SpruImage } from "@/components/spru/spru-assets";

```

`transportText` 関数の次に足す:

```ts

/** 出発の場面の乗り物の絵。元の絵は左向きなので、画面では左右を反転して出す(docs/design/2026-09-29-spru-icons-design.md 4-7) */
export function vehicleImage(transport: Transport): SpruImage {
  return transport === "plane" ? SPRU_TRAVEL.plane : SPRU_TRAVEL.ship;
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/travel/travel.test.ts`
Expected: PASS

- [ ] **Step 5: 出発の場面の乗り物を替える**

`frontend/src/components/travel/departure-scene.tsx` の import の

```tsx
import { ItemArt } from "@/components/world/item-art";

import { PlaneArt } from "./plane-art";
import { departureCaption, departurePhase, departureStart, type DeparturePhase } from "./travel";
```

を

```tsx
import { AssetImage } from "@/components/app/asset-image";

import { departureCaption, departurePhase, departureStart, vehicleImage, type DeparturePhase } from "./travel";
```

に直す（`AssetImage` の import は `@/components/app/auto-furigana` の次の行に置く）。

飛行機の

```tsx
            <div className="animate-plane-fly absolute left-1/2 -ml-[85px]">
              <PlaneArt />
            </div>
```

を

```tsx
            <div className="animate-plane-fly absolute left-1/2 -ml-[85px]">
              <AssetImage asset={vehicleImage("plane")} size={150} flip />
            </div>
```

に、船の

```tsx
            <svg viewBox="-40 -60 80 70" width={160} aria-hidden className="animate-boat-sail absolute left-1/2 -ml-20">
              <ItemArt assetKey="boat_small" />
            </svg>
```

を

```tsx
            <div className="animate-boat-sail absolute left-1/2 -ml-[85px]">
              <AssetImage asset={vehicleImage("ship")} size={150} flip />
            </div>
```

に直す。

仮の飛行機の絵を消す:

```bash
git rm -q frontend/src/components/travel/plane-art.tsx
```

- [ ] **Step 6: チケットの絵を替える**

`frontend/src/components/travel/ticket-earned-card.tsx` を次の内容にする:

```tsx
import Link from "next/link";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_TRAVEL } from "@/components/spru/spru-assets";

/** ボスを倒してチケットを手に入れたとき、クイズの結果に出すカード(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-4。絵は docs/design/2026-09-29-spru-icons-design.md 4-7) */
export function TicketEarnedCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[#f2b632] bg-[#fff4d6] px-4 py-3 text-center">
      <AssetImage asset={SPRU_TRAVEL.ticket} size={56} />
      <p className="text-base font-black text-[#7a5a0e]">
        <AutoFurigana text="チケットを手に入れた！" />
      </p>
      <p className="text-sm font-bold text-[#6b5d45]">
        <AutoFurigana text="『せかい』で次の国を選ぼう" />
      </p>
      <Link href="/trip" className="rounded-full bg-[#3b7f26] px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#285a19]">
        せかいへ
      </Link>
    </div>
  );
}
```

`frontend/src/app/trip/page.tsx` の

```tsx
import { Ticket } from "lucide-react";
```

を消し、`import { AppHeader } from "@/components/app/app-header";` の前に

```tsx
import { AssetImage } from "@/components/app/asset-image";
```

を、`import { DepartureScene } ...` の前に

```tsx
import { SPRU_TRAVEL } from "@/components/spru/spru-assets";
```

を足す。チケットの札の

```tsx
                <Ticket aria-hidden className="h-4 w-4 text-[#d8352a]" />×{travel.tickets}
```

を

```tsx
                <AssetImage asset={SPRU_TRAVEL.ticket} size={20} />×{travel.tickets}
```

に直す。

- [ ] **Step 7: 町のボタンを替える**

`frontend/src/components/world/world-screen.tsx` の

```tsx
import { BookOpen } from "lucide-react";
```

を消し、`import { BottomNav } from "@/components/app/bottom-nav";` の前に

```tsx
import { AssetImage } from "@/components/app/asset-image";
```

を、`import { pickTownMood, type TownEvent } from "@/components/spru/mood";` の次に

```tsx
import { SPRU_ICONS } from "@/components/spru/spru-assets";
```

を足す。「つづきから学ぶ」の

```tsx
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <BookOpen className="h-5 w-5" aria-hidden />
            つづきから学ぶ
```

を

```tsx
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] pr-6 pl-3 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <AssetImage asset={SPRU_ICONS.continue} size={36} />
            つづきから学ぶ
```

に直す（絵が丸い枠のバッジなので、左の余白を詰めて丸をボタンの左に寄せる）。

`frontend/src/components/world/town-buttons.tsx` の

```tsx
import { Backpack, HouseHeart } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
```

を

```tsx
import { Backpack } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SPRU_ICONS } from "@/components/spru/spru-assets";
```

に、家族の町の札の

```tsx
          <HouseHeart className="h-3.5 w-3.5 text-[#d0467a]" aria-hidden />
```

を

```tsx
          <AssetImage asset={SPRU_ICONS.family} size={24} />
```

に直す（「おつかい」の `Backpack` は今のまま）。

`frontend/src/components/world/world-hud.tsx` の

```tsx
import { Backpack } from "lucide-react";
```

を消し、`import { BadgeImage } from "@/components/app/badge-image";` の前に

```tsx
import { AssetImage } from "@/components/app/asset-image";
```

を足し、`import { SPRU_FACES } from "@/components/spru/spru-assets";` を

```tsx
import { SPRU_FACES, SPRU_ICONS } from "@/components/spru/spru-assets";
```

に直す。バッグのボタンの

```tsx
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5efe1] text-[#6b5d45]"
          >
            <Backpack aria-hidden className="h-5 w-5" />
```

を

```tsx
            className="flex h-8 w-8 items-center justify-center rounded-full"
          >
            <AssetImage asset={SPRU_ICONS.bag} size={32} />
```

に直す。

- [ ] **Step 8: 家族の町を替える**

`frontend/src/app/family/page.tsx` の

```tsx
import { ChevronRight, HouseHeart } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
```

を

```tsx
import { ChevronRight } from "lucide-react";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
```

に直し、`import type { FamilyMember } from "@/components/world/types";` の前に

```tsx
import { HOUSE_IMAGES, SPRU_ICONS } from "@/components/spru/spru-assets";
```

を足す。見出しの

```tsx
            <HouseHeart className="h-5 w-5 text-[#d0467a]" aria-hidden />
```

を

```tsx
            <AssetImage asset={SPRU_ICONS.family} size={28} />
```

に、「自分の町にもどる」の

```tsx
          <Link href="/" className="shrink-0 rounded-full bg-[#efe5cf] px-3 py-1.5 text-sm font-black">
            <AutoFurigana text="自分の町にもどる" />
          </Link>
```

を

```tsx
          <Link href="/" className="flex shrink-0 items-center gap-1 rounded-full bg-[#efe5cf] py-1 pr-3 pl-1.5 text-sm font-black">
            <AssetImage asset={HOUSE_IMAGES.home} size={24} />
            <span>
              <AutoFurigana text="自分の町にもどる" />
            </span>
          </Link>
```

に直す。

- [ ] **Step 9: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS。`grep -rn "PlaneArt\|plane-art" src` が何も出さない

- [ ] **Step 10: コミット**

```bash
git add frontend/src/components/travel/travel.ts frontend/src/components/travel/travel.test.ts frontend/src/components/travel/departure-scene.tsx frontend/src/components/travel/ticket-earned-card.tsx frontend/src/app/trip/page.tsx frontend/src/components/world/world-screen.tsx frontend/src/components/world/town-buttons.tsx frontend/src/components/world/world-hud.tsx frontend/src/app/family/page.tsx
git commit -q -m "#00237: feat:町のボタン・家族の町・出発の乗り物・チケットをスプルの絵にする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（`plane-art.tsx` の削除は Step 5 の `git rm` で入っている）

---

### Task 6: 見つからないページと名前の表記「Spra Go」

**Files:**
- Create: `frontend/src/lib/brand-name.test.ts`
- Modify: `frontend/src/**` の「SpraGo」（10ファイル: `app/layout.tsx`・`app/about/page.tsx`・`app/blog/page.tsx`・`app/blog/[slug]/page.tsx`・`app/world/[code]/page.tsx`・`components/app/guest-landing.tsx`・`components/app/app-header.tsx`・`components/world/world-hud.tsx`・`lib/blog-posts.ts`）
- Create: `frontend/src/app/not-found.tsx`

**Interfaces:**
- Consumes: `SPRU_PAGES`・`AssetImage`（Task 1）、`SkyPage`・`SkyTitle`・`SkyText`（今ある）、`AutoFurigana`（今ある）
- Produces: なし

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/lib/brand-name.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// 名前の表記は「Spra Go」(docs/design/2026-09-29-spru-icons-design.md 7章)。「スプラ」を単独で使わず、言葉を付ける
const OLD_NAME = ["Spra", "Go"].join("");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe("アプリの名前の表記", () => {
  it("画面の文字に、空白のない古い表記が残っていない", () => {
    const left = files("src").filter((path) => /\.(tsx?|json)$/.test(path) && readFileSync(path, "utf8").includes(OLD_NAME));
    expect(left).toEqual([]);
  });
});
```

（古い表記を `join` で作るのは、このテスト自身が引っかからないようにするため）

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/lib/brand-name.test.ts`
Expected: FAIL（9ファイルの一覧が出る）

- [ ] **Step 3: 表記を置き換える**

Run（`frontend/` で）:

```bash
grep -rl "SpraGo" src | xargs sed -i '' 's/SpraGo/Spra Go/g'
grep -rn "SpraGo" src
```

Expected: 2つ目の grep は何も出さない。`git diff --stat` で9ファイルが変わっている

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/lib/brand-name.test.ts`
Expected: PASS

- [ ] **Step 5: 見つからないページを作る**

`frontend/src/app/not-found.tsx`:

```tsx
import Link from "next/link";

import { AssetImage } from "@/components/app/asset-image";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { SPRU_PAGES } from "@/components/spru/spru-assets";

/**
 * 見つからないページ(docs/design/2026-09-29-spru-icons-design.md 4-8)。
 * not-found は metadata を書き出せないので、題名は React の <title> で付ける(head に移る)
 */
export default function NotFound() {
  return (
    <SkyPage>
      <title>ページが見つかりません | Spra Go</title>
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <AssetImage asset={SPRU_PAGES.lost} size={200} />
        <SkyTitle className="text-2xl">
          <AutoFurigana text="ページが見つからないよ" />
        </SkyTitle>
        <SkyText>さがしているページは、ここにはないみたい</SkyText>
        <Link
          href="/"
          className="mt-3 rounded-full bg-[#3b7f26] px-6 py-3 text-base font-black text-white shadow-[0_5px_0_#285a19]"
        >
          <AutoFurigana text="町にもどる" />
        </Link>
      </main>
    </SkyPage>
  );
}
```

- [ ] **Step 6: 見つからないページを開いて確かめる**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/nai && curl -s http://localhost:3000/nai | grep -o "<title>[^<]*</title>" | head -2 && curl -s http://localhost:3000/nai | grep -c "/spru/pages/lost.webp"`
Expected: `404`、`<title>ページが見つかりません | Spra Go</title>`（1行目。2行目に元の題名が出る場合は Ruling に書き、ブラウザのタブの題名を Task 8 で確かめる）、`1` 以上

- [ ] **Step 7: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 8: コミット**

```bash
git add frontend/src/lib/brand-name.test.ts frontend/src/app/not-found.tsx frontend/src
git commit -q -m "#00238: feat:迷子のスプルの見つからないページを作り、名前の表記をSpra Goにそろえる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: アプリのアイコンとSNS画像

**Files:**
- Create: `tools/spru-assets/fonts/MPLUSRounded1c-ExtraBold.ttf`・`tools/spru-assets/fonts/OFL.txt`
- Create: `tools/spru-assets/brand.py`
- 書き出される: `frontend/src/app/favicon.ico`（置き換え）・`icon.png`・`apple-icon.png`・`opengraph-image.jpg`・`twitter-image.jpg`、`frontend/public/icons/icon-192.png`・`icon-512.png`
- Create: `frontend/src/app/opengraph-image.alt.txt`・`frontend/src/app/twitter-image.alt.txt`
- Create: `frontend/src/app/manifest.ts`・`frontend/src/app/manifest.test.ts`
- Modify: `frontend/src/app/layout.tsx`（`metadata`）

**Interfaces:**
- Consumes: `company/mascot/assets/image9.png`・`image10.png`、`frontend/public/logo.svg`
- Produces: なし（Next.jsが決まった名前のファイルを読む）

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/app/manifest.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("ホーム画面に追加したときの名前とアイコン(docs/design/2026-09-29-spru-icons-design.md 5章)", () => {
  it("名前は Spra Go", () => {
    expect(manifest().name).toBe("Spra Go");
    expect(manifest().short_name).toBe("Spra Go");
  });

  it("アイコンは192pxと512pxで、ファイルが public/ にある", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of icons) {
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/app/manifest.test.ts`
Expected: FAIL（`./manifest` がない）

- [ ] **Step 3: 書体と使用許諾の文を置く**

Run（`projects/Spra-go/` で）:

```bash
mkdir -p tools/spru-assets/fonts
curl -sSL -o tools/spru-assets/fonts/MPLUSRounded1c-ExtraBold.ttf https://github.com/google/fonts/raw/main/ofl/mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf
curl -sSL https://raw.githubusercontent.com/google/fonts/main/ofl/mplus1p/OFL.txt | sed '1s/.*/Copyright 2016 The Rounded M+ Project Authors./' > tools/spru-assets/fonts/OFL.txt
file tools/spru-assets/fonts/MPLUSRounded1c-ExtraBold.ttf
head -3 tools/spru-assets/fonts/OFL.txt
```

Expected: `TrueType Font data`、1行目が `Copyright 2016 The Rounded M+ Project Authors.`、3行目が `This Font Software is licensed under the SIL Open Font License, Version 1.1.`（M PLUS Rounded 1c のフォルダには使用許諾の文がないため、同じ M+ の書体の OFL の文を使い、著作権の行を Rounded M+ の METADATA のものにする）

- [ ] **Step 4: アイコンとSNS画像を作る道具を書く**

`tools/spru-assets/brand.py`:

```python
#!/usr/bin/env python3
"""アプリのアイコンと、SNSで共有したときの画像を作る(docs/design/2026-09-29-spru-icons-design.md 5・6章)。

使い方(リポジトリ直下で): python3 tools/spru-assets/brand.py ../../company/mascot/assets

- アイコンは image9(頭がS字の芽のスプル)、SNS画像は image10(家の前で手を振るスプル)から作る
- SNS画像の字は M PLUS Rounded 1c(fonts/、SIL Open Font License)。ロゴのマークは frontend/public/logo.svg を
  Next.js に入っている sharp で PNG にしてから重ねる(node が要る)
- 出力: frontend/src/app/ の favicon.ico・icon.png・apple-icon.png・opengraph-image.jpg・twitter-image.jpg、
  frontend/public/icons/ の icon-192.png・icon-512.png(ホーム画面に追加したとき。app/manifest.ts が指す)
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "frontend/src/app"
PUBLIC_ICONS = ROOT / "frontend/public/icons"
FONT = Path(__file__).parent / "fonts/MPLUSRounded1c-ExtraBold.ttf"
FAVICON_BOX = (127, 40, 1127, 1040)  # image9 の頭(顔とS字の芽)のまわり。小さいと芽がつぶれるので、体を切って大きめに出す
OG_SIZE = (1200, 630)
TEXT_X = 290  # SNS画像の字を並べる左の空の真ん中
GREEN = "#3b7f26"
BROWN = "#3b3226"


def square(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def logo_png(height: int) -> Image.Image:
    """ロゴのマーク(SVG)を、高さ height の PNG にする"""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "logo.png"
        code = "require('sharp')('public/logo.svg',{density:900}).resize({height:+process.argv[2]}).png().toFile(process.argv[1])"
        subprocess.run(["node", "-e", code, str(out), str(height)], cwd=ROOT / "frontend", check=True)
        img = Image.open(out)
        img.load()
        return img.convert("RGBA")


def build_icons(assets: Path) -> None:
    src = Image.open(assets / "image9.png").convert("RGB")
    head = src.crop(FAVICON_BOX).resize((256, 256), Image.LANCZOS)
    head.save(APP / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    square(src, 512).save(APP / "icon.png")
    # iPhone は透明な所を黒くするので、背景の黄緑のまま(RGB)で出す
    square(src, 180).save(APP / "apple-icon.png")
    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        square(src, size).save(PUBLIC_ICONS / f"icon-{size}.png")


def build_og(assets: Path) -> None:
    src = Image.open(assets / "image10.png").convert("RGBA")
    height = round(src.height * OG_SIZE[0] / src.width)
    img = src.resize((OG_SIZE[0], height), Image.LANCZOS)
    top = (height - OG_SIZE[1]) // 2
    img = img.crop((0, top, OG_SIZE[0], top + OG_SIZE[1]))

    logo = logo_png(150)
    img.alpha_composite(logo, (TEXT_X - logo.width // 2, 100))
    draw = ImageDraw.Draw(img)
    draw.text(
        (TEXT_X, 330), "Spra Go", font=ImageFont.truetype(str(FONT), 112),
        fill=GREEN, anchor="mm", stroke_width=8, stroke_fill="white",
    )
    draw.text(
        (TEXT_X, 420), "学ぶほど、世界が広がる。", font=ImageFont.truetype(str(FONT), 40),
        fill=BROWN, anchor="mm", stroke_width=6, stroke_fill="white",
    )

    rgb = img.convert("RGB")
    for name in ("opengraph-image.jpg", "twitter-image.jpg"):
        rgb.save(APP / name, quality=88)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 tools/spru-assets/brand.py <素材集のフォルダ>")
    assets = Path(sys.argv[1])
    build_icons(assets)
    build_og(assets)
    print("アイコン(favicon・icon・apple-icon・icons/192・512)と、SNS画像(opengraph・twitter)を書き出しました")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: 道具を流して、できた画像を目で見る**

Run（`projects/Spra-go/` で）:

```bash
python3 tools/spru-assets/brand.py ../../company/mascot/assets
python3 -c "
from PIL import Image
for p in ['frontend/src/app/favicon.ico','frontend/src/app/icon.png','frontend/src/app/apple-icon.png','frontend/public/icons/icon-192.png','frontend/public/icons/icon-512.png','frontend/src/app/opengraph-image.jpg','frontend/src/app/twitter-image.jpg']:
    im = Image.open(p); print(p, im.size, im.mode, getattr(im, 'ico', None) and sorted(im.ico.sizes()))
"
```

Expected: 「…を書き出しました」。favicon は `(48, 48)` と sizes `[(16, 16), (32, 32), (48, 48)]`、icon.png `(512, 512) RGB`、apple-icon.png `(180, 180) RGB`、icons は `(192, 192)`・`(512, 512)`、SNS画像は2つとも `(1200, 630) RGB`

`frontend/src/app/opengraph-image.jpg` と `frontend/src/app/apple-icon.png` を開き、SNS画像は左の空にロゴのマーク・「Spra Go」・「学ぶほど、世界が広がる。」が白いふち付きで読めること、右のスプルの頭のS字の芽が字に重なっていないこと。アイコンはS字の芽が見えること

- [ ] **Step 6: 絵の説明文とホーム画面の設定を置く**

`frontend/src/app/opengraph-image.alt.txt` と `frontend/src/app/twitter-image.alt.txt`（どちらも同じ1行。最後に改行を付けない）:

```text
家の前で手を振るスプルと、Spra Go のロゴ
```

作り方（改行を付けないため printf を使う。`frontend/` で）:

```bash
printf '家の前で手を振るスプルと、Spra Go のロゴ' > src/app/opengraph-image.alt.txt
printf '家の前で手を振るスプルと、Spra Go のロゴ' > src/app/twitter-image.alt.txt
```

`frontend/src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

/** ホーム画面に追加したときの名前とアイコン(docs/design/2026-09-29-spru-icons-design.md 5章)。アイコンは tools/spru-assets/brand.py が作る */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spra Go",
    short_name: "Spra Go",
    description: "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#5bb33e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- [ ] **Step 7: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/app/manifest.test.ts`
Expected: PASS（2件）

- [ ] **Step 8: タブの題名のまわりに SNS のカードの設定を足す**

`frontend/src/app/layout.tsx` の `metadata`（Task 6 で題名は「Spra Go — 学ぶほど、世界が広がる。」になっている）

```tsx
export const metadata: Metadata = {
  title: "Spra Go — 学ぶほど、世界が広がる。",
  description: "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。",
};
```

を次にする:

```tsx
const TITLE = "Spra Go — 学ぶほど、世界が広がる。";
const DESCRIPTION = "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。";

// SNSで共有したときのカード(docs/design/2026-09-29-spru-icons-design.md 6章)。画像は app/opengraph-image.jpg・twitter-image.jpg。
// 画像のURLのもとになるドメインは NEXT_PUBLIC_SITE_URL(本番の値はブランドとドメインの設計で決める)
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Spra Go", locale: "ja_JP", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};
```

- [ ] **Step 9: ページの頭に指定が入っているのを確かめる**

Run: `curl -s http://localhost:3000/login | grep -o -E '<link rel="(icon|apple-touch-icon|manifest)"[^>]*>|<meta (property|name)="(og:image|og:title|twitter:card|twitter:image)"[^>]*>' | sort -u`
Expected: `rel="icon"`（favicon.ico と icon.png の2つ）、`rel="apple-touch-icon"`、`rel="manifest"`、`og:image`（`http://localhost:3000/opengraph-image.jpg?...`）、`og:title`、`twitter:card`（`summary_large_image`）、`twitter:image` が出る

Run: `curl -s http://localhost:3000/manifest.webmanifest | head -c 200`
Expected: `{"name":"Spra Go","short_name":"Spra Go",...` で始まる

- [ ] **Step 10: 型・lint・画面のテスト全部を確かめる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし。テストは全部 PASS

- [ ] **Step 11: コミット**

```bash
git add tools/spru-assets/brand.py tools/spru-assets/fonts frontend/src/app/favicon.ico frontend/src/app/icon.png frontend/src/app/apple-icon.png frontend/src/app/opengraph-image.jpg frontend/src/app/twitter-image.jpg frontend/src/app/opengraph-image.alt.txt frontend/src/app/twitter-image.alt.txt frontend/public/icons frontend/src/app/manifest.ts frontend/src/app/manifest.test.ts frontend/src/app/layout.tsx
git commit -q -m "#00239: feat:S字の芽のスプルでアプリのアイコンとSNS画像を作り、ホーム画面の設定とSNSのカードを足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: ブラウザでの確認とドキュメント

**Files:**
- Modify: `SPEC.md`（4-2 の「画面のまわりを整えた」の行の次）
- Modify: `TASKS.md`（開発部門の29〜33行目あたり・51行目「ほかの小さな点」・公開前の確認）
- Modify: `company/mascot/CLAUDE.md`（「主要な意思決定」の最後に追記。リポジトリの外なのでコミットしない）

**Interfaces:**
- Consumes: Task 1〜7 のすべて
- Produces: なし

- [ ] **Step 1: 開発用のデータの確認前の状態を記録する**

Run（`projects/Spra-go/` で）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::find(7); echo json_encode([$p->only(["current_streak","best_streak","last_played_date","xp","coins","hp","points","avatar","level","last_review_on"]), DB::table("profile_errands")->where("user_profile_id",7)->pluck("id"), DB::table("profile_trips")->where("user_profile_id",7)->pluck("id"), DB::table("profile_currency_ledger")->max("id"), DB::table("profile_question_memories")->where("user_profile_id",7)->count()]), PHP_EOL;'
```

Expected: 1行のJSON。これを確認前の状態として控える（体力の自然回復で `hp` だけは変わることがある）

- [ ] **Step 2: ブラウザで確かめる（幅390px）**

`test@example.com` / `password` でログインし、町テストを選ぶ。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、見終わったら消す。

- 町（`/`）: 下のメニュー（学ぶ・せかい・ショップの絵、真ん中の大きい「まち」、選んでいる「まち」の字の色）、「じぶん」の町テストのアバター、上のバッグのボタン、「つづきから学ぶ」、家族の町の札（家族がいれば）、右下の音のボタン（押してオン・オフの絵が替わる。確かめたら元に戻す）
- 「じぶん」を開く: 上の名前の横のアバター、バッグ・プロフィールを切り替える・ログアウトの絵
- 学ぶ（`/learn`）と国のページ: ステージの丸（鍵・遊べる・クリア・まだのボスの赤い丸）、番号の札、START、選んだときの青い輪
- せかい（`/trip`）: チケットの札（まだの国があれば）。出発の場面は、`GET /api/travel` の `tickets` が1以上なら出発して、船か飛行機が右向きに進むのを見る（そのあと Step 4 で旅の記録を消す）。0なら出発しない（Ruling に書く）
- 家族の町（`/family`）: 見出しの絵、「自分の町にもどる」の家の絵
- 見つからないページ（`/nai`）: 迷子のスプル・見出し・「町にもどる」、タブの題名が「ページが見つかりません | Spra Go」
- プロフィール選び（`/profiles`）: アバター、「＋ 追加」のバッジ。「追加」を押してパネルのアバター6種と選んだ印（緑の輪）を見て、追加せずに閉じる
- ログアウトして未ログインのトップ（`/`）: トップの大きな名前「Spra Go」、「ログイン」のバッジ。ブラウザのタブにスプルのアイコンが出ること
- 最後に町テストでログインし直す

- [ ] **Step 3: 幅320pxと1280pxでも確かめる**

- 320px: 下のメニューの「まち」の絵と「じぶん」のアバターの芽が、ほかのボタン・字に重ならない。ステージの丸と番号の札がはみ出さない
- 1280px: 下のメニューが真ん中に480px幅でおさまる

- [ ] **Step 4: 開発用のデータを元に戻す**

町を開いたことで今日のおつかいが増えた場合は、Step 1 のあとに増えた `profile_errands` の行を消す。出発した場合は、増えた `profile_trips` の行を消す（どちらも町テスト＝id 7 の行だけ）:

```bash
./vendor/bin/sail artisan tinker --execute='DB::table("profile_errands")->where("user_profile_id",7)->whereNotIn("id",[<Step 1 のおつかいの id>])->delete(); DB::table("profile_trips")->where("user_profile_id",7)->whereNotIn("id",[<Step 1 の旅の id>])->delete();'
```

もう一度 Step 1 のコマンドを流す。
Expected: `hp` 以外が Step 1 と同じ（`hp` が変わったら、Step 1 の値に戻す: `App\Models\UserProfile::whereKey(7)->update(["hp"=><値>])`）

- [ ] **Step 5: ドキュメントを直す**

`SPEC.md` の4-2の「✅（2026-09-28）画面のまわりを整えた…」の行の次に足す:

```markdown
- ✅（2026-09-29）**スプルのアイコン・画像を画面に入れた**: Ownerの画像（`company/mascot/assets/image4.png`〜`image6.png`・`image9.png`・`image10.png`）を切り抜いて使う。下のメニュー（学ぶ・せかい・まち・ショップ）はスプルのバッジで、真ん中の「まち」は大きく。「じぶん」はそのプレイヤーのアバター（パネルの上も）。「じぶん」のパネルのバッグ・プロフィールの切り替え・ログアウト、音のボタン（オン・オフ）、町の「つづきから学ぶ」・家族の町・バッグ、家族の町の「自分の町にもどる」（スプルの家の小さい絵）もスプルの絵にした（ふりがな・文字の大きさ・「おつかい」は今のまま）。ステージの丸は丸ごとバッジ（鍵・遊べる・クリア。まだのボスは赤い丸とボスの印）で、番号は丸の下の札。アバターはOwnerの6種（赤・橙・黄・青・紫・桃）。出発の場面の船・飛行機はスプルが乗った絵、チケットの絵も替えた。見つからないページ（迷子のスプル）を作った。ブラウザのタブ・ホーム画面のアイコンと、SNSで共有したときの画像（ロゴ・「Spra Go」・キャッチコピー入り）は、頭がS字の芽のスプル（image9・image10）から作る（`tools/spru-assets/brand.py`）。画面とタブの名前の表記は「Spra Go」にそろえた。SNSの画像のURLのもとになるドメインは `NEXT_PUBLIC_SITE_URL`（`docs/design/2026-09-29-spru-icons-design.md`）
```

`TASKS.md` の開発部門で:

- 「- [ ] スプルのアイコン画像（Ownerが用意）が届いたら、線のアイコンと差し替える: …」を `- [x] **スプルのアイコン画像に差し替える**（2026-09-29。設計書 `docs/design/2026-09-29-spru-icons-design.md`、実装計画 `docs/design/2026-09-29-spru-icons-plan.md`）: 下のメニュー・音のボタン・「じぶん」（バッグ・プロフィールの切り替え・ログアウト。ふりがな・文字の大きさは字のまま）・町のバッグのボタン` に直す
- 「- [ ] 追加の画像（…）が届いたら切り抜いて使う:」とその下の3行を `- [x] **追加の画像を切り抜いて使う**（2026-09-29。同じ設計書）: アバター6種、アプリのアイコン・SNS画像、ステージの丸3種、出発の船・飛行機、チケット、町のボタン2種、迷子のスプル（見つからないページ）。「学ぶ」の切り替え2種は学ぶタブの地図をやめるので使わない。スプルの家は image1 から背景を抜いた絵のまま。手紙・鍵のスプルは切り抜いて取ってある（下のメール確認・パスワード再設定で使う）` に直す
- その下に足す: `- [ ] **メール確認・パスワード再設定のページを作る**（公開前必須、2026-09-29追加）: 今は `app/verify-email`・`app/forgot-password`・`app/password-reset/[token]` に英語の見出しがあるだけで、ログインの画面からもつながっていない。サーバーの仕組み（`routes/auth.php`）はある。メールを送る設定も含めて作る。絵は手紙のスプル（`SPRU_ICONS.letter`）と鍵のスプル（`SPRU_ICONS.key`）`
- その下に足す: `- [ ] 出発の場面の船・飛行機の絵は元が約180pxで、高精細の画面では少しやわらかく見える。気になるときは大きい絵をOwnerに頼んで差し替える（image4 の自転車・電車・車も、使う場面ができたら使う）`
- 51行目「ほかの小さな点」の「ブラウザのタブの題名が「Create Next App」のまま（アプリの題名・説明の設定がない。タブのアイコン・SNSで共有したときの画像と一緒に直す）。」を消す（題名・アイコン・SNS画像は済んだ）
- 公開前の確認（「本格公開」の判断の前の一覧、または6-5 本番デプロイの近くのタスク）に足す: `- [ ] 本番で `NEXT_PUBLIC_SITE_URL`（例: https://go.spra.jp）を設定する。ないとSNSで共有したときの画像のURLが localhost になる（`docs/design/2026-09-29-spru-icons-design.md` 6章）`

`company/mascot/CLAUDE.md` の「主要な意思決定（サマリ）」の最後に追記する:

```markdown
  - 2026-09-29追記（アイコン・アバター・アプリのアイコン）: Spra-go で、image4（入口の3種・下のメニュー4種・ステージの丸3種・船・飛行機・チケット・迷子のスプル）、image5（音オン・オフ・バッグ・ログアウト・つづきから学ぶ・家族の町・手紙・鍵）、image6（アバター6種）を切り抜いて使い始めた（`icons/`・`stages/`・`avatars/`・`travel/`・`pages/`）。image9（頭がS字の芽のスプル）からブラウザのタブ・ホーム画面のアイコン、image10（家の前で手を振るスプル）からSNSで共有したときの画像を作った（`tools/spru-assets/brand.py`）。image7・8は頭の形がちがうため使わない。ブランドのSは外から見える所（アイコン・SNS）で守り、画面の中のバッジは葉の形のままでよい（`company/secretary/notes/2026-09-29-decisions.md`）。image4 の自転車・電車・車、「学ぶ」の切り替え、404の看板は未使用
```

- [ ] **Step 6: 画面のテスト全部・型・lint を確かめる**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: テストは全部 PASS（249件＋この計画で足した分）、エラーなし

- [ ] **Step 7: コミット**

```bash
git add SPEC.md TASKS.md
git commit -q -m "#00240: docs:スプルのアイコン・画像をSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
