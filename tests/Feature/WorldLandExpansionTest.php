<?php

use App\Support\WorldLand;

/*
|--------------------------------------------------------------------------
| 地図を32×32に広げる(docs/design/2026-10-19-town-land-design.md)
|--------------------------------------------------------------------------
|
| 17×17の外側(東と南)に、6つの区画(Lv.35〜60)を足す。今の座標は動かさない。
| 新しい区画には、置けない自然の景色(木・岩・茂み)が、座標から決まる位置に、約8%ある。
|
*/

const NEW_PLOTS = ['forest', 'meadow', 'east_coast', 'south_woods', 'south_highland', 'south_isle'];

it('区画は13で、重ならず、32×32の中に隙間がない', function () {
    $cells = [];
    foreach (config('world.land.plots') as $plot) {
        for ($x = $plot['x']; $x < $plot['x'] + $plot['w']; $x++) {
            for ($y = $plot['y']; $y < $plot['y'] + $plot['h']; $y++) {
                expect($cells["{$x},{$y}"] ?? null)->toBeNull();
                $cells["{$x},{$y}"] = $plot['key'];
            }
        }
    }

    expect(count(config('world.land.plots')))->toBe(13)
        ->and(count($cells))->toBe(32 * 32)
        ->and(WorldLand::width())->toBe(32)
        ->and(WorldLand::height())->toBe(32);
});

it('新しい区画は、Lv.35・40・45・50・55・60で開き、今の7区画のレベルと座標は変わらない', function () {
    $plots = collect(config('world.land.plots'));

    expect($plots->whereIn('key', NEW_PLOTS)->pluck('min_level', 'key')->all())
        ->toBe(['forest' => 35, 'meadow' => 40, 'east_coast' => 45, 'south_woods' => 50, 'south_highland' => 55, 'south_isle' => 60])
        ->and($plots->take(7)->pluck('key')->all())->toBe(['town', 'bamboo', 'beach', 'hill', 'river', 'plateau', 'island'])
        ->and($plots->first())->toMatchArray(['key' => 'town', 'x' => 0, 'y' => 0, 'w' => 7, 'h' => 7]);
});

it('Lv.30までの人には、新しい区画は雲に隠れていて、目印・景色・道が出ない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 30]);

    $land = $this->getJson('/api/world')->assertOk()->json('land');
    $closed = collect($land['plots'])->whereIn('key', NEW_PLOTS);

    expect($closed)->toHaveCount(6)->and($closed->every(fn ($plot) => $plot['unlocked'] === false))->toBeTrue()
        ->and(collect($land['landmarks'])->every(fn ($l) => $l['x'] < 17 && $l['y'] < 17))->toBeTrue()
        ->and(collect($land['paths'])->every(fn ($t) => $t[0] < 17 && $t[1] < 17))->toBeTrue()
        ->and(collect($land['blocked'])->every(fn ($t) => $t[0] < 17 && $t[1] < 17))->toBeTrue();
});

it('レベルが足りると、新しい区画が開き、道の格子と景色が出る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 60]);

    $land = $this->getJson('/api/world')->assertOk()->json('land');

    expect(collect($land['plots'])->every(fn ($plot) => $plot['unlocked']))->toBeTrue()
        ->and($land['paths'])->toContain([31, 3])->toContain([17, 9])->toContain([3, 31])->toContain([9, 17])
        ->and(collect($land['landmarks'])->contains(fn ($l) => $l['x'] >= 17 || $l['y'] >= 17))->toBeTrue();
});

it('景色は、新しい区画だけにあり、毎回同じ位置で、道・区画のふち・海にはなく、密度は約8%', function () {
    $scenery = WorldLand::scenery();

    expect($scenery)->toBe(WorldLand::scenery())
        ->and(collect($scenery)->every(fn ($l) => ($l['x'] >= 17 || $l['y'] >= 17) && ! isset($l['footprint'])))->toBeTrue();

    $paths = collect(WorldLand::paths())->map(fn ($t) => "{$t[0]},{$t[1]}")->all();
    $water = collect(WorldLand::water())->map(fn ($t) => "{$t[0]},{$t[1]}")->all();
    foreach ($scenery as $l) {
        $plot = WorldLand::plotAt($l['x'], $l['y']);
        expect($plot)->not->toBeNull()
            ->and(in_array($plot['key'], NEW_PLOTS, true))->toBeTrue()
            ->and(in_array("{$l['x']},{$l['y']}", $paths, true))->toBeFalse()
            ->and(in_array("{$l['x']},{$l['y']}", $water, true))->toBeFalse()
            ->and($l['x'] > $plot['x'] && $l['x'] < $plot['x'] + $plot['w'] - 1 && $l['y'] > $plot['y'] && $l['y'] < $plot['y'] + $plot['h'] - 1)->toBeTrue();
    }

    $area = collect(config('world.land.plots'))->whereIn('key', NEW_PLOTS)->sum(fn ($p) => $p['w'] * $p['h']);
    expect(count($scenery) / $area)->toBeGreaterThan(0.05)->toBeLessThan(0.11);
});

it('景色は、木・岩・茂みの絵のキーで、重ならない', function () {
    $scenery = WorldLand::scenery();
    $keys = collect($scenery)->pluck('key')->unique()->all();

    expect(array_diff($keys, ['tree', 'pine', 'large_tree', 'birch', 'bush', 'rock']))->toBe([])
        ->and(count($keys))->toBeGreaterThan(2)
        ->and(collect($scenery)->map(fn ($l) => "{$l['x']},{$l['y']}")->unique()->count())->toBe(count($scenery));
});

it('景色のマスには、アイテムを置けない・道を引けない・置き物は戻らない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 60]);
    $bench = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);
    $tree = WorldLand::scenery()[0];

    $this->patchJson("/api/world/items/{$bench->id}", ['x' => $tree['x'], 'y' => $tree['y']])->assertStatus(422);
    $this->postJson('/api/world/roads', ['add' => [[$tree['x'], $tree['y']]], 'remove' => []])->assertStatus(422);
});

it('今の座標の置き物は、そのまま置けて、world:repair は何も戻さない', function () {
    $profile = createActiveProfile();
    $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => 5, 'y' => 5]);
    $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => 16, 'y' => 2]);
    $profile->update(['level' => 30]);

    expect(\App\Support\WorldRepair::unplaceable($profile))->toBe([]);
});

it('新しい区画に置ける(Lv.35で開いた東の森の、景色のないマス)', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 35]);
    $bench = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]);
    $taken = collect(WorldLand::blocked())->map(fn ($t) => "{$t[0]},{$t[1]}")->all();
    $free = collect(range(18, 20))->flatMap(fn ($x) => collect(range(2, 10))->map(fn ($y) => [$x, $y]))
        ->first(fn ($t) => ! in_array("{$t[0]},{$t[1]}", $taken, true));

    $this->patchJson("/api/world/items/{$bench->id}", ['x' => $free[0], 'y' => $free[1]])->assertOk();
});

it('家族の町も広がる(その人のレベルで開いた区画と景色が出る)', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $sister->update(['level' => 35]);

    $land = $this->getJson("/api/family/{$sister->id}")->assertOk()->json('land');

    expect($land['width'])->toBe(32)->and(collect($land['plots'])->firstWhere('key', 'forest')['unlocked'])->toBeTrue()
        ->and(collect($land['plots'])->firstWhere('key', 'meadow')['unlocked'])->toBeFalse()
        ->and(collect($land['landmarks'])->contains(fn ($l) => $l['x'] >= 17 && $l['x'] < 22))->toBeTrue();
});
