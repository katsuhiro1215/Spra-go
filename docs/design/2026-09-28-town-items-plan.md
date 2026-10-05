# 町のアイテムのカテゴリ分けと画像を表示する仕組み（段階1） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 町のアイテムを6つのカテゴリに分けてショップとバッグにタブを付け、アイテム・目印を画像で表示できる仕組み（切り抜きの道具・置き方の計算・画像のない物は今の絵のまま）を作る。

**Architecture:** カテゴリは絵のキーで決まり、サーバーの `config/world.php` の `asset_categories` を元に `ShopItem::category()` が返す（画面の管理画面用の対応表はテストで設定とそろえる）。タブの判定は画面を描かない関数（`categories.ts`）にまとめ、ショップとバッグは共通のタブ部品を使う。画像は `tools/spru-assets/extract.py` が `SPRU_ITEMS` に書き出し、`imagePlacement` で大きさと位置を決め、`ItemArt`・`ItemIcon`・`LandmarkArt` は画像があれば画像、なければ今のプログラムの絵で描く。

**Tech Stack:** Laravel 13（Sail）＋Pest、Next.js 16＋React 19＋TypeScript＋Tailwind v4、Vitest、Python 3＋Pillow（切り抜きの道具）

**Spec:** `docs/design/2026-09-28-town-items-design.md`（この計画は8章の段階1。段階2・3は画像が届いてから）

## Global Constraints

- ブランチは `feature/town-items`。コミットは `#NNNNN: type:要約`（日本語）、この計画のコミットは #00214、タスクは #00215 から。本文の最後に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`（`git commit -m "..." -m "Co-Authored-By: ..."`）
- カテゴリのキーと表示名: `nature`＝しぜん、`decor`＝かざり、`house`＝いえ・お店、`landmark`＝名所、`vehicle`＝のりもの、`souvenir`＝おみやげ。タブの並びはこの順
- おみやげ（`meta.souvenir_of` がある品）はキーによらず `souvenir`。回復薬・称号は `null`。`asset_categories` にないキーは `decor`
- ショップは「すべて」のタブなし、最初に開くのは並びで最初のタブ。バッグは最初が「すべて」
- 画像の置き方: 幅＝足元のマスの数×64×0.9×scale、画像の下の真ん中を原点から 足元のマスの数×8 だけ手前。影は色 `#2f5d2a`・不透明度0.15・y=2、半径は1マス横20・縦8（2×2は横40・縦16）
- 切り抜きの道具の出力は `frontend/public/spru/items/{key}.webp`、画面側の一覧は `SPRU_ITEMS`（`spru-assets.ts`、手で直さない）
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` を付けない）。出力はJSONなので `"tool":"pest","result"` を見る
- 画面の文は `AutoFurigana` を通す。ふりがなの辞書（`frontend/src/lib/furigana-dictionary.json`）は長い語から並べ、ファイルの最後に改行を付けない
- 開発用のデータは壊さない（`migrate:fresh` はしない）。ブラウザでの確認のあと、町テスト（id 7）の値が変わっていないことを確かめる

## Review Focus

1. **Lv1のプレイヤー**: 最初から買える物（Lv1の品）すべてに「NEW」が付くと意味がなくなる → NEWは `min_level` が2以上の物だけ（Task 2のテスト「Lv1の物にはNEWを付けない」）
2. **選んでいたタブの品がなくなったとき**（購入や置いたあとに一覧が変わる）→ 最初のタブに戻る（Task 2のテスト「選んでいたタブがなくなったら最初のタブ」）
3. **絵のキーがない・設定にない町のアイテム**（Ownerの登録ミス・古いデータ）→ `decor` になり、どのタブにも出なくなることはない（Task 1のテスト「設定にないキー・キーなしは decor」）
4. **背の高い2×2の画像**（タワー・自由の女神）を小さな絵にしたとき → 上が切れずに全体が入る（Task 5のテスト「背の高い画像もはみ出さない」）
5. **カテゴリのない品**（回復薬・称号）がタブの判定に混ざったとき → タブを作らない（Task 2のテスト「カテゴリのない品はタブにならない」）

---

### Task 1: サーバーのカテゴリ

**Files:**
- Modify: `config/world.php`（`asset_footprints` の後ろに `asset_categories` を足す）
- Modify: `app/Models/ShopItem.php`（`category()` を足す）
- Modify: `routes/api.php:1188-1193`（`/api/shop` の各品に `category`）
- Modify: `app/Models/ProfileWorldItem.php:35-48`（`toWorldArray()` に `category`）
- Test: `tests/Feature/WorldCategoryTest.php`（新規）

**Interfaces:**
- Produces: `config('world.asset_categories')`（絵のキー → カテゴリのキー）、`ShopItem::category(): ?string`、`GET /api/shop` の各品の `category`、`GET /api/world` の `items[]`・`bag[]` の `category`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldCategoryTest.php`:

```php
<?php

use App\Models\ShopItem;

/*
|--------------------------------------------------------------------------
| 町のアイテムのカテゴリ(docs/design/2026-09-28-town-items-design.md 3章)
|--------------------------------------------------------------------------
|
| カテゴリは絵のキーで決まる(config/world.php の asset_categories)。
| おみやげはキーによらず souvenir、回復薬・称号はカテゴリなし、設定にないキーは decor。
|
*/

it('設定: asset_keys のすべての絵にカテゴリがあり、おみやげ以外の5つのどれか。スプルの花は しぜん', function () {
    $categories = config('world.asset_categories');

    foreach (config('world.asset_keys') as $key) {
        expect($categories)->toHaveKey($key);
        expect($categories[$key])->toBeIn(['nature', 'decor', 'house', 'landmark', 'vehicle']);
    }
    expect($categories['spru_flower'])->toBe('nature');
});

it('町のアイテムのカテゴリは絵のキーで決まる', function () {
    expect(createDecoration(['name' => '桜の木', 'meta' => ['asset_key' => 'sakura']])->category())->toBe('nature');
    expect(createDecoration(['name' => 'ベンチ', 'meta' => ['asset_key' => 'bench']])->category())->toBe('decor');
    expect(createDecoration(['name' => '屋台', 'meta' => ['asset_key' => 'stall']])->category())->toBe('house');
    expect(createDecoration(['name' => 'お城', 'meta' => ['asset_key' => 'castle']])->category())->toBe('landmark');
    expect(createDecoration(['name' => '自転車', 'meta' => ['asset_key' => 'bicycle']])->category())->toBe('vehicle');
});

it('おみやげはキーによらず souvenir、回復薬はカテゴリなし', function () {
    $souvenir = createDecoration([
        'name' => 'コモドドラゴンの像',
        'meta' => ['asset_key' => 'komodo', 'not_for_sale' => true, 'souvenir_of' => 'インドネシア'],
    ]);
    $potion = ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion', 'meta' => ['heal' => 10]]);

    expect($souvenir->category())->toBe('souvenir');
    expect($potion->category())->toBeNull();
});

it('設定にないキー・キーなしの町のアイテムは decor(どのタブにも出なくなることはない)', function () {
    expect(createDecoration(['name' => 'なぞの物', 'meta' => ['asset_key' => 'zzz']])->category())->toBe('decor');
    expect(createDecoration(['name' => '絵なし', 'meta' => []])->category())->toBe('decor');
});

it('ショップ一覧の町のアイテムに category が付き、回復薬は null', function () {
    createActiveProfile();
    createDecoration(['name' => '桜の木', 'meta' => ['asset_key' => 'sakura']]);
    ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion', 'meta' => ['heal' => 10]]);

    $items = collect($this->getJson('/api/shop')->assertOk()->json())->keyBy('name');

    expect($items['桜の木']['category'])->toBe('nature');
    expect($items['回復薬']['category'])->toBeNull();
});

it('町とバッグのアイテムに category が付く(おみやげは souvenir、スプルの花は nature)', function () {
    $profile = createActiveProfile();
    giveWorldItem($profile, 'castle', placed: true);
    giveWorldItem($profile, 'spru_flower');
    $souvenir = createDecoration([
        'name' => 'バイソンの像',
        'meta' => ['asset_key' => 'bison', 'not_for_sale' => true, 'souvenir_of' => 'アメリカ'],
    ]);
    $profile->worldItems()->create(['shop_item_id' => $souvenir->id]);

    $world = $this->getJson('/api/world')->assertOk();

    expect(collect($world->json('items'))->pluck('category')->all())->toBe(['landmark']);
    expect(collect($world->json('bag'))->pluck('category', 'asset_key')->all())
        ->toEqual(['spru_flower' => 'nature', 'bison' => 'souvenir']);
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/WorldCategoryTest.php | grep -o '"tool":"pest","result"[^}]*'`
Expected: `"result":"failed"`（`asset_categories` が null のため `toHaveKey` で落ちる、`category()` が未定義）

