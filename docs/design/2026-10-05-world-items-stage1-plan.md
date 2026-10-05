# 町のアイテム追加（25点）— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。手順は `- [ ]` で追う。

**Goal:** Spra-worldの確定画像から25点を、町のアイテムとしてショップに足す。

**Architecture:** 新しい仕組みは作らない。画像は `extract.py`＋`crops.json` で WebP にし、絵のキー・カテゴリ・大きさを設定3か所に足し、`WorldItemSeeder` に25行を足す。

**Tech Stack:** Python（Pillow）、Next.js/TypeScript（Vitest）、Laravel（Pest）

**Spec:** `docs/design/2026-10-05-world-items-stage1-design.md`

ブランチ: `feature/world-items-stage1`。コミット番号は、設計書 #00361、この計画 #00362、実装は #00363 から。コミットの形式は `#NNNNN: type:要約`＋Co-Authored-By。

## Global Constraints

- 今の39点（キー・名前・値段・レベル）は変えない。ユーザーのデータは変えない
- `config/world.php` の `asset_keys`・`asset_categories`・`asset_footprints` と、`art-keys.ts` の `ITEM_ART_KEYS`・`ITEM_ART_CATEGORIES`・`BIG_ASSETS` は必ず一致させる（今のテストが確かめる）
- `SPRU_ITEMS`（`spru-assets.ts`）は手で直さない。`extract.py` が書き出す
- 追加の画像は合計1.5MB以内、1枚30〜80KB目安
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
- 開発用データベース: プロフィール7を元の状態に戻す（ショップに足した25点は残してよい。`migrate:fresh` は使わない）

## Review Focus

- 2×2の建物が、7×7の町の端やほかのアイテムと重なる置き方でも、今のとおり拒否される（`asset_footprints` に足し忘れると1マスになる）
- 25点すべてに画像がある（1つでも欠けると、プレゼント箱の絵になる）
- 細長い絵（街灯・若い木）と横長の絵（小川・橋）が、ショップとバッグの小さな絵で切れない
- シーダーを2回実行しても、25点が重複しない

## 25点の表（以降のタスクで共通）

`key | 名前 | 元の画像（approved/） | カテゴリ | 大きさ | Lv | 値段`

```
young_tree | 若い木 | nature/village_young_tree_01 | nature | 1 | 1 | 15
pathside_flowers | 道ばたの花 | decoration/pathside_flowers_01 | nature | 1 | 1 | 15
pathside_stone | 道ばたの石 | decoration/pathside_stone_01 | nature | 1 | 2 | 15
stream | 小川 | water/narrow_stream_straight_01 | nature | 1 | 3 | 40
vegetable_bed | 菜園 | garden/community_garden_bed_01 | nature | 1 | 3 | 35
broadleaf_tree | 広葉樹 | nature/village_broadleaf_tree_01 | nature | 1 | 4 | 60
spring | わき水の泉 | water/small_spring_source_01 | nature | 1 | 5 | 60
large_tree | 大きな木 | nature/village_large_tree_01 | nature | 2 | 8 | 150
leaf_lamp | はっぱの街灯 | decoration/leaf_village_lamp_01 | decor | 1 | 4 | 45
wooden_bridge | 木の橋 | structure/small_wooden_bridge_01 | decor | 1 | 5 | 70
torii | 鳥居 | structure/woodland_torii_01 | landmark | 1 | 6 | 90
seed_storehouse | 種の倉庫 | building/small_seed_supply_storehouse_01 | house | 1 | 3 | 120
resident_cottage | 村人の家 | building/village_resident_cottage_01 | house | 1 | 4 | 140
leaf_cottage | 葉の屋根の家 | building/spru_village_leaf_roof_cottage_01 | house | 1 | 5 | 160
blue_flower_cottage | 青い花の家 | building/spru_village_blue_flower_cottage_01 | house | 1 | 6 | 170
forest_flower_house | 森の花の家 | building/spru_village_forest_flower_house_01 | house | 1 | 7 | 180
greengrocer | 八百屋 | building/greengrocer_shop_01 | house | 2 | 7 | 260
fish_shop | 魚屋 | building/fish_shop_01 | house | 2 | 8 | 270
meat_shop | 肉屋 | building/meat_shop_01 | house | 2 | 8 | 280
produce_shop | 野菜のお店 | building/spru_village_produce_shop_01 | house | 2 | 9 | 300
chief_hall | 村長の家 | building/spru_village_chief_hall_01 | landmark | 2 | 10 | 380
stone_tower_hall | 石の塔の家 | building/spru_village_stone_tower_hall_01 | landmark | 2 | 11 | 420
windmill_garden | 風車と水の庭 | building/spru_village_windmill_water_garden_01 | landmark | 2 | 12 | 450
spru_mall | スプルモール | building/spru_mall_01 | landmark | 2 | 13 | 650
saku_mall | サクモール | building/saku_mall_01 | landmark | 2 | 14 | 700
```

