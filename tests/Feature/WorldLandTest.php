<?php

/*
|--------------------------------------------------------------------------
| 広がる地図と雲の区画(docs/design/2026-09-27-spru-wave-e-design.md 3-1・3-2・4-4)
|--------------------------------------------------------------------------
|
| 地図は12×12で、町(7×7)の手前に竹林(Lv.4)・海辺(Lv.7)・丘(Lv.10)が続く。
| まだ開いていない区画は雲に隠れていて置けない。開いた区画は次に町を開いたときに1回だけ祝う。
|
*/

it('Lv.1では町だけが開いていて、区画は4つとも返る', function () {
    createActiveProfile();

    $land = $this->getJson('/api/world')->assertOk()->json('land');

    expect($land['width'])->toBe(12)
        ->and($land['height'])->toBe(12)
        ->and(collect($land['plots'])->pluck('unlocked', 'key')->all())
        ->toBe(['town' => true, 'bamboo' => false, 'beach' => false, 'hill' => false])
        ->and($land['plots'][1])->toBe([
            'key' => 'bamboo', 'name' => '竹林', 'x' => 7, 'y' => 0, 'w' => 5, 'h' => 7,
            'min_level' => 4, 'ground' => 'bamboo', 'unlocked' => false,
        ])
        ->and(collect($land['landmarks'])->pluck('key')->all())->not->toContain('bamboo_grove')
        ->and(collect($land['landmarks'])->pluck('key')->all())->not->toContain('pier')
        ->and($land['paths'])->not->toContain([7, 3])
        ->and($land['blocked'])->not->toContain([8, 0]);
});

it('Lv.4で竹林が開き、竹やぶと竹林の道が目印・道・置けないマスに入る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4]);

    $land = $this->getJson('/api/world')->assertOk()->json('land');

    expect(collect($land['plots'])->firstWhere('key', 'bamboo')['unlocked'])->toBeTrue()
        ->and($land['landmarks'])->toContain(['key' => 'bamboo_grove', 'x' => 8, 'y' => 0])
        ->and($land['paths'])->toContain([11, 3])
        ->and($land['blocked'])->toContain([10, 1])
        ->and($land['blocked'])->toContain([7, 3])
        ->and(collect($land['landmarks'])->pluck('key')->all())->not->toContain('pier');
});

it('Lv.4なら竹林に置け、Lv.3では雲に隠れていて置けない', function () {
    $profile = createActiveProfile();
    $item = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);

    $profile->update(['level' => 3]);
    $this->patchJson("/api/world/items/{$item->id}", ['x' => 8, 'y' => 1])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ雲に隠れているよ。');
    expect($item->fresh()->isPlaced())->toBeFalse();

    $profile->update(['level' => 4]);
    $this->patchJson("/api/world/items/{$item->id}", ['x' => 8, 'y' => 1])->assertOk();
});

it('竹林の道と竹やぶには置けない', function (int $x, int $y) {
    $profile = createActiveProfile();
    $profile->update(['level' => 4]);
    $item = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => $x, 'y' => $y])
        ->assertStatus(422)
        ->assertJsonPath('message', 'そこには置けません。');
})->with([
    '竹林の道' => [8, 3],
    '竹やぶ' => [10, 1],
]);

it('開いたがまだ祝っていない区画が出て、祝った印を送ると出なくなる', function () {
    $profile = createActiveProfile();
    $this->getJson('/api/world')->assertJsonPath('plots_new', []);

    $profile->update(['level' => 4]);
    $this->getJson('/api/world')->assertJsonPath('plots_new', ['bamboo']);

    $this->postJson('/api/world/plots/seen', ['keys' => ['bamboo']])
        ->assertOk()
        ->assertJsonPath('plots_new', []);
    $this->getJson('/api/world')->assertJsonPath('plots_new', []);
    expect($profile->fresh()->world_plots_seen)->toBe(['bamboo']);
});

it('一度に2つ以上開いた区画は、必要レベルの低い順に出る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12, 'world_plots_seen' => ['bamboo']]);

    $this->getJson('/api/world')->assertJsonPath('plots_new', ['beach', 'hill']);
});

it('雲の区画や知らないキーは記録せず、同じキーは1回だけ記録する', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4]);

    $this->postJson('/api/world/plots/seen', ['keys' => ['hill', 'castle_town']])
        ->assertOk()
        ->assertJsonPath('plots_new', ['bamboo']);
    expect($profile->fresh()->world_plots_seen)->toBe([]);

    $this->postJson('/api/world/plots/seen', ['keys' => ['bamboo', 'bamboo']])->assertOk();
    $this->postJson('/api/world/plots/seen', ['keys' => ['bamboo']])->assertOk();
    expect($profile->fresh()->world_plots_seen)->toBe(['bamboo']);
});

it('祝った印の送り方がおかしいとエラーになる', function (array $payload) {
    createActiveProfile();

    $this->postJson('/api/world/plots/seen', $payload)->assertStatus(422);
})->with([
    'キーが無い' => [[]],
    '文字列でない' => [['keys' => [1]]],
]);

it('家族の町の土地は、見に行った人ではなくその人のレベルで開いている', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $sister->update(['level' => 7]);

    $plots = collect($this->getJson("/api/family/{$sister->id}")->assertOk()->json('land.plots'))
        ->pluck('unlocked', 'key')
        ->all();

    expect($plots)->toBe(['town' => true, 'bamboo' => true, 'beach' => true, 'hill' => false]);
});
