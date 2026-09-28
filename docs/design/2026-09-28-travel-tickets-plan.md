# 国の進め方をチケットで好きな国へ行く形にする 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本から始めて、クイズで手に入れたチケットで好きな国へ行く形にし、学ぶタブも着いた国だけ学べるようにする（下のメニューは「まち」「せかい」に改名）。

**Architecture:** 旅のルールは `app/Support/Travel.php` にまとめる。チケットは表を作らず、クリアの記録（`profile_stage_progress`）と着いた国（`profile_trips`）から毎回数える（A案）。鍵の判定（`Travel::lockedCountryIds`・`abortIfLocked`）を国・地域・ステージのAPIに入れ、画面は API が返す `locked`・`tickets`・`can_depart`・`ticket_earned` を見て出し分ける。

**Tech Stack:** Laravel 13（Sail）+ Pest、Next.js 16 + React 19 + TypeScript + Tailwind v4、Vitest、lucide-react

**Spec:** `docs/design/2026-09-28-travel-tickets-design.md`

## Global Constraints

- ブランチは `feature/travel-tickets`。コミットは `#NNNNN: type:要約`（日本語）で、この計画のコミットは #00203、タスクは #00204 から順に。本文の最後に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`（`git commit -m "..." -m "Co-Authored-By: ..."` の形で書く）
- はじまりの国は日本（`config/travel.php` の `home`、国コード `jp`）。旅の行き先は今の5か国（インドネシア・韓国・アメリカ・イギリス・フランス）のまま
- 乗り物: 韓国・インドネシアは `ship`、アメリカ・イギリス・フランスは `plane`
- チケット: 学べる国（日本と着いた国）で初級のボスを初めて倒すと1か国1枚。持っている数 ＝ max(0, もらった数 − 着いた国の数)。まだの国が残っていなければ 0
- チケットはコインでは買えない（ショップに出さない）
- 鍵の国 ＝ 旅の行き先のうち、まだ着いていない国。行き先でない国（テスト用のイタリア）と国のないステージには鍵をかけない
- 鍵の国を開こうとしたときのサーバーの返事は 403「まだこの国に着いていません。」、チケットなしで出発しようとしたときは 422「チケットがありません。」
- 下のメニュー: 学ぶ・せかい・まち（真ん中）・ショップ・じぶん。URL（`/trip`・`/`）は変えない
- 有料の素材は使わない。飛行機・チケットは仮の絵（SVG・lucide の `Ticket`）で、Ownerのスプル入りの絵が届いたら差し替える
- バックエンドのテストは `./vendor/bin/sail test`（`--parallel` は付けない。テスト用DBの権限で失敗する）。出力はJSON で、結果は `{"tool":"pest","result":...}` の行
- 開発用データベースは非破壊の `migrate` だけ（`migrate:fresh` はしない）
- 画面の文字・コメント・ドキュメントは日本語

## Review Focus

- 出発ボタンの連打・2か国へ続けて出発（チケット1枚）→ 1か国だけ着き、2つ目は 422「チケットがありません。」。Task 1 のテスト「チケット1枚で2か国には行けない」で確かめる（同時の連打は今と同じプロフィールのロックで防ぐ）
- 今のデータの記録で、着いた国の数がもらった数より多いプレイヤー → チケットは 0 で止まり、ボスを倒しても「チケットを手に入れた」は出ない。Task 1 のテスト「0より少なくならない」と Task 2 のテスト「チケットが0のままなら ticket_earned は false」で確かめる
- 5か国ぜんぶ着いたプレイヤー → チケットの札を出さず、スプルはほめる。ボスを倒しても知らせない。Task 1 のテスト「ぜんぶ着いたら0」、Task 2 のテスト「ぜんぶ着いたあとは false」、Task 5 の `hubLine` のテストで確かめる
- 2か国が共有する「英語を学ぶ」（アメリカ・イギリス）をミニアプリから開く → 着いた国のステージだけが出る。Task 2 のテスト「ミニアプリの一覧から鍵の国のステージを外す」で確かめる
- 家族のだれかだけが着いた国 → ほかのプレイヤーには鍵のまま（プロフィールを切り替えると鍵が変わる）。Task 2 のテスト「ほかのプロフィールが着いた国は鍵のまま」で確かめる

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `config/travel.php`（変更） | `home` を足し、行き先の `min_level`・`items` を消して `transport` を足す |
| `app/Support/Travel.php`（作り直し） | 旅のルール: 行き先の一覧・チケット・鍵・出発・おみやげ・旅した国・今のデータの記録 |
| `routes/api.php`（変更） | 旅・国・地域・ステージ・ミニアプリ・まち・ショップ・パスポートのAPI |
| `database/migrations/2026_09_28_000002_record_trips_for_cleared_countries.php`（新規） | 今のデータの記録 |
| `tests/Feature/TravelTest.php`（書き直し） | 旅の一覧・チケットの数 |
| `tests/Feature/TravelActionsTest.php`（書き直し） | 出発・おみやげ・まち・ショップ |
| `tests/Feature/TravelLockTest.php`（新規） | 学ぶの鍵・`ticket_earned` |
| `tests/Feature/TravelRecordTest.php`（新規） | 今のデータの記録・パスポートの旅した国 |
| `tests/Feature/CountriesIndexTest.php`（書き直し） | 国の一覧 |
| `frontend/src/components/world/art-keys.test.ts`（変更） | 旅じたくのテストを乗り物のテストに替える |
| `frontend/src/components/app/nav-items.ts`＋テスト（変更） | メニューの名前 |
| `frontend/src/components/app/bottom-nav.tsx`（変更） | メニューのアイコン |
| `frontend/src/components/spru/hint.ts`＋テスト（変更） | まちのスプルのひとこと |
| `frontend/src/components/world/types.ts`・`world-screen.tsx`・`app/shop/page.tsx`（変更） | `tickets`・旅じたくの札をやめる |
| `frontend/src/components/travel/types.ts`・`travel.ts`＋テスト（変更） | せかいの型・ひとこと・札・文 |
| `frontend/src/components/travel/travel-map.tsx`・`destination-sheet.tsx`・`departure-scene.tsx`（変更） | せかいの地図・カード・出発の場面 |
| `frontend/src/components/travel/plane-art.tsx`（新規） | 仮の飛行機の絵 |
| `frontend/src/app/globals.css`（変更） | 飛行機が飛ぶ動き |
| `frontend/src/lib/furigana-dictionary.json`（変更）＋ `auto-furigana.test.ts` | 新しい言葉の読み |
| `frontend/src/app/trip/page.tsx`（変更） | せかいの画面（題名・チケットの札） |
| `frontend/src/components/travel/locked-country.tsx`（新規） | 鍵の国の案内（画面とカード） |
| `frontend/src/components/travel/ticket-earned-card.tsx`（新規） | 「チケットを手に入れた！」のカード |
| `frontend/src/app/learn/page.tsx`（変更） | 学ぶタブの鍵 |
| `frontend/src/app/travel/[countryId]/page.tsx`・`start/page.tsx`・`region/[regionId]/page.tsx`・`app/quiz/[stageId]/page.tsx`（変更） | 403 のときの案内・チケットのカード |
| `frontend/src/app/passport/page.tsx`（変更） | 旅した国 |
| `SPEC.md`・`TASKS.md`（変更） | ドキュメント |

---

### Task 1: 旅のルールをチケットにする（サーバー）

**Files:**
- Modify: `config/travel.php`
- Rewrite: `app/Support/Travel.php`
- Modify: `routes/api.php`（`/api/travel` の一覧・`/api/world`・`/api/shop`）
- Rewrite: `tests/Feature/TravelTest.php`、`tests/Feature/TravelActionsTest.php`
- Modify: `frontend/src/components/world/art-keys.test.ts`

**Interfaces:**
- Produces（Task 2・3 が使う）:
  - `Travel::destinations(): array`、`Travel::indexOf(string): ?int`
  - `Travel::countryCodes(): list<string>`（小文字。日本が先頭、そのあと行き先の順）
  - `Travel::lockedCountryIds(?UserProfile): list<int>`
  - `Travel::abortIfLocked(?UserProfile, ?int $countryId): void`（403「まだこの国に着いていません。」）
  - `Travel::earnedTickets(UserProfile): int`（0で止めない）
  - `Travel::tickets(UserProfile): int`
  - `Travel::overview(UserProfile): array{tickets: int, ticket_hint: ?string, destinations: list<array>}`
  - `Travel::state(UserProfile): list<array>`、`Travel::depart(...)`、`Travel::receive(...)`
  - 行き先の形: `key, name, country_id, code, flag, transport('ship'|'plane'), state('visited'|'unvisited'), can_depart, souvenirs, souvenir_count, gift_ready, greeting`
  - `GET /api/travel` → `{ level, tickets, ticket_hint, destinations }`、`GET /api/world` の `tickets: int`、`GET /api/shop` から `travel_gear` を消す

- [ ] **Step 1: 旅の一覧・チケットのテストを書き直す（`tests/Feature/TravelTest.php` をまるごと置き換える）**

```php
<?php

use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| せかい(旅)の一覧とチケット(docs/design/2026-09-28-travel-tickets-design.md 3章・4-3)
|--------------------------------------------------------------------------
|
| 日本(はじまりの国)と着いた国で初級のボスを初めて倒すと、1か国1枚チケットがもらえる。
| 1枚で、まだの国へ1つ行ける。チケットは記録から数える(もらった数 − 着いた国の数、0で止める)。
|
*/

function arriveAt(UserProfile $profile, string $key): void
{
    $profile->trips()->create(['destination' => $key, 'arrived_at' => now()]);
}

it('行き先が5つ設定の順に返り、はじめはどれもまだの国で、チケットは0', function () {
    createActiveProfile();

    $response = $this->getJson('/api/travel')->assertOk();

    $destinations = collect($response->json('destinations'));
    expect($destinations->pluck('key')->all())->toBe(['id', 'kr', 'us', 'gb', 'fr']);
    expect($destinations->pluck('state')->unique()->all())->toBe(['unvisited']);
    expect($destinations->pluck('can_depart')->unique()->all())->toBe([false]);
    $response->assertJsonPath('level', 1)
        ->assertJsonPath('tickets', 0)
        ->assertJsonPath('destinations.0.name', 'インドネシア')
        ->assertJsonMissingPath('destinations.0.checklist')
        ->assertJsonMissingPath('destinations.0.min_level');
});

it('乗り物は、韓国・インドネシアが船、アメリカ・イギリス・フランスが飛行機', function () {
    createActiveProfile();

    $destinations = collect($this->getJson('/api/travel')->assertOk()->json('destinations'))->pluck('transport', 'key');

    expect($destinations->all())->toBe(['id' => 'ship', 'kr' => 'ship', 'us' => 'plane', 'gb' => 'plane', 'fr' => 'plane']);
});

it('日本の初級のボスを倒すとチケットが1枚になり、どのまだの国へも行ける', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');

    clearCountryStage($profile, $japan, '初級', true);

    $response = $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 1);
    expect(collect($response->json('destinations'))->pluck('can_depart')->unique()->all())->toBe([true]);
});

it('初級のふつうのステージ・中級のボスではチケットはもらえない', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');

    clearCountryStage($profile, $japan, '初級', false);
    clearCountryStage($profile, $japan, '中級', true);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 0);
});

it('同じ国で初級のボスを2つ倒しても、チケットは1枚', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $secondBoss = \App\Models\Stage::create([
        'category_id' => \App\Models\Category::create(['name' => '日本の世界遺産'])->id,
        'country_id' => $japan->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'is_boss' => true,
    ]);

    clearCountryStage($profile, $japan, '初級', true);
    \App\Models\ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $secondBoss->id, 'cleared_at' => now()]);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 1);
});

it('着いた国の初級のボスを倒すと、もう1枚もらえる。まだの国のボスは数えない', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $us = createTravelCountry('us', 'アメリカ');
    $korea = createTravelCountry('KR', '韓国');
    clearCountryStage($profile, $japan, '初級', true);
    arriveAt($profile, 'us');
    clearCountryStage($profile, $korea, '初級', true);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 0);

    clearCountryStage($profile, $us, '初級', true);

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 1);
});

it('チケットは0より少なくならない(着いた国がもらった数より多いとき)', function () {
    $profile = createActiveProfile();
    arriveAt($profile, 'us');
    arriveAt($profile, 'gb');

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 0);
});

it('5か国ぜんぶ着いたら、チケットは0', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    clearCountryStage($profile, $japan, '初級', true);
    foreach (['id', 'kr', 'us', 'gb', 'fr'] as $key) {
        $country = createTravelCountry($key, $key);
        arriveAt($profile, $key);
        clearCountryStage($profile, $country, '初級', true);
    }

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 0);
});

it('ticket_hint は、学べる国のうち初級のボスをまだ倒していない最初の国', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    createTravelCountry('us', 'アメリカ');

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('ticket_hint', '日本');

    clearCountryStage($profile, $japan, '初級', true);
    arriveAt($profile, 'us');

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('ticket_hint', 'アメリカ');
});

it('まだの国はおみやげの名前を返さず、数だけ返す', function () {
    createActiveProfile();

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.souvenirs', [])
        ->assertJsonPath('destinations.0.souvenir_count', 2)
        ->assertJsonPath('destinations.0.gift_ready', false);
});

it('着いた国のおみやげの一覧に条件と絵と大きさが付き、条件を満たすと gift_ready になる', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    arriveAt($profile, 'id');

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('destinations.0.state', 'visited')
        ->assertJsonPath('destinations.0.can_depart', false)
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

it('ほかのプロフィールの記録は数えない', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $sibling = createFamilyMember($profile);
    arriveAt($sibling, 'id');
    clearCountryStage($sibling, $japan, '初級', true);

    $this->getJson('/api/travel')->assertOk()
        ->assertJsonPath('tickets', 0)
        ->assertJsonPath('destinations.0.state', 'unvisited');
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

it('設定: はじまりの国は日本。2個目のおみやげは2×2、1個目は1マスで、おみやげはショップの絵に入れない', function () {
    $footprints = config('world.asset_footprints');
    $assetKeys = config('world.asset_keys');

    expect(config('travel.home'))->toBe(['key' => 'jp', 'name' => '日本', 'country_code' => 'jp']);
    foreach (config('travel.destinations') as $destination) {
        expect($destination)->not->toHaveKeys(['min_level', 'items']);
        expect($destination['transport'])->toBeIn(['ship', 'plane']);
        foreach ($destination['souvenirs'] as $souvenir) {
            expect($footprints[$souvenir['key']] ?? 1)->toBe($souvenir['condition'] === 'boss' ? 2 : 1);
            expect($assetKeys)->not->toContain($souvenir['key']);
        }
    }
});
```

