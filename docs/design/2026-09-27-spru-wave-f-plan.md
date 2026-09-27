# 旅とおみやげ — 旅のハブ・旅のじゅんび・国ごとのおみやげ（F回）— 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** 「旅する」タブを旅のハブにし、海辺の桟橋から船で5か国（インドネシア → 韓国 → アメリカ → イギリス → フランス）を1本道でめぐれるようにする。出発には「旅のじゅんび」（レベル・町のアイテム・前の国のおみやげ）をそろえ、着いた国の画面では、その国で学ぶともらえるおみやげ（町に置けるアイテム）を受け取る。

**アーキテクチャ:** 行き先・条件・おみやげは `config/travel.php` に持ち、`app/Support/Travel.php` がプロフィールごとの状態（着いた国・次の行き先・じゅんびリスト・おみやげの条件）を計算する。DBに足すのは「着いた国」（`profile_trips`）と「受け取ったおみやげ」（`profile_souvenirs`）だけで、おみやげの条件は今あるクリアの記録（`profile_stage_progress`）から数える。おみやげは非売品の町のアイテムとしてバッグに入るので、置く・動かす・にぎやか度・家族の町は今のしくみをそのまま使う。画面は、ハブのひとこと・島のラベル・国の画面のステージ選び・出発の場面の段階を計算だけの `travel.ts` に切り出してテストし、ハブ（`/trip`）と国の画面（`/trip/[key]`）を新しく作る。

**技術スタック:** Laravel 13（Sail）/ Pest / MySQL、Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest

**設計書:** `docs/design/2026-09-27-spru-wave-f-design.md`（必ず併せて読むこと）

## 全体の制約

- 既存のバックエンドテスト（290件）とフロントのテスト（155件）はすべて通ること
- DBの更新は `./vendor/bin/sail artisan migrate`（壊さない更新）だけを使う。`migrate:fresh` は使わない。品ぞろえは `./vendor/bin/sail artisan db:seed --class=WorldItemSeeder`
- 行き先（キー・名前・必要レベル・町のアイテム・おみやげ）、おみやげの名前と条件、新しいアイテム（小さな船 Lv.7・200pt・1マス／大きな船 Lv.11・450pt・2×2）は設計書3-1〜3-3の表どおり
- APIのメッセージは設計書4-4の文言どおり: 「まだこの国に着いていません。」「まだこの国には行けません。」「旅のじゅんびがそろっていません。」「まだ受け取れません。」「もう受け取っています。」
- 学ぶタブの国選び（`/learn`・`/travel/[countryId]`）は変えない（旅で学習を締めない）
- 画面に確認用の隠し機能を作らない。レベルや記録は開発DBを `tinker` で調整して確かめ、確認後に元へ戻す。Playwrightで通信を書き換える（route で CORS・Origin を変える）ことはしない
- ESLint（`react-hooks`）の規則: 描画中にrefの `.current` を読まない、effectの中で直接setStateしない（setTimeout・setInterval・非同期のコールバックの中はよい）。`prefersReducedMotion()` は描画中に呼ばず、操作やeffectのときに呼ぶ
- 新しいUIのアイコンに絵文字を使わない（lucide）。絵はSVGで描き、有料素材は使わない。ドキュメント・コメントは日本語、コメントは「なぜ」が必要なときだけ1行
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/spru-wave-f`（作成済み）
- 開発サーバーはポート3000（すでに動いていれば新しく起動しない）。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」（id 7、Lv.1・XP 20・ポイント75）。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、確認後に消す
- サブエージェントは使わない（最後の見直しも自分で行う）

## レビューで特に見る点

1. **［出発する］［受け取る］の連打・2つのタブから同時に押す**: 着いた記録もおみやげも1つだけになること（Task 2 のテスト「2回目は first false」「おみやげは1回だけ」、プロフィールのロックと一意の制約。画面は送信中ボタンを押せなくする）
2. **学ぶタブで先にクリアしてから旅に出る**: 着いた時点でおみやげを受け取れること（Task 2 のテスト「着く前のクリアも数える」）
3. **国がDBにない・国コードの大文字小文字が不揃い（`KR`・`GB`）**: ハブも国の画面も壊れず、国旗が出ること。国旗は設定のファイル名から作る（Task 1 のテスト「国がDBにない行き先」「国旗は設定のファイル名」）
4. **受け取った2×2のおみやげを町に置く・動かす**: 4マス使い、重なりのチェックが効くこと（Task 2 のテスト「2×2のおみやげは4マス使う」）
5. **動きを減らす設定で出発する／［とばす］を押す**: 着いた場面だけが出て国の画面へ移ること、国の画面へ二重に移らないこと（Task 3 の `departureStart`・`departurePhase` のテスト、Task 5 の作り、Task 7 のブラウザ確認）

## 計画で決めたこと（設計書にも反映する）

- 国旗の画像: DBの国コードは `KR`・`GB` など大文字小文字が不揃いで、`public/flag/` のファイル名（`kr.svg`・`GB.svg`）と合わない国がある。そこで `config/travel.php` の各行き先に `flag`（ファイル名）を持ち、APIの `Destination` に `flag`（例 `/flag/kr.svg`）を足す。Task 1 のコミットで設計書4-2・4-4も直す
- テストの共通の道具（国とステージを作る・ステージをクリアしたことにする・アイテムを持たせる・レベルを変える）は `tests/Pest.php` に置く（Task 1 と Task 2 の両方で使う）

## ファイル構成

**サーバー（リポジトリ直下）**
- 作成: `config/travel.php` — 行き先・旅じたく・おみやげ・「ようこそ」
- 作成: `database/migrations/2026_09_27_000012_create_profile_trips_table.php`・`2026_09_27_000013_create_profile_souvenirs_table.php`
- 作成: `app/Models/ProfileTrip.php`・`app/Models/ProfileSouvenir.php`
- 作成: `app/Support/Travel.php` — 状態の計算・出発・おみやげの受け取り
- 変更: `config/world.php`（`asset_keys`・`asset_footprints`）、`app/Models/UserProfile.php`（`trips()`・`souvenirs()`）、`app/Models/ProfileWorldItem.php`（`souvenir`）、`routes/api.php`（旅のAPI・町の `travel_ready`・ショップの `travel_gear`）、`database/seeders/WorldItemSeeder.php`（船2つ）
- テスト: 作成 `tests/Feature/TravelTest.php`・`tests/Feature/TravelActionsTest.php`、変更 `tests/Pest.php`

**フロントエンド（`frontend/src/`）**
- 作成: `components/travel/types.ts`、`components/travel/travel.ts`・`travel.test.ts`
- 作成: `components/travel/travel-map.tsx`（海の地図）・`destination-sheet.tsx`（島のカード）・`departure-scene.tsx`（出発の場面）・`souvenir-stand.tsx`（おみやげ屋さん）・`flag.tsx`
- 作成: `app/trip/page.tsx`（旅のハブ）・`app/trip/[key]/page.tsx`（旅先の国の画面）
- 作成: `components/world/iso-shapes.tsx`（`IsoBox`・`IsoRoof` を移す）、`components/world/travel-art.tsx`（船2つ・おみやげ10個の絵）
- 変更: `components/world/art-keys.ts`・`art-keys.test.ts`・`item-art.tsx`・`types.ts`、`components/spru/hint.ts`・`hint.test.ts`、`components/world/world-screen.tsx`、`components/app/bottom-nav.tsx`、`app/shop/page.tsx`・`app/bag/page.tsx`、`app/globals.css`

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`・`docs/design/2026-09-27-spru-wave-f-design.md`（国旗）

---

### Task 1: 旅の設定・テーブルと、ハブのAPI（見るだけ）

**Files:**
- Create: `config/travel.php`、`database/migrations/2026_09_27_000012_create_profile_trips_table.php`、`database/migrations/2026_09_27_000013_create_profile_souvenirs_table.php`、`app/Models/ProfileTrip.php`、`app/Models/ProfileSouvenir.php`、`app/Support/Travel.php`
- Modify: `config/world.php`、`app/Models/UserProfile.php`、`routes/api.php`、`tests/Pest.php`、`docs/design/2026-09-27-spru-wave-f-design.md`
- Test: `tests/Feature/TravelTest.php`

**Interfaces:**
- Produces:
  - `Travel::destinations(): array`（設定の行き先の一覧）
  - `Travel::indexOf(string $key): ?int`
  - `Travel::state(UserProfile $profile): array`（`Destination` の配列、設定の順）
  - `Travel::show(UserProfile $profile, string $key): ?array`
  - `Travel::gearAssetKeys(): array`（旅じたくの絵のキー）
  - `Destination` = `['key','name','country_id','code','flag','min_level','state','ready','checklist','souvenirs','gift_ready','greeting']`
  - `UserProfile::trips(): HasMany`、`UserProfile::souvenirs(): HasMany`
  - テスト用: `createTravelCountry(string $code, string $name): Country`（初級のふつうのステージ・初級のボス・中級のボスの3つを持つ）、`clearCountryStage(UserProfile $profile, Country $country, string $difficulty, bool $boss): void`、`giveWorldItem(UserProfile $profile, string $assetKey, bool $placed = false): ProfileWorldItem`、`setProfileLevel(UserProfile $profile, int $level): void`

- [ ] **Step 1: テストの共通の道具を `tests/Pest.php` の最後に足す**

```php
/** 旅の行き先になる国を作る。初級のふつうのステージ・初級のボス・中級のボスを1つずつ持つ(旅のテストで共通に使う) */
function createTravelCountry(string $code, string $name): Country
{
    $country = Country::create([
        'code' => $code,
        'three_code' => strtoupper($code).'X',
        'name' => $name,
        'name_en' => $name,
        'country_code' => random_int(100, 999),
    ]);
    $category = Category::create(['name' => $name.'カテゴリ']);

    foreach ([['初級', 1, false], ['初級', 2, true], ['中級', 1, true]] as [$difficulty, $number, $boss]) {
        Stage::create([
            'category_id' => $category->id,
            'country_id' => $country->id,
            'difficulty' => $difficulty,
            'stage_number' => $number,
            'is_boss' => $boss,
        ]);
    }

    return $country;
}

/** その国の、指定した難易度・ボスかどうかのステージをクリアしたことにする */
function clearCountryStage(UserProfile $profile, Country $country, string $difficulty, bool $boss): void
{
    $stage = Stage::query()
        ->where('country_id', $country->id)
        ->where('difficulty', $difficulty)
        ->where('is_boss', $boss)
        ->firstOrFail();

    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'cleared_at' => now()]);
}

/** その絵のアイテムを持たせる($placed なら町に置いた状態、そうでなければバッグ) */
function giveWorldItem(UserProfile $profile, string $assetKey, bool $placed = false): ProfileWorldItem
{
    $shopItem = createDecoration(['name' => $assetKey, 'meta' => ['asset_key' => $assetKey]]);

    return $profile->worldItems()->create([
        'shop_item_id' => $shopItem->id,
        'x' => $placed ? 3 : null,
        'y' => $placed ? 5 : null,
    ]);
}

function setProfileLevel(UserProfile $profile, int $level): void
{
    $profile->update(['level' => $level]);
}
```

`tests/Pest.php` の先頭の `use` に次を足す（アルファベット順）:

```php
use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ProfileWorldItem;
use App\Models\Stage;
```

- [ ] **Step 2: 失敗するテストを書く（`tests/Feature/TravelTest.php`）**

