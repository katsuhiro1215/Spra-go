# パンとやさいのずかん — 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。手順は `- [ ]` で追う。

**Goal:** 今日のおつかい3つをそろえた日に、パン・作物のおくりものがもらえ、「じぶん」から「パンとやさいのずかん」で集めた物を見られるようにする。

**Architecture:** 一覧は `config/zukan.php`、記録は `profile_zukan` 表、贈る処理は `App\Support\Zukan`。`Errands::claim` のおまけの分岐から呼ぶ。画面は `/zukan` ページと、おつかいの受け取りの場面に「おくりもの」の手順を足す。

**Tech Stack:** Laravel（Pest）、Next.js/TypeScript（Vitest）、Python（Pillow）

**Spec:** `docs/design/2026-10-05-bread-zukan-design.md`

ブランチ: `feature/bread-zukan`（設計書は #00369 でコミット済み）。この計画 #00370、実装は #00371 から。コミットの形式は `#NNNNN: type:要約`＋Co-Authored-By。

## Global Constraints

- 今のおつかいのごほうび（ポイント・おまけ・なかよし度）と、受け取りの返事の `gained`（`points`・`bonus`・`bond`）は変えない（既存テストが固定している）
- `GET /api/world` のおつかいの `bonus` だけ、`gift_left` を足す（既存テスト `ErrandTest` の `bonus` の確かめを直す）
- ずかんの絵は、`SPRU_ITEMS` に `zukan_{キー}` のキーで入れる（町のアイテムのキーと重ねない）。`SPRU_ITEMS` は手で直さない
- 画像1枚は幅192px、1枚30KB前後、15枚で0.6MB以内
- 日本語の表示は `AutoFurigana` を通す。英語の名前は通さない
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
- 開発用データベース: プロフィール7を元の状態に戻す（`migrate:fresh` は使わない。追加の `migrate` はよい）

## Review Focus

- おつかいを同じ日に連打・再送しても、おくりものは1日1つだけ（二重に贈られない）
- 15個そろったあとの受け取りは、`gift` が `null` で、ポイント・おまけは今までどおり
- まだ持っていない物の名前・英語が、窓口の返事に出ていない
- 別のプロフィールのずかんが混ざらない
- 画像がないキー（設定にあって絵がない）が出ても、ずかんの画面が壊れない

## ずかんの15点（以降のタスクで共通）

`key | 日本語 | 英語 | 種類 | 元の画像（approved/item/）`

```
fresh_bread_loaf | やきたてパン | fresh bread | bread | fresh_bread_loaf_01
shokupan | しょくパン | sandwich bread | bread | shokupan_loaf_01
baguette | バゲット | baguette | bread | fresh_baguette_01
croissant | クロワッサン | croissant | bread | croissant_01
melon_bread | メロンパン | melon bread | bread | melon_bread_01
anpan | あんパン | sweet bean bun | bread | anpan_01
curry_bread | カレーパン | curry bread | bread | curry_bread_01
custard_bun | クリームパン | custard bun | bread | custard_cream_bun_01
sandwich | サンドイッチ | sandwich | bread | mixed_sandwich_set_01
fruit_danish | フルーツデニッシュ | fruit danish | bread | fruit_danish_01
wheat | 小麦のたば | wheat | crop | harvested_wheat_sheaf_01
flour | 小麦粉 | flour | crop | wheat_flour_sack_01
carrot | にんじん | carrot | crop | harvested_carrot_01
potato | じゃがいも | potato | crop | harvested_potato_01
onion | 玉ねぎ | onion | crop | harvested_onion_01
```

## Task 1: 計画のコミットと、画像の生成を始める（時間がかかるので先に）

- [ ] この計画を #00370 でコミットする
- [ ] `tools/spru-assets/crops.json` に15点を足す（前回と同じく、書式を崩さず、`sources` の最後と `items` の最後に行を足す）。`sources`: `"zukan_{key}": "../../spra-world/assets/approved/item/{元の画像}.png"`。`items`: `{"key": "zukan_{key}", "source": "zukan_{key}", "box": [0, 0, 1254, 1254], "width": 192}`
- [ ] 画像の生成を**バックグラウンドで**始める（全素材を作り直すので10分前後かかる）: `python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets`（リポジトリ直下から）。終わるまで、Task 2〜4に進む
- [ ] コミットは Task 5 で行う（画像と `spru-assets.ts` と `crops.json` を一緒に）

## Task 2: 一覧と贈る処理（サーバー）

**Files:** `config/zukan.php`、`database/migrations/2026_10_05_000002_create_profile_zukan_table.php`、`app/Models/ProfileZukan.php`、`app/Models/UserProfile.php`（`zukan()` の関係を足す）、`app/Support/Zukan.php`、`tests/Feature/ZukanTest.php`

**Interfaces:**
- Produces: `Zukan::items(): array`（設定の15点。キー → `name`・`english`・`kind`）、`Zukan::gift(UserProfile $profile): ?array`（`{key, name, english, kind}` または `null`）、`Zukan::list(UserProfile $profile): array`（窓口の返事の形）