- [ ] **Step 2: 出発・おみやげ・まち・ショップのテストを書き直す（`tests/Feature/TravelActionsTest.php` をまるごと置き換える）**

```php
<?php

use App\Models\ShopItem;
use App\Models\UserProfile;
use Database\Seeders\WorldItemSeeder;

/*
|--------------------------------------------------------------------------
| 出発とおみやげの受け取り(docs/design/2026-09-28-travel-tickets-design.md 3-2・4-3)
|--------------------------------------------------------------------------
|
| まだの国へはチケットを1枚使って出発する。着いた国へはチケットなしで何度でも行ける。
| 出発もおみやげの受け取りも、プロフィールをロックしてから行い、一意の制約でも二重にならないようにする。
|
*/

/** 日本の初級のボスを倒して、チケットを1枚持たせる */
function giveFirstTicket(UserProfile $profile): void
{
    clearCountryStage($profile, createTravelCountry('jp', '日本'), '初級', true);
}

it('チケットがないと出発できない', function () {
    createActiveProfile();

    $this->postJson('/api/travel/us/depart')
        ->assertStatus(422)
        ->assertJsonPath('message', 'チケットがありません。');
});

it('チケットがあれば好きな国へ出発でき、チケットが1枚減る', function () {
    $profile = createActiveProfile();
    giveFirstTicket($profile);

    $this->postJson('/api/travel/us/depart')->assertOk()
        ->assertJsonPath('first', true)
        ->assertJsonPath('destination.key', 'us')
        ->assertJsonPath('destination.state', 'visited');

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 0);
    expect($profile->trips()->pluck('destination')->all())->toBe(['us']);
});

it('チケット1枚で2か国には行けない', function () {
    $profile = createActiveProfile();
    giveFirstTicket($profile);

    $this->postJson('/api/travel/us/depart')->assertOk();
    $this->postJson('/api/travel/gb/depart')
        ->assertStatus(422)
        ->assertJsonPath('message', 'チケットがありません。');

    expect($profile->trips()->count())->toBe(1);
});

it('着いた国への2回目は first が false で、チケットを使わず、記録は1つのまま', function () {
    $profile = createActiveProfile();
    giveFirstTicket($profile);
    $this->postJson('/api/travel/us/depart')->assertOk();

    $this->postJson('/api/travel/us/depart')->assertOk()->assertJsonPath('first', false);

    expect($profile->trips()->where('destination', 'us')->count())->toBe(1);
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
    giveFirstTicket($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();

    $this->postJson('/api/travel/id/souvenirs/komodo')
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ受け取れません。');
});

it('着いた国で1個目を受け取ると、バッグに非売品のおみやげとして入る', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    giveFirstTicket($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();
    clearCountryStage($profile, $indonesia, '初級', false);

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
    $this->getJson('/api/world')->assertOk()->assertJsonPath('bag.0.asset_key', 'komodo');
    $this->getJson('/api/shop')->assertOk()->assertJsonMissing(['name' => 'コモドドラゴンの像']);
});

it('おみやげは1回だけ受け取れる', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    giveFirstTicket($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();
    clearCountryStage($profile, $indonesia, '初級', false);
    $this->postJson('/api/travel/id/souvenirs/komodo')->assertOk();

    $this->postJson('/api/travel/id/souvenirs/komodo')
        ->assertStatus(422)
        ->assertJsonPath('message', 'もう受け取っています。');

    expect($profile->souvenirs()->count())->toBe(1);
});

it('知らないおみやげ・その国にないおみやげは404', function (string $souvenir) {
    $profile = createActiveProfile();
    giveFirstTicket($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();

    $this->postJson("/api/travel/id/souvenirs/{$souvenir}")->assertNotFound();
})->with(['韓国のおみやげ' => 'bulguksa', '知らないキー' => 'zzz']);

it('2×2のおみやげ(ボロブドゥール寺院)は、町に置くと4マス使う', function () {
    $profile = createActiveProfile();
    $indonesia = createTravelCountry('id', 'インドネシア');
    giveFirstTicket($profile);
    $this->postJson('/api/travel/id/depart')->assertOk();
    clearCountryStage($profile, $indonesia, '初級', true);

    $id = $this->postJson('/api/travel/id/souvenirs/borobudur')->assertOk()
        ->assertJsonPath('world_item.footprint', 2)
        ->json('world_item.id');

    $this->patchJson("/api/world/items/{$id}", ['x' => 4, 'y' => 4])->assertOk()->assertJsonPath('footprint', 2);
    $bench = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);
    $this->patchJson("/api/world/items/{$bench->id}", ['x' => 5, 'y' => 5])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
});

it('町の tickets は、持っているチケットの数', function () {
    $profile = createActiveProfile();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('tickets', 0)->assertJsonMissingPath('travel_ready');

    giveFirstTicket($profile);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('tickets', 1);

    $this->postJson('/api/travel/us/depart')->assertOk();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('tickets', 0);
});

it('町のアイテムに souvenir が付く(ふつうのアイテムは false)', function () {
    $profile = createActiveProfile();
    giveWorldItem($profile, 'bench');

    $this->getJson('/api/world')->assertOk()->assertJsonPath('bag.0.souvenir', false);
});

it('ショップの品に travel_gear は付かない(旅の条件でなくなったため)', function () {
    createActiveProfile();
    createDecoration(['name' => '小さな船', 'meta' => ['asset_key' => 'boat_small']]);

    $item = collect($this->getJson('/api/shop')->assertOk()->json())->firstWhere('name', '小さな船');

    expect($item)->not->toHaveKey('travel_gear');
});

it('品ぞろえに小さな船(Lv.7・200pt)と大きな船(Lv.11・450pt・2×2)がある(町のアイテムとして残る)', function () {
    $this->seed(WorldItemSeeder::class);

    $small = ShopItem::query()->where('name', '小さな船')->firstOrFail();
    $large = ShopItem::query()->where('name', '大きな船')->firstOrFail();

    expect([$small->min_level, $small->price, $small->assetKey(), $small->footprint()])->toBe([7, 200, 'boat_small', 1]);
    expect([$large->min_level, $large->price, $large->assetKey(), $large->footprint()])->toBe([11, 450, 'boat_large', 2]);
});
```

- [ ] **Step 3: テストが落ちるのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/TravelTest.php tests/Feature/TravelActionsTest.php 2>&1 | grep '"tool":"pest"'`
Expected: FAIL（`tickets`・`transport`・`travel.home` がない、「チケットがありません。」でなく「旅のじゅんびがそろっていません。」など）

- [ ] **Step 4: 設定を変える（`config/travel.php`）**

ファイル冒頭のコメントと `destinations` を次のように置き換え、`home` を足す（おみやげの行は1行1つのまま）。

```php
<?php

return [

    /*
    | 旅(docs/design/2026-09-28-travel-tickets-design.md 3章・4-1)。home ははじまりの国(最初から学べ、旅の行き先には入らない)。
    | destinations の並び順は、せかいの地図の島の順と学ぶタブの並び順に使う(行く順番は自由)。
    | まだの国へは、チケット(学べる国の初級のボスで1か国1枚)を1枚使って行く。transport は出発の場面の乗り物(ship/plane)。
    | おみやげのキーはそのまま絵のキー(asset_key)。2×2のおみやげは config/world.php の asset_footprints に書く。
    | flag は public/flag/ のファイル名(DBの国コードは大文字小文字が不揃いなため)。
    | 画面の art-keys.test.ts がおみやげの行の形を読むので、1行1つで書く
    */

    'home' => ['key' => 'jp', 'name' => '日本', 'country_code' => 'jp'],

    'destinations' => [
        [
            'key' => 'id',
            'name' => 'インドネシア',
            'country_code' => 'id',
            'flag' => 'id',
            'transport' => 'ship',
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
            'transport' => 'ship',
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
            'transport' => 'plane',
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
            'transport' => 'plane',
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
            'transport' => 'plane',
            'greeting' => ['text' => 'Bienvenue!', 'reading' => 'ビアンヴニュ'],
            'souvenirs' => [
                ['key' => 'eiffel', 'name' => 'エッフェル塔の置物', 'condition' => 'stage'],
                ['key' => 'mont_saint_michel', 'name' => 'モン・サン=ミッシェル', 'condition' => 'boss'],
            ],
        ],
    ],

];
```

- [ ] **Step 5: 旅の計算を作り直す（`app/Support/Travel.php` をまるごと置き換える）**

```php
<?php

namespace App\Support;