```php
<?php

use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| 旅のハブ(docs/design/2026-09-27-spru-wave-f-design.md 3-1・3-2・4-4)
|--------------------------------------------------------------------------
|
| 行き先は config/travel.php の順の1本道。まだ着いていない国のうちいちばん手前が「次の行き先」で、
| レベル・町のアイテム(持っていればよい)・前の国の2個目のおみやげがそろうと出発できる。
|
*/

function arriveAt(UserProfile $profile, string $key): void
{
    $profile->trips()->create(['destination' => $key, 'arrived_at' => now()]);
}

it('行き先が5つ設定の順に返り、Lv.1ではインドネシアが次の行き先でほかはまだ先', function () {
    createActiveProfile();

    $response = $this->getJson('/api/travel')->assertOk();

    $destinations = collect($response->json('destinations'));
    expect($destinations->pluck('key')->all())->toBe(['id', 'kr', 'us', 'gb', 'fr']);
    expect($destinations->pluck('state')->all())->toBe(['next', 'later', 'later', 'later', 'later']);
    $response->assertJsonPath('level', 1)
        ->assertJsonPath('destinations.0.name', 'インドネシア')
        ->assertJsonPath('destinations.0.min_level', 7)
        ->assertJsonPath('destinations.0.ready', false);
});

it('インドネシアのじゅんびリストはレベルと小さな船。まだショップに出ていなければ出るレベルを言う', function () {
    createActiveProfile();
    createDecoration(['name' => '小さな船', 'price' => 200, 'min_level' => 7, 'meta' => ['asset_key' => 'boat_small']]);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.checklist', [
            ['kind' => 'level', 'label' => 'レベル7', 'done' => false, 'hint' => 'あと6レベル'],
            ['kind' => 'item', 'label' => '小さな船', 'done' => false, 'hint' => 'Lv.7でショップに出るよ'],
        ]);
});

it('レベルが足りていて小さな船を持っていなければ、ショップで買えると言う', function () {
    $profile = createActiveProfile();
    setProfileLevel($profile, 7);
    createDecoration(['name' => '小さな船', 'price' => 200, 'min_level' => 7, 'meta' => ['asset_key' => 'boat_small']]);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.checklist.0.done', true)
        ->assertJsonPath('destinations.0.checklist.0.hint', null)
        ->assertJsonPath('destinations.0.checklist.1.hint', 'ショップで買えるよ')
        ->assertJsonPath('destinations.0.ready', false);
});

it('Lv.7で小さな船を持っていれば出発できる(バッグでも町に置いていても)', function (bool $placed) {
    $profile = createActiveProfile();
    setProfileLevel($profile, 7);
    giveWorldItem($profile, 'boat_small', $placed);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.checklist.1.done', true)
        ->assertJsonPath('destinations.0.ready', true);
})->with(['バッグ' => false, '町に置いている' => true]);

it('インドネシアに着くと韓国が次の行き先になり、ボロブドゥール寺院・自転車・Lv.9が並ぶ', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    arriveAt($profile, 'id');

    $response = $this->getJson('/api/travel')->assertOk();

    expect(collect($response->json('destinations'))->pluck('state')->all())->toBe(['visited', 'next', 'later', 'later', 'later']);
    $response->assertJsonPath('destinations.1.checklist', [
        ['kind' => 'level', 'label' => 'レベル9', 'done' => false, 'hint' => 'あと8レベル'],
        ['kind' => 'item', 'label' => '自転車', 'done' => false, 'hint' => 'ショップで買えるよ'],
        ['kind' => 'souvenir', 'label' => 'インドネシアのおみやげ「ボロブドゥール寺院」', 'done' => false, 'hint' => 'インドネシアの初級のボスをクリアしよう'],
    ]);

    clearCountryStage($profile, $indonesia, '初級', true);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.1.checklist.2.hint', 'インドネシアのおみやげ屋さんで受け取ろう');
});

it('おみやげの一覧に条件と絵と大きさが付き、着いた国で条件を満たすと gift_ready になる', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    arriveAt($profile, 'id');

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.souvenirs', [
            ['key' => 'komodo', 'name' => 'コモドドラゴンの像', 'asset_key' => 'komodo', 'footprint' => 1, 'condition' => 'stage', 'condition_label' => 'インドネシアのステージを1つクリア', 'met' => false, 'received' => false],
            ['key' => 'borobudur', 'name' => 'ボロブドゥール寺院', 'asset_key' => 'borobudur', 'footprint' => 2, 'condition' => 'boss', 'condition_label' => 'インドネシアの初級のボスをクリア', 'met' => false, 'received' => false],
        ])
        ->assertJsonPath('destinations.0.gift_ready', false);

    clearCountryStage($profile, $indonesia, '初級', false);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.souvenirs.0.met', true)
        ->assertJsonPath('destinations.0.souvenirs.1.met', false)
        ->assertJsonPath('destinations.0.gift_ready', true);
});

it('2個目のおみやげは初級のボスでだけ満たす(中級のボス・初級のふつうのステージでは満たさない)', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', false);
    clearCountryStage($profile, $indonesia, '中級', true);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('destinations.0.souvenirs.1.met', false);

    clearCountryStage($profile, $indonesia, '初級', true);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('destinations.0.souvenirs.1.met', true);
});

it('着いていない国は gift_ready にならない(学ぶタブで先にクリアしていても)', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', false);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.souvenirs.0.met', true)
        ->assertJsonPath('destinations.0.gift_ready', false);
});

it('ほかのプロフィールの記録は数えない', function () {
    $profile = createActiveProfile();
    arriveAt(createFamilyMember($profile), 'id');

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('destinations.0.state', 'next');
});

it('国がDBにない行き先は country_id が null で返り、おみやげの条件を満たさない', function () {
    $profile = createActiveProfile();
    arriveAt($profile, 'id');

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.country_id', null)
        ->assertJsonPath('destinations.0.souvenirs.0.met', false);
});

it('国は国コードの大文字小文字を区別せずに見つけ、国旗は設定のファイル名で返す', function () {
    createActiveProfile();
    $korea = createTravelCountry('KR', '韓国');

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.1.country_id', $korea->id)
        ->assertJsonPath('destinations.1.flag', '/flag/kr.svg')
        ->assertJsonPath('destinations.3.flag', '/flag/GB.svg');
});

it('行き先1つを返す。まだ着いていない国は422、知らない国は404', function () {
    $profile = createActiveProfile();

    $this->getJson('/api/travel/id')->assertStatus(422)->assertJsonPath('message', 'まだこの国に着いていません。');
    $this->getJson('/api/travel/xx')->assertNotFound();

    arriveAt($profile, 'id');

    $this->getJson('/api/travel/id')->assertOk()
        ->assertJsonPath('key', 'id')
        ->assertJsonPath('state', 'visited')
        ->assertJsonPath('greeting', ['text' => 'Selamat datang!', 'reading' => 'スラマット ダタン']);
});

it('設定: 2個目のおみやげと大きな船は2×2、1個目は1マス。おみやげはショップの絵に入れず、旅じたくはショップの絵にある', function () {
    $footprints = config('world.asset_footprints');
    $assetKeys = config('world.asset_keys');

    foreach (config('travel.destinations') as $destination) {
        foreach ($destination['souvenirs'] as $souvenir) {
            expect($footprints[$souvenir['key']] ?? 1)->toBe($souvenir['condition'] === 'boss' ? 2 : 1);
            expect($assetKeys)->not->toContain($souvenir['key']);
        }
        foreach (array_keys($destination['items']) as $assetKey) {
            expect($assetKeys)->toContain($assetKey);
        }
    }
    expect($footprints['boat_large'])->toBe(2);
    expect($assetKeys)->toContain('boat_small');
});
```

- [ ] **Step 3: テストを走らせて失敗を確かめる**

Run: `./vendor/bin/sail artisan test --compact tests/Feature/TravelTest.php`
Expected: FAIL（`/api/travel` が404、`trips()` が無い、`config('travel.destinations')` が null など）

- [ ] **Step 4: 設定を書く**

`config/travel.php`（新規）:

```php
<?php

return [

    /*
    | 旅の行き先(docs/design/2026-09-27-spru-wave-f-design.md 3-1・3-2・4-2)。並び順がそのまま旅の順番(1本道)。
    | 次の国へ行くには、レベル・町のアイテム(items: 絵のキー => 名前。置いていてもバッグでもよい)・
    | 1つ前の国の condition=boss のおみやげがいる。おみやげのキーはそのまま絵のキー(asset_key)。
    | 2×2のおみやげは config/world.php の asset_footprints に書く。flag は public/flag/ のファイル名
    | (DBの国コードは大文字小文字が不揃いなため)。画面の art-keys.test.ts がおみやげの行の形を読むので、1行1つで書く
    */

    'destinations' => [
        [
            'key' => 'id',
            'name' => 'インドネシア',
            'country_code' => 'id',
            'flag' => 'id',
            'min_level' => 7,
            'items' => ['boat_small' => '小さな船'],
            'greeting' => ['text' => 'Selamat datang!', 'reading' => 'スラマット ダタン'],
            'souvenirs' => [
                ['key' => 'komodo', 'name' => 'コモドドラゴンの像', 'condition' => 'stage'],
                ['key' => 'borobudur', 'name' => 'ボロブドゥール寺院', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'kr',
            'name' => '韓国',
            'country_code' => 'kr',
            'flag' => 'kr',
            'min_level' => 9,
            'items' => ['bicycle' => '自転車'],
            'greeting' => ['text' => '환영합니다!', 'reading' => 'ファニョンハムニダ'],
            'souvenirs' => [
                ['key' => 'dol_hareubang', 'name' => 'トルハルバン', 'condition' => 'stage'],
                ['key' => 'bulguksa', 'name' => '仏国寺', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'us',
            'name' => 'アメリカ',
            'country_code' => 'us',
            'flag' => 'us',
            'min_level' => 11,
            'items' => ['boat_large' => '大きな船'],
            'greeting' => ['text' => 'Welcome!', 'reading' => 'ウェルカム'],
            'souvenirs' => [
                ['key' => 'bison', 'name' => 'バイソンの像', 'condition' => 'stage'],
                ['key' => 'liberty', 'name' => '自由の女神', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'gb',
            'name' => 'イギリス',
            'country_code' => 'gb',
            'flag' => 'GB',
            'min_level' => 13,
            'items' => ['castle' => 'お城'],
            'greeting' => ['text' => 'Hello!', 'reading' => 'ハロー'],
            'souvenirs' => [
                ['key' => 'phone_box', 'name' => '赤い電話ボックス', 'condition' => 'stage'],
                ['key' => 'stonehenge', 'name' => 'ストーンヘンジ', 'condition' => 'boss'],
            ],
        ],
        [
            'key' => 'fr',
            'name' => 'フランス',
            'country_code' => 'fr',
            'flag' => 'fr',
            'min_level' => 15,
            'items' => ['tower' => 'タワー'],
            'greeting' => ['text' => 'Bienvenue!', 'reading' => 'ビアンヴニュ'],
            'souvenirs' => [
                ['key' => 'eiffel', 'name' => 'エッフェル塔の置物', 'condition' => 'stage'],
                ['key' => 'mont_saint_michel', 'name' => 'モン・サン=ミッシェル', 'condition' => 'boss'],
            ],
        ],
    ],

];
```

`config/world.php` の `asset_keys` と `asset_footprints` を次にする（コメントは今のものに1文足す）:

```php
    'asset_keys' => [
        'bench', 'flowerbed', 'chochin', 'tree', 'sakura', 'vending', 'bicycle', 'stall',
        'stone_lantern', 'bamboo', 'fountain', 'palm', 'parasol', 'pagoda', 'castle', 'tower',
        'boat_small', 'boat_large',
    ],

    /*
    | 2×2マス使う絵(docs/design/2026-09-27-spru-wave-e-design.md 3-4)。書いていない絵は1マス。
    | Ownerがアイテムごとに大きさを変えられないよう、絵で決める。フロントの art-keys.ts の BIG_ASSETS と必ず一致させる。
    | おみやげ(config/travel.php)の2個目もここに書く(F回)
    */

    'asset_footprints' => [
        'fountain' => 2, 'pagoda' => 2, 'castle' => 2, 'tower' => 2, 'boat_large' => 2,
        'borobudur' => 2, 'bulguksa' => 2, 'liberty' => 2, 'stonehenge' => 2, 'mont_saint_michel' => 2,
    ],
```

- [ ] **Step 5: テーブルとモデルを作る**

`database/migrations/2026_09_27_000012_create_profile_trips_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // 行き先のキー(config/travel.php)
            $table->string('destination', 32);
            $table->timestamp('arrived_at');
            $table->timestamps();

            $table->unique(['user_profile_id', 'destination']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_trips');
    }
};
```

`database/migrations/2026_09_27_000013_create_profile_souvenirs_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_souvenirs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // おみやげのキー(config/travel.php)。連打しても1つだけにする
            $table->string('souvenir', 32);
            $table->timestamp('received_at');
            $table->timestamps();

            $table->unique(['user_profile_id', 'souvenir']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_souvenirs');
    }
};
```

`app/Models/ProfileTrip.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileTrip extends Model
{
    protected $fillable = ['destination', 'arrived_at'];

    protected function casts(): array
    {
        return ['arrived_at' => 'datetime'];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/ProfileSouvenir.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileSouvenir extends Model
{
    protected $fillable = ['souvenir', 'received_at'];

    protected function casts(): array
    {
        return ['received_at' => 'datetime'];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/UserProfile.php` の `errands()` の後に足す:

```php
    public function trips(): HasMany
    {
        return $this->hasMany(ProfileTrip::class);
    }

    public function souvenirs(): HasMany
    {
        return $this->hasMany(ProfileSouvenir::class);
    }
```

- [ ] **Step 6: 状態を計算する部品を書く（`app/Support/Travel.php`）**

```php
<?php

namespace App\Support;

use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * 旅(docs/design/2026-09-27-spru-wave-f-design.md 3章・4-3)。行き先・条件・おみやげは config/travel.php に持ち、
 * DBには着いた国(profile_trips)と受け取ったおみやげ(profile_souvenirs)だけを持つ。
 * おみやげの条件は今あるクリアの記録(profile_stage_progress)から数える。
 */
class Travel
{
    /** @return list<array<string, mixed>> */
    public static function destinations(): array
    {
        return config('travel.destinations');
    }

    public static function indexOf(string $key): ?int
    {
        $index = array_search($key, array_column(self::destinations(), 'key'), true);

        return $index === false ? null : $index;
    }

    /** 旅じたく(旅のじゅんびに使う町のアイテム)の絵のキー。ショップの「旅じたく」の札に使う @return list<string> */
    public static function gearAssetKeys(): array
    {
        return collect(self::destinations())
            ->flatMap(fn (array $destination) => array_keys($destination['items']))
            ->unique()
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public static function state(UserProfile $profile): array
    {
        $context = self::context($profile);
        $destinations = self::destinations();
        $next = self::nextIndex($context['visited']);

        return collect($destinations)
            ->map(fn (array $destination, int $index) => self::present($destinations, $index, $next, $context))
            ->all();
    }

    /** @return array<string, mixed>|null */
    public static function show(UserProfile $profile, string $key): ?array
    {
        $index = self::indexOf($key);

        return $index === null ? null : self::state($profile)[$index];
    }

    /** まだ着いていない国のうち、いちばん順の早い国(全部着いていれば null) */
    private static function nextIndex(array $visited): ?int
    {
        foreach (self::destinations() as $index => $destination) {
            if (! in_array($destination['key'], $visited, true)) {
                return $index;
            }
        }

        return null;
    }

    /** 状態の計算に使う記録。それぞれ1回のクエリで読む @return array<string, mixed> */
    private static function context(UserProfile $profile): array
    {
        $cleared = ProfileStageProgress::query()
            ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
            ->where('profile_stage_progress.user_profile_id', $profile->id)
            ->whereNotNull('profile_stage_progress.cleared_at')
            ->get(['stages.country_id', 'stages.difficulty', 'stages.is_boss']);

        $codes = array_map('strtolower', array_column(self::destinations(), 'country_code'));
        $decorations = ShopItem::query()->where('type', 'decoration')->get();

        return [
            'level' => $profile->level,
            'visited' => $profile->trips()->pluck('destination')->all(),
            'received' => $profile->souvenirs()->pluck('souvenir')->all(),
            'owned' => $profile->worldItems()->with('shopItem')->get()
                ->map(fn ($item) => $item->shopItem->assetKey())
                ->filter()
                ->unique()
                ->values()
                ->all(),
            'cleared_countries' => $cleared->pluck('country_id')->map(fn ($id) => (int) $id)->unique()->values()->all(),
            'boss_countries' => $cleared
                ->filter(fn ($stage) => $stage->difficulty === '初級' && (bool) $stage->is_boss)
                ->pluck('country_id')->map(fn ($id) => (int) $id)->unique()->values()->all(),
            'countries' => Country::query()
                ->whereIn(DB::raw('LOWER(code)'), $codes)
                ->get(['id', 'code'])
                ->keyBy(fn (Country $country) => strtolower($country->code)),
            // 旅じたくのヒント(「Lv.7でショップに出るよ」)に使う、売っているアイテムの必要レベル
            'shop_levels' => $decorations
                ->reject(fn (ShopItem $item) => $item->meta['not_for_sale'] ?? false)
                ->groupBy(fn (ShopItem $item) => $item->assetKey())
                ->map(fn ($items) => $items->min('min_level'))
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    private static function present(array $destinations, int $index, ?int $next, array $context): array
    {
        $destination = $destinations[$index];
        $country = $context['countries'][strtolower($destination['country_code'])] ?? null;
        $visited = in_array($destination['key'], $context['visited'], true);
        $state = $visited ? 'visited' : ($index === $next ? 'next' : 'later');
        $checklist = self::checklist($destinations, $index, $context);
        $souvenirs = array_map(
            fn (array $souvenir) => self::souvenir($destination, $souvenir, $country, $context),
            $destination['souvenirs'],
        );

        return [
            'key' => $destination['key'],
            'name' => $destination['name'],
            'country_id' => $country?->id,
            'code' => $destination['country_code'],
            'flag' => "/flag/{$destination['flag']}.svg",
            'min_level' => $destination['min_level'],
            'state' => $state,
            'ready' => $state === 'next' && collect($checklist)->every(fn (array $row) => $row['done']),
            'checklist' => $checklist,
            'souvenirs' => $souvenirs,
            'gift_ready' => $visited && collect($souvenirs)->contains(fn (array $souvenir) => $souvenir['met'] && ! $souvenir['received']),
            'greeting' => $destination['greeting'],
        ];
    }

    /** 旅のじゅんび: レベル → 町のアイテム → 前の国の2個目のおみやげ @return list<array<string, mixed>> */
    private static function checklist(array $destinations, int $index, array $context): array
    {
        $destination = $destinations[$index];
        $levelDone = $context['level'] >= $destination['min_level'];
        $rows = [[
            'kind' => 'level',
            'label' => "レベル{$destination['min_level']}",
            'done' => $levelDone,
            'hint' => $levelDone ? null : 'あと'.($destination['min_level'] - $context['level']).'レベル',
        ]];

        foreach ($destination['items'] as $assetKey => $name) {
            $done = in_array($assetKey, $context['owned'], true);
            $shopLevel = $context['shop_levels'][$assetKey] ?? null;
            $rows[] = [
                'kind' => 'item',
                'label' => $name,
                'done' => $done,
                'hint' => match (true) {
                    $done => null,
                    $shopLevel !== null && $context['level'] < $shopLevel => "Lv.{$shopLevel}でショップに出るよ",
                    default => 'ショップで買えるよ',
                },
            ];
        }

        if ($index > 0) {
            $previous = $destinations[$index - 1];
            $souvenir = collect($previous['souvenirs'])->firstWhere('condition', 'boss');
            $previousCountry = $context['countries'][strtolower($previous['country_code'])] ?? null;
            $done = in_array($souvenir['key'], $context['received'], true);
            $met = $previousCountry !== null && in_array($previousCountry->id, $context['boss_countries'], true);
            $rows[] = [
                'kind' => 'souvenir',
                'label' => "{$previous['name']}のおみやげ「{$souvenir['name']}」",
                'done' => $done,
                'hint' => match (true) {
                    $done => null,
                    $met => "{$previous['name']}のおみやげ屋さんで受け取ろう",
                    default => "{$previous['name']}の初級のボスをクリアしよう",
                },
            ];
        }

        return $rows;
    }

    /** @return array<string, mixed> */
    private static function souvenir(array $destination, array $souvenir, ?Country $country, array $context): array
    {
        $boss = $souvenir['condition'] === 'boss';
        $cleared = $boss ? $context['boss_countries'] : $context['cleared_countries'];

        return [
            'key' => $souvenir['key'],
            'name' => $souvenir['name'],
            'asset_key' => $souvenir['key'],
            'footprint' => (int) (config('world.asset_footprints')[$souvenir['key']] ?? 1),
            'condition' => $souvenir['condition'],
            'condition_label' => $boss
                ? "{$destination['name']}の初級のボスをクリア"
                : "{$destination['name']}のステージを1つクリア",
            'met' => $country !== null && in_array($country->id, $cleared, true),
            'received' => in_array($souvenir['key'], $context['received'], true),
        ];
    }
}
```

