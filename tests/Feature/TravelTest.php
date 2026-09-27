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
