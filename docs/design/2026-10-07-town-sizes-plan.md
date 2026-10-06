# 町の建物の大きさ — 実装計画

- 設計書: `docs/design/2026-10-07-town-sizes-design.md`（Owner合意済み: 家2×2・モール/村長の家/風車の庭＝3×3・城/五重塔は新しい絵が届いてから3×3）
- 実行はインライン（サブエージェントなし）、最後に自分で見直す。TDD。サーバーのテストは、他のテストと同時に流さない
- 今の決め打ち: `frontend/src/components/world/art-keys.ts` の `BIG_ASSETS`（2×2の一覧。`art-keys.test.ts` が `config/world.php` の `asset_footprints`（値が2のもの）と一致を確かめる）、`item-art.tsx` の `isBigAsset(...) ? 2 : 1`、`artOptionLabel` の「・2×2」

## タスク

### 1. 大きさの設定と、画面の「2」の決め打ちをなくす
- `art-keys.ts`: `BIG_ASSETS` をやめ、`ASSET_FOOTPRINTS: Partial<Record<ArtKey, number>>`（2以上の物だけ）と `assetFootprint(key)`（なければ1）にする。`isBigAsset` は `assetFootprint(key) > 1` で残す。`artOptionLabel` は「・N×N」。
- `item-art.tsx`: `footprint={assetFootprint(assetKey)}`（2か所）。
- テスト: `art-keys.test.ts` を、`config/world.php` の `asset_footprints` の全部（値が2・3）と `ASSET_FOOTPRINTS` の一致を確かめる形に直す。`assetFootprint` の値（1・2・3）、`artOptionLabel` の「・3×3」。
- `config/world.php`: `spru_mall`・`saku_mall`・`chief_hall`・`windmill_garden` を3にする（城・五重塔は触らない）。サーバーのテスト（`WorldPlacement`）: 3×3が9マスを使い、地図の外・雲・目印・重なりで断られ、収まる場所には置ける。

### 2. Spruの家を2×2にし、畑を動かす
- `config/world.php` の `landmarks`: `spru_house` に `'footprint' => 2`、`garden` を `(0, 2)` に。`WorldLand::blocked()` が、目印の `footprint`（なければ1）のマスすべてを返す。町のAPI（`toArray`）の目印に `footprint` を含める。
- `Garden`（`app/Support/Garden.php`）が畑の位置を目印から読んでいること（`firstWhere('key', 'garden')`）を確かめる。
- フロント: 家の絵の位置・タップの範囲・寝ているときの印（`SleepMark`）を、2×2の中心（`footprintCenter`）に合わせる。`WorldLand` 型に目印の `footprint`。
- テスト（サーバー）: 家の4マスが置けない（(1,1)・(2,1)・(1,2)・(2,2)）・畑が(0,2)・道が動いていない・町のAPIの目印が `footprint` を返す・畑のAPI（種まき・水やり）が新しい位置で動く（既存の畑のテストを直す）。フロント（Vitest）: 家の中心の計算。

### 3. `world:repair`
- `app/Console/Commands/RepairWorldCommand.php`: 置いてある物（`x`・`y` がある `profile_world_items`）のうち、今の大きさ・土地・レベルで置けないもの（`WorldPlacement::check` が断るもの）を、バッグに戻す（`x`・`y` を空に）。消さない。何度流しても同じ。戻した数を出す。`--dry-run` で、戻す物の一覧だけ出す。
- テスト: 置けない物だけ戻る・置ける物は動かない・2回目は0件・`--dry-run` は何も変えない・大きさを広げて重なった物が戻る・家の下に置いてあった物が戻る。

### 4. 絵
- `tools/spru-assets/crops.json` に、`spru_house`（元: `approved/building/spru_house_01.png`、約480px）と、`spru_mall`・`saku_mall`・`chief_hall`・`windmill_garden`（元: `approved/building/*.png`、約720px）を書く。元の絵は、`tools/spru-assets` が読む場所にコピーする（`extract.py` の `source` の決まりに合わせる）。`extract.py` で `frontend/public/spru/items/*.webp` と `spru-assets.ts` を書き出す。
- `item-image-fit.ts` の `IMAGE_LIGHTS.spru_house`（夜の明かり）を、新しい絵の位置に合わせる。
- 確認: webpの大きさ（KB）が、いまの大きな建物と同じくらい（2×2＝約90KB、3×3＝約200KB以下）。

### 5. 確認・文書・マージ
- 開発DBで `world:repair --dry-run` → `world:repair`。確認用アカウントで、375px: 家（2×2）・畑・モール（3×3）を置いて、見え方（重なり・奥行き・タップ・夜の明かり）を確認。確認後、アカウントを消す。
- `SPEC.md`・`TASKS.md` を更新（大きさの決まり、`world:repair`、続き: 城・五重塔の絵が届いたら `asset_footprints` を3にして `world:repair`）。全テスト（サーバーは単独で）・Pint・tsc・eslint、最終の見直し、`main` へマージ（Ownerの確認のあと）。
