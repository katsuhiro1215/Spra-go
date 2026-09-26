# ワールド画面（自分の町）＋ポイントで買って置く — 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** ログイン後のホームを「自分の町」にし、学習ポイントでアイテムを買ってマス目に自由に置ける体験を作る。

**アーキテクチャ:** バックエンドはLaravelの既存パターン（`routes/api.php`のクロージャ、セッションの`active_profile_id`）に沿って、学習ポイント・町のアイテム・配置APIを追加する。フロントはNext.jsで、町をSVG＋Reactで描画し（マス目計算は`iso.ts`に集約）、操作はSVGに重ねた本物の`<button>`で受ける。

**技術スタック:** Laravel 13 / Pest / MySQL（Sail）、Next.js 16.2.10 / React / TypeScript / Tailwind CSS / lucide-react

**設計書:** `docs/design/2026-09-26-world-town-design.md`（必ず併せて読むこと）

## 全体の制約

- マイグレーションは追加のみ。適用は `./vendor/bin/sail artisan migrate`。`migrate:fresh` は使わない（既存データ消失の前例あり）
- 学習ポイントが増えるのは「正解+10」「ステージクリア+50」「初回+100」のみ（値は `config/world.php`）。課金では増えない
- 土地は7×7固定。目印（Spruの家・鳥居・灯籠）と道のマスには置けない
- 1マスに1アイテム。回転なし、複数マスの建物なし、売却なし
- エラーメッセージ: 「レベルが足りません。」「ポイントが足りません。」「土地の外には置けません。」「そこには置けません。」「そこにはもう置いてあります。」
- 既存のコイン払い（回復薬・称号）の挙動は変えない（既存テストがすべて通ること）
- 操作対象は必ずセッションの `active_profile_id` のプロフィール。他人のアイテムは404
- Next.js 16は学習データと仕様が違う。コードを書く前に `frontend/node_modules/next/dist/docs/` の該当ページを確認する。`useSearchParams` を使うコンポーネントは `<Suspense>` で囲む（本番ビルドが失敗するため）
- 新しいUIのアイコンは絵文字を使わず、線画SVG（lucide-react または インラインSVG）
- ドキュメント・コメントは日本語。コメントは「なぜ」が必要なときだけ1行
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/world-town`（作成済み）。フロントの開発サーバーはポート3010（3000は別プロジェクトが使用中）: `cd frontend && npm run dev -- -p 3010`

## レビューで特に見る点

1. **購入の連打**: 残高が1回分しかないときに購入を2回送っても、残高がマイナスにならず2回目は422になること（Task 2でテスト）
2. **元のマスへの置き直し**: 置いてあるアイテムを同じマスへ「動かす」と、自分自身と重なり判定されず200になること（Task 4でテスト）
3. **おかしな座標**: `x`・`y` の片方だけnull、文字列、負数、7以上は422になり、DBは変わらないこと（Task 4でテスト）
4. **プロフィール未選択**: セッションに `active_profile_id` が無い状態で町のAPIを呼ぶと422になること（Task 3でテスト）
5. **`?place=` に存在しない・他人のID**: 町の画面は普通に表示され、エラーにも配置モードにもならないこと（Task 7のブラウザ確認）

## ファイル構成

**バックエンド**
- 作成: `config/world.php` — 報酬額・土地（広さ・目印・道・Spruの立ち位置）・使える絵の一覧
- 作成: `app/Support/ActiveProfile.php` — セッションからプロフィールを取り出す（新規・変更するルートで使う）
- 作成: `app/Support/WorldLand.php` — 土地の設定の読み出しと、範囲・置けないマスの判定
- 作成: `app/Support/ContinueStage.php` — 「つづきから学ぶ」の行き先ステージの算出
- 作成: `app/Models/ProfileWorldItem.php` — 持っている町のアイテム1個
- 作成: `database/migrations/2026_09_26_000001_add_points_to_user_profiles_table.php`
- 作成: `database/migrations/2026_09_26_000002_add_currency_and_min_level_to_shop_items_table.php`
- 作成: `database/migrations/2026_09_26_000003_create_profile_world_items_table.php`
- 作成: `database/seeders/WorldItemSeeder.php`
- 変更: `app/Models/UserProfile.php`（`points`・`applyEconomy` の `point`・`worldItems()`）
- 変更: `app/Models/ShopItem.php`（`currency`・`min_level`・`assetKey()`）
- 変更: `config/shop.php`（`decoration` を有効化）
- 変更: `routes/api.php`（回答・ステージクリア・ショップ・Ownerショップ編集・町のAPI）
- 変更: `database/seeders/DatabaseSeeder.php`
- テスト作成: `tests/Feature/WorldPointsTest.php`・`WorldShopTest.php`・`WorldApiTest.php`・`WorldPlacementTest.php`
- テスト変更: `tests/Pest.php`（`createDecoration()`）

**フロントエンド（`frontend/src/`）**
- 作成: `components/world/types.ts` — APIの型
- 作成: `components/world/iso.ts` — マス目 ↔ 画面座標の計算
- 作成: `components/world/item-art.tsx` — アイテムの絵（`ItemArt`・`ItemIcon`）
- 作成: `components/world/landmark-art.tsx` — 目印の絵
- 作成: `components/world/world-scene.tsx` — 町の描画と操作ボタン
- 作成: `components/world/world-hud.tsx` — 上部のステータス
- 作成: `components/world/placement-bar.tsx`・`item-action-sheet.tsx`・`welcome-gift.tsx`
- 作成: `components/world/world-screen.tsx` — 町の画面全体（データ取得と操作）
- 作成: `components/app/guest-landing.tsx` — 未ログイン時のLP（今の `app/page.tsx` から切り出し）
- 作成: `components/app/learn-points-badge.tsx` — 学習ポイントの表示
- 作成: `app/learn/page.tsx` — 今のホームの中身（国選択・ミニアプリ）
- 作成: `app/bag/page.tsx` — バッグ
- 作成: `public/spru/idle.png`・`joy.png`・`front.png` — Spruの仮画像
- 変更: `app/page.tsx`（未ログイン→LP、ログイン→町の画面）
- 変更: `components/app/bottom-nav.tsx`（5タブ）
- 変更: `components/app/profile-provider.tsx`（`points`）
- 変更: `components/app/app-header.tsx`（学習ポイント表示）
- 変更: `app/quiz/[stageId]/page.tsx`（ポイントの反映と「+10pt」表示）
- 変更: `app/shop/page.tsx`（2段構成・Suspense）
- 変更: `app/owner/dashboard/shop-items/page.tsx`（町のアイテムの登録）
- 変更: `app/travel/[countryId]/start/page.tsx`（「別の国を選ぶ」→ `/learn`）
- 変更: `app/globals.css`（アニメーション）

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`・`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md`

---

### Task 1: 学習ポイントの土台（貯まる・台帳に残る・APIで見える）

**Files:**
- Create: `database/migrations/2026_09_26_000001_add_points_to_user_profiles_table.php`
- Create: `config/world.php`
- Modify: `app/Models/UserProfile.php`
- Modify: `routes/api.php`（`stages.complete` と `questions.answer`）
- Test: `tests/Feature/WorldPointsTest.php`

**Interfaces:**
- Produces: `user_profiles.points`（int）・`user_profiles.world_welcomed_at`（datetime|null）、`UserProfile::applyEconomy(['point' => int], string $reason)`、`config('world.rewards.answer_correct'|'stage_clear'|'welcome')`、回答API・ステージクリアAPIのレスポンス `profile.points`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldPointsTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| 学習ポイント(町のアイテムを買う通貨)の獲得テスト
|--------------------------------------------------------------------------
|
| 学習ポイントは正解・ステージクリア・初回プレゼントでしか増えない
| (課金コインとは別の通貨。docs/design/2026-09-26-world-town-design.md)。
|
*/

it('正解すると学習ポイントが10増え、台帳に記録される', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $correct->id,
    ]);

    $response->assertOk()->assertJsonPath('profile.points', 10);
    expect($profile->fresh()->points)->toBe(10);
    $this->assertDatabaseHas('profile_currency_ledger', [
        'user_profile_id' => $profile->id,
        'type' => 'point',
        'delta' => 10,
        'reason' => 'answer_correct',
    ]);
});

it('不正解では学習ポイントは増えない', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $wrong->id,
    ])->assertOk()->assertJsonPath('profile.points', 0);

    expect($profile->fresh()->points)->toBe(0);
});

it('ステージクリアで学習ポイントが50増える', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => 'ポイントテスト']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'question_count' => 1,
    ]);

    $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1])
        ->assertOk()
        ->assertJsonPath('profile.points', 50);

    expect($profile->fresh()->points)->toBe(50);
    $this->assertDatabaseHas('profile_currency_ledger', [
        'user_profile_id' => $profile->id,
        'type' => 'point',
        'delta' => 50,
        'reason' => 'stage_clear',
    ]);
});

it('学習ポイントは0未満にならない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 5]);

    $profile->applyEconomy(['point' => -30], 'shop_purchase');

    expect($profile->fresh()->points)->toBe(0);
});

it('アクティブなプロフィール情報に学習ポイントが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 30]);

    $this->getJson('/api/profiles/active')
        ->assertOk()
        ->assertJsonPath('points', 30);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=WorldPointsTest`
Expected: FAIL（`points` 列が無い、`point` がmatchに無い等）

- [ ] **Step 3: マイグレーションを作る**

`database/migrations/2026_09_26_000001_add_points_to_user_profiles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->unsignedInteger('points')->default(0)->after('coins');
            $table->timestamp('world_welcomed_at')->nullable()->after('points');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['points', 'world_welcomed_at']);
        });
    }
};
```

- [ ] **Step 4: 設定ファイルを作る**

`config/world.php`:

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 学習ポイントの報酬額
    |--------------------------------------------------------------------------
    |
    | 学習ポイントは課金できない「学んだ証」。町のアイテムはこれでしか買えない
    | (docs/design/2026-09-26-world-town-design.md 4章)。
    |
    */

    'rewards' => [
        'answer_correct' => 10,
        'stage_clear' => 50,
        'welcome' => 100,
    ],

];
```

- [ ] **Step 5: `UserProfile` を変更する**

`app/Models/UserProfile.php`:

`$fillable` に `'points', 'world_welcomed_at'` を追加:

```php
    protected $fillable = [
        'name', 'hp', 'max_hp', 'hp_updated_at', 'xp', 'coins', 'points', 'world_welcomed_at',
        'level', 'combo', 'best_combo', 'current_streak', 'best_streak', 'last_played_date',
    ];
```

`casts()` に追加:

```php
            'world_welcomed_at' => 'datetime',
```

`applyEconomy()` のdocblockの `type(hp/coin/xp)` を `type(hp/coin/xp/point)` にし、`match` に1行追加:

```php
            match ($type) {
                'hp' => $this->hp = max(0, min($this->max_hp, $this->hp + $delta)),
                'coin' => $this->coins = max(0, $this->coins + $delta),
                'xp' => $this->xp = max(0, $this->xp + $delta),
                'point' => $this->points = max(0, $this->points + $delta),
            };
```

- [ ] **Step 6: 回答APIとステージクリアAPIでポイントを付ける**

`routes/api.php` の `stages.complete`:

```php
    $profile->applyEconomy(['coin' => 100, 'point' => config('world.rewards.stage_clear')], 'stage_clear', null, $stage);
```

同じルートのレスポンス `'profile' => [...]` の `'coins' => $profile->coins,` の次に:

```php
            'points' => $profile->points,
```

`questions.answer` の正解時:

```php
        $economyResult = $isCorrect
            ? $profile->applyEconomy([
                'hp' => -1,
                'xp' => 10,
                'coin' => 5,
                'point' => config('world.rewards.answer_correct'),
            ], 'answer_correct', $question)
            : $profile->applyEconomy(['hp' => -2], 'answer_wrong', $question);
```

同じルートの `$economy = [...]` の `'coins' => $profile->coins,` の次に:

```php
            'points' => $profile->points,
```

（`/api/profiles/active` は `$profile->toArray()` を返すため、列の追加だけで `points` が含まれる）

- [ ] **Step 7: マイグレーションを適用し、テストが通ることを確認する**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan test --filter=WorldPointsTest`
Expected: PASS（5件）

- [ ] **Step 8: 全テストで回帰が無いことを確認する**

Run: `./vendor/bin/sail artisan test`
Expected: 全件PASS（既存97件＋5件）

- [ ] **Step 9: コミット**

```bash
git add database/migrations/2026_09_26_000001_add_points_to_user_profiles_table.php config/world.php app/Models/UserProfile.php routes/api.php tests/Feature/WorldPointsTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:学習ポイントを新設し、正解+10・ステージクリア+50を付与

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 町のアイテムの品ぞろえと購入（バッグに入る）