- [ ] 先にテストを書く（RED）。`tests/Feature/ZukanTest.php`:
  - 設定: 15点で、すべてに `name`・`english`・`kind`（`bread`か`crop`）がある。キーは重ならない
  - `gift`: 持っていない物から1つ贈り、`profile_zukan` に1行増える。14回目までは毎回違う物。15個そろったら `null` で、行は増えない
  - `gift`: 一意の制約（同じ物を2回記録しようとすると失敗する）が効いている
  - `list`: 持っていない物は `name`・`english`・`received_at` が `null`、持っている物は入っている。`owned_count` と `total` が合う。ほかのプロフィールの記録は混ざらない
  - 実行 `./vendor/bin/sail test --filter=ZukanTest` **Expected:** 失敗する
- [ ] `config/zukan.php`（上の15点を、`'items' => ['fresh_bread_loaf' => ['name' => 'やきたてパン', 'english' => 'fresh bread', 'kind' => 'bread'], ...]` の形で）、マイグレーション（`profile_souvenirs` と同じ形: `user_profile_id` に外部キー・`item_key` `string(32)`・`received_at`・`timestamps`・`unique(['user_profile_id', 'item_key'])`）、モデル `ProfileZukan`（`$fillable = ['item_key', 'received_at']`、`received_at` を `datetime` にキャスト、`profile()` の関係）、`UserProfile::zukan(): HasMany`
- [ ] `Zukan::gift`: 持っていないキーを集めて、空なら `null`。あれば `Arr::random` で1つ選び、`$profile->zukan()->create([...])`。一意の制約に当たったら（`UniqueConstraintViolationException`）別のキーで1回だけ選び直す。`Zukan::list` は、`items` を設定の順に並べて、持っている物だけ名前を入れる
- [ ] `php artisan migrate`（開発用データベース。追加のみ）。`./vendor/bin/sail test --filter=ZukanTest` **Expected:** 通る
- [ ] コミット `#00371: feat:ずかんの一覧(15点)・集めた記録・贈る処理を足す`

## Task 3: おつかいの受け取りで贈る（サーバー）

**Files:** `app/Support/Errands.php`、`tests/Feature/ErrandTest.php`

**Interfaces:**
- Consumes: `Zukan::gift`、`Zukan::list`（Task 2）
- Produces: 受け取りの返事に一番上の項目 `gift`（`{key, name, english, kind}` または `null`）。`errands.bonus.gift_left`（`int`）

- [ ] 先にテスト（RED）。`ErrandTest.php` に:
  - 3つ目を受け取ると `gift` が返り、`profile_zukan` に1行入る。1つ目・2つ目の受け取りでは `gift` が `null`
  - 同じ日に、3つ目をもう一度受け取ろうとすると422（今の「もう受け取ったよ」）で、ずかんは増えない
  - 15個そろっている日は `gift` が `null` で、`gained.bonus` は30・おまけのポイントも入る
  - `errands.bonus.gift_left` が、`15 − 持っている数` で出る（`GET /api/world`）
  - 既存の `assertJsonPath('errands.bonus', ['amount' => 30, 'claimed' => true])`（234行目）に `'gift_left' => ...` を足して直す
  - 実行 `./vendor/bin/sail test --filter=ErrandTest` **Expected:** 失敗する
- [ ] `Errands::claim`: おまけの分岐の中で `$gift = Zukan::gift($profile)`（分岐に入らなければ `null`）。返事の配列に `'gift' => $gift` を足す（`gained` の中は触らない）。`Errands::state` の `bonus` に `'gift_left' => max(0, count(config('zukan.items')) - $profile->zukan()->count())` を足す
- [ ] `./vendor/bin/sail test --filter="ErrandTest|ZukanTest|WorldApiTest"` **Expected:** 通る
- [ ] コミット `#00372: feat:おつかいの3つ目を受け取ると、ずかんのパン・作物を1つ贈る`

## Task 4: ずかんの窓口（サーバー）

**Files:** `routes/api.php`、`tests/Feature/ZukanTest.php`

- [ ] 先にテスト（RED）: `GET /api/zukan` が、ログイン必須（401）・プロフィール必須、持っていない物の名前が `null`、数が合う、ほかのプロフィールのずかんが混ざらない
- [ ] `routes/api.php`: `Route::middleware(['auth:sanctum'])->get('/zukan', fn (Request $request) => Zukan::list(ActiveProfile::require($request)))`（ほかのルートと同じ書き方に合わせる）
- [ ] 実行 **Expected:** 通る。サーバー全体: `./vendor/bin/sail test`
- [ ] コミット `#00373: feat:ずかんの窓口(GET /api/zukan)を足す`

## Task 5: 画像（Task 1の生成が終わってから）

- [ ] 生成の完了を待つ。**Expected:** 終わりの行に「アイテム」の数が、今の77から92に増える。`git status` で、追加の15枚・`spru-assets.ts`・`crops.json` だけが変わる（ほかの画像に差分が出ない）
- [ ] 追加の15枚の合計が0.6MB以内か確かめる（`du`）
- [ ] コミット `#00374: feat:ずかんの画像(パン10・作物5)をSpra-worldの確定画像から作る`