- [ ] **Step 7: APIを足す（`routes/api.php`）**

先頭の `use` に `use App\Support\Travel;` を足す（`use App\Support\Review;` の次）。町のAPIのグループ（`prefix('world')`）の閉じ `});` の後、家族の町のグループ（`prefix('family')`）の前に足す:

```php
Route::middleware(['auth:sanctum'])->prefix('travel')->name('travel.')->group(function () {
    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);

        return ['level' => $profile->level, 'destinations' => Travel::state($profile)];
    })->name('index');

    Route::get('/{key}', function (Request $request, string $key) {
        $destination = Travel::show(ActiveProfile::require($request), $key);
        abort_unless($destination, 404);
        abort_unless($destination['state'] === 'visited', 422, 'まだこの国に着いていません。');

        return $destination;
    })->name('show');
});
```

- [ ] **Step 8: テストを走らせて通ることを確かめる**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan test --compact tests/Feature/TravelTest.php`
Expected: PASS（14件）

- [ ] **Step 9: 設計書を直す（国旗）**

`docs/design/2026-09-27-spru-wave-f-design.md` の4-2の設定例の `'country_code' => 'id',` の次の行に `'flag' => 'id',                  // public/flag/ のファイル名（DBの国コードは大文字小文字が不揃いなため）` を足し、4-4の `Destination` の項目に `flag`（国旗の画像のパス。例 `/flag/kr.svg`）を足す。

- [ ] **Step 10: 全体のテストを走らせてコミットする**

Run: `./vendor/bin/sail artisan test --compact`
Expected: PASS（304件）

```bash
git add config/travel.php config/world.php database/migrations/2026_09_27_000012_create_profile_trips_table.php database/migrations/2026_09_27_000013_create_profile_souvenirs_table.php app/Models/ProfileTrip.php app/Models/ProfileSouvenir.php app/Models/UserProfile.php app/Support/Travel.php routes/api.php tests/Pest.php tests/Feature/TravelTest.php docs/design/2026-09-27-spru-wave-f-design.md
git commit -m "#00144: feature:旅の行き先5か国の設定と、着いた国・受け取ったおみやげの記録、旅のハブのAPI(じゅんびリスト・おみやげの条件)を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 出発・おみやげの受け取りと、町・ショップ・バッグの印

**Files:**
- Modify: `app/Support/Travel.php`、`routes/api.php`、`app/Models/ProfileWorldItem.php`、`database/seeders/WorldItemSeeder.php`
- Test: `tests/Feature/TravelActionsTest.php`

**Interfaces:**
- Consumes: Task 1 の `Travel::state()`・`Travel::indexOf()`・`Travel::gearAssetKeys()`、テスト用の `createTravelCountry()`・`clearCountryStage()`・`giveWorldItem()`・`setProfileLevel()`
- Produces:
  - `Travel::depart(UserProfile $profile, string $key): array` → `['first' => bool, 'destination' => Destination]`
  - `Travel::receive(UserProfile $profile, string $key, string $souvenirKey): array` → `['world_item' => WorldItemArray, 'destination' => Destination]`
  - `Travel::ready(UserProfile $profile): ?array` → `['key' => string, 'name' => string]|null`
  - `GET /api/world` の `travel_ready`、`items`・`bag` の各アイテムの `souvenir`（bool）
  - `GET /api/shop` の各商品の `travel_gear`（bool）

- [ ] **Step 1: 失敗するテストを書く（`tests/Feature/TravelActionsTest.php`）**

```php
<?php

use App\Models\ShopItem;
use App\Models\UserProfile;
use Database\Seeders\WorldItemSeeder;

/*
|--------------------------------------------------------------------------
| 出発とおみやげの受け取り(docs/design/2026-09-27-spru-wave-f-design.md 3-1・3-2・4-4)
|--------------------------------------------------------------------------
|
| 出発もおみやげの受け取りも、プロフィールをロックしてから行い、一意の制約でも二重にならないようにする。
|
*/

function readyForIndonesia(UserProfile $profile): void
{
    setProfileLevel($profile, 7);
    giveWorldItem($profile, 'boat_small');
}

it('じゅんびがそろっていないと出発できない', function () {
    createActiveProfile();

    $this->postJson('/api/travel/id/depart')
        ->assertStatus(422)
        ->assertJsonPath('message', '旅のじゅんびがそろっていません。');
});

it('出発すると着いた国として記録され、2回目は first が false で記録は1つのまま', function () {
    $profile = createActiveProfile();
    readyForIndonesia($profile);

    $this->postJson('/api/travel/id/depart')->assertOk()
        ->assertJsonPath('first', true)
        ->assertJsonPath('destination.state', 'visited');
    $this->postJson('/api/travel/id/depart')->assertOk()->assertJsonPath('first', false);

    expect($profile->trips()->where('destination', 'id')->count())->toBe(1);
});

it('まだ先の国には、レベルが足りていても出発できない', function () {
    $profile = createActiveProfile();
    setProfileLevel($profile, 15);
    giveWorldItem($profile, 'bicycle');

    $this->postJson('/api/travel/kr/depart')
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだこの国には行けません。');
});

it('知らない行き先は404', function () {
    createActiveProfile();

    $this->postJson('/api/travel/xx/depart')->assertNotFound();
});

it('おみやげは、着く前は受け取れない', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', false);

    $this->postJson('/api/travel/id/souvenirs/komodo')
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだこの国に着いていません。');
});

it('おみやげは、条件を満たしていなければ受け取れない', function () {
    $profile = createActiveProfile();
    createTravelCountry('id', 'インドネシア');
    readyForIndonesia($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();

    $this->postJson('/api/travel/id/souvenirs/komodo')
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ受け取れません。');
});

it('着く前にクリアしていても、着いた後に1個目を受け取れ、バッグに非売品のおみやげとして入る', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', false);
    readyForIndonesia($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();

    $this->postJson('/api/travel/id/souvenirs/komodo')->assertOk()
        ->assertJsonPath('world_item.name', 'コモドドラゴンの像')
        ->assertJsonPath('world_item.asset_key', 'komodo')
        ->assertJsonPath('world_item.footprint', 1)
        ->assertJsonPath('world_item.souvenir', true)
        ->assertJsonPath('world_item.x', null)
        ->assertJsonPath('destination.souvenirs.0.received', true)
        ->assertJsonPath('destination.gift_ready', false);

    $item = ShopItem::query()->where('name', 'コモドドラゴンの像')->firstOrFail();
    expect($item->meta)->toMatchArray(['asset_key' => 'komodo', 'not_for_sale' => true, 'souvenir_of' => 'インドネシア']);
    $this->getJson('/api/world')->assertOk()->assertJsonPath('bag.1.asset_key', 'komodo');
    $this->getJson('/api/shop')->assertOk()->assertJsonMissing(['name' => 'コモドドラゴンの像']);
});

it('おみやげは1回だけ受け取れる', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', false);
    readyForIndonesia($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();
    $this->postJson('/api/travel/id/souvenirs/komodo')->assertOk();

    $this->postJson('/api/travel/id/souvenirs/komodo')
        ->assertStatus(422)
        ->assertJsonPath('message', 'もう受け取っています。');

    expect($profile->souvenirs()->count())->toBe(1);
    expect($profile->worldItems()->whereHas('shopItem', fn ($q) => $q->where('name', 'コモドドラゴンの像'))->count())->toBe(1);
});

it('知らないおみやげ・その国にないおみやげは404', function (string $souvenir) {
    $profile = createActiveProfile();
    readyForIndonesia($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();

    $this->postJson("/api/travel/id/souvenirs/{$souvenir}")->assertNotFound();
})->with(['韓国のおみやげ' => 'bulguksa', '知らないキー' => 'zzz']);

it('2×2のおみやげ(ボロブドゥール寺院)は、町に置くと4マス使う', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', true);
    readyForIndonesia($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();

    $id = $this->postJson('/api/travel/id/souvenirs/borobudur')->assertOk()
        ->assertJsonPath('world_item.footprint', 2)
        ->json('world_item.id');

    $this->patchJson("/api/world/items/{$id}", ['x' => 4, 'y' => 4])->assertOk()->assertJsonPath('footprint', 2);
    $bench = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);
    $this->patchJson("/api/world/items/{$bench->id}", ['x' => 5, 'y' => 5])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
});

it('インドネシアの2個目を受け取り、Lv.9で自転車を持っていれば韓国へ出発できる', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    clearCountryStage($profile, $indonesia, '初級', true);
    readyForIndonesia($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();
    $this->postJson('/api/travel/id/souvenirs/borobudur')->assertOk();
    setProfileLevel($profile, 9);
    giveWorldItem($profile, 'bicycle', true);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('destinations.1.ready', true);
    $this->postJson('/api/travel/kr/depart')->assertOk()->assertJsonPath('first', true);
});

it('町の travel_ready は、次の行き先のじゅんびがそろったときだけ行き先を返す', function () {
    $profile = createActiveProfile();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('travel_ready', null);

    readyForIndonesia($profile);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('travel_ready', ['key' => 'id', 'name' => 'インドネシア']);

    $this->postJson('/api/travel/id/depart')->assertOk();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('travel_ready', null);
});

it('町のアイテムに souvenir が付く(ふつうのアイテムは false)', function () {
    $profile = createActiveProfile();
    giveWorldItem($profile, 'bench');

    $this->getJson('/api/world')->assertOk()->assertJsonPath('bag.0.souvenir', false);
});

it('ショップの旅じたく(小さな船・お城)に travel_gear が付く', function () {
    createActiveProfile();
    createDecoration(['name' => '小さな船', 'meta' => ['asset_key' => 'boat_small']]);
    createDecoration(['name' => 'お城', 'meta' => ['asset_key' => 'castle']]);
    createDecoration(['name' => 'ベンチ']);

    $decorations = collect($this->getJson('/api/shop')->assertOk()->json())->keyBy('name');

    expect($decorations['小さな船']['travel_gear'])->toBeTrue();
    expect($decorations['お城']['travel_gear'])->toBeTrue();
    expect($decorations['ベンチ']['travel_gear'])->toBeFalse();
});

it('品ぞろえに小さな船(Lv.7・200pt)と大きな船(Lv.11・450pt・2×2)がある', function () {
    $this->seed(WorldItemSeeder::class);

    $small = ShopItem::query()->where('name', '小さな船')->firstOrFail();
    $large = ShopItem::query()->where('name', '大きな船')->firstOrFail();

    expect([$small->min_level, $small->price, $small->assetKey(), $small->footprint()])->toBe([7, 200, 'boat_small', 1]);
    expect([$large->min_level, $large->price, $large->assetKey(), $large->footprint()])->toBe([11, 450, 'boat_large', 2]);
});
```

`bag.1.asset_key` は、`readyForIndonesia` で先にバッグに入れた小さな船が `bag.0` になるため。

- [ ] **Step 2: テストを走らせて失敗を確かめる**

Run: `./vendor/bin/sail artisan test --compact tests/Feature/TravelActionsTest.php`
Expected: FAIL（`/api/travel/id/depart` が405か404、`travel_ready`・`souvenir`・`travel_gear` が無い、船が品ぞろえに無い）

- [ ] **Step 3: 出発・受け取り・travel_ready を `app/Support/Travel.php` に足す**

`show()` の後に足す:

```php
    /** 出発する(プロフィールはロック済みで呼ぶ)。着いたことのある国なら何もしない @return array{first: bool, destination: array<string, mixed>} */
    public static function depart(UserProfile $profile, string $key): array
    {
        $index = self::indexOf($key);
        abort_if($index === null, 404);

        $destination = self::state($profile)[$index];
        if ($destination['state'] === 'visited') {
            return ['first' => false, 'destination' => $destination];
        }
        abort_unless($destination['state'] === 'next', 422, 'まだこの国には行けません。');
        abort_unless($destination['ready'], 422, '旅のじゅんびがそろっていません。');

        $profile->trips()->create(['destination' => $key, 'arrived_at' => now()]);

        return ['first' => true, 'destination' => self::state($profile)[$index]];
    }

    /** おみやげを受け取ってバッグに入れる(プロフィールはロック済みで呼ぶ) @return array{world_item: array<string, mixed>, destination: array<string, mixed>} */
    public static function receive(UserProfile $profile, string $key, string $souvenirKey): array
    {
        $index = self::indexOf($key);
        abort_if($index === null, 404);
        $config = self::destinations()[$index];
        $souvenirConfig = collect($config['souvenirs'])->firstWhere('key', $souvenirKey);
        abort_if($souvenirConfig === null, 404);

        $destination = self::state($profile)[$index];
        abort_unless($destination['state'] === 'visited', 422, 'まだこの国に着いていません。');
        $souvenir = collect($destination['souvenirs'])->firstWhere('key', $souvenirKey);
        abort_unless($souvenir['met'], 422, 'まだ受け取れません。');
        abort_if($souvenir['received'], 422, 'もう受け取っています。');

        $profile->souvenirs()->create(['souvenir' => $souvenirKey, 'received_at' => now()]);
        $worldItem = $profile->worldItems()->create(['shop_item_id' => self::souvenirShopItem($config, $souvenirConfig)->id]);

        return [
            'world_item' => $worldItem->load('shopItem')->toWorldArray(),
            'destination' => self::state($profile)[$index],
        ];
    }

    /** 町の「旅のじゅんびがそろったよ」に使う。次の行き先のじゅんびがそろっていればその国 @return array{key: string, name: string}|null */
    public static function ready(UserProfile $profile): ?array
    {
        $next = collect(self::state($profile))->firstWhere('state', 'next');

        return $next && $next['ready'] ? ['key' => $next['key'], 'name' => $next['name']] : null;
    }

    /** おみやげの町のアイテム(非売品)。そのおみやげを初めてだれかが受け取ったときに作る(スプルの花と同じ) */
    private static function souvenirShopItem(array $destination, array $souvenir): ShopItem
    {
        return ShopItem::query()->firstOrCreate(
            ['type' => 'decoration', 'name' => $souvenir['name']],
            [
                'price' => 0,
                'currency' => 'point',
                'min_level' => 1,
                'meta' => ['asset_key' => $souvenir['key'], 'not_for_sale' => true, 'souvenir_of' => $destination['name']],
            ],
        );
    }
```

- [ ] **Step 4: APIを足す（`routes/api.php`）**

旅のグループ（Task 1）の `show` の後に足す:

```php
    Route::post('/{key}/depart', function (Request $request, string $key) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile, $key) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return Travel::depart($profile, $key);
        });
    })->name('depart');

    Route::post('/{key}/souvenirs/{souvenir}', function (Request $request, string $key, string $souvenir) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile, $key, $souvenir) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return Travel::receive($profile, $key, $souvenir);
        });
    })->name('souvenirs.receive');