**Files:**
- Create: `database/migrations/2026_09_26_000002_add_currency_and_min_level_to_shop_items_table.php`
- Create: `database/migrations/2026_09_26_000003_create_profile_world_items_table.php`
- Create: `app/Models/ProfileWorldItem.php`
- Create: `app/Support/ActiveProfile.php`
- Create: `database/seeders/WorldItemSeeder.php`
- Modify: `app/Models/ShopItem.php`、`app/Models/UserProfile.php`、`config/shop.php`、`config/world.php`、`routes/api.php`（`shop.index`・`shop.purchase`・`owner.shop-items.*`）、`database/seeders/DatabaseSeeder.php`、`tests/Pest.php`
- Test: `tests/Feature/WorldShopTest.php`

**Interfaces:**
- Consumes: Task 1 の `points`・`applyEconomy(['point' => ...])`
- Produces:
  - `ShopItem::$currency`（`'coin'|'point'`）・`ShopItem::$min_level`（int）・`ShopItem::assetKey(): ?string`
  - `ProfileWorldItem`（`user_profile_id`・`shop_item_id`・`x`・`y`、`isPlaced(): bool`、`toWorldArray(): array{id:int, shop_item_id:int, name:string, asset_key:?string, x:?int, y:?int}`）
  - `UserProfile::worldItems(): HasMany`
  - `ActiveProfile::find(Request): ?UserProfile`・`ActiveProfile::require(Request): UserProfile`（無ければ422）
  - `GET /api/shop` の各要素に `currency`・`min_level`・`asset_key`・`locked`
  - `POST /api/shop/{id}/purchase` のレスポンス `{ profile: {..., points}, world_item: ProfileWorldItem::toWorldArray()|null }`
  - `config('world.asset_keys')`: `['bench','flowerbed','chochin','tree','sakura','vending','bicycle','stall']`
  - テスト用 `createDecoration(array $overrides = []): ShopItem`

- [ ] **Step 1: テスト用ヘルパーを追加する**

`tests/Pest.php` の末尾に追加（`use App\Models\ShopItem;` をファイル先頭のuseに追加）:

```php
/** 町に置くアイテム(学習ポイント払い)を作る。Task 2以降の町関連テストで共通に使う */
function createDecoration(array $overrides = []): ShopItem
{
    return ShopItem::create(array_merge([
        'name' => 'ベンチ',
        'price' => 30,
        'type' => 'decoration',
        'currency' => 'point',
        'min_level' => 1,
        'meta' => ['asset_key' => 'bench'],
    ], $overrides));
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/Feature/WorldShopTest.php`:

```php
<?php

use App\Models\Owner;
use App\Models\ShopItem;

it('ショップ一覧に町のアイテムが通貨・必要レベル・絵の指定・ロック状態つきで返る', function () {
    createActiveProfile();
    createDecoration(['name' => 'ベンチ', 'min_level' => 1]);
    createDecoration(['name' => '屋台', 'min_level' => 5, 'meta' => ['asset_key' => 'stall']]);

    $response = $this->getJson('/api/shop')->assertOk();

    $decorations = collect($response->json())->where('type', 'decoration')->keyBy('name');
    expect($decorations['ベンチ'])->toMatchArray([
        'currency' => 'point',
        'min_level' => 1,
        'asset_key' => 'bench',
        'locked' => false,
    ]);
    expect($decorations['屋台']['locked'])->toBeTrue();
});

it('学習ポイントで町のアイテムを買うとポイントが減り、バッグに入る', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 100]);
    $item = createDecoration(['price' => 30]);

    $response = $this->postJson("/api/shop/{$item->id}/purchase")->assertOk();

    $response->assertJsonPath('profile.points', 70)
        ->assertJsonPath('world_item.shop_item_id', $item->id)
        ->assertJsonPath('world_item.asset_key', 'bench')
        ->assertJsonPath('world_item.x', null)
        ->assertJsonPath('world_item.y', null);
    expect($profile->fresh()->points)->toBe(70);
    expect($profile->fresh()->coins)->toBe(0);
    $this->assertDatabaseHas('profile_world_items', [
        'user_profile_id' => $profile->id,
        'shop_item_id' => $item->id,
        'x' => null,
        'y' => null,
    ]);
    $this->assertDatabaseHas('user_profile_items', [
        'user_profile_id' => $profile->id,
        'shop_item_id' => $item->id,
    ]);
});

it('必要レベルに届いていないと買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 500]);
    $item = createDecoration(['min_level' => 5]);

    $this->postJson("/api/shop/{$item->id}/purchase")
        ->assertStatus(422)
        ->assertJsonPath('message', 'レベルが足りません。');

    expect($profile->fresh()->points)->toBe(500);
    $this->assertDatabaseCount('profile_world_items', 0);
});

it('学習ポイントが足りないと買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 10]);
    $item = createDecoration(['price' => 30]);

    $this->postJson("/api/shop/{$item->id}/purchase")
        ->assertStatus(422)
        ->assertJsonPath('message', 'ポイントが足りません。');

    $this->assertDatabaseCount('profile_world_items', 0);
});

it('残高がちょうど1回分のとき、2回目の購入は失敗し残高はマイナスにならない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 30]);
    $item = createDecoration(['price' => 30]);

    $this->postJson("/api/shop/{$item->id}/purchase")->assertOk();
    $this->postJson("/api/shop/{$item->id}/purchase")->assertStatus(422);

    expect($profile->fresh()->points)->toBe(0);
    $this->assertDatabaseCount('profile_world_items', 1);
});

it('コインを持っていても町のアイテムはコインでは買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['coins' => 1000, 'points' => 0]);
    $item = createDecoration(['price' => 30]);

    $this->postJson("/api/shop/{$item->id}/purchase")->assertStatus(422);

    expect($profile->fresh()->coins)->toBe(1000);
});

it('Ownerは町のアイテムを登録でき、通貨は自動で学習ポイントになる', function () {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->postJson('/api/owner/shop-items', [
        'name' => '花だん',
        'price' => 20,
        'type' => 'decoration',
        'min_level' => 2,
        'meta' => ['asset_key' => 'flowerbed'],
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('shop_items', [
        'name' => '花だん',
        'type' => 'decoration',
        'currency' => 'point',
        'min_level' => 2,
    ]);
});

it('Ownerが町のアイテムを登録するとき、用意されていない絵の指定はエラーになる', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->postJson('/api/owner/shop-items', [
        'name' => '謎の建物',
        'price' => 20,
        'type' => 'decoration',
        'meta' => ['asset_key' => 'unknown_building'],
    ])->assertStatus(422);
});

it('プレイヤーが持っている町のアイテムは、Ownerでも削除できない', function () {
    $owner = Owner::factory()->create();
    $profile = createActiveProfile();
    $item = createDecoration();
    $profile->worldItems()->create(['shop_item_id' => $item->id]);

    $this->actingAs($owner, 'owner')
        ->deleteJson("/api/owner/shop-items/{$item->id}")
        ->assertStatus(422);

    expect(ShopItem::find($item->id))->not->toBeNull();
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=WorldShopTest`
Expected: FAIL（`currency` 列が無い等）

- [ ] **Step 4: マイグレーション2本を作る**

`database/migrations/2026_09_26_000002_add_currency_and_min_level_to_shop_items_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_items', function (Blueprint $table) {
            $table->string('currency', 10)->default('coin')->after('price');
            $table->unsignedSmallInteger('min_level')->default(1)->after('currency');
        });
    }

    public function down(): void
    {
        Schema::table('shop_items', function (Blueprint $table) {
            $table->dropColumn(['currency', 'min_level']);
        });
    }
};
```

`database/migrations/2026_09_26_000003_create_profile_world_items_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_world_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shop_item_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('x')->nullable();
            $table->unsignedTinyInteger('y')->nullable();
            $table->timestamps();

            // x,yがNULL(バッグの中)の行は重複扱いにならないため、置いてある物だけが1マス1個に制限される
            $table->unique(['user_profile_id', 'x', 'y']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_world_items');
    }
};
```

- [ ] **Step 5: モデルと補助クラスを作る・変更する**

`app/Models/ProfileWorldItem.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileWorldItem extends Model
{
    protected $fillable = ['user_profile_id', 'shop_item_id', 'x', 'y'];

    protected function casts(): array
    {
        return [
            'x' => 'integer',
            'y' => 'integer',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    public function shopItem(): BelongsTo
    {
        return $this->belongsTo(ShopItem::class);
    }

    public function isPlaced(): bool
    {
        return $this->x !== null && $this->y !== null;
    }

    /** @return array{id: int, shop_item_id: int, name: string, asset_key: ?string, x: ?int, y: ?int} */
    public function toWorldArray(): array
    {
        return [
            'id' => $this->id,
            'shop_item_id' => $this->shop_item_id,
            'name' => $this->shopItem->name,
            'asset_key' => $this->shopItem->assetKey(),
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
}
```

`app/Models/ShopItem.php` を次の内容にする:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopItem extends Model
{
    protected $fillable = ['name', 'price', 'currency', 'min_level', 'type', 'meta'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'min_level' => 'integer',
        ];
    }

    public function assetKey(): ?string
    {
        return $this->meta['asset_key'] ?? null;
    }
}
```

`app/Models/UserProfile.php` にリレーションを追加:

```php
    public function worldItems(): HasMany
    {
        return $this->hasMany(ProfileWorldItem::class);
    }
```

`app/Support/ActiveProfile.php`:

```php
<?php

namespace App\Support;

use App\Models\UserProfile;
use Illuminate\Http\Request;

/**
 * セッションで選択中のプロフィールを取り出す。既存ルートに散らばっている同じ処理を
 * 新規・変更するルートではここに寄せる(家族アカウント内のプロフィールかも確認する)。
 */
class ActiveProfile
{
    public static function find(Request $request): ?UserProfile
    {
        $profileId = $request->session()->get('active_profile_id');
        $profile = $profileId ? UserProfile::find($profileId) : null;

        if (! $profile || $profile->user_schema_id !== $request->user()?->schema?->id) {
            return null;
        }

        return $profile;
    }

    public static function require(Request $request): UserProfile
    {
        $profile = self::find($request);
        abort_unless($profile, 422, 'プロフィールが選択されていません。');

        return $profile;
    }
}
```

`config/shop.php` の `enabled_types` を変更:

```php
    'enabled_types' => ['potion', 'title', 'decoration'],
```

`config/world.php` の `rewards` の後に追加:

```php
    /*
    | 町のアイテムの絵として用意済みのキー。フロントの components/world/item-art.tsx と
    | 必ず一致させる(Ownerが絵の無いアイテムを登録できないようにするため)。
    */

    'asset_keys' => ['bench', 'flowerbed', 'chochin', 'tree', 'sakura', 'vending', 'bicycle', 'stall'],
