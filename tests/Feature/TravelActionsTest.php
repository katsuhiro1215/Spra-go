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