## Task 1: ブランチと設計書・計画のコミット

- [ ] ブランチ `feature/world-items-stage1` を作る。設計書を #00361、この計画を #00362 でコミットする

## Task 2: 画面側のキーを足す（先にテストが落ちる）

**Files:** `frontend/src/components/world/art-keys.ts`

- [ ] `ITEM_ART_KEYS`・`ITEM_ART_LABELS`・`ITEM_ART_CATEGORIES` に、表の25点を足す（コメント: `// Spra-worldの確定画像(docs/design/2026-10-05-world-items-stage1-design.md)`）。`BIG_ASSETS` に、大きさ2の10点（`large_tree`・`greengrocer`・`fish_shop`・`meat_shop`・`produce_shop`・`chief_hall`・`stone_tower_hall`・`windmill_garden`・`spru_mall`・`saku_mall` の10点）を足す
- [ ] `cd frontend && npx vitest run src/components/world` を実行。**Expected:** `item-image.test.ts`「全キーの画像がある」が、25点のキーを挙げて失敗する（RED）。`art-keys.test.ts` は、`config/world.php` を読んで一致を確かめている場合、ここで落ちる（Task 4で直す）
- [ ] コミット `#00363: feat:町のアイテム25点の絵のキー・名前・カテゴリ・大きさを画面側に足す(画像とサーバーはこのあと)`（テストが落ちた状態のコミットになる。ブランチ内のみ）

## Task 3: 画像を作る

**Files:** `tools/spru-assets/crops.json`、`frontend/public/spru/items/*.webp`（25枚）、`frontend/src/components/spru/spru-assets.ts`（`extract.py` が書き出す）

- [ ] 表から `crops.json` に足す一回限りのスクリプトを、作業用の場所（scratchpad）に書く。各行について:
  - `sources`: `"world_{key}": "../../spra-world/assets/approved/{元の画像}.png"`
  - `items`: `{ "key": key, "source": "world_{key}", "box": [0, 0, 1254, 1254], "width": W }`
  - `W` = 元のPNGの透明でない範囲（アルファ>24）の幅 × 倍率（大きさ1は0.22、2は0.43）を整数にした値
  - すでにキーがある場合は上書き（何度実行しても同じ）
- [ ] 実行: `python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets`（リポジトリ直下から）。**Expected:** 終わりの行の「アイテム」の数が、今の52から77に増える。ほかの画像の差分が出ない（`git status` で、追加の25枚と `spru-assets.ts`・`crops.json` だけが変わる）
- [ ] `ls -l frontend/public/spru/items/` で、追加分の合計が1.5MB以内、1枚あたり80KB以内か確かめる。超えるものは、`width` を小さくして作り直す
- [ ] `cd frontend && npx vitest run src/components/world` **Expected:** `item-image.test.ts` が通る（GREEN）
- [ ] コミット `#00364: feat:町のアイテム25点の画像(WebP)を、Spra-worldの確定画像から作る`

## Task 4: サーバー（設定とシーダー）

**Files:** `config/world.php`、`database/seeders/WorldItemSeeder.php`、`tests/Feature/WorldCategoryTest.php`（または近いテスト）

