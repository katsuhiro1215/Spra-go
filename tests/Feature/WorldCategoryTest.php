<?php

use App\Models\ShopItem;

/*
|--------------------------------------------------------------------------
| 町のアイテムのカテゴリ(docs/design/2026-09-28-town-items-design.md 3章)
|--------------------------------------------------------------------------
|
| カテゴリは絵のキーで決まる(config/world.php の asset_categories)。
| おみやげはキーによらず souvenir、回復薬・称号はカテゴリなし、設定にないキーは decor。
|
*/

it('設定: asset_keys のすべての絵にカテゴリがあり、おみやげ以外の5つのどれか。スプルの花は しぜん', function () {
    $categories = config('world.asset_categories');

    foreach (config('world.asset_keys') as $key) {
        expect($categories)->toHaveKey($key);
        expect($categories[$key])->toBeIn(['nature', 'decor', 'house', 'landmark', 'vehicle']);
    }
    expect($categories['spru_flower'])->toBe('nature');
});

it('町のアイテムのカテゴリは絵のキーで決まる', function () {
    expect(createDecoration(['name' => '桜の木', 'meta' => ['asset_key' => 'sakura']])->category())->toBe('nature');
    expect(createDecoration(['name' => 'ベンチ', 'meta' => ['asset_key' => 'bench']])->category())->toBe('decor');
    expect(createDecoration(['name' => '屋台', 'meta' => ['asset_key' => 'stall']])->category())->toBe('house');
    expect(createDecoration(['name' => 'お城', 'meta' => ['asset_key' => 'castle']])->category())->toBe('landmark');
    expect(createDecoration(['name' => '自転車', 'meta' => ['asset_key' => 'bicycle']])->category())->toBe('vehicle');
});

it('おみやげはキーによらず souvenir、回復薬はカテゴリなし', function () {
    $souvenir = createDecoration([
        'name' => 'コモドドラゴンの像',
        'meta' => ['asset_key' => 'komodo', 'not_for_sale' => true, 'souvenir_of' => 'インドネシア'],
    ]);
    $potion = ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion', 'meta' => ['heal' => 10]]);

    expect($souvenir->category())->toBe('souvenir');
    expect($potion->category())->toBeNull();
});

it('設定にないキー・キーなしの町のアイテムは decor(どのタブにも出なくなることはない)', function () {
    expect(createDecoration(['name' => 'なぞの物', 'meta' => ['asset_key' => 'zzz']])->category())->toBe('decor');
    expect(createDecoration(['name' => '絵なし', 'meta' => []])->category())->toBe('decor');
});

it('ショップ一覧の町のアイテムに category が付き、回復薬は null', function () {
    createActiveProfile();
    createDecoration(['name' => '桜の木', 'meta' => ['asset_key' => 'sakura']]);
    ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion', 'meta' => ['heal' => 10]]);

    $items = collect($this->getJson('/api/shop')->assertOk()->json())->keyBy('name');

    expect($items['桜の木']['category'])->toBe('nature');
    expect($items['回復薬']['category'])->toBeNull();
});

it('町とバッグのアイテムに category が付く(おみやげは souvenir、スプルの花は nature)', function () {
    $profile = createActiveProfile();
    giveWorldItem($profile, 'castle', placed: true);
    giveWorldItem($profile, 'spru_flower');
    $souvenir = createDecoration([
        'name' => 'バイソンの像',
        'meta' => ['asset_key' => 'bison', 'not_for_sale' => true, 'souvenir_of' => 'アメリカ'],
    ]);
    $profile->worldItems()->create(['shop_item_id' => $souvenir->id]);

    $world = $this->getJson('/api/world')->assertOk();

    expect(collect($world->json('items'))->pluck('category')->all())->toBe(['landmark']);
    expect(collect($world->json('bag'))->pluck('category', 'asset_key')->all())
        ->toEqual(['spru_flower' => 'nature', 'bison' => 'souvenir']);
});