- [ ] **Step 3: 設定を足す**

`config/world.php` の `asset_footprints` の配列の直後（区画の説明コメントの前）に足す:

```php

    /*
    | 町のアイテムのカテゴリ(docs/design/2026-09-28-town-items-design.md 3-2)。絵のキーで決まり、Ownerは選ばない。
    | asset_keys のすべてのキーに付ける(種から咲くスプルの花も)。おみやげはキーによらず souvenir(ShopItem::category)。
    | フロントの art-keys.ts の ITEM_ART_CATEGORIES と必ず一致させる(art-keys.test.ts で確かめる)
    */

    'asset_categories' => [
        'flowerbed' => 'nature', 'tree' => 'nature', 'bamboo' => 'nature', 'sakura' => 'nature', 'palm' => 'nature',
        'spru_flower' => 'nature',
        'chochin' => 'decor', 'bench' => 'decor', 'stone_lantern' => 'decor', 'fountain' => 'decor',
        'parasol' => 'decor', 'vending' => 'decor',
        'stall' => 'house',
        'pagoda' => 'landmark', 'castle' => 'landmark', 'tower' => 'landmark',
        'bicycle' => 'vehicle', 'boat_small' => 'vehicle', 'boat_large' => 'vehicle',
    ],
```

- [ ] **Step 4: `ShopItem::category()` を足す**

`app/Models/ShopItem.php` の `footprint()` の後ろに:

```php

    /** カテゴリ(設計書 2026-09-28-town-items 3-2)。町に置く物でなければ null。おみやげは souvenir、設定にないキーは decor */
    public function category(): ?string
    {
        if ($this->type !== 'decoration') {
            return null;
        }
        if (isset($this->meta['souvenir_of'])) {
            return 'souvenir';
        }

        return config('world.asset_categories')[$this->assetKey() ?? ''] ?? 'decor';
    }
```

- [ ] **Step 5: APIに `category` を足す**

`routes/api.php` の `/api/shop`（`shop.index`）の `map` を:

```php
        ->map(fn (ShopItem $item) => [
            ...$item->toArray(),
            'asset_key' => $item->assetKey(),
            'footprint' => $item->footprint(),
            'category' => $item->category(),
            'locked' => $level < $item->min_level,
        ]);
```

`app/Models/ProfileWorldItem.php` の `toWorldArray()` を（docblockも直す）:

```php
    /** @return array{id: int, shop_item_id: int, name: string, asset_key: ?string, footprint: int, category: ?string, souvenir: bool, x: ?int, y: ?int} */
    public function toWorldArray(): array
    {
        return [
            'id' => $this->id,
            'shop_item_id' => $this->shop_item_id,
            'name' => $this->shopItem->name,
            'asset_key' => $this->shopItem->assetKey(),
            'footprint' => $this->shopItem->footprint(),
            'category' => $this->shopItem->category(),
            'souvenir' => isset($this->shopItem->meta['souvenir_of']),
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
```

- [ ] **Step 6: テストを流して通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/WorldCategoryTest.php | grep -o '"tool":"pest","result"[^}]*'`
Expected: `"result":"passed"`、6件

- [ ] **Step 7: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result"[^}]*'`
Expected: `"result":"passed"`、361件（355＋6）

- [ ] **Step 8: コミット**

