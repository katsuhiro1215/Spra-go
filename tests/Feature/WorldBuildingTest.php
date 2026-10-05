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

it('品ぞろえのシーダーで大きな建物23(特別の名所4つとSpra-worldの確定画像10を含む)を含む63種類がそろい、2回実行しても増えない', function () {
    $this->seed(WorldItemSeeder::class);
    $this->seed(WorldItemSeeder::class);

    $items = ShopItem::query()->where('type', 'decoration')->get();
    $big = $items->filter(fn (ShopItem $item) => $item->footprint() === 2)->pluck('name');

    expect($items)->toHaveCount(63)
        ->and($big)->toHaveCount(23)
        ->and($big->all())->toContain('お城', 'カフェ', 'タワー', 'パン屋', 'ビッグ・ベン', '五重塔', '凱旋門', '南大門', '和風の家', '噴水', '大きな船', '灯台', '金閣寺')
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