```

- [ ] **Step 6: ショップのAPIを変更する**

`routes/api.php` 先頭のuseに追加:

```php
use App\Models\ProfileWorldItem;
use App\Support\ActiveProfile;
use Illuminate\Support\Facades\DB;
```

`shop.index` を置き換える:

```php
Route::middleware(['auth:sanctum'])->get('/shop', function (Request $request) {
    $level = ActiveProfile::find($request)?->level ?? 1;

    return ShopItem::query()
        ->whereIn('type', config('shop.enabled_types'))
        ->orderBy('type')
        ->orderBy('min_level')
        ->orderBy('price')
        ->get()
        ->map(fn (ShopItem $item) => [
            ...$item->toArray(),
            'asset_key' => $item->assetKey(),
            'locked' => $level < $item->min_level,
        ]);
})->name('shop.index');
```

`shop.purchase` を置き換える（購入処理全体をトランザクション＋行ロックで囲み、二重引き落としを防ぐ）:

```php
Route::middleware(['auth:sanctum'])->post('/shop/{shopItem}/purchase', function (Request $request, ShopItem $shopItem) {
    abort_unless(
        in_array($shopItem->type, config('shop.enabled_types'), true),
        422,
        'この商品は現在準備中のため購入できません。'
    );

    $activeProfile = ActiveProfile::require($request);

    return DB::transaction(function () use ($activeProfile, $shopItem) {
        $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

        if ($shopItem->currency === 'point') {
            abort_if($profile->level < $shopItem->min_level, 422, 'レベルが足りません。');
            abort_if($profile->points < $shopItem->price, 422, 'ポイントが足りません。');
            $profile->applyEconomy(['point' => -$shopItem->price], 'shop_purchase');
        } else {
            abort_if($profile->coins < $shopItem->price, 422, 'コインが足りません。');
            $deltas = ['coin' => -$shopItem->price];
            if ($shopItem->type === 'potion' && ($heal = $shopItem->meta['heal'] ?? null)) {
                $deltas['hp'] = $heal;
            }
            $profile->applyEconomy($deltas, 'shop_purchase');
        }

        if ($shopItem->type === 'title') {
            ProfileTitle::query()->firstOrCreate(
                ['user_profile_id' => $profile->id, 'title' => $shopItem->name],
                ['unlocked_at' => now()]
            );
        }

        $worldItem = $shopItem->type === 'decoration'
            ? $profile->worldItems()->create(['shop_item_id' => $shopItem->id])
            : null;

        UserProfileItem::create([
            'user_profile_id' => $profile->id,
            'shop_item_id' => $shopItem->id,
            'purchased_at' => now(),
        ]);

        return [
            'profile' => [
                'id' => $profile->id,
                'hp' => $profile->hp,
                'max_hp' => $profile->max_hp,
                'xp' => $profile->xp,
                'coins' => $profile->coins,
                'points' => $profile->points,
                'level' => $profile->level,
            ],
            'world_item' => $worldItem?->load('shopItem')->toWorldArray(),
        ];
    });
})->name('shop.purchase');
```

- [ ] **Step 7: Ownerのショップ編集APIを変更する**

`routes/api.php` の `owner/shop-items` グループを次のように変更する。`$shopItemTypes` に `'decoration'` を加え、検証ルールと保存前の補正を共通化する:

```php
Route::middleware(['auth:owner'])->prefix('owner/shop-items')->name('owner.shop-items.')->group(function () {
    $shopItemTypes = ['potion', 'plane', 'background', 'character', 'title', 'decoration'];

    $rules = fn () => [
        'name' => ['required', 'string', 'max:255'],
        'price' => ['required', 'integer', 'min:0'],
        'type' => ['required', Rule::in($shopItemTypes)],
        'min_level' => ['nullable', 'integer', 'min:1', 'max:99'],
        'meta' => ['nullable', 'array'],
        'meta.heal' => ['required_if:type,potion', 'integer', 'min:1'],
        'meta.asset_key' => ['required_if:type,decoration', 'string', Rule::in(config('world.asset_keys'))],
    ];

    // 町のアイテムは学習ポイント払い、それ以外はコイン払いに固定する(Ownerが通貨を選び間違えないようにするため)
    $normalize = function (array $data): array {
        $data['currency'] = $data['type'] === 'decoration' ? 'point' : 'coin';
        $data['min_level'] = $data['min_level'] ?? 1;

        return $data;
    };

    Route::get('/', function () {
        return ShopItem::query()->orderBy('type')->orderBy('price')->get();
    })->name('index');

    Route::post('/', function (Request $request) use ($rules, $normalize) {
        return ShopItem::create($normalize($request->validate($rules())));
    })->name('store');

    Route::patch('/{shopItem}', function (Request $request, ShopItem $shopItem) use ($rules, $normalize) {
        $shopItem->update($normalize($request->validate($rules())));

        return $shopItem;
    })->name('update');

    Route::delete('/{shopItem}', function (ShopItem $shopItem) {
        abort_if(
            ProfileWorldItem::query()->where('shop_item_id', $shopItem->id)->exists(),
            422,
            'プレイヤーが持っているアイテムのため削除できません。'
        );

        $shopItem->delete();

        return response()->noContent();
    })->name('destroy');
});
```

- [ ] **Step 8: 初期の品ぞろえのシーダーを作る**

`database/seeders/WorldItemSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\ShopItem;
use Illuminate\Database\Seeder;

/**
 * 町に置くアイテムの初期の品ぞろえ。レベルは10問正解で1上がるため、
 * 必要レベルはLv.1〜12に散らしている。何度実行しても重複しない。
 */
class WorldItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'ベンチ', 'price' => 30, 'min_level' => 1, 'asset_key' => 'bench'],
            ['name' => '花だん', 'price' => 20, 'min_level' => 1, 'asset_key' => 'flowerbed'],
            ['name' => 'ちょうちん', 'price' => 25, 'min_level' => 1, 'asset_key' => 'chochin'],
            ['name' => '木', 'price' => 30, 'min_level' => 2, 'asset_key' => 'tree'],
            ['name' => '桜の木', 'price' => 50, 'min_level' => 4, 'asset_key' => 'sakura'],
            ['name' => '自動販売機', 'price' => 60, 'min_level' => 6, 'asset_key' => 'vending'],
            ['name' => '自転車', 'price' => 80, 'min_level' => 8, 'asset_key' => 'bicycle'],
            ['name' => '屋台', 'price' => 120, 'min_level' => 12, 'asset_key' => 'stall'],
        ];

        foreach ($items as $item) {
            ShopItem::query()->updateOrCreate(
                ['type' => 'decoration', 'name' => $item['name']],
                [
                    'price' => $item['price'],
                    'currency' => 'point',
                    'min_level' => $item['min_level'],
                    'meta' => ['asset_key' => $item['asset_key']],
                ],
            );
        }
    }
}
```

`database/seeders/DatabaseSeeder.php` の `$this->call([...])` の末尾（`StageSeeder::class,` の次）に `WorldItemSeeder::class,` を追加する。

- [ ] **Step 9: 適用してテストを通す**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan test --filter=WorldShopTest`
Expected: PASS（9件）

- [ ] **Step 10: 全テストと、開発DBへの品ぞろえ投入**

Run: `./vendor/bin/sail artisan test && ./vendor/bin/sail artisan db:seed --class=WorldItemSeeder`
Expected: 全件PASS（`EconomyTest` のショップ系テストを含む）。シーダーは非破壊（`updateOrCreate`）

- [ ] **Step 11: コミット**

```bash
git add database/migrations/2026_09_26_000002_add_currency_and_min_level_to_shop_items_table.php database/migrations/2026_09_26_000003_create_profile_world_items_table.php app/Models/ProfileWorldItem.php app/Models/ShopItem.php app/Models/UserProfile.php app/Support/ActiveProfile.php config/shop.php config/world.php routes/api.php database/seeders/WorldItemSeeder.php database/seeders/DatabaseSeeder.php tests/Pest.php tests/Feature/WorldShopTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町のアイテムを学習ポイントで購入できるようにする(購入はトランザクションで二重引き落とし防止)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 町の情報API・初回100ptプレゼント・「つづきから学ぶ」

**Files:**
- Create: `app/Support/WorldLand.php`、`app/Support/ContinueStage.php`
- Modify: `config/world.php`（`land`）、`routes/api.php`（`world.*`）
- Test: `tests/Feature/WorldApiTest.php`

**Interfaces:**
- Consumes: Task 2 の `ActiveProfile`・`ProfileWorldItem::toWorldArray()`・`UserProfile::worldItems()`
- Produces:
  - `WorldLand::size(): int`・`landmarks(): list<array{key:string,x:int,y:int}>`・`paths(): list<array{0:int,1:int}>`・`blocked(): list<array{0:int,1:int}>`・`inBounds(int,int): bool`・`isBlocked(int,int): bool`・`toArray(): array`
  - `ContinueStage::resolveId(UserProfile): ?int`
  - `GET /api/world` → `{ land: {size, landmarks, paths, blocked, spru: {x, y}}, items: WorldItem[], bag: WorldItem[], profile: {id, points, level, xp, hp, max_hp, coins}, welcome_available: bool, continue_stage_id: int|null }`
  - `POST /api/world/welcome` → `{ granted: bool, points: int }`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldApiTest.php`:

```php
<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\User;

it('町の情報に土地・置いてあるアイテム・バッグ・プロフィールが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 40]);
    $item = createDecoration();
    $profile->worldItems()->create(['shop_item_id' => $item->id, 'x' => 5, 'y' => 5]);
    $profile->worldItems()->create(['shop_item_id' => $item->id]);

    $response = $this->getJson('/api/world')->assertOk();

    $response->assertJsonPath('land.size', 7)
        ->assertJsonPath('land.spru', ['x' => 1, 'y' => 3])
        ->assertJsonCount(1, 'items')
        ->assertJsonPath('items.0.x', 5)
        ->assertJsonPath('items.0.asset_key', 'bench')
        ->assertJsonCount(1, 'bag')
        ->assertJsonPath('bag.0.x', null)
        ->assertJsonPath('profile.points', 40);
    expect($response->json('land.blocked'))->toContain([1, 1])->toContain([3, 2]);
});

it('プロフィールを選んでいないと町の情報は取れない', function () {
    $user = User::factory()->create();
    $user->schema()->create(['name' => 'テスト家族']);

    $this->actingAs($user)
        ->withHeader('Referer', 'http://localhost')
        ->getJson('/api/world')
        ->assertStatus(422);
});

it('最初の100ptは1回だけ受け取れる', function () {
    $profile = createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('welcome_available', true);

    $this->postJson('/api/world/welcome')
        ->assertOk()
        ->assertJson(['granted' => true, 'points' => 100]);
    $this->postJson('/api/world/welcome')
        ->assertOk()
        ->assertJson(['granted' => false, 'points' => 100]);

    $this->getJson('/api/world')->assertJsonPath('welcome_available', false);
    expect($profile->fresh()->points)->toBe(100);
    $this->assertDatabaseHas('profile_currency_ledger', [
        'user_profile_id' => $profile->id,
        'type' => 'point',
        'delta' => 100,
        'reason' => 'world_welcome',
    ]);
});

function createStageSeries(): array
{
    $category = Category::create(['name' => 'つづきテスト']);

    return collect([1, 2])->map(fn (int $n) => Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => $n,
        'question_count' => 1,
    ]))->all();
}

it('遊んだ記録が無ければ「つづきから」の行き先は無い', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', null);
});

it('最後に遊んだステージが未クリアなら、そのステージが行き先になる', function () {
    $profile = createActiveProfile();
    [$first] = createStageSeries();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $first->id, 'attempts' => 1]);

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', $first->id);
});

it('最後に遊んだステージをクリア済みなら、次のステージが行き先になる', function () {
    $profile = createActiveProfile();
    [$first, $second] = createStageSeries();
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $first->id,
        'attempts' => 1,
        'cleared_at' => now(),
    ]);

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', $second->id);
});

it('最後のステージまでクリア済みなら「つづきから」の行き先は無い', function () {
    $profile = createActiveProfile();
    [, $second] = createStageSeries();
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $second->id,
        'attempts' => 1,
        'cleared_at' => now(),
    ]);

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', null);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=WorldApiTest`
Expected: FAIL（404 Not Found）

- [ ] **Step 3: 土地の設定を追加する**

`config/world.php` の `asset_keys` の後に追加:

```php
    /*
    | 土地(7×7固定)。x,yは0始まり。目印と道のマスには置けない。
    | 全員同じ町のためDBに持たない(サブプロジェクト②で土地が広がる際に拡張する)。
    */

    'land' => [
        'size' => 7,
        'landmarks' => [
            ['key' => 'stone_lantern', 'x' => 2, 'y' => 0],
            ['key' => 'torii', 'x' => 3, 'y' => 0],
            ['key' => 'stone_lantern', 'x' => 4, 'y' => 0],
            ['key' => 'spru_house', 'x' => 1, 'y' => 1],
        ],
        'paths' => [
            [3, 1], [3, 2],
            [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
        ],
        // Spruが立っている道のマス(道なのでアイテムと重ならない)
        'spru' => ['x' => 1, 'y' => 3],
    ],
```

- [ ] **Step 4: `WorldLand` と `ContinueStage` を作る**

`app/Support/WorldLand.php`:

```php
<?php

namespace App\Support;

class WorldLand
{
    public static function size(): int
    {
        return (int) config('world.land.size');
    }

    /** @return list<array{key: string, x: int, y: int}> */
    public static function landmarks(): array
    {
        return config('world.land.landmarks');
    }

    /** @return list<array{0: int, 1: int}> */
    public static function paths(): array
    {
        return config('world.land.paths');
    }

    /** @return list<array{0: int, 1: int}> 目印と道のマス(置けないマス) */
    public static function blocked(): array
    {
        $tiles = array_map(fn (array $landmark) => [$landmark['x'], $landmark['y']], self::landmarks());

        foreach (self::paths() as [$x, $y]) {
            $tiles[] = [$x, $y];
        }

        return array_values(array_unique($tiles, SORT_REGULAR));
    }

    public static function inBounds(int $x, int $y): bool
    {
        $size = self::size();

        return $x >= 0 && $y >= 0 && $x < $size && $y < $size;
    }

    public static function isBlocked(int $x, int $y): bool
    {
        return in_array([$x, $y], self::blocked(), true);
    }

    public static function toArray(): array
    {
        return [
            'size' => self::size(),
            'landmarks' => self::landmarks(),
            'paths' => self::paths(),
            'blocked' => self::blocked(),
            'spru' => config('world.land.spru'),
        ];
    }
}
```

`app/Support/ContinueStage.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * 町の画面の「つづきから学ぶ」の行き先。復習を混ぜた「今日のレッスン」
 * (サブプロジェクト③)ができるまでの代わり。
 */
class ContinueStage
{
    public static function resolveId(UserProfile $profile): ?int
    {
        $last = ProfileStageProgress::query()
            ->where('user_profile_id', $profile->id)
            ->latest('updated_at')
            ->latest('id')
            ->first();

        if (! $last) {
            return null;
        }

        if ($last->cleared_at === null) {
            return $last->stage_id;
        }

        $stage = Stage::find($last->stage_id);

        if (! $stage) {
            return null;
        }

        return Stage::query()
            ->where('category_id', $stage->category_id)
            ->where('country_id', $stage->country_id)
            ->where('difficulty', $stage->difficulty)
            ->where('stage_number', $stage->stage_number + 1)
            ->value('id');
    }
}
```