```bash
git add config/world.php app/Models/ShopItem.php app/Models/ProfileWorldItem.php routes/api.php tests/Feature/WorldCategoryTest.php
git commit -m "#00215: feat:町のアイテムのカテゴリを絵のキーで決め、ショップと町のAPIで返す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 画面のカテゴリの土台（判定の関数・型・管理画面の名前）

**Files:**
- Create: `frontend/src/components/world/categories.ts`
- Test: `frontend/src/components/world/categories.test.ts`
- Modify: `frontend/src/components/world/types.ts:9-20, 79-90`（`WorldItem`・`ShopListItem` に `category`）
- Modify: `frontend/src/components/spru/hint.test.ts:7-19`（テスト用のデータに `category`）
- Modify: `frontend/src/components/world/art-keys.ts`（`ITEM_ART_LABELS` から「(2×2)」を外し、`ITEM_ART_CATEGORIES`・`artOptionLabel` を足す）
- Modify: `frontend/src/components/world/art-keys.test.ts`
- Modify: `frontend/src/app/owner/dashboard/shop-items/page.tsx:39, 52`

**Interfaces:**
- Consumes: Task 1 の `category`（`"nature" | "decor" | "house" | "landmark" | "vehicle" | "souvenir" | null`）
- Produces:
  - `ITEM_CATEGORIES: readonly ["nature","decor","house","landmark","vehicle","souvenir"]`、`type ItemCategory`、`CATEGORY_LABELS: Record<ItemCategory, string>`
  - `presentCategories(items: readonly { category: ItemCategory | null }[]): ItemCategory[]`
  - `type BagTab = "all" | ItemCategory`、`bagTabs(items): BagTab[]`、`tabLabel(tab: BagTab): string`
  - `pickTab<T extends string>(tabs: readonly T[], selected: T | null): T | null`
  - `inTab<T extends { category: ItemCategory | null }>(items: readonly T[], tab: BagTab): T[]`
  - `isNewItem(item: { min_level: number; locked: boolean }, level: number): boolean`
  - `categoriesWithNew(items, level): ItemCategory[]`
  - `WorldItem.category: ItemCategory`、`ShopListItem.category: ItemCategory | null`
  - `ITEM_ART_CATEGORIES: Record<ItemArtKey, ItemCategory>`、`artOptionLabel(key: ItemArtKey): string`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/world/categories.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  bagTabs,
  categoriesWithNew,
  inTab,
  isNewItem,
  pickTab,
  presentCategories,
  tabLabel,
  type ItemCategory,
} from "./categories";

const item = (category: ItemCategory | null, min_level = 1, locked = false) => ({ category, min_level, locked });

describe("ショップのタブ", () => {
  it("品のあるカテゴリだけを、しぜん→かざり→いえ・お店→名所→のりもの の順に返す", () => {
    expect(presentCategories([item("vehicle"), item("nature"), item("landmark"), item("nature")])).toEqual([
      "nature",
      "landmark",
      "vehicle",
    ]);
  });

  it("カテゴリが1つだけでもタブは1つ出る。品がなければ空", () => {
    expect(presentCategories([item("decor")])).toEqual(["decor"]);
    expect(presentCategories([])).toEqual([]);
  });

  it("カテゴリのない品(回復薬など)はタブにならない", () => {
    expect(presentCategories([item(null), item("house")])).toEqual(["house"]);
  });
});

describe("NEW", () => {
  it("鍵がなく、必要レベルが今のレベルと同じ物だけ", () => {
    expect(isNewItem({ min_level: 3, locked: false }, 3)).toBe(true);
    expect(isNewItem({ min_level: 2, locked: false }, 3)).toBe(false);
    expect(isNewItem({ min_level: 3, locked: true }, 3)).toBe(false);
  });

  it("Lv1の物にはNEWを付けない(最初から買える物で、レベルが上がって買えるようになった物ではない)", () => {
    expect(isNewItem({ min_level: 1, locked: false }, 1)).toBe(false);
  });

  it("NEW の物があるカテゴリに印を付ける", () => {
    expect(categoriesWithNew([item("nature", 3), item("decor", 1), item("house", 3, true)], 3)).toEqual(["nature"]);
  });
});

describe("バッグのタブ", () => {
  it("「すべて」が最初で、そのあとに品のあるカテゴリ(おみやげも)", () => {
    expect(bagTabs([item("souvenir"), item("nature")])).toEqual(["all", "nature", "souvenir"]);
    expect(bagTabs([])).toEqual(["all"]);
  });

  it("「すべて」は全部、カテゴリのタブはそのカテゴリの品だけ", () => {
    const items = [item("souvenir"), item("nature")];
    expect(inTab(items, "all")).toEqual(items);
    expect(inTab(items, "souvenir")).toEqual([item("souvenir")]);
  });

  it("タブの名前", () => {
    expect(tabLabel("all")).toBe("すべて");
    expect(tabLabel("nature")).toBe("しぜん");
    expect(tabLabel("house")).toBe("いえ・お店");
    expect(tabLabel("landmark")).toBe("名所");
    expect(tabLabel("souvenir")).toBe("おみやげ");
  });
});

describe("選んでいるタブ", () => {
  it("選んでいたタブがなくなったら最初のタブ。まだ選んでいなければ最初のタブ", () => {
    expect(pickTab<ItemCategory>(["nature", "decor"], "decor")).toBe("decor");
    expect(pickTab<ItemCategory>(["nature", "decor"], "house")).toBe("nature");
    expect(pickTab<ItemCategory>(["nature", "decor"], null)).toBe("nature");
    expect(pickTab<ItemCategory>([], null)).toBeNull();
  });
});
```

`frontend/src/components/world/art-keys.test.ts` の import を次のように直し:

```ts
import {
  BIG_ASSETS,
  ITEM_ART_CATEGORIES,
  ITEM_ART_KEYS,
  ITEM_ART_LABELS,
  SOUVENIR_ART_KEYS,
  artOptionLabel,
  isBigAsset,
} from "./art-keys";
```

「管理画面(ショップ編集)の絵の選択肢の名前が、すべての絵にある」のテストの後ろに足す:

```ts
  it("絵のカテゴリは config/world.php の asset_categories と同じ", () => {
    const pairs = Object.fromEntries(
      [...phpArray("asset_categories").matchAll(/'([a-z_]+)'\s*=>\s*'([a-z]+)'/g)].map((m) => [m[1], m[2]]),
    );
    for (const key of ITEM_ART_KEYS) expect([key, pairs[key]]).toEqual([key, ITEM_ART_CATEGORIES[key]]);
  });

  it("管理画面の絵の選択肢は、名前にカテゴリと大きさを添える", () => {
    expect(artOptionLabel("bench")).toBe("ベンチ（かざり）");
    expect(artOptionLabel("pagoda")).toBe("五重塔（名所・2×2）");
    expect(artOptionLabel("boat_large")).toBe("大きな船（のりもの・2×2）");
  });
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/world/categories.test.ts src/components/world/art-keys.test.ts`
Expected: FAIL（`./categories` が見つからない、`ITEM_ART_CATEGORIES`・`artOptionLabel` が未定義）

- [ ] **Step 3: `categories.ts` を作る**

`frontend/src/components/world/categories.ts`:

```ts
/** 町のアイテムのカテゴリ(docs/design/2026-09-28-town-items-design.md 3章)。並びはタブの順 */
export const ITEM_CATEGORIES = ["nature", "decor", "house", "landmark", "vehicle", "souvenir"] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  nature: "しぜん",
  decor: "かざり",
  house: "いえ・お店",
  landmark: "名所",
  vehicle: "のりもの",
  souvenir: "おみやげ",
};

type Categorized = { category: ItemCategory | null };

/** 品が1つ以上あるカテゴリだけを、決まった順に返す(ショップのタブ。おみやげは売らないので出ない) */
export function presentCategories(items: readonly Categorized[]): ItemCategory[] {
  return ITEM_CATEGORIES.filter((category) => items.some((item) => item.category === category));
}

export type BagTab = "all" | ItemCategory;

/** バッグのタブ: 「すべて」のあとに、品のあるカテゴリ */
export function bagTabs(items: readonly Categorized[]): BagTab[] {
  return ["all", ...presentCategories(items)];
}

export function tabLabel(tab: BagTab): string {
  return tab === "all" ? "すべて" : CATEGORY_LABELS[tab];
}

/** 選んでいたタブがなくなったら(品が減ったときなど)、またはまだ選んでいなければ、最初のタブにする */
export function pickTab<T extends string>(tabs: readonly T[], selected: T | null): T | null {
  return selected !== null && tabs.includes(selected) ? selected : (tabs[0] ?? null);
}

export function inTab<T extends Categorized>(items: readonly T[], tab: BagTab): T[] {
  return tab === "all" ? [...items] : items.filter((item) => item.category === tab);
}

/** レベルが上がって、今のレベルで買えるようになった物(鍵がなく、必要レベルが今のレベルと同じ。Lv1の物は除く) */
export function isNewItem(item: { min_level: number; locked: boolean }, level: number): boolean {
  return !item.locked && item.min_level > 1 && item.min_level === level;
}

/** NEW の物があるカテゴリ(タブに印を付ける) */
export function categoriesWithNew(
  items: readonly (Categorized & { min_level: number; locked: boolean })[],
  level: number,
): ItemCategory[] {
  return presentCategories(items.filter((item) => isNewItem(item, level)));
}
```

- [ ] **Step 4: 型にカテゴリを足す**

`frontend/src/components/world/types.ts` の先頭の import の並びに足す（ファイルの先頭に import がなければ1行目に置く）:

```ts
import type { ItemCategory } from "./categories";
```

`WorldItem` の `footprint` の後ろに:

```ts
  /** カテゴリ(設計書 2026-09-28-town-items 3章)。おみやげは souvenir */
  category: ItemCategory;
```

`ShopListItem` の `footprint` の後ろに:

