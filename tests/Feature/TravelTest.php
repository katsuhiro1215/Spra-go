<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
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
    $secondBoss = Stage::create([
        'category_id' => Category::create(['name' => '日本の国旗2', 'parent_id' => Category::where('name', '国旗')->value('id')])->id,
        'country_id' => $japan->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'is_boss' => true,
    ]);

    clearCountryStage($profile, $japan, '初級', true);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $secondBoss->id, 'cleared_at' => now()]);

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

it('チケットは、国のメインの道(国旗)の初級のボスだけが数える。英語・世界遺産のボスでは増えない', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $english = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    $heritage = Category::create(['name' => '世界遺産']);
    foreach ([$english, $heritage] as $category) {
        $boss = Stage::create(['category_id' => $category->id, 'country_id' => $japan->id, 'difficulty' => '初級', 'stage_number' => 9, 'is_boss' => true]);
        ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $boss->id, 'cleared_at' => now()]);
    }

    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 0);

    clearCountryStage($profile, $japan, '初級', true);
    $this->getJson('/api/travel')->assertOk()->assertJsonPath('tickets', 1);
});
