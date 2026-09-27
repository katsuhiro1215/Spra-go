# 街づくり — 広がる地図・雲の区画・大きな建物（E回）— 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** 町（7×7）の手前に竹林（Lv.4）・海辺（Lv.7）・丘（Lv.10）が続く12×12の地図を作り、開いていない区画は雲で隠し、開いたら次に町を開いたときに祝う。地図は枠からはみ出た分をドラッグで見る。噴水・五重塔・お城・タワーなど2×2マスの大きな建物と、新しいアイテム8種を足す。

**アーキテクチャ:** 土地の形（区画・目印・道）は `config/world.php` に持ち、`app/Support/WorldLand.php` がその人のレベルで開いている部分を返す。DBに足すのは「祝った区画のキー」（`user_profiles.world_plots_seen`）だけ。2×2かどうかは絵のキーで決め（`asset_footprints`）、置けるかのチェックは `app/Support/WorldPlacement.php` にまとめて、プロフィールをロックしてから行う。画面は、マス・区画・置ける場所の計算（`land.ts`）と、地図の枠の縮尺・スクロール位置の計算（`map-view.ts`）を描画から切り離してテストし、`town-map.tsx`（地図の枠）で今の `WorldScene` を包む。

**技術スタック:** Laravel 13（Sail）/ Pest / MySQL、Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest

**設計書:** `docs/design/2026-09-27-spru-wave-e-design.md`（必ず併せて読むこと）

## 全体の制約

- 既存のバックエンドテスト（258件）とフロントのテスト（122件）はすべて通ること
- DBの更新は `./vendor/bin/sail artisan migrate`（壊さない更新）だけを使う。`migrate:fresh` は使わない。品ぞろえは `./vendor/bin/sail artisan db:seed --class=WorldItemSeeder`
- 区画（キー・名前・位置・大きさ・必要レベル・地面）、目印と道の座標、新しいアイテム（名前・絵のキー・大きさ・必要レベル・値段）は設計書3-1・3-5の表どおり
- 置けないときのメッセージは次の4つだけで、この順に調べる: 「土地の外には置けません。」→「まだ雲に隠れているよ。」→「そこには置けません。」→「そこにはもう置いてあります。」
- APIの形は設計書4-4どおり（`land.size` はなくし `width`・`height` にする。`plots`・`plots_new`・`footprint`）
- 地図の拡大・縮小、区画ごとの置けるアイテムの制限、3×3以上の建物は作らない
- 画面に確認用の隠し機能を作らない。レベルや記録は開発DBを `tinker` で調整して確かめ、確認後に元へ戻す。Playwrightで通信を書き換える（route で CORS・Origin を変える）ことはしない
- ESLint（`react-hooks`）の規則: 描画中にrefの `.current` を読まない、effectの中で直接setStateしない（setTimeout・ResizeObserver・非同期のコールバックの中はよい）
- 町と家族の町は1秒ごとに描き直す。地図の枠（`TownMap`）のeffectは、描き直しのたびに地図を動かさないよう、`land`・`viewWidth`・`focus` が変わったときだけ動かす
- 新しいUIのアイコンに絵文字を使わない（lucideの `House`）。絵はSVGで描き、有料素材は使わない。ドキュメント・コメントは日本語、コメントは「なぜ」が必要なときだけ1行
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/spru-wave-e`（作成済み）
- 開発サーバーはポート3000（すでに動いていれば新しく起動しない）。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」（id 7、Lv.1・XP 20・ポイント75）。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、確認後に消す

## レビューで特に見る点

1. **マウスでドラッグして、アイテム・光っているマス・雲の札・スプルの上で離す**: シートが開かない・置かれない・スプルが話さないこと。少しだけ動かした（6px未満）ときは、ふつうのタップとして動くこと（Task 3の `isDragMove`、Task 7のブラウザ確認）
2. **ブラウザの幅を変える・スマホを横にする**: 縮尺が付いてきて、町が枠に収まる位置に戻ること。地図の枠の中だけがスクロールし、ページ全体に横スクロールが出ないこと。スプルの吹き出しが枠より大きくならないこと（Task 5、Task 7のブラウザ確認）
3. **2×2の下見**: 下見中に地図を動かして別の光るマスを押すと下見が移る／［やめる］で消える／置いてある2×2を「動かす」から始めると、自分の今の4マスと重なる所も光ること（Task 3の `validAnchors`、Task 6、Task 7のブラウザ確認）
4. **お知らせが重なる日**: はじめての100pt・区画のお祝い・家族のあいさつ・季節のあいさつが同じ日に来ても、この順に1つずつ、地図の動きと雲の演出が終わってから次が出ること（Task 6、Task 7のブラウザ確認）
5. **Lv.12の人がE回の町を初めて開く**: カード1枚に「竹林・海辺・丘が広がったよ！」、地図は丘へ動き、再読み込みしても二度出ないこと（Task 1のテスト、Task 7のブラウザ確認）

## 計画で決めたこと（設計書にも反映する）

- 「スプルの家へ戻る」を出す条件: 設計書3-3の「町の中心が枠から外れたら」は、12×12の地図では起きない（地図の端までスクロールしても町の中心はいつも枠の中に見える）。そこで「今の位置が最初の位置（町が枠に収まる位置）から、枠の幅か高さの4分の1より離れたら出す」にする。このコミットで設計書3-3も直す
- 置く場所を選ぶときの案内「地図を動かすと、ほかの場所も見られるよ」は、「町の区画の外にも置ける場所があるとき」に出す（最初に見えている範囲＝町の区画）

## ファイル構成

**サーバー（リポジトリ直下）**
- 作成: `database/migrations/2026_09_27_000011_add_world_plots_seen_to_user_profiles_table.php`
- 作成: `app/Support/WorldPlacement.php` — 置けるかのチェック（使うマス・4つの理由の順）
- 変更: `config/world.php`（`land`・`asset_keys`・`asset_footprints`）、`app/Support/WorldLand.php`（作り直し）、`app/Support/Family.php`（家族の町の土地）、`app/Models/UserProfile.php`（`world_plots_seen`）、`app/Models/ShopItem.php`（`footprint()`）、`app/Models/ProfileWorldItem.php`（`footprint`）、`routes/api.php`（町のAPI・祝った印・配置・ショップ）、`database/seeders/WorldItemSeeder.php`
- テスト: 作成 `tests/Feature/WorldLandTest.php`・`tests/Feature/WorldBuildingTest.php`、変更 `tests/Feature/WorldApiTest.php`・`FamilyTownTest.php`・`WorldPlacementTest.php`

**フロントエンド（`frontend/src/`）**
- 作成: `components/world/land.ts`・`land.test.ts` — 区画・開いたマス・側面・使うマス・置ける場所・絵の位置・雲とお祝いの文
- 作成: `components/world/map-view.ts`・`map-view.test.ts` — 地図の枠の縮尺・スクロール位置・ドラッグの判定
- 作成: `components/world/art-keys.ts`・`art-keys.test.ts` — 絵のキーと2×2の絵の一覧（サーバーの設定と一致を確かめる）
- 作成: `components/world/town-map.tsx`（地図の枠）、`components/world/plot-unlock-card.tsx`（区画のお祝い）
- 変更: `components/world/types.ts`・`iso.ts`・`liveliness.ts`・`liveliness.test.ts`・`item-art.tsx`・`landmark-art.tsx`・`world-scene.tsx`・`world-screen.tsx`・`placement-bar.tsx`、`components/family/family-town.tsx`、`components/spru/hint.test.ts`（型の追加）、`app/shop/page.tsx`・`app/bag/page.tsx`（「2×2マス」）、`app/globals.css`

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`・`docs/design/2026-09-27-spru-wave-e-design.md`（3-3の「戻る」の条件）

---

### Task 1: 区画と雲・お祝いの記録（サーバー）

**Files:**
- Create: `database/migrations/2026_09_27_000011_add_world_plots_seen_to_user_profiles_table.php`
- Modify: `config/world.php`（`land`）、`app/Support/WorldLand.php`（全体）、`app/Models/UserProfile.php`（`$fillable`・`casts()`）、`app/Support/Family.php:64`、`routes/api.php`（`GET /api/world`・`world` のグループに `plots/seen`・`PATCH /api/world/items` に雲のチェック）
- Test: 作成 `tests/Feature/WorldLandTest.php`、変更 `tests/Feature/WorldApiTest.php:17`・`tests/Feature/FamilyTownTest.php:71`・`tests/Feature/WorldPlacementTest.php:59-63`

**Interfaces:**
- Produces:
  - 設定 `world.land.plots`（`key`・`name`・`x`・`y`・`w`・`h`・`min_level`・`ground`）、`world.land.landmarks`（竹やぶ `bamboo_grove` 3つ・桟橋 `pier` を追加）、`world.land.paths`（(7,3)〜(11,3) を追加）
  - 列 `user_profiles.world_plots_seen`（JSON、null可。モデルで `array` にキャスト）
  - `WorldLand::plots(): array`、`width(): int`、`height(): int`、`plotAt(int $x, int $y): ?array`、`inBounds(int $x, int $y): bool`（どれかの区画の中）、`isOpen(int $x, int $y, int $level): bool`、`openPlotKeys(int $level): list<string>`、`newPlotKeys(int $level, array $seen): list<string>`、`toArray(int $level): array`。`landmarks()`・`paths()`・`blocked()`・`isBlocked()` は今までどおり全区画ぶん
  - API: `GET /api/world` の `land`（`width`・`height`・`plots`・開いた区画だけの `landmarks`・`paths`・`blocked`・`spru`）と `plots_new`、`POST /api/world/plots/seen`、`GET /api/family/{profile}` の `land`（その人のレベル）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldLandTest.php` を作る:

```php
<?php

/*
|--------------------------------------------------------------------------
| 広がる地図と雲の区画(docs/design/2026-09-27-spru-wave-e-design.md 3-1・3-2・4-4)
|--------------------------------------------------------------------------
|
| 地図は12×12で、町(7×7)の手前に竹林(Lv.4)・海辺(Lv.7)・丘(Lv.10)が続く。
| まだ開いていない区画は雲に隠れていて置けない。開いた区画は次に町を開いたときに1回だけ祝う。
|
*/

it('Lv.1では町だけが開いていて、区画は4つとも返る', function () {
    createActiveProfile();

    $land = $this->getJson('/api/world')->assertOk()->json('land');

    expect($land['width'])->toBe(12)
        ->and($land['height'])->toBe(12)
        ->and(collect($land['plots'])->pluck('unlocked', 'key')->all())
        ->toBe(['town' => true, 'bamboo' => false, 'beach' => false, 'hill' => false])
        ->and($land['plots'][1])->toBe([
            'key' => 'bamboo', 'name' => '竹林', 'x' => 7, 'y' => 0, 'w' => 5, 'h' => 7,
            'min_level' => 4, 'ground' => 'bamboo', 'unlocked' => false,
        ])
        ->and(collect($land['landmarks'])->pluck('key')->all())->not->toContain('bamboo_grove')
        ->and(collect($land['landmarks'])->pluck('key')->all())->not->toContain('pier')
        ->and($land['paths'])->not->toContain([7, 3])
        ->and($land['blocked'])->not->toContain([8, 0]);
});

it('Lv.4で竹林が開き、竹やぶと竹林の道が目印・道・置けないマスに入る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4]);

    $land = $this->getJson('/api/world')->assertOk()->json('land');

    expect(collect($land['plots'])->firstWhere('key', 'bamboo')['unlocked'])->toBeTrue()
        ->and($land['landmarks'])->toContain(['key' => 'bamboo_grove', 'x' => 8, 'y' => 0])
        ->and($land['paths'])->toContain([11, 3])
        ->and($land['blocked'])->toContain([10, 1])
        ->and($land['blocked'])->toContain([7, 3])
        ->and(collect($land['landmarks'])->pluck('key')->all())->not->toContain('pier');
});

it('Lv.4なら竹林に置け、Lv.3では雲に隠れていて置けない', function () {
    $profile = createActiveProfile();
    $item = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);

    $profile->update(['level' => 3]);
    $this->patchJson("/api/world/items/{$item->id}", ['x' => 8, 'y' => 1])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ雲に隠れているよ。');
    expect($item->fresh()->isPlaced())->toBeFalse();

    $profile->update(['level' => 4]);
    $this->patchJson("/api/world/items/{$item->id}", ['x' => 8, 'y' => 1])->assertOk();
});

it('竹林の道と竹やぶには置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $profile->update(['level' => 4]);
    $item = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこには置けません。');
})->with([
    '竹林の道' => [8, 3],
    '竹やぶ' => [10, 1],
]);

it('開いたがまだ祝っていない区画が出て、祝った印を送ると出なくなる', function () {
    $profile = createActiveProfile();
    $this->getJson('/api/world')->assertJsonPath('plots_new', []);

    $profile->update(['level' => 4]);
    $this->getJson('/api/world')->assertJsonPath('plots_new', ['bamboo']);

    $this->postJson('/api/world/plots/seen', ['keys' => ['bamboo']])
        ->assertOk()
        ->assertJsonPath('plots_new', []);
    $this->getJson('/api/world')->assertJsonPath('plots_new', []);
    expect($profile->fresh()->world_plots_seen)->toBe(['bamboo']);
});

it('一度に2つ以上開いた区画は、必要レベルの低い順に出る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12, 'world_plots_seen' => ['bamboo']]);

    $this->getJson('/api/world')->assertJsonPath('plots_new', ['beach', 'hill']);
});

it('雲の区画や知らないキーは記録せず、同じキーは1回だけ記録する', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4]);

    $this->postJson('/api/world/plots/seen', ['keys' => ['hill', 'castle_town']])
        ->assertOk()
        ->assertJsonPath('plots_new', ['bamboo']);
    expect($profile->fresh()->world_plots_seen)->toBe([]);

    $this->postJson('/api/world/plots/seen', ['keys' => ['bamboo', 'bamboo']])->assertOk();
    $this->postJson('/api/world/plots/seen', ['keys' => ['bamboo']])->assertOk();
    expect($profile->fresh()->world_plots_seen)->toBe(['bamboo']);
});

it('祝った印の送り方がおかしいとエラーになる', function (array $payload) {
    createActiveProfile();

    $this->postJson('/api/world/plots/seen', $payload)->assertStatus(422);
})->with([
    'キーが無い' => [[]],
    '文字列でない' => [['keys' => [1]]],
]);

it('家族の町の土地は、見に行った人ではなくその人のレベルで開いている', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $sister->update(['level' => 7]);

    $plots = collect($this->getJson("/api/family/{$sister->id}")->assertOk()->json('land.plots'))
        ->pluck('unlocked', 'key')
        ->all();

    expect($plots)->toBe(['town' => true, 'bamboo' => true, 'beach' => true, 'hill' => false]);
});
```

今のテストを新しい土地に合わせる:

- `tests/Feature/WorldApiTest.php:17` の `$response->assertJsonPath('land.size', 7)` を `$response->assertJsonPath('land.width', 12)` にする
- `tests/Feature/FamilyTownTest.php:71` の `->assertJsonPath('land.size', 7)` を `->assertJsonPath('land.width', 12)` にする
- `tests/Feature/WorldPlacementTest.php:59-63` のデータを次にする（(7,0) は竹林の中になったため）:

```php
})->with([
    'xが12' => [12, 0],
    'yが12' => [0, 12],
    'xが負' => [-1, 2],
]);
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail artisan test --compact tests/Feature/WorldLandTest.php tests/Feature/WorldApiTest.php tests/Feature/FamilyTownTest.php tests/Feature/WorldPlacementTest.php`
Expected: FAIL（`land.width` が null、`plots_new` が無い、`/api/world/plots/seen` が404、(12,0) は今は「土地の外」だが (8,1) に置けてしまう など）

- [ ] **Step 3: 列を足すマイグレーションを書く**

`database/migrations/2026_09_27_000011_add_world_plots_seen_to_user_profiles_table.php`:

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
            // 祝った区画のキーの一覧(E回 3-2)。null はまだ1つも祝っていない
            $table->json('world_plots_seen')->nullable()->after('world_welcomed_at');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('world_plots_seen');
        });
    }
};
```

`app/Models/UserProfile.php` の `$fillable` の1行目の末尾 `'world_welcomed_at',` の後に `'world_plots_seen',` を足し、`casts()` に `'world_plots_seen' => 'array',` を足す。

- [ ] **Step 4: 土地の設定を区画の形にする**

`config/world.php` の `land` の説明コメントと配列を、次に置き換える:

```php
    /*
    | 土地(docs/design/2026-09-27-spru-wave-e-design.md 3-1)。x,yは0始まり。地図は区画を並べたもの(今は12×12)で、
    | 町の手前(xとyが大きくなる向き)へ広がる。形は全員同じなのでDBに持たず、人によって違うのは
    | レベルでどこまで開いているかだけ。目印・道がどの区画のものかは座標で決まる。目印と道のマスには置けない。
    */

    'land' => [
        'plots' => [
            ['key' => 'town', 'name' => 'はじまりの町', 'x' => 0, 'y' => 0, 'w' => 7, 'h' => 7, 'min_level' => 1, 'ground' => 'grass'],
            ['key' => 'bamboo', 'name' => '竹林', 'x' => 7, 'y' => 0, 'w' => 5, 'h' => 7, 'min_level' => 4, 'ground' => 'bamboo'],
            ['key' => 'beach', 'name' => '海辺', 'x' => 0, 'y' => 7, 'w' => 7, 'h' => 5, 'min_level' => 7, 'ground' => 'sand'],
            ['key' => 'hill', 'name' => '丘', 'x' => 7, 'y' => 7, 'w' => 5, 'h' => 5, 'min_level' => 10, 'ground' => 'hill'],
        ],
        'landmarks' => [
            ['key' => 'stone_lantern', 'x' => 2, 'y' => 0],
            ['key' => 'torii', 'x' => 3, 'y' => 0],
            ['key' => 'stone_lantern', 'x' => 4, 'y' => 0],
            ['key' => 'spru_house', 'x' => 1, 'y' => 1],
            // スプルの家の前の畑。種をまいて水やりする(目印なのでアイテムは置けない)
            ['key' => 'garden', 'x' => 1, 'y' => 2],
            ['key' => 'bamboo_grove', 'x' => 8, 'y' => 0],
            ['key' => 'bamboo_grove', 'x' => 10, 'y' => 1],
            ['key' => 'bamboo_grove', 'x' => 11, 'y' => 5],
            // 海辺の桟橋。F回で船旅の出発点にする
            ['key' => 'pier', 'x' => 2, 'y' => 11],
        ],
        'paths' => [
            [3, 1], [3, 2],
            [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
            // 竹林へ続く町の道
            [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
        ],
        // Spruが立っている道のマス(道なのでアイテムと重ならない)
        'spru' => ['x' => 1, 'y' => 3],
    ],
```

- [ ] **Step 5: `WorldLand` をレベルを受け取る形に作り直す**

`app/Support/WorldLand.php` を次に置き換える:

```php
<?php

namespace App\Support;

/**
 * 土地(docs/design/2026-09-27-spru-wave-e-design.md 3-1)。形は全員同じで設定ファイルに持ち、
 * 人によって違うのは、レベルでどこまで開いているかだけ。
 */
class WorldLand
{
    /** @return list<array{key: string, name: string, x: int, y: int, w: int, h: int, min_level: int, ground: string}> */
    public static function plots(): array
    {
        return config('world.land.plots');
    }

    public static function width(): int
    {
        return max(array_map(fn (array $plot) => $plot['x'] + $plot['w'], self::plots()));
    }

    public static function height(): int
    {
        return max(array_map(fn (array $plot) => $plot['y'] + $plot['h'], self::plots()));
    }

    /** @return array{key: string, name: string, x: int, y: int, w: int, h: int, min_level: int, ground: string}|null マスが入っている区画 */
    public static function plotAt(int $x, int $y): ?array
    {
        foreach (self::plots() as $plot) {
            if ($x >= $plot['x'] && $x < $plot['x'] + $plot['w'] && $y >= $plot['y'] && $y < $plot['y'] + $plot['h']) {
                return $plot;
            }
        }

        return null;
    }

    /** 地図の中か(どれかの区画に入っているか) */
    public static function inBounds(int $x, int $y): bool
    {
        return self::plotAt($x, $y) !== null;
    }

    public static function isOpen(int $x, int $y, int $level): bool
    {
        $plot = self::plotAt($x, $y);

        return $plot !== null && $level >= $plot['min_level'];
    }

    /** @return list<string> */
    public static function openPlotKeys(int $level): array
    {
        return array_values(array_map(
            fn (array $plot) => $plot['key'],
            array_filter(self::plots(), fn (array $plot) => $level >= $plot['min_level']),
        ));
    }

    /**
     * 開いたが、まだ祝っていない区画(最初から開いている区画は祝わない。必要レベルの低い順)
     *
     * @param  list<string>  $seen
     * @return list<string>
     */
    public static function newPlotKeys(int $level, array $seen): array
    {
        $plots = array_filter(
            self::plots(),
            fn (array $plot) => $plot['min_level'] > 1 && $level >= $plot['min_level'] && ! in_array($plot['key'], $seen, true),
        );
        usort($plots, fn (array $a, array $b) => $a['min_level'] <=> $b['min_level']);

        return array_map(fn (array $plot) => $plot['key'], $plots);
    }

    /** @return list<array{key: string, x: int, y: int}> 全区画の目印 */
    public static function landmarks(): array
    {
        return config('world.land.landmarks');
    }

    /** @return list<array{0: int, 1: int}> 全区画の道 */
    public static function paths(): array
    {
        return config('world.land.paths');
    }

    /** @return list<array{0: int, 1: int}> 目印と道のマス(置けないマス。全区画) */
    public static function blocked(): array
    {
        $tiles = array_map(fn (array $landmark) => [$landmark['x'], $landmark['y']], self::landmarks());

        foreach (self::paths() as [$x, $y]) {
            $tiles[] = [$x, $y];
        }

        return array_values(array_unique($tiles, SORT_REGULAR));
    }

    public static function isBlocked(int $x, int $y): bool
    {
        return in_array([$x, $y], self::blocked(), true);
    }

    /** 町のAPIに出す土地。区画は雲の区画も含めてすべて、目印・道・置けないマスは開いた区画のものだけ */
    public static function toArray(int $level): array
    {
        $open = fn (int $x, int $y) => self::isOpen($x, $y, $level);

        return [
            'width' => self::width(),
            'height' => self::height(),
            'plots' => array_map(fn (array $plot) => [...$plot, 'unlocked' => $level >= $plot['min_level']], self::plots()),
            'landmarks' => array_values(array_filter(self::landmarks(), fn (array $l) => $open($l['x'], $l['y']))),
            'paths' => array_values(array_filter(self::paths(), fn (array $t) => $open($t[0], $t[1]))),
            'blocked' => array_values(array_filter(self::blocked(), fn (array $t) => $open($t[0], $t[1]))),
            'spru' => config('world.land.spru'),
        ];
    }
}
```

- [ ] **Step 6: 町のAPI・祝った印・雲のチェック・家族の町をつなぐ**

`routes/api.php` の `GET /api/world`（`Route::get('/', ...)` の中）:
- `'land' => WorldLand::toArray(),` を `'land' => WorldLand::toArray($profile->level),` にする
- `'family_count' => Family::others($profile)->count(),` の次の行に足す:

```php
            'plots_new' => WorldLand::newPlotKeys($profile->level, $profile->world_plots_seen ?? []),
```

`world` のグループの中、`Route::post('/greetings/seen', ...)->name('greetings.seen');` の次に足す:

```php
    // 開いた区画を祝った印(設計書3-2)。雲の区画・知らないキーは記録しない
    Route::post('/plots/seen', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);
        $data = $request->validate(['keys' => ['required', 'array'], 'keys.*' => ['string']]);

        return DB::transaction(function () use ($activeProfile, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $seen = array_values(array_unique([
                ...($profile->world_plots_seen ?? []),
                ...array_values(array_intersect($data['keys'], WorldLand::openPlotKeys($profile->level))),
            ]));
            $profile->update(['world_plots_seen' => $seen]);

            return ['plots_new' => WorldLand::newPlotKeys($profile->level, $seen)];
        });
    })->name('plots.seen');
```

`PATCH /api/world/items/{profileWorldItem}` の `abort_unless(WorldLand::inBounds($x, $y), ...)` の次の行に足す（Task 2で `WorldPlacement` にまとめ直す）:

```php
            abort_unless(WorldLand::isOpen($x, $y, $profile->level), 422, 'まだ雲に隠れているよ。');
```

`app/Support/Family.php` の `town()` の `'land' => WorldLand::toArray(),` を `'land' => WorldLand::toArray($other->level),` にする。

- [ ] **Step 7: マイグレーションを当ててテストを通す**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan test --compact tests/Feature/WorldLandTest.php tests/Feature/WorldApiTest.php tests/Feature/FamilyTownTest.php tests/Feature/WorldPlacementTest.php`
Expected: マイグレーション1つが `DONE`、テストはすべて PASS

- [ ] **Step 8: 全体のテストを流す**

Run: `./vendor/bin/sail artisan test --compact`
Expected: `269 passed`（258＋11）

- [ ] **Step 9: コミット**

```bash
git add database/migrations/2026_09_27_000011_add_world_plots_seen_to_user_profiles_table.php config/world.php app/Support/WorldLand.php app/Models/UserProfile.php app/Support/Family.php routes/api.php tests/Feature/WorldLandTest.php tests/Feature/WorldApiTest.php tests/Feature/FamilyTownTest.php tests/Feature/WorldPlacementTest.php
git commit -m "#00133: feature:町の手前に竹林・海辺・丘の区画を足し、レベルで雲が晴れて置けるようにし、開いた区画を祝った印を記録する

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 大きな建物と置く場所のチェック・新しいアイテム（サーバー）

**Files:**
- Create: `app/Support/WorldPlacement.php`
- Modify: `config/world.php`（`asset_keys`・`asset_footprints`）、`app/Models/ShopItem.php`、`app/Models/ProfileWorldItem.php`、`routes/api.php`（`use`・`PATCH /api/world/items`・`GET /api/shop`）、`database/seeders/WorldItemSeeder.php`
- Test: 作成 `tests/Feature/WorldBuildingTest.php`

**Interfaces:**
- Consumes: Task 1 の `WorldLand::inBounds(int, int)`・`WorldLand::isOpen(int, int, int)`・`WorldLand::isBlocked(int, int)`
- Produces:
  - 設定 `world.asset_footprints`（`['fountain' => 2, 'pagoda' => 2, 'castle' => 2, 'tower' => 2]`）、`world.asset_keys` に8つ追加
  - `ShopItem::footprint(): int`（1か2）
  - `WorldPlacement::tiles(int $x, int $y, int $footprint): list<array{0: int, 1: int}>`、`WorldPlacement::check(UserProfile $profile, ProfileWorldItem $item, int $x, int $y): void`（だめなら422）
  - API: `items`・`bag`・`world_item`・家族の町の `items`・`GET /api/shop` の各アイテムに `footprint`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/WorldBuildingTest.php` を作る:

```php
<?php

use App\Models\ProfileWorldItem;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Database\Seeders\WorldItemSeeder;

/*
|--------------------------------------------------------------------------
| 大きな建物(2×2)と置く場所のチェック(docs/design/2026-09-27-spru-wave-e-design.md 3-4・3-5・4-3)
|--------------------------------------------------------------------------
|
| 2×2の建物は (x, y) を奥のマスにして4マス使う。使うマスすべてについて
| 地図の外 → 雲 → 目印・道 → 重なり の順に調べる。
|
*/

function createBuilding(UserProfile $profile, string $assetKey = 'castle', ?int $x = null, ?int $y = null): ProfileWorldItem
{
    $shopItem = createDecoration(['name' => $assetKey, 'meta' => ['asset_key' => $assetKey]]);

    return $profile->worldItems()->create(['shop_item_id' => $shopItem->id, 'x' => $x, 'y' => $y]);
}

function createPlacedBench(UserProfile $profile, int $x, int $y): ProfileWorldItem
{
    return $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => $x, 'y' => $y]);
}

it('空いた4マスに2×2の建物を置け、大きさ2で返る', function () {
    $profile = createActiveProfile();
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 4, 'y' => 4])
        ->assertOk()
        ->assertJson(['id' => $castle->id, 'x' => 4, 'y' => 4, 'asset_key' => 'castle', 'footprint' => 2]);
});

it('2×2の建物の4マスのどれかが1マスのアイテムと重なると置けない', function (int $benchX, int $benchY) {
    $profile = createActiveProfile();
    createPlacedBench($profile, $benchX, $benchY);
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 4, 'y' => 4])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
    expect($castle->fresh()->isPlaced())->toBeFalse();
})->with([
    '奥' => [4, 4],
    '右' => [5, 4],
    '左' => [4, 5],
    '手前' => [5, 5],
]);

it('ほかの2×2の建物と1マスでも重なると置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    createBuilding($profile, 'fountain', 4, 4);
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
})->with([
    '斜め手前' => [5, 5],
    '左にずれる' => [3, 5],
    '右にずれる' => [5, 4],
]);

it('1マスのアイテムは、2×2の建物の奥以外の3マスにも置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    createBuilding($profile, 'castle', 4, 4);
    $bench = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);

    $this->patchJson("/api/world/items/{$bench->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
})->with([
    '右' => [5, 4],
    '左' => [4, 5],
    '手前' => [5, 5],
]);

it('ほかの2×2の建物のとなりには、ぴったり並べて置ける', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10]);
    createBuilding($profile, 'fountain', 4, 4);
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 6, 'y' => 4])->assertOk();
});

it('地図の端からはみ出す位置には置けない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10]);
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 11, 'y' => 8])
        ->assertStatus(422)
        ->assertJsonPath('message', '土地の外には置けません。');
});

it('4マスのどれかが雲の区画にかかると置けない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 6, 'y' => 0])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ雲に隠れているよ。');
});

it('4マスのどれかが道や目印にかかると置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこには置けません。');
})->with([
    '道' => [4, 2],
    'スプルの家と畑' => [0, 1],
]);

it('今の自分の4マスと重なる位置へ、1マスずらせる', function () {
    $profile = createActiveProfile();
    $castle = createBuilding($profile, 'castle', 4, 4);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 5, 'y' => 4])->assertOk();

    expect($castle->fresh()->only(['x', 'y']))->toBe(['x' => 5, 'y' => 4]);
});

it('いくつも理由があるときは、地図の外→雲→道・目印の順に1つだけ返す', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);
    $castle = createBuilding($profile);

    // (12,2) が地図の外、(11,2) が雲
    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 11, 'y' => 2])
        ->assertJsonPath('message', '土地の外には置けません。');
    // (7,2)・(7,3) が雲、(6,3) が道
    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 6, 'y' => 2])
        ->assertJsonPath('message', 'まだ雲に隠れているよ。');
});

it('ショップの町のアイテムに大きさが付く', function () {
    createActiveProfile();
    createDecoration();
    createDecoration(['name' => 'お城', 'price' => 400, 'min_level' => 10, 'meta' => ['asset_key' => 'castle']]);

    $footprints = collect($this->getJson('/api/shop')->assertOk()->json())->pluck('footprint', 'name')->all();

    expect($footprints['ベンチ'])->toBe(1)->and($footprints['お城'])->toBe(2);
});

it('町のAPIのバッグのアイテムにも大きさが付く', function () {
    $profile = createActiveProfile();
    createBuilding($profile, 'tower');

    $this->getJson('/api/world')->assertOk()->assertJsonPath('bag.0.footprint', 2);
});