（`where('country_id', null)` はLaravelが `IS NULL` に変換するため、国の無いステージでも正しく動く）

- [ ] **Step 5: 町のAPIを追加する**

`routes/api.php` 先頭のuseに追加:

```php
use App\Support\ContinueStage;
use App\Support\WorldLand;
```

`shop.purchase` ルートの後に追加:

```php
Route::middleware(['auth:sanctum'])->prefix('world')->name('world.')->group(function () {
    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $profile->regenerateHp();
        $items = $profile->worldItems()->with('shopItem')->orderBy('id')->get();

        return [
            'land' => WorldLand::toArray(),
            'items' => $items->filter->isPlaced()->values()->map->toWorldArray(),
            'bag' => $items->reject->isPlaced()->values()->map->toWorldArray(),
            'profile' => [
                'id' => $profile->id,
                'points' => $profile->points,
                'level' => $profile->level,
                'xp' => $profile->xp,
                'hp' => $profile->hp,
                'max_hp' => $profile->max_hp,
                'coins' => $profile->coins,
            ],
            'welcome_available' => $profile->world_welcomed_at === null,
            'continue_stage_id' => ContinueStage::resolveId($profile),
        ];
    })->name('show');

    Route::post('/welcome', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            if ($profile->world_welcomed_at !== null) {
                return ['granted' => false, 'points' => $profile->points];
            }

            $profile->world_welcomed_at = now();
            $profile->applyEconomy(['point' => config('world.rewards.welcome')], 'world_welcome');

            return ['granted' => true, 'points' => $profile->points];
        });
    })->name('welcome');
});
```

- [ ] **Step 6: テストが通ることを確認する**

Run: `./vendor/bin/sail artisan test --filter=WorldApiTest`
Expected: PASS（7件）

- [ ] **Step 7: 全テスト**

Run: `./vendor/bin/sail artisan test`
Expected: 全件PASS

- [ ] **Step 8: コミット**

```bash
git add config/world.php app/Support/WorldLand.php app/Support/ContinueStage.php routes/api.php tests/Feature/WorldApiTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町の情報API・初回100ptプレゼント・つづきから学ぶの行き先を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 置く・動かす・バッグに戻すAPI

**Files:**
- Modify: `routes/api.php`（`world.items.update`）
- Test: `tests/Feature/WorldPlacementTest.php`

**Interfaces:**
- Consumes: Task 3 の `WorldLand::inBounds()`・`isBlocked()`、Task 2 の `ProfileWorldItem`
- Produces: `PATCH /api/world/items/{profileWorldItem}` リクエスト `{x: int|null, y: int|null}`、レスポンスは `ProfileWorldItem::toWorldArray()`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldPlacementTest.php`:

```php
<?php

use App\Models\ProfileWorldItem;
use App\Models\User;

function createBagItem(\App\Models\UserProfile $profile): ProfileWorldItem
{
    return $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);
}

it('バッグのアイテムを空きマスに置ける', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 5])
        ->assertOk()
        ->assertJson(['id' => $item->id, 'x' => 5, 'y' => 5, 'asset_key' => 'bench']);

    expect($item->fresh()->only(['x', 'y']))->toBe(['x' => 5, 'y' => 5]);
});

it('置いたアイテムを別のマスへ動かせる', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);
    $item->update(['x' => 5, 'y' => 5]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 6, 'y' => 6])->assertOk();

    expect($item->fresh()->only(['x', 'y']))->toBe(['x' => 6, 'y' => 6]);
});

it('置いたアイテムを同じマスに置き直してもエラーにならない', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);
    $item->update(['x' => 5, 'y' => 5]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 5])->assertOk();
});

it('置いたアイテムをバッグに戻せる', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);
    $item->update(['x' => 5, 'y' => 5]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => null, 'y' => null])->assertOk();

    expect($item->fresh()->isPlaced())->toBeFalse();
});

it('土地の外には置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', '土地の外には置けません。');

    expect($item->fresh()->isPlaced())->toBeFalse();
})->with([
    'xが7' => [7, 0],
    'yが7' => [0, 7],
    'xが負' => [-1, 2],
]);

it('目印や道のマスには置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこには置けません。');
})->with([
    'Spruの家' => [1, 1],
    '鳥居' => [3, 0],
    '道' => [3, 2],
]);

it('他のアイテムがあるマスには置けない', function () {
    $profile = createActiveProfile();
    $placed = createBagItem($profile);
    $placed->update(['x' => 5, 'y' => 5]);
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 5])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
});

it('座標の送り方がおかしいとエラーになる', function (array $payload) {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", $payload)->assertStatus(422);

    expect($item->fresh()->isPlaced())->toBeFalse();
})->with([
    'xだけnull' => [['x' => null, 'y' => 3]],
    'yだけnull' => [['x' => 3, 'y' => null]],
    '文字列' => [['x' => 'a', 'y' => 3]],
    'キーが無い' => [[]],
]);

it('他のプロフィールのアイテムは操作できない', function () {
    $other = User::factory()->create()->schema()->create(['name' => '別の家族'])
        ->profiles()->create(['name' => '別のプレイヤー']);
    $othersItem = createBagItem($other);
    createActiveProfile();

    $this->patchJson("/api/world/items/{$othersItem->id}", ['x' => 5, 'y' => 5])->assertNotFound();

    expect($othersItem->fresh()->isPlaced())->toBeFalse();
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=WorldPlacementTest`
Expected: FAIL（405/404）

- [ ] **Step 3: 配置APIを追加する**

`routes/api.php` 先頭のuseに追加:

```php
use Illuminate\Database\UniqueConstraintViolationException;
```

`world` グループの `welcome` ルートの後に追加:

```php
    Route::patch('/items/{profileWorldItem}', function (Request $request, ProfileWorldItem $profileWorldItem) {
        $profile = ActiveProfile::require($request);
        abort_unless($profileWorldItem->user_profile_id === $profile->id, 404);

        $data = $request->validate([
            'x' => ['present', 'nullable', 'integer', 'required_with:y'],
            'y' => ['present', 'nullable', 'integer', 'required_with:x'],
        ]);
        $x = $data['x'] === null ? null : (int) $data['x'];
        $y = $data['y'] === null ? null : (int) $data['y'];

        if ($x !== null) {
            abort_unless(WorldLand::inBounds($x, $y), 422, '土地の外には置けません。');
            abort_if(WorldLand::isBlocked($x, $y), 422, 'そこには置けません。');
            abort_if(
                $profile->worldItems()->where('x', $x)->where('y', $y)->whereKeyNot($profileWorldItem->id)->exists(),
                422,
                'そこにはもう置いてあります。'
            );
        }

        try {
            $profileWorldItem->update(['x' => $x, 'y' => $y]);
        } catch (UniqueConstraintViolationException) {
            // 事前チェックと保存の間に同じマスへ置かれた場合(同時操作)
            abort(422, 'そこにはもう置いてあります。');
        }

        return $profileWorldItem->load('shopItem')->toWorldArray();
    })->name('items.update');
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `./vendor/bin/sail artisan test --filter=WorldPlacementTest`
Expected: PASS（データセット込みで17件）

- [ ] **Step 5: 全テスト**

Run: `./vendor/bin/sail artisan test`
Expected: 全件PASS

- [ ] **Step 6: コミット**

```bash
git add routes/api.php tests/Feature/WorldPlacementTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町のアイテムを置く・動かす・バッグに戻すAPIを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 画面構成の組み替え（`/learn`・LP切り出し・5タブ・バッグ・ポイント表示）

このタスクの時点では `/` は今のホームのまま（Task 6で町の画面に切り替える）。

**Files:**
- Create: `frontend/src/components/app/guest-landing.tsx`、`frontend/src/app/learn/page.tsx`、`frontend/src/app/bag/page.tsx`、`frontend/src/components/app/learn-points-badge.tsx`、`frontend/src/components/world/types.ts`、`frontend/src/components/world/item-art.tsx`
- Modify: `frontend/src/app/page.tsx`、`frontend/src/components/app/bottom-nav.tsx`、`frontend/src/components/app/profile-provider.tsx`、`frontend/src/components/app/app-header.tsx`、`frontend/src/app/quiz/[stageId]/page.tsx`、`frontend/src/app/travel/[countryId]/start/page.tsx`

**Interfaces:**
- Consumes: `GET /api/world`（Task 3）
- Produces:
  - `components/world/types.ts` の `Tile`・`Landmark`・`WorldItem`・`WorldLand`・`WorldProfile`・`WorldData`・`ShopListItem`
  - `ItemArt({ assetKey: string | null })`（原点=マスの中心のSVG `<g>`）、`ItemIcon({ assetKey, size?, className? })`（単体の `<svg>`）
  - `GuestLanding()`、`LearnPointsBadge({ value })`、`Profile.points`

- [ ] **Step 1: 型を作る**

`frontend/src/components/world/types.ts`:

```ts
export type Tile = [number, number];

export type Landmark = {
  key: "spru_house" | "torii" | "stone_lantern";
  x: number;
  y: number;
};

export type WorldItem = {
  id: number;
  shop_item_id: number;
  name: string;
  asset_key: string | null;
  x: number | null;
  y: number | null;
};

export type WorldLand = {
  size: number;
  landmarks: Landmark[];
  paths: Tile[];
  blocked: Tile[];
  spru: { x: number; y: number };
};

export type WorldProfile = {
  id: number;
  points: number;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  coins: number;
};

export type WorldData = {
  land: WorldLand;
  items: WorldItem[];
  bag: WorldItem[];
  profile: WorldProfile;
  welcome_available: boolean;
  continue_stage_id: number | null;
};

export type ShopListItem = {
  id: number;
  name: string;
  price: number;
  type: "potion" | "title" | "decoration";
  currency: "coin" | "point";
  min_level: number;
  asset_key: string | null;
  locked: boolean;
  meta: { heal?: number; asset_key?: string } | null;
};
```

- [ ] **Step 2: アイテムの絵を作る**

`frontend/src/components/world/item-art.tsx`（キーは `config/world.php` の `asset_keys` と一致させる）:

```tsx
import type { ReactNode } from "react";

// 原点(0,0)がマスの中心(地面に接する点)。Blender製の画像に差し替えるときはこのファイルだけ直す
const ART: Record<string, ReactNode> = {
  bench: (
    <g transform="translate(-32 -52)">
      <ellipse cx={33} cy={55} rx={19} ry={5} fill="#2f5d2a" opacity={0.15} />
      <polygon points="24,40 50,53 50,44 24,31" fill="#b97b4c" />
      <polygon points="24,31 50,44 50,42 24,29" fill="#d9a06c" />
      <path d="M19 46 v7 M41 57 v4 M47 54 v4" stroke="#6e472b" strokeWidth={2.4} strokeLinecap="round" />
      <polygon points="16,44 42,57 50,53 24,40" fill="#dba56f" />
      <polygon points="16,44 42,57 42,60 16,47" fill="#a8703f" />
      <polygon points="42,57 50,53 50,56 42,60" fill="#8e5c33" />
    </g>
  ),
  flowerbed: (
    <g>
      <polygon points="-20,0 0,10 0,5 -20,-5" fill="#b27a4f" />
      <polygon points="0,10 20,0 20,-5 0,5" fill="#945f3a" />
      <polygon points="-20,-5 0,5 20,-5 0,-15" fill="#7a5a3c" />
      <circle cx={-10} cy={-5} r={2.6} fill="#f48aa4" />
      <circle cx={-3} cy={-8.5} r={2.6} fill="#ffd35c" />
      <circle cx={4} cy={-4.5} r={2.6} fill="#f48aa4" />
      <circle cx={10} cy={-6.5} r={2.6} fill="#b58cf0" />
      <circle cx={-2} cy={-1.5} r={2.6} fill="#ff9d5c" />
      <circle cx={3} cy={-11} r={2.4} fill="#b58cf0" />
      <circle cx={-7} cy={-9.5} r={1.8} fill="#6fbf5a" />
      <circle cx={8} cy={-1.5} r={1.8} fill="#6fbf5a" />
    </g>
  ),
  chochin: (
    <g transform="translate(-32 -52)">
      <ellipse cx={32} cy={54} rx={9} ry={3.5} fill="#2f5d2a" opacity={0.15} />
      <rect x={30.5} y={16} width={3} height={38} rx={1.2} fill="#6e472b" />
      <path d="M32 18 h10" stroke="#6e472b" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={41} cy={32} r={13} fill="#ffd98a" opacity={0.4} />
      <path d="M41 18 v4" stroke="#3b3226" strokeWidth={1.4} />
      <ellipse cx={41} cy={32} rx={7.5} ry={9.5} fill="#e5533f" />
      <path d="M34.2 28 h13.6 M33.6 32 h14.8 M34.2 36 h13.6" stroke="#c2402c" strokeWidth={1.1} />
      <rect x={37.5} y={21.5} width={7} height={2.8} rx={1} fill="#3b3226" />
      <rect x={37.5} y={40} width={7} height={2.8} rx={1} fill="#3b3226" />
    </g>
  ),
  tree: (
    <g>
      <ellipse cx={0} cy={2} rx={15} ry={6.5} fill="#2f5d2a" opacity={0.16} />
      <rect x={-2.6} y={-18} width={5.2} height={19} rx={2} fill="#9b6a45" />
      <circle cx={-7} cy={-24} r={10} fill="#57a45c" />
      <circle cx={7} cy={-24} r={10} fill="#4f9a55" />
      <circle cx={0} cy={-33} r={12} fill="#69b86b" />
      <circle cx={-4} cy={-37} r={5.5} fill="#8ccf85" />
    </g>
  ),
  sakura: (
    <g>
      <ellipse cx={0} cy={2} rx={16} ry={6.5} fill="#2f5d2a" opacity={0.16} />
      <rect x={-2.6} y={-18} width={5.2} height={19} rx={2} fill="#8a5a40" />
      <circle cx={-8} cy={-24} r={10.5} fill="#e38aa3" />
      <circle cx={8} cy={-24} r={10.5} fill="#dc7f9a" />
      <circle cx={0} cy={-34} r={13} fill="#f0a3b9" />
      <circle cx={-5} cy={-39} r={5.5} fill="#fbd3de" />
      <circle cx={-14} cy={0} r={1.5} fill="#f0a3b9" />
      <circle cx={12} cy={3} r={1.3} fill="#f0a3b9" />
    </g>
  ),
  vending: (
    <g>
      <ellipse cx={0} cy={2} rx={14} ry={6} fill="#2f5d2a" opacity={0.14} />
      <polygon points="-12,0 0,6 0,-18 -12,-24" fill="#e4583f" />
      <polygon points="0,6 12,0 12,-24 0,-18" fill="#bf432d" />
      <polygon points="-12,-24 0,-18 12,-24 0,-30" fill="#f07b63" />
      <polygon points="-11,-11.5 -1,-6.5 -1,-15.5 -11,-20.5" fill="#eaf6fa" />
      <circle cx={-9} cy={-14.7} r={1.3} fill="#3f8fd0" />
      <circle cx={-6} cy={-13.2} r={1.3} fill="#f2b632" />
      <circle cx={-3} cy={-11.7} r={1.3} fill="#5bb33e" />
      <circle cx={-9} cy={-18} r={1.3} fill="#e5533f" />
      <circle cx={-6} cy={-16.5} r={1.3} fill="#3f8fd0" />
      <circle cx={-3} cy={-15} r={1.3} fill="#f2b632" />
      <polygon points="-9,-1.5 -3,1.5 -3,-1.5 -9,-4.5" fill="#3a2e2a" />
    </g>
  ),
  bicycle: (
    <g transform="translate(-32 -52)">
      <ellipse cx={33} cy={55} rx={21} ry={4} fill="#2f5d2a" opacity={0.15} />
      <circle cx={19} cy={45} r={8.5} fill="none" stroke="#3b3226" strokeWidth={2.6} />
      <circle cx={46} cy={45} r={8.5} fill="none" stroke="#3b3226" strokeWidth={2.6} />
      <path
        d="M19 45 L27 32 L40 32 L46 45 M27 32 L32 45 L19 45 M32 45 L40 32"
        stroke="#e5533f"
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M40 32 L38 26 L43.5 25" stroke="#3b3226" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <path d="M26 32 L25 28.5" stroke="#3b3226" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M22 28 h6.5" stroke="#3b3226" strokeWidth={3.2} strokeLinecap="round" />
      <rect x={42.5} y={27} width={11} height={7.5} rx={2} fill="#d9a06c" stroke="#a8703f" strokeWidth={1.2} />
    </g>
  ),
  stall: (
    <g transform="translate(-32 -52)">
      <ellipse cx={32} cy={55} rx={22} ry={4.5} fill="#2f5d2a" opacity={0.15} />
      <rect x={15} y={22} width={3} height={18} fill="#8e5c33" />
      <rect x={46} y={22} width={3} height={18} fill="#8e5c33" />
      <rect x={11} y={15} width={42} height={9} rx={2} fill="#fff4e6" />
      <rect x={11} y={15} width={7} height={9} fill="#e5533f" />
      <rect x={25} y={15} width={7} height={9} fill="#e5533f" />
      <rect x={39} y={15} width={7} height={9} fill="#e5533f" />
      <path d="M11 24 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 q3.5 4 7 0 z" fill="#fff4e6" />
      <rect x={13} y={38} width={38} height={12} rx={2} fill="#d9a06c" />
      <rect x={13} y={38} width={38} height={3} fill="#b97b4c" />
      <rect x={24} y={41.5} width={16} height={7} rx={1.5} fill="#3f6fa0" />
      <circle cx={20} cy={52} r={4} fill="#6e472b" />
      <circle cx={44} cy={52} r={4} fill="#6e472b" />
      <ellipse cx={49.5} cy={30.5} rx={3.5} ry={4.5} fill="#e5533f" />
    </g>
  ),
};

// 絵が未登録のキーでも画面が壊れないようにする代わりの絵(プレゼント箱)
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
  return <>{(assetKey && ART[assetKey]) ?? FALLBACK}</>;
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
  return (
    <svg viewBox="-34 -62 68 72" width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
```

- [ ] **Step 3: 学習ポイントをプロフィール共有状態とヘッダーに足す**

`frontend/src/components/app/profile-provider.tsx` の `Profile` 型に1行追加:

```ts
  points: number;
```

`frontend/src/components/app/learn-points-badge.tsx`:

```tsx
import { Sprout } from "lucide-react";

/** 学習ポイント(正解でのみ貯まり、町のアイテムを買う通貨)の表示。課金コイン(PointsBadge)とは別物 */
export function LearnPointsBadge({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-600/25 px-2.5 py-1 backdrop-blur-sm ${className ?? ""}`}
      title="学習ポイント"
    >
      <Sprout className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
      <span className="text-xs font-bold text-white drop-shadow">
        {value.toLocaleString()}
        <span className="ml-0.5 text-[10px]">pt</span>
      </span>
    </div>
  );
}
```

`frontend/src/components/app/app-header.tsx`: importに `import { LearnPointsBadge } from "@/components/app/learn-points-badge";` を追加し、`<PointsBadge value={profile?.coins ?? 0} />` の直前に:

```tsx
        <LearnPointsBadge value={profile?.points ?? 0} />
```

- [ ] **Step 4: クイズ画面でポイントを反映・表示する**

`frontend/src/app/quiz/[stageId]/page.tsx`:

`type EconomyDelta` を:

```ts
type EconomyDelta = { hp?: number; xp?: number; coin?: number; point?: number };
```

`applyPartial({...})` の `coins: data.profile.coins,` の次に:

```ts
          points: data.profile.points,
```

正解表示の `{typeof lastDelta?.coin === "number" && (...)}` の次に:

```tsx
                    {typeof lastDelta?.point === "number" && (
                      <span>+{lastDelta.point}pt</span>
                    )}
```

- [ ] **Step 5: LPを切り出し、`/learn` を作る**

`frontend/src/components/app/guest-landing.tsx` を作る（今の `app/page.tsx` の guest 分岐のJSXをそのまま移したもの。見た目は変えない）:

```tsx
import Link from "next/link";

import { Button as AppButton } from "@/components/app/button";
import { CharacterPlaceholder } from "@/components/app/character-placeholder";
import { SceneBackground } from "@/components/app/scene-background";

const SAMPLE_COUNTRIES = [
  { code: "jp", name: "日本" },
  { code: "us", name: "アメリカ" },
  { code: "gb", name: "イギリス" },
  { code: "fr", name: "フランス" },
];

/** 未ログイン時のトップ(LP)。app/page.tsx から切り出し、内容は変えていない */
export function GuestLanding() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <SceneBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div>
          <h1 className="text-4xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            SpraGo
          </h1>
          <p className="mt-2 text-sm text-white/85 drop-shadow">
            興味が世界を広げ、世界が言葉を教えてくれる。
          </p>
        </div>

        <CharacterPlaceholder className="h-40 w-40" />

        <div className="flex flex-col items-center gap-3">
          <Link href="/register">
            <AppButton variant="primary" size="lg" className="shadow-lg">
              はじめる
            </AppButton>
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/85 drop-shadow hover:underline"
          >
            すでにアカウントをお持ちの方はこちら
          </Link>
        </div>

        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-xs text-white/70">
            登録なしでミニクイズを試す
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SAMPLE_COUNTRIES.map((country) => (
              <Link key={country.code} href={`/world/${country.code}`}>
                <AppButton variant="ghost" size="sm" className="text-white">
                  {country.name}
                </AppButton>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

`frontend/src/app/learn/page.tsx` を作る: 今の `app/page.tsx` 全体をコピーし、次の3点だけ変える。
1. 関数名 `Page` はそのまま、`GuestLanding` を使わずに未ログイン時は `/login` へ送る:

```tsx
        if (!userRes.ok) {
          router.replace("/login");
          return;
        }
```

2. `type Status = "checking" | "guest" | "ready";` を `type Status = "checking" | "ready";` にし、`if (status === "guest") { ... }` の分岐と、`.catch(() => { if (active) setStatus("guest"); })` を `.catch(() => { if (active) router.replace("/login"); })` にする
3. 使わなくなった `CharacterPlaceholder` のimportを消す

- [ ] **Step 6: `/` を一旦「LP or /learnへ転送」にする**

Task 6で町の画面に差し替えるまでの間、ログイン済みは `/learn` を表示させる。`frontend/src/app/page.tsx` を次の内容にする:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GuestLanding } from "@/components/app/guest-landing";
import { apiFetch } from "@/lib/api";

type Status = "checking" | "guest" | "ready";

export default function Page() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (userRes) => {
        if (!active) return;
        if (!userRes.ok) {
          setStatus("guest");
          return;
        }

        const activeRes = await apiFetch("/api/profiles/active");
        if (!active) return;
        const activeProfile = await activeRes.json();
        if (!activeProfile) {
          router.replace("/profiles");
          return;
        }

        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("guest");
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (status === "ready") router.replace("/learn");
  }, [status, router]);

  if (status === "guest") return <GuestLanding />;

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      読み込み中...
    </div>
  );
}
```

`frontend/src/app/travel/[countryId]/start/page.tsx` の「← 別の国を選ぶ」のリンク（123行目付近の `href="/"`）を `href="/learn"` にする（他の「ホームに戻る」は町がホームになるため `/` のままでよい）。

- [ ] **Step 7: ナビを5タブにする**

`frontend/src/components/app/bottom-nav.tsx` を次の内容にする:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ITEMS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/learn",
    label: "学ぶ",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5v13c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z M12 6v13" />
      </svg>
    ),
  },
  {
    href: "/passport",
    label: "旅する",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 13.5l7.5-2.2L14 4.5c.5-1 2-1 2.3.1l-1.4 6 4.6-1.4c1.4-.4 2.5 1.2 1.3 2.1L5.4 18.2c-.7.4-1.5-.1-1.5-.9z" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "ショップ",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3.5 9l1.5-5h14l1.5 5 M3.5 9c0 1.7 1.3 3 2.8 3s2.9-1.3 2.9-3c0 1.7 1.3 3 2.8 3s2.8-1.3 2.8-3c0 1.7 1.3 3 2.9 3s2.8-1.3 2.8-3 M5.5 12v8h13v-8 M10 20v-4.5h4V20" />
      </svg>
    ),
  },
  {
    href: "/bag",
    label: "バッグ",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7 M6 10a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z M9 14h6v3H9z" />
      </svg>
    ),
  },
  {
    href: "/",
    label: "世界",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx={12} cy={12} r={9} />
        <path d="M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 画面下部の常設ナビ。「学ぶほど世界が広がる」構成(2026-09-26 Owner決定)で
 * 学ぶ/旅する/ショップ/バッグ/世界の5つにした。各ページは下端の余白(pb-24)を確保すること。
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto grid max-w-[480px] grid-cols-5 rounded-t-[22px] bg-[#fffaf0] shadow-[0_-4px_14px_rgba(59,50,38,0.12)]"
      aria-label="メインナビゲーション"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-[68px] flex-col items-center justify-center gap-0.5 text-[11.5px] ${
              active ? "font-black text-[#3b7f26]" : "font-bold text-[#6b5d45] hover:text-[#3b3226]"
            }`}
          >
            {active && (
              <span className="absolute top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#5bb33e]" />
            )}
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 8: バッグ画面を作る**