```ts
  /** 町のアイテムのカテゴリ。回復薬・称号は null */
  category: ItemCategory | null;
```

`frontend/src/components/spru/hint.test.ts` のテスト用のデータに足す（`item` は `footprint: 1,` の次の行に `category: "decor",`、`bagItem` は `footprint: 1,` の後ろに `category: "decor",`）:

```ts
const item = (name: string, price: number, minLevel: number, id = price * 100 + minLevel): ShopListItem => ({
  id,
  name,
  price,
  type: "decoration",
  currency: "point",
  min_level: minLevel,
  asset_key: "bench",
  footprint: 1,
  category: "decor",
  locked: false,
  meta: { asset_key: "bench" },
});
const bagItem = (name: string): WorldItem => ({ id: 1, shop_item_id: 1, name, asset_key: "bench", footprint: 1, category: "decor", souvenir: false, x: null, y: null });
```

- [ ] **Step 5: 絵のカテゴリと管理画面の名前**

`frontend/src/components/world/art-keys.ts`:

先頭に import を足す:

```ts
import { CATEGORY_LABELS, type ItemCategory } from "./categories";
```

`ITEM_ART_LABELS` の説明を「管理画面(ショップ編集)の絵の選択肢に出す名前。カテゴリと大きさは artOptionLabel で添える」に変え、値の「(2×2)」を外す（`fountain: "噴水"`、`pagoda: "五重塔"`、`castle: "お城"`、`tower: "タワー"`、`boat_large: "大きな船"`）。

`ITEM_ART_LABELS` の後ろに足す:

```ts
/** 絵のカテゴリ(設計書 2026-09-28-town-items 3-2)。config/world.php の asset_categories と必ず一致させる */
export const ITEM_ART_CATEGORIES: Record<ItemArtKey, ItemCategory> = {
  bench: "decor",
  flowerbed: "nature",
  chochin: "decor",
  tree: "nature",
  sakura: "nature",
  vending: "decor",
  bicycle: "vehicle",
  stall: "house",
  stone_lantern: "decor",
  bamboo: "nature",
  fountain: "decor",
  palm: "nature",
  parasol: "decor",
  pagoda: "landmark",
  castle: "landmark",
  tower: "landmark",
  boat_small: "vehicle",
  boat_large: "vehicle",
};

/** 管理画面の絵の選択肢の名前。カテゴリと、2×2なら大きさを添える(例: 「五重塔（名所・2×2）」) */
export function artOptionLabel(key: ItemArtKey): string {
  const size = isBigAsset(key) ? "・2×2" : "";
  return `${ITEM_ART_LABELS[key]}（${CATEGORY_LABELS[ITEM_ART_CATEGORIES[key]]}${size}）`;
}
```

`frontend/src/app/owner/dashboard/shop-items/page.tsx`:

```ts
import { ITEM_ART_KEYS, artOptionLabel } from "@/components/world/art-keys";
```

```ts
const ASSET_KEYS = ITEM_ART_KEYS.map((value) => ({ value, label: artOptionLabel(value) }));
```

- [ ] **Step 6: テストを流して通ることを確かめる**

Run: `cd frontend && npx vitest run src/components/world/categories.test.ts src/components/world/art-keys.test.ts`
Expected: PASS（categories 10件、art-keys は2件増える）

- [ ] **Step 7: 全体のテスト・型・lint**

Run: `cd frontend && npm test 2>&1 | tail -4 && npm run typecheck && npm run lint`
Expected: `Tests 241 passed (241)`（229＋categories 10＋art-keys 2）、型とlintのエラーなし。型エラーが出たら、`WorldItem`・`ShopListItem` を作っている所に `category` を足す

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/world/categories.ts frontend/src/components/world/categories.test.ts frontend/src/components/world/types.ts frontend/src/components/spru/hint.test.ts frontend/src/components/world/art-keys.ts frontend/src/components/world/art-keys.test.ts frontend/src/app/owner/dashboard/shop-items/page.tsx
git commit -m "#00216: feat:画面にアイテムのカテゴリとタブの判定を足し、管理画面の絵の名前にカテゴリを添える" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ショップとバッグのタブ

**Files:**
- Create: `frontend/src/components/world/category-tabs.tsx`
- Modify: `frontend/src/app/shop/page.tsx`（state・町のアイテムの段）
- Modify: `frontend/src/app/bag/page.tsx`（state・一覧）
- Modify: `frontend/src/lib/furigana-dictionary.json`（「名所」「お店」）
- Test: `frontend/src/components/app/auto-furigana.test.ts`

**Interfaces:**
- Consumes: Task 2 の `presentCategories`・`bagTabs`・`pickTab`・`inTab`・`tabLabel`・`isNewItem`・`categoriesWithNew`・`ItemCategory`・`BagTab`
- Produces: `CategoryTabs<T extends string>(props: { idBase: string; label: string; tabs: readonly T[]; selected: T; onSelect: (tab: T) => void; tabLabel: (tab: T) => string; marked?: readonly T[] })`。タブのidは `${idBase}-tab-${tab}`、中身のidは `${idBase}-panel`

- [ ] **Step 1: 失敗するテストを書く（タブの名前のふりがな）**

`frontend/src/components/app/auto-furigana.test.ts` の最後に足す:

```ts
describe("自動ふりがな(ショップとバッグのタブ)", () => {
  it("名所・お店", () => {
    expect(ruby("名所")).toEqual(["名所(めいしょ)"]);
    expect(ruby("いえ・お店")).toEqual(["お店(おみせ)"]);
  });
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/app/auto-furigana.test.ts`
Expected: FAIL（`[]` が返る）

- [ ] **Step 3: 辞書に足す**

`frontend/src/lib/furigana-dictionary.json` の2文字の語の並び（`"倒す": "たおす",` の次の行）に足す。1文字の語（`"正": "ただ",`）より前に置く。ファイルの最後に改行を足さない:

```json
  "名所": "めいしょ",
  "お店": "おみせ",
```

- [ ] **Step 4: テストを流して通ることを確かめる**

Run: `cd frontend && npx vitest run src/components/app/auto-furigana.test.ts`
Expected: PASS

- [ ] **Step 5: タブの部品を作る**

`frontend/src/components/world/category-tabs.tsx`:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { cn } from "@/lib/utils";

type Props<T extends string> = {
  /** タブと中身をつなぐidのもと(1画面に1つ)。タブは `${idBase}-tab-${tab}`、中身は `${idBase}-panel` */
  idBase: string;
  /** タブの並び全体の名前(読み上げ用) */
  label: string;
  tabs: readonly T[];
  selected: T;
  onSelect: (tab: T) => void;
  tabLabel: (tab: T) => string;
  /** 小さな点を付けるタブ(NEW の物があるタブ) */
  marked?: readonly T[];
};