it('品ぞろえのシーダーで大きな建物4つを含む16種類がそろい、2回実行しても増えない', function () {
    $this->seed(WorldItemSeeder::class);
    $this->seed(WorldItemSeeder::class);

    $items = ShopItem::query()->where('type', 'decoration')->get();

    expect($items)->toHaveCount(16)
        ->and($items->filter(fn (ShopItem $item) => $item->footprint() === 2)->pluck('name')->sort()->values()->all())
        ->toBe(['お城', 'タワー', '五重塔', '噴水'])
        ->and($items->firstWhere('name', 'タワー')->only(['price', 'min_level']))->toBe(['price' => 500, 'min_level' => 12]);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail artisan test --compact tests/Feature/WorldBuildingTest.php`
Expected: FAIL（`footprint` が返らない、2×2の重なりを見ていないので置けてしまう、シーダーは8種類 など）

- [ ] **Step 3: 絵のキーと2×2の絵を設定に足す**

`config/world.php` の `asset_keys` の説明コメントと配列を次に置き換える:

```php
    /*
    | 町のアイテムの絵として用意済みのキー。フロントの components/world/art-keys.ts と
    | 必ず一致させる(Ownerが絵の無いアイテムを登録できないようにするため。art-keys.test.ts で確かめる)。
    */

    'asset_keys' => [
        'bench', 'flowerbed', 'chochin', 'tree', 'sakura', 'vending', 'bicycle', 'stall',
        'stone_lantern', 'bamboo', 'fountain', 'palm', 'parasol', 'pagoda', 'castle', 'tower',
    ],

    /*
    | 2×2マス使う絵(docs/design/2026-09-27-spru-wave-e-design.md 3-4)。書いていない絵は1マス。
    | Ownerがアイテムごとに大きさを変えられないよう、絵で決める。フロントの art-keys.ts の BIG_ASSETS と必ず一致させる
    */

    'asset_footprints' => ['fountain' => 2, 'pagoda' => 2, 'castle' => 2, 'tower' => 2],
```

- [ ] **Step 4: アイテムの大きさを返す**

`app/Models/ShopItem.php` の `assetKey()` の後に足す:

```php
    /** 使うマスの一辺(1か2)。2×2かどうかは絵で決まる(config/world.php の asset_footprints) */
    public function footprint(): int
    {
        return (int) (config('world.asset_footprints')[$this->assetKey()] ?? 1);
    }
```

`app/Models/ProfileWorldItem.php` の `toWorldArray()` を次にする:

```php
    /** @return array{id: int, shop_item_id: int, name: string, asset_key: ?string, footprint: int, x: ?int, y: ?int} */
    public function toWorldArray(): array
    {
        return [
            'id' => $this->id,
            'shop_item_id' => $this->shop_item_id,
            'name' => $this->shopItem->name,
            'asset_key' => $this->shopItem->assetKey(),
            'footprint' => $this->shopItem->footprint(),
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
```

- [ ] **Step 5: 置けるかのチェックをまとめる**

`app/Support/WorldPlacement.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileWorldItem;
use App\Models\UserProfile;

/**
 * アイテムを置けるかのチェック(docs/design/2026-09-27-spru-wave-e-design.md 3-4・4-3)。
 * 2×2の建物は (x, y) を奥のマスにして4マス使う。使うマスすべてについて、
 * 地図の外 → 雲 → 目印・道 → 重なり の順に調べ、最初に当てはまったものを返す。
 */
class WorldPlacement
{
    /** @return list<array{0: int, 1: int}> (x, y) を奥のマスにして使うマス */
    public static function tiles(int $x, int $y, int $footprint): array
    {
        $tiles = [];
        for ($dy = 0; $dy < $footprint; $dy++) {
            for ($dx = 0; $dx < $footprint; $dx++) {
                $tiles[] = [$x + $dx, $y + $dy];
            }
        }

        return $tiles;
    }

    /** 置けなければ422。同時に置いても4マスが重ならないよう、プロフィールはロックしてから渡す */
    public static function check(UserProfile $profile, ProfileWorldItem $item, int $x, int $y): void
    {
        $tiles = self::tiles($x, $y, $item->shopItem->footprint());

        foreach ($tiles as [$tx, $ty]) {
            abort_unless(WorldLand::inBounds($tx, $ty), 422, '土地の外には置けません。');
        }
        foreach ($tiles as [$tx, $ty]) {
            abort_unless(WorldLand::isOpen($tx, $ty, $profile->level), 422, 'まだ雲に隠れているよ。');
        }
        foreach ($tiles as [$tx, $ty]) {
            abort_if(WorldLand::isBlocked($tx, $ty), 422, 'そこには置けません。');
        }

        $occupied = self::occupied($profile, $item->id);
        foreach ($tiles as [$tx, $ty]) {
            abort_if(isset($occupied["{$tx},{$ty}"]), 422, 'そこにはもう置いてあります。');
        }
    }

    /** @return array<string, true> 自分以外の置いたアイテムが使っているマス */
    private static function occupied(UserProfile $profile, int $exceptId): array
    {
        $occupied = [];
        $others = $profile->worldItems()->with('shopItem')
            ->whereNotNull('x')->whereNotNull('y')->whereKeyNot($exceptId)->get();

        foreach ($others as $other) {
            foreach (self::tiles($other->x, $other->y, $other->shopItem->footprint()) as [$ox, $oy]) {
                $occupied["{$ox},{$oy}"] = true;
            }
        }

        return $occupied;
    }
}
```

- [ ] **Step 6: 配置のAPIとショップをつなぐ**

`routes/api.php` の `use App\Support\WorldLand;` の次に `use App\Support\WorldPlacement;` を足す。

`PATCH /api/world/items/{profileWorldItem}` を次に置き換える:

```php
    Route::patch('/items/{profileWorldItem}', function (Request $request, ProfileWorldItem $profileWorldItem) {
        $activeProfile = ActiveProfile::require($request);
        abort_unless($profileWorldItem->user_profile_id === $activeProfile->id, 404);

        $data = $request->validate([
            'x' => ['present', 'nullable', 'integer', 'required_with:y'],
            'y' => ['present', 'nullable', 'integer', 'required_with:x'],
        ]);
        $x = $data['x'] === null ? null : (int) $data['x'];
        $y = $data['y'] === null ? null : (int) $data['y'];

        return DB::transaction(function () use ($activeProfile, $profileWorldItem, $x, $y) {
            // 2か所から同時に置いても、2×2の建物の4マスが重ならないようにロックしてから確かめる
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            if ($x !== null) {
                WorldPlacement::check($profile, $profileWorldItem, $x, $y);
            }

            try {
                $profileWorldItem->update(['x' => $x, 'y' => $y]);
            } catch (UniqueConstraintViolationException) {
                // 事前チェックと保存の間に同じマスへ置かれた場合(同時操作)
                abort(422, 'そこにはもう置いてあります。');
            }

            return $profileWorldItem->load('shopItem')->toWorldArray();
        });
    })->name('items.update');
```

`GET /api/shop` の `->map(fn (ShopItem $item) => [...])` の中、`'asset_key' => $item->assetKey(),` の次に `'footprint' => $item->footprint(),` を足す。

- [ ] **Step 7: 品ぞろえに8種類を足す**

`database/seeders/WorldItemSeeder.php` の `$items` の `屋台` の行の後に足す:

```php
            // E回(docs/design/2026-09-27-spru-wave-e-design.md 3-5)。区画が開くレベルに合わせる
            ['name' => '石灯籠', 'price' => 30, 'min_level' => 3, 'asset_key' => 'stone_lantern'],
            ['name' => '竹', 'price' => 25, 'min_level' => 4, 'asset_key' => 'bamboo'],
            ['name' => '噴水', 'price' => 150, 'min_level' => 5, 'asset_key' => 'fountain'],
            ['name' => 'ヤシの木', 'price' => 40, 'min_level' => 7, 'asset_key' => 'palm'],
            ['name' => 'ビーチパラソル', 'price' => 35, 'min_level' => 7, 'asset_key' => 'parasol'],
            ['name' => '五重塔', 'price' => 300, 'min_level' => 9, 'asset_key' => 'pagoda'],
            ['name' => 'お城', 'price' => 400, 'min_level' => 10, 'asset_key' => 'castle'],
            ['name' => 'タワー', 'price' => 500, 'min_level' => 12, 'asset_key' => 'tower'],
```

- [ ] **Step 8: テストを通す**

Run: `./vendor/bin/sail artisan test --compact tests/Feature/WorldBuildingTest.php tests/Feature/WorldPlacementTest.php tests/Feature/WorldLandTest.php tests/Feature/WorldShopTest.php tests/Feature/ErrandTest.php`
Expected: すべて PASS

- [ ] **Step 9: 全体のテストを流す**

Run: `./vendor/bin/sail artisan test --compact`
Expected: `290 passed`（269＋21）

- [ ] **Step 10: コミット**

```bash
git add app/Support/WorldPlacement.php config/world.php app/Models/ShopItem.php app/Models/ProfileWorldItem.php routes/api.php database/seeders/WorldItemSeeder.php tests/Feature/WorldBuildingTest.php
git commit -m "#00134: feature:2×2マスの大きな建物と、地図の外→雲→目印・道→重なりの順の置く場所のチェック、新しいアイテム8種を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 土地と地図の枠の計算・型（画面側）

**Files:**
- Create: `frontend/src/components/world/land.ts`・`land.test.ts`・`map-view.ts`・`map-view.test.ts`
- Modify: `frontend/src/components/world/types.ts`、`iso.ts`（`sceneViewBox`）、`liveliness.ts`・`liveliness.test.ts`、`world-screen.tsx:26,157-171`（置ける場所）、`world-scene.tsx:97-98`（仮の対応）、`frontend/src/components/spru/hint.test.ts:7-18`（型の追加）

**Interfaces:**
- Consumes: Task 1・2 のAPIの形（`land.width`・`land.height`・`land.plots`・`plots_new`・`footprint`）
- Produces:
  - 型: `Ground`、`WorldPlot`、`WorldItem.footprint: number`、`WorldLand { width, height, plots, landmarks, paths, blocked, spru }`、`WorldData.plots_new: string[]`、`ShopListItem.footprint: number`、`Landmark.key` に `"bamboo_grove" | "pier"`
  - `iso.ts`: `sceneViewBox(width: number, height: number): ViewBox`
  - `land.ts`: `plotAt(land, x, y): WorldPlot | null`、`isOpenTile(land, x, y): boolean`、`openTiles(land): Tile[]`、`landEdges(land): { left: Tile[]; right: Tile[] }`、`footprintTiles(x, y, footprint): Tile[]`、`occupiedTiles(items, exceptId): Set<string>`、`validAnchors(land, items, footprint, exceptId): Set<string>`、`depthTile(x, y, footprint): { x; y }`、`footprintCenter(x, y, footprint): { sx; sy }`、`plotCenter(plot): { sx; sy }`、`cloudLabel(plot): string`、`cloudLine(plot): string`、`unlockTitle(plots): string`、`unlockLine(key): string`、`openedLine(plot): string`、`unlockFocus(plots): WorldPlot`、`hasAnchorsOutside(anchors, plot): boolean`
  - `map-view.ts`: `DRAG_THRESHOLD`、`isDragMove(dx, dy): boolean`、`homePlot(land): WorldPlot`、`plotViewBox(plot): ViewBox`、`mapLayout(land, viewWidth): MapLayout`（`{ map, scale, width, height, viewHeight }`）、`scrollForPlot(plot, layout, viewWidth): { left; top }`、`isAwayFromHome(scroll, home, viewWidth, viewHeight): boolean`
  - `liveliness.ts`: `livelinessScore`・`liveliness` が `footprint`（省略時1）を見る

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/world/land.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { tileCenter } from "./iso";
import {
  cloudLabel,
  cloudLine,
  depthTile,
  footprintCenter,
  footprintTiles,
  hasAnchorsOutside,
  isOpenTile,
  landEdges,
  occupiedTiles,
  openTiles,
  openedLine,
  plotAt,
  plotCenter,
  unlockFocus,
  unlockLine,
  unlockTitle,
  validAnchors,
} from "./land";
import type { Tile, WorldLand, WorldPlot } from "./types";

// config/world.php の land と同じ形
const PLOTS: Omit<WorldPlot, "unlocked">[] = [
  { key: "town", name: "はじまりの町", x: 0, y: 0, w: 7, h: 7, min_level: 1, ground: "grass" },
  { key: "bamboo", name: "竹林", x: 7, y: 0, w: 5, h: 7, min_level: 4, ground: "bamboo" },
  { key: "beach", name: "海辺", x: 0, y: 7, w: 7, h: 5, min_level: 7, ground: "sand" },
  { key: "hill", name: "丘", x: 7, y: 7, w: 5, h: 5, min_level: 10, ground: "hill" },
];
const TOWN_BLOCKED: Tile[] = [
  [2, 0], [3, 0], [4, 0], [1, 1], [1, 2], [3, 1], [3, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
];
const BAMBOO_BLOCKED: Tile[] = [[8, 0], [10, 1], [11, 5], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]];

function landAt(level: number): WorldLand {
  return {
    width: 12,
    height: 12,
    plots: PLOTS.map((plot) => ({ ...plot, unlocked: level >= plot.min_level })),
    landmarks: [],
    paths: [],
    blocked: level >= 4 ? [...TOWN_BLOCKED, ...BAMBOO_BLOCKED] : TOWN_BLOCKED,
    spru: { x: 1, y: 3 },
  };
}

const placed = (id: number, x: number | null, y: number | null, footprint = 1) => ({ id, x, y, footprint });
const plotOf = (key: string) => landAt(12).plots.find((plot) => plot.key === key) as WorldPlot;

describe("区画とマス", () => {
  it("マスが入っている区画を返し、地図の外は null", () => {
    const land = landAt(1);
    expect(plotAt(land, 8, 1)?.key).toBe("bamboo");
    expect(plotAt(land, 6, 6)?.key).toBe("town");
    expect(plotAt(land, 12, 0)).toBeNull();
    expect(plotAt(land, -1, 0)).toBeNull();
  });

  it("開いている区画のマスだけが開いている", () => {
    expect(isOpenTile(landAt(3), 7, 0)).toBe(false);
    expect(isOpenTile(landAt(4), 7, 0)).toBe(true);
    expect(isOpenTile(landAt(12), 12, 0)).toBe(false);
  });

  it("開いたマスを奥から並べる", () => {
    expect(openTiles(landAt(1))).toHaveLength(49);
    const tiles = openTiles(landAt(4));
    expect(tiles).toHaveLength(84);
    expect(tiles[0]).toEqual([0, 0]);
    expect(tiles.at(-1)).toEqual([11, 6]);
  });

  it("町だけのときは、町の手前のふちに側面を描く", () => {
    const edges = landEdges(landAt(1));
    expect(edges.left).toContainEqual([3, 6]);
    expect(edges.left).not.toContainEqual([3, 5]);
    expect(edges.right).toContainEqual([6, 2]);
  });

  it("竹林が開くと、町と竹林の境目には側面を描かない", () => {
    const edges = landEdges(landAt(4));
    expect(edges.right).not.toContainEqual([6, 2]);
    expect(edges.right).toContainEqual([11, 2]);
    expect(edges.left).toContainEqual([8, 6]);
  });
});

describe("使うマスと置ける場所", () => {
  it("2×2は奥のマスから右・左・手前の4マスを使う", () => {
    expect(footprintTiles(4, 4, 1)).toEqual([[4, 4]]);
    expect(footprintTiles(4, 4, 2)).toEqual([[4, 4], [5, 4], [4, 5], [5, 5]]);
  });

  it("置いたアイテムが使うマスを集める(バッグと自分は除く)", () => {
    const items = [placed(1, 4, 4, 2), placed(2, 6, 6), placed(3, null, null)];
    expect(occupiedTiles(items, null)).toEqual(new Set(["4,4", "5,4", "4,5", "5,5", "6,6"]));
    expect(occupiedTiles(items, 1)).toEqual(new Set(["6,6"]));
  });

  it("1マスのアイテムは、開いた区画の目印・道でないマスに置ける", () => {
    const anchors = validAnchors(landAt(1), [], 1, null);
    expect(anchors.size).toBe(49 - 14);
    expect(anchors.has("3,3")).toBe(false);
    expect(anchors.has("7,0")).toBe(false);
  });

  it("2×2は、4マスが雲・道にかからない奥のマスだけ", () => {
    const anchors = validAnchors(landAt(1), [], 2, null);
    expect(anchors.has("4,4")).toBe(true);
    expect(anchors.has("5,5")).toBe(true);
    expect(anchors.has("5,0")).toBe(true);
    expect(anchors.has("6,0")).toBe(false);
    expect(anchors.has("4,2")).toBe(false);
    expect(anchors.has("6,6")).toBe(false);
  });

  it("2×2は、地図の端からはみ出す奥のマスには置けない", () => {
    const anchors = validAnchors(landAt(10), [], 2, null);
    expect(anchors.has("10,10")).toBe(true);
    expect(anchors.has("11,10")).toBe(false);
    expect(anchors.has("10,11")).toBe(false);
  });

  it("ほかの2×2と重なる所は置けず、となりにはぴったり置ける", () => {
    const anchors = validAnchors(landAt(10), [placed(1, 4, 4, 2)], 2, null);
    expect(anchors.has("5,5")).toBe(false);
    expect(anchors.has("3,5")).toBe(false);
    expect(anchors.has("5,4")).toBe(false);
    expect(anchors.has("6,4")).toBe(true);
  });

  it("動かしている建物の今の4マスとは重なってよい", () => {
    const castle = placed(1, 4, 4, 2);
    expect(validAnchors(landAt(1), [castle], 2, 1).has("5,4")).toBe(true);
    expect(validAnchors(landAt(1), [castle], 2, null).has("5,4")).toBe(false);
  });
});

describe("絵の位置", () => {
  it("大きな建物の重なり順は手前のマスで比べる", () => {
    expect(depthTile(4, 4, 1)).toEqual({ x: 4, y: 4 });
    expect(depthTile(4, 4, 2)).toEqual({ x: 5, y: 5 });
  });

  it("大きな建物は4マスの真ん中、区画は区画の真ん中に描く", () => {
    expect(footprintCenter(4, 4, 1)).toEqual(tileCenter(4, 4));
    expect(footprintCenter(4, 4, 2)).toEqual({ sx: 0, sy: 160 });
    expect(plotCenter(plotOf("town"))).toEqual(tileCenter(3, 3));
  });
});

describe("雲とお祝いの文", () => {
  it("雲の札とスプルのひとこと", () => {
    expect(cloudLabel(plotOf("bamboo"))).toBe("竹林 Lv.4で解放");
    expect(cloudLine(plotOf("bamboo"))).toBe("レベル4になると雲が晴れるよ");
  });

  it("お祝いの見出しは、1つなら「〇〇エリア」、2つ以上なら名前を並べる", () => {
    expect(unlockTitle([plotOf("bamboo")])).toBe("竹林エリアが広がったよ！");
    expect(unlockTitle([plotOf("bamboo"), plotOf("beach")])).toBe("竹林・海辺が広がったよ！");
  });

  it("区画ごとのひとことと、雲が晴れた後のひとこと", () => {
    expect(unlockLine("beach")).toBe("海のにおいがするね！");
    expect(unlockLine("unknown")).toBe("新しい土地が広がったよ");
    expect(openedLine(plotOf("bamboo"))).toBe("竹林に行けるようになったよ！");
  });

  it("お祝いで地図を動かす先は、いちばん必要レベルの高い区画", () => {
    expect(unlockFocus([plotOf("bamboo"), plotOf("hill"), plotOf("beach")]).key).toBe("hill");
  });

  it("町の外にも置ける場所があるか", () => {
    const town = plotOf("town");
    expect(hasAnchorsOutside(validAnchors(landAt(1), [], 1, null), town)).toBe(false);
    expect(hasAnchorsOutside(validAnchors(landAt(4), [], 1, null), town)).toBe(true);
  });
});
```

`frontend/src/components/world/map-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { sceneViewBox } from "./iso";
import { homePlot, isAwayFromHome, isDragMove, mapLayout, plotViewBox, scrollForPlot } from "./map-view";
import type { WorldPlot } from "./types";

const plot = (key: string, x: number, y: number, w: number, h: number, minLevel: number): WorldPlot => ({
  key,
  name: key,
  x,
  y,
  w,
  h,
  min_level: minLevel,
  ground: "grass",
  unlocked: minLevel === 1,
});
const TOWN = plot("town", 0, 0, 7, 7, 1);
const BAMBOO = plot("bamboo", 7, 0, 5, 7, 4);
const BEACH = plot("beach", 0, 7, 7, 5, 7);
const HILL = plot("hill", 7, 7, 5, 5, 10);
const LAND = { width: 12, height: 12, plots: [BAMBOO, TOWN, BEACH, HILL] };

describe("ドラッグの判定", () => {
  it("6px以上動いたらドラッグ", () => {
    expect(isDragMove(3, 4)).toBe(false);
    expect(isDragMove(0, 6)).toBe(true);
    expect(isDragMove(-5, -4)).toBe(true);
  });
});

describe("地図の範囲", () => {
  it("7×7はE回より前の町の絵と同じ範囲、12×12は地図全体", () => {
    expect(sceneViewBox(7, 7)).toEqual({ x: -240, y: -84, width: 480, height: 372 });
    expect(sceneViewBox(12, 12)).toEqual({ x: -400, y: -84, width: 800, height: 532 });
  });

  it("最初から開いている区画は町", () => {
    expect(homePlot(LAND).key).toBe("town");
  });

  it("区画だけの範囲は、区画の位置の分ずらす", () => {
    expect(plotViewBox(TOWN)).toEqual(sceneViewBox(7, 7));
    expect(plotViewBox(BAMBOO)).toEqual({ x: -16, y: 28, width: 416, height: 340 });
  });

  it("町が枠の横幅に収まる縮尺にする", () => {
    expect(mapLayout(LAND, 480)).toEqual({ map: sceneViewBox(12, 12), scale: 1, width: 800, height: 532, viewHeight: 372 });
    expect(mapLayout(LAND, 360)).toMatchObject({ scale: 0.75, width: 600, viewHeight: 279 });
  });
});

describe("スクロール位置", () => {
  const layout = mapLayout(LAND, 480);

  it("町を開いたときは、E回より前と同じく町が枠にちょうど収まる", () => {
    expect(scrollForPlot(TOWN, layout, 480)).toEqual({ left: 160, top: 0 });
  });

  it("区画の真ん中を枠の真ん中に出し、地図の外にははみ出さない", () => {
    expect(scrollForPlot(HILL, layout, 480)).toEqual({ left: 160, top: 160 });
    expect(scrollForPlot(BEACH, layout, 480)).toEqual({ left: 0, top: 96 });
  });

  it("最初の位置から枠の4分の1より離れたら「スプルの家へ戻る」を出す", () => {
    const home = { left: 160, top: 0 };
    expect(isAwayFromHome({ left: 160, top: 0 }, home, 480, 372)).toBe(false);
    expect(isAwayFromHome({ left: 260, top: 0 }, home, 480, 372)).toBe(false);
    expect(isAwayFromHome({ left: 281, top: 0 }, home, 480, 372)).toBe(true);
    expect(isAwayFromHome({ left: 160, top: 94 }, home, 480, 372)).toBe(true);
  });
});
```

`frontend/src/components/world/liveliness.test.ts` の `describe("にぎやか度の数え方", ...)` の最後に足す:

```ts
  it("2×2の建物は2倍で数える(1つ目+6、2つ目から+2)", () => {
    const castle = { ...item(9), footprint: 2 };
    expect(livelinessScore([castle, castle, item(1)], 0)).toBe(6 + 2 + 3);
  });
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/land.test.ts src/components/world/map-view.test.ts src/components/world/liveliness.test.ts`
Expected: FAIL（`./land`・`./map-view` が見つからない、`sceneViewBox(12, 12)` の引数、2×2の建物が+3で数えられる）

- [ ] **Step 3: 型を新しいAPIに合わせる**

`frontend/src/components/world/types.ts`:
- `Landmark` の `key` を `"spru_house" | "torii" | "stone_lantern" | "garden" | "bamboo_grove" | "pier"` にする
- `WorldItem` の `asset_key` の次に足す:

```ts
  /** 使うマスの一辺。2なら (x, y) を奥のマスにして2×2(設計書3-4) */
  footprint: number;
```

- `WorldLand` を次に置き換え、その前に `Ground`・`WorldPlot` を足す:

```ts
export type Ground = "grass" | "bamboo" | "sand" | "hill";

/** 土地の区画(設計書3-1)。unlocked はこの人のレベルで開いているか */
export type WorldPlot = {
  key: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  min_level: number;
  ground: Ground;
  unlocked: boolean;
};

export type WorldLand = {
  width: number;
  height: number;
  plots: WorldPlot[];
  /** landmarks・paths・blocked は開いている区画のものだけ */
  landmarks: Landmark[];
  paths: Tile[];
  blocked: Tile[];
  spru: { x: number; y: number };
};
```

- `WorldData` の `family_count: number;` の次に足す:

```ts
  /** 開いたが、まだ祝っていない区画のキー(必要レベルの低い順) */
  plots_new: string[];
```

- `ShopListItem` の `asset_key: string | null;` の次に `footprint: number;` を足す

`frontend/src/components/spru/hint.test.ts` の `item` の返す値に `footprint: 1,`（`asset_key: "bench",` の次）を、`bagItem` の返す値に `footprint: 1,`（`asset_key: "bench",` の次）を足す。

- [ ] **Step 4: 地図全体の範囲を横と縦で出す**

`frontend/src/components/world/iso.ts` の `sceneViewBox` を次に置き換える:

```ts
// 地図全体(横 width × 縦 height マス)を描く範囲。上は奥の目印・アイテムが伸びる分、下は土地の厚みの分をあける
export function sceneViewBox(width: number, height: number): ViewBox {
  const top = -84;
  const bottom = (width + height) * HALF_H + LAND_THICKNESS + 24;
  return { x: -height * HALF_W - 16, y: top, width: (width + height) * HALF_W + 32, height: bottom - top };
}
```

- [ ] **Step 5: 土地の計算を書く**

`frontend/src/components/world/land.ts`:

```ts
import { tileCenter, tileKey } from "./iso";
import type { Tile, WorldItem, WorldLand, WorldPlot } from "./types";

type Plots = Pick<WorldLand, "plots">;
type Rect = Pick<WorldPlot, "x" | "y" | "w" | "h">;
type Placed = Pick<WorldItem, "id" | "x" | "y" | "footprint">;

// 区画が開いたときのお祝いのひとこと(設計書5-2)
const UNLOCK_LINES: Record<string, string> = {
  bamboo: "竹がさらさら鳴ってるよ",
  beach: "海のにおいがするね！",
  hill: "ここなら大きな建物が建てられそう！",
};

const inRect = (rect: Rect, x: number, y: number) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

/** マスが入っている区画(地図の外なら null) */
export function plotAt(land: Plots, x: number, y: number): WorldPlot | null {
  return land.plots.find((plot) => inRect(plot, x, y)) ?? null;
}

export function isOpenTile(land: Plots, x: number, y: number): boolean {
  return plotAt(land, x, y)?.unlocked ?? false;
}

/** 開いている区画のマス(奥から手前の順) */
export function openTiles(land: Plots): Tile[] {
  const tiles: Tile[] = [];
  for (const plot of land.plots) {
    if (!plot.unlocked) continue;
    for (let y = plot.y; y < plot.y + plot.h; y++) {
      for (let x = plot.x; x < plot.x + plot.w; x++) tiles.push([x, y]);
    }
  }
  return tiles.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
}

/** 土地の側面を描くマス。left は左手前(x, y+1)、right は右手前(x+1, y)に開いた土地が続かないマス */
export function landEdges(land: Plots): { left: Tile[]; right: Tile[] } {
  const tiles = openTiles(land);
  return {
    left: tiles.filter(([x, y]) => !isOpenTile(land, x, y + 1)),
    right: tiles.filter(([x, y]) => !isOpenTile(land, x + 1, y)),
  };
}

/** (x, y) を奥のマスにして使うマス */
export function footprintTiles(x: number, y: number, footprint: number): Tile[] {
  const tiles: Tile[] = [];
  for (let dy = 0; dy < footprint; dy++) {
    for (let dx = 0; dx < footprint; dx++) tiles.push([x + dx, y + dy]);
  }
  return tiles;
}

/** 置いたアイテム(exceptId を除く)が使っているマス */
export function occupiedTiles(items: Placed[], exceptId: number | null): Set<string> {
  const occupied = new Set<string>();
  for (const item of items) {
    if (item.id === exceptId || item.x === null || item.y === null) continue;
    for (const [x, y] of footprintTiles(item.x, item.y, item.footprint)) occupied.add(tileKey(x, y));
  }
  return occupied;
}

/** 置ける場所(奥のマス)。使うマスがすべて、開いた区画にあり、目印・道でなく、ほかと重ならない(設計書3-4) */
export function validAnchors(land: WorldLand, items: Placed[], footprint: number, exceptId: number | null): Set<string> {
  const blocked = new Set(land.blocked.map(([x, y]) => tileKey(x, y)));
  const occupied = occupiedTiles(items, exceptId);
  const anchors = new Set<string>();
  for (let y = 0; y < land.height; y++) {
    for (let x = 0; x < land.width; x++) {
      const fits = footprintTiles(x, y, footprint).every(
        ([tx, ty]) => isOpenTile(land, tx, ty) && !blocked.has(tileKey(tx, ty)) && !occupied.has(tileKey(tx, ty)),
      );
      if (fits) anchors.add(tileKey(x, y));
    }
  }
  return anchors;
}

/** 重なり順に使うマス。大きな建物は手前のマスで比べる(設計書3-4) */
export function depthTile(x: number, y: number, footprint: number): { x: number; y: number } {
  return { x: x + footprint - 1, y: y + footprint - 1 };
}

/** 絵を描く位置。大きな建物は4マスの真ん中 */
export function footprintCenter(x: number, y: number, footprint: number): { sx: number; sy: number } {
  return tileCenter(x + (footprint - 1) / 2, y + (footprint - 1) / 2);
}

export function plotCenter(plot: Rect): { sx: number; sy: number } {
  return tileCenter(plot.x + (plot.w - 1) / 2, plot.y + (plot.h - 1) / 2);
}

export function cloudLabel(plot: Pick<WorldPlot, "name" | "min_level">): string {
  return `${plot.name} Lv.${plot.min_level}で解放`;
}

export function cloudLine(plot: Pick<WorldPlot, "min_level">): string {
  return `レベル${plot.min_level}になると雲が晴れるよ`;
}

export function unlockTitle(plots: Pick<WorldPlot, "name">[]): string {
  return plots.length === 1 ? `${plots[0].name}エリアが広がったよ！` : `${plots.map((plot) => plot.name).join("・")}が広がったよ！`;
}

export function unlockLine(key: string): string {
  return UNLOCK_LINES[key] ?? "新しい土地が広がったよ";
}

export function openedLine(plot: Pick<WorldPlot, "name">): string {
  return `${plot.name}に行けるようになったよ！`;
}

/** お祝いで地図を動かす先。いちばん必要レベルの高い区画(設計書3-2) */
export function unlockFocus(plots: WorldPlot[]): WorldPlot {
  return plots.reduce((a, b) => (b.min_level > a.min_level ? b : a));
}

/** 置く場所を選ぶとき、その区画(最初に見えている町)の外にも置ける場所があるか */
export function hasAnchorsOutside(anchors: Set<string>, plot: Rect): boolean {
  for (const key of anchors) {
    const [x, y] = key.split(",").map(Number);
    if (!inRect(plot, x, y)) return true;
  }
  return false;
}
```

- [ ] **Step 6: 地図の枠の計算を書く**

`frontend/src/components/world/map-view.ts`:

```ts
import { HALF_H, HALF_W, sceneViewBox, type ViewBox } from "./iso";
import type { WorldLand, WorldPlot } from "./types";

type Rect = Pick<WorldPlot, "x" | "y" | "w" | "h">;
type Scroll = { left: number; top: number };

// マウスでこれ以上動かしたらドラッグとみなし、離したときのタップを起こさない(設計書3-3)
export const DRAG_THRESHOLD = 6;

/** map は地図全体のSVGの範囲、scale はSVGの1単位のpx、width・height は地図全体のpx、viewHeight は枠の高さのpx */
export type MapLayout = { map: ViewBox; scale: number; width: number; height: number; viewHeight: number };

export function isDragMove(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD;
}

/** 最初から開いている区画(町) */
export function homePlot(land: Pick<WorldLand, "plots">): WorldPlot {
  return land.plots.reduce((a, b) => (b.min_level < a.min_level ? b : a));
}

/** 区画だけを描いたときの範囲(E回より前の町の絵と同じ余白) */
export function plotViewBox(plot: Rect): ViewBox {
  const box = sceneViewBox(plot.w, plot.h);
  return { ...box, x: box.x + (plot.x - plot.y) * HALF_W, y: box.y + (plot.x + plot.y) * HALF_H };
}

/** 町が枠の横幅にちょうど収まる縮尺で、地図全体の大きさと枠の高さを出す(設計書3-3) */
export function mapLayout(land: Pick<WorldLand, "width" | "height" | "plots">, viewWidth: number): MapLayout {
  const home = plotViewBox(homePlot(land));
  const map = sceneViewBox(land.width, land.height);
  const scale = viewWidth / home.width;
  return { map, scale, width: map.width * scale, height: map.height * scale, viewHeight: home.height * scale };
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(max, 0));

/** 区画の真ん中を枠の真ん中に出すスクロール位置(地図の外にははみ出さない) */
export function scrollForPlot(plot: Rect, layout: MapLayout, viewWidth: number): Scroll {
  const box = plotViewBox(plot);
  const left = (box.x + box.width / 2 - layout.map.x) * layout.scale - viewWidth / 2;
  const top = (box.y + box.height / 2 - layout.map.y) * layout.scale - layout.viewHeight / 2;
  return { left: clamp(left, layout.width - viewWidth), top: clamp(top, layout.height - layout.viewHeight) };
}

/** 最初の位置(町が枠に収まる位置)から、枠の幅か高さの4分の1より離れたか(「スプルの家へ戻る」を出す) */
export function isAwayFromHome(scroll: Scroll, home: Scroll, viewWidth: number, viewHeight: number): boolean {
  return Math.abs(scroll.left - home.left) > viewWidth / 4 || Math.abs(scroll.top - home.top) > viewHeight / 4;
}
```

- [ ] **Step 7: にぎやか度で大きな建物を2倍に数える**

`frontend/src/components/world/liveliness.ts`:
- `LIVELINESS_LEVELS` の上のコメントを `/** にぎやか度の段階(設計書3-2)。E回で土地が広がったときに見直し、据え置いた(E回の設計書3-6) */` にする
- `livelinessScore` と `liveliness` を次に置き換える:

```ts
type Countable = Pick<WorldItem, "shop_item_id" | "x" | "y"> & { footprint?: number };

/** 置いたアイテムは種類ごとに1つ目+3・2つ目から+1(2×2の建物はその2倍)、仲間は1人+3。バッグのアイテムは数えない */
export function livelinessScore(items: Countable[], companionCount: number): number {
  const perKind = new Map<number, { count: number; footprint: number }>();
  for (const item of items) {
    if (item.x === null || item.y === null) continue;
    const kind = perKind.get(item.shop_item_id);
    perKind.set(item.shop_item_id, { count: (kind?.count ?? 0) + 1, footprint: item.footprint ?? 1 });
  }
  let score = companionCount * PER_COMPANION;
  for (const { count, footprint } of perKind.values()) score += (FIRST_OF_KIND + (count - 1) * SAME_KIND) * footprint;
  return score;
}
```

```ts
export function liveliness(items: Countable[], companionCount: number): Liveliness {
  return levelForScore(livelinessScore(items, companionCount));
}
```

- [ ] **Step 8: 今の町の画面を新しい型でも動くようにする（仮）**

`frontend/src/components/world/world-screen.tsx`:
- `import { tileKey } from "./iso";` を消し、`import { liveliness, livelinessUpLine } from "./liveliness";` の前に `import { validAnchors } from "./land";` を足す
- `validTiles` の `useMemo` を次に置き換える:

```ts
  const validTiles = useMemo(
    () => (world && placingItem ? validAnchors(world.land, world.items, placingItem.footprint, placingItem.id) : new Set<string>()),
    [world, placingItem],
  );
```

`frontend/src/components/world/world-scene.tsx:97-98` を次にする（Task 5で区画の形に沿って描き直す）:

```ts
  const vb = sceneViewBox(land.width, land.height);
  const n = land.width;
```

- [ ] **Step 9: テスト・型チェック・lintを通す**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: テストは `150 passed`（122＋land 19＋map-view 8＋liveliness 1）、型チェック・lintはエラーなし

- [ ] **Step 10: コミット**

```bash
git add frontend/src/components/world/land.ts frontend/src/components/world/land.test.ts frontend/src/components/world/map-view.ts frontend/src/components/world/map-view.test.ts frontend/src/components/world/types.ts frontend/src/components/world/iso.ts frontend/src/components/world/liveliness.ts frontend/src/components/world/liveliness.test.ts frontend/src/components/world/world-screen.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/spru/hint.test.ts
git commit -m "#00135: feature:区画・置ける場所・地図の枠のスクロール位置の計算と、2×2の建物をにぎやか度で2倍に数える処理を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: アイテムと目印の絵

**Files:**
- Create: `frontend/src/components/world/art-keys.ts`・`art-keys.test.ts`
- Modify: `frontend/src/components/world/item-art.tsx`、`frontend/src/components/world/landmark-art.tsx`

**Interfaces:**
- Consumes: Task 2 の `config/world.php`（`asset_keys`・`asset_footprints`）
- Produces: `ITEM_ART_KEYS`、`ItemArtKey`、`BIG_ASSETS`、`isBigAsset(key: string | null): boolean`、`ItemArt` の新しい絵8つ（原点は、1マスはマスの中心、2×2は4マスの真ん中）、`ItemIcon` は2×2の絵なら広い範囲で描く、`ITEM_LIGHTS` に `stone_lantern`・`tower`、`LandmarkArt` の `bamboo_grove`・`pier`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/world/art-keys.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { BIG_ASSETS, ITEM_ART_KEYS, isBigAsset } from "./art-keys";

// サーバーの設定(Ownerがショップに登録できる絵のキー)と、画面の絵の一覧がずれていないか確かめる
const config = readFileSync(fileURLToPath(new URL("../../../../config/world.php", import.meta.url)), "utf8");

function phpArray(name: string): string {
  const match = config.match(new RegExp(`'${name}'\\s*=>\\s*\\[([^\\]]*)\\]`));
  if (!match) throw new Error(`${name} が config/world.php に見つからない`);
  return match[1];
}

describe("町のアイテムの絵のキー", () => {
  it("config/world.php の asset_keys と同じ", () => {
    const keys = [...phpArray("asset_keys").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect([...ITEM_ART_KEYS].sort()).toEqual(keys.sort());
  });

  it("2×2の絵は config/world.php の asset_footprints と同じ", () => {
    const big = [...phpArray("asset_footprints").matchAll(/'([a-z_]+)'\s*=>\s*2/g)].map((m) => m[1]);
    expect([...BIG_ASSETS].sort()).toEqual(big.sort());
  });

  it("2×2の絵かどうかを返す", () => {
    expect(isBigAsset("castle")).toBe(true);
    expect(isBigAsset("bench")).toBe(false);
    expect(isBigAsset(null)).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/art-keys.test.ts`
Expected: FAIL（`./art-keys` が見つからない）

- [ ] **Step 3: 絵のキーの一覧を書く**

`frontend/src/components/world/art-keys.ts`:

```ts
/** 町のアイテムの絵のキー。config/world.php の asset_keys と必ず一致させる(art-keys.test.ts で確かめる) */
export const ITEM_ART_KEYS = [
  "bench",
  "flowerbed",
  "chochin",
  "tree",
  "sakura",
  "vending",
  "bicycle",
  "stall",
  "stone_lantern",
  "bamboo",
  "fountain",
  "palm",
  "parasol",
  "pagoda",
  "castle",
  "tower",
] as const;

export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];

/** 2×2マスの絵(設計書3-4)。config/world.php の asset_footprints と必ず一致させる */
export const BIG_ASSETS: readonly ItemArtKey[] = ["fountain", "pagoda", "castle", "tower"];

export function isBigAsset(key: string | null): boolean {
  return key !== null && (BIG_ASSETS as readonly string[]).includes(key);
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/art-keys.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: アイテムの絵を描く**

`frontend/src/components/world/item-art.tsx`:
- import を次にする:

```ts
import type { ReactNode } from "react";

import { SPRU_BLOOM } from "@/components/spru/spru-assets";

import { isBigAsset, type ItemArtKey } from "./art-keys";
import { LandmarkArt } from "./landmark-art";
```

- `const ART: Record<string, ReactNode> = {` を `const ART: Record<ItemArtKey | "spru_flower", ReactNode> = {` にする（`ItemArtKey` の絵が1つでも欠けると型チェックで気づける）
- `ART` の上に、箱と屋根を描く部品を足す:

```tsx
// 原点を中心にした、横の半幅 w・高さ h の箱を、地面から lift 持ち上げて描く(左の面・右の面・上の面)
function IsoBox({ w, h, lift = 0, left, right, top }: { w: number; h: number; lift?: number; left: string; right: string; top: string }) {
  const b = -lift;
  const q = w / 2;
  return (
    <>
      <polygon points={`${-w},${b} 0,${b + q} 0,${b + q - h} ${-w},${b - h}`} fill={left} />
      <polygon points={`0,${b + q} ${w},${b} ${w},${b - h} 0,${b + q - h}`} fill={right} />
      <polygon points={`${-w},${b - h} 0,${b + q - h} ${w},${b - h} 0,${b - q - h}`} fill={top} />
    </>
  );
}

// 原点を中心にした、横の半幅 w・高さ h の四角すいの屋根を、地面から lift 持ち上げて描く
function IsoRoof({ w, h, lift = 0, left, right }: { w: number; h: number; lift?: number; left: string; right: string }) {
  const b = -lift;
  const q = w / 2;
  return (
    <>
      <polygon points={`${-w},${b} 0,${b + q} 0,${b - h}`} fill={left} />
      <polygon points={`0,${b + q} ${w},${b} 0,${b - h}`} fill={right} />
    </>
  );
}
```

- `ART` の `stall` の後に、新しい絵を足す（1マスの絵はマスの中心、2×2の絵は4マスの真ん中が原点。4マスの菱形は横±64・縦±32）:

```tsx
  stone_lantern: <LandmarkArt landmarkKey="stone_lantern" />,
  bamboo: (
    <g>
      <ellipse cx={0} cy={2} rx={14} ry={5} fill="#2f5d2a" opacity={0.15} />
      <path d="M-7 2 V-42 M1 4 V-54 M8 1 V-36" stroke="#6fae4a" strokeWidth={3.4} strokeLinecap="round" />
      <path
        d="M-8.7 -14 h3.4 M-8.7 -28 h3.4 M-0.7 -18 h3.4 M-0.7 -36 h3.4 M6.3 -12 h3.4 M6.3 -24 h3.4"
        stroke="#4e8a32"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <ellipse cx={-13} cy={-40} rx={6.5} ry={2.3} fill="#7cc35a" transform="rotate(-24 -13 -40)" />
      <ellipse cx={7} cy={-52} rx={6.5} ry={2.3} fill="#86c56d" transform="rotate(22 7 -52)" />
      <ellipse cx={-5} cy={-48} rx={5.5} ry={2} fill="#6fae4a" transform="rotate(-30 -5 -48)" />
      <ellipse cx={14} cy={-34} rx={6} ry={2.2} fill="#7cc35a" transform="rotate(26 14 -34)" />
    </g>
  ),
  palm: (
    <g>
      <ellipse cx={0} cy={2} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <path d="M0 2 C3 -14 -3 -30 4 -46" stroke="#a8703f" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M-2 -8 h4.5 M-1 -18 h4.5 M-0.5 -28 h4.5 M1 -38 h4.5" stroke="#8e5c33" strokeWidth={1.2} />
      <path d="M4 -46 Q-8 -54 -20 -44 Q-8 -49 4 -46 Z" fill="#4fa35a" />
      <path d="M4 -46 Q16 -54 28 -44 Q16 -49 4 -46 Z" fill="#5cb866" />
      <path d="M4 -46 Q-4 -60 -14 -62 Q-4 -55 4 -46 Z" fill="#5cb866" />
      <path d="M4 -46 Q12 -60 22 -62 Q12 -55 4 -46 Z" fill="#4fa35a" />
      <circle cx={1.5} cy={-43} r={2.6} fill="#8e5c33" />
      <circle cx={6.5} cy={-42.5} r={2.6} fill="#7a4e2c" />
    </g>
  ),
  parasol: (
    <g>
      <ellipse cx={0} cy={2} rx={15} ry={5.5} fill="#2f5d2a" opacity={0.13} />
      <polygon points="-16,1 -2,8 10,2 -4,-5" fill="#5aa9e6" />
      <path d="M-13 1.5 L-1 7.5 M-9 -0.5 L3 5.5" stroke="#fff4e6" strokeWidth={1.2} />
      <path d="M2 4 L-1 -34" stroke="#e8dfcf" strokeWidth={2} strokeLinecap="round" />
      <path d="M-21 -30 Q-12 -46 -1 -46 L-1 -30 Z" fill="#e5533f" />
      <path d="M-1 -46 Q11 -46 19 -30 L-1 -30 Z" fill="#fff4e6" />
      <path d="M-11 -30 Q-8 -44 -1 -46 Q5 -44 8 -30 Z" fill="#f6c342" />
      <path
        d="M-21 -30 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0"
        fill="none"
        stroke="#c9432f"
        strokeWidth={1.2}
      />
      <circle cx={-1} cy={-47} r={1.8} fill="#c9432f" />
    </g>
  ),
  fountain: (
    <g>
      <ellipse cx={0} cy={6} rx={54} ry={25} fill="#2f5d2a" opacity={0.14} />
      <ellipse cx={0} cy={0} rx={46} ry={21} fill="#a39b8d" />
      <rect x={-46} y={-9} width={92} height={9} fill="#b8b0a2" />
      <ellipse cx={0} cy={-9} rx={46} ry={21} fill="#d6cfc1" />
      <ellipse cx={0} cy={-9} rx={39} ry={17} fill="#62b8d6" />
      <ellipse cx={-10} cy={-13} rx={15} ry={4.5} fill="#a8e2f2" opacity={0.8} />
      <rect x={-5} y={-40} width={10} height={31} fill="#c9c1b3" />
      <ellipse cx={0} cy={-40} rx={15} ry={6.5} fill="#d6cfc1" />
      <ellipse cx={0} cy={-41} rx={11} ry={4.5} fill="#62b8d6" />
      <path
        d="M0 -44 C-3 -60 -15 -60 -21 -42 M0 -44 C3 -60 15 -60 21 -42 M0 -44 V-64"
        stroke="#bfe9f5"
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={-23} cy={-24} r={1.8} fill="#e6f7fb" />
      <circle cx={24} cy={-22} r={1.8} fill="#e6f7fb" />
      <circle cx={-4} cy={-68} r={1.6} fill="#e6f7fb" />
    </g>
  ),
  pagoda: (
    <g>
      <ellipse cx={0} cy={6} rx={48} ry={22} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={34} h={6} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <IsoBox w={20 - i * 2.5} h={11} lift={6 + i * 17} left="#e0573e" right="#c94a33" top="#e0573e" />
          <IsoBox w={33 - i * 2.5} h={3} lift={17 + i * 17} left="#4a3f3a" right="#3a2e2a" top="#5b4f49" />
        </g>
      ))}
      <path d="M0 -92 V-120" stroke="#d4a72c" strokeWidth={2.4} />
      <path d="M-3 -100 h6 M-3 -106 h6 M-3 -112 h6" stroke="#d4a72c" strokeWidth={1.6} />
      <circle cx={0} cy={-121} r={2.4} fill="#d4a72c" />
    </g>
  ),
  castle: (
    <g>
      <ellipse cx={0} cy={6} rx={56} ry={25} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={46} h={16} left="#a39b8d" right="#8f887b" top="#b8b0a2" />
      <IsoBox w={32} h={22} lift={16} left="#fbf6ec" right="#e8dfcf" top="#fbf6ec" />
      <polygon points="-22.4,-18.2 -17.6,-15.8 -17.6,-22.8 -22.4,-25.2" fill="#3a2e2a" />
      <polygon points="-12.8,-13.4 -8,-11 -8,-18 -12.8,-20.4" fill="#3a2e2a" />
      <polygon points="9.6,-11.8 14.4,-14.2 14.4,-21.2 9.6,-18.8" fill="#3a2e2a" />
      <polygon points="19.2,-16.6 24,-19 24,-26 19.2,-23.6" fill="#3a2e2a" />
      <IsoBox w={40} h={4} lift={38} left="#3f5a66" right="#324a55" top="#4f6d7a" />
      <IsoBox w={22} h={18} lift={42} left="#fbf6ec" right="#e8dfcf" top="#fbf6ec" />
      <IsoRoof w={30} h={22} lift={60} left="#3f5a66" right="#324a55" />
      <path d="M-3 -84 l-3 -5 M3 -84 l3 -5" stroke="#d4a72c" strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  tower: (
    <g>
      <ellipse cx={0} cy={6} rx={42} ry={19} fill="#2f5d2a" opacity={0.14} />
      <path
        d="M-34 0 L-5 -96 M34 0 L5 -96 M-14 12 L-2 -96 M14 12 L2 -96"
        stroke="#e5533f"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M-30 -14 L22 -40 M30 -14 L-22 -40 M-20 -48 L14 -70 M20 -48 L-14 -70" stroke="#e5533f" strokeWidth={1.6} />
      <path d="M-27 -24 H27 M-17 -58 H17 M-10 -80 H10" stroke="#fff4e6" strokeWidth={3} strokeLinecap="round" />
      <IsoBox w={18} h={7} lift={48} left="#e8dfcf" right="#d4c9b4" top="#fbf6ec" />
      <IsoBox w={9} h={5} lift={96} left="#e8dfcf" right="#d4c9b4" top="#fbf6ec" />
      <path d="M0 -106 V-140" stroke="#e5533f" strokeWidth={3} strokeLinecap="round" />
      <path d="M0 -118 V-128" stroke="#fff4e6" strokeWidth={3} />
      <circle cx={0} cy={-141} r={2.4} fill="#ffd35c" />
    </g>
  ),
```

- `ITEM_LIGHTS` に足す:

```ts
  stone_lantern: { cx: 0, cy: -20.5, r: 11 },
  tower: { cx: 0, cy: -141, r: 9 },
```

- `ItemArt` と `ItemIcon` を次にする:

```tsx
export function ItemArt({ assetKey }: { assetKey: string | null }) {
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
  // 2×2の建物は4マスぶん横に広く、タワーは高いので、広い範囲で描く
  const viewBox = isBigAsset(assetKey) ? "-70 -150 140 180" : "-34 -62 68 72";
  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden className={className}>
      <ItemArt assetKey={assetKey} />
    </svg>
  );
}
```

- [ ] **Step 6: 目印の絵を描く**

`frontend/src/components/world/landmark-art.tsx` の `ART` の `stone_lantern` の後に足す:

```tsx
  bamboo_grove: () => (
    <g>
      <ellipse cx={0} cy={2} rx={20} ry={8} fill="#2f5d2a" opacity={0.16} />
      <path
        d="M-14 0 V-50 M-6 4 V-64 M3 -2 V-58 M11 3 V-70 M17 -1 V-46"
        stroke="#5f9f3f"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <path
        d="M-15.7 -18 h3.4 M-7.7 -24 h3.4 M1.3 -20 h3.4 M9.3 -28 h3.4 M15.3 -16 h3.4 M-7.7 -44 h3.4 M9.3 -50 h3.4"
        stroke="#437a2b"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <ellipse cx={-18} cy={-48} rx={7} ry={2.4} fill="#7cc35a" transform="rotate(-25 -18 -48)" />
      <ellipse cx={-2} cy={-62} rx={7} ry={2.4} fill="#86c56d" transform="rotate(20 -2 -62)" />
      <ellipse cx={7} cy={-56} rx={6} ry={2.2} fill="#6fae4a" transform="rotate(-20 7 -56)" />
      <ellipse cx={16} cy={-68} rx={7} ry={2.4} fill="#7cc35a" transform="rotate(25 16 -68)" />
      <ellipse cx={21} cy={-44} rx={6} ry={2.2} fill="#86c56d" transform="rotate(20 21 -44)" />
      <ellipse cx={-9} cy={-58} rx={6} ry={2.2} fill="#6fae4a" transform="rotate(-30 -9 -58)" />
    </g>
  ),
  // 桟橋は、マスから左手前(yが大きくなる向き)の海へ伸びる
  pier: () => (
    <g>
      <polygon points="19.2,0 -41.6,30.4 -41.6,34.4 19.2,4" fill="#8e5c33" />
      <polygon points="0,-9.6 19.2,0 -41.6,30.4 -60.8,20.8" fill="#c8915c" />
      <path
        d="M-12.16 -3.52 L7.04 6.08 M-24.32 2.56 L-5.12 12.16 M-36.48 8.64 L-17.28 18.24 M-48.64 14.72 L-29.44 24.32"
        stroke="#a8703f"
        strokeWidth={1}
      />
      <path d="M-41.6 30.4 v10 M-60.8 20.8 v10 M-20 19.6 v8" stroke="#6e472b" strokeWidth={2.6} strokeLinecap="round" />
    </g>
  ),
```

- [ ] **Step 7: テスト・型チェック・lintを通す**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: テストは `153 passed`（150＋3）、型チェック・lintはエラーなし

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/world/art-keys.ts frontend/src/components/world/art-keys.test.ts frontend/src/components/world/item-art.tsx frontend/src/components/world/landmark-art.tsx
git commit -m "#00136: feature:竹・ヤシの木・ビーチパラソルと、噴水・五重塔・お城・タワー(2×2)、竹やぶ・桟橋の絵を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 地図の枠と、広がる土地・雲・大きな建物の描画

**Files:**
- Create: `frontend/src/components/world/town-map.tsx`
- Modify: `frontend/src/components/world/world-scene.tsx`（全体）、`frontend/src/components/world/world-screen.tsx`（import・雲の札・町の絵のまわり）、`frontend/src/components/family/family-town.tsx:211-235`、`frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Task 3 の `land.ts`・`map-view.ts`・型、Task 4 の `isBigAsset`・絵
- Produces:
  - `TownMap({ land: WorldLand; focus: { plot: WorldPlot; at: number } | null; children: ReactNode })` — `focus` の `at` が変わるたびに、その区画を枠の真ん中へ動かす
  - `WorldScene` の新しいprops: `onCloudTap?: (plot: WorldPlot) => void`（無ければ雲の札は押せない）、`veil?: { keys: string[]; fading: boolean } | null`（開いた区画の上に雲を重ねる。`fading` で散らす）、`preview?: { x: number; y: number; item: WorldItem } | null`（2×2の下見）
  - CSS: `.animate-cloud-clear`、`.town-map-scroll`

画面の自動テストは無いので、この Task の確かめは型チェック・lint・既存のテストと、Step 7 のブラウザでの見た目の確認で行う。

- [ ] **Step 1: 地図の枠を書く**

`frontend/src/components/world/town-map.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type MouseEvent } from "react";
import { House } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { prefersReducedMotion } from "@/lib/motion";

import { homePlot, isAwayFromHome, isDragMove, mapLayout, scrollForPlot } from "./map-view";
import type { WorldLand, WorldPlot } from "./types";

type Drag = { x: number; y: number; left: number; top: number; moved: boolean };

/**
 * 町の地図の枠(設計書3-3・5-1)。町が枠の横幅に収まる縮尺で地図全体を描き、はみ出した分はスクロールで見る。
 * スマホは指でスクロール、PCはマウスのドラッグ・ホイール・矢印キーで動かす
 */
export function TownMap({
  land,
  focus,
  children,
}: {
  land: WorldLand;
  focus: { plot: WorldPlot; at: number } | null;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const measuredWidth = useRef(0);
  const positioned = useRef(false);
  const [viewWidth, setViewWidth] = useState(0);
  const [away, setAway] = useState(false);
  const layout = viewWidth > 0 ? mapLayout(land, viewWidth) : null;

  // 枠の幅を測る。幅が変わったら(スマホを横にした等)、町が枠に収まる位置に戻す
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width === measuredWidth.current) return;
      measuredWidth.current = width;
      positioned.current = false;
      setViewWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewWidth === 0 || positioned.current) return;
    positioned.current = true;
    const home = scrollForPlot(homePlot(land), mapLayout(land, viewWidth), viewWidth);
    el.scrollTo({ left: home.left, top: home.top });
  }, [land, viewWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !focus || viewWidth === 0) return;
    const target = scrollForPlot(focus.plot, mapLayout(land, viewWidth), viewWidth);
    el.scrollTo({ left: target.left, top: target.top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [focus, land, viewWidth]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !layout) return;
    const home = scrollForPlot(homePlot(land), layout, viewWidth);
    setAway(isAwayFromHome({ left: el.scrollLeft, top: el.scrollTop }, home, viewWidth, layout.viewHeight));
  }

  function goHome() {
    const el = scrollRef.current;
    if (!el || !layout) return;
    const home = scrollForPlot(homePlot(land), layout, viewWidth);
    el.scrollTo({ left: home.left, top: home.top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  // 指のスクロールはブラウザにまかせ、マウスだけドラッグで動かす
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    const el = scrollRef.current;
    if (e.pointerType !== "mouse" || e.button !== 0 || !el) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = scrollRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && !isDragMove(dx, dy)) return;
    d.moved = true;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  }

  function handlePointerUp() {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  }

  // ドラッグした後に指を離した場所のボタン(アイテム・マス・雲の札)を押した扱いにしない
  function handleClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        role="region"
        aria-label="町の地図。矢印キーで動かせます"
        tabIndex={0}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onClickCapture={handleClickCapture}
        className="town-map-scroll cursor-grab overflow-auto select-none focus-visible:outline-3 focus-visible:outline-[#f2b632] active:cursor-grabbing"
        style={{ height: layout?.viewHeight }}
      >
        {layout && (
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            {children}
          </div>
        )}
      </div>
      {away && (
        <button
          type="button"
          onClick={goHome}
          className="absolute right-2 bottom-2 flex h-10 items-center gap-1 rounded-full bg-[#fffaf0] px-3 text-[12.5px] font-black text-[#2e6b1c] shadow-[0_3px_8px_rgba(59,50,38,0.2)]"
        >
          <House className="h-4 w-4" aria-hidden />
          <span>
            <AutoFurigana text="スプルの家へ戻る" />
          </span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 町の絵を、四角でない土地・雲・大きな建物が描けるように作り直す**

`frontend/src/components/world/world-scene.tsx` を次のとおり直す（ここに書いていない部分——スプル・仲間・吹き出しの中身・`CompanionFigure`・`PartnerTag`・`ReviewMark`——は今のまま）。

import を次にする:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";
import { bloomRect, type Bloom } from "@/components/spru/bloom";
import type { SpruView } from "@/components/spru/mood";
import {
  COMPANION_IMAGES,
  SPRU_BLOOM,
  SPRU_IMAGES,
  SPRU_STAND_HEIGHT,
  type CompanionKey,
} from "@/components/spru/spru-assets";
import { SpruFace } from "@/components/spru/spru-figure";

import { TIME_THEME } from "./ambience";
import { GardenArt } from "./garden-art";
import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ITEM_LIGHTS, ItemArt } from "./item-art";
import { cloudLabel, depthTile, footprintCenter, footprintTiles, landEdges, openTiles, plotAt, plotCenter } from "./land";
import { LandmarkArt } from "./landmark-art";
import type { TimeOfDay } from "./time-of-day";
import type { Ground, WorldCompanion, WorldGarden, WorldItem, WorldLand, WorldPlot } from "./types";
```

`TOWN_SCALE` の定義の次に足す:

```tsx
// 区画の地面の色(設計書3-1)。tile は市松の2色、lip は側面の上の縁(左手前・右手前)
const GROUND: Record<Ground, { tile: [string, string]; lip: [string, string] }> = {
  grass: { tile: ["#b4e19b", "#a9da8e"], lip: ["#86c56d", "#74b35d"] },
  bamboo: { tile: ["#94d17e", "#88c872"], lip: ["#6fae55", "#5f9e47"] },
  sand: { tile: ["#f3e2b3", "#ecd8a2"], lip: ["#e0c88c", "#d3ba7c"] },
  hill: { tile: ["#c8eda9", "#bee69d"], lip: ["#9fd684", "#8cc672"] },
};
const PATH_COLOR = "#f1dfbb";
const SOIL = { left: "#d7a574", right: "#bf8a5b" };
```

`SceneObject` と `TapTarget` を次にする（`x`・`y` は重なり順に使うマス、`sx`・`sy` は絵を描く位置）:

```tsx
// x, y は重なり順に使うマス(大きな建物は手前のマス)、sx, sy は絵を描く位置
type SceneObject =
  | { kind: "landmark"; id: string; x: number; y: number; sx: number; sy: number; landmarkKey: string }
  | { kind: "item"; id: string; x: number; y: number; sx: number; sy: number; item: WorldItem }
  | { kind: "companion"; id: string; x: number; y: number; sx: number; sy: number; companion: PlacedCompanion; index: number }
  | { kind: "spru"; id: string; x: number; y: number; sx: number; sy: number };

type TapTarget = {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  label: string;
  onTap: () => void;
  halfWidth: number;
  up: number;
  down: number;
};
```

`isPlacedCompanion` の次に足す:

```tsx
// 土地の側面(左手前・右手前)の形。depth は下へ伸ばす長さ
function leftFace(sx: number, sy: number, depth: number): string {
  return `${sx - HALF_W},${sy} ${sx},${sy + HALF_H} ${sx},${sy + HALF_H + depth} ${sx - HALF_W},${sy + depth}`;
}

function rightFace(sx: number, sy: number, depth: number): string {
  return `${sx},${sy + HALF_H} ${sx + HALF_W},${sy} ${sx + HALF_W},${sy + depth} ${sx},${sy + HALF_H + depth}`;
}

// 雲の区画を隠す雲。区画のマスに1つおきに丸を置いて、もこもこにする
function Clouds({ plot, className }: { plot: WorldPlot; className?: string }) {
  const puffs: { key: string; sx: number; sy: number }[] = [];
  for (let y = plot.y; y < plot.y + plot.h; y++) {
    for (let x = plot.x; x < plot.x + plot.w; x++) {
      if ((x + y) % 2 === 0) puffs.push({ key: tileKey(x, y), ...tileCenter(x, y) });
    }
  }
  return (
    <g className={className}>
      <g fill="#dfeaf2">
        {puffs.map((p) => (
          <circle key={p.key} cx={p.sx} cy={p.sy + 4} r={34} />
        ))}
      </g>
      <g fill="#ffffff">
        {puffs.map((p) => (
          <circle key={p.key} cx={p.sx} cy={p.sy - 4} r={33} />
        ))}
      </g>
    </g>
  );
}
```

`WorldScene` の props に足す（分割代入は `readOnly = false,` の前に `onCloudTap,`・`veil = null,`・`preview = null,`、型は `readOnly?: boolean;` の前に）:

```tsx
  onCloudTap?: (plot: WorldPlot) => void;
  veil?: { keys: string[]; fading: boolean } | null;
  preview?: { x: number; y: number; item: WorldItem } | null;
```

`const vb = sceneViewBox(land.width, land.height);` から `const bubble = ...` の前の行まで（`n`・`pathSet`・`placed`・`placedCompanions`・`tiles`・`objects`・`left`・`bottom`・`right`・`spruCenter` の定義）を次に置き換える:

```tsx
  const vb = sceneViewBox(land.width, land.height);
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const tiles = openTiles(land);
  const edges = landEdges(land);
  const groundOf = (x: number, y: number) => GROUND[plotAt(land, x, y)?.ground ?? "grass"];
  const lockedPlots = land.plots.filter((plot) => !plot.unlocked);
  const veiledPlots = veil ? land.plots.filter((plot) => veil.keys.includes(plot.key)) : [];
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);
  const placedCompanions = companions.filter(isPlacedCompanion);

  const at = (x: number, y: number) => ({ x, y, ...tileCenter(x, y) });
  // 奥から手前へ描くことで、手前の物が奥の物に重なる
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i) => ({ kind: "landmark" as const, id: `landmark-${i}`, ...at(l.x, l.y), landmarkKey: l.key })),
    ...placed.map((item) => ({
      kind: "item" as const,
      id: `item-${item.id}`,
      ...depthTile(item.x, item.y, item.footprint),
      ...footprintCenter(item.x, item.y, item.footprint),
      item,
    })),
    ...placedCompanions.map((companion, index) => ({
      kind: "companion" as const,
      id: `companion-${companion.key}`,
      ...at(companion.x, companion.y),
      companion,
      index,
    })),
    { kind: "spru" as const, id: "spru", ...at(land.spru.x, land.spru.y) },
  ].sort(byDepth);

  // 海は地図全体の下に描く(雲の区画も海の上に浮かぶ)
  const w = land.width;
  const h = land.height;
  const sea = `${-h * HALF_W},${h * HALF_H + 50} ${(w - h) * HALF_W},${(w + h) * HALF_H + 50} ${w * HALF_W},${w * HALF_H + 50} 0,50`;
  // 夜の暗さは、土地の形(側面とマス)に重ねる
  const landShapes = [
    ...edges.left.map(([x, y]) => leftFace(tileCenter(x, y).sx, tileCenter(x, y).sy, LAND_THICKNESS)),
    ...edges.right.map(([x, y]) => rightFace(tileCenter(x, y).sx, tileCenter(x, y).sy, LAND_THICKNESS)),
    ...tiles.map(([x, y]) => tilePoints(x, y)),
  ];
  const previewTiles = preview ? footprintTiles(preview.x, preview.y, preview.item.footprint) : [];
  const previewCenter = preview ? footprintCenter(preview.x, preview.y, preview.item.footprint) : null;
  const spruCenter = tileCenter(land.spru.x, land.spru.y);
```

`itemTargets`・`gardenTarget`・`tapTargets` の定義を次に置き換える:

```tsx
  // 押せる範囲は上に伸びて奥の物と重なるため、絵と同じく奥から順に並べて手前のボタンを上にする。置く場所を選んでいる間は出さない。
  // 畑は地面の上にあり、手前のアイテムの(背の高い物用に長い)範囲に隠れないよう最後に置く。見るだけ(家族の町)ではアイテムと畑は押せない
  const itemTargets: TapTarget[] = readOnly
    ? []
    : placed.map((item) => {
        const big = item.footprint > 1;
        return {
          id: `item-button-${item.id}`,
          ...depthTile(item.x, item.y, item.footprint),
          ...footprintCenter(item.x, item.y, item.footprint),
          label: `${item.name}(動かす・しまう)`,
          onTap: () => onItemTap(item),
          halfWidth: big ? 60 : HALF_W - 4,
          up: big ? 110 : 56,
          down: big ? 30 : 14,
        };
      });
  const gardenTarget: TapTarget[] = readOnly
    ? []
    : [{ id: "garden-button", ...at(garden.x, garden.y), label: "畑", onTap: onGardenTap, halfWidth: 22, up: 36, down: 12 }];
  const tapTargets: TapTarget[] = placing
    ? []
    : [
        ...itemTargets,
        ...placedCompanions.map((c) => ({
          id: `companion-button-${c.key}`,
          ...at(c.x, c.y),
          label: c.name,
          onTap: () => onCompanionTap(c.key),
          halfWidth: 14,
          up: 44,
          down: 4,
        })),
      ]
        .sort(byDepth)
        .concat(gardenTarget);
```

`<svg ...>` の中の、最初の海の `<polygon>` から `{theme.groundTint && (...)}` までを次に置き換える:

```tsx
        <polygon points={sea} fill="#62b8d6" opacity={0.55} />

        {edges.left.map(([x, y]) => {
          const { sx, sy } = tileCenter(x, y);
          return (
            <g key={`edge-left-${x},${y}`}>
              <polygon points={leftFace(sx, sy, LAND_THICKNESS)} fill={SOIL.left} stroke={SOIL.left} strokeWidth={0.6} />
              <polygon points={leftFace(sx, sy, 7)} fill={groundOf(x, y).lip[0]} />
              <path d={`M${sx - HALF_W} ${sy + LAND_THICKNESS} L${sx} ${sy + HALF_H + LAND_THICKNESS}`} stroke="#e6f7fb" strokeWidth={3} />
            </g>
          );
        })}
        {edges.right.map(([x, y]) => {
          const { sx, sy } = tileCenter(x, y);
          return (
            <g key={`edge-right-${x},${y}`}>
              <polygon points={rightFace(sx, sy, LAND_THICKNESS)} fill={SOIL.right} stroke={SOIL.right} strokeWidth={0.6} />
              <polygon points={rightFace(sx, sy, 7)} fill={groundOf(x, y).lip[1]} />
              <path d={`M${sx} ${sy + HALF_H + LAND_THICKNESS} L${sx + HALF_W} ${sy + LAND_THICKNESS}`} stroke="#e6f7fb" strokeWidth={3} />
            </g>
          );
        })}

        {tiles.map(([x, y]) => {
          const key = tileKey(x, y);
          const fill = pathSet.has(key) ? PATH_COLOR : groundOf(x, y).tile[(x + y) % 2];
          return <polygon key={key} points={tilePoints(x, y)} fill={fill} />;
        })}

        {theme.groundTint && (
          <g fill={theme.groundTint.color} opacity={theme.groundTint.opacity}>
            {landShapes.map((points, i) => (
              <polygon key={i} points={points} />
            ))}
          </g>
        )}
```

`{placing && [...validTiles].map(...)}`（光るマスの `<polygon>`）の次、`{objects.map(...)}` の前に足す:

```tsx
        {previewTiles.map(([x, y]) => (
          <polygon key={`preview-${x},${y}`} points={tilePoints(x, y)} fill="#9fd8ff" stroke="#3a8fc9" strokeWidth={1.5} />
        ))}

        {lockedPlots.map((plot) => (
          <Clouds key={`cloud-${plot.key}`} plot={plot} />
        ))}
```

`{objects.map((o) => { const { sx, sy } = tileCenter(o.x, o.y); ...` の `const { sx, sy } = tileCenter(o.x, o.y);` を `const { sx, sy } = o;` にする。

`{objects.map(...)}` の閉じの次、`</svg>` の前に足す（開いたばかりの区画の雲は、目印より上に重ねて晴れるところを見せる）:

```tsx
        {preview && previewCenter && (
          <g transform={`translate(${previewCenter.sx} ${previewCenter.sy})`} opacity={0.6}>
            <ItemArt assetKey={preview.item.asset_key} />
          </g>
        )}

        {veiledPlots.map((plot) => (
          <Clouds key={`veil-${plot.key}`} plot={plot} className={veil?.fading ? "animate-cloud-clear" : undefined} />
        ))}
```

`{tapTargets.map((target) => { const { sx, sy } = tileCenter(target.x, target.y); ...` の `const { sx, sy } = tileCenter(target.x, target.y);` を消し、`style={boxStyle(sx, sy, ...)}` を `style={boxStyle(target.sx, target.sy, target.halfWidth, target.up, target.down)}` にする。

スプルのボタン（`data-spru`）の前に、雲の札を足す（ふりがなが付くようHTMLで出す）:

```tsx
      {lockedPlots.map((plot) => {
        const { sx, sy } = plotCenter(plot);
        const pos = toPercent(sx, sy - 10, vb);
        const style = { left: `${pos.left}%`, top: `${pos.top}%` };
        const className =
          "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(255,250,240,0.95)] px-3 py-1 text-[12px] font-black whitespace-nowrap text-[#5a4526] shadow-[0_2px_6px_rgba(59,50,38,0.16)]";
        const text = <AutoFurigana text={cloudLabel(plot)} />;
        return readOnly || !onCloudTap ? (
          <span key={`cloud-label-${plot.key}`} className={`pointer-events-none ${className}`} style={style}>
            {text}
          </span>
        ) : (
          <button
            key={`cloud-label-${plot.key}`}
            type="button"
            disabled={placing}
            onClick={() => onCloudTap(plot)}
            aria-label={`${plot.name}(レベル${plot.min_level}で解放)`}
            className={`${className} focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none`}
            style={style}
          >
            {text}
          </button>
        );
      })}
```

地図が枠より広くなったので、吹き出しの最大幅を地図の割合でなくpxにする:
- スプルの吹き出しの `max-w-[66%]` を `max-w-[240px]` にする
- 仲間の吹き出しの `max-w-[48%]` を `max-w-[172px]` にする

- [ ] **Step 3: 雲が散る動きとスクロールバーのCSSを足す**

`frontend/src/app/globals.css` の `.animate-pop-in { ... }` の次に足す:

```css
  /* 区画が開いたとき、雲が散って晴れる(E回 設計書3-2) */
  @keyframes cloud-clear {
    to {
      opacity: 0;
      transform: translateY(-14px) scale(1.18);
    }
  }
  .animate-cloud-clear {
    animation: cloud-clear 1.2s ease-out forwards;
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }

  /* 町の地図の枠(E回 設計書3-3)。ドラッグ・ホイール・矢印キーで動かすので、スクロールバーは出さない */
  .town-map-scroll {
    scrollbar-width: none;
  }
  .town-map-scroll::-webkit-scrollbar {
    display: none;
  }
```

1つ目の `@media (prefers-reduced-motion: reduce)` の、`display: none;` を指定している一覧（`.season-fall` から `.festive-firework` まで）の最後に `.animate-cloud-clear` を足す（`.festive-firework,` の次の行に `.animate-cloud-clear` とし、`.festive-firework` の後ろにカンマを付ける）。

- [ ] **Step 4: 町の画面を地図の枠で包み、雲の札をつなぐ**

`frontend/src/components/world/world-screen.tsx`:
- `import { validAnchors } from "./land";` を `import { cloudLine, validAnchors } from "./land";` にし、`import { TownButtons } from "./town-buttons";` の次に `import { TownMap } from "./town-map";` を足す
- `import type { ... } from "./types";` の一覧に `WorldPlot,` を足す
- `handleCompanionTap` の次に足す:

```ts
  function handleCloudTap(plot: WorldPlot) {
    setEvent({ kind: "say", at: Date.now(), image: "think", line: cloudLine(plot) });
  }
```

- 町の絵のまわり（`<div className="relative mt-2 px-1">` から、その閉じ `</div>` まで）を次にする:

```tsx
        <div className="relative mt-2 px-1">
          <TownMap land={world.land} focus={null}>
            <WorldScene
              land={world.land}
              items={world.items}
              validTiles={validTiles}
              placing={placing}
              onTileTap={placeAt}
              onItemTap={setSelected}
              spru={mood}
              bloom={bloomOf(growth)}
              onSpruTap={handleSpruTap}
              timeOfDay={timeOfDay}
              poppedItemId={poppedItemId}
              garden={world.garden}
              onGardenTap={handleGardenTap}
              companions={world.companions}
              onCompanionTap={handleCompanionTap}
              companionTalk={talk}
              reviewGiver={placing ? null : reviewGiverKey(world.review)}
              quiet={isSpruSleepTime(new Date(now))}
              onCloudTap={handleCloudTap}
            />
          </TownMap>
          {/* 空の飾りは地図と一緒に動かさず、見えている枠の上に重ねる(設計書3-3) */}
          <Festive level={lively.level} timeOfDay={timeOfDay} quiet={isSpruSleepTime(new Date(now))} />
          <Ambience timeOfDay={timeOfDay} season={townSeason} />
        </div>
```

- [ ] **Step 5: 家族の町も地図の枠で見る**

`frontend/src/components/family/family-town.tsx`:
- `import { Festive } from "@/components/world/festive";` の次に `import { TownMap } from "@/components/world/town-map";` を足す（アルファベット順で `time-of-day` の後）
- `<div className="relative mt-3 px-1">` の中の `<WorldScene ... />` を `<TownMap land={town.land} focus={null}>` と `</TownMap>` で包む（`readOnly` なので雲の札は押せない）

- [ ] **Step 6: 型チェック・lint・テストを通す**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし、テストは `153 passed`

- [ ] **Step 7: ブラウザで見た目を確かめる**

開発サーバー（ポート3000）で `test@example.com` / `password` → プロフィール「町テスト」を選び、Playwrightで次を確かめる。スクリーンショットは確認後に消す。
- 390×844 で `/` を開くと、町（7×7）がE回より前と同じ大きさで枠に収まっている
  Expected: 町の左右の端が枠の端に合い、竹林の雲は見えていない（右へスクロールすると見える）
- マウスで地図を右から左へドラッグ（`page.mouse.down` → `move` 100px → `up`）
  Expected: 竹林の雲と「竹林 Lv.4で解放」の札が見える。ドラッグの終わりがアイテムの上でも、アイテムのシートは開かない
- 「竹林 Lv.4で解放」の札を押す
  Expected: スプルの吹き出しが「レベル4になると雲が晴れるよ」になる
- 地図を右下まで動かすと［スプルの家へ戻る］が出て、押すと最初の位置に戻り、ボタンが消える
- `document.documentElement.scrollWidth <= window.innerWidth` が `true`（ページ全体に横スクロールが無い）
- 1280×800 でも町が枠に収まり、ホイールで縦に動く
- `/family` から家族の町を開けるプロフィールが無ければ、このStepでは家族の町は見なくてよい（Task 7で確かめる）

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/world/town-map.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/world-screen.tsx frontend/src/components/family/family-town.tsx frontend/src/app/globals.css
git commit -m "#00137: feature:町を地図の枠で包み、ドラッグで広がる地図を見られるようにし、雲の区画・区画ごとの地面・2×2の建物を描く

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 区画のお祝い・大きな建物の下見・ショップとバッグの「2×2マス」

**Files:**
- Create: `frontend/src/components/world/plot-unlock-card.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`、`frontend/src/components/world/placement-bar.tsx`、`frontend/src/app/shop/page.tsx:239-247`、`frontend/src/app/bag/page.tsx:62`

**Interfaces:**
- Consumes: Task 3 の `unlockTitle`・`unlockLine`・`openedLine`・`unlockFocus`・`hasAnchorsOutside`・`homePlot`、Task 5 の `TownMap` の `focus`・`WorldScene` の `veil`・`preview`、Task 1 の `POST /api/world/plots/seen`
- Produces: `PlotUnlockCard({ plots: WorldPlot[]; onView: () => void })`、`PlacementBar({ item, previewing, hint, onConfirm, onCancel })`

画面の自動テストは無いので、この Task の確かめは型チェック・lint・既存のテストと、Step 7 のブラウザでの確認で行う（すべての組み合わせは Task 7 で確かめる）。

- [ ] **Step 1: 区画のお祝いのカードを書く**

`frontend/src/components/world/plot-unlock-card.tsx`:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";

import { unlockLine, unlockTitle } from "./land";
import type { WorldPlot } from "./types";

/** 区画が開いた後に町を開いたときのお祝い(設計書3-2・5-2) */
export function PlotUnlockCard({ plots, onView }: { plots: WorldPlot[]; onView: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plot-unlock-title"
        className="flex w-full max-w-[322px] flex-col items-center gap-2.5 rounded-3xl bg-[#fffaf0] px-5 pt-5 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
      >
        <SpruFigure image="cheer" standHeight={120} alt="よろこぶスプル" className="animate-spru-hop" />
        <h2 id="plot-unlock-title" className="text-xl font-black text-[#2e6b1c]">
          <AutoFurigana text={unlockTitle(plots)} />
        </h2>
        <ul className="flex flex-col gap-1 text-sm font-bold text-[#6b5d45]">
          {plots.map((plot) => (
            <li key={plot.key}>
              <AutoFurigana text={`${plot.name}: ${unlockLine(plot.key)}`} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onView}
          className="mt-1.5 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          <AutoFurigana text="見に行く" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 置く場所の案内に、下見と「地図を動かすと…」を足す**

`frontend/src/components/world/placement-bar.tsx` を次に置き換える:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";

import { ItemIcon } from "./item-art";
import type { WorldItem } from "./types";

/** 置く場所を選ぶ間の案内。2×2の建物は、下見してから［ここに建てる］で決める(設計書5-3) */
export function PlacementBar({
  item,
  previewing,
  hint,
  onConfirm,
  onCancel,
}: {
  item: WorldItem;
  previewing: boolean;
  hint: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const text = previewing
    ? "ここに建てる？"
    : item.footprint > 1
      ? `「${item.name}」を建てる場所をタップしてね`
      : `「${item.name}」を置く場所をタップしてね`;
  return (
    <div className="fixed inset-x-0 top-3 z-40 mx-auto flex w-[calc(100%-28px)] max-w-[452px] items-center gap-2.5 rounded-2xl bg-[#fffaf0] py-2 pr-2 pl-2.5 text-[#3b3226] shadow-[0_6px_16px_rgba(59,50,38,0.18)]">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f5efe1]">
        <ItemIcon assetKey={item.asset_key} size={44} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug font-bold">
          <AutoFurigana text={text} />
        </p>
        {hint && (
          <p className="text-[11px] leading-snug font-bold text-[#6b5d45]">
            <AutoFurigana text={hint} />
          </p>
        )}
      </div>
      {previewing && (
        <button type="button" onClick={onConfirm} className="h-11 shrink-0 rounded-xl bg-[#3b7f26] px-3 text-[13px] font-black text-white">
          <AutoFurigana text="ここに建てる" />
        </button>
      )}
      <button type="button" onClick={onCancel} className="h-11 shrink-0 rounded-xl bg-[#efe5cf] px-3.5 text-[13px] font-black">
        やめる
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 町の画面に、お祝いの流れと下見をつなぐ**

`frontend/src/components/world/world-screen.tsx`:

import:
- `import { apiFetch } from "@/lib/api";` の次に `import { prefersReducedMotion } from "@/lib/motion";` を足す
- `import { cloudLine, validAnchors } from "./land";` を `import { cloudLine, hasAnchorsOutside, openedLine, unlockFocus, validAnchors } from "./land";` にする
- `./liveliness-card` の import の次に `import { homePlot } from "./map-view";` を、`./placement-bar` の import の次に `import { PlotUnlockCard } from "./plot-unlock-card";` を足す

`BORN_DELAY_MS` の定義の次に足す:

```ts
// 区画のお祝い: 地図を区画へ動かす時間と、雲が散る時間(設計書5-2)
const FOCUS_MS = 600;
const CLEAR_MS = 1_200;
```

`const [season, setSeason] = useState<SeasonGreeting | null>(null);` の次に足す:

```ts
  // 区画のお祝いで地図を動かす先と、散らしている雲(お祝いの途中は null でない)
  const [focus, setFocus] = useState<{ plot: WorldPlot; at: number } | null>(null);
  const [clearing, setClearing] = useState<{ keys: string[]; fading: boolean } | null>(null);
  // 2×2の建物の下見(奥のマス)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
```

`placeAt` の次に足す:

```ts
  // 2×2の建物は、光るマスを押すと下見になり、［ここに建てる］で決まる(設計書3-4・5-3)
  function handleTileTap(x: number, y: number) {
    if (!placingItem) return;
    if (placingItem.footprint > 1) {
      setPreview({ x, y });
      return;
    }
    placeAt(x, y);
  }

  function confirmBuild() {
    if (!preview) return;
    const { x, y } = preview;
    setPreview(null);
    placeAt(x, y);
  }

  function cancelPlacing() {
    setPlacingId(null);
    setPreview(null);
  }

  // ［見に行く］: カードを閉じ、地図を区画へ動かしてから雲を散らし、終わったら祝った印を送る(設計書3-2・5-2)
  function viewNewPlots() {
    if (!world) return;
    const plots = world.land.plots.filter((plot) => world.plots_new.includes(plot.key));
    if (plots.length === 0) return;
    const keys = plots.map((plot) => plot.key);
    const target = unlockFocus(plots);
    const reduced = prefersReducedMotion();
    setWorld((prev) => (prev ? { ...prev, plots_new: [] } : prev));
    setFocus({ plot: target, at: Date.now() });
    setClearing(reduced ? null : { keys, fading: false });
    const finish = () => {
      setClearing(null);
      play("correct");
      setEvent({ kind: "say", at: Date.now(), image: "cheer", line: openedLine(target) });
      // 失敗しても、次に町を開いたときにもう一度祝うだけ
      apiFetch("/api/world/plots/seen", { method: "POST", body: JSON.stringify({ keys }) }).catch(() => null);
    };
    if (reduced) {
      finish();
      return;
    }
    setTimeout(() => setClearing({ keys, fading: true }), FOCUS_MS);
    setTimeout(finish, FOCUS_MS + CLEAR_MS);
  }
```

`const lively = liveliness(world.items, world.companions.length);` の次に足す:

```ts
  const newPlots = world.land.plots.filter((plot) => world.plots_new.includes(plot.key));
  // 開いたばかりの区画は、お祝いが終わるまで雲で隠しておく
  const veil = world.plots_new.length > 0 ? { keys: world.plots_new, fading: false } : clearing;
  // 区画のお祝い(雲の演出を含む)が終わるまで、家族・季節のあいさつは出さない
  const calm = !world.welcome_available && world.plots_new.length === 0 && clearing === null;
```

`{placingItem && <PlacementBar item={placingItem} onCancel={() => setPlacingId(null)} />}` を次にする:

```tsx
        {placingItem && (
          <PlacementBar
            item={placingItem}
            previewing={preview !== null}
            hint={hasAnchorsOutside(validTiles, homePlot(world.land)) ? "地図を動かすと、ほかの場所も見られるよ" : null}
            onConfirm={confirmBuild}
            onCancel={cancelPlacing}
          />
        )}
```

町の絵のまわり:
- `<TownMap land={world.land} focus={null}>` を `<TownMap land={world.land} focus={focus}>` にする
- `WorldScene` の `onTileTap={placeAt}` を `onTileTap={handleTileTap}` にし、`onCloudTap={handleCloudTap}` の次に足す:

```tsx
              veil={veil}
              preview={preview && placingItem ? { ...preview, item: placingItem } : null}
```

`ItemActionSheet` の `onMove` の中の `setPlacingId(selected.id);` の次に `setPreview(null);` を足す。

お知らせの並び（`{/* はじめてのプレゼント → 家族のあいさつ → 季節のあいさつ の順に1つずつ出す */}` から `SeasonGreetingCard` の閉じまで）を次にする:

```tsx
      {/* はじめてのプレゼント → 区画のお祝い → 家族のあいさつ → 季節のあいさつ の順に1つずつ出す(雲の演出の間は次を待つ) */}
      {!world.welcome_available && newPlots.length > 0 && <PlotUnlockCard plots={newPlots} onView={viewNewPlots} />}

      {calm && greetings.length > 0 && <GreetingsCard greetings={greetings} onClose={closeGreetings} />}

      {calm && greetings.length === 0 && season && <SeasonGreetingCard greeting={season} onDone={closeSeason} />}
```

- [ ] **Step 4: ショップとバッグに「2×2マス」を出す**

`frontend/src/app/shop/page.tsx` の町のアイテムのカードで、`{item.locked && (...)}` の閉じの次（アイコンの箱 `relative flex h-[74px] ...` の中）に足す:

```tsx
                      {item.footprint > 1 && (
                        <span className="absolute top-1 left-1 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">
                          2×2マス
                        </span>
                      )}
```

`frontend/src/app/bag/page.tsx:62` の `<ItemIcon assetKey={item.asset_key} size={64} />` を次にする:

```tsx
                <div className="relative">
                  <ItemIcon assetKey={item.asset_key} size={64} />
                  {item.footprint > 1 && (
                    <span className="absolute -top-1 -left-4 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                      2×2マス
                    </span>
                  )}
                </div>
```

- [ ] **Step 5: 型チェック・lint・テストを通す**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: エラーなし、テストは `153 passed`

- [ ] **Step 6: 開発DBに品ぞろえを入れる**

Run: `./vendor/bin/sail artisan db:seed --class=WorldItemSeeder && ./vendor/bin/sail artisan tinker --execute='echo App\Models\ShopItem::where("type","decoration")->count();'`
Expected: `16`

- [ ] **Step 7: ブラウザでお祝いと下見の流れを確かめる**

確認の前に、「町テスト」（id 7）の今の値と、`profile_world_items`・`user_profile_items`・`profile_currency_ledger` のいちばん大きいidを控える（Task 7の最後でも使う）。`tinker` で「町テスト」を `level` 10・`xp` は `App\Support\LevelCurve::totalXpFor(10)`・`points` 2000・`world_plots_seen` null にする。

- 390×844 で `/` を開く
  Expected: 「竹林・海辺・丘が広がったよ！」のカードに3つの区画のひとことが並ぶ
- ［見に行く］を押す
  Expected: 地図が丘へ動き、丘・竹林・海辺の雲が散って晴れ、スプルが「丘に行けるようになったよ！」と言う。`tinker` で `world_plots_seen` が `["bamboo","beach","hill"]`
- 再読み込みする
  Expected: カードは出ない
- ショップで「お城」を買う（［買って置く］）
  Expected: カードに「2×2マス」、町に戻って案内が「「お城」を建てる場所をタップしてね」と「地図を動かすと、ほかの場所も見られるよ」
- 光るマスを押す
  Expected: 4マスが青く光り、お城がうすく見え、案内が「ここに建てる？」と［ここに建てる］［やめる］になる。別の光るマスを押すと下見が移る
- ［ここに建てる］
  Expected: お城が建ち、スプルが喜ぶ

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/world/plot-unlock-card.tsx frontend/src/components/world/world-screen.tsx frontend/src/components/world/placement-bar.tsx frontend/src/app/shop/page.tsx frontend/src/app/bag/page.tsx
git commit -m "#00138: feature:区画が開いたときのお祝い(地図が動いて雲が晴れる)と、2×2の建物の下見、ショップとバッグの「2×2マス」の札を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ブラウザでの確認とドキュメント

**Files:**
- Modify: `SPEC.md`（1章16・17行目、90行目、4-9、6-1）、`TASKS.md`（20行目、F回の行）

**Interfaces:**
- Consumes: Task 1〜6 のすべて

- [ ] **Step 1: 設計書7章の確認をすべて行う**

Task 6 で控えた値を使い、「町テスト」を `tinker` で調整しながら、Playwright（390×844 と 1280×800）で次を確かめる。スクリーンショットは確認後に消す。

| # | 準備（tinker） | 操作 | Expected |
|---|---|---|---|
| 1 | Lv.1・`world_plots_seen` null | マウスでドラッグして、置いてあるアイテムの上で離す | 地図が動き、アイテムのシートは開かない。3px だけ動かして離すとシートが開く |
| 2 | 同上 | ホイール・矢印キー（枠を選んでから） | 地図が動く |
| 3 | 同上 | 地図を右下へ動かして［スプルの家へ戻る］ | ボタンは最初の位置では出ず、離れると出て、押すと戻る |
| 4 | 同上 | 雲の札「海辺 Lv.7で解放」を押す | スプル「レベル7になると雲が晴れるよ」 |
| 5 | 同上 | ブラウザの幅を 390→700→390 に変える | 町が枠に収まる位置に戻る。ページ全体に横スクロールが無い（`scrollWidth <= innerWidth`） |
| 6 | Lv.12・`world_plots_seen` null・`world_welcomed_at` null、同じ家族にプロフィールを1つ作ってその人からあいさつを1つ送っておく。Playwrightの時計を10月15日に進める | `/` を開き、出てくる順に閉じる | 100ptのプレゼント → 「竹林・海辺・丘が広がったよ！」→（地図が丘へ動き、雲が晴れ終わってから）家族のあいさつ → 季節のあいさつ（ハロウィン）の順に1つずつ |
| 7 | 続き | 再読み込み | 区画のお祝いは出ない |
| 8 | 続き・ポイント2000 | お城を買う → 光るマスで下見 → 地図を動かして別の光るマスを押す → ［やめる］ | 下見が移り、［やめる］で消えて置く状態が終わる（お城はバッグに残る） |
| 9 | 続き | バッグからお城を置く → ［ここに建てる］→ お城を押して「動かす」→ 1マス右の光るマスで下見 → ［ここに建てる］→ 「しまう」 | 自分の今の4マスと重なる所も光り、1マスずらして建て直せ、しまうとバッグに戻る |
| 10 | 続き | お城を下見した状態で、`tinker` でその4マスの1つにベンチを置いてから［ここに建てる］ | 建った後に元に戻り「そこにはもう置いてあります。」が出る |
| 11 | 続き | ベンチ（1マス）を買って置く | タップ1回で置ける（下見は出ない） |
| 12 | 家族のプロフィールを Lv.7 にし、その人の丘でない所にお城を置いておく | `/family` からその人の町を見る | 竹林・海辺が開き、丘は雲で「丘 Lv.10で解放」の札は押せない。お城が見える |
| 13 | 自分を Lv.4・`world_plots_seen` null、ふりがなを付ける | `/` | 「竹林エリアが広がったよ！」のカードと雲の札・［スプルの家へ戻る］・［ここに建てる］が、ふりがな付きでも崩れない |
| 14 | `world_plots_seen` null、`page.emulateMedia({ reducedMotion: "reduce" })` | ［見に行く］ | 地図はすぐ竹林へ切り替わり、雲はすぐ消え、スプルが「竹林に行けるようになったよ！」 |
| 15 | 1280×800 | 1〜4・8 をもう一度 | 同じように動く |

- [ ] **Step 2: 開発DBを元に戻す**

`tinker` で、「町テスト」を控えた値（Lv.1・XP 20・ポイント75・`world_plots_seen` null・`world_welcomed_at` は控えた値）に戻す。確認で作った `profile_world_items`・`user_profile_items`・`profile_currency_ledger` の行（控えたidより大きいもの）、家族のプロフィールとあいさつを消す。品ぞろえ（16種類）は残す。

Run: `./vendor/bin/sail artisan tinker --execute='echo json_encode(App\Models\UserProfile::find(7)->only(["level","xp","points","world_plots_seen"]));'`
Expected: `{"level":1,"xp":20,"points":75,"world_plots_seen":null}`

- [ ] **Step 3: SPEC.md を更新する**

- 1章16行目の `②レベルによる土地の解放と旅` を `②レベルによる土地の解放と旅（E回で街づくり〈広がる地図・雲の区画・大きな建物〉を実装済み、旅はF回）` にする
- 1章17行目の `A〜Eの5回に分けて作る` を `A〜Fの6回に分けて作る` にし、`E: 土地の解放と旅・おみやげ）` を `E: 街づくり（広がる地図・雲の区画・大きな建物。実装済み、`docs/design/2026-09-27-spru-wave-e-design.md`）、F: 旅とおみやげ）` にする
- 90行目の `②で旅のハブに作り替える` を `②のF回で旅のハブに作り替える` にする
- 4-9 の「季節のあいさつ」（D回）の行の次に足す:

```markdown
- ✅（2026-09-27、E回）広がる地図: 地図は12×12マスで、町（7×7）の手前に竹林（Lv.4）・海辺（Lv.7）・丘（Lv.10）の区画が続く。まだ開いていない区画は雲に隠れていて「竹林 Lv.4で解放」の札が出る（押すとスプルが必要レベルを言う）。区画・目印（竹やぶ・桟橋）・道は `config/world.php` の `land` にあり、人によって違うのはレベルでどこまで開いているかだけ（`app/Support/WorldLand.php`、`GET /api/world` の `land`）。家族の町もその人のレベルで開いている
- ✅（E回）地図の見方: 町が枠の横幅に収まる縮尺で地図全体を描き、はみ出した分はドラッグ（PCはマウス・ホイール・矢印キーも）で見る。最初の位置から離れると［スプルの家へ戻る］。拡大・縮小はしない（`components/world/town-map.tsx`・`map-view.ts`）
- ✅（E回）区画のお祝い: 区画が開いた後に町を開くと「竹林エリアが広がったよ！」のカード → ［見に行く］で地図がその区画へ動き、雲が散って晴れる。祝った区画はサーバーに記録する（`user_profiles.world_plots_seen`、`POST /api/world/plots/seen`）。町を開いたときの順番は 最初の100pt → 区画のお祝い → 家族のあいさつ → 季節のあいさつ
- ✅（E回）大きな建物（2×2マス）: 噴水・五重塔・お城・タワー。2×2かどうかは絵で決まる（`config/world.php` の `asset_footprints`）。光るマスを押すと4マスが光って下見になり、［ここに建てる］で決まる。置けるかのチェックは 地図の外 → 雲 → 目印・道 → 重なり の順で、プロフィールをロックしてから行う（`app/Support/WorldPlacement.php`）。にぎやか度は2倍で数える。あわせて石灯籠・竹・ヤシの木・ビーチパラソルを足し、町のアイテムは16種類（Lv.1〜12）
```

- 4-9 の最後の `❌ 土地の広がり・新しい国への旅（②）、町以外の画面の配色統一は未着手（`TASKS.md`参照）` を `❌ 新しい国への旅とおみやげ（F回、方針は `docs/design/2026-09-27-spru-wave-e-design.md` 9章）、町以外の画面の配色統一は未着手（`TASKS.md`参照）` にする
- 6-1 の `2026-09-27時点で122件` を `2026-09-27時点で153件` にする（Step 5 の実行結果の件数に合わせる）

- [ ] **Step 4: TASKS.md を更新する**

20行目の `- [ ] **E回: 土地の解放と、新しい国への旅（...）、国ごとのおみやげアイテム**` を次の2行にする:

```markdown
- [x] **E回: 街づくり（12×12に広がる地図、雲に隠れた竹林・海辺・丘の区画、2×2の大きな建物〈噴水・五重塔・お城・タワー〉、新しいアイテム8種）**（2026-09-27。設計書 `docs/design/2026-09-27-spru-wave-e-design.md`、実装計画 `docs/design/2026-09-27-spru-wave-e-plan.md`。当初のE回を「街づくり」と「旅」に分けた）
- [ ] **F回: 旅とおみやげ（「旅する」タブを旅のハブに・国の画面・「旅のじゅんび」リスト・国ごとのおみやげ。海辺の桟橋から船旅、最初の行き先はインドネシア。決まっている方針はE回の設計書9章）**
```

- [ ] **Step 5: 全体のテストを流す**

Run: `./vendor/bin/sail artisan test --compact && cd frontend && npm test && npm run typecheck && npm run lint`
Expected: バックエンド `290 passed`、フロント `153 passed`、型チェック・lintはエラーなし

- [ ] **Step 6: コミット**

```bash
git add SPEC.md TASKS.md
git commit -m "#00139: docs:スプルのE回(街づくり: 広がる地図・雲の区画・大きな建物)をSPEC/TASKSに反映し、F回(旅とおみやげ)の行を足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