`frontend/src/app/bag/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { SceneBackground } from "@/components/app/scene-background";
import { ItemIcon } from "@/components/world/item-art";
import type { WorldData } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

export default function Page() {
  const router = useRouter();
  const [world, setWorld] = useState<WorldData | null>(null);

  useEffect(() => {
    apiFetch("/api/world").then(async (res) => {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 422) {
        router.replace("/profiles");
        return;
      }
      if (res.ok) setWorld(await res.json());
    });
  }, [router]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-8 pb-28">
        <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          <AutoFurigana text="バッグ" />
        </h1>
        <p className="text-sm text-white/85 drop-shadow">
          <AutoFurigana text="まだ町に置いていないアイテムです。「置く」を押すと町で置く場所を選べます。" />
        </p>

        {!world ? (
          <p className="text-sm text-white/85">読み込み中...</p>
        ) : world.bag.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-black/25 p-4 text-sm text-white">
            <AutoFurigana text="バッグはからっぽです。ショップで町のアイテムを買ってみよう。" />
            <Link href="/shop" className="rounded-full bg-[#3b7f26] px-4 py-2 font-bold text-white">
              ショップへ
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {world.bag.map((item) => (
              <li
                key={item.id}
                className="flex flex-col items-center gap-2 rounded-2xl bg-[#fffaf0] p-3 text-[#3b3226] shadow-lg"
              >
                <ItemIcon assetKey={item.asset_key} size={64} />
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
        )}

        {world && (
          <p className="text-xs text-white/70">
            <AutoFurigana text={`町に置いているアイテム: ${world.items.length}こ`} />
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 9: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 10: ブラウザで確認する**

開発サーバー（ポート3010）で、ログイン済み（`test@example.com` / `password`）の状態で確認する:
- `/` を開くと `/learn` に移り、今までのホーム（国選択・ミニアプリ）がそのまま動く
- ログアウト状態で `/` を開くとLPが今までと同じ見た目で出る
- 下のナビが5タブになり、各タブで該当画面に移る（`/` は `/learn` へ転送されるのでこの時点では「世界」タブは学ぶ画面になる）
- `/bag` がからっぽ表示になる。tinkerでバッグにアイテムを1つ作る（`$p = App\Models\UserProfile::find(<id>); $p->worldItems()->create(['shop_item_id' => App\Models\ShopItem::where('type','decoration')->first()->id]);`）と、絵・名前・「置く」ボタンが出る
- クイズで正解すると「+10pt」が出て、ヘッダーの学習ポイントが増える

- [ ] **Step 11: コミット**

```bash
git add frontend/src/components/world/types.ts frontend/src/components/world/item-art.tsx frontend/src/components/app/guest-landing.tsx frontend/src/components/app/learn-points-badge.tsx frontend/src/components/app/profile-provider.tsx frontend/src/components/app/app-header.tsx frontend/src/components/app/bottom-nav.tsx frontend/src/app/page.tsx frontend/src/app/learn/page.tsx frontend/src/app/bag/page.tsx "frontend/src/app/quiz/[stageId]/page.tsx" "frontend/src/app/travel/[countryId]/start/page.tsx"
git commit -m "$(cat <<'EOF'
#NNNNN: feature:ナビを5タブにし、学ぶ(/learn)・バッグ(/bag)と学習ポイント表示を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 町の画面（描画・HUD・初回プレゼント・つづきから学ぶ）

**Files:**
- Create: `frontend/src/components/world/iso.ts`、`landmark-art.tsx`、`world-scene.tsx`、`world-hud.tsx`、`welcome-gift.tsx`、`world-screen.tsx`
- Create: `frontend/public/spru/idle.png`・`joy.png`・`front.png`
- Modify: `frontend/src/app/page.tsx`、`frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Task 5 の型・`ItemArt`・`BottomNav`、`GET /api/world`・`POST /api/world/welcome`・`GET /api/shop`
- Produces:
  - `iso.ts`: `HALF_W = 32`・`HALF_H = 16`・`LAND_THICKNESS = 40`・`tileCenter(x, y): {sx, sy}`・`tilePoints(x, y): string`・`tileKey(x, y): string`・`sceneViewBox(size): {x, y, width, height}`・`toPercent(sx, sy, vb): {left, top}`
  - `WorldScene` props: `{ land, items, validTiles: Set<string>, placing: boolean, onTileTap(x, y), onItemTap(item), spruMood: "idle" | "joy", spruLine: string, poppedItemId: number | null }`
  - `WorldScreen()`（Task 7で配置操作を足す）

- [ ] **Step 1: Spruの仮画像を置く**

設定画（`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/assets/mascot-logo.png`）から切り抜き済みの画像を配置する:

```bash
mkdir -p frontend/public/spru
cp /private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/spru/spru_diag.png frontend/public/spru/idle.png
cp /private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/spru/spru_joy.png frontend/public/spru/joy.png
cp /private/tmp/claude-501/-Users-katsuhiro-k1215-SmartSprouts/7b866672-2217-4954-898a-6df8d903cf68/scratchpad/spru/spru_front.png frontend/public/spru/front.png
```

スクラッチの画像が無い場合は、次のスクリプトで設定画から作り直す（切り出し範囲は元画像1254×1254px上の座標、背景は無彩色なので彩度で分離する）:

```bash
python3 - <<'EOF'
from PIL import Image
from collections import deque
src = Image.open('/Users/katsuhiro.k1215/SmartSprouts/company/mascot/assets/mascot-logo.png').convert('RGB')
for name, box in {'idle': (515, 575, 675, 815), 'front': (30, 575, 200, 815), 'joy': (745, 920, 930, 1110)}.items():
    im = src.crop(box); w, h = im.size; px = im.load()
    chroma = [[max(px[x, y]) - min(px[x, y]) for x in range(w)] for y in range(h)]
    bg = [[False] * w for _ in range(h)]; q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if chroma[y][x] < 14 and not bg[y][x]: bg[y][x] = True; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if chroma[y][x] < 14 and not bg[y][x]: bg[y][x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and chroma[ny][nx] < 14:
                bg[ny][nx] = True; q.append((nx, ny))
    out = Image.new('RGBA', (w, h)); op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if bg[y][x]:
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                op[x, y] = (40, 50, 30, int(max(0.0, min(0.5, (240 - lum) / 240 * 2.4)) * 255))
            else:
                op[x, y] = (r, g, b, 255)
    out.crop(out.getbbox()).save(f'frontend/public/spru/{name}.png')
EOF
```

- [ ] **Step 2: マス目計算を作る**

`frontend/src/components/world/iso.ts`:

```ts
// マス目(x,y) ↔ SVG座標の変換。菱形1マス = 幅64・高さ32(2:1のアイソメ)
export const HALF_W = 32;
export const HALF_H = 16;
export const LAND_THICKNESS = 40;

export type ViewBox = { x: number; y: number; width: number; height: number };

export function tileCenter(x: number, y: number): { sx: number; sy: number } {
  return { sx: (x - y) * HALF_W, sy: (x + y) * HALF_H + HALF_H };
}

export function tilePoints(x: number, y: number): string {
  const { sx, sy } = tileCenter(x, y);
  return `${sx},${sy - HALF_H} ${sx + HALF_W},${sy} ${sx},${sy + HALF_H} ${sx - HALF_W},${sy}`;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function sceneViewBox(size: number): ViewBox {
  const halfWidth = size * HALF_W;
  const top = -84; // 奥のマスの目印やアイテムが上に伸びる分
  const bottom = size * HALF_H * 2 + LAND_THICKNESS + 24;
  return { x: -halfWidth - 16, y: top, width: halfWidth * 2 + 32, height: bottom - top };
}

export function toPercent(sx: number, sy: number, vb: ViewBox): { left: number; top: number } {
  return {
    left: ((sx - vb.x) / vb.width) * 100,
    top: ((sy - vb.y) / vb.height) * 100,
  };
}
```

- [ ] **Step 3: 目印の絵を作る**

`frontend/src/components/world/landmark-art.tsx`:

```tsx
import type { ReactNode } from "react";

// 原点(0,0)がマスの中心。最初から町にある、動かせない目印
const ART: Record<string, ReactNode> = {
  spru_house: (
    <g>
      <ellipse cx={0} cy={4} rx={30} ry={12} fill="#2f5d2a" opacity={0.15} />
      <polygon points="-24,0 0,12 0,-14 -24,-26" fill="#fbf1dc" />
      <polygon points="0,12 24,0 24,-26 12,-38 0,-14" fill="#e8d4b0" />
      <polygon points="-16,4 -8,8 -8,-6 -16,-10" fill="#b8734c" />
      <circle cx={-9.8} cy={0.6} r={0.9} fill="#f6d08a" />
      <polygon points="-23,-9.5 -19,-7.5 -19,-15.5 -23,-17.5" fill="#9fd6e6" stroke="#fffaf0" strokeWidth={1} />
      <polygon points="-6,-1 -2,1 -2,-7 -6,-9" fill="#9fd6e6" stroke="#fffaf0" strokeWidth={1} />
      <polygon points="8,-4 16,-8 16,-16 8,-12" fill="#9fd6e6" stroke="#fffaf0" strokeWidth={1.2} />
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
  ),
  torii: (
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
  stone_lantern: (
    <g>
      <ellipse cx={0} cy={1} rx={8} ry={3.5} fill="#2f5d2a" opacity={0.14} />
      <rect x={-5} y={-4} width={10} height={4} rx={1} fill="#b8b0a2" />
      <rect x={-2} y={-14} width={4} height={10} fill="#c9c1b3" />
      <rect x={-6} y={-17} width={12} height={3} rx={1} fill="#b8b0a2" />
      <rect x={-4.5} y={-24} width={9} height={7} rx={1} fill="#d6cfc1" />
      <rect x={-2.2} y={-22.5} width={4.4} height={4} fill="#ffd98a" />
      <polygon points="-8,-24 0,-30 8,-24" fill="#a39b8d" />
      <circle cx={0} cy={-31} r={1.6} fill="#a39b8d" />
    </g>
  ),
};

export function LandmarkArt({ landmarkKey }: { landmarkKey: string }) {
  return <>{ART[landmarkKey] ?? null}</>;
}
```

- [ ] **Step 4: アニメーションを足す**

`frontend/src/app/globals.css` の `@media (prefers-reduced-motion: reduce) {` （`.animate-scene-drift,` で始まるブロック）の直前に追加:

```css
  @keyframes spru-bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
  .animate-spru-bob {
    animation: spru-bob 2.4s ease-in-out infinite;
  }

  @keyframes spru-hop {
    0% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-14px);
    }
    55% {
      transform: translateY(0);
    }
    75% {
      transform: translateY(-5px);
    }
    100% {
      transform: translateY(0);
    }
  }
  .animate-spru-hop {
    animation: spru-hop 0.9s ease-out 2;
  }

  @keyframes tile-pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 0.95;
    }
  }
  .animate-tile-pulse {
    animation: tile-pulse 1.1s ease-in-out infinite;
  }

  @keyframes pop-in {
    0% {
      transform: scale(0.3);
      opacity: 0;
    }
    60% {
      transform: scale(1.12);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  .animate-pop-in {
    animation: pop-in 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) both;
    transform-box: fill-box;
    transform-origin: 50% 90%;
  }
```

同じブロックのセレクタ一覧（`.animate-stage-intro-subtitle {` の直前）に追加:

```css
    .animate-spru-bob,
    .animate-spru-hop,
    .animate-tile-pulse,
    .animate-pop-in,
```

- [ ] **Step 5: 町の描画コンポーネントを作る**

設計書7-2の `Spru` 部品は、独立したコンポーネントにせず `WorldScene` の中でSVGの `<image>` として描く（アイテムとの前後関係を、他の物と同じ「奥から手前」の順で正しく重ねるため）。吹き出しもここで出す。

`frontend/src/components/world/world-scene.tsx`:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";

import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ItemArt } from "./item-art";
import { LandmarkArt } from "./landmark-art";
import type { WorldItem, WorldLand } from "./types";

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
  spruMood,
  spruLine,
  poppedItemId,
}: {
  land: WorldLand;
  items: WorldItem[];
  validTiles: Set<string>;
  placing: boolean;
  onTileTap: (x: number, y: number) => void;
  onItemTap: (item: WorldItem) => void;
  spruMood: "idle" | "joy";
  spruLine: string;
  poppedItemId: number | null;
}) {
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
  const spru = tileCenter(land.spru.x, land.spru.y);
  const bubble = toPercent(spru.sx, spru.sy - 60, vb);

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
              {o.kind === "spru" &&
                (spruMood === "joy" ? (
                  <image href="/spru/joy.png" x={-32} y={-60} width={64} height={62} className="animate-spru-hop" />
                ) : (
                  <image href="/spru/idle.png" x={-16} y={-55} width={31} height={55} className="animate-spru-bob" />
                ))}
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
        : placed.map((item) => {
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

      <div
        className="pointer-events-none absolute max-w-[62%] -translate-x-[18%] -translate-y-full rounded-2xl bg-white px-3 py-2 text-[12.5px] leading-relaxed font-bold text-[#3b3226] shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
        style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }}
        aria-live="polite"
      >
        <AutoFurigana text={spruLine} />
        <span className="absolute -bottom-1.5 left-[18%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: HUDと初回プレゼントを作る**

`frontend/src/components/world/world-hud.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { Heart, Sprout } from "lucide-react";

import type { WorldProfile } from "./types";

export function WorldHud({
  name,
  profile,
  nextUnlock,
}: {
  name: string;
  profile: WorldProfile;
  nextUnlock: string | null;
}) {
  // レベルはXP100ごとに上がる(UserProfile::applyEconomy)
  const xpInLevel = profile.xp % 100;

  return (
    <header className="rounded-b-[22px] bg-[#fffaf0] px-3.5 pt-2.5 pb-2.5 text-[#3b3226] shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
      <div className="flex h-9 items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[22px] font-bold text-[#2f4a22]">
          <Image src="/logo.svg" alt="" width={28} height={28} aria-hidden />
          SpraGo
        </Link>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-[#fdecea] px-2.5 py-1 text-sm font-semibold text-[#8a2c22]">
            <Heart className="h-4 w-4 fill-[#e5533f] text-[#e5533f]" aria-hidden />
            <span className="sr-only">HP</span>
            {profile.hp}/{profile.max_hp}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#eef7e6] px-2.5 py-1 text-[15px] font-bold text-[#2e6b1c]">
            <Sprout className="h-4 w-4" aria-hidden />
            <span className="sr-only">学習ポイント</span>
            {profile.points.toLocaleString()}
            <span className="text-[11px]">pt</span>
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#7cc35a] bg-[#e3f3d6]">
          <Image src="/spru/front.png" alt="" width={40} height={40} className="h-10 w-10 object-cover object-[50%_40%]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-black">{name}</span>
            <span className="rounded-full bg-[#3b7f26] px-2 text-xs font-bold text-white">Lv.{profile.level}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[#efe5cf]"
            role="progressbar"
            aria-label="次のレベルまで"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={xpInLevel}
          >
            <div className="h-2 rounded-full bg-[#5bb33e] transition-[width] duration-500" style={{ width: `${xpInLevel}%` }} />
          </div>
          <div className="flex justify-between gap-2 text-[11.5px] font-bold text-[#6b5d45]">
            <span className="truncate">{nextUnlock ?? ""}</span>
            <span className="shrink-0">あと {100 - xpInLevel} XP</span>
          </div>
        </div>
      </div>
    </header>
  );
}
```

`frontend/src/components/world/welcome-gift.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";

export function WelcomeGift({ amount, busy, onReceive }: { amount: number; busy: boolean; onReceive: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-gift-title"
        className="flex w-full max-w-[322px] flex-col items-center gap-2.5 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
      >
        <Image src="/spru/joy.png" alt="よろこぶSpru" width={110} height={106} className="animate-spru-hop" />
        <h2 id="welcome-gift-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text="ようこそ、自分の町へ！" />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={`旅のおこづかいだよ。${amount}ptで町にアイテムを置いてみよう。`} />
        </p>
        <button
          type="button"
          onClick={onReceive}
          disabled={busy}
          className="mt-1.5 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19] disabled:opacity-70"
        >
          {busy ? "受け取り中..." : `${amount}ptを受け取る`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 町の画面全体を作る**

`frontend/src/components/world/world-screen.tsx`（Task 7で配置操作を足す。ここでは表示・初回プレゼント・つづきから学ぶまで）:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { apiFetch } from "@/lib/api";

import type { ShopListItem, WorldData, WorldItem } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";

const WELCOME_AMOUNT = 100;
const DEFAULT_LINE = "もうすぐ旅に出られそう！ 学んでポイントをためよう";

type SpruState = { mood: "idle" | "joy"; line: string };

export function WorldScreen() {
  const router = useRouter();
  const { profile: sharedProfile, applyPartial } = useProfile();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [shop, setShop] = useState<ShopListItem[]>([]);
  const [spru, setSpru] = useState<SpruState>({ mood: "idle", line: DEFAULT_LINE });
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const joyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cheer = useCallback((line: string) => {
    if (joyTimer.current) clearTimeout(joyTimer.current);
    setSpru({ mood: "joy", line });
    joyTimer.current = setTimeout(() => setSpru((prev) => ({ ...prev, mood: "idle" })), 2600);
  }, []);

  useEffect(() => () => {
    if (joyTimer.current) clearTimeout(joyTimer.current);
  }, []);

  useEffect(() => {
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
      }
    });
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShop(await res.json());
    });
  }, [router, applyPartial]);

  async function receiveWelcome() {
    setWelcomeBusy(true);
    try {
      const res = await apiFetch("/api/world/welcome", { method: "POST" });
      if (!res.ok) return;
      const data: { granted: boolean; points: number } = await res.json();
      setWorld((prev) => (prev ? { ...prev, welcome_available: false, profile: { ...prev.profile, points: data.points } } : prev));
      applyPartial({ points: data.points });
      cheer("ポイントでショップのアイテムを買ってみよう！");
    } finally {
      setWelcomeBusy(false);
    }
  }

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
    <div className="min-h-screen bg-[#8fd4e9]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} nextUnlock={nextUnlock} />

        <p className="mx-auto mt-3 rounded-full bg-[rgba(255,250,240,0.94)] px-3 py-1 text-[12.5px] font-black shadow-[0_2px_6px_rgba(59,50,38,0.12)]">
          日本 · はじまりの町
        </p>

        <div className="mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={new Set()}
            placing={false}
            onTileTap={() => {}}
            onItemTap={(_item: WorldItem) => {}}
            spruMood={spru.mood}
            spruLine={spru.line}
            poppedItemId={null}
          />
        </div>

        <Link
          href={continueHref}
          className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
        >
          <BookOpen className="h-5 w-5" aria-hidden />
          つづきから学ぶ
        </Link>
      </div>

      <BottomNav />

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}
    </div>
  );
}
```

- [ ] **Step 8: `/` を町の画面に切り替える**

`frontend/src/app/page.tsx` の転送用の `useEffect`（`router.replace("/learn")`）を削除し、描画部分を次にする。importに `import { Suspense } from "react";` と `import { WorldScreen } from "@/components/world/world-screen";` を追加（`useState`・`useEffect` と同じ `react` のimportにまとめる）:

```tsx
  if (status === "guest") return <GuestLanding />;

  const loading = (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      読み込み中...
    </div>
  );

  if (status === "checking") return loading;

  // WorldScreen は Task 7 で useSearchParams(?place=)を使うため、本番ビルドの要件どおり Suspense で囲む
  return (
    <Suspense fallback={loading}>
      <WorldScreen />
    </Suspense>
  );