```

`GET /api/world` の返す配列の `'plots_new' => ...,` の次に足す:

```php
            'travel_ready' => Travel::ready($profile),
```

`GET /api/shop` を次のようにする（`->map(...)` の前で旅じたくの絵を1回だけ読む）:

```php
Route::middleware(['auth:sanctum'])->get('/shop', function (Request $request) {
    $level = ActiveProfile::find($request)?->level ?? 1;
    $gear = Travel::gearAssetKeys();

    return ShopItem::query()
        ->whereIn('type', config('shop.enabled_types'))
        ->orderBy('type')
        ->orderBy('min_level')
        ->orderBy('price')
        ->get()
        // 種から咲く「スプルの花」・旅のおみやげなどの非売品は出さない
        ->reject(fn (ShopItem $item) => $item->meta['not_for_sale'] ?? false)
        ->values()
        ->map(fn (ShopItem $item) => [
            ...$item->toArray(),
            'asset_key' => $item->assetKey(),
            'footprint' => $item->footprint(),
            'travel_gear' => in_array($item->assetKey(), $gear, true),
            'locked' => $level < $item->min_level,
        ]);
})->name('shop.index');
```

- [ ] **Step 5: 町のアイテムに `souvenir` を足す（`app/Models/ProfileWorldItem.php`）**

```php
    /** @return array{id: int, shop_item_id: int, name: string, asset_key: ?string, footprint: int, souvenir: bool, x: ?int, y: ?int} */
    public function toWorldArray(): array
    {
        return [
            'id' => $this->id,
            'shop_item_id' => $this->shop_item_id,
            'name' => $this->shopItem->name,
            'asset_key' => $this->shopItem->assetKey(),
            'footprint' => $this->shopItem->footprint(),
            'souvenir' => isset($this->shopItem->meta['souvenir_of']),
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
```

- [ ] **Step 6: 品ぞろえに船を足す（`database/seeders/WorldItemSeeder.php`）**

`$items` の最後（タワーの次）に足す:

```php
            // F回(docs/design/2026-09-27-spru-wave-f-design.md 3-3)。旅じたく。インドネシア・アメリカへの旅に使う
            ['name' => '小さな船', 'price' => 200, 'min_level' => 7, 'asset_key' => 'boat_small'],
            ['name' => '大きな船', 'price' => 450, 'min_level' => 11, 'asset_key' => 'boat_large'],
```

- [ ] **Step 7: テストを走らせて通ることを確かめる**

Run: `./vendor/bin/sail artisan test --compact tests/Feature/TravelActionsTest.php tests/Feature/TravelTest.php tests/Feature/WorldShopTest.php tests/Feature/WorldApiTest.php tests/Feature/FamilyTownTest.php`
Expected: PASS

- [ ] **Step 8: 全体のテストを走らせてコミットする**

Run: `./vendor/bin/sail artisan test --compact`
Expected: PASS（320件）

```bash
git add app/Support/Travel.php routes/api.php app/Models/ProfileWorldItem.php database/seeders/WorldItemSeeder.php tests/Feature/TravelActionsTest.php
git commit -m "#00145: feature:旅の出発とおみやげの受け取りのAPIを追加し、町の「じゅんびがそろった」・ショップの旅じたく・おみやげの印と、小さな船・大きな船を足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 画面の型と計算（ハブのひとこと・島のラベル・ステージ選び・出発の場面の段階・町のひとこと）

**Files:**
- Create: `frontend/src/components/travel/types.ts`、`frontend/src/components/travel/travel.ts`
- Modify: `frontend/src/components/world/types.ts`、`frontend/src/components/spru/hint.ts`、`frontend/src/components/world/world-screen.tsx`
- Test: `frontend/src/components/travel/travel.test.ts`、`frontend/src/components/spru/hint.test.ts`

**Interfaces:**
- Consumes: Task 1・2 のAPIの形（`Destination`・`travel_ready`・`souvenir`・`travel_gear`）
- Produces:
  - `types.ts`: `TravelState`・`ChecklistRow`・`TravelSouvenir`・`Destination`・`TravelData`・`DepartResult`・`ReceiveResult`
  - `travel.ts`: `hubLine(destinations: Destination[]): string`、`islandLabel(d: Destination): string`、`islandTag(d: Destination): string | null`、`receivedCount(d: Destination): number`、`pickBeginnerGroup<T extends BeginnerGroupLike>(groups: T[]): T | null`、`WALK_MS`・`SAIL_MS`・`ARRIVE_MS`、`DeparturePhase`、`departureStart(reduced: boolean): number`、`departurePhase(elapsed: number): DeparturePhase`
  - `WorldItem.souvenir: boolean`、`ShopListItem.travel_gear: boolean`、`WorldData.travel_ready: { key: string; name: string } | null`
  - `pickTownHint({ ..., travelReady })`

- [ ] **Step 1: 型を書く**

`frontend/src/components/travel/types.ts`:

```ts
import type { WorldItem } from "@/components/world/types";

export type TravelState = "visited" | "next" | "later";

/** 旅のじゅんびの1行(設計書4-4)。そろっていれば hint は null */
export type ChecklistRow = { kind: "level" | "item" | "souvenir"; label: string; done: boolean; hint: string | null };

export type TravelSouvenir = {
  key: string;
  name: string;
  asset_key: string;
  footprint: number;
  condition: "stage" | "boss";
  condition_label: string;
  met: boolean;
  received: boolean;
};

export type Destination = {
  key: string;
  name: string;
  country_id: number | null;
  code: string;
  flag: string;
  min_level: number;
  state: TravelState;
  ready: boolean;
  checklist: ChecklistRow[];
  souvenirs: TravelSouvenir[];
  gift_ready: boolean;
  greeting: { text: string; reading: string };
};

export type TravelData = { level: number; destinations: Destination[] };

export type DepartResult = { first: boolean; destination: Destination };

export type ReceiveResult = { world_item: WorldItem; destination: Destination };
```

`frontend/src/components/world/types.ts` を直す:
- `WorldItem` の `footprint: number;` の次に `/** 旅のおみやげか(設計書F回4-4) */` と `souvenir: boolean;` を足す
- `WorldData` の `plots_new: string[];` の次に `/** 次の行き先のじゅんびがそろっていれば、その国(F回) */` と `travel_ready: { key: string; name: string } | null;` を足す
- `ShopListItem` の `footprint: number;` の次に `/** 旅のじゅんびに使うアイテム(ショップの「旅じたく」の札) */` と `travel_gear: boolean;` を足す

- [ ] **Step 2: 失敗するテストを書く（`frontend/src/components/travel/travel.test.ts`）**

```ts
import { describe, expect, it } from "vitest";

import {
  ARRIVE_MS,
  SAIL_MS,
  WALK_MS,
  departurePhase,
  departureStart,
  hubLine,
  islandLabel,
  islandTag,
  pickBeginnerGroup,
} from "./travel";
import type { ChecklistRow, Destination, TravelSouvenir } from "./types";

const souvenir = (key: string, over: Partial<TravelSouvenir> = {}): TravelSouvenir => ({
  key,
  name: key,
  asset_key: key,
  footprint: 1,
  condition: "stage",
  condition_label: "",
  met: false,
  received: false,
  ...over,
});

const row = (kind: ChecklistRow["kind"], label: string, done: boolean, hint: string | null = null): ChecklistRow => ({
  kind,
  label,
  done,
  hint,
});

const dest = (name: string, over: Partial<Destination> = {}): Destination => ({
  key: name,
  name,
  country_id: 1,
  code: "id",
  flag: "/flag/id.svg",
  min_level: 7,
  state: "later",
  ready: false,
  checklist: [],
  souvenirs: [souvenir("a"), souvenir("b", { condition: "boss", footprint: 2 })],
  gift_ready: false,
  greeting: { text: "Hello!", reading: "ハロー" },
  ...over,
});

describe("hubLine", () => {
  it("受け取れるおみやげがある国があれば、いちばん先にそれを言う", () => {
    const destinations = [
      dest("インドネシア", { state: "visited", gift_ready: true }),
      dest("韓国", { state: "next", ready: true }),
    ];
    expect(hubLine(destinations)).toBe("インドネシアのおみやげ屋さんで、おみやげを受け取れるよ！");
  });

  it("次の行き先のじゅんびがそろっていれば、出発をすすめる", () => {
    expect(hubLine([dest("インドネシア", { state: "next", ready: true })])).toBe("じゅんびができたよ！インドネシアへ出発しよう");
  });

  it("レベルが足りなければ、あと何レベルかを言う", () => {
    const next = dest("インドネシア", {
      state: "next",
      checklist: [row("level", "レベル7", false, "あと2レベル"), row("item", "小さな船", false, "ショップで買えるよ")],
    });
    expect(hubLine([next])).toBe("次はインドネシア！あと2レベルだね");
  });

  it("町のアイテムが足りなければ、そのアイテムを言う", () => {
    const next = dest("インドネシア", {
      state: "next",
      checklist: [row("level", "レベル7", true), row("item", "小さな船", false, "ショップで買えるよ")],
    });
    expect(hubLine([next])).toBe("小さな船があればインドネシアへ行けるよ");
  });

  it("前の国のおみやげが足りなければ、そのおみやげを言う", () => {
    const next = dest("韓国", {
      state: "next",
      checklist: [
        row("level", "レベル9", true),
        row("item", "自転車", true),
        row("souvenir", "インドネシアのおみやげ「ボロブドゥール寺院」", false, "インドネシアの初級のボスをクリアしよう"),
      ],
    });
    expect(hubLine([dest("インドネシア", { state: "visited" }), next])).toBe(
      "インドネシアのおみやげ「ボロブドゥール寺院」があれば韓国へ行けるよ",
    );
  });

  it("全部の国に着いたら、ほめる", () => {
    const all = ["インドネシア", "韓国", "アメリカ", "イギリス", "フランス"].map((name) => dest(name, { state: "visited" }));
    expect(hubLine(all)).toBe("5つの国をぜんぶ旅したね！すごい！");
  });
});

describe("島のラベルと札", () => {
  it("着いた国は、受け取ったおみやげの数を言う", () => {
    const visited = dest("インドネシア", { state: "visited", souvenirs: [souvenir("a", { received: true }), souvenir("b")] });
    expect(islandLabel(visited)).toBe("インドネシア(着いた国・おみやげ1/2)");
    expect(islandTag(visited)).toBe("おみやげ 1/2");
  });

  it("着いた国で受け取れるおみやげがあれば、札は「おみやげ！」", () => {
    expect(islandTag(dest("インドネシア", { state: "visited", gift_ready: true }))).toBe("おみやげ！");
  });

  it("次の行き先は、出発できるか・じゅんび中かを言う", () => {
    expect(islandLabel(dest("インドネシア", { state: "next", ready: true }))).toBe("インドネシア(出発できます)");
    expect(islandTag(dest("インドネシア", { state: "next", ready: true }))).toBe("出発できる");
    expect(islandLabel(dest("インドネシア", { state: "next" }))).toBe("インドネシア(じゅんび中)");
    expect(islandTag(dest("インドネシア", { state: "next" }))).toBe("じゅんび中");
  });

  it("まだ先の国は札を出さない", () => {
    expect(islandLabel(dest("アメリカ"))).toBe("アメリカ(まだ先)");
    expect(islandTag(dest("アメリカ"))).toBeNull();
  });
});

describe("pickBeginnerGroup", () => {
  const group = (difficulty: string, language: boolean, boss: boolean, id: number) => ({
    id,
    category: { is_language_mode: language },
    difficulty,
    stages: [{ is_boss: false }, { is_boss: boss }],
  });

  it("初級で、ことばを学ぶモードでなく、ボスがあるグループを選ぶ", () => {
    const groups = [group("初級", true, true, 1), group("初級", false, false, 2), group("初級", false, true, 3), group("中級", false, true, 4)];
    expect(pickBeginnerGroup(groups)?.id).toBe(3);
  });

  it("当てはまるものがなければ最初の初級のグループ、初級がなければ null", () => {
    expect(pickBeginnerGroup([group("中級", false, true, 1), group("初級", true, false, 2)])?.id).toBe(2);
    expect(pickBeginnerGroup([group("中級", false, true, 1)])).toBeNull();
  });
});

describe("出発の場面", () => {
  it("経過時間で、歩く → 船 → 着いた → おわり と進む", () => {
    expect(departurePhase(0)).toBe("walk");
    expect(departurePhase(WALK_MS - 1)).toBe("walk");
    expect(departurePhase(WALK_MS)).toBe("sail");
    expect(departurePhase(SAIL_MS)).toBe("arrive");
    expect(departurePhase(ARRIVE_MS - 1)).toBe("arrive");
    expect(departurePhase(ARRIVE_MS)).toBe("done");
  });

  it("動きを減らす設定のときは、着いた場面から始める", () => {
    expect(departureStart(false)).toBe(0);
    expect(departurePhase(departureStart(true))).toBe("arrive");
  });
});
```

`frontend/src/components/spru/hint.test.ts` を直す:
- `item()` の返す値の `footprint: 1,` の次に `travel_gear: false,` を足す
- `bagItem()` の `footprint: 1,` の次に `souvenir: false,` を足す
- `describe("pickTownHint", ...)` の最初のテストの後に足す:

```ts
  it("旅のじゅんびがそろっていれば、水やりの次に出発をすすめる", () => {
    const travelReady = { key: "id", name: "インドネシア" };
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 7, shop, travelReady })).toBe(
      "旅のじゅんびがそろったよ！『旅する』からインドネシアへ出発しよう",
    );
    expect(pickTownHint({ bag: [], points: 500, level: 7, shop, canWater: true, travelReady })).toBe("畑に水をあげよう！");
  });
```

- [ ] **Step 3: テストを走らせて失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/travel/travel.test.ts src/components/spru/hint.test.ts`
Expected: FAIL（`./travel` が見つからない、出発のひとことが返らない）

- [ ] **Step 4: 計算を書く（`frontend/src/components/travel/travel.ts`）**

```ts
import type { Destination } from "./types";

export function receivedCount(destination: Destination): number {
  return destination.souvenirs.filter((souvenir) => souvenir.received).length;
}

/** 旅のハブで日本の島のスプルが言うひとこと。上から順に最初に当てはまるもの(設計書5-1) */
export function hubLine(destinations: Destination[]): string {
  const gift = destinations.find((destination) => destination.gift_ready);
  if (gift) return `${gift.name}のおみやげ屋さんで、おみやげを受け取れるよ！`;

  const next = destinations.find((destination) => destination.state === "next");
  if (!next) return `${destinations.length}つの国をぜんぶ旅したね！すごい！`;
  if (next.ready) return `じゅんびができたよ！${next.name}へ出発しよう`;

  const missing = next.checklist.find((row) => !row.done);
  if (missing?.kind === "level") return `次は${next.name}！${missing.hint ?? ""}だね`;
  if (missing) return `${missing.label}があれば${next.name}へ行けるよ`;
  return `次は${next.name}！`;
}

/** 島のボタンの読み上げ用ラベル(設計書5-1) */
export function islandLabel(destination: Destination): string {
  if (destination.state === "visited") {
    return `${destination.name}(着いた国・おみやげ${receivedCount(destination)}/${destination.souvenirs.length})`;
  }
  if (destination.state === "next") return `${destination.name}(${destination.ready ? "出発できます" : "じゅんび中"})`;
  return `${destination.name}(まだ先)`;
}

/** 島に出す札。まだ先の国は出さない */
export function islandTag(destination: Destination): string | null {
  if (destination.state === "visited") {
    return destination.gift_ready ? "おみやげ！" : `おみやげ ${receivedCount(destination)}/${destination.souvenirs.length}`;
  }
  if (destination.state === "next") return destination.ready ? "出発できる" : "じゅんび中";
  return null;
}

export type BeginnerGroupLike = { category: { is_language_mode: boolean }; difficulty: string; stages: { is_boss: boolean }[] };

/** 国の画面に出す初級のステージのグループ。ことばを学ぶモードでなく、ボスがあるもの(なければ最初の初級)(設計書5-3) */
export function pickBeginnerGroup<T extends BeginnerGroupLike>(groups: T[]): T | null {
  const beginner = groups.filter((group) => group.difficulty === "初級");
  return (
    beginner.find((group) => !group.category.is_language_mode && group.stages.some((stage) => stage.is_boss)) ??
    beginner[0] ??
    null
  );
}

// 出発の場面の区切り(設計書5-2)。桟橋へ歩く → 船で渡る → 着いた → 国の画面へ
export const WALK_MS = 1_200;
export const SAIL_MS = 2_800;
export const ARRIVE_MS = 4_200;

export type DeparturePhase = "walk" | "sail" | "arrive" | "done";

/** 場面をどこから始めるか。動きを減らす設定のときは着いた場面から */
export function departureStart(reduced: boolean): number {
  return reduced ? SAIL_MS : 0;
}

export function departurePhase(elapsed: number): DeparturePhase {
  if (elapsed < WALK_MS) return "walk";
  if (elapsed < SAIL_MS) return "sail";
  if (elapsed < ARRIVE_MS) return "arrive";
  return "done";
}
```

- [ ] **Step 5: 町のひとことを足す（`frontend/src/components/spru/hint.ts`）**

引数に `travelReady = null` を足し、水やりの次に1行足す:

```ts
export function pickTownHint({
  bag,
  points,
  level,
  shop,
  canWater = false,
  travelReady = null,
}: {
  bag: WorldItem[];
  points: number;
  level: number;
  shop: ShopListItem[];
  canWater?: boolean;
  travelReady?: { key: string; name: string } | null;
}): string {
  if (canWater) return "畑に水をあげよう！";
  if (travelReady) return `旅のじゅんびがそろったよ！『旅する』から${travelReady.name}へ出発しよう`;
  if (bag.length > 0) return `バッグに${bag[0].name}があるよ。町に置いてみよう`;
```

（以降は今のまま）

`frontend/src/components/world/world-screen.tsx` の `pickTownHint({ ... canWater: world.garden.can_water, })` に `travelReady: world.travel_ready,` を足す。

- [ ] **Step 6: テスト・型・lintを走らせる**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: PASS（テスト155件→170件。型チェックで `WorldItem`・`ShopListItem` を作っている所が出たら、`souvenir: false`・`travel_gear: false` を足す）

- [ ] **Step 7: コミットする**

```bash
git add frontend/src/components/travel/types.ts frontend/src/components/travel/travel.ts frontend/src/components/travel/travel.test.ts frontend/src/components/world/types.ts frontend/src/components/spru/hint.ts frontend/src/components/spru/hint.test.ts frontend/src/components/world/world-screen.tsx
git commit -m "#00146: feature:旅の画面の型と計算(ハブのひとこと・島のラベル・国のステージ選び・出発の場面の段階)と、町のスプルの「旅のじゅんびがそろったよ」を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 船とおみやげの絵

**Files:**
- Create: `frontend/src/components/world/iso-shapes.tsx`、`frontend/src/components/world/travel-art.tsx`
- Modify: `frontend/src/components/world/art-keys.ts`、`frontend/src/components/world/item-art.tsx`
- Test: `frontend/src/components/world/art-keys.test.ts`

**Interfaces:**
- Consumes: Task 1 の `config/world.php`（`asset_keys`・`asset_footprints`）と `config/travel.php`（おみやげの行）
- Produces: `ITEM_ART_KEYS` に `boat_small`・`boat_large`、`SOUVENIR_ART_KEYS`・`SouvenirArtKey`・`ArtKey`、`BIG_ASSETS: readonly ArtKey[]`、`IsoBox`・`IsoRoof`（`iso-shapes.tsx` から export）、`TRAVEL_ART: Record<"boat_small" | "boat_large" | SouvenirArtKey, ReactNode>`

- [ ] **Step 1: 失敗するテストを書く（`art-keys.test.ts` に足す）**

`import` を `import { BIG_ASSETS, ITEM_ART_KEYS, ITEM_ART_LABELS, SOUVENIR_ART_KEYS, isBigAsset } from "./art-keys";` にし、`config` の次に足す:

```ts
const travel = readFileSync(fileURLToPath(new URL("../../../../config/travel.php", import.meta.url)), "utf8");
```

`describe` の中に足す:

```ts
  it("おみやげの絵のキーは config/travel.php のおみやげと同じ", () => {
    const keys = [...travel.matchAll(/\['key' => '([a-z_]+)', 'name' => '[^']+', 'condition' => '(?:stage|boss)'\]/g)].map(
      (m) => m[1],
    );
    expect(keys).toHaveLength(10);
    expect([...SOUVENIR_ART_KEYS].sort()).toEqual(keys.sort());
  });

  it("旅じたく(config/travel.php の items)の絵は、町のアイテムの絵にある", () => {
    const gear = [...travel.matchAll(/'items' => \['([a-z_]+)' =>/g)].map((m) => m[1]);
    expect(gear).toHaveLength(5);
    for (const key of gear) expect(ITEM_ART_KEYS).toContain(key);
  });
```

`isBigAsset` のテストに `expect(isBigAsset("borobudur")).toBe(true);` と `expect(isBigAsset("komodo")).toBe(false);` を足す。

- [ ] **Step 2: テストを走らせて失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/world/art-keys.test.ts`
Expected: FAIL（`SOUVENIR_ART_KEYS` が無い、`asset_keys`・`asset_footprints` と一致しない）

- [ ] **Step 3: 絵のキーを直す（`art-keys.ts`）**

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
  "boat_small",
  "boat_large",
] as const;

export type ItemArtKey = (typeof ITEM_ART_KEYS)[number];

/** おみやげの絵のキー。config/travel.php のおみやげのキーと必ず一致させる。ショップでは売らないので asset_keys には入れない */
export const SOUVENIR_ART_KEYS = [
  "komodo",
  "borobudur",
  "dol_hareubang",
  "bulguksa",
  "bison",
  "liberty",
  "phone_box",
  "stonehenge",
  "eiffel",
  "mont_saint_michel",
] as const;

export type SouvenirArtKey = (typeof SOUVENIR_ART_KEYS)[number];

export type ArtKey = ItemArtKey | SouvenirArtKey;

/** 管理画面(ショップ編集)の絵の選択肢に出す名前。2×2の絵は大きさも書く */
export const ITEM_ART_LABELS: Record<ItemArtKey, string> = {
  bench: "ベンチ",
  flowerbed: "花だん",
  chochin: "ちょうちん",
  tree: "木",
  sakura: "桜の木",
  vending: "自動販売機",
  bicycle: "自転車",
  stall: "屋台",
  stone_lantern: "石灯籠",
  bamboo: "竹",
  fountain: "噴水(2×2)",
  palm: "ヤシの木",
  parasol: "ビーチパラソル",
  pagoda: "五重塔(2×2)",
  castle: "お城(2×2)",
  tower: "タワー(2×2)",
  boat_small: "小さな船",
  boat_large: "大きな船(2×2)",
};

/** 2×2マスの絵(設計書3-4)。config/world.php の asset_footprints と必ず一致させる */
export const BIG_ASSETS: readonly ArtKey[] = [
  "fountain",
  "pagoda",
  "castle",
  "tower",
  "boat_large",
  "borobudur",
  "bulguksa",
  "liberty",
  "stonehenge",
  "mont_saint_michel",
];
```

（`isBigAsset` は今のまま）

- [ ] **Step 4: 箱・屋根の描き方を移す（`iso-shapes.tsx`）**

`item-art.tsx` の `IsoBox`・`IsoRoof`（コメントごと）を `frontend/src/components/world/iso-shapes.tsx` に移して `export function` にし、`item-art.tsx` では `import { IsoBox, IsoRoof } from "./iso-shapes";` で使う。中身は変えない。

- [ ] **Step 5: 船とおみやげの絵を描く（`travel-art.tsx`）**

```tsx
import type { ReactNode } from "react";

import type { SouvenirArtKey } from "./art-keys";
import { IsoBox, IsoRoof } from "./iso-shapes";

// 原点(0,0)がマスの中心(2×2は4マスの真ん中)。item-art.tsx の絵の一覧に合わせて使う

function Stupa({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5 0 Q-5 -8 0 -9 Q5 -8 5 0 Z" fill="#b3a58f" />
      <path d="M0 -9 V-13" stroke="#9c8f7c" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function Stone({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <IsoBox w={5} h={24} left="#9a9a96" right="#80807c" top="#b0b0ab" />
    </g>
  );
}

function Lintel({ from, to }: { from: [number, number]; to: [number, number] }) {
  return (
    <g>
      <path d={`M${from[0]} ${from[1] - 27} L${to[0]} ${to[1] - 27}`} stroke="#8a8a86" strokeWidth={5} strokeLinecap="square" />
      <path d={`M${from[0]} ${from[1] - 29} L${to[0]} ${to[1] - 29}`} stroke="#b0b0ab" strokeWidth={1.6} strokeLinecap="square" />
    </g>
  );
}

export const TRAVEL_ART: Record<"boat_small" | "boat_large" | SouvenirArtKey, ReactNode> = {
  boat_small: (
    <g>
      <ellipse cx={0} cy={3} rx={22} ry={7} fill="#2f5d2a" opacity={0.15} />
      <path d="M-22 -8 L20 -14 L16 -3 Q0 4 -16 2 Z" fill="#b97b4c" />
      <path d="M-22 -8 L20 -14 L18 -10.5 L-20 -4.5 Z" fill="#d9a06c" />
      <path d="M-16 2 Q0 4 16 -3" stroke="#8e5c33" strokeWidth={1.6} fill="none" />
      <path d="M-2 -10 V-42" stroke="#6e472b" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-1 -41 L16 -31 L-1 -22 Z" fill="#fffaf0" />
      <path d="M-1 -41 L16 -31" stroke="#e5533f" strokeWidth={1.4} />
    </g>
  ),
  boat_large: (
    <g>
      <ellipse cx={0} cy={8} rx={58} ry={20} fill="#2f5d2a" opacity={0.14} />
      <path d="M-56 -10 L52 -26 L42 2 Q0 18 -46 10 Z" fill="#2f5d7a" />
      <path d="M-56 -10 L52 -26 L49 -19 L-53 -3 Z" fill="#fbf6ec" />
      <path d="M-46 10 Q0 18 42 2" stroke="#e5533f" strokeWidth={3} fill="none" />
      <circle cx={-30} cy={-1} r={2.6} fill="#9fd8ff" stroke="#fbf6ec" strokeWidth={1} />
      <circle cx={-18} cy={-3} r={2.6} fill="#9fd8ff" stroke="#fbf6ec" strokeWidth={1} />
      <circle cx={24} cy={-9} r={2.6} fill="#9fd8ff" stroke="#fbf6ec" strokeWidth={1} />
      <IsoBox w={18} h={16} lift={16} left="#fbf6ec" right="#e8dfcf" top="#fffaf0" />
      <rect x={6} y={-58} width={8} height={24} fill="#e5533f" />
      <rect x={6} y={-58} width={8} height={4} fill="#3a2e2a" />
      <path d="M-30 -14 V-72 M32 -24 V-66" stroke="#6e472b" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-29 -70 L-8 -54 L-29 -38 Z" fill="#fffaf0" />
      <path d="M33 -64 L48 -52 L33 -40 Z" fill="#fffaf0" />
    </g>
  ),
  komodo: (
    <g>
      <ellipse cx={0} cy={3} rx={18} ry={6} fill="#2f5d2a" opacity={0.15} />
      <IsoBox w={15} h={9} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <path
        d="M-20 -14 C-15 -17 -9 -20 -3 -20 C4 -20 8 -18 12 -21 C15 -23 19 -23 21 -20 C20 -17 16 -15 12 -15 C7 -14 1 -12 -4 -12 C-10 -12 -15 -12 -20 -14 Z"
        fill="#6f7d4a"
      />
      <path d="M-8 -13 l-3 5 M1 -13 l1 5 M8 -15 l3 5" stroke="#56613a" strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={17} cy={-20} r={1.1} fill="#1f2a14" />
      <path d="M21 -19 l4 -0.6 M21 -19 l4 0.8" stroke="#e5533f" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  ),
  borobudur: (
    <g>
      <ellipse cx={0} cy={6} rx={60} ry={27} fill="#2f5d2a" opacity={0.14} />
      {[0, 1, 2, 3].map((i) => (
        <IsoBox key={i} w={52 - i * 11} h={9} lift={i * 9} left="#9c8f7c" right="#86796a" top="#b3a58f" />
      ))}
      <Stupa x={-12} y={-37} s={0.9} />
      <Stupa x={12} y={-37} s={0.9} />
      <Stupa x={0} y={-31} s={0.9} />
      <path d="M-10 -38 Q-10 -52 0 -55 Q10 -52 10 -38 Z" fill="#c2b49c" />
      <path d="M0 -55 V-66" stroke="#9c8f7c" strokeWidth={2.6} strokeLinecap="round" />
      <Stupa x={-24} y={-26} s={0.8} />
      <Stupa x={24} y={-26} s={0.8} />
    </g>
  ),
  dol_hareubang: (
    <g>
      <ellipse cx={0} cy={3} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <rect x={-9} y={-30} width={18} height={31} rx={7} fill="#6b6a6e" />
      <ellipse cx={0} cy={-35} rx={10} ry={9} fill="#77767a" />
      <path d="M-11 -39 Q0 -55 11 -39 Z" fill="#5e5d61" />
      <ellipse cx={-4} cy={-35} rx={2.6} ry={3} fill="#8f8e92" />
      <ellipse cx={4} cy={-35} rx={2.6} ry={3} fill="#8f8e92" />
      <path d="M-2 -30.5 h4" stroke="#4a494d" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M-8 -16 Q-2 -12 3 -18 M8 -11 Q2 -7 -3 -13" stroke="#5e5d61" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <circle cx={-5} cy={-24} r={0.9} fill="#58575b" />
      <circle cx={5} cy={-4} r={0.9} fill="#58575b" />
      <circle cx={-3} cy={-6} r={0.9} fill="#58575b" />
    </g>
  ),
  bulguksa: (
    <g>
      <ellipse cx={0} cy={6} rx={60} ry={27} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={52} h={14} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <polygon points="-40,-6 -30,-1 -30,-12 -40,-17" fill="#d6cfc1" />
      <path d="M-39 -8 l9 4.5 M-39 -11 l9 4.5 M-39 -14 l9 4.5" stroke="#a39b8d" strokeWidth={1} />
      <IsoBox w={34} h={18} lift={14} left="#c94a33" right="#b23f2b" top="#c94a33" />
      <path d="M-26 -22 v10 M-14 -16 v10 M14 -16 v10 M26 -22 v10" stroke="#fbf6ec" strokeWidth={1.4} opacity={0.7} />
      <IsoBox w={42} h={3} lift={32} left="#3f7a5a" right="#34684c" top="#4f8f6b" />
      <IsoRoof w={44} h={17} lift={35} left="#4a4a52" right="#3a3a42" />
      <path d="M-44 -35 Q-49 -40 -44 -44 M44 -35 Q49 -40 44 -44" stroke="#3a3a42" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  ),
  bison: (
    <g>
      <ellipse cx={0} cy={3} rx={19} ry={6} fill="#2f5d2a" opacity={0.15} />
      <path d="M-13 -7 v7 M-7 -6 v7 M6 -6 v7 M11 -7 v7" stroke="#3f2818" strokeWidth={2.8} strokeLinecap="round" />
      <path
        d="M-17 -8 C-18 -16 -15 -24 -6 -28 C1 -31 9 -29 12 -24 C16 -23 19 -19 18 -13 C17 -9 14 -7 10 -7 C3 -6 -8 -6 -17 -8 Z"
        fill="#5a3b24"
      />
      <path d="M-2 -28 C5 -31 12 -28 13 -21 C13 -15 9 -9 3 -8 C-1 -14 -3 -21 -2 -28 Z" fill="#46301d" />
      <path d="M11 -23 C15 -25 20 -23 20 -17 C20 -13 17 -11 14 -12 Z" fill="#3f2818" />
      <path d="M14 -23 q2 -4 5 -3" stroke="#f2e6cc" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <circle cx={17} cy={-19} r={0.9} fill="#f2e6cc" />
      <path d="M-17 -12 q-4 2 -3 6" stroke="#3f2818" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </g>
  ),
  liberty: (
    <g>
      <ellipse cx={0} cy={6} rx={52} ry={23} fill="#2f5d2a" opacity={0.14} />
      <IsoBox w={42} h={10} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <IsoBox w={20} h={34} lift={10} left="#c9c1b3" right="#b3aa9a" top="#d6cfc1" />
      <path d="M-10 -44 L-7 -86 Q0 -92 7 -86 L10 -44 Z" fill="#6fb3a0" />
      <path d="M-7 -86 Q-3 -64 -9 -44 M3 -86 Q6 -62 4 -44" stroke="#5a9e8c" strokeWidth={1.2} fill="none" />
      <rect x={-12} y={-80} width={6} height={10} rx={1} fill="#5a9e8c" transform="rotate(-12 -9 -75)" />
      <path d="M6 -84 L12 -110" stroke="#6fb3a0" strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={0} cy={-94} r={5.5} fill="#7cc2ae" />
      <path d="M-7 -97 l-4 -5 M-3 -99 l-2 -6 M1 -99 l1 -6 M5 -98 l3 -5 M7 -95 l5 -3" stroke="#6fb3a0" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M9.5 -110 h6 l-1 5 h-4 z" fill="#6fb3a0" />
      <path d="M12.5 -111 q-4 -5 0 -11 q4 6 0 11" fill="#ffc94a" />
    </g>
  ),
  phone_box: (
    <g>
      <ellipse cx={0} cy={3} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <IsoBox w={11} h={36} left="#d8352a" right="#b82a21" top="#e5533f" />
      <polygon points="-9,-8 -2,-4.5 -2,-26 -9,-29.5" fill="#cfe7f2" />
      <polygon points="2,-4.5 9,-8 9,-29.5 2,-26" fill="#b7d8e6" />
      <path d="M-9 -15 l7 3.5 M-9 -22 l7 3.5 M-5.5 -6.2 v-21.5 M2 -11.5 l7 -3.5 M2 -18.5 l7 -3.5 M5.5 -6.2 v-21.5" stroke="#d8352a" strokeWidth={1} />
      <polygon points="-9,-31 -2,-27.5 -2,-29.5 -9,-33" fill="#fffaf0" />
      <IsoRoof w={12} h={5} lift={36} left="#c62f25" right="#a8261e" />
    </g>
  ),
  stonehenge: (
    <g>
      <ellipse cx={0} cy={6} rx={58} ry={27} fill="#2f5d2a" opacity={0.14} />
      <ellipse cx={0} cy={0} rx={50} ry={24} fill="#8fbf5a" opacity={0.45} />
      <Stone x={-16} y={-17} />
      <Stone x={16} y={-17} />
      <Stone x={-30} y={-12} />
      <Stone x={30} y={-12} />
      <Lintel from={[-30, -12]} to={[-16, -17]} />
      <Lintel from={[16, -17]} to={[30, -12]} />
      <g transform="translate(0 0)">
        <IsoBox w={12} h={4} left="#9a9a96" right="#80807c" top="#b0b0ab" />
      </g>
      <Stone x={-34} y={8} />
      <Stone x={34} y={8} />
      <Stone x={-20} y={15} />
      <Stone x={20} y={15} />
      <Lintel from={[-34, 8]} to={[-20, 15]} />
      <Lintel from={[20, 15]} to={[34, 8]} />
    </g>
  ),
  eiffel: (
    <g>
      <ellipse cx={0} cy={3} rx={13} ry={5} fill="#2f5d2a" opacity={0.15} />
      <IsoBox w={12} h={4} left="#b8b0a2" right="#a39b8d" top="#d6cfc1" />
      <path d="M-10 -5 C-6 -17 -3 -31 -1 -53 M10 -5 C6 -17 3 -31 1 -53" stroke="#8a6a4f" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M-7 -11 Q0 -17 7 -11" stroke="#8a6a4f" strokeWidth={2} fill="none" />
      <path d="M-8 -15 H8 M-5 -31 H5 M-2.5 -45 H2.5" stroke="#6e5440" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-6 -21 L4 -29 M6 -21 L-4 -29 M-3 -35 L2 -43 M3 -35 L-2 -43" stroke="#8a6a4f" strokeWidth={0.9} />
      <path d="M0 -53 V-60" stroke="#6e5440" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  ),
  mont_saint_michel: (
    <g>
      <ellipse cx={0} cy={6} rx={60} ry={27} fill="#2f5d2a" opacity={0.14} />
      <ellipse cx={0} cy={0} rx={54} ry={25} fill="#cfe6ef" />
      <path d="M-46 2 Q-32 -26 -9 -40 Q6 -48 21 -38 Q41 -22 48 2 Q0 16 -46 2 Z" fill="#9a8f7e" />
      <path d="M-46 2 Q0 16 48 2 L44 6 Q0 20 -42 6 Z" fill="#7d7364" />
      <path d="M-42 0 Q0 12 44 0" stroke="#c9c1b3" strokeWidth={4} fill="none" />
      <rect x={-34} y={-12} width={10} height={9} fill="#e8dfcf" />
      <path d="M-35 -12 l6 -5 l6 5 z" fill="#5b6a73" />
      <rect x={-20} y={-24} width={10} height={9} fill="#e8dfcf" />
      <path d="M-21 -24 l6 -5 l6 5 z" fill="#5b6a73" />
      <rect x={20} y={-20} width={10} height={9} fill="#e8dfcf" />
      <path d="M19 -20 l6 -5 l6 5 z" fill="#5b6a73" />
      <g transform="translate(4 0)">
        <IsoBox w={16} h={16} lift={38} left="#e8dfcf" right="#d4c9b4" top="#fbf6ec" />
        <IsoRoof w={18} h={9} lift={54} left="#5b6a73" right="#4a5760" />
      </g>
      <path d="M1 -64 L4 -96 L7 -64 Z" fill="#5b6a73" />
      <circle cx={4} cy={-98} r={2} fill="#d4a72c" />
    </g>
  ),
};
```

- [ ] **Step 6: 絵の一覧に合わせる（`item-art.tsx`）**

- `import { isBigAsset, type ArtKey } from "./art-keys";`・`import { IsoBox, IsoRoof } from "./iso-shapes";`・`import { TRAVEL_ART } from "./travel-art";`
- `const ART: Record<ArtKey | "spru_flower", ReactNode> = {` にし、最後（`tower` の次）に `...TRAVEL_ART,` を足す
- `ITEM_LIGHTS` に `liberty: { cx: 12.5, cy: -116, r: 9 },` を足す（自由の女神のたいまつ）

- [ ] **Step 7: テスト・型・lintを走らせる**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: PASS（テスト172件）

- [ ] **Step 8: コミットする**

```bash
git add frontend/src/components/world/art-keys.ts frontend/src/components/world/art-keys.test.ts frontend/src/components/world/iso-shapes.tsx frontend/src/components/world/travel-art.tsx frontend/src/components/world/item-art.tsx
git commit -m "#00147: feature:小さな船・大きな船と、5か国のおみやげ10個(コモドドラゴンの像・ボロブドゥール寺院など)の絵を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 旅のハブ（海の地図・島のカード・出発の場面）

**Files:**
- Create: `frontend/src/components/travel/flag.tsx`、`frontend/src/components/travel/travel-map.tsx`、`frontend/src/components/travel/destination-sheet.tsx`、`frontend/src/components/travel/departure-scene.tsx`、`frontend/src/app/trip/page.tsx`
- Modify: `frontend/src/components/app/bottom-nav.tsx`、`frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Task 3 の `hubLine`・`islandLabel`・`islandTag`・`departurePhase`・`departureStart`・型、Task 4 の `ItemArt`・`ItemIcon`（船・おみやげの絵）
- Produces: `/trip`（ハブ）。`Flag({ src, size })`、`TravelMap({ destinations, line, onSelect })`、`DestinationSheet({ destination, busy, error, onDepart, onGo, onClose })`、`DepartureScene({ destination, reduced, onDone })`

- [ ] **Step 1: 国旗の部品（`flag.tsx`）**

```tsx
import Image from "next/image";

/** 旅の画面の国旗。src は API の flag(設定のファイル名から作ったパス) */
export function Flag({ src, size = 24 }: { src: string; size?: number }) {
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-[3px] border border-white/60 shadow-sm" style={{ width: size, height: Math.round((size * 2) / 3) }}>
      <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
```

- [ ] **Step 2: 海の地図（`travel-map.tsx`）**

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";

import { Flag } from "./flag";
import { islandLabel, islandTag } from "./travel";
import type { Destination } from "./types";

// 地図の座標(viewBox 360×600)。日本の島から上へジグザグに島が並ぶ。6か国目以降は最後の位置の近くに置く
const W = 360;
const H = 600;
const HOME = { x: 70, y: 540 };
const ISLANDS = [
  { x: 262, y: 452 },
  { x: 96, y: 352 },
  { x: 266, y: 250 },
  { x: 98, y: 150 },
  { x: 256, y: 62 },
];

function islandPoint(index: number) {
  return ISLANDS[index] ?? { x: ISLANDS[ISLANDS.length - 1].x, y: ISLANDS[ISLANDS.length - 1].y - (index - ISLANDS.length + 1) * 40 };
}

function Island({ x, y, state, ready }: { x: number; y: number; state: Destination["state"]; ready: boolean }) {
  const later = state === "later";
  return (
    <g opacity={later ? 0.55 : 1}>
      {ready && <ellipse cx={x} cy={y} rx={50} ry={23} fill="#fff6b0" opacity={0.7} className="animate-pulse" />}
      <ellipse cx={x} cy={y + 4} rx={42} ry={18} fill="#3f93c4" opacity={0.35} />
      <ellipse cx={x} cy={y} rx={40} ry={17} fill={later ? "#cfc8b8" : "#f1dfae"} />
      <ellipse cx={x - 4} cy={y - 4} rx={28} ry={11} fill={later ? "#9aa39a" : "#7cc26a"} />
      <path d={`M${x + 12} ${y - 6} q2 -14 -2 -22`} stroke={later ? "#7d857d" : "#8a5a33"} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d={`M${x + 10} ${y - 28} q-9 -2 -14 4 M${x + 10} ${y - 28} q9 -3 13 3 M${x + 10} ${y - 28} q0 -8 6 -10`} stroke={later ? "#9aa39a" : "#3f8f35"} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      {state === "visited" && (
        <g transform={`translate(${x - 26} ${y - 8})`}>
          <circle r={9} fill="#fffaf0" stroke="#d8352a" strokeWidth={2} />
          <path d="M-4 0 l3 3 l5 -6" stroke="#d8352a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/** 旅のハブの海の地図(設計書5-1)。島の文字とボタンはふりがなが付くようHTMLで重ねる */
export function TravelMap({
  destinations,
  line,
  onSelect,
}: {
  destinations: Destination[];
  line: string;
  onSelect: (destination: Destination) => void;
}) {
  const points = [HOME, ...destinations.map((_, index) => islandPoint(index))];
  const visitedCount = destinations.filter((destination) => destination.state === "visited").length;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(20,60,90,0.25)]" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="travel-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5db6e3" />
            <stop offset="1" stopColor="#8fd3f0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#travel-sea)" />
        {[80, 200, 310, 420, 500].map((y, i) => (
          <path key={y} d={`M${20 + (i % 2) * 150} ${y} q10 -5 20 0 q10 5 20 0`} stroke="#ffffff" strokeWidth={2} fill="none" opacity={0.5} strokeLinecap="round" />
        ))}
        {points.slice(1).map((point, index) => {
          const from = points[index];
          const traveled = index < visitedCount;
          return (
            <path
              key={index}
              d={`M${from.x} ${from.y} L${point.x} ${point.y}`}
              stroke="#ffffff"
              strokeWidth={traveled ? 3.5 : 2.5}
              strokeDasharray={traveled ? "2 7" : "4 9"}
              strokeLinecap="round"
              opacity={traveled ? 0.95 : 0.6}
            />
          );
        })}
        <g>
          <ellipse cx={HOME.x} cy={HOME.y + 5} rx={60} ry={25} fill="#3f93c4" opacity={0.35} />
          <ellipse cx={HOME.x} cy={HOME.y} rx={58} ry={24} fill="#f1dfae" />
          <ellipse cx={HOME.x - 6} cy={HOME.y - 5} rx={44} ry={16} fill="#7cc26a" />
          <path d={`M${HOME.x + 40} ${HOME.y - 2} L${HOME.x + 74} ${HOME.y - 14}`} stroke="#8a5a33" strokeWidth={7} strokeLinecap="round" />
          <path d={`M${HOME.x + 40} ${HOME.y - 2} L${HOME.x + 74} ${HOME.y - 14}`} stroke="#c9905a" strokeWidth={3} strokeDasharray="3 3" />
        </g>
        {destinations.map((destination, index) => {
          const point = islandPoint(index);
          return <Island key={destination.key} x={point.x} y={point.y} state={destination.state} ready={destination.ready} />;
        })}
      </svg>

      {destinations.map((destination, index) => {
        const point = islandPoint(index);
        const tag = islandTag(destination);
        return (
          <button
            key={destination.key}
            type="button"
            aria-label={islandLabel(destination)}
            onClick={() => onSelect(destination)}
            className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
            style={{ left: `${(point.x / W) * 100}%`, top: `${((point.y - 20) / H) * 100}%` }}
          >
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-black shadow ${destination.state === "later" ? "bg-white/70 text-[#5b6770]" : "bg-[#fffaf0] text-[#3b3226]"}`}>
              <Flag src={destination.flag} size={20} />
              {destination.name}
            </span>
            {tag && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] leading-none font-black text-white shadow ${
                  destination.gift_ready ? "bg-[#d8352a]" : destination.ready ? "bg-[#3b7f26]" : destination.state === "visited" ? "bg-[#2b6fa3]" : "bg-[#8a7a5a]"
                }`}
              >
                <AutoFurigana text={tag} />
              </span>
            )}
          </button>
        );
      })}

      <div className="absolute" style={{ left: `${((HOME.x - 26) / W) * 100}%`, top: `${((HOME.y - 78) / H) * 100}%` }}>
        <SpruFigure image="wave" standHeight={64} alt="スプル" />
      </div>
      <p
        className="absolute max-w-[62%] rounded-2xl bg-[#fffaf0] px-3 py-2 text-[13px] leading-snug font-bold text-[#3b3226] shadow"
        style={{ left: `${((HOME.x + 26) / W) * 100}%`, top: `${((HOME.y - 72) / H) * 100}%` }}
      >
        <AutoFurigana text={line} />
      </p>
      <p className="absolute bottom-2 left-3 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-black text-[#2b5d7a]">
        <AutoFurigana text="はじまりの町" />
      </p>
    </div>
  );
}
```

- [ ] **Step 3: 島のカード（`destination-sheet.tsx`）**

```tsx
"use client";

import { Check, CircleDashed, Ship } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { ItemIcon } from "@/components/world/item-art";

import { Flag } from "./flag";
import type { Destination } from "./types";

const STATE_TEXT: Record<Destination["state"], string> = { visited: "着いた国", next: "次の行き先", later: "まだ先" };

/** 島を押したときのカード(設計書5-1) */
export function DestinationSheet({
  destination,
  busy,
  error,
  onDepart,
  onGo,
  onClose,
}: {
  destination: Destination;
  busy: boolean;
  error: string | null;
  onDepart: () => void;
  onGo: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(20,40,60,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="destination-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-center gap-2.5">
          <Flag src={destination.flag} size={36} />
          <h2 id="destination-sheet-title" className="text-lg font-black">
            {destination.name}
          </h2>
          <span className="rounded-full bg-[#efe5cf] px-2 py-0.5 text-[11px] font-black text-[#6b5d45]">
            <AutoFurigana text={STATE_TEXT[destination.state]} />
          </span>
        </div>

        {destination.state === "next" && (
          <>
            <h3 className="text-sm font-black text-[#6b5d45]">
              <AutoFurigana text="旅のじゅんび" />
            </h3>
            <ul className="flex flex-col gap-2">
              {destination.checklist.map((row) => (
                <li key={`${row.kind}-${row.label}`} className="flex items-start gap-2 rounded-xl bg-[#f5efe1] px-3 py-2">
                  {row.done ? (
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7f26]" strokeWidth={3} />
                  ) : (
                    <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#8a7a5a]" strokeWidth={2.4} />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-black">
                      <AutoFurigana text={row.label} />
                      <span className="sr-only">{row.done ? "(そろった)" : "(まだ)"}</span>
                    </span>
                    {row.hint && (
                      <span className="text-xs font-bold text-[#8a6a3a]">
                        <AutoFurigana text={row.hint} />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onDepart}
              disabled={!destination.ready || busy}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#2b6fa3] text-base font-black text-white shadow-[0_4px_0_#1d4f76] disabled:bg-[#efe5cf] disabled:text-[#6b5d45] disabled:shadow-none"
            >
              <Ship aria-hidden className="h-5 w-5" />
              <AutoFurigana text={busy ? "出発中..." : "出発する"} />
            </button>
          </>
        )}

        {destination.state === "visited" && (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {destination.souvenirs.map((souvenir) => (
                <li key={souvenir.key} className="flex flex-col items-center gap-1 rounded-xl bg-[#f5efe1] p-2 text-center">
                  <ItemIcon assetKey={souvenir.asset_key} size={52} className={souvenir.met || souvenir.received ? "" : "opacity-40 grayscale"} />
                  <span className="text-xs font-black">{souvenir.name}</span>
                  <span className="text-[11px] font-bold text-[#6b5d45]">
                    <AutoFurigana text={souvenir.received ? "受け取りずみ" : souvenir.met ? "受け取れるよ！" : `${souvenir.condition_label}しよう`} />
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onGo}
              className="h-[52px] rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
            >
              <AutoFurigana text="行く" />
            </button>
          </>
        )}

        {destination.state === "later" && (
          <p className="rounded-xl bg-[#f5efe1] px-3 py-3 text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="前の国へ行ってからね" />
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-[#c2402c]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 出発の場面（`departure-scene.tsx`）と、船の動き（`globals.css`）**

```tsx
"use client";

import { useEffect, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { OutingImage } from "@/components/spru/outing-image";
import { ItemArt } from "@/components/world/item-art";

import { departurePhase, departureStart, type DeparturePhase } from "./travel";
import type { Destination } from "./types";

/** 初めての国へ出発する場面(設計書5-2)。reduced は操作のときに調べて渡し、onDone は useCallback で固定して渡す */
export function DepartureScene({ destination, reduced, onDone }: { destination: Destination; reduced: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<DeparturePhase>(() => departurePhase(departureStart(reduced)));

  useEffect(() => {
    const start = Date.now() - departureStart(reduced);
    const timer = setInterval(() => {
      const next = departurePhase(Date.now() - start);
      if (next === "done") {
        clearInterval(timer);
        onDone();
        return;
      }
      setPhase(next);
    }, 100);
    return () => clearInterval(timer);
  }, [reduced, onDone]);

  const caption =
    phase === "walk" ? "桟橋から出発！" : phase === "sail" ? `${destination.name}へ船で向かっているよ` : `${destination.name}に着いた！`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${destination.name}へ出発`}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-linear-to-b from-[#bfe8f7] to-[#4fa9d8]"
    >
      <button
        type="button"
        onClick={onDone}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/85 px-4 py-2 text-sm font-black text-[#2b5d7a] shadow"
      >
        とばす
      </button>
      <p aria-live="polite" className="sr-only">
        {caption}
      </p>

      {phase === "walk" && (
        <div className="flex flex-col items-center">
          <OutingImage image="back" height={150} className="animate-outing-walk-away" />
          <svg viewBox="0 0 200 40" width={220} aria-hidden>
            <path d="M40 30 L160 10" stroke="#8a5a33" strokeWidth={14} strokeLinecap="round" />
            <path d="M40 30 L160 10" stroke="#c9905a" strokeWidth={6} strokeDasharray="6 5" />
          </svg>
        </div>
      )}

      {phase === "sail" && (
        <div className="relative flex h-40 w-full items-center">
          <svg viewBox="-40 -60 80 70" width={160} aria-hidden className="animate-boat-sail absolute left-1/2 -ml-20">
            <ItemArt assetKey="boat_small" />
          </svg>
          <svg viewBox="0 0 400 20" className="absolute bottom-6 w-full" preserveAspectRatio="none" aria-hidden>
            <path d="M0 10 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#ffffff" strokeWidth={3} fill="none" opacity={0.7} />
          </svg>
        </div>
      )}

      {phase === "arrive" && (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <OutingImage image="run" height={160} className="animate-outing-run-in" />
          <h2 className="text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            <AutoFurigana text={`${destination.name}に着いた！`} />
          </h2>
          <p className="rounded-full bg-white/85 px-4 py-1.5 text-base font-black text-[#2b5d7a]">
            {destination.greeting.text}
            <span className="ml-2 text-xs text-[#6b5d45]">({destination.greeting.reading})</span>
          </p>
        </div>
      )}
    </div>
  );
}
```

`frontend/src/app/globals.css` の `.animate-outing-walk-away { ... }` の次に足す:

```css
  @keyframes boat-sail {
    0% {
      transform: translateX(-60vw);
    }
    100% {
      transform: translateX(60vw);
    }
  }
  .animate-boat-sail {
    animation: boat-sail 1.6s ease-in-out both;
  }
```

同じファイルの動きを減らす設定の一覧（`.animate-outing-walk-away,` の次）に `.animate-boat-sail,` を足す。

- [ ] **Step 5: ハブの画面（`app/trip/page.tsx`）とナビ**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { DepartureScene } from "@/components/travel/departure-scene";
import { DestinationSheet } from "@/components/travel/destination-sheet";
import { hubLine } from "@/components/travel/travel";
import { TravelMap } from "@/components/travel/travel-map";
import type { DepartResult, Destination, TravelData } from "@/components/travel/types";
import { apiFetch } from "@/lib/api";
import { prefersReducedMotion } from "@/lib/motion";

/** 旅のハブ(設計書5-1)。「旅する」タブ */
export default function Page() {
  const router = useRouter();
  const [travel, setTravel] = useState<TravelData | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departing, setDeparting] = useState<{ destination: Destination; reduced: boolean } | null>(null);

  useEffect(() => {
    apiFetch("/api/travel")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 422) {
          router.replace("/profiles");
          return;
        }
        if (res.ok) setTravel(await res.json());
      })
      .catch(() => null);
  }, [router]);

  const open = travel?.destinations.find((destination) => destination.key === openKey) ?? null;
  const departingKey = departing?.destination.key ?? null;
  const handleArrived = useCallback(() => {
    if (departingKey) router.push(`/trip/${departingKey}`);
  }, [departingKey, router]);

  async function depart(destination: Destination) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/travel/${destination.key}/depart`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message ?? "出発できませんでした。");
        return;
      }
      const result = body as DepartResult;
      setOpenKey(null);
      if (result.first) setDeparting({ destination: result.destination, reduced: prefersReducedMotion() });
      else router.push(`/trip/${destination.key}`);
    } catch {
      setError("通信に失敗しました。もう一度ためしてね。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#8fd3f0]">
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3 px-4 pt-4 pb-28">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
            <AutoFurigana text="旅する" />
          </h1>
          <Link href="/passport" className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow">
            パスポート
          </Link>
        </div>
        {!travel ? (
          <p className="text-sm text-white">読み込み中...</p>
        ) : (
          <TravelMap
            destinations={travel.destinations}
            line={hubLine(travel.destinations)}
            onSelect={(destination) => {
              setError(null);
              setOpenKey(destination.key);
            }}
          />
        )}
      </main>

      {open && (
        <DestinationSheet
          destination={open}
          busy={busy}
          error={error}
          onDepart={() => depart(open)}
          onGo={() => router.push(`/trip/${open.key}`)}
          onClose={() => setOpenKey(null)}
        />
      )}
      {departing && <DepartureScene destination={departing.destination} reduced={departing.reduced} onDone={handleArrived} />}
      <BottomNav />
    </div>
  );
}
```

`frontend/src/components/app/bottom-nav.tsx` の「旅する」の `href: "/passport",` を `href: "/trip",` にする。

- [ ] **Step 6: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト172件）

- [ ] **Step 7: 画面で確かめる（390px）**

開発サーバー（ポート3000）で `test@example.com` にログインし、プロフィール「町テスト」で `/trip` を開く。5つの島・点線の航路・スプルのひとこと（「次はインドネシア！あと6レベルだね」）が出て、インドネシアを押すとじゅんびリストとヒントが出て、［出発する］が押せないこと。スクリーンショットは確認後に消す。

- [ ] **Step 8: コミットする**

```bash
git add frontend/src/components/travel/flag.tsx frontend/src/components/travel/travel-map.tsx frontend/src/components/travel/destination-sheet.tsx frontend/src/components/travel/departure-scene.tsx frontend/src/app/trip/page.tsx frontend/src/components/app/bottom-nav.tsx frontend/src/app/globals.css
git commit -m "#00148: feature:「旅する」タブを旅のハブ(海の地図・島のカードと旅のじゅんび・出発の場面)に作り替える

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 旅先の国の画面と、ショップ・バッグの札

**Files:**
- Create: `frontend/src/components/travel/souvenir-stand.tsx`、`frontend/src/app/trip/[key]/page.tsx`
- Modify: `frontend/src/app/shop/page.tsx`、`frontend/src/app/bag/page.tsx`

**Interfaces:**
- Consumes: Task 3 の `pickBeginnerGroup`・型、Task 5 の `Flag`、既存の `StagePath`・`ItemIcon`・`SpruFigure`
- Produces: `/trip/[key]`。`SouvenirStand({ destination, busyKey, message, onReceive })`

- [ ] **Step 1: おみやげ屋さん（`souvenir-stand.tsx`）**

```tsx
"use client";

import Link from "next/link";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";
import { ItemIcon } from "@/components/world/item-art";

import type { Destination, TravelSouvenir } from "./types";

/** 旅先の国のおみやげ屋さん(設計書5-3) */
export function SouvenirStand({
  destination,
  busyKey,
  message,
  onReceive,
}: {
  destination: Destination;
  busyKey: string | null;
  message: { text: string; ok: boolean } | null;
  onReceive: (souvenir: TravelSouvenir) => void;
}) {
  return (
    <section aria-labelledby="souvenir-stand-title" className="flex flex-col gap-3 rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg">
      <h2 id="souvenir-stand-title" className="text-base font-black">
        <AutoFurigana text="おみやげ屋さん" />
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {destination.souvenirs.map((souvenir) => (
          <li key={souvenir.key} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#f5efe1] p-3 text-center">
            <div className="relative">
              <ItemIcon assetKey={souvenir.asset_key} size={76} className={souvenir.met || souvenir.received ? "" : "opacity-40 grayscale"} />
              {souvenir.footprint > 1 && (
                <span className="absolute -top-1 -left-3 rounded-full bg-[#3b7f26] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                  2×2マス
                </span>
              )}
            </div>
            <p className="text-sm font-black">{souvenir.name}</p>
            {souvenir.received ? (
              <p className="text-xs font-black text-[#3b7f26]">
                <AutoFurigana text="受け取りずみ" />
              </p>
            ) : souvenir.met ? (
              <button
                type="button"
                onClick={() => onReceive(souvenir)}
                disabled={busyKey !== null}
                className="h-9 w-full rounded-xl bg-[#d8352a] text-[13px] font-black text-white shadow-[0_3px_0_#9e2219] disabled:opacity-60"
              >
                <AutoFurigana text={busyKey === souvenir.key ? "受け取り中..." : "受け取る"} />
              </button>
            ) : (
              <p className="text-xs font-bold text-[#6b5d45]">
                <AutoFurigana text={`${souvenir.condition_label}しよう`} />
              </p>
            )}
          </li>
        ))}
      </ul>
      {message && (
        <div role="status" className="flex items-center gap-2 rounded-2xl bg-[#f5efe1] p-2">
          {message.ok && <SpruFigure image="happy" standHeight={56} alt="よろこぶスプル" />}
          <p className={`text-sm font-bold ${message.ok ? "text-[#3b3226]" : "text-[#c2402c]"}`}>
            <AutoFurigana text={message.text} />
            {message.ok && (
              <Link href="/bag" className="ml-2 font-black text-[#2b6fa3] underline">
                バッグを見る
              </Link>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: 旅先の国の画面（`app/trip/[key]/page.tsx`）**

```tsx
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { SceneBackground } from "@/components/app/scene-background";
import { StagePath, type StagePathNode } from "@/components/app/stage-path";
import { SpruFigure } from "@/components/spru/spru-figure";
import { Flag } from "@/components/travel/flag";
import { SouvenirStand } from "@/components/travel/souvenir-stand";
import { pickBeginnerGroup } from "@/components/travel/travel";
import type { Destination, ReceiveResult, TravelSouvenir } from "@/components/travel/types";
import { apiFetch } from "@/lib/api";

type CountryGroups = {
  groups: { category: { id: number; name: string; is_language_mode: boolean }; difficulty: string; locked: boolean; stages: StagePathNode[] }[];
};

/** 旅先の国の画面(設計書5-3)。まだ着いていない国・知らない国は旅のハブへ戻す */
export default function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [country, setCountry] = useState<CountryGroups | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/travel/${key}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          router.replace("/trip");
          return;
        }
        const data: Destination = await res.json();
        if (!active) return;
        setDestination(data);
        if (data.country_id === null) return;
        const countryRes = await apiFetch(`/api/countries/${data.country_id}`);
        if (active && countryRes.ok) setCountry(await countryRes.json());
      })
      .catch(() => {
        if (active) router.replace("/trip");
      });
    return () => {
      active = false;
    };
  }, [key, router]);

  async function receive(souvenir: TravelSouvenir) {
    setBusyKey(souvenir.key);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/travel/${key}/souvenirs/${souvenir.key}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ text: body?.message ?? "受け取れませんでした。", ok: false });
        return;
      }
      setDestination((body as ReceiveResult).destination);
      setMessage({ text: "バッグに入れたよ。町に置いてみよう！", ok: true });
    } catch {
      setMessage({ text: "通信に失敗しました。もう一度ためしてね。", ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  if (!destination) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  }

  const group = country ? pickBeginnerGroup(country.groups) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <SceneBackground />
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-4 pb-28">
        <Link href="/trip" className="self-start rounded-full bg-white/85 px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow">
          <AutoFurigana text="旅の地図へ戻る" />
        </Link>

        <section className="flex items-center gap-3 rounded-3xl bg-[#fffaf0] p-4 text-[#3b3226] shadow-lg">
          <SpruFigure image="happy" standHeight={88} alt="よろこぶスプル" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <Flag src={destination.flag} size={32} />
              {destination.name}
            </h1>
            <p className="text-lg font-black text-[#2b6fa3]">{destination.greeting.text}</p>
            <p className="text-xs font-bold text-[#6b5d45]">
              <AutoFurigana text={`「${destination.greeting.reading}」は、${destination.name}のことばで「ようこそ」`} />
            </p>
          </div>
        </section>

        <SouvenirStand destination={destination} busyKey={busyKey} message={message} onReceive={receive} />

        <section aria-labelledby="trip-stages-title" className="flex flex-col gap-2">
          <h2 id="trip-stages-title" className="text-sm font-black text-white drop-shadow">
            <AutoFurigana text={`${destination.name}で学ぶ(初級)`} />
          </h2>
          {group ? (
            <StagePath stages={group.stages} onSelect={(stage) => router.push(`/quiz/${stage.id}`)} />
          ) : (
            <p className="text-sm text-white/85">
              <AutoFurigana text={country || destination.country_id === null ? "まだこの国のステージがありません。" : "読み込み中..."} />
            </p>
          )}
          {destination.country_id !== null && (
            <Link
              href={`/travel/${destination.country_id}`}
              className="self-center rounded-full bg-white/85 px-4 py-2 text-sm font-black text-[#2b5d7a] shadow"
            >
              <AutoFurigana text="もっと学ぶ(中級・上級)" />
            </Link>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: ショップとバッグの札**

`frontend/src/app/shop/page.tsx` の「2×2マス」の `span` の閉じ `)}` の次に足す:

```tsx
                      {item.travel_gear && (
                        <span className="absolute top-1 right-1 rounded-full bg-[#2b6fa3] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">
                          旅じたく
                        </span>
                      )}
```

`frontend/src/app/bag/page.tsx` の「2×2マス」の `span` の閉じ `)}` の次に足す:

```tsx
                  {item.souvenir && (
                    <span className="absolute -top-1 -right-4 rounded-full bg-[#d8352a] px-1.5 py-0.5 text-[10px] leading-none font-black whitespace-nowrap text-white">
                      おみやげ
                    </span>
                  )}
```

- [ ] **Step 4: 型・lint・テストを走らせる**

Run: `cd frontend && npm run typecheck && npm run lint && npm test`
Expected: PASS（テスト172件）

- [ ] **Step 5: コミットする**

```bash
git add frontend/src/components/travel/souvenir-stand.tsx "frontend/src/app/trip/[key]/page.tsx" frontend/src/app/shop/page.tsx frontend/src/app/bag/page.tsx
git commit -m "#00149: feature:旅先の国の画面(ようこそ・おみやげ屋さん・初級のステージの入口)と、ショップの「旅じたく」・バッグの「おみやげ」の札を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ブラウザでの確認と、SPEC・TASKS の更新

**Files:**
- Modify: `SPEC.md`、`TASKS.md`

- [ ] **Step 1: 開発DBを更新する**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan db:seed --class=WorldItemSeeder`
Expected: テーブル2つが作られ、小さな船・大きな船が品ぞろえに入る（`migrate:fresh` は使わない）

- [ ] **Step 2: ブラウザで確かめる（Playwright、390px と 1280px）**

プロフィール「町テスト」（id 7）で確かめ、確認のために変えた記録は最後に元へ戻す（レベル1・XP 20・ポイント75、`profile_trips`・`profile_souvenirs` の行と、確認用に足したアイテム・クリアの記録を消す）。

1. `/trip`: Lv.1で5つの島・航路・スプルのひとこと。インドネシアのカードにじゅんびリストとヒント、［出発する］は押せない。ボトムナビの「旅する」が選ばれている
2. `tinker` でLv.7にして小さな船をバッグに入れる → 島が「出発できる」、スプルが「じゅんびができたよ！」。町のスプルを押すと「旅のじゅんびがそろったよ！」
3. ［出発する］→ 出発の場面（後ろ姿 → 船 → 着いた）→ `/trip/id` へ移る。ハブを開き直すと着いた国のスタンプ。もう一度［行く］で場面なしに国の画面へ
4. 国の画面: 「Selamat datang!」、おみやげ屋さん（条件の文）、初級のステージの道、［もっと学ぶ］で `/travel/7`
5. `tinker` でインドネシアの初級のふつうのステージと初級のボスをクリアしたことにする → ［受け取る］で2つ受け取れ、バッグに「おみやげ」の札付きで入る。ボロブドゥール寺院（2×2）を町に置ける
6. ショップの小さな船・自転車・お城・タワー・大きな船に「旅じたく」の札
7. まだ着いていない `/trip/kr` を開くと `/trip` へ戻る
8. ふりがなを付けたとき・動きを減らす設定のとき（出発の場面は着いた場面だけ）
9. 1280pxでも地図・カード・国の画面が崩れない

- [ ] **Step 3: `SPEC.md` を更新する**

- 16行目の②を「②レベルによる土地の解放と旅（E回で街づくり〈広がる地図・雲の区画・大きな建物〉、F回で旅とおみやげ〈旅のハブ・旅のじゅんび・国ごとのおみやげ〉を実装済み）」にする
- 17行目の「F: 旅とおみやげ）」を「F: 旅とおみやげ（実装済み、`docs/design/2026-09-27-spru-wave-f-design.md`））」にする
- 90行目の「「旅する」は当面パスポートを表示し、②のF回で旅のハブに作り替える」を「「旅する」はF回で旅のハブ（`/trip`）に作り替えた（パスポートはハブの右上から開く）」にする
- 4-9の最後（E回の行の後）に足す:

```markdown
- ✅（2026-09-27、F回）旅のハブ: 「旅する」タブ（`/trip`）に海の地図と5つの島（インドネシア → 韓国 → アメリカ → イギリス → フランスの1本道）。次の行き先の「旅のじゅんび」（レベル・町のアイテム・前の国の2個目のおみやげ）がそろうと出発でき、初めての国では出発の場面（リュックのスプルが桟橋から船で渡る）が出る。行き先・条件・おみやげは `config/travel.php`、着いた国は `profile_trips`（`app/Support/Travel.php`、`GET /api/travel`・`POST /api/travel/{key}/depart`）。学ぶタブの国選びは今のまま全部開いている
- ✅（F回）旅先の国の画面（`/trip/[key]`）: その国のことばの「ようこそ」、おみやげ屋さん、初級のステージの入口と［もっと学ぶ（中級・上級）］
- ✅（F回）おみやげ: 国ごとに2つ（1個目＝その国のステージを1つクリア・1マス、2個目＝その国の初級のボスをクリア・2×2の名所のミニチュア）。着いた国で受け取るとバッグに入る非売品の町のアイテム（`profile_souvenirs`、`POST /api/travel/{key}/souvenirs/{souvenir}`）。学ぶタブで先にクリアしていても数える。あわせて旅じたくの小さな船（Lv.7）・大きな船（Lv.11）を足し、町のアイテムは18種類。ショップに「旅じたく」、バッグに「おみやげ」の札。町のスプルは旅のじゅんびがそろうと知らせる
```

- 205行目の「❌ 新しい国への旅とおみやげ（F回、方針は …9章）、町以外の画面の配色統一は未着手」を「❌ 町以外の画面の配色統一は未着手（`TASKS.md`参照）」にする
- 6-1のフロントのテスト件数を実際の件数（172件の見込み）にする

- [ ] **Step 4: `TASKS.md` を更新する**

21行目のF回の行を `- [x] **F回: 旅とおみやげ（「旅する」タブを旅のハブに・旅先の国の画面・「旅のじゅんび」リスト・国ごとのおみやげ10個・小さな船と大きな船）**（2026-09-27。設計書 `docs/design/2026-09-27-spru-wave-f-design.md`、実装計画 `docs/design/2026-09-27-spru-wave-f-plan.md`）` にする。

- [ ] **Step 5: 全体のテストを走らせてコミットする**

Run: `./vendor/bin/sail artisan test --compact && cd frontend && npm test && npm run typecheck && npm run lint`
Expected: PASS（バックエンド320件・フロント172件）

```bash
git add SPEC.md TASKS.md
git commit -m "#00150: docs:スプルのF回(旅とおみやげ)をSPEC/TASKSに反映する

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
