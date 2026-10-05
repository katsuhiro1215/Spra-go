# 町のアイテム追加（Spra-worldの確定画像から25点）— 設計書

- 作成日: 2026-10-05
- ステータス: 案（Ownerの承認待ち。「第1段階＝町のアイテムの追加」はOwner承認済み。品ぞろえ・レベル・値段は承認待ち）
- 前提: 町のアイテムの仕組み（`docs/design/2026-09-28-town-items-design.md`。カテゴリ・画像の取り込み・置き場所・夜の明かり）、`config/world.php`、`WorldItemSeeder`、`tools/spru-assets/`
- 素材: `company/spra/spra-world/assets/approved/`（Spra-worldで確定した画像。1254×1254・透明背景のPNG）
- 対応するタスク: `TASKS.md`「Spra-worldの画像の活用（第1段階）」（この設計で足す）

## 1. 背景と目的

Spra-worldで、1点ずつ精巧な画像が確定している。タッチは今の町のアイテム（つやのある立体）と同じなので、そのまま町に並べられる。まず、町に置く物（建物・木・水・飾り）を、今のアイテムに足す。品ぞろえが増え、ショップに「次に欲しい物」が増える。

**うまくいった目安**

1. ショップに新しい25点が出て、買って町に置ける（今の38点は変わらない）
2. 町に置いたとき、今のアイテムと並べても、大きさと質感に違和感がない
3. 夜になると、街灯が光る
4. 画像を足しても、アプリの重さがほとんど変わらない（追加は合計1.5MB以内）

## 2. 決めたこと（案）

| 項目 | 内容 |
|---|---|
| 追加する数 | 25点（4章）。今の38点は残す |
| 使わない素材 | 畑・パン・作物・小麦粉（第2段階）、スプルの家の中・家具・キャラのポーズ（第3段階）、`bakery_01`（今の「パン屋」と同じ物）、`spru_house_01`（町の目印として今すでにある）、`village_wooden_bench_01`（今の「ベンチ」と同じ物） |
| 新しい仕組み | 作らない。絵のキー・カテゴリ・大きさを足すだけ（設定3か所とテスト） |
| 絵の作り方 | 既存の `tools/spru-assets/extract.py` と `crops.json` に足す（元の絵は素材の置き場所から直接読む） |
| 大きさ | 1マスの物は幅256px前後、2×2の物は幅512px前後（元の絵に同じ倍率をかけて、物どうしの大きさの比を保つ） |
| レベルと値段 | Lv.1〜14に散らす。建物だけをLv.8以上にはしない（序盤にも家は欲しいため）。最も高い物は名所（モール、700ポイント）で、今の最高Lv.15・900ポイントより下 |
| 画像の形式 | WebP。1枚30〜80KB |

## 3. 絵のキーの決まり

- 絵のキーは英語の小文字と `_`。今のキー（`bakery`・`cottage`・`tree` など）とは重ならない
- カテゴリは `config/world.php` の `asset_categories` で決める（今の6つ。新しいカテゴリは作らない）
- 大きさは `asset_footprints`（2×2の物だけ書く。書いていない物は1マス）

## 4. 追加する25点

元の画像の名前は `approved/` の下のファイル名（末尾の `_01.png` は省く）。価格の単位は学習ポイント。

### 4-1. しぜん（8点、`nature`）

| 絵のキー | 名前 | 元の画像 | 大きさ | Lv | 値段 |
|---|---|---|---|---|---|
| `young_tree` | 若い木 | nature/village_young_tree | 1 | 1 | 15 |
| `pathside_flowers` | 道ばたの花 | decoration/pathside_flowers | 1 | 1 | 15 |
| `pathside_stone` | 道ばたの石 | decoration/pathside_stone | 1 | 2 | 15 |
| `stream` | 小川 | water/narrow_stream_straight | 1 | 3 | 40 |
| `vegetable_bed` | 菜園 | garden/community_garden_bed | 1 | 3 | 35 |
| `broadleaf_tree` | 広葉樹 | nature/village_broadleaf_tree | 1 | 4 | 60 |
| `spring` | わき水の泉 | water/small_spring_source | 1 | 5 | 60 |
| `large_tree` | 大きな木 | nature/village_large_tree | 2×2 | 8 | 150 |

### 4-2. かざり・名所（3点）

| 絵のキー | 名前 | カテゴリ | 元の画像 | 大きさ | Lv | 値段 |
|---|---|---|---|---|---|---|
| `leaf_lamp` | はっぱの街灯 | `decor` | decoration/leaf_village_lamp | 1 | 4 | 45 |
| `wooden_bridge` | 木の橋 | `decor` | structure/small_wooden_bridge | 1 | 5 | 70 |
| `woodland_torii` | 鳥居 | `landmark` | structure/woodland_torii | 1 | 6 | 90 |

### 4-3. いえ・お店（9点、`house`）