```

- [ ] **Step 9: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 10: ブラウザで確認する（スマホ幅390pxとPC幅）**

- ログイン済みで `/` を開くと町の画面が出る。上部にロゴ・HP・学習ポイント・Spruのアバター・レベル・XPバー・「Lv.2で 木」のような次の解放
- 初回は「ようこそ、自分の町へ！」が出て、受け取るとポイントが100増え、Spruが跳ねて吹き出しが変わる。再読み込みしても二度と出ない
- 町: 7×7の土地、道、Spruの家・鳥居・灯籠2つ、道に立つSpruと吹き出し
- tinkerで置いたアイテム（`$item->update(['x' => 5, 'y' => 5])`）が正しいマスに、奥から手前の順で重なって描かれる
- 「つづきから学ぶ」でクイズまたは `/learn` へ移る
- 下のナビの「世界」が選択状態
- OSの「視差効果を減らす」をオンにするとSpruが動かない

- [ ] **Step 11: コミット**

```bash
git add frontend/public/spru frontend/src/components/world/iso.ts frontend/src/components/world/landmark-art.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/world-hud.tsx frontend/src/components/world/welcome-gift.tsx frontend/src/components/world/world-screen.tsx frontend/src/app/page.tsx frontend/src/app/globals.css
git commit -m "$(cat <<'EOF'
#NNNNN: feature:ログイン後のホームを町の画面にする(描画・HUD・初回プレゼント・つづきから学ぶ)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 置く・動かす・しまう操作（`?place=` 対応）

**Files:**
- Create: `frontend/src/components/world/placement-bar.tsx`、`frontend/src/components/world/item-action-sheet.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`

**Interfaces:**
- Consumes: Task 6 の `WorldScreen`・`WorldScene`・`tileKey`、`PATCH /api/world/items/{id}`（Task 4）
- Produces: `/?place={worldItemId}` で開くと、そのアイテムの配置モードになる（Task 8のショップとバッグが使う）

- [ ] **Step 1: 案内バーと操作シートを作る**

`frontend/src/components/world/placement-bar.tsx`:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";

import { ItemIcon } from "./item-art";
import type { WorldItem } from "./types";

export function PlacementBar({ item, onCancel }: { item: WorldItem; onCancel: () => void }) {
  return (
    <div className="fixed inset-x-0 top-3 z-40 mx-auto flex w-[calc(100%-28px)] max-w-[452px] items-center gap-2.5 rounded-2xl bg-[#fffaf0] py-2 pr-2 pl-2.5 text-[#3b3226] shadow-[0_6px_16px_rgba(59,50,38,0.18)]">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f5efe1]">
        <ItemIcon assetKey={item.asset_key} size={44} />
      </div>
      <p className="flex-1 text-[13.5px] leading-snug font-bold">
        <AutoFurigana text={`「${item.name}」を置く場所をタップしてね`} />
      </p>
      <button type="button" onClick={onCancel} className="h-11 rounded-xl bg-[#efe5cf] px-3.5 text-[13px] font-black">
        やめる
      </button>
    </div>
  );
}
```

`frontend/src/components/world/item-action-sheet.tsx`:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";

import { ItemIcon } from "./item-art";
import type { WorldItem } from "./types";

export function ItemActionSheet({
  item,
  onMove,
  onPutAway,
  onClose,
}: {
  item: WorldItem;
  onMove: () => void;
  onPutAway: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-action-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-[#f5efe1]">
            <ItemIcon assetKey={item.asset_key} size={56} />
          </div>
          <h2 id="item-action-title" className="text-lg font-black">
            {item.name}
          </h2>
        </div>
        <button type="button" onClick={onMove} className="h-12 rounded-2xl bg-[#3b7f26] text-base font-black text-white">
          <AutoFurigana text="動かす" />
        </button>
        <button type="button" onClick={onPutAway} className="h-12 rounded-2xl bg-[#efe5cf] text-base font-black">
          <AutoFurigana text="バッグにしまう" />
        </button>
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `WorldScreen` に配置操作を足す**

`frontend/src/components/world/world-screen.tsx` を変更する。

importを追加・変更:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { useSound } from "@/components/app/sound-provider";
import { apiFetch } from "@/lib/api";

import { tileKey } from "./iso";
import { ItemActionSheet } from "./item-action-sheet";
import { PlacementBar } from "./placement-bar";
import type { ShopListItem, WorldData, WorldItem } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";
```

`WorldScreen` の先頭（`const router = useRouter();` の後）に追加:

```tsx
  const searchParams = useSearchParams();
  const placeParam = searchParams.get("place");
  const { play } = useSound();
  const [placingId, setPlacingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [poppedItemId, setPoppedItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
```

`receiveWelcome` の前に、`?place=` の処理・置けるマスの計算・操作関数を追加:

```tsx
  // ショップやバッグから /?place=ID で来たら、そのアイテムの配置モードにする。
  // 自分のアイテムでないIDや存在しないIDは無視して普通に表示する
  useEffect(() => {
    if (!world || !placeParam) return;
    const id = Number(placeParam);
    const exists = [...world.items, ...world.bag].some((item) => item.id === id);
    if (exists) setPlacingId(id);
    router.replace("/");
  }, [world, placeParam, router]);

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
      cheer(`${item.name}を置いたよ！ 町がにぎやかになったね`);
    }
  }

  async function putAway(item: WorldItem) {
    setSelected(null);
    setMessage(null);
    if (await moveItem(item, null, null)) {
      cheer(`${item.name}をバッグにしまったよ`);
    }
  }
```

`return (...)` の中を次のように変える（`WorldHud` の直後に案内・メッセージを追加、`WorldScene` のpropsを本物にする、「つづきから学ぶ」は配置中は隠す、最後にシートを追加）:

```tsx
  return (
    <div className="min-h-screen bg-[#8fd4e9]">
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

        <div className="mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={validTiles}
            placing={placingItem !== null}
            onTileTap={placeAt}
            onItemTap={setSelected}
            spruMood={spru.mood}
            spruLine={spru.line}
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
```

