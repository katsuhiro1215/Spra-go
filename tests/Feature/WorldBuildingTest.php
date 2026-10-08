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

function createBuilding(UserProfile $profile, string $assetKey = 'fountain', ?int $x = null, ?int $y = null): ProfileWorldItem
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
        ->assertJson(['id' => $castle->id, 'x' => 4, 'y' => 4, 'asset_key' => 'fountain', 'footprint' => 2]);
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
    createBuilding($profile, 'fountain', 4, 4);
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
    $profile->update(['level' => 30]);
    $castle = createBuilding($profile);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 16, 'y' => 16])
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
    $castle = createBuilding($profile, 'fountain', 4, 4);

    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 5, 'y' => 4])->assertOk();

    expect($castle->fresh()->only(['x', 'y']))->toBe(['x' => 5, 'y' => 4]);
});

it('いくつも理由があるときは、地図の外→雲→道・目印の順に1つだけ返す', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);
    $castle = createBuilding($profile);

    // (17,2) が地図の外、(16,2) が雲
    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 16, 'y' => 2])
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

    expect($footprints['ベンチ'])->toBe(1)->and($footprints['お城'])->toBe(3);
});

it('町のAPIのバッグのアイテムにも大きさが付く', function () {
    $profile = createActiveProfile();
    createBuilding($profile, 'tower');

    $this->getJson('/api/world')->assertOk()->assertJsonPath('bag.0.footprint', 2);
});

it('品ぞろえのシーダーで、2×2の建物17・3×3の建物6(モール2つ・村長の家・風車の庭・城・五重塔)を含む63種類がそろい、2回実行しても増えない', function () {
    $this->seed(WorldItemSeeder::class);
    $this->seed(WorldItemSeeder::class);

    $items = ShopItem::query()->where('type', 'decoration')->get();
    $big = $items->filter(fn (ShopItem $item) => $item->footprint() === 2)->pluck('name');
    $large = $items->filter(fn (ShopItem $item) => $item->footprint() === 3)->pluck('name');

    expect($items)->toHaveCount(63)
        ->and($big)->toHaveCount(17)
        ->and($large)->toHaveCount(6)
        ->and($large->all())->toContain('お城', '五重塔')
        ->and($big->all())->toContain('カフェ', 'タワー', 'パン屋', 'ビッグ・ベン', '凱旋門', '南大門', '和風の家', '噴水', '大きな船', '灯台', '金閣寺')
        ->and($items->firstWhere('name', 'タワー')->only(['price', 'min_level']))->toBe(['price' => 500, 'min_level' => 12]);
});

it('特別の名所4点は Lv10〜15・600〜900pt の名所(2×2)として並ぶ(設計書 2026-09-28-town-items 5-4)', function () {
    $this->seed(WorldItemSeeder::class);

    $row = function (string $name): array {
        $item = ShopItem::query()->where('name', $name)->firstOrFail();

        return [$item->min_level, $item->price, $item->assetKey(), $item->category(), $item->footprint()];
    };

    expect($row('金閣寺'))->toBe([10, 600, 'kinkakuji', 'landmark', 2])
        ->and($row('南大門'))->toBe([11, 650, 'sungnyemun', 'landmark', 2])
        ->and($row('凱旋門'))->toBe([13, 750, 'arc_de_triomphe', 'landmark', 2])
        ->and($row('ビッグ・ベン'))->toBe([15, 900, 'big_ben', 'landmark', 2]);
});

it('新しい16点は設計書 2026-09-28-town-items 5-2 のレベル・値段・カテゴリで並ぶ', function () {
    $this->seed(WorldItemSeeder::class);

    $row = function (string $name): array {
        $item = ShopItem::query()->where('name', $name)->firstOrFail();

        return [$item->min_level, $item->price, $item->assetKey(), $item->category()];
    };

    expect($row('チューリップ'))->toBe([1, 15, 'tulip', 'nature'])
        ->and($row('松'))->toBe([6, 45, 'pine', 'nature'])
        ->and($row('植木鉢'))->toBe([1, 15, 'flower_pots', 'decor'])
        ->and($row('街灯'))->toBe([3, 40, 'street_lamp', 'decor'])
        ->and($row('小さな家'))->toBe([2, 120, 'cottage', 'house'])
        ->and($row('カフェ'))->toBe([9, 320, 'cafe', 'house'])
        ->and($row('灯台'))->toBe([9, 350, 'lighthouse', 'landmark']);
});

it('Spra-worldの確定画像から足した2×2の建物(八百屋)も、4マスを使い、重なると置けない', function () {
    $profile = createActiveProfile();
    createPlacedBench($profile, 5, 5);
    $shop = createBuilding($profile, 'greengrocer');

    $this->patchJson("/api/world/items/{$shop->id}", ['x' => 4, 'y' => 4])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');

    $this->patchJson("/api/world/items/{$shop->id}", ['x' => 2, 'y' => 5])
        ->assertOk()
        ->assertJson(['asset_key' => 'greengrocer', 'footprint' => 2]);
});

/*
|--------------------------------------------------------------------------
| 大きな建物(3×3)(docs/design/2026-10-07-town-sizes-design.md)
|--------------------------------------------------------------------------
|
| スプルモール・さくモール・村長の家・風車と水車の庭は3×3で、(x, y) を奥のマスにして9マス使う。
|
*/

it('空いた9マスに3×3の建物を置け、大きさ3で返る', function (string $assetKey) {
    $profile = createActiveProfile();
    $mall = createBuilding($profile, $assetKey);

    $this->patchJson("/api/world/items/{$mall->id}", ['x' => 4, 'y' => 4])
        ->assertOk()
        ->assertJson(['id' => $mall->id, 'x' => 4, 'y' => 4, 'asset_key' => $assetKey, 'footprint' => 3]);
})->with(['spru_mall', 'saku_mall', 'chief_hall', 'windmill_garden']);

it('3×3の建物の9マスのどれかが1マスのアイテムと重なると置けない', function (int $benchX, int $benchY) {
    $profile = createActiveProfile();
    createPlacedBench($profile, $benchX, $benchY);
    $mall = createBuilding($profile, 'spru_mall');

    $this->patchJson("/api/world/items/{$mall->id}", ['x' => 4, 'y' => 4])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
    expect($mall->fresh()->isPlaced())->toBeFalse();
})->with([
    '奥' => [4, 4],
    '真ん中' => [5, 5],
    '手前の角' => [6, 6],
    '右の端' => [6, 4],
]);

it('3×3の建物は、使うマスが雲にかかる場所には置けない(2×2なら収まる場所でも)', function () {
    $profile = createActiveProfile();
    $mall = createBuilding($profile, 'spru_mall');
    $castle = createBuilding($profile, 'fountain');

    $this->patchJson("/api/world/items/{$mall->id}", ['x' => 5, 'y' => 4])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ雲に隠れているよ。');
    $this->patchJson("/api/world/items/{$castle->id}", ['x' => 5, 'y' => 4])->assertOk();
});

it('3×3の建物が、道や目印のマスにかかると置けない', function () {
    $profile = createActiveProfile();
    $mall = createBuilding($profile, 'spru_mall');

    // (3,3) は横の道のマス
    $this->patchJson("/api/world/items/{$mall->id}", ['x' => 2, 'y' => 3])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこには置けません。');
});