| 絵のキー | 名前 | 元の画像 | 大きさ | Lv | 値段 |
|---|---|---|---|---|---|
| `seed_storehouse` | 種の倉庫 | building/small_seed_supply_storehouse | 1 | 3 | 120 |
| `resident_cottage` | 村人の家 | building/village_resident_cottage | 1 | 4 | 140 |
| `leaf_cottage` | 葉の屋根の家 | building/spru_village_leaf_roof_cottage | 1 | 5 | 160 |
| `blue_flower_cottage` | 青い花の家 | building/spru_village_blue_flower_cottage | 1 | 6 | 170 |
| `forest_flower_house` | 森の花の家 | building/spru_village_forest_flower_house | 1 | 7 | 180 |
| `greengrocer` | 八百屋 | building/greengrocer_shop | 2×2 | 7 | 260 |
| `fish_shop` | 魚屋 | building/fish_shop | 2×2 | 8 | 270 |
| `meat_shop` | 肉屋 | building/meat_shop | 2×2 | 8 | 280 |
| `produce_shop` | 野菜のお店 | building/spru_village_produce_shop | 2×2 | 9 | 300 |

### 4-4. 名所（5点、`landmark`）

| 絵のキー | 名前 | 元の画像 | 大きさ | Lv | 値段 |
|---|---|---|---|---|---|
| `chief_hall` | 村長の家 | building/spru_village_chief_hall | 2×2 | 10 | 380 |
| `stone_tower_hall` | 石の塔の家 | building/spru_village_stone_tower_hall | 2×2 | 11 | 420 |
| `windmill_garden` | 風車と水の庭 | building/spru_village_windmill_water_garden | 2×2 | 12 | 450 |
| `spru_mall` | スプルモール | building/spru_mall | 2×2 | 13 | 650 |
| `saku_mall` | サクモール | building/saku_mall | 2×2 | 14 | 700 |

## 5. 作り方

### 5-1. 画像（`tools/spru-assets/`）

- `crops.json` の `sources` に、25枚の元の画像を足す（置き場所は `extract.py` に渡す素材集のフォルダ `company/spra/mascot/assets` からの相対。`../../spra-world/assets/approved/...`）
- `items` に、1点ずつ `{ "key": ..., "source": ..., "box": [0, 0, 1254, 1254], "width": N }` を足す。余白は `extract.py` が詰める（`mode` の既定は `all`）
- `width`: 元の絵の「中身の幅」に倍率をかけた値。1マスの物は倍率0.22、2×2の物は倍率0.43（4章の「大きな建物」は元の絵が約1200pxなので、約520px）。細い物（街灯・若い木）は、同じ倍率なので細く出る
  - 元の絵の中身の幅は、`approved/*/manifest.json` の `contentWidth`
- 出力: `frontend/public/spru/items/{key}.webp` と、画面側の一覧 `SPRU_ITEMS`（`extract.py` が書き出す。手で直さない）

### 5-2. 画面側（`frontend/src/components/world/`）

- `art-keys.ts`: `ITEM_ART_KEYS`・`ITEM_ART_LABELS`・`ITEM_ART_CATEGORIES`・`BIG_ASSETS` に足す
- `item-image-fit.ts`: 町に置いて、大きさや位置がずれる物だけ `ITEM_IMAGE_FIT` に調整値を足す。夜の明かり `IMAGE_LIGHTS` に、はっぱの街灯の光の輪を足す

### 5-3. サーバー

- `config/world.php`: `asset_keys`・`asset_categories`・`asset_footprints` に足す（`art-keys.ts` と必ず一致させる。今のテストが確かめる）
- `WorldItemSeeder`: 25行を足す（何度実行しても重複しない今の書き方のまま）
- 既存のユーザーのデータは変えない。新しい物が、ショップに並ぶだけ

## 6. テスト

- **サーバー（Pest）**: 既存の確かめ（全キーにカテゴリがある、2×2の一覧が画面側と同じ）で足りる。足すのは、「シーダーの全アイテムのキーが `asset_keys` にある」「シーダーを2回実行しても重複しない」の確かめ（既存になければ）
- **画面（Vitest）**: 既存の確かめ（キーの一致、全キーの画像がある、ラベルとカテゴリが全キーにある）が、足した25点に効くことを確かめる。街灯の光の輪は `lightCircles` の確かめに足す
- **ブラウザ**: ショップのタブ（しぜん・かざり・いえ・名所）に新しい物が並ぶ、買う→バッグ→町に置く（1マス・2×2）、夜に街灯が光る、スマホ幅で重ならない、レベルの鍵の表示。確かめたあと、開発用のデータを元に戻す

## 7. やらないこと

- 畑・パン・作物・小麦粉（第2段階）、スプルの家の中・家具・キャラのポーズ（第3段階）
- 今ある39点の絵を、確定画像に差し替えること（今の「パン屋」「ベンチ」など。あとで、Ownerと決める）
- 建物ごとの機能（お店で買える、など）。見た目の置き物として、今のアイテムと同じ扱い
- 川をつなぐ、橋を川にかけるなどの、置き方の仕組み

## 8. ドキュメントの更新

- `SPEC.md`: 町のアイテムの品ぞろえ（38→63）
- `TASKS.md`: 「Spra-worldの画像の活用」第1段階を完了にして、第2・3段階を残す