/** ショップとバッグのカテゴリのタブ(設計書 2026-09-28-town-items 3-3)。どのタブもボタンで、Tabキーで移り Enter・Space で切り替える */
export function CategoryTabs<T extends string>({ idBase, label, tabs, selected, onSelect, tabLabel, marked = [] }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-1">
      {tabs.map((tab) => {
        const active = tab === selected;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab}`}
            aria-selected={active}
            aria-controls={`${idBase}-panel`}
            onClick={() => onSelect(tab)}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-black whitespace-nowrap shadow",
              active ? "bg-[#3b7f26] text-white" : "bg-[#fffaf0] text-[#3b3226]",
            )}
          >
            <span>
              <AutoFurigana text={tabLabel(tab)} />
            </span>
            {marked.includes(tab) && (
              <>
                <span aria-hidden className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#d8352a]" />
                <span className="sr-only">(新しい物があります)</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: ショップにタブを付ける**

`frontend/src/app/shop/page.tsx`:

import を足す:

```tsx
import { CategoryTabs } from "@/components/world/category-tabs";
import {
  categoriesWithNew,
  inTab,
  isNewItem,
  pickTab,
  presentCategories,
  tabLabel,
  type ItemCategory,
} from "@/components/world/categories";
```

`const [message, setMessage] = useState<string | null>(null);` の次の行に足す:

```tsx
  const [tab, setTab] = useState<ItemCategory | null>(null);
```

`const coinItems = items.filter((item) => item.type !== "decoration");` の次に足す:

```tsx
  const level = profile?.level ?? 1;
  const tabs = presentCategories(decorations);
  const currentTab = pickTab(tabs, tab);
  const newTabs = categoriesWithNew(decorations, level);
```

町のアイテムの段（`{decorations.length > 0 && (` から `</section>` と `)}` まで）を次に置き換える。カードの中身は今のまま、NEWの札だけ足す:

```tsx
        {decorations.length > 0 && currentTab && (
          <section className="flex flex-col gap-3" aria-labelledby="shop-decorations">
            <h2 id="shop-decorations">
              <SkyText as="span" className="text-sm">
                <AutoFurigana text="町のアイテム(学習ポイントで買う)" />
              </SkyText>
            </h2>
            <CategoryTabs
              idBase="shop"
              label="町のアイテムの種類"
              tabs={tabs}
              selected={currentTab}
              onSelect={setTab}
              tabLabel={tabLabel}
              marked={newTabs}
            />
            <div
              role="tabpanel"
              id="shop-panel"
              aria-labelledby={`shop-tab-${currentTab}`}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {inTab(decorations, currentTab).map((item) => {
                const affordable = (profile?.points ?? 0) >= item.price;
                const label = item.locked
                  ? `Lv.${item.min_level}で解放`
                  : !affordable
                    ? "ポイント不足"
                    : purchasingId === item.id
                      ? "購入中..."
                      : "買って置く";
                return (
                  <div key={item.id} className="flex flex-col gap-1.5 rounded-2xl bg-[#fffaf0] p-2 text-[#3b3226] shadow-lg">
                    <div className="relative flex h-[74px] items-center justify-center rounded-xl bg-[#f5efe1]">
                      <ItemIcon assetKey={item.asset_key} size={64} />
                      {item.locked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[rgba(255,250,240,0.8)] text-center text-[10.5px] leading-tight font-black text-[#5a4526]">
                          <span>Lv.{item.min_level}</span>
                          <span>{affordable ? "ポイントはOK / レベルが足りない" : "レベルとポイントが必要"}</span>
                        </div>
                      )}
                      {item.footprint > 1 && (
                        <span className="absolute top-1 left-1 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">
                          2×2マス
                        </span>
                      )}
                      {isNewItem(item, level) && (
                        <span className="absolute top-1 right-1 rounded-full bg-[#d8352a] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] font-black">{item.name}</p>
                    <p className="-mt-1 text-sm font-bold text-[#2e6b1c]">{item.price}pt</p>
                    <button
                      type="button"
                      disabled={item.locked || !affordable || purchasingId === item.id}
                      onClick={() => handleDecorationPurchase(item)}
                      className="h-9 rounded-xl bg-[#3b7f26] text-[12.5px] font-black text-white disabled:bg-[#efe5cf] disabled:text-[#6b5d45]"
                    >
                      <AutoFurigana text={label} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
```

- [ ] **Step 7: バッグにタブを付ける**

`frontend/src/app/bag/page.tsx`:

import を足す:

```tsx
import { CategoryTabs } from "@/components/world/category-tabs";
import { bagTabs, inTab, pickTab, tabLabel, type BagTab } from "@/components/world/categories";
```

`const [world, setWorld] = useState<WorldData | null>(null);` の次に足す:

```tsx
  const [tab, setTab] = useState<BagTab>("all");
```

`useEffect(...)` のブロックの後ろ（`return (` の前）に足す:

```tsx
  const tabs: BagTab[] = world ? bagTabs(world.bag) : ["all"];
  const currentTab = pickTab(tabs, tab) ?? "all";
```

一覧の `<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">` から対応する `</ul>` までを次に置き換える（`<li>` の中身は今と同じ。変わるのは、タブを足して `world.bag` を `inTab(world.bag, currentTab)` にしたことだけ）:

```tsx
          <>
            <CategoryTabs
              idBase="bag"
              label="アイテムの種類"
              tabs={tabs}
              selected={currentTab}
              onSelect={setTab}
              tabLabel={tabLabel}
            />
            <div role="tabpanel" id="bag-panel" aria-labelledby={`bag-tab-${currentTab}`}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {inTab(world.bag, currentTab).map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-[#fffaf0] p-3 text-[#3b3226] shadow-lg"
                  >
                    <div className="relative">
                      <ItemIcon assetKey={item.asset_key} size={64} />
                      {item.footprint > 1 && (
                        <span className="absolute -top-1 -left-4 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                          2×2マス
                        </span>
                      )}
                      {item.souvenir && (
                        <span className="absolute -right-4 -bottom-1 rounded-full bg-[#d8352a] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                          おみやげ
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-black">{item.name}</span>
                    <Link
                      href={`/?place=${item.id}`}
                      className="w-full rounded-xl bg-[#3b7f26] py-2 text-center text-sm font-black text-white"
                    >
                      <AutoFurigana text="置く" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
```

- [ ] **Step 8: 全体のテスト・型・lint**

Run: `cd frontend && npm test 2>&1 | tail -4 && npm run typecheck && npm run lint`
Expected: `Tests 242 passed (242)`、型とlintのエラーなし

- [ ] **Step 9: コミット**

```bash
git add frontend/src/components/world/category-tabs.tsx frontend/src/app/shop/page.tsx frontend/src/app/bag/page.tsx frontend/src/lib/furigana-dictionary.json frontend/src/components/app/auto-furigana.test.ts
git commit -m "#00217: feat:ショップとバッグに町のアイテムのカテゴリのタブを付け、新しく買えるようになった物にNEWを付ける" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 切り抜きの道具にアイテムの組を足す

**Files:**
- Modify: `tools/spru-assets/extract.py`（説明・幅の指定・`items` の組・`SPRU_ITEMS` の書き出し）
- Modify: `tools/spru-assets/crops.json`（`"items": []` を足す）
- Modify: `frontend/src/components/spru/spru-assets.ts`（道具で書き出し直す。手で直さない）

**Interfaces:**
- Produces: `SPRU_ITEMS`（`spru-assets.ts`、キー → `{ src, width, height }`。今は空）。`crops.json` の `items` の1点は `{ "key", "source", "box", "background"?, "width"?, "mode"? }`。`items` の組の既定の `mode` は `"all"`（ひまわり3本のように離れた部品も残す）

- [ ] **Step 1: 道具の説明を直す**

`extract.py` の先頭の説明の出力の一覧に「、町のアイテム・おみやげ・目印 items/(キーは絵のキー。docs/design/2026-09-28-town-items-design.md 7-1)」を足し、`- 切り抜く範囲は…` の次の行に次を足す:

```text
- 1点ごとに "width" を書くと、その幅(px)に縮める(アイテムは1マス256px・2×2は384px)
```

- [ ] **Step 2: 幅の指定と `items` の組を足す**

`main()` の `for group in (...)` を次に置き換える:

```python
    parts: dict = {}
    for group in ("bloom", "garden", "companions", "outing", "costumes", "badges", "stamps", "house", "items"):
        parts[group] = {}
        default_mode = "all" if group == "items" else "largest"
        for part in spec.get(group, []):
            src = sources[part["source"]]
            if part.get("background") == "flood":
                src = clear_background(src)
            img = cut_figure(src, part["box"], part.get("scale", 1.0), part.get("mode", default_mode))
            if "width" in part:
                img = img.resize((part["width"], round(img.height * part["width"] / img.width)), Image.LANCZOS)
            parts[group][part["key"]] = save(img, f'{group}/{part["key"]}.webp')
```

`write_ts(...)` の呼び出しの引数の最後の `tips,` の前に `parts["items"],` を足し、`write_ts` の定義の引数も `house: dict, items: dict, tips: dict,` にする。

`write_ts` の中の `HOUSE_IMAGES` の定義の後ろに足す:

```python
/** 町のアイテム・おみやげ・目印の画像(docs/design/2026-09-28-town-items-design.md 7章)。キーは絵のキー。無い物はプログラムの絵で描く */
export const SPRU_ITEMS = {{
{entries(items)}
}} as const satisfies Record<string, SpruImage>;
```

`print(...)` の最後の `f"・スタンプ … ・家 {len(parts['house'])} を書き出しました"` を `f"・スタンプ {len(parts['stamps'])}・家 {len(parts['house'])}・アイテム {len(parts['items'])} を書き出しました"` にする。

- [ ] **Step 3: `crops.json` に空の組を足す**

`tools/spru-assets/crops.json` の `"house": [ … ]` の後ろに `,` を付けて足す:

```json
  "items": []
```

- [ ] **Step 4: 道具を流して、書き出しを確かめる**

Run: `python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets && git status --short frontend/public/spru frontend/src/components/spru/spru-assets.ts`
Expected: 最後の行に「・アイテム 0 を書き出しました」。`git status` は `spru-assets.ts` だけが変わっている（`SPRU_ITEMS = {` が足される）。もし `frontend/public/spru` の画像も変わっていたら、画像の書き出しが同じにならない環境なので `git checkout -- frontend/public/spru` で元に戻し、ledgerに記録する

- [ ] **Step 5: 合成した試しのシートで、アイテムの切り抜きを確かめる（コミットしない）**

一時的に試しのシートを作り、`crops.json` に一時的な1点を書いて流す:

```bash
python3 - <<'EOF'
from PIL import Image, ImageDraw
img = Image.new("RGB", (1536, 1024), "white")
d = ImageDraw.Draw(img)
d.ellipse((150, 150, 350, 330), fill="#6fbf5a", outline="#5a3a22", width=8)   # 木の葉
d.rectangle((230, 320, 270, 420), fill="#9b6a45", outline="#5a3a22", width=6)  # 木の幹
d.ellipse((600, 300, 640, 340), fill="#f48aa4", outline="#5a3a22", width=4)    # 離れた部品(花)
d.ellipse((700, 300, 740, 340), fill="#ffd35c", outline="#5a3a22", width=4)
img.save("../../company/spra/mascot/assets/items-00.png")
EOF
cp tools/spru-assets/crops.json /private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/crops.backup.json
python3 - <<'EOF'
import json
p = "tools/spru-assets/crops.json"
spec = json.load(open(p, encoding="utf-8"))
spec["sources"]["items00"] = "items-00.png"
spec["items"] = [
    {"key": "test_tree", "source": "items00", "box": [130, 130, 370, 440], "background": "flood", "width": 256},
    {"key": "test_flowers", "source": "items00", "box": [580, 280, 760, 360], "background": "flood", "width": 256},
]
json.dump(spec, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
EOF
python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets
python3 - <<'EOF'
from PIL import Image
for key in ("test_tree", "test_flowers"):
    im = Image.open(f"frontend/public/spru/items/{key}.webp")
    print(key, im.size, "corner alpha:", im.getpixel((0, 0))[3])
EOF
grep -n "test_tree\|test_flowers" frontend/src/components/spru/spru-assets.ts
```

Expected: `test_tree (256, …) corner alpha: 0`、`test_flowers (256, …) corner alpha: 0`（2つの花が両方残るので横長）。`spru-assets.ts` の `SPRU_ITEMS` に2行出る。

確かめたら元に戻す:

```bash
cp /private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/crops.backup.json tools/spru-assets/crops.json
rm -f ../../company/spra/mascot/assets/items-00.png
rm -rf frontend/public/spru/items
python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets
git status --short tools frontend/public/spru frontend/src/components/spru ../../company/spra/mascot/assets
```

Expected: 変わっているのは `extract.py`・`crops.json`・`spru-assets.ts` だけ（`SPRU_ITEMS` は空）

- [ ] **Step 6: 型とlint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: エラーなし

- [ ] **Step 7: コミット**

```bash
git add tools/spru-assets/extract.py tools/spru-assets/crops.json frontend/src/components/spru/spru-assets.ts
git commit -m "#00218: feat:切り抜きの道具に町のアイテム・おみやげ・目印の組を足し、画像の一覧SPRU_ITEMSを書き出す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 画像を表示する仕組み

**Files:**
- Create: `frontend/src/components/world/item-image.ts`
- Test: `frontend/src/components/world/item-image.test.ts`
- Create: `frontend/src/components/world/item-image-fit.ts`
- Create: `frontend/src/components/world/item-image-art.tsx`
- Modify: `frontend/src/components/world/item-art.tsx:276-297`（`ItemArt`・`ItemIcon`）
- Modify: `frontend/src/components/world/landmark-art.tsx:97-99`（`LandmarkArt`）

**Interfaces:**
- Consumes: Task 4 の `SPRU_ITEMS`・`SpruImage`（`@/components/spru/spru-assets`）、`HALF_W`（`./iso`、32）、`isBigAsset`（`./art-keys`）
- Produces:
  - `type ImagePlacement = { x: number; y: number; width: number; height: number }`
  - `imagePlacement(image: { width: number; height: number }, footprint: number, fit?: ItemImageFit): ImagePlacement`
  - `itemImage(key: string | null, images?: Record<string, SpruImage | undefined>): SpruImage | null`
  - `iconViewBox(p: ImagePlacement, pad?: number): string`
  - `type ItemImageFit = { scale?: number; dx?: number; dy?: number }`、`ITEM_IMAGE_FIT`、`LANDMARK_LIGHTS`
  - `ImageArt({ image, footprint, fit })`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/world/item-image.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { iconViewBox, imagePlacement, itemImage } from "./item-image";

const square = { width: 256, height: 256 };
const tall = { width: 256, height: 512 };

describe("画像の置き場所", () => {
  it("1マスは幅57.6、画像の下の真ん中が原点から8だけ手前", () => {
    const p = imagePlacement(square, 1);
    expect(p.width).toBeCloseTo(57.6);
    expect(p.height).toBeCloseTo(57.6);
    expect(p.x).toBeCloseTo(-28.8);
    expect(p.y + p.height).toBeCloseTo(8);
  });

  it("2×2は幅115.2、下は16だけ手前。高さは縦横の比から", () => {
    const p = imagePlacement(tall, 2);
    expect(p.width).toBeCloseTo(115.2);
    expect(p.height).toBeCloseTo(230.4);
    expect(p.y + p.height).toBeCloseTo(16);
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
    const p = imagePlacement(tall, 2);
    const [x, y, w, h] = iconViewBox(p).split(" ").map(Number);
    expect(w).toBeCloseTo(238.4);
    expect(h).toBeCloseTo(238.4);
    expect(x).toBeLessThanOrEqual(p.x);
    expect(y).toBeLessThanOrEqual(p.y);
    expect(x + w).toBeGreaterThanOrEqual(p.x + p.width);
    expect(y + h).toBeGreaterThanOrEqual(p.y + p.height);
  });
});
```

- [ ] **Step 2: テストを流して失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/world/item-image.test.ts`
Expected: FAIL（`./item-image` が見つからない）

- [ ] **Step 3: 調整値の設定を作る**

`frontend/src/components/world/item-image-fit.ts`:

```ts
/** 画像のアイテム・目印の物ごとの調整(設計書 2026-09-28-town-items 7-2)。scale は大きさの倍率、dx・dy はずらす量(SVGの単位)。必要な物だけ書く */
export type ItemImageFit = { scale?: number; dx?: number; dy?: number };

export const ITEM_IMAGE_FIT: Partial<Record<string, ItemImageFit>> = {};

/** 画像の目印の、夜の明かりの光の輪(設計書7-3。原点=マスの中心)。画像を取り込んだら位置を測って書く */
export const LANDMARK_LIGHTS: Partial<Record<string, { cx: number; cy: number; r: number }[]>> = {};
```

- [ ] **Step 4: 置き場所の計算を作る**

`frontend/src/components/world/item-image.ts`:

```ts
import { SPRU_ITEMS, type SpruImage } from "@/components/spru/spru-assets";

import { HALF_W } from "./iso";
import type { ItemImageFit } from "./item-image-fit";

/** 画像の置き場所(SVGの単位。原点=マスの中心、2×2は4マスの真ん中) */
export type ImagePlacement = { x: number; y: number; width: number; height: number };

// 設計書 2026-09-28-town-items 7-2: 幅は 足元のマスの数×64×0.9、画像の下の真ん中を原点から 足元のマスの数×8 だけ手前に置く
const FILL = 0.9;
const DROP = 8;

export function imagePlacement(
  image: { width: number; height: number },
  footprint: number,
  fit: ItemImageFit = {},
): ImagePlacement {
  const width = footprint * HALF_W * 2 * FILL * (fit.scale ?? 1);
  const height = (width * image.height) / image.width;
  const bottom = footprint * DROP + (fit.dy ?? 0);
  return { x: -width / 2 + (fit.dx ?? 0), y: bottom - height, width, height };
}

/** その絵の画像。まだ無ければ null(プログラムの絵で描く) */
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
```

- [ ] **Step 5: テストを流して通ることを確かめる**

Run: `cd frontend && npx vitest run src/components/world/item-image.test.ts`
Expected: PASS（5件）

- [ ] **Step 6: 画像の物の絵を作る**

`frontend/src/components/world/item-image-art.tsx`:

```tsx
import type { SpruImage } from "@/components/spru/spru-assets";

import { imagePlacement } from "./item-image";
import type { ItemImageFit } from "./item-image-fit";

/** 画像の物(設計書 2026-09-28-town-items 7章)。影はプログラムで同じ形を付ける */
export function ImageArt({ image, footprint, fit }: { image: SpruImage; footprint: number; fit?: ItemImageFit }) {
  const p = imagePlacement(image, footprint, fit);
  return (
    <g>
      <ellipse cx={0} cy={2} rx={20 * footprint} ry={8 * footprint} fill="#2f5d2a" opacity={0.15} />
      <image href={image.src} x={p.x} y={p.y} width={p.width} height={p.height} />
    </g>
  );
}
```

- [ ] **Step 7: `ItemArt`・`ItemIcon` を画像に対応させる**

`frontend/src/components/world/item-art.tsx` の import に足す:

```tsx
import { iconViewBox, imagePlacement, itemImage } from "./item-image";
import { ImageArt } from "./item-image-art";
import { ITEM_IMAGE_FIT } from "./item-image-fit";
```

先頭のコメント「原点(0,0)がマスの中心(地面に接する点)。Blender製の画像に差し替えるときはこのファイルだけ直す」を「原点(0,0)がマスの中心(地面に接する点)。SPRU_ITEMS に画像がある絵は画像で描き(item-image-art.tsx)、ここの絵は画像が届くまでの代わり」に変える。

`ItemArt`・`ItemIcon` を次に置き換える:

```tsx
export function ItemArt({ assetKey }: { assetKey: string | null }) {
  const image = itemImage(assetKey);
  if (image && assetKey) {
    return <ImageArt image={image} footprint={isBigAsset(assetKey) ? 2 : 1} fit={ITEM_IMAGE_FIT[assetKey]} />;
  }
  return <>{(assetKey && (ART as Record<string, ReactNode>)[assetKey]) ?? FALLBACK}</>;
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
  // 画像の物は画像の範囲に合わせる。プログラムの絵は、2×2の建物は4マスぶん横に広く、タワーは高いので、広い範囲で描く
  const viewBox =
    image && assetKey
      ? iconViewBox(imagePlacement(image, isBigAsset(assetKey) ? 2 : 1, ITEM_IMAGE_FIT[assetKey]))
      : isBigAsset(assetKey)
        ? "-70 -150 140 180"
        : "-34 -62 68 72";
  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
```

- [ ] **Step 8: `LandmarkArt` を画像に対応させる**

`frontend/src/components/world/landmark-art.tsx` の import に足す:

```tsx
import { itemImage } from "./item-image";
import { ImageArt } from "./item-image-art";
import { ITEM_IMAGE_FIT, LANDMARK_LIGHTS } from "./item-image-fit";
```

`LandmarkArt` を次に置き換える:

```tsx
export function LandmarkArt({ landmarkKey, lit = false }: { landmarkKey: string; lit?: boolean }) {
  const image = itemImage(landmarkKey);
  if (image) {
    return (
      <>
        <ImageArt image={image} footprint={1} fit={ITEM_IMAGE_FIT[landmarkKey]} />
        {lit &&
          LANDMARK_LIGHTS[landmarkKey]?.map((light, index) => (
            <circle key={index} cx={light.cx} cy={light.cy} r={light.r} fill="#ffd98a" opacity={0.5} />
          ))}
      </>
    );
  }
  return <>{ART[landmarkKey]?.(lit) ?? null}</>;
}
```

- [ ] **Step 9: 全体のテスト・型・lint**

Run: `cd frontend && npm test 2>&1 | tail -4 && npm run typecheck && npm run lint`
Expected: `Tests 247 passed (247)`（242＋5）、型とlintのエラーなし。`landmark-art.tsx` と `item-art.tsx` の import が循環していないこと（`item-image-art.tsx` はどちらも読まない）

- [ ] **Step 10: コミット**

```bash
git add frontend/src/components/world/item-image.ts frontend/src/components/world/item-image.test.ts frontend/src/components/world/item-image-fit.ts frontend/src/components/world/item-image-art.tsx frontend/src/components/world/item-art.tsx frontend/src/components/world/landmark-art.tsx
git commit -m "#00219: feat:町のアイテム・目印を、画像があれば画像で描き、大きさと足元の位置を決める仕組みを足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ブラウザでの確認とドキュメント

**Files:**
- Modify: `SPEC.md`（4-5 ショップ・4-9 町・6章のテスト数）
- Modify: `TASKS.md`（開発部門にタスクを足す）
- Modify: `../../company/spra/mascot/CLAUDE.md`（追記のみ）

**Interfaces:**
- Consumes: Task 1〜5 のすべて

- [ ] **Step 1: ショップとバッグのタブをブラウザで確かめる**

開発用サーバー（`http://localhost:3000`、動いているものを使う）に `test@example.com` / `password` でログインし、町テストで確かめる。幅390pxと1280px:

- `/shop`: 町のアイテムの段にタブ（しぜん・かざり・いえ・お店・名所・のりもの）が出て、押すと中身が切り替わる。「名所」「お店」にふりがなが出る。べんりアイテムの段は下に今のまま。町テストはLv1なのでNEWは出ない
- `/bag`: 「すべて」が最初。持っている物のカテゴリだけタブが出る
- Tabキーでタブに移り、Enterで切り替わる
- 横にはみ出さない（幅320pxでも、タブは横にスクロールできる）

スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ置き、見たら消す。

- [ ] **Step 2: 画像を表示する仕組みをブラウザで確かめる（一時的な登録。コミットしない）**

`frontend/src/components/spru/spru-assets.ts` の `SPRU_ITEMS` に、今ある画像を一時的に1行足す（木とスプルの家の目印に、入口のスプルの家の画像を使う）:

```ts
  "tree": { src: "/spru/house/home.webp", width: 602, height: 602 },
  "spru_house": { src: "/spru/house/home.webp", width: 602, height: 602 },
```

（`width`・`height` は `HOUSE_IMAGES.home` の値に合わせる）

- 町: 木を置いてある場所・スプルの家の場所に画像が出て、影が付き、足元がマスに合っている。夜の時間帯の暗さは、`world-scene.tsx` の `artStyle` がかかっていることをコードで確かめる
- `/shop` の「しぜん」の木・`/bag` の木の小さな絵に画像が出る

確かめたら元に戻し、`git diff --stat frontend/src/components/spru/spru-assets.ts` が空であることを確かめる。

- [ ] **Step 3: 開発用のデータを確かめる**

Run:
```bash
./vendor/bin/sail artisan tinker --execute="echo json_encode(App\Models\UserProfile::find(7)->only(['current_streak','best_streak','last_played_date','xp','coins','hp','points','avatar'])).PHP_EOL; echo json_encode(App\Models\ProfileErrand::where('user_profile_id',7)->pluck('id')).PHP_EOL;"
```
Expected: 確認の前と同じ値（確認を始める前に同じコマンドで控えておく）

- [ ] **Step 4: SPEC.md を直す**

`SPEC.md` 4-5 ショップの `decoration` の項目の後ろに1行足す:

```markdown
- ✅（2026-09-28）町のアイテムを6つのカテゴリ（しぜん・かざり・いえ・お店・名所・のりもの・おみやげ）に分けた。カテゴリは絵のキーで決まる（`config/world.php` の `asset_categories`、おみやげはキーによらず「おみやげ」）。ショップの町のアイテムの段と、バッグにタブを付けた（ショップは「すべて」なし、バッグは「すべて」が最初）。レベルが上がって買えるようになった物に「NEW」を付ける。管理画面の絵の選択肢にカテゴリを添える（`docs/design/2026-09-28-town-items-design.md`）
```

4-9 町の項目の最後に1行足す:

```markdown
- ✅（2026-09-28）町のアイテム・おみやげ・目印を、画像生成で作った画像で描けるようにした（スプルの絵に合わせたタッチ。決まりと英語のプロンプトは `docs/design/2026-09-28-town-items-design.md` 4〜6章）。画像は `tools/spru-assets/extract.py` が `public/spru/items/` に切り抜き、`SPRU_ITEMS` にある物は画像、ない物は今のプログラムの絵で描く。1回目は48点（描き直し32点＋新しく16点）をOwnerに依頼中
```

6章のテスト数を「2026-09-28時点で361件」「2026-09-28時点で247件」に直す（Task 1・5のあとの件数。違っていたら実際の件数にする）。

- [ ] **Step 5: TASKS.md を直す**

開発部門の「国の進め方をチケットで好きな国へ行く形にする」の行の後ろに足す:

```markdown
- [ ] **町のアイテムのカテゴリ分けと画像への差し替え**（2026-09-28 Owner承認。設計書 `docs/design/2026-09-28-town-items-design.md`、段階1の実装計画 `docs/design/2026-09-28-town-items-plan.md`）
  - [x] 段階1: カテゴリ（ショップ・バッグのタブ、NEW、管理画面）と、画像を表示する仕組み（切り抜きの `items` の組・`SPRU_ITEMS`・置き方の計算）
  - [ ] 段階2: アイテム画像の試しの1枚（シート3: スプルの家・鳥居・木・ちょうちん・自動販売機・小さな家）が届いたら、町に置いて確かめ、調整値と決まりを直す
  - [ ] 段階3: 残りの8枚が届いたら全部を取り込み、新しい16点（設計書5-2）を設定と品ぞろえに足す。光の位置を測り直し、差し替えたプログラムの絵を消す
  - アイテム画像の依頼（Ownerが追加の画像のあとに用意）: シート9枚・48点。プロンプトは設計書6章、シートは `company/spra/mascot/assets/items-01.png`〜`items-09.png`
```

- [ ] **Step 6: company/spra/mascot/CLAUDE.md に追記する**

`../../company/spra/mascot/CLAUDE.md` の「主要な意思決定（サマリ）」の最後の追記の後ろに足す（既存の行は変えない）:

```markdown
  - 2026-09-28追記（町のアイテムの画像）: Spra-go の町のアイテム・おみやげ・目印を、画像生成で作った画像に差し替える。タッチはスプルの絵（mascot-6）に合わせ、斜め上から見下ろす角度、正面は左下、地面と影は描かない、背景は透明か白。横長1枚に6点のシートで、`assets/items-01.png`〜`items-09.png` に置く（1回目は48点）。決まり・英語のプロンプト・一覧は `projects/Spra-go/docs/design/2026-09-28-town-items-design.md` 4〜6章。切り抜きは `tools/spru-assets/crops.json` の items の組
```

- [ ] **Step 7: 全体のテスト**

Run: `./vendor/bin/sail test | grep -o '"tool":"pest","result"[^}]*' && cd frontend && npm test 2>&1 | tail -4 && npm run typecheck && npm run lint`
Expected: サーバー `"result":"passed"`、画面 `Tests 247 passed (247)`、型とlintのエラーなし

- [ ] **Step 8: コミット**

```bash
git add SPEC.md TASKS.md
git commit -m "#00220: docs:町のアイテムのカテゴリ分けと画像を表示する仕組みをSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（`company/spra/mascot/CLAUDE.md` は Spra-go のリポジトリの外なので、このコミットには入らない。追記したことを最後の報告で伝える）
