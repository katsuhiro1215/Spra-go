<?php

use App\Models\ProfileWorldItem;
use App\Models\User;

function createBagItem(\App\Models\UserProfile $profile): ProfileWorldItem
{
    return $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);
}

it('バッグのアイテムを空きマスに置ける', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 5])
        ->assertOk()
        ->assertJson(['id' => $item->id, 'x' => 5, 'y' => 5, 'asset_key' => 'bench']);

    expect($item->fresh()->only(['x', 'y']))->toBe(['x' => 5, 'y' => 5]);
});

it('置いたアイテムを別のマスへ動かせる', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);
    $item->update(['x' => 5, 'y' => 5]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 6, 'y' => 6])->assertOk();

    expect($item->fresh()->only(['x', 'y']))->toBe(['x' => 6, 'y' => 6]);
});

it('置いたアイテムを同じマスに置き直してもエラーにならない', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);
    $item->update(['x' => 5, 'y' => 5]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 5])->assertOk();
});

it('置いたアイテムをバッグに戻せる', function () {
    $profile = createActiveProfile();
    $item = createBagItem($profile);
    $item->update(['x' => 5, 'y' => 5]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => null, 'y' => null])->assertOk();

    expect($item->fresh()->isPlaced())->toBeFalse();
});

it('土地の外には置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', '土地の外には置けません。');

    expect($item->fresh()->isPlaced())->toBeFalse();
})->with([
    'xが7' => [7, 0],
    'yが7' => [0, 7],
    'xが負' => [-1, 2],
]);

it('目印や道のマスには置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこには置けません。');
})->with([
    'Spruの家' => [1, 1],
    '鳥居' => [3, 0],
    '道' => [3, 2],
]);

it('他のアイテムがあるマスには置けない', function () {
    $profile = createActiveProfile();
    $placed = createBagItem($profile);
    $placed->update(['x' => 5, 'y' => 5]);
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 5])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこにはもう置いてあります。');
});

it('座標の送り方がおかしいとエラーになる', function (array $payload) {
    $profile = createActiveProfile();
    $item = createBagItem($profile);

    $this->patchJson("/api/world/items/{$item->id}", $payload)->assertStatus(422);

    expect($item->fresh()->isPlaced())->toBeFalse();
})->with([
    'xだけnull' => [['x' => null, 'y' => 3]],
    'yだけnull' => [['x' => 3, 'y' => null]],
    '文字列' => [['x' => 'a', 'y' => 3]],
    'キーが無い' => [[]],
]);

it('他のプロフィールのアイテムは操作できない', function () {
    $other = User::factory()->create()->schema()->create(['name' => '別の家族'])
        ->profiles()->create(['name' => '別のプレイヤー']);
    $othersItem = createBagItem($other);
    createActiveProfile();

    $this->patchJson("/api/world/items/{$othersItem->id}", ['x' => 5, 'y' => 5])->assertNotFound();

    expect($othersItem->fresh()->isPlaced())->toBeFalse();
});
