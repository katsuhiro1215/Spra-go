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