## Task 6: 画面（`/zukan`・入口・おくりもの）

**Files:** `frontend/src/lib/zukan.ts`、`frontend/src/lib/zukan.test.ts`、`frontend/src/app/zukan/page.tsx`、`frontend/src/components/app/me-sheet.tsx`、`frontend/src/components/world/types.ts`、`frontend/src/components/world/errand-return.tsx`、`frontend/src/components/world/errand-sheet.tsx`

**Interfaces:**
- Produces: `lib/zukan.ts` に `type ZukanItem = { key: string; kind: "bread" | "crop"; owned: boolean; name: string | null; english: string | null; received_at: string | null }`、`type ZukanGift = { key: string; name: string; english: string; kind: "bread" | "crop" }`、`zukanProgress(owned: number, total: number): string`（`"3 / 15"`）、`zukanImage(key: string, images?): SpruImage | null`（`SPRU_ITEMS["zukan_" + key]`、なければ `null`）、`isZukanComplete(owned, total): boolean`

- [ ] 先にテスト（RED）。`zukan.test.ts`: `zukanProgress(3, 15)` が `"3 / 15"`、`zukanImage` が絵のキー `zukan_melon_bread` を引き、無いキーは `null`、`isZukanComplete(15, 15)` が真・`(14, 15)` が偽。実行 **Expected:** 失敗
- [ ] `lib/zukan.ts` を作る（GREEN）
- [ ] `types.ts`: `WorldErrands.bonus` に `gift_left: number`、`ErrandClaimResult` に `gift: ZukanGift | null`
- [ ] `/zukan` ページ: `passport/page.tsx` と同じ作り（`SkyPage`・`AppHeader`・`BackLink`・`BottomNav`・`LoadingScreen`、`apiFetch("/api/zukan")`、401でログインへ）。見出し「パンとやさいのずかん」、集めた数、2列のます。もらった物は絵・`AutoFurigana` の日本語・英語。まだの物は絵を暗いシルエット（`style={{ filter: "brightness(0)", opacity: 0.18 }}`）と「？？？」。絵が無いキーは、絵の枠だけ出して壊れない。全部そろったら「ぜんぶそろった！」の帯
- [ ] `me-sheet.tsx`: 「パスポート」の下に `SheetLink href="/zukan"`、アイコンは `zukan_melon_bread` の小さな画像、ラベル「パンとやさいのずかん」
- [ ] `errand-return.tsx`: 手順に `"gift"` を足す。おまけの手順の「やったね」ボタンは、`result.gift` があれば「つぎへ」で `gift` の手順へ。`gift` の手順は、`OutingImage` ではなく、贈られた物の絵（`zukanImage`、なければ出さない）、見出し「パン屋さんから おくりもの！」、日本語（`AutoFurigana`）と英語、［ずかんを見る］（`router.push("/zukan")` して閉じる）と［とじる］。おまけが出ない受け取り（1つ目・2つ目）は `gift` が `null` なので、今のまま
- [ ] `errand-sheet.tsx`: 下の文を、`errands.bonus.claimed` でなく `gift_left > 0` のとき「3つそろうと おまけ +30pt と おくりもの」にする（受け取り済みの文は今のまま）
- [ ] 実行: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint` **Expected:** すべて通る
- [ ] コミット `#00375: feat:ずかんのページ・じぶんのメニューの入口・おつかいの受け取りのおくりものを足す`

## Task 7: ブラウザで確かめる

- [ ] 開発用のデータで、プロフィール7のおつかい3つを達成できる状態にして（確かめる間だけ。`profile_errands` と正解の記録を作る。終わったら削除）、3つ受け取り、おくりものの場面（絵・日本語・英語・［ずかんを見る］）を確認する
- [ ] `/zukan`: シルエットともらった物、スマホ幅（375px）で切れない、全部そろった帯（`profile_zukan` に15行を作って確認）
- [ ] 「じぶん」のメニューの入口、おつかいのカードの文（`gift_left` が0の日は今までどおり）
- [ ] 確かめたあと、プロフィール7を元の状態に戻す（`profile_zukan`・`profile_errands`・追加した台帳の行を消す。xp 20、coins 60、points 95、ledger 最大668 など。Ownerのプロフィール（id 2）は触らない）。スクリーンショットと、その日の `page-*.yml`・`console-*.log` を消す（スクリーンショットは `.playwright-mcp/` の下だけ）

## Task 8: ドキュメントと全体の確認、マージの確認

- [ ] `SPEC.md`（おつかいの受け取りと「パンとやさいのずかん」）、`TASKS.md`（第2段階を完了に）を更新して、#00376 でコミット
- [ ] 全体のテスト（サーバー629＋新規、画面393＋新規）
- [ ] Review Focus の5点を、1つずつ確かめる
- [ ] 自分で見直す（最終見直しは自分によるもの）
- [ ] Ownerに報告して、マージの確認をとる（`git merge --no-ff -q -m "#00377: merge:パンとやさいのずかん…" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`）。プッシュはOwner