- [ ] **Step 3: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: ブラウザで確認する（スマホ幅390pxとPC幅）**

- tinkerでバッグにアイテムを作り、`/bag` の「置く」→ 町で置けるマスだけが光る。目印・道・他のアイテムのマスは光らない
- 光るマスをタップ → アイテムがポンと現れ、効果音が鳴り、Spruが跳ねて「〇〇を置いたよ！」
- 置いたアイテムをタップ → シート →「動かす」→ 元のマスも含めて光る → 別のマスへ移動できる
- 「バッグにしまう」→ 町から消え、`/bag` に戻っている
- 「やめる」で配置モードを抜けられ、アイテムはバッグに残る
- `/?place=99999`（存在しない）と、他のプロフィールのアイテムIDで開いても普通の町の画面になる（レビューで特に見る点5）
- 開発者ツールでネットワークを「オフライン」にして置くと、元に戻り「通信エラーが発生しました。」が出る

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/world/placement-bar.tsx frontend/src/components/world/item-action-sheet.tsx frontend/src/components/world/world-screen.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町でアイテムを置く・動かす・バッグにしまう操作を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: ショップの2段構成とOwnerの登録画面

**Files:**
- Modify: `frontend/src/app/shop/page.tsx`、`frontend/src/app/owner/dashboard/shop-items/page.tsx`

**Interfaces:**
- Consumes: `GET /api/shop`・`POST /api/shop/{id}/purchase`（Task 2）、`ShopListItem`・`ItemIcon`（Task 5）、`/?place=`（Task 7）

- [ ] **Step 1: ショップ画面を2段にする**

`frontend/src/app/shop/page.tsx` を変更する。

1. `useSearchParams` を使っているため、今の `export default function Page()` を `function ShopContent()` に改名し、ファイル末尾に追加（本番ビルドの要件）:

```tsx
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          読み込み中...
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
```

`import { useEffect, useState } from "react";` を `import { Suspense, useEffect, useState } from "react";` にする。

2. importに追加:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";
import { LearnPointsBadge } from "@/components/app/learn-points-badge";
import { useProfile } from "@/components/app/profile-provider";
import { ItemIcon } from "@/components/world/item-art";
import type { ShopListItem } from "@/components/world/types";
```

3. 型を差し替える:
   - `type ItemType = "potion" | "plane" | "background" | "character" | "title";` を `type ItemType = "potion" | "plane" | "background" | "character" | "title" | "decoration";` にする
   - `TYPE_ICON`・`TYPE_LABEL` の型を `Record<Exclude<ItemType, "decoration">, string>` にする（町のアイテムは絵文字アイコンを使わず `ItemIcon` で描くため、値は追加しない）
   - `type ShopItem` を削除し、`useState<ShopItem[] | null>` を `useState<ShopListItem[] | null>` にする
   - `type Profile` に `points: number; level: number;` を追加する

4. `ShopContent` の中で `const { applyPartial } = useProfile();` を追加し、`items` を2つに分ける（`items === null` の判定の後）:

```tsx
  const decorations = items.filter((item) => item.type === "decoration");
  const coinItems = items.filter((item) => item.type !== "decoration");
```

5. 購入関数を2つにする。既存の `handlePurchase` の成功時に `applyPartial({ coins: data.profile.coins, points: data.profile.points, hp: data.profile.hp });` を追加し、町のアイテム用を追加:

```tsx
  async function handleDecorationPurchase(item: ShopListItem) {
    setPurchasingId(item.id);
    setMessage(null);

    try {
      const res = await apiFetch(`/api/shop/${item.id}/purchase`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message ?? "購入に失敗しました。");
        return;
      }

      applyPartial({ points: data.profile.points, coins: data.profile.coins });
      router.push(`/?place=${data.world_item.id}`);
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setPurchasingId(null);
    }
  }
```

6. 見出しの右の `<PointsBadge value={profile?.coins ?? 0} />` を次にする:

```tsx
          <div className="flex items-center gap-2">
            <LearnPointsBadge value={profile?.points ?? 0} />
            <PointsBadge value={profile?.coins ?? 0} />
          </div>
```

7. メッセージ表示の直後（コイン購入セクションの前）に町のアイテムの段を追加:

```tsx
        {decorations.length > 0 && (
          <section className="flex flex-col gap-3" aria-labelledby="shop-decorations">
            <h2 id="shop-decorations" className="text-sm font-semibold text-white/90 drop-shadow">
              <AutoFurigana text="町のアイテム(学習ポイントで買う)" />
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {decorations.map((item) => {
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

8. 既存のコインアイテム一覧の `items.length === 0 ? ... : ... items.map(...)` の `items` を `coinItems` に置き換える（見出し `<h2>` を段の頭に追加: `<h2 className="text-sm font-semibold text-white/90 drop-shadow">べんりアイテム(コインで買う)</h2>`）。`TYPE_ICON[item.type]`・`TYPE_LABEL[item.type]` は `item.type as Exclude<ItemType, "decoration">` で参照する。

- [ ] **Step 2: Ownerの登録画面で町のアイテムを扱えるようにする**

`frontend/src/app/owner/dashboard/shop-items/page.tsx`:

1. `TYPES` の末尾に `{ value: "decoration", label: "町のアイテム" },` を追加し、直後に定数を追加（`config/world.php` の `asset_keys` と一致させる）:

```tsx
const ASSET_KEYS = [
  { value: "bench", label: "ベンチ" },
  { value: "flowerbed", label: "花だん" },
  { value: "chochin", label: "ちょうちん" },
  { value: "tree", label: "木" },
  { value: "sakura", label: "桜の木" },
  { value: "vending", label: "自動販売機" },
  { value: "bicycle", label: "自転車" },
  { value: "stall", label: "屋台" },
] as const;
```

2. `type ShopItem` に `min_level: number;` を足し、`meta` を `{ heal?: number; asset_key?: string } | null` にする。`type FormValues` に `minLevel: string; assetKey: string;`、`emptyForm` に `minLevel: "1", assetKey: "bench",` を足す。

3. `openEdit` の `setValues({...})` に追加:

```tsx
      minLevel: String(item.min_level ?? 1),
      assetKey: item.meta?.asset_key ?? "bench",
```

4. `handleSubmit` の `payload` を:

```tsx
    const payload = {
      name: values.name,
      price: Number(values.price) || 0,
      type: values.type,
      min_level: Number(values.minLevel) || 1,
      meta:
        values.type === "potion" && values.heal
          ? { heal: Number(values.heal) }
          : values.type === "decoration"
            ? { asset_key: values.assetKey }
            : null,
    };
```

5. 価格ラベル `価格(Coin)` を `{values.type === "decoration" ? "価格(学習ポイント)" : "価格(Coin)"}` にし、`{values.type === "potion" && (...)}` の後に追加:

```tsx
            {values.type === "decoration" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-min-level">必要レベル</Label>
                  <Input
                    id="item-min-level"
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={values.minLevel}
                    onChange={(e) => setValues((prev) => ({ ...prev, minLevel: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-asset-key">絵</Label>
                  <Select
                    value={values.assetKey}
                    onValueChange={(value) => setValues((prev) => ({ ...prev, assetKey: value }))}
                  >
                    <SelectTrigger id="item-asset-key">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_KEYS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
```

6. 一覧の各行で、`decoration` のときは `{item.meta?.heal ? ...}` の代わりに ` ・ Lv.${item.min_level}〜` を表示する（211行目付近の表示に `{item.type === "decoration" ? \` ・ Lv.${item.min_level}〜\` : ""}` を追加）。

- [ ] **Step 3: 型チェックと本番ビルド**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: エラーなし（`useSearchParams` の Suspense 漏れがあるとビルドが失敗する）

- [ ] **Step 4: ブラウザで確認する**

- ショップが「町のアイテム」「べんりアイテム」「コインを購入」の構成になり、ヘッダーに学習ポイントとコインが並ぶ
- 町のアイテム: 必要レベル未満は鍵つきで「ポイントはOK / レベルが足りない」または「レベルとポイントが必要」、ポイント不足は「ポイント不足」、買えるものは「買って置く」
- 「買って置く」→ 町の画面に移り、そのアイテムの配置モードになる → 置ける。途中で「やめる」とバッグに残る
- 回復薬・称号はコインで今まで通り買える
- Ownerダッシュボードのショップで「町のアイテム」を選ぶと必要レベル・絵を指定して登録でき、プレイヤーのショップに並ぶ

- [ ] **Step 5: コミット**

```bash
git add frontend/src/app/shop/page.tsx frontend/src/app/owner/dashboard/shop-items/page.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:ショップを町のアイテム/べんりアイテムの2段にし、Ownerが町のアイテムを登録できるようにする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 仕上げ（通し確認・ドキュメント・マージ）

**Files:**
- Modify: `SPEC.md`、`TASKS.md`、`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md`

- [ ] **Step 1: 全テスト**

Run: `./vendor/bin/sail artisan test`
Expected: 全件PASS（既存97件＋本計画の追加分）

- [ ] **Step 2: 通しのブラウザ確認（設計書8-2）**

新しいプロフィールを作って、スマホ幅（390px）とPC幅の両方で:
1. `/` で100ptを受け取る → ショップで「ベンチ」を買って置く → 動かす → しまう → バッグから置き直す
2. レベル不足・ポイント不足の表示を確認する
3. 5タブを一通り行き来する。`/learn` が今までのホームと同じように動く
4. ログアウトして、LPが変わっていないことを確認する
5. クイズで正解して「+10pt」が出て、町に戻るとポイントが増えている

- [ ] **Step 3: SPEC.md を更新する**

`SPEC.md`:
- 冒頭のコンセプト（14〜15行目）の後に追記: 「2026-09-26 コンセプト転換（Owner承認）: 『言葉を学ぶことで、世界を旅できるようになる（学ぶほど世界が広がる）』。学習→学習ポイント→町のアイテム購入・配置→レベルアップ→新しい土地・国の解放、の生活シミュレーション型へ。①ワールド画面＋買って置く（実装済み、`docs/design/2026-09-26-world-town-design.md`）②土地の解放と旅 ③復習を混ぜた出題、の順に進める」
- ボトムナビの記述（86行目付近）の後に追記: 「✅（2026-09-26変更）5タブ（学ぶ/旅する/ショップ/バッグ/世界）に刷新。ログイン後のホームは町の画面、国選択は `/learn` に移動」
- 4-3に追記: 「✅ 学習ポイント: 正解+10、ステージクリア+50、初回+100（`config/world.php`）。課金コインとは別通貨で、町のアイテムはこれでしか買えない」
- 4-5に追記: 「✅ `decoration`（町のアイテム）: 学習ポイント払い・必要レベルつき。購入するとバッグに入り、町の7×7マスに自由に置ける（`profile_world_items`）。購入処理はトランザクション＋行ロックで二重引き落としを防止（コイン払いも同様）」
- 新しい節「4-8. ワールド（自分の町）」を追加し、設計書へのリンクと、Spruは設定画から切り抜いた仮画像を使用中であることを書く

- [ ] **Step 4: TASKS.md を更新する**

`TASKS.md` に節「ワールド画面（学ぶほど世界が広がる）」を追加:
- [x] ①ワールド画面＋ポイントで買って置く（2026-09-26、設計書・計画書のパス）
- [ ] ②レベルによる土地の解放と、新しい国への旅（雲に隠れた竹林・インドネシアの島・「旅のじゅんび」リスト）
- [ ] ③復習を混ぜた「今日のレッスン」（「つづきから学ぶ」を置き換える）
- [ ] 町以外の画面の見た目を新しい明るい配色にそろえる
- [ ] Spru Master（Blender）ができたら `public/spru/` とアイテムの絵を差し替える
- [ ] （既知）フロントのテストフレームワーク未導入

保留中の「動物ジャンルの着手」「食べ物ジャンルの着手」はそのまま残す。

- [ ] **Step 5: マスコット部の資料に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md` の「主要な意思決定（サマリ）」に追記:

「- **Spra-goで仮素材を使用（2026-09-26）**: Spra-goの町の画面（`projects/Spra-go/frontend/public/spru/`）で、`assets/mascot-logo.png` の設定画から切り抜いた仮画像（待機・喜ぶ・正面）を使用中。Spru Masterが完成したら、そこから書き出した画像に差し替える」

（このファイルはSpra-goのリポジトリ外のため、Spra-goのコミットには含めない）

- [ ] **Step 6: ドキュメントをコミットし、mainへマージしてpushする**

```bash
git add SPEC.md TASKS.md
git commit -m "$(cat <<'EOF'
#NNNNN: docs:コンセプト転換(学ぶほど世界が広がる)とワールド画面の実装をSPEC/TASKSに反映

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git checkout main
git merge --no-ff feature/world-town
./vendor/bin/sail artisan test
git push origin main
```

Expected: マージ後も全テストPASS、pushが成功する（Keychainの確認が出た場合はOwnerに入力してもらう）