use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * 旅(docs/design/2026-09-28-travel-tickets-design.md 3章・4-2。おみやげは docs/design/2026-09-27-spru-wave-f-design.md 3-2)。
 * はじまりの国(日本)から、クイズで手に入れたチケットで好きな国へ行く。行き先・乗り物・おみやげは config/travel.php に持ち、
 * DBには着いた国(profile_trips)と受け取ったおみやげ(profile_souvenirs)だけを持つ。
 * チケットは表を作らず、クリアの記録(profile_stage_progress)と着いた国から毎回数える(A案)。
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

    /** 学ぶタブに出す国の国コード(小文字)。日本が先頭、そのあと行き先の順 @return list<string> */
    public static function countryCodes(): array
    {
        return [
            strtolower(config('travel.home.country_code')),
            ...array_map(fn (array $destination) => strtolower($destination['country_code']), self::destinations()),
        ];
    }

    /** 鍵の国(旅の行き先のうち、まだ着いていない国)の国のid。プロフィールがなければ行き先ぜんぶ @return list<int> */
    public static function lockedCountryIds(?UserProfile $profile): array
    {
        $countries = self::countryIdsByCode();
        $visited = $profile ? self::visitedKeys($profile) : [];

        return collect(self::destinations())
            ->reject(fn (array $destination) => in_array($destination['key'], $visited, true))
            ->map(fn (array $destination) => $countries[strtolower($destination['country_code'])] ?? null)
            ->filter()
            ->values()
            ->all();
    }

    /** 鍵の国なら 403。国のないステージ(国のid が null)には鍵をかけない */
    public static function abortIfLocked(?UserProfile $profile, ?int $countryId): void
    {
        abort_if(
            $countryId !== null && in_array($countryId, self::lockedCountryIds($profile), true),
            403,
            'まだこの国に着いていません。',
        );
    }

    /** もらったチケットの数(0で止めない)。「このクリアで新しく増えたか」の判定に使う */
    public static function earnedTickets(UserProfile $profile): int
    {
        return self::context($profile)['earned'];
    }

    /** 持っているチケットの数(3-2)。まだの国が残っていなければ 0 */
    public static function tickets(UserProfile $profile): int
    {
        return self::context($profile)['tickets'];
    }

    /** せかいの画面に出すもの(GET /api/travel)。記録は1回だけ読む @return array{tickets: int, ticket_hint: ?string, destinations: list<array<string, mixed>>} */
    public static function overview(UserProfile $profile): array
    {
        $context = self::context($profile);

        return [
            'tickets' => $context['tickets'],
            'ticket_hint' => self::ticketHint($context),
            'destinations' => array_map(fn (array $destination) => self::present($destination, $context), self::destinations()),
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function state(UserProfile $profile): array
    {
        return self::overview($profile)['destinations'];
    }

    /** @return array<string, mixed>|null */
    public static function show(UserProfile $profile, string $key): ?array
    {
        $index = self::indexOf($key);

        return $index === null ? null : self::state($profile)[$index];
    }

    /** 出発する(プロフィールはロック済みで呼ぶ)。着いた国ならチケットを使わない @return array{first: bool, destination: array<string, mixed>} */
    public static function depart(UserProfile $profile, string $key): array
    {
        $index = self::indexOf($key);
        abort_if($index === null, 404);

        if (in_array($key, self::visitedKeys($profile), true)) {
            return ['first' => false, 'destination' => self::state($profile)[$index]];
        }
        abort_unless(self::tickets($profile) > 0, 422, 'チケットがありません。');

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

    /** @return list<string> */
    private static function visitedKeys(UserProfile $profile): array
    {
        return $profile->trips()->pluck('destination')->all();
    }

    /** 日本と行き先の国の、国コード(小文字) => 国のid。DBにない国は入らない @return array<string, int> */
    private static function countryIdsByCode(): array
    {
        return Country::query()
            ->whereIn(DB::raw('LOWER(code)'), self::countryCodes())
            ->get(['id', 'code'])
            ->mapWithKeys(fn (Country $country) => [strtolower($country->code) => (int) $country->id])
            ->all();
    }

    /** 学べる国(日本と着いた国)。日本が先、そのあと行き先の順 @return list<array{name: string, country_id: int|null}> */
    private static function learnablePlaces(array $countries, array $visited): array
    {
        $places = [config('travel.home'), ...array_filter(
            self::destinations(),
            fn (array $destination) => in_array($destination['key'], $visited, true),
        )];

        return array_values(array_map(fn (array $place) => [
            'name' => $place['name'],
            'country_id' => $countries[strtolower($place['country_code'])] ?? null,
        ], $places));
    }

    /** 状態の計算に使う記録。それぞれ1回のクエリで読む @return array<string, mixed> */
    private static function context(UserProfile $profile): array
    {
        $cleared = ProfileStageProgress::query()
            ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
            ->where('profile_stage_progress.user_profile_id', $profile->id)
            ->whereNotNull('profile_stage_progress.cleared_at')
            ->get(['stages.country_id', 'stages.difficulty', 'stages.is_boss']);
        $countries = self::countryIdsByCode();
        $visited = self::visitedKeys($profile);
        $bossCountries = $cleared
            ->filter(fn ($stage) => $stage->difficulty === '初級' && (bool) $stage->is_boss && $stage->country_id !== null)
            ->pluck('country_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        $learnable = self::learnablePlaces($countries, $visited);
        $earned = collect($learnable)->filter(fn (array $place) => in_array($place['country_id'], $bossCountries, true))->count();
        $remaining = count(array_diff(array_column(self::destinations(), 'key'), $visited));

        return [
            'visited' => $visited,
            'received' => $profile->souvenirs()->pluck('souvenir')->all(),
            'cleared_countries' => $cleared->pluck('country_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all(),
            'boss_countries' => $bossCountries,
            'countries' => $countries,
            'learnable' => $learnable,
            'earned' => $earned,
            'tickets' => $remaining === 0 ? 0 : max(0, $earned - count($visited)),
        ];
    }

    /** 学べる国のうち、初級のボスをまだ倒していない最初の国の名前(DBにない国は飛ばす) */
    private static function ticketHint(array $context): ?string
    {
        foreach ($context['learnable'] as $place) {
            if ($place['country_id'] !== null && ! in_array($place['country_id'], $context['boss_countries'], true)) {
                return $place['name'];
            }
        }

        return null;
    }

    /** @return array<string, mixed> */
    private static function present(array $destination, array $context): array
    {
        $countryId = $context['countries'][strtolower($destination['country_code'])] ?? null;
        $visited = in_array($destination['key'], $context['visited'], true);
        $souvenirs = $visited
            ? array_map(fn (array $souvenir) => self::souvenir($destination, $souvenir, $countryId, $context), $destination['souvenirs'])
            : [];

        return [
            'key' => $destination['key'],
            'name' => $destination['name'],
            'country_id' => $countryId,
            'code' => $destination['country_code'],
            'flag' => "/flag/{$destination['flag']}.svg",
            'transport' => $destination['transport'],
            'state' => $visited ? 'visited' : 'unvisited',
            'can_depart' => ! $visited && $context['tickets'] > 0,
            'souvenirs' => $souvenirs,
            'souvenir_count' => count($destination['souvenirs']),
            'gift_ready' => collect($souvenirs)->contains(fn (array $souvenir) => $souvenir['met'] && ! $souvenir['received']),
            'greeting' => $destination['greeting'],
        ];
    }

    /** @return array<string, mixed> */
    private static function souvenir(array $destination, array $souvenir, ?int $countryId, array $context): array
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
            'met' => $countryId !== null && in_array($countryId, $cleared, true),
            'received' => in_array($souvenir['key'], $context['received'], true),
        ];
    }
}
```

- [ ] **Step 6: API を直す（`routes/api.php`）**

1. `/api/travel` の一覧（`Route::get('/', ...)->name('index')` の中）:

```php
    Route::get('/', function (Request $request) {
        $profile = ActiveProfile::require($request);

        return ['level' => $profile->level, ...Travel::overview($profile)];
    })->name('index');
```

2. `/api/world` の返り値の最後の行 `'travel_ready' => Travel::ready($profile),` を次に替える:

```php
            'tickets' => Travel::tickets($profile),
```

3. `/api/shop` の `$gear = Travel::gearAssetKeys();` の行と、`'travel_gear' => in_array($item->assetKey(), $gear, true),` の行を消す。

- [ ] **Step 7: 画面側の設定のテストを直す（`frontend/src/components/world/art-keys.test.ts`）**

「旅じたく(config/travel.php の items)の絵は、町のアイテムの絵にある」のテストを、次のテストに置き換える。

```ts
  it("旅の行き先(config/travel.php)には、乗り物(ship か plane)が5つある", () => {
    const transports = [...travel.matchAll(/'transport' => '([a-z]+)'/g)].map((m) => m[1]);
    expect(transports).toHaveLength(5);
    for (const transport of transports) expect(["ship", "plane"]).toContain(transport);
  });
```

- [ ] **Step 8: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/TravelTest.php tests/Feature/TravelActionsTest.php 2>&1 | grep '"tool":"pest"'`
Expected: PASS（全件）

Run: `cd frontend && npx vitest run src/components/world/art-keys.test.ts`
Expected: PASS

- [ ] **Step 9: ほかのテストが壊れていないか確かめる**

Run: `./vendor/bin/sail test 2>&1 | grep '"tool":"pest"'`
Expected: PASS（旅の2つのテストのほかに `travel_ready`・`travel_gear` を見ているテストはない。2026-09-28 に確認済み）

- [ ] **Step 10: コミットする**

```bash
git add config/travel.php app/Support/Travel.php routes/api.php tests/Feature/TravelTest.php tests/Feature/TravelActionsTest.php frontend/src/components/world/art-keys.test.ts
git commit -m "#00204: feat:旅をチケットで好きな国へ行くルールにする(日本と着いた国の初級ボスで1枚、レベル・町のアイテム・おみやげの条件をやめる)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 学ぶの鍵と「チケットを手に入れた」の印（サーバー）

**Files:**
- Modify: `routes/api.php`（`/api/countries`・`/api/countries/{country}`・`/api/regions/{region}`・`/api/categories/{category}/stages`・`/api/stages/{stage}`・`/api/stages/{stage}/complete`）
- Create: `tests/Feature/TravelLockTest.php`
- Rewrite: `tests/Feature/CountriesIndexTest.php`

**Interfaces:**
- Consumes: `Travel::countryCodes()`、`Travel::lockedCountryIds(?UserProfile)`、`Travel::abortIfLocked(?UserProfile, ?int)`、`Travel::earnedTickets(UserProfile)`、`Travel::tickets(UserProfile)`（Task 1）
- Produces（Task 6 が使う）: `GET /api/countries` の各国の `locked: bool`（`is_suggested` はなくなる）。鍵の国の `GET /api/countries/{id}`・`GET /api/regions/{id}`・`GET /api/stages/{id}` は 403。`POST /api/stages/{id}/complete` の応答の `ticket_earned: bool`

- [ ] **Step 1: 鍵のテストを書く（`tests/Feature/TravelLockTest.php` を新しく作る）**

```php
<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\Region;
use App\Models\Stage;
use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| 学ぶの鍵とチケットの知らせ(docs/design/2026-09-28-travel-tickets-design.md 3-6・4-3)
|--------------------------------------------------------------------------
|
| 鍵の国(旅の行き先のうち、まだ着いていない国)は、国・地域の画面もステージも開けない。
| 日本・着いた国・行き先でない国・国のないステージは開ける。
|
*/

/** そのステージに問題を1つ付ける(ステージを開くAPIは問題がないと404のため) */
function withQuestion(Stage $stage): Stage
{
    [$question] = createQuestionWithChoices();
    $stage->questions()->attach($question->id, ['order' => 1]);

    return $stage;
}

function beginnerStage(Country $country, bool $boss = false): Stage
{
    return withQuestion(Stage::query()->where('country_id', $country->id)->where('difficulty', '初級')->where('is_boss', $boss)->firstOrFail());
}

function visit(UserProfile $profile, string $key): void
{
    $profile->trips()->create(['destination' => $key, 'arrived_at' => now()]);
}

it('鍵の国のステージは、開くのも終えるのも403', function () {
    createActiveProfile();
    $stage = beginnerStage(createTravelCountry('us', 'アメリカ'));

    $this->getJson("/api/stages/{$stage->id}")->assertForbidden()->assertJsonPath('message', 'まだこの国に着いていません。');
    $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1])->assertForbidden();

    expect(ProfileStageProgress::query()->count())->toBe(0);
});

it('鍵の国の画面と地域の画面は403', function () {
    createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $region = Region::create(['country_id' => $us->id, 'name' => 'ニューヨーク']);

    $this->getJson("/api/countries/{$us->id}")->assertForbidden();
    $this->getJson("/api/regions/{$region->id}")->assertForbidden();
});

it('日本・着いた国・行き先でない国・国のないステージは開ける', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $us = createTravelCountry('us', 'アメリカ');
    $italy = createTravelCountry('it', 'イタリア');
    $noCountry = withQuestion(Stage::create(['category_id' => Category::create(['name' => '国なし'])->id, 'difficulty' => '初級', 'stage_number' => 1]));
    visit($profile, 'us');

    foreach ([beginnerStage($japan), beginnerStage($us), beginnerStage($italy), $noCountry] as $stage) {
        $this->getJson("/api/stages/{$stage->id}")->assertOk();
    }
    $this->getJson("/api/countries/{$japan->id}")->assertOk();
    $this->getJson("/api/countries/{$us->id}")->assertOk();
});

it('ほかのプロフィールが着いた国は鍵のまま', function () {
    $profile = createActiveProfile();
    $stage = beginnerStage(createTravelCountry('us', 'アメリカ'));
    visit(createFamilyMember($profile), 'us');

    $this->getJson("/api/stages/{$stage->id}")->assertForbidden();
});

it('ミニアプリの一覧から鍵の国のステージを外す(アメリカとイギリスが共有する英語を学ぶ)', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $english = Category::create(['name' => '英語を学ぶ', 'is_language_mode' => true]);
    $usStage = Stage::create(['category_id' => $english->id, 'country_id' => $us->id, 'difficulty' => '初級', 'stage_number' => 1]);
    $gbStage = Stage::create(['category_id' => $english->id, 'country_id' => $gb->id, 'difficulty' => '初級', 'stage_number' => 1]);
    visit($profile, 'gb');

    $ids = collect($this->getJson("/api/categories/{$english->id}/stages")->assertOk()->json('0.stages'))->pluck('id')->all();

    expect($ids)->toBe([$gbStage->id])->and($ids)->not->toContain($usStage->id);
});

it('日本の初級のボスを初めて倒すと ticket_earned が true。2回目とふつうのステージは false', function () {
    createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $boss = beginnerStage($japan, true);
    $normal = beginnerStage($japan);

    $this->postJson("/api/stages/{$normal->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', true);
    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
});

it('チケットが0のままなら ticket_earned は false(着いた国がもらった数より多いとき)', function () {
    $profile = createActiveProfile();
    $boss = beginnerStage(createTravelCountry('jp', '日本'), true);
    visit($profile, 'us');
    visit($profile, 'gb');

    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
});

it('5か国ぜんぶ着いたあとは、ボスを倒しても ticket_earned は false', function () {
    $profile = createActiveProfile();
    $boss = beginnerStage(createTravelCountry('jp', '日本'), true);
    foreach (['id', 'kr', 'us', 'gb', 'fr'] as $key) {
        visit($profile, $key);
    }

    $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 1])->assertOk()->assertJsonPath('ticket_earned', false);
});
```

- [ ] **Step 2: 国の一覧のテストを書き直す（`tests/Feature/CountriesIndexTest.php` をまるごと置き換える）**

```php
<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| GET /api/countries のテスト(学ぶタブ、docs/design/2026-09-28-travel-tickets-design.md 3-6)
|--------------------------------------------------------------------------
|
| 日本と旅の行き先の国のうち、コンテンツがある国だけを 日本 → 行き先の順 に返す。
| まだ着いていない行き先には鍵(locked)を付ける。
|
*/