- [ ] 先にテストを足す（RED）。`tests/Feature/WorldShopTest.php` に:
  - 「シーダーの全アイテムの絵のキーが `asset_keys` にある」
  - 「`WorldItemSeeder` を2回実行しても、`decoration` の数が変わらない」
  - 「新しい25点のうち、2×2の10点が `asset_footprints` で2、1マスの15点は書いていない」
  - 実行 `./vendor/bin/sail test --filter=WorldShopTest` **Expected:** 失敗する
- [ ] `config/world.php`: `asset_keys` に25点のキー、`asset_categories` に表のカテゴリ、`asset_footprints` に2×2の10点を足す
- [ ] `WorldItemSeeder`: 表の25行を足す（`['name' => ..., 'price' => ..., 'min_level' => ..., 'asset_key' => ...]`。コメント: `// Spra-worldの確定画像(docs/design/2026-10-05-world-items-stage1-design.md)`）
- [ ] 実行 `./vendor/bin/sail test --filter="WorldShopTest|WorldCategoryTest|WorldApiTest|WorldPlacementTest|WorldBuildingTest"` **Expected:** 通る
- [ ] 画面側の `art-keys.test.ts` も通る: `cd frontend && npx vitest run src/components/world`
- [ ] コミット `#00365: feat:町のアイテム25点の設定(絵のキー・カテゴリ・2×2)とシーダーを足す`

## Task 5: 夜の明かり

**Files:** `frontend/src/components/world/item-image-fit.ts`、`frontend/src/components/world/item-image.test.ts`

- [ ] `leaf_lamp.webp` を開いて、ランタン（光る部分）の位置を、画像の左上からの割合で読む
- [ ] `item-image.test.ts` に「はっぱの街灯の光の輪が、画像の中に1つある（`lightCircles('leaf_lamp', 1)`）」を足す（RED）→ `IMAGE_LIGHTS` に `leaf_lamp: [{ x, y, r: 7 }]` を足す（GREEN）
- [ ] コミット `#00366: feat:はっぱの街灯に夜の光の輪を足す`

## Task 6: ブラウザで確かめて、大きさを直す

- [ ] 開発用データベースに `WorldItemSeeder` を流す（`./vendor/bin/sail artisan db:seed --class=WorldItemSeeder`）。プロフィール7のレベルを上げて（確かめる間だけ）、ショップの4つのタブに25点が並ぶこと、買う→バッグ→町に置く（1マスと2×2）、夜（時間帯の切り替え）に街灯が光ること、スマホ幅（375px）で小さな絵が切れないことを確かめる。スクリーンショットは `.playwright-mcp/` の下だけ。ログインは `test@example.com`
- [ ] 今のアイテムと並べて、大きすぎる・小さすぎる・ずれる物があれば、`ITEM_IMAGE_FIT` に `scale`・`dx`・`dy` を足す（必要な物だけ）。町での大きさは、同じ種類の今のアイテム（家なら「小さな家」「赤い屋根の家」、2×2なら「パン屋」）と並べて決める
- [ ] 確かめが終わったら、プロフィール7を元の状態に戻す（xp 20、coins 60、hp 20、points 95、level 1、`profile_world_items` 4、`profile_ledger` 最大668 など。Ownerのプロフィール（id 2）は触らない）。スクリーンショットと、その日の `page-*.yml`・`console-*.log` を消す
- [ ] 直しがあればコミット `#00367: fix:町のアイテム25点の大きさ・位置を、今のアイテムと並べて調整する`

## Task 7: ドキュメントと全体の確認

- [ ] `SPEC.md`（町のアイテムの品ぞろえ39→64）、`TASKS.md`（「Spra-worldの画像の活用」第1段階を完了、第2・3段階を残す）を更新する
- [ ] 全体のテスト: `./vendor/bin/sail test`（626＋新規）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`（392＋新規）
- [ ] Review Focus の4点を、1つずつ確かめる（2×2の重なり拒否は `WorldPlacementTest` に1件足す。画像の欠け・小さな絵・シーダー2回は上のテストとTask 6で確認）
- [ ] 自分で見直す（最終見直しは自分によるもの）。コミット `#00368: docs:町のアイテム25点の追加をSPEC・TASKSに反映する`
- [ ] Ownerに報告して、マージの確認をとる（`git merge --no-ff -q -m "#00369: merge:町のアイテム25点…" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`）。プッシュはOwner