function createCountryWithStageContent(string $code, string $name): Country
{
    $country = Country::create([
        'code' => $code,
        'three_code' => strtoupper($code).'X',
        'name' => $name,
        'name_en' => $name,
        'country_code' => random_int(100, 999),
    ]);

    $category = Category::create(['name' => $name.'カテゴリ']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'country_id' => $country->id,
        'difficulty' => '初級',
        'stage_number' => 1,
    ]);
    [$question] = createQuestionWithChoices();
    $stage->questions()->attach($question->id, ['order' => 1]);

    return $country;
}

it('日本が先頭、そのあと行き先の順。コンテンツのない国と、行き先でない国は出ない', function () {
    createActiveProfile();
    createCountryWithStageContent('fr', 'フランス');
    createCountryWithStageContent('it', 'イタリア');
    createCountryWithStageContent('US', 'アメリカ');
    createCountryWithStageContent('jp', '日本');
    Country::create(['code' => 'kr', 'three_code' => 'KRX', 'name' => '韓国', 'name_en' => '韓国', 'country_code' => 410]);

    $codes = collect($this->getJson('/api/countries')->assertOk()->json())->pluck('code')->all();

    expect($codes)->toBe(['jp', 'US', 'fr']);
});

it('日本と着いた国は鍵がなく、まだ着いていない行き先に鍵が付く', function () {
    $profile = createActiveProfile();
    createCountryWithStageContent('jp', '日本');
    createCountryWithStageContent('us', 'アメリカ');
    createCountryWithStageContent('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $locked = collect($this->getJson('/api/countries')->assertOk()->json())->pluck('locked', 'code')->all();

    expect($locked)->toBe(['jp' => false, 'us' => false, 'gb' => true]);
});

it('推定した国の印(is_suggested)は返さない', function () {
    createActiveProfile();
    createCountryWithStageContent('jp', '日本');

    $response = $this->withHeader('Accept-Language', 'ja')->getJson('/api/countries')->assertOk();

    expect($response->json('0'))->not->toHaveKey('is_suggested');
});

it('言語学習モードのステージがある国だけhas_language_modeがtrue', function () {
    createActiveProfile();
    $us = createCountryWithStageContent('us', 'アメリカ');
    createCountryWithStageContent('jp', '日本');

    $languageCategory = Category::create(['name' => '英語を学ぶ', 'is_language_mode' => true]);
    $stage = Stage::create([
        'category_id' => $languageCategory->id,
        'country_id' => $us->id,
        'difficulty' => '初級',
        'stage_number' => 1,
    ]);
    [$question] = createQuestionWithChoices();
    $stage->questions()->attach($question->id, ['order' => 1]);

    $byCode = collect($this->getJson('/api/countries')->assertOk()->json())->keyBy('code');

    expect($byCode['us']['has_language_mode'])->toBeTrue();
    expect($byCode['jp']['has_language_mode'])->toBeFalse();
});
```

- [ ] **Step 3: テストが落ちるのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/TravelLockTest.php tests/Feature/CountriesIndexTest.php 2>&1 | grep '"tool":"pest"'`
Expected: FAIL（鍵の国のステージが 200 で開ける、`ticket_earned`・`locked` がない、など）

- [ ] **Step 4: API を直す（`routes/api.php`）**

1. `GET /api/countries`（`->name('countries.index')`）をまるごと置き換える:

```php
Route::middleware(['auth:sanctum'])->get('/countries', function (Request $request) {
    // 学ぶタブ向け(docs/design/2026-09-28-travel-tickets-design.md 3-6): 日本と旅の行き先の国のうち、コンテンツがある国だけを
    // 日本 → 行き先の順に返し、まだ着いていない行き先に鍵(locked)を付ける。Owner管理画面は /api/owner/countries で全件を扱う。
    // Accept-Language からの推定(Country::guessFromAcceptLanguage)は、スタートが日本に決まったので使わない(海外展開のときにまた使う)
    $codes = Travel::countryCodes();
    $locked = Travel::lockedCountryIds(ActiveProfile::find($request));

    return Country::query()
        ->whereIn(DB::raw('LOWER(code)'), $codes)
        ->whereHas('stages.questions')
        ->get()
        ->sortBy(fn (Country $country) => array_search(strtolower($country->code), $codes, true))
        ->map(fn (Country $country) => [
            ...$country->toArray(),
            'locked' => in_array($country->id, $locked, true),
            'has_language_mode' => $country->stages()
                ->whereHas('category', fn ($q) => $q->where('is_language_mode', true))
                ->whereHas('questions')
                ->exists(),
        ])
        ->values();
})->name('countries.index');
```

2. `GET /api/countries/{country}` の関数の最初の行（`$profileId = ...` の前）に足す:

```php
    Travel::abortIfLocked(ActiveProfile::find($request), $country->id);
```

3. `GET /api/regions/{region}` の関数の最初の行に足す:

```php
    Travel::abortIfLocked(ActiveProfile::find($request), $region->country_id);
```

4. `GET /api/categories/{category}/stages` で、`$stagesByDifficulty = Stage::query()` の前に `$locked` を用意し、取り出したステージから鍵の国のものを外す:

```php
    $locked = Travel::lockedCountryIds(ActiveProfile::find($request));

    $stagesByDifficulty = Stage::query()
        ->where('category_id', $category->id)
        ->withCount('questions')
        ->orderBy('stage_number')
        ->get()
        // 鍵の国のステージはミニアプリにも出さない(設計書3-6)
        ->reject(fn (Stage $stage) => in_array($stage->country_id, $locked, true))
        ->groupBy('difficulty');
```

5. `GET /api/stages/{stage}` の関数の引数を `function (Request $request, Stage $stage)` にし、最初の行に足す:

```php
    Travel::abortIfLocked(ActiveProfile::find($request), $stage->country_id);
```

6. `POST /api/stages/{stage}/complete` で、`abort_unless($profile && ...)` の行のすぐ後に足す:

```php
    Travel::abortIfLocked($profile, $stage->country_id);
    $earnedTicketsBefore = Travel::earnedTickets($profile);
```

   同じ関数の `$titleGranted = false;` の前（`$profile->applyEconomy(...)` の後）に足す:

```php
    // このクリアで新しくチケットが増え、使えるときだけ知らせる(設計書4-3・5-4)
    $ticketEarned = Travel::earnedTickets($profile) > $earnedTicketsBefore && Travel::tickets($profile) > 0;
```

   返り値の配列の `'title' => $stage->title_reward,` の後に足す:

```php
        'ticket_earned' => $ticketEarned,
```

- [ ] **Step 5: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/TravelLockTest.php tests/Feature/CountriesIndexTest.php 2>&1 | grep '"tool":"pest"'`
Expected: PASS（全件）

- [ ] **Step 6: ほかのテストが壊れていないか確かめる**

Run: `./vendor/bin/sail test 2>&1 | grep '"tool":"pest"'`
Expected: PASS（今あるテストのステージは国を持たないので鍵に当たらない）

- [ ] **Step 7: コミットする**

```bash
git add routes/api.php tests/Feature/TravelLockTest.php tests/Feature/CountriesIndexTest.php
git commit -m "#00205: feat:学ぶタブを着いた国だけにし(鍵の国の画面・ステージは403)、ボスでチケットがもらえたことを知らせる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 今のデータの記録とパスポートの旅した国（サーバー）

**Files:**
- Modify: `app/Support/Travel.php`（`trips`・`recordTripsForClearedCountries` を足す）
- Create: `database/migrations/2026_09_28_000002_record_trips_for_cleared_countries.php`
- Modify: `routes/api.php`（`GET /api/passport`）
- Create: `tests/Feature/TravelRecordTest.php`

**Interfaces:**
- Consumes: `Travel::destinations()`、`Travel::countryCodes()`（Task 1）
- Produces（Task 6 が使う）: `GET /api/passport` の `trips: list<{key: string, name: string, flag: string, transport: 'ship'|'plane', arrived_at: string}>`（着いた順）

- [ ] **Step 1: テストを書く（`tests/Feature/TravelRecordTest.php` を新しく作る）**

```php
<?php

use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Support\Travel;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 今のデータの記録とパスポートの旅した国(docs/design/2026-09-28-travel-tickets-design.md 3-7・4-3)
|--------------------------------------------------------------------------
*/

it('ステージをクリアしている行き先の国を、最初にクリアした日に着いた国として記録する', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $stages = Stage::query()->where('country_id', $us->id)->get();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stages[1]->id, 'cleared_at' => Carbon::parse('2026-09-20 10:00:00')]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stages[0]->id, 'cleared_at' => Carbon::parse('2026-09-10 09:00:00')]);

    Travel::recordTripsForClearedCountries();

    $trip = $profile->trips()->sole();
    expect($trip->destination)->toBe('us')
        ->and($trip->arrived_at->toDateTimeString())->toBe('2026-09-10 09:00:00');
});

it('クリアしていない国・行き先でない国・日本は記録しない', function () {
    $profile = createActiveProfile();
    createTravelCountry('gb', 'イギリス');
    clearCountryStage($profile, createTravelCountry('it', 'イタリア'), '初級', false);
    clearCountryStage($profile, createTravelCountry('jp', '日本'), '初級', true);
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => Stage::query()->where('country_id', createTravelCountry('fr', 'フランス')->id)->firstOrFail()->id,
        'cleared_at' => null,
    ]);

    Travel::recordTripsForClearedCountries();

    expect($profile->trips()->count())->toBe(0);
});

it('もう着いている国は足さず、着いた日も変えない', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => Carbon::parse('2026-09-27 12:00:00')]);
    clearCountryStage($profile, createTravelCountry('us', 'アメリカ'), '初級', false);

    Travel::recordTripsForClearedCountries();

    expect($profile->trips()->count())->toBe(1)
        ->and($profile->trips()->sole()->arrived_at->toDateTimeString())->toBe('2026-09-27 12:00:00');
});

it('パスポートの trips は、着いた国を着いた順に乗り物つきで返す', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'kr', 'arrived_at' => Carbon::parse('2026-09-21 10:00:00')]);
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => Carbon::parse('2026-09-20 10:00:00')]);

    $this->getJson('/api/passport')->assertOk()->assertJsonPath('trips', [
        ['key' => 'us', 'name' => 'アメリカ', 'flag' => '/flag/us.svg', 'transport' => 'plane', 'arrived_at' => '2026-09-20'],
        ['key' => 'kr', 'name' => '韓国', 'flag' => '/flag/kr.svg', 'transport' => 'ship', 'arrived_at' => '2026-09-21'],
    ]);
});

it('プロフィールを選んでいなければ、パスポートの trips は空', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $this->withSession(['active_profile_id' => null])->getJson('/api/passport')->assertOk()->assertJsonPath('trips', []);
});
```

- [ ] **Step 2: テストが落ちるのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/TravelRecordTest.php 2>&1 | grep '"tool":"pest"'`
Expected: FAIL（`recordTripsForClearedCountries` がない、`trips` がない）

- [ ] **Step 3: 旅の計算に2つ足す（`app/Support/Travel.php`）**

`use` に `App\Models\UserProfile` はもうあるので、`receive` の後に次の2つを足す。

```php
    /** パスポートの「旅した国」。着いた順 @return list<array{key: string, name: string, flag: string, transport: string, arrived_at: string|null}> */
    public static function trips(UserProfile $profile): array
    {
        $destinations = collect(self::destinations())->keyBy('key');

        return $profile->trips()->orderBy('arrived_at')->orderBy('id')->get()
            ->filter(fn ($trip) => $destinations->has($trip->destination))
            ->map(fn ($trip) => [
                'key' => $trip->destination,
                'name' => $destinations[$trip->destination]['name'],
                'flag' => "/flag/{$destinations[$trip->destination]['flag']}.svg",
                'transport' => $destinations[$trip->destination]['transport'],
                'arrived_at' => $trip->arrived_at?->toDateString(),
            ])
            ->values()
            ->all();
    }

    /**
     * 今のデータの記録(設計書3-7。マイグレーションから呼ぶ)。ステージをクリアしている行き先の国を、
     * その国で最初にクリアした日に着いた国として足す。もう着いている国は変えない
     */
    public static function recordTripsForClearedCountries(): void
    {
        $countries = self::countryIdsByCode();

        foreach (self::destinations() as $destination) {
            $countryId = $countries[strtolower($destination['country_code'])] ?? null;
            if ($countryId === null) {
                continue;
            }

            $firstClears = ProfileStageProgress::query()
                ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
                ->where('stages.country_id', $countryId)
                ->whereNotNull('profile_stage_progress.cleared_at')
                ->groupBy('profile_stage_progress.user_profile_id')
                ->selectRaw('profile_stage_progress.user_profile_id as profile_id, MIN(profile_stage_progress.cleared_at) as first_cleared_at')
                ->get();

            foreach ($firstClears as $row) {
                UserProfile::query()->find($row->profile_id)?->trips()->firstOrCreate(
                    ['destination' => $destination['key']],
                    ['arrived_at' => $row->first_cleared_at],
                );
            }
        }
    }
```

- [ ] **Step 4: マイグレーションを足す（`database/migrations/2026_09_28_000002_record_trips_for_cleared_countries.php`）**

```php
<?php

use App\Support\Travel;
use Illuminate\Database\Migrations\Migration;

/**
 * 国の進め方をチケットにしたときの、今のデータの記録(docs/design/2026-09-28-travel-tickets-design.md 3-7)。
 * 行を足すだけなので、戻すときは何もしない
 */
return new class extends Migration
{
    public function up(): void
    {
        Travel::recordTripsForClearedCountries();
    }

    public function down(): void {}
};
```

- [ ] **Step 5: パスポートの API に足す（`routes/api.php` の `GET /api/passport`）**

返り値の配列の `'streak_milestones' => ...` の後に足す:

```php
        // 旅した国(設計書5-7)。チケットを使って着いた国
        'trips' => ($profile = ActiveProfile::find($request)) ? Travel::trips($profile) : [],
```

- [ ] **Step 6: テストが通るのを確かめる**

Run: `./vendor/bin/sail test tests/Feature/TravelRecordTest.php tests/Feature/PassportTest.php 2>&1 | grep '"tool":"pest"'`
Expected: PASS（全件）

- [ ] **Step 7: 全部のテストと、開発用データベースへの反映**

Run: `./vendor/bin/sail test 2>&1 | grep '"tool":"pest"'`
Expected: PASS

Run: `./vendor/bin/sail artisan migrate`
Expected: `2026_09_28_000002_record_trips_for_cleared_countries ... DONE`

Run: `./vendor/bin/sail artisan tinker --execute='foreach (App\Models\ProfileTrip::all() as $t) echo $t->user_profile_id," ",$t->destination," ",$t->arrived_at,"\n";'`
Expected: かっちゃん（id 2）の `us` の1行だけ（町テスト・検証太郎はイタリアだけなので行がない）

- [ ] **Step 8: コミットする**

```bash
git add app/Support/Travel.php database/migrations/2026_09_28_000002_record_trips_for_cleared_countries.php routes/api.php tests/Feature/TravelRecordTest.php
git commit -m "#00206: feat:クリアしている行き先の国を着いた国として記録し、パスポートに旅した国を返す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 下のメニューを「まち」「せかい」にし、まちのひとこととショップの札を直す（画面）

**Files:**
- Modify: `frontend/src/components/app/nav-items.ts`、`nav-items.test.ts`
- Modify: `frontend/src/components/app/bottom-nav.tsx`
- Modify: `frontend/src/components/spru/hint.ts`、`hint.test.ts`
- Modify: `frontend/src/components/world/types.ts`、`frontend/src/components/world/world-screen.tsx`
- Modify: `frontend/src/app/shop/page.tsx`

**Interfaces:**
- Consumes: `GET /api/world` の `tickets: number`、`GET /api/shop` に `travel_gear` がないこと（Task 1）
- Produces: `NavKey = "learn" | "trip" | "town" | "shop"`、`pickTownHint({ ..., tickets?: number })`

- [ ] **Step 1: テストを直す**

`frontend/src/components/app/nav-items.test.ts` の最初の `describe` と「世界は町」のテストを置き換える:

```ts
describe("下のメニューの並び", () => {
  it("学ぶ・せかい・まち・ショップの順で、「じぶん」を足した5つの真ん中がまち", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["学ぶ", "せかい", "まち", "ショップ"]);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(["/learn", "/trip", "/", "/shop"]);
    expect(NAV_ITEMS[2].key).toBe("town");
  });
});

describe("下のメニューの選択中", () => {
  it("まちは町(/)のときだけ選択中", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/learn", "/")).toBe(false);
  });
```

（その後の「ほかはそのページとその下で選択中…」のテストはそのまま）

`frontend/src/components/spru/hint.test.ts` の「旅のじゅんびがそろっていれば…」のテストを置き換える:

```ts
  it("チケットがあれば、水やりの次にせかいで行き先を選ぶようにすすめる", () => {
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 7, shop, tickets: 1 })).toBe(
      "チケットがあるよ！『せかい』で行きたい国を選ぼう",
    );
    expect(pickTownHint({ bag: [], points: 500, level: 7, shop, canWater: true, tickets: 1 })).toBe("畑に水をあげよう！");
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 7, shop, tickets: 0 })).toBe(
      "バッグにちょうちんがあるよ。町に置いてみよう",
    );
  });
```

- [ ] **Step 2: テストが落ちるのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/nav-items.test.ts src/components/spru/hint.test.ts`
Expected: FAIL（名前が「旅する」「世界」のまま、`tickets` を見ない）

- [ ] **Step 3: メニューの名前を変える（`frontend/src/components/app/nav-items.ts`）**

```ts
// 下のメニュー(docs/design/2026-09-28-app-chrome-design.md 4-5、名前は docs/design/2026-09-28-travel-tickets-design.md 5-1)。
// 画面を描かない部分だけをここに置く。「じぶん」はページを移らずパネルを開くボタンなので、ここには入れない

export type NavKey = "learn" | "trip" | "town" | "shop";

export const NAV_ITEMS: { key: NavKey; href: string; label: string }[] = [
  { key: "learn", href: "/learn", label: "学ぶ" },
  { key: "trip", href: "/trip", label: "せかい" },
  { key: "town", href: "/", label: "まち" },
  { key: "shop", href: "/shop", label: "ショップ" },
];

/** そのページにいるとき選択中にする。まち(/)はちょうど町のときだけ、ほかはそのページとその下 */
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
```

- [ ] **Step 4: メニューのアイコンを変える（`frontend/src/components/app/bottom-nav.tsx`）**

`ICONS` の `trip` と `world` を次の `trip`（地球を移す）と `town`（家）に替える:

```tsx
  trip: (
    <svg {...ICON_PROPS}>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </svg>
  ),
  town: (
    <svg {...ICON_PROPS} width={28} height={28}>
      <path d="M3.5 11 12 4l8.5 7 M5.5 9.5V20h13V9.5 M10 20v-5.5h4V20" />
    </svg>
  ),
```

あわせて、`if (item.key === "world") {` を `if (item.key === "town") {` に、`{ICONS.world}` を `{ICONS.town}` にし、`BottomNav` の上のコメントの「学ぶ・旅する・世界(真ん中で丸く大きく)・ショップ・じぶん」を「学ぶ・せかい・まち(真ん中で丸く大きく)・ショップ・じぶん」にする。

- [ ] **Step 5: まちのスプルのひとことを変える（`frontend/src/components/spru/hint.ts`）**

引数の `travelReady = null,` を `tickets = 0,` に、型の `travelReady?: { key: string; name: string } | null;` を `tickets?: number;` にし、2番目の行を置き換える:

```ts
  if (tickets > 0) return "チケットがあるよ！『せかい』で行きたい国を選ぼう";
```

- [ ] **Step 6: まちとショップの型・画面を直す**

`frontend/src/components/world/types.ts`:
- `WorldData` の `/** 次の行き先のじゅんびがそろっていれば、その国(F回) */` と `travel_ready: ...` の2行を、次の2行に替える:

```ts
  /** 持っているチケットの数(docs/design/2026-09-28-travel-tickets-design.md 3-2) */
  tickets: number;
```

- `ShopListItem` の `/** 旅のじゅんびに使うアイテム(ショップの「旅じたく」の札) */` と `travel_gear: boolean;` の2行を消す。

`frontend/src/components/world/world-screen.tsx`: `travelReady: world.travel_ready,` を `tickets: world.tickets,` にする。

`frontend/src/app/shop/page.tsx`: `{item.travel_gear && ( ... 旅じたく ... )}` のブロック（`<span ...>旅じたく</span>` を囲む5行）を消す。

- [ ] **Step 7: テスト・型・lint を確かめる**

Run: `cd frontend && npx vitest run src/components/app/nav-items.test.ts src/components/spru/hint.test.ts`
Expected: PASS

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: エラーなし（`travel` の画面はまだ前の型のままでよい。Task 5 で直す）

- [ ] **Step 8: コミットする**

```bash
git add frontend/src/components/app/nav-items.ts frontend/src/components/app/nav-items.test.ts frontend/src/components/app/bottom-nav.tsx frontend/src/components/spru/hint.ts frontend/src/components/spru/hint.test.ts frontend/src/components/world/types.ts frontend/src/components/world/world-screen.tsx frontend/src/app/shop/page.tsx
git commit -m "#00207: feat:下のメニューを「まち」「せかい」にし、まちのスプルがチケットを知らせ、ショップの旅じたくの札をやめる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: せかいの画面をチケットで好きな国を選ぶ形にする（画面）

**Files:**
- Modify: `frontend/src/components/travel/types.ts`、`travel.ts`、`travel.test.ts`
- Modify: `frontend/src/components/travel/travel-map.tsx`、`destination-sheet.tsx`、`departure-scene.tsx`
- Create: `frontend/src/components/travel/plane-art.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/lib/furigana-dictionary.json`、`frontend/src/components/app/auto-furigana.test.ts`
- Modify: `frontend/src/app/trip/page.tsx`

**Interfaces:**
- Consumes: `GET /api/travel` の `{ level, tickets, ticket_hint, destinations }`、行き先の `transport・state('visited'|'unvisited')・can_depart・souvenirs・souvenir_count`（Task 1）
- Produces（Task 6 が使う）: `lockedCountryText(name: string): string`、`unlockedCountries<T extends { locked: boolean }>(countries: T[]): T[]`、`ticketHintText(hint: string | null): string`（`travel.ts`）

- [ ] **Step 1: テストを書き直す（`frontend/src/components/travel/travel.test.ts`）**

`import` とテスト用の `dest`・`souvenir` を直し、`hubLine`・「島のラベルと札」の `describe` を置き換え、出発の場面の文と学ぶタブの `describe` を足す（`pickBeginnerGroup` と「出発の場面」の経過時間のテストはそのまま）。

```ts
import { describe, expect, it } from "vitest";

import {
  ARRIVE_MS,
  SAIL_MS,
  WALK_MS,
  departureCaption,
  departurePhase,
  departureStart,
  hubLine,
  islandLabel,
  islandTag,
  lockedCountryText,
  pickBeginnerGroup,
  ticketHintText,
  transportText,
  unlockedCountries,
} from "./travel";
import type { Destination, TravelSouvenir } from "./types";

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

const dest = (name: string, over: Partial<Destination> = {}): Destination => ({
  key: name,
  name,
  country_id: 1,
  code: "id",
  flag: "/flag/id.svg",
  transport: "ship",
  state: "unvisited",
  can_depart: false,
  souvenirs: [],
  souvenir_count: 2,
  gift_ready: false,
  greeting: { text: "Hello!", reading: "ハロー" },
  ...over,
});

const visited = (name: string, over: Partial<Destination> = {}) =>
  dest(name, { state: "visited", souvenirs: [souvenir("a"), souvenir("b", { condition: "boss", footprint: 2 })], ...over });

describe("hubLine", () => {
  it("受け取れるおみやげがある国があれば、いちばん先にそれを言う", () => {
    const destinations = [visited("インドネシア", { gift_ready: true }), dest("韓国", { can_depart: true })];
    expect(hubLine({ tickets: 1, ticket_hint: null, destinations })).toBe("インドネシアのおみやげ屋さんで、おみやげを受け取れるよ！");
  });

  it("チケットがあれば、行きたい国を選ぶようにすすめる", () => {
    expect(hubLine({ tickets: 1, ticket_hint: null, destinations: [dest("韓国", { can_depart: true })] })).toBe(
      "チケットがあるよ！行きたい国を選んでね",
    );
  });

  it("チケットがなければ、どこの初級のボスを倒せばもらえるかを言う", () => {
    expect(hubLine({ tickets: 0, ticket_hint: "日本", destinations: [dest("韓国")] })).toBe(
      "日本の初級のボスを倒すと、チケットがもらえるよ",
    );
  });

  it("全部の国に着いたら、ほめる", () => {
    const all = ["インドネシア", "韓国", "アメリカ", "イギリス", "フランス"].map((name) => visited(name));
    expect(hubLine({ tickets: 0, ticket_hint: null, destinations: all })).toBe("5つの国をぜんぶ旅したね！すごい！");
  });
});

describe("ticketHintText", () => {
  it("国の名前があれば入れ、なければ国の名前なしで言う", () => {
    expect(ticketHintText("アメリカ")).toBe("アメリカの初級のボスを倒すと、チケットがもらえるよ");
    expect(ticketHintText(null)).toBe("初級のボスを倒すと、チケットがもらえるよ");
  });
});

describe("島のラベルと札", () => {
  it("着いた国は、受け取ったおみやげの数を言う", () => {
    const island = visited("インドネシア", { souvenirs: [souvenir("a", { received: true }), souvenir("b")] });
    expect(islandLabel(island)).toBe("インドネシア(着いた国・おみやげ1/2)");
    expect(islandTag(island)).toBe("おみやげ 1/2");
  });

  it("着いた国で受け取れるおみやげがあれば、札は「おみやげ！」", () => {
    expect(islandTag(visited("インドネシア", { gift_ready: true }))).toBe("おみやげ！");
  });

  it("まだの国は、チケットがあれば「行ける！」、なければ「？」", () => {
    expect(islandLabel(dest("アメリカ", { can_depart: true }))).toBe("アメリカ(まだの国・行けます)");
    expect(islandTag(dest("アメリカ", { can_depart: true }))).toBe("行ける！");
    expect(islandLabel(dest("アメリカ"))).toBe("アメリカ(まだの国)");
    expect(islandTag(dest("アメリカ"))).toBe("？");
  });
});

describe("乗り物と出発の場面の文", () => {
  it("乗り物の説明", () => {
    expect(transportText("plane")).toBe("飛行機で行く国");
    expect(transportText("ship")).toBe("船で行く国");
  });

  it("船の国は桟橋から船で、飛行機の国は空港から飛行機で向かう", () => {
    const ship = dest("韓国", { transport: "ship" });
    const plane = dest("アメリカ", { transport: "plane" });
    expect(departureCaption("walk", ship)).toBe("桟橋から出発！");
    expect(departureCaption("sail", ship)).toBe("韓国へ船で向かっているよ");
    expect(departureCaption("walk", plane)).toBe("空港から出発！");
    expect(departureCaption("sail", plane)).toBe("アメリカへ飛行機で向かっているよ");
    expect(departureCaption("arrive", plane)).toBe("アメリカに着いた！");
  });
});

describe("学ぶタブの鍵", () => {
  it("鍵のない国だけを並びのまま残す(地図に渡す)", () => {
    const countries = [
      { code: "jp", locked: false },
      { code: "id", locked: true },
      { code: "us", locked: false },
    ];
    expect(unlockedCountries(countries).map((country) => country.code)).toEqual(["jp", "us"]);
  });

  it("鍵の国を押したときの案内", () => {
    expect(lockedCountryText("アメリカ")).toBe("アメリカへは『せかい』でチケットを使うと行けるよ");
  });
});
```

- [ ] **Step 2: テストが落ちるのを確かめる**

Run: `cd frontend && npx vitest run src/components/travel/travel.test.ts`
Expected: FAIL（`departureCaption`・`transportText` などがない）

- [ ] **Step 3: 型を直す（`frontend/src/components/travel/types.ts`）**

`TravelState`・`ChecklistRow`・`Destination`・`TravelData` を次のように置き換える（`TravelSouvenir`・`DepartResult`・`ReceiveResult` はそのまま）。

```ts
export type TravelState = "visited" | "unvisited";

export type Transport = "ship" | "plane";

export type Destination = {
  key: string;
  name: string;
  country_id: number | null;
  code: string;
  flag: string;
  transport: Transport;
  state: TravelState;
  /** まだの国で、チケットが1枚以上あるとき true */
  can_depart: boolean;
  /** 着いた国だけ中身が入る(まだの国は「？」で出すため空) */
  souvenirs: TravelSouvenir[];
  souvenir_count: number;
  gift_ready: boolean;
  greeting: { text: string; reading: string };
};

export type TravelData = { level: number; tickets: number; ticket_hint: string | null; destinations: Destination[] };
```

- [ ] **Step 4: ひとこと・札・文を直す（`frontend/src/components/travel/travel.ts`）**

`import` を `import type { Destination, TravelData, Transport } from "./types";` にし、`hubLine`・`islandLabel`・`islandTag` を置き換え、新しい関数を足す（`receivedCount`・`pickBeginnerGroup`・`WALK_MS` などはそのまま）。

```ts
/** せかいで日本の島のスプルが言うひとこと。上から順に最初に当てはまるもの(設計書5-2) */
export function hubLine(travel: Pick<TravelData, "tickets" | "ticket_hint" | "destinations">): string {
  const { destinations } = travel;
  const gift = destinations.find((destination) => destination.gift_ready);
  if (gift) return `${gift.name}のおみやげ屋さんで、おみやげを受け取れるよ！`;
  if (travel.tickets > 0) return "チケットがあるよ！行きたい国を選んでね";
  if (destinations.some((destination) => destination.state === "unvisited")) return ticketHintText(travel.ticket_hint);
  return `${destinations.length}つの国をぜんぶ旅したね！すごい！`;
}

/** チケットのもらい方(ticket_hint は、初級のボスをまだ倒していない学べる国の名前) */
export function ticketHintText(hint: string | null): string {
  return hint ? `${hint}の初級のボスを倒すと、チケットがもらえるよ` : "初級のボスを倒すと、チケットがもらえるよ";
}

/** 島のボタンの読み上げ用ラベル(設計書5-2) */
export function islandLabel(destination: Destination): string {
  if (destination.state === "visited") {
    return `${destination.name}(着いた国・おみやげ${receivedCount(destination)}/${destination.souvenirs.length})`;
  }
  return destination.can_depart ? `${destination.name}(まだの国・行けます)` : `${destination.name}(まだの国)`;
}

/** 島に出す札 */
export function islandTag(destination: Destination): string {
  if (destination.state === "visited") {
    return destination.gift_ready ? "おみやげ！" : `おみやげ ${receivedCount(destination)}/${destination.souvenirs.length}`;
  }
  return destination.can_depart ? "行ける！" : "？";
}

export function transportText(transport: Transport): string {
  return transport === "plane" ? "飛行機で行く国" : "船で行く国";
}

/** 出発の場面の文(設計書5-3)。sail は乗り物で向かっているところ(船も飛行機も) */
export function departureCaption(phase: DeparturePhase, destination: Pick<Destination, "name" | "transport">): string {
  const plane = destination.transport === "plane";
  if (phase === "walk") return plane ? "空港から出発！" : "桟橋から出発！";
  if (phase === "sail") return `${destination.name}へ${plane ? "飛行機" : "船"}で向かっているよ`;
  return `${destination.name}に着いた！`;
}

/** 学ぶタブで、鍵のない国だけを並びのまま残す(地図の表示に渡す。設計書5-5) */
export function unlockedCountries<T extends { locked: boolean }>(countries: T[]): T[] {
  return countries.filter((country) => !country.locked);
}

/** 学ぶタブで鍵の国を押したときの案内(設計書5-5) */
export function lockedCountryText(name: string): string {
  return `${name}へは『せかい』でチケットを使うと行けるよ`;
}
```

（`DeparturePhase` は同じファイルの下で定義しているので、そのまま使える）

- [ ] **Step 5: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/travel/travel.test.ts`
Expected: PASS

- [ ] **Step 6: 新しい言葉の読みを辞書に足す**

`frontend/src/components/app/auto-furigana.test.ts` の最後に足す:

```ts
describe("自動ふりがな(せかいの画面の言葉)", () => {
  it("飛行機・空港・倒す・着いた・行ける・学べる", () => {
    expect(ruby("飛行機で行く国")).toEqual(["飛行機(ひこうき)", "国(くに)"]);
    expect(ruby("空港から出発！")).toEqual(["空港(くうこう)", "出発(しゅっぱつ)"]);
    expect(ruby("日本の初級のボスを倒すと")).toContain("倒す(たおす)");
    expect(ruby("着いた国")).toEqual(["着いた(ついた)", "国(くに)"]);
    expect(ruby("行ける！")).toEqual(["行ける(いける)"]);
    expect(ruby("着いた国で学べるよ")).toContain("学べる(まなべる)");
  });
});
```

Run: `cd frontend && npx vitest run src/components/app/auto-furigana.test.ts`
Expected: FAIL（辞書に言葉がない）

辞書に足す（長い語から並ぶ決まりを保つため、足したあと文字数の長い順に並べ直す。同じ長さの語の順は変わらない）:

```bash
cd frontend && node -e '
const fs = require("fs");
const path = "src/lib/furigana-dictionary.json";
const dict = JSON.parse(fs.readFileSync(path, "utf8"));
Object.assign(dict, { "飛行機": "ひこうき", "空港": "くうこう", "倒す": "たおす", "着いた": "ついた", "行ける": "いける", "学べる": "まなべる" });
const sorted = Object.fromEntries(Object.entries(dict).sort((a, b) => b[0].length - a[0].length));
fs.writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n");
'
```

Run: `cd frontend && npx vitest run src/components/app/auto-furigana.test.ts && git diff --stat src/lib/furigana-dictionary.json`
Expected: PASS。差分は6行の追加だけ（ほかの行の順が変わっていたら、`git checkout src/lib/furigana-dictionary.json` で戻し、6語を同じ文字数の語のかたまりの先頭へ手で入れる）

- [ ] **Step 7: 仮の飛行機の絵を作る（`frontend/src/components/travel/plane-art.tsx`）**

```tsx
/** 出発の場面の飛行機(設計書5-3)。右向き。Ownerのスプルが乗った飛行機の絵が届くまでの仮の絵 */
export function PlaneArt({ width = 170 }: { width?: number }) {
  return (
    <svg viewBox="0 0 170 80" width={width} aria-hidden>
      <path d="M24 36 L14 14 L28 14 L42 34Z" fill="#d8352a" stroke="#2b6fa3" strokeWidth={3} strokeLinejoin="round" />
      <path d="M70 48 L92 74 L106 74 L94 48Z" fill="#5db6e3" stroke="#2b6fa3" strokeWidth={3} strokeLinejoin="round" />
      <path d="M20 44 Q16 36 28 34 L130 30 Q156 30 162 40 Q156 50 130 50 L28 50 Q16 50 20 44Z" fill="#fffaf0" stroke="#2b6fa3" strokeWidth={3} />
      <path d="M70 34 L96 6 L110 6 L96 34Z" fill="#8fd3f0" stroke="#2b6fa3" strokeWidth={3} strokeLinejoin="round" />
      {[62, 82, 102, 122].map((x) => (
        <circle key={x} cx={x} cy={40} r={4} fill="#5db6e3" />
      ))}
    </svg>
  );
}
```

- [ ] **Step 8: 飛行機が飛ぶ動きを足す（`frontend/src/app/globals.css`）**

`.animate-boat-sail { ... }` のすぐ後に足す:

```css
  @keyframes plane-fly {
    0% {
      transform: translate(-60vw, 30px) rotate(-6deg);
    }
    100% {
      transform: translate(60vw, -24px) rotate(-6deg);
    }
  }
  .animate-plane-fly {
    animation: plane-fly 1.6s ease-in-out both;
  }
```

動きを減らす設定のまとまり（`.animate-boat-sail,` が並んでいるところ）の `.animate-boat-sail,` の次の行に `.animate-plane-fly,` を足す。

- [ ] **Step 9: 出発の場面に飛行機を足す（`frontend/src/components/travel/departure-scene.tsx`）**

1. `import` に `import { PlaneArt } from "./plane-art";` を足し、`import { departurePhase, departureStart, type DeparturePhase } from "./travel";` を `import { departureCaption, departurePhase, departureStart, type DeparturePhase } from "./travel";` にする
2. `const caption = phase === "walk" ? ... : ...;` の3行を次に替える:

```tsx
  const caption = departureCaption(phase, destination);
  const plane = destination.transport === "plane";
```

3. 歩く場面の桟橋の `<svg viewBox="0 0 200 40" ...>...</svg>` を `{!plane && ( ... )}` で囲む（飛行機のときは桟橋を出さない）
4. `{phase === "sail" && ( ... )}` のブロックを次に替える:

```tsx
      {phase === "sail" &&
        (plane ? (
          <div className="relative flex h-40 w-full items-center">
            {[
              [10, 12],
              [56, 4],
              [78, 34],
            ].map(([left, top]) => (
              <span
                key={left}
                aria-hidden
                className="absolute h-6 w-16 rounded-full bg-white/80"
                style={{ left: `${left}%`, top: `${top}%` }}
              />
            ))}
            <div className="animate-plane-fly absolute left-1/2 -ml-[85px]">
              <PlaneArt />
            </div>
          </div>
        ) : (
          <div className="relative flex h-40 w-full items-center">
            <svg viewBox="-40 -60 80 70" width={160} aria-hidden className="animate-boat-sail absolute left-1/2 -ml-20">
              <ItemArt assetKey="boat_small" />
            </svg>
            <svg viewBox="0 0 400 20" className="absolute bottom-6 w-full" preserveAspectRatio="none" aria-hidden>
              <path
                d="M0 10 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0"
                stroke="#ffffff"
                strokeWidth={3}
                fill="none"
                opacity={0.7}
              />
            </svg>
          </div>
        ))}
```

5. 場面の上のコメントを「初めての国へ出発する場面(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-3)。船の国は船、飛行機の国は飛行機で渡る。…」にする

- [ ] **Step 10: 地図を直す（`frontend/src/components/travel/travel-map.tsx`）**

1. `Island` を次に替える（`state` の代わりに、着いたか・光るか・うす暗いかを受け取る）:

```tsx
function Island({ x, y, visited, glow, dim }: { x: number; y: number; visited: boolean; glow: boolean; dim: boolean }) {
  return (
    <g opacity={dim ? 0.55 : 1}>
      {glow && <ellipse cx={x} cy={y} rx={50} ry={23} fill="#fff6b0" opacity={0.7} className="animate-pulse" />}
      <ellipse cx={x} cy={y + 4} rx={42} ry={18} fill="#3f93c4" opacity={0.35} />
      <ellipse cx={x} cy={y} rx={40} ry={17} fill={dim ? "#cfc8b8" : "#f1dfae"} />
      <ellipse cx={x - 4} cy={y - 4} rx={28} ry={11} fill={dim ? "#9aa39a" : "#7cc26a"} />
      <path
        d={`M${x + 12} ${y - 6} q2 -14 -2 -22`}
        stroke={dim ? "#7d857d" : "#8a5a33"}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${x + 10} ${y - 28} q-9 -2 -14 4 M${x + 10} ${y - 28} q9 -3 13 3 M${x + 10} ${y - 28} q0 -8 6 -10`}
        stroke={dim ? "#9aa39a" : "#3f8f35"}
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
      />
      {visited && (
        <g transform={`translate(${x - 26} ${y - 8})`}>
          <circle r={9} fill="#fffaf0" stroke="#d8352a" strokeWidth={2} />
          <path d="M-4 0 l3 3 l5 -6" stroke="#d8352a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

/** まだの国でチケットがないとき、島と名前をうす暗くする */
function isDim(destination: Destination): boolean {
  return destination.state === "unvisited" && !destination.can_depart;
}
```

2. `TravelMap` の中の `const points = ...;` と `const visitedCount = ...;` の2行を消し、航路の点線（`{points.slice(1).map((point, index) => { ... })}`）を、日本の島から着いた国へだけ引く点線に替える:

```tsx
        {destinations.map((destination, index) => {
          if (destination.state !== "visited") return null;
          const point = islandPoint(index);
          return (
            <path
              key={destination.key}
              d={`M${HOME.x} ${HOME.y} L${point.x} ${point.y}`}
              stroke="#ffffff"
              strokeWidth={3.5}
              strokeDasharray="2 7"
              strokeLinecap="round"
              opacity={0.95}
            />
          );
        })}
```

3. 島を描くところを替える:

```tsx
          return (
            <Island
              key={destination.key}
              x={point.x}
              y={point.y}
              visited={destination.state === "visited"}
              glow={destination.can_depart}
              dim={isDim(destination)}
            />
          );
```

4. 島のボタンで、名前の札の色の条件 `destination.state === "later"` を `isDim(destination)` に、札の色の条件の `destination.ready` を `destination.can_depart` にする。`{tag && ( ... )}` は `islandTag` がいつも文字を返すので、`tag &&` を外して札をいつも出す
5. 地図の上のコメント「日本の島から上へジグザグに島が並ぶ」を「日本の近くに近い国、遠くに遠い国の島が並ぶ(行く順番は自由)」にし、`TravelMap` の上のコメントを「せかいの海の地図(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-2)。…」にする

- [ ] **Step 11: 島を押したときのカードを直す（`frontend/src/components/travel/destination-sheet.tsx`）**

1. `import` を次にする:

```tsx
import { Plane, Ship, Ticket } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { ItemIcon } from "@/components/world/item-art";

import { Flag } from "./flag";
import { ticketHintText, transportText } from "./travel";
import type { Destination } from "./types";

const STATE_TEXT: Record<Destination["state"], string> = { visited: "着いた国", unvisited: "まだの国" };
```

2. 引数に `ticketHint` を足す（型は `ticketHint: string | null;`）
3. `{destination.state === "next" && ( ... )}` のブロックを次に替える:

```tsx
        {destination.state === "unvisited" && (
          <>
            <p className="flex items-center gap-2 rounded-xl bg-[#f5efe1] px-3 py-2 text-sm font-black">
              {destination.transport === "plane" ? (
                <Plane aria-hidden className="h-4 w-4 text-[#2b6fa3]" />
              ) : (
                <Ship aria-hidden className="h-4 w-4 text-[#2b6fa3]" />
              )}
              <AutoFurigana text={transportText(destination.transport)} />
            </p>
            <ul className="grid grid-cols-2 gap-2" aria-label="おみやげ">
              {Array.from({ length: destination.souvenir_count }, (_, index) => (
                <li key={index} className="flex flex-col items-center gap-1 rounded-xl bg-[#f5efe1] p-2 text-center">
                  <span
                    aria-hidden
                    className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#e8dfcf] text-2xl font-black text-[#8a7a5a]"
                  >
                    ？
                  </span>
                  <span className="text-[11px] font-bold text-[#6b5d45]">
                    <AutoFurigana text="着いたらわかるよ" />
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onDepart}
              disabled={!destination.can_depart || busy}
              className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#2b6fa3] text-base font-black text-white shadow-[0_4px_0_#1d4f76] disabled:bg-[#efe5cf] disabled:text-[#6b5d45] disabled:shadow-none"
            >
              <Ticket aria-hidden className="h-5 w-5" />
              <span>
                <AutoFurigana text={busy ? "出発中..." : "チケットを使って出発する"} />
              </span>
            </button>
            {!destination.can_depart && (
              <p className="text-center text-xs font-bold text-[#8a6a3a]">
                <AutoFurigana text={ticketHintText(ticketHint)} />
              </p>
            )}
          </>
        )}
```

4. `{destination.state === "later" && ( ... )}` のブロックを消す
5. カードの上のコメントを「島を押したときのカード(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-2)」にする

- [ ] **Step 12: せかいの画面を直す（`frontend/src/app/trip/page.tsx`）**

1. `import` に `import { Ticket } from "lucide-react";` を足す
2. コメント `/** 旅のハブ(設計書5-1)。「旅する」タブ */` を `/** せかい(docs/design/2026-09-28-travel-tickets-design.md 5-2)。チケットで好きな国へ行く */` にする
3. 題名とパスポートの `div` を次に替える:

```tsx
        <div className="flex items-center justify-between">
          <SkyTitle className="text-2xl">
            <AutoFurigana text="せかい" />
          </SkyTitle>
          <div className="flex items-center gap-2">
            {travel && travel.destinations.some((destination) => destination.state === "unvisited") && (
              <span
                aria-label={`チケット ${travel.tickets}まい`}
                className="flex items-center gap-1 rounded-full bg-[#fffaf0] py-1 pr-3 pl-2 text-xs font-black text-[#7a5a0e] shadow-[0_2px_6px_rgba(59,50,38,0.15)]"
              >
                <Ticket aria-hidden className="h-4 w-4 text-[#d8352a]" />×{travel.tickets}
              </span>
            )}
            <Link
              href="/passport"
              className="flex items-center gap-1 rounded-full bg-[#fffaf0] py-1 pr-3 pl-2 text-xs font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
            >
              <BadgeImage badge="passport" size={20} />
              パスポート
            </Link>
          </div>
        </div>
```

4. `line={hubLine(travel.destinations)}` を `line={hubLine(travel)}` にする
5. `<DestinationSheet` に `ticketHint={travel?.ticket_hint ?? null}` を足す

- [ ] **Step 13: テスト・型・lint を確かめる**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: すべて通る

- [ ] **Step 14: コミットする**

```bash
git add frontend/src/components/travel frontend/src/app/globals.css frontend/src/lib/furigana-dictionary.json frontend/src/components/app/auto-furigana.test.ts frontend/src/app/trip/page.tsx
git commit -m "#00208: feat:せかいの画面をチケットで好きな国を選ぶ形にし(まだの国は中身が？)、飛行機の国の出発の場面を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 学ぶタブの鍵・鍵の国の案内・チケットのカード・パスポートの旅した国（画面）

**Files:**
- Create: `frontend/src/components/travel/locked-country.tsx`
- Create: `frontend/src/components/travel/ticket-earned-card.tsx`
- Modify: `frontend/src/app/learn/page.tsx`
- Modify: `frontend/src/app/travel/[countryId]/page.tsx`、`frontend/src/app/travel/[countryId]/start/page.tsx`、`frontend/src/app/travel/[countryId]/region/[regionId]/page.tsx`
- Modify: `frontend/src/app/quiz/[stageId]/page.tsx`
- Modify: `frontend/src/app/passport/page.tsx`

**Interfaces:**
- Consumes: `lockedCountryText`・`unlockedCountries`（Task 5）、`GET /api/countries` の `locked`・403・`ticket_earned`（Task 2）、`GET /api/passport` の `trips`（Task 3）
- Produces: `LockedCountry()`（画面ぜんぶ）、`LockedCountrySheet({ name, onClose })`、`TicketEarnedCard()`

- [ ] **Step 1: 鍵の国の案内を作る（`frontend/src/components/travel/locked-country.tsx`）**

```tsx
"use client";

import Link from "next/link";

import { AppHeader } from "@/components/app/app-header";
import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { Panel } from "@/components/app/panel";
import { SkyPage } from "@/components/app/sky-page";
import { SpruFigure } from "@/components/spru/spru-figure";

import { lockedCountryText } from "./travel";

const GO_WORLD_CLASS =
  "flex h-12 items-center justify-center rounded-2xl bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_4px_0_#285a19]";

/** 鍵の国の画面を直接開いたとき(APIが403を返したとき)の案内(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-6) */
export function LockedCountry() {
  return (
    <SkyPage>
      <AppHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 pb-28">
        <SpruFigure image="think" standHeight={110} alt="スプル" />
        <Panel className="flex w-full flex-col items-center gap-3 p-5 text-center">
          <p className="text-lg font-black text-[#3b3226]">
            <AutoFurigana text="まだこの国に着いていません" />
          </p>
          <p className="text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="『せかい』でチケットを使うと行けるよ" />
          </p>
          <Link href="/trip" className={GO_WORLD_CLASS}>
            せかいへ
          </Link>
        </Panel>
      </main>
      <BottomNav />
    </SkyPage>
  );
}

/** 学ぶタブで鍵の国を押したときに下から出るカード(設計書5-5) */
export function LockedCountrySheet({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-country-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-center text-[#3b3226]"
      >
        <h2 id="locked-country-title" className="text-lg font-black">
          <AutoFurigana text={`${name}はまだの国`} />
        </h2>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={lockedCountryText(name)} />
        </p>
        <Link href="/trip" className={GO_WORLD_CLASS}>
          せかいへ
        </Link>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[#6b5d45] underline underline-offset-2">
          とじる
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: チケットのカードを作る（`frontend/src/components/travel/ticket-earned-card.tsx`）**

```tsx
import Link from "next/link";
import { Ticket } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";

/** ボスを倒してチケットを手に入れたとき、クイズの結果に出すカード(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-4) */
export function TicketEarnedCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[#f2b632] bg-[#fff4d6] px-4 py-3 text-center">
      <p className="flex items-center gap-2 text-base font-black text-[#7a5a0e]">
        <Ticket aria-hidden className="h-6 w-6 text-[#d8352a]" />
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

- [ ] **Step 3: 学ぶタブに鍵を付ける（`frontend/src/app/learn/page.tsx`）**

1. `import` に `Lock` を足す（`import { Flag, Lock, Map as MapIcon } from "lucide-react";`）。`import { LockedCountrySheet } from "@/components/travel/locked-country";` と `import { unlockedCountries } from "@/components/travel/travel";` を足す
2. `Country` 型の `is_suggested?: boolean;` を `locked: boolean;` にする
3. `const [miniAppOpen, setMiniAppOpen] = useState(false);` の次に足す:

```tsx
  const [lockedCountry, setLockedCountry] = useState<Country | null>(null);
```

4. 見出しの下の `好きな国を選んでね` を `着いた国で学べるよ` にする
5. ファイルの最後（`Page` の外）に、国旗の小さな絵の部品を足す:

```tsx
/** 国のボタンの中の国旗(国名の文字が横にあるので alt は空) */
function FlagThumb({ code, className }: { code: string; className: string }) {
  return (
    <span className={`relative shrink-0 overflow-hidden rounded-sm border border-[#e8dfcf] ${className}`}>
      <Image src={`/flag/${code}.svg`} alt="" fill className="object-cover" />
    </span>
  );
}
```

6. モバイルのグリッド（`<div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 md:hidden">` の中の `allCountries.map(...)`）を次に替える。`AppButton` はそれ自体が `<button>` なので、鍵の国は `AppButton`（鍵の見た目の `variant="locked"`）をそのまま押せるようにし、別の `<button>` で囲まない:

```tsx
              {allCountries.map((country) =>
                country.locked ? (
                  <AppButton
                    key={country.id}
                    variant="locked"
                    size="lg"
                    aria-label={`${country.name}(まだの国)`}
                    onClick={() => setLockedCountry(country)}
                    className="flex w-full items-center justify-center gap-2 shadow-lg"
                  >
                    <Lock aria-hidden className="h-4 w-4 shrink-0" />
                    <FlagThumb code={country.code} className="h-4 w-6 grayscale" />
                    {country.name}
                  </AppButton>
                ) : (
                  <Link key={country.id} href={`/travel/${country.id}/start`}>
                    <AppButton variant="default" size="lg" className="flex w-full items-center justify-center gap-2 shadow-lg">
                      <FlagThumb code={country.code} className="h-4 w-6" />
                      {country.name}
                    </AppButton>
                  </Link>
                ),
              )}
```

7. 地図表示の `<WorldMap countries={allCountries} ...` を `<WorldMap countries={unlockedCountries(allCountries)} ...` にする
8. 丸く並べる表示の `allCountries.map((country, index) => { ... return (<Link ...>...</Link>); })` の `return` を次に替える（`angle`・`x`・`y` の計算はそのまま。丸のクラスに `relative` を入れると `absolute` を打ち消すので入れない）:

```tsx
                    const position = { left: `${x}%`, top: `${y}%` };
                    const circleClass =
                      "flex aspect-square h-24 w-24 flex-col items-center justify-center gap-1 rounded-full p-2 text-center text-xs leading-tight text-balance shadow-lg lg:h-28 lg:w-28 lg:text-sm";
                    return country.locked ? (
                      <AppButton
                        key={country.id}
                        variant="locked"
                        aria-label={`${country.name}(まだの国)`}
                        onClick={() => setLockedCountry(country)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 ${circleClass}`}
                        style={position}
                      >
                        <Lock aria-hidden className="h-4 w-4" />
                        <FlagThumb code={country.code} className="h-6 w-9 grayscale" />
                        {country.name}
                      </AppButton>
                    ) : (
                      <Link
                        key={country.id}
                        href={`/travel/${country.id}/start`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={position}
                      >
                        <AppButton variant="default" className={circleClass}>
                          <FlagThumb code={country.code} className="h-6 w-9" />
                          {country.name}
                        </AppButton>
                      </Link>
                    );
```

9. `<BottomNav />` の前に足す:

```tsx
      {lockedCountry && <LockedCountrySheet name={lockedCountry.name} onClose={() => setLockedCountry(null)} />}
```

（「あなたの国?」の札は、6・8 の置き換えでなくなる）

- [ ] **Step 4: 鍵の国を直接開いたときの案内を出す（国・演出・地域・クイズの4画面）**

`frontend/src/app/travel/[countryId]/page.tsx`・`frontend/src/app/travel/[countryId]/start/page.tsx`・`frontend/src/app/travel/[countryId]/region/[regionId]/page.tsx`・`frontend/src/app/quiz/[stageId]/page.tsx` のそれぞれで:

1. `import { LockedCountry } from "@/components/travel/locked-country";` を足す
2. データの `useState` の次に `const [locked, setLocked] = useState(false);` を足す
3. `apiFetch(...)` の `.then` の中の `if (res.status === 401) { ... }` の後に足す:

```tsx
        if (res.status === 403) {
          setLocked(true);
          return;
        }
```

4. 読み込み中の画面を返す `if (... === undefined) {` の前に足す:

```tsx
  if (locked) return <LockedCountry />;
```

- [ ] **Step 5: クイズの結果にチケットのカードを出す（`frontend/src/app/quiz/[stageId]/page.tsx`）**

`import { TicketEarnedCard } from "@/components/travel/ticket-earned-card";` を足し、`completeStage` の `return data.title_granted && data.title ? (...) : null;` を次に替える:

```tsx
    const titleNote =
      data.title_granted && data.title ? (
        <p className="flex items-center justify-center gap-2 text-sm font-black text-[#7a5a0e]">
          <BadgeImage badge="crown" size={44} />
          称号「{data.title}」を獲得しました！
        </p>
      ) : null;
    // ボスでチケットがもらえたときは、結果の画面にカードを出す(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-4)
    const ticketNote = data.ticket_earned ? <TicketEarnedCard /> : null;
    return titleNote || ticketNote ? (
      <>
        {titleNote}
        {ticketNote}
      </>
    ) : null;
```

- [ ] **Step 6: パスポートに旅した国を出す（`frontend/src/app/passport/page.tsx`）**

1. `import` の lucide に `Ship` を足す
2. `PassportData` に足す:

```ts
  trips: { key: string; name: string; flag: string; transport: "ship" | "plane"; arrived_at: string | null }[];
```

3. `const { countries, titles, ... } = data;` の中に `trips,` を足す
4. サマリーの `<SummaryBadge label="訪れた国" ... />` の `label` を `"スタンプ"` にし、`<SummaryBadge label="航空券" value={`${visitedCount}枚`} />` を `<SummaryBadge label="旅した国" value={`${trips.length}`} />` にする（数えているのはスタンプのある国なので、旅した国と紛らわしくないよう名前を分ける）
5. `{/* 航空券 */}` の `section` を次に替える:

```tsx
          {/* 旅した国(設計書 docs/design/2026-09-28-travel-tickets-design.md 5-7) */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-[#6b5d45]">
              旅した国
            </h2>
            {trips.length === 0 ? (
              <p className="text-sm text-[#8a7a5a]">
                チケットを使って国へ行くと、ここにふえるよ
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {trips.map((trip) => (
                  <div
                    key={trip.key}
                    className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[#d9cdb4] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    {trip.transport === "plane" ? (
                      <Plane aria-hidden className="h-3.5 w-3.5 text-[#2b6fa3]" />
                    ) : (
                      <Ship aria-hidden className="h-3.5 w-3.5 text-[#2b6fa3]" />
                    )}
                    <span className="relative h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-[#efe5cf]">
                      <Image src={trip.flag} alt="" fill className="object-cover" />
                    </span>
                    {trip.name}行き
                  </div>
                ))}
              </div>
            )}
          </section>
```

- [ ] **Step 7: テスト・型・lint を確かめる**

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: すべて通る

- [ ] **Step 8: コミットする**

```bash
git add frontend/src/components/travel/locked-country.tsx frontend/src/components/travel/ticket-earned-card.tsx frontend/src/app/learn/page.tsx "frontend/src/app/travel/[countryId]" "frontend/src/app/quiz/[stageId]/page.tsx" frontend/src/app/passport/page.tsx
git commit -m "#00209: feat:学ぶタブの国に鍵を付け、鍵の国の案内・チケットを手に入れたカード・パスポートの旅した国を出す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ブラウザで確かめ、SPEC・TASKS を直す

**Files:**
- Modify: `SPEC.md`、`TASKS.md`

**Interfaces:**
- Consumes: Task 1〜6 のすべて

- [ ] **Step 1: 全部のテスト**

Run: `./vendor/bin/sail test 2>&1 | grep '"tool":"pest"'`
Expected: PASS（件数を控える）

Run: `cd frontend && npm test && npm run typecheck && npm run lint`
Expected: すべて通る（件数を控える）

- [ ] **Step 2: ブラウザで確かめる（開発サーバーは port 3000 で動いているものを使う）**

`test@example.com` / `password` でログインし、一時的なプレイヤー「旅テスト」を作って選ぶ。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ置き、見たら消す。幅 390px で:

1. 下のメニューが 学ぶ・せかい・まち（真ん中・家のアイコン）・ショップ・じぶん
2. 学ぶ: 日本だけ鍵なし、ほかは灰色の鍵。鍵の国を押すと「アメリカへは『せかい』でチケットを使うと行けるよ」［せかいへ］
3. `/travel/<アメリカのid>/start` を直接開くと「まだこの国に着いていません」
4. せかい: 「チケット ×0」、島はぜんぶ「？」、スプルが「日本の初級のボスを倒すと、チケットがもらえるよ」。島を押すと乗り物・「？」のおみやげ・押せない［チケットを使って出発する］
5. 日本の初級1〜4とボスを遊ぶ（`/api/stages/{id}/complete` を画面から）。ボスの結果に「チケットを手に入れた！」［せかいへ］
6. せかい: 「チケット ×1」、島が「行ける！」で光る。アメリカ →［チケットを使って出発する］→ 空港 → 飛行機 → 着いた → アメリカの画面
7. 学ぶ: アメリカの鍵が外れ、「英語を学ぶ」に入れる
8. パスポート: 「旅した国」にアメリカ（飛行機のアイコン）

幅 320px と 1280px で、学ぶ・せかい・カードがはみ出さないこと、1280px の学ぶの地図表示で鍵の国に色がないことを確かめる。

終わったら:
- 一時的なプレイヤー「旅テスト」を消す（プロフィール選びの編集から）
- 町テスト（id 7）が current_streak 2・best_streak 2・last_played_date 2026-09-27・xp 20・coins 60・hp 20・points 75・avatar avatar-2、おつかいが [19,20,21] だけ、家族のプロフィールが 検証太郎（avatar-1）・町テスト（avatar-2）のままかを tinker で確かめる

- [ ] **Step 3: SPEC.md を直す**

- 4-3 の「🚫 国そのもののロック（航空券消費等）: 現行は「入口は自由」の設計を維持し、国は常に全解放。…」の行を次に替える:

```markdown
- ✅（2026-09-28変更）**国のロックはチケットで開ける**: 7月の「入口は自由・国は常に全解放」を改め、学ぶタブは日本と着いた国だけ学べるようにした（まだ着いていない旅の行き先は鍵つきで出し、押すと「せかい」へ案内。鍵の国の画面・ステージはサーバーでも403）。国の一覧は日本 → 旅の行き先の順で、Accept-Languageからの推定（「あなたの国?」）はやめた（`docs/design/2026-09-28-travel-tickets-design.md`）
```

- 4-3 の「✅（2026-09-26変更）ボトムナビを5タブ（学ぶ/旅する/ショップ/バッグ/世界）に刷新し…」の行の後、または 4-9 の F回の旅のハブの行の後に足す:

```markdown
- ✅（2026-09-28）**国の進め方をチケットで好きな国へ行く形にした**: スタートは日本。日本と着いた国で初級のボスを初めて倒すと、1か国1枚チケットがもらえ（コインでは買えない）、1枚で好きなまだの国へ行ける。チケットは表を作らず、クリアの記録と着いた国から数える（もらった数 − 着いた国の数、0で止める）。F回のレベル・町のアイテム・前の国のおみやげの条件と1本道はやめ、おみやげはごほうびだけになった。乗り物は韓国・インドネシアが船、アメリカ・イギリス・フランスが飛行機（出発の場面が変わる。飛行機は仮のSVGで、Ownerのスプルが乗った絵が届いたら差し替える）。まだの国は国旗と国名だけ見せ、おみやげは「？」。ボスでチケットがもらえたときはクイズの結果にカードを出す。下のメニューの「世界」を「まち」、「旅する」を「せかい」にした。パスポートの「集めた航空券」は「旅した国」にした。公開前のテストのデータは、クリアしている行き先の国を着いた国として記録した（`docs/design/2026-09-28-travel-tickets-design.md`）
```

- F回の旅のハブの行（「旅のハブ: 「旅する」タブ（`/trip`）に海の地図と5つの島（インドネシア → … の1本道）…」）の最後に「（2026-09-28にチケットで好きな国へ行く形に変更）」を足す
- テストの件数の行（7章。`… 2026-07-31時点で52件` の近くの、いちばん新しい件数）を Step 1 の件数に直す

- [ ] **Step 4: TASKS.md を直す**

- 「国の進め方をチケットで好きな国へ行く形にする」を `[x]` にし、実装計画 `docs/design/2026-09-28-travel-tickets-plan.md` を足す
- スプルのアイコン画像の行の「下のメニュー（学ぶ・旅する・世界・ショップ）」を「下のメニュー（学ぶ・せかい・まち・ショップ）」にする

- [ ] **Step 5: コミットする**

```bash
git add SPEC.md TASKS.md
git commit -m "#00210: docs:国の進め方をチケットで好きな国へ行く形にしたことをSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
